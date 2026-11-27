// Generated from design/TerminalAnalytics.dc.html by tools/dc2web.py — edit the design, then rerun.
const DATA_URL = '/api/validators';
const ALPHA_URL = '/api/alpha';
const G = '#4BE38A', AMB = '#F2B544', RED = '#FF6B5E', TXT = '#E8F2EA', DIM = '#8A978E', MID = '#A9B6AD', LINE = '#2C3A33', CURBG = '#0E1F15';
const MINS = [[0, 'all'], [1000, '1k'], [10000, '10k'], [100000, '100k']];
const SPARK = '▁▂▃▄▅▆▇█';
const PRICE_WS = 'wss://data-stream.binance.vision/ws/taousdt@ticker';
const PRICE_SNAPSHOT = { c: 185.10, P: 3.989, h: 186.10, l: 169.10, q: 16169472.5 };
const UI_KEY = 'vy.ui';
const TABS = ['root', 'alpha', 'eff'];
const pct = (x, n) => (x == null || !isFinite(x) ? '—' : x.toFixed(n == null ? 2 : n) + '%');
const sgn = (x, n) => (x == null || !isFinite(x) ? '—' : (x > 0.0005 ? '+' : x < -0.0005 ? '−' : '') + Math.abs(x).toFixed(n == null ? 1 : n) + '%');
const fk = (x) => (x == null || !isFinite(x) ? '—' : Math.abs(x) >= 1e6 ? (x / 1e6).toFixed(2) + 'M' : Math.abs(x) >= 1e3 ? (x / 1e3).toFixed(1) + 'K' : Math.round(x).toLocaleString('en-US'));
// subnet search: "51", "sn51", "SN 51" match the netuid (exact first, then prefix); anything else
// matches the subnet name, case-insensitive
function matchSubnets(subs, raw) {
  const q = String(raw || '').trim().toLowerCase();
  if (!q) return subs.slice();
  const n = q.replace(/\s+/g, '').replace(/^sn/, '');
  if (n === '') return subs.slice(); // just "sn"
  if (/^\d+$/.test(n)) {
    const exact = subs.filter((s) => String(s.nu) === n);
    return exact.concat(subs.filter((s) => String(s.nu) !== n && String(s.nu).startsWith(n)));
  }
  return subs.filter((s) => (s.name || '').toLowerCase().includes(q));
}
const short = (hk) => (hk ? hk.slice(0, 6) + '…' + hk.slice(-4) : '');
const median = (xs) => { const a = xs.filter((x) => x != null && isFinite(x)).sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const bar = (frac, w) => { const n = Math.max(0, Math.min(w, Math.round(frac * w))); return ['█'.repeat(n), '░'.repeat(w - n)]; };
// up to 16 cells sampled back from the newest point, so the latest day is always drawn; gaps stay blank
const spark = (xs) => { const a = xs || [], v = a.filter((x) => x != null); if (v.length < 2) return '·'; const lo = Math.min(...v), hi = Math.max(...v); const st = Math.max(1, Math.ceil(a.length / 16)); let s = ''; for (let i = a.length - 1; i >= 0; i -= st) { const x = a[i]; s = (x == null ? ' ' : SPARK[hi > lo ? Math.round(((x - lo) / (hi - lo)) * 7) : 3]) + s; } return s; };
// BasketRate stood still Nov 7–11 2026; rolling points overlapping it are left out of σ
const PAUSE_TS = [Date.UTC(2026, 10, 7), Date.UTC(2026, 10, 12)];
// σ of the rolling 7d apy over the last w days (d[j] ends on day j + 7); under 5 points says nothing
function sdOver(dd, days, w) {
  const N = days.length - 1, xs = [];
  for (let j = Math.max(0, N - 7 - w + 1); j < dd.length; j++) {
    const v = dd[j], t = days[j + 7];
    if (v == null || t == null || (t > PAUSE_TS[0] && t < PAUSE_TS[1] + 7 * 864e5)) continue;
    xs.push(v);
  }
  if (xs.length < 5) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}
const vhref = (hk) => '/terminal#v/' + hk;
function usd(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function modified(e) { return !!(e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)); }
// Remember the default interface and open its analytics page.
function toDefaultUI(e) {
  if (modified(e)) return;
  if (e) e.preventDefault();
  try { localStorage.setItem(UI_KEY, 'default'); } catch (err) { /* storage blocked: the link still works */ }
  window.location.href = '/analytics';
}

const PX_EVERY = 2000;
// single-key shortcuts can be switched off (WCAG 2.1.4), remembered per viewer (shared with /terminal)
const keysStored = () => { try { return localStorage.getItem('vy.keys') !== 'off'; } catch (e) { return true; } };

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { data: null, err: null, tab: 'root', win: null, min: 1000, q: '', snQ: '', sn: null, sortR: null, dirR: -1, sortE: null, dirE: -1, limit: 40, cur: 0, cmd: '', feedback: 'type help for commands', fbOk: true, px: null, pxLive: false, pxDir: 0, keys: keysStored() };
    this.rows = [];
  }
  componentDidMount() {
    this.connectPrice();
    if (typeof window !== 'undefined' && !this.winBound) {
      this.winBound = true;
      window.addEventListener('pageshow', (e) => this.onPageShow(e));
      document.addEventListener('keydown', (e) => this.onKey(e));
    }
    const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    Promise.all([get(DATA_URL), get(ALPHA_URL)])
      .then(([v, a]) => this.setState({ data: this.prep(v, a) }))
      .catch((e) => this.setState({ err: 'could not load data (' + String((e && e.message) || e) + ')', feedback: 'error: could not load data', fbOk: false }));
  }
  componentWillUnmount() {
    this.dead = true;
    clearTimeout(this.wsTimer);
    clearTimeout(this.pxTimer);
    this.pxTimer = null;
    if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) { /* ignore */ } }
  }

  // ---- live TAO price (same feed as the other pages) ----
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
      this.pxNext = { c, P: parseFloat(m.P), h: parseFloat(m.h), l: parseFloat(m.l), q: parseFloat(m.q) };
      this.flushPrice();
    };
    ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.setState({ pxLive: false }); this.retryPrice(); } };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* ignore */ } };
  }
  // At most one price render every PX_EVERY ms, and none when nothing visible changed.
  flushPrice() {
    if (this.pxTimer) return;
    const wait = Math.max(0, (this.pxAt || 0) + PX_EVERY - Date.now());
    this.pxTimer = setTimeout(() => {
      this.pxTimer = null;
      const n = this.pxNext, S = this.state, p = S.px;
      this.pxNext = null;
      if (!n || this.dead) return;
      if (S.pxLive && p && p.c === n.c && p.P === n.P) return;
      this.pxAt = Date.now();
      this.setState({ pxLive: true, pxDir: !p || n.c === p.c ? 0 : n.c > p.c ? 1 : -1, px: n });
    }, wait);
  }
  toggleKeys() {
    const on = !this.state.keys;
    try { localStorage.setItem('vy.keys', on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
    this.setState({ keys: on, feedback: 'ok: single-key shortcuts ' + (on ? 'on' : 'off'), fbOk: true });
  }
  retryPrice() {
    if (this.dead) return;
    this.wsTries = (this.wsTries || 0) + 1;
    clearTimeout(this.wsTimer);
    this.wsTimer = setTimeout(() => this.connectPrice(), Math.min(30000, 1000 * 2 ** this.wsTries));
  }
  onPageShow(e) {
    if (!e.persisted) return;
    this.dead = false;
    this.wsTries = 0;
    if (!this.ws) this.connectPrice();
  }
  ticker() {
    const S = this.state, p = S.px || PRICE_SNAPSHOT, live = S.pxLive && !!S.px;
    return {
      price: '$' + p.c.toFixed(2), chg: sgn(p.P, 2) + ' 24h', chgColor: p.P >= 0 ? G : AMB,
      flash: !live || S.pxDir === 0 ? TXT : S.pxDir > 0 ? G : AMB,
      dot: live ? G : '#5B675F', status: live ? 'live' : S.px ? 'reconnecting' : 'snapshot',
      title: 'Binance TAO/USDT · 24h high $' + p.h.toFixed(2) + ' · low $' + p.l.toFixed(2) + ' · vol ' + usd(p.q),
    };
  }

  // ---- data: /api/validators (root) + /api/alpha (subnets, validators, pools) ----
  prep(v, a) {
    const root = (v.v || []).map((r) => Object.assign({}, r));
    const subs = (a.subnets || []).map((s) => Object.assign({}, s));
    const av = (a.v || []).map((x) => Object.assign({}, x));
    const pf = a.pf || [];
    const bySn = new Map();
    (a.p || []).forEach((row) => {
      const p = {}; pf.forEach((k, i) => { p[k] = row[i]; });
      p.val = av[p.v];
      if (!p.val) return;
      if (!bySn.has(p.nu)) bySn.set(p.nu, []);
      bySn.get(p.nu).push(p);
    });
    // windows with an efficiency (≥ 7 days) that both documents carry
    const rwin = v.win || [1, 7, 30];
    let wins = (a.ewin || [7, 30]).filter((w) => w >= 7 && rwin.includes(w));
    if (!wins.length) wins = [7, 30];
    // stake flow per window (sh is one point per day): from the first stored day inside the window
    root.forEach((r) => {
      const sh = r.sh || [], n = sh.length - 1, last = sh[n];
      r.fw = {}; r.sdw = {};
      wins.forEach((w) => {
        r.sdw[w] = sdOver(r.d || [], v.days || [], w);
        let i = Math.max(0, n - w);
        while (i < n && sh[i] == null) i++;
        r.fw[w] = i < n && last != null ? { flow: last - sh[i], days: n - i } : null;
      });
    });
    const rootByHk = new Map(root.map((r) => [r.hk, r]));
    return { block: a.block || v.block, ts: a.ts || v.ts, root, subs, av, bySn, rootByHk, wins };
  }
  // default window: 30d, or the longest one with data while history is still syncing
  winOf(D) {
    const w = this.state.win;
    if (!D) return 30;
    if (D.wins.includes(w)) return w;
    const has = (x) => D.root.some((r) => r['a' + x] != null);
    if (D.wins.includes(30) && has(30)) return 30;
    return D.wins.slice().reverse().find(has) || D.wins[D.wins.length - 1];
  }

  // ---- commands ----
  run() {
    const raw = this.state.cmd.trim(), t = raw.toLowerCase().split(/\s+/).filter(Boolean), D = this.state.data;
    if (!t.length) return;
    const ok = (m, patch) => this.setState(Object.assign({ feedback: 'ok: ' + m, fbOk: true, cmd: '', limit: 40, cur: 0 }, patch || {}));
    const bad = (m) => this.setState({ feedback: 'error: ' + m, fbOk: false });
    const c = t[0], wins = D ? D.wins : [7, 30];
    if (c === 'help') return this.setState({ cmd: '', fbOk: true, feedback: this.hint() });
    if (c === 'tab') { const k = { root: 'root', alpha: 'alpha', eff: 'eff', efficiency: 'eff', '1': 'root', '2': 'alpha', '3': 'eff' }[t[1]]; return k ? ok('tab ' + k, { tab: k }) : bad('tab root, alpha or eff'); }
    if (c === 'window' || c === 'w') { if (!/^\d+d?$/.test(t[1] || '')) return bad('window ' + wins.join(', ')); const w = parseInt(t[1], 10); return wins.includes(w) ? ok('window ' + w + 'd', { win: w }) : bad('window ' + wins.join(', ')); }
    if (c === 'min') { const m = MINS.find((x) => x[1] === t[1] || String(x[0]) === t[1]); return m ? ok('min ' + m[1], { min: m[0] }) : bad('min all, 1k, 10k or 100k'); }
    if (c === 'sn') {
      const arg = t.slice(1).join(' ');
      if (!arg) return bad('sn <netuid or name>, e.g. sn 51 or sn lium');
      if (!D) return bad('no data yet');
      const a = arg.replace(/\s+/g, '').replace(/^sn/, '');
      if (/^\d+$/.test(a)) { const n = Number(a); return D.bySn.has(n) ? ok('subnet ' + n, { tab: 'alpha', sn: n, q: '', snQ: '' }) : bad('no subnet ' + n + ' in the data'); }
      const hits = matchSubnets(D.subs, arg);
      if (!hits.length) return bad('no subnet name matches "' + arg + '"');
      const exact = hits.filter((s) => (s.name || '').toLowerCase() === arg);
      const pick = hits.length === 1 ? hits[0] : exact.length === 1 ? exact[0] : null;
      if (pick) return ok('subnet ' + pick.nu + ' · ' + pick.name, { tab: 'alpha', sn: pick.nu, q: '', snQ: '' });
      return bad(hits.length + ' subnets match: ' + hits.slice(0, 8).map((s) => 'sn' + s.nu + ' ' + s.name).join(' · ') + (hits.length > 8 ? ' …' : '') + ' — use the number');
    }
    if (c === 'keys') return t[1] === 'on' || t[1] === 'off' ? (this.state.keys !== (t[1] === 'on') ? this.toggleKeys() : ok('keys ' + t[1])) : bad('keys on|off');
    if (c === 'sort') {
      const k = t[1], dir = t[2] === 'asc' ? 1 : -1, tab = this.state.tab;
      if (tab === 'eff') return ['eff', 'gap', 'tao', 'take', 'cfg'].includes(k) ? ok('sort ' + k, { sortE: k, dirE: dir }) : bad('sort eff, gap, tao, take or cfg');
      if (tab === 'alpha') return bad('the subnet table is ranked by apy');
      return ['apy', 'stake', 'take', 'flow', 'sd', 'nom'].includes(k) ? ok('sort ' + k, { sortR: k === 'apy' ? null : k, dirR: dir }) : bad('sort apy, stake, take, flow, sd or nom');
    }
    if (c === 'clear') return ok('cleared', { q: '', sortR: null, sortE: null, dirR: -1, dirE: -1, min: 1000 });
    return ok('search "' + raw + '"', { q: raw });
  }
  hint() {
    const wins = this.state.data ? this.state.data.wins : [7, 30];
    return 'tab root|alpha|eff · window ' + wins.join('|') + ' · min all|1k|10k|100k · sn <netuid|name> · sort apy|stake|take|flow|eff|gap [asc] · keys on|off · clear · anything else = search';
  }

  // ---- keyboard: 1/2/3 tabs, w window, j/k move, enter open, / command, esc clear, t default UI ----
  onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || (t && t.isContentEditable)) return;
    const k = e.key, S = this.state, D = S.data;
    if (!S.keys) return;
    if (k === 't') { e.preventDefault(); toDefaultUI(); return; }
    if (k === '/') { e.preventDefault(); this.focusCmd(); return; }
    if (!D) return;
    if (k === '1' || k === '2' || k === '3') { e.preventDefault(); this.setState({ tab: TABS[+k - 1], limit: 40, cur: 0 }); }
    else if (k === 'w') { e.preventDefault(); const ws = D.wins, i = ws.indexOf(this.winOf(D)); this.setState({ win: ws[(i + 1) % ws.length] }); }
    else if (k === 'j' || k === 'k') { e.preventDefault(); this.move(k === 'j' ? 1 : -1); }
    else if (k === 'Enter') { if (tag === 'a' || tag === 'button') return; e.preventDefault(); const r = this.rows[Math.min(S.cur, this.rows.length - 1)]; if (r) window.location.href = vhref(r); }
    else if (k === 'Escape') { e.preventDefault(); this.setState({ q: '', sortR: null, sortE: null, dirR: -1, dirE: -1, cur: 0, feedback: 'ok: cleared', fbOk: true }); }
  }
  move(d) {
    const n = this.rows.length;
    if (!n) return;
    const i = Math.max(0, Math.min(n - 1, Math.min(this.state.cur, n - 1) + d));
    this.setState({ cur: i });
    this.focusRow(i);
  }
  // Focus the row's link (table on wide screens, card on phones) so screen readers follow the cursor.
  focusRow(i) {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      let el = document.getElementById('ta-r-' + i);
      if (!el || el.offsetParent === null) el = document.getElementById('ta-c-' + i);
      if (!el || el.offsetParent === null) return;
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      el.scrollIntoView({ block: 'nearest' });
    }));
  }
  focusCmd() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => { const el = document.getElementById('ta-cmd'); if (el) { el.focus(); if (el.select) el.select(); } });
  }
  // shared row fields: link, cursor highlight, ids
  rowNav(hk, i, name) {
    const on = i === this.state.cur;
    return { href: vhref(hk), id: 'ta-r-' + i, cid: 'ta-c-' + i, bg: on ? CURBG : 'transparent', cur: on ? '>' : '', aria: (name || short(hk)) + ', open validator page', focus: () => { if (this.state.cur !== i) this.setState({ cur: i }); } };
  }
  head(cols, key, dir, set) {
    return cols.map(([k, label, justify]) => {
      const on = key === k;
      return { label, justify, sortable: !!k, plain: !k, on, fg: on ? G : DIM, uline: on ? G : 'transparent', arrow: k ? (on ? (dir < 0 ? ' ▼' : ' ▲') : ' ↕') : '',
        aria: label + (on ? (dir < 0 ? ', sorted high to low' : ', sorted low to high') : ', sortable'),
        sort: k ? () => set(k, on ? -dir : -1) : null };
    });
  }

  renderVals() {
    const S = this.state, D = S.data, tab = S.tab, w = this.winOf(D), ak = 'a' + w, ek = 'eff' + w, winLbl = w + 'd', ow = w === 7 ? 30 : 7;
    const minLbl = (MINS.find((m) => m[0] === S.min) || MINS[1])[1];
    const chip = (on) => ({ border: on ? G : LINE, bg: on ? CURBG : 'transparent', fg: on ? G : MID });
    const q = S.q.trim().toLowerCase();
    const match = (n, hk) => !q || (n || '').toLowerCase().includes(q) || (hk || '').toLowerCase().includes(q);
    this.rows = [];
    const base = {
      tk: this.ticker(), toDefault: (e) => toDefaultUI(e), cmdHint: this.hint(),
      keysHint: S.keys ? '1/2/3 tab · w window · j/k move · enter open · / command · esc clear · t default UI' : 'single-key shortcuts off',
      keysLabel: S.keys ? 'keys: on' : 'keys: off', keysOn: S.keys, toggleKeys: () => this.toggleKeys(),
      cmd: S.cmd, feedback: S.feedback, fbColor: S.fbOk ? MID : RED, q: S.q, winLbl, owLbl: ow + 'd', minLbl,
      onCmd: (e) => this.setState({ cmd: e.target.value }), onCmdKey: (e) => { if (e.key === 'Enter') this.run(); else if (e.key === 'Escape') e.target.blur(); }, runCmd: () => this.run(),
      onQ: (e) => this.setState({ q: e.target.value, limit: 40, cur: 0 }), showMore: () => this.setState({ limit: S.limit + 60 }),
      tab1: () => this.setState({ tab: 'root', limit: 40, cur: 0 }), tab2: () => this.setState({ tab: 'alpha', limit: 40, cur: 0 }), tab3: () => this.setState({ tab: 'eff', limit: 40, cur: 0 }),
      toggleWin: () => { if (D) { const i = D.wins.indexOf(w); this.setState({ win: D.wins[(i + 1) % D.wins.length] }); } },
      wins: (D ? D.wins : [7, 30]).map((x) => Object.assign({ label: x + 'D', on: x === w, pick: () => this.setState({ win: x }) }, chip(x === w))),
      mins: MINS.map(([v, l]) => Object.assign({ label: l === 'all' ? 'ALL' : '≥' + l.toUpperCase(), on: v === S.min, pick: () => this.setState({ min: v, limit: 40, cur: 0 }) }, chip(v === S.min))),
      rootTab: tab === 'root', alphaTab: tab === 'alpha', effTab: tab === 'eff',
      prompt: 'analytics --tab ' + tab + ' --window ' + winLbl + ' --min ' + minLbl + (tab === 'alpha' && S.sn ? ' --subnet ' + S.sn : '') + (q ? ' --search "' + S.q.trim() + '"' : ''),
      block: D && D.block ? '#' + D.block.toLocaleString('en-US') : '…', age: D && D.ts ? Math.max(0, Math.round((Date.now() - D.ts) / 60000)) + 'm old' : S.err ? 'error' : 'loading',
      viewTxt: tab === 'root' ? 'root stake' : tab === 'alpha' ? 'alpha by subnet' : 'validator efficiency',
      kpis: [], tabs: [],
      sc: { dots: [], yTicks: [], note: '', aria: '' }, hist: { rows: [], n: 0, note: '' }, flows: { rows: [], span: '' },
      rCols: [], rRows: [], rCount: '', rMore: false, rMoreN: 0,
      snList: [], snEmpty: false, snEmptyQ: '', snQ: S.snQ, onSnQ: (e) => this.setState({ snQ: e.target.value }), snQKey: null, snCount: '', snFilterBorder: '#2C3A33', noCur: false, noCurTxt: '',
      cur: { nu: '—', name: '', ref: '', thin: '', price: '', n: '', tao: '', line: '' }, pRows: [], pCount: '',
      es: { dots: [], aria: '' }, gaps: [], noGaps: false, neNote: false, neTxt: '', eCols: [], eRows: [], eCount: '', eMore: false, eMoreN: 0,
    };
    if (!D) return Object.assign(base, { feedback: S.err ? 'error: ' + S.err : 'loading data…', fbColor: S.err ? RED : MID });

    // ---------- root ----------
    const big = D.root.filter((r) => (r.s || 0) >= S.min);
    const ranked = big.filter((r) => r[ak] != null).sort((a, b) => b[ak] - a[ak]);
    const rankOf = new Map(ranked.map((r, i) => [r.hk, i + 1]));
    const medA = median(big.map((r) => r[ak]));
    // ---------- alpha validators ----------
    const effList = D.av.filter((v) => (v.tao || 0) >= S.min);
    const earning = (v) => !((v['ne' + w] || 0) >= 50) && v[ak] != null && v[ak] >= 0.01;
    const neList = effList.filter((v) => !earning(v));
    const subsSorted = D.subs.slice().sort((a, b) => (b.tao || 0) - (a.tao || 0));

    base.tabs = [['root', 'ROOT STAKE', D.root.length], ['alpha', 'ALPHA BY SUBNET', D.subs.length], ['eff', 'EFFICIENCY', effList.length]]
      .map(([k, l, n], i) => Object.assign({ label: (i + 1) + ' ' + l, count: n, on: tab === k, pick: () => this.setState({ tab: k, limit: 40, cur: 0 }) }, chip(tab === k)));

    if (tab === 'root') {
      const best = ranked[0];
      base.kpis = [
        { label: 'root validators', value: String(D.root.length), sub: ranked.length + ' with ≥ ' + minLbl + ' τ and ' + winLbl + ' data', fg: TXT },
        { label: 'root stake', value: fk(D.root.reduce((a, r) => a + (r.s || 0), 0)) + ' τ', sub: 'all validators with a basket', fg: TXT },
        { label: 'median apy ' + winLbl, value: pct(medA), sub: 'validators ≥ ' + minLbl + ' τ', fg: G },
        { label: 'best apy ' + winLbl, value: pct(best && best[ak]), sub: best ? (best.n || short(best.hk)) + ' · take ' + pct(best.t * 100, 0) : 'needs ' + winLbl + ' of samples', fg: G },
      ];
      if (ranked.length) {
        const ys = ranked.map((r) => r[ak]), lo = Math.floor(Math.min(...ys, 0)), hi = Math.ceil(Math.max(...ys, 1));
        const maxS = Math.max(...ranked.map((r) => r.s || 0), 1);
        base.sc.dots = ranked.map((r) => ({ x: Math.min(100, (r.t * 100 / 20) * 100), y: ((r[ak] - lo) / (hi - lo || 1)) * 100, fg: r.t >= 0.15 ? AMB : G, size: 8 + Math.round(Math.sqrt((r.s || 0) / maxS) * 14), tip: (r.n || short(r.hk)) + ' · take ' + pct(r.t * 100, 0) + ' · apy ' + pct(r[ak]) }));
        base.sc.yTicks = [0, 25, 50, 75, 100].map((p) => ({ p, t: (lo + (hi - lo) * p / 100).toFixed(1) + '%' }));
        const n = ranked.length, mx = ranked.reduce((a, r) => a + r.t * 100, 0) / n, my = ranked.reduce((a, r) => a + r[ak], 0) / n;
        const cov = ranked.reduce((a, r) => a + (r.t * 100 - mx) * (r[ak] - my), 0), vx = ranked.reduce((a, r) => a + (r.t * 100 - mx) ** 2, 0);
        const slope = vx > 0 ? cov / vx : null;
        base.sc.note = '# every 1% of take moves apy by ' + (slope == null ? '—' : (slope >= 0 ? '+' : '−') + Math.abs(slope).toFixed(3) + ' pp') + '. amber = take ≥ 15%. size = root stake.';
        base.sc.aria = 'Scatter of ' + n + ' validators: take against APY ' + winLbl;
        const vals = ys, bmin = Math.floor(Math.min(...vals, 0) * 2) / 2, bmax = Math.ceil(Math.max(...vals, 0.5) * 2) / 2;
        const bins = []; for (let b = bmin; b < bmax; b += 0.5) bins.push({ lo: b, n: 0 });
        vals.forEach((v) => { const i = Math.min(bins.length - 1, Math.max(0, Math.floor((v - bmin) / 0.5))); bins[i].n++; });
        const top = Math.max(1, ...bins.map((b) => b.n));
        const desc = vals.slice().sort((a, b) => b - a), asc = vals.slice().sort((a, b) => a - b);
        base.hist = {
          n: vals.length,
          rows: bins.map((b) => { const isMed = medA != null && medA >= b.lo && medA < b.lo + 0.5; return { range: b.lo.toFixed(1) + '–' + (b.lo + 0.5).toFixed(1) + '%', n: b.n, bar: '█'.repeat(Math.round((b.n / top) * 28)), fg: isMed ? G : '#5E8A6E', med: isMed ? ' ◄ median' : '' }; }),
          note: '# top 10% earn above ' + pct(desc[Math.floor(vals.length * 0.1)]) + ', bottom 10% below ' + pct(asc[Math.floor(vals.length * 0.1)]) + '.',
        };
      } else {
        base.sc.note = '# no validator ≥ ' + minLbl + ' τ has ' + winLbl + ' of data yet.';
        base.hist.note = '# waiting for ' + winLbl + ' of samples.';
      }
      D.root.forEach((r) => { const f = r.fw[w]; r.flow = f ? f.flow : null; r.flowDays = f ? f.days : 0; });
      const fl = D.root.filter((r) => r.flow != null && (r.s || 0) >= S.min);
      const ins = fl.filter((r) => r.flow > 0).sort((a, b) => b.flow - a.flow).slice(0, 5), outs = fl.filter((r) => r.flow < 0).sort((a, b) => a.flow - b.flow).slice(0, 5);
      const fmax = Math.max(1, ...ins.concat(outs).map((r) => Math.abs(r.flow)));
      const span = Math.max(0, ...fl.map((r) => r.flowDays));
      base.flows = { span: span + 'd', rows: ins.concat(outs).map((r) => ({ name: r.n || short(r.hk), val: (r.flow > 0 ? '+' : '−') + fk(Math.abs(r.flow)) + ' τ', fg: r.flow > 0 ? G : AMB, bar: (r.flow > 0 ? '▶' : '◀') + '█'.repeat(Math.max(1, Math.round((Math.abs(r.flow) / fmax) * 14))) })) };
      const cols = [[null, '#', 'start'], [null, 'validator', 'start'], ['stake', 'stake τ', 'end'], ['take', 'take', 'end'], [null, 'apy ' + ow + 'd', 'end'], ['apy', 'apy ' + winLbl, 'end'], [null, 'trend ' + winLbl, 'start'], ['flow', 'flow ' + span + 'd', 'end'], ['sd', 'stab ' + winLbl, 'end'], ['nom', 'noms', 'end']];
      const key = S.sortR || 'apy';
      base.rCols = this.head(cols, key, S.dirR, (k, dir) => this.setState({ sortR: k === 'apy' ? null : k, dirR: dir, cur: 0 }));
      const val = { apy: (r) => r[ak], stake: (r) => r.s, take: (r) => r.t, flow: (r) => r.flow, sd: (r) => r.sdw[w], nom: (r) => r.nom }[key];
      const rows = big.filter((r) => match(r.n, r.hk)).sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x - y) * S.dirR; });
      const shown = rows.slice(0, S.limit);
      this.rows = shown.map((r) => r.hk);
      base.rRows = shown.map((r, i) => {
        const rk = rankOf.get(r.hk), name = r.n || short(r.hk);
        return Object.assign({ rank: rk || '—', rankFg: rk && rk <= 3 ? G : DIM, name, hk: short(r.hk), stake: fk(r.s), take: pct(r.t * 100, 0), takeFg: r.t >= 0.15 ? AMB : r.t === 0 ? G : MID,
          a7: pct(r['a' + ow]), a7Fg: MID, a30: pct(r[ak]), a30Fg: r[ak] != null && medA != null && r[ak] >= medA ? G : TXT, a30W: 700,
          trend: spark((r.d || []).slice(-w)), trendTip: 'rolling 7d apy, points ending in the last ' + w + ' days', flow: r.flow == null ? '—' : (r.flow >= 0 ? '+' : '−') + fk(Math.abs(r.flow)), sd: r.sdw[w] == null ? '—' : r.sdw[w].toFixed(2), nom: r.nom == null ? '—' : r.nom.toLocaleString('en-US') }, this.rowNav(r.hk, i, name));
      });
      base.rCount = rows.length + ' validators ≥ ' + minLbl + ' τ · median apy ' + winLbl + ' ' + pct(medA);
      base.rMore = rows.length > S.limit; base.rMoreN = rows.length - S.limit;
    }

    if (tab === 'alpha') {
      const qs = q.replace(/^sn\s*/, '');
      const snHits = matchSubnets(subsSorted, S.snQ);
      const list = snHits.filter((s) => !q || String(s.nu) === qs || (s.name || '').toLowerCase().includes(q) || (D.bySn.get(s.nu) || []).some((p) => match(p.val.n, p.val.hk)));
      const cur = list.find((s) => s.nu === S.sn) || list[0] || null;
      base.kpis = [
        { label: 'alpha staked', value: fk(D.av.reduce((a, v) => a + (v.tao || 0), 0)) + ' τ', sub: D.av.length + ' validators ≥ 10 τ', fg: TXT },
        { label: 'median ref apy ' + winLbl, value: pct(median(D.subs.map((s) => s['ref' + w]))), sub: 'best pools of each subnet, paid in alpha', fg: G },
        { label: 'median alpha price ' + winLbl, value: sgn(median(D.subs.map((s) => s['dp' + w]))), sub: 'vs τ, not set by validators', fg: MID },
        { label: 'subnets', value: String(D.subs.length), sub: D.subs.filter((s) => (s['nref' + w] || 0) < 3).length + ' with a thin reference', fg: TXT },
      ];
      base.snList = list.map((s) => { const on = !!cur && s.nu === cur.nu; return { nu: s.nu, name: s.name || 'Subnet ' + s.nu, ref: pct(s['ref' + w], 1), dp: sgn(s['dp' + w]), on, bg: on ? CURBG : 'transparent', snFg: on ? G : MID, mark: on ? '>' : ' ', pick: () => this.setState({ sn: s.nu, cur: 0 }) }; });
      base.snEmpty = !list.length;
      base.snEmptyQ = (S.snQ.trim() || S.q.trim());
      base.snCount = S.snQ.trim() ? list.length + '/' + D.subs.length : String(D.subs.length);
      base.snFilterBorder = S.snQ.trim() ? G : '#2C3A33';
      base.snQKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (list[0]) this.setState({ sn: list[0].nu, cur: 0, snQ: '' }); }
        else if (e.key === 'Escape') { e.preventDefault(); this.setState({ snQ: '' }); }
      };
      if (!cur) { base.noCur = true; base.noCurTxt = D.subs.length ? 'no subnet matches "' + S.q.trim() + '"' : 'no subnet data yet'; }
      else {
        const ref = cur['ref' + w], dp = cur['dp' + w], net = cur['r' + w];
        const yieldPart = ref == null ? null : (Math.pow(1 + ref / 100, w / 365) - 1) * 100;
        base.cur = { nu: cur.nu, name: cur.name || 'Subnet ' + cur.nu, ref: pct(ref, 1), thin: (cur['nref' + w] || 0) < 3 ? '[thin ref]' : '', price: sgn(dp) + ' ' + winLbl, n: String(cur['n' + w] || 0), tao: fk(cur.tao) + ' τ',
          line: 'everyone staking on SN' + cur.nu + (dp == null ? ' has no price change yet' : Math.abs(dp) < 0.05 ? ' saw a flat alpha price over ' + winLbl : (dp >= 0 ? ' gained ' : ' lost ') + Math.abs(dp).toFixed(1) + '% to the alpha price over ' + winLbl) + '; the best pools added ' + sgn(yieldPart) + (net != null ? ' → net ' + sgn(net) + ' in τ' : '') + '. the price part is the same for every validator below.' };
        const inSn = !q || String(cur.nu) === qs || (cur.name || '').toLowerCase().includes(q);
        const ps = (D.bySn.get(cur.nu) || []).filter((p) => p.tao >= 1 && (inSn || match(p.val.n, p.val.hk))).sort((a, b) => (b[ak] ?? -1e9) - (a[ak] ?? -1e9));
        const shown = ps.slice(0, 60);
        this.rows = shown.map((p) => p.val.hk);
        base.pRows = shown.map((p, i) => {
          const e = p[ek], ne = p[ak] != null && p[ak] < 0.01;
          const [b1, b2] = bar(e == null ? 0 : Math.min(e, 100) / 100, 12);
          const tags = [ne ? 'not earning' : '', p['top' + w] ? 'sets reference' : '', p.val.t >= 0.15 ? 'high fee' : ''].filter(Boolean).join(' · ');
          const name = p.val.n || short(p.val.hk);
          return Object.assign({ rank: ne ? '—' : '#' + (i + 1), rankFg: i < 3 && !ne ? G : DIM, name, tags: tags || short(p.val.hk), tagFg: ne ? RED : tags ? AMB : DIM, stake: fk(p.tao) + ' τ',
            a7: pct(p['a' + ow], 1), a7Fg: MID, a30: pct(p[ak], 1), a30Fg: TXT, bar: ne ? '' : b1, barRest: ne ? '' : b2, barFg: ne ? RED : e == null ? DIM : e >= 90 ? G : e >= 70 ? AMB : RED,
            eff: ne ? 'not earning' : e == null ? '—' : e.toFixed(0) + '%', ct: pct(p.ct, 1) }, this.rowNav(p.val.hk, i, name));
        });
        base.pCount = ps.length + ' validators with ≥ 1 τ on SN' + cur.nu + (ps.length > 60 ? ' · showing 60' : '');
      }
    }

    if (tab === 'eff') {
      const ok = effList.filter(earning);
      const at90 = ok.filter((v) => (v[ek] || 0) >= 90).reduce((a, v) => a + v.tao, 0), tot = ok.reduce((a, v) => a + v.tao, 0);
      base.kpis = [
        { label: 'alpha validators', value: String(effList.length), sub: '≥ ' + minLbl + ' τ alpha stake', fg: TXT },
        { label: 'stake at ≥ 90% of best', value: tot > 0 ? Math.round((at90 / tot) * 100) + '%' : '—', sub: 'share of alpha stake, ' + winLbl, fg: G },
        { label: 'median yield vs best', value: pct(median(ok.map((v) => v[ek])), 1), sub: 'stake-weighted per validator, ' + winLbl, fg: G },
        { label: 'not earning', value: String(neList.length), sub: 'earned no alpha in ' + winLbl, fg: neList.length ? RED : TXT },
      ];
      base.es.dots = ok.filter((v) => v[ek] != null).map((v) => {
        const gap = 100 - v[ek], above = gap - v.t * 100 > 5;
        return { x: Math.min(100, (v.t * 100 / 20) * 100), y: Math.max(0, Math.min(100, gap)), fg: above ? AMB : G, size: 8 + Math.round(Math.min(1, Math.sqrt(v.tao / 3e5)) * 14), tip: (v.n || short(v.hk)) + ' · listed ' + pct(v.t * 100, 0) + ' · gap ' + pct(gap, 1) };
      });
      base.es.aria = 'Scatter of ' + base.es.dots.length + ' validators: listed take against gap to the best pools';
      const gaps = ok.filter((v) => v[ek] != null).map((v) => ({ v, d: (100 - v[ek]) - v.t * 100 })).filter((x) => x.d > 5).sort((a, b) => b.d - a.d).slice(0, 8);
      const gmax = Math.max(1, ...gaps.map((g) => g.d));
      base.gaps = gaps.map((g) => ({ name: g.v.n || short(g.v.hk), take: pct(g.v.t * 100, 0), gap: pct(100 - g.v[ek], 1), pp: '+' + g.d.toFixed(1) + ' pp', bar: '█'.repeat(Math.max(1, Math.round((g.d / gmax) * 12))) }));
      base.noGaps = !gaps.length;
      base.neNote = neList.length > 0;
      base.neTxt = neList.length + ' validator' + (neList.length === 1 ? '' : 's') + ' in this filter earned no alpha over ' + winLbl + ' (not registered or no dividends). they are listed last and left out of the charts.';
      const cols = [[null, '#', 'start'], [null, 'validator', 'start'], ['tao', 'alpha τ', 'end'], [null, 'subnets', 'end'], ['take', 'listed', 'end'], ['cfg', 'total fee', 'end'], ['eff', 'yield vs best ' + winLbl, 'start'], ['gap', 'gap ' + winLbl, 'end'], [null, 'price ' + winLbl, 'end']];
      const key = S.sortE || 'tao';
      base.eCols = this.head(cols, key, S.dirE, (k, dir) => this.setState({ sortE: k, dirE: dir, cur: 0 }));
      const val = { tao: (v) => v.tao, take: (v) => v.t, cfg: (v) => v.cfg, eff: (v) => (earning(v) ? v[ek] : null), gap: (v) => (earning(v) && v[ek] != null ? 100 - v[ek] : null) }[key];
      const rows = effList.filter((v) => match(v.n, v.hk)).sort((a, b) => { if (earning(a) !== earning(b)) return earning(a) ? -1 : 1; const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x - y) * S.dirE; });
      const effRank = new Map(ok.filter((v) => v[ek] != null).sort((a, b) => b[ek] - a[ek]).map((v, i) => [v.hk, i + 1]));
      const shown = rows.slice(0, S.limit);
      this.rows = shown.map((v) => v.hk);
      base.eRows = shown.map((v, i) => {
        const ne = !earning(v), e = ne ? null : v[ek], [b1, b2] = bar(e == null ? 0 : Math.min(e, 100) / 100, 12);
        const r = v['r' + w], a = v[ak];
        const price = r != null && a != null ? ((1 + r / 100) / Math.pow(1 + a / 100, w / 365) - 1) * 100 : null;
        const nePart = v['ne' + w] || 0;
        const tags = [ne ? 'not earning' : '', !ne && nePart > 0 ? nePart.toFixed(0) + '% not earning' : '', (v['self' + w] || 0) >= 50 ? 'sets reference' : '', D.rootByHk.has(v.hk) ? 'also on root' : ''].filter(Boolean).join(' · ');
        const rk = effRank.get(v.hk), name = v.n || short(v.hk);
        return Object.assign({ rank: rk || '—', rankFg: rk && rk <= 3 ? G : DIM, name, tags: tags || short(v.hk), tagFg: ne ? RED : /not earning|sets/.test(tags) ? AMB : DIM, tao: fk(v.tao) + ' τ', ns: String(v.ns == null ? '—' : v.ns),
          take: pct(v.t * 100, 0), takeFg: v.t >= 0.15 ? AMB : MID, cfg: pct(v.cfg, 1), cfgFg: v.cfg != null && v.cfg - v.t * 100 > 1 ? AMB : MID,
          bar: ne ? 'not earning' : b1, barRest: ne ? '' : b2, barFg: ne ? RED : e == null ? DIM : e >= 90 ? G : e >= 70 ? AMB : RED, eff: ne ? '' : e == null ? '—' : e.toFixed(1) + '%',
          gap: e == null ? '—' : pct(100 - e, 1), gapFg: e == null ? DIM : 100 - e - v.t * 100 > 5 ? AMB : MID, px: sgn(price) }, this.rowNav(v.hk, i, name));
      });
      base.eCount = rows.length + ' validators ≥ ' + minLbl + ' τ · ' + ok.length + ' earning';
      base.eMore = rows.length > S.limit; base.eMoreN = rows.length - S.limit;
    }
    return base;
  }
}
DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {});
