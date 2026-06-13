/* success-constellation-heart.js — מסך הצלחה: קונסטלציית לב
   כוכבים נדלקים בזה אחר זה בנקודות של צורת לב, קווי קונסטלציה נמתחים
   ביניהם, והלב המושלם פועם בזוהר. בסופר: לב גדול יותר, פרץ ניצוצות
   מהקודקודים והד-לב מתרחב. נרשם לפי החוזה ב-success_screens_spec.md. */
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
  // לב פרמטרי קלאסי: רוחב ~32 יח', גובה ~30 יח' (y חיובי = למעלה)
  function heartXY(a) {
    var s = Math.sin(a);
    return {
      x: 16 * s * s * s,
      y: 13 * Math.cos(a) - 5 * Math.cos(2 * a) - Math.cos(3 * a) - Math.cos(4 * a)
    };
  }

  window.SUCCESS.styles.push({
    name: 'constellation-heart',
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
      var praise  = opts.praise || 'אַתְּ אַלּוּפָה!';

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

      // ─── גיאומטריה ───
      var N = isSuper ? 16 : 12;
      var sc = Math.min(W, H) * (isSuper ? 0.0165 : 0.0135);
      var cx = W / 2, cy = H * 0.40;
      var pts = [];
      for (var i = 0; i < N; i++) {
        var p = heartXY(Math.PI + (i / N) * Math.PI * 2);     // מתחילים מהחוד התחתון
        pts.push({ x: cx + p.x * sc, y: cy - p.y * sc, tw: Math.random() * 6.28, ti: 0 });
      }
      // נתיב צפוף לחלק/מילוי/הד
      var heartPath = new Path2D();
      for (var k = 0; k <= 64; k++) {
        var hp = heartXY(Math.PI + (k / 64) * Math.PI * 2);
        if (k === 0) heartPath.moveTo(cx + hp.x * sc, cy - hp.y * sc);
        else heartPath.lineTo(cx + hp.x * sc, cy - hp.y * sc);
      }
      heartPath.closePath();

      // לוח זמנים (שברי dur): כוכבים 0.05–0.41, קווים 0.20–0.68, פעימה 0.68–0.94
      for (var si = 0; si < N; si++) pts[si].ti = dur * (0.05 + 0.36 * si / (N - 1));
      var POP = 260;                                           // משך פופ של כוכב

      // פרץ ניצוצות מהקודקודים (סופר בלבד), כיוון החוצה מהמרכז
      var burst = [];
      if (isSuper) {
        for (var bi = 0; bi < N * 2; bi++) {
          var src = pts[bi % N];
          var dx = src.x - cx, dy = src.y - cy;
          var dl = Math.sqrt(dx * dx + dy * dy) || 1;
          var spd = 0.05 + Math.random() * 0.07;
          burst.push({
            x: src.x, y: src.y,
            vx: (dx / dl) * spd + (Math.random() - 0.5) * 0.03,
            vy: (dy / dl) * spd + (Math.random() - 0.5) * 0.03,
            r: 1 + Math.random() * 1.8,
            color: Math.random() < 0.5 ? '#FFFFFF' : accent
          });
        }
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:72%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(30px,6vw,60px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 44px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:83%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function drawStar(s, t, gFade) {
        var ap = clamp01((t - s.ti) / POP);
        if (ap <= 0) return;
        var r = (isSuper ? 3 : 2.4) * easeOutBack(ap) * (1 + 0.18 * Math.sin(t * 0.008 + s.tw));
        var a = Math.min(ap * 2, 1) * gFade;

        var rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5);
        rg.addColorStop(0, 'rgba(255,255,255,' + 0.95 * a + ')');
        rg.addColorStop(0.35, hexA(glow, 0.5 * a));
        rg.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 5, 0, 6.2832);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, 6.2832);
        ctx.fill();

        if (ap < 1) {                                          // הבזק-צלב מתכווץ בלידה
          var fl = r * (7 - 5 * ap);
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - ap) * 0.85 * a + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(s.x - fl, s.y); ctx.lineTo(s.x + fl, s.y);
          ctx.moveTo(s.x, s.y - fl); ctx.lineTo(s.x, s.y + fl);
          ctx.stroke();
        }
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var pr = Math.min(1, t / dur);
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // קווי קונסטלציה — נמתחים בהדרגה
        var lp = clamp01((pr - 0.20) / 0.48) * N;
        var full = Math.floor(lp), frac = lp - full;
        ctx.lineCap = 'round';
        for (var pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass === 0 ? hexA(glow, 0.16 * gFade) : hexA(glow, 0.7 * gFade);
          ctx.lineWidth = pass === 0 ? 5 : 1.5;
          ctx.beginPath();
          for (var li = 0; li < full && li < N; li++) {
            var a1 = pts[li], b1 = pts[(li + 1) % N];
            ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y);
          }
          if (full < N && frac > 0) {
            var a2 = pts[full], b2 = pts[(full + 1) % N];
            ctx.moveTo(a2.x, a2.y);
            ctx.lineTo(a2.x + (b2.x - a2.x) * frac, a2.y + (b2.y - a2.y) * frac);
          }
          ctx.stroke();
        }

        // פעימת זוהר אחרי שהלב נסגר
        if (pr > 0.68) {
          var pu = Math.max(0, Math.sin((pr - 0.68) / 0.26 * Math.PI * 2));
          ctx.fillStyle = hexA(primary, (0.05 + 0.10 * pu) * gFade);
          ctx.fill(heartPath);
          ctx.strokeStyle = hexA(glow, (0.25 + 0.35 * pu) * gFade);
          ctx.lineWidth = 2;
          ctx.stroke(heartPath);

          if (isSuper) {                                       // הד-לב מתרחב
            var ep = clamp01((pr - 0.70) / 0.22);
            if (ep > 0 && ep < 1) {
              ctx.save();
              ctx.translate(cx, cy);
              ctx.scale(1 + 0.55 * ep, 1 + 0.55 * ep);
              ctx.translate(-cx, -cy);
              ctx.strokeStyle = hexA(primary, 0.5 * (1 - ep) * gFade);
              ctx.lineWidth = 2;
              ctx.stroke(heartPath);
              ctx.restore();
            }
            // פרץ ניצוצות מהקודקודים
            var bp = (pr - 0.70) * dur;
            if (bp > 0) {
              for (var qi = 0; qi < burst.length; qi++) {
                var q = burst[qi];
                var qa = clamp01(1 - bp / 700);
                if (qa <= 0) break;
                ctx.fillStyle = hexA(q.color, 0.9 * qa * gFade);
                ctx.beginPath();
                ctx.arc(q.x + q.vx * bp, q.y + q.vy * bp, q.r * qa, 0, 6.2832);
                ctx.fill();
              }
            }
          }
        }

        for (var di = 0; di < N; di++) drawStar(pts[di], t, gFade);

        // טקסט
        var tp = clamp01((t - 150) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp2 = clamp01((t - 420) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp2 > 0 ? easeOutBack(pp2) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp2 * 2, 1) * gFade);
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
