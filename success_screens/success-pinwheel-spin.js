/* success-pinwheel-spin.js — מסך הצלחה: סביבון צבעוני
   גלגל צבעים (קלידוסקופ) של יתדות מסתובב במרכז, גדל בקפיצה ומאט,
   עם ניצוצות סביב. בסופר: שתי שכבות מסתובבות בכיוונים הפוכים וזוהר.
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
    name: 'pinwheel-spin',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'מְהֻלָּל!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800, cx = W / 2, cy = H * 0.40;
      var R = Math.min(W, H) * (isSuper ? 0.34 : 0.28);
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFB347'];
      var WED = 10;

      var sparks = [];
      var NS = isSuper ? 30 : 18;
      for (var i = 0; i < NS; i++) { var a = Math.random() * 6.2832;
        sparks.push({ a0: a, rr: R * (1.05 + Math.random() * 0.4), tw: Math.random() * 6.28, r: (1 + Math.random() * 1.6) * unit }); }

      function wheel(radius, spin, alpha) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin); ctx.globalAlpha = alpha;
        for (var k = 0; k < WED; k++) {
          var a0 = (k / WED) * 6.2832, a1 = ((k + 1) / WED) * 6.2832;
          ctx.fillStyle = cols[k % cols.length];
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, a0, a1); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = alpha; ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(0, 0, radius * 0.14, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:66%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .9) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:78%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        var grow = easeOutBack(clamp01(t / 420));
        var spin = easeOutCubic(clamp01(t / dur)) * (isSuper ? 9 : 6);   // fast then ease
        if (isSuper) wheel(R * grow * 1.18, -spin * 0.7, 0.35 * gFade);
        wheel(R * grow, spin, 0.92 * gFade);
        for (var si = 0; si < sparks.length; si++) {
          var s = sparks[si];
          var px = cx + Math.cos(s.a0 + spin * 0.3) * s.rr * grow, py = cy + Math.sin(s.a0 + spin * 0.3) * s.rr * grow;
          ctx.fillStyle = hexA('#FFFFFF', (0.3 + 0.5 * Math.abs(Math.sin(t * 0.006 + s.tw))) * gFade);
          ctx.beginPath(); ctx.arc(px, py, s.r, 0, 6.2832); ctx.fill();
        }
        var tp = clamp01((t - dur * 0.3) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - dur * 0.3 - 280) / 300);
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
