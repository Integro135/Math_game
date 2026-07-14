/* success-kite-festival.js — מסך הצלחה: פֶסְטִיבַל עֲפִיפוֹנִים 🪁
   מסך עם רקע בָּהִיר (לא שחור!): שמי צהריים חמים בגרדיאנט תכלת→קרם עם שמש
   קורנת בפינה (קרניים מסתובבות לאט) — הקנבס מצייר רקע צבעוני אטום מעל כיסוי
   המודל (חריגה מכוונת לבקשת המשתמש). שניים-שלושה עפיפוני מעוין בצבעי הפלטה
   דואים במסלולי לולאה (ליסז'ו), כל אחד עם חוט קשתי הנטוי אל מחוץ למסך וזנב
   סרטים ארוך עם פפיונים שמתנפנפים אחריו. נצנוצים לבנים מרצדים בשמיים.
   בסופר: עפיפון נוסף + קרני שמש חזקות יותר + פרץ סרטים מסיים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
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

  window.SUCCESS.styles.push({
    name: 'kite-festival',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var praise  = opts.praise || 'עָפָה עַל עַצְמֵךְ!';

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

      // ─── העפיפונים: מסלול ליסז'ו סביב עוגן, זנב פפיונים, חוט לתחתית ───
      var kites = [];
      var NK = isSuper ? 4 : 2;
      var kCols = [primary, glow, accent, mixHex(primary, '#FF8FB8', 0.5)];
      for (var i = 0; i < NK; i++) {
        kites.push({
          ax: W * (NK === 2 ? (i ? 0.66 : 0.34) : 0.2 + 0.6 * i / (NK - 1)),
          ay: H * (0.34 + 0.1 * (i % 2)),
          rx: (70 + 26 * (i % 2)) * unit,
          ry: (44 + 18 * ((i + 1) % 2)) * unit,
          fx: 0.9 + 0.25 * i, fy: 1.3 + 0.2 * i,          // תדרי הלולאה
          ph: i * 1.7,
          size: (isSuper ? 46 : 52) * unit * (1 - 0.12 * (i % 2)),
          color: kCols[i % kCols.length],
          anchorX: W * (0.3 + 0.4 * i / Math.max(1, NK - 1))
        });
      }

      // ─── נצנוצים מרצדים בשמיים ───
      var sparks = [];
      var NS = isSuper ? 34 : 20;
      for (var s = 0; s < NS; s++) {
        sparks.push({
          x: Math.random() * W, y: H * (0.08 + Math.random() * 0.6),
          tw: Math.random() * 6.2832, rate: 3 + Math.random() * 5,
          size: (1 + Math.random() * 2) * unit
        });
      }

      // ─── פרץ סרטים מסיים (סופר) ───
      var finaleAt = dur * 0.72, streamers = [];
      if (isSuper) for (var f = 0; f < 22; f++) {
        streamers.push({
          ang: -Math.PI / 2 + (Math.random() - 0.5) * 2.2,
          speed: (200 + Math.random() * 180) * unit,
          len: (14 + Math.random() * 12) * unit,
          color: kCols[f % kCols.length],
          wob: Math.random() * 6.2832
        });
      }

      // ─── טקסט שבח — צל כהה חזק לקריאוּת על שמיים בהירים ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:#FFFFFF;' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 3px 10px rgba(60,30,90,.6),0 0 22px ' + hexA(primary, 0.85) + ',0 1px 2px rgba(60,30,90,.8)';
      root.appendChild(txt);
      var txtAt = dur * 0.28;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:22%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:#FFF6DC;font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 2px 8px rgba(60,30,90,.7),0 0 14px ' + hexA(accent, 0.9);
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── הרקע הבהיר: צהריים חמים + שמש עם קרניים מסתובבות ──
      function drawSky(t, bgA) {
        ctx.save();
        ctx.globalAlpha = bgA;
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#8CCBF2');
        g.addColorStop(0.5, '#C0E4F8');
        g.addColorStop(1, '#FFF0CE');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // שמש עם קרניים מסתובבות לאט
        var sx = W * 0.14, sy = H * 0.16, sr = 46 * unit;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.00012);
        ctx.fillStyle = 'rgba(255,222,120,' + (isSuper ? 0.5 : 0.38) + ')';
        var NR = 12;
        for (var r = 0; r < NR; r++) {
          var a1 = (r / NR) * 6.2832, halfw = 0.10;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a1 - halfw) * sr * 1.25, Math.sin(a1 - halfw) * sr * 1.25);
          ctx.lineTo(Math.cos(a1) * sr * (2.4 + 0.4 * (r % 2)), Math.sin(a1) * sr * (2.4 + 0.4 * (r % 2)));
          ctx.lineTo(Math.cos(a1 + halfw) * sr * 1.25, Math.sin(a1 + halfw) * sr * 1.25);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        var sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 1.6);
        sun.addColorStop(0, '#FFF6D8');
        sun.addColorStop(0.55, '#FFE38A');
        sun.addColorStop(1, 'rgba(255,227,138,0)');
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(sx, sy, sr * 1.6, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      // ── עפיפון אחד: מעוין + צלב מקלות + חוט + זנב פפיונים ──
      function drawKite(k, t, a) {
        var sec = t / 1000;
        var x = k.ax + Math.sin(sec * k.fx + k.ph) * k.rx;
        var y = k.ay + Math.sin(sec * k.fy + k.ph * 1.3) * k.ry;
        // כיוון הטיסה (נגזרת המסלול) → זווית העפיפון
        var dx = Math.cos(sec * k.fx + k.ph) * k.rx * k.fx;
        var dy = Math.cos(sec * k.fy + k.ph * 1.3) * k.ry * k.fy;
        var ang = Math.atan2(dy, dx) + Math.PI / 2;

        // החוט: קשת אל עוגן מתחת למסך
        ctx.strokeStyle = 'rgba(90,70,50,' + 0.55 * a + ')';
        ctx.lineWidth = 1.4 * unit;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo((x + k.anchorX) / 2 - 40 * unit, (y + H + 60 * unit) / 2 + 40 * unit,
                             k.anchorX, H + 60 * unit);
        ctx.stroke();

        // זנב: עקומה נגררת עם פפיונים
        var NT = 6;
        ctx.lineWidth = 1.6 * unit;
        for (var b = 1; b <= NT; b++) {
          var f = b / NT;
          var tx = x - Math.cos(ang - Math.PI / 2) * k.size * (0.9 + f * 2.2)
                   + Math.sin(sec * 3 + b * 1.2 + k.ph) * 10 * unit * f;
          var ty = y - Math.sin(ang - Math.PI / 2) * k.size * (0.9 + f * 2.2)
                   + Math.cos(sec * 2.6 + b * 1.4 + k.ph) * 8 * unit * f;
          if (b === 1) {
            ctx.strokeStyle = 'rgba(90,70,50,' + 0.5 * a + ')';
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(ang - Math.PI / 2) * k.size * 0.72,
                       y - Math.sin(ang - Math.PI / 2) * k.size * 0.72);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
          // פפיון (שני משולשים)
          var bs = (5.5 - f * 2) * unit;
          var bc = b % 2 ? mixHex(k.color, '#FFFFFF', 0.4) : k.color;
          ctx.fillStyle = hexA(bc, 0.95 * a);
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(Math.sin(sec * 4 + b) * 0.6);
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(-bs * 1.6, -bs); ctx.lineTo(-bs * 1.6, bs); ctx.closePath();
          ctx.moveTo(0, 0); ctx.lineTo(bs * 1.6, -bs); ctx.lineTo(bs * 1.6, bs); ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // גוף המעוין
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        var s = k.size;
        var g = ctx.createLinearGradient(-s, -s, s, s);
        g.addColorStop(0, hexA(mixHex(k.color, '#FFFFFF', 0.35), a));
        g.addColorStop(1, hexA(k.color, a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.72, 0);
        ctx.lineTo(0, s * 1.25);
        ctx.lineTo(-s * 0.72, 0);
        ctx.closePath();
        ctx.fill();
        // מסגרת + צלב מקלות
        ctx.strokeStyle = hexA(mixHex(k.color, '#402850', 0.45), 0.9 * a);
        ctx.lineWidth = 2 * unit;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.25);
        ctx.moveTo(-s * 0.72, 0); ctx.lineTo(s * 0.72, 0);
        ctx.stroke();
        // ברק
        ctx.fillStyle = 'rgba(255,255,255,' + 0.4 * a + ')';
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.62);
        ctx.lineTo(s * 0.34, -s * 0.08);
        ctx.lineTo(s * 0.05, -s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        var bgA = Math.min(1, t / 200) * gFade;
        ctx.clearRect(0, 0, W, H);

        drawSky(t, bgA);

        // נצנוצים מרצדים
        for (var s = 0; s < sparks.length; s++) {
          var sk = sparks[s];
          var twk = 0.5 + 0.5 * Math.sin(t / 1000 * sk.rate + sk.tw);
          ctx.fillStyle = 'rgba(255,255,255,' + 0.75 * twk * bgA + ')';
          ctx.beginPath(); ctx.arc(sk.x, sk.y, sk.size * (0.6 + 0.6 * twk), 0, 6.2832); ctx.fill();
        }

        // העפיפונים (בכניסה רכה — צפים פנימה עם הרקע)
        var kA = Math.min(1, t / 340) * gFade;
        for (var i = 0; i < kites.length; i++) drawKite(kites[i], t, kA);

        // פרץ סרטים מסיים (סופר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 850);
          if (fq < 1) {
            for (var fi = 0; fi < streamers.length; fi++) {
              var st = streamers[fi];
              var fd = st.speed * easeOutCubic(fq);
              var fx = W / 2 + Math.cos(st.ang) * fd + Math.sin(fq * 9 + st.wob) * 12 * unit;
              var fy = H * 0.5 + Math.sin(st.ang) * fd + 60 * unit * fq * fq;
              ctx.strokeStyle = hexA(st.color, 0.9 * (1 - fq) * gFade);
              ctx.lineWidth = 3 * unit;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.quadraticCurveTo(fx - Math.cos(st.ang) * st.len * 0.6, fy - Math.sin(st.ang) * st.len * 0.6 + 5 * unit,
                                   fx - Math.cos(st.ang) * st.len, fy - Math.sin(st.ang) * st.len);
              ctx.stroke();
            }
          }
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
