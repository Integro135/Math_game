/* success-paper-cranes.js — מסך הצלחה: עֲגוּרֵי נְיָר 🕊️
   להקת עגורי אוריגמי בצבעי הסקין "נפתחת" מקיפולים קטנים באמצע המסך, ואז
   העגורים מנפנפים בכנפיים ועפים למעלה והחוצה בקשתות רכות, משאירים שובל
   נצנוצים. בסופר: להקה כפולה ומעגל נוצץ שמתרחב מנקודת ההמראה.
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
    name: 'paper-cranes',
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
      var praise  = opts.praise || 'כְּמוֹ עֲגוּר — עָפָה גָּבוֹהַּ!';

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
      var cx0 = W / 2, cy0 = H * 0.62;
      var NC = isSuper ? 11 : 6;
      var cols = [primary, accent, glow, mixHex(primary, '#FFFFFF', 0.45), mixHex(accent, '#FF9AC9', 0.5), mixHex(glow, '#FFFFFF', 0.35)];
      var cranes = [];
      for (var i = 0; i < NC; i++) {
        var ang = -Math.PI / 2 + (i - (NC - 1) / 2) * (isSuper ? 0.26 : 0.38);
        cranes.push({ ang: ang, dist: rnd(0.45, 0.7) * Math.max(W, H) * 0.55, delay: i * (isSuper ? 0.03 : 0.045),
                      s: rnd(50, 66) * unit * (isSuper ? 1.05 : 1), col: cols[i % cols.length], ph: Math.random() * TAU,
                      bend: rnd(-0.5, 0.5), trail: [] });
      }
      function drawCrane(x, y, s, flap, col, head, a) {
        ctx.save(); ctx.translate(x, y); ctx.scale(head, 1);
        var dark = mixHex(col, '#000000', 0.28), light = mixHex(col, '#FFFFFF', 0.3);
        ctx.fillStyle = hexA(dark, a);                      // far wing
        ctx.beginPath(); ctx.moveTo(-0.35 * s, 0); ctx.lineTo(0.45 * s, 0); ctx.lineTo(0.2 * s, -1.25 * s * flap); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(col, a);                       // body: tail → neck
        ctx.beginPath(); ctx.moveTo(-1.35 * s, -0.35 * s); ctx.lineTo(-0.25 * s, 0.28 * s); ctx.lineTo(1.3 * s, -0.6 * s); ctx.lineTo(0.2 * s, 0.05 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(dark, a);                      // head fold
        ctx.beginPath(); ctx.moveTo(1.3 * s, -0.6 * s); ctx.lineTo(1.55 * s, -0.45 * s); ctx.lineTo(1.18 * s, -0.46 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hexA(light, a);                     // near wing
        ctx.beginPath(); ctx.moveTo(-0.45 * s, 0.05 * s); ctx.lineTo(0.5 * s, 0.05 * s); ctx.lineTo(-0.05 * s, -1.5 * s * flap); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.35 * a); ctx.lineWidth = 1.2 * unit;
        ctx.beginPath(); ctx.moveTo(-0.45 * s, 0.05 * s); ctx.lineTo(-0.05 * s, -1.5 * s * flap); ctx.stroke();
        ctx.restore();
      }

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
        var lg = clamp01(p / 0.12) * (1 - clamp01((p - 0.3) / 0.3));
        if (lg > 0) {
          var lgg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, 170 * unit);
          lgg.addColorStop(0, hexA(accent, 0.45 * lg * gFade)); lgg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = lgg; ctx.beginPath(); ctx.arc(cx0, cy0, 170 * unit, 0, TAU); ctx.fill();
        }
        if (isSuper) {
          var rp = clamp01((t - dur * 0.1) / (dur * 0.35));
          if (rp > 0 && rp < 1) {
            ctx.strokeStyle = hexA(accent, 0.6 * (1 - rp) * gFade); ctx.lineWidth = 4 * unit * (1 - rp) + 1;
            ctx.beginPath(); ctx.arc(cx0, cy0, rp * Math.min(W, H) * 0.55, 0, TAU); ctx.stroke();
          }
        }
        for (var i = 0; i < cranes.length; i++) {
          var c = cranes[i];
          var u = clamp01((p - c.delay) / 0.2);                 // unfold
          var f = clamp01((p - c.delay - 0.12) / 0.8);          // flight
          var ef = easeInOut(f);
          var x = cx0 + Math.cos(c.ang) * c.dist * ef + Math.sin(ef * Math.PI) * c.bend * 120 * unit;
          var y = cy0 + Math.sin(c.ang) * c.dist * ef;
          var head = Math.cos(c.ang) >= 0 ? 1 : -1;
          var flap = f > 0 ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.02 + c.ph)) : 0.15 + 0.85 * easeOutBack(u);
          var sc = c.s * (0.3 + 0.7 * easeOutBack(u)) * (1 - 0.35 * ef);
          if (f > 0 && (c.trail.length === 0 || t - c.trail[c.trail.length - 1].t > 40)) c.trail.push({ x: x, y: y + 4 * unit, t: t });
          for (var k = c.trail.length - 1; k >= 0; k--) {
            var age = (t - c.trail[k].t) / 700;
            if (age > 1) { c.trail.splice(k, 1); continue; }
            ctx.fillStyle = hexA(k % 2 ? accent : '#FFFFFF', 0.7 * (1 - age) * gFade);
            sparkPath(ctx, c.trail[k].x, c.trail[k].y + age * 18 * unit, (3 - 2 * age) * unit * 1.5); ctx.fill();
          }
          if (u > 0) drawCrane(x, y, sc, flap, c.col, head, gFade * Math.min(1, u * 2));
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
