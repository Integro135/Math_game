/* success-gumball-machine.js — מסך הצלחה: מְכוֹנַת מַסְטִיקִים 🍬
   מכונת מסטיקים עגולה וקלאסית (כיפת זכוכית מלאה כדורי מסטיק צבעוניים, בסיס
   אדום, ידית מסתובבת) קופצת פנימה. הידית מסתובבת סיבוב שלם בנצנוץ זהב, כדור
   מסטיק ורוד יורד בתוך הכיפה, מציץ מפתח המגלשה, קופץ החוצה, מקפץ פעמיים על
   הרצפה, מזנק למעלה ומתפוצץ במטר כוכבים צבעוניים — והשבח מופיע.
   בסופר: הכיפה מתמלאת עד גדותיה — המכסה קופץ, מפל כדורי מסטיק נשפך החוצה,
   מקפץ לכל רוחב המסך, ואז הכדורים קופצים אחד-אחד למקומם ויוצרים לב גדול ופועם.
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
  function starPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = i % 2 ? r * 0.48 : r, a = rot - Math.PI / 2 + i * Math.PI / 5;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function inHeart(x, y) {            // implicit heart, y up, ~x∈[-1.14,1.14] y∈[-1,1.25]
    var a = x * x + y * y - 1;
    return a * a * a - x * x * y * y * y <= -0.015;
  }

  var GUM = ['#FF4F7B', '#FFB13B', '#FFE14D', '#5BD66B', '#4FB8FF', '#A77BFF', '#FF7BD5', '#FF8A4F', '#4FE0C8'];

  window.SUCCESS.styles.push({
    name: 'gumball-machine',
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

      // shaded gumball sprites, one per colour (off-DOM canvases)
      var cols = GUM.concat([primary]);
      function makeBall(col) {
        var c = document.createElement('canvas'); c.width = c.height = 72;
        var g = c.getContext('2d');
        var gr = g.createRadialGradient(27, 25, 3, 36, 36, 35);
        gr.addColorStop(0, mixHex(col, '#FFFFFF', 0.72)); gr.addColorStop(0.3, mixHex(col, '#FFFFFF', 0.15));
        gr.addColorStop(0.75, col); gr.addColorStop(1, mixHex(col, '#000000', 0.4));
        g.fillStyle = gr; g.beginPath(); g.arc(36, 36, 34, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(25, 22, 8, 5, -0.6, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(47, 52, 6, 3, -0.6, 0, TAU); g.fill();
        return c;
      }
      var sprites = cols.map(makeBall);
      function ball(ci, x, y, r, sqx, sqy) {     // (x,y) = centre; squash keeps the bottom on the floor
        sqx = sqx || 1; sqy = sqy || 1;
        ctx.drawImage(sprites[ci], x - r * sqx, y + r - 2 * r * sqy, 2 * r * sqx, 2 * r * sqy);
      }
      var PINK = 0;

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { pop: 0.06, crank: [0.06, 0.19], drop: [0.12, 0.19], chute: [0.19, 0.22], bounce: [0.22, 0.36], burst: 0.36,
            rumble: [0.36, 0.43], lid: [0.4, 0.44], launch: [0.42, 0.56], asm: [0.6, 0.76], asmDur: 0.1, dim: [0.58, 0.72], lidClose: [0.86, 0.92] }
        : { pop: 0.1, crank: [0.1, 0.32], drop: [0.2, 0.32], chute: [0.32, 0.37], bounce: [0.37, 0.57], burst: 0.57 };
      function ms(f) { return f * dur; }

      // balls packed inside the globe (local units of the globe radius)
      var inside = [], dd = 0.25;
      for (var j = 0; j < 12; j++) {
        var iy = 0.83 - j * dd * 0.866; if (iy < -0.45) break;
        for (var ix = -1 + (j % 2) * dd / 2; ix <= 1.001; ix += dd) {
          if (Math.sqrt(ix * ix + iy * iy) <= 0.84)
            inside.push({ x: ix + rnd(-0.02, 0.02), y: iy + rnd(-0.015, 0.015), c: Math.floor(Math.random() * GUM.length), ph: rnd(0, TAU), chosen: j === 0 });
        }
      }
      inside.forEach(function (b) { if (b.chosen) { b.c = PINK; b.x = 0; b.y = 0.83; } });
      var topFirst = inside.slice().filter(function (b) { return !b.chosen; }).sort(function (a, b) { return a.y - b.y; });
      topFirst.forEach(function (b, i) { b.rank = i; });

      // burst stars
      var stars = [], NS = isSuper ? 34 : 26;
      for (var s0 = 0; s0 < NS; s0++)
        stars.push({ a: rnd(0, TAU), sp: rnd(1.3, 3.8), sz: rnd(0.07, 0.15), col: s0 % 5 === 0 ? accent : s0 % 7 === 0 ? '#FFFFFF' : GUM[s0 % GUM.length],
                     spin: rnd(-6, 6), r0: rnd(0, TAU), delay: rnd(0, 70) });
      var dust = [];
      for (var d0 = 0; d0 < 18; d0++) dust.push({ a: rnd(0, TAU), sp: rnd(0.6, 2.2), sz: rnd(0.03, 0.06), delay: rnd(0, 140) });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // super: heart of gumballs (unit coords, y up)
      var flow = [];
      if (isSuper) {
        var hstep = 0.2, row = 0;
        for (var hy = -1.0; hy <= 1.3; hy += hstep * 0.866, row++) {
          for (var hx = -1.2 + (row % 2) * hstep / 2; hx <= 1.2; hx += hstep) {
            if (inHeart(hx, hy)) flow.push({ tx: hx, ty: hy });
          }
        }
        // shuffle, then give each one a colour, launch and assembly time
        for (var sh = flow.length - 1; sh > 0; sh--) { var k = Math.floor(Math.random() * (sh + 1)), tmp = flow[sh]; flow[sh] = flow[k]; flow[k] = tmp; }
        flow.forEach(function (f, i) {
          f.c = i % cols.length;
          f.L = ms(lerp(T.launch[0], T.launch[1], i / flow.length)) + rnd(-20, 20);
          f.A = ms(lerp(T.asm[0], T.asm[1], Math.random()));
          f.lx = rnd(-0.32, 0.32); f.vxk = rnd(-1, 1); f.vyk = rnd(0.55, 0.88);
          f.live = false; f.cap = false;
        });
      }
      var asmEnd = isSuper ? ms(T.asm[1] + T.asmDur) : 0;

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
      var txtAt = ms(T.burst) - 120;
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

      // ─── the machine (local units = globe radius, origin = globe centre) ───
      function drawMachine(st) {
        ctx.save();
        ctx.translate(st.x, st.y); ctx.scale(st.R * st.pop, st.R * st.pop);
        ctx.globalAlpha = st.alpha;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // soft glow pool on the floor
        ctx.fillStyle = hexA(glow, 0.16);
        ctx.beginPath(); ctx.ellipse(0, 2.12, 1.15, 0.16, 0, 0, TAU); ctx.fill();
        // base body
        var bg = ctx.createLinearGradient(-0.8, 0, 0.8, 0);
        bg.addColorStop(0, '#8E1426'); bg.addColorStop(0.3, '#E0303F'); bg.addColorStop(0.45, '#FF6066');
        bg.addColorStop(0.7, '#D42A3A'); bg.addColorStop(1, '#7A0F20');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-0.56, 0.96); ctx.lineTo(0.56, 0.96);
        ctx.quadraticCurveTo(0.6, 1.5, 0.78, 1.97); ctx.lineTo(-0.78, 1.97);
        ctx.quadraticCurveTo(-0.6, 1.5, -0.56, 0.96); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5A0A18'; ctx.lineWidth = 0.025; ctx.stroke();
        // little white stars on the base
        ctx.fillStyle = 'rgba(255,240,245,.8)';
        starPath(ctx, -0.55, 1.72, 0.065, 0); ctx.fill(); starPath(ctx, 0.55, 1.72, 0.065, 0); ctx.fill();
        // plinth
        var pg = ctx.createLinearGradient(0, 1.93, 0, 2.12);
        pg.addColorStop(0, '#C42536'); pg.addColorStop(1, '#6E0C1C');
        ctx.fillStyle = pg; rrect(ctx, -0.86, 1.93, 1.72, 0.19, 0.07); ctx.fill();
        ctx.strokeStyle = '#4E0814'; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,190,200,.45)'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(-0.78, 1.955); ctx.lineTo(0.78, 1.955); ctx.stroke();

        // glass globe
        ctx.fillStyle = 'rgba(190,225,255,0.10)';
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, 0.985, 0, TAU); ctx.clip();
        for (var i = 0; i < inside.length; i++) {
          var b = inside[i];
          if (b.chosen) continue;
          if (b.rank < st.hide) continue;
          var jx = Math.sin(st.t * 0.045 + b.ph) * 0.025 * st.jig, jy = Math.cos(st.t * 0.05 + b.ph) * 0.02 * st.jig;
          ball(b.c, b.x + jx, b.y + jy, 0.135);
        }
        if (st.dropY != null) ball(PINK, 0, st.dropY, 0.135);
        ctx.restore();
        // glass shine
        var gg = ctx.createRadialGradient(-0.35, -0.45, 0, -0.35, -0.45, 1.2);
        gg.addColorStop(0, 'rgba(255,255,255,.16)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(220,240,255,.6)'; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.075;
        ctx.beginPath(); ctx.arc(0, 0, 0.82, Math.PI * 1.08, Math.PI * 1.4); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-0.3, -0.76, 0.06, 0.035, -0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.arc(0, 0, 0.88, -0.25, 0.55); ctx.stroke();

        // collar
        var cg = ctx.createLinearGradient(-0.64, 0, 0.64, 0);
        cg.addColorStop(0, '#951628'); cg.addColorStop(0.42, '#FF5A62'); cg.addColorStop(1, '#8A1224');
        ctx.fillStyle = cg; rrect(ctx, -0.64, 0.8, 1.28, 0.2, 0.08); ctx.fill();
        ctx.strokeStyle = '#5A0A18'; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,210,215,.6)'; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.moveTo(-0.5, 0.84); ctx.lineTo(0.5, 0.84); ctx.stroke();

        // front plate, coin slot, crank
        var sg = ctx.createLinearGradient(0, 1.12, 0, 1.68);
        sg.addColorStop(0, '#F7F9FC'); sg.addColorStop(0.5, '#C9D0DC'); sg.addColorStop(1, '#8C95A6');
        ctx.fillStyle = sg; rrect(ctx, -0.34, 1.12, 0.68, 0.56, 0.1); ctx.fill();
        ctx.strokeStyle = '#626B7E'; ctx.lineWidth = 0.022; ctx.stroke();
        ctx.fillStyle = '#2B2F3A'; rrect(ctx, -0.1, 1.17, 0.2, 0.045, 0.02); ctx.fill();
        ctx.save(); ctx.translate(0, 1.42); ctx.rotate(st.crank);
        var hg = ctx.createLinearGradient(0, -0.05, 0, 0.05);
        hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, '#9AA3B5');
        ctx.fillStyle = hg; rrect(ctx, -0.27, -0.048, 0.54, 0.096, 0.048); ctx.fill();
        ctx.strokeStyle = '#5E6779'; ctx.lineWidth = 0.018; ctx.stroke();
        ctx.fillStyle = '#E8303F'; ctx.beginPath(); ctx.arc(0.27, 0, 0.075, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7A0F20'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(0.25, -0.025, 0.022, 0, TAU); ctx.fill();
        ctx.restore();
        var hub = ctx.createRadialGradient(-0.03, 1.39, 0, 0, 1.42, 0.11);
        hub.addColorStop(0, '#FFFFFF'); hub.addColorStop(1, '#8E97A8');
        ctx.fillStyle = hub; ctx.beginPath(); ctx.arc(0, 1.42, 0.1, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5E6779'; ctx.lineWidth = 0.018; ctx.stroke();
        // chute opening + tray lip
        var og = ctx.createLinearGradient(0, 1.72, 0, 1.9);
        og.addColorStop(0, '#12060C'); og.addColorStop(1, '#3E1A2A');
        ctx.fillStyle = og; rrect(ctx, -0.21, 1.72, 0.42, 0.18, 0.08); ctx.fill();
        ctx.strokeStyle = '#B8C0CE'; ctx.lineWidth = 0.03; ctx.stroke();

        // the lid (cap) on top
        ctx.save();
        ctx.translate(0, -0.97 - st.lid); ctx.rotate(st.lidRot);
        var lg = ctx.createRadialGradient(-0.14, -0.16, 0, 0, -0.05, 0.5);
        lg.addColorStop(0, '#FF8A8E'); lg.addColorStop(0.5, '#E2303F'); lg.addColorStop(1, '#86122A');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.ellipse(0, 0.04, 0.44, 0.28, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#5A0A18'; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.fillStyle = '#B81E30'; rrect(ctx, -0.48, 0.0, 0.96, 0.09, 0.04); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#E8303F'; ctx.beginPath(); ctx.arc(0, -0.31, 0.085, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.65)';
        ctx.beginPath(); ctx.ellipse(-0.2, -0.14, 0.09, 0.035, -0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-0.025, -0.335, 0.025, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.restore();
      }

      // ─── the dispensed gumball's path (world px) ───
      function arcPos(x0, y0, x1, y1, h, q) { return { x: lerp(x0, x1, q), y: lerp(y0, y1, q) - 4 * h * q * (1 - q) }; }
      function gumPos(t, G) {
        var c0 = ms(T.chute[0]), c1 = ms(T.chute[1]), b0 = ms(T.bounce[0]), b1 = ms(T.bounce[1]);
        var rb = G.R * 0.17, chY = G.cy + 1.81 * G.R, fy = G.F - rb;
        if (t < c0 || t >= ms(T.burst)) return null;
        if (t < c1) { var cq = easeOut((t - c0) / (c1 - c0)); return { x: G.mx, y: lerp(chY - rb * 0.3, chY + rb * 0.15, cq), r: rb * lerp(0.35, 1, cq), sqx: 1, sqy: 1 }; }
        if (t < b0) return { x: G.mx, y: chY + rb * 0.15, r: rb, sqx: 1, sqy: 1 };
        var q = (t - b0) / (b1 - b0), p, sqy = 1, sc = 1;
        var x1 = G.mx + 0.95 * G.R, x2 = G.mx + 0.95 * G.R + (G.bx - G.mx - 0.95 * G.R) * 0.55;
        if (q < 0.34) p = arcPos(G.mx, chY + rb * 0.15, x1, fy, G.R * 0.4, q / 0.34);
        else if (q < 0.62) p = arcPos(x1, fy, x2, fy, G.R * 0.55, (q - 0.34) / 0.28);
        else { var e = easeOut((q - 0.62) / 0.38); p = { x: lerp(x2, G.bx, e), y: lerp(fy, G.by, e) }; sc = 1 + 0.4 * clamp01((q - 0.82) / 0.18); }
        var dl1 = Math.abs(q - 0.34), dl2 = Math.abs(q - 0.62);
        if (dl1 < 0.035) sqy = 1 - 0.28 * (1 - dl1 / 0.035);
        if (dl2 < 0.035) sqy = 1 - 0.3 * (1 - dl2 / 0.035);
        var wob = q > 0.82 ? Math.sin(t * 0.09) * 0.06 : 0;
        return { x: p.x, y: p.y, r: rb * sc, sqx: (1 + (1 - sqy) * 0.8) * (1 + wob), sqy: sqy * (1 - wob) };
      }

      var raf = 0, killed = false, t0 = performance.now(), lastT = 0;
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        var dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // geometry
        var R = Math.min(W * 0.24, H * 0.19);
        var cy = H * 0.52, mx = W / 2 - 0.45 * R;
        var F = cy + 2.12 * R;
        var bx = Math.min(mx + 1.85 * R, W - 1.05 * R), by = cy - 0.1 * R;
        var G = { R: R, cy: cy, mx: mx, F: F, bx: bx, by: by };

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], kk = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * kk);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // faint table line the gumballs bounce on
        var tl = ctx.createLinearGradient(0, 0, W, 0);
        tl.addColorStop(0, hexA(glow, 0)); tl.addColorStop(0.5, hexA(glow, 0.28)); tl.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = tl; ctx.fillRect(0, F - 1, W, 2 * Math.max(1, unit * 1.5));

        // machine state
        var pop = easeOutBack(clamp01(t / ms(T.pop)));
        var cq = clamp01((t - ms(T.crank[0])) / (ms(T.crank[1]) - ms(T.crank[0])));
        var crank = easeInOut(cq) * TAU;
        var turning = cq > 0 && cq < 1 ? Math.sin(Math.PI * cq) : 0;
        var dq = clamp01((t - ms(T.drop[0])) / (ms(T.drop[1]) - ms(T.drop[0])));
        var dropY = t < ms(T.drop[1]) ? lerp(0.83, 1.2, dq * dq) : null;
        var shx = 0, shy = 0, jig = turning, lid = 0, lidRot = 0, hide = 0, alpha = 1;
        if (isSuper) {
          var rq = clamp01((t - ms(T.rumble[0])) / (ms(T.rumble[1]) - ms(T.rumble[0])));
          if (rq > 0 && rq < 1) { shx = Math.sin(t * 0.11) * R * 0.03 * Math.sin(Math.PI * rq); shy = Math.cos(t * 0.13) * R * 0.015; jig = Math.max(jig, 1.6 * Math.sin(Math.PI * rq)); }
          var lq = clamp01((t - ms(T.lid[0])) / (ms(T.lid[1]) - ms(T.lid[0])));
          var lc = clamp01((t - ms(T.lidClose[0])) / (ms(T.lidClose[1]) - ms(T.lidClose[0])));
          var open = easeOutBack(lq) * (1 - easeInOut(lc));
          lid = 0.42 * open; lidRot = -0.55 * open;
          var hq = clamp01((t - ms(T.launch[0])) / (ms(T.launch[1]) - ms(T.launch[0])));
          hide = Math.floor(hq * topFirst.length * 0.55);
          alpha = 1 - 0.6 * easeInOut(clamp01((t - ms(T.dim[0])) / (ms(T.dim[1]) - ms(T.dim[0]))));
        }
        var mState = { x: mx + shx, y: cy + shy, R: R, pop: pop, alpha: alpha, crank: crank, jig: jig, t: t,
                       dropY: dropY, hide: hide, lid: lid, lidRot: lidRot };
        // pop-in scales about the base so the machine grows up from the table
        ctx.save();
        if (pop !== 1) mState.y = F - (F - cy) * pop + shy;
        drawMachine(mState);
        ctx.restore();

        // gold sparkles flung from the crank knob while it turns
        if (turning > 0) {
          ctx.globalCompositeOperation = 'lighter';
          for (var sk = 0; sk < 6; sk++) {
            var ang = crank - sk * 0.25, kx = mx + Math.cos(ang) * 0.27 * R, ky = cy + 1.42 * R + Math.sin(ang) * 0.27 * R;
            ctx.fillStyle = hexA(sk % 2 ? accent : '#FFFFFF', turning * (1 - sk / 6));
            sparkPath(ctx, kx, ky, R * 0.06 * (1 - sk / 8)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // the dispensed gumball + sparkle trail
        var gp = gumPos(t, G);
        if (gp) {
          if (t > ms(T.bounce[0])) {
            for (var tr = 1; tr <= 5; tr++) {
              var gq = gumPos(t - tr * 32, G);
              if (!gq || t - tr * 32 < ms(T.bounce[0])) continue;
              ctx.fillStyle = hexA(tr % 2 ? accent : '#FFFFFF', 0.55 * (1 - tr / 6));
              sparkPath(ctx, gq.x, gq.y, R * 0.05 * (1 - tr / 7)); ctx.fill();
            }
          }
          if (gp.r > R * 0.2) {
            var halo = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, gp.r * 2.2);
            halo.addColorStop(0, hexA('#FF9AC0', 0.45)); halo.addColorStop(1, hexA('#FF9AC0', 0));
            ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gp.x, gp.y, gp.r * 2.2, 0, TAU); ctx.fill();
          }
          ball(PINK, gp.x, gp.y, gp.r, gp.sqx, gp.sqy);
        }

        // super: overflow cascade → heart
        if (isSuper) {
          var hk = Math.min(W * 0.33, H * 0.25), hcx = W / 2, hcy = H * 0.56 + 0.125 * hk;
          var rbH = hk * 0.106, g = H * 2.6;
          var pulse = t > asmEnd ? 1 + 0.045 * Math.sin((t - asmEnd) * 0.011) : 1;
          var hgA = clamp01((t - ms(T.asm[1])) / 400);
          if (hgA > 0) {
            var hgr = ctx.createRadialGradient(hcx, hcy - 0.1 * hk, 0, hcx, hcy - 0.1 * hk, hk * 1.7);
            hgr.addColorStop(0, hexA('#FF8FC0', 0.32 * hgA)); hgr.addColorStop(0.6, hexA(primary, 0.12 * hgA)); hgr.addColorStop(1, hexA(primary, 0));
            ctx.fillStyle = hgr; ctx.beginPath(); ctx.arc(hcx, hcy - 0.1 * hk, hk * 1.7, 0, TAU); ctx.fill();
          }
          var steps = Math.ceil(dt / 0.008), sdt = steps ? dt / steps : 0;
          for (var fi = 0; fi < flow.length; fi++) {
            var f = flow[fi];
            if (t < f.L) continue;
            if (!f.live) {
              f.live = true;
              f.x = mx + f.lx * R; f.y = cy - 0.8 * R;
              f.vx = f.vxk * W * 0.5; f.vy = -f.vyk * H;
            }
            var tx = hcx + f.tx * hk * pulse, ty = hcy - f.ty * hk * pulse, px, py, sq = 1;
            if (t < f.A) {
              for (var st2 = 0; st2 < steps; st2++) {
                f.vy += g * sdt; f.x += f.vx * sdt; f.y += f.vy * sdt;
                if (f.y > F - rbH) { f.y = F - rbH; if (f.vy > 0) { f.vy = Math.abs(f.vy) < 80 ? 0 : -f.vy * 0.56; f.vx *= 0.82; f.hit = t; } }
                if (f.x < rbH) { f.x = rbH; f.vx = Math.abs(f.vx) * 0.7; }
                if (f.x > W - rbH) { f.x = W - rbH; f.vx = -Math.abs(f.vx) * 0.7; }
              }
              px = f.x; py = f.y;
              if (f.hit != null && t - f.hit < 70) sq = 1 - 0.25 * (1 - (t - f.hit) / 70);
              // grow from inside-globe size as it leaves the top
              var gr2 = clamp01((t - f.L) / 160);
              ball(f.c, px, py, rbH * lerp(0.6, 1, gr2), 1 + (1 - sq) * 0.8, sq);
            } else {
              if (!f.cap) { f.cap = true; f.ax = f.x; f.ay = f.y; }
              var aq = easeInOut((t - f.A) / ms(T.asmDur));
              px = lerp(f.ax, tx, aq); py = lerp(f.ay, ty, aq) - Math.sin(Math.PI * aq) * hk * 0.35;
              ball(f.c, px, py, rbH);
            }
          }
          // twinkles around the finished heart
          if (hgA > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (var hs = 0; hs < 14; hs++) {
              var ha = hs / 14 * TAU + t * 0.0006, ex = 16 * Math.pow(Math.sin(ha), 3) / 16;
              var ey = (13 * Math.cos(ha) - 5 * Math.cos(2 * ha) - 2 * Math.cos(3 * ha) - Math.cos(4 * ha)) / 16;
              var tw = 0.5 + 0.5 * Math.sin(t * 0.008 + hs * 1.7);
              ctx.fillStyle = hexA(hs % 2 ? accent : '#FFFFFF', hgA * tw);
              sparkPath(ctx, hcx + ex * hk * 1.32 * pulse, hcy - 0.08 * hk - ey * hk * 1.18 * pulse, (5 + 6 * tw) * unit * 1.6); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // ─── the star burst ───
        var bt = (t - ms(T.burst)) / 1000;
        if (bt > 0) {
          var fq = bt / 0.45;
          if (fq < 1) {
            var fg = ctx.createRadialGradient(bx, by, 0, bx, by, R * 1.6);
            fg.addColorStop(0, hexA('#FFF4D0', 0.75 * (1 - fq))); fg.addColorStop(0.4, hexA('#FF9AC0', 0.35 * (1 - fq))); fg.addColorStop(1, hexA('#FF9AC0', 0));
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(bx, by, R * 1.6, 0, TAU); ctx.fill();
            ctx.strokeStyle = hexA(accent, 0.8 * (1 - fq)); ctx.lineWidth = Math.max(1.5, 4 * unit * (1 - fq));
            ctx.beginPath(); ctx.arc(bx, by, R * (0.2 + 1.3 * easeOut(fq)), 0, TAU); ctx.stroke();
          }
          for (var si = 0; si < stars.length; si++) {
            var S = stars[si], st3 = bt - S.delay / 1000;
            if (st3 <= 0) continue;
            var kd = 1.7, fdr = (1 - Math.exp(-kd * st3)) / kd;
            var sxp = bx + Math.cos(S.a) * S.sp * R * fdr, syp = by + Math.sin(S.a) * S.sp * R * fdr + 0.6 * R * st3 * st3;
            var sa = 1 - clamp01((st3 - 0.75) / 0.5);
            if (sa <= 0) continue;
            var ssz = S.sz * R * (st3 < 0.12 ? st3 / 0.12 : 1);
            ctx.fillStyle = hexA(S.col, sa);
            starPath(ctx, sxp, syp, ssz, S.r0 + S.spin * st3); ctx.fill();
            ctx.fillStyle = hexA('#FFFFFF', 0.6 * sa);
            starPath(ctx, sxp, syp, ssz * 0.4, S.r0 + S.spin * st3); ctx.fill();
          }
          ctx.globalCompositeOperation = 'lighter';
          for (var di = 0; di < dust.length; di++) {
            var D = dust[di], dt3 = bt - D.delay / 1000;
            if (dt3 <= 0) continue;
            var dfr = (1 - Math.exp(-2.2 * dt3)) / 2.2, da = 1 - clamp01(dt3 / 1.0);
            ctx.fillStyle = hexA('#FFFFFF', da * (0.6 + 0.4 * Math.sin(dt3 * 30 + di)));
            sparkPath(ctx, bx + Math.cos(D.a) * D.sp * R * dfr, by + Math.sin(D.a) * D.sp * R * dfr, D.sz * R); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

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
        sprites = [];
      };
    }
  });
})();
