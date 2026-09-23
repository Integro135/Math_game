/* success-ladybug-flight.js — מסך הצלחה: פָּרַת מֹשֶׁה רַבֵּנוּ 🐞
   פרת משה רבנו אדומה ומנוקדת מטפסת על עלה ירוק גדול, עוצרת, פותחת את
   כנפי המגן ופורשת כנפיים שקופות — ועפה משם בלולאה ומשאירה שובל לבבות
   קטנים. בסופר: עוד שלוש פרות משה רבנו קטנות מצטרפות לטיסה.
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
    name: 'ladybug-flight',
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
      var praise  = opts.praise || 'עָפָה עַל עַצְמֵךְ!';

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
      var LEAFX = W * 0.5, LEAFY = H * 0.74, LF = Math.min(W, H) * 0.3;
      var B = Math.min(W, H) * 0.075;
      var bugs = [{ s: 1, dx: 0, dy: 0, at: 0 }];
      if (isSuper) bugs.push({ s: 0.55, dx: -1, dy: 0.2, at: 0.08 }, { s: 0.5, dx: 1, dy: 0.1, at: 0.14 }, { s: 0.45, dx: 0.3, dy: 0.4, at: 0.2 });
      var trail = [];
      function path(q, b) {                                   // walk up the leaf, then a loop and away
        if (q < 0.4) { var w = easeInOut(q / 0.4); return [LEAFX - LF * 0.55 + LF * 0.55 * w, LEAFY + LF * 0.08 - LF * 0.25 * w, 0, 0]; }
        var f = (q - 0.4) / 0.6, a = f * TAU * 1.1;
        var cx0 = LEAFX + LF * 0.25 * (1 + b.dx), cy0 = LEAFY - LF * 0.6 - f * H * 0.3 + b.dy * 60 * unit;
        return [cx0 + Math.sin(a) * LF * 0.45 - LF * 0.25 + f * W * 0.25, cy0 + (1 - Math.cos(a)) * LF * 0.18, 1, a];
      }
      function bug(x, y, s, open, flap, ang) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
        if (open > 0) {                                       // clear wings
          ctx.fillStyle = 'rgba(230,240,255,.55)';
          var fw = 0.55 + 0.45 * Math.abs(Math.sin(flap));
          ctx.beginPath(); ctx.ellipse(-B * 0.9 * open, B * 0.2, B * 1.1 * fw, B * 0.5, -0.5, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(B * 0.9 * open, B * 0.2, B * 1.1 * fw, B * 0.5, 0.5, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -B * 0.85, B * 0.5, 0, TAU); ctx.fill();          // head
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-B * 0.2, -B * 1.0, B * 0.12, 0, TAU); ctx.arc(B * 0.2, -B * 1.0, B * 0.12, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = B * 0.08;
        ctx.beginPath(); ctx.moveTo(-B * 0.2, -B * 1.25); ctx.quadraticCurveTo(-B * 0.4, -B * 1.7, -B * 0.6, -B * 1.6); ctx.moveTo(B * 0.2, -B * 1.25); ctx.quadraticCurveTo(B * 0.4, -B * 1.7, B * 0.6, -B * 1.6); ctx.stroke();
        [-1, 1].forEach(function (sd) {                       // the two red shells swing open
          ctx.save(); ctx.translate(0, -B * 0.45); ctx.rotate(sd * open * 0.9);
          ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, B * 0.6, B, -Math.PI / 2, Math.PI / 2, sd < 0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#222';
          [[0.45, 0.25, 0.2], [0.55, 0.85, 0.22], [0.25, 1.2, 0.16]].forEach(function (d) { ctx.beginPath(); ctx.arc(sd * B * d[0], B * d[1], B * d[2], 0, TAU); ctx.fill(); });
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(sd * B * 0.45, B * 0.1, B * 0.2, B * 0.12, 0, 0, TAU); ctx.fill();
          ctx.restore();
        });
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
      var txtAt = dur * 0.4;
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
        var la = easeOutBack(clamp01(p / 0.14));
        // the leaf
        ctx.save(); ctx.translate(LEAFX, LEAFY); ctx.rotate(-0.35); ctx.scale(la, la); ctx.globalAlpha = gFade;
        var lg = ctx.createLinearGradient(-LF, 0, LF, 0);
        lg.addColorStop(0, '#3E9E48'); lg.addColorStop(1, '#7ED66F');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-LF, 0); ctx.quadraticCurveTo(0, -LF * 0.55, LF, 0); ctx.quadraticCurveTo(0, LF * 0.55, -LF, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3 * unit;
        ctx.beginPath(); ctx.moveTo(-LF, 0); ctx.lineTo(LF * 0.9, 0); ctx.stroke();
        for (var v = -3; v <= 3; v++) { if (!v) continue; ctx.beginPath(); ctx.moveTo(v * LF * 0.22, 0); ctx.lineTo(v * LF * 0.22 + LF * 0.14, (v % 2 ? -1 : 1) * LF * 0.2); ctx.stroke(); }
        ctx.restore();
        // the bugs
        for (var bI = 0; bI < bugs.length; bI++) {
          var b = bugs[bI], q = clamp01((p - b.at) / (1 - b.at)); if (p < b.at) continue;
          var pt = path(q, b), open = clamp01((q - 0.36) / 0.08), x = pt[0], y = pt[1];
          if (pt[2] && bI === 0 && (trail.length === 0 || t - trail[trail.length - 1].t > 55)) trail.push({ x: x, y: y + B, t: t });
          ctx.globalAlpha = gFade;
          bug(x, y, b.s, open, t * 0.06, pt[2] ? Math.sin(pt[3]) * 0.4 : -0.35 + Math.PI / 2 * 0);
        }
        for (var k = trail.length - 1; k >= 0; k--) {
          var age = (t - trail[k].t) / 900; if (age > 1) { trail.splice(k, 1); continue; }
          ctx.fillStyle = hexA(k % 2 ? primary : accent, (1 - age) * gFade);
          heartPath(ctx, trail[k].x, trail[k].y, (7 - 3 * age) * unit); ctx.fill();
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
