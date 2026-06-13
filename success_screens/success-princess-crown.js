/* success-princess-crown.js — מסך הצלחה: כתר מלכה
   כתר (👑) צונח מלמעלה עם קפיצה ונוחת מעל השבח "אַתְּ מַלְכָּה!";
   קרני זהב מסתובבות מאחוריו, יהלומים מנצנצים סובבים אותו.
   בסופר: גשם יהלומים וקרניים בוהקות. מתאים במיוחד למצב "מלכה" 👸.
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

  window.SUCCESS.styles.push({
    name: 'princess-crown',
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
      var praise  = opts.praise || 'אַתְּ מַלְכָּה!';

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
      var cx = W / 2, crownY = H * 0.30;
      var U = isSuper ? 118 : 92;
      var tLand = 520;

      var crown = document.createElement('div');
      crown.textContent = '👑';
      crown.style.cssText =
        'position:absolute;left:0;top:0;line-height:1;font-size:' + U + 'px;' +
        'will-change:transform;filter:drop-shadow(0 0 16px ' + hexA(accent, 0.75) + ')';
      root.appendChild(crown);

      // יהלומים סובבים את הכתר
      var gems = [];
      var NG = isSuper ? 12 : 8;
      for (var i = 0; i < NG; i++) {
        gems.push({ a0: (i / NG) * 6.2832, rx: U * (0.95 + Math.random() * 0.25),
                    ry: U * 0.45, tw: Math.random() * 6.28, size: 13 + Math.random() * 9 });
      }
      // גשם יהלומים (סופר)
      var rain = [];
      if (isSuper) {
        for (var r = 0; r < 14; r++) {
          rain.push({ x: W * (0.08 + 0.84 * Math.random()), born: tLand + Math.random() * (dur - tLand - 700),
                      speed: 0.09 + Math.random() * 0.08, size: 12 + Math.random() * 9,
                      om: (Math.random() - 0.5) * 0.007 });
        }
      }
      // ניצוצות נחיתה
      var landSparks = [];
      var NL = isSuper ? 22 : 14;
      for (var l = 0; l < NL; l++) {
        var ang = Math.random() * 6.2832;
        landSparks.push({ ca: Math.cos(ang), sa: Math.sin(ang),
                          speed: 0.05 + Math.random() * 0.16,
                          life: 350 + Math.random() * 300, r2: (1 + Math.random() * 1.7) * unit });
      }

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:55%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:68%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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

        var landed = t >= tLand;

        // קרני זהב מסתובבות מאחורי הכתר
        if (landed) {
          var rayA = clamp01((t - tLand) / 400) * (isSuper ? 0.10 : 0.07) * gFade;
          for (var ry2 = 0; ry2 < 10; ry2++) {
            var ra = (ry2 / 10) * 6.2832 + t * 0.0006;
            ctx.fillStyle = hexA(accent, rayA * (0.6 + 0.4 * Math.sin(t * 0.003 + ry2)));
            ctx.beginPath();
            ctx.moveTo(cx, crownY);
            ctx.arc(cx, crownY, U * 2.4, ra, ra + 0.16);
            ctx.closePath();
            ctx.fill();
          }
        }

        // הכתר נופל עם קפיצה
        var cy2;
        if (!landed) {
          cy2 = -U * 1.4 + (crownY + U * 1.4) * easeOutBounce(t / tLand);
        } else {
          cy2 = crownY + Math.sin(t * 0.003) * 4;              // ריחוף עדין
        }
        crown.style.transform = 'translate(' + (cx - U * 0.5) + 'px,' + (cy2 - U * 0.5) + 'px)' +
                                ' rotate(' + Math.sin(t * 0.002) * 3 + 'deg)';
        crown.style.opacity = String(gFade);

        // ניצוצות נחיתה
        if (landed) {
          var te = t - tLand;
          for (var ls = 0; ls < landSparks.length; ls++) {
            var sp = landSparks[ls];
            var sq = te / sp.life;
            if (sq >= 1) continue;
            ctx.fillStyle = hexA(ls % 2 ? accent : '#FFFFFF', (1 - sq) * 0.9 * gFade);
            ctx.beginPath();
            ctx.arc(cx + sp.ca * sp.speed * te, crownY + U * 0.3 + sp.sa * sp.speed * te * 0.6,
                    sp.r2 * (1 - sq * 0.5), 0, 6.2832);
            ctx.fill();
          }
        }

        // יהלומים סובבים
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var gemA = clamp01((t - tLand + 200) / 400);
        if (gemA > 0) {
          for (var gi = 0; gi < gems.length; gi++) {
            var g = gems[gi];
            var ga = g.a0 + t * 0.0009;
            var gx = cx + Math.cos(ga) * g.rx;
            var gy = cy2 + Math.sin(ga) * g.ry;
            var behind = Math.sin(ga) < 0;
            ctx.globalAlpha = gemA * (behind ? 0.45 : 0.95) *
                              (0.6 + 0.4 * Math.abs(Math.sin(t * 0.005 + g.tw))) * gFade;
            ctx.font = Math.round(g.size * (behind ? 0.8 : 1)) + 'px serif';
            ctx.fillText('💎', gx, gy);
          }
          ctx.globalAlpha = 1;
        }
        // גשם יהלומים (סופר)
        for (var ri = 0; ri < rain.length; ri++) {
          var rd = rain[ri];
          var rte = t - rd.born;
          if (rte < 0) continue;
          var ryy = -20 + rd.speed * rte;
          if (ryy > H + 20) continue;
          ctx.save();
          ctx.translate(rd.x, ryy);
          ctx.rotate(rd.om * rte);
          ctx.globalAlpha = gFade;
          ctx.font = Math.round(rd.size) + 'px serif';
          ctx.fillText('💎', 0, 0);
          ctx.restore();
        }
        ctx.globalAlpha = 1;

        var tp = clamp01((t - tLand - 60) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - tLand - 340) / 300);
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
        if (crown.parentNode) crown.parentNode.removeChild(crown);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
