/* success-rain-cloud.js — מסך הצלחה: עָנָן שָׂמֵחַ 🌦️
   ענן פלומתי עם פרצוף מנומנם מוריד גשם של טיפות נוצצות בצבעי הסקין; בכל
   מקום שטיפה נוחתת צומח פרח קטן. אחר כך השמש מציצה מאחורי הענן, קשת
   נמתחת על פני השמיים והענן מחייך חיוך גדול. בסופר: שדה פרחים שלם ופרפרים.
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
    name: 'rain-cloud',
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
      var praise  = opts.praise || 'הֵבֵאת לָנוּ קֶשֶׁת!';

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
      var cx = W * 0.5, cy = H * 0.36, CS = Math.min(W, H) * 0.12, gy = H * 0.9;
      var drops = [];
      for (var i = 0; i < (isSuper ? 60 : 36); i++) drops.push({ x: cx + rnd(-1.35, 1.35) * CS, at: 0.1 + Math.random() * 0.36, sp: rnd(0.8, 1.2), col: [primary, glow, accent, '#FFFFFF'][i % 4] });
      var blooms = drops.map(function (d, i) { return { x: d.x + rnd(-8, 8) * unit, at: d.at + 0.16 / d.sp, col: ['#FF8FC8', '#FFE66D', '#FFFFFF', '#C77DFF', '#7DC4FF'][i % 5], s: rnd(0.8, 1.2) }; });
      var RB = ['#FF7EB3', '#FFB86B', '#FFE66D', '#8EE59B', '#7DC4FF', '#C77DFF'];
      var bfl = [];
      if (isSuper) for (var b = 0; b < 3; b++) bfl.push({ x0: W * (0.2 + b * 0.3), ph: b * 2, col: [primary, accent, glow][b] });
      function cloud(x, y, smile) {
        var puffs = [[-1.1, 0.2, 0.6], [-0.5, -0.25, 0.75], [0.2, -0.4, 0.85], [0.9, -0.05, 0.7], [1.3, 0.3, 0.5], [0, 0.3, 0.8]];
        ctx.fillStyle = mixHex(glow, '#FFFFFF', 0.75);
        puffs.forEach(function (q) { ctx.beginPath(); ctx.arc(x + q[0] * CS, y + q[1] * CS + 5 * unit, q[2] * CS, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#FFFFFF';
        puffs.forEach(function (q) { ctx.beginPath(); ctx.arc(x + q[0] * CS, y + q[1] * CS, q[2] * CS * 0.95, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#3A2A4A'; ctx.strokeStyle = '#3A2A4A'; ctx.lineWidth = 3.2 * unit;
        if (smile < 0.5) { [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(x + s * CS * 0.35, y + CS * 0.05, CS * 0.1, 0.2, Math.PI - 0.2); ctx.stroke(); }); }
        else { [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(x + s * CS * 0.35, y + CS * 0.02, CS * 0.08, CS * 0.11, 0, 0, TAU); ctx.fill(); }); }
        ctx.beginPath(); ctx.arc(x, y + CS * 0.18, CS * (0.12 + 0.14 * smile), 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,130,170,.45)'; [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(x + s * CS * 0.62, y + CS * 0.2, CS * 0.13, CS * 0.08, 0, 0, TAU); ctx.fill(); });
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
      var txtAt = dur * 0.55;
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
        var inA = easeOutBack(clamp01(p / 0.12)), smile = clamp01((p - 0.55) / 0.1);
        var sun = clamp01((p - 0.5) / 0.14), rbA = clamp01((p - 0.56) / 0.2);
        // sun peeking out behind the cloud
        if (sun > 0) {
          var sx = cx + CS * 1.2, sy = cy - CS * 0.6 - sun * CS * 0.3;
          var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, CS * 1.4); sg.addColorStop(0, hexA('#FFE9A0', 0.6 * sun)); sg.addColorStop(1, 'rgba(255,233,160,0)');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, CS * 1.4, 0, TAU); ctx.fill();
          ctx.fillStyle = hexA('#FFD54F', sun); ctx.beginPath(); ctx.arc(sx, sy, CS * 0.5, 0, TAU); ctx.fill();
          for (var r = 0; r < 10; r++) { var a = r / 10 * TAU + t * 0.001; ctx.strokeStyle = hexA('#FFD54F', 0.7 * sun); ctx.lineWidth = 4 * unit; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * CS * 0.62, sy + Math.sin(a) * CS * 0.62); ctx.lineTo(sx + Math.cos(a) * CS * 0.85, sy + Math.sin(a) * CS * 0.85); ctx.stroke(); }
        }
        // the rainbow
        if (rbA > 0) for (var b = 0; b < 6; b++) {
          ctx.strokeStyle = hexA(RB[b], 0.75); ctx.lineWidth = 11 * unit;
          ctx.beginPath(); ctx.arc(cx, gy, Math.min(W * 0.46, H * 0.62) - b * 11 * unit, Math.PI, Math.PI + Math.PI * easeOut(rbA)); ctx.stroke();
        }
        // the drops
        for (var i = 0; i < drops.length; i++) {
          var d = drops[i], q = clamp01((p - d.at) * d.sp / 0.16); if (q <= 0 || q >= 1) continue;
          var y = cy + CS * 0.6 + q * (gy - cy - CS * 0.6);
          ctx.fillStyle = hexA(d.col, 0.95);
          ctx.beginPath(); ctx.moveTo(d.x, y - 9 * unit); ctx.quadraticCurveTo(d.x + 5 * unit, y, d.x, y + 3 * unit); ctx.quadraticCurveTo(d.x - 5 * unit, y, d.x, y - 9 * unit); ctx.fill();
        }
        // flowers sprout where drops land
        for (var i = 0; i < blooms.length; i++) {
          var f = blooms[i], g = easeOutBack(clamp01((p - f.at) / 0.1)); if (g <= 0) continue;
          var fs = 15 * unit * f.s * g, fy = gy - fs * 2.2;
          ctx.strokeStyle = '#5FB85A'; ctx.lineWidth = 2.5 * unit; ctx.beginPath(); ctx.moveTo(f.x, gy); ctx.lineTo(f.x, fy); ctx.stroke();
          ctx.fillStyle = f.col; for (var k = 0; k < 5; k++) { var a = k / 5 * TAU; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * fs * 0.8, fy + Math.sin(a) * fs * 0.8, fs * 0.55, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(f.x, fy, fs * 0.45, 0, TAU); ctx.fill();
        }
        ctx.save(); ctx.translate(cx, cy); ctx.scale(inA, inA); ctx.translate(-cx, -cy);
        cloud(cx + Math.sin(t * 0.002) * 6 * unit, cy, smile);
        ctx.restore();
        for (var bI = 0; bI < bfl.length; bI++) {
          var bb = bfl[bI], ba = clamp01((p - 0.62) / 0.1); if (ba <= 0) continue;
          var bx = bb.x0 + Math.sin(t * 0.002 + bb.ph) * 50 * unit, by = gy - H * 0.14 + Math.cos(t * 0.003 + bb.ph) * 30 * unit, w = Math.abs(Math.cos(t * 0.02 + bI)), s = 12 * unit;
          ctx.fillStyle = hexA(bb.col, ba);
          ctx.beginPath(); ctx.ellipse(bx - s * 0.6 * w, by, s * w, s * 0.8, 0, 0, TAU); ctx.ellipse(bx + s * 0.6 * w, by, s * w, s * 0.8, 0, 0, TAU); ctx.fill();
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
