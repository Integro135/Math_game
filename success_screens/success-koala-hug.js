/* success-koala-hug.js — מסך הצלחה: קוֹאָלָה מְחַבֶּקֶת 🐨
   ענף אקליפטוס מתנדנד פנימה אל המסך; קואלה אפורה וחמודה מחליקה במורד גפן,
   נוחתת על הענף ומחבקת אותו חזק (העיניים נעצמות מאושר), עלים מרשרשים
   ולבבות קופצים מתוך החיבוק — ואז היא משחררת יד אחת ומנופפת לשלום.
   בסופר: קואלה תינוקת על הגב, פרץ לבבות גדול יותר, עלים נושרים ונצנצים.
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
  function lerp(a, b, t) { return a + (b - a) * t; }
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
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  var FUR = '#A9AEBC', FUR_D = '#7E8496', FUR_L = '#E4E6EE', NOSE = '#2E2A36', INK = '#1F1A2B';

  window.SUCCESS.styles.push({
    name: 'koala-hug',
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
      var praise  = opts.praise || 'חִבּוּק גָּדוֹל!';

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
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.7, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // eucalyptus leaves along the branch (u = 0..1 along it)
      var LEAF = ['#86C5A4', '#6FAF8E', mixHex(glow, '#7FC9A0', 0.6), '#9BD3B4'];
      var leaves = [];
      for (var l = 0; l < 20; l++) {
        var u = (l + rnd(0.1, 0.9)) / 20;
        if (u > 0.4 && u < 0.6) continue;                     // keep the koala's spot clear
        leaves.push({ u: u, side: l % 2 ? 1 : -1, ang: rnd(0.55, 1.15), len: rnd(0.42, 0.58), col: LEAF[l % 4], ph: rnd(0, TAU) });
      }
      // hearts squeezed out of the hug (analytic float-up)
      var hearts = [];
      var waves = isSuper ? [0.3, 0.52, 0.72] : [0.32, 0.58];
      waves.forEach(function (at, wi) {
        var n = isSuper ? (wi === 1 ? 16 : 9) : 7;
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + rnd(-1.1, 1.1);
          var sd0 = i % 2 ? 1 : -1;
          hearts.push({ sd: sd0, at: at + rnd(0, 0.04), vx: sd0 * Math.abs(Math.cos(a)) * rnd(160, 330) + sd0 * 60, vy: Math.sin(a) * rnd(160, 340),
                        r: rnd(13, 22) * (isSuper && wi === 1 ? 1.2 : 1), col: [primary, '#FF7FAE', accent, '#FFFFFF', '#FF5E8E'][i % 5], ph: rnd(0, TAU) });
        }
      });
      // super: falling leaves + sparkles
      var falls = [], sparks = [];
      if (isSuper) {
        for (var f = 0; f < 16; f++) falls.push({ x: Math.random(), at: rnd(0.32, 0.6), sp: rnd(0.16, 0.26), ph: rnd(0, TAU), rot: rnd(0, TAU), col: LEAF[f % 4] });
        for (var s2 = 0; s2 < 22; s2++) sparks.push({ x: rnd(0.08, 0.92), y: rnd(0.25, 0.85), at: rnd(0.35, 0.85), col: [accent, '#FFFFFF', glow, primary][s2 % 4] });
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.3;
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

      // ─── drawing helpers ───
      function leafShape(x, y, ang, len, wid, col) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, wid * 0.12);
        ctx.beginPath(); ctx.moveTo(len * 0.08, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
        ctx.restore();
      }
      // a paw: palm pad + fingers fanned toward `ang`, little dark claws
      function paw(x, y, ang, r, nF, spread) {
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.arc(x, y, r + 1.6 * unit, 0, TAU); ctx.fill();
        for (var o = 0; o < nF; o++) {
          var oa = ang + (o - (nF - 1) / 2) * spread;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(oa) * r * 0.95, y + Math.sin(oa) * r * 0.95, r * 0.36 + 1.6 * unit, r * 0.3 + 1.6 * unit, oa, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        for (var i = 0; i < nF; i++) {
          var a = ang + (i - (nF - 1) / 2) * spread;
          var fx = x + Math.cos(a) * r * 0.95, fy = y + Math.sin(a) * r * 0.95;
          ctx.fillStyle = FUR;
          ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.36, r * 0.3, a, 0, TAU); ctx.fill();
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 1.22, y + Math.sin(a) * r * 1.22, r * 0.1, r * 0.06, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#5E5868';                              // palm pad
        ctx.beginPath(); ctx.ellipse(x - Math.cos(ang) * r * 0.1, y - Math.sin(ang) * r * 0.1, r * 0.48, r * 0.4, ang, 0, TAU); ctx.fill();
      }
      function arm(sx, sy, px, py, w) {
        ctx.strokeStyle = FUR_D; ctx.lineWidth = w + 3 * unit;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
        ctx.strokeStyle = FUR; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke();
      }
      function ear(x, y, r, side) {
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = FUR_L;
        ctx.beginPath(); ctx.arc(x, y + r * 0.08, r * 0.62, 0, TAU); ctx.fill();
        ctx.fillStyle = '#F4C6D6';
        ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 0.34, 0, TAU); ctx.fill();
        // fluffy tufts around the rim
        ctx.fillStyle = FUR_L;
        for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + side * (0.3 + i * 0.32); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, r * 0.17, 0, TAU); ctx.fill(); }
      }
      function face(x, y, R, happy, mouthOpen) {
        // eyes (front view: two)
        var ex = R * 0.42, ey = y - R * 0.12;
        if (happy > 0.5) {
          ctx.strokeStyle = INK; ctx.lineWidth = R * 0.08;
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(x + s * ex, ey + R * 0.04, R * 0.12, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); });
        } else {
          [-1, 1].forEach(function (s) {
            ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + s * ex, ey, R * 0.1, R * 0.13, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + s * ex + R * 0.035, ey - R * 0.05, R * 0.04, 0, TAU); ctx.fill();
          });
        }
        // blush
        ctx.fillStyle = 'rgba(255,135,175,.55)';
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(x + s * R * 0.62, y + R * 0.2, R * 0.15, R * 0.09, 0, 0, TAU); ctx.fill(); });
        // big dark nose + shine
        ctx.fillStyle = NOSE;
        ctx.beginPath(); ctx.ellipse(x, y + R * 0.12, R * 0.22, R * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ctx.ellipse(x - R * 0.07, y - R * 0.02, R * 0.06, R * 0.1, -0.3, 0, TAU); ctx.fill();
        // open smiling mouth with tongue under the nose
        var my = y + R * 0.5, mw = R * 0.24, mh = R * (0.1 + 0.12 * mouthOpen);
        ctx.fillStyle = '#4A2236';
        ctx.beginPath(); ctx.moveTo(x - mw, my); ctx.quadraticCurveTo(x, my + mh * 2.2, x + mw, my); ctx.quadraticCurveTo(x, my + mh * 0.4, x - mw, my); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF86A8';
        ctx.beginPath(); ctx.ellipse(x, my + mh * 0.95, mw * 0.45, mh * 0.42, 0, 0, TAU); ctx.fill();
      }
      function head(x, y, R, happy, mouthOpen) {
        ear(x - R * 0.95, y - R * 0.55, R * 0.52, -1);
        ear(x + R * 0.95, y - R * 0.55, R * 0.52, 1);
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.ellipse(x, y, R * 1.05, R * 0.95, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.ellipse(x, y + R * 0.3, R * 0.7, R * 0.5, 0, 0, TAU); ctx.fill();
        face(x, y, R, happy, mouthOpen);
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

        var S = Math.min(W * 0.24, H * 0.17);
        var kx = W * 0.5;
        var by0 = H * (W < H ? 0.6 : 0.68);
        var slope = 0.06;
        var landP = isSuper ? 0.18 : 0.2;
        // branch swings in from the left, then bounces when the koala lands
        var inE = easeOutBack(clamp01(p / 0.16));
        var bOff = -(1 - inE) * W * 1.1;
        var tl = (p - landP) * dur;
        var bounce = tl > 0 ? Math.sin(tl * 0.018) * Math.exp(-tl * 0.004) * 14 * unit : 0;
        var sway = Math.sin(t * 0.0025) * 3 * unit + bounce;
        function branchY(x) { return by0 + (x - W / 2) * slope + sway; }
        var rustle = 0.06 + (tl > 0 ? 0.35 * Math.exp(-tl * 0.004) : 0) + (p > 0.3 && p < 0.45 ? 0.12 : 0);

        // koala vertical position: slides down the vine, then sits on the branch
        var dropE = easeOutBack(clamp01(p / landP));
        var restY = branchY(kx) - S * 0.15;
        var ky = lerp(-S * 1.6, restY, dropE);
        var R = S * 0.62;
        var hx = kx, hy = ky - S * 0.98;
        var hugT = easeInOut(clamp01((p - landP) / 0.08));
        var waveT = easeInOut(clamp01((p - (isSuper ? 0.5 : 0.52)) / 0.08));
        var waveSd = isSuper ? -1 : 1;
        var happy = (p > landP + 0.06 && p < (isSuper ? 0.5 : 0.52)) ? 1 : 0;

        // vine (fades away after landing)
        var vineA = 1 - clamp01((p - landP) / 0.1);
        if (vineA > 0) {
          ctx.strokeStyle = hexA('#6FAF6A', vineA); ctx.lineWidth = 6 * unit;
          ctx.beginPath(); ctx.moveTo(kx + 4 * unit, -10);
          var vy = hy - R * 1.4;
          ctx.quadraticCurveTo(kx - 12 * unit, vy * 0.5, kx, vy);
          ctx.stroke();
          for (var vl = 0; vl < 4; vl++) leafShape(kx + (vl % 2 ? 6 : -6) * unit, vy * (0.2 + vl * 0.2), vl % 2 ? -0.5 : Math.PI + 0.5, S * 0.32, S * 0.1, hexA('#7FBF86', vineA));
        }

        ctx.save(); ctx.translate(bOff, 0);
        // leaves behind the branch (upper side)
        var x0 = -W * 0.06, x1 = W * 1.06;
        for (var li = 0; li < leaves.length; li++) {
          var lf = leaves[li]; if (lf.side > 0) continue;
          var lx = lerp(x0, x1, lf.u), ly = branchY(lx);
          leafShape(lx, ly, -lf.ang + Math.sin(t * 0.012 + lf.ph) * rustle, S * lf.len, S * 0.13, lf.col);
        }
        ctx.restore();

        // super: baby koala peeking over mum's shoulder (drawn behind her)
        if (isSuper) {
          var bp = easeOutBack(clamp01((p - 0.26) / 0.12));
          if (bp > 0) {
            var bR = R * 0.55 * bp, bx = kx + S * 0.92, byy = ky - S * 0.5 - bR * 0.75 + Math.sin(t * 0.006) * 2 * unit;
            head(bx, byy, bR, happy, 0.6);
          }
        }
        // body (behind the branch)
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.ellipse(kx, ky, S * 0.62, S * 0.72, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = FUR_L;
        ctx.beginPath(); ctx.ellipse(kx, ky + S * 0.1, S * 0.38, S * 0.5, 0, 0, TAU); ctx.fill();
        // head
        var tilt = Math.sin(t * 0.004) * 0.05 + (waveT > 0 ? (isSuper ? -0.08 : 0.08) * waveT : 0);
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
        head(0, 0, R, happy, waveT);
        ctx.restore();

        // the branch itself (in front of the body)
        ctx.save(); ctx.translate(bOff, 0);
        var thick = S * 0.2;
        ctx.fillStyle = '#7A5236';
        ctx.beginPath();
        ctx.moveTo(x0, branchY(x0) - thick * 0.62);
        ctx.quadraticCurveTo(W * 0.5, branchY(W * 0.5) - thick * 0.6, x1, branchY(x1) - thick * 0.38);
        ctx.lineTo(x1, branchY(x1) + thick * 0.38);
        ctx.quadraticCurveTo(W * 0.5, branchY(W * 0.5) + thick * 0.5, x0, branchY(x0) + thick * 0.62);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,180,.35)'; ctx.lineWidth = thick * 0.16;
        ctx.beginPath(); ctx.moveTo(x0, branchY(x0) - thick * 0.3); ctx.quadraticCurveTo(W * 0.5, branchY(W * 0.5) - thick * 0.32, x1, branchY(x1) - thick * 0.18); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,35,20,.45)'; ctx.lineWidth = 2 * unit;
        for (var kn = 0; kn < 7; kn++) { var kxx = lerp(x0, x1, (kn + 0.5) / 7); ctx.beginPath(); ctx.arc(kxx, branchY(kxx) + thick * 0.1, thick * 0.18, 0.3, 2.6); ctx.stroke(); }
        // leaves in front (lower side)
        for (var lj = 0; lj < leaves.length; lj++) {
          var lf2 = leaves[lj]; if (lf2.side < 0) continue;
          var lx2 = lerp(x0, x1, lf2.u), ly2 = branchY(lx2);
          leafShape(lx2, ly2, lf2.ang + Math.sin(t * 0.012 + lf2.ph) * rustle, S * lf2.len, S * 0.13, lf2.col);
        }
        ctx.restore();

        // legs + feet hugging the branch from below
        var aw = S * 0.26;
        [-1, 1].forEach(function (sd) {
          var fx = kx + sd * S * 0.42, fy = branchY(fx) + S * 0.16;
          if (dropE < 0.98) fy = ky + S * 0.62;
          ctx.fillStyle = FUR; ctx.beginPath(); ctx.ellipse(fx, fy - S * 0.08, S * 0.2, S * 0.16, 0, 0, TAU); ctx.fill();
          paw(fx, fy, Math.PI / 2 + sd * 0.25, S * 0.12, 3, 0.55);
        });
        // arms: holding the vine (up) → hugging the branch → right arm waves
        [-1, 1].forEach(function (sd) {
          var sx = kx + sd * S * 0.48, sy = ky - S * 0.38;
          var upX = kx + sd * S * 0.18, upY = hy - R * 1.25;
          var hugX = kx + sd * S * 0.58, hugY = branchY(hugX) - S * 0.06;
          var px = lerp(upX, hugX, hugT), py = lerp(upY, hugY, hugT);
          var ang = lerp(-Math.PI / 2, Math.PI / 2 + sd * 0.35, hugT);
          var nF = 3, spread = 0.55;
          if (sd === waveSd && waveT > 0) {
            var wv = Math.sin((t - 0.52 * dur) * 0.016) * 0.45 * waveT;
            var wx = kx + sd * S * 1.28, wy = hy - R * 0.05;
            var wpx = wx + sd * Math.sin(wv) * S * 0.3, wpy = wy - Math.cos(wv) * S * 0.05;
            px = lerp(hugX, wpx, waveT); py = lerp(hugY, wpy, waveT);
            ang = lerp(ang, -Math.PI / 2 + sd * (wv * 0.8 + 0.25), waveT);
            nF = 4; spread = lerp(0.55, 0.5, waveT);
          }
          arm(sx, sy, px, py, aw);
          paw(px, py, ang, S * 0.15, nF, spread);
        });
        // super: baby's little paw on mum's shoulder
        if (isSuper && p > 0.3) {
          var bpp = easeOut(clamp01((p - 0.3) / 0.08));
          paw(kx + S * 0.6, ky - S * 0.5, Math.PI + 0.3, S * 0.085 * bpp, 3, 0.6);
        }

        // hearts out of the hug
        var g0 = -60 * unit;
        for (var h = 0; h < hearts.length; h++) {
          var ht = hearts[h], tt = (t - ht.at * dur) / 1000;
          if (tt <= 0) continue;
          var hx2 = kx + ht.sd * S * 0.75 + ht.vx * unit * tt + Math.sin(tt * 5 + ht.ph) * 10 * unit;
          var hy2 = ky - S * 0.2 + ht.vy * unit * tt + 0.5 * g0 * tt * tt;
          var fa = clamp01(tt / 0.1) * clamp01(1.5 - tt * 1.0);
          if (fa <= 0) continue;
          var hr = ht.r * unit * 1.3 * (0.6 + 0.4 * easeOutBack(clamp01(tt / 0.25)));
          ctx.globalAlpha = gFade * fa;
          ctx.fillStyle = ht.col; heartPath(ctx, hx2, hy2, hr); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(hx2 - hr * 0.42, hy2 - hr * 0.38, hr * 0.18, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = gFade;
        // super extras
        for (var fi = 0; fi < falls.length; fi++) {
          var fl = falls[fi], q = (p - fl.at) / fl.sp;
          if (q <= 0 || q > 1.6) continue;
          var flx = fl.x * W + Math.sin(q * 6 + fl.ph) * 30 * unit, fly = -20 * unit + q * H * 0.75;
          ctx.globalAlpha = gFade * clamp01(q * 4) * clamp01((1.6 - q) * 2);
          leafShape(flx, fly, fl.rot + q * 3, S * 0.4, S * 0.12, fl.col);
        }
        for (var si = 0; si < sparks.length; si++) {
          var sp = sparks[si], sq = (p - sp.at) / 0.12;
          if (sq <= 0 || sq >= 1) continue;
          ctx.globalAlpha = gFade * Math.sin(sq * Math.PI);
          ctx.fillStyle = sp.col; sparkPath(ctx, sp.x * W, sp.y * H, 12 * unit * Math.sin(sq * Math.PI) + 3 * unit); ctx.fill();
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
