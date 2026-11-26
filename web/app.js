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
  'Unstable': { bg: '#2E2814', fg: '#E8C35A', tip: 'Its 7-day and 30-day payout differ by more than 15 points' },
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

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      data: null, err: null, mode: 'root', sn: null, q: '', snQ: '', snOpen: false, snAct: 0, grade: 'all', hideWarn: false, all: false, calcHk: null, amt: '1,000',
      view: 'list', hk: null, wantNu: null, det: null, detErr: null, loc: null, amtD: '1,000', copied: null, allPlaces: false,
      px: null, pxLive: false, pxDir: 0, sortKey: null, sortDir: 1, badImg: 0,
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
    this.setState({ view: 'detail', hk, wantNu: nu, loc: null, copied: null, allPlaces: false, det: same ? this.state.det : null, detErr: null });
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

    let all = this.rowsFor(D, alpha, sn);
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
      return {
        name: r.name, hkShort: short(r.hk), av: this.ava(r.img, r.hk, r.name), grade: r.g || '—', gBg: G ? G.bg : '#1A212B', gFg: G ? G.fg : '#8B97A6',
        gradeTip: G ? G.tip : 'Not graded yet',
        badges: r.b.map((b) => Object.assign({ label: b }, BADGE[b] || { bg: '#1A212B', fg: '#A9B4C2', tip: '' })),
        earn: F ? 'Not earning' : pct(r.a30, alpha ? 1 : 2), earnShort: F ? '0%' : pct(r.a30, alpha ? 1 : 2), earn7: pct(r.a7, alpha ? 1 : 2), earnColor: F ? '#FF8A80' : '#E6EDF3',
        payout: pr == null ? '—' : Math.round(pr) + '%', barW: pr == null ? '0%' : Math.min(100, pr) + '%', barC, payC: pr == null ? '#8B97A6' : barC,
        fee: pct(r.fee, 1), feeColor: r.fee >= 15 ? '#F5A524' : '#E6EDF3',
        feeSub: r.ck > 0.05 ? 'take ' + pct(r.take, 0) + ' + childkey ' + pct(r.ck, 1) : 'take only',
        stake: fmtK(r.stake) + ' τ', stakeSub: r.stakeSub,
        cardSub: 'fee ' + pct(r.fee, 1) + ' · ' + fmtK(r.stake) + ' τ' + (r.b.length ? ' · ' + r.b.join(', ') : ''),
        cardSubColor: r.fee >= 15 || hasWarn(r.b) ? '#F5A524' : '#8B97A6',
        href, aria: r.name + ', grade ' + (r.g || 'not graded') + ', earns ' + (F ? 'nothing' : pct(r.a30, 1)) + ', fee ' + pct(r.fee, 1),
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
        { label: 'Best APY · 30D', value: pct(cur.best, 1), sub: 'in alpha, median of the top 3', color: accent, tip: 'What the best validators here paid stakers, in alpha' },
        { label: 'Alpha price · 30D', value: sgn(cur.dp30, 1), sub: 'same for every validator here', color: '#A9B4C2', tip: 'Change of this alpha against τ. Not caused by validators.' },
        { label: 'Net in τ · 30D', value: sgn(cur.net30, 1), sub: 'best validator, rewards + price', color: '#A9B4C2', tip: 'What staking with the best validator here returned in τ over 30 days, not annualized' },
        { label: 'Validators', value: fmtInt(cur.nv), sub: 'with 10 τ or more', color: '#E6EDF3', tip: '' },
      ];
      sumNote = !cur.nbest ? 'Not graded yet: no pool of 100 τ or more has earned over 30 days here.'
        : cur.nbest < 3 ? 'Few large validators on this subnet, so grades here compare against smaller pools and are rougher.' : '';
    } else if (alpha) {
      sumKicker = 'Subnet'; sumTitle = 'No subnet data yet'; sumStats = [];
    } else {
      const graded = D.root.rows.filter((r) => r.g).length;
      sumKicker = 'Root';
      sumTitle = 'Principal stays in τ';
      sumStats = [
        { label: 'Best APY · 30D', value: pct(D.root.bench, 2), sub: 'median of the top 3', color: accent, tip: 'What the best root validators paid, in τ, after fees' },
        { label: 'Graded validators', value: fmtInt(graded), sub: '1,000 τ or more, 21+ days', color: '#E6EDF3', tip: '' },
        { label: 'Price risk', value: 'None on principal', sub: 'rewards paid as basket alpha', color: '#A9B4C2', tip: 'Your staked τ stays τ; the alpha you earn can change in value' },
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
    Object.keys(SORTS).forEach((k) => { msortOpts.push({ v: k + ':1', label: SORTS[k].label + ' · ' + SORTS[k].word[0] }); msortOpts.push({ v: k + ':-1', label: SORTS[k].label + ' · ' + SORTS[k].word[1] }); });
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
      pickAlpha: () => this.setState({ mode: 'alpha', all: false, calcHk: null, grade: 'all' }),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value, all: false }),
      hideWarn: S.hideWarn, toggleWarn: () => this.setState({ hideWarn: !S.hideWarn, all: false }),
      warnBorder: S.hideWarn ? accent : '#1C232D', warnFg: S.hideWarn ? accent : '#A9B4C2',
      amt: S.amt, onAmt: (e) => this.setState({ amt: e.target.value }),
      showAll: () => this.setState({ all: true }),
      clearFilters: () => this.setState({ q: '', grade: 'all', hideWarn: false, all: false }),
      earnTip: alpha ? 'Yearly yield in this subnet’s alpha, after all fees, from the last 30 days. Alpha price moves are not included.' : 'Yearly yield in τ after all fees, from the last 30 days.',
      rootBench: D.root.bench == null ? '—' : D.root.bench.toFixed(1),
      alphaRange: bests.length ? Math.round(med(bests)) + '% median APY' : '—', medDp: sgn(med(dps), 1),
      ...this.snPicker(subs, cur, accent),
      snHint,
      sumKicker, sumTitle, sumStats, sumNote,
      gradeChips, rows, noRows: rows.length === 0,
      noRowsTxt: q ? 'No validator matches “' + S.q.trim() + '” here.' : 'No validator matches these filters.',
      more: !S.all && total > shown.length, total,
      hasCalc: !!calcRow, calc, calcOpts, pickCalc: (e) => this.setState({ calcHk: e.target.value }),
      priceFoot: alpha ? 'Alpha APY is paid in alpha; the alpha price line above shows what that alpha did against τ.' : 'Root APY is paid as basket alpha valued at today’s price.',
    };
  }

  pickSubnet(nu) {
    this.setState({ mode: 'alpha', sn: nu, snQ: '', snOpen: false, snAct: 0, q: '', all: false, calcHk: null, grade: 'all' });
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
      verdict.push(Object.assign({ text: 'Pays ' + p + '% of what the best validators on ' + where + ' pay (after fees, weaker of 7D and 30D).' }, p >= 95 ? OK : p >= 85 ? INFO : WARN));
    } else verdict.push(Object.assign({ text: 'Not enough comparable data to grade on ' + where + ' yet.' }, INFO));
    const feeLine = 'Fee ' + pct(L.fee, 1) + (L.ck > 0.05 ? ' (take ' + pct(L.take, 0) + ' + childkey ' + pct(L.ck, 1) + ')' : ' (validator take only)');
    verdict.push(Object.assign({ text: L.fee >= 15 ? 'High fee: ' + feeLine + '. Most of the gap to the best comes from this.' : feeLine + '.' }, L.fee >= 15 ? WARN : OK));
    if (isRoot) {
      if (L.hit != null) verdict.push(Object.assign({ text: 'Paid at least 90% of the best on ' + Math.round(L.hit) + '% of days.' }, L.hit >= 67 ? OK : WARN));
    } else if (L.pr7 != null && L.pr30 != null && L.g !== 'F') {
      const unstable = (L.b || []).includes('Unstable');
      verdict.push(Object.assign({ text: (unstable ? 'Unsteady: ' : 'Steady: ') + '7-day payout ' + Math.round(L.pr7) + '%, 30-day ' + Math.round(L.pr30) + '% of the best.' }, unstable ? WARN : OK));
    }
    if (!isRoot && L.kind30 === 'thin') verdict.push(Object.assign({ text: 'Few large validators on ' + L.label + ', so this comparison is rough.' }, INFO));
    if (!isRoot) verdict.push(Object.assign({ text: 'Alpha price on ' + L.label + ': ' + sgn(L.dp30, 1) + ' against τ over 30 days. The same for every validator there, not caused by this one.' }, INFO));
    else verdict.push(Object.assign({ text: 'Your principal stays in τ. Rewards arrive as basket alpha valued at today’s price.' }, INFO));

    const kpis = [
      { label: 'You earn · APY 30D', value: L.g === 'F' ? '0%' : pct(L.a30, isRoot ? 2 : 1), sub: '7D ' + pct(L.a7, isRoot ? 2 : 1) + (isRoot ? ' · in τ' : ' · in alpha'), color: L.g === 'F' ? '#FF8A80' : '#E6EDF3', tip: isRoot ? 'Yearly yield in τ after fees' : 'Yearly yield in this subnet’s alpha after fees; price moves not included' },
      { label: 'Payout vs best', value: L.g === 'F' ? '0%' : L.pr == null ? '—' : Math.round(L.pr) + '%', sub: isRoot ? 'best here ' + pct(rootBench, 2) + ' APY' : (L.rank ? '#' + L.rank + ' of ' + L.of + ' on ' + L.label : 'best here ' + pct(L.bench, 1)), color: G ? G.fg : '#E6EDF3', tip: 'Compared with the best validators here, leaving this one out' },
      { label: 'Total fee', value: pct(L.fee, 1), sub: L.ck > 0.05 ? 'take ' + pct(L.take, 0) + ' + childkey ' + pct(L.ck, 1) : 'take ' + pct(L.take, 0) + ', no childkey', color: L.fee >= 15 ? '#F5A524' : '#E6EDF3', tip: 'Everything the validator keeps' },
      { label: isRoot ? 'Root stake' : 'Alpha stake here', value: fmtInt(L.stake) + ' τ', sub: isRoot ? (V.nom != null ? fmtInt(V.nom) + ' nominators' : '') : 'valued in τ at today’s price', color: '#E6EDF3', tip: '' },
    ];

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
      chartNote = 'each bar: 7-day yield ÷ best root validators';
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
        apy: l.g === 'F' ? '0%' : pct(l.a30, l.kind === 'root' ? 2 : 1), pr: l.g === 'F' ? '0%' : l.pr == null ? '—' : Math.round(l.pr) + '%',
        fee: pct(l.fee, 1), feeColor: l.fee >= 15 ? '#F5A524' : '#E6EDF3', stake: fmtK(l.stake) + ' τ',
        on: i === li, bg: i === li ? '#111A1F' : 'transparent', pick: () => { this.pickLoc(i); if (window.scrollTo) window.scrollTo(0, 0); },
      };
    });
    const places = S.allPlaces ? placesAll : placesAll.slice(0, PLACES);
    const ngraded = locs.filter((l) => l.g).length;

    return {
      ready: true,
      name: V.n, av: this.ava(V.img, V.hk, V.n),
      grade: L.g || '—', gBg: G ? G.bg : '#1A212B', gFg: G ? G.fg : '#8B97A6', gTip: G ? G.tip : 'Not graded yet',
      locLabel: L.label, locLong: where, feeTxt: pct(L.fee, 1), nomTxt: V.nom != null ? fmtInt(V.nom) + ' nominators' : '',
      hk: V.hk, copyTxt: S.copied === 'ok' ? 'Copied' : S.copied === 'fail' ? 'Copy failed: select the key' : 'Copy',
      copy: () => this.copyHk(V.hk),
      tabs: tabIdx.map(tabOf), moreLocs: locs.length > tabIdx.length ? locs.length - tabIdx.length : 0,
      vBorder: G ? G.fg : '#1C232D', verdict, kpis,
      bars, barGap: bars.length > 8 ? '4px' : '10px', barFont: bars.length > 8 ? '10px' : '12px',
      line90: (90 / top * H + 1) + 'px', chartNote,
      chartAria: 'Payout vs best: ' + bars.map((b) => (b.label || '') + ' ' + b.txt).join(', '),
      amt: S.amtD, onAmt: (e) => this.setState({ amtD: e.target.value }),
      calcYear: yr == null ? '—' : fmtInt(yr) + unit, calcMonth: yr == null ? '—' : fmtInt(yr / 12) + unit,
      calcVs: (gap == null ? '' : gap > 0.5 ? 'The best validators here would pay about ' + fmtInt(gap) + unit + ' more a year on the same stake.' : 'On par with the best validators here.') + (yr == null ? 'No 30-day yield yet, so no estimate.' : '') + (isRoot && yr > 0 ? ' About ' + usd(yr * px) + ' a year at today’s TAO price.' : ''),
      calcNote: isRoot ? 'Based on the 30-day APY. Rewards arrive as basket alpha; their τ value moves with alpha prices.' : 'Based on the 30-day APY, paid in alpha. What that alpha is worth in τ depends on the subnet’s price.',
      places, placesMore: !S.allPlaces && placesAll.length > places.length, placesTotal: placesAll.length,
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
