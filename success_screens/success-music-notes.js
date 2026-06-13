/* success-music-notes.js — מסך הצלחה: תווי מוזיקה
   תווים מוזיקליים צבעוניים עולים ומתנדנדים, טבעות קול פועמות מהמרכז,
   והשבח קופץ. בסופר: יותר תווים וטבעות כפולות. נרשם לפי החוזה
   ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
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
    name: 'music-notes',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'בְּרָבוֹ!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800, cx = W / 2, cy = H * 0.42;
      var GLYPHS = ['🎵', '🎶', '🎼', '🎵', '🎶'];
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8'];

      var notes = [];
      var N = isSuper ? 22 : 13;
      for (var i = 0; i < N; i++) {
        notes.push({ x: W * (0.1 + 0.8 * Math.random()), born: Math.random() * dur * 0.55,
          speed: (0.10 + Math.random() * 0.08), size: (22 + Math.random() * 16) * (isSuper ? 1.1 : 1),
          sway: Math.random() * 6.28, swayAmp: 20 + Math.random() * 26, glyph: GLYPHS[i % GLYPHS.length],
          om: (Math.random() - 0.5) * 0.004, color: cols[i % cols.length] });
      }
      var rings = isSuper ? [0, 500, 1000, 1500] : [0, 600, 1200];
      var maxR = Math.min(W, H) * 0.4;

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(glow, .9) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:56%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var ri = 0; ri < rings.length; ri++) {
          var rt = t - rings[ri]; if (rt < 0) continue;
          var q = clamp01(rt / 1100); if (q >= 1) continue;
          ctx.strokeStyle = hexA(glow, (1 - q) * 0.35 * gFade); ctx.lineWidth = (6 * (1 - q) + 2) * unit;
          ctx.beginPath(); ctx.arc(cx, cy, maxR * easeOutCubic(q), 0, 6.2832); ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i], age = t - n.born; if (age < 0) continue;
          var y = H * 0.78 - n.speed * age; if (y < -30) continue;
          var x = n.x + Math.sin(age * 0.003 + n.sway) * n.swayAmp;
          var a = clamp01(age / 250) * clamp01((y) / (H * 0.78)) * gFade;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(age * 0.004 + n.sway) * 0.3);
          ctx.globalAlpha = Math.min(a, 1); ctx.font = Math.round(n.size) + 'px serif'; ctx.fillText(n.glyph, 0, 0); ctx.restore();
        }
        ctx.globalAlpha = 1;
        var tp = clamp01((t - 220) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.04 * Math.sin(t * 0.006)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - 500) / 300);
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
