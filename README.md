# Validator Yield

Ranks Bittensor (finney) validators by **root-claim** and **alpha-stake** yield, computed entirely from on-chain data.
See [How yield is computed](#how-yield-is-computed) for the formulas.

Image: `ghcr.io/taowatch/validators` (linux/amd64, linux/arm64), built by [`.github/workflows/image.yml`](.github/workflows/image.yml).

## Quick start

You need Docker with the Compose plugin. The server needs only two files, `docker-compose.yml` and `.env`; there is no need to clone the repo.

```bash
mkdir -p validators && cd validators
base=https://raw.githubusercontent.com/taowatch/validators/main
curl -fsSLO $base/docker-compose.yml
curl -fsSL $base/.env.example -o .env
# set a random database password
sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 16)/" .env && rm .env.bak
docker compose pull
docker compose up -d
curl -s http://127.0.0.1:8080/api/health
```

Open http://127.0.0.1:8080 in a browser (through an SSH tunnel or a reverse proxy on a remote server, see [Public access](#public-access)).

On first start the collector backfills `BACKFILL_DAYS` (default 30) from an archive node, at about 1–4 minutes per day depending on the node.
The newest days come first, so the 1D and 7D APY columns appear within about 15 minutes and 30D once the backfill is done.
To follow along:

```bash
docker compose logs -f collector
docker compose ps                         # collector turns "healthy" after its first head snapshot
curl -s http://127.0.0.1:8080/api/health  # {"status":"ok","block":…,"age_secs":…,"stale":false}
```

If the package on GHCR is private, run `docker login ghcr.io` first with a GitHub token that has `read:packages`,
or make the package public under the organization's **Packages → validators → Package settings**.

## Updating

```bash
docker compose pull && docker compose up -d
```

When `docker-compose.yml` itself changes in the repo, fetch it again first:
`curl -fsSLO https://raw.githubusercontent.com/taowatch/validators/main/docker-compose.yml`.

`latest` follows `main`. To pin a version, set `IMAGE` in `.env`, for example `IMAGE=ghcr.io/taowatch/validators:1.2.0` or `:sha-abc1234`.
Database migrations run automatically when the `api` container starts.

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `POSTGRES_PASSWORD` | required | Database password |
| `IMAGE` | `ghcr.io/taowatch/validators:latest` | Image for `api` and `collector` |
| `WEB_BIND` / `WEB_PORT` | `127.0.0.1` / `8080` | Where the web UI and API are published |
| `RPC_URLS` | `wss://entrypoint-finney.opentensor.ai:443` | Live nodes for head snapshots, comma-separated |
| `ARCHIVE_URLS` | onfinality, opentensor archive | Archive nodes for backfill and history gaps |
| `INTERVAL_SECS` | `3600` | Snapshot cadence |
| `BACKFILL_DAYS` | `30` | Days of history to backfill and keep. The UI follows it: 90 adds the 90D window, 180 adds 180D, 365 adds 365D |
| `MIN_ALPHA` | `100` | Track a delegate's alpha pool from this much alpha |
| `KEEP_HOURS` | `72` | Hourly samples kept; older ones thin to one per UTC day |
| `NOMINATORS_EVERY` | `24` | Refresh nominator counts every N cycles |
| `RUST_LOG` | `info` | Log level |

When there are several endpoints, a failing or rate-limited one is skipped and the next is used.
A value that doesn't parse, such as `INTERVAL_SECS=1h`, stops the container with an error instead of silently using the default.

### Changing the database password

Postgres reads `POSTGRES_PASSWORD` only when the volume is first created.
If you change it in `.env` later, the `api` and `collector` containers can no longer log in.
Change it inside the database too:

```bash
docker compose exec db psql -U vr -d vr -c "ALTER USER vr PASSWORD 'new-password'"
# then set POSTGRES_PASSWORD=new-password in .env
docker compose up -d
```

### Public access

The port is bound to `127.0.0.1` by default. Put a TLS reverse proxy (Caddy, nginx, Traefik) in front and proxy to `127.0.0.1:8080`.
The live TAO price loads directly in the browser from `wss://data-stream.binance.vision/ws/taousdt@ticker`, so the proxy doesn't need to handle it.

### Reset

```bash
docker compose down -v   # deletes the database volume; the next start backfills again
```

## Services

| Service | Role |
|---|---|
| `db` | Postgres 17 |
| `api` | Rust (axum). It applies migrations, recomputes rankings whenever the stored data changes and keeps them in memory, and serves `/api/*` and the frontend. |
| `collector` | Rust. Takes one head snapshot per `INTERVAL_SECS` and backfills missing UTC days from an archive node. It also fills history for pools that joined later, and prunes old samples. |

Every service runs under `init`, rotates its logs (5 × 10 MB) and restarts unless stopped.
The collector's healthcheck passes while a head snapshot is less than 2.5 cycles old.

### What the collector does each cycle

1. **Head.** It pins the latest block and reads everything at that block, so all values are consistent:
   - **Big maps**, read whole, 1000 keys per page via `state_getKeysPaged` + `state_queryStorageAt`: `TotalHotkeyAlpha` (≈44k entries), `TotalHotkeySharesV2`, `AlphaSharePoolEpoch`, `BasketRate`, `SubnetTAO`, `SubnetAlphaIn`.
   - **Meta**: `get_all_validator_baskets`, `Delegates`, `IdentitiesV2`, `SubnetIdentitiesV3`, `ChildKeys`, `ChildkeyTake`.
   - **`Owner`**, by key in batches (the whole map is too large to scan).
   - **Nominators**, from `get_delegate` per basket validator every `NOMINATORS_EVERY` cycles. `get_delegates` exceeds the RPC message limit.
2. **Backfill.** Each UTC day in the window without a kept sample gets the maps at ≈00:30 UTC that day, newest first.
   - Backfill gets a time budget of one interval per cycle, so a long first run doesn't hold up the hourly head sample. It resumes in the next cycle.
   - A day that fails 3 cycles in a row is skipped until the collector restarts.
   - On a fresh start the collector also stores one exact point 24 hours back, so the 1D window is right before hourly samples build up.
3. **Gaps.** Pools and validators that entered the tracked set after older snapshots were taken get their values at those blocks through keyed reads. Their 7D and 30D history is therefore complete.
4. **Prune.** Hourly samples older than `KEEP_HOURS` are deleted, except for each UTC day's kept sample. Anything older than `BACKFILL_DAYS` + 2 days is deleted too.

Every chain call has a 15-minute timeout and up to 3–4 attempts with backoff, switching endpoints between attempts.

Measured on mainnet:
- Meta: about 30–40 s.
- Head maps: about 75 s.
- One backfilled day: about 100–250 s.

### Storage

- `snapshot`, `root_sample`, `alpha_sample` and `subnet_sample` store data per block. Each snapshot records the UTC `day` it stands for. At most one per day is `keep_daily`, enforced by a unique index.
- `validator`, `subnet` and `childkey` hold the latest state and are overwritten every cycle.
- Only alpha pools of delegates with at least `MIN_ALPHA` alpha are tracked, about 5,000 pools.

## How yield is computed

- **Root APY.** yield = Δ`BasketRate.bits` / 2³² × NAV / shares between two samples. APY = (1 + yield)^(365 / days) − 1, with days taken from the blocks' `Timestamp.Now`. The detail charts use a rolling 7-day APY.
- **Alpha APY.** pps = `TotalHotkeyAlpha` / `TotalHotkeySharesV2` per (hotkey, subnet) pool. yield = pps(t₁) / pps(t₀) − 1, annualized the same way. It is undefined when `AlphaSharePoolEpoch` changed or pps went down. The netuid 0 entry is root stake and is excluded.
- **Subnet reference APY.** The median 30D APY of the top 3 pools worth at least 100 τ.
- **Efficiency.** Pool APY ÷ reference, capped at 120%. Effective take = 1 − efficiency. It is computed for every window of 7 days or more.
- **Consistency.** The history is cut into 30-day periods, newest first. For each one, the validator's stake-weighted efficiency is computed against that period's own subnet references. Consistency is the share of periods in which efficiency reached at least 90%. It needs at least 2 periods, so 60 or more days of history.

### History length

The API serves as much history as is stored: the daily grid reaches back to the oldest snapshot, with a minimum of 30 days.
- APY windows 1D, 7D and 30D are always present.
- 90D, 180D and 365D appear once the data reaches that far.
- Raising `BACKFILL_DAYS` on a running deployment only backfills the extra days. Each cycle spends up to one interval on backfill.
- Rough storage cost: about 2 MB per stored day, so 365 days is under 1 GB.
- **Configured take.** 1 − (1 − take)(1 − Σ proportion × childkey take). `ChildKeys` proportions are u64 / 2⁶⁴; `ChildkeyTake` and `Delegates` takes are u16 / 65535.

## API

| Endpoint | Content |
|---|---|
| `GET /api/validators` | Root: stake, take, nominators, APY for each window in `win` (`a1`, `a7`, `a30`, `a90`, …), rolling 7D and 30D APY series (`d`, `d30`), stake history, NAV, basket holdings |
| `GET /api/alpha` | Subnets (reference APY and price change per window), validators (APY, efficiency and effective take per window, per-period efficiency `effp`, consistency `cons`) and every pool (columns named in `pf`) |
| `GET /api/health` | Database reachable, newest block and its age |

The API computes every response from one consistent database snapshot.
The JSON shapes match the design's data files, so the frontend logic is shared.

In `/api/validators`, `days` and `sh` have one point per day of history, and `sh` is `null` for leading days with no sample.
The UI then labels flows by the span actually covered, for example "Flow 18D".

## Development

```
crates/core       chain client (subxt 0.51, LegacyBackend) + Postgres access
crates/collector  periodic job
crates/api        HTTP API + APY math (compute.rs)
migrations/       schema
web/              frontend (dc-lite.js + index.html/app.js generated from the design)
design/           design source (.dc.html) the UI is generated from
tools/dc2web.py   design → web
```

### Build the image locally

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

### Run without Docker

```bash
docker run -d --name vr-db -e POSTGRES_USER=vr -e POSTGRES_PASSWORD=vr -e POSTGRES_DB=vr -p 127.0.0.1:55432:5432 postgres:17.12-alpine
export DATABASE_URL=postgres://vr:vr@127.0.0.1:55432/vr
BACKFILL_DAYS=1 cargo run --bin collector -- once
cargo run --bin api          # http://127.0.0.1:8080
```

### Changing the UI

The source of the UI is `design/Main.dc.html`. After editing it, regenerate and commit `web/`. CI fails if `web/` is out of date.

```bash
python3 tools/dc2web.py     # rewrites web/index.html + web/app.js
```

Then check the result locally with `docker-compose.build.yml`, as shown above.
