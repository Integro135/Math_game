/* success-pearl-shell.js — מסך הצלחה: צֶדֶף וּפְנִינָה 🐚
   צדפה מפוספסת נוחתת במרכז, הקונכייה העליונה שלה נפתחת לאט, ובפנים פנינה
   זוהרת ומבהיקה עולה מעט עם הילה של אור; בועות קטנות מבעבעות למעלה. בסופר:
   הפנינה שולחת טבעות אור ומתפרקת למקלעת ניצוצות פנינה.
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
    name: 'pearl-shell',
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
      var praise  = opts.praise || 'מָצָאתְ אֶת הַפְּנִינָה!';

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
      var sx = W / 2, sy = H * 0.64, S = Math.min(W, H) * (isSuper ? 0.2 : 0.18);
      var shellA = mixHex(primary, '#FFFFFF', 0.5), shellB = mixHex(primary, '#FFFFFF', 0.2);
      var bubbles = [];
      for (var i = 0; i < 18; i++) bubbles.push({ x: sx + rnd(-1.2, 1.2) * S, born: rnd(0.15, 0.8), sp: rnd(0.3, 0.55) * H, r: rnd(3, 8) * unit, ph: Math.random() * TAU });
      var bits = [];
      if (isSuper) for (var i = 0; i < 30; i++) bits.push({ a: i / 30 * TAU, sp: rnd(0.5, 1), r: rnd(3, 7) * unit, col: i % 3 ? '#FFFFFF' : glow });
      function fan(scaleY, dark) {
        ctx.save(); ctx.scale(1, scaleY);
        ctx.fillStyle = dark ? shellB : shellA;
        ctx.beginPath(); ctx.moveTo(-S, 0);
        for (var k = 0; k <= 8; k++) { var a = Math.PI + k / 8 * Math.PI; ctx.lineTo(Math.cos(a) * S * (k % 2 ? 1.0 : 0.94), Math.sin(a) * S * 0.9); }
        ctx.lineTo(S, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA(mixHex(primary, '#000000', 0.2), 0.5); ctx.lineWidth = 2 * unit / Math.max(0.2, Math.abs(scaleY));
        for (var r = 1; r < 8; r++) { var a = Math.PI + r / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * S * 0.92, Math.sin(a) * S * 0.84); ctx.stroke(); }
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
      var txtAt = dur * 0.32;
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
        var land = easeOutBack(clamp01(p / 0.16));
        var open = easeInOut(clamp01((p - 0.16) / 0.18));
        var rise = easeOut(clamp01((p - 0.26) / 0.2));
        // bubbles
        for (var i = 0; i < bubbles.length; i++) {
          var b = bubbles[i], bp = clamp01((p - b.born) / 0.5); if (bp <= 0 || bp >= 1) continue;
          ctx.strokeStyle = hexA('#FFFFFF', 0.6 * (1 - bp) * gFade); ctx.lineWidth = 1.5 * unit;
          ctx.beginPath(); ctx.arc(b.x + Math.sin(t * 0.004 + b.ph) * 8 * unit, sy - bp * b.sp, b.r, 0, TAU); ctx.stroke();
        }
        ctx.save(); ctx.translate(sx, sy); ctx.scale(land, land); ctx.globalAlpha = gFade;
        // bottom half (bowl)
        fan(-0.55, true);
        // the lid, hinged at the back: from flat (closed) to a fan standing up behind the pearl
        fan(0.1 + 0.9 * open, false);
        var pa = clamp01((open - 0.3) / 0.4);
        ctx.globalAlpha = gFade * pa;
        // the pearl
        var PRr = S * 0.3, py = -S * 0.12 - rise * S * 0.28;
        var gl = ctx.createRadialGradient(0, py, 0, 0, py, PRr * 3.2);
        gl.addColorStop(0, hexA(mixHex(glow, '#FFFFFF', 0.6), 0.55 * rise)); gl.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, py, PRr * 3.2, 0, TAU); ctx.fill();
        var pg = ctx.createRadialGradient(-PRr * 0.35, py - PRr * 0.35, PRr * 0.05, 0, py, PRr);
        pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(0.6, mixHex(glow, '#FFFFFF', 0.75)); pg.addColorStop(1, mixHex(primary, '#FFFFFF', 0.45));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, py, PRr * (0.9 + 0.1 * rise), 0, TAU); ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.9 * Math.pow(Math.max(0, Math.sin(t * 0.005)), 4));
        sparkPath(ctx, -PRr * 0.35, py - PRr * 0.4, PRr * 0.5); ctx.fill();
        ctx.restore();
        // super: rings of light + pearl bits
        if (isSuper) {
          var rp = clamp01((p - 0.5) / 0.35);
          for (var k = 0; k < 3; k++) {
            var q = rp * 1.3 - k * 0.15; if (q <= 0 || q >= 1) continue;
            ctx.strokeStyle = hexA(k % 2 ? accent : '#FFFFFF', 0.55 * (1 - q) * gFade); ctx.lineWidth = 3 * unit;
            ctx.beginPath(); ctx.arc(sx, sy + (-S * 0.4) * land, q * Math.min(W, H) * 0.45, 0, TAU); ctx.stroke();
          }
          for (var i = 0; i < bits.length; i++) {
            var bb = bits[i], d = easeOut(rp) * Math.min(W, H) * 0.42 * bb.sp; if (rp <= 0) break;
            ctx.fillStyle = hexA(bb.col, (1 - rp) * gFade);
            ctx.beginPath(); ctx.arc(sx + Math.cos(bb.a) * d, sy - S * 0.4 + Math.sin(bb.a) * d, bb.r, 0, TAU); ctx.fill();
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
