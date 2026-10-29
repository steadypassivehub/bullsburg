// Bullsburg for Schools (class-code sign-in + progress sync), invite-a-friend coins and the rating prompt.
// Runs after the main game script, so it can use the game's own helpers (S, save, pwShow, toast, ...).
(function () {
  var C = window.TickerCloud, ON = !!(C && C.configured());
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var friendly = function (e) {
    if (!navigator.onLine) return 'You look offline. Connect to the internet and try again.';
    var m = (e && e.message) || ''; if (/rate|seconds|too many/i.test(m)) return 'Too many tries. Wait a minute, then try again.';
        return 'Something went wrong. Please try again.';
  };
  function busy(btn, t) { if (btn) { btn.disabled = true; btn.textContent = t; } }

  var fmtKey = function (k) { k = String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return k.length > 5 ? k.slice(0, 5) + '-' + k.slice(5) : k; };

  /* ---------------- school license on/off ---------------- */
  // S.sch = { key, on, school, ends, cls, name, reason, gave }  (gave = the school license is what unlocked the full game)
  function setSchool(st) { // st = a student record from the database
    if (!st || !st.found) return;
    var had = S.sch || null;
    S.sch = { key: st.key, on: !!st.active, school: st.school, ends: st.ends_on, cls: st.class || '', name: st.name || '', reason: st.reason || '', gave: had ? had.gave : !S.full, checked: today() };
    if (S.sch.on && !S.full) { S.full = true; S.sch.gave = true; }
    if (!S.sch.on && S.full && S.sch.gave) S.full = false;
    save(); refreshAll(); paintButton();
  }
  function leaveSchool(silent) {
    if (!S.sch) return; var gave = S.sch.gave; S.sch = null; if (gave) S.full = false; save(); refreshAll(); paintButton();
    if (!silent) toast('Signed out of your school account. Your progress on this device is kept.');
  }
  function check() { // on launch: refresh the license; offline, trust it until its end date
    if (!S.sch) return;
    if (S.sch.ends && S.sch.ends < today() && S.sch.on) { S.sch.on = false; if (S.sch.gave) S.full = false; save(); refreshAll(); }
    if (!ON || !S.sch.key) return;
    C.rpc('student_status', { p_key: S.sch.key }).then(function (st) {
      if (st && st.found === false) { leaveSchool(true); return toast('Your school account was removed. Ask your teacher for help.'); }
      var was = S.sch && S.sch.on; setSchool(st);
      if (was && S.sch && !S.sch.on) toast('Your school’s Bullsburg license has ended. Your progress is saved. Ask your teacher about renewing.');
    }).catch(function () {});
  }

  /* ---------------- progress sync ---------------- */
  var FIELDS = ['xp', 'stars', 'missions', 'mkt', 'best', 'streak', 'dq', 'ql', 'qg', 'mode', 'onboarded'];
  function snapshot() { var o = {}; FIELDS.forEach(function (k) { o[k] = S[k]; }); return JSON.stringify(o); }
  function summary() {
    var d = {}; try { d = reportData(); } catch (e) {}
    var seen = 0, miss = 0, wrong = 0; for (var k in S.ql) { var q = S.ql[k] || []; seen += q[0] || 0; miss += q[1] || 0; if (q[0] && !q[2]) wrong++; }
    var next = STAGES.find(function (id) { return !S.stars[id]; });
    var worlds = WORLDS.map(function (w) { var ids = STAGES.filter(function (id) { return BYID[id].world === w.n; }); return { n: w.n, name: w.name, done: ids.filter(function (id) { return S.stars[id]; }).length, of: ids.length }; });
    var str = 0; try { str = streakAlive(); } catch (e) {}
    return { cleared: d.cleared || 0, total: d.total || STAGES.length, stars: d.stars || 0, level: d.lvl || 1, rank: d.rank || '', xp: S.xp || 0,
      answered: seen, missed: miss, accuracy: seen ? Math.round(100 * (seen - miss) / seen) : null, to_review: wrong,
      streak: str, best_streak: (S.streak && S.streak.best) || 0, daily_quiz: S.dq && S.dq.day ? S.dq.score : null,
      next_stage: next ? BYID[next].title || next : 'All done', worlds: worlds, on: new Date().toISOString() };
  }
  var pushT = null, pushing = false;
  function push(now) {
    if (!ON || !S.sch || !S.sch.key) return; clearTimeout(pushT);
    pushT = setTimeout(function () { if (pushing) return push(); pushing = true;
      C.rpc('save_progress', { p_key: S.sch.key, p_progress: snapshot(), p_summary: summary() }).catch(function () {}).then(function () { pushing = false; });
    }, now ? 0 : 15000);
  }
  window.TT_onSave = function () { push(false); };
  document.addEventListener('visibilitychange', function () { if (document.hidden) push(true); });
  function merge(txt) { // keeps the best of this device and the saved school copy
    var o; try { o = JSON.parse(txt); } catch (e) { return; } if (!o) return;
    var cl = function (st) { return Object.keys(st || {}).length; }, localMore = cl(S.stars) >= cl(o.stars);
    for (var k in (o.stars || {})) S.stars[k] = Math.max(S.stars[k] || 0, Math.min(3, o.stars[k] | 0));
    S.xp = Math.max(+S.xp || 0, Math.min(+o.xp || 0, 99999)); S.best = Math.max(+S.best || 0, +o.best || 0);
    for (var m in (o.missions || {})) if (!S.missions[m]) S.missions[m] = o.missions[m];
    for (var q in (o.ql || {})) { var a = S.ql[q], b = o.ql[q]; if (!a || (b && b[0] > a[0])) S.ql[q] = b; }
    for (var g in (o.qg || {})) if (!S.qg[g]) S.qg[g] = o.qg[g];
    if (o.streak && (!S.streak || (o.streak.best || 0) > (S.streak.best || 0))) S.streak = o.streak;
    if (o.mkt && (!S.mkt || !localMore)) S.mkt = o.mkt;
    if (o.onboarded) S.onboarded = true;
    try { sane(); } catch (e) {} save();
  }

  /* ---------------- student screens ---------------- */
  var codeInput = function (id, label, max) { return '<div class="field" style="margin-top:12px"><label for="' + id + '">' + label + '</label><input id="' + id + '" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="' + max + '" style="text-transform:uppercase;letter-spacing:4px;font-size:18px"></div>'; };
  function openStudent() {
    if (!ON) return pwShow('<div class="eyebrow">Bullsburg for Schools</div><h2 id="pw-title">School sign-in is coming soon</h2><p style="margin-top:8px">Ask your teacher when your class will start.</p><div class="actions" style="margin-top:14px"><button class="btn ghost" id="pw-x">Close</button></div>'), $('#pw-x').onclick = pwClose;
    if (S.sch) return panel();
    pwShow('<div class="eyebrow">Bullsburg for Schools</div><h2 id="pw-title">Join your class</h2>' +
      '<p style="margin-top:8px">If your teacher gave you a class code, type it here. Your school’s license unlocks the whole game, and your teacher can see your progress.</p>' +
      codeInput('sc-cls', 'Class code from your teacher', 8) +
      '<div class="field"><label for="sc-name">Your first name and last initial</label><input id="sc-name" autocomplete="off" maxlength="40" placeholder="Jamal W."></div>' +
      '<div class="err" id="sc-err" aria-live="polite"></div><div class="actions"><button class="btn sun" id="sc-join">Join class</button><button class="btn ghost" id="pw-x">Cancel</button></div>' +
      '<p class="fine">Used Bullsburg at school on another device? <button class="btn ghost" id="sc-have" style="font-size:12px;padding:5px 10px">I have a student key</button></p>' +
      '<p class="fine">We don’t ask for your email. We only save the name you type and your game progress for your teacher. <a href="privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>');
    $('#pw-x').onclick = pwClose; $('#sc-have').onclick = keyScreen;
    var go = function () { var b = $('#sc-join'), code = $('#sc-cls').value.trim(), nm = $('#sc-name').value.trim();
      if (code.replace(/\W/g, '').length < 6) { $('#sc-err').textContent = 'Type the 6-character class code from your teacher.'; return; }
      if (!nm) { $('#sc-err').textContent = 'Add your name so your teacher knows it’s you.'; return; }
      busy(b, 'Joining…');
      C.rpc('join_class', { p_code: code, p_name: nm }).then(function (r) {
        if (!r || !r.ok) { $('#sc-err').textContent = r && r.reason === 'no_class' ? 'We couldn’t find that class code. Check it with your teacher.' : 'That didn’t work. Please try again.'; b.disabled = false; b.textContent = 'Join class'; return; }
        setSchool(r.student); push(true); welcome(true);
      }).catch(function (e) { $('#sc-err').textContent = friendly(e); b.disabled = false; b.textContent = 'Join class'; }); };
    $('#sc-join').onclick = go; $('#sc-name').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  function welcome(first) {
    var s = S.sch;
    pwShow('<div class="eyebrow">' + (first ? 'You’re in!' : 'Saved') + '</div><h2 id="pw-title">' + esc(s.cls || s.school) + '</h2>' +
      (s.on ? '<p style="margin-top:8px">' + esc(s.school) + ' unlocked the whole game for you.</p>' : '<p class="err" style="margin-top:8px">' + whyOff() + '</p>') +
      '<p style="margin-top:12px"><b>Your student key</b></p><div class="gateq" style="letter-spacing:4px">' + esc(fmtKey(s.key)) + '</div>' +
      '<p class="muted">Write this key down or take a photo of it. Use it to sign in on another phone, tablet or Chromebook and keep your progress. Don’t share it.</p>' +
      '<div class="actions" style="margin-top:12px"><button class="btn sun" id="pw-x">' + (first ? 'Start playing' : 'Done') + '</button></div>');
    $('#pw-x').onclick = function () { pwClose(); if (first) { confetti(); toast('The whole game is unlocked. Have fun!'); } };
  }
  function keyScreen() {
    pwShow('<div class="eyebrow">Bullsburg for Schools</div><h2 id="pw-title">Sign in with your student key</h2><p style="margin-top:8px">Your key was shown when you first joined your class. Your teacher can also see it on their dashboard.</p>' +
      codeInput('sc-key', 'Student key', 14) + '<div class="err" id="sc-err" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn sun" id="sc-ok">Sign in</button><button class="btn ghost" id="sc-back">Back</button></div>');
    $('#sc-back').onclick = openStudent;
    var go = function () { var b = $('#sc-ok'), k = $('#sc-key').value; if (k.replace(/\W/g, '').length < 10) { $('#sc-err').textContent = 'A student key has 10 letters and numbers.'; return; }
      busy(b, 'Checking…');
      C.rpc('student_status', { p_key: k }).then(function (st) {
        if (!st || !st.found) { $('#sc-err').textContent = 'We couldn’t find that key. Check it with your teacher.'; b.disabled = false; b.textContent = 'Sign in'; return; }
        setSchool(st);
        return C.rpc('load_progress', { p_key: st.key }).then(function (p) { if (p) merge(p); refreshAll(); push(true); pwClose(); confetti(); toast('Welcome back, ' + (st.name || 'student') + '! Your progress is loaded.'); });
      }).catch(function (e) { $('#sc-err').textContent = friendly(e); b.disabled = false; b.textContent = 'Sign in'; }); };
    $('#sc-ok').onclick = go; $('#sc-key').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  function classScreen() {
    pwShow('<div class="eyebrow">Your class</div><h2 id="pw-title">Change class</h2><p style="margin-top:8px">Got a code for a new class at ' + esc(S.sch.school) + '? Type it here. Your progress stays the same.</p>' +
      codeInput('sc-cls', 'New class code', 8) + '<div class="err" id="sc-err" aria-live="polite"></div><div class="actions"><button class="btn sun" id="sc-join">Change class</button><button class="btn ghost" id="pw-x">Cancel</button></div>');
    $('#pw-x').onclick = panel;
    $('#sc-join').onclick = function () { var b = $('#sc-join'); busy(b, 'Saving…');
      C.rpc('join_class', { p_code: $('#sc-cls').value, p_name: '', p_key: S.sch.key }).then(function (r) {
        if (r && r.ok) { setSchool(r.student); pwClose(); toast('You joined ' + (r.student.class || 'your new class') + '!'); return; }
        $('#sc-err').textContent = r && r.reason === 'other_school' ? 'That class is at a different school. Ask your teacher.' : 'We couldn’t find that class code.'; b.disabled = false; b.textContent = 'Change class';
      }).catch(function (e) { $('#sc-err').textContent = friendly(e); b.disabled = false; b.textContent = 'Change class'; }); };
  }
  function whyOff() { var s = S.sch || {}; return s.reason === 'ended' ? 'Your school’s license has ended. Ask your teacher about renewing. Your progress is saved.' : s.reason === 'seats' ? 'Your school has used all of its student spots. Ask your teacher to add more.' : 'Your school license isn’t active right now.'; }
  function panel() {
    var s = S.sch;
    pwShow('<div class="eyebrow">Bullsburg for Schools</div><h2 id="pw-title">' + esc(s.school || 'Your school') + '</h2>' +
      '<p style="margin-top:8px">Signed in as <b>' + esc(s.name) + '</b>' + (s.cls ? '<br>Class: <b>' + esc(s.cls) + '</b>' : '') + '</p>' +
      (s.on ? '<p class="muted" style="margin-top:6px">Whole game unlocked through ' + esc(s.ends) + '. Your progress saves automatically.</p>' : '<p class="err" style="margin-top:6px">' + whyOff() + '</p>') +
      '<p style="margin-top:10px">Student key: <b id="sc-k">•••••-•••••</b> <button class="btn ghost" id="sc-show" style="font-size:12px;padding:4px 9px">Show</button></p>' +
      '<div class="actions" style="margin-top:14px"><button class="btn" id="sc-class">Change class</button><button class="btn ghost" id="sc-out">Sign out</button><button class="btn ghost" id="pw-x">Close</button></div>');
    $('#pw-x').onclick = pwClose; $('#sc-class').onclick = classScreen;
    $('#sc-show').onclick = function () { $('#sc-k').textContent = fmtKey(s.key); this.hidden = true; };
    var arm = false; $('#sc-out').onclick = function () { if (!arm) { arm = true; this.textContent = 'Sure? You’ll need your key to sign back in'; return; } push(true); setTimeout(function () { leaveSchool(false); pwClose(); }, 400); };
  }
  window.TT_openStudent = openStudent;
  window.TT_studentPaywall = function () {
    if (!S.sch || S.sch.on) return;
    pwShow('<div class="eyebrow">Bullsburg for Schools</div><h2 id="pw-title">Ask your teacher</h2><p style="margin-top:8px">The rest of the game comes with your school’s Bullsburg license. ' + whyOff() + '</p><div class="actions" style="margin-top:14px"><button class="btn ghost" id="sc-acct">My school account</button><button class="btn ghost" id="pw-x">Close</button></div>');
    $('#pw-x').onclick = pwClose; $('#sc-acct').onclick = panel;
  };
  function paintButton() { var b = $('#student-btn'); if (!b) return; b.textContent = S.sch ? '🎓 ' + (S.sch.school || 'My school') : '🎓 I’m a student'; }
  var sb = $('#student-btn'); if (sb) sb.onclick = openStudent;
  /* ---------------- invite a friend ---------------- */
  var INV_COINS = 1000, INV_MAX = 10;
  function inv() { S.inv = Object.assign({ code: '', used: false, claimed: 0 }, S.inv || {}); return S.inv; }
  function myCode() { var v = inv(); if (v.code) return Promise.resolve(v.code);
    return C.rpc('invite_code', { p_pid: S.pid }).then(function (c) { if (c) { inv().code = c; save(); } return c; }); }
  function claim(quiet) { if (!ON || !inv().code) return Promise.resolve(0);
    return C.rpc('invite_count', { p_pid: S.pid }).then(function (n) { var v = inv(), add = Math.min(n | 0, INV_MAX) - v.claimed; if (add > 0) { v.claimed += add; save(); addCash(add * INV_COINS, add === 1 ? 'A friend joined with your code' : add + ' friends joined with your code'); if (!quiet) confetti(); } return n | 0; }).catch(function () { return 0; }); }
  function share(code) {
    var link = (window.TT_STORE_LINKS && (window.TT_STORE_LINKS.google || window.TT_STORE_LINKS.apple)) || 'https://bullsburg.com';
    var text = 'Learn the stock market with me on Bullsburg! Use my invite code ' + code + ' for ' + INV_COINS.toLocaleString('en-US') + ' bonus coins. ' + link;
    var P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (P) return P.share({ title: 'Join me on Bullsburg', text: text, dialogTitle: 'Invite a friend' }).catch(function () {});
    if (navigator.share) return navigator.share({ title: 'Join me on Bullsburg', text: text }).catch(function () {});
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Invite message copied. Paste it to a friend!'); }, function () { toast('Your code is ' + code); });
    else toast('Your code is ' + code);
  }
  function openInvite() {
    if (!ON) return toast('Invites are coming soon.');
    var v = inv();
    pwShow('<div class="eyebrow">Invite a friend</div><h2 id="pw-title">Give coins, get coins</h2>' +
      '<p style="margin-top:8px">When a friend enters your code, you both get <b>' + INV_COINS.toLocaleString('en-US') + ' coins</b> of pretend cash for the Practice Market (up to ' + INV_MAX + ' friends).</p>' +
      '<div class="gateq" id="iv-code" style="letter-spacing:6px">…</div><p class="muted" id="iv-n" style="text-align:center"></p>' +
      '<div class="actions"><button class="btn sun" id="iv-share" disabled>Share my code</button></div>' +
      (v.used ? '' : '<div class="field" style="margin-top:14px"><label for="iv-in">Got a code from a friend?</label><input id="iv-in" autocomplete="off" autocapitalize="characters" maxlength="8" style="text-transform:uppercase;letter-spacing:4px"></div><div class="err" id="iv-err" aria-live="polite"></div><div class="actions"><button class="btn" id="iv-redeem">Use code</button></div>') +
      '<p class="fine">Kids: only share your code with friends and family you know. Coins are pretend money for practice and have no real value.</p><div class="actions"><button class="btn ghost" id="pw-x">Close</button></div>');
    $('#pw-x').onclick = pwClose;
    myCode().then(function (c) { if (!c) throw 0; $('#iv-code').textContent = c; var b = $('#iv-share'); b.disabled = false; b.onclick = function () { share(c); };
      return claim(false).then(function (n) { var el = $('#iv-n'); if (el) el.textContent = n ? n + (n === 1 ? ' friend has' : ' friends have') + ' joined with your code' : 'No friends have used your code yet'; }); })
      .catch(function () { var el = $('#iv-code'); if (el) el.textContent = 'Offline'; var n = $('#iv-n'); if (n) n.textContent = 'Connect to the internet to get your code.'; });
    var rb = $('#iv-redeem'); if (rb) rb.onclick = function () { var code = $('#iv-in').value.trim().toUpperCase(); if (code.length < 6) { $('#iv-err').textContent = 'Type the 6-letter code.'; return; }
      busy(rb, 'Checking…'); C.rpc('redeem_invite', { p_code: code, p_pid: S.pid }).then(function (r) {
        if (r === 'ok') { inv().used = true; save(); addCash(INV_COINS, 'Friend invite bonus'); confetti(); openInvite(); return; }
        if (r === 'used') { inv().used = true; save(); }
        $('#iv-err').textContent = r === 'own_code' ? 'That’s your own code. Share it with a friend instead!' : r === 'used' ? 'You’ve already used an invite code.' : 'We couldn’t find that code. Check it and try again.';
        rb.disabled = false; rb.textContent = 'Use code'; }).catch(function (e) { $('#iv-err').textContent = friendly(e); rb.disabled = false; rb.textContent = 'Use code'; }); };
  }
  var ib = $('#invite-btn'); if (ib) { if (!ON) ib.hidden = true; ib.onclick = openInvite; }

  /* ---------------- rating prompt (store apps) ---------------- */
  // Uses the official in-app review sheet, which Apple and Google require. It is asked after a boss win, never during play,
  // at most twice, and never for school students.
  window.TT_onStageClear = function (id, boss, first) {
    push(true);
    if (!boss || !first || S.sch || BUILD !== 'app') return;
    var R = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppReview; if (!R) return;
    S.rv = S.rv || { n: 0 }; var bosses = STAGES.filter(function (x) { return BYID[x].boss && S.stars[x]; }).length;
    if (S.rv.n >= 2 || (S.rv.n === 1 && bosses < 3)) return;
    S.rv.n++; save(); setTimeout(function () { R.requestReview().catch(function () {}); }, 2500);
  };

  /* ---------------- start ---------------- */
  var tl = $('#teacher-link'), pl = $('#parents-link'); if (BUILD === 'preview') { if (tl) tl.hidden = true; if (pl) pl.hidden = true; }
  if (!ON && sb) sb.hidden = BUILD === 'preview';
  paintButton(); check(); if (ON && inv().code) setTimeout(function () { claim(true); }, 4000);
})();
