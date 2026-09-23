/* success-snow-globe.js — מסך הצלחה: כַּדּוּר שֶׁלֶג ❄️
   כדור שלג זכוכיתי קופץ פנימה ומיטלטל, והנצנצים שבתוכו מסתחררים ואז שוקעים
   לאט סביב כוכב זהב קטן שבמרכזו. ברק זכוכית, בסיס עץ עם סרט. בסופר: טלטלה
   שנייה, והכוכב שבפנים מתחיל לזהור ולשגר קרניים.
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
    name: 'snow-globe',
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
      var praise  = opts.praise || 'מַדְהִים — מַמָּשׁ קֶסֶם!';

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
      var gx = W / 2, gy = H * 0.56, GR = Math.min(W, H) * (isSuper ? 0.25 : 0.22);
      var flakes = [];
      for (var i = 0; i < (isSuper ? 120 : 80); i++)
        flakes.push({ a: Math.random() * TAU, r: Math.sqrt(Math.random()) * GR * 0.9, spin: rnd(1.5, 3.5) * (Math.random() < 0.5 ? 1 : -1),
                      fall: rnd(0.4, 1), size: rnd(1.2, 3.2) * unit, col: i % 3 === 0 ? accent : i % 3 === 1 ? '#FFFFFF' : glow, ph: Math.random() * TAU });
      function shakeAt(pp) {                                  // wobble envelope(s)
        var s1 = Math.sin(clamp01(pp / 0.3) * Math.PI) * (pp < 0.3 ? 1 : 0);
        var s2 = isSuper ? Math.sin(clamp01((pp - 0.5) / 0.2) * Math.PI) * (pp > 0.5 && pp < 0.7 ? 1 : 0) : 0;
        return Math.max(s1, s2);
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
      var txtAt = dur * 0.3;
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
        var pop = easeOutBack(clamp01(p / 0.14));
        var sh = shakeAt(p);
        var wob = Math.sin(t * 0.035) * 0.16 * sh;
        ctx.translate(gx, gy + GR * 0.95); ctx.rotate(wob); ctx.scale(pop, pop); ctx.translate(-gx, -(gy + GR * 0.95));
        // base
        var by = gy + GR * 0.82;
        var bg = ctx.createLinearGradient(0, by, 0, by + GR * 0.5);
        bg.addColorStop(0, hexA('#8A5A3C', gFade)); bg.addColorStop(1, hexA('#4E2F1E', gFade));
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(gx - GR * 0.78, by); ctx.lineTo(gx + GR * 0.78, by); ctx.lineTo(gx + GR * 0.95, by + GR * 0.45); ctx.lineTo(gx - GR * 0.95, by + GR * 0.45); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(primary, 0.9 * gFade); ctx.fillRect(gx - GR * 0.86, by + GR * 0.16, GR * 1.72, GR * 0.09);
        // glass inside
        ctx.save();
        ctx.beginPath(); ctx.arc(gx, gy, GR, 0, TAU); ctx.clip();
        var ig = ctx.createRadialGradient(gx - GR * 0.3, gy - GR * 0.3, GR * 0.1, gx, gy, GR);
        ig.addColorStop(0, hexA(mixHex(glow, '#FFFFFF', 0.5), 0.35 * gFade)); ig.addColorStop(1, hexA(mixHex(primary, '#000000', 0.5), 0.55 * gFade));
        ctx.fillStyle = ig; ctx.fillRect(gx - GR, gy - GR, GR * 2, GR * 2);
        // snowy ground + star on a stand
        ctx.fillStyle = hexA('#FFFFFF', 0.85 * gFade);
        ctx.beginPath(); ctx.ellipse(gx, gy + GR * 0.78, GR * 0.9, GR * 0.28, 0, 0, TAU); ctx.fill();
        var sg = isSuper ? clamp01((p - 0.62) / 0.2) : 0;
        if (sg > 0) {
          for (var r = 0; r < 10; r++) {
            var ra = r / 10 * TAU + t * 0.001;
            ctx.strokeStyle = hexA(accent, 0.35 * sg * gFade); ctx.lineWidth = 3 * unit;
            ctx.beginPath(); ctx.moveTo(gx, gy + GR * 0.12); ctx.lineTo(gx + Math.cos(ra) * GR * 0.8, gy + GR * 0.12 + Math.sin(ra) * GR * 0.8); ctx.stroke();
          }
        }
        ctx.fillStyle = hexA(accent, gFade);
        starPath(ctx, gx, gy + GR * 0.12, GR * 0.34, GR * 0.15, Math.sin(t * 0.002) * 0.15); ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.5 * gFade);
        starPath(ctx, gx - GR * 0.06, gy + GR * 0.06, GR * 0.12, GR * 0.05, 0); ctx.fill();
        // glitter: swirls while shaken, settles after
        for (var i = 0; i < flakes.length; i++) {
          var f = flakes[i];
          f.a += f.spin * 0.016 * (0.15 + 1.6 * sh);
          var settle = clamp01((p - 0.25) / 0.7) * (1 - sh);
          var fx = gx + Math.cos(f.a) * f.r * (1 - 0.3 * settle);
          var fy = gy + Math.sin(f.a) * f.r * (1 - settle) + settle * f.fall * GR * 0.62 + Math.sin(t * 0.003 + f.ph) * 2 * unit;
          ctx.fillStyle = hexA(f.col, 0.9 * gFade);
          if (i % 4 === 0) { sparkPath(ctx, fx, fy, f.size * 1.8); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(fx, fy, f.size, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
        // glass rim + glare
        ctx.strokeStyle = hexA('#FFFFFF', 0.55 * gFade); ctx.lineWidth = 3 * unit;
        ctx.beginPath(); ctx.arc(gx, gy, GR, 0, TAU); ctx.stroke();
        ctx.strokeStyle = hexA('#FFFFFF', 0.45 * gFade); ctx.lineWidth = 7 * unit;
        ctx.beginPath(); ctx.arc(gx, gy, GR * 0.82, -2.6, -1.9); ctx.stroke();
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
