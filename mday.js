// Bullsburg Market Day engine: the Practice Market, shared by a whole class.
// Every device rebuilds the same market from one random seed, so charts, earnings, dividends and news match everywhere.
// The teacher's screen publishes the official prices each step; the database checks every trade against them.
// Uses the Practice Market's companies and drawing helpers from the main game (STOCKS, NEWS, drawStock, drawLine, greeksFull, ...).
(function () {
  if (typeof STOCKS === 'undefined' || typeof drawStock !== 'function') return;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = n => (n < 0 ? '−$' : '$') + Math.abs(+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sgn = n => (n >= 0 ? '+' : '−') + usd(Math.abs(n)).slice(1).replace(/^/, '$');
  const pc = n => (n >= 0 ? '+' : '−') + Math.abs(n * 100).toFixed(1) + '%';
  const R2 = v => Math.round(v * 100) / 100;
  const WEEK = 5, PRE = 130;
  const PE = { EVRY: 20, LEMN: 22, GRDN: 18, PIGB: 11, RPUP: 32, BYTC: 38, ZMTR: 85, RKTR: null };

  // The teacher's headline for each round (percent moves). Companies a headline doesn't name follow the market (EVRY) by their beta.
  const HEADS = [
    { h: 'Heat wave hits the whole country', fx: { LEMN: 12, GRDN: 3, EVRY: 1 }, why: 'Hot weather means more cold drinks sold. Investors expect higher profits for Sunny Lemonade, so they pay more for its shares.' },
    { h: 'Byte Chips beats earnings forecasts: profits up 40%', fx: { BYTC: 13, ZMTR: 2, EVRY: 1 }, why: 'Earnings are a company’s profits. When profits beat what investors expected, the stock usually jumps.' },
    { h: 'Zoomer Motors recalls 50,000 cars', fx: { ZMTR: -13, EVRY: -.5 }, why: 'A recall costs money to fix and hurts customers’ trust, so investors expect lower profits.' },
    { h: 'The central bank raises interest rates', fx: { PIGB: 5, ZMTR: -6, BYTC: -5, RKTR: -8, EVRY: -2, LEMN: -1 }, why: 'Banks earn more on loans when rates rise. Car loans get pricier, and fast-growing companies fall because their future profits are worth less today.' },
    { h: 'The central bank cuts interest rates', fx: { PIGB: -3, ZMTR: 7, BYTC: 6, RKTR: 10, EVRY: 3 }, why: 'Cheaper borrowing helps people buy cars and helps growing companies. Banks earn a little less on loans.' },
    { h: 'Recession fears: shoppers cut back', fx: { EVRY: -4, ZMTR: -9, BYTC: -7, PIGB: -6, RPUP: -9, LEMN: -2, GRDN: 1 }, why: 'In a slowdown people still buy food but put off big purchases like cars and toys. Steady companies usually fall less. Investors call them “defensive.”' },
    { h: 'Strong jobs report: 300,000 new jobs', fx: { EVRY: 3, PIGB: 4, ZMTR: 5, RPUP: 5 }, why: 'More people working means more spending and more loans. Most companies benefit when the economy is strong.' },
    { h: 'Green Garden raises its dividend', fx: { GRDN: 6 }, why: 'A dividend is cash a company pays its shareholders. A bigger dividend signals confidence and pays owners more.' },
    { h: 'Sunny Lemonade’s new flavor goes viral', fx: { LEMN: 10 }, why: 'A hit product can boost sales fast. But hype can fade, so prices built on buzz can also fall quickly.' },
    { h: 'Sugar prices jump 30%', fx: { LEMN: -7, GRDN: -5 }, why: 'When a company’s costs go up, its profit on every sale shrinks, unless it can raise prices.' },
    { h: 'A chip shortage slows car factories', fx: { ZMTR: -8, BYTC: 6, RPUP: -4 }, why: 'Short supply lets chipmakers charge more, while carmakers and toymakers can’t finish products. The same news can help one company and hurt another.' },
    { h: 'Zoomer Motors announces a cheaper model', fx: { ZMTR: 11 }, why: 'A lower price can reach many more buyers. Investors expect more sales in the future.' },
    { h: 'Piggy Bank fined for hidden fees', fx: { PIGB: -10, EVRY: -.5 }, why: 'Fines cost money and customers leave. It’s also a reminder to read your bank’s fee schedule.' },
    { h: 'New tax credit for electric cars', fx: { ZMTR: 9, BYTC: 2 }, why: 'A tax credit makes electric cars cheaper for buyers, so more people buy them.' },
    { h: 'Byte Chips’ CEO suddenly resigns', fx: { BYTC: -9 }, why: 'Surprises create uncertainty, and investors don’t like uncertainty. Prices often drop until the picture is clearer.' },
    { h: 'Food safety recall at Green Garden', fx: { GRDN: -11 }, why: 'Even a steady company can take a hit from one problem. That’s why owning many companies, diversification, matters.' },
    { h: 'Stocks rally as investors feel optimistic', fx: { EVRY: 4 }, why: 'Sometimes the whole market rises together on good mood. Riskier stocks (high beta) usually move the most, up and down.' },
    { h: 'Rumor: Byte Chips may be bought out', fx: { BYTC: 12 }, why: 'Buyouts usually happen above today’s price, so rumors push prices up. Rumors can be wrong, which makes trading on them risky.' },
    { h: 'Robo Pup’s holiday toy sells out everywhere', fx: { RPUP: 18, EVRY: .5 }, why: 'A blockbuster product can change a small company’s whole year. Small, risky companies make the biggest moves.' },
    { h: 'Rocket Rides needs to borrow more money', fx: { RKTR: -20 }, why: 'Companies losing money may need to borrow or sell new shares, which can shrink each owner’s slice. Small, unprofitable companies are the riskiest.' },
    { h: 'Rocket Rides books 1,000 space tickets', fx: { RKTR: 25 }, why: 'Big news can make a tiny company soar. But one good day doesn’t make it profitable, and these stocks can fall just as fast.' },
    { h: 'A quiet week: no big news', fx: {}, why: 'Prices still wiggle every day with no news. Trading on every small move usually doesn’t pay. Patience is a strategy too.' },
    { h: 'Cyberattack hits several banks', fx: { PIGB: -8, BYTC: 3, EVRY: -.5 }, why: 'Attacks cost banks money and trust. Companies that sell security technology can benefit.' },
    { h: 'Market sell-off: worries about the economy', fx: { EVRY: -5 }, why: 'When fear spreads, most stocks fall together. High-beta stocks fall the most. Selling in a panic usually locks in losses.' }];

  /* ---------- the shared market, rebuilt from a seed ---------- */
  function rngOf(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const memo = {};
  function build(seed, rounds, upTo) {
    const key = seed + ':' + rounds + ':' + upTo; if (memo[key]) return memo[key];
    const R = rngOf(seed), G = gaussFrom(R), end = PRE + rounds * WEEK;
    const order = STOCKS.map((s, i) => i), heads = HEADS.map((h, i) => [R(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, rounds);
    const m = { seed, rounds, start: PRE, day: 0, c: {}, earn: {}, past: {}, exdiv: {}, events: [], divs: {}, heads };
    STOCKS.forEach(s => { m.c[s.sym] = [{ o: s.p, h: s.p, l: s.p, c: s.p, v: s.vol0 }]; m.past[s.sym] = [];
      m.earn[s.sym] = s.em ? PRE + 3 + Math.floor(R() * Math.max(1, rounds * WEEK - 4)) : 1e9; m.exdiv[s.sym] = s.div ? PRE + 2 + Math.floor(R() * Math.max(1, rounds * WEEK - 3)) : 1e9; });
    for (let d = 1; d <= Math.min(upTo, end); d++) {
      const rd = d > PRE ? Math.ceil((d - PRE) / WEEK) : 0, first = rd && (d - PRE) % WEEK === 1, head = first ? HEADS[heads[rd - 1]] : null;
      const c1 = R(), c2 = R(), crash = c1 < .02 ? -(.025 + c2 * .03) : c1 > .98 ? .02 : 0, mret = .0003 + .0085 * G() + crash;
      if (rd && crash) m.events.push({ d, r: rd, t: crash < 0 ? 'Market-wide sell-off: worries about the economy hit almost every stock.' : 'Strong economic report! Most stocks rallied.', dir: crash < 0 ? 'd' : 'u' });
      if (head) m.events.push({ d, r: rd, t: head.h, dir: '', head: 1 });
      order.forEach(i => { const s = STOCKS[i], arr = m.c[s.sym], prev = arr[arr.length - 1].c;
        let base = s.mu + s.beta * (mret - .0003) + s.sig * G(), jump = 0, vm = 1;
        if (head) { const fx = head.fx[s.sym] != null ? head.fx[s.sym] : head.fx.EVRY != null ? head.fx.EVRY * s.beta : 0; if (fx) { jump += fx / 100; vm *= 1.8; } }
        const nr = R(), ni = R(), nk = R();
        if (s.sym !== 'EVRY' && nr < .025 && NEWS[s.sym]) { const e = NEWS[s.sym][Math.floor(ni * NEWS[s.sym].length)]; jump += e[1] * (.6 + .6 * nk); vm *= 2.2; if (rd) m.events.push({ d, r: rd, t: s.sym + ': ' + e[0], dir: e[1] > 0 ? 'u' : 'd', sym: s.sym }); }
        const eg = G();
        if (d === m.earn[s.sym] || d === m.earn[s.sym] - 61) { const j = s.em * eg * 1.1; jump += j; vm *= 3.2; m.past[s.sym].push(d);
          if (rd) m.events.push({ d, r: rd, t: `${s.sym} reported earnings. The stock ${j >= 0 ? 'jumped' : 'dropped'} about ${Math.abs(j * 100).toFixed(1)}% at the open.`, dir: j >= 0 ? 'u' : 'd', sym: s.sym }); }
        if (d === m.exdiv[s.sym]) { jump -= s.div / prev; (m.divs[rd] = m.divs[rd] || {})[s.sym] = s.div;
          m.events.push({ d, r: rd, t: `${s.sym} paid a ${usd(s.div)} dividend per share. The price dropped by about that much, as usual.`, dir: '', sym: s.sym }); }
        const g1 = G(), g2 = G(), g3 = G(), vr = R(), r = base + jump, o = prev * Math.exp(jump + base * .3 + s.sig * .2 * g1), c = prev * Math.exp(r);
        const hi = Math.max(o, c) * Math.exp(Math.abs(g2) * s.sig * .45 + .0005), lo = Math.min(o, c) * Math.exp(-Math.abs(g3) * s.sig * .45 - .0005);
        arr.push({ o: R2(o), h: R2(hi), l: R2(lo), c: R2(c), v: Math.round(s.vol0 * (.75 + .5 * vr) * (1 + 1.2 * Math.abs(base) / Math.max(.008, s.sig)) * vm) }); });
      m.day = d;
    }
    return (memo[key] = m);
  }
  const dayFor = (phase, r) => PRE + WEEK * (phase === 'trade' ? r - 1 : phase === 'lobby' ? 0 : r);
  const close = (m, sym) => m.c[sym][m.c[sym].length - 1].c;
  const expDay = e => PRE + WEEK * e;

  /* ---------- options: weekly calls and puts, cash-settled at expiration ---------- */
  function listFor(m, r) { // contracts that open for trading in round r
    const out = [], D = PRE + WEEK * (r - 1), exps = [...new Set([r, Math.min(m.rounds, r + 2)])];
    STOCKS.forEach(s => { const S0 = m.c[s.sym][D].c, inc = strikeInc(S0), atm = Math.round(S0 / inc) * inc;
      exps.forEach(e => [atm - inc, atm, atm + inc].forEach(K => ['C', 'P'].forEach(t => out.push(`${s.sym} ${+K.toFixed(2)}${t} wk${e}`)))); });
    return out;
  }
  const parseOpt = tk => { const x = /^(\w+) ([\d.]+)([CP]) wk(\d+)$/.exec(tk); return x && { sym: x[1], K: +x[2], type: x[3] === 'C' ? 'call' : 'put', e: +x[4] }; };
  function optMark(m, tk, D) { const o = parseOpt(tk), s = SBY[o.sym], S0 = m.c[o.sym][D].c, ed = expDay(o.e);
    if (D >= ed) return { price: R2(Math.max(0, o.type === 'call' ? m.c[o.sym][ed].c - o.K : o.K - m.c[o.sym][ed].c) * 100), delta: 0, expired: true };
    const g = greeksFull(o.type, S0, o.K, Math.max(calDays(D, ed), .5) / 365, annVol(s)); return { price: Math.max(.01, R2(g.price * 100)), delta: g.delta, expired: false }; }
  function contractsTo(m, r) { const set = new Set(); for (let i = 1; i <= r; i++) listFor(m, i).forEach(t => set.add(t)); return [...set]; }

  // What the teacher's screen publishes for a step. Students' devices rebuild the same numbers for the charts.
  function publish(base, phase, r) {
    const m = build(base.seed, base.rounds, dayFor(phase, r)), D = dayFor(phase, r), prices = {}, expired = {};
    STOCKS.forEach(s => prices[s.sym] = close(m, s.sym));
    contractsTo(m, Math.max(1, phase === 'lobby' ? 1 : r)).forEach(tk => { const k = optMark(m, tk, D); prices[tk] = k.price; if (k.expired) expired[tk] = 1; });
    const out = Object.assign({}, base, { prices, expired, phase, r, head: null, why: null, range: null, divs: null });
    if (phase === 'trade' || phase === 'results') { const h = HEADS[m.heads[r - 1]]; out.head = h.h; if (phase === 'results') out.why = h.why; }
    if (phase === 'results') { const rng = {}; STOCKS.forEach(s => { const wk = m.c[s.sym].slice(D - WEEK + 1, D + 1); rng[s.sym] = { o: wk[0].o, lo: Math.min(...wk.map(x => x.l)), hi: Math.max(...wk.map(x => x.h)) }; });
      out.range = rng; out.divs = m.divs[r] || {}; }
    return out;
  }
  const newGame = (rounds, secs, cash) => ({ md: 1, seed: Math.floor(Math.random() * 2 ** 31), rounds, secs, cash });

  /* ---------- the teacher's projector ---------- */
  function hostTiles(p, phase, r) {
    const m = build(p.seed, p.rounds, dayFor(phase, r)), D = dayFor(phase, r), was = phase === 'results' ? D - WEEK : Math.max(0, D - WEEK);
    return `<div class="md-tiles">${STOCKS.map(s => { const now = m.c[s.sym][D].c, then = m.c[s.sym][was].c, ch = now / then - 1;
      return `<div class="md-tile"><div class="md-th"><span class="tk" style="background:${s.col}">${s.sym[0]}</span><div><b>${esc(s.name)}</b><small>${s.sym}</small></div></div>
        <canvas data-mdsp="${s.sym}" aria-hidden="true"></canvas><div class="md-tp"><b class="mono">${usd(now)}</b><span class="${ch >= 0 ? 'up' : 'dn'} mono">${pc(ch)}</span></div></div>`; }).join('')}</div>
      <p class="muted" style="margin:6px 0 0">${phase === 'results' ? 'Change over this trading week.' : 'Change over the last trading week. Charts show the last 30 trading days.'}</p>`;
  }
  function hostWeekNews(p, r) { const m = build(p.seed, p.rounds, dayFor('results', r)), ev = m.events.filter(e => e.r === r && !e.head);
    return ev.length ? `<div class="card" style="margin-top:14px"><h2>Also this week</h2><ul class="news">${ev.map(e => `<li class="${e.dir}"><small>${fmtD(e.d)}</small>${esc(e.t)}</li>`).join('')}</ul></div>` : ''; }
  function wireTiles(root, p, phase, r) { const m = build(p.seed, p.rounds, dayFor(phase, r)), D = dayFor(phase, r);
    root.querySelectorAll('[data-mdsp]').forEach(cv => reg(cv, () => drawLine(cv, m.c[cv.dataset.mdsp].slice(Math.max(0, D - 29), D + 1).map(x => x.c), { spark: true }))); }

  /* ---------- a student's trading screen ---------- */
  const U = { sel: 'EVRY', type: 'candle', range: 63, vol: true, ma20: true, ma50: false, tab: 'stock', side: 'buy', kind: 'market', exp: null, cp: 'call', q: 10, oq: 1, vals: {} };
  let H = null; // hover index
  function studentHTML(g) {
    const p = g.pub, phase = g.phase, r = g.round, D = dayFor(phase, r);
    return `<div class="mkt-grid md-grid"><div class="stocklist" id="md-list"></div>
      <div style="display:grid;gap:14px;min-width:0">
        <div class="card"><div class="lv-row" style="justify-content:space-between;align-items:start"><div style="min-width:0"><h3 id="md-name" style="font-size:22px;margin:0"></h3><p class="muted" id="md-desc" style="font-size:14.5px;margin:4px 0 0"></p></div>
          <div style="text-align:right"><div class="mono" id="md-price" style="font-size:24px;font-weight:700"></div><div id="md-chg" style="font-size:14px"></div></div></div>
          <div class="facts" id="md-facts"></div>
          <div class="toolbar" style="margin-top:12px">
            <div class="seg" role="group" aria-label="Chart type"><button data-md-type="candle">Candles</button><button data-md-type="line">Line</button></div>
            <div class="seg" role="group" aria-label="Time range"><button data-md-range="21">1M</button><button data-md-range="63">3M</button><button data-md-range="126">6M</button></div>
            <label class="chk"><input type="checkbox" id="md-vol"> Volume</label><label class="chk"><input type="checkbox" id="md-ma20"> 20-day avg</label><label class="chk"><input type="checkbox" id="md-ma50"> 50-day avg</label></div>
          <canvas id="md-cv" style="height:300px;width:100%" aria-label="Selected stock chart"></canvas><div class="readout" id="md-read" aria-live="polite"></div></div>
        <div class="card"><div class="seg" role="group" aria-label="Trade"><button data-md-tab="stock">Trade stock</button><button data-md-tab="opt">Option chain</button></div>
          <div id="md-stock" style="margin-top:14px"><div class="lv-row"><div class="seg" role="group" aria-label="Buy or sell"><button data-md-side="buy">Buy</button><button data-md-side="sell">Sell</button></div>
            <div class="seg" role="group" aria-label="Order type"><button data-md-kind="market">Market</button><button data-md-kind="limit">Limit</button><button data-md-kind="stop">Stop</button></div></div>
            <div class="trade"><div class="field"><label for="md-q">Shares</label><input type="number" id="md-q" min="1" step="1"></div>
              <div class="field" id="md-pxw"><label for="md-px" id="md-pxl">Limit price</label><input type="number" id="md-px" min="0.01" step="0.01"></div>
              <div class="field"><label>Estimated total</label><div class="mono" id="md-est" style="font-size:18px;font-weight:700;padding:8px 0">-</div></div>
              <button class="btn" id="md-go">Buy</button></div>
            <p id="md-help" style="font-size:14px;margin:8px 0 0"></p><div class="status" id="md-st" aria-live="polite"></div></div>
          <div id="md-opt" style="margin-top:14px" hidden></div></div>
        <div class="card"><h3 style="font-size:20px;margin:0 0 10px">Your portfolio</h3><div id="md-port"></div></div>
        <div class="two-col md-two"><div class="card"><h3 style="font-size:20px;margin:0 0 10px">Market news</h3><ul class="news" id="md-news"></ul></div>
          <div class="card"><h3 style="font-size:20px;margin:0 0 10px">Activity</h3><ul class="news" id="md-log"></ul></div></div>
      </div></div>`;
  }
  function wire(g, api) {
    const p = g.pub, phase = g.phase, r = g.round, D = dayFor(phase, r), m = build(p.seed, p.rounds, D), $q = s => document.querySelector(s);
    const open = phase === 'trade', me = () => api.me();
    const ex = [...new Set([r || 1, Math.min(p.rounds, (r || 1) + 2)])];
    if (!U.exp || !ex.includes(U.exp)) U.exp = ex[0]; U.om = null;
    function list() { $q('#md-list').innerHTML = STOCKS.map(s => { const a = m.c[s.sym], now = a[D].c, ch = now / a[Math.max(0, D - (phase === 'results' ? WEEK : 1))].c - 1;
        return `<button class="stk" data-s="${s.sym}" aria-pressed="${U.sel === s.sym}"><span class="tk" style="background:${s.col}">${s.sym[0]}</span><span><b>${esc(s.name)}</b><small>${s.sym} · ${usd(now)} <span class="${ch >= 0 ? 'up' : 'dn'}">${pc(ch)}</span></small></span><canvas data-mdsp2="${s.sym}" aria-hidden="true"></canvas></button>`; }).join('');
      document.querySelectorAll('#md-list .stk').forEach(b => b.onclick = () => { U.sel = b.dataset.s; H = null; list(); stock(); ticket(); if (innerWidth < 900) { const n = $q('#md-name'); if (n) n.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
      document.querySelectorAll('[data-mdsp2]').forEach(cv => reg(cv, () => drawLine(cv, m.c[cv.dataset.mdsp2].slice(Math.max(0, D - 19), D + 1).map(x => x.c), { spark: true }))); }
    function stock() {
      const s = SBY[U.sel], a = m.c[s.sym].slice(0, D + 1), last = a[D], prev = a[D - 1], ch = last.c - prev.c;
      $q('#md-name').textContent = `${s.name} (${s.sym})`; $q('#md-desc').textContent = s.desc; $q('#md-price').textContent = usd(last.c);
      $q('#md-chg').innerHTML = `<span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '▲' : '▼'} ${usd(Math.abs(ch))} (${pc(ch / prev.c)}) last day</span>`;
      const r6 = a.slice(-126), avgV = a.slice(-20).reduce((x, y) => x + y.v, 0) / 20, eps = PE[s.sym] ? s.p / PE[s.sym] : null, ne = m.earn[s.sym] > D ? m.earn[s.sym] : null;
      const facts = [['Open', usd(last.o)], ['High', usd(last.h)], ['Low', usd(last.l)], ['Volume', fmtVol(last.v)], ['Avg volume (20d)', fmtVol(Math.round(avgV))],
        ['6-month range', `${usd(Math.min(...r6.map(x => x.l)))}–${usd(Math.max(...r6.map(x => x.h)))}`], ['Beta', s.beta.toFixed(2)],
        ['P/E ratio', eps ? (last.c / eps).toFixed(1) : s.sym === 'EVRY' ? '~20 (whole market)' : 'None (losing money)'],
        ['Dividend', s.div ? `${usd(s.div)}/quarter · yield ${(s.div * 4 / last.c * 100).toFixed(1)}%` + (m.exdiv[s.sym] > D && m.exdiv[s.sym] < 1e8 ? ` · ex-date ${fmtD(m.exdiv[s.sym])}` : '') : 'None'],
        ['Next earnings', s.em ? (ne ? `${fmtD(ne)} (week ${Math.ceil((ne - PRE) / WEEK)})` : 'After this game') : 'None (fund)'], ['Implied vol', (annVol(s) * 100).toFixed(0) + '%']];
      $q('#md-facts').innerHTML = facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
      ['type', 'range'].forEach(k => document.querySelectorAll(`[data-md-${k}]`).forEach(b => b.setAttribute('aria-pressed', String(U[k]) === b.getAttribute(`data-md-${k}`))));
      $q('#md-vol').checked = U.vol; $q('#md-ma20').checked = U.ma20; $q('#md-ma50').checked = U.ma50;
      const cv = $q('#md-cv'), draw = () => drawStock(cv, a, { type: U.type, range: U.range, vol: U.vol, ma20: U.ma20, ma50: U.ma50, lastDay: D, marks: m.past[s.sym].filter(x => x <= D), hover: H }); reg(cv, draw);
      cv.onpointermove = cv.onpointerdown = e => { const n = Math.min(U.range, a.length), i = idxAt(cv, e, n); if (i == null || i === H) return; H = i; draw(); const c = a[a.length - n + i], pc0 = a[a.length - n + i - 1], dd = D - n + 1 + i;
        $q('#md-read').innerHTML = `<b>${fmtD(dd, true)}</b> · <span class="mono">O ${usd(c.o)} · H ${usd(c.h)} · L ${usd(c.l)} · C ${usd(c.c)} · Vol ${fmtVol(c.v)}</span>${pc0 ? ` · <span class="${c.c >= pc0.c ? 'up' : 'dn'}">${pc(c.c / pc0.c - 1)}</span>` : ''}${m.past[s.sym].includes(dd) ? ' · <b>Earnings day</b>' : ''}`; };
      if (H == null) $q('#md-read').innerHTML = 'Tap or hover the chart to read any day. <b>E</b> marks earnings days. Each round is one trading week.';
    }
    function ticket() {
      document.querySelectorAll('[data-md-tab]').forEach(b => b.setAttribute('aria-pressed', U.tab === b.dataset.mdTab));
      $q('#md-stock').hidden = U.tab !== 'stock'; $q('#md-opt').hidden = U.tab !== 'opt';
      if (!open && U.kind === 'market') { U.kind = 'limit'; U.auto = true; } else if (open && U.auto) { U.kind = 'market'; U.auto = false; }
      document.querySelectorAll('[data-md-side]').forEach(b => b.setAttribute('aria-pressed', U.side === b.dataset.mdSide));
      document.querySelectorAll('[data-md-kind]').forEach(b => { b.setAttribute('aria-pressed', U.kind === b.dataset.mdKind); if (b.dataset.mdKind === 'market') b.disabled = !open; });
      const qi = $q('#md-q'), pi = $q('#md-px'); if (!qi.value) qi.value = U.q; $q('#md-pxw').hidden = U.kind === 'market'; $q('#md-pxl').textContent = U.kind === 'limit' ? 'Limit price' : 'Stop price';
      const now = p.prices[U.sel]; if (!pi.value || pi.dataset.s !== U.sel) { pi.value = now.toFixed(2); pi.dataset.s = U.sel; }
      const q = Math.max(0, Math.floor(+qi.value || 0)), px = U.kind === 'market' ? now : (+pi.value || 0), have = (me().holdings || {})[U.sel] || 0;
      $q('#md-est').textContent = q ? usd(q * px) : '-';
      const go = $q('#md-go'); go.textContent = (U.side === 'buy' ? 'Buy' : 'Sell') + (U.kind === 'market' ? '' : U.kind === 'limit' ? ' (limit)' : ' (stop)'); go.className = 'btn ' + (U.side === 'buy' ? 'up' : 'down');
      $q('#md-help').innerHTML = U.kind === 'market' ? (open ? `Fills right now at <b>${usd(now)}</b>. You have ${usd(me().cash)} cash and own ${have} share${have === 1 ? '' : 's'}.` : 'Market orders work while the market is open. You can still place limit and stop orders.')
        : U.kind === 'limit' ? (U.side === 'buy' ? `Buys only if the price drops to <b>${usd(px)}</b> or lower during the next trading week.` : `Sells only if the price rises to <b>${usd(px)}</b> or higher during the next trading week.`)
        : (U.side === 'sell' ? `A stop-loss: sells if the price falls to <b>${usd(px)}</b> during the week, to limit your loss.` : `Buys if the price climbs to <b>${usd(px)}</b> during the week.`) + ' Orders stay open until they fill or you cancel them.';
      if (U.tab === 'opt') chain();
    }
    function chain() {
      const s = SBY[U.sel], S0 = p.prices[s.sym], mine = me().holdings || {}, rows = Object.keys(p.prices).filter(tk => { const o = parseOpt(tk); return o && o.sym === s.sym && o.e === U.exp && o.type === U.cp && !p.expired[tk]; })
        .sort((a, b) => parseOpt(a).K - parseOpt(b).K);
      $q('#md-opt').innerHTML = `<div class="lv-row"><div class="seg" role="group" aria-label="Expiration">${ex.map(e => `<button data-md-exp="${e}" aria-pressed="${U.exp === e}">Ends week ${e}${e === r ? ' (this week)' : ''}</button>`).join('')}</div>
        <div class="seg" role="group" aria-label="Calls or puts"><button data-md-cp="call" aria-pressed="${U.cp === 'call'}">Calls</button><button data-md-cp="put" aria-pressed="${U.cp === 'put'}">Puts</button></div>
        <div class="field" style="width:120px"><label for="md-oq">Contracts</label><input type="number" id="md-oq" min="1" step="1" value="${U.oq}"></div></div>
        <p class="muted" style="font-size:13.5px;margin:8px 0 0">${s.sym} is ${usd(S0)}. One contract covers 100 shares. A ${U.cp} pays off if ${s.sym} ends week ${U.exp} ${U.cp === 'call' ? 'above' : 'below'} the strike by more than you paid. At expiration it is settled in cash for what it’s worth.</p>
        <div class="tbl-wrap" tabindex="0" role="region" aria-label="Table (scrolls sideways)"><table><thead><tr><th>Strike</th><th class="n">Price / contract</th><th class="n">Delta</th><th class="n">Break-even</th><th class="n">You own</th><th></th></tr></thead><tbody>${rows.map(tk => { const o = parseOpt(tk), k = optMark(m, tk, D), cost = p.prices[tk];
          return `<tr><td class="mono">${usd(o.K)} ${o.type === 'call' ? 'call' : 'put'}${(o.type === 'call' ? S0 > o.K : S0 < o.K) ? ' <small class="up">in the money</small>' : ''}</td><td class="n">${usd(cost)}</td><td class="n">${k.delta.toFixed(2)}</td><td class="n">${usd(o.type === 'call' ? o.K + cost / 100 : o.K - cost / 100)}</td><td class="n">${mine[tk] || 0}</td>
            <td style="white-space:nowrap;text-align:right"><button class="btn up sm" data-md-ob="${esc(tk)}"${open ? '' : ' disabled'}>Buy</button> <button class="btn ghost sm" data-md-os="${esc(tk)}"${open && mine[tk] ? '' : ' disabled'}>Sell</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">No contracts listed for this week yet.</td></tr>'}</tbody></table></div>
        <div class="status ${U.om ? U.om[0] : ''}" id="md-ost" aria-live="polite">${open ? (U.om ? esc(U.om[1]) : '') : 'Options trade only while the market is open.'}</div>`;
      document.querySelectorAll('[data-md-exp]').forEach(b => b.onclick = () => { U.om = null; U.exp = +b.dataset.mdExp; chain(); });
      document.querySelectorAll('[data-md-cp]').forEach(b => b.onclick = () => { U.om = null; U.cp = b.dataset.mdCp; chain(); });
      $q('#md-oq').oninput = e => { U.oq = Math.max(1, Math.floor(+e.target.value || 1)); };
      document.querySelectorAll('[data-md-ob],[data-md-os]').forEach(b => b.onclick = async () => { const tk = b.dataset.mdOb || b.dataset.mdOs, q = b.dataset.mdOb ? U.oq : -Math.min(U.oq, (me().holdings || {})[tk] || 0);
        const st = $q('#md-ost'); st.textContent = 'Sending…'; const res = await api.trade(tk, q); U.om = [res.ok ? 'up' : 'dn', res.msg]; if (res.ok) port(); chain(); }); }
    function port() {
      const mm = me(), h = mm.holdings || {}, cost = mm.cost || {}, start = +p.cash || 10000; let sv = 0, ov = 0;
      const stocks = STOCKS.filter(s => h[s.sym]).map(s => { const q = h[s.sym], v = q * p.prices[s.sym], c = cost[s.sym] || 0; sv += v;
        return `<tr><td><b>${s.sym}</b></td><td class="n">${q}</td><td class="n">${usd(c / q)}</td><td class="n">${usd(p.prices[s.sym])}</td><td class="n">${usd(v)}</td><td class="n ${v - c >= 0 ? 'up' : 'dn'}">${sgn(v - c)} (${pc(c ? v / c - 1 : 0)})</td></tr>`; }).join('');
      const opts = Object.keys(h).filter(parseOpt).map(tk => { const q = h[tk], mk = p.prices[tk] || 0, v = q * mk, c = cost[tk] || 0; ov += v;
        return `<tr><td class="mono">${esc(tk.replace(/ wk(\d+)$/, ''))}<small class="muted"> ${p.expired[tk] ? 'expired, sell to collect' : 'ends week ' + parseOpt(tk).e}</small></td><td class="n">${q}</td><td class="n">${usd(c / q)}</td><td class="n">${usd(mk)}</td><td class="n ${v - c >= 0 ? 'up' : 'dn'}">${sgn(v - c)}</td></tr>`; }).join('');
      const tv = mm.cash + sv + ov; U.vals[phase + r] = tv; const series = [start].concat(Object.keys(U.vals).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map(k => U.vals[k]));
      $q('#md-port').innerHTML = `<div class="stats"><div class="stat"><span>Cash</span><b>${usd(mm.cash)}</b></div><div class="stat"><span>Stocks</span><b>${usd(sv)}</b></div><div class="stat"><span>Options</span><b>${usd(ov)}</b></div>
          <div class="stat"><span>Total worth</span><b>${usd(tv)}</b></div><div class="stat"><span>Since start</span><b class="${tv - start >= 0 ? 'up' : 'dn'}">${sgn(tv - start)} (${pc(tv / start - 1)})</b></div><div class="stat"><span>Class rank</span><b>#${mm.rank || '-'}</b></div></div>
        ${series.length > 2 ? '<canvas id="md-pv" style="height:140px;width:100%;margin-top:12px" aria-label="Your total worth over the game"></canvas>' : ''}
        <h4 class="subh">Stocks</h4><div class="tbl-wrap" tabindex="0" role="region" aria-label="Table (scrolls sideways)"><table><thead><tr><th>Stock</th><th class="n">Shares</th><th class="n">Avg cost</th><th class="n">Price</th><th class="n">Value</th><th class="n">Gain / loss</th></tr></thead><tbody>${stocks || '<tr><td colspan="6" class="muted">No stocks yet.</td></tr>'}</tbody></table></div>
        <p class="muted" style="font-size:13px;margin:6px 0 0">Average cost = everything you paid ÷ shares you own.</p>
        <h4 class="subh">Options</h4><div class="tbl-wrap" tabindex="0" role="region" aria-label="Table (scrolls sideways)"><table><thead><tr><th>Contract</th><th class="n">Qty</th><th class="n">Avg cost</th><th class="n">Mark</th><th class="n">Gain / loss</th></tr></thead><tbody>${opts || '<tr><td colspan="5" class="muted">No options yet.</td></tr>'}</tbody></table></div>
        <h4 class="subh">Open orders</h4><ul class="orders">${(mm.orders || []).map(o => `<li><span>${o.side === 'buy' ? 'Buy' : 'Sell'} ${o.q} ${esc(o.tk)} · ${o.kind} ${usd(o.px)}</span><button class="btn ghost sm" data-md-x="${o.id}">Cancel</button></li>`).join('') || '<li class="muted">No open orders.</li>'}</ul>`;
      const pv = $q('#md-pv'); if (pv) reg(pv, () => drawLine(pv, series, { base: start, xticks: series.map((_, i) => [i, i ? 'R' + i : 'Start']).filter((_, i) => series.length < 10 || i % 2 === 0) }));
      document.querySelectorAll('[data-md-x]').forEach(b => b.onclick = async () => { b.disabled = true; await api.order({ cancel: +b.dataset.mdX }); port(); });
      const F = { buy: 'Bought', sell: 'Sold', buy_limit: 'Limit buy filled:', sell_limit: 'Limit sell filled:', sell_stop: 'Stop-loss sold', buy_stop: 'Stop buy filled:', div: 'Dividend:', cancel: 'Order canceled:' };
      $q('#md-log').innerHTML = (mm.fills || []).map(f => `<li class="${f.t === 'div' ? 'u' : f.t === 'cancel' ? 'd' : ''}"><small>Wk ${f.r || 0}</small>${f.t === 'div' ? `${esc(f.tk)} paid you ${usd(f.amt)} (${usd(f.px)} × ${f.q} shares).` : f.t === 'cancel' ? `${esc(f.tk)} ${f.why === 'cash' ? 'buy needed more cash than you had' : 'sell, you didn’t own the shares'}.` : `${F[f.t] || f.t} ${f.q} ${esc(f.tk)} at ${usd(f.px)}.`}</li>`).join('') || '<li>Your trades, filled orders and dividends show up here.</li>';
    }
    function news() { $q('#md-news').innerHTML = m.events.filter(e => e.d <= D).slice().reverse().map(e => `<li class="${e.dir}"><small>${fmtD(e.d)}</small>${e.head ? '<b>Breaking:</b> ' : ''}${esc(e.t)}</li>`).join('') || '<li>News from the game shows up here.</li>'; }
    // controls
    document.querySelectorAll('[data-md-type]').forEach(b => b.onclick = () => { U.type = b.dataset.mdType; stock(); });
    document.querySelectorAll('[data-md-range]').forEach(b => b.onclick = () => { U.range = +b.dataset.mdRange; H = null; stock(); });
    ['vol', 'ma20', 'ma50'].forEach(k => $q('#md-' + k).onchange = e => { U[k] = e.target.checked; stock(); });
    document.querySelectorAll('[data-md-tab]').forEach(b => b.onclick = () => { U.tab = b.dataset.mdTab; ticket(); });
    document.querySelectorAll('[data-md-side]').forEach(b => b.onclick = () => { U.side = b.dataset.mdSide; ticket(); });
    document.querySelectorAll('[data-md-kind]').forEach(b => b.onclick = () => { if (b.disabled) return; U.kind = b.dataset.mdKind; U.auto = false; ticket(); });
    $q('#md-q').oninput = () => { U.q = Math.max(1, Math.floor(+$q('#md-q').value || 1)); ticket(); }; $q('#md-px').oninput = ticket;
    $q('#md-go').onclick = async () => { const q = Math.floor(+$q('#md-q').value || 0), st = $q('#md-st'); if (q < 1) { st.className = 'status dn'; st.textContent = 'Type how many shares.'; return; }
      st.className = 'status'; st.textContent = 'Sending…'; let res;
      if (U.side === 'sell' && !((me().holdings || {})[U.sel])) res = { ok: false, msg: 'You don’t own any ' + U.sel + ' yet.' };
      else if (U.kind === 'market') { const have = (me().holdings || {})[U.sel] || 0; if (U.side === 'sell' && !have) res = { ok: false, msg: 'You don’t own any ' + U.sel + ' yet.' }; else res = await api.trade(U.sel, U.side === 'buy' ? q : -Math.min(q, have)); }
      else { const px = +$q('#md-px').value; if (!(px > 0)) res = { ok: false, msg: 'Type a price.' }; else { const ok = await api.order({ tk: U.sel, side: U.side, kind: U.kind, q, px }); res = { ok, msg: ok ? `${U.kind === 'limit' ? 'Limit' : 'Stop'} order placed: ${U.side} ${q} ${U.sel} at ${usd(px)}.` : 'That order didn’t go through (10 open orders max).' }; } }
      st.className = 'status ' + (res.ok ? 'up' : 'dn'); st.textContent = res.msg; if (res.ok) { port(); ticket(); } };
    list(); stock(); ticket(); port(); news();
    return { refresh() { port(); if (document.activeElement && /md-(q|px|oq)/.test(document.activeElement.id)) return; ticket(); } };
  }

  const css = document.createElement('style');
  css.textContent = `#live .md-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:12px}
#live .md-tile{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
#live .md-th{display:flex;gap:10px;align-items:center}#live .md-th b{display:block;font-size:16px}#live .md-th small{color:var(--muted);font-family:var(--f-mono)}
#live .md-th .tk,#live .stk .tk{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;font-family:var(--f-display);font-weight:800;color:#fff;flex:none}
#live .md-tile canvas{width:100%;height:56px;margin:8px 0 4px;display:block}#live .md-tp{display:flex;justify-content:space-between;align-items:baseline;font-size:clamp(16px,1.8vw,22px)}
#live .md-grid .stk{width:100%}#live .md-grid .stk canvas{width:100%}#live .md-grid td{font-size:14px}#live .md-grid .facts b{font-size:13px}
#live .md-grid .btn.down{background:var(--down);color:#1a0b09}#live .md-grid .btn.up{background:var(--up);color:#06231a}#live .md-grid .btn.sm{padding:6px 10px;min-height:34px;font-size:13px}
@media (max-width:700px){#live .md-two{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
  window.TT_MD = { newGame, publish, build, dayFor, hostTiles, hostWeekNews, wireTiles, studentHTML, wire, PRE, WEEK, STOCKS };
})();
