// Bullsburg language and read-aloud support.
// Español: the Money Skills worlds (lessons, questions, terms) and the main buttons switch to Spanish. The investing worlds stay in English for now.
// Read aloud: a 🔊 button on every lesson and question, using the device's built-in voices (works offline on most devices).
// Runs after the main game script and before wise.js, so the W!SE topics pick up the translated names.
(function () {
  var es = S.lang === 'es' && typeof ES !== 'undefined';
  var T = function (x) { return es && typeof x === 'string' && ES[x] ? ES[x] : x; };
  var UI = { // exact button and label text in the shared screens
    'How Bullsburg works': 'Cómo funciona Bullsburg', '5 worlds, from your first share of stock to charts, options and advanced strategies. Starts on Stock Street.': '5 mundos, desde tu primera acción hasta gráficas, opciones y estrategias avanzadas. Empieza en Stock Street.', '6 worlds on everyday money: paychecks and taxes, budgeting, banking, credit, insurance and paying for college. Starts at Paycheck Plaza.': '6 mundos sobre el dinero de todos los días: sueldos e impuestos, presupuesto, bancos, crédito, seguros y cómo pagar la universidad. Empieza en Paycheck Plaza.', 'Practice questions and full practice tests for financial literacy certification tests like W!SE, with a readiness score that shows what to study next.': 'Preguntas y exámenes de práctica completos para pruebas de certificación en educación financiera como W!SE, con un puntaje de preparación que te dice qué estudiar después.', 'Pick a path after high school, set up your first budget and live a whole year of paychecks, bills and surprises.': 'Elige un camino después de la secundaria, arma tu primer presupuesto y vive un año entero de sueldos, cuentas y sorpresas.', 'Play the two sides in any order and switch between them with the buttons above. Chart Lab and the Practice Market let you trade 8 made-up companies with pretend money.': 'Juega las dos partes en el orden que quieras y cambia entre ellas con los botones de arriba. Chart Lab y el Practice Market te dejan invertir en 8 empresas inventadas con dinero de mentira.', 'Got it': 'Entendido',
    'Investing': 'Inversiones', 'Money Skills': 'Habilidades de Dinero',
    'Your adventure': 'Tu aventura', 'Learn money and investing, one stage at a time': 'Aprende de dinero e inversiones, una etapa a la vez', 'Play them in any order. Clear each stage to earn XP and stars, and beat the boss at the end of every world. Everything here uses pretend money.': 'Juégalas en el orden que quieras. Supera cada etapa para ganar XP y estrellas, y vence al jefe al final de cada mundo. Aquí todo usa dinero de mentira.', 'Bullsburg has two sides to explore:': 'Bullsburg tiene dos partes para explorar:', '(stocks, charts and options) and': '(acciones, gráficas y opciones) y', '(paychecks, budgeting, banking, credit and more). Play them in any order. Clear each stage to earn XP and stars, and beat the boss at the end of every world. Everything here uses pretend money.': '(sueldos, presupuesto, bancos, crédito y más). Juégalas en el orden que quieras. Supera cada etapa para ganar XP y estrellas, y vence al jefe al final de cada mundo. Aquí todo usa dinero de mentira.', '📈 Investing': '📈 Inversiones', '🏠 Real Life After 18': '🏠 Vida Real después de los 18', 'Try again': 'Intentar de nuevo', 'Study in Study Hall': 'Repasar en la Sala de Estudio', 'Review answers': 'Revisar respuestas',
    'Next stage': 'Siguiente etapa', 'Next question': 'Siguiente pregunta', 'Finish': 'Terminar', 'Correct!': '¡Correcto!', 'Not quite.': 'Casi.', 'Stage clear!': '¡Etapa superada!',
    'Boss defeated!': '¡Jefe derrotado!', 'Boss question': 'Pregunta del jefe', 'Perfect run.': 'Sin errores.', 'Nice!': '¡Bien!', 'You got it!': '¡Lo lograste!', 'Keep learning.': 'Sigue aprendiendo.',
    'Try another answer.': 'Prueba otra respuesta.', 'Out of hearts!': '¡Sin corazones!', 'Checkpoint': 'Punto de control', 'Map': 'Mapa', '← Map': '← Mapa', 'Start': 'Empezar',
    'Start quiz': 'Empezar la prueba', 'Take the quiz': 'Hacer la prueba', 'Quiz time': 'Hora de la prueba', 'Lesson': 'Lección', 'Practice': 'Práctica', 'See results': 'Ver resultados',
    '💵 Money Skills': '💵 Habilidades de Dinero', '🎓 W!SE Prep': '🎓 Preparación W!SE', '🏠 Real Life': '🏠 Vida Real', 'Your readiness': 'Tu preparación', 'Smart practice': 'Práctica inteligente',
    'Full practice test': 'Examen de práctica completo', 'Topics': 'Temas', 'Practice 10': 'Practicar 10', 'Pass predictor': 'Predictor de aprobación', '← W!SE prep': '← Preparación W!SE',
    'Back to W!SE prep': 'Volver a la preparación W!SE', 'Practice my weak spots': 'Practicar mis puntos débiles', 'By topic': 'Por tema', 'Here’s the mistake.': 'Aquí está el error.',
    'Very likely to pass': 'Muy probable que apruebes', 'Likely to pass': 'Probable que apruebes', 'Could go either way': 'Puede salir de cualquier forma', 'Not ready yet': 'Todavía no estás listo' };
  window.TT_t = T;

  if (es) {
    document.documentElement.lang = 'es';
    var moneyWorlds = {}; (typeof MONEY_WORLDS !== 'undefined' ? MONEY_WORLDS : []).forEach(function (w) { moneyWorlds[w.n] = 1; w.name = T(w.name); w.sub = T(w.sub); });
    try { WORLDS.forEach(function (w) { if (moneyWorlds[w.n]) { w.name = T(w.name); w.sub = T(w.sub); } }); } catch (e) {}
    L.forEach(function (s) {
      if (!moneyWorlds[s.world]) return;
      s.title = T(s.title);
      if (s.boss) return;
      var k = T(s.kid); s.kid = k; s.adult = k; // one Spanish version of each lesson for both modes
      s.terms = (s.terms || []).map(T);
      (s.quiz || []).forEach(function (q) { q.q = T(q.q); q.o = q.o.map(T); q.why = T(q.why); });
      s.gens = []; // number-generated questions are English-only
    });
    if (typeof WISE_TOPICS !== 'undefined') {
      var TN = { 'Income, careers and taxes': 'Ingresos, carreras e impuestos', 'Money management and budgeting': 'Manejo del dinero y presupuesto', 'Banking': 'La banca', 'Credit and debt': 'Crédito y deudas',
        'Saving and investing': 'Ahorro e inversión', 'Insurance and protecting yourself': 'Seguros y protección', 'College, housing and big purchases': 'Universidad, vivienda y compras grandes' };
      WISE_TOPICS.forEach(function (t) { t.name = TN[t.name] || t.name; });
    }
    // swap exact-match button and label text as screens are drawn
    var swap = function (root) { var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, out = [];
      while ((n = w.nextNode())) { var t = n.nodeValue.trim(); if (t && UI[t]) out.push(n); }
      out.forEach(function (n) { n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), UI[n.nodeValue.trim()]); }); };
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (x) { if (x.nodeType === 1) swap(x); else if (x.nodeType === 3 && UI[x.nodeValue.trim()]) x.nodeValue = UI[x.nodeValue.trim()]; }); }); })
      .observe(document.body, { childList: true, subtree: true });
    addEventListener('load', function () { swap(document.body); });
  }

  /* ---------- language switch (footer) ---------- */
  addEventListener('load', function () {
    var row = document.getElementById('extras'); if (!row || typeof ES === 'undefined') return;
    var b = document.createElement('button'); b.className = 'btn ghost'; b.id = 'lang-btn'; b.style.cssText = 'font-size:13px;padding:7px 12px';
    b.textContent = es ? '🌎 English' : '🌎 Español'; b.setAttribute('lang', es ? 'en' : 'es');
    b.title = es ? 'Switch Money Skills back to English' : 'Lecciones de Habilidades de Dinero en español';
    b.onclick = function () { S.lang = es ? 'en' : 'es'; save(); location.reload(); };
    row.appendChild(b);
  });

  /* ---------- read aloud ---------- */
  var SS = window.speechSynthesis; if (!SS || typeof SpeechSynthesisUtterance === 'undefined') return;
  var lang = es ? 'es' : 'en', speaking = null;
  function voice() { var v = SS.getVoices().filter(function (x) { return x.lang && x.lang.toLowerCase().indexOf(lang) === 0; });
    return v.find(function (x) { return /US|MX|419/i.test(x.lang) && x.localService; }) || v.find(function (x) { return x.localService; }) || v[0] || null; }
  function textOf(el) { var c = el.cloneNode(true); c.querySelectorAll('.tts,details,script,style,button.tts').forEach(function (x) { x.remove(); });
    c.querySelectorAll('.k').forEach(function (k) { k.textContent = k.textContent + '. '; }); c.querySelectorAll('button,p,li,div').forEach(function (x) { x.appendChild(document.createTextNode('. ')); });
    return (c.textContent || '').replace(/\s+/g, ' ').replace(/(\.\s*){2,}/g, '. ').replace(/…\./g, '…').replace(/([?!:])\./g, '$1').replace(/\$([\d,]+)/g, es ? '$1 dólares' : '$1 dollars').trim(); }
  function stop() { SS.cancel(); if (speaking) { speaking.setAttribute('aria-pressed', 'false'); speaking.textContent = '🔊'; } speaking = null; }
  function say(btn, el) {
    if (speaking === btn) return stop(); stop();
    var u = new SpeechSynthesisUtterance(textOf(el)), v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : (es ? 'es-US' : 'en-US'); u.rate = S.ttsRate || 0.95;
    u.onend = u.onerror = function () { if (speaking === btn) stop(); };
    speaking = btn; btn.setAttribute('aria-pressed', 'true'); btn.textContent = '⏹'; SS.speak(u);
  }
  var css = document.createElement('style');
  css.textContent = '.tts{float:right;margin:0 0 6px 10px;width:40px;height:40px;border-radius:99px;border:1px solid var(--line);background:var(--surface2);color:var(--ink);font-size:18px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}' +
    '.tts:hover{border-color:var(--accent)} .tts[aria-pressed=true]{background:var(--accent);color:var(--accent-ink,#0A1F1A)}';
  document.head.appendChild(css);
  function add(el) { if (el.dataset.tts) return; el.dataset.tts = '1';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tts'; b.textContent = '🔊'; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', es ? 'Leer en voz alta' : 'Read aloud'); b.title = es ? 'Leer en voz alta' : 'Read aloud';
    b.onclick = function (e) { e.stopPropagation(); say(b, el); };
    var h = el.previousElementSibling; if (el.classList.contains('lesson-text') && h && /^H[23]$/.test(h.tagName)) { b.style.marginTop = '2px'; h.appendChild(b); } else el.insertBefore(b, el.firstChild); }
  var SEL = '.lesson-text, .qcard, .life-ev, #live .lv-news, #live .lv-w h1 + .lv-opts';
  function scan() { document.querySelectorAll(SEL).forEach(function (el) { if (el.closest('#live') && !el.classList.contains('lv-news')) return; add(el); }); }
  var pend = 0; new MutationObserver(function () { if (pend) return; pend = requestAnimationFrame(function () { pend = 0; scan(); }); }).observe(document.body, { childList: true, subtree: true });
  addEventListener('load', scan);
  addEventListener('pagehide', stop); document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  document.addEventListener('click', function (e) { if (speaking && !e.target.closest('.tts') && e.target.closest('button')) stop(); }, true);
})();
