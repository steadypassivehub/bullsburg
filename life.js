// Bullsburg "Life After 18": a money tycoon game. Start at 18, pick a path, then build a life:
// run businesses (upgrade, hire staff and managers, collect income, even while the app is closed),
// work and get promoted, go to school, invest, borrow, pay bills and taxes, buy a home and cars,
// and climb the net worth ladder. Real-life questions pop up as events in the middle of play.
// Runs after the main game script and uses its helpers (S, save, $, go, toast, showMap, openPaywall, addXP, confetti).
(function () {
  'use strict';
  // Español: swap English phrases for Spanish in drawn text (life_es.js). Tags are left alone; longest phrases first; whole words only.
  const ESON = typeof S !== 'undefined' && S.lang === 'es' && typeof LIFE_ES !== 'undefined';
  let ESK = null; const isL = c => !!c && /[A-Za-z]/.test(c);
  function trText(t) { const hold = [];
    for (const k of ESK) { if (t.indexOf(k) < 0) continue; let out = '', i = 0, j;
      while ((j = t.indexOf(k, i)) >= 0) { const ok = !(isL(k[0]) && isL(t[j - 1])) && !(isL(k[k.length - 1]) && isL(t[j + k.length])); out += t.slice(i, j) + (ok ? '\u0001' + (hold.push(LIFE_ES[k]) - 1) + '\u0002' : k); i = j + k.length; }
      t = out + t.slice(i); }
    return t.replace(/\u0001(\d+)\u0002/g, (m, n) => hold[+n]); }
  function tx(html) { if (!ESON || html == null) return html; if (!ESK) ESK = Object.keys(LIFE_ES).sort((a, b) => b.length - a.length);
    const parts = String(html).split(/(<[^>]*>)/), idx = [], texts = [];
    parts.forEach((p, i) => { if (p && p[0] !== '<' && /[A-Za-z]/.test(p)) { idx.push(i); texts.push(p); } });
    if (!texts.length) return html; const done = trText(texts.join('\u0003')).split('\u0003'); idx.forEach((pi, k) => { parts[pi] = done[k]; }); return parts.join(''); }
  const toast = m => window.toast(tx(m));
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = n => { n = Math.round(n || 0); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US'); };
  const big = n => { const a = Math.abs(n), s = n < 0 ? '-$' : '$';
    if (a >= 1e9) return s + (a / 1e9).toFixed(a >= 1e10 ? 1 : 2) + 'B'; if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e5) return s + Math.round(a / 1e3) + 'K'; return usd(n); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- pacing ---------- */
  const MONTH_MS = 120000;          // one game month = 2 minutes of play
  const AWAY_MONTH_MS = 3600000;    // while the app is closed, businesses earn one month of profit per real hour
  const AWAY_CAP_MS = 8 * 3600000;  // up to 8 hours away, for businesses with a manager
  const SAVE_APY = .04, CARD_APR = .25;

  /* ---------- paths after high school ---------- */
  const PATHS = [
    { id: 'job', icon: '🛒', name: 'Start working', blurb: 'Get a full-time job at a store right away, with health insurance and a steady paycheck. You can go to school later.', job: 'retail', cash: 1000 },
    { id: 'trade', icon: '⚡', name: 'Learn a trade', blurb: 'A paid electrician apprenticeship. Trade school takes 10 months, then your pay jumps.', job: 'elec', edu: 'trade', cash: 800 },
    { id: 'college', icon: '🎓', name: 'Go to college', blurb: 'Three years of college with a part-time job. You borrow for tuition, but a degree unlocks the highest-paying careers.', job: 'barista', edu: 'college', cash: 600 }];

  /* ---------- careers: monthly gross pay at each rank ---------- */
  const JOBS = {
    retail: { name: 'Retail', icon: '🛒', ins: true, ranks: [['Store associate', 2770], ['Shift lead', 3300], ['Assistant manager', 4300], ['Store manager', 5800]] },
    barista: { name: 'Coffee shop (part-time)', icon: '☕', ins: false, pt: true, ranks: [['Barista', 1300], ['Senior barista', 1500], ['Shift supervisor', 1750]] },
    elec: { name: 'Electrician', icon: '⚡', ins: true, ranks: [['Apprentice', 3290], ['Journeyman', 4800], ['Master electrician', 6800], ['Electrical contractor', 8800]], need: 'trade', needAfter: 1 },
    nurse: { name: 'Nursing', icon: '🩺', ins: true, ranks: [['Registered nurse', 6200], ['Charge nurse', 7300], ['Nurse manager', 9200]], need: 'college' },
    dev: { name: 'Software', icon: '💻', ins: true, ranks: [['Junior developer', 6500], ['Developer', 8600], ['Senior developer', 11500], ['Engineering manager', 14500]], need: 'college' },
    acct: { name: 'Accounting', icon: '📊', ins: true, ranks: [['Staff accountant', 5300], ['Senior accountant', 6800], ['Accounting manager', 8900], ['Finance director', 12500]], need: 'college' },
    teach: { name: 'Teaching', icon: '🍎', ins: true, ranks: [['Teacher', 4400], ['Senior teacher', 5100], ['Assistant principal', 7600]], need: 'college' } };
  const PROMO_MONTHS = 10;

  /* ---------- school ---------- */
  const EDU = {
    trade: { name: 'Trade school (electrician)', months: 10, cost: 4000, unlock: 'Electrician ranks above apprentice' },
    college: { name: 'College degree', months: 36, cost: 18000, unlock: 'Nursing, software, accounting and teaching careers' } };

  /* ---------- lifestyle ---------- */
  const HOMES = [
    { id: 'family', icon: '🏡', name: 'Live with family', rent: 300, h: -4, d: 'Pay $300 a month toward rent and groceries.' },
    { id: 'shared', icon: '🛋️', name: 'Share an apartment', rent: 825, h: 3, d: 'Your own room, with roommates. $825 a month.' },
    { id: 'studio', icon: '🏢', name: 'Your own studio', rent: 1350, h: 7, d: 'A place of your own. $1,350 a month.' },
    { id: 'house', icon: '🏠', name: 'Rent a house', rent: 2200, h: 11, d: 'Space for a family. $2,200 a month.' },
    { id: 'starter', icon: '🔑', name: 'Buy a starter home', price: 290000, upkeep: 450, h: 13, d: 'A $290,000 home. Taxes, insurance and repairs add about $450 a month.' },
    { id: 'dream', icon: '🏰', name: 'Buy your dream home', price: 850000, upkeep: 1300, h: 20, d: 'An $850,000 home. Taxes, insurance and repairs add about $1,300 a month.' }];
  const CARS = [
    { id: 'bus', icon: '🚌', name: 'Bus and bike', price: 0, run: 65, h: -3, d: '$65 a month for a bus pass.' },
    { id: 'used', icon: '🚗', name: 'Used car', price: 9000, run: 300, h: 4, d: '$9,000. Insurance and gas about $300 a month.' },
    { id: 'new', icon: '🚙', name: 'New car', price: 32000, run: 360, h: 8, d: '$32,000. Insurance and gas about $360 a month.' },
    { id: 'lux', icon: '🏎️', name: 'Luxury car', price: 90000, run: 560, h: 12, d: '$90,000. Insurance and gas about $560 a month.' }];
  const LIVING = 450; // food, phone and everyday costs each month
  const ECON = { boom: { name: 'Boom', icon: '🚀', rev: 1.1, mu: .006, rate: .055, inf: .05 }, normal: { name: 'Normal economy', icon: '🌤️', rev: 1, mu: 0, rate: .04, inf: .03 }, rec: { name: 'Recession', icon: '🌧️', rev: .85, mu: -.015, rate: .025, inf: .01 } };
  const HEALTH = { none: { name: 'No health insurance', cost: 0, ded: Infinity, d: 'Free each month, but you pay every medical bill in full.' },
    hdhp: { name: 'Basic plan (high deductible)', cost: 260, ded: 5000, d: '$260 a month. You pay the first $5,000 of bills each year, then insurance pays.' },
    ppo: { name: 'Full plan (low deductible)', cost: 480, ded: 1000, copay: 150, d: '$480 a month. $150 doctor visits, and you pay at most $1,000 of big bills.' } };
  const RENTALS = [{ id: 'condo', icon: '🏢', name: 'Condo', price: 160000, rent: 1450 }, { id: 'house', icon: '🏠', name: 'Rental house', price: 220000, rent: 1900 }, { id: 'duplex', icon: '🏘️', name: 'Duplex (2 units)', price: 420000, rent: 3700 }];
  const GIGS = [{ id: 'deliver', icon: '🚗', name: 'Delivery shift', pay: 110, wait: 45, d: 'Deliver food for 4 hours.' }, { id: 'dogs', icon: '🐕', name: 'Walk dogs', pay: 45, wait: 20, d: 'Walk 3 neighborhood dogs.' }, { id: 'tutor', icon: '📚', name: 'Tutor a student', pay: 80, wait: 30, d: 'Help a younger student with math.', need: () => G.degrees.length || G.edu }];
  const ACH = [['firstbiz', '🌱', 'First business', 'Start any business'], ['three', '🏪', 'Empire builder', 'Own 3 businesses at once'], ['mgr', '👔', 'The boss', 'Hire your first manager'], ['k10', '💵', 'Five figures', 'Reach $10,000 net worth'],
    ['k100', '🛋️', 'Comfortable', 'Reach $100,000 net worth'], ['m1', '💎', 'Millionaire', 'Reach $1,000,000 net worth'], ['home', '🔑', 'Homeowner', 'Buy a home'], ['degree', '🎓', 'Graduate', 'Finish school'], ['top', '🏅', 'Top of the ladder', 'Reach the top rank in a career'],
    ['ef6', '🛟', 'Safety net', 'Save 6 months of bills'], ['debtfree', '🕊️', 'Debt free', 'Have no debt after age 21'], ['inv10', '📈', 'Investor', 'Own $10,000 of stocks'], ['c800', '💳', 'Credit star', 'Reach an 800 credit score'], ['fi', '🏝️', 'Financially free', 'Passive income covers your bills'],
    ['married', '💍', 'Partners', 'Get married'], ['landlord', '🏘️', 'Landlord', 'Buy a rental property'], ['recession', '🌧️', 'Weathered the storm', 'Get through a recession without an overdraft'], ['review', '⭐', 'Star employee', 'Ace a performance review'], ['taxes', '🧾', 'Tax pro', 'File your taxes correctly'], ['retired', '🏖️', 'Retired', 'Reach 65 or retire early']];
  const TAXQ = [{ q: 'Which form shows the wages your employer paid you and the taxes it withheld?', o: ['W-2', '1099-B', 'W-4'], why: 'Employers send a W-2 each January.' },
    { q: 'When you file, more tax was withheld from your paychecks than you owed. What happens?', o: ['You get a refund', 'You pay a penalty', 'Nothing'], why: 'Overpaid tax comes back to you as a refund.' },
    { q: 'Business owners pay income tax on their business…', o: ['Profit (revenue minus expenses)', 'Total sales', 'Number of customers'], why: 'You subtract business expenses, like supplies and repairs, from revenue.' },
    { q: 'The deadline to file your federal tax return is usually…', o: ['April 15', 'January 1', 'December 31'], why: 'Returns for last year are due around April 15.' },
    { q: 'Most people take the standard deduction. It…', o: ['Lowers the income you pay tax on', 'Is a bonus check', 'Raises your tax'], why: 'About $15,000 of income for a single filer isn’t taxed at all.' },
    { q: 'Self-employed people pay extra “self-employment tax.” It covers…', o: ['Social Security and Medicare', 'Sales tax', 'Property tax'], why: 'Employers usually pay half of FICA; business owners pay both halves.' },
    { q: 'Investments you held more than a year are taxed at…', o: ['Lower long-term capital gains rates', 'Higher rates', 'Never taxed'], why: 'Holding over a year gets lower long-term rates.' },
    { q: 'Rent from a rental property you own is…', o: ['Taxable income, minus expenses like repairs', 'Always tax-free', 'Only taxed if over $1 million'], why: 'Rental profit is income, but costs like repairs and property taxes can be deducted.' }];

  /* ---------- businesses (monthly numbers at level 1) ---------- */
  // rev = monthly sales; cogs = share of sales spent on goods (food, parts, cars...); fixed = rent and other monthly overhead
  const BIZ = [
    { id: 'lawn', icon: '🌱', name: 'Lawn care', price: 400, rev: 900, cogs: .12, fixed: 140, fixedName: 'Phone, storage and trailer', sRev: 795, wage: 450, mgr: 400, staff: 'helper', d: 'Mow lawns around town. Cheap to start.',
      inv: { name: 'gas and supplies', buy: 'Buy gas and supplies' }, equip: { fix: 250, msg: ['Your mower’s engine died in the middle of a job.', 'A rock cracked your trimmer and bent the mower blade.'] } },
    { id: 'truck', icon: '🌮', name: 'Food truck', price: 15000, rev: 6500, cogs: .30, fixed: 1850, fixedName: 'Permits, propane and kitchen rental', sRev: 4571, wage: 2300, mgr: 3000, staff: 'cook', d: 'Tacos at lunch, events on weekends.',
      inv: { name: 'food and ingredients', buy: 'Buy food' }, equip: { fix: 1800, msg: ['The food truck’s generator broke down. No power means no cooking.', 'The truck’s engine overheated and needs a new water pump.', 'The fridge in the truck stopped cooling, and you had to throw out food.'] } },
    { id: 'repair', icon: '📱', name: 'Phone repair shop', price: 40000, rev: 14000, cogs: .25, fixed: 5000, fixedName: 'Shop rent and utilities', sRev: 8000, wage: 3400, mgr: 4200, staff: 'technician', d: 'Fix cracked screens and dead batteries.',
      inv: { name: 'replacement screens and batteries', buy: 'Buy parts' }, equip: { fix: 900, msg: ['Your screen press and soldering station broke.', 'A power surge fried your diagnostic computer.'] } },
    { id: 'cars', icon: '🚘', name: 'Used car lot', price: 120000, rev: 42000, cogs: .62, fixed: 3960, fixedName: 'Lot rent, lights and ads', sRev: 36842, wage: 4500, mgr: 6000, staff: 'salesperson', d: 'Buy cars at auction, fix them up, sell them fair.',
      inv: { name: 'cars bought at auction', buy: 'Buy cars at auction' }, equip: { fix: 3500, msg: ['Three cars you bought need new transmissions before anyone will buy them.', 'The lift in your service bay broke, so you can’t fix cars to sell.'] } },
    { id: 'gym', icon: '🏋️', name: 'Gym', price: 300000, rev: 70000, cogs: 0, fixed: 45000, fixedName: 'Rent, power and cleaning', sRev: 18000, wage: 3800, mgr: 7000, staff: 'trainer', d: 'Memberships bring in money every month.',
      equip: { fix: 4000, msg: ['Half the treadmills broke, and members are canceling.', 'The air conditioning died in July. Members are not happy.'] } },
    { id: 'apts', icon: '🏘️', name: 'Apartment building', price: 900000, rev: 120000, cogs: 0, fixed: 70000, fixedName: 'Property taxes, utilities and upkeep', sRev: 9000, wage: 4000, mgr: 8000, staff: 'maintenance worker', d: '40 units of rent. Real estate pays you monthly.',
      equip: { fix: 15000, msg: ['The building’s boiler failed in winter. Tenants have no heat and some stopped paying rent.', 'The roof is leaking into the top-floor apartments.'] } },
    { id: 'tech', icon: '🚀', name: 'Tech startup', price: 2500000, rev: 400000, cogs: .1, fixed: 210000, fixedName: 'Office rent and software', sRev: 133333, wage: 11000, mgr: 15000, staff: 'engineer', d: 'Build an app millions of people use.',
      cogsName: 'Servers and cloud computing', equip: { fix: 20000, msg: ['A server crash took your app offline for two days.', 'Hackers found a security hole. You need experts to fix it fast.'] } }];
  const BY = Object.fromEntries(BIZ.map(b => [b.id, b]));
  const MAXLVL = 10;
  const upCost = (t, lvl) => Math.round(t.price * .5 * Math.pow(1.55, lvl - 1));
  const maxStaff = b => 1 + b.lvl;
  const fixCost = b => Math.round(BY[b.id].equip.fix * Math.pow(1.25, b.lvl - 1));
  const UNITS = { low: 1.25, normal: 1, premium: .8 }, PRICE = { low: .85, normal: 1, premium: 1.25 }, ADS = [[1, 0], [1.12, .05], [1.3, .11]];
  function bizNums(b) { const t = BY[b.id], m = Math.pow(1.3, b.lvl - 1), rep = b.rep || 1, slow = b.slow > 0 ? .85 : 1, down = b.broken ? .2 : 1, inf = G ? infl() : 1, ec = G ? EC().rev : 1;
    const base = (t.rev + t.sRev * b.staff) * m * inf, u = UNITS[b.price || 'normal'] * ADS[b.ads || 0][0] * ec, rev = base * u * PRICE[b.price || 'normal'] * rep * slow * down,
      cogs = base * u * rep * slow * down * t.cogs * (t.cogs ? (b.costUp || 1) : 1), adsCost = base * ADS[b.ads || 0][1],
      fixed = t.fixed * Math.pow(1.15, b.lvl - 1) * inf * (t.cogs ? 1 : (b.costUp || 1)) + adsCost, wage = t.wage * b.staff * (b.raise || 1) * inf,
      mgr = b.mgr ? t.mgr : 0, ins = b.ins ? Math.round(t.price * .004 + 40) : 0, maint = b.maint ? Math.round(fixCost(b) * .06) : 0,
      over = fixed + wage + mgr + ins + maint, gross = rev - cogs - over, profit = gross > 0 ? gross * (1 - (b.share || 0)) : gross;
    return { rev, cogs, fixed, wage, mgr, ins, maint, over, gross, profit, cash: profit + (t.inv ? cogs : 0), cap: t.inv ? base * u * t.cogs * (b.costUp || 1) : 0, adsCost }; }
  function runBiz(b, n, frac) { // one slice of time: use up stock, return the cash it brings in
    const t = BY[b.id]; let r = 1;
    if (t.inv) { const need = n.cogs * frac; r = need > 0 ? Math.min(1, (b.stock || 0) / need) : 1; b.stock = Math.max(0, (b.stock || 0) - need * r); b.empty = r < 1; }
    const g = (n.rev - n.cogs) * r - n.over, prof = g > 0 ? g * (1 - (b.share || 0)) : g;
    return (prof + (t.inv ? n.cogs * r : 0)) * frac; }
  function restock(b, auto) { const t = BY[b.id]; if (!t.inv) return 0; const n = bizNums(b), c = Math.max(0, n.cap - (b.stock || 0)); if (c < 1) return 0;
    if (G.cash < c) { if (!auto) toast('You need ' + usd(c) + ' to restock.'); return 0; } pay(c, 'Bought ' + t.inv.name); G.ytd.biz -= c; b.stock = n.cap; b.empty = false; return c; }
  const bizValue = b => b.spent * .6;

  /* ---------- investing ---------- */
  const PICKS = ['EVRY', 'GRDN', 'PIGB', 'BYTC', 'ZMTR'];
  function stockList() { const src = typeof STOCKS !== 'undefined' ? STOCKS : [];
    return PICKS.map(sym => { const s = src.find(x => x.sym === sym) || { sym, name: sym, p: 50, sig: .015 };
      return { sym, name: s.name, desc: s.desc || '', p0: s.p, sigM: (s.sig || .015) * Math.sqrt(21) * (sym === 'EVRY' ? 1.4 : 1), muM: sym === 'EVRY' ? .006 : .007, div: s.div || 0 }; }); }
  const STK = stockList();

  /* ---------- taxes (simplified 2025 single filer) ---------- */
  function fedTax(yr) { let t = 0, prev = 0, inc = Math.max(0, yr - 15000);
    for (const [cap, r] of [[11925, .10], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [626350, .35], [Infinity, .37]]) { if (inc > prev) t += (Math.min(inc, cap) - prev) * r; prev = cap; }
    return t; }
  function paycheck(gross) { const yr = gross * 12, fed = fedTax(yr) / 12, state = Math.max(0, yr - 8000) * .045 / 12, fica = gross * .0765;
    return { gross, fed, state, fica, net: gross - fed - state - fica }; }

  /* ---------- the net worth ladder ---------- */
  const LADDER = [[-Infinity, '😟', 'In debt'], [0, '🌱', 'Starting out'], [5000, '🙂', 'Getting by'], [25000, '🧱', 'Stable'], [100000, '🛋️', 'Comfortable'],
    [500000, '⛵', 'Well off'], [1e6, '💎', 'Millionaire'], [1e7, '🏙️', 'Multimillionaire'], [1e8, '👑', 'Tycoon'], [1e9, '🚀', 'Billionaire']];
  const rung = nw => { let i = 0; LADDER.forEach((r, j) => { if (nw >= r[0]) i = j; }); return i; };

  /* ---------- state ---------- */
  let G = null, timer = 0, modal = false, tab = 'biz', lastSave = 0, lastTick = 0;
  const loanPay = (P, apr, n) => { const r = apr / 12; return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n; };
  function newGame(p) {
    const g = { v: 2, age: 18, m: 0, t: 0, last: Date.now(), cash: p.cash, save: 0, retire: 0, k401: 0, happy: 60, score: 0, card: null, loans: [],
      job: { id: p.job, rank: 0, months: 0 }, edu: null, degrees: [], home: 'family', homeVal: 0, car: 'bus', carVal: 0, biz: [], stocks: {}, prices: {},
      ytd: { biz: 0, gains: 0, div: 0 }, seen: {}, ledger: [], nextEv: 50000, bestRung: 1, over: 0, pet: 0, owed: 0, bnpl: [], path: p.id, slip: null, hist: [] };
    STK.forEach(s => { g.prices[s.sym] = s.p0; }); ensure(g); g.cash += (S.lifeLegacy || 0) * 500; g.gen = ((S.life && S.life.gen) || 0) + 1;
    if (p.edu) { const e = EDU[p.edu]; g.edu = { id: p.edu, left: e.months };
      if (p.edu === 'college') addLoan(g, 'student', 'Student loan', e.cost * .7, .065, 120, 'school');
      else addLoan(g, 'student', 'Trade school loan', e.cost * .5, .065, 60, 'school'); }
    return g; }
  function ensure(g) { // defaults for features added later, so older saves keep working
    const d = { econ: { phase: 'normal', left: 14, infl: 1 }, health: 'none', renters: 0, lifeIns: 0, partner: null, kids: [], rentals: [], ach: {}, missed: 0, ontime: 0, negMonths: 0, collections: null, gigAt: {}, fi: 0, retired: 0, gen: 1, ytdWh: 0, recOver: 0 };
    Object.keys(d).forEach(k => { if (g[k] === undefined) g[k] = d[k]; }); return g; }
  function addLoan(g, kind, name, amt, apr, n, defer) { g.loans.push({ kind, name, bal: amt, apr, n, pay: loanPay(amt, apr, n), defer: defer || '' }); }

  /* ---------- money helpers ---------- */
  function pay(amt, why) { // take money from cash; shortfalls are handled at month end by cover()
    G.cash -= amt; if (why) log(why, -amt); }
  function earn(amt, why) { G.cash += amt; if (why) log(why, amt); }
  function log(t, amt) { G.ledger.unshift({ m: G.m, t, amt: Math.round(amt) }); G.ledger.length = Math.min(G.ledger.length, 40); }
  function cover() { // checking below zero: savings first, then the credit card, then an overdraft fee
    if (G.cash >= 0) return '';
    let note = '';
    if (G.save > 0) { const s = Math.min(G.save, -G.cash); G.save -= s; G.cash += s; note += usd(s) + ' moved from savings to cover bills. '; }
    if (G.cash < 0 && G.card && G.card.bal < G.card.limit) { const c = Math.min(G.card.limit - G.card.bal, -G.cash); G.card.bal += c; G.cash += c; note += usd(c) + ' went on your credit card. '; }
    if (G.cash < 0) { G.cash -= 35; G.over++; G.missed++; G.happy -= 5; if (G.score) G.score -= 15; note += 'Overdraft! The bank charged a $35 fee, and a missed payment hurts your credit.'; log('Overdraft fee', -35); }
    return note; }
  const debts = () => G.loans.reduce((a, l) => a + l.bal, 0) + (G.card ? G.card.bal : 0);
  const stockVal = () => Object.keys(G.stocks).reduce((a, k) => a + G.stocks[k].sh * G.prices[k], 0);
  const homeOwned = () => !!HOMES.find(h => h.id === G.home && h.price);
  function netWorth() { return G.cash + G.save + G.retire + stockVal() + G.biz.reduce((a, b) => a + bizValue(b), 0) + (homeOwned() ? G.homeVal : 0) + G.carVal + (G.rentals || []).reduce((a, r) => a + r.val, 0) - debts(); }
  function blockedUp() { const j = G.job && JOBS[G.job.id]; return !!(j && j.need && !G.degrees.includes(j.need) && G.job.rank + 1 >= (j.needAfter || 0)); }
  const infl = () => (G.econ && G.econ.infl) || 1, EC = () => ECON[(G.econ && G.econ.phase) || 'normal'];
  function jobGross() { if (!G.job) return 0; const j = JOBS[G.job.id]; return j.ranks[G.job.rank][1] * infl(); }
  const jobIns = () => G.job && JOBS[G.job.id].ins;
  const healthCost = () => jobIns() ? 0 : HEALTH[G.health || 'none'].cost * infl();
  function medCost(bill) { if (jobIns()) return bill < 2000 ? 150 : Math.min(bill, 1500); const h = HEALTH[G.health || 'none']; if (h.copay && bill < 2000) return h.copay; return Math.min(bill, h.ded); }
  const kidAge = k => G.m - k.born;
  const kidCost = () => G.kids.reduce((a, k) => a + (kidAge(k) < 60 ? 1100 : kidAge(k) < 216 ? 450 : 0), 0) * infl();
  const partnerNet = () => G.partner && G.partner.stage === 'married' ? paycheck(G.partner.inc * infl()).net : 0;
  const insCost = () => healthCost() + (G.renters ? 18 : 0) + (G.lifeIns ? 35 : 0);
  function familyCost() { return (G.partner && G.partner.stage === 'married' ? 350 * infl() : 0) + kidCost() - G.kids.filter(k => kidAge(k) < 204).length * 167; }
  function rentalNums(r) { const t = RENTALS.find(x => x.id === r.id), rent = r.vacant ? 0 : t.rent * infl() * (r.bump || 1), costs = r.val * .017 / 12 + t.rent * infl() * .08 + (r.mgr ? t.rent * infl() * .1 : 0), loan = G.loans.find(l => l.rid === r.key);
    return { t, rent, costs, pay: loan ? loan.pay : 0, net: rent - costs - (loan ? loan.pay : 0) }; }
  function monthlyBills() { const h = HOMES.find(x => x.id === G.home), c = CARS.find(x => x.id === G.car);
    return ((h.rent || h.upkeep || 0) + c.run + LIVING + (G.pet ? 70 : 0)) * infl() + insCost() + familyCost() + G.loans.reduce((a, l) => a + (l.rid || (l.defer && l.defer === 'school' && G.edu) ? 0 : l.pay), 0); }
  function passive() { const divs = STK.reduce((a, s) => a + (s.div && G.stocks[s.sym] ? s.div * G.stocks[s.sym].sh * 4 / 12 : 0), 0);
    return G.biz.filter(b => b.mgr).reduce((a, b) => a + Math.max(0, bizNums(b).profit), 0) + G.rentals.reduce((a, r) => a + rentalNums(r).net, 0) + divs + (stockVal() + G.retire) * .04 / 12; }
  const bizProfit = () => G.biz.reduce((a, b) => a + bizNums(b).profit, 0);
  function grade() { // money health, shown to teachers as the Real Life grade
    const bills = monthlyBills(), ef = (G.save + Math.max(0, G.cash)) / Math.max(1, bills); let pts = 0;
    if (ef >= 3) pts += 3; else if (ef >= 1) pts += 2;
    if (!G.card || G.card.bal < 1) pts += 2; if (G.over === 0) pts += 1;
    if (stockVal() + G.retire > 0) pts += 2; if (netWorth() > 0) pts += 1; if (G.happy >= 55) pts += 1;
    return pts >= 9 ? 'A' : pts >= 7 ? 'B' : pts >= 5 ? 'C' : pts >= 3 ? 'D' : 'F'; }
  function persist(force) { if (!G) return; const now = Date.now(); G.last = now; if (!force && now - lastSave < 15000) return; lastSave = now;
    const nw = Math.round(netWorth()), best = S.life && S.life.best;
    S.life = { v: 2, g: G, runs: (S.life && S.life.runs) || 1, trial: !!(S.life && S.life.trial), best: !best || nw > (best.nw || -Infinity) ? { grade: grade(), nw, path: G.path, at: now } : best };
    try { save(); } catch (e) {} }

  /* ---------- the clock ---------- */
  function startClock() { stopClock(); lastTick = Date.now(); timer = setInterval(tick, 250); }
  function stopClock() { if (timer) clearInterval(timer); timer = 0; if (G) persist(true); }
  function onScreen() { const st = $('#stage'); return st && !st.hidden && st.querySelector('.tyc') && !document.hidden; }
  function tick() {
    if (!G || !onScreen()) { stopClock(); return; }
    const now = Date.now(), dt = Math.min(1000, now - lastTick); lastTick = now;
    if (modal || G.paused) { G.last = now; return; }
    if (trialOver()) { trialEnd(); return; } // free players: ends after the first month's paycheck screen is closed
    G.t += dt; accrue(dt / MONTH_MS);
    if (G.t >= MONTH_MS) { G.t -= MONTH_MS; monthEnd(); }
    if (G.quiz && G.quiz.length && !modal) { quizDue(); return; }
    if (tab === 'job') { document.querySelectorAll('[data-gigw]').forEach(el => { const g = GIGS.find(x => x.id === el.dataset.gigw), left = Math.ceil(((G.gigAt[g.id] || 0) + g.wait * 1000 - Date.now()) / 1000); el.textContent = tx(left > 0 ? 'ready in ' + left + 's' : 'ready'); }); }
    G.nextEv -= dt; if (G.nextEv <= 0 && !modal) { G.nextEv = 70000 + Math.random() * 110000; const ev = chooseEvent(); if (ev) showEvent(ev); }
    live(); persist(false); }
  function accrue(frac) { // business cash fills each till; managers deposit it and restock for you
    G.biz.forEach(b => { const n = bizNums(b), c = runBiz(b, n, frac);
      if (b.mgr) { G.cash += c; G.ytd.biz += c; b.made = (b.made || 0) + c; if (BY[b.id].inv && (b.stock || 0) < n.cap * .3) restock(b, true); }
      else if (c < 0) { G.cash += c; G.ytd.biz += c; }
      else { b.till = Math.min(Math.max(0, n.cash), (b.till || 0) + c); } }); }
  function away() { // what businesses earned while you were gone
    const ms = Date.now() - (G.last || Date.now()); if (ms < 60000) return null;
    const frac = Math.min(ms, AWAY_CAP_MS) / AWAY_MONTH_MS; let auto = 0, filled = 0, capped = false, ran = false;
    G.biz.forEach(b => { const n = bizNums(b); if (n.profit <= 0) return;
      if (b.mgr) { const p = n.profit * frac; auto += p; G.cash += p; G.ytd.biz += p; b.made = (b.made || 0) + p; }
      else { const before = b.stock, c = runBiz(b, n, Math.min(frac, 1.5)), add = Math.max(0, Math.min(n.cash - (b.till || 0), c)); if (add < c - 1) capped = true; if (BY[b.id].inv && before > 0 && b.empty) ran = true; if (add > 0) { b.till = (b.till || 0) + add; filled += add; } } });
    G.last = Date.now(); return { ms, auto, filled, capped, ran, over: ms > AWAY_CAP_MS }; }

  /* ---------- end of each month ---------- */
  function monthEnd() {
    G.m++; const notes = [];
    if (G.m % 12 === 0) { G.age++; notes.push('🎂 Happy birthday! You’re ' + G.age + '.'); }
    // paycheck
    let slip = null;
    if (G.job) { const gross = jobGross(), pc = paycheck(gross), k = G.k401 ? gross * .04 : 0; slip = Object.assign({}, pc, { k401: k, take: pc.net - k, job: JOBS[G.job.id].ranks[G.job.rank][0] });
      G.cash += slip.take; G.retire += k * 2; G.job.months++; log('Paycheck (' + slip.job + ')', slip.take);
      const j = JOBS[G.job.id], canRise = G.job.rank < j.ranks.length - 1, blocked = blockedUp();
      if (canRise && !blocked && G.job.months >= PROMO_MONTHS) { G.job.rank++; G.job.months = 0; notes.push('🎉 Promotion! You’re now ' + j.ranks[G.job.rank][0] + ', earning ' + usd(j.ranks[G.job.rank][1]) + ' a month before taxes.'); try { addXP(20); } catch (e) {} }
      else if (canRise && blocked && G.job.months === PROMO_MONTHS) notes.push('To move up as an ' + j.ranks[G.job.rank][0].toLowerCase() + ', you need to finish ' + EDU[j.need].name.toLowerCase() + '.'); }
    if (slip) { G.ytdWh += slip.fed; if (jobIns()) { slip.health = 150 * infl(); slip.take -= slip.health; G.cash -= slip.health; } }
    G.slip = slip;
    const pn = partnerNet(); if (pn) earn(pn, 'Partner’s paycheck');
    // school
    if (G.edu) { G.edu.left--; if (G.job && !JOBS[G.job.id].pt) G.happy -= 1.5;
      if (G.edu.left <= 0) { const e = EDU[G.edu.id]; G.degrees.push(G.edu.id); notes.push('🎓 You finished ' + e.name.toLowerCase() + '! Unlocked: ' + e.unlock + '.'); G.edu = null; G.loans.forEach(l => { if (l.defer === 'school') l.defer = ''; }); try { addXP(40); confetti(); } catch (e) {} } }
    // exams and reviews
    if (G.edu) { if (G.edu.next == null) G.edu.next = EXAM.every; if (--G.edu.next <= 0 && G.edu.left > 0) { (G.quiz = G.quiz || []).push('exam'); G.edu.next = EXAM.every; } }
    if (G.job) { if (G.job.review == null) G.job.review = REVIEW.every; if (--G.job.review <= 0) { (G.quiz = G.quiz || []).push('review'); G.job.review = REVIEW.every; } }
    // bills
    const h = HOMES.find(x => x.id === G.home), c = CARS.find(x => x.id === G.car);
    pay((h.rent || h.upkeep) * infl(), h.rent ? 'Rent' : 'Home taxes, insurance and repairs'); pay(c.run * infl(), c.id === 'bus' ? 'Bus pass' : 'Car insurance and gas'); pay(LIVING * infl(), 'Food, phone and everyday costs');
    if (G.pet) pay(70 * infl(), 'Pet food and care');
    if (insCost() >= 1) pay(insCost(), 'Insurance (' + [!jobIns() && G.health !== 'none' ? 'health' : '', G.renters ? 'renters' : '', G.lifeIns ? 'life' : ''].filter(Boolean).join(', ') + ')');
    const fc = familyCost(); if (fc > 0) pay(fc, G.kids.length ? 'Childcare and family costs (after child tax credit)' : 'Shared household costs');
    G.rentals.forEach(r => { const n = rentalNums(r); if (n.rent) earn(n.rent, 'Rent from your ' + n.t.name.toLowerCase()); else notes.push('🏚️ Your ' + n.t.name.toLowerCase() + ' sat empty this month, but the mortgage and costs still came due.'); pay(n.costs, n.t.name + ' taxes, insurance and upkeep'); G.ytd.biz += n.rent - n.costs; if (r.vacant) r.vacant--;
      r.val *= G.econ.phase === 'rec' ? .998 : G.econ.phase === 'boom' ? 1.005 : 1.003; });
    G.bnpl = G.bnpl.filter(x => { pay(x.amt, '“Pay later” installment'); return --x.left > 0; });
    G.loans.forEach(l => { if (l.defer && G.edu) { l.bal *= 1 + l.apr / 12; return; } const interest = l.bal * l.apr / 12, p = Math.min(l.pay, l.bal + interest); l.bal = l.bal + interest - p; pay(p, l.name + ' payment'); });
    G.loans = G.loans.filter(l => l.bal > 1);
    // credit card: pay in full if you can, otherwise interest is charged
    if (G.card && G.card.bal > 0) { if (G.cash >= G.card.bal && G.card.auto) { pay(G.card.bal, 'Credit card paid in full'); G.card.bal = 0; }
      else { const min = Math.min(G.card.bal, Math.max(35, G.card.bal * .03)); pay(min, 'Credit card minimum payment'); G.card.bal -= min; const i = G.card.bal * CARD_APR / 12; G.card.bal += i; if (i > 1) notes.push('💳 You carried ' + usd(G.card.bal) + ' on your card and paid ' + usd(i) + ' in interest this month.'); } }
    // growth
    G.save *= 1 + EC().rate / 12; G.retire *= 1.006 + EC().mu * .5; if (homeOwned()) G.homeVal *= 1.003; G.carVal *= .985;
    STK.forEach(s => { const z = gauss(), r = s.muM + EC().mu - s.sigM * s.sigM / 2 + s.sigM * z + (G.shock && G.shock.sym === s.sym ? G.shock.r : 0); G.prices[s.sym] = Math.max(1, G.prices[s.sym] * Math.exp(r));
      if (s.div && G.m % 3 === 0 && G.stocks[s.sym]) { const d = s.div * G.stocks[s.sym].sh; if (d >= .5) { earn(d, 'Dividend from ' + s.sym); G.ytd.div += d; } } });
    G.shock = null;
    G.biz.forEach(b => { const t = BY[b.id]; if (!b.broken && t.equip && G.m > 1 && Math.random() < (b.maint ? .025 : .09)) { const c = fixCost(b); b.broken = { cost: c, msg: pick(t.equip.msg) };
        if (b.mgr && G.cash >= c) { pay(c, 'Repairs at your ' + t.name.toLowerCase()); G.ytd.biz -= c; notes.push('🔧 ' + b.broken.msg + ' Your manager paid ' + usd(c) + ' to fix it right away. Repairs are a normal cost of running a business.'); b.broken = null; }
        else notes.push('🔧 ' + b.broken.msg + ' Sales at your ' + t.name.toLowerCase() + ' are down 80% until you pay ' + usd(c) + ' to repair it (Business tab).' + (b.ins ? ' Insurance doesn’t cover normal wear and tear.' : '')); }
      if (b.slow > 0) b.slow--; if (b.rep && b.rep !== 1) b.rep = 1 + (b.rep - 1) * .8; if (Math.abs((b.rep || 1) - 1) < .01) b.rep = 1; });
    if (G.owed && G.m % 4 === 0) { if (Math.random() < .5) { earn(G.owed, 'Your friend paid you back'); notes.push('🤝 Your friend paid back ' + usd(G.owed) + '!'); } else notes.push('Your friend still hasn’t paid you back. Lending to friends can cost the money and the friendship.'); G.owed = 0; }
    // happiness drifts toward what your lifestyle supports
    const base = 52 + h.h + c.h + (G.pet ? 6 : 0); G.happy += (base - G.happy) * .15; G.happy = clamp(Math.round(G.happy), 0, 100);
    // the economy changes every year or so, and prices rise each year (inflation)
    G.econ.left--; if (G.econ.left <= 0) { const was = G.econ.phase, nx = was === 'normal' ? (Math.random() < .35 ? 'rec' : Math.random() < .5 ? 'boom' : 'normal') : 'normal'; G.econ.phase = nx; G.econ.left = 8 + Math.floor(Math.random() * 12);
      if (was === 'rec' && !G.recOver) { G.ach.recession = G.ach.recession || G.m; }
      if (nx !== was) notes.push(ECON[nx].icon + ' ' + (nx === 'rec' ? 'Recession! The economy is shrinking. Customers spend less (business sales −15%), stock prices tend to fall, some companies cut jobs, and interest rates drop. Recessions usually last months, not years. An emergency fund is your best protection.' : nx === 'boom' ? 'Economic boom! People are spending: business sales are up 10% and stocks tend to rise, but prices (inflation) rise faster too, and interest rates go up.' : 'The economy is back to normal.')); if (nx === 'rec') G.recOver = 0; }
    if (G.econ.phase === 'rec' && G.over) G.recOver = 1;
    if (G.m % 12 === 0) { const r = EC().inf + (Math.random() - .5) * .01; G.econ.infl *= 1 + r; notes.push('📈 Inflation: prices rose ' + (r * 100).toFixed(1) + '% this year. Rent, food, wages and business costs all went up. Money sitting in cash loses buying power; investments that grow faster than inflation keep up.'); }
    // year-end taxes: file a return
    if (G.m % 12 === 0) { const bt = Math.max(0, G.ytd.biz) * .22, gt = Math.max(0, G.ytd.gains) * .15 + G.ytd.div * .15;
      G.taxdue = { bt, gt, biz: G.ytd.biz, gains: G.ytd.gains, div: G.ytd.div, wh: G.ytdWh, refund: G.ytdWh * .05, wages: G.slip ? G.slip.gross * 12 : 0 }; (G.quiz = G.quiz || []).push('tax');
      G.ytd = { biz: 0, gains: 0, div: 0 }; G.ytdWh = 0; }
    const cv = cover(); if (cv) notes.push(cv);
    if (G.over) G.negMonths++; else G.negMonths = 0;
    if (G.negMonths >= 3 && G.collections == null) { G.collections = G.m; if (G.score) G.score -= 80; pay(150, 'Collection agency fee'); notes.push('📞 Your overdue bills were sent to a collection agency. Your credit score dropped about 80 points, and this stays on your credit report for 7 years. Get your checking account back above $0.'); }
    if ((G.card || G.loans.length) && !G.over) G.ontime++;
    if (G.card || G.loans.length) { if (!G.score && G.m >= 3) G.score = 650; if (G.score) { const use = G.card ? G.card.bal / G.card.limit : 0; G.score += (G.over ? 0 : (G.card && G.card.bal < 1 ? 3 : 2)) - (use > .3 ? 8 : 0) - (use > .7 ? 10 : 0); G.score = clamp(Math.round(G.score), 480, 850); } }
    G.over = 0;
    const nw = netWorth(), r = rung(nw); G.hist.push(Math.round(nw)); if (G.hist.length > 60) G.hist.shift();
    // financial independence and retirement
    if (!G.fi && G.m > 6 && passive() >= monthlyBills()) { G.fi = G.m; notes.push('🏝️ Financial independence! Your passive income (' + usd(passive()) + '/month from managed businesses, rentals and investments) now covers all your bills (' + usd(monthlyBills()) + '). Work is now a choice.'); try { addXP(60); confetti(); } catch (e) {} }
    if (G.age >= 65 && !G.retired) (G.quiz = G.quiz || []).push('retire');
    checkAch();
    if (r > G.bestRung) { G.bestRung = r; notes.push('🏆 New net worth level: ' + LADDER[r][1] + ' ' + LADDER[r][2] + '!'); try { addXP(25 + r * 5); confetti(); } catch (e) {} }
    toast(MONTHS[(G.m - 1) % 12] + ' done' + (slip ? ' · paycheck +' + usd(slip.take) : '') + ' · bills -' + usd(monthlyBills()));
    if (notes.length) note(notes);
    persist(true); render(); }
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- events: the real-life questions, popping up mid-play ---------- */
  const anyBiz = () => G.biz.length > 0, food = () => G.biz.some(b => b.id === 'truck'), staffed = () => G.biz.some(b => b.staff > 0);
  const topBiz = () => G.biz.slice().sort((a, b) => bizNums(b).rev - bizNums(a).rev)[0];
  const hasCar = () => G.car !== 'bus', working = () => G.job && !JOBS[G.job.id].pt;
  const EV = [
    // business
    { id: 'complaint', when: anyBiz, t: () => { const b = topBiz(); return 'A customer posts an angry one-star review of your <b>' + esc(BY[b.id].name.toLowerCase()) + '</b>: “Rude service and I waited 40 minutes!” People are reading it.'; }, o: [
      { t: 'Reply politely, apologize and offer a refund ($60)', fx: () => { pay(60, 'Refund to an unhappy customer'); topBiz().rep = 1.06; return 'Handled well. A calm, public apology shows other customers you care, and many will try you anyway. Your sales get a small boost.'; } },
      { t: 'Argue back in the comments', fx: () => { const b = topBiz(); b.rep = .82; return 'Ouch. Arguing online made more people notice the review. Sales at your ' + BY[b.id].name.toLowerCase() + ' drop for a few months while your reputation recovers.'; } },
      { t: 'Ignore it', fx: () => { topBiz().rep = .94; return 'Silence looks like you don’t care. Sales dip a little. Most experts say to respond quickly, briefly and politely.'; } }] },
    { id: 'raise', when: staffed, t: () => 'Your best employee asks for a <b>10% raise</b>. They say another business offered them more.', o: [
      { t: 'Give the raise', fx: () => { const b = G.biz.find(x => x.staff > 0); b.raise = (b.raise || 1) * 1.05; return 'Wages go up, but keeping a great worker is usually cheaper than hiring and training a new one, which can cost a few months of pay.'; } },
      { t: 'Offer a one-time $500 bonus instead', fx: () => { pay(500, 'Employee bonus'); if (Math.random() < .5) return 'They stay for now. A bonus helps, but if pay stays below market, good people eventually leave.'; const b = G.biz.find(x => x.staff > 0); b.staff--; return 'They took the bonus, then took the other job anyway. Your business lost a worker, and sales dropped until you hire again.'; } },
      { t: 'Say no', fx: () => { if (Math.random() < .65) { const b = G.biz.find(x => x.staff > 0); b.staff--; return 'They quit. You saved on wages, but lost the sales they brought in. Hire someone new when you can.'; } return 'They stayed, but they’re less motivated. Paying fair wages matters.'; } }] },
    { id: 'rival', when: anyBiz, t: () => { const b = topBiz(); return 'A new competitor opens across the street from your <b>' + esc(BY[b.id].name.toLowerCase()) + '</b> with lower prices.'; }, o: [
      { t: 'Cut your prices to match', fx: () => { topBiz().slow = 3; return 'You keep your customers, but earn less on each sale for a few months. Price wars shrink profits for everyone.'; } },
      { t: 'Compete on quality: train staff ($800)', fx: () => { pay(800, 'Staff training'); topBiz().rep = 1.08; return 'Smart. Being better, not just cheaper, keeps loyal customers. Your reputation rises.'; } },
      { t: 'Do nothing', fx: () => { topBiz().rep = .9; return 'Some customers try the new place and don’t come back. Watching your competition is part of running a business.'; } }] },
    { id: 'supplier', when: () => G.biz.some(b => BY[b.id].inv), t: () => { const b = G.biz.find(x => BY[x.id].inv); return 'The supplier for your ' + esc(BY[b.id].name.toLowerCase()) + ' raises the price of <b>' + esc(BY[b.id].inv.name) + '</b> by 15%.'; }, o: [
      { t: 'Shop around for a new supplier', fx: () => { G.happy -= 3; return 'It took a few evenings of calls, but you found a deal at the old price. Comparing suppliers is like comparison shopping, for businesses.'; } },
      { t: 'Raise your own prices a little', fx: () => { const b = G.biz.find(x => BY[x.id].inv); if (Math.random() < .6) return 'Most customers didn’t mind a small, fair increase. When costs rise, prices often do too. That’s inflation.'; b.rep = .93; return 'Some customers grumbled and went elsewhere. Price changes are a balancing act.'; } },
      { t: 'Just pay it', fx: () => { const b = G.biz.find(x => BY[x.id].inv); b.costUp = (b.costUp || 1) * 1.15; return 'Your ' + (BY[b.id].inv ? BY[b.id].inv.name : 'costs') + ' now cost 15% more every month, which eats into profit. Always know your costs.'; } }] },
    { id: 'insure', when: () => anyBiz() && G.biz.some(b => !b.ins) && !G.seen.insure, t: () => 'An agent offers <b>business insurance</b> for your ' + esc(BY[G.biz.find(b => !b.ins).id].name.toLowerCase()) + ' for about ' + usd(Math.round(BY[G.biz.find(b => !b.ins).id].price * .004 + 40)) + ' a month. It covers theft, fire and lawsuits.', o: [
      { t: 'Buy the insurance', fx: () => { G.biz.find(b => !b.ins).ins = 1; return 'A small monthly cost protects you from a disaster that could wipe out the business. That’s what insurance is for.'; } },
      { t: 'No thanks', fx: () => 'You save the monthly cost. Just know that a single bad event could now cost you a lot.' }] },
    { id: 'breakin', when: () => anyBiz() && G.m > 6, t: () => { const b = topBiz(); return 'Someone broke into your <b>' + esc(BY[b.id].name.toLowerCase()) + '</b> overnight and stole equipment worth <b>' + usd(Math.round(BY[b.id].price * .15 + 150)) + '</b>.'; }, o: [
      { t: 'File a claim and replace it', fx: () => { const b = topBiz(), loss = Math.round(BY[b.id].price * .15 + 150); if (b.ins) { pay(250, 'Insurance deductible'); return 'Your insurance covered it. You only paid the $250 deductible. Insurance just saved you ' + usd(loss - 250) + '.'; } pay(loss, 'Replaced stolen equipment'); return 'No insurance, so you paid the full ' + usd(loss) + '. Businesses buy insurance because one bad night can be very expensive.'; } }] },
    { id: 'inspect', when: food, t: () => 'The health inspector is coming to your food truck next week.', o: [
      { t: 'Pay for a deep clean and new thermometers ($400)', fx: () => { pay(400, 'Deep clean before inspection'); return 'You passed with a perfect score and posted it on your truck. Customers notice.'; } },
      { t: 'Wing it', fx: () => { if (Math.random() < .5) return 'You passed, barely. Lucky this time.'; pay(900, 'Health code fine'); G.biz.find(b => b.id === 'truck').rep = .85; return 'You failed and paid a $900 fine, and the truck closed for two days. Prevention is cheaper than fines.'; } }] },
    { id: 'order', when: () => G.biz.some(b => ['truck', 'lawn'].includes(b.id)), t: () => { const b = G.biz.find(x => ['truck', 'lawn'].includes(x.id)); return b.id === 'truck' ? 'A company wants your food truck to cater lunch for 200 people. You’d need temp help for <b>$1,200</b>, and they’ll pay <b>$3,200</b>.' : 'An apartment complex wants a big one-time cleanup. You’d rent equipment for <b>$300</b>, and they’ll pay <b>$1,100</b>.'; }, o: [
      { t: 'Take the job', fx: () => { const t = G.biz.some(b => b.id === 'truck'); const c = t ? 1200 : 300, r = t ? 3200 : 1100; pay(c, 'Costs for a big order'); earn(r, 'Paid for a big order'); G.ytd.biz += r - c; G.happy -= 2; return 'Revenue ' + usd(r) + ' minus costs ' + usd(c) + ' = ' + usd(r - c) + ' profit. Always subtract the costs before deciding if a deal is good.'; } },
      { t: 'Turn it down', fx: () => 'Saying no is fine if you’re stretched thin, but this one was profitable.' }] },
    { id: 'investor', when: () => G.biz.some(b => b.lvl >= 3 && !b.share), t: () => { const b = G.biz.find(x => x.lvl >= 3 && !x.share); return 'An investor offers <b>' + usd(Math.round(b.spent * .9)) + '</b> in cash for <b>25% of the profits</b> of your ' + esc(BY[b.id].name.toLowerCase()) + ', forever.'; }, o: [
      { t: 'Take the deal', fx: () => { const b = G.biz.find(x => x.lvl >= 3 && !x.share), amt = Math.round(b.spent * .9); earn(amt, 'Cash from an investor'); b.share = .25; return 'You got cash now without a loan, but you gave up a quarter of the profits for good. That’s equity: no payments, but you own less.'; } },
      { t: 'Keep 100% of your business', fx: () => 'You keep every dollar of profit. Growing with your own money is slower, but you stay in control.' }] },
    // job
    { id: '401k', when: () => working() && !G.k401, t: () => 'HR says you can join the retirement plan. If you put in <b>4% of your pay</b>, the company adds another 4% for free.', o: [
      { t: 'Sign up', fx: () => { G.k401 = 1; return 'An employer match is an instant 100% return on your money. Starting at 18, this habit alone can grow to hundreds of thousands of dollars.'; } },
      { t: 'Not now', fx: () => 'You keep a bit more pay today, but you turned down free money from your employer.' }] },
    { id: 'overtime', when: working, t: () => 'Your manager offers extra weekend shifts this month: about <b>$450</b> more after taxes.', o: [
      { t: 'Take the shifts', fx: () => { earn(450, 'Overtime pay'); G.happy -= 6; return 'More income is a powerful money tool, but balance it with rest.'; } },
      { t: 'Keep your weekends', fx: () => { G.happy += 3; return 'Time is valuable too. Just make sure your regular pay covers your needs.'; } }] },
    { id: 'review', when: () => G.job && G.job.months >= 4, t: () => 'It’s your yearly review. Your boss says you’ve done solid work.', o: [
      { t: 'Ask for a raise and list your wins', fx: () => { if (Math.random() < .55) { G.job.months = PROMO_MONTHS - 1; return 'It worked: you’re on track for a promotion next month. People who ask, with proof of their results, get raises more often.'; } return 'Not this time, but your boss now knows your goals. Ask again in a few months.'; } },
      { t: 'Say thanks and leave it there', fx: () => 'Polite, but you left money on the table. Many people never ask, and earn less over a career.' }] },
    { id: 'raisecreep', when: () => G.job && G.job.rank > 0, t: () => 'Your promotion means more money each month. What will you do with it?', o: [
      { t: 'Save half of the raise', fx: () => { pay(300, 'Saved half your raise'); G.save += 300; return 'Saving part of every raise is one of the easiest ways to build wealth without feeling poorer.'; } },
      { t: 'Upgrade your lifestyle with all of it', fx: () => { G.happy += 4; return 'Spending all of each raise is called “lifestyle creep.” It’s why some people with high incomes still live paycheck to paycheck.'; } }] },
    // money and life
    { id: 'card', when: () => !G.card && !G.seen.card, t: () => 'A bank offers you a starter <b>credit card</b>: $1,000 limit, 25% interest.', o: [
      { t: 'Take it, and pay it off every month', fx: () => { G.card = { bal: 0, limit: 1000, auto: true }; return 'Used lightly and paid in full, a card builds your credit score, which makes loans for cars, homes and businesses cheaper later.'; } },
      { t: 'No thanks', fx: () => 'No risk of card debt, but no credit history yet either. You can apply later in the Money tab.' }] },
    { id: 'repair', when: hasCar, t: () => 'Your car won’t start. The mechanic says it needs a new alternator: <b>$650</b>.', o: [
      { t: 'Pay from savings', fx: () => { const s = Math.min(G.save, 650); G.save -= s; pay(650 - s, 'Car repair'); return s >= 650 ? 'This is exactly what an emergency fund is for. Experts suggest 3 to 6 months of expenses.' : 'Your savings didn’t cover it all, so the rest came from checking. An emergency fund makes surprises less scary.'; } },
      { t: 'Put it on the credit card', need: () => G.card && G.card.limit - G.card.bal >= 650, fx: () => { G.card.bal += 650; return 'Fast, but if you can’t pay it off this month, 25% interest makes the repair cost more over time.'; } },
      { t: 'Skip it and take the bus for a month', fx: () => { G.happy -= 8; pay(65, 'Bus pass'); return 'You saved money for now, but a broken car often costs more the longer you wait.'; } }] },
    { id: 'bike', when: () => !hasCar(), t: () => 'Your bike was stolen from outside. A decent used one costs <b>$250</b>.', o: [
      { t: 'Buy one', fx: () => { pay(250, 'Replaced stolen bike'); return 'Small emergencies happen often. Even $500 in savings covers most of them.'; } },
      { t: 'Walk and bus for now', fx: () => { G.happy -= 5; return 'Free, but slower. Sometimes waiting is the right call.'; } }] },
    { id: 'doctor', t: () => 'You sprain your ankle playing ball and need urgent care.', o: [
      { t: 'Go to urgent care', fx: () => { const c = medCost(900); pay(c, 'Urgent care visit'); return c < 900 ? 'Your health insurance covered most of it: you paid ' + usd(c) + '. Without insurance, the same visit was about $900.' : 'You paid the full $900' + (G.health === 'hdhp' ? ', because your plan’s deductible comes first.' : ' with no health insurance. Young adults can often stay on a parent’s plan until 26, or get coverage through school or the marketplace (Lifestyle tab).'); } },
      { t: 'Tough it out at home', fx: () => { G.happy -= 10; return 'You saved money, but skipping care can turn a small injury into a big bill later.'; } }] },
    { id: 'scam', t: () => 'A text says: “Your bank account is locked. Tap here and enter your password to fix it.”', o: [
      { t: 'Tap the link and log in', fx: () => { const l = Math.min(Math.max(G.cash, 0), 400 + Math.round(Math.max(G.cash, 0) * .05)); pay(l, 'Stolen by a scammer'); G.happy -= 8; return 'It was a scam, and they took ' + usd(l) + '. Banks never ask for your password by text. Call the number on the back of your card instead.'; } },
      { t: 'Delete it and call the bank', fx: () => { G.happy += 2; return 'Smart. The bank confirms it was a phishing scam. Never tap links in surprise “urgent” messages.'; } }] },
    { id: 'coin', t: () => 'A coworker swears a new meme coin will “10x by next month.” He wants you to put in <b>$500</b>.', o: [
      { t: 'Buy the coin', fx: () => { pay(500, 'Bought a meme coin'); const back = Math.random() < .15 ? 900 : 90; earn(back, 'Sold the meme coin'); return back > 500 ? 'You got lucky and sold for $900. Most hype coins crash, and luck isn’t a plan.' : 'The coin crashed and your $500 is now $90. “Guaranteed” returns and hype are warning signs.'; } },
      { t: 'Put $500 in the Everything Fund instead', fx: () => { buy('EVRY', Math.floor(500 / G.prices.EVRY), true); return 'An index fund owns a slice of hundreds of companies. Slow and steady has beaten most hot tips over time. Check your Money tab.'; } },
      { t: 'Pass', fx: () => 'Not investing in things you don’t understand is a solid rule.' }] },
    { id: 'friend', when: () => !G.owed, t: () => 'A close friend asks to borrow <b>$300</b> for rent. They promise to pay you back.', o: [
      { t: 'Lend it', fx: () => { pay(300, 'Loaned to a friend'); G.owed = 300; return 'A kind thing to do. A common rule: only lend what you could afford to never get back.'; } },
      { t: 'Help them make a budget instead', fx: () => 'You kept your money and still helped. Sometimes the best help isn’t cash.' }] },
    { id: 'phone', t: () => 'You drop your phone and the screen shatters.', o: [
      { t: 'Repair it ($180)', fx: () => { pay(180, 'Phone repair'); return 'Repairing is usually much cheaper than replacing.'; } },
      { t: 'Get the newest phone (4 payments of $300)', fx: () => { G.bnpl.push({ left: 4, amt: 300 }); G.happy += 5; return '“Buy now, pay later” makes a $1,200 phone feel cheap, but those payments now take $300 from each of your next 4 months.'; } },
      { t: 'Live with the cracks', fx: () => { G.happy -= 3; return 'Not pretty, but $0. Wants can wait.'; } }] },
    { id: 'trip', t: () => 'Friends are planning a beach weekend. Your share is <b>$275</b>.', o: [
      { t: 'Go!', fx: () => { pay(275, 'Beach weekend'); G.happy += 10; return 'Fun matters too. A good budget includes money for things you enjoy, planned ahead.'; } },
      { t: 'Skip it this time', fx: () => { G.happy -= 6; return 'Saying no to some things is how you say yes to bigger goals.'; } }] },
    { id: 'pet', when: () => !G.pet, t: () => 'A shelter puppy steals your heart. Adoption is <b>$250</b>, and food and care run about <b>$70 a month</b>.', o: [
      { t: 'Adopt', fx: () => { pay(250, 'Puppy adoption'); G.pet = 1; G.happy += 12; return 'Pets bring joy and a new monthly cost. Always count the ongoing cost, not just the price tag.'; } },
      { t: 'Not yet', fx: () => 'Waiting until your budget has room is responsible.' }] },
    { id: 'gift', t: () => 'Your grandma sends <b>$100</b> for your birthday.', o: [
      { t: 'Save it', fx: () => { G.save += 100; return 'Every bit counts. Small deposits add up.'; } },
      { t: 'Treat yourself', fx: () => { earn(100); G.happy += 5; return 'Enjoy it! Gifts are a great time to spend guilt-free.'; } }] },
    { id: 'market', when: () => stockVal() > 300, t: () => 'Headlines scream: “Stocks drop 20%! Is this a crash?” Your investments are down.', o: [
      { t: 'Sell everything before it gets worse', fx: () => { Object.keys(G.stocks).forEach(k => { G.prices[k] *= .85; sell(k, G.stocks[k].sh, true); }); return 'You locked in the loss. Markets have always recovered from drops over time, and people who sell in a panic often miss the rebound.'; } },
      { t: 'Hold on and keep investing', fx: () => { Object.keys(G.stocks).forEach(k => { G.prices[k] *= .85; }); G.shock = { sym: 'EVRY', r: .12 }; return 'Staying calm is hard, but long-term investors who hold through drops have historically come out ahead. Watch what happens next month.'; } }] }];
  const married = () => G.partner && G.partner.stage === 'married';
  EV.push(
    { id: 'hospital', when: () => G.m > 10, t: () => 'Sudden stomach pain turns out to be appendicitis. Surgery and two nights in the hospital cost <b>$14,000</b>.', o: [
      { t: 'Get the surgery', fx: () => { const c = medCost(14000); pay(c, 'Hospital bill'); G.happy -= 5; return c >= 14000 ? 'Without health insurance you owe the full $14,000. Medical bills are a top cause of debt in the U.S. A health plan (Lifestyle tab) caps what you pay.' : 'Your health insurance paid most of it. You paid ' + usd(c) + ' of a $14,000 bill. That’s why insurance is worth the monthly cost.'; } }] },
    { id: 'flood', when: () => !homeOwned() && G.home !== 'family', t: () => 'A pipe burst in your building and ruined your laptop, bed and clothes: about <b>$3,500</b> of stuff.', o: [
      { t: 'Replace what you need', fx: () => { if (G.renters) { pay(500, 'Renters insurance deductible'); return 'Renters insurance covered it! You paid the $500 deductible instead of $3,500. Your landlord’s insurance covers the building, not your things.'; } pay(3500, 'Replaced ruined belongings'); return 'No renters insurance, so you paid $3,500. Renters insurance costs about $15 to $20 a month and covers your things (Lifestyle tab).'; } }] },
    { id: 'meet', when: () => !G.partner && G.age >= 20, t: () => 'You meet someone special at a friend’s party. You really hit it off.', o: [
      { t: 'Start dating', fx: () => { G.partner = { stage: 'dating', since: G.m, inc: 2800 + Math.round(Math.random() * 16) * 100 }; G.happy += 10; return 'Love is great. Down the road, talk openly about money: debts, spending habits and goals. Money is one of the top things couples argue about.'; } },
      { t: 'Focus on my goals for now', fx: () => 'There’s no rush. Knowing what you want makes it easier to find a partner who wants the same.' }] },
    { id: 'marry', when: () => G.partner && G.partner.stage === 'dating' && G.m - G.partner.since >= 10, t: () => 'You and your partner decide to get married! How big will the wedding be?', o: [
      { t: 'Big wedding ($28,000)', fx: () => { pay(28000, 'Big wedding'); G.partner.stage = 'married'; G.happy += 12; return 'Beautiful day. The average U.S. wedding costs about $30,000, and many couples start married life in debt. Combining incomes now helps a lot.'; } },
      { t: 'Small wedding ($6,000)', fx: () => { pay(6000, 'Small wedding'); G.partner.stage = 'married'; G.happy += 10; return 'A meaningful day without a mountain of bills. Your partner’s income now joins the household.'; } },
      { t: 'Courthouse and a dinner ($250)', fx: () => { pay(250, 'Courthouse wedding'); G.partner.stage = 'married'; G.happy += 8; return 'Simple and smart. You put thousands toward your future together instead.'; } }] },
    { id: 'baby', when: () => married() && G.kids.length < 3 && G.age >= 23 && (!G.kids.length || G.m - G.kids[G.kids.length - 1].born > 24), t: () => 'You and your partner talk about having ' + (G.kids.length ? 'another baby' : 'a baby') + '.', o: [
      { t: 'Have a baby', fx: () => { G.kids.push({ born: G.m }); const c = medCost(13000); pay(c, 'Hospital bill for the birth'); G.happy += 10; return 'Congratulations! Childcare runs about $1,100 a month until school age, then about $450 for activities and care. The child tax credit gives back about $167 a month. You paid ' + usd(c) + ' for the birth with your insurance. Consider life insurance now (Lifestyle tab).'; } },
      { t: 'Not yet', fx: () => 'Kids are a big joy and a big cost, about $300,000 to raise one child to 18. Waiting until you’re ready is wise.' }] },
    { id: 'lifeins', when: () => (married() || G.kids.length) && !G.lifeIns, t: () => 'Your family depends on your income. An agent offers <b>term life insurance</b>: $500,000 of coverage for <b>$35 a month</b>.', o: [
      { t: 'Buy it', fx: () => { G.lifeIns = 1; return 'Term life is cheap when you’re young and healthy. If something happened to you, your family could pay the bills and the home.'; } },
      { t: 'No thanks', fx: () => 'You save $35 a month. Experts suggest life insurance worth about 10 times your income once others depend on you.' }] },
    { id: 'layoff', when: () => G.econ.phase === 'rec' && G.job && !JOBS[G.job.id].pt, t: () => 'The recession hits your company. They announce layoffs next week.', o: [
      { t: 'Volunteer for extra training to stay valuable', fx: () => { G.happy -= 4; if (Math.random() < .2) { G.job = null; return 'Even good workers get laid off in recessions. You lost your job. Your emergency fund has to carry you until you find a new one (Career tab).'; } return 'You kept your job! Workers with in-demand skills are usually the last to go.'; } },
      { t: 'Keep your head down', fx: () => { if (Math.random() < .4) { G.job = null; return 'You were laid off. This is exactly why experts suggest 3 to 6 months of expenses in savings. Find a new job in the Career tab.'; } return 'Your job survived this round. A good time to build up your emergency fund.'; } }] },
    { id: 'tenant', when: () => G.rentals.length > 0, t: () => 'The tenant in your ' + esc(RENTALS.find(x => x.id === G.rentals[0].id).name.toLowerCase()) + ' moved out and left it a mess.', o: [
      { t: 'Clean, repaint and list it ($900)', fx: () => { pay(900, 'Turnover costs for your rental'); G.rentals[0].vacant = 1; return 'Every rental sits empty sometimes. Landlords plan for “vacancy”: a month or two without rent each year.'; } },
      { t: 'Renovate the kitchen ($6,000), then raise the rent', fx: () => { pay(6000, 'Rental renovation'); G.rentals[0].vacant = 2; G.rentals[0].bump = (G.rentals[0].bump || 1) * 1.1; return 'It’s empty longer, but the rent goes up 10% for good. Improvements that raise rent can pay for themselves over time.'; } }] },
    { id: 'heater', when: () => G.rentals.length > 0, t: () => 'Your tenant calls: the water heater in your rental just died.', o: [
      { t: 'Replace it today ($1,400)', fx: () => { pay(1400, 'New water heater for your rental'); return 'Fast repairs keep good tenants. Landlords set aside about 8% of rent for repairs like this.'; } },
      { t: 'Patch it cheaply ($300)', fx: () => { pay(300, 'Water heater patch'); if (Math.random() < .5) { pay(1700, 'Water heater failed again, with water damage'); return 'The patch failed a month later and leaked. Now it cost $2,000 total. Cheap fixes can cost more.'; } return 'The patch held, for now.'; } }] },
    { id: 'latepay', when: () => G.rentals.length > 0, t: () => 'Your tenant lost their job and can’t pay this month’s rent.', o: [
      { t: 'Set up a payment plan', fx: () => { if (Math.random() < .7) return 'They caught up within two months. Working with good tenants is often cheaper than finding new ones.'; G.rentals[0].vacant = 1; return 'They couldn’t catch up and moved out. You lost a month of rent.'; } },
      { t: 'Start an eviction ($2,500 legal fees)', fx: () => { pay(2500, 'Eviction legal fees'); G.rentals[0].vacant = 2; return 'Evictions are slow and expensive: legal fees plus months of no rent. Screening tenants carefully up front matters.'; } }] });
  const HOLIDAY = { id: 'holiday', t: () => 'It’s the holidays. How much will you spend on gifts?', o: [
    { t: '$400 on gifts', fx: () => { pay(400, 'Holiday gifts'); G.happy += 6; return 'Generous. Planning holiday costs months ahead keeps them from turning into debt.'; } },
    { t: '$150 on gifts', fx: () => { pay(150, 'Holiday gifts'); G.happy += 4; return 'A thoughtful gift budget.'; } },
    { t: 'Homemade gifts ($30)', fx: () => { pay(30, 'Holiday gifts'); G.happy += 3; return 'Creative and personal. People remember the thought.'; } }] };
  function chooseEvent() {
    if (G.m % 12 === 11 && G.seen.holiday !== Math.floor(G.m / 12)) { G.seen.holiday = Math.floor(G.m / 12); return HOLIDAY; }
    const pool = EV.filter(e => (G.seen[e.id] == null || G.m - G.seen[e.id] >= 14) && (!e.when || e.when()));
    const fam = pool.filter(e => ['marry', 'baby'].includes(e.id)); const e = fam.length && Math.random() < .5 ? fam[0] : pick(pool); if (e) G.seen[e.id] = G.m; return e; }

  /* ---------- actions ---------- */
  function buyBiz(id) { const t = BY[id]; if (G.cash < t.price) return toast('You need ' + usd(t.price - G.cash) + ' more. Try a business loan in the Money tab.');
    pay(t.price, 'Started a ' + t.name.toLowerCase()); const nb = { id, lvl: 1, staff: 0, mgr: 0, till: 0, spent: t.price, ins: 0, maint: 0, stock: 0 }; nb.stock = bizNums(nb).cap * .5; G.biz.push(nb);
    toast('You started a ' + t.name.toLowerCase() + '! Collect its money and grow it.'); try { addXP(10); } catch (e) {} persist(true); render(); }
  function bizAct(i, act) { const b = G.biz[i], t = BY[b.id];
    if (act === 'collect') { const v = b.till || 0; if (v < 1) return; earn(v, t.name + ' income'); G.ytd.biz += v; b.made = (b.made || 0) + v; b.till = 0; pop('+' + usd(v)); }
    if (act === 'up') { if (b.lvl >= MAXLVL) return; if (b.broken) return toast('Repair it before upgrading.'); const c = upCost(t, b.lvl); if (G.cash < c) return toast('You need ' + usd(c - G.cash) + ' more to upgrade.'); pay(c, 'Upgraded ' + t.name.toLowerCase()); b.spent += c; b.lvl++; toast(t.name + ' is now level ' + b.lvl + '. Sales are up 30%.'); }
    if (act === 'hire') { if (b.staff >= maxStaff(b)) return toast('Upgrade to make room for more staff.'); b.staff++; toast('You hired a ' + t.staff + ' at ' + usd(t.wage) + ' a month.'); }
    if (act === 'fire') { if (b.staff > 0) b.staff--; }
    if (act === 'mgr') { if (b.mgr) { b.mgr = 0; toast('The manager left. Collect your money by hand again.'); } else { const fee = t.mgr; if (G.cash < fee) return toast('Hiring a manager costs a one-time ' + usd(fee) + ' signing bonus.'); pay(fee, 'Manager signing bonus'); b.mgr = 1; if (b.till) { earn(b.till, t.name + ' income'); G.ytd.biz += b.till; b.till = 0; } toast('Your manager collects for you, even while the app is closed.'); } }
    if (act === 'ins') b.ins = b.ins ? 0 : 1;
    if (act === 'price') { const order = ['low', 'normal', 'premium']; b.price = order[(order.indexOf(b.price || 'normal') + 1) % 3]; toast({ low: 'Low prices: more customers, but less profit on each sale.', normal: 'Normal prices.', premium: 'Premium prices: fewer customers, but more profit on each sale.' }[b.price]); }
    if (act === 'ads') { b.ads = ((b.ads || 0) + 1) % 3; toast(['Ads off.', 'Local ads: about 12% more customers.', 'Big ad campaign: about 30% more customers.'][b.ads]); }
    if (act === 'maint') { b.maint = b.maint ? 0 : 1; toast(b.maint ? 'Maintenance plan on: breakdowns are much less likely.' : 'Maintenance plan canceled.'); }
    if (act === 'stock') { const c = restock(b); if (c) toast('Restocked ' + t.inv.name + ' for ' + usd(c) + '.'); }
    if (act === 'fix') { if (!b.broken) return; if (G.cash < b.broken.cost) return toast('You need ' + usd(b.broken.cost) + ' for the repair.'); pay(b.broken.cost, 'Repairs at your ' + t.name.toLowerCase()); G.ytd.biz -= b.broken.cost; b.broken = null; toast('Fixed! Sales are back to normal.'); }
    if (act === 'sell') { if (!b.confirm) { b.confirm = 1; render(); setTimeout(() => { b.confirm = 0; }, 4000); return; } const v = bizValue(b) + (b.till || 0); earn(v, 'Sold the ' + t.name.toLowerCase()); G.biz.splice(i, 1); toast('Sold for ' + usd(v) + '.'); }
    persist(true); render(); }
  function collectAll() { let sum = 0; G.biz.forEach(b => { if (b.till >= 1) { sum += b.till; G.ytd.biz += b.till; b.made = (b.made || 0) + b.till; b.till = 0; } }); if (sum) { earn(sum, 'Business income'); pop('+' + usd(sum)); persist(true); render(); } }
  function buy(sym, sh, quiet) { sh = Math.floor(sh); if (sh < 1) return; const p = G.prices[sym], c = sh * p; if (G.cash < c) return toast('Not enough cash for ' + sh + ' shares.');
    pay(c, 'Bought ' + sh + ' ' + sym); const h = G.stocks[sym] || { sh: 0, cost: 0 }; h.sh += sh; h.cost += c; G.stocks[sym] = h; if (!quiet) { toast('Bought ' + sh + ' shares of ' + sym + '.'); persist(true); render(); } }
  function sell(sym, sh, quiet) { const h = G.stocks[sym]; if (!h) return; sh = Math.min(Math.floor(sh), h.sh); if (sh < 1) return; const p = G.prices[sym], basis = h.cost / h.sh * sh, v = sh * p;
    earn(v, 'Sold ' + sh + ' ' + sym); G.ytd.gains += v - basis; h.sh -= sh; h.cost -= basis; if (!h.sh) delete G.stocks[sym];
    if (!quiet) { toast('Sold ' + sh + ' shares of ' + sym + ' for a ' + (v >= basis ? 'gain' : 'loss') + ' of ' + usd(Math.abs(v - basis)) + '.'); persist(true); render(); } }
  function loanOffer(kind) { const sc = G.score || 0, inc = jobGross() + Math.max(0, bizProfit()) + partnerNet(), base = (sc >= 740 ? .07 : sc >= 680 ? .09 : sc >= 620 ? .12 : .16) + EC().rate - .04;
    if (kind === 'biz') return { apr: base + .01, max: Math.max(0, Math.round((sc ? (sc >= 700 ? 12 : 7) : 2.5) * inc / 500) * 500), n: 60 };
    return { apr: base, n: 48 }; }
  function takeLoan(amt) { const o = loanOffer('biz'); amt = Math.min(amt, o.max); if (amt < 500) return toast('The bank won’t lend that much yet. More income and a credit score help.');
    if (G.loans.some(l => l.kind === 'biz')) return toast('Pay off your current business loan first.'); addLoan(G, 'biz', 'Business loan', amt, o.apr, o.n); earn(amt, 'Business loan'); toast('Borrowed ' + usd(amt) + ' at ' + (o.apr * 100).toFixed(0) + '% for 5 years.'); persist(true); render(); }
  function payoff(i) { const l = G.loans[i]; if (!l) return; if (G.cash < l.bal) return toast('You need ' + usd(l.bal) + ' in cash to pay it off.'); pay(l.bal, 'Paid off ' + l.name.toLowerCase()); G.loans.splice(i, 1); toast('Debt free from that loan! No more monthly payments.'); persist(true); render(); }
  function setHome(id) { const h = HOMES.find(x => x.id === id), cur = HOMES.find(x => x.id === G.home); if (id === G.home) return;
    const mort0 = G.loans.find(l => l.kind === 'mortgage'), equity = cur.price ? G.homeVal * .94 - (mort0 ? mort0.bal : 0) : 0;
    if (h.price) { const need = h.price * .2 + 5000; if (G.cash + equity < need) return toast('You need ' + usd(h.price * .2) + ' for a 20% down payment, plus ' + usd(5000) + ' for closing costs.');
      if ((G.score || 0) < 620) return toast('Banks want a credit score of about 620 or more for a mortgage. Build credit with a card or loan first.'); }
    if (cur.price) { const mort = G.loans.find(l => l.kind === 'mortgage'), eq = G.homeVal * .94 - (mort ? mort.bal : 0); earn(G.homeVal * .94, 'Sold your home (after 6% fees)'); if (mort) { pay(mort.bal, 'Paid off mortgage'); G.loans.splice(G.loans.indexOf(mort), 1); } G.homeVal = 0; toast('You sold your home and kept ' + usd(eq) + ' of equity.'); }
    if (h.price) { const down = h.price * .2;
      pay(down + 5000, 'Down payment and closing costs'); const apr = (G.score >= 740 ? .062 : .068) + EC().rate - .04; addLoan(G, 'mortgage', 'Mortgage', h.price - down, apr, 360); G.homeVal = h.price; toast('You bought a home! Each payment builds equity.'); try { addXP(30); confetti(); } catch (e) {} }
    G.home = id; persist(true); render(); }
  function setCar(id, finance) { const c = CARS.find(x => x.id === id); if (id === G.car) return; const old = G.carVal, ol0 = G.loans.find(l => l.kind === 'car'), have = G.cash + old - (ol0 ? ol0.bal : 0);
    if (c.price && have < (finance ? c.price * .1 : c.price)) return toast(finance ? 'You need ' + usd(c.price * .1) + ' for a 10% down payment.' : 'You need ' + usd(c.price) + ' in cash, or choose “Finance.”');
    if (old) earn(old, 'Sold your old car'); G.carVal = 0; const ol = G.loans.find(l => l.kind === 'car'); if (ol) { pay(ol.bal, 'Paid off old car loan'); G.loans.splice(G.loans.indexOf(ol), 1); }
    if (c.price) { if (finance) { const o = loanOffer('car'), down = c.price * .1; pay(down, 'Car down payment'); addLoan(G, 'car', 'Car loan', c.price - down, o.apr, 60); }
      else { pay(c.price, 'Bought a car'); } G.carVal = c.price * .85; }
    G.car = id; toast(c.price ? 'New wheels! Cars lose value every month, so don’t count them as an investment.' : 'You sold the car. Bus pass it is.'); persist(true); render(); }
  function buyRental(id) { const t = RENTALS.find(x => x.id === id), down = t.price * .2 + 4000;
    if (G.cash < down) return toast('You need ' + usd(down) + ': a 20% down payment plus closing costs.'); if ((G.score || 0) < 640) return toast('Banks want a credit score of about 640 or more for a rental property loan.');
    pay(down, 'Down payment on a ' + t.name.toLowerCase()); const key = 'r' + Date.now(); addLoan(G, 'rental', 'Mortgage: ' + t.name, t.price * .8, (G.score >= 740 ? .067 : .073) + EC().rate - .04, 360); G.loans[G.loans.length - 1].rid = key;
    G.rentals.push({ id, key, val: t.price, vacant: 1, mgr: 0 }); toast('You’re a landlord! It takes a month to find your first tenant.'); try { addXP(25); } catch (e) {} persist(true); render(); }
  function rentalAct(i, a) { const r = G.rentals[i]; if (!r) return; const t = RENTALS.find(x => x.id === r.id);
    if (a === 'mgr') { r.mgr = r.mgr ? 0 : 1; toast(r.mgr ? 'A property manager now handles tenants for 10% of the rent.' : 'You manage the property yourself.'); }
    if (a === 'sell') { if (!r.confirm) { r.confirm = 1; render(); setTimeout(() => { r.confirm = 0; }, 4000); return; } const li = G.loans.findIndex(l => l.rid === r.key), owe = li >= 0 ? G.loans[li].bal : 0; earn(r.val * .94, 'Sold your ' + t.name.toLowerCase() + ' (after 6% fees)'); if (li >= 0) { pay(owe, 'Paid off the rental mortgage'); G.loans.splice(li, 1); } G.rentals.splice(i, 1); toast('Sold! You kept ' + usd(r.val * .94 - owe) + ' of equity.'); }
    persist(true); render(); }
  function gig(id) { const g = GIGS.find(x => x.id === id), left = Math.ceil(((G.gigAt[id] || 0) + g.wait * 1000 - Date.now()) / 1000); if (left > 0) return toast('Ready again in ' + left + ' seconds.');
    if (g.need && !g.need()) return toast('Tutoring needs school (finished or in progress).'); G.gigAt[id] = Date.now(); const amt = g.pay * infl(); earn(amt, g.name + ' (gig)'); G.ytd.biz += amt; G.happy -= 1; pop('+' + usd(amt));
    if (!G.seen.gigtip) { G.seen.gigtip = 1; note(['Gig income counts as self-employment, so no taxes are taken out. You’ll owe them when you file your taxes, so set some aside.'], 'Side gigs'); } persist(true); render(); }
  function setJob(id) { const j = JOBS[id]; if (j && j.need && !G.degrees.includes(j.need) && !j.needAfter) return toast('This career needs ' + EDU[j.need].name.toLowerCase() + '.');
    G.job = id === 'none' ? null : { id, rank: 0, months: 0, review: REVIEW.every, strike: 0 }; toast(!j ? 'You quit your job. Your businesses will need to pay the bills!' : 'Welcome to your new job as ' + j.ranks[0][0].toLowerCase() + '!'); persist(true); render(); }
  function enroll(id) { const e = EDU[id]; if (G.edu || G.degrees.includes(id)) return; G.edu = { id, left: e.months, next: EXAM.every, strike: 0 }; addLoan(G, 'student', id === 'college' ? 'Student loan' : 'Trade school loan', e.cost * .7, .065, id === 'college' ? 120 : 60, 'school');
    toast('Enrolled! Loan payments wait until you finish school.'); persist(true); render(); }

  /* ---------- screens ---------- */
  function stage() { go('map', true); $('#map-home').hidden = true; const st = $('#stage'); st.hidden = false; return st; }
  function frame(inner) { const st = stage();
    st.innerHTML = tx('<div class="stage life tyc"><div class="stage-top"><button class="btn ghost" id="back">← Map</button><span class="eyebrow">Life After 18</span></div>' + inner + '</div>');
    $('#back').onclick = () => { closeModal(); stopClock(); showMap(); }; return st; }
  function intro() {
    stopClock();
    frame('<h2>Life After 18</h2><p class="lesson-text" style="font-size:16px">Graduation day! Build the life you want: work your way up, go to school, start businesses and grow them into an empire, invest, buy a home and climb the net worth ladder. Your businesses keep earning even while the app is closed. Real-life choices pop up along the way, and every one teaches a money lesson.</p>' +
      (S.full ? '' : S.life && S.life.trial ? '<div class="card" style="margin-top:10px">🔑 <b>You’ve used your free month.</b> Subscribe (or join your class) to keep building your life.</div>' : '<div class="card" style="margin-top:10px">🎁 <b>Try your first month free.</b> Pick a path and play your first game month, all the way to your first paycheck. To keep going after that, subscribe (or join your class).</div>') +
      '<h3 style="margin:18px 0 8px">Choose your path</h3><div class="life-grid">' + PATHS.map((p, i) => { const j = JOBS[p.job], pc = paycheck(j.ranks[0][1]);
        return '<button class="life-opt" data-p="' + i + '"><span class="life-ic" aria-hidden="true">' + p.icon + '</span><b>' + esc(p.name) + '</b><small class="muted">' + esc(j.ranks[0][0]) + '</small><span>' + esc(p.blurb) + '</span><span class="mono" style="margin-top:6px">Take-home: about ' + usd(pc.net) + ' a month</span></button>'; }).join('') + '</div>');
    document.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { if (!S.full && S.life && S.life.trial) return openPaywall(); G = newGame(PATHS[+b.dataset.p]); S.life = Object.assign({}, S.life || {}, { v: 2, g: G, runs: ((S.life && S.life.runs) || 0) + 1 }, S.full ? {} : { trial: true }); tab = 'biz'; persist(true); render(); startClock(); try { window.TT_track && window.TT_track('life_start'); } catch (e) {}
      note(['Welcome to life after high school! Here’s how to start:', '1. Your paycheck arrives at the end of each month (every 2 minutes of play), and bills come out.', '2. Start a 🌱 Lawn care business in the Business tab, then tap Collect as money comes in.', '3. Keep your businesses stocked and fix things when they break. Upgrade, hire staff, then hire a manager so it earns while you’re away.', '4. School has an exam every 4 months and jobs have a review every 6 months. Answer the money questions right to stay in!'], 'Your new life'); }; });
  }
  function hud() { const nw = netWorth(), r = rung(nw), next = LADDER[r + 1], mi = G.m % 12;
    const prog = next ? clamp((nw - Math.max(0, LADDER[r][0])) / (next[0] - Math.max(0, LADDER[r][0])), 0, 1) : 1;
    const ec = EC(); return '<div class="ty-top"><div><b>Age ' + G.age + '</b> · ' + MONTHS[mi] + ', year ' + (Math.floor(G.m / 12) + 1) + (G.gen > 1 ? ' · generation ' + G.gen : '') + ' <span class="ty-econ ' + G.econ.phase + '" title="The economy">' + ec.icon + ' ' + ec.name + '</span></div><button class="btn ghost sm" id="ty-pause">' + (G.paused ? '▶ Resume' : '⏸ Pause') + '</button></div>' +
      '<div class="ty-clock" title="Time until the end of the month"><i id="ty-clock" style="width:' + (G.t / MONTH_MS * 100) + '%"></i></div>' +
      '<div class="life-stats"><div><span>Cash</span><b id="ty-cash" class="' + (G.cash < 0 ? 'dn' : '') + '">' + big(G.cash) + '</b></div>' +
      '<div><span>Net worth</span><b id="ty-nw">' + big(nw) + '</b></div><div><span>Income / month</span><b id="ty-inc">' + big(paycheck(jobGross()).net * (G.job ? 1 : 0) + bizProfit() + partnerNet() + G.rentals.reduce((a, r) => a + rentalNums(r).rent - rentalNums(r).costs, 0)) + '</b></div>' +
      '<div><span>Happiness</span><b>' + (G.happy >= 75 ? '😄' : G.happy >= 55 ? '🙂' : G.happy >= 35 ? '😐' : '😟') + ' ' + G.happy + '</b></div><div><span>Credit score</span><b>' + (G.score || 'None yet') + '</b></div></div>' +
      '<div class="ty-ladder"><span>' + LADDER[r][1] + ' <b>' + LADDER[r][2] + '</b></span>' + (next ? '<span class="muted">Next: ' + next[1] + ' ' + next[2] + ' at ' + big(next[0]) + '</span>' : '<span>Top of the ladder!</span>') + '<div class="ty-bar"><i id="ty-lad" style="width:' + (prog * 100) + '%"></i></div></div>'; }
  function render() {
    if (!G) return intro();
    const tabs = [['biz', '🏪 Business'], ['job', '💼 Career'], ['money', '💰 Money'], ['life', '🏠 Lifestyle']];
    frame(hud() + '<div class="ty-tabs" role="tablist">' + tabs.map(t => '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>').join('') + '</div><div id="ty-body">' +
      (tab === 'biz' ? vBiz() : tab === 'job' ? vJob() : tab === 'money' ? vMoney() : vLife()) + '</div>');
    $('#ty-pause').onclick = () => { G.paused = !G.paused; render(); };
    document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
    wire(); if (!timer) startClock(); }
  function vBiz() {
    const owned = G.biz.map((b, i) => { const t = BY[b.id], n = bizNums(b), c = upCost(t, b.lvl), cap = n.cash, stockPct = t.inv && n.cap ? clamp((b.stock || 0) / n.cap * 100, 0, 100) : 0;
      const line = (k, v) => v >= 1 ? '<tr><td>' + k + '</td><td class="dn">-' + usd(v) + '</td></tr>' : '';
      const loc = G.biz.filter(x => x.id === b.id).length > 1 ? ' #' + (G.biz.slice(0, i + 1).filter(x => x.id === b.id).length) : '';
      return '<div class="card ty-biz' + (b.broken ? ' broke' : '') + '"><div class="ty-bh"><span class="life-ic">' + t.icon + '</span><div><b>' + esc(t.name) + loc + '</b> <small class="muted">Level ' + b.lvl + (b.share ? ' · investor owns 25% of profit' : '') + '</small><div class="muted" style="font-size:13px">' +
        b.staff + ' of ' + maxStaff(b) + ' ' + esc(t.staff) + (b.staff === 1 ? '' : 's') + (b.mgr ? ' · 👔 manager' : '') + (b.ins ? ' · 🛡️ insured' : '') + (b.maint ? ' · 🔧 maintenance plan' : '') + '</div></div>' +
        '<div class="ty-profit"><span>Profit / month</span><b class="' + (n.profit < 0 ? 'dn' : 'up') + '">' + big(n.profit) + '</b></div></div>' +
        (b.broken ? '<div class="ty-alert">🔧 ' + esc(b.broken.msg) + ' Sales are down 80%.<button class="btn sun sm" data-b="' + i + '" data-a="fix">Repair ' + usd(b.broken.cost) + '</button></div>' : '') +
        (t.inv ? '<div class="ty-stock"><span>' + esc(t.inv.name[0].toUpperCase() + t.inv.name.slice(1)) + '</span><div class="ty-bar' + (stockPct < 25 ? ' low' : '') + '"><i data-stock="' + i + '" style="width:' + stockPct + '%"></i></div>' +
          '<button class="btn ghost sm" data-b="' + i + '" data-a="stock">' + esc(t.inv.buy) + ' <span data-sc="' + i + '">' + usd(Math.max(0, n.cap - (b.stock || 0))) + '</span></button></div>' +
          '<p class="ty-hint ty-warn" data-empty="' + i + '"' + (b.empty ? '' : ' hidden') + '>Out of ' + esc(t.inv.name) + '! Sales stopped, but rent and wages still have to be paid. Restock now.</p>' : '') +
        '<details class="ty-pl"><summary>Revenue and costs</summary><table class="life-t"><tr><td>Sales (revenue)</td><td>' + usd(n.rev) + '</td></tr>' +
        line(t.inv ? 'Cost of ' + t.inv.name : (t.cogsName || 'Cost of goods'), n.cogs) + line(t.fixedName, n.fixed - n.adsCost) + line('Advertising', n.adsCost) + line('Staff wages', n.wage) + line('Manager salary', n.mgr) + line('Business insurance', n.ins) + line('Maintenance plan', n.maint) +
        (b.share && n.gross > 0 ? line('Investor’s 25% share', n.gross * .25) : '') + '<tr><th>Profit</th><th>' + usd(n.profit) + '</th></tr></table>' +
        '<p class="muted" style="font-size:13px;margin:6px 0 0">' + (t.inv ? 'You pay for ' + esc(t.inv.name) + ' up front, then earn it back when you sell. ' : '') + 'Repairs pop up when equipment breaks. Business profit is taxed at the end of each year (about 22% here).</p></details>' +
        (b.mgr ? '<div class="ty-till auto">👔 Your manager deposits about ' + usd(n.profit / 4) + ' a week into your cash' + (t.inv ? ' and restocks ' + esc(t.inv.name) : '') + ', even while you’re away.</div>'
          : '<div class="ty-till"><div class="ty-bar"><i data-till="' + i + '" style="width:' + clamp((b.till || 0) / Math.max(1, cap) * 100, 0, 100) + '%"></i></div><button class="btn sun" data-b="' + i + '" data-a="collect">Collect <span data-tv="' + i + '">' + usd(b.till) + '</span></button></div>' +
            '<p class="muted ty-hint" data-full="' + i + '"' + ((b.till || 0) >= cap * .999 && cap > 0 ? '' : ' hidden') + '>The till is full. Collect it, or hire a manager so you never miss income.</p>') +
        '<div class="ty-acts"><button class="btn ghost sm" data-b="' + i + '" data-a="price">🏷️ Prices: ' + { low: 'Low', normal: 'Normal', premium: 'Premium' }[b.price || 'normal'] + '</button><button class="btn ghost sm" data-b="' + i + '" data-a="ads">📣 Ads: ' + ['None', 'Local', 'Big campaign'][b.ads || 0] + (b.ads ? ' (' + big(n.adsCost) + '/mo)' : '') + '</button></div>' +
        '<div class="ty-acts">' + (b.lvl < MAXLVL ? '<button class="btn ghost sm" data-b="' + i + '" data-a="up">⬆ Upgrade ' + big(c) + '</button>' : '<span class="muted">Max level</span>') +
        '<button class="btn ghost sm" data-b="' + i + '" data-a="hire"' + (b.staff >= maxStaff(b) ? ' disabled' : '') + '>➕ Hire ' + esc(t.staff) + ' (+' + big(t.sRev * Math.pow(1.3, b.lvl - 1) * (1 - t.cogs) - t.wage) + '/mo)</button>' +
        (b.staff ? '<button class="btn ghost sm" data-b="' + i + '" data-a="fire">➖ Let one go</button>' : '') +
        '<button class="btn ghost sm" data-b="' + i + '" data-a="mgr">' + (b.mgr ? 'Remove manager' : '👔 Hire manager ' + big(t.mgr) + ' + ' + big(t.mgr) + '/mo') + '</button>' +
        '<button class="btn ghost sm" data-b="' + i + '" data-a="maint">' + (b.maint ? 'Cancel maintenance' : '🔧 Maintenance plan ' + big(Math.round(fixCost(b) * .06)) + '/mo') + '</button>' +
        '<button class="btn ghost sm" data-b="' + i + '" data-a="ins">' + (b.ins ? 'Cancel insurance' : '🛡️ Insure') + '</button>' +
        '<button class="btn ghost sm" data-b="' + i + '" data-a="sell">' + (b.confirm ? 'Tap again to sell for ' + big(bizValue(b) + (b.till || 0)) : 'Sell') + '</button></div></div>'; }).join('');
    const anyTill = G.biz.some(b => !b.mgr);
    const shop = BIZ.map(t => { const can = G.cash >= t.price;
      return '<button class="life-opt ty-shop" data-buy="' + t.id + '"' + (can ? '' : ' aria-disabled="true"') + '><span class="life-ic">' + t.icon + '</span><b>' + esc(t.name) + '</b><span>' + esc(t.d) + '</span><span class="mono">' + big(t.price) + ' · about ' + big(t.rev * (1 - t.cogs) - t.fixed) + ' profit/mo</span>' +
        '<small class="muted">Costs: ' + (t.inv ? esc(t.inv.name) + ' (' + Math.round(t.cogs * 100) + '% of sales), ' : t.cogsName ? esc(t.cogsName.toLowerCase()) + ', ' : '') + esc(t.fixedName.toLowerCase()) + ' ' + big(t.fixed) + '/mo, plus repairs</small></button>'; }).join('');
    return (G.biz.length ? '<div class="ty-row"><h3>Your businesses</h3>' + (anyTill && G.biz.length > 1 ? '<button class="btn sun sm" id="ty-all">Collect all</button>' : '') + '</div>' + owned : '<div class="card"><b>You don’t own a business yet.</b> Start small with lawn care, collect your income, then reinvest it to grow.</div>') +
      '<h3 style="margin:18px 0 8px">' + (G.biz.length ? 'Start or open another location' : 'Start a business') + '</h3><div class="life-grid">' + shop + '</div>' + vRentals(); }
  function vRentals() {
    const own = G.rentals.map((r, i) => { const n = rentalNums(r), li = G.loans.find(l => l.rid === r.key);
      return '<div class="card"><div class="ty-bh"><span class="life-ic">' + n.t.icon + '</span><div><b>' + esc(n.t.name) + '</b><div class="muted" style="font-size:13px">Worth ' + usd(r.val) + (li ? ' · owe ' + usd(li.bal) + ' · equity ' + usd(r.val - li.bal) : ' · paid off') + (r.vacant ? ' · 🏚️ empty' : '') + (r.mgr ? ' · property manager' : '') + '</div></div>' +
        '<div class="ty-profit"><span>Cash flow / month</span><b class="' + (n.net < 0 ? 'dn' : 'up') + '">' + big(n.net) + '</b></div></div>' +
        '<details class="ty-pl"><summary>Rent and costs</summary><table class="life-t"><tr><td>Rent</td><td>' + usd(n.rent) + '</td></tr><tr><td>Property tax, insurance, repairs' + (r.mgr ? ', manager' : '') + '</td><td class="dn">-' + usd(n.costs) + '</td></tr><tr><td>Mortgage payment</td><td class="dn">-' + usd(n.pay) + '</td></tr><tr><th>Cash flow</th><th>' + usd(n.net) + '</th></tr></table></details>' +
        '<div class="ty-acts"><button class="btn ghost sm" data-ra="' + i + '" data-a="mgr">' + (r.mgr ? 'Manage it myself' : 'Hire a property manager (10% of rent)') + '</button><button class="btn ghost sm" data-ra="' + i + '" data-a="sell">' + (r.confirm ? 'Tap again to sell' : 'Sell') + '</button></div></div>'; }).join('');
    return '<h3 style="margin:18px 0 8px">Rental properties</h3><p class="muted" style="margin:0 0 8px">Buy with a mortgage (20% down, credit score 640+). Tenants pay rent each month; you pay the mortgage, taxes, insurance and repairs. Homes usually grow in value over time.</p>' + own +
      '<div class="life-grid" style="margin-top:10px">' + RENTALS.map(t => '<button class="life-opt" data-rent="' + t.id + '"' + (G.cash >= t.price * .2 + 4000 ? '' : ' aria-disabled="true"') + '><span class="life-ic">' + t.icon + '</span><b>' + esc(t.name) + '</b><span class="mono">' + usd(t.price) + ' · rent about ' + usd(t.rent * infl()) + '/mo</span><small class="muted">Needs ' + usd(t.price * .2 + 4000) + ' down with closing costs</small></button>').join('') + '</div>'; }
  function vJob() {
    const j = G.job && JOBS[G.job.id], s = G.slip;
    const cur = j ? '<div class="card"><div class="ty-bh"><span class="life-ic">' + j.icon + '</span><div><b>' + esc(j.ranks[G.job.rank][0]) + '</b><div class="muted">' + esc(j.name) + ' · ' + usd(j.ranks[G.job.rank][1]) + ' a month before taxes' + (j.ins ? ' · health insurance' : '') + '</div></div></div>' +
      '<p class="ty-note2">📝 Performance review in ' + (G.job.review == null ? REVIEW.every : G.job.review) + ' month' + (G.job.review === 1 ? '' : 's') + ': answer ' + REVIEW.pass + ' of ' + REVIEW.n + ' money questions right to keep your job.' + (G.job.strike ? ' <b class="dn">You’re on a performance plan.</b>' : '') + '</p>' +
      '<div class="ty-ranks">' + j.ranks.map((r, i) => '<span class="' + (i < G.job.rank ? 'done' : i === G.job.rank ? 'cur' : '') + '">' + esc(r[0]) + '</span>').join('') + '</div>' +
      (G.job.rank < j.ranks.length - 1 ? '<p class="muted" style="margin:8px 0 0">' + (blockedUp() ? 'To move up, finish ' + EDU[j.need].name.toLowerCase() + '.' : 'Next promotion in about ' + Math.max(1, PROMO_MONTHS - G.job.months) + ' month' + (PROMO_MONTHS - G.job.months === 1 ? '' : 's') + ' of work.') + '</p>' : '<p class="muted" style="margin:8px 0 0">You’re at the top of this career.</p>') + '</div>'
      : '<div class="card"><b>No job right now.</b> Your businesses are your only income.</div>';
    const slip = s ? '<div class="card"><h3 style="margin:0 0 6px">Last paycheck</h3><table class="life-t"><tr><td>Gross pay</td><td>' + usd(s.gross) + '</td></tr><tr><td>Federal income tax</td><td class="dn">-' + usd(s.fed) + '</td></tr><tr><td>State income tax</td><td class="dn">-' + usd(s.state) + '</td></tr><tr><td>Social Security and Medicare (FICA)</td><td class="dn">-' + usd(s.fica) + '</td></tr>' +
      (s.k401 ? '<tr><td>401(k), 4% (+4% employer match)</td><td class="dn">-' + usd(s.k401) + '</td></tr>' : '') + (s.health ? '<tr><td>Health insurance (employer plan)</td><td class="dn">-' + usd(s.health) + '</td></tr>' : '') + '<tr><th>Take-home pay</th><th>' + usd(s.take) + '</th></tr></table></div>' : '';
    const edu = G.edu ? '<div class="card">📚 <b>' + esc(EDU[G.edu.id].name) + '</b>: ' + G.edu.left + ' month' + (G.edu.left === 1 ? '' : 's') + ' to go. Loan payments start when you finish.' +
      '<p class="ty-note2">📝 Next exam in ' + (G.edu.next == null ? EXAM.every : G.edu.next) + ' month' + (G.edu.next === 1 ? '' : 's') + ': answer ' + EXAM.pass + ' of ' + EXAM.n + ' right to stay in school.' + (G.edu.strike ? ' <b class="dn">You’re on academic probation.</b>' : '') + '</p>' + (G.job && !JOBS[G.job.id].pt ? ' <span class="muted">Working full time and going to school is tiring, so happiness drops a little each month.</span>' : '') + '</div>'
      : '<div class="life-grid">' + Object.keys(EDU).filter(k => !G.degrees.includes(k)).map(k => { const e = EDU[k]; return '<button class="life-opt" data-edu="' + k + '"><b>📚 ' + esc(e.name) + '</b><span>' + e.months + ' months · ' + usd(e.cost) + ' (grants cover 30%, the rest is a 6.5% loan)</span><span class="muted">Unlocks: ' + esc(e.unlock) + '</span></button>'; }).join('') + '</div>';
    const list = Object.keys(JOBS).filter(k => !G.job || k !== G.job.id).map(k => { const jj = JOBS[k], ok = !jj.need || G.degrees.includes(jj.need) || jj.needAfter;
      return '<button class="life-opt" data-job="' + k + '"' + (ok ? '' : ' disabled') + '><b>' + jj.icon + ' ' + esc(jj.ranks[0][0]) + '</b><span>' + usd(jj.ranks[0][1]) + ' a month to start, up to ' + usd(jj.ranks[jj.ranks.length - 1][1]) + '</span>' + (ok ? '' : '<small class="muted">Needs ' + esc(EDU[jj.need].name.toLowerCase()) + '</small>') + '</button>'; }).join('');
    return '<h3 style="margin:4px 0 8px">Your job</h3>' + cur + slip + '<h3 style="margin:18px 0 8px">School</h3>' + edu + (G.degrees.length ? '<p class="muted">Finished: ' + G.degrees.map(d => esc(EDU[d].name)).join(', ') + '</p>' : '') +
      '<h3 style="margin:18px 0 8px">Side gigs</h3><p class="muted" style="margin:0 0 8px">Quick extra cash any time. Gig income has no taxes taken out, so you owe them at tax time.</p><div class="life-grid">' +
      GIGS.map(g => '<button class="life-opt" data-gig="' + g.id + '"><b>' + g.icon + ' ' + esc(g.name) + ' +' + usd(g.pay * infl()) + '</b><span>' + esc(g.d) + '</span><small class="muted" data-gigw="' + g.id + '">ready</small></button>').join('') + '</div>' +
      (G.fi && !G.retired ? '<div class="card">🏝️ Your passive income covers your bills. You can <button class="btn sun sm" id="ty-retire">Retire early</button></div>' : '') +
      '<h3 style="margin:18px 0 8px">Switch careers</h3><div class="life-grid">' + list + (G.job ? '<button class="life-opt" data-job="none"><b>🚪 Quit and run your businesses</b><span>Only if your business profit covers your bills.</span></button>' : '') + '</div>'; }
  function vMoney() {
    const o = loanOffer('biz'), bills = monthlyBills(), ef = (G.save + Math.max(0, G.cash)) / Math.max(1, bills);
    const stocks = STK.map(s => { const p = G.prices[s.sym], h = G.stocks[s.sym], v = h ? h.sh * p : 0, gl = h ? v - h.cost : 0;
      return '<div class="ty-stk"><div><b>' + s.sym + '</b> <small class="muted">' + esc(s.name) + '</small><div class="mono">' + usd(p) + (h ? ' · you own ' + h.sh + ' (' + big(v) + ', <span class="' + (gl >= 0 ? 'up' : 'dn') + '">' + (gl >= 0 ? '+' : '') + big(gl) + '</span>)' : '') + '</div></div>' +
        '<div class="ty-qty"><input type="number" min="1" step="1" inputmode="numeric" value="1" aria-label="Shares of ' + s.sym + '" data-q="' + s.sym + '"><button class="btn ghost sm" data-sb="' + s.sym + '">Buy</button><button class="btn ghost sm" data-ss="' + s.sym + '"' + (h ? '' : ' disabled') + '>Sell</button></div></div>'; }).join('');
    const loans = G.loans.map((l, i) => '<tr><td>' + esc(l.name) + ' <small class="muted">' + (l.apr * 100).toFixed(1) + '%' + (l.defer && G.edu ? ' · paused while in school' : '') + '</small></td><td>' + usd(l.bal) + '</td><td>' + usd(l.pay) + '/mo</td><td><button class="btn ghost sm" data-po="' + i + '">Pay off</button></td></tr>').join('');
    return '<div class="card"><h3 style="margin:0 0 6px">Savings account <small class="muted">4% a year</small></h3><p style="margin:0 0 8px">' + usd(G.save) + ' saved. Your emergency fund covers <b>' + ef.toFixed(1) + ' months</b> of bills (' + usd(bills) + '/month). Aim for 3 to 6.</p>' +
      '<div class="ty-qty"><input type="number" min="1" step="50" inputmode="numeric" value="500" aria-label="Amount to move" id="ty-amt"><button class="btn ghost sm" id="ty-dep">Move to savings</button><button class="btn ghost sm" id="ty-wd">Move to cash</button></div></div>' +
      '<div class="card"><h3 style="margin:0 0 6px">Investing</h3><p class="muted" style="margin:0 0 8px">Prices change at the end of each month. Gains are taxed when you sell. These are pretend companies from the Practice Market.</p>' + stocks +
      (G.retire ? '<p style="margin:10px 0 0">401(k) retirement account: <b>' + usd(G.retire) + '</b></p>' : '') + '</div>' +
      '<div class="card"><h3 style="margin:0 0 6px">Credit card</h3>' + (G.card ? '<p style="margin:0">Owed: <b>' + usd(G.card.bal) + '</b> of a ' + usd(G.card.limit) + ' limit, 25% interest. <label style="display:inline-flex;gap:6px;align-items:center;margin-left:6px"><input type="checkbox" id="ty-auto"' + (G.card.auto ? ' checked' : '') + '> Pay in full automatically</label></p>' +
        (G.card.bal > 0 ? '<button class="btn ghost sm" id="ty-paycard" style="margin-top:8px">Pay it off now</button>' : '') : '<p style="margin:0 0 8px">No card yet. A card used lightly and paid in full builds your credit score.</p><button class="btn ghost sm" id="ty-card">Apply for a starter card</button>') + '</div>' +
      '<div class="card"><h3 style="margin:0 0 6px">Loans</h3>' + (loans ? '<table class="life-t"><tr><th>Loan</th><th>Owed</th><th>Payment</th><th></th></tr>' + loans + '</table>' : '<p class="muted" style="margin:0">No loans. Debt free!</p>') +
      '<p style="margin:12px 0 6px"><b>Business loan:</b> ' + (o.max >= 500 ? 'the bank will lend up to ' + usd(o.max) + ' at ' + (o.apr * 100).toFixed(0) + '% for 5 years, based on your income and credit score.' : 'not available yet. Banks lend based on your income and credit score.') + '</p>' +
      (o.max >= 500 ? '<div class="ty-qty"><input type="number" min="500" step="500" inputmode="numeric" value="' + Math.min(o.max, 15000) + '" aria-label="Loan amount" id="ty-loan"><button class="btn ghost sm" id="ty-borrow">Borrow</button></div>' : '') + '</div>' +
      vCredit() +
      '<div class="card"><h3 style="margin:0 0 6px">Recent money</h3><table class="life-t">' + (G.ledger.slice(0, 12).map(x => '<tr><td>' + esc(x.t) + '</td><td class="' + (x.amt < 0 ? 'dn' : 'up') + '">' + (x.amt > 0 ? '+' : '') + usd(x.amt) + '</td></tr>').join('') || '<tr><td class="muted">Nothing yet.</td><td></td></tr>') + '</table></div>'; }
  function vCredit() {
    if (!G.score) return '<div class="card"><h3 style="margin:0 0 6px">Credit report</h3><p class="muted" style="margin:0">No credit history yet. A credit card or loan, paid on time for a few months, creates your score.</p></div>';
    const use = G.card ? G.card.bal / G.card.limit : 0, first = G.m - (G.ontime + G.missed), mix = (G.card ? 1 : 0) + (G.loans.length ? 1 : 0);
    const row = (k, pct, v, ok, tip) => '<tr><td><b>' + k + '</b> <small class="muted">' + pct + '</small><div class="muted" style="font-size:12px">' + tip + '</div></td><td class="' + (ok ? 'up' : 'dn') + '">' + v + '</td></tr>';
    return '<div class="card"><h3 style="margin:0 0 6px">Credit report: ' + G.score + '</h3><table class="life-t">' +
      row('Payment history', '35%', G.missed ? G.missed + ' missed' : 'All on time', !G.missed, G.ontime + ' on-time months. Missed payments stay on your report for 7 years.') +
      row('Amount owed (card use)', '30%', Math.round(use * 100) + '%', use <= .3, 'Keep card balances under 30% of the limit, and lower is better.') +
      row('Length of history', '15%', Math.max(0, G.ontime + G.missed) + ' months', G.ontime + G.missed >= 24, 'Older accounts help. Don’t close your oldest card.') +
      row('Credit mix', '10%', mix === 2 ? 'Card and loans' : mix ? 'One type' : 'None', mix === 2, 'Having both cards and loans helps a little.') +
      row('Collections', '', G.collections != null ? 'Yes' : 'None', G.collections == null, G.collections != null ? 'An account went to collections. It fades after 7 years.' : 'Bills that go unpaid for months get sent to collections.') + '</table></div>'; }
  function vLife() {
    const homes = HOMES.map(h => '<button class="life-opt" data-home="' + h.id + '"' + (h.id === G.home ? ' aria-current="true"' : '') + '><span class="life-ic">' + h.icon + '</span><b>' + esc(h.name) + (h.id === G.home ? ' ✓' : '') + '</b><span>' + esc(h.d) + '</span>' + (h.price ? '<small class="muted">Needs 20% down (' + usd(h.price * .2) + ') plus closing costs, and a credit score of 620+.</small>' : '') + '</button>').join('');
    const cars = CARS.map(c => '<div class="life-opt' + (c.id === G.car ? ' cur' : '') + '"><span class="life-ic">' + c.icon + '</span><b>' + esc(c.name) + (c.id === G.car ? ' ✓' : '') + '</b><span>' + esc(c.d) + '</span>' +
      (c.id === G.car ? '' : '<div class="ty-acts">' + (c.price ? '<button class="btn ghost sm" data-car="' + c.id + '">Pay cash</button><button class="btn ghost sm" data-carf="' + c.id + '">Finance (10% down)</button>' : '<button class="btn ghost sm" data-car="' + c.id + '">Switch</button>') + '</div>') + '</div>').join('');
    const mort = G.loans.find(l => l.kind === 'mortgage');
    return (homeOwned() ? '<div class="card">🏠 Your home is worth <b>' + usd(G.homeVal) + '</b>. ' + (mort ? 'You owe ' + usd(mort.bal) + ' on the mortgage, so your equity is <b>' + usd(G.homeVal - mort.bal) + '</b>. Each payment adds to it.' : 'It’s paid off!') + '</div>' : '') +
      '<h3 style="margin:4px 0 8px">Where you live</h3><div class="life-grid">' + homes + '</div><h3 style="margin:18px 0 8px">How you get around</h3><div class="life-grid">' + cars + '</div>' +
      '<h3 style="margin:18px 0 8px">The net worth ladder</h3><div class="card"><p class="muted" style="margin:0 0 8px">Net worth = everything you own minus everything you owe. Cars lose value; homes, businesses and investments can grow.</p>' +
      LADDER.slice(1).map((r, i) => '<div class="ty-rung' + (G.bestRung >= i + 1 ? ' done' : '') + '"><span>' + r[1] + ' ' + r[2] + '</span><span class="mono">' + (r[0] <= 0 ? '$0' : big(r[0])) + '</span></div>').join('') + '</div>' +
      '<div class="card"><h3 style="margin:0 0 6px">Money health: ' + grade() + '</h3><p class="muted" style="margin:0">Your grade looks at your emergency fund, card debt, overdrafts, investing, net worth and happiness. Your teacher sees this grade.</p></div>' +
      vFamily() + vInsurance() + vEcon() + vAch() +
      '<div style="margin-top:16px"><button class="btn ghost sm" id="ty-restart">Start a new life</button></div>'; }
  function vFamily() { const p = G.partner;
    return '<h3 style="margin:18px 0 8px">Family</h3><div class="card">' + (p ? (p.stage === 'married' ? '💍 Married. Your partner earns about ' + usd(partnerNet()) + ' a month after taxes, and your household shares costs (+' + usd(350 * infl()) + '/month).' : '❤️ Dating since ' + MONTHS[p.since % 12] + ', year ' + (Math.floor(p.since / 12) + 1) + '.') : 'Single. Life events may change that!') +
      (G.kids.length ? '<p style="margin:8px 0 0">👶 ' + G.kids.map(k => Math.floor(kidAge(k) / 12) + ' yr').join(', ') + ' · kids cost ' + usd(kidCost()) + '/month, minus about ' + usd(167 * G.kids.filter(k => kidAge(k) < 204).length) + ' child tax credit.</p>' : '') + '</div>'; }
  function vInsurance() { const ji = jobIns();
    return '<h3 style="margin:18px 0 8px">Insurance</h3><div class="card"><p style="margin:0 0 8px"><b>Health:</b> ' + (ji ? 'covered by your employer’s plan ($150 a month comes out of your paycheck, $150 doctor visits, at most $1,500 for big bills).' : 'choose a plan.') + '</p>' +
      (ji ? '' : '<div class="life-grid">' + Object.keys(HEALTH).map(k => '<button class="life-opt" data-health="' + k + '"' + ((G.health || 'none') === k ? ' aria-current="true"' : '') + '><b>' + esc(HEALTH[k].name) + ((G.health || 'none') === k ? ' ✓' : '') + '</b><span>' + esc(HEALTH[k].d) + '</span></button>').join('') + '</div>') +
      '<div class="ty-acts" style="margin-top:10px"><button class="btn ghost sm" id="ty-renters">' + (G.renters ? '✓ Renters insurance ($18/mo)' : 'Add renters insurance ($18/mo)') + '</button><button class="btn ghost sm" id="ty-lifeins">' + (G.lifeIns ? '✓ Term life insurance ($35/mo)' : 'Add term life insurance ($35/mo)') + '</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">A deductible is what you pay before insurance kicks in. Lower monthly cost usually means a higher deductible.</p></div>'; }
  function vEcon() { const ec = EC();
    return '<h3 style="margin:18px 0 8px">The economy</h3><div class="card"><p style="margin:0"><b>' + ec.icon + ' ' + ec.name + '.</b> Interest rate ' + (ec.rate * 100).toFixed(1) + '% (your savings earn about that). Prices are up ' + Math.round((infl() - 1) * 100) + '% since you turned 18 (inflation).</p>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 0">Booms bring more sales and rising prices. Recessions bring fewer sales, lower stock prices, layoffs and lower interest rates. Both pass.</p></div>'; }
  function vAch() { const got = ACH.filter(a => G.ach[a[0]]).length;
    return '<h3 style="margin:18px 0 8px">Achievements · ' + got + ' of ' + ACH.length + '</h3><div class="ty-ach">' + ACH.map(a => '<div class="' + (G.ach[a[0]] ? 'on' : '') + '" title="' + esc(a[3]) + '"><span>' + a[1] + '</span><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small></div>').join('') + '</div>' +
      (S.sch && S.sch.key && window.TickerCloud ? '<div style="margin-top:12px"><button class="btn ghost sm" id="ty-board">🏆 Class leaderboard</button><div id="ty-boardb"></div></div>' : ''); }
  function wire() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
    on('[data-b]', b => bizAct(+b.dataset.b, b.dataset.a)); on('[data-buy]', b => buyBiz(b.dataset.buy));
    const all = $('#ty-all'); if (all) all.onclick = collectAll;
    on('[data-sb]', b => buy(b.dataset.sb, +$('[data-q="' + b.dataset.sb + '"]').value)); on('[data-ss]', b => sell(b.dataset.ss, +$('[data-q="' + b.dataset.ss + '"]').value));
    on('[data-po]', b => payoff(+b.dataset.po)); on('[data-edu]', b => enroll(b.dataset.edu)); on('[data-job]', b => setJob(b.dataset.job));
    on('[data-home]', b => setHome(b.dataset.home)); on('[data-car]', b => setCar(b.dataset.car, false)); on('[data-carf]', b => setCar(b.dataset.carf, true));
    const amt = () => Math.max(0, +($('#ty-amt') || {}).value || 0);
    if ($('#ty-dep')) $('#ty-dep').onclick = () => { const a = Math.min(amt(), Math.max(0, G.cash)); if (a < 1) return toast('Not enough cash.'); G.cash -= a; G.save += a; toast('Moved ' + usd(a) + ' to savings.'); persist(true); render(); };
    if ($('#ty-wd')) $('#ty-wd').onclick = () => { const a = Math.min(amt(), G.save); if (a < 1) return toast('Not enough in savings.'); G.save -= a; G.cash += a; toast('Moved ' + usd(a) + ' to cash.'); persist(true); render(); };
    if ($('#ty-card')) $('#ty-card').onclick = () => { G.card = { bal: 0, limit: G.score >= 700 ? 5000 : 1000, auto: true }; toast('Approved! Pay it in full each month to build credit.'); persist(true); render(); };
    if ($('#ty-auto')) $('#ty-auto').onchange = e => { G.card.auto = e.target.checked; persist(true); };
    if ($('#ty-paycard')) $('#ty-paycard').onclick = () => { const a = Math.min(G.card.bal, Math.max(0, G.cash)); if (a < 1) return toast('Not enough cash.'); pay(a, 'Paid credit card'); G.card.bal -= a; persist(true); render(); };
    if ($('#ty-borrow')) $('#ty-borrow').onclick = () => takeLoan(+$('#ty-loan').value || 0);
    on('[data-rent]', b => buyRental(b.dataset.rent)); on('[data-ra]', b => rentalAct(+b.dataset.ra, b.dataset.a)); on('[data-gig]', b => gig(b.dataset.gig));
    on('[data-health]', b => { G.health = b.dataset.health; toast(HEALTH[G.health].name + '.'); persist(true); render(); });
    if ($('#ty-renters')) $('#ty-renters').onclick = () => { G.renters = G.renters ? 0 : 1; persist(true); render(); };
    if ($('#ty-lifeins')) $('#ty-lifeins').onclick = () => { G.lifeIns = G.lifeIns ? 0 : 1; persist(true); render(); };
    if ($('#ty-retire')) $('#ty-retire').onclick = () => retireScreen();
    if ($('#ty-board')) $('#ty-board').onclick = () => { const el = $('#ty-boardb'); el.innerHTML = tx('<p class="muted">Loading…</p>');
      window.TickerCloud.rpc('class_board', { p_key: S.sch.key }).then(b => { if (!b || !b.found) { el.innerHTML = tx('<p class="muted">Join a class to see a leaderboard.</p>'); return; } if (!b.league) { el.innerHTML = tx('<p class="muted">Your teacher has the class league turned off.</p>'); return; }
        const rows = (b.rows || []).filter(r => r.life_nw != null).sort((x, y) => y.life_nw - x.life_nw).slice(0, 15);
        el.innerHTML = tx(rows.length ? '<table class="life-t" style="margin-top:8px"><tr><th>#</th><th>Player</th><th>Best net worth</th></tr>' + rows.map((r, i) => '<tr' + (r.me ? ' style="font-weight:700"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.name) + (r.me ? ' (you)' : '') + '</td><td>' + big(r.life_nw) + '</td></tr>').join('') + '</table>' : '<p class="muted">No net worth scores yet. They show up as classmates play.</p>'); }).catch(() => { el.innerHTML = tx('<p class="muted">Couldn’t load the leaderboard. Check your connection.</p>'); }); };
    if ($('#ty-restart')) $('#ty-restart').onclick = e => { if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = 'Tap again to erase this life and start over'; return; } G = null; S.life = Object.assign({}, S.life || {}, { g: null }); try { save(); } catch (er) {} intro(); };
  }
  function live() { // update the numbers that move every tick, without redrawing the screen
    const c = $('#ty-clock'); if (c) c.style.width = (G.t / MONTH_MS * 100) + '%';
    const cash = $('#ty-cash'); if (cash) { cash.textContent = big(G.cash); cash.className = G.cash < 0 ? 'dn' : ''; }
    const nw = $('#ty-nw'); if (nw) nw.textContent = big(netWorth());
    G.biz.forEach((b, i) => { const nn = bizNums(b), sb = document.querySelector('[data-stock="' + i + '"]'), sc = document.querySelector('[data-sc="' + i + '"]'), em = document.querySelector('[data-empty="' + i + '"]');
      if (sb && nn.cap) { const pc = clamp((b.stock || 0) / nn.cap * 100, 0, 100); sb.style.width = pc + '%'; sb.parentNode.classList.toggle('low', pc < 25); } if (sc) sc.textContent = usd(Math.max(0, nn.cap - (b.stock || 0))); if (em) em.hidden = !b.empty;
      if (b.mgr) return; const n = nn.cash, bar = document.querySelector('[data-till="' + i + '"]'), tv = document.querySelector('[data-tv="' + i + '"]'), f = document.querySelector('[data-full="' + i + '"]');
      if (bar) bar.style.width = clamp((b.till || 0) / Math.max(1, n) * 100, 0, 100) + '%'; if (tv) tv.textContent = usd(b.till); if (f) f.hidden = !((b.till || 0) >= n * .999 && n > 0); }); }
  function pop(t) { const el = document.createElement('div'); el.className = 'ty-pop'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1100); }

  /* ---------- school exams and job reviews: answer questions to stay in ---------- */
  const EXAM = { n: 5, pass: 3, every: 4 }, REVIEW = { n: 4, pass: 3, every: 6 };
  function qbank(topics) { try { const items = []; (typeof WISE_TOPICS !== 'undefined' ? WISE_TOPICS : []).filter(t => topics.includes(t.id)).forEach(t => t.stages.forEach(id => { if (typeof BYID !== 'undefined' && BYID[id]) bankOf(id).forEach(q => items.push(q)); }));
    return items.length ? items : null; } catch (e) { return null; } }
  function questions(kind, n) { const all = ['income', 'money', 'banking', 'credit', 'investing', 'insurance', 'future'], jobT = { retail: ['money', 'banking', 'income'], barista: ['money', 'banking', 'income'], elec: ['income', 'insurance', 'credit'], nurse: ['insurance', 'income', 'money'], dev: ['investing', 'credit', 'income'], acct: ['income', 'investing', 'credit', 'banking'], teach: ['future', 'money', 'income'] };
    if (kind === 'tax') return TAXQ.slice().sort(() => Math.random() - .5).slice(0, n).map(q => ({ raw: null, q: q.q, o: q.o.map((t, i) => ({ t, ok: i === 0 })).sort(() => Math.random() - .5), why: q.why }));
    const items = qbank(kind === 'exam' ? all : jobT[G.job.id] || all); if (!items) return null;
    try { return drawQs(items, n).map(q => { const order = q.o.map((t, i) => ({ t, ok: i === 0 })).sort(() => Math.random() - .5); return { raw: q, q: q.q, o: order, why: q.why }; }); } catch (e) { return null; } }
  function retireScreen() {
    G.retired = 1; G.ach.retired = G.ach.retired || G.m; const nw = netWorth(), r = rung(nw), stars = Math.max(1, r), got = Object.keys(G.ach).length;
    const m = openModal('<span class="eyebrow">🏖️ Retirement</span><h3 style="margin:8px 0">You retired at ' + G.age + '!</h3><table class="life-t"><tr><td>Net worth</td><td>' + usd(nw) + '</td></tr><tr><td>Net worth level</td><td>' + LADDER[r][1] + ' ' + LADDER[r][2] + '</td></tr>' +
      '<tr><td>Passive income</td><td>' + usd(passive()) + '/month</td></tr><tr><td>Money health grade</td><td>' + grade() + '</td></tr><tr><td>Achievements</td><td>' + got + ' of ' + ACH.length + '</td></tr></table>' +
      '<p style="margin:12px 0">Retirement money usually comes from Social Security, a 401(k) or IRA, and your investments. A common rule: you can spend about 4% of your investments each year.</p>' +
      '<p>Start a new generation and your family gets a head start: <b>+' + usd(stars * 500) + '</b> of starting cash for each level you reached, added up across generations.</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sun" id="ty-gen">Start a new generation</button><button class="btn ghost" id="ty-ok">Keep playing</button></div>');
    if (!m) return; G.job = null;
    m.querySelector('#ty-ok').onclick = () => { closeModal(); persist(true); render(); };
    m.querySelector('#ty-gen').onclick = () => { S.lifeLegacy = (S.lifeLegacy || 0) + stars; const gen = G.gen || 1; closeModal(); G = null; S.life = Object.assign({}, S.life || {}, { g: null, gen }); try { save(); } catch (e) {} intro(); };
    try { addXP(50); confetti(); } catch (e) {} persist(true); }
  function checkAch() { const a = G.ach, nw = netWorth(), give = id => { if (!a[id]) { a[id] = G.m; const x = ACH.find(z => z[0] === id); toast('🏆 Achievement: ' + x[2] + '!'); try { addXP(15); } catch (e) {} } };
    if (G.biz.length) give('firstbiz'); if (G.biz.length >= 3) give('three'); if (G.biz.some(b => b.mgr)) give('mgr'); if (nw >= 1e4) give('k10'); if (nw >= 1e5) give('k100'); if (nw >= 1e6) give('m1');
    if (homeOwned()) give('home'); if (G.degrees.length) give('degree'); if (G.job && G.job.rank === JOBS[G.job.id].ranks.length - 1 && !JOBS[G.job.id].pt) give('top');
    if (G.save >= monthlyBills() * 6) give('ef6'); if (G.age >= 22 && debts() < 1) give('debtfree'); if (stockVal() >= 1e4) give('inv10'); if (G.score >= 800) give('c800'); if (G.fi) give('fi');
    if (married()) give('married'); if (G.rentals.length) give('landlord'); }
  function quizDue() { if (modal || !G.quiz || !G.quiz.length) return; runQuiz(G.quiz.shift()); }
  function runQuiz(kind) {
    if ((kind === 'exam' && !G.edu) || (kind === 'review' && !G.job) || (kind === 'tax' && !G.taxdue)) return quizDue();
    if (kind === 'retire') return G.retired ? quizDue() : retireScreen();
    const cfg = kind === 'exam' ? EXAM : kind === 'tax' ? { n: 3, pass: 2 } : REVIEW, qs = questions(kind, cfg.n); if (!qs) return;
    const td = G.taxdue, title = kind === 'exam' ? '📚 ' + EDU[G.edu.id].name + ': exam' : kind === 'tax' ? '🧾 File your ' + (Math.floor(G.m / 12) + 2025) + ' tax return' : '💼 Performance review: ' + JOBS[G.job.id].ranks[G.job.rank][0];
    const intro = kind === 'tax' ? 'It’s April. Here’s your year: wages ' + usd(td.wages) + ' (federal tax withheld ' + usd(td.wh) + '), business, gig and rental profit ' + usd(td.biz) + ', investment gains ' + usd(td.gains + td.div) + '. Answer ' + cfg.pass + ' of ' + cfg.n + ' right to file correctly.' : kind === 'exam' ? 'Answer at least ' + cfg.pass + ' of ' + cfg.n + ' questions right to pass.' + ((G.edu.strike || 0) ? ' <b>You’re on academic probation: fail again and you’ll be dropped from school.</b>' : '')
      : 'Your boss checks your money and job skills. Get at least ' + cfg.pass + ' of ' + cfg.n + ' right to keep your job.' + ((G.job.strike || 0) ? ' <b>You’re on a warning: fail again and you’ll be let go.</b>' : '');
    let k = 0, right = 0;
    const m = openModal(''); if (!m) return; const card = m.querySelector('.ty-card');
    const show = () => { const x = qs[k];
      card.innerHTML = tx('<span class="eyebrow">' + esc(title) + '</span><p class="muted" style="margin:6px 0 10px">' + intro + '</p><div class="qprog"><i style="width:' + (k / qs.length * 100) + '%"></i></div>' +
        '<p class="muted" style="margin:10px 0 2px">Question ' + (k + 1) + ' of ' + qs.length + ' · ' + right + ' right so far</p><div class="qcard"><p style="font-size:17px;font-weight:700;margin:4px 0 10px">' + esc(x.q) + '</p><div class="life-grid">' +
        x.o.map((o, i) => '<button class="life-opt" data-qa="' + i + '"><b>' + esc(o.t) + '</b></button>').join('') + '</div></div><p id="ty-why" style="margin:10px 0 0" hidden></p>');
      card.querySelectorAll('[data-qa]').forEach(b => { b.onclick = () => { const o = x.o[+b.dataset.qa]; if (o.ok) right++; try { logQ(x.raw, o.ok); } catch (e) {}
        card.querySelectorAll('[data-qa]').forEach(y => { y.disabled = true; if (x.o[+y.dataset.qa].ok) y.style.borderColor = 'var(--up)'; }); if (!o.ok) b.style.borderColor = 'var(--down)';
        const w = card.querySelector('#ty-why'); w.hidden = false; w.innerHTML = tx((o.ok ? '✅ Right! ' : '❌ Not quite. ') + esc(x.why || '') + '<br><button class="btn sun" id="ty-qn" style="margin-top:10px">' + (k < qs.length - 1 ? 'Next question' : 'See results') + '</button>');
        card.querySelector('#ty-qn').onclick = () => { k++; if (k < qs.length) show(); else done(); }; }; }); };
    const done = () => { const pass = right >= cfg.pass, perfect = right === qs.length; let msg = '';
      if (kind === 'tax') { const owe = td.bt + td.gt; if (owe >= 1) pay(owe, 'Taxes on business profit and investments'); G.taxdue = null;
        if (pass) { if (td.refund >= 1) earn(td.refund, 'Federal tax refund'); G.ach.taxes = G.ach.taxes || G.m; msg = 'Filed correctly! ' + (owe >= 1 ? 'You paid ' + usd(owe) + ' of tax on business and investment income (no tax was withheld from it). ' : '') + (td.refund >= 1 ? 'Your employer withheld a little extra from your paychecks, so you got a ' + usd(td.refund) + ' refund.' : 'No refund this year.'); try { addXP(10); } catch (e) {} }
        else { pay(150, 'IRS penalty for a filing mistake'); msg = 'Your return had mistakes. The IRS fixed them, sent a letter and charged a $150 penalty. ' + (owe >= 1 ? 'You also paid ' + usd(owe) + ' of tax on business and investment income. ' : '') + 'Free tools like IRS Free File help you file right.'; } }
      else if (kind === 'exam') { if (pass) { G.edu.strike = 0; G.edu.next = EXAM.every; msg = '🎉 You passed with ' + right + ' of ' + qs.length + '!'; if (perfect) { earn(500, 'Scholarship for a perfect exam'); msg += ' A perfect score earned you a $500 scholarship.'; } try { addXP(10 + right * 2); } catch (e) {} }
        else if (!G.edu.strike) { G.edu.strike = 1; G.edu.next = 1; msg = 'You got ' + right + ' of ' + qs.length + ', so you didn’t pass. You’re on academic probation and will retake the exam next month. Review the lessons on the map to get ready.'; }
        else { const e = EDU[G.edu.id]; G.edu = null; G.loans.forEach(l => { if (l.defer === 'school') l.defer = ''; }); G.happy -= 10; msg = 'You got ' + right + ' of ' + qs.length + ' and failed again, so you were dropped from ' + e.name.toLowerCase() + '. Your student loan payments start now, even without a degree. That’s why finishing school matters. You can enroll again in the Career tab.'; } }
      else { if (pass) { G.job.strike = 0; G.job.review = REVIEW.every; G.job.months += 2; msg = '🎉 Great review: ' + right + ' of ' + qs.length + '! You’re 2 months closer to a promotion.'; if (perfect) { G.ach.review = G.ach.review || G.m; earn(400, 'Bonus for a perfect review'); msg += ' A perfect review also earned you a $400 bonus.'; } try { addXP(8 + right * 2); } catch (e) {} }
        else if (!G.job.strike) { G.job.strike = 1; G.job.review = 2; msg = 'You got ' + right + ' of ' + qs.length + '. Your boss put you on a performance plan, with another review in 2 months. Brush up with the lessons on the map.'; }
        else { const r = JOBS[G.job.id].ranks[G.job.rank][0]; G.job = null; G.happy -= 12; msg = 'You got ' + right + ' of ' + qs.length + ' and didn’t improve, so you lost your job as ' + r.toLowerCase() + '. No paycheck until you find a new one in the Career tab. This is why an emergency fund matters.'; } }
      card.innerHTML = tx('<span class="eyebrow">' + esc(title) + '</span><h3 style="margin:8px 0">' + (pass ? 'Passed' : 'Not passed') + ': ' + right + ' of ' + qs.length + '</h3><p style="font-size:16px">' + esc(msg).replace(/^🎉/, '🎉') + '</p><button class="btn sun" id="ty-ok">Back to my life</button>');
      card.querySelector('#ty-ok').onclick = () => { closeModal(); persist(true); render(); setTimeout(quizDue, 300); }; persist(true); };
    show(); }

  /* ---------- pop-ups ---------- */
  function openModal(html) { let m = $('#ty-modal'); if (!m) { m = document.createElement('div'); m.id = 'ty-modal'; document.body.appendChild(m); } modal = true; m.hidden = false; m.innerHTML = tx('<div class="ty-back"></div><div class="ty-card" role="dialog" aria-modal="true">' + html + '</div>'); return m; }
  function closeModal() { const m = $('#ty-modal'); if (m) { m.hidden = true; m.innerHTML = ''; } modal = false; }
  function note(lines, title) { if (modal) { setTimeout(() => note(lines, title), 600); return; }
    const m = openModal('<span class="eyebrow">' + esc(title || 'This month') + '</span>' + lines.map(l => '<p style="margin:8px 0;font-size:16px">' + esc(l) + '</p>').join('') + '<button class="btn sun" id="ty-ok" style="margin-top:8px">OK</button>');
    if (m) { $('#ty-ok').onclick = closeModal; $('#ty-ok').focus({ preventScroll: true }); } }
  function showEvent(ev) {
    const m = openModal('<div class="life-ev"><span class="eyebrow">Life happens</span><p style="font-size:18px;margin:6px 0 12px">' + ev.t() + '</p></div><div class="life-grid">' +
      ev.o.map((o, i) => { const dis = o.need && !o.need(); return '<button class="life-opt" data-e="' + i + '"' + (dis ? ' disabled' : '') + '><b>' + esc(o.t) + '</b>' + (dis ? '<small class="muted">Not available</small>' : '') + '</button>'; }).join('') + '</div>');
    if (!m) return;
    m.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { const lesson = ev.o[+b.dataset.e].fx(); G.happy = clamp(Math.round(G.happy), 0, 100);
      m.querySelector('.ty-card').innerHTML = tx('<span class="eyebrow">Money lesson</span><p style="font-size:17px;margin:6px 0 12px">' + esc(lesson) + '</p><button class="btn sun" id="ty-ok">Back to my life</button>');
      $('#ty-ok').onclick = () => { closeModal(); persist(true); render(); }; $('#ty-ok').focus({ preventScroll: true }); }; }); }

  /* ---------- free week ---------- */
  function trialOver() { return !S.full && !!G && G.m >= 1; }
  function trialEnd() { stopClock(); closeModal(); const nw = netWorth(); try { window.TT_track && window.TT_track('life_trial_end'); } catch (e) {}
    frame('<h2>Your free month is over!</h2><p class="lesson-text" style="font-size:16px">In your first month you earned your way to a net worth of <b>' + usd(nw) + '</b>' + (G.biz.length ? ' and started your first business' : '') + '. The full game keeps your life going: paychecks, promotions, school, bigger businesses, a home, investing and taxes.</p>' +
      '<div class="card" style="margin-top:10px">🔑 Subscribe (or join your class) to keep building from right where you stopped.</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn" id="ty-unlock">Unlock the full game</button><button class="btn ghost" id="ty-maps">Back to the map</button></div>');
    $('#ty-unlock').onclick = () => openPaywall(); $('#ty-maps').onclick = () => { stopClock(); showMap(); }; }
  /* ---------- open ---------- */
  function open() {
    const g = S.life && S.life.g; if (g && g.v === 2) G = ensure(g); else G = null;
    if (!G) return intro();
    if (!S.full) { if (trialOver()) return trialEnd(); render(); return; }
    const a = away(); render();
    if (a && (a.auto >= 1 || a.filled >= 1 || a.capped)) { const h = Math.floor(a.ms / 3600000), mi = Math.round(a.ms % 3600000 / 60000), lines = ['You were away for ' + (h ? h + ' hour' + (h === 1 ? '' : 's') + ' ' : '') + mi + ' minute' + (mi === 1 ? '' : 's') + '.'];
      if (a.auto >= 1) lines.push('👔 Your managers deposited ' + usd(a.auto) + ' into your cash.');
      if (a.filled >= 1) lines.push('💵 ' + usd(a.filled) + ' is waiting in your business tills. Tap Collect!');
      if (a.capped) lines.push('Some tills filled up while you were gone. Hire managers to keep earning longer.');
      if (a.ran) lines.push('A business ran out of supplies while you were away. Restock it, or hire a manager who restocks for you.');
      if (a.over) lines.push('Managers can earn for up to 8 hours while you’re away.');
      note(lines, 'Welcome back'); persist(true); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && G) persist(true); else if (!document.hidden && G && onScreen() && !timer) { if (!S.full) { if (trialOver()) trialEnd(); else render(); return; } const a = away(); render(); if (a && (a.auto >= 1 || a.filled >= 1)) note(['While you were away, your businesses earned ' + usd(a.auto + a.filled) + '.'], 'Welcome back'); } });
  addEventListener('pagehide', () => { if (G) persist(true); });

  const css = document.createElement('style');
  css.textContent = '.life-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}' +
    '.life-opt{display:flex;flex-direction:column;gap:4px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;padding:14px;font:inherit;cursor:pointer;min-height:56px}' +
    '.life-opt:hover:not(:disabled):not(div){border-color:var(--accent)} .life-opt:disabled,.life-opt[aria-disabled=true]{opacity:.55} .life-opt:disabled{cursor:not-allowed} .life-opt b{font-size:16px} .life-ic{font-size:28px;line-height:1}' +
    '.life-opt[aria-current=true],.life-opt.cur{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)} div.life-opt{cursor:default}' +
    '.life .card{margin-top:12px} .life-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(46%,120px),1fr));gap:8px;margin:10px 0}' +
    '.life-stats>div{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}.life-stats span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}.life-stats b{font-family:var(--f-mono);font-size:16px;overflow-wrap:anywhere}' +
    '.life-t{width:100%;border-collapse:collapse;font-size:14px}.life-t td,.life-t th{padding:6px 4px;border-bottom:1px solid var(--line);white-space:normal}.life-t td:first-child,.life-t th:first-child{text-align:left;font-family:var(--f-body)}.life-t td:not(:first-child),.life-t th:not(:first-child){text-align:right;white-space:nowrap}' +
    '.life .dn{color:var(--down)}.life .up{color:var(--up)}' +
    '.ty-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:16px}.btn.sm{padding:7px 12px;font-size:13px}' +
    '.ty-clock{height:6px;border-radius:99px;background:var(--surface2);overflow:hidden;margin:8px 0 0}.ty-clock i,.ty-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--sun),var(--ma));border-radius:99px;transition:width .25s linear}' +
    '.ty-bar{height:10px;border-radius:99px;background:var(--surface2);overflow:hidden;flex:1;min-width:80px}' +
    '.ty-ladder{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ty-ladder .ty-bar{flex-basis:100%;height:6px}' +
    '.ty-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:14px 0 6px;position:sticky;top:0;z-index:5;background:var(--bg);padding:6px 0}' +
    '.ty-tabs button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:10px 4px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}.ty-tabs button[aria-selected=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}' +
    '.ty-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px}.ty-row h3{margin:0}' +
    '.ty-bh{display:flex;align-items:center;gap:12px}.ty-bh>div:nth-child(2){flex:1;min-width:0}.ty-profit{text-align:right}.ty-profit span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}.ty-profit b{font-family:var(--f-mono);font-size:18px}' +
    '.ty-till{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}.ty-till .btn{white-space:nowrap}.ty-till.auto{background:var(--surface2);border-radius:10px;padding:8px 12px;font-size:14px}.ty-hint{font-size:13px;margin:6px 0 0}' +
    '.ty-stock{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;font-size:13px}.ty-stock>span{min-width:0;flex:1 1 100%;color:var(--muted)}.ty-bar.low i{background:var(--down)}' +
    '.ty-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(220,70,70,.12);border:1px solid var(--down);font-size:14px}.ty-biz.broke{border-color:var(--down)}.ty-warn{color:var(--down)!important}' +
    '.ty-note2{font-size:14px;margin:8px 0 0;padding:8px 10px;border-radius:10px;background:var(--surface2)}' +
    '.ty-econ{font-size:12px;padding:2px 8px;border-radius:99px;border:1px solid var(--line);margin-left:4px;white-space:nowrap}.ty-econ.rec{border-color:var(--down);color:var(--down)}.ty-econ.boom{border-color:var(--up);color:var(--up)}' +
    '.ty-ach{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(46%,150px),1fr));gap:8px}.ty-ach>div{border:1px solid var(--line);border-radius:12px;padding:10px;opacity:.45;display:flex;flex-direction:column;gap:2px}.ty-ach>div.on{opacity:1;border-color:var(--sun)}.ty-ach span{font-size:24px}.ty-ach b{font-size:14px}.ty-ach small{font-size:11px;color:var(--muted)}' +
    '.ty-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ty-pl{margin-top:8px;font-size:14px}.ty-pl summary{cursor:pointer;color:var(--muted)}' +
    '.ty-ranks{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ty-ranks span{font-size:12px;padding:4px 10px;border-radius:99px;border:1px solid var(--line)}.ty-ranks .done{opacity:.6}.ty-ranks .cur{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}' +
    '.ty-stk{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line)}.ty-stk>div:first-child{min-width:0;flex:1 1 200px}' +
    '.ty-qty{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ty-qty input[type=number]{width:96px;padding:7px 8px;border-radius:10px;border:1px solid var(--line);background:var(--surface2);color:var(--ink);font:inherit}' +
    '.ty-rung{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);opacity:.55}.ty-rung.done{opacity:1;font-weight:700}' +
    '#ty-modal{position:fixed;inset:0;z-index:2500;display:grid;place-items:center;padding:16px}#ty-modal[hidden]{display:none}.ty-back{position:absolute;inset:0;background:rgba(0,0,0,.55)}' +
    '.ty-card{position:relative;max-width:560px;width:100%;max-height:88vh;overflow:auto;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.4)}' +
    '.ty-pop{position:fixed;left:50%;top:40%;transform:translateX(-50%);z-index:2600;font-family:var(--f-display);font-weight:800;font-size:28px;color:var(--up);pointer-events:none;animation:typop 1.1s ease-out forwards}' +
    '@keyframes typop{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-60px)}}@media (prefers-reduced-motion:reduce){.ty-pop{animation:none}}' +
    '@media (max-width:520px){.ty-tabs button{font-size:12px;padding:9px 2px}.ty-profit b{font-size:16px}}';
  document.head.appendChild(css);
  window.TT_openLife = open;
})();
