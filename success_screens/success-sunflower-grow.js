/* success-sunflower-grow.js — מסך הצלחה: חַמָּנִיָּה צוֹמַחַת 🌻
   זרע קטן באדמה נובט: גבעול ירוק מטפס למעלה, שני עלים נפרשים, ובראשו
   נפתחים עלי כותרת צהובים אחד-אחד סביב לב חום עם פרצוף מחייך שמתנדנד ברוח.
   בסופר: שתי חמניות קטנות צומחות משני הצדדים ומנצנצות.
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
    name: 'sunflower-grow',
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
      var praise  = opts.praise || 'צָמַחְתְּ כָּל כָּךְ יָפֶה!';

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
      var gy = H * 0.9;
      var flowers = [{ x: W * 0.5, h: H * 0.5, s: 1, at: 0 }];
      if (isSuper) flowers.push({ x: W * 0.26, h: H * 0.32, s: 0.6, at: 0.18 }, { x: W * 0.74, h: H * 0.34, s: 0.62, at: 0.24 });
      var petalY = mixHex('#FFD23F', accent, 0.25), petalD = mixHex(petalY, '#D98A00', 0.35);
      function grow(f) {
        var q = clamp01((p - f.at) / (1 - f.at));
        var st = easeOut(clamp01(q / 0.34)), lv = easeOutBack(clamp01((q - 0.18) / 0.14)), pe = clamp01((q - 0.32) / 0.22), fc = clamp01((q - 0.5) / 0.1);
        var FR = Math.min(W, H) * 0.09 * f.s;
        var sway = Math.sin(t * 0.003 + f.x) * 0.06 * st;
        var topX = f.x + Math.sin(sway) * f.h * st, topY = gy - f.h * st;
        ctx.strokeStyle = '#4FAE4A'; ctx.lineWidth = 9 * unit * f.s;                                   // stem
        ctx.beginPath(); ctx.moveTo(f.x, gy); ctx.quadraticCurveTo(f.x + 12 * unit, gy - f.h * st * 0.5, topX, topY); ctx.stroke();
        [[-1, 0.35], [1, 0.55]].forEach(function (l) {                                                  // leaves
          var ly = gy - f.h * st * l[1], lx = f.x + (topX - f.x) * l[1];
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(l[0] * 0.7); ctx.scale(lv, lv);
          ctx.fillStyle = '#62C05A'; ctx.beginPath(); ctx.ellipse(l[0] * 34 * unit * f.s, 0, 36 * unit * f.s, 13 * unit * f.s, 0, 0, TAU); ctx.fill();
          ctx.restore();
        });
        if (q < 0.3) return;
        ctx.save(); ctx.translate(topX, topY); ctx.rotate(sway * 1.5);
        var NP = 16;
        for (var i = 0; i < NP; i++) {                                                                 // petals open one by one
          var g = clamp01(pe * NP - i); if (g <= 0) continue;
          ctx.save(); ctx.rotate(i / NP * TAU); ctx.scale(easeOutBack(g), easeOutBack(g));
          ctx.fillStyle = i % 2 ? petalY : petalD; ctx.beginPath(); ctx.ellipse(0, -FR * 1.25, FR * 0.34, FR * 0.72, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        var cg = ctx.createRadialGradient(-FR * 0.2, -FR * 0.2, 0, 0, 0, FR * 0.85);
        cg.addColorStop(0, '#9A6030'); cg.addColorStop(1, '#5A3418');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, FR * 0.85 * easeOutBack(clamp01((q - 0.3) / 0.08)), 0, TAU); ctx.fill();
        if (fc > 0) {                                                                                  // the smiley face
          ctx.globalAlpha = gFade * fc;
          ctx.fillStyle = '#2A1606';
          var blink = Math.sin(t * 0.004) > 0.96 ? 0.2 : 1;
          ctx.beginPath(); ctx.ellipse(-FR * 0.3, -FR * 0.15, FR * 0.09, FR * 0.12 * blink, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(FR * 0.3, -FR * 0.15, FR * 0.09, FR * 0.12 * blink, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#2A1606'; ctx.lineWidth = FR * 0.09; ctx.beginPath(); ctx.arc(0, FR * 0.05, FR * 0.35, 0.3, Math.PI - 0.3); ctx.stroke();
          ctx.fillStyle = 'rgba(255,120,150,.5)';
          ctx.beginPath(); ctx.ellipse(-FR * 0.52, FR * 0.15, FR * 0.12, FR * 0.07, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(FR * 0.52, FR * 0.15, FR * 0.12, FR * 0.07, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = gFade;
        }
        ctx.restore();
        if (fc > 0) for (var s = 0; s < 6; s++) {                                                       // twinkles around the head
          var a = s / 6 * TAU + t * 0.0015, tw = Math.pow(Math.max(0, Math.sin(t * 0.006 + s * 2)), 5);
          ctx.fillStyle = hexA(s % 2 ? accent : '#FFFFFF', tw * fc);
          sparkPath(ctx, topX + Math.cos(a) * FR * 2, topY + Math.sin(a) * FR * 2, 12 * unit * f.s); ctx.fill();
        }
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
        ctx.fillStyle = '#6B4A2E'; ctx.beginPath(); ctx.ellipse(W * 0.5, gy + 10 * unit, W * 0.36, 26 * unit, 0, 0, TAU); ctx.fill();   // soil
        ctx.fillStyle = '#4FAE4A';
        for (var gI = 0; gI < 14; gI++) { var gx = W * (0.16 + gI * 0.05); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 5 * unit, gy - 18 * unit); ctx.lineTo(gx + 10 * unit, gy); ctx.fill(); }
        for (var fI = 0; fI < flowers.length; fI++) if (p >= flowers[fI].at) grow(flowers[fI]);
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
