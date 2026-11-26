//! APY math (also summarized in README.md, "How yield is computed"):
//!
//! root:  yield = ΔBasketRate.bits / 2^32 × NAV / shares       (current share price, net of take)
//! alpha: yield = pps(t1) / pps(t0) − 1, pps = TotalHotkeyAlpha / TotalHotkeySharesV2
//!
//! Both APYs are reward yields valued in τ at the current price: root rewards are basket
//! shares marked at today's NAV, alpha rewards are alpha marked at today's alpha price (so the
//! yield equals the alpha growth). Price moves of the staked alpha itself are not annualized
//! (that explodes: a +24% month annualizes to +2,000%); they are reported separately as the
//! τ return `r{w}` = alpha growth × price(t1) / price(t0) − 1 over the window, not annualized.
//! APY   = (1 + yield)^(365 / days) − 1, days from block timestamps.
//!
//! Undefined (null) when a sample is missing, a rate went down (fund reset) or the alpha
//! pool epoch changed between the two samples.
//!
//! History length follows the data: the daily grid reaches back to the oldest stored
//! snapshot (at least 30 days), and windows 90/180/365 appear once data reaches that far.

use std::collections::HashMap;

use anyhow::Result;
use serde_json::{Value, json};
use sqlx::{PgConnection, PgPool};

const TWO_32: f64 = 4294967296.0;
const DAY: f64 = 86400.0;

fn r(x: f64, n: i32) -> Value {
    if !x.is_finite() {
        return Value::Null;
    }
    let p = 10f64.powi(n);
    json!((x * p).round() / p)
}
fn ro(x: Option<f64>, n: i32) -> Value {
    x.map_or(Value::Null, |v| r(v, n))
}
fn annualize(y: f64, days: f64) -> Option<f64> {
    (days > 0.01 && y > -1.0).then(|| ((1.0 + y).powf(365.0 / days) - 1.0) * 100.0)
}
fn median(mut xs: Vec<f64>) -> Option<f64> {
    if xs.is_empty() {
        return None;
    }
    xs.sort_by(|a, b| a.total_cmp(b));
    let m = xs.len() / 2;
    Some(if xs.len() % 2 == 1 { xs[m] } else { (xs[m - 1] + xs[m]) / 2.0 })
}

/// How far a stored point may sit from the time it stands for. Kept daily samples are taken
/// at ≈00:30 UTC (backfill) or the first hourly sample after midnight, so any target time
/// has one within ≈13h; hourly samples (last 72h) are much closer.
const TOL: f64 = 14.0 * 3600.0;

/// Snapshot nearest to `target` (unix s) within `tol` seconds.
fn nearest(snaps: &[(i64, f64)], target: f64, tol: f64) -> Option<(i64, f64)> {
    snaps.iter().copied().filter(|(_, ts)| (ts - target).abs() <= tol).min_by(|a, b| (a.1 - target).abs().total_cmp(&(b.1 - target).abs()))
}

/// APY windows offered, in days. 1/7/30 are always present (null until data exists).
const WINDOWS: [usize; 6] = [1, 7, 30, 90, 180, 365];
const BASE_WINDOWS: usize = 3;
/// Length of a consistency period on the efficiency side.
const PERIOD: usize = 30;
/// Longest history served (days).
const MAX_SPAN: usize = 400;
/// Alpha APY (%) below which a pool counts as not earning (dust from rounding, no dividends).
const MIN_EARNING: f64 = 0.01;

/// Daily grid: `pts[i]` stands for `n − i` days before head (`pts[n]` = head).
struct Grid {
    n: usize,
    pts: Vec<Option<(i64, f64)>>,
    win: Vec<usize>,
}

impl Grid {
    fn new(snaps: &[(i64, f64)], head: i64, head_ts: f64) -> Self {
        let oldest = snaps.first().map_or(head_ts, |s| s.1);
        let n = (((head_ts - oldest) / DAY).round() as usize).clamp(30, MAX_SPAN);
        let pts: Vec<_> = (0..=n).map(|i| if i == n { Some((head, head_ts)) } else { nearest(snaps, head_ts - (n - i) as f64 * DAY, TOL) }).collect();
        let win = WINDOWS.iter().copied().enumerate().filter(|&(k, w)| k < BASE_WINDOWS || (w <= n && pts[n - w].is_some())).map(|(_, w)| w).collect();
        Self { n, pts, win }
    }
    /// Point `d` days before head.
    fn back(&self, d: usize) -> Option<(i64, f64)> {
        if d > self.n { None } else { self.pts[self.n - d] }
    }
    fn blocks(&self) -> Vec<i64> {
        let mut b: Vec<i64> = self.pts.iter().flatten().map(|p| p.0).collect();
        b.sort();
        b.dedup();
        b
    }
}

pub struct Out {
    pub block: i64,
    pub validators: Value,
    pub alpha: Value,
}

/// Every read happens in one REPEATABLE READ transaction, so a collector write or prune
/// landing mid-computation cannot mix two states.
pub async fn compute(pool: &PgPool) -> Result<Option<Out>> {
    let mut tx = pool.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY").execute(&mut *tx).await?;
    let snaps = vr_core::db::snapshots(&mut *tx).await?;
    let Some(&(head, head_ts)) = snaps.last() else { return Ok(None) };
    let grid = Grid::new(&snaps, head, head_ts);
    let names: HashMap<i32, String> =
        sqlx::query_as::<_, (i32, Option<String>)>("SELECT netuid, name FROM subnet").fetch_all(&mut *tx).await?.into_iter().filter_map(|(n, s)| s.map(|s| (n, s))).collect();
    let validators = root(&mut tx, &grid, head, head_ts, &names).await?;
    let alpha = alpha(&mut tx, &grid, head, head_ts, &names).await?;
    tx.commit().await?;
    Ok(Some(Out { block: head, validators, alpha }))
}

#[derive(sqlx::FromRow)]
struct VRow {
    hotkey: String,
    coldkey: Option<String>,
    name: Option<String>,
    take: f64,
    nominators: Option<i32>,
    nav: Option<f64>,
    spot_nav: Option<f64>,
    shares: Option<f64>,
    deposited: Option<f64>,
    redeemed: Option<f64>,
    holdings: Option<Value>,
}

type Pt = Option<(i64, f64)>;

/// Same shape as the design's validators.json, with `win`, `a{w}`, `d30` added and the
/// series as long as the history.
async fn root(db: &mut PgConnection, g: &Grid, head: i64, head_ts: f64, names: &HashMap<i32, String>) -> Result<Value> {
    let n = g.n;
    let rows = sqlx::query_as::<_, (i64, String, Option<String>, f64)>(
        "SELECT block, hotkey, rate_bits::text, root_stake FROM root_sample WHERE block = ANY($1)",
    )
    .bind(g.blocks())
    .fetch_all(&mut *db)
    .await?;
    let mut rate: HashMap<(i64, String), f64> = HashMap::new();
    let mut stake: HashMap<(i64, String), f64> = HashMap::new();
    for (b, h, bits, s) in rows {
        if let Some(x) = bits.and_then(|b| b.parse::<f64>().ok()) {
            rate.insert((b, h.clone()), x);
        }
        stake.insert((b, h), s);
    }
    let vals = sqlx::query_as::<_, VRow>(
        "SELECT hotkey, coldkey, name, take, nominators, nav, spot_nav, shares, deposited, redeemed, holdings FROM validator WHERE has_basket",
    )
    .fetch_all(&mut *db)
    .await?;

    let apy_between = |hk: &str, a: Pt, b: Pt, price: f64| -> Option<f64> {
        let (ab, ats) = a?;
        let (bb, bts) = b?;
        let r0 = *rate.get(&(ab, hk.to_string()))?;
        let r1 = *rate.get(&(bb, hk.to_string()))?;
        if r1 < r0 || price <= 0.0 {
            return None;
        }
        annualize((r1 - r0) / TWO_32 * price, (bts - ats) / DAY)
    };
    // τ earned per τ staked over the window, in %, not annualized (root stake itself is τ, so
    // there is no principal price move to add)
    let ret_between = |hk: &str, a: Pt, b: Pt, price: f64| -> Option<f64> {
        let r0 = *rate.get(&(a?.0, hk.to_string()))?;
        let r1 = *rate.get(&(b?.0, hk.to_string()))?;
        (r1 >= r0 && price > 0.0).then(|| (r1 - r0) / TWO_32 * price * 100.0)
    };
    let series = |hk: &str, len: usize, price: f64| -> Vec<Option<f64>> {
        if n < len { vec![] } else { (0..=n - len).map(|i| apy_between(hk, g.pts[i], g.pts[i + len], price)).collect() }
    };

    let mut out = Vec::new();
    let mut rolling_all: Vec<(f64, Vec<Option<f64>>)> = Vec::new();
    for v in &vals {
        let (nav, shares) = (v.nav.unwrap_or(0.0), v.shares.unwrap_or(0.0));
        let price = if shares > 0.0 { nav / shares } else { 0.0 };
        let hk = v.hotkey.as_str();
        let s_now = stake.get(&(head, hk.to_string())).copied().unwrap_or(0.0);
        let rolling = series(hk, 7, price);
        let rolling30 = series(hk, 30, price);
        let good: Vec<f64> = rolling.iter().flatten().copied().collect();
        // σ of the rolling series; fewer than 10 points says more about noise than stability
        let sd = (good.len() >= 10).then(|| {
            let m = good.iter().sum::<f64>() / good.len() as f64;
            (good.iter().map(|x| (x - m).powi(2)).sum::<f64>() / good.len() as f64).sqrt()
        });
        // stake history; inner gaps take the previous value, leading ones stay null so a flow
        // is never measured over a shorter span than it claims
        let mut sh = Vec::with_capacity(n + 1);
        let mut last: Option<f64> = None;
        for p in &g.pts {
            let x = p.and_then(|(b, _)| stake.get(&(b, hk.to_string())).copied()).or(last);
            last = x;
            sh.push(x.map(|v| json!(v.round())).unwrap_or(Value::Null));
        }

        let mut hold: Vec<(i64, f64, f64)> = v
            .holdings
            .as_ref()
            .and_then(|h| h.as_array())
            .map(|a| a.iter().filter_map(|x| Some((x.get(0)?.as_i64()?, x.get(2)?.as_f64()? / 1e9, x.get(3)?.as_f64()? / 1e9))).filter(|x| x.1 > 0.0).collect())
            .unwrap_or_default();
        hold.sort_by(|a, b| b.1.total_cmp(&a.1));
        let rest: f64 = hold.iter().skip(8).map(|x| x.1).sum();
        let top: Vec<Value> = hold
            .iter()
            .take(8)
            .map(|(n, spot, real)| json!([n, names.get(&(*n as i32)).map(|s| s.chars().take(18).collect::<String>()), r(*spot, 1), r(*real, 1)]))
            .collect();

        let mut o = json!({
            "hk": hk, "ck": v.coldkey, "n": v.name.as_deref().filter(|s| !s.is_empty()),
            "s": r(s_now, 1), "t": r(v.take, 4), "nom": v.nominators, "sd": ro(sd, 2),
            "nav": r(nav / 1e9, 1), "snav": r(v.spot_nav.unwrap_or(0.0) / 1e9, 1),
            "dep": r(v.deposited.unwrap_or(0.0) / 1e9, 1), "red": r(v.redeemed.unwrap_or(0.0) / 1e9, 1),
            "nh": hold.len(), "hr": r(rest, 1), "h": top,
            "d": rolling.iter().map(|x| ro(*x, 2)).collect::<Vec<_>>(),
            "d30": rolling30.iter().map(|x| ro(*x, 2)).collect::<Vec<_>>(),
            "sh": sh,
        });
        for &w in &g.win {
            o[format!("a{w}")] = ro(apy_between(hk, g.back(w), g.back(0), price), 2);
            o[format!("r{w}")] = ro(ret_between(hk, g.back(w), g.back(0), price), 3);
        }
        rolling_all.push((s_now, rolling));
        out.push(o);
    }
    let med: Vec<Value> = (0..n.saturating_sub(6))
        .map(|i| ro(median(rolling_all.iter().filter(|(s, _)| *s >= 1000.0).filter_map(|(_, d)| d.get(i).copied().flatten()).collect()), 2))
        .collect();
    let days: Vec<Value> = g
        .pts
        .iter()
        .enumerate()
        .map(|(i, p)| json!((p.map(|p| p.1).unwrap_or(head_ts - (n - i) as f64 * DAY) * 1000.0).round() as i64))
        .collect();
    Ok(json!({ "block": head, "ts": (head_ts * 1000.0).round() as i64, "win": g.win, "days": days, "med": med, "v": out }))
}

/// Same shape as the design's alpha.json, with windows (`win`, `ewin`) and consistency
/// periods (`period`, `np`, `effp`, `cons`).
async fn alpha(db: &mut PgConnection, g: &Grid, head: i64, head_ts: f64, names: &HashMap<i32, String>) -> Result<Value> {
    let ewin: Vec<usize> = g.win.iter().copied().filter(|&w| w >= 7).collect();
    let np = g.n / PERIOD;
    // every day offset we read: window starts and period boundaries
    let mut offs: Vec<usize> = g.win.clone();
    offs.extend((0..=np).map(|k| k * PERIOD));
    offs.sort();
    offs.dedup();
    let p: HashMap<usize, (i64, f64)> = offs.iter().filter_map(|&d| g.back(d).map(|x| (d, x))).collect();
    let mut blocks: Vec<i64> = p.values().map(|x| x.0).collect();
    blocks.sort();
    blocks.dedup();

    let rows = sqlx::query_as::<_, (i64, String, i32, f64, Option<f64>, Option<i64>)>(
        "SELECT block, hotkey, netuid, alpha, pps, epoch FROM alpha_sample WHERE block = ANY($1)",
    )
    .bind(&blocks)
    .fetch_all(&mut *db)
    .await?;
    type PoolKey = (i64, String, i32);
    type PoolVal = (f64, Option<f64>, Option<i64>);
    let mut pool_at: HashMap<PoolKey, PoolVal> = HashMap::new();
    for (b, h, n, a, pps, ep) in rows {
        pool_at.insert((b, h, n), (a, pps, ep));
    }
    let prices: HashMap<(i64, i32), f64> = sqlx::query_as::<_, (i64, i32, f64, f64)>("SELECT block, netuid, tao, alpha_in FROM subnet_sample WHERE block = ANY($1)")
        .bind(&blocks)
        .fetch_all(&mut *db)
        .await?
        .into_iter()
        .filter(|x| x.3 > 0.0)
        .map(|(b, n, t, a)| ((b, n), t / a))
        .collect();
    let meta: HashMap<String, (Option<String>, f64)> = sqlx::query_as::<_, (String, Option<String>, f64)>("SELECT hotkey, name, take FROM validator")
        .fetch_all(&mut *db)
        .await?
        .into_iter()
        .map(|(h, n, t)| (h, (n.filter(|s| !s.is_empty()), t)))
        .collect();
    let child_take: HashMap<(String, i32), f64> = sqlx::query_as::<_, (String, i32, Value)>("SELECT hotkey, netuid, children FROM childkey")
        .fetch_all(&mut *db)
        .await?
        .into_iter()
        .map(|(h, n, c)| {
            let w = c.as_array().map(|a| a.iter().filter_map(|x| Some(x.get(0)?.as_f64()? * x.get(2)?.as_f64()?)).sum()).unwrap_or(0.0);
            ((h, n), w)
        })
        .collect();

    // Pools at head; APY of a pool between two day offsets (from > to).
    struct Pair {
        hk: String,
        nu: i32,
        tao: f64,
        ct: f64,
        cfg: f64,
    }
    let pool_apy = |hk: &str, nu: i32, from: usize, to: usize| -> Option<f64> {
        let (b0, t0) = *p.get(&from)?;
        let (b1, t1) = *p.get(&to)?;
        let (_, pps0, ep0) = pool_at.get(&(b0, hk.to_string(), nu))?;
        let (_, pps1, ep1) = pool_at.get(&(b1, hk.to_string(), nu))?;
        let (p0, p1) = ((*pps0)?, (*pps1)?);
        if ep0 != ep1 || p0 <= 0.0 || p1 < p0 {
            return None;
        }
        annualize(p1 / p0 - 1.0, (t1 - t0) / DAY)
    };
    // τ return over the interval, in %, not annualized: alpha growth times the subnet's
    // spot price change (SubnetTAO / SubnetAlphaIn at both ends).
    let tao_return = |nu: i32, from: usize, to: usize, alpha_apy: Option<f64>| -> Option<f64> {
        let (b0, t0) = *p.get(&from)?;
        let (b1, t1) = *p.get(&to)?;
        let (px0, px1) = (*prices.get(&(b0, nu))?, *prices.get(&(b1, nu))?);
        let days = (t1 - t0) / DAY;
        if px0 <= 0.0 || days <= 0.01 {
            return None;
        }
        let growth = (1.0 + alpha_apy? / 100.0).powf(days / 365.0);
        Some((growth * px1 / px0 - 1.0) * 100.0)
    };
    let mut pairs: Vec<Pair> = Vec::new();
    for ((b, hk, nu), (alpha, _, _)) in &pool_at {
        if *b != head {
            continue;
        }
        let px = prices.get(&(head, *nu)).copied().unwrap_or(0.0);
        let ct = child_take.get(&(hk.clone(), *nu)).copied().unwrap_or(0.0);
        let own = meta.get(hk).map(|m| m.1).unwrap_or(0.0);
        pairs.push(Pair { hk: hk.clone(), nu: *nu, tao: alpha * px, ct, cfg: 1.0 - (1.0 - own) * (1.0 - ct) });
    }
    pairs.sort_by(|a, b| (a.nu, &a.hk).cmp(&(b.nu, &b.hk)));
    let mut by_sn: HashMap<i32, Vec<usize>> = HashMap::new();
    for (i, x) in pairs.iter().enumerate() {
        by_sn.entry(x.nu).or_default().push(i);
    }

    /// Per-pool APY over one interval, the subnet reference (median of the top 3 pools worth
    /// ≥ 100 τ), efficiency vs that (capped at 120%) and rank among pools worth ≥ 10 τ.
    /// Every pool on a subnet sees the same price move, so reference, efficiency and rank
    /// compare the yields; `ret` / `sret` add the price move as a τ return.
    struct Interval {
        apy: Vec<Option<f64>>,
        ret: Vec<Option<f64>>,
        refv: HashMap<i32, Option<f64>>,
        sret: HashMap<i32, Option<f64>>,
        eff: Vec<Option<f64>>,
        rk: Vec<Option<usize>>,
        /// pool is one of the (up to 3) pools that set its subnet's reference
        top: Vec<bool>,
        /// how many pools set the reference (fewer than 3 = less reliable)
        nref: HashMap<i32, usize>,
        ranked: HashMap<i32, usize>,
    }
    let interval = |from: usize, to: usize| -> Interval {
        let apy: Vec<Option<f64>> = pairs.iter().map(|x| pool_apy(&x.hk, x.nu, from, to)).collect();
        let mut eff = vec![None; pairs.len()];
        let mut rk = vec![None; pairs.len()];
        let mut refv = HashMap::new();
        let mut sret = HashMap::new();
        let mut top = vec![false; pairs.len()];
        let mut nref = HashMap::new();
        let mut ranked_n = HashMap::new();
        for (nu, idx) in &by_sn {
            // Pools with a zero yield earned nothing (validator not earning dividends): they get
            // no efficiency instead of "100% effective take", and never set the reference.
            let mut big: Vec<usize> = idx.iter().copied().filter(|&i| pairs[i].tao >= 100.0 && apy[i].is_some_and(|a| a >= MIN_EARNING)).collect();
            big.sort_by(|&a, &b| apy[b].unwrap().total_cmp(&apy[a].unwrap()));
            big.truncate(3);
            for &i in &big {
                top[i] = true;
            }
            let vals: Vec<f64> = big.iter().map(|&i| apy[i].unwrap()).collect();
            let rv = if vals.len() >= 3 { median(vals.clone()) } else { vals.first().copied() };
            nref.insert(*nu, vals.len());
            for &i in idx {
                eff[i] = match (rv, apy[i]) {
                    (Some(rv), Some(a)) if rv > 0.0 && a >= MIN_EARNING => Some((a / rv).min(1.2)),
                    _ => None,
                };
            }
            let mut ranked: Vec<usize> = idx.iter().copied().filter(|&i| apy[i].is_some() && pairs[i].tao >= 10.0).collect();
            ranked.sort_by(|&a, &b| apy[b].unwrap().total_cmp(&apy[a].unwrap()));
            for (k, &i) in ranked.iter().enumerate() {
                rk[i] = Some(k + 1);
            }
            refv.insert(*nu, rv);
            sret.insert(*nu, tao_return(*nu, from, to, rv));
            ranked_n.insert(*nu, ranked.len());
        }
        let ret = pairs.iter().zip(&apy).map(|(x, a)| tao_return(x.nu, from, to, *a)).collect();
        Interval { apy, ret, refv, sret, eff, rk, top, nref, ranked: ranked_n }
    };
    let wins: Vec<(usize, Interval)> = g.win.iter().map(|&w| (w, interval(w, 0))).collect();
    let ewins: Vec<&(usize, Interval)> = wins.iter().filter(|(w, _)| ewin.contains(w)).collect();
    let periods: Vec<Interval> = (0..np).map(|k| interval((k + 1) * PERIOD, k * PERIOD)).collect();

    // subnets
    let price = |d: usize, nu: i32| p.get(&d).and_then(|(b, _)| prices.get(&(*b, nu))).copied();
    let mut subnets = Vec::new();
    for (nu, idx) in &by_sn {
        let tao: f64 = idx.iter().map(|&i| pairs[i].tao).sum();
        let mut o = json!({ "nu": nu, "name": names.get(nu), "price": ro(price(0, *nu), 6), "tao": r(tao, 1) });
        for &w in &g.win {
            let ch = match (price(0, *nu), price(w, *nu)) {
                (Some(a), Some(b)) if b > 0.0 => Some((a / b - 1.0) * 100.0),
                _ => None,
            };
            o[format!("dp{w}")] = ro(ch, 2);
        }
        for (w, iv) in &ewins {
            o[format!("ref{w}")] = ro(iv.refv.get(nu).copied().flatten(), 2);
            o[format!("r{w}")] = ro(iv.sret.get(nu).copied().flatten(), 2);
            o[format!("n{w}")] = json!(iv.ranked.get(nu).copied().unwrap_or(0));
            o[format!("nref{w}")] = json!(iv.nref.get(nu).copied().unwrap_or(0));
        }
        subnets.push((tao, o));
    }
    subnets.sort_by(|a, b| b.0.total_cmp(&a.0));

    // validators: stake-weighted over their pools worth ≥ 10 τ
    let mut by_v: HashMap<&str, Vec<usize>> = HashMap::new();
    for (i, x) in pairs.iter().enumerate() {
        by_v.entry(x.hk.as_str()).or_default().push(i);
    }
    let mut vlist: Vec<(String, Value)> = Vec::new();
    for (hk, idx) in &by_v {
        let tot: f64 = idx.iter().map(|&i| pairs[i].tao).sum();
        if tot < 10.0 {
            continue;
        }
        let w = |f: &dyn Fn(usize) -> Option<f64>| -> Option<f64> {
            let xs: Vec<(f64, f64)> = idx.iter().copied().filter(|&i| pairs[i].tao >= 10.0).filter_map(|i| f(i).map(|v| (v, pairs[i].tao))).collect();
            let ww: f64 = xs.iter().map(|x| x.1).sum();
            (ww > 0.0).then(|| xs.iter().map(|(v, t)| v * t).sum::<f64>() / ww)
        };
        let (name, take) = meta.get(*hk).cloned().unwrap_or((None, 0.0));
        let effp: Vec<Option<f64>> = periods.iter().map(|iv| w(&|i| iv.eff[i])).collect();
        let known: Vec<f64> = effp.iter().flatten().copied().collect();
        let cons = (known.len() >= 2).then(|| known.iter().filter(|&&e| e >= 0.9).count() as f64 / known.len() as f64 * 100.0);
        let mut o = json!({
            "hk": hk, "n": name, "t": r(take, 4), "tao": r(tot, 1),
            "ns": idx.iter().filter(|&&i| pairs[i].tao >= 10.0).count(),
            "ct": ro(w(&|i| Some(pairs[i].ct * 100.0)), 2), "cfg": ro(w(&|i| Some(pairs[i].cfg * 100.0)), 2),
            "effp": effp.iter().map(|e| ro(e.map(|e| e * 100.0), 1)).collect::<Vec<_>>(),
            "cons": ro(cons, 0),
        });
        for (wd, iv) in &wins {
            o[format!("a{wd}")] = ro(w(&|i| iv.apy[i]), 2);
            o[format!("r{wd}")] = ro(w(&|i| iv.ret[i]), 2);
        }
        for (wd, iv) in &ewins {
            let e = w(&|i| iv.eff[i]);
            o[format!("eff{wd}")] = ro(e.map(|e| e * 100.0), 2);
            o[format!("et{wd}")] = ro(e.map(|e| (1.0 - e) * 100.0), 2);
            // share of the validator's stake (pools ≥ 10 τ) that earned nothing, and that sits in
            // pools setting their own subnet's reference
            let big: f64 = idx.iter().filter(|&&i| pairs[i].tao >= 10.0).map(|&i| pairs[i].tao).sum();
            let share = |f: &dyn Fn(usize) -> bool| -> Value {
                if big > 0.0 { r(idx.iter().copied().filter(|&i| pairs[i].tao >= 10.0 && f(i)).map(|i| pairs[i].tao).sum::<f64>() / big * 100.0, 1) } else { Value::Null }
            };
            o[format!("ne{wd}")] = share(&|i| iv.apy[i].is_some_and(|a| a < MIN_EARNING));
            o[format!("self{wd}")] = share(&|i| iv.top[i]);
        }
        vlist.push((hk.to_string(), o));
    }
    vlist.sort_by(|a, b| a.0.cmp(&b.0));
    let vi: HashMap<&str, usize> = vlist.iter().enumerate().map(|(i, (h, _))| (h.as_str(), i)).collect();

    let mut pf: Vec<String> = vec!["v".into(), "nu".into(), "tao".into()];
    pf.extend(g.win.iter().map(|w| format!("a{w}")));
    pf.extend(g.win.iter().map(|w| format!("r{w}")));
    pf.extend(ewins.iter().map(|(w, _)| format!("eff{w}")));
    pf.extend(ewins.iter().map(|(w, _)| format!("rk{w}")));
    pf.extend(ewins.iter().map(|(w, _)| format!("top{w}")));
    pf.push("ct".into());
    let prow: Vec<Value> = pairs
        .iter()
        .enumerate()
        .filter(|(_, x)| x.tao >= 1.0)
        .filter_map(|(i, x)| {
            let mut row = vec![json!(*vi.get(x.hk.as_str())?), json!(x.nu), r(x.tao, 1)];
            row.extend(wins.iter().map(|(_, iv)| ro(iv.apy[i], 2)));
            row.extend(wins.iter().map(|(_, iv)| ro(iv.ret[i], 2)));
            row.extend(ewins.iter().map(|(_, iv)| ro(iv.eff[i].map(|e| e * 100.0), 1)));
            row.extend(ewins.iter().map(|(_, iv)| json!(iv.rk[i])));
            row.extend(ewins.iter().map(|(_, iv)| json!(u8::from(iv.top[i]))));
            row.push(r(x.ct * 100.0, 1));
            Some(Value::Array(row))
        })
        .collect();

    Ok(json!({
        "sample": false, "block": head, "ts": (head_ts * 1000.0).round() as i64,
        "win": g.win, "ewin": ewin, "period": PERIOD, "np": np,
        "subnets": subnets.into_iter().map(|x| x.1).collect::<Vec<_>>(),
        "v": vlist.into_iter().map(|x| x.1).collect::<Vec<_>>(),
        "pf": pf,
        "p": prow,
    }))
}
