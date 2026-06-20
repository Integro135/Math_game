/* success-peacock-fan.js — מסך הצלחה: מְנִיפַת טַוָּס
   מנקודה נמוכה במרכז נפתחת מניפת זנב טווס נוצצת: נוצות ארוכות ומחודדות
   נפרשות בקשת (eased open), כל נוצה בגרדיאנט פלטה (זוהר→ראשי→הדגשה) ובקצה
   "עין" טווס מנצנצת — טבעות זהב, ראשי, ומרכז טורקיז זוהר עם נצנוץ לבן.
   אחרי הפתיחה המניפה מתנדנדת ברכות והעיניים מרצדות; ניצוצות נושרים מהקצוות.
   בסופר: מניפה רחבה ומלאה יותר (קרוב ל-200°), גל ריצוד שעובר על העיניים,
   וגשם ניצוצות עדין. אלגנטי ומלכותי — מתאים למצב המלכה.
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
  function easeOutElastic(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function lerpHex(h1, h2, m) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    return '#' + [r1 + (r2 - r1) * m, g1 + (g2 - g1) * m, b1 + (b2 - b1) * m]
      .map(function (c) { var s = Math.round(c).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }

  window.SUCCESS.styles.push({
    name: 'peacock-fan',
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
      var praise  = opts.praise || 'אַתְּ מַלְכָּה!';

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

      var unit = Math.min(W, H) / 800;                          // קנה מידה למסכים קטנים
      // נקודת המוצא נמוכה-מרכזית; הנוצות מצביעות כלפי מעלה (90°-)
      var ox = W / 2, oy = H * 0.80;
      var featLen = Math.min(W, H) * (isSuper ? 0.50 : 0.44);   // אורך נוצה
      var openEnd = dur * (isSuper ? 0.42 : 0.40);              // סוף שלב הפתיחה

      // ─── הנוצות: נפרשות בקשת מ--85° עד +85° (או רחב יותר בסופר) ───
      var halfArc = (isSuper ? 99 : 85) * Math.PI / 180;        // חצי קשת ברדיאנים
      var NF = isSuper ? 25 : 17;                                // מספר נוצות (אי-זוגי → אחת במרכז)
      var feathers = [];
      for (var i = 0; i < NF; i++) {
        var frac = NF > 1 ? (i / (NF - 1)) : 0.5;               // 0..1 לרוחב הקשת
        var ang0 = -Math.PI / 2 + (frac - 0.5) * 2 * halfArc;   // זווית סופית (90°- = מעלה)
        // נוצות מהמרכז כלפי חוץ נפתחות בעיכוב מדורג קטן
        var fromCenter = Math.abs(frac - 0.5) * 2;              // 0 במרכז, 1 בקצוות
        var len = featLen * (1 - 0.10 * fromCenter * fromCenter);
        feathers.push({
          finalAng: ang0,
          len: len,
          delay: fromCenter * openEnd * 0.30,                   // הקצוות מאחרות מעט
          twPhase: Math.random() * 6.2832,                      // שלב נצנוץ העין
          swayAmp: (0.020 + 0.020 * fromCenter),                // נדנוד גדול יותר בקצוות
          frac: frac
        });
      }

      // ─── ניצוצות שנושרים מקצות הנוצות ───
      var sparks = [];
      var NS = isSuper ? 60 : 32;
      var scolors = ['#FFFFFF', '#FFFFFF', accent, glow];
      for (var s = 0; s < NS; s++) {
        var sf = feathers[(s * 7 + 3) % feathers.length];
        sparks.push({
          feat: sf,
          born: openEnd * 0.75 + Math.random() * (dur - openEnd * 0.75 - 300),
          life: 600 + Math.random() * 700,
          // היסט קטן סביב קצה הנוצה
          jx: (Math.random() - 0.5) * 26 * unit,
          drift: (Math.random() - 0.5) * 30 * unit,
          fall: (28 + Math.random() * 46) * unit,
          r: (0.8 + Math.random() * 1.6) * unit,
          tw: Math.random() * 6.2832,
          color: scolors[s % scolors.length]
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:30%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = openEnd + 80;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:41%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ─── ציור נוצה בודדת ───
      // ang: זווית הציר; len: אורך; appear: 0..1 כמה הנוצה "צמחה"; alpha; eyeShine 0..1
      function drawFeather(ang, len, appear, alpha, eyeShine) {
        var L = len * appear;
        if (L < 1) return;
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var tipx = ox + ca * L, tipy = oy + sa * L;
        // וקטור ניצב לרוחב הנוצה
        var px = -sa, py = ca;
        var halfW = 24 * unit * appear;                         // חצי רוחב מקסימלי באמצע (נוצה מלאה)

        // ── שדרת הנוצה (גרדיאנט זוהר→ראשי→הדגשה לאורך) + זוהר ענפים רך ──
        var grad = ctx.createLinearGradient(ox, oy, tipx, tipy);
        grad.addColorStop(0, hexA(glow, 0.0));
        grad.addColorStop(0.12, hexA(glow, 0.85 * alpha));
        grad.addColorStop(0.55, hexA(primary, 0.92 * alpha));
        grad.addColorStop(0.92, hexA(accent, 0.95 * alpha));
        grad.addColorStop(1, hexA(accent, 0.9 * alpha));

        // צורה דמוית עלה: בסיס דק, מתרחב באמצע, מתחדד לקצה (בזייה דו-צדדית)
        var mx = ox + ca * L * 0.5, my = oy + sa * L * 0.5;     // נקודת אמצע
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(mx + px * halfW, my + py * halfW, tipx, tipy);
        ctx.quadraticCurveTo(mx - px * halfW, my - py * halfW, ox, oy);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // קו שדרה דקיק ומאיר במרכז הנוצה
        ctx.strokeStyle = hexA('#FFFFFF', 0.28 * alpha);
        ctx.lineWidth = 1 * unit;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(tipx, tipy);
        ctx.stroke();

        // ── העין שבקצה הנוצה ──
        var ec = appear >= 0.92 ? clamp01((appear - 0.92) / 0.08) : 0; // העין מופיעה בסוף הצמיחה
        if (ec > 0) {
          // מרכז העין מעט פנימה מהקצה הממש
          var exC = ox + ca * (L - 8 * unit), eyC = oy + sa * (L - 8 * unit);
          var shine = 0.6 + 0.4 * eyeShine;                    // ריצוד
          var baseR = 13 * unit * ec;

          // הילה רכה מאחורי העין
          var hg = ctx.createRadialGradient(exC, eyC, 0, exC, eyC, baseR * 2.4);
          hg.addColorStop(0, hexA(glow, 0.5 * shine * alpha));
          hg.addColorStop(1, hexA(glow, 0));
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(exC, eyC, baseR * 2.4, 0, 6.2832); ctx.fill();

          // טבעת חיצונית — זהב (אליפסה מעט מוארכת לאורך הציר)
          ctx.save();
          ctx.translate(exC, eyC);
          ctx.rotate(ang + Math.PI / 2);
          ctx.scale(1, 1.35);                                  // מוארכת לאורך הנוצה
          ctx.fillStyle = hexA(accent, 0.95 * alpha);
          ctx.beginPath(); ctx.arc(0, 0, baseR, 0, 6.2832); ctx.fill();
          // טבעת אמצע — צבע ראשי
          ctx.fillStyle = hexA(primary, 0.96 * alpha);
          ctx.beginPath(); ctx.arc(0, 0, baseR * 0.66, 0, 6.2832); ctx.fill();
          // מרכז זוהר טורקיז/כחול
          var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 0.5);
          cg.addColorStop(0, hexA('#FFFFFF', 0.95 * shine * alpha));
          cg.addColorStop(0.45, hexA(glow, 0.98 * alpha));
          cg.addColorStop(1, hexA(glow, 0.2 * alpha));
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(0, 0, baseR * 0.45, 0, 6.2832); ctx.fill();
          ctx.restore();

          // נקודת הבזק לבנה (highlight) — מעט מעל-שמאל למרכז
          ctx.fillStyle = hexA('#FFFFFF', (0.5 + 0.5 * eyeShine) * alpha);
          ctx.beginPath();
          ctx.arc(exC - px * baseR * 0.22 + ca * baseR * 0.15,
                  eyC - py * baseR * 0.22 + sa * baseR * 0.15,
                  baseR * 0.18, 0, 6.2832);
          ctx.fill();
        }
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // נדנוד עדין של כל המניפה אחרי הפתיחה
        var swaySettle = clamp01((t - openEnd) / 400);
        var sway = swaySettle * Math.sin((t - openEnd) * 0.0022) * 1;

        // גל ריצוד שעובר על העיניים (בולט יותר בסופר)
        var wavePos = ((t - openEnd) * 0.0009);                 // עובר על frac 0..1 שוב ושוב

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // זוהר רך בבסיס המניפה (גוף הטווס)
        var bodyA = clamp01(t / (openEnd * 0.6)) * gFade;
        if (bodyA > 0.01) {
          var bg = ctx.createRadialGradient(ox, oy, 0, ox, oy, featLen * 0.32);
          bg.addColorStop(0, hexA(glow, 0.32 * bodyA));
          bg.addColorStop(0.5, hexA(primary, 0.16 * bodyA));
          bg.addColorStop(1, hexA(primary, 0));
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.arc(ox, oy, featLen * 0.32, 0, 6.2832); ctx.fill();
        }

        // מציירים מהקצוות פנימה כדי שהנוצות המרכזיות יהיו מעל (עומק)
        var order = [];
        for (var oi = 0; oi < feathers.length; oi++) order.push(oi);
        order.sort(function (a, b) {
          return Math.abs(feathers[b].frac - 0.5) - Math.abs(feathers[a].frac - 0.5);
        });

        for (var k = 0; k < order.length; k++) {
          var f = feathers[order[k]];
          // שלב צמיחה/פתיחה לכל נוצה
          var oq = clamp01((t - f.delay) / (openEnd - f.delay));
          if (oq <= 0) continue;
          var grow = easeOutCubic(oq);
          // הזווית הסופית מתקבלת ע"י "פרישה" מהמרכז (90°-) החוצה
          var ang = (-Math.PI / 2) + (f.finalAng - (-Math.PI / 2)) * easeOutElastic(Math.min(oq * 1.05, 1));
          // נדנוד: סטייה זוויתית קטנה התלויה במרחק מהמרכז
          ang += sway * f.swayAmp * (f.frac - 0.5) * 4;

          // ריצוד העין — שלב אישי + גל עובר
          var waveBoost = 1;
          if (isSuper) {
            var dwave = Math.abs(((f.frac - wavePos % 1) + 1) % 1);
            dwave = Math.min(dwave, 1 - dwave);
            waveBoost = 1 + 1.6 * Math.exp(-dwave * dwave * 40);
          }
          var eyeShine = clamp01(0.5 + 0.5 * Math.sin(t * 0.006 + f.twPhase)) * waveBoost;
          if (eyeShine > 1) eyeShine = 1;

          drawFeather(ang, f.len, grow, gFade, eyeShine);
        }

        // ── ניצוצות נושרים מקצות הנוצות ──
        for (var si = 0; si < sparks.length; si++) {
          var sp = sparks[si];
          var sq = (t - sp.born) / sp.life;
          if (sq <= 0 || sq >= 1) continue;
          // מיקום קצה הנוצה ההורה (כולל נדנוד) בזמן הנוכחי
          var pf = sp.feat;
          var pAng = pf.finalAng + sway * pf.swayAmp * (pf.frac - 0.5) * 4;
          var tx = ox + Math.cos(pAng) * pf.len + sp.jx;
          var ty = oy + Math.sin(pAng) * pf.len;
          var x = tx + sp.drift * sq;
          var y = ty + sp.fall * easeOutCubic(sq);              // נושר כלפי מטה
          var a = (sq < 0.2 ? sq / 0.2 : 1 - (sq - 0.2) / 0.8) *
                  (0.6 + 0.4 * Math.sin(t * 0.012 + sp.tw)) * gFade;
          if (a <= 0) continue;
          ctx.fillStyle = hexA(sp.color, a);
          ctx.beginPath(); ctx.arc(x, y, sp.r, 0, 6.2832); ctx.fill();
          // נצנוץ-צלב קטן לחלק מהניצוצות
          if (sp.r > 1.6 * unit) {
            var fl = sp.r * 2.6;
            ctx.strokeStyle = hexA(sp.color, a * 0.7);
            ctx.lineWidth = 0.8 * unit;
            ctx.beginPath();
            ctx.moveTo(x - fl, y); ctx.lineTo(x + fl, y);
            ctx.moveTo(x, y - fl); ctx.lineTo(x, y + fl);
            ctx.stroke();
          }
        }

        // ─── טקסט ───
        var tp = clamp01((t - txtAt) / 340);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - txtAt - 260) / 300);
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
