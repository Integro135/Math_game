/* success-heart-lock.js — מסך הצלחה: מַנְעוּל הַלֵּב 🔐
   מנעול גדול בצורת לב נוחת במרכז; מפתח זהב מעופף מגיע, נכנס לחור המנעול
   ומסתובב — קליק! — הקשת של המנעול קופצת למעלה, והלב זוהר ומפזר לבבות
   קטנים לכל עבר. בסופר: טבעות אור וזרם לבבות גדול יותר.
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
    name: 'heart-lock',
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
      var praise  = opts.praise || 'פָּתַחְתְּ אֶת הַתְּשׁוּבָה!';

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
      var hx = W * 0.5, hy = H * 0.6, HS = Math.min(W, H) * (isSuper ? 0.15 : 0.13);
      var lockC = mixHex(primary, '#FF6FA5', 0.35), lockD = mixHex(lockC, '#000000', 0.25), lockL = mixHex(lockC, '#FFFFFF', 0.4);
      var gold = mixHex(accent, '#FFD54F', 0.5), goldD = mixHex(gold, '#7A4A10', 0.4);
      var burst = [];
      for (var i = 0; i < (isSuper ? 36 : 20); i++) burst.push({ a: i / (isSuper ? 36 : 20) * TAU + rnd(-0.1, 0.1), sp: rnd(0.5, 1), s: rnd(7, 14) * unit,
                                                               col: [primary, accent, '#FF6FA5', '#FFFFFF', glow][i % 5] });
      function key(x, y, ang, s) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
        ctx.fillStyle = gold; ctx.strokeStyle = goldD; ctx.lineWidth = 3 * unit;
        ctx.beginPath(); ctx.arc(HS * 0.95, 0, HS * 0.28, 0, TAU); ctx.fill(); ctx.stroke();                  // bow
        ctx.fillStyle = hexA('#000000', 0.25); heartPath(ctx, HS * 0.95, 0, HS * 0.11); ctx.fill();
        ctx.fillStyle = gold; ctx.fillRect(0, -HS * 0.06, HS * 0.7, HS * 0.12);                                  // shaft
        ctx.fillRect(HS * 0.05, HS * 0.06, HS * 0.1, HS * 0.14); ctx.fillRect(HS * 0.22, HS * 0.06, HS * 0.08, HS * 0.1);  // bit
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
      var txtAt = dur * 0.46;
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
        var land = easeOutBack(clamp01(p / 0.15));
        var fly = easeInOut(clamp01((p - 0.12) / 0.2));
        var turn = easeInOut(clamp01((p - 0.32) / 0.1));
        var pop = easeOutBack(clamp01((p - 0.42) / 0.1));
        var glowA = clamp01((p - 0.42) / 0.1);
        ctx.globalAlpha = gFade;
        ctx.save(); ctx.translate(hx, hy); ctx.scale(land, land);
        if (glowA > 0) {
          var hl = ctx.createRadialGradient(0, 0, HS * 0.3, 0, 0, HS * 2.6);
          hl.addColorStop(0, hexA('#FF8FC0', 0.5 * glowA)); hl.addColorStop(1, hexA('#FF8FC0', 0));
          ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(0, 0, HS * 2.6, 0, TAU); ctx.fill();
        }
        // shackle (rises when unlocked)
        ctx.strokeStyle = '#C9CCD8'; ctx.lineWidth = HS * 0.16;
        ctx.beginPath(); ctx.arc(0, -HS * 0.62 - pop * HS * 0.35, HS * 0.5, Math.PI, TAU); ctx.lineTo(HS * 0.5, -HS * 0.3 - pop * HS * 0.35); ctx.moveTo(-HS * 0.5, -HS * 0.62 - pop * HS * 0.35); ctx.lineTo(-HS * 0.5, -HS * 0.3); ctx.stroke();
        // heart body
        var hg = ctx.createLinearGradient(0, -HS, 0, HS);
        hg.addColorStop(0, lockL); hg.addColorStop(1, lockD);
        ctx.fillStyle = hg; heartPath(ctx, 0, HS * 0.05, HS * 1.05 * (1 + 0.04 * glowA * Math.sin(t * 0.014))); ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.45); ctx.lineWidth = 3 * unit; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-HS * 0.45, -HS * 0.2, HS * 0.18, HS * 0.1, -0.6, 0, TAU); ctx.fill();
        // keyhole
        ctx.fillStyle = '#3A1A3A'; ctx.beginPath(); ctx.arc(0, HS * 0.05, HS * 0.13, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-HS * 0.07, HS * 0.1); ctx.lineTo(HS * 0.07, HS * 0.1); ctx.lineTo(HS * 0.1, HS * 0.4); ctx.lineTo(-HS * 0.1, HS * 0.4); ctx.closePath(); ctx.fill();
        ctx.restore();
        // the key flies in from the right and turns
        if (p < 0.55) {
          var kx = hx + HS * 0.05 + (1 - fly) * W * 0.55, ky = hy + HS * 0.05 * land - (1 - fly) * H * 0.18 + Math.sin(fly * Math.PI) * -40 * unit;
          ctx.save(); ctx.translate(kx, ky); ctx.scale(1, Math.cos(turn * Math.PI / 2) * 0.8 + 0.2); key(0, 0, (1 - fly) * 0.5, 1); ctx.restore();
        }
        if (turn > 0.9 && p < 0.48) { ctx.fillStyle = hexA('#FFFFFF', 0.9); sparkPath(ctx, hx + HS * 0.3, hy - HS * 0.1, 18 * unit); ctx.fill(); }   // click!
        // hearts burst out
        var bp = clamp01((p - 0.45) / 0.45);
        if (bp > 0) for (var i = 0; i < burst.length; i++) {
          var b = burst[i], d = easeOut(bp) * Math.min(W, H) * 0.42 * b.sp;
          ctx.fillStyle = hexA(b.col, 1 - bp); heartPath(ctx, hx + Math.cos(b.a) * d, hy + Math.sin(b.a) * d - bp * 30 * unit, b.s); ctx.fill();
        }
        if (isSuper) for (var r = 0; r < 3; r++) {
          var q = bp * 1.3 - r * 0.18; if (q <= 0 || q >= 1) continue;
          ctx.strokeStyle = hexA(r % 2 ? accent : '#FF8FC0', 0.5 * (1 - q)); ctx.lineWidth = 4 * unit;
          ctx.beginPath(); ctx.arc(hx, hy, q * Math.min(W, H) * 0.5, 0, TAU); ctx.stroke();
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
