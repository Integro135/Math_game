/* success-trophy-shine.js — מסך הצלחה: גביע זוהר
   גביע 🏆 עולה וקופץ למרכז, קרני זהב מסתובבות מאחוריו, וניצוצות נופלים
   סביבו. בסופר: קרניים בוהקות יותר, זר כוכבים סובב וגשם נצנוצים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  window.SUCCESS.styles.push({
    name: 'trophy-shine',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'אַלּוּפָה!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800, cx = W / 2, cy = H * 0.40;
      var U = isSuper ? 120 : 92, tLand = 520;

      var trophy = document.createElement('div'); trophy.textContent = '🏆';
      trophy.style.cssText = 'position:absolute;left:0;top:0;line-height:1;font-size:' + U + 'px;' +
        'will-change:transform;filter:drop-shadow(0 0 16px ' + hexA(accent, .8) + ')';
      root.appendChild(trophy);

      var sparks = [];
      var NS = isSuper ? 26 : 16;
      for (var i = 0; i < NS; i++) {
        var a = Math.random() * 6.2832;
        sparks.push({ ca: Math.cos(a), sa: Math.sin(a), sp: 0.05 + Math.random() * 0.16,
          life: 380 + Math.random() * 340, r: (1 + Math.random() * 1.7) * unit, delay: tLand });
      }
      var rain = [];
      if (isSuper) for (var r2 = 0; r2 < 14; r2++)
        rain.push({ x: W * (0.1 + 0.8 * Math.random()), born: tLand + Math.random() * (dur - tLand - 700),
          speed: 0.09 + Math.random() * 0.07, size: 11 + Math.random() * 8, om: (Math.random() - 0.5) * 0.006 });

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:62%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .95) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:74%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, .8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250), landed = t >= tLand;
        ctx.clearRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (landed) {
          var rayA = clamp01((t - tLand) / 400) * (isSuper ? 0.11 : 0.075) * gFade;
          for (var k = 0; k < 12; k++) {
            var ra = (k / 12) * 6.2832 + t * 0.0007;
            ctx.fillStyle = hexA(accent, rayA * (0.6 + 0.4 * Math.sin(t * 0.003 + k)));
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, U * 2.6, ra, ra + 0.13); ctx.closePath(); ctx.fill();
          }
        }
        var cy2 = landed ? cy + Math.sin(t * 0.003) * 4 : -U + (cy + U) * easeOutBounce(t / tLand);
        trophy.style.opacity = String(gFade);
        trophy.style.transform = 'translate(' + (cx - U / 2) + 'px,' + (cy2 - U / 2) + 'px) rotate(' + Math.sin(t * 0.002) * 2 + 'deg)';
        if (landed) {
          var te = t - tLand;
          for (var si = 0; si < sparks.length; si++) {
            var s = sparks[si], q = te / s.life;
            if (q >= 1) continue;
            ctx.fillStyle = hexA(si % 2 ? accent : '#FFFFFF', (1 - q) * 0.9 * gFade);
            ctx.beginPath(); ctx.arc(cx + s.ca * s.sp * te, cy + s.sa * s.sp * te * 0.7, s.r * (1 - q * 0.5), 0, 6.2832); ctx.fill();
          }
        }
        for (var ri = 0; ri < rain.length; ri++) {
          var rd = rain[ri], rte = t - rd.born; if (rte < 0) continue;
          var ry = -20 + rd.speed * rte; if (ry > H + 20) continue;
          ctx.save(); ctx.translate(rd.x, ry); ctx.rotate(rd.om * rte); ctx.globalAlpha = gFade;
          ctx.font = Math.round(rd.size) + 'px serif'; ctx.fillText('⭐', 0, 0); ctx.restore();
        }
        ctx.globalAlpha = 1;
        var tp = clamp01((t - tLand - 60) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - tLand - 340) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);
      return function cleanup() {
        if (killed) return; killed = true; cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (trophy.parentNode) trophy.parentNode.removeChild(trophy);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
