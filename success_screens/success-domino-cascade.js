/* success-domino-cascade.js — מסך הצלחה: מַפַּל דּוֹמִינוֹ 🁢
   שורת אבני דומינו צבעוניות לאורך גל מתפתל על פני המסך נופלות אחת אחרי
   השנייה בתקתוק מספק, והאחרונה מקישה על כוכב זהב שמתפוצץ לפרץ ניצוצות.
   בסופר: שני גלים שנפגשים באמצע, ופרץ כוכבים כפול.
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
    name: 'domino-cascade',
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
      var praise  = opts.praise || 'בְּדִיּוּק! אַחַת אַחֲרֵי הַשְּׁנִיָּה!';

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
      var cols = [primary, accent, glow, mixHex(primary, '#FFFFFF', 0.35), mixHex(accent, '#FF7EB3', 0.5)];
      var DH = Math.min(W, H) * 0.095, DW = DH * 0.42;
      var rows = [];
      function makeRow(fromLeft, yBase, amp) {
        var n = isSuper ? 13 : 16, arr = [];
        for (var i = 0; i < n; i++) {
          var u = i / (n - 1);
          var x = fromLeft ? W * (0.08 + u * (isSuper ? 0.36 : 0.74)) : W * (0.92 - u * 0.36);
          arr.push({ x: x, y: yBase + Math.sin(u * Math.PI * 2) * amp, col: cols[i % cols.length], at: 0.1 + u * (isSuper ? 0.38 : 0.48), dir: fromLeft ? 1 : -1 });
        }
        return arr;
      }
      rows.push(makeRow(true, H * 0.66, H * 0.06));
      if (isSuper) rows.push(makeRow(false, H * 0.66, H * 0.06));
      var starX = isSuper ? W / 2 : W * 0.88, starY = H * 0.52;
      var boomAt = isSuper ? 0.5 : 0.6;
      var burst = [];
      for (var i = 0; i < (isSuper ? 40 : 24); i++) burst.push({ a: i / (isSuper ? 40 : 24) * TAU + rnd(-0.1, 0.1), sp: rnd(0.5, 1), s: rnd(5, 11) * unit, col: cols[i % cols.length], rot: Math.random() * TAU });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:14%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.62;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(14% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
        var appear = clamp01(p / 0.1);
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r];
          for (var i = 0; i < row.length; i++) {
            var d = row[i];
            var fp = clamp01((p - d.at) / 0.06);
            var ang = d.dir * easeInOut(fp) * 1.2;           // tips toward the next one
            ctx.save(); ctx.translate(d.x + d.dir * DW / 2, d.y); ctx.rotate(ang);
            ctx.globalAlpha = gFade * appear;
            ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-DW + 3 * unit * d.dir, -DH + 3 * unit, DW, DH);
            ctx.fillStyle = d.col; ctx.fillRect(-DW, -DH, DW, DH);
            ctx.strokeStyle = hexA('#FFFFFF', 0.7); ctx.lineWidth = 2 * unit; ctx.strokeRect(-DW, -DH, DW, DH);
            ctx.beginPath(); ctx.moveTo(-DW, -DH / 2); ctx.lineTo(0, -DH / 2); ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(-DW / 2, -DH * 0.75, DW * 0.12, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(-DW / 2, -DH * 0.25, DW * 0.12, 0, TAU); ctx.fill();
            ctx.restore();
            if (fp > 0.9 && fp < 1 && i % 3 === 0) {          // a little "tick" spark on impact
              ctx.fillStyle = hexA('#FFFFFF', 0.8 * gFade); sparkPath(ctx, d.x + d.dir * DW * 1.6, d.y - DH * 0.2, 7 * unit); ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
        // the star at the end of the run
        var sb = clamp01((p - boomAt) / 0.08);
        var starS = DH * (0.55 + 0.9 * easeOutBack(sb)) * (1 + 0.05 * Math.sin(t * 0.01));
        var sg = ctx.createRadialGradient(starX, starY, 0, starX, starY, starS * 2.4);
        sg.addColorStop(0, hexA(accent, (0.25 + 0.4 * sb) * gFade)); sg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(starX, starY, starS * 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA(accent, gFade * appear); starPath(ctx, starX, starY, starS, starS * 0.45, t * 0.001 * sb); ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.6 * gFade * appear); starPath(ctx, starX - starS * 0.15, starY - starS * 0.15, starS * 0.35, starS * 0.16, 0); ctx.fill();
        var bp = clamp01((p - boomAt) / 0.35);
        if (bp > 0) for (var i = 0; i < burst.length; i++) {
          var b = burst[i], dd = easeOut(bp) * Math.min(W, H) * 0.4 * b.sp;
          ctx.fillStyle = hexA(b.col, (1 - bp) * gFade);
          starPath(ctx, starX + Math.cos(b.a) * dd, starY + Math.sin(b.a) * dd + bp * bp * 60 * unit, b.s, b.s * 0.45, b.rot + bp * 4); ctx.fill();
        }
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
