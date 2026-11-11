// Bullsburg "Real Life After 18": a 12-month money simulation. Pick a path after high school, set up your budget,
// then handle a year of real-life surprises. Runs after the main game script and uses its helpers (S, save, $, go, toast, ...).
(function () {
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var usd = function (n) { n = Math.round(n); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US'); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var APR = .25;

  /* ---------- paths and setup choices ---------- */
  var PATHS = [
    { id: 'job', icon: '🛒', name: 'Start working', job: 'Store associate', wage: 16, hrs: 40, ins: true, raise: 0,
      blurb: 'Full-time retail job at $16 an hour, with health insurance through work. A steady paycheck right away.' },
    { id: 'trade', icon: '⚡', name: 'Learn a trade', job: 'Electrician apprentice', wage: 19, hrs: 40, ins: true, raise: 7,
      blurb: 'Paid apprenticeship at $19 an hour. You get a raise to $21 halfway through the year as your skills grow.' },
    { id: 'college', icon: '🎓', name: 'Go to college', job: 'Student + part-time barista', wage: 15, hrs: 20, ins: false, raise: 0, loan: 3500,
      blurb: 'Community college, with grants covering most tuition. You borrow $3,500 in student loans (no payments while in school) and work 20 hours a week.' }];
  var SETUP = [
    { k: 'home', q: 'Where will you live?', o: [
      { t: 'Stay with family', d: 'Pay $300 a month toward rent and groceries.', cost: 300, happy: -4 },
      { t: 'Share an apartment', d: '$825 a month for your room and utilities.', cost: 825, happy: 4 },
      { t: 'Your own studio', d: '$1,350 a month with utilities.', cost: 1350, happy: 8 }] },
    { k: 'ride', q: 'How will you get around?', o: [
      { t: 'Bus and bike', d: '$65 a month for a bus pass.', cost: 65, happy: -3, car: false },
      { t: 'Used car', d: '$240 loan payment + $165 insurance + $130 gas = $535 a month.', cost: 535, happy: 4, car: true },
      { t: 'Newer car', d: '$520 loan payment + $215 insurance + $130 gas = $865 a month.', cost: 865, happy: 8, car: true }] },
    { k: 'food', q: 'How will you eat?', o: [
      { t: 'Cook most meals', d: 'About $300 a month.', cost: 300, happy: -2 },
      { t: 'Mix of both', d: 'About $450 a month.', cost: 450, happy: 2 },
      { t: 'Eat out a lot', d: 'About $750 a month.', cost: 750, happy: 6 }] },
    { k: 'phone', q: 'Phone plan?', o: [
      { t: 'Basic prepaid', d: '$30 a month.', cost: 30, happy: 0 },
      { t: 'Unlimited everything', d: '$85 a month.', cost: 85, happy: 3 }] },
    { k: 'save', q: 'Automatic transfer to savings each payday?', o: [
      { t: 'Nothing', d: 'Keep it all in checking.', pct: 0 },
      { t: '5% of pay', d: 'A small start.', pct: 5 },
      { t: '10% of pay', d: 'The classic "pay yourself first."', pct: 10 },
      { t: '20% of pay', d: 'Aggressive saving.', pct: 20, happy: -3 }] },
    { k: 'card', q: 'A bank offers you a starter credit card ($1,000 limit, 25% interest). Take it?', o: [
      { t: 'Yes', d: 'Builds a credit history if you pay on time. Interest is charged on any balance you carry.', card: true },
      { t: 'No thanks', d: 'No risk of card debt, but no credit history this year.', card: false }] }];

  /* ---------- taxes: an honest simplification ---------- */
  function netMonthly(gross) { var yr = gross * 12, taxable = Math.max(0, yr - 15000);
    var fed = Math.min(taxable, 12000) * .10 + Math.max(0, taxable - 12000) * .12, state = Math.max(0, yr - 8000) * .045, fica = yr * .0765;
    return { gross: gross, fed: fed / 12, state: state / 12, fica: fica / 12, net: (yr - fed - state - fica) / 12 }; }

  /* ---------- the year's surprises ---------- */
  // each: when(L) -> can it happen; t: text; o: choices with fx(L) -> lesson text
  var EV = [
    { id: 'repair', when: function (L) { return L.car; }, t: 'Your car won’t start. The mechanic says it needs a new alternator: <b>$650</b>.', o: [
      { t: 'Pay from savings', fx: function (L) { return spend(L, 650, 'save'), 'This is exactly what an emergency fund is for. Experts suggest saving 3 to 6 months of expenses.'; } },
      { t: 'Put it on a credit card', need: 'card', fx: function (L) { return spend(L, 650, 'card'), 'Fast, but if you can’t pay it off this month, 25% interest makes the repair cost more over time.'; } },
      { t: 'Skip it and take the bus for a month', fx: function (L) { L.happy -= 8; L.carDown = 1; return 'You save the money for now, but a broken car often costs more the longer you wait.'; } }] },
    { id: 'bike', when: function (L) { return !L.car; }, t: 'Your bike was stolen from outside work. A decent used one costs <b>$250</b>.', o: [
      { t: 'Buy one from savings', fx: function (L) { return spend(L, 250, 'save'), 'Small emergencies happen often. Even $500 in savings covers most of them.'; } },
      { t: 'Put it on a credit card', need: 'card', fx: function (L) { return spend(L, 250, 'card'), 'Using credit is fine if you pay the full balance when the bill comes.'; } },
      { t: 'Walk and bus for now', fx: function (L) { L.happy -= 5; return 'Free, but slower. Sometimes waiting is the right call.'; } }] },
    { id: 'trip', t: 'Friends are planning a beach weekend. Your share is <b>$275</b>.', o: [
      { t: 'Go!', fx: function (L) { spend(L, 275, 'chk'); L.happy += 10; return 'Fun matters too. A good budget includes money for the things you enjoy, planned ahead.'; } },
      { t: 'Go, and put it on the card', need: 'card', fx: function (L) { spend(L, 275, 'card'); L.happy += 10; return 'If that balance sits on the card for a year, a $275 trip ends up costing about $345.'; } },
      { t: 'Skip it this time', fx: function (L) { L.happy -= 6; return 'Saying no to some things is how you say yes to your bigger goals.'; } }] },
    { id: '401k', when: function (L) { return L.path !== 'college' && !L.k401; }, t: 'HR says you can join the retirement plan. If you put in <b>4% of your pay</b>, the company adds another 4% for free.', o: [
      { t: 'Sign up', fx: function (L) { L.k401 = 1; return 'An employer match is an instant 100% return. Starting at 18, this habit alone can grow to hundreds of thousands of dollars by retirement.'; } },
      { t: 'Not now', fx: function (L) { return 'You keep a bit more pay today, but you turned down free money from your employer.'; } }] },
    { id: 'doctor', t: 'You sprain your ankle playing ball and need urgent care.', o: [
      { t: 'Go to urgent care', fx: function (L) { var c = L.ins ? 150 : 900; spend(L, c, L.save >= c ? 'save' : 'chk'); return L.ins ? 'With your work insurance, you paid a $150 copay. Without insurance, the same visit was about $900.' : 'Without health insurance, the visit cost $900. College students can often get coverage through a parent’s plan until age 26, or through the school.'; } },
      { t: 'Tough it out at home', fx: function (L) { L.happy -= 10; return 'You saved money, but skipping care can turn a small injury into a big bill later.'; } }] },
    { id: 'scam', t: 'A text says: “Your bank account is locked. Tap here and enter your password to fix it.”', o: [
      { t: 'Tap the link and log in', fx: function (L) { L.chk -= 400; L.happy -= 8; return 'It was a scam. They took $400. Banks never ask for your password by text. Always call the number on the back of your card instead.'; } },
      { t: 'Delete it and call the bank', fx: function (L) { L.happy += 2; return 'Smart. The bank confirms it was a phishing scam. Never tap links in surprise “urgent” messages.'; } }] },
    { id: 'overtime', when: function (L) { return L.path !== 'college'; }, t: 'Your manager offers extra weekend shifts this month: about <b>$450</b> more after taxes.', o: [
      { t: 'Take the shifts', fx: function (L) { L.chk += 450; L.happy -= 6; return 'More income is the most powerful money tool there is, but balance it with rest.'; } },
      { t: 'Keep your weekends', fx: function (L) { L.happy += 3; return 'Time is valuable too. Just make sure your regular pay covers your needs.'; } }] },
    { id: 'phone', t: 'You drop your phone and the screen shatters.', o: [
      { t: 'Repair it ($180)', fx: function (L) { spend(L, 180, 'chk'); return 'Repairing is usually much cheaper than replacing.'; } },
      { t: 'Get the newest phone (4 payments of $300)', fx: function (L) { L.bnpl.push({ left: 4, amt: 300 }); L.happy += 5; return '“Buy now, pay later” makes a $1,200 phone feel cheap, but those payments now take $300 from each of your next 4 paychecks.'; } },
      { t: 'Live with the cracks', fx: function (L) { L.happy -= 3; return 'Not pretty, but $0. Wants can wait.'; } }] },
    { id: 'refund', when: function (L) { return L.m >= 3 && L.m <= 5; }, t: 'You filed your taxes and you’re getting a <b>$420 refund</b>.', o: [
      { t: 'Put it in savings', fx: function (L) { L.save += 420; return 'A refund means you overpaid taxes during the year. Saving it is a great way to build your emergency fund.'; } },
      { t: 'Spend it on new clothes', fx: function (L) { L.chk += 420; spend(L, 420, 'chk'); L.happy += 6; return 'Fun, and it was your money. Just know a refund isn’t a bonus, it’s your own pay coming back.'; } },
      { t: 'Half and half', fx: function (L) { L.save += 210; L.happy += 3; return 'A balanced choice. Many people split windfalls between fun and future.'; } }] },
    { id: 'rent', when: function (L) { return L.home !== 0 && !L.rentUp; }, t: 'Your lease renews and the rent is going up <b>$75 a month</b>.', o: [
      { t: 'Accept the increase', fx: function (L) { L.rentUp = 1; L.fixed += 75; return 'Rent often rises each year. Leave room in your budget for it.'; } },
      { t: 'Find a cheaper roommate setup', fx: function (L) { L.rentUp = 1; spend(L, 200, 'chk'); L.fixed -= 50; L.happy -= 4; return 'Moving costs money up front ($200 here) but can save more over time.'; } }] },
    { id: 'lend', t: 'A friend asks to borrow <b>$300</b> and promises to pay you back “soon.”', o: [
      { t: 'Lend it', fx: function (L) { spend(L, 300, 'chk'); L.owed = 300; return 'Only lend money you could live without getting back. We’ll see what happens.'; } },
      { t: 'Kindly say no', fx: function (L) { L.happy -= 2; return 'It’s okay to protect your budget. You could offer help in other ways.'; } }] },
    { id: 'raise', t: 'Your hard work paid off: your boss gives you a <b>5% raise</b>.', o: [
      { t: 'Raise my savings transfer too', fx: function (L) { L.wage *= 1.05; L.savePct = Math.min(30, L.savePct + 5); return 'Saving part of every raise is how people grow wealth without feeling poorer.'; } },
      { t: 'Enjoy the extra money', fx: function (L) { L.wage *= 1.05; L.happy += 4; return 'Spending all of each raise is called “lifestyle creep.” It’s why some people with high incomes still live paycheck to paycheck.'; } }] },
    { id: 'coin', t: 'A coworker swears a new meme coin will “10x by next month.” He wants you to put in <b>$500</b>.', o: [
      { t: 'Buy the coin', fx: function (L) { spend(L, 500, L.save >= 500 ? 'save' : 'chk'); var back = Math.random() < .15 ? 900 : 90; L.chk += back; return back > 500 ? 'You got lucky this time and sold for $900. Most hype coins crash, and luck isn’t a plan.' : 'The coin crashed and your $500 is now worth $90. Hype plus “guaranteed” returns are a warning sign.'; } },
      { t: 'Put $500 in an index fund instead', fx: function (L) { var from = L.save >= 500 ? 'save' : 'chk'; spend(L, 500, from); L.invest += 500; return 'An index fund owns hundreds of companies. Slow and steady has beaten most hot tips over time.'; } },
      { t: 'Pass', fx: function (L) { return 'Not investing in things you don’t understand is a solid rule.'; } }] },
    { id: 'gift', t: 'Your grandma sends <b>$100</b> for your birthday.', o: [
      { t: 'Save it', fx: function (L) { L.save += 100; return 'Every bit counts. Small deposits add up.'; } },
      { t: 'Treat yourself', fx: function (L) { L.happy += 5; return 'Enjoy it! Gifts are a great time to spend guilt-free.'; } }] },
    { id: 'pet', when: function (L) { return !L.pet; }, t: 'A shelter puppy steals your heart. Adoption is <b>$250</b>, and food and care run about <b>$70 a month</b>.', o: [
      { t: 'Adopt', fx: function (L) { spend(L, 250, 'chk'); L.pet = 1; L.fixed += 70; L.happy += 12; return 'Pets bring joy and a new monthly cost. Always count the ongoing cost, not just the price tag.'; } },
      { t: 'Not yet', fx: function (L) { return 'Waiting until your budget has room is responsible.'; } }] },
    { id: 'concert', t: 'Your favorite artist is coming to town. Tickets are <b>$160</b>.', o: [
      { t: 'Buy tickets', fx: function (L) { spend(L, 160, 'chk'); L.happy += 7; return 'Planned fun is part of a healthy budget.'; } },
      { t: 'Watch clips online', fx: function (L) { L.happy -= 2; return 'Free and you kept $160 working for you.'; } }] }];
  var HOLIDAY = { id: 'holiday', t: 'It’s the holidays. How much will you spend on gifts?', o: [
    { t: '$400 on gifts', fx: function (L) { spend(L, 400, 'chk'); L.happy += 6; return 'Generous. Planning holiday costs months ahead keeps them from becoming debt.'; } },
    { t: '$150 on gifts', fx: function (L) { spend(L, 150, 'chk'); L.happy += 4; return 'A thoughtful budget for gifts.'; } },
    { t: 'Homemade gifts ($30)', fx: function (L) { spend(L, 30, 'chk'); L.happy += 3; return 'Creative and personal. People remember the thought.'; } }] };

  // pay for something from checking, savings or card; if checking runs out it goes to the card (if any), else an overdraft fee
  function spend(L, amt, from) {
    if (from === 'save') { var s = Math.min(L.save, amt); L.save -= s; amt -= s; if (!amt) return; from = 'chk'; }
    if (from === 'card' && L.card) { var room = L.limit - L.bal, c = Math.min(room, amt); L.bal += c; amt -= c; if (!amt) return; }
    L.chk -= amt;
  }

  /* ---------- the run ---------- */
  var L = null, ST = null;
  function stage() { go('map', true); $('#map-home').hidden = true; var st = $('#stage'); st.hidden = false; window.scrollTo({ top: 0, behavior: 'auto' }); return st; }
  function frame(inner, eyebrow) { var st = stage();
    st.innerHTML = '<div class="stage life"><div class="stage-top"><button class="btn ghost" id="back">← Map</button><span class="eyebrow">' + (eyebrow || 'Real Life After 18') + '</span></div>' + inner + '</div>';
    $('#back').onclick = function () { showMap(); }; return st; }
  function money() { if (!L) return '';
    var cell = function (k, v, cls) { return '<div><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>'; };
    return '<div class="life-stats">' + cell('Checking', usd(L.chk), L.chk < 0 ? 'dn' : '') + cell('Savings', usd(L.save)) +
      (L.card ? cell('Card owed', usd(L.bal), L.bal > 0 ? 'dn' : '') : '') + cell('Credit score', L.score ? L.score : 'None yet') + cell('Happiness', mood(L.happy)) + '</div>'; }
  function mood(h) { return h >= 75 ? '😄 ' + h : h >= 55 ? '🙂 ' + h : h >= 35 ? '😐 ' + h : '😟 ' + h; }

  function home() {
    var b = S.life && S.life.best;
    frame('<h2>Real Life After 18</h2><p class="lesson-text" style="font-size:16px">Graduation day! Pick what you’ll do next, set up your first budget, then live through a whole year of paychecks, bills and surprises. Every choice has a real money lesson. Can you finish the year with savings, no card debt and a good credit score?</p>' +
      (b ? '<div class="card" style="margin-top:10px"><b>Your best year:</b> grade ' + esc(b.grade) + ' · net worth ' + usd(b.nw) + '</div>' : '') +
      (S.full ? '' : '<div class="card" style="margin-top:10px">🔑 <b>Part of the full game.</b> Look around the paths below, then subscribe (or join your class) to play the year.</div>') +
      '<h3 style="margin:18px 0 8px">Choose your path</h3><div class="life-grid">' + PATHS.map(function (p, i) { var n = netMonthly(p.wage * p.hrs * 52 / 12);
        return '<button class="life-opt" data-p="' + i + '"><span class="life-ic" aria-hidden="true">' + p.icon + '</span><b>' + esc(p.name) + '</b><small class="muted">' + esc(p.job) + '</small><span>' + esc(p.blurb) + '</span><span class="mono" style="margin-top:6px">Take-home: about ' + usd(n.net) + ' a month</span></button>'; }).join('') + '</div>');
    document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { start(PATHS[+b.dataset.p]); }; });
  }
  function start(p) {
    if (!S.full) return openPaywall(); // full game or school license
    L = { path: p.id, pathName: p.name, job: p.job, wage: p.wage, hrs: p.hrs, ins: p.ins, raiseAt: p.raise, loan: p.loan || 0, m: 0, chk: 600, save: 0, invest: 0, k401: 0, retire: 0,
      card: false, bal: 0, limit: 1000, score: 0, ontime: 0, happy: 60, fixed: 0, savePct: 0, bnpl: [], seen: {}, log: [], over: 0, interest: 0, owed: 0 };
    ST = 0; setup();
  }
  function setup() {
    var q = SETUP[ST];
    frame('<div class="qprog"><i style="width:' + (ST / SETUP.length * 100) + '%"></i></div><p class="muted" style="margin:10px 0 2px">Setting up your first budget · ' + (ST + 1) + ' of ' + SETUP.length + '</p><h2>' + esc(q.q) + '</h2>' +
      '<div class="life-grid">' + q.o.map(function (o, i) { return '<button class="life-opt" data-o="' + i + '"><b>' + esc(o.t) + '</b><span>' + esc(o.d) + '</span></button>'; }).join('') + '</div>' + budgetPeek(), 'Your first budget');
    document.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var o = q.o[+b.dataset.o];
      if (o.cost) L.fixed += o.cost; if (o.happy) L.happy += o.happy; if (o.pct != null) L.savePct = o.pct; if (o.card != null) { L.card = o.card; } if (o.car != null) L.car = o.car;
      if (q.k === 'home') L.home = +b.dataset.o; L[q.k + 'Pick'] = o.t;
      ST++; if (ST < SETUP.length) setup(); else check(); }; });
  }
  function check() { var n = netMonthly(L.wage * L.hrs * 52 / 12), left = n.net - L.fixed;
    if (left >= 150) return month();
    frame('<h2>' + (left < 0 ? 'Uh-oh: your bills are bigger than your paycheck' : 'That budget is very tight') + '</h2>' + budgetPeek() +
      '<p style="font-size:16px;margin-top:12px">' + (left < 0 ? 'Every month you’d fall ' + usd(-left) + ' further behind, and overdraft fees and card interest would pile up.' : 'With only ' + usd(left) + ' left each month, one surprise could knock you off track.') +
      ' Most people fix this by choosing cheaper housing or transportation, the two biggest costs.</p><div class="row" style="margin-top:12px"><button class="btn sun" id="life-redo">Redo my budget</button><button class="btn ghost" id="life-go">Try it anyway</button></div>', 'Your first budget');
    $('#life-redo').onclick = function () { start(PATHS.find(function (p) { return p.id === L.path; })); }; $('#life-go').onclick = month; }
  function budgetPeek() { var n = netMonthly(L.wage * L.hrs * 52 / 12);
    return '<div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>Monthly take-home pay</span><b class="mono">' + usd(n.net) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span>Monthly bills chosen so far</span><b class="mono">' + usd(L.fixed) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><span>Left for everything else</span><b class="mono ' + (n.net - L.fixed < 0 ? 'dn' : 'up') + '">' + usd(n.net - L.fixed) + '</b></div></div>'; }

  // one month: payday, bills, then a surprise
  function month() {
    L.happy = Math.max(0, Math.min(100, Math.round(L.happy))); L.m++; if (L.raiseAt && L.m === L.raiseAt) { L.wage += 2; L.log.push('Raise to $' + L.wage + '/hour'); }
    var gross = L.wage * L.hrs * 52 / 12, n = netMonthly(gross), k = L.k401 ? gross * .04 : 0, pay = n.net - k, toSave = Math.round(pay * L.savePct / 100), b = 0;
    L.bnpl = L.bnpl.filter(function (x) { b += x.amt; return --x.left > 0; });
    var bills = Math.round(L.fixed + b); L.retire += k * 2;
    L.chk += pay - toSave - bills; L.save += toSave;
    if (L.carDown) { L.chk -= 65; L.carDown = 0; }
    if (L.owed && L.m % 4 === 0) { var back = Math.random() < .5 ? L.owed : 0; L.chk += back; L.log.push(back ? 'Your friend paid back $300!' : 'Your friend still hasn’t paid you back.'); L.owed = 0; }
    L.invest *= 1 + (Math.random() * .03 - .005); L.retire *= 1.005; L.save *= 1 + .04 / 12;
    var slip = '<div class="card"><h3 style="margin:0 0 6px">Payday</h3><table class="life-t">' +
      '<tr><td>Gross pay (' + L.hrs + ' hrs/week at $' + L.wage.toFixed(2) + ')</td><td>' + usd(gross) + '</td></tr>' +
      '<tr><td>Federal income tax</td><td class="dn">-' + usd(n.fed) + '</td></tr><tr><td>State income tax</td><td class="dn">-' + usd(n.state) + '</td></tr>' +
      '<tr><td>Social Security and Medicare (FICA)</td><td class="dn">-' + usd(n.fica) + '</td></tr>' + (k ? '<tr><td>Retirement 401(k), 4% (+4% employer match)</td><td class="dn">-' + usd(k) + '</td></tr>' : '') +
      '<tr><th>Take-home pay</th><th>' + usd(pay) + '</th></tr>' +
      '<tr><td>Bills: housing, transportation, food, phone' + (L.pet ? ', pet' : '') + '</td><td class="dn">-' + usd(L.fixed) + '</td></tr>' + (b ? '<tr><td>“Pay later” installments</td><td class="dn">-' + usd(b) + '</td></tr>' : '') +
      (toSave ? '<tr><td>Automatic transfer to savings (' + L.savePct + '%)</td><td>-' + usd(toSave) + '</td></tr>' : '') + '</table></div>';
    // pick an event that fits
    var ev = L.m === 12 ? HOLIDAY : null;
    if (!ev) { var pool = EV.filter(function (e) { return !L.seen[e.id] && (!e.when || e.when(L)); }); ev = pool[Math.floor(Math.random() * pool.length)] || HOLIDAY; }
    L.seen[ev.id] = 1;
    if (L.chk < 0) overdraft();
    frame('<div class="qprog"><i style="width:' + ((L.m - 1) / 12 * 100) + '%"></i></div><h2 style="margin-top:10px">' + MONTHS[L.m - 1] + '</h2>' + money() + (L.log.length ? '<p class="life-note">' + esc(L.log.splice(0).join(' ')) + '</p>' : '') + slip +
      '<div class="card life-ev"><span class="eyebrow">Life happens</span><p style="font-size:18px;margin:6px 0 12px">' + ev.t + '</p><div class="life-grid">' +
      ev.o.map(function (o, i) { var dis = o.need === 'card' && !L.card; return '<button class="life-opt" data-e="' + i + '"' + (dis ? ' disabled title="You don’t have a credit card"' : '') + '><b>' + esc(o.t) + '</b>' + (dis ? '<small class="muted">No credit card</small>' : '') + '</button>'; }).join('') + '</div></div>',
      'Real Life After 18 · Month ' + L.m + ' of 12');
    document.querySelectorAll('[data-e]').forEach(function (b) { b.onclick = function () { var lesson = ev.o[+b.dataset.e].fx(L); if (L.chk < 0) overdraft(); after(lesson); }; });
  }
  function overdraft() { // a negative checking balance: pull from savings, then the card, then an overdraft fee
    if (L.save > 0) { var s = Math.min(L.save, -L.chk); L.save -= s; L.chk += s; L.log.push('Checking ran low, so ' + usd(s) + ' moved over from savings.'); }
    if (L.chk < 0 && L.card && L.bal < L.limit) { var c = Math.min(L.limit - L.bal, -L.chk); L.bal += c; L.chk += c; L.log.push(usd(c) + ' went on your credit card to cover bills.'); }
    if (L.chk < 0) { L.chk -= 35; L.over++; L.happy -= 6; L.log.push('Overdraft! Your bank charged a $35 fee.'); }
  }
  function after(lesson) {
    var card = L.card && L.bal > 0, min = card ? Math.min(L.bal, Math.max(35, Math.round(L.bal * .03))) : 0;
    frame('<div class="qprog"><i style="width:' + (L.m / 12 * 100) + '%"></i></div><h2 style="margin-top:10px">' + MONTHS[L.m - 1] + '</h2>' + money() +
      '<div class="card"><span class="eyebrow">Money lesson</span><p style="font-size:17px;margin:6px 0 0">' + lesson + '</p></div>' +
      (card ? '<div class="card"><h3 style="margin:0 0 4px">Your credit card bill: ' + usd(L.bal) + '</h3><p class="muted" style="margin:0 0 10px">Minimum payment ' + usd(min) + '. Any balance you don’t pay is charged 25% a year in interest (about 2% a month).</p><div class="life-grid">' +
        '<button class="life-opt" data-pay="full"' + (L.chk + L.save < L.bal ? ' disabled' : '') + '><b>Pay it all (' + usd(L.bal) + ')</b><small class="muted">No interest</small></button>' +
        '<button class="life-opt" data-pay="half"><b>Pay half (' + usd(L.bal / 2) + ')</b></button>' +
        '<button class="life-opt" data-pay="min"><b>Pay the minimum (' + usd(min) + ')</b><small class="muted">Most interest</small></button></div></div>'
        : '<button class="btn sun" id="life-next" style="margin-top:14px">' + (L.m < 12 ? 'Next month →' : 'See my year in review') + '</button>'), 'Real Life After 18 · Month ' + L.m + ' of 12');
    var next = function () { credit(); if (L.m < 12) month(); else end(); };
    if ($('#life-next')) { $('#life-next').onclick = next; $('#life-next').focus({ preventScroll: true }); }
    document.querySelectorAll('[data-pay]').forEach(function (b) { b.onclick = function () {
      var amt = b.dataset.pay === 'full' ? L.bal : b.dataset.pay === 'half' ? L.bal / 2 : min;
      spend(L, amt, L.chk >= amt ? 'chk' : 'save'); L.bal -= amt; L.paid = b.dataset.pay; if (L.chk < 0) overdraft();
      var i = L.bal * APR / 12; L.bal += i; L.interest += i; next(); }; });
  }
  function credit() { // a simplified credit score: on-time payments and low card use build it
    if (!L.card) return; if (!L.score && L.m >= 3) L.score = 650;
    if (!L.score) return; var use = L.bal / L.limit;
    L.score += 6 - (use > .3 ? 8 : 0) - (use > .7 ? 10 : 0) - (L.over ? 4 : 0); L.score = Math.max(560, Math.min(760, Math.round(L.score))); L.over = 0;
  }
  function end() {
    L.happy = Math.max(0, Math.min(100, Math.round(L.happy)));
    var nw = L.chk + L.save + L.invest + L.retire - L.bal - L.loan, ef = (L.save + Math.max(0, L.chk - L.fixed)) / Math.max(1, L.fixed), pts = 0, notes = [];
    if (ef >= 3) { pts += 3; notes.push('✓ You built an emergency fund of ' + ef.toFixed(1) + ' months of bills.' + (L.save < L.fixed ? ' Tip: keep it in a separate savings account so it isn’t spent by accident and earns interest.' : '')); } else if (ef >= 1) { pts += 2; notes.push('◐ Your savings cover ' + ef.toFixed(1) + ' months of bills. Aim for 3 to 6.'); } else { notes.push('✗ Your savings cover less than a month of bills. Try saving a set % of every paycheck.'); }
    if (!L.card) { pts += 1; notes.push('◐ No credit card means no card debt, but also no credit history yet. Using a card lightly and paying in full builds credit.'); }
    else if (L.bal < 1) { pts += 3; notes.push('✓ You ended with no credit card debt' + (L.score ? ' and a credit score of ' + L.score : '') + '.'); }
    else { pts += L.bal < 300 ? 1 : 0; notes.push('✗ You still owe ' + usd(L.bal) + ' on your card and paid ' + usd(L.interest) + ' in interest this year.'); }
    if (L.retire > 0 || L.invest > 0) { pts += 2; notes.push('✓ You started investing for the future: ' + usd(L.retire + L.invest) + ' in retirement and index funds.'); }
    else notes.push('◐ You haven’t started investing yet. Even small amounts at 18 grow a lot by retirement.');
    if (L.happy >= 55) { pts += 2; notes.push('✓ You kept life enjoyable (happiness ' + L.happy + '). A budget should include fun.'); } else notes.push('◐ Your happiness ended at ' + L.happy + '. A budget that’s too tight is hard to stick to.');
    if (L.chk < -500) { pts = Math.max(0, pts - 3); notes.unshift('✗ Your checking account ended ' + usd(-L.chk) + ' overdrawn. In real life the bank would close it and send the debt to collections, which badly hurts your credit for years.'); }
    var grade = pts >= 9 ? 'A' : pts >= 7 ? 'B' : pts >= 5 ? 'C' : pts >= 3 ? 'D' : 'F';
    var best = S.life && S.life.best; S.life = { runs: ((S.life && S.life.runs) || 0) + 1, best: !best || nw > best.nw ? { grade: grade, nw: Math.round(nw), path: L.path, at: Date.now() } : best, last: { grade: grade, nw: Math.round(nw), path: L.path } };
    save(); try { addXP(15 + pts * 3); } catch (e) {} if (pts >= 7) try { confetti(); } catch (e) {}
    var row = function (k, v, cls) { return '<tr><td>' + k + '</td><td class="' + (cls || '') + '">' + v + '</td></tr>'; };
    frame('<h2>Your year in review</h2><div class="life-grade"><b>' + grade + '</b><span>' + esc(L.pathName) + ' · ' + esc(L.job) + '</span></div>' +
      '<div class="card"><h3 style="margin:0 0 6px">Net worth: ' + usd(nw) + '</h3><table class="life-t">' + row('Checking', usd(L.chk)) + row('Savings (4% interest)', usd(L.save)) +
      (L.invest ? row('Index fund', usd(L.invest)) : '') + (L.retire ? row('401(k) retirement, with employer match', usd(L.retire)) : '') +
      (L.card ? row('Credit card owed', '-' + usd(L.bal), L.bal ? 'dn' : '') : '') + (L.loan ? row('Student loan (paid back after school)', '-' + usd(L.loan), 'dn') : '') + '</table>' +
      (L.loan ? '<p class="muted" style="margin:8px 0 0">The student loan pulls your net worth down now, but a credential usually raises earnings for decades.</p>' : '') + '</div>' +
      '<div class="card"><h3 style="margin:0 0 6px">How you did</h3>' + notes.map(function (n) { return '<p style="margin:6px 0">' + esc(n) + '</p>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn sun" id="life-again">Try a different path</button><button class="btn ghost" id="life-map">Back to the map</button></div>', 'Real Life After 18 · Year in review');
    $('#life-again').onclick = home; $('#life-map').onclick = function () { showMap(); }; L = null;
  }

  var css = document.createElement('style');
  css.textContent = '.life-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}' +
    '.life-opt{display:flex;flex-direction:column;gap:4px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;padding:14px;font:inherit;cursor:pointer;min-height:56px}' +
    '.life-opt:hover:not(:disabled){border-color:var(--accent)} .life-opt:disabled{opacity:.45;cursor:not-allowed} .life-opt b{font-size:16px} .life-opt .life-ic{font-size:28px}' +
    '.life .card{margin-top:12px} .life-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:10px 0}' +
    '.life-stats>div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.life-stats span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}.life-stats b{font-family:var(--f-mono);font-size:16px}' +
    '.life-t{width:100%;border-collapse:collapse;font-size:14px}.life-t td,.life-t th{padding:6px 4px;border-bottom:1px solid var(--line);white-space:normal}.life-t td:first-child,.life-t th:first-child{text-align:left;font-family:var(--f-body)}.life-t td:last-child,.life-t th:last-child{text-align:right;white-space:nowrap}' +
    '.life-note{background:var(--surface2);border-radius:10px;padding:8px 12px;font-size:14px}.life .dn{color:var(--down)}.life .up{color:var(--up)}' +
    '.life-grade{display:flex;align-items:center;gap:16px;margin:8px 0}.life-grade b{font-family:var(--f-display);font-size:64px;line-height:1;color:var(--sun)}';
  document.head.appendChild(css);
  window.TT_openLife = home;
})();
