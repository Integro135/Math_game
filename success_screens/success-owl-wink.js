/* success-owl-wink.js — מסך הצלחה: יַנְשׁוּף קוֹרֵץ 🦉
   ינשוף פלומתי וחמוד קופץ על ענף מול ירח מלא, מסתכל ימינה ושמאלה בעיניים
   גדולות וזוהרות, ואז קורץ לך ומנפנף בכנפיים; נוצות קטנות מרחפות מטה.
   בסופר: הוא ממריא בקפיצה קטנה עם הילת כוכבים, ושוב קורץ.
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
    name: 'owl-wink',
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
      var praise  = opts.praise || 'חֲכָמָה כְּמוֹ יַנְשׁוּף!';

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
      var ox = W / 2, oy = H * 0.6, O = Math.min(W, H) * (isSuper ? 0.13 : 0.12);
      var plum = mixHex(primary, '#8A6A5A', 0.45), plumL = mixHex(plum, '#FFFFFF', 0.35), plumD = mixHex(plum, '#000000', 0.25);
      var feathers = [];
      for (var i = 0; i < 9; i++) feathers.push({ x: ox + rnd(-2, 2) * O, born: rnd(0.35, 0.7), rot: Math.random() * TAU, s: rnd(6, 10) * unit, ph: Math.random() * TAU });
      var ring = [];
      if (isSuper) for (var i = 0; i < 12; i++) ring.push({ a: i / 12 * TAU });
      function winkAt(pp) {                                  // 0 open … 1 shut (right eye only)
        var w = 0;
        [0.5].concat(isSuper ? [0.8] : []).forEach(function (at) { var q = (pp - at) / 0.08; if (q > 0 && q < 1) w = Math.sin(q * Math.PI); });
        return w;
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
      var txtAt = dur * 0.34;
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
        // moon behind
        var mA = clamp01(p / 0.15) * gFade;
        var mg = ctx.createRadialGradient(ox + O * 1.4, oy - O * 1.4, O * 0.2, ox + O * 1.4, oy - O * 1.4, O * 2.6);
        mg.addColorStop(0, hexA('#FFF6D8', 0.95 * mA)); mg.addColorStop(0.45, hexA('#FFF1C0', 0.8 * mA)); mg.addColorStop(0.5, hexA(accent, 0.2 * mA)); mg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(ox + O * 1.4, oy - O * 1.4, O * 2.6, 0, TAU); ctx.fill();
        // branch
        ctx.strokeStyle = hexA('#6B4A3A', gFade); ctx.lineWidth = O * 0.22;
        ctx.beginPath(); ctx.moveTo(ox - W * 0.35, oy + O * 1.05); ctx.quadraticCurveTo(ox, oy + O * 0.9, ox + W * 0.35, oy + O * 1.15); ctx.stroke();
        ctx.fillStyle = hexA('#6CC463', 0.9 * gFade);
        [[-1.6, 0.95], [1.9, 1.1], [-2.3, 1.0]].forEach(function (l) { ctx.beginPath(); ctx.ellipse(ox + O * l[0], oy + O * l[1] - O * 0.15, O * 0.28, O * 0.12, 0.5, 0, TAU); ctx.fill(); });
        var pop = easeOutBack(clamp01((p - 0.04) / 0.16));
        var hop = isSuper ? Math.sin(clamp01((p - 0.6) / 0.16) * Math.PI) * O * 1.1 : 0;
        var y = oy - hop;
        // super: a halo of stars during the hop
        if (hop > 0) for (var i = 0; i < ring.length; i++) {
          var a = ring[i].a + t * 0.002; ctx.fillStyle = hexA(i % 2 ? accent : '#FFFFFF', 0.9 * gFade * (hop / (O * 1.1)));
          starPath(ctx, ox + Math.cos(a) * O * 1.6, y + Math.sin(a) * O * 1.5, 8 * unit, 3.5 * unit, a); ctx.fill();
        }
        ctx.save(); ctx.translate(ox, y); ctx.scale(pop, pop); ctx.globalAlpha = gFade;
        var flap = clamp01((p - 0.55) / 0.3) > 0 && p < 0.85 ? Math.abs(Math.sin(t * 0.02)) : 0;
        // wings
        ctx.fillStyle = plumD;
        ctx.save(); ctx.translate(-O * 0.8, O * 0.1); ctx.rotate(0.25 + flap * 0.7); ctx.beginPath(); ctx.ellipse(0, O * 0.35, O * 0.32, O * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(O * 0.8, O * 0.1); ctx.rotate(-0.25 - flap * 0.7); ctx.beginPath(); ctx.ellipse(0, O * 0.35, O * 0.32, O * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore();
        // body
        ctx.fillStyle = plum; ctx.beginPath(); ctx.ellipse(0, O * 0.2, O * 0.92, O * 1.0, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = plumL; ctx.beginPath(); ctx.ellipse(0, O * 0.45, O * 0.58, O * 0.62, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(plumD, 0.55); ctx.lineWidth = 2 * unit;
        for (var r = 0; r < 3; r++) for (var c = -1; c <= 1; c++) { ctx.beginPath(); ctx.arc(c * O * 0.25, O * (0.25 + r * 0.22), O * 0.1, 0.3, Math.PI - 0.3); ctx.stroke(); }
        // ear tufts
        ctx.fillStyle = plum;
        ctx.beginPath(); ctx.moveTo(-O * 0.75, -O * 0.55); ctx.lineTo(-O * 0.7, -O * 1.15); ctx.lineTo(-O * 0.35, -O * 0.72); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(O * 0.75, -O * 0.55); ctx.lineTo(O * 0.7, -O * 1.15); ctx.lineTo(O * 0.35, -O * 0.72); ctx.closePath(); ctx.fill();
        // eyes: look left, right, then centre; the right eye winks
        var look = p < 0.2 ? 0 : p < 0.32 ? -1 : p < 0.44 ? 1 : 0;
        var lx = look * O * 0.08, wk = winkAt(p);
        [[-1, 0], [1, wk]].forEach(function (e) {
          var ex = e[0] * O * 0.36, ey = -O * 0.35;
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex, ey, O * 0.3, 0, TAU); ctx.fill();
          ctx.strokeStyle = plumD; ctx.lineWidth = 3 * unit; ctx.stroke();
          if (e[1] > 0.5) {                                   // winking: a happy closed curve
            ctx.strokeStyle = '#2A1A3A'; ctx.lineWidth = 4 * unit; ctx.beginPath(); ctx.arc(ex, ey + O * 0.05, O * 0.17, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
          } else {
            var ig = ctx.createRadialGradient(ex + lx, ey, 0, ex + lx, ey, O * 0.2);
            ig.addColorStop(0, mixHex(accent, '#FFFFFF', 0.3)); ig.addColorStop(1, accent);
            ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + lx, ey, O * 0.2 * (1 - e[1]), 0, TAU); ctx.fill();
            ctx.fillStyle = '#2A1A3A'; ctx.beginPath(); ctx.arc(ex + lx, ey, O * 0.1 * (1 - e[1]), 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex + lx + O * 0.05, ey - O * 0.06, O * 0.04, 0, TAU); ctx.fill();
          }
        });
        // beak + blush + feet
        ctx.fillStyle = '#FFB43C';
        ctx.beginPath(); ctx.moveTo(-O * 0.1, -O * 0.12); ctx.lineTo(O * 0.1, -O * 0.12); ctx.lineTo(0, O * 0.08); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,170,.4)';
        ctx.beginPath(); ctx.ellipse(-O * 0.62, -O * 0.1, O * 0.1, O * 0.06, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(O * 0.62, -O * 0.1, O * 0.1, O * 0.06, 0, 0, TAU); ctx.fill();
        if (hop < 1) { ctx.fillStyle = '#FFB43C'; [-0.3, 0.3].forEach(function (fx) { ctx.beginPath(); ctx.ellipse(fx * O, O * 1.12, O * 0.14, O * 0.07, 0, 0, TAU); ctx.fill(); }); }
        ctx.globalAlpha = 1;
        ctx.restore();
        // floating feathers
        for (var i = 0; i < feathers.length; i++) {
          var f = feathers[i], fp = clamp01((p - f.born) / 0.55); if (fp <= 0) continue;
          ctx.save(); ctx.translate(f.x + Math.sin(t * 0.004 + f.ph) * 20 * unit, oy - O * 0.4 + fp * H * 0.3); ctx.rotate(f.rot + Math.sin(t * 0.004 + f.ph) * 0.6);
          ctx.fillStyle = hexA(plumL, (1 - fp) * gFade); ctx.beginPath(); ctx.ellipse(0, 0, f.s * 0.45, f.s * 1.3, 0, 0, TAU); ctx.fill();
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
