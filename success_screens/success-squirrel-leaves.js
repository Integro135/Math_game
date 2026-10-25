/* success-squirrel-leaves.js — מסך הצלחה: סְנָאִית בַּעֲרֵמַת עָלִים 🐿️🍂
   סנאית אדומה וחמודה (מבט צד — עין אחת) עם זנב פלומתי ענק רצה פנימה בקפיצות,
   אוספת בלוט, מתכופפת ומזנקת לתוך ערמת עלי סתיו (צהוב/כתום/אדום) — הערמה
   מתפוצצת למעלה במערבולת של עלים מתהפכים, והסנאית מציצה מתוך הערמה עם הבלוט
   בידיים, מאושרת. בסופר: סנאית שנייה, מזרקת עלים גדולה שמסתחררת ללב, וגשם בלוטים.
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

  // squirrel colours (red squirrel)
  var FUR = '#E8772F', FUR_D = '#B5501B', FUR_L = '#FFAE66', CREAM = '#FFF0DA', INK = '#2B1810';
  var LEAF_COLS = ['#FFC93C', '#FFB01F', '#FF8C2B', '#F26A1B', '#E8452C', '#C9302C', '#FFD966', '#D9661F'];

  // unit maple-ish leaf (pointing up, stem at origin, ~1 tall) and a unit oval leaf
  function mapleLeafPath() {
    var pth = new Path2D();
    var N = 70;
    for (var i = 0; i <= N; i++) {
      var a = i / N * TAU;                                   // 0 = straight up
      var lobe = Math.pow(Math.abs(Math.cos(a * 2.5)), 2.2);
      var r = 0.3 + 0.2 * lobe + 0.06 * Math.pow(Math.abs(Math.cos(a * 7.5)), 6);
      var bottom = Math.cos(a) < -0.55 ? 0.55 : 1;          // tuck the base
      var x = Math.sin(a) * r * bottom, y = -0.5 - Math.cos(a) * r * bottom;
      if (i === 0) pth.moveTo(x, y); else pth.lineTo(x, y);
    }
    pth.closePath();
    return pth;
  }
  function ovalLeafPath() {
    var pth = new Path2D();
    pth.moveTo(0, 0);
    pth.bezierCurveTo(-0.36, -0.22, -0.3, -0.75, 0, -1);
    pth.bezierCurveTo(0.3, -0.75, 0.36, -0.22, 0, 0);
    pth.closePath();
    return pth;
  }

  window.SUCCESS.styles.push({
    name: 'squirrel-leaves',
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

      var MAPLE = mapleLeafPath(), OVAL = ovalLeafPath();

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { runEnd: 0.12, grabEnd: 0.165, sitEnd: 0.2, crouchEnd: 0.235, hit: 0.3, pop: 0.36, popEnd: 0.44 }
        : { runEnd: 0.2, grabEnd: 0.27, sitEnd: 0.32, crouchEnd: 0.37, hit: 0.46, pop: 0.55, popEnd: 0.66 };

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 20); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.6, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });

      // pile leaves (u: -1..1 across, v: 0..1 up within the dome), sorted back→front
      var pileLeaves = [];
      var nPile = isSuper ? 110 : 85;
      for (var pl = 0; pl < nPile; pl++) {
        var pu = rnd(-1, 1), top = Math.sqrt(1 - pu * pu);
        pileLeaves.push({ u: pu, v: Math.pow(Math.random(), 0.7) * top, rot: rnd(0, TAU), sz: rnd(0.2, 0.3),
                          col: LEAF_COLS[pl % LEAF_COLS.length], maple: Math.random() < 0.6, front: Math.random() < 0.55,
                          flip: rnd(0.55, 1) });
      }
      pileLeaves.sort(function (a, b) { return a.front - b.front || a.v - b.v; });

      // flying leaves: a rising vortex column above the pile
      var flyers = [];
      var nFly = isSuper ? 120 : 80;
      for (var fl = 0; fl < nFly; fl++) {
        flyers.push({ th: rnd(0, TAU), om: rnd(3.2, 5.5) * (fl % 5 === 0 ? -1 : 1), r0: rnd(0.1, 0.9), grow: rnd(0.25, 0.9),
                      h: rnd(0.45, 1), tp: rnd(0.4, 0.6), at: rnd(0, 0.06), rot: rnd(0, TAU), spin: rnd(-7, 7),
                      flip: rnd(4, 10), fph: rnd(0, TAU), sz: rnd(0.2, 0.34), col: LEAF_COLS[fl % LEAF_COLS.length],
                      maple: Math.random() < 0.6, drift: rnd(-0.4, 0.4),
                      heart: isSuper && fl < 64, hk: fl });
      }
      // super: heart targets for the first 64 flyers
      var heartPts = [];
      if (isSuper) {
        for (var hp = 0; hp < 64; hp++) {
          var ht = hp / 64 * TAU;
          heartPts.push({ x: 16 * Math.pow(Math.sin(ht), 3) / 16,
                          y: -(13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht)) / 16 });
        }
      }
      // super: acorns raining
      var rainAcorns = [];
      if (isSuper) for (var ra = 0; ra < 16; ra++)
        rainAcorns.push({ x: rnd(0.06, 0.94), at: rnd(0.5, 0.8), sp: rnd(0.75, 1.1), rot: rnd(-0.6, 0.6), spin: rnd(-3, 3), sz: rnd(0.75, 1.05) });
      // twinkles at the pick-up and the pop
      var twinkles = [];
      for (var tw = 0; tw < (isSuper ? 18 : 10); tw++)
        twinkles.push({ a: rnd(0, TAU), d: rnd(0.4, 1.1), at: rnd(0, 0.08), col: [accent, '#FFFFFF', '#FFE08A', glow][tw % 4] });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FF8C2B', 0.9) + ',0 0 44px ' + hexA(primary, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (T.hit - 0.02);
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

      // ─── drawing helpers ───
      function leaf(x, y, size, rot, flipX, col, maple) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size * flipX, size);
        ctx.fillStyle = col;
        ctx.fill(maple ? MAPLE : OVAL);
        ctx.strokeStyle = 'rgba(120,40,10,.45)'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(0, 0.12); ctx.lineTo(0, maple ? -0.85 : -0.85);
        if (maple) { ctx.moveTo(0, -0.42); ctx.lineTo(-0.3, -0.7); ctx.moveTo(0, -0.42); ctx.lineTo(0.3, -0.7); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath(); ctx.ellipse(-0.12, -0.6, 0.08, 0.18, 0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function acorn(x, y, r, rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(r, r);
        var g = ctx.createRadialGradient(-0.3, 0.1, 0.1, 0, 0.3, 1.1);
        g.addColorStop(0, '#E8AE6A'); g.addColorStop(0.6, '#C17A38'); g.addColorStop(1, '#8A4E1E');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-0.78, -0.1);
        ctx.bezierCurveTo(-0.85, 0.6, -0.25, 1.05, 0, 1.15);
        ctx.bezierCurveTo(0.25, 1.05, 0.85, 0.6, 0.78, -0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.ellipse(-0.38, 0.28, 0.13, 0.3, 0.3, 0, TAU); ctx.fill();
        // cap
        ctx.fillStyle = '#7A4A22';
        ctx.beginPath(); ctx.moveTo(-0.92, 0); ctx.bezierCurveTo(-0.95, -0.7, 0.95, -0.7, 0.92, 0);
        ctx.quadraticCurveTo(0, 0.18, -0.92, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,170,.28)';
        for (var i = 0; i < 7; i++) for (var j = 0; j < 2; j++) {
          ctx.beginPath(); ctx.arc(-0.66 + i * 0.22 + j * 0.11, -0.12 - j * 0.2, 0.06, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = '#5E3517'; ctx.lineWidth = 0.14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -0.46); ctx.quadraticCurveTo(0.05, -0.75, 0.22, -0.85); ctx.stroke();
        ctx.restore();
      }
      // hand: palm + 4 little fingers curling toward `ang`
      function hand(x, y, ang, col, dark) {
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(x, y, 0.062, 0.05, ang, 0, TAU); ctx.fill();
        for (var i = 0; i < 4; i++) {
          var a = ang + (i - 1.5) * 0.42;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 0.058, y + Math.sin(a) * 0.058, 0.026, 0.02, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(x, y, 0.052, 0.042, ang, 0, TAU); ctx.fill();
        for (var k = 0; k < 4; k++) {
          var b = ang + (k - 1.5) * 0.42;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(b) * 0.058, y + Math.sin(b) * 0.058, 0.018, 0.014, b, 0, TAU); ctx.fill();
        }
      }
      function limb(x0, y0, x1, y1, w, col) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      // bushy tail: circles + fluffy bumps along a curling spine (local squirrel units)
      var TAILP = [[-0.2, -0.22], [-0.78, -0.08], [-1.08, -0.85], [-0.64, -1.2], [-0.4, -1.4], [-0.16, -1.24], [-0.3, -1.02]];
      function bez(a, b, c, d, u) {
        var m = 1 - u;
        return [m * m * m * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * c[0] + u * u * u * d[0],
                m * m * m * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * c[1] + u * u * u * d[1]];
      }
      function tail(flick, tt) {
        var pts = [], N = 30;
        for (var i = 0; i <= N; i++) {
          var u = i / N, q;
          if (u < 0.7) q = bez(TAILP[0], TAILP[1], TAILP[2], TAILP[3], u / 0.7);
          else q = bez(TAILP[3], TAILP[4], TAILP[5], TAILP[6], (u - 0.7) / 0.3);
          var wv = Math.sin(u * 3.2 - tt * 0.006) * 0.05 * u + flick * u * u * 0.25;
          var r = (0.1 + 0.25 * Math.sin(Math.min(1, u * 1.7) * Math.PI / 2)) * (1 - 0.5 * clamp01((u - 0.78) / 0.22));
          pts.push({ x: q[0] + wv, y: q[1] + wv * 0.3, r: r, u: u });
        }
        var blobs = [];
        for (var k = 0; k < pts.length; k++) {
          var pa = pts[Math.max(0, k - 1)], pb = pts[Math.min(pts.length - 1, k + 1)];
          var tx = pb.x - pa.x, ty = pb.y - pa.y, tl = Math.hypot(tx, ty) || 1;
          var nx = ty / tl, ny = -tx / tl;                    // outward (away from the body)
          var p0 = pts[k];
          blobs.push({ x: p0.x, y: p0.y, r: p0.r, nx: nx, ny: ny, u: p0.u });
          if (k % 2 === 0 && k > 2) blobs.push({ x: p0.x + nx * p0.r * 0.82, y: p0.y + ny * p0.r * 0.82, r: p0.r * 0.36, nx: nx, ny: ny, u: p0.u, bump: 1 });
          if (k % 3 === 1 && k > 4) blobs.push({ x: p0.x - nx * p0.r * 0.8, y: p0.y - ny * p0.r * 0.8, r: p0.r * 0.3, nx: nx, ny: ny, u: p0.u, bump: 1 });
        }
        var j;
        ctx.fillStyle = FUR_D;
        for (j = 0; j < blobs.length; j++) { ctx.beginPath(); ctx.arc(blobs[j].x, blobs[j].y, blobs[j].r + 0.022, 0, TAU); ctx.fill(); }
        ctx.fillStyle = FUR;
        for (j = 0; j < blobs.length; j++) { ctx.beginPath(); ctx.arc(blobs[j].x, blobs[j].y, blobs[j].r, 0, TAU); ctx.fill(); }
        // soft lighter band along the inner side of the plume
        ctx.fillStyle = 'rgba(255,170,100,.55)';
        for (j = 3; j < blobs.length; j++) {
          var bb = blobs[j];
          if (bb.bump) continue;
          ctx.beginPath(); ctx.arc(bb.x - bb.nx * bb.r * 0.3, bb.y - bb.ny * bb.r * 0.3, bb.r * 0.5, 0, TAU); ctx.fill();
        }
        // a few fur strokes
        ctx.strokeStyle = 'rgba(255,215,170,.7)'; ctx.lineWidth = 0.018; ctx.lineCap = 'round';
        for (j = 6; j < pts.length - 2; j += 3) {
          var pa2 = pts[j], pb2 = pts[j + 2];
          ctx.beginPath(); ctx.moveTo(pa2.x - 0.02, pa2.y + 0.02);
          ctx.quadraticCurveTo((pa2.x + pb2.x) / 2 + 0.03, (pa2.y + pb2.y) / 2, pb2.x, pb2.y); ctx.stroke();
        }
      }
      function earShape(tipX, tipY, base0, base1, col, inner) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(base0[0], base0[1]);
        ctx.quadraticCurveTo(tipX - 0.08, tipY + 0.1, tipX, tipY);
        ctx.quadraticCurveTo(tipX + 0.1, tipY + 0.14, base1[0], base1[1]); ctx.closePath(); ctx.fill();
        if (inner) {
          ctx.fillStyle = inner;
          ctx.beginPath(); ctx.moveTo(lerp(base0[0], base1[0], 0.25), lerp(base0[1], base1[1], 0.25) - 0.01);
          ctx.quadraticCurveTo(tipX - 0.03, tipY + 0.14, tipX + 0.01, tipY + 0.07);
          ctx.quadraticCurveTo(tipX + 0.06, tipY + 0.16, lerp(base0[0], base1[0], 0.78), lerp(base0[1], base1[1], 0.78) - 0.01);
          ctx.closePath(); ctx.fill();
        }
      }

      /* squirrel in local units (≈1 = body height), origin at the feet, facing +x.
         o: {lean, sx, sy, run, eye:'open'|'happy', mouth, acorn, reach (0 hold..1 down), up (raise held acorn),
             flick, tilt, leafOnHead} */
      function squirrel(x, y, s, dir, o, tt) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir * s * (o.sx || 1), s * (o.sy || 1));
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        // soft ground shadow
        if (o.shadow !== false) {
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath(); ctx.ellipse(-0.05, 0.02, 0.45, 0.06, 0, 0, TAU); ctx.fill();
        }
        ctx.translate(-0.05, -0.2); ctx.rotate(o.lean || 0); ctx.translate(0.05, 0.2);

        // tail behind everything
        ctx.save(); ctx.translate(-0.2, -0.22); ctx.rotate(o.tailRot || 0); ctx.translate(0.2, 0.22);
        tail(o.flick || 0, tt);
        ctx.restore();

        var run = o.run || 0;
        var reach = o.reach || 0, up = o.up || 0;
        // hold position (in front of chest), lowered toward the ground when reaching, raised when up
        var hx = lerp(0.37, 0.5, reach) + up * 0.17, hy = lerp(-0.5, -0.12, reach) + up * 0.02;
        if (run > 0) { hx = lerp(hx, 0.46 + 0.06 * Math.sin(run * 6), Math.min(1, run * 3)); hy = lerp(hy, -0.18, Math.min(1, run * 3)); }

        // far arm (behind body, darker)
        limb(0.12, -0.56, hx - 0.05, hy + 0.01, 0.085, FUR_D);
        hand(hx - 0.05, hy + 0.01, o.acorn ? 0 : 0.6, FUR_D, '#8E3E12');
        // far hind foot
        var fxo = -0.25 * run * Math.sin(tt * 0.03), fyo = 0;
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.ellipse(0.1 + fxo, -0.045, 0.18, 0.055, 0, 0, TAU); ctx.fill();

        // body
        var gb = ctx.createRadialGradient(0.06, -0.55, 0.05, 0, -0.4, 0.45);
        gb.addColorStop(0, '#FF9A50'); gb.addColorStop(0.7, FUR); gb.addColorStop(1, '#D2621F');
        ctx.fillStyle = gb;
        ctx.beginPath(); ctx.ellipse(0, -0.4, 0.27, 0.35, 0.22, 0, TAU); ctx.fill();
        ctx.fillStyle = CREAM;
        ctx.beginPath(); ctx.ellipse(0.12, -0.36, 0.13, 0.25, 0.25, 0, TAU); ctx.fill();

        // hind thigh + near foot with toes
        var lx = -0.12 - 0.08 * run * Math.sin(tt * 0.03 + 1);
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.ellipse(lx, -0.2, 0.235, 0.195, -0.3, 0, TAU); ctx.fill();
        var gth = ctx.createRadialGradient(lx - 0.02, -0.27, 0.02, lx, -0.2, 0.24);
        gth.addColorStop(0, '#FF9F58'); gth.addColorStop(1, FUR);
        ctx.fillStyle = gth;
        ctx.beginPath(); ctx.ellipse(lx, -0.2, 0.215, 0.175, -0.3, 0, TAU); ctx.fill();
        var footX = 0.02 + 0.22 * run * Math.sin(tt * 0.03 + 1) - 0.0;
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.ellipse(footX, -0.045, 0.2, 0.06, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.ellipse(footX, -0.05, 0.185, 0.048, 0, 0, TAU); ctx.fill();
        for (var tz = 0; tz < 3; tz++) {
          ctx.fillStyle = FUR_D;
          ctx.beginPath(); ctx.arc(footX + 0.17 + tz * 0.0, -0.075 + tz * 0.03, 0.03, 0, TAU); ctx.fill();
          ctx.fillStyle = FUR;
          ctx.beginPath(); ctx.arc(footX + 0.165, -0.075 + tz * 0.03, 0.022, 0, TAU); ctx.fill();
        }

        // held acorn (between the hands)
        if (o.acorn) acorn(hx + 0.035, hy - 0.06, 0.1, 0.15);

        // head (tilts around the neck)
        ctx.save(); ctx.translate(0.15, -0.66); ctx.rotate(o.tilt || 0); ctx.translate(-0.15, 0.66);
        earShape(0.0, -1.27, [-0.06, -0.98], [0.1, -1.02], FUR_D, null);           // far ear peeking
        var gh = ctx.createRadialGradient(0.14, -0.96, 0.03, 0.2, -0.86, 0.32);
        gh.addColorStop(0, '#FFA05A'); gh.addColorStop(0.75, FUR); gh.addColorStop(1, '#D6651F');
        ctx.fillStyle = gh;
        ctx.beginPath(); ctx.arc(0.2, -0.86, 0.27, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.4, -0.8, 0.16, 0.12, 0.1, 0, TAU); ctx.fill();
        // cream cheek + muzzle
        ctx.fillStyle = CREAM;
        ctx.beginPath(); ctx.ellipse(0.32, -0.73, 0.16, 0.1, 0.15, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.45, -0.77, 0.1, 0.08, 0.1, 0, TAU); ctx.fill();
        // near ear with tuft
        earShape(0.13, -1.38, [0.04, -1.04], [0.25, -1.06], FUR, '#FFB3C1');
        ctx.fillStyle = FUR;                                                     // soft ear tuft
        ctx.beginPath(); ctx.moveTo(0.09, -1.33);
        ctx.quadraticCurveTo(0.06, -1.45, 0.1, -1.5); ctx.quadraticCurveTo(0.14, -1.44, 0.17, -1.47);
        ctx.quadraticCurveTo(0.18, -1.4, 0.16, -1.33); ctx.closePath(); ctx.fill();
        // nose
        ctx.fillStyle = '#6B2D2D';
        ctx.beginPath(); ctx.ellipse(0.555, -0.825, 0.042, 0.032, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(0.545, -0.835, 0.012, 0, TAU); ctx.fill();
        // ONE eye (side view)
        if (o.eye === 'happy') {
          ctx.strokeStyle = INK; ctx.lineWidth = 0.034;
          ctx.beginPath(); ctx.arc(0.3, -0.9, 0.055, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
        } else {
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.ellipse(0.3, -0.92, 0.058, 0.075, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(0.318, -0.945, 0.022, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(0.29, -0.895, 0.01, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 0.018;                              // one lash
        ctx.beginPath(); ctx.moveTo(0.25, -0.975); ctx.lineTo(0.225, -1.0); ctx.stroke();
        // blush
        ctx.fillStyle = 'rgba(255,110,150,.5)';
        ctx.beginPath(); ctx.ellipse(0.34, -0.78, 0.06, 0.034, 0.1, 0, TAU); ctx.fill();
        // mouth
        var mo = o.mouth || 0;
        if (mo > 0.05) {
          var mh = 0.085 * mo;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0.41, -0.725); ctx.quadraticCurveTo(0.48, -0.735, 0.54, -0.745);
          ctx.quadraticCurveTo(0.52, -0.725 + mh, 0.45, -0.72 + mh * 1.05);
          ctx.quadraticCurveTo(0.41, -0.715 + mh * 0.6, 0.41, -0.725); ctx.closePath();
          ctx.fillStyle = '#C8455C'; ctx.fill();
          ctx.clip();
          ctx.fillStyle = '#5A1426';                                               // throat at the back only
          ctx.beginPath(); ctx.ellipse(0.41, -0.71 + mh * 0.3, 0.035, mh * 0.6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF8FA6';                                               // tongue
          ctx.beginPath(); ctx.ellipse(0.475, -0.72 + mh * 1.0, 0.045, mh * 0.45, -0.1, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#FFFFFF';                                               // little buck tooth
          ctx.beginPath(); ctx.moveTo(0.5, -0.738); ctx.lineTo(0.532, -0.743); ctx.lineTo(0.528, -0.712); ctx.lineTo(0.503, -0.71); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#8E3E12'; ctx.lineWidth = 0.014;
          ctx.beginPath(); ctx.moveTo(0.41, -0.725); ctx.quadraticCurveTo(0.48, -0.735, 0.54, -0.745); ctx.stroke();
        } else {
          ctx.strokeStyle = '#8E3E12'; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(0.555, -0.795); ctx.lineTo(0.55, -0.755);
          ctx.quadraticCurveTo(0.52, -0.725, 0.48, -0.74); ctx.stroke();
        }
        // whiskers
        ctx.strokeStyle = 'rgba(255,240,220,.55)'; ctx.lineWidth = 0.008;
        ctx.beginPath(); ctx.moveTo(0.5, -0.8); ctx.lineTo(0.64, -0.84); ctx.moveTo(0.5, -0.785); ctx.lineTo(0.645, -0.785); ctx.stroke();
        if (o.leafOnHead) leaf(0.12, -1.06, 0.2, -0.6, 1, '#FFC93C', true);
        ctx.restore();

        // near arm + hand over the acorn
        limb(0.2, -0.54, hx + 0.04, hy + 0.03, 0.095, FUR);
        hand(hx + 0.06, hy + 0.02, o.acorn ? Math.PI * 0.85 : 0.5, FUR, FUR_D);
        ctx.restore();
      }

      function pileShape(cx, gy, pw, ph) {
        ctx.beginPath(); ctx.moveTo(cx - pw * 1.05, gy);
        ctx.bezierCurveTo(cx - pw * 0.95, gy - ph * 0.9, cx - pw * 0.4, gy - ph * 1.05, cx, gy - ph);
        ctx.bezierCurveTo(cx + pw * 0.4, gy - ph * 1.05, cx + pw * 0.95, gy - ph * 0.9, cx + pw * 1.05, gy);
        ctx.closePath();
      }
      function drawPile(cx, gy, pw, ph, s, front, tt, shake) {
        var g = ctx.createLinearGradient(0, gy - ph, 0, gy);
        g.addColorStop(0, '#E8822A'); g.addColorStop(1, '#8A3A12');
        ctx.fillStyle = g;
        if (!front) { pileShape(cx, gy, pw * 0.92, ph * 0.9); ctx.fill(); }
        else { pileShape(cx, gy, pw * 0.9, ph * 0.66); ctx.fill(); }
        for (var i = 0; i < pileLeaves.length; i++) {
          var L = pileLeaves[i];
          if (L.front !== front) continue;
          var top = Math.sqrt(Math.max(0, 1 - L.u * L.u));
          var vy = L.v * ph;
          if (front) vy = Math.min(vy, top * ph * 0.72);
          var lx = cx + L.u * pw * 0.95 + Math.sin(tt * 0.02 + i) * shake * 4 * unit;
          var ly = gy - vy + 0.06 * s;
          leaf(lx, ly, s * L.sz, L.rot + Math.sin(tt * 0.015 + i) * shake * 0.3, L.flip, L.col, L.maple);
        }
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, p = clamp01(t / dur), gFade = clamp01((dur - t) / 280);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (var i = 0; i < bgStars.length; i++) {
          var st = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * st.rate + st.tw));
          ctx.fillStyle = hexA(st.color, 0.7 * k * gFade);
          sparkPath(ctx, st.x * W, st.y * H, st.size * 2.2 * unit); ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = gFade;

        var portrait = W < H;
        var S = isSuper ? Math.min(W * 0.15, H * 0.19) : Math.min(W * (W < H ? 0.17 : 0.2), H * 0.2);
        var gy = H * (portrait ? 0.72 : 0.8);
        var PW = S * (isSuper ? (W < H ? 1.45 : 1.7) : 1.5), PH0 = S * (isSuper ? 0.95 : 0.88);
        var pcx = isSuper ? W * 0.5 : W * (W < H ? 0.64 : 0.62);
        var axs = isSuper
          ? [Math.max(pcx - PW - 0.8 * S, 1.62 * S), Math.min(pcx + PW + 0.8 * S, W - 1.62 * S)]
          : [Math.max(Math.min(W * 0.3, pcx - PW - 0.5 * S), 1.62 * S)];
        var dirs = isSuper ? [1, -1] : [1];

        // ground: a soft mossy strip that fades out at the sides
        var gg = ctx.createRadialGradient(W / 2, gy, 0, W / 2, gy, W * 0.55);
        gg.addColorStop(0, 'rgba(120,72,34,.55)'); gg.addColorStop(0.7, 'rgba(90,52,26,.3)'); gg.addColorStop(1, 'rgba(90,52,26,0)');
        ctx.save(); ctx.translate(0, gy); ctx.scale(1, 0.12); ctx.translate(0, -gy);
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(W / 2, gy, W * 0.55, 0, TAU); ctx.fill();
        ctx.restore();

        // pile squash on impact, recovers lower (some leaves flew away)
        var th = (p - T.hit) * dur;
        var pileK = 1, shake = 0;
        if (th > 0) {
          pileK = 0.78 + 0.08 * Math.exp(-th * 0.006) * Math.cos(th * 0.02) - 0.08 * Math.exp(-th * 0.01);
          shake = Math.exp(-th * 0.004);
        }
        var PH = PH0 * pileK;

        // pile glow when it bursts
        if (th > 0) {
          var ga = 0.42 * Math.exp(-th * 0.004);
          var rg = ctx.createRadialGradient(pcx, gy - PH, 0, pcx, gy - PH, PW * 1.4);
          rg.addColorStop(0, hexA('#FFD27A', ga)); rg.addColorStop(0.5, hexA('#FF9A3C', ga * 0.4)); rg.addColorStop(1, hexA('#FF8C2B', 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pcx, gy - PH, PW * 1.4, 0, TAU); ctx.fill();
        }

        drawPile(pcx, gy, PW, PH, S, false, t, shake);

        // squirrels
        for (var q = 0; q < dirs.length; q++) {
          var dir = dirs[q], ax = axs[q];
          var standX = ax - dir * 0.48 * S;
          var popX = isSuper ? pcx - dir * 0.85 * S : pcx + 0.15 * S;
          var popDir = isSuper ? dir : -1;
          var o = { lean: 0, sx: 1, sy: 1, run: 0, eye: 'open', mouth: 0, acorn: false, reach: 0, up: 0, flick: 0, tilt: 0 };
          var sxp, syp, drawIt = true, acornOnGround = true;
          var delay = q * 0.012;
          var pr = p - delay;
          if (pr < T.runEnd) {
            var rp = clamp01(pr / T.runEnd);
            var startX = dir > 0 ? -1.3 * S : W + 1.3 * S;
            sxp = lerp(startX, standX, easeOut(rp * 1.05));
            var hopPh = rp * 7 * Math.PI;
            syp = gy - Math.abs(Math.sin(hopPh)) * S * 0.22 * (1 - rp * rp);
            o.lean = 0.35 * (1 - rp) + 0.05; o.run = 1 - rp * 0.6;
            o.sy = 1 + 0.06 * Math.cos(hopPh * 2); o.sx = 1 / o.sy;
            o.flick = Math.sin(hopPh) * 0.3;
          } else if (pr < T.grabEnd) {
            var gp = (pr - T.runEnd) / (T.grabEnd - T.runEnd);
            sxp = standX; syp = gy;
            var bend = Math.sin(clamp01(gp) * Math.PI);
            o.lean = 0.55 * bend; o.reach = bend;
            if (gp > 0.5) { o.acorn = true; acornOnGround = false; }
            o.flick = 0.15 * Math.sin(gp * 8);
          } else if (pr < T.crouchEnd) {
            sxp = standX; syp = gy; acornOnGround = false; o.acorn = true;
            var cp = (pr - T.grabEnd) / (T.crouchEnd - T.grabEnd);
            o.flick = 0.35 * Math.sin(cp * 10) * (1 - cp);
            o.tilt = -0.12 * Math.sin(clamp01(cp * 1.6) * Math.PI);
            o.mouth = cp < 0.6 ? 0.6 * Math.sin(clamp01(cp / 0.6) * Math.PI) : 0;
            var crouch = easeInOut(clamp01((pr - T.sitEnd) / (T.crouchEnd - T.sitEnd)));
            o.sy = 1 - 0.18 * crouch; o.sx = 1 + 0.12 * crouch; o.lean = 0.2 * crouch;
          } else if (pr < T.hit) {
            acornOnGround = false; o.acorn = true;
            var lp = (pr - T.crouchEnd) / (T.hit - T.crouchEnd);
            var tx0 = standX, tx1 = popX, ty0 = gy, ty1 = gy - PH0 * 0.6;
            var peak = Math.max(1.3 * S, PH0 * 1.6);
            sxp = lerp(tx0, tx1, lp);
            syp = lerp(ty0, ty1, lp) - 4 * peak * lp * (1 - lp);
            var vyd = (ty1 - ty0) - 4 * peak * (1 - 2 * lp), vxd = (tx1 - tx0);
            o.lean = Math.min(1.15, Math.atan2(vyd, Math.abs(vxd)) + 0.4);
            o.sy = 1.12 - 0.12 * lp; o.sx = 0.9 + 0.1 * lp;
            o.flick = -0.4; o.tailRot = -0.3 + lp * 0.5; o.mouth = 0.7; o.shadow = false;
          } else {
            acornOnGround = false;
            var pp2 = clamp01((pr - T.pop) / (T.popEnd - T.pop));
            if (pr < T.pop) drawIt = false;
            else {
              var pe = easeOutBack(pp2);
              sxp = popX; syp = gy + S * 1.5 * (1 - pe) - S * 0.2;
              dir = popDir;
              o.acorn = true; o.up = 1; o.eye = pp2 > 0.5 ? 'happy' : 'open';
              o.mouth = 0.9; o.shadow = false; o.leafOnHead = true;
              var idle = (pr - T.popEnd) * dur;
              o.tilt = idle > 0 ? Math.sin(idle * 0.006) * 0.08 : 0;
              o.flick = idle > 0 ? Math.sin(idle * 0.008) * 0.25 : 0;
              o.sy = 1 + 0.05 * Math.sin(Math.max(0, idle) * 0.012) * Math.exp(-Math.max(0, idle) * 0.002);
            }
          }
          if (acornOnGround) {
            var bob = Math.sin(t * 0.008 + q) * 2 * unit;
            var ag = ctx.createRadialGradient(ax, gy - S * 0.12, 0, ax, gy - S * 0.12, S * 0.35);
            ag.addColorStop(0, hexA('#FFE08A', 0.45)); ag.addColorStop(1, hexA('#FFE08A', 0));
            ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(ax, gy - S * 0.12, S * 0.35, 0, TAU); ctx.fill();
            acorn(ax, gy - S * 0.1 + bob, S * 0.1, 0.2 * dir);
          }
          if (drawIt) squirrel(sxp, syp, S, dir, o, t);
          // pick-up twinkle
          var tq = (pr - (T.runEnd + (T.grabEnd - T.runEnd) * 0.5)) * dur / 450;
          if (tq > 0 && tq < 1) {
            for (var tw = 0; tw < 5; tw++) {
              var twk = twinkles[tw], a2 = twk.a, d2 = S * (0.25 + 0.4 * tq) * twk.d;
              ctx.globalAlpha = gFade * Math.sin(tq * Math.PI);
              ctx.fillStyle = twk.col;
              sparkPath(ctx, standX + dir * 0.4 * S + Math.cos(a2) * d2, gy - S * 0.5 + Math.sin(a2) * d2, S * 0.07 * Math.sin(tq * Math.PI)); ctx.fill();
            }
            ctx.globalAlpha = gFade;
          }
        }

        drawPile(pcx, gy, PW, PH, S, true, t, shake);

        // flying leaves: vortex column, then tumbling down (super: some form a heart)
        if (th > 0) {
          var riseMax = Math.max(gy - H * 0.26, S * 2);
          var hcx = W * 0.5, hcy = H * (portrait ? 0.4 : 0.41), hR = Math.min(W * 0.3, H * 0.17);
          var hForm = 0.43, hRel = 0.68;
          for (var f = 0; f < flyers.length; f++) {
            var F = flyers[f];
            var ft = th / 1000 - F.at;
            if (ft <= 0) continue;
            var hgt = riseMax * F.h, tp = F.tp;
            var y0 = gy - PH * 0.7, yy;
            if (ft < tp) { var u = ft / tp; yy = y0 - hgt * (1 - (1 - u) * (1 - u)); }
            else yy = y0 - hgt + (ft - tp) * hgt * 0.42;
            var ang = F.th + F.om * (1 - Math.exp(-ft * 1.4)) / 1.4;
            var rad = (F.r0 * PW * 0.5 + F.grow * S * ft * 1.4) * (isSuper ? 1.15 : 1);
            var depth = Math.sin(ang);
            var xx = pcx + Math.cos(ang) * rad + F.drift * S * Math.max(0, ft - tp) * 1.5 + Math.sin(ft * 3 + F.fph) * S * 0.12 * clamp01(ft - tp + 0.2);
            var sc = S * F.sz * (0.85 + 0.2 * depth);
            var rot = F.rot + F.spin * ft, flipX = Math.cos(ft * F.flip + F.fph);
            if (Math.abs(flipX) < 0.15) flipX = flipX < 0 ? -0.15 : 0.15;
            var al = clamp01(ft / 0.08);
            if (F.heart) {
              var hpnt = heartPts[F.hk];
              var hx3 = hcx + hpnt.x * hR, hy3 = hcy + hpnt.y * hR * 0.95;
              var pulse = 1 + 0.06 * Math.sin(t * 0.012);
              hx3 = hcx + (hx3 - hcx) * pulse; hy3 = hcy + (hy3 - hcy) * pulse;
              var kf = easeInOut((p - hForm) / 0.1);
              var rel = clamp01((p - hRel) / 0.3);
              if (rel > 0) {
                var rt = (p - hRel) * dur / 1000;
                hx3 += hpnt.x * S * rt * 0.9 + Math.sin(rt * 4 + F.fph) * S * 0.15;
                hy3 += rt * rt * S * 1.4 + hpnt.y * S * rt * 0.3;
                al *= clamp01(1.3 - rel);
              }
              xx = lerp(xx, hx3, kf); yy = lerp(yy, hy3, kf);
              if (kf > 0.5 && rel === 0) { flipX = lerp(flipX, 1, kf); rot = lerp(rot % TAU, Math.atan2(hpnt.x, -hpnt.y), kf * 0.8); }
            } else if (isSuper) {
              // keep the heart's inside clear: loose leaves are nudged out of it while it shows
              var kc = easeInOut((p - hForm) / 0.1) * (1 - clamp01((p - hRel) / 0.15));
              var ddx = xx - hcx, ddy = (yy - hcy) * 1.1, dd2 = Math.hypot(ddx, ddy) || 1, need = hR * 1.3;
              if (kc > 0 && dd2 < need) { var push = (need / dd2 - 1) * kc; xx += ddx * push; yy += ddy * push / 1.1; }
            }
            ctx.globalAlpha = gFade * al;
            leaf(xx, yy, sc, rot, flipX, F.col, F.maple);
          }
          ctx.globalAlpha = gFade;
          // super: soft glow inside the leaf heart
          if (isSuper) {
            var hk2 = easeInOut((p - hForm) / 0.1) * (1 - clamp01((p - hRel) / 0.12));
            if (hk2 > 0) {
              var hg = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, hR * 1.1);
              hg.addColorStop(0, hexA('#FF7FAE', 0.35 * hk2)); hg.addColorStop(0.6, hexA(primary, 0.15 * hk2)); hg.addColorStop(1, hexA(primary, 0));
              ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hcx, hcy, hR * 1.1, 0, TAU); ctx.fill();
            }
          }
        }

        // pop-out sparkle burst
        var pq = (p - T.pop) * dur / 650;
        if (pq > 0 && pq < 1) {
          for (var tw2 = 0; tw2 < twinkles.length; tw2++) {
            var tk = twinkles[tw2], dd = S * (0.5 + 1.1 * easeOut(pq)) * tk.d;
            var ox = isSuper ? pcx : pcx + 0.15 * S;
            ctx.globalAlpha = gFade * Math.sin(pq * Math.PI);
            ctx.fillStyle = tk.col;
            sparkPath(ctx, ox + Math.cos(tk.a) * dd * 1.2, gy - PH - S * 0.4 + Math.sin(tk.a) * dd * 0.8, S * 0.09 * (1 - pq * 0.5)); ctx.fill();
          }
          ctx.globalAlpha = gFade;
        }

        // super: acorns raining down, bouncing once
        for (var r2 = 0; r2 < rainAcorns.length; r2++) {
          var A = rainAcorns[r2], at2 = (t - A.at * dur) / 1000;
          if (at2 <= 0) continue;
          var fallH = gy - S * 0.1 + S * 0.2, g2 = 2 * fallH / (A.sp * A.sp);
          var yA = -S * 0.3 + 0.5 * g2 * at2 * at2, rotA = A.rot + A.spin * at2;
          var landed = at2 > A.sp;
          if (landed) {
            var bt = at2 - A.sp, v0 = g2 * A.sp * 0.3;
            yA = fallH - S * 0.3 - Math.max(0, v0 * bt - 0.5 * g2 * bt * bt);
            rotA = A.rot + A.spin * A.sp;
          }
          var xA = A.x * W;
          if (Math.abs(xA - pcx) < PW && landed) continue;          // ones hitting the pile vanish into it
          ctx.globalAlpha = gFade * clamp01(at2 * 6);
          acorn(xA, yA, S * 0.085 * A.sz, rotA);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        var tp2 = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp2 > 0 ? easeOutBack(tp2) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp2 * 2, 1) * gFade);
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
      };
    }
  });
})();
