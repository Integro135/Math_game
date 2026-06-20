/* success-birthday-cake.js — מסך הצלחה: עוּגַת יוֹם הֻלֶּדֶת
   עוּגָה חֲמוּדָה רַב-קוֹמָתִית קוֹפֶצֶת לַמֶּרְכָּז (easeOutBack), הַנֵּרוֹת
   נִדְלָקִים אֶחָד-אֶחָד בְּלֶהָבוֹת רוֹטְטוֹת, וְאָז מִזְרָקַת זִקּוּקִין שֶׁל
   נִיצוֹצוֹת זָהָב/לָבָן מִתְפָּרֶצֶת מֵרֹאשׁ הָעוּגָה — נִיצוֹצוֹת עָפִים לְמַעְלָה,
   מִתְקַמְּרִים וְנוֹפְלִים בְּכֹחַ הַכֹּבֶד עִם הַבְהוּבֵי קְצוֹת. קוֹנְפֶטִי
   צִבְעוֹנִי יוֹרֵד מִלְמַעְלָה וּמִסְתּוֹבֵב. בְּסוּפֶּר: יוֹתֵר נֵרוֹת, מִזְרָקָה
   גְּבוֹהָה יוֹתֵר עִם הִתְפָּרְצוּת שְׁנִיָּה, וְקוֹנְפֶטִי צָפוּף יוֹתֵר.
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
  function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function lighten(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
    // return a #rrggbb string so hexA() can parse it (it is fed into hexA in
    // several gradient stops); an 'rgb(...)' string would mis-parse to NaN.
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // מלבן מעוגל-פינות (לקומות העוגה)
  function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.SUCCESS.styles.push({
    name: 'birthday-cake',
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
      var praise  = opts.praise || 'יוֹם הֻלֶּדֶת שָׂמֵחַ, אַלּוּפָה!';

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

      var unit = Math.min(W, H) / 800;                 // קנה מידה למסכים קטנים
      var cx = W / 2;
      var baseY = H * 0.66;                             // קו תחתית העוגה
      var s = unit * (isSuper ? 1.18 : 1.0);            // הגדלה כללית בסופר

      // ─── זמני התרחשות ───
      var tRise = dur * 0.16;                           // העוגה צצה (easeOutBack)
      var tCandle0 = tRise + dur * 0.04;                // נרות מתחילים להידלק
      var candleSpan = dur * 0.18;                      // משך הדלקת כל הנרות
      var tSpark = tCandle0 + candleSpan + dur * 0.02;  // התפרצות הזיקוקים
      var tSpark2 = tSpark + dur * 0.30;                // התפרצות שנייה (סופר)
      var tTxt = tRise + dur * 0.10;                    // הופעת השבח

      // ─── גיאומטריית העוגה — שלוש קומות ───
      var tiers = [
        { w: 230 * s, h: 64 * s, color: primary },
        { w: 178 * s, h: 56 * s, color: lighten(primary, 0.18) },
        { w: 126 * s, h: 48 * s, color: lighten(primary, 0.34) }
      ];
      // y תחתית לכל קומה (מלמטה למעלה) + מיקום ראש העוגה
      var tierBottom = [];
      var yy = baseY;
      for (var ti = 0; ti < tiers.length; ti++) {
        tierBottom.push(yy);
        yy -= tiers[ti].h;
      }
      var topY = yy;                                    // ראש הקומה העליונה (בסיס הנרות)
      var topW = tiers[tiers.length - 1].w;

      // ─── טיפות זיגוג (frosting drips) לכל קומה ───
      function makeDrips(w, n) {
        var arr = [];
        for (var d = 0; d < n; d++) {
          arr.push({
            fx: (d + 0.5) / n,                          // מיקום יחסי לרוחב הקומה
            len: (8 + Math.random() * 16) * s,
            rad: (5 + Math.random() * 4) * s
          });
        }
        return arr;
      }
      for (var tj = 0; tj < tiers.length; tj++) {
        tiers[tj].drips = makeDrips(tiers[tj].w, Math.round(tiers[tj].w / (26 * s)));
        // נקודות סוכר על דופן הקומה
        tiers[tj].dots = [];
        var dotN = Math.round(tiers[tj].w / (30 * s));
        for (var dd = 0; dd < dotN; dd++) {
          tiers[tj].dots.push({
            rx: (Math.random() - 0.5) * (tiers[tj].w - 24 * s),
            ry: 0.35 + Math.random() * 0.4,
            r: (2.2 + Math.random() * 1.6) * s,
            col: dd % 2 ? accent : '#FFFFFF'
          });
        }
      }

      // ─── נרות ───
      var nC = isSuper ? 7 : 5;
      var candles = [];
      var candleColors = [accent, glow, '#FFFFFF', primary, accent, glow, '#FFFFFF'];
      var candleH = 46 * s;
      var candleW = 8 * s;
      var spread = topW - 30 * s;
      for (var c = 0; c < nC; c++) {
        var frac = nC === 1 ? 0.5 : c / (nC - 1);
        candles.push({
          x: cx - spread / 2 + frac * spread,
          litAt: tCandle0 + (c / nC) * candleSpan,     // מתי הנר הזה נדלק
          stripe: candleColors[c % candleColors.length],
          flick: Math.random() * 6.28
        });
      }

      // ─── מזרקת זיקוקים (sparkler fountain) — חלקיקים שעפים למעלה ונופלים ───
      var sparkColors = ['#FFFFFF', '#FFFFFF', accent, lighten(accent, 0.25), glow];
      function makeSparks(n, originT, power) {
        var arr = [];
        for (var i = 0; i < n; i++) {
          var ang = -Math.PI / 2 + (Math.random() - 0.5) * (isSuper ? 1.5 : 1.25);
          var sp = (160 + Math.random() * 320) * power * s;     // מהירות התחלתית
          arr.push({
            born: originT + Math.random() * 140,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 650 + Math.random() * 650,
            size: (1.2 + Math.random() * 2.0) * s,
            twk: Math.random() * 6.28,                          // קצב הבהוב הקצה
            crackle: Math.random() < 0.55,                      // ניצוץ מתפצפץ
            color: sparkColors[i % sparkColors.length]
          });
        }
        return arr;
      }
      var grav = 720 * s;                                       // כוח כובד (px/s^2)
      var sparkOriginY = topY - candleH;                        // קצות הנרות
      var sparks = makeSparks(isSuper ? 150 : 90, tSpark, isSuper ? 1.15 : 1.0);
      var sparks2 = isSuper ? makeSparks(110, tSpark2, 1.05) : null;

      // ─── קונפטי — מלבנים צבעוניים שיורדים ומסתובבים ───
      var confColors = [primary, accent, glow, lighten(primary, 0.3), lighten(accent, 0.2), '#FFFFFF'];
      var nConf = isSuper ? 90 : 50;
      var confetti = [];
      for (var k = 0; k < nConf; k++) {
        confetti.push({
          x: Math.random() * W,
          y: -Math.random() * H * 0.6 - 20,                     // מתחילים מעל המסך
          w: (5 + Math.random() * 7) * s,
          h: (8 + Math.random() * 10) * s,
          vy: (60 + Math.random() * 90) * s,                    // מהירות נפילה
          sway: 18 + Math.random() * 26,                        // אמפליטודת נדנוד
          swayHz: 0.6 + Math.random() * 1.4,
          phase: Math.random() * 6.28,
          rot: Math.random() * 6.28,
          rotV: (Math.random() - 0.5) * 6,
          startAt: tRise + Math.random() * dur * 0.3,           // נכנס בהדרגה
          color: confColors[k % confColors.length]
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:20%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(38px,7.5vw,82px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:30%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── ציור קומת עוגה בודדת ──
      function drawTier(tier, bottomY, alpha) {
        var x = cx - tier.w / 2;
        var y = bottomY - tier.h;
        // גוף הקומה
        var bg = ctx.createLinearGradient(x, y, x, bottomY);
        bg.addColorStop(0, hexA(lighten(tier.color, 0.22), alpha));
        bg.addColorStop(1, hexA(tier.color, alpha));
        ctx.fillStyle = bg;
        roundRect(ctx, x, y, tier.w, tier.h, 12 * s);
        ctx.fill();
        // נקודות סוכר
        for (var i = 0; i < tier.dots.length; i++) {
          var dot = tier.dots[i];
          ctx.fillStyle = hexA(dot.col, alpha * 0.9);
          ctx.beginPath();
          ctx.arc(cx + dot.rx, y + tier.h * dot.ry, dot.r, 0, 6.2832);
          ctx.fill();
        }
        // זיגוג עליון + טיפות
        var fy = y;                                     // קו הזיגוג בראש הקומה
        ctx.fillStyle = hexA(lighten(accent, 0.35), alpha);
        roundRect(ctx, x, fy - 4 * s, tier.w, 14 * s, 7 * s);
        ctx.fill();
        for (var d = 0; d < tier.drips.length; d++) {
          var dr = tier.drips[d];
          var dx = x + dr.fx * tier.w;
          var dyTop = fy + 8 * s;
          ctx.beginPath();
          ctx.moveTo(dx - dr.rad, dyTop - 6 * s);
          ctx.lineTo(dx - dr.rad, dyTop + dr.len);
          ctx.arc(dx, dyTop + dr.len, dr.rad, Math.PI, 0, true);
          ctx.lineTo(dx + dr.rad, dyTop - 6 * s);
          ctx.closePath();
          ctx.fill();
        }
      }

      function drawFlame(x, topOfCandle, scale, flickSeed, t, alpha) {
        var fh = (16 * s) * scale * (1 + 0.12 * Math.sin(t * 0.02 + flickSeed));
        var fw = (8 * s) * scale * (1 + 0.10 * Math.sin(t * 0.03 + flickSeed * 1.7));
        var sway = Math.sin(t * 0.012 + flickSeed) * 2.2 * s;
        var bx = x + sway, by = topOfCandle - 2 * s;     // בסיס הלהבה (קצה הפתיל)
        var tipx = x + sway * 1.6, tipy = by - fh;       // חוד הלהבה
        // הילה רכה
        var gr = ctx.createRadialGradient(bx, by - fh * 0.4, 0, bx, by - fh * 0.4, fh * 2.4);
        gr.addColorStop(0, hexA(accent, 0.5 * alpha));
        gr.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(bx, by - fh * 0.4, fh * 2.4, 0, 6.2832);
        ctx.fill();
        // גוף הלהבה (טיפה הפוכה)
        ctx.beginPath();
        ctx.moveTo(tipx, tipy);
        ctx.quadraticCurveTo(bx + fw, by - fh * 0.45, bx + fw * 0.5, by);
        ctx.quadraticCurveTo(bx, by + 2 * s, bx - fw * 0.5, by);
        ctx.quadraticCurveTo(bx - fw, by - fh * 0.45, tipx, tipy);
        ctx.closePath();
        var fg = ctx.createLinearGradient(bx, by, tipx, tipy);
        fg.addColorStop(0, hexA(accent, alpha));
        fg.addColorStop(0.55, hexA(lighten(accent, 0.25), alpha));
        fg.addColorStop(1, 'rgba(255,255,255,' + alpha + ')');
        ctx.fillStyle = fg;
        ctx.fill();
        // ליבה לבנה
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * alpha) + ')';
        ctx.beginPath();
        ctx.ellipse(bx, by - fh * 0.32, fw * 0.32, fh * 0.32, 0, 0, 6.2832);
        ctx.fill();
      }

      // ── ציור מזרקת זיקוקים ──
      function drawSparks(arr, t, gFade) {
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          var age = t - p.born;
          if (age < 0 || age > p.life) continue;
          var sec = age / 1000;
          var px = cx + p.vx * sec;
          var py = sparkOriginY + p.vy * sec + 0.5 * grav * sec * sec;
          var q = age / p.life;
          // הבהוב קצה (twinkle) + ניצוצות מתפצפצים
          var twk = 0.55 + 0.45 * Math.sin(t * 0.05 + p.twk);
          if (p.crackle) twk *= (Math.random() < 0.3 ? 0.3 : 1);
          var a = (1 - q) * twk * gFade;
          if (a <= 0.02) continue;
          // פס תנועה קצר בכיוון המהירות הרגעית
          var cvy = p.vy + grav * sec;                   // מהירות אנכית רגעית
          var spd = Math.sqrt(p.vx * p.vx + cvy * cvy);
          var ux = p.vx / spd, uy = cvy / spd;
          var tail = (5 + 9 * (1 - q)) * s;
          ctx.strokeStyle = hexA(p.color, a * 0.9);
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - ux * tail, py - uy * tail);
          ctx.stroke();
          // נקודת קצה בוהקת
          ctx.fillStyle = hexA('#FFFFFF', a);
          ctx.beginPath();
          ctx.arc(px, py, p.size * 0.7, 0, 6.2832);
          ctx.fill();
        }
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // ─── קונפטי (מאחורי העוגה, יורד) ───
        for (var ci = 0; ci < confetti.length; ci++) {
          var cf = confetti[ci];
          if (t < cf.startAt) continue;
          var ct = (t - cf.startAt) / 1000;
          var y = cf.y + cf.vy * ct;
          if (y > H + 30) continue;
          var x = cf.x + Math.sin(ct * cf.swayHz * 6.2832 + cf.phase) * cf.sway;
          var rot = cf.rot + cf.rotV * ct;
          var flip = Math.cos(ct * cf.swayHz * 9 + cf.phase);   // היפוך תלת-ממדי מדומה
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.scale(1, Math.max(0.15, Math.abs(flip)));
          ctx.fillStyle = hexA(cf.color, gFade);
          ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
          ctx.restore();
        }

        // ─── העוגה — קופצת פנימה ב-easeOutBack ───
        var rq = clamp01(t / tRise);
        var rise = easeOutBack(rq);                      // 0 → ~1 עם קפיצה
        var appear = clamp01(t / (tRise * 0.5));         // אלפא הופעה
        if (rq > 0) {
          // קפיצה: מתחיל מתחת לקו הבסיס ומחליק למעלה
          var offY = (1 - rise) * 220 * s;
          ctx.save();
          // צל רך מתחת לעוגה
          var shA = clamp01((rq - 0.3) / 0.7) * 0.28 * gFade;
          if (shA > 0) {
            ctx.fillStyle = 'rgba(0,0,0,' + shA + ')';
            ctx.beginPath();
            ctx.ellipse(cx, baseY + offY + 10 * s, tiers[0].w * 0.55, 12 * s, 0, 0, 6.2832);
            ctx.fill();
          }
          ctx.translate(0, offY);
          // קומות מלמטה למעלה
          for (var d = 0; d < tiers.length; d++) {
            drawTier(tiers[d], tierBottom[d], appear * gFade);
          }
          // צלחת/תושבת
          ctx.fillStyle = hexA(lighten(glow, 0.4), appear * gFade);
          roundRect(ctx, cx - tiers[0].w * 0.62, baseY - 4 * s, tiers[0].w * 1.24, 12 * s, 6 * s);
          ctx.fill();
          ctx.restore();

          // ─── נרות + להבות (נעים יחד עם קפיצת העוגה) ───
          var cTop = topY + offY;                        // ראש העוגה במצב הנוכחי
          for (var ca = 0; ca < candles.length; ca++) {
            var cd = candles[ca];
            var cTopY = cTop - candleH;
            // גוף הנר (פסים)
            ctx.fillStyle = hexA('#FFFFFF', appear * gFade);
            roundRect(ctx, cd.x - candleW / 2, cTopY, candleW, candleH, 2.5 * s);
            ctx.fill();
            ctx.fillStyle = hexA(cd.stripe, appear * gFade);
            for (var st = 0; st < 3; st++) {
              ctx.fillRect(cd.x - candleW / 2, cTopY + st * candleH / 3 + 2 * s,
                           candleW, candleH / 9);
            }
            // פתיל
            ctx.strokeStyle = hexA('#5a4632', appear * gFade);
            ctx.lineWidth = 1.4 * s;
            ctx.beginPath();
            ctx.moveTo(cd.x, cTopY);
            ctx.lineTo(cd.x, cTopY - 4 * s);
            ctx.stroke();
            // להבה — נדלקת בקפיצה קטנה (easeOutBack) ברגע litAt
            var lq = clamp01((t - cd.litAt) / 240);
            if (lq > 0) {
              drawFlame(cd.x, cTopY, easeOutBack(lq), cd.flick, t, gFade);
            }
          }
        }

        // ─── מזרקת הזיקוקים ───
        if (t >= tSpark) {
          drawSparks(sparks, t, gFade);
          // הבזק רך ברגע ההתפרצות
          var fa = 0.32 * Math.exp(-(t - tSpark) / 200) * gFade;
          if (fa > 0.01) {
            var oy = topY + (1 - easeOutBack(clamp01(t / tRise))) * 220 * s - candleH;
            var fg = ctx.createRadialGradient(cx, oy, 0, cx, oy, 240 * s);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.4, hexA(accent, fa * 0.5));
            fg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(cx, oy, 240 * s, 0, 6.2832);
            ctx.fill();
          }
        }
        if (sparks2 && t >= tSpark2) {
          drawSparks(sparks2, t, gFade);
        }

        // ─── טקסט ───
        var tp = clamp01((t - tTxt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp = clamp01((t - tTxt - 280) / 300);
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
