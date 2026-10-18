/* success-snail-trail.js — מסך הצלחה: חִלָּזוֹן וְשֹׁבֶל קֶשֶׁת 🐌
   חילזון חמוד (שתי קרני עיניים, חיוך פתוח וסומק) זוחל לאורך עלה ירוק ומשאיר
   אחריו שובל של קשת בענן מנצנץ; על הקונכייה הספירלית בצבעי הסקין מסתובב נצנוץ.
   בסוף הוא מביט לאחור בגאווה ופרחים וכוכבים קטנים צצים לאורך השובל. בסופר:
   השובל מתרומם לשמיים לקשת שלמה, יורד מטר נצנצים וחילזון תינוק בא בעקבותיו.
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

  var RB = ['#FF6B8B', '#FFA94D', '#FFE066', '#7BE495', '#6CC6FF', '#B98CFF'];

  window.SUCCESS.styles.push({
    name: 'snail-trail',
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

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 40 : 26); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      var TRAVEL = isSuper ? 0.45 : 0.55;           // the snail arrives at this fraction of dur
      var LOOK = TRAVEL + 0.03;                      // …then looks back proudly
      var ARC0 = 0.5, ARC1 = 0.7;                    // super: trail lifts into a sky rainbow
      var pops = [], nPop = isSuper ? 9 : 7;
      for (var i = 0; i < nPop; i++)
        pops.push({ u: (i + 0.5) / nPop, at: LOOK + 0.02 + i * 0.03, kind: i % 2 ? 'star' : 'flower',
                    col: ['#FF8FC8', '#FFE66D', '#FFFFFF', primary, glow][i % 5], s: rnd(0.85, 1.15) });
      var glints = [];
      for (var g = 0; g < 10; g++) glints.push({ u: Math.random(), sp: rnd(0.15, 0.3), b: (Math.random() * 6) | 0 });
      var shower = [];
      if (isSuper) for (var sI = 0; sI < 44; sI++)
        shower.push({ x: rnd(-1, 1), y0: rnd(-1.1, -0.2), at: ARC1 - 0.04 + rnd(0, 0.18), v: rnd(0.35, 0.6), ph: rnd(0, TAU),
                      col: [accent, '#FFFFFF', glow, primary, '#FF8FC8'][sI % 5], k: sI % 3 });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (TRAVEL - 0.08);
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

      var BODY = '#FFD3A1', BODY_D = '#EFA874', INK = '#3A2234';
      var SHELL = primary, SHELL_D = mixHex(primary, '#2A1240', 0.35), SHELL_L = mixHex(primary, '#FFFFFF', 0.45);
      // side-view snail facing LEFT; base at (x, y). look: 0 = ahead (left), 1 = looking back (right)
      function snail(x, y, S, t, look, moving, shellRot) {
        var sq = moving ? Math.sin(t * 0.014) * 0.05 : 0;
        ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq, 1 - sq * 0.6); ctx.translate(-x, -y);
        var lean = look * 0.32 * S;
        function stalk(bx0, by0, tx, ty) {
          ctx.strokeStyle = BODY_D; ctx.lineWidth = S * 0.1;
          ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.quadraticCurveTo((bx0 + tx) / 2 - S * 0.05, (by0 + ty) / 2, tx, ty); ctx.stroke();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(tx, ty, S * 0.14, 0, TAU); ctx.fill();
          ctx.strokeStyle = BODY_D; ctx.lineWidth = S * 0.03; ctx.stroke();
          var pd = (look > 0.5 ? 1 : -1) * S * 0.045;
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(tx + pd, ty + S * 0.01, S * 0.075, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(tx + pd + S * 0.025, ty - S * 0.025, S * 0.026, 0, TAU); ctx.fill();
        }
        // far eyestalk first (behind the head)
        stalk(x - S * 0.62, y - S * 0.74, x - S * 0.6 + lean, y - S * 1.38);
        // body / foot
        ctx.fillStyle = BODY;
        ctx.beginPath();
        ctx.moveTo(x + S * 1.3, y);
        ctx.quadraticCurveTo(x + S * 0.6, y - S * 0.34, x - S * 0.35, y - S * 0.3);
        ctx.bezierCurveTo(x - S * 0.48, y - S * 0.95, x - S * 1.08, y - S * 0.92, x - S * 1.08, y - S * 0.38);
        ctx.quadraticCurveTo(x - S * 1.08, y, x - S * 0.75, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = BODY_D;
        ctx.beginPath(); ctx.moveTo(x + S * 1.3, y); ctx.quadraticCurveTo(x + S * 0.3, y - S * 0.12, x - S * 0.8, y - S * 0.04);
        ctx.lineTo(x - S * 0.75, y); ctx.closePath(); ctx.fill();
        // the spiral shell
        var sx = x + S * 0.28, sy = y - S * 0.7, sr = S * 0.62;
        ctx.fillStyle = SHELL; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
        ctx.strokeStyle = SHELL_L; ctx.lineWidth = S * 0.06; ctx.beginPath(); ctx.arc(sx, sy, sr * 0.92, 0, TAU); ctx.stroke();
        ctx.strokeStyle = SHELL_D; ctx.lineWidth = S * 0.075;
        ctx.beginPath();
        for (var k = 0; k <= 60; k++) {
          var a = shellRot + k / 60 * TAU * 2.4, rr = sr * 0.82 * (1 - k / 60);
          var px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.ellipse(sx - sr * 0.4, sy - sr * 0.45, sr * 0.2, sr * 0.11, -0.7, 0, TAU); ctx.fill();
        // a sparkle orbiting the shell
        var oa = -t * 0.004, ox = sx + Math.cos(oa) * sr * 1.12, oy = sy + Math.sin(oa) * sr * 1.12;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(t * 0.006);
        ctx.fillStyle = hexA('#FFFFFF', 0.9); sparkPath(ctx, 0, 0, S * (0.12 + 0.05 * Math.sin(t * 0.01))); ctx.fill();
        ctx.restore();
        // near eyestalk
        stalk(x - S * 0.85, y - S * 0.7, x - S * 0.98 + lean, y - S * 1.3);
        // smiling open mouth + tongue
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.moveTo(x - S * 1.04, y - S * 0.4);
        ctx.quadraticCurveTo(x - S * 0.92, y - S * (look > 0.5 ? 0.14 : 0.2), x - S * 0.76, y - S * 0.38);
        ctx.quadraticCurveTo(x - S * 0.9, y - S * 0.33, x - S * 1.04, y - S * 0.4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6';
        ctx.beginPath(); ctx.ellipse(x - S * 0.9, y - S * (look > 0.5 ? 0.23 : 0.27), S * 0.06, S * 0.03, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,150,.55)';
        ctx.beginPath(); ctx.ellipse(x - S * 0.66, y - S * 0.46, S * 0.1, S * 0.06, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function flower(x, y, s, col) {
        ctx.strokeStyle = '#4FA35A'; ctx.lineWidth = Math.max(1.5, s * 0.18);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 1.6); ctx.stroke();
        var fy = y - s * 1.6;
        ctx.fillStyle = col;
        for (var k = 0; k < 5; k++) { var a = k / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.55, fy + Math.sin(a) * s * 0.55, s * 0.42, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(x, fy, s * 0.33, 0, TAU); ctx.fill();
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var s = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.rate + s.tw));
          ctx.fillStyle = hexA(s.color, 0.75 * k * gFade);
          sparkPath(ctx, s.x * W, s.y * H, s.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;
        // layout (recomputed per frame → survives a resize)
        var gy = H * (W < H ? 0.66 : 0.72);
        var S = Math.min(W * 0.13, H * 0.085);
        var R = Math.min(W * 0.3, H * 0.32);
        var xs = W * 0.5 + R, xe = W * 0.5 - R;
        var mv = easeInOut(clamp01(p / TRAVEL));
        var sx = xs + (xe - xs) * mv;
        var look = clamp01((p - LOOK) / 0.05);
        // the leaf
        var L0 = W * 0.03, L1 = W * 0.97, th = Math.min(H * 0.11, 105 * unit + 12);
        var lg = ctx.createLinearGradient(0, gy, 0, gy + th * 1.3);
        lg.addColorStop(0, '#6CCB6E'); lg.addColorStop(1, '#2E7D4F');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(L0, gy + th * 0.15);
        ctx.quadraticCurveTo(W * 0.5, gy - th * 0.12, L1, gy + th * 0.15);
        ctx.bezierCurveTo(W * 0.78, gy + th * 1.5, W * 0.22, gy + th * 1.5, L0, gy + th * 0.15);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(220,255,210,.55)'; ctx.lineWidth = 2.5 * unit + 0.8;
        ctx.beginPath(); ctx.moveTo(L0 + W * 0.02, gy + th * 0.3); ctx.quadraticCurveTo(W * 0.5, gy + th * 0.62, L1 + W * 0.01, gy + th * 0.25); ctx.stroke();
        ctx.lineWidth = 1.6 * unit + 0.6;
        for (var v = 1; v < 8; v++) {
          var vx = L0 + (L1 - L0) * v / 8, vy = gy + th * (0.36 + 0.24 * Math.sin(v / 8 * Math.PI));
          ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx - W * 0.035, vy - th * 0.22); ctx.moveTo(vx, vy); ctx.lineTo(vx - W * 0.035, vy + th * 0.3); ctx.stroke();
        }
        // the rainbow trail (ground → sky arc in super)
        var bw = 4.5 * unit + 1.2;
        var tEnd = sx + S * 0.6;                     // trail runs from xs to just under the snail
        var arcK = isSuper ? easeInOut(clamp01((p - ARC0) / (ARC1 - ARC0))) : 0;
        var tLen = xs - tEnd;
        var aR = tLen / 2, acx = (xs + tEnd) / 2;
        function trailPt(u, b, out) {
          var x0 = xs - tLen * u, y0 = gy - (5 - b + 0.5) * bw;
          if (arcK <= 0) { out[0] = x0; out[1] = y0; return; }
          var th2 = Math.PI * u, rad = Math.max(1, aR - b * bw * 1.6);
          var x1 = acx + Math.cos(th2) * rad, y1 = gy - Math.sin(th2) * rad * 1.05;
          out[0] = x0 + (x1 - x0) * arcK; out[1] = y0 + (y1 - y0) * arcK;
        }
        var pt = [0, 0];
        if (tLen > 2) {
          var segs = 48;
          ctx.lineWidth = bw * (1 + arcK * 0.6) + 0.5;
          for (var b = 0; b < 6; b++) {
            ctx.strokeStyle = hexA(RB[b], 0.88);
            ctx.beginPath();
            for (var q = 0; q <= segs; q++) { trailPt(q / segs, b, pt); if (q === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]); }
            ctx.stroke();
          }
          // shimmering glints running along the trail
          for (var gI = 0; gI < glints.length; gI++) {
            var gl = glints[gI], gu = (gl.u + t * 0.001 * gl.sp) % 1;
            trailPt(gu, gl.b, pt);
            ctx.fillStyle = hexA('#FFFFFF', 0.95 * (0.5 + 0.5 * Math.sin(t * 0.012 + gI)));
            sparkPath(ctx, pt[0], pt[1], bw * 1.6); ctx.fill();
          }
        }
        // flowers + stars popping up along the trail (on the leaf)
        for (var m = 0; m < pops.length; m++) {
          var po = pops[m], gq = easeOutBack(clamp01((p - po.at) / 0.08)); if (gq <= 0) continue;
          var fx = xs - (xs - (xe + S * 0.6)) * po.u, fs = 14 * unit * po.s * gq + 1;
          if (po.kind === 'flower') flower(fx, gy + 2 * unit, fs, po.col);
          else {
            ctx.fillStyle = po.col;
            starPath(ctx, fx, gy - 6 * bw - fs * 1.3, fs * 1.1, fs * 0.5, t * 0.002 + m); ctx.fill();
          }
        }
        // baby snail (super) follows along the trail
        if (isSuper) {
          var bq = easeInOut(clamp01((p - 0.12) / 0.5));
          var bS = S * 0.55, bxs = W + bS * 1.4, bxe = xe + S * 2.6;
          if (bq > 0) snail(bxs + (bxe - bxs) * bq, gy, bS, t + 400, look, bq < 1, -t * 0.003);
        }
        // the snail
        var inA = clamp01(p / 0.06);
        ctx.globalAlpha = gFade * inA;
        snail(sx, gy, S, t, look, mv < 1, -mv * TAU * 1.5);
        ctx.globalAlpha = gFade;
        // super: sparkle shower falling from the sky-rainbow
        for (var n = 0; n < shower.length; n++) {
          var sh = shower[n], st = (t - sh.at * dur) / 1000; if (st <= 0) continue;
          var shx = acx + sh.x * aR * 1.3 + Math.sin(st * 3 + sh.ph) * 10 * unit, shy = gy + sh.y0 * aR * 1.3 + st * sh.v * H * 0.5;
          var sa = clamp01(st * 4) * clamp01(1.5 - st * 0.8); if (sa <= 0) continue;
          ctx.globalAlpha = gFade * sa;
          ctx.fillStyle = sh.col;
          var sz = (sh.k === 0 ? 9 : 6) * unit + 2;
          if (sh.k === 0) starPath(ctx, shx, shy, sz, sz * 0.45, st * 2); else sparkPath(ctx, shx, shy, sz);
          ctx.fill();
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
