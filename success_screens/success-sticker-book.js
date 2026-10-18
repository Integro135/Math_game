/* success-sticker-book.js — מסך הצלחה: סְפַר מַדְבֵּקוֹת ⭐
   מדבקות חמודות "נטרקות" על המסך אחת אחרי השנייה — כוכב, לב, קשת, שמש
   מחייכת, חתולה, פרח, "100", כתר — עם שוליים לבנים של חיתוך־מדבקה, פינה
   קטנה מקולפת וקווי "טראח" קטנים, מסודרות סביב המחמאה כמו בדף של ספר
   מדבקות. בסוף נוחתת מדבקת כוכב זהב גדולה במרכז־למטה ופס ברק עובר עליה.
   בסופר: יותר מדבקות, מדבקה הולוגרפית מנצנצת וגל ברק שני.
   האמנות מצוירת פעם אחת לקנבסים קטנים מחוץ למסך (כולל הצל והשוליים), כך
   שכל פריים רק מעתיק תמונות — קל גם לטאבלטים.
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

  var INK = '#2A1A2E';
  // a tiny kawaii face (two eyes, open smile, blush), centred at 0,0 with scale s
  function kawaii(c, x, y, s) {
    c.fillStyle = INK;
    [-1, 1].forEach(function (d) { c.beginPath(); c.ellipse(x + d * 15 * s, y - 2 * s, 5.5 * s, 7 * s, 0, 0, TAU); c.fill(); });
    c.fillStyle = '#FFFFFF';
    [-1, 1].forEach(function (d) { c.beginPath(); c.arc(x + d * 15 * s + 2 * s, y - 5 * s, 2.2 * s, 0, TAU); c.fill(); });
    c.fillStyle = '#4A2236';
    c.beginPath(); c.moveTo(x - 8 * s, y + 8 * s); c.quadraticCurveTo(x, y + 22 * s, x + 8 * s, y + 8 * s); c.quadraticCurveTo(x, y + 11 * s, x - 8 * s, y + 8 * s); c.closePath(); c.fill();
    c.fillStyle = '#FF86A8'; c.beginPath(); c.ellipse(x, y + 14.5 * s, 3.6 * s, 2.4 * s, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,110,150,.55)';
    [-1, 1].forEach(function (d) { c.beginPath(); c.ellipse(x + d * 26 * s, y + 7 * s, 6 * s, 3.6 * s, 0, 0, TAU); c.fill(); });
  }

  // ── sticker art (box 240×240 units, art centred at 120,120, radius ≈ 80) ──
  var ART = {
    star: function (c) {
      c.fillStyle = '#FFD54A'; c.strokeStyle = '#FFD54A'; c.lineWidth = 14; c.lineJoin = 'round';
      starPath(c, 0, 6, 80, 40, 0); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-18, -26, 9, 5, -0.6, 0, TAU); c.fill();
      kawaii(c, 0, 12, 0.85);
    },
    heart: function (c) {
      c.fillStyle = '#FF6FA5'; heartPath(c, 0, 16, 62); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-36, -14, 13, 8, -0.7, 0, TAU); c.fill();
    },
    rainbow: function (c) {
      var cols = ['#FF6B8B', '#FFA94D', '#FFE066', '#7DDB8E', '#6CC4FF', '#B489FF'];
      c.lineCap = 'butt';
      for (var i = 0; i < cols.length; i++) { c.strokeStyle = cols[i]; c.lineWidth = 11; c.beginPath(); c.arc(0, 30, 80 - i * 10.5, Math.PI, TAU); c.stroke(); }
      c.fillStyle = '#FFFFFF';
      [-1, 1].forEach(function (d) { [[0, 0, 18], [-16 * d, 6, 13], [16 * d, 8, 14]].forEach(function (q) { c.beginPath(); c.arc(d * 54 + q[0], 34 + q[1], q[2], 0, TAU); c.fill(); }); });
    },
    sun: function (c) {
      c.fillStyle = '#FFB534';
      for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a - 0.24) * 52, Math.sin(a - 0.24) * 52); c.lineTo(Math.cos(a) * 80, Math.sin(a) * 80); c.lineTo(Math.cos(a + 0.24) * 52, Math.sin(a + 0.24) * 52); c.closePath(); c.fill(); }
      c.strokeStyle = '#FFB534'; c.lineWidth = 8; c.lineJoin = 'round';
      for (var i2 = 0; i2 < 12; i2++) { var a2 = i2 / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a2 - 0.2) * 54, Math.sin(a2 - 0.2) * 54); c.lineTo(Math.cos(a2) * 78, Math.sin(a2) * 78); c.lineTo(Math.cos(a2 + 0.2) * 54, Math.sin(a2 + 0.2) * 54); c.stroke(); }
      c.fillStyle = '#FFD84D'; c.beginPath(); c.arc(0, 0, 58, 0, TAU); c.fill();
      kawaii(c, 0, 2, 1);
    },
    cat: function (c) {
      var fur = '#FFB86B';
      c.fillStyle = fur;
      [-1, 1].forEach(function (d) { c.beginPath(); c.moveTo(d * 64, -10); c.lineTo(d * 58, -76); c.lineTo(d * 16, -46); c.closePath(); c.fill(); });
      c.fillStyle = '#FF9EBB';
      [-1, 1].forEach(function (d) { c.beginPath(); c.moveTo(d * 54, -22); c.lineTo(d * 52, -62); c.lineTo(d * 28, -44); c.closePath(); c.fill(); });
      c.fillStyle = fur; c.beginPath(); c.ellipse(0, 6, 74, 62, 0, 0, TAU); c.fill();
      c.fillStyle = '#FFE2C4'; c.beginPath(); c.ellipse(0, 26, 34, 24, 0, 0, TAU); c.fill();
      c.fillStyle = INK;
      [-1, 1].forEach(function (d) { c.beginPath(); c.ellipse(d * 26, -2, 7, 10, 0, 0, TAU); c.fill(); });
      c.fillStyle = '#FFFFFF'; [-1, 1].forEach(function (d) { c.beginPath(); c.arc(d * 26 + 2.5, -6, 3, 0, TAU); c.fill(); });
      c.fillStyle = '#FF6F91'; c.beginPath(); c.moveTo(-7, 14); c.lineTo(7, 14); c.lineTo(0, 22); c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 22); c.quadraticCurveTo(-6, 32, -14, 28); c.moveTo(0, 22); c.quadraticCurveTo(6, 32, 14, 28); c.stroke();
      c.lineWidth = 2.5;
      [-1, 1].forEach(function (d) { c.beginPath(); c.moveTo(d * 40, 18); c.lineTo(d * 70, 12); c.moveTo(d * 40, 26); c.lineTo(d * 70, 30); c.stroke(); });
      c.fillStyle = 'rgba(255,110,150,.5)'; [-1, 1].forEach(function (d) { c.beginPath(); c.ellipse(d * 46, 12, 9, 5, 0, 0, TAU); c.fill(); });
    },
    flower: function (c, pal) {
      c.fillStyle = pal.primary;
      for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; c.beginPath(); c.ellipse(Math.cos(a) * 46, Math.sin(a) * 46, 34, 28, a, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.3)';
      for (var j = 0; j < 6; j++) { var b = j / 6 * TAU; c.beginPath(); c.ellipse(Math.cos(b) * 52, Math.sin(b) * 52, 14, 9, b, 0, TAU); c.fill(); }
      c.fillStyle = '#FFD54A'; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill();
      kawaii(c, 0, -2, 0.7);
    },
    hundred: function (c) {
      c.save(); c.rotate(-0.12);
      c.font = 'italic 900 92px "Arial Black", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#FF3D6B'; c.fillText('100', 0, -6);
      c.strokeStyle = '#FF3D6B'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-74, 42); c.lineTo(74, 38); c.moveTo(-60, 60); c.lineTo(62, 56); c.stroke();
      c.restore();
    },
    crown: function (c) {
      c.fillStyle = '#FFC93C'; c.strokeStyle = '#FFC93C'; c.lineWidth = 10; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-72, 50); c.lineTo(-80, -40); c.lineTo(-38, -4); c.lineTo(0, -66); c.lineTo(38, -4); c.lineTo(80, -40); c.lineTo(72, 50); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#F2A81D'; c.fillRect(-74, 36, 148, 18);
      [[-80, -40], [0, -66], [80, -40]].forEach(function (q) { c.fillStyle = '#FFE58A'; c.beginPath(); c.arc(q[0], q[1], 10, 0, TAU); c.fill(); });
      [['#FF5E8E', -40], ['#5EC8FF', 0], ['#7DDB8E', 40]].forEach(function (g) { c.fillStyle = g[0]; c.beginPath(); c.moveTo(g[1], 4); c.lineTo(g[1] + 11, 18); c.lineTo(g[1], 32); c.lineTo(g[1] - 11, 18); c.closePath(); c.fill(); });
    },
    moon: function (c) {
      c.fillStyle = '#FFE58A';
      c.beginPath(); c.arc(0, 0, 76, 0.9, TAU - 0.9 + 0.0001, false); c.arc(34, -6, 60, TAU - 1.32, 1.32, true); c.closePath(); c.fill();
      // side-view sleepy face: ONE closed eye, a little smile, blush
      c.strokeStyle = INK; c.lineWidth = 4.5; c.lineCap = 'round';
      c.beginPath(); c.arc(-46, -14, 9, 0.25, Math.PI - 0.25); c.stroke();
      c.beginPath(); c.arc(-40, 22, 9, 0.35, Math.PI - 0.6); c.stroke();
      c.fillStyle = 'rgba(255,110,150,.55)'; c.beginPath(); c.ellipse(-58, 6, 8, 5, 0, 0, TAU); c.fill();
    },
    cloud: function (c) {
      c.fillStyle = '#FFFFFF';
      [[-46, 14, 34], [-14, -10, 42], [28, -4, 38], [52, 18, 28], [0, 22, 40]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], q[2], 0, TAU); c.fill(); });
      c.fillStyle = '#CFE6FF'; c.beginPath(); c.ellipse(0, 44, 70, 10, 0, 0, TAU); c.fill();
      kawaii(c, 0, 10, 0.85);
    },
    holo: function (c, pal) {
      var g = c.createLinearGradient(-70, -70, 70, 70);
      g.addColorStop(0, pal.primary); g.addColorStop(0.35, pal.glow); g.addColorStop(0.65, '#FFFFFF'); g.addColorStop(1, pal.accent);
      c.fillStyle = g; heartPath(c, 0, 16, 62); c.fill();
      c.fillStyle = 'rgba(255,255,255,.8)'; sparkPath(c, -30, -16, 14); c.fill(); sparkPath(c, 34, 20, 10); c.fill();
    },
    gold: function (c) {
      var g = c.createLinearGradient(0, -80, 0, 80);
      g.addColorStop(0, '#FFF0A0'); g.addColorStop(0.5, '#FFC93C'); g.addColorStop(1, '#F29A1D');
      c.fillStyle = g; c.strokeStyle = '#F7B32B'; c.lineWidth = 14; c.lineJoin = 'round';
      starPath(c, 0, 6, 82, 41, 0); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-20, -30, 10, 6, -0.6, 0, TAU); c.fill();
      kawaii(c, 0, 12, 0.9);
    }
  };

  // render one sticker: art + white die-cut border + soft shadow + a peeled corner
  var RES = 1.5, BOX = 240;
  function bake(kind, pal) {
    var px = Math.round(BOX * RES);
    function mk() { var c = document.createElement('canvas'); c.width = px; c.height = px; return c; }
    var art = mk(), ac = art.getContext('2d');
    ac.setTransform(RES, 0, 0, RES, BOX / 2 * RES, BOX / 2 * RES);
    ART[kind](ac, pal);
    var brd = mk(), bc = brd.getContext('2d'), bw = 9 * RES;
    for (var i = 0; i < 16; i++) { var a = i / 16 * TAU; bc.drawImage(art, Math.cos(a) * bw, Math.sin(a) * bw); }
    bc.globalCompositeOperation = 'source-in'; bc.fillStyle = '#FFFFFF'; bc.fillRect(0, 0, px, px);
    bc.globalCompositeOperation = 'source-over';
    // find the silhouette's edge toward the lower-right for the peel
    var data = null;
    try { data = bc.getImageData(0, 0, px, px).data; } catch (e) { data = null; }
    var out = mk(), oc = out.getContext('2d');
    oc.save(); oc.shadowColor = 'rgba(0,0,0,.4)'; oc.shadowBlur = 8 * RES; oc.shadowOffsetY = 4 * RES;
    oc.drawImage(brd, 0, 0); oc.restore();
    oc.drawImage(art, 0, 0);
    if (data) {
      var cx = px / 2, ex = cx, ey = cx;
      for (var d = 0; d < px * 0.7; d++) {
        var xx = Math.round(cx + d * 0.7071), yy = Math.round(cx + d * 0.7071);
        if (xx >= px || yy >= px) break;
        if (data[(yy * px + xx) * 4 + 3] > 128) { ex = xx; ey = yy; }
      }
      var f = 15 * RES, ux = 0.7071, uy = 0.7071, vx = -0.7071, vy = 0.7071, L = 120 * RES;
      var qx = ex - ux * f, qy = ey - uy * f;
      oc.save(); oc.globalCompositeOperation = 'destination-out';
      oc.beginPath(); oc.moveTo(qx + vx * L, qy + vy * L); oc.lineTo(qx - vx * L, qy - vy * L);
      oc.lineTo(qx - vx * L + ux * L, qy - vy * L + uy * L); oc.lineTo(qx + vx * L + ux * L, qy + vy * L + uy * L); oc.closePath(); oc.fill();
      oc.restore();
      var g = oc.createLinearGradient(qx, qy, qx - ux * f, qy - uy * f);
      g.addColorStop(0, '#CFC8DA'); g.addColorStop(1, '#FFFFFF');
      oc.save(); oc.shadowColor = 'rgba(0,0,0,.3)'; oc.shadowBlur = 3 * RES; oc.shadowOffsetX = -1 * RES; oc.shadowOffsetY = -1 * RES;
      oc.fillStyle = g;
      oc.beginPath(); oc.moveTo(qx + vx * f * 0.95, qy + vy * f * 0.95);
      oc.quadraticCurveTo(qx - ux * f * 0.3, qy - uy * f * 0.3, qx - ux * f * 0.95, qy - uy * f * 0.95);
      oc.quadraticCurveTo(qx - ux * f * 0.3, qy - uy * f * 0.3, qx - vx * f * 0.95, qy - vy * f * 0.95);
      oc.closePath(); oc.fill(); oc.restore();
    }
    return out;
  }

  window.SUCCESS.styles.push({
    name: 'sticker-book',
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
      var P = { primary: primary, accent: accent, glow: glow };

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
        bgStars.push({ x: Math.random(), y: Math.random(), tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // the page layout — normalised slots for landscape and portrait (praise sits in the middle band)
      var SLOT_L = [[0.12, 0.2], [0.32, 0.16], [0.68, 0.16], [0.88, 0.2], [0.1, 0.55], [0.9, 0.55], [0.2, 0.84], [0.8, 0.84], [0.5, 0.15], [0.33, 0.68], [0.67, 0.68]];
      var SLOT_P = [[0.2, 0.12], [0.5, 0.09], [0.8, 0.12], [0.25, 0.28], [0.75, 0.28], [0.2, 0.64], [0.8, 0.64], [0.2, 0.87], [0.8, 0.87], [0.5, 0.21], [0.5, 0.64]];
      var kinds = ['star', 'heart', 'rainbow', 'sun', 'cat', 'flower', 'hundred', 'crown'];
      if (isSuper) kinds = kinds.concat(['moon', 'cloud', 'holo']);
      var order = [];                                 // shuffled slap order → never the same page twice
      for (var oi = 0; oi < kinds.length; oi++) order.push(oi);
      for (var sh = order.length - 1; sh > 0; sh--) { var j = Math.floor(Math.random() * (sh + 1)), tmp = order[sh]; order[sh] = order[j]; order[j] = tmp; }
      var t0s = isSuper ? 0.05 : 0.06, t1s = isSuper ? 0.55 : 0.58;
      var stickers = kinds.map(function (k, i) {
        return { kind: k, img: bake(k, P), slot: i, rot: rnd(-0.28, 0.28), spinIn: (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.6),
                 at: lerp(t0s, t1s, order.indexOf(i) / Math.max(1, kinds.length - 1)), size: k === 'hundred' ? 1.05 : rnd(0.92, 1.06) };
      });
      var gold = { kind: 'gold', img: bake('gold', P), rot: -0.08, spinIn: 0.5, at: isSuper ? 0.62 : 0.66, size: 1.55 };
      var shines = isSuper ? [0.74, 0.86] : [0.8];
      var holo = null;
      for (var hs = 0; hs < stickers.length; hs++) if (stickers[hs].kind === 'holo') holo = stickers[hs];
      // shine scratch canvas (one small canvas, reused)
      var shc = document.createElement('canvas'); shc.width = gold.img.width; shc.height = gold.img.height;
      var shx = shc.getContext('2d');

      // ─── praise + points (middle of the page) ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,7.4vw,80px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.3;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(44% + 8%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // slap a sticker: drops from big → lands with a squash + "slap" lines
      function drawSticker(s, x, y, D, t, shineQ) {
        var q = (t - s.at * dur) / 1000;
        if (q <= 0) return;
        var sc, rot, a = 1;
        if (q < 0.13) { var e = q / 0.13; sc = lerp(1.9, 1, e * e); rot = s.rot + s.spinIn * (1 - e); a = clamp01(e * 3); }
        else { var e2 = (q - 0.13); sc = 1 - 0.1 * Math.sin(e2 * 28) * Math.exp(-e2 * 14); rot = s.rot; }
        var size = D * s.size * sc;
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
        if (shineQ >= 0 && shineQ <= 1) {
          var w = shc.width;
          shx.globalCompositeOperation = 'source-over';
          shx.clearRect(0, 0, w, w); shx.drawImage(s.img, 0, 0);
          shx.globalCompositeOperation = 'source-atop';
          var bx = lerp(-w * 0.4, w * 1.4, shineQ);
          var g = shx.createLinearGradient(bx - w * 0.18, 0, bx + w * 0.18, w * 0.3);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          shx.fillStyle = g; shx.fillRect(0, 0, w, w);
          shx.globalCompositeOperation = 'source-over';
          ctx.drawImage(shc, -size / 2, -size / 2, size, size);
        } else ctx.drawImage(s.img, -size / 2, -size / 2, size, size);
        ctx.restore();
        // slap burst lines
        if (q > 0.12 && q < 0.42) {
          var b = (q - 0.12) / 0.3;
          ctx.save(); ctx.globalAlpha *= 1 - b; ctx.strokeStyle = s === gold ? accent : '#FFFFFF'; ctx.lineWidth = 3.5 * unit * (s === gold ? 1.4 : 1); ctx.lineCap = 'round';
          for (var i = 0; i < 8; i++) {
            var an = i / 8 * TAU + 0.2, r0 = size * (0.42 + b * 0.12), r1 = r0 + size * 0.12 * (1 - b * 0.5);
            ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke();
          }
          ctx.restore();
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.6 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        var portrait = W < H;
        var slots = portrait ? SLOT_P : SLOT_L;
        var R = portrait ? Math.min(W * 0.13, H * 0.075) : Math.min(W, H) * 0.11;
        var D = R * 2.6;
        for (var m = 0; m < stickers.length; m++) {
          var st = stickers[m], sl = slots[st.slot];
          var shq = st === holo ? ((t * 0.0007) % 1.4) : -1;
          drawSticker(st, sl[0] * W, sl[1] * H, D, t, shq);
        }
        // the big gold star, then its shine sweep(s)
        var gq = -1;
        shines.forEach(function (at) { var q = (p - at) / 0.1; if (q >= 0 && q <= 1) gq = q; });
        drawSticker(gold, W * 0.5, H * (portrait ? 0.8 : 0.79), D, t, gq);
        // a few twinkles around the gold star once it has landed
        var ga = clamp01((p - gold.at - 0.04) / 0.06);
        if (ga > 0) {
          for (var tw = 0; tw < 6; tw++) {
            var an = tw / 6 * TAU + t * 0.0012, rr = D * gold.size * 0.5;
            ctx.fillStyle = hexA(tw % 2 ? accent : '#FFFFFF', ga * (0.5 + 0.5 * Math.sin(t * 0.01 + tw)));
            sparkPath(ctx, W * 0.5 + Math.cos(an) * rr, H * (portrait ? 0.8 : 0.79) + Math.sin(an) * rr * 0.8, 9 * unit); ctx.fill();
          }
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
        stickers.length = 0;
      };
    }
  });
})();
