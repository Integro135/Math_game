/* success-ribbon-streamers.js — מסך הצלחה: סלילי סרטים
   סרטי נייר צבעוניים מתפתלים ונופלים מלמעלה כספירלות מתנפנפות, עם נקודות
   קונפטי. בסופר: יותר סרטים ארוכים וצפופים. נרשם לפי החוזה
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
    name: 'ribbon-streamers',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'חֲגִיגָה!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFB347'];

      var ribbons = [];
      var N = isSuper ? 14 : 9;
      for (var i = 0; i < N; i++) {
        ribbons.push({ x: W * (0.06 + 0.88 * (i + 0.3) / N), born: Math.random() * dur * 0.4,
          speed: (0.12 + Math.random() * 0.08), amp: (16 + Math.random() * 26) * unit,
          freq: 0.012 + Math.random() * 0.014, ph: Math.random() * 6.28,
          w: (5 + Math.random() * 5) * unit, len: (90 + Math.random() * 80) * unit,
          color: cols[i % cols.length] });
      }
      var dots = [];
      var ND = isSuper ? 36 : 22;
      for (var d = 0; d < ND; d++)
        dots.push({ x: Math.random() * W, born: Math.random() * dur * 0.5, speed: 0.10 + Math.random() * 0.10,
          r: (2 + Math.random() * 3) * unit, sway: Math.random() * 6.28, color: cols[d % cols.length] });

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .9) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:62%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < ribbons.length; i++) {
          var rb = ribbons[i], age = t - rb.born; if (age < 0) continue;
          var headY = -rb.len + rb.speed * age * 1.0;
          if (headY - rb.len > H) continue;
          ctx.strokeStyle = hexA(rb.color, 0.92 * gFade); ctx.lineWidth = rb.w; ctx.lineCap = 'round';
          ctx.beginPath();
          var seg = 10 * unit, first = true;
          for (var y = headY; y > headY - rb.len; y -= seg) {
            if (y < -seg || y > H + seg) { first = true; continue; }
            var x = rb.x + Math.sin(y * rb.freq + age * 0.004 + rb.ph) * rb.amp;
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        for (var di = 0; di < dots.length; di++) {
          var dt = dots[di], age2 = t - dt.born; if (age2 < 0) continue;
          var y2 = -10 + dt.speed * age2 + 0.0002 * age2 * age2; if (y2 > H + 10) continue;
          ctx.fillStyle = hexA(dt.color, 0.9 * gFade);
          ctx.beginPath(); ctx.arc(dt.x + Math.sin(age2 * 0.004 + dt.sway) * 18, y2, dt.r, 0, 6.2832); ctx.fill();
        }
        var tp = clamp01((t - dur * 0.26) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - dur * 0.26 - 280) / 300);
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
