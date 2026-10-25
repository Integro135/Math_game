/* success-frog-lilypad.js — מסך הצלחה: צְפַרְדַּעַת עַל עֲלֵי שׁוֹשָׁן 🐸
   צפרדעת ירוקה וחמודה (מבט צד: עין אחת, כפות קרומיות עם קצות עגולים) קופצת
   מעלה לעלה על פני בריכה כהה — אדוות בכל נחיתה — מושיטה לשון שובבה אל
   גחלילית זוהרת (לא אוכלת! הגחלילית מנצנצת ועפה משם בלולאה שמחה), ובעלה
   האחרון פורח מאחוריה פרח לוטוס ורוד גדול עם פרץ אורות גחליליות.
   בסופר: שתי צפרדעות נוספות קופצות פנימה, עוד פרחי לוטוס, וגחליליות
   מסתחררות ויוצרות לב גדול.
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
  function heartXY(a) {               // classic parametric heart, ~[-1,1] wide, y down
    var x = 16 * Math.pow(Math.sin(a), 3);
    var y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return { x: x / 16, y: y / 16 };
  }
  function rot2(px, py, cx, cy, a) {
    var c = Math.cos(a), s = Math.sin(a), dx = px - cx, dy = py - cy;
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  var MAIN = { body: '#7DD957', dark: '#3F9A3B', light: '#C4F59A', belly: '#F1FAD0', tip: '#E0FA9E', spot: '#5DB845', line: '#2E6B2C' };
  var BABY1 = { body: '#9BE56E', dark: '#4FA845', light: '#D6FAB0', belly: '#F6FCDC', tip: '#F0FFB8', spot: '#7ACB58', line: '#36773A' };
  var BABY2 = { body: '#5FD39B', dark: '#2F9466', light: '#B8F5D6', belly: '#EAFBEF', tip: '#C9FBE0', spot: '#46B884', line: '#24684A' };

  window.SUCCESS.styles.push({
    name: 'frog-lilypad',
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
      var FF = '#EEFF8A';                                 // firefly light

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

      // soft firefly glow sprite (off-DOM canvas)
      var spr = document.createElement('canvas');
      spr.width = spr.height = 64;
      var sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,220,1)'); sgr.addColorStop(0.18, hexA(FF, 0.9));
      sgr.addColorStop(0.45, hexA('#C8F060', 0.35)); sgr.addColorStop(1, 'rgba(160,230,80,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);

      // ─── timeline (ms) ───
      var T = isSuper
        ? { hops: [[0.05, 0.14], [0.16, 0.25], [0.37, 0.46]], ffIn: [0.12, 0.28], tongue: [0.28, 0.36], ffOut: 0.33,
            lotus: [0.48, 0.62], burst: 0.58, babies: [0.45, 0.55], heart: [0.66, 0.82], minis: [0.54, 0.6, 0.66] }
        : { hops: [[0.06, 0.19], [0.22, 0.35], [0.51, 0.63]], ffIn: [0.18, 0.39], tongue: [0.39, 0.49], ffOut: 0.46,
            lotus: [0.6, 0.78], burst: 0.72, babies: null, heart: null, minis: [] };
      function ms(f) { return f * dur; }

      // world: main pads at (i-3)*SP, final pad at 0 (screen centre at the end)
      var PADS = [0, 1, 2, 3];
      var landings = [{ at: 0, pad: 0, sc: 0.7 }];
      T.hops.forEach(function (h, i) { landings.push({ at: ms(lerp(h[0], h[1], 0.85)), pad: i + 1, sc: 1 }); });
      // decor pads: [world x in SP / s units, row (-1 back, 1 front), scale, lotus index or -1]
      var decor = [
        { wx: -2.45, u: 'sp', row: -1, sc: 0.5 }, { wx: -1.95, u: 's', row: -1, sc: 0.55, lotus: 1 }, { wx: 2.05, u: 's', row: -1, sc: 0.58, lotus: 2 },
        { wx: -2.5, u: 'sp', row: 1, sc: 0.66 }, { wx: -1.6, u: 's', row: 1, sc: 0.72, baby: 0 }, { wx: 1.6, u: 's', row: 1, sc: 0.72, baby: 1 },
        { wx: 1.75, u: 'sp', row: 1, sc: 0.66, lotus: 0 }
      ];
      decor.forEach(function (d) { d.rot = rnd(-0.6, 0.6); d.ph = rnd(0, TAU); });
      var mainRot = [rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(-0.4, 0.4), 0.25];
      var babies = [];
      if (isSuper) {
        babies.push({ C: BABY1, dir: 1, side: -1, t0: ms(T.babies[0]), t1: ms(T.babies[0] + 0.08) });
        babies.push({ C: BABY2, dir: -1, side: 1, t0: ms(T.babies[0] + 0.02), t1: ms(T.babies[1]) });
        babies.forEach(function (b) { landings.push({ at: lerp(b.t0, b.t1, 0.85), baby: b.side, sc: 0.75 }); });
      }

      // fireflies
      var amb = [];
      for (var a0 = 0; a0 < (isSuper ? 16 : 11); a0++)
        amb.push({ x: Math.random(), y: rnd(0.22, 0.62), ph: rnd(0, TAU), sp: rnd(0.4, 1), r: rnd(0.6, 1.1), tw: rnd(2, 5) });
      var burst = [];
      var NB = isSuper ? 36 : 22;
      for (var b0 = 0; b0 < NB; b0++) {
        var ang = -Math.PI / 2 + rnd(-1.45, 1.45);
        burst.push({ a: ang, d: rnd(1.3, 3.6), ph: rnd(0, TAU), tw: rnd(3, 7), r: rnd(0.7, 1.25), delay: rnd(0, 120), k: b0 });
      }
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.5, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });
      var streaks = [];
      for (var st = 0; st < 9; st++) streaks.push({ x: Math.random(), y: rnd(0.05, 1), w: rnd(0.04, 0.12), sp: rnd(10, 26), ph: rnd(0, TAU) });

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
      var txtAt = dur * 0.3;
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
      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function drawPad(x, y, s, sc, rot, a) {
        if (a <= 0) return;
        var rx = s * 0.8 * sc, ry = s * 0.27 * sc;
        ctx.save(); ctx.globalAlpha = a;
        // soft shadow ring on the water
        ctx.fillStyle = 'rgba(0,20,25,.35)';
        ctx.beginPath(); ctx.ellipse(x, y + ry * 0.25, rx * 1.04, ry * 1.1, 0, 0, TAU); ctx.fill();
        // pad with a notch
        var n0 = rot - 0.22, n1 = rot + 0.22;
        var g = ctx.createLinearGradient(x, y - ry, x, y + ry);
        g.addColorStop(0, '#4FB874'); g.addColorStop(1, '#1F6A45');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(n1) * rx, y + Math.sin(n1) * ry);
        ctx.ellipse(x, y, rx, ry, 0, n1, n0 + TAU);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,80,45,.8)'; ctx.lineWidth = Math.max(1, s * 0.025 * sc); ctx.stroke();
        // veins + rim light
        ctx.strokeStyle = 'rgba(200,255,210,.28)'; ctx.lineWidth = Math.max(1, s * 0.018 * sc);
        for (var v = 0; v < 7; v++) {
          var va = n1 + (v + 0.5) * (TAU - 0.44) / 7;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(va) * rx * 0.85, y + Math.sin(va) * ry * 0.85); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(210,255,200,.45)'; ctx.lineWidth = Math.max(1, s * 0.03 * sc);
        ctx.beginPath(); ctx.ellipse(x, y, rx * 0.94, ry * 0.86, 0, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
        ctx.restore();
      }
      function petal(len, wid, ang, cA, cB, a) {
        ctx.save(); ctx.rotate(ang);
        var g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, cA); g.addColorStop(0.55, mixHex(cA, cB, 0.6)); g.addColorStop(1, cB);
        ctx.fillStyle = g; ctx.globalAlpha *= a;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.3, -wid, len * 0.8, -wid * 0.7, len, 0);
        ctx.bezierCurveTo(len * 0.8, wid * 0.7, len * 0.3, wid, 0, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, wid * 0.08);
        ctx.beginPath(); ctx.moveTo(len * 0.15, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
        ctx.restore();
      }
      // lotus: o = 0 bud … 1 fully open
      function drawLotus(x, y, L, o, a) {
        if (a <= 0 || o <= 0) return;
        var rise = easeOutBack(clamp01(o / 0.3)), op = clamp01((o - 0.18) / 0.82);
        ctx.save(); ctx.translate(x, y); ctx.scale(rise, rise);
        var gl = ctx.createRadialGradient(0, -L * 0.45, 0, 0, -L * 0.45, L * 1.6);
        gl.addColorStop(0, hexA('#FFB8DA', 0.3 * op * a)); gl.addColorStop(0.5, hexA(primary, 0.1 * op * a)); gl.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -L * 0.45, L * 1.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = a;
        var layers = [
          { n: 7, spread: 1.32, len: 1.0, wid: 0.27, cA: '#D9408A', cB: '#FFD0E6', d: 0 },
          { n: 6, spread: 0.95, len: 0.88, wid: 0.27, cA: '#E9559A', cB: '#FFE2F0', d: 0.12 },
          { n: 5, spread: 0.55, len: 0.72, wid: 0.26, cA: '#F06BA8', cB: '#FFF0F7', d: 0.24 }
        ];
        layers.forEach(function (ly) {
          var e = easeOutBack(clamp01((op - ly.d) / (1 - ly.d)));
          for (var i = 0; i < ly.n; i++) {
            var k = ly.n === 1 ? 0 : (i / (ly.n - 1)) * 2 - 1;
            var angOpen = -Math.PI / 2 + k * ly.spread, angClosed = -Math.PI / 2 + k * 0.1;
            petal(L * ly.len * lerp(0.55, 1, e), L * ly.wid * lerp(0.75, 1, e), lerp(angClosed, angOpen, e), ly.cA, ly.cB, 1);
          }
        });
        // golden heart
        var cg = ctx.createRadialGradient(0, -L * 0.12, 0, 0, -L * 0.12, L * 0.3);
        cg.addColorStop(0, hexA('#FFF6B0', op)); cg.addColorStop(0.5, hexA('#FFD24A', 0.8 * op)); cg.addColorStop(1, hexA('#FFD24A', 0));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -L * 0.12, L * 0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // webbed foot: toes fanned from the ankle, web between, round toe tips
      function webFoot(ax, ay, dir, len, offs, C) {
        var tips = offs.map(function (o) { return { x: ax + Math.cos(dir + o) * len, y: ay + Math.sin(dir + o) * len, a: dir + o }; });
        ctx.fillStyle = hexA(C.body, 0.85);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tips[0].x, tips[0].y);
        for (var i = 1; i < tips.length; i++) {
          var ma = (tips[i - 1].a + tips[i].a) / 2;
          ctx.quadraticCurveTo(ax + Math.cos(ma) * len * 0.62, ay + Math.sin(ma) * len * 0.62, tips[i].x, tips[i].y);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C.dark; ctx.lineWidth = 0.065;
        tips.forEach(function (tp) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tp.x, tp.y); ctx.stroke(); });
        ctx.strokeStyle = C.body; ctx.lineWidth = 0.04;
        tips.forEach(function (tp) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tp.x, tp.y); ctx.stroke(); });
        tips.forEach(function (tp) {
          ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(tp.x, tp.y, 0.05, 0, TAU); ctx.fill();
          ctx.fillStyle = C.tip; ctx.beginPath(); ctx.arc(tp.x, tp.y, 0.036, 0, TAU); ctx.fill();
        });
      }
      function limb(pts, w, C, col) {
        ctx.strokeStyle = C.line; ctx.lineWidth = w + 0.035;
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var j = 2; j < pts.length; j += 2) ctx.lineTo(pts[j], pts[j + 1]); ctx.stroke();
      }
      function bodyPath() {
        ctx.beginPath();
        ctx.ellipse(-0.12, -0.36, 0.5, 0.33, -0.3, 0, TAU);
        ctx.moveTo(0.66, -0.58);
        ctx.ellipse(0.3, -0.58, 0.36, 0.27, -0.05, 0, TAU);
      }
      // frog in side view facing +x; local units = s; origin = between the feet on the pad
      function drawFrog(x, y, s, dir, st, C, flower) {
        var e = st.ext;
        ctx.save();
        ctx.translate(x, y); ctx.scale(dir * s * (st.sqx || 1), s * (st.sqy || 1));
        ctx.translate(-0.05, -0.4); ctx.rotate(st.rot || 0); ctx.translate(0.05, 0.4);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var hip = [-0.3, -0.3];
        var knee = [lerp(0.0, -0.72, e), lerp(-0.2, -0.24, e)];
        var ank = [lerp(-0.36, -1.08, e), lerp(-0.05, -0.12, e)];
        var fdir = lerp(0, Math.PI + 0.1, e);
        var foffs = [lerp(-0.5, -0.32, e), lerp(-0.2, 0, e), lerp(0.08, 0.32, e)];
        var sh = [0.28, -0.4], elb = [lerp(0.36, 0.56, e), lerp(-0.22, -0.46, e)], wr = [lerp(0.4, 0.8, e), lerp(-0.04, -0.42, e)];
        var hdir = lerp(0, 0.15, e);
        var hoffs = [lerp(-0.45, -0.35, e), lerp(-0.12, 0, e), lerp(0.18, 0.35, e)];
        // far-side limbs (behind the body, a touch darker)
        ctx.save(); ctx.translate(0.09, -0.03);
        var Cf = { body: C.dark, dark: C.line, tip: C.body, line: C.line };
        limb([hip[0], hip[1], knee[0], knee[1], ank[0], ank[1]], 0.13, Cf, C.dark);
        webFoot(ank[0], ank[1], fdir, 0.27, foffs, Cf);
        limb([sh[0], sh[1], elb[0], elb[1], wr[0], wr[1]], 0.09, Cf, C.dark);
        webFoot(wr[0], wr[1], hdir, 0.17, hoffs, Cf);
        ctx.restore();
        // body + head
        var g = ctx.createLinearGradient(0, -0.9, 0, 0);
        g.addColorStop(0, C.light); g.addColorStop(0.35, C.body); g.addColorStop(1, C.dark);
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.05; bodyPath(); ctx.stroke();
        ctx.fillStyle = g; bodyPath(); ctx.fill();
        ctx.save(); bodyPath(); ctx.clip();
        ctx.fillStyle = C.belly;
        ctx.beginPath(); ctx.ellipse(0.2, -0.27, 0.42, 0.2, -0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = C.spot;
        [[-0.38, -0.5, 0.06], [-0.17, -0.62, 0.045], [-0.5, -0.32, 0.04], [-0.02, -0.7, 0.035]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, TAU); ctx.fill(); });
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-0.12, -0.6, 0.2, 0.055, -0.38, 0, TAU); ctx.fill();
        ctx.restore();
        // near back leg: thigh, shin, webbed foot
        limb([hip[0], hip[1], knee[0], knee[1]], 0.3, C, C.body);
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.ellipse(lerp(hip[0], knee[0], 0.45), lerp(hip[1], knee[1], 0.45) - 0.06, 0.12, 0.035, Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), 0, TAU); ctx.fill();
        limb([knee[0], knee[1], ank[0], ank[1]], 0.14, C, C.body);
        webFoot(ank[0], ank[1], fdir, 0.3, foffs, C);
        // near front arm + hand
        limb([sh[0], sh[1], elb[0], elb[1], wr[0], wr[1]], 0.1, C, C.body);
        webFoot(wr[0], wr[1], hdir, 0.19, hoffs, C);
        // mouth: hinge J, snout M; lower jaw rotates down to open
        var J = [0.1, -0.52], ja = st.jaw || 0;
        function R(px, py) { return rot2(px, py, J[0], J[1], ja); }
        if (ja > 0.01) {
          var m1 = R(0.66, -0.56), c1 = R(0.42, -0.4), ch1 = R(0.6, -0.44), ch2 = R(0.36, -0.33);
          // lower jaw
          ctx.fillStyle = C.belly;
          ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.quadraticCurveTo(c1.x, c1.y, m1.x, m1.y);
          ctx.quadraticCurveTo(ch1.x, ch1.y, ch2.x, ch2.y); ctx.quadraticCurveTo(0.2, -0.34, J[0], J[1]); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = hexA(C.line, 0.55); ctx.lineWidth = 0.025; ctx.stroke();
          // the opening: dark throat only at the back, rosy toward the front
          var mg = ctx.createLinearGradient(J[0], J[1], 0.6, -0.52);
          mg.addColorStop(0, '#2A0818'); mg.addColorStop(0.32, '#5E1834'); mg.addColorStop(0.62, '#B23C66'); mg.addColorStop(1, '#F07A9E');
          ctx.fillStyle = mg;
          ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.quadraticCurveTo(0.4, -0.47, 0.66, -0.56);
          ctx.lineTo(m1.x, m1.y); ctx.quadraticCurveTo(c1.x, c1.y, J[0], J[1]); ctx.closePath(); ctx.fill();
          // resting tongue on the jaw floor
          if (!st.tongue) {
            var tb = R(0.36, -0.5);
            ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.ellipse(tb.x, tb.y, 0.13, 0.035, ja * 0.8, 0, TAU); ctx.fill();
          }
        }
        // upper lip / smile line
        ctx.strokeStyle = C.line; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(0.06, -0.57); ctx.quadraticCurveTo(0.07, -0.52, J[0], J[1]); ctx.quadraticCurveTo(0.4, -0.47, 0.66, -0.56); ctx.stroke();
        // playful tongue
        if (st.tongue) {
          var tg = st.tongue, base = R(0.2, -0.51);
          var mx = (base.x + tg.x) / 2, my = Math.min(base.y, tg.y) - 0.12;
          ctx.strokeStyle = '#E25C86'; ctx.lineWidth = 0.085;
          ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(mx, my, tg.x, tg.y); ctx.stroke();
          ctx.strokeStyle = '#FF8FB0'; ctx.lineWidth = 0.055;
          ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(mx, my, tg.x, tg.y); ctx.stroke();
          ctx.fillStyle = '#FF8FB0'; ctx.beginPath(); ctx.arc(tg.x, tg.y, 0.065, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(tg.x - 0.02, tg.y - 0.025, 0.02, 0, TAU); ctx.fill();
        }
        // nostril + blush
        ctx.fillStyle = C.line; ctx.beginPath(); ctx.ellipse(0.57, -0.69, 0.018, 0.012, -0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,110,150,' + (0.45 + 0.3 * (st.blush || 0)).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(0.37, -0.64, 0.08 + 0.02 * (st.blush || 0), 0.042, -0.1, 0, TAU); ctx.fill();
        // ONE eye (true side view) on top of the head
        ctx.fillStyle = C.body; ctx.beginPath(); ctx.arc(0.27, -0.83, 0.165, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(0.2, -0.93, 0.06, 0.03, -0.5, 0, TAU); ctx.fill();
        if (st.happy) {
          ctx.strokeStyle = '#1D2A18'; ctx.lineWidth = 0.035;
          ctx.beginPath(); ctx.arc(0.29, -0.8, 0.09, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
        } else {
          var bl = st.blink == null ? 1 : st.blink;
          ctx.save(); ctx.beginPath(); ctx.ellipse(0.29, -0.84, 0.125, 0.125 * Math.max(0.08, bl), 0, 0, TAU); ctx.clip();
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0.1, -1.0, 0.4, 0.4);
          var lx = (st.look || 0) * 0.025;
          ctx.fillStyle = '#1D2A18'; ctx.beginPath(); ctx.arc(0.315 + lx, -0.84 - Math.abs(lx) * 0.5, 0.088, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(0.285 + lx, -0.875, 0.032, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(0.345 + lx, -0.81, 0.015, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = C.line; ctx.lineWidth = 0.022;
          ctx.beginPath(); ctx.arc(0.29, -0.84, 0.128, Math.PI * 1.08, Math.PI * 1.9); ctx.stroke();
        }
        // two little lashes toward the back of the eye
        ctx.strokeStyle = '#1D2A18'; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.moveTo(0.18, -0.93); ctx.lineTo(0.13, -0.97); ctx.moveTo(0.22, -0.96); ctx.lineTo(0.19, -1.01); ctx.stroke();
        if (flower) {
          ctx.save(); ctx.translate(0.04, -0.84); ctx.rotate(-0.3);
          ctx.fillStyle = '#FF8EC4';
          for (var f = 0; f < 5; f++) { var fa = f / 5 * TAU; ctx.beginPath(); ctx.arc(Math.cos(fa) * 0.05, Math.sin(fa) * 0.05, 0.042, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#FFE070'; ctx.beginPath(); ctx.arc(0, 0, 0.032, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      function drawFirefly(x, y, f, t, glowA, happy) {
        glowDot(x - f * 0.7, y + f * 0.15, f * 4.2, 0.85 * glowA);
        ctx.save(); ctx.translate(x, y);
        var flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.045));
        ctx.fillStyle = 'rgba(230,245,255,.6)';
        ctx.beginPath(); ctx.ellipse(-f * 0.15, -f * 0.55, f * 0.42, f * 0.22 * flap + f * 0.05, -0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(f * 0.15, -f * 0.6, f * 0.36, f * 0.2 * flap + f * 0.05, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#F6FF9C'; ctx.beginPath(); ctx.ellipse(-f * 0.62, f * 0.12, f * 0.36, f * 0.3, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4A3A5C'; ctx.beginPath(); ctx.ellipse(-f * 0.05, 0, f * 0.36, f * 0.28, 0.1, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(f * 0.38, -f * 0.08, f * 0.25, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#4A3A5C'; ctx.lineWidth = Math.max(1, f * 0.07);
        ctx.beginPath(); ctx.moveTo(f * 0.45, -f * 0.3); ctx.quadraticCurveTo(f * 0.55, -f * 0.6, f * 0.75, -f * 0.62); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        if (happy) { ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, f * 0.06); ctx.beginPath(); ctx.arc(f * 0.46, -f * 0.06, f * 0.08, Math.PI + 0.3, TAU - 0.3); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(f * 0.47, -f * 0.1, f * 0.075, 0, TAU); ctx.fill(); }
        ctx.restore();
      }

      // ─── hop maths ───
      function hopState(q) {     // q 0..1 over one hop → pose + airborne fraction
        var st = { ext: 0, rot: 0, sqx: 1, sqy: 1, air: 0, lift: 0 };
        if (q < 0.15) { var c = Math.sin(q / 0.15 * Math.PI / 2); st.sqy = 1 - 0.14 * c; st.sqx = 1 + 0.08 * c; }
        else if (q < 0.85) {
          var a = (q - 0.15) / 0.7;
          st.air = a; st.lift = 4 * a * (1 - a);
          st.ext = a < 0.3 ? easeOut(a / 0.3) : 1 - easeInOut((a - 0.3) / 0.7);
          st.rot = lerp(-0.42, 0.3, a) * Math.sin(Math.PI * Math.min(1, a * 1.15));
        } else { var l = Math.sin((q - 0.85) / 0.15 * Math.PI); st.sqy = 1 - 0.16 * l; st.sqx = 1 + 0.1 * l; st.air = 1; }
        return st;
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var s = Math.min(W * 0.22, H * 0.165);
        var SP = s * 2.3;
        var padY = H * (W < H ? 0.7 : 0.74);
        var camFrac = clamp01(1 - (W * 0.36) / (3 * SP));
        var appear = easeOutBack(clamp01(t / 260));

        // main frog world position along the pads
        var fx = -3 * SP, fst = { ext: 0, rot: 0, sqx: 1, sqy: 1 }, lift = 0, camX = -3 * SP, padIdx = 0;
        for (var hi = 0; hi < T.hops.length; hi++) {
          var h0 = ms(T.hops[hi][0]), h1 = ms(T.hops[hi][1]);
          var xa = (hi - 3) * SP, xb = (hi - 2) * SP;
          if (t >= h1) { fx = xb; camX = xb; padIdx = hi + 1; continue; }
          if (t > h0) {
            var q = (t - h0) / (h1 - h0);
            fst = hopState(q); lift = fst.lift;
            fx = lerp(xa, xb, fst.air); camX = lerp(xa, xb, easeInOut(q));
          }
          break;
        }
        var cam = camFrac * camX;
        function sx(wx) { return W / 2 + wx - cam; }
        function padDip(pad, baby) {
          var d = 0;
          for (var i = 0; i < landings.length; i++) {
            var L = landings[i];
            if ((pad != null && L.pad !== pad) || (baby != null && L.baby !== baby)) continue;
            var dt = t - L.at; if (dt > 0) d += Math.sin(dt * 0.02) * Math.exp(-dt * 0.006) * 0.07 * s;
          }
          return d;
        }

        // background stars
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // dark pond: translucent band, fades in at the top edge — no opaque backdrop
        var pondTop = padY - s * 1.5;
        var pg = ctx.createLinearGradient(0, pondTop, 0, H);
        pg.addColorStop(0, 'rgba(10,50,70,0)'); pg.addColorStop(0.3, 'rgba(10,52,72,.32)'); pg.addColorStop(1, 'rgba(6,34,52,.55)');
        ctx.fillStyle = pg; ctx.fillRect(0, pondTop, W, H - pondTop);
        for (var si = 0; si < streaks.length; si++) {
          var sk = streaks[si], syy = lerp(pondTop + s * 0.4, H, sk.y);
          var sxx = ((sk.x * W + t * 0.001 * sk.sp * unit * 10 - cam * 0.3) % (W + 200) + W + 200) % (W + 200) - 100;
          ctx.strokeStyle = hexA(glow, 0.12 + 0.08 * Math.sin(t * 0.003 + sk.ph)); ctx.lineWidth = 2 * unit;
          ctx.beginPath(); ctx.moveTo(sxx, syy); ctx.lineTo(sxx + sk.w * W, syy); ctx.stroke();
        }
        // ambient fireflies
        for (var ai = 0; ai < amb.length; ai++) {
          var af = amb[ai], ax = ((af.x * W + Math.sin(t * 0.0008 * af.sp + af.ph) * 60 * unit - cam * 0.2) % W + W) % W;
          var ay = af.y * H + Math.cos(t * 0.0011 * af.sp + af.ph) * 30 * unit;
          var tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.001 * af.tw + af.ph));
          glowDot(ax, ay, 16 * unit * af.r * tw + 4, 0.9 * appear);
        }

        // ripples (in world space)
        function ripple(wx, wy, at, sc) {
          var dt = (t - at) / 1000;
          for (var r = 0; r < 3; r++) {
            var d = dt - r * 0.13; if (d <= 0 || d > 0.9) continue;
            var rr = s * sc * (0.95 + d * 1.9), al = (1 - d / 0.9) * 0.55;
            ctx.strokeStyle = 'rgba(190,235,255,' + al.toFixed(3) + ')'; ctx.lineWidth = Math.max(1, 2.4 * unit * (1 - d));
            ctx.beginPath(); ctx.ellipse(sx(wx), wy, rr, rr * 0.3, 0, 0, TAU); ctx.stroke();
          }
          // a few droplets
          if (dt > 0 && dt < 0.5) {
            ctx.fillStyle = 'rgba(200,240,255,' + (0.8 * (1 - dt / 0.5)).toFixed(3) + ')';
            for (var dd = 0; dd < 6; dd++) {
              var da = (dd / 6) * Math.PI + 0.25, sp = s * sc * (1.5 + (dd % 3) * 0.4);
              ctx.beginPath(); ctx.arc(sx(wx) + Math.cos(da) * sp * dt * 1.4 * (dd % 2 ? 1 : -1), wy - sp * dt * 2.2 + 9 * s * dt * dt, Math.max(1, s * 0.03 * sc), 0, TAU); ctx.fill();
            }
          }
        }
        function decorX(d) { return d.u === 'sp' ? d.wx * SP : d.wx * s; }
        function lotusOpen(idx) {
          if (!isSuper || idx == null || T.minis[idx] == null) return 0;
          return clamp01((t - ms(T.minis[idx])) / (dur * 0.12));
        }
        // back row pads (+ mini lotuses)
        decor.forEach(function (d) {
          if (d.row !== -1) return;
          var wy = padY - s * 0.8 + Math.sin(t * 0.002 + d.ph) * s * 0.015;
          drawPad(sx(decorX(d)), wy, s, d.sc, d.rot, appear);
          if (d.lotus != null) drawLotus(sx(decorX(d)), wy - s * 0.04, s * 0.62, lotusOpen(d.lotus), 1);
        });
        // main pads
        for (var pi = 0; pi < PADS.length; pi++) {
          var sc = pi === 3 ? 1.18 : 1;
          var pwy = padY + padDip(pi) + Math.sin(t * 0.002 + pi) * s * 0.012;
          drawPad(sx((pi - 3) * SP), pwy, s, sc, mainRot[pi], appear);
        }
        landings.forEach(function (L) {
          if (L.pad != null) ripple((L.pad - 3) * SP, padY, L.at, L.pad === 3 ? 1.18 : 1);
        });
        // the big lotus behind the final pad's frog
        var lo = clamp01((t - ms(T.lotus[0])) / (ms(T.lotus[1]) - ms(T.lotus[0])));
        if (lo > 0) {
          // reflection on the water
          ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(0, padY * 2 + s * 0.2); ctx.scale(1, -0.45);
          drawLotus(sx(0), padY, s * 1.32 * (isSuper ? 1.08 : 1), lo, 1);
          ctx.restore();
          drawLotus(sx(0), padY - s * 0.12 + padDip(3) * 0.5, s * 1.32 * (isSuper ? 1.08 : 1), lo, 1);
        }

        // ─── the caught firefly ───
        var tg0 = ms(T.tongue[0]), tg1 = ms(T.tongue[1]), boop = lerp(tg0, tg1, 0.4);
        var p2x = -1 * SP, mouthY = padY - s * 0.56;
        var HPx = p2x + s * 1.55, HPy = padY - s * 1.05;
        var ffX = null, ffY = 0, ffHappy = false, tongueLocal = null, jaw = 0, frogHappy = false, look = 0;
        var fi0 = ms(T.ffIn[0]);
        if (t > fi0 && t < ms(T.ffOut) + 800) {
          if (t < tg0) {
            var aq = easeInOut((t - fi0) / (tg0 - fi0));
            ffX = lerp(p2x + s * 4.2, HPx, aq) + Math.sin(aq * 9) * s * 0.35 * (1 - aq);
            ffY = lerp(padY - s * 3.4, HPy, aq) + Math.cos(aq * 7) * s * 0.25 * (1 - aq);
            look = 1;
          } else if (t < boop + 120) {
            ffX = HPx + Math.sin(t * 0.02) * s * 0.03; ffY = HPy + Math.sin(t * 0.013) * s * 0.05; look = 1;
          } else {
            var oq = clamp01((t - boop - 120) / 800);
            var th = Math.PI / 2 - oq * TAU * 1.1;
            ffX = HPx + s * 0.45 + Math.cos(th) * s * 0.45 + oq * s * 2.4;
            ffY = HPy - s * 0.45 + Math.sin(th) * s * 0.45 - oq * oq * s * 2.6;
            ffHappy = true;
          }
          // tongue + jaw
          if (t > tg0 && t < tg1) {
            var tq = (t - tg0) / (tg1 - tg0);
            jaw = 0.42 * Math.sin(Math.PI * clamp01(tq * 1.15));
            var ext = tq < 0.4 ? easeOut(tq / 0.4) : tq < 0.55 ? 1 : 1 - easeInOut((tq - 0.55) / 0.45);
            if (ext > 0.02) {
              var fsx = sx(p2x), fsy = padY + padDip(2);
              var tx = (HPx - s * 0.12 - p2x) / s, ty = (HPy + s * 0.18 - fsy) / s;
              var bx = 0.3, by = -0.5;
              tongueLocal = { x: lerp(bx, tx, ext), y: lerp(by, ty, ext) };
            }
          }
          if (t > boop && t < boop + 650) frogHappy = true;
        }

        // ─── main frog ───
        var frogSX = sx(fx), frogSY = padY + (padIdx < 4 && lift === 0 ? padDip(padIdx) : 0) - lift * s * 1.05;
        var blinkQ = (t - dur * 0.18) / 150, blink = blinkQ > 0 && blinkQ < 1 ? Math.abs(Math.cos(blinkQ * Math.PI)) : 1;
        var endHappy = t > ms(T.lotus[0]) + 200;
        var bounce = endHappy ? Math.abs(Math.sin((t - ms(T.lotus[0])) * 0.008)) * s * 0.06 * (t < ms(T.lotus[1]) ? 1 : 0.5) : 0;
        var popA = appear;
        ctx.save();
        if (popA < 1) { ctx.translate(frogSX, frogSY); ctx.scale(popA, popA); ctx.translate(-frogSX, -frogSY); }
        drawFrog(frogSX, frogSY - bounce, s, 1, {
          ext: fst.ext, rot: fst.rot, sqx: fst.sqx, sqy: fst.sqy, jaw: endHappy ? 0.22 : jaw, tongue: tongueLocal,
          happy: frogHappy || endHappy, blink: blink, look: look, blush: frogHappy || endHappy ? 1 : 0
        }, MAIN, true);
        ctx.restore();

        // the firefly + its boop sparkle
        if (ffX !== null) {
          var ffA = 1 - clamp01((t - boop - 700) / 250);
          ctx.save(); ctx.globalAlpha = ffA;
          drawFirefly(sx(ffX), ffY, s * 0.2 * (t > boop && t < boop + 160 ? 1.25 : 1), t, 1, ffHappy);
          ctx.restore();
          var bq = (t - boop) / 520;
          if (bq > 0 && bq < 1) {
            ctx.globalCompositeOperation = 'lighter';
            for (var bk = 0; bk < 10; bk++) {
              var ba = bk / 10 * TAU, br = s * (0.2 + bq * 0.75);
              ctx.fillStyle = hexA(bk % 2 ? FF : accent, 1 - bq);
              sparkPath(ctx, sx(HPx) + Math.cos(ba) * br, HPy + Math.sin(ba) * br, s * 0.07 * (1 - bq * 0.5)); ctx.fill();
            }
            ctx.strokeStyle = hexA(FF, 0.6 * (1 - bq)); ctx.lineWidth = 2 * unit;
            ctx.beginPath(); ctx.arc(sx(HPx), HPy, s * (0.15 + bq * 0.55), 0, TAU); ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
        }

        // front row pads + super baby frogs
        decor.forEach(function (d) {
          if (d.row !== 1) return;
          var dy = padY + s * 0.55 + (d.baby != null ? padDip(null, d.baby === 0 ? -1 : 1) : 0) + Math.sin(t * 0.002 + d.ph) * s * 0.015;
          drawPad(sx(decorX(d)), dy, s, d.sc, d.rot, appear);
          if (d.lotus != null) drawLotus(sx(decorX(d)), dy - s * 0.04, s * 0.7, lotusOpen(d.lotus), 1);
        });
        babies.forEach(function (b) {
          var tx2 = b.side * 1.6 * s, ty2 = padY + s * 0.55;
          if (t > b.t1 - 1) ripple(tx2, ty2, lerp(b.t0, b.t1, 0.85), 0.72);
          if (t <= b.t0) return;
          var q = clamp01((t - b.t0) / (b.t1 - b.t0));
          var hs = q < 1 ? hopState(q) : { ext: 0, rot: 0, sqx: 1, sqy: 1, air: 1, lift: 0 };
          var startX = b.side * (W / 2 + s * 0.9) + cam;
          var bx2 = lerp(startX, tx2, hs.air), by2 = ty2 - hs.lift * s * 1.4 + (q >= 1 ? padDip(null, b.side) : 0);
          var bb = q >= 1 ? Math.abs(Math.sin((t - b.t1) * 0.009 + b.side)) * s * 0.05 : 0;
          drawFrog(sx(bx2), by2 - bb, s * 0.68, b.dir, {
            ext: hs.ext, rot: hs.rot, sqx: hs.sqx, sqy: hs.sqy, jaw: q >= 1 ? 0.2 : 0, happy: q >= 1 && t > b.t1 + 150, blush: 1
          }, b.C, false);
        });

        // ─── firefly burst from the lotus (super: swirl into a heart) ───
        var tb = ms(T.burst);
        if (t > tb) {
          var cx0 = sx(0), cy0 = padY - s * 1.0;
          var hcx = W / 2, hcy = H * 0.43, hs2 = Math.min(W * 0.3, H * 0.16);
          var hq0 = T.heart ? clamp01((t - ms(T.heart[0])) / (ms(T.heart[1]) - ms(T.heart[0]))) : 0;
          var he = easeInOut(hq0);
          var pulse = 1 + (hq0 >= 1 ? 0.06 * Math.sin((t - ms(T.heart[1])) * 0.012) : 0);
          if (hq0 > 0.6) {
            var hg = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, hs2 * 1.5);
            hg.addColorStop(0, hexA('#FF8FC0', 0.22 * (hq0 - 0.6) / 0.4)); hg.addColorStop(1, hexA('#FF8FC0', 0));
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hcx, hcy, hs2 * 1.5, 0, TAU); ctx.fill();
          }
          for (var fb = 0; fb < burst.length; fb++) {
            var B = burst[fb], bt = (t - tb - B.delay) / 1000;
            if (bt <= 0) continue;
            var e2 = easeOut(bt / 0.7);
            var px = cx0 + Math.cos(B.a) * B.d * s * e2 + Math.sin(bt * 2 + B.ph) * s * 0.18;
            var py = cy0 + Math.sin(B.a) * B.d * s * 0.8 * e2 + Math.cos(bt * 1.7 + B.ph) * s * 0.14;
            if (he > 0) {
              var hp = heartXY(B.k / burst.length * TAU);
              var spin = (1 - he) * 2.6;
              var tgt = rot2(hcx + hp.x * hs2 * pulse, hcy + hp.y * hs2 * pulse, hcx, hcy, spin);
              px = lerp(px, tgt.x, he); py = lerp(py, tgt.y, he);
            }
            var twk = 0.55 + 0.45 * Math.sin(bt * B.tw + B.ph);
            var ra = clamp01(bt * 6);
            glowDot(px, py, (14 + 8 * twk) * unit * B.r * (he > 0.9 ? 1.15 : 1) + 3, ra * (0.75 + 0.25 * twk));
            ctx.fillStyle = 'rgba(255,255,235,' + (0.9 * ra).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(px, py, Math.max(1.2, 2.4 * unit * B.r), 0, TAU); ctx.fill();
          }
          // a soft flash as the lotus opens its heart
          var fq = (t - tb) / 450;
          if (fq > 0 && fq < 1) {
            var fg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, s * 2.4);
            fg.addColorStop(0, hexA('#FFF4C0', 0.5 * (1 - fq))); fg.addColorStop(1, hexA('#FFF4C0', 0));
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx0, cy0, s * 2.4, 0, TAU); ctx.fill();
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
        spr = null;
      };
    }
  });
})();
