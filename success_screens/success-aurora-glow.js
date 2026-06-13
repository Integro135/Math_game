/* success-aurora-glow.js — מסך הצלחה: זוהר קוטבי
   סרטי אורורה רכים בירוק-ורוד-סגול מתנחשלים על פני השמיים, כוכבים
   מנצנצים, והשבח זוהר במרכז. בסופר: סרט נוסף, עמודי שביב אנכיים
   ובהירות גבוהה. רגוע וקסום — איזון לסגנונות האנרגטיים.
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
    name: 'aurora-glow',
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
      var praise  = opts.praise || 'אַתְּ זוֹהֶרֶת!';

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

      // סרטי אורורה
      var ribbons = [
        { baseY: H * 0.16, amp: 34 * unit, k: 0.0065, w: 0.0011, ph: 0,   h: 130 * unit, color: '#4DE8A8' },
        { baseY: H * 0.26, amp: 44 * unit, k: 0.0050, w: 0.0009, ph: 2.1, h: 150 * unit, color: primary },
        { baseY: H * 0.36, amp: 30 * unit, k: 0.0080, w: 0.0013, ph: 4.2, h: 120 * unit, color: glow }
      ];
      if (isSuper) ribbons.push(
        { baseY: H * 0.10, amp: 38 * unit, k: 0.0058, w: 0.0010, ph: 1.2, h: 140 * unit, color: '#FF7E9D' });

      // כוכבים מנצנצים
      var stars = [];
      for (var i = 0; i < (isSuper ? 36 : 24); i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H * 0.7,
                     tw: Math.random() * 6.28, r: (0.7 + Math.random() * 1.5) * unit });
      }
      // עמודי שביב אנכיים (סופר)
      var pillars = [];
      if (isSuper) {
        for (var p = 0; p < 6; p++) {
          pillars.push({ x: W * (0.08 + 0.84 * Math.random()), ph: Math.random() * 6.28,
                         w: (14 + Math.random() * 22) * unit, top: H * (0.05 + Math.random() * 0.15) });
        }
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:58%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#4DE8A8', 0.85) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:71%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 280) * clamp01(t / 300);   // עמעום כניסה ויציאה

        ctx.clearRect(0, 0, W, H);

        // סרטי אורורה — קצה עליון גלי, מילוי גרדיאנט יורד
        for (var ri = 0; ri < ribbons.length; ri++) {
          var rb = ribbons[ri];
          var grad = ctx.createLinearGradient(0, rb.baseY - rb.amp, 0, rb.baseY + rb.h);
          grad.addColorStop(0, hexA(rb.color, (isSuper ? 0.34 : 0.27) * gFade));
          grad.addColorStop(1, hexA(rb.color, 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          var step = 26;
          ctx.moveTo(-20, rb.baseY + Math.sin(-20 * rb.k + t * rb.w + rb.ph) * rb.amp);
          for (var x = -20 + step; x <= W + 20; x += step) {
            ctx.lineTo(x, rb.baseY + Math.sin(x * rb.k + t * rb.w + rb.ph) * rb.amp);
          }
          ctx.lineTo(W + 20, rb.baseY + rb.h);
          ctx.lineTo(-20, rb.baseY + rb.h);
          ctx.closePath();
          ctx.fill();
          // קו בוהק לאורך הקצה
          ctx.strokeStyle = hexA(rb.color, 0.5 * gFade);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(-20, rb.baseY + Math.sin(-20 * rb.k + t * rb.w + rb.ph) * rb.amp);
          for (var x2 = -20 + step; x2 <= W + 20; x2 += step) {
            ctx.lineTo(x2, rb.baseY + Math.sin(x2 * rb.k + t * rb.w + rb.ph) * rb.amp);
          }
          ctx.stroke();
        }

        // עמודי שביב
        for (var pi = 0; pi < pillars.length; pi++) {
          var pl = pillars[pi];
          var pa = (0.10 + 0.10 * Math.sin(t * 0.002 + pl.ph)) * gFade;
          if (pa <= 0.02) continue;
          var pg = ctx.createLinearGradient(0, pl.top, 0, H * 0.55);
          pg.addColorStop(0, hexA('#4DE8A8', pa));
          pg.addColorStop(1, hexA('#4DE8A8', 0));
          ctx.fillStyle = pg;
          ctx.fillRect(pl.x - pl.w / 2, pl.top, pl.w, H * 0.55 - pl.top);
        }

        // כוכבים
        for (var si = 0; si < stars.length; si++) {
          var s = stars[si];
          ctx.fillStyle = hexA('#FFFFFF', (0.25 + 0.45 * Math.abs(Math.sin(t * 0.004 + s.tw))) * gFade);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
        }

        var tp = clamp01((t - 200) / 340);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.025 * Math.sin(t * 0.003)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * clamp01((dur - t) / 280));
        if (ptsEl) {
          var pp = clamp01((t - 500) / 300);
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
