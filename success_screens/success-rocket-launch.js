/* success-rocket-launch.js — מסך הצלחה: שיגור רקטה
   רקטה (🚀) ממריאה מתחתית המסך עם להבה מרצדת, ניצוצות ועשן — ובשיא
   מתפוצצת לטבעת כוכבים והשבח קופץ. בסופר: טבעת כפולה ויותר כוכבים.
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
    name: 'rocket-launch',
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
      var praise  = opts.praise || 'טִיסָה לַכּוֹכָבִים!';

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
      var cx = W / 2;
      var apexY = H * 0.24;
      var tBurst = dur * 0.45;
      var U = isSuper ? 84 : 66;

      var rocket = document.createElement('div');
      rocket.textContent = '🚀';
      rocket.style.cssText =
        'position:absolute;left:0;top:0;line-height:1;font-size:' + U + 'px;' +
        'will-change:transform,opacity;transform-origin:50% 50%';
      root.appendChild(rocket);

      var smoke = [];                                          // ענני עשן
      var exhaust = [];                                        // ניצוצות פליטה
      // כוכבי הפיצוץ
      var burstStars = [];
      var NB = isSuper ? 46 : 28;
      var bcolors = [accent, '#FFFFFF', glow, primary];
      for (var i = 0; i < NB; i++) {
        var ang = (i / NB) * 6.2832 + Math.random() * 0.3;
        burstStars.push({
          ca: Math.cos(ang), sa: Math.sin(ang),
          speed: 0.5 + Math.pow(Math.random(), 1.4) * 0.5,
          life: (dur - tBurst) * (0.6 + Math.random() * 0.4),
          size: (1.6 + Math.random() * 2.4) * unit,
          color: bcolors[i % bcolors.length]
        });
      }
      var maxR = Math.min(W, H) * (isSuper ? 0.42 : 0.34);
      var rings = isSuper ? [tBurst, tBurst + 240] : [tBurst];

      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:52%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
          'position:absolute;left:50%;top:65%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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

        if (t < tBurst) {
          // ─── המראה ───
          var q = t / tBurst;
          var ry = (H + U) + (apexY - H - U) * (q * q * (3 - 2 * q));   // smoothstep
          var rx = cx + Math.sin(t * 0.01) * 5;
          rocket.style.opacity = String(gFade);
          rocket.style.transform = 'translate(' + (rx - U / 2) + 'px,' + (ry - U / 2) + 'px) rotate(-45deg)';

          var baseX = rx, baseY = ry + U * 0.42;
          // להבה מרצדת
          var flameL = (26 + Math.random() * 18) * unit * (0.6 + q);
          var fg = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, flameL);
          fg.addColorStop(0, 'rgba(255,255,255,' + 0.9 * gFade + ')');
          fg.addColorStop(0.35, hexA(accent, 0.7 * gFade));
          fg.addColorStop(1, hexA('#FF7043', 0));
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.ellipse(baseX, baseY + flameL * 0.4, flameL * 0.36, flameL, 0, 0, 6.2832);
          ctx.fill();
          // ניצוצות פליטה
          if (exhaust.length < 120) {
            for (var e = 0; e < 2; e++) {
              exhaust.push({ x: baseX + (Math.random() - 0.5) * 10, y: baseY,
                             vx: (Math.random() - 0.5) * 0.06, vy: 0.10 + Math.random() * 0.12,
                             born: t, life: 380 + Math.random() * 260, r: (0.9 + Math.random() * 1.5) * unit });
            }
          }
          // עשן
          if (smoke.length < 40 && Math.random() < 0.5) {
            smoke.push({ x: baseX + (Math.random() - 0.5) * 14, y: baseY + 8,
                         born: t, life: 900 + Math.random() * 500, r0: (6 + Math.random() * 8) * unit });
          }
        } else {
          // ─── הפיצוץ ───
          var te = t - tBurst;
          var bq = clamp01(te / 180);
          rocket.style.opacity = String((1 - bq) * gFade);
          rocket.style.transform = 'translate(' + (cx - U / 2) + 'px,' + (apexY - U / 2) + 'px) rotate(-45deg) scale(' + (1 + bq * 0.6) + ')';

          var fl = 0.34 * Math.exp(-te / 170) * gFade;
          if (fl > 0.01) {
            var fg2 = ctx.createRadialGradient(cx, apexY, 0, cx, apexY, maxR * 1.4);
            fg2.addColorStop(0, 'rgba(255,255,255,' + fl + ')');
            fg2.addColorStop(0.4, hexA(accent, fl * 0.5));
            fg2.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg2;
            ctx.fillRect(0, 0, W, H);
          }
          // טבעות
          for (var rgi = 0; rgi < rings.length; rgi++) {
            var rte = t - rings[rgi];
            if (rte < 0) continue;
            var rq = clamp01(rte / (dur * 0.45));
            if (rq >= 1) continue;
            var rr = maxR * easeOutCubic(rq);
            ctx.strokeStyle = hexA(glow, 0.22 * (1 - rq) * gFade);
            ctx.lineWidth = (9 * (1 - rq) + 3) * unit;
            ctx.beginPath(); ctx.arc(cx, apexY, rr, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * (1 - rq) * gFade + ')';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx, apexY, rr, 0, 6.2832); ctx.stroke();
          }
          // כוכבי הפיצוץ
          for (var bs = 0; bs < burstStars.length; bs++) {
            var b = burstStars[bs];
            var sq = clamp01(te / b.life);
            if (sq >= 1) continue;
            var sd = b.speed * maxR * easeOutCubic(sq);
            var sx2 = cx + b.ca * sd, sy2 = apexY + b.sa * sd;
            var sa3 = (1 - sq * 0.7) * gFade;
            ctx.strokeStyle = hexA(b.color, sa3);
            ctx.lineWidth = 1.3;
            var srr = b.size * (2 - sq);
            ctx.beginPath();
            ctx.moveTo(sx2 - srr, sy2); ctx.lineTo(sx2 + srr, sy2);
            ctx.moveTo(sx2, sy2 - srr); ctx.lineTo(sx2, sy2 + srr);
            ctx.stroke();
            ctx.fillStyle = hexA('#FFFFFF', sa3);
            ctx.beginPath(); ctx.arc(sx2, sy2, srr * 0.3, 0, 6.2832); ctx.fill();
          }
        }

        // עשן וניצוצות פליטה (ממשיכים לדעוך גם אחרי ההמראה)
        for (var sm = smoke.length - 1; sm >= 0; sm--) {
          var s = smoke[sm];
          var sq2 = (t - s.born) / s.life;
          if (sq2 >= 1) { smoke.splice(sm, 1); continue; }
          ctx.fillStyle = 'rgba(200,200,215,' + (1 - sq2) * 0.16 * gFade + ')';
          ctx.beginPath();
          ctx.arc(s.x + Math.sin(s.born + sq2 * 4) * 6, s.y + sq2 * 30, s.r0 * (1 + sq2 * 2.2), 0, 6.2832);
          ctx.fill();
        }
        for (var ex = exhaust.length - 1; ex >= 0; ex--) {
          var xp = exhaust[ex];
          var xq = (t - xp.born) / xp.life;
          if (xq >= 1) { exhaust.splice(ex, 1); continue; }
          var dt = t - xp.born;
          ctx.fillStyle = hexA(ex % 2 ? accent : '#FFFFFF', (1 - xq) * 0.85 * gFade);
          ctx.beginPath();
          ctx.arc(xp.x + xp.vx * dt, xp.y + xp.vy * dt, xp.r * (1 - xq * 0.5), 0, 6.2832);
          ctx.fill();
        }

        var tp = clamp01((t - tBurst - 120) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - tBurst - 400) / 300);
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
        if (rocket.parentNode) rocket.parentNode.removeChild(rocket);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
