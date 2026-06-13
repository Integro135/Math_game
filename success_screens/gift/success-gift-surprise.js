/* success-gift-surprise.js — מסך פרס: הפתעת מתנה (סוף מקצה)
   קופסת מתנה 🎁 נופלת מלמעלה עם קפיצה, מתנדנדת בהתרגשות עם זוהר גובר,
   ואז מתפוצצת — צעצועים, ממתקים וכוכבים עפים מתוכה במזרקה עם נפילה
   חופשית. בסופר: קופסה גדולה יותר, גל שני של הפתעות והבזק זהוב.

   זהו מסך פרס "מיוחד": הוא אינו חלק ברוטציה שאחרי כל תשובה נכונה. המארח
   (game/js/success.js → showGiftScreen) מפעיל אותו רק בסוף מקצה כשהציון
   חוצה את רף המתנה (GIFT_GOALS ב-core.js). לכן הוא נרשם תחת
   window.SUCCESS.special.gift ולא תחת window.SUCCESS.styles (הרוטציה).
   חוזה ה-show() זהה לשאר המסכים (ראו success_screens_spec.md §"מסכי פרס"). */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.special = window.SUCCESS.special || {};

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.special.gift = {
    name: 'gift-surprise',
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
      var praise  = opts.praise || 'מַתָּנָה בִּשְׁבִילֵךְ!';

      var W = root.clientWidth || window.innerWidth;
      var H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);

      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var cx = W / 2, cy = H * 0.42;
      var B = isSuper ? 130 : 100;                             // גודל הקופסה
      var tDrop = 330;
      var tBurst = dur * (isSuper ? 0.40 : 0.44);

      // ─── הקופסה (DOM, אימוג'י) ───
      var box = document.createElement('div');
      box.textContent = '🎁';
      box.style.cssText =
        'position:absolute;left:0;top:0;line-height:1;font-size:' + B + 'px;' +
        'will-change:transform,opacity,filter;transform-origin:50% 60%';
      root.appendChild(box);
      var boxX = cx - B * 0.5, boxY = cy - B * 0.55;

      // ─── הפתעות שעפות מהקופסה ───
      var GOODIES = ['🧸', '🍭', '⭐', '💖', '🎀', '🦄', '✨', '🍬'];
      var goodies = [];
      var NG = isSuper ? 26 : 15;
      for (var i = 0; i < NG; i++) {
        goodies.push({
          em: GOODIES[i % GOODIES.length],
          vx: (Math.random() - 0.5) * 0.95,
          vy: -(0.18 + Math.random() * 0.34),                  // מזרקה כלפי מעלה
          om: (Math.random() - 0.5) * 0.012,                   // סיבוב
          size: (30 + Math.random() * 24) * (isSuper ? 1.2 : 1),
          delay: isSuper && i >= NG * 0.6 ? 600 : 0            // גל שני בסופר
        });
      }
      // ניצוצות הפיצוץ
      var sparks = [];
      var NS = isSuper ? 30 : 20;
      for (var j = 0; j < NS; j++) {
        var ang = Math.random() * 6.2832;
        sparks.push({
          ca: Math.cos(ang), sa: Math.sin(ang),
          speed: 0.10 + Math.random() * 0.30,
          life: 350 + Math.random() * 350,
          r: 1 + Math.random() * 1.8,
          color: j % 2 ? accent : '#FFFFFF'
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:70%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = tBurst + 100;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:82%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // ─── הקופסה ───
        if (t < tDrop) {                                       // נפילה עם קפיצה
          var dq = easeOutBounce(t / tDrop);
          var by = -B * 1.5 + (boxY + B * 1.5) * dq;
          box.style.transform = 'translate(' + boxX + 'px,' + by + 'px)';
          box.style.opacity = '1';
        } else if (t < tBurst) {                               // רעד של התרגשות
          var sq2 = (t - tDrop) / (tBurst - tDrop);
          var amp = 3 + 10 * sq2;
          var rot = Math.sin(t * 0.045) * amp;
          var scl = 1 + 0.05 * Math.sin(t * 0.03) + 0.12 * sq2;
          box.style.transform = 'translate(' + boxX + 'px,' + boxY + 'px) rotate(' + rot + 'deg) scale(' + scl + ')';
          box.style.filter = 'drop-shadow(0 0 ' + (4 + 22 * sq2) + 'px ' + hexA(accent, 0.85) + ')';
        } else {                                               // פיצוץ — הקופסה נעלמת
          var bq = clamp01((t - tBurst) / 170);
          box.style.transform = 'translate(' + boxX + 'px,' + boxY + 'px) scale(' + (1.12 + 0.6 * bq) + ')';
          box.style.opacity = String(1 - bq);
        }

        var te = t - tBurst;
        if (te > 0) {
          // הבזק זהוב רך
          var fa = (isSuper ? 0.34 : 0.26) * Math.exp(-te / 170) * gFade;
          if (fa > 0.01) {
            var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.35, hexA(accent, fa * 0.6));
            fg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }

          // ניצוצות
          for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si];
            var sq = te / sp.life;
            if (sq >= 1) continue;
            ctx.fillStyle = hexA(sp.color, (1 - sq) * 0.9 * gFade);
            ctx.beginPath();
            ctx.arc(cx + sp.ca * sp.speed * te * (1 - 0.4 * sq),
                    cy + sp.sa * sp.speed * te * (1 - 0.4 * sq),
                    sp.r * (1 - sq * 0.5), 0, 6.2832);
            ctx.fill();
          }

          // ההפתעות — מזרקה עם כבידה וסיבוב
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (var gi = 0; gi < goodies.length; gi++) {
            var g = goodies[gi];
            var ge = te - g.delay;
            if (ge <= 0) continue;
            var gx = cx + g.vx * ge;
            var gy = cy + g.vy * ge + 0.00038 * ge * ge;
            if (gy > H + 60) continue;
            var ga = clamp01(2.5 - ge / (dur - tBurst - g.delay) * 2.5) * gFade;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(g.om * ge);
            ctx.globalAlpha = Math.min(ga, 1);
            ctx.font = Math.round(g.size) + 'px serif';
            ctx.fillText(g.em, 0, 0);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }

        // ─── טקסט ───
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
        if (box.parentNode) box.parentNode.removeChild(box);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  };
})();
