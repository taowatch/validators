// Generated from design/App.dc.html by tools/dc2web.py — edit the design, then rerun.
const DATA_URL = '/api/choose';
const VALIDATOR_URL = '/api/validator/';
const GRADE = {
  A: { bg: '#123327', fg: '#3DDBB0', tip: 'A: pays at least 95% of the best validators here' },
  B: { bg: '#16223A', fg: '#8FB0FF', tip: 'B: pays 85–95% of the best' },
  C: { bg: '#2E2814', fg: '#E8C35A', tip: 'C: pays 70–85% of the best' },
  D: { bg: '#33210F', fg: '#F5A524', tip: 'D: pays less than 70% of the best' },
  F: { bg: '#3A1716', fg: '#FF8A80', tip: 'F: earned nothing over 30 days' },
};
const BADGE = {
  'Not earning': { bg: '#3A1716', fg: '#FF8A80', tip: 'No rewards reached stakers over the window' },
  'High fee': { bg: '#33210F', fg: '#F5A524', tip: 'Keeps 15% or more of rewards (take + childkey take)' },
  'Unstable': { bg: '#2E2814', fg: '#E8C35A', tip: 'Its 7-day and 30-day payout differ by more than 15 points', rootTip: 'Paid at least 90% of the best on fewer than half of the last 30 days' },
  // a warning like the ones above (hidden by "Hide warnings"), so it gets a warning colour
  'Thin benchmark': { bg: '#2E2814', fg: '#E8C35A', tip: 'Few comparable validators here, so the comparison is rough' },
  'New': { bg: '#1A212B', fg: '#A9B4C2', tip: 'Not enough history to grade yet' },
  'Small': { bg: '#1A212B', fg: '#A9B4C2', tip: 'Under 1,000 τ staked: not graded' },
};
// Rows "with warnings" (hidden by "Hide warnings"); the Terminal UI uses the same list.
const WARN_BADGES = new Set(['Not earning', 'High fee', 'Unstable', 'Thin benchmark']);
const hasWarn = (b) => (b || []).some((x) => WARN_BADGES.has(x));
const NARROW = '(max-width: 899px)';
const PX_EVERY = 2000;
const REDUCED = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const OK = { icon: '✓', bg: '#123327', fg: '#3DDBB0' };
const WARN = { icon: '!', bg: '#33210F', fg: '#F5A524' };
const BAD = { icon: '×', bg: '#3A1716', fg: '#FF8A80' };
const INFO = { icon: 'i', bg: '#161C25', fg: '#A9B4C2' };
// finney: TAO/USDT ticker streamed from Binance; the snapshot is only the fallback until the stream connects
const PRICE_WS = 'wss://data-stream.binance.vision/ws/taousdt@ticker';
const PRICE_SNAPSHOT = { c: 185.10, P: 3.989, h: 186.10, l: 169.10, q: 16169472.5, E: 1795663101480 };
const HASH_RE = /^#v\/([1-9A-HJ-NP-Za-km-z]{40,60})(?:\/(\d+))?$/;
const PAGE = 40;
// "Stake in a subnet" step 1: how the subnet list is ranked
const SP_MODES = {
  balanced: { label: 'Balanced', note: 'Rewards minus any price drop over the window (price gains are not counted: they often fade), among subnets with 10K τ or more staked and a solid reference (3+ good pools).' },
  rewards: { label: 'Highest rewards', note: 'Highest rewards only, among subnets with 10K τ or more staked and a solid reference. The price can still swing a lot; check the price column before you stake.' },
  net: { label: 'Best result in τ', note: 'What stakers actually ended up with in τ: rewards plus the price move. Often led by a price jump that may not repeat.' },
};
const SP_DEPTHS = [[0, 'All'], [10000, '10K+'], [50000, '50K+'], [100000, '100K+']];
const SP_PAGE = 20;
const quantile = (xs, q) => { const a = xs.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.round(q * (a.length - 1))] : null; };
const STAKE_US = '5FFSBkNiymQWHaxc8dTmfTT7iHoz6YDexVG4xR2yLrffVR86';
// sortable columns: `best` = direction that puts the best first (1 = high values first)
const SORTS = {
  g: { label: 'Grade', best: 1, val: (r) => (r.g ? 5 - 'ABCDF'.indexOf(r.g) : null), word: ['A first', 'F first'] },
  a30: { label: 'APY 30D', best: 1, val: (r) => (r.g === 'F' ? 0 : r.a30), word: ['highest first', 'lowest first'] },
  pr: { label: 'Payout vs best', best: 1, val: (r) => (r.g === 'F' ? 0 : r.pr), word: ['highest first', 'lowest first'] },
  fee: { label: 'Total fee', best: -1, val: (r) => r.fee, word: ['lowest first', 'highest first'] },
  stake: { label: 'Stake', best: 1, val: (r) => r.stake, word: ['largest first', 'smallest first'] },
};
const TABS = 8;
const PLACES = 12;
const fmtInt = (n) => n == null ? '—' : Math.round(n).toLocaleString('en-US');
const fmtK = (n) => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n));
const pct = (n, d) => n == null ? '—' : n.toFixed(d == null ? 1 : d) + '%';
const sgn = (n, d) => { if (n == null) return '—'; const t = Math.abs(n).toFixed(d == null ? 1 : d); return (+t === 0 ? '' : n > 0 ? '+' : '−') + t + '%'; };
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
function usd(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function hue(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
function modified(e) { return !!(e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)); }
// Remember the chosen interface (per viewer) and go to its page, keeping the current view (the hash).
function switchUI(to, e) {
  if (modified(e)) return;
  if (e) e.preventDefault();
  try { localStorage.setItem('vy.ui', to); } catch (err) { /* storage blocked: the link still works */ }
  window.location.href = (to === 'terminal' ? '/terminal' : '/') + (window.location.hash || '');
}

// rank by 30-day APY among graded validators in this place; it stays with the validator when
// the list is filtered or re-sorted. Ungraded and not-earning ones get none.
function rankMap(rows) {
  const m = new Map();
  rows.filter((r) => r.g && r.g !== 'F' && r.a30 != null).sort((a, b) => b.a30 - a.a30).forEach((r, i) => m.set(r.hk, i + 1));
  return m;
}
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      data: null, err: null, mode: 'root', sn: null, q: '', snQ: '', snOpen: false, snAct: 0, grade: 'all', hideWarn: false, all: false, calcHk: null, amt: '1,000',
      view: 'list', hk: null, wantNu: null, det: null, detErr: null, loc: null, amtD: '1,000', copied: null, allPlaces: false, pSortKey: null, pSortDir: 1,
      px: null, pxLive: false, pxDir: 0, sortKey: null, sortDir: 1, badImg: 0,
      spW: 30, spMode: 'balanced', spQ: '', spDepth: 10000, spThin: true, spSort: null, spDir: -1, spAll: false,
      // one layout at a time: the table, or cards below 900px
      narrow: typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(NARROW).matches,
    };
    this.badImg = new Set();
  }

  componentDidMount() {
    this.connectPrice();
    if (typeof window !== 'undefined' && !this.winBound) {
      this.winBound = true;
      window.addEventListener('pageshow', (e) => this.onPageShow(e));
      window.addEventListener('popstate', () => this.route());
      if (window.matchMedia) {
        const mq = window.matchMedia(NARROW);
        const onMq = () => { if (mq.matches !== this.state.narrow) this.setState({ narrow: mq.matches }); };
        if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
      }
      this.route();
    }
    fetch(DATA_URL)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => this.setState({ data: d }))
      .catch((e) => this.setState({ err: String((e && e.message) || e) }));
  }

  componentWillUnmount() {
    this.dead = true;
    clearTimeout(this.wsTimer);
    clearTimeout(this.pxTimer);
    this.pxTimer = null;
    if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch (e) { /* ignore */ } }
  }

  // ---- live TAO price ----
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
  // At most one price render every PX_EVERY ms, and none when nothing visible changed:
  // every render rebuilds the whole page, and Binance sends ticks about once a second.
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
  // A page restored from the back/forward cache got `pagehide` without a fresh mount.
  onPageShow(e) {
    if (!e.persisted) return;
    this.dead = false;
    this.wsTries = 0;
    if (!this.ws) this.connectPrice();
  }
  ticker(accent) {
    const S = this.state, p = S.px || PRICE_SNAPSHOT, live = S.pxLive && !!S.px;
    const t = new Date(p.E);
    return {
      price: '$' + p.c.toFixed(2),
      chg: sgn(p.P, 2) + ' 24h', chgColor: p.P >= 0 ? accent : '#F5A524',
      flash: !live || S.pxDir === 0 ? '#E6EDF3' : S.pxDir > 0 ? accent : '#F5A524',
      dot: live ? accent : '#5B6675', status: live ? 'live' : S.px ? 'reconnecting' : 'snapshot',
      title: 'Binance TAO/USDT · 24h high $' + p.h.toFixed(2) + ' · low $' + p.l.toFixed(2) + ' · vol ' + usd(p.q) + ' · ' + t.toISOString().slice(11, 19) + ' UTC',
    };
  }

  // ---- navigation: "/" = choose, "#v/<hotkey>[/<netuid>]" = validator page ----
  route() {
    let m = null;
    try { m = HASH_RE.exec(window.location.hash); } catch (e) { /* ignore */ }
    if (m) this.show(m[1], m[2] != null ? +m[2] : null);
    else if (this.state.view === 'detail') this.toList();
  }
  show(hk, nu) {
    if (this.state.view !== 'detail' && typeof window !== 'undefined') this.listY = window.scrollY || 0;
    const same = this.state.hk === hk && this.state.det;
    this.setState({ view: 'detail', hk, wantNu: nu, loc: null, copied: null, allPlaces: false, det: same ? this.state.det : null, detErr: null, pSortKey: same ? this.state.pSortKey : null, pSortDir: same ? this.state.pSortDir : 1 });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
    if (same) return;
    fetch(VALIDATOR_URL + encodeURIComponent(hk))
      .then((r) => { if (r.status === 404) throw new Error('unknown'); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => { if (this.state.hk === hk) this.setState({ det: d }); })
      .catch((e) => {
        if (this.state.hk !== hk) return;
        const msg = String((e && e.message) || e);
        this.setState({ detErr: msg === 'unknown' ? 'No data for this hotkey. It is not a validator we track (root stake or alpha pools of 10 τ or more).' : 'Couldn’t load this validator (' + msg + ').' });
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
    if (typeof window !== 'undefined' && window.requestAnimationFrame) window.requestAnimationFrame(() => window.scrollTo(0, y));
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
    this.setState({ view: 'list', mode: 'root', sn: null, q: '', grade: 'all', hideWarn: false, all: false, calcHk: null, sortKey: null, sortDir: 1 });
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  }
  copyHk(hk) {
    const done = (ok) => {
      this.setState({ copied: ok ? 'ok' : 'fail' });
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.setState({ copied: null }), 1800);
    };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
      navigator.clipboard.writeText(hk).then(() => done(true), () => done(false));
    } catch (e) { done(false); }
  }

  // ---- avatars: identity image / subnet logo, monogram when missing or broken ----
  ava(url, seed, label) {
    const h = hue(seed || label || '?');
    const ok = !!url && !this.badImg.has(url);
    const ini = (String(label || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || String(seed || '').slice(1, 3) || '?').toUpperCase();
    return {
      img: ok, mono: !ok, src: ok ? url : '', ini,
      bg: ok ? '#0E131A' : 'hsl(' + h + ' 34% 20%)', fg: 'hsl(' + h + ' 70% 78%)',
      err: () => { if (!this.badImg.has(url)) { this.badImg.add(url); this.setState({ badImg: this.badImg.size }); } },
    };
  }
  sortRows(list) {
    const S = this.state, def = SORTS[S.sortKey];
    if (!def) return list;
    const dir = S.sortDir; // 1 = the column's best-first order, -1 = reversed
    const idx = new Map(list.map((r, i) => [r, i]));
    return list.slice().sort((a, b) => {
      const x = def.val(a), y = def.val(b);
      if (x == null && y == null) return idx.get(a) - idx.get(b);
      if (x == null) return 1; // nulls last either way
      if (y == null) return -1;
      const d = (y - x) * def.best * dir;
      return d !== 0 ? d : idx.get(a) - idx.get(b);
    });
  }
  // sort `items` by SORTS[key] applied to rowOf(item); nulls last, stable, dir 1 = best first
  sortBy2(items, rowOf, key, dir) {
    const def = SORTS[key];
    if (!def) return items;
    const idx = new Map(items.map((r, i) => [r, i]));
    return items.slice().sort((a, b) => {
      const x = def.val(rowOf(a)), y = def.val(rowOf(b));
      if (x == null && y == null) return idx.get(a) - idx.get(b);
      if (x == null) return 1;
      if (y == null) return -1;
      const d = (y - x) * def.best * dir;
      return d !== 0 ? d : idx.get(a) - idx.get(b);
    });
  }
  sortHeads(key, dir, accent, pick) {
    const out = {};
    Object.keys(SORTS).forEach((k) => {
      const on = key === k, def = SORTS[k], words = def.word;
      out[k] = {
        on, color: on ? accent : '#8B97A6',
        arrow: on ? (dir === 1 ? (def.best === 1 ? ' ↓' : ' ↑') : (def.best === 1 ? ' ↑' : ' ↓')) : ' ↕',
        aria: on ? 'Sorted by ' + def.label + ', ' + (dir === 1 ? words[0] : words[1]) + '. Activate to reverse.' : 'Sort by ' + def.label + ', ' + words[0],
        pick: () => pick(k),
      };
    });
    return out;
  }
  sortBy(k) {
    const S = this.state;
    if (S.sortKey === k) this.setState({ sortDir: -S.sortDir, all: false });
    else this.setState({ sortKey: k, sortDir: 1, all: false });
  }

  // ---- data ----
  rowsFor(D, alpha, sn) {
    if (!alpha) {
      return D.root.rows.map((r) => ({
        name: r.n || short(r.hk), hk: r.hk, g: r.g, a30: r.a30, a7: r.a7, pr: r.pr, fee: r.t * 100, take: r.t * 100, ck: 0,
        stake: r.s, stakeSub: r.nom != null ? fmtInt(r.nom) + ' nominators' : '', b: r.b || [], nu: null, img: r.img || null,
      }));
    }
    const C = D.pcols, ix = (k) => C.indexOf(k);
    return (D.pools[String(sn)] || []).map((p) => ({
      name: p[ix('n')], hk: p[ix('hk')], g: p[ix('g')], a30: p[ix('a30')], a7: p[ix('a7')], pr: p[ix('pr')], fee: p[ix('fee')], take: p[ix('take')], ck: p[ix('ck')],
      stake: p[ix('tao')], stakeSub: 'alpha staked, in τ', b: p[ix('b')] || [], nu: sn, img: ix('img') >= 0 ? p[ix('img')] : null,
    }));
  }

  renderVals() {
    const accent = this.props.accent ?? '#3DDBB0';
    const S = this.state, D = S.data;
    const base = {
      accent, tk: this.ticker(accent), home: (e) => this.home(e), back: (e) => this.back(e),
      stakeUs: (e) => this.open(STAKE_US, null, e),
      toTerminal: (e) => switchUI('terminal', e),
      // the hash is the route, so the skip link moves focus instead of changing it
      skip: (e) => { if (e) e.preventDefault(); const el = document.getElementById('validators'); if (el) { el.setAttribute('tabindex', '-1'); el.focus(); el.scrollIntoView({ block: 'start' }); } },
      loading: !D && !S.err, failed: !D && !!S.err, err: S.err, skel: [1, 2, 3, 4, 5, 6, 7, 8],
      blockTxt: D ? fmtInt(D.block) : '…', timeTxt: D && D.ts ? new Date(D.ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '',
      isList: false, isDetail: false, d: {},
    };
    if (S.view === 'detail') return Object.assign(base, { loading: false, failed: false, isDetail: true, d: this.detail(D, accent) });
    if (!D) return base;
    return Object.assign(base, { isList: true, wide: !S.narrow, narrow: !!S.narrow }, this.list(D, accent));
  }

  list(D, accent) {
    const S = this.state;
    const alpha = S.mode === 'alpha';
    const subs = D.subnets || [];
    const sn = S.sn != null ? S.sn : (subs.find((s) => s.nu === 51) || subs[0] || {}).nu;
    const cur = subs.find((s) => s.nu === sn) || null;
    const sorted = (xs) => xs.filter((x) => x != null).sort((a, b) => a - b);
    const med = (xs) => xs.length ? xs[Math.floor(xs.length / 2)] : null;
    const bests = sorted(subs.map((s) => s.best)), dps = sorted(subs.map((s) => s.dp30));

    const picking = alpha && S.sn == null;
    let all = this.rowsFor(D, alpha, sn);
    const rankOf = rankMap(all);
    const q = S.q.trim().toLowerCase();
    if (q) all = all.filter((r) => (r.name || '').toLowerCase().includes(q) || r.hk.toLowerCase().includes(q));
    // chip counts follow the search and "hide warnings" (same rule as the Terminal UI)
    if (S.hideWarn) all = all.filter((r) => !hasWarn(r.b));
    const counts = { all: all.length };
    'ABCDF'.split('').forEach((g) => { counts[g] = all.filter((r) => r.g === g).length; });
    let list = S.grade === 'all' ? all : all.filter((r) => r.g === S.grade);
    list = this.sortRows(list);
    const total = list.length;
    const shown = S.all ? list : list.slice(0, PAGE);
    const best = alpha ? (cur && cur.best) : D.root.bench;

    const rows = shown.map((r) => {
      const G = GRADE[r.g], F = r.g === 'F';
      const pr = F ? 0 : r.pr;
      const barC = pr == null ? '#4A5565' : pr >= 95 ? accent : pr >= 85 ? '#8FB0FF' : pr >= 70 ? '#E8C35A' : '#F5A524';
      const href = '#v/' + r.hk + (r.nu != null ? '/' + r.nu : '');
      const rk = rankOf.get(r.hk);
      return {
        rank: rk || '—', rankColor: rk && rk <= 3 ? accent : '#6B7684',
        name: r.name, hkShort: r.name === short(r.hk) ? '' : short(r.hk), av: this.ava(r.img, r.hk, r.name), grade: r.g || '—', gBg: G ? G.bg : '#1A212B', gFg: G ? G.fg : '#8B97A6',
        gradeTip: G ? G.tip : 'Not graded yet',
        badges: r.b.map((b) => { const B = BADGE[b] || { bg: '#1A212B', fg: '#A9B4C2', tip: '' }; return { label: b, bg: B.bg, fg: B.fg, tip: !alpha && B.rootTip ? B.rootTip : B.tip }; }),
        earn: F ? 'Not earning' : pct(r.a30, alpha ? 1 : 2), earnShort: F ? '0%' : pct(r.a30, alpha ? 1 : 2), earn7: alpha ? pct(r.a7, 1) : '', earnColor: F ? '#FF8A80' : '#E6EDF3',
        payout: pr == null ? '—' : Math.min(100, Math.round(pr)) + '%', barW: pr == null ? '0%' : Math.min(100, pr) + '%', barC, payC: pr == null ? '#8B97A6' : barC,
        fee: pct(r.fee, 1), feeColor: r.fee >= 15 ? '#F5A524' : '#E6EDF3',
        feeSub: r.ck > 0.05 ? 'take ' + pct(r.take, 0) + ' + childkey ' + pct(r.ck, 1) : '',
        stake: fmtK(r.stake) + ' τ',
        cardRight: alpha ? (pr == null ? '—' : Math.min(100, Math.round(pr)) + '%') + ' of best' : '7D ' + pct(r.a7, 2),
        cardSub: 'fee ' + pct(r.fee, 1) + ' · ' + fmtK(r.stake) + ' τ' + (r.b.length ? ' · ' + r.b.join(', ') : ''),
        cardSubColor: r.fee >= 15 || hasWarn(r.b) ? '#F5A524' : '#8B97A6',
        href, aria: (rk ? 'rank ' + rk + ', ' : '') + r.name + ', grade ' + (r.g || 'not graded') + ', earns ' + (F ? 'nothing' : pct(r.a30, 1)) + ', fee ' + pct(r.fee, 1),
        open: (e) => this.open(r.hk, r.nu, e),
      };
    });

    const gradeChips = [{ k: 'all', label: 'All' }].concat('ABCDF'.split('').map((g) => ({ k: g, label: g }))).map((c) => {
      const on = S.grade === c.k, G = GRADE[c.k];
      return { label: c.label, count: counts[c.k], on, tip: G ? G.tip : 'Every grade',
        border: on ? (G ? G.fg : accent) : '#1C232D', bg: on ? (G ? G.bg : '#151C26') : 'transparent', fg: on ? (G ? G.fg : '#E6EDF3') : '#A9B4C2',
        pick: () => this.setState({ grade: c.k, all: false }) };
    });

    let sumKicker, sumTitle, sumStats, sumNote = '';
    if (alpha && cur) {
      sumKicker = '';
      sumTitle = cur.name;
      sumStats = [
        { label: 'Best APY · 30D', value: pct(cur.best, 1), sub: 'paid in alpha', color: accent, tip: 'Median of the top 3 validators here', faq: '/faq#best' },
        { label: 'Net in τ · 30D', value: sgn(cur.net30, 1), sub: 'best validator, rewards + price', color: cur.net30 == null ? '#A9B4C2' : cur.net30 >= 0 ? accent : '#FF8A80', tip: 'What staking with the best validator here returned in τ over 30 days, not annualized', faq: '/faq#net' },
        { label: 'Alpha price · 30D', value: sgn(cur.dp30, 1), sub: 'same for every validator here', color: '#A9B4C2', tip: 'Change of this alpha against τ. Not caused by validators.', faq: '/faq#price' },
        { label: 'Validators', value: fmtInt(cur.nv), sub: 'with 10 τ or more', color: '#E6EDF3', tip: '' },
      ];
      sumNote = !cur.nbest ? 'Not graded yet: no pool of 100 τ or more has earned over 30 days here.'
        : cur.nbest < 3 ? 'Few large validators on this subnet, so grades here compare against smaller pools and are rougher.' : '';
    } else if (alpha) {
      sumKicker = 'Subnet'; sumTitle = 'No subnet data yet'; sumStats = [];
    } else {
      const graded = D.root.rows.filter((r) => r.g).length;
      sumKicker = 'Root';
      sumTitle = 'Root network';
      sumStats = [
        { label: 'Best APY · 30D', value: pct(D.root.bench, 2), sub: 'in τ, after fees', color: accent, tip: 'Median of the top 3 root validators', faq: '/faq#best' },
        { label: 'Graded validators', value: fmtInt(graded), sub: 'of ' + fmtInt(D.root.rows.length), color: '#E6EDF3', tip: '1,000 τ or more and 21+ days of history', faq: '/faq#ungraded' },
      ];
    }

    // calculator: any validator in the current list (default the first)
    const calcRow = list.find((r) => r.hk === S.calcHk) || list[0] || null;
    const amt = parseFloat(String(S.amt).replace(/,/g, '')) || 0;
    const unit = alpha ? ' α/yr' : ' τ/yr';
    const px = (S.px || PRICE_SNAPSHOT).c;
    // no 30D yield yet (new, not graded) → no made-up "0 τ/yr"
    const yr = !calcRow ? null : calcRow.g === 'F' ? 0 : calcRow.a30 == null ? null : amt * calcRow.a30 / 100;
    const calc = calcRow ? {
      hk: calcRow.hk, name: calcRow.name,
      perYear: yr == null ? '— (no 30D yield yet)' : fmtInt(yr) + unit,
      usd: alpha || yr == null ? '' : '(' + usd(yr * px) + ')',
      vs: best != null && calcRow.a30 != null ? (best - calcRow.a30 > 0.005 ? '· the best here would pay +' + fmtInt(amt * (best - calcRow.a30) / 100) + unit.replace('/yr', ' more a year') : '· on par with the best here') : '',
      href: '#v/' + calcRow.hk + (calcRow.nu != null ? '/' + calcRow.nu : ''), open: (e) => this.open(calcRow.hk, calcRow.nu, e),
    } : { hk: '', name: '—', perYear: '—', usd: '', vs: '', href: '#', open: () => {} };
    const calcOpts = list.slice(0, 200).map((r) => ({ v: r.hk, label: (r.g ? r.g + ' · ' : '') + r.name }));

    const sh = {};
    Object.keys(SORTS).forEach((k) => {
      const on = S.sortKey === k, def = SORTS[k];
      const words = def.word;
      sh[k] = {
        on, color: on ? accent : '#8B97A6',
        arrow: on ? (S.sortDir === 1 ? (def.best === 1 ? ' ↓' : ' ↑') : (def.best === 1 ? ' ↑' : ' ↓')) : ' ↕',
        aria: on ? 'Sorted by ' + def.label + ', ' + (S.sortDir === 1 ? words[0] : words[1]) + '. Activate to reverse.' : 'Sort by ' + def.label + ', ' + words[0],
        pick: () => this.sortBy(k),
      };
    });
    const msortOpts = [{ v: '', label: 'Default order' }];
    Object.keys(SORTS).filter((k) => alpha || k !== 'pr').forEach((k) => { msortOpts.push({ v: k + ':1', label: SORTS[k].label + ' · ' + SORTS[k].word[0] }); msortOpts.push({ v: k + ':-1', label: SORTS[k].label + ' · ' + SORTS[k].word[1] }); });
    const sumAva = alpha && cur ? this.ava(cur.logo, 'SN' + cur.nu, cur.name) : null;
    // the validator search found nothing but looks like a subnet: offer to go there
    let snHint = null;
    if (q && list.length === 0) {
      const hit = matchSubnets(subs, S.q)[0];
      if (hit && !(alpha && hit.nu === sn)) snHint = { label: 'Go to SN' + hit.nu + ' · ' + hit.name, go: () => this.pickSubnet(hit.nu) };
    }

    return {
      sh, msortOpts, msortVal: S.sortKey ? S.sortKey + ':' + S.sortDir : '',
      pickMsort: (e) => { const v = e.target.value; if (!v) this.setState({ sortKey: null, sortDir: 1, all: false }); else { const [k, d] = v.split(':'); this.setState({ sortKey: k, sortDir: +d, all: false }); } },
      sumAva, sumSn: alpha && cur ? 'SN' + cur.nu : '',
      rootOn: !alpha, alphaOn: alpha,
      rootBorder: !alpha ? accent : '#1C232D', rootBg: !alpha ? '#0F1A17' : '#0E131A',
      alphaBorder: alpha ? accent : '#1C232D', alphaBg: alpha ? '#0F1A17' : '#0E131A',
      pickRoot: () => this.setState({ mode: 'root', all: false, calcHk: null, grade: 'all' }),
      pickAlpha: () => this.setState({ mode: 'alpha', sn: null, all: false, calcHk: null, grade: 'all' }),
      toSubnets: () => this.setState({ sn: null, q: '', all: false, calcHk: null, grade: 'all' }),
      showList: !picking,
      sp: this.subnetPick(D, accent, picking),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value, all: false }),
      hideWarn: S.hideWarn, toggleWarn: () => this.setState({ hideWarn: !S.hideWarn, all: false }),
      warnBorder: S.hideWarn ? accent : '#1C232D', warnFg: S.hideWarn ? accent : '#A9B4C2',
      amt: S.amt, onAmt: (e) => this.setState({ amt: e.target.value }),
      showAll: () => this.setState({ all: true }),
      clearFilters: () => this.setState({ q: '', grade: 'all', hideWarn: false, all: false }),
      showPay: alpha, gridCols: alpha ? '36px minmax(240px, 2.2fr) 140px minmax(190px, 1.4fr) 150px 130px' : '36px minmax(280px, 2.6fr) 160px 150px 150px',
      stakeTip: alpha ? 'Alpha staked with this validator, valued in τ at today’s price' : 'τ staked with this validator',
      earnTip: alpha ? 'Yearly yield in this subnet’s alpha, after all fees, from the last 30 days. Alpha price moves are not included.' : 'Yearly yield in τ after all fees, from the last 30 days.',
      rootBench: D.root.bench == null ? '—' : D.root.bench.toFixed(1),
      alphaRange: bests.length ? Math.round(med(bests)) + '% median APY' : '—', medDp: sgn(med(dps), 1),
      ...this.snPicker(subs, picking ? null : cur, accent),
      snHint,
      sumKicker, sumTitle, sumNote,
      sumStats: sumStats.map((st) => Object.assign({ faq: '', faqAria: 'About ' + st.label }, st)),
      gradeChips, rows, noRows: rows.length === 0,
      noRowsTxt: q ? 'No validator matches “' + S.q.trim() + '” here.' : 'No validator matches these filters.',
      more: !S.all && total > shown.length, total,
      hasCalc: !!calcRow, calc, calcOpts, pickCalc: (e) => this.setState({ calcHk: e.target.value }),
    };
  }

  pickSubnet(nu) {
    const first = this.state.sn == null;
    this.setState({ mode: 'alpha', sn: nu, snQ: '', snOpen: false, snAct: 0, q: '', all: false, calcHk: null, grade: 'all' });
    // coming from the subnet list: bring the steps and the validator list into view
    if (first && typeof window !== 'undefined') window.requestAnimationFrame(() => { const el = document.querySelector('nav[aria-label="Steps"]'); if (el) el.scrollIntoView({ block: 'start', behavior: REDUCED() ? 'auto' : 'smooth' }); });
  }

  // best validator per subnet: grade A, 1,000 τ or more, lowest total fee, then highest APY
  bestOn(D) {
    if (this._bvData === D) return this._bv;
    const C = D.pcols || [], ix = (k) => C.indexOf(k), m = new Map();
    const [iN, iH, iT, iF, iA, iP, iG] = ['n', 'hk', 'tao', 'fee', 'a30', 'pr', 'g'].map(ix);
    Object.keys(D.pools || {}).forEach((nu) => {
      const ok = (D.pools[nu] || []).filter((r) => r[iG] === 'A' && r[iT] >= 1000);
      ok.sort((a, b) => (a[iF] - b[iF]) || ((b[iA] || 0) - (a[iA] || 0)));
      if (ok[0]) m.set(+nu, { name: ok[0][iN] || short(ok[0][iH]), hk: ok[0][iH], fee: ok[0][iF], pr: ok[0][iP] });
    });
    this._bvData = D; this._bv = m;
    return m;
  }

  // step 1 of "Stake in a subnet": which subnet, judged on rewards, price and pool depth against Root
  subnetPick(D, accent, on) {
    const S = this.state;
    const step = { on, off: !on, snLabel: on ? 'Know the subnet?' : 'Subnet',
      step2Fg: on ? '#8B97A6' : '#E6EDF3', step2W: on ? 400 : 600, step2Bd: on ? '#2A3340' : accent, step2Bg: on ? 'transparent' : accent, step2NumFg: on ? '#8B97A6' : '#0A0E13' };
    if (!on) return step;
    const GREEN = '#3DDBB0', RED = '#FF8A80', ORANGE = '#F5A524', BLUE = '#7AA2F7';
    const subs = D.subnets || [];
    const hasWins = subs.some((s) => s.best7 != null);
    const w = hasWins ? S.spW : 30, wl = w + 'D';
    const amt = Math.max(0, parseFloat(String(S.amt).replace(/[^0-9.]/g, '')) || 0);
    const rootApy = D.root.bench, rootRet = rootApy == null ? 0 : rootApy * w / 365;
    const bvs = this.bestOn(D);
    const all = subs.map((s) => {
      const apy = w === 7 ? s.best7 : s.best, px = w === 7 ? s.dp7 : s.dp30, net = w === 7 ? s.net7 : s.net30;
      return { s, nu: s.nu, name: s.name, apy, px, net, rew: apy == null ? null : apy * w / 365, tao: s.tao || 0, nref: s.nbest || 0, bv: bvs.get(s.nu) || null };
    }).filter((x) => x.apy != null && x.apy >= 0.01);
    const share = (x) => (amt > 0 && x.tao > 0 ? amt / (x.tao + amt) * 100 : 0);
    const col = (n) => (n == null ? '#8B97A6' : n > 0.05 ? GREEN : n < -0.05 ? RED : '#C9D1D9');
    const key = { balanced: (x) => x.rew + Math.min(0, x.px || 0), rewards: (x) => x.apy, net: (x) => x.net }[S.spMode];
    const pool = all.filter((x) => x.tao >= 10000 && x.nref >= 3 && key(x) != null).sort((a, b) => key(b) - key(a));
    const rankOf = new Map(pool.map((x, i) => [x.nu, i + 1]));
    const tags = (x) => {
      const t = [];
      if (x.net != null && x.net > rootRet) t.push({ t: 'Beat Root', bg: '#12281F', fg: GREEN, tip: 'Ended ahead of Root in τ over ' + wl });
      if ((x.px || 0) <= -15) t.push({ t: 'Price falling', bg: '#3A1716', fg: RED, tip: 'Alpha lost ' + Math.abs(x.px).toFixed(0) + '% against τ over ' + wl });
      else if ((x.px || 0) >= 15) t.push({ t: 'Price jumped', bg: '#2E2814', fg: '#E8C35A', tip: 'Alpha gained ' + x.px.toFixed(0) + '% over ' + wl + '; jumps often fade' });
      if (w === 30 && Math.abs(x.s.dp7 || 0) >= 10) t.push({ t: 'Swinging', bg: '#2E2814', fg: '#E8C35A', tip: 'Price moved ' + sgn(x.s.dp7, 0) + ' in the last 7 days alone' });
      if (x.tao < 10000) t.push({ t: 'Shallow pool', bg: '#33210F', fg: ORANGE, tip: 'Under 10K τ staked: entering and leaving moves the price' });
      if (x.nref < 3) t.push({ t: 'Thin reference', bg: '#1A212B', fg: '#A9B4C2', tip: 'Fewer than 3 pools of 100 τ or more earned, so the rewards figure is rough' });
      return t;
    };
    const bvSub = (b) => (b ? 'fee ' + pct(b.fee, 0) + ' · ' + Math.min(100, Math.round(b.pr || 0)) + '% of best' : 'none graded A yet');
    const facts = [
      { label: 'Rewards, middle half of subnets', value: sgn(quantile(all.map((x) => x.rew), 0.25)) + ' to ' + sgn(quantile(all.map((x) => x.rew), 0.75)), sub: 'paid in alpha over ' + wl, color: accent },
      { label: 'Alpha price, middle half', value: sgn(quantile(all.map((x) => x.px), 0.25), 0) + ' to ' + sgn(quantile(all.map((x) => x.px), 0.75), 0), sub: 'against τ over ' + wl + ' · usually the bigger part', color: ORANGE },
      { label: 'Subnets that beat Root in τ', value: all.filter((x) => x.net != null && x.net > rootRet).length + ' of ' + all.length, sub: 'Root paid ' + sgn(rootRet, 2) + ' in τ over ' + wl, color: BLUE },
    ];
    const picks = pool.slice(0, 3).map((x, i) => {
      const b = x.bv, href = b ? '#v/' + b.hk + '/' + x.nu : '#';
      return {
        n: i + 1, medalBg: i === 0 ? accent : '#1A212B', medalFg: i === 0 ? '#0A0E13' : '#C9D1D9', av: this.ava(x.s.logo, 'SN' + x.nu, x.name),
        sn: 'SN' + x.nu, name: x.name, rew: sgn(x.rew), apy: pct(x.apy, 0), px: sgn(x.px), pxColor: col(x.px),
        net: sgn(x.net), netColor: col(x.net), vs: x.net == null ? '—' : sgn(x.net - rootRet) + ' pts', vsColor: x.net != null && x.net >= rootRet ? GREEN : RED,
        tags: tags(x).filter((t) => t.t !== 'Beat Root')
          .concat(share(x) >= 1 ? [{ t: 'Big for this pool', bg: '#33210F', fg: ORANGE, tip: fmtInt(amt) + ' τ is ' + share(x).toFixed(1) + '% of all alpha staked here; your own stake moves the price' }] : [])
          .concat(x.tao >= 50000 ? [{ t: 'Deep pool', bg: '#16223A', fg: '#8FB0FF', tip: fmtK(x.tao) + ' τ staked here' }] : []),
        cushion: 'Rewards absorb a price drop of ~' + (x.apy * 30 / 365).toFixed(1) + '% a month.',
        bv: b ? b.name : 'No grade-A validator yet', bvSub: b ? bvSub(b) : '', bvOk: !!b, bvNo: !b, href,
        go: (e) => { if (b) this.open(b.hk, x.nu, e); }, list: () => this.pickSubnet(x.nu),
      };
    });
    // chart: x = price change, y = rewards APY, both clipped to the frame
    const XMIN = -50, XMAX = 50, YMAX = Math.min(200, Math.max(40, Math.ceil((quantile(all.map((x) => x.apy), 0.95) || 100) / 20) * 20));
    const X = (v) => (Math.max(XMIN, Math.min(XMAX, v)) - XMIN) / (XMAX - XMIN) * 100;
    const Y = (v) => Math.max(0, Math.min(YMAX, v)) / YMAX * 100;
    const ev = []; for (let v = XMIN; v <= 0; v += 1) ev.push(X(v).toFixed(2) + ' ' + (100 - Y(-v * 365 / w)).toFixed(2));
    const even = 'M' + ev.join(' L'), top = new Set(pool.slice(0, 3).map((x) => x.nu));
    const ch = {
      zx: X(0).toFixed(2), ry: Y(rootApy || 0).toFixed(2), even, loss: even + ' L' + X(0).toFixed(2) + ' 100 L0 100 Z',
      yt: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: f * 100, l: Math.round(f * YMAX) + '%' })),
      xt: [-50, -25, 0, 25, 50].map((v) => ({ x: X(v), l: sgn(v, 0) })),
      clip: (() => { const n = all.filter((x) => x.px == null || x.px < XMIN || x.px > XMAX || x.apy > YMAX).length; return n ? n + ' subnets past the edges are pinned to them' : ''; })(),
      dots: all.slice().sort((a, b) => b.tao - a.tao).map((x) => {
        const sz = Math.max(6, Math.min(30, Math.sqrt(x.tao) / 14)), t = top.has(x.nu), up = x.net != null && x.net > rootRet;
        return { x: X(x.px || 0).toFixed(2), y: Y(x.apy).toFixed(2), s: sz.toFixed(0), h: (sz / 2).toFixed(1),
          fill: t ? accent : up ? 'rgba(61,219,176,0.22)' : 'rgba(255,138,128,0.18)', stroke: t ? '#E6EDF3' : up ? 'rgba(61,219,176,0.6)' : 'rgba(255,138,128,0.5)',
          tip: 'SN' + x.nu + ' ' + x.name + ': rewards ' + pct(x.apy, 0) + ' APY, price ' + sgn(x.px) + ', net ' + sgn(x.net) + ' in τ, ' + fmtK(x.tao) + ' τ staked',
          pick: () => this.pickSubnet(x.nu) };
      }),
    };
    // table
    const q = S.spQ.trim().toLowerCase().replace(/^sn\s*/, '');
    let list = all.filter((x) => x.tao >= S.spDepth && (!S.spThin || x.nref >= 3) && (!q || String(x.nu) === q || String(x.nu).startsWith(q) || (x.name || '').toLowerCase().includes(q)));
    const COLS = [
      ['rank', '#', 'Rank for “' + SP_MODES[S.spMode].label + '”', 'start'], [null, 'Subnet', '', 'start'],
      ['apy', 'Rewards APY', 'What the best pools paid, annualized, in alpha', 'end'], ['rew', 'Rewards ' + wl, 'Rewards over the window, not annualized', 'end'],
      ['px', 'Price ' + wl, 'Alpha price against τ', 'end'], ['net', 'Net in τ ' + wl, 'Rewards plus price move', 'end'], ['net', 'vs Root', 'Net in τ minus what Root paid', 'end'],
      ['tao', 'Alpha staked', 'All alpha staked on the subnet, valued in τ', 'end'], ['tao', 'Your share', 'Your stake as a share of all alpha staked there', 'end'], [null, 'Best validator', 'Grade A, 1,000 τ or more, lowest fee', 'start'],
    ];
    const val = { rank: (x) => (rankOf.has(x.nu) ? -rankOf.get(x.nu) : -1e6), apy: (x) => x.apy, rew: (x) => x.rew, px: (x) => x.px, net: (x) => x.net, tao: (x) => x.tao };
    const sk = S.spSort || 'rank', dir = S.spSort ? S.spDir : -1;
    list = list.slice().sort((a, b) => { const p = val[sk](a), r = val[sk](b); if (p == null && r == null) return 0; if (p == null) return 1; if (r == null) return -1; return (p - r) * dir; });
    const shown = S.spAll ? list : list.slice(0, SP_PAGE);
    const rows = shown.map((x) => {
      const rk = rankOf.get(x.nu), sh = share(x);
      return {
        rank: rk || '—', rankColor: rk && rk <= 3 ? accent : '#6B7684', bg: top.has(x.nu) ? '#0F1A17' : 'transparent', av: this.ava(x.s.logo, 'SN' + x.nu, x.name),
        aria: 'SN' + x.nu + ' ' + x.name + ', rewards ' + pct(x.apy, 0) + ' APY, net ' + sgn(x.net) + ' in τ over ' + wl + ': see its validators',
        sn: 'SN' + x.nu, name: x.name, tags: tags(x).slice(0, 2), apy: pct(x.apy, 0), rew: sgn(x.rew), px: sgn(x.px), pxColor: col(x.px),
        net: sgn(x.net), netColor: col(x.net), vs: x.net == null ? '—' : sgn(x.net - rootRet), vsColor: x.net != null && x.net >= rootRet ? GREEN : RED,
        tao: fmtK(x.tao), share: sh >= 0.01 ? sh.toFixed(2) + '%' : '< 0.01%', shareColor: sh >= 1 ? ORANGE : '#A9B4C2', shareTip: fmtInt(amt) + ' τ would be ' + sh.toFixed(2) + '% of the pool',
        bv: x.bv ? x.bv.name : '—', bvSub: bvSub(x.bv), pick: () => this.pickSubnet(x.nu),
      };
    });
    const seg = (on2) => ({ bg: on2 ? accent : 'transparent', fg: on2 ? '#0A0E13' : '#A9B4C2' });
    const box = (on2) => ({ box: on2 ? accent : '#3A4656', bg: on2 ? accent : 'transparent', fg: on2 ? '#E6EDF3' : '#A9B4C2', mark: on2 ? '✓' : '' });
    return Object.assign(step, {
      winLbl: wl, amtTxt: fmtInt(amt), facts, modeNote: SP_MODES[S.spMode].note, hasWins,
      wins: [7, 30].map((v) => Object.assign(seg(w === v), { label: v + 'D', on: w === v, pick: () => this.setState({ spW: v }) })),
      modes: Object.keys(SP_MODES).map((k) => Object.assign(seg(S.spMode === k), { label: SP_MODES[k].label, on: S.spMode === k, pick: () => this.setState({ spMode: k, spSort: null }) })),
      root: { ret: sgn(rootRet, 2), apy: pct(rootApy, 1), tao: (amt * rootRet / 100).toFixed(2) },
      picksTitle: 'Top 3 · ' + SP_MODES[S.spMode].label.toLowerCase() + ', last ' + wl, picks, noPicks: picks.length === 0, ch,
      q: S.spQ, onQ: (e) => this.setState({ spQ: e.target.value, spAll: false }),
      depths: SP_DEPTHS.map(([v, l]) => Object.assign(seg(S.spDepth === v), { label: l, on: S.spDepth === v, pick: () => this.setState({ spDepth: v, spAll: false }) })),
      hideThin: S.spThin, thin: box(S.spThin), toggleThin: () => this.setState({ spThin: !S.spThin, spAll: false }),
      grid: '36px minmax(220px, 1.6fr) 96px 92px 84px 104px 80px 104px 84px minmax(160px, 1fr)',
      cols: COLS.map(([k, label, tip, js]) => {
        const isOn = !!k && sk === k && (k !== 'net' || label !== 'vs Root') && (k !== 'tao' || label !== 'Your share');
        return { label, tip, js, al: js === 'end' ? 'right' : 'left', color: isOn ? '#E6EDF3' : '#8B97A6', on: isOn, arrow: isOn && S.spSort ? (S.spDir < 0 ? ' ↓' : ' ↑') : '',
          aria: k ? 'Sort subnets by ' + label : label,
          pick: k ? () => this.setState({ spSort: k === 'rank' ? null : k, spDir: S.spSort === k ? -S.spDir : -1, spAll: false }) : null };
      }),
      rows, noRows: rows.length === 0, hasMore: !S.spAll && list.length > SP_PAGE, total: list.length, showAll: () => this.setState({ spAll: true }),
      countTxt: list.length + ' of ' + all.length + ' subnets',
    });
  }

  // searchable subnet picker (combobox + listbox)
  snPicker(subs, cur, accent) {
    const S = this.state;
    const matches = matchSubnets(subs, S.snQ);
    const act = Math.min(S.snAct, Math.max(0, matches.length - 1));
    const scrollAct = () => {
      if (typeof window === 'undefined') return;
      window.requestAnimationFrame(() => { const el = document.getElementById('ch-sn-o' + this.state.snAct); if (el) el.scrollIntoView({ block: 'nearest' }); });
    };
    const move = (d) => {
      const n = matches.length;
      if (!n) return;
      this.setState({ snOpen: true, snAct: S.snOpen ? (act + d + n) % n : (d > 0 ? 0 : n - 1) });
      scrollAct();
    };
    return {
      snCur: cur ? { sn: 'SN' + cur.nu, av: this.ava(cur.logo, 'SN' + cur.nu, cur.name) } : null,
      snPh: cur ? cur.name + ' — search by number or name' : 'Search subnets — number or name',
      snQ: S.snQ, snOpen: S.snOpen, snBorder: S.snOpen ? accent : '#1C232D',
      snActId: S.snOpen && matches.length ? 'ch-sn-o' + act : '',
      onSnQ: (e) => this.setState({ snQ: e.target.value, snOpen: true, snAct: 0 }),
      openSn: () => { if (!this.state.snOpen) this.setState({ snOpen: true, snAct: 0 }); },
      closeSn: () => this.setState({ snOpen: false, snQ: '', snAct: 0 }),
      snKey: (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (S.snOpen && matches[act]) this.pickSubnet(matches[act].nu); else this.setState({ snOpen: true }); }
        else if (e.key === 'Escape') { if (S.snOpen || S.snQ) { e.preventDefault(); this.setState({ snOpen: false, snQ: '', snAct: 0 }); } }
        else if (e.key === 'Home' && S.snOpen) { e.preventDefault(); this.setState({ snAct: 0 }); scrollAct(); }
        else if (e.key === 'End' && S.snOpen) { e.preventDefault(); this.setState({ snAct: Math.max(0, matches.length - 1) }); scrollAct(); }
      },
      snMatches: matches.map((s, i) => ({
        id: 'ch-sn-o' + i, act: i === act, bg: i === act ? '#151C26' : 'transparent',
        sn: 'SN' + s.nu, snC: cur && s.nu === cur.nu ? accent : '#A9B4C2', name: s.name,
        av: this.ava(s.logo, 'SN' + s.nu, s.name),
        best: s.best != null ? Math.round(s.best) + '% APY' : 'not graded',
        dp: s.dp30 != null ? sgn(s.dp30, 1) : '—',
        // mousedown (not click) so the pick happens before the input's blur closes the list
        pick: (e) => { if (e) e.preventDefault(); this.pickSubnet(s.nu); },
      })),
      snNone: matches.length === 0, snNoneTxt: 'No subnet matches “' + S.snQ.trim() + '”.',
    };
  }

  detail(D, accent) {
    const S = this.state, V = S.det;
    if (S.detErr) return { failed: true, err: S.detErr };
    if (!V) return { loading: true };
    const locs = V.locs || [];
    if (!locs.length) return { failed: true, err: 'No graded stake for this validator yet.' };
    let li = S.loc;
    if (li == null) {
      const want = S.wantNu;
      li = want != null ? locs.findIndex((l) => l.nu === want) : 0;
      if (li < 0) li = 0;
    }
    const L = locs[Math.min(li, locs.length - 1)];
    const isRoot = L.kind === 'root';
    const G = GRADE[L.g];
    const rootBench = D ? D.root.bench : null;
    const best = isRoot ? rootBench : L.bench;
    const where = isRoot ? 'root' : L.label + (L.sname ? ' ' + L.sname : '');

    const verdict = [];
    if (L.g === 'F') verdict.push(Object.assign({ text: 'Earned nothing for stakers on ' + where + ' over the last 30 days. Stake elsewhere.' }, BAD));
    else if (L.pr != null) {
      const p = Math.round(L.pr);
      verdict.push(Object.assign({ text: 'Pays ' + p + '% of what the best validators on ' + where + ' pay' + (isRoot ? ' (30-day APY vs the top 3).' : ' (after fees, weaker of 7D and 30D, this one left out).') }, p >= 95 ? OK : p >= 85 ? INFO : WARN));
    } else verdict.push(Object.assign({ text: 'Not enough comparable data to grade on ' + where + ' yet.' }, INFO));
    if (L.fee >= 15) verdict.push(Object.assign({ text: 'High fee: keeps ' + pct(L.fee, 1) + ' of rewards. Most of the gap to the best comes from this.' }, WARN));
    if (isRoot) {
      if (L.hit != null) verdict.push(Object.assign({ text: 'Paid at least 90% of the best on ' + Math.round(L.hit) + '% of the last 30 days.', faq: L.hit >= 67 ? null : '/faq#unstable' }, L.hit >= 67 ? OK : WARN));
    } else if (L.pr7 != null && L.pr30 != null && L.g !== 'F') {
      const unstable = (L.b || []).includes('Unstable');
      verdict.push(Object.assign({ text: (unstable ? 'Unsteady: ' : 'Steady: ') + '7-day payout ' + Math.round(L.pr7) + '%, 30-day ' + Math.round(L.pr30) + '% of the best.', faq: unstable ? '/faq#unstable' : null }, unstable ? WARN : OK));
    }
    if (!isRoot && L.kind30 === 'thin') verdict.push(Object.assign({ text: 'Few large validators on ' + L.label + ', so this comparison is rough.' }, INFO));

    // what 30 days here returned in τ: the 30-day reward growth (un-annualized APY) times the alpha price move
    const net30 = isRoot || L.a30 == null || L.dp30 == null ? null : ((L.g === 'F' ? 1 : Math.pow(1 + L.a30 / 100, 30 / 365)) * (1 + L.dp30 / 100) - 1) * 100;
    const kpis = [
      { label: 'You earn · APY 30D', value: L.g === 'F' ? '0%' : pct(L.a30, isRoot ? 2 : 1), sub: isRoot ? 'in τ · best here ' + pct(rootBench, 2) : '7D ' + pct(L.a7, 1) + ' · in alpha', color: L.g === 'F' ? '#FF8A80' : '#E6EDF3', tip: isRoot ? 'Yearly yield in τ after fees' : 'Yearly yield in this subnet’s alpha after fees; price moves not included', faq: '/faq#apy' },
    ].concat(isRoot ? [
      { label: 'Days at 90%+ of best', value: L.hit == null ? '—' : Math.round(L.hit) + '%', sub: 'an A needs 67% or more', color: L.hit == null ? '#E6EDF3' : L.hit >= 67 ? accent : '#F5A524', tip: 'Share of the last 30 days this validator paid at least 90% of the best root validators', faq: '/faq#grades' },
    ] : [
      { label: 'Net in τ · 30D', value: sgn(net30, 1), sub: 'rewards + alpha price ' + sgn(L.dp30, 1), color: net30 == null ? '#E6EDF3' : net30 >= 0 ? accent : '#FF8A80', tip: 'What 30 days here returned in τ, not annualized', faq: '/faq#net' },
      { label: 'Payout vs best', value: L.g === 'F' ? '0%' : L.pr == null ? '—' : Math.min(100, Math.round(L.pr)) + '%', sub: L.rank ? '#' + L.rank + ' of ' + L.of + ' on ' + L.label : 'best here ' + pct(L.bench, 1), color: G ? G.fg : '#E6EDF3', tip: 'Daily yield ÷ the best validators’ daily yield here, leaving this one out', faq: '/faq#payout' },
    ]).concat([
      { label: 'Total fee', value: pct(L.fee, 1), sub: L.ck > 0.05 ? 'take ' + pct(L.take, 0) + ' + childkey ' + pct(L.ck, 1) : 'already inside the APY', color: L.fee >= 15 ? '#F5A524' : '#E6EDF3', tip: 'Validator take plus any childkey take', faq: '/faq#fee' },
      { label: isRoot ? 'Root stake' : 'Alpha stake here', value: fmtInt(L.stake) + ' τ', sub: isRoot ? '' : 'valued in τ at today’s price', color: '#E6EDF3', tip: '', faq: '' },
    ]);

    let bars, chartNote;
    const H = 150, top = 120;
    const mk = (label, v) => {
      const c = v == null ? '#2A3340' : v >= 95 ? accent : v >= 85 ? '#8FB0FF' : v >= 70 ? '#E8C35A' : '#F5A524';
      return { label, txt: v == null ? '—' : Math.round(v) + '%', h: v == null ? '4px' : Math.max(4, Math.min(v, top) / top * H) + 'px', color: c };
    };
    if (isRoot) {
      const per = L.per || [];
      const n = per.length, step = n > 8 ? 2 : 1;
      bars = per.map((v, i) => mk(i === n - 1 ? 'last 7D' : (n - 1 - i) % step ? '' : (n - 1 - i) * 7 + 'D ago', v));
      chartNote = 'each bar: the 7 days ending on that day, yield ÷ best root validators';
    } else {
      bars = [mk('30 days', L.pr30), mk('last 7 days', L.pr7)];
      chartNote = 'longer history appears as data builds up';
    }

    const amt = parseFloat(String(S.amtD).replace(/,/g, '')) || 0;
    const unit = isRoot ? ' τ' : ' α';
    const yr = L.g === 'F' ? 0 : L.a30 == null ? null : amt * L.a30 / 100;
    const gap = best != null && L.a30 != null ? amt * (best - L.a30) / 100 : null;
    const px = (S.px || PRICE_SNAPSHOT).c;

    // tabs: the first few places plus the selected one; the full list is in "Where it operates"
    const tabIdx = locs.map((_, i) => i).filter((i) => i < TABS || i === li);
    const tabOf = (i) => {
      const l = locs[i], on = i === li, g = GRADE[l.g];
      return { label: l.label, title: l.kind === 'root' ? 'Root' : l.label + (l.sname ? ' · ' + l.sname : ''), av: l.kind === 'root' ? null : this.ava(l.logo, l.label, l.sname || l.label),
        grade: l.g || '—', gFg: g ? g.fg : '#8B97A6', on, border: on ? accent : '#1C232D', bg: on ? '#0F1A17' : '#0E131A', fg: on ? '#E6EDF3' : '#A9B4C2', pick: () => this.pickLoc(i) };
    };
    const placesAll = locs.map((l, i) => {
      const g = GRADE[l.g];
      return {
        label: l.label, sname: l.sname || (l.kind === 'root' ? 'principal in τ' : ''), grade: l.g || '—', gFg: g ? g.fg : '#8B97A6',
        isSn: l.kind !== 'root', isRoot: l.kind === 'root', av: l.kind === 'root' ? null : this.ava(l.logo, l.label, l.sname || l.label),
        apy: l.g === 'F' ? '0%' : pct(l.a30, l.kind === 'root' ? 2 : 1), pr: l.g === 'F' ? '0%' : l.pr == null ? '—' : Math.min(100, Math.round(l.pr)) + '%',
        fee: pct(l.fee, 1), feeColor: l.fee >= 15 ? '#F5A524' : '#E6EDF3', stake: fmtK(l.stake) + ' τ',
        on: i === li, bg: i === li ? '#111A1F' : 'transparent', pick: () => { this.pickLoc(i); if (window.scrollTo) window.scrollTo(0, 0); },
      };
    });
    // "Where it operates" sorts like the list tables; the location tabs above keep their order
    const pOrder = this.sortBy2(locs.map((l, i) => i), (i) => locs[i], S.pSortKey, S.pSortDir);
    const placesSorted = pOrder.map((i) => placesAll[i]);
    const places = S.allPlaces ? placesSorted : placesSorted.slice(0, PLACES);
    const ps = this.sortHeads(S.pSortKey, S.pSortDir, accent, (k) => {
      if (S.pSortKey === k) this.setState({ pSortDir: -S.pSortDir });
      else this.setState({ pSortKey: k, pSortDir: 1 });
    });
    const pmsortOpts = [{ v: '', label: 'Default order' }];
    Object.keys(SORTS).forEach((k) => { pmsortOpts.push({ v: k + ':1', label: SORTS[k].label + ' · ' + SORTS[k].word[0] }); pmsortOpts.push({ v: k + ':-1', label: SORTS[k].label + ' · ' + SORTS[k].word[1] }); });
    const ngraded = locs.filter((l) => l.g).length;

    return {
      ready: true,
      name: V.n, av: this.ava(V.img, V.hk, V.n),
      grade: L.g || '—', gBg: G ? G.bg : '#1A212B', gFg: G ? G.fg : '#8B97A6', gTip: G ? G.tip : 'Not graded yet',
      locLabel: L.label, locLong: where, feeTxt: pct(L.fee, 1), nomTxt: V.nom != null ? fmtInt(V.nom) + ' nominators' : '',
      hk: V.hk, copyTxt: S.copied === 'ok' ? 'Copied' : S.copied === 'fail' ? 'Copy failed: select the key' : 'Copy',
      copy: () => this.copyHk(V.hk),
      tabs: tabIdx.map(tabOf), moreLocs: locs.length > tabIdx.length ? locs.length - tabIdx.length : 0,
      vBorder: G ? G.fg : '#1C232D', verdict, kpis, showChart: isRoot,
      bars, barGap: bars.length > 8 ? '4px' : '10px', barFont: bars.length > 8 ? '10px' : '12px',
      line90: (90 / top * H + 1) + 'px', chartNote,
      chartAria: 'Payout vs best: ' + bars.map((b) => (b.label || '') + ' ' + b.txt).join(', '),
      amt: S.amtD, onAmt: (e) => this.setState({ amtD: e.target.value }),
      calcYear: yr == null ? '—' : fmtInt(yr) + unit, calcMonth: yr == null ? '—' : fmtInt(yr / 12) + unit,
      calcVs: (gap == null ? '' : gap > 0.5 ? 'The best validators here would pay about ' + fmtInt(gap) + unit + ' more a year on the same stake.' : 'On par with the best validators here.') + (yr == null ? 'No 30-day yield yet, so no estimate.' : '') + (isRoot && yr > 0 ? ' About ' + usd(yr * px) + ' a year at today’s TAO price.' : ''),
      calcNote: 'Based on the 30-day APY.',
      places, placesMore: !S.allPlaces && placesAll.length > places.length, placesTotal: placesAll.length,
      ps, pmsortOpts, pmsortVal: S.pSortKey ? S.pSortKey + ':' + S.pSortDir : '',
      pickPmsort: (e) => { const v = e.target.value; if (!v) this.setState({ pSortKey: null, pSortDir: 1 }); else { const [k, d] = v.split(':'); this.setState({ pSortKey: k, pSortDir: +d }); } },
      showAllPlaces: () => this.setState({ allPlaces: true }),
      // a button, not an #anchor: the hash is the route (#v/<hk>), so changing it would leave the page
      goPlaces: () => {
        this.setState({ allPlaces: true });
        if (typeof window !== 'undefined') window.requestAnimationFrame(() => window.requestAnimationFrame(() => { const el = document.getElementById('places'); if (el) el.scrollIntoView({ behavior: REDUCED() ? 'auto' : 'smooth', block: 'start' }); }));
      },
      placesNote: locs.length + (locs.length === 1 ? ' place' : ' places') + ', ' + ngraded + ' graded · pools of 10 τ or more',
    };
  }

  pickLoc(i) {
    this.setState({ loc: i });
    const V = this.state.det, l = V && V.locs[i];
    if (!l) return;
    const h = '#v/' + V.hk + (l.nu != null ? '/' + l.nu : '');
    try { if (window.location.hash !== h) window.history.replaceState(window.history.state, '', h); } catch (e) { /* ignore */ }
  }
}
DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {});
