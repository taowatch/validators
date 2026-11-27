// Generated from design/TerminalFAQ.dc.html by tools/dc2web.py — edit the design, then rerun.
// One list for /faq and /terminal/faq; ids are the #anchors other pages link to ("?" next to columns).
const FAQ = [
  { id: 'apy', g: 'yield', q: 'What is APY here?', a: 'The reward yield a staker received over the window, valued in τ at today’s price and annualized. Every fee is already taken out, so it is what you actually get.', ex: '30D APY = (1 + 30-day yield)^(365/30) − 1' },
  { id: 'price', g: 'yield', q: 'Why doesn’t APY include the alpha price move?', a: 'Annualizing a price move turns noise into absurd numbers: +24% in a month would read as ~1,300% a year. Price is shown separately, and the τ return below combines both without annualizing.' },
  { id: 'net', g: 'yield', q: 'What is “Net in τ · 30D”?', a: 'What 30 days of staking returned in τ: alpha rewards plus the change in the alpha price, not annualized. It can be negative when the alpha price fell more than the rewards paid.', ex: 'net = (1 + reward growth) × (1 + price change) − 1' },
  { id: 'root', g: 'yield', q: 'Root or a subnet?', a: 'On Root your principal stays in τ and rewards come as a basket of subnet alpha, so there is no price risk on what you staked. In a subnet your principal is that subnet’s alpha, so it moves with its price; yields are usually higher.' },
  { id: 'best', g: 'grades', q: 'What is “the best” a validator is compared with?', a: 'The median of the top 3 validators in the same place. On Root: by 30-day APY, among validators with 1,000 τ or more and 21+ days of history. On a subnet: the top 3 earning pools of 100 τ or more, leaving out the validator being graded; if there are too few, pools of 10 τ or more are used and the grade is marked “Thin benchmark”.' },
  { id: 'payout', g: 'grades', q: 'What does “Payout vs best” mean?', a: 'The validator’s daily yield divided by the best validators’ daily yield in the same place. 100% means it pays as much as the best; 80% means you get a fifth less. Shown up to 100%; it can run slightly higher on a good week.' },
  { id: 'grades', g: 'grades', q: 'How are grades set?', a: 'A pays at least 95% of the best, B at least 85%, C at least 70%, D less. F means it paid nothing (APY under 0.01%). On a subnet the grade uses the weaker of the 7-day and 30-day payout. On Root it uses the 30-day APY, and an A also needs 90%+ of the best on at least 2 of every 3 recent days.' },
  { id: 'badges', g: 'grades', q: 'What do the badges mean?', a: 'Not earning: nothing reached stakers. High fee: keeps 15% or more of rewards. Unstable (subnet): 7-day and 30-day payout differ by more than 15 points. Unstable (Root): at 90%+ of the best on fewer than half of recent days. Thin benchmark: few comparable validators, so the grade is rough. New / Small: not graded yet.' },
  { id: 'ungraded', g: 'grades', q: 'Why do some validators have no grade?', a: 'On Root, validators with under 1,000 τ staked (Small) or under 21 days of history (New) are not graded. On a subnet, a pool needs enough history and a benchmark to compare with.' },
  { id: 'fee', g: 'fees', q: 'How do fees work, and why aren’t they in the grade?', a: 'The total fee is the validator’s take plus any childkey take. It is already inside the APY, so it is shown next to the grade instead of being counted twice. A total of 15% or more gets the High fee badge.', ex: 'total = 1 − (1 − take) × (1 − childkey take)' },
  { id: 'data', g: 'data', q: 'Where does the data come from, and how fresh is it?', a: 'Read directly from the Bittensor chain (finney). The latest state is sampled every hour and daily history is kept for up to 400 days. The block and time of the last read are shown at the top of each page.' },
  { id: 'windows', g: 'data', q: 'Why do some windows (90D, 180D, 365D) appear only sometimes?', a: 'Longer windows appear once that much history is stored. 1D, 7D and 30D are always there.' },
];

const idOf = () => { try { const h = decodeURIComponent((window.location.hash || '').slice(1)); return FAQ.some((f) => f.id === h) ? h : null; } catch (e) { return null; } };

function modified(e) { return !!(e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)); }
// Remember the default interface and open its FAQ, keeping the open answer.
function toDefaultUI(e) {
  if (modified(e)) return;
  if (e) e.preventDefault();
  try { localStorage.setItem('vy.ui', 'default'); } catch (err) { /* storage blocked: the link still works */ }
  window.location.href = '/faq' + window.location.hash;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const id = typeof window !== 'undefined' ? idOf() : null;
    this.state = { open: id ? [id] : ['grades', 'badges'], q: '' };
  }
  componentDidMount() {
    this.onHash = () => { const id = idOf(); if (id) this.focus(id); };
    // "/" focuses the search, Escape clears it (ignored while typing elsewhere or with modifiers)
    this.onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (e.key === '/' && !typing) { e.preventDefault(); const el = document.getElementById('tf-q'); if (el) el.focus(); }
      else if (e.key === 'Escape' && this.state.q) { this.setState({ q: '' }); }
    };
    window.addEventListener('hashchange', this.onHash);
    window.addEventListener('keydown', this.onKey);
    const id = idOf();
    if (id) this.focus(id);
  }
  componentWillUnmount() { window.removeEventListener('hashchange', this.onHash); window.removeEventListener('keydown', this.onKey); }
  focus(id) {
    const S = this.state;
    this.setState({ open: S.open.includes(id) ? S.open : S.open.concat(id), q: '' });
    window.requestAnimationFrame(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start' }); });
  }
  renderVals() {
    const S = this.state, q = S.q.trim().toLowerCase();
    const isOn = (id) => S.open.includes(id);
    const shown = FAQ.filter((f) => !q || (f.q + ' ' + f.a).toLowerCase().includes(q));
    const allOpen = S.open.length === FAQ.length;
    return {
      toDefault: (e) => toDefaultUI(e),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value }), grepArg: q ? ' | grep -i "' + S.q.trim() + '"' : '',
      none: shown.length === 0, allLabel: allOpen ? 'collapse all' : 'expand all',
      expandAll: () => this.setState({ open: allOpen ? [] : FAQ.map((f) => f.id) }),
      countTxt: shown.length + ' of ' + FAQ.length + ' entries',
      items: shown.map((f) => ({ id: f.id, aid: 'a-' + f.id, g: f.g, q: f.q.toLowerCase(), a: f.a, ex: f.ex || '', on: isOn(f.id), sign: isOn(f.id) ? '▾' : '▸', bg: isOn(f.id) ? '#0E1F15' : 'transparent',
        toggle: () => this.setState({ open: isOn(f.id) ? S.open.filter((x) => x !== f.id) : S.open.concat(f.id) }) })),
    };
  }
}
DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {});
