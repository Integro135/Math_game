/* success-jellyfish-glow.js — מסך הצלחה: מֶדוּזוֹת זוֹהֲרוֹת 🪼
   תהלוכת מדוזות ביולומינסנטיות שטה מעלה מתחתית המסך: כל מדוזה — פעמון זוהר
   (גרדיאנט רדיאלי בצבעי הפלטה) הפועם בדחיפות שחייה (הפעמון נמחץ ונמתח, וקצב
   העלייה מתגבר עם כל דחיפה), זרועות תחרה גליות נגררות מתחתיו וזוהר additive
   ('lighter') סביבו. פלנקטון זעיר מנצנץ בין המדוזות כמו אבק כוכבים ימי — קריא
   להפליא על הכיסוי הכהה. בסופר: יותר מדוזות + מדוזת־מלכה גדולה במרכז עם
   כתר נצנוצים. נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד
   window.SUCCESS. */
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

  window.SUCCESS.styles.push({
    name: 'jellyfish-glow',
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
      var praise  = opts.praise || 'זוֹהֶרֶת כָּמוֹךְ!';

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

      // ─── המדוזות ───
      var jellyCols = [glow, primary, mixHex(primary, '#FF9AD5', 0.5), mixHex(glow, '#8CF5D2', 0.5), accent];
      var jellies = [];
      var NJ = isSuper ? 7 : 4;
      for (var i = 0; i < NJ; i++) {
        var r = (30 + Math.random() * 16) * unit;
        jellies.push({
          r: r,
          // פרוסות על הרוחב, נכנסות מתחתית המסך בזמנים שונים
          x0: W * (0.14 + 0.72 * (i + 0.5) / NJ) + (Math.random() - 0.5) * 40 * unit,
          born: (i % 3) * dur * 0.07,
          // מגיעות עד ~30-60% גובה עד סוף המסך
          rise: (H * 0.55 + Math.random() * H * 0.25) / dur * 1000,
          swayAmp: (24 + Math.random() * 22) * unit,
          swayRate: 0.9 + Math.random() * 0.7,
          pulseRate: 2.6 + Math.random() * 1.2,           // דחיפות-שחייה לשנייה (רד/ש')
          phase: Math.random() * 6.2832,
          color: jellyCols[i % jellyCols.length],
          queen: false
        });
      }
      // מדוזת-מלכה (סופר): גדולה, מרכזית, איטית והדורה
      if (isSuper) {
        jellies.push({
          r: 62 * unit, x0: cx0(), born: dur * 0.08,
          rise: (H * 0.62) / dur * 1000,
          swayAmp: 16 * unit, swayRate: 0.5,
          pulseRate: 1.9, phase: 0,
          color: mixHex(primary, accent, 0.35), queen: true
        });
      }
      function cx0() { return W / 2; }

      // ─── פלנקטון מנצנץ (אבק כוכבים ימי) ───
      var plankton = [];
      var NP = isSuper ? 70 : 42;
      var pCols = ['#FFFFFF', glow, mixHex(glow, '#FFFFFF', 0.5), primary];
      for (var p = 0; p < NP; p++) {
        plankton.push({
          x: Math.random() * W,
          y: H * 0.15 + Math.random() * H * 0.8,
          drift: (4 + Math.random() * 14) * unit,
          rate: 0.5 + Math.random() * 1.3,
          tw: Math.random() * 6.2832,
          twRate: 2 + Math.random() * 5,
          size: (0.8 + Math.random() * 1.8) * unit,
          color: pCols[p % pCols.length]
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:14%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = dur * 0.26;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:23%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── מדוזה אחת: פעמון פועם + זרועות גליות + זוהר ──
      function drawJelly(j, t, gFade) {
        var lt = t - j.born;
        if (lt < 0) return;
        var sec = lt / 1000;
        // דחיפת שחייה: sin מועלה בחזקה — התכווצות חדה, שחרור איטי
        var ph = sec * j.pulseRate + j.phase;
        var pulse = Math.pow(Math.max(0, Math.sin(ph)), 1.6);           // 0..1
        // עלייה: בסיס + תוספת עם כל דחיפה (אינטגרל מקורב: המהירות גוברת בפולס)
        var y = H + j.r * 2 - j.rise * sec * (1 + 0.18 * pulse);
        var x = j.x0 + Math.sin(sec * j.swayRate + j.phase) * j.swayAmp;
        if (y < -j.r * 3) return;
        // כניסה רכה מלמטה
        var a = clamp01((H + j.r - y) / (j.r * 2)) * gFade;
        if (a <= 0) return;

        var rx = j.r * (1 + 0.14 * pulse);                // הפעמון נמתח לצדדים בדחיפה
        var ry = j.r * (1 - 0.20 * pulse);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // הילת זוהר רחבה
        var halo = ctx.createRadialGradient(x, y, 0, x, y, j.r * 2.6);
        halo.addColorStop(0, hexA(j.color, 0.20 * a));
        halo.addColorStop(1, hexA(j.color, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, j.r * 2.6, 0, 6.2832); ctx.fill();

        // זרועות תחרה גליות (מאחורי הפעמון)
        var NT = j.queen ? 7 : 5;
        ctx.lineCap = 'round';
        for (var k = 0; k < NT; k++) {
          var frac = NT === 1 ? 0.5 : k / (NT - 1);
          var tx = x + (frac - 0.5) * rx * 1.5;
          var len = j.r * (1.7 + 0.9 * Math.sin(k * 2.1 + j.phase)) * (1 - 0.22 * pulse);
          var wob = Math.sin(sec * 3 + k * 1.7 + j.phase) * j.r * 0.35;
          var grad = ctx.createLinearGradient(tx, y, tx, y + len);
          grad.addColorStop(0, hexA(j.color, 0.5 * a));
          grad.addColorStop(1, hexA(j.color, 0));
          ctx.strokeStyle = grad;
          ctx.lineWidth = (k === (NT - 1) / 2 ? 3.4 : 2) * unit;
          ctx.beginPath();
          ctx.moveTo(tx, y + ry * 0.5);
          ctx.quadraticCurveTo(tx + wob, y + len * 0.55, tx + wob * 0.4, y + len);
          ctx.stroke();
        }

        // הפעמון
        var bell = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.4, 0, x, y, rx * 1.1);
        bell.addColorStop(0, hexA(mixHex(j.color, '#FFFFFF', 0.55), 0.85 * a));
        bell.addColorStop(0.55, hexA(j.color, 0.55 * a));
        bell.addColorStop(1, hexA(j.color, 0.06 * a));
        ctx.fillStyle = bell;
        ctx.beginPath();
        // כיפה: חצי-אליפסה עליונה + תחתית גלית עדינה
        ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
        var hem = 3;
        for (var hh = 0; hh <= hem; hh++) {
          var hx1 = x + rx - (2 * rx * (hh + 0.5)) / (hem + 0.5);
          ctx.quadraticCurveTo(hx1 + rx / (hem + 1) / 2, y + ry * 0.28 + pulse * 2 * unit, hx1, y + ry * 0.1);
        }
        ctx.closePath();
        ctx.fill();
        // שפת פעמון זוהרת
        ctx.strokeStyle = hexA(mixHex(j.color, '#FFFFFF', 0.6), 0.7 * a);
        ctx.lineWidth = 1.6 * unit;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0);
        ctx.stroke();
        // ליבה זוהרת בתוך הפעמון
        ctx.fillStyle = hexA('#FFFFFF', (0.25 + 0.30 * pulse) * a);
        ctx.beginPath();
        ctx.ellipse(x, y - ry * 0.25, rx * 0.34, ry * 0.3, 0, 0, 6.2832);
        ctx.fill();

        // כתר נצנוצים למלכה
        if (j.queen) {
          for (var c = -2; c <= 2; c++) {
            var ca = -Math.PI / 2 + c * 0.35;
            var sx = x + Math.cos(ca) * (ry + 10 * unit);
            var sy = y - ry * 0.15 + Math.sin(ca) * (ry + 10 * unit);
            var twk = 0.5 + 0.5 * Math.sin(sec * 6 + c * 2);
            ctx.fillStyle = hexA(accent, 0.9 * twk * a);
            ctx.beginPath(); ctx.arc(sx, sy, (2.2 + twk * 1.6) * unit, 0, 6.2832); ctx.fill();
          }
        }
        ctx.restore();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // פלנקטון מנצנץ
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var p = 0; p < plankton.length; p++) {
          var pk = plankton[p];
          var sec = t / 1000;
          var px = pk.x + Math.sin(sec * pk.rate + pk.tw) * pk.drift;
          var py = pk.y - sec * 12 * unit;
          var twk = 0.5 + 0.5 * Math.sin(sec * pk.twRate + pk.tw);
          ctx.fillStyle = hexA(pk.color, 0.55 * twk * gFade);
          ctx.beginPath(); ctx.arc(px, py, pk.size * (0.7 + 0.5 * twk), 0, 6.2832); ctx.fill();
        }
        ctx.restore();

        // המדוזות (מלכה אחרונה = מעל כולן)
        for (var i = 0; i < jellies.length; i++) drawJelly(jellies[i], t, gFade);

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
