// Generated from design/Main.dc.html by tools/dc2web.py — edit the design, then rerun.
const DATA_URL = '/api/validators';
const ALPHA_URL = '/api/alpha';
const PAUSE = [3, 7];
const ALPHA_MINS = [[0, 'All'], [1000, '≥ 1K τ'], [10000, '≥ 10K τ'], [100000, '≥ 100K τ']];
const EFF_DIRS = { rank: -1, name: 1, tao: -1, ns: -1, t: 1, cfg: 1, et: 1, eff: -1, a30: -1, root: -1 };
const EFF_COLS = [
  ['rank', '#', 'flex-start'], ['name', 'Validator', 'flex-start'], ['tao', 'Alpha stake', 'flex-end'], ['ns', 'Subnets', 'flex-end'],
  ['t', 'Listed take', 'flex-end'], ['cfg', 'Config. take', 'flex-end'], ['et', 'Effective take', 'flex-end'], ['eff', 'Efficiency', 'flex-start'],
  ['a30', 'α APY 30D', 'flex-end'], ['root', 'Root APY 30D', 'flex-end'],
];
function effColor(e, accent) { return e == null ? '#8B97A6' : e >= 95 ? accent : e >= 80 ? '#E6EDF3' : '#F59E3B'; }
function mono(hk) { const h = hue(hk); return { monoBg: 'hsl(' + h + ' 34% 20%)', monoFg: 'hsl(' + h + ' 70% 78%)' }; }
function initials(name, hk) { return ((name || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || hk.slice(1, 3)).toUpperCase(); }
// finney: TAO/USDT ticker streamed from Binance; snapshot below is only the fallback until the stream connects
const PRICE_WS = 'wss://data-stream.binance.vision/ws/taousdt@ticker';
const PRICE_SNAPSHOT = { c: 185.10, P: 3.989, h: 186.10, l: 169.10, q: 16169472.5, E: 1795663101480 };
function usd(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const ORANGE = '#F59E3B', BLUE = '#7AA2F7', MUTED = '#8B97A6', TEXT = '#E6EDF3';

function fmtInt(n) { return n == null ? '—' : Math.round(n).toLocaleString('en-US'); }
function fmtK(n) {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  if (a >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(a < 10 ? 2 : 0);
}
function fmtNum(n, d) { return n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function pct(x, d) { return x == null ? '—' : x.toFixed(d == null ? 2 : d) + '%'; }
function signed(n, f) { return (n > 0 ? '+' : n < 0 ? '−' : '') + f(Math.abs(n)); }
function hue(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function dstr(ts) { const d = new Date(ts); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
function median(xs) { const a = xs.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function quant(xs, q) { const a = xs.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; return a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))]; }
function yOf(v, H, lo, hi) { return H - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * H; }
function linePath(arr, W, H, lo, hi) {
  let d = '', pen = false; const n = arr.length;
  if (!(hi > lo)) hi = lo + 1;
  arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + xAt(i, n, W).toFixed(1) + ' ' + yOf(v, H, lo, hi).toFixed(1) + ' '; pen = true; });
  return d.trim();
}
// x of point i of n; a single point sits in the middle instead of dividing by zero
function xAt(i, n, W) { return n > 1 ? (i / (n - 1)) * W : W / 2; }
function areaPath(arr, W, H, lo, hi) {
  const n = arr.length;
  if (!(hi > lo)) hi = lo + 1;
  const pts = arr.map((v, i) => v == null ? null : [xAt(i, n, W), yOf(v, H, lo, hi)]).filter(Boolean);
  if (pts.length < 2) return '';
  return 'M' + pts[0][0].toFixed(1) + ' ' + H + ' ' + pts.map((p) => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + H + ' Z';
}
function niceStep(r) { const p = Math.pow(10, Math.floor(Math.log10(r))); const m = r / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function ticks(lo, hi, count) { const st = niceStep((hi - lo) / count); const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6)); return out; }
function apyColor(v, m, accent) { if (v == null) return MUTED; if (m == null) return TEXT; if (v >= m + 0.4) return accent; if (v < m - 1) return ORANGE; return TEXT; }

const DIRS = { rank: -1, name: 1, stake: -1, take: 1, a1: -1, a7: -1, a30: -1, sd: 1, flow: -1, nom: -1 };
const COLS = [
  ['rank', '#', 'flex-start'], ['name', 'Validator', 'flex-start'], ['stake', 'Root stake', 'flex-end'], ['take', 'Take', 'flex-end'],
  ['a1', 'APY 1D', 'flex-end'], ['a7', 'APY 7D', 'flex-end'], ['a30', 'APY 30D', 'flex-end'], [null, 'Trend 7D', 'flex-start'],
  ['flow', 'Flow 30D', 'flex-end'], ['sd', 'Stability σ', 'flex-end'], ['nom', 'Nominator', 'flex-end'],
];
const WINS = [['a1', '1D'], ['a7', '7D'], ['a30', '30D']];
const MINS = [[0, 'All'], [1000, '≥ 1K τ'], [10000, '≥ 10K τ'], [100000, '≥ 100K τ']];

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { data: null, err: null, q: '', win: 'a30', min: 1000, sortKey: 'rank', dir: -1, hideTake: false, sel: null, hov: null, hovIdx: null, amt: '1,000', showAll: false, copied: false, px: null, pxLive: false, pxDir: 0, tab: 'root', sn: null, effMin: 1000, effSort: 'eff', effDir: -1, ehov: null, alpha: null, alphaErr: null };
  }

  connectPrice() {
    if (this.dead || typeof WebSocket === 'undefined') return;
    let ws;
    try { ws = new WebSocket(PRICE_WS); } catch (e) { this.retryPrice(); return; }
    this.ws = ws;
    ws.onopen = () => { this.wsTries = 0; };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      const c = parseFloat(m.c);
      if (!isFinite(c)) return;
      const prev = this.state.px ? this.state.px.c : null;
      this.setState({ pxLive: true, pxDir: prev == null || c === prev ? 0 : c > prev ? 1 : -1, px: { c, P: parseFloat(m.P), h: parseFloat(m.h), l: parseFloat(m.l), q: parseFloat(m.q), E: m.E } });
    };
    ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.setState({ pxLive: false }); this.retryPrice(); } };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  }

  retryPrice() {
    if (this.dead) return;
    this.wsTries = (this.wsTries || 0) + 1;
    clearTimeout(this.wsTimer);
    this.wsTimer = setTimeout(() => this.connectPrice(), Math.min(30000, 1000 * 2 ** this.wsTries));
  }

  // A page restored from the back/forward cache got `pagehide` (→ componentWillUnmount)
  // without a fresh mount, so revive the price stream here.
  onPageShow(e) {
    if (!e.persisted) return;
    this.dead = false;
    this.wsTries = 0;
    if (!this.ws) this.connectPrice();
  }

  // #v/<hotkey> opens a validator page, so the browser Back button and links work.
  hashSel() {
    try { const m = /^#v\/([1-9A-HJ-NP-Za-km-z]{40,60})$/.exec(window.location.hash); return m ? m[1] : null; } catch (e) { return null; }
  }

  onPopState() {
    const hk = this.hashSel();
    if (hk) { if (hk !== this.state.sel) this.show(hk); } else if (this.state.sel) this.closeDetail();
  }

  componentWillUnmount() {
    this.dead = true;
    clearTimeout(this.wsTimer);
    if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) { /* ignore */ } }
  }

  ticker(accent) {
    const S = this.state, p = S.px || PRICE_SNAPSHOT, live = S.pxLive && !!S.px;
    const t = new Date(p.E);
    return {
      price: '$' + p.c.toFixed(2),
      chg: signed(p.P, (n) => n.toFixed(2) + '%'), chgColor: p.P >= 0 ? accent : ORANGE,
      flash: !live || S.pxDir === 0 ? TEXT : S.pxDir > 0 ? accent : ORANGE,
      dot: live ? accent : '#5B6675', status: live ? 'live' : S.px ? 'reconnecting' : 'snapshot',
      title: 'Binance TAO/USDT · 24h high $' + p.h.toFixed(2) + ' · low $' + p.l.toFixed(2) + ' · vol ' + usd(p.q) + ' · ' + t.toISOString().slice(11, 19) + ' UTC',
    };
  }

  componentDidMount() {
    this.connectPrice();
    if (typeof window !== 'undefined' && window.addEventListener && !this.winBound) {
      this.winBound = true;
      window.addEventListener('pageshow', (e) => this.onPageShow(e));
      window.addEventListener('popstate', () => this.onPopState());
      const hk = this.hashSel();
      if (hk) this.setState({ sel: hk });
    }
    fetch(ALPHA_URL)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((a) => this.setState({ alpha: this.prepAlpha(a) }))
      .catch((e) => this.setState({ alphaErr: String((e && e.message) || e) }));
    fetch(DATA_URL)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => this.setState({ data: this.prep(d) }))
      .catch((e) => this.setState({ err: String((e && e.message) || e) }));
  }

  prep(d) {
    const v = d.v.map((x) => {
      const h = hue(x.hk);
      // stake history may start with nulls (no sample yet): flow runs from the first stored day
      const i0 = x.sh.findIndex((s) => s != null && s > 0);
      const s0 = i0 >= 0 ? x.sh[i0] : null;
      const span = i0 >= 0 && d.days && d.days[i0] ? Math.max(1, Math.round((d.ts - d.days[i0]) / 864e5)) : null;
      const label = x.n || (x.hk.slice(0, 6) + '…' + x.hk.slice(-4));
      const ini = ((x.n || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || x.hk.slice(1, 3)).toUpperCase();
      return Object.assign({}, x, {
        name: label, named: !!x.n, short: x.hk.slice(0, 8) + '…' + x.hk.slice(-6), ini,
        monoBg: 'hsl(' + h + ' 34% 20%)', monoFg: 'hsl(' + h + ' 70% 78%)',
        flow: s0 > 0 && span ? x.s - s0 : null, flowPct: s0 > 0 && span ? (x.s - s0) / s0 * 100 : null, flowDays: span,
        spark: linePath(x.d, 100, 28, 0, 10),
      });
    });
    const big = v.filter((x) => x.s >= 1000);
    const ranked = big.filter((x) => x.a30 != null).sort((a, b) => b.a30 - a.a30);
    ranked.forEach((x, i) => { x.rank30 = i + 1; });
    const wDen = ranked.reduce((a, x) => a + x.s, 0);
    const wApy = wDen > 0 ? ranked.reduce((a, x) => a + x.a30 * x.s, 0) / wDen : null;
    const meds = { a1: median(big.map((x) => x.a1)), a7: median(big.map((x) => x.a7)), a30: median(big.map((x) => x.a30)) };
    const flowSpan = Math.max(0, ...v.map((x) => x.flowDays || 0)) || 30;
    return Object.assign({}, d, { byHk: new Map(v.map((x) => [x.hk, x])), v, ranked, wApy, meds, best: ranked[0], flowSpan, totalStake: v.reduce((a, x) => a + x.s, 0), bigCount: big.length, maxS: Math.max.apply(null, v.map((x) => x.s)) });
  }

  sortBy(key) {
    if (this.state.sortKey === key) this.setState({ dir: -this.state.dir });
    else this.setState({ sortKey: key, dir: DIRS[key] });
  }

  // Detail page for any validator: basket (root) validators get the full page, alpha-only
  // ones the alpha page. The list scroll position is kept for the way back.
  show(hk) {
    if (!this.inDetail && typeof window !== 'undefined') this.listY = window.scrollY || 0;
    this.setState({ sel: hk, hovIdx: null, hov: null, copied: false, poolsAll: false });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  }

  open(hk) {
    this.show(hk);
    try { if (window.location.hash !== '#v/' + hk) window.history.pushState({ vr: 1 }, '', '#v/' + hk); } catch (e) { /* no history API */ }
  }

  closeDetail(patch) {
    const y = this.listY || 0;
    this.setState(Object.assign({ sel: null }, patch || {}));
    if (typeof window !== 'undefined' && window.requestAnimationFrame) window.requestAnimationFrame(() => window.scrollTo(0, patch ? 0 : y));
  }

  // In-page back button: pop our own history entry when there is one (popstate closes the
  // page), otherwise just drop the hash.
  back() {
    try {
      if (window.history.state && window.history.state.vr) { window.history.back(); return; }
      if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* no history API */ }
    this.closeDetail();
  }

  // Leave the detail page for a tab of the list (e.g. a subnet), without a history entry.
  leaveTo(patch) {
    try { if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
    this.closeDetail(patch);
  }

  copyHk(hk) {
    const done = (ok) => {
      this.setState({ copied: ok ? 'ok' : 'fail' });
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.setState({ copied: false }), 1800);
    };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
      navigator.clipboard.writeText(hk).then(() => done(true), () => done(false));
    } catch (e) { done(false); }
  }

  copyTxt() { const c = this.state.copied; return c === 'ok' ? 'Copied' : c === 'fail' ? 'Copy failed: select the key' : 'Copy hotkey'; }

  renderVals() {
    const accent = this.props.accent ?? '#3DDBB0';
    const S = this.state, D = S.data;
    const base = { accent, tk: this.ticker(accent), loading: !D && !S.err, failed: !!S.err, err: S.err, ready: !!D, skel: [1, 2, 3, 4, 5, 6, 7, 8] };
    this.px = (S.px || PRICE_SNAPSHOT).c;
    if (!D) return Object.assign(base, { listView: false, detailView: false });
    const t = new Date(D.ts);
    Object.assign(base, {
      blockTxt: fmtInt(D.block),
      timeTxt: dstr(D.ts) + '/' + t.getUTCFullYear() + ' ' + String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ' UTC',
    });
    const sel = S.sel ? D.v.find((x) => x.hk === S.sel) : null;
    const back = () => this.back();
    this.inDetail = false;
    this.inDetail = !!sel;
    if (sel) return Object.assign(base, { listView: false, detailView: true, alphaView: false, d: this.detail(sel, D, accent), amt: S.amt, onAmt: (e) => this.setState({ amt: e.target.value }), back });
    const asel = S.sel && S.alpha ? S.alpha.byHk.get(S.sel) : null;
    this.inDetail = !!asel;
    if (asel) return Object.assign(base, { listView: false, detailView: false, alphaView: true, ad: this.alphaDetail(asel, D, accent), back });
    return Object.assign(base, { listView: true, detailView: false, alphaView: false }, this.list(D, accent), this.tabsVals(D, accent));
  }

  list(D, accent) {
    const S = this.state, win = S.win, m = D.meds[win];
    const winLabel = WINS.find((w) => w[0] === win)[1];
    const q = S.q.trim().toLowerCase();
    const list = D.v.filter((x) => x.s >= S.min && (!S.hideTake || x.t <= 0.10) &&
      (!q || x.name.toLowerCase().includes(q) || x.hk.toLowerCase().includes(q) || (x.ck || '').toLowerCase().includes(q)));
    const rankOf = new Map();
    list.filter((x) => x[win] != null).sort((a, b) => b[win] - a[win]).forEach((x, i) => rankOf.set(x.hk, i + 1));
    const get = { rank: (x) => x[win], name: (x) => x.name.toLowerCase(), stake: (x) => x.s, take: (x) => x.t, a1: (x) => x.a1, a7: (x) => x.a7, a30: (x) => x.a30, sd: (x) => x.sd, flow: (x) => x.flow, nom: (x) => x.nom }[S.sortKey];
    const sorted = list.slice().sort((a, b) => { const va = get(a), vb = get(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (va < vb ? -1 : va > vb ? 1 : 0) * S.dir; });
    const shown = S.showAll ? sorted : sorted.slice(0, 50);
    const medY = (28 - Math.max(0, Math.min(10, m || 0)) / 10 * 28).toFixed(1);
    const logMax = Math.log10(D.maxS);
    const cell = (x, k) => ({ t: pct(x[k]), color: apyColor(x[k], D.meds[k], accent), weight: k === win ? 700 : 400 });

    const rows = shown.map((x) => {
      const r = rankOf.get(x.hk);
      return {
        rank: r || '—', rankColor: r && r <= 3 ? accent : MUTED,
        name: x.name, nameColor: x.named ? TEXT : '#A9B4C2', short: x.short, ini: x.ini, monoBg: x.monoBg, monoFg: x.monoFg,
        aria: x.name + ', APY ' + winLabel + ' ' + pct(x[win]) + ', view details',
        stake: fmtInt(x.s), stakeUsd: '≈ ' + usd(x.s * this.px), stakeBar: x.s >= 1 ? Math.max(2, Math.log10(x.s) / logMax * 100).toFixed(1) : '0',
        take: pct(x.t * 100, 0), takeBg: x.t >= 0.15 ? '#2A1D0E' : x.t === 0 ? '#12281F' : '#161C25', takeFg: x.t >= 0.15 ? ORANGE : x.t === 0 ? accent : '#C9D1D9',
        c1: cell(x, 'a1'), c7: cell(x, 'a7'), c30: cell(x, 'a30'),
        spark: x.spark, medY, sparkColor: x.a30 != null && D.meds.a30 != null && x.a30 < D.meds.a30 - 1 ? ORANGE : accent,
        flow: x.flow == null ? '—' : signed(x.flow, fmtK) + ' τ', flowPct: x.flowPct == null ? '' : signed(x.flowPct, (n) => n.toFixed(1) + '%') + (x.flowDays < D.flowSpan ? ' · ' + x.flowDays + 'D' : ''),
        flowColor: x.flow == null || Math.abs(x.flow) < 0.5 ? MUTED : x.flow > 0 ? accent : ORANGE,
        sd: x.sd == null ? '—' : x.sd.toFixed(2), sdColor: x.sd == null ? MUTED : x.sd > 3 ? ORANGE : '#C9D1D9',
        nom: fmtInt(x.nom),
        open: () => this.open(x.hk),
      };
    });

    const cols = COLS.map(([key, label0, justify]) => {
      const label = key === 'flow' ? 'Flow ' + D.flowSpan + 'D' : label0;
      const active = key && (S.sortKey === key);
      const isWin = key === win;
      return {
        label, justify, sortable: !!key, plain: !key,
        color: active ? accent : isWin ? TEXT : MUTED,
        arrow: active ? (S.dir < 0 ? '↓' : '↑') : '',
        aria: 'Sort by ' + label,
        sort: key ? () => this.sortBy(key) : null,
      };
    });

    const best = D.best;
    const stats = [
      { label: 'Validators', value: fmtInt(D.v.length), sub: D.ranked.length + ' with ≥ 1K τ and 30 days of data', color: TEXT },
      { label: 'Total root stake', value: fmtK(D.totalStake) + ' τ', sub: '≈ ' + usd(D.totalStake * this.px) + ' at TAO ' + usd(this.px), color: TEXT },
      { label: 'Median APY 30D', value: pct(D.meds.a30), sub: 'validators ≥ 1K τ', color: BLUE },
      { label: 'Stake-weighted APY 30D', value: pct(D.wApy), sub: 'weighted by root stake', color: TEXT },
      { label: 'Best APY 30D', value: best ? pct(best.a30) : '—', sub: best ? best.name + ' · take ' + pct(best.t * 100, 0) : 'needs 30 days of samples', color: accent },
    ];

    // scatter
    const pts = list.filter((x) => x[win] != null && x.s >= 1);
    const vals = pts.map((x) => x[win]);
    const lo = Math.max(0, Math.floor((quant(vals, 0.03) ?? 0) - 0.5));
    const hi = Math.ceil((quant(vals, 0.97) ?? 6) + 0.5);
    const maxS = Math.max(1, ...pts.map((x) => x.s));
    const yp = (v) => (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * 100;
    const xp = (t) => Math.min(100, t / 0.2 * 100);
    const n = pts.length;
    let slope = null, icpt = null;
    if (n > 3) {
      const mx = pts.reduce((a, x) => a + x.t * 100, 0) / n, my = vals.reduce((a, y) => a + y, 0) / n;
      let sxy = 0, sxx = 0; pts.forEach((x) => { sxy += (x.t * 100 - mx) * (x[win] - my); sxx += (x.t * 100 - mx) ** 2; });
      if (sxx > 0) { slope = sxy / sxx; icpt = my - slope * mx; }
    }
    const hov = S.hov ? pts.find((x) => x.hk === S.hov) : null;
    const sc = {
      pts: pts.sort((a, b) => b.s - a.s).map((x) => {
        const size = Math.round(7 + Math.sqrt(x.s / maxS) * 28);
        const on = S.hov === x.hk;
        return {
          x: xp(x.t).toFixed(2), y: yp(x[win]).toFixed(2), size, half: size / 2,
          fill: on ? accent : apyColor(x[win], D.meds[win], accent) === ORANGE ? 'rgba(245,158,59,0.30)' : 'rgba(61,219,176,0.22)',
          stroke: on ? TEXT : apyColor(x[win], D.meds[win], accent) === ORANGE ? ORANGE : accent,
          aria: x.name + ': APY ' + pct(x[win]) + ', take ' + pct(x.t * 100, 0),
          open: () => this.open(x.hk), enter: () => this.setState({ hov: x.hk }), leave: () => this.setState({ hov: null }),
        };
      }),
      yTicks: ticks(lo, hi, 4).map((v) => ({ pos: yp(v).toFixed(2), label: v + '%' })),
      xTicks: [0, 5, 10, 15, 20].map((v) => ({ pos: v * 5, label: v + '%' })),
      trend: slope == null ? '' : 'M0 ' + (100 - yp(icpt)).toFixed(2) + ' L100 ' + (100 - yp(icpt + slope * 20)).toFixed(2),
      slopeTxt: slope == null ? '—' : signed(slope, (v) => v.toFixed(3) + '%'),
      hasTip: !!hov,
      tip: hov ? { x: xp(hov.t).toFixed(2), y: yp(hov[win]).toFixed(2), shift: xp(hov.t) > 70 ? '-90%' : xp(hov.t) < 20 ? '-10%' : '-50%', name: hov.name, apy: pct(hov[win]), take: pct(hov.t * 100, 0), stake: fmtK(hov.s) } : {},
    };

    // histogram
    const hlo = Math.max(0, Math.floor(quant(vals, 0.02) ?? 0)), hhi = Math.max(hlo + 2, Math.ceil(quant(vals, 0.98) ?? 6));
    const bw = 0.5, nb = Math.round((hhi - hlo) / bw);
    const counts = new Array(nb).fill(0);
    vals.forEach((v) => { counts[Math.max(0, Math.min(nb - 1, Math.floor((v - hlo) / bw)))]++; });
    const cmax = Math.max(1, ...counts);
    const hm = median(vals);
    const hist = {
      n: vals.length,
      bins: counts.map((c, i) => {
        const a = hlo + i * bw;
        return { h: (c / cmax * 88).toFixed(1), count: c || '', label: Number.isInteger(a) ? a + '%' : '', title: a.toFixed(1) + '–' + (a + bw).toFixed(1) + '%: ' + c + ' validators', fill: hm != null && a + bw <= hm - 1 ? '#5A3A16' : a >= (hm ?? 0) + 0.5 ? '#1F5E4D' : '#283444' };
      }),
      medPos: hm == null ? 0 : ((hm - hlo) / (hhi - hlo) * 100).toFixed(2), medTxt: pct(hm),
      p90: pct(quant(vals, 0.9)), p10: pct(quant(vals, 0.1)),
      spread: vals.length ? (quant(vals, 0.9) - quant(vals, 0.1)).toFixed(2) + ' pp' : '—',
    };

    // flows
    const fl = D.v.filter((x) => x.s >= 1000 && x.flow != null);
    const inn = fl.slice().sort((a, b) => b.flow - a.flow).filter((x) => x.flow > 0).slice(0, 5);
    const out = fl.slice().sort((a, b) => a.flow - b.flow).filter((x) => x.flow < 0).slice(0, 4);
    const fmax = Math.max(1, ...inn.concat(out).map((x) => Math.abs(x.flow)));
    const frow = (x) => ({ name: x.name, w: (Math.abs(x.flow) / fmax * 100).toFixed(1), txt: signed(x.flow, fmtK) + ' τ', open: () => this.open(x.hk) });

    return {
      stats, sc, hist, flows: { inn: inn.map(frow), out: out.map(frow), title: 'Root stake flows, ' + D.flowSpan + ' days' },
      winLabel, medTxt: pct(m), countTxt: fmtInt(sorted.length), empty: sorted.length === 0,
      hasMore: !S.showAll && sorted.length > 50, showAll: () => this.setState({ showAll: true }),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value, showAll: false }),
      wins: WINS.map(([k, l]) => ({ label: l, on: k === win, bg: k === win ? accent : 'transparent', fg: k === win ? '#0A0E13' : '#A9B4C2', pick: () => this.setState({ win: k }) })),
      mins: MINS.map(([v, l]) => ({ label: l, on: S.min === v, bg: S.min === v ? '#16231F' : 'transparent', border: S.min === v ? accent : '#232C38', fg: S.min === v ? accent : '#A9B4C2', pick: () => this.setState({ min: v, showAll: false }) })),
      hideTake: S.hideTake, toggleTake: () => this.setState({ hideTake: !S.hideTake }),
      takeChip: { bg: S.hideTake ? '#16231F' : 'transparent', border: S.hideTake ? accent : '#232C38', fg: S.hideTake ? accent : '#A9B4C2', mark: S.hideTake ? '✓' : '' },
      cols, rows,
    };
  }

  prepAlpha(a) {
    const vs = a.v.map((v) => Object.assign({}, v, { pairs: [] }));
    const sns = new Map(a.subnets.map((s) => [s.nu, Object.assign({}, s, { pairs: [] })]));
    a.p.forEach((row) => {
      const p = { v: vs[row[0]], nu: row[1], tao: row[2], a1: row[3], a7: row[4], a30: row[5], eff: row[6], ct: row[7], rk: row[8] };
      p.v.pairs.push(p);
      const s = sns.get(p.nu); if (s) s.pairs.push(p);
    });
    sns.forEach((s) => s.pairs.sort((x, y) => (y.a30 ?? -1e9) - (x.a30 ?? -1e9)));
    vs.forEach((v) => v.pairs.sort((x, y) => y.tao - x.tao));
    return { sample: !!a.sample, block: a.block, vs, sns, byHk: new Map(vs.map((v) => [v.hk, v])), snList: a.subnets.map((s) => sns.get(s.nu)) };
  }

  vname(hk, n) {
    const D = this.state.data, r = D && D.byHk.get(hk);
    return n || (r && r.named ? r.name : null) || (hk.slice(0, 6) + '…' + hk.slice(-4));
  }

  openAny(hk) { const D = this.state.data, A = this.state.alpha; if ((D && D.byHk.has(hk)) || (A && A.byHk.has(hk))) this.open(hk); }

  tabsVals(D, accent) {
    const S = this.state, A = S.alpha;
    const tabs = [['root', 'Root stake', fmtInt(D.v.length)], ['alpha', 'Alpha by subnet', A ? fmtInt(A.snList.length) : '…'], ['eff', 'Validator efficiency', A ? fmtInt(A.vs.filter((v) => v.eff != null).length) : '…']]
      .map(([k, label, count]) => ({ label, count, on: S.tab === k, bg: S.tab === k ? '#1A222D' : 'transparent', fg: S.tab === k ? TEXT : '#A9B4C2', countBg: S.tab === k ? '#12281F' : '#161C25', pick: () => this.setState({ tab: k, q: '', showAll: false }) }));
    const out = { tabs, isRoot: S.tab === 'root', isAlpha: false, isEff: false, alWait: false, alWaitTxt: '', showSample: false, alSnCount: '', alBlock: '' };
    if (S.tab === 'root') return out;
    if (!A) return Object.assign(out, { alWait: true, alWaitTxt: S.alphaErr ? 'Couldn’t load alpha data (' + S.alphaErr + ').' : 'Loading alpha data…' });
    Object.assign(out, { showSample: A.sample, alSnCount: fmtInt(A.snList.length), alBlock: fmtInt(A.block) });
    if (S.tab === 'alpha') return Object.assign(out, { isAlpha: true, al: this.alphaTab(A, accent) });
    return Object.assign(out, { isEff: true, ef: this.effTab(D, A, accent) });
  }

  alphaTab(A, accent) {
    const S = this.state, q = S.q.trim().toLowerCase();
    const match = (s) => !q || ('sn' + s.nu) === q.replace(/\s/g, '') || String(s.nu) === q || (s.name || '').toLowerCase().includes(q) ||
      s.pairs.some((p) => this.vname(p.v.hk, p.v.n).toLowerCase().includes(q));
    const list = A.snList.filter(match);
    // the right panel follows the filtered list: keep the pick while it matches, else the first match
    const cur = list.find((s) => s.nu === S.sn) || list[0] || null;
    const curNu = cur ? cur.nu : null;
    const dpTxt = (x) => x == null ? '—' : signed(x, (n) => n.toFixed(1) + '%');
    const dpCol = (x) => x == null ? MUTED : x >= 0 ? accent : ORANGE;
    const snRows = list.map((s) => ({
      sn: 'SN' + s.nu, name: s.name || 'Subnet ' + s.nu, ref: pct(s.ref, 1), dp: dpTxt(s.dp30), dpColor: dpCol(s.dp30),
      on: s.nu === curNu, bg: s.nu === curNu ? '#151C26' : 'transparent', mark: s.nu === curNu ? accent : 'transparent',
      pick: () => this.setState({ sn: s.nu }),
    }));
    if (!cur) {
      return { snRows, noSn: true, hasCur: false, noCur: true, noCurTxt: A.snList.length ? 'No subnet matches “' + S.q.trim() + '”.' : 'No subnet data yet: the collector has not stored alpha samples.', cur: { sn: '', name: '', kpis: [] }, rows: [] };
    }
    const kpis = [
      { label: 'Reference APY 30D', value: pct(cur.ref, 1), color: accent },
      { label: 'Alpha price', value: cur.price == null ? '—' : cur.price.toFixed(5) + ' τ', color: TEXT },
      { label: 'Price 7D', value: dpTxt(cur.dp7), color: dpCol(cur.dp7) },
      { label: 'Price 30D', value: dpTxt(cur.dp30), color: dpCol(cur.dp30) },
      { label: 'Validators', value: fmtInt(cur.n), color: TEXT },
      { label: 'Alpha staked', value: fmtK(cur.tao) + ' τ', color: TEXT },
    ];
    const rows = cur.pairs.filter((p) => p.tao >= 1).map((p) => {
      const name = this.vname(p.v.hk, p.v.n), m = mono(p.v.hk);
      return Object.assign({}, m, {
        rank: p.rk || '—', rankColor: p.rk && p.rk <= 3 ? accent : MUTED, name, ini: initials(name, p.v.hk),
        aria: name + ' on SN' + cur.nu + ', alpha APY 30D ' + pct(p.a30),
        tao: fmtInt(p.tao), take: pct(p.v.t * 100, 0), takeBg: p.v.t >= 0.15 ? '#2A1D0E' : p.v.t === 0 ? '#12281F' : '#161C25', takeFg: p.v.t >= 0.15 ? ORANGE : p.v.t === 0 ? accent : '#C9D1D9',
        a1: pct(p.a1, 1), a7: pct(p.a7, 1), a30: pct(p.a30, 1), a30Color: p.eff == null ? MUTED : effColor(p.eff, accent),
        eff: p.eff == null ? '—' : Math.min(p.eff, 100).toFixed(0) + '%', effW: p.eff == null ? 0 : Math.min(100, p.eff).toFixed(1), effColor: effColor(p.eff, accent),
        ct: p.ct == null ? 'n/a' : pct(p.ct, 1), ctColor: p.ct != null && p.ct >= 5 ? ORANGE : '#A9B4C2',
        open: () => this.openAny(p.v.hk),
      });
    });
    return { snRows, noSn: list.length === 0, hasCur: true, noCur: false, noCurTxt: '', cur: { sn: 'SN' + cur.nu, name: cur.name || 'Subnet ' + cur.nu, kpis }, rows };
  }

  effTab(D, A, accent) {
    const S = this.state, q = S.q.trim().toLowerCase();
    const items = A.vs.filter((v) => v.eff != null && v.tao >= S.effMin).map((v) => {
      const r = D.byHk.get(v.hk);
      return { v, name: this.vname(v.hk, v.n), root: r ? r.a30 : null, et: Math.max(0, v.et) };
    }).filter((x) => !q || x.name.toLowerCase().includes(q) || x.v.hk.toLowerCase().includes(q));
    const rankOf = new Map(); items.slice().sort((a, b) => b.v.eff - a.v.eff).forEach((x, i) => rankOf.set(x.v.hk, i + 1));
    const get = { rank: (x) => x.v.eff, name: (x) => x.name.toLowerCase(), tao: (x) => x.v.tao, ns: (x) => x.v.ns, t: (x) => x.v.t, cfg: (x) => x.v.cfg, et: (x) => x.et, eff: (x) => x.v.eff, a30: (x) => x.v.a30, root: (x) => x.root }[S.effSort];
    const sorted = items.slice().sort((a, b) => { const va = get(a), vb = get(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (va < vb ? -1 : va > vb ? 1 : 0) * S.effDir; });
    const rows = sorted.map((x) => {
      const v = x.v, rk = rankOf.get(v.hk);
      return Object.assign({}, mono(v.hk), {
        rank: rk || '—', rankColor: rk && rk <= 3 ? accent : MUTED, name: x.name, ini: initials(x.name, v.hk), short: v.hk.slice(0, 8) + '…' + v.hk.slice(-6),
        aria: x.name + ', efficiency ' + pct(v.eff, 1), tao: fmtInt(v.tao), ns: v.ns, t: pct(v.t * 100, 0), cfg: v.cfg == null ? 'n/a' : pct(v.cfg, 1),
        et: pct(x.et, 1), etColor: x.et - v.t * 100 > 5 ? ORANGE : TEXT,
        eff: pct(Math.min(v.eff, 100), 1), effW: Math.min(100, v.eff).toFixed(1), effColor: effColor(v.eff, accent),
        a30: pct(v.a30, 1), root: pct(x.root), rootColor: x.root == null ? MUTED : apyColor(x.root, D.meds.a30, accent),
        open: () => this.openAny(v.hk),
      });
    });
    const cols = EFF_COLS.map(([key, label, justify]) => ({
      label, justify, color: S.effSort === key ? accent : MUTED, arrow: S.effSort === key ? (S.effDir < 0 ? '↓' : '↑') : '', aria: 'Sort by ' + label,
      sort: () => (S.effSort === key ? this.setState({ effDir: -S.effDir }) : this.setState({ effSort: key, effDir: EFF_DIRS[key] })),
    }));
    // scatter: listed take vs effective take
    const ymax = Math.max(40, Math.ceil(Math.max(0, ...items.map((x) => x.et)) / 10) * 10);
    const maxT = Math.max(1, ...items.map((x) => x.v.tao));
    const hov = S.ehov ? items.find((x) => x.v.hk === S.ehov) : null;
    const xp = (t) => Math.min(100, t * 100 / 20 * 100), yp = (e) => Math.min(100, e / ymax * 100);
    const pts = items.slice().sort((a, b) => b.v.tao - a.v.tao).map((x) => {
      const size = Math.round(8 + Math.sqrt(x.v.tao / maxT) * 26), on = S.ehov === x.v.hk, hidden = x.et - x.v.t * 100 > 5;
      return {
        x: xp(x.v.t).toFixed(2), y: yp(x.et).toFixed(2), size, half: size / 2, aria: x.name + ': listed ' + pct(x.v.t * 100, 0) + ', effective ' + pct(x.et, 1),
        fill: on ? accent : hidden ? 'rgba(245,158,59,0.30)' : 'rgba(61,219,176,0.22)', stroke: on ? TEXT : hidden ? ORANGE : accent,
        open: () => this.openAny(x.v.hk), enter: () => this.setState({ ehov: x.v.hk }), leave: () => this.setState({ ehov: null }),
      };
    });
    const gaps = items.map((x) => ({ x, gap: x.et - x.v.t * 100 })).filter((g) => g.gap > 3).sort((a, b) => b.gap - a.gap).slice(0, 6);
    const gmax = Math.max(1, ...gaps.map((g) => g.gap));
    return {
      cols, rows, empty: rows.length === 0, pts,
      yTicks: ticks(0, ymax, 4).map((v) => ({ pos: yp(v).toFixed(2), label: v + '%' })),
      xTicks: [0, 5, 10, 15, 20].map((v) => ({ pos: v * 5, label: v + '%' })),
      diag: 'M0 100 L100 ' + (100 - yp(20)).toFixed(2), diagLabelPos: (yp(20) + 2).toFixed(2),
      hasTip: !!hov, tip: hov ? { x: xp(hov.v.t).toFixed(2), y: yp(hov.et).toFixed(2), shift: xp(hov.v.t) > 70 ? '-90%' : xp(hov.v.t) < 20 ? '-10%' : '-50%', name: hov.name, t: pct(hov.v.t * 100, 0), et: pct(hov.et, 1) } : {},
      hidden: gaps.map((g) => ({ name: g.x.name, t: pct(g.x.v.t * 100, 0), et: pct(g.x.et, 1), gap: '+' + g.gap.toFixed(1) + ' pp', w: (g.gap / gmax * 100).toFixed(1), open: () => this.openAny(g.x.v.hk) })),
      noHidden: gaps.length === 0,
      mins: ALPHA_MINS.map(([v, l]) => ({ label: l, on: S.effMin === v, bg: S.effMin === v ? '#16231F' : 'transparent', border: S.effMin === v ? accent : '#232C38', fg: S.effMin === v ? accent : '#A9B4C2', pick: () => this.setState({ effMin: v }) })),
    };
  }

  detailAlpha(hk, accent) {
    const A = this.state.alpha, v = A && A.byHk.get(hk);
    if (!v || !v.pairs.length) return { has: false };
    const shown = v.pairs.filter((p) => p.tao >= 1).slice(0, 20);
    const dpCol = (x) => x == null ? MUTED : x >= 0 ? accent : ORANGE;
    return {
      has: true, total: v.pairs.length, shown: shown.length, more: v.pairs.length > shown.length,
      kpis: [
        { label: 'Alpha stake', value: fmtK(v.tao) + ' τ', color: TEXT },
        { label: 'Subnets', value: fmtInt(v.ns), color: TEXT },
        { label: 'Efficiency', value: v.eff == null ? '—' : pct(Math.min(100, v.eff), 1), color: effColor(v.eff, accent) },
        { label: 'Effective take', value: v.et == null ? '—' : pct(Math.max(0, v.et), 1), color: v.et != null && v.et - v.t * 100 > 5 ? ORANGE : TEXT },
        { label: 'α APY 30D (weighted)', value: pct(v.a30, 1), color: TEXT },
      ],
      rows: shown.map((p) => {
        const s = A.sns.get(p.nu) || {};
        return {
          sn: 'SN' + p.nu, name: s.name || 'Subnet ' + p.nu, tao: fmtInt(p.tao), a30: pct(p.a30, 1),
          rank: p.rk ? '#' + p.rk + ' / ' + s.n : '—', rankColor: p.rk === 1 ? accent : '#C9D1D9',
          eff: p.eff == null ? '—' : Math.min(100, p.eff).toFixed(0) + '%', effW: p.eff == null ? 0 : Math.min(100, p.eff).toFixed(1), effColor: effColor(p.eff, accent),
          dp: s.dp30 == null ? '—' : signed(s.dp30, (n) => n.toFixed(1) + '%'), dpColor: dpCol(s.dp30),
          go: () => this.leaveTo({ tab: 'alpha', sn: p.nu, q: '' }),
        };
      }),
    };
  }

  // Page for a validator with alpha stake but no root basket (most of the efficiency tab).
  alphaDetail(v, D, accent) {
    const S = this.state, A = S.alpha;
    const name = this.vname(v.hk, v.n), m = mono(v.hk);
    const ranked = A.vs.filter((x) => x.eff != null && x.tao >= 1000).sort((a, b) => b.eff - a.eff);
    const rk = ranked.findIndex((x) => x.hk === v.hk) + 1;
    const rankTxt = rk ? '#' + rk + ' / ' + ranked.length + ' by efficiency' : 'unranked (needs ≥ 1K τ and 30D data)';
    const take = v.t || 0, et = v.et == null ? null : Math.max(0, v.et);
    const kpis = [
      { label: 'Alpha stake', value: fmtK(v.tao) + ' τ', color: TEXT, sub: '≈ ' + usd(v.tao * this.px), subColor: MUTED },
      { label: 'Efficiency', value: v.eff == null ? '—' : pct(Math.min(100, v.eff), 1), color: effColor(v.eff, accent), sub: 'APY ÷ subnet reference, stake-weighted', subColor: MUTED },
      { label: 'Effective take', value: et == null ? '—' : pct(et, 1), color: et != null && et - take * 100 > 5 ? ORANGE : TEXT, sub: 'listed ' + pct(take * 100, 0) + ' · configured ' + (v.cfg == null ? 'n/a' : pct(v.cfg, 1)), subColor: MUTED },
      { label: 'α APY 30D', value: pct(v.a30, 2), color: accent, sub: 'stake-weighted over subnets', subColor: MUTED },
      { label: 'α APY 7D', value: pct(v.a7, 2), color: TEXT, sub: 'stake-weighted over subnets', subColor: MUTED },
      { label: 'Childkey take', value: v.ct == null ? '—' : pct(v.ct, 1), color: v.ct != null && v.ct >= 5 ? ORANGE : TEXT, sub: 'paid to child hotkeys, weighted', subColor: MUTED },
    ];
    const pools = v.pairs.filter((p) => p.tao >= 1);
    const shown = S.poolsAll ? pools : pools.slice(0, 30);
    const dpCol = (x) => x == null ? MUTED : x >= 0 ? accent : ORANGE;
    const rows = shown.map((p) => {
      const s = A.sns.get(p.nu) || {};
      return {
        sn: 'SN' + p.nu, name: s.name || 'Subnet ' + p.nu, tao: fmtInt(p.tao),
        a1: pct(p.a1, 1), a7: pct(p.a7, 1), a30: pct(p.a30, 1), a30Color: p.eff == null ? MUTED : effColor(p.eff, accent), ref: pct(s.ref, 1),
        eff: p.eff == null ? '—' : Math.min(100, p.eff).toFixed(0) + '%', effW: p.eff == null ? 0 : Math.min(100, p.eff).toFixed(1), effColor: effColor(p.eff, accent),
        rank: p.rk ? '#' + p.rk + ' / ' + s.n : '—', rankColor: p.rk === 1 ? accent : '#C9D1D9',
        ct: p.ct == null ? 'n/a' : pct(p.ct, 1), ctColor: p.ct != null && p.ct >= 5 ? ORANGE : '#A9B4C2',
        dp: s.dp30 == null ? '—' : signed(s.dp30, (n) => n.toFixed(1) + '%'), dpColor: dpCol(s.dp30),
        aria: 'SN' + p.nu + ' ' + (s.name || '') + ', alpha APY 30D ' + pct(p.a30) + ', open subnet',
        go: () => this.leaveTo({ tab: 'alpha', sn: p.nu, q: '' }),
      };
    });
    return Object.assign({}, m, {
      name, hk: v.hk, ini: initials(name, v.hk), rankTxt, take: pct(take * 100, 0),
      takeBg: take >= 0.15 ? '#2A1D0E' : take === 0 ? '#12281F' : '#161C25', takeFg: take >= 0.15 ? ORANGE : take === 0 ? accent : '#C9D1D9',
      nsTxt: fmtInt(v.ns) + (v.ns === 1 ? ' subnet' : ' subnets') + ' ≥ 10 τ', kpis, rows, empty: rows.length === 0,
      more: !S.poolsAll && pools.length > shown.length, moreTxt: 'Show all ' + pools.length + ' subnets', showAll: () => this.setState({ poolsAll: true }),
      copyTxt: this.copyTxt(), copy: () => this.copyHk(v.hk),
    });
  }

  detail(x, D, accent) {
    const S = this.state;
    const rankTxt = x.rank30 ? '#' + x.rank30 + ' / ' + D.ranked.length + ' · top ' + Math.max(1, Math.ceil(x.rank30 / D.ranked.length * 100)) + '%' : 'unranked (30D)';
    const dv = (v, m) => v == null || m == null ? { sub: 'not enough data', subColor: MUTED } : { sub: signed(v - m, (n) => n.toFixed(2)) + ' pp vs median', subColor: v >= m ? accent : ORANGE };
    const kpis = [
      Object.assign({ label: 'APY 30D', value: pct(x.a30), color: accent }, dv(x.a30, D.meds.a30)),
      Object.assign({ label: 'APY 7D', value: pct(x.a7), color: TEXT }, dv(x.a7, D.meds.a7)),
      Object.assign({ label: 'APY 1D', value: pct(x.a1), color: TEXT }, dv(x.a1, D.meds.a1)),
      { label: 'Root stake', value: fmtK(x.s) + ' τ', color: TEXT, sub: x.flowPct == null ? 'no history yet' : signed(x.flowPct, (n) => n.toFixed(1) + '%') + ' over ' + x.flowDays + ' days', subColor: x.flow > 0 ? accent : x.flow < 0 ? ORANGE : MUTED },
      { label: 'Stability σ', value: x.sd == null ? '—' : x.sd.toFixed(2), color: TEXT, sub: 'std dev of 7D APY (lower = steadier)', subColor: MUTED },
    ];

    // APY chart
    const ser = x.d, med = D.med, N = ser.length;
    const all = ser.concat(med).filter((v) => v != null);
    const lo = all.length ? Math.max(0, Math.floor(Math.min(...all) - 0.5)) : 0;
    const hi = all.length ? Math.ceil(Math.max(...all) + 0.5) : 10;
    const tp = (v) => ((1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100);
    const hi_ = S.hovIdx;
    const hv = hi_ != null ? ser[hi_] : null, hm = hi_ != null ? med[hi_] : null;
    const ch = {
      line: linePath(ser, 600, 200, lo, hi), area: areaPath(ser, 600, 200, lo, hi), med: linePath(med, 600, 200, lo, hi),
      ticks: ticks(lo, hi, 5).map((v) => ({ pos: tp(v).toFixed(2), label: v + '%' })),
      xl: [0, 6, 12, 18, N - 1].map((j) => ({ pos: (j / (N - 1) * 100).toFixed(2), label: dstr(D.days[j + 7]) })),
      pauseL: (PAUSE[0] / (N - 1) * 100).toFixed(2), pauseW: ((PAUSE[1] - PAUSE[0]) / (N - 1) * 100).toFixed(2),
      cols: ser.map((_, j) => ({ enter: () => this.setState({ hovIdx: j }) })),
      leave: () => this.setState({ hovIdx: null }),
      hasTip: hi_ != null && hv != null,
      tip: hi_ != null && hv != null ? {
        x: (hi_ / (N - 1) * 100).toFixed(2), vy: tp(hv).toFixed(2), my: hm == null ? 0 : tp(hm).toFixed(2),
        shift: hi_ > N * 0.7 ? 'calc(-100% - 12px)' : '12px', date: dstr(D.days[hi_ + 7]),
        v: x.name + ' ' + pct(hv), m: pct(hm), diff: hm == null ? '' : signed(hv - hm, (n) => n.toFixed(2)) + ' pp', diffColor: hm != null && hv >= hm ? accent : ORANGE,
      } : {},
    };

    // stake chart
    const sh = x.sh, shv = sh.filter((v) => v != null);
    const smin = shv.length ? Math.min(...shv) : 0, smax = shv.length ? Math.max(...shv) : 1;
    const pad = Math.max(1, (smax - smin) * 0.15);
    const slo = Math.max(0, smin - pad), shi = smax + pad;
    const first = sh.find((v) => v > 0);
    const st = {
      line: linePath(sh, 600, 200, slo, shi), area: areaPath(sh, 600, 200, slo, shi),
      ticks: ticks(slo, shi, 3).map((v) => ({ pos: ((1 - (v - slo) / (shi - slo)) * 100).toFixed(2), label: fmtK(v) })),
      xl: [0, 15, 30].map((j) => ({ pos: (j / 30 * 100).toFixed(2), label: dstr(D.days[j]) })),
      title: 'Root stake, ' + (x.flowDays || 30) + ' days',
      delta: x.flow == null ? '—' : signed(x.flow, fmtInt) + ' τ (' + signed(x.flowPct, (n) => n.toFixed(1) + '%') + ')',
      color: x.flow > 0 ? accent : x.flow < 0 ? ORANGE : MUTED,
    };
    void first;

    // basket
    const rows = x.h.map(([netuid, name, spot]) => ({ sn: 'SN' + netuid, name: name || 'Subnet ' + netuid, spot, share: x.snav > 0 ? pct(spot / x.snav * 100, 1) : '—' }));
    if (x.nh > 8 && x.hr > 0) rows.push({ sn: '+' + (x.nh - 8), name: 'other subnets', spot: x.hr, share: x.snav > 0 ? pct(x.hr / x.snav * 100, 1) : '—', other: true });
    const bmax = Math.max(1e-9, ...rows.map((r) => r.spot));
    const slip = x.snav > 0 ? (1 - x.nav / x.snav) * 100 : null;
    const bk = {
      count: x.nh, nav: fmtNum(x.nav, 1), snav: fmtNum(x.snav, 1), slip: pct(slip), slipColor: slip != null && slip > 2 ? ORANGE : TEXT,
      rows: rows.map((r) => ({ sn: r.sn, name: r.name, share: r.share, w: (r.spot / bmax * 100).toFixed(1), fill: r.other ? '#3B4A5E' : accent })),
    };

    // calculator
    const amt = parseFloat(String(S.amt).replace(/[^0-9.]/g, '')) || 0;
    const apy = x.a30 ?? x.a7;
    const yr = apy == null ? null : amt * apy / 100;
    const best = D.best;
    const cmp = [];
    if (apy != null && D.meds.a30 != null) {
      const dm = amt * (apy - D.meds.a30) / 100;
      cmp.push({ label: 'vs median (' + pct(D.meds.a30) + ')', value: signed(dm, (n) => fmtNum(n, 2)) + ' τ/yr', color: dm >= 0 ? accent : ORANGE });
    }
    if (apy != null && best && best.hk !== x.hk) {
      const db = amt * (best.a30 - apy) / 100;
      // `best` is the top 30D APY among validators ≥ 1K τ; a smaller one (or a 7D figure) can beat it
      if (db > 0) cmp.push({ label: 'Switch to ' + best.name + ' (' + pct(best.a30) + ')', value: '+' + fmtNum(db, 2) + ' τ/yr', color: accent });
      else cmp.push({ label: 'Ahead of the top ranked ' + best.name + ' (' + pct(best.a30) + ')', value: signed(-db, (n) => fmtNum(n, 2)) + ' τ/yr', color: accent });
    } else if (best && best.hk === x.hk) {
      cmp.push({ label: 'This is the top validator by 30D APY', value: '', color: accent });
    }

    const ledger = [
      { label: 'Current root stake', value: fmtInt(x.s) + ' τ' },
      { label: 'Root stake value (USD)', value: usd(x.s * this.px) },
      { label: 'Realizable NAV (USD)', value: usd(x.nav * this.px) },
      { label: 'Nominator', value: fmtInt(x.nom) },
      { label: 'Deposited to basket (lifetime)', value: fmtNum(x.dep, 1) + ' τ' },
      { label: 'Redeemed (lifetime)', value: fmtNum(x.red, 1) + ' τ' },
    ];

    return {
      name: x.name, hk: x.hk, ck: x.ck || '—', ini: x.ini, monoBg: x.monoBg, monoFg: x.monoFg,
      rankTxt, take: pct(x.t * 100, 0), takeBg: x.t >= 0.15 ? '#2A1D0E' : '#161C25', takeFg: x.t >= 0.15 ? ORANGE : '#C9D1D9',
      nom: fmtInt(x.nom), kpis, ch, st, bk, ledger, alpha: this.detailAlpha(x.hk, accent),
      calc: {
        year: yr == null ? '—' : fmtNum(yr, 2), month: yr == null ? '—' : fmtNum(yr / 12, 3), cmp,
        yearUsd: yr == null ? '' : '≈ ' + usd(yr * this.px), monthUsd: yr == null ? '' : '≈ ' + usd(yr / 12 * this.px),
      },
      copyTxt: this.copyTxt(), copy: () => this.copyHk(x.hk),
    };
  }
}
