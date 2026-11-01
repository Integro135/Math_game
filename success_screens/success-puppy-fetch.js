/* success-puppy-fetch.js — מסך הצלחה: גּוּר מֵבִיא כַּדּוּר 🐶
   גור כלבים חמוד בצבע דבש (מבט צד: עין אחת, אוזן מתנפנפת, זנב מכשכש, כפות עם
   כריות אצבעות ורודות) רץ פנימה אחרי כדור אדום קופץ, מזנק באוויר ותופס אותו בפה,
   נוחת, מתיישב בגאווה ומניח את הכדור לפני הכפות — פותח פה בחיוך עם לשון,
   הזנב מכשכש ולבבות קטנים צפים מעלה.
   בסופר: במקום כדור הגור מביא כוכב זהב נוצץ, גור שני (לבן עם כתם חום) רץ
   מהצד השני ומתיישב מולו, ושובל עקבות כפות זהובות מנצנץ על הקרקע.
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
  function rot2(px, py, cx, cy, a) {
    var c = Math.cos(a), s = Math.sin(a), dx = px - cx, dy = py - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }
  function wob(dt, k) { return dt <= 0 ? 0 : Math.sin(dt * 0.026) * Math.exp(-dt * (k || 0.0065)); }
  // two-bone IK: knee position for a leg from top to paw (sign picks the bend side)
  function ikKnee(top, paw, L, sign) {
    var dx = paw[0] - top[0], dy = paw[1] - top[1], d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
    var dd = Math.min(d, 2 * L - 1e-3), a = dd / 2, h = Math.sqrt(Math.max(0, L * L - a * a));
    var mx = top[0] + dx / d * a, my = top[1] + dy / d * a;
    return [mx + (-dy / d) * h * sign, my + (dx / d) * h * sign];
  }

  var HONEY = { fur: '#F4C690', far: '#C98D55', ear: '#9C5E33', muzzle: '#FFF1DC', line: '#6E4022', belly: '#FFE7C6', hi: '#FFE2B8', patch: null };
  var SNOWY = { fur: '#FBF7F2', far: '#D3C8BC', ear: '#8A6450', muzzle: '#FFFFFF', line: '#5E4A40', belly: '#FFFFFF', hi: '#FFFFFF', patch: '#C99A76' };

  window.SUCCESS.styles.push({
    name: 'puppy-fetch',
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

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { run: 0.22, jump: [0.22, 0.36], sit: [0.37, 0.45], drop: [0.46, 0.5], rest: 0.57, hearts: 0.5, txt: 0.3,
            p2: [0.4, 0.58], p2sit: [0.55, 0.64] }
        : { run: 0.34, jump: [0.34, 0.52], sit: [0.53, 0.63], drop: [0.64, 0.7], rest: 0.79, hearts: 0.66, txt: 0.4,
            p2: null, p2sit: null };
      function ms(f) { return f * dur; }
      var CATCH = (T.jump[0] + T.jump[1]) / 2;
      var JQ_CATCH = 0.5;

      // hearts + background twinkles
      var hearts = [];
      var nH = isSuper ? 14 : 8;
      for (var h0 = 0; h0 < nH; h0++)
        hearts.push({ who: isSuper ? h0 % 2 : 0, t0: ms(T.hearts) + h0 * (isSuper ? 110 : 120), dx: rnd(-0.35, 0.35), sw: rnd(0, TAU),
                      r: rnd(0.08, 0.13), col: h0 % 3 === 0 ? primary : h0 % 3 === 1 ? '#FF7FA8' : '#FF9FCB' });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      var starBurst = [];
      for (var sb = 0; sb < 18; sb++) starBurst.push({ a: sb / 18 * TAU + rnd(-0.1, 0.1), d: rnd(0.8, 1.6), r: rnd(0.06, 0.11) });

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
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── the puppy (side view, facing +x; local units; origin = ground under the hips) ───
      function pose(st) {
        var k = st.sit, j = st.jump, rn = st.run, ph = st.ph;
        var hip = [lerp(-0.42, -0.3, k), lerp(-0.64, -0.32, k)];
        var sh = [lerp(0.32, 0.12, k), lerp(-0.68, -0.8, k)];
        var ft = [sh[0] + 0.02, sh[1] + 0.1], bt = [hip[0] + 0.02, hip[1] + 0.06];
        function target(top, front, phase, sitX) {
          var rx = top[0] + (front ? 0.06 : -0.02) + 0.3 * Math.sin(phase) * rn;
          var ry = -Math.max(0, Math.cos(phase)) * 0.17 * rn;
          var jx = top[0] + (front ? 0.36 : -0.44), jy = top[1] + 0.38;
          return [lerp(lerp(rx, jx, j), sitX, k), lerp(lerp(ry, jy, j), 0, k)];
        }
        var legs = {
          fn: { top: ft, paw: target(ft, true, ph, 0.27), L: 0.36, w: 0.15 },
          ff: { top: ft, paw: target(ft, true, ph + 0.8, 0.36), L: 0.36, w: 0.14 },
          bn: { top: bt, paw: target(bt, false, ph + Math.PI, 0.05), L: 0.35, w: 0.16 },
          bf: { top: bt, paw: target(bt, false, ph + Math.PI + 0.8, 0.12), L: 0.35, w: 0.15 }
        };
        for (var key in legs) { var lg = legs[key]; lg.knee = ikKnee(lg.top, lg.paw, lg.L, -1); }
        var head = [sh[0] + lerp(0.25, 0.15, k), sh[1] + lerp(-0.27, -0.34, k)];
        var tail = [lerp(hip[0] - 0.17, hip[0] - 0.2, k), lerp(hip[1] - 0.07, hip[1] + 0.2, k)];
        return { hip: hip, sh: sh, legs: legs, head: head, tail: tail };
      }
      // local point (in head frame when inHead) → world
      function toWorld(X, Y, s, dir, st, P, lx, ly, inHead) {
        var p = [lx, ly];
        if (inHead) { p = rot2(lx, ly, 0, 0, st.tilt || 0); p[0] += P.head[0]; p[1] += P.head[1]; }
        p = rot2(p[0], p[1], 0, -0.6, st.rot || 0);
        return [X + dir * s * p[0] * (st.sqx || 1), Y + s * p[1] * (st.sqy || 1)];
      }
      function legStroke(lg, w, col) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(lg.top[0], lg.top[1]); ctx.lineTo(lg.knee[0], lg.knee[1]); ctx.lineTo(lg.paw[0], lg.paw[1] - 0.04); ctx.stroke();
      }
      function drawPaw(lg, C, col, near) {
        var x = lg.paw[0] + 0.04, y = lg.paw[1] - 0.06, lifted = -lg.paw[1];
        // toe pads peek out underneath when the paw is in the air
        if (near && lifted > 0.03) {
          ctx.fillStyle = '#FF9DB5';
          ctx.beginPath(); ctx.ellipse(x - 0.03, y + 0.055, 0.045, 0.028, 0, 0, TAU); ctx.fill();
          [[0.035, 0.06], [0.075, 0.05], [0.108, 0.03]].forEach(function (b) { ctx.beginPath(); ctx.arc(x + b[0], y + b[1], 0.02, 0, TAU); ctx.fill(); });
        }
        ctx.fillStyle = col; ctx.strokeStyle = C.line; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.ellipse(x, y, 0.105, 0.064, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // toes
        ctx.strokeStyle = hexA(C.line, 0.7); ctx.lineWidth = 0.018;
        ctx.beginPath(); ctx.moveTo(x + 0.035, y - 0.045); ctx.lineTo(x + 0.04, y + 0.0);
        ctx.moveTo(x + 0.072, y - 0.035); ctx.lineTo(x + 0.074, y + 0.005); ctx.stroke();
      }
      function drawDog(X, Y, s, dir, st, C) {
        var P = pose(st);
        ctx.save();
        ctx.translate(X, Y); ctx.scale(dir * s * (st.sqx || 1), s * (st.sqy || 1));
        ctx.translate(0, -0.6); ctx.rotate(st.rot || 0); ctx.translate(0, 0.6);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var L = P.legs;
        // far legs (shaded, behind)
        ctx.save(); ctx.translate(0.05, -0.02);
        legStroke(L.ff, L.ff.w + 0.05, C.line); legStroke(L.ff, L.ff.w, C.far); drawPaw(L.ff, C, C.far, false);
        legStroke(L.bf, L.bf.w + 0.05, C.line); legStroke(L.bf, L.bf.w, C.far); drawPaw(L.bf, C, C.far, false);
        ctx.restore();
        // tail: wagging curve
        var tb = P.tail, wag = st.wag || 0;
        var t1 = rot2(tb[0] - 0.14, tb[1] - 0.2, tb[0], tb[1], wag), t2 = rot2(tb[0] - 0.08, tb[1] - 0.42, tb[0], tb[1], wag * 1.3);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.15;
        ctx.beginPath(); ctx.moveTo(tb[0] + 0.05, tb[1]); ctx.quadraticCurveTo(t1[0], t1[1], t2[0], t2[1]); ctx.stroke();
        ctx.strokeStyle = C.fur; ctx.lineWidth = 0.1;
        ctx.beginPath(); ctx.moveTo(tb[0] + 0.05, tb[1]); ctx.quadraticCurveTo(t1[0], t1[1], t2[0], t2[1]); ctx.stroke();
        ctx.fillStyle = C.hi; ctx.beginPath(); ctx.arc(t2[0], t2[1], 0.045, 0, TAU); ctx.fill();
        // body + near legs: outline pass, then fill pass
        var hp = P.hip, sp = P.sh;
        var bx = (hp[0] + sp[0]) / 2, by = (hp[1] + sp[1]) / 2;
        var ba = Math.atan2(sp[1] - hp[1], sp[0] - hp[0]);
        var blen = Math.sqrt((sp[0] - hp[0]) * (sp[0] - hp[0]) + (sp[1] - hp[1]) * (sp[1] - hp[1]));
        var brx = blen / 2 + 0.2, bry = 0.26;
        var thC = [lerp(L.bn.top[0], L.bn.knee[0], 0.45), lerp(L.bn.top[1], L.bn.knee[1], 0.45)];
        var thA = Math.atan2(L.bn.knee[1] - L.bn.top[1], L.bn.knee[0] - L.bn.top[0]);
        var thRx = 0.22 + 0.05 * st.sit, thRy = 0.15 + 0.04 * st.sit;
        function bodyShapes(pass) {
          var o = pass === 0;
          ctx.fillStyle = C.fur; ctx.strokeStyle = C.line; ctx.lineWidth = 0.06;
          ctx.beginPath(); ctx.ellipse(bx, by, brx, bry, ba, 0, TAU); o ? ctx.stroke() : ctx.fill();
          if (!o) {
            ctx.save(); ctx.beginPath(); ctx.ellipse(bx, by, brx, bry, ba, 0, TAU); ctx.clip();
            ctx.fillStyle = C.belly;
            var bp = rot2(bx, by + bry * 0.95, bx, by, ba);
            ctx.beginPath(); ctx.ellipse(bp[0], bp[1], brx * 0.75, bry * 0.45, ba, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.28)';
            var hpp = rot2(bx, by - bry * 0.6, bx, by, ba);
            ctx.beginPath(); ctx.ellipse(hpp[0], hpp[1], brx * 0.55, bry * 0.16, ba, 0, TAU); ctx.fill();
            ctx.restore();
          }
          legStroke(L.bn, L.bn.w + (o ? 0.06 : 0), o ? C.line : C.fur);
          ctx.fillStyle = C.fur;
          ctx.beginPath(); ctx.ellipse(thC[0], thC[1], thRx, thRy, thA, 0, TAU); o ? ctx.stroke() : ctx.fill();
          legStroke(L.fn, L.fn.w + (o ? 0.06 : 0), o ? C.line : C.fur);
        }
        bodyShapes(0); bodyShapes(1);
        // a soft crease so the haunch reads
        ctx.strokeStyle = hexA(C.line, 0.35); ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.ellipse(thC[0], thC[1], thRx, thRy, thA, -Math.PI * 0.95, -Math.PI * 0.2); ctx.stroke();
        drawPaw(L.bn, C, C.fur, true);
        drawPaw(L.fn, C, C.fur, true);
        // collar
        var hd = P.head, nx = hd[0] - sp[0], ny = hd[1] - sp[1];
        var cx0 = sp[0] + nx * 0.42, cy0 = sp[1] + ny * 0.42, na = Math.atan2(ny, nx);
        ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(na + Math.PI / 2);
        ctx.fillStyle = st.collar; ctx.strokeStyle = C.line; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.rect(-0.21, -0.045, 0.42, 0.09); ctx.fill(); ctx.stroke();
        ctx.restore();
        var tag = [cx0 + Math.cos(na + Math.PI / 2) * -0.17 + 0.02, cy0 + Math.sin(na + Math.PI / 2) * -0.17 + 0.07];
        ctx.fillStyle = '#FFD24A'; ctx.strokeStyle = '#A8781A'; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.arc(tag[0], tag[1], 0.05, 0, TAU); ctx.fill(); ctx.stroke();

        // head
        ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(st.tilt || 0);
        function headShapes(pass) {
          var o = pass === 0;
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.06; ctx.fillStyle = C.fur;
          ctx.beginPath(); ctx.arc(0, 0, 0.28, 0, TAU); o ? ctx.stroke() : ctx.fill();
          ctx.fillStyle = C.muzzle;
          ctx.beginPath(); ctx.ellipse(0.27, 0.06, 0.2, 0.135, 0.05, 0, TAU); o ? ctx.stroke() : ctx.fill();
        }
        headShapes(0); headShapes(1);
        // fur cap highlight
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.ellipse(-0.02, -0.18, 0.14, 0.05, -0.2, 0, TAU); ctx.fill();
        if (C.patch) { ctx.fillStyle = C.patch; ctx.beginPath(); ctx.ellipse(0.1, -0.07, 0.11, 0.095, 0.2, 0, TAU); ctx.fill(); }
        // mouth: hinge J under the cheek, upper lip U, lower jaw rotates down to open
        var J = [0.1, 0.15], U = [0.44, 0.13], ja = st.jaw || 0;
        if (ja > 0.02) {
          var Lp = rot2(U[0], U[1], J[0], J[1], ja);
          var mg = ctx.createLinearGradient(J[0], J[1], Lp[0], (U[1] + Lp[1]) / 2);
          mg.addColorStop(0, '#3A0E1A'); mg.addColorStop(0.35, '#8E2C4A'); mg.addColorStop(1, '#E06A8C');
          ctx.fillStyle = mg;
          ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.lineTo(U[0], U[1]); ctx.lineTo(Lp[0], Lp[1]); ctx.closePath(); ctx.fill();
          // tongue resting on the lower jaw (out & lolling when happy)
          ctx.fillStyle = '#FF8FAE'; ctx.strokeStyle = '#D9577D'; ctx.lineWidth = 0.015;
          var tm = [lerp(J[0], Lp[0], 0.62), lerp(J[1], Lp[1], 0.62) - 0.02];
          ctx.beginPath(); ctx.ellipse(tm[0], tm[1], 0.14, 0.045, ja, 0, TAU); ctx.fill();
          if (st.tongueOut) {
            ctx.beginPath(); ctx.ellipse(Lp[0] - 0.01, Lp[1] + 0.06, 0.055, 0.085, 0.15, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(Lp[0] - 0.01, Lp[1] + 0.02); ctx.lineTo(Lp[0] - 0.005, Lp[1] + 0.09); ctx.stroke();
          }
          // lower jaw (fur)
          ctx.fillStyle = C.muzzle; ctx.strokeStyle = C.line; ctx.lineWidth = 0.025;
          var lb = rot2(U[0] - 0.06, U[1] + 0.1, J[0], J[1], ja), lc = rot2(U[0] + 0.02, U[1] + 0.07, J[0], J[1], ja);
          var lm = rot2(0.22, J[1] + 0.12, J[0], J[1], ja);
          ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.lineTo(Lp[0], Lp[1]); ctx.quadraticCurveTo(lc[0], lc[1], lb[0], lb[1]);
          ctx.quadraticCurveTo(lm[0], lm[1], J[0] - 0.02, J[1] + 0.07); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.022;
          ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.lineTo(U[0], U[1]); ctx.stroke();
        } else {
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.022;
          ctx.beginPath(); ctx.moveTo(0.44, 0.06); ctx.lineTo(0.43, 0.12); ctx.quadraticCurveTo(0.33, 0.17, 0.22, 0.12); ctx.stroke();
        }
        // nose
        ctx.fillStyle = '#2B1A1A';
        ctx.beginPath(); ctx.ellipse(0.455, 0.0, 0.062, 0.05, 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(0.44, -0.02, 0.022, 0.013, -0.3, 0, TAU); ctx.fill();
        // blush
        ctx.fillStyle = 'rgba(255,120,150,.5)';
        ctx.beginPath(); ctx.ellipse(0.11, 0.09, 0.065, 0.038, 0, 0, TAU); ctx.fill();
        // ONE eye (true side view)
        if (st.happy) {
          ctx.strokeStyle = '#24140F'; ctx.lineWidth = 0.032;
          ctx.beginPath(); ctx.arc(0.12, -0.04, 0.06, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
        } else {
          var bl = st.blink == null ? 1 : st.blink;
          ctx.fillStyle = '#24140F';
          ctx.beginPath(); ctx.ellipse(0.12, -0.06, 0.058, 0.07 * Math.max(0.1, bl), 0, 0, TAU); ctx.fill();
          if (bl > 0.5) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(0.135, -0.085, 0.022, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(0.1, -0.035, 0.011, 0, TAU); ctx.fill();
          }
        }
        // floppy ear over the back of the head
        ctx.save(); ctx.translate(-0.07, -0.19); ctx.rotate(0.25 + (st.ear || 0));
        ctx.fillStyle = C.ear; ctx.strokeStyle = C.line; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(-0.07, 0);
        ctx.bezierCurveTo(-0.13, 0.12, -0.1, 0.34, 0.0, 0.37);
        ctx.bezierCurveTo(0.1, 0.36, 0.11, 0.14, 0.08, -0.01); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.ellipse(-0.02, 0.12, 0.025, 0.09, 0.1, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.restore();   // head
        ctx.restore();
        return P;
      }

      function drawBall(x, y, r, spin) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
        var g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#FF8FA2'); g.addColorStop(0.6, '#F23C5E'); g.addColorStop(1, '#B51E40');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.28;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 1.2, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#7E1430'; ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.13, -0.6, 0, TAU); ctx.fill();
      }
      function starPath(r, inner) {
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
          var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r;
          if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
      }
      function drawStar(x, y, r, spin, t) {
        var gg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        gg.addColorStop(0, hexA('#FFE89A', 0.55)); gg.addColorStop(1, hexA('#FFD24A', 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
        ctx.lineJoin = 'round';
        var g = ctx.createLinearGradient(0, -r, 0, r);
        g.addColorStop(0, '#FFF3A8'); g.addColorStop(0.5, '#FFD23A'); g.addColorStop(1, '#F0A51C');
        ctx.fillStyle = g; ctx.strokeStyle = '#B9790E'; ctx.lineWidth = r * 0.12;
        starPath(r, 0.5); ctx.stroke(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.16, r * 0.08, -0.6, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#FFFFFF', 0.5 + 0.5 * Math.sin(t * 0.012));
        sparkPath(ctx, x + r * 0.7, y - r * 0.8, r * 0.35); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      function heartPath(x, y, r) {
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.3, y + r * 0.1, x - r * 0.9, y - r * 1.0, x, y - r * 0.35);
        ctx.bezierCurveTo(x + r * 0.9, y - r * 1.0, x + r * 1.3, y + r * 0.1, x, y + r * 0.9); ctx.closePath();
      }
      function pawPrint(x, y, r, a, flip) {
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); ctx.globalAlpha = a;
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); ctx.fill();
        for (var i = 0; i < 4; i++) {
          var ta = -Math.PI / 2 + (i - 1.5) * 0.55;
          ctx.beginPath(); ctx.arc(Math.cos(ta) * r * 1.35 * flip + (flip > 0 ? r * 0.25 : -r * 0.25), Math.sin(ta) * r * 1.35, r * 0.36, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }

      // ─── per-dog motion ───
      function dogs(s, G) {
        var list = [];
        var finalX = isSuper ? W / 2 - 1.05 * s : W / 2 - 0.3 * s;
        list.push({ dir: 1, C: HONEY, collar: primary, xStart: -1.4 * s, xJ: finalX - 1.1 * s, xL: finalX, jump: true,
                    tRun1: ms(T.run), tJ0: ms(T.jump[0]), tJ1: ms(T.jump[1]), tS0: ms(T.sit[0]), tS1: ms(T.sit[1]) });
        if (isSuper)
          list.push({ dir: -1, C: SNOWY, collar: glow, xStart: W + 1.4 * s, xL: W / 2 + 1.05 * s, jump: false,
                      tR0: ms(T.p2[0]), tR1: ms(T.p2[1]), tS0: ms(T.p2sit[0]), tS1: ms(T.p2sit[1]) });
        return list;
      }
      function dogState(d, t, s, G) {
        var st = { run: 0, jump: 0, sit: 0, ph: 0, rot: 0, sqx: 1, sqy: 1, jaw: 0, wag: 0, ear: 0.2, tilt: 0, collar: d.collar };
        var x, lift = 0, dist;
        if (d.jump) {
          if (t < d.tRun1) {
            x = lerp(d.xStart, d.xJ, t / d.tRun1); st.run = 1;
          } else if (t < d.tJ1) {
            var q = (t - d.tJ0) / (d.tJ1 - d.tJ0);
            x = lerp(d.xJ, d.xL, q); lift = 4 * q * (1 - q) * 1.0;
            var ex = Math.pow(Math.sin(Math.PI * q), 0.6);
            st.jump = ex; st.run = 1 - ex; st.rot = (-0.32 + 0.6 * q) * Math.pow(Math.sin(Math.PI * q), 0.5);
            st.tilt = -0.15 * ex;
          } else {
            x = d.xL;
            var sq = wob(t - d.tJ1, 0.009) * 0.14;
            st.sqx = 1 + sq; st.sqy = 1 - sq;
          }
          dist = (Math.min(x, d.xJ) - d.xStart) / s;
        } else {
          var rq = clamp01((t - d.tR0) / (d.tR1 - d.tR0));
          x = lerp(d.xStart, d.xL, 1 - Math.pow(1 - rq, 1.7));
          st.run = t < d.tR0 ? 0 : 1 - clamp01((rq - 0.78) / 0.22);
          dist = Math.abs(x - d.xStart) / s;
        }
        st.ph = dist / 0.95 * TAU;
        st.sit = easeInOut((t - d.tS0) / (d.tS1 - d.tS0));
        if (!d.jump && t > d.tR1) { var sq2 = wob(t - d.tR1, 0.01) * 0.06; st.sqx = 1 + sq2; st.sqy = 1 - sq2; }
        var bob = -Math.abs(Math.sin(st.ph)) * 0.06 * st.run;
        st.ear = st.run > 0.3 ? 0.7 + 0.35 * Math.sin(st.ph * 2) : st.jump > 0.2 ? 1.25 : 0.2 + 0.25 * wob(t - (d.jump ? d.tJ1 : d.tR1), 0.007);
        st.wag = Math.sin(t * (st.sit > 0.5 ? 0.03 : 0.022)) * (st.sit > 0.5 ? 0.45 : 0.3);
        st.tilt += st.sit * -0.1;
        st.jaw = st.run > 0.5 && st.jump < 0.1 ? 0.3 : 0;
        st.tongueOut = st.run > 0.5 && st.jump < 0.1;
        st.blink = 1;
        return { x: x, y: G + bob * s - lift * s, st: st };
      }

      var raf = 0, killed = false, t0 = performance.now();
      var catchPt = null, catchKey = '';
      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var portrait = W < H;
        var s = Math.min(W * 0.24, H * 0.19) * (isSuper ? 0.85 : 1);
        var G = H * (portrait ? 0.74 : 0.82);
        var D = dogs(s, G);
        var main = D[0];
        var BR = isSuper ? 0.2 : 0.16;            // ball / star radius (s units)
        var MOUTH = [0.5, 0.25];                  // ball centre in the head frame while held

        // catch point = where the mouth is at the jump's apex
        var key = W + 'x' + H;
        if (key !== catchKey) {
          catchKey = key;
          var tc = lerp(main.tJ0, main.tJ1, JQ_CATCH);
          var ds = dogState(main, tc, s, G); ds.st.jaw = 0.55;
          var Pp = pose(ds.st);
          catchPt = toWorld(ds.x, ds.y, s, 1, ds.st, Pp, MOUTH[0], MOUTH[1], true);
        }

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // soft glowing ground line + meadow glow
        var mg = ctx.createRadialGradient(W / 2, G, 0, W / 2, G, Math.max(W * 0.55, s * 3));
        mg.addColorStop(0, hexA(glow, 0.18)); mg.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
        var gl = ctx.createLinearGradient(0, 0, W, 0);
        gl.addColorStop(0, hexA(glow, 0)); gl.addColorStop(0.5, hexA(glow, 0.55)); gl.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = gl; ctx.fillRect(0, G + s * 0.01, W, Math.max(1.5, 2.5 * unit));

        // super: sparkling golden paw-print trail
        if (isSuper) {
          D.forEach(function (d, di) {
            var ds2 = dogState(d, t, s, G), step = 0.5 * s;
            for (var n = 0; n < 40; n++) {
              var px = d.xStart + d.dir * (0.4 * s + n * step);
              if ((d.dir > 0 && px > (d.jump ? d.xJ + 0.2 * s : d.xL)) || (d.dir < 0 && px < d.xL + 0.3 * s)) break;
              if (px < -20 || px > W + 20) continue;
              var passed = d.dir > 0 ? ds2.x - px : px - ds2.x;
              if (passed < 0) continue;
              var age = passed / s;
              var a = 0.9 - 0.45 * clamp01(age / 3);
              var py = G + s * (n % 2 ? 0.09 : 0.03);
              pawPrint(px, py, s * 0.075, a, d.dir);
              var tw = 0.5 + 0.5 * Math.sin(t * 0.012 + n * 1.7 + di);
              ctx.globalCompositeOperation = 'lighter';
              ctx.fillStyle = hexA(n % 2 ? '#FFFFFF' : accent, (age < 0.6 ? 1 - age / 0.6 : 0) + 0.45 * tw * a);
              sparkPath(ctx, px + s * 0.08, py - s * (0.08 + 0.1 * clamp01(age)), s * (0.05 + 0.03 * tw)); ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }
          });
        }

        // ─── the ball / star path ───
        var bx, by, held = false, spin = 0, bAlpha = 1;
        var Gb = G - BR * s;
        var tCatch = lerp(main.tJ0, main.tJ1, JQ_CATCH);
        var tDrop = ms(T.drop[0]), tLandB = ms(T.drop[1]), tRest = ms(T.rest);
        if (t < tCatch) {
          var x0 = W * 0.02, y0 = G - 1.5 * s, cx = catchPt[0], cy = catchPt[1];
          var xs = [x0, lerp(x0, cx, 0.36), lerp(x0, cx, 0.63), lerp(x0, cx, 0.84), cx];
          var ts = [0, tCatch * 0.24, tCatch * 0.48, tCatch * 0.7, tCatch];
          var seg = t < ts[1] ? 0 : t < ts[2] ? 1 : t < ts[3] ? 2 : 3;
          var q = (t - ts[seg]) / (ts[seg + 1] - ts[seg]);
          bx = lerp(xs[seg], xs[seg + 1], q);
          if (seg === 0) by = lerp(y0, Gb, q * q);
          else if (seg === 3) by = Gb + (cy - Gb) * (1 - (1 - q) * (1 - q));
          else by = Gb - 4 * q * (1 - q) * s * (seg === 1 ? 1.1 : 0.8);
          spin = (bx - x0) / (BR * s);
          bAlpha = clamp01(t / 120);
        } else if (t < tDrop) {
          held = true;
        } else {
          // falls from the mouth, bounces twice, rolls to rest
          var dsD = dogState(main, tDrop, s, G); dsD.st.jaw = 0.55;
          var mp = toWorld(dsD.x, dsD.y, s, 1, dsD.st, pose(dsD.st), MOUTH[0], MOUTH[1], true);
          var restX = isSuper ? W / 2 : mp[0] + 0.3 * s;
          if (t < tLandB) {
            var fq = (t - tDrop) / (tLandB - tDrop);
            bx = lerp(mp[0], lerp(mp[0], restX, 0.4), fq); by = lerp(mp[1], Gb, fq * fq);
          } else {
            var rq = clamp01((t - tLandB) / (tRest - tLandB));
            bx = lerp(lerp(mp[0], restX, 0.4), restX, easeOut(rq));
            var b1 = 0.6;
            by = rq < b1 ? Gb - 4 * (rq / b1) * (1 - rq / b1) * s * 0.32 : Gb - 4 * ((rq - b1) / (1 - b1)) * (1 - (rq - b1) / (1 - b1)) * s * 0.1;
          }
          spin = (bx - mp[0]) / (BR * s);
        }

        // shadows on the ground
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        D.forEach(function (d) {
          var dsS = dogState(d, t, s, G), lift = (G - dsS.y) / s;
          var sw = 0.62 * (1 - 0.35 * clamp01(lift));
          ctx.beginPath(); ctx.ellipse(dsS.x + d.dir * s * 0.02, G + s * 0.01, s * sw, s * 0.07 * (1 - 0.4 * clamp01(lift)), 0, 0, TAU); ctx.fill();
        });
        if (!held && bx != null) {
          var bl2 = clamp01((Gb - by) / (s * 1.5));
          ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * (1 - bl2) * bAlpha).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(bx, G + s * 0.01, BR * s * (1 - 0.4 * bl2), BR * s * 0.3, 0, 0, TAU); ctx.fill();
        }

        // ─── dogs ───
        var heads = [];
        D.forEach(function (d, di) {
          if (!d.jump && t < d.tR0) return;
          var ds3 = dogState(d, t, s, G), st = ds3.st;
          if (d.jump) {
            if (t >= tCatch - 40 && t < tDrop) { st.jaw = 0.55; st.tongueOut = false; }
            if (t >= tCatch && t < tCatch + 350) st.happy = true;
            if (t >= tDrop - 60) { st.jaw = t < tDrop ? 0.55 : 0.32; st.tongueOut = t > tDrop + 150; st.happy = t > tLandB + 100; }
          } else if (t > d.tS0) { st.jaw = 0.32; st.tongueOut = true; st.happy = t > d.tS1; }
          var blq = (t - (d.jump ? ms(0.1) : d.tR0 + 300)) / 150;
          if (blq > 0 && blq < 1) st.blink = Math.abs(Math.cos(blq * Math.PI));
          var P = drawDog(ds3.x, ds3.y, s, d.dir, st, d.C);
          heads.push(toWorld(ds3.x, ds3.y, s, d.dir, st, P, 0, -0.3, true));
          if (d.jump && held) {
            var hp = toWorld(ds3.x, ds3.y, s, 1, st, P, MOUTH[0], MOUTH[1], true);
            bx = hp[0]; by = hp[1]; spin = 0;
          }
        });

        // ─── ball / star ───
        if (bx != null) {
          ctx.globalAlpha = bAlpha;
          if (isSuper) drawStar(bx, by, BR * s, spin * 0.25 + (held ? -0.2 : 0), t);
          else drawBall(bx, by, BR * s, spin);
          ctx.globalAlpha = 1;
        }
        // catch sparkle
        var cq = (t - tCatch) / 520;
        if (cq > 0 && cq < 1) {
          ctx.globalCompositeOperation = 'lighter';
          for (var ck = 0; ck < 10; ck++) {
            var ca = ck / 10 * TAU, cr = s * (0.2 + easeOut(cq) * 0.7);
            ctx.fillStyle = hexA(ck % 2 ? '#FFFFFF' : accent, 1 - cq);
            sparkPath(ctx, catchPt[0] + Math.cos(ca) * cr, catchPt[1] + Math.sin(ca) * cr, s * 0.07 * (1 - cq * 0.5)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        // super: the star lands with a golden burst
        if (isSuper) {
          var sq3 = (t - tLandB) / 900;
          if (sq3 > 0 && sq3 < 1 && bx != null) {
            ctx.globalCompositeOperation = 'lighter';
            starBurst.forEach(function (b, bi) {
              var e = easeOut(sq3), r0 = s * b.d * e;
              ctx.fillStyle = hexA(bi % 3 ? accent : '#FFFFFF', 1 - sq3);
              sparkPath(ctx, bx + Math.cos(b.a) * r0, Gb + Math.sin(b.a) * r0 * 0.6 - s * 0.2 * e, s * b.r * (1 - sq3 * 0.4)); ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // hearts floating up from the head(s)
        for (var hi = 0; hi < hearts.length; hi++) {
          var Hh = hearts[hi], hq = (t - Hh.t0) / 1300;
          if (hq <= 0 || hq >= 1 || !heads[Hh.who]) continue;
          var hd = heads[Hh.who];
          var hx = hd[0] + Hh.dx * s + Math.sin(hq * 6 + Hh.sw) * s * 0.12, hy = hd[1] - s * 0.2 - easeOut(hq) * s * 1.3;
          var ha = clamp01(hq * 6) * (1 - clamp01((hq - 0.65) / 0.35));
          var hr = Hh.r * s * (0.6 + 0.4 * easeOutBack(clamp01(hq * 3)));
          ctx.globalAlpha = ha;
          ctx.fillStyle = Hh.col; heartPath(hx, hy, hr); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)';
          ctx.beginPath(); ctx.ellipse(hx - hr * 0.38, hy - hr * 0.3, hr * 0.2, hr * 0.12, -0.6, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
        }
        if (killed) return;
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
