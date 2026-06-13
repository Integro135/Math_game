/* success-snow-sparkle.js — מסך הצלחה: שלג נוצץ
   פתיתי שלג (❄) מסתחררים יורדים בעדינות עם נקודות אור מנצנצות,
   והשבח זוהר בהילה קרחית. רגוע וחלומי. בסופר: מערבולת פתיחה של
   פתיתים מהמרכז + שלג צפוף יותר.
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
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'snow-sparkle',
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
      var praise  = opts.praise || 'יוֹפִי שֶׁל חִשּׁוּב!';

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

      // פתיתים — נופלים לאורך כל המסך (ממוחזרים מודולו)
      var flakes = [];
      var NF = isSuper ? 34 : 22;
      for (var i = 0; i < NF; i++) {
        flakes.push({
          x: Math.random() * W,
          y0: Math.random() * (H + 80),
          speed: 0.05 + Math.random() * 0.06,
          size: 11 + Math.random() * 13,
          om: (Math.random() - 0.5) * 0.004,
          sway: Math.random() * 6.28
        });
      }
      // נקודות אור קטנות
      var dots = [];
      var ND = isSuper ? 40 : 26;
      for (var d = 0; d < ND; d++) {
        dots.push({ x: Math.random() * W, y0: Math.random() * (H + 60),
                    speed: 0.03 + Math.random() * 0.05, r: (0.8 + Math.random() * 1.5) * unit,
                    tw: Math.random() * 6.28 });
      }
      // מערבולת פתיחה (סופר): פתיתים נזרקים מהמרכז בספירלה
      var swirl = [];
      if (isSuper) {
        for (var s = 0; s < 16; s++) {
          swirl.push({ a0: Math.random() * 6.2832, spin: 1.5 + Math.random(),
                       dist: Math.min(W, H) * (0.2 + Math.random() * 0.3),
                       life: 900 + Math.random() * 500, size: 12 + Math.random() * 10 });
        }
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px rgba(190,240,255,.95),0 0 46px ' + hexA(glow, 0.8) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:57%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 280) * clamp01(t / 250);
        ctx.clearRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#EAF7FF';

        // פתיתים נופלים
        for (var fi = 0; fi < flakes.length; fi++) {
          var f = flakes[fi];
          var fy = ((f.y0 + f.speed * t) % (H + 80)) - 40;
          var fx = f.x + Math.sin(t * 0.0012 + f.sway) * 26;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(f.om * t);
          ctx.globalAlpha = 0.75 * gFade;
          ctx.font = Math.round(f.size) + 'px serif';
          ctx.fillText('❄', 0, 0);
          ctx.restore();
        }
        ctx.globalAlpha = 1;

        // נקודות אור
        for (var di = 0; di < dots.length; di++) {
          var dt2 = dots[di];
          var dy = ((dt2.y0 + dt2.speed * t) % (H + 60)) - 30;
          ctx.fillStyle = 'rgba(255,255,255,' +
            (0.25 + 0.45 * Math.abs(Math.sin(t * 0.004 + dt2.tw))) * gFade + ')';
          ctx.beginPath();
          ctx.arc(dt2.x + Math.sin(t * 0.001 + dt2.tw) * 14, dy, dt2.r, 0, 6.2832);
          ctx.fill();
        }

        // מערבולת פתיחה (סופר)
        if (swirl.length) {
          var cx = W / 2, cy = H * 0.44;
          ctx.fillStyle = '#EAF7FF';
          for (var si = 0; si < swirl.length; si++) {
            var sw = swirl[si];
            var sq = clamp01(t / sw.life);
            if (sq >= 1) continue;
            var eq = easeOutCubic(sq);
            var sa = sw.a0 + eq * sw.spin;
            ctx.save();
            ctx.translate(cx + Math.cos(sa) * sw.dist * eq, cy + Math.sin(sa) * sw.dist * eq * 0.7);
            ctx.rotate(sa);
            ctx.globalAlpha = (1 - sq) * 0.85 * gFade;
            ctx.font = Math.round(sw.size) + 'px serif';
            ctx.fillText('❄', 0, 0);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }

        var tp = clamp01((t - 200) / 340);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.02 * Math.sin(t * 0.003)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * clamp01((dur - t) / 280));
        if (ptsEl) {
          var pp = clamp01((t - 480) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * clamp01((dur - t) / 280));
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
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
