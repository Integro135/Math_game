/* success-unicorn-rainbow.js — מסך הצלחה: חד-קרן בשובל קשת
   חד-קרן (🦄) דוהר לרוחב המסך עם שובל קשת-בענן רך וניצוצות נושרים.
   בסופר: מעבר כפול (הלוך ושוב), לבבות מרחפים וטקסט גדול יותר.
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
    name: 'unicorn-rainbow',
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
      var praise  = opts.praise || 'מַדְהִים!';

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

      // ─── חד-קרן (DOM, אימוג'י) ───
      var U = isSuper ? 84 : 64;                               // גודל באימוג'י-px
      var uni = document.createElement('div');
      uni.textContent = '🦄';
      uni.style.cssText =
        'position:absolute;left:0;top:0;line-height:1;font-size:' + U + 'px;' +
        'will-change:transform;visibility:hidden;' +
        'filter:drop-shadow(0 0 10px ' + hexA(primary, 0.7) + ')';
      root.appendChild(uni);

      // מעברים: 🦄 פונה שמאלה — מעבר טבעי ימין→שמאל; בסופר גם חזרה (מוקפץ scaleX)
      var passes = isSuper
        ? [{ t0: 0,          t1: dur * 0.40, fromX: W + 90, toX: -130,  yBase: H * 0.50, flip: false },
           { t0: dur * 0.46, t1: dur * 0.86, fromX: -130,  toX: W + 90, yBase: H * 0.30, flip: true  }]
        : [{ t0: 0,          t1: dur * 0.74, fromX: W + 90, toX: -130,  yBase: H * 0.46, flip: false }];

      var TRAIL_LIFE = isSuper ? 600 : 450;
      var bands = ['#FF7E9D', '#FFB35C', '#FFE878', '#82E8A8', glow, primary];
      var BW = isSuper ? 5 : 4;
      var trail = [];                                          // {x,y,t}
      var sparks = [];
      var hearts = [];

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:68%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(44px,9vw,96px)' : 'clamp(32px,6.5vw,68px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FF7E9D', 0.9) + ',0 0 44px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = isSuper ? 480 : dur * 0.34;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:80%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // ─── מיקום חד-קרן ───
        var active = null, prog = 0;
        for (var pi = 0; pi < passes.length; pi++) {
          var ps = passes[pi];
          if (t >= ps.t0 && t <= ps.t1) { active = ps; prog = (t - ps.t0) / (ps.t1 - ps.t0); break; }
        }
        if (active) {
          var x = active.fromX + (active.toX - active.fromX) * prog;
          var y = active.yBase - Math.sin(prog * Math.PI) * H * 0.07 + Math.sin(t * 0.02) * 9;
          var tilt = Math.sin(t * 0.02 + 0.8) * 7;
          uni.style.visibility = 'visible';
          uni.style.opacity = String(gFade);
          uni.style.transform = 'translate(' + x + 'px,' + y + 'px)' +
            (active.flip ? ' scaleX(-1)' : '') + ' rotate(' + tilt + 'deg)';

          // עוגן השובל — מאחורי החד-קרן
          var tailX = x + (active.flip ? U * 0.15 : U * 0.85);
          var tailY = y + U * 0.62;
          trail.push({ x: tailX, y: tailY, t: t });

          if (sparks.length < 160 && Math.random() < 0.6) {
            sparks.push({
              x: tailX + (Math.random() - 0.5) * 14,
              y: tailY + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 0.05,
              vy: 0.02 + Math.random() * 0.05,
              born: t, life: 500 + Math.random() * 300,
              r: 0.9 + Math.random() * 1.5,
              color: Math.random() < 0.5 ? '#FFFFFF' : accent
            });
          }
          if (isSuper && hearts.length < 14 && Math.random() < 0.12) {
            hearts.push({
              x: tailX, y: tailY - 10,
              vx: (Math.random() - 0.5) * 0.04,
              vy: -0.03 - Math.random() * 0.03,
              born: t, life: 800 + Math.random() * 400,
              size: 13 + Math.random() * 8
            });
          }
        } else {
          uni.style.visibility = 'hidden';
        }

        // ─── שובל קשת ───
        while (trail.length && t - trail[0].t > TRAIL_LIFE) trail.shift();
        if (trail.length > 1) {
          var oldP = trail[0], newP = trail[trail.length - 1];
          for (var b = 0; b < bands.length; b++) {
            var off = (b - (bands.length - 1) / 2) * BW;
            var gr = ctx.createLinearGradient(oldP.x, oldP.y, newP.x, newP.y);
            gr.addColorStop(0, hexA(bands[b], 0));
            gr.addColorStop(0.5, hexA(bands[b], 0.30 * gFade));
            gr.addColorStop(1, hexA(bands[b], 0.55 * gFade));
            ctx.strokeStyle = gr;
            ctx.lineWidth = BW + 1;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y + off);
            for (var ti = 1; ti < trail.length; ti++) ctx.lineTo(trail[ti].x, trail[ti].y + off);
            ctx.stroke();
          }
        }

        // ─── ניצוצות ───
        for (var sj = sparks.length - 1; sj >= 0; sj--) {
          var s = sparks[sj];
          var sa = (t - s.born) / s.life;
          if (sa >= 1) { sparks.splice(sj, 1); continue; }
          var dt = t - s.born;
          ctx.fillStyle = hexA(s.color, (1 - sa) * 0.9 * gFade);
          ctx.beginPath();
          ctx.arc(s.x + s.vx * dt, s.y + s.vy * dt, s.r * (1 - sa * 0.4), 0, 6.2832);
          ctx.fill();
        }

        // ─── לבבות (סופר) ───
        if (hearts.length) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (var hj = hearts.length - 1; hj >= 0; hj--) {
            var h = hearts[hj];
            var ha = (t - h.born) / h.life;
            if (ha >= 1) { hearts.splice(hj, 1); continue; }
            var hdt = t - h.born;
            ctx.globalAlpha = (1 - ha) * gFade;
            ctx.font = Math.round(h.size * (1 + ha * 0.3)) + 'px serif';
            ctx.fillText('💖', h.x + h.vx * hdt, h.y + h.vy * hdt);
          }
          ctx.globalAlpha = 1;
        }

        // ─── טקסט ───
        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
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
        if (uni.parentNode) uni.parentNode.removeChild(uni);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
