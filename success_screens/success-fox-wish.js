/* success-fox-wish.js — מסך הצלחה: שׁוּעָלָה וְכוֹכָב 🦊
   שועלה כתומה וחמודה יושבת על גבעה מתחת לשמי לילה; כוכבים נופלים חוצים את
   השמיים והיא עוקבת אחריהם בראש. ואז כוכב זהב צונח לאט היישר לכפותיה, היא
   מחבקת אותו, הוא זוהר ומתפוצץ לטבעת של כוכבים קטנים. בסופר: מטר כוכבים
   שלם, ופרץ לבבות וכוכבים עם נצנצים נושרים.
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

  window.SUCCESS.styles.push({
    name: 'fox-wish',
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
      for (var bs = 0; bs < (isSuper ? 44 : 30); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.7, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // shooting stars (normalised start + direction); the fox's head follows them
      var CATCH = isSuper ? 0.52 : 0.5;          // when the golden star lands in her paws
      var shooters = [], nSh = isSuper ? 9 : 3;
      for (var s = 0; s < nSh; s++) {
        var fromLeft = s % 2 === 0;
        shooters.push({ at: 0.03 + s * ((isSuper ? 0.42 : 0.3) / nSh) + rnd(0, 0.02), len: isSuper ? 0.13 : 0.16,
                        x0: fromLeft ? rnd(-0.05, 0.3) : rnd(0.7, 1.05), y0: rnd(0.04, 0.3),
                        dx: fromLeft ? 1 : -1, ang: rnd(0.3, 0.5), col: [accent, '#FFFFFF', glow, primary][s % 4] });
      }
      // burst: a ring of little stars (normal) / hearts + stars + glitter (super)
      var ring = [], nR = isSuper ? 30 : 14;
      for (var r = 0; r < nR; r++)
        ring.push({ a: r / nR * TAU + rnd(-0.1, 0.1), sp: isSuper ? rnd(380, 640) : rnd(300, 360), kind: isSuper && r % 2 ? 'heart' : 'star',
                    col: [accent, '#FFFFFF', primary, glow, '#FF8FC8'][r % 5], sz: rnd(10, 17), rot: rnd(0, TAU) });
      var glitter = [];
      if (isSuper) for (var gI = 0; gI < 40; gI++) glitter.push({ x: rnd(-0.45, 0.45), at: rnd(0, 0.25), sp: rnd(0.12, 0.22), ph: rnd(0, TAU), col: [accent, '#FFFFFF', glow][gI % 3] });
      var tufts = [];
      for (var tI = 0; tI < 22; tI++) tufts.push({ x: tI / 21 + rnd(-0.015, 0.015), h: rnd(0.6, 1.2) });

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
      var txtAt = dur * (CATCH + 0.06);
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

      var FUR = '#F28C38', FUR_D = '#D9692A', CREAM = '#FFF4E6', INK = '#2A1A22';
      // front-view fox sitting at (bx, by) = base centre; look -1..1 turns the head; hug 0..1 raises the paws
      function fox(bx, by, F, t, look, hug, happy) {
        // fluffy tail (behind), swaying, white tip
        ctx.save();
        ctx.translate(bx + F * 0.35, by - F * 0.2);
        ctx.rotate(Math.sin(t * 0.004) * 0.09);
        ctx.beginPath();
        ctx.moveTo(-F * 0.1, F * 0.12);
        ctx.bezierCurveTo(F * 1.35, F * 0.2, F * 1.45, -F * 0.95, F * 0.85, -F * 1.5);
        ctx.bezierCurveTo(F * 0.75, -F * 1.0, F * 0.55, -F * 0.45, -F * 0.05, -F * 0.38);
        ctx.closePath();
        ctx.fillStyle = FUR; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(F * 0.95, -F * 1.42, F * 0.36, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.restore();
        // body + cream chest
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.ellipse(bx, by - F * 0.58, F * 0.6, F * 0.66, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = CREAM;
        ctx.beginPath(); ctx.ellipse(bx, by - F * 0.55, F * 0.33, F * 0.5, 0, 0, TAU); ctx.fill();
        // hind feet
        ctx.fillStyle = FUR_D;
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(bx + sd * F * 0.36, by - F * 0.06, F * 0.22, F * 0.11, 0, 0, TAU); ctx.fill(); });
        // head
        var hx = bx + look * F * 0.14, hy = by - F * 1.45 + (happy ? Math.sin(t * 0.012) * F * 0.02 : 0);
        var tilt = look * 0.12;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
        // ears
        [-1, 1].forEach(function (sd) {
          ctx.fillStyle = FUR;
          ctx.beginPath(); ctx.moveTo(sd * F * 0.18, -F * 0.3); ctx.quadraticCurveTo(sd * F * 0.5, -F * 0.75, sd * F * 0.55, -F * 0.98);
          ctx.quadraticCurveTo(sd * F * 0.68, -F * 0.5, sd * F * 0.58, -F * 0.12); ctx.closePath(); ctx.fill();
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.moveTo(sd * F * 0.3, -F * 0.34); ctx.quadraticCurveTo(sd * F * 0.5, -F * 0.68, sd * F * 0.54, -F * 0.84);
          ctx.quadraticCurveTo(sd * F * 0.6, -F * 0.5, sd * F * 0.52, -F * 0.26); ctx.closePath(); ctx.fill();
        });
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.ellipse(0, 0, F * 0.62, F * 0.48, 0, 0, TAU); ctx.fill();
        // pointy cheek fluff + cream muzzle
        ctx.beginPath(); ctx.moveTo(-F * 0.55, -F * 0.05); ctx.lineTo(-F * 0.78, F * 0.16); ctx.lineTo(-F * 0.4, F * 0.3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(F * 0.55, -F * 0.05); ctx.lineTo(F * 0.78, F * 0.16); ctx.lineTo(F * 0.4, F * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = CREAM;
        ctx.beginPath();
        ctx.moveTo(-F * 0.66, F * 0.06);
        ctx.quadraticCurveTo(-F * 0.3, F * 0.1, 0, -F * 0.02);
        ctx.quadraticCurveTo(F * 0.3, F * 0.1, F * 0.66, F * 0.06);
        ctx.quadraticCurveTo(F * 0.4, F * 0.48, 0, F * 0.48);
        ctx.quadraticCurveTo(-F * 0.4, F * 0.48, -F * 0.66, F * 0.06);
        ctx.closePath(); ctx.fill();
        // eyes — open & following the stars, or happy ^ ^ arcs while hugging
        ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = F * 0.06;
        [-1, 1].forEach(function (sd) {
          var ex = sd * F * 0.23, ey = -F * 0.1;
          if (happy) { ctx.beginPath(); ctx.arc(ex, ey + F * 0.04, F * 0.08, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); }
          else {
            ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + look * F * 0.03, ey, F * 0.075, F * 0.095, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex + look * F * 0.03 + F * 0.025, ey - F * 0.035, F * 0.028, 0, TAU); ctx.fill();
          }
        });
        // nose + open smile + tongue
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.ellipse(0, F * 0.14, F * 0.075, F * 0.055, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-F * 0.13, F * 0.24); ctx.quadraticCurveTo(0, F * (happy ? 0.44 : 0.36), F * 0.13, F * 0.24);
        ctx.quadraticCurveTo(0, F * 0.29, -F * 0.13, F * 0.24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6';
        ctx.beginPath(); ctx.ellipse(0, F * (happy ? 0.34 : 0.3), F * 0.055, F * 0.035, 0, 0, TAU); ctx.fill();
        // blush
        ctx.fillStyle = 'rgba(255,120,150,.5)';
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(sd * F * 0.42, F * 0.12, F * 0.1, F * 0.06, 0, 0, TAU); ctx.fill(); });
        ctx.restore();
        return { hx: hx, hy: hy };
      }
      // front paws (mittens with toe pads) — resting on the belly, or raised around the star
      function paws(bx, by, F, hug) {
        [-1, 1].forEach(function (sd) {
          var sx = bx + sd * F * 0.42, sy = by - F * 0.95;
          var px = bx + sd * F * (0.3 + 0.07 * hug), py = by - F * (0.25 + 0.5 * hug);
          ctx.strokeStyle = FUR; ctx.lineWidth = F * 0.22;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(bx + sd * F * 0.55, (sy + py) / 2 + F * 0.1, px, py); ctx.stroke();
          ctx.fillStyle = FUR_D; ctx.beginPath(); ctx.ellipse(px, py, F * 0.14, F * 0.12, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = INK;
          for (var k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(px + k * F * 0.07, py - F * 0.07, F * 0.025, 0, TAU); ctx.fill(); }
        });
      }

      var raf = 0, killed = false, t0 = performance.now(), lookS = 0;
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.8 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        var hillY = H * (W < H ? 0.72 : 0.8);
        var F = Math.min(W * 0.2, H * 0.13);
        var bx = W * 0.5, by = hillY + F * 0.08;
        var catchX = bx, catchY = by - F * 0.78;
        // shooting stars + head tracking target
        var target = 0, haveTarget = false;
        for (var j = 0; j < shooters.length; j++) {
          var sh = shooters[j], q = (p - sh.at) / sh.len;
          if (q <= 0 || q >= 1) continue;
          var dist = Math.max(W, H) * 0.75;
          var hx0 = sh.x0 * W + sh.dx * Math.cos(sh.ang) * dist * q, hy0 = sh.y0 * H + Math.sin(sh.ang) * dist * q;
          var L = 140 * unit + 60 * unit * q, tx = hx0 - sh.dx * Math.cos(sh.ang) * L, ty = hy0 - Math.sin(sh.ang) * L;
          var fa = Math.sin(q * Math.PI);
          var lg = ctx.createLinearGradient(tx, ty, hx0, hy0);
          lg.addColorStop(0, hexA(sh.col, 0)); lg.addColorStop(1, hexA(sh.col, 0.9 * fa));
          ctx.strokeStyle = lg; ctx.lineWidth = 4 * unit + 1;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx0, hy0); ctx.stroke();
          ctx.fillStyle = hexA('#FFFFFF', fa); sparkPath(ctx, hx0, hy0, 10 * unit + 3); ctx.fill();
          if (!haveTarget) { target = (hx0 - bx) / (W * 0.4); haveTarget = true; }
        }
        // the golden wish-star: drifts down with a gentle sway into her paws
        var fallAt = CATCH - (isSuper ? 0.2 : 0.22);
        var fq = clamp01((p - fallAt) / (CATCH - fallAt));
        var caught = p >= CATCH, burstT = (t - (CATCH + 0.05) * dur) / 1000;
        var gx = catchX + Math.sin(fq * Math.PI * 2) * F * 0.9 * (1 - fq), gy = -F * 0.5 + (catchY + F * 0.5) * easeInOut(fq);
        if (fq > 0 && !caught) { target = (gx - bx) / (W * 0.4); haveTarget = true; }
        if (caught) target = 0;
        if (target > 1) target = 1; if (target < -1) target = -1;
        lookS += (target - lookS) * 0.12;
        var hug = easeOut(clamp01((p - CATCH + 0.06) / 0.08));
        // hill silhouette with grass tufts
        var hg = ctx.createLinearGradient(0, hillY - F * 0.3, 0, H);
        hg.addColorStop(0, mixHex('#2F6B4A', glow, 0.15)); hg.addColorStop(1, '#0E2A20');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, hillY + H * 0.08);
        ctx.quadraticCurveTo(W * 0.5, hillY - H * 0.07, W, hillY + H * 0.08); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#4E9A62'; ctx.lineWidth = 2.5 * unit + 0.5;
        for (var g = 0; g < tufts.length; g++) {
          var tu = tufts[g], tx2 = tu.x * W, u = tu.x * 2 - 1, ty2 = hillY + H * 0.08 - (1 - u * u) * H * 0.075 + 3 * unit;
          var th = 14 * unit * tu.h, sw = Math.sin(t * 0.003 + g) * 3 * unit;
          ctx.beginPath(); ctx.moveTo(tx2 - 4 * unit, ty2); ctx.lineTo(tx2 - 6 * unit + sw, ty2 - th);
          ctx.moveTo(tx2, ty2); ctx.lineTo(tx2 + sw, ty2 - th * 1.3);
          ctx.moveTo(tx2 + 4 * unit, ty2); ctx.lineTo(tx2 + 7 * unit + sw, ty2 - th); ctx.stroke();
        }
        // the fox
        var inA = easeOutBack(clamp01(p / 0.12));
        ctx.save(); ctx.translate(bx, by); ctx.scale(inA, inA); ctx.translate(-bx, -by);
        fox(bx, by, F, t, lookS, hug, caught);
        // golden star (before paws so the paws wrap over it)
        if (fq > 0) {
          var sx = caught ? catchX : gx, sy = caught ? catchY : gy;
          var pulse = caught ? 1 + 0.12 * Math.sin(t * 0.015) : 1;
          var gr = F * 0.7 * (caught ? 1.0 : 0.8) * pulse;
          var rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
          rg.addColorStop(0, hexA('#FFF3B0', caught ? 0.45 : 0.75)); rg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, gr, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFD54F'; var sR = caught ? 0.36 : 0.3;
          starPath(ctx, sx, sy, F * sR * pulse, F * sR * 0.47 * pulse, Math.sin(t * 0.003) * 0.2); ctx.fill();
          ctx.strokeStyle = '#FFF6C8'; ctx.lineWidth = F * 0.035; ctx.stroke();
          // tiny smiling face on the star
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.arc(sx - F * 0.07, sy - F * 0.02, F * 0.025, 0, TAU); ctx.arc(sx + F * 0.07, sy - F * 0.02, F * 0.025, 0, TAU); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = F * 0.025;
          ctx.beginPath(); ctx.arc(sx, sy + F * 0.03, F * 0.05, 0.3, Math.PI - 0.3); ctx.stroke();
        }
        paws(bx, by, F, hug);
        ctx.restore();
        // burst from the caught star
        if (burstT > 0) {
          for (var m = 0; m < ring.length; m++) {
            var rp = ring[m], d2 = rp.sp * unit * (1 - Math.exp(-burstT * 3)) / 3 * 3.2;
            var px = catchX + Math.cos(rp.a) * d2, py = catchY + Math.sin(rp.a) * d2 + (isSuper ? 160 * unit * burstT * burstT : 0);
            var ra = clamp01((isSuper ? 1.8 : 1.4) - burstT * (isSuper ? 0.65 : 1.1));
            if (ra <= 0) continue;
            var rr = rp.sz * unit * 1.5;
            ctx.globalAlpha = gFade * ra;
            ctx.fillStyle = rp.col;
            if (rp.kind === 'heart') heartPath(ctx, px, py, rr * 0.8); else starPath(ctx, px, py, rr, rr * 0.45, rp.rot + burstT * 2);
            ctx.fill();
          }
          for (var n = 0; n < glitter.length; n++) {
            var gl = glitter[n], gt = burstT - gl.at; if (gt <= 0) continue;
            var gx2 = catchX + gl.x * W * 0.9 + Math.sin(gt * 3 + gl.ph) * 12 * unit, gy2 = catchY - H * 0.25 + gt * gl.sp * H * 1.6;
            ctx.globalAlpha = gFade * clamp01(gt * 4) * clamp01(1.6 - gt * 0.7);
            ctx.fillStyle = gl.col; sparkPath(ctx, gx2, gy2, 6 * unit + 2); ctx.fill();
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
