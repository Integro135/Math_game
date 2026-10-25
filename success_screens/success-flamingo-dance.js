/* success-flamingo-dance.js — מסך הצלחה: פְלָמִינְגוֹ רוֹקֶדֶת 🦩
   פלמינגו ורודה (מבט צד, עין אחת) עומדת על רגל אחת בבריכה קטנה לאור הירח;
   אדוות מתפשטות, והיא רוקדת בחן — מנענעת את הראש, פורשת כנף שמראה נוצות ורודות
   רכות עם קצוות שחורים, ומסתובבת סיבוב מלא על רגל אחת; טיפות מים מנצנצות
   ופרחי לוטוס נפתחים על המים.
   בסופר: להקה של שלוש פלמינגו רוקדות יחד בסנכרון, טבעת טיפות נוצצות, לבבות.
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
    var r = Math.round(r1 + (r2 - r1) * t) & 255, g = Math.round(g1 + (g2 - g1) * t) & 255, b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  var PINK = '#FF8FB5', PINK_L = '#FFC4D8', PINK_D = '#EC6496', LEG = '#F07AA2', LEG_D = '#C9557E', INK = '#2A1626';

  window.SUCCESS.styles.push({
    name: 'flamingo-dance',
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
      var praise  = opts.praise || 'רָקַדְתְּ נֶהְדָּר!';
      var WATER = mixHex(glow, '#3D6FB8', 0.55);

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

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { bob: [0.08, 0.3], wingOpen: [0.28, 0.37], twirl: [0.45, 0.6], wingClose: [0.84, 0.92], bob2: [0.64, 0.82], lotus: [0.12, 0.5] }
        : { bob: [0.1, 0.34], wingOpen: [0.32, 0.42], twirl: [0.53, 0.72], wingClose: [0.84, 0.94], bob2: null, lotus: [0.16, 0.5] };

      // ─── scene content ───
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 34 : 26); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      // lotus flowers on lily pads, in pond-ellipse coords (u,v)
      var lotusSpots = isSuper
        ? [[-0.8, 0.1], [0.78, 0.18], [-0.38, 0.62], [0.42, 0.66], [0.02, 0.86]]
        : [[-0.66, 0.12], [0.64, 0.24], [-0.3, 0.62], [0.36, 0.68]];
      var lotuses = lotusSpots.map(function (s, i) {
        var n = lotusSpots.length;
        return { u: s[0], v: s[1], at: lerp(T.lotus[0], T.lotus[1], i / Math.max(1, n - 1)) + rnd(-0.02, 0.02), ph: rnd(0, TAU),
                 notch: rnd(0, TAU), tint: i % 2 ? '#FF7FB0' : mixHex('#FF7FB0', primary, 0.35) };
      });
      // ripple rings from the foot
      var ripples = isSuper ? [0.02, 0.2, 0.38, 0.6, 0.62, 0.78] : [0.03, 0.26, 0.5, 0.72, 0.74];
      // splash droplets (time in seconds from their burst)
      var drops = [];
      function addDrops(at, n, power) {
        for (var i = 0; i < n; i++) drops.push({ at: at, vx: rnd(-1, 1) * 1.6 * power, vy: -rnd(2.2, 3.8) * power, r: rnd(0.035, 0.07), ph: rnd(0, TAU), who: i % 3 });
      }
      addDrops(T.twirl[0], isSuper ? 10 : 12, 1);
      addDrops(T.twirl[1], isSuper ? 12 : 16, 1.15);
      // super: ring of sparkling droplets + hearts
      var ring = [], hearts = [];
      if (isSuper) {
        for (var ri = 0; ri < 30; ri++) ring.push({ a: ri / 30 * TAU, h: rnd(1.6, 2.4), ph: rnd(0, TAU), col: ['#FFFFFF', '#BFE6FF', accent, '#FFC4D8'][ri % 4] });
        for (var hh = 0; hh < 16; hh++) hearts.push({ at: rnd(0.5, 0.82), x: rnd(0.1, 0.9), sp: rnd(0.22, 0.32), r: rnd(11, 20), ph: rnd(0, TAU), col: ['#FF7FB0', primary, '#FFD1E3', '#FF5E8E', '#FFB3D1'][hh % 5] });
      }
      var glints = [];
      for (var gi = 0; gi < 14; gi++) glints.push({ u: rnd(-0.85, 0.85), v: rnd(-0.6, 0.85), ph: rnd(0, TAU), rate: rnd(3, 6) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FF7FB0', 0.95) + ',0 0 46px ' + hexA(primary, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (isSuper ? 0.22 : 0.3);
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

      // ─── flamingo (unit space: F = 1, foot at origin, facing right, y up = negative) ───
      function featherPath(len, wid) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.3, -wid, len * 0.8, -wid, len, -wid * 0.3);
        ctx.quadraticCurveTo(len * 1.05, wid * 0.15, len * 0.9, wid * 0.5);
        ctx.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.3, wid * 0.85, 0, 0); ctx.closePath();
      }
      function feather(len, wid, c0, c1, blackFrom) {
        var g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, c0); g.addColorStop(blackFrom ? blackFrom - 0.1 : 1, c1);
        if (blackFrom) { g.addColorStop(blackFrom, '#6A3352'); g.addColorStop(Math.min(1, blackFrom + 0.12), '#2A1522'); g.addColorStop(1, '#3A1A2E'); }
        ctx.fillStyle = g; featherPath(len, wid); ctx.fill();
        ctx.strokeStyle = 'rgba(205,70,120,.35)'; ctx.lineWidth = 0.014; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,235,245,.4)'; ctx.lineWidth = 0.012;
        ctx.beginPath(); ctx.moveTo(len * 0.06, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.12, len * 0.82, 0); ctx.stroke();
      }
      function webFoot(x, y, ang, s) {
        // three forward toes joined by scalloped webbing, little claws
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
        ctx.fillStyle = LEG;
        ctx.beginPath(); ctx.moveTo(-0.03, -0.035);
        ctx.lineTo(0.3, -0.05); ctx.quadraticCurveTo(0.24, 0.0, 0.29, 0.04);
        ctx.quadraticCurveTo(0.22, 0.05, 0.25, 0.1); ctx.quadraticCurveTo(0.14, 0.06, 0.05, 0.05);
        ctx.quadraticCurveTo(-0.04, 0.04, -0.03, -0.035); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = LEG_D; ctx.lineWidth = 0.022;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0.3, -0.05);
        ctx.moveTo(0, 0); ctx.lineTo(0.29, 0.04);
        ctx.moveTo(0, 0); ctx.lineTo(0.25, 0.1); ctx.stroke();
        ctx.fillStyle = INK;
        [[0.31, -0.05], [0.3, 0.04], [0.26, 0.1]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], 0.014, 0, TAU); ctx.fill(); });
        ctx.restore();
      }
      function legSeg(x0, y0, x1, y1, w) {
        ctx.strokeStyle = LEG_D; ctx.lineWidth = w + 0.025;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = LEG; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      function knee(x, y, r) {
        ctx.fillStyle = LEG_D; ctx.beginPath(); ctx.arc(x, y, r + 0.012, 0, TAU); ctx.fill();
        ctx.fillStyle = LEG; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      function bodyPath() {
        ctx.beginPath();
        ctx.moveTo(0.52, -2.64);
        ctx.bezierCurveTo(0.22, -2.88, -0.45, -2.8, -0.84, -2.46);
        ctx.bezierCurveTo(-0.62, -2.28, -0.4, -2.02, 0.05, -2.0);
        ctx.bezierCurveTo(0.45, -1.98, 0.7, -2.2, 0.68, -2.42);
        ctx.bezierCurveTo(0.67, -2.53, 0.6, -2.62, 0.52, -2.64);
        ctx.closePath();
      }
      function drawFlamingo(x, y, F, st, alpha, mirrorY) {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(x, y);
        if (mirrorY) ctx.scale(1, -0.82);
        ctx.rotate(st.sway);
        ctx.translate(0, -st.lift * F);
        ctx.scale(F * st.sx, F);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // standing leg: hip → backward-bending joint → webbed foot on the water
        legSeg(0.06, -2.05, 0.0, -1.0, 0.07);
        legSeg(0.0, -1.0, 0.03, -0.03, 0.065);
        knee(0.0, -1.0, 0.058);
        webFoot(0.0, -0.01, 0.0, 1);
        // tucked leg: thigh down-back, joint points back, shin folds forward-up, foot curled
        var tk = st.tuck;
        var jx = -0.46 + 0.1 * tk, jy = -1.58;
        legSeg(-0.05, -2.05, jx, jy, 0.065);
        legSeg(jx, jy, -0.04, -1.86, 0.06);
        knee(jx, jy, 0.055);
        webFoot(-0.04, -1.86, 0.9, 0.7);

        // tail feathers
        ctx.save(); ctx.translate(-0.78, -2.45);
        [[-2.75, 0.34], [-2.95, 0.3], [-2.55, 0.28]].forEach(function (f) { ctx.save(); ctx.rotate(f[0]); feather(f[1], 0.065, PINK_D, '#D94C80', 0); ctx.restore(); });
        ctx.restore();
        // body with soft gradient + highlight
        var bg = ctx.createLinearGradient(0, -2.85, 0, -1.98);
        bg.addColorStop(0, PINK_L); bg.addColorStop(0.45, PINK); bg.addColorStop(1, PINK_D);
        ctx.fillStyle = bg; bodyPath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.ellipse(0.1, -2.6, 0.38, 0.1, -0.12, 0, TAU); ctx.fill();
        // feather scallops on the breast
        ctx.strokeStyle = 'rgba(255,230,240,.5)'; ctx.lineWidth = 0.02;
        for (var sc = 0; sc < 3; sc++) { ctx.beginPath(); ctx.arc(0.5 - sc * 0.05, -2.36 + sc * 0.1, 0.07, 0.3, 2.4); ctx.stroke(); }

        // wing: folded on the body, or opened into a fan with black-edged flight feathers
        var wo = st.wing;
        if (wo < 0.2) {
          ctx.save(); ctx.globalAlpha *= 1 - wo * 5;
          ctx.beginPath();
          ctx.moveTo(0.42, -2.56);
          ctx.bezierCurveTo(0.15, -2.76, -0.5, -2.68, -0.92, -2.5);
          ctx.bezierCurveTo(-0.55, -2.32, 0.05, -2.28, 0.42, -2.56); ctx.closePath();
          var wg = ctx.createLinearGradient(0.42, 0, -0.92, 0);
          wg.addColorStop(0, '#FFA9C6'); wg.addColorStop(0.62, '#F57AA6'); wg.addColorStop(0.72, '#3A2232'); wg.addColorStop(1, '#170D16');
          ctx.fillStyle = wg; ctx.fill();
          ctx.strokeStyle = 'rgba(255,225,238,.55)'; ctx.lineWidth = 0.018;
          for (var ws = 0; ws < 3; ws++) { ctx.beginPath(); ctx.arc(0.12 - ws * 0.2, -2.58, 0.1, 0.2, 2.2); ctx.stroke(); }
          ctx.restore();
        }
        if (wo > 0) {
          ctx.save(); ctx.globalAlpha *= clamp01(wo * 5);
          ctx.translate(0.22, -2.6);
          var flap = st.flap;
          var foldA = Math.PI + 0.14;
          for (var k = 0; k < 8; k++) {             // primaries (long, black tips)
            var oa = -Math.PI + 0.3 + k * 0.22 + flap * (0.4 + k * 0.05);
            ctx.save(); ctx.rotate(lerp(foldA, oa, wo));
            feather(lerp(0.9, 1.12 - Math.abs(k - 4) * 0.04, wo), 0.21, '#FFA6C4', '#FF7DA8', 0.74);
            ctx.restore();
          }
          for (var c = 0; c < 7; c++) {              // coverts (soft, lighter)
            var ca = -Math.PI + 0.36 + c * 0.25 + flap * (0.35 + c * 0.05);
            ctx.save(); ctx.rotate(lerp(foldA, ca, wo));
            feather(lerp(0.6, 0.68, wo), 0.22, '#FFD9E6', '#FF9DBF', 0);
            ctx.restore();
          }
          for (var c2 = 0; c2 < 5; c2++) {           // little shoulder feathers
            var ca2 = -Math.PI + 0.55 + c2 * 0.32 + flap * 0.4;
            ctx.save(); ctx.rotate(lerp(foldA, ca2, wo));
            feather(0.36, 0.17, '#FFEAF2', '#FFBCD3', 0);
            ctx.restore();
          }
          ctx.fillStyle = '#FFB5CE'; ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, TAU); ctx.fill();
          ctx.restore();
        }

        // S-curved neck to the head
        var hx = 0.46 + st.bobX, hy = -3.98 + st.bobY;
        var ng = ctx.createLinearGradient(0, -2.6, 0, -4.0);
        ng.addColorStop(0, PINK); ng.addColorStop(1, PINK_L);
        ctx.strokeStyle = PINK_D; ctx.lineWidth = 0.2;
        ctx.beginPath(); ctx.moveTo(0.5, -2.56);
        ctx.bezierCurveTo(0.95, -2.98, -0.08 + st.bobX * 0.5, -3.38, hx - 0.06, hy + 0.1); ctx.stroke();
        ctx.strokeStyle = ng; ctx.lineWidth = 0.17;
        ctx.beginPath(); ctx.moveTo(0.5, -2.56);
        ctx.bezierCurveTo(0.95, -2.98, -0.08 + st.bobX * 0.5, -3.38, hx - 0.06, hy + 0.1); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(0.62, -2.74);
        ctx.bezierCurveTo(0.9, -3.0, 0.0 + st.bobX * 0.5, -3.36, hx - 0.0, hy + 0.0); ctx.stroke();
        // blend the neck base into the chest
        ctx.save(); bodyPath(); ctx.clip();
        ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0.5, -2.46, 0.2, 0.2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,240,.5)'; ctx.lineWidth = 0.02;
        for (var sc2 = 0; sc2 < 3; sc2++) { ctx.beginPath(); ctx.arc(0.5 - sc2 * 0.05, -2.36 + sc2 * 0.1, 0.07, 0.3, 2.4); ctx.stroke(); }
        ctx.restore();

        // head (one eye — true side view), blush, curved flamingo beak
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(st.tilt);
        var hg = ctx.createRadialGradient(-0.05, -0.08, 0.02, 0, 0, 0.22);
        hg.addColorStop(0, '#FFE0EB'); hg.addColorStop(1, PINK);
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, 0.2, 0, TAU); ctx.fill();
        // beak
        ctx.beginPath();
        ctx.moveTo(0.13, -0.11);
        ctx.quadraticCurveTo(0.32, -0.14, 0.41, -0.03);
        ctx.quadraticCurveTo(0.47, 0.06, 0.42, 0.22);
        ctx.quadraticCurveTo(0.36, 0.1, 0.28, 0.07);
        ctx.quadraticCurveTo(0.2, 0.06, 0.14, 0.07);
        ctx.quadraticCurveTo(0.08, -0.02, 0.13, -0.11); ctx.closePath();
        ctx.save(); ctx.clip();
        var bkg = ctx.createLinearGradient(0.12, 0, 0.45, 0);
        bkg.addColorStop(0, '#FFF1F4'); bkg.addColorStop(0.55, '#FFD9E3'); bkg.addColorStop(0.62, '#2F1D2A'); bkg.addColorStop(1, '#130A12');
        ctx.fillStyle = bkg; ctx.fillRect(0.05, -0.2, 0.45, 0.45);
        ctx.restore();
        ctx.strokeStyle = 'rgba(80,30,55,.55)'; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.moveTo(0.13, 0.01); ctx.quadraticCurveTo(0.3, 0.0, 0.38, 0.1); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.ellipse(0.24, -0.09, 0.07, 0.016, -0.08, 0, TAU); ctx.fill();
        // eye
        var ex = 0.03, ey = -0.05;
        if (st.happy > 0.5) {
          ctx.strokeStyle = INK; ctx.lineWidth = 0.028;
          ctx.beginPath(); ctx.arc(ex, ey + 0.03, 0.05, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
        } else {
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, ey, 0.062, 0.07, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + 0.012, ey + 0.005, 0.045, 0.055, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(ex + 0.028, ey - 0.02, 0.017, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(ex - 0.004, ey + 0.025, 0.008, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.moveTo(ex - 0.045, ey - 0.05); ctx.lineTo(ex - 0.08, ey - 0.085); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex - 0.06, ey - 0.025); ctx.lineTo(ex - 0.1, ey - 0.045); ctx.stroke();
        ctx.fillStyle = 'rgba(255,95,150,.5)';
        ctx.beginPath(); ctx.ellipse(-0.02, 0.09, 0.065, 0.035, 0, 0, TAU); ctx.fill();
        // tiny crest feather
        ctx.strokeStyle = PINK_D; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(-0.08, -0.17); ctx.quadraticCurveTo(-0.16, -0.27, -0.06, -0.3); ctx.stroke();
        ctx.restore();
        ctx.restore();
      }

      function dancePose(p, t, lag) {
        p -= lag || 0;
        var st = { sx: 1, lift: 0, sway: Math.sin(t * 0.0026) * 0.025, bobX: 0, bobY: 0, tilt: 0, wing: 0, flap: 0, happy: 0, tuck: 0 };
        function bobAt(r) {
          if (!r) return;
          var q = (p - r[0]) / (r[1] - r[0]);
          if (q <= 0 || q >= 1) return;
          var env = Math.sin(Math.PI * q), ph = q * TAU * 2;
          st.bobX += Math.sin(ph) * 0.12 * env;
          st.bobY += -Math.abs(Math.sin(ph)) * 0.08 * env;
          st.tilt += Math.sin(ph) * 0.2 * env;
          st.sway += Math.sin(ph) * 0.04 * env;
        }
        bobAt(T.bob); bobAt(T.bob2);
        var open = easeOutBack(clamp01((p - T.wingOpen[0]) / (T.wingOpen[1] - T.wingOpen[0])));
        var close = easeInOut(clamp01((p - T.wingClose[0]) / (T.wingClose[1] - T.wingClose[0])));
        st.wing = Math.max(0, open * (1 - close));
        if (st.wing > 0.6) st.flap = Math.sin(t * 0.012) * 0.06 * Math.min(1, st.wing);
        if (st.wing > 0.5 && close < 0.5) { st.tilt -= 0.12; st.bobY -= 0.05; st.happy = 1; }
        var tq = (p - T.twirl[0]) / (T.twirl[1] - T.twirl[0]);
        if (tq > 0 && tq < 1) {
          var e = easeInOut(tq);
          var c = Math.cos(e * TAU);
          st.sx = (c < 0 ? -1 : 1) * Math.max(Math.abs(c), 0.1);
          st.lift = Math.sin(Math.PI * tq) * 0.3;
          st.tuck = Math.sin(Math.PI * tq);
          st.happy = 1;
        }
        return st;
      }

      // ─── scene pieces ───
      function lilyPad(x, y, r, notch) {
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.36);
        var g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#6FCF8F'); g.addColorStop(1, '#2F8A5C');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, notch + 0.28, notch + TAU - 0.28); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(190,255,210,.35)'; ctx.lineWidth = r * 0.05;
        for (var v = 0; v < 5; v++) { var a = notch + 0.9 + v * 1.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.stroke(); }
        ctx.restore();
      }
      function lotus(x, y, s, o, tint, t, ph) {
        // o: 0 closed bud → 1 open; petals pivot at the base
        var bob = Math.sin(t * 0.003 + ph) * s * 0.04;
        ctx.save(); ctx.translate(x, y + bob);
        if (o > 0.2) {
          var hg = ctx.createRadialGradient(0, -s * 0.4, 0, 0, -s * 0.4, s * 1.6);
          hg.addColorStop(0, hexA('#FF9CC4', 0.32 * o)); hg.addColorStop(1, hexA('#FF9CC4', 0));
          ctx.fillStyle = hg; ctx.fillRect(-s * 1.6, -s * 2, s * 3.2, s * 3.2);
        }
        function petal(ang, len, wid, light) {
          ctx.save(); ctx.rotate(ang);
          var g = ctx.createLinearGradient(0, 0, len, 0);
          g.addColorStop(0, light ? '#FFF2F7' : '#FFE0EC'); g.addColorStop(0.55, mixHex(tint, '#FFFFFF', light ? 0.45 : 0.3)); g.addColorStop(1, tint);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
          ctx.quadraticCurveTo(len * 0.45, wid, 0, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(0.6, len * 0.03);
          ctx.beginPath(); ctx.moveTo(len * 0.12, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
          ctx.restore();
        }
        var up = -Math.PI / 2;
        for (var i = 0; i < 5; i++) petal(up + (i - 2) * lerp(0.1, 0.5, o), s * lerp(0.85, 1.0, o), s * 0.3, false);
        if (o > 0.25) {
          ctx.fillStyle = hexA('#FFD84D', clamp01((o - 0.25) * 3));
          ctx.beginPath(); ctx.ellipse(0, -s * 0.22, s * 0.22, s * 0.1, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = hexA('#FFF4B0', clamp01((o - 0.25) * 3));
          for (var d = 0; d < 5; d++) { ctx.beginPath(); ctx.arc((d - 2) * s * 0.07, -s * 0.27, s * 0.025, 0, TAU); ctx.fill(); }
        }
        for (var j = 0; j < 4; j++) petal(up + (j - 1.5) * lerp(0.12, 0.62, o), s * lerp(0.8, 0.82, o), s * 0.28, true);
        ctx.restore();
      }
      function reeds(x, y, s, side, t) {
        ctx.save(); ctx.translate(x, y);
        for (var i = 0; i < 5; i++) {
          var bx = side * i * s * 0.12, hgt = s * (1.1 + (i % 3) * 0.35), lean = side * (0.1 + i * 0.05) + Math.sin(t * 0.002 + i) * 0.04;
          ctx.strokeStyle = i % 2 ? '#2E7A5E' : '#3E9473'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx, 0); ctx.quadraticCurveTo(bx + lean * hgt * 0.3, -hgt * 0.55, bx + lean * hgt, -hgt); ctx.stroke();
          if (i === 1 || i === 3) {
            ctx.fillStyle = '#8A5A3C';
            ctx.save(); ctx.translate(bx + lean * hgt * 0.92, -hgt * 0.92); ctx.rotate(lean);
            ctx.beginPath(); ctx.ellipse(0, 0, s * 0.055, s * 0.16, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,220,180,.3)'; ctx.beginPath(); ctx.ellipse(-s * 0.018, -s * 0.03, s * 0.016, s * 0.1, 0, 0, TAU); ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        var port = W < H * 0.9;

        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.7 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        var intro = easeOut(clamp01(p / 0.12));

        // layout
        var F = isSuper ? Math.min(H * 0.11, W * (port ? 0.135 : 0.13)) : Math.min(H * 0.12, W * (port ? 0.21 : 0.17));
        var footY = H * (port ? 0.72 : 0.8);
        var prx = isSuper ? Math.min(W * 0.47, H * 0.75) : Math.min(W * (port ? 0.46 : 0.42), H * 0.56);
        var pry = prx * (port ? 0.3 : 0.2);
        var pcx = W * 0.5, pcy = footY + pry * 0.2;

        // moon + glow
        var mx = W * (port ? 0.82 : 0.84), my = H * (port ? 0.22 : 0.25), mr = Math.min(W, H) * (port ? 0.06 : 0.055);
        ctx.save(); ctx.globalAlpha *= intro;
        var mg = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
        mg.addColorStop(0, 'rgba(255,240,200,.35)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = mg; ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
        var mf = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
        mf.addColorStop(0, '#FFFBEA'); mf.addColorStop(1, '#F3DFA8');
        ctx.fillStyle = mf; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(214,190,140,.35)';
        [[0.3, -0.2, 0.18], [-0.25, 0.25, 0.13], [0.15, 0.4, 0.09]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, TAU); ctx.fill(); });
        ctx.restore();

        // pond (soft-edged ellipse of moonlit water)
        ctx.save();
        ctx.translate(pcx, pcy); ctx.scale(intro, intro * pry / prx);
        var pg = ctx.createRadialGradient(0, 0, 0, 0, 0, prx);
        pg.addColorStop(0, hexA(mixHex(WATER, '#FFFFFF', 0.15), 0.6)); pg.addColorStop(0.65, hexA(WATER, 0.42));
        pg.addColorStop(0.92, hexA(WATER, 0.2)); pg.addColorStop(1, hexA(WATER, 0));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, prx, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA('#CFE6FF', 0.22); ctx.lineWidth = 2 * unit * prx / pry;
        ctx.beginPath(); ctx.arc(0, 0, prx * 0.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.restore();
        function pondXY(u, v) { return [pcx + u * prx * intro, pcy + v * pry * intro]; }

        // moon path on the water
        ctx.save(); ctx.globalAlpha *= intro;
        var rx0 = Math.min(Math.max(mx, pcx - prx * 0.5), pcx + prx * 0.6);
        for (var ms = 0; ms < 6; ms++) {
          var sy = pcy - pry * 0.5 + ms * pry * 0.2, sw = prx * (0.12 - ms * 0.012) * (0.75 + 0.25 * Math.sin(t * 0.006 + ms * 1.7));
          ctx.fillStyle = 'rgba(255,240,200,' + (0.26 - ms * 0.035).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(rx0 + Math.sin(t * 0.004 + ms) * 6 * unit, sy, sw / 2, Math.max(1.5, 2.6 * unit), 0, 0, TAU); ctx.fill();
        }
        ctx.restore();

        // the dancers
        var birds = isSuper
          ? [{ x: W * 0.5 - Math.min(W * 0.3, F * 3.3), y: footY - pry * 0.3, F: F * 0.8, lag: 0.006 },
             { x: W * 0.5 + Math.min(W * 0.3, F * 3.3), y: footY - pry * 0.3, F: F * 0.8, lag: 0.006 },
             { x: W * 0.5, y: footY, F: F, lag: 0 }]
          : [{ x: W * 0.5 - F * 0.1, y: footY, F: F, lag: 0 }];
        var poses = birds.map(function (b) { return dancePose(p, t, b.lag); });
        var birdA = clamp01((p - 0.02) / 0.1);
        var rise = (1 - easeOut(clamp01((p - 0.02) / 0.14)));

        // ripples
        for (var r = 0; r < ripples.length; r++) {
          var rq = (p - ripples[r]) * dur / 1300;
          if (rq <= 0 || rq >= 1) continue;
          birds.forEach(function (b) {
            ctx.strokeStyle = hexA('#D8ECFF', 0.55 * (1 - rq)); ctx.lineWidth = Math.max(1, 2.4 * unit * (1 - rq * 0.5));
            ctx.beginPath(); ctx.ellipse(b.x, b.y, b.F * (0.3 + rq * 2.4), b.F * (0.3 + rq * 2.4) * (pry / prx) * 1.1, 0, 0, TAU); ctx.stroke();
          });
        }
        // reflections (clipped to the pond)
        ctx.save();
        ctx.beginPath(); ctx.ellipse(pcx, pcy, prx * intro, pry * intro, 0, 0, TAU); ctx.clip();
        birds.forEach(function (b, bi) {
          drawFlamingo(b.x, b.y + 2 * unit, b.F, poses[bi], 0.2 * birdA, true);
        });
        ctx.restore();

        // lily pads + lotus (behind ones first)
        var ls = Math.min(prx * 0.075, F * 0.42) * (isSuper ? 0.9 : 1);
        var order = lotuses.slice().sort(function (a, b) { return a.v - b.v; });
        order.forEach(function (L) {
          if (L.v > 0.3) return;
          var q = pondXY(L.u, L.v), oq = clamp01((p - L.at) / 0.14), pop = easeOutBack(clamp01((p - L.at + 0.08) / 0.1));
          if (pop <= 0) return;
          lilyPad(q[0], q[1], ls * 1.5 * pop, L.notch);
          lotus(q[0], q[1] - ls * 0.08, ls * pop, easeOut(oq), L.tint, t, L.ph);
        });

        // reeds at the pond's sides
        ctx.save(); ctx.globalAlpha *= intro;
        reeds(pcx - prx * 0.88, pcy - pry * 0.1, F * 0.9, -1, t);
        reeds(pcx + prx * 0.86, pcy - pry * 0.05, F * 0.8, 1, t + 500);
        ctx.restore();

        // birds
        birds.forEach(function (b, bi) {
          ctx.save(); ctx.translate(0, rise * b.F * 0.4);
          drawFlamingo(b.x, b.y, b.F, poses[bi], birdA, false);
          ctx.restore();
          // water lapping over the foot
          ctx.fillStyle = hexA(mixHex(WATER, '#FFFFFF', 0.25), 0.5 * birdA);
          ctx.beginPath(); ctx.ellipse(b.x + b.F * 0.12, b.y + b.F * 0.02, b.F * 0.32, b.F * 0.06, 0, 0, Math.PI); ctx.fill();
        });

        // front lotuses
        order.forEach(function (L) {
          if (L.v <= 0.3) return;
          var q = pondXY(L.u, L.v), oq = clamp01((p - L.at) / 0.14), pop = easeOutBack(clamp01((p - L.at + 0.08) / 0.1));
          if (pop <= 0) return;
          lilyPad(q[0], q[1], ls * 1.5 * pop, L.notch);
          lotus(q[0], q[1] - ls * 0.08, ls * pop, easeOut(oq), L.tint, t, L.ph);
        });

        // water glints
        for (var g2 = 0; g2 < glints.length; g2++) {
          var G = glints[g2], tw = Math.sin(t * 0.001 * G.rate + G.ph);
          if (tw <= 0.3) continue;
          var gq = pondXY(G.u, G.v);
          ctx.fillStyle = hexA('#FFFFFF', (tw - 0.3) * 0.9 * intro);
          sparkPath(ctx, gq[0], gq[1], (3 + 5 * tw) * unit); ctx.fill();
        }

        // splash droplets (sparkle at the top of their arc)
        for (var d = 0; d < drops.length; d++) {
          var D = drops[d], dt = (p - D.at) * dur / 1000;
          if (dt <= 0) continue;
          var b = birds[isSuper ? D.who : 0];
          var dx = b.x + (D.vx * dt) * b.F, dy = b.y + (D.vy * dt + 4.5 * dt * dt) * b.F;
          if (dy > b.y + 2 || dt > 1.4) continue;
          var dr = D.r * b.F;
          ctx.fillStyle = hexA('#CFEAFF', 0.85); ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(dx - dr * 0.35, dy - dr * 0.35, dr * 0.35, 0, TAU); ctx.fill();
          var tw3 = Math.sin(dt * 20 + D.ph);
          if (tw3 > 0) { ctx.fillStyle = hexA('#FFFFFF', tw3); sparkPath(ctx, dx, dy, dr * 2.6 * tw3); ctx.fill(); }
        }

        // super: crown-ring of sparkling droplets around the lead dancer + rising hearts
        if (isSuper) {
          var lead = birds[2], rqq = (p - T.twirl[1]) * dur / 1000;
          if (rqq > 0 && rqq < 1.3) {
            for (var rr = 0; rr < ring.length; rr++) {
              var R = ring[rr];
              var rad = 1.2 + rqq * 1.4;
              var rx2 = lead.x + Math.cos(R.a) * rad * lead.F * 1.25, base = lead.y + Math.sin(R.a) * rad * lead.F * 0.3;
              var hgt = R.h * lead.F * (rqq * 2.6 - rqq * rqq * 2);
              if (hgt < 0) continue;
              var ry2 = base - hgt, fa = clamp01(1.3 - rqq);
              ctx.fillStyle = hexA(R.col, 0.9 * fa); ctx.beginPath(); ctx.arc(rx2, ry2, lead.F * 0.05, 0, TAU); ctx.fill();
              var tw4 = 0.5 + 0.5 * Math.sin(t * 0.02 + R.ph);
              ctx.fillStyle = hexA('#FFFFFF', tw4 * fa); sparkPath(ctx, rx2, ry2, lead.F * 0.14 * tw4); ctx.fill();
            }
          }
          for (var hi = 0; hi < hearts.length; hi++) {
            var HT = hearts[hi], hq = (p - HT.at) / HT.sp;
            if (hq <= 0 || hq >= 1) continue;
            var hx3 = HT.x * W + Math.sin(hq * 7 + HT.ph) * 16 * unit, hy3 = H * 0.66 - hq * H * 0.42;
            var hr = HT.r * unit * 1.3 * easeOutBack(clamp01(hq * 4));
            ctx.globalAlpha = gFade * clamp01(hq * 6) * clamp01((1 - hq) * 3);
            ctx.fillStyle = HT.col; heartPath(ctx, hx3, hy3, hr); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(hx3 - hr * 0.42, hy3 - hr * 0.38, hr * 0.18, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = gFade;
        }
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
