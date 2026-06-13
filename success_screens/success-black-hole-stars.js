/* success-black-hole-stars.js — מסך הצלחה: חור שחור יורק כוכבים
   חור שחור עם דיסקת ספיחה זוהרת שואב אליו ניצוצות בספירלה — ואז מתהפך
   ו"יורק" החוצה מטר כוכבים מסתחררים. מתכתב עם רקע החלל של המשחק.
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
    name: 'black-hole-stars',
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
      var praise  = opts.praise || 'וָאוּ! מַדְהִים!';

      var W = root.clientWidth || window.innerWidth;
      var H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var cx = W / 2, cy = H * 0.40;
      var unit = Math.min(W, H) / 800;
      var maxR = Math.min(W, H) * (isSuper ? 0.50 : 0.42);
      var holeR = (isSuper ? 26 : 21) * unit;
      var tFlip = dur * 0.32;                                  // רגע ההיפוך

      // ניצוצות נשאבים פנימה בספירלה
      var infall = [];
      var NI = isSuper ? 30 : 20;
      for (var i = 0; i < NI; i++) {
        var born = Math.random() * tFlip * 0.5;
        infall.push({
          a0: Math.random() * 6.2832,
          r0: (110 + Math.random() * 170) * unit,
          born: born, life: tFlip - born,
          color: i % 3 ? '#FFFFFF' : glow
        });
      }
      // כוכבים נורקים החוצה בספירלה
      var stars = [];
      var NS = isSuper ? 64 : 38;
      var scolors = [accent, '#FFFFFF', glow, primary, '#FFFFFF'];
      for (var j = 0; j < NS; j++) {
        stars.push({
          a0: Math.random() * 6.2832,
          spin: 1.6 + Math.random() * 1.4,                     // סחרור בדרך החוצה
          speed: 0.3 + Math.pow(Math.random(), 1.4) * 0.7,
          life: (dur - tFlip) * (0.65 + Math.random() * 0.35),
          size: (1.6 + Math.random() * 2.6) * unit,
          color: scolors[j % scolors.length]
        });
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:68%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:80%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function star4(x, y, r, color, a) {                      // כוכב 4 קצוות
        ctx.strokeStyle = hexA(color, a);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
        ctx.stroke();
        ctx.fillStyle = hexA('#FFFFFF', a);
        ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, 6.2832); ctx.fill();
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        var burst = t >= tFlip;
        var charge = clamp01(t / tFlip);

        // דיסקת ספיחה — טבעת אליפטית זוהרת שמסתובבת
        var ringR = holeR * 2.1 * (1 + (burst ? 0.25 * Math.exp(-(t - tFlip) / 250) : 0.08 * Math.sin(t * 0.02)));
        for (var p = 0; p < 22; p++) {
          var pa = (p / 22) * 6.2832 + t * 0.004 * (burst ? -1 : 1);
          var px = cx + Math.cos(pa) * ringR, py = cy + Math.sin(pa) * ringR * 0.34;
          var behind = Math.sin(pa) < 0;
          var pal2 = (0.35 + 0.5 * charge) * (behind ? 0.45 : 1) * gFade;
          ctx.fillStyle = hexA(p % 3 ? accent : '#FFFFFF', pal2);
          ctx.beginPath();
          ctx.arc(px, py, (1.6 + (p % 3)) * unit, 0, 6.2832);
          ctx.fill();
        }
        // הצל השחור + טבעת פוטונים
        var hg = ctx.createRadialGradient(cx, cy, holeR * 0.4, cx, cy, holeR * 2.4);
        hg.addColorStop(0, 'rgba(0,0,0,0.95)');
        hg.addColorStop(0.45, 'rgba(0,0,0,0.85)');
        hg.addColorStop(0.55, hexA(accent, 0.30 * gFade));
        hg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(cx, cy, holeR * 2.4, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,245,225,' + (0.5 + 0.4 * charge) * gFade + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, holeR, 0, 6.2832); ctx.stroke();

        if (!burst) {
          // שאיבה בספירלה פנימה
          for (var ii = 0; ii < infall.length; ii++) {
            var f = infall[ii];
            var fq = clamp01((t - f.born) / f.life);
            if (fq <= 0 || fq >= 1) continue;
            var fr = f.r0 * (1 - fq * fq) + holeR;
            var fa2 = f.a0 + fq * 5;                            // ספירלה
            ctx.fillStyle = hexA(f.color, fq * 0.85 * gFade);
            ctx.beginPath();
            ctx.arc(cx + Math.cos(fa2) * fr, cy + Math.sin(fa2) * fr * 0.55, 1.6 * unit, 0, 6.2832);
            ctx.fill();
          }
        } else {
          var te = t - tFlip;
          // הבזק היפוך רך
          var fl = 0.30 * Math.exp(-te / 160) * gFade;
          if (fl > 0.01) {
            var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
            fg.addColorStop(0, hexA(accent, fl));
            fg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }
          // הכוכבים נורקים החוצה בספירלה
          for (var si = 0; si < stars.length; si++) {
            var s = stars[si];
            var sq = clamp01(te / s.life);
            if (sq >= 1) continue;
            var sd = holeR + s.speed * maxR * easeOutCubic(sq);
            var sa2 = s.a0 + easeOutCubic(sq) * s.spin;
            var sx = cx + Math.cos(sa2) * sd;
            var sy = cy + Math.sin(sa2) * sd * (0.55 + 0.45 * sq);  // נפתח מהמישור למרחב
            star4(sx, sy, s.size * (2.2 - sq), s.color, (1 - sq * 0.7) * gFade);
          }
        }

        var tp = clamp01((t - tFlip - 120) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - tFlip - 400) / 300);
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
