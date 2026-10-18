/* success-whale-spout.js — מסך הצלחה: לִוְיָתָן מַתִּיז 🐳
   לוויתן קטן וחייכני צף מתוך הגלים, מנופף בזנב, ואז מתיז מנקב הנשיפה מזרקה
   גבוהה — ובראשה פורצים לבבות וכוכבים בצבעי הסקין שנופלים חזרה כמו גשם
   של נצנצים. בסופר: לוויתן תינוק מצטרף, שתי התזות ומזרקה גבוהה יותר.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
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
    name: 'whale-spout',
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
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
      }
      fit();
      window.addEventListener('resize', fit);

      // twinkling backdrop stars (normalised positions → survive a resize)
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // the spout's payload: hearts + stars launched from the spout top (analytic ballistic motion)
      var BODY = mixHex(glow, '#3D7BD9', 0.55), BELLY = mixHex(glow, '#FFFFFF', 0.7);
      var bursts = isSuper ? [0.3, 0.58] : [0.34];
      var parts = [];
      bursts.forEach(function (at, bi) {
        var n = isSuper ? 30 : 24;
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + rnd(-0.95, 0.95);
          var sp = rnd(420, 760) * (isSuper ? 1.1 : 1);
          parts.push({ at: at + rnd(0, 0.05), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: i % 3 === 0 ? 'star' : 'heart',
                       col: [primary, accent, '#FF8FC8', '#FFFFFF', glow][i % 5], r: rnd(14, 24), rot: rnd(0, TAU), spin: rnd(-4, 4), burst: bi });
        }
      });
      var drops = [];
      for (var d = 0; d < 26; d++) drops.push({ a: -Math.PI / 2 + rnd(-1.2, 1.2), sp: rnd(160, 380), at: rnd(0, 1), r: rnd(3, 6) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.36;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // a cute side-view whale facing right: ONE eye, an open smiling mouth, blush, a flipper
      function whale(x, y, S, t, tailWag) {
        // tail flukes poking out of the water behind (left)
        ctx.save();
        ctx.translate(x - S * 1.25, y - S * 0.05);
        ctx.rotate(-0.5 + Math.sin(tailWag) * 0.22);
        ctx.fillStyle = BODY;
        ctx.beginPath();
        ctx.moveTo(S * 0.35, S * 0.18);
        ctx.quadraticCurveTo(0, S * 0.05, -S * 0.05, -S * 0.32);
        ctx.quadraticCurveTo(-S * 0.38, -S * 0.5, -S * 0.5, -S * 0.36);
        ctx.quadraticCurveTo(-S * 0.25, -S * 0.32, -S * 0.12, -S * 0.12);
        ctx.quadraticCurveTo(-S * 0.18, -S * 0.5, -S * 0.02, -S * 0.66);
        ctx.quadraticCurveTo(S * 0.08, -S * 0.38, S * 0.1, -S * 0.2);
        ctx.quadraticCurveTo(S * 0.3, -S * 0.05, S * 0.5, -S * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // body
        ctx.fillStyle = BODY;
        ctx.beginPath();
        ctx.moveTo(x + S * 1.0, y + S * 0.05);
        ctx.bezierCurveTo(x + S * 1.02, y - S * 0.62, x + S * 0.35, y - S * 0.82, x - S * 0.2, y - S * 0.7);
        ctx.bezierCurveTo(x - S * 0.75, y - S * 0.58, x - S * 1.2, y - S * 0.25, x - S * 1.3, y + S * 0.05);
        ctx.bezierCurveTo(x - S * 1.1, y + S * 0.55, x + S * 0.2, y + S * 0.75, x + S * 0.75, y + S * 0.5);
        ctx.quadraticCurveTo(x + S * 1.0, y + S * 0.35, x + S * 1.0, y + S * 0.05);
        ctx.closePath(); ctx.fill();
        // belly
        ctx.fillStyle = BELLY;
        ctx.beginPath();
        ctx.moveTo(x + S * 0.95, y + S * 0.18);
        ctx.quadraticCurveTo(x + S * 0.4, y + S * 0.38, x - S * 0.6, y + S * 0.3);
        ctx.quadraticCurveTo(x - S * 0.1, y + S * 0.7, x + S * 0.75, y + S * 0.5);
        ctx.quadraticCurveTo(x + S * 0.92, y + S * 0.38, x + S * 0.95, y + S * 0.18);
        ctx.closePath(); ctx.fill();
        // sheen on the back
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = S * 0.07;
        ctx.beginPath(); ctx.arc(x + S * 0.1, y + S * 0.05, S * 0.62, -2.2, -1.25); ctx.stroke();
        // flipper
        ctx.fillStyle = mixHex(BODY, '#000000', 0.12);
        ctx.save(); ctx.translate(x + S * 0.05, y + S * 0.38); ctx.rotate(0.5 + Math.sin(t * 0.008) * 0.25);
        ctx.beginPath(); ctx.ellipse(-S * 0.18, 0, S * 0.26, S * 0.11, 0, 0, TAU); ctx.fill(); ctx.restore();
        // the eye (one — side view) + highlight
        var ex = x + S * 0.5, ey = y - S * 0.12;
        ctx.fillStyle = '#1F1A33';
        ctx.beginPath(); ctx.ellipse(ex, ey, S * 0.085, S * 0.11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ex + S * 0.03, ey - S * 0.04, S * 0.032, 0, TAU); ctx.fill();
        // open smiling mouth with a tongue
        ctx.fillStyle = '#3A1E3A';
        ctx.beginPath();
        ctx.moveTo(x + S * 0.62, y + S * 0.14);
        ctx.quadraticCurveTo(x + S * 0.8, y + S * 0.17, x + S * 0.97, y + S * 0.1);
        ctx.quadraticCurveTo(x + S * 0.86, y + S * 0.36, x + S * 0.62, y + S * 0.14);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6';
        ctx.beginPath(); ctx.ellipse(x + S * 0.8, y + S * 0.24, S * 0.07, S * 0.035, -0.2, 0, TAU); ctx.fill();
        // blush
        ctx.fillStyle = 'rgba(255,130,170,.5)';
        ctx.beginPath(); ctx.ellipse(x + S * 0.42, y + S * 0.08, S * 0.11, S * 0.06, 0, 0, TAU); ctx.fill();
      }
      function waves(wy, t, a) {
        for (var k = 0; k < 3; k++) {
          var yy = wy + k * 16 * unit, amp = (7 - k * 1.5) * unit, ph = t * (0.002 + k * 0.0007) + k * 1.7;
          var wg = ctx.createLinearGradient(0, yy - amp, 0, H);
          wg.addColorStop(0, hexA(mixHex(glow, '#1C3F8C', 0.3 + k * 0.2), (0.6 - k * 0.1) * a));
          wg.addColorStop(1, hexA(mixHex(glow, '#0B1E4A', 0.6), 0.12 * a));
          ctx.fillStyle = wg;
          ctx.beginPath(); ctx.moveTo(0, H);
          for (var xx = 0; xx <= W + 20; xx += 20) ctx.lineTo(xx, yy + Math.sin(xx * 0.018 + ph) * amp);
          ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
          // a light crest line on the top wave
          if (k === 0) {
            ctx.strokeStyle = hexA('#FFFFFF', 0.5 * a); ctx.lineWidth = 2.5 * unit; ctx.beginPath();
            for (var x2 = 0; x2 <= W + 20; x2 += 20) { var y2 = yy + Math.sin(x2 * 0.018 + ph) * amp; if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
            ctx.stroke();
          }
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // stars
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        var waterY = H * 0.74;
        var S = Math.min(W * 0.19, H * 0.17);
        var cx = W * 0.5 - S * (isSuper && W < H ? 0.5 : 0.1);
        var rise = easeOutBack(clamp01(p / (isSuper ? 0.16 : 0.2)));
        var wy = waterY + S * 0.95 - rise * S * 1.38 + Math.sin(t * 0.004) * 4 * unit;
        // spout (behind the whale's head, above its blowhole)
        var bhx = cx + S * 0.05, bhy = wy - S * 0.72;
        var sp = 0;
        bursts.forEach(function (at) { var q = (p - at + 0.1) / 0.32; if (q > 0 && q < 1) sp = Math.max(sp, Math.sin(q * Math.PI)); });
        var spH = sp * Math.min(H * 0.36, S * 2.3) * (isSuper ? 1.12 : 1);
        if (spH > 2) {
          var topY = bhy - spH, wob = Math.sin(t * 0.02) * 3 * unit;
          var g = ctx.createLinearGradient(0, topY, 0, bhy);
          g.addColorStop(0, hexA('#FFFFFF', 0.95)); g.addColorStop(1, hexA(glow, 0.7));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(bhx - S * 0.07, bhy);
          ctx.quadraticCurveTo(bhx - S * 0.1 + wob, topY + spH * 0.5, bhx - S * 0.13, topY + S * 0.05);
          ctx.quadraticCurveTo(bhx, topY - S * 0.08, bhx + S * 0.13, topY + S * 0.05);
          ctx.quadraticCurveTo(bhx + S * 0.1 - wob, topY + spH * 0.5, bhx + S * 0.07, bhy);
          ctx.closePath(); ctx.fill();
          // droplets curling off the top like a fountain
          for (var j = 0; j < drops.length; j++) {
            var dr = drops[j], q2 = (t * 0.0012 + dr.at) % 1;
            var dx = bhx + Math.cos(dr.a) * dr.sp * q2 * unit * 1.4;
            var dy = topY + Math.sin(dr.a) * dr.sp * q2 * unit * 0.6 + 260 * q2 * q2 * unit;
            ctx.fillStyle = hexA(j % 3 ? '#FFFFFF' : glow, 0.9 * (1 - q2) * sp);
            ctx.beginPath(); ctx.arc(dx, dy, dr.r * unit * 1.4, 0, TAU); ctx.fill();
          }
        }
        // whale(s) — clipped above the waterline so they really sit IN the sea
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, waterY + 6 * unit); ctx.clip();
        if (isSuper) {
          var bRise = easeOutBack(clamp01((p - 0.2) / 0.18));
          var bS = S * 0.55, bx = cx - S * 2.3, by = waterY + bS * 1.1 - bRise * bS * 1.45 + Math.sin(t * 0.005 + 1) * 3 * unit;
          if (bx - bS * 1.8 < 0) bx = Math.min(W - bS * 1.1, cx + S * 2.0);
          if (bRise > 0) whale(bx, by, bS, t, t * 0.007 + 2);
        }
        whale(cx, wy, S, t, t * 0.006);
        ctx.restore();
        // splash ring where the whale broke the surface
        var spl = clamp01(p / 0.22);
        if (spl > 0 && spl < 1) {
          ctx.strokeStyle = hexA('#FFFFFF', 0.7 * (1 - spl)); ctx.lineWidth = 3 * unit;
          ctx.beginPath(); ctx.ellipse(cx, waterY + 4 * unit, S * (0.8 + spl * 1.4), S * (0.12 + spl * 0.18), 0, 0, TAU); ctx.stroke();
        }
        waves(waterY, t, 1);
        // hearts + stars from the spout (drawn over the water — they rain down everywhere)
        var g0 = 900 * unit;
        for (var m = 0; m < parts.length; m++) {
          var pt = parts[m], tt = (t - pt.at * dur) / 1000;
          if (tt <= 0) continue;
          var topY2 = bhy - Math.min(H * 0.36, S * 2.3) * (isSuper ? 1.12 : 1);
          var px = bhx + pt.vx * unit * tt, py = topY2 + pt.vy * unit * tt + 0.5 * g0 * tt * tt;
          if (py > H + 40) continue;
          var fa = clamp01(tt / 0.12) * clamp01(1.6 - tt * 0.8);
          if (fa <= 0) continue;
          var rr = pt.r * unit * 1.25;
          ctx.save(); ctx.translate(px, py); ctx.rotate(pt.rot + pt.spin * tt);
          ctx.globalAlpha = gFade * fa;
          ctx.fillStyle = pt.col;
          if (pt.kind === 'star') starPath(ctx, 0, 0, rr, rr * 0.45, 0); else heartPath(ctx, 0, 0, rr * 0.75);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.arc(-rr * 0.25, -rr * 0.3, rr * 0.16, 0, TAU); ctx.fill();
          ctx.restore();
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
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
