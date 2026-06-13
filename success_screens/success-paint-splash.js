/* success-paint-splash.js — מסך הצלחה: כתמי צבע
   כתמי צבע עליזים "מתפוצצים" על המסך בזה אחר זה עם טיפות מתיזות, וגדלים
   בקפיצה. בסופר: יותר כתמים, גדולים יותר וגל סיום. נרשם לפי החוזה
   ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  window.SUCCESS.styles.push({
    name: 'paint-splash',
    supportsSuper: true,
    show: function (opts) {
      var root = opts.root, isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF', accent = pal.accent || '#FFD27D',
          glow = pal.glow || '#7DC4FF', textCol = pal.text || '#FFFFFF';
      var praise = opts.praise || 'יְצִירָתִי!';
      var W = root.clientWidth || window.innerWidth, H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;
      var cols = [accent, glow, primary, '#FF7E9D', '#82E8A8', '#FFB347'];

      var blobs = [];
      var N = isSuper ? 14 : 8;
      for (var i = 0; i < N; i++) {
        var R = (50 + Math.random() * 60) * unit * (isSuper ? 1.15 : 1);
        // irregular blob via per-lobe radii
        var lobes = 7 + (Math.random() * 4 | 0), rad = [];
        for (var l = 0; l < lobes; l++) rad.push(R * (0.7 + Math.random() * 0.5));
        var drops = [];
        for (var d = 0; d < 7; d++) { var a = Math.random() * 6.2832;
          drops.push({ ca: Math.cos(a), sa: Math.sin(a), dist: R * (1.1 + Math.random() * 0.7), r: (3 + Math.random() * 5) * unit }); }
        blobs.push({ x: W * (0.14 + 0.72 * Math.random()), y: H * (0.18 + 0.6 * Math.random()),
          at: dur * (0.04 + 0.5 * (i / N)), rad: rad, drops: drops, color: cols[i % cols.length], rot: Math.random() * 6.28 });
      }
      function drawBlob(b, s, a) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = a;
        ctx.fillStyle = b.color; ctx.beginPath();
        var n = b.rad.length;
        for (var i = 0; i <= n; i++) {
          var ang = (i % n) / n * 6.2832, rr = b.rad[i % n] * s;
          var x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(x, y);
          else { var pa = (i - 1) / n * 6.2832, pr = b.rad[(i - 1) % n] * s;
            var mx = (Math.cos(pa) * pr + x) / 2, my = (Math.sin(pa) * pr + y) / 2;
            ctx.quadraticCurveTo(Math.cos(pa) * pr, Math.sin(pa) * pr, mx, my); }
        }
        ctx.closePath(); ctx.fill();
        for (var di = 0; di < b.drops.length; di++) { var dp = b.drops[di];
          ctx.beginPath(); ctx.arc(dp.ca * dp.dist * s, dp.sa * dp.dist * s, dp.r * s, 0, 6.2832); ctx.fill(); }
        ctx.restore();
      }

      var txt = document.createElement('div'); txt.dir = 'rtl'; txt.textContent = praise;
      txt.style.cssText = 'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;color:' + textCol +
        ';font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') +
        ';text-shadow:0 0 18px rgba(0,0,0,.5),0 0 40px ' + hexA(primary, .7) + ',0 2px 6px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div'); ptsEl.dir = 'rtl'; ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText = 'position:absolute;left:50%;top:58%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent +
          ';font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px rgba(0,0,0,.5),0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < blobs.length; i++) {
          var b = blobs[i], age = t - b.at;
          if (age < 0) continue;
          var s = easeOutBack(clamp01(age / 320));
          drawBlob(b, s, gFade);
        }
        var tp = clamp01((t - dur * 0.34) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - dur * 0.34 - 280) / 300);
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
