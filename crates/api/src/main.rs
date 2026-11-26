//! HTTP API + static frontend.
//!
//! GET /api/validators  root ranking (validators.json shape)
//! GET /api/alpha       alpha pools, subnets, efficiency (alpha.json shape)
//! GET /api/choose      "Choose a validator": graded root list, subnets, graded pools per subnet
//! GET /api/validator/{hotkey}  one validator: root and every subnet it operates on
//! GET /analytics       the analytics page (analytics.html)
//! GET /api/health
//! everything else      files from WEB_DIR (the frontend)
//!
//! Results are recomputed whenever the collector stores a new head snapshot and served
//! from memory, so requests never touch the database.

mod compute;
mod rating;

use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use axum::Router;
use axum::extract::State;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use tokio::sync::RwLock;
use tower_http::compression::CompressionLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use vr_core::env_or;

#[derive(Default)]
struct Cache {
    key: (i64, i64, i64),
    validators: Option<Arc<String>>,
    alpha: Option<Arc<String>>,
    choose: Option<Arc<String>>,
    details: Arc<std::collections::HashMap<String, Arc<String>>>,
}

#[derive(Clone)]
struct App {
    pool: sqlx::PgPool,
    cache: Arc<RwLock<Cache>>,
}

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
    let router = Router::new()
        .route("/api/health", get(health))
        .route("/api/validators", get(validators))
        .route("/api/alpha", get(alpha))
        .route("/api/choose", get(choose))
        .route("/api/validator/{hotkey}", get(validator))
        .route_service("/analytics", ServeFile::new(format!("{web}/analytics.html")))
        .fallback_service(ServeDir::new(&web).fallback(ServeFile::new(index)))
        .layer(axum::middleware::map_response(static_cache))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(app);

    let addr = format!("0.0.0.0:{}", env_or("PORT", 8080u16));
    info!(%addr, %web, "listening");
    axum::serve(tokio::net::TcpListener::bind(&addr).await?, router).await?;
    Ok(())
}

async fn refresh(app: &App) -> Result<()> {
    // Backfill adds *older* blocks and prune removes some, so the key covers the whole set of
    // snapshots and the number of rows stored for them (gap fills add rows, not snapshots).
    let (latest, sum, rows): (Option<i64>, i64, i64) = sqlx::query_as(
        "SELECT max(block), coalesce(sum(block), 0)::int8,
                (SELECT count(*) FROM alpha_sample) + (SELECT count(*) FROM root_sample)
         FROM snapshot",
    )
    .fetch_one(&app.pool)
    .await?;
    let Some(latest) = latest else { return Ok(()) };
    let key = (latest, sum, rows);
    if app.cache.read().await.key == key {
        return Ok(());
    }
    let t = std::time::Instant::now();
    if let Some(out) = compute::compute(&app.pool).await? {
        let mut c = app.cache.write().await;
        c.key = key;
        let rated = rating::build(&out.validators, &out.alpha);
        c.validators = Some(Arc::new(out.validators.to_string()));
        c.alpha = Some(Arc::new(out.alpha.to_string()));
        c.choose = Some(Arc::new(rated.choose.to_string()));
        c.details = Arc::new(rated.details.into_iter().map(|(k, v)| (k, Arc::new(v.to_string()))).collect());
        info!(block = out.block, ms = t.elapsed().as_millis() as u64, "rankings recomputed");
    }
    Ok(())
}

/// Cache policy for the frontend (CDNs such as Cloudflare follow it): files requested with a
/// content hash (`/app.js?v=…`) never change, so they are cached for a year; everything else
/// (index.html) is revalidated on every load so a new release shows up at once.
async fn static_cache(uri: axum::http::Uri, mut res: Response) -> Response {
    if uri.path().starts_with("/api/") || !res.status().is_success() {
        return res;
    }
    let v = if uri.query().is_some_and(|q| q.split('&').any(|kv| kv.starts_with("v="))) {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static(v));
    res
}

fn json(body: Option<Arc<String>>) -> Response {
    match body {
        Some(b) => (
            [
                (header::CONTENT_TYPE, HeaderValue::from_static("application/json")),
                (header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=60")),
            ],
            b.as_str().to_owned(),
        )
            .into_response(),
        None => (StatusCode::SERVICE_UNAVAILABLE, "no data yet: the collector has not stored a snapshot").into_response(),
    }
}

async fn validators(State(app): State<App>) -> Response {
    json(app.cache.read().await.validators.clone())
}

async fn alpha(State(app): State<App>) -> Response {
    json(app.cache.read().await.alpha.clone())
}

/// 200 while the database answers. The body says how old the newest snapshot is, so a
/// stalled collector is visible here too (`stale` after 3 hours).
async fn choose(State(app): State<App>) -> Response {
    json(app.cache.read().await.choose.clone())
}

async fn validator(State(app): State<App>, axum::extract::Path(hotkey): axum::extract::Path<String>) -> Response {
    let c = app.cache.read().await;
    if c.choose.is_none() {
        return json(None);
    }
    match c.details.get(&hotkey) {
        Some(v) => json(Some(v.clone())),
        None => (StatusCode::NOT_FOUND, "unknown validator").into_response(),
    }
}

async fn health(State(app): State<App>) -> Response {
    let q = sqlx::query_as::<_, (Option<i64>, Option<f64>)>("SELECT max(block), extract(epoch FROM now() - max(ts))::float8 FROM snapshot");
    match q.fetch_one(&app.pool).await {
        Ok((block, age)) => {
            let body = serde_json::json!({
                "status": "ok", "block": block, "age_secs": age.map(|a| a.round() as i64),
                "stale": age.is_none_or(|a| a > 3.0 * 3600.0),
            });
            ([(header::CONTENT_TYPE, HeaderValue::from_static("application/json"))], body.to_string()).into_response()
        }
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, "db unavailable").into_response(),
    }
}
