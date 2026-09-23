/* success-penguin-slide.js — מסך הצלחה: פִּינְגְּוִין מַחְלִיק 🐧
   פינגווין קטן ועגלגל מחליק על הבטן במורד גבעת קרח מבהיקה, מעיף רסס של
   שלג ונצנצים, נעצר בתחתית, קופץ לעמידה ומרים את הכנפיים בשמחה. בסופר:
   פינגווין שני מחליק אחריו, והם עושים "כיף" בכנפיים.
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
    name: 'penguin-slide',
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
      var praise  = opts.praise || 'וּוִי! כָּל הַכָּבוֹד!';

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
      var hillTop = [W * 0.05, H * 0.34], hillBot = [W * 0.6, H * 0.82];
      var P0 = Math.min(W, H) * 0.105;
      var pens = [{ at: 0.04, endX: W * 0.66, s: 1 }];
      if (isSuper) pens.push({ at: 0.24, endX: W * 0.8, s: 0.85 });
      var spray = [];
      function penguin(x, y, s, slide, wings, lean) {
        var S = P0 * s;
        ctx.save(); ctx.translate(x, y); ctx.rotate(lean);
        if (slide > 0.5) {                                        // lying on the belly, head forward
          ctx.fillStyle = '#20223A'; ctx.beginPath(); ctx.ellipse(0, -S * 0.45, S * 1.1, S * 0.55, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(S * 0.1, -S * 0.25, S * 0.85, S * 0.32, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#20223A'; ctx.beginPath(); ctx.arc(S * 1.0, -S * 0.65, S * 0.45, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(S * 1.12, -S * 0.7, S * 0.14, 0, TAU); ctx.fill();
          ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.arc(S * 1.16, -S * 0.7, S * 0.07, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF9F2E'; ctx.beginPath(); ctx.moveTo(S * 1.38, -S * 0.66); ctx.lineTo(S * 1.62, -S * 0.56); ctx.lineTo(S * 1.36, -S * 0.5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FF9F2E'; ctx.beginPath(); ctx.ellipse(-S * 1.1, -S * 0.5, S * 0.22, S * 0.1, 0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = '#20223A'; ctx.beginPath(); ctx.ellipse(-S * 0.2, -S * 0.85, S * 0.5, S * 0.14, -0.3, 0, TAU); ctx.fill();
        } else {                                                  // standing, wings up
          ctx.fillStyle = '#20223A';
          [-1, 1].forEach(function (sd) { ctx.save(); ctx.translate(sd * S * 0.62, -S * 1.2); ctx.rotate(sd * (0.3 + wings * 1.6)); ctx.beginPath(); ctx.ellipse(0, S * 0.45, S * 0.18, S * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); });
          ctx.beginPath(); ctx.ellipse(0, -S * 1.0, S * 0.72, S * 1.0, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, -S * 0.85, S * 0.5, S * 0.78, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-S * 0.2, -S * 1.5, S * 0.15, 0, TAU); ctx.arc(S * 0.2, -S * 1.5, S * 0.15, 0, TAU); ctx.fill();
          ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.arc(-S * 0.18, -S * 1.5, S * 0.075, 0, TAU); ctx.arc(S * 0.22, -S * 1.5, S * 0.075, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF9F2E'; ctx.beginPath(); ctx.moveTo(-S * 0.12, -S * 1.35); ctx.lineTo(S * 0.12, -S * 1.35); ctx.lineTo(0, -S * 1.18); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,130,170,.55)'; ctx.beginPath(); ctx.ellipse(-S * 0.38, -S * 1.3, S * 0.1, S * 0.06, 0, 0, TAU); ctx.ellipse(S * 0.38, -S * 1.3, S * 0.1, S * 0.06, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF9F2E'; ctx.beginPath(); ctx.ellipse(-S * 0.28, 0, S * 0.24, S * 0.1, 0, 0, TAU); ctx.ellipse(S * 0.28, 0, S * 0.24, S * 0.1, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
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
      var txtAt = dur * 0.55;
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
        var slope = Math.atan2(hillBot[1] - hillTop[1], hillBot[0] - hillTop[0]);
        // the ice hill + the frozen flat
        var ig = ctx.createLinearGradient(0, hillTop[1], 0, H);
        ig.addColorStop(0, '#E8F6FF'); ig.addColorStop(1, mixHex(glow, '#BFE3FF', 0.5));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.moveTo(-10, hillTop[1] - 10 * unit); ctx.lineTo(hillTop[0], hillTop[1]); ctx.lineTo(hillBot[0], hillBot[1]); ctx.lineTo(W + 10, hillBot[1]); ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.9); ctx.lineWidth = 4 * unit;
        ctx.beginPath(); ctx.moveTo(hillTop[0], hillTop[1]); ctx.lineTo(hillBot[0], hillBot[1]); ctx.lineTo(W, hillBot[1]); ctx.stroke();
        for (var g = 0; g < 5; g++) { var gt = g / 5 + ((t * 0.0004) % 0.2); ctx.fillStyle = hexA('#FFFFFF', 0.8 * Math.pow(Math.max(0, Math.sin(t * 0.005 + g * 2)), 4)); sparkPath(ctx, hillTop[0] + (hillBot[0] - hillTop[0]) * gt, hillTop[1] + (hillBot[1] - hillTop[1]) * gt + 14 * unit, 10 * unit); ctx.fill(); }
        for (var pI = 0; pI < pens.length; pI++) {
          var pg = pens[pI], q = clamp01((p - pg.at) / 0.46);
          var x, y, slide = 1, lean = slope, wings = 0;
          if (q < 0.7) { var e = Math.pow(q / 0.7, 1.6); x = hillTop[0] + (hillBot[0] - hillTop[0]) * e; y = hillTop[1] + (hillBot[1] - hillTop[1]) * e;
            if (q > 0.05 && (spray.length < 160) && Math.random() < 0.9) spray.push({ x: x - Math.cos(slope) * P0, y: y, vx: rnd(-60, 10) * unit, vy: rnd(-120, -40) * unit, t0: t }); }
          else if (q < 0.9) { var e2 = easeOut((q - 0.7) / 0.2); x = hillBot[0] + (pg.endX - hillBot[0]) * e2; y = hillBot[1]; lean = 0;
            if (Math.random() < 0.6) spray.push({ x: x - P0, y: y, vx: rnd(-80, -20) * unit, vy: rnd(-90, -30) * unit, t0: t }); }
          else { x = pg.endX; y = hillBot[1]; slide = 0; lean = 0; wings = easeOutBack(clamp01((q - 0.9) / 0.1)); var hopQ = clamp01((q - 0.9) / 0.1); y -= Math.sin(hopQ * Math.PI) * P0 * 0.8; }
          if (p >= pg.at) penguin(x, y, pg.s, slide, wings + (slide ? 0 : 0.15 * Math.sin(t * 0.02)), lean);
        }
        for (var k = spray.length - 1; k >= 0; k--) {
          var sp = spray[k], age = (t - sp.t0) / 700; if (age > 1) { spray.splice(k, 1); continue; }
          var sx = sp.x + sp.vx * age, sy = sp.y + sp.vy * age + 160 * unit * age * age;
          ctx.fillStyle = hexA(k % 5 ? '#FFFFFF' : accent, 0.9 * (1 - age));
          if (k % 4 === 0) { sparkPath(ctx, sx, sy, 6 * unit); ctx.fill(); } else { ctx.beginPath(); ctx.arc(sx, sy, 3 * unit, 0, TAU); ctx.fill(); }
        }
        if (isSuper && p > 0.8) {                                 // a high-five star between them
          var hf = easeOutBack(clamp01((p - 0.8) / 0.08));
          ctx.fillStyle = hexA(accent, 1); starPath(ctx, (pens[0].endX + pens[1].endX) / 2, hillBot[1] - P0 * 2.6, 26 * unit * hf, 11 * unit * hf, t * 0.003); ctx.fill();
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
