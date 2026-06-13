/* success-bubble-pop.js — מסך הצלחה: בועות מתפוצצות
   בועות שקופות עם נצנוץ עולות מהתחתית ומתפוצצות לטיפות אור; בועת ענק
   עולה למרכז, מתפוצצת — והשבח קופץ מתוכה. בסופר: המון בועות וטיפות.
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
    name: 'bubble-pop',
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
      var praise  = opts.praise || 'מֻשְׁלָם!';

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
      var cx = W / 2, cy = H * 0.42;

      // בועות קטנות — לכל אחת לידה, מסלול עלייה ורגע פיצוץ
      var bubbles = [];
      var NB = isSuper ? 26 : 15;
      for (var i = 0; i < NB; i++) {
        var born = Math.random() * dur * 0.55;
        var life = 700 + Math.random() * 900;
        bubbles.push({
          x: W * (0.05 + 0.9 * Math.random()),
          r: (8 + Math.random() * 16) * unit,
          born: born, life: Math.min(life, dur - 350 - born),
          speed: 0.12 + Math.random() * 0.14,
          sway: Math.random() * 6.28,
          color: i % 3 === 0 ? glow : i % 3 === 1 ? primary : '#FFFFFF',
          drops: null
        });
      }
      // בועת הענק
      var BIG = { r: (isSuper ? 92 : 70) * unit, popAt: dur * 0.34 };

      function makeDrops(n, spread) {
        var arr = [];
        for (var d = 0; d < n; d++) {
          var ang = Math.random() * 6.2832;
          arr.push({ ca: Math.cos(ang), sa: Math.sin(ang),
                     speed: 0.04 + Math.random() * spread,
                     life: 350 + Math.random() * 300, r: (1 + Math.random() * 1.6) * unit });
        }
        return arr;
      }
      var bigDrops = makeDrops(isSuper ? 34 : 24, 0.20);

      function drawBubble(x, y, r, color, a) {
        ctx.strokeStyle = hexA(color, 0.55 * a);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = hexA(color, 0.07 * a);
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * a + ')';   // נצנוץ עליון
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.5, 3.6, 4.6); ctx.stroke();
      }
      function drawPop(x, y, r0, te, drops, color, gFade) {
        var rq = clamp01(te / 320);
        if (rq < 1) {                                          // טבעת מתרחבת
          ctx.strokeStyle = hexA(color, (1 - rq) * 0.7 * gFade);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r0 * (1 + rq * 0.9), 0, 6.2832); ctx.stroke();
        }
        for (var di = 0; di < drops.length; di++) {
          var dp = drops[di];
          var dq = te / dp.life;
          if (dq >= 1) continue;
          ctx.fillStyle = hexA(di % 2 ? '#FFFFFF' : color, (1 - dq) * 0.85 * gFade);
          ctx.beginPath();
          ctx.arc(x + dp.ca * (r0 * 0.5 + dp.speed * te), y + dp.sa * (r0 * 0.5 + dp.speed * te) + 0.0003 * te * te * 0.5,
                  dp.r * (1 - dq * 0.4), 0, 6.2832);
          ctx.fill();
        }
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
          'position:absolute;left:50%;top:55%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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

        // בועות קטנות
        for (var bi = 0; bi < bubbles.length; bi++) {
          var b = bubbles[bi];
          var age = t - b.born;
          if (age < 0) continue;
          if (age <= b.life) {
            var by = H + b.r - b.speed * age;
            var bx = b.x + Math.sin(age * 0.003 + b.sway) * 18 * unit;
            if (by > -b.r) drawBubble(bx, by, b.r, b.color, gFade);
          } else {
            if (!b.drops) b.drops = makeDrops(7, 0.08);
            var te = age - b.life;
            if (te < 600) {
              var py = H + b.r - b.speed * b.life;
              var px = b.x + Math.sin(b.life * 0.003 + b.sway) * 18 * unit;
              drawPop(px, py, b.r, te, b.drops, b.color, gFade);
            }
          }
        }

        // בועת הענק
        if (t < BIG.popAt) {
          var q = t / BIG.popAt;
          var gy = (H + BIG.r) + (cy - H - BIG.r) * (1 - Math.pow(1 - q, 2));
          var gx = cx + Math.sin(t * 0.002) * 14 * unit;
          drawBubble(gx, gy, BIG.r * (0.92 + 0.08 * Math.sin(t * 0.008)), glow, gFade);
        } else {
          drawPop(cx, cy, BIG.r, t - BIG.popAt, bigDrops, glow, gFade);
        }

        // השבח קופץ מתוך בועת הענק
        var tp = clamp01((t - BIG.popAt - 40) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - BIG.popAt - 320) / 300);
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
