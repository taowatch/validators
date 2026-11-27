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
# only on the first run: an existing .env (and its password) is never overwritten
if [ ! -e .env ]; then
  curl -fsSL $base/.env.example -o .env
  # set a random database password
  sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 16)/" .env && rm .env.bak
fi
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
They only add tables and columns, so rolling back to an older image is safe: it starts against a database a newer image migrated and ignores what it doesn't know.

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
| `KEEP_DAYS` | `400` | Days of history kept (at least `BACKFILL_DAYS` + 2). Lowering `BACKFILL_DAYS` does not delete history; lowering `KEEP_DAYS` does |
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
`api` and `collector` run with a read-only filesystem (only `/tmp` is writable), no Linux capabilities and `no-new-privileges`; Postgres gets 60 s to shut down cleanly.
The collector's healthcheck passes while a head snapshot is less than 2.5 cycles old.

### What the collector does each cycle

1. **Head.** It pins the latest block and reads everything at that block, so all values are consistent:
   - **Big maps**, read whole, 1000 keys per page via `state_getKeysPaged` + `state_queryStorageAt`: `TotalHotkeyAlpha` (≈44k entries), `TotalHotkeySharesV2`, `AlphaSharePoolEpoch`, `BasketRate`, `SubnetTAO`, `SubnetAlphaIn`.
   - **Meta**: `get_all_validator_baskets`, `Delegates`, `IdentitiesV2`, `SubnetIdentitiesV3`, `ChildKeys`, `ChildkeyTake`.
   - **`Owner`**, by key in batches (the whole map is too large to scan).
   - **Nominators**, from `get_delegate` per basket validator every `NOMINATORS_EVERY` cycles. `get_delegates` exceeds the RPC message limit.
2. **Backfill.** Each UTC day in the window without a kept sample gets the maps at ≈00:30 UTC that day, newest first.
   - Backfill gets a time budget of one interval per cycle, so a long first run doesn't hold up the hourly head sample. It resumes in the next cycle.
   - The target block is estimated at 12 s per block, then corrected once from `Timestamp.Now` at that block, so samples land on the right day even months back.
   - If the target block is already stored (for example as the 24h point), that snapshot becomes the day's sample instead of being read again.
   - A day that fails 3 cycles in a row is skipped until the collector restarts.
   - On a fresh start the collector also stores one exact point 24 hours back, so the 1D window is right before hourly samples build up.
3. **Gaps.** Pools and validators that entered the tracked set after older snapshots were taken get their values at those blocks through keyed reads. Their 7D and 30D history is therefore complete. A block that fails 3 cycles is skipped until the collector restarts, and the step stops when the cycle's time budget is used.
4. **Prune.** Hourly samples older than `KEEP_HOURS` are deleted, except for each UTC day's kept sample. Anything older than `KEEP_DAYS` (at least `BACKFILL_DAYS` + 2) is deleted too. `collector once` never prunes.

Every write bumps a data version in the database; the API recomputes only when it changes.

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
- **Subnet reference APY.** For each window: among earning pools worth at least 100 τ, the median APY of the top 3 when there are at least 3, otherwise the single best. Pools earning nothing (APY < 0.01%) never set it.
- **1D window.** Uses an hourly sample within 3 hours of 24 hours before head; without one, 1D is empty rather than computed over a wrong span.
- **Efficiency.** Pool APY ÷ reference, capped at 120%. Effective take = 1 − efficiency. It is computed for every window of 7 days or more.
- **Consistency.** The history is cut into 30-day periods, newest first. For each one, the validator's stake-weighted efficiency is computed against that period's own subnet references. Consistency is the share of periods in which efficiency reached at least 90%. It needs at least 2 periods, so 60 or more days of history.

### History length

The API serves as much history as is stored: the daily grid reaches back to the oldest snapshot, with a minimum of 30 days.
- APY windows 1D, 7D and 30D are always present.
- 90D, 180D and 365D appear once the data reaches that far.
- Raising `BACKFILL_DAYS` on a running deployment only backfills the extra days. Each cycle spends up to one interval on backfill.
- Rough storage cost: about 2 MB per stored day, so 365 days is under 1 GB.

**Configured take.** 1 − (1 − take)(1 − Σ proportion × childkey take). `ChildKeys` proportions are u64 / 2⁶⁴; `ChildkeyTake` and `Delegates` takes are u16 / 65535.

## How validators are graded

The home page ("Choose a validator") gives each validator a grade per place it operates: root, and each subnet it validates on.
It answers one question: *how much of the best available payout does a staker get here?*

- **Payout vs best (PR):** the validator's daily yield ÷ a benchmark daily yield, capped at 120%. Daily yields are compared rather than APYs, so a short burst cannot inflate the ratio.
  - **Root:** the benchmark is the median of the top 3 APY 30D among rated, earning validators (≥ 1K τ, ≥ 21 days of data). A rated validator earning nothing gets F.
  - **Alpha pool:** the benchmark is the median of the top 3 earning pools on the same subnet, **excluding the validator's own pool** (leave-one-out), so nobody is compared with itself.
    - Pools of ≥ 100 τ are used. If there are fewer than 3, pools of ≥ 10 τ are used instead and the pool gets a "Thin benchmark" badge.
    - The grade uses the weaker of PR 7D and PR 30D: a validator must be good in both windows.
- **Grades:**

  | Grade | Rule |
  |---|---|
  | A | PR ≥ 95% (root: also ≥ 90% of the daily benchmark on at least 2/3 of the last 30 days) |
  | B | PR ≥ 85% |
  | C | PR ≥ 70% |
  | D | below 70% |
  | F | not earning (APY < 0.01%) |

- **Badges:**
  - **Not earning**
  - **Thin benchmark**
  - **Unstable:** PR 7D and PR 30D differ by more than 15 pp, or root hits the benchmark on fewer than half the days.
  - **High fee:** total fee ≥ 15%.
  - **New:** too little history.
  - **Small:** under 1K τ on root.
- **Total fee** = 1 − (1 − take)(1 − childkey take), shown next to the grade. It is not folded into the grade, since yields are already net of it.

On a subnet, the alpha price move is the same for every validator, so it is shown once in the subnet header rather than on each row.
The subnet header's "best APY" follows the subnet reference rule above (no leave-one-out); per-pool grades use the leave-one-out benchmark.

## API

| Endpoint | Content |
|---|---|
| `GET /api/validators` | Root: stake, take, nominators, APY for each window in `win` (`a1`, `a7`, `a30`, `a90`, …), rolling 7D and 30D APY series (`d`, `d30`), stake history, NAV, basket holdings |
| `GET /api/alpha` | Subnets (reference APY and price change per window), validators (APY, efficiency and effective take per window, per-period efficiency `effp`, consistency `cons`) and every pool (columns named in `pf`) |
| `GET /api/choose` | Home page data: graded root list (`root.rows`, with `bench`), subnets, and graded pools per subnet (`pools`, columns named in `pcols`) |
| `GET /api/validator/{hotkey}` | One validator: its root record and every subnet pool ≥ 10 τ, with grade, payout vs best, fee split, rank and benchmark |
| `GET /api/health` | Database reachable, newest block and its age |

The API computes every response from one consistent database snapshot.
JSON is served gzipped when the client accepts it (`Cache-Control: public, max-age=60`); unknown `/api/*` paths and missing files return 404 with `Cache-Control: no-store`, and paths without a file extension get the app's `index.html`.
Every response carries a Content-Security-Policy (scripts only from the site itself; fonts from Google Fonts; images from any https host; the live price from `wss://data-stream.binance.vision`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY`.
The JSON shapes match the design's data files, so the frontend logic is shared.

In `/api/validators`, `days` and `sh` have one point per day of history, and `sh` is `null` for leading days with no sample.
The UI then labels flows by the span actually covered, for example "Flow 18D".

## Development

```
crates/core       chain client (subxt 0.51, LegacyBackend) + Postgres access
crates/collector  periodic job
crates/api        HTTP API + APY math (compute.rs)
migrations/       schema
web/              frontend (dc-lite.js + pages generated from the designs)
design/           design sources (.dc.html): App (default UI), Terminal, Main (analytics), TerminalAnalytics
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

The UI is generated from four design sources in `design/`:

| Source | Page | Served at |
|---|---|---|
| `design/App.dc.html` | Default interface: choose a validator, validator pages | `/` |
| `design/Terminal.dc.html` | Terminal interface: same data and views, keyboard-driven | `/terminal` |
| `design/Main.dc.html` | Analytics | `/analytics` |
| `design/TerminalAnalytics.dc.html` | Analytics in the Terminal interface | `/terminal/analytics` |
| `design/FAQ.dc.html` | How the numbers work (APY, grades, badges, fees) | `/faq` |
| `design/TerminalFAQ.dc.html` | FAQ in the Terminal interface | `/terminal/faq` |

The default and Terminal pages share the same API (`/api/choose`, `/api/validator/{hotkey}`) and the same validator links (`#v/<hotkey>[/<netuid>]`), so switching keeps the current view.
Viewers switch with the "UI Default | Terminal" control in the header. The Terminal pages also accept the `t` key.
- The choice is remembered per browser in `localStorage` (`vy.ui`). With `terminal` stored, `/` redirects to `/terminal` and `/analytics` to `/terminal/analytics` and `/faq` to `/terminal/faq`.
- `?ui=terminal` or `?ui=default` in a link sets the choice.

Terminal keys: `j`/`k` move, `enter` opens, `/` focuses the command line, `s` cycles the sort, `g` cycles the grade filter, `esc` clears or goes back, `h`/`l` step through a validator's places, `c` copies the hotkey, `t` switches UI. On the Terminal analytics page: `1`/`2`/`3` switch tabs, `w` cycles the window, `j`/`k` + `enter` open a validator. Single-key shortcuts can be turned off with the "keys: on/off" button in the status bar or the `keys off` command (stored in `localStorage` `vy.keys`).

After editing a design, regenerate and commit `web/`. CI fails if `web/` is out of date.

```bash
python3 tools/dc2web.py     # rewrites web/index.html, terminal.html, analytics.html, terminal-analytics.html and their scripts
```

Then check the result locally with `docker-compose.build.yml`, as shown above.
