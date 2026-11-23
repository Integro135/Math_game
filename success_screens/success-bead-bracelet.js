/* success-bead-bracelet.js — מסך הצלחה: צְמִיד חֲרוּזִים
   חוט משי זוהר מסתלסל למעגל (נראה קצת מלמעלה — אליפסה עם עומק), וחרוזים
   מבריקים — עגולים בצבעי הקשת, קריסטלים מלוטשים, לבבות, כוכבים ופנינים —
   עפים פנימה בזה אחר זה מכל קצות המסך, מחליקים על החוט בקפיצה קטנה ונצנוץ.
   כשהמעגל מלא, הסוגר נסגר בקליק, תליון לב זהב נופל ומתנדנד ממנו, הצמיד
   מסתובב לאט (חרוזים קדמיים גדולים ובהירים, אחוריים קטנים ועמומים) וברק עובר עליו.
   בסופר: שרשרת פנינים גדולה נוצרת סביב הצמיד, ברק קשת רץ סביב שניהם,
   התליון מנצנץ וטבעת נצנצים מתפרצת החוצה.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
  var PERSP = 0.1;      // positional perspective: the near side of the ring is a little wider
  var DS = 0.2;         // bead size depth factor: front beads bigger, back beads smaller
  var NK = 1.56;        // super: the pearl necklace radius, in bracelet radii

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x, c1) { if (c1 == null) c1 = 1.70158; var c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  // k > 0 mixes toward white, k < 0 toward black
  function shade(hex, k, a) {
    var c = rgbOf(hex), t = k > 0 ? 255 : 0, m = Math.min(1, Math.abs(k));
    return 'rgba(' + Math.round(c[0] + (t - c[0]) * m) + ',' + Math.round(c[1] + (t - c[1]) * m) + ',' +
      Math.round(c[2] + (t - c[2]) * m) + ',' + (a == null ? 1 : a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartPath(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.92);
    g.bezierCurveTo(x - s * 0.3, y + s * 0.66, x - s * 1.04, y + s * 0.26, x - s * 0.99, y - s * 0.3);
    g.bezierCurveTo(x - s * 0.95, y - s * 0.86, x - s * 0.3, y - s * 0.98, x, y - s * 0.5);
    g.bezierCurveTo(x + s * 0.3, y - s * 0.98, x + s * 0.95, y - s * 0.86, x + s * 0.99, y - s * 0.3);
    g.bezierCurveTo(x + s * 1.04, y + s * 0.26, x + s * 0.3, y + s * 0.66, x, y + s * 0.92);
    g.closePath();
  }
  function bez(a, b, c, d, u) { var v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  // ─── bead sprites: each drawn ONCE per show() into an off-DOM canvas (+ a dimmed twin for the far side) ───
  function finish(cv, rb) {
    var d = mk(cv.width, cv.height), g = d.getContext('2d');
    g.drawImage(cv, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(22,12,50,.5)'; g.fillRect(0, 0, d.width, d.height);
    return { cv: cv, dim: d, rb: rb };
  }
  function base(rb) { var S = Math.ceil(rb * 3); var cv = mk(S, S); return { cv: cv, g: cv.getContext('2d'), c: S / 2 }; }
  function softShadow(g, c, rb) {             // soft contact shadow down-right, falls on the beads behind
    var sx = c + rb * 0.1, sy = c + rb * 0.26, sr = rb * 1.2;
    var gr = g.createRadialGradient(sx, sy, rb * 0.45, sx, sy, sr);
    gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
  }
  function gloss(g, x, y, rb, a) {            // call inside a clip: soft sheen + sharp specular + window kicker
    var hx = x - rb * 0.36, hy = y - rb * 0.42;
    var sg = g.createRadialGradient(hx, hy, 0, hx, hy, rb * 0.62);
    sg.addColorStop(0, 'rgba(255,255,255,' + (0.5 * a).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(hx - rb, hy - rb, rb * 2, rb * 2);
    g.fillStyle = 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')';
    g.beginPath(); g.ellipse(hx, hy, rb * 0.23, rb * 0.125, -0.7, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (0.45 * a).toFixed(3) + ')';
    g.beginPath(); g.ellipse(x + rb * 0.4, y + rb * 0.44, rb * 0.09, rb * 0.05, -0.7, 0, TAU); g.fill();
  }
  function sprRound(rb, col, stops) {
    var B = base(rb), g = B.g, c = B.c;
    softShadow(g, c, rb);
    var gr = g.createRadialGradient(c - rb * 0.35, c - rb * 0.4, rb * 0.04, c - rb * 0.1, c - rb * 0.1, rb * 1.12);
    if (stops) for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    else {
      gr.addColorStop(0, shade(col, 0.72)); gr.addColorStop(0.24, shade(col, 0.28)); gr.addColorStop(0.58, col);
      gr.addColorStop(0.86, shade(col, -0.38)); gr.addColorStop(1, shade(col, -0.62));
    }
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, rb, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(c, c, rb, 0, TAU); g.clip();
    var rl = g.createRadialGradient(c + rb * 0.3, c + rb * 0.66, 0, c + rb * 0.3, c + rb * 0.66, rb * 0.62);
    rl.addColorStop(0, stops ? 'rgba(255,236,160,.55)' : shade(col, 0.5, 0.6)); rl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rl; g.fillRect(0, 0, c * 2, c * 2);
    gloss(g, c, c, rb, 1);
    g.restore();
    return finish(B.cv, rb);
  }
  function sprPearl(rb) {
    var B = base(rb), g = B.g, c = B.c;
    softShadow(g, c, rb);
    var gr = g.createRadialGradient(c - rb * 0.32, c - rb * 0.36, rb * 0.03, c, c, rb);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.3, '#FFF7EE'); gr.addColorStop(0.66, '#EEE0D2');
    gr.addColorStop(0.9, '#CBB9AA'); gr.addColorStop(1, '#A69384');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, rb, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(c, c, rb, 0, TAU); g.clip();
    var ir = g.createRadialGradient(c + rb * 0.38, c + rb * 0.48, 0, c + rb * 0.38, c + rb * 0.48, rb * 0.85);
    ir.addColorStop(0, 'rgba(255,170,210,.42)'); ir.addColorStop(1, 'rgba(255,170,210,0)');
    g.fillStyle = ir; g.fillRect(0, 0, c * 2, c * 2);
    var ib = g.createRadialGradient(c + rb * 0.55, c - rb * 0.35, 0, c + rb * 0.55, c - rb * 0.35, rb * 0.6);
    ib.addColorStop(0, 'rgba(170,215,255,.3)'); ib.addColorStop(1, 'rgba(170,215,255,0)');
    g.fillStyle = ib; g.fillRect(0, 0, c * 2, c * 2);
    gloss(g, c, c, rb, 0.85);
    g.restore();
    return finish(B.cv, rb);
  }
  function sprCrystal(rb, col) {
    var B = base(rb), g = B.g, c = B.c, n = 8, O = [], I = [], k, a, L = -0.75 * Math.PI;
    softShadow(g, c, rb);
    for (k = 0; k < n; k++) {
      a = (k - 0.5) / n * TAU - HALF_PI;
      O.push([c + Math.cos(a) * rb, c + Math.sin(a) * rb, a]);
      a += Math.PI / n;
      I.push([c + Math.cos(a) * rb * 0.52, c + Math.sin(a) * rb * 0.52, a]);
    }
    function tri(p, q, r, fill) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.closePath(); g.fillStyle = fill; g.fill(); }
    var o0, o1, i0, i1;
    for (k = 0; k < n; k++) {
      o0 = O[k]; o1 = O[(k + 1) % n]; i0 = I[k]; i1 = I[(k + 1) % n];
      tri(o0, o1, i0, shade(col, -0.6 + 1.2 * (0.5 + 0.5 * Math.cos(i0[2] - L))));          // girdle facets
      tri(i0, i1, o1, shade(col, -0.42 + 1.02 * (0.5 + 0.5 * Math.cos(o1[2] - L + 1.1))));   // star facets
    }
    var tg = g.createLinearGradient(c - rb * 0.5, c - rb * 0.5, c + rb * 0.5, c + rb * 0.5);
    tg.addColorStop(0, shade(col, 0.62)); tg.addColorStop(0.5, shade(col, 0.15)); tg.addColorStop(1, shade(col, -0.2));
    g.beginPath(); for (k = 0; k < n; k++) g[k ? 'lineTo' : 'moveTo'](I[k][0], I[k][1]); g.closePath(); g.fillStyle = tg; g.fill();
    g.globalCompositeOperation = 'lighter';                                                   // a little rainbow fire
    tri(O[5], O[6], I[5], 'rgba(110,220,255,.32)'); tri(I[2], I[3], O[3], 'rgba(255,130,220,.32)'); tri(O[7], O[0], I[7], 'rgba(255,240,150,.3)');
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = Math.max(1, rb * 0.03); g.lineJoin = 'round';
    g.beginPath();
    for (k = 0; k < n; k++) {
      o0 = O[k]; o1 = O[(k + 1) % n]; i0 = I[k]; i1 = I[(k + 1) % n];
      g.moveTo(o0[0], o0[1]); g.lineTo(i0[0], i0[1]); g.lineTo(o1[0], o1[1]);
      g.moveTo(i0[0], i0[1]); g.lineTo(i1[0], i1[1]);
    }
    g.stroke();
    g.strokeStyle = shade(col, 0.6, 0.9); g.lineWidth = Math.max(1, rb * 0.055);
    g.beginPath(); for (k = 0; k < n; k++) g[k ? 'lineTo' : 'moveTo'](O[k][0], O[k][1]); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.95)'; sparkPath(g, c - rb * 0.3, c - rb * 0.34, rb * 0.44); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; sparkPath(g, c + rb * 0.42, c + rb * 0.22, rb * 0.2); g.fill();
    return finish(B.cv, rb);
  }
  function sprHeart(rb, col) {
    var B = base(rb), g = B.g, c = B.c;
    softShadow(g, c, rb * 0.95);
    var gr = g.createRadialGradient(c - rb * 0.45, c - rb * 0.42, rb * 0.04, c - rb * 0.1, c, rb * 1.2);
    gr.addColorStop(0, shade(col, 0.72)); gr.addColorStop(0.24, shade(col, 0.28)); gr.addColorStop(0.58, col);
    gr.addColorStop(0.86, shade(col, -0.4)); gr.addColorStop(1, shade(col, -0.62));
    heartPath(g, c, c, rb); g.fillStyle = gr; g.fill();
    g.save(); heartPath(g, c, c, rb); g.clip();
    var rl = g.createRadialGradient(c + rb * 0.3, c + rb * 0.5, 0, c + rb * 0.3, c + rb * 0.5, rb * 0.6);
    rl.addColorStop(0, shade(col, 0.5, 0.55)); rl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rl; g.fillRect(0, 0, c * 2, c * 2);
    gloss(g, c - rb * 0.1, c, rb, 1);
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath(); g.ellipse(c + rb * 0.5, c - rb * 0.52, rb * 0.13, rb * 0.065, -0.45, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = shade(col, -0.5, 0.55); g.lineWidth = Math.max(1, rb * 0.04);
    heartPath(g, c, c, rb); g.stroke();
    return finish(B.cv, rb);
  }
  function sprStar(rb, col) {
    var B = base(rb), g = B.g, c = B.c, P = [], V = [], i, a, L = -0.75 * Math.PI;
    softShadow(g, c, rb * 0.9);
    for (i = 0; i < 5; i++) {
      a = -HALF_PI + i * TAU / 5; P.push([c + Math.cos(a) * rb * 0.95, c + Math.sin(a) * rb * 0.95]);
      a += Math.PI / 5; V.push([c + Math.cos(a) * rb * 0.5, c + Math.sin(a) * rb * 0.5]);
    }
    g.lineJoin = 'round'; g.lineWidth = rb * 0.16; g.strokeStyle = g.fillStyle = shade(col, -0.3);
    g.beginPath(); for (i = 0; i < 5; i++) { g[i ? 'lineTo' : 'moveTo'](P[i][0], P[i][1]); g.lineTo(V[i][0], V[i][1]); } g.closePath();
    g.fill(); g.stroke();
    function tri(p, q, r, fill) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = 0.8; g.stroke(); }
    var C = [c, c - rb * 0.04];
    for (i = 0; i < 5; i++) {
      var p = P[i], v = V[i], vp = V[(i + 4) % 5];
      var aL = Math.atan2((vp[1] + p[1]) / 2 - c, (vp[0] + p[0]) / 2 - c), aR = Math.atan2((v[1] + p[1]) / 2 - c, (v[0] + p[0]) / 2 - c);
      tri(C, vp, p, shade(col, -0.3 + 0.95 * (0.5 + 0.5 * Math.cos(aL - L))));
      tri(C, p, v, shade(col, -0.3 + 0.95 * (0.5 + 0.5 * Math.cos(aR - L))));
    }
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(1, rb * 0.03); g.lineCap = 'round';
    g.beginPath(); for (i = 0; i < 5; i++) { g.moveTo(C[0], C[1]); g.lineTo(P[i][0], P[i][1]); } g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.ellipse(c - rb * 0.2, c - rb * 0.32, rb * 0.13, rb * 0.06, -1.0, 0, TAU); g.fill();
    sparkPath(g, c - rb * 0.06, c - rb * 0.06, rb * 0.26); g.fill();
    return finish(B.cv, rb);
  }
  function sprCharm(rb, gem) {
    var B = base(rb), g = B.g, c = B.c;
    softShadow(g, c, rb);
    heartPath(g, c, c, rb); g.fillStyle = '#7A4A04'; g.fill();
    var gr = g.createLinearGradient(c - rb * 0.9, c - rb * 0.9, c + rb * 0.8, c + rb * 0.95);
    gr.addColorStop(0, '#FFF8D2'); gr.addColorStop(0.28, '#FFE070'); gr.addColorStop(0.55, '#F5B62C');
    gr.addColorStop(0.8, '#C98510'); gr.addColorStop(1, '#8F5A06');
    heartPath(g, c, c - rb * 0.01, rb * 0.94); g.fillStyle = gr; g.fill();
    var g2 = g.createLinearGradient(c - rb * 0.7, c - rb * 0.7, c + rb * 0.7, c + rb * 0.7);   // bevel: inverse slope
    g2.addColorStop(0, '#C8860E'); g2.addColorStop(0.5, '#F7C548'); g2.addColorStop(1, '#FFF2B8');
    heartPath(g, c, c + rb * 0.02, rb * 0.74); g.fillStyle = g2; g.fill();
    var g3 = g.createRadialGradient(c - rb * 0.38, c - rb * 0.36, 0, c - rb * 0.1, c, rb * 0.85);
    g3.addColorStop(0, 'rgba(255,255,240,.9)'); g3.addColorStop(0.45, 'rgba(255,226,130,.35)'); g3.addColorStop(1, 'rgba(255,220,120,0)');
    heartPath(g, c, c + rb * 0.03, rb * 0.69); g.fillStyle = g3; g.fill();
    var gs = rb * 0.27, gk = gs / gem.rb, gw = gem.cv.width * gk;                       // a rosy gem set in the middle
    g.drawImage(gem.cv, c - gw / 2, c + rb * 0.06 - gw / 2, gw, gw);
    g.save(); heartPath(g, c, c, rb * 0.94); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = rb * 0.07; g.lineCap = 'round';
    g.beginPath(); g.arc(c - rb * 0.5, c - rb * 0.28, rb * 0.44, Math.PI * 1.06, Math.PI * 1.42); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = rb * 0.045;
    g.beginPath(); g.arc(c + rb * 0.5, c - rb * 0.28, rb * 0.42, Math.PI * 1.6, Math.PI * 1.78); g.stroke();
    g.restore();
    g.fillStyle = '#FFFFFF'; sparkPath(g, c - rb * 0.6, c - rb * 0.62, rb * 0.24); g.fill();
    return finish(B.cv, rb);
  }

  var C_GOLD = [[0, '#FFFBE3'], [0.22, '#FFE689'], [0.55, '#F4B731'], [0.84, '#B87A0C'], [1, '#6B4205']];
  var COLS = { red: '#FF4F6E', orange: '#FF9A3C', gold: '#FFC93C', green: '#38D98A', blue: '#3FA2FF', violet: '#A76BFF', pink: '#FF6FB5', rasp: '#FF4F95' };
  var RR = { round: 0.166, crystal: 0.17, heart: 0.18, star: 0.19, pearl: 0.104 };   // bead radii, in bracelet radii

  window.SUCCESS.styles.push({
    name: 'bead-bracelet',
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

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, DPR = 1, unit = 1, R = 100, cx = 0, cy = 0, tilt = 0.47;
      function layout() {
        var portrait = H > W * 1.05;
        tilt = portrait ? 0.56 : 0.47;
        var top = H * (portrait ? 0.245 : 0.27), bot = H * 0.975;
        var ka = isSuper ? tilt * 0.9 * NK + 0.1 : tilt * 0.9 + 0.13;      // above the centre (far beads)
        var kb = tilt * 1.1 + 0.7;                                          // below: front beads + hanging charm
        var rW = Math.min(W * (portrait ? 0.4 : 0.3), W * 0.47 / (isSuper ? NK + 0.1 : 1.17));
        var rH = (bot - top) / (ka + kb);
        R = Math.max(20, Math.min(rW, rH));
        cx = W / 2;
        cy = top + R * ka + Math.max(0, (bot - top) - R * (ka + kb)) * (portrait ? 0.3 : 0.45);
        unit = Math.min(W, H) / 800;
      }
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        layout();
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── sprites (sized for this screen) ───
      var rbF = Math.max(20, Math.min(110, Math.ceil(R * 0.21 * DPR)));
      var rbS = Math.max(12, Math.min(64, Math.ceil(R * 0.11 * DPR)));
      var rbC = Math.max(24, Math.min(160, Math.ceil(R * 0.28 * DPR)));
      var cache = {};
      function getSpr(type, col) {
        var key = type + col;
        if (!cache[key]) cache[key] = type === 'round' ? sprRound(rbF, col) : type === 'crystal' ? sprCrystal(rbF, col)
          : type === 'heart' ? sprHeart(rbF, col) : type === 'star' ? sprStar(rbF, col) : sprPearl(rbF);
        return cache[key];
      }
      var sPearlS = isSuper ? sprPearl(rbS) : null;
      var sGold = sprRound(rbS, null, C_GOLD);
      var sCharm = sprCharm(rbC, sprCrystal(Math.ceil(rbC * 0.3), '#FF5FA8'));
      function glowSprite(c0, c1) {
        var s = mk(64, 64), g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, c0); gr.addColorStop(0.22, c1); gr.addColorStop(0.55, c1.replace(/[\d.]+\)$/, '0.22)')); gr.addColorStop(1, c1.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return s;
      }
      var spr = glowSprite('rgba(255,255,235,1)', 'rgba(255,226,150,0.8)');
      var pool = glowSprite(hexA(primary, 0.9), hexA(primary, 0.55));
      var hues = [];
      for (var hi = 0; hi < 12; hi++) hues.push(glowSprite('hsla(' + hi * 30 + ',100%,82%,1)', 'hsla(' + hi * 30 + ',100%,62%,0.75)'));

      // ─── timeline (nominal ms, scaled to dur) ───
      var kT = dur / (isSuper ? 4500 : 2700);
      var T = isSuper
        ? { th0: 60, th1: 560, c0: 360, step: 50, F: 440, snap0: 1400, snap1: 1540, shine: [[1720, 2140, 1]], txt: 0.2,
            neck0: 1850, neck1: 2600, burst: 2640, rain0: 2720, rain1: 3960, tw: [2950, 3330, 3720], fade: 280 }
        : { th0: 60, th1: 600, c0: 380, step: 58, F: 460, snap0: 1610, snap1: 1750, shine: [[1880, 2330, 1]], txt: 0.26,
            tw: [2200], fade: 280 };
      if (isSuper) T.shine.push([3780, 4200, NK]);
      ['th0', 'th1', 'c0', 'step', 'F', 'snap0', 'snap1', 'neck0', 'neck1', 'burst', 'rain0', 'rain1'].forEach(function (k) { if (T[k] != null) T[k] *= kT; });
      T.shine.forEach(function (s) { s[0] *= kT; s[1] *= kT; });
      T.tw = T.tw.map(function (v) { return v * kT; });
      var tS = T.snap0 + (T.snap1 - T.snap0) * 0.42;      // the "click"
      var tC0 = tS + 30 * kT;                            // charm drops
      function spin(t) { var d = (t - tS) / 1000; return d < 0 ? 0.42 * d : 0.55 * Math.sin(d * 0.42 / 0.55); }
      function spinVel(t) { var d = (t - tS) / 1000; return d < 0 ? 0.42 : 0.42 * Math.cos(d * 0.42 / 0.55); }
      function spinN(t) { return -0.24 * (t - (T.neck0 || 0)) / 1000; }

      // ─── the bracelet: pearl, feature, pearl, feature … pearl ───
      // order chosen so the star, crystals and hearts finish on the near side once the bracelet has turned
      var FEAT = [['crystal', primary], ['round', COLS.red], ['heart', COLS.pink], ['round', COLS.orange], ['crystal', glow],
                  ['round', COLS.green], ['round', COLS.blue], ['round', COLS.violet], ['heart', COLS.rasp], ['star', COLS.gold]];
      var seq = [['pearl', '#FFF1E4']], i;
      for (i = 0; i < FEAT.length; i++) { seq.push(FEAT[i]); seq.push(['pearl', '#FFF1E4']); }
      var GAP = 0.34, SPC = 0.008, sumW = 0;
      for (i = 0; i < seq.length; i++) sumW += RR[seq[i][0]] * 2 + SPC;
      var wsc = (TAU - GAP) / sumW, cum = 0, beads = [];
      for (i = 0; i < seq.length; i++) {
        var ty = seq[i][0], w = RR[ty] * 2 + SPC;
        beads.push({ kind: 'b', type: ty, col: seq[i][1], sp: getSpr(ty, seq[i][1]), rr: RR[ty], phi: GAP / 2 + (cum + w / 2) * wsc,
                     tC: T.c0 + i * T.step, aOff: 0.75 + rnd(-0.15, 0.15), dir: i % 2 ? 1 : -1,
                     tumble: ty === 'heart' || ty === 'star' || ty === 'crystal', face: ty === 'heart' || ty === 'star' ? 0.55 : ty === 'crystal' ? 0.78 : 1,
                     x: 0, y: 0, z: 0, r: 0, a: 0, b: 1, rot: 0, sx: 1, th: 0, q: 1, vis: false,
                     p0x: 0, p0y: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, p3x: 0, p3y: 0 });
        cum += w;
      }
      var clasp = { kind: 'c', z: 0, vis: true, th: 0 };
      var neck = [];
      if (isSuper) {
        var NP = 36;
        for (i = 0; i < NP * 2; i++) {
          var ph = i / (NP * 2) * TAU, isP = i % 2 === 1, d = Math.min(ph, TAU - ph);
          neck.push({ kind: 'n', type: isP ? 'pearl' : 'gold', col: isP ? '#FFF1E4' : '#FFD86A', sp: isP ? sPearlS : sGold, rr: isP ? 0.085 : 0.032,
                      phi: ph, tPop: T.neck0 + d / Math.PI * (T.neck1 - T.neck0) + 30 * kT,
                      x: 0, y: 0, z: 0, r: 0, a: 1, b: 1, rot: 0, sx: 1, th: 0, vis: false });
        }
      }
      var order = [], SX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SY = SX.slice();
      function byZ(p1, p2) { return p1.z - p2.z; }

      var bgStars = [];
      for (var bs = 0; bs < 20; bs++)
        bgStars.push({ x: Math.random(), y: Math.random(), tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bs % 3 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      var burst = [];
      if (isSuper) {
        var BC = ['#FFFFFF', accent, primary, glow, '#FFB3DE', '#FFFFFF'];
        for (var bi = 0; bi < 40; bi++)
          burst.push({ a: bi / 40 * TAU + rnd(-0.05, 0.05), sp: rnd(0.7, 1.25), sz: rnd(0.6, 1.25), col: BC[bi % BC.length], rot: rnd(0, TAU) });
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
      var txtAt = T.txt * dur;
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
      function drawSpr(sp, x, y, r, rot, sx, alpha, bright) {
        if (alpha <= 0 || r <= 0) return;
        var S = sp.cv.width * r / sp.rb, h = S / 2, tr = rot !== 0 || sx !== 1;
        if (tr) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== 1) ctx.scale(sx, 1); x = 0; y = 0; }
        if (bright < 0.995) { ctx.globalAlpha = alpha; ctx.drawImage(sp.dim, x - h, y - h, S, S); }
        ctx.globalAlpha = alpha * (bright < 0.995 ? bright : 1);
        ctx.drawImage(sp.cv, x - h, y - h, S, S);
        ctx.globalAlpha = 1;
        if (tr) ctx.restore();
      }
      function shineAt(x, y, t) {                         // diagonal light band sweeping left → right
        var I = 0;
        for (var s = 0; s < T.shine.length; s++) {
          var w = T.shine[s], q = (t - w[0]) / (w[1] - w[0]);
          if (q <= 0 || q >= 1) continue;
          var pos = lerp(-1.45, 1.45, easeInOut(q)), pr = ((x - cx) * 0.92 + (y - cy) * 0.4) / (R * 1.15 * w[2]);
          var dd = (pr - pos) / 0.2;
          I = Math.max(I, Math.exp(-dd * dd));
        }
        return I;
      }
      var rI = 0, rH = 0;
      function rainAt(th, t) {                            // rainbow shimmer chasing around both rings (super)
        rI = 0;
        if (!isSuper || t < T.rain0 || t > T.rain1) return;
        var q = (t - T.rain0) / (T.rain1 - T.rain0), env = clamp01(q * 6) * clamp01((1 - q) * 4);
        var head = -HALF_PI + q * TAU * 1.35, d = ((head - th) % TAU + TAU) % TAU, tail = 2.8;
        if (d > tail) return;
        rI = Math.pow(1 - d / tail, 1.2) * env;
        rH = Math.floor(d / tail * 11.99);
      }
      function ringPt(th, k, rf) {                        // projected point on a ring of radius k·R (rf: curl factor)
        var z = Math.sin(th), p = 1 + PERSP * z, rr = R * k * rf * p;
        PX = cx + Math.cos(th) * rr; PY = cy + z * rr * tilt; PZ = z;
      }
      var PX = 0, PY = 0, PZ = 0;

      // trace one ring's thread, only the part on one side (front or back) — curl: 0 none, 1 bracelet, 2 necklace
      function traceArc(k, ph0, ph1, off, front, curl, t) {
        var n = Math.max(2, Math.ceil(Math.abs(ph1 - ph0) / 0.03)), pen = false, lx = 0, ly = 0, has = false;
        for (var j = 0; j <= n; j++) {
          var ph = lerp(ph0, ph1, j / n), th = ph + off, rf = 1;
          if (curl === 1) {
            var s = (ph - TH.a) / (TH.b - TH.a), xs = 1 - Math.pow(1 - clamp01(s), 1 / 1.7);
            var age = t - (T.th0 + xs * (T.th1 - T.th0)), cu = 1 - easeOut(age / (420 * kT));
            rf = 1 + 0.32 * cu + 0.05 * cu * Math.sin(age * 0.03);
          } else if (curl === 2) {
            var dd = Math.min(Math.abs(ph), TAU - Math.abs(ph)), ageN = t - (T.neck0 + dd / Math.PI * (T.neck1 - T.neck0));
            rf = 1 + 0.09 * (1 - easeOut(ageN / (380 * kT)));
          }
          ringPt(th, k, rf);
          var on = (PZ >= 0) === front;
          if (!on) { if (pen) ctx.lineTo(PX, PY); pen = false; }
          else if (pen) ctx.lineTo(PX, PY);
          else { if (has) { ctx.moveTo(lx, ly); ctx.lineTo(PX, PY); } else ctx.moveTo(PX, PY); pen = true; }
          lx = PX; ly = PY; has = true;
        }
      }
      var TH = { a: 0.09, b: TAU - 0.12 };
      var open = 1, spB = 0, spNk = 0;
      function strokeThread(halo, core, wHalo, wCore) {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = halo; ctx.lineWidth = wHalo; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = core; ctx.lineWidth = wCore; ctx.stroke();
      }
      function drawThreads(front, t) {
        var m = front ? 1 : 0.5;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // bracelet: silk thread curling around from the ring end of the clasp
        if (t > T.th0) {
          var xh = clamp01((t - T.th0) / (T.th1 - T.th0)), uh = 1 - Math.pow(1 - xh, 1.7);
          TH.b = TAU - 0.12 - 0.13 * open;
          var phEnd = lerp(TH.a, TH.b, uh), off = HALF_PI + spB;
          ctx.beginPath(); traceArc(1, TH.a, phEnd, off, front, 1, t);
          strokeThread(hexA(primary, 0.34 * m), 'rgba(255,238,248,' + (0.92 * m).toFixed(3) + ')', Math.max(3, R * 0.034), Math.max(1.3, R * 0.0105));
          if (xh < 1) {                                   // the glowing needle-head
            ringPt(phEnd + off, 1, 1.32);
            if ((PZ >= 0) === front) {
              ctx.globalCompositeOperation = 'lighter';
              glowDot(spr, PX, PY, R * 0.16, 0.95);
              ctx.fillStyle = 'rgba(255,255,255,.95)'; sparkPath(ctx, PX, PY, R * 0.06 * (1 + 0.25 * Math.sin(t * 0.03))); ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }
          }
          if (isSuper) rainbowArc(1, off, front, t);
        }
        // super: the pearl necklace thread, racing from the back down both sides
        if (isSuper && t > T.neck0) {
          var un = clamp01((t - T.neck0) / (T.neck1 - T.neck0)), offN = 1.5 * Math.PI + spNk;
          ctx.beginPath(); traceArc(NK, -un * Math.PI, un * Math.PI, offN, front, 2, t);
          strokeThread(hexA(accent, 0.3 * m), 'rgba(255,246,222,' + (0.9 * m).toFixed(3) + ')', Math.max(2.5, R * 0.026), Math.max(1.1, R * 0.008));
          if (un < 1) {
            for (var sgn = -1; sgn <= 1; sgn += 2) {
              ringPt(sgn * un * Math.PI + offN, NK, 1.09);
              if ((PZ >= 0) !== front) continue;
              ctx.globalCompositeOperation = 'lighter';
              glowDot(spr, PX, PY, R * 0.14, 0.95);
              ctx.fillStyle = '#FFFFFF'; sparkPath(ctx, PX, PY, R * 0.05); ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }
          }
          rainbowArc(NK, offN, front, t);
        }
      }
      function rainbowArc(k, off, front, t) {               // the rainbow light running along the thread
        if (!isSuper || t < T.rain0 || t > T.rain1) return;
        var q = (t - T.rain0) / (T.rain1 - T.rain0), env = clamp01(q * 6) * clamp01((1 - q) * 4);
        var head = -HALF_PI + q * TAU * 1.35, tail = 2.8, N = 22;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = Math.max(3, R * 0.04);
        for (var j = 0; j < N; j++) {
          var a0 = head - tail * j / N, a1 = head - tail * (j + 1) / N, I = Math.pow(1 - j / N, 1.2) * env * (front ? 1 : 0.55);
          var mid = (a0 + a1) / 2;
          if ((Math.sin(mid) >= 0) !== front) continue;
          ctx.strokeStyle = 'hsla(' + Math.round(j / N * 330) + ',100%,66%,' + (0.75 * I).toFixed(3) + ')';
          ctx.beginPath(); ringPt(a0, k, 1); ctx.moveTo(PX, PY); ringPt((a0 + mid) / 2, k, 1); ctx.lineTo(PX, PY);
          ringPt(mid, k, 1); ctx.lineTo(PX, PY); ringPt(a1, k, 1); ctx.lineTo(PX, PY); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // the clasp (jump ring + lobster claw) and the point where the charm hangs
      var JX = 0, JY = 0, JS = 1;
      function claspGeom() {
        var off = HALF_PI + spB;
        ringPt(0.045 + off, 1, 1);
        var s = 1 + DS * PZ;
        clasp.rx = PX; clasp.ry = PY; clasp.s = s; clasp.z = PZ + 0.001; clasp.th = 0.045 + off;
        JX = PX; JY = PY + R * 0.036 * s; JS = s;
        var thL = -0.048 - 0.13 * open + off;
        ringPt(thL, 1, 1);
        clasp.lx = PX; clasp.ly = PY; clasp.lz = PZ;
        clasp.la = Math.atan2(tilt * Math.cos(thL), -Math.sin(thL)) - 0.95 * open;
      }
      function drawClasp(t) {
        var a = clamp01((t - T.th0) / 150);
        if (a <= 0) return;
        var s = clasp.s, rr = R * 0.036 * s, b = 0.4 + 0.6 * Math.sqrt((clasp.z + 1) / 2);
        ctx.globalAlpha = a * (0.55 + 0.45 * b);
        ctx.lineWidth = Math.max(2.5, R * 0.02 * s); ctx.strokeStyle = '#6B4205';
        ctx.beginPath(); ctx.arc(clasp.rx, clasp.ry, rr, 0, TAU); ctx.stroke();
        ctx.lineWidth = Math.max(1.5, R * 0.012 * s); ctx.strokeStyle = '#FFD866';
        ctx.beginPath(); ctx.arc(clasp.rx, clasp.ry, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,240,.95)'; ctx.lineWidth = Math.max(1, R * 0.006 * s);
        ctx.beginPath(); ctx.arc(clasp.rx, clasp.ry, rr, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
        ctx.globalAlpha = 1;
        // the lobster claw appears once the thread has come all the way round
        var la = clamp01((t - T.th1) / 160);
        if (la > 0) {
          var ll = R * 0.05 * s, lw = R * 0.026 * s;
          ctx.save(); ctx.translate(clasp.lx, clasp.ly); ctx.rotate(clasp.la);
          ctx.globalAlpha = la * (0.55 + 0.45 * b);
          ctx.lineWidth = Math.max(1.5, R * 0.01 * s); ctx.strokeStyle = '#6B4205';
          ctx.beginPath(); ctx.arc(-ll * 1.05, 0, lw * 0.55, 0, TAU); ctx.stroke();            // tail ring
          ctx.strokeStyle = '#FFD866'; ctx.lineWidth = Math.max(1, R * 0.006 * s); ctx.stroke();
          var lg = ctx.createLinearGradient(0, -lw, 0, lw);
          lg.addColorStop(0, '#FFF6C8'); lg.addColorStop(0.4, '#FFD45A'); lg.addColorStop(0.75, '#D3920F'); lg.addColorStop(1, '#7A4A04');
          ctx.beginPath();                                                                       // claw body: a gold teardrop
          ctx.moveTo(-ll * 0.62, 0);
          ctx.bezierCurveTo(-ll * 0.6, -lw * 1.05, ll * 0.55, -lw * 1.1, ll * 0.72, -lw * 0.1);
          ctx.bezierCurveTo(ll * 0.6, lw * 0.95, -ll * 0.55, lw * 0.95, -ll * 0.62, 0);
          ctx.closePath(); ctx.fillStyle = lg; ctx.fill();
          ctx.strokeStyle = '#6B4205'; ctx.lineWidth = Math.max(1, R * 0.006 * s); ctx.stroke();
          ctx.strokeStyle = 'rgba(90,50,0,.8)';                                                  // the spring gate
          ctx.beginPath(); ctx.moveTo(-ll * 0.25, lw * 0.35); ctx.quadraticCurveTo(ll * 0.2, lw * 0.55, ll * 0.5, lw * 0.15); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.beginPath(); ctx.ellipse(-ll * 0.1, -lw * 0.5, ll * 0.32, lw * 0.16, -0.05, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      function drawCharm(t) {
        if (t < tC0) return null;
        var tau = t - tC0, k = tau / (380 * kT), kk = clamp01(k);
        var len = 1 - Math.cos(kk * 7.5) * Math.exp(-kk * 5.5);
        var scl = 0.35 + 0.65 * easeOutBack(clamp01(k * 1.5), 1.6);
        var ang = 0.3 * Math.sin(tau * 0.0072 + 0.35) * Math.exp(-tau / 1500) - 0.18 * (spinVel(t) - 0.42 * Math.exp(-tau / 400));
        var hh = R * 0.23 * scl * JS, Lc = R * 0.07 * len * JS, cyL = Lc + hh * 0.6;
        ctx.save(); ctx.translate(JX, JY); ctx.rotate(ang);
        ctx.globalAlpha = clamp01(k * 6);
        // bail link
        ctx.lineWidth = Math.max(2.4, R * 0.018 * JS); ctx.strokeStyle = '#6B4205';
        ctx.beginPath(); ctx.ellipse(0, Lc * 0.5 + hh * 0.05, R * 0.016 * JS, Lc * 0.5 + R * 0.014 * JS, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = Math.max(1.3, R * 0.01 * JS); ctx.strokeStyle = '#FFD866'; ctx.stroke();
        var sx = 0.84 + 0.16 * Math.cos(tau * 0.0055);
        drawSpr(sCharm, 0, cyL, hh, 0, sx, clamp01(k * 6), 1);
        ctx.restore();
        var c = Math.cos(ang), s = Math.sin(ang);
        return { x: JX - s * cyL, y: JY + c * cyL, r: hh, ang: ang, sx: sx };
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / T.fade);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 300), i, b;

        // background twinkles
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], tk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.55 * tk * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // soft pool of light under the bracelet (+ a pulse when the clasp clicks)
        var pulse = Math.exp(-Math.pow((t - tS) / (260 * kT), 2));
        ctx.globalCompositeOperation = 'lighter';
        var pk = isSuper && t > T.neck0 ? lerp(1, NK, easeOut((t - T.neck0) / (T.neck1 - T.neck0))) : 1;
        ctx.globalAlpha = (0.34 + 0.25 * pulse) * appear;
        ctx.drawImage(pool, cx - R * 1.45 * pk, cy - R * tilt * 1.5 * pk, R * 2.9 * pk, R * tilt * 3 * pk);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        spB = spin(t);
        spNk = spinN(t);
        var qs = clamp01((t - T.snap0) / (T.snap1 - T.snap0));
        open = 1 - easeOutBack(qs, 2.4);
        claspGeom();

        // ─── place the bracelet beads ───
        order.length = 0;
        var F = T.F, Dfly = Math.max(W, H) * 0.62;
        for (i = 0; i < beads.length; i++) {
          b = beads[i];
          var q = (t - (b.tC - F * 0.5)) / F;
          b.vis = q > 0; b.q = q;
          if (!b.vis) continue;
          var th = b.phi + HALF_PI + spB, z = Math.sin(th), p = 1 + PERSP * z;
          var sx0 = cx + Math.cos(th) * R * p, sy0 = cy + z * R * tilt * p;
          var dS = 1 + DS * z, dB = 0.4 + 0.6 * Math.sqrt((z + 1) / 2), fsx = b.face < 1 ? b.face + (1 - b.face) * Math.abs(z) : 1;
          b.th = th;
          if (q < 1) {
            var a0 = b.phi + HALF_PI + spin(b.tC) + b.aOff;
            b.p0x = cx + Math.cos(a0) * Dfly; b.p0y = cy + Math.sin(a0) * Dfly * 0.8;
            var tx = -Math.sin(th), ty = tilt * Math.cos(th), tl = Math.sqrt(tx * tx + ty * ty) || 1;
            tx /= tl; ty /= tl;
            b.c2x = sx0 + tx * R * 0.62; b.c2y = sy0 + ty * R * 0.62;
            var dx = b.c2x - b.p0x, dy = b.c2y - b.p0y;
            b.c1x = b.p0x + dx * 0.4 - dy * 0.22; b.c1y = b.p0y + dy * 0.4 + dx * 0.22;
            b.p3x = sx0; b.p3y = sy0;
            var u = easeOutBack(q, 1.0), e = easeOut(q * 1.7);
            b.x = bez(b.p0x, b.c1x, b.c2x, b.p3x, u); b.y = bez(b.p0y, b.c1y, b.c2y, b.p3y, u);
            b.r = b.rr * R * lerp(1.38, dS, e);
            b.b = lerp(1, dB, e);
            b.a = clamp01(q * 7);
            b.rot = b.tumble ? (1 - e) * 2.6 * b.dir : 0;
            b.sx = lerp(1, fsx, e);
            b.z = q < 0.5 ? 100 + q : z;
          } else {
            b.x = sx0; b.y = sy0; b.r = b.rr * R * dS; b.b = dB; b.a = 1; b.rot = 0; b.sx = fsx; b.z = z;
          }
          var kp = (t - b.tC) / (200 * kT);
          if (kp > 0 && kp < 1) b.r *= 1 + 0.12 * Math.sin(Math.PI * kp);
          order.push(b);
        }
        order.push(clasp);
        // ─── super: the pearl necklace ───
        for (i = 0; i < neck.length; i++) {
          b = neck[i];
          b.vis = t > b.tPop;
          if (!b.vis) continue;
          var thN = b.phi + 1.5 * Math.PI + spNk, zN = Math.sin(thN), pN = 1 + PERSP * zN;
          b.th = thN;
          b.x = cx + Math.cos(thN) * R * NK * pN; b.y = cy + zN * R * NK * tilt * pN;
          b.z = zN * NK;
          b.r = b.rr * R * (1 + DS * zN) * Math.max(0, easeOutBack(clamp01((t - b.tPop) / (260 * kT)), 2.2));
          b.b = 0.4 + 0.6 * Math.sqrt((zN + 1) / 2);
          order.push(b);
        }
        order.sort(byZ);

        // ─── draw back to front ───
        drawThreads(false, t);
        var frontDone = false;
        for (i = 0; i < order.length; i++) {
          b = order[i];
          if (!frontDone && b.z >= 0) { drawThreads(true, t); frontDone = true; }
          if (b.kind === 'c') { drawClasp(t); continue; }
          if (b.r <= 0.2) continue;
          rainAt(b.th, t);
          var rain = rI, rainH = rH;
          if (rain > 0.01) {
            ctx.globalCompositeOperation = 'lighter';
            glowDot(hues[rainH], b.x, b.y, b.r * 2.3, 0.85 * rain);
            ctx.globalCompositeOperation = 'source-over';
          }
          if (b.kind === 'b' && b.q < 0.62) {            // a soft tapered comet streak while flying in
            var ns = 0, ta = b.a * clamp01((0.62 - b.q) / 0.2);
            SX[0] = b.x; SY[0] = b.y;
            for (var gg = 1; gg < SX.length; gg++) {
              var qq = Math.max(0, b.q - gg * 0.024), u2 = easeOutBack(qq, 1.0);
              SX[gg] = bez(b.p0x, b.c1x, b.c2x, b.p3x, u2); SY[gg] = bez(b.p0y, b.c1y, b.c2y, b.p3y, u2); ns = gg;
              if (qq <= 0) break;
            }
            if (ns >= 2) {
              ctx.beginPath();
              for (var side = 1; side >= -1; side -= 2) {
                for (var sk = 0; sk <= ns; sk++) {
                  var k2 = side > 0 ? sk : ns - sk, ka2 = Math.max(0, k2 - 1), kb2 = Math.min(ns, k2 + 1);
                  var ddx = SX[ka2] - SX[kb2], ddy = SY[ka2] - SY[kb2], dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
                  var ww = b.r * 0.92 * (1 - k2 / ns) * side;
                  var px2 = SX[k2] - ddy / dl * ww, py2 = SY[k2] + ddx / dl * ww;
                  if (side > 0 && sk === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
                }
              }
              ctx.closePath();
              var sgr = ctx.createLinearGradient(SX[0], SY[0], SX[ns], SY[ns]);
              sgr.addColorStop(0, shade(b.col, 0.45, 0.6 * ta)); sgr.addColorStop(0.35, shade(b.col, 0.2, 0.28 * ta)); sgr.addColorStop(1, shade(b.col, 0, 0));
              ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sgr; ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }
          }
          drawSpr(b.sp, b.x, b.y, b.r, b.rot, b.sx, b.a, b.b);
          var shI = shineAt(b.x, b.y, t);
          if (shI > 0.02 || rain > 0.01) {
            ctx.globalCompositeOperation = 'lighter';
            if (shI > 0.02) {
              drawSpr(b.sp, b.x, b.y, b.r, b.rot, b.sx, 0.38 * shI, 1);
              ctx.fillStyle = 'rgba(255,255,255,' + shI.toFixed(3) + ')';
              sparkPath(ctx, b.x - b.r * 0.34, b.y - b.r * 0.4, b.r * 0.85 * shI); ctx.fill();
            }
            if (rain > 0.01) glowDot(hues[rainH], b.x, b.y, b.r * 1.15, 0.4 * rain);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        if (!frontDone) drawThreads(true, t);

        // ─── the gold heart charm ───
        var ch = drawCharm(t);

        // ─── sparkle fx (additive, on top) ───
        ctx.globalCompositeOperation = 'lighter';
        // landing "tick" for each bead
        for (i = 0; i < beads.length; i++) {
          b = beads[i];
          var kt = (t - b.tC) / (320 * kT);
          if (kt <= 0 || kt >= 1 || !b.vis) continue;
          var sr = b.rr * R;
          ctx.strokeStyle = shade(b.col, 0.55, 0.38 * (1 - kt) * (1 - kt)); ctx.lineWidth = 0.8 + 1.6 * (1 - kt);
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.0 + 0.45 * easeOut(kt)), 0, TAU); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * (1 - kt * kt)).toFixed(3) + ')';
          sparkPath(ctx, b.x + b.r * 0.62, b.y - b.r * 0.66, sr * 0.62 * Math.sin(Math.PI * Math.min(1, kt * 1.3))); ctx.fill();
          for (var dq = 0; dq < 3; dq++) {
            var da = -HALF_PI + (dq - 1) * 0.85, dr = b.r * (1 + 1.1 * easeOut(kt));
            ctx.fillStyle = hexA(dq === 1 ? accent : '#FFFFFF', 1 - kt);
            ctx.beginPath(); ctx.arc(b.x + Math.cos(da) * dr, b.y + Math.sin(da) * dr, Math.max(0.8, sr * 0.07 * (1 - kt)), 0, TAU); ctx.fill();
          }
        }
        // the clasp click
        var kc = (t - tS) / (560 * kT);
        if (kc > -0.05 && kc < 1) {
          var kcc = clamp01(kc);
          glowDot(spr, JX, JY - R * 0.03, R * (0.25 + 0.55 * kcc), 0.95 * (1 - kcc));
          ctx.strokeStyle = 'rgba(255,230,150,' + (0.7 * (1 - kcc) * (1 - kcc) * (1 - kcc)).toFixed(3) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(JX, JY - R * 0.03, R * (0.08 + 0.5 * easeOut(kcc)), R * (0.08 + 0.5 * easeOut(kcc)) * 0.7, 0, 0, TAU); ctx.stroke();
          for (var cs = 0; cs < 10; cs++) {
            var ca = cs / 10 * TAU + 0.3, cr = R * (0.08 + 0.42 * easeOut(kcc));
            ctx.fillStyle = hexA(cs % 2 ? accent : '#FFFFFF', 1 - kcc);
            sparkPath(ctx, JX + Math.cos(ca) * cr, JY - R * 0.03 + Math.sin(ca) * cr * 0.75, R * 0.045 * (1 - kcc * 0.6)); ctx.fill();
          }
        }
        // charm glints: shine pass + twinkles
        if (ch) {
          var cI = shineAt(ch.x, ch.y, t);
          for (var tw = 0; tw < T.tw.length; tw++) {
            var kq = (t - T.tw[tw]) / (420 * kT);
            if (kq > 0 && kq < 1) cI = Math.max(cI, Math.sin(Math.PI * kq));
          }
          if (cI > 0.02) {
            var spots = [[-0.55, -0.55, 1], [0.6, -0.35, 0.6], [0.05, 0.55, 0.45]];
            for (var sq = 0; sq < spots.length; sq++) {
              var lx = spots[sq][0] * ch.r * ch.sx, ly = spots[sq][1] * ch.r, ca2 = Math.cos(ch.ang), sa2 = Math.sin(ch.ang);
              var gx = ch.x + lx * ca2 - ly * sa2, gy = ch.y + lx * sa2 + ly * ca2;
              var sz = ch.r * 0.55 * spots[sq][2] * cI;
              glowDot(spr, gx, gy, sz * 1.6, 0.7 * cI);
              ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.002 + sq);
              ctx.fillStyle = 'rgba(255,255,255,' + cI.toFixed(3) + ')'; sparkPath(ctx, 0, 0, sz); ctx.fill();
              ctx.restore();
            }
          }
        }
        // super: the necklace closes at the front → a ring of sparkles bursts outward
        if (isSuper && t > T.burst) {
          var kb = (t - T.burst) / (900 * kT);
          if (kb < 1) {
            ringPt(HALF_PI, NK, 1);
            glowDot(spr, PX, PY, R * (0.3 + 0.5 * kb), 0.9 * (1 - kb));
            glowDot(pool, cx, cy, R * NK * (1.1 + 0.4 * kb), 0.35 * (1 - kb));
            for (var bk = 0; bk < burst.length; bk++) {
              var Bs = burst[bk], f = easeOut(kb) * Bs.sp;
              var bx = cx + Math.cos(Bs.a) * R * (NK * 1.05 + 1.3 * f), by = cy + Math.sin(Bs.a) * R * (NK * tilt * 1.05 + 1.0 * f);
              var bsz = R * 0.065 * Bs.sz * (1 - 0.55 * kb), ba = Math.pow(1 - kb, 1.2);
              if (Bs.sz > 1) glowDot(spr, bx, by, bsz * 2.2, 0.5 * ba);
              ctx.save(); ctx.translate(bx, by); ctx.rotate(Bs.rot + kb * 2);
              ctx.fillStyle = hexA(Bs.col, ba); sparkPath(ctx, 0, 0, bsz); ctx.fill();
              ctx.restore();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        // praise + points
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
        cache = null; beads = null; neck = null; order = null; hues = null; spr = null; pool = null;
        sCharm = null; sGold = null; sPearlS = null;
      };
    }
  });
})();
