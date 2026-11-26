//! APY math (also summarized in README.md, "How yield is computed"):
//!
//! root:  yield = ΔBasketRate.bits / 2^32 × NAV / shares       (current share price, net of take)
//! alpha: yield = pps(t1) / pps(t0) − 1, pps = TotalHotkeyAlpha / TotalHotkeySharesV2
//! APY   = (1 + yield)^(365 / days) − 1, days from block timestamps.
//!
//! Undefined (null) when a sample is missing, a rate went down (fund reset) or the alpha
//! pool epoch changed between the two samples.

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
    let names: HashMap<i32, String> =
        sqlx::query_as::<_, (i32, Option<String>)>("SELECT netuid, name FROM subnet").fetch_all(&mut *tx).await?.into_iter().filter_map(|(n, s)| s.map(|s| (n, s))).collect();
    let validators = root(&mut tx, &snaps, head, head_ts, &names).await?;
    let alpha = alpha(&mut tx, &snaps, head, head_ts, &names).await?;
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

/// Same shape as the design's validators.json.
async fn root(db: &mut PgConnection, snaps: &[(i64, f64)], head: i64, head_ts: f64, names: &HashMap<i32, String>) -> Result<Value> {
    // 31 daily points, index 0 = 30 days ago, 30 = head.
    let pts: Vec<Option<(i64, f64)>> = (0..=30)
        .map(|i| {
            let d = 30 - i;
            if d == 0 { Some((head, head_ts)) } else { nearest(snaps, head_ts - d as f64 * DAY, TOL) }
        })
        .collect();
    let blocks: Vec<i64> = pts.iter().flatten().map(|p| p.0).collect();
    let rows = sqlx::query_as::<_, (i64, String, Option<String>, f64)>(
        "SELECT block, hotkey, rate_bits::text, root_stake FROM root_sample WHERE block = ANY($1)",
    )
    .bind(&blocks)
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

    let apy_between = |hk: &str, a: Option<(i64, f64)>, b: Option<(i64, f64)>, price: f64| -> Option<f64> {
        let (ab, ats) = a?;
        let (bb, bts) = b?;
        let r0 = *rate.get(&(ab, hk.to_string()))?;
        let r1 = *rate.get(&(bb, hk.to_string()))?;
        if r1 < r0 || price <= 0.0 {
            return None;
        }
        annualize((r1 - r0) / TWO_32 * price, (bts - ats) / DAY)
    };

    let mut out = Vec::new();
    let mut rolling_all: Vec<(f64, Vec<Option<f64>>)> = Vec::new();
    for v in &vals {
        let (nav, shares) = (v.nav.unwrap_or(0.0), v.shares.unwrap_or(0.0));
        let price = if shares > 0.0 { nav / shares } else { 0.0 };
        let hk = v.hotkey.as_str();
        let s_now = stake.get(&(head, hk.to_string())).copied().unwrap_or(0.0);
        let win = |d: usize| apy_between(hk, pts[30 - d], pts[30], price);
        let rolling: Vec<Option<f64>> = (7..=30).map(|j| apy_between(hk, pts[j - 7], pts[j], price)).collect();
        let good: Vec<f64> = rolling.iter().flatten().copied().collect();
        // σ of the rolling series; fewer than 10 points says more about noise than stability
        let sd = (good.len() >= 10).then(|| {
            let m = good.iter().sum::<f64>() / good.len() as f64;
            (good.iter().map(|x| (x - m).powi(2)).sum::<f64>() / good.len() as f64).sqrt()
        });
        // stake history; inner gaps take the previous value, leading ones stay null so a flow
        // is never measured over a shorter span than it claims
        let mut sh = Vec::with_capacity(31);
        let mut last: Option<f64> = None;
        for p in &pts {
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

        rolling_all.push((s_now, rolling.clone()));
        out.push(json!({
            "hk": hk, "ck": v.coldkey, "n": v.name.as_deref().filter(|s| !s.is_empty()),
            "s": r(s_now, 1), "t": r(v.take, 4), "nom": v.nominators,
            "a1": ro(win(1), 2), "a7": ro(win(7), 2), "a30": ro(win(30), 2), "sd": ro(sd, 2),
            "nav": r(nav / 1e9, 1), "snav": r(v.spot_nav.unwrap_or(0.0) / 1e9, 1),
            "dep": r(v.deposited.unwrap_or(0.0) / 1e9, 1), "red": r(v.redeemed.unwrap_or(0.0) / 1e9, 1),
            "nh": hold.len(), "hr": r(rest, 1), "h": top,
            "d": rolling.iter().map(|x| ro(*x, 2)).collect::<Vec<_>>(),
            "sh": sh,
        }));
    }
    let med: Vec<Value> = (0..24)
        .map(|i| ro(median(rolling_all.iter().filter(|(s, _)| *s >= 1000.0).filter_map(|(_, d)| d[i]).collect()), 2))
        .collect();
    let days: Vec<Value> = pts
        .iter()
        .enumerate()
        .map(|(i, p)| json!((p.map(|p| p.1).unwrap_or(head_ts - (30 - i) as f64 * DAY) * 1000.0).round() as i64))
        .collect();
    Ok(json!({ "block": head, "ts": (head_ts * 1000.0).round() as i64, "days": days, "med": med, "v": out }))
}

/// Same shape as the design's alpha.json.
async fn alpha(db: &mut PgConnection, snaps: &[(i64, f64)], head: i64, head_ts: f64, names: &HashMap<i32, String>) -> Result<Value> {
    let pt = |d: u32| if d == 0 { Some((head, head_ts)) } else { nearest(snaps, head_ts - d as f64 * DAY, TOL) };
    let p: HashMap<u32, (i64, f64)> = [0u32, 1, 7, 30].into_iter().filter_map(|d| pt(d).map(|x| (d, x))).collect();
    let blocks: Vec<i64> = p.values().map(|x| x.0).collect();

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

    struct Pair {
        hk: String,
        nu: i32,
        tao: f64,
        a: [Option<f64>; 3], // 1d, 7d, 30d
        eff: Option<f64>,
        ct: f64,
        cfg: f64,
        rk: Option<usize>,
    }
    let (hb, _) = p[&0];
    let mut pairs: Vec<Pair> = Vec::new();
    for ((b, hk, nu), (alpha, pps0, ep0)) in &pool_at {
        if *b != hb {
            continue;
        }
        let px = prices.get(&(hb, *nu)).copied().unwrap_or(0.0);
        let apy = |d: u32| -> Option<f64> {
            let (bd, tsd) = *p.get(&d)?;
            let (_, ppsd, epd) = pool_at.get(&(bd, hk.clone(), *nu))?;
            let (p0, p1) = ((*ppsd)?, (*pps0)?);
            if epd != ep0 || p0 <= 0.0 || p1 < p0 {
                return None;
            }
            annualize(p1 / p0 - 1.0, (head_ts - tsd) / DAY)
        };
        let ct = child_take.get(&(hk.clone(), *nu)).copied().unwrap_or(0.0);
        let own = meta.get(hk).map(|m| m.1).unwrap_or(0.0);
        pairs.push(Pair { hk: hk.clone(), nu: *nu, tao: alpha * px, a: [apy(1), apy(7), apy(30)], eff: None, ct, cfg: 1.0 - (1.0 - own) * (1.0 - ct), rk: None });
    }

    // subnet reference APY = median of the top 3 pools worth ≥ 100 τ; efficiency vs that.
    let mut by_sn: HashMap<i32, Vec<usize>> = HashMap::new();
    for (i, x) in pairs.iter().enumerate() {
        by_sn.entry(x.nu).or_default().push(i);
    }
    let mut subnets = Vec::new();
    for (nu, idx) in &by_sn {
        let mut big: Vec<f64> = idx.iter().filter(|&&i| pairs[i].tao >= 100.0).filter_map(|&i| pairs[i].a[2]).collect();
        big.sort_by(|a, b| b.total_cmp(a));
        let refv = if big.len() >= 3 { median(big[..3].to_vec()) } else { big.first().copied() };
        for &i in idx {
            pairs[i].eff = match (refv, pairs[i].a[2]) {
                (Some(rv), Some(a)) if rv > 0.0 => Some((a / rv).min(1.2)),
                _ => None,
            };
        }
        let mut ranked: Vec<usize> = idx.iter().copied().filter(|&i| pairs[i].a[2].is_some() && pairs[i].tao >= 10.0).collect();
        ranked.sort_by(|&a, &b| pairs[b].a[2].unwrap().total_cmp(&pairs[a].a[2].unwrap()));
        for (k, &i) in ranked.iter().enumerate() {
            pairs[i].rk = Some(k + 1);
        }
        let price = |d: u32| p.get(&d).and_then(|(b, _)| prices.get(&(*b, *nu))).copied();
        let ch = |d: u32| match (price(0), price(d)) {
            (Some(a), Some(b)) if b > 0.0 => Some((a / b - 1.0) * 100.0),
            _ => None,
        };
        subnets.push((
            idx.iter().map(|&i| pairs[i].tao).sum::<f64>(),
            json!({
                "nu": nu, "name": names.get(nu), "price": ro(price(0), 6),
                "dp30": ro(ch(30), 2), "dp7": ro(ch(7), 2), "ref": ro(refv, 2),
                "n": ranked.len(), "tao": r(idx.iter().map(|&i| pairs[i].tao).sum(), 1),
            }),
        ));
    }
    subnets.sort_by(|a, b| b.0.total_cmp(&a.0));

    // validators
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
        let w = |f: &dyn Fn(&Pair) -> Option<f64>| -> Option<f64> {
            let xs: Vec<(f64, f64)> = idx.iter().map(|&i| &pairs[i]).filter(|x| x.tao >= 10.0).filter_map(|x| f(x).map(|v| (v, x.tao))).collect();
            let ww: f64 = xs.iter().map(|x| x.1).sum();
            (ww > 0.0).then(|| xs.iter().map(|(v, t)| v * t).sum::<f64>() / ww)
        };
        let eff = w(&|x| x.eff);
        let (name, take) = meta.get(*hk).cloned().unwrap_or((None, 0.0));
        vlist.push((
            hk.to_string(),
            json!({
                "hk": hk, "n": name, "t": r(take, 4), "tao": r(tot, 1),
                "ns": idx.iter().filter(|&&i| pairs[i].tao >= 10.0).count(),
                "eff": ro(eff.map(|e| e * 100.0), 2), "et": ro(eff.map(|e| (1.0 - e) * 100.0), 2),
                "a30": ro(w(&|x| x.a[2]), 2), "a7": ro(w(&|x| x.a[1]), 2),
                "ct": ro(w(&|x| Some(x.ct * 100.0)), 2), "cfg": ro(w(&|x| Some(x.cfg * 100.0)), 2),
            }),
        ));
    }
    vlist.sort_by(|a, b| a.0.cmp(&b.0));
    let vi: HashMap<&str, usize> = vlist.iter().enumerate().map(|(i, (h, _))| (h.as_str(), i)).collect();
    let prow: Vec<Value> = pairs
        .iter()
        .filter(|x| x.tao >= 1.0)
        .filter_map(|x| {
            let i = *vi.get(x.hk.as_str())?;
            Some(json!([i, x.nu, r(x.tao, 1), ro(x.a[0], 2), ro(x.a[1], 2), ro(x.a[2], 2), ro(x.eff.map(|e| e * 100.0), 1), r(x.ct * 100.0, 1), x.rk]))
        })
        .collect();

    Ok(json!({
        "sample": false, "block": head, "ts": (head_ts * 1000.0).round() as i64,
        "subnets": subnets.into_iter().map(|x| x.1).collect::<Vec<_>>(),
        "v": vlist.into_iter().map(|x| x.1).collect::<Vec<_>>(),
        "pf": ["v", "nu", "tao", "a1", "a7", "a30", "eff", "ct", "rk"],
        "p": prow,
    }))
}
