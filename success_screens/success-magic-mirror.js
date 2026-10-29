/* success-magic-mirror.js — מסך הצלחה: מַרְאָה קְסוּמָה 🪞
   מראת יד זהובה ומקושטת (זכוכית סגלגלה, מסגרת מסולסלת ואבני חן צבעוניות)
   מרחפת פנימה, ברק מבריק חולף לאורך הזכוכית, ובתוך ההשתקפות מופיע פרצוף
   סמיילי גדול ומאושר עם כתר זהב (קורץ!) — ונצנצים עפים החוצה מהמסגרת.
   בסופר: המראה מסתובבת סיבוב שלם סביב עצמה, אבני החן נדלקות אחת אחרי השנייה
   בסדר הקשת, ושלוש טבעות של כוכבים מתפרצות מהמראה החוצה.
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
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  var GEMS = ['#FF4F6D', '#FF9A3C', '#FFD93D', '#5EDB6A', '#3FC6F2', '#6B7BFF', '#B86BFF', '#FF6FC0'];
  var GOLD_HI = '#FFF2B0', GOLD = '#F2C04A', GOLD_MID = '#D99A22', GOLD_DK = '#8A5A10';
  // frame gem angles (around the oval, top = -PI/2) — top crest gem is separate
  var GEM_ANG = [];
  for (var gi = 0; gi < 8; gi++) GEM_ANG.push(-Math.PI / 2 + (gi + 0.5) * TAU / 8);

  window.SUCCESS.styles.push({
    name: 'magic-mirror',
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

      // soft glow sprite (off-DOM canvas)
      var spr = document.createElement('canvas');
      spr.width = spr.height = 64;
      var sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,240,1)'); sgr.addColorStop(0.2, 'rgba(255,240,200,.75)');
      sgr.addColorStop(0.5, 'rgba(255,220,150,.22)'); sgr.addColorStop(1, 'rgba(255,220,150,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { inn: [0, 0.14], spin: [0.15, 0.33], shine: [0.33, 0.47], face: [0.38, 0.47], wink: 0.62, fly: 0.44, txt: 0.3,
            gems: [0.42, 0.62], rings: [0.6, 0.69, 0.78] }
        : { inn: [0, 0.22], spin: null, shine: [0.2, 0.42], face: [0.34, 0.48], wink: 0.7, fly: 0.42, txt: 0.3,
            gems: null, rings: [] };
      function ms(f) { return f * dur; }

      // sparkles flying out of the frame
      var flyers = [];
      var NF = isSuper ? 46 : 30;
      for (var f0 = 0; f0 < NF; f0++) {
        flyers.push({ a: rnd(0, TAU), d: rnd(1.2, 3.2), delay: rnd(0, isSuper ? 900 : 650), r: rnd(0.6, 1.3), ph: rnd(0, TAU),
                      tw: rnd(5, 11), col: f0 % 3 === 0 ? accent : f0 % 3 === 1 ? '#FFFFFF' : (f0 % 2 ? glow : primary), star: f0 % 4 === 0 });
      }
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random(), tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
          'position:absolute;left:50%;top:calc(12% + ' + (isSuper ? '9.5%' : '8%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers (mirror local units: 1 = s, glass centre = 0,0) ───
      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        ctx.globalAlpha = a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      function goldStroke(w) {
        ctx.strokeStyle = GOLD_DK; ctx.lineWidth = w + 0.03; ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = w; ctx.stroke();
        ctx.strokeStyle = hexA(GOLD_HI, 0.8); ctx.lineWidth = w * 0.35; ctx.stroke();
      }
      // a curly scroll: spiral of ~1.3 turns, dir = +1 / -1 handedness
      function curl(x, y, r, a0, dir, w) {
        ctx.beginPath();
        for (var i = 0; i <= 26; i++) {
          var u = i / 26, a = a0 + dir * u * TAU * 1.3, rr = r * (1 - u * 0.78);
          var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        goldStroke(w);
        ctx.fillStyle = GOLD_HI;
        var ae = a0 + dir * TAU * 1.3, re = r * 0.22;
        ctx.beginPath(); ctx.arc(x + Math.cos(ae) * re, y + Math.sin(ae) * re, w * 0.75, 0, TAU); ctx.fill();
      }
      function gem(x, y, r, col, lit, tt) {
        if (lit > 0) {
          var lg = ctx.createRadialGradient(x, y, 0, x, y, r * 4.2);
          lg.addColorStop(0, hexA(mixHex(col, '#FFFFFF', 0.5), 0.95 * lit)); lg.addColorStop(0.35, hexA(col, 0.55 * lit)); lg.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r * 4.2, 0, TAU); ctx.fill();
        }
        // gold bezel
        ctx.fillStyle = GOLD_DK; ctx.beginPath(); ctx.arc(x, y, r * 1.32, 0, TAU); ctx.fill();
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x, y, r * 1.18, 0, TAU); ctx.fill();
        var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
        g.addColorStop(0, mixHex(col, '#FFFFFF', 0.65 + 0.3 * lit)); g.addColorStop(0.45, mixHex(col, '#FFFFFF', 0.25 * lit)); g.addColorStop(1, mixHex(col, '#000000', 0.35 - 0.2 * lit));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        // facets
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = r * 0.12;
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.1); ctx.lineTo(x, y - r * 0.55); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.38, r * 0.22, r * 0.13, -0.6, 0, TAU); ctx.fill();
        if (tt > 0) {          // a tiny glint cross
          ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * tt).toFixed(3) + ')';
          sparkPath(ctx, x + r * 0.4, y - r * 0.45, r * 1.5 * tt); ctx.fill();
        }
      }
      function heartPath(x, y, r) {
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
        ctx.bezierCurveTo(x - r * 1.3, y + r * 0.05, x - r * 0.75, y - r * 1.0, x, y - r * 0.38);
        ctx.bezierCurveTo(x + r * 0.75, y - r * 1.0, x + r * 1.3, y + r * 0.05, x, y + r * 0.9);
        ctx.closePath();
      }
      function crown(x, y, w, h) {       // crown sitting on (x, y) = band bottom centre
        var g = ctx.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, GOLD_HI); g.addColorStop(0.5, GOLD); g.addColorStop(1, GOLD_MID);
        ctx.fillStyle = g; ctx.strokeStyle = GOLD_DK; ctx.lineWidth = w * 0.04;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x - w / 2, y - h * 0.45);
        ctx.lineTo(x - w * 0.5, y - h * 0.95); ctx.lineTo(x - w * 0.25, y - h * 0.55);
        ctx.lineTo(x, y - h * 1.1); ctx.lineTo(x + w * 0.25, y - h * 0.55);
        ctx.lineTo(x + w * 0.5, y - h * 0.95); ctx.lineTo(x + w / 2, y - h * 0.45);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // band
        ctx.fillStyle = GOLD_MID; ctx.fillRect(x - w / 2, y - h * 0.28, w, h * 0.28);
        ctx.strokeRect(x - w / 2, y - h * 0.28, w, h * 0.28);
        // balls on tips + jewels
        [[-0.5, 0.95], [0, 1.1], [0.5, 0.95]].forEach(function (p) {
          ctx.fillStyle = '#FFF6D0'; ctx.beginPath(); ctx.arc(x + w * p[0], y - h * p[1], w * 0.06, 0, TAU); ctx.fill();
        });
        [[-0.3, '#FF4F6D'], [0, '#3FC6F2'], [0.3, '#5EDB6A']].forEach(function (p) {
          ctx.fillStyle = p[1]; ctx.beginPath(); ctx.arc(x + w * p[0], y - h * 0.14, w * 0.055, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x + w * p[0] - w * 0.018, y - h * 0.17, w * 0.018, 0, TAU); ctx.fill();
        });
      }
      // the reflected smiley (facing the viewer → two eyes), local units inside the glass
      function smiley(sc, wink, bounce, twT) {
        if (sc <= 0) return;
        ctx.save(); ctx.translate(0, 0.14 - bounce); ctx.scale(sc * 1.22, sc * 1.22);
        var R = 0.36;
        var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
        hg.addColorStop(0, 'rgba(255,240,170,.55)'); hg.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, TAU); ctx.fill();
        var fg = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
        fg.addColorStop(0, '#FFF6B8'); fg.addColorStop(0.6, '#FFD84A'); fg.addColorStop(1, '#F2A92A');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#C9801A'; ctx.lineWidth = 0.02; ctx.stroke();
        // blush
        ctx.fillStyle = 'rgba(255,110,140,.5)';
        ctx.beginPath(); ctx.ellipse(-R * 0.6, R * 0.2, R * 0.17, R * 0.1, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(R * 0.6, R * 0.2, R * 0.17, R * 0.1, 0, 0, TAU); ctx.fill();
        // eyes (left one may wink)
        ctx.lineCap = 'round';
        [-1, 1].forEach(function (side) {
          var ex = side * R * 0.36, ey = -R * 0.18;
          if (side === -1 && wink > 0.5) {
            ctx.strokeStyle = '#3A2410'; ctx.lineWidth = 0.035;
            ctx.beginPath(); ctx.arc(ex, ey + R * 0.04, R * 0.13, Math.PI + 0.35, TAU - 0.35); ctx.stroke();
            return;
          }
          ctx.fillStyle = '#3A2410'; ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.12, R * 0.16, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(ex - R * 0.04, ey - R * 0.06, R * 0.05, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(ex + R * 0.04, ey + R * 0.06, R * 0.022, 0, TAU); ctx.fill();
        });
        // big closed smile with dimples
        ctx.strokeStyle = '#3A2410'; ctx.lineWidth = 0.038;
        ctx.beginPath(); ctx.arc(0, R * 0.08, R * 0.46, 0.32, Math.PI - 0.32); ctx.stroke();
        ctx.lineWidth = 0.026;
        ctx.beginPath(); ctx.arc(Math.cos(0.32) * R * 0.46 + R * 0.04, R * 0.08 + Math.sin(0.32) * R * 0.46 - R * 0.02, R * 0.07, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(-Math.cos(0.32) * R * 0.46 - R * 0.04, R * 0.08 + Math.sin(0.32) * R * 0.46 - R * 0.02, R * 0.07, Math.PI * 1.4, Math.PI * 2.1); ctx.stroke();
        // crown on top
        crown(0, -R * 0.82, R * 1.15, R * 0.62);
        // sparkles twinkling around the face
        for (var k = 0; k < 5; k++) {
          var ka = k * 1.31 + 0.4, tw = Math.sin(twT * 0.008 + k * 2.1);
          if (tw <= 0) continue;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * tw).toFixed(3) + ')';
          sparkPath(ctx, Math.cos(ka) * R * 1.3, Math.sin(ka) * R * 1.15, 0.07 * tw); ctx.fill();
        }
        ctx.restore();
      }
      // the whole hand mirror: front (glass) or back (gold plate)
      function drawMirror(st) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // handle
        var hgr = ctx.createLinearGradient(-0.1, 0, 0.1, 0);
        hgr.addColorStop(0, GOLD_MID); hgr.addColorStop(0.4, GOLD_HI); hgr.addColorStop(1, GOLD_DK);
        ctx.fillStyle = hgr; ctx.strokeStyle = GOLD_DK; ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.moveTo(-0.075, 0.96); ctx.bezierCurveTo(-0.05, 1.2, -0.085, 1.45, -0.06, 1.66);
        ctx.lineTo(0.06, 1.66); ctx.bezierCurveTo(0.085, 1.45, 0.05, 1.2, 0.075, 0.96); ctx.closePath();
        ctx.fill(); ctx.stroke();
        [[1.02, 0.11], [1.36, 0.08], [1.72, 0.12]].forEach(function (k) {
          var kg = ctx.createRadialGradient(-k[1] * 0.35, k[0] - k[1] * 0.35, 0, 0, k[0], k[1]);
          kg.addColorStop(0, GOLD_HI); kg.addColorStop(0.6, GOLD); kg.addColorStop(1, GOLD_MID);
          ctx.fillStyle = kg; ctx.beginPath(); ctx.ellipse(0, k[0], k[1], k[1] * 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
        });
        gem(0, 1.72, 0.05, GEMS[7], st.gemLit ? st.gemLit[8] : 0, 0);
        // curls where the handle meets the frame
        curl(-0.17, 0.98, 0.13, -0.3, -1, 0.045);
        curl(0.17, 0.98, 0.13, Math.PI + 0.3, 1, 0.045);
        // side curls + top crest scrolls
        curl(-0.82, 0.05, 0.13, -Math.PI / 2, -1, 0.04);
        curl(0.82, 0.05, 0.13, -Math.PI / 2, 1, 0.04);
        curl(-0.24, -0.98, 0.15, 0.2, 1, 0.045);
        curl(0.24, -0.98, 0.15, Math.PI - 0.2, -1, 0.045);

        if (!st.back) {
          // glass
          var gg = ctx.createRadialGradient(-0.15, -0.25, 0.05, 0, 0, 0.85);
          gg.addColorStop(0, hexA(mixHex(glow, '#FFFFFF', 0.55), 0.85));
          gg.addColorStop(0.55, hexA(mixHex(primary, glow, 0.4), 0.7));
          gg.addColorStop(1, hexA(mixHex(primary, '#140A2A', 0.55), 0.92));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, 0, 0.64, 0.82, 0, 0, TAU); ctx.fill();
          ctx.save();
          ctx.beginPath(); ctx.ellipse(0, 0, 0.64, 0.82, 0, 0, TAU); ctx.clip();
          // dreamy inner glow
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          ctx.beginPath(); ctx.ellipse(-0.18, -0.35, 0.3, 0.16, -0.6, 0, TAU); ctx.fill();
          smiley(st.face, st.wink, st.faceBob, st.t);
          // the sweeping shine
          if (st.shine > 0 && st.shine < 1) {
            var sx0 = lerp(-1.3, 1.3, st.shine);
            ctx.save(); ctx.rotate(0.5);
            var sh = ctx.createLinearGradient(sx0 - 0.3, 0, sx0 + 0.3, 0);
            sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,.55)');
            sh.addColorStop(0.5, 'rgba(255,255,255,.85)'); sh.addColorStop(0.55, 'rgba(255,255,255,.55)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = sh; ctx.fillRect(sx0 - 0.3, -1.5, 0.6, 3);
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx0 + 0.28, -1.5, 0.06, 3);
            ctx.restore();
          }
          ctx.restore();
          // static highlight arcs on the glass
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.035;
          ctx.beginPath(); ctx.ellipse(0, 0, 0.54, 0.72, 0, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
          ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.ellipse(0, 0, 0.54, 0.72, 0, Math.PI * 1.42, Math.PI * 1.5); ctx.stroke();
        } else {
          // back: embossed gold plate with a heart
          var bg = ctx.createRadialGradient(-0.2, -0.3, 0.05, 0, 0, 0.85);
          bg.addColorStop(0, GOLD_HI); bg.addColorStop(0.5, GOLD); bg.addColorStop(1, GOLD_MID);
          ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 0.64, 0.82, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = hexA(primary, 0.85); heartPath(0, 0, 0.3); ctx.fill();
          ctx.strokeStyle = GOLD_DK; ctx.lineWidth = 0.025; ctx.stroke();
          ctx.strokeStyle = hexA(GOLD_DK, 0.6); ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.ellipse(0, 0, 0.5, 0.68, 0, 0, TAU); ctx.stroke();
        }
        // frame ring
        ctx.beginPath(); ctx.ellipse(0, 0, 0.7, 0.88, 0, 0, TAU);
        ctx.strokeStyle = GOLD_DK; ctx.lineWidth = 0.15; ctx.stroke();
        var fr = ctx.createLinearGradient(-0.7, -0.88, 0.7, 0.88);
        fr.addColorStop(0, GOLD_HI); fr.addColorStop(0.35, GOLD); fr.addColorStop(0.7, GOLD_MID); fr.addColorStop(1, GOLD);
        ctx.strokeStyle = fr; ctx.lineWidth = 0.12; ctx.stroke();
        ctx.strokeStyle = hexA(GOLD_HI, 0.75); ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.ellipse(0, 0, 0.665, 0.845, 0, Math.PI * 0.95, Math.PI * 1.7); ctx.stroke();
        // bead row on the frame
        ctx.fillStyle = hexA(GOLD_HI, 0.9);
        for (var b = 0; b < 40; b++) {
          var ba = b / 40 * TAU;
          ctx.beginPath(); ctx.arc(Math.cos(ba) * 0.745, Math.sin(ba) * 0.935, 0.014, 0, TAU); ctx.fill();
        }
        // gems on the ring
        for (var g = 0; g < GEM_ANG.length; g++) {
          var a = GEM_ANG[g];
          var tw = 0.5 + 0.5 * Math.sin(st.t * 0.006 + g * 1.7);
          gem(Math.cos(a) * 0.7, Math.sin(a) * 0.88, 0.058, GEMS[g], st.gemLit ? st.gemLit[g] : 0, tw > 0.93 ? (tw - 0.93) / 0.07 : 0);
        }
        // crest: heart gem on top
        var lit9 = st.gemLit ? st.gemLit[9] : 0;
        if (lit9 > 0) glowDot(0, -1.0, 0.4, 0.5 + 0.4 * lit9);
        ctx.fillStyle = GOLD_DK; heartPath(0, -1.0, 0.15); ctx.fill();
        ctx.fillStyle = GOLD; heartPath(0, -1.0, 0.13); ctx.fill();
        var hgm = ctx.createRadialGradient(-0.04, -1.05, 0.01, 0, -1.0, 0.12);
        hgm.addColorStop(0, '#FFD0E0'); hgm.addColorStop(0.5, mixHex('#FF4F8A', '#FFFFFF', 0.25 * lit9)); hgm.addColorStop(1, '#B0185A');
        ctx.fillStyle = hgm; heartPath(0, -0.995, 0.1); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-0.04, -1.03, 0.025, 0.014, -0.6, 0, TAU); ctx.fill();
      }

      var raf = 0, killed = false, t0 = performance.now();
      var gemLit = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);

        var s = Math.min(W * 0.3, H * 0.205);
        var cx = W / 2, cy = H * 0.5 + s * 0.12;

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.65 * k * clamp01(t / 300));
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }

        // float in from below, with a damped tilt
        var qi = clamp01((t - ms(T.inn[0])) / (ms(T.inn[1]) - ms(T.inn[0])));
        var my = lerp(H + s * 1.2, cy, easeOutBack(qi));
        var tilt = -0.35 * (1 - qi) + (qi >= 1 ? 0.05 * Math.sin((t - ms(T.inn[1])) * 0.0035) * Math.exp(-(t - ms(T.inn[1])) * 0.0008) : 0);
        var bob = Math.sin(t * 0.003) * s * 0.035;
        my += bob;

        // super: one full spin around the vertical axis
        var spinK = 1, back = false;
        if (T.spin) {
          var sq = clamp01((t - ms(T.spin[0])) / (ms(T.spin[1]) - ms(T.spin[0])));
          var ph = easeInOut(sq) * TAU;
          spinK = Math.cos(ph); back = spinK < 0;
        }

        // halo behind the mirror
        var haloA = 0.55 * easeOut(qi) * (0.85 + 0.15 * Math.sin(t * 0.005));
        var hg = ctx.createRadialGradient(cx, my, s * 0.3, cx, my, s * 1.9);
        hg.addColorStop(0, hexA(glow, 0.35 * haloA)); hg.addColorStop(0.5, hexA(primary, 0.16 * haloA)); hg.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, my, s * 1.9, 0, TAU); ctx.fill();

        // super: gems light in rainbow order, then all pulse together
        if (T.gems) {
          var g0 = ms(T.gems[0]), gstep = (ms(T.gems[1]) - g0) / 10;
          for (var gi2 = 0; gi2 < 10; gi2++) {
            var lt = (t - g0 - gi2 * gstep) / 160;
            gemLit[gi2] = lt <= 0 ? 0 : lt < 1 ? easeOut(lt) : 0.7 + 0.3 * Math.sin((t - g0 - gi2 * gstep) * 0.01);
          }
        }

        var face = easeOutBack(clamp01((t - ms(T.face[0])) / (ms(T.face[1]) - ms(T.face[0]))));
        var wq = (t - ms(T.wink)) / 380;
        var wink = wq > 0 && wq < 1 ? 1 : 0;
        var faceBob = face >= 1 ? Math.abs(Math.sin((t - ms(T.face[1])) * 0.007)) * 0.03 : 0;
        var shine = (t - ms(T.shine[0])) / (ms(T.shine[1]) - ms(T.shine[0]));

        ctx.save();
        ctx.translate(cx, my); ctx.rotate(tilt);
        ctx.scale(s * Math.max(0.04, Math.abs(spinK)), s);
        drawMirror({ t: t, back: back, face: back ? 0 : face, wink: wink, faceBob: faceBob, shine: back ? -1 : shine, gemLit: T.gems ? gemLit : null });
        ctx.restore();

        // shine-end glint at the top-right of the frame
        var gq = (t - ms(T.shine[1]) + 60) / 420;
        if (gq > 0 && gq < 1) {
          ctx.globalCompositeOperation = 'lighter';
          var gx = cx + Math.cos(tilt) * 0.48 * s - Math.sin(tilt) * -0.62 * s, gy = my + Math.sin(tilt) * 0.48 * s + Math.cos(tilt) * -0.62 * s;
          ctx.fillStyle = 'rgba(255,255,255,' + (Math.sin(gq * Math.PI)).toFixed(3) + ')';
          sparkPath(ctx, gx, gy, s * 0.22 * Math.sin(gq * Math.PI)); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }

        // sparkles flying out of the frame
        var tf = ms(T.fly);
        if (t > tf) {
          ctx.globalCompositeOperation = 'lighter';
          for (var fi = 0; fi < flyers.length; fi++) {
            var F = flyers[fi], ft = (t - tf - F.delay) / 1000;
            if (ft <= 0) continue;
            var life = isSuper ? 1.5 : 1.1;
            if (ft > life) continue;
            var e = easeOut(ft / life);
            var ca = Math.cos(F.a), sa = Math.sin(F.a);
            var ox = ca * 0.74 * s + ca * F.d * s * e, oy = sa * 0.92 * s + sa * F.d * s * e * 0.9;
            var px = cx + ox, py = my + oy + ft * ft * s * 0.4;
            var al = clamp01(ft * 8) * (1 - clamp01((ft - life * 0.6) / (life * 0.4)));
            var twk = 0.6 + 0.4 * Math.sin(ft * F.tw + F.ph);
            var rr = (F.star ? 9 : 7) * unit * F.r * twk + 2;
            glowDot(px, py, rr * 2.4, 0.55 * al);
            ctx.fillStyle = hexA(F.col, al);
            if (F.star) { starPath(ctx, px, py, rr, ft * 3 + F.ph); ctx.fill(); }
            else { sparkPath(ctx, px, py, rr); ctx.fill(); }
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // super: bursting rings of stars
        for (var ri = 0; ri < T.rings.length; ri++) {
          var rq = (t - ms(T.rings[ri])) / 900;
          if (rq <= 0 || rq >= 1) continue;
          var re = easeOut(rq), rad = s * (0.6 + re * 2.6), ra = 1 - rq;
          var n = 14, rot = (ri % 2 ? -1 : 1) * rq * 0.8 + ri * 0.2;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = hexA(ri === 1 ? glow : accent, 0.35 * ra); ctx.lineWidth = 3 * unit * (1 - rq) + 1;
          ctx.beginPath(); ctx.ellipse(cx, my, rad, rad * 0.92, 0, 0, TAU); ctx.stroke();
          for (var si2 = 0; si2 < n; si2++) {
            var sa2 = rot + si2 / n * TAU;
            var spx = cx + Math.cos(sa2) * rad, spy = my + Math.sin(sa2) * rad * 0.92;
            glowDot(spx, spy, s * 0.16, 0.5 * ra);
            ctx.fillStyle = hexA(GEMS[(si2 + ri * 3) % 8], ra);
            starPath(ctx, spx, spy, s * 0.075 * (1 - rq * 0.4), sa2 + rq * 2); ctx.fill();
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
        spr = null;
      };
    }
  });
})();
