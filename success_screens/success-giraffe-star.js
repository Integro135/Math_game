/* success-giraffe-star.js — מסך הצלחה: גִּ'ירָפָה וְכוֹכָב 🦒⭐
   לילה בסוואנה. ג'ירפה תינוקת חמודה (מבט צד: פרווה זהובה עם כתמים חומים
   מעוגלים, שתי קרניים קטנות עם ציציות כהות, עין גדולה ועדינה עם ריסים ארוכים
   וניצוץ, לוע רך וחיוך קטן, אוזניים קטנות שמרפרפות) עומדת על גבעה זהובה-כהה
   ליד צללית של עץ שיטה שטוח-צמרת. כוכב זהוב זוהר תלוי נמוך בשמיים, ממש מחוץ
   להישג (וכשהיא כמעט מגיעה — הוא מתרומם עוד קצת!). הג'ירפה מביטה למעלה, מותחת
   את הצוואר גבוה-גבוה במתיחה גמישה ומצחיקה (הכתמים נמתחים יחד איתו), עולה על
   קצות הפרסות ונוגעת בכוכב באף — "בּוּפּ!": הכוכב מצלצל בהבזק אור וגלי צלצול,
   מפל כוכבונים מתגלגל מטה ומנצנץ על פני השמיים, והצוואר קופץ חזרה בנדנוד שמח
   — עיניים צוחקות, מצמוץ וחיוך גדול.
   בסופר: הכוכבונים שנפלו מתחברים לקבוצת כוכבים בצורת לב (קווי אור דקים שנמשכים
   משני הצדדים), גחליליות מאירות את עץ השיטה, וג'ירפה קטנה נוספת מציצה מאחורי
   הגבעה, מותחת צוואר ומסתכלת.
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
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function elasticOut(x) { x = clamp01(x); return x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(x * TAU * 1.25); }
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
  // five-point star with softly rounded tips (kids'-book star)
  var SVX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SVY = SVX.slice();
  function starPath(ctx, x, y, r, rot, inner, rd) {
    var i;
    for (i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r;
      SVX[i] = x + Math.cos(a) * rr; SVY[i] = y + Math.sin(a) * rr;
    }
    ctx.beginPath();
    for (i = 0; i < 10; i++) {
      var p = (i + 9) % 10, n = (i + 1) % 10, k = i % 2 ? rd * 0.5 : rd;
      var ax = SVX[i] + (SVX[p] - SVX[i]) * k, ay = SVY[i] + (SVY[p] - SVY[i]) * k;
      if (i) ctx.lineTo(ax, ay); else ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(SVX[i], SVY[i], SVX[i] + (SVX[n] - SVX[i]) * k, SVY[i] + (SVY[n] - SVY[i]) * k);
    }
    ctx.closePath();
  }

  // deterministic jitter so the patches keep their shapes between runs
  var seed = 11;
  function srnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function jit() { var a = []; for (var i = 0; i < 7; i++) a.push(0.82 + srnd() * 0.32); return a; }

  // ─── the giraffe, in "giraffe units" (1 = s px), facing +x, origin on the ground ───
  var MAIN = { coat: '#F9BE4A', light: '#FFE7A6', shade: '#DC912F', patch: '#B55B24', patchLt: '#CB773A',
               far: '#D18A30', line: '#56290F', muzzle: '#FFE4BC', muzzleSh: '#EFBE84', hoof: '#5A3115',
               tuft: '#7A3C18', mane: '#CF6F2B', top: '#FFDA86', earIn: '#F7A3A2', blush: 'rgba(255,110,128,.5)', leg: '#FFF2D4' };
  var KID  = { coat: '#FFD27E', light: '#FFF2CE', shade: '#EBA853', patch: '#D07A3B', patchLt: '#E29452',
               far: '#E2A050', line: '#5E3416', muzzle: '#FFF1DA', muzzleSh: '#F6D3A4', hoof: '#62391A',
               tuft: '#8A4A20', mane: '#DD8238', top: '#FFE6A8', earIn: '#FAB0B6', blush: 'rgba(255,110,140,.55)', leg: '#FFF6E2' };

  var LIFT = 0.1, TILT = -0.045, PIV = [-0.3, -0.68];
  var NB = [0.27, -0.95], REST_V = [0.17, -0.6], NOSE = [0.395, 0.0];
  var L0 = Math.sqrt(REST_V[0] * REST_V[0] + REST_V[1] * REST_V[1]);
  var PHI0 = 0.1, PHI_LOOK = -0.42, PHI_REACH = -0.8, PHI_HAPPY = -0.26;
  var STAR_L = [0.9, -2.85], STAR_R = 0.24, TEASE = 0.32;
  var K1 = 0.42, K2 = 0.78;
  var BURST = 0.9;   // how far (giraffe units) the star's glow / chime burst may reach above its centre

  function bodyPt(x, y, lift, tilt) {
    var c = Math.cos(tilt), sn = Math.sin(tilt), dx = x - PIV[0], dy = y - PIV[1];
    return [PIV[0] + dx * c - dy * sn, PIV[1] + dx * sn + dy * c - lift];
  }
  // neck vector at full reach: the nose tip lands on the star's rim
  var REACH_V = (function () {
    var c = Math.cos(PHI_REACH), sn = Math.sin(PHI_REACH);
    var tx = STAR_L[0] - c * STAR_R * 0.8, ty = STAR_L[1] - sn * STAR_R * 0.8;
    var nx = tx - (NOSE[0] * c - NOSE[1] * sn), ny = ty - (NOSE[0] * sn + NOSE[1] * c);
    var B = bodyPt(NB[0], NB[1], LIFT, TILT);
    return [nx - B[0], ny - B[1]];
  })();

  var BODY_P = [[-0.37, -0.88, 0.07], [-0.19, -0.93, 0.078], [0.0, -0.95, 0.075], [0.19, -0.95, 0.07], [0.35, -0.98, 0.06],
                [-0.29, -0.71, 0.072], [-0.1, -0.76, 0.08], [0.1, -0.77, 0.078], [0.29, -0.8, 0.068],
                [-0.45, -0.72, 0.05], [-0.19, -0.58, 0.05], [0.01, -0.6, 0.055], [0.2, -0.62, 0.05]]
               .map(function (p) { return p.concat([jit()]); });
  var NECK_P = [[0.12, 0.5, 0.1, 0.36], [0.26, -0.5, 0.1, 0.36], [0.4, 0.5, 0.1, 0.36], [0.54, -0.5, 0.1, 0.36],
                [0.68, 0.5, 0.1, 0.36], [0.82, -0.48, 0.095, 0.34], [0.95, 0.42, 0.055, 0.3]]
               .map(function (p) { return p.concat([jit()]); });
  var HEAD_P = [[-0.115, -0.01, 0.048], [-0.045, -0.165, 0.034], [-0.02, 0.105, 0.036]].map(function (p) { return p.concat([jit()]); });

  // heart constellation: 16 points evenly spaced by arc length, starting at the top notch
  var HEART = (function () {
    var N = 720, xs = [], ys = [], cl = [0], i, j = 0, k;
    for (i = 0; i <= N; i++) {
      var t = i / N * TAU, sn = Math.sin(t);
      xs.push(16 * sn * sn * sn);
      ys.push(-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)));
      if (i) cl.push(cl[i - 1] + Math.sqrt((xs[i] - xs[i - 1]) * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]) * (ys[i] - ys[i - 1])));
    }
    var tot = cl[N], pts = [], out = [], top = 1e9, bot = -1e9;
    for (k = 0; k < 16; k++) {
      var want = tot * k / 16;
      while (cl[j + 1] < want) j++;
      var f = (want - cl[j]) / ((cl[j + 1] - cl[j]) || 1);
      pts.push([lerp(xs[j], xs[j + 1], f), lerp(ys[j], ys[j + 1], f)]);
    }
    for (k = 0; k < N; k += 12) out.push([xs[k], ys[k]]);
    for (k = 0; k <= N; k++) { top = Math.min(top, ys[k]); bot = Math.max(bot, ys[k]); }
    return { pts: pts, out: out, top: top, bot: bot };
  })();

  window.SUCCESS.styles.push({
    name: 'giraffe-star',
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
      var hasPts = typeof opts.points === 'number';

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { look: [0.05, 0.13], s1: [0.14, 0.22], tease: [0.2, 0.26], s2: [0.27, 0.33], tip: [0.27, 0.33], s3: [0.345, 0.38],
            boop: 0.38, rel: 0.405, txt: 0.33, happy: [0.385, 0.52], blink: 0.6, ear: [0.08, 0.39, 0.62, 0.86],
            glide: [0.58, 0.68], lines: [0.68, 0.82], ff: [0.44, 0.58], friend: [0.47, 0.6], fBlink: 0.74, fHappy: [0.83, 0.93] }
        : { look: [0.06, 0.17], s1: [0.18, 0.28], tease: [0.26, 0.33], s2: [0.335, 0.415], tip: [0.335, 0.41], s3: [0.43, 0.475],
            boop: 0.475, rel: 0.515, txt: 0.4, happy: [0.48, 0.68], blink: 0.79, ear: [0.1, 0.49, 0.84],
            glide: null, lines: null, ff: null, friend: null };
      function ms(f) { return f * dur; }
      function prog(t, r) { return r ? clamp01((t - r[0] * dur) / ((r[1] - r[0]) * dur)) : 0; }

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;opacity:0';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var back = document.createElement('canvas'), front = document.createElement('canvas');
      var W = 0, H = 0, unit = 1, DPR = 1;
      var Lx = {};

      function hillY(x) {
        var d = (x - Lx.hcx) / (W * 0.62);
        return Lx.crest + H * 0.11 * d * d + H * 0.006 * Math.sin((x - Lx.hcx) / W * 9) * Math.min(1, Math.abs(d) * 3);
      }
      function farY(x) { return Lx.crest - H * 0.07 + H * 0.026 * Math.sin(x / W * 4.3 + 0.6) + H * 0.011 * Math.sin(x / W * 12.5 + 2.2); }

      function layout() {
        var pf = Math.max(20, Math.min(34, W * 0.035));
        var tf = isSuper ? Math.max(34, Math.min(84, W * 0.08)) : Math.max(28, Math.min(58, W * 0.056));
        // clear line: 30px under the bottom of the points line (or the praise when there are no points)
        var top = hasPts ? H * (isSuper ? 0.225 : 0.21) + pf * 0.55 + 30 : H * 0.13 + tf * 0.55 + 30;
        var SPAN = -STAR_L[1] + BURST;      // ground → star centre + the burst/glow reach above it
        var s = Math.min(H * 0.19, W * 0.29, (H * 0.94 - top) / SPAN);
        var gy = top + SPAN * s + Math.max(0, H * 0.94 - top - SPAN * s) * 0.45;
        var gx = W * 0.5 - 0.3 * s;
        Lx.s = s; Lx.gx = gx; Lx.gy = gy; Lx.top = top;
        Lx.sx = gx + STAR_L[0] * s; Lx.sy = gy + STAR_L[1] * s; Lx.sr = STAR_R * s;
        Lx.crest = gy + 0.015 * s; Lx.hcx = gx + 0.1 * s;
        Lx.tu = s * (W < H ? 0.9 : 1);
        Lx.tx = Math.min(gx + 2.55 * s, W - 0.42 * Lx.tu); Lx.ty = hillY(Lx.tx) + 0.04 * s;
        Lx.sf = 0.7 * s; Lx.fx = Math.max(0.25 * Lx.sf, gx - 0.68 * s - 0.95 * Lx.sf);
        var fg = 0;
        for (var xx = -0.6; xx <= 0.61; xx += 0.1) fg = Math.max(fg, hillY(Lx.fx + xx * Lx.sf));
        Lx.fgy = fg + 1.02 * Lx.sf;
        Lx.skyTop = top + 0.25 * s; Lx.skyBot = Lx.crest - H * 0.12;
        // heart constellation (super): around the star, below the text, above the resting head
        var hspan = HEART.bot - HEART.top, hTopY = top + 4, hBotY = gy - 2.12 * s;
        var hk = Math.min(1.9 * s, W * 0.8) / 32;
        hk = Math.max(3, Math.min(hk, (hBotY - hTopY) / hspan));
        var hh = hspan * hk;
        var bTop = Math.max(hTopY, Math.min(Lx.sy - 0.36 * hh, hBotY - hh));
        Lx.hsy = bTop + 0.43 * hh;
        Lx.hk = hk; Lx.hcx2 = Math.max(16 * hk + 10, Math.min(W - 16 * hk - 10, Lx.sx)); Lx.hcy = bTop - HEART.top * hk;
        Lx.hp = HEART.pts.map(function (p) { return [Lx.hcx2 + p[0] * hk, Lx.hcy + p[1] * hk]; });
      }

      function buildLayers() {
        back.width = front.width = cv.width; back.height = front.height = cv.height;
        var b = back.getContext('2d'), f = front.getContext('2d'), i, x;
        b.setTransform(DPR, 0, 0, DPR, 0, 0); f.setTransform(DPR, 0, 0, DPR, 0, 0);
        // a faint milky-way band
        b.save(); b.translate(W * 0.5, H * 0.33); b.rotate(-0.38);
        var mb = b.createLinearGradient(0, -H * 0.13, 0, H * 0.13);
        mb.addColorStop(0, hexA(glow, 0)); mb.addColorStop(0.5, hexA(glow, 0.06)); mb.addColorStop(1, hexA(glow, 0));
        b.fillStyle = mb; b.fillRect(-W, -H * 0.13, W * 2, H * 0.26);
        for (i = 0; i < 150; i++) {
          var ux = rnd(-0.75, 0.75) * Math.max(W, H), uy = (Math.random() + Math.random() + Math.random() - 1.5) * H * 0.07;
          b.fillStyle = 'rgba(255,255,255,' + rnd(0.12, 0.5).toFixed(2) + ')';
          b.beginPath(); b.arc(ux, uy, rnd(0.4, 1.1) * Math.max(0.8, unit), 0, TAU); b.fill();
        }
        b.restore();
        for (i = 0; i < 60; i++) {
          b.fillStyle = 'rgba(255,255,255,' + rnd(0.15, 0.55).toFixed(2) + ')';
          b.beginPath(); b.arc(Math.random() * W, Math.random() * Lx.skyBot, rnd(0.4, 1.2), 0, TAU); b.fill();
        }
        // warm afterglow on the horizon
        b.save(); b.translate(W * 0.5, Lx.crest - H * 0.02); b.scale(W * 0.8, H * 0.3);
        var hg = b.createRadialGradient(0, 0, 0, 0, 0, 1);
        hg.addColorStop(0, hexA(accent, 0.22)); hg.addColorStop(0.45, hexA(primary, 0.09)); hg.addColorStop(1, hexA(primary, 0));
        b.fillStyle = hg; b.beginPath(); b.arc(0, 0, 1, 0, TAU); b.fill(); b.restore();
        // far hills + two tiny distant acacias
        var fh = b.createLinearGradient(0, Lx.crest - H * 0.11, 0, Lx.crest + H * 0.05);
        fh.addColorStop(0, '#2C1F35'); fh.addColorStop(1, '#170F1E');
        b.fillStyle = fh; b.beginPath(); b.moveTo(-5, H + 5);
        for (x = -5; x <= W + 10; x += 6) b.lineTo(x, farY(x));
        b.lineTo(W + 10, H + 5); b.closePath(); b.fill();
        b.strokeStyle = hexA(primary, 0.28); b.lineWidth = 1.2; b.beginPath();
        for (x = -5; x <= W + 10; x += 6) { if (x === -5) b.moveTo(x, farY(x)); else b.lineTo(x, farY(x)); }
        b.stroke();
        [[0.13, 0.3], [0.6, 0.24]].forEach(function (a) {
          var ax = W * a[0], ay = farY(ax) + 2, u = Lx.s * a[1];
          b.fillStyle = '#1D1427'; b.strokeStyle = '#1D1427'; b.lineCap = 'round';
          b.lineWidth = u * 0.12; b.beginPath(); b.moveTo(ax, ay); b.lineTo(ax + u * 0.05, ay - u); b.stroke();
          b.lineWidth = u * 0.07; b.beginPath(); b.moveTo(ax + u * 0.05, ay - u); b.lineTo(ax - u * 0.6, ay - u * 1.7);
          b.moveTo(ax + u * 0.05, ay - u); b.lineTo(ax + u * 0.7, ay - u * 1.65); b.stroke();
          b.beginPath(); b.ellipse(ax + u * 0.05, ay - u * 1.85, u * 1.05, u * 0.2, 0, 0, TAU); b.fill();
        });

        // near hill (dark gold) with a starlit rim
        var ng = f.createLinearGradient(0, Lx.crest - 4, 0, H);
        ng.addColorStop(0, '#6F4E1F'); ng.addColorStop(0.28, '#47320F'); ng.addColorStop(1, '#1D1407');
        f.fillStyle = ng; f.beginPath(); f.moveTo(-5, H + 5);
        for (x = -5; x <= W + 10; x += 5) f.lineTo(x, hillY(x));
        f.lineTo(W + 10, H + 5); f.closePath(); f.fill();
        f.lineCap = 'round'; f.lineJoin = 'round';
        f.strokeStyle = 'rgba(255,214,140,.1)'; f.lineWidth = 7 * unit + 3; f.beginPath();
        for (x = -5; x <= W + 10; x += 5) { if (x === -5) f.moveTo(x, hillY(x) + 2); else f.lineTo(x, hillY(x) + 2); }
        f.stroke();
        f.strokeStyle = 'rgba(255,220,150,.6)'; f.lineWidth = 1.6 * unit + 0.6; f.stroke();
        // grass tufts along the crest
        for (i = 0; i < 26; i++) {
          var gx0 = (i + Math.random() * 0.8) / 26 * W;
          if (Math.abs(gx0 - Lx.gx) < Lx.s * 0.7) continue;
          tuftAt(f, gx0, hillY(gx0) + 2, Lx.s * rnd(0.06, 0.11), '#5E4319', 'rgba(255,214,140,.35)');
        }
        drawAcacia(f, Lx.tx, Lx.ty, Lx.tu);
      }
      function tuftAt(c, x, y, h, col, tip) {
        c.lineCap = 'round';
        for (var k = -2; k <= 2; k++) {
          var lean = k * 0.32 + rnd(-0.1, 0.1), hh = h * (1 - Math.abs(k) * 0.18);
          c.strokeStyle = col; c.lineWidth = Math.max(1, h * 0.14);
          c.beginPath(); c.moveTo(x + k * h * 0.08, y);
          c.quadraticCurveTo(x + k * h * 0.12 + lean * h * 0.3, y - hh * 0.6, x + k * h * 0.1 + lean * h * 0.8, y - hh);
          c.stroke();
          c.strokeStyle = tip; c.lineWidth = Math.max(0.6, h * 0.06);
          c.beginPath(); c.moveTo(x + k * h * 0.1 + lean * h * 0.55, y - hh * 0.72); c.lineTo(x + k * h * 0.1 + lean * h * 0.8, y - hh); c.stroke();
        }
      }
      // flat-topped acacia: trunk, spreading branches, layered umbrella canopy, lit from the star's side
      function drawAcacia(c, x, y, u) {
        var trunk = '#3A2914';
        var blobs = [[-1.1, -1.98, 0.24, 0.11], [-0.82, -2.06, 0.3, 0.14], [-0.45, -2.11, 0.33, 0.15], [-0.05, -2.13, 0.35, 0.15],
                     [0.35, -2.11, 0.33, 0.15], [0.74, -2.06, 0.3, 0.14], [1.07, -1.98, 0.24, 0.11],
                     [-0.62, -1.95, 0.3, 0.1], [0.08, -1.96, 0.36, 0.1], [0.72, -1.94, 0.28, 0.09], [0, -2.17, 1.12, 0.07],
                     [-0.95, -1.64, 0.26, 0.09], [-0.7, -1.69, 0.24, 0.1], [-0.45, -1.63, 0.2, 0.08]];
        function canopy(dx, dy) {
          c.beginPath();
          for (var i = 0; i < blobs.length; i++) {
            var q = blobs[i], cx = x + (q[0] + dx) * u, cy = y + (q[1] + dy) * u;
            c.moveTo(cx + q[2] * u, cy); c.ellipse(cx, cy, q[2] * u, q[3] * u, 0, 0, TAU);
          }
        }
        // trunk
        c.fillStyle = trunk;
        c.beginPath(); c.moveTo(x - 0.13 * u, y + 0.03 * u);
        c.quadraticCurveTo(x - 0.03 * u, y - 0.45 * u, x - 0.0 * u, y - 0.98 * u);
        c.lineTo(x + 0.1 * u, y - 0.98 * u);
        c.quadraticCurveTo(x + 0.06 * u, y - 0.45 * u, x + 0.14 * u, y + 0.03 * u); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,214,140,.28)'; c.lineWidth = 1.2 * unit + 0.4;
        c.beginPath(); c.moveTo(x - 0.11 * u, y); c.quadraticCurveTo(x - 0.02 * u, y - 0.45 * u, x + 0.005 * u, y - 0.95 * u); c.stroke();
        // branches
        c.strokeStyle = trunk; c.lineCap = 'round';
        [[-0.92, -1.9, 0.06], [-0.35, -2.02, 0.055], [0.3, -2.02, 0.055], [0.92, -1.9, 0.06], [-0.62, -1.62, 0.05], [0.05, -1.75, 0.045]].forEach(function (q) {
          c.lineWidth = q[2] * u; c.beginPath(); c.moveTo(x + 0.05 * u, y - 0.95 * u);
          c.quadraticCurveTo(x + q[0] * 0.3 * u, y + (q[1] * 0.75) * u, x + q[0] * u, y + q[1] * u); c.stroke();
        });
        // canopy: rim (offset toward the light) then body
        c.fillStyle = 'rgba(255,214,140,.55)'; canopy(-0.02, -0.035); c.fill();
        var cg = c.createLinearGradient(0, y - 2.3 * u, 0, y - 1.55 * u);
        cg.addColorStop(0, '#5F5628'); cg.addColorStop(0.45, '#3C3718'); cg.addColorStop(1, '#231F0C');
        c.fillStyle = cg; canopy(0, 0); c.fill();
        // leaf texture
        for (var i = 0; i < 34; i++) {
          var lx = x + rnd(-1.1, 1.1) * u, ly = y + rnd(-2.2, -1.9) * u;
          c.fillStyle = i % 2 ? 'rgba(20,18,6,.45)' : 'rgba(120,110,50,.35)';
          c.beginPath(); c.ellipse(lx, ly, rnd(0.04, 0.09) * u, rnd(0.02, 0.04) * u, 0, 0, TAU); c.fill();
        }
      }

      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
        layout();
        buildLayers();
      }
      fit();
      window.addEventListener('resize', fit);

      // sprites (off-DOM): warm glow + firefly glow
      function mkGlow(c0, c1, c2, c3) {
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, c0); gr.addColorStop(0.2, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c3);
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
      }
      var spr = mkGlow('rgba(255,255,236,1)', 'rgba(255,234,165,.8)', 'rgba(255,208,115,.24)', 'rgba(255,208,115,0)');
      var fly = mkGlow('rgba(250,255,220,1)', 'rgba(220,255,130,.75)', 'rgba(170,240,90,.2)', 'rgba(170,240,90,0)');

      // ─── particles ───
      var bgStars = [];
      for (var bs = 0; bs < 30; bs++)
        bgStars.push({ x: Math.random(), y: Math.random(), tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 3 === 0 ? glow : bs % 4 === 0 ? accent : '#FFFFFF' });
      var NC = isSuper ? 30 : 26, cas = [];
      var CCOL = ['#FFE27A', '#FFFFFF', accent, '#FFF3B8', glow, '#FFD45E'];
      for (var ci = 0; ci < NC; ci++) {
        cas.push({ fx: (ci * 0.618034 + 0.07) % 1, fy: (ci * 0.7548777 + 0.31) % 1, r: rnd(0.05, 0.095), fd: rnd(600, 850) * (isSuper ? 1.1 : 1),
                   dl: ci * 7, pop: rnd(0.05, 0.15), spin: rnd(4, 9) * (ci % 2 ? 1 : -1), tw: rnd(0, TAU), rate: rnd(3, 6.5),
                   drift: rnd(5, 12), col: CCOL[ci % CCOL.length], heart: isSuper && ci < 16 ? ci : -1 });
      }
      var flies = [];
      if (isSuper) for (var fi = 0; fi < 15; fi++)
        flies.push({ hx: rnd(-1, 1), hy: rnd(-0.6, 1.8), ph: rnd(0, TAU), sp: rnd(0.6, 1.4), r: rnd(0.8, 1.35), dl: rnd(0, 0.1), bl: rnd(2, 4) });

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
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (hasPts) {
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
      function glowDot(img, x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function circ(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      function ell(x, y, rx, ry, rot) { ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }

      // body transform (tiptoe lift + forward tilt about the hips)
      var cLift = 0, cTc = 1, cTs = 0, cTip = 0;
      function X(x, y) { var dx = x - PIV[0], dy = y - PIV[1]; return [PIV[0] + dx * cTc - dy * cTs, PIV[1] + dx * cTs + dy * cTc - cLift]; }

      // neck: a cubic centre-line resampled by arc length → points, normals (+ = throat side), widths
      var NM = 44, RS = 40;
      var nX = new Float64Array(NM), nY = new Float64Array(NM), nNX = new Float64Array(NM), nNY = new Float64Array(NM), nW = new Float64Array(NM);
      var rX = new Float64Array(RS + 1), rY = new Float64Array(RS + 1), rC = new Float64Array(RS + 1);
      var nLen = L0;
      function buildNeck(B, V, b1, b2) {
        var L = Math.sqrt(V[0] * V[0] + V[1] * V[1]) || 0.001, dx = V[0] / L, dy = V[1] / L, px = -dy, py = dx;
        var x0 = B[0], y0 = B[1], x3 = B[0] + V[0], y3 = B[1] + V[1];
        var x1 = x0 + V[0] * 0.34 + px * b1 * L, y1 = y0 + V[1] * 0.34 + py * b1 * L;
        var x2 = x0 + V[0] * 0.68 + px * b2 * L, y2 = y0 + V[1] * 0.68 + py * b2 * L;
        var i, k;
        for (i = 0; i <= RS; i++) {
          var u = i / RS, m = 1 - u;
          rX[i] = m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3;
          rY[i] = m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3;
          rC[i] = i ? rC[i - 1] + Math.sqrt((rX[i] - rX[i - 1]) * (rX[i] - rX[i - 1]) + (rY[i] - rY[i - 1]) * (rY[i] - rY[i - 1])) : 0;
        }
        var tot = rC[RS]; nLen = tot;
        var thin = tot > L0 ? Math.pow(L0 / tot, 0.26) : Math.min(1.15, Math.pow(L0 / tot, 0.5));
        var j = 0;
        for (k = 0; k < NM; k++) {
          var want = tot * k / (NM - 1);
          while (j < RS - 1 && rC[j + 1] < want) j++;
          var f = clamp01((want - rC[j]) / ((rC[j + 1] - rC[j]) || 1));
          nX[k] = lerp(rX[j], rX[j + 1], f); nY[k] = lerp(rY[j], rY[j + 1], f);
          nW[k] = lerp(0.14, 0.095, Math.pow(k / (NM - 1), 0.85)) * thin;
        }
        for (k = 0; k < NM; k++) {
          var a = k > 0 ? k - 1 : 0, b = k < NM - 1 ? k + 1 : NM - 1;
          var tx = nX[b] - nX[a], ty = nY[b] - nY[a], tl = Math.sqrt(tx * tx + ty * ty) || 1;
          nNX[k] = -ty / tl; nNY[k] = tx / tl;
        }
      }
      function neckAt(u, v) {
        u = clamp01(u) * (NM - 1);
        var i = Math.min(NM - 2, Math.floor(u)), f = u - i, w = lerp(nW[i], nW[i + 1], f) * v;
        return [lerp(nX[i], nX[i + 1], f) + lerp(nNX[i], nNX[i + 1], f) * w, lerp(nY[i], nY[i + 1], f) + lerp(nNY[i], nNY[i + 1], f) * w];
      }
      function blob(pts) {
        var n = pts.length, i;
        ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
        for (i = 0; i < n; i++) {
          var p = pts[i], q = pts[(i + 1) % n];
          ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        }
        ctx.closePath();
      }
      function roundBlob(cx, cy, r, J, sc, ox, oy) {
        var pts = [];
        for (var k = 0; k < 7; k++) { var a = k / 7 * TAU + 0.3; pts.push([cx + ox + Math.cos(a) * r * J[k] * sc, cy + oy + Math.sin(a) * r * J[k] * sc]); }
        blob(pts);
      }
      function neckBlob(P, sc, ou) {
        var pts = [];
        for (var k = 0; k < 7; k++) {
          var a = k / 7 * TAU + 0.3;
          pts.push(neckAt(P[0] + ou + Math.cos(a) * P[2] * P[4][k] * sc, P[1] - 0.08 * (1 - sc) + Math.sin(a) * P[3] * P[4][k] * sc));
        }
        blob(pts);
      }
      // legs: chains of circles (top → knee → fetlock)
      function legP(T0, fx, hind) {
        var Fy = -0.07 - 0.05 * cTip, fx2 = fx + 0.012 * cTip;
        var kx = lerp(T0[0], fx2, 0.5) + (hind ? -0.04 : 0.014), ky = lerp(T0[1], Fy, hind ? 0.55 : 0.5);
        return [T0[0], T0[1], hind ? 0.1 : 0.088, kx, ky, 0.056, fx2 + (hind ? 0.006 : 0), Fy, 0.046];
      }
      function legPath(P, g) {
        for (var i = 0; i + 3 < P.length; i += 3) {
          var ax = P[i], ay = P[i + 1], ar = P[i + 2], bx = P[i + 3], by = P[i + 4], br = P[i + 5];
          var d = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)), n = Math.max(1, Math.ceil(d / (Math.min(ar, br) * 0.5)));
          for (var j = 0; j < n; j++) { var u = j / n; circ(lerp(ax, bx, u), lerp(ay, by, u), lerp(ar, br, u) + g); }
        }
        circ(P[6], P[7], P[8] + g);
        circ(P[3] + (P[0] > P[6] ? -0.006 : 0.008), P[4], 0.063 + g);           // knobbly knee
      }
      function hoof(fx, col, line) {
        ctx.save(); ctx.translate(fx + 0.064, 0); ctx.rotate(0.55 * cTip); ctx.translate(-fx - 0.064, 0);
        ctx.beginPath(); ctx.moveTo(fx - 0.05, -0.085); ctx.lineTo(fx + 0.05, -0.085);
        ctx.quadraticCurveTo(fx + 0.07, -0.012, fx + 0.064, 0); ctx.lineTo(fx - 0.064, 0);
        ctx.quadraticCurveTo(fx - 0.07, -0.012, fx - 0.05, -0.085); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 0.024; ctx.strokeStyle = line; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(fx - 0.035, -0.07, 0.022, 0.05);
        ctx.restore();
      }
      function ear(x, y, ang, len, wid, fill, inner, line) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(0, -wid * 0.45);
        ctx.quadraticCurveTo(len * 0.55, -wid * 1.3, len, 0); ctx.quadraticCurveTo(len * 0.55, wid * 1.3, 0, wid * 0.45);
        ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 0.024; ctx.strokeStyle = line; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(len * 0.18, 0);
        ctx.quadraticCurveTo(len * 0.55, -wid * 0.62, len * 0.85, 0); ctx.quadraticCurveTo(len * 0.55, wid * 0.62, len * 0.18, 0);
        ctx.fillStyle = inner; ctx.fill();
        ctx.restore();
      }
      function tuftBall(x, y, r, C) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = C.tuft; ctx.fill(); ctx.lineWidth = 0.022; ctx.strokeStyle = C.line; ctx.stroke();
        ctx.fillStyle = 'rgba(255,220,180,.35)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.32, 0, TAU); ctx.fill();
      }
      function headPath(g) {
        circ(0, -0.06, 0.2 + g);
        circ(0.1, 0.05, 0.14 + g);
        ell(0.24, 0.03, 0.16 + g, 0.125 + g, 0.05);
        circ(-0.03, -0.2, 0.034 + g); circ(-0.04, -0.27, 0.03 + g); circ(-0.05, -0.34, 0.028 + g);   // near ossicone
      }
      function bodyPath(g, tilt) {
        var c = X(0.0, -0.8); ell(c[0], c[1], 0.4 + g, 0.205 + g, -0.07 + tilt);
        c = X(0.27, -0.85); circ(c[0], c[1], 0.2 + g);
        c = X(-0.28, -0.8); circ(c[0], c[1], 0.185 + g);
        c = X(0.0, -0.7); ell(c[0], c[1], 0.3 + g, 0.14 + g, tilt);
      }

      // the eye: big, gentle, long lashes; open 0..1 (blink), happy = closed smiling arc; look = unit vector (head frame)
      function eye(st, C) {
        var ex = 0.062, ey = -0.078, rx = 0.075, ry = 0.088, i;
        var lashC = '#2E1406';
        ctx.lineCap = 'round';
        if (st.happy) {
          ctx.strokeStyle = lashC; ctx.lineWidth = 0.028;
          ctx.beginPath(); ctx.arc(ex, ey + 0.035, 0.064, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
          ctx.lineWidth = 0.017;
          for (i = 0; i < 3; i++) {
            var ha = Math.PI + 0.45 + i * 0.32, hx = ex + Math.cos(ha) * 0.064, hy = ey + 0.035 + Math.sin(ha) * 0.064;
            ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ha - 0.35) * 0.05, hy + Math.sin(ha - 0.35) * 0.05); ctx.stroke();
          }
          return;
        }
        var o = Math.max(0.05, Math.min(1, st.open));
        if (o < 0.18) {
          ctx.strokeStyle = lashC; ctx.lineWidth = 0.026;
          ctx.beginPath(); ctx.arc(ex, ey - 0.02, 0.064, 0.35, Math.PI - 0.35); ctx.stroke();
          ctx.lineWidth = 0.016;
          for (i = 0; i < 3; i++) {
            var ca = Math.PI - 0.5 - i * 0.3, cx2 = ex + Math.cos(ca) * 0.064, cy2 = ey - 0.02 + Math.sin(ca) * 0.064;
            ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(ca + 0.5) * 0.045, cy2 + Math.sin(ca + 0.5) * 0.045); ctx.stroke();
          }
          return;
        }
        var cy = ey + ry * (1 - o) * 0.55, ryo = ry * o;
        ctx.save();
        ctx.beginPath(); ell(ex, cy, rx, ryo, 0); ctx.clip();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(ex - rx, cy - ryo, rx * 2, ryo * 2);
        var ix = ex + 0.006 + st.lx * 0.019, iy = ey + 0.008 + st.ly * 0.019;
        var ig = ctx.createRadialGradient(ix - 0.014, iy - 0.018, 0.004, ix, iy, 0.064);
        ig.addColorStop(0, '#94592A'); ig.addColorStop(0.55, '#4A250C'); ig.addColorStop(1, '#1F0C03');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, 0.062, 0, TAU); ctx.fill();
        ctx.fillStyle = '#140701'; ctx.beginPath(); ctx.arc(ix + 0.002, iy + 0.002, 0.031, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ix - 0.02, iy - 0.023, 0.024, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(ix + 0.023, iy + 0.021, 0.0105, 0, TAU); ctx.fill();
        ctx.restore();
        // lid line + long lashes sweeping back
        ctx.strokeStyle = lashC; ctx.lineWidth = 0.024;
        ctx.beginPath(); ctx.ellipse(ex, cy, rx, ryo, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
        ctx.strokeStyle = hexA(C.line, 0.45); ctx.lineWidth = 0.012;
        ctx.beginPath(); ctx.ellipse(ex, cy, rx, ryo, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        ctx.strokeStyle = lashC; ctx.lineWidth = 0.017;
        for (i = 0; i < 3; i++) {
          var la = Math.PI + 0.32 + i * 0.36, lx = ex + Math.cos(la) * rx, ly = cy + Math.sin(la) * ryo;
          var da = la - 0.42, len = 0.072 - i * 0.009;
          ctx.beginPath(); ctx.moveTo(lx, ly);
          ctx.quadraticCurveTo(lx + Math.cos(da) * len * 0.6, ly + Math.sin(da) * len * 0.6, lx + Math.cos(da - 0.35) * len, ly + Math.sin(da - 0.35) * len);
          ctx.stroke();
        }
      }

      // full giraffe. st: lift, tilt, nv, b1, b2, phi, ear, open, happy, smile, lookX/Y (world), rimX/Y (world), rim, tail, shadow
      function drawGiraffe(gx, gy, sc, st, C) {
        cLift = st.lift; cTc = Math.cos(st.tilt); cTs = Math.sin(st.tilt); cTip = Math.max(0, st.lift / LIFT);
        var B = X(NB[0], NB[1]);
        buildNeck(B, st.nv, st.b1, st.b2);
        var Nx = B[0] + st.nv[0], Ny = B[1] + st.nv[1], ph = st.phi, cph = Math.cos(ph), sph = Math.sin(ph);
        var i, P, c;
        ctx.save();
        ctx.translate(gx, gy); ctx.scale(sc, sc);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (st.shadow) {
          ctx.fillStyle = 'rgba(0,0,0,.34)';
          ctx.beginPath(); ctx.ellipse(0.04, 0.008, 0.66 - st.lift * 0.8, 0.055, 0, 0, TAU); ctx.fill();
        }
        // far legs (behind, a shade darker)
        var fl1 = legP(X(0.37, -0.72), 0.41, false), fl2 = legP(X(-0.19, -0.7), -0.19, true);
        ctx.fillStyle = C.line; ctx.beginPath(); legPath(fl1, 0.028); legPath(fl2, 0.028); ctx.fill();
        ctx.fillStyle = C.far; ctx.beginPath(); legPath(fl1, 0); legPath(fl2, 0); ctx.fill();
        ctx.save(); ctx.clip();
        var flg = ctx.createLinearGradient(0, -0.42, 0, -0.05);
        flg.addColorStop(0, hexA(C.leg, 0)); flg.addColorStop(1, hexA(C.leg, 0.45));
        ctx.fillStyle = flg; ctx.fillRect(-0.5, -0.42, 1.1, 0.42);
        ctx.restore();
        hoof(0.41, C.hoof, C.line); hoof(-0.184, C.hoof, C.line);
        // tail with a dark tuft
        var tb0 = X(-0.42, -0.9), ta = st.tail;
        var tex = tb0[0] - Math.sin(ta) * 0.36, tey = tb0[1] + Math.cos(ta) * 0.36;
        ctx.beginPath(); ctx.moveTo(tb0[0], tb0[1]);
        ctx.quadraticCurveTo(tb0[0] - Math.sin(ta * 0.4) * 0.2 - 0.06, tb0[1] + 0.15, tex, tey);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.064; ctx.stroke();
        ctx.strokeStyle = C.coat; ctx.lineWidth = 0.034; ctx.stroke();
        ctx.save(); ctx.translate(tex, tey); ctx.rotate(ta);
        ctx.beginPath(); ctx.moveTo(0, -0.03); ctx.bezierCurveTo(0.055, 0.0, 0.05, 0.08, 0, 0.115); ctx.bezierCurveTo(-0.05, 0.08, -0.055, 0.0, 0, -0.03);
        ctx.fillStyle = C.tuft; ctx.fill(); ctx.lineWidth = 0.022; ctx.strokeStyle = C.line; ctx.stroke();
        ctx.restore();
        // mane along the back of the neck (scallops that stretch with it)
        var MN = 11, mu0 = 0.04, mu1 = 0.86, segL = nLen * (mu1 - mu0) / MN;
        for (var pass = 0; pass < 2; pass++) {
          var gg = pass ? 0 : 0.024;
          ctx.fillStyle = pass ? C.mane : C.line; ctx.beginPath();
          for (i = 0; i <= MN; i++) {
            var mu = mu0 + (mu1 - mu0) * i / MN, mk = mu * (NM - 1), mj = Math.min(NM - 2, Math.floor(mk)), mf = mk - mj;
            var mw = lerp(nW[mj], nW[mj + 1], mf), mnx = lerp(nNX[mj], nNX[mj + 1], mf), mny = lerp(nNY[mj], nNY[mj + 1], mf);
            var off = mw + 0.018, mcx = lerp(nX[mj], nX[mj + 1], mf) - mnx * off, mcy = lerp(nY[mj], nY[mj + 1], mf) - mny * off;
            ell(mcx, mcy, segL * 0.62 + gg, 0.058 - 0.016 * mu + gg, Math.atan2(-mnx, mny));
          }
          ctx.fill();
        }
        // far ossicone + far ear (behind the head)
        ctx.save(); ctx.translate(Nx, Ny); ctx.rotate(ph);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.084;
        ctx.beginPath(); ctx.moveTo(0.075, -0.18); ctx.lineTo(0.068, -0.35); ctx.stroke();
        ctx.strokeStyle = C.far; ctx.lineWidth = 0.04; ctx.stroke();
        tuftBall(0.066, -0.37, 0.048, C);
        ear(-0.07, -0.15, Math.PI + 0.95 + st.ear * 0.6, 0.16, 0.064, C.far, hexA(C.earIn, 0.75), C.line);
        ctx.restore();
        // near legs + the one-piece silhouette (outline pass, fill pass)
        var nl1 = legP(X(0.26, -0.72), 0.27, false), nl2 = legP(X(-0.29, -0.7), -0.31, true);
        var sil = function (g) {
          ctx.beginPath();
          bodyPath(g, st.tilt);
          legPath(nl1, g); legPath(nl2, g);
          for (var k = 0; k < NM; k++) circ(nX[k], nY[k], nW[k] + g);
          ctx.save(); ctx.translate(Nx, Ny); ctx.rotate(ph); headPath(g); ctx.restore();
        };
        ctx.fillStyle = C.line; sil(0.03); ctx.fill();
        var gr = ctx.createLinearGradient(0, Ny - 0.35, 0, 0);
        gr.addColorStop(0, C.top); gr.addColorStop(0.18, C.coat); gr.addColorStop(0.75, C.coat); gr.addColorStop(1, C.shade);
        ctx.fillStyle = gr; sil(0); ctx.fill();
        ctx.save(); ctx.clip();
        // body volume
        c = X(0.06, -0.95);
        var vg = ctx.createRadialGradient(c[0], c[1], 0.05, c[0], c[1] + 0.05, 0.62);
        vg.addColorStop(0, 'rgba(255,240,200,.25)'); vg.addColorStop(0.6, 'rgba(255,240,200,0)'); vg.addColorStop(1, 'rgba(120,50,10,.28)');
        ctx.fillStyle = vg; ctx.fillRect(-0.75, -1.3, 1.5, 0.85);
        // patches: body, upper legs, neck, head
        ctx.fillStyle = C.patch; ctx.beginPath();
        for (i = 0; i < BODY_P.length; i++) { P = BODY_P[i]; c = X(P[0], P[1]); roundBlob(c[0], c[1], P[2], P[3], 1, 0, 0); }
        roundBlob(lerp(nl1[0], nl1[3], 0.35), lerp(nl1[1], nl1[4], 0.35), 0.045, BODY_P[0][3], 1, 0, 0);
        roundBlob(lerp(nl2[0], nl2[3], 0.3), lerp(nl2[1], nl2[4], 0.3), 0.052, BODY_P[3][3], 1, 0, 0);
        for (i = 0; i < NECK_P.length; i++) neckBlob(NECK_P[i], 1, 0);
        ctx.save(); ctx.translate(Nx, Ny); ctx.rotate(ph);
        for (i = 0; i < HEAD_P.length; i++) { P = HEAD_P[i]; roundBlob(P[0], P[1], P[2], P[3], 1, 0, 0); }
        ctx.restore();
        ctx.fill();
        ctx.fillStyle = hexA(C.patchLt, 0.6); ctx.beginPath();
        for (i = 0; i < BODY_P.length; i++) { P = BODY_P[i]; c = X(P[0], P[1]); roundBlob(c[0], c[1], P[2], P[3], 0.5, -P[2] * 0.18, -P[2] * 0.22); }
        for (i = 0; i < NECK_P.length; i++) neckBlob(NECK_P[i], 0.5, -0.012);
        ctx.fill();
        // pale lower legs
        var lg = ctx.createLinearGradient(0, -0.42, 0, -0.05);
        lg.addColorStop(0, hexA(C.leg, 0)); lg.addColorStop(1, hexA(C.leg, 0.75));
        ctx.fillStyle = lg; ctx.fillRect(-0.6, -0.42, 1.3, 0.42);
        // soft highlight down the front of the neck
        ctx.strokeStyle = 'rgba(255,250,225,.28)'; ctx.lineWidth = 0.035; ctx.beginPath();
        for (i = 1; i < 10; i++) { var hp2 = neckAt(i / 10, 0.62); if (i === 1) ctx.moveTo(hp2[0], hp2[1]); else ctx.lineTo(hp2[0], hp2[1]); }
        ctx.stroke();
        // head: muzzle, shine
        ctx.save(); ctx.translate(Nx, Ny); ctx.rotate(ph);
        var mg = ctx.createRadialGradient(0.29, -0.01, 0.02, 0.25, 0.03, 0.17);
        mg.addColorStop(0, C.muzzle); mg.addColorStop(0.75, C.muzzle); mg.addColorStop(1, C.muzzleSh);
        ctx.fillStyle = mg; ctx.beginPath(); ell(0.252, 0.035, 0.152, 0.116, 0.05); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.38)';
        ctx.beginPath(); ell(-0.05, -0.19, 0.07, 0.028, -0.35); ctx.fill();
        ctx.beginPath(); ell(0.27, -0.06, 0.05, 0.018, -0.1); ctx.fill();
        ctx.restore();
        // warm light from the star on the side facing it
        if (st.rim > 0) {
          var rx0 = (st.rimX - gx) / sc, ry0 = (st.rimY - gy) / sc;
          var rg = ctx.createRadialGradient(rx0, ry0, 0.1, rx0, ry0, 1.7);
          rg.addColorStop(0, 'rgba(255,248,210,' + (0.3 * st.rim).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,248,210,0)');
          ctx.fillStyle = rg; ctx.fillRect(rx0 - 1.7, ry0 - 1.7, 3.4, 3.4);
        }
        ctx.restore();   // clip

        // head details (on top)
        ctx.save(); ctx.translate(Nx, Ny); ctx.rotate(ph);
        tuftBall(-0.052, -0.36, 0.052, C);
        ear(-0.15, -0.115, Math.PI + 0.3 + st.ear, 0.19, 0.074, C.coat, C.earIn, C.line);
        // pupils look toward the target
        var ex0 = Nx + 0.062 * cph + 0.078 * sph, ey0 = Ny + 0.062 * sph - 0.078 * cph;
        var lx = (st.lookX - gx) / sc - ex0, ly = (st.lookY - gy) / sc - ey0, ll = Math.sqrt(lx * lx + ly * ly) || 1;
        st.lx = (lx * cph + ly * sph) / ll; st.ly = (-lx * sph + ly * cph) / ll;
        eye(st, C);
        // blush, nostril, smile
        ctx.fillStyle = C.blush; ctx.beginPath(); ell(0.125, 0.07, 0.056, 0.03, 0.1); ctx.fill();
        ctx.fillStyle = hexA(C.line, 0.85); ctx.beginPath(); ell(0.352, -0.035, 0.021, 0.012, -0.55); ctx.fill();
        var sm = st.smile;
        if (sm < 0.55) {
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(0.362, 0.072); ctx.quadraticCurveTo(0.3, 0.115 + sm * 0.05, 0.215, 0.088); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0.215, 0.088); ctx.quadraticCurveTo(0.2, 0.08, 0.198, 0.066); ctx.stroke();
        } else {
          var d = (sm - 0.55) / 0.45;
          ctx.beginPath(); ctx.moveTo(0.37, 0.062);
          ctx.quadraticCurveTo(0.31, 0.13 + 0.07 * d, 0.2, 0.08);
          ctx.quadraticCurveTo(0.29, 0.1, 0.37, 0.062); ctx.closePath();
          ctx.fillStyle = '#6A2412'; ctx.fill();
          ctx.save(); ctx.clip();
          ctx.fillStyle = '#FF8C94'; ctx.beginPath(); ell(0.285, 0.15 + 0.03 * d, 0.06, 0.04, 0); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.02; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0.2, 0.08); ctx.quadraticCurveTo(0.185, 0.072, 0.184, 0.056); ctx.stroke();
        }
        ctx.restore();
        // near hooves
        hoof(0.27, C.hoof, C.line); hoof(-0.304, C.hoof, C.line);
        ctx.restore();
      }

      function drawMainStar(x, y, r, rot, sx, sy, gA, t, hs) {
        ctx.globalCompositeOperation = 'lighter';
        glowDot(spr, x, y, r * (3.15 + 0.15 * Math.sin(t * 0.004)) * hs, 0.85 * gA);
        // slow soft rays
        ctx.fillStyle = 'rgba(255,236,170,' + (0.1 * gA).toFixed(3) + ')';
        for (var i = 0; i < 8; i++) {
          var a = t * 0.0003 + i * TAU / 8, l = r * (i % 2 ? 2.1 : 2.95) * hs;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.09) * r * 0.6, y + Math.sin(a - 0.09) * r * 0.6);
          ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
          ctx.lineTo(x + Math.cos(a + 0.09) * r * 0.6, y + Math.sin(a + 0.09) * r * 0.6); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
        var g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r * 1.05);
        g.addColorStop(0, '#FFFDEB'); g.addColorStop(0.45, '#FFE36B'); g.addColorStop(1, '#F6A825');
        ctx.lineJoin = 'round';
        starPath(ctx, 0, 0, r, 0, 0.5, 0.2);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#E08A1C'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.33, r * 0.17, r * 0.08, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function littleStar(x, y, r, rot, col, a) {
        if (a <= 0) return;
        ctx.globalCompositeOperation = 'lighter';
        glowDot(spr, x, y, r * 3.2, 0.55 * a);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        starPath(ctx, x, y, r, rot, 0.48, 0.16);
        ctx.fillStyle = col; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.2, r * 0.22, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // where a cascading little star is at time t (super: heart stars glide into the constellation)
      var cp = { x: 0, y: 0, rot: 0, e: 0 };
      function casPos(c, t, tb) {
        var te = t - tb - c.dl;
        if (te < 0) return false;
        var e = clamp01(te / c.fd), s = Lx.s;
        var tx = W * (0.05 + 0.9 * c.fx), ty = Math.max(Lx.skyTop, lerp(Lx.sy - 0.06 * H, Lx.skyBot, Math.pow(c.fy, 0.85)));
        var x = Lx.sx + (tx - Lx.sx) * easeOut(e);
        var y = Lx.sy + (ty - Lx.sy) * smooth(e) - c.pop * H * Math.sin(Math.PI * e) * (1 - e);
        var after = Math.max(0, te - c.fd) / 1000;
        y += after * c.drift * unit; x += Math.sin(after * 1.4 + c.tw) * 4 * unit * Math.min(1, after * 2);
        cp.rot = c.spin * easeOut(e); cp.e = e;
        if (c.heart >= 0 && T.glide) {
          var qg = clamp01((t - ms(T.glide[0]) - c.heart * 0.004 * dur) / (0.09 * dur)), eg = easeInOut(qg), hp = Lx.hp[c.heart];
          x = lerp(x, hp[0], eg); y = lerp(y, hp[1], eg); cp.rot *= 1 - eg;
          cp.e = e + qg * 2;
        }
        cp.x = x; cp.y = y;
        return true;
      }
      function earFlick(t) {
        var v = 0;
        for (var i = 0; i < T.ear.length; i++) {
          var q = (t - ms(T.ear[i])) / 320;
          if (q > 0 && q < 1) v += 0.55 * Math.sin(q * Math.PI * 3) * (1 - q);
        }
        return v;
      }
      function blinkAt(t, at) { var q = (t - ms(at)) / 190; return q > 0 && q < 1 ? Math.abs(Math.cos(q * Math.PI)) : 1; }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = Math.min(clamp01(t / 220), gFade).toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var s = Lx.s, tb = ms(T.boop), tr = ms(T.rel), sinceB = t - tb, i;

        // 1. sky
        ctx.drawImage(back, 0, 0, W, H);
        for (i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * Lx.skyBot, s0.size * 2.3 * unit + 0.5); ctx.fill();
        }

        // 2. super: heart constellation lines + glow
        var heartDone = 0;
        if (T.lines) {
          var lp = prog(t, T.lines) * 8;
          heartDone = clamp01((t - ms(T.lines[1])) / 400);
          if (heartDone > 0) {
            var beat = 0.5 + 0.5 * Math.sin((t - ms(T.lines[1])) * 0.009);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = hexA(primary, (0.06 + 0.05 * beat) * heartDone);
            ctx.beginPath();
            for (i = 0; i < HEART.out.length; i++) {
              var ho = HEART.out[i], hx = Lx.hcx2 + ho[0] * Lx.hk, hy = Lx.hcy + ho[1] * Lx.hk;
              if (i) ctx.lineTo(hx, hy); else ctx.moveTo(hx, hy);
            }
            ctx.closePath(); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
          }
          if (lp > 0) {
            ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
            for (var pass = 0; pass < 2; pass++) {
              ctx.strokeStyle = pass ? 'rgba(255,240,190,.85)' : hexA(primary, 0.35);
              ctx.lineWidth = (pass ? 1.6 : 6) * unit + (pass ? 0.6 : 1);
              ctx.beginPath();
              for (var sd = 0; sd < 2; sd++) {
                for (var j = 0; j < 8; j++) {
                  var f = clamp01(lp - j);
                  if (f <= 0) break;
                  var a0 = Lx.hp[sd ? (16 - j) % 16 : j], a1 = Lx.hp[sd ? 15 - j : j + 1];
                  ctx.moveTo(a0[0], a0[1]); ctx.lineTo(lerp(a0[0], a1[0], f), lerp(a0[1], a1[1], f));
                }
              }
              ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // 3. cascade of little stars
        if (sinceB > 0) {
          for (i = 0; i < cas.length; i++) {
            var C0 = cas[i];
            if (!casPos(C0, t, tb)) continue;
            var tw = 0.75 + 0.25 * Math.sin(t / 1000 * C0.rate + C0.tw);
            var inHeart = C0.heart >= 0 && heartDone > 0;
            if (inHeart) tw = 1 + 0.22 * Math.sin((t - ms(T.lines[1])) * 0.009);
            var rr = C0.r * s * (cp.e < 1 ? 0.7 + 0.3 * cp.e : tw) * (C0.heart >= 0 && cp.e > 1 ? 1 + 0.25 * clamp01(cp.e - 1) : 1);
            var ca = clamp01((t - tb - C0.dl) / 120);
            if (cp.e < 1) {
              var hx0 = cp.x, hy0 = cp.y, he = cp.e, hrot = cp.rot;
              ctx.globalCompositeOperation = 'lighter';
              for (var tr2 = 1; tr2 <= 4; tr2++) {
                if (!casPos(C0, t - tr2 * 28, tb)) break;
                glowDot(spr, cp.x, cp.y, rr * (2.2 - tr2 * 0.3), 0.4 * ca * (1 - tr2 / 5) * (1 - he));
              }
              ctx.globalCompositeOperation = 'source-over';
              cp.x = hx0; cp.y = hy0; cp.e = he; cp.rot = hrot;
            }
            littleStar(cp.x, cp.y, rr, cp.rot, C0.col, ca);
            if (cp.e >= 1 && cp.e < 1.001 && Math.sin(t / 1000 * C0.rate * 0.7 + C0.tw * 2) > 0.93) {
              ctx.globalCompositeOperation = 'lighter';
              ctx.fillStyle = 'rgba(255,255,240,.75)'; sparkPath(ctx, cp.x, cp.y, rr * 2.2); ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            }
          }
        }

        // 4. the big star: hangs low, teases upward ("just out of reach"), gets booped
        var qtz = prog(t, T.tease);
        var bobA = t < tb ? 1 - prog(t, T.s3) : clamp01((sinceB - 350) / 600);
        var stx = Lx.sx + Math.sin(t * 0.0021) * 0.02 * s * bobA;
        var sty = Lx.sy + (1 - easeOutBack(qtz)) * TEASE * s + Math.sin(t * 0.0034) * 0.035 * s * bobA;
        var sg = 0;
        if (T.glide) {
          sg = easeInOut(prog(t, [T.glide[0], T.glide[1] + 0.04]));
          stx = lerp(stx, Lx.hcx2, sg); sty = lerp(sty, Lx.hsy, sg);
        }
        var srot = Math.sin(t * 0.0025) * 0.1 + (qtz > 0 && qtz < 1 ? Math.sin(qtz * TAU * 2) * 0.22 * (1 - qtz) : 0);
        var sb = sinceB / 1000, pulse = sinceB > 0 ? 0.3 * Math.exp(-6 * sb) * Math.sin(TAU * 2.6 * sb) : 0;
        var flash = sinceB > 0 ? Math.max(0, 1 - sb / 0.6) : 0;
        var sGA = 0.8 + 0.2 * Math.sin(t * 0.005) + flash * 0.8 + heartDone * 0.3;
        drawMainStar(stx, sty, Lx.sr, srot, 1 + pulse, 1 - pulse * 0.6, Math.min(1.6, sGA), t, 1 - 0.25 * sg);

        // 5. super: a little friend peeks over the hill (behind it)
        if (T.friend) {
          var fq = prog(t, T.friend);
          if (fq > 0) {
            var fk = easeInOut(prog(t, [T.friend[0] + 0.05, T.friend[1] + 0.06]));
            var fBl = blinkAt(t, T.fBlink);
            var fHap = t > ms(T.fHappy[0]) && t < ms(T.fHappy[1]);
            drawGiraffe(Lx.fx, Lx.fgy + (1 - easeOutBack(fq)) * 1.7 * Lx.sf, Lx.sf, {
              lift: 0, tilt: 0, nv: [REST_V[0] * (1 + 0.85 * fk) + 0.06 * fk, REST_V[1] * (1 + 0.85 * fk)],
              b1: -0.05 + 0.04 * Math.sin(t * 0.003), b2: 0.03, phi: -0.2 - 0.12 * fk + 0.09 * Math.sin(t * 0.0032),
              ear: 0.5 * Math.sin(clamp01((t - ms(T.friend[0]) - 250) / 320) * Math.PI * 3) * (1 - clamp01((t - ms(T.friend[0]) - 250) / 320)),
              open: fBl, happy: fHap, smile: 0.45 + 0.4 * heartDone, lookX: stx, lookY: sty, rim: 0.35, rimX: stx, rimY: sty,
              tail: 0.25, shadow: false }, KID);
          }
        }

        // 6. near hill + acacia
        ctx.drawImage(front, 0, 0, W, H);
        // starlight pooling on the hill under the giraffe
        ctx.globalCompositeOperation = 'lighter';
        var hl = ctx.createRadialGradient(Lx.gx + 0.4 * s, Lx.crest, 0, Lx.gx + 0.4 * s, Lx.crest, 1.9 * s);
        hl.addColorStop(0, 'rgba(255,214,130,' + (0.13 + 0.12 * flash).toFixed(3) + ')'); hl.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.fillStyle = hl; ctx.fillRect(Lx.gx - 1.6 * s, Lx.crest - 1.9 * s, 3.9 * s, 3.8 * s);
        ctx.globalCompositeOperation = 'source-over';

        // 7. super: fireflies light up the acacia
        if (T.ff) {
          var ffIn = prog(t, T.ff);
          if (ffIn > 0) {
            var cx = Lx.tx, cy = Lx.ty - 2.05 * Lx.tu, cw = 1.15 * Lx.tu;
            ctx.globalCompositeOperation = 'lighter';
            ctx.save(); ctx.translate(cx, cy); ctx.scale(cw * 1.25, Lx.tu * 0.65);
            var cgl = ctx.createRadialGradient(0, 0.2, 0, 0, 0.2, 1);
            cgl.addColorStop(0, 'rgba(225,255,140,' + (0.16 * easeOut(ffIn)).toFixed(3) + ')'); cgl.addColorStop(1, 'rgba(225,255,140,0)');
            ctx.fillStyle = cgl; ctx.beginPath(); ctx.arc(0, 0.2, 1, 0, TAU); ctx.fill();
            ctx.restore();
            for (i = 0; i < flies.length; i++) {
              var F = flies[i], fa = clamp01((ffIn - F.dl) * 3);
              if (fa <= 0) continue;
              var fxp = cx + F.hx * cw * 0.95 + Math.sin(t * 0.0011 * F.sp + F.ph) * 0.14 * Lx.tu;
              var fyp = cy + F.hy * 0.2 * Lx.tu + Math.cos(t * 0.0014 * F.sp + F.ph * 1.3) * 0.1 * Lx.tu;
              var fb = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.001 * F.bl + F.ph), 2);
              glowDot(fly, fxp, fyp, 13 * unit * F.r + 4, fa * fb);
              ctx.fillStyle = 'rgba(250,255,215,' + (fa * fb).toFixed(3) + ')';
              ctx.beginPath(); ctx.arc(fxp, fyp, 1.6 * unit * F.r + 0.6, 0, TAU); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // 8. the baby giraffe
        var ql = prog(t, T.look), q1 = prog(t, T.s1), q2 = prog(t, T.s2), q3 = prog(t, T.s3), qt = prog(t, T.tip);
        var kk, bendW = 0, lift, phi, tilt;
        if (t < tr) {
          kk = K1 * elasticOut(q1);
          if (q2 > 0) kk = K1 + (K2 - K1) * elasticOut(q2);
          if (q3 > 0) kk = K2 + (1 - K2) * q3 * q3 * (2 - q3) * (q3 < 1 ? 1 : 1);
          var strain = (q1 >= 1 && q2 <= 0) || (q2 >= 1 && q3 <= 0) ? 1 : 0;
          kk += strain * 0.01 * Math.sin(t * 0.05);
          if (sinceB > 0) kk = 1 - 0.035 * Math.sin(Math.PI * clamp01(sinceB / (tr - tb)));
          bendW = 0.08 * Math.sin(q1 * TAU) * (1 - q1) + 0.07 * Math.sin(q2 * TAU) * (1 - q2);
          lift = LIFT * easeOutBack(qt);
          phi = lerp(PHI0 + 0.03 * Math.sin(t * 0.003), PHI_LOOK, easeInOut(ql));
          phi = lerp(phi, PHI_REACH, clamp01(kk)) + strain * 0.03 * Math.sin(t * 0.045);
        } else {
          var tau = (t - tr) / 1000;
          kk = Math.exp(-5.2 * tau) * Math.cos(TAU * 2.0 * tau);
          bendW = 0.13 * Math.exp(-4 * tau) * Math.sin(TAU * 1.6 * tau);
          lift = LIFT * Math.exp(-6 * tau) * Math.cos(TAU * 1.6 * tau);
          phi = lerp(PHI_REACH, PHI_HAPPY, easeOut(tau / 0.4)) + 0.28 * Math.exp(-4.5 * tau) * Math.sin(TAU * 2.0 * tau + 0.9) + 0.03 * Math.sin(t * 0.003);
        }
        tilt = TILT * lift / LIFT;
        var nv = kk >= 0 ? [lerp(REST_V[0], REACH_V[0], kk), lerp(REST_V[1], REACH_V[1], kk)] : [REST_V[0] * (1 + 0.42 * kk), REST_V[1] * (1 + 0.42 * kk)];
        var happy = t > ms(T.happy[0]) && t < ms(T.happy[1]);
        var smile = sinceB > 0 ? 0.3 + 0.7 * clamp01(easeOutBack(clamp01(sinceB / 260))) : 0.3;
        drawGiraffe(Lx.gx, Lx.gy, s, {
          lift: lift, tilt: tilt, nv: nv, b1: -0.05 + bendW, b2: 0.025 + bendW * 1.5, phi: phi,
          ear: earFlick(t), open: blinkAt(t, T.blink), happy: happy, smile: smile,
          lookX: stx, lookY: sty, rim: 0.55 + 0.6 * flash, rimX: stx, rimY: sty,
          tail: 0.22 + 0.12 * Math.sin(t * 0.0042) + (sinceB > 0 ? 0.3 * Math.exp(-4 * sb) * Math.sin(TAU * 2.5 * sb) : 0), shadow: true }, MAIN);

        // grass in front of the hooves
        ctx.lineCap = 'round';
        var GT = [-0.47, -0.07, 0.17, 0.53];
        for (i = 0; i < GT.length; i++) {
          var gx1 = Lx.gx + GT[i] * s, gy1 = Lx.gy + 0.03 * s;
          for (var bl = -1; bl <= 1; bl++) {
            var sw = Math.sin(t * 0.003 + i + bl) * 0.012 * s, hh = s * (0.09 - Math.abs(bl) * 0.02);
            ctx.strokeStyle = '#5C4018'; ctx.lineWidth = Math.max(1.2, s * 0.016);
            ctx.beginPath(); ctx.moveTo(gx1 + bl * 0.02 * s, gy1);
            ctx.quadraticCurveTo(gx1 + bl * 0.03 * s, gy1 - hh * 0.6, gx1 + bl * 0.05 * s + sw, gy1 - hh); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,210,130,.45)'; ctx.lineWidth = Math.max(0.6, s * 0.007);
            ctx.beginPath(); ctx.moveTo(gx1 + bl * 0.04 * s + sw * 0.6, gy1 - hh * 0.65); ctx.lineTo(gx1 + bl * 0.05 * s + sw, gy1 - hh); ctx.stroke();
          }
        }

        // 9. boop! chime rings, burst of light, sparkles
        if (sinceB > 0 && sinceB < 1100) {
          ctx.globalCompositeOperation = 'lighter';
          var fq2 = clamp01(sinceB / 520);
          if (fq2 < 1) glowDot(spr, Lx.sx, Lx.sy, s * (0.4 + 0.5 * easeOut(fq2)), 0.95 * (1 - fq2));
          for (var ri = 0; ri < 3; ri++) {
            var rq = (sinceB - ri * 110) / 640;
            if (rq <= 0 || rq >= 1) continue;
            ctx.strokeStyle = hexA(ri === 1 ? accent : '#FFF6D2', 0.8 * Math.pow(1 - rq, 1.4));
            ctx.lineWidth = (1 + 3 * (1 - rq)) * unit * 1.4 + 0.5;
            ctx.beginPath(); ctx.arc(Lx.sx, Lx.sy, Lx.sr * (1.1 + 1.9 * easeOut(rq)), 0, TAU); ctx.stroke();
          }
          var yq = clamp01(sinceB / 560);
          if (yq < 1) {
            ctx.fillStyle = 'rgba(255,246,206,' + (0.75 * (1 - yq)).toFixed(3) + ')';
            for (var ry = 0; ry < 12; ry++) {
              var ya = ry / 12 * TAU + 0.12, l0 = Lx.sr * 1.15, l1 = Lx.sr * (1.4 + 1.8 * easeOut(yq)) * (ry % 2 ? 0.7 : 1);
              ctx.beginPath(); ctx.moveTo(Lx.sx + Math.cos(ya - 0.06) * l0, Lx.sy + Math.sin(ya - 0.06) * l0);
              ctx.lineTo(Lx.sx + Math.cos(ya) * l1, Lx.sy + Math.sin(ya) * l1);
              ctx.lineTo(Lx.sx + Math.cos(ya + 0.06) * l0, Lx.sy + Math.sin(ya + 0.06) * l0); ctx.closePath(); ctx.fill();
            }
          }
          var kq = clamp01(sinceB / 700);
          if (kq < 1) {
            for (var sk = 0; sk < 10; sk++) {
              var ka = sk / 10 * TAU + 0.4, kr = Lx.sr * (1.2 + 2.0 * easeOut(kq));
              ctx.fillStyle = hexA(sk % 3 === 0 ? accent : sk % 3 === 1 ? '#FFFFFF' : glow, 1 - kq);
              sparkPath(ctx, Lx.sx + Math.cos(ka) * kr, Lx.sy + Math.sin(ka) * kr, s * 0.07 * (1 - kq * 0.5)); ctx.fill();
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // 10. praise + points
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
        back.width = back.height = 0; front.width = front.height = 0;
        spr = null; fly = null;
      };
    }
  });
})();
