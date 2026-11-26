//! Validator rating for the "Choose a validator" view, built on top of the computed
//! `/api/validators` and `/api/alpha` documents.
//!
//! Payout ratio (PR) = a validator's daily yield ÷ a benchmark daily yield, capped at 120%.
//! Daily yields (not APYs) are compared so short-window bursts don't blow ratios up.
//!
//! - Root: benchmark = median of the top 3 APY 30D among rated validators (≥ 1K τ and ≥ 21
//!   days of rolling data). Grade on PR; an A also needs ≥ 90% of the daily benchmark on at
//!   least 2/3 of the last 30 days.
//! - Alpha pool (validator v on subnet s): benchmark = median of the top 3 earning pools on s
//!   *excluding v's own pool* (leave-one-out), from pools ≥ 100 τ ("solid") or, when there are
//!   fewer than 3, pools ≥ 10 τ ("thin"). PR = min(PR7, PR30): a validator must be good in
//!   both windows. APY < 0.01% = not earning (F).
//! - Grades: A ≥ 95%, B ≥ 85%, C ≥ 70%, D below, F not earning. Take is shown next to the
//!   grade, never folded into it (it is already inside the yields).

use std::collections::HashMap;

use serde_json::{Value, json};

const MIN_EARNING: f64 = 0.01;
const ROOT_MIN_STAKE: f64 = 1000.0;
const ROOT_MIN_DAYS: usize = 21;
/// Rolling points that make up the last 30 days (a 7-day rolling series has 24 of them).
const ROOT_WINDOW: usize = 24;

fn f(v: &Value, k: &str) -> Option<f64> {
    v.get(k).and_then(Value::as_f64)
}
fn s<'a>(v: &'a Value, k: &str) -> Option<&'a str> {
    v.get(k).and_then(Value::as_str)
}
fn round(x: f64, n: i32) -> Value {
    if !x.is_finite() {
        return Value::Null;
    }
    let p = 10f64.powi(n);
    json!((x * p).round() / p)
}
fn ro(x: Option<f64>, n: i32) -> Value {
    x.map_or(Value::Null, |v| round(v, n))
}
/// APY % → daily yield.
fn dy(a: f64) -> Option<f64> {
    (a > -100.0).then(|| (1.0 + a / 100.0).powf(1.0 / 365.0) - 1.0)
}
fn ratio(a: f64, b: f64) -> Option<f64> {
    let (x, y) = (dy(a)?, dy(b)?);
    (y > 0.0).then(|| (x / y).min(1.2))
}
fn median(mut xs: Vec<f64>) -> Option<f64> {
    if xs.is_empty() {
        return None;
    }
    xs.sort_by(|a, b| a.total_cmp(b));
    let m = xs.len() / 2;
    Some(if xs.len() % 2 == 1 { xs[m] } else { (xs[m - 1] + xs[m]) / 2.0 })
}
fn top3_median(mut xs: Vec<f64>) -> Option<f64> {
    xs.sort_by(|a, b| b.total_cmp(a));
    xs.truncate(3);
    median(xs)
}
fn grade(pr: Option<f64>) -> Option<&'static str> {
    let pr = pr?;
    Some(if pr == 0.0 {
        "F"
    } else if pr >= 0.95 {
        "A"
    } else if pr >= 0.85 {
        "B"
    } else if pr >= 0.70 {
        "C"
    } else {
        "D"
    })
}
fn short(hk: &str) -> String {
    if hk.len() > 10 { format!("{}…{}", &hk[..6], &hk[hk.len() - 4..]) } else { hk.to_string() }
}

pub struct Rated {
    /// `/api/choose`
    pub choose: Value,
    /// `/api/validator/{hotkey}`
    pub details: HashMap<String, Value>,
}

struct RootRow {
    hk: String,
    v: Value,
}

struct Pool {
    v: usize,
    nu: i64,
    tao: f64,
    a7: Option<f64>,
    a30: Option<f64>,
    ct: f64,
    rk: Option<i64>,
    cfg: f64,
    b30: Option<f64>,
    k30: Option<&'static str>,
    pr7: Option<f64>,
    pr30: Option<f64>,
    pr: Option<f64>,
    g: Option<&'static str>,
    badges: Vec<&'static str>,
}

pub fn build(vals: &Value, alpha: &Value) -> Rated {
    let empty = vec![];
    // ---------------- root ----------------
    let rv = vals.get("v").and_then(Value::as_array).unwrap_or(&empty);
    let series = |x: &Value| -> Vec<Option<f64>> { x.get("d").and_then(Value::as_array).map(|a| a.iter().map(Value::as_f64).collect()).unwrap_or_default() };
    let last = |d: &[Option<f64>]| -> Vec<Option<f64>> { d[d.len().saturating_sub(ROOT_WINDOW)..].to_vec() };
    let rated = |x: &Value| -> bool {
        f(x, "s").unwrap_or(0.0) >= ROOT_MIN_STAKE && f(x, "a30").is_some() && last(&series(x)).iter().flatten().count() >= ROOT_MIN_DAYS
    };
    let eligible: Vec<&Value> = rv.iter().filter(|x| rated(x)).collect();
    let bench = top3_median(eligible.iter().filter_map(|x| f(x, "a30")).collect());
    let len = rv.first().map(|x| series(x).len()).unwrap_or(0);
    let bench_d: Vec<Option<f64>> = (0..len).map(|i| top3_median(eligible.iter().filter_map(|x| series(x).get(i).copied().flatten()).collect())).collect();

    let mut roots: Vec<RootRow> = Vec::new();
    for x in rv {
        let hk = s(x, "hk").unwrap_or_default().to_string();
        let d = series(x);
        let is_rated = rated(x);
        let pr = match (f(x, "a30"), bench) {
            (Some(a), Some(b)) => ratio(a, b),
            _ => None,
        };
        let hits: Vec<bool> = last(&d).iter().zip(last(&bench_d)).filter_map(|(d, b)| Some(d.as_ref()? >= &(0.9 * b?))).collect();
        let hit = (!hits.is_empty()).then(|| hits.iter().filter(|h| **h).count() as f64 / hits.len() as f64);
        let mut g = if is_rated { grade(pr) } else { None };
        if g == Some("A") && hit.is_some_and(|h| h < 2.0 / 3.0) {
            g = Some("B");
        }
        let mut badges = vec![];
        if f(x, "t").unwrap_or(0.0) >= 0.15 {
            badges.push("High fee");
        }
        if !is_rated {
            badges.push(if last(&d).iter().flatten().count() < ROOT_MIN_DAYS { "New" } else { "Small" });
        } else if hit.is_some_and(|h| h < 0.5) {
            badges.push("Unstable");
        }
        // payout per 7-day period (every 7th rolling point, newest last)
        let mut per = vec![];
        let mut i = len as isize - 1;
        while i >= 0 {
            let iu = i as usize;
            per.push(match (d.get(iu).copied().flatten(), bench_d.get(iu).copied().flatten()) {
                (Some(a), Some(b)) => ro(ratio(a, b).map(|r| r * 100.0), 1),
                _ => Value::Null,
            });
            i -= 7;
        }
        per.reverse();
        roots.push(RootRow {
            hk: hk.clone(),
            v: json!({
                "n": x.get("n"), "hk": hk, "ck": x.get("ck"), "s": round(f(x, "s").unwrap_or(0.0), 0), "nom": x.get("nom"), "t": x.get("t"),
                "a7": x.get("a7"), "a30": x.get("a30"), "r30": x.get("r30"),
                "pr": ro(pr.map(|p| p * 100.0), 1), "hit": ro(hit.map(|h| h * 100.0), 0), "g": g, "b": badges,
                "d": x.get("d"), "per": per,
            }),
        });
    }
    let gi = |g: Option<&str>| g.and_then(|g| "ABCDF".find(g)).unwrap_or(9);
    roots.sort_by(|a, b| {
        let key = |r: &RootRow| (gi(s(&r.v, "g")), -f(&r.v, "a30").unwrap_or(-1.0), -f(&r.v, "s").unwrap_or(0.0));
        let (ka, kb) = (key(a), key(b));
        ka.0.cmp(&kb.0).then(ka.1.total_cmp(&kb.1)).then(ka.2.total_cmp(&kb.2))
    });

    // ---------------- alpha ----------------
    let av = alpha.get("v").and_then(Value::as_array).unwrap_or(&empty);
    let pf: Vec<&str> = alpha.get("pf").and_then(Value::as_array).map(|a| a.iter().filter_map(Value::as_str).collect()).unwrap_or_default();
    let col = |k: &str| pf.iter().position(|c| *c == k);
    let (cv, cnu, ctao, ca7, ca30, cct, crk) = (col("v"), col("nu"), col("tao"), col("a7"), col("a30"), col("ct"), col("rk30"));
    let at = |row: &[Value], c: Option<usize>| c.and_then(|c| row.get(c)).and_then(Value::as_f64);
    let mut pools: Vec<Pool> = alpha
        .get("p")
        .and_then(Value::as_array)
        .unwrap_or(&empty)
        .iter()
        .filter_map(|r| {
            let row = r.as_array()?;
            let v = at(row, cv)? as usize;
            let take = av.get(v).and_then(|x| f(x, "t")).unwrap_or(0.0);
            let ct = at(row, cct).unwrap_or(0.0);
            Some(Pool {
                v,
                nu: at(row, cnu)? as i64,
                tao: at(row, ctao).unwrap_or(0.0),
                a7: at(row, ca7),
                a30: at(row, ca30),
                ct,
                rk: at(row, crk).map(|x| x as i64),
                cfg: (1.0 - (1.0 - take) * (1.0 - ct / 100.0)) * 100.0,
                b30: None,
                k30: None,
                pr7: None,
                pr30: None,
                pr: None,
                g: None,
                badges: vec![],
            })
        })
        .collect();
    let mut by_sn: HashMap<i64, Vec<usize>> = HashMap::new();
    for (i, p) in pools.iter().enumerate() {
        by_sn.entry(p.nu).or_default().push(i);
    }
    // leave-one-out benchmark for pool i in a window
    let bench_of = |pools: &[Pool], i: usize, w30: bool| -> (Option<f64>, Option<&'static str>) {
        let p = &pools[i];
        let apy = |q: &Pool| if w30 { q.a30 } else { q.a7 };
        let peers = |min: f64| -> Vec<f64> {
            by_sn[&p.nu].iter().map(|&j| &pools[j]).filter(|q| q.v != p.v && q.tao >= min).filter_map(apy).filter(|a| *a >= MIN_EARNING).collect()
        };
        let solid = peers(100.0);
        if solid.len() >= 3 {
            return (top3_median(solid), Some("solid"));
        }
        let thin = peers(10.0);
        if thin.len() >= 3 { (top3_median(thin), Some("thin")) } else { (None, None) }
    };
    for i in 0..pools.len() {
        let (b7, _) = bench_of(&pools, i, false);
        let (b30, k30) = bench_of(&pools, i, true);
        let p = &mut pools[i];
        let pr_w = |a: Option<f64>, b: Option<f64>| match (a, b) {
            (Some(a), Some(_)) if a < MIN_EARNING => Some(0.0),
            (Some(a), Some(b)) => ratio(a, b),
            _ => None,
        };
        p.pr7 = pr_w(p.a7, b7);
        p.pr30 = pr_w(p.a30, b30);
        p.b30 = b30;
        p.k30 = k30;
        p.pr = if p.a30.is_some_and(|a| a < MIN_EARNING) {
            Some(0.0)
        } else {
            match (p.pr7, p.pr30) {
                (Some(a), Some(b)) => Some(a.min(b)),
                (_, b) => b,
            }
        };
        p.g = grade(p.pr);
        let mut b = vec![];
        if p.pr == Some(0.0) {
            b.push("Not earning");
        }
        if p.a30.is_none() && p.a7.is_some() {
            b.push("New");
        }
        if p.k30 == Some("thin") {
            b.push("Thin benchmark");
        }
        if let (Some(a), Some(c)) = (p.pr7, p.pr30)
            && a > 0.0
            && c > 0.0
            && (a - c).abs() > 0.15
        {
            b.push("Unstable");
        }
        if p.cfg >= 15.0 {
            b.push("High fee");
        }
        p.badges = b;
    }

    let vname = |v: usize| -> String {
        let x = &av[v];
        s(x, "n").filter(|n| !n.is_empty()).map(str::to_string).unwrap_or_else(|| short(s(x, "hk").unwrap_or_default()))
    };
    let subs_in = alpha.get("subnets").and_then(Value::as_array).unwrap_or(&empty);
    let sn_meta: HashMap<i64, &Value> = subs_in.iter().filter_map(|s| Some((s.get("nu")?.as_i64()?, s))).collect();
    let mut subnets: Vec<(f64, Value)> = Vec::new();
    let mut pool_rows: serde_json::Map<String, Value> = serde_json::Map::new();
    for (nu, idx) in &by_sn {
        let Some(sm) = sn_meta.get(nu) else { continue };
        let mut ps: Vec<usize> = idx.iter().copied().filter(|&i| pools[i].tao >= 10.0).collect();
        if ps.is_empty() {
            continue;
        }
        ps.sort_by(|&a, &b| pools[b].tao.total_cmp(&pools[a].tao));
        let best_pools: Vec<f64> = idx.iter().map(|&i| &pools[i]).filter(|p| p.tao >= 100.0).filter_map(|p| p.a30).filter(|a| *a >= MIN_EARNING).collect();
        let nbest = best_pools.len().min(3);
        let rows: Vec<Value> = ps
            .iter()
            .map(|&i| {
                let p = &pools[i];
                let take = f(&av[p.v], "t").unwrap_or(0.0) * 100.0;
                json!([vname(p.v), s(&av[p.v], "hk"), round(p.tao, 0), round(take, 1), round(p.ct, 1), round(p.cfg, 1), ro(p.a30, 2), ro(p.a7, 2),
                       ro(p.pr.map(|x| x * 100.0), 1), p.g, p.badges, p.rk])
            })
            .collect();
        pool_rows.insert(nu.to_string(), Value::Array(rows));
        let tao = f(sm, "tao").unwrap_or(0.0);
        subnets.push((
            tao,
            json!({
                "nu": nu, "name": s(sm, "name").map(str::to_string).unwrap_or_else(|| format!("Subnet {nu}")),
                "price": sm.get("price"), "dp7": sm.get("dp7"), "dp30": sm.get("dp30"),
                "best": ro(top3_median(best_pools), 2), "nbest": nbest, "nv": ps.len(), "net30": sm.get("r30"), "tao": tao,
            }),
        ));
    }
    subnets.sort_by(|a, b| b.0.total_cmp(&a.0));

    // ---------------- validator pages ----------------
    let root_by: HashMap<&str, &Value> = roots.iter().map(|r| (r.hk.as_str(), &r.v)).collect();
    let mut pools_by_v: HashMap<usize, Vec<usize>> = HashMap::new();
    for (i, p) in pools.iter().enumerate() {
        if p.tao >= 10.0 {
            pools_by_v.entry(p.v).or_default().push(i);
        }
    }
    // rank of each pool among graded pools ≥ 10 τ on its subnet
    let mut rank: HashMap<usize, (usize, usize)> = HashMap::new();
    for idx in by_sn.values() {
        let mut ranked: Vec<usize> = idx.iter().copied().filter(|&i| pools[i].tao >= 10.0 && pools[i].pr.is_some()).collect();
        ranked.sort_by(|&a, &b| pools[b].pr.unwrap().total_cmp(&pools[a].pr.unwrap()));
        let n = ranked.len();
        for (k, i) in ranked.into_iter().enumerate() {
            rank.insert(i, (k + 1, n));
        }
    }
    let alpha_idx: HashMap<&str, usize> = av.iter().enumerate().filter_map(|(i, x)| Some((s(x, "hk")?, i))).collect();
    let mut hks: Vec<&str> = root_by.keys().copied().collect();
    hks.extend(pools_by_v.keys().filter_map(|v| s(&av[*v], "hk")));
    hks.sort();
    hks.dedup();
    let mut details = HashMap::new();
    for hk in hks {
        let r = root_by.get(hk).copied();
        let vi = alpha_idx.get(hk).copied();
        let name = r.and_then(|r| s(r, "n")).filter(|n| !n.is_empty()).map(str::to_string).or_else(|| vi.map(vname)).unwrap_or_else(|| short(hk));
        let mut locs = vec![];
        if let Some(r) = r {
            let t = f(r, "t").unwrap_or(0.0) * 100.0;
            locs.push(json!({
                "kind": "root", "label": "Root", "a30": r.get("a30"), "a7": r.get("a7"), "pr": r.get("pr"), "g": r.get("g"), "b": r.get("b"),
                "fee": round(t, 1), "take": round(t, 1), "ck": 0, "stake": r.get("s"), "per": r.get("per"), "r30": r.get("r30"), "hit": r.get("hit"),
            }));
        }
        if let Some(vi) = vi {
            let mut ps = pools_by_v.get(&vi).cloned().unwrap_or_default();
            ps.sort_by(|&a, &b| pools[b].tao.total_cmp(&pools[a].tao));
            for i in ps {
                let p = &pools[i];
                let sm = sn_meta.get(&p.nu);
                let (rk, of) = rank.get(&i).map_or((Value::Null, Value::Null), |(a, b)| (json!(a), json!(b)));
                locs.push(json!({
                    "kind": "alpha", "nu": p.nu, "label": format!("SN{}", p.nu), "sname": sm.and_then(|s| s.get("name")),
                    "a30": ro(p.a30, 2), "a7": ro(p.a7, 2), "pr": ro(p.pr.map(|x| x * 100.0), 1),
                    "pr7": ro(p.pr7.map(|x| x * 100.0), 1), "pr30": ro(p.pr30.map(|x| x * 100.0), 1),
                    "g": p.g, "b": p.badges, "fee": round(p.cfg, 1), "take": round(f(&av[vi], "t").unwrap_or(0.0) * 100.0, 1), "ck": round(p.ct, 1),
                    "stake": round(p.tao, 0), "bench": ro(p.b30, 2), "kind30": p.k30, "rank": rk, "of": of,
                    "dp30": sm.and_then(|s| s.get("dp30")), "r30": sm.and_then(|s| s.get("r30")),
                }));
            }
        }
        details.insert(hk.to_string(), json!({ "n": name, "hk": hk, "nom": r.and_then(|r| r.get("nom")), "locs": locs }));
    }

    let choose = json!({
        "block": vals.get("block"), "ts": vals.get("ts"),
        "root": { "bench": ro(bench, 2), "rows": roots.into_iter().map(|r| r.v).collect::<Vec<_>>() },
        "subnets": subnets.into_iter().map(|x| x.1).collect::<Vec<_>>(),
        "pcols": ["n", "hk", "tao", "take", "ck", "fee", "a30", "a7", "pr", "g", "b", "rk"],
        "pools": pool_rows,
    });
    Rated { choose, details }
}
