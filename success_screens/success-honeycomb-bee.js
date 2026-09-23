/* success-honeycomb-bee.js — מסך הצלחה: דְּבוֹרָה וּדְבַשׁ 🍯
   חלת דבש משושית מופיעה במרכז, ודבורה עגלגלה וחייכנית מזמזמת סביבה
   בשמיניות — ובכל תא שהיא מבקרת בו הדבש הזהוב עולה וממלא אותו, עם טיפה
   נוצצת. בסופר: חלה גדולה יותר ושתי דבורים.
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
    name: 'honeycomb-bee',
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
      var praise  = opts.praise || 'מְתוּקָה כְּמוֹ דְּבַשׁ!';

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
      var cx = W * 0.5, cy = H * 0.6, HR = Math.min(W, H) * (isSuper ? 0.058 : 0.07);
      var cells = [[0, 0], [1, 0], [-1, 0], [0.5, -0.87], [-0.5, -0.87], [0.5, 0.87], [-0.5, 0.87]];
      if (isSuper) cells = cells.concat([[1.5, -0.87], [-1.5, -0.87], [1.5, 0.87], [-1.5, 0.87], [0, -1.73], [0, 1.73]]);
      cells = cells.map(function (c, i) { return { x: cx + c[0] * HR * 1.9, y: cy + c[1] * HR * 1.9, at: 0.14 + i / cells.length * 0.6 }; });
      var honey = mixHex('#FFB300', accent, 0.2), honeyL = mixHex(honey, '#FFFFFF', 0.45), wax = mixHex('#FFE7A0', '#FFFFFF', 0.2);
      var bees = [{ ph: 0, s: 1 }];
      if (isSuper) bees.push({ ph: Math.PI, s: 0.8 });
      function hexPath(x, y, r) { ctx.beginPath(); for (var k = 0; k < 6; k++) { var a = k / 6 * TAU + Math.PI / 6; if (k) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
      function bee(x, y, s, dir) {
        var BS = Math.min(W, H) * 0.045 * s;
        ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
        var fw = Math.abs(Math.sin(t * 0.05));
        ctx.fillStyle = 'rgba(230,245,255,.7)';
        ctx.beginPath(); ctx.ellipse(-BS * 0.2, -BS * 0.7, BS * 0.4, BS * 0.65 * fw + BS * 0.1, -0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(BS * 0.25, -BS * 0.72, BS * 0.35, BS * 0.55 * fw + BS * 0.1, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFCC33'; ctx.beginPath(); ctx.ellipse(0, 0, BS, BS * 0.7, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, BS, BS * 0.7, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = '#3A2A1A'; ctx.fillRect(-BS * 0.35, -BS, BS * 0.25, BS * 2); ctx.fillRect(BS * 0.12, -BS, BS * 0.25, BS * 2);
        ctx.restore();
        ctx.fillStyle = '#3A2A1A'; ctx.beginPath(); ctx.moveTo(-BS, 0); ctx.lineTo(-BS * 1.3, BS * 0.08); ctx.lineTo(-BS * 0.95, BS * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(BS * 0.62, -BS * 0.12, BS * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2A1A10'; ctx.beginPath(); ctx.arc(BS * 0.67, -BS * 0.12, BS * 0.11, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2A1A10'; ctx.lineWidth = 1.6 * unit; ctx.beginPath(); ctx.arc(BS * 0.62, BS * 0.15, BS * 0.16, 0.2, Math.PI - 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(BS * 0.6, -BS * 0.55); ctx.quadraticCurveTo(BS * 0.8, -BS * 1.0, BS * 1.05, -BS * 0.95); ctx.stroke();
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
      var txtAt = dur * 0.4;
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
        var inA = easeOutBack(clamp01(p / 0.14));
        var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, HR * 6);
        gl.addColorStop(0, hexA(honey, 0.3 * inA)); gl.addColorStop(1, hexA(honey, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, HR * 6, 0, TAU); ctx.fill();
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i], r = HR * inA;
          hexPath(c.x, c.y, r); ctx.fillStyle = hexA(mixHex(wax, '#000000', 0.12), 1); ctx.fill();
          var f = easeOut(clamp01((p - c.at) / 0.12));
          if (f > 0) {
            ctx.save(); hexPath(c.x, c.y, r * 0.86); ctx.clip();
            var hg = ctx.createLinearGradient(0, c.y - r, 0, c.y + r);
            hg.addColorStop(0, honeyL); hg.addColorStop(1, honey);
            ctx.fillStyle = hg; ctx.fillRect(c.x - r, c.y + r - f * r * 2, r * 2, f * r * 2);
            ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(c.x - r * 0.3, c.y + r - f * r * 1.7, r * 0.18, r * 0.08, 0, 0, TAU); ctx.fill();
            ctx.restore();
            if (f < 1 && f > 0.6) { ctx.fillStyle = hexA('#FFFFFF', 0.9); sparkPath(ctx, c.x + r * 0.4, c.y - r * 0.5, 12 * unit); ctx.fill(); }
          }
          hexPath(c.x, c.y, r); ctx.strokeStyle = hexA(mixHex(wax, '#8A5A10', 0.35), 1); ctx.lineWidth = 4 * unit; ctx.stroke();
        }
        // the bee(s): a figure-eight around the comb, with a buzzing wobble
        for (var bI = 0; bI < bees.length; bI++) {
          var b = bees[bI], a = t * 0.0028 + b.ph;
          var x = cx + Math.sin(a) * HR * 4.3, y = cy - HR * 0.4 + Math.sin(a * 2) * HR * 1.8 + Math.sin(t * 0.03) * 3 * unit;
          var dir = Math.cos(a) >= 0 ? 1 : -1;
          var ba = clamp01((p - 0.06) / 0.1);
          if (ba > 0) { ctx.globalAlpha = gFade * ba; bee(x, y, b.s, dir); ctx.globalAlpha = gFade; }
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
