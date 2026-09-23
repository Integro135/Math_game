/* success-baby-dragon.js — מסך הצלחה: דְּרָקוֹן קָטָן 🐉
   דרקון תינוק עגלגל וחמוד מרחף במרכז, מנפנף בכנפיים קטנות, לוקח נשימה
   גדולה (מתנפח) ונושף ענן של "אש" קסומה — כוכבים, לבבות וניצוצות בכל צבעי
   הקשת. בסופר: הוא נושף פעמיים ועושה סלטה קטנה באוויר.
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
    name: 'baby-dragon',
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
      var praise  = opts.praise || 'אַתְּ חֲזָקָה כְּמוֹ דְּרָקוֹן!';

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
      var dx0 = W * 0.3, dy0 = H * 0.6, D = Math.min(W, H) * (isSuper ? 0.16 : 0.145);
      var body = mixHex(primary, '#8EE59B', 0.45), belly = mixHex(accent, '#FFFFFF', 0.4), wingC = mixHex(body, '#FFFFFF', 0.25);
      var RAINBOW = ['#FF7EB3', '#FFB86B', '#FFE66D', '#8EE59B', '#7DC4FF', '#C77DFF'];
      var puffs = isSuper ? [0.3, 0.62] : [0.36];
      var sparks = [];
      puffs.forEach(function (at) {
        for (var i = 0; i < 44; i++) sparks.push({ at: at + i * 0.003, a: rnd(-0.34, 0.34), sp: rnd(0.45, 1), s: rnd(9, 18) * unit,
                                                    col: RAINBOW[i % 6], kind: i % 5 === 0 ? 'heart' : i % 2 ? 'star' : 'dot', rot: Math.random() * TAU });
      });
      function breath(pp) { var b = 0; puffs.forEach(function (at) { b = Math.max(b, Math.sin(clamp01((pp - at + 0.1) / 0.1) * Math.PI / 2) * (pp < at ? 1 : 0)); }); return b; }
      function blowing(pp) { var b = 0; puffs.forEach(function (at) { if (pp >= at && pp < at + 0.14) b = 1; }); return b; }

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
      var txtAt = dur * 0.46;
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
        var inA = easeOutBack(clamp01(p / 0.18));
        var bob = Math.sin(t * 0.004) * 10 * unit;
        var loopA = isSuper ? clamp01((p - 0.44) / 0.14) : 0;
        var br = breath(p), bl = blowing(p);
        var x = dx0, y = dy0 + bob;
        ctx.save();
        ctx.translate(x, y); ctx.scale(inA * (1 + 0.08 * br), inA * (1 + 0.08 * br));
        if (loopA > 0 && loopA < 1) ctx.rotate(-easeInOut(loopA) * TAU);
        ctx.globalAlpha = gFade;
        // tail
        ctx.strokeStyle = body; ctx.lineWidth = D * 0.28;
        ctx.beginPath(); ctx.moveTo(-D * 0.6, D * 0.4); ctx.quadraticCurveTo(-D * 1.3, D * 0.7, -D * 1.35, D * 0.05 + Math.sin(t * 0.006) * D * 0.1); ctx.stroke();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-D * 1.35, -D * 0.2); ctx.lineTo(-D * 1.6, D * 0.08); ctx.lineTo(-D * 1.2, D * 0.12); ctx.closePath(); ctx.fill();
        // wings (flapping)
        var fl = Math.sin(t * 0.022) * 0.5;
        [[-1, 0.8], [1, 1]].forEach(function (w) {
          ctx.save(); ctx.translate(-D * 0.1, -D * 0.45); ctx.rotate(-0.4 * w[0] + fl * w[0] - 0.2);
          ctx.fillStyle = w[0] < 0 ? mixHex(wingC, '#000000', 0.15) : wingC;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-D * 0.4, -D * 1.0 * w[1], -D * 0.9 * w[1], -D * 0.75 * w[1]);
          ctx.quadraticCurveTo(-D * 0.6, -D * 0.35, -D * 0.2, D * 0.05); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        // body + belly
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, D * 0.2, D * 0.78, D * 0.68, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(D * 0.12, D * 0.32, D * 0.45, D * 0.44, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(mixHex(belly, '#000000', 0.2), 0.5); ctx.lineWidth = 2 * unit;
        for (var s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(D * 0.12, D * (0.12 + s * 0.2), D * 0.3, 0.5, Math.PI - 0.5); ctx.stroke(); }
        // feet
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(-D * 0.3, D * 0.85, D * 0.18, D * 0.12, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(D * 0.35, D * 0.85, D * 0.18, D * 0.12, 0, 0, TAU); ctx.fill();
        // head
        var hx = D * 0.62, hy = -D * 0.45;
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(hx, hy, D * 0.55, D * 0.48, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + D * 0.42, hy + D * 0.12, D * 0.32, D * 0.25, 0, 0, TAU); ctx.fill();   // snout
        ctx.fillStyle = accent;                                // horns
        ctx.beginPath(); ctx.moveTo(hx - D * 0.25, hy - D * 0.35); ctx.lineTo(hx - D * 0.35, hy - D * 0.72); ctx.lineTo(hx - D * 0.08, hy - D * 0.42); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + D * 0.05, hy - D * 0.42); ctx.lineTo(hx + D * 0.02, hy - D * 0.8); ctx.lineTo(hx + D * 0.22, hy - D * 0.4); ctx.closePath(); ctx.fill();
        // eye: shut tight while blowing, happy otherwise
        ctx.fillStyle = '#2A1A3A';
        if (bl) { ctx.strokeStyle = '#2A1A3A'; ctx.lineWidth = 3 * unit; ctx.beginPath(); ctx.arc(hx + D * 0.05, hy - D * 0.05, D * 0.12, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); }
        else {
          ctx.beginPath(); ctx.ellipse(hx + D * 0.05, hy - D * 0.06, D * 0.12, D * 0.15, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(hx + D * 0.09, hy - D * 0.12, D * 0.05, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,120,170,.45)'; ctx.beginPath(); ctx.ellipse(hx + D * 0.28, hy + D * 0.18, D * 0.1, D * 0.06, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2A1A3A'; ctx.beginPath(); ctx.arc(hx + D * 0.66, hy + D * 0.06, D * 0.04, 0, TAU); ctx.fill();   // nostril
        if (bl) { ctx.fillStyle = '#6B2A4A'; ctx.beginPath(); ctx.ellipse(hx + D * 0.7, hy + D * 0.24, D * 0.1, D * 0.08, 0, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.restore();
        // the magic "fire": a cone of stars, hearts and sparks from the snout
        var mx = x + (D * 0.62 + D * 0.74) * inA, my = y + (-D * 0.45 + D * 0.22) * inA;
        for (var i = 0; i < sparks.length; i++) {
          var s = sparks[i], sp = clamp01((p - s.at) / 0.38); if (sp <= 0 || sp >= 1) continue;
          var d = easeOut(sp) * W * 0.52 * s.sp;
          var px = mx + Math.cos(s.a) * d, py = my + Math.sin(s.a) * d - sp * 30 * unit;
          var a = (1 - sp * sp) * gFade, r = s.s * (0.7 + 0.6 * sp);
          ctx.fillStyle = hexA(s.col, a);
          if (s.kind === 'heart') { heartPath(ctx, px, py, r * 0.8); ctx.fill(); }
          else if (s.kind === 'star') { starPath(ctx, px, py, r, r * 0.45, s.rot + sp * 3); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(px, py, r * 0.5, 0, TAU); ctx.fill(); }
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
