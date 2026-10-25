/* success-bunny-carrot.js — מסך הצלחה: אַרְנֶבֶת וְגֶזֶר זָהָב 🐰🥕
   ארנבת לבנה וחמודה (מבט חזית) מקפצת פנימה, תופסת עלי גזר שבולטים מהאדמה
   ומושכת ומושכת (מתכווצת ונמתחת, האוזניים עפות), עד ש— פופ! גזר זהב ענק
   וזוהר קופץ החוצה בפרץ נצנצים ופירורי אדמה, נוחת לה בידיים והיא מחבקת אותו
   חזק בעיניים עצומות מאושר, ולבבות עפים למעלה.
   בסופר: שתי ארנבות מושכות יחד, גזר שני קופץ אחרי הראשון, וטבעת כוכבים.
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
  function easeIn(x) { x = clamp01(x); return x * x * x; }
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
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function heartPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.95);
    ctx.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    ctx.closePath();
  }

  // bunny colours
  var FUR = '#FFF8FC', FUR_S = '#E8DCEF', FUR_D = '#CDBCD9', EAR_IN = '#FFB3CB', NOSE = '#FF86AC', INK = '#2A1B33';

  window.SUCCESS.styles.push({
    name: 'bunny-carrot',
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
        ? { hopEnd: 0.08, grab: 0.11, tug0: 0.12, tugEnd: 0.37, pop: 0.37, peak: 0.45, land: 0.53,
            pop2: 0.5, peak2: 0.58, land2: 0.65, ring: 0.66 }
        : { hopEnd: 0.12, grab: 0.16, tug0: 0.17, tugEnd: 0.5, pop: 0.5, peak: 0.61, land: 0.71 };

      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 20); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      // soil crumbs: little bursts on each tug + a big one at the pop
      function crumbSet(n, at, power) {
        var arr = [];
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + (i % 2 ? 1 : -1) * rnd(0.45, 1.25);   // mostly out to the sides
          arr.push({ at: at, vx: Math.cos(a) * rnd(0.6, 1.1) * power, vy: Math.sin(a) * rnd(0.6, 1.1) * power,
                     r: rnd(0.018, 0.034), col: ['#8A5A36', '#6E4428', '#A7744A', '#5A361F'][i % 4], rot: rnd(0, TAU) });
        }
        return arr;
      }
      var crumbs = [];
      var nTugs = 3;
      for (var tg = 0; tg < nTugs; tg++)
        crumbs = crumbs.concat(crumbSet(5 + tg * 2, T.tug0 + (T.tugEnd - T.tug0) * (tg + 0.62) / nTugs, 1.6 + tg * 0.5));
      crumbs = crumbs.concat(crumbSet(isSuper ? 18 : 14, T.pop, 3.4));
      if (isSuper) crumbs = crumbs.concat(crumbSet(12, T.pop2, 3.0));
      // pop sparkles (5-point stars + twinkles flying out)
      function burst(n, at) {
        var arr = [];
        for (var i = 0; i < n; i++) {
          var a = i / n * TAU + rnd(-0.2, 0.2);
          arr.push({ at: at, a: a, sp: rnd(0.9, 1.9), r: rnd(0.05, 0.1), star: i % 3 !== 0, rot: rnd(0, TAU),
                     col: ['#FFE27A', '#FFFFFF', accent, '#FFC93C', glow][i % 5] });
        }
        return arr;
      }
      var sparks = burst(isSuper ? 22 : 18, T.pop);
      if (isSuper) sparks = sparks.concat(burst(16, T.pop2));
      // hearts floating up from the hug(s)
      var hearts = [];
      var hugAts = isSuper ? [T.land + 0.02, T.land2 + 0.02] : [T.land + 0.02];
      hugAts.forEach(function (at, hi) {
        for (var i = 0; i < (isSuper ? 7 : 8); i++)
          hearts.push({ who: hi, at: at + i * (isSuper ? 0.035 : 0.03), dx: rnd(-0.6, 0.6), sp: rnd(0.9, 1.4), r: rnd(0.07, 0.11), ph: rnd(0, TAU),
                        col: ['#FF7FAE', primary, '#FF5E8E', '#FFFFFF', accent][i % 5] });
      });
      // super: ring of stars
      var ringStars = [];
      if (isSuper) for (var rs = 0; rs < 14; rs++) ringStars.push({ a: rs / 14 * TAU, col: ['#FFE27A', '#FFFFFF', accent, glow][rs % 4], d: rs * 0.006 });

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA('#FFB321', 0.85) + ',0 0 44px ' + hexA(primary, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * (T.pop + 0.01);
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
      function frond(x, y, ang, len, wid, col) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-wid, -len * 0.3, -wid * 1.1, -len * 0.75, 0, -len);
        ctx.bezierCurveTo(wid * 1.1, -len * 0.75, wid, -len * 0.3, 0, 0); ctx.closePath(); ctx.fill();
        // little serrations
        ctx.beginPath();
        for (var i = 1; i < 4; i++) {
          var yy = -len * (0.25 + i * 0.17), ww = wid * (1.05 - i * 0.12);
          ctx.moveTo(-ww * 0.8, yy + len * 0.06); ctx.lineTo(-ww * 1.25, yy - len * 0.02); ctx.lineTo(-ww * 0.7, yy - len * 0.03);
          ctx.moveTo(ww * 0.8, yy + len * 0.06); ctx.lineTo(ww * 1.25, yy - len * 0.02); ctx.lineTo(ww * 0.7, yy - len * 0.03);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,255,200,.6)'; ctx.lineWidth = Math.max(1, wid * 0.16);
        ctx.beginPath(); ctx.moveTo(0, -len * 0.05); ctx.lineTo(0, -len * 0.85); ctx.stroke();
        ctx.restore();
      }
      /* golden carrot: centre (x,y), length L (px), rot; stemLen (px) between the carrot top and the
         frond fan; glowK 0..1; stemBend: horizontal offset of the frond base (px, in carrot space) */
      function carrot(x, y, L, rot, stemLen, glowK, tt, sway) {
        var w = L * 0.2;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        if (glowK > 0) {
          var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.95);
          hg.addColorStop(0, hexA('#FFE27A', 0.55 * glowK)); hg.addColorStop(0.45, hexA('#FFB321', 0.22 * glowK)); hg.addColorStop(1, hexA('#FFB321', 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, L * 0.95, 0, TAU); ctx.fill();
        }
        // stems + fronds
        var topY = -L * 0.5, fy = topY - stemLen;
        var greens = ['#5DBB54', '#7BD36A', '#4AA84A', '#8EDB78', '#66C35A'];
        ctx.strokeStyle = '#4CA548'; ctx.lineWidth = Math.max(2, L * 0.03); ctx.lineCap = 'round';
        for (var s = -1; s <= 1; s++) {
          ctx.beginPath(); ctx.moveTo(s * w * 0.18, topY + 2);
          ctx.quadraticCurveTo(s * w * 0.3, (topY + fy) / 2, s * w * 0.12, fy); ctx.stroke();
        }
        for (var f = 0; f < 5; f++) {
          var fa = (f - 2) * 0.42 + Math.sin(tt * 0.009 + f * 1.3) * 0.06 * sway;
          frond(Math.sin(fa) * L * 0.02, fy, fa, L * (f === 2 ? 0.36 : 0.3), L * 0.07, greens[f]);
        }
        // body
        ctx.beginPath();
        ctx.moveTo(-w * 0.85, topY);
        ctx.quadraticCurveTo(0, topY - L * 0.06, w * 0.85, topY);
        ctx.bezierCurveTo(w * 1.08, topY + L * 0.06, w * 0.98, -L * 0.1, w * 0.45, L * 0.25);
        ctx.quadraticCurveTo(w * 0.15, L * 0.48, 0, L * 0.5);
        ctx.quadraticCurveTo(-w * 0.15, L * 0.48, -w * 0.45, L * 0.25);
        ctx.bezierCurveTo(-w * 0.98, -L * 0.1, -w * 1.08, topY + L * 0.06, -w * 0.85, topY);
        ctx.closePath();
        var g = ctx.createLinearGradient(-w, 0, w, 0);
        g.addColorStop(0, '#FFF3B0'); g.addColorStop(0.35, '#FFD23F'); g.addColorStop(0.8, '#FFA81C'); g.addColorStop(1, '#E8870E');
        ctx.fillStyle = g; ctx.fill();
        // ridges
        ctx.strokeStyle = 'rgba(190,105,10,.55)'; ctx.lineWidth = Math.max(1.2, L * 0.012);
        for (var r = 0; r < 6; r++) {
          var ry = topY + L * (0.14 + r * 0.13), k = 1 - (ry - topY) / L, hw = w * Math.pow(k, 0.7) * 0.95;
          var sd = r % 2 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(sd * hw, ry); ctx.quadraticCurveTo(sd * hw * 0.6, ry + L * 0.018, sd * hw * 0.2, ry + L * 0.005); ctx.stroke();
        }
        // shine
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(2, L * 0.035);
        ctx.beginPath(); ctx.moveTo(-w * 0.5, topY + L * 0.08); ctx.quadraticCurveTo(-w * 0.62, -L * 0.05, -w * 0.32, L * 0.16); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        sparkPath(ctx, w * 0.35, topY + L * 0.2, L * 0.05 * (0.6 + 0.4 * Math.sin(tt * 0.012))); ctx.fill();
        ctx.restore();
      }
      // a paw: palm + 4 little fingers toward `ang` (local bunny units)
      function paw(x, y, ang, r) {
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.arc(x, y, r + 0.012, 0, TAU); ctx.fill();
        for (var i = 0; i < 4; i++) {
          var a = ang + (i - 1.5) * 0.45;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92, r * 0.36 + 0.012, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        for (var k = 0; k < 4; k++) {
          var b = ang + (k - 1.5) * 0.45;
          ctx.beginPath(); ctx.arc(x + Math.cos(b) * r * 0.92, y + Math.sin(b) * r * 0.92, r * 0.36, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,170,200,.75)';                            // little palm pad
        ctx.beginPath(); ctx.ellipse(x - Math.cos(ang) * r * 0.12, y - Math.sin(ang) * r * 0.12, r * 0.4, r * 0.32, ang, 0, TAU); ctx.fill();
      }
      function arm(x0, y0, x1, y1) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = FUR_D; ctx.lineWidth = 0.15;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = FUR; ctx.lineWidth = 0.125;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      function ear(sd, o) {
        var ang = sd * (0.2 + (o.earSpread || 0)) + (o.earWob || 0) * sd;
        ctx.save(); ctx.translate(sd * 0.13, -1.18); ctx.rotate(ang);
        var len = 0.62 * (o.earLen || 1);
        var g = ctx.createLinearGradient(-0.1, 0, 0.1, 0);
        g.addColorStop(0, FUR); g.addColorStop(1, FUR_S);
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.ellipse(0, -len * 0.5, 0.115, len * 0.52, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, -len * 0.5, 0.1, len * 0.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = EAR_IN;
        ctx.beginPath(); ctx.ellipse(0, -len * 0.47, 0.052, len * 0.38, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.ellipse(-0.02, -len * 0.62, 0.015, len * 0.16, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function eyes(o) {
        [-1, 1].forEach(function (sd) {
          var ex = sd * 0.14, ey = -1.0;
          ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round';
          if (o.eye === 'happy') {
            ctx.lineWidth = 0.035;
            ctx.beginPath(); ctx.arc(ex, ey + 0.02, 0.055, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
          } else if (o.eye === 'effort') {
            ctx.lineWidth = 0.032;
            ctx.beginPath(); ctx.moveTo(ex - sd * 0.06, ey - 0.045); ctx.lineTo(ex + sd * 0.035, ey); ctx.lineTo(ex - sd * 0.06, ey + 0.045); ctx.stroke();
          } else {
            var big = o.eye === 'wow' ? 1.18 : 1;
            ctx.beginPath(); ctx.ellipse(ex, ey, 0.058 * big, 0.074 * big, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(ex + 0.018, ey - 0.026, 0.024 * big, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(ex - 0.02, ey + 0.03, 0.01 * big, 0, TAU); ctx.fill();
            // two little lashes on the outer side
            ctx.strokeStyle = INK; ctx.lineWidth = 0.016;
            ctx.beginPath(); ctx.moveTo(ex + sd * 0.045, ey - 0.055); ctx.lineTo(ex + sd * 0.075, ey - 0.075);
            ctx.moveTo(ex + sd * 0.058, ey - 0.03); ctx.lineTo(ex + sd * 0.09, ey - 0.04); ctx.stroke();
          }
        });
      }
      function mouth(o) {
        var m = o.mouth || 0;
        if (o.eye === 'effort') {                            // puffed, tight little wavy mouth
          ctx.strokeStyle = '#B04A6A'; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(-0.045, -0.81);
          ctx.quadraticCurveTo(-0.022, -0.825, 0, -0.81); ctx.quadraticCurveTo(0.022, -0.795, 0.045, -0.81); ctx.stroke();
          return;
        }
        if (m > 0.05) {
          var top = -0.835, mh = 0.13 * m, mw = 0.075;
          ctx.save();
          ctx.beginPath(); ctx.moveTo(-mw, top);
          ctx.quadraticCurveTo(0, top + 0.012, mw, top);
          ctx.bezierCurveTo(mw * 0.95, top + mh * 0.75, mw * 0.4, top + mh, 0, top + mh);
          ctx.bezierCurveTo(-mw * 0.4, top + mh, -mw * 0.95, top + mh * 0.75, -mw, top);
          ctx.closePath();
          ctx.fillStyle = '#C8455C'; ctx.fill();
          ctx.clip();
          ctx.fillStyle = '#5A1426';                         // throat: only the back of the mouth
          ctx.beginPath(); ctx.ellipse(0, top + mh * 0.38, mw * 0.55, mh * 0.28, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF8FA6';                         // tongue at the front
          ctx.beginPath(); ctx.ellipse(0, top + mh * 0.92, mw * 0.62, mh * 0.36, 0, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#FFFFFF';                         // two buck teeth
          ctx.beginPath();
          ctx.moveTo(-0.03, top + 0.004); ctx.lineTo(-0.002, top + 0.006); ctx.lineTo(-0.003, top + 0.034); ctx.quadraticCurveTo(-0.016, top + 0.04, -0.028, top + 0.032); ctx.closePath();
          ctx.moveTo(0.03, top + 0.004); ctx.lineTo(0.002, top + 0.006); ctx.lineTo(0.003, top + 0.034); ctx.quadraticCurveTo(0.016, top + 0.04, 0.028, top + 0.032); ctx.closePath();
          ctx.fill();
        } else {
          ctx.strokeStyle = '#B04A6A'; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(0, -0.85); ctx.lineTo(0, -0.83);
          ctx.moveTo(-0.055, -0.82); ctx.quadraticCurveTo(-0.027, -0.8, 0, -0.83); ctx.quadraticCurveTo(0.027, -0.8, 0.055, -0.82); ctx.stroke();
        }
      }
      function headDraw(o) {
        ctx.save(); ctx.translate(0, -0.72); ctx.rotate(o.tilt || 0); ctx.translate(0, 0.72);
        ear(-1, o); ear(1, o);
        var gh = ctx.createRadialGradient(-0.08, -1.08, 0.04, 0, -0.98, 0.42);
        gh.addColorStop(0, '#FFFFFF'); gh.addColorStop(0.7, FUR); gh.addColorStop(1, FUR_S);
        ctx.fillStyle = FUR_D;
        ctx.beginPath(); ctx.ellipse(0, -0.97, 0.375, 0.32, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = gh;
        ctx.beginPath(); ctx.ellipse(0, -0.97, 0.36, 0.305, 0, 0, TAU); ctx.fill();
        // fluffy cheeks
        [-1, 1].forEach(function (sd) {
          ctx.fillStyle = FUR;
          ctx.beginPath(); ctx.arc(sd * 0.29, -0.88, 0.1 * (o.puff || 1), 0, TAU); ctx.fill();
        });
        // tuft on top
        ctx.fillStyle = FUR;
        ctx.beginPath(); ctx.arc(-0.04, -1.26, 0.05, 0, TAU); ctx.arc(0.03, -1.27, 0.045, 0, TAU); ctx.fill();
        eyes(o);
        // blush
        ctx.fillStyle = 'rgba(255,120,165,' + (o.eye === 'effort' ? 0.75 : 0.5) + ')';
        [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.ellipse(sd * 0.25, -0.88, 0.065, 0.038, 0, 0, TAU); ctx.fill(); });
        // muzzle puffs + nose
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(-0.045, -0.865, 0.052, 0, TAU); ctx.arc(0.045, -0.865, 0.052, 0, TAU); ctx.fill();
        mouth(o);
        ctx.fillStyle = NOSE;
        ctx.beginPath(); ctx.moveTo(-0.035, -0.9); ctx.quadraticCurveTo(0, -0.915, 0.035, -0.9);
        ctx.quadraticCurveTo(0.01, -0.86, 0, -0.858); ctx.quadraticCurveTo(-0.01, -0.86, -0.035, -0.9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(-0.01, -0.898, 0.008, 0, TAU); ctx.fill();
        ctx.restore();
      }
      /* bunny, front view, local units (≈1 = body+head height to the crown), origin at the feet.
         pass 'back': body + feet; pass 'front': head + arms + paws.
         o: {sx, sy, rot, sit, eye, mouth, tilt, earSpread, earWob, earLen, hands:[[x,y,ang],[x,y,ang]], puff} */
      function bunny(x, y, s, o, pass) {
        ctx.save();
        ctx.translate(x, y);
        if (pass === 'back') {
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath(); ctx.ellipse(0, 0.01 * s, 0.42 * s, 0.06 * s, 0, 0, TAU); ctx.fill();
        }
        ctx.rotate(o.rot || 0);
        ctx.scale(s * (o.sx || 1), s * (o.sy || 1));
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        var sit = o.sit || 0;
        ctx.translate(0, sit * 0.1);
        if (pass === 'back') {
          // standing feet (fade into sitting soles)
          if (sit < 1) {
            [-1, 1].forEach(function (sd) {
              ctx.fillStyle = FUR_D; ctx.beginPath(); ctx.ellipse(sd * 0.17, -0.05 - sit * 0.1, 0.16, 0.085, 0, 0, TAU); ctx.fill();
              ctx.fillStyle = FUR; ctx.beginPath(); ctx.ellipse(sd * 0.17, -0.055 - sit * 0.1, 0.145, 0.072, 0, 0, TAU); ctx.fill();
              ctx.strokeStyle = FUR_D; ctx.lineWidth = 0.014;
              ctx.beginPath(); ctx.moveTo(sd * 0.17 - 0.035, -0.02 - sit * 0.1); ctx.lineTo(sd * 0.17 - 0.035, -0.05 - sit * 0.1);
              ctx.moveTo(sd * 0.17 + 0.035, -0.02 - sit * 0.1); ctx.lineTo(sd * 0.17 + 0.035, -0.05 - sit * 0.1); ctx.stroke();
            });
          }
          // body
          var gb = ctx.createRadialGradient(-0.08, -0.55, 0.05, 0, -0.42, 0.46);
          gb.addColorStop(0, '#FFFFFF'); gb.addColorStop(0.7, FUR); gb.addColorStop(1, FUR_S);
          ctx.fillStyle = FUR_D;
          ctx.beginPath(); ctx.ellipse(0, -0.42, 0.355, 0.41, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = gb;
          ctx.beginPath(); ctx.ellipse(0, -0.42, 0.34, 0.395, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFF0F6';
          ctx.beginPath(); ctx.ellipse(0, -0.36, 0.21, 0.26, 0, 0, TAU); ctx.fill();
          // sitting: soles toward us with pink pads
          if (sit > 0) {
            ctx.globalAlpha *= clamp01(sit * 2);
            [-1, 1].forEach(function (sd) {
              var fx = sd * 0.25, fy = -0.08;
              ctx.save(); ctx.translate(fx, fy); ctx.rotate(sd * 0.25);
              ctx.fillStyle = FUR_D; ctx.beginPath(); ctx.ellipse(0, 0, 0.115, 0.15, 0, 0, TAU); ctx.fill();
              ctx.fillStyle = FUR; ctx.beginPath(); ctx.ellipse(0, 0, 0.1, 0.135, 0, 0, TAU); ctx.fill();
              ctx.fillStyle = '#FFA3C0';
              ctx.beginPath(); ctx.ellipse(0, 0.035, 0.05, 0.055, 0, 0, TAU); ctx.fill();
              for (var b = -1; b <= 1; b++) { ctx.beginPath(); ctx.arc(b * 0.042, -0.065 + Math.abs(b) * 0.015, 0.022, 0, TAU); ctx.fill(); }
              ctx.restore();
            });
            ctx.globalAlpha /= clamp01(sit * 2) || 1;
          }
        } else {
          headDraw(o);
          var hs = o.hands;
          [-1, 1].forEach(function (sd, i) {
            var h = hs[i];
            arm(sd * 0.25, -0.62, h[0], h[1]);
            paw(h[0], h[1], h[2], 0.07);
          });
        }
        ctx.restore();
      }
      function soil(cx, gy, s, hole, bulge, tt, tuftAt) {
        // a little dirt mound; after the pop it becomes a crater ring around a dark hole
        var rx = s * 0.4, ry = s * (0.11 + bulge * 0.04);
        var g = ctx.createLinearGradient(0, gy - ry, 0, gy + ry * 0.4);
        g.addColorStop(0, '#9A6A40'); g.addColorStop(1, '#5C3A22');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(cx - rx, gy + ry * 0.25);
        ctx.bezierCurveTo(cx - rx * 0.7, gy - ry, cx + rx * 0.7, gy - ry, cx + rx, gy + ry * 0.25);
        ctx.quadraticCurveTo(cx, gy + ry * 0.55, cx - rx, gy + ry * 0.25); ctx.fill();
        if (hole > 0) {
          ctx.fillStyle = hexA('#24140B', hole);
          ctx.beginPath(); ctx.ellipse(cx, gy - ry * 0.35, rx * 0.42 * hole, ry * 0.35 * hole, 0, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,220,180,.18)';
        for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx + (i - 2.5) * rx * 0.28, gy - ry * (0.4 + 0.25 * Math.sin(i * 2.1)), s * 0.014, 0, TAU); ctx.fill(); }
        // grass tufts
        ctx.strokeStyle = '#5DBB54'; ctx.lineWidth = Math.max(1.5, s * 0.014); ctx.lineCap = 'round';
        tuftAt.forEach(function (k, j) {
          var bx = cx + k * s;
          for (var b = -1; b <= 1; b++) {
            ctx.beginPath(); ctx.moveTo(bx, gy + 2);
            ctx.quadraticCurveTo(bx + b * s * 0.03, gy - s * 0.06, bx + b * s * 0.05 + Math.sin(tt * 0.004 + j) * s * 0.01, gy - s * (0.1 + (b === 0 ? 0.03 : 0)));
            ctx.stroke();
          }
        });
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
        var S = isSuper ? Math.min(W * (portrait ? 0.26 : 0.17), H * 0.22) : Math.min(W * (portrait ? 0.34 : 0.22), H * 0.24);
        var gy = H * (portrait ? 0.74 : 0.84);
        var cx = W * 0.5;
        var L = S * 1.25;                                          // HUGE carrot
        var L2 = S * 1.05;
        var bxs = isSuper ? [cx - S * 0.5, cx + S * 0.5] : [cx];

        // ground glow strip
        var gg = ctx.createRadialGradient(cx, gy, 0, cx, gy, W * 0.5);
        gg.addColorStop(0, 'rgba(110,80,50,.5)'); gg.addColorStop(0.7, 'rgba(80,60,40,.25)'); gg.addColorStop(1, 'rgba(80,60,40,0)');
        ctx.save(); ctx.translate(0, gy); ctx.scale(1, 0.11); ctx.translate(0, -gy);
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, gy, W * 0.5, 0, TAU); ctx.fill();
        ctx.restore();

        // ─── tug state ───
        var tugP = (p - T.tug0) / (T.tugEnd - T.tug0);
        var tugging = tugP > 0 && tugP < 1;
        var tugIdx = Math.min(nTugs - 1, Math.floor(clamp01(tugP) * nTugs));
        var tugLocal = clamp01(tugP) * nTugs - tugIdx;          // 0..1 inside a tug
        var power = 0.6 + 0.25 * tugIdx;
        var squash = 0, wig = 0;
        if (tugging) {
          if (tugLocal < 0.4) squash = -easeInOut(tugLocal / 0.4);                    // crouch
          else if (tugLocal < 0.72) squash = lerp(-1, 1, easeOut((tugLocal - 0.4) / 0.32)); // heave up
          else squash = lerp(1, 0, easeInOut((tugLocal - 0.72) / 0.28));             // ease back
          squash *= power;
          wig = Math.sin(tugLocal * TAU * 2) * 0.05 * power;
        }
        var peek = clamp01(tugP) * 0.14 + (squash > 0 ? squash * 0.05 : 0);      // carrot shoulder rising

        // ─── carrots ───
        // after the pop a carrot arcs up and out to the side (never over her face), spins once
        // and comes down into her arms, top leaning toward `side`
        var HUG_ROT = 0.35;
        function carrotState(popAt, peakAt, landAt, hugX, side, len) {
          var underY = gy + len * 0.5 - len * peek;
          if (p < popAt) return { x: cx, y: underY, rot: 0, inHand: false, buried: true };
          var peakX = Math.max(len * 0.6, Math.min(W - len * 0.6, cx + side * S * (isSuper ? 1.7 : 1.25)));
          var peakY = Math.max(H * 0.3 + len * 0.5, gy - S * 2.1);
          var hugY = gy - S * 0.62;
          var hugRot = HUG_ROT * side;
          var w = clamp01((p - popAt) / (landAt - popAt));
          var rot = easeInOut(w) * (side * TAU + hugRot);
          if (p < peakAt) {
            var u = (p - popAt) / (peakAt - popAt);
            return { x: lerp(cx, peakX, easeOut(u)), y: lerp(underY, peakY, 1 - (1 - u) * (1 - u)), rot: rot, inHand: false };
          }
          if (p < landAt) {
            var v = (p - peakAt) / (landAt - peakAt);
            return { x: lerp(peakX, hugX, easeInOut(v)), y: lerp(peakY, hugY, v * v), rot: rot, inHand: false };
          }
          return { x: hugX, y: hugY, rot: hugRot, inHand: true };
        }
        var C1 = isSuper ? carrotState(T.pop, T.peak, T.land, bxs[0] - S * 0.3, -1, L)
                         : carrotState(T.pop, T.peak, T.land, cx + S * 0.3, 1, L);
        var C2 = isSuper ? carrotState(T.pop2, T.peak2, T.land2, bxs[1] + S * 0.3, 1, L2) : null;
        if (C2 && C2.buried) { C2.y = gy + L2 * 0.6; }

        // ─── bunnies' poses ───
        var poses = [];
        for (var b = 0; b < bxs.length; b++) {
          var sd = isSuper ? (b === 0 ? -1 : 1) : 0;         // which side of the carrot
          var bx = bxs[b], by = gy;
          var o = { sx: 1, sy: 1, rot: 0, sit: 0, eye: 'open', mouth: 0, tilt: 0, earSpread: 0, earWob: 0, earLen: 1, puff: 1 };
          var gripY = -0.36;
          var gripLocal = isSuper ? [[sd < 0 ? 0.3 : -0.42, gripY, sd < 0 ? 0 : Math.PI], [sd < 0 ? 0.42 : -0.3, gripY - 0.02, sd < 0 ? 0 : Math.PI]]
                                  : [[-0.06, gripY, -0.2], [0.06, gripY - 0.03, Math.PI + 0.2]];
          var restHands = [[-0.3, -0.38, Math.PI / 2], [0.3, -0.38, Math.PI / 2]];
          if (p < T.hopEnd) {
            var hp = p / T.hopEnd;
            var from = isSuper ? (b === 0 ? -S * 1.2 : W + S * 1.2) : -S * 1.2;
            bx = lerp(from, bx, easeOut(hp));
            var hopPh = hp * 3 * Math.PI;
            by = gy - Math.abs(Math.sin(hopPh)) * S * 0.45 * (1 - hp * 0.5);
            var air = Math.abs(Math.sin(hopPh));
            o.sy = 1 + 0.12 * (air - 0.4); o.sx = 1 / o.sy;
            o.earSpread = -0.1 * air; o.earWob = Math.cos(hopPh) * 0.12;
            o.hands = [[-0.32, -0.45 - air * 0.1, -2.2], [0.32, -0.45 - air * 0.1, -0.9]];
            o.mouth = 0.5;
          } else if (p < T.tug0) {
            var gp = easeInOut((p - T.hopEnd) / (T.tug0 - T.hopEnd));
            o.hands = [[lerp(restHands[0][0], gripLocal[0][0], gp), lerp(restHands[0][1], gripLocal[0][1], gp), gripLocal[0][2]],
                       [lerp(restHands[1][0], gripLocal[1][0], gp), lerp(restHands[1][1], gripLocal[1][1], gp), gripLocal[1][2]]];
            o.mouth = 0.3 * (1 - gp);
          } else if (p < T.pop) {
            o.sy = 1 + squash * 0.16; o.sx = 1 - squash * 0.1;
            o.rot = wig + sd * 0.03;
            o.eye = squash > 0.15 ? 'effort' : 'open';
            o.puff = squash > 0.15 ? 1.18 : 1;
            o.earSpread = squash > 0 ? -squash * 0.12 : -squash * 0.2;
            o.earWob = Math.sin(t * 0.03) * 0.04 * Math.abs(squash);
            o.earLen = 1 - squash * 0.06;
            o.hands = gripLocal;
          } else {
            // after the pop: falls onto her bottom, arms up to catch, then hugs
            var myPop = isSuper && b === 1 ? T.pop2 : T.pop, myPeak = isSuper && b === 1 ? T.peak2 : T.peak, myLand = isSuper && b === 1 ? T.land2 : T.land;
            var fp = (p - T.pop) * dur;
            var sitK = easeOut(fp / 220);
            o.sit = sitK;
            var thud = fp > 0 && fp < 400 ? Math.sin(fp / 400 * Math.PI) * Math.exp(-fp * 0.006) : 0;
            o.sy = 1 - 0.18 * thud; o.sx = 1 + 0.12 * thud;
            o.eye = 'wow'; o.mouth = 0.85;
            o.earSpread = 0.2 * thud; o.earWob = Math.sin(fp * 0.02) * 0.1 * Math.exp(-fp * 0.004);
            var catchK = easeInOut((p - myPop - 0.02) / (myPeak - myPop));
            var upHands = [[-0.42, -0.95, -1.9], [0.42, -0.95, -1.25]];
            o.hands = [[lerp(-0.34, upHands[0][0], catchK), lerp(-0.5, upHands[0][1], catchK), upHands[0][2]],
                       [lerp(0.34, upHands[1][0], catchK), lerp(-0.5, upHands[1][1], catchK), upHands[1][2]]];
            if (isSuper && b === 1 && p < T.pop2) { o.eye = 'open'; o.mouth = 0.5; }
            if (p >= myLand) {
              var hugK = easeOut((p - myLand) * dur / 160);
              var dirC = isSuper ? (b === 0 ? -1 : 1) : 1;
              var hugHands = dirC > 0 ? [[0.16, -0.5, -0.1], [0.43, -0.48, Math.PI * 0.85]]
                                      : [[-0.43, -0.48, Math.PI * 0.15], [-0.16, -0.5, Math.PI + 0.1]];
              o.hands = [[lerp(o.hands[0][0], hugHands[0][0], hugK), lerp(o.hands[0][1], hugHands[0][1], hugK), hugHands[0][2]],
                         [lerp(o.hands[1][0], hugHands[1][0], hugK), lerp(o.hands[1][1], hugHands[1][1], hugK), hugHands[1][2]]];
              var since = (p - myLand) * dur;
              o.eye = since > 120 ? 'happy' : 'wow';
              o.mouth = 0.75;
              o.rot = Math.sin(since * 0.006) * 0.06 * clamp01(since / 300);
              o.tilt = dirC * 0.12 * hugK;
              var land2 = since < 300 ? Math.sin(since / 300 * Math.PI) * 0.1 : 0;
              o.sy -= land2; o.sx += land2 * 0.6;
            }
          }
          poses.push({ x: bx, y: by, o: o });
        }

        // ─── draw: back of bunnies, buried/held carrots, soil, fronts, flying carrots ───
        for (var bb = 0; bb < poses.length; bb++) bunny(poses[bb].x, poses[bb].y, S, poses[bb].o, 'back');

        function stemFor(Cs, len) {
          if (!Cs.buried) return len * 0.12;
          // stems reach up to the paws (grip height follows the bunny's squash)
          var sy = poses[0].o.sy;
          var gripWorld = gy + (-0.36 * S * sy);
          var topY = Cs.y - len * 0.5;
          return Math.max(len * 0.08, topY - gripWorld);
        }
        // buried carrot: clipped at the ground so only its shoulder peeks out
        function drawCarrotState(Cs, len) {
          var gk = Cs.buried ? 0.25 + 0.5 * clamp01(peek / 0.14) : 1;
          if (Cs.buried) {
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, W, gy - S * 0.02); ctx.rect(0, 0, 0, 0); ctx.clip();
            carrot(Cs.x, Cs.y, len, Cs.rot, stemFor(Cs, len), gk * 0.6, t, 1);
            ctx.restore();
          } else carrot(Cs.x, Cs.y, len, Cs.rot, stemFor(Cs, len), gk, t, 1);
        }
        if (C1.buried) drawCarrotState(C1, L);
        if (C2 && C2.buried && p > T.pop) {
          // the second carrot's leaves poke out of the hole and wiggle before it pops
          var wk = (p - T.pop) / (T.pop2 - T.pop);
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, gy - S * 0.03); ctx.clip();
          carrot(cx + Math.sin(t * 0.05) * S * 0.02 * wk, gy + L2 * 0.5 + L2 * 0.03 - L2 * 0.1 * wk, L2, Math.sin(t * 0.04) * 0.08 * wk, L2 * 0.1, 0.4 * wk, t, 3);
          ctx.restore();
        }
        var holeK = p > T.pop ? easeOut((p - T.pop) * dur / 200) : 0;
        soil(cx, gy, S, holeK, tugging ? Math.max(0, squash) : 0, t, isSuper ? [-1.05, 1.0, -1.25, 1.2] : [-0.52, 0.5, -0.66, 0.68]);
        if (C1.inHand) drawCarrotState(C1, L);
        if (C2 && C2.inHand) drawCarrotState(C2, L2);
        for (var bf = 0; bf < poses.length; bf++) bunny(poses[bf].x, poses[bf].y, S, poses[bf].o, 'front');
        if (!C1.buried && !C1.inHand) drawCarrotState(C1, L);
        if (C2 && !C2.buried && !C2.inHand) drawCarrotState(C2, L2);

        // flash ring at each pop
        [T.pop, isSuper ? T.pop2 : -1].forEach(function (pa) {
          if (pa < 0) return;
          var fq = (p - pa) * dur / 380;
          if (fq <= 0 || fq >= 1) return;
          ctx.globalAlpha = gFade * (1 - fq) * (1 - fq);
          ctx.strokeStyle = '#FFF0A0'; ctx.lineWidth = S * 0.06 * (1 - fq);
          ctx.beginPath(); ctx.ellipse(cx, gy - S * 0.05, S * (0.3 + 1.0 * easeOut(fq)), S * (0.1 + 0.28 * easeOut(fq)), 0, 0, TAU); ctx.stroke();
          var fg = ctx.createRadialGradient(cx, gy - S * 0.3, 0, cx, gy - S * 0.3, S * 1.4);
          fg.addColorStop(0, hexA('#FFF4C0', 0.6 * (1 - fq))); fg.addColorStop(1, hexA('#FFD23F', 0));
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, gy - S * 0.3, S * 1.4, 0, TAU); ctx.fill();
          ctx.globalAlpha = gFade;
        });

        // soil crumbs (ballistic)
        var grav = S * 9;
        for (var c = 0; c < crumbs.length; c++) {
          var cr = crumbs[c], ct = (t - cr.at * dur) / 1000;
          if (ct <= 0 || ct > 0.7) continue;
          var crx = cx + cr.vx * S * ct * 0.6, cry = gy - S * 0.08 + cr.vy * S * ct + 0.5 * grav * ct * ct;
          if (cry > gy + S * 0.05) continue;
          ctx.globalAlpha = gFade * clamp01((0.7 - ct) * 5);
          ctx.fillStyle = cr.col;
          ctx.beginPath(); ctx.ellipse(crx, cry, cr.r * S, cr.r * S * 0.8, cr.rot + ct * 6, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = gFade;

        // sparkle burst
        for (var sp = 0; sp < sparks.length; sp++) {
          var spk = sparks[sp], sq = (t - spk.at * dur) / 900;
          if (sq <= 0 || sq >= 1) continue;
          var dd = S * spk.sp * easeOut(sq) * 1.5;
          var sx2 = cx + Math.cos(spk.a) * dd, sy2 = gy - S * 0.5 + Math.sin(spk.a) * dd * 0.85 + sq * sq * S * 0.4;
          ctx.globalAlpha = gFade * (sq < 0.15 ? sq / 0.15 : 1 - (sq - 0.15) / 0.85);
          ctx.fillStyle = spk.col;
          if (spk.star) { starPath(ctx, sx2, sy2, spk.r * S, spk.rot + sq * 4); ctx.fill(); }
          else { sparkPath(ctx, sx2, sy2, spk.r * S * 1.2); ctx.fill(); }
        }
        ctx.globalAlpha = gFade;

        // hearts drifting up from the hug
        for (var h = 0; h < hearts.length; h++) {
          var ht = hearts[h], hq = (t - ht.at * dur) / 1000;
          if (hq <= 0) continue;
          var who = poses[Math.min(ht.who, poses.length - 1)];
          var hx = who.x + ht.dx * S * 0.8 + Math.sin(hq * 4 + ht.ph) * S * 0.12;
          var hy = gy - S * 1.1 - hq * S * 1.25 * ht.sp;
          var ha = clamp01(hq / 0.15) * clamp01(1.4 - hq);
          if (ha <= 0) continue;
          var hr = ht.r * S * (0.6 + 0.4 * easeOutBack(clamp01(hq / 0.3)));
          ctx.globalAlpha = gFade * ha;
          ctx.fillStyle = ht.col; heartPath(ctx, hx, hy, hr); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(hx - hr * 0.42, hy - hr * 0.38, hr * 0.18, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = gFade;

        // super: ring of stars around the happy pair
        if (isSuper && p > T.ring) {
          var rq = (p - T.ring) / (1 - T.ring);
          var rcx = cx, rcy = gy - S * 0.85;
          var rr = S * (0.6 + 1.25 * easeOutBack(clamp01(rq * 2.2)));
          for (var r2 = 0; r2 < ringStars.length; r2++) {
            var rsI = ringStars[r2], ra = rsI.a + rq * 1.4;
            var rk = clamp01((rq - rsI.d) * 5);
            if (rk <= 0) continue;
            var rx2 = rcx + Math.cos(ra) * rr * 1.25, ry2 = rcy + Math.sin(ra) * rr * 0.72;
            ctx.globalAlpha = gFade * rk;
            ctx.fillStyle = rsI.col;
            starPath(ctx, rx2, ry2, S * 0.085 * (0.85 + 0.15 * Math.sin(t * 0.01 + r2)) * easeOutBack(rk), ra);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.6)';
            ctx.beginPath(); ctx.arc(rx2 - S * 0.02, ry2 - S * 0.02, S * 0.012, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = gFade;
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
