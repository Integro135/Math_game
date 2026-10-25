/* success-panda-bamboo.js — מסך הצלחה: פַּנְדָּה וְבַמְבּוּק 🐼
   פנדה תינוקת עגולה ורכה (מבט מלפנים) יושבת ליד חורשת במבוק, לועסת גבעול
   במבוק (הלחיים מתנפחות בכל ביס), ואז עושה גלגול אחורה שמח, מתיישבת ומוחאת
   כפיים — עלי במבוק ולבבות קטנים מתפרצים סביבה.
   בסופר: פנדה תינוקת שנייה מתגלגלת פנימה, השתיים מתחבקות, נבטי במבוק זוהרים
   צומחים מהאדמה ומטר קונפטי של עלים וכוכבים.
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

  var BLK = '#2B2533', BLK_L = '#463D52', PAD = '#8E7887', BEAN = '#A88B9C';
  var STALK = '#6DBB5E', STALK_D = '#3F8A45', STALK_L = '#A8E08E', LEAF_C = ['#7FCB6B', '#5DAE57', '#9BDA7A', '#4F9C50'];

  window.SUCCESS.styles.push({
    name: 'panda-bamboo',
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
        ? { grow: 0.1, m0: 0.06, m1: 0.27, r0: 0.28, r1: 0.4, b0: 0.4, b1: 0.56, h0: 0.58, sprout: 0.6, conf: 0.62, txt: 0.24 }
        : { grow: 0.14, m0: 0.1, m1: 0.44, r0: 0.45, r1: 0.64, txt: 0.34 };

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 34 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.6, color: bs % 4 === 0 ? glow : bs % 6 === 0 ? accent : '#FFFFFF' });

      // bamboo stand: side -1 = left of the panda, +1 = right; d = distance in S units
      var stalks = [
        { side: -1, d: 1.55, h: 0.95, w: 1.0, ph: rnd(0, TAU), at: 0.0 },
        { side: -1, d: 2.05, h: 1.25, w: 1.15, ph: rnd(0, TAU), at: 0.02 },
        { side: -1, d: 2.55, h: 0.8, w: 0.9, ph: rnd(0, TAU), at: 0.04 },
        { side: 1, d: 1.6, h: 1.1, w: 1.05, ph: rnd(0, TAU), at: 0.01 },
        { side: 1, d: 2.2, h: 0.85, w: 0.95, ph: rnd(0, TAU), at: 0.03 }
      ];
      stalks.forEach(function (s) {
        s.leaves = [];
        for (var k = 0; k < 3; k++) s.leaves.push({ f: 0.45 + k * 0.22 + rnd(-0.04, 0.04), sd: k % 2 ? 1 : -1, ph: rnd(0, TAU) });
      });

      // burst (clap) particles: leaves, hearts, stars — analytic flight
      var burst = [];
      var burstAt = isSuper ? [T.r1 + 0.01, T.h0 + 0.02] : [T.r1 + 0.01, T.r1 + 0.14];
      burstAt.forEach(function (at, wi) {
        var n = isSuper ? (wi ? 22 : 14) : (wi ? 12 : 16);
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + rnd(-1.25, 1.25);
          var sp = rnd(260, 520);
          burst.push({ at: at + rnd(0, 0.02), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: i % 3, rot: rnd(0, TAU), spin: rnd(-6, 6),
                       r: rnd(10, 18), col: i % 3 === 0 ? LEAF_C[i % 4] : i % 3 === 1 ? [primary, '#FF7FAE', '#FF5E8E'][i % 3] : [accent, '#FFFFFF'][i % 2],
                       ph: rnd(0, TAU), who: wi });
        }
      });
      // crumbs at each bite
      var crumbs = [];
      for (var cb = 0; cb < 4; cb++) for (var cc = 0; cc < 5; cc++)
        crumbs.push({ bite: cb, vx: (cc % 2 ? 1 : -1) * rnd(120, 230), vy: rnd(-200, -90), r: rnd(3, 5.5), col: LEAF_C[(cb + cc) % 4] });

      // super extras: glowing sprouts + leaf/star confetti + hug hearts
      var sprouts = [], confetti = [], hugHearts = [];
      if (isSuper) {
        var xs = [-4.1, -3.5, -1.3, 1.25, 3.5, 4.1];
        for (var sI = 0; sI < xs.length; sI++) sprouts.push({ d: xs[sI] + rnd(-0.15, 0.15), h: rnd(0.55, 0.95), at: T.sprout + sI * 0.025 + rnd(0, 0.02), ph: rnd(0, TAU) });
        for (var c2 = 0; c2 < 46; c2++)
          confetti.push({ x: Math.random(), at: T.conf + rnd(0, 0.24), sp: rnd(0.75, 1.15), ph: rnd(0, TAU), rot: rnd(0, TAU), spin: rnd(-4, 4),
                          kind: c2 % 2, col: c2 % 2 ? [accent, '#FFFFFF', glow, primary][c2 % 4] : LEAF_C[c2 % 4], r: rnd(8, 14) });
        for (var hh = 0; hh < 9; hh++)
          hugHearts.push({ at: T.h0 + 0.06 + hh * 0.025, vx: rnd(-90, 90), vy: rnd(-230, -150), r: rnd(11, 19), col: [primary, '#FF7FAE', '#FF5E8E'][hh % 3], ph: rnd(0, TAU) });
      }

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
      var txtAt = dur * T.txt;
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

      // ─── drawing helpers ───
      function bambooLeaf(x, y, ang, len, wid, col) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.35, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.35, wid * 0.8, 0, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(0.8, wid * 0.14);
        ctx.beginPath(); ctx.moveTo(len * 0.06, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
        ctx.restore();
      }
      // a vertical bamboo stalk from (x, baseY) of height h, width w; sway bends the top
      function stalk(x, baseY, h, w, sway, glowA) {
        var segs = Math.max(2, Math.round(h / (w * 4.2)));
        var segH = h / segs;
        for (var i = 0; i < segs; i++) {
          var y0 = baseY - i * segH, y1 = baseY - (i + 1) * segH;
          var bx0 = x + sway * Math.pow(i / segs, 2) * h * 0.12, bx1 = x + sway * Math.pow((i + 1) / segs, 2) * h * 0.12;
          var g = ctx.createLinearGradient(bx0 - w / 2, 0, bx0 + w / 2, 0);
          g.addColorStop(0, STALK_D); g.addColorStop(0.35, glowA ? '#C8F59A' : STALK_L); g.addColorStop(0.7, STALK); g.addColorStop(1, STALK_D);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(bx0 - w / 2, y0); ctx.lineTo(bx1 - w / 2, y1 + w * 0.12);
          ctx.quadraticCurveTo(bx1, y1 - w * 0.05, bx1 + w / 2, y1 + w * 0.12);
          ctx.lineTo(bx0 + w / 2, y0); ctx.closePath(); ctx.fill();
          // node ring
          ctx.fillStyle = '#B7E79C';
          ctx.beginPath(); ctx.ellipse(bx1, y1 + w * 0.12, w * 0.58, w * 0.13, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(40,90,40,.35)';
          ctx.beginPath(); ctx.ellipse(bx1, y1 + w * 0.2, w * 0.5, w * 0.06, 0, 0, TAU); ctx.fill();
        }
        return x + sway * h * 0.12;
      }
      // a paw: black round paw + 4 finger bumps toward `ang`, pale palm pad + toe beans
      function paw(x, y, ang, r) {
        var pg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.3);
        pg.addColorStop(0, BLK_L); pg.addColorStop(1, BLK);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        for (var i = 0; i < 4; i++) {
          var a = ang + (i - 1.5) * 0.46;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, r * 0.34, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = PAD;
        ctx.beginPath(); ctx.ellipse(x - Math.cos(ang) * r * 0.14, y - Math.sin(ang) * r * 0.14, r * 0.44, r * 0.36, ang + Math.PI / 2, 0, TAU); ctx.fill();
        ctx.fillStyle = BEAN;
        for (var j = 0; j < 4; j++) {
          var b = ang + (j - 1.5) * 0.46;
          ctx.beginPath(); ctx.arc(x + Math.cos(b) * r * 0.86, y + Math.sin(b) * r * 0.86, r * 0.15, 0, TAU); ctx.fill();
        }
      }
      function arm(sx, sy, px, py, w) {
        ctx.strokeStyle = BLK; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + px) / 2 + (sx < px ? -1 : 1) * w * 0.15, (sy + py) / 2 + w * 0.25, px, py); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = w * 0.35;
        ctx.beginPath(); ctx.moveTo(sx, sy - w * 0.15); ctx.quadraticCurveTo((sx + px) / 2, (sy + py) / 2, px, py - w * 0.15); ctx.stroke();
      }
      function foot(x, y, r, sd) {
        var fg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.3);
        fg.addColorStop(0, BLK_L); fg.addColorStop(1, BLK);
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 1.05, sd * 0.25, 0, TAU); ctx.fill();
        ctx.fillStyle = PAD;
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.22, r * 0.5, r * 0.42, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = BEAN;
        for (var i = 0; i < 4; i++) {
          var a = -Math.PI / 2 + (i - 1.5) * 0.5;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.58, y - r * 0.12 + Math.sin(a) * r * 0.42, r * 0.15, 0, TAU); ctx.fill();
        }
      }
      // the face, head-local coordinates (0,0 = head centre), radius R
      function face(R, st) {
        var puff = st.puff || 0;
        // eye patches: teardrops, top leaning in, bottom drooping out
        [-1, 1].forEach(function (s) {
          ctx.fillStyle = BLK;
          ctx.beginPath(); ctx.ellipse(s * R * 0.4, R * 0.0, R * 0.21, R * 0.29, -s * 0.55, 0, TAU); ctx.fill();
        });
        if (st.eyes === 'happy') {
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = R * 0.06; ctx.lineCap = 'round';
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * R * 0.38, R * 0.04, R * 0.1, Math.PI + 0.35, TAU - 0.35); ctx.stroke(); });
        } else {
          [-1, 1].forEach(function (s) {
            var ex = s * R * 0.36, ey = -R * 0.03;
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex, ey, R * 0.125, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1A1420'; ctx.beginPath(); ctx.arc(ex + s * R * 0.01, ey + R * 0.012, R * 0.1, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(ex - R * 0.03, ey - R * 0.035, R * 0.042, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(ex + R * 0.04, ey + R * 0.045, R * 0.018, 0, TAU); ctx.fill();
          });
        }
        // muzzle
        ctx.fillStyle = '#FFF7F2';
        ctx.beginPath(); ctx.ellipse(0, R * 0.36, R * 0.34 + puff * R * 0.04, R * 0.25, 0, 0, TAU); ctx.fill();
        // blush (moves out with the puffed cheeks)
        ctx.fillStyle = 'rgba(255,130,170,.5)';
        [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * R * (0.62 + puff * 0.08), R * 0.3, R * 0.14, R * 0.085, 0, 0, TAU); ctx.fill(); });
        // nose
        ctx.fillStyle = BLK;
        ctx.beginPath(); ctx.moveTo(-R * 0.11, R * 0.2); ctx.quadraticCurveTo(0, R * 0.15, R * 0.11, R * 0.2);
        ctx.quadraticCurveTo(R * 0.1, R * 0.29, 0, R * 0.31); ctx.quadraticCurveTo(-R * 0.1, R * 0.29, -R * 0.11, R * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.ellipse(-R * 0.035, R * 0.205, R * 0.035, R * 0.018, -0.2, 0, TAU); ctx.fill();
        // mouth
        var mo = st.mouth || 0;
        ctx.strokeStyle = BLK; ctx.lineWidth = R * 0.035; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, R * 0.31); ctx.lineTo(0, R * 0.37); ctx.stroke();
        if (mo < 0.08) {
          ctx.beginPath(); ctx.arc(-R * 0.07, R * 0.36, R * 0.07, 0.15, Math.PI - 0.4); ctx.stroke();
          ctx.beginPath(); ctx.arc(R * 0.07, R * 0.36, R * 0.07, 0.4, Math.PI - 0.15); ctx.stroke();
        } else {
          // a real open mouth: rounded opening, lip line on top, tongue at the bottom, dark only deep at the back
          var mw = R * (0.13 + 0.05 * mo), mt = R * 0.39, mh = R * (0.06 + 0.17 * mo);
          ctx.save();
          ctx.beginPath(); ctx.moveTo(-mw, mt);
          ctx.quadraticCurveTo(0, mt - R * 0.03, mw, mt);
          ctx.bezierCurveTo(mw, mt + mh * 0.9, R * 0.04, mt + mh * 1.05, 0, mt + mh * 1.05);
          ctx.bezierCurveTo(-R * 0.04, mt + mh * 1.05, -mw, mt + mh * 0.9, -mw, mt); ctx.closePath();
          ctx.fillStyle = '#B4415E'; ctx.fill();
          ctx.clip();
          ctx.fillStyle = '#5E1A30';
          ctx.beginPath(); ctx.ellipse(0, mt + mh * 0.18, mw * 0.62, mh * 0.42, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF8FB0';
          ctx.beginPath(); ctx.ellipse(0, mt + mh * 1.0, mw * 0.72, mh * 0.48, 0, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = BLK; ctx.lineWidth = R * 0.03;
          ctx.beginPath(); ctx.moveTo(-mw, mt); ctx.quadraticCurveTo(0, mt - R * 0.03, mw, mt);
          ctx.bezierCurveTo(mw, mt + mh * 0.9, R * 0.04, mt + mh * 1.05, 0, mt + mh * 1.05);
          ctx.bezierCurveTo(-R * 0.04, mt + mh * 1.05, -mw, mt + mh * 0.9, -mw, mt); ctx.stroke();
        }
      }
      function whiteGrad(x, y, r) {
        var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.15);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#F3F0F8'); g.addColorStop(1, '#D5CFE0');
        return g;
      }
      function head(R, st) {
        // ears
        [-1, 1].forEach(function (s) {
          var ex = s * R * 0.8, ey = -R * 0.7;
          var eg = ctx.createRadialGradient(ex - R * 0.08, ey - R * 0.1, R * 0.02, ex, ey, R * 0.36);
          eg.addColorStop(0, BLK_L); eg.addColorStop(1, BLK);
          ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, R * 0.33, 0, TAU); ctx.fill();
          ctx.fillStyle = '#5A4E66'; ctx.beginPath(); ctx.arc(ex + s * R * 0.02, ey + R * 0.03, R * 0.17, 0, TAU); ctx.fill();
        });
        if (st.bow) {
          var bx = R * 0.62, by = -R * 0.8;
          ctx.fillStyle = primary;
          [-1, 1].forEach(function (s) {
            ctx.beginPath(); ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx + s * R * 0.32, by - R * 0.26, bx + s * R * 0.34, by);
            ctx.quadraticCurveTo(bx + s * R * 0.32, by + R * 0.24, bx, by); ctx.closePath(); ctx.fill();
          });
          ctx.fillStyle = 'rgba(255,255,255,.4)';
          ctx.beginPath(); ctx.ellipse(bx - R * 0.18, by - R * 0.06, R * 0.07, R * 0.035, -0.4, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF7FAE'; ctx.beginPath(); ctx.arc(bx, by, R * 0.09, 0, TAU); ctx.fill();
        }
        // head + puffy cheeks share one gradient
        var puff = st.puff || 0;
        ctx.fillStyle = whiteGrad(0, 0, R);
        ctx.beginPath(); ctx.ellipse(0, 0, R * 1.08, R * 0.95, 0, 0, TAU); ctx.fill();
        if (puff > 0.02) {
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * R * (0.62 + puff * 0.06), R * 0.3, R * (0.3 + 0.16 * puff), 0, TAU); ctx.fill(); });
          ctx.strokeStyle = 'rgba(160,150,185,' + (0.45 * puff).toFixed(3) + ')'; ctx.lineWidth = R * 0.025;
          [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * R * (0.62 + puff * 0.06), R * 0.3, R * (0.3 + 0.16 * puff) * 0.82, s > 0 ? -0.3 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.3); ctx.stroke(); });
        }
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.ellipse(-R * 0.4, -R * 0.55, R * 0.22, R * 0.1, -0.5, 0, TAU); ctx.fill();
        face(R, st);
      }
      // the bamboo stalk the panda munches; local panda coords; len shrinks with bites
      function munchStalk(S, R, hy, frac, leavesOn) {
        var tx = R * 0.02, ty = hy + R * 0.42;               // top end at the mouth
        var dx = -0.8, dy = 0.6, L = S * 1.75 * frac;       // direction down-left
        var bx = tx + dx * L, by = ty + dy * L;
        var w = S * 0.15;
        ctx.save();
        ctx.translate(bx, by); ctx.rotate(Math.atan2(ty - by, tx - bx));
        var g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
        g.addColorStop(0, STALK_L); g.addColorStop(0.5, STALK); g.addColorStop(1, STALK_D);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.lineTo(L, -w / 2);
        // bitten, nibbled end
        ctx.lineTo(L - w * 0.12, -w * 0.2); ctx.lineTo(L + w * 0.05, 0); ctx.lineTo(L - w * 0.12, w * 0.22); ctx.lineTo(L, w / 2);
        ctx.lineTo(0, w / 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#B7E79C';
        for (var n = L * 0.33; n < L - w * 0.5; n += S * 0.45) { ctx.beginPath(); ctx.ellipse(n, 0, w * 0.13, w * 0.56, 0, 0, TAU); ctx.fill(); }
        if (leavesOn > 0) {
          ctx.globalAlpha *= leavesOn;
          bambooLeaf(L * 0.82, -w * 0.4, -0.9, S * 0.55, S * 0.11, LEAF_C[0]);
          bambooLeaf(L * 0.7, w * 0.4, 0.7, S * 0.5, S * 0.1, LEAF_C[1]);
        }
        ctx.restore();
      }
      /* one baby panda. st: x,y (body centre), S, rot, sx/sy squash, eyes, mouth, puff,
         paws: {L:{x,y,a}, R:{x,y,a}} in panda-local coords, hideArm:{L,R}, stalk:{frac,leaves,alpha}, bow */
      function panda(st) {
        var S = st.S, R = S * 0.72;
        ctx.save();
        ctx.translate(st.x, st.y); ctx.rotate(st.rot || 0); ctx.scale(st.sx || 1, st.sy || 1);
        // soft contact shadow / glow
        if (!st.rolling) {
          var sg = ctx.createRadialGradient(0, S * 0.7, 0, 0, S * 0.7, S * 1.1);
          sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, S * 0.72, S * 1.1, S * 0.22, 0, 0, TAU); ctx.fill();
        }
        // legs + feet (sitting, soles towards us)
        foot(-S * 0.46, S * 0.5, S * 0.24, -1);
        foot(S * 0.46, S * 0.5, S * 0.24, 1);
        // body
        ctx.fillStyle = whiteGrad(0, 0, S * 0.7);
        ctx.beginPath(); ctx.ellipse(0, 0, S * 0.68, S * 0.64, 0, 0, TAU); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0, S * 0.68, S * 0.64, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = BLK;                                   // black shoulder band
        ctx.beginPath(); ctx.ellipse(0, -S * 0.62, S * 0.8, S * 0.36, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.ellipse(-S * 0.05, S * 0.18, S * 0.32, S * 0.26, 0, 0, TAU); ctx.fill();
        ctx.restore();
        // head
        var hy = -S * 0.95 + (st.bob || 0);
        ctx.save(); ctx.translate(0, hy); ctx.rotate(st.tilt || 0);
        head(R, st);
        ctx.restore();
        if (st.stalk && st.stalk.alpha > 0) {
          ctx.save(); ctx.globalAlpha *= st.stalk.alpha;
          munchStalk(S, R, hy, st.stalk.frac, st.stalk.leaves);
          ctx.restore();
        }
        // arms + paws
        var aw = S * 0.3;
        [['L', -1], ['R', 1]].forEach(function (k) {
          if (st.hideArm && st.hideArm[k[0]]) return;
          var pw = st.paws[k[0]];
          arm(k[1] * S * 0.5, -S * 0.32, pw.x, pw.y, aw);
          paw(pw.x, pw.y, pw.a, S * 0.15);
        });
        ctx.restore();
      }
      function toWorld(st, lx, ly) {
        var c = Math.cos(st.rot || 0), s = Math.sin(st.rot || 0);
        return { x: st.x + c * lx * (st.sx || 1) - s * ly * (st.sy || 1), y: st.y + s * lx * (st.sx || 1) + c * ly * (st.sy || 1) };
      }
      function drawLeafOrStar(kind, x, y, r, rot, col) {
        if (kind === 0) { bambooLeaf(x, y, rot, r * 2.4, r * 0.55, col); return; }
        if (kind === 1) {
          ctx.fillStyle = col; heartPath(ctx, x, y, r); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x - r * 0.42, y - r * 0.38, r * 0.18, 0, TAU); ctx.fill();
          return;
        }
        ctx.fillStyle = col; starPath(ctx, x, y, r, r * 0.45, rot * 0.3); ctx.fill();
      }

      // pose helpers (panda-local)
      function pawsRest(S) { return { L: { x: -S * 0.36, y: S * 0.18, a: Math.PI / 2 + 0.3 }, R: { x: S * 0.36, y: S * 0.18, a: Math.PI / 2 - 0.3 } }; }
      function pawsHold(S, frac) {
        var R = S * 0.72, tx = R * 0.02, ty = -S * 0.95 + R * 0.42, L = S * 1.75 * frac;
        var f1 = Math.min(0.62, (S * 0.62) / L), f2 = Math.min(0.32, (S * 0.34) / L);
        return { L: { x: tx - 0.8 * L * f1, y: ty + 0.6 * L * f1 + S * 0.03, a: -0.75 }, R: { x: tx - 0.8 * L * f2 + S * 0.02, y: ty + 0.6 * L * f2 + S * 0.05, a: -0.95 } };
      }
      function pawsClap(S, t, amt) {
        var c = 0.5 + 0.5 * Math.cos(t * 0.02);
        var sep = S * (0.13 + 0.22 * c);
        var y = -S * 0.36 + Math.sin(t * 0.01) * S * 0.03;
        return { L: { x: -sep, y: y, a: -0.05 }, R: { x: sep, y: y, a: Math.PI + 0.05 }, c: c };
      }
      function pawsTuck(S) { return { L: { x: -S * 0.2, y: -S * 0.2, a: -0.6 }, R: { x: S * 0.2, y: -S * 0.2, a: Math.PI + 0.6 } }; }
      function blendPaws(a, b, k) {
        return { L: { x: lerp(a.L.x, b.L.x, k), y: lerp(a.L.y, b.L.y, k), a: lerp(a.L.a, b.L.a, k) },
                 R: { x: lerp(a.R.x, b.R.x, k), y: lerp(a.R.y, b.R.y, k), a: lerp(a.R.a, b.R.a, k) } };
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

        var S = Math.min(W * (isSuper ? 0.2 : 0.24), H * 0.15);
        var cx = W * 0.5;
        var gy = H * (W < H ? 0.8 : 0.84);                       // ground line (feet)
        var restY = gy - S * 0.72;
        var growP = clamp01(p / T.grow);

        // soft grassy mound + glow
        var mR = Math.min(W * 0.5, S * (isSuper ? 4.4 : 3.6));
        ctx.save(); ctx.translate(cx, gy - S * 0.3); ctx.scale(1, S * 1.5 / (mR * 1.1));
        var gl = ctx.createRadialGradient(0, 0, 0, 0, 0, mR * 1.1);
        gl.addColorStop(0, hexA(glow, 0.2)); gl.addColorStop(0.6, hexA(glow, 0.07)); gl.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, mR * 1.1, 0, TAU); ctx.fill();
        ctx.restore();
        var mg = ctx.createLinearGradient(0, gy - S * 0.25, 0, gy + S * 0.5);
        mg.addColorStop(0, '#7CC874'); mg.addColorStop(1, '#3C7E46');
        ctx.globalAlpha = gFade * easeOut(growP);
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.ellipse(cx, gy + S * 0.18, mR, S * 0.42, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9BDA7A';
        for (var gt = -6; gt <= 6; gt++) {
          var gxx = cx + gt * mR * 0.14, gyy = gy + S * 0.18 - Math.sqrt(Math.max(0, 1 - Math.pow(gt * 0.14, 2))) * S * 0.42;
          ctx.beginPath(); ctx.moveTo(gxx - S * 0.06, gyy + 2); ctx.quadraticCurveTo(gxx - S * 0.02, gyy - S * 0.16, gxx + S * 0.01, gyy - S * 0.2);
          ctx.quadraticCurveTo(gxx + S * 0.02, gyy - S * 0.08, gxx + S * 0.06, gyy + 2); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = gFade;

        // bamboo stand (grows up from the ground, sways)
        var spread = isSuper ? 1.25 : 1;
        for (var si = 0; si < stalks.length; si++) {
          var sk = stalks[si], gp = easeOut(clamp01((p - sk.at) / T.grow));
          if (gp <= 0) continue;
          var sxp = cx + sk.side * sk.d * S * spread;
          var h = sk.h * H * 0.42 * gp, w = S * 0.17 * sk.w;
          var sw = Math.sin(t * 0.0018 + sk.ph) * 0.35;
          var topX = stalk(sxp, gy + S * 0.05, h, w, sw, false);
          for (var li = 0; li < sk.leaves.length; li++) {
            var lv = sk.leaves[li], ly = gy - h * lv.f, lx = sxp + sw * Math.pow(lv.f, 2) * h * 0.12;
            var lg = clamp01((gp - lv.f * 0.6) / 0.4);
            if (lg <= 0) continue;
            for (var lk = 0; lk < 3; lk++)
              bambooLeaf(lx, ly, (lv.sd > 0 ? -0.35 : Math.PI + 0.35) + lv.sd * (lk - 1) * 0.35 + Math.sin(t * 0.003 + lv.ph + lk) * 0.08,
                         S * (0.55 + lk * 0.08) * lg, S * 0.1 * lg, LEAF_C[(si + lk) % 4]);
          }
          bambooLeaf(topX, gy - h, -Math.PI / 2 - 0.4, S * 0.4 * gp, S * 0.08, LEAF_C[2]);
          bambooLeaf(topX, gy - h, -Math.PI / 2 + 0.5, S * 0.35 * gp, S * 0.08, LEAF_C[0]);
        }

        // super: glowing sprouts shooting up
        for (var sp = 0; sp < sprouts.length; sp++) {
          var so = sprouts[sp], sq = easeOutBack(clamp01((p - so.at) / 0.09));
          if (sq <= 0) continue;
          var spx = Math.max(W * 0.05, Math.min(W * 0.95, cx + so.d * S)), sh = so.h * S * 2.2 * sq;
          var gA = 0.5 + 0.25 * Math.sin(t * 0.008 + so.ph);
          var hg = ctx.createRadialGradient(spx, gy - sh * 0.5, 0, spx, gy - sh * 0.5, sh * 0.8 + 10);
          hg.addColorStop(0, hexA('#C8FF9A', 0.45 * gA)); hg.addColorStop(0.5, hexA(glow, 0.18 * gA)); hg.addColorStop(1, hexA(glow, 0));
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(spx, gy - sh * 0.5, sh * 0.8 + 10, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          var stx = stalk(spx, gy + S * 0.1, sh, S * 0.11, Math.sin(t * 0.004 + so.ph) * 0.4, true);
          var uf = clamp01((p - so.at - 0.05) / 0.08);
          bambooLeaf(stx, gy - sh, -Math.PI / 2 - 0.6, S * 0.42 * uf, S * 0.09, '#B9F58E');
          bambooLeaf(stx, gy - sh, -Math.PI / 2 + 0.6, S * 0.38 * uf, S * 0.09, '#8FE06A');
          ctx.fillStyle = hexA('#FFFFFF', 0.8 * gA * uf);
          sparkPath(ctx, stx, gy - sh - S * 0.08, S * 0.09 * (0.6 + 0.4 * Math.sin(t * 0.012 + so.ph))); ctx.fill();
        }

        // ─── panda A (and super: panda B) ───
        var A = { S: S, x: cx, y: restY, rot: 0, eyes: 'open', mouth: 0, puff: 0, paws: pawsRest(S), bob: 0 };
        // pop in
        var inP = clamp01((p - 0.02) / 0.1);
        var popS = easeOutBack(inP);
        A.sx = A.sy = Math.max(0.001, popS);
        // munching
        var mu = (p - T.m0) / (T.m1 - T.m0);
        var bites = 0;
        if (p < T.r0) {
          var chewT = clamp01(mu);
          var cyc = chewT * 4;
          var ph = cyc * TAU;
          bites = Math.min(3, Math.floor(cyc));
          var takeIn = easeInOut(clamp01(mu / 0.12));
          var frac = 1 - bites * 0.15;
          A.stalk = { frac: frac, leaves: 1 - clamp01((cyc - 0.6) * 3), alpha: takeIn };
          A.paws = blendPaws(pawsRest(S), pawsHold(S, frac), takeIn);
          if (mu > 0 && mu < 1) {
            A.mouth = Math.max(0, Math.sin(ph)) * 0.85;
            A.puff = (cyc > 0.5 ? 1 : 0) * (0.35 + 0.65 * (0.5 - 0.5 * Math.sin(ph)));
            A.bob = Math.sin(ph) * -S * 0.02;
            A.eyes = cyc > 1.0 ? 'happy' : 'open';
          }
          if (mu >= 1) {
            var drop = clamp01((p - T.m1) / (T.r0 - T.m1));
            A.stalk.alpha = 1 - drop; A.paws = blendPaws(pawsHold(S, frac), pawsTuck(S), easeInOut(drop)); A.eyes = 'happy'; A.puff = 0.3 * (1 - drop);
          }
        }
        // backward roll
        var rv = (p - T.r0) / (T.r1 - T.r0);
        if (rv >= 0 && rv <= 1) {
          var re = easeInOut(rv);
          A.rot = -TAU * re;
          A.y = restY - Math.sin(Math.PI * rv) * S * 0.75;
          var sq2 = 1 - 0.12 * Math.sin(Math.PI * rv);
          A.sx = sq2; A.sy = sq2;
          A.paws = pawsTuck(S); A.eyes = 'happy'; A.mouth = 0.5; A.rolling = true;
        }
        // landing squash + clapping
        var clapStart = T.r1;
        if (p > T.r1) {
          var lt = (p - T.r1) * dur;
          var land = Math.sin(lt * 0.02) * Math.exp(-lt * 0.008);
          A.sx = 1 + land * 0.12; A.sy = 1 - land * 0.12;
          A.y = restY + land * S * 0.06;
          var ce = easeOut(clamp01(lt / 160));
          var cp = pawsClap(S, t, 1);
          A.paws = blendPaws(pawsTuck(S), cp, ce);
          A.mouth = 0.85; A.eyes = Math.sin(t * 0.004) > -0.6 ? 'open' : 'happy';
          A.tilt = Math.sin(t * 0.008) * 0.06;
        }

        var B = null;
        if (isSuper) {
          // A scoots left as B arrives; then both hug
          var gap = S * 0.98;
          var scoot = easeInOut(clamp01((p - T.b0) / 0.1));
          A.x = cx - gap * scoot;
          var bv = (p - T.b0) / (T.b1 - T.b0);
          if (bv > 0) {
            var bS = S * 0.86, bRest = gy - bS * 0.72;
            B = { S: bS, x: 0, y: bRest, rot: 0, eyes: 'happy', mouth: 0.6, puff: 0, paws: pawsTuck(bS), bow: true };
            var be = easeOut(clamp01(bv));
            B.x = lerp(W + bS * 1.6, cx + gap * 0.95, be);
            if (bv < 1) {
              B.rot = -TAU * 2 * be; B.rolling = true;
              B.y = bRest - Math.abs(Math.sin(bv * Math.PI * 3)) * bS * 0.5 * (1 - bv);
            } else {
              var lb = (p - T.b1) * dur, lnd = Math.sin(lb * 0.02) * Math.exp(-lb * 0.008);
              B.sx = 1 + lnd * 0.12; B.sy = 1 - lnd * 0.12;
              B.eyes = 'open'; B.mouth = 0.8;
              B.paws = blendPaws(pawsTuck(bS), pawsRest(bS), easeOut(clamp01(lb / 200)));
            }
          }
          // hug
          var hv = easeInOut(clamp01((p - T.h0) / 0.08));
          if (B && hv > 0) {
            A.x = lerp(A.x, cx - S * 0.56, hv); B.x = lerp(B.x, cx + S * 0.5, hv);
            A.rot = 0.13 * hv; B.rot = -0.15 * hv;
            A.eyes = 'happy'; B.eyes = 'happy'; A.mouth = 0.6; B.mouth = 0.6;
            A.tilt = 0.08 * hv; B.tilt = -0.1 * hv;
            var sway2 = Math.sin((p - T.h0) * dur * 0.006) * 0.03 * hv;
            A.rot += sway2; B.rot += sway2;
            // outer paws on own tummy → happy; inner arms reach around the other
            A.paws = blendPaws(A.paws, { L: { x: -S * 0.26, y: S * 0.02, a: -0.5 }, R: { x: S * 0.3, y: -S * 0.2, a: 0 } }, hv);
            B.paws = blendPaws(B.paws, { L: { x: -bS * 0.3, y: -bS * 0.2, a: Math.PI }, R: { x: bS * 0.26, y: bS * 0.02, a: Math.PI + 0.5 } }, hv);
            A.hideArm = { R: hv > 0.5 }; B.hideArm = { L: hv > 0.5 };
          }
        }

        var hugging = B && A.hideArm && A.hideArm.R;
        if (hugging) {
          // A's right arm reaches BEHIND B: only the paw peeks out over B's far shoulder
          var aSh = toWorld(A, S * 0.5, -S * 0.32), bTo = toWorld(B, B.S * 0.66, -B.S * 0.4);
          arm(aSh.x, aSh.y, bTo.x, bTo.y, S * 0.3);
          paw(bTo.x, bTo.y, -0.5, S * 0.15);
        }
        if (B) panda(B);
        if (hugging) {
          // B's left arm reaches behind A: paw peeks out at A's far shoulder
          var bSh = toWorld(B, -B.S * 0.5, -B.S * 0.32), aTo = toWorld(A, -S * 0.7, -S * 0.36);
          arm(bSh.x, bSh.y, aTo.x, aTo.y, B.S * 0.3);
          paw(aTo.x, aTo.y, Math.PI + 0.5, B.S * 0.15);
        }
        panda(A);

        // crumbs from each bite
        if (p < T.r0 + 0.05) {
          var headW = toWorld(A, 0, -S * 0.95 + S * 0.72 * 0.42);
          for (var ci = 0; ci < crumbs.length; ci++) {
            var cr = crumbs[ci];
            var bt = (T.m0 + (cr.bite + 0.25) / 4 * (T.m1 - T.m0)) * dur;
            var ct = (t - bt) / 1000;
            if (ct <= 0 || ct > 0.6 || cr.bite > 2) continue;
            ctx.globalAlpha = gFade * (1 - ct / 0.6);
            ctx.fillStyle = cr.col;
            var crx = headW.x + (cr.vx > 0 ? 1 : -1) * S * 0.62 + cr.vx * ct * unit * 1.4, cry = headW.y + (cr.vy * ct + 450 * ct * ct) * unit * 1.4;
            bambooLeaf(crx, cry, ct * 9 + cr.vx, cr.r * unit * 3.2, cr.r * unit * 0.9, cr.col);
          }
          ctx.globalAlpha = gFade;
        }

        // clap sparkles when the paws meet
        if (p > T.r1 + 0.02 && (!isSuper || p < T.h0)) {
          var cpz = pawsClap(S, t, 1);
          if (cpz.c > 0.85) {
            var cw = toWorld(A, 0, -S * 0.36);
            ctx.fillStyle = hexA(accent, (cpz.c - 0.85) / 0.15);
            for (var cs = 0; cs < 3; cs++) { sparkPath(ctx, cw.x + (cs - 1) * S * 0.28, cw.y - S * 0.22 - (cs % 2) * S * 0.1, S * 0.09); ctx.fill(); }
          }
        }

        // burst of leaves, hearts and stars
        var bOrig = toWorld(A, 0, -S * 1.0);
        var g0 = 520;
        for (var bi = 0; bi < burst.length; bi++) {
          var bp = burst[bi], tt = (t - bp.at * dur) / 1000;
          if (tt <= 0 || tt > 1.6) continue;
          var ox = bOrig.x, oy = bOrig.y;
          if (bp.who === 1 && isSuper) { ox = cx; oy = gy - S * 2.1; }
          var drag = 1 - Math.exp(-tt * 2.2);
          var dl = Math.sqrt(bp.vx * bp.vx + bp.vy * bp.vy), r0 = S * 0.85;
          var bx2 = ox + bp.vx / dl * r0 + bp.vx / 2.2 * drag * unit * 1.5 + Math.sin(tt * 4 + bp.ph) * 8 * unit;
          var by2 = oy + bp.vy / dl * r0 + (bp.vy / 2.2 * drag + 0.5 * g0 * 0.35 * tt * tt) * unit * 1.5;
          var fa = clamp01(tt / 0.08) * clamp01((1.6 - tt) / 0.5);
          var rr = bp.r * unit * 1.5 * (0.6 + 0.4 * easeOutBack(clamp01(tt / 0.25)));
          ctx.globalAlpha = gFade * fa;
          drawLeafOrStar(bp.kind, bx2, by2, rr, bp.rot + bp.spin * tt, bp.col);
        }
        ctx.globalAlpha = gFade;

        // super: hearts out of the hug + leaf/star confetti
        for (var hi = 0; hi < hugHearts.length; hi++) {
          var hh2 = hugHearts[hi], ht = (t - hh2.at * dur) / 1000;
          if (ht <= 0 || ht > 1.3) continue;
          var hx = cx + hh2.vx * ht * unit * 1.4 + Math.sin(ht * 6 + hh2.ph) * 10 * unit;
          var hy3 = gy - S * 2.05 + hh2.vy * ht * unit * 1.4;
          ctx.globalAlpha = gFade * clamp01(ht / 0.1) * clamp01((1.3 - ht) / 0.4);
          drawLeafOrStar(1, hx, hy3, hh2.r * unit * 1.4 * easeOutBack(clamp01(ht / 0.25)), 0, hh2.col);
        }
        for (var fi = 0; fi < confetti.length; fi++) {
          var cf = confetti[fi], q = (t - cf.at * dur) / 1000;
          if (q <= 0) continue;
          var fy = -20 * unit + q * cf.sp * H * 0.55;
          if (fy > H + 30) continue;
          var fx = cf.x * W + Math.sin(q * 3 + cf.ph) * 26 * unit;
          ctx.globalAlpha = gFade * clamp01(q * 5);
          drawLeafOrStar(cf.kind ? 2 : 0, fx, fy, cf.r * unit * 1.3, cf.rot + cf.spin * q, cf.col);
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
