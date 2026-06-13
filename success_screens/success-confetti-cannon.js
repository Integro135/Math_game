/* success-confetti-cannon.js — מסך הצלחה: תותחי קונפטי
   שני תותחים בפינות התחתונות יורים פיסות קונפטי צבעוניות מסתובבות
   שעפות באלכסון ונופלות בכבידה עם התנופפות. בסופר: יריות חוזרות וצפופות.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
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
    name: 'confetti-cannon',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'מַזָּל טוֹב!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFFFFF', '#FFB347'];

      var pieces = [];
      function volley(t0, side) {
        var n = isSuper ? 34 : 24;
        var ox = side > 0 ? W + 10 : -10, oy = H + 10;
        for (var i = 0; i < n; i++) {
          var ang = side > 0 ? (Math.PI + (0.5 + Math.random() * 0.7)) : (-(0.5 + Math.random() * 0.7));
          var sp = (0.9 + Math.random() * 0.8);
          pieces.push({ t0: t0, x: ox, y: oy,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (0.9 + Math.random() * 0.5),
            w: (5 + Math.random() * 7) * unit, h: (8 + Math.random() * 8) * unit,
            rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
            color: cols[i % cols.length], life: 1500 + Math.random() * 900 });
        }
      }
      volley(0, 1); volley(0, -1);
      if (isSuper) { volley(dur * 0.32, 1); volley(dur * 0.32, -1); volley(dur * 0.6, 1); volley(dur * 0.6, -1); }

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .9) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
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
        for (var i = 0; i < pieces.length; i++) {
          var p = pieces[i], te = t - p.t0;
          if (te < 0 || te > p.life) continue;
          var x = p.x + p.vx * te, y = p.y + p.vy * te + 0.00042 * te * te;
          if (y > H + 20) continue;
          var a = clamp01(1.4 - te / p.life) * gFade;
          var rot = p.rot + p.vr * te * 0.05;
          var sx = Math.abs(Math.cos(rot * 0.6));   // flutter (thin edge-on)
          ctx.save(); ctx.translate(x, y + Math.sin(te * 0.006 + i) * 4); ctx.rotate(rot);
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2 * sx, -p.h / 2, p.w * sx, p.h);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        var tp = clamp01((t - 200) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - 480) / 300);
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
