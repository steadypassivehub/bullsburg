// Bullsburg Chart School: lessons inside the Chart Lab that teach how to read any chart — candles, candle patterns,
// trends and trendlines, support and resistance, volume, moving averages, RSI, MACD, Bollinger Bands, chart patterns
// and a trading plan — each with a pretend chart drawn to show the idea, plus a quick check. Ends with Pattern Spotter.
// Runs after the main game script and uses its helpers (S, save, $, toast, addXP, confetti, prep, plot, linePath, css, reg, mulberry32, gaussFrom, MONO).
(function () {
  'use strict';
  if (typeof prep !== 'function') return;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => { if (!S.cs) S.cs = { done: {}, best: 0 }; return S.cs; };

  /* ---------- pretend data ---------- */
  // build candles that follow a path through anchor points [[day, price], ...], with optional hand-made candles
  function build(seed, anchors, o = {}) {
    const r = mulberry32(seed), g = gaussFrom(r), n = anchors[anchors.length - 1][0] + 1, out = [];
    const at = i => { for (let k = 1; k < anchors.length; k++) { const [i1, p1] = anchors[k], [i0, p0] = anchors[k - 1]; if (i <= i1) return p0 + (p1 - p0) * (i - i0) / Math.max(1, i1 - i0); } return anchors[anchors.length - 1][1]; };
    let c = at(0);
    for (let i = 0; i < n; i++) { const sig = typeof o.sig === 'function' ? o.sig(i) : (o.sig || .008), op = c * (1 + g() * sig * .3), cl = at(i) * (1 + g() * sig);
      const hi = Math.max(op, cl) * (1 + Math.abs(g()) * sig * .7), lo = Math.min(op, cl) * (1 - Math.abs(g()) * sig * .7);
      out.push({ o: op, h: hi, l: lo, c: cl, v: Math.round((800 + Math.abs(cl - op) / cl / sig * 500 + r() * 400) * 1000 * (o.vol ? o.vol(i) : 1)) }); c = cl; }
    if (o.set) Object.keys(o.set).forEach(i => { const [op, hi, lo, cl] = o.set[i]; Object.assign(out[i], { o: op, h: hi, l: lo, c: cl }); if (out[+i + 1]) out[+i + 1].o = cl * (1 + (r() - .5) * .004); });
    return out; }
  const closes = d => d.map(x => x.c);
  function sma(a, k) { return a.map((_, i) => i < k - 1 ? null : a.slice(i - k + 1, i + 1).reduce((s, x) => s + x, 0) / k); }
  function ema(a, k) { const m = 2 / (k + 1); let e = null; return a.map((v, i) => { if (v == null) return null; e = e == null ? v : v * m + e * (1 - m); return i < k - 1 ? null : e; }); }
  function rsi(a, k = 14) { const out = a.map(() => null); let up = 0, dn = 0;
    for (let i = 1; i < a.length; i++) { const ch = a[i] - a[i - 1], u = Math.max(0, ch), d = Math.max(0, -ch);
      if (i <= k) { up += u / k; dn += d / k; if (i === k) out[i] = dn ? 100 - 100 / (1 + up / dn) : 100; }
      else { up = (up * (k - 1) + u) / k; dn = (dn * (k - 1) + d) / k; out[i] = dn ? 100 - 100 / (1 + up / dn) : 100; } } return out; }
  function macd(a) { const e12 = ema(a, 12), e26 = ema(a, 26), m = a.map((_, i) => e12[i] != null && e26[i] != null ? e12[i] - e26[i] : null);
    const first = m.findIndex(v => v != null), sigPart = ema(m.slice(first), 9), s = m.map((_, i) => i < first ? null : sigPart[i - first]);
    return { m, s, h: m.map((v, i) => v != null && s[i] != null ? v - s[i] : null) }; }
  function bands(a, k = 20) { const mid = sma(a, k); return { mid, up: mid.map((m, i) => { if (m == null) return null; const sl = a.slice(i - k + 1, i + 1), sd = Math.sqrt(sl.reduce((s, x) => s + (x - m) * (x - m), 0) / k); return m + 2 * sd; }),
    lo: mid.map((m, i) => { if (m == null) return null; const sl = a.slice(i - k + 1, i + 1), sd = Math.sqrt(sl.reduce((s, x) => s + (x - m) * (x - m), 0) / k); return m - 2 * sd; }) }; }
  const crossUp = (a, b, from = 0) => { for (let i = Math.max(1, from); i < a.length; i++) if (a[i] != null && b[i] != null && a[i - 1] != null && b[i - 1] != null && a[i - 1] <= b[i - 1] && a[i] > b[i]) return i; return -1; };
  const argmax = (a, f, t) => { let b = f; for (let i = f; i <= t; i++) if (a[i] != null && a[i] > a[b]) b = i; return b; };

  /* ---------- drawing ---------- */
  const BLUE = '#5B8DEF';
  function drawMain(cv, sp) {
    const g = prep(cv); if (!g) return; const { ctx } = g, d = sp.d, n = d.length, a = closes(d);
    const ov = sp.ov || [], extra = [];
    ov.forEach(o => { if (o.t === 'hl') extra.push(o.y); if (o.t === 'tl') extra.push(o.p[0][1], o.p[1][1]); if (o.t === 'bb') { const b = bands(a); b.up.forEach(v => v != null && extra.push(v)); b.lo.forEach(v => v != null && extra.push(v)); } });
    const lo = Math.min(...d.map(x => x.l), ...extra), hi = Math.max(...d.map(x => x.h), ...extra), m = (hi - lo) * .1, mkUp = ov.some(o => o.t === 'mk' && !o.below), mkDn = ov.some(o => o.t === 'mk' && o.below);
    const P = plot(g, { x0: -.7, x1: n - .3, y0: lo - m * (mkDn || sp.vol ? 3.2 : 1), y1: hi + m * (mkUp ? 3.4 : 1.4), xticks: null, padB: 10 }), { X, Y } = P, B = P.box;
    const up = css('--up'), dn = css('--down'), ink = css('--ink'), bw = Math.max(1.6, B.w / n * .62);
    ov.forEach(o => { if (o.t !== 'zone') return; ctx.fillStyle = css('--accent-soft'); ctx.fillRect(X(o.a - .5), B.y, X(o.b + .5) - X(o.a - .5), B.h); });
    if (sp.vol) { const mv = Math.max(...d.map(x => x.v)); ctx.globalAlpha = .28; d.forEach((x, i) => { ctx.fillStyle = x.c >= x.o ? up : dn; const hh = x.v / mv * B.h * .22; ctx.fillRect(X(i) - bw / 2, B.y + B.h - hh, bw, hh); }); ctx.globalAlpha = 1; }
    if (sp.line) { linePath(ctx, d.map((x, i) => [X(i), Y(x.c)])); ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2.4; ctx.stroke(); }
    else d.forEach((x, i) => { const c = x.c >= x.o ? up : dn; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1.3; const xx = Math.round(X(i)) + .5;
      ctx.beginPath(); ctx.moveTo(xx, Y(x.h)); ctx.lineTo(xx, Y(x.l)); ctx.stroke(); const y1 = Y(Math.max(x.o, x.c)), y2 = Y(Math.min(x.o, x.c)); ctx.fillRect(X(i) - bw / 2, y1, bw, Math.max(1.4, y2 - y1)); });
    const label = (x, y, t, col, align) => { ctx.font = `700 11px ${MONO}`; const w = ctx.measureText(t).width + 10; let lx = align === 'r' ? x - w : x; lx = Math.max(B.x, Math.min(B.x + B.w - w, lx));
      ctx.fillStyle = col; ctx.globalAlpha = .92; ctx.fillRect(lx, y - 9, w, 18); ctx.globalAlpha = 1; ctx.fillStyle = '#0A1F1A'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, lx + 5, y); };
    ov.forEach(o => {
      if (o.t === 'ma' || o.t === 'ema') { const v = (o.t === 'ma' ? sma : ema)(a, o.k); linePath(ctx, v.map((y, i) => [X(i), y == null ? null : Y(y)])); ctx.strokeStyle = o.c || css('--ma'); ctx.lineWidth = 2; ctx.stroke(); }
      if (o.t === 'bb') { const b = bands(a); [[b.up, .9], [b.mid, .6], [b.lo, .9]].forEach(([v, al]) => { linePath(ctx, v.map((y, i) => [X(i), y == null ? null : Y(y)])); ctx.strokeStyle = BLUE; ctx.globalAlpha = al; ctx.lineWidth = 1.8; ctx.stroke(); ctx.globalAlpha = 1; }); }
      if (o.t === 'hl') { const y = Math.round(Y(o.y)) + .5, col = o.c === 'up' ? up : o.c === 'down' ? dn : css('--accent'); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash(o.dash ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(X(o.from || 0), y); ctx.lineTo(B.x + B.w, y); ctx.stroke(); ctx.setLineDash([]); if (o.label) { if (o.left) label(X(o.from || 0) + 2, y - 11, o.label, col); else label(B.x + B.w, y - 11, o.label, col, 'r'); } }
      if (o.t === 'tl') { const [[i0, p0], [i1, p1]] = o.p, sl = (p1 - p0) / (i1 - i0), a0 = o.ext ? o.ext[0] : i0, a1 = o.ext ? o.ext[1] : i1; ctx.strokeStyle = o.c === 'down' ? dn : o.c === 'up' ? up : css('--accent'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(a0), Y(p0 + sl * (a0 - i0))); ctx.lineTo(X(a1), Y(p0 + sl * (a1 - i0))); ctx.stroke(); } });
    ov.forEach(o => { if (o.t !== 'mk') return; const x = d[o.i], below = o.below, y = below ? Y(x.l) + 10 : Y(x.h) - 10, col = o.c === 'down' ? dn : o.c === 'up' ? up : css('--sun');
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(o.i), y); ctx.lineTo(X(o.i), below ? y + 14 : y - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(o.i), y + (below ? -4 : 4)); ctx.lineTo(X(o.i) - 4, y + (below ? 3 : -3)); ctx.lineTo(X(o.i) + 4, y + (below ? 3 : -3)); ctx.fill();
      label(X(o.i) - 20, below ? y + 24 : y - 24, o.l, col); });
  }
  function drawPanel(cv, sp) {
    const g = prep(cv); if (!g) return; const { ctx } = g, d = sp.d, n = d.length, a = closes(d), up = css('--up'), dn = css('--down');
    if (sp.panel === 'rsi') { const r = rsi(a), P = plot(g, { x0: -.7, x1: n - .3, y0: 0, y1: 100, yn: 2, padB: 8, padT: 8, yfmt: v => String(Math.round(v)) }), { X, Y, box: B } = P;
      ctx.fillStyle = css('--accent-soft'); ctx.fillRect(B.x, Y(70), B.w, Y(30) - Y(70));
      [[70, dn], [30, up]].forEach(([v, c]) => { ctx.strokeStyle = c; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.x, Y(v)); ctx.lineTo(B.x + B.w, Y(v)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c; ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(v === 70 ? '70 overbought' : '30 oversold', B.x + 4, Y(v) - 2); });
      linePath(ctx, r.map((v, i) => [X(i), v == null ? null : Y(v)])); ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('RSI (14)', B.x + B.w - 4, B.y + 2); }
    if (sp.panel === 'macd') { const md = macd(a), vals = [...md.m, ...md.s, ...md.h].filter(v => v != null), lo = Math.min(...vals), hi = Math.max(...vals), P = plot(g, { x0: -.7, x1: n - .3, y0: lo, y1: hi, yn: 2, padB: 8, padT: 8, yfmt: v => v.toFixed(1) }), { X, Y, box: B } = P, bw = Math.max(1.4, B.w / n * .6);
      md.h.forEach((v, i) => { if (v == null) return; ctx.fillStyle = v >= 0 ? up : dn; ctx.globalAlpha = .5; ctx.fillRect(X(i) - bw / 2, Math.min(Y(0), Y(v)), bw, Math.abs(Y(v) - Y(0))); ctx.globalAlpha = 1; });
      ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(B.x, Y(0)); ctx.lineTo(B.x + B.w, Y(0)); ctx.stroke();
      linePath(ctx, md.m.map((v, i) => [X(i), v == null ? null : Y(v)])); ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.stroke();
      linePath(ctx, md.s.map((v, i) => [X(i), v == null ? null : Y(v)])); ctx.strokeStyle = css('--sun'); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('MACD (12, 26, 9)', B.x + B.w - 4, B.y + 2); }
    if (sp.panel === 'vol') { const mv = Math.max(...d.map(x => x.v)), P = plot(g, { x0: -.7, x1: n - .3, y0: 0, y1: mv / 1e6, yn: 2, padB: 8, padT: 8, yfmt: v => v.toFixed(0) + 'M' }), { X, Y, box: B } = P, bw = Math.max(1.6, B.w / n * .62);
      d.forEach((x, i) => { ctx.fillStyle = x.c >= x.o ? up : dn; ctx.globalAlpha = .75; ctx.fillRect(X(i) - bw / 2, Y(x.v / 1e6), bw, Y(0) - Y(x.v / 1e6)); ctx.globalAlpha = 1; });
      ctx.fillStyle = css('--muted'); ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('Volume (shares)', B.x + B.w - 4, B.y + 2); }
  }

  /* ---------- the lessons ---------- */
  const L = [
    { id: 'basics', icon: '📈', t: 'Chart basics', key: [['Candle', 'one day of trading'], ['Bottom bars', 'volume']],
      chart: () => { const d = build(3, [[0, 40], [14, 46], [24, 42.5], [44, 52], [59, 49]]), a = d.map(x => x.h), hi = argmax(a, 0, 59); let li = 0; d.forEach((x, i) => { if (x.l < d[li].l) li = i; });
        return { d, vol: true, ov: [{ t: 'mk', i: hi, l: 'Highest price' }, { t: 'mk', i: li, l: 'Lowest price', below: true, c: 'down' }] }; },
      body: `<p>A stock chart shows <b>price</b> going up and down the side and <b>time</b> going left to right. The newest price is always on the far right.</p>
        <p>A <b>line chart</b> connects each day’s closing price. A <b>candlestick chart</b> shows more: each candle is one time period (here, one day) with its open, high, low and close.</p>
        <p>The <b>timeframe</b> changes everything. The same stock can look like it’s crashing on a 1-day chart and climbing on a 1-year chart. Always check the timeframe first, and zoom out to see the bigger picture.</p>
        <p>The bars along the bottom are <b>volume</b>: how many shares traded that day. Big volume means lots of people cared about that day’s move.</p>`,
      q: [{ q: 'On a daily candlestick chart, one candle shows…', o: ['One day of trading', 'One minute', 'One year'], a: 0, why: 'Each candle is one time period. On a daily chart that’s one day; on a weekly chart, one week.' },
        { q: 'Where is the most recent price on a chart?', o: ['Far left', 'Far right', 'In the middle'], a: 1, why: 'Time moves left to right, so today is on the right edge.' },
        { q: 'A stock looks like it’s falling on a 5-day chart. What should you do before deciding anything?', o: ['Sell right away', 'Zoom out to a longer timeframe', 'Ignore volume'], a: 1, why: 'A short dip can be a tiny wiggle in a long uptrend. Zooming out shows the bigger trend.' }] },
    { id: 'candles', icon: '🕯️', t: 'Reading candlesticks', key: [['Green', 'closed higher than it opened'], ['Red', 'closed lower']],
      chart: () => ({ d: build(5, [[0, 60], [18, 48.3], [20, 47.6], [34, 55], [36, 54.3], [46, 50.5]], { set: { 19: [48.1, 49.3, 46.9, 48.15], 20: [47.5, 47.9, 44.9, 47.85], 35: [55.4, 58.3, 55.0, 55.1] } }),
        ov: [{ t: 'mk', i: 19, l: 'Doji' }, { t: 'mk', i: 20, l: 'Hammer', below: true, c: 'up' }, { t: 'mk', i: 35, l: 'Shooting star', c: 'down' }] }),
      body: `<p>The thick part of a candle is the <b>body</b>: where the price opened and closed. The thin lines are <b>wicks</b> (or shadows): the highest and lowest prices of the day.</p>
        <p>A <b>long body</b> means buyers (green) or sellers (red) were firmly in control. A <b>long wick</b> means one side pushed hard, but the other side pushed the price back.</p>
        <p><b>Doji</b>: open and close are almost the same, so the body is a thin line. Buyers and sellers tied. After a long move, it can warn that the trend is getting tired.</p>
        <p><b>Hammer</b>: a small body at the top with a long lower wick, after a drop. Sellers pushed the price way down, but buyers pushed it right back up. A possible bottom.</p>
        <p><b>Shooting star</b>: the upside-down version, after a rise. Buyers pushed way up, but sellers slammed it back down. A possible top.</p>
        <p>One candle is only a clue, not a promise. Look for the next candle to confirm it.</p>`,
      q: [{ q: 'A candle with a tiny body and a long lower wick, after a downtrend, is called a…', o: ['Hammer', 'Shooting star', 'Doji'], a: 0, why: 'A hammer shows sellers pushed the price down, but buyers took control and closed it near the top.' },
        { q: 'What does a long upper wick tell you?', o: ['Buyers pushed the price up, but sellers pushed it back down', 'The stock paid a dividend', 'Volume was low'], a: 0, why: 'The wick marks how high the price went. Closing far below it means sellers won by the end of the day.' },
        { q: 'A doji means…', o: ['Buyers and sellers were evenly matched', 'The price went straight up', 'The market was closed'], a: 0, why: 'The open and close are nearly equal, so neither side won the day.' }] },
    { id: 'combos', icon: '🧩', t: 'Candle patterns', key: [['Engulfing', 'a big candle swallows the last one'], ['Star', 'three-candle turn']],
      chart: () => ({ d: build(8, [[0, 58], [15, 48.6], [17, 49.2], [32, 56.3], [36, 55.2], [46, 51]], { set: { 16: [48.7, 49, 47.8, 48.0], 17: [47.85, 49.7, 47.6, 49.5], 33: [56.3, 58.5, 56.1, 58.3], 34: [58.7, 59.3, 58.4, 58.75], 35: [58.4, 58.5, 55.6, 55.8] } }),
        ov: [{ t: 'mk', i: 17, l: 'Bullish engulfing', below: true, c: 'up' }, { t: 'mk', i: 34, l: 'Evening star', c: 'down' }] }),
      body: `<p>Some of the most watched signals use two or three candles together.</p>
        <p><b>Bullish engulfing</b>: after a drop, a small red candle is followed by a bigger green candle whose body completely covers (“engulfs”) the red one. Buyers took over. <b>Bearish engulfing</b> is the opposite at a top.</p>
        <p><b>Morning star</b> (bottoms): a big red candle, a small candle, then a big green candle. The small candle in the middle shows selling ran out of steam.</p>
        <p><b>Evening star</b> (tops): a big green candle, a small candle, then a big red candle.</p>
        <p>These patterns matter most at important prices, like support or resistance, and on higher volume.</p>`,
      q: [{ q: 'A big green candle that covers the whole body of the red candle before it is a…', o: ['Bullish engulfing pattern', 'Bearish engulfing pattern', 'Doji'], a: 0, why: 'The green body “engulfs” the red one, showing buyers overpowered sellers.' },
        { q: 'An evening star usually appears…', o: ['At the top of a rise', 'At the bottom of a drop', 'Only on weekends'], a: 0, why: 'Green, small, then red: a warning that an uptrend may be turning down.' },
        { q: 'Where do candle patterns matter most?', o: ['At important prices like support or resistance', 'In the middle of nowhere', 'Only on line charts'], a: 0, why: 'A reversal candle at a level where the price has turned before is a much stronger clue.' }] },
    { id: 'trends', icon: '↗️', t: 'Trends and trendlines', key: [['Line', 'connects the higher lows']],
      chart: () => ({ d: build(11, [[0, 40], [6, 45], [10, 43], [17, 49], [21, 46.5], [28, 53], [32, 50], [39, 56], [43, 53.5], [48, 57.3], [55, 50.5], [59, 51]]),
        ov: [{ t: 'tl', p: [[10, 42.6], [43, 53.1]], ext: [4, 59] }, { t: 'mk', i: 17, l: 'Higher high', c: 'up' }, { t: 'mk', i: 21, l: 'Higher low', below: true, c: 'up' }, { t: 'mk', i: 52, l: 'Trendline break', below: true, c: 'down' }] }),
      body: `<p>Prices zigzag, but the zigzags have a direction. That direction is the <b>trend</b>.</p>
        <p><b>Uptrend</b>: higher highs and higher lows, like climbing stairs. <b>Downtrend</b>: lower highs and lower lows. <b>Sideways</b> (a range): the price bounces between a floor and a ceiling.</p>
        <p>A <b>trendline</b> connects the low points in an uptrend (or the high points in a downtrend). The more times the price touches it and bounces, the more traders trust it.</p>
        <p>Two parallel lines around a trend make a <b>channel</b>. When the price closes clearly through the trendline, the trend may be ending, like on the right side of this chart.</p>
        <p>A famous saying: “The trend is your friend.” Going with the trend usually works better than fighting it.</p>`,
      q: [{ q: 'Higher highs and higher lows describe…', o: ['An uptrend', 'A downtrend', 'A sideways market'], a: 0, why: 'Each peak and each dip is higher than the last one.' },
        { q: 'In an uptrend, you draw the trendline along the…', o: ['Lows', 'Highs', 'Volume bars'], a: 0, why: 'An uptrend line connects the rising low points, acting like a slanted floor.' },
        { q: 'The price closes clearly below a rising trendline. This suggests…', o: ['The uptrend may be ending', 'The uptrend is getting stronger', 'Nothing at all'], a: 0, why: 'A trendline break is an early warning that buyers are losing control.' }] },
    { id: 'sr', icon: '🧱', t: 'Support and resistance', key: [['Green line', 'support (floor)'], ['Red line', 'resistance (ceiling)']],
      chart: () => ({ d: build(14, [[0, 41], [5, 45.6], [10, 40.6], [16, 45.7], [22, 40.5], [28, 45.6], [33, 41.5], [37, 47.6], [41, 49.2], [46, 46.4], [51, 51], [57, 53.5]]),
        ov: [{ t: 'hl', y: 40.4, c: 'up', label: 'Support', dash: true, left: true }, { t: 'hl', y: 46, c: 'down', label: 'Resistance → support', dash: true }, { t: 'mk', i: 37, l: 'Breakout', c: 'up' }, { t: 'mk', i: 46, l: 'Retest', below: true }] }),
      body: `<p><b>Support</b> is a price where a falling stock keeps stopping and bouncing up, like a floor. Buyers think it’s a bargain there.</p>
        <p><b>Resistance</b> is a price where a rising stock keeps getting pushed back down, like a ceiling. Sellers take profits there.</p>
        <p>The <b>more times</b> a level holds, the more important it is. Round numbers ($50, $100) often act as support or resistance too.</p>
        <p>When the price finally pushes through resistance, that’s a <b>breakout</b>. Here’s the twist: old resistance often becomes new support. Traders call it a <b>retest</b> when the price comes back down to the old ceiling and bounces off it.</p>
        <p>A <b>fakeout</b> (false breakout) is when the price pokes through a level, then falls right back. Waiting for a close above the level, or a retest, helps avoid them.</p>`,
      q: [{ q: 'A price where a stock keeps bouncing up from is called…', o: ['Support', 'Resistance', 'A dividend'], a: 0, why: 'Support is a floor where buyers step in.' },
        { q: 'After a breakout above resistance, that old resistance level often becomes…', o: ['New support', 'Meaningless', 'A stock split'], a: 0, why: 'This is called role reversal. The old ceiling becomes the new floor.' },
        { q: 'A stock pokes above resistance, then closes back below it. This is a…', o: ['Fakeout (false breakout)', 'Golden cross', 'Hammer'], a: 0, why: 'The breakout failed. Waiting for a strong close or a retest helps avoid fakeouts.' }] },
    { id: 'volume', icon: '📊', t: 'Volume', key: [['Bars', 'shares traded each day']],
      chart: () => ({ d: build(17, [[0, 30], [20, 32.6], [24, 32.2], [25, 35.4], [38, 39.5], [46, 38.5], [59, 39.6]], { vol: i => i === 25 ? 3.6 : i === 26 ? 2.2 : i > 40 ? .5 : 1 }), panel: 'vol',
        ov: [{ t: 'hl', y: 33, c: 'down', dash: true, label: 'Resistance' }, { t: 'mk', i: 25, l: 'Breakout on big volume', c: 'up', below: true }, { t: 'mk', i: 50, l: 'Rally on weak volume' }] }),
      body: `<p><b>Volume</b> is how many shares changed hands. It tells you how much conviction is behind a move.</p>
        <p>A breakout on <b>big volume</b> is more believable: lots of buyers showed up. A breakout on light volume is more likely to be a fakeout.</p>
        <p>In a healthy uptrend, volume is usually higher on up days and lower on down days. If the price keeps rising but volume keeps shrinking, fewer buyers are joining, and the rally may be running out of fuel.</p>
        <p>A huge volume spike after a long run (a “climax”) can mark the end of a move, when the last buyers or sellers finally give in.</p>`,
      q: [{ q: 'Which breakout is more convincing?', o: ['One on much higher volume than usual', 'One on very low volume', 'Volume doesn’t matter'], a: 0, why: 'High volume means many traders agree with the move.' },
        { q: 'The price is rising, but volume shrinks every day. This suggests…', o: ['The rally may be losing strength', 'The rally is getting stronger', 'The stock will split'], a: 0, why: 'Fewer buyers are joining the move.' },
        { q: 'Volume measures…', o: ['How many shares traded', 'How loud the trading floor is', 'The company’s profit'], a: 0, why: 'Volume is the number of shares that changed hands in that period.' }] },
    { id: 'ma', icon: '〰️', t: 'Moving averages', key: [['Gold', '20-day average'], ['Blue', '50-day average']],
      chart: () => { const d = build(21, [[0, 60], [45, 46], [60, 47], [75, 51], [86, 49.5], [129, 63]]), a = closes(d), x = crossUp(sma(a, 20), sma(a, 50), 50);
        return { d, ov: [{ t: 'ma', k: 20 }, { t: 'ma', k: 50, c: BLUE }].concat(x > 0 ? [{ t: 'mk', i: x, l: 'Golden cross', c: 'up', below: true }] : []) }; },
      body: `<p>A <b>moving average</b> (MA) is the average closing price over the last few days, redrawn each day. It smooths out the wiggles so you can see the trend.</p>
        <p>Common ones: the <b>20-day</b> (short term), <b>50-day</b> (medium) and <b>200-day</b> (long term). An <b>EMA</b> (exponential moving average) gives more weight to recent days, so it reacts faster than a simple average (SMA).</p>
        <p>Price <b>above</b> a rising average is a sign of an uptrend. Below a falling average, a downtrend. In a trend, the average often acts like moving support or resistance.</p>
        <p>When a shorter average crosses <b>above</b> a longer one, it’s called a <b>golden cross</b> (bullish). Crossing below is a <b>death cross</b> (bearish).</p>
        <p>Moving averages <b>lag</b>: they use past prices, so they confirm a trend after it starts. They work poorly in choppy, sideways markets.</p>`,
      q: [{ q: 'The 50-day moving average crosses above the 200-day. This is called a…', o: ['Golden cross', 'Death cross', 'Doji'], a: 0, why: 'A shorter average crossing above a longer one is a bullish signal called a golden cross.' },
        { q: 'Why does an EMA react faster than an SMA?', o: ['It gives more weight to recent prices', 'It uses more days', 'It ignores closing prices'], a: 0, why: 'The exponential average counts the latest days more heavily.' },
        { q: 'A big weakness of moving averages is that they…', o: ['Lag behind the price', 'Predict the future perfectly', 'Only work on weekends'], a: 0, why: 'They are built from past prices, so signals come after the move has started.' }] },
    { id: 'rsi', icon: '🌡️', t: 'RSI (Relative Strength Index)', key: [['Blue line', 'RSI, from 0 to 100']],
      chart: () => { const d = build(25, [[0, 40], [24, 40.8], [39, 55.5], [47, 51.5], [60, 58.3], [64, 55.8], [76, 59.4], [89, 50.5]]), r = rsi(closes(d)), hi = argmax(r, 25, 45);
        return { d, panel: 'rsi', ov: [{ t: 'mk', i: hi, l: 'RSI over 70: overbought', c: 'down' }, { t: 'mk', i: argmax(d.map(x => x.h), 70, 80), l: 'Higher high, weaker RSI = divergence' }] }; },
      body: `<p>The <b>RSI</b> measures <b>momentum</b>: how strong recent up days are compared with recent down days, usually over 14 days. It goes from 0 to 100 and is drawn below the price.</p>
        <p>Above <b>70</b> is called <b>overbought</b>: the price rose fast and may be due for a rest or pullback. Below <b>30</b> is <b>oversold</b>: it fell fast and may bounce.</p>
        <p>Careful: in a strong trend, RSI can stay overbought (or oversold) for a long time. “Overbought” doesn’t mean “sell now.”</p>
        <p><b>Divergence</b> is a powerful clue. If the price makes a <b>higher high</b> but RSI makes a <b>lower high</b>, the climb is losing momentum (bearish divergence). A lower low in price with a higher low in RSI is bullish divergence.</p>
        <p>Many traders also watch the <b>50 line</b>: RSI above 50 leans bullish, below 50 leans bearish.</p>`,
      q: [{ q: 'An RSI reading of 78 is usually called…', o: ['Overbought', 'Oversold', 'Neutral'], a: 0, why: 'Above 70 means the price has risen quickly and may be stretched.' },
        { q: 'Price makes a higher high, but RSI makes a lower high. This is…', o: ['Bearish divergence', 'Bullish divergence', 'A golden cross'], a: 0, why: 'Momentum is fading even though the price went higher, a warning sign.' },
        { q: 'RSI has been above 70 for weeks during a strong uptrend. What’s true?', o: ['RSI can stay overbought in strong trends', 'The stock must crash tomorrow', 'RSI is broken'], a: 0, why: 'Overbought isn’t a sell signal by itself. Strong trends can stay overbought.' }] },
    { id: 'macd', icon: '🌊', t: 'MACD', key: [['Blue', 'MACD line'], ['Gold', 'signal line'], ['Bars', 'histogram']],
      chart: () => { const d = build(29, [[0, 56], [42, 44], [52, 45.5], [99, 59]]), md = macd(closes(d)), x = crossUp(md.m, md.s, 40);
        return { d, panel: 'macd', ov: x > 0 ? [{ t: 'mk', i: x, l: 'Bullish crossover', c: 'up', below: true }] : [] }; },
      body: `<p><b>MACD</b> (say “mack-dee”) stands for Moving Average Convergence Divergence. It shows trend and momentum together.</p>
        <p>The <b>MACD line</b> is the 12-day EMA minus the 26-day EMA. The <b>signal line</b> is a 9-day EMA of the MACD line. The <b>histogram</b> bars show the gap between them.</p>
        <p>When the MACD line crosses <b>above</b> the signal line, it’s a <b>bullish crossover</b>: momentum is turning up. Crossing below is bearish.</p>
        <p>MACD <b>above zero</b> means the short-term average is above the long-term one (bullish). Below zero is bearish. Growing histogram bars mean momentum is building; shrinking bars mean it’s fading.</p>
        <p>Like all moving-average tools, MACD lags and gives false signals in sideways markets.</p>`,
      q: [{ q: 'The MACD line crosses above the signal line. This is a…', o: ['Bullish crossover', 'Bearish crossover', 'Stock split'], a: 0, why: 'Momentum is turning upward.' },
        { q: 'The MACD line is made from…', o: ['Two exponential moving averages', 'Volume only', 'The company’s earnings'], a: 0, why: 'It’s the 12-day EMA minus the 26-day EMA.' },
        { q: 'The histogram bars are getting shorter and shorter. This means…', o: ['Momentum is fading', 'Momentum is growing', 'Volume doubled'], a: 0, why: 'The two lines are getting closer, so the push behind the move is weakening.' }] },
    { id: 'bb', icon: '🎯', t: 'Bollinger Bands', key: [['Blue lines', 'upper band, 20-day average, lower band']],
      chart: () => ({ d: build(33, [[0, 50], [12, 54], [24, 51.6], [58, 51.8], [72, 60], [89, 59]], { sig: i => i > 28 && i < 58 ? .0028 : .009 }), ov: [{ t: 'bb' }, { t: 'mk', i: 50, l: 'Squeeze', below: true }, { t: 'mk', i: 62, l: 'Breakout', c: 'up' }] }),
      body: `<p><b>Bollinger Bands</b> are three lines: a 20-day moving average in the middle, with an upper and lower band about <b>2 standard deviations</b> away. They measure <b>volatility</b>, how wildly the price is moving.</p>
        <p>The price stays inside the bands most of the time, so touching a band means the price is stretched compared with normal.</p>
        <p>When the bands get very narrow, it’s called a <b>squeeze</b>: the stock has been unusually calm. Calm often comes before a big move, but the squeeze doesn’t tell you which direction.</p>
        <p>In a strong uptrend, the price can “walk the band,” riding along the upper band for weeks. Touching the upper band is not automatically a sell signal.</p>`,
      q: [{ q: 'Very narrow Bollinger Bands (a squeeze) often come before…', o: ['A big price move', 'A dividend', 'Nothing ever'], a: 0, why: 'Low volatility tends to be followed by high volatility, in either direction.' },
        { q: 'The middle Bollinger Band is a…', o: ['20-day moving average', 'Trendline', 'Volume bar'], a: 0, why: 'The bands are drawn around a 20-day simple moving average.' },
        { q: 'Bollinger Bands mainly measure…', o: ['Volatility', 'Company profits', 'Interest rates'], a: 0, why: 'The bands widen when prices swing more and narrow when they calm down.' }] },
    { id: 'reversal', icon: '⛰️', t: 'Reversal patterns', key: [['Line', 'the neckline']],
      chart: () => ({ d: build(37, [[0, 40], [10, 48], [16, 45.1], [26, 54], [33, 45.1], [42, 49], [47, 45], [55, 40.5], [59, 41]]),
        ov: [{ t: 'hl', y: 45, c: 'down', dash: true, label: 'Neckline', from: 8 }, { t: 'mk', i: 10, l: 'Left shoulder' }, { t: 'mk', i: 26, l: 'Head' }, { t: 'mk', i: 42, l: 'Right shoulder' }, { t: 'mk', i: 49, l: 'Neckline break', below: true, c: 'down' }] }),
      body: `<p>Reversal patterns are shapes that often show up when a trend is about to turn around.</p>
        <p><b>Head and shoulders</b>: three peaks, with the middle one (the head) highest. The line under the dips is the <b>neckline</b>. When the price breaks below the neckline, the uptrend has often ended. An <b>inverse head and shoulders</b> is the upside-down version at a bottom.</p>
        <p><b>Double top</b>: the price hits the same high twice and fails, making an “M.” It confirms when the price falls below the dip between the peaks. <b>Double bottom</b>: a “W” at a low, where the price holds the same floor twice and then rises.</p>
        <p>Patterns aren’t confirmed until the price breaks the key level, ideally on strong volume. Many patterns never complete.</p>`,
      q: [{ q: 'Three peaks with the middle one highest is called a…', o: ['Head and shoulders', 'Double bottom', 'Bull flag'], a: 0, why: 'The middle peak is the head, with a shoulder on each side.' },
        { q: 'A “W” shape at a low point is a…', o: ['Double bottom', 'Double top', 'Shooting star'], a: 0, why: 'The price tested the same floor twice and held, a possible bottom.' },
        { q: 'When is a head and shoulders pattern confirmed?', o: ['When the price breaks below the neckline', 'As soon as you see the head', 'Never'], a: 0, why: 'Until the neckline breaks, it’s just a possible pattern.' }] },
    { id: 'continuation', icon: '🚩', t: 'Continuation patterns', key: [['Lines', 'the flag’s channel']],
      chart: () => ({ d: build(41, [[0, 40], [7, 41], [16, 52], [19, 50.2], [22, 51.3], [25, 49.4], [28, 50.4], [30, 48.8], [31, 50.6], [42, 58.5], [49, 57.5]], { vol: i => i > 8 && i < 17 ? 2 : i > 16 && i < 31 ? .6 : i === 31 || i === 32 ? 2.4 : 1 }),
        vol: true, ov: [{ t: 'tl', p: [[16, 52.6], [28, 51]], ext: [16, 31], c: 'down' }, { t: 'tl', p: [[19, 49.8], [30, 48.2]], ext: [17, 31], c: 'up' }, { t: 'mk', i: 12, l: 'Flagpole', below: true }, { t: 'mk', i: 32, l: 'Breakout', c: 'up', below: true }] }),
      body: `<p>Continuation patterns are pauses in a trend before it keeps going.</p>
        <p><b>Bull flag</b>: a sharp rise (the <b>flagpole</b>) followed by a small, slightly downward drift on lighter volume (the <b>flag</b>). A breakout above the flag often continues the rise. A <b>bear flag</b> is the opposite in a downtrend.</p>
        <p><b>Triangles</b>: an <b>ascending triangle</b> has a flat top and rising lows (buyers getting more eager, usually bullish). A <b>descending triangle</b> has a flat bottom and falling highs (usually bearish). A <b>symmetrical triangle</b> narrows from both sides and can break either way.</p>
        <p><b>Cup and handle</b>: a rounded “U” followed by a small dip (the handle), then a breakout.</p>
        <p><b>Gaps</b>: when a stock opens far above or below the last close (often after earnings news), it leaves a gap on the chart. Big gaps on big volume show strong surprise.</p>`,
      q: [{ q: 'A sharp rise followed by a small, gentle pullback on lower volume is a…', o: ['Bull flag', 'Head and shoulders', 'Death cross'], a: 0, why: 'The pole is the sharp rise; the flag is the calm pause before the trend continues.' },
        { q: 'A flat top with rising lows forms an…', o: ['Ascending triangle', 'Descending triangle', 'Evening star'], a: 0, why: 'Buyers keep stepping in at higher prices while sellers hold one ceiling, usually bullish.' },
        { q: 'A stock opens far above yesterday’s close after great earnings. On the chart this leaves a…', o: ['Gap', 'Doji', 'Trendline'], a: 0, why: 'There’s an empty space between yesterday’s candle and today’s.' }] },
    { id: 'plan', icon: '🧭', t: 'Putting it all together', key: [['Green', 'support'], ['Red dashes', 'stop-loss'], ['Gold dashes', 'target']],
      chart: () => ({ d: build(45, [[0, 60], [20, 50.2], [28, 53.5], [36, 49.9], [37, 49.7], [55, 56.5], [59, 56]], { set: { 37: [50.1, 50.3, 49.3, 49.6], 38: [49.5, 51.4, 49.3, 51.2] } }), panel: 'rsi',
        ov: [{ t: 'hl', y: 49.5, c: 'up', label: 'Support', from: 15, left: true }, { t: 'hl', y: 48.3, c: 'down', dash: true, label: 'Stop-loss', from: 36 }, { t: 'hl', y: 55, dash: true, label: 'Target', from: 36 }, { t: 'mk', i: 38, l: 'Entry: bullish engulfing at support', below: true, c: 'up' }] }),
      body: `<p>No single signal is reliable on its own. The strongest setups have <b>confluence</b>: several clues agreeing. Here: the price is at <b>support</b>, RSI is turning up from a low reading and a <b>bullish engulfing</b> candle appears.</p>
        <p><b>Check more than one timeframe.</b> A dip on the daily chart inside an uptrend on the weekly chart is very different from a dip in a long downtrend.</p>
        <p><b>Plan your risk before you buy.</b> A <b>stop-loss</b> is a price where you’ll sell if you’re wrong, usually just below support. A <b>target</b> is where you plan to take profit, often near the next resistance. A good trade risks $1 to make $2 or more (a <b>risk/reward</b> ratio of 1:2).</p>
        <p><b>Size small.</b> Many traders never risk more than 1% to 2% of their account on one trade.</p>
        <p>Tools you’ll hear about next: <b>Fibonacci retracements</b> (common pullback levels like 38%, 50% and 62%), <b>VWAP</b> (the average price weighted by volume, used by day traders), <b>ATR</b> (how much a stock typically moves per day) and the <b>stochastic oscillator</b> (another momentum gauge like RSI).</p>
        <p>Remember: charts show what <i>might</i> happen, not what <i>will</i>. Most long-term investors use charts lightly and focus on owning good, diversified investments for years.</p>`,
      q: [{ q: 'Confluence means…', o: ['Several signals agree', 'Using only one indicator', 'Buying at the very top'], a: 0, why: 'More independent clues pointing the same way make a setup more reliable.' },
        { q: 'Where do traders often put a stop-loss on a buy near support?', o: ['Just below support', 'Far above the price', 'They never use one'], a: 0, why: 'If support breaks, the reason for the trade is gone, so you exit with a small loss.' },
        { q: 'You risk $2 per share to make $6 per share. Your risk/reward ratio is…', o: ['1:3', '3:1', '1:1'], a: 0, why: 'Risk 2, reward 6: you could make 3 times what you risk.' },
        { q: 'What’s the honest truth about chart reading?', o: ['It shows probabilities, not certainties', 'It predicts the future perfectly', 'It only works for professionals'], a: 0, why: 'Even great setups fail sometimes. That’s why you plan your risk.' }] }];

  /* ---------- Pattern Spotter ---------- */
  const PATTERNS = { up: 'Uptrend', down: 'Downtrend', range: 'Sideways range', dtop: 'Double top', dbot: 'Double bottom', hs: 'Head and shoulders', flag: 'Bull flag', asc: 'Ascending triangle' };
  const SHAPES = { up: [[0, 0], [6, 1.2], [10, .7], [17, 2], [21, 1.5], [28, 2.8], [32, 2.3], [39, 3.6], [44, 3.2]], down: [[0, 3.6], [6, 2.4], [10, 2.9], [17, 1.6], [21, 2.1], [28, .8], [32, 1.3], [39, 0], [44, .4]],
    range: [[0, 1], [6, 2.4], [12, .9], [18, 2.5], [24, 1], [30, 2.4], [36, .9], [44, 1.8]], dtop: [[0, 0], [11, 3], [18, 1.8], [27, 3], [35, 1.5], [44, .3]], dbot: [[0, 3], [11, 0], [18, 1.2], [27, 0], [35, 1.5], [44, 2.8]],
    hs: [[0, 0], [8, 2], [13, 1.2], [21, 3.2], [28, 1.2], [35, 2], [40, 1.1], [44, 0]], flag: [[0, 0], [6, .2], [13, 3], [17, 2.6], [20, 2.85], [24, 2.35], [28, 2.6], [31, 2.15], [33, 2.9], [44, 4.2]],
    asc: [[0, 0], [6, 3], [11, 1], [17, 3], [22, 1.8], [27, 3], [31, 2.4], [35, 3], [38, 2.75], [44, 4]] };
  let PS = { kind: null, d: null, seed: Date.now() % 100000, streak: 0, answered: false };
  function newPattern() { const keys = Object.keys(SHAPES); let k; do k = keys[Math.floor(Math.random() * keys.length)]; while (k === PS.kind); PS.kind = k; PS.seed++;
    const base = 20 + Math.random() * 150, sc = base * (.04 + Math.random() * .03), r = mulberry32(PS.seed);
    PS.d = build(PS.seed, SHAPES[k].map(([i, v]) => [i, base + (v + (r() - .5) * .25) * sc]), { sig: .006 }); PS.answered = false;
    const others = keys.filter(x => x !== k).sort(() => Math.random() - .5).slice(0, 3); PS.opts = others.concat(k).sort(() => Math.random() - .5); }

  /* ---------- screens (shared by Chart School and Market School) ---------- */
  function mount(box, cfg) {
    const L = cfg.lessons, key = cfg.key, st = () => { if (!S[key]) S[key] = { done: {}, best: 0 }; return S[key]; };
    function home() {
      const done = st().done, n = L.filter(l => done[l.id]).length;
      box.innerHTML = '<div class="card cs"><div class="row" style="justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap"><div><div class="eyebrow">' + esc(cfg.eyebrow) + ' · +20 XP per lesson</div><h3 style="font-size:26px">' + esc(cfg.title) + '</h3>' +
        '<p class="muted" style="margin:4px 0 0">' + esc(cfg.blurb) + '</p></div><div class="cs-prog"><b>' + n + '</b> of ' + L.length + ' done</div></div>' +
        '<div class="cs-bar"><i style="width:' + (n / L.length * 100) + '%"></i></div><div class="cs-list">' +
        L.map((l, i) => '<button class="cs-item' + (done[l.id] ? ' done' : '') + '" data-l="' + i + '"><span class="cs-ic">' + (done[l.id] ? '✅' : l.icon) + '</span><span><small class="muted">Lesson ' + (i + 1) + '</small><b>' + esc(l.t) + '</b></span></button>').join('') + '</div></div>' +
        (cfg.game ? '<div class="card game-card" id="' + key + '-game"></div>' : '');
      box.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => lesson(+b.dataset.l); });
      if (cfg.game) cfg.game(box.querySelector('#' + key + '-game'), st);
    }
    function lesson(i) {
      const l = L[i], sp = l.chart(), done = st().done[l.id];
      box.innerHTML = '<div class="card cs cs-lesson"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="cs-back">← All lessons</button><span class="eyebrow">Lesson ' + (i + 1) + ' of ' + L.length + (done ? ' · ✅ done' : '') + '</span></div>' +
        '<h3 style="font-size:28px;margin:10px 0 6px">' + l.icon + ' ' + esc(l.t) + '</h3>' +
        '<canvas id="cv-cs" style="height:' + (sp.h || 300) + 'px;width:100%" aria-label="Example chart for ' + esc(l.t) + '"></canvas>' + (sp.panel ? '<canvas id="cv-cs2" style="height:120px;width:100%;margin-top:4px" aria-hidden="true"></canvas>' : '') +
        '<p class="muted cs-key">' + l.key.map(k => '<b>' + esc(k[0]) + '</b>: ' + esc(k[1])).join(' · ') + ' · pretend data</p>' +
        '<div class="lesson-text cs-body">' + l.body + '</div><h4 style="margin:18px 0 6px">Quick check</h4><div id="cs-q"></div>' +
        '<div class="row" style="justify-content:space-between;margin-top:16px;gap:8px">' + (i > 0 ? '<button class="btn ghost" id="cs-prev">← ' + esc(L[i - 1].t) + '</button>' : '<span></span>') + (i < L.length - 1 ? '<button class="btn ghost" id="cs-next">' + esc(L[i + 1].t) + ' →</button>' : '') + '</div></div>';
      const cv = box.querySelector('#cv-cs'); reg(cv, () => sp.curve ? drawCurve(cv, sp) : drawMain(cv, sp)); const cv2 = box.querySelector('#cv-cs2'); if (cv2) reg(cv2, () => drawPanel(cv2, sp));
      box.querySelector('#cs-back').onclick = () => { home(); box.scrollIntoView({ block: 'start' }); };
      const nav = (id, j) => { const b = box.querySelector(id); if (b) b.onclick = () => { lesson(j); box.scrollIntoView({ block: 'start' }); }; }; nav('#cs-prev', i - 1); nav('#cs-next', i + 1);
      quiz(l);
    }
    function quiz(l) {
      const q = box.querySelector('#cs-q'), got = {};
      q.innerHTML = l.q.map((x, k) => '<div class="qcard cs-qc"><p style="font-weight:700;margin:0 0 8px">' + (k + 1) + '. ' + esc(x.q) + '</p><div class="cs-opts">' +
        x.o.map((o, j) => ({ o, j })).sort((a, b) => ((a.j * 7 + k * 3) % 5) - ((b.j * 7 + k * 3) % 5)).map(({ o, j }) => '<button class="btn ghost" data-q="' + k + '" data-o="' + j + '">' + esc(o) + '</button>').join('') + '</div><p class="cs-why" id="cs-why-' + k + '" hidden></p></div>').join('');
      q.querySelectorAll('[data-q]').forEach(b => { b.onclick = () => { const k = +b.dataset.q, x = l.q[k], ok = +b.dataset.o === x.a, why = q.querySelector('#cs-why-' + k);
        q.querySelectorAll('[data-q="' + k + '"]').forEach(y => y.classList.remove('wrong'));
        b.classList.add(ok ? 'right' : 'wrong'); why.hidden = false; why.innerHTML = (ok ? '✅ ' : '❌ Not quite. ') + esc(x.why);
        if (ok) { got[k] = 1; q.querySelectorAll('[data-q="' + k + '"]').forEach(y => { y.disabled = true; }); }
        if (Object.keys(got).length === l.q.length && !st().done[l.id]) { st().done[l.id] = Date.now(); save(); try { window.TT_track && window.TT_track(key === 'cs' ? 'chart_lesson' : 'market_lesson'); } catch (e) {} try { addXP(20, b); } catch (e) {}
          const n = L.filter(z => st().done[z.id]).length; toast(n === L.length ? cfg.finish : 'Lesson complete! ' + n + ' of ' + L.length + ' done.'); if (n === L.length) try { confetti(); } catch (e) {} } }; }); }
    home();
  }
  // generic line chart: series of [x, y] points, used for payoff diagrams and other curves
  function drawCurve(cv, sp) {
    const g = prep(cv); if (!g) return; const { ctx } = g, ser = sp.series, xs = ser.flatMap(s => s.pts.map(p => p[0])), ys = ser.flatMap(s => s.pts.map(p => p[1])).concat(sp.zero ? [0] : []).concat((sp.hl || []).map(h => h.y));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys), m = (hi - lo) * .12 || 1;
    const P = plot(g, { x0, x1, y0: lo - m, y1: hi + m * 1.8, padB: 26, yfmt: sp.yfmt, xticks: sp.xticks || null }), { X, Y, box: B } = P;
    if (sp.zero) { ctx.strokeStyle = css('--ink'); ctx.globalAlpha = .45; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.x, Y(0)); ctx.lineTo(B.x + B.w, Y(0)); ctx.stroke(); ctx.globalAlpha = 1; }
    if (sp.fill) { const s0 = ser[0]; ['up', 'down'].forEach(side => { ctx.beginPath(); ctx.moveTo(X(s0.pts[0][0]), Y(0)); s0.pts.forEach(p => ctx.lineTo(X(p[0]), Y(side === 'up' ? Math.max(0, p[1]) : Math.min(0, p[1])))); ctx.lineTo(X(s0.pts[s0.pts.length - 1][0]), Y(0)); ctx.closePath(); ctx.fillStyle = side === 'up' ? css('--up') : css('--down'); ctx.globalAlpha = .16; ctx.fill(); ctx.globalAlpha = 1; }); }
    (sp.vl || []).forEach(v => { ctx.strokeStyle = css('--muted'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(v.x), B.y); ctx.lineTo(X(v.x), B.y + B.h); ctx.stroke(); ctx.setLineDash([]);
      if (v.l) { ctx.font = `700 11px ${MONO}`; ctx.fillStyle = css('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(v.l, X(v.x), B.y + B.h - 18); } });
    (sp.hl || []).forEach(h => { ctx.strokeStyle = h.c || css('--muted'); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.x, Y(h.y)); ctx.lineTo(B.x + B.w, Y(h.y)); ctx.stroke(); ctx.setLineDash([]); });
    const cols = { up: css('--up'), down: css('--down'), gold: css('--sun'), blue: BLUE, ink: css('--ink'), accent: css('--accent'), muted: css('--muted') };
    ser.forEach(s => { linePath(ctx, s.pts.map(p => [X(p[0]), Y(p[1])])); ctx.strokeStyle = cols[s.c || 'accent'] || s.c; ctx.lineWidth = s.w || 2.6; ctx.setLineDash(s.dash ? [6, 5] : []); ctx.stroke(); ctx.setLineDash([]); });
    let ly = B.y + 8; ser.forEach(s => { if (!s.l) return; ctx.font = `700 11px ${MONO}`; ctx.fillStyle = cols[s.c || 'accent'] || s.c; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillRect(B.x + 8, ly + 3, 14, 3); ctx.fillText(s.l, B.x + 28, ly - 2); ly += 16; });
    (sp.mk || []).forEach(k => { const x = X(k.x), y = Y(k.y), col = cols[k.c || 'gold']; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
      ctx.font = `700 11px ${MONO}`; const w = ctx.measureText(k.l).width + 10; let lx = Math.max(B.x, Math.min(B.x + B.w - w, x - w / 2)), yy = k.below ? y + 16 : y - 16; ctx.globalAlpha = .92; ctx.fillRect(lx, yy - 9, w, 18); ctx.globalAlpha = 1; ctx.fillStyle = '#0A1F1A'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(k.l, lx + 5, yy); });
    if (sp.xl) { ctx.font = `600 11px ${MONO}`; ctx.fillStyle = css('--muted'); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(sp.xl, B.x + B.w, B.y + B.h - 4); }
  }
  // Pattern Spotter game for Chart School
  function spotterGame(el, st) {
    if (!PS.d) newPattern();
    el.innerHTML = '<div class="row" style="justify-content:space-between"><div><div class="eyebrow">Mini game · +10 XP per right answer</div><h3 style="font-size:26px">Pattern Spotter</h3></div>' +
      '<div class="scorebar"><div><span>Streak</span><b id="ps-streak">' + PS.streak + '</b></div><div><span>Best</span><b>' + (st().best || 0) + '</b></div></div></div>' +
      '<canvas id="cv-ps" style="height:230px;width:100%" aria-label="Mystery chart pattern"></canvas><p style="font-weight:700;margin:10px 0 8px">What pattern is this?</p><div class="choices cs-ch" id="ps-ch"></div><div class="fb" id="ps-fb" aria-live="polite"></div>';
    const cv = el.querySelector('#cv-ps'); reg(cv, () => drawMain(cv, { d: PS.d }));
    const ch = el.querySelector('#ps-ch'); ch.innerHTML = PS.opts.map(k => '<button class="btn ghost" data-ps="' + k + '">' + esc(PATTERNS[k]) + '</button>').join('');
    ch.querySelectorAll('[data-ps]').forEach(b => { b.onclick = () => { if (PS.answered) return; PS.answered = true; const ok = b.dataset.ps === PS.kind, fb = el.querySelector('#ps-fb');
      ch.querySelectorAll('[data-ps]').forEach(x => { if (x.dataset.ps === PS.kind) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      if (ok) { PS.streak++; if (PS.streak > (st().best || 0)) st().best = PS.streak; try { addXP(10, b); } catch (e) {} save(); } else PS.streak = 0;
      fb.innerHTML = (ok ? '✅ Right! ' : '❌ It was a <b>' + esc(PATTERNS[PS.kind]) + '</b>. ') + '<button class="btn sun" id="ps-next" style="margin-left:6px">Next chart</button>';
      el.querySelector('#ps-streak').textContent = PS.streak; el.querySelector('#ps-next').onclick = () => { newPattern(); spotterGame(el, st); el.scrollIntoView({ block: 'nearest' }); }; }; }); }
  const css2 = document.createElement('style');
  css2.textContent = '#chart-school{display:grid;gap:16px;margin-top:16px}.cs-bar{height:8px;border-radius:99px;background:var(--surface2);overflow:hidden;margin:12px 0}.cs-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--sun),var(--ma))}' +
    '.cs-prog{font-family:var(--f-mono);font-size:14px}.cs-prog b{font-size:22px}.cs-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:8px}' +
    '.cs-item{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:10px 12px;font:inherit;cursor:pointer}.cs-item:hover{border-color:var(--accent)}.cs-item b{display:block;font-size:15px}.cs-item small{display:block;font-size:11px}.cs-item.done{border-color:var(--up)}.cs-ic{font-size:22px}' +
    '.cs-key{font-size:13px;margin:6px 0 0}.cs-body{font-size:16px;line-height:1.55}.cs-body p{margin:10px 0}.cs-qc{margin-top:10px}.cs-opts{display:flex;flex-wrap:wrap;gap:8px}.cs-opts .btn,.cs-ch .btn{white-space:normal;text-align:left}' +
    '.cs .btn.right,.cs-ch .btn.right{border-color:var(--up);background:rgba(30,158,98,.16)}.cs .btn.wrong,.cs-ch .btn.wrong{border-color:var(--down);background:rgba(220,70,70,.14)}.cs-why{font-size:14px;margin:8px 0 0}.cs-ch{display:flex;flex-wrap:wrap;gap:8px}';
  document.head.appendChild(css2);
  window.TT_school = { mount, build, closes, sma, ema, rsi, BLUE };
  const cbox = document.getElementById('chart-school');
  if (cbox) mount(cbox, { key: 'cs', lessons: L, eyebrow: 'Chart School', title: 'Learn to read any chart', blurb: '13 short lessons, from candles to RSI, MACD and chart patterns. Each one has a chart drawn to show the idea and a quick check.', finish: 'You finished Chart School! You can read any chart now.', game: spotterGame });
})();
