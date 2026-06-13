/* success-comet-shower.js — מסך הצלחה: מטר שביטים
   שביטים זוהרים חוצים את המסך באלכסון, משאירים שובל ניצוצות,
   ומילת השבח מופיעה במרכז עם הילה. בסופר: יותר שביטים, גלים כפולים והבזק רך.
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
    name: 'comet-shower',
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
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';

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

      // ─── שביטים ───
      var colors = [glow, primary, accent, '#FFFFFF'];
      var comets = [];
      var N = isSuper ? 18 : 8;
      for (var i = 0; i < N; i++) {
        var speed = (isSuper ? 0.6 : 0.7) + Math.random() * 0.45;          // px/ms
        var born = Math.random() * dur * (isSuper ? 0.5 : 0.3);
        var life = Math.min(dur * (isSuper ? 0.42 : 0.55), dur - 220 - born);
        var big = isSuper && i < 3;                                         // שביטי זהב גדולים בסופר
        comets.push({
          x0: W * (0.15 + Math.random()),
          y0: -30 - Math.random() * H * 0.25,
          vx: -speed * (0.45 + Math.random() * 0.25),
          vy:  speed * (0.78 + Math.random() * 0.20),
          born: born,
          life: Math.max(380, life),
          size: (big ? 4.5 : 2.2) + Math.random() * 1.8,
          color: big ? accent : colors[i % colors.length],
          trail: (big ? 150 : 95) + Math.random() * 60
        });
      }
      var sparks = [];

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:41%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(44px,9vw,96px)' : 'clamp(32px,6.5vw,68px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:53%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:' + (isSuper ? 'clamp(26px,4.5vw,46px)' : 'clamp(20px,3.5vw,34px)') + ';' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function drawComet(c, t, gFade) {
        var age = t - c.born;
        if (age < 0 || age > c.life) return;
        var env = Math.sin(Math.PI * (age / c.life));          // עמעום כניסה/יציאה
        var a = env * gFade;
        var hx = c.x0 + c.vx * age, hy = c.y0 + c.vy * age;
        if (hy < -80 || hx < -150 || hy > H + 120) return;
        var len = c.trail;
        var sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
        var tx = hx - (c.vx / sp) * len, ty = hy - (c.vy / sp) * len;

        var gr = ctx.createLinearGradient(hx, hy, tx, ty);
        gr.addColorStop(0, hexA(c.color, 0.9 * a));
        gr.addColorStop(1, hexA(c.color, 0));
        ctx.strokeStyle = gr;
        ctx.lineWidth = c.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        var rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, c.size * 4);
        rg.addColorStop(0, 'rgba(255,255,255,' + (0.95 * a) + ')');
        rg.addColorStop(0.4, hexA(c.color, 0.55 * a));
        rg.addColorStop(1, hexA(c.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(hx, hy, c.size * 4, 0, 6.2832);
        ctx.fill();

        // ניצוצות נושרים מהראש
        if (sparks.length < 260 && Math.random() < (isSuper ? 0.85 : 0.55) * env) {
          sparks.push({
            x: hx, y: hy,
            vx: (Math.random() - 0.5) * 0.09,
            vy: (Math.random() - 0.25) * 0.09,
            born: t, life: 420 + Math.random() * 380,
            r: 0.8 + Math.random() * 1.6,
            color: Math.random() < 0.5 ? '#FFFFFF' : c.color
          });
        }
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        if (isSuper && t < 450) {                              // הבזק פתיחה רך
          var fa = 0.16 * (1 - t / 450);
          var fg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7);
          fg.addColorStop(0, hexA(glow, fa));
          fg.addColorStop(1, hexA(glow, 0));
          ctx.fillStyle = fg;
          ctx.fillRect(0, 0, W, H);
        }

        for (var i = 0; i < comets.length; i++) drawComet(comets[i], t, gFade);

        for (var j = sparks.length - 1; j >= 0; j--) {
          var s = sparks[j];
          var sa = (t - s.born) / s.life;
          if (sa >= 1) { sparks.splice(j, 1); continue; }
          var dt = t - s.born;
          ctx.fillStyle = hexA(s.color === '#FFFFFF' ? '#FFFFFF' : s.color, (1 - sa) * 0.9 * gFade);
          ctx.beginPath();
          ctx.arc(s.x + s.vx * dt, s.y + s.vy * dt + 0.00005 * dt * dt, s.r * (1 - sa * 0.5), 0, 6.2832);
          ctx.fill();
        }

        // טקסט: פופ עם easeOutBack, נשימה קלה, דעיכה בסוף
        var tp = clamp01((t - 120) / 320);
        var sc = tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0;
        txt.style.transform = 'translate(-50%,-50%) scale(' + sc + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);

        if (ptsEl) {
          var pp = clamp01((t - 420) / 300);
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
