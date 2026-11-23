/* success-swan-heart.js — מסך הצלחה: בַּרְבּוּרֵי הַלֵּב 🦢
   אגם שקט תחת ירח מלא: שני ברבורים לבנים ואציליים (מבט צד: מקור כתום עם
   גבשושית שחורה, עין אחת עם ריס, כנף מקופלת בשכבות נוצות) שטים פנימה משני
   הצדדים ומשאירים אדוות בצורת V, נפגשים באמצע ומרכינים את הצוואר הארוך זה אל
   זה — שני הצווארים יוצרים לב. קו המתאר של הלב זוהר ומנצנץ ומשתקף מתנודד
   במים, טבעות אדווה מתפשטות, ירח רך וכוכבים מנצנצים מעל וגחליליות מרחפות.
   בסופר: ברבורון אפרפר ופלומתי חותר פנימה ביניהם, פנסי לוטוס זוהרים צפים על
   המים, והלב הזוהר מתרומם מהצווארים ומתפרץ למטר רך של עלי כותרת ונצנצים.
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
    var r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartShape(ctx, x, y, r) {          // small filled heart, point down, centred on (x,y)
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.75, y - r * 1.05, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.75, y - r * 1.05, x + r * 1.25, y + r * 0.05, x, y + r * 0.9);
    ctx.closePath();
  }

  // ───────────── swan geometry: local units, facing +x, waterline y = 0, y down ─────────────
  function bez(a, b, c, d, u) {
    var v = 1 - u;
    return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
            v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
  }
  function resample(fn, n) {                    // n points evenly spaced by arc length
    var M = 240, dense = [], L = [0], i;
    for (i = 0; i <= M; i++) dense.push(fn(i / M));
    for (i = 1; i <= M; i++) L.push(L[i - 1] + Math.sqrt(Math.pow(dense[i][0] - dense[i - 1][0], 2) + Math.pow(dense[i][1] - dense[i - 1][1], 2)));
    var out = [], j = 0, tot = L[M];
    for (i = 0; i < n; i++) {
      var target = tot * i / (n - 1);
      while (j < M - 1 && L[j + 1] < target) j++;
      var f = clamp01((target - L[j]) / ((L[j + 1] - L[j]) || 1));
      out.push([lerp(dense[j][0], dense[j + 1][0], f), lerp(dense[j][1], dense[j + 1][1], f)]);
    }
    return out;
  }
  function catmull(pts, per) {                  // dense polyline through control points
    var out = [], i, k;
    for (i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (k = 0; k < per; k++) {
        var u = k / per, u2 = u * u, u3 = u2 * u;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                  0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function polyAt(poly, cum, u) {               // point + unit normal at arc fraction u
    var target = u * cum[cum.length - 1], j = 0;
    while (j < poly.length - 2 && cum[j + 1] < target) j++;
    var f = clamp01((target - cum[j]) / ((cum[j + 1] - cum[j]) || 1));
    var a = poly[j], b = poly[j + 1], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), -ty / tl, tx / tl];
  }
  function cumLen(poly) {
    var c = [0];
    for (var i = 1; i < poly.length; i++) c.push(c[i - 1] + Math.sqrt(Math.pow(poly[i][0] - poly[i - 1][0], 2) + Math.pow(poly[i][1] - poly[i - 1][1], 2)));
    return c;
  }

  var NB = [0.30, -0.30];                                       // neck base on the upper breast
  function heartXY(t) { var sn = Math.sin(t); return [16 * sn * sn * sn, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]; }
  var HK = 0.035, HT0 = Math.PI + 0.641, HT1 = TAU - 1.0;
  var H0 = heartXY(HT0);
  function heartLocal(t) { var h = heartXY(t); return [NB[0] + (h[0] - H0[0]) * HK, NB[1] - (h[1] - H0[1]) * HK]; }
  var HEART_CX = NB[0] - H0[0] * HK;                           // the meeting axis (local x)
  var NN = 34, NI;
  var NECK_GLIDE = resample(function (u) { return bez([0.30, -0.30], [0.52, -0.68], [-0.16, -0.86], [-0.02, -1.22], u); }, NN);
  var NECK_HEART = resample(function (u) { return heartLocal(lerp(HT0, HT1, u)); }, NN);
  var NW = [];
  for (NI = 0; NI < NN; NI++) { var nu = NI / (NN - 1); NW.push(0.05 + 0.064 * Math.pow(1 - nu, 2.2)); }
  var HO_F = 0.075, HO_U = 0.035, BEAK_TIP = 0.335;              // head centre offset from the neck end; beak length
  var A_GLIDE = 0.3;
  // bow angle: the smallest downward tilt at which the beak tip reaches the meeting axis (beaks touch at the heart's dip)
  var A_HEART = (function () {
    var e = NECK_HEART[NN - 1], best = 1.1;
    for (var a = 0.5; a < 1.7; a += 0.005) {
      var ca = Math.cos(a), sa = Math.sin(a);
      var tipX = e[0] + HO_F * ca + HO_U * sa + BEAK_TIP * ca;
      if (tipX <= HEART_CX - 0.012) { best = a; break; }
    }
    return best;
  })();
  // the glowing heart outline (bottom tip → top dip, left half), a little larger than the necks' heart
  var HC = [HEART_CX, NB[1] - (-3 - H0[1]) * HK];
  var LIFT = 0.1, LSC = 0.36;                                    // super: the glow gathers off the necks into a small heart that floats up inside them
  var FRONT_F = (HT1 - Math.PI) / Math.PI - 0.02;                 // bright front outline stops where the heads begin
  var HEART_HALF = [];
  (function () {
    for (var i = 0; i <= 56; i++) {
      var p = heartLocal(Math.PI + i / 56 * Math.PI);
      HEART_HALF.push([HC[0] + (p[0] - HC[0]) * 1.2, HC[1] + (p[1] - HC[1]) * 1.2]);
    }
  })();
  // folded wing: lower edge (tip → shoulder) carries the scalloped feather tips
  var WING_EDGE = catmull([[-0.84, -0.53], [-0.7, -0.36], [-0.5, -0.24], [-0.26, -0.17], [-0.02, -0.15], [0.12, -0.17], [0.17, -0.25]], 14);
  var WING_CUM = cumLen(WING_EDGE);
  function scallops(u0, u1, n, off, bump) {     // [[ax,ay,cx,cy,bx,by] …]
    var out = [];
    for (var k = 0; k < n; k++) {
      var A = polyAt(WING_EDGE, WING_CUM, lerp(u0, u1, k / n)), B = polyAt(WING_EDGE, WING_CUM, lerp(u0, u1, (k + 1) / n));
      var M = polyAt(WING_EDGE, WING_CUM, lerp(u0, u1, (k + 0.5) / n));
      out.push([A[0] - A[2] * off, A[1] - A[3] * off, M[0] - M[2] * (off - bump * 2), M[1] - M[3] * (off - bump * 2), B[0] - B[2] * off, B[1] - B[3] * off]);
    }
    return out;
  }
  var WING_TIPS = scallops(0.0, 0.84, 6, 0, 0.04);
  var WING_ROW2 = scallops(0.14, 0.8, 4, 0.09, 0.034);
  var WING_ROW3 = scallops(0.36, 0.8, 3, 0.17, 0.03);
  var WING_REST = (function () {            // plain edge from the last scallop to the shoulder
    var out = [], c = WING_CUM, tot = c[c.length - 1];
    for (var i = 0; i < WING_EDGE.length; i++) if (c[i] / tot > 0.84) out.push(WING_EDGE[i]);
    return out;
  })();

  window.SUCCESS.styles.push({
    name: 'swan-heart',
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
      var heartCol = mixHex('#FF6FAE', primary, 0.35);
      var heartHi = mixHex(heartCol, '#FFFFFF', 0.6);
      var waterCol = mixHex('#2A3A8C', glow, 0.25);

      // ─── canvases: the visible one + an off-DOM layer for everything that reflects ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var lay = document.createElement('canvas'), lg = lay.getContext('2d');
      var W = 0, H = 0, DPR = 1, unit = 1, s = 100, cx = 0, waterY = 0, horizonY = 0, reflH = 0;
      var moonX = 0, moonY = 0, moonR = 0, moonSpr = null, waterGrad = null;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = lay.width = Math.max(1, Math.round(W * DPR));
        cv.height = lay.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        lg.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
        s = Math.min(W * 0.33, H * 0.28);
        cx = W / 2;
        // keep the heart's top (with its glow halo, ~1.45·s above the water) ≥ 30px below the points line
        // (lowest case = the super layout, used for both so the composition is identical)
        var ptsBottom = H * 0.225 + Math.min(34, Math.max(20, W * 0.035)) * 0.6;
        waterY = Math.min(H - 0.5 * s, Math.max(ptsBottom + 30 + 1.45 * s, 0.6 * H));
        horizonY = waterY - 0.6 * s;
        reflH = Math.min(H - waterY, 1.3 * s);
        moonR = Math.min(W * 0.1, H * 0.085);
        if (W / H > 1) { moonX = W * 0.84; moonY = H * 0.2; }
        else { moonX = W * 0.8; moonY = Math.max(H * 0.3, H * 0.25 + moonR); }
        // moon sprite: halo + pearly disc + faint maria
        var ms = Math.ceil(moonR * 6 * DPR), mr = moonR * DPR, mc = ms / 2;
        moonSpr = document.createElement('canvas'); moonSpr.width = moonSpr.height = ms;
        var m = moonSpr.getContext('2d');
        var hg = m.createRadialGradient(mc, mc, mr * 0.9, mc, mc, mc);
        hg.addColorStop(0, 'rgba(255,246,220,.34)'); hg.addColorStop(0.35, 'rgba(255,240,210,.12)'); hg.addColorStop(1, 'rgba(255,240,210,0)');
        m.fillStyle = hg; m.fillRect(0, 0, ms, ms);
        var dg = m.createRadialGradient(mc - mr * 0.3, mc - mr * 0.35, mr * 0.1, mc, mc, mr);
        dg.addColorStop(0, '#FFFFF8'); dg.addColorStop(0.6, '#FBF3DA'); dg.addColorStop(1, '#EFE0B8');
        m.fillStyle = dg; m.beginPath(); m.arc(mc, mc, mr, 0, TAU); m.fill();
        m.fillStyle = 'rgba(206,190,150,.22)';
        [[-0.3, -0.18, 0.26, 0.2], [0.22, 0.1, 0.3, 0.22], [-0.05, 0.42, 0.16, 0.11], [0.38, -0.36, 0.12, 0.1], [-0.42, 0.25, 0.1, 0.08]].forEach(function (c) {
          m.beginPath(); m.ellipse(mc + c[0] * mr, mc + c[1] * mr, c[2] * mr, c[3] * mr, 0.3, 0, TAU); m.fill();
        });
        m.strokeStyle = 'rgba(255,255,240,.65)'; m.lineWidth = Math.max(1, mr * 0.03);
        m.beginPath(); m.arc(mc, mc, mr * 0.985, 0, TAU); m.stroke();
        waterGrad = ctx.createLinearGradient(0, horizonY, 0, H);
        waterGrad.addColorStop(0, hexA(waterCol, 0.30)); waterGrad.addColorStop(0.08, hexA(waterCol, 0.16));
        waterGrad.addColorStop(1, hexA(waterCol, 0.34));
      }
      fit();
      window.addEventListener('resize', fit);

      // glow sprites (warm + pink)
      function makeGlow(c0, c1, c2) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, c0); gr.addColorStop(0.22, c1); gr.addColorStop(0.55, c2); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      }
      var sprWarm = makeGlow('rgba(255,255,235,1)', 'rgba(255,236,170,.8)', 'rgba(255,210,120,.22)');
      var sprPink = makeGlow('rgba(255,250,252,1)', hexA(heartHi, 0.8), hexA(heartCol, 0.25));
      var sprCool = makeGlow('rgba(255,255,255,1)', 'rgba(225,240,255,.7)', hexA(glow, 0.2));

      // lotus-lantern sprite (super)
      var lotus = null;
      if (isSuper) {
        lotus = document.createElement('canvas'); lotus.width = 200; lotus.height = 140;
        var lo = lotus.getContext('2d');
        lo.translate(100, 108);
        lo.fillStyle = '#1F6E55'; lo.beginPath(); lo.ellipse(0, 10, 92, 18, 0, 0, TAU); lo.fill();
        lo.fillStyle = '#2E9470'; lo.beginPath(); lo.ellipse(0, 7, 86, 14, 0, 0, TAU); lo.fill();
        lo.strokeStyle = 'rgba(20,70,52,.6)'; lo.lineWidth = 2; lo.beginPath(); lo.moveTo(0, 7); lo.lineTo(30, 18); lo.stroke();
        var petal = function (ang, len, wid, c0, c1, line) {
          var dx = Math.sin(ang), dy = -Math.cos(ang), px = -dy, py = dx;
          var tx = dx * len, ty = dy * len;
          var g = lo.createLinearGradient(0, 0, tx, ty);
          g.addColorStop(0, c0); g.addColorStop(1, c1);
          lo.fillStyle = g; lo.strokeStyle = line; lo.lineWidth = 2;
          lo.beginPath(); lo.moveTo(0, 0);
          lo.quadraticCurveTo(dx * len * 0.5 + px * wid, dy * len * 0.5 + py * wid, tx, ty);
          lo.quadraticCurveTo(dx * len * 0.5 - px * wid, dy * len * 0.5 - py * wid, 0, 0);
          lo.fill(); lo.stroke();
        };
        [-1.25, -0.62, 0, 0.62, 1.25].forEach(function (a) { petal(a, 82, 26, '#E85E9A', '#FFD3E6', 'rgba(190,60,120,.55)'); });
        var cg = lo.createRadialGradient(0, -22, 2, 0, -22, 46);
        cg.addColorStop(0, 'rgba(255,250,215,1)'); cg.addColorStop(0.4, 'rgba(255,214,120,.75)'); cg.addColorStop(1, 'rgba(255,190,90,0)');
        lo.fillStyle = cg; lo.beginPath(); lo.arc(0, -22, 46, 0, TAU); lo.fill();
        [-1.45, -0.85, 0.85, 1.45].forEach(function (a) { petal(a, 70, 24, '#F27AAE', '#FFF0F6', 'rgba(200,70,130,.6)'); });
        [-0.32, 0.32].forEach(function (a) { petal(a, 64, 23, '#FF8DBC', '#FFF6FA', 'rgba(210,80,140,.6)'); });
      }

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { glide: [0, 0.3], bow: [0.2, 0.39], heart: [0.36, 0.47], kiss: 0.38, ring: 0.39, txt: 0.15,
            cyg: [0.36, 0.56], lift: [0.6, 0.72], burst: 0.72 }
        : { glide: [0, 0.44], bow: [0.3, 0.55], heart: [0.5, 0.64], kiss: 0.53, ring: 0.54, txt: 0.2 };
      function seg(t, ab) { return clamp01((t - ab[0] * dur) / ((ab[1] - ab[0]) * dur)); }

      // ─── scenery state (fractions — resize-safe) ───
      var stars = [];
      for (var si = 0; si < 60; si++)
        stars.push({ x: Math.random(), y: Math.pow(Math.random(), 1.25) * 0.94, tw: rnd(0, TAU), rate: rnd(1.5, 4.5),
                     r: rnd(0.6, 1.7), big: si % 9 === 0, col: si % 4 === 0 ? accent : si % 5 === 0 ? glow : '#FFFFFF' });
      var flies = [];
      var NF = isSuper ? 14 : 9;
      for (var fi = 0; fi < NF; fi++)
        flies.push({ x: (fi + rnd(0.15, 0.85)) / NF, y: rnd(-0.75, 0.25), ph: rnd(0, TAU), sp: rnd(0.6, 1.3), r: rnd(0.8, 1.3) });
      var lotusL = [];
      if (isSuper) {
        [[0.1, 0.12, 0.72], [0.9, 0.16, 0.74], [0.2, 0.62, 0.92], [0.81, 0.58, 0.9], [0.33, 0.95, 1.0], [0.68, 0.98, 1.04]].forEach(function (L, i) {
          lotusL.push({ x: L[0], d: L[1], sc: L[2], ph: rnd(0, TAU), at: 0.04 + i * 0.045 });
        });
      }
      var petals = [], bsparks = [];
      if (isSuper) {
        for (var pi = 0; pi < 56; pi++)
          petals.push({ u: pi / 56, sp: rnd(0.45, 1.25), up: rnd(0.1, 0.55), rot: rnd(0, TAU), vr: rnd(-4, 4), ph: rnd(0, TAU),
                        size: rnd(0.045, 0.075), heart: pi % 3 === 0,
                        col: ['#FF8FC0', '#FFB6D7', '#FFD9EA', heartCol, '#FFFFFF', '#FF77AE'][pi % 6] });
        for (var bk = 0; bk < 26; bk++)
          bsparks.push({ a: bk / 26 * TAU + rnd(-0.1, 0.1), sp: rnd(0.5, 1.15), col: bk % 3 === 0 ? accent : bk % 3 === 1 ? '#FFFFFF' : heartHi });
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(heartCol, 0.95) + ',0 0 46px ' + hexA(glow, 0.55) + ',0 2px 5px rgba(0,0,0,.45)';
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

      // ─── swan painting (local units; gradients live in local space, so they are made once) ───
      var OUTL = '#A39BCB';
      var gBody = lg.createLinearGradient(0, -1.3, 0, 0.02);
      gBody.addColorStop(0, '#FFFFFF'); gBody.addColorStop(0.62, '#FCFBFF'); gBody.addColorStop(0.86, '#ECE8FA'); gBody.addColorStop(1, '#CFC8EA');
      var gWing = lg.createLinearGradient(0, -0.7, 0, -0.1);
      gWing.addColorStop(0, '#FFFFFF'); gWing.addColorStop(0.6, '#FAF8FF'); gWing.addColorStop(1, '#E4DEF6');
      var gBeak = lg.createLinearGradient(0, -0.07, 0, 0.05);
      gBeak.addColorStop(0, '#FFB061'); gBeak.addColorStop(0.55, '#FF8A2E'); gBeak.addColorStop(1, '#E8691A');

      function bodyPath(g) {
        g.beginPath();
        g.moveTo(0.34, 0.08);
        g.bezierCurveTo(0.47, 0.0, 0.47, -0.22, 0.33, -0.34);
        g.bezierCurveTo(0.2, -0.45, -0.12, -0.44, -0.4, -0.4);
        g.bezierCurveTo(-0.62, -0.37, -0.8, -0.4, -0.97, -0.5);
        g.bezierCurveTo(-0.92, -0.3, -0.78, -0.06, -0.5, 0.08);
        g.closePath();
      }
      function wingPath(g) {
        g.beginPath();
        g.moveTo(0.17, -0.25);
        g.bezierCurveTo(0.04, -0.43, -0.3, -0.46, -0.56, -0.47);
        g.bezierCurveTo(-0.7, -0.48, -0.79, -0.49, -0.84, -0.53);
        for (var i = 0; i < WING_TIPS.length; i++) { var q = WING_TIPS[i]; g.lineTo(q[0], q[1]); g.quadraticCurveTo(q[2], q[3], q[4], q[5]); }
        for (var j = 0; j < WING_REST.length; j++) g.lineTo(WING_REST[j][0], WING_REST[j][1]);
        g.closePath();
      }
      function strokeRow(g, row) {
        g.beginPath();
        for (var i = 0; i < row.length; i++) { var q = row[i]; g.moveTo(q[0], q[1]); g.quadraticCurveTo(q[2], q[3], q[4], q[5]); }
        g.stroke();
      }
      function smoothThrough(g, pts, first) {
        if (first) g.moveTo(pts[0][0], pts[0][1]); else g.lineTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length - 1; i++)
          g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      }
      var NL = [], NR = [], NBa = [], NBb = [];
      for (NI = 0; NI < NN; NI++) { NL.push([0, 0]); NR.push([0, 0]); }
      function skullPath(g, hx, hy, ha) {
        g.beginPath(); g.ellipse(hx, hy, 0.138, 0.108, ha - 0.1, 0, TAU);
      }
      // st: { pose 0 glide … 1 heart, sway, nod, blink, love }
      function drawSwan(g, ox, oy, dir, rot, st) {
        var i, P = [], pose = st.pose;
        for (i = 0; i < NN; i++) {
          var u = i / (NN - 1), a = NECK_GLIDE[i], b = NECK_HEART[i], k = (1 - pose);
          P.push([lerp(a[0], b[0], pose) + st.sway * u * u * k, lerp(a[1], b[1], pose) + Math.sin(u * Math.PI) * 0.05 * pose * k * 4]);
        }
        NBa.length = 0; NBb.length = 0;
        for (i = 0; i < NN; i++) {
          var p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(NN - 1, i + 1)], tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
          var nx = -ty / tl, ny = tx / tl, w = NW[i];
          NL[i][0] = P[i][0] + nx * w; NL[i][1] = P[i][1] + ny * w;
          NR[NN - 1 - i][0] = P[i][0] - nx * w; NR[NN - 1 - i][1] = P[i][1] - ny * w;
          if (i >= 3 && i <= NN - 3) { NBa.push([P[i][0] + nx * w * 0.25, P[i][1] + ny * w * 0.25]); NBb.push([P[i][0] + nx * w * 0.97, P[i][1] + ny * w * 0.97]); }
        }
        var ha = lerp(A_GLIDE + st.nod, A_HEART, pose), ca = Math.cos(ha), sa = Math.sin(ha);
        var e = P[NN - 1], hx = e[0] + HO_F * ca + HO_U * sa, hy = e[1] + HO_F * sa - HO_U * ca;
        function neckPath() { g.beginPath(); smoothThrough(g, NL, true); smoothThrough(g, NR, false); g.closePath(); }

        g.save();
        g.translate(ox, oy); g.rotate(dir * rot); g.scale(dir * s, s);
        g.lineJoin = 'round'; g.lineCap = 'round';
        // outline pass, then fill pass (internal seams vanish)
        g.strokeStyle = OUTL; g.lineWidth = 0.028;
        bodyPath(g); g.stroke(); neckPath(); g.stroke(); skullPath(g, hx, hy, ha); g.stroke();
        g.fillStyle = gBody;
        bodyPath(g); g.fill(); neckPath(); g.fill();
        // soft shading along the throat side of the neck
        g.beginPath(); smoothThrough(g, NBa, true); smoothThrough(g, NBb.slice().reverse(), false); g.closePath();
        g.fillStyle = 'rgba(150,138,205,.1)'; g.fill();
        // breast feather texture
        g.strokeStyle = 'rgba(160,150,210,.32)'; g.lineWidth = 0.014;
        g.beginPath();
        g.moveTo(0.3, -0.13); g.quadraticCurveTo(0.35, -0.1, 0.39, -0.14);
        g.moveTo(0.24, -0.05); g.quadraticCurveTo(0.29, -0.02, 0.33, -0.06);
        g.moveTo(0.34, -0.21); g.quadraticCurveTo(0.38, -0.18, 0.41, -0.22);
        g.stroke();
        // folded wing: drop shadow, body, layered feathers
        g.save(); g.translate(0.015, 0.035); wingPath(g); g.fillStyle = 'rgba(140,128,196,.26)'; g.fill(); g.restore();
        wingPath(g); g.fillStyle = gWing; g.fill();
        g.strokeStyle = OUTL; g.lineWidth = 0.02; g.stroke();
        g.save(); wingPath(g); g.clip();
        g.strokeStyle = 'rgba(150,138,205,.5)'; g.lineWidth = 0.016;
        strokeRow(g, WING_ROW2);
        g.strokeStyle = 'rgba(150,138,205,.38)'; g.lineWidth = 0.014;
        strokeRow(g, WING_ROW3);
        // long primary feather lines toward the raised tip
        g.strokeStyle = 'rgba(150,138,205,.42)'; g.lineWidth = 0.013;
        g.beginPath();
        g.moveTo(-0.4, -0.4); g.quadraticCurveTo(-0.62, -0.44, -0.8, -0.5);
        g.stroke();
        g.restore();
        // tail feathers
        g.strokeStyle = 'rgba(150,138,205,.45)'; g.lineWidth = 0.014;
        g.beginPath(); g.moveTo(-0.84, -0.38); g.lineTo(-0.95, -0.46); g.moveTo(-0.82, -0.3); g.lineTo(-0.92, -0.37); g.stroke();

        // head
        g.fillStyle = gBody; skullPath(g, hx, hy, ha); g.fill();
        g.save(); g.translate(hx, hy); g.rotate(ha);
        // crown shine
        g.fillStyle = 'rgba(255,255,255,.95)';
        g.beginPath(); g.ellipse(-0.04, -0.064, 0.06, 0.026, -0.2, 0, TAU); g.fill();
        // orange beak with a slight down-hook
        g.fillStyle = gBeak; g.strokeStyle = '#C2551A'; g.lineWidth = 0.014;
        g.beginPath(); g.moveTo(0.1, -0.062);
        g.quadraticCurveTo(0.22, -0.056, 0.32, -0.01);
        g.quadraticCurveTo(0.348, 0.012, 0.315, 0.03);
        g.quadraticCurveTo(0.21, 0.046, 0.105, 0.036);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#B8481A'; g.beginPath(); g.ellipse(0.312, 0.01, 0.022, 0.017, 0.3, 0, TAU); g.fill(); // nail
        g.strokeStyle = 'rgba(160,60,15,.7)'; g.lineWidth = 0.011;
        g.beginPath(); g.moveTo(0.12, 0.012); g.quadraticCurveTo(0.21, 0.026, 0.295, 0.018); g.stroke();      // smile line
        g.fillStyle = 'rgba(255,228,195,.85)'; g.beginPath(); g.ellipse(0.21, -0.032, 0.05, 0.011, 0.14, 0, TAU); g.fill(); // shine
        g.fillStyle = '#7A3510'; g.beginPath(); g.ellipse(0.19, -0.018, 0.013, 0.006, 0.15, 0, TAU); g.fill(); // nostril
        // slim dark rim at the beak base + the black knob on top
        g.strokeStyle = '#2B2338'; g.lineWidth = 0.016;
        g.beginPath(); g.moveTo(0.104, -0.058); g.quadraticCurveTo(0.094, -0.01, 0.108, 0.034); g.stroke();
        g.fillStyle = '#2B2338';
        g.beginPath(); g.ellipse(0.12, -0.066, 0.036, 0.026, 0.15, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(0.11, -0.075, 0.012, 0.006, 0.1, 0, TAU); g.fill();
        // blush
        g.fillStyle = 'rgba(255,128,170,.5)'; g.beginPath(); g.ellipse(0.005, 0.052, 0.044, 0.024, 0, 0, TAU); g.fill();
        // one eye with a lash
        var ex = -0.005, ey = -0.018;
        if (st.love > 0.5) {         // dreamy closed eye
          g.strokeStyle = '#2B2338'; g.lineWidth = 0.017;
          g.beginPath(); g.arc(ex, ey - 0.016, 0.034, 0.35, Math.PI - 0.35); g.stroke();
          g.lineWidth = 0.012;
          g.beginPath(); g.moveTo(ex - 0.03, ey - 0.004); g.quadraticCurveTo(ex - 0.048, ey - 0.006, ex - 0.056, ey - 0.024); g.stroke();
        } else {
          var bl = st.blink;
          g.save(); g.beginPath(); g.ellipse(ex, ey, 0.037, 0.042 * Math.max(0.1, bl), 0, 0, TAU); g.clip();
          g.fillStyle = '#1E1830'; g.fillRect(ex - 0.05, ey - 0.05, 0.1, 0.1);
          g.fillStyle = '#5E4F92'; g.beginPath(); g.arc(ex + 0.004, ey + 0.02, 0.024, 0, TAU); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex + 0.012, ey - 0.014, 0.014, 0, TAU); g.fill();
          g.beginPath(); g.arc(ex - 0.014, ey + 0.016, 0.006, 0, TAU); g.fill();
          g.restore();
          g.strokeStyle = '#2B2338'; g.lineWidth = 0.012;
          g.beginPath(); g.moveTo(ex - 0.03, ey - 0.026); g.quadraticCurveTo(ex - 0.05, ey - 0.032, ex - 0.058, ey - 0.052); g.stroke();
        }
        g.restore();
        g.restore();
      }

      // ─── heart outline in world coords ───
      var HW = [];
      for (var hw = 0; hw < HEART_HALF.length; hw++) HW.push([0, 0]);
      function heartWorld(oxL, oy) {
        for (var i = 0; i < HEART_HALF.length; i++) { HW[i][0] = oxL + HEART_HALF[i][0] * s; HW[i][1] = oy + HEART_HALF[i][1] * s; }
      }
      function heartPathFull(g, f) {         // both halves from the tip up to fraction f (1 = closed)
        var n = HEART_HALF.length - 1, m = Math.max(1, Math.round(n * f)), i;
        g.beginPath(); g.moveTo(HW[0][0], HW[0][1]);
        for (i = 1; i <= m; i++) g.lineTo(HW[i][0], HW[i][1]);
        if (f >= 1) { for (i = n; i >= 0; i--) g.lineTo(2 * cx - HW[i][0], HW[i][1]); g.closePath(); }
        else { g.moveTo(2 * cx - HW[0][0], HW[0][1]); for (i = 1; i <= m; i++) g.lineTo(2 * cx - HW[i][0], HW[i][1]); }
      }

      function glowDot(g, spr, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        g.globalAlpha = a > 1 ? 1 : a;
        g.drawImage(spr, x - r, y - r, r * 2, r * 2);
        g.globalAlpha = 1;
      }
      function fluffPath(g, x0, y0, rx, ry, n, bump, ph) {
        g.beginPath();
        for (var k = 0; k <= n; k++) {
          var a = ph + k / n * TAU, px = x0 + Math.cos(a) * rx, py = y0 + Math.sin(a) * ry;
          if (!k) g.moveTo(px, py);
          else { var am = ph + (k - 0.5) / n * TAU; g.quadraticCurveTo(x0 + Math.cos(am) * (rx + bump), y0 + Math.sin(am) * (ry + bump), px, py); }
        }
        g.closePath();
      }
      // fluffy grey cygnet, facing +x, waterline y = 0
      function cygnetShape(g, st) {
        g.lineJoin = 'round'; g.lineCap = 'round';
        var gr = g.createLinearGradient(0, -1.1, 0, 0.05);
        gr.addColorStop(0, '#DCD8E6'); gr.addColorStop(0.55, '#ADA7C0'); gr.addColorStop(1, '#7E7896');
        g.strokeStyle = '#6F6889'; g.lineWidth = 0.06;
        fluffPath(g, 0, -0.3, 0.5, 0.34, 14, 0.035, 0.2); g.stroke();
        fluffPath(g, 0.36, -0.8, 0.26, 0.25, 11, 0.03, 0.5); g.stroke();
        g.fillStyle = gr;
        fluffPath(g, 0, -0.3, 0.5, 0.34, 14, 0.035, 0.2); g.fill();
        fluffPath(g, 0.36, -0.8, 0.26, 0.25, 11, 0.03, 0.5); g.fill();
        // fluffy wing nub
        g.fillStyle = 'rgba(150,142,178,.6)'; fluffPath(g, -0.1, -0.36, 0.25, 0.15, 8, 0.03, 0.1); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(0.24, -0.92, 0.09, 0.05, -0.5, 0, TAU); g.fill();
        // crown tuft
        g.strokeStyle = '#8E88A8'; g.lineWidth = 0.045;
        g.beginPath(); g.moveTo(0.3, -1.03); g.quadraticCurveTo(0.27, -1.16, 0.36, -1.15);
        g.moveTo(0.38, -1.04); g.quadraticCurveTo(0.42, -1.17, 0.5, -1.1); g.stroke();
        // little dark beak
        g.fillStyle = '#4A4458';
        g.beginPath(); g.moveTo(0.58, -0.86); g.quadraticCurveTo(0.72, -0.84, 0.78, -0.77); g.quadraticCurveTo(0.7, -0.72, 0.58, -0.74); g.closePath(); g.fill();
        // blush
        g.fillStyle = 'rgba(255,130,170,.5)'; g.beginPath(); g.ellipse(0.47, -0.69, 0.07, 0.04, 0, 0, TAU); g.fill();
        // big eye
        if (st.happy) {
          g.strokeStyle = '#231D33'; g.lineWidth = 0.045;
          g.beginPath(); g.arc(0.42, -0.8, 0.065, Math.PI + 0.35, TAU - 0.35); g.stroke();
        } else {
          g.fillStyle = '#231D33'; g.beginPath(); g.ellipse(0.42, -0.83, 0.07, 0.08, 0, 0, TAU); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0.44, -0.86, 0.028, 0, TAU); g.fill();
          g.beginPath(); g.arc(0.395, -0.8, 0.013, 0, TAU); g.fill();
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 260);
        var i, k, q;

        // ═══ sky ═══
        for (i = 0; i < stars.length; i++) {
          var S = stars[i], sx = S.x * W, sy = S.y * (horizonY - 0.12 * s);
          var dmx = sx - moonX, dmy = sy - moonY;
          if (dmx * dmx + dmy * dmy < moonR * moonR * 2.2) continue;
          var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * S.rate + S.tw));
          ctx.fillStyle = hexA(S.col, 0.85 * tw * appear);
          if (S.big) { glowDot(ctx, sprCool, sx, sy, 9 * unit + 3, 0.35 * tw * appear); sparkPath(ctx, sx, sy, (3.5 + 3 * tw) * unit + 1.5); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(sx, sy, S.r * unit + 0.4, 0, TAU); ctx.fill(); }
        }
        ctx.globalAlpha = appear * (0.92 + 0.08 * Math.sin(t * 0.002));
        ctx.drawImage(moonSpr, moonX - moonR * 3, moonY - moonR * 3, moonR * 6, moonR * 6);
        ctx.globalAlpha = 1;
        // far shore: soft rolling hills on the horizon
        ctx.fillStyle = hexA('#0A0C22', 0.75 * appear);
        ctx.beginPath(); ctx.moveTo(0, horizonY + 1);
        for (i = 0; i <= 24; i++) {
          var hx0 = i / 24 * W, xf = i / 24;
          ctx.lineTo(hx0, horizonY - s * (0.06 + 0.07 * Math.pow(Math.sin(xf * 5.2 + 0.6), 2) + 0.03 * Math.sin(xf * 17.3)));
        }
        ctx.lineTo(W, horizonY + 1); ctx.closePath(); ctx.fill();
        // ═══ water ═══
        ctx.globalAlpha = appear;
        ctx.fillStyle = waterGrad; ctx.fillRect(0, horizonY, W, H - horizonY);
        ctx.globalAlpha = 1;
        ctx.fillStyle = hexA('#DDEBFF', 0.35 * appear); ctx.fillRect(0, horizonY, W, Math.max(1, 1.2 * unit));
        // moon glitter path
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        var NG = 44;
        for (i = 0; i < NG; i++) {
          var gq = (i + 0.5 * Math.sin(i * 3.7)) / (NG - 1), gy = horizonY + 3 + Math.pow(clamp01(gq), 1.35) * (H - horizonY - 3);
          var gw = (0.06 + 0.5 * gq) * moonR * (0.4 + 0.8 * Math.abs(Math.sin(i * 7.3 + t * 0.0021)));
          var gx = moonX + Math.sin(i * 12.9 + t * 0.0011) * moonR * (0.2 + 0.75 * gq);
          var ga = (0.08 + 0.5 * Math.pow(Math.abs(Math.sin(t * 0.0035 + i * 2.3)), 5)) * (1 - gq * 0.4) * appear;
          ctx.fillStyle = hexA('#FFF3D6', ga);
          ctx.beginPath(); ctx.ellipse(gx, gy, gw, Math.max(0.7, (0.8 + 1.6 * gq) * unit), 0, 0, TAU); ctx.fill();
        }
        glowDot(ctx, sprWarm, moonX, horizonY + 0.02 * s, moonR * 1.4, 0.25 * appear);
        ctx.restore();
        // slow wave lines across the lake
        ctx.lineWidth = Math.max(1, 1.3 * unit);
        for (i = 0; i < 9; i++) {
          var wq = (i + 0.5) / 9, wy = horizonY + Math.pow(wq, 1.4) * (H - horizonY);
          ctx.strokeStyle = hexA(glow, (0.07 + 0.06 * wq) * appear);
          ctx.beginPath();
          for (k = 0; k < 5; k++) {
            var wx = ((k / 5 + i * 0.37 + t * 0.00002 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * W * 1.2 - W * 0.1;
            var wl = (0.04 + 0.05 * wq) * W;
            ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + wl / 2, wy - 2 * unit * (1 + wq), wx + wl, wy);
          }
          ctx.stroke();
        }

        // ═══ swans' motion ═══
        var gl = easeOut(seg(t, T.glide));
        var finL = cx - HEART_CX * s, startL = finL - Math.max(W * 0.44, s * 1.1);
        var oxL = lerp(startL, finL, gl), oxR = 2 * cx - oxL;
        var pose = easeInOut(seg(t, T.bow));
        var bob = Math.sin(t * 0.0031) * 0.012 * s * (1 - 0.6 * pose);
        var oy = waterY + bob;
        var rot = Math.sin(t * 0.0031 + 0.9) * 0.014 * (1 - pose);
        var heartQ = seg(t, T.heart), heartA = easeOut(heartQ);
        var love = t > T.kiss * dur ? 1 : 0;
        var blQ = (t - 520) / 170, blink = blQ > 0 && blQ < 1 ? Math.abs(Math.cos(blQ * Math.PI)) : 1;
        var swSt = { pose: pose, sway: Math.sin(t * 0.0024) * 0.035, nod: Math.sin(t * 0.0031 + 0.4) * 0.06 * (1 - pose), blink: blink, love: love };

        // V-shaped wakes and ripple rings — far parts go behind the swans
        function wakes(near) {
          var gEnd = T.glide[1] * dur;
          ctx.lineWidth = Math.max(1.2, 2 * unit);
          for (var side = 0; side < 2; side++) {
            var dir = side ? -1 : 1;
            for (var c = 0; c < 18; c++) {
              var te = c * 70, age = t - te;
              if (te > gEnd * 0.8 || age <= 0 || age > 1100) continue;
              var qa = age / 1100, sp0 = Math.pow(1 - clamp01(te / gEnd), 2);
              var ox0 = lerp(startL, finL, easeOut(te / gEnd));
              var apx = side ? 2 * cx - ox0 - 0.44 * s : ox0 + 0.44 * s;
              var len = (0.1 + 0.75 * easeOut(qa)) * s;
              var a = 0.75 * (1 - qa) * (1 - qa) * Math.sqrt(sp0) * appear;
              if (a < 0.01) continue;
              ctx.strokeStyle = hexA(c % 2 ? '#FFFFFF' : glow, a);
              ctx.beginPath();
              if (near) { ctx.moveTo(apx, waterY + 2); ctx.quadraticCurveTo(apx - dir * len * 0.5, waterY + len * 0.05, apx - dir * len, waterY + len * 0.15); }
              else { ctx.moveTo(apx, waterY - 1); ctx.quadraticCurveTo(apx - dir * len * 0.5, waterY - len * 0.025, apx - dir * len, waterY - len * 0.06); }
              ctx.stroke();
            }
          }
        }
        function rings(near) {
          var r0 = T.ring * dur;
          for (var r = 0; r < 3; r++) {
            var rq = (t - r0 - r * 240) / (isSuper ? 1500 : 1150);
            if (rq <= 0 || rq >= 1) continue;
            var rx = lerp(0.5 * s, Math.min(W * 0.52, 2.1 * s), easeOut(rq)), ry = rx * 0.13;
            ctx.strokeStyle = hexA(r % 2 ? '#FFFFFF' : heartHi, 0.6 * Math.pow(1 - rq, 1.4));
            ctx.lineWidth = Math.max(1, (2.6 - 1.6 * rq) * unit);
            ctx.beginPath();
            ctx.ellipse(cx, waterY + 0.01 * s, rx, ry, 0, near ? 0 : Math.PI, near ? Math.PI : TAU);
            ctx.stroke();
          }
        }
        wakes(false); rings(false);

        // ═══ layer: everything above the water that reflects ═══
        lg.clearRect(0, 0, W, waterY + 2);
        lg.save();
        lg.beginPath(); lg.rect(0, 0, W, waterY); lg.clip();
        heartWorld(oxL, oy);
        var hcx = cx, hcy = oy + HC[1] * s;
        var hbt = (t - T.heart[1] * dur) % 1100;                 // a soft two-beat heartbeat once the heart is drawn
        var hbeat = t > T.heart[1] * dur ? Math.exp(-hbt / 90) * 0.35 + Math.exp(-Math.max(0, hbt - 220) / 110) * (hbt > 220 ? 0.25 : 0) : 0;
        var liftDim = isSuper ? easeInOut(seg(t, T.lift)) * (1 - clamp01((t - T.burst * dur) / 900)) : 0;
        var shim = (0.82 + 0.12 * Math.sin(t * 0.009) + hbeat) * (1 - 0.55 * liftDim);
        if (heartA > 0) {
          // inner warm glow + halo behind the necks
          lg.save(); lg.globalCompositeOperation = 'lighter';
          var ig = lg.createRadialGradient(hcx, hcy - 0.08 * s, 0.04 * s, hcx, hcy, 0.72 * s);
          ig.addColorStop(0, hexA(heartHi, 0.55 * heartA * shim)); ig.addColorStop(0.55, hexA(heartCol, 0.3 * heartA * shim)); ig.addColorStop(1, hexA(heartCol, 0.05 * heartA));
          lg.fillStyle = ig; heartPathFull(lg, 1); lg.fill();
          lg.lineJoin = 'round'; lg.lineCap = 'round';
          heartPathFull(lg, heartA);
          lg.strokeStyle = hexA(heartCol, 0.13 * heartA * shim); lg.lineWidth = 0.38 * s; lg.stroke();
          lg.strokeStyle = hexA(heartCol, 0.22 * heartA * shim); lg.lineWidth = 0.21 * s; lg.stroke();
          lg.strokeStyle = hexA(heartHi, 0.4 * heartA * shim); lg.lineWidth = 0.09 * s; lg.stroke();
          lg.strokeStyle = hexA('#FFF4FA', 0.85 * heartA); lg.lineWidth = Math.max(1.5, 0.02 * s); lg.stroke();
          lg.restore();
        }
        drawSwan(lg, oxR, oy, -1, rot, swSt);
        drawSwan(lg, oxL, oy, 1, rot, swSt);
        if (heartA > 0) {
          lg.save(); lg.globalCompositeOperation = 'lighter'; lg.lineJoin = 'round'; lg.lineCap = 'round';
          heartPathFull(lg, heartA * FRONT_F);
          lg.strokeStyle = hexA(heartCol, 0.5 * heartA * shim); lg.lineWidth = 0.05 * s; lg.stroke();
          lg.strokeStyle = hexA(heartHi, 0.95 * heartA); lg.lineWidth = Math.max(1.5, 0.016 * s); lg.stroke();
          // shimmering sparkles riding the outline
          var nH = HEART_HALF.length - 1;
          for (k = 0; k < 12; k++) {
            var su = ((k / 12 + t * 0.00018) % 1);
            var fi2 = su * 2 * nH, side2 = fi2 > nH ? 1 : 0, idx = side2 ? Math.round(2 * nH - fi2) : Math.round(fi2);
            if (idx / nH > heartA * FRONT_F) continue;
            var px = side2 ? 2 * cx - HW[idx][0] : HW[idx][0], py = HW[idx][1];
            var tw2 = 0.5 + 0.5 * Math.sin(t * 0.012 + k * 2.1);
            glowDot(lg, sprPink, px, py, 0.08 * s * (0.6 + tw2), 0.7 * heartA * tw2);
            lg.fillStyle = hexA(k % 3 === 0 ? accent : '#FFFFFF', heartA * (0.4 + 0.6 * tw2));
            sparkPath(lg, px, py, 0.03 * s * (0.5 + tw2)); lg.fill();
          }
          lg.restore();
        }
        // kiss sparkle where the beaks meet
        var kq = (t - T.kiss * dur) / 700;
        if (kq > 0 && kq < 1) {
          var kx = cx, ky = oy + (NB[1] - (5 - H0[1]) * HK - 0.03) * s;
          lg.save(); lg.globalCompositeOperation = 'lighter';
          glowDot(lg, sprPink, kx, ky, s * (0.15 + 0.5 * easeOut(kq)), 0.9 * (1 - kq));
          for (k = 0; k < 8; k++) {
            var ka = k / 8 * TAU - Math.PI / 2, kr = s * (0.06 + 0.32 * easeOut(kq));
            lg.fillStyle = hexA(k % 2 ? accent : '#FFFFFF', 1 - kq);
            if (k % 2) sparkPath(lg, kx + Math.cos(ka) * kr, ky + Math.sin(ka) * kr, s * 0.035 * (1 - kq * 0.5));
            else heartShape(lg, kx + Math.cos(ka) * kr, ky + Math.sin(ka) * kr, s * 0.03 * (1 - kq * 0.4));
            lg.fill();
          }
          lg.restore();
        }
        // super: the glowing heart lifts off the necks …
        var liftQ = isSuper ? seg(t, T.lift) : 0, burstT = isSuper ? t - T.burst * dur : -1;
        if (isSuper && liftQ > 0 && burstT < 220) {
          var lq = easeInOut(liftQ), lift = lq * LIFT * s;
          var lsc = lerp(1, LSC, lq) * (burstT > 0 ? 1 + 0.35 * easeOut(burstT / 220) : 1);
          var la = clamp01(liftQ * 2.5) * (burstT > 0 ? 1 - burstT / 220 : 1);
          var beat = 1 + 0.06 * Math.pow(Math.max(0, Math.sin(t * 0.011)), 6);
          lg.save();
          lg.translate(hcx, hcy - lift); lg.scale(lsc * beat, lsc * beat); lg.translate(-hcx, -hcy);
          lg.globalCompositeOperation = 'lighter'; lg.lineJoin = 'round';
          var fg = lg.createRadialGradient(hcx - 0.12 * s, hcy - 0.25 * s, 0.02 * s, hcx, hcy, 0.75 * s);
          fg.addColorStop(0, hexA('#FFFFFF', 0.95 * la)); fg.addColorStop(0.3, hexA(heartHi, 0.8 * la * lq)); fg.addColorStop(1, hexA(heartCol, 0.7 * la * lq));
          heartPathFull(lg, 1);
          lg.strokeStyle = hexA(heartCol, 0.3 * la); lg.lineWidth = 0.3 * s; lg.stroke();
          lg.strokeStyle = hexA(heartHi, 0.35 * la); lg.lineWidth = 0.12 * s; lg.stroke();
          lg.fillStyle = fg; lg.fill();
          lg.strokeStyle = hexA('#FFFFFF', 0.95 * la); lg.lineWidth = Math.max(2, 0.03 * s); lg.stroke();
          lg.restore();
          // a trail of glints rising with it
          for (k = 0; k < 7; k++) {
            var gq2 = ((t * 0.0016 + k / 7) % 1), gxk = hcx + Math.sin(k * 2.4 + t * 0.003) * 0.35 * s * (1 - gq2);
            glowDot(lg, sprPink, gxk, hcy - lift + (0.5 - gq2) * 0.6 * s, 0.05 * s, 0.8 * la * (1 - gq2) * lq);
          }
        }
        lg.restore();

        // composite the layer, then its wobbling reflection, band by band
        ctx.globalAlpha = appear; ctx.drawImage(lay, 0, 0, lay.width, Math.round(waterY * DPR), 0, 0, W, Math.round(waterY * DPR) / DPR);
        var bh = 2;
        for (var d = 0; d < reflH; d += bh) {
          var srcY = waterY - d - bh;
          if (srcY < 0) break;
          var fall = 1 - d / reflH;
          ctx.globalAlpha = 0.42 * fall * fall * appear;
          var wob = Math.sin(d * 0.12 - t * 0.0065) * (1 + d * 0.045) * unit * 1.6;
          ctx.drawImage(lay, 0, Math.round(srcY * DPR), lay.width, Math.max(1, Math.round(bh * DPR)), wob, waterY + d, W, bh);
        }
        ctx.globalAlpha = 1;
        // waterline glints around the bodies + near halves of wakes and rings
        ctx.lineWidth = Math.max(1, 1.4 * unit);
        ctx.strokeStyle = hexA('#E6F0FF', 0.4 * appear);
        ctx.beginPath(); ctx.ellipse(oxL - 0.3 * s, waterY + 0.012 * s, 0.76 * s, 0.05 * s, 0, 0.05, Math.PI - 0.05); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(oxR + 0.3 * s, waterY + 0.012 * s, 0.76 * s, 0.05 * s, 0, 0.05, Math.PI - 0.05); ctx.stroke();
        wakes(true); rings(true);

        // ═══ super extras ═══
        if (isSuper) {
          // lotus lanterns
          for (i = 0; i < lotusL.length; i++) {
            var L = lotusL[i], la2 = seg(t, [L.at, L.at + 0.12]);
            if (la2 <= 0) continue;
            var ly = lerp(horizonY + 0.1 * s, H - 0.06 * s, L.d) + Math.sin(t * 0.003 + L.ph) * 0.012 * s;
            if (ly < waterY + 0.04 * s && ly > waterY - 0.08 * s) ly = waterY - 0.08 * s;
            var lx = L.x * W + Math.sin(t * 0.0009 + L.ph) * 0.03 * s;
            var lw = s * 0.36 * L.sc * lerp(0.55, 1, L.d) * easeOutBack(la2) * (W < H ? 1.35 : 1);
            if (lw <= 0) continue;
            var lh = lw * 0.7, flick = 0.8 + 0.2 * Math.sin(t * 0.017 + L.ph * 3);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.45 * la2 * flick;
            ctx.drawImage(sprWarm, lx - lw * 0.35, ly, lw * 0.7, lw * 1.3);   // glow on the water
            ctx.restore();
            glowDot(ctx, sprWarm, lx, ly - lh * 0.45, lw * 0.75, 0.5 * la2 * flick);
            ctx.globalAlpha = clamp01(la2 * 2);
            ctx.drawImage(lotus, lx - lw / 2, ly - lh * 0.77, lw, lh);
            ctx.globalAlpha = 1;
            glowDot(ctx, sprWarm, lx, ly - lh * 0.42, lw * 0.22, 0.85 * la2 * flick);
          }
          // the cygnet paddles in between them
          var cq = seg(t, T.cyg);
          if (cq > 0) {
            var cs = s * 0.38, cyW = waterY + 0.3 * s;
            var cxp = lerp(W + cs * 1.2, cx + 0.04 * s, easeOut(cq));
            var hop = cq >= 1 ? Math.max(0, Math.sin((t - T.cyg[1] * dur) * 0.009)) * 0.06 * s * clamp01(1 - (t - T.cyg[1] * dur) / 1400) : 0;
            var cby = cyW + Math.sin(t * 0.008) * 0.01 * s - hop;
            var cst = { happy: cq >= 1 && t - T.cyg[1] * dur > 120 };
            // paddle ripples
            ctx.lineWidth = Math.max(1, 1.2 * unit);
            for (k = 0; k < 3; k++) {
              var pq = ((t * 0.0011 + k / 3) % 1);
              ctx.strokeStyle = hexA('#E6F0FF', 0.4 * (1 - pq));
              ctx.beginPath(); ctx.ellipse(cxp + pq * cs * 0.6 * (cq < 1 ? 1 : 0), cyW, cs * (0.55 + pq * 0.9), cs * (0.08 + pq * 0.12), 0, 0, Math.PI); ctx.stroke();
            }
            // reflection
            ctx.save(); ctx.translate(cxp, cyW); ctx.scale(-cs, -cs * 0.85); ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.rect(-2, -2, 4, 2); ctx.clip();
            ctx.translate(0, -(cyW - cby) / cs); cygnetShape(ctx, cst);
            ctx.restore();
            ctx.save(); ctx.translate(cxp, cyW); ctx.scale(-cs, cs);
            ctx.beginPath(); ctx.rect(-2, -2, 4, 2); ctx.clip();
            ctx.translate(0, (cby - cyW) / cs); cygnetShape(ctx, cst);
            ctx.restore();
          }
          // … and bursts into a soft shower of petals and sparkles
          if (burstT > 0) {
            var bx0 = hcx, by0 = hcy - LIFT * s, bt = burstT / 1000;
            var fq = burstT / 520;
            if (fq < 1) {
              ctx.save(); ctx.globalCompositeOperation = 'lighter';
              glowDot(ctx, sprPink, bx0, by0, s * (0.4 + 1.0 * easeOut(fq)), 0.75 * (1 - fq) * (1 - fq));
              ctx.strokeStyle = hexA(heartHi, 0.7 * (1 - fq) * (1 - fq)); ctx.lineWidth = Math.max(1.5, 0.025 * s * (1 - fq));
              ctx.beginPath(); var rr = s * (0.2 + 1.1 * easeOut(fq)); ctx.ellipse(bx0, by0, rr, rr * 0.5, 0, 0, TAU); ctx.stroke();
              ctx.restore();
            }
            for (k = 0; k < bsparks.length; k++) {
              var B = bsparks[k], bq = burstT / 1100;
              if (bq >= 1) continue;
              var br = s * B.sp * 1.6 * easeOut(bq);
              var bxp = bx0 + Math.cos(B.a) * br, byp = by0 + Math.sin(B.a) * br * (Math.sin(B.a) < 0 ? 0.3 : 0.85) + bq * bq * 0.3 * s;
              ctx.fillStyle = hexA(B.col, 1 - bq);
              sparkPath(ctx, bxp, byp, s * 0.045 * (1 - bq * 0.6)); ctx.fill();
            }
            var tau = (1 - Math.exp(-4 * bt)) / 4;
            for (k = 0; k < petals.length; k++) {
              var Pt = petals[k], hi = Math.round(Pt.u * 2 * (HEART_HALF.length - 1)), nH2 = HEART_HALF.length - 1;
              var hsd = hi > nH2, hix = hsd ? 2 * nH2 - hi : hi;
              var p0x = hsd ? 2 * cx - HW[hix][0] : HW[hix][0], p0y = HW[hix][1];
              p0x = hcx + (p0x - hcx) * LSC * 1.4; p0y = hcy + (p0y - hcy) * LSC * 1.4 - LIFT * s;
              var vx = (p0x - bx0), vy = (p0y - by0) - Pt.up * s * 0.4, vl = Math.sqrt(vx * vx + vy * vy) || 1;
              if (vy < 0) vy *= 0.35;
              var ppx = p0x + vx / vl * Pt.sp * s * 4.5 * tau + Math.sin(bt * 3 + Pt.ph) * 0.06 * s * clamp01(bt * 2);
              var ppy = p0y + vy / vl * Pt.sp * s * 4.5 * tau + bt * bt * 0.12 * s + bt * 0.22 * s;
              var pa = clamp01(bt * 6) * clamp01((dur - t) / 500);
              if (pa <= 0) continue;
              var pr = Pt.size * s, flip = Math.cos(bt * 5 + Pt.ph);
              ctx.save(); ctx.translate(ppx, ppy); ctx.rotate(Pt.rot + Pt.vr * bt); ctx.scale(1, 0.35 + 0.65 * Math.abs(flip));
              ctx.globalAlpha = pa;
              ctx.fillStyle = Pt.col;
              if (Pt.heart) heartShape(ctx, 0, 0, pr * 0.8);
              else { ctx.beginPath(); ctx.moveTo(0, -pr); ctx.quadraticCurveTo(pr * 0.9, -pr * 0.2, 0, pr); ctx.quadraticCurveTo(-pr * 0.9, -pr * 0.2, 0, -pr); }
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-pr * 0.15, -pr * 0.3, pr * 0.18, pr * 0.32, 0, 0, TAU); ctx.fill();
              ctx.restore();
            }
          }
        }

        // fireflies drifting over the lake
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < flies.length; i++) {
          var Fl = flies[i];
          var fx = Fl.x * W + Math.sin(t * 0.0007 * Fl.sp + Fl.ph) * 0.05 * W;
          var fy = waterY + Fl.y * s + Math.sin(t * 0.0013 * Fl.sp + Fl.ph * 1.7) * 0.08 * s;
          var fa = (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.0045 * Fl.sp + Fl.ph * 3), 2)) * appear;
          glowDot(ctx, sprWarm, fx, fy, (11 * Fl.r) * unit + 4, 0.75 * fa);
          ctx.fillStyle = hexA('#FFFBD8', fa);
          ctx.beginPath(); ctx.arc(fx, fy, 1.6 * unit + 0.6, 0, TAU); ctx.fill();
        }
        ctx.restore();

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
        lay = null; lg = null; moonSpr = null; lotus = null; sprWarm = sprPink = sprCool = null;
      };
    }
  });
})();
