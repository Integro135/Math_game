/* success-carousel-spin.js — מסך הצלחה: קָרוּסֵלָה מִסְתּוֹבֶבֶת
   קָרוּסֵלָה (סוּסֵי לוּנָה־פַּארְק 🦄/🐴) סובבים סביב עמוד מרכזי זוהר על אֶלִיפְּסַת
   פֶּרְסְפֶּקְטִיבָה — סוסים מלפנים גדולים יותר ומצוירים מעל, מאחור קטנים יותר; כל
   סוס מתנדנד למעלה־ולמטה על העמוד שלו (סינוס, פאזה שונה). מעל — גָּג מְשֻׁנָּן עם
   טבעת נורות מנצנצות בצבעי הפלטה שרודפות במעגל. הקרוסלה מואצת לאט עד למהירות,
   ניצוצות נושרים, והשבח מופיע מעל הגג. בסופר: סיבוב מהיר יותר, 7 סוסים, רדיפת אור
   בהירה יותר, וטבעת ניצוצות סיום. נרשם לפי החוזה ב-success_screens_spec.md —
   ללא גלובלים מלבד window.SUCCESS. */
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
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'carousel-spin',
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
      var praise  = opts.praise || 'אַתְּ נְסִיכָה שֶׁל הַקָּרוּסֵלָה!';

      var W = root.clientWidth || window.innerWidth;
      var H = root.clientHeight || window.innerHeight;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);

      var cv = document.createElement('canvas');
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      var unit = Math.min(W, H) / 800;                 // קנה מידה למסכים קטנים (גם 342×455)
      var cx = W / 2, cy = H * 0.52;                   // מרכז הקרוסלה
      var rx = Math.min(W * 0.34, 150 * unit * 1.9);   // חצי־ציר אופקי של האליפסה
      var ry = rx * 0.34;                              // חצי־ציר אנכי (פרספקטיבה)
      var poleTop = cy - ry - 96 * unit;               // ראש העמוד / בסיס הגג
      var bobAmp = 14 * unit;                          // משרעת ניד הסוס על העמוד

      // ─── סוסי הקרוסלה ───
      var MOUNTS = isSuper ? 7 : 5;
      var mountGlyphs = ['🦄', '🐴'];
      var mounts = [];
      for (var m = 0; m < MOUNTS; m++) {
        mounts.push({
          base: (m / MOUNTS) * 6.2832,                 // זווית מוצא סביב הטבעת
          glyph: mountGlyphs[m % 2],
          bobPhase: Math.random() * 6.2832,
          bobRate: 3.4 + Math.random() * 0.8           // קצב הניד (פר שנייה)
        });
      }
      var mountSize = (52 + (isSuper ? 0 : 6)) * unit;  // גודל בסיס; משתנה לפי עומק

      // ─── תזמון הסיבוב: האצה רכה עד מהירות, ואז שיוט ───
      var spinUp = dur * 0.42;                          // זמן ההאצה
      var topSpeed = (isSuper ? 3.2 : 2.0);             // סל"ש בשיא (רדיאן/שנייה)
      var spinDir = -1;                                 // נגד כיוון השעון
      // אינטגרל הזווית: בשלב ההאצה easeOut על המהירות; אחריו ליניארי
      function spinAngle(ts) {                          // ts בשניות
        var s;
        if (ts < spinUp / 1000) {
          var q = ts / (spinUp / 1000);
          // אינטגרל מקורב של מהירות עולה (q^? ) — שטח מתחת לעקומת easeOutCubic
          var v = easeOutCubic(q);
          s = topSpeed * (spinUp / 1000) * (0.5 * q + 0.5 * q * v);
        } else {
          var qFull = spinUp / 1000;
          var vFull = easeOutCubic(1);
          var sBase = topSpeed * qFull * (0.5 + 0.5 * vFull);
          s = sBase + topSpeed * (ts - qFull);
        }
        return spinDir * s;
      }

      // ─── נורות הגג ───
      var BULBS = isSuper ? 22 : 16;
      var bulbCols = [accent, glow, primary, '#FFFFFF'];

      // ─── שיני הגג (סְקָאלוֹפּ) ───
      var SCALLOPS = isSuper ? 12 : 9;

      // ─── ניצוצות שנושרים מהקרוסלה ───
      var sparks = [];
      var NS = isSuper ? 60 : 36;
      var sparkCols = ['#FFFFFF', accent, glow, '#FFFFFF', primary];
      for (var s = 0; s < NS; s++) {
        var ssA = Math.random() * 6.2832;
        sparks.push({
          ang: ssA,
          rad: (0.4 + Math.random() * 0.7),             // שבר מ-rx
          born: Math.random() * dur * 0.7,
          life: 600 + Math.random() * 700,
          rise: (20 + Math.random() * 60) * unit,
          drift: (Math.random() - 0.5) * 40 * unit,
          size: (1 + Math.random() * 2.2) * unit,
          tw: Math.random() * 6.28,
          color: sparkCols[s % sparkCols.length]
        });
      }

      // ─── טבעת ניצוצות סיום (סופר) ───
      var finaleAt = dur * 0.74;
      var finale = [];
      if (isSuper) {
        var NF = 40;
        for (var fI = 0; fI < NF; fI++) {
          finale.push({
            ang: (fI / NF) * 6.2832 + Math.random() * 0.1,
            speed: (130 + Math.random() * 90) * unit,
            size: (1.6 + Math.random() * 2.4) * unit,
            color: sparkCols[fI % sparkCols.length]
          });
        }
      }

      // ─── טקסט שבח (מעל הגג) ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:14%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = dur * 0.30;

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

      // ── מצייר את עמוד המרכז + ההילה ──
      function drawPole(t, gFade, rise) {
        var glowPulse = 0.55 + 0.45 * Math.sin(t * 0.005);
        // הילת מרכז
        var halo = ctx.createRadialGradient(cx, cy - ry * 0.2, 0, cx, cy - ry * 0.2, 150 * unit);
        halo.addColorStop(0, hexA(accent, (0.34 + 0.18 * glowPulse) * rise * gFade));
        halo.addColorStop(0.5, hexA(primary, 0.12 * rise * gFade));
        halo.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy - ry * 0.2, 150 * unit, 0, 6.2832); ctx.fill();

        // העמוד עצמו — גליל זוהר עם פסי זהב לולייניים
        var pw = 11 * unit;
        var grad = ctx.createLinearGradient(cx - pw, 0, cx + pw, 0);
        grad.addColorStop(0, hexA(primary, 0.55 * gFade));
        grad.addColorStop(0.45, hexA('#FFFFFF', 0.92 * gFade));
        grad.addColorStop(0.55, hexA('#FFFFFF', 0.92 * gFade));
        grad.addColorStop(1, hexA(primary, 0.55 * gFade));
        ctx.fillStyle = grad;
        ctx.fillRect(cx - pw, poleTop, pw * 2, (cy + ry) - poleTop);

        // פסי זהב לולייניים (אשליית סיבוב על העמוד)
        ctx.lineWidth = 3 * unit;
        ctx.lineCap = 'round';
        var sp = spinAngle(t / 1000);
        for (var b = -2; b <= 6; b++) {
          var yy = poleTop + ((b * 26 * unit + (sp * 9 * unit)) % ((cy + ry - poleTop) + 52 * unit));
          if (yy < poleTop - 2 || yy > cy + ry) continue;
          ctx.strokeStyle = hexA(accent, 0.7 * gFade);
          ctx.beginPath();
          ctx.moveTo(cx - pw, yy);
          ctx.lineTo(cx + pw, yy + 14 * unit);
          ctx.stroke();
        }

        // כיפת זהב על ראש העמוד
        ctx.fillStyle = hexA(accent, 0.95 * gFade);
        ctx.beginPath();
        ctx.arc(cx, poleTop, 9 * unit, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.95 * gFade);
        ctx.beginPath();
        ctx.arc(cx, poleTop - 9 * unit, 4.5 * unit, 0, 6.2832);
        ctx.fill();
      }

      // ── מצייר את הגג המשונן + טבעת הנורות ──
      function drawCanopy(t, gFade, rise) {
        var canopyY = poleTop + 6 * unit;
        var crx = rx + 30 * unit;                       // הגג רחב מעט מטבעת הסוסים
        var cryTop = ry + 18 * unit;                    // עומק אנכי של בסיס הגג
        var peakY = canopyY - 70 * unit * rise;         // קודקוד הגג (נפתח כלפי מעלה)

        // גוף הגג — מניפת משולשים מהקודקוד אל בסיס אליפטי
        for (var sc = 0; sc < SCALLOPS; sc++) {
          var a0 = Math.PI + (sc / SCALLOPS) * Math.PI;
          var a1 = Math.PI + ((sc + 1) / SCALLOPS) * Math.PI;
          var x0 = cx + Math.cos(a0) * crx, y0 = canopyY + Math.sin(a0) * cryTop;
          var x1 = cx + Math.cos(a1) * crx, y1 = canopyY + Math.sin(a1) * cryTop;
          ctx.fillStyle = sc % 2
            ? hexA(primary, 0.82 * gFade)
            : hexA(accent, 0.82 * gFade);
          ctx.beginPath();
          ctx.moveTo(cx, peakY);
          ctx.lineTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.closePath();
          ctx.fill();
        }
        // הדגשת קצה זוהרת לאורך בסיס הגג
        ctx.strokeStyle = hexA('#FFFFFF', 0.55 * gFade);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        ctx.ellipse(cx, canopyY, crx, cryTop, 0, Math.PI, 0);
        ctx.stroke();

        // קצוות מעוגלים תחתונים (סקאלופ) — חרוזים קטנים בקצה כל משולש
        for (var sb = 0; sb <= SCALLOPS; sb++) {
          var ab = Math.PI + (sb / SCALLOPS) * Math.PI;
          var bx = cx + Math.cos(ab) * crx, by = canopyY + Math.sin(ab) * cryTop;
          ctx.fillStyle = hexA(accent, 0.85 * gFade);
          ctx.beginPath();
          ctx.arc(bx, by, 4 * unit, 0, 6.2832);
          ctx.fill();
        }

        // דגלון מתנופף בראש הגג
        var flagW = 22 * unit * rise;
        var fl = Math.sin(t * 0.006) * 6 * unit;
        ctx.fillStyle = hexA(glow, 0.9 * gFade);
        ctx.beginPath();
        ctx.moveTo(cx, peakY - 22 * unit);
        ctx.lineTo(cx + flagW, peakY - 22 * unit + 6 * unit + fl);
        ctx.lineTo(cx, peakY - 8 * unit);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexA('#FFFFFF', 0.7 * gFade);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        ctx.moveTo(cx, peakY - 24 * unit);
        ctx.lineTo(cx, peakY + 2 * unit);
        ctx.stroke();

        // ── טבעת נורות שרודפות במעגל לאורך בסיס הגג ──
        var chase = t * (isSuper ? 0.011 : 0.008);
        for (var bl = 0; bl < BULBS; bl++) {
          var ba = Math.PI + (bl / (BULBS - 1)) * Math.PI;   // קשת עליונה בלבד
          var bx2 = cx + Math.cos(ba) * crx;
          var by2 = canopyY + Math.sin(ba) * cryTop;
          // גל רדיפה: בהירות נעה סביב הטבעת
          var phase = bl / BULBS * 6.2832;
          var litWave = 0.5 + 0.5 * Math.sin(phase * (isSuper ? 3 : 2) - chase);
          var br = (0.4 + 0.6 * litWave);
          var col = bulbCols[bl % bulbCols.length];
          var bsz = (3.4 + 2.2 * litWave) * unit;
          // זוהר רך
          var bg = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, bsz * 3.2);
          bg.addColorStop(0, hexA(col, 0.9 * br * gFade));
          bg.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.arc(bx2, by2, bsz * 3.2, 0, 6.2832); ctx.fill();
          // הנורה
          ctx.fillStyle = hexA('#FFFFFF', (0.55 + 0.4 * litWave) * gFade);
          ctx.beginPath(); ctx.arc(bx2, by2, bsz * 0.5, 0, 6.2832); ctx.fill();
        }
      }

      // ── מצייר סוס בודד עם עומק ──
      function drawMount(mt, t, gFade, rise) {
        var sp = spinAngle(t / 1000);
        var a = mt.base + sp;
        var ca = Math.cos(a), sa = Math.sin(a);
        var depth = (sa + 1) / 2;                        // 0=אחורי, 1=קדמי
        var x = cx + ca * rx;
        var ringY = cy + sa * ry;                        // מיקום על האליפסה
        // ניד מעלה־מטה על העמוד
        var bob = Math.sin(t / 1000 * mt.bobRate + mt.bobPhase) * bobAmp;
        var y = ringY - 34 * unit * rise + bob;          // הסוס יושב מעל מוט הטבעת
        var scale = (0.62 + 0.5 * depth) * rise;         // קדמי גדול, אחורי קטן
        var alpha = (0.45 + 0.55 * depth) * gFade;

        // מוט אנכי קטן מחבר את הסוס לטבעת
        ctx.strokeStyle = hexA(accent, 0.6 * alpha);
        ctx.lineWidth = 3 * unit * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y + mountSize * scale * 0.42);
        ctx.lineTo(x, ringY + 12 * unit);
        ctx.stroke();

        // צל קרקע רך
        ctx.fillStyle = hexA('#000000', 0.18 * depth * gFade);
        ctx.beginPath();
        ctx.ellipse(x, ringY + 14 * unit, 20 * unit * scale, 6 * unit * scale, 0, 0, 6.2832);
        ctx.fill();

        // הסוס עצמו (אֵמוֹגִ'י על קנבס) — קל הטיה לפי הצד לתחושת קרוסלה
        var tilt = ca * 0.12;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.scale(scale, scale);
        ctx.font = mountSize + 'px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // הילה עדינה מאחורי סוס קדמי
        if (depth > 0.6) {
          ctx.shadowColor = hexA(glow, 0.5);
          ctx.shadowBlur = 16 * unit;
        }
        ctx.fillText(mt.glyph, 0, 0);
        ctx.restore();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // "rise" — הקרוסלה עולה/נבנית בתחילה (גג נפתח, הילה מתמלאת)
        var rise = easeOutCubic(clamp01(t / (dur * 0.22)));

        ctx.lineJoin = 'round';

        // 1) עמוד מרכזי + הילה (מאחור)
        drawPole(t, gFade, rise);

        // 2) סוסים מאחור (depth<0.5) — לפני הגג כדי שהגג לא יכסה אותם בטעות
        //    ממיינים לפי y (sa) כדי שהקדמי יצויר אחרון/מעל.
        var order = mounts.slice().sort(function (p, q) {
          var ap = p.base + spinAngle(t / 1000), aq = q.base + spinAngle(t / 1000);
          return Math.sin(ap) - Math.sin(aq);            // אחורי (sin קטן) קודם
        });

        // 3) הגג מצויר אחרי הסוסים האחוריים ולפני הקדמיים — אבל פשוט יותר:
        //    קודם גג, אחר כך כל הסוסים ממוינים (הסוסים גבוהים מספיק מעל הטבעת).
        //    כדי לשמור על תחושת "מאחורי הגג": סוסים אחוריים מעט שקופים יותר (כבר בעומק).
        drawCanopy(t, gFade, rise);

        for (var oi = 0; oi < order.length; oi++) {
          drawMount(order[oi], t, gFade, rise);
        }

        // 4) ניצוצות נושרים מהקרוסלה
        for (var si = 0; si < sparks.length; si++) {
          var sk = sparks[si];
          if (t < sk.born) continue;
          var sq = clamp01((t - sk.born) / sk.life);
          if (sq >= 1) continue;
          var sAng = sk.ang + spinAngle(t / 1000) * 0.5;
          var sBaseX = cx + Math.cos(sAng) * rx * sk.rad;
          var sBaseY = cy + Math.sin(sAng) * ry * sk.rad;
          var sx = sBaseX + sk.drift * sq;
          var sy = sBaseY - sk.rise * easeOutCubic(sq);  // עולים ומאטים
          var sa2 = Math.sin(Math.PI * sq) * (0.6 + 0.4 * Math.sin(t * 0.02 + sk.tw)) * gFade;
          ctx.fillStyle = hexA(sk.color, sa2);
          ctx.beginPath();
          ctx.arc(sx, sy, sk.size, 0, 6.2832);
          ctx.fill();
        }

        // 5) טבעת ניצוצות סיום (סופר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 900);
          if (fq < 1) {
            var fy = cy - ry * 0.2;
            for (var fi = 0; fi < finale.length; fi++) {
              var fp = finale[fi];
              var fd = fp.speed * easeOutCubic(fq);
              var fxp = cx + Math.cos(fp.ang) * fd;
              var fyp = fy + Math.sin(fp.ang) * fd * 0.6;
              var fa = (1 - fq) * gFade;
              var fsl = (10 * (1 - fq) + 3) * unit;
              ctx.strokeStyle = hexA(fp.color, 0.9 * fa);
              ctx.lineWidth = fp.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(fxp, fyp);
              ctx.lineTo(fxp - Math.cos(fp.ang) * fsl, fyp - Math.sin(fp.ang) * fsl * 0.6);
              ctx.stroke();
            }
          }
        }

        // ─── טקסט ───
        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp > 0 ? easeOutBack(pp) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp * 2, 1) * gFade);
        }

        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        if (killed) return;
        killed = true;
        cancelAnimationFrame(raf);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
      };
    }
  });
})();
