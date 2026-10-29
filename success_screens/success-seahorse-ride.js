/* success-seahorse-ride.js — מסך הצלחה: סוּסוֹן יָם 🌊
   סוסון ים כתום-זהוב וחמוד (מבט צד: עין אחת, זנב מסולסל, סנפיר גב קטן
   שמרפרף) עולה מלמטה בין בועות מטפסות, עושה סלטה שמחה בלולאה שלמה,
   ואז כוכב זוהר מרחף אליו והוא מלפף סביבו את הזנב ומחבק אותו — עם הבזק נצנצים.
   בסופר: משפחה של שלושה סוסוני ים (שני גורים ורוד וטורקיז מצטרפים מהצדדים),
   אצות ים מתנועעות בתחתית, והבועות מתפוצצות לנצנצים.
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
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function starPath(ctx, x, y, r, rot, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.48) : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  var MOM  = { body: '#FFB347', dark: '#B0601A', light: '#FFE3A0', belly: '#FFF1C6', fin: '#FF8FB8', finDk: '#D85A8C', blush: 'rgba(255,100,130,.55)' };
  var PINK = { body: '#FF92C8', dark: '#B4447C', light: '#FFD3EA', belly: '#FFEAF5', fin: '#C9A2FF', finDk: '#8B62D6', blush: 'rgba(255,80,130,.5)' };
  var TEAL = { body: '#5CD6C6', dark: '#24887E', light: '#C2F6EE', belly: '#E8FFFB', fin: '#FFD27D', finDk: '#D29A2A', blush: 'rgba(255,110,140,.5)' };

  // body centre-line (local units, facing +x, y down): x, y, half-width
  var SPINE = [[0.03, -0.64, 0.12], [-0.06, -0.48, 0.16], [-0.08, -0.25, 0.22], [-0.03, 0.0, 0.245],
               [0.0, 0.22, 0.2], [-0.03, 0.4, 0.145], [-0.09, 0.55, 0.11]];
  var BODY = [];
  (function () {
    for (var i = 0; i < SPINE.length - 1; i++) {
      var a = SPINE[i], b = SPINE[i + 1], n = 8;
      for (var j = 0; j < n; j++) {
        var u = j / n, uu = u * u * (3 - 2 * u);
        BODY.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], uu)]);
      }
    }
    BODY.push(SPINE[SPINE.length - 1].slice());
  })();
  var TAIL0 = SPINE[SPINE.length - 1];
  var C_TIGHT = [0.1, 0.73], C_WRAP = [0.13, 0.8];
  function tailPts(k) {         // k: 0 tight curl … 1 wrapped around the star
    var cx = lerp(C_TIGHT[0], C_WRAP[0], k), cy = lerp(C_TIGHT[1], C_WRAP[1], k);
    var dx = TAIL0[0] - cx, dy = TAIL0[1] - cy, r0 = Math.sqrt(dx * dx + dy * dy), a0 = Math.atan2(dy, dx);
    var sweep = lerp(1.7, 1.9, k) * Math.PI, N = 40, out = [];
    for (var i = 1; i <= N; i++) {
      var u = i / N;
      var rT = r0 * (1 - 0.8 * u);
      var rW = lerp(r0, 0.2, clamp01(u * 3)) - 0.02 * u;
      var r = lerp(rT, rW, k), a = a0 - u * sweep;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, lerp(0.105, 0.03, Math.pow(u, 0.9))]);
    }
    return out;
  }

  window.SUCCESS.styles.push({
    name: 'seahorse-ride',
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
      if (!/^#[0-9a-fA-F]{6}$/.test(textCol)) textCol = '#FFFFFF';
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

      // sprites (off-DOM): soft glow + a bubble
      var spr = document.createElement('canvas');
      spr.width = spr.height = 64;
      var sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,235,1)'); sgr.addColorStop(0.2, 'rgba(255,236,170,.8)');
      sgr.addColorStop(0.5, 'rgba(255,210,120,.25)'); sgr.addColorStop(1, 'rgba(255,210,120,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);
      var bub = document.createElement('canvas');
      bub.width = bub.height = 64;
      var bg = bub.getContext('2d');
      var bgr = bg.createRadialGradient(26, 24, 2, 32, 32, 30);
      bgr.addColorStop(0, 'rgba(255,255,255,.05)'); bgr.addColorStop(0.75, hexA(glow, 0.12)); bgr.addColorStop(1, hexA(glow, 0.45));
      bg.fillStyle = bgr; bg.beginPath(); bg.arc(32, 32, 29, 0, TAU); bg.fill();
      bg.strokeStyle = 'rgba(220,245,255,.75)'; bg.lineWidth = 2.2; bg.beginPath(); bg.arc(32, 32, 28.5, 0, TAU); bg.stroke();
      bg.fillStyle = 'rgba(255,255,255,.9)'; bg.beginPath(); bg.ellipse(22, 20, 7, 4, -0.7, 0, TAU); bg.fill();
      bg.beginPath(); bg.arc(40, 44, 2.5, 0, TAU); bg.fill();

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { rise: [0, 0.2], loop: [0.2, 0.36], star: [0.3, 0.45], wrap: [0.41, 0.5], txt: 0.27, babies: [0.46, 0.64] }
        : { rise: [0, 0.3], loop: [0.31, 0.52], star: [0.44, 0.64], wrap: [0.59, 0.7], txt: 0.3, babies: null };
      function ms(f) { return f * dur; }

      var bubbles = [];
      var NBU = isSuper ? 40 : 26;
      for (var b0 = 0; b0 < NBU; b0++) {
        bubbles.push({ x: Math.random(), delay: rnd(-600, dur * 0.7), sp: rnd(0.22, 0.42), r: rnd(0.5, 1.5), ph: rnd(0, TAU),
                       wob: rnd(0.6, 1.4), pop: isSuper || b0 % 3 === 0 ? rnd(0.12, 0.55) : -1, col: b0 % 3 === 0 ? accent : b0 % 3 === 1 ? '#FFFFFF' : glow });
      }
      var weeds = [];
      if (isSuper) {
        for (var w0 = 0; w0 < 11; w0++)
          weeds.push({ x: (w0 + rnd(0.1, 0.9)) / 11, h: rnd(0.14, 0.27), ph: rnd(0, TAU), w: rnd(0.8, 1.3),
                       col: w0 % 3 === 0 ? '#3FBF8A' : w0 % 3 === 1 ? '#2E9C78' : '#62D6A0' });
      }
      var bgStars = [];
      for (var bs = 0; bs < 18; bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.4, color: bs % 3 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });

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
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + ' + (isSuper ? '9.5%' : '8%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers ───
      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function circ(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      // every round piece of the silhouette — drawn twice (outline pass, fill pass) so it reads as one shape
      function silhouette(tail, grow) {
        ctx.beginPath();
        var i, p;
        for (i = 0; i < BODY.length; i++) { p = BODY[i]; circ(p[0], p[1], p[2] + grow); }
        for (i = 0; i < tail.length; i++) { p = tail[i]; circ(p[0], p[1], p[2] + grow); }
        ctx.moveTo(0.08 + 0.22 + grow, -0.8);
        ctx.ellipse(0.08, -0.8, 0.22 + grow, 0.175 + grow, 0.22, 0, TAU);              // head
        for (i = 0; i <= 8; i++) {                                                       // snout tube
          var u = i / 8; circ(lerp(0.22, 0.5, u), lerp(-0.73, -0.64, u), lerp(0.075, 0.06, u) + grow);
        }
        circ(0.52, -0.645, 0.065 + grow);                                                // snout tip
        circ(-0.02, -0.96, 0.045 + grow); circ(0.06, -0.985, 0.05 + grow); circ(0.14, -0.955, 0.042 + grow); // coronet
        ctx.moveTo(0.06 + 0.2 + grow, -0.04);
        ctx.ellipse(0.06, -0.04, 0.2 + grow, 0.3 + grow, -0.08, 0, TAU);                 // round belly
      }
      function finFan(bx0, by0, bx1, by1, nx, ny, len, n, flap, C, a) {
        var tips = [];
        for (var i = 0; i < n; i++) {
          var u = i / (n - 1), bx = lerp(bx0, bx1, u), by = lerp(by0, by1, u);
          var l = len * (0.75 + 0.35 * Math.sin(u * Math.PI)) * (1 + 0.12 * Math.sin(flap + u * 4));
          var sw = 0.25 * Math.sin(flap + u * 3);
          tips.push([bx, by, bx + (nx + sw * ny) * l, by + (ny - sw * nx) * l]);
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = hexA(C.fin, 0.82);
        ctx.beginPath(); ctx.moveTo(bx0, by0);
        for (var j = 0; j < n; j++) {
          if (j === 0) ctx.lineTo(tips[j][2], tips[j][3]);
          else ctx.quadraticCurveTo((tips[j - 1][2] + tips[j][2]) / 2 + nx * 0.03, (tips[j - 1][3] + tips[j][3]) / 2 + ny * 0.03, tips[j][2], tips[j][3]);
        }
        ctx.lineTo(bx1, by1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA(C.finDk, 0.9); ctx.lineWidth = 0.018; ctx.stroke();
        ctx.strokeStyle = hexA(C.finDk, 0.55); ctx.lineWidth = 0.014;
        for (var k = 0; k < n; k++) { ctx.beginPath(); ctx.moveTo(tips[k][0], tips[k][1]); ctx.lineTo(tips[k][2], tips[k][3]); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // seahorse in side view facing +x (dir = -1 mirrors); st: { tailK, flap, happy, blink }
      function drawSeahorse(x, y, sc, dir, rot, st, C) {
        var tail = tailPts(st.tailK || 0);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(dir * sc, sc);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // dorsal fin on the back (behind the body), fluttering
        finFan(-0.22, -0.2, -0.2, 0.22, -1, 0.1, 0.2, 6, st.flap, C, 1);
        // outline pass + fill pass
        ctx.fillStyle = C.dark; silhouette(tail, 0.028); ctx.fill();
        var g = ctx.createLinearGradient(-0.3, -0.9, 0.35, 0.6);
        g.addColorStop(0, C.light); g.addColorStop(0.45, C.body); g.addColorStop(1, C.body);
        ctx.fillStyle = g; silhouette(tail, 0); ctx.fill();
        // pale belly plate
        ctx.fillStyle = hexA(C.belly, 0.85);
        ctx.beginPath(); ctx.ellipse(0.12, -0.06, 0.12, 0.26, -0.12, 0, TAU); ctx.fill();
        // segment ridges across body + tail
        ctx.strokeStyle = hexA(C.dark, 0.32); ctx.lineWidth = 0.02;
        var all = BODY.slice(10).concat(tail), i;
        for (i = 3; i < all.length - 3; i += 4) {
          var p = all[i], q = all[i + 1], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
          var nx = -ty / tl, ny = tx / tl, w = p[2] * 0.82;
          ctx.beginPath(); ctx.moveTo(p[0] - nx * w, p[1] - ny * w);
          ctx.quadraticCurveTo(p[0] + tx / tl * 0.04, p[1] + ty / tl * 0.04, p[0] + nx * w, p[1] + ny * w); ctx.stroke();
        }
        // back bumps
        ctx.fillStyle = C.light;
        for (i = 6; i < BODY.length; i += 7) { var bp = BODY[i]; ctx.beginPath(); ctx.arc(bp[0] - bp[2] * 0.86, bp[1], 0.026, 0, TAU); ctx.fill(); }
        // shine on the head + body
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(0.0, -0.9, 0.09, 0.035, -0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-0.14, -0.3, 0.035, 0.12, 0.15, 0, TAU); ctx.fill();
        // little pectoral fin behind the head, fluttering fast
        finFan(-0.04, -0.62, 0.02, -0.52, -0.55, 0.55, 0.11, 4, st.flap * 1.6 + 1, C, 0.95);
        // snout tip: a tiny closed mouth
        ctx.strokeStyle = C.dark; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.arc(0.565, -0.64, 0.028, Math.PI * 0.5, Math.PI * 1.35); ctx.stroke();
        // smile under the eye
        ctx.beginPath(); ctx.arc(0.21, -0.75, 0.045, 0.4, Math.PI - 0.6); ctx.stroke();
        // blush
        ctx.fillStyle = C.blush; ctx.beginPath(); ctx.ellipse(0.16, -0.7, 0.055, 0.03, 0.1, 0, TAU); ctx.fill();
        // ONE eye (true side view)
        var ex = 0.08, ey = -0.83;
        if (st.happy) {
          ctx.strokeStyle = '#3A1E0C'; ctx.lineWidth = 0.03;
          ctx.beginPath(); ctx.arc(ex, ey + 0.02, 0.065, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
        } else {
          var bl = st.blink == null ? 1 : st.blink;
          ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 0.085, 0.09 * Math.max(0.08, bl), 0, 0, TAU); ctx.clip();
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(ex - 0.1, ey - 0.1, 0.2, 0.2);
          ctx.fillStyle = '#2A160A'; ctx.beginPath(); ctx.arc(ex + 0.018, ey + 0.004, 0.064, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(ex - 0.005, ey - 0.024, 0.024, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(ex + 0.04, ey + 0.028, 0.011, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = C.dark; ctx.lineWidth = 0.018;
          ctx.beginPath(); ctx.ellipse(ex, ey, 0.087, 0.092, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        }
        // two lashes at the back-top of the eye
        ctx.strokeStyle = '#3A1E0C'; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.moveTo(ex - 0.06, ey - 0.06); ctx.lineTo(ex - 0.1, ey - 0.095);
        ctx.moveTo(ex - 0.025, ey - 0.08); ctx.lineTo(ex - 0.045, ey - 0.125); ctx.stroke();
        ctx.restore();
      }
      function toWorld(lx, ly, x, y, sc, dir, rot) {
        var px = lx * dir * sc, py = ly * sc, c = Math.cos(rot), s2 = Math.sin(rot);
        return { x: x + px * c - py * s2, y: y + px * s2 + py * c };
      }
      function drawStar(x, y, r, t, a) {
        if (a <= 0) return;
        glowDot(x, y, r * 3.4, 0.85 * a);
        ctx.save(); ctx.globalAlpha = a;
        var g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.05, x, y, r);
        g.addColorStop(0, '#FFFBE0'); g.addColorStop(0.5, '#FFE066'); g.addColorStop(1, '#F5A623');
        ctx.fillStyle = g; ctx.strokeStyle = '#D9831A'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.lineJoin = 'round';
        starPath(ctx, x, y, r, Math.sin(t * 0.003) * 0.15, 0.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.18, y - r * 0.32, r * 0.16, r * 0.08, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawWeed(wd, t, a) {
        var bx = wd.x * W, len = wd.h * H, n = 9, segL = len / n, ang = -Math.PI / 2, x0 = bx, y0 = H + 4;
        ctx.strokeStyle = hexA(wd.col, 0.85 * a); ctx.lineCap = 'round';
        for (var i = 0; i < n; i++) {
          var u = i / n;
          ang = -Math.PI / 2 + Math.sin(t * 0.0021 + wd.ph + u * 2.2) * 0.32 * (0.3 + u);
          var x1 = x0 + Math.cos(ang) * segL, y1 = y0 + Math.sin(ang) * segL;
          ctx.lineWidth = Math.max(1.5, 16 * unit * wd.w * (1 - u * 0.75));
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          if (i % 3 === 1) {                 // little leaf
            var side = i % 2 ? 1 : -1;
            ctx.fillStyle = hexA(wd.col, 0.75 * a);
            ctx.beginPath(); ctx.ellipse(x1 + side * 9 * unit * wd.w, y1, 10 * unit * wd.w, 4.5 * unit * wd.w, ang + side * 0.9, 0, TAU); ctx.fill();
          }
          x0 = x1; y0 = y1;
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);

        var s = Math.min(H * 0.2, W * 0.3);
        var cx = W / 2, baseY = H * 0.6;
        var appear = clamp01(t / 300);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.6 * k * appear);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // a soft underwater glow from below
        var ug = ctx.createLinearGradient(0, H * 0.55, 0, H);
        ug.addColorStop(0, hexA(glow, 0)); ug.addColorStop(1, hexA(glow, 0.14 * appear));
        ctx.fillStyle = ug; ctx.fillRect(0, H * 0.55, W, H * 0.45);
        // light rays from the surface
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (var lr = 0; lr < 4; lr++) {
          var lx = W * (0.2 + lr * 0.22) + Math.sin(t * 0.0006 + lr) * W * 0.03;
          var lg = ctx.createLinearGradient(0, 0, 0, H * 0.9);
          lg.addColorStop(0, hexA(glow, 0.07 * appear)); lg.addColorStop(1, hexA(glow, 0));
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.moveTo(lx - W * 0.03, 0); ctx.lineTo(lx + W * 0.03, 0); ctx.lineTo(lx + W * 0.1, H * 0.9); ctx.lineTo(lx - W * 0.02, H * 0.9); ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // super: swaying seaweed along the bottom (behind)
        for (var wi = 0; wi < weeds.length; wi++) drawWeed(weeds[wi], t, clamp01(t / 500));

        // ─── main seahorse ───
        var flap = t * 0.025;
        var qr = clamp01((t - ms(T.rise[0])) / (ms(T.rise[1]) - ms(T.rise[0])));
        var hx = cx, hy = lerp(H + s * 1.3, baseY, easeOut(qr));
        var rot = Math.sin(qr * Math.PI * 2) * 0.12 * (1 - qr);
        var ql = clamp01((t - ms(T.loop[0])) / (ms(T.loop[1]) - ms(T.loop[0])));
        var R = s * 0.38;
        if (ql > 0 && ql < 1) {
          var th = easeInOut(ql) * TAU;
          hx = cx + Math.sin(th) * R; hy = baseY - R + Math.cos(th) * R;
          rot = -th;
        }
        var bob = Math.sin(t * 0.004) * s * 0.05;
        if (qr < 1) bob *= qr;
        hy += bob;
        var qw = clamp01((t - ms(T.wrap[0])) / (ms(T.wrap[1]) - ms(T.wrap[0])));
        var tailK = easeInOut(qw);
        var held = t > ms(T.wrap[0]) + (ms(T.wrap[1]) - ms(T.wrap[0])) * 0.55;
        if (held) rot += Math.sin((t - ms(T.wrap[1])) * 0.005) * 0.06;
        var happy = held || (ql > 0.2 && ql < 0.95);
        var blQ = (t - ms(T.rise[1]) - 80) / 160, blink = blQ > 0 && blQ < 1 ? Math.abs(Math.cos(blQ * Math.PI)) : 1;

        // the star: drifts in, then rides in the tail's curl
        var holdPt = toWorld(C_WRAP[0], C_WRAP[1], hx, hy, s, 1, rot);
        var qs = clamp01((t - ms(T.star[0])) / (ms(T.star[1]) - ms(T.star[0])));
        var starX = null, starY = 0, starR = s * 0.14;
        if (qs > 0) {
          var es = easeInOut(qs);
          var sx0 = W * 0.86, sy0 = H * 0.36;
          starX = lerp(sx0, holdPt.x, es) + Math.sin(es * Math.PI) * s * 0.4;
          starY = lerp(sy0, holdPt.y, es) - Math.sin(es * Math.PI) * s * 0.5;
          if (qs >= 1) { starX = holdPt.x; starY = holdPt.y; }
        }

        // star behind the tail, tail wraps over it
        if (starX !== null) drawStar(starX, starY, starR * (1 + 0.06 * Math.sin(t * 0.008)), t, clamp01(qs * 4));
        drawSeahorse(hx, hy, s, 1, rot, { tailK: tailK, flap: flap, happy: happy, blink: blink }, MOM);
        // front strand of the tail over the star (so it is truly hugged)
        if (starX !== null && tailK > 0.6) {
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(s, s);
          var tp2 = tailPts(tailK), seg = tp2.slice(14, 26);
          ctx.fillStyle = MOM.dark; ctx.beginPath();
          seg.forEach(function (p) { circ(p[0], p[1], p[2] + 0.028); }); ctx.fill();
          ctx.fillStyle = MOM.body; ctx.beginPath();
          seg.forEach(function (p) { circ(p[0], p[1], p[2]); }); ctx.fill();
          ctx.strokeStyle = hexA(MOM.dark, 0.32); ctx.lineWidth = 0.02;
          for (var sgi = 1; sgi < seg.length - 1; sgi += 4) {
            var p = seg[sgi], q = seg[sgi + 1], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
            ctx.beginPath(); ctx.moveTo(p[0] + ty / tl * p[2] * 0.8, p[1] - tx / tl * p[2] * 0.8); ctx.lineTo(p[0] - ty / tl * p[2] * 0.8, p[1] + tx / tl * p[2] * 0.8); ctx.stroke();
          }
          ctx.restore();
        }
        // hug flash
        var hq = (t - ms(T.wrap[1]) + 120) / 600;
        if (hq > 0 && hq < 1 && starX !== null) {
          ctx.globalCompositeOperation = 'lighter';
          glowDot(starX, starY, s * (0.6 + hq * 1.2), 0.8 * (1 - hq));
          for (var hk = 0; hk < 12; hk++) {
            var ha = hk / 12 * TAU + 0.2, hr = s * (0.25 + easeOut(hq) * 0.9);
            ctx.fillStyle = hexA(hk % 3 === 0 ? accent : hk % 3 === 1 ? '#FFFFFF' : glow, 1 - hq);
            sparkPath(ctx, starX + Math.cos(ha) * hr, starY + Math.sin(ha) * hr, s * 0.07 * (1 - hq * 0.5)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // super: two babies rise in from the sides, facing their mum
        if (T.babies) {
          var bs2 = s * 0.6, off = Math.min(W * 0.36, s * 1.55);
          [[-1, 1, PINK, 0], [1, -1, TEAL, 0.07]].forEach(function (B) {
            var q = clamp01((t - ms(T.babies[0] + B[3])) / (ms(T.babies[1]) - ms(T.babies[0])));
            if (q <= 0) return;
            var bx = cx + B[0] * off, by = lerp(H + bs2 * 1.3, baseY + s * 0.25, easeOutBack(q)) + Math.sin(t * 0.005 + B[3] * 20) * bs2 * 0.06;
            var flip = q > 0.7 && B[0] < 0 ? easeInOut((q - 0.7) / 0.3) * TAU : 0;
            drawSeahorse(bx, by, bs2, B[1], B[1] * -flip + Math.sin(t * 0.004 + B[0]) * 0.08, { tailK: 0, flap: flap * 1.2 + B[0], happy: q >= 1, blink: 1 }, B[2]);
          });
        }

        // rising bubbles (super: all pop into sparkles; normal: some do)
        for (var bi = 0; bi < bubbles.length; bi++) {
          var Bu = bubbles[bi], bt = t - Bu.delay;
          if (bt <= 0) continue;
          var br = (10 + 10 * Bu.r) * unit + 3;
          var by0 = H + br - bt * Bu.sp * H / 1000;
          var bx0 = Bu.x * W + Math.sin(bt * 0.003 * Bu.wob + Bu.ph) * 14 * unit;
          var popY = Bu.pop > 0 ? Bu.pop * H : -br * 2;
          if (by0 > popY) {
            ctx.globalAlpha = 0.9 * clamp01(bt / 200);
            var squish = 1 + 0.06 * Math.sin(bt * 0.012 + Bu.ph);
            ctx.drawImage(bub, bx0 - br * squish, by0 - br / squish, br * 2 * squish, br * 2 / squish);
            ctx.globalAlpha = 1;
          } else if (Bu.pop > 0) {
            var tPop = (H + br - popY) / (Bu.sp * H / 1000), pq = (bt - tPop) / 420;
            if (pq > 0 && pq < 1) {
              var px0 = Bu.x * W + Math.sin(tPop * 0.003 * Bu.wob + Bu.ph) * 14 * unit;
              ctx.globalCompositeOperation = 'lighter';
              ctx.strokeStyle = 'rgba(220,245,255,' + (0.7 * (1 - pq)).toFixed(3) + ')'; ctx.lineWidth = 1.5;
              ctx.beginPath(); ctx.arc(px0, popY, br * (1 + pq * 0.8), 0, TAU); ctx.stroke();
              for (var pk = 0; pk < 6; pk++) {
                var pa = pk / 6 * TAU + Bu.ph, pr = br * (0.8 + easeOut(pq) * 1.6);
                ctx.fillStyle = hexA(Bu.col, 1 - pq);
                sparkPath(ctx, px0 + Math.cos(pa) * pr, popY + Math.sin(pa) * pr, br * 0.45 * (1 - pq * 0.6)); ctx.fill();
              }
              ctx.globalCompositeOperation = 'source-over';
            }
          }
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq2 = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq2 > 0 ? easeOutBack(pq2) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq2 * 2, 1) * gFade);
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
        spr = null; bub = null;
      };
    }
  });
})();
