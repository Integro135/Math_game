/* success-dolphin-splash.js — מסך הצלחה: קפיצת דולפינים
   דולפינים (🐬) מזנקים בקשתות מעל קו מים בלתי-נראה, מסתובבים עם כיוון
   התנועה, ומתיזים טיפות אור בכניסה וביציאה. מתכתב עם ערכת השונית.
   בסופר: שלושה דולפינים בשתי קפיצות. נרשם לפי החוזה ב-success_screens_spec.md. */
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
    name: 'dolphin-splash',
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
      var praise  = opts.praise || 'אַתְּ אַלּוּפַת הַיָּם!';

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
      var waterY = H * 0.66;

      // קפיצות: כל קפיצה — קשת מ-(x0,waterY) דרך שיא אל (x1,waterY); תנועה ימין→שמאל
      var jumps = [];
      function addJump(x0, t0, t1, apex, size) {
        jumps.push({ x0: x0, x1: x0 - W * 0.30, t0: t0, t1: t1, apex: apex, size: size,
                     inSplash: false, outSplash: false, drops: [] });
      }
      if (isSuper) {
        addJump(W * 0.88, 100, dur * 0.36, H * 0.24, 56);
        addJump(W * 0.62, dur * 0.16, dur * 0.52, H * 0.28, 46);
        addJump(W * 0.74, dur * 0.46, dur * 0.82, H * 0.22, 52);
      } else {
        addJump(W * 0.80, 80, dur * 0.62, H * 0.30, 50);
        addJump(W * 0.52, dur * 0.22, dur * 0.78, H * 0.36, 42);
      }

      function makeSplash(j, x) {
        var drops = [];
        var n = 9;
        for (var d = 0; d < n; d++) {
          var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
          drops.push({ x: x, ca: Math.cos(ang), sa: Math.sin(ang),
                       speed: 0.08 + Math.random() * 0.18,
                       born: null, life: 380 + Math.random() * 280,
                       r: (1.1 + Math.random() * 1.8) * unit });
        }
        return drops;
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:30%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#7DE8FF', 0.9) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:43%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var sparkles = [];
      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // נצנוץ עדין לאורך קו המים
        for (var wx = 0; wx < W; wx += 30) {
          var wa = (0.08 + 0.10 * Math.abs(Math.sin(t * 0.003 + wx * 0.08))) * gFade;
          ctx.fillStyle = hexA('#9FD8FF', wa);
          ctx.beginPath();
          ctx.arc(wx + 15, waterY + Math.sin(t * 0.002 + wx) * 3, 1.3 * unit, 0, 6.2832);
          ctx.fill();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (var ji = 0; ji < jumps.length; ji++) {
          var j = jumps[ji];
          if (t < j.t0) continue;
          var q = clamp01((t - j.t0) / (j.t1 - j.t0));

          if (q > 0 && !j.outSplash) {                         // התזת יציאה מהמים
            j.outSplash = true;
            var od = makeSplash(j, j.x0);
            for (var o = 0; o < od.length; o++) od[o].born = t;
            j.drops = j.drops.concat(od);
          }
          if (q >= 1 && !j.inSplash) {                         // התזת כניסה למים
            j.inSplash = true;
            var idr = makeSplash(j, j.x1);
            for (var n2 = 0; n2 < idr.length; n2++) idr[n2].born = t;
            j.drops = j.drops.concat(idr);
          }

          if (q < 1) {
            var x = j.x0 + (j.x1 - j.x0) * q;
            var y = waterY - Math.sin(q * Math.PI) * (waterY - j.apex);
            // זווית לפי שיפוע הקשת; 🐬 פונה שמאלה-מעלה בערכות נפוצות
            var slope = -Math.cos(q * Math.PI) * (waterY - j.apex) * Math.PI / (j.x1 - j.x0);
            var rot = Math.atan(slope) * 0.7;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.globalAlpha = gFade;
            ctx.font = j.size + 'px serif';
            ctx.fillText('🐬', 0, 0);
            ctx.restore();
            // נצנוצים על הקשת
            if (sparkles.length < 90 && Math.random() < 0.4) {
              sparkles.push({ x: x, y: y + j.size * 0.3, born: t, life: 400 + Math.random() * 300,
                              r: (0.9 + Math.random() * 1.4) * unit });
            }
          }
          // טיפות
          for (var di = j.drops.length - 1; di >= 0; di--) {
            var dp = j.drops[di];
            var dq = (t - dp.born) / dp.life;
            if (dq >= 1) { j.drops.splice(di, 1); continue; }
            var dte = t - dp.born;
            ctx.fillStyle = hexA(di % 2 ? '#FFFFFF' : '#9FD8FF', (1 - dq) * 0.9 * gFade);
            ctx.beginPath();
            ctx.arc(dp.x + dp.ca * dp.speed * dte,
                    waterY + dp.sa * dp.speed * dte + 0.0005 * dte * dte * 0.5,
                    dp.r * (1 - dq * 0.4), 0, 6.2832);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        for (var si = sparkles.length - 1; si >= 0; si--) {
          var sp = sparkles[si];
          var sq = (t - sp.born) / sp.life;
          if (sq >= 1) { sparkles.splice(si, 1); continue; }
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - sq) * 0.8 * gFade + ')';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y + (t - sp.born) * 0.03, sp.r * (1 - sq * 0.4), 0, 6.2832);
          ctx.fill();
        }

        var tp = clamp01((t - 260) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - 540) / 300);
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
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
