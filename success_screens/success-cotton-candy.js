/* success-cotton-candy.js — מסך הצלחה: שַׂעֲרוֹת סַבְתָּא
   מכונת שערות סבתא של יריד: קערת מתכת עגולה ומבריקה (שפה כרומית עם השתקפויות)
   על בסיס מפוספס ורוד-לבן עם נורות מהבהבות, ובמרכזה ראש מסתובב שמעיף חוטי סוכר
   זוהרים ודקיקים סביב הקערה. גביע נייר מפוספס טובל פנימה ומסתחרר, ועל קצהו
   הולך וגדל ענן סוכר רך (נשיפות שקופות חופפות בוורוד ← לילך בגוון הסקין, עם
   סיבים דקיקים ונצנוצי גבישי סוכר). בסוף שערות הסבתא מתרוממות מהקערה למרכז,
   מסתובבות לעמידה, קופצות בשמחה (מעיכה-קפיצה) ולבבות ונצנוצי סוכר נושבים מהן.
   בסופר: שערות סבתא בשלושה צבעים (ורוד, לילך ותכלת) שגדלות לענן-לב ענק,
   סוכריות-פיזור וכוכבים מתפרצים, ונצנצי סוכר יורדים כמו גשם.
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
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mixRgb(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')'; }
  function hexA(hex, a) { return rgba(hexRgb(hex), a); }
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
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.85);
    ctx.bezierCurveTo(x - r * 1.3, y + r * 0.02, x - r * 0.8, y - r * 1.0, x, y - r * 0.38);
    ctx.bezierCurveTo(x + r * 0.8, y - r * 1.0, x + r * 1.3, y + r * 0.02, x, y + r * 0.85);
    ctx.closePath();
  }
  function seeded(seed) {             // tiny deterministic PRNG → the floss layout looks the same every time
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var q = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
      return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ─── floss shapes (local units: 1 ≈ cloud radius; y down) ───
  var NB = 180;                       // polar boundary tables, one bin per 2°
  function roundR(th) {               // a classic cotton-candy cloud: a little wider on top, lumpy rim
    var c = Math.cos(th), sn = Math.sin(th), ry = sn < 0 ? 0.92 : 0.8;
    var re = 1 / Math.sqrt(c * c + (sn * sn) / (ry * ry));
    return re * (1 + 0.06 * Math.sin(5 * th + 0.6) + 0.035 * Math.sin(9 * th + 1.9));
  }
  var RB = [], HB = [], HEART_BOTTOM = 1;
  (function () {
    var i, j;
    for (i = 0; i < NB; i++) RB.push(roundR(i / NB * TAU));
    // classic parametric heart (deep notch, neat point) → polygon → polar table by ray casting from its centre
    var poly = [], N = 360, cy = 0.12, sc = 1.1;
    for (i = 0; i < N; i++) {
      var u = i / N * TAU, sx = Math.sin(u);
      poly.push([sx * sx * sx * sc, (-(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16 - cy) * sc]);
    }
    for (i = 0; i < NB; i++) {
      var th = i / NB * TAU, dx = Math.cos(th), dy = Math.sin(th), best = 9;
      for (j = 0; j < N; j++) {
        var P = poly[j], Q = poly[(j + 1) % N], ex = Q[0] - P[0], ey = Q[1] - P[1], den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        var r = (P[0] * ey - P[1] * ex) / den, uu = (P[0] * dy - P[1] * dx) / den;
        if (uu >= 0 && uu <= 1 && r > 0 && r < best) best = r;
      }
      HB.push(best);
    }
    HEART_BOTTOM = HB[Math.round(NB / 4)];
  })();
  function tbl(T, th) {
    var f = ((th % TAU) + TAU) % TAU / TAU * NB, i = Math.floor(f), u = f - i;
    return lerp(T[i % NB], T[(i + 1) % NB], u);
  }

  window.SUCCESS.styles.push({
    name: 'cotton-candy',
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
      var PRI = hexRgb(primary), ACC = hexRgb(accent), GLO = hexRgb(glow), WHITE = [255, 255, 255];

      // floss tones (palette-tinted): normal pink → lilac; super pink / lilac / sky-blue
      var PINK = mixRgb([255, 138, 200], PRI, 0.14), LILAC = mixRgb([178, 150, 255], PRI, 0.18), SKY = mixRgb([138, 206, 255], GLO, 0.25);
      var TONES = isSuper
        ? [PINK, mixRgb(PINK, LILAC, 0.5), LILAC, mixRgb(LILAC, SKY, 0.5), SKY]
        : [mixRgb(PINK, WHITE, 0.3), mixRgb(PINK, WHITE, 0.1), PINK, mixRgb(PINK, LILAC, 0.45), LILAC];
      var SHADE = isSuper ? mixRgb([96, 40, 150], PRI, 0.2) : mixRgb([150, 40, 130], PRI, 0.2);
      var STRIPE = mixRgb([255, 102, 170], PRI, 0.12), CREAM = [255, 244, 249];
      var HOT = [255, 92, 168];

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var ML = document.createElement('canvas'), mlx = ML.getContext('2d');   // machine layer (fades as one piece)
      var CB = document.createElement('canvas'), cbx = CB.getContext('2d');   // floss buffer (one light over all puffs)
      var W = 0, H = 0, unit = 1, DPR = 1, bufDPR = 1, s = 100, R = 130, rimY = 400, cx = 200, Yc = 300, HS = 1, FS = 1;
      var ceilY = 0, mSink = 0, hasPts = typeof opts.points === 'number';
      // finale extents in units of s: floss top incl. soft edge + wisps (×max stretch), bounce hop, cone below centre
      var TOP_ROUND = 1.12 * 1.065, TOP_HEART = 1.06 * 1.065 * 1.015, HOP_MAX = 0.14;
      var mlW = 1, mlH = 1, cbHalf = 1;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        bufDPR = Math.min(DPR, 1.5);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
        s = Math.min(H * 0.2, W * 0.3);
        R = Math.min(s * 1.36, W * 0.42);
        cx = W / 2;
        rimY = H * (W >= H ? 0.69 : 0.66);
        // the finished candy (floss, wisps, hearts, sparkles) must stay clearly BELOW the praise / points lines
        var ptsF = Math.max(20, Math.min(34, W * 0.035));
        var txtF = isSuper ? Math.max(34, Math.min(84, W * 0.08)) : Math.max(28, Math.min(58, W * 0.056));
        ceilY = (hasPts ? H * (isSuper ? 0.225 : 0.21) + ptsF * 0.62 : H * 0.13 + txtF * 0.62) + Math.max(14, H * 0.03);
        var up, down;
        if (isSuper) {
          FS = 1;
          HS = Math.max(0.6, Math.min(1.15, (W * 0.47) / (1.22 * s), (H * 0.92 - ceilY - HOP_MAX * s) / (2.53 * s)));
          up = s * (HS * TOP_HEART + HOP_MAX); down = s * (0.36 * HS + 1.04 * Math.min(HS, 1.12));
        } else {
          HS = 1;
          FS = Math.max(0.6, Math.min(1, (H * 0.92 - ceilY - HOP_MAX * s) / (2.62 * s)));
          up = s * (FS * TOP_ROUND + HOP_MAX); down = s * FS * 1.42;
        }
        Yc = Math.max(ceilY + up, Math.min(H * (isSuper ? 0.5 : (W >= H ? 0.46 : 0.44)), H * 0.92 - down));
        // the machine sinks just far enough that the finished cone floats clear of the bowl
        mSink = Math.max(s * (isSuper ? 1.0 : 0.65), Yc + down + s * 0.08 + R * 0.29 - rimY);
        mlW = R * 2.32; mlH = R * 1.42;
        ML.width = Math.max(1, Math.ceil(mlW * DPR)); ML.height = Math.max(1, Math.ceil(mlH * DPR));
        cbHalf = s * 1.7 * HS * FS;
        CB.width = CB.height = Math.max(1, Math.ceil(cbHalf * 2 * bufDPR));
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── sprites (off-DOM) ───
      function softSprite(c, size, stops) {
        var k = document.createElement('canvas'); k.width = k.height = size;
        var g = k.getContext('2d'), h = size / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
        for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], rgba(c, stops[i][1]));
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
        return k;
      }
      var spr = document.createElement('canvas');           // white-gold glow (sparkles, bulbs)
      spr.width = spr.height = 64;
      var sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,240,1)'); sgr.addColorStop(0.2, 'rgba(255,236,190,.8)');
      sgr.addColorStop(0.5, 'rgba(255,214,150,.25)'); sgr.addColorStop(1, 'rgba(255,214,150,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);
      var PGLOW = softSprite(mixRgb(PINK, WHITE, 0.15), 64, [[0, 0.9], [0.3, 0.45], [0.65, 0.12], [1, 0]]);
      // lit floss puffs: a soft bright crown toward the light (upper-left), a faintly shaded underside, feathered edge
      function litPuff(c) {
        var size = 128, k = document.createElement('canvas'); k.width = k.height = size;
        var g = k.getContext('2d'), h = size / 2;
        var gr = g.createRadialGradient(h - h * 0.3, h - h * 0.36, 0, h, h, h);
        var lt = mixRgb(c, WHITE, 0.28), dk = mixRgb(c, SHADE, 0.2);
        gr.addColorStop(0, rgba(lt, 1)); gr.addColorStop(0.32, rgba(mixRgb(c, WHITE, 0.1), 0.95));
        gr.addColorStop(0.6, rgba(c, 0.82)); gr.addColorStop(0.82, rgba(dk, 0.36)); gr.addColorStop(1, rgba(dk, 0));
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
        return k;
      }
      var PUFF = [], PSH = [];
      for (var ti = 0; ti < TONES.length; ti++) {
        PUFF.push(litPuff(TONES[ti]));
        PSH.push(softSprite(mixRgb(TONES[ti], SHADE, 0.5), 64, [[0, 0.75], [0.5, 0.5], [0.8, 0.16], [1, 0]]));
      }
      // spun-sugar fibre texture: fine thread loops wrapped round the cone axis, laid over the floss with source-atop
      var FIB = document.createElement('canvas');
      FIB.width = FIB.height = 384;
      (function () {
        var g = FIB.getContext('2d'), rr = seeded(7);
        g.lineCap = 'round';
        for (var i = 0; i < 300; i++) {
          var an = rr() * TAU, rad = Math.sqrt(rr()) * 170, x = 192 + Math.cos(an) * rad, y = 192 + Math.sin(an) * rad;
          var ex = 18 + rr() * 60, ey = ex * (0.18 + rr() * 0.3), a0 = rr() * TAU, sw = 0.9 + rr() * 2.0;
          g.strokeStyle = i % 5 === 0 ? 'rgba(120,40,130,' + (0.08 + rr() * 0.1).toFixed(3) + ')' : 'rgba(255,255,255,' + (0.07 + rr() * 0.16).toFixed(3) + ')';
          g.lineWidth = 0.5 + rr() * 0.8;
          g.beginPath(); g.ellipse(x, y, ex, ey, (rr() - 0.5) * 0.7, a0, a0 + sw); g.stroke();
        }
      })();

      // ─── floss layout: puffs with a round-cloud position and (super) a heart position ───
      var puffs = [];
      (function () {
        var rr = seeded(isSuper ? 31 : 17), B = isSuper ? HB : RB;
        function add(th, rel, r, ring) {
          var bx = Math.cos(th) * rel * tbl(B, th), by = Math.sin(th) * rel * tbl(B, th);
          var rx = Math.cos(th) * rel * tbl(RB, th), ry = Math.sin(th) * rel * tbl(RB, th);
          var d = clamp01(((bx * 0.55 + by * 0.85) / 1.15 + 1) / 2);                       // diagonal colour bands
          var ci = Math.max(0, Math.min(4, Math.round(d * 5.6 - 0.9 + (rr() - 0.5) * (isSuper ? 0.7 : 1.1))));
          puffs.push({ x: rx, y: ry, hx: bx, hy: by, r: r, r0: isSuper ? r * 1.25 : r, b: clamp01(rel * 0.8 + rr() * 0.1 - 0.02), c: ci,
                       a: ring ? 0.88 : 0.92, ph: rr() * TAU, sw: (1 - rel) * 0.55, ring: ring, rel: ring ? 2 : rel });
        }
        var nRing = isSuper ? 44 : 20, i, th;
        for (i = 0; i < nRing; i++) {
          th = (i + rr() * 0.4) / nRing * TAU;
          var tip = isSuper && Math.abs(th - Math.PI / 2) < 0.5;                           // slimmer puffs at the heart's point
          add(th, isSuper ? 0.86 : 0.8 + rr() * 0.06, (isSuper ? (tip ? 0.14 : 0.2) : 0.3) * (0.9 + rr() * 0.2), true);
        }
        var inner = [], tries = 0, want = isSuper ? 80 : 36, minD = isSuper ? 0.03 : 0.045;
        while (inner.length < want && tries++ < 8000) {
          th = rr() * TAU; var rel = Math.sqrt(rr()) * (isSuper ? 0.78 : 0.72);
          var px = Math.cos(th) * rel * tbl(B, th), py = Math.sin(th) * rel * tbl(B, th), ok = true;
          for (var j = 0; j < inner.length; j++) {
            var ex = inner[j][0] - px, ey = inner[j][1] - py;
            if (ex * ex + ey * ey < minD) { ok = false; break; }
          }
          if (!ok) continue;
          inner.push([px, py]);
          add(th, rel, (isSuper ? 0.27 : 0.35) * (0.85 + rr() * 0.3), false);
        }
        // paint back to front: the rim lobes first, the bulging middle last
        puffs.sort(function (a, b) { return b.rel - a.rel; });
      })();
      var wisps = [], glints = [], grain = [];
      (function () {
        var rr = seeded(5);
        for (var g = 0; g < (isSuper ? 110 : 70); g++)     // fine sugar grain: tiny bright tufts that break the big lobes up
          grain.push({ th: rr() * TAU, rel: Math.sqrt(rr()) * 0.95, r: 0.05 + rr() * 0.07, c: rr() < 0.6 ? 0 : 1 + Math.floor(rr() * 2), a: 0.2 + rr() * 0.25, b: rr() * 0.6 + 0.2 });
        for (var i = 0; i < 15; i++)
          wisps.push({ th: rr() * TAU, span: 0.3 + rr() * 0.45, out: 1.0 + rr() * 0.1, a: 0.16 + rr() * 0.22, w: 0.7 + rr() * 0.6 });
        for (var j = 0; j < 8; j++)
          glints.push({ th: rr() * TAU, rel: 0.25 + rr() * 0.6, ph: rr() * TAU, sp: 0.005 + rr() * 0.006, sz: 0.026 + rr() * 0.022 });
      })();

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { cone: [0.04, 0.12], gather: [0.11, 0.52], lift: [0.52, 0.63], heart: [0.55, 0.69], bounce: [0.65, 0.82], burst: 0.655, rain: 0.6, txt: 0.22, turns: 3 }
        : { cone: [0.05, 0.18], gather: [0.16, 0.565], lift: [0.565, 0.7], heart: null, bounce: [0.69, 0.9], burst: 0.695, rain: 0, txt: 0.25, turns: 2 };
      function ms(f) { return f * dur; }
      function phase(t, seg) { return clamp01((t - ms(seg[0])) / (ms(seg[1]) - ms(seg[0]))); }

      // ─── particles ───
      var bgStars = [];
      for (var bs = 0; bs < 18; bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bs % 3 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      var HEARTC = [[255, 92, 158], PRI, [255, 160, 208], [255, 205, 230]];
      var hearts = [], NH = isSuper ? 12 : 9;
      for (var hi = 0; hi < NH; hi++)
        hearts.push({ a: -Math.PI / 2 + (hi % 2 ? 1 : -1) * (0.62 + (Math.floor(hi / 2) / Math.ceil(NH / 2)) * (isSuper ? 1.9 : 1.75) + rnd(-0.08, 0.08)),
                      d: rnd(1.25, 1.55), r: rnd(0.12, 0.17), col: HEARTC[hi % 4], rot: rnd(-0.35, 0.35), dl: rnd(0, 160), up: rnd(0.08, 0.22), wob: rnd(0, TAU) });
      var sugar = [];
      for (var si = 0; si < (isSuper ? 30 : 22); si++)
        sugar.push({ a: rnd(0, TAU), d: rnd(0.95, 2.0), sz: rnd(0.035, 0.075), dl: rnd(0, 180), col: si % 3 === 0 ? ACC : si % 3 === 1 ? WHITE : mixRgb(PINK, WHITE, 0.4) });
      var fling = [];
      for (var fi = 0; fi < 16; fi++) fling.push({ a: rnd(Math.PI * 1.05, Math.PI * 1.95), off: Math.random(), per: rnd(520, 760), h: rnd(0.5, 1.0), col: fi % 2 ? WHITE : mixRgb(PINK, WHITE, 0.35) });
      var sprinkles = [], stars = [], rain = [];
      if (isSuper) {
        var SPC = [[255, 92, 158], [255, 214, 102], [125, 200, 255], [255, 255, 255], [190, 150, 255], [120, 230, 190]];
        for (var pk = 0; pk < 36; pk++)
          sprinkles.push({ a: rnd(0, TAU), sp: rnd(1.3, 2.5), rot: rnd(0, TAU), spin: rnd(-9, 9), col: SPC[pk % SPC.length], len: rnd(0.07, 0.1), dl: rnd(0, 120) });
        for (var sk = 0; sk < 10; sk++)
          stars.push({ a: -Math.PI / 2 + (sk / 10 - 0.45) * 5.4 + rnd(-0.1, 0.1), d: rnd(1.6, 2.3), r: rnd(0.09, 0.14), spin: rnd(-4, 4), dl: rnd(0, 160) });
        for (var rn = 0; rn < 80; rn++)
          rain.push({ x: Math.random(), st: rnd(ms(T.rain), dur * 0.86), v: rnd(0.16, 0.3), sz: rnd(1.6, 3.8), wob: rnd(0, TAU),
                      col: rn % 4 === 0 ? ACC : rn % 4 === 1 ? mixRgb(PINK, WHITE, 0.3) : rn % 4 === 2 ? mixRgb(SKY, WHITE, 0.3) : WHITE });
      }

      // upward reach of each burst family (units of the candy radius) → squashed into the room under the points line
      function reachUp(arr, f) { var m = 0; for (var i = 0; i < arr.length; i++) m = Math.max(m, f(arr[i])); return m; }
      var hUp = reachUp(hearts, function (o) { return Math.max(0, -Math.sin(o.a)) * o.d * 0.78 + o.up; });
      var hPad = reachUp(hearts, function (o) { return o.r; }) * (isSuper ? 1.15 : 1) * 1.05 + 0.02;
      var suUp = reachUp(sugar, function (o) { return Math.max(0, -Math.sin(o.a)) * o.d * 0.85; });
      var spUp = reachUp(sprinkles, function (o) { return Math.max(0, -Math.sin(o.a)) * (0.7 + o.sp * 1.1); });
      var stUp = reachUp(stars, function (o) { return Math.max(0, -Math.sin(o.a)) * o.d * 0.9; });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + rgba(PINK, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
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
      function glowDot(c, img, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        c.globalAlpha = a;
        c.drawImage(img, x - r, y - r, r * 2, r * 2);
        c.globalAlpha = 1;
      }
      var RY = 0.25;     // bowl perspective (ellipse ry / rx)
      function chrome(c, x0, x1) {
        var g = c.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, '#272b38'); g.addColorStop(0.06, '#646d84'); g.addColorStop(0.14, '#d4dbea');
        g.addColorStop(0.2, '#ffffff'); g.addColorStop(0.27, '#a8b1c6'); g.addColorStop(0.42, '#535b74');
        g.addColorStop(0.58, '#69728f'); g.addColorStop(0.7, '#c3cbe0'); g.addColorStop(0.77, '#f6f8fd');
        g.addColorStop(0.84, '#9da7bd'); g.addColorStop(0.94, '#4a5268'); g.addColorStop(1, '#242836');
        return g;
      }
      function gold(c, x0, x1) {
        var g = c.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, '#7a4c0e'); g.addColorStop(0.2, '#e9b850'); g.addColorStop(0.32, '#fff1bd');
        g.addColorStop(0.45, '#f0c058'); g.addColorStop(0.72, '#b98322'); g.addColorStop(0.86, '#ffe08a'); g.addColorStop(1, '#6e440c');
        return g;
      }
      function stripeBand(c, mx, rb, y0, y1, a0, a1) {
        var lo = Math.max(a0, 0), hi = Math.min(a1, Math.PI);
        if (hi <= lo) return;
        var xa = mx + Math.cos(hi) * rb, xb = mx + Math.cos(lo) * rb;
        c.fillRect(xa, y0, xb - xa, y1 - y0);
      }
      // striped candy drum with marquee bulbs + gold tray the bowl stands on
      function drawBase(c, mx, my, t) {
        var rb = R * 0.56, top = my + R * 0.3, bot = top + R * 0.3, ery = 0.26, i;
        c.save();
        c.beginPath(); c.moveTo(mx - rb, top); c.lineTo(mx + rb, top); c.lineTo(mx + rb, bot);
        c.ellipse(mx, bot, rb, rb * ery, 0, 0, Math.PI, false); c.closePath(); c.clip();
        c.fillStyle = rgba(CREAM, 1); c.fillRect(mx - rb - 1, top - 1, rb * 2 + 2, bot - top + rb * ery + 2);
        c.fillStyle = rgba(STRIPE, 1);
        var NS = 16, w = TAU / NS, ro = t * 0.0007;
        for (i = 0; i < NS; i += 2) {
          var a0 = (i * w + ro) % TAU;
          stripeBand(c, mx, rb, top - 1, bot + rb * ery + 2, a0, a0 + w);
          if (a0 + w > TAU) stripeBand(c, mx, rb, top - 1, bot + rb * ery + 2, a0 - TAU, a0 + w - TAU);
        }
        var sh = c.createLinearGradient(mx - rb, 0, mx + rb, 0);
        sh.addColorStop(0, 'rgba(60,8,50,.6)'); sh.addColorStop(0.22, 'rgba(255,255,255,.2)'); sh.addColorStop(0.36, 'rgba(255,255,255,0)');
        sh.addColorStop(0.72, 'rgba(60,8,50,.12)'); sh.addColorStop(1, 'rgba(60,8,50,.62)');
        c.fillStyle = sh; c.fillRect(mx - rb - 1, top - 1, rb * 2 + 2, bot - top + rb * ery + 2);
        var vg = c.createLinearGradient(0, top, 0, bot + rb * ery);
        vg.addColorStop(0, 'rgba(40,0,40,.35)'); vg.addColorStop(0.25, 'rgba(40,0,40,0)'); vg.addColorStop(1, 'rgba(40,0,40,.18)');
        c.fillStyle = vg; c.fillRect(mx - rb - 1, top - 1, rb * 2 + 2, bot - top + rb * ery + 2);
        c.restore();
        // gold foot trim with chasing marquee bulbs
        c.lineCap = 'round';
        c.strokeStyle = gold(c, mx - rb, mx + rb); c.lineWidth = R * 0.05;
        c.beginPath(); c.ellipse(mx, bot, rb, rb * ery, 0, 0.02, Math.PI - 0.02, false); c.stroke();
        var step = Math.floor(t / 150);
        for (i = 0; i < 9; i++) {
          var ab = Math.PI * (0.1 + i / 8 * 0.8), bx = mx + Math.cos(ab) * rb, by = bot + Math.sin(ab) * rb * ery;
          var lit = (i + step) % 3 === 0, br = R * 0.022;
          if (lit) { c.globalCompositeOperation = 'lighter'; glowDot(c, spr, bx, by, br * 5, 0.9); c.globalCompositeOperation = 'source-over'; }
          c.fillStyle = lit ? '#fffbe6' : rgba(mixRgb(ACC, [120, 70, 20], 0.35), 0.95);
          c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        }
        // tray
        var pr = rb * 1.16, tg = gold(c, mx - pr, mx + pr);
        c.fillStyle = '#8a5a14';
        c.beginPath(); c.ellipse(mx, top + R * 0.03, pr, pr * ery, 0, 0, TAU); c.fill();
        c.fillStyle = tg;
        c.beginPath(); c.ellipse(mx, top, pr, pr * ery, 0, 0, TAU); c.fill();
      }
      function bowlWallPath(c, mx, my) {
        var ry = R * RY, D = R * 0.34, br = R * 0.56;
        c.beginPath();
        c.moveTo(mx - R, my);
        c.ellipse(mx, my, R, ry, 0, Math.PI, 0, true);
        c.bezierCurveTo(mx + R, my + D * 0.75, mx + br * 1.3, my + D, mx + br, my + D);
        c.ellipse(mx, my + D, br, br * RY, 0, 0, Math.PI, false);
        c.bezierCurveTo(mx - br * 1.3, my + D, mx - R, my + D * 0.75, mx - R, my);
        c.closePath();
      }
      function drawThreads(c, mx, my, t, a, col) {
        if (a <= 0.01) return;
        var lw = R * 0.07, ry = R * RY, fy = my + ry * 0.12, i, j;
        c.save();
        c.beginPath(); c.ellipse(mx, my, R - lw * 0.4, ry - lw * 0.4, 0, 0, TAU); c.clip();
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
        // floss haze clinging to the inner wall, circling
        for (i = 0; i < 18; i++) {
          var ha = i / 18 * TAU + t * 0.004, hr = 0.8 + 0.07 * Math.sin(i * 2.3 + t * 0.003);
          c.globalAlpha = 0.2 * a;
          c.drawImage(PUFF[(i % 3) + 1], mx + Math.cos(ha) * R * hr - R * 0.17, fy + Math.sin(ha) * ry * hr - R * 0.09, R * 0.34, R * 0.18);
        }
        c.globalAlpha = 1;
        // fine sugar threads flung from the spinning head (trailing spirals)
        var core = mixRgb(col, WHITE, 0.6);
        for (i = 0; i < 16; i++) {
          var ph = i / 16 * TAU + t * 0.0105, len = 0.72 + 0.22 * Math.sin(t * 0.005 + i * 1.7);
          c.beginPath();
          for (j = 0; j <= 12; j++) {
            var u = j / 12, r = 0.13 + u * len * 0.82, an = ph - u * 2.6;
            var x = mx + Math.cos(an) * R * r, y = fy + Math.sin(an) * ry * r;
            if (j) c.lineTo(x, y); else c.moveTo(x, y);
          }
          c.strokeStyle = rgba(col, 0.18 * a); c.lineWidth = 3.4; c.stroke();
          c.strokeStyle = rgba(core, 0.6 * a); c.lineWidth = 1; c.stroke();
        }
        // sugar droplets racing outward along the spirals
        for (i = 0; i < 22; i++) {
          var q = (t * 0.0016 + i * 0.618) % 1, rr = 0.14 + q * 0.8, an2 = i * 2.4 + t * 0.0105 - q * 2.6;
          glowDot(c, spr, mx + Math.cos(an2) * R * rr, fy + Math.sin(an2) * ry * rr, R * 0.028, a * (1 - q) * 0.9);
        }
        c.restore();
      }
      function drawHead(c, mx, my, t, spin) {
        var hr = R * 0.13, hry = hr * 0.34, hy = my + R * RY * 0.2, hh = R * 0.07, i;
        if (spin > 0) {
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = 0.7 * spin; c.drawImage(PGLOW, mx - hr * 2.8, hy - hr * 1.3, hr * 5.6, hr * 2.8);
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        c.beginPath(); c.moveTo(mx - hr, hy); c.lineTo(mx - hr, hy + hh);
        c.ellipse(mx, hy + hh, hr, hry, 0, Math.PI, 0, true); c.lineTo(mx + hr, hy); c.closePath();
        c.fillStyle = chrome(c, mx - hr, mx + hr); c.fill();
        var sa = t * 0.02 * (0.3 + 0.7 * spin);
        for (i = 0; i < 10; i++) {
          var a = i / 10 * TAU + sa, sn = Math.sin(a);
          if (sn < 0.12) continue;
          var x = mx + Math.cos(a) * hr * 0.9, w = hr * 0.12 * sn;
          c.fillStyle = rgba(HOT, 0.3 + 0.6 * sn * spin);
          c.fillRect(x - w / 2, hy + hh * 0.3, w, hh * 0.5);
        }
        var tg = c.createRadialGradient(mx - hr * 0.3, hy - hry * 0.4, 0, mx, hy, hr);
        tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#d5dbe8'); tg.addColorStop(1, '#8b93a8');
        c.fillStyle = tg; c.beginPath(); c.ellipse(mx, hy, hr, hry, 0, 0, TAU); c.fill();
        c.fillStyle = rgba(mixRgb(HOT, WHITE, 0.25), 0.95);
        c.beginPath(); c.ellipse(mx, hy, hr * 0.42, hry * 0.42, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, hr * 0.07); c.lineCap = 'round';
        c.beginPath(); c.ellipse(mx, hy, hr * 0.78, hry * 0.78, 0, sa, sa + 0.8); c.stroke();
      }
      function drawMachine(c, mx, my, t, spin, tcol, refl, reflX) {
        drawBase(c, mx, my, t);
        var ry = R * RY, lw = R * 0.07, D = R * 0.34;
        c.lineCap = 'butt';
        // back rim
        c.lineWidth = lw; c.strokeStyle = chrome(c, mx - R - lw, mx + R + lw);
        c.beginPath(); c.ellipse(mx, my, R, ry, 0, Math.PI, TAU, false); c.stroke();
        // interior: lit inner back wall → shadowed floor
        var ig = c.createLinearGradient(0, my - ry, 0, my + ry);
        ig.addColorStop(0, '#d2d8e6'); ig.addColorStop(0.3, '#8a92a9'); ig.addColorStop(0.65, '#434a60'); ig.addColorStop(1, '#202437');
        c.fillStyle = ig; c.beginPath(); c.ellipse(mx, my, R - lw * 0.35, ry - lw * 0.35, 0, 0, TAU); c.fill();
        drawThreads(c, mx, my, t, spin, tcol);
        drawHead(c, mx, my, t, spin);
        // front wall
        bowlWallPath(c, mx, my);
        c.fillStyle = chrome(c, mx - R, mx + R); c.fill();
        c.save();
        bowlWallPath(c, mx, my); c.clip();
        var vg = c.createLinearGradient(0, my, 0, my + D + R * 0.15);
        vg.addColorStop(0, 'rgba(0,0,20,.35)'); vg.addColorStop(0.18, 'rgba(0,0,20,0)'); vg.addColorStop(0.6, 'rgba(10,8,30,.1)'); vg.addColorStop(1, 'rgba(10,8,30,.5)');
        c.fillStyle = vg; c.fillRect(mx - R, my - 2, R * 2, D + R * 0.2);
        if (refl > 0) {     // pink glow of the floss reflected in the steel
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = refl; c.drawImage(PGLOW, mx + reflX - R * 0.75, my - D * 0.2, R * 1.5, D * 1.3);
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        c.restore();
        // front rim + speculars
        c.lineWidth = lw; c.strokeStyle = chrome(c, mx - R - lw, mx + R + lw);
        c.beginPath(); c.ellipse(mx, my, R, ry, 0, 0, Math.PI, false); c.stroke();
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = lw * 0.22;
        c.beginPath(); c.ellipse(mx, my - lw * 0.2, R, ry, 0, 0.6 * Math.PI, 0.86 * Math.PI); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.ellipse(mx, my - lw * 0.2, R, ry, 0, 0.14 * Math.PI, 0.28 * Math.PI); c.stroke();
        c.beginPath(); c.ellipse(mx, my - lw * 0.2, R, ry, 0, 1.16 * Math.PI, 1.3 * Math.PI); c.stroke();
        // twinkling glints on the steel
        c.globalCompositeOperation = 'lighter';
        var G = [[0.74, 0.0], [0.2, 1.9], [1.22, 3.7]];
        for (var gi = 0; gi < G.length; gi++) {
          var ga = G[gi][0] * Math.PI, k = Math.pow(Math.max(0, Math.sin(t * 0.004 + G[gi][1])), 4);
          if (k < 0.02) continue;
          var gx = mx + Math.cos(ga) * R, gy = my + Math.sin(ga) * ry - lw * 0.2;
          glowDot(c, spr, gx, gy, R * 0.09 * k, 0.9);
          c.fillStyle = 'rgba(255,255,255,' + (0.95 * k).toFixed(3) + ')'; sparkPath(c, gx, gy, R * 0.05 * k + 1); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }

      // ─── the cone + floss (pose in world coords) ───
      var PHI0 = 0.3 * Math.PI;
      function phiAt(q) { return PHI0 + TAU * T.turns * (q * 0.75 + easeInOut(q) * 0.25); }
      function rotG(phi) { return -2.45 + 0.13 * Math.sin(phi); }
      function bowlPt(phi, g, my) {
        return { x: cx + Math.cos(phi) * R * 0.3, y: my - s * 0.04 - g * s * 0.2 + Math.sin(phi) * R * RY * 0.3 };
      }
      function pose(t) {
        var qc = (t - ms(T.cone[0])) / (ms(T.cone[1]) - ms(T.cone[0]));
        if (qc <= 0) return null;
        var qg = phase(t, T.gather), ql = phase(t, T.lift), qb = phase(t, T.bounce);
        var P = { x: 0, y: 0, rot: 0, g: easeInOut(qg), cs: 0, sc: 1, sx: 1, sy: 1, h: 0, swirl: 0, inBowl: 1, alpha: 1, phi: PHI0, qb: qb };
        P.cs = lerp(0.2, 0.9, easeOut(P.g));
        if (qc < 1) {
          var e = easeOut(qc), a1 = bowlPt(PHI0, 0, rimY);
          P.x = lerp(W + s * 0.9, a1.x, e); P.y = lerp(rimY - s * 2.5, a1.y, e) - Math.sin(e * Math.PI) * s * 0.3;
          P.rot = lerp(-1.75, rotG(PHI0), e); P.alpha = clamp01(qc * 4);
        } else if (ql <= 0) {
          P.phi = phiAt(qg); var b = bowlPt(P.phi, P.g, rimY);
          P.x = b.x; P.y = b.y; P.rot = rotG(P.phi);
        } else {
          var pe = bowlPt(phiAt(1), 1, rimY);
          P.x = lerp(pe.x, cx, easeInOut(ql));
          P.y = lerp(pe.y, Yc, easeInOut(ql)) - Math.sin(ql * Math.PI) * s * 0.12;
          P.sc = lerp(1, FS, easeInOut(ql));
          P.rot = lerp(rotG(phiAt(1)), 0, easeOutBack(ql));
          P.inBowl = 1 - ql;
        }
        if (qb > 0) {
          var hop = Math.abs(Math.sin(qb * TAU)) * Math.pow(1 - qb, 1.6);
          P.y -= hop * s * 0.22;
          var sq = Math.cos(qb * Math.PI * 4) * Math.pow(1 - qb, 2) * 0.11 * clamp01(qb * 12);
          P.sx = 1 + sq; P.sy = 1 - sq;
          P.cs += 0.1 * easeOutBack(clamp01(qb * 2.5));
          P.sc *= 1 + 0.015 * Math.sin(t * 0.006) * clamp01(qb * 2 - 1);
        }
        if (T.heart) {
          var hq = phase(t, T.heart);
          P.h = easeInOut(hq);
          P.sc *= lerp(1, HS, easeOutBack(hq));
        }
        var tl = ms(T.lift[1]);
        P.swirl = Math.min(t, tl) * 0.0026 + Math.max(0, t - tl) * 0.0004;
        if (P.inBowl < 1) {        // safety net: never let the floss top cross the points line
          var top = P.y - lerp(TOP_ROUND / 1.065, TOP_HEART / 1.065, P.h) * s * P.sc * P.cs * P.sy;
          if (top < ceilY) P.y += ceilY - top;
        }
        return P;
      }
      function clipBowl(my, off) {
        var lw = R * 0.07, rx = R - lw * 0.45, ry = R * RY - lw * 0.45, y = my + off;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H + 10);
        ctx.lineTo(cx + rx, H + 10); ctx.lineTo(cx + rx, y);
        ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI, false);
        ctx.lineTo(cx - rx, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
        ctx.clip();
      }
      function drawCone(kc, tipY, lf) {
        var L = lf * kc, w0 = 0.032 * kc, w1 = 0.115 * kc, y0 = tipY, y1 = tipY + L;
        ctx.beginPath(); ctx.moveTo(-w0, y0); ctx.quadraticCurveTo(0, y0 - w0 * 1.6, w0, y0);
        ctx.lineTo(w1, y1); ctx.ellipse(0, y1, w1, w1 * 0.32, 0, 0, Math.PI, false); ctx.closePath();
        var g = ctx.createLinearGradient(-w1, 0, w1, 0);
        g.addColorStop(0, '#cbbfd6'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.7, '#f1e9f4'); g.addColorStop(1, '#a898b8');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.strokeStyle = rgba(STRIPE, 0.9); ctx.lineWidth = 0.06 * kc; ctx.lineCap = 'butt';
        for (var yy = y0 - 0.3 * kc; yy < y1 + 0.3 * kc; yy += 0.2 * kc) {
          ctx.beginPath(); ctx.moveTo(-w1 * 1.6, yy + 0.13 * kc); ctx.lineTo(w1 * 1.6, yy - 0.13 * kc); ctx.stroke();
        }
        var sh = ctx.createLinearGradient(-w1, 0, w1, 0);
        sh.addColorStop(0, 'rgba(70,30,90,.35)'); sh.addColorStop(0.35, 'rgba(255,255,255,.25)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(70,30,90,.4)');
        ctx.fillStyle = sh; ctx.fillRect(-w1 * 1.6, y0 - kc * 0.1, w1 * 3.2, L + kc * 0.3);
        ctx.restore();
        ctx.fillStyle = '#efe4f2'; ctx.beginPath(); ctx.ellipse(0, y1, w1, w1 * 0.32, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(150,110,165,.6)'; ctx.beginPath(); ctx.ellipse(0, y1 + w1 * 0.04, w1 * 0.72, w1 * 0.2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(110,60,120,.45)'; ctx.lineWidth = Math.max(1, kc * 0.008);
        ctx.beginPath(); ctx.moveTo(-w0, y0); ctx.lineTo(-w1, y1); ctx.moveTo(w0, y0); ctx.lineTo(w1, y1); ctx.stroke();
      }
      // floss → offscreen buffer: soft puffs, then ONE light + spun fibres via source-atop over the union
      function renderCloud(P, t) {
        var k = s * P.sc, half = cbHalf, h = P.h, cs = P.cs;
        cbx.setTransform(bufDPR, 0, 0, bufDPR, 0, 0);
        cbx.globalCompositeOperation = 'source-over'; cbx.globalAlpha = 1;
        cbx.clearRect(0, 0, half * 2, half * 2);
        var cr = Math.cos(P.rot), sr = Math.sin(P.rot);
        for (var i = 0; i < puffs.length; i++) {
          var p = puffs[i], v = clamp01((P.g - p.b) / 0.14);
          if (v <= 0) continue;
          var lx = h > 0 ? lerp(p.x, p.hx, h) : p.x, ly = h > 0 ? lerp(p.y, p.hy, h) : p.y;
          var sw = P.swirl * p.sw * (1 - h);
          if (sw) { var c1 = Math.cos(sw), s1 = Math.sin(sw), tx = lx * c1 - ly * s1; ly = lx * s1 + ly * c1; lx = tx; }
          lx *= cs; ly *= cs;
          var wx = (lx * cr - ly * sr) * P.sx, wy = (lx * sr + ly * cr) * P.sy;
          var r = lerp(p.r0, p.r, h) * cs * (0.3 + 0.7 * easeOutBack(v)) * (1 + 0.035 * Math.sin(t * 0.005 + p.ph)) * k;
          var pa = p.a * clamp01(v * 1.6), qx = half + wx * k, qy = half + wy * k;
          // each lobe casts a soft crevice onto the ones behind it, then shows its lit crown
          cbx.globalAlpha = pa * 0.36;
          cbx.drawImage(PSH[p.c], qx + r * 0.08 - r * 1.04, qy + r * 0.13 - r * 1.04, r * 2.08, r * 2.08);
          cbx.globalAlpha = pa;
          cbx.drawImage(PUFF[p.c], qx - r * 0.04 - r * 0.92, qy - r * 0.06 - r * 0.92, r * 1.84, r * 1.84);
        }
        for (var gi = 0; gi < grain.length; gi++) {
          var gr0 = grain[gi], gv = clamp01((P.g - gr0.b) / 0.2);
          if (gv <= 0) continue;
          var gth = gr0.th + P.swirl * 0.25 * (1 - h), gb = lerp(tbl(RB, gth), tbl(HB, gth), h) * gr0.rel * cs;
          var glx = Math.cos(gth) * gb, gly = Math.sin(gth) * gb;
          var gwx = (glx * cr - gly * sr) * P.sx, gwy = (glx * sr + gly * cr) * P.sy, grr = gr0.r * cs * k;
          cbx.globalAlpha = gr0.a * gv;
          cbx.drawImage(PUFF[gr0.c], half + gwx * k - grr, half + gwy * k - grr, grr * 2, grr * 2);
        }
        cbx.globalAlpha = 1; cbx.globalCompositeOperation = 'source-atop';
        var Rc = k * cs * (1 + 0.12 * h);
        var lg = cbx.createRadialGradient(half - Rc * 0.45, half - Rc * 0.55, Rc * 0.05, half - Rc * 0.2, half - Rc * 0.22, Rc * 1.8);
        lg.addColorStop(0, 'rgba(255,255,255,.3)'); lg.addColorStop(0.3, 'rgba(255,246,252,.06)'); lg.addColorStop(0.55, 'rgba(255,255,255,0)');
        lg.addColorStop(0.82, rgba(SHADE, 0.2)); lg.addColorStop(1, rgba(SHADE, 0.36));
        cbx.fillStyle = lg; cbx.fillRect(0, 0, half * 2, half * 2);
        // threads wrap round the cone axis, drifting slowly as the floss turns
        cbx.save(); cbx.translate(half, half); cbx.rotate(P.rot + Math.sin(P.swirl * 0.8) * 0.12);
        cbx.translate(Math.sin(P.swirl * 1.3) * Rc * 0.08, 0);
        cbx.globalAlpha = clamp01(P.g * 3);
        cbx.drawImage(FIB, -Rc * 1.35, -Rc * 1.35, Rc * 2.7, Rc * 2.7);
        cbx.restore();
        cbx.globalCompositeOperation = 'source-over'; cbx.globalAlpha = 1;
      }
      function locW(P, th, rel) {       // local (upright) polar point on the floss boundary → world
        var b = lerp(tbl(RB, th), tbl(HB, th), P.h) * rel * P.cs, k = s * P.sc;
        var lx = Math.cos(th) * b, ly = Math.sin(th) * b, cr = Math.cos(P.rot), sr = Math.sin(P.rot);
        return { x: P.x + (lx * cr - ly * sr) * P.sx * k, y: P.y + (lx * sr + ly * cr) * P.sy * k };
      }
      function drawCandy(P, t, my) {
        var k = s * P.sc, kc = s * Math.min(P.sc, 1.12);
        ctx.save();
        if (P.inBowl > 0) clipBowl(my, H * 1.2 * easeIn(1 - P.inBowl));
        // halo
        ctx.globalCompositeOperation = 'lighter';
        glowDot(ctx, PGLOW, P.x, P.y, k * P.cs * (1.6 + 0.15 * P.h), 0.2 * P.alpha * clamp01(P.g * 2));
        ctx.globalCompositeOperation = 'source-over';
        // paper cone (behind the floss)
        ctx.save(); ctx.globalAlpha = P.alpha;
        ctx.translate(P.x, P.y); ctx.scale(P.sx, P.sy); ctx.rotate(P.rot);
        drawCone(kc, lerp(0.12 * k, (HEART_BOTTOM - 0.72) * k, P.h), lerp(1.18, 1.0, P.h));
        ctx.restore();
        // floss
        if (P.g > 0) {
          renderCloud(P, t);
          ctx.globalAlpha = P.alpha;
          ctx.drawImage(CB, P.x - cbHalf, P.y - cbHalf, cbHalf * 2, cbHalf * 2);
          ctx.globalAlpha = 1;
          // loose wisps poking out of the silhouette
          var wv = clamp01((P.g - 0.25) / 0.4) * P.alpha * (1 - 0.65 * P.h), i;
          if (wv > 0) {
            ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            var wc = mixRgb(PINK, WHITE, 0.4);
            for (i = 0; i < wisps.length; i++) {
              var w = wisps[i], th0 = w.th + P.swirl * 0.35, th1 = th0 + w.span;
              var p0 = locW(P, th0, 0.86), p3 = locW(P, th1, 0.88), c1 = locW(P, th0 + w.span * 0.25, w.out), c2 = locW(P, th0 + w.span * 0.8, w.out * 0.98);
              ctx.strokeStyle = rgba(wc, w.a * wv); ctx.lineWidth = w.w;
              ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y); ctx.stroke();
            }
            // sugar-crystal glints
            for (i = 0; i < glints.length; i++) {
              var gl = glints[i], kk = Math.pow(Math.max(0, Math.sin(t * gl.sp + gl.ph)), 3) * wv;
              if (kk < 0.03) continue;
              var gp = locW(P, gl.th + P.swirl * 0.3, gl.rel);
              glowDot(ctx, spr, gp.x, gp.y, k * gl.sz * 1.8, 0.3 * kk);
              ctx.fillStyle = 'rgba(255,255,255,' + kk.toFixed(3) + ')';
              sparkPath(ctx, gp.x, gp.y, k * gl.sz * kk + 0.5); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        ctx.restore();
      }
      function drawHeart(x, y, r, rot, col, a) {
        if (a <= 0 || r <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
        heartPath(ctx, 0, 0, r);
        var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.2);
        g.addColorStop(0, rgba(mixRgb(col, WHITE, 0.55), 1)); g.addColorStop(1, rgba(col, 1));
        ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = Math.max(1, r * 0.1); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.32, r * 0.17, r * 0.09, -0.7, 0, TAU); ctx.fill();
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 300), i;

        // background twinkles
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], tk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.6 * tk * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        var ql = phase(t, T.lift), qg = phase(t, T.gather);
        var P = pose(t);
        // machine: pops in, spins, then sinks/dims while the candy takes the stage
        var qIn = clamp01(t / 380);
        var my = rimY + mSink * easeInOut(ql);
        var mA = clamp01(t / 200) * (1 - (isSuper ? 0.68 : 0.45) * easeInOut(ql));
        var mS = lerp(0.8, 1, easeOutBack(qIn));
        var spin = clamp01((t - 60) / 320) * (1 - 0.85 * easeInOut(ql));
        var tcol = PINK;
        if (isSuper) {
          var cq = qg * 2;
          tcol = cq < 1 ? mixRgb(PINK, LILAC, easeInOut(cq)) : mixRgb(LILAC, SKY, easeInOut(cq - 1));
        }
        var refl = P ? 0.35 * clamp01(P.g * 2) * P.inBowl : 0;
        // soft fairground glow pooled under the cart
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.22 * mA;
        ctx.drawImage(PGLOW, cx - R * 1.5, my + R * 0.5, R * 3, R * 0.7);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        mlx.setTransform(DPR, 0, 0, DPR, 0, 0);
        mlx.clearRect(0, 0, mlW, mlH);
        drawMachine(mlx, mlW / 2, R * 0.45, t, spin, tcol, refl, P ? P.x - cx : 0);
        var mBot = my - R * 0.45 + mlH;
        ctx.globalAlpha = mA;
        ctx.drawImage(ML, cx - mlW / 2 * mS, mBot - mlH * mS, mlW * mS, mlH * mS);
        ctx.globalAlpha = 1;

        // sugar sparkles flung over the rim while it spins
        if (spin > 0.05) {
          ctx.globalCompositeOperation = 'lighter';
          for (i = 0; i < fling.length; i++) {
            var f = fling[i], fq = ((t / f.per) + f.off) % 1;
            var fx0 = cx + Math.cos(f.a) * R * 0.85, fy0 = my + Math.sin(f.a) * R * RY * 0.85;
            var fx = fx0 + Math.cos(f.a) * R * 0.5 * fq, fy = fy0 - s * f.h * (fq - fq * fq * 1.1) * 1.6;
            var fa = spin * Math.sin(fq * Math.PI);
            ctx.fillStyle = rgba(f.col, 0.85 * fa);
            sparkPath(ctx, fx, fy, (2 + 2.5 * (1 - fq)) * unit + 0.8); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        // threads drawn into the floss while gathering
        if (P && P.inBowl >= 1 && P.g > 0 && P.g < 1) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          var gc = mixRgb(tcol, WHITE, 0.4);
          for (i = 0; i < 6; i++) {
            var aa = P.phi + 0.7 + i * 0.5;
            var sx0 = cx + Math.cos(aa) * R * 0.82, sy0 = my + R * RY * 0.12 + Math.sin(aa) * R * RY * 0.82;
            var mxp = cx + Math.cos(aa - 0.6) * R * 0.55, myp = my + Math.sin(aa - 0.6) * R * RY * 0.55;
            ctx.strokeStyle = rgba(gc, 0.38 * (1 - P.g * 0.5) * spin); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(mxp, myp, P.x, P.y); ctx.stroke();
          }
          ctx.restore();
        }

        // ─── the cotton candy ───
        if (P) drawCandy(P, t, my);

        // landing flash + bursts (from the final resting spot)
        var tb = ms(T.burst), bx = cx, by = Yc, Rc = s * HS * FS, roomUp = Yc - ceilY;
        function roomF(reach, pad) { return reach > 0 ? clamp01((roomUp - pad) / (reach * Rc)) : 1; }
        var lq = (t - tb) / 520;
        if (lq > 0 && lq < 1) {
          ctx.globalCompositeOperation = 'lighter';
          glowDot(ctx, PGLOW, bx, by, Rc * (1.05 + lq * 0.5), 0.4 * Math.sin(lq * Math.PI));
          ctx.globalCompositeOperation = 'source-over';
        }
        // hearts
        var hLife = isSuper ? 1150 : 720, hxs = Math.min(1.12, (W * 0.43) / (Rc * 1.6));
        var fH = roomF(hUp, Rc * hPad);
        for (i = 0; i < hearts.length; i++) {
          var hh = hearts[i], hq2 = (t - tb - hh.dl) / hLife;
          if (hq2 <= 0 || hq2 >= 1) continue;
          var hd = Rc * lerp(0.55, hh.d, easeOut(hq2 * 1.6));
          var hx = bx + Math.cos(hh.a) * hd * hxs + Math.sin(t * 0.006 + hh.wob) * Rc * 0.04;
          var hvy = Math.sin(hh.a) * hd * 0.78 - hq2 * hh.up * Rc;
          var hy = by + (hvy < 0 ? hvy * fH : hvy);
          var hs = Rc * hh.r * easeOutBack(clamp01(hq2 * 3.5)) * (isSuper ? 1.15 : 1);
          drawHeart(hx, hy, hs, hh.rot + Math.sin(t * 0.008 + hh.wob) * 0.15, hh.col, 1 - clamp01((hq2 - 0.62) / 0.38));
        }
        // sugar sparkles
        ctx.globalCompositeOperation = 'lighter';
        var fSu = roomF(suUp, Rc * 0.09);
        for (i = 0; i < sugar.length; i++) {
          var sp = sugar[i], sq2 = (t - tb - sp.dl) / (isSuper ? 900 : 640);
          if (sq2 <= 0 || sq2 >= 1) continue;
          var sd = Rc * lerp(0.5, sp.d, easeOut(sq2)), sx = bx + Math.cos(sp.a) * sd, svy = Math.sin(sp.a) * sd * 0.85;
          var sy = by + (svy < 0 ? svy * fSu : svy) + sq2 * sq2 * Rc * 0.2;
          var sa2 = 1 - sq2, sz = Rc * sp.sz * (1 - sq2 * 0.5);
          glowDot(ctx, spr, sx, sy, sz * 1.8, 0.38 * sa2);
          ctx.fillStyle = rgba(sp.col, sa2); sparkPath(ctx, sx, sy, sz); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // super: sprinkles, stars and a sugar-glitter rain
        if (isSuper) {
          ctx.lineCap = 'round';
          var fSp = roomF(spUp, s * 0.07), fSt = roomF(stUp, s * 0.17);
          for (i = 0; i < sprinkles.length; i++) {
            var pr2 = sprinkles[i], q3 = (t - tb - pr2.dl) / 1200;
            if (q3 <= 0 || q3 >= 1) continue;
            var dd = Rc * (0.7 + pr2.sp * easeOut(q3) * 1.1);
            var pvy = Math.sin(pr2.a) * dd, px2 = bx + Math.cos(pr2.a) * dd, py2 = by + (pvy < 0 ? pvy * fSp : pvy) + q3 * q3 * Rc * 0.9;
            var ang = pr2.rot + pr2.spin * q3, L = s * pr2.len;
            ctx.strokeStyle = rgba(pr2.col, 1 - clamp01((q3 - 0.6) / 0.4)); ctx.lineWidth = s * 0.035;
            ctx.beginPath(); ctx.moveTo(px2 - Math.cos(ang) * L / 2, py2 - Math.sin(ang) * L / 2); ctx.lineTo(px2 + Math.cos(ang) * L / 2, py2 + Math.sin(ang) * L / 2); ctx.stroke();
          }
          for (i = 0; i < stars.length; i++) {
            var st = stars[i], q4 = (t - tb - st.dl) / 1100;
            if (q4 <= 0 || q4 >= 1) continue;
            var sdd = Rc * lerp(0.6, st.d, easeOut(q4 * 1.3)), sxx = bx + Math.cos(st.a) * sdd, stv = Math.sin(st.a) * sdd * 0.9, syy = by + (stv < 0 ? stv * fSt : stv);
            var sr2 = s * st.r * easeOutBack(clamp01(q4 * 3)) * (1 - 0.3 * q4), sal = 1 - clamp01((q4 - 0.65) / 0.35);
            ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, spr, sxx, syy, sr2 * 2.6, 0.7 * sal); ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = sal;
            var sgd = ctx.createRadialGradient(sxx - sr2 * 0.25, syy - sr2 * 0.3, sr2 * 0.05, sxx, syy, sr2);
            sgd.addColorStop(0, '#FFFBE0'); sgd.addColorStop(0.5, '#FFE066'); sgd.addColorStop(1, '#F5A623');
            ctx.fillStyle = sgd; ctx.strokeStyle = '#D9831A'; ctx.lineWidth = Math.max(1, sr2 * 0.08); ctx.lineJoin = 'round';
            starPath(ctx, sxx, syy, sr2, st.spin * q4, 0.5); ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.globalCompositeOperation = 'lighter';
          for (i = 0; i < rain.length; i++) {
            var rf = rain[i], rt = t - rf.st;
            if (rt <= 0) continue;
            var ry2 = -10 + rt * rf.v * H / 1000;
            if (ry2 > H + 10) continue;
            var rx2 = rf.x * W + Math.sin(rt * 0.003 + rf.wob) * 12 * unit;
            var tw = 0.55 + 0.45 * Math.sin(rt * 0.012 + rf.wob), rsz = rf.sz * unit * 1.6 * tw + 0.6;
            var rdim = 0.25 + 0.75 * clamp01((ry2 - ceilY + 40) / 60);
            ctx.fillStyle = rgba(rf.col, 0.9 * clamp01(rt / 150) * rdim); sparkPath(ctx, rx2, ry2, rsz); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq3 = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq3 > 0 ? easeOutBack(pq3) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq3 * 2, 1) * gFade);
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
        spr = null; PGLOW = null; PUFF = null; PSH = null; FIB = null; ML = null; CB = null;
      };
    }
  });
})();
