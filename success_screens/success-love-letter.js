/* success-love-letter.js — מסך הצלחה: מִכְתַּב אַהֲבָה 💌
   מעטפה ורודה נוחתת במרכז, הדש שלה נפתח, ומכתב קטן עם לב מחליק החוצה —
   ואז לבבות בגדלים ובגוונים שונים מתעופפים ממנה למעלה בנדנוד רך. בסופר:
   גל לבבות גדול יותר ולב ענק פועם שעולה מאחורי המכתב.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF). קריא מעל הכיסוי הכהה של המארח. */
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
    name: 'love-letter',
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
      var praise  = opts.praise || 'מִכְתָּב מִמֶּנִּי: אַתְּ נֶהֱדֶרֶת!';

      var W = root.clientWidth || window.innerWidth || 342;
      var H = root.clientHeight || window.innerHeight || 455;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(W * DPR));
      cv.height = Math.max(1, Math.round(H * DPR));
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;

      // twinkling backdrop stars (shared by every scene)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 40 : 26); bs++)
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, tw: Math.random() * TAU,
                       rate: 2 + Math.random() * 4, size: (0.8 + Math.random() * 1.6) * unit,
                       color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      function drawBgStars(t, a) {
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * a);
          sparkPath(ctx, s.x, s.y, s.size * 2.2); ctx.fill();
        }
      }

      var t = 0, p = 0, gFade = 1;                   // per-frame values — shared with scene helpers
      // ═══ SCENE ═══
      var ex = W / 2, ey = H * 0.62, EW = Math.min(W, H) * 0.34, EH = EW * 0.64;
      var envCol = mixHex(primary, '#FFFFFF', 0.55), envDark = mixHex(primary, '#FFFFFF', 0.25);
      var hearts = [];
      for (var i = 0; i < (isSuper ? 34 : 18); i++)
        hearts.push({ born: 0.34 + Math.random() * (isSuper ? 0.45 : 0.4), x: rnd(-0.35, 0.35) * EW, drift: rnd(-1, 1),
                      rise: rnd(0.45, 0.8) * H, s: rnd(8, 20) * unit, ph: Math.random() * TAU,
                      col: [primary, accent, '#FF6FA5', mixHex(primary, '#FF6FA5', 0.5), '#FFFFFF'][i % 5] });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.34;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.4)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        t = now - t0;
        p = clamp01(t / dur);
        gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        drawBgStars(t, gFade);
        ctx.save();
        var land = easeOutBack(clamp01(p / 0.16));
        var open = easeInOut(clamp01((p - 0.16) / 0.14));
        var slide = easeOut(clamp01((p - 0.28) / 0.14));
        var yy = ey - (1 - land) * H * 0.3;
        if (isSuper) {                                         // giant pulsing heart behind
          var bh = clamp01((p - 0.35) / 0.2);
          if (bh > 0) {
            var beat = 1 + 0.07 * Math.sin(t * 0.012);
            ctx.fillStyle = hexA('#FF6FA5', 0.28 * bh * gFade);
            heartPath(ctx, ex, yy - EH * 1.0, EW * 0.62 * easeOutBack(bh) * beat); ctx.fill();
          }
        }
        ctx.globalAlpha = gFade * Math.min(1, clamp01(p / 0.05) * 1.5);
        // back of the envelope
        ctx.fillStyle = envDark; ctx.fillRect(ex - EW / 2, yy - EH / 2, EW, EH);
        // the letter sliding out
        var ly = yy - EH * 0.1 - slide * EH * 0.75;
        ctx.fillStyle = '#FFFDF7'; ctx.fillRect(ex - EW * 0.4, ly - EH * 0.42, EW * 0.8, EH * 0.8);
        ctx.strokeStyle = 'rgba(200,150,180,.5)'; ctx.lineWidth = 2 * unit;
        for (var l = 0; l < 2; l++) { ctx.beginPath(); ctx.moveTo(ex - EW * 0.3, ly + EH * (0.08 + l * 0.12)); ctx.lineTo(ex + EW * 0.3, ly + EH * (0.08 + l * 0.12)); ctx.stroke(); }
        ctx.fillStyle = '#FF4F8B'; heartPath(ctx, ex, ly - EH * 0.14, EH * 0.13 * (1 + 0.08 * Math.sin(t * 0.012))); ctx.fill();
        // front pocket
        ctx.fillStyle = envCol;
        ctx.beginPath(); ctx.moveTo(ex - EW / 2, yy - EH / 2 + EH * 0.18); ctx.lineTo(ex, yy + EH * 0.08); ctx.lineTo(ex + EW / 2, yy - EH / 2 + EH * 0.18);
        ctx.lineTo(ex + EW / 2, yy + EH / 2); ctx.lineTo(ex - EW / 2, yy + EH / 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA(envDark, 1); ctx.lineWidth = 2 * unit;
        ctx.beginPath(); ctx.moveTo(ex - EW / 2, yy + EH / 2); ctx.lineTo(ex, yy + EH * 0.08); ctx.lineTo(ex + EW / 2, yy + EH / 2); ctx.stroke();
        // the flap: folds from down (closed) to up (open)
        var fy = 1 - 2 * open;
        ctx.fillStyle = fy >= 0 ? mixHex(primary, '#FFFFFF', 0.4) : envDark;
        ctx.beginPath(); ctx.moveTo(ex - EW / 2, yy - EH / 2); ctx.lineTo(ex + EW / 2, yy - EH / 2); ctx.lineTo(ex, yy - EH / 2 + EH * 0.58 * fy); ctx.closePath(); ctx.fill();
        if (open < 0.5) { ctx.fillStyle = '#FF4F8B'; heartPath(ctx, ex, yy - EH / 2 + EH * 0.52 * fy, EH * 0.1); ctx.fill(); }   // the seal
        ctx.globalAlpha = 1;
        // hearts flying out
        for (var i = 0; i < hearts.length; i++) {
          var h = hearts[i], hp = clamp01((p - h.born) / 0.5); if (hp <= 0) continue;
          var hx = ex + h.x + Math.sin(t * 0.004 + h.ph) * 16 * unit + h.drift * hp * 90 * unit;
          var hy = yy - EH * 0.3 - easeOut(hp) * h.rise;
          ctx.fillStyle = hexA(h.col, (1 - hp * hp) * gFade);
          heartPath(ctx, hx, hy, h.s * (0.4 + 0.6 * easeOutBack(clamp01(hp * 4)))); ctx.fill();
        }
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
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
