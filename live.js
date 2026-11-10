// Bullsburg live class games: Market Day and Quiz Battle.
// The teacher's projector screen ("host") opens index.html?host=<class id>&kind=market|quiz from the teacher dashboard.
// Students signed in to that class see a Join banner and play on their own device. Each device checks in every
// couple of seconds; trades and answers are checked by the database (setup_v6.sql), so nobody can cheat.
(function () {
  const C = window.TickerCloud; if (!C || !C.configured()) return;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = h => { const d = document.createElement('div'); d.innerHTML = String(h == null ? '' : h); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  const usd = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd0 = n => '$' + Math.round(Number(n || 0)).toLocaleString('en-US');
  const pct = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const LETTERS = 'ABCDEF';

  /* ---------- Market Day: the same pretend companies as the Practice Market ---------- */
  const COS = [
    { tk: 'EVRY', name: 'Everything Fund', what: 'an index fund that owns the whole market', p: 50 },
    { tk: 'LEMN', name: 'Sunny Lemonade Co.', what: 'drinks', p: 24 },
    { tk: 'GRDN', name: 'Green Garden Foods', what: 'snacks and groceries', p: 31 },
    { tk: 'PIGB', name: 'Piggy Bank Corp.', what: 'a bank', p: 62 },
    { tk: 'BYTC', name: 'Byte Chips Inc.', what: 'computer chips', p: 142 },
    { tk: 'ZMTR', name: 'Zoomer Motors', what: 'electric cars', p: 214 }];
  // fx = percent moves; why = the lesson shown after the market closes
  const NEWS = [
    { h: 'Heat wave hits the whole country', fx: { LEMN: 12, GRDN: 3, EVRY: 1 }, why: 'Hot weather means more cold drinks sold. Investors expect higher profits for Sunny Lemonade, so they pay more for its shares.' },
    { h: 'Byte Chips beats earnings: profits up 40%', fx: { BYTC: 15, ZMTR: 2, EVRY: 1 }, why: 'Earnings are a company’s profits. When profits beat what investors expected, the stock usually jumps.' },
    { h: 'Zoomer Motors recalls 50,000 cars', fx: { ZMTR: -14, EVRY: -1 }, why: 'A recall costs money to fix and hurts customers’ trust, so investors expect lower profits.' },
    { h: 'The central bank raises interest rates', fx: { PIGB: 6, ZMTR: -6, BYTC: -5, EVRY: -2, LEMN: -1 }, why: 'Banks can earn more on loans when rates rise. Car loans get pricier and fast-growing companies fall, because future profits are worth less today.' },
    { h: 'The central bank cuts interest rates', fx: { PIGB: -3, ZMTR: 7, BYTC: 6, EVRY: 3, LEMN: 1 }, why: 'Cheaper borrowing helps people buy cars and helps growing companies. Banks earn a little less on loans.' },
    { h: 'Recession fears: shoppers cut back', fx: { EVRY: -5, ZMTR: -9, BYTC: -7, PIGB: -6, LEMN: -2, GRDN: 1 }, why: 'In a slowdown people still buy food, but they put off big purchases like cars. Steady companies usually fall less. That’s why investors call them “defensive.”' },
    { h: 'Strong jobs report: 300,000 new jobs', fx: { EVRY: 3, PIGB: 4, ZMTR: 5, BYTC: 3, LEMN: 1, GRDN: 1 }, why: 'More people working means more spending and more loans. Most companies benefit when the economy is strong.' },
    { h: 'Green Garden raises its dividend', fx: { GRDN: 6 }, why: 'A dividend is cash a company pays its shareholders. A bigger dividend signals confidence and pays owners more.' },
    { h: 'Sunny Lemonade’s new flavor goes viral', fx: { LEMN: 10 }, why: 'A hit product can boost sales fast. But hype can fade, so prices built on buzz can also fall quickly.' },
    { h: 'Sugar prices jump 30%', fx: { LEMN: -7, GRDN: -5 }, why: 'When a company’s costs go up, its profit on every sale shrinks, unless it can raise prices.' },
    { h: 'A chip shortage slows car factories', fx: { ZMTR: -8, BYTC: 6 }, why: 'Short supply lets chipmakers charge more, while carmakers can’t finish cars. The same news can help one company and hurt another.' },
    { h: 'Zoomer Motors announces a cheaper model', fx: { ZMTR: 11 }, why: 'A lower price can reach many more buyers. Investors expect more sales in the future.' },
    { h: 'Piggy Bank fined for hidden fees', fx: { PIGB: -10, EVRY: -1 }, why: 'Fines cost money and customers leave. Hidden fees are also a reminder to always read your bank’s fee schedule.' },
    { h: 'New tax credit for electric cars', fx: { ZMTR: 9, BYTC: 2 }, why: 'A tax credit makes electric cars cheaper for buyers, so more people buy them.' },
    { h: 'Byte Chips’ CEO suddenly resigns', fx: { BYTC: -9 }, why: 'Surprises create uncertainty, and investors don’t like uncertainty. Prices often drop until the picture is clearer.' },
    { h: 'Food safety recall at Green Garden', fx: { GRDN: -11 }, why: 'Even a steady company can take a hit from a single problem. That’s why owning many companies, diversification, matters.' },
    { h: 'Stocks rally as investors feel optimistic', fx: { EVRY: 4, BYTC: 6, ZMTR: 7, PIGB: 4, LEMN: 2, GRDN: 1 }, why: 'Sometimes the whole market rises together on good mood. Riskier stocks usually move the most, up and down.' },
    { h: 'Rumor: Byte Chips may be bought out', fx: { BYTC: 12 }, why: 'Buyouts usually happen at a higher price than today’s, so rumors push prices up. But rumors can be wrong, which makes them risky to trade on.' },
    { h: 'Gas prices hit a record high', fx: { ZMTR: 8, LEMN: -2, EVRY: -1 }, why: 'Expensive gas makes electric cars more attractive. Companies that deliver products by truck pay more to do it.' },
    { h: 'Piggy Bank reports record profits', fx: { PIGB: 9, EVRY: 1 }, why: 'Record profits mean the company is earning more for each share its owners hold.' },
    { h: 'Study: sugary drinks linked to health problems', fx: { LEMN: -9, GRDN: 2 }, why: 'When customers’ habits might change, investors worry about future sales.' },
    { h: 'A quiet day: no big news', fx: {}, why: 'Prices still wiggle every day, even with no news. Trading on every small move usually doesn’t pay. Patience is a strategy too.' },
    { h: 'Cyberattack hits several banks', fx: { PIGB: -8, BYTC: 3, EVRY: -1 }, why: 'Attacks cost banks money and trust. Companies that sell security technology can benefit.' },
    { h: 'Back-to-school shopping beats expectations', fx: { GRDN: 4, LEMN: 3, BYTC: 3, EVRY: 2 }, why: 'When families spend more than expected, stores and the companies that supply them earn more.' }];
  const noise = () => { let s = 0; for (let i = 0; i < 4; i++) s += Math.random() - .5; return s * 1.6; }; // about ±1.5%

  /* ---------- look ---------- */
  const css = document.createElement('style');
  css.textContent = `
#live{position:fixed;inset:0;z-index:3000;background:var(--bg);color:var(--ink);overflow:auto;-webkit-overflow-scrolling:touch}
#live .lv-w{max-width:1180px;margin:0 auto;padding:20px 18px 40px}
#live .lv-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
#live .lv-pill{display:inline-flex;align-items:center;gap:8px;font-family:var(--f-mono);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
#live .lv-dot{width:10px;height:10px;border-radius:99px;background:var(--down);box-shadow:0 0 0 4px rgba(255,122,112,.18)}
#live h1{font-family:var(--f-display,Fraunces,serif);font-size:clamp(26px,4vw,46px);line-height:1.1;margin:0}
#live h2{font-family:var(--f-display,Fraunces,serif);font-size:clamp(20px,2.6vw,30px);margin:0 0 10px}
#live .lv-news{background:var(--surface);border:1px solid rgba(227,193,121,.35);border-radius:16px;padding:18px 20px;margin:12px 0}
#live .lv-news .h{font-family:var(--f-display,Fraunces,serif);font-weight:800;font-size:clamp(22px,3.4vw,40px);line-height:1.15}
#live .lv-why{color:var(--ink);opacity:.92;font-size:clamp(15px,1.6vw,19px);line-height:1.5;margin-top:10px}
#live .lv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
#live table{width:100%;border-collapse:collapse;font-size:clamp(14px,1.5vw,18px)}
#live th{text-align:left;color:var(--muted);font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid var(--line)}
#live td{padding:8px;border-bottom:1px solid var(--line);font-family:var(--f-body);text-align:left;white-space:normal}
#live th{white-space:nowrap}
#live td.n,#live th.n{text-align:right;font-variant-numeric:tabular-nums;font-family:var(--f-mono)}
#live .up{color:var(--up)} #live .dn{color:var(--down)}
#live .lv-big{font-family:var(--f-mono);font-weight:700;font-size:clamp(34px,6vw,72px);font-variant-numeric:tabular-nums}
#live .lv-stat{display:flex;gap:14px;flex-wrap:wrap}
#live .lv-stat>div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px;min-width:120px}
#live .lv-stat span{display:block;color:var(--muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
#live .lv-stat b{font-family:var(--f-mono);font-size:20px}
#live .lv-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin-top:14px}
#live .lv-opt{display:flex;gap:12px;align-items:center;text-align:left;border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;padding:14px 16px;font-size:clamp(16px,1.9vw,22px);font-weight:700;min-height:64px;width:100%}
#live .lv-opt .k{flex:none;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:var(--f-mono);background:var(--surface2);color:var(--ink)}
#live button.lv-opt:not(:disabled){cursor:pointer}
#live button.lv-opt:not(:disabled):hover{border-color:var(--accent)}
#live .lv-opt.pick{border-color:var(--accent);background:var(--surface2)}
#live .lv-opt.right{border-color:var(--up);background:rgba(67,219,155,.12)}
#live .lv-opt.wrong{border-color:var(--down);background:rgba(255,122,112,.10)}
#live .lv-bar{height:10px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-top:6px}
#live .lv-bar i{display:block;height:100%;background:var(--accent)}
#live .lv-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#live .lv-names{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
#live .lv-names span{background:var(--surface2);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-weight:700}
#live .lv-pod{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end;margin:16px 0}
#live .lv-pod>div{background:var(--surface);border:1px solid rgba(227,193,121,.35);border-radius:14px;padding:14px;text-align:center}
#live .lv-pod .p1{padding-top:34px} #live .lv-pod .rk{font-family:var(--f-mono);color:var(--accent);font-weight:700}
#live .lv-qty{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
#live .lv-qty button{border:0;background:var(--surface);color:var(--ink);padding:10px 14px;font-weight:700;min-width:48px;min-height:44px}
#live .lv-qty button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink)}
#live .lv-trade td{vertical-align:middle} #live .lv-trade td:last-child{white-space:nowrap} #live .lv-trade .btn{min-height:40px;padding:8px 12px}
#live .lv-msg{min-height:22px;font-weight:700;margin-top:8px}
#live .lv-co{font-weight:700} #live .lv-co small{display:block;color:var(--muted);font-weight:400;font-size:12px}
#live label.lv-f{display:flex;flex-direction:column;gap:6px;font-weight:700}
#live select{background:var(--surface2);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px;font-size:16px;min-height:44px}
#live-banner{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2500;display:flex;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--accent);border-radius:99px;padding:8px 8px 8px 16px;box-shadow:0 18px 40px -10px rgba(0,0,0,.8);max-width:calc(100% - 24px)}
#live-banner b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#live-banner .lv-dot{width:10px;height:10px;border-radius:99px;background:var(--down);flex:none}
@media (max-width:560px){#live .lv-w{padding:14px 12px 30px} #live .lv-hide-sm{display:none} #live .lv-trade td,#live .lv-trade th{padding:7px 4px} #live .lv-trade .btn{padding:8px 9px} #live .lv-stat{gap:8px} #live .lv-stat>div{min-width:0;flex:1;padding:8px 10px} #live .lv-stat b{font-size:16px;white-space:nowrap}}`;
  document.head.appendChild(css);

  function shell() {
    let el = document.getElementById('live');
    if (!el) { el = document.createElement('div'); el.id = 'live'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Live class game'); document.body.appendChild(el); }
    el.hidden = false; document.documentElement.style.overflow = 'hidden'; return el;
  }
  function unshell() { const el = document.getElementById('live'); if (el) { el.hidden = true; el.innerHTML = ''; } document.documentElement.style.overflow = ''; }
  const boardRows = (rows, kind, n, me) => (rows || []).slice(0, n).map((r, i) =>
    `<tr${me && r.name === me ? ' style="background:var(--surface2)"' : ''}><td class="n" style="width:44px">${i + 1}</td><td><b>${esc(r.name)}</b></td><td class="n">${kind === 'market' ? usd0(r.value) : Number(r.score).toLocaleString('en-US')}</td></tr>`).join('') ||
    '<tr><td colspan="3" class="muted">No players yet.</td></tr>';
  const boardTable = (rows, kind, n, me) => `<table><thead><tr><th class="n">#</th><th>Player</th><th class="n">${kind === 'market' ? 'Worth' : 'Points'}</th></tr></thead><tbody>${boardRows(rows, kind, n, me)}</tbody></table>`;

  /* =====================================================================
     HOST (the teacher's projector screen)
     ===================================================================== */
  const QS = new URLSearchParams(location.search);
  if (QS.get('host')) { addEventListener('load', () => host(QS.get('host'), QS.get('kind') === 'quiz' ? 'quiz' : 'market', QS.get('cls') || 'your class')); return; }

  function host(cls, kind, clsName) {
    const el = shell();
    const H = { cls, kind, clsName, id: null, data: null, busy: false, t0: 0, secs: 0, tick: null, round: 0 };
    const title = kind === 'market' ? 'Market Day' : 'Quiz Battle';
    if (!C.signedIn()) {
      el.innerHTML = `<div class="lv-w"><h1>Sign in first</h1><p style="font-size:18px;margin-top:10px">Open the <a href="teacher.html" style="color:var(--accent)">Teacher Dashboard</a> on this computer, sign in, and start the live game from your class.</p></div>`; return;
    }
    const topics = (typeof WISE_TOPICS !== 'undefined' ? WISE_TOPICS : []).filter(t => (t.stages || []).some(id => typeof BYID !== 'undefined' && BYID[id]));
    el.innerHTML = `<div class="lv-w"><div class="lv-top"><span class="lv-pill"><span class="lv-dot"></span>Live class game · ${esc(clsName)}</span><a class="btn ghost" href="teacher.html">Back to dashboard</a></div>
      <h1>${title}</h1>
      <p style="font-size:18px;max-width:760px;margin:10px 0 18px">${kind === 'market'
        ? 'Each round, breaking news hits the projector. Students buy and sell shares of six pretend companies before the market closes, then see what happened and why. The richest portfolio at the end wins.'
        : 'Questions appear on the projector and on every student’s device. Faster right answers earn more points, up to 1,000 each. After each question the class sees the answer, why, and the leaderboard.'}</p>
      <div class="card" style="max-width:760px"><div class="lv-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${kind === 'market'
        ? `<label class="lv-f">Rounds<select id="lvo-n"><option>4</option><option selected>6</option><option>8</option></select></label>
           <label class="lv-f">Time to trade each round<select id="lvo-s"><option value="60">1 minute</option><option value="90" selected>1½ minutes</option><option value="120">2 minutes</option></select></label>
           <label class="lv-f">Starting cash<select id="lvo-c"><option value="10000" selected>$10,000</option><option value="1000">$1,000</option></select></label>`
        : `<label class="lv-f">Topic<select id="lvo-t"><option value="">All W!SE topics (mixed)</option>${topics.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
           <label class="lv-f">Questions<select id="lvo-n"><option>5</option><option selected>10</option><option>15</option></select></label>
           <label class="lv-f">Time per question<select id="lvo-s"><option value="15">15 seconds</option><option value="20" selected>20 seconds</option><option value="30">30 seconds</option></select></label>`}</div>
        <div class="lv-msg" id="lvo-err" aria-live="polite"></div><button class="btn sun" id="lvo-go" style="margin-top:6px;font-size:18px;padding:12px 22px">Open the lobby</button></div></div>`;
    el.querySelector('#lvo-go').onclick = async function () {
      const b = this; b.disabled = true; b.textContent = 'Opening…';
      H.n = +el.querySelector('#lvo-n').value; H.secs = +el.querySelector('#lvo-s').value;
      let pub;
      if (kind === 'market') {
        H.cash = +el.querySelector('#lvo-c').value; H.prices = {}; COS.forEach(c => H.prices[c.tk] = c.p);
        H.news = shuffle(NEWS.slice()).slice(0, H.n);
        pub = { cash: H.cash, rounds: H.n, secs: H.secs, prices: H.prices, cos: COS.map(c => ({ tk: c.tk, name: c.name, what: c.what })) };
      } else {
        const tid = el.querySelector('#lvo-t').value, pick = tid ? topics.filter(t => t.id === tid) : topics;
        let pool = []; pick.forEach(t => t.stages.forEach(id => { if (BYID[id]) pool = pool.concat(bankOf(id)); }));
        H.qs = drawQs(pool, H.n).map(q => { const o = shuffle(q.o.map((t, k) => ({ t: plain(t), k }))); return { q: plain(q.q), o: o.map(x => x.t), right: o.findIndex(x => x.k === 0), why: plain(q.why) }; });
        H.n = H.qs.length; H.topic = tid ? (topics.find(t => t.id === tid) || {}).name : 'All W!SE topics';
        if (!H.n) { b.disabled = false; b.textContent = 'Open the lobby'; el.querySelector('#lvo-err').textContent = 'No questions found for that topic.'; return; }
        pub = { rounds: H.n, secs: H.secs, topic: H.topic };
      }
      try { H.id = await C.rpc('live_start', { p_class: cls, p_kind: kind, p_pub: pub }, true); } catch (e) { H.id = null; }
      if (!H.id) { b.disabled = false; b.textContent = 'Open the lobby'; el.querySelector('#lvo-err').textContent = 'Couldn’t start. Make sure you’re signed in to the Teacher Dashboard as this class’s teacher, then try again.'; return; }
      H.pub = pub; loop();
    };

    async function loop() { // checks who's playing every 2 seconds
      while (H.id) {
        try { const d = await C.rpc('live_host', { p_game: H.id }, true); if (d) { H.data = d; render(); if (d.ended) return; } } catch (e) {}
        await sleep(2000);
      }
    }
    async function step(phase, round, pub, secret) {
      if (H.busy) return; H.busy = true;
      try { await C.rpc('live_set', { p_game: H.id, p_phase: phase, p_round: round, p_pub: pub, p_secret: secret || null }, true);
        const d = await C.rpc('live_host', { p_game: H.id }, true); if (d) H.data = d; H.drawn = null; render(); }
      catch (e) { toast('Connection hiccup. Try that again.'); }
      H.busy = false;
    }
    function countdown(onEnd) {
      clearInterval(H.tick); H.t0 = Date.now();
      H.tick = setInterval(() => { const left = Math.max(0, H.secs - Math.floor((Date.now() - H.t0) / 1000)), c = document.getElementById('h-clock');
        if (c) c.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        if (left <= 0) { clearInterval(H.tick); onEnd(); } }, 250);
    }
    // market actions
    function openRound(r) { H.prev = Object.assign({}, H.prices); const n = H.news[r - 1];
      step('trade', r, Object.assign({}, H.pub, { prices: H.prices, prev: H.prev, news: n.h, why: null, moves: null })); }
    function closeRound() { const r = H.data.round, n = H.news[r - 1], moves = {};
      COS.forEach(c => { const m = (n.fx[c.tk] || 0) + noise(); moves[c.tk] = Math.round(m * 10) / 10; H.prices[c.tk] = Math.max(1, Math.round(H.prices[c.tk] * (1 + m / 100) * 100) / 100); });
      step('results', r, Object.assign({}, H.pub, { prices: H.prices, prev: H.prev, news: n.h, why: n.why, moves })); }
    // quiz actions
    function ask(i) { const q = H.qs[i - 1]; step('question', i, Object.assign({}, H.pub, { q: q.q, o: q.o, why: null }), { right: q.right }); }
    function reveal() { const q = H.qs[H.data.round - 1]; step('reveal', H.data.round, Object.assign({}, H.pub, { q: q.q, o: q.o, why: q.why })); }
    async function finish() { clearInterval(H.tick); await step('over', H.data.round, Object.assign({}, H.data.pub)); }

    function render() {
      const d = H.data; if (!d) return; const key = d.phase + ':' + d.round;
      const head = `<div class="lv-top"><span class="lv-pill"><span class="lv-dot"></span>Live · ${esc(clsName)} · ${title}</span>
        <span class="lv-row"><span class="lv-pill" aria-live="polite">${d.players} player${d.players === 1 ? '' : 's'}</span>${d.phase === 'over' ? '' : '<button class="btn ghost" id="h-end">End game</button>'}</span></div>`;
      if (H.drawn === key) { // same step: only refresh the live numbers
        const pc = document.getElementById('h-players'); if (pc) pc.textContent = d.players;
        const an = document.getElementById('h-ans'); if (an) an.textContent = d.answered + ' of ' + d.players + ' answered';
        const nm = document.getElementById('h-names'); if (nm) nm.innerHTML = d.board.map(r => `<span>${esc(r.name)}</span>`).join('') || '<span class="muted">Waiting for students…</span>';
        const lb = document.getElementById('h-board'); if (lb) lb.innerHTML = boardRows(d.board, kind, 10);
        if (kind === 'quiz' && d.phase === 'question' && d.players > 0 && d.answered >= d.players) { clearInterval(H.tick); reveal(); }
        return;
      }
      H.drawn = key; clearInterval(H.tick); const p = d.pub || {}; let body = '';
      if (d.phase === 'lobby') {
        body = `<h1>Join ${title}!</h1><p style="font-size:clamp(17px,2vw,24px);margin:12px 0">Open Bullsburg on your device and sign in to <b>${esc(clsName)}</b>. A <b>Join</b> button pops up at the bottom of the screen.</p>
          <div class="lv-stat"><div><span>Players</span><b id="h-players">${d.players}</b></div></div>
          <div class="lv-names" id="h-names">${d.board.map(r => `<span>${esc(r.name)}</span>`).join('') || '<span class="muted">Waiting for students…</span>'}</div>
          <button class="btn sun" id="h-next" style="margin-top:20px;font-size:20px;padding:14px 26px">Start the game</button>`;
      } else if (kind === 'market' && d.phase === 'trade') {
        body = `<div class="lv-row" style="justify-content:space-between"><span class="eyebrow">Round ${d.round} of ${p.rounds} · Market is open</span><span class="lv-big" id="h-clock" aria-label="Time left">-</span></div>
          <div class="lv-news"><span class="eyebrow">Breaking news</span><div class="h">${esc(p.news)}</div></div>
          <div class="lv-grid"><div class="card"><h2>Prices now</h2>${priceTable(p, false)}</div><div class="card"><h2>Leaders</h2>${boardTable(d.board, kind, 10).replace('<tbody>', '<tbody id="h-board">')}</div></div>
          <div class="lv-row" style="margin-top:16px"><button class="btn sun" id="h-next" style="font-size:18px;padding:12px 22px">Close the market now</button><button class="btn ghost" id="h-more">+30 seconds</button></div>`;
      } else if (kind === 'market' && d.phase === 'results') {
        const last = d.round >= p.rounds;
        body = `<span class="eyebrow">Round ${d.round} of ${p.rounds} · Market closed</span>
          <div class="lv-news"><div class="h">${esc(p.news)}</div><div class="lv-why"><b>Why prices moved:</b> ${esc(p.why)}</div></div>
          <div class="lv-grid"><div class="card"><h2>What happened</h2>${priceTable(p, true)}</div><div class="card"><h2>Leaders</h2>${boardTable(d.board, kind, 10).replace('<tbody>', '<tbody id="h-board">')}</div></div>
          <button class="btn sun" id="h-next" style="margin-top:16px;font-size:18px;padding:12px 22px">${last ? 'See the final results' : 'Next round'}</button>`;
      } else if (kind === 'quiz' && d.phase === 'question') {
        body = `<div class="lv-row" style="justify-content:space-between"><span class="eyebrow">Question ${d.round} of ${p.rounds} · ${esc(p.topic || '')}</span><span class="lv-big" id="h-clock" aria-label="Time left">-</span></div>
          <h1 style="margin:8px 0 4px">${esc(p.q)}</h1>
          <div class="lv-opts">${(p.o || []).map((t, j) => `<div class="lv-opt"><span class="k">${LETTERS[j]}</span>${esc(t)}</div>`).join('')}</div>
          <div class="lv-row" style="margin-top:16px;justify-content:space-between"><span class="lv-pill" id="h-ans" aria-live="polite">${d.answered} of ${d.players} answered</span><button class="btn sun" id="h-next">Show the answer</button></div>`;
      } else if (kind === 'quiz' && d.phase === 'reveal') {
        const total = Object.values(p.counts || {}).reduce((s, x) => s + x, 0), last = d.round >= p.rounds;
        body = `<span class="eyebrow">Question ${d.round} of ${p.rounds}</span><h1 style="margin:8px 0 4px">${esc(p.q)}</h1>
          <div class="lv-opts">${(p.o || []).map((t, j) => { const c = (p.counts || {})[j] || 0; return `<div class="lv-opt ${j === p.right ? 'right' : ''}" style="flex-direction:column;align-items:stretch"><span class="lv-row"><span class="k">${LETTERS[j]}</span>${esc(t)}${j === p.right ? ' ✓' : ''}</span><span class="muted" style="font-size:14px">${c} student${c === 1 ? '' : 's'}</span><span class="lv-bar"><i style="width:${total ? Math.round(100 * c / total) : 0}%"></i></span></div>`; }).join('')}</div>
          ${p.why ? `<div class="lv-news"><div class="lv-why" style="margin:0"><b>Why:</b> ${esc(p.why)}</div></div>` : ''}
          <div class="card"><h2>Leaders</h2>${boardTable(d.board, kind, 5).replace('<tbody>', '<tbody id="h-board">')}</div>
          <button class="btn sun" id="h-next" style="margin-top:16px;font-size:18px;padding:12px 22px">${last ? 'See the final results' : 'Next question'}</button>`;
      } else if (d.phase === 'over') {
        const b = d.board, cell = (r, n) => r ? `<div class="${n === 1 ? 'p1' : ''}"><div class="rk">#${n}</div><div style="font-size:22px;font-weight:800;margin-top:4px">${esc(r.name)}</div><div class="mono">${kind === 'market' ? usd0(r.value) : Number(r.score).toLocaleString('en-US') + ' pts'}</div></div>` : '<div></div>';
        body = `<h1>Final results</h1><div class="lv-pod">${cell(b[1], 2)}${cell(b[0], 1)}${cell(b[2], 3)}</div>
          <div class="card"><h2>Everyone</h2>${boardTable(b, kind, 50)}</div>
          ${kind === 'market' ? '<p style="font-size:18px;margin-top:14px"><b>Talk about it:</b> Who spread their money across several companies? Who bet on one? Which news surprised you, and what would you do differently with real money?</p>' : ''}
          <a class="btn sun" href="teacher.html" style="margin-top:12px;display:inline-block;font-size:18px;padding:12px 22px">Back to the dashboard</a>`;
      }
      el.innerHTML = `<div class="lv-w">${head}${body}</div>`;
      const nx = document.getElementById('h-next'), more = document.getElementById('h-more');
      const he = document.getElementById('h-end'); if (he) he.onclick = function () { if (this.dataset.arm) { clearInterval(H.tick); C.rpc('live_end', { p_game: H.id }, true).catch(() => {}); H.id = null; location.href = 'teacher.html'; return; }
        this.dataset.arm = '1'; this.textContent = 'Tap again to end'; setTimeout(() => { this.textContent = 'End game'; delete this.dataset.arm; }, 4000); };
      if (more) more.onclick = () => { H.t0 += 30000; };
      if (kind === 'market') {
        if (d.phase === 'lobby') nx.onclick = () => openRound(1);
        if (d.phase === 'trade') { nx.onclick = () => { clearInterval(H.tick); closeRound(); }; countdown(closeRound); }
        if (d.phase === 'results') nx.onclick = () => d.round >= p.rounds ? finish() : openRound(d.round + 1);
      } else {
        if (d.phase === 'lobby') nx.onclick = () => ask(1);
        if (d.phase === 'question') { nx.onclick = () => { clearInterval(H.tick); reveal(); }; countdown(reveal); }
        if (d.phase === 'reveal') nx.onclick = () => d.round >= p.rounds ? finish() : ask(d.round + 1);
      }
      if (nx) nx.focus({ preventScroll: true });
    }
    function priceTable(p, moved) {
      return `<table><thead><tr><th>Company</th><th class="n">Price</th><th class="n">${moved ? 'Change' : 'Last round'}</th></tr></thead><tbody>${(p.cos || COS).map(c => {
        const now = p.prices[c.tk], was = (p.prev || {})[c.tk], ch = was ? (now - was) / was * 100 : 0;
        return `<tr><td class="lv-co">${esc(c.name)}<small>${esc(c.tk)} · ${esc(c.what)}</small></td><td class="n">${usd(now)}</td><td class="n ${moved ? (ch >= 0 ? 'up' : 'dn') : ''}">${moved ? pct(ch) : (was ? usd(was) : '-')}</td></tr>`; }).join('')}</tbody></table>`;
    }
    addEventListener('beforeunload', e => { if (H.id && H.data && H.data.phase !== 'over') { e.preventDefault(); e.returnValue = ''; } });
  }

  /* =====================================================================
     STUDENT (any signed-in school student)
     ===================================================================== */
  const P = { game: null, open: false, skip: null, drawn: null, qty: 10, t0: 0, tick: null, lastScore: 0, busy: false };
  let timer = null;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(poll, ms); }
  async function poll() {
    const key = typeof S !== 'undefined' && S.sch && S.sch.key;
    if (!key || document.hidden || !navigator.onLine) { banner(null); return schedule(P.open ? 2000 : 10000); }
    let g = null; try { g = await C.rpc('live_poll', { p_key: key }); } catch (e) {}
    if (g && g.live) { P.game = g; if (P.open) play(); else banner(g); }
    else { if (P.open && P.game && P.game.phase !== 'over') { P.game.phase = 'over'; play(); } P.game = P.open ? P.game : null; banner(null); }
    schedule(P.open ? 1500 : 8000);
  }
  function banner(g) {
    let b = document.getElementById('live-banner');
    if (!g || g.id === P.skip || g.phase === 'over' || P.open) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'live-banner'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    const name = g.kind === 'market' ? 'Market Day' : 'Quiz Battle';
    if (b.dataset.g === g.id) return; b.dataset.g = g.id;
    b.innerHTML = `<span class="lv-dot" aria-hidden="true"></span><b>Live: ${name}</b><button class="btn sun" id="lv-join">Join</button><button class="btn ghost" id="lv-skip" aria-label="Hide">✕</button>`;
    b.querySelector('#lv-join').onclick = () => { P.open = true; P.drawn = null; b.remove(); play(); schedule(200); };
    b.querySelector('#lv-skip').onclick = () => { P.skip = g.id; b.remove(); };
  }
  function leave() { P.open = false; P.drawn = null; clearInterval(P.tick); if (P.game && P.game.phase === 'over') P.skip = P.game.id; unshell(); schedule(500); }
  function play() {
    const g = P.game; if (!g) return; const el = shell(), me = g.me || {}, p = g.pub || {}, kind = g.kind, key = g.phase + ':' + g.round;
    if (P.drawn === key) return updateNums();
    P.drawn = key; clearInterval(P.tick); let body = '';
    const top = `<div class="lv-top"><span class="lv-pill"><span class="lv-dot"></span>Live · ${kind === 'market' ? 'Market Day' : 'Quiz Battle'}</span><button class="btn ghost" id="lv-leave">${g.phase === 'over' ? 'Done' : 'Leave'}</button></div>`;
    const stats = kind === 'market'
      ? `<div class="lv-stat"><div><span>Cash</span><b id="s-cash">${usd(me.cash)}</b></div><div><span>Total worth</span><b id="s-val">${usd(me.value)}</b></div><div><span>Rank</span><b id="s-rank">#${me.rank || '-'}</b></div></div>`
      : `<div class="lv-stat"><div><span>Points</span><b id="s-score">${Number(me.score || 0).toLocaleString('en-US')}</b></div><div><span>Rank</span><b id="s-rank">#${me.rank || '-'}</b></div></div>`;
    if (g.phase === 'lobby') {
      body = `<h1>You’re in!</h1><p style="font-size:18px;margin:10px 0">Wait for your teacher to start. <span id="s-players">${g.players}</span> player${g.players === 1 ? '' : 's'} so far.</p>`;
    } else if (kind === 'market' && g.phase === 'trade') {
      body = `<div class="lv-row" style="justify-content:space-between"><span class="eyebrow">Round ${g.round} of ${p.rounds} · Market open</span><span class="mono" style="font-size:22px;font-weight:700" id="s-clock">-</span></div>
        <div class="lv-news"><span class="eyebrow">Breaking news</span><div class="h">${esc(p.news)}</div></div>${stats}
        <div class="lv-row" style="margin:14px 0 6px"><span style="font-weight:700">Shares per trade</span><span class="lv-qty" role="group" aria-label="Shares per trade">${[1, 10, 100].map(q => `<button data-q="${q}" aria-pressed="${q === P.qty}">${q}</button>`).join('')}</span></div>
        <table class="lv-trade"><thead><tr><th>Company</th><th class="n">Price</th><th class="n lv-hide-sm">You own</th><th></th></tr></thead><tbody>${(p.cos || COS).map(c => `<tr>
          <td class="lv-co">${esc(c.name)}<small>${esc(c.what)}</small></td><td class="n">${usd(p.prices[c.tk])}</td><td class="n lv-hide-sm" data-own="${esc(c.tk)}">${(me.holdings || {})[c.tk] || 0}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn" data-buy="${esc(c.tk)}" aria-label="Buy ${esc(c.name)}">Buy</button> <button class="btn ghost" data-sell="${esc(c.tk)}" aria-label="Sell ${esc(c.name)}">Sell</button></td></tr>`).join('')}</tbody></table>
        <div class="lv-msg" id="s-msg" aria-live="polite"></div>`;
    } else if (kind === 'market' && g.phase === 'results') {
      body = `<span class="eyebrow">Round ${g.round} of ${p.rounds} · Market closed</span>
        <div class="lv-news"><div class="h">${esc(p.news)}</div><div class="lv-why"><b>Why prices moved:</b> ${esc(p.why)}</div></div>${stats}
        <table style="margin-top:12px"><thead><tr><th>Company</th><th class="n">Price</th><th class="n">Change</th><th class="n lv-hide-sm">You own</th></tr></thead><tbody>${(p.cos || COS).map(c => {
          const now = p.prices[c.tk], was = (p.prev || {})[c.tk] || now, ch = (now - was) / was * 100;
          return `<tr><td class="lv-co">${esc(c.name)}</td><td class="n">${usd(now)}</td><td class="n ${ch >= 0 ? 'up' : 'dn'}">${pct(ch)}</td><td class="n lv-hide-sm">${(me.holdings || {})[c.tk] || 0}</td></tr>`; }).join('')}</tbody></table>
        <p class="muted" style="margin-top:12px">Next round starts when your teacher is ready.</p>`;
    } else if (kind === 'quiz' && g.phase === 'question') {
      P.lastScore = me.score || 0;
      body = `<div class="lv-row" style="justify-content:space-between"><span class="eyebrow">Question ${g.round} of ${p.rounds}</span><span class="mono" style="font-size:22px;font-weight:700" id="s-clock">-</span></div>
        <h2 style="margin-top:8px">${esc(p.q)}</h2><div class="lv-opts">${(p.o || []).map((t, j) => `<button class="lv-opt" data-k="${j}"${me.answered ? ' disabled' : ''}><span class="k">${LETTERS[j]}</span><span>${esc(t)}</span></button>`).join('')}</div>
        <div class="lv-msg" id="s-msg" aria-live="polite">${me.answered ? 'Answer locked in. Waiting for everyone…' : ''}</div>`;
    } else if (kind === 'quiz' && g.phase === 'reveal') {
      const got = me.pick === p.right && me.answered, gained = (me.score || 0) - P.lastScore;
      body = `<span class="eyebrow">Question ${g.round} of ${p.rounds}</span>
        <h1 style="margin:10px 0" class="${got ? 'up' : 'dn'}">${got ? 'Correct! +' + gained.toLocaleString('en-US') : me.answered ? 'Not this time' : 'Time’s up'}</h1>
        <p style="font-size:17px"><b>Answer:</b> ${esc((p.o || [])[p.right])}</p>${p.why ? `<div class="lv-news"><div class="lv-why" style="margin:0">${esc(p.why)}</div></div>` : ''}${stats}`;
      P.lastScore = me.score || 0;
    } else if (g.phase === 'over') {
      body = `<h1>Game over!</h1><p style="font-size:20px;margin:10px 0">You finished <b>#${me.rank || '-'}</b>${kind === 'market' ? ' with ' + usd(me.value) : ' with ' + Number(me.score || 0).toLocaleString('en-US') + ' points'}.</p>
        <div class="card"><h2>Top players</h2>${boardTable(g.top, kind, 5, typeof S !== 'undefined' && S.sch && S.sch.name)}</div>`;
    }
    el.innerHTML = `<div class="lv-w">${top}${body}</div>`;
    el.querySelector('#lv-leave').onclick = leave;
    if (g.phase === 'trade' || g.phase === 'question') { P.t0 = Date.now(); const secs = +p.secs || 60;
      P.tick = setInterval(() => { const left = Math.max(0, secs - Math.floor((Date.now() - P.t0) / 1000)), c = document.getElementById('s-clock'); if (c) c.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); if (!left) clearInterval(P.tick); }, 250); }
    el.querySelectorAll('.lv-qty button').forEach(b => b.onclick = () => { P.qty = +b.dataset.q; el.querySelectorAll('.lv-qty button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    el.querySelectorAll('[data-buy],[data-sell]').forEach(b => b.onclick = () => trade(b.dataset.buy || b.dataset.sell, b.dataset.buy ? P.qty : -P.qty));
    el.querySelectorAll('button.lv-opt').forEach(b => b.onclick = () => answer(+b.dataset.k, b));
  }
  function updateNums() {
    const g = P.game, me = g.me || {};
    const set = (id, v) => { const x = document.getElementById(id); if (x) x.textContent = v; };
    set('s-cash', usd(me.cash)); set('s-val', usd(me.value)); set('s-rank', '#' + (me.rank || '-')); set('s-score', Number(me.score || 0).toLocaleString('en-US')); set('s-players', g.players);
    document.querySelectorAll('[data-own]').forEach(x => { x.textContent = (me.holdings || {})[x.dataset.own] || 0; });
  }
  async function trade(tk, qty) {
    if (P.busy) return; P.busy = true; const msg = document.getElementById('s-msg'), g = P.game, have = (g.me.holdings || {})[tk] || 0;
    if (qty < 0 && have === 0) { if (msg) msg.textContent = 'You don’t own any of those yet.'; P.busy = false; return; }
    if (qty < 0 && -qty > have) qty = -have; // "Sell 100" sells what you have
    let r = null; try { r = await C.rpc('live_trade', { p_key: S.sch.key, p_game: g.id, p_tk: tk, p_qty: qty }); } catch (e) {}
    const co = COS.find(c => c.tk === tk);
    if (r && r.ok) { g.me = r.me; updateNums(); if (msg) { msg.className = 'lv-msg up'; msg.textContent = (qty > 0 ? 'Bought ' : 'Sold ') + Math.abs(qty) + ' ' + (co ? co.name : tk).replace(/\.$/, '') + '.'; } }
    else if (msg) { msg.className = 'lv-msg dn'; msg.textContent = !r ? 'Couldn’t reach the game. Try again.' : r.reason === 'cash' ? 'Not enough cash for that. Try fewer shares.' : r.reason === 'closed' ? 'The market just closed.' : 'That trade didn’t work.'; }
    P.busy = false;
  }
  async function answer(k, btn) {
    if (P.busy) return; P.busy = true; const g = P.game, msg = document.getElementById('s-msg');
    document.querySelectorAll('button.lv-opt').forEach(b => b.disabled = true); btn.classList.add('pick');
    let ok = false; try { ok = await C.rpc('live_answer', { p_key: S.sch.key, p_game: g.id, p_round: g.round, p_pick: k }); } catch (e) {}
    if (msg) msg.textContent = ok ? 'Answer locked in. Waiting for everyone…' : 'Too late for that one. Wait for the next question.';
    P.busy = false;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(300); });
  addEventListener('load', () => schedule(1500));
})();
