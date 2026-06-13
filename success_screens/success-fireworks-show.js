/* success-fireworks-show.js — מסך הצלחה: מופע זיקוקים
   פגזי זיקוק עולים מלמטה ומתפוצצים לכדורי ניצוצות נושרים עם נצנוץ וזנב.
   בסופר: יותר פגזים, פגז-סיום גדול במרכז והבזק רך. נרשם לפי החוזה
   ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
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
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'fireworks-show',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'כָּל הַכָּבוֹד!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var shellColors = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFFFFF'];

      // each shell: launches at t0 from bottom to a target, then bursts into sparks
      var shells = [];
      function addShell(t0, tx, ty, color, big) {
        var nS = big ? (isSuper ? 46 : 34) : 20 + (Math.random() * 10 | 0);
        var sparks = [];
        for (var i = 0; i < nS; i++) {
          var ang = (i / nS) * 6.2832 + Math.random() * 0.2;
          var sp = (big ? 0.9 : 0.6) + Math.random() * 0.5;
          sparks.push({ ca: Math.cos(ang), sa: Math.sin(ang), sp: sp,
            life: 700 + Math.random() * 500, r: (1.2 + Math.random() * 1.8) * unit });
        }
        shells.push({ t0: t0, rise: 480, x0: tx + (Math.random() - 0.5) * W * 0.1, y0: H + 20,
          tx: tx, ty: ty, color: color, sparks: sparks, big: big });
      }
      var N = isSuper ? 7 : 4;
      for (var s = 0; s < N; s++)
        addShell(s * (dur * (isSuper ? 0.11 : 0.18)), W * (0.18 + 0.64 * Math.random()),
          H * (0.20 + 0.30 * Math.random()), shellColors[s % shellColors.length], false);
      if (isSuper) addShell(dur * 0.5, W / 2, H * 0.32, accent, true);

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:62%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px ' + hexA(accent, .95) + ',0 0 46px ' + hexA(primary, .7) + ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = dur * 0.30;
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
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var si = 0; si < shells.length; si++) {
          var sh = shells[si], te = t - sh.t0;
          if (te < 0) continue;
          if (te < sh.rise) {
            var q = te / sh.rise;
            var x = sh.x0 + (sh.tx - sh.x0) * q, y = sh.y0 + (sh.ty - sh.y0) * (1 - (1 - q) * (1 - q));
            ctx.strokeStyle = hexA(sh.color, 0.8 * gFade); ctx.lineWidth = 2 * unit; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16 * unit); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,' + 0.9 * gFade + ')';
            ctx.beginPath(); ctx.arc(x, y, 2.2 * unit, 0, 6.2832); ctx.fill();
          } else {
            var be = te - sh.rise;
            var fa = (sh.big ? 0.26 : 0) * Math.exp(-be / 160) * gFade;
            if (fa > 0.01) {
              var fg = ctx.createRadialGradient(sh.tx, sh.ty, 0, sh.tx, sh.ty, Math.max(W, H) * 0.6);
              fg.addColorStop(0, hexA(accent, fa)); fg.addColorStop(1, hexA(accent, 0));
              ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
            }
            for (var p = 0; p < sh.sparks.length; p++) {
              var k = sh.sparks[p], bq = be / k.life;
              if (bq >= 1) continue;
              var d = k.sp * (sh.big ? 320 : 200) * unit * (1 - Math.pow(1 - bq, 2));
              var px = sh.tx + k.ca * d, py = sh.ty + k.sa * d + 0.00045 * be * be;
              var a = (1 - bq) * gFade;
              ctx.fillStyle = hexA(p % 4 ? sh.color : '#FFFFFF', a);
              ctx.beginPath(); ctx.arc(px, py, k.r * (1 - bq * 0.4), 0, 6.2832); ctx.fill();
            }
          }
        }
        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);
      return function cleanup() {
        if (killed) return; killed = true; cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
