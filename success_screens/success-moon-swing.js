/* success-moon-swing.js — מסך הצלחה: נַדְנֵדָה עַל הַיָּרֵחַ 🌙⭐
   סהר ירח זהוב תלוי על שני חבלים מראש המסך ומתנדנד כמו נדנדה (מטוטלת רכה
   שמתעוררת ואז דועכת בעדינות), ועליו יושבת כוכבת קטנה וחייכנית שרגליה
   משתלשלות. עם כל נדנוד נושר אבק כוכבים זהוב מקצה הסהר; כוכבי רקע מנצנצים.
   בסופר: תנופה גדולה יותר, הילה סביב הירח, וכוכבים נופלים חוצים את השמיים.
   קריא להפליא מעל הכיסוי הכהה (ירח זהוב על לילה). נרשם לפי החוזה
   ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255;
    var g = Math.round(g1 + (g2 - g1) * t) & 255;
    var b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  // כוכב חמש-קצוות
  function starPath(ctx, x, y, rOut, rIn, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rIn : rOut;
      var a = rot + (i / 10) * 6.2832 - 1.5708;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  window.SUCCESS.styles.push({
    name: 'moon-swing',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      var praise  = opts.praise || 'מַגִּיעָה לַיָּרֵחַ!';

      var W = root.clientWidth || window.innerWidth || 342;
      var H = root.clientHeight || window.innerHeight || 455;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);

      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(W * DPR));
      cv.height = Math.max(1, Math.round(H * DPR));
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var unit = Math.min(W, H) / 800;

      // ─── המטוטלת ───
      var ax = W / 2, ay = -20 * unit;                     // עוגן מעל המסך
      var L = H * 0.5;                                     // אורך החבלים
      var A0 = isSuper ? 0.5 : 0.38;                       // תנופה מרבית (רדיאנים)
      var omega = 0.0021;                                  // מהירות הנדנוד (רד/מ״ש)
      var MR = (isSuper ? 88 : 74) * unit;                 // רדיוס הסהר
      var moonGold = mixHex(accent, '#FFF2C0', 0.35);

      // ─── כוכבי רקע מנצנצים ───
      var stars = [];
      var NST = isSuper ? 46 : 30;
      for (var s = 0; s < NST; s++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H * 0.85,
          tw: Math.random() * 6.2832, rate: 2 + Math.random() * 5,
          size: (0.8 + Math.random() * 1.9) * unit,
          color: s % 5 === 0 ? glow : s % 7 === 0 ? primary : '#FFFFFF'
        });
      }

      // ─── אבק כוכבים נושר מקצה הסהר ───
      var dust = [];
      var ND = isSuper ? 34 : 20;
      for (var d = 0; d < ND; d++) {
        dust.push({
          born: dur * 0.12 + Math.random() * dur * 0.7,
          life: 800 + Math.random() * 700,
          vx: (Math.random() - 0.5) * 40 * unit,
          fall: (50 + Math.random() * 80) * unit,
          size: (1.2 + Math.random() * 2.2) * unit,
          tw: Math.random() * 6.2832
        });
      }

      // ─── כוכבים נופלים (סופר) ───
      var meteors = [];
      if (isSuper) for (var m = 0; m < 3; m++) {
        meteors.push({
          x0: W * (0.15 + 0.3 * m), y0: H * (0.05 + 0.06 * m),
          born: dur * (0.3 + 0.18 * m), speed: (300 + m * 60) * unit,
          ang: 0.6 + m * 0.12
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:12%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = dur * 0.28;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:21%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';

        // כוכבי רקע מנצנצים
        for (var s = 0; s < stars.length; s++) {
          var st = stars[s];
          var twk = 0.4 + 0.6 * Math.sin(t / 1000 * st.rate + st.tw);
          ctx.fillStyle = hexA(st.color, 0.8 * twk * gFade);
          starPath(ctx, st.x, st.y, st.size * 2, st.size * 0.8, t * 0.0004 + st.tw);
          ctx.fill();
        }

        // זווית המטוטלת: מתעוררת ב-15% הראשונים, דועכת קלות בסוף
        var wake = clamp01(t / (dur * 0.18));
        var damp = 1 - 0.25 * clamp01((t - dur * 0.7) / (dur * 0.3));
        var th = A0 * wake * damp * Math.sin(t * omega + 4.7);

        // מרכז הסהר על המטוטלת
        var mx = ax + Math.sin(th) * L;
        var my = ay + Math.cos(th) * L;

        // חבלים (שניים, אל שתי קצוות הסהר)
        var ropeSpread = MR * 0.72;
        ctx.strokeStyle = hexA('#C8B080', 0.85 * gFade);
        ctx.lineWidth = 2.4 * unit;
        ctx.beginPath();
        ctx.moveTo(ax - 14 * unit, ay);
        ctx.lineTo(mx - Math.cos(th) * ropeSpread, my - 8 * unit + Math.sin(th) * ropeSpread);
        ctx.moveTo(ax + 14 * unit, ay);
        ctx.lineTo(mx + Math.cos(th) * ropeSpread, my - 8 * unit - Math.sin(th) * ropeSpread);
        ctx.stroke();

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(th * 0.55);                             // הסהר נוטה מעט עם התנופה

        // הילה סביב הירח
        var haloR = MR * (isSuper ? 2.2 : 1.8);
        var halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
        halo.addColorStop(0, hexA(moonGold, (isSuper ? 0.35 : 0.26) * gFade));
        halo.addColorStop(1, hexA(moonGold, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, haloR, 0, 6.2832); ctx.fill();

        // הסהר: עיגול מלא פחות עיגול מוסט (חיתוך destination-out על שכבה)
        // מצויר ידנית עם שני קשתות — קשת חיצונית + קשת פנימית הפוכה
        var inR = MR * 0.78, inOff = MR * 0.5;
        var moonG = ctx.createLinearGradient(-MR, -MR, MR, MR);
        moonG.addColorStop(0, hexA(mixHex(moonGold, '#FFFFFF', 0.4), gFade));
        moonG.addColorStop(1, hexA(moonGold, gFade));
        ctx.fillStyle = moonG;
        ctx.beginPath();
        ctx.arc(0, 0, MR, -1.85, 1.85, false);             // הקשת החיצונית (פונה שמאלה)
        ctx.arc(inOff, 0, inR, 1.62, -1.62, true);         // הפְּנים החתוך
        ctx.closePath();
        ctx.fill();
        // קו שפה עדין
        ctx.strokeStyle = hexA('#FFFFFF', 0.35 * gFade);
        ctx.lineWidth = 1.6 * unit;
        ctx.stroke();
        // מכתשים קטנים על הסהר
        ctx.fillStyle = hexA(mixHex(moonGold, '#B08830', 0.6), 0.5 * gFade);
        ctx.beginPath(); ctx.arc(-MR * 0.62, -MR * 0.28, MR * 0.09, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(-MR * 0.5, MR * 0.34, MR * 0.07, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(-MR * 0.72, MR * 0.05, MR * 0.05, 0, 6.2832); ctx.fill();

        // הכוכבת הקטנה יושבת על הקשת הפנימית של הסהר
        var sx = MR * 0.02, sy = -MR * 0.22;
        var sR = MR * 0.34;
        var bob = Math.sin(t * 0.006) * 2 * unit;
        // רגליים משתלשלות (שתי קשתות קטנות מתנדנדות)
        ctx.strokeStyle = hexA(accent, 0.95 * gFade);
        ctx.lineWidth = 3.4 * unit;
        ctx.lineCap = 'round';
        var kick = Math.sin(t * 0.008) * 0.35;
        ctx.beginPath();
        ctx.moveTo(sx - sR * 0.3, sy + sR * 0.75 + bob);
        ctx.quadraticCurveTo(sx - sR * 0.42, sy + sR * 1.4 + bob, sx - sR * (0.5 + kick * 0.15), sy + sR * 1.75 + bob);
        ctx.moveTo(sx + sR * 0.3, sy + sR * 0.75 + bob);
        ctx.quadraticCurveTo(sx + sR * 0.42, sy + sR * 1.45 + bob, sx + sR * (0.5 - kick * 0.15), sy + sR * 1.8 + bob);
        ctx.stroke();
        // גוף הכוכבת
        var starG = ctx.createRadialGradient(sx - sR * 0.2, sy - sR * 0.2 + bob, 0, sx, sy + bob, sR * 1.3);
        starG.addColorStop(0, hexA('#FFF6D0', gFade));
        starG.addColorStop(1, hexA(accent, gFade));
        ctx.fillStyle = starG;
        starPath(ctx, sx, sy + bob, sR, sR * 0.5, Math.sin(t * 0.003) * 0.15);
        ctx.fill();
        ctx.strokeStyle = hexA('#E8A020', 0.7 * gFade);
        ctx.lineWidth = 1.6 * unit;
        ctx.stroke();
        // פנים: עיניים + חיוך
        ctx.fillStyle = hexA('#5A3A10', gFade);
        ctx.beginPath(); ctx.arc(sx - sR * 0.22, sy - sR * 0.08 + bob, sR * 0.08, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + sR * 0.22, sy - sR * 0.08 + bob, sR * 0.08, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = hexA('#5A3A10', 0.9 * gFade);
        ctx.lineWidth = 1.8 * unit;
        ctx.beginPath();
        ctx.arc(sx, sy + sR * 0.12 + bob, sR * 0.2, 0.35, 2.8);
        ctx.stroke();
        ctx.restore();

        // אבק כוכבים נושר מקצה הסהר התחתון
        var tipX = mx + Math.sin(th * 0.55) * MR * 0.2 - Math.cos(th * 0.55) * 0;
        var tipY = my + MR * 0.9;
        for (var d = 0; d < dust.length; d++) {
          var du = dust[d];
          if (t < du.born) continue;
          var q = clamp01((t - du.born) / du.life);
          if (q >= 1) continue;
          var dxp = tipX + du.vx * q + Math.sin(q * 7 + du.tw) * 6 * unit;
          var dyp = tipY + du.fall * q;
          var da = Math.sin(Math.PI * q) * (0.5 + 0.5 * Math.sin(t * 0.02 + du.tw)) * gFade;
          ctx.fillStyle = hexA(accent, da);
          starPath(ctx, dxp, dyp, du.size * 1.8, du.size * 0.7, q * 4);
          ctx.fill();
        }

        // כוכבים נופלים (סופר)
        for (var m = 0; m < meteors.length; m++) {
          var mt = meteors[m];
          if (t < mt.born) continue;
          var lt = (t - mt.born) / 1000;
          var mxp = mt.x0 + Math.cos(mt.ang) * mt.speed * lt;
          var myp = mt.y0 + Math.sin(mt.ang) * mt.speed * lt;
          if (mxp > W + 60 * unit || myp > H) continue;
          var tail = 46 * unit;
          var mg = ctx.createLinearGradient(mxp, myp, mxp - Math.cos(mt.ang) * tail, myp - Math.sin(mt.ang) * tail);
          mg.addColorStop(0, hexA('#FFFFFF', 0.95 * gFade));
          mg.addColorStop(1, hexA(glow, 0));
          ctx.strokeStyle = mg;
          ctx.lineWidth = 2.4 * unit;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(mxp, myp);
          ctx.lineTo(mxp - Math.cos(mt.ang) * tail, myp - Math.sin(mt.ang) * tail);
          ctx.stroke();
        }

        // טקסט
        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
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
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
