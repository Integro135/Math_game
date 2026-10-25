/* success-magic-storybook.js — מסך הצלחה: סֵפֶר קֶסֶם 📖
   ספר סיפורים גדול נוחת על המסך ונפתח (כמו ספר עברי — הכריכה נפתחת ימינה);
   הדפים מתעופפים ומתהפכים מעצמם, ומתוך הספר הפתוח עולות אותיות עבריות
   זוהרות (א ב ג ד ה ו …), כוכבים ולבבות קטנים שמסתחררים למעלה ומסתדרים
   בקשת נוצצת מעל הספר — ואז המחמאה נכתבת באור זהוב (מימין לשמאל).
   בסופר: עוד דפים מתהפכים, טירה קטנה וקשת בענן קופצות מתוך הדפים כמו
   בספר קופץ, ופרץ נצנצים גדול.
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
  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
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
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  var LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ'];
  var GOLD = '#F6C453', GOLD_L = '#FFE9A6', PAPER = '#FFF8EA', PAPER_D = '#E6D3B0', INKL = '#C7AE86';

  window.SUCCESS.styles.push({
    name: 'magic-storybook',
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
      var COVER = mixHex(primary, '#3A1452', 0.4), COVER_D = mixHex(primary, '#1E0A2E', 0.62), COVER_L = mixHex(primary, '#FFFFFF', 0.12);
      var fontFam = 'sans-serif';
      try { fontFam = window.getComputedStyle(root).fontFamily || fontFam; } catch (e) { /* keep default */ }

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1, txtRect = null;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
        txtRect = null;
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { drop: 0.09, o0: 0.1, o1: 0.2, nPages: 8, f0: 0.2, fStep: 0.042, fDur: 0.085, g0: 0.2, g1: 0.48, gTravel: 0.2, write: 0.4, wDur: 0.18,
            castle: 0.57, rainbow: 0.6, burst: 0.7 }
        : { drop: 0.13, o0: 0.15, o1: 0.29, nPages: 4, f0: 0.29, fStep: 0.07, fDur: 0.13, g0: 0.3, g1: 0.6, gTravel: 0.28, write: 0.52, wDur: 0.22 };

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 36 : 24); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.75, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // pages: page k flips at T.f0 + k*fStep; content index front = 2k, back = 2k+1
      var pageScribble = [];
      for (var pc = 0; pc < 2 * T.nPages + 2; pc++) {
        var ln = [];
        for (var li = 0; li < 4; li++) ln.push({ a: rnd(0.1, 0.22), b: rnd(0.62, 0.9), w: rnd(0, TAU) });
        pageScribble.push(ln);
      }

      // flying things: glyphs take the arc slots; stars/hearts sparkle in and around it
      var nGlyph = isSuper ? 14 : 10;
      var flyers = [];
      for (var gi = 0; gi < nGlyph; gi++)
        flyers.push({ kind: 'g', ch: LETTERS[gi], slot: gi, at: lerp(T.g0, T.g1, gi / (nGlyph - 1)), ph: rnd(0, TAU), sx: rnd(-0.3, 0.3),
                      col: gi % 3 === 0 ? glow : gi % 3 === 1 ? primary : accent });
      var nExtra = isSuper ? 16 : 10;
      for (var ei = 0; ei < nExtra; ei++)
        flyers.push({ kind: ei % 2 ? 'h' : 's', at: lerp(T.g0 + 0.02, T.g1 + 0.03, ei / (nExtra - 1)) + rnd(-0.015, 0.015), ph: rnd(0, TAU), sx: rnd(-0.3, 0.3),
                      ang: Math.PI + 0.25 + Math.random() * (Math.PI - 0.5), rf: Math.random() < 0.5 ? rnd(0.55, 0.8) : rnd(1.12, 1.25),
                      col: ei % 2 ? ['#FF7FAE', primary, '#FF5E8E'][ei % 3] : [accent, '#FFFFFF', GOLD_L][ei % 3], r: rnd(7, 12) });
      var arcDots = [];
      for (var ad = 0; ad < 46; ad++) arcDots.push({ u: ad / 45, ph: rnd(0, TAU), r: rnd(1.6, 3.4), off: rnd(-0.06, 0.06) });
      var dust = [];
      for (var du = 0; du < 14; du++) dust.push({ a: (du % 2 ? 0 : Math.PI) + rnd(-0.5, 0.5), v: rnd(60, 160), r: rnd(2, 4) });
      var burst = [];
      if (isSuper)
        for (var bi = 0; bi < 34; bi++)
          burst.push({ a: (bi / 34) * TAU + rnd(-0.1, 0.1), v: rnd(320, 560), r: rnd(6, 13), kind: bi % 3, col: [accent, '#FFFFFF', primary, glow, '#FF7FAE'][bi % 5], spin: rnd(-5, 5) });

      // ─── praise "written in golden light" (revealed right-to-left) + points ───
      var txtBase = 'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%);opacity:0;padding:0 .15em;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:clip-path,opacity;' +
        'font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'clip-path:inset(-40% -10% -40% 110%);';
      // glow layer underneath (text-shadow only), gold gradient text on top
      var txtGlow = document.createElement('div');
      txtGlow.dir = 'rtl';
      txtGlow.textContent = praise;
      txtGlow.style.cssText = txtBase + 'color:rgba(255,214,120,.35);' +
        'text-shadow:0 0 8px rgba(255,214,120,.95),0 0 22px ' + hexA(primary, 0.85) + ',0 0 44px ' + hexA(glow, 0.5) + ',0 2px 4px rgba(0,0,0,.5)';
      root.appendChild(txtGlow);
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText = txtBase +
        'color:' + textCol + ';' +
        'background-image:linear-gradient(105deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.95) 50%,rgba(255,255,255,0) 60%),' +
        'linear-gradient(180deg,#FFF7D1 0%,#FFE08A 35%,#F6B93B 70%,#FFE7A3 100%);' +
        'background-size:300% 100%,100% 100%;background-repeat:no-repeat;background-position:120% 0,0 0;' +
        '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent';
      root.appendChild(txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + ' + (isSuper ? '9.5%' : '8.5%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── book geometry (set per frame) ───
      var bh, bw, pad, cw, top, sx;

      /* A "leaf" (cover or page) hinged on the spine at sx. Hebrew book: unturned leaves
         lie LEFT of the spine and turn over to the RIGHT. theta 0 = lying left, PI = lying right.
         Content is drawn in natural coords X∈[0,w]; front has the spine at X=w, back at X=0. */
      function leafXform(theta, w) {
        var f = Math.cos(theta), lift = Math.sin(theta) * bh * 0.09;
        if (f >= 0) { f = Math.max(f, 0.002); ctx.transform(f, lift / w, 0, 1, sx - w * f, -lift); return true; }
        f = Math.max(-f, 0.002); ctx.transform(f, -lift / w, 0, 1, sx, 0); return false;
      }
      function pageShape(w, spineRight) {
        var r = bh * 0.03, y0 = top, y1 = top + bh;
        ctx.beginPath();
        if (spineRight) {
          ctx.moveTo(w, y0 + bh * 0.015); ctx.quadraticCurveTo(w * 0.6, y0 - bh * 0.012, r, y0);
          ctx.quadraticCurveTo(0, y0, 0, y0 + r); ctx.lineTo(0, y1 - r); ctx.quadraticCurveTo(0, y1, r, y1);
          ctx.quadraticCurveTo(w * 0.6, y1 - bh * 0.004, w, y1 - bh * 0.01); ctx.closePath();
        } else {
          ctx.moveTo(0, y0 + bh * 0.015); ctx.quadraticCurveTo(w * 0.4, y0 - bh * 0.012, w - r, y0);
          ctx.quadraticCurveTo(w, y0, w, y0 + r); ctx.lineTo(w, y1 - r); ctx.quadraticCurveTo(w, y1, w - r, y1);
          ctx.quadraticCurveTo(w * 0.4, y1 - bh * 0.004, 0, y1 - bh * 0.01); ctx.closePath();
        }
      }
      function doodle(kind, x, y, s) {
        if (kind === 0) { ctx.fillStyle = hexA(primary, 0.85); heartPath(ctx, x, y, s * 0.7); ctx.fill(); }
        else if (kind === 1) { ctx.fillStyle = GOLD; starPath(ctx, x, y, s, s * 0.45, 0); ctx.fill(); }
        else if (kind === 2) {
          ctx.fillStyle = mixHex(glow, '#FFFFFF', 0.3);
          ctx.beginPath(); ctx.arc(x, y, s * 0.8, 0, TAU); ctx.fill();
          ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x + s * 0.35, y - s * 0.2, s * 0.68, 0, TAU); ctx.fill();
        } else if (kind === 3) {
          ctx.fillStyle = '#FF9CC2';
          for (var i = 0; i < 5; i++) { var a = i / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.34, 0, TAU); ctx.fill(); }
          ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y, s * 0.26, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = '#FFB547'; ctx.lineWidth = s * 0.12;
          for (var j = 0; j < 8; j++) { var b = j / 8 * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(b) * s * 0.62, y + Math.sin(b) * s * 0.62); ctx.lineTo(x + Math.cos(b) * s * 0.9, y + Math.sin(b) * s * 0.9); ctx.stroke(); }
          ctx.fillStyle = '#FFD15C'; ctx.beginPath(); ctx.arc(x, y, s * 0.48, 0, TAU); ctx.fill();
        }
      }
      // one page side in natural coords; idx = content index
      function pageSide(w, spineRight, idx, t) {
        var g = ctx.createLinearGradient(0, 0, w, 0);
        if (spineRight) { g.addColorStop(0, PAPER); g.addColorStop(0.78, '#FCF2DE'); g.addColorStop(1, PAPER_D); }
        else { g.addColorStop(0, PAPER_D); g.addColorStop(0.22, '#FCF2DE'); g.addColorStop(1, PAPER); }
        pageShape(w, spineRight);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(170,140,100,.35)'; ctx.lineWidth = Math.max(0.8, bh * 0.004); ctx.stroke();
        var cx0 = w * 0.5 + (spineRight ? -w * 0.04 : w * 0.04);
        doodle(idx % 5, cx0, top + bh * 0.3, bh * 0.11);
        var lines = pageScribble[idx % pageScribble.length];
        ctx.strokeStyle = hexA(INKL, 0.75); ctx.lineWidth = Math.max(1, bh * 0.012); ctx.lineCap = 'round';
        for (var i = 0; i < lines.length; i++) {
          var L = lines[i], y = top + bh * (0.56 + i * 0.1);
          var xa = w * L.a + (spineRight ? 0 : w * 0.08), xb = w * L.b + (spineRight ? 0 : w * 0.08);
          ctx.beginPath(); ctx.moveTo(xa, y);
          for (var x = xa; x <= xb; x += w * 0.06) ctx.lineTo(x, y + Math.sin(x * 0.25 + L.w) * bh * 0.008);
          ctx.stroke();
        }
      }
      function coverFront(w) {
        var y0 = top - pad, h = bh + pad * 2;
        var g = ctx.createLinearGradient(0, y0, 0, y0 + h);
        g.addColorStop(0, COVER_L); g.addColorStop(1, COVER_D);
        rrect(ctx, 0, y0, w, h, pad * 1.1); ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(w - pad * 1.3, y0, pad * 1.3, h);       // spine band
        ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(1.5, pad * 0.22);
        rrect(ctx, pad * 0.9, y0 + pad * 0.9, w - pad * 2.6, h - pad * 1.8, pad * 0.6); ctx.stroke();
        ctx.fillStyle = GOLD;
        [[pad * 0.9, y0 + pad * 0.9], [w - pad * 1.7, y0 + pad * 0.9], [pad * 0.9, y0 + h - pad * 0.9], [w - pad * 1.7, y0 + h - pad * 0.9]].forEach(function (c) {
          ctx.beginPath(); ctx.arc(c[0], c[1], pad * 0.45, 0, TAU); ctx.fill();
        });
        var mx = (w - pad * 0.8) / 2;
        var sg = ctx.createRadialGradient(mx, top + bh * 0.33, 0, mx, top + bh * 0.33, bh * 0.26);
        sg.addColorStop(0, hexA(accent, 0.45)); sg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(mx, top + bh * 0.33, bh * 0.26, 0, TAU); ctx.fill();
        ctx.fillStyle = GOLD; starPath(ctx, mx, top + bh * 0.33, bh * 0.14, bh * 0.065, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; starPath(ctx, mx - bh * 0.02, top + bh * 0.31, bh * 0.05, bh * 0.022, 0); ctx.fill();
        ctx.fillStyle = '#FF9CC2';
        heartPath(ctx, mx - bh * 0.17, top + bh * 0.4, bh * 0.035); ctx.fill();
        heartPath(ctx, mx + bh * 0.17, top + bh * 0.4, bh * 0.035); ctx.fill();
        ctx.save();
        ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 ' + Math.round(bh * 0.15) + 'px ' + fontFam;
        ctx.fillStyle = GOLD_L; ctx.fillText('א ב ג', mx, top + bh * 0.67);
        ctx.restore();
      }
      function coverBack(w) {
        var y0 = top - pad, h = bh + pad * 2;
        rrect(ctx, 0, y0, w, h, pad * 1.1); ctx.fillStyle = COVER_D; ctx.fill();
        // endpaper lining with tiny stars
        var ex = pad * 0.55, ey = y0 + pad * 0.55, ew = w - pad * 1.1, eh = h - pad * 1.1;
        rrect(ctx, ex, ey, ew, eh, pad * 0.5); ctx.fillStyle = mixHex(primary, '#FFFFFF', 0.72); ctx.fill();
        ctx.fillStyle = hexA(mixHex(primary, '#FFFFFF', 0.35), 0.8);
        for (var i = 0; i < 4; i++) for (var j = 0; j < 5; j++)
          { starPath(ctx, ex + ew * (0.18 + i * 0.22 + (j % 2) * 0.1), ey + eh * (0.12 + j * 0.19), bh * 0.025, bh * 0.011, 0); ctx.fill(); }
      }
      function backBoard() {
        rrect(ctx, sx - cw, top - pad, cw, bh + pad * 2, pad * 1.1);
        ctx.fillStyle = COVER_D; ctx.fill();
      }
      function drawLeaf(theta, kind, idx, t) {
        ctx.save();
        var w = kind === 'cover' ? cw : bw;
        var front = leafXform(theta, w);
        if (kind === 'cover') { if (front) coverFront(w); else coverBack(w); }
        else pageSide(w, front, front ? idx * 2 : idx * 2 + 1, t);
        var sh = 1 - Math.abs(Math.cos(theta));
        if (sh > 0.02) {
          if (kind === 'cover') rrect(ctx, 0, top - pad, w, bh + pad * 2, pad * 1.1); else pageShape(w, front);
          ctx.fillStyle = 'rgba(70,40,60,' + (0.28 * sh).toFixed(3) + ')'; ctx.fill();
        }
        ctx.restore();
      }
      function stackEdges(side, n) {
        ctx.fillStyle = '#D9C49E';
        for (var i = n; i >= 1; i--) {
          var o = i * Math.max(1, bh * 0.008);
          if (side < 0) rrect(ctx, sx - bw - o, top + o, bw, bh, bh * 0.02);
          else rrect(ctx, sx + o, top + o, bw, bh, bh * 0.02);
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,120,80,.35)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }

      // super pop-ups: castle + rainbow, natural coords (base at 0,0, growing up), size s
      function castle(s) {
        var wall = ctx.createLinearGradient(0, -s * 0.5, 0, 0);
        wall.addColorStop(0, '#FFF0F7'); wall.addColorStop(1, '#F6C5DE');
        var roof = ctx.createLinearGradient(0, -s * 1.2, 0, -s * 0.6);
        roof.addColorStop(0, mixHex(primary, '#FFFFFF', 0.25)); roof.addColorStop(1, mixHex(primary, '#5A1E6E', 0.25));
        function tower(x, w, h) {
          ctx.fillStyle = wall; ctx.fillRect(x - w / 2, -h, w, h);
          ctx.fillStyle = 'rgba(200,120,160,.25)'; ctx.fillRect(x + w * 0.22, -h, w * 0.28, h);
          ctx.fillStyle = roof;
          ctx.beginPath(); ctx.moveTo(x - w * 0.62, -h); ctx.quadraticCurveTo(x - w * 0.2, -h - w * 0.5, x, -h - w * 1.25);
          ctx.quadraticCurveTo(x + w * 0.2, -h - w * 0.5, x + w * 0.62, -h); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#8A5A3A'; ctx.lineWidth = Math.max(1, s * 0.012);
          ctx.beginPath(); ctx.moveTo(x, -h - w * 1.25); ctx.lineTo(x, -h - w * 1.6); ctx.stroke();
          ctx.fillStyle = accent;
          ctx.beginPath(); ctx.moveTo(x, -h - w * 1.6); ctx.quadraticCurveTo(x + w * 0.3, -h - w * 1.58, x + w * 0.45, -h - w * 1.48);
          ctx.quadraticCurveTo(x + w * 0.25, -h - w * 1.4, x, -h - w * 1.36); ctx.closePath(); ctx.fill();
          // glowing window
          ctx.fillStyle = '#FFE38A';
          ctx.beginPath(); ctx.moveTo(x - w * 0.14, -h * 0.55); ctx.lineTo(x - w * 0.14, -h * 0.68); ctx.arc(x, -h * 0.68, w * 0.14, Math.PI, TAU); ctx.lineTo(x + w * 0.14, -h * 0.55); ctx.closePath(); ctx.fill();
        }
        tower(-s * 0.46, s * 0.24, s * 0.62);
        tower(s * 0.46, s * 0.24, s * 0.62);
        // main wall with crenellations
        ctx.fillStyle = wall; ctx.fillRect(-s * 0.4, -s * 0.42, s * 0.8, s * 0.42);
        for (var c = 0; c < 6; c++) ctx.fillRect(-s * 0.4 + c * s * 0.145, -s * 0.5, s * 0.08, s * 0.09);
        tower(0, s * 0.3, s * 0.8);
        // door
        ctx.fillStyle = '#9B5A7E';
        ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(-s * 0.1, -s * 0.16); ctx.arc(0, -s * 0.16, s * 0.1, Math.PI, TAU); ctx.lineTo(s * 0.1, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(s * 0.05, -s * 0.1, s * 0.015, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FF7FAE'; heartPath(ctx, 0, -s * 0.33, s * 0.05); ctx.fill();
      }
      function rainbow(R, band, sweep) {
        var cols = ['#FF6B8B', '#FFA94D', '#FFE066', '#7BE495', '#6CC5FF', '#B48CFF'];
        ctx.lineCap = 'butt';
        for (var i = 0; i < cols.length; i++) {
          ctx.strokeStyle = cols[i]; ctx.lineWidth = band * 1.05;
          ctx.beginPath(); ctx.arc(0, 0, R - i * band, Math.PI, Math.PI + Math.PI * sweep); ctx.stroke();
        }
        ctx.lineCap = 'round';
        ctx.fillStyle = '#FFFFFF';
        [-1, 1].forEach(function (sd) {
          var x = sd * (R - band * 2.5);
          ctx.beginPath(); ctx.arc(x, -band * 0.6, band * 1.5, 0, TAU); ctx.arc(x - band * 1.5, 0, band * 1.15, 0, TAU); ctx.arc(x + band * 1.5, 0, band * 1.15, 0, TAU); ctx.fill();
        });
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

        // geometry
        bh = Math.min(H * 0.3, W * 0.38);
        bw = bh * 0.78; pad = bh * 0.05; cw = bw + pad;
        var cx = W * 0.5;
        var cyBook = H * (W < H ? 0.68 : 0.7);
        var openE = easeInOut(clamp01((p - T.o0) / (T.o1 - T.o0)));
        var dropP = clamp01(p / T.drop);
        var dropY = (1 - easeOutBounce(dropP)) * -(cyBook + bh);
        top = cyBook - bh / 2 + dropY;
        sx = cx + (cw / 2) * (1 - openE);
        var arcCy = cyBook - bh / 2 + bh * 0.1;
        var rx = Math.min(bw * 1.75, W * 0.44), ry = Math.min(rx * 1.3, arcCy - H * (isSuper ? 0.34 : 0.32));

        // warm glow under/behind the book
        var bgA = 0.18 + 0.3 * openE;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, top + bh * 0.4); ctx.scale(1, 0.75);
        var bgg = ctx.createRadialGradient(0, 0, 0, 0, 0, bw * 2.3);
        bgg.addColorStop(0, hexA(accent, bgA * 0.7)); bgg.addColorStop(0.5, hexA(primary, bgA * 0.3)); bgg.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = bgg; ctx.beginPath(); ctx.arc(0, 0, bw * 2.3, 0, TAU); ctx.fill();
        ctx.restore();

        // light rays fanning out from behind the open pages
        if (openE > 0.3) {
          var la0 = clamp01((openE - 0.3) / 0.7) * (0.8 + 0.2 * Math.sin(t * 0.006));
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var la = la0 * 1.3, ox = cx, oy = top + bh * 0.3;
          for (var ri = 0; ri < 7; ri++) {
            var ra = -Math.PI / 2 + (ri - 3) * 0.24 + Math.sin(t * 0.0012 + ri) * 0.05;
            var rl = bh * (1.3 + 0.25 * Math.sin(t * 0.002 + ri * 1.7));
            var rg = ctx.createLinearGradient(ox, oy, ox + Math.cos(ra) * rl, oy + Math.sin(ra) * rl);
            rg.addColorStop(0, hexA(GOLD_L, 0.32 * la)); rg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = rg;
            var hw = 0.07;
            ctx.beginPath(); ctx.moveTo(ox + Math.cos(ra + Math.PI / 2) * bw * 0.06, oy + Math.sin(ra + Math.PI / 2) * bw * 0.06);
            ctx.lineTo(ox + Math.cos(ra - hw) * rl, oy + Math.sin(ra - hw) * rl);
            ctx.lineTo(ox + Math.cos(ra + hw) * rl, oy + Math.sin(ra + hw) * rl);
            ctx.lineTo(ox - Math.cos(ra + Math.PI / 2) * bw * 0.06, oy - Math.sin(ra + Math.PI / 2) * bw * 0.06); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }

        // ─── the book ───
        var thC = Math.PI * openE;
        var pages = [];
        for (var pk = 0; pk < T.nPages; pk++) {
          var fp = clamp01((p - (T.f0 + pk * T.fStep)) / T.fDur);
          pages.push(Math.PI * easeInOut(fp));
        }
        var leftIdx = T.nPages, rightIdx = -1;
        for (var q = 0; q < T.nPages; q++) { if (pages[q] <= 0) { leftIdx = q; break; } }
        for (var q2 = T.nPages - 1; q2 >= 0; q2--) { if (pages[q2] >= Math.PI) { rightIdx = q2; break; } }
        // landing squash
        var lt = (p - T.drop) * dur;
        var sq = lt > 0 ? Math.sin(lt * 0.03) * Math.exp(-lt * 0.012) * 0.05 : 0;
        ctx.save();
        ctx.translate(cx, top + bh); ctx.scale(1 + sq, 1 - sq); ctx.translate(-cx, -(top + bh));

        backBoard();
        stackEdges(-1, 3);
        ctx.save(); leafXform(0, bw); pageSide(bw, true, leftIdx * 2, t); ctx.restore();
        if (thC >= Math.PI / 2) drawLeaf(thC, 'cover', 0, t);
        if (thC >= Math.PI - 0.001) {
          stackEdges(1, Math.min(3, rightIdx + 1));
          if (rightIdx >= 0) { ctx.save(); leafXform(Math.PI, bw); pageSide(bw, false, rightIdx * 2 + 1, t); ctx.restore(); }
        }
        // spine shadow
        if (openE > 0.5) {
          var sg2 = ctx.createLinearGradient(sx - bw * 0.14, 0, sx + bw * 0.14, 0);
          sg2.addColorStop(0, 'rgba(90,55,35,0)'); sg2.addColorStop(0.5, 'rgba(90,55,35,' + (0.3 * (openE - 0.5) * 2).toFixed(3) + ')'); sg2.addColorStop(1, 'rgba(90,55,35,0)');
          ctx.fillStyle = sg2; ctx.fillRect(sx - bw * 0.14, top, bw * 0.28, bh);
        }
        // turning pages: the ones over the right side first (earlier below), then those still on the left (later below)
        for (var r1 = 0; r1 < T.nPages; r1++) if (pages[r1] >= Math.PI / 2 && pages[r1] < Math.PI) drawLeaf(pages[r1], 'page', r1, t);
        for (var l1 = T.nPages - 1; l1 >= 0; l1--) if (pages[l1] > 0 && pages[l1] < Math.PI / 2) drawLeaf(pages[l1], 'page', l1, t);
        if (thC < Math.PI / 2) drawLeaf(thC, 'cover', 0, t);
        ctx.restore();

        // landing dust sparkles
        if (lt > 0 && lt < 600) {
          var dq = lt / 600;
          for (var di = 0; di < dust.length; di++) {
            var dd = dust[di];
            ctx.fillStyle = hexA(GOLD_L, (1 - dq) * 0.9);
            sparkPath(ctx, cx + Math.cos(dd.a) * (cw * 0.6 + dd.v * dq * unit * 1.5), top + bh + pad - Math.abs(Math.sin(dd.a)) * dd.v * dq * unit, dd.r * unit * 2 * (1 - dq * 0.5)); ctx.fill();
          }
        }

        // magic light rising out of the open pages
        if (openE > 0.3) {
          var la = clamp01((openE - 0.3) / 0.7) * (0.8 + 0.2 * Math.sin(t * 0.006));
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var ox = cx, oy = top + bh * 0.25;
          // (rays are drawn behind the book)
          var pg = ctx.createRadialGradient(ox, oy + bh * 0.1, 0, ox, oy + bh * 0.1, bw * 1.1);
          pg.addColorStop(0, hexA(GOLD_L, 0.4 * la)); pg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ox, oy + bh * 0.1, bw * 1.1, 0, TAU); ctx.fill();
          ctx.restore();
        }

        // ─── super: pop-up rainbow + castle out of the pages ───
        if (isSuper) {
          var baseY = top + bh * 0.82;
          var rbP = clamp01((p - T.rainbow) / 0.1);
          if (rbP > 0) {
            ctx.save(); ctx.translate(cx, baseY);
            ctx.scale(1, Math.max(0.01, easeOutBack(rbP)));
            ctx.globalAlpha = gFade * clamp01(rbP * 3);
            rainbow(bw * 1.28, bw * 0.085, easeOut(clamp01(rbP * 1.4)));
            ctx.restore();
          }
          var caP = clamp01((p - T.castle) / 0.1);
          if (caP > 0) {
            var ce = easeOutBack(caP);
            ctx.save(); ctx.translate(cx, baseY);
            ctx.transform(1, 0, (1 - Math.min(1, ce)) * 0.4, Math.max(0.01, ce), 0, 0);
            ctx.globalAlpha = gFade * clamp01(caP * 4);
            castle(bw * 0.95);
            ctx.restore();
          }
        }

        // ─── the sparkling arc + rising glyphs, stars, hearts ───
        ctx.globalAlpha = gFade;
        var arcReveal = clamp01((p - T.g0 - T.gTravel * 0.8) / (T.g1 - T.g0 + 0.05));
        for (var ai = 0; ai < arcDots.length; ai++) {
          var dt = arcDots[ai];
          var uRev = 1 - dt.u;                                  // revealed right → left
          if (uRev > arcReveal) continue;
          var aa = Math.PI + 0.2 + dt.u * (Math.PI - 0.4);
          var rr2 = 1.1 + dt.off;
          var tw = 0.5 + 0.5 * Math.sin(t * 0.009 + dt.ph);
          ctx.fillStyle = hexA(ai % 3 ? GOLD_L : '#FFFFFF', 0.35 + 0.6 * tw);
          sparkPath(ctx, cx + Math.cos(aa) * rx * rr2, arcCy + Math.sin(aa) * ry * rr2, dt.r * unit * 2.2 * (0.6 + 0.6 * tw)); ctx.fill();
        }
        var fs = Math.max(20, Math.min(58, bh * 0.24));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '900 ' + Math.round(fs) + 'px ' + fontFam;
        var sAx = cx, sAy = top + bh * 0.3;
        for (var fi = 0; fi < flyers.length; fi++) {
          var fl = flyers[fi];
          var lq = (p - fl.at) / T.gTravel;
          if (lq <= 0) continue;
          var tx, ty;
          if (fl.kind === 'g') {
            var ga = 2 * Math.PI - 0.25 - fl.slot * (Math.PI - 0.5) / (nGlyph - 1);   // א at the right end
            tx = cx + Math.cos(ga) * rx; ty = arcCy + Math.sin(ga) * ry;
          } else { tx = cx + Math.cos(fl.ang) * rx * fl.rf; ty = arcCy + Math.sin(fl.ang) * ry * fl.rf; }
          var trail = fl.kind === 'g' ? 4 : 2;
          for (var tr = trail; tr >= 0; tr--) {
            var qq = clamp01(lq - tr * 0.045);
            if (qq <= 0) continue;
            var e = easeInOut(qq);
            var sr = Math.sin(qq * Math.PI) * bw * 0.5;
            var sa = fl.ph + qq * TAU * 1.25;
            var px = lerp(sAx + fl.sx * bw, tx, e) + Math.cos(sa) * sr;
            var py = lerp(sAy, ty, e) + Math.sin(sa) * sr * 0.55;
            if (tr > 0) {
              if (lq >= 1.1) continue;
              ctx.fillStyle = hexA(tr % 2 ? GOLD_L : fl.col, 0.5 * (1 - tr / (trail + 1)));
              sparkPath(ctx, px, py, (fs * 0.13) * (1 - tr / (trail + 2))); ctx.fill();
              continue;
            }
            var sc = 0.35 + 0.65 * easeOut(clamp01(qq * 1.4));
            var bob = lq >= 1 ? Math.sin(t * 0.004 + fl.ph) * fs * 0.06 : 0;
            var pulse = lq >= 1 ? 1 + 0.06 * Math.sin(t * 0.008 + fl.ph) : 1;
            var settle = lq >= 1 ? clamp01((lq - 1) / 0.25) : 0;
            if (fl.kind === 'g') {
              ctx.save();
              ctx.translate(px, py + bob); ctx.scale(sc * pulse, sc * pulse); ctx.rotate(Math.sin(t * 0.003 + fl.ph) * 0.08 * (1 - settle * 0.6));
              var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, fs * 0.95);
              hg.addColorStop(0, hexA(fl.col, 0.55)); hg.addColorStop(1, hexA(fl.col, 0));
              ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, fs * 0.95, 0, TAU); ctx.fill();
              var lg = ctx.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5);
              lg.addColorStop(0, '#FFFBE6'); lg.addColorStop(0.55, GOLD_L); lg.addColorStop(1, GOLD);
              ctx.shadowColor = hexA(fl.col, 0.95); ctx.shadowBlur = fs * 0.45;
              ctx.fillStyle = lg; ctx.fillText(fl.ch, 0, 0);
              ctx.shadowBlur = 0;
              ctx.restore();
            } else if (fl.kind === 'h') {
              var hr = fl.r * unit * 1.5 * sc * pulse;
              ctx.fillStyle = fl.col; heartPath(ctx, px, py + bob, hr); ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(px - hr * 0.42, py + bob - hr * 0.38, hr * 0.18, 0, TAU); ctx.fill();
            } else {
              var srr = fl.r * unit * 1.6 * sc * (lq >= 1 ? 0.75 + 0.35 * Math.abs(Math.sin(t * 0.006 + fl.ph)) : 1);
              ctx.fillStyle = fl.col; starPath(ctx, px, py + bob, srr, srr * 0.45, t * 0.001 + fl.ph); ctx.fill();
            }
          }
        }

        // super: big sparkle burst from the castle top
        if (isSuper) {
          var bt = (t - T.burst * dur) / 1000;
          if (bt > 0) {
            var bx = cx, by = top + bh * 0.82 - bw * 0.95 * 1.2;
            var fl2 = clamp01(1 - bt / 0.6);
            if (fl2 > 0) {
              ctx.save(); ctx.globalCompositeOperation = 'lighter';
              var fg = ctx.createRadialGradient(bx, by, 0, bx, by, bh * 1.4);
              fg.addColorStop(0, hexA('#FFFFFF', 0.55 * fl2)); fg.addColorStop(0.4, hexA(accent, 0.25 * fl2)); fg.addColorStop(1, hexA(accent, 0));
              ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(bx, by, bh * 1.4, 0, TAU); ctx.fill();
              ctx.strokeStyle = hexA(GOLD_L, 0.45 * fl2); ctx.lineWidth = 10 * unit * fl2 + 1;
              ctx.beginPath(); ctx.arc(bx, by, bh * 0.2 + bt * 900 * unit, 0, TAU); ctx.stroke();
              ctx.restore();
            }
            for (var bj = 0; bj < burst.length; bj++) {
              var b = burst[bj];
              if (bt > 1.3) break;
              var dr = 1 - Math.exp(-bt * 2.6);
              var bxx = bx + Math.cos(b.a) * b.v / 2.6 * dr * unit * 1.5;
              var byy = by + Math.sin(b.a) * b.v / 2.6 * dr * unit * 1.5 + 60 * bt * bt * unit;
              ctx.globalAlpha = gFade * clamp01((1.3 - bt) / 0.5);
              var brr = b.r * unit * 1.6;
              ctx.fillStyle = b.col;
              if (b.kind === 0) { starPath(ctx, bxx, byy, brr, brr * 0.45, b.spin * bt); ctx.fill(); }
              else if (b.kind === 1) { sparkPath(ctx, bxx, byy, brr * 1.2); ctx.fill(); }
              else { heartPath(ctx, bxx, byy, brr * 0.8); ctx.fill(); }
            }
            ctx.globalAlpha = gFade;
          }
        }

        // the pen of light writing the praise (right → left)
        var wq = clamp01((p - T.write) / T.wDur);
        if (wq > 0 && !txtRect) {
          var rb = txt.getBoundingClientRect(), rr = root.getBoundingClientRect();
          txtRect = { l: rb.left - rr.left, r: rb.right - rr.left, cy: (rb.top + rb.bottom) / 2 - rr.top, h: rb.height };
        }
        if (wq > 0 && wq < 1 && txtRect) {
          var penX = lerp(txtRect.r, txtRect.l, easeInOut(wq)), penY = txtRect.cy + Math.sin(wq * 40) * txtRect.h * 0.15;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          var pgl = ctx.createRadialGradient(penX, penY, 0, penX, penY, txtRect.h * 0.8);
          pgl.addColorStop(0, hexA('#FFFFFF', 0.9)); pgl.addColorStop(0.3, hexA(GOLD_L, 0.5)); pgl.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = pgl; ctx.beginPath(); ctx.arc(penX, penY, txtRect.h * 0.8, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; sparkPath(ctx, penX, penY, txtRect.h * 0.28 * (0.8 + 0.2 * Math.sin(t * 0.03))); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // praise reveal + shimmer, points
        var lIns = lerp(110, -10, easeInOut(wq));
        txt.style.clipPath = txtGlow.style.clipPath = 'inset(-40% -10% -40% ' + lIns.toFixed(2) + '%)';
        txt.style.opacity = txtGlow.style.opacity = String((wq > 0 ? 1 : 0) * gFade);
        var shine = clamp01((p - T.write - T.wDur) / 0.2);
        txt.style.backgroundPosition = (120 - 140 * shine).toFixed(1) + '% 0,0 0';
        if (ptsEl) {
          var pq = clamp01((t - (T.write + T.wDur * 0.8) * dur) / 300);
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
        if (txtGlow.parentNode) txtGlow.parentNode.removeChild(txtGlow);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
