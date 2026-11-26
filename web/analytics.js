// Generated from design/Main.dc.html by tools/dc2web.py — edit the design, then rerun.
const DATA_URL = '/api/validators';
const ALPHA_URL = '/api/alpha';
// BasketRate stood still Nov 7–11 2026; rolling windows ending in that stretch are distorted
const PAUSE_TS = [Date.UTC(2026, 10, 7), Date.UTC(2026, 10, 12)];
const RANGES = [30, 90, 180, 365];
const ALPHA_MINS = [[0, 'All'], [1000, '≥ 1K τ'], [10000, '≥ 10K τ'], [100000, '≥ 100K τ']];
const EFF_DIRS = { rank: -1, name: 1, tao: -1, ns: -1, t: 1, cfg: 1, et: 1, eff: -1, cons: -1, a: -1, px: -1 };
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
// line through [x fraction 0..1, value|null] points
function ptsPath(pts, W, H, lo, hi) {
  if (!(hi > lo)) hi = lo + 1;
  let d = '', pen = false;
  pts.forEach(([f, v]) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + (f * W).toFixed(1) + ' ' + yOf(v, H, lo, hi).toFixed(1) + ' '; pen = true; });
  return d.trim();
}
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

const DIRS = { rank: -1, name: 1, stake: -1, take: 1, sd: 1, flow: -1, nom: -1 }; // APY columns (a1, a7, a30, a90…) sort high → low
function dirOf(map, k) { return map[k] != null ? map[k] : -1; }
function wl(w) { return w + 'D'; }
// chart / flow ranges the data covers: the standard ones shorter than the history, plus all of it
// τ return (not annualized): signed, 2 decimals
function retTxt(x) { return x == null ? '—' : signed(x, (n) => n.toFixed(2) + '%'); }
function retCol(x, accent) { return x == null ? MUTED : x >= 0 ? accent : ORANGE; }
// a window's yield, not annualized: (1 + APY)^(w/365) − 1, in %
function yieldOver(a, w) { return a == null ? null : (Math.pow(1 + a / 100, w / 365) - 1) * 100; }
function ret3(x) { return x == null ? '—' : signed(x, (n) => n.toFixed(3) + '%'); }
function pxTxt(x) { return x == null ? '—' : Math.abs(x) < 0.05 ? '0.0%' : signed(x, (n) => n.toFixed(1) + '%'); }
// a pool (or validator) whose rewards round to nothing over the window earned nothing
function idle(a) { return a != null && a < 0.01; }
const GREY = '#A9B4C2';
const EFF_TIP = '100% = earns what the top pools on this subnet earn. It is a comparison with peers, not the fee charged.';
const PX_TIP = 'Alpha price change against τ over the window. Set by the subnet(s), the same for every validator there.';
// "yield vs best pools" cell for a pool or validator: a zero yield means it earned nothing
function effCell(e, a, accent) {
  if (idle(a)) return { eff: 'Not earning', effW: 0, effColor: MUTED };
  return { eff: e == null ? '—' : Math.min(e, 100).toFixed(0) + '%', effW: e == null ? 0 : Math.min(100, e).toFixed(1), effColor: effColor(e, accent) };
}
function rangeOpts(N) { const r = RANGES.filter((x) => x < N); r.push(N); return r; }
function rangeLabel(r, N) { return r === N && !RANGES.includes(N) ? 'All' : r + 'D'; }
// stake flow over the last r days, measured from the first stored point inside that range
function flowOver(sh, days, ts, s, r) {
  const N = sh.length - 1;
  for (let i = Math.max(0, N - r); i < N; i++) {
    const s0 = sh[i];
    if (s0 != null && s0 > 0) return { flow: s - s0, pct: (s - s0) / s0 * 100, days: Math.max(1, Math.round((ts - days[i]) / 864e5)) };
  }
  return null;
}
// `count` evenly spaced axis labels over n points
function xLabels(n, count, labelOf) {
  if (n < 1) return [];
  const k = Math.min(count, n), out = [];
  for (let t = 0; t < k; t++) { const j = k > 1 ? Math.round(t * (n - 1) / (k - 1)) : 0; out.push({ pos: (n > 1 ? j / (n - 1) * 100 : 50).toFixed(2), label: labelOf(j) }); }
  return out;
}
// segmented-control chips
function segChips(list, cur, labelOf, accent, pick) {
  return list.map((v) => ({ label: labelOf(v), on: v === cur, bg: v === cur ? accent : 'transparent', fg: v === cur ? '#0A0E13' : '#A9B4C2', pick: () => pick(v) }));
}
// consistency: share of periods at ≥ 90% of the reference, with one bar per period (oldest → newest)
function consCell(v, A, accent) {
  const per = (v.effp || []).slice(0, A.np).reverse();
  const known = per.filter((x) => x != null);
  return {
    txt: v.cons == null ? '—' : Math.round(v.cons) + '%',
    color: v.cons == null ? MUTED : v.cons >= 75 ? accent : v.cons >= 50 ? TEXT : ORANGE,
    bars: per.map((x) => ({ h: x == null ? 3 : Math.max(3, Math.min(120, x) / 120 * 18).toFixed(1), fill: x == null ? '#232C38' : x >= 90 ? accent : x >= 70 ? '#5B6675' : ORANGE })),
    title: v.cons == null ? 'Not enough complete ' + A.period + '-day periods' : known.filter((x) => x >= 90).length + ' of ' + known.length + ' ' + A.period + '-day periods at ≥ 90% of the subnet reference',
  };
}
const MINS = [[0, 'All'], [1000, '≥ 1K τ'], [10000, '≥ 10K τ'], [100000, '≥ 100K τ']];

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { data: null, err: null, q: '', win: null, rng: 30, crng: null, ew: null, min: 1000, sortKey: 'rank', dir: -1, hideTake: false, sel: null, hov: null, hovIdx: null, amt: '1,000', showAll: false, copied: false, px: null, pxLive: false, pxDir: 0, tab: 'root', sn: null, effMin: 1000, effSort: 'tao', effDir: -1, ehov: null, alpha: null, alphaErr: null };
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
      chg: signed(p.P, (n) => n.toFixed(2) + '%') + ' 24h', chgColor: p.P >= 0 ? accent : ORANGE,
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
    const N = Math.max(1, (d.days || []).length - 1);
    const win = (d.win && d.win.length ? d.win : [1, 7, 30]).slice().sort((a, b) => a - b);
    const keys = win.map((w) => 'a' + w);
    const ranges = rangeOpts(N);
    const v = d.v.map((x) => {
      const h = hue(x.hk);
      const label = x.n || (x.hk.slice(0, 6) + '…' + x.hk.slice(-4));
      const ini = ((x.n || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || x.hk.slice(1, 3)).toUpperCase();
      // flows and sparklines per range; stake history may start with nulls (no sample yet),
      // so a flow runs from the first stored day inside the range
      const fl = {}, sp = {};
      ranges.forEach((r) => { fl[r] = flowOver(x.sh || [], d.days, d.ts, x.s, r); sp[r] = linePath((x.d || []).slice(Math.max(0, N - r)), 100, 28, 0, 10); });
      return Object.assign({}, x, {
        d: x.d || [], d30: x.d30 || [], sh: x.sh || [],
        name: label, named: !!x.n, short: x.hk.slice(0, 8) + '…' + x.hk.slice(-6), ini,
        monoBg: 'hsl(' + h + ' 34% 20%)', monoFg: 'hsl(' + h + ' 70% 78%)', fl, sp, rk: {},
      });
    });
    const big = v.filter((x) => x.s >= 1000);
    const st = {}, meds = {};
    keys.forEach((k) => {
      const ranked = big.filter((x) => x[k] != null).sort((a, b) => b[k] - a[k]);
      ranked.forEach((x, i) => { x.rk[k] = i + 1; });
      const den = ranked.reduce((a, x) => a + x.s, 0);
      st[k] = { ranked, best: ranked[0] || null, wApy: den > 0 ? ranked.reduce((a, x) => a + x[k] * x.s, 0) / den : null };
      meds[k] = median(big.map((x) => x[k]));
    });
    const flowSpan = {};
    ranges.forEach((r) => { flowSpan[r] = Math.max(0, ...v.map((x) => (x.fl[r] ? x.fl[r].days : 0))) || r; });
    // 1D is shown as a raw 24h return, never annualized or used for ranking
    const rkeys = keys.filter((k) => k !== 'a1');
    return Object.assign({}, d, {
      // default window: 30D, or the longest one with data while history is still syncing
      dflt: st.a30 && st.a30.best ? 'a30' : rkeys.slice().reverse().find((k) => st[k].best) || rkeys[rkeys.length - 1],
      N, win, keys, rkeys, ranges, st, meds, flowSpan, med: d.med || [], byHk: new Map(v.map((x) => [x.hk, x])), v,
      totalStake: v.reduce((a, x) => a + x.s, 0), bigCount: big.length, maxS: Math.max(1, ...v.map((x) => x.s)),
    });
  }

  // selected APY window key (e.g. 'a30') and range (days) for the root views
  winKey(D) { const k = this.state.win; return D.rkeys.includes(k) ? k : D.dflt; }
  rngOf(D) { const r = this.state.rng; return D.ranges.includes(r) ? r : D.ranges[0]; }
  chartRng(D) { const r = this.state.crng; return D.ranges.includes(r) ? r : D.ranges.includes(90) ? 90 : D.ranges[D.ranges.length - 1]; }
  ewOf(A) { const w = this.state.ew; return A.ewin.includes(w) ? w : A.dflt; }

  sortBy(key) {
    if (this.state.sortKey === key) this.setState({ dir: -this.state.dir });
    else this.setState({ sortKey: key, dir: dirOf(DIRS, key) });
  }

  // Detail page for any validator: basket (root) validators get the full page, alpha-only
  // ones the alpha page. The list scroll position is kept for the way back.
  show(hk) {
    if (!this.inDetail && typeof window !== 'undefined') this.listY = window.scrollY || 0;
    this.setState({ sel: hk, hovIdx: null, hov: null, copied: false, poolsAll: false });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  }

  // Validator pages live on the main page ("/#v/<hotkey>"); analytics links there.
  open(hk) {
    try { window.location.assign('/#v/' + hk); } catch (e) { /* ignore */ }
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

  // Brand link: back to the root rankings from anywhere (detail page or another tab).
  home(e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // let "open in new tab" work
    if (e) e.preventDefault();
    const patch = { tab: 'root', q: '', sn: null };
    if (this.state.sel) { this.leaveTo(patch); return; }
    this.setState(patch);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
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
    const S = this.state, D = S.data, A = S.alpha;
    const base = { accent, home: (e) => this.home(e), tk: this.ticker(accent), loading: !D && !S.err, failed: !!S.err, err: S.err, ready: !!D, skel: [1, 2, 3, 4, 5, 6, 7, 8] };
    this.px = (S.px || PRICE_SNAPSHOT).c;
    // efficiency window chips, shared by the alpha tab, the efficiency tab and alpha pages
    if (A) {
      const ew = this.ewOf(A);
      Object.assign(base, { hasEw: A.ewin.length > 1, ewins: segChips(A.ewin, ew, wl, accent, (w) => this.setState({ ew: w })) });
    } else Object.assign(base, { hasEw: false, ewins: [] });
    if (!D) return Object.assign(base, { listView: false, detailView: false });
    const t = new Date(D.ts);
    Object.assign(base, {
      blockTxt: fmtInt(D.block),
      timeTxt: dstr(D.ts) + '/' + t.getUTCFullYear() + ' ' + String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ' UTC',
    });
    const sel = S.sel ? D.v.find((x) => x.hk === S.sel) : null;
    const back = () => this.back();
    this.inDetail = !!sel;
    if (sel) return Object.assign(base, { listView: false, detailView: true, alphaView: false, d: this.detail(sel, D, accent), amt: S.amt, onAmt: (e) => this.setState({ amt: e.target.value }), back });
    const asel = S.sel && A ? A.byHk.get(S.sel) : null;
    this.inDetail = !!asel;
    if (asel) return Object.assign(base, { listView: false, detailView: false, alphaView: true, ad: this.alphaDetail(asel, D, accent), back });
    return Object.assign(base, { listView: true, detailView: false, alphaView: false }, this.list(D, accent), this.tabsVals(D, accent));
  }

  list(D, accent) {
    const S = this.state, win = this.winKey(D), m = D.meds[win], rng = this.rngOf(D);
    const winLabel = wl(+win.slice(1));
    const q = S.q.trim().toLowerCase();
    const list = D.v.filter((x) => x.s >= S.min && (!S.hideTake || x.t <= 0.10) &&
      (!q || x.name.toLowerCase().includes(q) || x.hk.toLowerCase().includes(q) || (x.ck || '').toLowerCase().includes(q)));
    const rankOf = new Map();
    list.filter((x) => x[win] != null).sort((a, b) => b[win] - a[win]).forEach((x, i) => rankOf.set(x.hk, i + 1));
    const fo = (x) => x.fl[rng];
    const named = { rank: (x) => x[win], name: (x) => x.name.toLowerCase(), stake: (x) => x.s, take: (x) => x.t, sd: (x) => x.sd, flow: (x) => (fo(x) ? fo(x).flow : null), nom: (x) => x.nom };
    const sk = named[S.sortKey] || D.rkeys.includes(S.sortKey) || S.sortKey === 'r1' ? S.sortKey : 'rank';
    const get = named[sk] || ((x) => x[sk]);
    const sorted = list.slice().sort((a, b) => { const va = get(a), vb = get(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (va < vb ? -1 : va > vb ? 1 : 0) * S.dir; });
    const shown = S.showAll ? sorted : sorted.slice(0, 50);
    const medY = (28 - Math.max(0, Math.min(10, m || 0)) / 10 * 28).toFixed(1);
    const logMax = Math.log10(D.maxS);
    const cell = (x, k) => (k === 'a1' ? { t: ret3(x.r1), color: GREY, weight: 400 } : { t: pct(x[k]), color: apyColor(x[k], D.meds[k], accent), weight: k === win ? 700 : 400 });
    const span = D.flowSpan[rng];

    const rows = shown.map((x) => {
      const r = rankOf.get(x.hk), f = fo(x);
      return {
        rank: r || '—', rankColor: r && r <= 3 ? accent : MUTED,
        name: x.name, nameColor: x.named ? TEXT : '#A9B4C2', short: x.short, ini: x.ini, monoBg: x.monoBg, monoFg: x.monoFg,
        aria: x.name + ', APY ' + winLabel + ' ' + pct(x[win]) + ', view details',
        stake: fmtInt(x.s), stakeUsd: '≈ ' + usd(x.s * this.px), stakeBar: x.s >= 1 ? Math.max(2, Math.log10(x.s) / logMax * 100).toFixed(1) : '0',
        take: pct(x.t * 100, 0), takeBg: x.t >= 0.15 ? '#2A1D0E' : x.t === 0 ? '#12281F' : '#161C25', takeFg: x.t >= 0.15 ? ORANGE : x.t === 0 ? accent : '#C9D1D9',
        apys: D.keys.map((k) => cell(x, k)),
        spark: x.sp[rng], medY, sparkColor: x[win] != null && m != null && x[win] < m - 1 ? ORANGE : accent,
        flow: f ? signed(f.flow, fmtK) + ' τ' : '—', flowPct: f ? signed(f.pct, (n) => n.toFixed(1) + '%') + (f.days < span ? ' · ' + f.days + 'D' : '') : '',
        flowColor: !f || Math.abs(f.flow) < 0.5 ? MUTED : f.flow > 0 ? accent : ORANGE,
        sd: x.sd == null ? '—' : x.sd.toFixed(2) + ' pp', sdColor: x.sd == null ? MUTED : x.sd > 3 ? ORANGE : '#C9D1D9',
        nom: fmtInt(x.nom),
        card: { sub: pct(x.t * 100, 0) + ' take · ' + fmtK(x.s) + ' τ', val: pct(x[win]), valColor: apyColor(x[win], m, accent), vsub: 'APY ' + winLabel },
        open: () => this.open(x.hk),
      };
    });

    const defs = [['rank', '#', 'flex-start'], ['name', 'Validator', 'flex-start'], ['stake', 'Root stake', 'flex-end'], ['take', 'Take', 'flex-end']]
      .concat(D.keys.map((k) => (k === 'a1' ? ['r1', '24h τ', 'flex-end'] : [k, 'APY ' + wl(+k.slice(1)), 'flex-end'])))
      .concat([[null, 'Trend ' + rangeLabel(rng, D.N), 'flex-start'], ['flow', 'Flow ' + span + 'D', 'flex-end'], ['sd', 'Stability σ', 'flex-end'], ['nom', 'Nominator', 'flex-end']]);
    const cols = defs.map(([key, label, justify]) => {
      const active = key && sk === key;
      return {
        label, justify, sortable: !!key, plain: !key,
        color: active ? accent : key === win ? TEXT : MUTED,
        arrow: active ? (S.dir < 0 ? '↓' : '↑') : '',
        aria: 'Sort by ' + label,
        sort: key ? () => this.sortBy(key) : null,
      };
    });
    const extra = D.keys.length - 3;
    const grid = '52px minmax(220px, 2.4fr) minmax(150px, 1.3fr) 64px ' + D.keys.map((k) => (k === win ? '86px' : '78px')).join(' ') + ' 112px 116px 80px 84px';

    const sw = D.st[win], best = sw.best;
    const stats = [
      { label: 'Root validators', value: fmtInt(D.v.length), sub: sw.ranked.length + ' with ≥ 1K τ and ' + winLabel + ' of data', color: TEXT },
      { label: 'Total root stake', value: fmtK(D.totalStake) + ' τ', sub: '≈ ' + usd(D.totalStake * this.px) + ' at TAO ' + usd(this.px), color: TEXT },
      { label: 'Root median APY ' + winLabel, value: pct(m), sub: 'validators ≥ 1K τ', color: BLUE },
      { label: 'Root stake-weighted APY ' + winLabel, value: pct(sw.wApy), sub: 'weighted by root stake', color: TEXT },
      { label: 'Root best APY ' + winLabel, value: best ? pct(best[win]) : '—', sub: best ? best.name + ' · take ' + pct(best.t * 100, 0) : 'needs ' + winLabel + ' of samples', color: accent },
    ];

    // scatter
    const pts = list.filter((x) => x[win] != null && x.s >= 1);
    const vals = pts.map((x) => x[win]);
    const lo = Math.max(0, Math.floor((quant(vals, 0.03) ?? 0) - 0.5));
    const hi = Math.max(lo + 1, Math.ceil((quant(vals, 0.97) ?? 6) + 0.5));
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
          fill: on ? accent : apyColor(x[win], m, accent) === ORANGE ? 'rgba(245,158,59,0.30)' : 'rgba(61,219,176,0.22)',
          stroke: on ? TEXT : apyColor(x[win], m, accent) === ORANGE ? ORANGE : accent,
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

    // flows over the selected range
    const fl = D.v.filter((x) => x.s >= 1000 && fo(x)).map((x) => ({ x, f: fo(x).flow }));
    const inn = fl.slice().sort((a, b) => b.f - a.f).filter((y) => y.f > 0).slice(0, 5);
    const out = fl.slice().sort((a, b) => a.f - b.f).filter((y) => y.f < 0).slice(0, 4);
    const fmax = Math.max(1, ...inn.concat(out).map((y) => Math.abs(y.f)));
    const frow = (y) => ({ name: y.x.name, w: (Math.abs(y.f) / fmax * 100).toFixed(1), txt: signed(y.f, fmtK) + ' τ', open: () => this.open(y.x.hk) });

    return {
      stats, sc, hist, flows: { inn: inn.map(frow), out: out.map(frow), title: 'Root stake flows, ' + span + ' days' },
      winLabel, medTxt: pct(m), countTxt: fmtInt(sorted.length), empty: sorted.length === 0,
      hasMore: !S.showAll && sorted.length > 50, showAll: () => this.setState({ showAll: true }),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value, showAll: false }),
      wins: segChips(D.win.filter((w) => w >= 7), +win.slice(1), wl, accent, (w) => this.setState({ win: 'a' + w })),
      hasRngs: D.ranges.length > 1, rngs: segChips(D.ranges, rng, (r) => rangeLabel(r, D.N), accent, (r) => this.setState({ rng: r })),
      mins: MINS.map(([v, l]) => ({ label: l, on: S.min === v, bg: S.min === v ? '#16231F' : 'transparent', border: S.min === v ? accent : '#232C38', fg: S.min === v ? accent : '#A9B4C2', pick: () => this.setState({ min: v, showAll: false }) })),
      hideTake: S.hideTake, toggleTake: () => this.setState({ hideTake: !S.hideTake }),
      takeChip: { bg: S.hideTake ? '#16231F' : 'transparent', border: S.hideTake ? accent : '#232C38', fg: S.hideTake ? accent : '#A9B4C2', mark: S.hideTake ? '✓' : '' },
      cols, rows, grid, minW: 1180 + extra * 90,
    };
  }

  // Rows of `p` are looked up by column name (`pf`): the window columns depend on how much
  // history the server keeps. The older single-window shape (eff/rk/ref/n) maps to 30D.
  prepAlpha(a) {
    const win = (a.win && a.win.length ? a.win : [1, 7, 30]).slice().sort((x, y) => x - y);
    const ewin = (a.ewin && a.ewin.length ? a.ewin : [30]).slice().sort((x, y) => x - y);
    const legacy = (o, pairs) => { pairs.forEach(([from, to]) => { if (o[to] === undefined && o[from] !== undefined) o[to] = o[from]; }); return o; };
    const vs = a.v.map((v) => legacy(Object.assign({}, v, { pairs: [], effp: v.effp || [] }), [['eff', 'eff30'], ['et', 'et30']]));
    const sns = new Map(a.subnets.map((s) => [s.nu, legacy(Object.assign({}, s, { pairs: [] }), [['ref', 'ref30'], ['n', 'n30']])]));
    const pf = a.pf || [];
    a.p.forEach((row) => {
      const p = {};
      pf.forEach((k, i) => { p[k] = row[i]; });
      legacy(p, [['eff', 'eff30'], ['rk', 'rk30']]);
      p.v = vs[p.v];
      if (!p.v) return;
      p.v.pairs.push(p);
      const s = sns.get(p.nu); if (s) s.pairs.push(p);
    });
    vs.forEach((v) => v.pairs.sort((x, y) => y.tao - x.tao));
    // Pools that earned (next to) nothing get no score instead of "0% of best", and the
    // validator score is re-weighted over the pools that did earn (pools ≥ 10 τ).
    ewin.forEach((w) => {
      const ek = 'eff' + w, ak = 'a' + w;
      vs.forEach((v) => {
        const big = v.pairs.filter((p) => p.tao >= 10);
        const tot = big.reduce((s, p) => s + p.tao, 0);
        const dead = big.filter((p) => idle(p[ak])).reduce((s, p) => s + p.tao, 0);
        v.pairs.forEach((p) => { if (idle(p[ak])) p[ek] = null; });
        if (tot > 0) v['ne' + w] = dead / tot * 100;
        if (dead > 0) {
          const live = big.filter((p) => p[ek] != null), lw = live.reduce((s, p) => s + p.tao, 0);
          v[ek] = lw > 0 ? live.reduce((s, p) => s + p[ek] * p.tao, 0) / lw : null;
          v['et' + w] = v[ek] == null ? null : 100 - v[ek];
        }
      });
    });
    const np = a.np || 0;
    const hasEff = (w) => vs.some((v) => v['eff' + w] != null);
    const dflt = hasEff(30) ? 30 : ewin.slice().reverse().find(hasEff) || ewin[ewin.length - 1];
    return { sample: !!a.sample, block: a.block, ts: a.ts, win, ewin, dflt, np, period: a.period || 30, vs, sns, byHk: new Map(vs.map((v) => [v.hk, v])), snList: a.subnets.map((s) => sns.get(s.nu)) };
  }

  vname(hk, n) {
    const D = this.state.data, r = D && D.byHk.get(hk);
    return n || (r && r.named ? r.name : null) || (hk.slice(0, 6) + '…' + hk.slice(-4));
  }

  openAny(hk) { const D = this.state.data, A = this.state.alpha; if ((D && D.byHk.has(hk)) || (A && A.byHk.has(hk))) this.open(hk); }

  tabsVals(D, accent) {
    const S = this.state, A = S.alpha;
    const ew = A ? this.ewOf(A) : 30;
    const tabs = [['root', 'Root stake', fmtInt(D.v.length)], ['alpha', 'Alpha by subnet', A ? fmtInt(A.snList.length) : '…'], ['eff', 'Validator efficiency', A ? fmtInt(A.vs.filter((v) => v['eff' + ew] != null).length) : '…']]
      .map(([k, label, count]) => ({ label, count, on: S.tab === k, bg: S.tab === k ? '#1A222D' : 'transparent', fg: S.tab === k ? TEXT : '#A9B4C2', countBg: S.tab === k ? '#12281F' : '#161C25', pick: () => this.setState({ tab: k, q: '', showAll: false }) }));
    const out = { tabs, isRoot: S.tab === 'root', isAlpha: false, isEff: false, alWait: false, alWaitTxt: '', showSample: false, alSnCount: '', alBlock: '' };
    if (S.tab === 'root') return out;
    if (!A) return Object.assign(out, { alWait: true, alWaitTxt: S.alphaErr ? 'Couldn’t load alpha data (' + S.alphaErr + ').' : 'Loading alpha data…' });
    Object.assign(out, { showSample: A.sample, alSnCount: fmtInt(A.snList.length), alBlock: fmtInt(A.block) });
    out.stats = this.alphaStats(A, accent);
    if (S.tab === 'alpha') return Object.assign(out, { isAlpha: true, al: this.alphaTab(A, accent) });
    return Object.assign(out, { isEff: true, ef: this.effTab(D, A, accent) });
  }

  // KPI strip for the alpha tabs (the root tab has its own)
  alphaStats(A, accent) {
    const ew = this.ewOf(A), L = wl(ew), dpk = A.win.includes(ew) ? 'dp' + ew : 'dp30';
    const elig = A.vs.filter((v) => v['eff' + ew] != null);
    const tot = elig.reduce((a, v) => a + v.tao, 0), good = elig.filter((v) => v['eff' + ew] >= 90).reduce((a, v) => a + v.tao, 0);
    const ne = A.vs.filter((v) => v.tao >= 1000 && v['eff' + ew] == null && idle(v['a' + ew])).length;
    const medPx = median(A.snList.map((s) => s[dpk]));
    return [
      { label: 'Alpha staked', value: fmtK(A.vs.reduce((a, v) => a + v.tao, 0)) + ' τ', sub: fmtInt(A.vs.length) + ' validators with ≥ 10 τ', color: TEXT },
      { label: 'Median reference APY ' + L, value: pct(median(A.snList.map((s) => s['ref' + ew]))), sub: 'best pools of each subnet, paid in alpha', color: BLUE },
      { label: 'Stake at ≥ 90% of best ' + L, value: tot > 0 ? pct(good / tot * 100, 0) : '—', sub: 'share of alpha stake, yield vs best pools', color: accent },
      { label: 'Median alpha price ' + dpk.slice(2) + 'D', value: pxTxt(medPx), sub: 'vs τ across subnets · not set by validators', color: GREY },
      { label: 'Not earning ' + L, value: fmtInt(ne), sub: 'validators ≥ 1K τ that earned no alpha', color: TEXT },
    ];
  }

  alphaTab(A, accent) {
    const S = this.state, q = S.q.trim().toLowerCase(), ew = this.ewOf(A), L = wl(ew);
    const ak = 'a' + ew, ek = 'eff' + ew, rk = 'rk' + ew;
    // price change for the window; the 1D/7D price stands in when the window has none
    const dpk = A.win.includes(ew) ? 'dp' + ew : 'dp30', PL = dpk.slice(2) + 'D';
    const match = (s) => !q || ('sn' + s.nu) === q.replace(/\s/g, '') || String(s.nu) === q || (s.name || '').toLowerCase().includes(q) ||
      s.pairs.some((p) => this.vname(p.v.hk, p.v.n).toLowerCase().includes(q));
    const list = A.snList.filter(match);
    // the right panel follows the filtered list: keep the pick while it matches, else the first match
    const cur = list.find((s) => s.nu === S.sn) || list[0] || null;
    const curNu = cur ? cur.nu : null;
    const snRows = list.map((s) => ({
      sn: 'SN' + s.nu, name: s.name || 'Subnet ' + s.nu, ref: pct(s['ref' + ew], 1), dp: pxTxt(s[dpk]),
      on: s.nu === curNu, bg: s.nu === curNu ? '#151C26' : 'transparent', mark: s.nu === curNu ? accent : 'transparent',
      pick: () => this.setState({ sn: s.nu }),
      // phone dropdown: pick and close
      pickDd: (e) => { const d = e && e.currentTarget && e.currentTarget.closest ? e.currentTarget.closest('details') : null; if (d) d.open = false; this.setState({ sn: s.nu }); },
    }));
    const hdr = { ref: 'Ref ' + L, dp: 'Price ' + PL };
    const wlab = (w) => (w === 1 ? 'Yield 24h' : 'APY ' + wl(w));
    const winCols = A.win.map((w) => ({ label: wlab(w), color: w === ew ? TEXT : MUTED }));
    const wcol = (w) => (w === ew ? 74 : 64);
    const grid = '44px minmax(180px, 2fr) 104px 56px ' + A.win.map((w) => wcol(w) + 'px').join(' ') + ' 124px 72px';
    const minW = 44 + 180 + 104 + 56 + 124 + 72 + A.win.reduce((a, w) => a + wcol(w), 0) + 12 * (5 + A.win.length) + 40;
    const empty = { snRows, curLabel: cur ? 'SN' + cur.nu + ' · ' + (cur.name || 'Subnet ' + cur.nu) : 'No subnet', hdr, winCols, grid, minW, effTip: EFF_TIP, noSn: list.length === 0, hasCur: false, noCur: true, cur: { sn: '', name: '', kpis: [], line: '' }, rows: [], title: '' };
    if (!cur) return Object.assign(empty, { noCurTxt: A.snList.length ? 'No subnet matches “' + S.q.trim() + '”.' : 'No subnet data yet: the collector has not stored alpha samples.' });
    const nref = cur['nref' + ew];
    const kpis = [
      { label: 'Reference APY ' + L, value: pct(cur['ref' + ew], 1), color: accent, sub: nref == null ? 'median of the 3 best pools ≥ 100 τ' : nref >= 3 ? 'median of the 3 best pools ≥ 100 τ' : nref === 0 ? 'no pool ≥ 100 τ earned' : 'thin reference: ' + nref + ' pool' + (nref === 1 ? '' : 's') + ' ≥ 100 τ' },
      { label: 'Alpha price', value: cur.price == null ? '—' : cur.price.toFixed(5) + ' τ', color: TEXT, sub: '' },
    ].concat(A.win.filter((w) => w >= 7).map((w) => ({ label: 'Price ' + wl(w), value: pxTxt(cur['dp' + w]), color: GREY, sub: 'vs τ, all validators' })))
      .concat([
        { label: 'Validators', value: fmtInt(cur['n' + ew]), color: TEXT, sub: 'pools ≥ 10 τ with ' + L + ' data' },
        { label: 'Alpha staked', value: fmtK(cur.tao) + ' τ', color: TEXT, sub: '' },
      ]);
    // one line for what every staker on this subnet shares: the price move, plus the best pools' rewards
    const px = cur[dpk], yRef = yieldOver(cur['ref' + ew], ew), net = cur['r' + ew];
    const line = px == null ? 'Price history for ' + PL + ' is not available yet.' :
      (Math.abs(px) < 0.05 ? 'The SN' + cur.nu + ' alpha price was flat against τ over ' + PL : 'Everyone staking on SN' + cur.nu + ' ' + (px >= 0 ? 'gained ' : 'lost ') + Math.abs(px).toFixed(1) + '% to the alpha price over ' + PL) +
      (yRef == null ? '.' : '; rewards in the best pools added ' + signed(yRef, (n) => n.toFixed(1) + '%') + (net == null ? '' : ' → net ' + signed(net, (n) => n.toFixed(1) + '%') + ' in τ') + '. The price part is the same for every validator below; the columns compare rewards only.');
    const pairs = cur.pairs.filter((p) => p.tao >= 1).sort((x, y) => (y[ak] ?? -1e9) - (x[ak] ?? -1e9));
    const rows = pairs.map((p) => {
      const name = this.vname(p.v.hk, p.v.n), m = mono(p.v.hk), e = p[ek], r = p[rk], ec = effCell(e, p[ak], accent);
      return Object.assign({}, m, ec, {
        rank: r || '—', rankColor: r && r <= 3 ? accent : MUTED, name, ini: initials(name, p.v.hk),
        aria: name + ' on SN' + cur.nu + ', alpha APY ' + L + ' ' + pct(p[ak]),
        tao: fmtInt(p.tao), take: pct(p.v.t * 100, 0), takeBg: p.v.t >= 0.15 ? '#2A1D0E' : p.v.t === 0 ? '#12281F' : '#161C25', takeFg: p.v.t >= 0.15 ? ORANGE : p.v.t === 0 ? accent : '#C9D1D9',
        apys: A.win.map((w) => (w === 1 ? { t: ret3(yieldOver(p.a1, 1)), color: GREY, weight: 400 } : { t: pct(p['a' + w], 1), color: w === ew ? (e == null ? MUTED : effColor(e, accent)) : '#C9D1D9', weight: w === ew ? 700 : 400 })),
        ct: p.ct == null ? 'n/a' : pct(p.ct, 1), ctColor: p.ct != null && p.ct >= 5 ? ORANGE : '#A9B4C2',
        card: { sub: '#' + (r || '—') + ' · ' + fmtInt(p.tao) + ' τ · take ' + pct(p.v.t * 100, 0), val: pct(p[ak], 1), valColor: e == null ? MUTED : effColor(e, accent), vsub: ec.eff === 'Not earning' ? 'Not earning' : ec.eff === '—' ? 'APY ' + L : ec.eff + ' of best' },
        open: () => this.openAny(p.v.hk),
      });
    });
    return Object.assign(empty, { noSn: false, hasCur: true, noCur: false, noCurTxt: '', cur: { sn: 'SN' + cur.nu, name: cur.name || 'Subnet ' + cur.nu, kpis, line }, rows, title: 'Validators on SN' + cur.nu + ', ranked by alpha APY ' + L });
  }

  // stake-weighted alpha price change of a validator's subnets (pools ≥ 10 τ), cached per window
  pxExposure(v, A, ew) {
    const dpk = A.win.includes(ew) ? 'dp' + ew : 'dp30', key = '_px' + dpk;
    if (v[key] !== undefined) return v[key];
    let w = 0, acc = 0;
    v.pairs.forEach((p) => { const s = A.sns.get(p.nu), d = s && s[dpk]; if (p.tao >= 10 && d != null) { w += p.tao; acc += p.tao * d; } });
    return (v[key] = w > 0 ? acc / w : null);
  }

  effTab(D, A, accent) {
    const S = this.state, q = S.q.trim().toLowerCase(), ew = this.ewOf(A), L = wl(ew);
    const ek = 'eff' + ew, etk = 'et' + ew, ak = 'a' + ew;
    const PL = (A.win.includes(ew) ? ew : 30) + 'D';
    const hasCons = A.np >= 2;
    const items = A.vs.filter((v) => v[ek] != null && v.tao >= S.effMin).map((v) => {
      return { v, name: this.vname(v.hk, v.n), et: Math.max(0, v[etk] ?? 100 - v[ek]), eff: v[ek], px: this.pxExposure(v, A, ew) };
    }).filter((x) => !q || x.name.toLowerCase().includes(q) || x.v.hk.toLowerCase().includes(q));
    const notEarning = A.vs.filter((v) => v.tao >= S.effMin && v[ek] == null && idle(v[ak])).length;
    const rankOf = new Map(); items.slice().sort((a, b) => b.eff - a.eff).forEach((x, i) => rankOf.set(x.v.hk, i + 1));
    const getters = { rank: (x) => x.eff, name: (x) => x.name.toLowerCase(), tao: (x) => x.v.tao, ns: (x) => x.v.ns, t: (x) => x.v.t, cfg: (x) => x.v.cfg, et: (x) => x.et, eff: (x) => x.eff, cons: (x) => x.v.cons, a: (x) => x.v[ak], px: (x) => x.px };
    const sk = getters[S.effSort] && (S.effSort !== 'cons' || hasCons) ? S.effSort : 'tao';
    const get = getters[sk];
    const sorted = items.slice().sort((a, b) => { const va = get(a), vb = get(b); if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1; return (va < vb ? -1 : va > vb ? 1 : 0) * S.effDir; });
    const rows = sorted.map((x) => {
      const v = x.v, rk = rankOf.get(v.hk), ne = v['ne' + ew], self = v['self' + ew];
      const tags = [];
      if (self != null && self >= 50) tags.push({ t: 'sets reference', title: 'Its own pool is one of the best pools that define the subnet reference, so it is partly measured against itself.' });
      if (ne != null && ne >= 0.5) tags.push({ t: Math.round(ne) + '% not earning', title: Math.round(ne) + '% of its alpha stake sits in pools that earned nothing over ' + L + '; those pools are left out of the score.' });
      return Object.assign({}, mono(v.hk), {
        rank: rk || '—', rankColor: rk && rk <= 3 ? accent : MUTED, name: x.name, ini: initials(x.name, v.hk), short: v.hk.slice(0, 8) + '…' + v.hk.slice(-6), tags,
        aria: x.name + ', yield vs best pools ' + L + ' ' + pct(x.eff, 1), tao: fmtInt(v.tao), ns: v.ns, t: pct(v.t * 100, 0), cfg: v.cfg == null ? 'n/a' : pct(v.cfg, 1),
        et: pct(x.et, 1), etColor: x.et - v.t * 100 > 5 ? ORANGE : TEXT,
        eff: pct(Math.min(x.eff, 100), 1), effW: Math.min(100, x.eff).toFixed(1), effColor: effColor(x.eff, accent),
        hasCons, cons: consCell(v, A, accent, 4),
        a: pct(v[ak], 1), px: pxTxt(x.px),
        card: { sub: fmtK(v.tao) + ' τ · ' + v.ns + (v.ns === 1 ? ' subnet' : ' subnets') + ' · take ' + pct(v.t * 100, 0), val: pct(Math.min(x.eff, 100), 0), valColor: effColor(x.eff, accent), vsub: 'yield vs best ' + L },
        open: () => this.openAny(v.hk),
      });
    });
    const defs = [['rank', 'Rank', 'flex-start'], ['name', 'Validator', 'flex-start'], ['tao', 'Alpha stake', 'flex-end'], ['ns', 'Subnets', 'flex-end'],
      ['t', 'Listed take', 'flex-end'], ['cfg', 'Config. take', 'flex-end'], ['et', 'Gap vs best ' + L, 'flex-end'], ['eff', 'Yield vs best ' + L, 'flex-start']]
      .concat(hasCons ? [['cons', 'Consistency', 'flex-start']] : [])
      .concat([['a', 'Alpha APY ' + L, 'flex-end'], ['px', 'Price ' + PL, 'flex-end']]);
    const titles = {
      rank: 'Rank by yield vs best pools', eff: EFF_TIP, et: '100% − yield vs best pools. ' + EFF_TIP,
      cons: 'Share of ' + A.period + '-day periods in which the validator earned at least 90% of what the best pools on its subnets earned',
      a: 'Rewards paid in alpha, annualized. Depends on which subnets the validator is on; excludes the alpha price move.',
      px: 'Stake-weighted alpha price change of the subnets this validator stakes on. ' + PX_TIP,
    };
    const cols = defs.map(([key, label, justify]) => ({
      label, justify, color: sk === key ? accent : MUTED, arrow: sk === key ? (S.effDir < 0 ? '↓' : '↑') : '', aria: 'Sort by ' + label,
      title: titles[key] || '',
      sort: () => (sk === key ? this.setState({ effDir: -S.effDir }) : this.setState({ effSort: key, effDir: dirOf(EFF_DIRS, key) })),
    }));
    const grid = '52px minmax(200px, 2fr) 104px 66px 80px 92px 104px 160px ' + (hasCons ? '150px ' : '') + '90px 84px';
    // scatter: listed take vs gap to the best pools
    const ymax = Math.max(40, Math.ceil(Math.max(0, ...items.map((x) => x.et)) / 10) * 10);
    const maxT = Math.max(1, ...items.map((x) => x.v.tao));
    const hov = S.ehov ? items.find((x) => x.v.hk === S.ehov) : null;
    const xp = (t) => Math.min(100, t * 100 / 20 * 100), yp = (e) => Math.min(100, e / ymax * 100);
    const pts = items.slice().sort((a, b) => b.v.tao - a.v.tao).map((x) => {
      const size = Math.round(8 + Math.sqrt(x.v.tao / maxT) * 26), on = S.ehov === x.v.hk, hidden = x.et - x.v.t * 100 > 5;
      return {
        x: xp(x.v.t).toFixed(2), y: yp(x.et).toFixed(2), size, half: size / 2, aria: x.name + ': listed take ' + pct(x.v.t * 100, 0) + ', gap vs best pools ' + pct(x.et, 1),
        fill: on ? accent : hidden ? 'rgba(245,158,59,0.30)' : 'rgba(61,219,176,0.22)', stroke: on ? TEXT : hidden ? ORANGE : accent,
        open: () => this.openAny(x.v.hk), enter: () => this.setState({ ehov: x.v.hk }), leave: () => this.setState({ ehov: null }),
      };
    });
    const gaps = items.map((x) => ({ x, gap: x.et - x.v.t * 100 })).filter((g) => g.gap > 3).sort((a, b) => b.gap - a.gap).slice(0, 6);
    const gmax = Math.max(1, ...gaps.map((g) => g.gap));
    return {
      cols, rows, grid, minW: 52 + 200 + 104 + 66 + 80 + 92 + 104 + 160 + 90 + 84 + 12 * 9 + 40 + (hasCons ? 162 : 0), empty: rows.length === 0, pts, L,
      note: 'Yield vs best pools = how much of the rewards that the best pools on the same subnet earned this validator passed on over ' + L + ' (100% = as much as the best; it is a comparison with peers, not the fee charged), weighted by alpha stake. Alpha APY is paid in alpha; the Price column is the alpha price move of its subnets, shared by every validator there.' +
        (hasCons ? ' Consistency = share of ' + A.period + '-day periods at ≥ 90% of the best pools (bars: oldest → newest).' : ''),
      neNote: notEarning ? notEarning + ' validator' + (notEarning === 1 ? '' : 's') + ' in this filter earned no alpha over ' + L + ' and are not ranked.' : '',
      hasNe: notEarning > 0,
      yTicks: ticks(0, ymax, 4).map((v) => ({ pos: yp(v).toFixed(2), label: v + '%' })),
      xTicks: [0, 5, 10, 15, 20].map((v) => ({ pos: v * 5, label: v + '%' })),
      diag: 'M0 100 L100 ' + (100 - yp(20)).toFixed(2),
      hasTip: !!hov, tip: hov ? { x: xp(hov.v.t).toFixed(2), y: yp(hov.et).toFixed(2), shift: xp(hov.v.t) > 70 ? '-90%' : xp(hov.v.t) < 20 ? '-10%' : '-50%', name: hov.name, t: pct(hov.v.t * 100, 0), et: pct(hov.et, 1) } : {},
      hidden: gaps.map((g) => ({ name: g.x.name, t: pct(g.x.v.t * 100, 0), et: pct(g.x.et, 1), gap: '+' + g.gap.toFixed(1) + ' pp', w: (g.gap / gmax * 100).toFixed(1), open: () => this.openAny(g.x.v.hk) })),
      noHidden: gaps.length === 0,
      mins: ALPHA_MINS.map(([v, l]) => ({ label: l, on: S.effMin === v, bg: S.effMin === v ? '#16231F' : 'transparent', border: S.effMin === v ? accent : '#232C38', fg: S.effMin === v ? accent : '#A9B4C2', pick: () => this.setState({ effMin: v }) })),
    };
  }

  // Alpha block on a root validator's page. Kept apart from the root APY: alpha rewards are
  // paid in alpha and the stake carries each subnet's price move.
  detailAlpha(hk, accent) {
    const A = this.state.alpha, v = A && A.byHk.get(hk);
    if (!v || !v.pairs.length) return { has: false };
    const ew = this.ewOf(A), L = wl(ew), ak = 'a' + ew, ek = 'eff' + ew, rk = 'rk' + ew;
    const dpk = A.win.includes(ew) ? 'dp' + ew : 'dp30', PL = dpk.slice(2) + 'D';
    const shown = v.pairs.filter((p) => p.tao >= 1).slice(0, 20);
    const e = v[ek], et = v['et' + ew], ec = effCell(e, v[ak], accent);
    const yv = yieldOver(v[ak], ew), px = this.pxExposure(v, A, ew), net = v['r' + ew];
    return {
      has: true, total: v.pairs.length, shown: shown.length, more: v.pairs.length > shown.length, hA: 'APY ' + L, hP: 'Price ' + PL, effTip: EFF_TIP,
      kpis: [
        { label: 'Alpha stake', value: fmtK(v.tao) + ' τ', color: TEXT },
        { label: 'Yield vs best ' + L, value: e == null ? ec.eff : pct(Math.min(100, e), 1), color: ec.effColor },
        { label: 'Gap vs best ' + L, value: et == null ? '—' : pct(Math.max(0, et), 1), color: et != null && et - v.t * 100 > 5 ? ORANGE : TEXT },
        { label: 'Alpha APY ' + L, value: pct(v[ak], 1), color: accent },
        { label: 'Rewards ' + L, value: yv == null ? '—' : signed(yv, (n) => n.toFixed(2) + '%'), color: accent },
        { label: 'Price ' + PL + ' (subnet mix)', value: pxTxt(px), color: GREY },
        { label: 'Net in TAO ' + L, value: retTxt(net), color: GREY },
      ],
      rows: shown.map((p) => {
        const s = A.sns.get(p.nu) || {}, pe = p[ek], r = p[rk], pc = effCell(pe, p[ak], accent);
        return Object.assign({}, pc, {
          sn: 'SN' + p.nu, name: s.name || 'Subnet ' + p.nu, tao: fmtInt(p.tao), a30: pct(p[ak], 1),
          rank: r ? '#' + r + ' / ' + (s['n' + ew] ?? '—') : '—', rankColor: r === 1 ? accent : '#C9D1D9',
          dp: pxTxt(s[dpk]),
          card: { sub: fmtInt(p.tao) + ' τ · rank ' + (r ? '#' + r : '—') + ' · price ' + pxTxt(s[dpk]), val: pct(p[ak], 1), valColor: pe == null ? MUTED : effColor(pe, accent), vsub: pc.eff === 'Not earning' ? pc.eff : pc.eff === '—' ? 'APY ' + L : pc.eff + ' of best' },
          go: () => this.leaveTo({ tab: 'alpha', sn: p.nu, q: '' }),
        });
      }),
    };
  }

  // Page for a validator with alpha stake but no root basket (most of the efficiency tab).
  alphaDetail(v, D, accent) {
    const S = this.state, A = S.alpha, ew = this.ewOf(A), L = wl(ew);
    const ek = 'eff' + ew, rk = 'rk' + ew;
    const dpk = A.win.includes(ew) ? 'dp' + ew : 'dp30';
    const name = this.vname(v.hk, v.n), m = mono(v.hk);
    const ranked = A.vs.filter((x) => x[ek] != null && x.tao >= 1000).sort((a, b) => b[ek] - a[ek]);
    const rkn = ranked.findIndex((x) => x.hk === v.hk) + 1;
    const rankTxt = rkn ? '#' + rkn + ' / ' + ranked.length + ' by yield vs best pools ' + L : 'unranked (needs ≥ 1K τ and ' + L + ' data)';
    const take = v.t || 0, e = v[ek], et = v['et' + ew] == null ? null : Math.max(0, v['et' + ew]), ec = effCell(e, v['a' + ew], accent);
    const PL = dpk.slice(2) + 'D', yv = yieldOver(v['a' + ew], ew), px = this.pxExposure(v, A, ew), net = v['r' + ew], ne = v['ne' + ew];
    const kpis = [
      { label: 'Alpha stake', value: fmtK(v.tao) + ' τ', color: TEXT, sub: '≈ ' + usd(v.tao * this.px), subColor: MUTED },
      { label: 'Yield vs best ' + L, value: e == null ? ec.eff : pct(Math.min(100, e), 1), color: ec.effColor, sub: ne >= 0.5 ? Math.round(ne) + '% of stake not earning' : 'vs the best pools on the same subnets', subColor: ne >= 0.5 ? ORANGE : MUTED },
      { label: 'Gap vs best ' + L, value: et == null ? '—' : pct(et, 1), color: et != null && et - take * 100 > 5 ? ORANGE : TEXT, sub: 'listed take ' + pct(take * 100, 0) + ' · configured ' + (v.cfg == null ? 'n/a' : pct(v.cfg, 1)), subColor: MUTED },
    ];
    if (A.np >= 2) kpis.push({ label: 'Consistency', value: v.cons == null ? '—' : pct(v.cons, 0), color: v.cons == null ? MUTED : v.cons >= 75 ? accent : v.cons >= 50 ? TEXT : ORANGE, sub: A.period + '-day periods at ≥ 90% of the best pools', subColor: MUTED });
    kpis.push({ label: 'Alpha APY ' + L, value: pct(v['a' + ew], 2), color: accent, sub: 'paid in alpha · ' + A.win.filter((w) => w !== ew && w !== 1).map((w) => wl(w) + ' ' + pct(v['a' + w], 1)).concat(v.a1 != null ? ['24h ' + ret3(yieldOver(v.a1, 1))] : []).join(' · '), subColor: MUTED });
    kpis.push({ label: 'Rewards ' + L, value: yv == null ? '—' : signed(yv, (n) => n.toFixed(2) + '%'), color: accent, sub: 'alpha earned over ' + L + ', not annualized', subColor: MUTED });
    kpis.push({ label: 'Price ' + PL + ' (subnet mix)', value: pxTxt(px), color: GREY, sub: 'alpha vs τ, same for every validator there', subColor: MUTED });
    kpis.push({ label: 'Net in TAO ' + L, value: retTxt(net), color: GREY, sub: 'rewards and price together', subColor: MUTED });
    kpis.push({ label: 'Childkey take', value: v.ct == null ? '—' : pct(v.ct, 1), color: v.ct != null && v.ct >= 5 ? ORANGE : TEXT, sub: 'paid to child hotkeys, weighted', subColor: MUTED });

    // efficiency per period, oldest → newest
    const per = (v.effp || []).slice(0, A.np).map((x, k) => ({ x, k })).reverse();
    const periods = per.map(({ x, k }) => {
      const end = (A.ts || D.ts) - k * A.period * 864e5, start = end - A.period * 864e5;
      return {
        h: x == null ? 2 : Math.max(2, Math.min(120, x) / 120 * 100).toFixed(1), fill: x == null ? '#232C38' : x >= 90 ? accent : x >= 70 ? '#C9D1D9' : ORANGE,
        val: x == null ? '—' : Math.min(x, 120).toFixed(0) + '%', label: dstr(start) + '–' + dstr(end),
        title: dstr(start) + '–' + dstr(end) + ': ' + (x == null ? 'no data' : 'yield vs best pools ' + x.toFixed(1) + '%'),
      };
    });

    const pools = v.pairs.filter((p) => p.tao >= 1);
    const shown = S.poolsAll ? pools : pools.slice(0, 30);
    const rows = shown.map((p) => {
      const s = A.sns.get(p.nu) || {}, pe = p[ek], r = p[rk], pc = effCell(pe, p['a' + ew], accent), nref = s['nref' + ew];
      return Object.assign({}, pc, {
        sn: 'SN' + p.nu, name: s.name || 'Subnet ' + p.nu, tao: fmtInt(p.tao),
        apys: A.win.map((w) => (w === 1 ? { t: ret3(yieldOver(p.a1, 1)), color: GREY, weight: 400 } : { t: pct(p['a' + w], 1), color: w === ew ? (pe == null ? MUTED : effColor(pe, accent)) : '#C9D1D9', weight: w === ew ? 700 : 400 })),
        ref: pct(s['ref' + ew], 1) + (nref != null && nref < 3 ? ' ·thin' : ''), refTitle: nref != null && nref < 3 ? 'Thin reference: only ' + nref + ' pool(s) ≥ 100 τ earned on this subnet' : 'Median of the 3 best pools ≥ 100 τ',
        rank: r ? '#' + r + ' / ' + (s['n' + ew] ?? '—') : '—', rankColor: r === 1 ? accent : '#C9D1D9',
        ct: p.ct == null ? 'n/a' : pct(p.ct, 1), ctColor: p.ct != null && p.ct >= 5 ? ORANGE : '#A9B4C2',
        dp: pxTxt(s[dpk]),
        card: { sub: fmtInt(p.tao) + ' τ · rank ' + (r ? '#' + r : '—') + ' · price ' + pxTxt(s[dpk]), val: pct(p['a' + ew], 1), valColor: pe == null ? MUTED : effColor(pe, accent), vsub: pc.eff === 'Not earning' ? pc.eff : pc.eff === '—' ? 'APY ' + L : pc.eff + ' of best' },
        aria: 'SN' + p.nu + ' ' + (s.name || '') + ', alpha APY ' + L + ' ' + pct(p['a' + ew]) + ', open subnet',
        go: () => this.leaveTo({ tab: 'alpha', sn: p.nu, q: '' }),
      });
    });
    const wcol = (w) => (w === ew ? 80 : 70);
    const grid = 'minmax(220px, 2fr) 104px ' + A.win.map((w) => wcol(w) + 'px').join(' ') + ' 84px 130px 84px 74px 76px';
    return Object.assign({}, m, {
      name, hk: v.hk, ini: initials(name, v.hk), rankTxt, take: pct(take * 100, 0),
      takeBg: take >= 0.15 ? '#2A1D0E' : take === 0 ? '#12281F' : '#161C25', takeFg: take >= 0.15 ? ORANGE : take === 0 ? accent : '#C9D1D9',
      nsTxt: fmtInt(v.ns) + (v.ns === 1 ? ' subnet' : ' subnets') + ' ≥ 10 τ', kpis, rows, empty: rows.length === 0,
      winCols: A.win.map((w) => ({ label: w === 1 ? 'Yield 24h' : 'APY ' + wl(w), color: w === ew ? TEXT : MUTED })), grid,
      minW: 220 + 104 + 84 + 130 + 84 + 74 + 76 + A.win.reduce((a, w) => a + wcol(w), 0) + 12 * (6 + A.win.length) + 40, effTip: EFF_TIP, pxTip: PX_TIP,
      hdrRef: 'Ref. ' + L, hdrDp: 'Price ' + dpk.slice(2) + 'D', poolNote: 'APY = alpha rewards, annualized · yield vs best = APY ÷ the best pools on that subnet · price = that subnet’s alpha move, shared by every validator there · click a subnet to open it',
      hasSelf: v['self' + ew] != null && v['self' + ew] >= 50, selfTitle: 'Its own pool is one of the best pools that set the subnet reference, so it is partly measured against itself.',
      hasPeriods: A.np >= 2, periods, cons: v.cons == null ? '—' : pct(v.cons, 0),
      perTitle: 'Yield vs best pools by ' + A.period + '-day period', perNote: 'Each bar is one ' + A.period + '-day period, oldest on the left. Green = earned at least 90% of what the best pools on the same subnets earned.',
      more: !S.poolsAll && pools.length > shown.length, moreTxt: 'Show all ' + pools.length + ' subnets', showAll: () => this.setState({ poolsAll: true }),
      copyTxt: this.copyTxt(), copy: () => this.copyHk(v.hk),
    });
  }

  detail(x, D, accent) {
    const S = this.state, win = this.winKey(D), L = wl(+win.slice(1)), N = D.N;
    const sw = D.st[win], rk = x.rk[win];
    const rankTxt = rk ? 'Root rank #' + rk + ' / ' + sw.ranked.length + ' by APY ' + L + ' · top ' + Math.max(1, Math.ceil(rk / sw.ranked.length * 100)) + '%' : 'root: unranked (' + L + ')';
    const dv = (v, m) => v == null || m == null ? { sub: 'not enough data', subColor: MUTED } : { sub: signed(v - m, (n) => n.toFixed(2)) + ' pp vs median', subColor: v >= m ? accent : ORANGE };
    const r = this.chartRng(D), f = x.fl[r];
    const order = [win].concat(D.rkeys.filter((k) => k !== win).reverse());
    const rootRet = (k) => { const v = x['r' + k.slice(1)]; return v == null ? '' : signed(v, (n) => n.toFixed(2) + '%') + ' τ over ' + wl(+k.slice(1)) + ' · '; };
    const kpis = order.map((k) => { const d = dv(x[k], D.meds[k]); return { label: 'APY ' + wl(+k.slice(1)), value: pct(x[k]), color: k === win ? accent : TEXT, sub: rootRet(k) + d.sub, subColor: rootRet(k) ? '#A9B4C2' : d.subColor }; }).concat([
      { label: 'Root stake', value: fmtK(x.s) + ' τ', color: TEXT, sub: f ? signed(f.pct, (n) => n.toFixed(1) + '%') + ' over ' + f.days + ' days' : 'no history yet', subColor: f && f.flow > 0 ? accent : f && f.flow < 0 ? ORANGE : MUTED },
      { label: 'Stability σ', value: x.sd == null ? '—' : x.sd.toFixed(2) + ' pp', color: TEXT, sub: 'std dev of 7D APY (lower = steadier)', subColor: MUTED },
    ]);
    if (D.keys.includes('a1')) kpis.splice(order.length, 0, { label: 'Last 24h', value: ret3(x.r1) + ' τ', color: TEXT, sub: 'τ earned per τ staked, not annualized', subColor: MUTED });

    // APY chart over the selected range; x = end day of each rolling window
    const s0 = Math.max(0, N - r);
    const ser = x.d.slice(s0), med = D.med.slice(s0), n = ser.length;
    const e0 = s0 + 7; // end day of the first 7D point
    const frac = (e) => (n > 1 ? (e - e0) / (N - e0) : 0.5);
    const show30 = r >= 60 && x.d30.length > 0;
    const p30 = show30 ? x.d30.map((v, i) => [i + 30, v]).filter(([e]) => e >= e0).map(([e, v]) => [frac(e), v]) : [];
    const all = ser.concat(med).concat(p30.map((p) => p[1])).filter((v) => v != null);
    const lo = all.length ? Math.max(0, Math.floor(quant(all, 0.01) - 0.5)) : 0;
    const hi = all.length ? Math.max(lo + 1, Math.ceil(quant(all, 0.99) + 0.5)) : 10;
    const tp = (v) => ((1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100);
    const hj = S.hovIdx != null && S.hovIdx < n ? S.hovIdx : null;
    const hv = hj != null ? ser[hj] : null, hm = hj != null ? med[hj] : null;
    const h30 = hj != null && show30 ? x.d30[s0 + 7 + hj - 30] : null;
    // shaded stretch where BasketRate stood still, when it falls inside the range
    const dayAt = (ts) => { const i = D.days.findIndex((t) => t >= ts); return i < 0 ? N + 1 : i; };
    const pa = Math.max(0, frac(dayAt(PAUSE_TS[0]))), pb = Math.min(1, frac(dayAt(PAUSE_TS[1]) + 7));
    const hasPause = pb > pa && pa < 1 && pb > 0;
    const long = n > 120;
    const ch = {
      line: linePath(ser, 600, 200, lo, hi), area: areaPath(ser, 600, 200, lo, hi), med: linePath(med, 600, 200, lo, hi),
      l30: ptsPath(p30, 600, 200, lo, hi), has30: p30.length > 1, sw: long ? 1.4 : n > 40 ? 1.8 : 2.2,
      ticks: ticks(lo, hi, 5).map((v) => ({ pos: tp(v).toFixed(2), label: v + '%' })),
      xl: xLabels(n, 6, (j) => dstr(D.days[Math.min(N, e0 + j)])),
      hasPause, pauseL: (pa * 100).toFixed(2), pauseW: ((pb - pa) * 100).toFixed(2),
      cols: ser.map((_, j) => ({ enter: () => this.setState({ hovIdx: j }) })),
      leave: () => this.setState({ hovIdx: null }),
      title: 'Rolling APY vs network median, ' + (r === N && !RANGES.includes(N) ? 'all ' + N + ' days' : r + ' days'),
      hasRngs: D.ranges.length > 1, rngs: segChips(D.ranges, r, (q) => rangeLabel(q, N), accent, (q) => this.setState({ crng: q, hovIdx: null })),
      hasTip: hj != null && hv != null,
      tip: hj != null && hv != null ? {
        x: (frac(e0 + hj) * 100).toFixed(2), vy: tp(hv).toFixed(2), my: hm == null ? 0 : tp(hm).toFixed(2),
        shift: hj > n * 0.7 ? 'calc(-100% - 12px)' : '12px', date: dstr(D.days[Math.min(N, e0 + hj)]),
        v: x.name + ' ' + pct(hv), m: pct(hm), diff: hm == null ? '' : signed(hv - hm, (q) => q.toFixed(2)) + ' pp', diffColor: hm != null && hv >= hm ? accent : ORANGE,
        has30: h30 != null, t30: '30D ' + pct(h30),
      } : {},
    };

    // stake chart over the same range
    const sh = x.sh.slice(s0), shv = sh.filter((v) => v != null);
    const smin = shv.length ? Math.min(...shv) : 0, smax = shv.length ? Math.max(...shv) : 1;
    const pad = Math.max(1, (smax - smin) * 0.15);
    const slo = Math.max(0, smin - pad), shi = smax + pad;
    const st = {
      line: linePath(sh, 600, 200, slo, shi), area: areaPath(sh, 600, 200, slo, shi), sw: sh.length > 120 ? 1.4 : 2,
      ticks: ticks(slo, shi, 3).map((v) => ({ pos: ((1 - (v - slo) / (shi - slo)) * 100).toFixed(2), label: fmtK(v) })),
      xl: xLabels(sh.length, 4, (j) => dstr(D.days[s0 + j])),
      title: 'Root stake, ' + (f ? f.days : r) + ' days',
      delta: f ? signed(f.flow, fmtInt) + ' τ (' + signed(f.pct, (q) => q.toFixed(1) + '%') + ')' : '—',
      color: f && f.flow > 0 ? accent : f && f.flow < 0 ? ORANGE : MUTED,
    };

    // basket
    const rows = x.h.map(([netuid, name, spot]) => ({ sn: 'SN' + netuid, name: name || 'Subnet ' + netuid, spot, share: x.snav > 0 ? pct(spot / x.snav * 100, 1) : '—' }));
    if (x.nh > 8 && x.hr > 0) rows.push({ sn: '+' + (x.nh - 8), name: 'other subnets', spot: x.hr, share: x.snav > 0 ? pct(x.hr / x.snav * 100, 1) : '—', other: true });
    const bmax = Math.max(1e-9, ...rows.map((q) => q.spot));
    const slip = x.snav > 0 ? (1 - x.nav / x.snav) * 100 : null;
    const bk = {
      count: x.nh, nav: fmtNum(x.nav, 1), snav: fmtNum(x.snav, 1), slip: pct(slip), slipColor: slip != null && slip > 2 ? ORANGE : TEXT,
      rows: rows.map((q) => ({ sn: q.sn, name: q.name, share: q.share, w: (q.spot / bmax * 100).toFixed(1), fill: q.other ? '#3B4A5E' : accent })),
    };

    // calculator, on the selected window (falling back to 30D, then 7D)
    const amt = parseFloat(String(S.amt).replace(/[^0-9.]/g, '')) || 0;
    const ck = x[win] != null ? win : x.a30 != null ? 'a30' : 'a7';
    const apy = x[ck];
    const CL = wl(+ck.slice(1)), cm = D.meds[ck], best = D.st[ck] ? D.st[ck].best : null;
    const yr = apy == null ? null : amt * apy / 100;
    const cmp = [];
    if (apy != null && cm != null) {
      const dm = amt * (apy - cm) / 100;
      cmp.push({ label: 'vs median (' + pct(cm) + ')', value: signed(dm, (q) => fmtNum(q, 2)) + ' τ/yr', color: dm >= 0 ? accent : ORANGE });
    }
    if (apy != null && best && best.hk !== x.hk) {
      const db = amt * (best[ck] - apy) / 100;
      // `best` is the top APY among validators ≥ 1K τ; a smaller one can beat it
      if (db > 0) cmp.push({ label: 'Switch to ' + best.name + ' (' + pct(best[ck]) + ')', value: '+' + fmtNum(db, 2) + ' τ/yr', color: accent });
      else cmp.push({ label: 'Ahead of the top ranked ' + best.name + ' (' + pct(best[ck]) + ')', value: signed(-db, (q) => fmtNum(q, 2)) + ' τ/yr', color: accent });
    } else if (best && best.hk === x.hk) {
      cmp.push({ label: 'This is the top validator by ' + CL + ' APY', value: '', color: accent });
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
        note: 'Based on the current ' + CL + ' APY, assuming basket alpha prices hold. USD at the live TAO/USDT price from Binance.',
      },
      copyTxt: this.copyTxt(), copy: () => this.copyHk(x.hk),
    };
  }
}
