/* success-pumpkin-carriage.js — מסך הצלחה: כִּרְכָּרַת הַדְּלַעַת 🎃
   דלעת כתומה ועגולה יושבת על האדמה; מערבולת של ניצוצות קסם מסתחררת סביבה,
   הבזק רך — והיא הופכת לכרכרת אגדות (גלגלי זהב מסתובבים, חלון עגול עם
   מסגרת זהב מסולסלת ווילונות, כתר קטן ופנס דולק). הכרכרה מתגלגלת על פני
   המסך ומשאירה שובל נוצץ, ונעצרת באמצע בקפיצה קפיצית.
   בסופר: נעל זכוכית יורדת ומבריקה ליד הכרכרה, חופה של כוכבים נפרשת מעל
   הכרכרה, וקשת ניצוצות כמו זיקוקים מתפוצצת מעליהן מצד לצד.
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
  function starPath(ctx, x, y, r, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function mkSprite(col) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, hexA(col, 0.9));
    gr.addColorStop(0.5, hexA(col, 0.3)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  }

  var OR_L = '#FFC266', OR = '#FF9A2E', OR_D = '#D9600E', OR_LINE = '#9A420A';
  var GOLD = '#F2C14E', GOLD_L = '#FFF0A8', GOLD_D = '#B8862A';

  window.SUCCESS.styles.push({
    name: 'pumpkin-carriage',
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
      var praise = opts.praise || 'כָּל הַכָּבוֹד!';

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

      var SPR = { gold: mkSprite('#FFE08A'), warm: mkSprite('#FFB648'), prim: mkSprite(primary), glow: mkSprite(glow), white: mkSprite('#FFFFFF') };
      var glitSprites = [SPR.gold, SPR.prim, SPR.glow, SPR.white];

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { pop: [0, 0.05], swirl: [0.03, 0.19], morph: 0.2, roll: [0.25, 0.45], txt: 0.36,
            slipper: [0.47, 0.57], shine: 0.6, canopy: [0.5, 0.64], arc: [0.62, 0.84] }
        : { pop: [0, 0.08], swirl: [0.05, 0.29], morph: 0.3, roll: [0.37, 0.69], txt: 0.55 };
      function ms(f) { return f * dur; }

      var swirl = [];
      for (var sw = 0; sw < (isSuper ? 40 : 32); sw++)
        swirl.push({ a: rnd(0, TAU), r: rnd(1.6, 2.6), d: rnd(0, 0.45), k: sw % 4, sz: rnd(0.7, 1.2) });
      var poof = [];
      for (var pf = 0; pf < 18; pf++) poof.push({ a: pf / 18 * TAU + rnd(-0.1, 0.1), v: rnd(1.3, 2.3), k: pf % 4 });
      var ground = [];
      for (var gi = 0; gi < 90; gi++) ground.push({ u: Math.random(), dy: rnd(-0.06, 0.12), ph: rnd(0, TAU), tw: rnd(4, 9), k: gi % 4, sz: rnd(0.6, 1.2) });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      // super: canopy stars + firework nodes along the arc
      var canStars = [], nodes = [];
      if (isSuper) {
        for (var cs = 0; cs < 16; cs++) canStars.push({ x: rnd(-1.3, 1.3), y: rnd(-2.45, -0.4), ph: rnd(0, TAU), tw: rnd(3, 7), sz: rnd(0.6, 1.1) });
        var cols = [accent, primary, glow, '#FFFFFF', '#FF8EC4', accent, glow];
        for (var nd = 0; nd < 7; nd++) {
          var rays = [];
          for (var ry = 0; ry < 14; ry++) rays.push({ a: ry / 14 * TAU + rnd(-0.12, 0.12), v: rnd(0.8, 1.15) });
          nodes.push({ q: (nd + 0.5) / 7, col: cols[nd], rays: rays });
        }
      }

      // glitter particle pool (canvas only)
      var POOL = 200, parts = [];
      for (var pi = 0; pi < POOL; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, k: 0, ph: 0, sz: 1 });
      var pNext = 0;
      function spawn(x, y, vx, vy, life, sz) {
        var p = parts[pNext]; pNext = (pNext + 1) % POOL;
        p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.age = 0; p.life = life; p.sz = sz;
        p.k = (Math.random() * 4) | 0; p.ph = Math.random() * TAU;
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
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers ───
      function sprite(img, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function spiral(x, y, r, turns, dir, a0) {
        ctx.beginPath();
        var n = 26;
        for (var i = 0; i <= n; i++) {
          var q = i / n, a = a0 + dir * q * turns * TAU, rr = r * (1 - q * 0.85);
          if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.stroke();
      }
      // ribbed pumpkin centred at (0, cy), radii rx × ry (local units)
      function pumpkinRibs(cy, rx, ry) {
        var ribs = [[-0.58, 0.44, 0.78], [0.58, 0.44, 0.78], [-0.3, 0.52, 0.9], [0.3, 0.52, 0.9], [0, 0.5, 1]];
        for (var i = 0; i < ribs.length; i++) {
          var r = ribs[i], ox = r[0] * rx, w = r[1] * rx, lit = r[2];
          var g = ctx.createLinearGradient(ox - w, cy - ry, ox + w, cy + ry);
          g.addColorStop(0, mixHex(OR_L, OR, 1 - lit * 0.6)); g.addColorStop(0.5, mixHex(OR, OR_D, 1 - lit)); g.addColorStop(1, OR_D);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(ox, cy, w, ry * (0.93 + 0.07 * lit), 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = OR_LINE; ctx.lineWidth = 0.025; ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.ellipse(-0.3 * rx, cy - ry * 0.55, 0.16 * rx, 0.06 * ry, -0.5, 0, TAU); ctx.fill();
      }
      function drawPumpkin(x, y, S, sx, sy, a) {
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(S * sx, S * sy);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.95, 0.1, 0, 0, TAU); ctx.fill();
        pumpkinRibs(-0.78, 1.0, 0.78);
        // curly green stem + leaf
        ctx.strokeStyle = '#4E7A2A'; ctx.lineWidth = 0.13;
        ctx.beginPath(); ctx.moveTo(0, -1.45); ctx.quadraticCurveTo(0.02, -1.7, 0.16, -1.78); ctx.stroke();
        ctx.strokeStyle = '#7BC043'; ctx.lineWidth = 0.035;
        spiral(0.35, -1.62, 0.12, 1.2, 1, Math.PI);
        ctx.fillStyle = '#6DB33F';
        ctx.beginPath(); ctx.moveTo(-0.03, -1.52); ctx.quadraticCurveTo(-0.35, -1.85, -0.55, -1.6); ctx.quadraticCurveTo(-0.3, -1.45, -0.03, -1.52); ctx.fill();
        ctx.strokeStyle = '#3F6A22'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(-0.05, -1.53); ctx.quadraticCurveTo(-0.3, -1.62, -0.5, -1.6); ctx.stroke();
        ctx.restore();
      }
      function wheel(x, y, r, rot, far) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.globalAlpha *= far ? 0.6 : 1;
        var c = far ? GOLD_D : GOLD;
        ctx.strokeStyle = c; ctx.lineWidth = 0.045;
        for (var i = 0; i < 8; i++) {
          var a = i / 8 * TAU;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.08, Math.sin(a) * 0.08);
          ctx.quadraticCurveTo(Math.cos(a + 0.35) * r * 0.55, Math.sin(a + 0.35) * r * 0.55, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); ctx.stroke();
        }
        ctx.strokeStyle = far ? '#8A6420' : GOLD_D; ctx.lineWidth = 0.1;
        ctx.beginPath(); ctx.arc(0, 0, r - 0.03, 0, TAU); ctx.stroke();
        ctx.strokeStyle = c; ctx.lineWidth = 0.065;
        ctx.beginPath(); ctx.arc(0, 0, r - 0.03, 0, TAU); ctx.stroke();
        if (!far) {
          ctx.strokeStyle = GOLD_L; ctx.lineWidth = 0.022;
          ctx.beginPath(); ctx.arc(0, 0, r - 0.03, -rot - 2.6, -rot - 1.4); ctx.stroke();
        }
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = far ? GOLD_D : GOLD_L; ctx.beginPath(); ctx.arc(0, 0, 0.045, 0, TAU); ctx.fill();
        ctx.restore();
      }
      var BW = [-0.74, -0.5, 0.5], FW = [0.8, -0.4, 0.4];     // wheel x, y, r (local)
      function drawCarriage(x, y, S, sc, rot, lean, sqy, t) {
        ctx.save(); ctx.translate(x, y); ctx.scale(S * sc, S * sc);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 0.1, 0, 0, TAU); ctx.fill();
        // far wheels
        wheel(BW[0] + 0.14, BW[1] - 0.04, BW[2] * 0.95, rot, true);
        wheel(FW[0] + 0.14, FW[1] - 0.04, FW[2] * 0.95, rot * BW[2] / FW[2], true);
        // body (leans + squashes around the axle line)
        ctx.save(); ctx.translate(0, -0.5); ctx.rotate(lean); ctx.scale(1 + (1 - sqy) * 0.5, sqy); ctx.translate(0, 0.5);
        // gold suspension scrolls to the hubs
        ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.moveTo(BW[0], BW[1]); ctx.quadraticCurveTo(-0.95, -0.95, -0.6, -0.72); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(FW[0], FW[1]); ctx.quadraticCurveTo(1.0, -0.85, 0.62, -0.72); ctx.stroke();
        pumpkinRibs(-1.32, 1.06, 0.88);
        // door outline (gold) around the window
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(-0.4, -0.66); ctx.lineTo(-0.4, -1.45);
        ctx.bezierCurveTo(-0.4, -1.98, 0.44, -1.98, 0.44, -1.45); ctx.lineTo(0.44, -0.66); ctx.stroke();
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0.33, -0.86, 0.04, 0, TAU); ctx.fill();
        // window: warm light, curtains, curly gold frame
        var wx = 0.02, wy = -1.38, wrx = 0.27, wry = 0.33;
        var wg = ctx.createRadialGradient(wx - 0.05, wy - 0.05, 0, wx, wy, wry);
        wg.addColorStop(0, '#FFF3C8'); wg.addColorStop(0.7, '#FFC86A'); wg.addColorStop(1, '#E8963A');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(wx, wy, wrx, wry, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.ellipse(wx, wy, wrx, wry, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = mixHex(primary, '#FFFFFF', 0.25);
        for (var cs2 = -1; cs2 <= 1; cs2 += 2) {
          ctx.beginPath(); ctx.moveTo(wx + cs2 * wrx, wy - wry);
          ctx.lineTo(wx + cs2 * wrx * 0.15, wy - wry);
          ctx.quadraticCurveTo(wx + cs2 * wrx * 0.55, wy, wx + cs2 * wrx * 0.85, wy + wry * 0.1);
          ctx.quadraticCurveTo(wx + cs2 * wrx * 0.95, wy + wry * 0.6, wx + cs2 * wrx, wy + wry);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.ellipse(wx, wy, wrx, wry, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.ellipse(wx, wy, wrx, wry, 0, 0, TAU); ctx.stroke();
        ctx.lineWidth = 0.035;
        spiral(wx - 0.13, wy - wry - 0.1, 0.1, 1.1, -1, 0); spiral(wx + 0.13, wy - wry - 0.1, 0.1, 1.1, 1, Math.PI);
        spiral(wx - 0.12, wy + wry + 0.08, 0.08, 1.1, 1, 0); spiral(wx + 0.12, wy + wry + 0.08, 0.08, 1.1, -1, Math.PI);
        // side filigree on the outer ribs
        ctx.strokeStyle = hexA(GOLD, 0.85); ctx.lineWidth = 0.03;
        spiral(-0.72, -1.45, 0.14, 1.3, 1, -Math.PI / 2); spiral(0.75, -1.45, 0.14, 1.3, -1, -Math.PI / 2);
        // gold base band with curled ends
        ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.09;
        ctx.beginPath(); ctx.moveTo(-1.0, -0.78); ctx.quadraticCurveTo(0, -0.38, 1.0, -0.78); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055;
        ctx.beginPath(); ctx.moveTo(-1.0, -0.78); ctx.quadraticCurveTo(0, -0.38, 1.0, -0.78); ctx.stroke();
        ctx.lineWidth = 0.045;
        spiral(-1.08, -0.88, 0.11, 1.2, -1, Math.PI / 2); spiral(1.08, -0.88, 0.11, 1.2, 1, Math.PI / 2);
        // crown on top
        ctx.fillStyle = GOLD; ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(-0.2, -2.12); ctx.lineTo(-0.24, -2.38); ctx.lineTo(-0.1, -2.26); ctx.lineTo(0, -2.44);
        ctx.lineTo(0.1, -2.26); ctx.lineTo(0.24, -2.38); ctx.lineTo(0.2, -2.12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = primary; ctx.beginPath(); ctx.arc(0, -2.2, 0.045, 0, TAU); ctx.fill();
        ctx.fillStyle = GOLD_L;
        [[-0.24, -2.38], [0, -2.44], [0.24, -2.38]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.035, 0, TAU); ctx.fill(); });
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.03;
        spiral(0.36, -2.2, 0.1, 1.2, 1, Math.PI);
        spiral(-0.36, -2.2, 0.1, 1.2, -1, 0);
        // little lantern at the front
        ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(0.98, -1.3); ctx.quadraticCurveTo(1.14, -1.4, 1.16, -1.26); ctx.stroke();
        ctx.fillStyle = '#FFE9A0'; ctx.fillRect(1.09, -1.24, 0.14, 0.18);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.025; ctx.strokeRect(1.09, -1.24, 0.14, 0.18);
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(1.07, -1.24); ctx.lineTo(1.16, -1.32); ctx.lineTo(1.25, -1.24); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(SPR.warm, 1.16 - 0.45, -1.15 - 0.45, 0.9, 0.9 * (0.9 + 0.1 * Math.sin(t * 0.01)));
        ctx.globalAlpha = 0.35; ctx.drawImage(SPR.warm, wx - 0.6, wy - 0.6, 1.2, 1.2); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        // glints on the shell
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        var gl = 0.5 + 0.5 * Math.sin(t * 0.008);
        sparkPath(ctx, -0.55, -1.85, 0.07 * gl + 0.02); ctx.fill();
        sparkPath(ctx, 0.62, -1.9, 0.05 * (1 - gl) + 0.02); ctx.fill();
        ctx.restore();
        // near wheels
        wheel(BW[0], BW[1], BW[2], rot, false);
        wheel(FW[0], FW[1], FW[2], rot * BW[2] / FW[2], false);
        ctx.restore();
      }
      // glass slipper in side view, toe to the right; origin = under the heel on the ground, local = L px
      function slipperPath() {
        ctx.beginPath();
        ctx.moveTo(0.0, -0.3);                                  // back of the sole
        ctx.quadraticCurveTo(0.35, -0.24, 0.55, -0.04);        // arch down to the ball
        ctx.quadraticCurveTo(0.8, 0.01, 1.0, -0.02);           // sole to the toe
        ctx.quadraticCurveTo(1.08, -0.1, 0.98, -0.18);         // rounded toe
        ctx.quadraticCurveTo(0.75, -0.26, 0.52, -0.32);        // vamp
        ctx.quadraticCurveTo(0.3, -0.36, 0.08, -0.52);         // opening up to the heel counter
        ctx.quadraticCurveTo(-0.04, -0.46, 0.0, -0.3); ctx.closePath();
      }
      function drawSlipper(x, y, L, rot, a, shine, t) {
        if (a <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(L, L); ctx.globalAlpha = a;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(SPR.glow, -0.4, -1.0, 1.9, 1.3);
        ctx.globalCompositeOperation = 'source-over';
        // heel
        ctx.fillStyle = 'rgba(200,235,255,.6)'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(0.02, -0.3); ctx.lineTo(0.07, 0); ctx.lineTo(0.13, 0); ctx.lineTo(0.16, -0.27); ctx.closePath(); ctx.fill(); ctx.stroke();
        var g = ctx.createLinearGradient(0, -0.5, 1, 0);
        g.addColorStop(0, 'rgba(220,245,255,.75)'); g.addColorStop(0.5, hexA(glow, 0.45)); g.addColorStop(1, 'rgba(235,250,255,.8)');
        slipperPath(); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 0.03; ctx.stroke();
        // the opening (inside of the shoe)
        ctx.fillStyle = 'rgba(120,170,220,.35)';
        ctx.beginPath(); ctx.moveTo(0.08, -0.5); ctx.quadraticCurveTo(0.3, -0.34, 0.52, -0.31); ctx.quadraticCurveTo(0.3, -0.42, 0.08, -0.5); ctx.fill();
        // bow
        ctx.fillStyle = mixHex(primary, '#FFFFFF', 0.35);
        ctx.beginPath(); ctx.ellipse(0.66, -0.3, 0.07, 0.04, -0.6, 0, TAU); ctx.ellipse(0.78, -0.27, 0.07, 0.04, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = primary; ctx.beginPath(); ctx.arc(0.72, -0.29, 0.025, 0, TAU); ctx.fill();
        // shine sweep
        if (shine > 0 && shine < 1) {
          ctx.save(); slipperPath(); ctx.clip();
          var sx = lerp(-0.3, 1.3, shine);
          var sg = ctx.createLinearGradient(sx - 0.2, 0, sx + 0.2, 0);
          sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg; ctx.fillRect(-0.3, -0.7, 1.6, 0.8);
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(0.6, -0.12); ctx.quadraticCurveTo(0.8, -0.1, 0.95, -0.12); ctx.stroke();
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now(), lastT = 0, spawnAcc = 0;
      function frame(now) {
        if (killed) return;
        var t = now - t0, dt = Math.min(50, Math.max(0, t - lastT)); lastT = t;
        var gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var R = isSuper ? Math.min(W * 0.15, H * 0.14) : Math.min(W * 0.17, H * 0.155);
        var gy = H * (W < H ? 0.7 : 0.8);
        var xc = W / 2, travel = Math.min(R * 4.5, W / 2 - 1.35 * R), x0 = xc - travel;
        var appear = clamp01(t / 260);

        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // soft road glow (translucent)
        var rg = ctx.createLinearGradient(0, gy - R * 0.2, 0, gy + R * 0.5);
        rg.addColorStop(0, hexA(primary, 0)); rg.addColorStop(0.4, hexA(primary, 0.16 * appear)); rg.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = rg; ctx.fillRect(0, gy - R * 0.2, W, R * 0.7);
        ctx.strokeStyle = hexA(accent, 0.25 * appear); ctx.lineWidth = Math.max(1, 2 * unit);
        ctx.beginPath(); ctx.moveTo(W * 0.08, gy); ctx.lineTo(W * 0.92, gy); ctx.stroke();

        // roll state
        var r0 = ms(T.roll[0]), r1 = ms(T.roll[1]), rq = clamp01((t - r0) / (r1 - r0));
        var re = rq < 0.5 ? 2 * rq * rq : 1 - Math.pow(-2 * rq + 2, 2.6) / 2;   // starts gently, glides to a stop
        var carX = lerp(x0, xc, re), dist = carX - x0;
        var wheelRot = dist / (BW[2] * R);
        var lean = 0, sqy = 1, bob = 0;
        if (rq > 0 && rq < 1) { lean = -0.06 * Math.sin(Math.PI * clamp01(rq * 2)); bob = Math.abs(Math.sin(dist / R * 2.2)) * 0.03; }
        var tau = t - r1;
        if (tau > 0) {
          lean = 0.16 * Math.sin(tau * 0.013) * Math.exp(-tau * 0.0045);
          sqy = 1 - 0.09 * Math.sin(tau * 0.02) * Math.exp(-tau * 0.006);
          bob = Math.max(0, Math.sin(tau * 0.012)) * Math.exp(-tau * 0.007) * 0.12;
        }
        var mT = ms(T.morph);

        // ─── super: starry canopy behind the carriage ───
        if (isSuper) {
          var cq = easeInOut((t - ms(T.canopy[0])) / (ms(T.canopy[1]) - ms(T.canopy[0])));
          if (cq > 0) {
            ctx.save(); ctx.translate(xc, gy); ctx.scale(R, R);
            ctx.save();
            ctx.beginPath(); ctx.moveTo(0, -1.0);
            ctx.arc(0, -1.0, 4, -Math.PI / 2 - cq * Math.PI * 0.62, -Math.PI / 2 + cq * Math.PI * 0.62); ctx.closePath(); ctx.clip();
            var cg = ctx.createLinearGradient(0, -2.75, 0, 0);
            cg.addColorStop(0, hexA(primary, 0.42)); cg.addColorStop(0.6, hexA(glow, 0.14)); cg.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.moveTo(-1.7, 0); ctx.lineTo(-1.7, -1.0); ctx.ellipse(0, -1.0, 1.7, 1.75, 0, Math.PI, TAU); ctx.lineTo(1.7, 0); ctx.closePath(); ctx.fill();
            // scalloped inner drape
            ctx.strokeStyle = hexA('#FFFFFF', 0.3); ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.ellipse(0, -1.0, 1.55, 1.6, 0, Math.PI, TAU); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            for (var c2 = 0; c2 < canStars.length; c2++) {
              var CS = canStars[c2], tw = 0.5 + 0.5 * Math.sin(t * 0.001 * CS.tw + CS.ph);
              ctx.fillStyle = hexA('#FFFFFF', 0.5 + 0.5 * tw);
              sparkPath(ctx, CS.x, CS.y, 0.05 * CS.sz * (0.6 + 0.6 * tw)); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
            // gold star garland along the arch
            var NG = 15;
            for (var g2 = 0; g2 < NG; g2++) {
              var ga = Math.PI + g2 / (NG - 1) * Math.PI, dev = Math.abs(ga - Math.PI * 1.5) / (Math.PI / 2);
              var gq = clamp01((cq - dev * 0.85) / 0.15);
              if (gq <= 0) continue;
              var gx = Math.cos(ga) * 1.7, gyy = -1.0 + Math.sin(ga) * 1.75;
              var pop = easeOutBack(gq), tw2 = 0.85 + 0.15 * Math.sin(t * 0.008 + g2);
              ctx.globalCompositeOperation = 'lighter';
              ctx.drawImage(SPR.gold, gx - 0.25, gyy - 0.25, 0.5, 0.5);
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = g2 % 2 ? accent : '#FFF3C0';
              starPath(ctx, gx, gyy, 0.11 * pop * tw2, 0.45, g2 * 0.4); ctx.fill();
            }
            // posts down to the ground
            ctx.strokeStyle = hexA(GOLD, 0.7 * cq); ctx.lineWidth = 0.04;
            ctx.beginPath(); ctx.moveTo(-1.7, -1.0); ctx.lineTo(-1.7, 0); ctx.moveTo(1.7, -1.0); ctx.lineTo(1.7, 0); ctx.stroke();
            ctx.restore();
          }
        }

        // ─── glitter trail on the road ───
        ctx.globalCompositeOperation = 'lighter';
        if (t > r0) {
          var tailX = carX - R * 0.9;
          for (var gi2 = 0; gi2 < ground.length; gi2++) {
            var Gp = ground[gi2], gx2 = lerp(x0 - R * 0.9, xc - R * 0.9, Gp.u);
            if (gx2 > tailX) continue;
            var fresh = clamp01(1 - (tailX - gx2) / (travel * 1.2));
            var tw3 = 0.5 + 0.5 * Math.sin(t * 0.001 * Gp.tw + Gp.ph);
            var ga2 = (0.35 + 0.65 * fresh) * tw3 * appear;
            var gyy2 = gy + Gp.dy * R;
            sprite(glitSprites[Gp.k], gx2, gyy2, (7 + 4 * Gp.sz) * unit + 2, ga2);
            ctx.fillStyle = hexA('#FFFFFF', ga2); sparkPath(ctx, gx2, gyy2, (3.5 * Gp.sz) * unit + 1.2); ctx.fill();
          }
        }
        // glitter particles shed while rolling
        if (rq > 0 && rq < 1) {
          spawnAcc += dt / 16 * 2.4;
          while (spawnAcc >= 1) {
            spawnAcc -= 1;
            spawn(carX - R * rnd(0.6, 1.1), gy - R * rnd(0.1, 1.9), -rnd(0.1, 0.5) * R, -rnd(0.05, 0.3) * R, rnd(700, 1200), rnd(0.6, 1.2));
          }
        }
        for (var p2 = 0; p2 < POOL; p2++) {
          var P = parts[p2]; if (!P.on) continue;
          P.age += dt; if (P.age >= P.life) { P.on = false; continue; }
          P.vy += 0.6 * R * dt / 1000;
          P.x += P.vx * dt / 1000; P.y += P.vy * dt / 1000;
          var pa = (1 - P.age / P.life) * (0.6 + 0.4 * Math.sin(P.age * 0.02 + P.ph));
          sprite(glitSprites[P.k], P.x, P.y, (6 + 4 * P.sz) * unit + 2, pa);
          if (p2 % 2 === 0) { ctx.fillStyle = hexA('#FFFFFF', pa); sparkPath(ctx, P.x, P.y, 4 * P.sz * unit + 1.2); ctx.fill(); }
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── pumpkin (before the magic) ───
        var popP = easeOutBack(clamp01((t - ms(T.pop[0])) / (ms(T.pop[1]) - ms(T.pop[0]) + 1)));
        var s0t = ms(T.swirl[0]), s1t = ms(T.swirl[1]);
        if (t < mT + 150) {
          var jig = t > s0t ? Math.sin(t * 0.05) * 0.04 * clamp01((t - s0t) / (s1t - s0t)) : 0;
          var pa2 = 1 - clamp01((t - mT + 40) / 160), grow = 1 + 0.2 * clamp01((t - mT + 120) / 240);
          drawPumpkin(x0, gy, R * 0.95, popP * (1 + jig) * grow, popP * (1 - jig) * grow, pa2);
        }
        // the carriage
        if (t > mT - 40) {
          var cp = clamp01((t - mT + 40) / 380), csc = lerp(0.45, 1, easeOutBack(cp));
          drawCarriage(carX, gy - bob * R, R, csc, wheelRot, lean, sqy, t);
        }

        // ─── magic swirl into the pumpkin ───
        ctx.globalCompositeOperation = 'lighter';
        var pcx = x0, pcy = gy - R * 0.75;
        for (var sI = 0; sI < swirl.length; sI++) {
          var S = swirl[sI];
          var q = (t - s0t - S.d * (s1t - s0t)) / ((s1t - s0t) * 0.55);
          if (q <= 0 || q >= 1.05) continue;
          var qe = clamp01(q), rr = S.r * R * (1 - qe * qe), aa = S.a + qe * 5.5;
          var sx = pcx + Math.cos(aa) * rr, sy = pcy + Math.sin(aa) * rr * 0.65;
          var al = Math.min(1, q * 4) * (q > 0.95 ? (1.05 - q) * 10 : 1);
          sprite(glitSprites[S.k], sx, sy, (13 + 6 * S.sz) * unit + 3, al);
          ctx.fillStyle = hexA('#FFFFFF', al); sparkPath(ctx, sx, sy, (6 * S.sz) * unit + 2); ctx.fill();
          // short tail
          var ta = aa - 0.35, tr = S.r * R * (1 - Math.pow(clamp01(q - 0.06), 2));
          sprite(glitSprites[S.k], pcx + Math.cos(ta) * tr, pcy + Math.sin(ta) * tr * 0.65, (8 + 3 * S.sz) * unit + 2, al * 0.5);
        }
        // morph flash + poof of stars
        var fq = (t - mT + 80) / 520;
        if (fq > 0 && fq < 1) {
          var fr2 = R * (1.2 + fq * 1.6);
          var fg = ctx.createRadialGradient(pcx, pcy - R * 0.3, 0, pcx, pcy - R * 0.3, fr2);
          fg.addColorStop(0, hexA('#FFFFFF', 0.85 * (1 - fq))); fg.addColorStop(0.4, hexA(accent, 0.45 * (1 - fq))); fg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(pcx, pcy - R * 0.3, fr2, 0, TAU); ctx.fill();
          for (var pI = 0; pI < poof.length; pI++) {
            var PF = poof[pI], pr = R * PF.v * easeOut(fq);
            var px = pcx + Math.cos(PF.a) * pr, py = pcy - R * 0.3 + Math.sin(PF.a) * pr * 0.8;
            ctx.fillStyle = hexA(pI % 3 === 0 ? glow : pI % 3 === 1 ? accent : '#FFFFFF', 1 - fq);
            starPath(ctx, px, py, R * 0.09 * (1 - fq * 0.5), 0.45, pI); ctx.fill();
          }
        }
        // stop puff at the wheels
        var sq = tau / 600;
        if (sq > 0 && sq < 1) {
          for (var w2 = 0; w2 < 10; w2++) {
            var wa = Math.PI + (w2 / 9) * Math.PI, wr = R * (0.2 + sq * 0.6);
            var bx = carX + (w2 < 5 ? BW[0] : FW[0]) * R;
            ctx.fillStyle = hexA(w2 % 2 ? accent : '#FFFFFF', 0.9 * (1 - sq));
            sparkPath(ctx, bx + Math.cos(wa) * wr, gy + Math.sin(wa) * wr * 0.5, R * 0.06 * (1 - sq * 0.5)); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── super: glass slipper + firework arc ───
        if (isSuper) {
          var sl0 = ms(T.slipper[0]), sl1 = ms(T.slipper[1]);
          if (t > sl0) {
            var lq = clamp01((t - sl0) / (sl1 - sl0)), le = easeOut(lq);
            var L = R * 0.78, slx = xc + R * 1.42, sly = gy - (1 - le) * R * 1.6 - Math.sin(lq * Math.PI) * R * 0.15;
            var shine = (t - ms(T.shine)) / 650;
            drawSlipper(slx, sly, L, (1 - le) * -0.4, clamp01(lq * 3), shine, t);
            ctx.globalCompositeOperation = 'lighter';
            if (shine > 0.3 && shine < 1.6) {
              var sh = 1 - Math.abs(shine - 0.95) / 0.65;
              if (sh > 0) {
                ctx.fillStyle = hexA('#FFFFFF', sh);
                sparkPath(ctx, slx + L * 0.95, sly - L * 0.24, L * 0.28 * sh); ctx.fill();
                sparkPath(ctx, slx + L * 0.1, sly - L * 0.5, L * 0.16 * sh); ctx.fill();
              }
            }
            if (lq >= 1) {
              var sp = 0.5 + 0.5 * Math.sin(t * 0.006);
              ctx.fillStyle = hexA(glow, 0.8 * sp); sparkPath(ctx, slx + L * 0.5, sly - L * 0.6, L * 0.08); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // firework sparkle arc
          var a0 = ms(T.arc[0]), a1 = ms(T.arc[1]);
          if (t > a0) {
            var aq = easeInOut((t - a0) / (a1 - a0) * 1.25);
            var acx = xc, acy = gy - R * 1.3;
            var arx = Math.min(W * 0.43, R * 3.9), ary = Math.max(R * 0.8, Math.min(arx * 0.62, acy - H * 0.3));
            var A0 = Math.PI + 0.3, A1 = TAU - 0.3;
            ctx.globalCompositeOperation = 'lighter';
            var ND = 46;
            for (var d = 0; d < ND; d++) {
              var dq = d / (ND - 1); if (dq > aq) break;
              var da = lerp(A0, A1, dq), dx = acx + Math.cos(da) * arx, dy = acy + Math.sin(da) * ary;
              var dtw = 0.55 + 0.45 * Math.sin(t * 0.01 + d * 1.7);
              var fade = 1 - clamp01((t - a1 - 100) / 400);
              sprite(d % 3 === 0 ? SPR.prim : d % 3 === 1 ? SPR.gold : SPR.glow, dx, dy, 9 * unit + 3, 0.8 * dtw * fade);
              ctx.fillStyle = hexA('#FFFFFF', 0.85 * dtw * fade); sparkPath(ctx, dx, dy, 3.5 * unit + 1.2); ctx.fill();
            }
            for (var n2 = 0; n2 < nodes.length; n2++) {
              var N = nodes[n2], nt = a0 + N.q / 1.25 * (a1 - a0) * 0.98;
              // aq reaches N.q at ≈ that time (ease aside); burst lasts 800ms
              var bq = (t - nt) / 800;
              if (bq <= 0 || bq >= 1) continue;
              var na = lerp(A0, A1, N.q), nx = acx + Math.cos(na) * arx, ny = acy + Math.sin(na) * ary;
              var br = R * 0.75 * easeOut(bq);
              var bg = ctx.createRadialGradient(nx, ny, 0, nx, ny, R * 0.8);
              bg.addColorStop(0, hexA(N.col, 0.35 * (1 - bq))); bg.addColorStop(1, hexA(N.col, 0));
              ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(nx, ny, R * 0.8, 0, TAU); ctx.fill();
              for (var rI = 0; rI < N.rays.length; rI++) {
                var Ry = N.rays[rI], rx2 = nx + Math.cos(Ry.a) * br * Ry.v, ry2 = ny + Math.sin(Ry.a) * br * Ry.v + bq * bq * R * 0.35;
                ctx.fillStyle = hexA(rI % 2 ? N.col : '#FFFFFF', 1 - bq);
                sparkPath(ctx, rx2, ry2, R * 0.06 * (1 - bq * 0.6)); ctx.fill();
                ctx.strokeStyle = hexA(N.col, 0.5 * (1 - bq)); ctx.lineWidth = Math.max(1, 1.6 * unit);
                ctx.beginPath(); ctx.moveTo(nx + Math.cos(Ry.a) * br * Ry.v * 0.55, ny + Math.sin(Ry.a) * br * Ry.v * 0.55); ctx.lineTo(rx2, ry2); ctx.stroke();
              }
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

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
        SPR = null; glitSprites = null; parts = null;
      };
    }
  });
})();
