/* success-firefly-dance.js — מסך הצלחה: ריקוד גחליליות
   גחליליות זוהרות מרחפות ומהבהבות, נמשכות פנימה ומצטופפות סביב השבח
   במרכז בהילה רכה. בסופר: יותר גחליליות וזוהר חזק. רגוע וקסום.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  window.SUCCESS.styles.push({
    name: 'firefly-dance',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'מַקְסִים!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800, cx = W / 2, cy = H * 0.42;
      var glowCols = ['#FFF6B0', accent, glow, '#C8FFA8'];

      var flies = [];
      var N = isSuper ? 40 : 24;
      for (var i = 0; i < N; i++) {
        var a = Math.random() * 6.2832, d = (0.3 + Math.random() * 0.7) * Math.min(W, H) * 0.55;
        flies.push({ x0: cx + Math.cos(a) * d, y0: cy + Math.sin(a) * d,
          // orbit target near center
          ta: Math.random() * 6.2832, tr: (40 + Math.random() * 130) * unit,
          tw: Math.random() * 6.28, sp: 0.4 + Math.random() * 0.9, r: (1.6 + Math.random() * 2.2) * unit,
          color: glowCols[i % glowCols.length], drift: 0.0008 + Math.random() * 0.0012 });
      }

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 20px rgba(255,246,176,.85),0 0 46px ' + hexA(accent, .6) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:54%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280) * clamp01(t / 260);
        ctx.clearRect(0, 0, W, H);
        var gather = easeOutCubic(clamp01(t / (dur * 0.7)));
        for (var i = 0; i < flies.length; i++) {
          var f = flies[i];
          var ox = cx + Math.cos(f.ta + t * f.drift) * f.tr, oy = cy + Math.sin(f.ta + t * f.drift) * f.tr;
          var x = f.x0 + (ox - f.x0) * gather, y = f.y0 + (oy - f.y0) * gather;
          var pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.006 * f.sp + f.tw));
          var a = pulse * gFade;
          var rg = ctx.createRadialGradient(x, y, 0, x, y, f.r * 6);
          rg.addColorStop(0, hexA(f.color, 0.9 * a)); rg.addColorStop(0.4, hexA(f.color, 0.35 * a)); rg.addColorStop(1, hexA(f.color, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, f.r * 6, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, f.r, 0, 6.2832); ctx.fill();
        }
        var tp = clamp01((t - 280) / 340);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.025 * Math.sin(t * 0.003)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * clamp01((dur - t) / 280));
        if (ptsEl) {
          var pp = clamp01((t - 560) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * clamp01((dur - t) / 280));
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
