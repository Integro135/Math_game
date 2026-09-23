/* success-ringed-planet.js — מסך הצלחה: כּוֹכַב לֶכֶת עִם טַבַּעַת 🪐
   כוכב לכת עגול ופסוס בצבעי הסקין צומח במרכז, מוקף טבעת מוטה ומנצנצת
   (החצי האחורי מאחוריו, החצי הקדמי מלפניו), ושלושה ירחים קטנים מקיפים
   אותו ומתחבאים מאחוריו. בסופר: הטבעת מתמלאת אבק כוכבים זוהר ושביט חוצה.
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
    name: 'ringed-planet',
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
      var praise  = opts.praise || 'אַתְּ כּוֹכֶבֶת אֲמִיתִּית!';

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
      var cx = W / 2, cy = H * 0.58, PR = Math.min(W, H) * (isSuper ? 0.15 : 0.13);
      var tilt = -0.32;
      var bands = [mixHex(primary, '#FFFFFF', 0.25), mixHex(primary, accent, 0.4), primary, mixHex(primary, '#000000', 0.2), mixHex(accent, '#FFFFFF', 0.25)];
      var moons = [];
      for (var m = 0; m < 3; m++) moons.push({ a: m / 3 * TAU, rx: PR * (2.0 + m * 0.45), ry: PR * (0.55 + m * 0.18), sp: 0.0016 - m * 0.00035, s: PR * (0.16 - m * 0.03), col: [glow, accent, '#FFFFFF'][m] });
      var ringDust = [];
      for (var i = 0; i < (isSuper ? 90 : 40); i++) ringDust.push({ a: Math.random() * TAU, r: rnd(1.45, 2.05), s: rnd(1, 2.6) * unit, col: i % 3 ? '#FFFFFF' : accent });
      function ringHalf(front, g) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(1, 0.28);
        for (var k = 0; k < 3; k++) {
          ctx.strokeStyle = hexA([accent, glow, mixHex(accent, '#FFFFFF', 0.5)][k], (0.85 - k * 0.2) * g * gFade);
          ctx.lineWidth = (10 - k * 2.5) * unit / 0.28 * 0.35;
          ctx.beginPath(); ctx.arc(0, 0, PR * (1.6 + k * 0.22) * g, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
        }
        ctx.restore();
        for (var i = 0; i < ringDust.length; i++) {
          var d = ringDust[i], a = d.a + t * 0.0005;
          var inFront = Math.sin(a) > 0; if (inFront !== front) continue;
          var lx = Math.cos(a) * PR * d.r * g, ly = Math.sin(a) * PR * d.r * g * 0.28;
          var x = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt), y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
          ctx.fillStyle = hexA(d.col, 0.8 * g * gFade * (0.5 + 0.5 * Math.sin(t * 0.006 + i)));
          ctx.beginPath(); ctx.arc(x, y, d.s, 0, TAU); ctx.fill();
        }
      }
      function moon(mo, front, g) {
        var a = mo.a + t * mo.sp; if ((Math.sin(a) > 0) !== front) return;
        var lx = Math.cos(a) * mo.rx * g, ly = Math.sin(a) * mo.ry * g;
        var x = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt), y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
        var mg = ctx.createRadialGradient(x - mo.s * 0.3, y - mo.s * 0.3, 0, x, y, mo.s);
        mg.addColorStop(0, '#FFFFFF'); mg.addColorStop(1, mo.col);
        ctx.fillStyle = mg; ctx.globalAlpha = gFade * g; ctx.beginPath(); ctx.arc(x, y, mo.s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
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
        var g = easeOutBack(clamp01(p / 0.24));
        var halo = ctx.createRadialGradient(cx, cy, PR * 0.8, cx, cy, PR * 2.6);
        halo.addColorStop(0, hexA(glow, 0.3 * g * gFade)); halo.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, PR * 2.6, 0, TAU); ctx.fill();
        for (var m = 0; m < moons.length; m++) moon(moons[m], false, g);
        ringHalf(false, g);
        // the planet: bands clipped to the disc, then shading
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, PR * g, 0, TAU); ctx.clip();
        ctx.translate(cx, cy); ctx.rotate(tilt);
        for (var b = 0; b < 9; b++) {
          ctx.fillStyle = hexA(bands[b % bands.length], gFade);
          ctx.fillRect(-PR * 1.2, -PR * 1.1 + b * PR * 0.25 + Math.sin(t * 0.001 + b) * 2 * unit, PR * 2.4, PR * 0.27);
        }
        ctx.restore();
        var sh = ctx.createRadialGradient(cx - PR * 0.4 * g, cy - PR * 0.4 * g, PR * 0.1 * g, cx, cy, PR * g);
        sh.addColorStop(0, hexA('#FFFFFF', 0.35 * gFade)); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, hexA('#000000', 0.35 * gFade));
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy, PR * g, 0, TAU); ctx.fill();
        ringHalf(true, g);
        for (var m = 0; m < moons.length; m++) moon(moons[m], true, g);
        // super: a comet crossing
        if (isSuper) {
          var cp = clamp01((p - 0.45) / 0.35);
          if (cp > 0 && cp < 1) {
            var kx = W * (1.05 - 1.2 * cp), ky = H * (0.12 + 0.2 * cp);
            var cg = ctx.createLinearGradient(kx, ky, kx + 160 * unit, ky - 30 * unit);
            cg.addColorStop(0, hexA('#FFFFFF', 0.9 * gFade)); cg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = cg; ctx.lineWidth = 5 * unit;
            ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + 160 * unit, ky - 30 * unit); ctx.stroke();
            ctx.fillStyle = hexA('#FFFFFF', gFade); ctx.beginPath(); ctx.arc(kx, ky, 5 * unit, 0, TAU); ctx.fill();
          }
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
