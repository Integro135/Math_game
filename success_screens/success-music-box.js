/* success-music-box.js — מסך הצלחה: תֵּבַת נְגִינָה 🩰
   תיבת נגינה מקושטת קופצת פנימה, המכסה עם המראה נפתח, מפתח הכיווץ מסתובב,
   ובלרינה קטנה עולה מתוך התיבה ומסתובבת בפירואט (החצאית מתנפנפת, הידיים
   מעל הראש בתנוחה עדינה) — ותווים זוהרים ונצנצים יוצאים ממנה בספירלה.
   בסופר: אחרי הסיבובים היא קופצת בזינוק-מספריים ונוחתת בארבסק, טבעת של תווים
   וכוכבים מקיפה את התיבה, ומטר עלי כותרת יורד מלמעלה.
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
  function easeSine(x) { x = clamp01(x); return 0.5 - 0.5 * Math.cos(Math.PI * x); }
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
  function okHex(h, d) { return (typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)) ? h : d; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  // ballerina poses — body-frame joints in units of her height (y up from the toe, z toward the viewer)
  var POSES = {
    stand: { lk: [-0.03, 0.25, 0.01], lf: [-0.012, 0, 0.02], rk: [0.03, 0.25, 0.01], rf: [0.012, 0, -0.01],
             le: [-0.15, 0.6, 0.08], lh: [-0.05, 0.55, 0.14], re: [0.15, 0.6, 0.08], rh: [0.05, 0.55, 0.14], lean: 0 },
    passe: { lk: [-0.02, 0.25, 0], lf: [0, 0, 0], rk: [0.21, 0.39, 0.05], rf: [0.025, 0.27, 0.03],
             le: [-0.18, 0.89, 0.03], lh: [-0.055, 1.03, 0.05], re: [0.18, 0.89, 0.03], rh: [0.055, 1.03, 0.05], lean: 0 },
    open:  { lk: [-0.025, 0.25, 0.01], lf: [-0.01, 0, 0.02], rk: [0.06, 0.26, 0.05], rf: [0.1, 0.03, 0.08],
             le: [-0.2, 0.77, 0.04], lh: [-0.33, 0.84, 0.03], re: [0.2, 0.77, 0.04], rh: [0.33, 0.84, 0.03], lean: 0 },
    jete:  { lk: [-0.03, 0.46, -0.25], lf: [-0.03, 0.5, -0.5], rk: [0.03, 0.5, 0.25], rf: [0.03, 0.45, 0.5],
             le: [-0.14, 0.76, -0.1], lh: [-0.22, 0.81, -0.24], re: [0.08, 0.82, 0.15], rh: [0.06, 0.92, 0.31], lean: 0.03 },
    arab:  { lk: [-0.02, 0.25, 0], lf: [0, 0, 0], rk: [0.03, 0.47, -0.24], rf: [0.03, 0.57, -0.47],
             le: [-0.15, 0.75, -0.07], lh: [-0.28, 0.78, -0.13], re: [0.07, 0.8, 0.16], rh: [0.05, 0.87, 0.32], lean: 0.05 }
  };
  function mixPose(A, B, t) {
    var o = {};
    for (var k in A) if (Object.prototype.hasOwnProperty.call(A, k)) o[k] = (k === 'lean') ? lerp(A[k], B[k], t) : lerp3(A[k], B[k], t);
    return o;
  }

  window.SUCCESS.styles.push({
    name: 'music-box',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = okHex(pal.primary, '#C77DFF');
      var accent  = okHex(pal.accent, '#FFD27D');
      var glow    = okHex(pal.glow, '#7DC4FF');
      var textCol = pal.text || '#FFFFFF';
      var praise  = opts.praise || 'אַתְּ רוֹקֶדֶת יָפֶה!';

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

      function makeGlow(col) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, hexA(col, 0.9)); gr.addColorStop(0.3, hexA(col, 0.4)); gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        return c;
      }
      var NOTE_COLS = [accent, mixHex(primary, '#FFFFFF', 0.25), glow, '#FFFFFF', '#FF9CC8'];
      var sprites = NOTE_COLS.map(makeGlow);

      // colours of the box and the dancer
      var BODY = mixHex(primary, '#2A0A3A', 0.5), BODY_HI = mixHex(primary, '#FFFFFF', 0.12), BODY_LO = mixHex(primary, '#12031C', 0.75);
      var VELVET = mixHex('#B0285E', primary, 0.25), VELVET_D = mixHex('#4A0A28', primary, 0.15);
      var SKIN = '#FFDCC8', SKIN_D = '#E9B49C', TIGHTS = '#FFD0CC', TIGHTS_D = '#E8A9A8';
      var SHOE = '#FF9EC4', HAIR = '#6B3A26', HAIR_HI = '#9A5A3A', INK = '#3A2030';
      var TUTU = mixHex('#FF8DC0', primary, 0.3), TUTU_L = mixHex('#FFD3E8', primary, 0.12), BODICE = mixHex('#FF6FAE', primary, 0.35);

      // ─── timeline ───
      var T = isSuper
        ? { pop: 0.07, lid0: 0.04, lid1: 0.14, rise0: 0.1, rise1: 0.2, toP0: 0.17, toP1: 0.23, spin0: 0.22, spin1: 0.5, turns: 4,
            notes0: 0.13, notes1: 0.8, txt: 0.2 }
        : { pop: 0.1, lid0: 0.06, lid1: 0.2, rise0: 0.15, rise1: 0.3, toP0: 0.26, toP1: 0.34, spin0: 0.33, spin1: 0.79, turns: 3,
            notes0: 0.18, notes1: 0.66, txt: 0.3 };

      // notes spiralling out of the box
      var notes = [];
      var nN = isSuper ? 30 : 18;
      for (var i = 0; i < nN; i++)
        notes.push({ at: lerp(T.notes0, T.notes1, i / (nN - 1)) * dur + rnd(-50, 50), life: rnd(1150, 1400), a0: i * 2.2 + rnd(-0.3, 0.3),
                     dir: 1, kind: i % 3 === 2 ? 1 : 0, col: i % NOTE_COLS.length, sz: rnd(0.85, 1.15), wob: rnd(0, TAU) });
      var sparks = [];
      for (var s2 = 0; s2 < (isSuper ? 40 : 24); s2++)
        sparks.push({ at: lerp(T.notes0, T.notes1 + 0.06, Math.random()) * dur, life: rnd(700, 1000), a0: rnd(0, TAU), r0: rnd(0.1, 0.5), col: s2 % NOTE_COLS.length });
      // super: ring of notes and stars + petals
      var ring = [], petals = [];
      if (isSuper) {
        for (var ri = 0; ri < 16; ri++) ring.push({ a: ri / 16 * TAU, kind: ri % 2 ? 'star' : 'note', col: ri % NOTE_COLS.length, ph: rnd(0, TAU) });
        for (var pi = 0; pi < 44; pi++) petals.push({ x: Math.random(), at: rnd(0.52, 0.74), sp: rnd(0.2, 0.3), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-3, 3),
                                                       sz: rnd(0.8, 1.25), col: ['#FFB3D1', '#FF8DB8', '#FFD6E6', mixHex(primary, '#FFC0DA', 0.5)][pi % 4], swing: rnd(20, 50) });
      }
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 20); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.75, tw: Math.random() * TAU, rate: 2 + Math.random() * 3, size: 0.7 + Math.random() * 1.3 });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:11%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * T.txt;
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(11% + 8%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── layout ───
      var L = {};
      function layout() {
        var portrait = W < H;
        L.bw = Math.min(W * (portrait ? 0.74 : 0.6), H * 0.47);
        L.cx = W / 2;
        L.bot = H * (portrait ? 0.8 : 0.88);
        L.fh = L.bw * 0.3;
        L.D = L.bw * 0.62;
        L.k = 0.24;
        L.topF = L.bot - L.fh;
        L.topB = L.topF - L.k * L.D;
        L.backW = L.bw * 0.9;
        L.standY = (L.topF + L.topB) / 2;
        L.Hb = L.bw * 0.7;
        L.ped = L.bw * 0.07;
      }

      function goldGrad(x0, y0, x1, y1) {
        var g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, '#FFF4B8'); g.addColorStop(0.3, '#F2C14E'); g.addColorStop(0.62, '#B9821E'); g.addColorStop(1, '#FFE08A');
        return g;
      }
      function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function quad(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); }
      function heartPath(x, y, r) {
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
        ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
        ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
        ctx.closePath();
      }

      // ─── the lid (hinged on the back edge) ───
      function drawLid(phi, t) {
        var bw = L.bw, cx = L.cx, D = L.D;
        var hy = L.topB, hw = L.backW / 2;
        var fy = hy - D * Math.sin(phi) + L.k * D * Math.cos(phi);
        var fw = (L.backW + (bw - L.backW) * Math.max(0, Math.cos(phi))) / 2;
        var inner = Math.cos(phi) < 0;
        var A = [cx - hw, hy], B = [cx + hw, hy], C = [cx + fw, fy], Dd = [cx - fw, fy];
        if (!inner) {
          // outer face while closed / opening
          var g = ctx.createLinearGradient(0, fy, 0, hy);
          g.addColorStop(0, BODY_HI); g.addColorStop(1, BODY);
          ctx.fillStyle = g; quad(A, B, C, Dd); ctx.fill();
          ctx.strokeStyle = goldGrad(cx - fw, 0, cx + fw, 0); ctx.lineWidth = bw * 0.016; quad(A, B, C, Dd); ctx.stroke();
          // lid's front edge (thickness)
          var th = bw * 0.05 * Math.cos(phi);
          if (th > 0.5) {
            ctx.fillStyle = BODY_LO; rrect(cx - fw, fy - 1, fw * 2, th + 1, 2 * unit); ctx.fill();
            ctx.fillStyle = goldGrad(cx - fw, 0, cx + fw, 0); ctx.fillRect(cx - fw, fy + th * 0.4, fw * 2, Math.max(1, th * 0.25));
          }
          return;
        }
        // inner face: velvet frame, gold border, the oval mirror
        var g2 = ctx.createLinearGradient(0, fy, 0, hy);
        g2.addColorStop(0, VELVET); g2.addColorStop(1, VELVET_D);
        ctx.fillStyle = BODY; quad(A, B, C, Dd); ctx.fill();
        var ins = 0.07;
        var Ai = [lerp(A[0], C[0], ins * 0.9), lerp(A[1], C[1], ins)], Bi = [lerp(B[0], Dd[0], ins * 0.9), lerp(B[1], Dd[1], ins)];
        var Ci = [lerp(C[0], A[0], ins * 0.9), lerp(C[1], A[1], ins)], Di = [lerp(Dd[0], B[0], ins * 0.9), lerp(Dd[1], B[1], ins)];
        ctx.fillStyle = g2; quad(Ai, Bi, Ci, Di); ctx.fill();
        ctx.strokeStyle = goldGrad(cx - fw, 0, cx + fw, 0); ctx.lineWidth = bw * 0.012; quad(Ai, Bi, Ci, Di); ctx.stroke();
        // top rim of the lid (thickness seen from above)
        ctx.fillStyle = goldGrad(cx - fw, 0, cx + fw, 0);
        rrect(cx - fw - bw * 0.006, fy - bw * 0.022, fw * 2 + bw * 0.012, bw * 0.03, bw * 0.01); ctx.fill();
        var hgt = hy - fy;
        if (hgt < bw * 0.08) return;
        var mx = cx, my = (fy + hy) / 2 - hgt * 0.02, mrx = Math.min(fw, hw) * 0.62, mry = hgt * 0.38;
        // gold oval frame with beads
        ctx.fillStyle = goldGrad(mx - mrx, my - mry, mx + mrx, my + mry);
        ctx.beginPath(); ctx.ellipse(mx, my, mrx + bw * 0.022, mry + bw * 0.022, 0, 0, TAU); ctx.fill();
        // mirror glass
        var mg = ctx.createLinearGradient(mx - mrx, my - mry, mx + mrx, my + mry);
        mg.addColorStop(0, '#F4FAFF'); mg.addColorStop(0.35, mixHex('#A9C3E6', glow, 0.25)); mg.addColorStop(0.6, '#E2EEFB'); mg.addColorStop(1, mixHex('#7C93BE', primary, 0.25));
        ctx.save();
        ctx.beginPath(); ctx.ellipse(mx, my, mrx, mry, 0, 0, TAU); ctx.fillStyle = mg; ctx.fill(); ctx.clip();
        // soft reflection of the room's glow + moving shine streaks
        var rg = ctx.createRadialGradient(mx, my + mry * 0.4, 0, mx, my + mry * 0.4, mry * 1.2);
        rg.addColorStop(0, hexA(accent, 0.35)); rg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = rg; ctx.fillRect(mx - mrx, my - mry, mrx * 2, mry * 2);
        var sh = ((t * 0.00035) % 1.6) - 0.3;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (var s = 0; s < 2; s++) {
          var ox = mx - mrx + (sh + s * 0.18) * mrx * 2, w = mrx * (s ? 0.1 : 0.22);
          ctx.beginPath(); ctx.moveTo(ox, my - mry); ctx.lineTo(ox + w, my - mry); ctx.lineTo(ox + w - mrx * 0.5, my + mry); ctx.lineTo(ox - mrx * 0.5, my + mry); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(120,70,10,.5)'; ctx.lineWidth = 1.2 * unit;
        ctx.beginPath(); ctx.ellipse(mx, my, mrx, mry, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#FFF6D0';
        for (var bd = 0; bd < 22; bd++) { var ba = bd / 22 * TAU; ctx.beginPath(); ctx.arc(mx + Math.cos(ba) * (mrx + bw * 0.011), my + Math.sin(ba) * (mry + bw * 0.011), bw * 0.0065, 0, TAU); ctx.fill(); }
        // little crest on top of the frame: a gold heart with a gem
        var cy2 = my - mry - bw * 0.03;
        ctx.fillStyle = goldGrad(mx - bw * 0.04, cy2 - bw * 0.04, mx + bw * 0.04, cy2 + bw * 0.04); heartPath(mx, cy2, bw * 0.032); ctx.fill();
        var gg = ctx.createRadialGradient(mx - bw * 0.006, cy2 - bw * 0.006, 0, mx, cy2, bw * 0.018);
        gg.addColorStop(0, '#FFFFFF'); gg.addColorStop(0.4, '#FF8FC0'); gg.addColorStop(1, '#C2185B');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(mx, cy2 + bw * 0.003, bw * 0.016, 0, TAU); ctx.fill();
        // glints on the glass
        var gl = 0.5 + 0.5 * Math.sin(t * 0.006);
        ctx.fillStyle = hexA('#FFFFFF', 0.9 * gl);
        sparkPath(ctx, mx + mrx * 0.45, my - mry * 0.5, bw * 0.022 * (0.5 + gl)); ctx.fill();
      }

      // ─── the box body ───
      function drawBoxTop(open) {
        var bw = L.bw, cx = L.cx;
        var A = [cx - bw / 2, L.topF], B = [cx + bw / 2, L.topF], C = [cx + L.backW / 2, L.topB], Dd = [cx - L.backW / 2, L.topB];
        var g = ctx.createLinearGradient(0, L.topB, 0, L.topF);
        g.addColorStop(0, VELVET_D); g.addColorStop(1, VELVET);
        ctx.fillStyle = g; quad(A, B, C, Dd); ctx.fill();
        // warm light pouring out
        if (open > 0) {
          var lg = ctx.createRadialGradient(cx, L.standY, 0, cx, L.standY, bw * 0.5);
          lg.addColorStop(0, hexA('#FFF1C2', 0.55 * open)); lg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = lg; quad(A, B, C, Dd); ctx.fill();
        }
        ctx.strokeStyle = goldGrad(cx - bw / 2, 0, cx + bw / 2, 0); ctx.lineWidth = bw * 0.014; quad(A, B, C, Dd); ctx.stroke();
        // the hole for the dancer's spindle
        ctx.fillStyle = 'rgba(30,5,20,.75)';
        ctx.beginPath(); ctx.ellipse(cx, L.standY, bw * 0.06, bw * 0.06 * L.k * 1.3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#E8B84A'; ctx.lineWidth = 1.5 * unit; ctx.stroke();
      }
      function scroll(x, y, s, flip) {
        // a gold C-scroll flourish with a little leaf
        ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.5, -s * 0.55, s * 1.2, -s * 0.35, s * 1.25, s * 0.05);
        ctx.bezierCurveTo(s * 1.28, s * 0.35, s * 0.95, s * 0.48, s * 0.8, s * 0.25);
        ctx.bezierCurveTo(s * 0.7, s * 0.08, s * 0.92, -s * 0.02, s * 1.0, s * 0.12);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s * 0.4, s * 0.35, s * 0.9, s * 0.55, s * 1.5, s * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(s * 0.42, -s * 0.38, s * 0.16, s * 0.07, -0.6, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawBoxFront(keyA) {
        var bw = L.bw, cx = L.cx, x0 = cx - bw / 2, y0 = L.topF, fh = L.fh;
        // feet
        [-1, 1].forEach(function (sd) {
          var fx = cx + sd * bw * 0.42, fy = L.bot + bw * 0.018;
          var fg = ctx.createRadialGradient(fx - bw * 0.012, fy - bw * 0.014, 1, fx, fy, bw * 0.042);
          fg.addColorStop(0, '#FFF4C0'); fg.addColorStop(0.5, '#E2AE3A'); fg.addColorStop(1, '#8A5D10');
          ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(fx, fy, bw * 0.045, bw * 0.036, 0, 0, TAU); ctx.fill();
        });
        // front panel
        var g = ctx.createLinearGradient(0, y0, 0, y0 + fh);
        g.addColorStop(0, BODY_HI); g.addColorStop(0.55, BODY); g.addColorStop(1, BODY_LO);
        ctx.fillStyle = g; rrect(x0, y0, bw, fh, bw * 0.02); ctx.fill();
        // lacquer gloss
        ctx.save(); rrect(x0, y0, bw, fh, bw * 0.02); ctx.clip();
        var gl = ctx.createLinearGradient(x0, y0, x0 + bw * 0.5, y0 + fh);
        gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.45, 'rgba(255,255,255,.05)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(x0, y0, bw, fh);
        ctx.restore();
        // gold bands top & bottom
        var gold = goldGrad(x0, 0, x0 + bw, 0);
        ctx.fillStyle = gold;
        rrect(x0 - bw * 0.008, y0 - bw * 0.01, bw * 1.016, bw * 0.026, bw * 0.01); ctx.fill();
        rrect(x0 - bw * 0.014, y0 + fh - bw * 0.03, bw * 1.028, bw * 0.036, bw * 0.012); ctx.fill();
        ctx.fillStyle = 'rgba(90,50,0,.35)'; ctx.fillRect(x0, y0 + fh - bw * 0.014, bw, Math.max(1, bw * 0.004));
        // inset panel + flourishes
        ctx.strokeStyle = gold; ctx.fillStyle = gold; ctx.lineWidth = Math.max(1.2, bw * 0.007);
        rrect(x0 + bw * 0.05, y0 + fh * 0.2, bw * 0.9, fh * 0.56, bw * 0.03); ctx.stroke();
        var my = y0 + fh * 0.48, ss = fh * 0.32;
        scroll(cx - bw * 0.075, my, ss, -1); scroll(cx + bw * 0.075, my, ss, 1);
        scroll(x0 + bw * 0.12, my, ss * 0.6, 1); scroll(x0 + bw * 0.88, my, ss * 0.6, -1);
        // medallion with a rose gem
        ctx.fillStyle = gold;
        ctx.beginPath(); ctx.ellipse(cx, my, fh * 0.2, fh * 0.24, 0, 0, TAU); ctx.fill();
        var gg = ctx.createRadialGradient(cx - fh * 0.04, my - fh * 0.06, 0, cx, my, fh * 0.15);
        gg.addColorStop(0, '#FFFFFF'); gg.addColorStop(0.35, '#FF9CCB'); gg.addColorStop(1, '#B0175A');
        ctx.fillStyle = gg; heartPath(cx, my + fh * 0.01, fh * 0.12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx - fh * 0.05, my - fh * 0.05, fh * 0.025, 0, TAU); ctx.fill();
        // winding key on the right side, turning around its shaft
        var kx = x0 + bw, ky = y0 + fh * 0.5, ks = bw * 0.075;
        ctx.fillStyle = goldGrad(kx, ky - ks * 0.12, kx, ky + ks * 0.12);
        ctx.fillRect(kx, ky - ks * 0.11, ks * 0.7, ks * 0.22);
        var c = Math.cos(keyA), sc = Math.abs(c) < 0.08 ? 0.08 : Math.abs(c);
        ctx.save(); ctx.translate(kx + ks * 0.7, ky); ctx.scale(1, sc);
        ctx.fillStyle = goldGrad(0, -ks, ks, ks);
        ctx.beginPath();
        [-1, 1].forEach(function (sd) {
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-ks * 0.05, sd * ks * 1.0, ks * 1.15, sd * ks * 1.15, ks * 1.05, sd * ks * 0.3);
          ctx.bezierCurveTo(ks * 1.0, sd * ks * 0.02, ks * 0.4, sd * ks * 0.0, 0, 0);
          // a small heart-ish hole in each wing
          ctx.moveTo(ks * 0.66, sd * ks * 0.5);
          ctx.ellipse(ks * 0.56, sd * ks * 0.5, ks * 0.1, ks * 0.13, 0, 0, TAU);
        });
        ctx.fill('evenodd');
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.35 * Math.max(0, c)).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(ks * 0.75, -ks * 0.62, ks * 0.12, ks * 0.06, 0.4, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#E9B848'; ctx.beginPath(); ctx.arc(kx + ks * 0.7, ky, ks * 0.16, 0, TAU); ctx.fill();
      }

      // ─── the ballerina ───
      function drawHand(x, y, ang, s, thumbSide) {
        // a soft palm, four slender rounded fingers and a thumb (outline pass, then fill pass)
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.lineCap = 'round';
        var F = [[-0.26, 0.5, -0.12], [-0.09, 0.62, -0.04], [0.09, 0.6, 0.04], [0.25, 0.46, 0.12]];
        for (var pass = 0; pass < 2; pass++) {
          var col = pass ? SKIN : SKIN_D, extra = pass ? 0 : s * 0.07;
          ctx.fillStyle = col; ctx.strokeStyle = col;
          ctx.beginPath(); ctx.ellipse(s * 0.42, 0, s * 0.42 + extra, s * 0.36 + extra, 0, 0, TAU); ctx.fill();
          ctx.lineWidth = s * 0.17 + extra * 2;
          for (var f = 0; f < F.length; f++) {
            var fy = F[f][0] * s, fl = F[f][1] * s, fa = F[f][2];
            ctx.beginPath(); ctx.moveTo(s * 0.7, fy); ctx.lineTo(s * 0.7 + Math.cos(fa) * fl, fy + Math.sin(fa) * fl); ctx.stroke();
          }
          ctx.beginPath(); ctx.moveTo(s * 0.35, thumbSide * s * 0.22);
          ctx.lineTo(s * 0.35 + Math.cos(thumbSide * 0.75) * s * 0.42, thumbSide * s * 0.22 + Math.sin(thumbSide * 0.75) * s * 0.42); ctx.stroke();
        }
        ctx.restore();
      }
      function limb(a, b, w, col, colD) {
        ctx.strokeStyle = colD; ctx.lineWidth = w + 1.6 * unit;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      function drawTutu(X0, Y0, rt, psi, flare, t, half) {
        // half: -1 = back half, 1 = front half
        var N = 22, ry = 0.3;
        function layer(r, col, alpha, droop, off) {
          ctx.fillStyle = col; ctx.globalAlpha *= alpha;
          ctx.beginPath();
          var started = false;
          for (var i = 0; i <= N; i++) {
            var th = (half > 0 ? 0 : Math.PI) + i / N * Math.PI;
            var rip = 1 + 0.05 * Math.sin(th * 7 + psi * 3 + off) * (0.4 + flare);
            var px = X0 + Math.cos(th) * r * rip, py = Y0 + Math.sin(th) * r * ry * rip + droop * r;
            var th2 = th + Math.PI / N * 0.5;
            var qx = X0 + Math.cos(th2) * r * rip * 1.08, qy = Y0 + Math.sin(th2) * r * ry * rip * 1.08 + droop * r * 1.25;
            if (!started) { ctx.moveTo(X0, Y0); ctx.lineTo(px, py); started = true; }
            else ctx.quadraticCurveTo(qx, qy, px, py);
          }
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha /= alpha;
        }
        var droop = lerp(0.12, 0.02, flare);
        layer(rt * 1.08, '#FFFFFF', 0.35, droop + 0.03, 1.3);
        layer(rt, TUTU, 1, droop, 0);
        layer(rt * 0.78, TUTU_L, 0.85, droop * 0.6, 2.1);
        if (half > 0) {
          // pleats + sequins, rotating with her
          ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = Math.max(0.8, rt * 0.012);
          ctx.beginPath();
          for (var p = 0; p < 12; p++) {
            var a = p / 12 * TAU + psi; a = ((a % TAU) + TAU) % TAU;
            if (a > Math.PI) continue;
            ctx.moveTo(X0 + Math.cos(a) * rt * 0.3, Y0 + Math.sin(a) * rt * ry * 0.3 + droop * rt * 0.2);
            ctx.lineTo(X0 + Math.cos(a) * rt * 0.95, Y0 + Math.sin(a) * rt * ry * 0.95 + droop * rt);
          }
          ctx.stroke();
          for (var q = 0; q < 9; q++) {
            var b = q / 9 * TAU + psi + 0.3; b = ((b % TAU) + TAU) % TAU;
            if (b > Math.PI) continue;
            var tw = 0.5 + 0.5 * Math.sin(t * 0.012 + q * 2);
            ctx.fillStyle = hexA('#FFFFFF', 0.5 + 0.5 * tw);
            sparkPath(ctx, X0 + Math.cos(b) * rt * 0.68, Y0 + Math.sin(b) * rt * ry * 0.68 + droop * rt * 0.6, rt * 0.035 * (0.6 + tw)); ctx.fill();
          }
        }
      }
      function drawHead(hx, hy, r, yaw, t) {
        var cy = Math.cos(yaw), sy = Math.sin(yaw);
        // bun behind the head first if it points away
        var bunX = hx - sy * r * 0.62, bunY = hy - r * (0.9 + 0.1 * Math.max(0, cy)), bunZ = -cy;
        function bun() {
          var bg = ctx.createRadialGradient(bunX - r * 0.12, bunY - r * 0.12, 1, bunX, bunY, r * 0.5);
          bg.addColorStop(0, HAIR_HI); bg.addColorStop(1, HAIR);
          ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bunX, bunY, r * 0.46, 0, TAU); ctx.fill();
          // a tiny pink flower + pearls around the bun
          ctx.fillStyle = '#FFFFFF';
          for (var p = 0; p < 6; p++) { var pa = p / 6 * TAU + 0.4; ctx.beginPath(); ctx.arc(bunX + Math.cos(pa) * r * 0.46, bunY + Math.sin(pa) * r * 0.46 * 0.9, r * 0.07, 0, TAU); ctx.fill(); }
          var fx = bunX + r * 0.3 * (sy >= 0 ? 1 : -1) * (Math.abs(sy) > 0.2 ? 1 : 0) + (Math.abs(sy) <= 0.2 ? r * 0.32 : 0), fy = bunY + r * 0.18;
          ctx.fillStyle = '#FF8DBE';
          for (var q = 0; q < 5; q++) { var qa = q / 5 * TAU; ctx.beginPath(); ctx.arc(fx + Math.cos(qa) * r * 0.11, fy + Math.sin(qa) * r * 0.11, r * 0.09, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#FFE38A'; ctx.beginPath(); ctx.arc(fx, fy, r * 0.07, 0, TAU); ctx.fill();
        }
        if (bunZ <= 0.25) bun();
        // head + ear-length hair: skin first, then the hair cap clipped to the head
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, r * 1.02, 0, TAU); ctx.clip();
        var front = Math.max(0, cy);
        var hr = r * (1.0 + 0.5 * Math.max(0, -cy));
        var hox = -sy * r * 0.55, hoy = -r * (0.58 * front + 0.2 * Math.abs(sy)) + r * 0.05 * Math.max(0, -cy);
        var hg = ctx.createRadialGradient(hx + hox - r * 0.3, hy + hoy - r * 0.4, 1, hx + hox, hy + hoy, hr * 1.1);
        hg.addColorStop(0, HAIR_HI); hg.addColorStop(1, HAIR);
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx + hox, hy + hoy, hr, 0, TAU); ctx.fill();
        if (cy > 0.6) {     // centre parting
          ctx.strokeStyle = 'rgba(255,220,190,.35)'; ctx.lineWidth = r * 0.06;
          ctx.beginPath(); ctx.moveTo(hx + sy * r * 0.3, hy - r * 0.98); ctx.quadraticCurveTo(hx + sy * r * 0.3, hy - r * 0.7, hx + sy * r * 0.3 - r * 0.02, hy - r * 0.55); ctx.stroke();
        }
        ctx.restore();
        if (cy > -0.05) {
          if (cy > 0.82) {
            // front view: two serene closed eyes with lashes, blush, closed smile
            var ex = r * 0.38;
            ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
            [-1, 1].forEach(function (s) {
              var x = hx + sy * r * 0.35 + s * ex * cy, y = hy + r * 0.12;
              ctx.beginPath(); ctx.arc(x, y - r * 0.08, r * 0.17, 0.35, Math.PI - 0.35); ctx.stroke();
              ctx.lineWidth = Math.max(0.8, r * 0.05);
              ctx.beginPath(); ctx.moveTo(x + s * r * 0.15, y + r * 0.02); ctx.lineTo(x + s * r * 0.24, y + r * 0.05); ctx.stroke();
              ctx.lineWidth = Math.max(1, r * 0.09);
            });
            ctx.fillStyle = 'rgba(255,120,160,.45)';
            [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(hx + sy * r * 0.3 + s * r * 0.58 * cy, hy + r * 0.38, r * 0.17, r * 0.1, 0, 0, TAU); ctx.fill(); });
            ctx.strokeStyle = '#C2456E'; ctx.lineWidth = Math.max(1, r * 0.08);
            ctx.beginPath(); ctx.arc(hx + sy * r * 0.35, hy + r * 0.4, r * 0.17, 0.5, Math.PI - 0.5); ctx.stroke();
          } else {
            // profile: ONE eye, a little nose on the silhouette, closed smile
            var sd = sy >= 0 ? 1 : -1;
            ctx.fillStyle = SKIN;
            ctx.beginPath(); ctx.ellipse(hx + sd * r * 0.96, hy + r * 0.18, r * 0.13, r * 0.11, 0, 0, TAU); ctx.fill();
            var exx = hx + sd * r * 0.5, eyy = hy + r * 0.04;
            ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(exx, eyy - r * 0.06, r * 0.15, 0.4, Math.PI - 0.4); ctx.stroke();
            ctx.lineWidth = Math.max(0.8, r * 0.05);
            ctx.beginPath(); ctx.moveTo(exx - sd * r * 0.13, eyy + r * 0.04); ctx.lineTo(exx - sd * r * 0.22, eyy + r * 0.07); ctx.stroke();
            ctx.fillStyle = 'rgba(255,120,160,.45)';
            ctx.beginPath(); ctx.ellipse(hx + sd * r * 0.42, hy + r * 0.38, r * 0.15, r * 0.09, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#C2456E'; ctx.lineWidth = Math.max(1, r * 0.07);
            ctx.beginPath(); ctx.moveTo(hx + sd * r * 0.62, hy + r * 0.5); ctx.quadraticCurveTo(hx + sd * r * 0.74, hy + r * 0.58, hx + sd * r * 0.84, hy + r * 0.48); ctx.stroke();
            // the ear, on the side of the head
            ctx.fillStyle = SKIN_D; ctx.beginPath(); ctx.ellipse(hx - sd * r * 0.12, hy + r * 0.1, r * 0.12, r * 0.17, 0, 0, TAU); ctx.fill();
          }
        }
        if (bunZ > 0.25) bun();
      }

      function drawBallerina(bx, by, Hb, psi, headYaw, P, flare, t) {
        var cP = Math.cos(psi), sP = Math.sin(psi), KZ = 0.2;
        function pr(v) {
          var X = v[0] * cP + v[2] * sP, Z = -v[0] * sP + v[2] * cP;
          return [bx + X * Hb, by - v[1] * Hb + Z * Hb * KZ, Z];
        }
        var hipL = pr([-0.04, 0.5, 0]), hipR = pr([0.04, 0.5, 0]);
        var lk = pr(P.lk), lf = pr(P.lf), rk = pr(P.rk), rf = pr(P.rf);
        var waist = pr([0, 0.5, 0]);
        var leanX = P.lean * sP * Hb, leanY = P.lean * cP * Hb * KZ;
        var shL = pr([-0.085, 0.73, 0]), shR = pr([0.085, 0.73, 0]);
        shL[0] += leanX; shR[0] += leanX; shL[1] += leanY; shR[1] += leanY;
        var le = pr(P.le), lh = pr(P.lh), re = pr(P.re), rh = pr(P.rh);
        le[0] += leanX * 0.8; lh[0] += leanX * 0.6; re[0] += leanX * 0.8; rh[0] += leanX * 0.6;
        var lw = Hb * 0.042, sw = Hb * 0.032;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // legs, the one further away first
        function leg(hip, kn, ft) {
          limb(hip, kn, lw, TIGHTS, TIGHTS_D);
          limb(kn, ft, sw, TIGHTS, TIGHTS_D);
          // pointe shoe along the shin line + ribbon
          var dx = ft[0] - kn[0], dy = ft[1] - kn[1], dl = Math.hypot(dx, dy) || 1;
          var ux = dx / dl, uy = dy / dl;
          ctx.fillStyle = SHOE;
          ctx.beginPath(); ctx.ellipse(ft[0] - ux * Hb * 0.01, ft[1] - uy * Hb * 0.01, Hb * 0.032, Hb * 0.019, Math.atan2(uy, ux), 0, TAU); ctx.fill();
          ctx.strokeStyle = '#FF77AA'; ctx.lineWidth = Math.max(0.8, Hb * 0.006);
          ctx.beginPath(); ctx.moveTo(ft[0] - ux * Hb * 0.05 - uy * sw * 0.5, ft[1] - uy * Hb * 0.05 + ux * sw * 0.5); ctx.lineTo(ft[0] - ux * Hb * 0.025 + uy * sw * 0.5, ft[1] - uy * Hb * 0.025 - ux * sw * 0.5); ctx.stroke();
        }
        var legs = [[hipL, lk, lf, (lk[2] + lf[2])], [hipR, rk, rf, (rk[2] + rf[2])]];
        legs.sort(function (a, b) { return a[3] - b[3]; });
        legs.forEach(function (l) { leg(l[0], l[1], l[2]); });

        // arms: decide which go behind the torso
        var arms = [[shL, le, lh, -1], [shR, re, rh, 1]];
        function arm(a) {
          limb(a[0], a[1], Hb * 0.026, SKIN, SKIN_D);
          limb(a[1], a[2], Hb * 0.022, SKIN, SKIN_D);
          var ang = Math.atan2(a[2][1] - a[1][1], a[2][0] - a[1][0]);
          drawHand(a[2][0], a[2][1], ang, Hb * 0.036, -a[3] * (cP >= 0 ? 1 : -1));
        }
        var behind = arms.filter(function (a) { return (a[1][2] + a[2][2]) < -0.06; });
        var infront = arms.filter(function (a) { return (a[1][2] + a[2][2]) >= -0.06; });

        var rt = Hb * 0.22 * (1 + 0.28 * flare);
        drawTutu(waist[0], waist[1], rt, psi, flare, t, -1);
        behind.forEach(arm);

        // torso: skin shoulders + a bodice with a sweetheart neckline
        var fac = Math.sqrt(cP * cP + 0.45 * sP * sP);
        var wx = waist[0], wy = waist[1] - Hb * 0.01;
        var chx = (shL[0] + shR[0]) / 2, chy = by - 0.705 * Hb + leanY;
        var shy = (shL[1] + shR[1]) / 2;
        var shw = Math.abs(shR[0] - shL[0]) / 2; if (shw < Hb * 0.05) shw = Hb * 0.05;
        ctx.fillStyle = SKIN;
        ctx.beginPath();
        ctx.moveTo(chx - shw * 0.85, chy + Hb * 0.02);
        ctx.quadraticCurveTo(chx - shw * 1.05, shy, chx - shw * 0.6, shy - Hb * 0.012);
        ctx.lineTo(chx + shw * 0.6, shy - Hb * 0.012);
        ctx.quadraticCurveTo(chx + shw * 1.05, shy, chx + shw * 0.85, chy + Hb * 0.02);
        ctx.closePath(); ctx.fill();
        // neck
        ctx.strokeStyle = SKIN; ctx.lineWidth = Hb * 0.034;
        var hx = chx + P.lean * sP * Hb * 0.2, hy = by - 0.855 * Hb + leanY;
        ctx.beginPath(); ctx.moveTo(chx, shy); ctx.lineTo(hx, hy); ctx.stroke();
        // bodice
        var bw2 = Hb * 0.05 * fac, cw = Hb * 0.072 * fac + Math.abs(sP) * Hb * 0.01;
        var bg = ctx.createLinearGradient(chx - cw, 0, chx + cw, 0);
        bg.addColorStop(0, mixHex(BODICE, '#000000', 0.12)); bg.addColorStop(0.4, mixHex(BODICE, '#FFFFFF', 0.25)); bg.addColorStop(1, mixHex(BODICE, '#000000', 0.18));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(wx - bw2, wy + Hb * 0.02);
        ctx.quadraticCurveTo(wx - bw2 * 0.9, wy - Hb * 0.08, chx - cw, chy);
        if (cP > 0.3) {
          ctx.quadraticCurveTo(chx - cw * 0.5, chy - Hb * 0.03, chx, chy + Hb * 0.004);
          ctx.quadraticCurveTo(chx + cw * 0.5, chy - Hb * 0.03, chx + cw, chy);
        } else {
          ctx.quadraticCurveTo(chx, chy - Hb * 0.012, chx + cw, chy);
        }
        ctx.quadraticCurveTo(wx + bw2 * 0.9, wy - Hb * 0.08, wx + bw2, wy + Hb * 0.02);
        ctx.closePath(); ctx.fill();
        if (cP > 0.3) {     // little bow + bodice seams on the front
          ctx.globalAlpha *= clamp01((cP - 0.3) * 3);
          ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = Math.max(0.8, Hb * 0.005);
          ctx.beginPath(); ctx.moveTo(chx, chy + Hb * 0.01); ctx.lineTo(wx, wy); ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          var bwy = chy + Hb * 0.012;
          ctx.beginPath(); ctx.ellipse(chx - Hb * 0.014, bwy, Hb * 0.014, Hb * 0.008, -0.3, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(chx + Hb * 0.014, bwy, Hb * 0.014, Hb * 0.008, 0.3, 0, TAU); ctx.fill();
          ctx.globalAlpha /= clamp01((cP - 0.3) * 3) || 1;
        }
        drawTutu(waist[0], waist[1], rt, psi, flare, t, 1);
        drawHead(hx, hy, Hb * 0.078, headYaw, t);
        infront.forEach(arm);
      }

      // ─── notes ───
      function notePath(x, y, s, kind, rot, col) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
        if (kind === 0) {
          ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.22, -0.4, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 0.05); ctx.lineTo(s * 0.25, -s * 1.05); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 1.05);
          ctx.bezierCurveTo(s * 0.4, -s * 0.85, s * 0.72, -s * 0.78, s * 0.6, -s * 0.38);
          ctx.bezierCurveTo(s * 0.58, -s * 0.6, s * 0.42, -s * 0.72, s * 0.25, -s * 0.75); ctx.fill();
        } else {
          ctx.beginPath(); ctx.ellipse(0, 0, s * 0.27, s * 0.2, -0.4, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(s * 0.75, -s * 0.15, s * 0.27, s * 0.2, -0.4, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(s * 0.22, -s * 0.05); ctx.lineTo(s * 0.22, -s * 0.98); ctx.moveTo(s * 0.97, -s * 0.2); ctx.lineTo(s * 0.97, -s * 1.13); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s * 0.17, -s * 0.98); ctx.lineTo(s * 1.02, -s * 1.13); ctx.lineTo(s * 1.02, -s * 0.95); ctx.lineTo(s * 0.17, -s * 0.8); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(-s * 0.08, -s * 0.07, s * 0.09, s * 0.05, -0.4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawNote(x, y, s, kind, rot, ci, a) {
        if (a <= 0.01) return;
        ctx.globalAlpha = a * 0.75;
        var gs = s * 3.4;
        ctx.drawImage(sprites[ci], x + s * 0.3 - gs / 2, y - s * 0.45 - gs / 2, gs, gs);
        ctx.globalAlpha = a;
        notePath(x, y, s, kind, rot, mixHex(NOTE_COLS[ci], '#FFFFFF', 0.2));
      }
      function drawStarShape(x, y, r, col, a) {
        if (a <= 0.01) return;
        ctx.globalAlpha = a * 0.7;
        ctx.drawImage(sprites[1], x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.beginPath();
        for (var i = 0; i < 10; i++) { var aa = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; if (i) ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); else ctx.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.18, 0, TAU); ctx.fill();
      }
      function petalShape(x, y, s, rot, flip, col, a) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(flip, 1); ctx.globalAlpha = a;
        var g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, col); g.addColorStop(1, mixHex(col, '#C2185B', 0.3));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, s);
        ctx.bezierCurveTo(-s * 0.9, s * 0.2, -s * 0.7, -s * 0.9, -s * 0.12, -s * 0.8);
        ctx.lineTo(0, -s * 0.6); ctx.lineTo(s * 0.12, -s * 0.8);
        ctx.bezierCurveTo(s * 0.7, -s * 0.9, s * 0.9, s * 0.2, 0, s);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // ─── dancer state over time ───
      function dancer(p, t) {
        var st = { psi: 0, yaw: 0, flare: 0, pose: POSES.stand, lift: 0, jump: 0 };
        st.lift = easeOutBack(clamp01((p - T.rise0) / (T.rise1 - T.rise0)));
        var tp = easeInOut((p - T.toP0) / (T.toP1 - T.toP0));
        st.pose = mixPose(POSES.stand, POSES.passe, tp);
        var sq = clamp01((p - T.spin0) / (T.spin1 - T.spin0));
        var endPsi = T.turns * TAU + (isSuper ? Math.PI / 2 : 0);
        st.psi = endPsi * easeSine(sq);
        st.flare = Math.pow(Math.sin(Math.PI * sq), 0.8);
        // spotting: the head stays facing us, then whips round
        var turns = st.psi / TAU, fr = turns - Math.floor(turns);
        st.yaw = sq > 0 && sq < 1 ? (fr < 0.72 ? -fr * 0.5 : lerp(-0.36, -TAU, (fr - 0.72) / 0.28)) + st.psi : st.psi;
        if (!isSuper) {
          var oq = easeInOut((p - 0.8) / 0.1);
          if (oq > 0) st.pose = mixPose(POSES.passe, POSES.open, oq);
          if (sq >= 1) { st.yaw = 0; st.psi = 0; }
        } else if (p >= T.spin1) {
          st.psi = Math.PI / 2; st.yaw = Math.PI / 2; st.flare = 0;
          var a1 = easeInOut((p - 0.5) / 0.05);           // prep
          st.pose = mixPose(POSES.passe, POSES.stand, a1);
          var j = (p - 0.55) / 0.14;                       // the leap
          if (j > 0) {
            var jj = clamp01(j);
            st.jump = Math.sin(Math.PI * jj);
            st.pose = jj < 0.5 ? mixPose(POSES.stand, POSES.jete, easeOut(jj / 0.5)) : mixPose(POSES.jete, POSES.arab, easeInOut((jj - 0.5) / 0.5));
            st.flare = 0.5 * Math.sin(Math.PI * jj);
          }
          if (p > 0.69) {
            var breathe = Math.sin((p - 0.69) / 0.17 * Math.PI) * 0.02;
            st.pose = mixPose(POSES.arab, POSES.arab, 0); st.pose.rh = [0.05, 0.87 + breathe, 0.32];
          }
          var fq = easeInOut((p - 0.86) / 0.09);           // turn to face us, arms open
          if (fq > 0) { st.pose = mixPose(POSES.arab, POSES.open, fq); st.psi = lerp(Math.PI / 2, TAU, fq); st.yaw = st.psi; st.flare = 0.4 * Math.sin(Math.PI * fq); }
        }
        return st;
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 300);
        layout();
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var b = bgStars[i], k = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t / 1000 * b.rate + b.tw));
          ctx.fillStyle = hexA('#FFFFFF', 0.5 * k * gFade * clamp01(t / 300));
          sparkPath(ctx, b.x * W, b.y * H, b.size * 2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;

        // pop-in scale around the box's base
        var pop = easeOutBack(clamp01(p / T.pop)), popA = clamp01(p / (T.pop * 0.6));
        ctx.translate(L.cx, L.bot); ctx.scale(lerp(0.55, 1, pop), lerp(0.55, 1, pop)); ctx.translate(-L.cx, -L.bot);
        ctx.globalAlpha = gFade * popA;

        var lidE = clamp01((p - T.lid0) / (T.lid1 - T.lid0));
        var phi = lerp(0, 1.86, easeOutBack(lidE));
        var openA = clamp01(lidE * 1.5);
        var cxs = L.cx, keyA = t * 0.0045;

        // a soft halo of warm light behind the box
        if (openA > 0) {
          var hg = ctx.createRadialGradient(cxs, L.standY - L.Hb * 0.5, 0, cxs, L.standY - L.Hb * 0.5, L.bw * 1.0);
          hg.addColorStop(0, hexA(accent, 0.22 * openA)); hg.addColorStop(0.5, hexA(primary, 0.1 * openA)); hg.addColorStop(1, hexA(primary, 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cxs, L.standY - L.Hb * 0.5, L.bw, 0, TAU); ctx.fill();
        }

        // super ring: items behind the box
        var ringA = isSuper ? clamp01((p - 0.45) / 0.08) : 0;
        var ringCY = L.topF + L.fh * 0.25, ringRX = Math.min(L.bw * 0.82, W * 0.46), ringRY = L.bw * 0.17;
        function drawRing(front) {
          if (ringA <= 0) return;
          if (!front) {
            ctx.globalAlpha = gFade * ringA * 0.4;
            ctx.strokeStyle = hexA(accent, 0.6); ctx.lineWidth = 2 * unit;
            ctx.beginPath(); ctx.ellipse(cxs, ringCY, ringRX, ringRY, 0, Math.PI, TAU); ctx.stroke();
          } else {
            ctx.globalAlpha = gFade * ringA * 0.5;
            ctx.strokeStyle = hexA(accent, 0.7); ctx.lineWidth = 2.4 * unit;
            ctx.beginPath(); ctx.ellipse(cxs, ringCY, ringRX, ringRY, 0, 0, Math.PI); ctx.stroke();
          }
          for (var r = 0; r < ring.length; r++) {
            var it = ring[r], a = it.a + t * 0.0011 * TAU * 0.25, sa = Math.sin(a);
            if ((sa >= 0) !== front) continue;
            var x = cxs + Math.cos(a) * ringRX, y = ringCY + sa * ringRY - L.bw * 0.03 * Math.sin(t * 0.004 + it.ph);
            var dsc = 0.75 + 0.3 * (sa + 1) / 2, s = L.bw * 0.07 * dsc;
            var al = gFade * ringA * (0.55 + 0.45 * (sa + 1) / 2);
            if (it.kind === 'note') drawNote(x, y, s, r % 4 === 0 ? 1 : 0, Math.sin(t * 0.005 + it.ph) * 0.2, it.col, al);
            else drawStarShape(x, y, s * 0.55 * (0.85 + 0.15 * Math.sin(t * 0.01 + it.ph)), mixHex(NOTE_COLS[it.col], '#FFFFFF', 0.4), al);
          }
          ctx.globalAlpha = gFade * popA;
        }
        drawRing(false);

        drawLid(phi, t);
        drawBoxTop(openA);

        // notes / sparks behind the dancer
        var dz = dancer(p, t);
        var spiralTop = H * 0.2;
        function noteState(n) {
          var tau = (t - n.at) / n.life;
          if (tau <= 0 || tau >= 1) return null;
          var ang = n.a0 + tau * TAU * 1.15;
          var rad = Math.min(L.bw * 0.68, W * 0.42) * (0.18 + 0.82 * easeOut(tau));
          var y0 = L.standY - L.Hb * 0.25;
          var y = lerp(y0, spiralTop, easeSine(tau)) + Math.sin(ang) * rad * 0.22;
          var x = cxs + Math.cos(ang) * rad;
          var a = clamp01(tau / 0.12) * clamp01((1 - tau) / 0.25);
          return { x: x, y: y, a: a, front: Math.sin(ang) > 0, s: L.bw * 0.075 * n.sz * (0.5 + 0.5 * easeOutBack(clamp01(tau / 0.25))), tau: tau };
        }
        function drawNotes(front) {
          for (var ni = 0; ni < notes.length; ni++) {
            var n = notes[ni], ns = noteState(n);
            if (!ns || ns.front !== front) continue;
            drawNote(ns.x, ns.y, ns.s * (front ? 1 : 0.85), n.kind, Math.sin(t * 0.004 + n.wob) * 0.25, n.col, gFade * ns.a * (front ? 1 : 0.7));
          }
          for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si], q = (t - sp.at) / sp.life;
            if (q <= 0 || q >= 1) continue;
            var ang = sp.a0 + q * TAU * 0.8;
            if ((Math.sin(ang) > 0) !== front) continue;
            var rad = Math.min(L.bw * 0.68, W * 0.42) * (sp.r0 + 0.5 * q);
            var x = cxs + Math.cos(ang) * rad, y = lerp(L.standY - L.Hb * 0.5, spiralTop + H * 0.08, q) + Math.sin(ang) * rad * 0.22;
            ctx.globalAlpha = gFade * Math.sin(q * Math.PI);
            ctx.fillStyle = mixHex(NOTE_COLS[sp.col], '#FFFFFF', 0.5);
            sparkPath(ctx, x, y, L.bw * 0.02 * (0.6 + 0.6 * Math.sin(q * Math.PI))); ctx.fill();
          }
          ctx.globalAlpha = gFade * popA;
        }
        drawNotes(false);

        // the dancer rising out of the box (clipped to above the spindle hole)
        if (dz.lift > 0.001) {
          var Hb = L.Hb;
          var toeY = L.standY - L.ped * dz.lift + (1 - clamp01(dz.lift)) * Hb * 1.05 - dz.jump * Hb * 0.42;
          var pedY = L.standY - L.ped * Math.min(dz.lift, 1.05);
          ctx.save();
          ctx.beginPath(); ctx.rect(0, 0, W, L.standY); ctx.clip();
          // spotlight cone from the mirror
          var sg = ctx.createRadialGradient(cxs, toeY - Hb * 0.45, 0, cxs, toeY - Hb * 0.45, Hb * 0.75);
          sg.addColorStop(0, hexA('#FFF6DA', 0.22 * clamp01(dz.lift))); sg.addColorStop(1, hexA('#FFF6DA', 0));
          ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cxs, toeY - Hb * 0.45, Hb * 0.75, 0, TAU); ctx.fill();
          // spindle + pedestal disc
          ctx.fillStyle = goldGrad(cxs - L.bw * 0.015, 0, cxs + L.bw * 0.015, 0);
          ctx.fillRect(cxs - L.bw * 0.012, pedY, L.bw * 0.024, L.standY - pedY + 2);
          var pg = ctx.createLinearGradient(cxs - L.bw * 0.07, 0, cxs + L.bw * 0.07, 0);
          pg.addColorStop(0, '#B9821E'); pg.addColorStop(0.4, '#FFF2B0'); pg.addColorStop(1, '#C8902A');
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.ellipse(cxs, pedY + L.bw * 0.008, L.bw * 0.07, L.bw * 0.018, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFE8A0';
          ctx.beginPath(); ctx.ellipse(cxs, pedY, L.bw * 0.07, L.bw * 0.016, 0, 0, TAU); ctx.fill();
          drawBallerina(cxs, toeY, Hb, dz.psi, dz.yaw, dz.pose, dz.flare, t);
          ctx.restore();
          // motion swirl while spinning fast
          if (dz.flare > 0.3) {
            ctx.globalAlpha = gFade * (dz.flare - 0.3) * 0.7;
            ctx.strokeStyle = hexA('#FFFFFF', 0.6); ctx.lineWidth = 1.6 * unit;
            for (var sw = 0; sw < 3; sw++) {
              var swy = toeY - Hb * (0.38 + sw * 0.06), swr = Hb * (0.3 + sw * 0.03), st0 = -dz.psi * 1.0 + sw * 2;
              ctx.beginPath(); ctx.ellipse(cxs, swy, swr, swr * 0.22, 0, st0, st0 + 1.6); ctx.stroke();
            }
            ctx.globalAlpha = gFade * popA;
          }
        }

        drawBoxFront(keyA);
        drawNotes(true);
        drawRing(true);
        ctx.restore();

        // super: petal shower (screen space)
        if (isSuper) {
          ctx.save();
          for (var pi2 = 0; pi2 < petals.length; pi2++) {
            var pt = petals[pi2], q2 = (p - pt.at) / pt.sp;
            if (q2 <= 0 || q2 > 1.4) continue;
            var px = pt.x * W + Math.sin(q2 * 5 + pt.ph) * pt.swing * unit, py = -30 * unit + q2 * H * 0.8;
            var flip = Math.cos(q2 * 7 + pt.ph);
            petalShape(px, py, 13 * unit * pt.sz, pt.rot + q2 * pt.vr, Math.abs(flip) < 0.15 ? 0.15 : flip, pt.col, gFade * clamp01(q2 * 5) * clamp01((1.4 - q2) * 3));
          }
          ctx.restore();
        }

        var tp = clamp01((t - txtAt) / 340);
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
