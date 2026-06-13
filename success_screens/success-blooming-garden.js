/* success-blooming-garden.js — מסך הצלחה: גן פורח
   גבעולים צומחים מתחתית המסך, ופרחים נפתחים בזה אחר זה בעלי כותרת
   צבעוניים, מתנדנדים ברוח קלה; אבקת קסם עולה מהגן. בסופר: יותר
   פרחים, גדולים יותר, ופרפרים מרחפים מעל הגן.
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
    name: 'blooming-garden',
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
      var praise  = opts.praise || 'אַתְּ פּוֹרַחַת!';

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

      var unit = Math.min(W, H) / 800;
      var baseY = H * 0.99;

      // ─── הפרחים ───
      var petalCols = [primary, '#FF7E9D', accent, glow, '#FF9ECF'];
      var flowers = [];
      var NF = isSuper ? 12 : 7;
      for (var i = 0; i < NF; i++) {
        var fx = W * (0.06 + 0.88 * (i + 0.2 + Math.random() * 0.6) / NF);
        flowers.push({
          x: fx,
          h: (90 + Math.random() * 110) * unit * (isSuper ? 1.25 : 1),
          at: dur * (0.04 + 0.46 * Math.random()),
          size: (26 + Math.random() * 18) * unit * (isSuper ? 1.25 : 1),
          np: 5 + (i % 2),                                     // 5 או 6 עלי כותרת
          color: petalCols[i % petalCols.length],
          ph: Math.random() * 6.28
        });
      }

      // אבקת קסם עולה (ממוחזרת לאורך כל המסך)
      var dust = [];
      var NDU = isSuper ? 30 : 20;
      for (var d = 0; d < NDU; d++) {
        dust.push({
          x: W * Math.random(),
          speed: 0.03 + Math.random() * 0.05,
          ph: Math.random() * 1000,
          tw: Math.random() * 6.28,
          r: (0.9 + Math.random() * 1.6) * unit
        });
      }

      // פרפרים (סופר)
      var flies = [];
      if (isSuper) {
        for (var b = 0; b < 3; b++) {
          flies.push({
            ph: Math.random(), dirSign: b % 2 ? 1 : -1,
            speed: 0.8 + Math.random() * 0.5,
            yBase: H * (0.45 + Math.random() * 0.22),
            amp: 30 + Math.random() * 30,
            size: 20 + Math.random() * 10
          });
        }
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:34%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FF7E9D', 0.9) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function drawFlower(fl, t, gFade) {
        var sq = clamp01((t - fl.at) / 300);                   // צמיחת הגבעול
        if (sq <= 0) return;
        var sway = Math.sin(t * 0.0018 + fl.ph) * 0.10;
        var topX = fl.x + sway * fl.h * 0.45;
        var topY = baseY - fl.h * sq;

        ctx.strokeStyle = 'rgba(76,175,80,' + 0.85 * gFade + ')';
        ctx.lineWidth = 3 * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fl.x, baseY);
        ctx.quadraticCurveTo(fl.x + sway * fl.h * 0.1, baseY - fl.h * sq * 0.55, topX, topY);
        ctx.stroke();

        if (sq > 0.6) {                                        // עלה קטן על הגבעול
          var ly = baseY - fl.h * sq * 0.45;
          ctx.fillStyle = 'rgba(96,195,100,' + 0.8 * gFade + ')';
          ctx.beginPath();
          ctx.ellipse(fl.x + 7 * unit, ly, 9 * unit, 3.5 * unit, -0.5, 0, 6.2832);
          ctx.fill();
        }

        // פריחה — עלי כותרת נפתחים
        var bq = clamp01((t - fl.at - 280) / 350);
        if (bq <= 0) return;
        var s = easeOutBack(bq);
        ctx.save();
        ctx.translate(topX, topY);
        ctx.rotate(sway);
        for (var p = 0; p < fl.np; p++) {
          ctx.rotate(6.2832 / fl.np);
          ctx.fillStyle = hexA(fl.color, 0.92 * gFade);
          ctx.beginPath();
          ctx.ellipse(0, -fl.size * 0.52 * s, fl.size * 0.30 * s, fl.size * 0.55 * s, 0, 0, 6.2832);
          ctx.fill();
        }
        ctx.fillStyle = hexA(accent, 0.95 * gFade);            // מרכז הפרח
        ctx.beginPath();
        ctx.arc(0, 0, fl.size * 0.26 * s, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        for (var fi = 0; fi < flowers.length; fi++) drawFlower(flowers[fi], t, gFade);

        // אבקת קסם עולה
        for (var di = 0; di < dust.length; di++) {
          var du = dust[di];
          var dy = baseY - ((t * du.speed + du.ph) % (H * 0.55));
          var da = (0.25 + 0.30 * Math.abs(Math.sin(t * 0.005 + du.tw))) * gFade;
          ctx.fillStyle = hexA(di % 2 ? accent : '#FFFFFF', da);
          ctx.beginPath();
          ctx.arc(du.x + Math.sin(t * 0.002 + du.tw) * 14, dy, du.r, 0, 6.2832);
          ctx.fill();
        }

        // פרפרים (סופר)
        if (flies.length) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (var bi = 0; bi < flies.length; bi++) {
            var fb = flies[bi];
            var prog = (t * 0.00012 * fb.speed + fb.ph) % 1;
            var bx = W * (fb.dirSign > 0 ? 0.1 + 0.8 * prog : 0.9 - 0.8 * prog);
            var by = fb.yBase + Math.sin(t * 0.004 + fb.ph * 7) * fb.amp;
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(Math.sin(t * 0.012 + bi) * 0.25);
            ctx.globalAlpha = clamp01(t / 400) * gFade;
            ctx.font = Math.round(fb.size * (1 + 0.12 * Math.sin(t * 0.025))) + 'px serif';
            ctx.fillText('🦋', 0, 0);
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }

        // ─── טקסט ───
        var tp = clamp01((t - 150) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - 430) / 300);
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
