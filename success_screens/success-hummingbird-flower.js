/* success-hummingbird-flower.js — מסך הצלחה: יוֹנֵק דְּבַשׁ וּפֶרַח 🌺
   יונק דבש זעיר ונוצץ (גב ירוק-אזמרגד, גרון סגול-מג'נטה שמנצנץ ומחליף גוון
   כשהוא זז, מקור ארוך ודק, עין אחת גדולה עם ניצוץ, כנפיים שמרפרפות מהר כמו
   הילה שקופה) מזנק פנימה במסלול מתפתל ומרחף מול פרח חצוצרה גדול על גבעול
   מעוקל עם עלים. הפרח נפתח עלה-כותרת אחרי עלה-כותרת (צבעים רכים, אבקנים
   זוהרים) בדיוק כשהציפור מגיעה; היא טובלת את המקור ולוגמת צוף, נצנצי צוף
   מתפזרים, ואז היא מציירת באוויר שמינייה שמחה שמשאירה סרט קשת מנצנץ — ומרחפת בגאווה.
   בסופר: יונק דבש שני (כחול-ספיר) מצטרף, גפנים מסתלסלות צומחות משני הצדדים
   ועוד פרחים נפתחים עליהן, וטיפות הצוף הופכות לכוכבים קטנים שעולים ומתפוצצים
   לטבעות נצנצים; בסוף שני הציפורים עושות לולאה ומרחפות זו מול זו.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeOut2(x) { x = clamp01(x); return 1 - (1 - x) * (1 - x); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeSine(x) { x = clamp01(x); return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function hexA(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mix(h1, h2, k) {
    var a = hexRgb(h1), b = hexRgb(h2), out = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(lerp(a[i], b[i], k)); out += (v < 16 ? '0' : '') + v.toString(16); }
    return out;
  }
  function v3n(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
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

  // ─── centripetal Catmull-Rom flight paths, sampled by arc length ───
  function crPt(p0, p1, p2, p3, u, out) {
    function kn(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1]; return Math.max(1e-3, Math.pow(dx * dx + dy * dy, 0.25)); }
    var t0 = 0, t1 = kn(p0, p1), t2 = t1 + kn(p1, p2), t3 = t2 + kn(p2, p3), t = lerp(t1, t2, u);
    for (var c = 0; c < 2; c++) {
      var a1 = ((t1 - t) * p0[c] + (t - t0) * p1[c]) / (t1 - t0);
      var a2 = ((t2 - t) * p1[c] + (t - t1) * p2[c]) / (t2 - t1);
      var a3 = ((t3 - t) * p2[c] + (t - t2) * p3[c]) / (t3 - t2);
      var b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0);
      var b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1);
      out[c] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
    }
    return out;
  }
  function makePath(pts) {
    var n = pts.length, first = pts[0], last = pts[n - 1];
    var ext = [[2 * first[0] - pts[1][0], 2 * first[1] - pts[1][1]]].concat(pts, [[2 * last[0] - pts[n - 2][0], 2 * last[1] - pts[n - 2][1]]]);
    var xs = [first[0]], ys = [first[1]], ds = [0], segD = [], SUB = 16, d = 0, px = first[0], py = first[1], tmp = [0, 0];
    for (var i = 0; i < n - 1; i++) {
      segD.push(d);
      for (var j = 1; j <= SUB; j++) {
        crPt(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], j / SUB, tmp);
        d += Math.sqrt((tmp[0] - px) * (tmp[0] - px) + (tmp[1] - py) * (tmp[1] - py)); px = tmp[0]; py = tmp[1];
        xs.push(px); ys.push(py); ds.push(d);
      }
    }
    segD.push(d);
    return { xs: xs, ys: ys, ds: ds, segD: segD, len: d };
  }
  function pathAt(P, d, out) {
    var k = P.xs.length - 1;
    if (d <= 0) { out[0] = P.xs[0]; out[1] = P.ys[0]; return out; }
    if (d >= P.len) { out[0] = P.xs[k]; out[1] = P.ys[k]; return out; }
    var lo = 0, hi = k;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (P.ds[mid] <= d) lo = mid; else hi = mid; }
    var f = (d - P.ds[lo]) / ((P.ds[hi] - P.ds[lo]) || 1);
    out[0] = lerp(P.xs[lo], P.xs[hi], f); out[1] = lerp(P.ys[lo], P.ys[hi], f);
    return out;
  }

  // ─── fixed design constants ───
  var AXIS_BUD  = v3n([0.5, -0.84, 0.2]);    // closed bud points up-right
  var AXIS_OPEN = v3n([0.68, -0.42, 0.6]);     // open trumpet nods toward the bird (3/4 view into the bell)
  var BEAK_TIP = [1.0, -0.235];              // bird-local beak tip (bird faces +x)
  var SIP_ROT = -0.36;                        // nose-down, beak along the flower's axis
  var RAINBOW = ['#FF5E87', '#FFA24C', '#FFE45E', '#62EA9C', '#4FC6FF', '#AE8CFF'];
  var EMERALD  = { line: '#04382A', b0: '#A8FFD6', b1: '#22D490', b2: '#08805A', belly0: '#F7FFFB', belly1: '#BFEBD7',
                   tail: '#0A6A4F', tailTip: '#E9FFF5', beak: '#544863', hue: 296, span: 40, sheen: 150 };
  var SAPPHIRE = { line: '#0A2C57', b0: '#C4F0FF', b1: '#47B4FF', b2: '#1A5FC2', belly0: '#FFFFFF', belly1: '#D6E6FA',
                   tail: '#17468E', tailTip: '#FFFFFF', beak: '#544863', hue: 348, span: 30, sheen: 200 };

  window.SUCCESS.styles.push({
    name: 'hummingbird-flower',
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

      // ─── canvas (DPR-aware; layout recomputed on resize) ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1, s = 1, cx = 0, fs = 1, bs = 1;
      var G = {};

      // ─── sprites (off-DOM) ───
      function makeGlow(core, mid) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, core); gr.addColorStop(0.22, hexA(mid, 0.75)); gr.addColorStop(0.5, hexA(mid, 0.22)); gr.addColorStop(1, hexA(mid, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      }
      var sprW = makeGlow('rgba(255,255,240,1)', '#FFD98A');
      var sprG = makeGlow(hexA(mix(glow, '#FFFFFF', 0.6), 1), glow);
      var sprP = makeGlow(hexA(mix(primary, '#FFFFFF', 0.5), 1), primary);

      // ─── colour sets ───
      function petalCols(deep, mid, light, back) {
        return { deep: deep, mid: mid, light: light, back: back, throat: mix(accent, '#FFF6D0', 0.35),
                 rim: hexA(mix(light, '#FFFFFF', 0.5), 0.75), outTip: mix(mid, light, 0.45), rimOut: hexA(mix(mid, '#FFFFFF', 0.3), 0.55), vein: hexA(deep, 0.32) };
      }
      var COL_MAIN = petalCols(mix(primary, '#8A0F5E', 0.42), mix(primary, '#FF5FA8', 0.42), mix(primary, '#FFF2F8', 0.72), mix(primary, '#5A1050', 0.45));
      var COL_V = [
        petalCols(mix(accent, '#E0507A', 0.55), mix(accent, '#FF9566', 0.35), mix(accent, '#FFF8EC', 0.65), mix(accent, '#A83A58', 0.6)),
        petalCols(mix(glow, '#3A47C8', 0.42), mix(glow, '#9FD8FF', 0.2), mix(glow, '#FFFFFF', 0.7), mix(glow, '#24348F', 0.55)),
        petalCols('#D93C7E', '#FF8FC0', '#FFE6F2', '#9C2A5E')
      ];

      // gradients in unit space (cached: re-used every frame under a transform)
      function birdGrads(C) {
        var g1 = ctx.createLinearGradient(-0.22, -0.52, 0.3, 0.42);
        g1.addColorStop(0, C.b0); g1.addColorStop(0.35, C.b1); g1.addColorStop(1, C.b2);
        var g2 = ctx.createLinearGradient(0.02, -0.12, 0.02, 0.34);
        g2.addColorStop(0, C.belly0); g2.addColorStop(1, C.belly1);
        var g3 = ctx.createLinearGradient(0, 0, 0.5, 0);
        g3.addColorStop(0, C.b2); g3.addColorStop(0.75, C.tail); g3.addColorStop(1, C.line);
        return { back: g1, belly: g2, tail: g3 };
      }
      var GR1 = birdGrads(EMERALD), GR2 = birdGrads(SAPPHIRE);
      var WING_G = ctx.createLinearGradient(0, 0, 0.88, 0);
      WING_G.addColorStop(0, 'rgba(205,255,238,.95)'); WING_G.addColorStop(0.55, 'rgba(215,240,255,.6)'); WING_G.addColorStop(1, 'rgba(255,255,255,.2)');
      var FAN_G = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.9);
      FAN_G.addColorStop(0, 'rgba(210,250,255,0)'); FAN_G.addColorStop(0.35, 'rgba(210,250,255,.10)');
      FAN_G.addColorStop(0.8, 'rgba(225,245,255,.20)'); FAN_G.addColorStop(1, 'rgba(225,245,255,0)');
      var LEAF_G = ctx.createLinearGradient(0, -0.32, 0, 0.3);
      LEAF_G.addColorStop(0, '#8DF2B0'); LEAF_G.addColorStop(0.5, '#2BB86C'); LEAF_G.addColorStop(1, '#127A45');
      var SEPAL_G = ctx.createLinearGradient(0, -0.3, 0, 0.3);
      SEPAL_G.addColorStop(0, '#7FE39E'); SEPAL_G.addColorStop(1, '#1D8C50');

      // ─── timeline (fractions of dur) ───
      var T = isSuper ? {
        stem: [0, 0.07], leaf: [0.03, 0.13], turn: [0.07, 0.2], bloom: 0.08, bStag: 0.02, bLen: 0.08, stam: [0.15, 0.25],
        zip: [0.02, 0.19], app: [0.19, 0.225], sip: [0.225, 0.32], nectar: [0.23, 0.33], fly: [0.32, 0.5], txt: 0.17,
        drops: 0.245, dStag: 0.022, dRise: 0.16, burst: 0.56, bigDrop: 0.47, bigRise: 0.14, bigBurst: 0.655,
        vine: [0.19, 0.47], zip2: [0.43, 0.6], loop: [0.7, 0.84]
      } : {
        stem: [0, 0.11], leaf: [0.05, 0.2], turn: [0.1, 0.31], bloom: 0.12, bStag: 0.028, bLen: 0.11, stam: [0.23, 0.37],
        zip: [0.03, 0.28], app: [0.28, 0.33], sip: [0.33, 0.45], nectar: [0.34, 0.52], fly: [0.45, 0.74], txt: 0.22
      };
      function ms(f) { return f * dur; }

      // ─── flowers ───
      function makeFlower(o) {
        var F = { K: [0, 0], fs: 1, A: AXIS_BUD.slice(), open: [], grow: 0, stam: 0, n: 5, th0: o.th0 || 0, col: o.col,
                  tube: o.tube, r0: o.r0, l1: o.l1, l2: o.l2, wk: o.wk || 1, sl: o.sl, small: !!o.small, f1o: o.f1o, f2o: o.f2o,
                  M2x: 0, M2y: 0, BCx: 0, BCy: 0, pet: [], ord: [], cup: new Float32Array(10) };
        for (var i = 0; i < F.n; i++) { F.open.push(0); F.pet.push({ pts: new Float32Array(18), z: 0, inner: false, v: new Float32Array(4) }); F.ord.push(i); }
        F.cmp = function (a, b) { return F.pet[a].z - F.pet[b].z; };
        return F;
      }
      var FM = makeFlower({ col: COL_MAIN, tube: 0.42, r0: 0.085, l1: 0.3, l2: 0.37, sl: 0.62, th0: -0.35, wk: 1.12, f1o: 0.34, f2o: 1.3 });

      // ─── particles ───
      var bgStars = [];
      for (var bsI = 0; bsI < 18; bsI++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bsI % 3 === 0 ? glow : bsI % 5 === 0 ? accent : '#FFFFFF' });
      var nectar = [];
      var NN = isSuper ? 20 : 30;
      for (var ni = 0; ni < NN; ni++)
        nectar.push({ t0: ms(T.nectar[0]) + Math.random() * ms(T.nectar[1] - T.nectar[0]) * 0.75, a: -Math.PI / 2 - 0.15 + rnd(-1.05, 1.05),
                      sp: rnd(0.7, 1.45), life: rnd(500, 850), r: rnd(0.7, 1.35), wob: rnd(0, TAU),
                      col: ni % 3 === 0 ? accent : ni % 3 === 1 ? '#FFFFFF' : '#FFD84A' });
      var motes = [];
      for (var mi = 0; mi < 9; mi++) motes.push({ x: rnd(-1, 1), y: rnd(0, 1), sp: rnd(0.6, 1.2), ph: rnd(0, TAU) });
      var drops = [];
      if (isSuper) for (var di = 0; di < 5; di++) {
        var big = di === 4;
        drops.push({ big: big, t0: ms(big ? T.bigDrop : T.drops + di * T.dStag), rise: ms(big ? T.bigRise : T.dRise),
                     tb: ms(big ? T.bigBurst : T.burst + di * 0.012), side: di < 2 ? -1 : 1, spin: rnd(-1, 1) });
      }

      // ─── layout (depends on W/H) ───
      function birdFromTip(tip, dir, rot, sc) {
        var lx = dir * BEAK_TIP[0] * sc, ly = BEAK_TIP[1] * sc, c = Math.cos(rot), sn = Math.sin(rot);
        return [tip[0] - (lx * c - ly * sn), tip[1] - (lx * sn + ly * c)];
      }
      function sampleFlat(P, n) {   // n points evenly spaced along a path → flat array
        var out = new Float32Array(n * 2), tmp = [0, 0];
        for (var i = 0; i < n; i++) { pathAt(P, P.len * i / (n - 1), tmp); out[2 * i] = tmp[0]; out[2 * i + 1] = tmp[1]; }
        return out;
      }
      function tanAt(arr, n, i) {
        var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        return Math.atan2(arr[2 * b + 1] - arr[2 * a + 1], arr[2 * b] - arr[2 * a]);
      }
      function layout() {
        var tall = H > W * 1.25;                   // phone portrait: a touch bigger, lifted toward the text
        s = Math.min(H * 0.2, W * (tall ? 0.33 : 0.3));
        unit = Math.min(W, H) / 800;
        cx = W / 2;
        fs = s * 1.3; bs = s * 0.58;
        var K = [cx - 0.5 * fs, H * (tall ? 0.64 : 0.7)];
        G.K = K;
        // the open throat (where the beak goes)
        var M2 = [K[0] + fs * AXIS_OPEN[0] * FM.tube, K[1] + fs * AXIS_OPEN[1] * FM.tube];
        G.M2 = M2;
        var dip = FM.tube + 0.34;                  // the beak slips into the mouth of the bell
        G.sip = birdFromTip([K[0] + fs * AXIS_OPEN[0] * dip, K[1] + fs * AXIS_OPEN[1] * dip], -1, SIP_ROT, bs);
        var al2 = Math.sqrt(AXIS_OPEN[0] * AXIS_OPEN[0] + AXIS_OPEN[1] * AXIS_OPEN[1]);
        G.ax2 = [AXIS_OPEN[0] / al2, AXIS_OPEN[1] / al2];
        G.hv = [G.sip[0] + 0.36 * bs * G.ax2[0], G.sip[1] + 0.36 * bs * G.ax2[1]];
        // main stem: an S-curve from the bottom to the calyx
        var base = [cx - 0.12 * s, H + 0.06 * s], hh = H - K[1];
        var c1 = [cx + 0.42 * s, H - 0.36 * hh], c2 = [K[0] - 0.42 * s, K[1] + 0.5 * hh];
        var NS = 40, st = new Float32Array(NS * 2);
        for (var i = 0; i < NS; i++) {
          var u = i / (NS - 1), v = 1 - u;
          st[2 * i] = v * v * v * base[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * K[0];
          st[2 * i + 1] = v * v * v * base[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * K[1];
        }
        G.stem = st; G.NS = NS;
        G.leaves = [];
        [[0.28, 1, 0.5], [0.52, -1, 0.44], [0.74, 1, 0.3]].forEach(function (L) {
          var k = Math.round(L[0] * (NS - 1));
          G.leaves.push({ x: st[2 * k], y: st[2 * k + 1], a: tanAt(st, NS, k) + L[1] * 1.0, len: L[2] * fs, u: L[0] });
        });
        // figure-8 above the flower
        var c8 = [cx + 0.04 * s, Math.max(H * 0.38, K[1] - 1.6 * s)];
        var A8 = Math.min(1.2 * s, W * 0.38), B8 = 0.4 * s;
        G.c8 = c8; G.A8 = A8;
        G.hf = isSuper ? [c8[0] + 0.56 * A8, c8[1] + 0.1 * s] : [c8[0], c8[1] + 0.02 * s];
        G.hf2 = [c8[0] - 0.56 * A8, c8[1] + 0.1 * s];
        G.lr = 0.3 * s;
        G.zip1 = makePath([[W + 2.2 * bs, H * 0.17], [lerp(G.hv[0], W, 0.6), G.hv[1] - 0.95 * s],
                           [G.hv[0] + 0.62 * s, G.hv[1] + 0.34 * s], [G.hv[0] + 0.18 * s, G.hv[1] - 0.12 * s], G.hv]);
        var pts = [G.sip, [G.sip[0] + 0.42 * s, G.sip[1] + 0.02 * s]];
        for (var k8 = 0; k8 <= 12; k8++) {
          var th = Math.PI / 2 - k8 * Math.PI / 6;
          pts.push([c8[0] + A8 * Math.sin(th), c8[1] - B8 * Math.sin(2 * th)]);
        }
        pts.push(G.hf);
        G.fly1 = makePath(pts);
        G.d8a = G.fly1.segD[2]; G.d8b = G.fly1.segD[14];
        var b1segs = [
          { k: 'path', P: G.zip1, t0: ms(T.zip[0]), t1: ms(T.zip[1]), ease: easeOut2, face: -1, trail: true },
          { k: 'lerp', a: G.hv, b: G.sip, t0: ms(T.app[0]), t1: ms(T.app[1]), face: -1, r0: 0, r1: SIP_ROT },
          { k: 'sip', at: G.sip, t0: ms(T.sip[0]), t1: ms(T.sip[1]), face: -1 },
          { k: 'path', P: G.fly1, t0: ms(T.fly[0]), t1: ms(T.fly[1]), ease: easeSine, face: 'vel', fIn: -1, fOut: -1, r0: SIP_ROT, ribbon: true },
          { k: 'hold', at: G.hf, t0: ms(T.fly[1]), t1: isSuper ? ms(T.loop[0]) : 1e9, face: -1, happy: true }
        ];
        G.b1 = { C: EMERALD, GR: GR1, sc: 1, ph: 0, segs: b1segs };
        G.birds = [G.b1];
        if (isSuper) {
          b1segs.push({ k: 'loop', at: G.hf, R: G.lr, sg: 1, t0: ms(T.loop[0]), t1: ms(T.loop[1]), face: -1 },
                      { k: 'hold', at: G.hf, t0: ms(T.loop[1]), t1: 1e9, face: -1, happy: true });
          G.zip2 = makePath([[-2.2 * bs, H * 0.2], [c8[0] - A8 * 1.3, c8[1] - 0.55 * s], [c8[0] - A8 * 1.05, c8[1] + 0.6 * s],
                             [G.hf2[0] - 0.2 * s, G.hf2[1] + 0.12 * s], G.hf2]);
          G.b2 = { C: SAPPHIRE, GR: GR2, sc: 0.9, ph: 1.7, segs: [
            { k: 'path', P: G.zip2, t0: ms(T.zip2[0]), t1: ms(T.zip2[1]), ease: easeOut2, face: 'vel', fIn: 1, fOut: 1, trail: true },
            { k: 'hold', at: G.hf2, t0: ms(T.zip2[1]), t1: ms(T.loop[0]), face: 1, happy: true },
            { k: 'loop', at: G.hf2, R: G.lr, sg: -1, t0: ms(T.loop[0]), t1: ms(T.loop[1]), face: 1 },
            { k: 'hold', at: G.hf2, t0: ms(T.loop[1]), t1: 1e9, face: 1, happy: true }
          ] };
          G.birds.push(G.b2);
          // nectar-star targets: an arc around the flower (+ one big star between the two birds)
          var Rx = Math.min(2.0 * s, W * 0.43), Ry = 1.3 * s, ac = [cx, K[1] - 0.25 * fs];
          G.dropT = [1.1, 1.28, 1.72, 1.9].map(function (f) { return [ac[0] + Rx * Math.cos(f * Math.PI), ac[1] + Ry * Math.sin(f * Math.PI)]; });
          G.dropT.push([c8[0], c8[1] - 0.02 * s]);
          // curling vines from both bottom corners, with blossoms
          var E = Math.min(1.95 * s, W * 0.45), vTop = K[1] - 0.15 * s, Hv = H - vTop;
          G.vines = [-1, 1].map(function (sg) {
            var vp = [[cx + sg * 0.1 * E, H + 0.03 * Hv], [cx + sg * 0.5 * E, H - 0.1 * Hv], [cx + sg * 0.86 * E, H - 0.36 * Hv],
                      [cx + sg * 0.93 * E, H - 0.7 * Hv], [cx + sg * 0.76 * E, H - 0.97 * Hv]];
            // the tendril curl: keep turning inward with shrinking steps
            var hx = vp[4][0] - vp[3][0], hy = vp[4][1] - vp[3][1], ha = Math.atan2(hy, hx), px = vp[4][0], py = vp[4][1], stp = 0.2 * s;
            for (var c = 0; c < 7; c++) { ha += -sg * (0.62 + c * 0.1); stp *= 0.78; px += Math.cos(ha) * stp; py += Math.sin(ha) * stp; vp.push([px, py]); }
            var P = makePath(vp), NV = 90, arr = sampleFlat(P, NV), lv = [], bl = [];
            [[0.13, 1], [0.22, -1], [0.45, 1], [0.53, -1], [0.7, 1], [0.78, -1]].forEach(function (L) {
              var k = Math.round(L[0] * (NV - 1));
              lv.push({ x: arr[2 * k], y: arr[2 * k + 1], a: tanAt(arr, NV, k) + L[1] * sg * -1.05, len: 0.34 * s, u: L[0] });
            });
            [0.32, 0.6, 0.84].forEach(function (u, j) {
              var k = Math.round(u * (NV - 1));
              var q = Math.acos(1 - 2 * clamp01(u + 0.03)) / Math.PI;          // vine grows with easeSine → time it reaches u
              var F = makeFlower({ col: COL_V[(j + (sg > 0 ? 1 : 0)) % 3], tube: 0.08, r0: 0.07, l1: 0.2, l2: 0.36, sl: 0.3, small: true, th0: rnd(0, TAU), wk: 0.95, f1o: 0.6, f2o: 1.42 });
              F.K = [arr[2 * k], arr[2 * k + 1]]; F.fs = s * (j === 2 ? 0.5 : 0.44);
              F.A = v3n([sg * 0.28, -0.32, 0.9]);
              bl.push({ F: F, u: u, tp: ms(lerp(T.vine[0], T.vine[1], q)) + 60 });
            });
            return { sg: sg, arr: arr, NV: NV, leaves: lv, bl: bl };
          });
        }
        FM.K = K; FM.fs = fs;
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
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
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers ───
      function glowDot(img, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function twinkle(x, y, r, col, a) {
        if (a <= 0.01 || r <= 0.2) return;
        glowDot(sprW, x, y, r * 2.4, a * 0.55);
        ctx.fillStyle = hexA(col, a);
        sparkPath(ctx, x, y, r); ctx.fill();
      }
      function circ(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      function ell(x, y, rx, ry, r) { ctx.moveTo(x + Math.cos(r) * rx, y + Math.sin(r) * rx); ctx.ellipse(x, y, rx, ry, r, 0, TAU); }
      function smoothClosed(a, n) {
        ctx.beginPath();
        ctx.moveTo((a[2 * (n - 1)] + a[0]) / 2, (a[2 * (n - 1) + 1] + a[1]) / 2);
        for (var i = 0; i < n; i++) {
          var k = (i + 1) % n;
          ctx.quadraticCurveTo(a[2 * i], a[2 * i + 1], (a[2 * i] + a[2 * k]) / 2, (a[2 * i + 1] + a[2 * k + 1]) / 2);
        }
        ctx.closePath();
      }
      function smoothOpen(a, i0, i1) {     // the free edge of a petal, through midpoints
        ctx.beginPath();
        ctx.moveTo((a[2 * i0] + a[2 * i0 + 2]) / 2, (a[2 * i0 + 1] + a[2 * i0 + 3]) / 2);
        for (var i = i0 + 1; i < i1; i++)
          ctx.quadraticCurveTo(a[2 * i], a[2 * i + 1], (a[2 * i] + a[2 * i + 2]) / 2, (a[2 * i + 1] + a[2 * i + 3]) / 2);
      }
      function leafAt(x, y, ang, len, open, narrow) {
        if (open <= 0.01 || len <= 0.5) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        var w = narrow ? 0.42 : 1;
        ctx.scale(len * open, len * open * w * lerp(0.35, 1, clamp01(open)));
        ctx.fillStyle = narrow ? SEPAL_G : LEAF_G;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.22, -0.36, 0.68, -0.3, 1, 0);
        ctx.bezierCurveTo(0.68, 0.24, 0.22, 0.3, 0, 0);
        ctx.fill();
        if (!narrow) {
          ctx.strokeStyle = 'rgba(205,255,222,.6)'; ctx.lineWidth = 0.028;
          ctx.beginPath(); ctx.moveTo(0.03, 0); ctx.quadraticCurveTo(0.5, -0.04, 0.93, 0); ctx.stroke();
          ctx.strokeStyle = 'rgba(205,255,222,.3)'; ctx.lineWidth = 0.018;
          ctx.beginPath();
          ctx.moveTo(0.28, -0.02); ctx.quadraticCurveTo(0.36, -0.1, 0.44, -0.16);
          ctx.moveTo(0.52, -0.03); ctx.quadraticCurveTo(0.6, -0.1, 0.68, -0.14);
          ctx.moveTo(0.34, 0.0); ctx.quadraticCurveTo(0.42, 0.07, 0.5, 0.12);
          ctx.moveTo(0.58, -0.01); ctx.quadraticCurveTo(0.66, 0.05, 0.74, 0.09);
          ctx.stroke();
        }
        ctx.restore();
      }
      function polyStroke(a, i0, i1) {
        ctx.beginPath(); ctx.moveTo(a[2 * i0], a[2 * i0 + 1]);
        for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(a[2 * i], a[2 * i + 1]);
        ctx.stroke();
      }
      function drawStalk(a, n, g, w0, w1) {   // a green stem grown to fraction g, tapering w0 → w1
        var m = Math.max(1, Math.round(g * (n - 1)));
        if (g <= 0.005) return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var CH = 4;
        for (var pass = 0; pass < 3; pass++) {
          for (var c = 0; c < CH; c++) {
            var i0 = Math.floor(c * m / CH), i1 = Math.floor((c + 1) * m / CH);
            if (i1 <= i0) continue;
            var w = lerp(w0, w1, (c + 0.5) / CH * (m / (n - 1)));
            if (pass === 0) { ctx.strokeStyle = '#0B4F2E'; ctx.lineWidth = w + Math.max(1.5, w * 0.35); }
            else if (pass === 1) { ctx.strokeStyle = '#33B26C'; ctx.lineWidth = w; }
            else { ctx.strokeStyle = 'rgba(170,255,200,.45)'; ctx.lineWidth = Math.max(1, w * 0.28); }
            polyStroke(a, i0, i1);
          }
        }
      }

      // ─── the flower (true 3-D petals, orthographic projection) ───
      function drawFlower(F, t) {
        var fz = F.fs * F.grow;
        if (fz < 0.5) return;
        var A = F.A, Kx = F.K[0], Ky = F.K[1], col = F.col, i;
        var ux = -A[2], uz = A[0], ul = Math.sqrt(ux * ux + uz * uz) || 1; ux /= ul; uz /= ul;   // U = A × ŷ
        var vx = A[1] * uz, vy = A[2] * ux - A[0] * uz, vz = -A[1] * ux;                          // V = A × U
        var Mx = A[0] * F.tube, My = A[1] * F.tube, Mz = A[2] * F.tube;
        var M2x = Kx + fz * Mx, M2y = Ky + fz * My;
        F.M2x = M2x; F.M2y = M2y;
        F.BCx = M2x + fz * A[0] * F.l1 * 0.8; F.BCy = M2y + fz * A[1] * F.l1 * 0.8;
        var openAvg = 0;
        for (i = 0; i < F.n; i++) openAvg += clamp01(F.open[i]) / F.n;
        // tube + calyx
        var ax = M2x - Kx, ay = M2y - Ky, al = Math.sqrt(ax * ax + ay * ay);
        if (al > 1) {
          var pnx = -ay / al, pny = ax / al, rk = fz * 0.045, rm = fz * F.r0 * 0.95;
          var mcx = (Kx + M2x) / 2, mcy = (Ky + M2y) / 2, rmid = (rk + rm) / 2;
          var tg = ctx.createLinearGradient(mcx - pnx * rmid, mcy - pny * rmid, mcx + pnx * rmid, mcy + pny * rmid);
          tg.addColorStop(0, col.mid); tg.addColorStop(0.45, col.deep); tg.addColorStop(1, col.back);
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.moveTo(Kx + pnx * rk, Ky + pny * rk); ctx.lineTo(M2x + pnx * rm, M2y + pny * rm);
          ctx.lineTo(M2x - pnx * rm, M2y - pny * rm); ctx.lineTo(Kx - pnx * rk, Ky - pny * rk);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = hexA(col.light, 0.45); ctx.lineWidth = Math.max(1, fz * 0.014);
          ctx.beginPath(); ctx.moveTo(Kx - pnx * rk * 0.45, Ky - pny * rk * 0.45); ctx.lineTo(M2x - pnx * rm * 0.5, M2y - pny * rm * 0.5); ctx.stroke();
        }
        var sa = al > 1 ? Math.atan2(ay, ax) : -Math.PI / 2;
        var slen = fz * (F.small ? 0.1 : 0.1 + 0.08 * Math.min(1, al / (fz * F.tube + 1e-3)));
        for (var q = -1; q <= 1; q++) leafAt(Kx, Ky, sa + q * (F.small ? 0.6 : 0.38), slen * (q ? 0.85 : 1), 1, true);
        ctx.fillStyle = '#2A9A5A'; ctx.beginPath(); ctx.arc(Kx, Ky, fz * (F.small ? 0.04 : 0.05), 0, TAU); ctx.fill();
        // petals
        var L1 = F.l1, L2 = F.l2;
        for (i = 0; i < F.n; i++) {
          var th = F.th0 + i * TAU / F.n, c = Math.cos(th), sn = Math.sin(th);
          var rx = ux * c + vx * sn, ry = vy * sn, rz = uz * c + vz * sn;
          var tx = -ux * sn + vx * c, ty = vy * c;
          var p = F.open[i];
          var f1 = lerp(-0.06, F.f1o, p), f2 = lerp(-0.26, F.f2o, p);
          var c1 = Math.cos(f1), s1 = Math.sin(f1), c2 = Math.cos(f2), s2 = Math.sin(f2);
          var d1x = A[0] * c1 + rx * s1, d1y = A[1] * c1 + ry * s1, d1z = A[2] * c1 + rz * s1;
          var d2x = A[0] * c2 + rx * s2, d2y = A[1] * c2 + ry * s2, d2z = A[2] * c2 + rz * s2;
          var bx = Mx + rx * F.r0, by = My + ry * F.r0;
          var mx = bx + d1x * L1, my = by + d1y * L1, mz = Mz + rz * F.r0 + d1z * L1;
          var w0 = F.r0 * 0.7, wm = lerp(0.07, 0.15, clamp01(p)) * F.wk, wx = lerp(0.09, 0.27, p) * F.wk;
          var Pp = F.pet[i], a = Pp.pts;
          var B2x = Kx + fz * bx, B2y = Ky + fz * by, m2x = Kx + fz * mx, m2y = Ky + fz * my;
          F.cup[2 * i] = m2x; F.cup[2 * i + 1] = m2y;
          var Dx = fz * d2x * L2, Dy = fz * d2y * L2, Tx = fz * tx, Ty = fz * ty;
          a[0] = B2x - Tx * w0;                   a[1] = B2y - Ty * w0;
          a[2] = m2x - Tx * wm;                   a[3] = m2y - Ty * wm;
          a[4] = m2x + Dx * 0.45 - Tx * wx;       a[5] = m2y + Dy * 0.45 - Ty * wx;
          a[6] = m2x + Dx * 0.86 - Tx * wx * 0.74; a[7] = m2y + Dy * 0.86 - Ty * wx * 0.74;
          a[8] = m2x + Dx * 1.06;                 a[9] = m2y + Dy * 1.06;
          a[10] = m2x + Dx * 0.86 + Tx * wx * 0.74; a[11] = m2y + Dy * 0.86 + Ty * wx * 0.74;
          a[12] = m2x + Dx * 0.45 + Tx * wx;      a[13] = m2y + Dy * 0.45 + Ty * wx;
          a[14] = m2x + Tx * wm;                  a[15] = m2y + Ty * wm;
          a[16] = B2x + Tx * w0;                  a[17] = B2y + Ty * w0;
          Pp.v[0] = B2x + fz * d1x * L1 * 0.25; Pp.v[1] = B2y + fz * d1y * L1 * 0.25;
          Pp.v[2] = m2x + Dx * 0.72;           Pp.v[3] = m2y + Dy * 0.72;
          Pp.z = mz + d2z * 0.4 * L2;
          Pp.inner = (-c2 * rz + s2 * A[2]) > -0.05;
        }
        F.ord.sort(F.cmp);
        var R = fz * (F.r0 + L1 + L2);
        var gIn = ctx.createRadialGradient(M2x, M2y, fz * 0.02, M2x, M2y, R);
        gIn.addColorStop(0, col.throat); gIn.addColorStop(0.2, col.deep); gIn.addColorStop(0.58, col.mid); gIn.addColorStop(1, col.light);
        var gOut = ctx.createRadialGradient(M2x, M2y, fz * 0.02, M2x, M2y, R);
        gOut.addColorStop(0, col.deep); gOut.addColorStop(0.5, col.mid); gOut.addColorStop(1, col.outTip);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (openAvg > 0.02) {                      // the inside of the cup, so no gaps show between petal bases
          ctx.fillStyle = gIn; ctx.globalAlpha = clamp01(openAvg * 3);
          smoothClosed(F.cup, F.n); ctx.fill();
          ctx.beginPath(); ctx.arc(M2x, M2y, fz * F.r0 * 1.1, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
        var rimW = Math.max(0.8, fz * 0.012);
        for (var oi = 0; oi < F.n; oi++) {
          var P2 = F.pet[F.ord[oi]];
          ctx.fillStyle = P2.inner ? gIn : gOut;
          smoothClosed(P2.pts, 9); ctx.fill();
          ctx.strokeStyle = P2.inner ? col.rim : col.rimOut; ctx.lineWidth = rimW;
          smoothOpen(P2.pts, 1, 7); ctx.stroke();
          if (P2.inner && !F.small) {
            ctx.strokeStyle = col.vein; ctx.lineWidth = Math.max(0.8, fz * 0.01);
            ctx.beginPath(); ctx.moveTo(P2.v[0], P2.v[1]); ctx.lineTo(P2.v[2], P2.v[3]); ctx.stroke();
          }
        }
        // glowing throat
        var faceK = clamp01(A[2] * 1.2);
        if (openAvg > 0.05) {
          ctx.globalCompositeOperation = 'lighter';
          glowDot(sprW, M2x + fz * A[0] * F.l1 * 0.4, M2y + fz * A[1] * F.l1 * 0.4, fz * (F.small ? 0.36 : 0.3), (F.small ? 0.7 : 0.4) * openAvg * (0.35 + 0.65 * faceK));
          ctx.globalCompositeOperation = 'source-over';
        }
        // stamen: a curved stalk with a crown of glowing pollen
        if (F.stam > 0.01) {
          var sd = F.small ? v3n([A[0] * 0.9, A[1] * 0.9 - 0.5, A[2] * 0.9 + 0.1]) : v3n([A[0] * 0.72, A[1] * 0.72 - 0.66, A[2] * 0.72 + 0.1]), Ls = F.sl * F.stam;
          var ex = M2x + fz * sd[0] * Ls, ey = M2y + fz * sd[1] * Ls;
          var cxs = M2x + fz * (sd[0] * Ls * 0.5 + 0.05), cys = M2y + fz * (sd[1] * Ls * 0.5 + 0.02);
          ctx.strokeStyle = '#FFF0C4'; ctx.lineWidth = Math.max(1, fz * 0.024);
          ctx.beginPath(); ctx.moveTo(M2x, M2y); ctx.quadraticCurveTo(cxs, cys, ex, ey); ctx.stroke();
          var pulse = 1 + 0.12 * Math.sin(t * 0.009 + F.th0 * 3);
          ctx.globalCompositeOperation = 'lighter';
          glowDot(sprW, ex, ey, fz * 0.26 * pulse * F.stam, 0.9 * F.stam);
          ctx.globalCompositeOperation = 'source-over';
          var nA = F.small ? 5 : 7, ar = fz * (F.small ? 0.04 : 0.05) * F.stam;
          for (var k = 0; k < nA; k++) {
            var aa = k * TAU / nA + F.th0, rr = k % 2 ? ar : ar * 0.8;
            ctx.fillStyle = '#FFCB3D'; ctx.strokeStyle = '#D9861A'; ctx.lineWidth = Math.max(0.6, fz * 0.006);
            ctx.beginPath(); ctx.arc(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr, fz * (F.small ? 0.017 : 0.02) * F.stam, 0, TAU); ctx.fill(); ctx.stroke();
          }
          ctx.fillStyle = '#FFF8DC'; ctx.beginPath(); ctx.arc(ex, ey, fz * 0.018 * F.stam, 0, TAU); ctx.fill();
        }
      }

      // ─── the hummingbird (side view facing +x; dir −1 mirrors) ───
      function bodySil(g, puff) {
        ctx.beginPath();
        circ(0.16, -0.3, 0.2 + g);                                    // head
        ell(-0.03, 0.05, 0.2 + g + puff * 0.015, 0.33 + g, 0.5);      // body (tilted, tail end down-back)
        circ(0.07, -0.04, 0.19 + g + puff * 0.03);                    // plump chest
      }
      function tailFan(C, GR, st) {
        var fan = 0.2 + st.puff * 0.14 + 0.04 * Math.sin(st.t * 0.011 + st.ph);
        var angs = [1.98 - fan, 1.98, 1.98 + fan], lens = [0.42, 0.5, 0.42];
        for (var i = 0; i < 3; i++) {
          ctx.save(); ctx.translate(-0.15, 0.3); ctx.rotate(angs[i]);
          var L = lens[i], w = 0.075;
          ctx.beginPath(); ctx.moveTo(0, -w);
          ctx.quadraticCurveTo(L * 0.62, -w * 1.35, L, 0); ctx.quadraticCurveTo(L * 0.62, w * 1.35, 0, w); ctx.closePath();
          ctx.fillStyle = GR.tail; ctx.fill();
          ctx.save(); ctx.clip();
          ctx.fillStyle = hexA(C.tailTip, 0.85); ctx.fillRect(L * 0.8, -w * 2, L * 0.3, w * 4);
          ctx.restore();
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.022; ctx.stroke();
          ctx.restore();
        }
      }
      function wingBlade(a, al) {
        ctx.save(); ctx.translate(-0.06, -0.13); ctx.rotate(a);
        ctx.globalAlpha = al;
        ctx.fillStyle = WING_G;
        ctx.beginPath(); ctx.moveTo(0, -0.035);
        ctx.quadraticCurveTo(0.45, -0.15, 0.88, -0.01); ctx.quadraticCurveTo(0.5, 0.07, 0, 0.045); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.012;
        ctx.beginPath(); ctx.moveTo(0.06, 0); ctx.quadraticCurveTo(0.45, -0.07, 0.8, -0.015); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      function wings(st, near) {
        var ph = st.t * 0.088 + (near ? 0 : 2.2) + st.ph;
        var mid = near ? -1.98 : -2.1, amp = 0.78;
        var a = mid + amp * Math.sin(ph);
        ctx.globalCompositeOperation = 'lighter';
        ctx.save(); ctx.translate(-0.06, -0.13);
        ctx.globalAlpha = near ? 1 : 0.6;
        ctx.fillStyle = FAN_G;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.9, mid - amp - 0.12, mid + amp + 0.12); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        var sg = Math.cos(ph) > 0 ? 1 : -1;
        wingBlade(a - sg * 0.32, near ? 0.14 : 0.08);
        wingBlade(a - sg * 0.16, near ? 0.22 : 0.12);
        wingBlade(a, near ? 0.42 : 0.24);
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawBird(b, x, y, dir, rot, st) {
        var C = b.C, GR = b.GR, sc = bs * b.sc;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);
        var dd = Math.abs(dir) < 0.1 ? (dir < 0 ? -0.1 : 0.1) : dir;
        ctx.scale(dd * sc, sc);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var puff = st.puff;
        wings(st, false);                       // far wing (behind)
        tailFan(C, GR, st);
        // long thin beak
        ctx.fillStyle = C.beak;
        ctx.beginPath(); ctx.moveTo(0.3, -0.355);
        ctx.quadraticCurveTo(0.66, -0.31, BEAK_TIP[0], BEAK_TIP[1]);
        ctx.quadraticCurveTo(0.66, -0.272, 0.3, -0.265); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,235,255,.5)'; ctx.lineWidth = 0.013;
        ctx.beginPath(); ctx.moveTo(0.38, -0.333); ctx.quadraticCurveTo(0.66, -0.302, 0.92, -0.25); ctx.stroke();
        // body: outline pass, then fill pass
        ctx.fillStyle = C.line; bodySil(0.03, puff); ctx.fill();
        ctx.fillStyle = GR.back; bodySil(0, puff); ctx.fill();
        ctx.save(); bodySil(0, puff); ctx.clip();
        // pale belly
        ctx.fillStyle = GR.belly; ctx.beginPath(); ell(0.07, 0.1, 0.13 + puff * 0.02, 0.22, 0.42); ctx.fill();
        // iridescent gorget — hue drifts and glints as the bird moves
        var phs = st.t * 0.004 + st.shim;
        var h = C.hue + C.span * Math.sin(phs), gp = 0.5 + 0.38 * Math.sin(phs * 1.6 + 0.7);
        var gg = ctx.createLinearGradient(0.08, -0.27, 0.34, -0.02);
        gg.addColorStop(0, 'hsl(' + (h - 12).toFixed(0) + ',90%,42%)');
        gg.addColorStop(clamp(gp - 0.22, 0.02, 0.96), 'hsl(' + h.toFixed(0) + ',95%,55%)');
        gg.addColorStop(clamp(gp, 0.03, 0.97), 'hsl(' + (h + 28).toFixed(0) + ',100%,' + (78 + 10 * st.flash).toFixed(0) + '%)');
        gg.addColorStop(clamp(gp + 0.22, 0.04, 0.98), 'hsl(' + (h + 10).toFixed(0) + ',95%,55%)');
        gg.addColorStop(1, 'hsl(' + (h - 20).toFixed(0) + ',85%,38%)');
        ctx.fillStyle = gg; ctx.beginPath(); ell(0.25, -0.15, 0.15 + puff * 0.02, 0.115 + puff * 0.015, -0.45); ctx.fill();
        // scale-like glints on the gorget
        ctx.fillStyle = 'hsla(' + (h + 40).toFixed(0) + ',100%,90%,' + (0.35 + 0.3 * st.flash).toFixed(2) + ')';
        ctx.beginPath(); ell(0.27, -0.19, 0.045, 0.02, -0.5); ell(0.21, -0.12, 0.035, 0.016, -0.5); ctx.fill();
        // emerald back sheen + crown shine
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'hsla(' + (C.sheen + 30 * Math.sin(phs * 0.8)).toFixed(0) + ',90%,70%,.32)';
        ctx.beginPath(); ell(-0.12, -0.06, 0.05, 0.2, 0.45); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ell(0.08, -0.44, 0.09, 0.035, -0.35); ctx.fill();
        ctx.restore();
        // the eye (true side view: one eye)
        var ex = 0.215, ey = -0.335;
        if (st.happy) {
          ctx.strokeStyle = '#1A0F1E'; ctx.lineWidth = 0.034;
          ctx.beginPath(); ctx.arc(ex, ey + 0.025, 0.06, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(ex, ey, 0.084, 0, TAU); ctx.fill();
          ctx.fillStyle = '#150C1A'; ctx.beginPath(); ctx.arc(ex + 0.006, ey + 0.004, 0.072, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(ex - 0.016, ey - 0.024, 0.026, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(ex + 0.028, ey + 0.026, 0.012, 0, TAU); ctx.fill();
        }
        // lashes at the back-top of the eye
        ctx.strokeStyle = '#1A0F1E'; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.moveTo(ex - 0.06, ey - 0.055); ctx.lineTo(ex - 0.1, ey - 0.088);
        ctx.moveTo(ex - 0.028, ey - 0.075); ctx.lineTo(ex - 0.045, ey - 0.118); ctx.stroke();
        // tiny blush
        ctx.fillStyle = 'rgba(255,120,170,.45)'; ctx.beginPath(); ell(0.27, -0.27, 0.04, 0.022, 0); ctx.fill();
        wings(st, true);                        // near wing (in front, translucent)
        ctx.restore();
      }

      // ─── bird motion: segments → pose ───
      var PA = [0, 0], PB = [0, 0];
      function segPos(b, S, t, out) {
        var q = clamp01((t - S.t0) / (S.t1 - S.t0));
        if (S.k === 'path') pathAt(S.P, S.ease(q) * S.P.len, out);
        else if (S.k === 'lerp') { var e = easeInOut(q); out[0] = lerp(S.a[0], S.b[0], e); out[1] = lerp(S.a[1], S.b[1], e); }
        else if (S.k === 'sip') {
          var dip = (0.5 - 0.5 * Math.cos(q * TAU * 2)) * 0.08 * bs;
          out[0] = S.at[0] - dip * G.ax2[0]; out[1] = S.at[1] - dip * G.ax2[1];
        } else if (S.k === 'loop') {
          var ps = Math.PI / 2 + S.sg * easeInOut(q) * TAU;
          out[0] = S.at[0] + Math.cos(ps) * S.R; out[1] = S.at[1] - S.R + Math.sin(ps) * S.R;
        } else {
          var ra = clamp01((t - S.t0) / 260) * clamp01((S.t1 - t) / 260);
          out[0] = S.at[0] + Math.sin(t * 0.0033 + b.ph) * 0.03 * s * ra;
          out[1] = S.at[1] + Math.sin(t * 0.0064 + b.ph) * 0.045 * s * ra;
        }
        return out;
      }
      function activeSeg(b, t) {
        var segs = b.segs;
        if (t < segs[0].t0) return null;
        for (var i = 0; i < segs.length; i++) if (t < segs[i].t1) return segs[i];
        return segs[segs.length - 1];
      }
      function pose(b, t) {
        var S = activeSeg(b, t);
        if (!S) return null;
        segPos(b, S, t, PA); segPos(b, S, t - 16, PB);
        var vx = (PA[0] - PB[0]) / 16;
        var q = clamp01((t - S.t0) / (S.t1 - S.t0)), dir, rot;
        if (S.face === 'vel') {
          var vd = Math.tanh(vx / (s * 0.0011));
          dir = lerp(S.fIn, vd, smooth(q / 0.14));
          dir = lerp(dir, S.fOut, smooth((q - 0.86) / 0.14));
        } else dir = S.face;
        if (S.k === 'loop') rot = S.sg * easeInOut(q) * TAU;
        else {
          rot = 0.36 * clamp(vx / (s * 0.007), -1, 1);
          if (S.k === 'lerp') rot += lerp(S.r0, S.r1, easeInOut(q));
          else if (S.k === 'sip') rot += SIP_ROT;
          else if (S.r0) rot += S.r0 * (1 - smooth(q / 0.18));
        }
        var puff = S.happy ? easeOut((t - S.t0) / 380) : 0;
        if (S.happy) rot += -dir * 0.1 * puff;
        return { x: PA[0], y: PA[1], dir: dir, rot: rot, happy: !!S.happy && t - S.t0 > 150, puff: puff, S: S, q: q };
      }

      // ─── rainbow ribbon ───
      var RX = new Float32Array(420), RY = new Float32Array(420), NX = new Float32Array(420), NY = new Float32Array(420), TP = new Float32Array(420);
      function ribbon(n, wid, a, t) {
        if (n < 3 || a <= 0.01) return;
        var i, k;
        for (i = 0; i < n; i++) {
          var i0 = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1;
          var tx = RX[i1] - RX[i0], ty = RY[i1] - RY[i0], tl = Math.sqrt(tx * tx + ty * ty) || 1;
          NX[i] = -ty / tl; NY[i] = tx / tl;
          var tp = Math.min(1, i / (n * 0.14 + 1), (n - 1 - i) / (n * 0.06 + 2));
          TP[i] = 0.12 + 0.88 * smooth(tp);
        }
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath(); ctx.moveTo(RX[0], RY[0]); for (i = 1; i < n; i++) ctx.lineTo(RX[i], RY[i]);
        ctx.strokeStyle = hexA(mix(glow, '#FFFFFF', 0.4), 0.045 * a); ctx.lineWidth = wid * 2.3; ctx.stroke();
        ctx.strokeStyle = hexA(mix(glow, '#FFFFFF', 0.4), 0.06 * a); ctx.lineWidth = wid * 1.55; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        var bw = wid / 6;
        ctx.lineWidth = bw * 1.3;
        for (k = 0; k < 6; k++) {
          var o = (k - 2.5) * bw;
          ctx.strokeStyle = hexA(RAINBOW[k], 0.88 * a);
          ctx.beginPath();
          for (i = 0; i < n; i++) {
            var x = RX[i] + NX[i] * o * TP[i], y = RY[i] + NY[i] * o * TP[i];
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        // a travelling shine + twinkles along the ribbon
        ctx.globalCompositeOperation = 'lighter';
        var sh = ((t * 0.0008) % 1.3) - 0.15, s0 = Math.max(0, Math.floor((sh - 0.07) * n)), s1 = Math.min(n - 1, Math.floor(sh * n));
        if (s1 > s0) {
          ctx.beginPath(); ctx.moveTo(RX[s0], RY[s0]); for (i = s0 + 1; i <= s1; i++) ctx.lineTo(RX[i], RY[i]);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 * a).toFixed(3) + ')'; ctx.lineWidth = wid * 1.1; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.28 * a).toFixed(3) + ')'; ctx.lineWidth = bw * 1.4; ctx.stroke();
        }
        for (i = 3; i < n - 2; i += 9) {
          var tw = Math.sin(t * 0.011 + i * 1.73);
          if (tw > 0.35) {
            var side = (i % 2 ? 1 : -1) * wid * 0.7 * TP[i];
            twinkle(RX[i] + NX[i] * side, RY[i] + NY[i] * side, (2 + 4 * (tw - 0.35)) * Math.max(0.7, unit * 1.2), i % 3 ? '#FFFFFF' : accent, a * (tw - 0.2));
          }
        }
        ctx.restore();
      }
      function ribbonFromPath(P, d0, d1, wid, a, t) {
        if (d1 - d0 < 4) return;
        var n = Math.min(400, Math.max(3, Math.ceil((d1 - d0) / 4))), tmp = PA;
        for (var i = 0; i < n; i++) { pathAt(P, lerp(d0, d1, i / (n - 1)), tmp); RX[i] = tmp[0]; RY[i] = tmp[1]; }
        ribbon(n, wid, a, t);
      }
      function ribbonLoop(S, q1, wid, a, t) {
        var e1 = easeInOut(q1) * TAU, n = Math.max(3, Math.min(200, Math.ceil(e1 * 26)));
        if (e1 < 0.05) return;
        for (var i = 0; i < n; i++) {
          var ps = Math.PI / 2 + S.sg * e1 * i / (n - 1);
          RX[i] = S.at[0] + Math.cos(ps) * S.R; RY[i] = S.at[1] - S.R + Math.sin(ps) * S.R;
        }
        ribbon(n, wid, a, t);
      }
      function sparkRing(x, y, R, q, nS, sz, cols, rot, noLine) {
        if (q <= 0 || q >= 1) return;
        ctx.globalCompositeOperation = 'lighter';
        var qa = Math.max(0, 1 - q * 1.7);
        glowDot(sprW, x, y, R * (0.45 + q * 0.6), 0.6 * qa * qa);
        if (!noLine && qa > 0) {
          ctx.strokeStyle = 'rgba(255,245,215,' + (0.45 * qa * qa).toFixed(3) + ')'; ctx.lineWidth = Math.max(1.5, sz * 0.3);
          ctx.beginPath(); ctx.arc(x, y, R * easeOut(q) * 0.9, 0, TAU); ctx.stroke();
        }
        for (var k = 0; k < nS; k++) {
          var aa = k / nS * TAU + rot, rr = R * easeOut(q);
          ctx.fillStyle = hexA(cols[k % cols.length], 1 - q);
          sparkPath(ctx, x + Math.cos(aa) * rr, y + Math.sin(aa) * rr, sz * (1 - q * 0.55)); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      function dropShape(x, y, r) {
        ctx.beginPath(); ctx.moveTo(x, y - r * 1.55);
        ctx.bezierCurveTo(x + r * 0.35, y - r * 0.85, x + r, y - r * 0.3, x + r, y + r * 0.15);
        ctx.arc(x, y + r * 0.15, r, 0, Math.PI);
        ctx.bezierCurveTo(x - r, y - r * 0.3, x - r * 0.35, y - r * 0.85, x, y - r * 1.55);
        ctx.closePath();
      }
      var RING_COLS = ['#FFFFFF', accent, glow, '#FFB3D9'];

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 300), i;

        // background twinkles
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], kk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.6 * kk * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        // ── flower state ──
        var gStem = easeOut((t - ms(T.stem[0])) / (ms(T.stem[1]) - ms(T.stem[0])));
        var turn = easeInOut((t - ms(T.turn[0])) / (ms(T.turn[1]) - ms(T.turn[0])));
        var sway = Math.sin(t * 0.0021) * 0.05;
        FM.A = v3n([lerp(AXIS_BUD[0], AXIS_OPEN[0], turn) + sway, lerp(AXIS_BUD[1], AXIS_OPEN[1], turn), lerp(AXIS_BUD[2], AXIS_OPEN[2], turn)]);
        FM.grow = clamp01(easeOutBack(clamp01((t - ms(T.stem[1]) * 0.6) / 260)));
        var bloomAvg = 0;
        for (i = 0; i < FM.n; i++) {
          var bq = clamp01((t - ms(T.bloom + i * T.bStag)) / ms(T.bLen));
          FM.open[i] = bq <= 0 ? 0 : easeOutBack(bq);
          bloomAvg += clamp01(bq) / FM.n;
        }
        FM.stam = easeOutBack(clamp01((t - ms(T.stam[0])) / (ms(T.stam[1]) - ms(T.stam[0]))));
        if (FM.stam < 0) FM.stam = 0;

        // soft halo behind the flower
        ctx.globalCompositeOperation = 'lighter';
        glowDot(sprP, G.M2[0] + 0.15 * fs, G.M2[1] - 0.05 * fs, fs * (0.85 + 0.45 * bloomAvg), (0.18 + 0.32 * bloomAvg) * appear);
        ctx.globalCompositeOperation = 'source-over';

        // ── super: curling vines with blossoms (behind the main flower) ──
        if (isSuper) {
          var gv = easeSine((t - ms(T.vine[0])) / (ms(T.vine[1]) - ms(T.vine[0])));
          for (var vi = 0; vi < G.vines.length; vi++) {
            var V = G.vines[vi];
            drawStalk(V.arr, V.NV, gv, 0.055 * s, 0.014 * s);
            for (var li = 0; li < V.leaves.length; li++) {
              var Lf = V.leaves[li];
              leafAt(Lf.x, Lf.y, Lf.a, Lf.len, easeOutBack(clamp01((gv - Lf.u) / 0.1)), false);
            }
            for (var bj = 0; bj < V.bl.length; bj++) {
              var Bl = V.bl[bj], F = Bl.F;
              F.grow = easeOutBack(clamp01((gv - Bl.u + 0.02) / 0.08));
              if (F.grow <= 0) continue;
              for (var pi = 0; pi < F.n; pi++) {
                var pq = clamp01((t - Bl.tp - pi * 45) / 330);
                F.open[pi] = pq <= 0 ? 0 : easeOutBack(pq);
              }
              F.stam = clamp01((t - Bl.tp - 200) / 300);
              F.A = v3n([V.sg * 0.28 + Math.sin(t * 0.002 + bj) * 0.04, -0.32, 0.9]);
              ctx.globalCompositeOperation = 'lighter';
              glowDot(sprP, F.K[0], F.K[1], F.fs * 0.9, 0.3 * clamp01((t - Bl.tp) / 300));
              ctx.globalCompositeOperation = 'source-over';
              drawFlower(F, t);
              sparkRing(F.M2x, F.M2y, s * 0.42, (t - Bl.tp - 120) / 600, 7, s * 0.05, RING_COLS, bj + vi);
            }
          }
        }

        // ── main stem, leaves, flower ──
        drawStalk(G.stem, G.NS, gStem, 0.06 * fs, 0.042 * fs);
        for (i = 0; i < G.leaves.length; i++) {
          var L = G.leaves[i];
          var lo = easeOutBack(clamp01((t - ms(T.leaf[0]) - i * ms(0.025)) / (ms(T.leaf[1]) - ms(T.leaf[0]))));
          leafAt(L.x, L.y, L.a + Math.sin(t * 0.002 + i) * 0.04, L.len, lo, false);
        }
        drawFlower(FM, t);
        var Mx = FM.BCx, My = FM.BCy;

        // pollen motes drifting up around the flower
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < motes.length; i++) {
          var mo = motes[i], my = ((mo.y + t * 0.00011 * mo.sp) % 1);
          glowDot(sprW, Mx + mo.x * fs * 0.9 + Math.sin(t * 0.002 + mo.ph) * 8 * unit, My + fs * 0.4 - my * fs * 1.4,
                  4.5 * unit + 2, 0.5 * bloomAvg * Math.sin(my * Math.PI));
        }
        ctx.globalCompositeOperation = 'source-over';

        // ── rainbow ribbon (behind the birds) ──
        var b1 = G.b1, flyS = b1.segs[3];
        if (t > flyS.t0) {
          var dNow = flyS.ease(clamp01((t - flyS.t0) / (flyS.t1 - flyS.t0))) * flyS.P.len;
          if (dNow > G.d8a) {
            var rbA = isSuper ? 1 - 0.35 * clamp01((t - ms(0.68)) / ms(0.12)) : 1;
            ribbonFromPath(flyS.P, G.d8a, Math.min(dNow, G.d8b), s * 0.13, rbA, t);
          }
        }
        if (isSuper) {
          for (var lb = 0; lb < G.birds.length; lb++) {
            var LS = G.birds[lb].segs[G.birds[lb].segs.length - 2];
            if (t > LS.t0) {
              var lq = clamp01((t - LS.t0) / (LS.t1 - LS.t0)), la = 0.85 * (1 - clamp01((t - LS.t1 - 150) / 500));
              ribbonLoop(LS, lq, s * 0.075, la, t);
            }
          }
        }

        // ── nectar sparkles fizzing out of the throat (+ a warm glow while she sips) ──
        ctx.globalCompositeOperation = 'lighter';
        var sipK = Math.sin(Math.PI * clamp01((t - ms(T.sip[0]) + 120) / (ms(T.sip[1]) - ms(T.sip[0]) + 300)));
        if (sipK > 0) glowDot(sprW, Mx, My, fs * (0.45 + 0.1 * Math.sin(t * 0.02)), 0.45 * sipK);
        for (i = 0; i < nectar.length; i++) {
          var nc = nectar[i], age = t - nc.t0;
          if (age <= 0 || age >= nc.life) continue;
          var nk = age / nc.life, dist = nc.sp * s * easeOut(nk) * 0.9;
          var nx = Mx + Math.cos(nc.a) * dist + Math.sin(age * 0.012 + nc.wob) * 4 * unit;
          var ny = My + Math.sin(nc.a) * dist - nk * 0.3 * s;
          twinkle(nx, ny, s * 0.055 * nc.r * (1 - 0.5 * nk) * (1 + 0.25 * Math.sin(age * 0.03 + nc.wob)), nc.col, (1 - nk) * clamp01(age / 80));
        }
        ctx.globalCompositeOperation = 'source-over';

        // ── birds ──
        for (var bi = 0; bi < G.birds.length; bi++) {
          var B = G.birds[bi], ps = pose(B, t);
          if (!ps) continue;
          // sparkly trail while zipping in
          if (ps.S.trail) {
            ctx.globalCompositeOperation = 'lighter';
            for (var tj = 1; tj <= 9; tj++) {
              var tt2 = t - tj * 30;
              if (tt2 < ps.S.t0) break;
              segPos(B, ps.S, tt2, PB);
              twinkle(PB[0] + Math.sin(tj * 2.3) * 0.08 * s, PB[1] + Math.cos(tj * 1.7) * 0.08 * s, s * 0.035 * (1 - tj / 11), tj % 2 ? '#FFFFFF' : accent, 0.8 * (1 - tj / 10));
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // soft halo so the little bird reads over the dark
          ctx.globalCompositeOperation = 'lighter';
          glowDot(sprG, ps.x, ps.y - 0.08 * bs, bs * B.sc * 1.05, 0.2 + 0.06 * ps.puff);
          ctx.globalCompositeOperation = 'source-over';
          var flash = ps.S.happy ? Math.max(0, Math.sin((t - ps.S.t0) * 0.006)) : 0;
          drawBird(B, ps.x, ps.y, ps.dir, ps.rot,
                   { t: t, ph: B.ph, puff: ps.puff, happy: ps.happy, shim: ps.rot * 3 + ps.dir * 1.3 + ps.x * 0.01, flash: flash });
          // proud sparkle burst when it settles
          var hs = ps.S;
          if (hs.k === 'hold' && hs.happy && hs.t1 > 1e8) sparkRing(ps.x, ps.y - 0.1 * bs, s * 0.7, (t - hs.t0 + 60) / 750, 12, s * 0.065, RING_COLS, 0.3, true);
        }

        // ── super: nectar drops → rising stars → sparkle rings ──
        for (i = 0; i < drops.length; i++) {
          var D = drops[i], dq = (t - D.t0) / D.rise;
          if (dq <= 0) continue;
          var tg = G.dropT[i], e = easeOut(dq);
          var dx = lerp(Mx, tg[0], e) + Math.sin(clamp01(dq) * Math.PI) * D.side * 0.25 * s;
          var dy = lerp(My, tg[1], e) + Math.sin(t * 0.004 + i) * 0.03 * s * clamp01(dq);
          var sz = s * (D.big ? 0.15 : 0.085);
          if (t < D.tb) {
            var morph = smooth((dq - 0.3) / 0.35), dA = clamp01(dq * 5);
            ctx.globalCompositeOperation = 'lighter';
            glowDot(sprW, dx, dy, sz * (2 + 1.6 * morph) * (1 + 0.1 * Math.sin(t * 0.012 + i)), 0.85 * dA);
            ctx.globalCompositeOperation = 'source-over';
            if (morph < 1) {
              ctx.globalAlpha = dA * (1 - morph);
              var dg = ctx.createRadialGradient(dx - sz * 0.15, dy - sz * 0.1, 0, dx, dy, sz * 0.5);
              dg.addColorStop(0, '#FFFDF0'); dg.addColorStop(0.5, '#FFE27A'); dg.addColorStop(1, '#F7B733');
              ctx.fillStyle = dg; dropShape(dx, dy, sz * 0.42); ctx.fill();
              ctx.globalAlpha = 1;
            }
            if (morph > 0) {
              var rs = sz * (0.4 + 0.6 * morph) * (1 + 0.08 * Math.sin(t * 0.01 + i));
              ctx.globalAlpha = dA * morph;
              var sgd = ctx.createRadialGradient(dx - rs * 0.25, dy - rs * 0.3, rs * 0.05, dx, dy, rs);
              sgd.addColorStop(0, '#FFFCE6'); sgd.addColorStop(0.5, '#FFE066'); sgd.addColorStop(1, '#F5A623');
              ctx.fillStyle = sgd; ctx.strokeStyle = '#D9831A'; ctx.lineWidth = Math.max(1, rs * 0.08); ctx.lineJoin = 'round';
              starPath(ctx, dx, dy, rs, (t - D.t0) * 0.0012 * D.spin, 0.5); ctx.fill(); ctx.stroke();
              ctx.fillStyle = 'rgba(255,255,255,.75)';
              ctx.beginPath(); ctx.ellipse(dx - rs * 0.18, dy - rs * 0.32, rs * 0.16, rs * 0.08, -0.5, 0, TAU); ctx.fill();
              ctx.globalAlpha = 1;
            }
          } else {
            var rq = (t - D.tb) / (D.big ? 800 : 650);
            sparkRing(dx, dy, s * (D.big ? 0.95 : 0.5), rq, D.big ? 16 : 10, s * (D.big ? 0.085 : 0.06), RING_COLS, i * 0.4);
            if (D.big) sparkRing(dx, dy, s * 0.55, rq * 1.25, 8, s * 0.06, ['#FFFFFF', accent], 0.2);
          }
        }

        // ── praise + points ──
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

      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        layout();
      }
      fit();
      window.addEventListener('resize', fit);
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
        sprW = sprG = sprP = null;
      };
    }
  });
})();
