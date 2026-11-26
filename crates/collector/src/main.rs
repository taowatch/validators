//! Collector: samples the chain every `INTERVAL_SECS` and backfills daily history.
//!
//! Each cycle:
//! 1. head: pin the latest block, read slow-changing data (baskets, takes, names, childkeys)
//!    and the big maps there, store them;
//! 2. backfill: every UTC day in the last `BACKFILL_DAYS` without a kept sample gets the
//!    maps at ≈00:30 UTC of that day from an archive node (newest days first, within a time
//!    budget so the next head sample is not delayed indefinitely);
//! 3. gaps: pools / validators that joined the tracked set after older snapshots were taken
//!    get their values at those blocks (keyed reads, cheap);
//! 4. prune: hourly samples older than `KEEP_HOURS`, everything older than `BACKFILL_DAYS`+2.
//!
//! After every successful head write the collector touches `HEARTBEAT_FILE`, which the
//! container healthcheck watches.
//!
//! `collector once` runs a single cycle and exits.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use anyhow::Result;
use tracing::{info, warn};
use vr_core::chain::{BLOCK_SECS, Pool};
use vr_core::db::{self, Kind, Tracked, utc_day};
use vr_core::{env_list, env_or};

/// Backfill targets this many seconds after UTC midnight, so every day's kept sample sits at
/// about the same time of day as the kept head samples (the first one after midnight).
const DAY_OFFSET_SECS: f64 = 1800.0;
/// A day that failed this many cycles in a row is skipped until the process restarts.
const MAX_DAY_FAILURES: u32 = 3;

struct Cfg {
    interval: u64,
    backfill_days: u32,
    min_alpha: f64,
    keep_hours: i64,
    nominators_every: u32,
    heartbeat: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with_ansi(std::io::IsTerminal::is_terminal(&std::io::stderr()))
        .init();
    let once = std::env::args().nth(1).as_deref() == Some("once");
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = db::connect(&database_url).await?;

    let mut live = Pool::new(env_list("RPC_URLS", "wss://entrypoint-finney.opentensor.ai:443"));
    let mut archive = Pool::new(env_list(
        "ARCHIVE_URLS",
        "wss://bittensor-finney.api.onfinality.io/public-ws,wss://archive.chain.opentensor.ai:443",
    ));
    let cfg = Cfg {
        interval: env_or("INTERVAL_SECS", 3600),
        backfill_days: env_or("BACKFILL_DAYS", 30),
        min_alpha: env_or("MIN_ALPHA", 100.0),
        keep_hours: env_or("KEEP_HOURS", 72),
        nominators_every: env_or("NOMINATORS_EVERY", 24),
        heartbeat: std::env::var("HEARTBEAT_FILE").unwrap_or_else(|_| "/tmp/collector.alive".into()),
    };

    let mut run = 0u32;
    let mut failures: HashMap<i64, u32> = HashMap::new();
    loop {
        let started = Instant::now();
        if let Err(e) = cycle(&pool, &mut live, &mut archive, &cfg, run, &mut failures, started).await {
            warn!(error = format!("{e:#}"), "cycle failed");
        }
        run += 1;
        if once {
            return Ok(());
        }
        let wait = Duration::from_secs(cfg.interval).saturating_sub(started.elapsed());
        info!(secs = wait.as_secs(), "sleeping until next cycle");
        tokio::time::sleep(wait).await;
    }
}

async fn cycle(
    pool: &sqlx::PgPool,
    live: &mut Pool,
    archive: &mut Pool,
    cfg: &Cfg,
    run: u32,
    failures: &mut HashMap<i64, u32>,
    started: Instant,
) -> Result<()> {
    // ---- head: meta, maps and owners all at one block ----
    let block = live.run("head", 4, |c| async move { c.head().await }).await?;
    let at = Some(block);
    let t = Instant::now();
    let with_nominators = run.is_multiple_of(cfg.nominators_every.max(1));
    let mut meta = live.run("meta", 4, |c| async move { c.meta(at, with_nominators).await }).await?;
    info!(block, baskets = meta.baskets.len(), delegates = meta.take.len(), nominators = meta.nominators.is_some(), secs = t.elapsed().as_secs(), "meta read");

    let t = Instant::now();
    let maps = live.run("maps@head", 4, |c| async move { c.maps(at).await }).await?;
    let tracked = Tracked::from_head(&maps, &meta, cfg.min_alpha);
    info!(block, pools = tracked.pairs.len(), root = tracked.root.len(), secs = t.elapsed().as_secs(), "head maps read");

    let mut hotkeys: Vec<_> = tracked.pairs.iter().map(|(h, _)| *h).chain(tracked.root.iter().copied()).chain(meta.baskets.iter().map(|b| b.hotkey)).collect();
    hotkeys.sort();
    hotkeys.dedup();
    let hk = &hotkeys;
    meta.owner = live.run("owners", 4, |c| async move { c.owners(at, hk).await }).await?;

    db::write_meta(pool, block, &meta, &tracked).await?;
    db::write_samples(pool, &maps, Kind::Head, &tracked).await?;
    let head_ts = maps.ts_ms as f64 / 1000.0;
    drop(maps);
    drop(meta);
    if let Err(e) = std::fs::write(&cfg.heartbeat, block.to_string()) {
        warn!(path = %cfg.heartbeat, error = %e, "heartbeat write failed");
    }

    // ---- backfill: one kept sample per UTC day, newest first ----
    // The budget keeps a long first backfill from starving the hourly head sample: whatever
    // is left continues right after the next head sample.
    let budget = Duration::from_secs(cfg.interval);
    let block_at = |ts: f64| -> u32 { (block as f64 - ((head_ts - ts) / BLOCK_SECS).round()).max(1.0) as u32 };
    let today = utc_day(head_ts);
    let have = db::kept_days(pool).await?;
    for d in 1..=cfg.backfill_days as i64 {
        let day = today - d;
        if have.contains(&day) || failures.get(&day).copied().unwrap_or(0) >= MAX_DAY_FAILURES {
            continue;
        }
        if started.elapsed() > budget {
            info!(next_day = d, "backfill budget used; continuing next cycle");
            break;
        }
        let b = block_at(day as f64 * 86400.0 + DAY_OFFSET_SECS);
        let t = Instant::now();
        match archive.run("maps@history", 3, |c| async move { c.maps(Some(b)).await }).await {
            Ok(m) => {
                db::write_samples(pool, &m, Kind::Daily(day), &tracked).await?;
                failures.remove(&day);
                info!(day = d, block = b, secs = t.elapsed().as_secs(), "backfilled");
            }
            Err(e) => {
                let n = failures.entry(day).or_default();
                *n += 1;
                warn!(day = d, block = b, failures = *n, error = format!("{e:#}"), "backfill failed");
            }
        }
    }

    // On a fresh start there are no hourly samples yet; one exact point 24h back keeps the
    // 1D window honest until they accumulate.
    let snaps = db::snapshots(pool).await?;
    let target = head_ts - 86400.0;
    if cfg.backfill_days >= 1 && !snaps.iter().any(|(_, ts)| (ts - target).abs() < 3.0 * 3600.0) && started.elapsed() < budget {
        let b = block_at(target);
        match archive.run("maps@1d", 3, |c| async move { c.maps(Some(b)).await }).await {
            Ok(m) => {
                db::write_samples(pool, &m, Kind::Extra, &tracked).await?;
                info!(block = b, "stored 24h point");
            }
            Err(e) => warn!(block = b, error = format!("{e:#}"), "24h point failed"),
        }
    }

    // ---- gaps: history for pools / validators new to the tracked set ----
    let gaps = db::gaps(pool, block).await?;
    if !gaps.is_empty() {
        let t = Instant::now();
        let (mut filled, mut rows) = (0, 0);
        for g in &gaps {
            if started.elapsed() > budget {
                break;
            }
            let (pairs, root) = (&g.pairs, &g.root);
            match archive.run("gap", 2, |c| async move { c.some_at(g.block, pairs, root).await }).await {
                Ok(m) => {
                    db::fill_gap(pool, &m, g).await?;
                    filled += 1;
                    rows += g.pairs.len() + g.root.len();
                }
                Err(e) => warn!(block = g.block, error = format!("{e:#}"), "gap fill failed"),
            }
        }
        info!(snapshots = filled, of = gaps.len(), rows, secs = t.elapsed().as_secs(), "filled history gaps");
    }

    let pruned = db::prune(pool, cfg.keep_hours, cfg.backfill_days as i64 + 2).await?;
    if pruned > 0 {
        info!(pruned, "pruned old snapshots");
    }
    Ok(())
}
