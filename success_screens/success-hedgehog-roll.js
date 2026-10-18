/* success-hedgehog-roll.js — מסך הצלחה: קִפּוֹד מִתְגַּלְגֵּל 🦔
   קיפוד קטן וחמוד מתכדרר לכדור קוצני, מתגלגל וקופץ על הדשא ומשאיר אחריו
   שובל נצנצים, נפתח באמצע המסך וקופץ שמח — עם תות ופרחים תקועים על הקוצים —
   ולבבות מרחפים למעלה. בסופר: לולאה באוויר, שני קיפודונים קטנים מתגלגלים
   אחריו, ועוד לבבות.
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
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  window.SUCCESS.styles.push({
    name: 'hedgehog-roll',
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

      var SPINE = mixHex('#9A5E3C', primary, 0.14), TIP = mixHex(SPINE, '#FFFFFF', 0.4);
      var TAN = '#F6D7B0', TAN2 = '#E2B88A', INK = '#2E1F2E';

      // timelines (fractions of dur): stand → curl → roll → unroll + hop → happy
      var TL = isSuper ? { curl: 0.04, roll: 0.1, unroll: 0.56, hop: 0.62 } : { curl: 0.05, roll: 0.12, unroll: 0.5, hop: 0.56 };
      var crew = [{ k: 0, size: 1, delay: 0, loop: isSuper }];
      if (isSuper) { crew.push({ k: 1, size: 0.55, delay: 0.07, loop: false }); crew.push({ k: 2, size: 0.55, delay: 0.12, loop: false }); }

      var ground = [];
      for (var gI = 0; gI < 14; gI++) ground.push({ x: (gI + Math.random() * 0.7) / 14, h: rnd(0.6, 1.2), col: ['#FF8FC8', '#FFFFFF', '#FFE66D', primary, glow][gI % 5], flower: gI % 3 === 0 });
      var NH = isSuper ? 16 : 9, hearts = [];
      for (var h = 0; h < NH; h++) hearts.push({ at: (isSuper ? 0.6 : 0.55) + h * (isSuper ? 0.02 : 0.03), dx: rnd(-1.4, 1.4), sw: rnd(0, TAU), r: rnd(12, 20), col: ['#FF6F9E', primary, '#FF8FC8', accent][h % 4] });
      var trail = [];
      for (var s = 0; s < 26; s++) trail.push({ f: s / 25, col: [accent, '#FFFFFF', glow, primary][s % 4], dx: rnd(-0.3, 0.3) });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (isSuper ? 0.5 : 0.44);
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

      // pose of one hedgehog at progress p: {x, y (body centre), curl 0..1, rot, S}
      function pose(m, p, t, base) {
        var S = base.S * m.size, gy = base.gy;
        var x0 = base.x0 - m.k * base.S * 1.3, xe = base.xe + (m.k === 0 ? 0 : m.k === 1 ? -base.S * 1.75 : base.S * 1.75);
        var q = p - m.delay;
        var curl = clamp01((q - TL.curl) / (TL.roll - TL.curl));
        var rq = clamp01((q - TL.roll) / (TL.unroll - TL.roll));
        var x = x0 + (xe - x0) * (1 - (1 - rq) * (1 - rq));
        var lift = 0, rot = (x - x0) / (0.85 * S);
        if (rq > 0 && rq < 1) lift = Math.abs(Math.sin(rq * Math.PI * 3)) * S * 0.9 * (1 - 0.6 * rq);
        if (m.loop) {   // a loop-de-loop mid-roll
          var lq = clamp01((rq - 0.38) / 0.3);
          if (lq > 0 && lq < 1) {
            var ph = easeInOut(lq) * TAU, R = S * 1.5;
            x += Math.sin(ph) * R; lift = R * (1 - Math.cos(ph)); rot += ph;
          }
        }
        var uq = clamp01((q - TL.unroll) / 0.06);
        if (q >= TL.unroll) curl = 1 - easeOut(uq);
        var hq = clamp01((q - TL.unroll) / (TL.hop - TL.unroll + 0.04));
        if (hq > 0 && hq < 1) lift += Math.sin(hq * Math.PI) * S * 0.75;
        if (q > TL.hop + 0.04) lift += Math.abs(Math.sin(t * 0.009 + m.k)) * S * 0.08;
        if (curl >= 1 || q < TL.roll) { if (curl < 1) rot = 0; }
        if (q >= TL.unroll) rot = rot * (1 - uq);
        var y = gy - S * (0.55 + 0.3 * curl) - lift;
        return { x: x, y: y, curl: curl, rot: rot, S: S, decor: m.k === 0 ? clamp01((q - TL.hop + 0.02) / 0.08) : 0 };
      }

      function smallFlower(x, y, r, col) {
        ctx.fillStyle = col;
        for (var i = 0; i < 5; i++) { var a = i / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.45, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#FFC93C'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, TAU); ctx.fill();
      }
      function strawberry(x, y, r) {
        ctx.fillStyle = '#FF4D6D';
        ctx.beginPath(); ctx.moveTo(x, y + r);
        ctx.bezierCurveTo(x - r * 1.05, y + r * 0.2, x - r * 0.95, y - r * 0.75, x, y - r * 0.6);
        ctx.bezierCurveTo(x + r * 0.95, y - r * 0.75, x + r * 1.05, y + r * 0.2, x, y + r);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFE38A';
        [[-0.35, -0.2], [0.3, -0.25], [0, 0.05], [-0.25, 0.35], [0.25, 0.35], [0, 0.65]].forEach(function (d) {
          ctx.beginPath(); ctx.ellipse(x + d[0] * r, y + d[1] * r, r * 0.06, r * 0.09, 0, 0, TAU); ctx.fill();
        });
        ctx.fillStyle = '#4FB35A';
        for (var i = 0; i < 4; i++) {
          ctx.save(); ctx.translate(x, y - r * 0.6); ctx.rotate(-1.2 + i * 0.8);
          ctx.beginPath(); ctx.ellipse(0, -r * 0.22, r * 0.12, r * 0.3, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
      // side view, facing right: ONE eye, a real open mouth, a little nose, spiky back
      function standing(x, y, S, decor) {
        var bx = x - S * 0.1;
        // spines
        ctx.fillStyle = SPINE;
        ctx.beginPath();
        var n = 13, a0 = Math.PI * 0.92, a1 = Math.PI * 1.9;
        for (var i = 0; i <= n * 2; i++) {
          var a = a0 + (a1 - a0) * (i / (n * 2)), r = i % 2 ? S * 0.74 : S * 1.0;
          var px = bx + Math.cos(a) * r * 1.12, py = y + Math.sin(a) * r * 0.95;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.quadraticCurveTo(bx - S * 0.9, y + S * 0.55, bx - S * 0.2, y + S * 0.48); ctx.lineTo(bx + S * 0.6, y + S * 0.3); ctx.closePath(); ctx.fill();
        // light spine tips
        ctx.strokeStyle = TIP; ctx.lineWidth = Math.max(1.2, S * 0.045);
        for (var j = 1; j < n * 2; j += 2) {
          var aa = a0 + (a1 - a0) * ((j - 1) / (n * 2)) + 0.02;
          ctx.beginPath(); ctx.moveTo(bx + Math.cos(aa) * S * 0.86 * 1.12, y + Math.sin(aa) * S * 0.86 * 0.95);
          ctx.lineTo(bx + Math.cos(aa) * S * 0.96 * 1.12, y + Math.sin(aa) * S * 0.96 * 0.95); ctx.stroke();
        }
        // feet
        ctx.fillStyle = TAN2;
        ctx.beginPath(); ctx.ellipse(x + S * 0.38, y + S * 0.5, S * 0.15, S * 0.075, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - S * 0.38, y + S * 0.5, S * 0.15, S * 0.075, 0, 0, TAU); ctx.fill();
        // face + belly (tan) with a pointy snout
        ctx.fillStyle = TAN;
        ctx.beginPath(); ctx.ellipse(x + S * 0.32, y + S * 0.14, S * 0.5, S * 0.34, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + S * 0.12, y + S * 0.38, S * 0.38, S * 0.12, 0, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + S * 0.25, y - S * 0.32);
        ctx.quadraticCurveTo(x + S * 0.75, y - S * 0.3, x + S * 1.08, y + S * 0.06);
        ctx.quadraticCurveTo(x + S * 1.1, y + S * 0.2, x + S * 0.95, y + S * 0.24);
        ctx.quadraticCurveTo(x + S * 0.6, y + S * 0.45, x + S * 0.2, y + S * 0.3);
        ctx.closePath(); ctx.fill();
        // ear
        ctx.fillStyle = TAN2; ctx.beginPath(); ctx.arc(x + S * 0.3, y - S * 0.36, S * 0.12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFA9C0'; ctx.beginPath(); ctx.arc(x + S * 0.3, y - S * 0.36, S * 0.065, 0, TAU); ctx.fill();
        // the eye + highlight
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.ellipse(x + S * 0.58, y - S * 0.08, S * 0.075, S * 0.095, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + S * 0.6, y - S * 0.12, S * 0.028, 0, TAU); ctx.fill();
        // nose
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + S * 1.06, y + S * 0.1, S * 0.075, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x + S * 1.04, y + S * 0.07, S * 0.022, 0, TAU); ctx.fill();
        // open smiling mouth + tongue
        ctx.fillStyle = '#5A2238';
        ctx.beginPath(); ctx.moveTo(x + S * 0.68, y + S * 0.2);
        ctx.quadraticCurveTo(x + S * 0.82, y + S * 0.24, x + S * 0.96, y + S * 0.2);
        ctx.quadraticCurveTo(x + S * 0.84, y + S * 0.38, x + S * 0.68, y + S * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF7FA6'; ctx.beginPath(); ctx.ellipse(x + S * 0.83, y + S * 0.29, S * 0.055, S * 0.03, 0, 0, TAU); ctx.fill();
        // blush
        ctx.fillStyle = 'rgba(255,120,160,.5)'; ctx.beginPath(); ctx.ellipse(x + S * 0.55, y + S * 0.12, S * 0.1, S * 0.055, 0, 0, TAU); ctx.fill();
        // goodies stuck on the spines
        if (decor > 0) {
          var d = easeOutBack(decor);
          strawberry(x - S * 0.2, y - S * 0.9, S * 0.26 * d);
          smallFlower(x - S * 0.72, y - S * 0.6, S * 0.17 * d, '#FFFFFF');
          smallFlower(x + S * 0.12, y - S * 0.86, S * 0.15 * d, mixHex(primary, '#FFFFFF', 0.25));
          smallFlower(x - S * 0.95, y - S * 0.05, S * 0.13 * d, '#FF8FC8');
        }
      }
      function ball(x, y, S, rot) {
        var R = S * 0.85;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = SPINE;
        ctx.beginPath();
        var n = 28;
        for (var i = 0; i <= n * 2; i++) {
          var a = i / (n * 2) * TAU, r = i % 2 ? R * 0.86 : R * 1.1;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = TIP; ctx.lineWidth = Math.max(1.2, S * 0.04);
        for (var k = 0; k < 16; k++) { var ka = k / 16 * TAU + 0.1; ctx.beginPath(); ctx.moveTo(Math.cos(ka) * R * 0.62, Math.sin(ka) * R * 0.62); ctx.lineTo(Math.cos(ka) * R * 0.92, Math.sin(ka) * R * 0.92); ctx.stroke(); }
        // the curled-in tan face peeking + spine swirl
        ctx.strokeStyle = TAN; ctx.lineWidth = R * 0.2;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.32, -0.3, Math.PI * 0.75); ctx.stroke();
        ctx.strokeStyle = TIP; ctx.lineWidth = Math.max(1.2, S * 0.05);
        ctx.beginPath(); ctx.arc(0, 0, R * 0.55, Math.PI * 0.9, Math.PI * 1.8); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(x - R * 0.35, y - R * 0.45, R * 0.25, R * 0.12, -0.6, 0, TAU); ctx.fill();
      }
      function hedgehog(ps) {
        var a0 = ctx.globalAlpha;
        if (ps.curl < 1) { ctx.globalAlpha = a0 * (1 - ps.curl); standing(ps.x, ps.y, ps.S, ps.decor); }
        if (ps.curl > 0) { ctx.globalAlpha = a0 * ps.curl; ball(ps.x, ps.y, ps.S, ps.rot); }
        ctx.globalAlpha = a0;
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.save();
        ctx.globalAlpha = gFade;
        var S = Math.min(W * 0.19, H * 0.12), gy = H * 0.8;
        var base = { S: S, gy: gy, x0: Math.max(S * 1.3, W * 0.14), xe: W * 0.5 - S * 0.15 };
        // grassy ground (soft, translucent)
        var gg = ctx.createLinearGradient(0, gy - 10 * unit, 0, H);
        gg.addColorStop(0, 'rgba(110,200,110,.6)'); gg.addColorStop(1, 'rgba(60,140,80,.08)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(0, H);
        for (var gx = 0; gx <= W + 20; gx += 20) ctx.lineTo(gx, gy + Math.sin(gx * 0.008) * 6 * unit);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(150,230,140,.75)'; ctx.lineWidth = Math.max(1.5, 3 * unit);
        for (var g2 = 0; g2 < ground.length; g2++) {
          var gr = ground[g2], fx = gr.x * W, fy = gy + Math.sin(fx * 0.008) * 6 * unit + 4 * unit, bh = 22 * unit * gr.h;
          ctx.beginPath(); ctx.moveTo(fx - 6 * unit, fy); ctx.quadraticCurveTo(fx - 7 * unit, fy - bh * 0.6, fx - 10 * unit, fy - bh);
          ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + 1 * unit, fy - bh * 0.7, fx + 3 * unit, fy - bh * 1.15);
          ctx.moveTo(fx + 6 * unit, fy); ctx.quadraticCurveTo(fx + 8 * unit, fy - bh * 0.5, fx + 12 * unit, fy - bh * 0.85); ctx.stroke();
          if (gr.flower) smallFlower(fx + 3 * unit, fy - bh * 1.2, 7 * Math.max(unit, 0.6) * gr.h, gr.col);
        }
        // sparkle trail behind the rolling ball (mother)
        var mom = crew[0];
        for (var s2 = 0; s2 < trail.length; s2++) {
          var tr = trail[s2], pt = TL.roll + (TL.unroll - TL.roll) * tr.f, age = (p - pt) * dur / 1000;
          if (age <= 0 || age > 0.7) continue;
          var ps0 = pose(mom, pt, t, base), k = 1 - age / 0.7;
          ctx.fillStyle = hexA(tr.col, 0.9 * k);
          sparkPath(ctx, ps0.x + tr.dx * S, ps0.y + S * 0.4 - age * 60 * unit, (5 + 6 * k) * Math.max(unit, 0.6) * 1.3); ctx.fill();
        }
        // babies first, mother on top
        for (var c = crew.length - 1; c >= 0; c--) hedgehog(pose(crew[c], p, t, base));
        // hearts float up once she pops open
        var mp = pose(mom, p, t, base);
        for (var hI = 0; hI < hearts.length; hI++) {
          var hh = hearts[hI], ht = (p - hh.at) * dur / 1000;
          if (ht <= 0) continue;
          var hx = base.xe + hh.dx * S + Math.sin(ht * 3 + hh.sw) * 14 * unit, hy = mp.y - S * 1.35 - ht * 170 * Math.max(unit, 0.6);
          var ha = clamp01(ht / 0.15) * clamp01(1.8 - ht);
          if (ha <= 0) continue;
          var hr = hh.r * Math.max(unit, 0.6) * 1.2 * easeOutBack(clamp01(ht / 0.3));
          ctx.globalAlpha = gFade * ha;
          ctx.fillStyle = hh.col; heartPath(ctx, hx, hy, hr); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(hx - hr * 0.4, hy - hr * 0.35, hr * 0.18, 0, TAU); ctx.fill();
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
