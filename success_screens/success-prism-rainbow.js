/* success-prism-rainbow.js — מסך הצלחה: מִנְסְרַת קֶשֶׁת
   מִנְסְרָה (פְּרִיזְמָה) מְשֻׁלֶּשֶׁת זוֹהֶרֶת עוֹמֶדֶת בַּמֶּרְכָּז. קֶרֶן לְבָנָה דַּקָּה
   נִכְנֶסֶת מִשְּׂמֹאל-לְמַעְלָה וּפוֹגַעַת בַּמִּנְסְרָה; מִשָּׁם הִיא נִשְׁבֶּרֶת וְנִפְרֶשֶׂת
   לְמַנִיפַת קַרְנֵי קֶשֶׁת (אָדֹם→כָּתֹם→צָהֹב→יָרֹק→תְּכֵלֶת→כָּחֹל→סָגֹל) שֶׁמִּתְנַדְנְדוֹת
   לְעֵבֶר יָמִין-לְמַטָּה; נִיצוֹצוֹת נוֹסְעִים לְאֹרֶךְ הַקַּרְנַיִם, הַסְּפֶּקְטְרוּם פּוֹעֵם
   וְקַצְווֹת הַמִּנְסְרָה נוֹצְצִים. בְּסוּפֶּר: מַנִיפָה רְחָבָה יוֹתֵר, מִנְסְרָה שְׁנִיָּה
   קְטַנָּה שֶׁמְּפַצֶּלֶת קֶרֶן נוֹסֶפֶת, עוֹד קַרְנַיִם וְנִיצוֹצוֹת, וּבָזָק מֶרְכָּזִי בָּהִיר.
   רֶמְפַּת הַקֶּשֶׁת קְבוּעָה (7 צְבָעִים hex), הַפַּלֶטָה רַק לְזֹהַר הַמִּנְסְרָה וְלַנִּיצוֹצוֹת.
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
  // האָרָה/הַכְהָיָה של hex — מחזיר תמיד מחרוזת #rrggbb תקינה (לעולם לא rgb()).
  function shade(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= (1 + f); g *= (1 + f); b *= (1 + f); }
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  window.SUCCESS.styles.push({
    name: 'prism-rainbow',
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
      var praise  = opts.praise || 'אוֹר שֶׁל קֶשֶׁת!';

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

      var unit = Math.min(W, H) / 800;                  // קנה מידה למסכים קטנים (גם 342×455)

      // ─── רֶמְפַּת הַקֶּשֶׁת הַקְּבוּעָה (7 צבעים hardcoded) ───
      var RAINBOW = ['#FF2D2D', '#FF8A00', '#FFE000', '#27D86B', '#1FD6E0', '#2A6BFF', '#9B30FF'];

      // ─── גֵּאוֹמֶטְרְיַת הַמִּנְסְרָה הַמֶּרְכָּזִית ───
      var cx = W * 0.46, cy = H * 0.5;                  // מרכז המנסרה (מעט שמאלה מהאמצע)
      var pr = Math.min(W, H) * 0.13;                   // "רדיוס" המשולש (גודל המנסרה)
      pr = Math.max(pr, 42 * unit);
      // קודקודי משולש שווה-צלעות, קודקוד למעלה
      function prismVerts(cxx, cyy, r, rot) {
        var v = [];
        for (var i = 0; i < 3; i++) {
          var a = -Math.PI / 2 + rot + i * (2 * Math.PI / 3);
          v.push({ x: cxx + Math.cos(a) * r, y: cyy + Math.sin(a) * r });
        }
        return v;
      }

      // נקודת הפגיעה — מרכז המנסרה (משם נפרשת המניפה)
      var hitX = cx, hitY = cy;
      // קרן נכנסת מהפינה השמאלית-עליונה
      var inX = -20 * unit, inY = H * 0.14;

      // ─── מַנִיפַת הַקֶּשֶׁת — זוויות בסיס סביב כיוון ימין-למטה ───
      var BEAMS = 7;                                    // תמיד 7 קרני קשת
      var fanCenter = Math.PI * 0.22;                   // כיוון מרכזי של המניפה (ימין-מטה)
      var fanSpread = isSuper ? Math.PI * 0.40 : Math.PI * 0.28; // רוחב המניפה
      var beamLen = Math.max(W, H) * (isSuper ? 1.25 : 1.05);    // אורך הקרניים (יוצא מהמסך)
      // לכל קרן: זווית בסיס, פאזה לתנודה, פאזה לפעימת בהירות
      var beams = [];
      for (var bi = 0; bi < BEAMS; bi++) {
        var f = BEAMS > 1 ? bi / (BEAMS - 1) : 0.5;     // 0..1 לרוחב המניפה
        beams.push({
          base: fanCenter - fanSpread / 2 + f * fanSpread,
          color: RAINBOW[bi],
          oscPhase: bi * 0.7,
          pulsePhase: bi * 0.9
        });
      }

      // ─── מִנְסְרָה שְׁנִיָּה (סוּפֶּר) — מפצלת את הקרן הצהובה האמצעית שוב ───
      var prism2 = null;
      if (isSuper) {
        var midBeam = beams[3];                         // הקרן האמצעית (צהוב)
        var d2 = beamLen * 0.34;                         // מרחק המנסרה השנייה לאורך הקרן
        prism2 = {
          x: hitX + Math.cos(midBeam.base) * d2,
          y: hitY + Math.sin(midBeam.base) * d2,
          r: pr * 0.52,
          fan: Math.PI * 0.30,
          len: beamLen * 0.7
        };
      }

      // ─── נִיצוֹצוֹת שֶׁנּוֹסְעִים לְאֹרֶךְ הַקַּרְנַיִם ───
      var sparkCols = ['#FFFFFF', accent, glow, primary];
      var NS = isSuper ? 54 : 30;
      var sparks = [];
      for (var s = 0; s < NS; s++) {
        sparks.push({
          beam: 0 | (Math.random() * BEAMS),
          phase: Math.random(),                          // 0..1 לאורך הקרן
          speed: 0.45 + Math.random() * 0.7,             // יחידות אורך לשנייה
          size: (1.1 + Math.random() * 2.2) * unit,
          jitter: (Math.random() - 0.5) * 10 * unit,     // סטייה אנכית לקרן
          color: sparkCols[s % sparkCols.length],
          tw: Math.random() * 6.28
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:15%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
          'position:absolute;left:50%;top:24%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── מצייר קרן רחבה זוהרת מנקודה לזווית/אורך נתונים ──
      function drawBeam(ox, oy, ang, len, col, width, alpha) {
        if (alpha <= 0 || width <= 0 || len <= 0) return;
        var ex = ox + Math.cos(ang) * len;
        var ey = oy + Math.sin(ang) * len;
        // ליבת הקרן — gradient לאורכה (דועך לקצה)
        var grad = ctx.createLinearGradient(ox, oy, ex, ey);
        grad.addColorStop(0, hexA('#FFFFFF', 0.85 * alpha));
        grad.addColorStop(0.12, hexA(shade(col, 0.35), 0.9 * alpha));
        grad.addColorStop(0.6, hexA(col, 0.55 * alpha));
        grad.addColorStop(1, hexA(col, 0));
        // הילה רחבה
        ctx.strokeStyle = hexA(col, 0.18 * alpha);
        ctx.lineWidth = width * 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        // ליבה
        ctx.strokeStyle = grad;
        ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      }

      // ── מצייר מנסרה משולשת זוהרת ──
      function drawPrism(cxx, cyy, r, rot, gFade, glowPulse, glintT) {
        var v = prismVerts(cxx, cyy, r, rot);
        // הילת זוהר מאחורי המנסרה (פלטה)
        var halo = ctx.createRadialGradient(cxx, cyy, 0, cxx, cyy, r * 2.4);
        halo.addColorStop(0, hexA(glow, (0.30 + 0.20 * glowPulse) * gFade));
        halo.addColorStop(0.5, hexA(primary, 0.10 * gFade));
        halo.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cxx, cyy, r * 2.4, 0, 6.2832); ctx.fill();

        // גוף הזכוכית — gradient כמו-קריסטל בין קצוות הפלטה
        var bodyGrad = ctx.createLinearGradient(v[0].x, v[0].y, v[1].x, v[2].y);
        bodyGrad.addColorStop(0, hexA(shade(glow, 0.5), 0.42 * gFade));
        bodyGrad.addColorStop(0.5, hexA('#FFFFFF', 0.22 * gFade));
        bodyGrad.addColorStop(1, hexA(shade(primary, 0.3), 0.42 * gFade));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(v[0].x, v[0].y);
        ctx.lineTo(v[1].x, v[1].y);
        ctx.lineTo(v[2].x, v[2].y);
        ctx.closePath();
        ctx.fill();

        // קצוות זוהרים
        ctx.strokeStyle = hexA('#FFFFFF', 0.85 * gFade);
        ctx.lineWidth = 2 * unit;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // נצנוץ נע לאורך אחד הקצוות (glint)
        var gi = 0 | (glintT * 3) % 3;
        var a = v[gi], b = v[(gi + 1) % 3];
        var gp = (glintT * 3) % 1;
        var glx = a.x + (b.x - a.x) * gp;
        var gly = a.y + (b.y - a.y) * gp;
        var glr = 8 * unit;
        var gg = ctx.createRadialGradient(glx, gly, 0, glx, gly, glr);
        gg.addColorStop(0, hexA('#FFFFFF', 0.95 * gFade));
        gg.addColorStop(1, hexA('#FFFFFF', 0));
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(glx, gly, glr, 0, 6.2832); ctx.fill();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        var ts = t / 1000;

        // "build" — הקרן הנכנסת נמשכת פנימה, ואז המניפה נפרשת
        var inGrow = easeOutCubic(clamp01(t / (dur * 0.18)));
        var fanGrow = easeOutCubic(clamp01((t - dur * 0.14) / (dur * 0.22)));
        var pulse = 0.5 + 0.5 * Math.sin(ts * 3.2);     // פעימת בהירות גלובלית
        var glowPulse = 0.5 + 0.5 * Math.sin(ts * 2.1);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) הקרן הלבנה הנכנסת (משמאל-מעלה אל המנסרה)
        var curInX = inX + (hitX - inX) * inGrow;
        var curInY = inY + (hitY - inY) * inGrow;
        ctx.strokeStyle = hexA('#FFFFFF', 0.16 * gFade);
        ctx.lineWidth = 9 * unit;
        ctx.beginPath(); ctx.moveTo(inX, inY); ctx.lineTo(curInX, curInY); ctx.stroke();
        var inGrad = ctx.createLinearGradient(inX, inY, hitX, hitY);
        inGrad.addColorStop(0, hexA('#FFFFFF', 0.5 * gFade));
        inGrad.addColorStop(1, hexA('#FFFFFF', 0.95 * gFade));
        ctx.strokeStyle = inGrad;
        ctx.lineWidth = 3.2 * unit;
        ctx.beginPath(); ctx.moveTo(inX, inY); ctx.lineTo(curInX, curInY); ctx.stroke();

        // 2) מניפת קרני הקשת היוצאות מהמנסרה (אחרי שהקרן נכנסה)
        for (var bi = 0; bi < beams.length; bi++) {
          var bm = beams[bi];
          // תנודה עדינה של הזווית
          var osc = Math.sin(ts * 1.4 + bm.oscPhase) * (isSuper ? 0.05 : 0.035);
          var ang = bm.base + osc;
          var bPulse = 0.6 + 0.4 * Math.sin(ts * 2.6 + bm.pulsePhase);
          var width = (3.0 + 1.6 * bPulse) * unit;
          var alpha = (0.85 * bPulse) * fanGrow * gFade;
          var len = beamLen * fanGrow;
          // המנסרה השנייה תוחלף את הקרן האמצעית — נצייר אותה קצרה עד למנסרה 2
          if (isSuper && bi === 3) {
            len = Math.min(len, beamLen * 0.34);
          }
          drawBeam(hitX, hitY, ang, len, bm.color, width, alpha);
        }

        // 3) מנסרה שנייה (סופר) — מפצלת שוב את הקרן האמצעית
        if (prism2) {
          var p2Show = clamp01((t - dur * 0.22) / (dur * 0.18));
          if (p2Show > 0) {
            for (var k = 0; k < 5; k++) {
              var ff = k / 4;
              var a2 = fanCenter - prism2.fan / 2 + ff * prism2.fan + Math.sin(ts * 1.6 + k) * 0.04;
              // צבע מתוך הרמפה — דגימה רכה לאורך 7 הצבעים
              var col2 = RAINBOW[0 | (ff * (RAINBOW.length - 1) + 0.5)];
              var w2 = (2.2 + 1.2 * Math.sin(ts * 3 + k)) * unit;
              drawBeam(prism2.x, prism2.y, a2, prism2.len * p2Show, col2,
                       w2, 0.8 * p2Show * gFade);
            }
            drawPrism(prism2.x, prism2.y, prism2.r * p2Show, ts * 0.5,
                      gFade, glowPulse, ts * 0.5);
          }
        }

        // 4) המנסרה המרכזית
        drawPrism(hitX, hitY, pr, 0, gFade, glowPulse, ts * 0.4);

        // נצנוץ בנקודת הפגיעה (מקור הקשת)
        var hr = (10 + 6 * pulse) * unit;
        var hg = ctx.createRadialGradient(hitX, hitY, 0, hitX, hitY, hr);
        hg.addColorStop(0, hexA('#FFFFFF', 0.9 * fanGrow * gFade));
        hg.addColorStop(1, hexA('#FFFFFF', 0));
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(hitX, hitY, hr, 0, 6.2832); ctx.fill();

        // 5) ניצוצות שנוסעים לאורך הקרניים
        for (var si = 0; si < sparks.length; si++) {
          var sk = sparks[si];
          var bm2 = beams[sk.beam];
          var osc2 = Math.sin(ts * 1.4 + bm2.oscPhase) * (isSuper ? 0.05 : 0.035);
          var ang2 = bm2.base + osc2;
          // התקדמות מחזורית לאורך הקרן
          var p = (sk.phase + ts * sk.speed) % 1;
          var beamMax = beamLen * fanGrow;
          if (isSuper && sk.beam === 3) beamMax = Math.min(beamMax, beamLen * 0.34);
          var dist = p * beamMax;
          var nx = Math.cos(ang2), ny = Math.sin(ang2);
          var sx = hitX + nx * dist - ny * sk.jitter;
          var sy = hitY + ny * dist + nx * sk.jitter;
          // דועך לעבר קצה הקרן + מנצנץ
          var fade = (1 - p * 0.85);
          var twk = 0.55 + 0.45 * Math.sin(ts * 8 + sk.tw);
          var sa = fade * twk * fanGrow * gFade;
          if (sa <= 0.01) continue;
          ctx.fillStyle = hexA(sk.color, sa);
          ctx.beginPath();
          ctx.arc(sx, sy, sk.size * (0.7 + 0.5 * twk), 0, 6.2832);
          ctx.fill();
        }

        // 6) בָּזָק מֶרְכָּזִי בָּהִיר (סופר) — הבזק קצר בנקודת הפגיעה לקראת השיא
        if (isSuper) {
          var flashAt = dur * 0.62;
          var fq = clamp01((t - flashAt) / 520);
          if (fq > 0 && fq < 1) {
            var fa = Math.sin(Math.PI * fq) * gFade;
            var fr = (pr * 1.2 + pr * 2.4 * fq);
            var fgr = ctx.createRadialGradient(hitX, hitY, 0, hitX, hitY, fr);
            fgr.addColorStop(0, hexA('#FFFFFF', 0.85 * fa));
            fgr.addColorStop(0.35, hexA(accent, 0.5 * fa));
            fgr.addColorStop(0.7, hexA(glow, 0.2 * fa));
            fgr.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = fgr;
            ctx.beginPath(); ctx.arc(hitX, hitY, fr, 0, 6.2832); ctx.fill();
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
