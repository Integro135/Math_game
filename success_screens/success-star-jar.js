/* success-star-jar.js — מסך הצלחה: צִנְצֶנֶת כּוֹכָבִים ⭐
   צנצנת זכוכית עם פקק שעם במרכז, וכוכבים זוהרים עפים אליה מכל קצוות המסך
   בקשתות ונערמים בפנים — ככל שהיא מתמלאת היא זוהרת יותר. בסופר: הצנצנת
   מתמלאת עד הסוף, הפקק קופץ ומזרקת כוכבים פורצת למעלה.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF). קריא מעל הכיסוי הכהה של המארח. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255, g = Math.round(g1 + (g2 - g1) * t) & 255, b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function starPath(ctx, x, y, rOut, rIn, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rIn : rOut, a = rot + (i / 10) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  window.SUCCESS.styles.push({
    name: 'star-jar',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(primary)) primary = '#C77DFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(accent)) accent = '#FFD27D';
      if (!/^#[0-9a-fA-F]{6}$/.test(glow)) glow = '#7DC4FF';
      var praise  = opts.praise || 'אָסַפְתְּ עוֹד כּוֹכָב!';

      var W = root.clientWidth || window.innerWidth || 342;
      var H = root.clientHeight || window.innerHeight || 455;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(W * DPR));
      cv.height = Math.max(1, Math.round(H * DPR));
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var unit = Math.min(W, H) / 800;

      // twinkling backdrop stars (shared by every scene)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 40 : 26); bs++)
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, tw: Math.random() * TAU,
                       rate: 2 + Math.random() * 4, size: (0.8 + Math.random() * 1.6) * unit,
                       color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      function drawBgStars(t, a) {
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * a);
          sparkPath(ctx, s.x, s.y, s.size * 2.2); ctx.fill();
        }
      }

      var t = 0, p = 0, gFade = 1;                   // per-frame values — shared with scene helpers
      // ═══ SCENE ═══
      var jx = W * 0.5, jy = H * 0.62, JW = Math.min(W, H) * 0.2, JH = JW * 1.35;
      var NS = isSuper ? 30 : 18;
      var stars = [];
      for (var i = 0; i < NS; i++) {
        var a = rnd(0, TAU), row = Math.floor(i / 5), col = i % 5;
        stars.push({ sx: jx + Math.cos(a) * Math.max(W, H) * 0.7, sy: jy + Math.sin(a) * Math.max(W, H) * 0.7 - H * 0.2,
                     px: jx + (col - 2) * JW * 0.34 + (row % 2 ? JW * 0.17 : 0), py: jy + JH * 0.42 - row * JW * 0.3,
                     at: 0.08 + i / NS * (isSuper ? 0.45 : 0.5), s: rnd(14, 19) * unit, rot: Math.random() * TAU,
                     col: [accent, '#FFFFFF', glow, mixHex(accent, primary, 0.4)][i % 4], arc: rnd(-1, 1) });
      }
      var fount = [];
      if (isSuper) for (var i = 0; i < 30; i++) fount.push({ a: -Math.PI / 2 + rnd(-0.7, 0.7), sp: rnd(0.5, 1), s: rnd(8, 15) * unit, col: [accent, '#FFFFFF', primary, glow][i % 4], rot: Math.random() * TAU });
      function jarPath() {
        ctx.beginPath();
        ctx.moveTo(jx - JW * 0.36, jy - JH * 0.55); ctx.lineTo(jx - JW * 0.36, jy - JH * 0.45);
        ctx.quadraticCurveTo(jx - JW * 0.85, jy - JH * 0.38, jx - JW * 0.85, jy - JH * 0.1);
        ctx.lineTo(jx - JW * 0.85, jy + JH * 0.42); ctx.quadraticCurveTo(jx - JW * 0.85, jy + JH * 0.55, jx - JW * 0.6, jy + JH * 0.55);
        ctx.lineTo(jx + JW * 0.6, jy + JH * 0.55); ctx.quadraticCurveTo(jx + JW * 0.85, jy + JH * 0.55, jx + JW * 0.85, jy + JH * 0.42);
        ctx.lineTo(jx + JW * 0.85, jy - JH * 0.1); ctx.quadraticCurveTo(jx + JW * 0.85, jy - JH * 0.38, jx + JW * 0.36, jy - JH * 0.45);
        ctx.lineTo(jx + JW * 0.36, jy - JH * 0.55); ctx.closePath();
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.42;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.4)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        t = now - t0;
        p = clamp01(t / dur);
        gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        drawBgStars(t, gFade);
        ctx.save();
        ctx.globalAlpha = gFade;
        var inA = easeOutBack(clamp01(p / 0.12));
        var landed = 0; for (var i = 0; i < stars.length; i++) if (p >= stars[i].at + 0.18) landed++;
        var fill = landed / stars.length;
        ctx.save(); ctx.translate(jx, jy); ctx.scale(inA, inA); ctx.translate(-jx, -jy);
        var hl = ctx.createRadialGradient(jx, jy, 0, jx, jy, JW * 2.3);
        hl.addColorStop(0, hexA(accent, 0.1 + 0.4 * fill)); hl.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(jx, jy, JW * 2.3, 0, TAU); ctx.fill();
        jarPath(); ctx.fillStyle = hexA(mixHex(glow, '#FFFFFF', 0.4), 0.14); ctx.fill();
        // landed stars inside (clipped to the jar)
        ctx.save(); jarPath(); ctx.clip();
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i]; if (p < s.at + 0.18) continue;
          var tw = 0.75 + 0.25 * Math.sin(t * 0.006 + i);
          ctx.fillStyle = hexA(s.col, tw); starPath(ctx, s.px, s.py, s.s, s.s * 0.45, s.rot); ctx.fill();
        }
        ctx.restore();
        jarPath(); ctx.strokeStyle = hexA('#FFFFFF', 0.7); ctx.lineWidth = 3.5 * unit; ctx.stroke();
        ctx.strokeStyle = hexA('#FFFFFF', 0.45); ctx.lineWidth = 6 * unit;
        ctx.beginPath(); ctx.moveTo(jx - JW * 0.65, jy - JH * 0.1); ctx.lineTo(jx - JW * 0.65, jy + JH * 0.3); ctx.stroke();
        // cork (pops off in super)
        var popQ = isSuper ? clamp01((p - 0.62) / 0.3) : 0;
        ctx.save(); ctx.translate(jx, jy - JH * 0.6 - easeOut(popQ) * H * 0.3); ctx.rotate(popQ * 5);
        ctx.fillStyle = '#B98552'; ctx.fillRect(-JW * 0.4, -JH * 0.07, JW * 0.8, JH * 0.14);
        ctx.fillStyle = '#9A6A3E'; ctx.fillRect(-JW * 0.4, JH * 0.03, JW * 0.8, JH * 0.04);
        ctx.restore();
        ctx.fillStyle = hexA(primary, 0.9); heartPath(ctx, jx, jy + JH * 0.05, JW * 0.14); ctx.fill();          // label heart
        ctx.restore();
        // stars in flight
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i], q = clamp01((p - s.at) / 0.18); if (q <= 0 || q >= 1) continue;
          var e = easeInOut(q);
          var tx = jx, ty = jy - JH * 0.6;
          var x = s.sx + (tx - s.sx) * e + Math.sin(e * Math.PI) * s.arc * 120 * unit, y = s.sy + (ty - s.sy) * e;
          ctx.fillStyle = hexA(s.col, 1); starPath(ctx, x, y, s.s * (1.4 - 0.5 * e), s.s * 0.6, s.rot + e * 4); ctx.fill();
          ctx.fillStyle = hexA('#FFFFFF', 0.4 * (1 - e)); sparkPath(ctx, x - (tx - s.sx) * 0.03, y - (ty - s.sy) * 0.03, 8 * unit); ctx.fill();
        }
        if (popQ > 0) for (var i = 0; i < fount.length; i++) {
          var f = fount[i], d = easeOut(popQ) * H * 0.45 * f.sp;
          ctx.fillStyle = hexA(f.col, 1 - popQ);
          starPath(ctx, jx + Math.cos(f.a) * d, jy - JH * 0.6 + Math.sin(f.a) * d + popQ * popQ * 120 * unit, f.s, f.s * 0.45, f.rot + popQ * 5); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
