/* success-magic-wand.js — מסך הצלחה: שרביט קסם
   שרביט (🪄) מרחף בקשת מעל המרכז ומפזר שובל אבק כוכבים צפוף — והשבח
   "נחשף" בעקבות התנופה. בסופר: תנופת חזרה שנייה וגשם כוכבים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'magic-wand',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      var praise  = opts.praise || 'אֵיזֶה קֶסֶם!';

      var W = root.clientWidth || window.innerWidth;
      var H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var unit = Math.min(W, H) / 800;
      var U = isSuper ? 78 : 60;

      var wand = document.createElement('div');
      wand.textContent = '🪄';
      wand.style.cssText =
        'position:absolute;left:0;top:0;line-height:1;font-size:' + U + 'px;' +
        'will-change:transform;visibility:hidden;' +
        'filter:drop-shadow(0 0 12px ' + hexA(accent, 0.8) + ')';
      root.appendChild(wand);

      // תנופות: ימין→שמאל; בסופר גם חזרה
      var sweeps = isSuper
        ? [{ t0: 0, t1: dur * 0.34, fromX: W * 0.88, toX: W * 0.10, y: H * 0.26 },
           { t0: dur * 0.40, t1: dur * 0.70, fromX: W * 0.10, toX: W * 0.88, y: H * 0.56 }]
        : [{ t0: 0, t1: dur * 0.48, fromX: W * 0.88, toX: W * 0.10, y: H * 0.28 }];

      var sparks = [];
      var starRain = [];
      if (isSuper) {
        for (var sr = 0; sr < 12; sr++) {
          starRain.push({ x: W * (0.1 + 0.8 * Math.random()), born: dur * 0.35 + Math.random() * dur * 0.3,
                          speed: 0.10 + Math.random() * 0.08, size: 12 + Math.random() * 10,
                          om: (Math.random() - 0.5) * 0.008 });
        }
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:43%;transform:translate(-50%,-50%) scale(.9);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:56%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // השרביט
        var active = null, prog = 0;
        for (var si = 0; si < sweeps.length; si++) {
          var sw = sweeps[si];
          if (t >= sw.t0 && t <= sw.t1) { active = sw; prog = (t - sw.t0) / (sw.t1 - sw.t0); break; }
        }
        if (active) {
          var x = active.fromX + (active.toX - active.fromX) * (prog * prog * (3 - 2 * prog));  // smoothstep
          var y = active.y - Math.sin(prog * Math.PI) * H * 0.06;
          var tilt = -28 + Math.sin(t * 0.02) * 10;
          wand.style.visibility = 'visible';
          wand.style.opacity = String(gFade);
          wand.style.transform = 'translate(' + (x - U / 2) + 'px,' + (y - U / 2) + 'px) rotate(' + tilt + 'deg)';
          // אבק כוכבים מקצה השרביט
          var tipX = x + U * 0.30, tipY = y - U * 0.26;
          for (var k = 0; k < 3; k++) {
            if (sparks.length > 230) break;
            var ang = Math.random() * 6.2832;
            sparks.push({
              x: tipX + Math.cos(ang) * 6, y: tipY + Math.sin(ang) * 6,
              vx: (Math.random() - 0.5) * 0.05, vy: 0.02 + Math.random() * 0.05,
              born: t, life: 520 + Math.random() * 420,
              r: (0.9 + Math.random() * 1.7) * unit,
              color: k === 0 ? accent : k === 1 ? '#FFFFFF' : glow
            });
          }
        } else {
          wand.style.visibility = 'hidden';
        }

        // ניצוצות
        for (var pj = sparks.length - 1; pj >= 0; pj--) {
          var sp = sparks[pj];
          var sq = (t - sp.born) / sp.life;
          if (sq >= 1) { sparks.splice(pj, 1); continue; }
          var dt = t - sp.born;
          ctx.fillStyle = hexA(sp.color, (1 - sq) * 0.9 * gFade);
          ctx.beginPath();
          ctx.arc(sp.x + sp.vx * dt, sp.y + sp.vy * dt, sp.r * (1 - sq * 0.4), 0, 6.2832);
          ctx.fill();
        }

        // גשם כוכבים (סופר)
        if (starRain.length) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (var ri = 0; ri < starRain.length; ri++) {
            var st = starRain[ri];
            var te = t - st.born;
            if (te < 0) continue;
            var sy = -20 + st.speed * te;
            if (sy > H + 20) continue;
            ctx.save();
            ctx.translate(st.x, sy);
            ctx.rotate(st.om * te);
            ctx.globalAlpha = gFade;
            ctx.font = Math.round(st.size) + 'px serif';
            ctx.fillText('⭐', 0, 0);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }

        // השבח נחשף עם התקדמות התנופה הראשונה
        var reveal = clamp01((t - sweeps[0].t0) / (sweeps[0].t1 - sweeps[0].t0));
        var tp = clamp01((reveal - 0.25) / 0.6);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (0.9 + 0.1 * easeOutBack(tp)) + ')';
        txt.style.opacity = String(tp * gFade);
        if (ptsEl) {
          var pp = clamp01((t - sweeps[0].t1 - 100) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }

        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        if (killed) return;
        killed = true;
        cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (wand.parentNode) wand.parentNode.removeChild(wand);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
