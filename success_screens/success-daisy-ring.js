/* success-daisy-ring.js — מסך הצלחה: זֵר חִנָּנִיּוֹת 🌼
   זר של חיננית ופרחים צבעוניים נפתח פרח אחרי פרח במעגל סביב מילת השבח
   שבמרכז, עם עלים ירוקים ביניהם; הזר מסתובב לאט ועלי כותרת נושרים. בסופר:
   זר שני, פנימי, מסתובב לכיוון ההפוך, ופרפרים קטנים מקיפים אותו.
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
    name: 'daisy-ring',
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
      var praise  = opts.praise || 'אַתְּ פּוֹרַחַת!';

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
      var cx = W / 2, cy = H * 0.46, RR = Math.min(W, H) * (isSuper ? 0.36 : 0.32);
      var petalCols = ['#FFFFFF', mixHex(primary, '#FFFFFF', 0.35), mixHex(accent, '#FFFFFF', 0.3), mixHex(glow, '#FFFFFF', 0.35)];
      function ring(n, r, dir, delay, sc) {
        var fl = [];
        for (var i = 0; i < n; i++) fl.push({ a: i / n * TAU, r: r, dir: dir, delay: delay + i / n * 0.35, sc: sc,
                                            col: petalCols[i % petalCols.length], ph: Math.random() * TAU });
        return fl;
      }
      var flowers = ring(isSuper ? 16 : 13, RR, 1, 0.02, 1);
      if (isSuper) flowers = flowers.concat(ring(11, RR * 0.72, -1, 0.3, 0.75));
      var petals = [];
      for (var i = 0; i < 16; i++) petals.push({ x: Math.random() * W, y0: -Math.random() * H * 0.4, sp: rnd(0.25, 0.5) * H, ph: Math.random() * TAU, s: rnd(4, 7) * unit, col: petalCols[i % 4] });
      var bfly = [];
      if (isSuper) for (var b = 0; b < 3; b++) bfly.push({ a: b / 3 * TAU, col: [primary, accent, glow][b] });
      function daisy(x, y, s, col, rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = col;
        for (var k = 0; k < 8; k++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.ellipse(0, -s * 0.62, s * 0.24, s * 0.5, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(200,120,20,.45)'; ctx.beginPath(); ctx.arc(s * 0.08, s * 0.08, s * 0.16, 0, TAU); ctx.fill();
        ctx.restore();
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.18;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(46% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
        var rot = t * 0.00018;
        // the vine circle
        var vineA = clamp01(p / 0.3) * gFade;
        ctx.strokeStyle = hexA('#5FB85A', 0.8 * vineA); ctx.lineWidth = 4 * unit;
        ctx.beginPath(); ctx.arc(cx, cy, RR, 0, TAU * clamp01(p / 0.3)); ctx.stroke();
        for (var i = 0; i < flowers.length; i++) {
          var f = flowers[i], g = clamp01((p - f.delay) / 0.16); if (g <= 0) continue;
          var a = f.a + rot * f.dir;
          var x = cx + Math.cos(a) * f.r, y = cy + Math.sin(a) * f.r;
          // a leaf between flowers
          ctx.save(); ctx.translate(cx + Math.cos(a + 0.2) * f.r, cy + Math.sin(a + 0.2) * f.r); ctx.rotate(a + 0.2);
          ctx.fillStyle = hexA('#6CC463', 0.9 * gFade * g); ctx.beginPath(); ctx.ellipse(0, 0, 10 * unit * f.sc, 5 * unit * f.sc, 0.6, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.globalAlpha = gFade;
          daisy(x, y, 24 * unit * f.sc * easeOutBack(g) * (1 + 0.05 * Math.sin(t * 0.005 + f.ph)), f.col, a + t * 0.0008 * f.dir);
          ctx.globalAlpha = 1;
        }
        // soft glow in the middle behind the text
        var mg = ctx.createRadialGradient(cx, cy, 0, cx, cy, RR * 0.9);
        mg.addColorStop(0, hexA(primary, 0.22 * vineA)); mg.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(cx, cy, RR * 0.9, 0, TAU); ctx.fill();
        // falling petals
        for (var i = 0; i < petals.length; i++) {
          var pe = petals[i], py = pe.y0 + p * pe.sp * 2.2;
          ctx.save(); ctx.translate(pe.x + Math.sin(t * 0.002 + pe.ph) * 20 * unit, py); ctx.rotate(t * 0.002 + pe.ph);
          ctx.fillStyle = hexA(pe.col, 0.75 * gFade); ctx.beginPath(); ctx.ellipse(0, 0, pe.s, pe.s * 0.55, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        // super: butterflies circling
        for (var b = 0; b < bfly.length; b++) {
          var bb = bfly[b], ba = bb.a + t * 0.0013, bx = cx + Math.cos(ba) * RR * 1.18, byy = cy + Math.sin(ba) * RR * 1.08;
          var w = Math.abs(Math.cos(t * 0.018 + b)), s = 11 * unit;
          ctx.fillStyle = hexA(bb.col, 0.95 * gFade * clamp01((p - 0.3) / 0.1));
          ctx.beginPath(); ctx.ellipse(bx - s * 0.6 * w, byy, s * w, s * 0.8, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(bx + s * 0.6 * w, byy, s * w, s * 0.8, 0, 0, TAU); ctx.fill();
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
