/* success-bubble-tea.js — מסך הצלחה: בַּבֶּל טִי 🧋
   כוס בבל־טי חמודה עם פרצוף קוואי קופצת למרכז, מתמלאת בגל של תה חלב
   בגוון הסקין, פניני טפיוקה נופלות פנימה וקופצות, מכסה כיפה ננעל במקומו
   וקש מפוספס ננעץ — ואז הפנינים נורות במעלה הקש ופורצות מלמעלה במזרקה של
   פנינים, לבבות וכוכבים. בסופר: כוס שנייה קטנה (טעם אחר) מצטרפת ועושה
   "לחיים", ומזרקה כפולה וגדולה יותר.
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
  function easeOutBounce(x) {
    x = clamp01(x); var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
    if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
    x -= 2.625 / d1; return n1 * x * x + 0.984375;
  }
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

  var PEARL = '#3B2418', INK = '#2A1A22';

  window.SUCCESS.styles.push({
    name: 'bubble-tea',
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
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.7, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // the two drinks: palette-tinted milk tea, and (super) a matcha/strawberry buddy
      function mkPearls(n, t0, t1) {
        var a = [];
        for (var i = 0; i < n; i++) {
          var row = i < Math.ceil(n * 0.55) ? 0 : 1, inRow = row ? n - Math.ceil(n * 0.55) : Math.ceil(n * 0.55);
          var k = row ? i - Math.ceil(n * 0.55) : i;
          a.push({ row: row, u: (k + 0.5) / inRow, at: lerp(t0, t1, Math.random()), dx: rnd(-0.12, 0.12) });
        }
        return a;
      }
      var cups = [{ main: true, tea: mixHex(primary, '#E8BC92', 0.6), straw: primary, pearls: mkPearls(isSuper ? 13 : 11, 0.14, 0.32),
                    inAt: 0, fillAt: 0.08, lidAt: 0.36, strawAt: 0.45 }];
      if (isSuper) cups.push({ main: false, tea: '#A9DB8F', straw: accent, pearls: mkPearls(8, 0.2, 0.34),
                    inAt: 0.1, fillAt: 0.16, lidAt: 0.38, strawAt: 0.43 });
      var clinkAt = 0.52;
      // fountain out of the main straw (analytic ballistic motion)
      var bursts = isSuper ? [0.58, 0.76] : [0.6];
      var parts = [];
      bursts.forEach(function (at, bi) {
        var n = isSuper ? 30 : 26;
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + rnd(-0.9, 0.9), sp = rnd(380, 720) * (isSuper ? 1.08 : 1);
          parts.push({ at: at + rnd(0, 0.05), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: i % 3 === 0 ? 'pearl' : i % 3 === 1 ? 'heart' : 'star',
                       col: [primary, accent, '#FF8FC8', '#FFFFFF', glow][i % 5], r: rnd(12, 20), rot: rnd(0, TAU), spin: rnd(-4, 4) });
        }
      });
      var sparkles = [];
      for (var sk = 0; sk < 10; sk++) sparkles.push({ a: sk / 10 * TAU, d: rnd(0.6, 1) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(accent, 0.55) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.4;
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

      // cup outline (local coords: bottom-centre at 0,0, height h)
      function cupPath(h) {
        var wt = h * 0.33, wb = h * 0.25, r = h * 0.06;
        ctx.beginPath();
        ctx.moveTo(-wt, -h);
        ctx.lineTo(wt, -h);
        ctx.lineTo(wb, -r);
        ctx.quadraticCurveTo(wb - r * 0.1, 0, wb - r, 0);
        ctx.lineTo(-wb + r, 0);
        ctx.quadraticCurveTo(-wb + r * 0.1, 0, -wb, -r);
        ctx.closePath();
      }
      function halfW(h, y) { return lerp(h * 0.25, h * 0.33, clamp01(-y / h)); }   // cup half-width at local y
      function strawGeom(h) { return { x: h * 0.07, top: -h * 1.62, bot: -h * 0.08, w: h * 0.085, ang: 0.13 }; }
      function pearl(x, y, r, lit) {
        if (lit) { ctx.fillStyle = 'rgba(255,225,190,.85)'; ctx.beginPath(); ctx.arc(x, y, r + 2 * unit, 0, TAU); ctx.fill(); }
        ctx.fillStyle = lit ? '#8A5634' : PEARL; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.3, 0, TAU); ctx.fill();
      }
      function drawCup(c, t, p, h, happy) {
        var pin = easeOutBack(clamp01((p - c.inAt) / 0.12));
        if (pin <= 0) return;
        ctx.save(); ctx.scale(pin, pin);
        var lv = 0.86 * easeOut(clamp01((p - c.fillAt) / 0.22));
        var sloshAmp = h * 0.035 * (1 - clamp01((p - c.fillAt - 0.22) / 0.25));
        var sg = strawGeom(h);
        var sIn = clamp01((p - c.strawAt) / 0.08), sOff = (1 - easeOutBack(sIn)) * h * 0.9;
        // straw (behind the tea) — rotated, striped
        if (sIn > 0) {
          ctx.save(); ctx.translate(sg.x, -h); ctx.rotate(sg.ang); ctx.translate(0, -sOff);
          var len = sg.bot - sg.top, y0 = sg.top + h;
          ctx.beginPath(); ctx.rect(-sg.w / 2, y0, sg.w, len); ctx.save(); ctx.clip();
          ctx.fillStyle = c.straw; ctx.fillRect(-sg.w / 2, y0, sg.w, len);
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = sg.w * 0.32;
          for (var st = y0 - sg.w; st < y0 + len + sg.w; st += sg.w * 1.1) { ctx.beginPath(); ctx.moveTo(-sg.w, st); ctx.lineTo(sg.w, st + sg.w * 0.9); ctx.stroke(); }
          ctx.restore();
          ctx.restore();
        }
        // faint glass body
        cupPath(h); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
        // tea + pearls inside the glass
        ctx.save(); cupPath(h); ctx.clip();
        if (lv > 0) {
          var sy = -h * lv;
          ctx.fillStyle = hexA(c.tea, 0.92);
          ctx.beginPath(); ctx.moveTo(-h, 2);
          for (var xx = -h * 0.4; xx <= h * 0.4; xx += h * 0.04) ctx.lineTo(xx, sy + Math.sin(xx / h * 14 + t * 0.012) * sloshAmp);
          ctx.lineTo(h, 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.28)';                    // milky foam line
          ctx.fillRect(-h * 0.4, sy + h * 0.015, h * 0.8, h * 0.05);
        }
        ctx.restore();
        var pr = h * 0.055;
        for (var i = 0; i < c.pearls.length; i++) {
          var pe = c.pearls[i], q = (p - pe.at) / 0.12;
          if (q <= 0) continue;
          var ry = -pr * 1.05 - pe.row * pr * 1.7, hw = halfW(h, ry) - pr * 1.2;
          var rx = lerp(-hw, hw, pe.u) + pe.dx * pr;
          var py = lerp(-h * 1.5, ry, easeOutBounce(q));
          pearl(rx, py, pr);
        }
        // kawaii face — appears once the tea reaches it (dark ink on tea, never on the dark sky)
        var fy = -h * 0.5, fa = clamp01((lv * h - h * 0.62) / (h * 0.08));
        if (fa > 0) {
          ctx.globalAlpha *= fa;
          var ex = h * 0.11, er = h * 0.034;
          if (happy) {
            ctx.strokeStyle = INK; ctx.lineWidth = h * 0.018;
            [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * ex, fy + er * 0.6, er, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); });
          } else {
            [-1, 1].forEach(function (s) {
              ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(s * ex, fy, er, er * 1.25, 0, 0, TAU); ctx.fill();
              ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(s * ex + er * 0.35, fy - er * 0.45, er * 0.38, 0, TAU); ctx.fill();
            });
          }
          ctx.fillStyle = 'rgba(255,120,160,.6)';
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * h * 0.19, fy + h * 0.055, h * 0.045, h * 0.026, 0, 0, TAU); ctx.fill(); });
          var mw = h * 0.055, my = fy + h * 0.05;
          ctx.fillStyle = '#4A2236';
          ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + mw * 1.9, mw, my); ctx.quadraticCurveTo(0, my + mw * 0.35, -mw, my); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FF86A8'; ctx.beginPath(); ctx.ellipse(0, my + mw * 0.85, mw * 0.45, mw * 0.3, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha /= fa;
        }
        // glass rim + shine
        cupPath(h); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(2, h * 0.014); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = h * 0.03;
        ctx.beginPath(); ctx.moveTo(-h * 0.25, -h * 0.85); ctx.lineTo(-h * 0.205, -h * 0.25); ctx.stroke();
        // dome lid snaps on
        var lq = clamp01((p - c.lidAt) / 0.08);
        if (lq > 0) {
          var ly = -h - (1 - easeOutBack(lq)) * h * 0.7, wt = h * 0.35;
          ctx.fillStyle = 'rgba(255,255,255,.2)';
          ctx.beginPath(); ctx.ellipse(0, ly, wt * 0.92, h * 0.22, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(2, h * 0.014); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.beginPath(); ctx.rect(-wt, ly - h * 0.01, wt * 2, h * 0.05); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          ctx.beginPath(); ctx.ellipse(-wt * 0.4, ly - h * 0.12, wt * 0.15, h * 0.03, -0.5, 0, TAU); ctx.fill();
        }
        ctx.restore();
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
        var portrait = W < H;
        var h = isSuper ? Math.min(H * 0.34, W * (portrait ? 0.46 : 0.6)) : Math.min(H * (portrait ? 0.32 : 0.36), W * 0.62);
        var baseY = H * (portrait ? 0.8 : 0.88);
        var mx = W / 2 - (isSuper ? h * 0.4 : 0);
        var happy = p > bursts[0] - 0.04;
        // squash on each burst
        var sq = 0;
        bursts.forEach(function (at) { var q = (p - at) / 0.08; if (q > 0 && q < 1) sq = Math.max(sq, Math.sin(q * Math.PI)); });
        // clink (super): cups tilt toward each other and touch
        var ck = isSuper ? Math.sin(Math.PI * clamp01((p - clinkAt + 0.06) / 0.14)) : 0;
        var sx2 = W / 2 + h * 0.62;
        // small cup
        if (isSuper) {
          var c2 = cups[1], h2 = h * 0.72, slide = easeOut(clamp01((p - c2.inAt) / 0.14));
          ctx.save(); ctx.translate(lerp(W + h, sx2, slide) - ck * h * 0.08, baseY); ctx.rotate(-0.2 * ck);
          drawCup(c2, t, p, h2, happy);
          ctx.restore();
        }
        // main cup
        ctx.save(); ctx.translate(mx + ck * h * 0.04, baseY); ctx.rotate(0.12 * ck); ctx.scale(1 + sq * 0.05, 1 - sq * 0.06);
        drawCup(cups[0], t, p, h, happy);
        ctx.restore();
        // clink sparkle where the rims meet
        if (isSuper && ck > 0.6) {
          var kxp = (mx + h * 0.3 + sx2 - h * 0.25) / 2, kyp = baseY - h * 0.95, ka = (ck - 0.6) / 0.4;
          for (var sp2 = 0; sp2 < sparkles.length; sp2++) {
            var sk2 = sparkles[sp2], d2 = h * 0.28 * sk2.d * (1.2 - ka * 0.4);
            ctx.fillStyle = hexA(sp2 % 2 ? accent : '#FFFFFF', ka);
            sparkPath(ctx, kxp + Math.cos(sk2.a) * d2, kyp + Math.sin(sk2.a) * d2, 10 * unit * ka + 2 * unit); ctx.fill();
          }
        }
        // pearls zooming up the straw, then the fountain from its top
        var sg = strawGeom(h);
        var stx = mx + sg.x + Math.sin(sg.ang) * (-sg.top - h), sty = baseY - h + Math.cos(sg.ang) * (sg.top + h);
        var sbx = mx + sg.x - Math.sin(sg.ang) * (sg.bot + h), sby = baseY - h + Math.cos(sg.ang) * (sg.bot + h);
        bursts.forEach(function (at) {
          for (var z = 0; z < 4; z++) {
            var q = (p - at + 0.1 - z * 0.018) / 0.1;
            if (q <= 0 || q >= 1) continue;
            pearl(lerp(sbx, stx, q), lerp(sby, sty, q), h * 0.034, true);
          }
        });
        var g0 = 900 * unit;
        for (var m = 0; m < parts.length; m++) {
          var pt = parts[m], tt = (t - pt.at * dur) / 1000;
          if (tt <= 0) continue;
          var px = stx + pt.vx * unit * tt, py = sty + pt.vy * unit * tt + 0.5 * g0 * tt * tt;
          if (py > H + 40) continue;
          var fa = clamp01(tt / 0.1) * clamp01(1.6 - tt * 0.8);
          if (fa <= 0) continue;
          var rr = pt.r * unit * 1.25;
          ctx.globalAlpha = gFade * fa;
          if (pt.kind === 'pearl') { pearl(px, py, rr * 0.7, true); continue; }
          ctx.save(); ctx.translate(px, py); ctx.rotate(pt.rot + pt.spin * tt);
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
