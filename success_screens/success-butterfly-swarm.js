/* success-butterfly-swarm.js — מסך הצלחה: נחיל פרפרים
   פרפרים (🦋) פורחים מהמרכז ומתעופפים החוצה במסלולים מתעקלים עם
   רפרוף כנפיים ושובל אבק נוצץ. בסופר: נחיל גדול + לבבות מרחפים.
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
    name: 'butterfly-swarm',
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
      var praise  = opts.praise || 'נִפְלָא!';

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
      var cx = W / 2, cy = H * 0.46;
      var maxR = Math.min(W, H) * 0.55;

      var flies = [];
      var NF = isSuper ? 18 : 10;
      for (var i = 0; i < NF; i++) {
        var ang = (i / NF) * 6.2832 + Math.random() * 0.5;
        flies.push({
          ang: ang,
          born: (i / NF) * dur * 0.30,
          dist: maxR * (0.7 + Math.random() * 0.5),
          curve: (Math.random() - 0.5) * 1.6,                  // עיקול המסלול
          flap: Math.random() * 6.28,
          size: (22 + Math.random() * 12) * (isSuper ? 1.1 : 1)
        });
      }
      var hearts = [];
      if (isSuper) {
        for (var h = 0; h < 8; h++) {
          hearts.push({ x: W * (0.2 + 0.6 * Math.random()), born: 300 + Math.random() * dur * 0.4,
                        speed: 0.035 + Math.random() * 0.03, size: 14 + Math.random() * 10,
                        sway: Math.random() * 6.28 });
        }
      }
      var dust = [];

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FF7E9D', 0.9) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
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
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (var fi = 0; fi < flies.length; fi++) {
          var f = flies[fi];
          var age = t - f.born;
          if (age < 0) continue;
          var q = clamp01(age / (dur - f.born - 150));
          var eq = easeOutCubic(q);
          var a2 = f.ang + f.curve * eq;                       // מסלול מתעקל
          var d = f.dist * eq;
          var fx = cx + Math.cos(a2) * d;
          var fy = cy + Math.sin(a2) * d * 0.8 - Math.sin(age * 0.006 + f.flap) * 14;
          var flap = 1 + 0.22 * Math.sin(age * 0.025 + f.flap);
          var appear = clamp01(age / 250);

          // אבק נוצץ מאחורי הפרפר
          if (dust.length < 200 && Math.random() < 0.35 && q < 0.9) {
            dust.push({ x: fx, y: fy + 6, born: t, life: 450 + Math.random() * 350,
                        r: (0.8 + Math.random() * 1.4) * unit,
                        color: fi % 3 === 0 ? accent : fi % 3 === 1 ? '#FFFFFF' : glow });
          }

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(Math.cos(a2) > 0 ? 0.3 : -0.3);
          ctx.scale(1, flap);                                  // רפרוף
          ctx.globalAlpha = appear * (1 - Math.pow(q, 3)) * gFade;
          ctx.font = Math.round(f.size) + 'px serif';
          ctx.fillText('🦋', 0, 0);
          ctx.restore();
        }
        ctx.globalAlpha = 1;

        for (var di = dust.length - 1; di >= 0; di--) {
          var dp = dust[di];
          var dq = (t - dp.born) / dp.life;
          if (dq >= 1) { dust.splice(di, 1); continue; }
          ctx.fillStyle = hexA(dp.color, (1 - dq) * 0.8 * gFade);
          ctx.beginPath();
          ctx.arc(dp.x, dp.y + (t - dp.born) * 0.02, dp.r * (1 - dq * 0.4), 0, 6.2832);
          ctx.fill();
        }

        // לבבות (סופר)
        for (var hi = 0; hi < hearts.length; hi++) {
          var hh = hearts[hi];
          var hte = t - hh.born;
          if (hte < 0) continue;
          var hy = H * 0.8 - hh.speed * hte;
          if (hy < -20) continue;
          ctx.globalAlpha = clamp01(hte / 300) * gFade * 0.9;
          ctx.font = Math.round(hh.size) + 'px serif';
          ctx.fillText('💗', hh.x + Math.sin(hte * 0.003 + hh.sway) * 22, hy);
        }
        ctx.globalAlpha = 1;

        var tp = clamp01((t - 220) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - 500) / 300);
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
