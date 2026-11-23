/* success-ice-skater.js — מסך הצלחה: הַמַּחֲלִיקָה הַקְּטַנָּה
   משטח החלקה סגלגל וזוהר במבט פרספקטיבה עדין: קרח תכלת עם השתקפויות רכות,
   שוליים מושלגים ושרשרת נורות קטנות מנצנצות. מחליקה קטנה וחמודה בסגנון צ'יבי
   (ראש גדול, עיניים נוצצות וסומק, קוקו מתנדנד, שמלת החלקה נוצצת בצבעי הסקין עם
   חצאית מתרחבת, מחליקיים לבנים עם פונפונים ולהבי כסף) גולשת אל הקרח, והלהבים
   חורטים שובל זוהר שמצייר לב גדול על הקרח. אחר כך פירואט מהיר — ידיים למעלה,
   החצאית מתעופפת, הקוקו מצליף ורסס נצנצי שלג ניתז החוצה — והיא נעצרת בתנוחה
   חיננית עם יד מורמת. פתיתי שלג נושרים כל הזמן.
   בסופר: השובל מצייר גם כוכב בתוך הלב, היא קופצת קפיצת סיבוב באוויר (הצל על
   הקרח מתכווץ), זרקור רך עוקב אחריה, ובסוף מתפרצת מערבולת פתיתים ונצנצים.
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
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(a, b, t) {
    function ch(i) {
      var x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16), v = Math.round(x + (y - x) * t);
      return (v < 16 ? '0' : '') + v.toString(16);
    }
    return '#' + ch(1) + ch(3) + ch(5);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.25, y + r * 0.05, x - r * 0.75, y - r * 0.95, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.75, y - r * 0.95, x + r * 1.25, y + r * 0.05, x, y + r * 0.9);
    ctx.closePath();
  }
  function seeded(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ─── choreography on the rink plane: u across (−1…1), v far (−1) … near (+1) ───
  var HU = 0.62, HV = 0.78, HO = -0.03;
  function poly(pts) {
    var c = [0];
    for (var i = 1; i < pts.length; i++) {
      var du = pts[i][0] - pts[i - 1][0], dv = (pts[i][1] - pts[i - 1][1]) * 0.6;
      c.push(c[i - 1] + Math.sqrt(du * du + dv * dv));
    }
    return { p: pts, c: c, L: c[c.length - 1] };
  }
  function polyAt(P, f) {
    var d = clamp01(f) * P.L, c = P.c, i = 1;
    while (i < c.length - 1 && c[i] < d) i++;
    var a = P.p[i - 1], b = P.p[i], k = clamp01((d - c[i - 1]) / ((c[i] - c[i - 1]) || 1));
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  }
  var HEART = poly((function () {
    var out = [], N = 180;
    for (var i = 0; i <= N; i++) {          // starts at the near tip, goes up the RIGHT side first
      var t = Math.PI - TAU * i / N, sn = Math.sin(t);
      var x = 16 * sn * sn * sn, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      out.push([x / 16 * HU, HO - (y + 2.5) / 14.5 * HV]);
    }
    return out;
  })());
  var SR = 0.3, SVR = 0.36, SCV = -0.02;
  var STAR = poly((function () {
    var out = [];
    for (var k = 0; k <= 10; k++) {          // starts at the near-right "foot"
      var a = (54 - 36 * k) * Math.PI / 180, r = k % 2 ? 0.45 : 1;
      out.push([Math.cos(a) * SR * r, SCV + Math.sin(a) * SVR * r]);
    }
    return out;
  })());
  var TIP = [0, HV + HO], STAR0 = STAR.p[0];
  function bez(A, C, B) {
    return function (q) { var m = 1 - q; return [m * m * A[0] + 2 * m * q * C[0] + q * q * B[0], m * m * A[1] + 2 * m * q * C[1] + q * q * B[1]]; };
  }
  function polyF(P) { return function (q) { return polyAt(P, q); }; }
  function stopEase(q) { q = clamp01(q); return q + q * q * q * q - q * q * q * q * q; }   // constant speed, glides to a stop
  function lin(q) { return clamp01(q); }

  // ─── key poses: arms a (from straight down, outward +) / b (elbow bend), legs l (outward from vertical),
  //     p pointed toes, t toe direction (−1 left / +1 right), cr crouch, fl skirt flare, eye 0 open/1 happy, mo mouth ───
  var GLIDE_R = { lean: 0.1, cr: 0.12, aL: 1.95, bL: 0.35, aR: 1.25, bR: -0.2, lL: 1.0, lR: 0.03, pL: 0.85, pR: 0, tL: -1, tR: 1, fl: 0.3, eye: 0, mo: 0.2, tilt: -0.07 };
  var WIND   = { lean: 0, cr: 0.35, aL: 0.75, bL: -0.6, aR: 0.75, bR: -0.6, lL: 0.06, lR: 0.03, pL: 0.2, pR: 0, tL: -1, tR: 1, fl: 0.2, eye: 1, mo: 0.3, tilt: 0 };
  var SPIN   = { lean: 0, cr: 0, aL: 2.2, bL: 0.7, aR: 2.2, bR: 0.7, lL: -0.12, lR: 0.02, pL: 0.7, pR: 0, tL: 1, tR: 1, fl: 1, eye: 1, mo: 0.4, tilt: 0 };
  var FINAL  = { lean: -0.12, cr: 0, aL: 1.2, bL: 0.3, aR: 2.3, bR: 0.45, lL: 0.42, lR: 0.02, pL: 1, pR: 0, tL: -1, tR: 1, fl: 0.3, eye: 1, mo: 1, tilt: -0.08 };
  var CROUCH = { lean: 0, cr: 0.9, aL: 0.6, bL: 0.2, aR: 0.6, bR: 0.2, lL: 0.05, lR: 0.03, pL: 0, pR: 0, tL: -1, tR: 1, fl: 0.2, eye: 0, mo: 0.4, tilt: 0 };
  var AIR    = { lean: 0, cr: 0, aL: 0.55, bL: -2.2, aR: 0.55, bR: -2.2, lL: 0.03, lR: 0.03, pL: 0.45, pR: 0.45, tL: -1, tR: 1, fl: 0.5, eye: 1, mo: 1, tilt: 0 };
  var LAND   = { lean: 0, cr: 0.6, aL: 1.6, bL: 0.1, aR: 1.6, bR: 0.1, lL: 0.95, lR: 0.03, pL: 0.9, pR: 0, tL: -1, tR: 1, fl: 0.35, eye: 1, mo: 0.8, tilt: 0 };
  var KEYS = ['lean', 'cr', 'aL', 'bL', 'aR', 'bR', 'lL', 'lR', 'pL', 'pR', 'tL', 'tR', 'fl', 'eye', 'mo', 'tilt'];
  function mirror(P) {
    return { lean: -P.lean, cr: P.cr, aL: P.aR, bL: P.bR, aR: P.aL, bR: P.bL, lL: P.lR, lR: P.lL, pL: P.pR, pR: P.pL,
             tL: -P.tR, tR: -P.tL, fl: P.fl, eye: P.eye, mo: P.mo, tilt: -P.tilt };
  }
  var GLIDE_L = mirror(GLIDE_R);
  function mixPose(A, B, k) {
    var o = {};
    for (var i = 0; i < KEYS.length; i++) o[KEYS[i]] = lerp(A[KEYS[i]], B[KEYS[i]], k);
    return o;
  }

  window.SUCCESS.styles.push({
    name: 'ice-skater',
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

      // dress + figure colours
      var PL = mixHex(primary, '#FFFFFF', 0.45), PLL = mixHex(primary, '#FFFFFF', 0.75);
      var PD = mixHex(primary, '#1A0828', 0.3), PO = mixHex(primary, '#1A0828', 0.62);
      var ACD = mixHex(accent, '#3A1A00', 0.45);
      var heartCol = mixHex(primary, '#FF6FAE', 0.45);
      var GEM = '#FF6FA8';
      var SKIN = '#FFE4D4', SKIN_SH = '#F6C4AE', SKIN_OL = '#B9705F';
      var HAIR = '#B9683B', HAIR_HI = '#EAA66C', HAIR_DK = '#7A3C1C', HAIR_OL = '#4C2210';
      var EYE = '#2C1838', EYE_LO = mixHex(glow, '#2C1838', 0.4);

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, DPR = 1, unit = 1, uP = 1;
      var cx = 0, cy = 0, rx = 1, ry = 1, ratio = 0.5, s = 1, rimW = 1, rimH = 1;
      var rinkC = null, RKW = 1, RKH = 1, RKX = 0, RKY = 0;
      var skC = document.createElement('canvas'), skG = skC.getContext('2d');
      var refC = document.createElement('canvas'), refG = refC.getContext('2d');
      var SKW = 1, SKH = 1, SKOX = 0, SKOY = 0;

      // static sprites
      function makeGlow(col, core) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, core || 'rgba(255,255,255,1)'); gr.addColorStop(0.2, hexA(col, 0.8));
        gr.addColorStop(0.5, hexA(col, 0.22)); gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      }
      var sprW = makeGlow('#FFE7B0', 'rgba(255,255,240,1)');
      var sprG = makeGlow(glow), sprH = makeGlow(heartCol), sprA = makeGlow(accent);
      var shadowSpr = document.createElement('canvas'); shadowSpr.width = shadowSpr.height = 64;
      (function () {
        var g = shadowSpr.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(12,26,70,.75)'); gr.addColorStop(0.55, 'rgba(12,26,70,.35)'); gr.addColorStop(1, 'rgba(12,26,70,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      })();
      function makeFlake(fancy) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'); g.translate(32, 32);
        var gr = g.createRadialGradient(0, 0, 0, 0, 0, 31);
        gr.addColorStop(0, hexA(glow, 0.4)); gr.addColorStop(1, hexA(glow, 0));
        g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
        g.strokeStyle = '#FFFFFF'; g.lineCap = 'round'; g.lineWidth = fancy ? 2.6 : 3.2;
        for (var i = 0; i < 6; i++) {
          g.save(); g.rotate(i * TAU / 6); g.beginPath();
          g.moveTo(0, 0); g.lineTo(0, -23);
          if (fancy) {
            g.moveTo(0, -9); g.lineTo(-6.5, -15.5); g.moveTo(0, -9); g.lineTo(6.5, -15.5);
            g.moveTo(0, -16); g.lineTo(-4.5, -21); g.moveTo(0, -16); g.lineTo(4.5, -21);
          }
          g.stroke();
          if (!fancy) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, -23, 3.2, 0, TAU); g.fill(); }
          g.restore();
        }
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, fancy ? 4 : 5, 0, TAU); g.fill();
        return c;
      }
      var flakeA = makeFlake(true), flakeB = makeFlake(false);

      var BULB_COLS = [accent, '#FFFFFF', glow, PL, '#FF9FD0'];
      var bulbSpr = BULB_COLS.map(function (c) { return makeGlow(c); });
      var NB = 30, bulbs = [];
      for (var bi0 = 0; bi0 < NB; bi0++) bulbs.push({ a: bi0 / NB * TAU + 0.05, c: bi0 % BULB_COLS.length, ph: rnd(0, TAU), rate: rnd(0.7, 1.4) });

      function buildRink() {
        var pad = rx * 0.2, ow = rx + rimW, oh = ry + rimW * ratio;
        RKW = 2 * (ow + pad); RKH = 2 * (oh + pad * ratio) + rimH + 4; RKX = RKW / 2; RKY = oh + pad * ratio;
        rinkC = document.createElement('canvas');
        rinkC.width = Math.max(1, Math.ceil(RKW * DPR)); rinkC.height = Math.max(1, Math.ceil(RKH * DPR));
        var g = rinkC.getContext('2d'), rng = seeded(11), i;
        g.setTransform(DPR, 0, 0, DPR, RKX * DPR, RKY * DPR);
        // soft halo of light around the rink
        g.save(); g.scale(1, ratio);
        var hg = g.createRadialGradient(0, 0, rx * 0.8, 0, 0, ow + pad);
        hg.addColorStop(0, hexA(glow, 0.34)); hg.addColorStop(0.4, hexA(glow, 0.12)); hg.addColorStop(1, hexA(glow, 0));
        g.fillStyle = hg; g.beginPath(); g.arc(0, 0, ow + pad, 0, TAU); g.fill();
        g.restore();
        // snow bank: front face, then the top of the bank
        var fg = g.createLinearGradient(0, oh - rimH, 0, oh + rimH);
        fg.addColorStop(0, '#CFE2F6'); fg.addColorStop(1, '#93B6DE');
        g.fillStyle = fg; g.beginPath(); g.ellipse(0, rimH, ow, oh, 0, 0, TAU); g.fill();
        var tg = g.createLinearGradient(0, -oh, 0, oh);
        tg.addColorStop(0, '#D6E6F7'); tg.addColorStop(1, '#F7FBFF');
        g.fillStyle = tg; g.beginPath(); g.ellipse(0, 0, ow, oh, 0, 0, TAU); g.fill();
        // the ice
        g.save(); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
        g.save(); g.scale(1, ratio);
        var ig = g.createRadialGradient(-rx * 0.08, -rx * 0.3, rx * 0.04, 0, 0, rx * 1.02);
        ig.addColorStop(0, mixHex('#9ED2F4', glow, 0.12)); ig.addColorStop(0.55, mixHex('#5E98D6', glow, 0.12));
        ig.addColorStop(1, mixHex('#2D579C', glow, 0.1));
        g.fillStyle = ig; g.fillRect(-rx, -rx, rx * 2, rx * 2);
        g.restore();
        // glossy sheen bands
        g.save(); g.rotate(-0.22);
        var sh = g.createLinearGradient(0, -ry * 0.75, 0, -ry * 0.35);
        sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.16)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sh; g.fillRect(-rx * 1.2, -ry * 0.75, rx * 2.4, ry * 0.4);
        g.restore();
        g.fillStyle = 'rgba(255,255,255,.08)';
        g.beginPath(); g.ellipse(rx * 0.42, ry * 0.32, rx * 0.3, ry * 0.07, -0.18, 0, TAU); g.fill();
        // faint old skate scratches
        g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = Math.max(0.8, rx * 0.0025);
        for (i = 0; i < 9; i++) {
          var sx = (rng() * 1.6 - 0.8) * rx, sy = (rng() * 1.4 - 0.7) * ry, sl = (0.15 + rng() * 0.25) * rx, sa = rng() * TAU;
          g.beginPath(); g.ellipse(sx, sy, sl, sl * ratio * 0.6, 0, sa, sa + 0.9 + rng()); g.stroke();
        }
        // frost glitter
        for (i = 0; i < 70; i++) {
          var ga = rng() * TAU, gr2 = Math.sqrt(rng());
          g.fillStyle = 'rgba(255,255,255,' + (0.12 + rng() * 0.35).toFixed(2) + ')';
          g.beginPath(); g.arc(Math.cos(ga) * gr2 * rx, Math.sin(ga) * gr2 * ry, 0.6 + rng() * 1.1, 0, TAU); g.fill();
        }
        // reflections of the far lights
        for (i = 0; i < bulbs.length; i++) {
          var ba = bulbs[i].a, sy2 = Math.sin(ba);
          if (sy2 > -0.25) continue;
          var bx = Math.cos(ba) * rx * 0.97, by = sy2 * ry * 0.97, rl = ry * 0.3 * (-sy2);
          var rg = g.createLinearGradient(0, by, 0, by + rl);
          rg.addColorStop(0, hexA(BULB_COLS[bulbs[i].c], 0.2)); rg.addColorStop(1, hexA(BULB_COLS[bulbs[i].c], 0));
          g.fillStyle = rg; g.fillRect(bx - rx * 0.006, by, rx * 0.012, rl);
        }
        // inner shadow under the snow bank
        g.strokeStyle = 'rgba(20,50,110,.4)'; g.lineWidth = rimW * 0.9;
        g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
        g.restore();
        // fluffy snow lumps along the bank (far ones first)
        var lumps = [];
        for (i = 0; i < 120; i++) lumps.push({ a: rng() * TAU, r: rimW * (0.32 + rng() * 0.5), o: (rng() - 0.5) * 0.5 });
        lumps.sort(function (p, q) { return Math.sin(p.a) - Math.sin(q.a); });
        for (i = 0; i < lumps.length; i++) {
          var L = lumps[i], dep = (Math.sin(L.a) + 1) / 2, rr = L.r * (0.72 + 0.28 * dep);
          var lx = Math.cos(L.a) * (rx + rimW * (0.5 + L.o)), ly = Math.sin(L.a) * (ry + rimW * ratio * (0.5 + L.o));
          g.fillStyle = '#B9D2EE'; g.beginPath(); g.ellipse(lx, ly + rr * 0.2, rr, rr * 0.78, 0, 0, TAU); g.fill();
          g.fillStyle = '#F8FCFF'; g.beginPath(); g.ellipse(lx - rr * 0.06, ly - rr * 0.1, rr * 0.9, rr * 0.64, 0, 0, TAU); g.fill();
        }
      }

      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800; uP = Math.max(unit, 0.55);
        var aspect = W / H;
        ratio = Math.max(0.47, Math.min(0.85, 0.47 + (1.33 - aspect) * 0.45));
        rx = Math.min(W * 0.46, H * 0.66);
        ry = Math.min(rx * ratio, H * 0.29); ratio = ry / rx;
        s = Math.min(H * 0.335, W * 0.44);
        rimW = rx * 0.05; rimH = rimW * 0.6;
        cx = W / 2;
        cy = Math.min(H * (aspect < 1 ? 0.62 : 0.655), H - ry - rimW * ratio - rimH - Math.max(12, H * 0.03));
        buildRink();
        var m = s * 1.16;
        SKW = m * 1.7; SKH = m * 1.5; SKOX = SKW / 2; SKOY = SKH * 0.86;
        skC.width = refC.width = Math.max(1, Math.ceil(SKW * DPR)); skC.height = refC.height = Math.max(1, Math.ceil(SKH * DPR));
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { enter: [0, 0.07], heart: [0.07, 0.28], t1: [0.28, 0.32], star: [0.32, 0.5], t2: [0.5, 0.67],
            crouch: [0.525, 0.55], air: [0.55, 0.635], land: [0.635, 0.67],
            spin: [0.68, 0.83], pose: [0.815, 0.865], burst: 0.83, txt: 0.27, turns: 4 }
        : { enter: [0, 0.11], heart: [0.11, 0.48], spin: [0.495, 0.715], pose: [0.7, 0.755], txt: 0.3, turns: 3 };
      var A0 = [-0.84, 0.36];
      var SEG = [{ w: T.enter, f: bez(A0, [-0.36, 1.0], TIP), e: lin },
                 { w: T.heart, f: polyF(HEART), e: stopEase }];
      if (isSuper) {
        SEG.push({ w: T.t1, f: bez(TIP, [0.3, 0.72], STAR0), e: easeInOut });
        SEG.push({ w: T.star, f: polyF(STAR), e: stopEase });
        SEG.push({ w: T.t2, f: bez(STAR0, [0.5, 0.55], TIP), e: easeInOut });
      }
      function posAt(f) {
        for (var i = 0; i < SEG.length; i++) {
          var sg = SEG[i];
          if (f < sg.w[1]) return sg.f(sg.e((f - sg.w[0]) / (sg.w[1] - sg.w[0])));
        }
        return TIP;
      }
      function progOf(w, f) { return f <= w[0] ? 0 : f >= w[1] ? 1 : stopEase((f - w[0]) / (w[1] - w[0])); }
      function ms(fr) { return fr * dur; }

      // snowflakes
      var flakes = [], NF = isSuper ? 34 : 24;
      for (var fi = 0; fi < NF; fi++) {
        var front = fi % 3 === 0;
        flakes.push({ x: Math.random(), y: rnd(-0.1, 1.05), sp: rnd(0.035, 0.08), sw: rnd(0.008, 0.025), ph: rnd(0, TAU),
                      rot: rnd(0, TAU), vr: rnd(-0.0015, 0.0015), size: front ? rnd(9, 15) : rnd(4, 8.5), front: front,
                      spr: fi % 2 ? flakeA : flakeB, a: front ? rnd(0.75, 0.95) : rnd(0.35, 0.65) });
      }
      // glitter spots along the trails
      var glitH = [], glitS = [];
      for (var gi = 0; gi < 22; gi++) glitH.push({ f: (gi + 0.5) / 22, ph: rnd(0, TAU), c: gi % 3 });
      for (var gj = 0; gj < 12; gj++) glitS.push({ f: (gj + 0.5) / 12, ph: rnd(0, TAU), c: gj % 3 });

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

      // ─── the skater (drawn into skG, units: 1 ≈ her height, origin = blade on the ice) ───
      function skateShape(g) {
        g.fillStyle = '#A9B5C7';
        g.beginPath(); g.moveTo(-0.034, 0.08); g.lineTo(-0.028, 0.1); g.lineTo(-0.012, 0.1); g.lineTo(-0.012, 0.08); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(0.046, 0.08); g.lineTo(0.05, 0.1); g.lineTo(0.066, 0.1); g.lineTo(0.062, 0.08); g.closePath(); g.fill();
        var bg = g.createLinearGradient(0, 0.096, 0, 0.115);
        bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(0.5, '#C9D3E0'); bg.addColorStop(1, '#8592A8');
        g.fillStyle = bg; g.strokeStyle = '#66738A'; g.lineWidth = 0.006;
        g.beginPath(); g.moveTo(-0.05, 0.099); g.lineTo(0.074, 0.099);
        g.quadraticCurveTo(0.098, 0.099, 0.102, 0.086); g.lineTo(0.109, 0.093);
        g.quadraticCurveTo(0.106, 0.115, 0.078, 0.115); g.lineTo(-0.046, 0.115);
        g.quadraticCurveTo(-0.058, 0.112, -0.05, 0.099); g.closePath(); g.fill(); g.stroke();
        var wg = g.createLinearGradient(-0.04, -0.05, 0.06, 0.09);
        wg.addColorStop(0, '#FFFFFF'); wg.addColorStop(1, '#D3DEEE');
        g.fillStyle = wg; g.strokeStyle = '#8193B1'; g.lineWidth = 0.01;
        g.beginPath(); g.moveTo(-0.036, -0.05); g.lineTo(0.031, -0.05);
        g.quadraticCurveTo(0.035, 0.0, 0.042, 0.026);
        g.quadraticCurveTo(0.085, 0.034, 0.088, 0.062); g.quadraticCurveTo(0.09, 0.084, 0.068, 0.084);
        g.lineTo(-0.034, 0.084); g.quadraticCurveTo(-0.055, 0.084, -0.052, 0.058);
        g.quadraticCurveTo(-0.046, 0.004, -0.036, -0.05); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = PL; g.strokeStyle = PO; g.lineWidth = 0.007;
        g.beginPath(); g.moveTo(-0.04, -0.054); g.lineTo(0.035, -0.054); g.lineTo(0.034, -0.032); g.lineTo(-0.039, -0.032); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = '#AFBCD1'; g.lineWidth = 0.006;
        g.beginPath();
        g.moveTo(0.014, -0.02); g.lineTo(0.034, 0.0); g.moveTo(0.034, -0.02); g.lineTo(0.014, 0.0);
        g.moveTo(0.018, 0.006); g.lineTo(0.038, 0.024); g.moveTo(0.038, 0.006); g.lineTo(0.018, 0.024);
        g.stroke();
        g.fillStyle = accent; g.strokeStyle = ACD; g.lineWidth = 0.006;
        g.beginPath(); g.arc(0.044, -0.012, 0.02, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0.038, -0.019, 0.007, 0, TAU); g.fill();
      }
      function drawTail(g, pts) {
        var n = pts.length, Lp = [], Rp = [], i;
        for (i = 0; i < n; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
          var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
          var nx = -ty / tl, ny = tx / tl, u = i / (n - 1);
          var w = 0.05 * Math.pow(Math.sin(Math.PI * (0.16 + 0.84 * u)), 0.75) + 0.006;
          Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w, nx, ny, w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
        }
        g.beginPath(); g.moveTo(Lp[0][0], Lp[0][1]);
        for (i = 1; i < n - 1; i++) g.quadraticCurveTo(Lp[i][0], Lp[i][1], (Lp[i][0] + Lp[i + 1][0]) / 2, (Lp[i][1] + Lp[i + 1][1]) / 2);
        g.lineTo(pts[n - 1][0], pts[n - 1][1]);
        for (i = n - 2; i > 0; i--) g.quadraticCurveTo(Rp[i][0], Rp[i][1], (Rp[i][0] + Rp[i - 1][0]) / 2, (Rp[i][1] + Rp[i - 1][1]) / 2);
        g.lineTo(Rp[0][0], Rp[0][1]); g.closePath();
        var tg = g.createLinearGradient(pts[0][0], pts[0][1], pts[n - 1][0], pts[n - 1][1]);
        tg.addColorStop(0, HAIR_DK); tg.addColorStop(0.35, HAIR); tg.addColorStop(1, HAIR_HI);
        g.fillStyle = tg; g.fill();
        g.strokeStyle = HAIR_OL; g.lineWidth = 0.011; g.stroke();
        // strands + a glossy highlight
        g.lineWidth = 0.007; g.strokeStyle = hexA(HAIR_DK, 0.55);
        for (var sd = -1; sd <= 1; sd += 2) {
          g.beginPath();
          for (i = 1; i < n - 1; i++) {
            var q = Lp[i], k = sd * 0.4 * q[4];
            if (i === 1) g.moveTo(pts[i][0] + q[2] * k, pts[i][1] + q[3] * k); else g.lineTo(pts[i][0] + q[2] * k, pts[i][1] + q[3] * k);
          }
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,228,195,.55)'; g.lineWidth = 0.012;
        g.beginPath();
        for (i = 1; i < Math.ceil(n * 0.6); i++) {
          var q2 = Lp[i], k2 = 0.15 * q2[4];
          if (i === 1) g.moveTo(pts[i][0] + q2[2] * k2, pts[i][1] + q2[3] * k2); else g.lineTo(pts[i][0] + q2[2] * k2, pts[i][1] + q2[3] * k2);
        }
        g.stroke();
      }
      function drawBow(g, x, y) {
        g.fillStyle = PL; g.strokeStyle = PO; g.lineWidth = 0.009;
        for (var si = -1; si <= 1; si += 2) {
          g.save(); g.translate(x, y); g.rotate(si * 0.32);
          g.beginPath(); g.ellipse(si * 0.04, 0, 0.042, 0.027, 0, 0, TAU); g.fill(); g.stroke();
          g.strokeStyle = hexA(PO, 0.5); g.beginPath(); g.moveTo(si * 0.012, 0); g.quadraticCurveTo(si * 0.04, -0.004, si * 0.064, -0.012); g.stroke();
          g.strokeStyle = PO;
          g.restore();
        }
        g.fillStyle = primary; g.beginPath(); g.arc(x, y, 0.017, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x - 0.026, y - 0.014, 0.007, 0, TAU); g.fill();
      }
      function hairline(HCy, phi) {
        var a = Math.min(1, Math.abs(phi) / 1.32);
        return HCy - 0.07 + 0.135 * Math.pow(a, 2.2) + 0.028 * Math.pow(0.5 + 0.5 * Math.cos(phi * 7.4), 2);
      }

      var handOut = [0, 0];
      // P pose, yaw (0 = facing us), tail {side, fly, whip}, tm time, blink 1 open … 0 shut
      function drawSkater(g, P, yaw, tail, tm, blink) {
        var d0 = P.cr * 0.075;
        var c = Math.cos(yaw), sn = Math.sin(yaw), yw = Math.atan2(sn, c);
        var armK = 0.45 + 0.55 * Math.abs(c);
        var HCy = -0.775 + d0;
        g.save();
        g.rotate(P.lean);
        g.lineCap = 'round'; g.lineJoin = 'round';
        function headXf() { g.translate(0, -0.56 + d0); g.rotate(P.tilt); g.translate(0, 0.56 - d0); }

        // ponytail chain (3-D-ish: yaw around the head, elevation for droop / fly-out)
        var lonA = yaw + Math.PI;
        var ax = 0.1 * Math.sin(lonA), ay = HCy - 0.176;
        var psi0 = Math.PI - 1.25 * tail.side + yaw;
        var pts = [[ax, ay]], px = ax, py = ay, zs = 0;
        for (var i = 1; i <= 9; i++) {
          var u = i / 9;
          var eRest = lerp(-1.0, 1.5, Math.pow(u, 1.1)), eFly = lerp(-0.35, 0.45, u);
          var e = lerp(eRest, eFly, tail.fly) + (u > 0.75 ? (u - 0.75) * 2.0 * (1 - tail.fly * 0.6) : 0);
          var psi = psi0 - tail.whip * 1.1 * u + Math.sin(tm * 0.009 - u * 3) * 0.12 * u;
          px += Math.sin(psi) * Math.cos(e) * 0.066; py += Math.sin(e) * 0.066;
          pts.push([px, py]);
          if (i <= 3) zs += Math.cos(psi) * Math.cos(e);
        }
        var tailFront = zs > 0.3;
        if (!tailFront) { g.save(); headXf(); drawTail(g, pts); g.restore(); }

        // legs + skates
        var hipY = -0.345 + d0;
        function leg(side, beta, pnt, toe) {
          var hx = side * 0.043, hy = hipY;
          var onIce = clamp01(1 - (beta - 0.12) / 0.3);
          var Ll = 0.238 * (1 - 0.15 * P.cr);
          var axx = hx + side * Math.sin(beta) * Ll, ayy = lerp(hy + Math.cos(beta) * Ll, -0.112, onIce);
          var dx = axx - hx, dy = ayy - hy, d = Math.sqrt(dx * dx + dy * dy) || 0.001, half = 0.119;
          if (d > 2 * half) { axx = hx + dx / d * 2 * half; ayy = hy + dy / d * 2 * half; dx = axx - hx; dy = ayy - hy; d = 2 * half; }
          var h = Math.sqrt(Math.max(0, half * half - d * d / 4));
          var nx = -dy / d, ny = dx / d;
          if (nx * side < 0) { nx = -nx; ny = -ny; }
          var kx = (hx + axx) / 2 + nx * h, ky = (hy + ayy) / 2 + ny * h;
          g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(axx, ayy);
          g.strokeStyle = SKIN_OL; g.lineWidth = 0.064; g.stroke();
          g.strokeStyle = SKIN; g.lineWidth = 0.048; g.stroke();
          var ang = Math.atan2(-(axx - kx), (ayy - ky)) * (1 - onIce);
          g.save(); g.translate(axx, ayy); g.rotate(ang); g.scale(toe, 1); g.rotate(pnt * 0.95);
          skateShape(g);
          g.restore();
        }
        leg(-1, P.lL, P.pL, P.tL);
        leg(1, P.lR, P.pR, P.tR);

        // skirt (tulle underlayer + main skirt), pleats that turn with her, sparkles
        var fl = P.fl, hw = 0.16 + fl * 0.17, hemY = -0.3 - fl * 0.075 + d0, wY = -0.468 + d0, ww = 0.066;
        var sag = 0.03 - fl * 0.012, j;
        function hemAt(x, hwx, hy0) { var r = x / hwx; return hy0 + sag * (1 - r * r); }
        function skirtPath(hwx, hy0, nS, bulge) {
          g.beginPath(); g.moveTo(-ww, wY);
          g.bezierCurveTo(-ww - 0.03 - fl * 0.05, wY + 0.05 - fl * 0.01, -hwx + 0.015, hy0 - 0.06 + fl * 0.03, -hwx, hy0);
          for (var k = 0; k < nS; k++) {
            var x0 = -hwx + 2 * hwx * k / nS, x1 = -hwx + 2 * hwx * (k + 1) / nS, xm = (x0 + x1) / 2;
            g.quadraticCurveTo(xm, hemAt(xm, hwx, hy0) + bulge, x1, hemAt(x1, hwx, hy0));
          }
          g.bezierCurveTo(hwx - 0.015, hy0 - 0.06 + fl * 0.03, ww + 0.03 + fl * 0.05, wY + 0.05 - fl * 0.01, ww, wY);
          g.closePath();
        }
        skirtPath(hw * 1.05, hemY + 0.022, 9, 0.03);
        g.fillStyle = hexA(PLL, 0.95); g.fill();
        g.strokeStyle = hexA(PO, 0.6); g.lineWidth = 0.008; g.stroke();
        skirtPath(hw, hemY, 6, 0.042);
        var sg = g.createLinearGradient(0, wY, 0, hemY + sag);
        sg.addColorStop(0, PD); sg.addColorStop(0.45, primary); sg.addColorStop(1, PL);
        g.fillStyle = sg; g.fill();
        g.strokeStyle = PO; g.lineWidth = 0.011; g.stroke();
        g.lineWidth = 0.008;
        for (j = 0; j < 7; j++) {
          var ph = yaw + j * TAU / 7, cz = Math.cos(ph);
          if (cz < 0.12) continue;
          var xs = Math.sin(ph);
          g.strokeStyle = hexA(PD, 0.55 * cz);
          g.beginPath(); g.moveTo(xs * ww * 0.85, wY + 0.014);
          g.quadraticCurveTo(xs * (ww + hw) * 0.5, (wY + hemY) / 2, xs * hw * 0.9, hemAt(xs * hw * 0.9, hw, hemY) + 0.01); g.stroke();
        }
        for (j = 0; j < 8; j++) {
          var sp2 = yaw + j * 0.81 + 0.3, cz2 = Math.cos(sp2);
          if (cz2 < 0.2) continue;
          var hh = 0.3 + (j * 0.37 % 0.6), sx = Math.sin(sp2) * lerp(ww, hw, hh) * 0.86, sy = lerp(wY, hemY, hh) + sag * hh * 0.8;
          var tw = 0.5 + 0.5 * Math.sin(tm * 0.009 + j * 1.7);
          g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * tw).toFixed(3) + ')';
          sparkPath(g, sx, sy, 0.009 + 0.01 * tw); g.fill();
        }

        // bodice, belt, heart gem
        var bY = -0.568 + d0;
        var bgd = g.createLinearGradient(0, bY, 0, wY);
        bgd.addColorStop(0, primary); bgd.addColorStop(1, PD);
        g.beginPath(); g.moveTo(-ww - 0.002, wY + 0.006);
        g.quadraticCurveTo(-0.082, wY - 0.04, -0.09, bY + 0.014);
        g.quadraticCurveTo(0, bY - 0.03, 0.09, bY + 0.014);
        g.quadraticCurveTo(0.082, wY - 0.04, ww + 0.002, wY + 0.006); g.closePath();
        g.fillStyle = bgd; g.fill(); g.strokeStyle = PO; g.lineWidth = 0.011; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.22)';
        g.beginPath(); g.ellipse(-0.045, bY + 0.05, 0.012, 0.032, 0.25, 0, TAU); g.fill();
        g.fillStyle = accent; g.strokeStyle = ACD; g.lineWidth = 0.007;
        g.beginPath(); g.moveTo(-ww - 0.006, wY - 0.013); g.lineTo(ww + 0.006, wY - 0.013);
        g.lineTo(ww + 0.006, wY + 0.011); g.lineTo(-ww - 0.006, wY + 0.011); g.closePath(); g.fill(); g.stroke();
        if (c > 0.08) {
          g.save(); g.translate(sn * ww * 0.95, wY - 0.002); g.scale(c, 1);
          heartPath(g, 0, 0, 0.026); g.fillStyle = GEM; g.fill(); g.strokeStyle = '#A8245E'; g.lineWidth = 0.006; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-0.01, -0.008, 0.006, 0, TAU); g.fill();
          g.restore();
        }

        // arms (behind the head, in front of the dress) + puff sleeves
        var shY = -0.552 + d0;
        function arm(side, a, b) {
          var sx = side * 0.086 * armK, sy = shY;
          var ex = sx + side * Math.sin(a) * 0.165 * armK, ey = sy + Math.cos(a) * 0.165;
          var hx = ex + side * Math.sin(a + b) * 0.16 * armK, hy = ey + Math.cos(a + b) * 0.16;
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy);
          g.strokeStyle = SKIN_OL; g.lineWidth = 0.06; g.stroke();
          g.strokeStyle = SKIN; g.lineWidth = 0.045; g.stroke();
          g.beginPath(); g.arc(hx, hy, 0.03, 0, TAU);
          g.fillStyle = SKIN; g.fill(); g.strokeStyle = SKIN_OL; g.lineWidth = 0.009; g.stroke();
          return [hx, hy];
        }
        arm(-1, P.aL, P.bL);
        var hR = arm(1, P.aR, P.bR);
        handOut[0] = hR[0] * Math.cos(P.lean) - hR[1] * Math.sin(P.lean);
        handOut[1] = hR[0] * Math.sin(P.lean) + hR[1] * Math.cos(P.lean);
        for (j = -1; j <= 1; j += 2) {
          g.beginPath(); g.arc(j * 0.086 * armK, shY + 0.006, 0.04, 0, TAU);
          g.fillStyle = PL; g.fill(); g.strokeStyle = PO; g.lineWidth = 0.009; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(j * 0.086 * armK - 0.012, shY - 0.008, 0.009, 0, TAU); g.fill();
        }

        // head
        g.save(); headXf();
        var hcy = HCy - 0.008;
        var hg = g.createRadialGradient(-0.07, hcy - 0.1, 0.02, 0, hcy, 0.22);
        hg.addColorStop(0, HAIR_HI); hg.addColorStop(0.55, HAIR); hg.addColorStop(1, HAIR_DK);
        g.beginPath(); g.ellipse(0, hcy, 0.2, 0.19, 0, 0, TAU);
        g.fillStyle = hg; g.fill(); g.strokeStyle = HAIR_OL; g.lineWidth = 0.013; g.stroke();
        var lo = Math.max(-1.32, -Math.PI / 2 - yw), hi = Math.min(1.32, Math.PI / 2 - yw);
        g.save();
        g.beginPath(); g.ellipse(0, hcy, 0.2, 0.19, 0, 0, TAU); g.clip();
        if (hi > lo + 0.04) {
          var M = 26, k3, phi, lam, xx, yb;
          g.beginPath();
          for (k3 = 0; k3 <= M; k3++) {
            phi = lo + (hi - lo) * k3 / M; lam = yw + phi; xx = 0.2 * Math.sin(lam); yb = hcy + 0.19 * Math.cos(lam);
            if (k3) g.lineTo(xx, Math.min(hairline(HCy, phi), yb)); else g.moveTo(xx, Math.min(hairline(HCy, phi), yb));
          }
          for (k3 = M; k3 >= 0; k3--) {
            phi = lo + (hi - lo) * k3 / M; lam = yw + phi;
            g.lineTo(0.2 * Math.sin(lam), hcy + 0.19 * Math.cos(lam));
          }
          g.closePath();
          var fg = g.createRadialGradient(0.2 * Math.sin(yw) * 0.5, HCy + 0.01, 0.02, 0.2 * Math.sin(yw) * 0.4, HCy + 0.02, 0.22);
          fg.addColorStop(0, SKIN); fg.addColorStop(0.7, SKIN); fg.addColorStop(1, SKIN_SH);
          g.fillStyle = fg; g.fill();
          // hairline shading
          g.beginPath();
          for (k3 = 0; k3 <= M; k3++) {
            phi = lo + (hi - lo) * k3 / M; lam = yw + phi;
            xx = 0.2 * Math.sin(lam); yb = Math.min(hairline(HCy, phi), hcy + 0.19 * Math.cos(lam));
            if (k3) g.lineTo(xx, yb); else g.moveTo(xx, yb);
          }
          g.strokeStyle = hexA(HAIR_DK, 0.7); g.lineWidth = 0.011; g.stroke();
          // face features on the sphere (longitude-mapped so they slide round when she spins)
          var fy = HCy + 0.028;
          for (var es = -1; es <= 1; es += 2) {
            lam = yw + es * 0.42; var cz3 = Math.cos(lam);
            if (cz3 < 0.1) continue;
            var ex2 = 0.2 * Math.sin(lam) * 0.985;
            g.save(); g.translate(ex2, fy); g.scale(cz3, 1);
            if (P.eye < 0.5) {
              var ery = 0.047 * Math.max(0.1, blink);
              var eg = g.createLinearGradient(0, -ery, 0, ery);
              eg.addColorStop(0, EYE); eg.addColorStop(0.55, EYE); eg.addColorStop(1, EYE_LO);
              g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, 0.034, ery, 0, 0, TAU); g.fill();
              if (blink > 0.45) {
                g.fillStyle = '#FFFFFF';
                g.beginPath(); g.ellipse(-0.011, -0.017 * blink, 0.013, 0.015 * blink, 0, 0, TAU); g.fill();
                g.beginPath(); g.arc(0.012, 0.018 * blink, 0.0065, 0, TAU); g.fill();
              }
              g.strokeStyle = EYE; g.lineWidth = 0.011;
              g.beginPath(); g.ellipse(0, 0, 0.036, ery + 0.002, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
              g.beginPath(); g.moveTo(es * 0.03, -ery * 0.72); g.lineTo(es * 0.05, -ery * 0.98 - 0.006); g.stroke();
            } else {
              g.strokeStyle = EYE; g.lineWidth = 0.013;
              g.beginPath(); g.arc(0, 0.016, 0.03, Math.PI + 0.45, TAU - 0.45); g.stroke();
              g.lineWidth = 0.01; g.beginPath(); g.moveTo(es * 0.027, 0.004); g.lineTo(es * 0.045, -0.008); g.stroke();
            }
            g.restore();
          }
          for (es = -1; es <= 1; es += 2) {
            lam = yw + es * 0.74; var cz4 = Math.cos(lam);
            if (cz4 < 0.1) continue;
            g.fillStyle = 'rgba(255,112,150,.42)';
            g.beginPath(); g.ellipse(0.2 * Math.sin(lam), HCy + 0.075, 0.034 * cz4, 0.019, 0, 0, TAU); g.fill();
          }
          lam = yw; var cz5 = Math.cos(lam);
          if (cz5 > 0.15) {
            var mx = 0.2 * Math.sin(lam) * 0.98, my = HCy + 0.1;
            g.save(); g.translate(mx, my); g.scale(cz5, 1);
            if (P.mo < 0.5) {
              g.strokeStyle = '#7A2A3A'; g.lineWidth = 0.011;
              g.beginPath(); g.arc(0, -0.016, 0.024, 0.4, Math.PI - 0.4); g.stroke();
            } else {
              var mo = 0.7 + 0.3 * (P.mo - 0.5) * 2;
              g.beginPath(); g.moveTo(-0.028 * mo, -0.006);
              g.quadraticCurveTo(0, -0.012, 0.028 * mo, -0.006);
              g.quadraticCurveTo(0.026 * mo, 0.036 * mo, 0, 0.038 * mo);
              g.quadraticCurveTo(-0.026 * mo, 0.036 * mo, -0.028 * mo, -0.006); g.closePath();
              g.fillStyle = '#B4325A'; g.fill(); g.strokeStyle = '#7A2A3A'; g.lineWidth = 0.008; g.stroke();
              g.fillStyle = '#FF8FAE'; g.beginPath(); g.ellipse(0, 0.024 * mo, 0.014 * mo, 0.009 * mo, 0, 0, TAU); g.fill();
            }
            g.restore();
          }
        }
        // a few hair strands + a glossy shine band
        g.strokeStyle = hexA(HAIR_DK, 0.4); g.lineWidth = 0.007;
        for (j = -2; j <= 2; j++) {
          var lj = yw + j * 0.42;
          if (Math.cos(lj) < 0.05) continue;
          g.beginPath(); g.moveTo(0.06 * Math.sin(lj), hcy - 0.18);
          g.quadraticCurveTo(0.15 * Math.sin(lj), hcy - 0.13, 0.2 * Math.sin(lj), hairline(HCy, j * 0.42) - 0.01); g.stroke();
        }
        for (j = 0; j < 12; j++) {                     // back of the head: strands gathered up to the crown
          var lb = yaw + Math.PI + (j - 5.5) * 0.24, cb = Math.cos(lb), rel = Math.atan2(Math.sin(lb - yw), Math.cos(lb - yw));
          if (cb < 0.08 || Math.abs(rel) < 1.25) continue;
          g.strokeStyle = hexA(HAIR_DK, 0.45 * Math.min(1, cb * 2));
          g.beginPath(); g.moveTo(0.1 * Math.sin(yaw + Math.PI), hcy - 0.17);
          g.quadraticCurveTo(0.17 * Math.sin(lb), hcy - 0.08, 0.19 * Math.sin(lb), hcy + 0.13 * cb); g.stroke();
        }
        g.strokeStyle = 'rgba(255,236,210,.5)'; g.lineWidth = 0.024;
        g.beginPath(); g.ellipse(0, hcy + 0.01, 0.15, 0.14, 0, -2.55, -1.85); g.stroke();
        g.restore();
        g.beginPath(); g.ellipse(0, hcy, 0.2, 0.19, 0, 0, TAU);
        g.strokeStyle = mixHex(HAIR_OL, SKIN_OL, 0.35); g.lineWidth = 0.012; g.stroke();
        if (tailFront) drawTail(g, pts);
        drawBow(g, ax, ay + 0.004);
        g.restore();
        g.restore();
      }

      // ─── particles (snow spray), pops, burst ───
      var parts = [], emitAcc = 0;
      function emit(x, y, vx, vy, vz, life, size, col) {
        if (parts.length > 260) return;
        parts.push({ x: x, y: y, z: 0, vx: vx, vy: vy, vz: vz, age: 0, life: life, size: size, col: col, rot: rnd(0, 1) });
      }
      var SPRAY_COLS = ['#FFFFFF', '#FFFFFF', glow, accent, PLL];
      function sprayBurst(x, y, n, spMin, spMax, upMin, upMax) {
        for (var i = 0; i < n; i++) {
          var a = rnd(0, TAU), sp = rnd(spMin, spMax) * uP;
          emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp * ratio, rnd(upMin, upMax) * uP, rnd(0.45, 0.85), rnd(3, 6.5) * uP, SPRAY_COLS[i % SPRAY_COLS.length]);
        }
      }
      function drawParts(front, footY) {
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if ((p.y > footY) !== front) continue;
          var q = p.age / p.life, a = (1 - q) * (q < 0.1 ? q / 0.1 : 1);
          ctx.fillStyle = hexA(p.col, a);
          if (p.rot > 0.45) { sparkPath(ctx, p.x, p.y - p.z, p.size * (1 - q * 0.4)); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size * 0.42 * (1 - q * 0.4), 0, TAU); ctx.fill(); }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      var burst = null;
      if (isSuper) {
        burst = [];
        for (var bk = 0; bk < 46; bk++) {
          burst.push({ a: bk / 46 * TAU + rnd(-0.1, 0.1), r: rnd(0.55, 1.1), rot: rnd(0, TAU), vr: rnd(-3, 3),
                       size: rnd(0.6, 1.2), flake: bk % 5 < 2, col: [accent, '#FFFFFF', glow, PL][bk % 4], swirl: rnd(1.1, 1.8) });
        }
      }

      function glowDot(spr, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function trailPath(P, prog) {
        var d = prog * P.L, i;
        ctx.beginPath(); ctx.moveTo(cx + P.p[0][0] * rx, cy + P.p[0][1] * ry);
        for (i = 1; i < P.p.length && P.c[i] <= d; i++) ctx.lineTo(cx + P.p[i][0] * rx, cy + P.p[i][1] * ry);
        if (i < P.p.length) {
          var k = (d - P.c[i - 1]) / ((P.c[i] - P.c[i - 1]) || 1);
          ctx.lineTo(cx + lerp(P.p[i - 1][0], P.p[i][0], k) * rx, cy + lerp(P.p[i - 1][1], P.p[i][1], k) * ry);
        }
      }
      function drawTrail(P, prog, col, done, glits, t, addFill) {
        if (prog <= 0) return;
        var lw = Math.max(1.3, rx * 0.0075);
        var flash = done > 0 && done < 1 ? Math.sin(Math.PI * done) : 0;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (done > 0) {                     // the finished shape lights up from inside (tints the ice)
          trailPath(P, 1); ctx.closePath();
          if (addFill) ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = hexA(col, (addFill ? 0.6 : 1) * (0.16 * easeOut(done * 2) + 0.16 * flash)); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        trailPath(P, prog);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(col, 0.12 + 0.12 * flash); ctx.lineWidth = lw * 9; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = hexA(col, 0.32 + 0.15 * flash); ctx.lineWidth = lw * 4.6; ctx.stroke();
        ctx.strokeStyle = hexA(col, 0.95); ctx.lineWidth = lw * 2.2; ctx.stroke();
        ctx.strokeStyle = hexA('#FFFFFF', 0.85 + 0.15 * flash); ctx.lineWidth = lw * 0.85; ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < glits.length; i++) {
          var G = glits[i];
          if (G.f > prog) break;
          var p = polyAt(P, G.f), tw = 0.5 + 0.5 * Math.sin(t * 0.01 + G.ph);
          ctx.fillStyle = hexA(G.c === 0 ? '#FFFFFF' : G.c === 1 ? accent : col, 0.5 + 0.5 * tw);
          sparkPath(ctx, cx + p[0] * rx, cy + p[1] * ry, lw * (1.2 + 1.6 * tw)); ctx.fill();
        }
        ctx.restore();
      }
      function arcPart(x, y, rX, rY, a0, a1, front) {
        // keep only the part of [a0,a1] that is on the near (front) or far (back) half of the ellipse
        var lo = front ? 0 : Math.PI, hi = front ? Math.PI : TAU;
        var base = Math.floor(a0 / TAU) * TAU;
        for (var k = -1; k <= 1; k++) {
          var s0 = Math.max(a0, base + k * TAU + lo), s1 = Math.min(a1, base + k * TAU + hi);
          if (s1 > s0) { ctx.beginPath(); ctx.ellipse(x, y, rX, rY, 0, s0, s1); ctx.stroke(); }
        }
      }
      function drawSpinArcs(X, Y, S, yaw, sp, front) {
        if (sp <= 0.05) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        var rings = [[0.1, 0.3], [0.4, 0.42]];
        for (var r = 0; r < rings.length; r++) {
          var R = rings[r], yy = Y - R[0] * S, rX = R[1] * S, rY = rX * 0.22;
          for (var k = 0; k < 2; k++) {
            var a0 = -yaw * 0.9 + k * Math.PI + r * 1.3;
            a0 = ((a0 % TAU) + TAU) % TAU;
            ctx.strokeStyle = hexA(k ? glow : '#FFFFFF', sp * (front ? 0.75 : 0.35));
            ctx.lineWidth = S * (front ? 0.014 : 0.01);
            arcPart(X, yy, rX, rY, a0, a0 + 1.5, front);
          }
        }
        ctx.restore();
      }

      // ─── animation state ───
      var raf = 0, killed = false, t0 = performance.now(), lastT = 0;
      var lastDir = 1, dirS = 1, tailS = 0.5, tailV = 0;
      var landed = false, popAt = -1, popX = 0, popY = 0;

      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        var dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
        var f = t / dur;
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 260);

        // ── where is she, how is she moving ──
        var pos = posAt(f), pa = posAt(f - 0.004), pb = posAt(f + 0.004);
        var vx = (pb[0] - pa[0]) * rx / (0.008 * dur), vy = (pb[1] - pa[1]) * ry / (0.008 * dur);
        var speed = Math.sqrt(vx * vx + vy * vy) * 1000;
        var vN = clamp01(speed / (s * 2.2));
        if (Math.abs(vx) * 1000 > s * 0.3) lastDir = vx > 0 ? 1 : -1;
        dirS += (lastDir - dirS) * (1 - Math.exp(-dt / 0.08));
        var k = 1 + 0.13 * pos[1], S = s * k;
        var X = cx + pos[0] * rx, Yg = cy + pos[1] * ry;

        // ── pose / yaw / jump ──
        var G = mixPose(GLIDE_L, GLIDE_R, (dirS + 1) / 2);
        var strideK = Math.sin(t * 0.0095);
        if (G.lL > G.lR) G.lL += strideK * 0.12; else G.lR += strideK * 0.12;
        G.aL += strideK * 0.08; G.aR -= strideK * 0.08;
        var pose = G, yaw = 0, jumpH = 0, spinSp = 0, ps;
        var preEnd = isSuper ? T.land[1] : T.heart[1];
        var preP = G;
        if (isSuper && f >= T.crouch[0]) {
          if (f < T.air[0]) preP = mixPose(G, CROUCH, smooth((f - T.crouch[0]) / (T.crouch[1] - T.crouch[0])));
          else if (f < T.land[0]) {
            var qa = (f - T.air[0]) / (T.air[1] - T.air[0]);
            preP = mixPose(CROUCH, AIR, smooth(qa * 4));
            yaw = 2 * TAU * easeInOut(qa); jumpH = Math.sin(Math.PI * qa) * 0.42; spinSp = Math.pow(Math.sin(Math.PI * qa), 0.6);
          } else preP = mixPose(AIR, LAND, smooth((f - T.land[0]) / (T.land[1] - T.land[0]) * 2.5));
        }
        if (f < preEnd) pose = preP;
        else {
          var from = isSuper ? LAND : G;
          var qs = clamp01((f - T.spin[0]) / (T.spin[1] - T.spin[0]));
          var wq = (f - preEnd) / (T.spin[0] - preEnd + (T.spin[1] - T.spin[0]) * 0.25);
          pose = mixPose(from, WIND, smooth(wq * 2.2));
          pose = mixPose(pose, SPIN, smooth((wq - 0.35) / 0.65));
          yaw = T.turns * TAU * easeInOut(qs);
          spinSp = Math.pow(Math.sin(Math.PI * qs), 0.6);
          pose.fl = Math.max(0.25, SPIN.fl * spinSp);
          ps = smooth((f - T.pose[0]) / (T.pose[1] - T.pose[0]));
          if (ps > 0) {
            pose = mixPose(pose, FINAL, ps);
            var settle = clamp01((f - T.pose[0]) / ((T.pose[1] - T.pose[0]) * 2.2));
            pose.cr += Math.sin(Math.PI * settle) * 0.3;
          }
        }
        var blink = 1;
        [[0.62, 0.12], [isSuper ? 0.44 : 0.4, 0.12]].forEach(function (b) {
          var q = (t - b[0] * dur) / (b[1] * 1000);
          if (q > 0 && q < 1) blink = Math.min(blink, Math.abs(Math.cos(q * Math.PI)));
        });
        var Y = Yg - jumpH * S;

        // ── ponytail spring ──
        var moving = isSuper ? f < T.t2[1] : f < T.heart[1];
        var sT = moving ? -dirS * Math.max(0.55, vN) : (f >= T.pose[0] ? -0.9 : tailS);
        var nSub = Math.max(1, Math.ceil(dt / 0.008)), hS = dt / nSub;
        for (var si = 0; si < nSub; si++) {
          var acc = 90 * (sT - tailS) - 11 * tailV;
          tailV += acc * hS; tailS += tailV * hS;
        }
        if (tailS > 1.35) { tailS = 1.35; tailV = 0; } else if (tailS < -1.35) { tailS = -1.35; tailV = 0; }
        var tailFly = Math.max(spinSp, vN * 0.5);

        // ── particles: emit + step ──
        var drawHeart = f >= T.heart[0] && f < T.heart[1], drawStar = isSuper && f >= T.star[0] && f < T.star[1];
        var rate = (drawHeart || drawStar) ? 55 : moving ? 18 : 0;
        if (spinSp > 0.05 && jumpH === 0) rate = 150 * spinSp;
        emitAcc += rate * dt;
        while (emitAcc >= 1) {
          emitAcc -= 1;
          if (spinSp > 0.05 && jumpH === 0) {
            var a2 = rnd(0, TAU), sp3 = rnd(110, 300) * uP;
            emit(X + Math.cos(a2) * S * 0.08, Yg + Math.sin(a2) * S * 0.08 * ratio, Math.cos(a2) * sp3, Math.sin(a2) * sp3 * ratio,
                 rnd(60, 220) * uP, rnd(0.45, 0.85), rnd(3, 7) * uP, SPRAY_COLS[(Math.random() * SPRAY_COLS.length) | 0]);
          } else {
            emit(X + rnd(-4, 4) * uP, Yg, -vx * 1000 * 0.12 + rnd(-40, 40) * uP, -vy * 1000 * 0.12 + rnd(-15, 15) * uP,
                 rnd(25, 80) * uP, rnd(0.3, 0.55), rnd(2.2, 4.2) * uP, (Math.random() < 0.7) ? '#FFFFFF' : glow);
          }
        }
        if (isSuper && !landed && f >= T.land[0]) { landed = true; sprayBurst(X, Yg, 26, 90, 240, 40, 160); }
        for (var pi = parts.length - 1; pi >= 0; pi--) {
          var p = parts[pi];
          p.age += dt;
          if (p.age >= p.life) { parts.splice(pi, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 420 * uP * dt;
          if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.92; p.vy *= 0.92; }
          p.vx *= 0.985; p.vy *= 0.985;
        }

        // ── render her into the sprite ──
        skG.setTransform(1, 0, 0, 1, 0, 0); skG.clearRect(0, 0, skC.width, skC.height);
        skG.setTransform(DPR * S, 0, 0, DPR * S, SKOX * DPR, SKOY * DPR);
        drawSkater(skG, pose, yaw, { side: tailS, fly: tailFly, whip: spinSp }, t, blink);

        // ── scene ──
        var i;
        for (i = 0; i < flakes.length; i++) {          // far snow
          var fk = flakes[i];
          if (fk.front) continue;
          drawFlake(fk, t, appear);
        }
        if (isSuper) {                                  // soft spotlight that follows her
          var sa = smooth((f - 0.02) / 0.1);
          var topX = cx + (X - cx) * 0.3, topY = -H * 0.06, pR = S * 0.5, pRy = pR * ratio * 0.95;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var lg = ctx.createLinearGradient(0, topY, 0, Yg);
          lg.addColorStop(0, hexA('#FFF6E0', 0)); lg.addColorStop(0.4, hexA(glow, 0.05 * sa)); lg.addColorStop(1, hexA('#FFF6E0', 0.15 * sa));
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.moveTo(topX - S * 0.07, topY); ctx.lineTo(topX + S * 0.07, topY); ctx.lineTo(X + pR, Yg);
          ctx.ellipse(X, Yg, pR, pRy, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = appear;
        ctx.drawImage(rinkC, cx - RKX, cy - RKY, RKW, RKH);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter';       // twinkling string lights on the snow bank
        for (i = 0; i < bulbs.length; i++) {
          var b = bulbs[i], ba = b.a, dep = (Math.sin(ba) + 1) / 2;
          var bx = cx + Math.cos(ba) * (rx + rimW * 0.5), by = cy + Math.sin(ba) * (ry + rimW * ratio * 0.5) - rimW * 0.42;
          var chase = Math.pow(0.5 + 0.5 * Math.cos(ba * 3 - t * 0.006), 8);
          var tw = clamp01(0.45 + 0.3 * Math.sin(t * 0.005 * b.rate + b.ph) + 0.5 * chase);
          var br = (2.4 + 2.2 * dep) * uP;
          glowDot(bulbSpr[b.c], bx, by, br * 5, tw * appear);
          ctx.fillStyle = hexA('#FFFFFF', (0.5 + 0.5 * tw) * appear);
          ctx.beginPath(); ctx.arc(bx, by, br * 0.6, 0, TAU); ctx.fill();
        }
        // pool of light around her on the ice
        var poolA = (isSuper ? 0.55 * smooth((f - 0.02) / 0.1) : 0.3) * appear;
        glowDot(sprG, X, Yg, S * 0.62, poolA * 0.5);
        ctx.save(); ctx.translate(X, Yg); ctx.scale(1, ratio * 0.9);
        glowDot(isSuper ? sprW : sprG, 0, 0, S * 0.55, poolA);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        // her reflection in the ice
        ctx.save();
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
        refG.globalCompositeOperation = 'source-over';
        refG.clearRect(0, 0, refC.width, refC.height);
        refG.drawImage(skC, 0, 0);
        refG.globalCompositeOperation = 'destination-in';
        var rmk = refG.createLinearGradient(0, (SKOY - S * 0.8) * DPR, 0, SKOY * DPR);
        rmk.addColorStop(0, 'rgba(0,0,0,0)'); rmk.addColorStop(1, 'rgba(0,0,0,1)');
        refG.fillStyle = rmk; refG.fillRect(0, 0, refC.width, refC.height);
        ctx.translate(X, Yg + jumpH * S * 0.55); ctx.scale(1, -0.55);
        ctx.globalAlpha = 0.24 * appear;
        ctx.drawImage(refC, -SKOX, -SKOY, SKW, SKH);
        ctx.restore();
        // the glowing trails
        var hProg = progOf(T.heart, f), hDone = clamp01((f - T.heart[1]) / 0.12);
        drawTrail(HEART, hProg, heartCol, hDone, glitH, t);
        if (isSuper) drawTrail(STAR, progOf(T.star, f), accent, clamp01((f - T.star[1]) / 0.12), glitS, t, true);
        if (drawHeart || drawStar) {                    // the bright point where the blade carves
          ctx.globalCompositeOperation = 'lighter';
          glowDot(drawStar ? sprA : sprH, X, Yg, S * 0.16, 0.9);
          glowDot(sprW, X, Yg, S * 0.07, 1);
          ctx.globalCompositeOperation = 'source-over';
        }
        // shadow (shrinks while she is up in the air)
        var shK = clamp01(1 - jumpH / 0.45), shR = S * 0.2 * (0.5 + 0.5 * shK);
        ctx.globalAlpha = (0.25 + 0.4 * shK) * appear;
        ctx.drawImage(shadowSpr, X - shR, Yg - shR * ratio * 0.85, shR * 2, shR * ratio * 1.7);
        ctx.globalAlpha = 1;
        drawSpinArcs(X, Y, S, yaw, spinSp, false);
        drawParts(false, Yg);
        // soft halo so she pops off the dark backdrop (+ the super burst flash), then the skater herself
        ctx.globalCompositeOperation = 'lighter';
        glowDot(sprG, X, Y - S * 0.55, S * 0.75, 0.18 * appear);
        if (burst) {
          var bq0 = (t - ms(T.burst)) / 900;
          if (bq0 > 0 && bq0 < 0.5) glowDot(sprW, X, Y - S * 0.55, S * (0.5 + bq0 * 1.6), 0.9 * (1 - bq0 * 2));
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = appear;
        ctx.drawImage(skC, X - SKOX, Y - SKOY, SKW, SKH);
        ctx.globalAlpha = 1;
        drawSpinArcs(X, Y, S, yaw, spinSp, true);
        drawParts(true, Yg);

        // the raised hand twinkles in the final pose
        var hx = X + handOut[0] * S, hy = Y + handOut[1] * S;
        if (ps > 0.5) {
          if (popAt < 0) { popAt = t; popX = hx; popY = hy; }
          var gq = clamp01((ps - 0.5) * 2), pulse = 0.85 + 0.15 * Math.sin(t * 0.012);
          ctx.globalCompositeOperation = 'lighter';
          var gx = hx + (hx - X) * 0.06, gy = hy - S * 0.045;
          glowDot(sprW, gx, gy, S * 0.11 * gq * pulse, 0.75);
          ctx.fillStyle = hexA('#FFFFFF', gq);
          ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.002);
          sparkPath(ctx, 0, 0, S * 0.06 * gq * pulse); ctx.fill();
          ctx.restore();
          var pq = (t - popAt) / 650;
          if (pq > 0 && pq < 1) {
            for (var pk = 0; pk < 10; pk++) {
              var pa2 = pk / 10 * TAU + 0.3, pr = S * (0.08 + easeOut(pq) * 0.32);
              ctx.fillStyle = hexA(pk % 3 === 0 ? accent : pk % 3 === 1 ? '#FFFFFF' : heartCol, 1 - pq);
              sparkPath(ctx, popX + Math.cos(pa2) * pr, popY + Math.sin(pa2) * pr, S * 0.03 * (1 - pq * 0.5)); ctx.fill();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        // super: a swirl of snowflakes + sparkles bursts out around her
        if (burst) {
          var bq = (t - ms(T.burst)) / 900;
          if (bq > 0 && bq < 1.4) {
            var bcx = X, bcy = Y - S * 0.55, R = S * 1.45, eb = easeOut(Math.min(bq, 1)), fa = clamp01(1.4 - bq) / 0.4;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            for (i = 0; i < burst.length; i++) {
              var Bp = burst[i], ang = Bp.a + Bp.swirl * eb, rr = R * Bp.r * eb;
              var bx2 = bcx + Math.cos(ang) * rr, by2 = bcy + Math.sin(ang) * rr * 0.8, al = Math.min(1, fa) * (bq < 0.08 ? bq / 0.08 : 1);
              if (Bp.flake) {
                var fs = S * 0.075 * Bp.size;
                ctx.globalAlpha = al;
                ctx.save(); ctx.translate(bx2, by2); ctx.rotate(Bp.rot + Bp.vr * bq);
                ctx.drawImage(flakeA, -fs, -fs, fs * 2, fs * 2); ctx.restore();
                ctx.globalAlpha = 1;
              } else {
                ctx.fillStyle = hexA(Bp.col, al);
                sparkPath(ctx, bx2, by2, S * 0.035 * Bp.size * (1 - 0.3 * eb)); ctx.fill();
              }
            }
            ctx.restore();
          }
        }
        for (i = 0; i < flakes.length; i++) if (flakes[i].front) drawFlake(flakes[i], t, appear);

        // ── text ──
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
      function drawFlake(fk, t, appear) {
        var y = ((fk.y + fk.sp * t / 1000 + 0.1) % 1.2) - 0.1;
        var x = fk.x * W + Math.sin(t * 0.0011 + fk.ph) * fk.sw * W;
        var sz = fk.size * Math.max(uP, 0.7);
        ctx.globalAlpha = fk.a * appear;
        ctx.save(); ctx.translate(x, y * H); ctx.rotate(fk.rot + fk.vr * t);
        ctx.drawImage(fk.spr, -sz, -sz, sz * 2, sz * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
        parts.length = 0; rinkC = null; skC = null; skG = null; refC = null; refG = null;
      };
    }
  });
})();
