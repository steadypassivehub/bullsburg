// Bullsburg W!SE certification prep, start/end-of-course skills checks and the note home to parents.
// Runs after the main game script and uses its helpers (S, BYID, bankOf, drawQs, logQ, shuffle, save, $, go, addXP, ...).
// Questions are original Bullsburg items. Bullsburg is not affiliated with or endorsed by W!SE.
(function () {
  var TOP = (typeof WISE_TOPICS !== 'undefined' ? WISE_TOPICS : []).map(function (t) { return Object.assign({}, t, { stages: t.stages.filter(function (id) { return BYID[id]; }) }); });
  var PASS = 70, KEEP = 20, FULL_N = 6, CHECK_N = 3, SMART_N = 15, TOPIC_N = 10;
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var byId = function (id) { return TOP.find(function (t) { return t.id === id; }); };
  var FREE = { income: true };   // without the full game, Paycheck Plaza topics are open
  var open = function (tid) { return S.full || S.teacher || FREE[tid]; };

  /* ---------- mastery and readiness ---------- */
  function wq() { if (!S.wq || typeof S.wq !== 'object') S.wq = {}; return S.wq; }
  function record(tid, ok) { var a = wq()[tid] = (wq()[tid] || []).concat(ok ? 1 : 0); if (a.length > KEEP) a.splice(0, a.length - KEEP); }
  function mastery(tid) { var a = wq()[tid] || []; return a.length ? Math.round(100 * a.reduce(function (s, x) { return s + x; }, 0) / a.length) : null; }
  // A topic counts fully once you've answered 8 of its questions, so readiness can't be gamed by one lucky answer.
  function readiness() { if (!TOP.length) return 0; var s = 0;
    TOP.forEach(function (t) { var m = mastery(t.id), n = (wq()[t.id] || []).length; if (m != null) s += m * Math.min(1, n / 8); }); return Math.round(s / TOP.length); }
  function bestTest() { return (S.wt || []).reduce(function (b, x) { return Math.max(b, x.pct); }, -1); }
  window.TT_wiseReady = readiness;
  window.TT_wiseSummary = function () { var tp = {}; TOP.forEach(function (t) { tp[t.id] = mastery(t.id); });
    var bt = bestTest(); return { ready: readiness(), pre: S.pre ? S.pre.pct : null, post: S.post ? S.post.pct : null, test: bt < 0 ? null : bt, tests: (S.wt || []).length, topics: tp }; };

  /* ---------- drawing questions ---------- */
  function poolOf(t) { return t.stages.reduce(function (a, id) { return a.concat(bankOf(id)); }, []); }
  function drawTopic(t, n) { return drawQs(poolOf(t), n).map(function (q) { q.tid = t.id; q.sid = String(q.key).split(':')[0]; return q; }); }
  function drawMixed(per) { return shuffle(TOP.reduce(function (a, t) { return a.concat(drawTopic(t, per)); }, [])); }
  function drawSmart(n) { // more questions from the topics you're weakest in
    var w = TOP.filter(function (t) { return open(t.id); }).map(function (t) { var m = mastery(t.id); return { t: t, w: m == null ? 70 : Math.max(10, 100 - m) }; });
    var sum = w.reduce(function (s, x) { return s + x.w; }, 0), out = [];
    w.forEach(function (x) { var k = Math.max(1, Math.round(n * x.w / sum)); out = out.concat(drawTopic(x.t, k)); });
    return shuffle(out).slice(0, n); }

  /* ---------- screens ---------- */
  function stage() { go('map', true); $('#map-home').hidden = true; var st = $('#stage'); st.hidden = false; window.scrollTo({ top: 0, behavior: 'auto' }); return st; }
  function sponsor() { var sp = S.sch && S.sch.sponsor; if (!sp || !sp.name) return '';
    return '<div class="sponsor-chip">Your school’s Bullsburg license is sponsored by <b>' + esc(sp.name) + '</b>' + (sp.note ? ' · ' + esc(sp.note) : '') + '</div>'; }
  function readyMsg(r) { return r >= 85 ? 'You’re ready. Keep your edge with a practice test now and then.' : r >= PASS ? 'On track to pass. Push your weakest topic above 80% for a safety margin.'
    : r >= 40 ? 'Getting there. Smart practice will aim at the topics holding you back.' : 'Just starting. Play the Money Skills worlds and practice a topic at a time.'; }
  function home() {
    var st = stage(), r = readiness(), bt = bestTest();
    var topics = TOP.map(function (t) { var m = mastery(t.id), n = (wq()[t.id] || []).length;
      return '<div class="wtopic' + (m != null && m < PASS ? ' weak' : '') + '"><div><b>' + esc(t.name) + '</b><br><small class="muted">' + (m == null ? 'Not practiced yet' : m + '% right in your last ' + n + ' answers') + '</small></div>' +
        '<button class="btn ' + (open(t.id) ? 'ghost' : 'ghost') + '" data-topic="' + t.id + '" style="font-size:13px;padding:7px 12px">' + (open(t.id) ? 'Practice 10' : '🔑 Full game') + '</button>' +
        '<div class="bar"><i style="width:' + (m || 0) + '%"></i></div></div>'; }).join('');
    var check = !S.pre ? '<h3>Start-of-course check</h3><p>21 questions across every topic, before you start. Your teacher can compare it with your end-of-course check to see how much you grew.</p><button class="btn" id="w-pre">Take the start check</button>'
      : '<h3>End-of-course check</h3><p>Start check: <b>' + S.pre.pct + '%</b>' + (S.post ? ' · End check: <b>' + S.post.pct + '%</b> (' + (S.post.pct - S.pre.pct >= 0 ? '+' : '') + (S.post.pct - S.pre.pct) + ' points)' : '') + '. Take this when your teacher says the course is wrapping up.</p><button class="btn" id="w-post">' + (S.post ? 'Retake the end check' : 'Take the end check') + '</button>';
    st.innerHTML = '<div class="stage"><div class="stage-top"><button class="btn ghost" id="back">← Map</button><span class="eyebrow">Test prep</span></div>' +
      '<h2>W!SE certification prep</h2><p class="lesson-text" style="font-size:16px">Virginia students in Economics and Personal Finance can earn the W!SE Financial Literacy Certification. The test covers income, money management, banking, credit, saving and investing, insurance and big life purchases, and you need ' + PASS + '% to pass. Practice here until your readiness is comfortably above the line.</p>' + sponsor() +
      '<div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0">Your readiness</h3><b style="font-size:30px;font-family:var(--f-display)">' + r + '%</b></div>' +
      '<div class="ready" role="img" aria-label="Readiness ' + r + ' percent; passing is ' + PASS + ' percent"><i style="width:' + r + '%"></i><em title="Passing score"></em></div><small class="muted">The line marks the ' + PASS + '% passing score. ' + readyMsg(r) + '</small>' +
      (bt >= 0 ? '<p style="margin:8px 0 0">Best practice test: <b>' + bt + '%</b>' + (bt >= PASS ? ' ✓ passing' : '') + '</p>' : '') + '</div>' +
      '<div class="wgrid"><div class="card"><h3>Smart practice</h3><p>' + SMART_N + ' questions aimed at your weakest topics, with an explanation for every miss.</p><button class="btn sun" id="w-smart">Start</button></div>' +
      '<div class="card"><h3>Full practice test</h3><p>' + (FULL_N * TOP.length) + ' questions across every topic, like the real test. No hints until the end.</p><button class="btn" id="w-full">' + (S.full || S.teacher ? 'Take the test' : '🔑 Full game') + '</button></div>' +
      '<div class="card">' + check + '</div></div>' +
      '<div class="card" style="margin-top:12px"><h3>Topics</h3>' + topics + '</div>' +
      '<p class="fine" style="margin-top:14px">W!SE is a trademark of Working in Support of Education. Bullsburg is not affiliated with or endorsed by W!SE, and these are original practice questions, not real test items.</p></div>';
    $('#back').onclick = function () { showMap(); };
    $('#w-smart').onclick = function () { run('smart', drawSmart(SMART_N)); };
    $('#w-full').onclick = function () { if (!(S.full || S.teacher)) return openPaywall(); run('full', drawMixed(FULL_N)); };
    var pre = $('#w-pre'), post = $('#w-post');
    if (pre) pre.onclick = function () { run('pre', drawMixed(CHECK_N)); };
    if (post) post.onclick = function () { run('post', drawMixed(CHECK_N)); };
    st.querySelectorAll('[data-topic]').forEach(function (b) { b.onclick = function () { var t = byId(b.dataset.topic); if (!open(t.id)) return openPaywall(); run('topic', drawTopic(t, TOPIC_N), t); }; });
  }

  /* ---------- the question runner ---------- */
  var R = null;
  var TITLES = { smart: 'Smart practice', topic: 'Topic practice', full: 'Full practice test', pre: 'Start-of-course check', post: 'End-of-course check' };
  function run(kind, qs, topic) { if (!qs.length) return toast('No questions here yet.');
    R = { kind: kind, test: kind === 'full' || kind === 'pre' || kind === 'post', qs: qs, i: 0, ans: [], topic: topic, t0: Date.now() }; ask(); }
  function lesson(sid) { var s = BYID[sid]; if (!s || s.boss) return '';
    return '<details><summary>Review the lesson: ' + esc(s.title) + '</summary><div class="lesson-text" style="font-size:15px">' + (S.mode === 'kid' ? s.kid : s.adult) + '</div></details>'; }
  function ask() {
    var st = stage(), q = R.qs[R.i], n = R.qs.length; if (!q) return done();
    var order = shuffle(q.o.map(function (t, k) { return { t: t, k: k }; }));
    st.innerHTML = '<div class="stage"><div class="stage-top"><button class="btn ghost" id="back">← W!SE prep</button><span class="eyebrow">' + TITLES[R.kind] + (R.topic ? ' · ' + esc(R.topic.name) : '') + '</span></div>' +
      '<div class="quiz card" id="quiz"><div class="qhead"><span class="eyebrow">Question ' + (R.i + 1) + ' of ' + n + '</span><span class="mono muted" style="font-size:12px">' + esc((byId(q.tid) || {}).name || '') + '</span></div>' +
      '<div class="qprog"><i style="width:' + (R.i / n * 100) + '%"></i></div><div class="qcard"><div class="q">' + q.q + '</div><div class="opts">' +
      order.map(function (x, j) { return '<button class="opt" data-k="' + x.k + '"><span class="k">' + 'ABCD'[j] + '</span>' + x.t + '</button>'; }).join('') + '</div><div id="why"></div></div></div></div>';
    $('#back').onclick = function () { if (R.test && R.i > 0 && !confirmLeave()) return; home(); };
    st.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () {
      var k = +b.dataset.k, ok = k === 0; st.querySelectorAll('.opt').forEach(function (o) { o.disabled = true; });
      logQ(q, ok); record(q.tid, ok); R.ans.push({ q: q, pick: q.o[k], ok: ok }); save();
      if (R.test) { b.classList.add('picked'); R.i++; return setTimeout(ask, 180); }
      st.querySelector('.opt[data-k="0"]').classList.add('right'); if (!ok) b.classList.add('wrong');
      if (ok) addXP(5, b);
      $('#why').innerHTML = (ok ? '<div class="why ok"><b>Correct!</b>' + q.why + '</div>'
        : '<div class="why no"><b>Here’s the mistake.</b>You picked “' + esc(stripTags(q.o[k])) + '”. The right answer is “' + esc(stripTags(q.o[0])) + '”. ' + q.why + '</div>' + lesson(q.sid)) +
        '<div class="row" style="margin-top:12px"><button class="btn" id="nextq">' + (R.i + 1 < n ? 'Next question' : 'See results') + '</button></div>';
      $('#nextq').onclick = function () { R.i++; ask(); }; $('#nextq').focus(); }; });
  }
  var leaveArm = 0; function confirmLeave() { if (Date.now() - leaveArm < 4000) return true; leaveArm = Date.now(); toast('Leave the test? Your answers so far won’t count. Tap again to leave.'); return false; }
  function stripTags(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
  function done() {
    var st = stage(), right = R.ans.filter(function (a) { return a.ok; }).length, n = R.ans.length, pct = n ? Math.round(100 * right / n) : 0, by = {};
    R.ans.forEach(function (a) { var b = by[a.q.tid] = by[a.q.tid] || [0, 0]; b[1]++; if (a.ok) b[0]++; });
    var rec = { pct: pct, right: right, n: n, at: Date.now(), by: by };
    if (R.kind === 'pre') S.pre = rec; if (R.kind === 'post') S.post = rec;
    if (R.kind === 'full') { S.wt = (S.wt || []).concat({ pct: pct, at: rec.at }).slice(-10); }
    save(); if (R.test) addXP(2 * right); markActive();
    var rows = TOP.filter(function (t) { return by[t.id]; }).map(function (t) { var b = by[t.id], p = Math.round(100 * b[0] / b[1]);
      return '<div class="wtopic' + (p < PASS ? ' weak' : '') + '"><div><b>' + esc(t.name) + '</b></div><span class="mono">' + b[0] + ' / ' + b[1] + '</span><div class="bar"><i style="width:' + p + '%"></i></div></div>'; }).join('');
    var miss = R.ans.filter(function (a) { return !a.ok; });
    var growth = R.kind === 'post' && S.pre ? '<p>Start check: <b>' + S.pre.pct + '%</b> → End check: <b>' + pct + '%</b>. That’s <b>' + (pct - S.pre.pct >= 0 ? '+' : '') + (pct - S.pre.pct) + ' points</b>.</p>' : '';
    st.innerHTML = '<div class="stage"><div class="stage-top"><button class="btn ghost" id="back">← W!SE prep</button><span class="eyebrow">' + TITLES[R.kind] + ' results</span></div>' +
      '<div class="card"><h2 style="margin:0">' + right + ' of ' + n + ' right · ' + pct + '%</h2>' +
      (R.kind === 'full' ? '<p>' + (pct >= PASS ? '✓ That would pass the ' + PASS + '% line. Nice work.' : 'The passing line is ' + PASS + '%. Practice the red topics below and try again.') + '</p>' : '') +
      (R.kind === 'pre' ? '<p>This is your starting point. Your teacher can see it, and you’ll take an end-of-course check later to see how much you’ve grown.</p>' : '') + growth +
      '<p class="muted">Your W!SE readiness is now <b>' + readiness() + '%</b>.</p></div>' +
      '<div class="card" style="margin-top:12px"><h3>By topic</h3>' + rows + '</div>' +
      (R.test && miss.length ? '<div class="card" style="margin-top:12px"><h3>Explain my mistakes (' + miss.length + ')</h3>' + miss.map(function (a) {
        return '<div class="miss"><div>' + a.q.q + '</div><div class="y">Your answer: ' + a.pick + '</div><div class="a">Right answer: ' + a.q.o[0] + '</div><div class="muted">' + a.q.why + '</div>' + lesson(a.q.sid) + '</div>'; }).join('') + '</div>' : '') +
      '<div class="row" style="margin-top:14px"><button class="btn sun" id="w-again">Practice my weak spots</button><button class="btn ghost" id="w-home">Back to W!SE prep</button></div></div>';
    $('#back').onclick = home; $('#w-home').onclick = home; $('#w-again').onclick = function () { run('smart', drawSmart(SMART_N)); };
    if (R.test && pct >= PASS) confetti();
    if (window.TT_onSave) window.TT_onSave();
  }

  /* ---------- a note home to a parent ---------- */
  var TALK = { 1: 'What does it mean to own a share of a company?', 2: 'What’s the difference between a call and a put?', 3: 'Why do options lose value as time passes?',
    4: 'What is a covered call, and when would someone use one?', 5: 'Why is a low-cost index fund a good first investment?', 6: 'What’s the difference between gross pay and net pay on a paycheck?',
    7: 'How would you split a paycheck using the 50/30/20 rule?', 8: 'How can our family avoid bank fees?', 9: 'What are the two biggest things that build a good credit score?',
    10: 'What’s a deductible, and how should someone choose one?', 11: 'What’s the smartest order of ways to pay for college or training?' };
  function note() {
    var d = {}; try { d = reportData(); } catch (e) {}
    var wk = Date.now() - 7 * 864e5, cl = S.cl || {};
    var recent = Object.keys(cl).filter(function (id) { return cl[id] > wk && BYID[id] && !BYID[id].boss; }).sort(function (a, b) { return cl[a] - cl[b]; }).map(function (id) { return BYID[id]; });
    var last = recent.length ? recent[recent.length - 1] : BYID[STAGES.slice().reverse().find(function (id) { return S.stars[id]; }) || STAGES[0]];
    var nm = S.sch && S.sch.name ? S.sch.name.split(' ')[0] : 'me';
    var lines = ['Hi! Here’s what I did on Bullsburg this week:'];
    lines.push(recent.length ? '• I finished ' + recent.length + ' lesson' + (recent.length === 1 ? '' : 's') + ': ' + recent.slice(-4).map(function (s) { return s.title; }).join(', ') + '.' : '• I kept practicing and reviewing.');
    lines.push('• I’ve cleared ' + (d.cleared || 0) + ' of ' + (d.total || STAGES.length) + ' stages and I’m level ' + (d.lvl || 1) + '.');
    var r = readiness(); if (r) lines.push('• My W!SE financial literacy test readiness is ' + r + '% (70% passes).');
    lines.push('', 'Ask ' + nm + ': ' + (TALK[last.world] || TALK[1]), '', 'Bullsburg is a money and investing game for teens. Parent guide: ' + ((window.TT_SITE || 'https://bullsburg.com') + '/parents.html'));
    var text = lines.join('\n');
    pwShow('<div class="eyebrow">For your family</div><h2 id="pw-title">Send a note home</h2><p style="margin-top:6px" class="muted">Share what you learned this week and a question to talk about at dinner.</p>' +
      '<div class="card" style="white-space:pre-wrap;font-size:14px;margin-top:10px;text-align:left">' + esc(text) + '</div>' +
      '<div class="actions" style="margin-top:14px"><button class="btn sun" id="n-share">Share</button><button class="btn" id="n-copy">Copy</button><button class="btn ghost" id="pw-x">Close</button></div>');
    $('#pw-x').onclick = pwClose;
    $('#n-copy').onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied. Paste it into a text to your parent.'); }, function () { toast('Couldn’t copy on this device.'); }); };
    $('#n-share').onclick = function () { var P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
      if (P) return P.share({ title: 'My week on Bullsburg', text: text, dialogTitle: 'Send to a parent' }).catch(function () {});
      if (navigator.share) return navigator.share({ title: 'My week on Bullsburg', text: text }).catch(function () {});
      $('#n-copy').onclick(); };
  }

  window.TT_openWise = home;
  window.TT_parentNote = note;
  try { if (TAB === 'map' && !$('#map-home').hidden) renderMap(); } catch (e) {}
})();
