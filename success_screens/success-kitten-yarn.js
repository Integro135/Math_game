/* success-kitten-yarn.js — מסך הצלחה: חֲתַלְתּוּל וּפְקַעַת 🧶
   חתלתול פרוותי וחמוד יושב ומזיז את הזנב, נותן מכה קטנה בכפה לפקעת צמר —
   והפקעת מתגלגלת על פני המסך ומשאירה אחריה חוט צבעוני מתפתל. בסוף החתלתול
   קופץ משמחה ולבבות מרחפים מעליו. בסופר: שתי פקעות ושתי קפיצות.
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
    name: 'kitten-yarn',
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
      var praise  = opts.praise || 'אַתְּ מַמָּשׁ חֲמוּדָה!';

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
      var kx = W * 0.25, ky = H * 0.72, K = Math.min(W, H) * 0.14;
      var fur = mixHex(accent, '#F2A65A', 0.55), furL = mixHex(fur, '#FFFFFF', 0.45), furD = mixHex(fur, '#7A3E10', 0.3);
      var balls = [{ col: primary, at: 0.16, y: H * 0.8 }];
      if (isSuper) balls.push({ col: glow, at: 0.42, y: H * 0.86 });
      var hearts = [];
      for (var i = 0; i < 8; i++) hearts.push({ dx: rnd(-1, 1) * K, at: 0.7 + i * 0.025, col: [primary, '#FF6FA5', accent][i % 3] });
      function kitten(x, y, paw, hop) {
        ctx.save(); ctx.translate(x, y - hop);
        ctx.strokeStyle = fur; ctx.lineWidth = K * 0.22;                                               // tail
        ctx.beginPath(); ctx.moveTo(-K * 0.6, K * 0.5); ctx.quadraticCurveTo(-K * 1.4, K * 0.2, -K * 1.2 + Math.sin(t * 0.006) * K * 0.3, -K * 0.5); ctx.stroke();
        ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, K * 0.35, K * 0.75, K * 0.62, 0, 0, TAU); ctx.fill();   // body
        ctx.fillStyle = furL; ctx.beginPath(); ctx.ellipse(K * 0.1, K * 0.45, K * 0.4, K * 0.42, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = fur;                                                                            // paw that swats
        ctx.save(); ctx.translate(K * 0.55, K * 0.55); ctx.rotate(-paw * 1.1);
        ctx.beginPath(); ctx.ellipse(K * 0.3, 0, K * 0.36, K * 0.15, 0, 0, TAU); ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.arc(K * 0.15, -K * 0.55, K * 0.58, 0, TAU); ctx.fill();                   // head
        [[-1], [1]].forEach(function (e) {                                                              // ears
          var s = e[0]; ctx.fillStyle = fur;
          ctx.beginPath(); ctx.moveTo(K * 0.15 + s * K * 0.5, -K * 0.75); ctx.lineTo(K * 0.15 + s * K * 0.45, -K * 1.3); ctx.lineTo(K * 0.15 + s * K * 0.1, -K * 1.02); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFB0C8';
          ctx.beginPath(); ctx.moveTo(K * 0.15 + s * K * 0.42, -K * 0.85); ctx.lineTo(K * 0.15 + s * K * 0.4, -K * 1.16); ctx.lineTo(K * 0.15 + s * K * 0.2, -K * 0.98); ctx.closePath(); ctx.fill();
        });
        var look = clamp01(p * 3) * K * 0.08;
        ctx.fillStyle = '#2A1A10';
        ctx.beginPath(); ctx.ellipse(K * 0.15 - K * 0.22 + look, -K * 0.6, K * 0.1, K * 0.14, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(K * 0.15 + K * 0.22 + look, -K * 0.6, K * 0.1, K * 0.14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(K * 0.15 - K * 0.19 + look, -K * 0.65, K * 0.035, 0, TAU); ctx.arc(K * 0.15 + K * 0.25 + look, -K * 0.65, K * 0.035, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FF7FA5'; ctx.beginPath(); ctx.moveTo(K * 0.1, -K * 0.42); ctx.lineTo(K * 0.2, -K * 0.42); ctx.lineTo(K * 0.15, -K * 0.35); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2A1A10'; ctx.lineWidth = 1.6 * unit;
        ctx.beginPath(); ctx.arc(K * 0.09, -K * 0.33, K * 0.07, 0.1, Math.PI - 0.1); ctx.arc(K * 0.21, -K * 0.33, K * 0.07, 0.1, Math.PI - 0.1); ctx.stroke();
        ctx.strokeStyle = hexA('#FFFFFF', 0.7); ctx.lineWidth = 1.4 * unit;                            // whiskers
        [-1, 1].forEach(function (s) { for (var w = -1; w <= 1; w++) { ctx.beginPath(); ctx.moveTo(K * 0.15 + s * K * 0.2, -K * 0.38); ctx.lineTo(K * 0.15 + s * K * 0.72, -K * 0.42 + w * K * 0.1); ctx.stroke(); } });
        ctx.fillStyle = 'rgba(255,120,160,.4)';
        ctx.beginPath(); ctx.ellipse(K * 0.15 - K * 0.38, -K * 0.42, K * 0.1, K * 0.06, 0, 0, TAU); ctx.ellipse(K * 0.15 + K * 0.38, -K * 0.42, K * 0.1, K * 0.06, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }

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
      var txtAt = dur * 0.5;
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
        ctx.globalAlpha = gFade;
        var inA = easeOutBack(clamp01(p / 0.12));
        var paw = 0;
        balls.forEach(function (b) { var q = (p - b.at + 0.06) / 0.08; if (q > 0 && q < 1) paw = Math.max(paw, Math.sin(q * Math.PI)); });
        var hop = 0;
        [0.72].concat(isSuper ? [0.86] : []).forEach(function (at) { var q = (p - at) / 0.12; if (q > 0 && q < 1) hop = Math.max(hop, Math.sin(q * Math.PI) * K * 0.9); });
        // yarn balls + their trails
        for (var bI = 0; bI < balls.length; bI++) {
          var b = balls[bI], q = easeOut(clamp01((p - b.at) / 0.5));
          var x0 = kx + K * 1.1, bx = x0 + q * (W * 0.92 - x0), by = b.y + Math.abs(Math.sin(q * Math.PI * 3)) * -18 * unit * (1 - q);
          var BR = K * 0.42;
          if (q > 0) {
            ctx.strokeStyle = b.col; ctx.lineWidth = 3.5 * unit; ctx.beginPath();
            for (var s = 0; s <= 40; s++) { var u = s / 40 * q, xx = x0 + u * (W * 0.92 - x0), yy = b.y + BR * 0.6 + Math.sin(u * 26) * 10 * unit; if (s) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
            ctx.stroke();
          }
          ctx.save(); ctx.translate(bx, by); ctx.rotate(q * 14);
          ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(0, 0, BR, 0, TAU); ctx.fill();
          ctx.strokeStyle = mixHex(b.col, '#FFFFFF', 0.4); ctx.lineWidth = 2.2 * unit;
          for (var l = -2; l <= 2; l++) { ctx.beginPath(); ctx.ellipse(0, 0, BR * 0.95, BR * (0.3 + Math.abs(l) * 0.15), l * 0.6, 0, TAU); ctx.stroke(); }
          ctx.restore();
        }
        ctx.save(); ctx.translate(kx, ky); ctx.scale(inA, inA); ctx.translate(-kx, -ky);
        kitten(kx, ky, paw, hop);
        ctx.restore();
        for (var i = 0; i < hearts.length; i++) {
          var h = hearts[i], hq = clamp01((p - h.at) / 0.3); if (hq <= 0) continue;
          ctx.fillStyle = hexA(h.col, 1 - hq); heartPath(ctx, kx + h.dx, ky - K * 1.4 - hop - hq * 80 * unit, 11 * unit * (0.6 + hq)); ctx.fill();
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
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
