//! Subtensor reads for the validator ranking.
//!
//! Verified against finney mainnet (November 2026):
//! - Subtensor nodes reject subxt's default `chainHead_v1` RPCs → always [`LegacyBackend`].
//! - Whole maps are read with `state_getKeysPaged` + `state_queryStorageAt` in pages of
//!   [`PAGE_SIZE`]; `TotalHotkeyAlpha` (≈44k entries) then costs ≈90 requests, not 44k.
//! - `BasketRate.bits` is a fixed-point number scaled by 2^32 (checked against
//!   `get_basket_position` on a real position).
//! - `TotalHotkeySharesV2` is a SafeFloat `mantissa × 10^exponent`.
//! - `TotalHotkeyAlpha(hk, 0)` is the hotkey's root stake.

use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use futures::StreamExt;
use subxt::backend::LegacyBackend;
use subxt::dynamic;
use subxt::ext::frame_decode::storage::{IntoDecodableValues, IntoEncodableValues};
use subxt::storage::PrefixOf;
use subxt::{OnlineClient, OnlineClientAtBlock, SubstrateConfig};

pub type Acc = [u8; 32];
type At = OnlineClientAtBlock<SubstrateConfig>;

/// Keys per `state_getKeysPaged` page (and values per `state_queryStorageAt`).
pub const PAGE_SIZE: u32 = 1000;
pub const BLOCKS_PER_DAY: u32 = 7200;
/// Target block time; used to estimate the block at a timestamp.
pub const BLOCK_SECS: f64 = 12.0;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(60);
/// Longest single chain call (a full map read at an old block takes ≈2–4 min).
const CALL_TIMEOUT: Duration = Duration::from_secs(15 * 60);

// ---------- on-chain layouts (fields not listed are ignored by scale-decode) ----------

#[derive(Debug, scale_decode::DecodeAsType)]
struct FixedBits {
    bits: u128,
}

#[derive(Debug, scale_decode::DecodeAsType)]
struct SafeFloat {
    mantissa: u128,
    exponent: i64,
}

#[derive(Debug, scale_decode::DecodeAsType)]
struct RawHolding {
    netuid: u16,
    alpha: u64,
    spot_tao: u64,
    realizable_tao: u64,
}

#[derive(Debug, scale_decode::DecodeAsType)]
struct RawBasket {
    hotkey: Acc,
    nav_tao: u64,
    spot_nav_tao: u64,
    shares: u128,
    deposited_tao: u64,
    redeemed_tao: u64,
    holdings: Vec<RawHolding>,
}

#[derive(Debug, scale_decode::DecodeAsType)]
struct RawIdentity {
    name: Vec<u8>,
    image: Vec<u8>,
}

#[derive(Debug, scale_decode::DecodeAsType)]
struct RawSubnetIdentity {
    subnet_name: Vec<u8>,
    logo_url: Vec<u8>,
}

#[derive(scale_decode::DecodeAsType)]
struct RawDelegateInfo {
    delegate_ss58: Acc,
    nominators: Vec<scale_value::Value>,
}

// ---------- public data ----------

#[derive(Debug, Clone)]
pub struct Holding {
    pub netuid: u16,
    pub alpha: u64,
    pub spot_tao: u64,
    pub realizable_tao: u64,
}

#[derive(Debug, Clone)]
pub struct Basket {
    pub hotkey: Acc,
    pub nav: u64,
    pub spot_nav: u64,
    pub shares: u128,
    pub deposited: u64,
    pub redeemed: u64,
    pub holdings: Vec<Holding>,
}

/// The large per-block maps: everything APY math needs. Read at head and at backfill points.
#[derive(Debug, Default)]
pub struct Maps {
    pub block: u32,
    pub ts_ms: u64,
    /// `TotalHotkeyAlpha` (hotkey, netuid) → rao. netuid 0 = root stake.
    pub hotkey_alpha: HashMap<(Acc, u16), u64>,
    /// `TotalHotkeySharesV2` as f64.
    pub shares: HashMap<(Acc, u16), f64>,
    /// `AlphaSharePoolEpoch`: changes when a pool is reset; APY across a change is undefined.
    pub epochs: HashMap<(Acc, u16), u64>,
    /// `BasketRate.bits` (÷ 2^32 = shares per rao of root stake).
    pub basket_rate: HashMap<Acc, u128>,
    pub subnet_tao: HashMap<u16, u64>,
    pub subnet_alpha_in: HashMap<u16, u64>,
}

/// Slow-changing data, read at head only.
#[derive(Debug, Default)]
pub struct Meta {
    pub baskets: Vec<Basket>,
    /// `Delegates` take, 0..1.
    pub take: HashMap<Acc, f64>,
    pub owner: HashMap<Acc, Acc>,
    pub identity: HashMap<Acc, String>,
    /// `IdentitiesV2.image` per coldkey: an image URL (https only, see [`image_url`]).
    pub identity_image: HashMap<Acc, String>,
    pub subnet_names: HashMap<u16, String>,
    /// `SubnetIdentitiesV3.logo_url` (https only).
    pub subnet_logos: HashMap<u16, String>,
    /// `ChildKeys(parent, netuid)` → [(proportion 0..1, child)].
    pub children: HashMap<(Acc, u16), Vec<(f64, Acc)>>,
    /// `ChildkeyTake(hotkey, netuid)`, 0..1.
    pub childkey_take: HashMap<(Acc, u16), f64>,
    /// Nominator count per delegate; `None` when skipped.
    pub nominators: Option<HashMap<Acc, u32>>,
}

#[derive(Clone)]
pub struct Chain {
    api: OnlineClient<SubstrateConfig>,
    rpc: subxt_rpcs::RpcClient,
    pub url: String,
}

impl Chain {
    pub async fn connect(url: &str) -> Result<Self> {
        let rpc = subxt_rpcs::RpcClient::from_url(url).await.with_context(|| format!("connect {url}"))?;
        let backend = LegacyBackend::<SubstrateConfig>::builder().storage_page_size(PAGE_SIZE).build(rpc.clone());
        let api = OnlineClient::<SubstrateConfig>::from_backend(Arc::new(backend)).await?;
        Ok(Self { api, rpc, url: url.to_string() })
    }

    /// `Owner(hotkey)` for the given hotkeys at head. The full map holds every hotkey ever
    /// registered (too large to iterate), so these are fetched by key in batches.
    pub async fn owners(&self, block: Option<u32>, hotkeys: &[Acc]) -> Result<HashMap<Acc, Acc>> {
        let at = self.at(block).await?;
        let keys: Vec<(Acc,)> = hotkeys.iter().map(|h| (*h,)).collect();
        let got = fetch_many::<(Acc,), Acc>(&at, &self.rpc, "Owner", &keys).await?;
        Ok(got.into_iter().filter_map(|((h,), v)| v.map(|v| (h, v))).collect())
    }

    /// `Timestamp.Now` (ms) at `block`: a single cheap read, used to correct block estimates.
    pub async fn timestamp(&self, block: u32) -> Result<u64> {
        let at = self.at(Some(block)).await?;
        Ok(at.storage().fetch(dynamic::storage::<(), u64>("Timestamp", "Now"), ()).await?.decode()?)
    }

    /// Latest block number. Head reads are pinned to it so meta, maps and owners agree.
    pub async fn head(&self) -> Result<u32> {
        Ok(self.api.at_current_block().await?.block_number() as u32)
    }

    async fn at(&self, block: Option<u32>) -> Result<At> {
        Ok(match block {
            None => self.api.at_current_block().await?,
            Some(n) => self.api.at_block(n).await?,
        })
    }

    /// Read the big maps at `block` (head when `None`).
    pub async fn maps(&self, block: Option<u32>) -> Result<Maps> {
        let at = self.at(block).await?;
        let block = at.block_number() as u32;
        let ts_ms: u64 = at.storage().fetch(dynamic::storage::<(), u64>("Timestamp", "Now"), ()).await?.decode()?;
        let (alpha, shares, epochs, rate, tao, ain) = tokio::try_join!(
            iter_map::<(Acc, u16), u64>(&at, "TotalHotkeyAlpha"),
            iter_map::<(Acc, u16), SafeFloat>(&at, "TotalHotkeySharesV2"),
            iter_map::<(Acc, u16), u64>(&at, "AlphaSharePoolEpoch"),
            iter_map::<(Acc,), FixedBits>(&at, "BasketRate"),
            iter_map::<(u16,), u64>(&at, "SubnetTAO"),
            iter_map::<(u16,), u64>(&at, "SubnetAlphaIn"),
        )?;
        Ok(Maps {
            block,
            ts_ms,
            hotkey_alpha: alpha.into_iter().collect(),
            shares: shares.into_iter().map(|(k, v)| (k, v.mantissa as f64 * 10f64.powi(v.exponent as i32))).collect(),
            epochs: epochs.into_iter().collect(),
            basket_rate: rate.into_iter().map(|((k,), v)| (k, v.bits)).collect(),
            subnet_tao: tao.into_iter().map(|((k,), v)| (k, v)).collect(),
            subnet_alpha_in: ain.into_iter().map(|((k,), v)| (k, v)).collect(),
        })
    }

    /// Timestamp and the per-pool / per-hotkey values of a few keys at `block`: used to fill
    /// history for pools and validators that joined the tracked set after a day was stored.
    pub async fn some_at(&self, block: u32, pairs: &[(Acc, u16)], root: &[Acc]) -> Result<Maps> {
        let at = self.at(Some(block)).await?;
        let ts_ms: u64 = at.storage().fetch(dynamic::storage::<(), u64>("Timestamp", "Now"), ()).await?.decode()?;
        let mut alpha_keys: Vec<(Acc, u16)> = pairs.to_vec();
        alpha_keys.extend(root.iter().map(|h| (*h, 0u16)));
        let rk: Vec<(Acc,)> = root.iter().map(|h| (*h,)).collect();
        let (alpha, shares, epochs, rate) = tokio::try_join!(
            fetch_many::<(Acc, u16), u64>(&at, &self.rpc, "TotalHotkeyAlpha", &alpha_keys),
            fetch_many::<(Acc, u16), SafeFloat>(&at, &self.rpc, "TotalHotkeySharesV2", pairs),
            fetch_many::<(Acc, u16), u64>(&at, &self.rpc, "AlphaSharePoolEpoch", pairs),
            fetch_many::<(Acc,), FixedBits>(&at, &self.rpc, "BasketRate", &rk),
        )?;
        Ok(Maps {
            block,
            ts_ms,
            hotkey_alpha: alpha.into_iter().filter_map(|(k, v)| Some((k, v?))).collect(),
            shares: shares.into_iter().filter_map(|(k, v)| v.map(|v| (k, v.mantissa as f64 * 10f64.powi(v.exponent as i32)))).collect(),
            epochs: epochs.into_iter().filter_map(|(k, v)| Some((k, v?))).collect(),
            basket_rate: rate.into_iter().filter_map(|((k,), v)| v.map(|v| (k, v.bits))).collect(),
            ..Default::default()
        })
    }

    /// Read the slow-changing data at `block` (head when `None`).
    pub async fn meta(&self, block: Option<u32>, with_nominators: bool) -> Result<Meta> {
        let at = self.at(block).await?;
        tracing::info!(block = at.block_number(), "meta: reading baskets");
        let baskets: Vec<RawBasket> = at
            .runtime_apis()
            .call(dynamic::runtime_api_call::<_, Vec<RawBasket>>("BetaBasketRuntimeApi", "get_all_validator_baskets", ()))
            .await
            .context("BetaBasketRuntimeApi.get_all_validator_baskets")?;
        let (take, ident, subnets, children, ctake) = tokio::try_join!(
            iter_map::<(Acc,), u16>(&at, "Delegates"),
            iter_map::<(Acc,), RawIdentity>(&at, "IdentitiesV2"),
            iter_map::<(u16,), RawSubnetIdentity>(&at, "SubnetIdentitiesV3"),
            iter_map::<(Acc, u16), Vec<(u64, Acc)>>(&at, "ChildKeys"),
            iter_map::<(Acc, u16), u16>(&at, "ChildkeyTake"),
        )?;
        // `get_delegates` returns every delegate with every nominator: larger than the RPC
        // message limit. Ask per basket validator instead.
        let nominators = if with_nominators {
            let hks: Vec<Acc> = baskets.iter().map(|b| b.hotkey).collect();
            let at = &at;
            let counts: Vec<Option<(Acc, u32)>> = futures::stream::iter(hks)
                .map(|hk| async move {
                    match at
                        .runtime_apis()
                        .call(dynamic::runtime_api_call::<_, Option<RawDelegateInfo>>("DelegateInfoRuntimeApi", "get_delegate", (hk,)))
                        .await
                    {
                        Ok(Some(d)) => Some((d.delegate_ss58, d.nominators.len() as u32)),
                        Ok(None) => None,
                        Err(e) => {
                            tracing::warn!("get_delegate failed: {e}");
                            None
                        }
                    }
                })
                .buffer_unordered(8)
                .collect()
                .await;
            Some(counts.into_iter().flatten().collect())
        } else {
            None
        };
        Ok(Meta {
            baskets: baskets
                .into_iter()
                .map(|b| Basket {
                    hotkey: b.hotkey,
                    nav: b.nav_tao,
                    spot_nav: b.spot_nav_tao,
                    shares: b.shares,
                    deposited: b.deposited_tao,
                    redeemed: b.redeemed_tao,
                    holdings: b
                        .holdings
                        .into_iter()
                        .map(|h| Holding { netuid: h.netuid, alpha: h.alpha, spot_tao: h.spot_tao, realizable_tao: h.realizable_tao })
                        .collect(),
                })
                .collect(),
            take: take.into_iter().map(|((k,), v)| (k, v as f64 / 65535.0)).collect(),
            owner: HashMap::new(), // filled by `Chain::owners` once the tracked set is known
            identity_image: ident.iter().filter_map(|((k,), v)| Some((*k, image_url(&v.image)?))).collect(),
            identity: ident.into_iter().map(|((k,), v)| (k, clean(&v.name))).filter(|(_, n)| !n.is_empty()).collect(),
            subnet_logos: subnets.iter().filter_map(|((k,), v)| Some((*k, image_url(&v.logo_url)?))).collect(),
            subnet_names: subnets.into_iter().map(|((k,), v)| (k, clean(&v.subnet_name))).filter(|(_, n)| !n.is_empty()).collect(),
            children: children
                .into_iter()
                .map(|(k, v)| (k, v.into_iter().map(|(p, c)| (p as f64 / 18446744073709551616.0, c)).collect()))
                .collect(),
            childkey_take: ctake.into_iter().map(|(k, v)| (k, v as f64 / 65535.0)).collect(),
            nominators,
        })
    }
}

/// An identity image URL fit to put in an `<img src>`: https, no whitespace or quotes, ≤ 512 chars.
/// Anything else (http, ipfs://, data:, javascript:, free text) is dropped.
fn image_url(b: &[u8]) -> Option<String> {
    let u = String::from_utf8_lossy(b).trim().to_string();
    let ok = u.len() <= 512
        && u.get(..8).is_some_and(|p| p.eq_ignore_ascii_case("https://"))
        && u.len() > 8
        && !u.chars().any(|c| c.is_whitespace() || c.is_control() || matches!(c, '"' | '\'' | '<' | '>' | '\\' | '`'));
    ok.then_some(u)
}

fn clean(b: &[u8]) -> String {
    String::from_utf8_lossy(b).trim().chars().filter(|c| !c.is_control()).collect()
}

/// Every entry of a `SubtensorModule` map at a block.
async fn iter_map<K, V>(at: &At, entry: &'static str) -> Result<Vec<(K, V)>>
where
    K: IntoEncodableValues + IntoDecodableValues,
    V: scale_decode::DecodeAsType,
    (): PrefixOf<K>,
{
    let t = std::time::Instant::now();
    tracing::debug!(entry, "iter start");
    let addr = dynamic::storage::<K, V>("SubtensorModule", entry);
    let mut it = at.storage().iter(addr, ()).await.with_context(|| format!("iter {entry}"))?;
    let mut out = Vec::new();
    while let Some(kv) = it.next().await {
        let kv = kv.with_context(|| format!("read {entry}"))?;
        let k = kv.key().with_context(|| format!("key {entry}"))?.decode().with_context(|| format!("decode key {entry}"))?;
        let v = kv.value().decode().with_context(|| format!("decode value {entry}"))?;
        out.push((k, v));
        if out.len() % 10_000 == 0 {
            tracing::debug!(entry, n = out.len(), "iter progress");
        }
    }
    tracing::info!(entry, n = out.len(), ms = t.elapsed().as_millis() as u64, "iter done");
    Ok(out)
}

/// Values of `SubtensorModule.<entry>` for specific keys, via batched `state_queryStorageAt`.
/// `None` for keys with no stored value.
async fn fetch_many<K, V>(at: &At, rpc: &subxt_rpcs::RpcClient, entry: &'static str, keys: &[K]) -> Result<Vec<(K, Option<V>)>>
where
    K: IntoEncodableValues + IntoDecodableValues + Clone,
    V: scale_decode::DecodeAsType,
{
    use subxt::config::RpcConfigFor;
    use subxt_rpcs::methods::LegacyRpcMethods;

    let e = at.storage().entry(dynamic::storage::<K, V>("SubtensorModule", entry))?;
    let raw: Vec<Vec<u8>> = keys.iter().map(|k| e.fetch_key(k.clone())).collect::<Result<_, _>>()?;
    let md = at.metadata_ref();
    let ty = md
        .pallet_by_name("SubtensorModule")
        .and_then(|p| p.storage())
        .and_then(|s| s.entry_by_name(entry))
        .with_context(|| format!("{entry} missing from metadata"))?
        .value_ty();
    let methods = LegacyRpcMethods::<RpcConfigFor<SubstrateConfig>>::new(rpc.clone());
    let mut found: HashMap<Vec<u8>, Vec<u8>> = HashMap::new();
    for chunk in raw.chunks(PAGE_SIZE as usize / 2) {
        let sets = methods
            .state_query_storage_at(chunk.iter().map(|k| &k[..]), Some(at.block_hash()))
            .await
            .with_context(|| format!("state_queryStorageAt {entry}"))?;
        for set in sets {
            for (k, v) in set.changes {
                if let Some(v) = v {
                    found.insert(k.0, v.0);
                }
            }
        }
    }
    let mut out = Vec::with_capacity(keys.len());
    for (k, kb) in keys.iter().zip(raw) {
        let v = match found.get(&kb) {
            Some(bytes) => Some(V::decode_as_type(&mut &bytes[..], ty, md.types()).with_context(|| format!("decode {entry}"))?),
            None => None,
        };
        out.push((k.clone(), v));
    }
    Ok(out)
}

/// A pool of endpoints: reconnects to the next one on failure (rate limits, drops).
pub struct Pool {
    urls: Vec<String>,
    next: usize,
    cur: Option<Chain>,
}

impl Pool {
    pub fn new(urls: Vec<String>) -> Self {
        assert!(!urls.is_empty(), "at least one RPC endpoint is required");
        Self { urls, next: 0, cur: None }
    }

    async fn chain(&mut self) -> Result<Chain> {
        if let Some(c) = &self.cur {
            return Ok(c.clone());
        }
        let url = self.urls[self.next % self.urls.len()].clone();
        self.next += 1;
        let c = Chain::connect(&url).await?;
        tracing::info!(%url, "connected");
        self.cur = Some(c.clone());
        Ok(c)
    }

    /// Run `f`, retrying up to `tries` times with backoff, rotating endpoints on error.
    /// Each attempt is cut off after [`CALL_TIMEOUT`] so a stalled socket cannot hang a cycle.
    pub async fn run<T, F, Fut>(&mut self, what: &str, tries: u32, f: F) -> Result<T>
    where
        F: Fn(Chain) -> Fut,
        Fut: Future<Output = Result<T>>,
    {
        let mut last = None;
        for attempt in 0..tries {
            match tokio::time::timeout(CONNECT_TIMEOUT, self.chain()).await.unwrap_or_else(|_| Err(anyhow!("connect timed out"))) {
                Ok(c) => match tokio::time::timeout(CALL_TIMEOUT, f(c)).await.unwrap_or_else(|_| Err(anyhow!("timed out after {CALL_TIMEOUT:?}"))) {
                    Ok(v) => return Ok(v),
                    Err(e) => {
                        tracing::warn!(what, attempt, error = format!("{e:#}"), "chain call failed");
                        last = Some(e);
                    }
                },
                Err(e) => {
                    tracing::warn!(what, attempt, error = format!("{e:#}"), "connect failed");
                    last = Some(e);
                }
            }
            self.cur = None;
            tokio::time::sleep(Duration::from_secs(2 + 5 * attempt as u64)).await;
        }
        Err(last.unwrap_or_else(|| anyhow!("{what}: no attempts")))
    }
}

#[cfg(test)]
mod tests {
    use super::image_url;

    #[test]
    fn image_url_accepts_plain_https() {
        assert_eq!(image_url(b" https://example.com/logo.png ").as_deref(), Some("https://example.com/logo.png"));
        assert!(image_url(b"HTTPS://example.com/a.svg").is_some());
    }

    #[test]
    fn image_url_rejects_everything_else() {
        for bad in [
            &b"http://example.com/a.png"[..],
            b"javascript:alert(1)",
            b"data:image/png;base64,AAAA",
            b"ipfs://Qm",
            b"https://",
            b"https://a.com/x\" onerror=\"x",
            b"https://a.com/<script>",
            b"https://a.com/a b.png",
            b"",
        ] {
            assert!(image_url(bad).is_none(), "{:?}", String::from_utf8_lossy(bad));
        }
        assert!(image_url(format!("https://a.com/{}", "x".repeat(600)).as_bytes()).is_none());
    }
}
