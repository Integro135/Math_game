/* success-sparkler-heart.js — מסך הצלחה: לֵב שֶׁל זִיקוּק ✨
   ציור באור, כמו צילום בחשיפה ארוכה: זיקוק כוכבים ביד — חוט מתכת דק שראשו בוער
   ומסנוור — נכנס ומצייר באוויר לב גדול. מאחוריו נשאר שובל אור זוהר: ליבה לבנה-לוהטת
   שמתקררת לזהב ואז לצבעי הסקין לאורך השובל, עם הילה רכה. מהראש ניתזים ניצוצות
   קצרים שמתפצלים, נופלים עם כוח המשיכה ומהבהבים. כשהלב נסגר — הציור כולו מתלקח,
   פועם פעמיים כמו לב, ואז מתפורר בעדינות לנצנצים מרחפים.
   בסופר: שני זיקוקים מציירים יחד — לב, וסביבו כוכב גדול בעל חמישה קצוות — ואז
   שניהם מתלקחים לפרץ ניצוצות גדול ולגשם נצנצים מנצנץ.
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
  function easeIn(x) { x = clamp01(x); return x * x * x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function mix(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; }
  function rgba(c, a) {
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  // piecewise-linear colour ramp: R = [[pos, rgb], …] ascending
  function ramp(R, d) {
    if (d <= R[0][0]) return R[0][1];
    for (var i = 1; i < R.length; i++) if (d <= R[i][0]) return mix(R[i - 1][1], R[i][1], (d - R[i - 1][0]) / (R[i][0] - R[i - 1][0]));
    return R[R.length - 1][1];
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function bump(x, w) { x /= w; return Math.exp(-x * x); }

  // ─── closed paths: normalised, resampled to equal arc steps, running CLOCKWISE on screen ───
  // X/Y points, NX/NY outward normals, PHI unwrapped polar angle around the origin (drives the
  // conic colour ramp along the trail), CW cumulative time (a hand slows into sharp turns).
  function buildPath(raw, n, slowK) {
    var cum = [0], L = 0, i, k;
    for (i = 1; i < raw.length; i++) { L += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); cum.push(L); }
    var X = new Float32Array(n + 1), Y = new Float32Array(n + 1), j = 0;
    for (k = 0; k <= n; k++) {
      var s = k / n * L;
      while (j < raw.length - 2 && cum[j + 1] < s) j++;
      var seg = cum[j + 1] - cum[j], uu = seg > 0 ? clamp01((s - cum[j]) / seg) : 0;
      X[k] = lerp(raw[j][0], raw[j + 1][0], uu); Y[k] = lerp(raw[j][1], raw[j + 1][1], uu);
    }
    X[n] = X[0]; Y[n] = Y[0];
    var NX = new Float32Array(n + 1), NY = new Float32Array(n + 1), PHI = new Float32Array(n + 1), TURN = new Float32Array(n);
    for (k = 0; k <= n; k++) {
      var a = (k + n - 1) % n, b = (k + 1) % n;
      var tx = X[b] - X[a], ty = Y[b] - Y[a], tl = Math.hypot(tx, ty) || 1;
      NX[k] = ty / tl; NY[k] = -tx / tl;
      if (k < n) {
        var ux = X[k] - X[a], uy = Y[k] - Y[a], vx = X[b] - X[k], vy = Y[b] - Y[k];
        TURN[k] = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
      }
    }
    var prev = Math.atan2(Y[0], X[0]), acc = prev;
    PHI[0] = prev;
    for (k = 1; k <= n; k++) {
      var ang = Math.atan2(Y[k], X[k]), dd = ang - prev;
      while (dd > Math.PI) dd -= TAU;
      while (dd < -Math.PI) dd += TAU;
      acc += dd; prev = ang;
      PHI[k] = Math.max(acc, PHI[k - 1]);
    }
    PHI[n] = PHI[0] + TAU;
    var CW = new Float32Array(n + 1), tot = 0;
    for (k = 0; k < n; k++) {
      var sm = 0;
      for (var m = -6; m <= 6; m++) sm += TURN[(k + m + n) % n] * (1 - Math.abs(m) / 7);
      tot += 1 + slowK * sm / 7;
      CW[k + 1] = tot;
    }
    for (k = 1; k <= n; k++) CW[k] /= tot;
    var full = new Path2D();
    full.moveTo(X[0], Y[0]);
    for (k = 1; k < n; k++) full.lineTo(X[k], Y[k]);
    full.closePath();
    return { n: n, X: X, Y: Y, NX: NX, NY: NY, PHI: PHI, CW: CW, full: full };
  }
  function fOfQ(g, q) {               // time fraction → path fraction
    if (q <= 0) return 0;
    if (q >= 1) return 1;
    var lo = 0, hi = g.n;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (g.CW[mid] <= q) lo = mid; else hi = mid; }
    return (lo + (q - g.CW[lo]) / ((g.CW[lo + 1] - g.CW[lo]) || 1)) / g.n;
  }
  function sampleAt(g, arr, f) {
    var idx = clamp01(f) * g.n, k = Math.min(g.n - 1, Math.floor(idx));
    return lerp(arr[k], arr[k + 1], idx - k);
  }

  // the classic heart curve, bbox-centred, half-height 1; starts at the top notch
  var HEART = (function () {
    var raw = [], i, N = 1600;
    for (i = 0; i <= N; i++) {
      var t = i / N * TAU, s = Math.sin(t);
      raw.push([16 * s * s * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    var mny = 1e9, mxy = -1e9;
    for (i = 0; i < raw.length; i++) { mny = Math.min(mny, raw[i][1]); mxy = Math.max(mxy, raw[i][1]); }
    var cy = (mny + mxy) / 2, h = (mxy - mny) / 2;
    for (i = 0; i < raw.length; i++) { raw[i][0] /= h; raw[i][1] = (raw[i][1] - cy) / h; }
    var g = buildPath(raw, 320, 12);
    g.hw = 16 / h;
    return g;
  })();
  // a plump five-pointed star (outer radius 1) with softly rounded corners; starts at the top point
  var STAR = (function () {
    var K = 0.55, V = [], i;
    for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? K : 1; V.push([Math.cos(a) * r, Math.sin(a) * r]); }
    function corner(ci, s0, s1, out) {
      var v = V[ci], p = V[(ci + 9) % 10], q = V[(ci + 1) % 10], c = ci % 2 ? 0.07 : 0.1;
      var lp = Math.hypot(p[0] - v[0], p[1] - v[1]), lq = Math.hypot(q[0] - v[0], q[1] - v[1]);
      var ax = v[0] + (p[0] - v[0]) * c / lp, ay = v[1] + (p[1] - v[1]) * c / lp;
      var bx = v[0] + (q[0] - v[0]) * c / lq, by = v[1] + (q[1] - v[1]) * c / lq;
      for (var k = 0; k <= 10; k++) {
        var s = lerp(s0, s1, k / 10), mm = 1 - s;
        out.push([mm * mm * ax + 2 * mm * s * v[0] + s * s * bx, mm * mm * ay + 2 * mm * s * v[1] + s * s * by]);
      }
    }
    var raw = [];
    corner(0, 0.5, 1, raw);
    for (i = 1; i < 10; i++) corner(i, 0, 1, raw);
    corner(0, 0, 0.5, raw);
    return buildPath(raw, 420, 9);
  })();

  window.SUCCESS.styles.push({
    name: 'sparkler-heart',
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
      var praise = opts.praise || 'כָּל הַכָּבוֹד!';
      var hasPts = typeof opts.points === 'number';

      var P = rgbOf(primary), A = rgbOf(accent), G = rgbOf(glow);
      var WH = [255, 255, 255], HOT = [255, 250, 234], GOLD = [255, 204, 104], EMBER = [255, 150, 58];
      var PINK = [255, 150, 205];

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var hasConic = typeof ctx.createConicGradient === 'function';
      var W = 0, H = 0, u = 1, SHn = 200, ceilY = -1e9;
      // the trail's bloom is painted into a small buffer and smoothly up-scaled: no banding, cheap
      var BS = 6, bcv = document.createElement('canvas'), bctx = bcv.getContext('2d');

      // ─── sprites (off-DOM, built once) ───
      function radialSprite(size, stops) {
        var c = document.createElement('canvas'); c.width = c.height = size;
        var g = c.getContext('2d'), h = size / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
        for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
        return c;
      }
      var sprHalo = radialSprite(128, [[0, 'rgba(255,255,240,1)'], [0.09, 'rgba(255,242,196,.85)'], [0.25, 'rgba(255,196,100,.36)'],
                                       [0.55, 'rgba(255,140,50,.08)'], [1, 'rgba(255,120,40,0)']]);
      var sprCore = radialSprite(64, [[0, 'rgba(255,255,255,1)'], [0.32, 'rgba(255,251,230,.92)'], [0.66, 'rgba(255,222,150,.28)'], [1, 'rgba(255,210,130,0)']]);
      function tintSprite(c) {
        return radialSprite(64, [[0, rgba(mix(c, WH, 0.6), 0.9)], [0.3, rgba(c, 0.45)], [0.7, rgba(c, 0.1)], [1, rgba(c, 0)]]);
      }
      // lens rays of the blinding head: 4 long + 4 short tapered streaks
      var sprRays = document.createElement('canvas');
      sprRays.width = sprRays.height = 256;
      (function () {
        var g = sprRays.getContext('2d');
        g.translate(128, 128);
        for (var i = 0; i < 8; i++) {
          var len = i % 2 ? 70 : 126, w = i % 2 ? 2.2 : 3.2;
          g.save(); g.rotate(i * Math.PI / 4);
          var lg = g.createLinearGradient(0, 0, len, 0);
          lg.addColorStop(0, 'rgba(255,252,236,.95)'); lg.addColorStop(0.35, 'rgba(255,226,160,.4)'); lg.addColorStop(1, 'rgba(255,200,120,0)');
          g.fillStyle = lg;
          g.beginPath(); g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath(); g.fill();
          g.restore();
        }
      })();
      // glitter: a soft glow with a four-point twinkle in the middle
      function glitterSprite(c) {
        var s = document.createElement('canvas'); s.width = s.height = 48;
        var g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
        gr.addColorStop(0, rgba(c, 0.55)); gr.addColorStop(0.45, rgba(c, 0.14)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
        var g2 = g.createRadialGradient(24, 24, 0, 24, 24, 22);
        g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.3, rgba(mix(c, WH, 0.5), 1)); g2.addColorStop(1, rgba(c, 0.9));
        g.fillStyle = g2; sparkPath(g, 24, 24, 21); g.fill();
        g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); g.arc(24, 24, 2.6, 0, TAU); g.fill();
        return s;
      }
      // tiny four-point twinkles (dust caught in the line, crackle pops)
      function twinkleSprite(col) {
        var c = document.createElement('canvas'); c.width = c.height = 32;
        var g = c.getContext('2d');
        g.fillStyle = col; sparkPath(g, 16, 16, 15); g.fill();
        g.globalAlpha = 0.5; g.save(); g.translate(16, 16); g.rotate(Math.PI / 4); sparkPath(g, 0, 0, 7); g.fill(); g.restore();
        return c;
      }
      var sprTwW = twinkleSprite('rgba(255,255,250,1)'), sprTwG = twinkleSprite('rgba(255,226,150,1)');
      var GLIT = [glitterSprite(WH), glitterSprite(mix(A, GOLD, 0.4)), glitterSprite(mix(P, WH, 0.15)), glitterSprite(mix(G, WH, 0.15)), glitterSprite(PINK)];

      // ─── the sparklers (one per drawn shape) ───
      function makeDrawer(geo, main, main2, handSide, tE, tD0, tD1, seed) {
        return {
          geo: geo, hand: handSide, tE: tE, tD0: tD0, tD1: tD1, seed: seed,
          cx: 0, cy: 0, S: 1, wf: 1,
          f: 0, hx: 0, hy: 0, hvx: 0, hvy: 0, inh: 0.1, handX: null, handY: 0, emit: 0, alpha: 0, hs: 1, burnt: 0,
          coreR: [[0, HOT], [0.03, [255, 240, 204]], [0.09, mix(GOLD, WH, 0.25)], [0.24, mix(main, WH, 0.32)], [1, mix(main2, WH, 0.3)]],
          haloR: [[0, GOLD], [0.07, EMBER], [0.22, main], [1, main2]],
          setCore: mix(main, WH, 0.32), setHalo: main, flHalo: mix(main, WH, 0.5),
          spr: tintSprite(main), dust: [], echoK: 0.5
        };
      }
      var T = isSuper
        ? { enter: 0, d0: 0.06, d1: 0.5, txt: 0.16, s0: 0.68, s1: 0.9 }
        : { enter: 0, d0: 0.085, d1: 0.53, txt: 0.22, s0: 0.7, s1: 0.92 };
      function ms(f) { return f * dur; }
      var heart = makeDrawer(HEART, P, mix(P, G, 0.35), 1, ms(T.enter), ms(T.d0), ms(T.d1), 1.3);
      var drawers = [heart], star = null;
      if (isSuper) {
        star = makeDrawer(STAR, mix(A, GOLD, 0.25), mix(A, G, 0.45), -1, ms(T.enter), ms(T.d0), ms(T.d1), 4.1);
        star.echoK = 0.15;
        drawers = [star, heart];
      }
      for (var di = 0; di < drawers.length; di++) {
        drawers[di].idx = di;
        // long-exposure sparkle dust caught along the line (appears as the line is written)
        var nd = drawers[di] === heart ? (isSuper ? 40 : 70) : 80;
        for (var dj = 0; dj < nd; dj++)
          drawers[di].dust.push({ k: Math.floor(Math.random() * drawers[di].geo.n), o: rnd(-1, 1) * rnd(0, 1), ph: rnd(0, TAU),
                                  rate: rnd(0.006, 0.018), sz: rnd(1.2, 2.8), gold: Math.random() < 0.5 });
      }

      function layout() {
        var ptsFont = Math.max(20, Math.min(W * 0.035, 34));
        var txtFont = isSuper ? Math.max(34, Math.min(W * 0.08, 84)) : Math.max(28, Math.min(W * 0.056, 58));
        var lineBottom = hasPts ? H * (0.13 + (isSuper ? 0.095 : 0.08)) + ptsFont * 0.62 : H * 0.13 + txtFont * 0.62;
        // super: the star's top point (and its flare) keeps a clear gap below the points line
        var top = lineBottom + Math.max(10, H * 0.022) + (isSuper ? Math.max(16, H * 0.042) : 0);
        ceilY = lineBottom + Math.max(8, H * 0.016);
        var bot = H - Math.max(12, H * 0.03);
        var avail = Math.max(80, bot - top);
        var narrow = W < H * 0.8;                       // phone portrait: leave room for the flare's bloom
        SHn = Math.max(40, Math.min(avail * 0.5 * 0.86, W * (narrow ? 0.385 : 0.43) / HEART.hw));
        u = SHn / 230;
        if (!isSuper) {
          heart.cx = W / 2; heart.cy = top + SHn + (avail - 2 * SHn) * (narrow ? 0.4 : 0.5); heart.S = SHn; heart.wf = 1;
        } else {
          var R = Math.max(50, Math.min(avail / 1.73 * 0.92, W * (narrow ? 0.43 : 0.47) / 0.951));
          star.cx = W / 2; star.cy = top + (avail - 1.73 * R) * (narrow ? 0.4 : 0.5) + 0.96 * R; star.S = R; star.wf = 0.85;
          heart.cx = W / 2; heart.cy = star.cy + 0.04 * R; heart.S = 0.43 * R; heart.wf = 0.72;
        }
      }
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bcv.width = Math.max(1, Math.ceil(W / BS)); bcv.height = Math.max(1, Math.ceil(H / BS));
        bctx.setTransform(1 / BS, 0, 0, 1 / BS, 0, 0);
        layout();
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── spark pool (struct of arrays, free list) ───
      var CAP = isSuper ? 1900 : 800;
      var sx = new Float32Array(CAP), sy = new Float32Array(CAP), svx = new Float32Array(CAP), svy = new Float32Array(CAP);
      var sage = new Float32Array(CAP), slife = new Float32Array(CAP), ssplit = new Float32Array(CAP);
      var sgen = new Uint8Array(CAP), shue = new Uint8Array(CAP), salive = new Uint8Array(CAP), sown = new Int8Array(CAP);
      var free = new Int32Array(CAP), freeN = CAP, i0;
      for (i0 = 0; i0 < CAP; i0++) free[i0] = CAP - 1 - i0;
      function spawn(x, y, vx, vy, life, gen, hue, split, own) {
        if (!freeN) return -1;
        if (isSuper && vy < 0) {                       // cap the climb so no spark reaches the text
          var vmax = Math.max(0, y - ceilY) * DRAG[gen] / 1.2;
          if (-vy > vmax) vy = -vmax;
        }
        var i = free[--freeN];
        sx[i] = x; sy[i] = y; svx[i] = vx; svy[i] = vy; sage[i] = 0; slife[i] = life; ssplit[i] = split;
        sgen[i] = gen; shue[i] = hue; sown[i] = own; salive[i] = 1;
        return i;
      }
      function kill(i) { salive[i] = 0; free[freeN++] = i; }
      // spark colours: 4 hues (gold, primary, glow, accent) × 4 ages, + a soft bloom pass
      function seq(c) { return [mix(c, WH, 0.85), mix(c, WH, 0.45), c, mix(c, [70, 20, 0], 0.35)]; }
      var HUES = [[[255, 255, 242], [255, 232, 162], [255, 188, 88], [238, 118, 40]], seq(P), seq(G), seq(mix(A, GOLD, 0.3))];
      var AGEA = [1, 1, 0.86, 0.55];
      var NB = 32, COREC = [], BLOOMC = [];
      for (var b0 = 0; b0 < NB; b0++) {
        var hue = b0 >> 3, ab = (b0 >> 1) & 3;
        COREC.push(rgba(HUES[hue][ab], AGEA[ab]));
        BLOOMC.push(rgba(HUES[hue][Math.min(3, ab + 1)], AGEA[ab] * 0.26));
      }
      var BSEG = new Float32Array(NB * CAP * 4), BCNT = new Int32Array(NB);
      var DRAG = [3.1, 3.8, 4.6], STK = [0.03, 0.026, 0.022];
      // little "crackle" pops where a spark splits
      var PCAP = 64, popX = new Float32Array(PCAP), popY = new Float32Array(PCAP), popT = new Float32Array(PCAP), popI = 0;
      for (i0 = 0; i0 < PCAP; i0++) popT[i0] = -1e6;
      var tNow = 0;

      function split(i) {
        var g = sgen[i], n = g === 0 ? (Math.random() < 0.45 ? 3 : 2) : 2;
        var base = Math.atan2(svy[i], svx[i]), sp = Math.hypot(svx[i], svy[i]);
        for (var c = 0; c < n; c++) {
          var off = n === 3 ? (c - 1) * rnd(0.35, 0.8) + rnd(-0.1, 0.1) : (c ? 1 : -1) * rnd(0.25, 0.7);
          var a = base + off, s2 = sp * rnd(0.6, 1.0) + rnd(20, 80) * u;
          var life = g === 0 ? rnd(0.1, 0.24) : rnd(0.06, 0.13);
          var sp2 = g === 0 && Math.random() < 0.4 ? life * rnd(0.45, 0.8) : -1;
          spawn(sx[i], sy[i], Math.cos(a) * s2, Math.sin(a) * s2, life, g + 1, shue[i], sp2, sown[i]);
        }
        popX[popI] = sx[i]; popY[popI] = sy[i]; popT[popI] = tNow; popI = (popI + 1) % PCAP;
        kill(i);
      }
      function emitHead(d, n) {
        for (var k = 0; k < n; k++) {
          var a = Math.random() * TAU, sp = (200 + 540 * Math.pow(Math.random(), 1.4)) * u;
          var life = rnd(0.14, 0.38);
          spawn(d.hx + Math.cos(a) * 3 * u, d.hy + Math.sin(a) * 3 * u,
                Math.cos(a) * sp + d.hvx * d.inh, Math.sin(a) * sp + d.hvy * d.inh,
                life, 0, 0, Math.random() < 0.75 ? life * rnd(0.35, 0.75) : -1, d.idx);
        }
      }
      // star glints that pop along the finished line as it flares
      var glints = [];
      function addGlints(d, n, tStart, spread) {
        for (var j = 0; j < n; j++)
          glints.push({ d: d, k: Math.floor((j + Math.random()) / n * d.geo.n), t0: tStart + Math.random() * spread,
                        sz: rnd(9, 19), rot: rnd(-0.35, 0.35), life: rnd(320, 480) });
      }
      function drawGlints(t, looks) {
        for (var j = 0; j < glints.length; j++) {
          var gl = glints[j], q = (t - gl.t0) / gl.life;
          if (q <= 0 || q >= 1) continue;
          var d = gl.d, lk = looks[d.idx], sc = d.S * lk.pulse, x = d.cx + d.geo.X[gl.k] * sc, y = d.cy + d.geo.Y[gl.k] * sc;
          var a = Math.sin(Math.PI * q), r = gl.sz * u * (0.35 + 0.65 * a) * Math.max(0.75, d.wf);
          glowSpr(d.spr, x, y, r * 2.4, 0.75 * a);
          ctx.save(); ctx.translate(x, y); ctx.rotate(gl.rot + q * 0.6);
          ctx.fillStyle = 'rgba(255,253,240,' + a.toFixed(3) + ')';
          sparkPath(ctx, 0, 0, r); ctx.fill();
          ctx.rotate(Math.PI / 4); sparkPath(ctx, 0, 0, r * 0.45); ctx.fill();
          ctx.restore();
        }
      }
      function burstFrom(d, count, sp0, sp1, l0, l1, hues, splitP, pulse) {
        var g = d.geo, sc = d.S * pulse;
        for (var j = 0; j < count; j++) {
          var k = Math.floor(Math.random() * g.n), r2 = Math.random();
          var a = Math.atan2(g.NY[k], g.NX[k]) + (r2 - 0.5) * 2.2, sp = lerp(sp0, sp1, Math.pow(Math.random(), 1.5)) * u, life = rnd(l0, l1);
          spawn(d.cx + g.X[k] * sc, d.cy + g.Y[k] * sc, Math.cos(a) * sp, Math.sin(a) * sp, life, 0,
                hues[j % hues.length], Math.random() < splitP ? life * rnd(0.4, 0.75) : -1, -1);
        }
      }

      // ─── glitter (dissolve + super rain) ───
      var GCAP = isSuper ? 360 : 150;
      var gx = new Float32Array(GCAP), gy = new Float32Array(GCAP), gvx = new Float32Array(GCAP), gvy = new Float32Array(GCAP);
      var gborn = new Float32Array(GCAP), gsz = new Float32Array(GCAP), gph = new Float32Array(GCAP), grate = new Float32Array(GCAP);
      var gspr = new Uint8Array(GCAP), gkind = new Uint8Array(GCAP), gown = new Uint8Array(GCAP);
      var gk = new Int16Array(GCAP), gq = new Float32Array(GCAP), gjit = new Float32Array(GCAP), gN = 0;
      function addGlitter(kind, own, k, q, born) {
        if (gN >= GCAP) return -1;
        var i = gN++;
        gkind[i] = kind; gown[i] = own; gk[i] = k; gq[i] = q; gborn[i] = born;
        gjit[i] = rnd(-1, 1); gsz[i] = rnd(7, 15); gph[i] = rnd(0, TAU); grate[i] = rnd(0.006, 0.016);
        gspr[i] = Math.floor(Math.random() * GLIT.length);
        return i;
      }
      (function () {
        for (var d0 = 0; d0 < drawers.length; d0++) {
          var d = drawers[d0], n = isSuper ? (d === heart ? 70 : 130) : 120;
          for (var j = 0; j < n; j++) {
            var k = Math.floor((j + Math.random()) / n * d.geo.n), f = k / d.geo.n;
            addGlitter(0, d0, k, Math.min(f, 1 - f) * 2, -1);   // released when the dissolve front passes
          }
        }
        if (isSuper) {
          for (var r = 0; r < 140; r++) {
            var gi = addGlitter(1, 0, 0, 0, rnd(ms(T.d1) + 120, dur * 0.84));
            if (gi < 0) break;
            gx[gi] = Math.random(); gy[gi] = rnd(-0.06, 0.6);   // fractions; resolved at birth
            gsz[gi] = rnd(6, 14);
          }
        }
      })();

      // faint background twinkles (a night sky for the light painting)
      var bgStars = [];
      for (var bs = 0; bs < 16; bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.9, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.3, color: bs % 3 === 0 ? glow : bs % 4 === 0 ? accent : '#FFFFFF' });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 16px ' + hexA(accent, 0.9) + ',0 0 44px ' + hexA(primary, 0.65) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (hasPts) {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + ' + (isSuper ? '9.5%' : '8%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── per-frame "look" of a drawn shape ───
      function lookOf(d, t) {
        var tc = d.tD1, a = t - tc;
        var flare = a < 0 ? 0 : a < 70 ? a / 70 : Math.exp(-(a - 70) / 300);
        var settle = a < 0 ? 0 : smooth(a / 520);
        var pulse = 1 + 0.055 * bump(a - 60, 85) + 0.035 * bump(a - 300, 85) + 0.03 * bump(a - 800, 110) + 0.02 * bump(a - 1030, 110);
        var s0 = ms(T.s0), s1 = ms(T.s1), F = -1, dq = 0;
        if (t > s0) { dq = clamp01((t - s0) / (s1 - s0)); F = lerp(-0.22, 1.22, dq); }
        return { flare: flare, settle: settle, pulse: pulse, F: F, dq: dq, echo: a < 0 ? -1 : a / 560, alpha: 1 };
      }

      // the trail is ONE path stroked in bands: a smooth multi-band bloom (one shared gradient, alpha per
      // band so there are no hard edges), a coloured core and a white-hot filament
      var BLOOM = [[112, 0.034], [90, 0.042], [72, 0.052], [56, 0.066], [42, 0.084], [30, 0.11], [20, 0.15], [12, 0.2]];
      var M = 34, OFF = new Float32Array(M), DD = new Float32Array(M), FS = new Float32Array(M);
      function stopCol(kind, d, dd, fs, lk) {     // kind: 0 bloom, 1 core, 2 white-hot filament
        var c, a = 1;
        if (kind === 2) { c = HOT; a = dd < 0.12 ? lerp(1, 0.8, dd / 0.12) : lerp(0.8, 0.52, Math.min(1, (dd - 0.12) / 0.6)); }
        else c = ramp(kind ? d.coreR : d.haloR, dd);
        if (lk.settle > 0) {
          c = mix(c, kind === 2 ? HOT : kind ? d.setCore : d.setHalo, lk.settle);
          if (kind === 2) a = lerp(a, 0.75, lk.settle);
        }
        if (lk.flare > 0) c = mix(c, kind ? WH : d.flHalo, lk.flare * (kind ? 0.8 : 0.45));
        if (lk.F > -1) {                            // dissolve: a fizzing white front eats the line
          var q = Math.min(fs, 1 - fs) * 2, v = clamp01((q - lk.F) / 0.18);
          if (kind) { var e = (q - lk.F - 0.05) / 0.06; c = mix(c, WH, 0.65 * Math.exp(-e * e)); }
          a *= v;
        }
        return rgba(c, a);
      }
      function shapeGrad(c2, kind, d, lk, phH, f) {
        if (!hasConic) return stopCol(kind, d, 0.3 * f, 0.5 * f, lk);
        var gr = c2.createConicGradient(phH, 0, 0);
        for (var j = 0; j < M; j++) gr.addColorStop(OFF[j], stopCol(kind, d, DD[j], FS[j], lk));
        return gr;
      }
      function drawShape(d, lk) {
        var g = d.geo, f = d.f;
        if (f <= 0.0005) return;
        var sc = d.S * lk.pulse, kEnd = Math.min(g.n, Math.floor(f * g.n)), k, j, wk = u * d.wf / sc;
        var path = new Path2D();
        path.moveTo(g.X[0], g.Y[0]);
        for (k = 1; k <= kEnd; k++) path.lineTo(g.X[k], g.Y[k]);
        path.lineTo(sampleAt(g, g.X, f), sampleAt(g, g.Y, f));
        var phH = sampleAt(g, g.PHI, f);
        for (j = 0; j < M; j++) {
          var s = j / (M - 1), dd = lk.settle < 1 ? f * s * s : f * s, fs = f - dd;
          DD[j] = dd; FS[j] = fs;
          OFF[j] = clamp01(1 - (phH - sampleAt(g, g.PHI, fs)) / TAU);
        }
        var fl = lk.flare, bi;
        // 1) soft bloom → low-res buffer
        bctx.save();
        bctx.translate(d.cx, d.cy); bctx.scale(sc, sc);
        bctx.globalCompositeOperation = 'lighter';
        bctx.lineCap = 'round'; bctx.lineJoin = 'round';
        bctx.strokeStyle = shapeGrad(bctx, 0, d, lk, phH, f);
        for (bi = 0; bi < BLOOM.length; bi++) {
          bctx.globalAlpha = Math.min(1, BLOOM[bi][1] * (1 + fl * 1.1));
          bctx.lineWidth = BLOOM[bi][0] * wk * (1 + fl * 0.7);
          bctx.stroke(path);
        }
        // the flare: a soft echo of the shape ripples outward
        if (lk.echo > 0 && lk.echo < 1) {
          var e = easeOut(lk.echo), ea = (1 - lk.echo) * (1 - lk.echo), eg = 1 + d.echoK * e;
          bctx.scale(eg, eg);
          bctx.strokeStyle = rgba(mix(d.setHalo, WH, 0.25), 1);
          bctx.globalAlpha = 0.16 * ea; bctx.lineWidth = (16 + 30 * e) * wk / eg; bctx.stroke(g.full);
          bctx.globalAlpha = 0.3 * ea; bctx.lineWidth = (6 + 8 * e) * wk / eg; bctx.stroke(g.full);
        }
        bctx.restore();
        // 2) crisp inner glow, coloured core and white-hot filament → main canvas
        ctx.save();
        ctx.translate(d.cx, d.cy); ctx.scale(sc, sc);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = shapeGrad(ctx, 0, d, lk, phH, f);
        ctx.globalAlpha = Math.min(1, 0.16 * (1 + fl)); ctx.lineWidth = 12 * wk * (1 + fl * 0.5); ctx.stroke(path);
        ctx.strokeStyle = shapeGrad(ctx, 1, d, lk, phH, f);
        ctx.globalAlpha = 0.92; ctx.lineWidth = 6 * wk * (1 + fl * 0.3); ctx.stroke(path);
        ctx.strokeStyle = shapeGrad(ctx, 2, d, lk, phH, f);
        ctx.globalAlpha = 0.95; ctx.lineWidth = 2.2 * wk * (1 + fl * 0.25); ctx.stroke(path);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      function drawDust(d, lk, t) {
        var g = d.geo, sc = d.S * lk.pulse, n = g.n;
        for (var j = 0; j < d.dust.length; j++) {
          var p = d.dust[j];
          if (p.k / n > d.f) continue;
          var a = 1, f2 = p.k / n;
          if (lk.F > -1) a = clamp01((Math.min(f2, 1 - f2) * 2 - lk.F) / 0.12);
          if (a <= 0) continue;
          var tw = 0.5 + 0.5 * Math.sin(t * p.rate + p.ph), off = p.o * 13 * u * d.wf;
          var x = d.cx + g.X[p.k] * sc + g.NX[p.k] * off, y = d.cy + g.Y[p.k] * sc + g.NY[p.k] * off;
          var r = p.sz * u * (0.6 + 0.8 * tw) * (1 + 0.6 * lk.flare) * 2.2;
          glowSpr(p.gold ? sprTwG : sprTwW, x, y, r, a * (0.32 + 0.68 * tw));
        }
      }
      function drawStick(d) {
        if (d.alpha <= 0.01 || d.handX === null) return;
        var hx = d.hx, hy = d.hy, dx = d.handX - hx, dy = d.handY - hy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        var Ls = SHn * 1.05, ex = hx + ux * Ls, ey = hy + uy * Ls, cX = hx + ux * Ls * 0.46, cY = hy + uy * Ls * 0.46;
        var nx = -uy, ny = ux;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = d.alpha; ctx.lineCap = 'round';
        // bare wire down to the (unseen) hand, fading into the dark
        var gw = ctx.createLinearGradient(cX, cY, ex, ey);
        gw.addColorStop(0, 'rgba(176,176,188,.9)'); gw.addColorStop(1, 'rgba(176,176,188,0)');
        ctx.strokeStyle = gw; ctx.lineWidth = Math.max(1.2, 2 * u);
        ctx.beginPath(); ctx.moveTo(cX, cY); ctx.lineTo(ex, ey); ctx.stroke();
        // unburnt coating: grey-brown, ember-orange right behind the burning front
        var gc = ctx.createLinearGradient(hx, hy, cX, cY);
        gc.addColorStop(0, 'rgba(255,222,150,1)'); gc.addColorStop(0.06, 'rgba(240,124,48,1)'); gc.addColorStop(0.15, 'rgba(120,84,68,1)');
        gc.addColorStop(1, 'rgba(86,78,76,1)');
        ctx.strokeStyle = gc; ctx.lineWidth = Math.max(3, 5.6 * u);
        ctx.beginPath(); ctx.moveTo(hx + ux * 2 * u, hy + uy * 2 * u); ctx.lineTo(cX, cY); ctx.stroke();
        // gritty texture on the coating
        var cw = 2.4 * u;
        ctx.strokeStyle = 'rgba(38,32,32,.5)'; ctx.lineWidth = Math.max(0.7, 1.1 * u);
        ctx.beginPath();
        for (var s = 0.2; s < 0.97; s += 0.065) {
          var px = lerp(hx, cX, s), py = lerp(hy, cY, s), w = (s * 7.31 % 1) - 0.5;
          ctx.moveTo(px + nx * cw, py + ny * cw); ctx.lineTo(px - nx * cw * 0.2 + ux * w * 3 * u, py - ny * cw * 0.2 + uy * w * 3 * u);
        }
        ctx.stroke();
        // warm light from the head along the near edge of the coating
        var mx = lerp(hx, cX, 0.6), my = lerp(hy, cY, 0.6);
        var gl = ctx.createLinearGradient(hx, hy, mx, my);
        gl.addColorStop(0, 'rgba(255,226,170,.85)'); gl.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.strokeStyle = gl; ctx.lineWidth = Math.max(0.9, 1.3 * u);
        ctx.beginPath(); ctx.moveTo(hx - nx * 2.1 * u, hy - ny * 2.1 * u); ctx.lineTo(mx - nx * 2.1 * u, my - ny * 2.1 * u); ctx.stroke();
        // burnt-out wire past the burning front: ash grey with a dull red glow
        var bl = Ls * (0.07 + 0.16 * d.burnt), bx = hx - ux * bl, by = hy - uy * bl;
        var gb = ctx.createLinearGradient(hx, hy, bx, by);
        gb.addColorStop(0, 'rgba(255,120,60,.95)'); gb.addColorStop(0.3, 'rgba(150,64,48,.9)'); gb.addColorStop(1, 'rgba(96,90,92,.85)');
        ctx.strokeStyle = gb; ctx.lineWidth = Math.max(1, 1.7 * u);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
        ctx.restore();
      }
      function glowSpr(sp, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function drawHead(d, t) {
        if (d.alpha <= 0.01) return;
        var fl = 0.84 + 0.08 * Math.sin(t * 0.051 + d.seed) + 0.06 * Math.sin(t * 0.137 + d.seed * 3) + 0.06 * Math.random();
        var a = d.alpha, R = 40 * u * fl * d.hs;
        ctx.globalCompositeOperation = 'lighter';
        glowSpr(sprHalo, d.hx, d.hy, R * 5.5, 0.1 * a);     // light pool lighting the night air
        glowSpr(sprHalo, d.hx, d.hy, R * 2.2, 0.6 * a);
        ctx.save();
        ctx.translate(d.hx, d.hy); ctx.rotate(t * 0.0005 + d.seed);
        ctx.globalAlpha = Math.min(1, 0.62 * a * fl);
        var rr = R * 2.1;
        ctx.drawImage(sprRays, -rr, -rr, rr * 2, rr * 2);
        ctx.restore();
        glowSpr(sprCore, d.hx, d.hy, R * 0.75, a);
        glowSpr(sprCore, d.hx, d.hy, R * 0.3, a);
      }

      // ─── per-frame sparkler motion ───
      function updDrawer(d, t, dt) {
        var g = d.geo, x, y, f = 0, alpha = 1, rate = 1, hs = 1;
        var sx0 = d.cx + g.X[0] * d.S, sy0 = d.cy + g.Y[0] * d.S;
        if (t < d.tD0) {                                 // the lit sparkler swings in from below
          var q = clamp01((t - d.tE) / (d.tD0 - d.tE));
          var fx = sx0 + d.hand * Math.min(W * 0.26, SHn * 1.1), fy = H + 40 * u;
          x = lerp(fx, sx0, 1 - Math.pow(1 - q, 2.4)); y = lerp(fy, sy0, easeOut(q));
          alpha = clamp01(q * 5); rate = 0.8;
        } else if (t < d.tD1) {                          // writing the shape
          var qd = (t - d.tD0) / (d.tD1 - d.tD0);
          f = fOfQ(g, 0.6 * qd + 0.4 * (0.5 - 0.5 * Math.cos(Math.PI * qd)));
          x = d.cx + sampleAt(g, g.X, f) * d.S; y = d.cy + sampleAt(g, g.Y, f) * d.S;
        } else {                                          // done: it lifts away and fizzles out
          f = 1;
          var xq = clamp01((t - d.tD1 - 120) / 430), e = easeIn(xq);
          x = sx0 + d.hand * e * SHn * 0.55; y = sy0 + e * SHn * 0.75;
          alpha = 1 - smooth(xq); rate = (1 - xq) * (1 - xq); hs = 1 - 0.5 * xq;
        }
        if (d.handX === null) { d.hx = x; d.hy = y; }
        var ivx = (x - d.hx) / Math.max(dt, 0.001), ivy = (y - d.hy) / Math.max(dt, 0.001);
        var kv = 1 - Math.exp(-dt * 40);
        d.inh = t < d.tD0 ? 0.1 : t < d.tD1 ? 0.45 : 0.2;   // sparks carry some of the hand's motion
        d.hvx += (ivx - d.hvx) * kv; d.hvy += (ivy - d.hvy) * kv;
        d.hx = x; d.hy = y; d.f = f; d.alpha = alpha; d.hs = hs;
        d.burnt = clamp01((t - d.tE) / (d.tD1 + 500 - d.tE));
        // the hand trails behind the head a little, so the stick tilts with the motion
        var ha = d.hand > 0 ? 1.05 : Math.PI - 1.05, Ls = SHn * 1.05;
        var tx = x + Math.cos(ha) * Ls, ty = y + Math.sin(ha) * Ls;
        if (d.handX === null) { d.handX = tx; d.handY = ty; }
        var kh = 1 - Math.exp(-dt * 7);
        d.handX += (tx - d.handX) * kh; d.handY += (ty - d.handY) * kh;
        // fizz
        if (alpha > 0.02) {
          d.emit += (isSuper ? 300 : 380) * rate * alpha * dt;
          var n = Math.floor(d.emit);
          d.emit -= n;
          emitHead(d, n);
        }
      }

      var raf = 0, killed = false, t0 = performance.now(), last = -1;
      var burstDone = false;
      function frame(now) {
        if (killed) return;
        var t = Math.max(0, now - t0);
        var dt = last < 0 ? 1 / 60 : Math.min(0.05, Math.max(0.0001, (t - last) / 1000));
        last = t; tNow = t;
        var gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 300), i, k, d, di2;

        // background twinkles
        ctx.globalCompositeOperation = 'source-over';
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], kk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.5 * kk * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * u); ctx.fill();
        }

        var looks = [];
        for (di2 = 0; di2 < drawers.length; di2++) { d = drawers[di2]; updDrawer(d, t, dt); looks.push(lookOf(d, t)); }

        // the closing flare: every shape crackles outward (super: a big burst)
        if (!burstDone && t >= heart.tD1 + 40) {
          burstDone = true;
          if (isSuper) {
            burstFrom(star, 170, 260, 760, 0.45, 0.9, [0, 3, 1, 0, 2], 0.85, looks[0].pulse);
            burstFrom(heart, 60, 200, 460, 0.35, 0.7, [0, 1, 0, 3], 0.8, looks[1].pulse);
            for (var tip = 1; tip < 5; tip++) {              // long jets off the star points (not the top one: the text is there)
              var ta = -Math.PI / 2 + tip * TAU / 5, tpx = star.cx + Math.cos(ta) * star.S * 0.95, tpy = star.cy + Math.sin(ta) * star.S * 0.95;
              for (var jj = 0; jj < 15; jj++) {
                var aa = ta + rnd(-0.38, 0.38), sp = rnd(480, 980) * u, lf = rnd(0.55, 0.95);
                spawn(tpx, tpy, Math.cos(aa) * sp, Math.sin(aa) * sp, lf, 0, jj % 3 === 0 ? 3 : 0, lf * rnd(0.45, 0.7), -1);
              }
            }
          } else {
            burstFrom(heart, 46, 140, 420, 0.24, 0.5, [0, 1, 0, 3], 0.75, looks[0].pulse);
          }
          for (var gd = 0; gd < drawers.length; gd++) addGlints(drawers[gd], drawers[gd] === heart ? (isSuper ? 9 : 15) : 18, t - 20, 340);
        }

        // ─── sparks: simulate + bucket the streaks ───
        for (i = 0; i < NB; i++) BCNT[i] = 0;
        var gr = 650 * u, k0 = Math.exp(-DRAG[0] * dt), k1 = Math.exp(-DRAG[1] * dt), k2 = Math.exp(-DRAG[2] * dt);
        for (i = 0; i < CAP; i++) {
          if (!salive[i]) continue;
          sage[i] += dt;
          if (ssplit[i] > 0 && sage[i] >= ssplit[i]) { split(i); continue; }
          if (sage[i] >= slife[i]) { kill(i); continue; }
          var gen = sgen[i], kd = gen === 0 ? k0 : gen === 1 ? k1 : k2;
          svx[i] *= kd; svy[i] = svy[i] * kd + gr * dt;
          sx[i] += svx[i] * dt; sy[i] += svy[i] * dt;
          var st = STK[gen], tlx = sx[i] - svx[i] * st, tly = sy[i] - svy[i] * st;
          if (Math.random() < 0.1) continue;               // crackle: sparks flicker
          var fr = sage[i] / slife[i], ab2 = fr < 0.22 ? 0 : fr < 0.5 ? 1 : fr < 0.78 ? 2 : 3;
          var bk = ((shue[i] * 4 + ab2) << 1) | (gen ? 1 : 0), bo = (bk * CAP + BCNT[bk]) * 4;
          BSEG[bo] = tlx; BSEG[bo + 1] = tly; BSEG[bo + 2] = sx[i]; BSEG[bo + 3] = sy[i];
          BCNT[bk]++;
        }

        // ─── draw: trails (behind); their bloom buffer is composited under the crisp lines ───
        bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, bcv.width, bcv.height); bctx.restore();
        for (di2 = 0; di2 < drawers.length; di2++) drawShape(drawers[di2], looks[di2]);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(bcv, 0, 0, bcv.width * BS, bcv.height * BS);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        for (di2 = 0; di2 < drawers.length; di2++) drawDust(drawers[di2], looks[di2], t);
        // soft flash at the moment the drawing closes
        for (di2 = 0; di2 < drawers.length; di2++) {
          d = drawers[di2];
          var fl2 = looks[di2].flare;
          if (fl2 > 0.01) glowSpr(d.spr, d.cx, d.cy, d.S * 2.1, 0.42 * fl2);
        }
        // sticks, then sparks, then the blinding heads on top
        for (di2 = 0; di2 < drawers.length; di2++) drawStick(drawers[di2]);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (var pass = 0; pass < 2; pass++) {
          for (var bb = 0; bb < NB; bb++) {
            var nseg = BCNT[bb];
            if (!nseg) continue;
            var wBase = bb & 1 ? 1.15 : 1.7;
            ctx.lineWidth = Math.max(bb & 1 ? 0.9 : 1.1, wBase * u) * (pass ? 1 : 3);
            ctx.strokeStyle = pass ? COREC[bb] : BLOOMC[bb];
            ctx.beginPath();
            var base = bb * CAP * 4;
            for (k = 0; k < nseg; k++) {
              var q4 = base + k * 4;
              ctx.moveTo(BSEG[q4], BSEG[q4 + 1]); ctx.lineTo(BSEG[q4 + 2], BSEG[q4 + 3]);
            }
            ctx.stroke();
          }
        }
        for (i = 0; i < PCAP; i++) {
          var pa = (t - popT[i]) / 70;
          if (pa >= 0 && pa < 1) glowSpr(sprTwW, popX[i], popY[i], Math.max(1.5, 4.5 * u * (1 - 0.5 * pa)), 0.95 * (1 - pa));
        }
        for (di2 = 0; di2 < drawers.length; di2++) drawHead(drawers[di2], t);
        drawGlints(t, looks);

        // ─── glitter: released by the dissolve front, plus the super rain ───
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < gN; i++) {
          if (gborn[i] < 0) {                              // pending dissolve glitter
            var dd2 = drawers[gown[i]], lk2 = looks[gown[i]];
            if (lk2.F > -1 && lk2.F >= gq[i] - 0.02) {
              var g2 = dd2.geo, kq = gk[i], scq = dd2.S * lk2.pulse, jit = gjit[i] * 9 * u * dd2.wf;
              gx[i] = dd2.cx + g2.X[kq] * scq + g2.NX[kq] * jit; gy[i] = dd2.cy + g2.Y[kq] * scq + g2.NY[kq] * jit;
              var vo = rnd(8, 42) * u;
              gvx[i] = g2.NX[kq] * vo + rnd(-14, 14) * u; gvy[i] = g2.NY[kq] * vo + rnd(-26, 4) * u;
              gborn[i] = t;
            }
            continue;
          }
          if (t < gborn[i]) continue;
          if (gkind[i] === 1) {                             // rain: resolve its spot at birth
            gkind[i] = 2;
            gx[i] *= W; gy[i] *= H; gvx[i] = rnd(-12, 12) * u; gvy[i] = rnd(45, 130) * u;
          }
          var age = t - gborn[i];
          gvy[i] = Math.min(gvy[i] + 24 * u * dt, 150 * u); gvx[i] *= Math.exp(-0.8 * dt);
          gx[i] += (gvx[i] + Math.sin(age * 0.003 + gph[i]) * 10 * u) * dt; gy[i] += gvy[i] * dt;
          var tw = 0.5 + 0.5 * Math.sin(age * grate[i] + gph[i]);
          var ga = Math.min(1, age / 160) * (0.5 + 0.5 * tw);
          var gsize = gsz[i] * u * (0.7 + 0.35 * tw) * (1 + 0.9 * Math.exp(-age / 140));
          glowSpr(GLIT[gspr[i]], gx[i], gy[i], gsize, ga);
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── praise ───
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
        sprHalo = sprCore = sprRays = sprTwW = sprTwG = null; GLIT = null; bcv = bctx = null;
      };
    }
  });
})();
