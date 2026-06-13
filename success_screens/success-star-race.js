/* success-star-race.js — מסך הצלחה: מרוץ כוכבים נופלים
   כוכבים זוהרים בצבעים שונים דוהרים לרוחב המסך עם שובלים, אל קו סיום
   נוצץ; המנצח מתפוצץ לזיקוק ניצוצות והשבח קופץ. בסופר: חמישה מתחרים
   וכל אחד מתפוצץ קטן בהגיעו. נרשם לפי החוזה ב-success_screens_spec.md. */
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
    name: 'star-race',
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
      var praise  = opts.praise || 'אַתְּ מְנַצַּחַת!';

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
      var finishX = W * 0.13;
      var startX = W + 60;

      // המתחרים — הראשון תמיד מנצח
      var N = isSuper ? 5 : 3;
      var rcolors = [accent, glow, primary, '#FF7E9D', '#82E8A8'];
      var racers = [];
      for (var i = 0; i < N; i++) {
        racers.push({
          y: H * (0.18 + i * (isSuper ? 0.085 : 0.11)),
          tArr: dur * (0.52 + i * 0.09),                       // זמן הגעה
          color: rcolors[i % rcolors.length],
          bob: Math.random() * 6.28,
          size: (i === 0 ? 5 : 4) * unit,
          burst: null                                          // ניצוצות סיום (נוצר בהגעה)
        });
      }
      // ניצוצות פיצוץ מוכנים מראש לכל מתחרה
      for (var bi = 0; bi < N; bi++) {
        var arr = [];
        var nB = bi === 0 ? (isSuper ? 30 : 22) : 10;
        for (var k = 0; k < nB; k++) {
          var ang = Math.random() * 6.2832;
          arr.push({ ca: Math.cos(ang), sa: Math.sin(ang),
                     speed: 0.06 + Math.random() * (bi === 0 ? 0.22 : 0.12),
                     life: 400 + Math.random() * 350, r: (1 + Math.random() * 1.8) * unit });
        }
        racers[bi].burst = arr;
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:64%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = racers[0].tArr + 100;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:77%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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

        // קו הסיום — עמוד נצנוצים אנכי
        var fTop = racers[0].y - 50, fBot = racers[N - 1].y + 50;
        for (var fy = fTop; fy < fBot; fy += 14) {
          var fa = (0.25 + 0.30 * Math.abs(Math.sin(t * 0.006 + fy * 0.21))) * gFade;
          ctx.fillStyle = hexA('#FFFFFF', fa);
          ctx.beginPath();
          ctx.arc(finishX, fy, 1.4 * unit, 0, 6.2832);
          ctx.fill();
        }

        for (var ri = 0; ri < racers.length; ri++) {
          var r = racers[ri];
          var prog = clamp01(t / r.tArr);
          var x = startX + (finishX - startX) * (prog < 1 ? (1 - Math.pow(1 - prog, 2)) : 1);
          var y = r.y + Math.sin(t * 0.012 + r.bob) * 7;

          if (prog < 1) {
            // שובל
            var trailLen = 110 * unit + (ri === 0 ? 40 * unit : 0);
            var gr = ctx.createLinearGradient(x, y, x + trailLen, y);
            gr.addColorStop(0, hexA(r.color, 0.85 * gFade));
            gr.addColorStop(1, hexA(r.color, 0));
            ctx.strokeStyle = gr;
            ctx.lineWidth = r.size * 0.8;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + trailLen, y + 6); ctx.stroke();
            // ראש זוהר
            var hg = ctx.createRadialGradient(x, y, 0, x, y, r.size * 3.4);
            hg.addColorStop(0, 'rgba(255,255,255,' + 0.95 * gFade + ')');
            hg.addColorStop(0.4, hexA(r.color, 0.6 * gFade));
            hg.addColorStop(1, hexA(r.color, 0));
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(x, y, r.size * 3.4, 0, 6.2832); ctx.fill();
          } else {
            // פיצוץ בקו הסיום
            var te = t - r.tArr;
            for (var pj = 0; pj < r.burst.length; pj++) {
              var b = r.burst[pj];
              var bq = te / b.life;
              if (bq >= 1) continue;
              ctx.fillStyle = hexA(pj % 2 ? '#FFFFFF' : r.color, (1 - bq) * 0.9 * gFade);
              ctx.beginPath();
              ctx.arc(finishX + b.ca * b.speed * te, r.y + b.sa * b.speed * te,
                      b.r * (1 - bq * 0.5), 0, 6.2832);
              ctx.fill();
            }
          }
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 280) / 300);
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
