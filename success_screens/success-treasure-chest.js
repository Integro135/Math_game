/* success-treasure-chest.js — מסך הצלחה: תֵּבַת אוֹצָר
   תֵּבַת אוֹצָר מֵעֵץ ניצבת במרכז השליש התחתון; המכסה המעוגל נפתח בנדנוד (סיבוב סביב
   צִיר הצירים האחורי, easeOutBack). כשהוא נפתח קַרְנֵי אור זהובות חמות בוקעות כלפי מעלה
   מתוכה, ומִפְרָץ של מטבעות זהב (גרדיאנט דיסקה מבריק עם נצנוץ ₪) וגַּם אֲבָנֵי חֵן
   מְלֻטָּשׁוֹת (מצולעים קטנים בצבעי הפלטה עם הדגשה לבנה) מזנק כמזרקה ונושר חזרה תחת
   כוח הכבידה (תנועה בָּלִיסְטִית, סיבוב קל). מסביב — נצנוצים נסחפים והילה זהובה רכה.
   בסופר: מִפְרָץ גדול יותר עם עוד מטבעות ואבנים, כֶּתֶר/אֶבֶן גדולה עולים מן התיבה,
   קרניים בהירות יותר, וטבעת נצנוצים מסיימת. נרשם לפי החוזה ב-success_screens_spec.md —
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
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  // ערבוב שני צבעי hex והחזרת מחרוזת #rrggbb תקינה (לעולם לא 'rgb(...)' לתוך hexA)
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255;
    var g = Math.round(g1 + (g2 - g1) * t) & 255;
    var b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  window.SUCCESS.styles.push({
    name: 'treasure-chest',
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
      var praise  = opts.praise || 'מָצָאת אֶת הָאוֹצָר!';

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

      var unit = Math.min(W, H) / 800;                  // קנה מידה למסכים קטנים (גם 342×455)

      // ─── גיאומטריית התיבה (במרכז השליש התחתון) ───
      var cx = W / 2;
      var chestW = Math.min(W * 0.5, 230 * unit);       // רוחב התיבה
      var chestBodyH = chestW * 0.5;                    // גובה גוף התיבה
      var lidH = chestW * 0.34;                         // גובה המכסה המעוגל
      // הצמדה לשליש התחתון, עם ריווח לקרקע
      var groundY = Math.min(H * 0.78, H - chestBodyH - 28 * unit);
      var bodyTop = groundY - chestBodyH;               // ראש גוף התיבה / ציר הצירים
      var halfW = chestW / 2;

      // ─── תזמון: המכסה נפתח, ואז המזרקה מזנקת ───
      var lidStart = 0.0;
      var lidDur = dur * 0.30;                           // זמן פתיחת המכסה
      var burstAt = dur * 0.24;                          // המטבעות מזנקים מעט לפני שהמכסה נפתח לגמרי
      var maxLidAngle = 2.18;                            // ~125° אחורה
      var grav = 1500 * unit;                            // כבידה (px/s^2) ביחידות קנה־מידה

      // ─── קרני אור מתוך התיבה ───
      var RAYS = isSuper ? 13 : 9;

      // ─── מטבעות + אבני חן (תנועה בליסטית) ───
      var coins = [];
      var NC = isSuper ? 26 : 16;
      var gems = [];
      var NG = isSuper ? 14 : 8;
      var gemCols = [primary, glow, accent, mixHex(primary, '#FFFFFF', 0.3)];

      function spawnProjectile(arr, kind) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;  // כלפי מעלה ±~43°
        var speed = (520 + Math.random() * 360) * unit;        // מהירות זינוק
        arr.push({
          kind: kind,
          // מוצא: מעט מעל פתח התיבה
          ox: (Math.random() - 0.5) * chestW * 0.6,
          oy: -lidH * 0.2 - Math.random() * 12 * unit,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          born: burstAt + Math.random() * (dur * 0.10),
          size: kind === 'coin'
            ? (10 + Math.random() * 7) * unit
            : (7 + Math.random() * 5) * unit,
          spin: Math.random() * 6.2832,
          spinRate: (Math.random() - 0.5) * 10,
          color: kind === 'gem' ? gemCols[(Math.random() * gemCols.length) | 0] : accent,
          flip: Math.random() * 6.2832,
          flipRate: 4 + Math.random() * 6
        });
      }
      for (var c = 0; c < NC; c++) spawnProjectile(coins, 'coin');
      for (var g = 0; g < NG; g++) spawnProjectile(gems, 'gem');

      // ─── נצנוצים נסחפים סביב התיבה ───
      var sparks = [];
      var NS = isSuper ? 46 : 28;
      var sparkCols = ['#FFFFFF', accent, glow, '#FFFFFF', primary];
      for (var s = 0; s < NS; s++) {
        sparks.push({
          x: cx + (Math.random() - 0.5) * chestW * 2.0,
          baseY: bodyTop - Math.random() * 220 * unit,
          amp: (10 + Math.random() * 30) * unit,
          rate: 1.2 + Math.random() * 1.8,
          phase: Math.random() * 6.2832,
          born: Math.random() * dur * 0.6,
          life: 700 + Math.random() * 800,
          size: (1 + Math.random() * 2.4) * unit,
          tw: Math.random() * 6.28,
          color: sparkCols[s % sparkCols.length]
        });
      }

      // ─── טבעת נצנוצים מסיימת + פריט גדול עולה (סופר) ───
      var finaleAt = dur * 0.72;
      var finale = [];
      if (isSuper) {
        var NF = 40;
        for (var fI = 0; fI < NF; fI++) {
          finale.push({
            ang: (fI / NF) * 6.2832 + Math.random() * 0.12,
            speed: (120 + Math.random() * 90) * unit,
            size: (1.6 + Math.random() * 2.4) * unit,
            color: sparkCols[fI % sparkCols.length]
          });
        }
      }
      var bigRiseAt = dur * 0.30;                         // הכתר/האבן הגדולה מתחילים לעלות

      // ─── טקסט שבח ───
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

      // צבעי עץ נגזרים (מוחזרים תמיד כ-#hex)
      var woodDark = '#5a3210';
      var woodMid  = '#8a5018';
      var woodLite = mixHex(woodMid, accent, 0.28);

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── הילה זהובה רכה סביב התיבה ──
      function drawGlow(t, gFade, openF) {
        var pulse = 0.55 + 0.45 * Math.sin(t * 0.005);
        var gy = bodyTop - lidH * 0.3;
        var R = (150 + 60 * openF) * unit;
        if (R <= 0) return;
        var halo = ctx.createRadialGradient(cx, gy, 0, cx, gy, R);
        halo.addColorStop(0, hexA(accent, (0.30 + 0.16 * pulse) * openF * gFade));
        halo.addColorStop(0.5, hexA(accent, 0.10 * openF * gFade));
        halo.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, gy, R, 0, 6.2832); ctx.fill();
      }

      // ── קרני אור הבוקעות מן הפתח ──
      function drawRays(t, gFade, openF) {
        if (openF <= 0.02) return;
        var oy = bodyTop - 4 * unit;                     // נקודת מוצא הקרניים (שפת התיבה)
        var bright = openF * gFade;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < RAYS; i++) {
          var frac = (i + 0.5) / RAYS;
          var rayAng = -Math.PI / 2 + (frac - 0.5) * 2.0;   // מניפה כלפי מעלה
          var sway = Math.sin(t * 0.0018 + i) * 0.05;
          rayAng += sway;
          var len = (160 + 130 * openF) * unit * (0.7 + 0.5 * ((i * 7) % 5) / 5);
          var halfWdt = (8 + 5 * Math.sin(t * 0.004 + i)) * unit;
          var ex = cx + Math.cos(rayAng) * len;
          var ey = oy + Math.sin(rayAng) * len;
          // משולש קרן עם דעיכה לאורך הקרן
          var grad = ctx.createLinearGradient(cx, oy, ex, ey);
          grad.addColorStop(0, hexA(accent, 0.34 * bright));
          grad.addColorStop(1, hexA(accent, 0));
          var nx = Math.cos(rayAng + Math.PI / 2), ny = Math.sin(rayAng + Math.PI / 2);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(cx - nx * halfWdt * 0.4, oy - ny * halfWdt * 0.4);
          ctx.lineTo(cx + nx * halfWdt * 0.4, oy + ny * halfWdt * 0.4);
          ctx.lineTo(ex + nx * halfWdt, ey + ny * halfWdt);
          ctx.lineTo(ex - nx * halfWdt, ey - ny * halfWdt);
          ctx.closePath();
          ctx.fill();
        }
        // זוהר מרכזי בוהק מן הפתח
        var coreR = (40 + 50 * openF) * unit;
        if (coreR > 0) {
          var core = ctx.createRadialGradient(cx, oy, 0, cx, oy, coreR);
          core.addColorStop(0, hexA('#FFFFFF', 0.6 * bright));
          core.addColorStop(0.4, hexA(accent, 0.4 * bright));
          core.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = core;
          ctx.beginPath(); ctx.arc(cx, oy, coreR, 0, 6.2832); ctx.fill();
        }
        ctx.restore();
      }

      // ── גוף התיבה ──
      function drawChestBody(gFade) {
        var x0 = cx - halfW, y0 = bodyTop;
        // צל קרקע
        ctx.fillStyle = hexA('#000000', 0.22 * gFade);
        ctx.beginPath();
        ctx.ellipse(cx, groundY + 6 * unit, halfW * 1.05, 12 * unit, 0, 0, 6.2832);
        ctx.fill();

        // גוף עץ עם גרדיאנט
        var bg = ctx.createLinearGradient(0, y0, 0, groundY);
        bg.addColorStop(0, hexA(woodMid, 0.98 * gFade));
        bg.addColorStop(1, hexA(woodDark, 0.98 * gFade));
        ctx.fillStyle = bg;
        var r = 10 * unit;
        roundRect(x0, y0, chestW, chestBodyH, r, r, 4 * unit, 4 * unit);
        ctx.fill();

        // לוחות אנכיים (קווי עץ)
        ctx.strokeStyle = hexA(woodDark, 0.5 * gFade);
        ctx.lineWidth = 2 * unit;
        for (var p = 1; p < 4; p++) {
          var px = x0 + (chestW * p) / 4;
          ctx.beginPath();
          ctx.moveTo(px, y0 + 6 * unit);
          ctx.lineTo(px, groundY - 4 * unit);
          ctx.stroke();
        }

        // רצועות מתכת אופקיות זהובות
        ctx.fillStyle = hexA(accent, 0.85 * gFade);
        var bandH = 8 * unit;
        ctx.fillRect(x0, y0 + chestBodyH * 0.34, chestW, bandH);
        ctx.fillStyle = hexA(mixHex(accent, '#FFFFFF', 0.4), 0.6 * gFade);
        ctx.fillRect(x0, y0 + chestBodyH * 0.34, chestW, bandH * 0.4);

        // מנעול זהב במרכז
        var lockW = 26 * unit, lockH = 30 * unit;
        ctx.fillStyle = hexA(accent, 0.95 * gFade);
        roundRect(cx - lockW / 2, y0 + chestBodyH * 0.26, lockW, lockH, 5 * unit, 5 * unit, 5 * unit, 5 * unit);
        ctx.fill();
        ctx.fillStyle = hexA(woodDark, 0.8 * gFade);
        ctx.beginPath();
        ctx.arc(cx, y0 + chestBodyH * 0.26 + lockH * 0.5, 4 * unit, 0, 6.2832);
        ctx.fill();
      }

      // ── המכסה המעוגל (מסתובב סביב ציר הצירים האחורי) ──
      function drawLid(angle, gFade) {
        ctx.save();
        // ציר הצירים בשפה האחורית העליונה של גוף התיבה
        ctx.translate(cx, bodyTop);
        ctx.rotate(-angle);                              // נפתח אחורה (נגד כיוון השעון על המסך)
        // המכסה: מלבן עם קשת עליונה מעוגלת, יושב מעל הציר
        var x0 = -halfW;
        var lg = ctx.createLinearGradient(0, -lidH, 0, 0);
        lg.addColorStop(0, hexA(woodLite, 0.98 * gFade));
        lg.addColorStop(1, hexA(woodMid, 0.98 * gFade));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0, -lidH * 0.45);
        // קשת עליונה מעוגלת
        ctx.quadraticCurveTo(x0, -lidH, x0 + halfW, -lidH);
        ctx.quadraticCurveTo(x0 + chestW, -lidH, x0 + chestW, -lidH * 0.45);
        ctx.lineTo(x0 + chestW, 0);
        ctx.closePath();
        ctx.fill();

        // הצד הפנימי הזוהר של המכסה (בטנת זהב)
        ctx.fillStyle = hexA(mixHex(accent, woodDark, 0.25), 0.5 * gFade);
        ctx.beginPath();
        ctx.moveTo(x0 + 6 * unit, -2 * unit);
        ctx.lineTo(x0 + 6 * unit, -lidH * 0.42);
        ctx.quadraticCurveTo(x0 + 6 * unit, -lidH * 0.9, x0 + halfW, -lidH * 0.9);
        ctx.quadraticCurveTo(x0 + chestW - 6 * unit, -lidH * 0.9, x0 + chestW - 6 * unit, -lidH * 0.42);
        ctx.lineTo(x0 + chestW - 6 * unit, -2 * unit);
        ctx.closePath();
        ctx.fill();

        // רצועות מתכת על המכסה
        ctx.strokeStyle = hexA(accent, 0.85 * gFade);
        ctx.lineWidth = 6 * unit;
        ctx.lineCap = 'round';
        for (var b = -1; b <= 1; b++) {
          var bx = b * halfW * 0.6;
          ctx.beginPath();
          ctx.moveTo(bx, -2 * unit);
          ctx.lineTo(bx, -lidH * 0.86);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── מטבע בודד ──
      function drawCoin(x, y, size, flip, gFade, alpha) {
        // אליפסה (מבט תלת־ממדי בעת היפוך)
        var rxw = size * Math.max(0.18, Math.abs(Math.cos(flip)));
        var ryh = size;
        var grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size * 1.2);
        grad.addColorStop(0, hexA(mixHex(accent, '#FFFFFF', 0.55), alpha * gFade));
        grad.addColorStop(0.55, hexA(accent, alpha * gFade));
        grad.addColorStop(1, hexA(mixHex(accent, woodDark, 0.35), alpha * gFade));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, rxw, ryh, 0, 0, 6.2832);
        ctx.fill();
        // טבעת שפה
        ctx.strokeStyle = hexA(mixHex(accent, woodDark, 0.4), 0.7 * alpha * gFade);
        ctx.lineWidth = Math.max(0.6, size * 0.12);
        ctx.beginPath();
        ctx.ellipse(x, y, rxw * 0.82, ryh * 0.82, 0, 0, 6.2832);
        ctx.stroke();
        // סימן ₪ + נצנוץ (רק כשהמטבע פונה אלינו מספיק)
        if (rxw > size * 0.55) {
          ctx.fillStyle = hexA(mixHex(accent, woodDark, 0.5), 0.85 * alpha * gFade);
          ctx.font = (size * 1.1) + 'px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('₪', x, y + size * 0.04);
          // נצנוץ לבן
          ctx.fillStyle = hexA('#FFFFFF', 0.75 * alpha * gFade);
          ctx.beginPath();
          ctx.arc(x - size * 0.34, y - size * 0.38, size * 0.16, 0, 6.2832);
          ctx.fill();
        }
      }

      // ── אבן חן בודדת (מצולע מְלֻטָּשׁ) ──
      function drawGem(x, y, size, spin, color, gFade, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.82, -size * 0.2);
        ctx.lineTo(size * 0.5, size);
        ctx.lineTo(-size * 0.5, size);
        ctx.lineTo(-size * 0.82, -size * 0.2);
        ctx.closePath();
        var grad = ctx.createLinearGradient(-size, -size, size, size);
        grad.addColorStop(0, hexA(mixHex(color, '#FFFFFF', 0.5), alpha * gFade));
        grad.addColorStop(0.5, hexA(color, alpha * gFade));
        grad.addColorStop(1, hexA(mixHex(color, '#000000', 0.25), alpha * gFade));
        ctx.fillStyle = grad;
        ctx.fill();
        // קו פאות
        ctx.strokeStyle = hexA(mixHex(color, '#FFFFFF', 0.4), 0.6 * alpha * gFade);
        ctx.lineWidth = Math.max(0.5, size * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(0, size);
        ctx.moveTo(-size * 0.82, -size * 0.2); ctx.lineTo(size * 0.82, -size * 0.2);
        ctx.stroke();
        // הדגשה לבנה
        ctx.fillStyle = hexA('#FFFFFF', 0.85 * alpha * gFade);
        ctx.beginPath();
        ctx.arc(-size * 0.26, -size * 0.32, size * 0.16, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // ── כתר גדול עולה (סופר) ──
      function drawCrown(t, gFade, riseF) {
        if (riseF <= 0) return;
        var peakH = 150 * unit;
        var y = bodyTop - 30 * unit - peakH * easeOutCubic(riseF);
        var sway = Math.sin(t * 0.003) * 4 * unit;
        var x = cx + sway;
        var w = 70 * unit, h = 44 * unit;
        var a = (0.5 + 0.5 * riseF) * gFade;
        // הילה סביב הכתר
        var hr = 70 * unit;
        var halo = ctx.createRadialGradient(x, y, 0, x, y, hr);
        halo.addColorStop(0, hexA(accent, 0.5 * a));
        halo.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, hr, 0, 6.2832); ctx.fill();
        // גוף הכתר (שלוש קצות)
        var grad = ctx.createLinearGradient(0, y - h, 0, y + h * 0.2);
        grad.addColorStop(0, hexA(mixHex(accent, '#FFFFFF', 0.5), a));
        grad.addColorStop(1, hexA(accent, a));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y + h * 0.4);
        ctx.lineTo(x - w / 2, y - h * 0.2);
        ctx.lineTo(x - w * 0.28, y + h * 0.05);
        ctx.lineTo(x, y - h * 0.6);
        ctx.lineTo(x + w * 0.28, y + h * 0.05);
        ctx.lineTo(x + w / 2, y - h * 0.2);
        ctx.lineTo(x + w / 2, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
        // אבני חן על הכתר
        var jc = [primary, glow, primary];
        for (var j = -1; j <= 1; j++) {
          ctx.fillStyle = hexA(jc[j + 1], a);
          ctx.beginPath();
          ctx.arc(x + j * w * 0.28, y + h * 0.2, 5 * unit, 0, 6.2832);
          ctx.fill();
          ctx.fillStyle = hexA('#FFFFFF', 0.7 * a);
          ctx.beginPath();
          ctx.arc(x + j * w * 0.28 - 1.5 * unit, y + h * 0.2 - 1.5 * unit, 1.8 * unit, 0, 6.2832);
          ctx.fill();
        }
      }

      // ── מלבן מעוגל עם רדיוסים נפרדים לכל פינה ──
      function roundRect(x, y, w, h, tl, tr, br, bl) {
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + w - tr, y);
        ctx.arcTo(x + w, y, x + w, y + tr, tr);
        ctx.lineTo(x + w, y + h - br);
        ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
        ctx.lineTo(x + bl, y + h);
        ctx.arcTo(x, y + h, x, y + h - bl, bl);
        ctx.lineTo(x, y + tl);
        ctx.arcTo(x, y, x + tl, y, tl);
        ctx.closePath();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // פתיחת המכסה (easeOutBack) → גם שולט בעוצמת הקרניים/ההילה
        var lidP = clamp01((t - lidStart) / Math.max(1, lidDur));
        var lidAngle = maxLidAngle * (lidP > 0 ? Math.max(0, easeOutBack(lidP)) : 0);
        var openF = clamp01(lidAngle / maxLidAngle);

        ctx.lineJoin = 'round';

        // 1) הילה זהובה (מאחור)
        drawGlow(t, gFade, openF);

        // 2) קרני אור בוקעות מן הפתח
        drawRays(t, gFade, openF);

        // 3) כתר גדול עולה (סופר) — מאחורי שפת המכסה, לפני התיבה
        if (isSuper) {
          var riseF = clamp01((t - bigRiseAt) / (dur * 0.32));
          drawCrown(t, gFade, riseF);
        }

        // 4) גוף התיבה
        drawChestBody(gFade);

        // 5) מטבעות + אבני חן (תנועה בליסטית)
        drawProjectiles(coins, t, gFade);
        drawProjectiles(gems, t, gFade);

        // 6) המכסה מעל הכל (מסתיר את מוצא ההזנקה)
        drawLid(lidAngle, gFade);

        // 7) נצנוצים נסחפים
        for (var si = 0; si < sparks.length; si++) {
          var sk = sparks[si];
          if (t < sk.born) continue;
          var sq = clamp01((t - sk.born) / sk.life);
          if (sq >= 1) continue;
          var sx = sk.x + Math.sin(t / 1000 * sk.rate + sk.phase) * sk.amp;
          var sy = sk.baseY - sk.amp * 0.5 * sq - 20 * unit * sq;
          var sa = Math.sin(Math.PI * sq) * (0.55 + 0.45 * Math.sin(t * 0.02 + sk.tw)) * gFade;
          ctx.fillStyle = hexA(sk.color, sa);
          ctx.beginPath();
          ctx.arc(sx, sy, sk.size, 0, 6.2832);
          ctx.fill();
        }

        // 8) טבעת נצנוצים מסיימת (סופר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 900);
          if (fq < 1) {
            var fy = bodyTop - lidH * 0.3;
            for (var fi = 0; fi < finale.length; fi++) {
              var fp = finale[fi];
              var fd = fp.speed * easeOutCubic(fq);
              var fxp = cx + Math.cos(fp.ang) * fd;
              var fyp = fy + Math.sin(fp.ang) * fd;
              var fa = (1 - fq) * gFade;
              var fsl = (10 * (1 - fq) + 3) * unit;
              ctx.strokeStyle = hexA(fp.color, 0.9 * fa);
              ctx.lineWidth = fp.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(fxp, fyp);
              ctx.lineTo(fxp - Math.cos(fp.ang) * fsl, fyp - Math.sin(fp.ang) * fsl);
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

      // ── עדכון + ציור של אוסף קליעים (מטבעות/אבנים) ──
      function drawProjectiles(arr, t, gFade) {
        var originY = bodyTop - lidH * 0.15;             // פתח התיבה
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          if (t < p.born) continue;
          var lt = (t - p.born) / 1000;                  // זמן מאז ההזנקה (שניות)
          // תנועה בליסטית: x ליניארי, y עם כבידה
          var x = cx + p.ox + p.vx * lt;
          var y = originY + p.oy + p.vy * lt + 0.5 * grav * lt * lt;
          // דהייה כשנושר אל מתחת לקרקע
          var alpha = 1;
          if (y > groundY + 10 * unit) {
            alpha = clamp01(1 - (y - (groundY + 10 * unit)) / (90 * unit));
          }
          if (alpha <= 0) continue;
          // clamp אופקי קל כדי לא לחרוג מהמסך
          if (x < -40 * unit || x > W + 40 * unit) continue;
          var spin = p.spin + p.spinRate * lt;
          if (p.kind === 'coin') {
            var flip = p.flip + p.flipRate * lt;
            drawCoin(x, y, p.size, flip, gFade, alpha);
          } else {
            drawGem(x, y, p.size, spin, p.color, gFade, alpha);
          }
        }
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
