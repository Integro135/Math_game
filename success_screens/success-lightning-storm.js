/* success-lightning-storm.js — מסך הצלחה: סופת ברקים
   ברקים מפותלים מכים מהשמיים (midpoint displacement כמו במנוע הטירה),
   כל מכה עם הבזק רך, ענף משני וניצוצות בנקודת הפגיעה; ניצוצות חשמל
   מרחפים ברקע, והטקסט פועם עם כל מכה. בסופר: יותר מכות כולל צמד-סיום.
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
  // ברק רקורסיבי — מחזיר מערך שטוח של קטעים [x1,y1,x2,y2,...]
  function genBolt(x1, y1, x2, y2, disp, out) {
    if (disp < 8) { out.push(x1, y1, x2, y2); return; }
    var mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
    var my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp * 0.5;
    genBolt(x1, y1, mx, my, disp * 0.55, out);
    genBolt(mx, my, x2, y2, disp * 0.55, out);
  }

  window.SUCCESS.styles.push({
    name: 'lightning-storm',
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
      var praise  = opts.praise || 'אַתְּ מַבְרִיקָה!';

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

      var cx = W / 2;
      var BOLT_LIFE = 380;

      // ─── מכות ברק — נוצרות מראש, דטרמיניסטיות בזמן ───
      var times = isSuper
        ? [60, dur * 0.16, dur * 0.30, dur * 0.44, dur * 0.58, dur * 0.63, dur * 0.78]
        : [80, dur * 0.30, dur * 0.55, dur * 0.72];
      var strikes = [];
      for (var i = 0; i < times.length; i++) {
        var tx = cx + (Math.random() - 0.5) * W * 0.55;
        var ty = H * (0.30 + Math.random() * 0.20);
        var sx = tx + (Math.random() - 0.5) * W * 0.25;
        var segs = [];
        genBolt(sx, -30, tx, ty, H * 0.16, segs);
        // ענף משני — יוצא מאמצע הברק הראשי
        var mi = (Math.floor(segs.length / 8) * 4) || 0;
        var bsegs = [];
        genBolt(segs[mi], segs[mi + 1],
                segs[mi] + (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 60),
                segs[mi + 1] + 70 + Math.random() * 60, H * 0.06, bsegs);
        // ניצוצות בנקודת הפגיעה
        var sparks = [];
        for (var s = 0; s < 14; s++) {
          var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          sparks.push({
            ca: Math.cos(ang), sa: Math.sin(ang),
            speed: 0.08 + Math.random() * 0.20,
            life: 300 + Math.random() * 280,
            r: 0.8 + Math.random() * 1.6
          });
        }
        strikes.push({ at: times[i], segs: segs, bsegs: bsegs, tx: tx, ty: ty, sparks: sparks });
      }

      // ניצוצות חשמל מרחפים ברקע (בין המכות)
      var ambient = [];
      for (var a = 0; a < 22; a++) {
        ambient.push({
          x: Math.random() * W, y: Math.random() * H * 0.85,
          vx: (Math.random() - 0.5) * 0.015, vy: (Math.random() - 0.5) * 0.015,
          tw: Math.random() * 6.28, r: 0.7 + Math.random() * 1.3
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:64%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = times[0] + 80;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:77%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      function drawSegs(segs, alpha) {
        // הילה רחבה + ליבה בהירה — שני מעברים, ללא shadowBlur
        ctx.lineCap = 'round';
        ctx.strokeStyle = hexA(glow, 0.32 * alpha);
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        for (var k = 0; k < segs.length; k += 4) {
          ctx.moveTo(segs[k], segs[k + 1]);
          ctx.lineTo(segs[k + 2], segs[k + 3]);
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(245,250,255,' + 0.95 * alpha + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (var m = 0; m < segs.length; m += 4) {
          ctx.moveTo(segs[m], segs[m + 1]);
          ctx.lineTo(segs[m + 2], segs[m + 3]);
        }
        ctx.stroke();
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // ניצוצות רקע
        for (var ai = 0; ai < ambient.length; ai++) {
          var am = ambient[ai];
          var aa = (0.18 + 0.22 * Math.abs(Math.sin(t * 0.004 + am.tw))) * gFade;
          ctx.fillStyle = hexA(glow, aa);
          ctx.beginPath();
          ctx.arc(am.x + am.vx * t, am.y + am.vy * t, am.r, 0, 6.2832);
          ctx.fill();
        }

        var pulse = 0;                                         // לפעימת הטקסט
        for (var si = 0; si < strikes.length; si++) {
          var st = strikes[si];
          var te = t - st.at;
          if (te < 0) continue;
          pulse = Math.max(pulse, Math.exp(-te / 150));

          if (te <= BOLT_LIFE) {
            var ba = Math.pow(1 - te / BOLT_LIFE, 1.5) *
                     (0.75 + 0.25 * Math.sin(te * 0.09)) * gFade;   // ריצוד עדין
            drawSegs(st.segs, ba);
            drawSegs(st.bsegs, ba * 0.6);
          }
          // הבזק רך סביב נקודת הפגיעה
          var fa = 0.14 * Math.exp(-te / 140) * gFade;
          if (fa > 0.008) {
            var fg = ctx.createRadialGradient(st.tx, st.ty, 0, st.tx, st.ty, H * 0.55);
            fg.addColorStop(0, hexA(glow, fa));
            fg.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }
          // ניצוצות פגיעה
          for (var pi = 0; pi < st.sparks.length; pi++) {
            var sp = st.sparks[pi];
            var sq = te / sp.life;
            if (sq >= 1) continue;
            var dec = 1 - 0.5 * sq;                            // האטה
            ctx.fillStyle = hexA(pi % 3 ? '#FFFFFF' : accent, (1 - sq) * 0.9 * gFade);
            ctx.beginPath();
            ctx.arc(st.tx + sp.ca * sp.speed * te * dec,
                    st.ty + sp.sa * sp.speed * te * dec + 0.0004 * te * te * 0.5,
                    sp.r * (1 - sq * 0.5), 0, 6.2832);
            ctx.fill();
          }
        }

        // טקסט — קופץ עם המכה הראשונה ופועם עם כל מכה
        var tp = clamp01((t - txtAt) / 320);
        var sc = tp > 0 ? easeOutBack(tp) * (1 + 0.05 * pulse) : 0;
        txt.style.transform = 'translate(-50%,-50%) scale(' + sc + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 280) / 300);
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
