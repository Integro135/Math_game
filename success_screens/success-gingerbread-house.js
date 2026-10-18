/* success-gingerbread-house.js — מסך הצלחה: בֵּית הַגִּ'ינְגֶּ'ר 🍪🏠
   בית ג'ינג'ר נבנה מעצמו: הקירות קופצים, הגג נוחת עם שוליים של זיגוג לבן
   נוטף, ממתקים (סוכריות גומי, סוכריות מנטה, סוכריות על מקל) נצמדים אחד אחד,
   החלונות נדלקים באור חם והארובה מעלה עשן בצורת לבבות. בפתח הדלת מופיעה
   ילדת ג'ינג'ר ומנופפת. בסופר: נצנצי סוכר יורדים כמו שלג, יותר ממתקים
   ופיצוץ גדול של סוכריות ומקלות סוכר מעל הגג.
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
  function starPath(ctx, x, y, rOut, rIn, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rIn : rOut, a = rot + (i / 10) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
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

  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
    if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
    x -= 2.625 / d1; return n1 * x * x + 0.984375;
  }

  window.SUCCESS.styles.push({
    name: 'gingerbread-house',
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
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';

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

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      var GB = '#C98245', GB_D = '#9A5A2A', ROOF = '#7A3F1D', ICE = '#FFFFFF', INK = '#3A1E14';
      var CANDY = [primary, '#FF6FA0', '#7BE495', '#FFE066', glow, accent];
      // candy decorations in HOUSE coordinates: u = -1..1 across the house width, v = 0 (ground) .. up in wall-heights
      var candies = [
        { k: 'gum', slope: -1, s: 0.32 }, { k: 'gum', slope: -1, s: 0.66 }, { k: 'gum', slope: 1, s: 0.4 },
        { k: 'mint', u: -0.78, v: 0.86 }, { k: 'mint', u: 0.78, v: 0.86 },
        { k: 'lolly', u: -1.3, v: 0 }, { k: 'lolly', u: 1.3, v: 0 }
      ];
      if (isSuper) candies = candies.concat([
        { k: 'gum', slope: -1, s: 0.05 }, { k: 'gum', slope: 1, s: 0.82 },
        { k: 'cane', u: -0.56, v: 0, flip: true }, { k: 'cane', u: 0.56, v: 0 },
        { k: 'mint', u: -0.78, v: 0.2 }, { k: 'mint', u: 0.78, v: 0.2 }
      ]);
      var cStep = (isSuper ? 0.3 : 0.24) / candies.length;
      candies.forEach(function (c, i) { c.at = 0.2 + i * cStep; c.col = CANDY[i % CANDY.length]; });
      var hearts = [];
      for (var h = 0; h < (isSuper ? 9 : 6); h++) hearts.push({ at: 0.32 + h * (isSuper ? 0.065 : 0.085), ph: rnd(0, TAU) });
      var sugar = [];
      if (isSuper) for (var sI = 0; sI < 46; sI++) sugar.push({ x: Math.random(), at: 0.22 + rnd(0, 0.5), v: rnd(0.16, 0.3), ph: rnd(0, TAU), r: rnd(2.5, 5) });
      var BURST = 0.64, burst = [];
      if (isSuper) for (var bI = 0; bI < 24; bI++) {
        var ba = -Math.PI / 2 + rnd(-1.4, 1.4), bsp = rnd(300, 480);
        burst.push({ vx: Math.cos(ba) * bsp, vy: Math.sin(ba) * bsp, k: ['lolly', 'cane', 'star'][bI % 3], col: CANDY[bI % CANDY.length], rot: rnd(0, TAU), spin: rnd(-5, 5), r: rnd(13, 20) });
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.42;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── candy painters ───
      function gumdrop(x, y, r, col) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.bezierCurveTo(x - r, y - r * 1.5, x + r, y - r * 1.5, x + r, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x - r * 0.5 + k * r * 0.33, y - r * (0.35 + (k % 2) * 0.35), r * 0.09, 0, TAU); ctx.fill(); }
      }
      function mint(x, y, r) {
        ctx.fillStyle = ICE; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#E8384F';
        for (var k = 0; k < 6; k += 2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.92, k / 6 * TAU, (k + 1) / 6 * TAU); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      }
      function lolly(x, y, r, col, stick) {
        if (stick) { ctx.strokeStyle = ICE; ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + stick); ctx.stroke(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = r * 0.16;
        ctx.beginPath();
        for (var k = 0; k <= 36; k++) { var a = k / 36 * TAU * 2.2, rr = r * 0.82 * k / 36; if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.stroke();
      }
      function cane(x, y, r, flip) {
        // a candy cane standing on the ground at (x, y), height ~ 3.4r
        var d = flip ? -1 : 1;
        function path() { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 2.6); ctx.arc(x + d * r * 0.55, y - r * 2.6, r * 0.55, Math.PI, flip ? Math.PI * 2 : 0, flip); }
        ctx.lineWidth = r * 0.42;
        ctx.strokeStyle = ICE; path(); ctx.stroke();
        ctx.strokeStyle = '#E8384F'; ctx.setLineDash([r * 0.32, r * 0.32]); path(); ctx.stroke(); ctx.setLineDash([]);
      }
      // ─── gingerbread girl (front view): two eyes, open smile, icing buttons, mitten hands; she waves ───
      function girl(x, fy, G, t) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = GB; ctx.lineWidth = G * 0.17;
        ctx.beginPath(); ctx.moveTo(x - G * 0.1, fy - G * 0.36); ctx.lineTo(x - G * 0.17, fy - G * 0.07);
        ctx.moveTo(x + G * 0.1, fy - G * 0.36); ctx.lineTo(x + G * 0.17, fy - G * 0.07); ctx.stroke();
        // icing zig-zag on the ankles
        ctx.strokeStyle = ICE; ctx.lineWidth = G * 0.025;
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(x + sd * G * 0.1, fy - G * 0.13); ctx.lineTo(x + sd * G * 0.14, fy - G * 0.1); ctx.lineTo(x + sd * G * 0.18, fy - G * 0.14); ctx.lineTo(x + sd * G * 0.23, fy - G * 0.11); ctx.stroke(); });
        // arms: left resting, right waving (mitten = palm + thumb)
        var shY = fy - G * 0.62;
        var wave = Math.sin(t * 0.013) * 0.45;
        var hands = [[x - G * 0.4, fy - G * 0.42], [x + G * 0.2 + Math.cos(-1.0 + wave) * G * 0.3, shY + Math.sin(-1.0 + wave) * G * 0.3]];
        ctx.strokeStyle = GB; ctx.lineWidth = G * 0.15;
        ctx.beginPath(); ctx.moveTo(x - G * 0.18, shY); ctx.lineTo(hands[0][0], hands[0][1]);
        ctx.moveTo(x + G * 0.18, shY); ctx.lineTo(hands[1][0], hands[1][1]); ctx.stroke();
        hands.forEach(function (hp, i) {
          ctx.fillStyle = GB;
          ctx.beginPath(); ctx.arc(hp[0], hp[1], G * 0.09, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(hp[0] + (i ? -1 : 1) * G * 0.075, hp[1] - G * 0.04, G * 0.042, 0, TAU); ctx.fill();
        });
        // body + dress
        ctx.fillStyle = GB; ctx.beginPath(); ctx.ellipse(x, fy - G * 0.48, G * 0.2, G * 0.22, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = primary;
        ctx.beginPath(); ctx.moveTo(x - G * 0.15, fy - G * 0.52); ctx.lineTo(x - G * 0.3, fy - G * 0.27);
        ctx.quadraticCurveTo(x, fy - G * 0.2, x + G * 0.3, fy - G * 0.27); ctx.lineTo(x + G * 0.15, fy - G * 0.52); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ICE; ctx.lineWidth = G * 0.028;
        ctx.beginPath();
        for (var z = 0; z <= 6; z++) { var zx = x - G * 0.28 + z * G * 0.093, zy = fy - G * 0.27 + (z % 2 ? -G * 0.04 : 0) + G * 0.02; if (z === 0) ctx.moveTo(zx, zy); else ctx.lineTo(zx, zy); }
        ctx.stroke();
        [accent, '#7BE495'].forEach(function (c, i) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, fy - G * (0.62 - i * 0.08), G * 0.035, 0, TAU); ctx.fill(); });
        // head
        var hx = x, hy = fy - G * 0.86;
        ctx.fillStyle = GB; ctx.beginPath(); ctx.arc(hx, hy, G * 0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = ICE; ctx.lineWidth = G * 0.022;
        ctx.beginPath(); ctx.arc(hx, hy, G * 0.17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.fillStyle = INK;
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.arc(hx + sd * G * 0.07, hy - G * 0.02, G * 0.028, 0, TAU); ctx.fill(); });
        ctx.fillStyle = ICE;
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.arc(hx + sd * G * 0.07 + G * 0.01, hy - G * 0.032, G * 0.01, 0, TAU); ctx.fill(); });
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(hx - G * 0.07, hy + G * 0.06); ctx.quadraticCurveTo(hx, hy + G * 0.16, hx + G * 0.07, hy + G * 0.06);
        ctx.quadraticCurveTo(hx, hy + G * 0.085, hx - G * 0.07, hy + G * 0.06); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6'; ctx.beginPath(); ctx.ellipse(hx, hy + G * 0.105, G * 0.028, G * 0.016, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,150,.6)';
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.arc(hx + sd * G * 0.12, hy + G * 0.05, G * 0.03, 0, TAU); ctx.fill(); });
        // a bow
        var bx = hx + G * 0.12, by = hy - G * 0.17;
        ctx.fillStyle = primary;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - G * 0.1, by - G * 0.06); ctx.lineTo(bx - G * 0.1, by + G * 0.06); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + G * 0.1, by - G * 0.06); ctx.lineTo(bx + G * 0.1, by + G * 0.06); ctx.closePath(); ctx.fill();
        ctx.fillStyle = mixHex(primary, '#FFFFFF', 0.4); ctx.beginPath(); ctx.arc(bx, by, G * 0.03, 0, TAU); ctx.fill();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        var gy = H * (W < H ? 0.74 : 0.82);
        var hw = Math.min(W * 0.58, H * 0.42), wh = hw * 0.6, rh = hw * 0.46;
        var cx = W * 0.5, L = cx - hw / 2, R = cx + hw / 2, top = gy - wh;
        var eave = hw * 0.1, peakY = top - rh;
        // snowy icing ground
        ctx.fillStyle = hexA('#FFFFFF', 0.9 * clamp01(p / 0.08));
        ctx.beginPath(); ctx.ellipse(cx, gy + hw * 0.03, Math.min(hw * 0.95, W * 0.47), hw * 0.08, 0, 0, TAU); ctx.fill();
        // walls (pop up from the ground)
        var wA = easeOutBack(clamp01(p / 0.1));
        if (wA > 0) {
          ctx.save(); ctx.translate(cx, gy); ctx.scale(1, wA); ctx.translate(-cx, -gy);
          ctx.fillStyle = GB; ctx.fillRect(L, top, hw, wh);
          ctx.strokeStyle = GB_D; ctx.lineWidth = hw * 0.012; ctx.strokeRect(L, top, hw, wh);
          // icing wave along the bottom
          ctx.strokeStyle = ICE; ctx.lineWidth = hw * 0.018; ctx.beginPath();
          for (var q = 0; q <= 16; q++) { var qx = L + hw * q / 16, qy = gy - hw * 0.035 + (q % 2 ? -hw * 0.02 : 0); if (q === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy); }
          ctx.stroke();
          // windows (light up warm)
          var lA = clamp01((p - 0.3) / 0.06), ws = hw * 0.17;
          [-1, 1].forEach(function (sd) {
            var wx = cx + sd * hw * 0.3 - ws / 2, wy = top + wh * 0.3;
            ctx.fillStyle = lA > 0 ? mixHex('#3B1F14', '#FFD27A', lA) : '#3B1F14';
            ctx.fillRect(wx, wy, ws, ws);
            ctx.strokeStyle = ICE; ctx.lineWidth = hw * 0.02;
            ctx.strokeRect(wx, wy, ws, ws);
            ctx.beginPath(); ctx.moveTo(wx + ws / 2, wy); ctx.lineTo(wx + ws / 2, wy + ws); ctx.moveTo(wx, wy + ws / 2); ctx.lineTo(wx + ws, wy + ws / 2); ctx.stroke();
          });
          // arched door, glowing once open
          var dw = hw * 0.24, dh = wh * 0.62, dA = clamp01((p - 0.36) / 0.06);
          ctx.fillStyle = dA > 0 ? mixHex('#6B3416', '#FFC266', dA) : '#6B3416';
          ctx.beginPath(); ctx.moveTo(cx - dw / 2, gy); ctx.lineTo(cx - dw / 2, gy - dh + dw / 2); ctx.arc(cx, gy - dh + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(cx + dw / 2, gy); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = ICE; ctx.lineWidth = hw * 0.018; ctx.stroke();
          if (dA > 0) {   // the door swung open to the side
            ctx.fillStyle = '#6B3416';
            ctx.beginPath(); ctx.moveTo(cx - dw / 2, gy); ctx.lineTo(cx - dw / 2, gy - dh + dw * 0.3); ctx.lineTo(cx - dw / 2 - dw * 0.28 * dA, gy - dh + dw * 0.4); ctx.lineTo(cx - dw / 2 - dw * 0.28 * dA, gy + hw * 0.01); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
        // chimney + roof (drops in with a bounce)
        var rA = clamp01((p - 0.08) / 0.12);
        if (rA > 0) {
          var dy = -(1 - easeOutBounce(rA)) * H * 0.45;
          ctx.save(); ctx.translate(0, dy);
          var chx = cx + hw * 0.22, chw = hw * 0.12, chTop = peakY + rh * 0.12;
          ctx.fillStyle = '#A0522D'; ctx.fillRect(chx, chTop, chw, rh * 0.6);
          ctx.fillStyle = ICE; ctx.fillRect(chx - chw * 0.12, chTop - hw * 0.025, chw * 1.24, hw * 0.035);
          ctx.fillStyle = ROOF;
          ctx.beginPath(); ctx.moveTo(cx, peakY); ctx.lineTo(R + eave, top + hw * 0.04); ctx.lineTo(L - eave, top + hw * 0.04); ctx.closePath(); ctx.fill();
          // chocolate shingle rows
          ctx.strokeStyle = 'rgba(255,220,180,.18)'; ctx.lineWidth = hw * 0.01;
          for (var row = 1; row < 4; row++) {
            var ry = peakY + (top + hw * 0.04 - peakY) * row / 4, half = (hw / 2 + eave) * row / 4;
            ctx.beginPath(); ctx.moveTo(cx - half, ry); ctx.lineTo(cx + half, ry); ctx.stroke();
          }
          // white icing along both eaves, with drips revealed one by one
          var iA = clamp01((p - 0.17) / 0.1);
          if (iA > 0) {
            ctx.strokeStyle = ICE; ctx.lineWidth = hw * 0.035;
            ctx.beginPath(); ctx.moveTo(L - eave, top + hw * 0.04); ctx.lineTo(cx, peakY); ctx.lineTo(R + eave, top + hw * 0.04); ctx.stroke();
            ctx.fillStyle = ICE;
            var nd = 7;
            for (var sd2 = -1; sd2 <= 1; sd2 += 2) for (var d = 0; d < nd; d++) {
              if ((d + 1) / nd > iA) continue;
              var f = (d + 0.5) / nd, ex = cx + sd2 * (hw / 2 + eave) * f, ey = peakY + (top + hw * 0.04 - peakY) * f;
              ctx.beginPath(); ctx.arc(ex, ey + hw * 0.02, hw * 0.028, 0, Math.PI); ctx.fill();
              if (d % 2) { ctx.beginPath(); ctx.ellipse(ex, ey + hw * 0.05, hw * 0.012, hw * 0.026, 0, 0, TAU); ctx.fill(); }
            }
          }
          ctx.restore();
          // heart-shaped smoke puffs from the chimney
          for (var hI = 0; hI < hearts.length; hI++) {
            var ht = (t - hearts[hI].at * dur) / 1000; if (ht <= 0 || ht > 1.3) continue;
            var hx2 = chx + chw / 2 + Math.sin(ht * 4 + hearts[hI].ph) * hw * 0.03 + ht * hw * 0.06;
            var hy2 = chTop - hw * 0.05 - ht * hw * 0.3;
            var hr = hw * (0.03 + ht * 0.035);
            ctx.globalAlpha = gFade * clamp01(ht * 5) * clamp01((1.3 - ht) / 0.5) * clamp01((hy2 - H * 0.26) / (H * 0.06)) * 0.9;
            ctx.fillStyle = hI % 2 ? '#FFC2D8' : '#FFFFFF';
            heartPath(ctx, hx2, hy2, hr); ctx.fill();
          }
          ctx.globalAlpha = gFade;
        }
        // candies pop on one by one
        var cr = hw * 0.055;
        for (var c = 0; c < candies.length; c++) {
          var cd = candies[c], ca = easeOutBack(clamp01((p - cd.at) / 0.07)); if (ca <= 0) continue;
          var x, y;
          if (cd.slope) { var ff = cd.s; x = cx + cd.slope * (hw / 2 + eave) * ff; y = peakY + (top + hw * 0.04 - peakY) * ff - hw * 0.012; }
          else { x = cx + cd.u * hw / 2; y = gy - cd.v * wh; }
          ctx.save(); ctx.translate(x, y); ctx.scale(ca, ca); ctx.translate(-x, -y);
          if (cd.k === 'gum') gumdrop(x, y, cr, cd.col);
          else if (cd.k === 'mint') mint(x, y, cr * 0.9);
          else if (cd.k === 'lolly') lolly(x, y - wh * 0.62, cr * 1.5, cd.col, wh * 0.62);
          else if (cd.k === 'cane') cane(x, y, cr * 0.9, cd.flip);
          ctx.restore();
        }
        // the gingerbread girl steps out of the door and waves
        var gA = easeOutBack(clamp01((p - 0.42) / 0.1));
        if (gA > 0) {
          var G = wh * 0.72;
          ctx.save(); ctx.translate(cx, gy); ctx.scale(gA, gA); ctx.translate(-cx, -gy);
          girl(cx, gy + hw * 0.01, G, t);
          ctx.restore();
        }
        // super: sugar snow + a candy burst over the roof
        for (var n = 0; n < sugar.length; n++) {
          var su = sugar[n], st = (t - su.at * dur) / 1000; if (st <= 0) continue;
          var sy = -10 + st * su.v * H; if (sy > gy) continue;
          ctx.fillStyle = hexA('#FFFFFF', 0.85 * clamp01(st * 3));
          sparkPath(ctx, su.x * W + Math.sin(st * 2 + su.ph) * 14 * unit, sy, su.r * unit + 1.5); ctx.fill();
        }
        var bt = (t - BURST * dur) / 1000;
        if (bt > 0) for (var m = 0; m < burst.length; m++) {
          var bp = burst[m];
          var px = cx + bp.vx * unit * bt, py = peakY + bp.vy * unit * bt + 0.5 * 1200 * unit * bt * bt;
          var fa = clamp01(bt / 0.08) * clamp01(1.5 - bt * 0.9); if (fa <= 0) continue;
          var r2 = bp.r * unit * 1.3;
          ctx.save(); ctx.globalAlpha = gFade * fa; ctx.translate(px, py); ctx.rotate(bp.rot + bp.spin * bt);
          if (bp.k === 'lolly') lolly(0, 0, r2 * 0.8, bp.col, r2 * 1.2);
          else if (bp.k === 'cane') cane(0, r2 * 1.2, r2 * 0.6, false);
          else { ctx.fillStyle = bp.col; starPath(ctx, 0, 0, r2, r2 * 0.45, 0); ctx.fill(); }
          ctx.restore();
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
