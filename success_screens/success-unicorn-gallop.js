/* success-unicorn-gallop.js — מסך הצלחה: חַד-קֶרֶן דּוֹהֶרֶת 🦄
   חד-קרן חמודה (מבט צד: עין אחת, רעמה בצבעי הקשת, קרן זהב) דוהרת פנימה
   על קשת בענן שהיא עצמה מציירת מאחוריה — פסי הקשת נמתחים מתחת לפרסותיה
   ואבקת נצנצים נושרת מהם. בקצה הקשת היא מזנקת, נוחתת במרכז בפרץ של כוכבים,
   ומתרוממת על רגליה האחוריות בשמחה.
   בסופר: הקשת הופכת לקשת כפולה מלאה מעל כל המסך (עם עננים ברגליה), שני
   סייחי חד-קרן קטנים דוהרים אחריה, וממטר לבבות נוצצים יורד מלמעלה.
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
  function starPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function heartPath(ctx, x, y, sz, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sz, sz);
    ctx.beginPath(); ctx.moveTo(0, 0.38);
    ctx.bezierCurveTo(-0.6, 0.02, -0.52, -0.5, 0, -0.2);
    ctx.bezierCurveTo(0.52, -0.5, 0.6, 0.02, 0, 0.38); ctx.closePath();
    ctx.restore();
  }

  var RAINBOW = ['#FF6B8B', '#FFA45C', '#FFE066', '#7EE08A', '#6BC5FF', '#B58CFF'];
  var MOM  = { body: '#FFFFFF', shade: '#EEDDF6', line: '#A98BC4', hoof: '#F5C451', hoofD: '#C9932A', blush: '#FF9EC4', ear: '#FFC2DD',
               mane: RAINBOW };
  var BABY1 = { body: '#FFE6F2', shade: '#F7C9E0', line: '#C989AE', hoof: '#F5C451', hoofD: '#C9932A', blush: '#FF8FB8', ear: '#FFB0D2',
               mane: ['#FF8FC8', '#C08CFF', '#FF8FC8', '#C08CFF', '#FF8FC8', '#C08CFF'] };
  var BABY2 = { body: '#E4F6FF', shade: '#C6E4F7', line: '#86A9C9', hoof: '#F5C451', hoofD: '#C9932A', blush: '#FF9EC4', ear: '#FFC2DD',
               mane: ['#6BD6E8', '#FFE066', '#6BD6E8', '#FFE066', '#6BD6E8', '#FFE066'] };

  window.SUCCESS.styles.push({
    name: 'unicorn-gallop',
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
        ? { run: [0.03, 0.27], leap: [0.27, 0.355], rear: [0.38, 0.5], text: 0.33,
            arch: [0.42, 0.56], babyA: [0.44, 0.62], babyB: [0.46, 0.66], hearts: 0.48 }
        : { run: [0.04, 0.44], leap: [0.44, 0.58], rear: [0.62, 0.82], text: 0.55,
            arch: null, babyA: null, babyB: null, hearts: null };
      function ms(f) { return f * dur; }
      var r0 = ms(T.run[0]), r1 = ms(T.run[1]), l0 = ms(T.leap[0]), l1 = ms(T.leap[1]);
      var TH_E = 0.3;                               // the rainbow ends 0.3 rad above the horizon
      function runTheta(t) {
        var q = clamp01((t - r0) / (r1 - r0)), p = (q + q * q) / 2;
        return Math.PI - (Math.PI - TH_E) * p;
      }

      // glitter dust shed from the rainbow while it is being drawn
      var dust = [];
      for (var d0 = 0; d0 < (isSuper ? 46 : 38); d0++)
        dust.push({ tb: lerp(r0, r1, d0 / (isSuper ? 46 : 38)) + rnd(-20, 20), band: rnd(0.1, 1), vx: rnd(-0.4, 0.4), vy: rnd(0.2, 0.9),
                    life: rnd(700, 1100), ph: rnd(0, TAU), c: d0 % 3 === 0 ? accent : d0 % 3 === 1 ? '#FFFFFF' : RAINBOW[d0 % 6] });
      var stars = [];
      var NS = isSuper ? 26 : 18;
      for (var s0 = 0; s0 < NS; s0++) {
        var ang = -Math.PI / 2 + (s0 / NS - 0.5) * Math.PI * 1.7 + rnd(-0.12, 0.12);
        stars.push({ a: ang, v: rnd(0.9, 1.7), r: rnd(0.7, 1.3), spin: rnd(-6, 6), c: [accent, '#FFFFFF', primary, glow, '#FFE066'][s0 % 5] });
      }
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      var hearts = [];
      if (isSuper) {
        for (var h0 = 0; h0 < 38; h0++)
          hearts.push({ x: Math.random(), delay: rnd(0, 1500), v: rnd(0.16, 0.3), sz: rnd(0.7, 1.35), sw: rnd(0.6, 1.6), ph: rnd(0, TAU),
                        spin: rnd(-1.2, 1.2), c: [primary, '#FF7EB6', accent, '#FF9ECF', '#FF6B8B'][h0 % 5] });
      }
      var archGlints = [];
      for (var g0 = 0; g0 < 28; g0++) archGlints.push({ a: rnd(0.04, 0.96), b: rnd(-0.5, 0.5), ph: rnd(0, TAU), rate: rnd(3, 7) });

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

      // ─── unicorn drawing (side view facing +x; units = s; origin = ground under the belly) ───
      var L1 = 0.31, L2 = 0.3;
      function legPts(hx, hy, a, b) {
        var kx = hx + Math.sin(a) * L1, ky = hy + Math.cos(a) * L1, c = a - b;
        return { kx: kx, ky: ky, fx: kx + Math.sin(c) * L2, fy: ky + Math.cos(c) * L2, c: c };
      }
      function drawLeg(hx, hy, a, b, C, far) {
        var p = legPts(hx, hy, a, b);
        var col = far ? C.shade : C.body;
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.15;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.kx, p.ky); ctx.lineTo(p.fx, p.fy); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 0.115;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(p.kx, p.ky); ctx.lineTo(p.fx, p.fy); ctx.stroke();
        // hoof: a little rounded gold cup at the end of the leg
        ctx.save(); ctx.translate(p.fx, p.fy); ctx.rotate(-p.c);
        ctx.fillStyle = far ? C.hoofD : C.hoof; ctx.strokeStyle = C.hoofD; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(-0.066, -0.01); ctx.lineTo(0.066, -0.01); ctx.lineTo(0.075, 0.07);
        ctx.quadraticCurveTo(0, 0.09, -0.075, 0.07); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      function lock(bx, by, ang, len, wid, curl, col) {
        ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, -wid / 2);
        ctx.bezierCurveTo(len * 0.45, -wid * 0.75 + curl * 0.3, len * 0.8, curl * 0.8 - wid * 0.25, len, curl);
        ctx.bezierCurveTo(len * 0.7, curl * 0.9 + wid * 0.3, len * 0.35, wid * 0.7 + curl * 0.2, 0, wid / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.32)';
        ctx.beginPath(); ctx.ellipse(len * 0.35, -wid * 0.12 + curl * 0.2, len * 0.22, wid * 0.11, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function bodyPath() {
        ctx.beginPath();
        ctx.ellipse(0, -0.72, 0.47, 0.27, 0, 0, TAU);
        ctx.moveTo(0.14, -0.86);
        ctx.quadraticCurveTo(0.26, -1.2, 0.47, -1.37);
        ctx.lineTo(0.7, -1.2);
        ctx.quadraticCurveTo(0.52, -0.95, 0.44, -0.6);
        ctx.closePath();
      }
      function headPath() {
        ctx.beginPath();
        ctx.ellipse(0.61, -1.3, 0.2, 0.17, 0.25, 0, TAU);
        ctx.moveTo(0.97, -1.2);
        ctx.ellipse(0.82, -1.2, 0.15, 0.115, 0.3, 0, TAU);
      }
      // st: phi (gallop phase), gal 0..1, leap 0..1, rear 0..1, happy, blink, tailWave, t
      function legAngles(st, front, far, off) {
        var ph = st.phi + off;
        var ag = 0.6 * Math.sin(ph), bg = 1.0 * Math.max(0, Math.cos(ph)) + 0.15;
        var as = front ? (far ? -0.05 : 0.08) : (far ? 0.06 : -0.07), bs = 0.05;
        var a = lerp(as, ag, st.gal), b = lerp(bs, bg, st.gal);
        var al = front ? 0.95 : -0.85, bl = front ? 1.7 : 0.25;
        a = lerp(a, al + (far ? 0.12 : 0), st.leap); b = lerp(b, bl, st.leap);
        if (front && st.rear > 0) {
          var paw = Math.sin(st.t * 0.022 + (far ? 1.6 : 0)) * 0.25;
          a = lerp(a, 0.75 + paw, st.rear); b = lerp(b, 1.55 - paw, st.rear);
        }
        return [a, b];
      }
      function drawUnicorn(x, y, s, dir, st, C) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(st.rot || 0);
        ctx.scale(dir * s * (st.sqx || 1), s * (st.sqy || 1));
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (st.rear > 0) { ctx.translate(-0.3, 0); ctx.rotate(-0.5 * st.rear); ctx.translate(0.3, 0); }
        var bob = -Math.abs(Math.sin(st.phi)) * 0.07 * st.gal;
        ctx.translate(0, bob);
        var t = st.t;
        var HB = [-0.27, -0.66], FB = [0.27, -0.64];
        // far legs (behind the body, a touch darker)
        var lf = legAngles(st, true, true, Math.PI + 0.55), lb = legAngles(st, false, true, 0.55);
        drawLeg(HB[0] + 0.05, HB[1], lb[0], lb[1], C, true);
        drawLeg(FB[0] + 0.05, FB[1], lf[0], lf[1], C, true);
        // rainbow tail streaming back (more horizontal while galloping / leaping)
        var stream = Math.max(st.gal, st.leap);
        for (var i = 5; i >= 0; i--) {
          var ta = lerp(2.2, 2.75, stream) + (i - 2.5) * 0.11 + Math.sin(t * 0.009 + i * 0.7) * 0.08;
          lock(-0.42, -0.84, ta, lerp(0.5, 0.6, stream) + (i % 2) * 0.05, 0.15, Math.sin(t * 0.012 + i) * 0.06 + 0.04, C.mane[i]);
        }
        // body + neck
        var g = ctx.createLinearGradient(0, -1.3, 0, -0.45);
        g.addColorStop(0, C.body); g.addColorStop(0.6, C.body); g.addColorStop(1, C.shade);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.045; bodyPath(); ctx.stroke();
        ctx.fillStyle = g; bodyPath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-0.05, -0.88, 0.22, 0.05, -0.05, 0, TAU); ctx.fill();
        // haunch + shoulder hints
        ctx.strokeStyle = hexA(C.line, 0.45); ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.arc(-0.27, -0.68, 0.17, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
        // near legs
        var nf = legAngles(st, true, false, Math.PI), nb = legAngles(st, false, false, 0);
        drawLeg(HB[0], HB[1], nb[0], nb[1], C, false);
        drawLeg(FB[0], FB[1], nf[0], nf[1], C, false);
        // little sparkle "socks" ring on the near legs
        // rainbow mane locks along the top of the neck
        var nodYaw = Math.sin(t * 0.006) * 0.03;
        for (var m = 5; m >= 0; m--) {
          var q = m / 5;
          var bx = lerp(0.46, 0.12, q), by = lerp(-1.4, -0.92, q);
          var ma = lerp(2.35, 2.75, q) + Math.sin(t * 0.01 + m * 0.9) * 0.1 * (0.5 + stream) + stream * 0.25;
          lock(bx, by, ma, lerp(0.32, 0.26, q), 0.15, Math.sin(t * 0.011 + m) * 0.05, C.mane[m]);
        }
        // head
        ctx.save(); ctx.translate(0.5, -1.3); ctx.rotate(nodYaw); ctx.translate(-0.5, 1.3);
        var hg = ctx.createLinearGradient(0, -1.48, 0, -1.08);
        hg.addColorStop(0, C.body); hg.addColorStop(1, C.shade);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.045; headPath(); ctx.stroke();
        ctx.fillStyle = hg; headPath(); ctx.fill();
        // ear
        ctx.fillStyle = C.body; ctx.strokeStyle = C.line; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(0.44, -1.41); ctx.quadraticCurveTo(0.4, -1.58, 0.45, -1.67); ctx.quadraticCurveTo(0.56, -1.56, 0.56, -1.44); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ear;
        ctx.beginPath(); ctx.moveTo(0.47, -1.45); ctx.quadraticCurveTo(0.45, -1.56, 0.46, -1.61); ctx.quadraticCurveTo(0.52, -1.54, 0.53, -1.46); ctx.closePath(); ctx.fill();
        // golden spiral horn
        var hornG = ctx.createLinearGradient(0.58, -1.45, 0.76, -1.88);
        hornG.addColorStop(0, '#F2B53A'); hornG.addColorStop(0.5, '#FFE48A'); hornG.addColorStop(1, '#FFF6CF');
        ctx.fillStyle = hornG; ctx.strokeStyle = '#C9932A'; ctx.lineWidth = 0.022;
        ctx.beginPath(); ctx.moveTo(0.55, -1.44); ctx.lineTo(0.77, -1.9); ctx.lineTo(0.67, -1.46); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(201,147,42,.75)'; ctx.lineWidth = 0.018;
        for (var hs = 1; hs <= 3; hs++) {
          var hq = hs / 4.2;
          var ax = lerp(0.55, 0.77, hq), ay = lerp(-1.44, -1.9, hq), bx2 = lerp(0.67, 0.77, hq), by2 = lerp(-1.46, -1.9, hq);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx2) / 2, (ay + by2) / 2 + 0.035, bx2, by2 - 0.025); ctx.stroke();
        }
        // forelock curling forward over the brow
        lock(0.56, -1.46, 0.5 + Math.sin(t * 0.01) * 0.08, 0.17, 0.09, 0.02, C.mane[0]);
        lock(0.53, -1.45, 0.9 + Math.sin(t * 0.01 + 1) * 0.08, 0.15, 0.08, 0.02, C.mane[5]);
        // ONE eye (true side view)
        if (st.happy) {
          ctx.strokeStyle = '#3A2350'; ctx.lineWidth = 0.032;
          ctx.beginPath(); ctx.arc(0.66, -1.29, 0.055, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
        } else {
          var bl = st.blink == null ? 1 : st.blink;
          ctx.save(); ctx.translate(0.66, -1.31); ctx.scale(1, Math.max(0.08, bl));
          ctx.fillStyle = '#3A2350'; ctx.beginPath(); ctx.ellipse(0, 0, 0.058, 0.075, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#7A4FA8'; ctx.beginPath(); ctx.ellipse(0.005, 0.025, 0.04, 0.035, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(0.015, -0.03, 0.024, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(-0.02, 0.03, 0.011, 0, TAU); ctx.fill();
          ctx.restore();
        }
        // lashes toward the back of the eye
        ctx.strokeStyle = '#3A2350'; ctx.lineWidth = 0.018;
        ctx.beginPath();
        ctx.moveTo(0.615, -1.35); ctx.lineTo(0.575, -1.385);
        ctx.moveTo(0.625, -1.375); ctx.lineTo(0.595, -1.42);
        ctx.moveTo(0.645, -1.39); ctx.lineTo(0.63, -1.44);
        ctx.stroke();
        // blush, nostril, smile
        ctx.fillStyle = hexA(C.blush, 0.6);
        ctx.beginPath(); ctx.ellipse(0.72, -1.2, 0.06, 0.035, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = hexA(C.line, 0.9);
        ctx.beginPath(); ctx.ellipse(0.92, -1.24, 0.017, 0.012, 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.022;
        ctx.beginPath(); ctx.arc(0.84, -1.18, 0.06, 0.35, 1.45); ctx.stroke();
        ctx.restore();
        ctx.restore();
      }
      function cloud(x, y, r, a) {
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a;
        var puffs = [[-1, 0.1, 0.55], [-0.45, -0.25, 0.7], [0.2, -0.35, 0.8], [0.85, -0.05, 0.6], [0.2, 0.15, 0.7], [-0.5, 0.2, 0.55]];
        ctx.fillStyle = 'rgba(160,140,210,.35)';
        puffs.forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r + r * 0.12, p[2] * r, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#FFFFFF';
        puffs.forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r, p[2] * r, 0, TAU); ctx.fill(); });
        ctx.fillStyle = 'rgba(230,220,255,.8)';
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.38, r * 1.4, r * 0.18, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function shadow(x, y, w, a) {
        var sg = ctx.createRadialGradient(x, y, 0, x, y, w);
        sg.addColorStop(0, 'rgba(20,0,40,' + (0.45 * a).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(20,0,40,0)');
        ctx.fillStyle = sg; ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22); ctx.translate(-x, -y);
        ctx.beginPath(); ctx.arc(x, y, w, 0, TAU); ctx.fill(); ctx.restore();
      }
      // rainbow bands; feet run on the outer edge (radius R), bands go inward
      function rainbowArc(cx, cy, R, bw, a0, a1, alpha, colors) {
        if (alpha <= 0 || a1 <= a0) return;
        ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'butt';
        ctx.strokeStyle = hexA(glow, 0.18); ctx.lineWidth = bw * 8;
        ctx.beginPath(); ctx.arc(cx, cy, R - bw * 3, a0, a1); ctx.stroke();
        for (var i = 0; i < colors.length; i++) {
          ctx.strokeStyle = colors[i]; ctx.lineWidth = bw + 1;
          ctx.beginPath(); ctx.arc(cx, cy, R - bw * (i + 0.5), a0, a1); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(1, bw * 0.25);
        ctx.beginPath(); ctx.arc(cx, cy, R - bw * 0.35, a0, a1); ctx.stroke();
        ctx.restore();
      }

      var raf = 0, dead = false, t0 = performance.now();
      function frame(now) {
        if (dead) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var portrait = W < H;
        var gy = H * (portrait ? 0.74 : 0.8);
        var s = Math.min(W * 0.14, H * 0.13);
        var R = Math.min(W * 0.3, H * 0.4);
        var bw = Math.max(5, s * 0.1);
        var lx = W / 2, gap = R * 0.45;
        var acx = lx - gap - R * Math.cos(TH_E);
        var ex = acx + R * Math.cos(TH_E), ey = gy - R * Math.sin(TH_E);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // soft glowing meadow line (translucent, no opaque backdrop)
        var gg = ctx.createRadialGradient(lx, gy, 0, lx, gy, W * 0.55);
        gg.addColorStop(0, hexA(primary, 0.28)); gg.addColorStop(0.5, hexA(primary, 0.1)); gg.addColorStop(1, hexA(primary, 0));
        ctx.save(); ctx.translate(lx, gy); ctx.scale(1, 0.12); ctx.translate(-lx, -gy);
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(lx, gy, W * 0.55, 0, TAU); ctx.fill(); ctx.restore();
        var lg = ctx.createLinearGradient(0, 0, W, 0);
        lg.addColorStop(0, hexA(glow, 0)); lg.addColorStop(0.5, hexA(glow, 0.55)); lg.addColorStop(1, hexA(glow, 0));
        ctx.strokeStyle = lg; ctx.lineWidth = Math.max(1, 2 * unit);
        ctx.beginPath(); ctx.moveTo(0, gy + 2); ctx.lineTo(W, gy + 2); ctx.stroke();

        // ─── super: the full double rainbow over everything ───
        var archQ = T.arch ? clamp01((t - ms(T.arch[0])) / (ms(T.arch[1]) - ms(T.arch[0]))) : 0;
        var trailA = 1 - archQ;
        if (archQ > 0) {
          var Rb = Math.min(W * 0.42, H * 0.44), bw2 = Math.max(6, Rb * 0.034);
          var sweep = easeInOut(archQ);
          var a1 = -Math.PI + Math.PI * sweep;
          rainbowArc(lx, gy, Rb * 1.19, bw2 * 0.6, -Math.PI, a1, 0.5, RAINBOW.slice().reverse());
          rainbowArc(lx, gy, Rb, bw2, -Math.PI, a1, 1, RAINBOW);
          // glints along the bows
          ctx.globalCompositeOperation = 'lighter';
          for (var ag = 0; ag < archGlints.length; ag++) {
            var G = archGlints[ag]; if (G.a > sweep) continue;
            var ga = -Math.PI + Math.PI * G.a, gr = Rb - bw2 * 3 + G.b * bw2 * 5;
            var tw = 0.5 + 0.5 * Math.sin(t * 0.001 * G.rate + G.ph);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * tw).toFixed(3) + ')';
            sparkPath(ctx, lx + Math.cos(ga) * gr, gy + Math.sin(ga) * gr, (3 + 6 * tw) * unit + 1); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          cloud(lx - Rb + bw2 * 3, gy - bw2, Rb * 0.13, clamp01(archQ * 4));
          if (sweep > 0.85) cloud(lx + Rb - bw2 * 3, gy - bw2, Rb * 0.13, clamp01((sweep - 0.85) / 0.15));
        }

        // ─── the rainbow trail drawn under the hooves ───
        var th = runTheta(t);
        if (t > r0 && trailA > 0) {
          rainbowArc(acx, gy, R, bw, -Math.PI, -th, trailA, RAINBOW);
          // the rainbow's end blooms into a little sparkle puff once she leaps
          if (t > l0) {
            var eq = clamp01((t - l0) / 400);
            ctx.globalCompositeOperation = 'lighter';
            for (var ep = 0; ep < 6; ep++) {
              var ea = ep / 6 * TAU + t * 0.002, er = bw * (1.2 + 2.2 * easeOut(eq));
              ctx.fillStyle = hexA(ep % 2 ? accent : '#FFFFFF', (1 - eq * 0.6) * trailA);
              var ebx = acx + (R - bw * 3) * Math.cos(TH_E), eby = gy - (R - bw * 3) * Math.sin(TH_E);
              sparkPath(ctx, ebx + Math.cos(ea) * er, eby + Math.sin(ea) * er, bw * 0.7); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // glitter dust falling from the bands
          for (var dd = 0; dd < dust.length; dd++) {
            var D = dust[dd], dt = t - D.tb;
            if (dt <= 0 || dt > D.life) continue;
            var dth = runTheta(D.tb), drr = R - bw * 6 * D.band;
            var dx = acx + Math.cos(dth) * drr + D.vx * dt * 0.06 * unit;
            var dy = gy - Math.sin(dth) * drr + D.vy * dt * 0.08 * unit + dt * dt * 0.00006 * unit * 40;
            var da = (1 - dt / D.life) * (0.6 + 0.4 * Math.sin(dt * 0.02 + D.ph)) * trailA;
            ctx.fillStyle = hexA(D.c, da);
            sparkPath(ctx, dx, dy, (3 + 3 * D.band) * unit + 1.2); ctx.fill();
          }
        }

        // ─── mother unicorn ───
        var ux, uy, ust = { t: t, phi: 0, gal: 0, leap: 0, rear: 0, rot: 0, sqx: 1, sqy: 1, happy: false, blink: 1 };
        var stride = s * 1.7;
        var landed = t >= l1;
        if (t < l0) {
          ux = acx + R * Math.cos(th); uy = gy - R * Math.sin(th);
          ust.rot = Math.max(-0.6, Math.min(0.6, Math.atan2(Math.cos(th), Math.sin(th))));
          ust.phi = (Math.PI - th) * R / stride * TAU;
          ust.gal = clamp01((t - r0) / 120);
        } else if (t < l1) {
          var lq = (t - l0) / (l1 - l0);
          ux = lerp(ex, lx, lq); uy = lerp(ey, gy, lq) - R * 0.32 * 4 * lq * (1 - lq);
          ust.rot = lerp(-0.4, 0.3, lq);
          ust.phi = (Math.PI - TH_E) * R / stride * TAU;
          ust.leap = lq < 0.8 ? clamp01(lq * 5) : (1 - lq) / 0.2;
          ust.gal = 1 - ust.leap;
        } else {
          ux = lx; uy = gy;
          var sq = (t - l1) / 180;
          if (sq < 1) { var l = Math.sin(sq * Math.PI); ust.sqy = 1 - 0.14 * l; ust.sqx = 1 + 0.08 * l; }
          ust.rear = Math.sin(Math.PI * clamp01((t - ms(T.rear[0])) / (ms(T.rear[1]) - ms(T.rear[0]))));
          ust.happy = t > l1 + 120;
        }
        var bq = (t - r0 - 250) / 140;
        if (bq > 0 && bq < 1) ust.blink = Math.abs(Math.cos(bq * Math.PI));
        if (ust.happy && ust.rear === 0) uy -= Math.abs(Math.sin((t - l1) * 0.009)) * s * 0.04 * (isSuper ? 1 : 0.6);
        if (landed) shadow(lx, gy + 2, s * 0.75, 1);
        drawUnicorn(ux, uy, s, 1, ust, MOM);

        // ─── star burst on landing ───
        var sbq = (t - l1) / 1100;
        if (sbq > 0 && sbq < 1) {
          var sx0 = lx, sy0 = gy - s * 0.3;
          ctx.strokeStyle = hexA(accent, 0.7 * (1 - sbq)); ctx.lineWidth = Math.max(1, 3 * unit * (1 - sbq));
          ctx.beginPath(); ctx.ellipse(lx, gy, s * (0.4 + sbq * 3.2), s * (0.12 + sbq * 0.8), 0, 0, TAU); ctx.stroke();
          var fl = clamp01(1 - sbq * 3);
          if (fl > 0) {
            var fg = ctx.createRadialGradient(sx0, sy0, 0, sx0, sy0, s * 2.2);
            fg.addColorStop(0, hexA('#FFF4C0', 0.45 * fl)); fg.addColorStop(1, hexA('#FFF4C0', 0));
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(sx0, sy0, s * 2.2, 0, TAU); ctx.fill();
          }
          for (var si = 0; si < stars.length; si++) {
            var S = stars[si], e = easeOut(sbq * 1.4);
            var px = sx0 + Math.cos(S.a) * S.v * s * 2.6 * e;
            var py = sy0 + Math.sin(S.a) * S.v * s * 2.2 * e + sbq * sbq * s * 1.6;
            var sa = sbq < 0.7 ? 1 : (1 - sbq) / 0.3;
            ctx.fillStyle = hexA(S.c, sa);
            starPath(ctx, px, py, s * 0.11 * S.r * (1 - sbq * 0.35), S.spin * sbq); ctx.fill();
            ctx.fillStyle = hexA('#FFFFFF', sa * 0.7);
            starPath(ctx, px, py, s * 0.045 * S.r, S.spin * sbq); ctx.fill();
          }
        }

        // ─── super: two foals gallop in after their mom ───
        function foal(win, side, C) {
          if (!win) return;
          var f0 = ms(win[0]), f1 = ms(win[1]);
          if (t <= f0) return;
          var fq = clamp01((t - f0) / (f1 - f0));
          var startX = -s * 1.4, tgt = lx + side * s * 1.95;
          var p = 1 - Math.pow(1 - fq, 2);
          var fx = lerp(startX, tgt, p);
          var fst = { t: t + side * 300, phi: (fx - startX) / (s * 0.6 * 1.7) * TAU, gal: fq < 0.8 ? 1 : (1 - fq) / 0.2, leap: 0, rear: 0, rot: 0,
                      sqx: 1, sqy: 1, happy: fq >= 1, blink: 1 };
          var fy = gy;
          if (fq >= 1) fy -= Math.abs(Math.sin((t - f1) * 0.011 + side)) * s * 0.12;
          shadow(fx, gy + 2, s * 0.45, 1);
          drawUnicorn(fx, fy, s * 0.6, 1, fst, C);
        }
        foal(T.babyA, -1, BABY1);
        foal(T.babyB, 1, BABY2);

        // ─── super: a shower of glittering hearts ───
        if (T.hearts) {
          var hs0 = ms(T.hearts);
          for (var hi = 0; hi < hearts.length; hi++) {
            var Hh = hearts[hi], ht = (t - hs0 - Hh.delay) / 1000;
            if (ht <= 0) continue;
            var hy = -30 * unit + ht * Hh.v * H * 1.4;
            if (hy > H + 30) continue;
            var hx = Hh.x * W + Math.sin(ht * 2.2 * Hh.sw + Hh.ph) * 30 * unit;
            var hsz = (16 + 10 * Hh.sz) * unit * 1.4 + 6;
            var hrot = Math.sin(ht * 2 + Hh.ph) * 0.35;
            var ha = clamp01(ht * 4);
            ctx.globalAlpha = ha;
            ctx.fillStyle = Hh.c; heartPath(ctx, hx, hy, hsz, hrot); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            ctx.beginPath(); ctx.ellipse(hx - hsz * 0.17, hy - hsz * 0.12, hsz * 0.1, hsz * 0.06, -0.6, 0, TAU); ctx.fill();
            var gl = 0.5 + 0.5 * Math.sin(ht * 9 + Hh.ph);
            if (gl > 0.75) {
              ctx.fillStyle = '#FFFFFF';
              sparkPath(ctx, hx + hsz * 0.22, hy - hsz * 0.18, hsz * 0.22 * (gl - 0.75) * 4); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }

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
