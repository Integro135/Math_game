/* success-cherry-blossom.js — מסך הצלחה: פְּרִיחַת הַדֻּבְדְּבָן 🌸
   ענף סאקורה צומח מצד המסך ופרחים ורודים (5 עלי כותרת עם חריץ) נפתחים
   לאורכו. אז נושבת רוח: עלי הכותרת מתעופפים במערבולת על פני המסך ומתאספים
   ללב גדול לרגע, ואחר כך הרוח מפזרת אותם. בסופר: שני ענפים, יותר עלים,
   והלב גדול יותר ופועם.
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
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  // one sakura petal: base at (0, r), notched tip at (0, -r)
  function petalPath(ctx, r) {
    ctx.beginPath(); ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * 0.95, r * 0.3, -r * 0.75, -r * 0.85, -r * 0.2, -r);
    ctx.lineTo(0, -r * 0.72); ctx.lineTo(r * 0.2, -r);
    ctx.bezierCurveTo(r * 0.75, -r * 0.85, r * 0.95, r * 0.3, 0, r);
    ctx.closePath();
  }
  // classic heart curve, t∈[0,2π) → unit coords (≈ -1..1 wide, -0.7..1 tall)
  function heartPt(t) {
    var s = Math.sin(t);
    return { x: 16 * s * s * s / 17, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 };
  }

  window.SUCCESS.styles.push({
    name: 'cherry-blossom',
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

      var PINK = mixHex('#FFB0D2', primary, 0.08), PINK2 = mixHex('#FF7FB6', primary, 0.1), PALE = '#FFE6F1';
      var BARK = '#6B4A3E';

      // branches in normalised coords (quadratic bezier P0→C→P1); twigs at param s
      var branches = [{ p0: [-0.03, 0.4], c: [0.3, 0.27], p1: [0.72, 0.37], dir: 1, at: 0 }];
      if (isSuper) branches.push({ p0: [1.03, 0.93], c: [0.78, 0.8], p1: [0.4, 0.9], dir: -1, at: 0.06 });
      function bpt(b, s) {
        var u = 1 - s;
        return { x: (u * u * b.p0[0] + 2 * u * s * b.c[0] + s * s * b.p1[0]) * W,
                 y: (u * u * b.p0[1] + 2 * u * s * b.c[1] + s * s * b.p1[1]) * H };
      }
      // blossoms + twigs per branch: {s, ox, oy (in units of m = min(W,H)), size}
      var blossoms = [], twigs = [];
      branches.forEach(function (b, bi) {
        [[0.38, -1], [0.62, 1], [0.84, -1]].forEach(function (tw) {
          twigs.push({ b: bi, s: tw[0], ox: 0.07 * b.dir, oy: 0.08 * tw[1] });
        });
        var n = isSuper ? 12 : 11;
        for (var i = 0; i < n; i++) {
          var s = 0.18 + 0.82 * (i / (n - 1));
          blossoms.push({ b: bi, s: s, ox: rnd(-0.03, 0.03), oy: rnd(-0.035, 0.035) * (i % 2 ? 1 : -1), size: rnd(0.8, 1.15), rot: rnd(0, TAU) });
        }
        twigs.forEach(function (tw) {
          if (tw.b !== bi) return;
          blossoms.push({ b: bi, s: tw.s, ox: tw.ox, oy: tw.oy, size: 1.05, rot: rnd(0, TAU) });
        });
      });
      // flying petals — released from a blossom, swirl, gather on a heart, then scatter
      var NP = isSuper ? 110 : 72;
      var REL = isSuper ? 0.3 : 0.32, GATH = isSuper ? 0.56 : 0.6, HOLD = isSuper ? 0.8 : 0.78;
      var petals = [];
      for (var k = 0; k < NP; k++)
        petals.push({ from: k % blossoms.length, rel: REL + rnd(0, 0.1), ht: (k / NP) * TAU + rnd(-0.02, 0.02), inset: k % 5 === 0 ? rnd(0.55, 0.85) : 1,
                      sw: rnd(0.08, 0.16), a0: rnd(0, TAU), r: rnd(9, 14), spin: rnd(-6, 6), flip: rnd(3, 7), col: k % 3 === 0 ? PALE : k % 3 === 1 ? PINK : PINK2,
                      vx: rnd(380, 720), vy: rnd(-220, 60) });
      var sparks = [];
      for (var q = 0; q < 18; q++) sparks.push({ ht: rnd(0, TAU), d: rnd(1.05, 1.35), tw: rnd(0, TAU) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(PINK2, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.4;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(12% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      function blossomPos(bl) {
        var m = Math.min(W, H), pt = bpt(branches[bl.b], bl.s);
        return { x: pt.x + bl.ox * m, y: pt.y + bl.oy * m };
      }
      function drawFlower(x, y, r, rot, a) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
        for (var i = 0; i < 5; i++) {
          ctx.save(); ctx.rotate(i / 5 * TAU); ctx.translate(0, -r * 0.55);
          ctx.fillStyle = i % 2 ? PINK : PALE; petalPath(ctx, r * 0.55); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = PINK2; ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFE38A';
        for (var j = 0; j < 5; j++) { var a2 = j / 5 * TAU + 0.6; ctx.beginPath(); ctx.arc(Math.cos(a2) * r * 0.3, Math.sin(a2) * r * 0.3, r * 0.07, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      function drawBranch(b, g) {
        if (g <= 0) return;
        var N = 26, m = Math.min(W, H), w0 = m * 0.03;
        var prev = bpt(b, 0);
        ctx.strokeStyle = BARK;
        for (var i = 1; i <= N; i++) {
          var s = (i / N) * g, pt = bpt(b, s);
          ctx.lineWidth = Math.max(2, w0 * (1 - s * 0.7));
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          prev = pt;
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.save();
        ctx.globalAlpha = gFade;
        var m = Math.min(W, H);
        var HR = Math.min(W * 0.34, H * 0.22) * (isSuper ? 1.15 : 1);
        var hx = W * 0.5, hy = H * (isSuper ? 0.56 : 0.58);
        var pulse = 1 + (isSuper ? 0.07 : 0.03) * Math.sin(Math.max(0, p - GATH) * dur * 0.012);
        var heartA = clamp01((p - GATH + 0.04) / 0.08) * clamp01((HOLD + 0.06 - p) / 0.08);
        // soft pink glow behind the gathered heart
        if (heartA > 0) {
          var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, HR * 1.4);
          hg.addColorStop(0, hexA(PINK, 0.32 * heartA)); hg.addColorStop(1, hexA(PINK, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, HR * 1.4, 0, TAU); ctx.fill();
          for (var sI = 0; sI < sparks.length; sI++) {
            var sp = sparks[sI], hp = heartPt(sp.ht), k2 = 0.5 + 0.5 * Math.sin(t * 0.01 + sp.tw);
            ctx.fillStyle = hexA(sI % 2 ? '#FFFFFF' : accent, heartA * k2);
            sparkPath(ctx, hx + hp.x * HR * sp.d * pulse, hy + hp.y * HR * sp.d * pulse, (4 + 4 * k2) * unit * 1.3); ctx.fill();
          }
        }
        // branches + twigs
        branches.forEach(function (b, bi) {
          var g = easeOut(clamp01((p - b.at) / 0.2));
          drawBranch(b, g);
          ctx.strokeStyle = BARK; ctx.lineWidth = Math.max(2, m * 0.01);
          twigs.forEach(function (tw) {
            if (tw.b !== bi) return;
            var tg = clamp01((g - tw.s) / 0.15); if (tg <= 0) return;
            var a = bpt(b, tw.s);
            ctx.beginPath(); ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(a.x + tw.ox * m * 0.3 * tg, a.y + tw.oy * m * 0.9 * tg, a.x + tw.ox * m * tg, a.y + tw.oy * m * tg); ctx.stroke();
          });
        });
        // blossoms open after the branch reaches them; they shed some petals in the breeze
        for (var i = 0; i < blossoms.length; i++) {
          var bl = blossoms[i], b0 = branches[bl.b];
          var open = easeOutBack(clamp01((p - b0.at - 0.04 - bl.s * 0.18) / 0.1));
          if (open <= 0) continue;
          var bp = blossomPos(bl), sway = Math.sin(t * 0.003 + i) * 0.08;
          drawFlower(bp.x, bp.y, m * 0.04 * bl.size * open, bl.rot + sway, 1);
        }
        // the petals
        for (var j = 0; j < petals.length; j++) {
          var pe = petals[j];
          if (p < pe.rel) continue;
          var src = blossomPos(blossoms[pe.from]), hp2 = heartPt(pe.ht);
          var tx = hx + hp2.x * HR * pe.inset * pulse, ty = hy + hp2.y * HR * pe.inset * pulse;
          var x, y, rot = pe.a0 + pe.spin * (t / 1000), fa = 1;
          if (p < GATH) {
            var q = clamp01((p - pe.rel) / (GATH - pe.rel)), e = easeInOut(q), sr = Math.sin(q * Math.PI) * pe.sw * m * 1.8;
            x = src.x + (tx - src.x) * e + Math.cos(pe.a0 + q * TAU * 1.2) * sr;
            y = src.y + (ty - src.y) * e + Math.sin(pe.a0 + q * TAU * 1.2) * sr;
            fa = clamp01(q / 0.08);
          } else if (p < HOLD) {
            x = tx + Math.sin(t * 0.004 + j) * 2 * unit; y = ty + Math.cos(t * 0.004 + j) * 2 * unit;
          } else {
            var st = (p - HOLD) * dur / 1000;
            x = tx + pe.vx * unit * st; y = ty + pe.vy * unit * st + 0.5 * 260 * unit * st * st;
          }
          var r = pe.r * Math.max(unit, 0.62) * 1.35;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t / 1000 * pe.flip + j)));
          ctx.globalAlpha = gFade * fa;
          ctx.fillStyle = pe.col; petalPath(ctx, r); ctx.fill();
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
