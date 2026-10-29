/* success-fairy-house.js — מסך הצלחה: בֵּית פְּטָרִיָּה שֶׁל פֵיָה 🍄
   בית פטרייה קטן (כובע אדום עם נקודות לבנות, דלת עגולה מעץ, חלון זוהר בכובע)
   צומח מתוך האדמה בקפיצה רכה; הדלת נפתחת ואור חם נשפך החוצה, ופיה זעירה
   וזוהרת (פונה אלינו: שתי עיניים, ידיים עם כף ואצבעות, שרביט עם כוכב) עפה
   החוצה בלולאה ומשאירה שובל של אבקת פיות, וחלונות הבית נדלקים אחד אחרי השני.
   בסופר: עוד בתי פטרייה צבעוניים צומחים במעגל, הפיה מקיפה אותם, ואבקת
   הפיות מתאספת לכוכב גדול שמתפוצץ לפרץ ניצוצות.
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

  var SKIN = '#FFE2CC', SKIN_D = '#E9B79C', HAIR = '#FFC76A', HAIR_D = '#D9913A';
  var WOOD = '#9A5A2E', WOOD_D = '#6B3A1C', FRAME = '#7A5A3C';

  window.SUCCESS.styles.push({
    name: 'fairy-house',
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

      var SPR = { gold: mkSprite('#FFE08A'), warm: mkSprite('#FFB648'), prim: mkSprite(primary), glow: mkSprite(glow), acc: mkSprite(accent) };
      var dustSprites = [SPR.gold, SPR.prim, SPR.glow, SPR.acc];

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { sprout: [0, 0.12], door: [0.11, 0.18], fly: [0.17, 0.33], orbit: [0.33, 0.6], rise: [0.6, 0.68],
            wins: [0.22, 0.28], txt: 0.3, gather: [0.6, 0.74], burst: 0.79, wave: [] }
        : { sprout: [0, 0.2], door: [0.21, 0.31], fly: [0.28, 0.74], orbit: null, rise: null,
            wins: [0.44, 0.53], txt: 0.42, gather: null, burst: null, wave: [0.76, 0.88] };
      function ms(f) { return f * dur; }

      // super: a ring of little mushroom houses (angle on the ellipse, cap colour, sprout time)
      var ring = [];
      if (isSuper) {
        var caps = ['#E0303A', primary, '#FF7FB4', glow, '#FF9A3C', accent];
        var angs = [-155, -25, 165, 15, 120, 60];
        for (var ri = 0; ri < angs.length; ri++) {
          ring.push({ a: angs[ri] * Math.PI / 180, cap: caps[ri], at: ms(0.17 + ri * 0.035), seed: ri });
        }
      }

      // background twinkles
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      // grass tufts along the mound (x in mound-half-widths, height scale)
      var tufts = [];
      for (var tf = 0; tf < (isSuper ? 22 : 12); tf++) tufts.push({ x: rnd(-1, 1), h: rnd(0.6, 1.1), ph: rnd(0, TAU), fl: Math.random() < 0.35 });
      // sprout dirt bits
      var dirt = [];
      for (var dd = 0; dd < 12; dd++) dirt.push({ a: -Math.PI / 2 + rnd(-1.2, 1.2), v: rnd(0.8, 1.6), r: rnd(0.03, 0.06), gold: dd % 3 === 0 });

      // fairy-dust particle pool (canvas only, no DOM)
      var POOL = 260, dust = [];
      for (var pi = 0; pi < POOL; pi++) dust.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, sz: 1, k: 0, ph: 0 });
      var dustNext = 0;
      function spawn(x, y, vx, vy, life, sz) {
        var p = dust[dustNext]; dustNext = (dustNext + 1) % POOL;
        p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.age = 0; p.life = life; p.sz = sz;
        p.k = (Math.random() * 4) | 0; p.ph = Math.random() * TAU;
      }
      // super: motes that gather into a big star then burst
      var motes = [];
      if (isSuper) {
        for (var mi = 0; mi < 50; mi++) motes.push({ k: mi, oa: rnd(0, TAU), jx: rnd(-0.3, 0.3), jy: rnd(-0.3, 0.3), d: rnd(0, 0.25),
                                                     bd: rnd(1.2, 2.4), ph: rnd(0, TAU), tw: rnd(4, 8), spr: mi % 4 });
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
      function tuft(x, y, h, ph, t, flower) {
        var sw = Math.sin(t * 0.003 + ph) * h * 0.12;
        ctx.strokeStyle = '#4FA860'; ctx.lineWidth = Math.max(1.2, h * 0.09);
        for (var b = -1; b <= 1; b++) {
          ctx.beginPath(); ctx.moveTo(x + b * h * 0.12, y);
          ctx.quadraticCurveTo(x + b * h * 0.2, y - h * 0.5, x + b * h * 0.35 + sw, y - h * (b === 0 ? 1 : 0.75)); ctx.stroke();
        }
        if (flower) {
          var fx = x + h * 0.35 + sw, fy = y - h * 0.8;
          ctx.fillStyle = '#FFB3D9';
          for (var f = 0; f < 5; f++) { var fa = f / 5 * TAU; ctx.beginPath(); ctx.arc(fx + Math.cos(fa) * h * 0.1, fy + Math.sin(fa) * h * 0.1, h * 0.08, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#FFE070'; ctx.beginPath(); ctx.arc(fx, fy, h * 0.07, 0, TAU); ctx.fill();
        }
      }
      function stemPath() {
        ctx.beginPath(); ctx.moveTo(-0.5, 0);
        ctx.bezierCurveTo(-0.58, -0.38, -0.46, -0.78, -0.4, -1.04);
        ctx.lineTo(0.4, -1.04);
        ctx.bezierCurveTo(0.46, -0.78, 0.58, -0.38, 0.5, 0);
        ctx.quadraticCurveTo(0, 0.07, -0.5, 0); ctx.closePath();
      }
      function capPath() {
        ctx.beginPath(); ctx.moveTo(-1.0, -0.98);
        ctx.bezierCurveTo(-1.02, -1.56, -0.52, -1.9, 0, -1.9);
        ctx.bezierCurveTo(0.52, -1.9, 1.02, -1.56, 1.0, -0.98);
        ctx.quadraticCurveTo(0.6, -0.9, 0, -1.06);
        ctx.quadraticCurveTo(-0.6, -0.9, -1.0, -0.98); ctx.closePath();
      }
      function roundWindow(x, y, r, L) {
        ctx.fillStyle = FRAME; ctx.beginPath(); ctx.arc(x, y, r + 0.035, 0, TAU); ctx.fill();
        var g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
        g.addColorStop(0, mixHex('#3A2C55', '#FFF6C8', L)); g.addColorStop(1, mixHex('#22183A', '#FFB648', L));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = FRAME; ctx.lineWidth = 0.022;
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * L).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(x - r * 0.45, y - r * 0.45, r * 0.22, r * 0.12, -0.7, 0, TAU); ctx.fill();
        if (L > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          sprite(SPR.warm, x, y, r * 4.2, 0.75 * L);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // house in local units (1 = S px); origin = middle of the stem's base on the ground
      function drawHouse(x, y, S, g, doorA, L1, L2, Lc, capCol, t, phase) {
        if (g <= 0) return;
        var gy2 = easeOutBack(g), gx2 = lerp(0.5, 1, easeOut(g)) * (1 + 0.07 * Math.sin(g * Math.PI * 3) * (1 - g));
        ctx.save(); ctx.translate(x, y); ctx.scale(S * gx2, S * gy2);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // shadow on the ground
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.75, 0.1, 0, 0, TAU); ctx.fill();
        // stem
        var sg = ctx.createLinearGradient(-0.55, 0, 0.55, 0);
        sg.addColorStop(0, '#FFF6E4'); sg.addColorStop(0.55, '#F6E2C0'); sg.addColorStop(1, '#D9B98C');
        stemPath(); ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = 0.03; ctx.stroke();
        ctx.strokeStyle = 'rgba(160,120,80,.25)'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(-0.36, -0.9); ctx.quadraticCurveTo(-0.44, -0.5, -0.38, -0.08);
        ctx.moveTo(0.38, -0.86); ctx.quadraticCurveTo(0.46, -0.5, 0.4, -0.1); ctx.stroke();
        // round door (hinge on the left; opens toward us)
        var dr = 0.22, dcx = 0, dcy = -0.3;
        ctx.fillStyle = FRAME; ctx.beginPath(); ctx.arc(dcx, dcy, dr + 0.045, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B38A62';
        for (var st = 0; st < 10; st++) {
          var sa = st / 10 * TAU + 0.3;
          ctx.beginPath(); ctx.ellipse(dcx + Math.cos(sa) * (dr + 0.03), dcy + Math.sin(sa) * (dr + 0.03), 0.032, 0.022, sa, 0, TAU); ctx.fill();
        }
        if (doorA > 0) {
          var ig = ctx.createRadialGradient(dcx, dcy, 0, dcx, dcy, dr);
          ig.addColorStop(0, '#FFF6C4'); ig.addColorStop(0.55, '#FFC560'); ig.addColorStop(1, '#C8701E');
          ctx.fillStyle = ig;
        } else ctx.fillStyle = '#3A2416';
        ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, TAU); ctx.fill();
        var ca = Math.cos(doorA * 1.3), prx = Math.max(0.006, dr * ca), pcx = dcx - dr + prx;
        var dg = ctx.createLinearGradient(pcx - prx, 0, pcx + prx, 0);
        dg.addColorStop(0, '#B8743E'); dg.addColorStop(1, WOOD);
        ctx.save();
        ctx.beginPath(); ctx.ellipse(pcx, dcy, prx, dr, 0, 0, TAU);
        ctx.fillStyle = dg; ctx.fill();
        ctx.clip();
        ctx.strokeStyle = WOOD_D; ctx.lineWidth = 0.016;
        for (var pk = -1; pk <= 1; pk++) { ctx.beginPath(); ctx.moveTo(pcx + pk * prx * 0.5, dcy - dr); ctx.lineTo(pcx + pk * prx * 0.5, dcy + dr); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = WOOD_D; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.ellipse(pcx, dcy, prx, dr, 0, 0, TAU); ctx.stroke();
        if (ca > 0.15) { ctx.fillStyle = '#FFD24A'; ctx.beginPath(); ctx.arc(pcx + prx * 0.62, dcy + 0.02, 0.028, 0, TAU); ctx.fill(); }
        if (doorA > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          sprite(SPR.warm, dcx + 0.05, dcy, 0.75, 0.55 * doorA);
          var lg = ctx.createRadialGradient(0.1, 0.03, 0, 0.1, 0.03, 0.6);
          lg.addColorStop(0, hexA('#FFC860', 0.45 * doorA)); lg.addColorStop(1, hexA('#FFC860', 0));
          ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0.1, 0.03, 0.6, 0.12, 0, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        // stem windows
        roundWindow(0.27, -0.76, 0.095, L1);
        roundWindow(-0.27, -0.8, 0.08, L2);
        // little flower box under the right window
        ctx.fillStyle = WOOD; ctx.fillRect(0.17, -0.65, 0.2, 0.05);
        ctx.fillStyle = '#FF8EC4'; ctx.beginPath(); ctx.arc(0.21, -0.665, 0.022, 0, TAU); ctx.arc(0.33, -0.665, 0.022, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFE070'; ctx.beginPath(); ctx.arc(0.27, -0.67, 0.022, 0, TAU); ctx.fill();
        // gills under the cap
        ctx.fillStyle = '#F2DDBE'; ctx.beginPath(); ctx.ellipse(0, -1.0, 0.92, 0.12, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(150,110,70,.45)'; ctx.lineWidth = 0.014;
        for (var gl = -6; gl <= 6; gl++) { ctx.beginPath(); ctx.moveTo(gl * 0.045, -1.0); ctx.lineTo(gl * 0.14, -0.9 + Math.abs(gl) * 0.005); ctx.stroke(); }
        // cap
        var cg = ctx.createRadialGradient(-0.35, -1.62, 0.05, 0, -1.35, 1.15);
        cg.addColorStop(0, mixHex(capCol, '#FFFFFF', 0.38)); cg.addColorStop(0.5, capCol); cg.addColorStop(1, mixHex(capCol, '#2A0A18', 0.42));
        capPath(); ctx.fillStyle = cg; ctx.fill();
        ctx.strokeStyle = mixHex(capCol, '#1A0510', 0.55); ctx.lineWidth = 0.035; ctx.stroke();
        ctx.save(); capPath(); ctx.clip();
        var dots = [[-0.6, -1.3, 0.12], [0.24, -1.7, 0.12], [-0.3, -1.7, 0.08], [0.58, -1.34, 0.12], [0.86, -1.1, 0.065], [-0.88, -1.08, 0.065], [0.36, -1.1, 0.06], [-0.38, -1.08, 0.05]];
        for (var di = 0; di < dots.length; di++) {
          var d = dots[di];
          ctx.fillStyle = '#FFF8F0'; ctx.beginPath(); ctx.ellipse(d[0], d[1], d[2], d[2] * 0.82, d[0] * 0.5, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(200,170,170,.35)'; ctx.beginPath(); ctx.ellipse(d[0] + d[2] * 0.25, d[1] + d[2] * 0.25, d[2] * 0.6, d[2] * 0.45, 0, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-0.42, -1.62, 0.3, 0.1, -0.55, 0, TAU); ctx.fill();
        ctx.restore();
        // the attic window that glows from the start
        roundWindow(-0.05, -1.34, 0.12, Lc * (0.85 + 0.15 * Math.sin(t * 0.009 + phase)));
        ctx.restore();
      }

      // the fairy, facing us (two eyes); local units = f px
      function hand(hx, hy, dir, grip) {
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hx, hy, 0.045, 0, TAU); ctx.fill();
        ctx.strokeStyle = SKIN; ctx.lineWidth = 0.026;
        if (grip) {
          for (var g = 0; g < 3; g++) { ctx.beginPath(); ctx.arc(hx + 0.012, hy - 0.025 + g * 0.025, 0.03, -1.2, 1.2); ctx.stroke(); }
        } else {
          for (var i = 0; i < 4; i++) {
            var a = dir + (i - 1.5) * 0.34;
            ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 0.03, hy + Math.sin(a) * 0.03); ctx.lineTo(hx + Math.cos(a) * 0.082, hy + Math.sin(a) * 0.082); ctx.stroke();
          }
          var ta = dir + 1.15;
          ctx.beginPath(); ctx.moveTo(hx + Math.cos(ta) * 0.03, hy + Math.sin(ta) * 0.03); ctx.lineTo(hx + Math.cos(ta) * 0.068, hy + Math.sin(ta) * 0.068); ctx.stroke();
        }
      }
      function drawFairy(x, y, f, t, tilt, alpha) {
        if (alpha <= 0 || f <= 0) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(f, f);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85 * alpha; ctx.drawImage(SPR.gold, -1.3, -1.55, 2.6, 2.6);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        // wings (behind)
        var fl = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.035));
        for (var side = -1; side <= 1; side += 2) {
          ctx.save(); ctx.translate(0, -0.12); ctx.scale(side * fl, 1);
          ctx.fillStyle = hexA(glow, 0.38); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.ellipse(0.33, -0.2, 0.33, 0.18, -0.55, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = hexA(primary, 0.35);
          ctx.beginPath(); ctx.ellipse(0.25, 0.07, 0.2, 0.11, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.012;
          ctx.beginPath(); ctx.moveTo(0.03, -0.02); ctx.quadraticCurveTo(0.25, -0.18, 0.5, -0.32); ctx.stroke();
          ctx.restore();
        }
        // legs + shoes
        ctx.strokeStyle = SKIN; ctx.lineWidth = 0.055;
        ctx.beginPath(); ctx.moveTo(-0.07, 0.3); ctx.lineTo(-0.09, 0.47); ctx.moveTo(0.07, 0.3); ctx.lineTo(0.1, 0.45); ctx.stroke();
        ctx.fillStyle = mixHex(primary, '#000000', 0.25);
        ctx.beginPath(); ctx.ellipse(-0.1, 0.49, 0.05, 0.03, 0.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.11, 0.47, 0.05, 0.03, -0.2, 0, TAU); ctx.fill();
        // dress
        var dg = ctx.createLinearGradient(0, -0.16, 0, 0.38);
        dg.addColorStop(0, mixHex(primary, '#FFFFFF', 0.5)); dg.addColorStop(1, primary);
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.moveTo(-0.1, -0.17); ctx.lineTo(0.1, -0.17);
        ctx.quadraticCurveTo(0.15, 0.1, 0.3, 0.33);
        for (var sc = 0; sc < 4; sc++) { var hx0 = 0.3 - sc * 0.15; ctx.quadraticCurveTo(hx0 - 0.075, 0.43, hx0 - 0.15, 0.33); }
        ctx.quadraticCurveTo(-0.15, 0.1, -0.1, -0.17); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = mixHex(primary, '#000000', 0.3); ctx.lineWidth = 0.018; ctx.stroke();
        ctx.fillStyle = accent; ctx.fillRect(-0.11, -0.07, 0.22, 0.04);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        [[-0.12, 0.2], [0.08, 0.12], [0.16, 0.27], [-0.02, 0.29]].forEach(function (p) { sparkPath(ctx, p[0], p[1], 0.03); ctx.fill(); });
        // arms: right one holds the wand up, left one waves
        var wv = Math.sin(t * 0.012) * 0.06;
        ctx.strokeStyle = SKIN; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.moveTo(0.09, -0.12); ctx.quadraticCurveTo(0.24, -0.08, 0.27, -0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.09, -0.12); ctx.quadraticCurveTo(-0.22, -0.1, -0.27, -0.27 + wv); ctx.stroke();
        // wand
        ctx.strokeStyle = '#FFE9A8'; ctx.lineWidth = 0.028;
        ctx.beginPath(); ctx.moveTo(0.25, -0.18); ctx.lineTo(0.37, -0.6); ctx.stroke();
        hand(0.27, -0.25, -1.3, true);
        hand(-0.27, -0.27 + wv, -1.9, false);
        var tw = 0.8 + 0.2 * Math.sin(t * 0.02);
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(SPR.acc, 0.37 - 0.3, -0.62 - 0.3, 0.6, 0.6); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = accent; starPath(ctx, 0.37, -0.62, 0.1 * tw, 0.45, t * 0.003); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0.37, -0.62, 0.03, 0, TAU); ctx.fill();
        // hair behind the head
        ctx.fillStyle = HAIR;
        ctx.beginPath(); ctx.ellipse(0, -0.41, 0.25, 0.24, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-0.2, -0.28, 0.07, 0.11, 0.3, 0, TAU); ctx.ellipse(0.2, -0.28, 0.07, 0.11, -0.3, 0, TAU); ctx.fill();
        // pointy ears
        ctx.fillStyle = SKIN;
        ctx.beginPath(); ctx.moveTo(-0.18, -0.44); ctx.lineTo(-0.3, -0.47); ctx.lineTo(-0.18, -0.36); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0.18, -0.44); ctx.lineTo(0.3, -0.47); ctx.lineTo(0.18, -0.36); ctx.closePath(); ctx.fill();
        // face
        var hg = ctx.createRadialGradient(-0.05, -0.45, 0.02, 0, -0.4, 0.21);
        hg.addColorStop(0, '#FFF1E6'); hg.addColorStop(1, SKIN);
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -0.4, 0.2, 0, TAU); ctx.fill();
        // bangs + bun
        ctx.fillStyle = HAIR;
        ctx.beginPath(); ctx.moveTo(-0.21, -0.42);
        ctx.bezierCurveTo(-0.22, -0.66, 0.22, -0.66, 0.21, -0.42);
        ctx.quadraticCurveTo(0.16, -0.5, 0.1, -0.47); ctx.quadraticCurveTo(0.05, -0.54, -0.02, -0.48);
        ctx.quadraticCurveTo(-0.1, -0.54, -0.14, -0.47); ctx.quadraticCurveTo(-0.18, -0.5, -0.21, -0.42); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -0.66, 0.085, 0, TAU); ctx.fill();
        ctx.strokeStyle = HAIR_D; ctx.lineWidth = 0.014;
        ctx.beginPath(); ctx.arc(0, -0.66, 0.05, 0.4, 2.6); ctx.stroke();
        ctx.fillStyle = '#FF8EC4';
        for (var fp = 0; fp < 5; fp++) { var fa = fp / 5 * TAU; ctx.beginPath(); ctx.arc(0.1 + Math.cos(fa) * 0.03, -0.6 + Math.sin(fa) * 0.03, 0.024, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#FFE070'; ctx.beginPath(); ctx.arc(0.1, -0.6, 0.018, 0, TAU); ctx.fill();
        // eyes (two — she faces us)
        var bl = (t % 2300) < 120 ? 0.15 : 1;
        for (var e = -1; e <= 1; e += 2) {
          ctx.fillStyle = '#2A1B3D';
          ctx.beginPath(); ctx.ellipse(e * 0.075, -0.37, 0.03, 0.042 * bl, 0, 0, TAU); ctx.fill();
          if (bl > 0.5) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(e * 0.075 - 0.01, -0.385, 0.012, 0, TAU); ctx.fill(); }
          ctx.strokeStyle = '#2A1B3D'; ctx.lineWidth = 0.012;
          ctx.beginPath(); ctx.moveTo(e * 0.1, -0.395); ctx.lineTo(e * 0.125, -0.41); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,120,160,.45)';
        ctx.beginPath(); ctx.ellipse(-0.13, -0.31, 0.04, 0.025, 0, 0, TAU); ctx.ellipse(0.13, -0.31, 0.04, 0.025, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#B0405A'; ctx.lineWidth = 0.018;
        ctx.beginPath(); ctx.arc(0, -0.32, 0.045, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
        ctx.restore();
      }

      function bezier(p0, p1, p2, p3, u) {
        var v = 1 - u;
        return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
      }

      var G = {};   // per-frame geometry
      function geom() {
        G.s = isSuper ? Math.min(W * 0.17, H * 0.19) : Math.min(W * 0.28, H * 0.22);
        G.gy = H * (isSuper ? (W < H ? 0.72 : 0.8) : (W < H ? 0.72 : 0.82));
        G.cx = W / 2;
        G.hs = Math.min(G.s, W * 0.2);                    // horizontal scale for flight paths
        G.rx = Math.min(W * 0.38, G.s * 2.9);
        G.ry = G.s * 0.36;
      }
      // fairy position at time t → {x, y, f, a, behind}
      function fairyAt(t) {
        var s = G.s, cx = G.cx, gy = G.gy, hs = G.hs, f = s * (isSuper ? 0.42 : 0.34);
        var f0 = ms(T.fly[0]), f1 = ms(T.fly[1]);
        if (t < f0) return null;
        var doorX = cx, doorY = gy - 0.3 * s;
        var grow = clamp01((t - f0) / (dur * 0.07));
        var out = { f: f * lerp(0.25, 1, easeOut(grow)), a: clamp01(grow * 3), behind: false };
        if (!isSuper) {
          var u = easeInOut(clamp01((t - f0) / (f1 - f0)));
          var ex = cx + 1.45 * hs, ey = gy - 1.95 * s;
          var bx = bezier(doorX, cx - 2.1 * hs, cx - 1.2 * hs, ex, u), by = bezier(doorY, gy - 0.9 * s, gy - 2.6 * s, ey, u);
          var lq = clamp01((u - 0.42) / 0.36), th = easeInOut(lq) * TAU, rho = 0.5 * Math.min(s, hs * 1.3);
          out.x = bx + rho * Math.sin(th); out.y = by + rho * (1 - Math.cos(th));
          if (t > f1) { out.x = ex + Math.sin((t - f1) * 0.004) * s * 0.06; out.y = ey + Math.sin((t - f1) * 0.006) * s * 0.08; }
          return out;
        }
        var ocx = cx, ocy = gy - 1.15 * s, orx = G.rx * 1.08, ory = G.ry * 1.25 + s * 0.15;
        var o0 = ms(T.orbit[0]), o1 = ms(T.orbit[1]), r1 = ms(T.rise[1]);
        var startA = Math.PI;
        if (t < o0) {
          var u2 = easeInOut((t - f0) / (o0 - f0));
          var sx2 = ocx + Math.cos(startA) * orx, sy2 = ocy + Math.sin(startA) * ory;
          out.x = bezier(doorX, cx + 0.3 * s, cx - 0.6 * orx, sx2, u2); out.y = bezier(doorY, gy - 1.6 * s, gy - 2.1 * s, sy2, u2);
          return out;
        }
        if (t < o1) {
          var th2 = startA + TAU * 1.25 * easeInOut((t - o0) / (o1 - o0));
          out.x = ocx + Math.cos(th2) * orx; out.y = ocy + Math.sin(th2) * ory + Math.sin(th2 * 3) * s * 0.06;
          out.behind = Math.sin(th2) < -0.15;
          out.f *= lerp(1, 0.82, clamp01(-Math.sin(th2)));
          return out;
        }
        var endA = startA + TAU * 1.25;
        var sx3 = ocx + Math.cos(endA) * orx, sy3 = ocy + Math.sin(endA) * ory;
        var u3 = easeInOut((t - o1) / (r1 - o1));
        var tx = G.starX + G.starR * 0.05, ty = G.starY + G.starR * 0.15;
        out.x = bezier(sx3, sx3, tx - G.starR * 0.4, tx, u3); out.y = bezier(sy3, sy3 - s * 0.6, ty + s * 0.4, ty, u3);
        if (t > r1) { out.x = tx + Math.sin((t - r1) * 0.004) * s * 0.05; out.y = ty + Math.sin((t - r1) * 0.006) * s * 0.06; }
        return out;
      }
      function starPoint(q) {        // q 0..1 along the star outline
        var seg = q * 10, i = Math.floor(seg) % 10, fr = seg - Math.floor(seg);
        function v(k) { var a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? G.starR * 0.46 : G.starR; return [G.starX + Math.cos(a) * r, G.starY + Math.sin(a) * r]; }
        var A = v(i), B = v(i + 1);
        return { x: lerp(A[0], B[0], fr), y: lerp(A[1], B[1], fr) };
      }

      var raf = 0, killed = false, t0 = performance.now(), lastT = 0, spawnAcc = 0;
      function frame(now) {
        if (killed) return;
        var t = now - t0, dt = Math.min(50, Math.max(0, t - lastT)); lastT = t;
        var gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        geom();
        var s = G.s, cx = G.cx, gy = G.gy;
        G.starR = Math.min(W * 0.2, s * 0.9, H * 0.11);
        G.starX = cx; G.starY = Math.max(H * 0.24 + G.starR, gy - 2.4 * s);
        var appear = clamp01(t / 260);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // mossy mound (translucent; no opaque backdrop)
        var mrx = isSuper ? G.rx + s * 1.0 : s * 1.7, mry = isSuper ? G.ry + s * 0.3 : s * 0.3;
        var mg = ctx.createRadialGradient(cx, gy + mry * 0.2, 0, cx, gy + mry * 0.2, mrx);
        mg.addColorStop(0, hexA('#3E8A55', 0.55 * appear)); mg.addColorStop(0.7, hexA('#2C6A44', 0.35 * appear)); mg.addColorStop(1, hexA('#1E4A30', 0));
        ctx.save(); ctx.translate(cx, gy + mry * 0.2); ctx.scale(1, mry / mrx);
        ctx.fillStyle = mg; ctx.translate(-cx, -(gy + mry * 0.2));
        ctx.beginPath(); ctx.arc(cx, gy + mry * 0.2, mrx, 0, TAU); ctx.fill(); ctx.restore();
        ctx.strokeStyle = hexA('#9BE59A', 0.3 * appear); ctx.lineWidth = Math.max(1.5, 3 * unit);
        ctx.beginPath(); ctx.ellipse(cx, gy + mry * 0.2, mrx * 0.8, mry * 0.9, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        // back tufts
        for (var tb = 0; tb < tufts.length; tb++) if (tufts[tb].x * 0 + tb % 2 === 0) {
          var tu = tufts[tb]; tuft(cx + tu.x * mrx * 0.85, gy - mry * 0.35 * Math.sqrt(1 - tu.x * tu.x), s * 0.22 * tu.h * appear, tu.ph, t, tu.fl);
        }

        // sprout dirt
        var sp0 = ms(T.sprout[0]), sp1 = ms(T.sprout[1]), g = clamp01((t - sp0) / (sp1 - sp0));
        var dq = t / 700;
        if (dq < 1) {
          for (var di = 0; di < dirt.length; di++) {
            var D = dirt[di], dtq = dq * 0.7;
            var px = cx + Math.cos(D.a) * D.v * s * dtq * 1.4, py = gy + Math.sin(D.a) * D.v * s * dtq * 1.6 + 3.2 * s * dtq * dtq;
            ctx.fillStyle = D.gold ? hexA(accent, 1 - dq) : hexA('#7A5232', 1 - dq);
            if (D.gold) { sparkPath(ctx, px, py, D.r * s * 1.3); ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(px, py, D.r * s, 0, TAU); ctx.fill(); }
          }
        }

        var doorA = easeOutBack(clamp01((t - ms(T.door[0])) / (ms(T.door[1]) - ms(T.door[0]))));
        doorA = Math.min(doorA, 1.08);
        var L1 = easeOut((t - ms(T.wins[0])) / 260), L2 = easeOut((t - ms(T.wins[1])) / 260);
        var flick = 0.9 + 0.1 * Math.sin(t * 0.011);

        var fr = fairyAt(t), frPrev = fairyAt(Math.max(0, t - 40));
        // ring houses behind
        var mainCap = '#E0303A';
        function ringHouse(R) {
          var hx = cx + Math.cos(R.a) * G.rx, hy = gy + Math.sin(R.a) * G.ry;
          var depth = (Math.sin(R.a) + 1) / 2, sc = s * lerp(0.48, 0.66, depth);
          var rg = clamp01((t - R.at) / (dur * 0.12));
          var rl = easeOut((t - R.at - dur * 0.1) / 260) * flick;
          drawHouse(hx, hy, sc, rg, 0, rl, rl, rg > 0 ? 0.9 : 0, R.cap, t, R.seed);
          if (rg > 0 && rg < 1) {
            ctx.globalCompositeOperation = 'lighter';
            sprite(SPR.gold, hx, hy - sc * 0.4, sc * 1.4, 0.6 * (1 - rg));
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        for (var rb = 0; rb < ring.length; rb++) if (Math.sin(ring[rb].a) < 0) ringHouse(ring[rb]);
        if (fr && fr.behind) drawFairyNow();

        // main house
        drawHouse(cx, gy, s, g, doorA, L1 * flick, L2 * flick, 1, mainCap, t, 0);
        if (g > 0 && g < 1) {
          ctx.globalCompositeOperation = 'lighter';
          sprite(SPR.gold, cx, gy - s * 0.5, s * 2 * (0.5 + g), 0.45 * (1 - g));
          ctx.globalCompositeOperation = 'source-over';
        }
        for (var rf = 0; rf < ring.length; rf++) if (Math.sin(ring[rf].a) >= 0) ringHouse(ring[rf]);
        // front tufts
        for (var tf2 = 0; tf2 < tufts.length; tf2++) if (tf2 % 2 === 1) {
          var tv = tufts[tf2]; tuft(cx + tv.x * mrx * 0.9, gy + mry * 0.55 * Math.sqrt(1 - tv.x * tv.x), s * 0.2 * tv.h * appear, tv.ph, t, tv.fl);
        }

        // ─── fairy dust trail ───
        if (fr && fr.a > 0.3 && t < dur - 150) {
          var moving = frPrev && (Math.abs(fr.x - frPrev.x) + Math.abs(fr.y - frPrev.y)) > 2;
          spawnAcc += dt / 16 * (moving ? 2.6 : 0.8);
          while (spawnAcc >= 1) {
            spawnAcc -= 1;
            var fromWand = Math.random() < 0.4;
            var ox = fromWand ? fr.f * 0.37 : rnd(-0.25, 0.25) * fr.f, oy = fromWand ? -fr.f * 0.62 : fr.f * rnd(0.2, 0.4);
            spawn(fr.x + ox, fr.y + oy, rnd(-0.02, 0.02) * s, rnd(0.01, 0.05) * s, rnd(700, 1200), rnd(0.6, 1.2));
          }
        }
        ctx.globalCompositeOperation = 'lighter';
        for (var pi2 = 0; pi2 < POOL; pi2++) {
          var p = dust[pi2]; if (!p.on) continue;
          p.age += dt; if (p.age >= p.life) { p.on = false; continue; }
          p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000;
          var lq2 = p.age / p.life, al = (1 - lq2) * (0.6 + 0.4 * Math.sin(p.age * 0.02 + p.ph));
          sprite(dustSprites[p.k], p.x, p.y, (5 + 4 * p.sz) * unit + 2, al);
          if (p.k === 0 || pi2 % 3 === 0) { ctx.fillStyle = hexA('#FFFFFF', al); sparkPath(ctx, p.x, p.y, (4 * p.sz) * unit + 1.5); ctx.fill(); }
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── super: motes gather into a star, then burst ───
        if (isSuper) {
          var o0 = ms(T.orbit[0]), o1 = ms(T.orbit[1]), ga0 = ms(T.gather[0]), ga1 = ms(T.gather[1]), bT = ms(T.burst);
          var orx = G.rx * 1.08, ory = G.ry * 1.25 + s * 0.15, ocy = gy - 1.15 * s;
          ctx.globalCompositeOperation = 'lighter';
          if (t > ga1 - 200 && t < bT + 300) {
            var hq = clamp01((t - ga1 + 200) / 300) * (1 - clamp01((t - bT) / 300));
            var hg = ctx.createRadialGradient(G.starX, G.starY, 0, G.starX, G.starY, G.starR * 1.5);
            hg.addColorStop(0, hexA(accent, 0.3 * hq)); hg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(G.starX, G.starY, G.starR * 1.5, 0, TAU); ctx.fill();
          }
          for (var m = 0; m < motes.length; m++) {
            var M = motes[m];
            var born = o0 + (M.k / motes.length) * (o1 - o0) * 0.9;
            if (t < born) continue;
            var oa = Math.PI + TAU * 1.25 * easeInOut((born - o0) / (o1 - o0)) + M.oa * 0.05;
            var mx = cx + Math.cos(oa) * orx + M.jx * s + Math.sin((t - born) * 0.002 + M.ph) * s * 0.12;
            var my = ocy + Math.sin(oa) * ory + M.jy * s * 0.6 + Math.cos((t - born) * 0.0017 + M.ph) * s * 0.1;
            var gq = easeInOut((t - ga0 - M.d * (ga1 - ga0)) / ((ga1 - ga0) * 0.75));
            var sp = starPoint(M.k / motes.length);
            mx = lerp(mx, sp.x, gq); my = lerp(my, sp.y, gq);
            var ma = clamp01((t - born) / 200), msz = 1;
            if (t > bT) {
              var bq = (t - bT) / 1100;
              var ba = Math.atan2(sp.y - G.starY, sp.x - G.starX), bd = easeOut(bq) * M.bd * G.starR * 1.4;
              mx = sp.x + Math.cos(ba) * bd; my = sp.y + Math.sin(ba) * bd + bq * bq * s * 0.5;
              ma *= 1 - clamp01((bq - 0.4) / 0.6); msz = 1 + 0.4 * (1 - bq);
            }
            var tw = 0.6 + 0.4 * Math.sin(t * 0.001 * M.tw + M.ph);
            sprite(dustSprites[M.spr], mx, my, (12 + 6 * tw) * unit * msz + 3, ma * (0.7 + 0.3 * tw));
            ctx.fillStyle = hexA('#FFFFFF', ma * 0.95); sparkPath(ctx, mx, my, (5 + 3 * tw) * unit * msz + 1.5); ctx.fill();
          }
          // the burst flash + rays
          var fq = (t - bT) / 650;
          if (fq > 0 && fq < 1) {
            var fg = ctx.createRadialGradient(G.starX, G.starY, 0, G.starX, G.starY, G.starR * 2.4);
            fg.addColorStop(0, hexA('#FFF4C0', 0.55 * (1 - fq))); fg.addColorStop(1, hexA('#FFF4C0', 0));
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(G.starX, G.starY, G.starR * 2.4, 0, TAU); ctx.fill();
            ctx.strokeStyle = hexA(accent, 0.7 * (1 - fq)); ctx.lineWidth = Math.max(1.5, 3 * unit);
            for (var ry = 0; ry < 12; ry++) {
              var ra = ry / 12 * TAU + 0.13, r0 = G.starR * (0.4 + fq * 1.2), r1 = r0 + G.starR * 0.35 * (1 - fq);
              ctx.beginPath(); ctx.moveTo(G.starX + Math.cos(ra) * r0, G.starY + Math.sin(ra) * r0); ctx.lineTo(G.starX + Math.cos(ra) * r1, G.starY + Math.sin(ra) * r1); ctx.stroke();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        if (fr && !fr.behind) drawFairyNow();

        // ─── wand sparkle bursts at the end (normal) ───
        if (fr) {
          ctx.globalCompositeOperation = 'lighter';
          for (var wi = 0; wi < T.wave.length; wi++) {
            var wq = (t - ms(T.wave[wi])) / 650;
            if (wq <= 0 || wq >= 1) continue;
            var wx = fr.x + fr.f * 0.37, wy = fr.y - fr.f * 0.62;
            for (var wk = 0; wk < 12; wk++) {
              var wa = wk / 12 * TAU + wi * 0.26, wr = s * (0.12 + wq * 0.7);
              ctx.fillStyle = hexA(wk % 3 === 0 ? glow : wk % 3 === 1 ? accent : '#FFFFFF', 1 - wq);
              sparkPath(ctx, wx + Math.cos(wa) * wr, wy + Math.sin(wa) * wr, s * 0.06 * (1 - wq * 0.5)); ctx.fill();
            }
            ctx.strokeStyle = hexA(accent, 0.6 * (1 - wq)); ctx.lineWidth = Math.max(1, 2 * unit);
            ctx.beginPath(); ctx.arc(wx, wy, s * (0.08 + wq * 0.5), 0, TAU); ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        function drawFairyNow() {
          var tilt = 0;
          if (frPrev) tilt = Math.max(-0.35, Math.min(0.35, (fr.x - frPrev.x) / (s * 0.25) * 0.35));
          drawFairy(fr.x, fr.y, fr.f, t, tilt, fr.a);
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
        SPR = null; dustSprites = null; dust = null;
      };
    }
  });
})();
