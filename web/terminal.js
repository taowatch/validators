// Generated from design/Terminal.dc.html by tools/dc2web.py — edit the design, then rerun.
const DATA_URL = '/api/choose';
const VALIDATOR_URL = '/api/validator/';
const G = { A: '#4BE38A', B: '#A6E3B8', C: '#D8D7A0', D: '#F2B544', F: '#FF6B5E' };
const GTIP = { A: 'A: at least 95% of the best payout here', B: 'B: 85–95% of the best', C: 'C: 70–85% of the best', D: 'D: under 70% of the best', F: 'F: earned nothing over 30 days' };
const OKT = { tag: '  OK', fg: '#4BE38A' }, WARNT = { tag: 'WARN', fg: '#F2B544' }, FAILT = { tag: 'FAIL', fg: '#FF6B5E' }, INFOT = { tag: 'INFO', fg: '#A9B6AD' };
const PRICE_WS = 'wss://data-stream.binance.vision/ws/taousdt@ticker';
const PRICE_SNAPSHOT = { c: 185.10, P: 3.989, h: 186.10, l: 169.10, q: 16169472.5, E: 1795663101480 };
const HASH_RE = /^#v\/([1-9A-HJ-NP-Za-km-z]{40,60})(?:\/(\d+))?$/;
const STAKE_US = '5FFSBkNiymQWHaxc8dTmfTT7iHoz6YDexVG4xR2yLrffVR86';
const UI_KEY = 'vy.ui';
const SPARK = '▁▂▃▄▅▆▇█';
const BARW = 12, BARW_S = 10, CBARW = 30, PAGE = 40, TABS = 10;
// Rows "with warnings" (hidden by "hide warnings"); the default UI uses the same list.
const WARN = ['Not earning', 'Unstable', 'High fee', 'Thin benchmark'];
const hasWarn = (b) => (b || []).some((x) => WARN.includes(x));
const PX_EVERY = 2000;
// single-key shortcuts can be switched off (WCAG 2.1.4), remembered per viewer
const keysStored = () => { try { return localStorage.getItem('vy.keys') !== 'off'; } catch (e) { return true; } };
const SORTS = [['grade', 'grade'], ['earn', 'you earn 30d'], ['payout', 'payout vs best'], ['fee', 'fee'], ['stake', 'stake']];
const SORT_KEY = { grade: (r) => r.g ? 'ABCDF'.indexOf(r.g) : null, earn: (r) => r.g === 'F' ? 0 : r.a30, payout: (r) => r.g === 'F' ? 0 : r.pr, fee: (r) => r.fee, stake: (r) => r.stake };
const fmtInt = (n) => n == null ? '—' : Math.round(n).toLocaleString('en-US');
const fmtK = (n) => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
const pct = (n, d) => n == null ? '—' : n.toFixed(d == null ? 1 : d) + '%';
const sgn = (n, d) => { if (n == null) return '—'; const t = Math.abs(n).toFixed(d == null ? 1 : d); return (+t === 0 ? '' : n > 0 ? '+' : '−') + t + '%'; };
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
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
const short = (hk) => hk ? hk.slice(0, 6) + '…' + hk.slice(-4) : '';
const barFgOf = (pr) => pr == null ? '#8A978E' : pr >= 95 ? '#4BE38A' : pr >= 85 ? '#A6E3B8' : pr >= 70 ? '#D8D7A0' : pr > 0 ? '#F2B544' : '#FF6B5E';
const spark = (xs) => {
  const v = (xs || []).filter((x) => x != null);
  if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const step = Math.max(1, Math.floor(v.length / 12));
  let out = '';
  for (let i = v.length % step; i < v.length; i += step) out += SPARK[Math.min(7, Math.floor((v[i] - lo) / span * 7.999))];
  return out.slice(-12);
};
const tagOf = (b) => (b || []).map((x) => x === 'High fee' ? '!fee' : x === 'Not earning' ? '!not-earning' : x === 'Unstable' ? '~unstable' : x === 'Thin benchmark' ? '~thin' : x === 'New' ? '?new' : x === 'Small' ? '?small' : x.toLowerCase()).join(' ');
function usd(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function modified(e) { return !!(e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)); }
// Remember the chosen interface and go to its page, keeping the current view (the hash).
function switchUI(to, e) {
  if (modified(e)) return;
  if (e) e.preventDefault();
  try { localStorage.setItem(UI_KEY, to); } catch (err) { /* storage blocked: the link still works */ }
  window.location.href = (to === 'terminal' ? '/terminal' : '/') + (window.location.hash || '');
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      data: null, err: null, mode: 'root', sn: null, grades: [], hideWarn: false, q: '', sort: null, dir: -1, cur: 0, limit: PAGE, allSn: false, snQ: '',
      cmd: '', feedback: 'type help for commands · keys: j/k move, enter open, / command, s sort, g grade, t default UI', fbOk: true, amt: '1,000',
      view: 'list', hk: null, wantNu: null, det: null, detErr: null, loc: null, amtD: '1,000', copied: null,
      px: null, pxLive: false, pxDir: 0, keys: keysStored(),
    };
    this.rows = [];
  }

  componentDidMount() {
    this.connectPrice();
    if (typeof window !== 'undefined' && !this.winBound) {
      this.winBound = true;
      window.addEventListener('pageshow', (e) => this.onPageShow(e));
      window.addEventListener('popstate', () => this.route());
      document.addEventListener('keydown', (e) => this.onKey(e));
      this.route();
    }
    fetch(DATA_URL)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => this.setState({ data: d }))
      .catch((e) => this.setState({ err: 'could not load data (' + String((e && e.message) || e) + ')' }));
  }
  componentWillUnmount() {
    this.dead = true;
    clearTimeout(this.wsTimer);
    clearTimeout(this.pxTimer);
    this.pxTimer = null;
    if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) { /* ignore */ } }
  }

  // ---- live TAO price (same feed as the default UI) ----
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
      this.pxNext = { c, P: parseFloat(m.P), h: parseFloat(m.h), l: parseFloat(m.l), q: parseFloat(m.q), E: m.E };
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
      price: '$' + p.c.toFixed(2), chg: sgn(p.P, 2) + ' 24h', chgColor: p.P >= 0 ? '#4BE38A' : '#F2B544',
      flash: !live || S.pxDir === 0 ? '#E8F2EA' : S.pxDir > 0 ? '#4BE38A' : '#F2B544',
      dot: live ? '#4BE38A' : '#5B675F', status: live ? 'live' : S.px ? 'reconnecting' : 'snapshot',
      title: 'Binance TAO/USDT · 24h high $' + p.h.toFixed(2) + ' · low $' + p.l.toFixed(2) + ' · vol ' + usd(p.q),
    };
  }

  // ---- navigation: "/terminal" = list, "#v/<hotkey>[/<netuid>]" = validator page ----
  route() {
    let m = null;
    try { m = HASH_RE.exec(window.location.hash); } catch (e) { /* ignore */ }
    if (m) this.show(m[1], m[2] != null ? +m[2] : null);
    else if (this.state.view === 'detail') this.toList();
  }
  show(hk, nu) {
    if (this.state.view !== 'detail' && typeof window !== 'undefined') this.listY = window.scrollY || 0;
    const same = this.state.hk === hk && this.state.det;
    this.setState({ view: 'detail', hk, wantNu: nu, loc: null, copied: null, det: same ? this.state.det : null, detErr: null });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
    if (same) return;
    fetch(VALIDATOR_URL + encodeURIComponent(hk))
      .then((r) => { if (r.status === 404) throw new Error('unknown'); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => { if (this.state.hk === hk) this.setState({ det: d }); })
      .catch((e) => {
        if (this.state.hk !== hk) return;
        const msg = String((e && e.message) || e);
        this.setState({ detErr: msg === 'unknown' ? 'no data for this hotkey: not a validator we track (root stake, or alpha pools of 10 τ or more).' : 'could not load this validator (' + msg + ').' });
      });
  }
  open(hk, nu, e) {
    if (modified(e)) return;
    if (e) e.preventDefault();
    const h = '#v/' + hk + (nu != null ? '/' + nu : '');
    try { if (window.location.hash !== h) window.history.pushState({ vr: 1 }, '', h); } catch (err) { /* no history API */ }
    this.show(hk, nu);
  }
  toList() {
    const y = this.listY || 0;
    this.setState({ view: 'list' });
    const toCmd = this.pendingCmdFocus;
    this.pendingCmdFocus = false;
    if (typeof window !== 'undefined' && window.requestAnimationFrame) window.requestAnimationFrame(() => { window.scrollTo(0, y); if (toCmd) this.focusCmd(); else this.focusRow(this.state.cur, false); });
  }
  back(e) {
    if (modified(e)) return;
    if (e) e.preventDefault();
    try {
      if (window.history.state && window.history.state.vr) { window.history.back(); return; }
      if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (err) { /* no history API */ }
    this.toList();
  }
  home(e) {
    if (modified(e)) return;
    if (e) e.preventDefault();
    try { if (window.location.hash) window.history.pushState(null, '', window.location.pathname + window.location.search); } catch (err) { /* ignore */ }
    this.listY = 0;
    this.setState({ view: 'list', mode: 'root', sn: null, q: '', grades: [], hideWarn: false, sort: null, dir: -1, cur: 0, limit: PAGE });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  }
  pickLoc(i) {
    const V = this.state.det, l = V && V.locs[i];
    if (!l) return;
    this.setState({ loc: i, copied: null });
    const h = '#v/' + V.hk + (l.nu != null ? '/' + l.nu : '');
    try { if (window.location.hash !== h) window.history.replaceState(window.history.state, '', h); } catch (e) { /* ignore */ }
  }
  curLoc() {
    const S = this.state, V = S.det;
    if (!V || !V.locs || !V.locs.length) return 0;
    let li = S.loc;
    if (li == null) { li = S.wantNu != null ? V.locs.findIndex((l) => l.nu === S.wantNu) : 0; if (li < 0) li = 0; }
    return Math.min(li, V.locs.length - 1);
  }
  copyHk(hk) {
    const done = (ok) => { this.setState({ copied: ok ? 'ok' : 'fail' }); clearTimeout(this.copyTimer); this.copyTimer = setTimeout(() => this.setState({ copied: null }), 1800); };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
      navigator.clipboard.writeText(hk).then(() => done(true), () => done(false));
    } catch (e) { done(false); }
  }

  // ---- keyboard: one handler, idle while typing or with modifier keys ----
  onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || (t && t.isContentEditable)) return;
    const k = e.key, S = this.state;
    if (!S.keys) return;
    if (k === 't') { e.preventDefault(); switchUI('default'); return; }
    if (S.view === 'detail') {
      const V = S.det, n = V && V.locs ? V.locs.length : 0, li = this.curLoc();
      if (k === 'Escape') { e.preventDefault(); this.back(); }
      else if ((k === 'h' || k === 'l') && n) { e.preventDefault(); this.pickLoc((li + (k === 'l' ? 1 : -1) + n) % n); }
      else if (k === 'c' && V) { e.preventDefault(); this.copyHk(V.hk); }
      // back() may finish later through popstate → toList(); it focuses the command line then
      else if (k === '/') { e.preventDefault(); this.pendingCmdFocus = true; this.back(); }
      return;
    }
    if (!S.data) return;
    if (k === 'j' || k === 'k') { e.preventDefault(); this.move(k === 'j' ? 1 : -1); }
    else if (k === 'Enter') { if (tag === 'a' || tag === 'button') return; e.preventDefault(); this.openCur(); }
    else if (k === '/') { e.preventDefault(); this.focusCmd(); }
    else if (k === 's') { e.preventDefault(); this.cycleSort(); }
    else if (k === 'g') { e.preventDefault(); this.cycleGrade(); }
    else if (k === 'Escape') { e.preventDefault(); this.clearAll(); }
  }
  move(d) {
    const n = this.rows.length;
    if (!n) return;
    const i = Math.max(0, Math.min(n - 1, Math.min(this.state.cur, n - 1) + d));
    this.setState({ cur: i });
    this.focusRow(i, true);
  }
  // Focus the row's link (table on wide screens, card on phones) so screen readers follow the cursor.
  focusRow(i, scroll) {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      let el = document.getElementById('tm-r-' + i);
      if (!el || el.offsetParent === null) el = document.getElementById('tm-c-' + i);
      if (!el || el.offsetParent === null) return;
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      if (scroll) el.scrollIntoView({ block: 'nearest' });
    }));
  }
  focusCmd() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => { const el = document.getElementById('tm-cmd'); if (el) { el.focus(); el.select && el.select(); } }));
  }
  openCur() {
    const r = this.rows[Math.min(this.state.cur, this.rows.length - 1)];
    if (r) this.open(r.hk, r.nu);
  }
  cycleSort() {
    const S = this.state, i = SORTS.findIndex((s) => s[0] === S.sort), n = i + 1 >= SORTS.length ? null : SORTS[i + 1];
    this.setState({ sort: n ? n[0] : null, dir: -1, cur: 0, feedback: 'ok: ' + (n ? 'sort ' + n[1] : 'default order'), fbOk: true });
  }
  cycleGrade() {
    const order = [[], ['A'], ['A', 'B'], ['C', 'D'], ['F']], S = this.state;
    const i = order.findIndex((g) => g.join() === S.grades.join()), next = order[(i + 1) % order.length];
    this.setState({ grades: next, cur: 0, feedback: 'ok: ' + (next.length ? 'grade ' + next.join(',') : 'all grades'), fbOk: true });
  }
  clearAll() {
    this.setState({ grades: [], hideWarn: false, q: '', sort: null, dir: -1, cur: 0, limit: PAGE, cmd: '', feedback: 'ok: filters cleared', fbOk: true });
  }

  toggleKeys() {
    const on = !this.state.keys;
    try { localStorage.setItem('vy.keys', on ? 'on' : 'off'); } catch (e) { /* not remembered */ }
    this.setState({ keys: on, feedback: 'ok: single-key shortcuts ' + (on ? 'on' : 'off'), fbOk: true });
  }

  // ---- command line ----
  run() {
    const raw = this.state.cmd.trim(), t = raw.toLowerCase().split(/\s+/).filter(Boolean);
    const D = this.state.data;
    const ok = (m, patch) => this.setState(Object.assign({ feedback: 'ok: ' + m, fbOk: true, cmd: '', cur: 0, limit: PAGE }, patch || {}));
    const bad = (m) => this.setState({ feedback: 'error: ' + m, fbOk: false });
    if (!t.length) return;
    const c = t[0];
    if (c === 'help' || c === '?') return this.setState({ feedback: 'root · sn <netuid|name> · grade a b … | grade (all) · sort grade|earn|payout|fee|stake [asc] · v <name> · warn on|off · keys on|off · clear · anything else searches', fbOk: true, cmd: '' });
    if (c === 'root') return ok('root validators', { mode: 'root' });
    if (c === 'sn' || c === 'subnet') {
      const arg = t.slice(1).join(' ');
      if (!arg) return bad('sn <netuid or name>, e.g. sn 51 or sn lium');
      if (!D) return bad('no data yet');
      if (/^(sn)?\d+$/.test(arg.replace(/\s+/g, ''))) {
        const n = Number(arg.replace(/\s+/g, '').replace(/^sn/, ''));
        if (!D.subnets.some((s) => s.nu === n)) return bad('no subnet ' + n + ' in the data');
        return ok('subnet ' + n, { mode: 'alpha', sn: n, grades: [] });
      }
      const hits = matchSubnets(D.subnets, arg);
      if (!hits.length) return bad('no subnet name matches "' + arg + '"');
      const exact = hits.filter((s) => (s.name || '').toLowerCase() === arg);
      const pick = hits.length === 1 ? hits[0] : exact.length === 1 ? exact[0] : null;
      if (pick) return ok('subnet ' + pick.nu + ' · ' + pick.name, { mode: 'alpha', sn: pick.nu, grades: [] });
      return bad(hits.length + ' subnets match: ' + hits.slice(0, 8).map((s) => 'sn' + s.nu + ' ' + s.name).join(' · ') + (hits.length > 8 ? ' …' : '') + ' — use the number');
    }
    if (c === 'grade' || c === 'g') {
      const raw = t.slice(1).join('').replace(/,/g, '').toUpperCase();
      if (/[^ABCDF]/.test(raw)) return bad('grades are A, B, C, D, F (e.g. grade a b)');
      const gs = raw.split('');
      return ok(gs.length ? 'grade ' + gs.join(',') : 'all grades', { grades: Array.from(new Set(gs)).sort() });
    }
    if (c === 'sort' || c === 's') {
      const k = { grade: 'grade', earn: 'earn', apy: 'earn', payout: 'payout', pay: 'payout', fee: 'fee', stake: 'stake' }[t[1]];
      if (!k) return bad('sort by grade, earn, payout, fee or stake');
      const dir = t[2] === 'asc' ? 1 : -1;
      return ok('sort ' + k + (dir > 0 ? ' (worst first)' : ' (best first)'), { sort: k, dir });
    }
    if (c === 'v' || c === 'find' || c === 'open') {
      const q = raw.split(/\s+/).slice(1).join(' ');
      if (!q) return bad('v <name or hotkey>');
      const hits = this.matches(q);
      if (hits.length === 1) { this.setState({ cmd: '', feedback: 'ok: open ' + hits[0].name, fbOk: true, q: '' }); this.open(hits[0].hk, hits[0].nu); return; }
      return ok(hits.length + ' match' + (hits.length === 1 ? '' : 'es') + ' for "' + q + '"', { q });
    }
    if (c === 'keys') return t[1] === 'on' || t[1] === 'off' ? (this.state.keys !== (t[1] === 'on') ? this.toggleKeys() : ok('keys ' + t[1])) : bad('keys on|off');
    if (c === 'warn') {
      if (t[1] !== 'on' && t[1] !== 'off') return bad('warn on|off');
      return ok(t[1] === 'off' ? 'hiding warnings' : 'showing warnings', { hideWarn: t[1] === 'off' });
    }
    if (c === 'clear' || c === 'reset') return ok('filters cleared', { grades: [], hideWarn: false, q: '', sort: null, dir: -1 });
    return ok('search "' + raw + '"', { q: raw });
  }
  matches(q) {
    const D = this.state.data;
    if (!D) return [];
    const s = q.toLowerCase();
    return this.listOf(D, this.alpha(), this.snOf(D)).filter((r) => (r.name || '').toLowerCase().includes(s) || (r.hk || '').toLowerCase() === s);
  }

  // ---- data ----
  alpha() { return this.state.mode === 'alpha'; }
  snOf(D) { const S = this.state; return S.sn != null ? S.sn : (D.subnets.find((s) => s.nu === 51) || D.subnets[0] || {}).nu; }
  listOf(D, alpha, sn) {
    if (!alpha) return D.root.rows.map((r) => ({ name: r.n || short(r.hk), hk: r.hk, g: r.g, a30: r.a30, a7: r.a7, pr: r.pr, fee: r.t * 100, ck: 0, stake: r.s, b: r.b || [], d: r.d, nu: null }));
    const C = D.pcols, ix = (k) => C.indexOf(k);
    return (D.pools[String(sn)] || []).map((p) => ({ name: p[ix('n')], hk: p[ix('hk')], g: p[ix('g')], a30: p[ix('a30')], a7: p[ix('a7')], pr: p[ix('pr')], fee: p[ix('fee')], ck: p[ix('ck')], stake: p[ix('tao')], b: p[ix('b')] || [], nu: sn }));
  }

  renderVals() {
    const S = this.state, D = S.data;
    const ageMin = D && D.ts ? Math.max(0, Math.round((Date.now() - D.ts) / 60000)) : null;
    const base = {
      tk: this.ticker(), home: (e) => this.home(e), back: (e) => this.back(e), stakeUs: (e) => this.open(STAKE_US, null, e),
      toDefault: (e) => switchUI('default', e), skel: [1, 2, 3, 4, 5, 6, 7, 8],
      chooseCur: S.view === 'list' ? 'page' : null, chooseBorder: S.view === 'list' ? '#2C3A33' : 'transparent',
      blockTxt: D && D.block ? '#' + fmtInt(D.block) : '…',
      age: ageMin == null ? '…' : ageMin < 120 ? ageMin + 'm' : ageMin < 2880 ? Math.round(ageMin / 60) + 'h' : Math.round(ageMin / 1440) + 'd',
      modeTxt: S.view === 'detail' ? 'validator' : this.alpha() ? 'subnet ' + (D ? this.snOf(D) : '') : 'root',
      keysHint: !S.keys ? 'single-key shortcuts off' : S.view === 'detail' ? 'h/l prev/next place · c copy · esc back · t default UI' : 'j/k move · enter open · / command · s sort · g grade · esc clear · t default UI',
      keysLabel: S.keys ? 'keys: on' : 'keys: off', keysOn: S.keys, toggleKeys: () => this.toggleKeys(),
      loading: false, failed: false, err: '', isList: false, isDetail: false, d: {},
    };
    if (S.view === 'detail') return Object.assign(base, { isDetail: true, d: this.detail(D) });
    if (!D) return Object.assign(base, S.err ? { failed: true, err: S.err } : { loading: true });
    return Object.assign(base, { isList: true }, this.list(D));
  }

  list(D) {
    const S = this.state, alpha = this.alpha(), sn = this.snOf(D);
    const cur = D.subnets.find((s) => s.nu === sn) || null;
    const set = (p) => () => this.setState(p);
    const list = this.listOf(D, alpha, sn);
    const q = S.q.trim().toLowerCase();
    // grade counts follow the search and "hide warnings" (same rule as the default UI)
    const base = list.filter((r) => (!S.hideWarn || !hasWarn(r.b)) && (!q || (r.name || '').toLowerCase().includes(q) || (r.hk || '').toLowerCase().includes(q)));
    const counts = {}; base.forEach((r) => { if (r.g) counts[r.g] = (counts[r.g] || 0) + 1; });
    let rows = base.filter((r) => !S.grades.length || S.grades.includes(r.g));
    if (S.sort) {
      const key = SORT_KEY[S.sort];
      const better = S.sort === 'grade' || S.sort === 'fee' ? 1 : -1; // best first on the first click
      const dir = S.dir < 0 ? better : -better;
      rows = rows.map((r, i) => [r, i]).sort((a, b) => { const x = key(a[0]), y = key(b[0]); if (x == null && y == null) return a[1] - b[1]; if (x == null) return 1; if (y == null) return -1; return (x - y) * dir || a[1] - b[1]; }).map((x) => x[0]);
    }
    const total = rows.length, shown = rows.slice(0, S.limit), curI = Math.min(S.cur, Math.max(0, shown.length - 1));
    this.rows = shown;
    const sel = shown[curI] || null;

    const cols = [['grade', 'grade', 'start'], [null, 'validator', 'start'], ['earn', 'you earn 30d', 'end'], ['payout', 'payout vs best', 'start'], ['fee', 'fee', 'end'], ['stake', 'stake τ', 'end'], [null, alpha ? '7d vs 30d' : 'trend 30d', 'start']].map(([k, label, justify]) => {
      const on = !!k && S.sort === k;
      return {
        label, justify, sortable: !!k, plain: !k, on, fg: on ? '#4BE38A' : '#8A978E', uline: on ? '#4BE38A' : 'transparent', arrow: on ? (S.dir < 0 ? '▼' : '▲') : (k ? '↕' : ''),
        ariaSort: on ? ((S.dir < 0) === (k === 'grade' || k === 'fee') ? 'ascending' : 'descending') : 'none',
        aria: 'Sort by ' + label + (on ? (S.dir < 0 ? ', best first' : ', worst first') : ''),
        sort: k ? () => this.setState({ sort: k, dir: on ? -S.dir : -1, cur: 0 }) : null,
      };
    });
    const rowVals = shown.map((r, i) => {
      const F = r.g === 'F', pr = F ? 0 : r.pr;
      const filled = pr == null ? 0 : Math.round(Math.min(pr, 100) / 100 * BARW), filledS = pr == null ? 0 : Math.round(Math.min(pr, 100) / 100 * BARW_S);
      const tr = alpha ? (r.a7 == null || r.a30 == null ? '' : (r.a7 >= r.a30 ? '▲ ' : '▼ ') + pct(r.a7, 1)) : spark(r.d);
      const href = '#v/' + r.hk + (r.nu != null ? '/' + r.nu : '');
      return {
        id: 'tm-r-' + i, cid: 'tm-c-' + i, href, open: (e) => { this.setState({ cur: i }); this.open(r.hk, r.nu, e); }, focus: () => { if (this.state.cur !== i) this.setState({ cur: i }); },
        current: i === curI ? 'true' : null, cursor: i === curI ? '>' : '', bg: i === curI ? '#0E1F15' : 'transparent',
        grade: r.g || '-', gFg: r.g ? G[r.g] : '#8A978E', gTip: r.g ? GTIP[r.g] : 'not graded yet',
        name: r.name, tags: tagOf(r.b) || (r.ck > 0.05 ? 'childkey ' + pct(r.ck, 1) : ''), tagFg: hasWarn(r.b) ? '#F2B544' : '#8A978E',
        earn: F ? '0.0%' : pct(r.a30, alpha ? 1 : 2), earnFg: F ? '#FF6B5E' : '#E8F2EA',
        bar: '█'.repeat(filled), barRest: '░'.repeat(BARW - filled), barS: '█'.repeat(filledS), barRestS: '░'.repeat(BARW_S - filledS),
        barFg: barFgOf(pr), pr: pr == null ? '  —' : Math.round(pr) + '%',
        fee: pct(r.fee, 1), feeFg: r.fee >= 15 ? '#F2B544' : '#D4DDD6', stake: fmtK(r.stake),
        trend: tr || '·', trendTip: alpha ? '7-day APY vs 30-day' : 'rolling 7-day APY, last 30 days', trendAria: alpha ? '7-day APY ' + pct(r.a7, 1) : 'trend',
        aria: r.name + ', grade ' + (r.g || 'not graded') + ', earns ' + (F ? '0%' : pct(r.a30, 1)) + ', payout ' + (pr == null ? 'unknown' : Math.round(pr) + '% of best') + ', fee ' + pct(r.fee, 1),
      };
    });
    const gradeChips = ['A', 'B', 'C', 'D', 'F'].map((k) => {
      const on = S.grades.includes(k);
      return { label: '[' + k + '] ' + (counts[k] || 0), aria: 'Grade ' + k + ', ' + (counts[k] || 0) + ' validators', on, border: on ? G[k] : '#2C3A33', bg: on ? '#0E1F15' : 'transparent', fg: on ? G[k] : '#A9B6AD',
        pick: () => this.setState({ grades: on ? S.grades.filter((x) => x !== k) : S.grades.concat(k).sort(), cur: 0 }) };
    });
    const snHits = matchSubnets(D.subnets, S.snQ);
    const snAll = snHits.map((s) => {
      const on = alpha && s.nu === sn;
      return { nu: s.nu, name: s.name, best: pct(s.best, 1), dp: sgn(s.dp30, 1), on, mark: on ? '>' : ' ', snFg: on ? '#4BE38A' : '#A9B6AD', bg: on ? '#0E1F15' : 'transparent',
        pick: () => this.setState({ mode: 'alpha', sn: s.nu, cur: 0, limit: PAGE, grades: [] }) };
    });
    const flags = [alpha ? '--subnet ' + sn : '--root'];
    if (S.grades.length) flags.push('--grade ' + S.grades.join(','));
    if (S.hideWarn) flags.push('--hide-warnings');
    if (S.sort) flags.push('--sort ' + S.sort + (S.dir < 0 ? '' : ':asc'));
    if (q) flags.push('--find "' + S.q.trim() + '"');

    const amt = parseFloat(String(S.amt).replace(/,/g, '')) || 0, unit = alpha ? ' α' : ' τ';
    const bestApy = alpha ? (cur && cur.best) : D.root.bench;
    const yr = !sel ? null : sel.g === 'F' ? 0 : sel.a30 == null ? null : amt * sel.a30 / 100;
    const gap = sel && bestApy != null && sel.a30 != null ? amt * (bestApy - sel.a30) / 100 : null;

    return {
      cmd: S.cmd, onCmd: (e) => this.setState({ cmd: e.target.value }),
      onCmdKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); this.run(); } else if (e.key === 'Escape') { e.preventDefault(); this.setState({ cmd: '' }); e.target.blur(); } },
      runCmd: () => this.run(), feedback: S.feedback, fbColor: S.fbOk ? '#8A978E' : '#FF6B5E',
      prompt: 'validators ' + flags.join(' '), benchTxt: D.root.bench == null ? 'no grade yet' : '~' + D.root.bench.toFixed(2) + '%', benchMed: D.root.bench == null ? '—' : D.root.bench.toFixed(2) + '%',
      rootOn: !alpha, alphaOn: alpha,
      rootBorder: !alpha ? '#4BE38A' : '#2C3A33', rootBg: !alpha ? '#0E1F15' : 'transparent', rootFg: !alpha ? '#4BE38A' : '#D4DDD6',
      alphaBorder: alpha ? '#4BE38A' : '#2C3A33', alphaBg: alpha ? '#0E1F15' : 'transparent', alphaFg: alpha ? '#4BE38A' : '#D4DDD6',
      pickRoot: set({ mode: 'root', cur: 0, limit: PAGE, grades: [] }), pickAlpha: set({ mode: 'alpha', cur: 0, limit: PAGE, grades: [] }),
      snQ: S.snQ, snQTrim: S.snQ.trim(), snNone: snAll.length === 0,
      snCount: S.snQ.trim() ? snAll.length + '/' + D.subnets.length : D.subnets.length + '',
      snFilterBorder: S.snQ.trim() ? '#4BE38A' : '#2C3A33',
      onSnQ: (e) => this.setState({ snQ: e.target.value }),
      // Enter opens the first match, Escape clears the filter
      snQKey: (e) => {
        if (e.key === 'Enter') { e.preventDefault(); const h = snHits[0]; if (h) this.setState({ mode: 'alpha', sn: h.nu, cur: 0, limit: PAGE, grades: [], snQ: '' }); }
        else if (e.key === 'Escape') { e.preventDefault(); this.setState({ snQ: '' }); }
      },
      snList: S.allSn || S.snQ.trim() ? snAll : snAll.slice(0, 40), snMore: !S.allSn && !S.snQ.trim() && snAll.length > 40, snTotal: snAll.length, showAllSn: set({ allSn: true }),
      sumChip: alpha ? 'SN' + sn : 'ROOT', sumName: alpha ? (cur ? cur.name : '') : 'root stake',
      sumBest: alpha ? pct(cur && cur.best, 1) + ' α' : pct(D.root.bench, 2) + ' τ',
      sumPxLabel: alpha ? 'PRICE 30D' : 'PRINCIPAL', sumPx: alpha ? sgn(cur && cur.dp30, 1) : 'stays τ',
      sumNetLabel: alpha ? 'NET τ 30D (BEST)' : 'GRADED', sumNet: alpha ? sgn(cur && cur.net30, 1) : String(D.root.rows.filter((r) => r.g).length),
      sumN: String(list.length),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value, cur: 0 }),
      hideWarn: S.hideWarn, toggleWarn: () => this.setState({ hideWarn: !S.hideWarn, cur: 0 }),
      warnLabel: S.hideWarn ? '[x] hide warnings' : '[ ] hide warnings', warnBorder: S.hideWarn ? '#F2B544' : '#2C3A33', warnFg: S.hideWarn ? '#F2B544' : '#A9B6AD',
      sortVal: S.sort ? S.sort + (S.dir < 0 ? '' : ':asc') : '',
      sortOpts: [{ v: '', label: 'default' }].concat(...SORTS.map(([k, l]) => [{ v: k, label: l + ' ▼' }, { v: k + ':asc', label: l + ' ▲' }])),
      pickSort: (e) => { const [k, a] = String(e.target.value).split(':'); this.setState({ sort: k || null, dir: a ? 1 : -1, cur: 0 }); },
      gradeChips, cols, rows: rowVals, empty: total === 0, clearAll: () => this.clearAll(),
      countTxt: total ? shown.length + ' of ' + total + ' rows' + (S.sort ? ' · sorted by ' + S.sort + (S.dir < 0 ? ' (best first)' : ' (worst first)') : ' · default order') : '0 rows',
      more: total > shown.length, moreN: total - shown.length, showMore: () => this.setState({ limit: S.limit + PAGE }),
      down: () => this.move(1), up: () => this.move(-1), openCur: () => this.openCur(), focusCmd: () => this.focusCmd(),
      cycleSort: () => this.cycleSort(), cycleGrade: () => this.cycleGrade(),
      amt: S.amt, onAmt: (e) => this.setState({ amt: e.target.value }),
      calcWho: sel ? sel.name : '—', calcYear: yr == null ? (sel ? '— no 30d yield yet' : '—') : fmtInt(yr) + unit + '/yr',
      calcVs: gap == null ? 'pick a row (j/k)' : gap > 0.5 ? 'best here pays +' + fmtInt(gap) + unit + '/yr' : 'on par with the best here',
    };
  }

  detail(D) {
    const S = this.state, V = S.det;
    if (S.detErr) return { failed: true, err: S.detErr };
    if (!V) return { loading: true };
    const locs = V.locs || [];
    if (!locs.length) return { failed: true, err: 'no graded stake for this validator yet.' };
    const li = this.curLoc(), L = locs[li], isRoot = L.kind === 'root';
    const rootBench = D ? D.root.bench : null, best = isRoot ? rootBench : L.bench;
    const where = isRoot ? 'root' : L.label + (L.sname ? ' ' + L.sname : '');
    const name = V.n || short(V.hk);

    const verdict = [];
    if (L.g === 'F') verdict.push(Object.assign({ text: 'earned nothing for stakers on ' + where + ' over the last 30 days. stake elsewhere.' }, FAILT));
    else if (L.pr != null) { const p = Math.round(L.pr); verdict.push(Object.assign({ text: 'pays ' + p + '% of what the best validators on ' + where + ' pay (after fees, weaker of 7D and 30D).' }, p >= 95 ? OKT : p >= 85 ? INFOT : WARNT)); }
    else verdict.push(Object.assign({ text: 'not enough comparable data to grade on ' + where + ' yet.' }, INFOT));
    const feeLine = 'fee ' + pct(L.fee, 1) + (L.ck > 0.05 ? ' (take ' + pct(L.take, 0) + ' + childkey ' + pct(L.ck, 1) + ')' : ' (validator take only)');
    verdict.push(Object.assign({ text: L.fee >= 15 ? 'high fee: ' + feeLine + '. most of the gap to the best comes from this.' : feeLine + '.' }, L.fee >= 15 ? WARNT : OKT));
    if (isRoot) { if (L.hit != null) verdict.push(Object.assign({ text: 'paid at least 90% of the best on ' + Math.round(L.hit) + '% of days.' }, L.hit >= 67 ? OKT : WARNT)); }
    else if (L.pr7 != null && L.pr30 != null && L.g !== 'F') { const u = (L.b || []).includes('Unstable'); verdict.push(Object.assign({ text: (u ? 'unsteady: ' : 'steady: ') + '7-day payout ' + Math.round(L.pr7) + '%, 30-day ' + Math.round(L.pr30) + '% of the best.' }, u ? WARNT : OKT)); }
    if (!isRoot && L.kind30 === 'thin') verdict.push(Object.assign({ text: 'few large validators on ' + L.label + ', so this comparison is rough.' }, INFOT));
    verdict.push(Object.assign({ text: isRoot ? 'principal stays in τ. rewards arrive as basket alpha valued at today’s price.' : 'alpha price on ' + L.label + ' ' + sgn(L.dp30, 1) + ' vs τ over 30 days: same for every validator there, not caused by this one.' }, INFOT));

    const kpis = [
      { label: 'you earn · apy 30d', value: L.g === 'F' ? '0%' : pct(L.a30, isRoot ? 2 : 1), sub: '7d ' + pct(L.a7, isRoot ? 2 : 1) + (isRoot ? ' · in τ' : ' · in alpha'), color: L.g === 'F' ? '#FF6B5E' : '#E8F2EA', tip: isRoot ? 'yearly yield in τ after fees' : 'yearly yield in this subnet’s alpha after fees; price not included' },
      { label: 'payout vs best', value: L.g === 'F' ? '0%' : L.pr == null ? '—' : Math.round(L.pr) + '%', sub: isRoot ? 'best ' + pct(rootBench, 2) : (L.rank ? '#' + L.rank + '/' + L.of + ' on ' + L.label : 'best ' + pct(L.bench, 1)), color: L.g ? G[L.g] : '#E8F2EA', tip: 'compared with the best validators here, leaving this one out' },
      { label: 'total fee', value: pct(L.fee, 1), sub: L.ck > 0.05 ? 'incl. childkey' : 'take only', color: L.fee >= 15 ? '#F2B544' : '#E8F2EA', tip: 'everything the validator keeps' },
      { label: isRoot ? 'root stake' : 'alpha stake here', value: fmtInt(L.stake) + ' τ', sub: isRoot ? '' : 'at today’s price', color: '#E8F2EA', tip: '' },
    ];
    if (!isRoot) kpis.push({ label: 'price 30d · net τ', value: sgn(L.dp30, 1), sub: '· net ' + sgn(L.r30, 1) + ' for the best here', color: '#A9B6AD', tip: 'subnet-wide, not caused by the validator' });

    const mk = (label, v) => {
      const n = v == null ? 0 : Math.round(Math.min(v, 120) / 120 * CBARW);
      return { label: pad(label, 12), fill: '█'.repeat(n), rest: '░'.repeat(CBARW - n), txt: v == null ? '—' : Math.round(v) + '%', color: barFgOf(v) };
    };
    let bars, chartNote;
    if (isRoot) { const per = L.per || []; bars = per.map((v, i) => mk(i === per.length - 1 ? 'last 7d' : ((per.length - 1 - i) * 7 + 7) + 'd ago', v)); chartNote = 'each row: 7-day yield ÷ best root validators'; }
    else { bars = [mk('30 days', L.pr30), mk('last 7 days', L.pr7)]; chartNote = 'per-period alpha history arrives with more data'; }
    const scale = pad('', 13) + '0%' + ' '.repeat(Math.round(CBARW * 90 / 120) - 2) + '90%' + ' '.repeat(Math.max(1, CBARW - Math.round(CBARW * 90 / 120) - 3)) + '120%';

    const amt = parseFloat(String(S.amtD).replace(/,/g, '')) || 0, unit = isRoot ? ' τ' : ' α';
    const yr = L.g === 'F' ? 0 : L.a30 == null ? null : amt * L.a30 / 100;
    const gap = best != null && L.a30 != null ? amt * (best - L.a30) / 100 : null;

    // tabs: the first few places plus the selected one; the full list is below
    const tabIdx = locs.map((_, i) => i).slice(0, TABS);
    if (!tabIdx.includes(li)) tabIdx[tabIdx.length - 1] = li;
    const ngraded = locs.filter((l) => l.g).length;
    return {
      ready: true, loading: false, failed: false,
      slug: name.toLowerCase().replace(/[^a-z0-9.]+/g, '-'), locArg: isRoot ? 'root' : 'sn' + L.nu,
      name, grade: L.g || '-', gFg: L.g ? G[L.g] : '#8A978E', gTip: L.g ? GTIP[L.g] : 'not graded yet',
      locLabel: L.label, locLong: where, feeTxt: pct(L.fee, 1), feeFg: L.fee >= 15 ? '#F2B544' : '#E8F2EA', nomTxt: V.nom != null ? fmtInt(V.nom) : '',
      hk: V.hk, copyTxt: S.copied === 'ok' ? 'copied' : S.copied === 'fail' ? 'copy failed: select it' : 'copy (c)', copy: () => this.copyHk(V.hk),
      tabs: tabIdx.map((i) => { const l = locs[i], on = i === li; return { label: l.label, grade: l.g || '-', gFg: l.g ? G[l.g] : '#8A978E', tip: l.kind === 'root' ? 'root' : (l.sname || ''), on, border: on ? '#4BE38A' : '#2C3A33', bg: on ? '#0E1F15' : 'transparent', fg: on ? '#E8F2EA' : '#A9B6AD', pick: () => this.pickLoc(i) }; }),
      moreLocs: locs.length > tabIdx.length ? locs.length - tabIdx.length : 0,
      goPlaces: () => { if (typeof window !== 'undefined') window.requestAnimationFrame(() => { const el = document.getElementById('tm-places'); if (el) el.scrollIntoView({ block: 'start' }); }); },
      vBorder: L.g ? G[L.g] : '#1E2622', verdict, kpis,
      feeTake: pct(L.take, 1), feeCk: L.ck > 0.05 ? pct(L.ck, 1) : 'none',
      bars, scale, chartNote, chartAria: 'payout vs best: ' + bars.map((b) => b.label.trim() + ' ' + b.txt).join(', '),
      amt: S.amtD, onAmt: (e) => this.setState({ amtD: e.target.value }),
      calcYear: yr == null ? '—' : fmtInt(yr) + unit, calcMonth: yr == null ? '—' : fmtInt(yr / 12) + unit,
      calcVs: gap == null ? '' : gap > 0.5 ? '> best here pays +' + fmtInt(gap) + unit + '/yr on the same stake' : '> on par with the best here',
      calcNote: isRoot ? '30-day APY; rewards arrive as basket alpha.' : '30-day APY, paid in alpha; its τ value follows the subnet price.',
      places: locs.map((l, i) => ({
        label: l.label, sname: l.kind === 'root' ? 'root stake' : (l.sname || ''), grade: l.g || '-', gFg: l.g ? G[l.g] : '#8A978E',
        apy: l.g === 'F' ? '0%' : pct(l.a30, l.kind === 'root' ? 2 : 1), pr: l.g === 'F' ? '0%' : l.pr == null ? '—' : Math.round(l.pr) + '%',
        fee: pct(l.fee, 1), feeFg: l.fee >= 15 ? '#F2B544' : '#D4DDD6', stake: fmtInt(l.stake),
        on: i === li, bg: i === li ? '#0E1F15' : 'transparent', whereFg: i === li ? '#4BE38A' : '#A9B6AD', pick: () => this.pickLoc(i),
      })),
      placesNote: locs.length + (locs.length === 1 ? ' place, ' : ' places, ') + ngraded + ' graded · h/l to step',
    };
  }
}
DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {});
