// Generated from design/FAQ.dc.html by tools/dc2web.py — edit the design, then rerun.
// One list for /faq and /terminal/faq; ids are the #anchors other pages link to ("?" next to columns).
const FAQ = [
  { id: 'apy', g: 'Yield', q: 'What is APY here?', a: 'The reward yield a staker received over the window, valued in τ at today’s price and annualized. Every fee is already taken out, so it is what you actually get.', ex: '30D APY = (1 + 30-day yield)^(365/30) − 1' },
  { id: 'price', g: 'Yield', q: 'Why doesn’t APY include the alpha price move?', a: 'Annualizing a price move turns noise into absurd numbers: +24% in a month would read as ~1,300% a year. Price is shown separately, and the τ return below combines both without annualizing.' },
  { id: 'net', g: 'Yield', q: 'What is “Net in τ · 30D”?', a: 'What 30 days of staking returned in τ: alpha rewards plus the change in the alpha price, not annualized. It can be negative when the alpha price fell more than the rewards paid.', ex: 'net = (1 + reward growth) × (1 + price change) − 1' },
  { id: 'root', g: 'Yield', q: 'Root or a subnet?', a: 'On Root your principal stays in τ and rewards come as a basket of subnet alpha, so there is no price risk on what you staked. In a subnet your principal is that subnet’s alpha, so it moves with its price; yields are usually higher.' },
  { id: 'best', g: 'Grades', q: 'What is “the best” a validator is compared with?', a: 'The median of the top 3 validators in the same place. On Root: by 30-day APY, among validators with 1,000 τ or more and 21+ days of history. On a subnet: the top 3 earning pools of 100 τ or more, leaving out the validator being graded; if there are too few, pools of 10 τ or more are used and the grade is marked “Thin benchmark”.' },
  { id: 'payout', g: 'Grades', q: 'What does “Payout vs best” mean?', a: 'The validator’s daily yield divided by the best validators’ daily yield in the same place. 100% means it pays as much as the best; 80% means you get a fifth less. Shown up to 100%; it can run slightly higher on a good week.' },
  { id: 'grades', g: 'Grades', q: 'How are grades set?', a: 'A pays at least 95% of the best, B at least 85%, C at least 70%, D less. F means it paid nothing (APY under 0.01%). On a subnet the grade uses the weaker of the 7-day and 30-day payout. On Root it uses the 30-day APY, and an A also needs 90%+ of the best on at least 2 of every 3 days in the last 30 days.' },
  { id: 'badges', g: 'Grades', q: 'What do the badges mean?', a: 'Not earning: nothing reached stakers. High fee: keeps 15% or more of rewards. Unstable: the payout is uneven (see below). Thin benchmark: few comparable validators, so the grade is rough. New / Small: not graded yet.' },
  { id: 'unstable', g: 'Grades', q: 'What does “Unstable” mean?', a: 'The average looks fine but the payout is uneven, so the same validator may pay less next month. On Root: it paid at least 90% of the best on fewer than half of the last 30 days. On a subnet: its 7-day and 30-day payout differ by more than 15 points, so the last week does not look like the month. It is a warning next to the grade, not part of it. Before staking, check the weekly payout bars on a Root validator’s page, or the 7-day and 30-day payout on a subnet.' },
  { id: 'ungraded', g: 'Grades', q: 'Why do some validators have no grade?', a: 'On Root, validators with under 1,000 τ staked (Small) or under 21 days of history (New) are not graded. On a subnet, a pool needs enough history and a benchmark to compare with.' },
  { id: 'fee', g: 'Fees', q: 'How do fees work, and why aren’t they in the grade?', a: 'The total fee is the validator’s take plus any childkey take. It is already inside the APY, so it is shown next to the grade instead of being counted twice. A total of 15% or more gets the High fee badge.', ex: 'total = 1 − (1 − take) × (1 − childkey take)' },
  { id: 'flows', g: 'Analytics', q: 'What are stake flows?', a: 'The change in a validator’s Root stake over the selected window: stake moving in from new or existing stakers, or moving out. It shows where stakers are going, not how well a validator pays. When history is shorter than the window, the flow covers the days that exist and shows that day count.' },
  { id: 'stability', g: 'Analytics', q: 'What is Stability (σ)?', a: 'How much the rolling 7-day APY moved over the selected window, as a standard deviation in percentage points. Lower is steadier. Days whose 7 days overlap the Nov 7–11, 2026 data pause are left out; with fewer than 5 days left it shows —.', ex: 'σ = √( average of (APY − average APY)² )' },
  { id: 'window', g: 'Analytics', q: 'Window or Range: what is the difference?', a: 'The window (Rank by, or window in Terminal) sets the period for APY, ranking, stake flows and stability, and it is the same on the Root, Alpha and Efficiency tabs. Range only sets how far back the trend charts go.' },
  { id: 'efficiency', g: 'Analytics', q: 'What are “Yield vs best” and “Gap” on the Efficiency tab?', a: 'Yield vs best compares a validator’s alpha rewards with the best pools on the same subnets, weighted by its stake; 100% matches them. Gap is what is missing: 100% minus yield vs best. A gap close to the listed take is expected, since the take is the validator’s cut. A gap well above it means stakers lose more than the take explains, often through childkey take or missed rewards. “Sets reference” means its own pool is one of the best pools, so it is partly measured against itself.', ex: 'gap = 100% − yield vs best' },
  { id: 'data', g: 'Data', q: 'Where does the data come from, and how fresh is it?', a: 'Read directly from the Bittensor chain (finney). The latest state is sampled every hour and daily history is kept for up to 400 days. The block and time of the last read are shown at the top of each page.' },
  { id: 'windows', g: 'Data', q: 'Why do some windows (90D, 180D, 365D) appear only sometimes?', a: 'Longer windows appear once that much history is stored. 1D, 7D and 30D are always there.' },
  { id: 'pause', g: 'Data', q: 'What happened on Nov 7–11, 2026?', a: 'BasketRate, the chain value Root yields are read from, stood still for those days, so Root yields from that stretch are wrong. Charts shade it and stability leaves it out. Rolling 7-day figures stay affected for up to 7 days after it.' },
];

const idOf = () => { try { const h = decodeURIComponent((window.location.hash || '').slice(1)); return FAQ.some((f) => f.id === h) ? h : null; } catch (e) { return null; } };

// Remember the Terminal interface (per viewer) and open its FAQ, keeping the open answer.
function toTerminalUI(e) {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) return;
  if (e) e.preventDefault();
  try { localStorage.setItem('vy.ui', 'terminal'); } catch (err) { /* storage blocked: the link still works */ }
  window.location.href = '/terminal/faq' + window.location.hash;
}

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const id = typeof window !== 'undefined' ? idOf() : null;
    this.state = { open: id ? [id] : ['grades'], q: '' };
  }
  componentDidMount() {
    this.onHash = () => { const id = idOf(); if (id) this.focus(id); };
    window.addEventListener('hashchange', this.onHash);
    const id = idOf();
    if (id) this.focus(id);
  }
  componentWillUnmount() { window.removeEventListener('hashchange', this.onHash); }
  // open an answer and bring it into view
  focus(id) {
    const S = this.state;
    this.setState({ open: S.open.includes(id) ? S.open : S.open.concat(id), q: '' });
    window.requestAnimationFrame(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start' }); });
  }
  renderVals() {
    const S = this.state, q = S.q.trim().toLowerCase();
    const isOn = (id) => S.open.includes(id);
    const shown = FAQ.filter((f) => !q || (f.q + ' ' + f.a).toLowerCase().includes(q));
    const names = [...new Set(FAQ.map((f) => f.g))];
    return {
      toTerminal: (e) => toTerminalUI(e),
      q: S.q, onQ: (e) => this.setState({ q: e.target.value }), none: shown.length === 0,
      groups: names.map((n) => ({ name: n, items: FAQ.filter((f) => f.g === n).map((f) => ({ q: f.q, href: '#' + f.id, fg: isOn(f.id) ? '#3DDBB0' : '#A9B4C2' })) })),
      items: shown.map((f) => ({ id: f.id, aid: 'a-' + f.id, g: f.g, q: f.q, a: f.a, ex: f.ex || '', on: isOn(f.id), sign: isOn(f.id) ? '−' : '+', bg: isOn(f.id) ? '#111821' : 'transparent',
        toggle: () => this.setState({ open: isOn(f.id) ? S.open.filter((x) => x !== f.id) : S.open.concat(f.id) }) })),
    };
  }
}
DCMount(Component, document.getElementById('tpl'), document.getElementById('app'), {});
