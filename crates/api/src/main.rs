//! HTTP API + static frontend.
//!
//! GET /api/validators  root ranking (validators.json shape)
//! GET /api/alpha       alpha pools, subnets, efficiency (alpha.json shape)
//! GET /api/choose      "Choose a validator": graded root list, subnets, graded pools per subnet
//! GET /api/validator/{hotkey}  one validator: root and every subnet it operates on
//! GET /api/health
//! GET /analytics       the analytics page (analytics.html)
//! GET /terminal        the Terminal interface (terminal.html), same data as "/"
//! GET /terminal/analytics  Terminal version of /analytics (terminal-analytics.html)
//! GET /faq             how the numbers work (faq.html); /terminal/faq is its Terminal twin
//! everything else      files from WEB_DIR; paths without a file extension get index.html
//!                      (client-side routes), missing files and unknown /api paths get 404
//!
//! Results are recomputed whenever the collector bumps `meta.data_version`, serialized and
//! gzipped once, and served from memory, so requests never touch the database.

mod compute;
mod rating;

use std::collections::HashMap;
use std::io::Write;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use axum::Router;
use axum::extract::State;
use axum::handler::HandlerWithoutStateExt;
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode, Uri, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use bytes::Bytes;
use tokio::sync::RwLock;
use tower_http::compression::CompressionLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use vr_core::env_or;

/// A JSON document, serialized once, with its gzip encoding.
struct Body {
    raw: Bytes,
    gz: Bytes,
}

impl Body {
    fn new(v: &serde_json::Value) -> Self {
        let raw = Bytes::from(v.to_string());
        let mut enc = flate2::write::GzEncoder::new(Vec::with_capacity(raw.len() / 5), flate2::Compression::new(6));
        let gz = match enc.write_all(&raw).and_then(|_| enc.finish()) {
            Ok(b) => Bytes::from(b),
            Err(_) => Bytes::new(),
        };
        Self { raw, gz }
    }
}

#[derive(Default)]
struct Cache {
    /// `meta.data_version` the documents were built from (None until the first build)
    version: Option<i64>,
    validators: Option<Arc<Body>>,
    alpha: Option<Arc<Body>>,
    choose: Option<Arc<Body>>,
    details: Arc<HashMap<String, Arc<Body>>>,
}

#[derive(Clone)]
struct App {
    pool: sqlx::PgPool,
    cache: Arc<RwLock<Cache>>,
}

const CSP: &str = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' wss://data-stream.binance.vision; \
frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=warn".into()))
        .with_ansi(std::io::IsTerminal::is_terminal(&std::io::stderr()))
        .init();
    let pool = vr_core::db::connect(&std::env::var("DATABASE_URL").expect("DATABASE_URL")).await?;
    let app = App { pool, cache: Arc::default() };

    let refresher = app.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) = refresh(&refresher).await {
                warn!(error = format!("{e:#}"), "refresh failed");
            }
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });

    let web = std::env::var("WEB_DIR").unwrap_or_else(|_| "web".into());
    let index = format!("{web}/index.html");
    // Client-side routes ("/", "/foo") get index.html; a missing file ("/x.js") is a 404 so a CDN
    // never caches HTML under an asset URL.
    let spa = move |uri: Uri| {
        let index = index.clone();
        async move {
            let last = uri.path().rsplit('/').next().unwrap_or("");
            if last.contains('.') {
                return not_found("not found");
            }
            match tokio::fs::read(&index).await {
                Ok(html) => ([(header::CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))], html).into_response(),
                Err(_) => not_found("not found"),
            }
        }
    };
    let h = |name: &'static str, value: &'static str| SetResponseHeaderLayer::overriding(HeaderName::from_static(name), HeaderValue::from_static(value));
    let router = Router::new()
        .route("/api/health", get(health))
        .route("/api/validators", get(validators))
        .route("/api/alpha", get(alpha))
        .route("/api/choose", get(choose))
        .route("/api/validator/{hotkey}", get(validator))
        .route("/api/{*rest}", any(|| async { not_found("unknown API path") }))
        .route_service("/analytics", ServeFile::new(format!("{web}/analytics.html")))
        .route_service("/terminal", ServeFile::new(format!("{web}/terminal.html")))
        .route_service("/terminal/analytics", ServeFile::new(format!("{web}/terminal-analytics.html")))
        .route_service("/faq", ServeFile::new(format!("{web}/faq.html")))
        .route_service("/terminal/faq", ServeFile::new(format!("{web}/terminal-faq.html")))
        .fallback_service(ServeDir::new(&web).fallback(spa.into_service()))
        .layer(axum::middleware::map_response(cache_headers))
        // /api JSON is pre-gzipped; the layer leaves responses with a Content-Encoding alone
        .layer(CompressionLayer::new())
        .layer(h("content-security-policy", CSP))
        .layer(h("x-content-type-options", "nosniff"))
        .layer(h("referrer-policy", "strict-origin-when-cross-origin"))
        .layer(h("x-frame-options", "DENY"))
        .layer(TraceLayer::new_for_http())
        .with_state(app);

    let addr = format!("0.0.0.0:{}", env_or("PORT", 8080u16));
    info!(%addr, %web, "listening");
    axum::serve(tokio::net::TcpListener::bind(&addr).await?, router).await?;
    Ok(())
}

async fn refresh(app: &App) -> Result<()> {
    let version = vr_core::db::data_version(&app.pool).await?;
    if app.cache.read().await.version == Some(version) {
        return Ok(());
    }
    let t = std::time::Instant::now();
    let Some(out) = compute::compute(&app.pool).await? else { return Ok(()) };
    // Rating, serialization and gzip are CPU work: off the async workers, and without holding
    // the cache lock, so requests keep being served from the previous documents meanwhile.
    let (block, validators, alpha, choose, details) = tokio::task::spawn_blocking(move || {
        let rated = rating::build(&out.validators, &out.alpha);
        let details: HashMap<String, Arc<Body>> = rated.details.iter().map(|(k, v)| (k.clone(), Arc::new(Body::new(v)))).collect();
        (out.block, Arc::new(Body::new(&out.validators)), Arc::new(Body::new(&out.alpha)), Arc::new(Body::new(&rated.choose)), Arc::new(details))
    })
    .await?;
    {
        let mut c = app.cache.write().await;
        c.version = Some(version);
        c.validators = Some(validators);
        c.alpha = Some(alpha);
        c.choose = Some(choose);
        c.details = details;
    }
    info!(block, version, ms = t.elapsed().as_millis() as u64, "rankings recomputed");
    Ok(())
}

/// Cache policy (CDNs such as Cloudflare follow it):
/// - errors (404, 503, …) are never stored;
/// - files requested with a content hash (`/app.js?v=…`) never change: cached for a year;
/// - other frontend files (index.html) are revalidated on every load so a release shows at once;
/// - /api responses keep the policy their handler set.
async fn cache_headers(uri: Uri, mut res: Response) -> Response {
    let v = if !res.status().is_success() {
        "no-store"
    } else if uri.path().starts_with("/api/") {
        return res;
    } else if uri.query().is_some_and(|q| q.split('&').any(|kv| kv.starts_with("v="))) {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static(v));
    res
}

fn not_found(msg: &'static str) -> Response {
    (StatusCode::NOT_FOUND, [(header::CACHE_CONTROL, HeaderValue::from_static("no-store"))], msg).into_response()
}

fn accepts_gzip(h: &HeaderMap) -> bool {
    h.get_all(header::ACCEPT_ENCODING).iter().filter_map(|v| v.to_str().ok()).flat_map(|v| v.split(',')).any(|part| {
        let mut it = part.split(';');
        let enc = it.next().unwrap_or("").trim();
        let q0 = it.any(|p| matches!(p.trim().replace(' ', "").as_str(), "q=0" | "q=0.0" | "q=0.00" | "q=0.000"));
        (enc.eq_ignore_ascii_case("gzip") || enc == "*") && !q0
    })
}

fn json(body: Option<Arc<Body>>, h: &HeaderMap) -> Response {
    let Some(b) = body else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            [(header::CACHE_CONTROL, HeaderValue::from_static("no-store"))],
            "no data yet: the collector has not stored a snapshot",
        )
            .into_response();
    };
    let gzip = !b.gz.is_empty() && accepts_gzip(h);
    let mut res = (
        [
            (header::CONTENT_TYPE, HeaderValue::from_static("application/json")),
            (header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=60")),
            (header::VARY, HeaderValue::from_static("accept-encoding")),
        ],
        if gzip { b.gz.clone() } else { b.raw.clone() },
    )
        .into_response();
    if gzip {
        res.headers_mut().insert(header::CONTENT_ENCODING, HeaderValue::from_static("gzip"));
    }
    res
}

async fn validators(State(app): State<App>, h: HeaderMap) -> Response {
    json(app.cache.read().await.validators.clone(), &h)
}

async fn alpha(State(app): State<App>, h: HeaderMap) -> Response {
    json(app.cache.read().await.alpha.clone(), &h)
}

async fn choose(State(app): State<App>, h: HeaderMap) -> Response {
    json(app.cache.read().await.choose.clone(), &h)
}

async fn validator(State(app): State<App>, axum::extract::Path(hotkey): axum::extract::Path<String>, h: HeaderMap) -> Response {
    let (ready, body) = {
        let c = app.cache.read().await;
        (c.choose.is_some(), c.details.get(&hotkey).cloned())
    };
    match (ready, body) {
        (false, _) => json(None, &h),
        (true, Some(b)) => json(Some(b), &h),
        (true, None) => not_found("unknown validator"),
    }
}

/// 200 while the database answers. The body says how old the newest snapshot is, so a
/// stalled collector is visible here too (`stale` after 3 hours).
async fn health(State(app): State<App>) -> Response {
    let q = sqlx::query_as::<_, (Option<i64>, Option<f64>)>("SELECT max(block), extract(epoch FROM now() - max(ts))::float8 FROM snapshot");
    match q.fetch_one(&app.pool).await {
        Ok((block, age)) => {
            let body = serde_json::json!({
                "status": "ok", "block": block, "age_secs": age.map(|a| a.round() as i64),
                "stale": age.is_none_or(|a| a > 3.0 * 3600.0),
            });
            ([(header::CONTENT_TYPE, HeaderValue::from_static("application/json")), (header::CACHE_CONTROL, HeaderValue::from_static("no-store"))], body.to_string())
                .into_response()
        }
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, "db unavailable").into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hm(v: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(header::ACCEPT_ENCODING, HeaderValue::from_str(v).unwrap());
        h
    }

    #[test]
    fn gzip_negotiation() {
        assert!(accepts_gzip(&hm("gzip, deflate, br")));
        assert!(accepts_gzip(&hm("br;q=1.0, gzip;q=0.8")));
        assert!(accepts_gzip(&hm("*")));
        assert!(!accepts_gzip(&hm("br")));
        assert!(!accepts_gzip(&hm("gzip;q=0")));
        assert!(!accepts_gzip(&HeaderMap::new()));
    }

    #[test]
    fn body_gzip_roundtrip() {
        use std::io::Read;
        let v = serde_json::json!({"a": [1, 2, 3], "b": "x".repeat(1000)});
        let b = Body::new(&v);
        let mut out = String::new();
        flate2::read::GzDecoder::new(&b.gz[..]).read_to_string(&mut out).unwrap();
        assert_eq!(out.as_bytes(), &b.raw[..]);
        assert!(b.gz.len() < b.raw.len());
    }
}
