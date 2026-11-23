/* success-potion-bottle.js — מסך הצלחה: שִׁיקּוּי קֶסֶם 🧪
   בקבוק שיקוי עגול מזכוכית שקופה (צוואר ארוך, פקק שעם, סרט קשור בפפיון ותווית לב)
   נופל פנימה בקפיצה. הנוזל בפנים מסתחרר ומחליף צבעים לאט בצבעי הערכה, פני הנוזל
   גליים ומתנדנדים, בועות עולות מהר ומהר יותר והבקבוק רועד — ואז הפקק קופץ (מתכווץ
   ומסתובב הרחק) ומהצוואר מתפתל ערפל קשת-בענן נוצץ שמסתלסל ללב זוהר גדול,
   מוקף כוכבים קטנים ונצנצים.
   בסופר: שלושה בקבוקים שונים (בצורת לב, גבוה עם כוכב בראשו, והעגול) נפתחים בזה
   אחר זה, הערפלים שלהם מתפתלים יחד לספירלת קשת גדולה שפורחת ללב וכוכבים עם גשם נצנצים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeIn(x) { x = clamp01(x); return x * x; }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  function sat(c, k) {                                          // push a colour away from grey (jewel-like potion)
    var m = (c[0] + c[1] + c[2]) / 3, o = [];
    for (var i = 0; i < 3; i++) { var v = m + (c[i] - m) * k; o.push(v < 0 ? 0 : v > 255 ? 255 : v); }
    return o;
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function starPath(ctx, x, y, r, rot, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.48) : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  // ─── heart curve, normalised to width 1 and centred (cached once) ───
  function heartRaw(t) {
    var s = Math.sin(t);
    return [16 * s * s * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
  }
  var HCY = 0, HEART_H = 0.9, HEART = [], HALF = [];
  (function () {
    var lo = 1e9, hi = -1e9, i, p;
    for (i = 0; i <= 720; i++) { p = heartRaw(i / 720 * TAU); if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; }
    HCY = (lo + hi) / 2; HEART_H = (hi - lo) / 32;
    for (i = 0; i < 160; i++) { p = heartRaw(i / 160 * TAU); HEART.push([p[0] / 32, (p[1] - HCY) / 32]); }
    // right half, tip → right lobe → notch, resampled to equal arc length (the left half is its mirror)
    var fine = [], L = [0], N = 400;
    for (i = 0; i <= N; i++) {
      p = heartRaw(Math.PI * (1 - i / N)); fine.push([p[0] / 32, (p[1] - HCY) / 32]);
      if (i) { var dx = fine[i][0] - fine[i - 1][0], dy = fine[i][1] - fine[i - 1][1]; L.push(L[i - 1] + Math.sqrt(dx * dx + dy * dy)); }
    }
    var M = 56, k = 0;
    for (i = 0; i <= M; i++) {
      var tg = L[N] * i / M;
      while (k < N - 1 && L[k + 1] < tg) k++;
      var u = clamp01((tg - L[k]) / ((L[k + 1] - L[k]) || 1));
      HALF.push([lerp(fine[k][0], fine[k + 1][0], u), lerp(fine[k][1], fine[k + 1][1], u)]);
    }
  })();
  var HM = HALF.length - 1;
  function heartPathN(ctx, cx, cy, w) {
    ctx.beginPath();
    for (var i = 0; i < HEART.length; i++) {
      var p = HEART[i];
      if (i) ctx.lineTo(cx + p[0] * w, cy + p[1] * w); else ctx.moveTo(cx + p[0] * w, cy + p[1] * w);
    }
    ctx.closePath();
  }

  // ─── flask silhouettes — local units: body radius 1, origin = body centre, y down ───
  var GEO = {
    round: { nw: 0.2,  top: -2.0,  bottom: 1.0,  neckBase: -0.98, level: -0.1,  peak: -0.6,  bowY: -1.26, swirlY: 0.22, bubY: 0.8,  bubX: 0.5,  foamW: 0.75, labelY: 0.32, labelW: 0.6 },
    heart: { nw: 0.18, top: -1.92, bottom: 1.03, neckBase: -0.88, level: -0.26, peak: -0.64, bowY: -1.15, swirlY: 0.05, bubY: 0.55, bubX: 0.45, foamW: 0.85, labelY: 0.12, labelW: 0.5 },
    tall:  { nw: 0.16, top: -2.42, bottom: 1.0,  neckBase: -1.28, level: -0.42, peak: -0.95, bowY: -1.55, swirlY: 0.25, bubY: 0.75, bubX: 0.3,  foamW: 0.42, labelY: 0.36, labelW: 0.44 }
  };
  function roundPath(g) {
    var p = new Path2D(), nw = GEO.round.nw - g, r = 1 - g, top = GEO.round.top;
    var yj = -Math.sqrt(r * r - nw * nw);
    var aL = Math.atan2(yj, -nw) - 0.22, aR = Math.atan2(yj, nw) + 0.22;
    p.moveTo(-nw, top); p.lineTo(-nw, yj - 0.1);
    p.quadraticCurveTo(-nw, yj + 0.01, r * Math.cos(aL), r * Math.sin(aL));
    p.arc(0, 0, r, aL, aR, true);
    p.quadraticCurveTo(nw, yj + 0.01, nw, yj - 0.1);
    p.lineTo(nw, top); p.closePath();
    return p;
  }
  function heartFlaskPath(g) {
    var p = new Path2D(), s = 2.28 - 2 * g, nw = GEO.heart.nw - g, top = GEO.heart.top;
    var t0 = Math.asin(Math.pow(2 * nw / s, 1 / 3));
    p.moveTo(-nw, top);
    for (var i = 0; i <= 110; i++) {
      var tt = (TAU - t0) - (TAU - 2 * t0) * i / 110, q = heartRaw(tt);
      p.lineTo(q[0] / 32 * s, (q[1] - HCY) / 32 * s);
    }
    p.lineTo(nw, top); p.closePath();
    return p;
  }
  function tallPath(g) {
    var p = new Path2D(), nw = GEO.tall.nw - g, hw = 0.64 - g, b = 1 - g, top = GEO.tall.top, sh = -1.28;
    p.moveTo(-nw, top); p.lineTo(-nw, sh);
    p.bezierCurveTo(-nw, -0.95, -hw, -0.78, -hw, 0.12);
    p.bezierCurveTo(-hw, 0.78, -0.34, b, 0, b);
    p.bezierCurveTo(0.34, b, hw, 0.78, hw, 0.12);
    p.bezierCurveTo(hw, -0.78, nw, -0.95, nw, sh);
    p.lineTo(nw, top); p.closePath();
    return p;
  }
  var PATHS = { round: roundPath, heart: heartFlaskPath, tall: tallPath };
  var SURF = [];

  window.SUCCESS.styles.push({
    name: 'potion-bottle',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(primary)) primary = '#C77DFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(accent)) accent = '#FFD27D';
      if (!/^#[0-9a-fA-F]{6}$/.test(glow)) glow = '#7DC4FF';
      if (!/^#[0-9a-fA-F]{6}$/.test(textCol)) textCol = '#FFFFFF';
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';
      var P = rgbOf(primary), A = rgbOf(accent), G = rgbOf(glow);
      var PINK = [255, 120, 190];
      // the potion cycles through these (order chosen so no cross-fade passes through a muddy green/grey)
      var LIQ = [sat(P, 1.35), sat(G, 1.35), sat(PINK, 1.1), sat(mix(A, [255, 160, 70], 0.3), 1.2)];
      var HEART_C = mix(P, [255, 70, 150], 0.62), HEART_LT = mix(HEART_C, WHITE, 0.5), HEART_DK = mix(HEART_C, [110, 0, 60], 0.35);
      var BOW_PINK = mix(P, [255, 96, 168], 0.65);

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── cached sprites (off-DOM) ───
      function mk(n) { var c = document.createElement('canvas'); c.width = c.height = n; return c; }
      var spr = mk(64), sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,240,1)'); sgr.addColorStop(0.2, 'rgba(255,240,190,.8)');
      sgr.addColorStop(0.5, 'rgba(255,215,140,.25)'); sgr.addColorStop(1, 'rgba(255,215,140,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);
      var hueSpr = [];                                            // pastel mist puffs, one per 15° of hue
      for (var hs = 0; hs < 24; hs++) {
        var hc = mk(64), hg = hc.getContext('2d'), hgr = hg.createRadialGradient(32, 32, 0, 32, 32, 32), hh = hs * 15;
        hgr.addColorStop(0, 'hsla(' + hh + ',100%,80%,0.9)'); hgr.addColorStop(0.3, 'hsla(' + hh + ',100%,65%,0.55)');
        hgr.addColorStop(0.65, 'hsla(' + hh + ',95%,58%,0.16)'); hgr.addColorStop(1, 'hsla(' + hh + ',95%,56%,0)');
        hg.fillStyle = hgr; hg.fillRect(0, 0, 64, 64);
        hueSpr.push(hc);
      }
      var hGlow = mk(128), hgc = hGlow.getContext('2d'), hgg = hgc.createRadialGradient(64, 64, 0, 64, 64, 64);
      hgg.addColorStop(0, rgba(HEART_LT, 0.9)); hgg.addColorStop(0.35, rgba(HEART_C, 0.45)); hgg.addColorStop(1, rgba(HEART_C, 0));
      hgc.fillStyle = hgg; hgc.fillRect(0, 0, 128, 128);
      var starSpr = mk(96), ssc = starSpr.getContext('2d'), ssg = ssc.createRadialGradient(40, 40, 3, 48, 50, 42);
      ssg.addColorStop(0, '#FFFBE0'); ssg.addColorStop(0.5, '#FFE066'); ssg.addColorStop(1, '#F5A623');
      ssc.fillStyle = ssg; ssc.strokeStyle = '#D9831A'; ssc.lineWidth = 3.4; ssc.lineJoin = 'round';
      starPath(ssc, 48, 51, 40, 0, 0.5); ssc.fill(); ssc.stroke();
      ssc.fillStyle = 'rgba(255,255,255,.8)'; ssc.beginPath(); ssc.ellipse(40, 38, 8, 3.8, -0.5, 0, TAU); ssc.fill();

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { txt: 0.26, inhale: [0.655, 0.7], bloom: 0.7 }
        : { txt: 0.28, trace: [0.458, 0.655], fill: 0.63, stars: 0.648 };
      function ms(f) { return f * dur; }

      // ─── the flasks ───
      var defs = isSuper
        ? [{ type: 'heart', drop: [0.0, 0.13], build: 0.13, pop: 0.30, phase: 0.0, bow: mix(G, WHITE, 0.1), hue: 320 },
           { type: 'tall',  drop: [0.04, 0.17], build: 0.15, pop: 0.385, phase: 1.3, bow: A, hue: 60 },
           { type: 'round', drop: [0.08, 0.21], build: 0.19, pop: 0.47, phase: 2.6, bow: BOW_PINK, hue: 190 }]
        : [{ type: 'round', drop: [0.0, 0.2], build: 0.17, pop: 0.415, phase: 0, bow: BOW_PINK, hue: 300 }];
      var flasks = defs.map(function (d, i) {
        var F = { type: d.type, geo: GEO[d.type], outer: PATHS[d.type](0), inner: PATHS[d.type](0.055),
                  dropAt: ms(d.drop[0]), dropDur: ms(d.drop[1] - d.drop[0]), buildAt: ms(d.build), popAt: ms(d.pop),
                  phase: d.phase, bow: d.bow, hue: d.hue, dir: (isSuper ? (i === 1 ? 1 : -1) : (Math.random() < 0.5 ? -1 : 1)),
                  spinV: rnd(13, 17), bub: [] };
        var nB = isSuper ? 16 : 22;
        for (var b = 0; b < nB; b++) {
          var u = Math.sqrt((b + Math.random()) / nB), late = b >= nB * 0.8;
          F.bub.push({ s: late ? rnd(F.popAt, F.popAt + 1100) : lerp(F.dropAt + F.dropDur * 0.7, F.popAt + 60, u),
                       x: rnd(-1, 1) * F.geo.bubX, r: rnd(0.025, 0.06), v: late ? 0.0014 : lerp(0.001, 0.0036, u), ph: rnd(0, TAU) });
        }
        // mist poof at the pop + (super) the stream feeding the spiral
        F.poof = [];
        for (var q = 0; q < 9; q++) F.poof.push({ a: -Math.PI / 2 + rnd(-1.25, 1.25), v: rnd(0.9, 1.7), sz: rnd(0.35, 0.6), hue: d.hue + q * 38 });
        F.motes = [];                                           // magic motes rising around the flask as it charges up
        for (var mo = 0; mo < (isSuper ? 7 : 12); mo++)
          F.motes.push({ x: rnd(-1.5, 1.5), ph: Math.random(), sp: rnd(0.7, 1.2), sz: rnd(0.6, 1.2), col: [A, WHITE, G, P][mo % 4] });
        F.stream = [];
        if (isSuper) for (var sI = 0; sI < 62; sI++)
          F.stream.push({ b: F.popAt + 40 + sI * 14 + rnd(0, 8), life: rnd(560, 700), sz: rnd(0.8, 1.25), ph: rnd(0, TAU), hue: d.hue + sI * 6 });
        return F;
      });
      // normal: the rising mist column between the neck and the heart's tip
      var column = [];
      if (!isSuper) {
        for (var ci = 0; ci < 60; ci++)
          column.push({ b: flasks[0].popAt + ci * 15 + rnd(0, 10), life: rnd(700, 950), ph: rnd(0, TAU),
                        sw: rnd(0.5, 1.2) * (ci % 2 ? 1 : -1), sz: rnd(0.8, 1.25), hue: ci * 27, over: rnd(0, 1), ex: rnd(-0.3, 0.3) });
      }
      // normal: mist wisps shed by the two stream heads, curling away as they fade
      var wisps = [];
      if (!isSuper) {
        for (var wi = 0; wi < 52; wi++)
          wisps.push({ e: (Math.floor(wi / 2) + rnd(0, 0.6)) / 26 * 0.96, sd: wi % 2 ? -1 : 1, life: rnd(600, 850),
                       dr: rnd(0.6, 1.2), curl: rnd(0.8, 1.8) * (Math.random() < 0.5 ? -1 : 1), sz: rnd(0.8, 1.2), sp: wi % 3 === 0 });
      }
      // stars around the heart: [angle°, radius factor, size factor of heart width]
      var RING = isSuper
        ? [[-32, 1.0, 0.07], [212, 1.0, 0.07], [-4, 1.1, 0.056], [184, 1.1, 0.056], [24, 1.0, 0.072],
           [156, 1.0, 0.072], [52, 1.08, 0.052], [128, 1.08, 0.052], [78, 1.14, 0.044], [102, 1.14, 0.044]]
        : [[-36, 1.0, 0.082], [216, 1.0, 0.082], [-4, 1.1, 0.064], [184, 1.1, 0.064],
           [28, 1.0, 0.074], [152, 1.0, 0.074], [60, 1.08, 0.054], [120, 1.08, 0.054]];
      var sparks = [];
      for (var sp0 = 0; sp0 < (isSuper ? 18 : 14); sp0++)
        sparks.push({ a: rnd(-0.6, 3.75), r: rnd(0.62, 1.2), ph: rnd(0, TAU), rate: rnd(5, 9), sz: rnd(0.02, 0.04),
                      col: sp0 % 3 === 0 ? A : sp0 % 3 === 1 ? WHITE : G });
      var glitter = [];
      for (var gl = 0; gl < (isSuper ? 80 : 26); gl++)
        glitter.push({ x: Math.random(), y0: isSuper ? rnd(-0.12, 0.3) : rnd(-0.4, 0.4), sp: isSuper ? rnd(0.2, 0.42) : rnd(0.06, 0.14),
                       delay: rnd(0, isSuper ? 600 : 300), rot: rnd(0, TAU), vr: rnd(-5, 5), sz: rnd(0.6, 1.4), ph: rnd(0, TAU), fl: rnd(0.6, 1.6),
                       col: [A, WHITE, P, G, PINK][gl % 5] });
      var bgStars = [];
      for (var bs = 0; bs < 18; bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.75, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bs % 3 === 0 ? G : bs % 5 === 0 ? A : WHITE });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + rgba(P, 0.95) + ',0 0 46px ' + rgba(G, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + ' + (isSuper ? '9.5%' : '8%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + rgba(A, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── layout (recomputed every frame so resize just works) ───
      // The heart sits below a SAFE LINE = bottom of the "+N ⭐" line (same CSS maths as ptsEl) + a clear gap.
      // E = how far (× heart width) the rainbow rim glow, the bloom overshoot and the ring stars reach above
      // the heart's own box, so even those never touch the points line.
      var E_TOP = 0.12;
      function layout() {
        var o = { floor: H * 0.962 }, hh, bottomLimit, capW, capH;
        var ptsFont = Math.max(20, Math.min(34, W * 0.035));
        o.safeTop = H * (isSuper ? 0.225 : 0.21) + ptsFont * 0.62 + (isSuper ? 18 : 22);
        if (!isSuper) {
          var R = Math.min(H * 0.13, W * 0.2);
          o.R = [R]; o.x = [W / 2];
          bottomLimit = o.floor - R * 3.24; capW = W * 0.72 * HEART_H; capH = H * 0.34;
        } else {
          var Rc = Math.min(H * 0.12, W * 0.135), off = Math.min(W * 0.31, Rc * 3.3);
          o.R = [Rc * 0.86, Rc * 0.86, Rc]; o.x = [W / 2 - off, W / 2 + off, W / 2];
          bottomLimit = o.floor - Rc * 2.75; capW = W * 0.74 * HEART_H; capH = H * 0.4;
        }
        hh = (bottomLimit - o.safeTop) / (1 + E_TOP / HEART_H);
        hh = Math.max(H * 0.12, Math.min(hh, capW, capH));
        var w = hh / HEART_H, top = o.safeTop + E_TOP * w, extra = bottomLimit - (top + hh);
        if (extra > 0) top += extra * 0.4;                        // tall phone screens: settle a little lower
        o.hh = hh; o.hw = w; o.hx = W / 2; o.hy = top + hh / 2;
        return o;
      }
      function belowSafe(y, r) {                                  // soft fade for mist drifting up toward the text
        return clamp01((y - r * 0.45 - Lay.safeTop) / (r * 0.6 + 12));
      }

      // ─── drawing helpers ───
      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function puff(x, y, r, hue, a) {
        if (a <= 0.004 || r <= 0.5) return;
        var i = ((Math.round(hue / 15) % 24) + 24) % 24;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(hueSpr[i], x - r, y - r, r * 2, r * 2);
      }
      function drawStarSpr(x, y, r, rot, a) {
        if (a <= 0 || r <= 0) return;
        ctx.save(); ctx.globalAlpha *= a > 1 ? 1 : a;
        ctx.translate(x, y); ctx.rotate(rot);
        var k = r / 40; ctx.drawImage(starSpr, -48 * k, -51 * k, 96 * k, 96 * k);
        ctx.restore();
      }
      function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function liqCol(t, ph) {
        var c = t / 1000 + ph, i = Math.floor(c), f = smooth((c - i - 0.45) / 0.55), n = LIQ.length;
        return mix(LIQ[((i % n) + n) % n], LIQ[(((i + 1) % n) + n) % n], f);
      }
      function dropCurve(q) {                      // 1 = high above … 0 = resting; two little bounces
        if (q < 0.55) { var u = q / 0.55; return 1 - u * u; }
        if (q < 0.82) { var v = (q - 0.55) / 0.27; return 0.08 * 4 * v * (1 - v); }
        if (q < 1) { var w = (q - 0.82) / 0.18; return 0.022 * 4 * w * (1 - w); }
        return 0;
      }
      var IMPACTS = [[0.55, 0.2], [0.82, 0.08], [1.0, 0.035]];

      // pure function of time → everything about one flask this frame
      function flaskState(F, t, Lay, i) {
        var age = t - F.dropAt;
        if (age < 0) return null;
        var g = F.geo, R = Lay.R[i], st = { R: R, px: Lay.x[i] };
        var q = clamp01(age / F.dropDur);
        st.drop = dropCurve(q);
        st.py = Lay.floor - st.drop * (Lay.floor + R * 4);
        var sq = 0;
        for (var k = 0; k < IMPACTS.length; k++) {
          var ia = age - IMPACTS[k][0] * F.dropDur;
          if (ia >= 0) sq += IMPACTS[k][1] * Math.exp(-ia / 75) * Math.cos(ia * 0.045);
        }
        var landA = age - 0.55 * F.dropDur;
        var span = Math.max(1, F.popAt - F.buildAt), tau = clamp01((t - F.buildAt) / span);
        st.pr = tau; st.pr2 = tau * tau;
        st.popped = t >= F.popAt; st.pa = t - F.popAt;
        function preRot(tt) {
          var u = clamp01((tt - F.buildAt) / span), uu = u * u, ta = Math.max(0, tt - F.buildAt);
          var ph = 0.011 * ta + 0.012 * ta * ta / span;
          return (0.11 * uu + 0.02 * u) * Math.sin(ph) + (u > 0.8 ? 0.018 * Math.sin(tt * 0.11) * (u - 0.8) * 5 : 0);
        }
        var sx = 1, sy = 1;
        if (!st.popped) {
          st.rot = preRot(t);
          var inh = clamp01((t - (F.popAt - 170)) / 170);
          sy = 1 + 0.035 * st.pr2 * (0.5 + 0.5 * Math.sin(t * 0.05)) + 0.06 * inh;
          sx = 1 - 0.02 * st.pr2 - 0.035 * inh;
          st.lvl = lerp(g.level, g.peak, easeIn(tau));
          st.flash = 0;
        } else {
          var pa = st.pa, r0 = preRot(F.popAt);
          st.rot = r0 * Math.exp(-pa / 260) * Math.cos(pa * 0.016) + 0.02 * Math.sin(t * 0.003);
          var rc = 0.15 * Math.exp(-pa / 120) * Math.cos(pa * 0.028);
          sy = 1 - rc; sx = 1 + rc * 0.7;
          st.lvl = lerp(g.peak, g.level - 0.05, easeOut(pa / 420));
          st.flash = Math.exp(-pa / 260);
        }
        sy -= sq; sx += sq * 0.8;
        st.sx = sx; st.sy = sy;
        st.tilt = -Math.tan(st.rot) * 0.9 +
          (landA > 0 ? 0.22 * Math.exp(-landA / 260) * Math.sin(landA * 0.02) : 0) +
          (st.popped ? 0.32 * Math.exp(-st.pa / 380) * Math.sin(st.pa * 0.013) : 0);
        st.wave = 0.02 + 0.045 * st.pr2 + (landA > 0 ? 0.06 * Math.exp(-landA / 300) : 0) + (st.popped ? 0.07 * Math.exp(-st.pa / 450) : 0);
        st.spin = t * 0.0028 + 2.4 * st.pr2;
        st.cA = liqCol(t, F.phase); st.cB = liqCol(t, F.phase + 1.4);
        // cork: pushed up + squashed just before the pop
        var qc = clamp01((t - (F.popAt - 170)) / 170);
        st.corkLift = 0.13 * easeIn(qc); st.corkSx = 1 + 0.17 * qc; st.corkSy = 1 - 0.15 * qc;
        st.corkJit = 0.012 * Math.sin(t * 0.21) * st.pr2;
        return st;
      }
      function L2W(F, st, lx, ly) {
        var x = lx * st.sx * st.R, y = (ly - F.geo.bottom) * st.sy * st.R, c = Math.cos(st.rot), s = Math.sin(st.rot);
        return [st.px + x * c - y * s, st.py + x * s + y * c];
      }

      // ─── flask art (local units) ───
      function corkArt(nw, topper) {
        var hb = nw - 0.035, ht = nw + 0.075, h = 0.44, y0 = -h / 2, y1 = h / 2;
        if (topper) {
          ctx.strokeStyle = '#E2A63C'; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(0, y0 - 0.17); ctx.stroke();
          drawStarSpr(0, y0 - 0.4, 0.3, 0, 1);
        }
        ctx.beginPath();
        ctx.moveTo(-ht, y0 + 0.05); ctx.quadraticCurveTo(-ht, y0, -ht + 0.05, y0);
        ctx.lineTo(ht - 0.05, y0); ctx.quadraticCurveTo(ht, y0, ht, y0 + 0.05);
        ctx.lineTo(hb, y1 - 0.02); ctx.quadraticCurveTo(hb, y1, hb - 0.02, y1);
        ctx.lineTo(-hb + 0.02, y1); ctx.quadraticCurveTo(-hb, y1, -hb, y1 - 0.02); ctx.closePath();
        var cg = ctx.createLinearGradient(-ht, 0, ht, 0);
        cg.addColorStop(0, '#A86A35'); cg.addColorStop(0.35, '#E8B985'); cg.addColorStop(0.7, '#CF955A'); cg.addColorStop(1, '#93582A');
        ctx.fillStyle = cg; ctx.fill();
        ctx.strokeStyle = '#6E4220'; ctx.lineWidth = 0.022; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, y0 + 0.012, Math.max(0.01, ht - 0.025), 0.045, 0, 0, TAU); ctx.fillStyle = '#F2D2A2'; ctx.fill();
        ctx.fillStyle = 'rgba(110,62,28,.5)';
        var pores = [[-0.5, 0.25], [0.3, 0.38], [-0.1, 0.62], [0.55, 0.7], [-0.6, 0.85], [0.15, 0.9]];
        for (var i = 0; i < pores.length; i++) {
          ctx.beginPath(); ctx.arc(pores[i][0] * hb, y0 + 0.08 + pores[i][1] * (h - 0.14), 0.017, 0, TAU); ctx.fill();
        }
      }
      function heartLabel(y, w) {
        ctx.save(); ctx.translate(0, y); ctx.rotate(-0.06);
        heartPathN(ctx, 0, 0, w); ctx.fillStyle = '#FFF5E8'; ctx.fill();
        ctx.lineWidth = 0.03; ctx.strokeStyle = '#E9B44C'; ctx.stroke();
        heartPathN(ctx, 0, 0, w * 0.8); ctx.setLineDash([0.035, 0.03]); ctx.lineWidth = 0.014;
        ctx.strokeStyle = 'rgba(225,160,60,.8)'; ctx.stroke(); ctx.setLineDash([]);
        heartPathN(ctx, 0, w * 0.01, w * 0.5);
        var g = ctx.createLinearGradient(0, -w * 0.25, 0, w * 0.25); g.addColorStop(0, '#FF9BCB'); g.addColorStop(1, '#E2397F');
        ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.ellipse(-w * 0.1, -w * 0.07, w * 0.055, w * 0.03, -0.6, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function starLabel(y, w) {
        ctx.save(); ctx.translate(0, y);
        ctx.beginPath(); ctx.arc(0, 0, w * 0.5, 0, TAU); ctx.fillStyle = '#FFF5E8'; ctx.fill();
        ctx.lineWidth = 0.03; ctx.strokeStyle = '#E9B44C'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, w * 0.41, 0, TAU); ctx.setLineDash([0.035, 0.03]); ctx.lineWidth = 0.014;
        ctx.strokeStyle = 'rgba(225,160,60,.8)'; ctx.stroke(); ctx.setLineDash([]);
        drawStarSpr(0, 0.01, w * 0.3, 0, 1);
        ctx.restore();
      }
      function bowArt(y, nw, c, sway) {
        var dk = mix(c, [70, 10, 50], 0.42), lt = mix(c, WHITE, 0.5);
        ctx.save(); ctx.translate(0, y);
        ctx.fillStyle = rgba(mix(c, dk, 0.15), 1);
        ctx.fillRect(-nw - 0.012, -0.045, 2 * nw + 0.024, 0.09);
        var sd;
        for (sd = -1; sd <= 1; sd += 2) {                      // tails
          ctx.save(); ctx.rotate(sway * (1 + 0.4 * sd));
          ctx.beginPath();
          ctx.moveTo(sd * -0.02, 0.02); ctx.lineTo(sd * 0.07, -0.01);
          ctx.quadraticCurveTo(sd * 0.2, 0.18, sd * 0.29, 0.38);
          ctx.lineTo(sd * 0.185, 0.33); ctx.lineTo(sd * 0.12, 0.44);
          ctx.quadraticCurveTo(sd * 0.07, 0.2, sd * -0.02, 0.02);
          ctx.closePath();
          ctx.fillStyle = rgba(mix(c, dk, 0.22), 1); ctx.fill();
          ctx.strokeStyle = rgba(dk, 1); ctx.lineWidth = 0.02; ctx.stroke();
          ctx.restore();
        }
        var lg = ctx.createLinearGradient(0, -0.26, 0, 0.12);
        lg.addColorStop(0, rgba(lt, 1)); lg.addColorStop(0.5, rgba(c, 1)); lg.addColorStop(1, rgba(mix(c, dk, 0.4), 1));
        for (sd = -1; sd <= 1; sd += 2) {                      // loops
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(sd * 0.1, -0.25, sd * 0.45, -0.28, sd * 0.42, -0.04);
          ctx.bezierCurveTo(sd * 0.41, 0.12, sd * 0.14, 0.1, 0, 0);
          ctx.closePath();
          ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = rgba(dk, 1); ctx.lineWidth = 0.02; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sd * 0.06, -0.01); ctx.quadraticCurveTo(sd * 0.22, -0.1, sd * 0.33, -0.04);
          ctx.strokeStyle = rgba(dk, 0.5); ctx.lineWidth = 0.018; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sd * 0.16, -0.17); ctx.quadraticCurveTo(sd * 0.3, -0.21, sd * 0.37, -0.12);
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.025; ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(0, 0, 0.08, 0.075, 0, 0, TAU);
        ctx.fillStyle = rgba(c, 1); ctx.fill(); ctx.strokeStyle = rgba(dk, 1); ctx.lineWidth = 0.02; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.ellipse(-0.02, -0.025, 0.03, 0.017, -0.4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function surfY(st, i, x, t, F) {
        return st.lvl + st.tilt * x + st.wave * (0.6 * Math.sin(x * 4.4 + t * 0.009 + F.phase * 3) + 0.4 * Math.sin(x * 8.1 - t * 0.014 + F.phase));
      }

      function drawFlaskGlow(F, st) {
        var R = st.R, c = L2W(F, st, 0, F.type === 'tall' ? 0.2 : 0), cA = st.cA;
        ctx.globalCompositeOperation = 'lighter';
        var hr = R * (1.9 + 0.4 * st.pr2 + 0.9 * st.flash);
        var g = ctx.createRadialGradient(c[0], c[1], R * 0.2, c[0], c[1], hr);
        g.addColorStop(0, rgba(cA, 0.26 + 0.2 * st.pr2 + 0.3 * st.flash)); g.addColorStop(1, rgba(cA, 0));
        ctx.fillStyle = g; ctx.fillRect(c[0] - hr, c[1] - hr, hr * 2, hr * 2);
        var on = 1 - clamp01(st.drop * 3);
        var ma = on * (0.25 + 0.75 * st.pr) * (st.popped ? Math.max(0.35, Math.exp(-st.pa / 500)) : 1);
        if (ma > 0.01) {
          var c0 = L2W(F, st, 0, 0);
          for (var k = 0; k < F.motes.length; k++) {
            var mt = F.motes[k], u = (Lay.tSec * mt.sp * (0.5 + st.pr) + mt.ph) % 1;
            var mx = c0[0] + mt.x * R + Math.sin(u * 7 + k) * R * 0.12, my = c0[1] + R * (1 - u * 3.2);
            var tw = Math.sin(u * Math.PI);
            ctx.fillStyle = rgba(mt.col, ma * tw * 0.9);
            sparkPath(ctx, mx, my, R * 0.06 * mt.sz * (0.5 + 0.5 * tw)); ctx.fill();
          }
        }
        if (on > 0) {
          ctx.save(); ctx.translate(st.px, Lay.floor + R * 0.03); ctx.scale(1, 0.17);
          var pr = R * 1.6;
          var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, pr);
          g2.addColorStop(0, rgba(mix(cA, WHITE, 0.3), 0.5 * on)); g2.addColorStop(1, rgba(cA, 0));
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, pr, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      function drawFlask(F, st, t) {
        var g = F.geo, R = st.R, cA = st.cA, cB = st.cB, i, k;
        ctx.save();
        ctx.translate(st.px, st.py); ctx.rotate(st.rot); ctx.scale(st.sx * R, st.sy * R); ctx.translate(0, -g.bottom);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // glass back wall
        ctx.fillStyle = 'rgba(190,225,255,0.07)'; ctx.fill(F.outer);
        // ── the potion ──
        ctx.save(); ctx.clip(F.inner);
        ctx.beginPath();
        for (i = 0; i <= 26; i++) {
          var x = -1.3 + i * 0.1, y = surfY(st, i, x, t, F);
          SURF[i] = y;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.lineTo(1.3, 1.5); ctx.lineTo(-1.3, 1.5); ctx.closePath();
        var lg = ctx.createLinearGradient(0, st.lvl - 0.1, 0, g.bottom);
        lg.addColorStop(0, rgba(mix(cA, WHITE, 0.18), 0.95));
        lg.addColorStop(0.42, rgba(cA, 0.93));
        lg.addColorStop(1, rgba(mix(cB, BLACK, 0.22), 0.96));
        ctx.fillStyle = lg; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        var rg = ctx.createRadialGradient(0, g.swirlY, 0, 0, g.swirlY, 0.95);
        rg.addColorStop(0, rgba(cA, 0.16 + 0.22 * st.pr2 + 0.25 * st.flash)); rg.addColorStop(1, rgba(cA, 0));
        ctx.fillStyle = rg; ctx.fillRect(-1.3, -2.6, 2.6, 4.2);
        // swirl ribbons
        ctx.lineWidth = 0.06; ctx.strokeStyle = rgba(mix(cB, WHITE, 0.45), 0.28);
        for (k = 0; k < 3; k++) {
          ctx.beginPath();
          for (var j = 0; j <= 16; j++) {
            var u = j / 16, th = st.spin + k * TAU / 3 + u * 3.8, r = 0.05 + 0.7 * u;
            var sx = Math.cos(th) * r, sy = g.swirlY + Math.sin(th) * r * 0.6;
            if (j) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
          }
          ctx.stroke();
        }
        // glitter swirling in the potion
        for (k = 0; k < 7; k++) {
          var th2 = st.spin * 1.3 + k * 0.9, r2 = 0.15 + (k % 4) * 0.15, tw = 0.5 + 0.5 * Math.sin(t * 0.012 + k * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * tw).toFixed(3) + ')';
          sparkPath(ctx, Math.cos(th2) * r2, g.swirlY + Math.sin(th2) * r2 * 0.6, 0.045 + 0.04 * tw); ctx.fill();
        }
        // bubbles, faster and faster
        ctx.lineWidth = 0.014;
        for (k = 0; k < F.bub.length; k++) {
          var B = F.bub[k], ba = t - B.s;
          if (ba <= 0) continue;
          var by = g.bubY - ba * B.v, bx = B.x + Math.sin(ba * 0.012 + B.ph) * 0.035;
          var surfAt = SURF[Math.max(0, Math.min(26, Math.round((bx + 1.3) * 10)))];
          if (by < surfAt + B.r * 0.5) continue;
          ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.arc(bx, by, B.r, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.arc(bx - B.r * 0.35, by - B.r * 0.35, B.r * 0.28, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        // meniscus
        ctx.beginPath();
        for (i = 0; i <= 26; i++) { if (i) ctx.lineTo(-1.3 + i * 0.1, SURF[i]); else ctx.moveTo(-1.3, SURF[0]); }
        ctx.strokeStyle = rgba(mix(cA, WHITE, 0.75), 0.85); ctx.lineWidth = 0.04; ctx.stroke();
        // foam builds up on the surface before the pop
        var nf = st.popped ? Math.round(14 * Math.max(0, 1 - st.pa / 350)) : Math.round(2 + 12 * st.pr2);
        if (nf > 1) {
          ctx.fillStyle = rgba(mix(cA, WHITE, 0.72), 0.85);
          for (k = 0; k < nf; k++) {
            var fx = (k / (nf - 1) - 0.5) * 2 * g.foamW + Math.sin(k * 7.3) * 0.04;
            var fr = 0.035 + 0.025 * ((k * 5) % 3) / 2;
            var fy = SURF[Math.max(0, Math.min(26, Math.round((fx + 1.3) * 10)))] - fr * 0.25 + Math.sin(t * 0.02 + k) * 0.01;
            ctx.beginPath(); ctx.arc(fx, fy, fr, 0, TAU); ctx.fill();
          }
        }
        // a few bubbles race up the neck right before the pop
        if (!st.popped && st.pr > 0.62) {
          var na = clamp01((st.pr - 0.62) / 0.38);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * na).toFixed(3) + ')'; ctx.lineWidth = 0.016;
          ctx.fillStyle = rgba(mix(cA, WHITE, 0.6), 0.5 * na);
          for (k = 0; k < 5; k++) {
            var ph = ((t * 0.0042 + k / 5) % 1);
            var ny = lerp(g.neckBase + 0.05, g.top + 0.1, ph), nx = Math.sin(t * 0.03 + k * 2) * 0.05;
            ctx.beginPath(); ctx.arc(nx, ny, 0.035 + 0.012 * (k % 2), 0, TAU); ctx.fill(); ctx.stroke();
          }
        }
        ctx.restore();
        // glass sheen over the potion
        var gs = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1.35);
        gs.addColorStop(0, 'rgba(255,255,255,0.12)'); gs.addColorStop(0.55, 'rgba(255,255,255,0)'); gs.addColorStop(1, 'rgba(170,215,255,0.16)');
        ctx.fillStyle = gs; ctx.fill(F.outer);
        // cork (its plug part shows through the glass)
        if (!st.popped) {
          ctx.save(); ctx.translate(st.corkJit, g.top - 0.06 - st.corkLift); ctx.scale(st.corkSx, st.corkSy);
          corkArt(g.nw, F.type === 'tall'); ctx.restore();
        }
        // label
        if (F.type === 'heart') starLabel(g.labelY, g.labelW); else heartLabel(g.labelY, g.labelW);
        // glass outline + rim highlights
        var nw = g.nw;
        ctx.lineWidth = 0.1; ctx.strokeStyle = 'rgba(160,205,255,0.16)'; ctx.stroke(F.outer);
        ctx.lineWidth = 0.032; ctx.strokeStyle = 'rgba(232,246,255,0.72)'; ctx.stroke(F.outer);
        ctx.lineWidth = 0.016; ctx.strokeStyle = 'rgba(232,246,255,0.22)'; ctx.stroke(F.inner);
        rrect(-nw - 0.055, g.top - 0.075, 2 * nw + 0.11, 0.15, 0.06);
        ctx.fillStyle = 'rgba(215,238,255,0.25)'; ctx.fill();
        ctx.strokeStyle = 'rgba(240,250,255,0.85)'; ctx.lineWidth = 0.028; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.045;
        ctx.beginPath(); ctx.moveTo(-nw + 0.07, g.top + 0.16); ctx.lineTo(-nw + 0.07, g.neckBase - 0.12); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(nw - 0.05, g.top + 0.22); ctx.lineTo(nw - 0.05, g.neckBase - 0.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.62)'; ctx.lineWidth = 0.1;
        var gx, gy;
        if (F.type === 'round') {
          ctx.beginPath(); ctx.arc(0, 0, 0.8, Math.PI * 1.06, Math.PI * 1.36); ctx.stroke();
          ctx.lineWidth = 0.07; ctx.beginPath(); ctx.arc(0, 0, 0.8, Math.PI * 1.42, Math.PI * 1.48); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.arc(0, 0, 0.88, Math.PI * 0.08, Math.PI * 0.4); ctx.stroke();
          gx = Math.cos(Math.PI * 1.25) * 0.8; gy = Math.sin(Math.PI * 1.25) * 0.8;
        } else if (F.type === 'heart') {
          ctx.beginPath();
          for (i = 0; i <= 14; i++) {
            var hq = heartRaw(4.3 + i / 14 * 0.95), hx2 = hq[0] / 32 * 2.28 * 0.8, hy2 = (hq[1] - HCY) / 32 * 2.28 * 0.8;
            if (i) ctx.lineTo(hx2, hy2); else ctx.moveTo(hx2, hy2);
          }
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.moveTo(0.78, -0.05); ctx.quadraticCurveTo(0.6, 0.4, 0.2, 0.72); ctx.stroke();
          gx = -0.72; gy = -0.6;
        } else {
          ctx.beginPath(); ctx.moveTo(-0.36, -0.48); ctx.bezierCurveTo(-0.52, -0.2, -0.52, 0.3, -0.36, 0.62); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.045;
          ctx.beginPath(); ctx.moveTo(0.48, 0.2); ctx.bezierCurveTo(0.5, 0.5, 0.36, 0.78, 0.18, 0.86); ctx.stroke();
          gx = -0.44; gy = -0.1;
        }
        var gtw = Math.pow(0.5 + 0.5 * Math.sin(t * 0.006 + F.phase * 2), 3);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * gtw).toFixed(3) + ')';
        sparkPath(ctx, gx, gy, 0.08 + 0.1 * gtw); ctx.fill();
        // ribbon bow
        bowArt(g.bowY, nw, F.bow, -st.rot * 0.8 + 0.06 * Math.sin(t * 0.006 + F.phase));
        ctx.restore();
      }

      function drawFlyingCork(F, t, Lay, i) {
        var pa = t - F.popAt;
        if (pa < 0 || pa > 750) return;
        var s0 = flaskState(F, F.popAt, Lay, i);
        if (!s0) return;
        var R = s0.R, m = L2W(F, s0, 0, F.geo.top - 0.2), sec = pa / 1000;
        var x = m[0] + F.dir * 5.2 * R * sec, y = m[1] - 11 * R * sec + 0.5 * 30 * R * sec * sec;
        var a = 1 - clamp01((pa - 420) / 330);
        var st = clamp01(pa / 110), sxx = lerp(0.85, 1, st), syy = lerp(1.3, 1, st), sc = 1 - 0.2 * sec;
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(x, y); ctx.rotate(s0.rot + F.dir * F.spinV * sec); ctx.scale(R * sxx * sc, R * syy * sc);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        corkArt(F.geo.nw, F.type === 'tall');
        ctx.restore();
      }

      function drawPopFlash(F, st, t) {
        var pa = t - F.popAt;
        if (pa < 0 || pa > 460) return;
        var q = pa / 460, R = st.R, m = L2W(F, st, 0, F.geo.top - 0.08), e = easeOut(q), iq = 1 - q;
        ctx.globalCompositeOperation = 'lighter';
        glowDot(m[0], m[1], R * (0.6 + 1.1 * e), 0.9 * iq * iq);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * iq * iq).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1.2, 3 * unit * iq);
        ctx.beginPath(); ctx.ellipse(m[0], m[1], R * (0.2 + 1.0 * e), R * (0.12 + 0.6 * e), 0, 0, TAU); ctx.stroke();
        for (var k = 0; k < 9; k++) {                        // a spray of sparkles out of the neck
          var a = -Math.PI / 2 + (k - 4) * 0.36, r1 = R * (0.2 + (1.1 + 0.25 * (k % 3)) * e);
          ctx.fillStyle = k % 2 ? rgba(A, iq) : 'rgba(255,255,255,' + iq.toFixed(3) + ')';
          sparkPath(ctx, m[0] + Math.cos(a) * r1, m[1] + Math.sin(a) * r1 * 1.1, R * (0.06 + 0.05 * (k % 2)) * (0.4 + iq)); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // the mist "poof" right out of the neck
      function drawPoof(F, st, t) {
        var pa = t - F.popAt;
        if (pa < 0 || pa > 900) return;
        var R = st.R, m = L2W(F, st, 0, F.geo.top - 0.05);
        for (var k = 0; k < F.poof.length; k++) {
          var p = F.poof[k], q = pa / 900, d = easeOut(q) * R * 1.1 * p.v;
          var px = m[0] + Math.cos(p.a) * d, py = m[1] + Math.sin(p.a) * d * 0.8 - easeOut(q) * R * 0.35, pr = R * (0.25 + p.sz * easeOut(q) * 1.1);
          puff(px, py, pr, p.hue + t * 0.12, 0.5 * clamp01(pa / 60) * (1 - q) * (1 - q) * belowSafe(py, pr));
        }
      }

      function heartBeat(t, at) {
        var tau = t - at;
        if (tau <= 0) return 1;
        var m = tau % 950;
        return 1 + 0.055 * Math.exp(-Math.pow((m - 90) / 55, 2)) + 0.035 * Math.exp(-Math.pow((m - 270) / 55, 2));
      }
      function drawHeartBody(cx, cy, w, a) {
        if (a <= 0 || w <= 1) return;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * a; ctx.drawImage(hGlow, cx - w * 1.15, cy - w * 1.05, w * 2.3, w * 2.3); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.globalAlpha = a > 1 ? 1 : a;
        heartPathN(ctx, cx, cy, w);
        var g = ctx.createRadialGradient(cx - w * 0.16, cy - w * 0.18, w * 0.02, cx, cy, w * 0.62);
        g.addColorStop(0, '#FFF3FA'); g.addColorStop(0.3, rgba(HEART_LT, 1)); g.addColorStop(0.72, rgba(HEART_C, 1)); g.addColorStop(1, rgba(HEART_DK, 1));
        ctx.fillStyle = g; ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, w * 0.014); ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.78)';
        ctx.beginPath(); ctx.ellipse(cx - w * 0.24, cy - w * 0.2, w * 0.1, w * 0.048, -0.75, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - w * 0.12, cy - w * 0.29, w * 0.022, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.ellipse(cx + w * 0.2, cy + w * 0.12, w * 0.06, w * 0.025, -0.9, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // shimmering rainbow mist along the heart outline, traced from the tip around both lobes (p 0…1)
      function drawRim(cx, cy, w, p, t, a, headBoost) {
        if (p <= 0 || a <= 0) return;
        var jp = p * HM, jn = Math.min(HM, Math.floor(jp));
        ctx.globalCompositeOperation = 'lighter';
        for (var sd = -1; sd <= 1; sd += 2) {
          for (var j = 0; j <= jn; j++) {
            var q = HALF[j];
            var x = cx + sd * q[0] * w + Math.sin(t * 0.006 + j * 1.7 + sd) * w * 0.012;
            var y = cy + q[1] * w + Math.cos(t * 0.005 + j * 2.3) * w * 0.012;
            var pos = sd > 0 ? j / HM * 0.5 : 1 - j / HM * 0.5;
            var head = headBoost * clamp01(1 - (jp - j) / 6);
            var r = w * (0.1 + 0.035 * Math.sin(t * 0.007 + j * 1.3)) * (1 + head * 0.8);
            var tipFade = 0.45 + 0.55 * clamp01(j / 9);            // both sides overlap near the tip
            puff(x, y, r, pos * 360 + t * 0.15, a * tipFade * (0.3 + 0.35 * head) * (0.8 + 0.2 * Math.sin(t * 0.01 + j)));
            if (j % 3 === 1) puff(x + sd * q[0] * w * 0.12, y + q[1] * w * 0.12, w * 0.22, pos * 360 + t * 0.15 + 20, a * tipFade * 0.13);
          }
        }
        ctx.globalAlpha = 1;
        // crisp bright thread along the traced part
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (var pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? 'rgba(255,255,255,' + (0.7 * a).toFixed(3) + ')' : 'rgba(255,240,250,' + (0.16 * a).toFixed(3) + ')';
          ctx.lineWidth = pass ? Math.max(1.4, w * 0.011) : Math.max(4, w * 0.05);
          for (sd = -1; sd <= 1; sd += 2) {
            ctx.beginPath(); ctx.moveTo(cx, cy + HALF[0][1] * w);
            for (j = 1; j <= jn; j++) ctx.lineTo(cx + sd * HALF[j][0] * w, cy + HALF[j][1] * w);
            if (jn < HM) {
              var f = jp - jn, A0 = HALF[jn], A1 = HALF[jn + 1];
              ctx.lineTo(cx + sd * lerp(A0[0], A1[0], f) * w, cy + lerp(A0[1], A1[1], f) * w);
            }
            ctx.stroke();
          }
        }
        // sparkles curling around the two stream heads
        if (headBoost > 0 && p < 1) {
          var hj = Math.min(HM, jp), h0 = HALF[Math.floor(hj)], h1 = HALF[Math.min(HM, Math.floor(hj) + 1)], hf = hj - Math.floor(hj);
          for (sd = -1; sd <= 1; sd += 2) {
            var hx = cx + sd * lerp(h0[0], h1[0], hf) * w, hy = cy + lerp(h0[1], h1[1], hf) * w;
            glowDot(hx, hy, w * 0.12, 0.8 * a);
            for (var k = 0; k < 4; k++) {
              var an = t * 0.018 * sd + k * TAU / 4, rr = w * (0.04 + 0.015 * k);
              var spx = hx + Math.cos(an) * rr, spy = hy + Math.sin(an) * rr, sa2 = a * belowSafe(spy, w * 0.036);
              ctx.fillStyle = k % 2 ? rgba(A, sa2) : 'rgba(255,255,255,' + sa2.toFixed(3) + ')';
              sparkPath(ctx, spx, spy, w * 0.018 * (1 + (k % 2))); ctx.fill();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawWisps(cx, cy, w, t) {
        var tr0 = ms(T.trace[0]), tr1 = ms(T.trace[1]);
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 0; k < wisps.length; k++) {
          var ws = wisps[k], te = lerp(tr0, tr1, ws.e), age = t - te;
          if (age <= 0 || age >= ws.life) continue;
          var jp = easeInOut(ws.e) * HM, j0 = Math.min(HM - 1, Math.floor(jp)), f = jp - j0;
          var px = ws.sd * lerp(HALF[j0][0], HALF[j0 + 1][0], f), py = lerp(HALF[j0][1], HALF[j0 + 1][1], f);
          var nl = Math.sqrt(px * px + py * py) || 1, u = age / ws.life, eu = easeOut(u);
          var an = Math.atan2(py / nl, px / nl) + ws.curl * eu * 1.6, d = w * 0.2 * ws.dr * eu;
          var x = cx + px * w + Math.cos(an) * d, y = cy + py * w + Math.sin(an) * d - w * 0.12 * eu;
          var pos = ws.sd > 0 ? jp / HM * 0.5 : 1 - jp / HM * 0.5;
          var wr = w * (0.06 + 0.15 * eu) * ws.sz, sf = belowSafe(y, wr);
          var a = 0.42 * (1 - u) * clamp01(age / 60) * sf;
          puff(x, y, wr, pos * 360 + t * 0.15, a);
          if (ws.sp) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - u) * sf).toFixed(3) + ')';
            sparkPath(ctx, x, y, w * 0.022 * (1 - u * 0.5)); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawRingStars(Lay, t, at, w, cx, cy) {
        var rx = Math.min(w * 0.7, W * 0.46 - w * 0.04), ry = Lay.hh * 0.68;
        for (var k = 0; k < RING.length; k++) {
          var q = clamp01((t - at - k * 35) / 420);
          if (q <= 0) continue;
          var e = easeOutBack(q), an = RING[k][0] * Math.PI / 180 + Math.sin(t * 0.0008) * 0.04;
          var tx = cx + Math.cos(an) * rx * RING[k][1], ty = cy + Math.sin(an) * ry * RING[k][1], mrg = w * RING[k][2] * 1.1 + 6;
          tx = Math.max(mrg, Math.min(W - mrg, tx));                // never clipped by a narrow (phone) screen
          var x = lerp(cx, tx, e) + Math.sin(t * 0.003 + k) * w * 0.008, y = lerp(cy, ty, e) + Math.cos(t * 0.0035 + k * 2) * w * 0.01;
          x = Math.max(mrg, Math.min(W - mrg, x));                  // easeOutBack overshoot stays on screen too
          var r = w * RING[k][2] * (0.88 + 0.12 * Math.sin(t * 0.008 + k * 1.7)) * Math.min(1, q * 2.5);
          ctx.globalCompositeOperation = 'lighter';
          glowDot(x, y, r * 2.6, 0.55 * Math.min(1, q * 2));
          ctx.globalCompositeOperation = 'source-over';
          drawStarSpr(x, y, r, (1 - e) * 3 * (k % 2 ? 1 : -1) + Math.sin(t * 0.002 + k) * 0.15, Math.min(1, q * 3));
        }
      }
      function drawSparkles(t, at, w, cx, cy, hh) {
        var a0 = clamp01((t - at) / 300);
        if (a0 <= 0) return;
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 0; k < sparks.length; k++) {
          var s = sparks[k], tw = Math.pow(0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.ph), 2);
          var x = cx + Math.cos(s.a) * w * 0.62 * s.r, y = cy + Math.sin(s.a) * hh * 0.62 * s.r;
          if (y - w * s.sz * 1.2 < Lay.safeTop) continue;
          ctx.fillStyle = rgba(s.col, a0 * (0.25 + 0.75 * tw));
          sparkPath(ctx, x, y, w * s.sz * (0.5 + 0.7 * tw)); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawGlitter(t, at, cx, w) {
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 0; k < glitter.length; k++) {
          var gp = glitter[k], age = t - at - gp.delay;
          if (age <= 0) continue;
          var x = isSuper ? gp.x * W : cx + (gp.x - 0.5) * w * 1.7;
          x += Math.sin(age * 0.004 * gp.fl + gp.ph) * 12 * unit;
          var y = isSuper ? (gp.y0 + age * gp.sp / 1000) * H : Lay.hy + gp.y0 * Lay.hh + age * gp.sp * Lay.hh / 1000 * 3;
          if (y > H + 10) continue;
          var tw = 0.55 + 0.45 * Math.sin(age * 0.012 + gp.ph), a = clamp01(age / 200) * tw;
          var sz = (isSuper ? 6 : 4.5) * unit * gp.sz + 1.5;
          ctx.fillStyle = rgba(gp.col, a);
          if (k % 2) { sparkPath(ctx, x, y, sz * 1.3); ctx.fill(); }
          else {
            ctx.save(); ctx.translate(x, y); ctx.rotate(gp.rot + age * 0.001 * gp.vr);
            ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz); ctx.restore();
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      var Lay = null;
      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        Lay = layout(); Lay.tSec = t / 1000;
        var appear = clamp01(t / 300), i, F;

        // background twinkles
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], kk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = rgba(s0.color, 0.55 * kk * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        var states = [];
        for (i = 0; i < flasks.length; i++) states.push(flaskState(flasks[i], t, Lay, i));
        for (i = 0; i < flasks.length; i++) if (states[i]) drawFlaskGlow(flasks[i], states[i]);
        for (i = 0; i < flasks.length; i++) if (states[i]) drawFlask(flasks[i], states[i], t);
        for (i = 0; i < flasks.length; i++) drawFlyingCork(flasks[i], t, Lay, i);

        var hx = Lay.hx, hy = Lay.hy;
        if (!isSuper) {
          F = flasks[0];
          var st = states[0];
          var fillAt = ms(T.fill), beat = heartBeat(t, fillAt + 320);
          var w = Lay.hw * beat;
          if (st && t >= F.popAt) {
            var m = L2W(F, st, 0, F.geo.top - 0.05), tipY = hy + HALF[0][1] * w;
            // soft coloured smoke (normal blending, so the funnel through the tip never burns to white)
            for (i = 0; i < column.length; i++) {
              var c = column[i], a = t - c.b;
              if (a < 0 || a > c.life) continue;
              var u = a / c.life, uu = easeOut(u);
              var y = lerp(m[1], tipY - Lay.hh * (0.12 + 0.6 * c.over), uu);
              var x = lerp(m[0], hx + c.ex * w, uu) + Math.sin(a * 0.006 + c.ph) * st.R * 0.38 * Math.sin(uu * Math.PI) * c.sw;
              puff(x, y, st.R * (0.26 + 0.75 * uu) * c.sz, c.hue + t * 0.12, 0.34 * clamp01(a / 90) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)), 0.6));
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            drawPoof(F, st, t);
            ctx.globalAlpha = 1;
          }
          var p = easeInOut((t - ms(T.trace[0])) / (ms(T.trace[1]) - ms(T.trace[0])));
          var f = clamp01((t - fillAt) / 320);
          drawWisps(hx, hy, w, t);
          drawHeartBody(hx, hy, w * lerp(0.5, 1, easeOutBack(f)), easeOut(f));
          drawRim(hx, hy, w, p, t, 1 - 0.35 * f, 1 - f);
          drawSparkles(t, ms(T.stars), w, hx, hy, Lay.hh * beat);
          drawRingStars(Lay, t, ms(T.stars), w, hx, hy);
          drawGlitter(t, ms(T.stars), hx, w);
          if (st) drawPopFlash(F, st, t);
        } else {
          // ── three mists twist together into a big rainbow spiral ──
          var bloom = ms(T.bloom), inh = clamp01((t - ms(T.inhale[0])) / (ms(T.inhale[1]) - ms(T.inhale[0])));
          var rV = Lay.hw * 0.56, vfade = 1 - clamp01((t - bloom) / 220);
          var vs = (0.55 + 0.45 * smooth((t - flasks[0].popAt) / 1500)) * (1 - 0.85 * easeIn(inh));
          var spin = t * 0.0026 + 3.4 * easeIn(inh), ARMW = 2.3 * Math.PI;
          ctx.globalCompositeOperation = 'lighter';
          for (var k = 0; k < 3; k++) {
            var Fk = flasks[k], sk = states[k];
            if (!sk || t < Fk.popAt) continue;
            var inten = smooth((t - Fk.popAt - 250) / 550) * vfade;
            var off = k * TAU / 3;
            // arm
            if (inten > 0) {
              var cmp = 0.45 + 0.55 * vs;                       // puffs shrink + dim as the spiral is drawn in
              for (var j = 0; j <= 32; j++) {
                var uj = j / 32, th = spin + off - uj * ARMW, rr = rV * vs * (0.08 + 0.92 * uj);
                var ax = hx + Math.cos(th) * rr, ay = hy + Math.sin(th) * rr * 0.78;
                puff(ax, ay, rV * (0.13 + 0.2 * uj) * cmp, Fk.hue + uj * 110 + t * 0.1, inten * cmp * (0.24 + 0.26 * (1 - uj)) * (uj < 0.15 ? 0.5 + uj * 3.3 : 1));
                if (j % 4 === 2) {
                  var tw2 = 0.5 + 0.5 * Math.sin(t * 0.015 + j + k * 3);
                  ctx.globalAlpha = 1;
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * inten * tw2).toFixed(3) + ')';
                  sparkPath(ctx, ax, ay, rV * 0.035 * (0.6 + tw2)); ctx.fill();
                }
              }
              ctx.globalAlpha = 1;
              // a bright thread along the arm gives the spiral a crisp shape
              for (var ps = 0; ps < 2; ps++) {
                ctx.strokeStyle = ps ? 'rgba(255,255,255,' + (0.6 * inten).toFixed(3) + ')' : rgba(mix(LIQ[k % 4], WHITE, 0.4), 0.22 * inten);
                ctx.lineWidth = ps ? Math.max(1.3, rV * 0.014) : Math.max(4, rV * 0.07);
                ctx.lineCap = 'round'; ctx.beginPath();
                for (j = 2; j <= 32; j++) {
                  uj = j / 32; th = spin + off - uj * ARMW; rr = rV * vs * (0.08 + 0.92 * uj);
                  if (j > 2) ctx.lineTo(hx + Math.cos(th) * rr, hy + Math.sin(th) * rr * 0.78); else ctx.moveTo(hx + Math.cos(th) * rr, hy + Math.sin(th) * rr * 0.78);
                }
                ctx.stroke();
              }
            }
            // stream from the neck to the arm's outer end
            var mk2 = L2W(Fk, sk, 0, Fk.geo.top - 0.05);
            var tth = spin + off - ARMW, tipX = hx + Math.cos(tth) * rV * vs, tipYv = hy + Math.sin(tth) * rV * vs * 0.78;
            for (var si = 0; si < Fk.stream.length; si++) {
              var sp = Fk.stream[si], sa = t - sp.b;
              if (sa < 0 || sa > sp.life) continue;
              var su = sa / sp.life, se = lerp(su, easeInOut(su), 0.35), iv = 1 - se;
              var cxp = mk2[0] + (tipX - mk2[0]) * 0.08, cyp = tipYv + (mk2[1] - tipYv) * 0.15;
              var bx = iv * iv * mk2[0] + 2 * iv * se * cxp + se * se * tipX + Math.sin(sa * 0.009 + sp.ph) * sk.R * 0.25 * Math.sin(su * Math.PI);
              var by = iv * iv * mk2[1] + 2 * iv * se * cyp + se * se * tipYv;
              puff(bx, by, sk.R * (0.3 + 0.45 * se) * sp.sz, sp.hue + t * 0.12, 0.34 * clamp01(sa / 80) * (1 - su * su) * vfade);
            }
          }
          ctx.globalAlpha = 1;
          // spiral heart-core glow (brightens during the inhale)
          var coreA = clamp01((t - flasks[0].popAt - 300) / 600) * (0.4 + 0.4 * inh) * vfade;
          glowDot(hx, hy, rV * (0.5 + 0.25 * inh), coreA);
          ctx.globalCompositeOperation = 'source-over';
          for (k = 0; k < 3; k++) if (states[k]) drawPoof(flasks[k], states[k], t);
          ctx.globalAlpha = 1;
          // ── the bloom: heart + stars burst + glitter rain ──
          var bq = clamp01((t - bloom) / 450), beatS = heartBeat(t, bloom + 450), ws = Lay.hw * beatS;
          if (bq > 0) {
            var fq = clamp01((t - bloom) / 650);
            ctx.globalCompositeOperation = 'lighter';
            glowDot(hx, hy, rV * (1.2 + 3 * easeOut(fq)), 1 - fq);
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - fq) * (1 - fq)).toFixed(3) + ')';
            ctx.lineWidth = Math.max(2, 6 * unit * (1 - fq));
            ctx.beginPath(); ctx.ellipse(hx, hy, ws * (0.2 + 0.55 * easeOut(fq)), ws * (0.16 + 0.42 * easeOut(fq)), 0, 0, TAU); ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
            var hsz = ws * lerp(0.15, 1, easeOutBack(bq));
            drawHeartBody(hx, hy, hsz, clamp01(bq * 3));
            drawRim(hx, hy, hsz, 1, t, 0.75 * clamp01(bq * 2), 0);
            drawSparkles(t, bloom + 200, ws, hx, hy, Lay.hh * beatS);
            drawRingStars(Lay, t, bloom + 60, ws, hx, hy);
            drawGlitter(t, bloom, hx, ws);
          }
          for (k = 0; k < 3; k++) if (states[k]) drawPopFlash(flasks[k], states[k], t);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq2 = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq2 > 0 ? easeOutBack(pq2) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq2 * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
        spr = null; hueSpr = null; hGlow = null; starSpr = null;
      };
    }
  });
})();
