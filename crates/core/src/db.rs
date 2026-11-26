//! Postgres storage. Samples are written in bulk with UNNEST so one snapshot
//! (≈5k alpha pools + ≈500 root rows) is a handful of statements.

use std::collections::HashSet;

use anyhow::{Context, Result};
use serde_json::json;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use subxt::utils::AccountId32;

use crate::chain::{Acc, Maps, Meta};

pub fn ss58(a: &Acc) -> String {
    AccountId32(*a).to_string()
}

pub async fn connect(url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new().max_connections(8).connect(url).await.context("connect database")?;
    let mut migrator = sqlx::migrate!("../../migrations");
    // An older image must still start against a database a newer image migrated (rollback):
    // migrations are additive, so unknown applied versions are fine.
    migrator.set_ignore_missing(true);
    migrator.run(&pool).await.context("run migrations")?;
    Ok(pool)
}

/// Bump the data version inside a write transaction; the API recomputes when it changes.
async fn bump(tx: &mut sqlx::PgConnection) -> Result<()> {
    sqlx::query("UPDATE meta SET value = value + 1 WHERE key = 'data_version'").execute(&mut *tx).await?;
    Ok(())
}

/// Current data version (see [`bump`]).
pub async fn data_version(pool: &PgPool) -> Result<i64> {
    Ok(sqlx::query_scalar::<_, i64>("SELECT value FROM meta WHERE key = 'data_version'").fetch_optional(pool).await?.unwrap_or(0))
}

fn ts_of(ms: u64) -> f64 {
    ms as f64 / 1000.0
}

/// Which pools and root hotkeys the collector tracks; fixed at each head run and reused
/// for backfill so history lines up with the current set. Pools that join the set later get
/// their history filled by [`gaps`] / [`fill_gap`].
#[derive(Debug, Default, Clone)]
pub struct Tracked {
    pub pairs: HashSet<(Acc, u16)>,
    pub root: HashSet<Acc>,
}

impl Tracked {
    /// Alpha pools of delegate hotkeys holding at least `min_alpha` (whole alpha), and every
    /// hotkey that has a basket rate.
    pub fn from_head(maps: &Maps, meta: &Meta, min_alpha: f64) -> Self {
        let min_rao = (min_alpha * 1e9) as u64;
        let pairs = maps
            .hotkey_alpha
            .iter()
            .filter(|((hk, nu), a)| *nu != 0 && **a >= min_rao && meta.take.contains_key(hk))
            .map(|(k, _)| *k)
            .collect();
        let root = maps.basket_rate.keys().copied().collect();
        Self { pairs, root }
    }
}

/// What a stored snapshot stands for.
#[derive(Debug, Clone, Copy)]
pub enum Kind {
    /// Hourly head sample; also the day's kept sample if that UTC day has none yet.
    Head,
    /// Backfilled sample kept for this UTC day (days since the unix epoch).
    Daily(i64),
    /// Extra backfilled point (e.g. 24h before head on a fresh start); pruned like hourly ones.
    Extra,
}

/// UTC day number (days since 1970-01-01) of a unix timestamp in seconds.
pub fn utc_day(ts: f64) -> i64 {
    (ts / 86400.0).floor() as i64
}

/// Insert one snapshot's samples. Returns false when that block was already stored.
pub async fn write_samples(pool: &PgPool, maps: &Maps, kind: Kind, tracked: &Tracked) -> Result<bool> {
    let ts = ts_of(maps.ts_ms);
    let (label, day) = match kind {
        Kind::Head => ("head", utc_day(ts)),
        Kind::Daily(d) => ("backfill", d),
        Kind::Extra => ("extra", utc_day(ts)),
    };
    let mut tx = pool.begin().await?;
    let inserted = sqlx::query(
        "INSERT INTO snapshot (block, ts, kind, day, keep_daily)
         SELECT $1, to_timestamp($2), $3, date '1970-01-01' + $4::int,
                CASE $3 WHEN 'backfill' THEN true
                        WHEN 'head' THEN NOT EXISTS (SELECT 1 FROM snapshot WHERE keep_daily AND day = date '1970-01-01' + $4::int)
                        ELSE false END
         ON CONFLICT DO NOTHING",
    )
    .bind(maps.block as i64)
    .bind(ts)
    .bind(label)
    .bind(day as i32)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if inserted == 0 {
        return Ok(false);
    }
    let pairs: Vec<(Acc, u16)> = tracked.pairs.iter().copied().collect();
    let root: Vec<Acc> = tracked.root.iter().copied().collect();
    insert_rows(&mut tx, maps, &pairs, &root).await?;

    // subnet reserves
    let (mut nu, mut tao, mut ain) = (vec![], vec![], vec![]);
    for (n, t) in &maps.subnet_tao {
        nu.push(*n as i32);
        tao.push(*t as f64);
        ain.push(maps.subnet_alpha_in.get(n).copied().unwrap_or(0) as f64);
    }
    sqlx::query(
        "INSERT INTO subnet_sample (block, netuid, tao, alpha_in)
         SELECT $1, n, t, a FROM UNNEST($2::int4[], $3::float8[], $4::float8[]) AS x(n, t, a)",
    )
    .bind(maps.block as i64)
    .bind(&nu)
    .bind(&tao)
    .bind(&ain)
    .execute(&mut *tx)
    .await?;

    bump(&mut tx).await?;
    tx.commit().await?;
    Ok(true)
}

/// Root and alpha rows of `maps.block` for the given hotkeys / pools. A pool absent at that
/// block is stored with alpha 0 and no pps (and a hotkey without a basket rate with a NULL
/// rate) so it reads as "known missing" rather than "not fetched yet".
async fn insert_rows(tx: &mut sqlx::PgConnection, maps: &Maps, pairs: &[(Acc, u16)], root: &[Acc]) -> Result<()> {
    let (mut hk, mut bits, mut stake) = (vec![], vec![], vec![]);
    for h in root {
        hk.push(ss58(h));
        bits.push(maps.basket_rate.get(h).map(|b| b.to_string()));
        stake.push(maps.hotkey_alpha.get(&(*h, 0)).copied().unwrap_or(0) as f64 / 1e9);
    }
    sqlx::query(
        "INSERT INTO root_sample (block, hotkey, rate_bits, root_stake)
         SELECT $1, h, b::numeric, s FROM UNNEST($2::text[], $3::text[], $4::float8[]) AS t(h, b, s)
         ON CONFLICT DO NOTHING",
    )
    .bind(maps.block as i64)
    .bind(&hk)
    .bind(&bits)
    .bind(&stake)
    .execute(&mut *tx)
    .await?;

    let (mut hk, mut nu, mut alpha, mut pps, mut epoch) = (vec![], vec![], vec![], vec![], vec![]);
    for key in pairs {
        let a = maps.hotkey_alpha.get(key).copied().unwrap_or(0);
        let sh = maps.shares.get(key).copied().unwrap_or(0.0);
        hk.push(ss58(&key.0));
        nu.push(key.1 as i32);
        alpha.push(a as f64 / 1e9);
        pps.push(if sh > 0.0 && a > 0 { Some(a as f64 / sh) } else { None });
        epoch.push(maps.epochs.get(key).map(|e| *e as i64).unwrap_or(0));
    }
    sqlx::query(
        "INSERT INTO alpha_sample (block, hotkey, netuid, alpha, pps, epoch)
         SELECT $1, h, n, a, p, e FROM UNNEST($2::text[], $3::int4[], $4::float8[], $5::float8[], $6::int8[]) AS t(h, n, a, p, e)
         ON CONFLICT DO NOTHING",
    )
    .bind(maps.block as i64)
    .bind(&hk)
    .bind(&nu)
    .bind(&alpha)
    .bind(&pps)
    .bind(&epoch)
    .execute(&mut *tx)
    .await?;
    Ok(())
}

/// Pools and root hotkeys stored at `head` that some older snapshot has no row for: they
/// joined the tracked set after that snapshot was taken. Grouped by block.
pub struct Gap {
    pub block: u32,
    pub pairs: Vec<(Acc, u16)>,
    pub root: Vec<Acc>,
}

pub async fn gaps(pool: &PgPool, head: u32) -> Result<Vec<Gap>> {
    let alpha = sqlx::query_as::<_, (i64, String, i32)>(
        "SELECT s.block, a.hotkey, a.netuid FROM snapshot s JOIN alpha_sample a ON a.block = $1
         WHERE s.block <> $1 AND NOT EXISTS (
             SELECT 1 FROM alpha_sample x WHERE x.block = s.block AND x.hotkey = a.hotkey AND x.netuid = a.netuid)",
    )
    .bind(head as i64)
    .fetch_all(pool)
    .await?;
    let root = sqlx::query_as::<_, (i64, String)>(
        "SELECT s.block, r.hotkey FROM snapshot s JOIN root_sample r ON r.block = $1
         WHERE s.block <> $1 AND NOT EXISTS (SELECT 1 FROM root_sample x WHERE x.block = s.block AND x.hotkey = r.hotkey)",
    )
    .bind(head as i64)
    .fetch_all(pool)
    .await?;
    let mut by: std::collections::BTreeMap<i64, Gap> = Default::default();
    let gap = |b: i64| Gap { block: b as u32, pairs: vec![], root: vec![] };
    for (b, h, n) in alpha {
        if let Ok(a) = h.parse::<AccountId32>() {
            by.entry(b).or_insert_with(|| gap(b)).pairs.push((a.0, n as u16));
        }
    }
    for (b, h) in root {
        if let Ok(a) = h.parse::<AccountId32>() {
            by.entry(b).or_insert_with(|| gap(b)).root.push(a.0);
        }
    }
    Ok(by.into_values().rev().collect())
}

/// Store the rows fetched for a [`Gap`].
pub async fn fill_gap(pool: &PgPool, maps: &Maps, g: &Gap) -> Result<()> {
    let mut tx = pool.begin().await?;
    insert_rows(&mut tx, maps, &g.pairs, &g.root).await?;
    bump(&mut tx).await?;
    tx.commit().await?;
    Ok(())
}

/// Overwrite the latest-state tables from a head run.
pub async fn write_meta(pool: &PgPool, block: u32, meta: &Meta, tracked: &Tracked) -> Result<()> {
    let mut tx = pool.begin().await?;
    let mut hotkeys: HashSet<Acc> = tracked.pairs.iter().map(|(h, _)| *h).collect();
    hotkeys.extend(tracked.root.iter().copied());
    hotkeys.extend(meta.baskets.iter().map(|b| b.hotkey));

    let basket = |h: &Acc| meta.baskets.iter().find(|b| &b.hotkey == h);
    #[derive(Default)]
    struct Cols {
        hk: Vec<String>,
        ck: Vec<Option<String>>,
        name: Vec<Option<String>>,
        image: Vec<Option<String>>,
        take: Vec<f64>,
        nom: Vec<Option<i32>>,
        has: Vec<bool>,
        nav: Vec<Option<f64>>,
        snav: Vec<Option<f64>>,
        shares: Vec<Option<f64>>,
        dep: Vec<Option<f64>>,
        red: Vec<Option<f64>>,
        hold: Vec<Option<serde_json::Value>>,
    }
    let mut c = Cols::default();
    for h in &hotkeys {
        let ck = meta.owner.get(h);
        let b = basket(h);
        c.hk.push(ss58(h));
        c.ck.push(ck.map(ss58));
        c.name.push(ck.and_then(|k| meta.identity.get(k)).cloned());
        c.image.push(ck.and_then(|k| meta.identity_image.get(k)).cloned());
        c.take.push(meta.take.get(h).copied().unwrap_or(0.0));
        c.nom.push(meta.nominators.as_ref().and_then(|m| m.get(h)).map(|n| *n as i32));
        c.has.push(b.is_some_and(|b| b.shares > 0));
        c.nav.push(b.map(|b| b.nav as f64));
        c.snav.push(b.map(|b| b.spot_nav as f64));
        c.shares.push(b.map(|b| b.shares as f64));
        c.dep.push(b.map(|b| b.deposited as f64));
        c.red.push(b.map(|b| b.redeemed as f64));
        c.hold.push(b.map(|b| json!(b.holdings.iter().map(|x| json!([x.netuid, x.alpha, x.spot_tao, x.realizable_tao])).collect::<Vec<_>>())));
    }
    sqlx::query(
        "INSERT INTO validator (hotkey, coldkey, name, take, nominators, has_basket, nav, spot_nav, shares, deposited, redeemed, holdings, image, block, updated_at)
         SELECT *, $14, now() FROM UNNEST($1::text[], $2::text[], $3::text[], $4::float8[], $5::int4[], $6::bool[],
                                         $7::float8[], $8::float8[], $9::float8[], $10::float8[], $11::float8[], $12::jsonb[], $13::text[])
         ON CONFLICT (hotkey) DO UPDATE SET
           coldkey = EXCLUDED.coldkey, name = EXCLUDED.name, take = EXCLUDED.take, image = EXCLUDED.image,
           nominators = COALESCE(EXCLUDED.nominators, validator.nominators),
           has_basket = EXCLUDED.has_basket, nav = EXCLUDED.nav, spot_nav = EXCLUDED.spot_nav, shares = EXCLUDED.shares,
           deposited = EXCLUDED.deposited, redeemed = EXCLUDED.redeemed, holdings = EXCLUDED.holdings,
           block = EXCLUDED.block, updated_at = now()",
    )
    .bind(&c.hk)
    .bind(&c.ck)
    .bind(&c.name)
    .bind(&c.take)
    .bind(&c.nom)
    .bind(&c.has)
    .bind(&c.nav)
    .bind(&c.snav)
    .bind(&c.shares)
    .bind(&c.dep)
    .bind(&c.red)
    .bind(&c.hold)
    .bind(&c.image)
    .bind(block as i64)
    .execute(&mut *tx)
    .await?;
    // validators that dropped out of every set lose their basket flag
    sqlx::query("UPDATE validator SET has_basket = false WHERE block < $1").bind(block as i64).execute(&mut *tx).await?;

    let mut nets: Vec<u16> = meta.subnet_names.keys().chain(meta.subnet_logos.keys()).copied().collect();
    nets.sort();
    nets.dedup();
    let nu: Vec<i32> = nets.iter().map(|n| *n as i32).collect();
    let names: Vec<Option<String>> = nets.iter().map(|n| meta.subnet_names.get(n).cloned()).collect();
    let logos: Vec<Option<String>> = nets.iter().map(|n| meta.subnet_logos.get(n).cloned()).collect();
    sqlx::query(
        "INSERT INTO subnet (netuid, name, logo) SELECT * FROM UNNEST($1::int4[], $2::text[], $3::text[])
         ON CONFLICT (netuid) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo",
    )
    .bind(&nu)
    .bind(&names)
    .bind(&logos)
    .execute(&mut *tx)
    .await?;
    // subnets whose identity was removed on chain lose their stale name and logo
    sqlx::query("UPDATE subnet SET name = NULL, logo = NULL WHERE NOT (netuid = ANY($1)) AND (name IS NOT NULL OR logo IS NOT NULL)")
        .bind(&nu)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM childkey").execute(&mut *tx).await?;
    let (mut hk, mut nu, mut ch) = (vec![], vec![], vec![]);
    for key in &tracked.pairs {
        let Some(kids) = meta.children.get(key) else { continue };
        if kids.is_empty() {
            continue;
        }
        let arr: Vec<_> = kids
            .iter()
            .map(|(p, c)| json!([p, ss58(c), meta.childkey_take.get(&(*c, key.1)).copied().unwrap_or(0.0)]))
            .collect();
        hk.push(ss58(&key.0));
        nu.push(key.1 as i32);
        ch.push(json!(arr));
    }
    sqlx::query(
        "INSERT INTO childkey (hotkey, netuid, children)
         SELECT h, n, c FROM UNNEST($1::text[], $2::int4[], $3::jsonb[]) AS t(h, n, c)",
    )
    .bind(&hk)
    .bind(&nu)
    .bind(&ch)
    .execute(&mut *tx)
    .await?;

    bump(&mut tx).await?;
    tx.commit().await?;
    Ok(())
}

/// Drop hourly snapshots older than `keep_hours` (the day's kept sample stays) and every
/// snapshot older than `keep_days`.
pub async fn prune(pool: &PgPool, keep_hours: i64, keep_days: i64) -> Result<u64> {
    let mut tx = pool.begin().await?;
    let n = sqlx::query(
        "DELETE FROM snapshot
         WHERE (NOT keep_daily AND ts < now() - make_interval(hours => $1::int))
            OR ts < now() - make_interval(days => $2::int)",
    )
    .bind(keep_hours as i32)
    .bind(keep_days as i32)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if n > 0 {
        bump(&mut tx).await?;
    }
    tx.commit().await?;
    Ok(n)
}

/// Make an already stored snapshot the kept sample of `day` (when that day has none), e.g.
/// when a backfill target block was stored earlier as an extra or hourly sample.
/// Returns whether it was promoted.
pub async fn keep_for_day(pool: &PgPool, block: u32, day: i64) -> Result<bool> {
    let mut tx = pool.begin().await?;
    let n = sqlx::query(
        "UPDATE snapshot SET keep_daily = true, day = date '1970-01-01' + $2::int
         WHERE block = $1 AND NOT keep_daily
           AND NOT EXISTS (SELECT 1 FROM snapshot WHERE keep_daily AND day = date '1970-01-01' + $2::int)",
    )
    .bind(block as i64)
    .bind(day as i32)
    .execute(&mut *tx)
    .await?
    .rows_affected();
    if n > 0 {
        bump(&mut tx).await?;
    }
    tx.commit().await?;
    Ok(n > 0)
}

/// UTC days that already have their kept sample.
pub async fn kept_days(pool: &PgPool) -> Result<HashSet<i64>> {
    Ok(sqlx::query_scalar::<_, i32>("SELECT (day - date '1970-01-01') FROM snapshot WHERE keep_daily").fetch_all(pool).await?.into_iter().map(i64::from).collect())
}

/// (block, unix seconds) of every stored snapshot, oldest first.
pub async fn snapshots<'e, E: sqlx::PgExecutor<'e>>(e: E) -> Result<Vec<(i64, f64)>> {
    Ok(sqlx::query_as::<_, (i64, f64)>("SELECT block, extract(epoch FROM ts)::float8 FROM snapshot ORDER BY block").fetch_all(e).await?)
}
