/* success-balloon-float.js — מסך הצלחה: בלונים עולים
   בלונים צבעוניים עם חוט מתעקל ונצנוץ עולים מלמטה ומתנדנדים ברוח קלה.
   בסופר: יותר בלונים, בלון-ענק במרכז וניצוצות. נרשם לפי החוזה
   ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  window.SUCCESS.styles.push({
    name: 'balloon-float',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'אַתְּ אַלּוּפָה!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFB347'];

      var balloons = [];
      var N = isSuper ? 12 : 7;
      for (var i = 0; i < N; i++) {
        balloons.push({
          x: W * (0.08 + 0.84 * (i + Math.random() * 0.6) / N),
          born: Math.random() * dur * 0.3,
          speed: (0.10 + Math.random() * 0.07) * unit * 100 / 100,
          r: (26 + Math.random() * 16) * unit * (isSuper ? 1.15 : 1),
          sway: Math.random() * 6.28, swayAmp: (12 + Math.random() * 16) * unit,
          color: cols[i % cols.length]
        });
      }
      function drawBalloon(x, y, r, color, a) {
        ctx.save(); ctx.globalAlpha = a;
        // string
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y + r * 1.05);
        ctx.quadraticCurveTo(x + r * 0.4, y + r * 1.7, x, y + r * 2.4); ctx.stroke();
        // body
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, color); g.addColorStop(1, hexA(color, 0.85));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.82, r, 0, 0, 6.2832); ctx.fill();
        // knot
        ctx.fillStyle = hexA(color, 0.9);
        ctx.beginPath(); ctx.moveTo(x - 4 * unit, y + r); ctx.lineTo(x + 4 * unit, y + r); ctx.lineTo(x, y + r + 6 * unit); ctx.fill();
        // shine
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.16, r * 0.26, -0.4, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:60%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .9) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:72%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < balloons.length; i++) {
          var b = balloons[i], age = t - b.born;
          if (age < 0) continue;
          var y = H + b.r * 1.5 - b.speed * age * (isSuper ? 0.5 : 0.42);
          if (y < -b.r * 2.5) continue;
          var x = b.x + Math.sin(age * 0.0016 + b.sway) * b.swayAmp;
          drawBalloon(x, y, b.r, b.color, gFade);
        }
        var tp = clamp01((t - dur * 0.28) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - dur * 0.28 - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);
      return function cleanup() {
        if (killed) return; killed = true; cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
