/* success-crystal-gem.js — מסך הצלחה: יַהֲלוֹם נוֹצֵץ 💎
   יהלום מלוטש ענק צומח במרכז בקפיצה רכה; הפאות שלו צבועות בגווני הסקין,
   מאחוריו קרני אור מסתובבות, וניצוץ לבן רץ על הפאות. בסופר: היהלום מסתובב
   סביב צירו ומפזר קשת של אור וגבישים קטנים לכל הכיוונים.
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
    name: 'crystal-gem',
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
      var praise  = opts.praise || 'אַתְּ יְקָרָה כְּמוֹ יַהֲלוֹם!';

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
      var cx = W / 2, cy = H * 0.57, G = Math.min(W, H) * (isSuper ? 0.2 : 0.17);
      var faceCols = [primary, mixHex(primary, '#FFFFFF', 0.4), glow, mixHex(glow, '#FFFFFF', 0.45), mixHex(primary, glow, 0.5), mixHex(accent, '#FFFFFF', 0.3)];
      var shards = [];
      if (isSuper) for (var i = 0; i < 26; i++)
        shards.push({ a: i / 26 * TAU + rnd(-0.1, 0.1), sp: rnd(0.6, 1.1), s: rnd(5, 11) * unit, col: faceCols[i % faceCols.length], rot: Math.random() * TAU });
      var RAINBOW = ['#FF7EB3', '#FFB86B', '#FFE66D', '#8EE59B', '#7DC4FF', '#C77DFF'];

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
      var txtAt = dur * 0.3;
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
        var g = easeOutBack(clamp01(p / 0.22));
        var spin = isSuper ? Math.cos(clamp01((p - 0.35) / 0.35) * TAU) : 1;
        // rays
        var rayA = clamp01((p - 0.12) / 0.2) * gFade;
        for (var r = 0; r < 12; r++) {
          var ra = r / 12 * TAU + t * 0.0006;
          ctx.fillStyle = hexA(isSuper ? RAINBOW[r % 6] : (r % 2 ? accent : glow), 0.16 * rayA);
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ra - 0.09) * G * 3.4, cy + Math.sin(ra - 0.09) * G * 3.4);
          ctx.lineTo(cx + Math.cos(ra + 0.09) * G * 3.4, cy + Math.sin(ra + 0.09) * G * 3.4);
          ctx.closePath(); ctx.fill();
        }
        var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, G * 1.9);
        halo.addColorStop(0, hexA(mixHex(glow, '#FFFFFF', 0.5), 0.4 * rayA)); halo.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, G * 1.9, 0, TAU); ctx.fill();
        // the gem (brilliant cut, scaled by g and the spin)
        ctx.translate(cx, cy); ctx.scale(g * Math.max(0.08, Math.abs(spin)), g); ctx.translate(-cx, -cy);
        var top = cy - G * 0.55, gird = cy - G * 0.15, tip = cy + G * 0.95;
        var P = [[cx - G * 0.5, top], [cx + G * 0.5, top], [cx + G, gird], [cx - G, gird]];
        var faces = [
          [[cx - G * 0.5, top], [cx + G * 0.5, top], [cx + G * 0.25, gird], [cx - G * 0.25, gird]],
          [[cx - G * 0.5, top], [cx - G * 0.25, gird], [cx - G, gird]],
          [[cx + G * 0.5, top], [cx + G, gird], [cx + G * 0.25, gird]],
          [[cx - G, gird], [cx - G * 0.25, gird], [cx, tip]],
          [[cx - G * 0.25, gird], [cx + G * 0.25, gird], [cx, tip]],
          [[cx + G * 0.25, gird], [cx + G, gird], [cx, tip]],
        ];
        var flip = spin < 0 ? 1 : 0;
        for (var fi = 0; fi < faces.length; fi++) {
          var fc = faces[fi];
          ctx.fillStyle = hexA(faceCols[(fi + flip * 2) % faceCols.length], 0.95 * gFade);
          ctx.beginPath(); ctx.moveTo(fc[0][0], fc[0][1]);
          for (var q = 1; q < fc.length; q++) ctx.lineTo(fc[q][0], fc[q][1]);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = hexA('#FFFFFF', 0.55 * gFade); ctx.lineWidth = 1.6 * unit; ctx.stroke();
        }
        // a glint sweeping across
        var sw = (t * 0.0009) % 1.6 - 0.3;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.lineTo(cx, tip); ctx.lineTo(P[3][0], P[3][1]); ctx.closePath(); ctx.clip();
        var gl = ctx.createLinearGradient(cx - G + sw * G * 2 - G * 0.3, 0, cx - G + sw * G * 2 + G * 0.3, 0);
        gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, hexA('#FFFFFF', 0.55 * gFade)); gl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(cx - G, top, G * 2, tip - top);
        ctx.restore();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // twinkles at the corners
        for (var k = 0; k < 4; k++) {
          var tw = Math.pow(Math.max(0, Math.sin(t * 0.006 + k * 1.7)), 6) * g * gFade;
          var pt = [[cx - G * 0.5, top], [cx + G, gird], [cx, tip], [cx + G * 0.5, top]][k];
          ctx.fillStyle = hexA('#FFFFFF', tw); sparkPath(ctx, pt[0], pt[1], 16 * unit); ctx.fill();
        }
        // super: shards burst out
        for (var i = 0; i < shards.length; i++) {
          var sp = clamp01((p - 0.55) / 0.4); if (sp <= 0) break;
          var s = shards[i], d = easeOut(sp) * Math.min(W, H) * 0.48 * s.sp;
          ctx.save(); ctx.translate(cx + Math.cos(s.a) * d, cy + Math.sin(s.a) * d); ctx.rotate(s.rot + sp * 4);
          ctx.fillStyle = hexA(s.col, (1 - sp * 0.7) * gFade);
          ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.6, 0); ctx.lineTo(0, s.s); ctx.lineTo(-s.s * 0.6, 0); ctx.closePath(); ctx.fill();
          ctx.restore();
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
