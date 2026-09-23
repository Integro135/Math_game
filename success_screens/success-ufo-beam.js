/* success-ufo-beam.js — מסך הצלחה: חֲלָלִית קְטַנָּה 🛸
   חללית קטנה וחמודה עם חייזר מחייך בכיפה נכנסת מהצד ונעצרת, מדליקה אלומת
   אור רכה למטה — וכוכב זהב עולה לאט בתוך האלומה אל החללית; האורות שלה
   מהבהבים מאושר והיא זזה הלאה. בסופר: היא אוספת שלושה כוכבים ולבבות.
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
    name: 'ufo-beam',
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
      var praise  = opts.praise || 'גַּם הַחַיְזָרִים גֵּאִים בָּךְ!';

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
      var UX = W * 0.5, UY = H * 0.36, U = Math.min(W, H) * 0.13;
      var items = isSuper ? [{ dx: 0, at: 0.3, k: 'star' }, { dx: -0.4, at: 0.42, k: 'heart' }, { dx: 0.4, at: 0.54, k: 'star' }] : [{ dx: 0, at: 0.32, k: 'star' }];
      var lightsC = [accent, primary, glow, '#FF7EB3', '#8EE59B'];
      function ufo(x, y, tilt) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
        ctx.fillStyle = hexA(mixHex(glow, '#FFFFFF', 0.5), 0.5); ctx.beginPath(); ctx.arc(0, -U * 0.22, U * 0.5, Math.PI, TAU); ctx.fill();   // dome
        ctx.fillStyle = '#8EE59B'; ctx.beginPath(); ctx.arc(0, -U * 0.3, U * 0.24, 0, TAU); ctx.fill();                                // alien
        ctx.fillStyle = '#1A1A2A';
        ctx.beginPath(); ctx.ellipse(-U * 0.09, -U * 0.34, U * 0.055, U * 0.075, 0, 0, TAU); ctx.ellipse(U * 0.09, -U * 0.34, U * 0.055, U * 0.075, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1A1A2A'; ctx.lineWidth = 2 * unit; ctx.beginPath(); ctx.arc(0, -U * 0.26, U * 0.08, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.strokeStyle = '#8EE59B'; ctx.lineWidth = 2.5 * unit;
        ctx.beginPath(); ctx.moveTo(-U * 0.1, -U * 0.5); ctx.lineTo(-U * 0.16, -U * 0.66); ctx.moveTo(U * 0.1, -U * 0.5); ctx.lineTo(U * 0.16, -U * 0.66); ctx.stroke();
        ctx.fillStyle = '#FFE66D'; ctx.beginPath(); ctx.arc(-U * 0.16, -U * 0.68, U * 0.04, 0, TAU); ctx.arc(U * 0.16, -U * 0.68, U * 0.04, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.5); ctx.lineWidth = 2 * unit; ctx.beginPath(); ctx.arc(0, -U * 0.22, U * 0.5, Math.PI, TAU); ctx.stroke();
        var sg = ctx.createLinearGradient(0, -U * 0.25, 0, U * 0.2);                                                                      // saucer
        sg.addColorStop(0, '#E4E8F4'); sg.addColorStop(1, '#8A90A8');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, U * 1.05, U * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = mixHex(primary, '#FFFFFF', 0.2); ctx.beginPath(); ctx.ellipse(0, U * 0.14, U * 0.55, U * 0.12, 0, 0, TAU); ctx.fill();
        for (var l = 0; l < 7; l++) {
          var lx = (l - 3) * U * 0.28, on = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.012 + l * 1.1));
          ctx.fillStyle = hexA(lightsC[l % lightsC.length], on); ctx.beginPath(); ctx.arc(lx, U * 0.02, U * 0.06, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.4)';
      root.appendChild(txt);
      var txtAt = dur * 0.4;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(12% + 9%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
        var enter = easeOut(clamp01(p / 0.22)), leave = easeInOut(clamp01((p - 0.82) / 0.18));
        var x = UX - (1 - enter) * W * 0.7 + leave * W * 0.8, y = UY + Math.sin(t * 0.004) * 8 * unit - leave * H * 0.12;
        var tilt = (1 - enter) * 0.25 - leave * 0.3 + Math.sin(t * 0.003) * 0.04;
        var beam = clamp01((p - 0.22) / 0.06) * (1 - clamp01((p - 0.76) / 0.06));
        if (beam > 0) {
          var bg = ctx.createLinearGradient(0, y, 0, H * 0.95);
          bg.addColorStop(0, hexA(mixHex(glow, '#FFFFFF', 0.4), 0.5 * beam)); bg.addColorStop(1, hexA(glow, 0.05 * beam));
          ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x - U * 0.45, y + U * 0.2); ctx.lineTo(x + U * 0.45, y + U * 0.2); ctx.lineTo(x + U * 1.4, H * 0.95); ctx.lineTo(x - U * 1.4, H * 0.95); ctx.closePath(); ctx.fill();
          for (var r = 0; r < 5; r++) {                                   // rising rings inside the beam
            var q = ((t * 0.0008 + r / 5) % 1), ry = H * 0.95 - q * (H * 0.95 - y - U * 0.2), rw = U * 0.45 + (U * 0.95) * (1 - q);
            ctx.strokeStyle = hexA('#FFFFFF', 0.35 * beam * (1 - q)); ctx.lineWidth = 2 * unit;
            ctx.beginPath(); ctx.ellipse(x, ry, rw, rw * 0.18, 0, 0, TAU); ctx.stroke();
          }
        }
        for (var i = 0; i < items.length; i++) {
          var it = items[i], q = clamp01((p - it.at) / 0.3); if (q <= 0 || q >= 1) continue;
          var ix = x + it.dx * U * (1 - q), iy = H * 0.86 - easeInOut(q) * (H * 0.86 - y - U * 0.1), s = 34 * unit * (1 - 0.6 * q);
          var ig = ctx.createRadialGradient(ix, iy, 0, ix, iy, s * 2); ig.addColorStop(0, hexA(accent, 0.5)); ig.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, s * 2, 0, TAU); ctx.fill();
          ctx.fillStyle = it.k === 'heart' ? '#FF6FA5' : accent;
          if (it.k === 'heart') heartPath(ctx, ix, iy, s * 0.8); else starPath(ctx, ix, iy, s, s * 0.45, t * 0.003);
          ctx.fill();
        }
        ufo(x, y, tilt);
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
