/* success-mermaid-wave.js — מסך הצלחה: בַּת-יָם בַּגַּלִּים 🧜‍♀️
   בת-ים קטנה וחמודה (פנים אל הצופה: שתי עיניים, שיער ורוד ארוך, סיכת כוכב-ים)
   מזנקת מתוך גלים זוהרים בקשת גבוהה, הידיים מושטות קדימה כמו צוללנית, מנפנפת
   בזנבה המנצנץ בשיא הקפיצה ומתיזה טיפות — וכל טיפה הופכת לנצנץ. היא צוללת
   חזרה במרכז, עולה מתוך המים ומנופפת לשלום בכף יד פתוחה.
   בסופר: עוד זינוק בחזרה לכיוון השני, צדפה גדולה עולה מן הים ונפתחת ובתוכה
   פנינה זוהרת עם קרני אור, וטבעת נצנצי ים מסתובבת סביב שתיהן.
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
  function starPath(ctx, x, y, r, rot, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.45) : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  var SKIN = '#FFD9C4', SKIN_D = '#F2B8A0', SKIN_L = '#C98A74';
  var HAIR = '#FF6F96', HAIR_L = '#FFA6C0', HAIR_D = '#D9467A';

  window.SUCCESS.styles.push({
    name: 'mermaid-wave',
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
      var TAIL_A = '#2FD6B8', TAIL_B = mixHex('#3E8CFF', primary, 0.45), TOP = mixHex('#B57CFF', primary, 0.5);

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

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { leaps: [[0.03, 0.27, 1], [0.3, 0.54, -1]], surf: [0.58, 0.68], text: 0.3, shell: [0.48, 0.6], open: [0.6, 0.7], ring: 0.64 }
        : { leaps: [[0.05, 0.45, 1]], surf: [0.54, 0.68], text: 0.4, shell: null, open: null, ring: null };
      function ms(f) { return f * dur; }

      // splash events: droplets fly, then turn into twinkling sparkles
      var splashes = [];
      function addSplash(kind, at, li, n, power) {
        var drops = [];
        for (var i = 0; i < n; i++)
          drops.push({ a: -Math.PI / 2 + (kind === 'fin' ? (i / n - 0.5) * 3.4 + rnd(-0.15, 0.15) : rnd(-1.0, 1.0)), v: rnd(0.6, 1.25) * power,
                       r: rnd(0.6, 1.2), ph: rnd(0, TAU), c: i % 3 === 0 ? accent : i % 3 === 1 ? '#FFFFFF' : glow,
                       turn: kind === 'fin' ? rnd(240, 360) : rnd(380, 560) });
        splashes.push({ kind: kind, at: at, li: li, drops: drops, x: 0, y: 0 });
      }
      T.leaps.forEach(function (L, li) {
        addSplash('out', ms(L[0]), li, 12, 1);
        addSplash('fin', lerp(ms(L[0]), ms(L[1]), 0.56), li, isSuper ? 16 : 18, 1.0);
        addSplash('in', ms(L[1]), li, 16, 1.15);
      });
      addSplash('surf', ms(T.surf[0]) + 120, -1, 14, 0.8);
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      var bubbles = [];
      for (var bb = 0; bb < 16; bb++) bubbles.push({ x: Math.random(), ph: rnd(0, 1), sp: rnd(0.25, 0.55), r: rnd(0.6, 1.4) });
      var ring = [];
      for (var ri = 0; ri < 30; ri++) ring.push({ a: ri / 30 * TAU, ph: rnd(0, TAU), k: ri });

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
      var txtAt = ms(T.text);
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

      // ─── mermaid (faces the viewer; units = s; origin = waist; head toward -y) ───
      var TL = 1.05;
      function tailX(y, bend, flick) { return bend * y * y * 0.55 + flick * y * y * y * 0.6; }
      function tailHW(y) { return 0.2 * (1 - 0.75 * y / TL) + 0.05 * Math.sin(Math.PI * Math.min(1, y / 0.45)); }
      function tailPath(bend, flick) {
        ctx.beginPath();
        var N = 16, i, y;
        for (i = 0; i <= N; i++) { y = i / N * TL; var x = tailX(y, bend, flick) - tailHW(y); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y - 0.02); }
        for (i = N; i >= 0; i--) { y = i / N * TL; ctx.lineTo(tailX(y, bend, flick) + tailHW(y), i ? y : y - 0.02); }
        ctx.closePath();
      }
      function finAt(bend, flick) {
        var y = TL, x = tailX(y, bend, flick), dy = 0.01, dx = tailX(y, bend, flick) - tailX(y - dy, bend, flick);
        return { x: x, y: y, ang: Math.atan2(dy, dx) };
      }
      function drawTail(bend, flick, t) {
        var g = ctx.createLinearGradient(0, 0, 0, TL);
        g.addColorStop(0, TAIL_A); g.addColorStop(0.65, mixHex(TAIL_A, TAIL_B, 0.7)); g.addColorStop(1, TAIL_B);
        // fin first (behind the tail tip)
        var F = finAt(bend, flick);
        ctx.save(); ctx.translate(F.x, F.y); ctx.rotate(F.ang - Math.PI / 2);
        for (var side = -1; side <= 1; side += 2) {
          var fg = ctx.createLinearGradient(0, 0, 0, 0.4);
          fg.addColorStop(0, hexA(TAIL_B, 0.95)); fg.addColorStop(1, hexA(mixHex(TAIL_B, '#FFFFFF', 0.55), 0.75));
          ctx.fillStyle = fg; ctx.strokeStyle = hexA('#1C3E7A', 0.6); ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(0, -0.02);
          ctx.bezierCurveTo(side * 0.12, 0.05, side * 0.36, 0.14, side * 0.34, 0.36);
          ctx.quadraticCurveTo(side * 0.2, 0.24, side * 0.03, 0.16);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.014;
          for (var fl = 1; fl <= 3; fl++) {
            ctx.beginPath(); ctx.moveTo(side * 0.02, 0.02);
            ctx.quadraticCurveTo(side * (0.08 + fl * 0.04), 0.12, side * (0.12 + fl * 0.07), 0.2 + fl * 0.035); ctx.stroke();
          }
        }
        ctx.restore();
        ctx.strokeStyle = '#1C6B70'; ctx.lineWidth = 0.04; tailPath(bend, flick); ctx.stroke();
        ctx.fillStyle = g; tailPath(bend, flick); ctx.fill();
        ctx.save(); tailPath(bend, flick); ctx.clip();
        // scales: rows of little arcs following the centre line
        ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 0.014;
        for (var ry = 0.12, row = 0; ry < TL; ry += 0.075, row++) {
          var cx = tailX(ry, bend, flick), hw = tailHW(ry);
          for (var cxo = -hw + (row % 2) * 0.045; cxo < hw; cxo += 0.09) {
            ctx.beginPath(); ctx.arc(cx + cxo, ry, 0.045, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          }
        }
        // travelling shimmer band
        var sy = ((t * 0.0011) % 1.6) - 0.3;
        var sg = ctx.createLinearGradient(0, sy - 0.18, 0, sy + 0.18);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(-1, sy - 0.18, 2, 0.36);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath(); ctx.ellipse(-0.08 + tailX(0.35, bend, flick), 0.35, 0.04, 0.22, 0, 0, TAU); ctx.fill();
        ctx.restore();
        // golden scalloped waist line
        ctx.fillStyle = accent;
        for (var w = -2; w <= 2; w++) { ctx.beginPath(); ctx.arc(w * 0.075, 0.015, 0.042, 0, Math.PI); ctx.fill(); }
      }
      function hand(x, y, ang, sz) {
        // palm with four fingers and a thumb
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sz, sz);
        ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.05;
        var fingers = [[-0.33, 0.95], [-0.11, 1.08], [0.11, 1.04], [0.31, 0.88]];
        fingers.forEach(function (f) { ctx.beginPath(); ctx.moveTo(f[0] * 0.8, -0.5); ctx.lineTo(f[0] * 1.15, -0.5 - f[1] * 0.62); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(0.45, 0.0); ctx.lineTo(0.85, -0.38); ctx.stroke();
        ctx.strokeStyle = SKIN; ctx.lineWidth = 0.28;
        fingers.forEach(function (f) { ctx.beginPath(); ctx.moveTo(f[0] * 0.8, -0.5); ctx.lineTo(f[0] * 1.15, -0.5 - f[1] * 0.62); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(0.42, 0.02); ctx.lineTo(0.8, -0.36); ctx.stroke();
        ctx.fillStyle = SKIN; ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.ellipse(0, -0.15, 0.52, 0.48, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -0.15, 0.52, 0.48, 0, 0.35 * Math.PI, 0.95 * Math.PI); ctx.stroke();
        ctx.restore();
      }
      function arm(sx, sy, ex, ey, hx, hy) {
        ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.095;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke();
        ctx.strokeStyle = SKIN; ctx.lineWidth = 0.068;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke();
      }
      // st: bend, flick, wave (0 = arms over the head / 1 = waving), sway, t, happy
      function drawMermaid(x, y, s, rot, st) {
        var t = st.t, wv = st.wave;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // long hair behind (streams down the back while diving)
        var sw = Math.sin(t * 0.006) * 0.04 + st.sway * 0.05;
        ctx.fillStyle = HAIR; ctx.strokeStyle = HAIR_D; ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(-0.27, -0.86);
        ctx.bezierCurveTo(-0.38 + sw, -0.6, -0.34 + sw, -0.35, -0.4 + sw * 2, -0.12 + 0.1 * (1 - wv));
        ctx.quadraticCurveTo(-0.3 + sw, -0.18, -0.24 + sw, -0.1);
        ctx.quadraticCurveTo(-0.2, -0.3, -0.12, -0.4);
        ctx.lineTo(0.12, -0.4);
        ctx.quadraticCurveTo(0.2, -0.3, 0.24 + sw, -0.1);
        ctx.quadraticCurveTo(0.3 + sw, -0.18, 0.4 + sw * 2, -0.12 + 0.1 * (1 - wv));
        ctx.bezierCurveTo(0.34 + sw, -0.35, 0.38 + sw, -0.6, 0.27, -0.86);
        ctx.arc(0, -0.8, 0.27, -0.2, Math.PI + 0.2, true);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // tail
        drawTail(st.bend, st.flick, t);
        // arms: dive pose (straight up past the head) ↔ wave pose
        var wa = Math.sin(t * 0.016) * 0.35 * wv;
        var rE = [lerp(0.2, 0.42, wv), lerp(-0.86, -0.6, wv)], rH = [lerp(0.08, 0.46, wv), lerp(-1.2, -0.92, wv)];
        var lE = [lerp(-0.2, -0.32, wv), lerp(-0.86, -0.25, wv)], lH = [lerp(-0.08, -0.18, wv), lerp(-1.2, -0.06, wv)];
        // waving hand swings around the elbow
        var dx = rH[0] - rE[0], dy = rH[1] - rE[1];
        rH = [rE[0] + dx * Math.cos(wa) - dy * Math.sin(wa), rE[1] + dx * Math.sin(wa) + dy * Math.cos(wa)];
        arm(-0.19, -0.45, lE[0], lE[1], lH[0], lH[1]);
        arm(0.19, -0.45, rE[0], rE[1], rH[0], rH[1]);
        // torso
        ctx.fillStyle = SKIN; ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(-0.17, 0.03);
        ctx.bezierCurveTo(-0.11, -0.14, -0.13, -0.28, -0.19, -0.42);
        ctx.bezierCurveTo(-0.17, -0.5, -0.07, -0.53, 0, -0.53);
        ctx.bezierCurveTo(0.07, -0.53, 0.17, -0.5, 0.19, -0.42);
        ctx.bezierCurveTo(0.13, -0.28, 0.11, -0.14, 0.17, 0.03);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // seashell top
        for (var sh = -1; sh <= 1; sh += 2) {
          ctx.save(); ctx.translate(sh * 0.085, -0.33);
          ctx.fillStyle = TOP; ctx.strokeStyle = mixHex(TOP, '#2A1050', 0.4); ctx.lineWidth = 0.015;
          ctx.beginPath(); ctx.moveTo(-0.085, 0.035); ctx.quadraticCurveTo(-0.09, -0.07, 0, -0.075); ctx.quadraticCurveTo(0.09, -0.07, 0.085, 0.035);
          ctx.quadraticCurveTo(0, 0.06, -0.085, 0.035); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.012;
          for (var rr = -2; rr <= 2; rr++) { ctx.beginPath(); ctx.moveTo(rr * 0.012, 0.035); ctx.lineTo(rr * 0.035, -0.055); ctx.stroke(); }
          ctx.restore();
        }
        // neck + head
        ctx.fillStyle = SKIN_D; ctx.fillRect(-0.05, -0.62, 0.1, 0.12);
        ctx.fillStyle = SKIN; ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.ellipse(0, -0.8, 0.235, 0.245, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // face: two eyes (she faces the viewer)
        var bl = st.blink == null ? 1 : st.blink;
        for (var e = -1; e <= 1; e += 2) {
          var ex = e * 0.088, ey = -0.79;
          if (st.happy) {
            ctx.strokeStyle = '#2B1B3F'; ctx.lineWidth = 0.025;
            ctx.beginPath(); ctx.arc(ex, ey + 0.015, 0.045, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
          } else {
            ctx.save(); ctx.translate(ex, ey); ctx.scale(1, Math.max(0.08, bl));
            ctx.fillStyle = '#2B1B3F'; ctx.beginPath(); ctx.ellipse(0, 0, 0.045, 0.06, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#4FA6C8'; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.03, 0.028, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(-0.012, -0.022, 0.017, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(0.016, 0.022, 0.008, 0, TAU); ctx.fill();
            ctx.restore();
          }
          ctx.strokeStyle = '#2B1B3F'; ctx.lineWidth = 0.014;
          ctx.beginPath(); ctx.moveTo(ex + e * 0.035, ey - 0.045); ctx.lineTo(ex + e * 0.062, ey - 0.066);
          ctx.moveTo(ex + e * 0.044, ey - 0.028); ctx.lineTo(ex + e * 0.074, ey - 0.04); ctx.stroke();
          ctx.fillStyle = 'rgba(255,120,150,.45)';
          ctx.beginPath(); ctx.ellipse(e * 0.145, -0.7, 0.045, 0.027, 0, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = SKIN_L; ctx.lineWidth = 0.014;
        ctx.beginPath(); ctx.arc(0, -0.735, 0.012, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
        ctx.strokeStyle = '#C24A6A'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.arc(0, -0.715, 0.05, 0.22 * Math.PI, 0.78 * Math.PI); ctx.stroke();
        // fringe + side locks in front
        ctx.fillStyle = HAIR; ctx.strokeStyle = HAIR_D; ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.moveTo(-0.25, -0.76);
        ctx.bezierCurveTo(-0.28, -1.0, -0.1, -1.1, 0.02, -1.07);
        ctx.bezierCurveTo(0.2, -1.06, 0.3, -0.95, 0.25, -0.76);
        ctx.quadraticCurveTo(0.2, -0.86, 0.13, -0.88);
        ctx.quadraticCurveTo(0.06, -0.9, 0.03, -0.86);
        ctx.quadraticCurveTo(-0.02, -0.93, -0.1, -0.9);
        ctx.quadraticCurveTo(-0.2, -0.88, -0.25, -0.76);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = HAIR_L; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.arc(-0.02, -0.86, 0.17, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
        for (var side = -1; side <= 1; side += 2) {
          ctx.fillStyle = HAIR;
          ctx.beginPath(); ctx.moveTo(side * 0.24, -0.82);
          ctx.quadraticCurveTo(side * (0.3 + sw), -0.6, side * 0.22 + sw, -0.44);
          ctx.quadraticCurveTo(side * 0.17, -0.6, side * 0.19, -0.78); ctx.closePath(); ctx.fill();
        }
        // starfish hair clip
        ctx.fillStyle = accent; ctx.strokeStyle = mixHex(accent, '#7A4A00', 0.5); ctx.lineWidth = 0.012;
        starPath(ctx, 0.17, -0.98, 0.07, 0.3, 0.5); ctx.fill(); ctx.stroke();
        // hands last so the waving palm reads clearly
        var la = Math.atan2(lH[1] - lE[1], lH[0] - lE[0]) + Math.PI / 2;
        var ra = Math.atan2(rH[1] - rE[1], rH[0] - rE[0]) + Math.PI / 2;
        hand(lH[0], lH[1], la, 0.1);
        hand(rH[0], rH[1], ra, 0.11);
        ctx.restore();
      }

      // ─── shell with a pearl (super) ───
      function drawShell(x, y, w, open, t) {
        ctx.save(); ctx.translate(x, y); ctx.scale(w, w);
        ctx.lineJoin = 'round';
        // lid (hinged at the back, swings up)
        function fan(flip) {
          var g = ctx.createLinearGradient(0, 0, 0, -0.5 * flip);
          g.addColorStop(0, '#FFC7DE'); g.addColorStop(1, '#FFF0F6');
          ctx.fillStyle = g; ctx.strokeStyle = '#D884A8'; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(-0.08, 0);
          for (var k = 0; k <= 7; k++) {
            var a = Math.PI + k / 7 * Math.PI, ax = Math.cos(a) * 0.55, ay = Math.sin(a) * 0.42 * flip;
            if (k) { var pa = Math.PI + (k - 0.5) / 7 * Math.PI; ctx.quadraticCurveTo(Math.cos(pa) * 0.62, Math.sin(pa) * 0.5 * flip, ax, ay); }
            else ctx.lineTo(ax, ay);
          }
          ctx.lineTo(0.08, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(216,132,168,.55)'; ctx.lineWidth = 0.015;
          for (var r = 1; r < 7; r++) { var ra = Math.PI + r / 7 * Math.PI; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ra) * 0.5, Math.sin(ra) * 0.38 * flip); ctx.stroke(); }
        }
        var ly = lerp(-0.55, 0.95, easeOutBack(open));
        function lid() { ctx.save(); ctx.scale(1, ly); fan(1); ctx.restore(); }
        if (ly > 0.02) lid();
        // bottom half (bowl)
        ctx.save(); ctx.scale(1, 0.55); fan(-1); ctx.restore();
        // pearl + glow
        if (open > 0.05) {
          var po = clamp01((open - 0.1) / 0.5);
          var pr = 0.17, py = -pr * 0.9;
          var gg = ctx.createRadialGradient(0, py, 0, 0, py, 0.9);
          gg.addColorStop(0, 'rgba(255,250,235,' + (0.55 * po).toFixed(3) + ')'); gg.addColorStop(0.4, hexA(glow, 0.2 * po)); gg.addColorStop(1, hexA(glow, 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, py, 0.9, 0, TAU); ctx.fill();
          // rays
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (var r2 = 0; r2 < 9; r2++) {
            var a2 = -Math.PI / 2 + (r2 - 4) * 0.3 + Math.sin(t * 0.002 + r2) * 0.04, len = (0.75 + 0.25 * Math.sin(t * 0.004 + r2 * 2)) * po;
            ctx.fillStyle = hexA(mixHex('#FFF4D0', accent, 0.35), 0.2 * po);
            ctx.beginPath(); ctx.moveTo(0, py);
            ctx.lineTo(Math.cos(a2 - 0.07) * len, py + Math.sin(a2 - 0.07) * len);
            ctx.lineTo(Math.cos(a2 + 0.07) * len, py + Math.sin(a2 + 0.07) * len); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
          var pg = ctx.createRadialGradient(-pr * 0.35, py - pr * 0.4, pr * 0.1, 0, py, pr);
          pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(0.5, '#FBEFFF'); pg.addColorStop(1, '#D9C6F0');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, py, pr, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.9)'; sparkPath(ctx, -pr * 0.35, py - pr * 0.4, pr * 0.45); ctx.fill();
        }
        // lid
        if (ly < -0.02) lid();
        ctx.restore();
      }

      // ─── waves ───
      function waveY(x, t, waterY, s, layer) {
        return waterY + layer * s * 0.12 + Math.sin(x * 0.012 / unit + t * 0.0024 + layer * 1.7) * s * 0.05
               + Math.sin(x * 0.027 / unit - t * 0.0018 + layer) * s * 0.025;
      }
      function waveLayer(t, waterY, s, layer, fillA, crestA) {
        var step = Math.max(6, W / 90);
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var x = 0; x <= W + step; x += step) ctx.lineTo(x, waveY(x, t, waterY, s, layer));
        ctx.lineTo(W, H); ctx.closePath();
        var y0 = waterY + layer * s * 0.12 - s * 0.1;
        var g = ctx.createLinearGradient(0, y0, 0, H);
        g.addColorStop(0, hexA(mixHex('#1A6FA0', glow, 0.35), fillA)); g.addColorStop(0.35, hexA('#0E3F66', fillA * 0.95)); g.addColorStop(1, hexA('#061A33', fillA * 0.9));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = hexA(glow, crestA); ctx.lineWidth = Math.max(1.5, 4 * unit);
        ctx.shadowColor = glow; ctx.shadowBlur = 12 * unit;
        ctx.beginPath();
        for (var x2 = 0; x2 <= W + step; x2 += step) { var yy = waveY(x2, t, waterY, s, layer); if (x2) ctx.lineTo(x2, yy); else ctx.moveTo(x2, yy); }
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,' + (crestA * 0.6).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, 1.5 * unit);
        ctx.stroke();
      }

      var raf = 0, dead = false, t0 = performance.now();
      function frame(now) {
        if (dead) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var portrait = W < H;
        var waterY = H * (portrait ? 0.72 : 0.76);
        var s = Math.min(W * 0.17, H * 0.2);
        var span = Math.min(W * 0.3, s * 2.4);
        var xa = W / 2 - span, xb = W / 2 + span;
        var Hap = Math.min(H * 0.36, W * 0.5);
        var appear = clamp01(t / 250);

        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // a moon-glow path on the sea
        var mg = ctx.createRadialGradient(W / 2, waterY, 0, W / 2, waterY, W * 0.5);
        mg.addColorStop(0, hexA(glow, 0.22 * appear)); mg.addColorStop(1, hexA(glow, 0));
        ctx.save(); ctx.translate(W / 2, waterY); ctx.scale(1, 0.18); ctx.translate(-W / 2, -waterY);
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W / 2, waterY, W * 0.5, 0, TAU); ctx.fill(); ctx.restore();

        // ─── mermaid state ───
        var mx = null, my = 0, mrot = 0, mst = { t: t, bend: 0.15, flick: 0, wave: 0, sway: 0, happy: false, blink: 1 };
        var surfX = isSuper ? W / 2 - s * 0.95 : W / 2;
        function leapPos(L, q) {
          var x0 = L[2] > 0 ? xa : xb, x1 = L[2] > 0 ? xb : xa;
          var x = lerp(x0, x1, q), y = waterY + s * 0.35 - Hap * 4 * q * (1 - q);
          var vx = x1 - x0, vy = -Hap * 4 * (1 - 2 * q);
          return { x: x, y: y, rot: Math.atan2(vy, vx) + Math.PI / 2 };
        }
        function leapPose(q, st) {
          var fq = (q - 0.42) / 0.26;
          st.bend = -0.35 + 0.25 * q;
          st.flick = fq > 0 && fq < 1 ? Math.sin(fq * TAU * 1.5) * 0.9 * Math.sin(fq * Math.PI) : 0;
          st.wave = 0; st.sway = 0.6;
        }
        for (var li = 0; li < T.leaps.length; li++) {
          var L = T.leaps[li], q = (t - ms(L[0])) / (ms(L[1]) - ms(L[0]));
          if (q >= 0 && q <= 1) {
            var P = leapPos(L, q);
            mx = P.x; my = P.y; mrot = P.rot; leapPose(q, mst);
            mst.happy = q > 0.35 && q < 0.75;
          }
        }
        var sq = (t - ms(T.surf[0])) / (ms(T.surf[1]) - ms(T.surf[0]));
        if (mx === null && sq > 0) {
          mx = surfX; my = waterY + s * lerp(1.4, 0.06, easeOutBack(clamp01(sq)));
          mrot = Math.sin(t * 0.003) * 0.05;
          mst.bend = 0.3 * Math.sin(t * 0.004); mst.wave = clamp01(sq * 1.6); mst.sway = Math.sin(t * 0.004);
          mst.happy = sq > 1.4 && sq < 2.6;
          var bq = (sq - 1.15) / 0.25; if (bq > 0 && bq < 1) mst.blink = Math.abs(Math.cos(bq * Math.PI));
          my += Math.sin(t * 0.005) * s * 0.03;
        }
        // splash positions are fixed when they fire
        splashes.forEach(function (S) {
          if (t < S.at || S.fixed) return;
          S.fixed = true;
          if (S.kind === 'out' || S.kind === 'in') {
            var Lx = T.leaps[S.li], goRight = Lx[2] > 0;
            S.x = (S.kind === 'out') === goRight ? xa : xb; S.y = waterY;
          } else if (S.kind === 'surf') { S.x = surfX; S.y = waterY; }
          else {
            var L2 = T.leaps[S.li], q2 = 0.56, P2 = leapPos(L2, q2), st2 = { };
            leapPose(q2, st2);
            var F = { x: tailX(TL, st2.bend, st2.flick) * s, y: TL * s };
            var c = Math.cos(P2.rot), sn = Math.sin(P2.rot);
            S.x = P2.x + F.x * c - F.y * sn; S.y = P2.y + F.x * sn + F.y * c;
          }
        });

        // back wave
        waveLayer(t, waterY, s, 0, 0.45 * appear, 0.5 * appear);
        // super: the shell rises and opens behind the front wave
        var shX = W / 2 + s * 1.05, shW = s * 1.15;
        if (T.shell && t > ms(T.shell[0])) {
          var rq = easeOutBack(clamp01((t - ms(T.shell[0])) / (ms(T.shell[1]) - ms(T.shell[0]))));
          var oq = clamp01((t - ms(T.open[0])) / (ms(T.open[1]) - ms(T.open[0])));
          drawShell(shX, lerp(waterY + s * 0.9, waterY - s * 0.02, rq) + Math.sin(t * 0.004) * s * 0.02, shW, oq, t);
        }
        if (mx !== null) drawMermaid(mx, my, s, mrot, mst);
        // front wave (translucent so the tail glimmers under the surface)
        waveLayer(t, waterY, s, 1, 0.72 * appear, 0.8 * appear);

        // bubbles in the sea
        for (var bi = 0; bi < bubbles.length; bi++) {
          var B = bubbles[bi], bp = ((t * 0.001 * B.sp + B.ph) % 1);
          var by = lerp(H, waterY + s * 0.3, bp), bx = B.x * W + Math.sin(bp * 9 + bi) * 8 * unit;
          ctx.strokeStyle = hexA('#CFF4FF', 0.5 * (1 - bp) * appear); ctx.lineWidth = Math.max(1, 1.5 * unit);
          ctx.beginPath(); ctx.arc(bx, by, (3 + 4 * B.r) * unit + 1, 0, TAU); ctx.stroke();
        }

        // splashes: droplets → sparkles
        ctx.globalCompositeOperation = 'lighter';
        splashes.forEach(function (S) {
          var dt = t - S.at; if (dt < 0 || dt > 1400 || !S.fixed) return;
          if (S.kind !== 'fin' && dt < 450) {          // a splash crown on the water
            var cq = dt / 450;
            ctx.strokeStyle = hexA('#DDF8FF', 0.7 * (1 - cq)); ctx.lineWidth = Math.max(1, 3 * unit * (1 - cq));
            ctx.beginPath(); ctx.ellipse(S.x, S.y, s * (0.3 + cq * 1.1), s * (0.07 + cq * 0.22), 0, 0, TAU); ctx.stroke();
          }
          for (var d = 0; d < S.drops.length; d++) {
            var D = S.drops[d], sec = dt / 1000;
            var px, py;
            if (dt < D.turn) {
              px = S.x + Math.cos(D.a) * D.v * s * 2.4 * sec;
              py = S.y + Math.sin(D.a) * D.v * s * 3.2 * sec + s * 6 * sec * sec;
              ctx.fillStyle = 'rgba(200,240,255,.85)';
              ctx.beginPath(); ctx.ellipse(px, py, s * 0.03 * D.r, s * 0.042 * D.r, D.a + Math.PI / 2, 0, TAU); ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.9)';
              ctx.beginPath(); ctx.arc(px - s * 0.008, py - s * 0.012, s * 0.009 * D.r + 0.5, 0, TAU); ctx.fill();
            } else {
              var ts = D.turn / 1000, k2 = (dt - D.turn) / (1400 - D.turn);
              px = S.x + Math.cos(D.a) * D.v * s * 2.4 * ts + Math.sin(dt * 0.004 + D.ph) * s * 0.06;
              py = S.y + Math.sin(D.a) * D.v * s * 3.2 * ts + s * 6 * ts * ts - k2 * s * 0.25;
              var tw = 0.6 + 0.4 * Math.sin(dt * 0.025 + D.ph), pop = k2 < 0.12 ? 1 + (0.12 - k2) * 5 : 1;
              ctx.fillStyle = hexA(D.c, (1 - k2) * tw);
              sparkPath(ctx, px, py, s * 0.07 * D.r * pop * (1 - k2 * 0.4)); ctx.fill();
            }
          }
        });
        // super: a ring of sea sparkles circling the mermaid and her pearl
        if (T.ring && t > ms(T.ring)) {
          var rq2 = clamp01((t - ms(T.ring)) / 500);
          var rcx = W / 2 + s * 0.05, rcy = waterY - s * 0.75, rrx = Math.min(W * 0.45, s * 2.2), rry = s * 0.9;
          ctx.strokeStyle = hexA(glow, 0.22 * rq2); ctx.lineWidth = Math.max(2, s * 0.05);
          ctx.beginPath(); ctx.ellipse(rcx, rcy, rrx * easeOut(rq2), rry * easeOut(rq2), 0, 0, TAU); ctx.stroke();
          for (var r = 0; r < ring.length; r++) {
            var Rg = ring[r], ra = Rg.a + t * 0.0009;
            var rx = rcx + Math.cos(ra) * rrx * easeOut(rq2), ry2 = rcy + Math.sin(ra) * rry * easeOut(rq2);
            var tw2 = 0.55 + 0.45 * Math.sin(t * 0.008 + Rg.ph);
            var col = Rg.k % 3 === 0 ? accent : Rg.k % 3 === 1 ? '#FFFFFF' : glow;
            ctx.fillStyle = hexA(col, rq2 * tw2);
            sparkPath(ctx, rx, ry2, s * (Rg.k % 2 ? 0.09 : 0.06) * (0.7 + 0.5 * tw2)); ctx.fill();
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
        }
        if (t < dur && !dead) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        dead = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
