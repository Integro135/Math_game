/* success-shooting-stars.js — מסך הצלחה: כוכבים נופלים (משאלות)
   כוכבי משאלה חוצים את המסך באלכסון עם שובל ארוך זוהר ונצנוץ בקצה;
   מגיעים בגלים. בסופר: יותר כוכבים, חלקם גדולים ומוזהבים, וגשם ניצוצות.
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
    name: 'shooting-stars',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'כּוֹכֶבֶת!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var cols = [glow, accent, '#FFFFFF', primary, '#FFFFFF'];

      var stars = [];
      var N = isSuper ? 16 : 8;
      var ang = 0.62; // diagonal down-left
      var dx = -Math.cos(ang), dy = Math.sin(ang);
      for (var i = 0; i < N; i++) {
        var big = isSuper && i < 3;
        var born = Math.random() * dur * (isSuper ? 0.55 : 0.45);
        stars.push({
          x0: W * (0.55 + Math.random() * 0.6), y0: -H * (0.05 + Math.random() * 0.3),
          born: born, life: Math.min(dur * 0.6, dur - born - 200),
          speed: (0.7 + Math.random() * 0.5) * unit, len: (big ? 200 : 120) + Math.random() * 70,
          size: (big ? 3.4 : 2) * unit, color: big ? accent : cols[i % cols.length]
        });
      }
      var bg = [];
      for (var b2 = 0; b2 < (isSuper ? 30 : 18); b2++)
        bg.push({ x: Math.random() * W, y: Math.random() * H * 0.8, tw: Math.random() * 6.28, r: (0.6 + Math.random() * 1.2) * unit });

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:58%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(glow, .95) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:70%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var bi = 0; bi < bg.length; bi++) {
          var s2 = bg[bi];
          ctx.fillStyle = hexA('#FFFFFF', (0.2 + 0.4 * Math.abs(Math.sin(t * 0.004 + s2.tw))) * gFade);
          ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.r, 0, 6.2832); ctx.fill();
        }
        for (var i = 0; i < stars.length; i++) {
          var st = stars[i], age = t - st.born;
          if (age < 0 || age > st.life) continue;
          var env = Math.sin(Math.PI * (age / st.life));
          var d = st.speed * age;
          var hx = st.x0 + dx * d, hy = st.y0 + dy * d;
          var tx = hx - dx * st.len, ty = hy - dy * st.len;
          var a = env * gFade;
          var gr = ctx.createLinearGradient(hx, hy, tx, ty);
          gr.addColorStop(0, hexA(st.color, 0.9 * a)); gr.addColorStop(1, hexA(st.color, 0));
          ctx.strokeStyle = gr; ctx.lineWidth = st.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
          var rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, st.size * 4);
          rg.addColorStop(0, 'rgba(255,255,255,' + 0.95 * a + ')'); rg.addColorStop(1, hexA(st.color, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, st.size * 4, 0, 6.2832); ctx.fill();
        }
        var tp = clamp01((t - dur * 0.22) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - dur * 0.22 - 280) / 300);
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
