/* success-crayon-drawing.js — מסך הצלחה: צִיּוּר בְּפַּסְטֶלִים 🖍️
   פסטל שעווה גדול (עטיפת נייר, קצה מעוגל) נכנס בזום ומצייר קו-אחר-קו, בקו שעווה
   מחוספס, קווי מתאר של לב גדול; אז פסטלים צבעוניים נוספים ממהרים פנימה ומקשקשים
   בתוכו קווקוו צבעוני, הלב קופץ ומנצנץ, ומסביב מצטיירים שרבוטים קטנים
   (שמש, פרח, סמיילי). בסופר: קשת בענן מצוירת למעלה, לב שני, עוד שרבוטים
   (כוכב, ענן) ופרץ נצנצים.
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
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255, g = Math.round(g1 + (g2 - g1) * t) & 255, b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }

  // ─── geometry in "unit" space (a heart / doodle of radius ~1) ───
  function heartXY(t) {
    var s = Math.sin(t);
    return [s * s * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 - 0.13];
  }
  var HEART = [];
  for (var hi = 0; hi < 120; hi++) HEART.push(heartXY(hi / 120 * TAU));
  function inPoly(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function heartUnitPath(ctx) {
    ctx.beginPath(); ctx.moveTo(HEART[0][0], HEART[0][1]);
    for (var i = 1; i < HEART.length; i++) ctx.lineTo(HEART[i][0], HEART[i][1]);
    ctx.closePath();
  }
  function arcPts(cx, cy, rx, ry, a0, a1, n, jit) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = lerp(a0, a1, i / n), j = jit ? 1 + Math.sin(a * 3.1 + jit) * 0.025 : 1;
      out.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
    }
    return out;
  }
  function quadPts(x0, y0, cx, cy, x1, y1, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
    }
    return out;
  }

  // a stroke: polyline + cumulative lengths + baked wax-grain speckles
  function mkPoly(pts, col, w, grain) {
    var cl = [0];
    for (var i = 1; i < pts.length; i++) cl.push(cl[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var total = cl[cl.length - 1], sp = [], step = w * (grain || 0.9), k = 1;
    for (var L = step * 0.5; L < total; L += step * rnd(0.6, 1.4)) {
      while (k < cl.length - 1 && cl[k] < L) k++;
      var a = pts[k - 1], b = pts[k], seg = (cl[k] - cl[k - 1]) || 1e-6, f = (L - cl[k - 1]) / seg;
      var nx = -(b[1] - a[1]) / seg, ny = (b[0] - a[0]) / seg, o = rnd(-0.42, 0.42) * w;
      sp.push(L, a[0] + (b[0] - a[0]) * f + nx * o, a[1] + (b[1] - a[1]) * f + ny * o, w * rnd(0.05, 0.13));
    }
    return { pts: pts, cl: cl, total: total, w: w, col: col, light: mixHex(col, '#FFFFFF', 0.5), dark: mixHex(col, '#000000', 0.3), sp: sp };
  }

  window.SUCCESS.styles.push({
    name: 'crayon-drawing',
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
      var praise  = opts.praise || 'צִיַּרְתְּ נִפְלָא!';

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

      // ─── layout (recomputed every frame; jobs read it through closures) ───
      var lay = {}, curP = 0;
      function layout() {
        var port = W < H * 0.9;
        lay.port = port;
        lay.S = Math.min(W * (port ? 0.33 : 0.3), H * (port ? 0.2 : 0.26)) * (isSuper ? 0.86 : 1);
        lay.hx = W * 0.5;
        lay.hy = H * (isSuper ? (port ? 0.6 : 0.6) : (port ? 0.53 : 0.57));
        lay.d = Math.min(W * (port ? 0.12 : 0.09), H * (port ? 0.085 : 0.1));
        lay.Ra = Math.min(W * 0.47, H * (port ? 0.3 : 0.5));
        lay.ax = W * 0.5;
        lay.ay = H * 0.26 + lay.Ra;
      }
      layout();

      var POP1 = isSuper ? 0.54 : 0.6, POP2 = 0.6;
      function popScale(at, s) {
        var q = (curP - at) / 0.1;
        if (q <= 0) return s;
        if (q < 1) return s * (1 + 0.17 * Math.sin(Math.PI * q) * (1 - 0.35 * q));
        return s * (1 + 0.018 * Math.sin((curP - at) * dur * 0.006));
      }
      function tfH1() { return { x: lay.hx, y: lay.hy, s: popScale(POP1, lay.S), r: 0 }; }
      function tfH2() { return { x: lay.hx + lay.S * 0.98, y: lay.hy + lay.S * 0.6, s: popScale(POP2, lay.S * 0.46), r: 0.3 }; }

      // ─── jobs: everything that gets "drawn" with a crayon ───
      var jobs = [];
      function addJob(o) {
        var tot = 0;
        o.polys.forEach(function (pl) { tot += pl.total; });
        o.total = tot;
        jobs.push(o);
        return o;
      }
      var OUTLINE = '#FF3D7F';
      var HATCH = ['#FF6FAE', primary, accent, glow];

      // super: rainbow arch, 6 crayons sweeping together
      if (isSuper) {
        var RB = ['#FF5A5F', '#FF9F43', '#FFD93D', '#6BCB77', '#4D96FF', '#B983FF'], bw = 0.062;
        RB.forEach(function (c, k) {
          var rk = 1 - (k + 0.5) * bw, ph = rnd(0, TAU);
          var pts = arcPts(0, 0, rk, rk, Math.PI, TAU, 54, ph);
          var t0 = 0.03 + k * 0.012;
          addJob({ polys: [mkPoly(pts, c, bw * 1.12, 1.3)], w: bw * 1.12,
                   tf: function () { return { x: lay.ax, y: lay.ay, s: lay.Ra, r: 0 }; },
                   t0: t0, t1: t0 + 0.17,
                   crayon: { lenF: function () { return lay.Ra * bw * 5.2; }, ang: -0.95 + k * 0.05, inD: 0.05, outD: 0.06 } });
        });
      }

      function heartJobs(tf, t0, t1, fills, cols, fillLen, outLen, ang, zoom, ft0, ft1, shineAt) {
        // scribble fill: zig-zag hatching in diagonal bands, one band per crayon (clipped to the heart)
        var th = -0.55, ct = Math.cos(th), st = Math.sin(th);
        var umin = 9, umax = -9;
        HEART.forEach(function (pt) { var u = pt[0] * ct + pt[1] * st; if (u < umin) umin = u; if (u > umax) umax = u; });
        var bwid = (umax - umin) / fills, w = 0.066, step = 0.074;
        for (var k = 0; k < fills; k++) {
          var a = umin + k * bwid - (k === 0 ? 0.08 : 0.03), b = umin + (k + 1) * bwid + (k === fills - 1 ? 0.08 : 0.03), pts = [];
          for (var j = 0; ; j++) {
            var u = a + j * step * 0.5; if (u > b) break;
            var vmin = 9, vmax = -9;
            for (var v = -1.5; v <= 1.5; v += 0.03) {
              var x = u * ct - v * st, y = u * st + v * ct;
              if (inPoly(x, y, HEART)) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
            }
            if (vmin > vmax) continue;
            var vv = (j % 2 ? vmax + 0.05 : vmin - 0.05) + rnd(-0.02, 0.02), uu = u + rnd(-0.012, 0.012);
            pts.push([uu * ct - vv * st, uu * st + vv * ct]);
          }
          if (pts.length < 2) continue;
          var fa = ft0 + k * 0.014, fb = ft1 + k * 0.014;
          addJob({ polys: [mkPoly(pts, cols[k % cols.length], w, 2.6)], w: w, tf: tf, clip: true,
                   t0: fa, t1: fb, alpha: 0.92,
                   crayon: { lenF: function () { return lay.S * fillLen; }, ang: [-0.8, -2.3, -1.1, -2.0][k % 4], inD: 0.06, outD: 0.07 } });
        }
        // the textured outline, started at the top dip and drawn round with a little overlap
        var ph1 = rnd(0, TAU), ph2 = rnd(0, TAU), opts2 = [];
        for (var i = 0; i <= 140; i++) {
          var t = i / 140 * (TAU + 0.12), p0 = heartXY(t), n = 1 + 0.012 * Math.sin(5 * t + ph1) + 0.008 * Math.sin(11 * t + ph2);
          opts2.push([p0[0] * n, (p0[1] + 0.13) * n - 0.13]);
        }
        addJob({ polys: [mkPoly(opts2, OUTLINE, 0.085, 0.75)], w: 0.085, tf: tf, t0: t0, t1: t1,
                 crayon: { lenF: function () { return lay.S * outLen; }, ang: ang, inD: 0.08, outD: 0.08, zoom: zoom } });
        // a white crayon shine on the upper-left lobe
        addJob({ polys: [mkPoly(arcPts(-0.47, -0.36, 0.25, 0.25, Math.PI * 1.02, Math.PI * 1.42, 10), '#FFFFFF', 0.075, 1)], w: 0.075,
                 tf: tf, t0: shineAt, t1: shineAt + 0.03, alpha: 0.9 });
      }
      if (isSuper) {
        heartJobs(tfH1, 0.16, 0.34, 4, HATCH, 0.8, 1.15, -0.85, 2.2, 0.31, 0.49, 0.5);
        heartJobs(tfH2, 0.37, 0.46, 2, [accent, '#FF6FAE'], 0.6, 0.75, -0.75, 1.6, 0.45, 0.55, 0.56);
      } else {
        heartJobs(tfH1, 0.07, 0.34, 4, HATCH, 0.82, 1.2, -0.85, 2.3, 0.33, 0.56, 0.57);
      }

      // doodles around the heart (each with its own little crayon that pops in)
      var D = {};
      D.sun = function () {
        var Y = '#FFD23F', O = '#FF8C42', P = '#FF8FB3', ps = [mkPoly(arcPts(0, 0, 0.45, 0.45, -Math.PI / 2, -Math.PI / 2 + TAU * 1.05, 30, 1), Y, 0.1)];
        for (var r = 0; r < 8; r++) { var a = r * Math.PI / 4 - Math.PI / 2 + 0.2; ps.push(mkPoly([[Math.cos(a) * 0.62, Math.sin(a) * 0.62], [Math.cos(a) * 0.95, Math.sin(a) * 0.95]], Y, 0.1)); }
        ps.push(mkPoly([[-0.16, -0.16], [-0.16, -0.05]], O, 0.08));
        ps.push(mkPoly([[0.16, -0.16], [0.16, -0.05]], O, 0.08));
        ps.push(mkPoly(arcPts(0, 0.02, 0.2, 0.18, 0.45, Math.PI - 0.45, 10), O, 0.08));
        ps.push(mkPoly(arcPts(-0.27, 0.1, 0.05, 0.035, 0, TAU, 8), P, 0.07));
        ps.push(mkPoly(arcPts(0.27, 0.1, 0.05, 0.035, 0, TAU, 8), P, 0.07));
        return ps;
      };
      D.flower = function () {
        var G = '#5FD068', PK = '#FF7EB6', Y = '#FFD23F', ps = [];
        ps.push(mkPoly(quadPts(0, 0.32, -0.12, 0.75, 0.04, 1.15, 14), G, 0.1));
        var lf = quadPts(-0.02, 0.82, 0.18, 0.5, 0.42, 0.6, 10).concat(quadPts(0.42, 0.6, 0.25, 0.85, -0.02, 0.82, 10).slice(1));
        ps.push(mkPoly(lf, G, 0.08));
        var pet = [];
        for (var i = 0; i <= 70; i++) { var a = -Math.PI / 2 + i / 70 * TAU, r = 0.3 + 0.24 * Math.pow(Math.abs(Math.sin(2.5 * a + Math.PI * 1.25)), 0.6); pet.push([Math.cos(a) * r, Math.sin(a) * r]); }
        ps.push(mkPoly(pet, PK, 0.09));
        var sp = [];
        for (var s = 0; s <= 30; s++) { var aa = s / 30 * TAU * 2.2, rr = 0.15 * (1 - s / 34); sp.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
        ps.push(mkPoly(sp, Y, 0.09));
        return ps;
      };
      D.smiley = function () {
        var C = mixHex(glow, '#FFFFFF', 0.15), ps = [mkPoly(arcPts(0, 0, 0.55, 0.55, -Math.PI / 2, -Math.PI / 2 + TAU * 1.04, 30, 2), C, 0.1)];
        ps.push(mkPoly([[-0.19, -0.2], [-0.19, -0.06]], C, 0.1));
        ps.push(mkPoly([[0.19, -0.2], [0.19, -0.06]], C, 0.1));
        ps.push(mkPoly(arcPts(0, 0.02, 0.3, 0.26, 0.4, Math.PI - 0.4, 12), C, 0.1));
        ps.push(mkPoly(arcPts(-0.33, 0.12, 0.06, 0.04, 0, TAU, 8), '#FF8FB3', 0.07));
        ps.push(mkPoly(arcPts(0.33, 0.12, 0.06, 0.04, 0, TAU, 8), '#FF8FB3', 0.07));
        return ps;
      };
      D.star = function () {
        var pts = [];
        for (var i = 0; i <= 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.27 : 0.62; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        pts.push(pts[1].slice());
        return [mkPoly(pts, accent, 0.1)];
      };
      D.cloud = function () {
        var pts = [];
        for (var i = 0; i <= 60; i++) { var a = Math.PI / 2 + i / 60 * TAU * 1.03, b = Math.abs(Math.sin(3.5 * a)); pts.push([Math.cos(a) * (0.6 + 0.09 * b), Math.sin(a) * (0.36 + 0.1 * b)]); }
        return [mkPoly(pts, '#E3EEFF', 0.1)];
      };
      var doodles = isSuper
        ? (function () { return [['sun', 0.3, 0.42], ['star', 0.37, 0.46], ['flower', 0.45, 0.58], ['smiley', 0.55, 0.66], ['cloud', 0.62, 0.72]]; })()
        : [['sun', 0.36, 0.49], ['flower', 0.47, 0.6], ['smiley', 0.58, 0.7]];
      function doodlePos(name) {
        var P;
        if (isSuper) P = lay.port
          ? { sun: [0.2, 0.83], star: [0.13, 0.58], flower: [0.8, 0.82], smiley: [0.5, 0.88], cloud: [0.84, 0.25] }
          : { sun: [0.1, 0.34], star: [0.9, 0.34], flower: [0.87, 0.74], smiley: [0.14, 0.8], cloud: [0.11, 0.57] };
        else P = lay.port
          ? { sun: [0.2, 0.3], flower: [0.8, 0.78], smiley: [0.22, 0.8] }
          : { sun: [0.2, 0.38], flower: [0.8, 0.68], smiley: [0.21, 0.76] };
        var q = P[name];
        return [q[0] * W, q[1] * H];
      }
      doodles.forEach(function (dd) {
        var nm = dd[0];
        addJob({ polys: D[nm](), w: 0.1, doodle: true,
                 tf: function () { var q = doodlePos(nm); return { x: q[0], y: q[1] - (nm === 'flower' ? lay.d * 0.45 : 0), s: lay.d * (nm === 'flower' ? 1.25 : 1), r: 0 }; },
                 t0: dd[1], t1: dd[2],
                 crayon: { lenF: function () { return lay.d * 1.6; }, ang: -0.9, inD: 0.035, outD: 0.04, pop: true } });
      });

      // glitter bursts after the pop (analytic particles)
      var bursts = [];
      function addBurst(at, tf, n, ring) {
        var parts = [];
        for (var i = 0; i < n; i++) {
          var a = ring ? i / n * TAU + rnd(-0.05, 0.05) : rnd(0, TAU);
          parts.push({ a: a, v: ring ? rnd(560, 640) : rnd(220, 560), r: rnd(5, 11), col: ['#FFFFFF', accent, '#FFE9A8', primary, glow, '#FF8FC0'][i % 6], ph: rnd(0, TAU), life: rnd(0.8, 1.3) });
        }
        bursts.push({ at: at, tf: tf, parts: parts });
      }
      addBurst(POP1 + 0.01, tfH1, isSuper ? 30 : 34, false);
      if (isSuper) { addBurst(POP2 + 0.01, tfH2, 18, false); addBurst(0.76, tfH1, 36, true); addBurst(0.765, tfH1, 24, false); }
      var glints = [[-0.5, -0.45], [0.45, -0.3], [0.05, 0.35], [-0.2, -0.05], [0.4, 0.15]];

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random(), tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA('#FF6FAE', 0.55) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (isSuper ? 0.24 : 0.38);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(12% + 8%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing ───
      function polyPoint(pl, L) {
        var cl = pl.cl, k = 1;
        while (k < cl.length - 1 && cl[k] < L) k++;
        var seg = (cl[k] - cl[k - 1]) || 1e-6, f = clamp01((L - cl[k - 1]) / seg);
        return { k: k, x: lerp(pl.pts[k - 1][0], pl.pts[k][0], f), y: lerp(pl.pts[k - 1][1], pl.pts[k][1], f) };
      }
      function tracePartial(pl, L, ox, oy) {
        var e = polyPoint(pl, L);
        ctx.beginPath(); ctx.moveTo(pl.pts[0][0] + ox, pl.pts[0][1] + oy);
        for (var i = 1; i < e.k; i++) ctx.lineTo(pl.pts[i][0] + ox, pl.pts[i][1] + oy);
        ctx.lineTo(e.x + ox, e.y + oy);
      }
      // waxy crayon line: body + light/dark streaks + dark grain flecks
      function drawPoly(pl, L, w) {
        if (L <= 0) return;
        if (L > pl.total) L = pl.total;
        ctx.strokeStyle = pl.col; ctx.lineWidth = w;
        tracePartial(pl, L, 0, 0); ctx.stroke();
        var ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * 0.55; ctx.strokeStyle = pl.light; ctx.lineWidth = w * 0.26;
        tracePartial(pl, L, -w * 0.16, -w * 0.18); ctx.stroke();
        ctx.globalAlpha = ga * 0.45; ctx.strokeStyle = pl.dark; ctx.lineWidth = w * 0.2;
        tracePartial(pl, L, w * 0.2, w * 0.2); ctx.stroke();
        ctx.globalAlpha = ga * 0.42; ctx.fillStyle = '#1a0f26';
        var sp = pl.sp;
        for (var i = 0; i < sp.length && sp[i] <= L; i += 4) ctx.fillRect(sp[i + 1] - sp[i + 3] / 2, sp[i + 2] - sp[i + 3] / 2, sp[i + 3], sp[i + 3]);
        ctx.globalAlpha = ga;
      }
      function jobFrac(j) { return clamp01((curP - j.t0) / (j.t1 - j.t0)); }
      function tipOf(j, f) {
        var L = f * j.total, pl = j.polys[0];
        for (var i = 0; i < j.polys.length; i++) { pl = j.polys[i]; if (L <= pl.total || i === j.polys.length - 1) break; L -= pl.total; }
        var e = polyPoint(pl, Math.min(L, pl.total)), tf = j.tf(), c = Math.cos(tf.r), s = Math.sin(tf.r);
        return { x: tf.x + tf.s * (e.x * c - e.y * s), y: tf.y + tf.s * (e.x * s + e.y * c), col: pl.col };
      }
      function drawJob(j) {
        var f = jobFrac(j);
        if (f <= 0) return;
        var tf = j.tf();
        ctx.save();
        ctx.translate(tf.x, tf.y); ctx.rotate(tf.r); ctx.scale(tf.s, tf.s);
        if (j.alpha) ctx.globalAlpha *= j.alpha;
        if (j.clip) { heartUnitPath(ctx); ctx.clip(); }
        var L = f * j.total;
        for (var i = 0; i < j.polys.length && L > 0; i++) { drawPoly(j.polys[i], L, j.polys[i].w || j.w); L -= j.polys[i].total; }
        ctx.restore();
      }

      function roundRectPath(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      // a wax crayon, tip at (x,y), body pointing along `ang`
      function drawCrayon(x, y, ang, len, col, sc) {
        if (sc <= 0.02) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
        var h = len * 0.1, tipL = len * 0.19;
        var light = mixHex(col, '#FFFFFF', 0.5), dark = mixHex(col, '#000000', 0.38);
        var g = ctx.createLinearGradient(0, -h, 0, h);
        g.addColorStop(0, light); g.addColorStop(0.3, col); g.addColorStop(0.75, col); g.addColorStop(1, dark);
        // soft glow so the crayon reads over near-black
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        roundRectPath(tipL, -h * 0.55, len - tipL + h * 0.3, h * 2.1, h * 0.8); ctx.fill();
        // conical waxy tip with a rounded worn end
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(tipL + 2, -h * 0.9); ctx.lineTo(len * 0.05, -h * 0.36);
        ctx.quadraticCurveTo(-len * 0.012, 0, len * 0.05, h * 0.36); ctx.lineTo(tipL + 2, h * 0.9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = h * 0.16; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(len * 0.07, -h * 0.24); ctx.lineTo(tipL * 0.92, -h * 0.6); ctx.stroke();
        // ridges on the cone
        ctx.strokeStyle = hexA(dark, 0.45); ctx.lineWidth = h * 0.08;
        ctx.beginPath(); ctx.moveTo(tipL * 0.55, h * 0.62); ctx.lineTo(tipL * 0.95, h * 0.82); ctx.stroke();
        // body
        roundRectPath(tipL, -h, len - tipL, h * 2, h * 0.45); ctx.fillStyle = g; ctx.fill();
        // paper wrapper
        var wx0 = tipL + len * 0.1, wx1 = len - len * 0.05;
        var wcol = mixHex(col, '#FFFFFF', 0.28), wg = ctx.createLinearGradient(0, -h, 0, h);
        wg.addColorStop(0, mixHex(wcol, '#FFFFFF', 0.45)); wg.addColorStop(0.35, wcol); wg.addColorStop(1, mixHex(wcol, '#000000', 0.25));
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(wx0, -h * 1.05);
        for (var zz = 0; zz <= 6; zz++) ctx.lineTo(wx0 + (zz % 2 ? -len * 0.012 : 0), -h * 1.05 + zz * h * 2.1 / 6);
        ctx.lineTo(wx1, h * 1.05); ctx.lineTo(wx1, -h * 1.05); ctx.closePath(); ctx.fill();
        ctx.fillStyle = dark;
        ctx.fillRect(wx0 + len * 0.03, -h * 1.05, len * 0.022, h * 2.1);
        ctx.fillRect(wx1 - len * 0.055, -h * 1.05, len * 0.022, h * 2.1);
        // label oval with little scribble "text"
        var lx = (wx0 + wx1) / 2 + len * 0.01, lr = (wx1 - wx0) * 0.24;
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.beginPath(); ctx.ellipse(lx, 0, lr, h * 0.62, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = h * 0.13;
        ctx.beginPath(); ctx.moveTo(lx - lr * 0.6, -h * 0.1);
        for (var q = 1; q <= 6; q++) ctx.lineTo(lx - lr * 0.6 + q * lr * 0.2, -h * 0.1 + (q % 2 ? -h * 0.14 : h * 0.1));
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lx - lr * 0.4, h * 0.25); ctx.lineTo(lx + lr * 0.4, h * 0.25); ctx.stroke();
        // gloss line along the body
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = h * 0.18;
        ctx.beginPath(); ctx.moveTo(tipL + len * 0.04, -h * 0.55); ctx.lineTo(wx0 - len * 0.02, -h * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx0 + len * 0.07, -h * 0.6); ctx.lineTo(lx - lr * 1.15, -h * 0.6); ctx.stroke();
        ctx.restore();
      }
      function drawJobCrayon(j) {
        var c = j.crayon; if (!c) return;
        var inS = j.t0 - c.inD, outE = j.t1 + c.outD;
        if (curP < inS || curP > outE) return;
        var len = c.lenF(), ang = c.ang, far = Math.max(W, H) * 0.95;
        var dx = Math.cos(ang) * far, dy = Math.sin(ang) * far;
        var x, y, sc = 1, col;
        if (curP < j.t0) {
          var q = (curP - inS) / c.inD, tp = tipOf(j, 0); col = tp.col;
          if (c.pop) { x = tp.x; y = tp.y; sc = easeOutBack(clamp01(q)); }
          else { var e = easeOut(q); x = tp.x + dx * (1 - e); y = tp.y + dy * (1 - e); sc = c.zoom ? lerp(c.zoom, 1, e) : 1; }
        } else if (curP <= j.t1) {
          var tp2 = tipOf(j, jobFrac(j)); col = tp2.col; x = tp2.x; y = tp2.y;
          ang += Math.sin(curP * dur * 0.03 + j.t0 * 50) * 0.05;
        } else {
          var q2 = (curP - j.t1) / c.outD, tp3 = tipOf(j, 1); col = tp3.col;
          if (c.pop) { x = tp3.x; y = tp3.y; sc = 1 - easeIn(q2); }
          else { var e2 = easeIn(q2); x = tp3.x + dx * e2; y = tp3.y + dy * e2 - Math.sin(q2 * Math.PI) * 20 * unit; }
        }
        drawCrayon(x, y, ang, len, col, sc);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        curP = p;
        layout();
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.6 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;

        // warm glow behind the heart once it pops
        var gq = clamp01((p - POP1) / 0.08);
        if (gq > 0) {
          var h1 = tfH1(), rg = ctx.createRadialGradient(h1.x, h1.y, 0, h1.x, h1.y, h1.s * 1.6);
          rg.addColorStop(0, hexA('#FF6FAE', 0.34 * gq)); rg.addColorStop(0.55, hexA(primary, 0.14 * gq)); rg.addColorStop(1, hexA(primary, 0));
          ctx.fillStyle = rg; ctx.fillRect(h1.x - h1.s * 1.7, h1.y - h1.s * 1.7, h1.s * 3.4, h1.s * 3.4);
        }
        for (var ji = 0; ji < jobs.length; ji++) drawJob(jobs[ji]);

        // twinkling glints on the popped heart(s)
        [[POP1, tfH1], [POP2, tfH2]].forEach(function (hp, hk) {
          if (hk === 1 && !isSuper) return;
          var gq2 = (p - hp[0] - 0.04);
          if (gq2 <= 0) return;
          var tf = hp[1]();
          for (var g = 0; g < glints.length; g++) {
            var tw = Math.sin((t * 0.009) + g * 1.9);
            if (tw <= 0) continue;
            ctx.fillStyle = hexA('#FFFFFF', 0.95 * tw * clamp01(gq2 * 10));
            sparkPath(ctx, tf.x + glints[g][0] * tf.s, tf.y + glints[g][1] * tf.s, tf.s * 0.1 * tw + 2 * unit); ctx.fill();
          }
        });

        // glitter bursts
        for (var bi = 0; bi < bursts.length; bi++) {
          var B = bursts[bi], bt = (p - B.at) * dur / 1000;
          if (bt <= 0) continue;
          var bf = B.tf();
          for (var pi = 0; pi < B.parts.length; pi++) {
            var pt = B.parts[pi], lt = bt / pt.life;
            if (lt >= 1) continue;
            var dist = pt.v * unit * (1 - Math.exp(-2.6 * bt)) / 2.6 + bf.s * 0.55;
            var px = bf.x + Math.cos(pt.a) * dist, py = bf.y + Math.sin(pt.a) * dist + 70 * unit * bt * bt;
            var tw2 = 0.6 + 0.4 * Math.sin(bt * 22 + pt.ph);
            ctx.globalAlpha = gFade * (1 - lt * lt);
            ctx.fillStyle = pt.col;
            sparkPath(ctx, px, py, pt.r * unit * 1.6 * tw2 * (1 - lt * 0.4)); ctx.fill();
          }
        }
        ctx.globalAlpha = gFade;
        for (var cj = 0; cj < jobs.length; cj++) drawJobCrayon(jobs[cj]);
        ctx.globalAlpha = 1;
        ctx.restore();

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
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
      };
    }
  });
})();
