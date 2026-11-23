/* success-enchanted-rose.js — מסך הצלחה: וֶרֶד קָסוּם
   ורד קסום מתחת לפעמון זכוכית שקוף (ברק רך בשוליים, השתקפויות ונצנוץ שעובר
   על הזכוכית) על כַּן זהב קטן ומקושט עם חרוזים ואבן חן. ניצן ורד על גבעול עם
   קוצים ושני עלים פורח לאט: עלי הכותרת נפתחים החוצה בשכבות (גוני ורוד-ורד לפי
   הפלטה, הפנימיים כהים יותר, זוהר רך מלב הפרח), ומערבולות נצנצים מטפסות
   בספירלה סביב הזכוכית. כשהוורד פתוח לגמרי — פעימת אור חמה, ועלי כותרת זוהרים
   מרחפים למעלה דרך הזכוכית.
   בסופר: פעמון הזכוכית מתרומם ועף למעלה, הוורד מקרין קרני אור זהובות, טבעת
   של עלי כותרת זוהרים מסתחררת סביבו וגשם נצנצים זהוב יורד.
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
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function hexA(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }

  // ─── petal outline in its own domain: [u along the petal 0 base … 1 tip, a across −1 … 1] ───
  var NO = 30;
  var PETAL_DOM = [], SEPAL_DOM = [];
  (function () {
    for (var i = 0; i <= NO; i++) {
      var ps = i / NO * TAU, c = (1 - Math.cos(ps)) / 2, sn = Math.sin(ps), sg = sn < 0 ? -1 : 1, dp = ps - Math.PI;
      // broad rounded top with a tiny heart notch, narrow base — a rose petal
      PETAL_DOM.push([Math.pow(c, 0.85) - 0.05 * Math.exp(-dp * dp / 0.05), sg * Math.pow(Math.abs(sn), 0.7)]);
      // slim pointed sepal
      SEPAL_DOM.push([c, sn * Math.pow(1 - c, 0.5) * 1.3]);
    }
  })();
  var RIM0 = Math.round(NO * 0.3), RIM1 = Math.round(NO * 0.7);   // the petal's top edge (rim highlight)

  // ─── the glass bell: a super-ellipse silhouette (local units, y down, base at y = 0) ───
  var DW = 0.4, DH = 1.0, DP = 2.4, DE = 0.066;
  function domeW(yUp) {
    if (yUp <= 0) return DW;
    if (yUp >= DH) return 0;
    return DW * Math.pow(1 - Math.pow(yUp / DH, DP), 1 / DP);
  }
  var DOME_PTS = [];
  (function () {
    for (var i = 0; i <= 48; i++) {
      var tau = Math.PI - i / 48 * Math.PI, c = Math.cos(tau), s = Math.sin(tau);
      DOME_PTS.push([DW * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / DP), -DH * Math.pow(s, 2 / DP)]);
    }
  })();
  function domePath(g) {
    g.beginPath(); g.moveTo(DOME_PTS[0][0], DOME_PTS[0][1]);
    for (var i = 1; i < DOME_PTS.length; i++) g.lineTo(DOME_PTS[i][0], DOME_PTS[i][1]);
    g.ellipse(0, 0, DW, DE, 0, 0, Math.PI, false);       // the front lip, right → left
    g.closePath();
  }

  // rose palette before tinting
  var ROSE0 = { deep: [92, 4, 40], dark: [166, 14, 70], mid: [226, 50, 116], light: [255, 126, 174], pale: [255, 202, 226] };
  var LX = -0.45 / 1.0075, LY = 0.75 / 1.0075, LZ = 0.5 / 1.0075;     // light from the upper-left-front

  window.SUCCESS.styles.push({
    name: 'enchanted-rose',
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

      var PRI = hexRgb(primary), GLO = hexRgb(glow);
      var RC = {};
      for (var rk in ROSE0) RC[rk] = mix(ROSE0[rk], PRI, 0.16);

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;opacity:0';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, DPR = 1, unit = 1, S = 100, CX = 0, BY = 0;
      var pedSpr = null, domeBackSpr = null, domeFrontSpr = null;

      // ─── reusable glow sprites ───
      function radialSprite(size, stops) {
        var c = document.createElement('canvas');
        c.width = c.height = size;
        var g = c.getContext('2d'), h = size / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
        for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
        g.fillStyle = gr; g.fillRect(0, 0, size, size);
        return c;
      }
      var spr = radialSprite(64, [[0, 'rgba(255,255,235,1)'], [0.2, 'rgba(255,236,170,.8)'], [0.5, 'rgba(255,210,120,.25)'], [1, 'rgba(255,210,120,0)']]);
      var pinkSpr = radialSprite(128, [[0, rgba(RC.pale, 0.9)], [0.25, rgba(RC.light, 0.55)], [0.6, rgba(RC.mid, 0.16)], [1, rgba(RC.mid, 0)]]);
      var heartSpr = radialSprite(96, [[0, 'rgba(255,240,215,1)'], [0.22, 'rgba(255,196,170,.75)'], [0.5, rgba(RC.light, 0.28)], [1, rgba(RC.light, 0)]]);
      var ringSpr = radialSprite(160, [[0, 'rgba(255,220,170,0)'], [0.6, 'rgba(255,220,170,0)'], [0.8, 'rgba(255,230,190,.6)'],
                                        [0.9, rgba(RC.light, 0.22)], [1, rgba(RC.light, 0)]]);
      var tintSpr = radialSprite(128, [[0, rgba(mix(GLO, PRI, 0.5), 0.5)], [0.5, rgba(mix(GLO, PRI, 0.5), 0.14)], [1, rgba(mix(GLO, PRI, 0.5), 0)]]);
      // a glowing petal (for the petals that float up + the super ring)
      var petSpr = document.createElement('canvas');
      petSpr.width = petSpr.height = 64;
      (function () {
        var g = petSpr.getContext('2d');
        var hg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        hg.addColorStop(0, 'rgba(255,236,200,.75)'); hg.addColorStop(0.45, rgba(RC.light, 0.3)); hg.addColorStop(1, rgba(RC.light, 0));
        g.fillStyle = hg; g.fillRect(0, 0, 64, 64);
        g.beginPath(); g.moveTo(32, 49);
        g.bezierCurveTo(15, 43, 15, 20, 27, 16); g.quadraticCurveTo(32, 20, 37, 16);
        g.bezierCurveTo(49, 20, 49, 43, 32, 49); g.closePath();
        var pg = g.createLinearGradient(32, 49, 32, 15);
        pg.addColorStop(0, rgba(RC.dark, 1)); pg.addColorStop(0.5, rgba(RC.mid, 1)); pg.addColorStop(1, rgba(RC.pale, 1));
        g.fillStyle = pg; g.fill();
        g.strokeStyle = 'rgba(255,240,248,.85)'; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(28, 26, 3.2, 7, 0.25, 0, TAU); g.fill();
      })();

      // ─── static art pre-rendered into sprites (local units → device pixels) ───
      function makeSprite(x0, y0, x1, y1, fn) {
        var c = document.createElement('canvas'), k = S * DPR;
        c.width = Math.max(1, Math.ceil((x1 - x0) * k));
        c.height = Math.max(1, Math.ceil((y1 - y0) * k));
        var g = c.getContext('2d');
        g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
        g.lineCap = 'round'; g.lineJoin = 'round';
        fn(g, k);
        return { c: c, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      function blit(sp) { ctx.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h); }
      function goldGrad(g, w) {
        var gr = g.createLinearGradient(-w, 0, w, 0);
        gr.addColorStop(0, '#5E3A0A'); gr.addColorStop(0.14, '#B57C22'); gr.addColorStop(0.3, '#FFF1BC');
        gr.addColorStop(0.42, '#F4C95C'); gr.addColorStop(0.68, '#BD8526'); gr.addColorStop(0.88, '#86560F'); gr.addColorStop(1, '#4E3008');
        return gr;
      }

      var PR_ = 0.5, PRY = 0.085, PT = 0.058;           // plate radius / ellipse ry / thickness
      function drawPedestal(g, k) {
        // the foot: a short drum
        g.fillStyle = goldGrad(g, 0.33);
        g.beginPath(); g.moveTo(-0.33, 0.36); g.lineTo(-0.33, 0.395);
        g.ellipse(0, 0.395, 0.33, 0.052, 0, Math.PI, 0, true);
        g.lineTo(0.33, 0.36); g.ellipse(0, 0.36, 0.33, 0.052, 0, 0, Math.PI, false); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(70,40,6,.55)'; g.lineWidth = 0.005;
        g.beginPath(); g.ellipse(0, 0.395, 0.33, 0.052, 0, 0, Math.PI, false); g.stroke();
        g.fillStyle = '#E9BC55'; g.beginPath(); g.ellipse(0, 0.36, 0.33, 0.052, 0, 0, TAU); g.fill();
        // tiny dots around the foot band
        g.fillStyle = 'rgba(255,244,200,.85)';
        for (var i = 1; i < 14; i++) {
          var th = i / 14 * Math.PI;
          g.beginPath(); g.arc(0.33 * Math.cos(th), 0.378 + 0.052 * Math.sin(th), 0.0065 * Math.pow(Math.sin(th), 0.5), 0, TAU); g.fill();
        }
        // the flaring lower neck
        g.fillStyle = goldGrad(g, 0.3);
        g.beginPath(); g.moveTo(-0.29, 0.36);
        g.bezierCurveTo(-0.16, 0.35, -0.095, 0.325, -0.08, 0.27);
        g.lineTo(0.08, 0.27);
        g.bezierCurveTo(0.095, 0.325, 0.16, 0.35, 0.29, 0.36);
        g.ellipse(0, 0.36, 0.29, 0.046, 0, 0, Math.PI, false); g.closePath(); g.fill();
        // filigree scrolls on the flare
        g.strokeStyle = 'rgba(255,240,190,.85)'; g.lineWidth = 0.006;
        for (var sd = -1; sd <= 1; sd += 2) {
          g.beginPath(); g.moveTo(sd * 0.03, 0.29);
          g.bezierCurveTo(sd * 0.05, 0.33, sd * 0.13, 0.35, sd * 0.19, 0.345);
          g.stroke();
          g.beginPath(); g.arc(sd * 0.19, 0.333, 0.012, sd > 0 ? Math.PI * 0.5 : Math.PI * 0.5, sd > 0 ? Math.PI * 2.1 : -Math.PI * 1.1, sd < 0); g.stroke();
        }
        // the knop (a round bulge)
        g.fillStyle = goldGrad(g, 0.135);
        g.beginPath(); g.ellipse(0, 0.252, 0.135, 0.038, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,250,220,.55)'; g.beginPath(); g.ellipse(-0.04, 0.243, 0.05, 0.011, 0, 0, TAU); g.fill();
        // the upper neck — a concave cup that carries the plate
        g.fillStyle = goldGrad(g, 0.3);
        g.beginPath(); g.moveTo(-0.075, 0.236);
        g.bezierCurveTo(-0.09, 0.17, -0.2, 0.13, -0.32, 0.1);
        g.lineTo(0.32, 0.1);
        g.bezierCurveTo(0.2, 0.13, 0.09, 0.17, 0.075, 0.236);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,240,190,.7)'; g.lineWidth = 0.005;
        for (var sd2 = -1; sd2 <= 1; sd2 += 2) {
          g.beginPath(); g.moveTo(sd2 * 0.02, 0.215);
          g.bezierCurveTo(sd2 * 0.05, 0.17, sd2 * 0.12, 0.15, sd2 * 0.17, 0.155);
          g.stroke();
        }
        // the plate: band + beads + gem, then the top
        g.fillStyle = goldGrad(g, PR_);
        g.beginPath(); g.moveTo(-PR_, 0); g.lineTo(-PR_, PT);
        g.ellipse(0, PT, PR_, PRY, 0, Math.PI, 0, true);
        g.lineTo(PR_, 0); g.ellipse(0, 0, PR_, PRY, 0, 0, Math.PI, false); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(70,40,6,.6)'; g.lineWidth = 0.005;
        g.beginPath(); g.ellipse(0, PT, PR_, PRY, 0, 0, Math.PI, false); g.stroke();
        for (var b = 1; b < 22; b++) {
          var bt = b / 22 * Math.PI, bx = PR_ * Math.cos(bt), by = PT * 0.5 + PRY * Math.sin(bt), br = 0.0115 * Math.pow(Math.sin(bt), 0.6);
          if (Math.abs(bx) < 0.05) continue;       // room for the gem
          var bg = g.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
          bg.addColorStop(0, '#FFF8DA'); bg.addColorStop(0.5, '#E7B54C'); bg.addColorStop(1, '#7A4C0C');
          g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
        }
        // the gem — a palette-tinted cabochon in a gold bezel
        var gx = 0, gy = PT * 0.5 + PRY + 0.002;
        g.fillStyle = '#8A5A12'; g.beginPath(); g.ellipse(gx, gy, 0.038, 0.027, 0, 0, TAU); g.fill();
        g.fillStyle = '#FFE59A'; g.beginPath(); g.ellipse(gx, gy, 0.033, 0.023, 0, 0, TAU); g.fill();
        var gg = g.createRadialGradient(gx - 0.008, gy - 0.008, 0.002, gx, gy, 0.028);
        gg.addColorStop(0, rgba(RC.pale, 1)); gg.addColorStop(0.45, rgba(RC.mid, 1)); gg.addColorStop(1, rgba(RC.deep, 1));
        g.fillStyle = gg; g.beginPath(); g.ellipse(gx, gy, 0.027, 0.018, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(gx - 0.009, gy - 0.006, 0.008, 0.004, -0.3, 0, TAU); g.fill();
        // plate top
        var tg = g.createRadialGradient(-0.12, -0.03, 0.02, 0, 0, PR_);
        tg.addColorStop(0, '#FFF4C8'); tg.addColorStop(0.5, '#EDC25A'); tg.addColorStop(1, '#A16C18');
        g.fillStyle = tg; g.beginPath(); g.ellipse(0, 0, PR_, PRY, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,248,215,.9)'; g.lineWidth = 0.006;
        g.beginPath(); g.ellipse(0, 0, PR_, PRY, 0, 0.1, Math.PI - 0.1, false); g.stroke();
        // engraved inner ring + the groove the glass sits in
        g.strokeStyle = 'rgba(120,74,12,.45)'; g.lineWidth = 0.006;
        g.beginPath(); g.ellipse(0, 0, 0.455, 0.077, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(96,58,8,.7)'; g.lineWidth = 0.012;
        g.beginPath(); g.ellipse(0, 0, DW + 0.008, DE + 0.0015, 0, 0, TAU); g.stroke();
        // a soft little mound of moss the rose grows from
        var vg = g.createRadialGradient(-0.025, -0.02, 0.005, 0, -0.006, 0.1);
        vg.addColorStop(0, '#6FB866'); vg.addColorStop(0.6, '#3A7F3E'); vg.addColorStop(1, '#1D4C25');
        g.fillStyle = vg;
        g.beginPath(); g.moveTo(-0.1, 0.004);
        g.bezierCurveTo(-0.09, -0.03, -0.04, -0.038, 0, -0.036);
        g.bezierCurveTo(0.04, -0.038, 0.09, -0.03, 0.1, 0.004);
        g.ellipse(0, 0.004, 0.1, 0.022, 0, 0, Math.PI, false); g.closePath(); g.fill();
        var MOSS = [[-0.06, -0.012], [-0.035, -0.024], [-0.005, -0.028], [0.03, -0.022], [0.06, -0.01], [-0.02, -0.006], [0.015, -0.008], [0.075, 0.0], [-0.08, -0.002]];
        for (var m = 0; m < MOSS.length; m++) {
          g.fillStyle = m % 2 ? 'rgba(170,225,140,.75)' : 'rgba(120,190,100,.8)';
          g.beginPath(); g.arc(MOSS[m][0], MOSS[m][1], 0.006 + (m % 3) * 0.002, 0, TAU); g.fill();
        }
      }

      function drawDomeBack(g) {
        // a breath of tint inside the glass, and the back half of the lip
        var ig = g.createLinearGradient(0, -DH, 0, 0);
        ig.addColorStop(0, rgba(mix(GLO, [255, 255, 255], 0.4), 0.06)); ig.addColorStop(1, rgba(GLO, 0.015));
        g.fillStyle = ig; domePath(g); g.fill();
        g.strokeStyle = 'rgba(235,245,255,.28)'; g.lineWidth = 0.006;
        g.beginPath(); g.ellipse(0, 0, DW, DE, 0, Math.PI, TAU, false); g.stroke();
        // faint reflection of the back wall
        g.strokeStyle = 'rgba(235,245,255,.1)'; g.lineWidth = 0.012;
        g.beginPath();
        for (var i = 0; i <= 20; i++) { var yu = lerp(0.12, 0.78, i / 20), x = domeW(yu) - 0.09; if (i) g.lineTo(x, -yu); else g.moveTo(x, -yu); }
        g.stroke();
      }

      function drawDomeFront(g, k) {
        var tint = mix(GLO, [255, 255, 255], 0.55);
        // Fresnel: the glass reads brighter towards its edges
        var fg = g.createLinearGradient(-DW, 0, DW, 0);
        fg.addColorStop(0, rgba(tint, 0.2)); fg.addColorStop(0.1, rgba(tint, 0.07)); fg.addColorStop(0.3, rgba(tint, 0.015));
        fg.addColorStop(0.7, rgba(tint, 0.015)); fg.addColorStop(0.9, rgba(tint, 0.07)); fg.addColorStop(1, rgba(tint, 0.2));
        g.fillStyle = fg; domePath(g); g.fill();
        var cg = g.createRadialGradient(0, -0.62, 0.1, 0, -0.62, 0.5);
        cg.addColorStop(0, rgba(tint, 0)); cg.addColorStop(0.75, rgba(tint, 0)); cg.addColorStop(1, rgba(tint, 0.1));
        g.fillStyle = cg; domePath(g); g.fill();
        // soft glowing outline
        g.save();
        g.shadowColor = rgba(mix(GLO, [255, 255, 255], 0.3), 0.9); g.shadowBlur = 0.03 * k;
        g.strokeStyle = 'rgba(240,250,255,.42)'; g.lineWidth = 0.0065;
        g.beginPath(); g.moveTo(DOME_PTS[0][0], DOME_PTS[0][1]);
        for (var i = 1; i < DOME_PTS.length; i++) g.lineTo(DOME_PTS[i][0], DOME_PTS[i][1]);
        g.stroke();
        g.restore();
        // the long highlight on the left + a thinner one on the right
        function band(side, y0, y1, inset, wid, a) {
          g.beginPath();
          var N = 26, i2, yu, w, x;
          for (i2 = 0; i2 <= N; i2++) {
            yu = lerp(y0, y1, i2 / N); w = domeW(yu);
            x = side * (w - inset * (w / DW + 0.15) / 1.15);
            if (i2) g.lineTo(x, -yu); else g.moveTo(x, -yu);
          }
          for (i2 = N; i2 >= 0; i2--) {
            var u = i2 / N; yu = lerp(y0, y1, u); w = domeW(yu);
            x = side * (w - (inset + wid * Math.sin(Math.PI * u)) * (w / DW + 0.15) / 1.15);
            g.lineTo(x, -yu);
          }
          g.closePath();
          var bg = g.createLinearGradient(0, -y0, 0, -y1);
          bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.35, 'rgba(255,255,255,' + a + ')');
          bg.addColorStop(0.7, 'rgba(255,255,255,' + (a * 0.8) + ')'); bg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = bg; g.fill();
        }
        band(-1, 0.1, 0.86, 0.035, 0.05, 0.42);
        band(-1, 0.2, 0.7, 0.1, 0.012, 0.22);
        band(1, 0.16, 0.74, 0.03, 0.022, 0.24);
        // the bright specular kiss up on the shoulder
        g.save();
        g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 0.02 * k;
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.translate(-0.17, -0.89); g.rotate(-0.62);
        g.beginPath(); g.ellipse(0, 0, 0.07, 0.019, 0, 0, TAU); g.fill();
        g.restore();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-0.07, -0.965, 0.008, 0, TAU); g.fill();
        // the glass lip at the base
        g.strokeStyle = 'rgba(240,250,255,.14)'; g.lineWidth = 0.022;
        g.beginPath(); g.ellipse(0, -0.004, DW - 0.004, DE, 0, 0.05, Math.PI - 0.05, false); g.stroke();
        g.strokeStyle = 'rgba(245,252,255,.6)'; g.lineWidth = 0.006;
        g.beginPath(); g.ellipse(0, 0, DW, DE, 0, 0.02, Math.PI - 0.02, false); g.stroke();
        // the little gold finial on top
        g.fillStyle = goldGrad(g, 0.065);
        g.beginPath(); g.ellipse(0, -DH + 0.004, 0.065, 0.018, 0, 0, TAU); g.fill();
        g.fillStyle = goldGrad(g, 0.03);
        g.beginPath(); g.moveTo(-0.025, -DH); g.quadraticCurveTo(-0.012, -DH - 0.03, -0.02, -DH - 0.045);
        g.lineTo(0.02, -DH - 0.045); g.quadraticCurveTo(0.012, -DH - 0.03, 0.025, -DH); g.closePath(); g.fill();
        var kg = g.createRadialGradient(-0.015, -DH - 0.085, 0.004, 0, -DH - 0.07, 0.04);
        kg.addColorStop(0, '#FFF9DC'); kg.addColorStop(0.45, '#F1C455'); kg.addColorStop(1, '#7E500D');
        g.fillStyle = kg; g.beginPath(); g.arc(0, -DH - 0.07, 0.034, 0, TAU); g.fill();
      }

      function buildSprites() {
        pedSpr = makeSprite(-0.54, -0.12, 0.54, 0.47, drawPedestal);
        domeBackSpr = makeSprite(-0.47, -1.13, 0.47, 0.1, drawDomeBack);
        domeFrontSpr = makeSprite(-0.47, -1.13, 0.47, 0.1, drawDomeFront);
      }

      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        unit = Math.min(W, H) / 800;
        S = Math.min(H * 0.43, W * 0.8);
        CX = W / 2;
        BY = (H * 0.27 + H * 0.975) / 2 + 0.36 * S;
        buildSprites();
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { bloom: [0.05, 0.38], pulse: 0.385, glint: 0.3, lift: [0.43, 0.63], rays: 0.5, ring: 0.52, rain: 0.5, txt: 0.2,
            ribbons: [[0.02, 1], [0.09, -1], [0.16, 1], [0.6, -1, 1], [0.68, 1, 1]], travel: 0.32 }
        : { bloom: [0.07, 0.62], pulse: 0.625, glint: 0.66, lift: null, rays: 0, ring: 0, rain: 0, txt: 0.24,
            ribbons: [[0.03, 1], [0.13, -1], [0.23, 1]], travel: 0.46 };
      function ms(f) { return f * dur; }

      // ─── the rose: layered petals on a surface of revolution ───
      // c / o = [start angle, end angle] of the petal profile (from vertical, + = outward), closed vs open
      var LAYERS = [
        { n: 5, phi: 0.25, hw: 0.36, len: 0.62, rho0: 0.07, c: [0.3, -0.45], o: [1.75, 2.5], dom: SEPAL_DOM, green: 1, bias: -0.4 },
        { n: 5, phi: 0.35, hw: 0.84, len: 0.98, rho0: 0.12, c: [0.55, -1.15], o: [1.05, 2.0], lc: 1 },
        { n: 5, phi: 0.35 + TAU / 10, hw: 0.8, len: 0.92, rho0: 0.1, c: [0.45, -1.05], o: [0.6, 1.3], lc: 0.93 },
        { n: 4, phi: 0.45, hw: 0.86, len: 0.84, rho0: 0.08, c: [0.38, -0.95], o: [0.36, 0.95], lc: 0.86 },
        { n: 3, phi: 0.95, hw: 1.5, len: 0.74, rho0: 0.06, c: [0.3, -0.85], o: [0.32, -0.45], lc: 0.8 }
      ];
      var petals = [];
      for (var li = 0; li < LAYERS.length; li++) {
        var Ly = LAYERS[li];
        for (var pk = 0; pk < Ly.n; pk++) {
          petals.push({ L: li, layer: Ly, phi: Ly.phi + pk * TAU / Ly.n + rnd(-0.07, 0.07), len: Ly.len * rnd(0.95, 1.05),
                        xs: new Float64Array(NO + 1), ys: new Float64Array(NO + 1), depth: 0, bx: 0, by: 0, tx: 0, ty: 0,
                        inside: false, lum: 0, open: 0, heart: false, tone: rnd(-0.08, 0.08), rT: 0, hT: 0 });
        }
      }
      var heartItem = { heart: true, depth: 0 }, spiralItem = { spiral: true, depth: 0 };
      var drawList = petals.concat([heartItem, spiralItem]);

      var KP = 10, PRo = new Float64Array(KP + 1), PHe = new Float64Array(KP + 1), pp = [0, 0], pf = [0, 0];
      function buildProfile(rho0, len, thS, thE) {
        PRo[0] = rho0; PHe[0] = 0;
        var ds = len / KP;
        for (var k = 1; k <= KP; k++) {
          var um = (k - 0.5) / KP, th = thS + (thE - thS) * um * um, r = PRo[k - 1] + Math.sin(th) * ds;
          PRo[k] = r < 0.004 ? 0.004 : r;
          PHe[k] = PHe[k - 1] + Math.cos(th) * ds;
        }
      }
      function profAt(u) {
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        var f = u * KP, k = Math.floor(f);
        if (k >= KP) k = KP - 1;
        f -= k;
        pf[0] = PRo[k] + (PRo[k + 1] - PRo[k]) * f; pf[1] = PHe[k] + (PHe[k + 1] - PHe[k]) * f;
      }
      var HX = 0, HY = -0.6, RR = 0.25, CA = 1, SA = 0, CL = 1, SL = 0;
      function proj(rho, h, beta) {
        var X = rho * Math.sin(beta), Z = rho * Math.cos(beta), Y = h;
        var X2 = X * CL + Y * SL, Y2 = -X * SL + Y * CL;
        pp[0] = HX + X2 * RR;
        pp[1] = HY - (Y2 * CA - Z * SA) * RR;
        return Y2 * SA + Z * CA;
      }
      function layerOpen(L, b) {
        if (L === 0) return easeOut(b / 0.42);
        var d = (L - 1) * 0.1;
        return easeInOut((b - d) / 0.7);
      }
      function computePetal(p, b) {
        var Ly = p.layer, o = layerOpen(p.L, b);
        var thS = lerp(Ly.c[0], Ly.o[0], o), thE = lerp(Ly.c[1], Ly.o[1], o);
        var phi = p.phi + (1 - o) * 0.45;
        var lc = Ly.lc || 0.9;
        buildProfile(Ly.rho0, p.len * (lc + (1 - lc) * o), thS, thE);
        var dom = Ly.dom || PETAL_DOM;
        for (var i = 0; i <= NO; i++) {
          profAt(dom[i][0]);
          proj(pf[0], pf[1], phi + dom[i][1] * Ly.hw);
          p.xs[i] = pp[0]; p.ys[i] = pp[1];
        }
        profAt(0); proj(pf[0], pf[1], phi); p.bx = pp[0]; p.by = pp[1];
        profAt(0.9); proj(pf[0], pf[1], phi); p.tx = pp[0]; p.ty = pp[1];
        profAt(1); p.rT = pf[0]; p.hT = pf[1];
        profAt(0.5); p.depth = proj(pf[0], pf[1], phi) + (Ly.bias || 0) * o;
        var thm = thS + (thE - thS) * 0.3, sb = Math.sin(phi), cb = Math.cos(phi), st = Math.sin(thm), ct = Math.cos(thm);
        var nx = ct * sb, ny = -st, nz = ct * cb, facing = ny * SA + nz * CA;
        if (facing < 0) { nx = -nx; ny = -ny; nz = -nz; }
        p.inside = facing < 0;
        var lum = nx * LX + ny * LY + nz * LZ;
        p.lum = lum < 0 ? 0 : lum;
        p.open = o;
      }
      function tracePetal(p) {
        var xs = p.xs, ys = p.ys, n = NO;
        ctx.beginPath();
        ctx.moveTo((xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2);
        for (var i = 1; i < n; i++) ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
        ctx.quadraticCurveTo(xs[0], ys[0], (xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2);
        ctx.closePath();
      }
      var GREEN_D = [24, 82, 40], GREEN_M = [62, 146, 72], GREEN_L = [150, 214, 128];
      function drawPetal(p) {
        var dx = p.tx - p.bx, dy = p.ty - p.by;
        if (dx * dx + dy * dy < 1e-8) dy = -0.001;
        var gr = ctx.createLinearGradient(p.bx, p.by, p.tx, p.ty), base, midC, tip, rim, edge;
        if (p.layer.green) {
          base = GREEN_D; midC = mix(GREEN_D, GREEN_M, 0.8); tip = mix(GREEN_M, GREEN_L, p.lum * 0.8); rim = tip; edge = [18, 60, 28];
        } else {
          var k = (p.L - 1) / 3, lum = clamp01(p.lum + p.tone);   // k: 0 outer … 1 heart — inner petals are darker
          if (p.inside) {
            base = mix(RC.deep, RC.dark, 0.15 - 0.15 * k);
            tip = mix(mix(RC.mid, RC.light, 0.1 + 0.8 * lum), RC.dark, k * 0.7);
          } else {
            base = mix(RC.dark, RC.deep, 0.15 + 0.3 * k);
            tip = mix(mix(RC.mid, RC.light, 0.2 + 0.6 * lum), RC.dark, k * 0.4);
          }
          midC = mix(base, tip, 0.55);
          rim = mix(tip, RC.pale, 0.25 + 0.4 * lum);
          edge = RC.deep;
        }
        gr.addColorStop(0, rgba(base, 1)); gr.addColorStop(0.42, rgba(midC, 1)); gr.addColorStop(0.82, rgba(tip, 1)); gr.addColorStop(1, rgba(rim, 1));
        tracePetal(p);
        ctx.fillStyle = gr; ctx.fill();
        // a soft inner shadow along the petal's edge gives each petal its own volume
        ctx.save(); ctx.clip();
        ctx.strokeStyle = rgba(edge, p.layer.green ? 0.25 : 0.3 + 0.2 * (p.L - 1) / 3); ctx.lineWidth = 0.024; ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = rgba(edge, 0.6); ctx.lineWidth = 0.0045; ctx.stroke();
        // the rolled, light-catching rim
        if (!p.layer.green) {
          ctx.beginPath(); ctx.moveTo(p.xs[RIM0], p.ys[RIM0]);
          for (var i = RIM0 + 1; i <= RIM1; i++) ctx.lineTo(p.xs[i], p.ys[i]);
          ctx.strokeStyle = rgba(RC.pale, 0.3 + 0.55 * p.lum); ctx.lineWidth = 0.007; ctx.stroke();
        }
      }
      // the tight spiral at the heart of the rose
      function drawSpiral(b, t) {
        var cr = 0, ch = 0, n = 0;
        for (var i = 0; i < petals.length; i++) if (petals[i].L === 4) { cr += petals[i].rT; ch += petals[i].hT; n++; }
        cr /= n; ch /= n;
        var a = smooth((b - 0.15) / 0.5);
        if (a <= 0) return;
        var rot = 0.6 + t * 0.00015, N = 40;
        for (var pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (var k = 0; k <= N; k++) {
            var f = k / N, r = cr * 1.05 * (1 - 0.9 * f), h = ch - 0.02 - 0.14 * f;
            proj(r, h, rot + f * 3.3 * Math.PI);
            if (pass) { pp[1] -= 0.004; }
            if (k) ctx.lineTo(pp[0], pp[1]); else ctx.moveTo(pp[0], pp[1]);
          }
          ctx.strokeStyle = pass ? rgba(RC.light, 0.5 * a) : rgba(RC.deep, 0.85 * a);
          ctx.lineWidth = pass ? 0.0035 : 0.007;
          ctx.stroke();
        }
      }

      // stem (cubic) + leaves + thorns
      var STEM = [[0, -0.01], [-0.06, -0.2], [0.07, -0.38], [0, -0.58]];
      var sP = [0, 0], sT = [0, 0];
      function stemAt(t, sway) {
        var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        var x3 = STEM[3][0] + sway;
        sP[0] = a * STEM[0][0] + b * STEM[1][0] + c * (STEM[2][0] + sway * 0.6) + d * x3;
        sP[1] = a * STEM[0][1] + b * STEM[1][1] + c * STEM[2][1] + d * STEM[3][1];
        var tx = 3 * u * u * (STEM[1][0] - STEM[0][0]) + 6 * u * t * (STEM[2][0] + sway * 0.6 - STEM[1][0]) + 3 * t * t * (x3 - STEM[2][0] - sway * 0.6);
        var ty = 3 * u * u * (STEM[1][1] - STEM[0][1]) + 6 * u * t * (STEM[2][1] - STEM[1][1]) + 3 * t * t * (STEM[3][1] - STEM[2][1]);
        var l = Math.sqrt(tx * tx + ty * ty) || 1;
        sT[0] = tx / l; sT[1] = ty / l;
      }
      function strokeStem(sway, w, col, off) {
        ctx.beginPath();
        for (var i = 0; i <= 24; i++) {
          stemAt(i / 24, sway);
          var x = sP[0] + off, y = sP[1];
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      }
      function leafShape() {
        // leaf-local: x 0 … 1 along, y across; serrated edge
        var N = 9, i, u, w;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (i = 1; i <= N; i++) {
          u = i / N; w = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.85);
          var um = (i - 0.5) / N, wm = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(um, 0.75)), 0.85);
          ctx.lineTo(um + 0.03, -wm * 0.9); ctx.lineTo(u, -w);
        }
        for (i = N - 1; i >= 0; i--) {
          u = i / N; w = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.85);
          var um2 = (i + 0.5) / N, wm2 = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(um2, 0.75)), 0.85);
          ctx.lineTo(um2 + 0.03, wm2 * 0.9); ctx.lineTo(u, w);
        }
        ctx.closePath();
      }
      var leafGrad = null;
      function drawLeaf(t, side, ang, len, sway, grow) {
        stemAt(t, sway);
        var x0 = sP[0], y0 = sP[1];
        var px = x0 + side * 0.035, py = y0 - 0.012;
        ctx.strokeStyle = '#2C7034'; ctx.lineWidth = 0.009;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + side * 0.02, y0 - 0.002, px, py); ctx.stroke();
        ctx.save();
        ctx.translate(px, py); ctx.rotate(ang); ctx.scale(len * grow, len * grow * (side < 0 ? -1 : 1));
        if (!leafGrad) {
          leafGrad = ctx.createLinearGradient(0, -0.36, 0, 0.36);
          leafGrad.addColorStop(0, '#8BD982'); leafGrad.addColorStop(0.48, '#4DA552'); leafGrad.addColorStop(0.52, '#3B8A43'); leafGrad.addColorStop(1, '#1F5E2B');
        }
        leafShape(); ctx.fillStyle = leafGrad; ctx.fill();
        ctx.strokeStyle = 'rgba(16,58,26,.7)'; ctx.lineWidth = 0.03; ctx.stroke();
        ctx.strokeStyle = 'rgba(200,245,180,.75)'; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(0.02, 0); ctx.quadraticCurveTo(0.5, -0.03, 0.95, 0); ctx.stroke();
        ctx.lineWidth = 0.022; ctx.strokeStyle = 'rgba(200,245,180,.45)';
        for (var v = 1; v <= 4; v++) {
          var vx = v * 0.18;
          ctx.beginPath(); ctx.moveTo(vx, -0.01); ctx.lineTo(vx + 0.12, -0.2 + v * 0.02);
          ctx.moveTo(vx, 0.01); ctx.lineTo(vx + 0.12, 0.2 - v * 0.02); ctx.stroke();
        }
        ctx.restore();
      }
      var THORNS = [[0.16, 1], [0.27, -1], [0.45, 1], [0.66, -1], [0.78, 1]];
      function drawThorns(sway) {
        for (var i = 0; i < THORNS.length; i++) {
          stemAt(THORNS[i][0], sway);
          var sd = THORNS[i][1], nx = -sT[1] * sd, ny = sT[0] * sd, tx = sT[0], ty = sT[1];
          var bx = sP[0] + nx * 0.008, by = sP[1] + ny * 0.008;
          ctx.beginPath();
          ctx.moveTo(bx - tx * 0.014, by - ty * 0.014);
          ctx.quadraticCurveTo(bx + nx * 0.01, by + ny * 0.01, bx + nx * 0.03 + tx * 0.016, by + ny * 0.03 + ty * 0.016);
          ctx.quadraticCurveTo(bx + nx * 0.006 + tx * 0.006, by + ny * 0.006 + ty * 0.006, bx + tx * 0.014, by + ty * 0.014);
          ctx.closePath();
          ctx.fillStyle = '#7A3A2C'; ctx.fill();
        }
      }

      // ─── glitter swirls spiralling up around the glass ───
      var ribbons = [], cols = [accent, '#FFFFFF', rgbHex(mix(GLO, PRI, 0.4))];
      function rgbHex(c) { return '#' + [0, 1, 2].map(function (i) { var v = Math.round(c[i]).toString(16); return v.length < 2 ? '0' + v : v; }).join(''); }
      for (var ri = 0; ri < T.ribbons.length; ri++) {
        var R0 = T.ribbons[ri], sh = [];
        for (var si = 0; si < 14; si++) sh.push({ h: (si + rnd(0.1, 0.9)) / 14, dx: rnd(-0.04, 0.04), dy: rnd(-0.03, 0.01), life: rnd(500, 850), ph: rnd(0, TAU), sz: rnd(0.6, 1.2) });
        ribbons.push({ start: ms(R0[0]), dir: R0[1], tight: !!R0[2], a0: ri * 2.1 + rnd(-0.3, 0.3), col: cols[ri % 3], sheds: sh, turns: R0[2] ? 1.8 : 1.45 });
      }
      var travel = ms(T.travel), hp = { x: 0, y: 0, z: 0 };
      function helix(rb, h) {
        var y = rb.tight ? lerp(0.0, -1.0, h) : lerp(0.1, -1.24, h), r;
        if (rb.tight) r = 0.34 * (1 - 0.55 * h) + 0.05;
        else r = domeW(-y) + 0.085 + 0.03 * smooth((h - 0.75) / 0.25) + 0.02 * Math.sin(h * 9);
        var a = rb.a0 + rb.dir * h * TAU * rb.turns;
        hp.x = r * Math.sin(a); hp.z = Math.cos(a); hp.y = y + hp.z * r * 0.2;
      }
      function drawRibbons(t, front) {
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < ribbons.length; i++) {
          var rb = ribbons[i], p = (t - rb.start) / travel;
          if (p <= 0 || p > 1.6) continue;
          var hHead = clamp01(p), hTail = clamp01(p - 0.34), N = 30, px = 0, py = 0, pz = 0;
          if (hHead - hTail > 0.002) {
            for (var k = 0; k <= N; k++) {
              var f = k / N, h = lerp(hTail, hHead, f);
              helix(rb, h);
              if (k) {
                var zm = (pz + hp.z) / 2;
                if ((zm > 0) === front) {
                  var a = Math.pow(f, 1.4) * (front ? 1 : 0.5);
                  ctx.strokeStyle = hexA(rb.col, 0.75 * a);
                  ctx.lineWidth = lerp(0.002, 0.016, f);
                  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hp.x, hp.y); ctx.stroke();
                  if (f > 0.5) {
                    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * a * (f - 0.5) * 2).toFixed(3) + ')';
                    ctx.lineWidth = lerp(0.001, 0.005, f);
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hp.x, hp.y); ctx.stroke();
                  }
                }
              }
              px = hp.x; py = hp.y; pz = hp.z;
            }
            // the bright head
            if (p < 1) {
              helix(rb, hHead);
              if ((hp.z > 0) === front) {
                glowDot(hp.x, hp.y, 0.07, front ? 0.95 : 0.5);
                ctx.fillStyle = 'rgba(255,255,255,' + (front ? 0.95 : 0.5) + ')';
                sparkPath(ctx, hp.x, hp.y, 0.03 * (1 + 0.25 * Math.sin(t * 0.03 + i))); ctx.fill();
              }
            }
          }
          // sparkles shed along the way
          for (var s = 0; s < rb.sheds.length; s++) {
            var sd = rb.sheds[s], age = t - (rb.start + sd.h * travel);
            if (age <= 0 || age > sd.life) continue;
            helix(rb, sd.h);
            if ((hp.z > 0) !== front) continue;
            var q = age / sd.life, sx = hp.x + sd.dx * q * 2, sy = hp.y + sd.dy - 0.05 * q;
            var tw = 0.6 + 0.4 * Math.sin(age * 0.025 + sd.ph);
            ctx.fillStyle = hexA(s % 2 ? rb.col : '#FFFFFF', (1 - q) * tw * (front ? 1 : 0.5));
            sparkPath(ctx, sx, sy, 0.016 * sd.sz * (1 - q * 0.5)); ctx.fill();
          }
          // a little burst when a swirl reaches the top
          var bq = (p - 1) / 0.45;
          if (front && bq > 0 && bq < 1) {
            helix(rb, 1);
            glowDot(hp.x, hp.y, 0.06 + 0.1 * bq, 0.7 * (1 - bq));
            for (var bk = 0; bk < 8; bk++) {
              var ba = bk / 8 * TAU + i, br = 0.03 + 0.11 * easeOut(bq);
              ctx.fillStyle = hexA(bk % 2 ? rb.col : '#FFFFFF', 1 - bq);
              sparkPath(ctx, hp.x + Math.cos(ba) * br, hp.y + Math.sin(ba) * br * 0.8, 0.018 * (1 - bq * 0.6)); ctx.fill();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // ─── glowing petals that float up out of the rose ───
      var floaters = [], NF = isSuper ? 8 : 6;
      for (var fi = 0; fi < NF; fi++) {
        var fside = fi % 2 ? 1 : -1, fspread = (Math.floor(fi / 2) + 0.5) / Math.ceil(NF / 2);   // fan out evenly, both sides
        floaters.push({ t0: ms(T.pulse) - 60 + fi * (isSuper ? 110 : 75) + rnd(0, 40), x0: fside * rnd(0.02, 0.1), vy: rnd(0.48, 0.66),
                        sw: rnd(0.03, 0.06) * fside, drift: fside * (0.06 + fspread * (isSuper ? 0.36 : 0.24)),
                        ph: rnd(0, TAU), rot: rnd(-0.6, 0.6), vr: rnd(-2, 2), sz: rnd(0.07, 0.09), life: isSuper ? rnd(1300, 1600) : rnd(1000, 1150) });
      }
      // super: ring of petals + golden rain
      var ringN = 12, rain = [];
      if (isSuper) {
        for (var ra = 0; ra < 80; ra++)
          rain.push({ x: Math.random(), d: rnd(0, ms(0.42)), sp: rnd(0.22, 0.4), sw: rnd(8, 22), ph: rnd(0, TAU), sz: rnd(0.7, 1.5), gold: ra % 3 !== 0 });
      }
      var bgStars = [];
      for (var bs = 0; bs < 20; bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.65, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bs % 3 === 0 ? glow : bs % 4 === 0 ? accent : '#FFFFFF' });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + rgba(RC.mid, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
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

      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function sprDot(img, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function drawPetalSprite(x, y, sz, rot, flip, a) {
        if (a <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1);
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(petSpr, -sz, -sz, sz * 2, sz * 2);
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280), appear = clamp01(t / 320);
        cv.style.opacity = Math.min(gFade, smooth(appear * 1.4)).toFixed(3);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.55 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        // ─── local space: 1 unit = S px, origin at the plate top centre ───
        var sc = 0.9 + 0.1 * easeOutBack(appear);
        ctx.translate(CX, BY - 0.36 * S); ctx.scale(S * sc, S * sc); ctx.translate(0, 0.36);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        var b = easeInOut((t - ms(T.bloom[0])) / (ms(T.bloom[1]) - ms(T.bloom[0])));
        var pulseQ = (t - ms(T.pulse)) / 700;
        var bloomed = clamp01((t - ms(T.pulse) + 150) / 450);
        var heartbeat = bloomed * (0.85 + 0.15 * Math.sin((t - ms(T.pulse)) * 0.006));
        var liftQ = T.lift ? clamp01((t - ms(T.lift[0])) / (ms(T.lift[1]) - ms(T.lift[0]))) : 0;
        var raysA = isSuper ? smooth((t - ms(T.rays)) / 600) : 0;

        // rose head pose
        var sway = Math.sin(t * 0.0016) * 0.008 * (1 - 0.5 * b);
        HX = STEM[3][0] + sway; HY = STEM[3][1];
        RR = 0.275 * (1 + 0.015 * Math.sin(t * 0.004) * bloomed);
        var alpha = lerp(0.3, 0.5, b);
        CA = Math.cos(alpha); SA = Math.sin(alpha);
        var lean = sway * 2.5; CL = Math.cos(lean); SL = Math.sin(lean);
        var heartX = HX, heartY = HY - (0.32 * CA) * RR;

        // ambient halo behind the whole piece + pool of light under the foot
        sprDot(tintSpr, 0, -0.45, 1.05, 0.55);
        sprDot(pinkSpr, heartX, heartY, 0.55 + 0.25 * b, 0.25 + 0.3 * b + 0.2 * heartbeat);
        ctx.save(); ctx.translate(0, 0.42); ctx.scale(1, 0.16);
        sprDot(pinkSpr, 0, 0, 0.75, 0.35 + 0.25 * heartbeat);
        ctx.restore();

        // super: soft golden rays from the rose (behind everything)
        if (raysA > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.translate(heartX, heartY);
          var rg = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 1.25);
          rg.addColorStop(0, 'rgba(255,236,170,' + (0.5 * raysA).toFixed(3) + ')');
          rg.addColorStop(0.35, 'rgba(255,214,130,' + (0.2 * raysA).toFixed(3) + ')');
          rg.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = rg;
          var rot = t * 0.00022;
          for (var ry = 0; ry < 14; ry++) {
            var ang = rot + ry / 14 * TAU, hw2 = ry % 2 ? 0.05 : 0.085, len2 = ry % 2 ? 0.95 : 1.25;
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang - hw2) * len2, Math.sin(ang - hw2) * len2);
            ctx.lineTo(Math.cos(ang + hw2) * len2, Math.sin(ang + hw2) * len2);
            ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }

        blit(pedSpr);

        // the glass (back half) — in super it lifts up and away
        var liftE = easeInOut(liftQ);
        var domeA = 1 - smooth((liftQ - 0.25) / 0.6), domeDY = -liftE * (BY / S + 0.4), domeRot = 0.1 * liftE;
        function domeXf() { ctx.translate(0.1 * liftE, domeDY); ctx.rotate(domeRot); }
        if (domeA > 0.01) {
          ctx.save(); domeXf(); ctx.globalAlpha = domeA; blit(domeBackSpr); ctx.restore();
        }

        drawRibbons(t, false);

        // super: the ring of glowing petals — far half
        var ringA = isSuper ? smooth((t - ms(T.ring)) / 500) : 0, ringR = 0, ringPts = null, ringY = 0;
        if (ringA > 0) {
          ringR = 0.46 * easeOut((t - ms(T.ring)) / 900);
          ringY = heartY + 0.02 - 0.06 * Math.sin((t - ms(T.ring)) * 0.0014);   // the ring breathes up and down
          ringPts = [];
          for (var rp = 0; rp < ringN; rp++) {
            var ra2 = rp / ringN * TAU + (t - ms(T.ring)) * 0.0022;
            var rz = Math.cos(ra2), rx = Math.sin(ra2) * ringR;
            var ryy = ringY + rz * ringR * 0.26;
            ringPts.push([rx, ryy, rz, ra2]);
          }
        }
        function drawRing(front) {
          if (!ringPts) return;
          ctx.globalCompositeOperation = 'lighter';
          // the faint golden orbit the petals ride on
          ctx.strokeStyle = 'rgba(255,220,150,' + (0.3 * ringA).toFixed(3) + ')'; ctx.lineWidth = 0.008;
          ctx.beginPath(); ctx.ellipse(0, ringY, ringR, ringR * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : TAU, false); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,240,210,' + (0.45 * ringA).toFixed(3) + ')'; ctx.lineWidth = 0.003;
          ctx.stroke();
          for (var i2 = 0; i2 < ringPts.length; i2++) {
            var q = ringPts[i2];
            if ((q[2] > 0) !== front) continue;
            var dsc = 0.8 + 0.2 * q[2];
            glowDot(q[0], q[1], 0.1 * dsc, 0.4 * ringA);
            for (var tr = 1; tr <= 4; tr++) {            // a short trail of sparkles
              var ta = q[3] - tr * 0.11;
              ctx.fillStyle = hexA(tr % 2 ? accent : '#FFFFFF', ringA * (0.75 - tr * 0.15));
              sparkPath(ctx, Math.sin(ta) * ringR, q[1] + (Math.cos(ta) - q[2]) * ringR * 0.26, 0.016 * dsc * (1 - tr * 0.15)); ctx.fill();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
          for (var i3 = 0; i3 < ringPts.length; i3++) {
            var q2 = ringPts[i3];
            if ((q2[2] > 0) !== front) continue;
            drawPetalSprite(q2[0], q2[1], 0.08 * (0.8 + 0.2 * q2[2]), -q2[3] + Math.PI / 2, 0.45 + 0.55 * Math.abs(Math.cos(q2[3] + t * 0.004)), ringA * (front ? 1 : 0.7));
          }
        }
        drawRing(false);

        // ─── the rose ───
        strokeStem(sway, 0.026, '#174A22', 0);
        strokeStem(sway, 0.016, '#3C8F45', -0.002);
        strokeStem(sway, 0.005, 'rgba(160,225,150,.65)', -0.006);
        drawThorns(sway);
        var leafGrow = 0.75 + 0.25 * easeOutBack(clamp01(t / 700));
        drawLeaf(0.33, -1, Math.PI + 0.5 + Math.sin(t * 0.002) * 0.04, 0.17, sway, leafGrow);
        drawLeaf(0.55, 1, -0.55 + Math.sin(t * 0.0022 + 1) * 0.04, 0.155, sway, leafGrow);
        // receptacle (the green hip under the flower)
        var hipG = ctx.createRadialGradient(HX - 0.01, HY - 0.01, 0.003, HX, HY, 0.04);
        hipG.addColorStop(0, '#7CC774'); hipG.addColorStop(1, '#22602D');
        ctx.fillStyle = hipG; ctx.beginPath(); ctx.ellipse(HX, HY + 0.012, 0.034, 0.03, 0, 0, TAU); ctx.fill();

        for (var pi = 0; pi < petals.length; pi++) computePetal(petals[pi], b);
        heartItem.depth = 0.32 * SA + 0.02;
        spiralItem.depth = 0.45 * SA + 0.03;
        drawList.sort(function (a, c) { return a.depth - c.depth; });
        for (var di = 0; di < drawList.length; di++) {
          var it = drawList[di];
          if (it.heart) {
            ctx.globalCompositeOperation = 'lighter';
            sprDot(heartSpr, heartX, heartY, 0.08 + 0.08 * b, 0.15 + 0.35 * b * (0.6 + 0.4 * heartbeat));
            ctx.globalCompositeOperation = 'source-over';
          } else if (it.spiral) drawSpiral(b, t);
          else drawPetal(it);
        }
        // the heart glow spilling softly over the petals
        ctx.globalCompositeOperation = 'lighter';
        sprDot(pinkSpr, heartX, heartY - 0.02, 0.2 + 0.1 * b, 0.08 + 0.16 * b * heartbeat);
        ctx.globalCompositeOperation = 'source-over';

        drawRing(true);

        // warm pulse of light when the rose is fully open
        if (pulseQ > 0 && pulseQ < 1) {
          ctx.globalCompositeOperation = 'lighter';
          var pe = easeOut(pulseQ), pa = Math.sin(Math.PI * Math.min(1, pulseQ * 2.2)) * (1 - pulseQ * 0.6);
          sprDot(heartSpr, heartX, heartY, 0.18 + 0.3 * pe, 0.55 * pa);
          ctx.save(); ctx.translate(heartX, heartY); ctx.scale(1, 0.82);
          sprDot(ringSpr, 0, 0, 0.12 + 0.75 * pe, 0.9 * (1 - pulseQ));
          ctx.restore();
          for (var pk2 = 0; pk2 < 10; pk2++) {
            var pa2 = pk2 / 10 * TAU + 0.3, pr2 = 0.1 + 0.55 * pe;
            ctx.fillStyle = hexA(pk2 % 2 ? accent : '#FFFFFF', 1 - pulseQ);
            sparkPath(ctx, heartX + Math.cos(pa2) * pr2, heartY + Math.sin(pa2) * pr2 * 0.82, 0.022 * (1 - pulseQ * 0.5)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // the glass (front half) + a glint sweeping across it
        if (domeA > 0.01) {
          ctx.save(); domeXf(); ctx.globalAlpha = domeA; blit(domeFrontSpr); ctx.globalAlpha = 1;
          var gq = (t - ms(T.glint)) / 650;
          if (gq > 0 && gq < 1) {
            domePath(ctx); ctx.clip();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(lerp(-0.75, 0.75, easeInOut(gq)), -0.5); ctx.rotate(0.42);
            var gg2 = ctx.createLinearGradient(-0.09, 0, 0.09, 0);
            gg2.addColorStop(0, 'rgba(255,255,255,0)'); gg2.addColorStop(0.5, 'rgba(255,255,255,' + (0.32 * domeA * Math.sin(gq * Math.PI)).toFixed(3) + ')'); gg2.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gg2; ctx.fillRect(-0.09, -1, 0.18, 2);
          }
          ctx.restore();
          // twinkles on the glass
          ctx.globalCompositeOperation = 'lighter';
          var g1 = Math.max(0, Math.sin(t * 0.004)), g2 = Math.max(0, Math.sin(t * 0.0033 + 2));
          ctx.save(); domeXf();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * g1 * domeA).toFixed(3) + ')'; sparkPath(ctx, -0.215, -0.84, 0.035 * g1); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * g2 * domeA).toFixed(3) + ')'; sparkPath(ctx, 0.33, -0.36, 0.025 * g2); ctx.fill();
          ctx.restore();
          ctx.globalCompositeOperation = 'source-over';
        }
        // super: a ring of sparkles where the glass lifts off
        if (liftQ > 0 && liftQ < 0.6) {
          var lq = liftQ / 0.6;
          ctx.globalCompositeOperation = 'lighter';
          for (var lk = 0; lk < 16; lk++) {
            var la = lk / 16 * TAU, lr = DW + 0.12 * easeOut(lq);
            ctx.fillStyle = hexA(lk % 2 ? accent : '#FFFFFF', 1 - lq);
            sparkPath(ctx, Math.cos(la) * lr, Math.sin(la) * lr * 0.2 - 0.02, 0.022 * (1 - lq * 0.5)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        drawRibbons(t, true);

        // glowing petals drifting up through the glass
        for (var fl = 0; fl < floaters.length; fl++) {
          var F = floaters[fl], age = t - F.t0;
          if (age <= 0 || age > F.life) continue;
          var fq = age / F.life;
          var fx = heartX + F.x0 + Math.sin(age * 0.004 + F.ph) * F.sw + F.drift * fq;
          var fy = heartY - 0.03 - F.vy * (0.15 * easeOut(fq * 3) + 0.85 * fq);
          var fa = clamp01(age / 160) * clamp01((1 - fq) / 0.35);
          ctx.globalCompositeOperation = 'lighter';
          glowDot(fx, fy, F.sz * 1.6, 0.4 * fa);
          ctx.globalCompositeOperation = 'source-over';
          drawPetalSprite(fx, fy, F.sz, F.rot + F.vr * age / 1000, 0.35 + 0.65 * Math.abs(Math.cos(age * 0.005 + F.ph)), fa);
        }

        // ─── screen space again: golden rain (super) ───
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (isSuper) {
          var rainT = t - ms(T.rain);
          if (rainT > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (var rn = 0; rn < rain.length; rn++) {
              var Rn = rain[rn], at = rainT - Rn.d;
              if (at <= 0) continue;
              var yy = -20 + at * Rn.sp * H / 1000;
              if (yy > H + 20) continue;
              var xx = Rn.x * W + Math.sin(at * 0.003 + Rn.ph) * Rn.sw * unit;
              var tw2 = 0.55 + 0.45 * Math.sin(at * 0.012 + Rn.ph);
              var rs = (5 + 4 * Rn.sz) * unit * tw2 + 1;
              if (Rn.gold) glowDot(xx, yy, rs * 2.2, 0.35 * tw2);
              ctx.fillStyle = Rn.gold ? hexA(accent, 0.9 * tw2 + 0.1) : 'rgba(255,255,255,' + (0.9 * tw2).toFixed(3) + ')';
              sparkPath(ctx, xx, yy, rs); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

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
        spr = pinkSpr = heartSpr = tintSpr = petSpr = null;
        pedSpr = domeBackSpr = domeFrontSpr = null;
      };
    }
  });
})();
