/* success-ferris-wheel.js — מסך הצלחה: גַּלְגַּל עֲנָק זוֹהֵר 🎡
   גלגל ענק לילי של לונה-פארק קופץ פנימה (easeOutBack) ומסתובב לאט: חישוק עם
   נורות מנצנצות בצבעי הפלטה, חישורים, וגונדולות צבעוניות שנשארות זקופות תמיד
   (תלויות בכובד) — כל אחת עם חלון זוהר חמים. רגלי תמיכה בצורת A ונצנוצים
   נסחפים סביב. בסופר: גלגל גדול ומהיר יותר, יותר גונדולות וטבעת זיקוקים
   מסיימת סביב הציר. קריא להפליא מעל הכיסוי הכהה (אורות לונה-פארק בלילה).
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
    name: 'ferris-wheel',
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
      var praise  = opts.praise || 'מִסְתּוֹבֶבֶת מֵאֹשֶׁר!';

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

      // ─── גיאומטריית הגלגל ───
      var cx = W / 2, cy = H * 0.5;
      var R = (isSuper ? 175 : 145) * unit;               // רדיוס החישוק
      var groundY = cy + R + 62 * unit;
      var NG = isSuper ? 10 : 8;                          // גונדולות
      var NL = isSuper ? 22 : 16;                         // נורות על החישוק
      var spinRate = (isSuper ? 0.00062 : 0.00046);       // רד/מ״ש
      var gondCols = [primary, accent, glow, '#FF8FB8', '#7CE8B5'];

      // ─── נצנוצים נסחפים ───
      var sparks = [];
      var NS = isSuper ? 40 : 24;
      var sparkCols = ['#FFFFFF', accent, glow, primary];
      for (var s = 0; s < NS; s++) {
        sparks.push({
          x: cx + (Math.random() - 0.5) * R * 3.2,
          y: cy + (Math.random() - 0.5) * R * 2.6,
          amp: (8 + Math.random() * 22) * unit,
          rate: 1 + Math.random() * 2,
          phase: Math.random() * 6.2832,
          born: Math.random() * dur * 0.6,
          life: 700 + Math.random() * 800,
          size: (1 + Math.random() * 2.2) * unit,
          color: sparkCols[s % sparkCols.length]
        });
      }

      // ─── טבעת זיקוקים מסיימת (סופר) ───
      var finaleAt = dur * 0.74, finale = [];
      if (isSuper) for (var f = 0; f < 40; f++) {
        finale.push({ ang: (f / 40) * 6.2832 + Math.random() * 0.12,
                      speed: (150 + Math.random() * 110) * unit,
                      size: (1.6 + Math.random() * 2.2) * unit,
                      color: sparkCols[f % sparkCols.length] });
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

      // ── גונדולה אחת (נשארת זקופה תמיד) ──
      function drawGondola(x, y, color, a, t, i) {
        var gw = 26 * unit, gh = 20 * unit;
        // מתלה
        ctx.strokeStyle = hexA('#B8C4D8', 0.85 * a);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10 * unit);
        ctx.stroke();
        var ty = y + 10 * unit;
        // תא מעוגל
        var g = ctx.createLinearGradient(0, ty, 0, ty + gh);
        g.addColorStop(0, hexA(mixHex(color, '#FFFFFF', 0.3), a));
        g.addColorStop(1, hexA(color, a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - gw / 2, ty + gh * 0.25);
        ctx.quadraticCurveTo(x - gw / 2, ty, x - gw / 4, ty);
        ctx.lineTo(x + gw / 4, ty);
        ctx.quadraticCurveTo(x + gw / 2, ty, x + gw / 2, ty + gh * 0.25);
        ctx.quadraticCurveTo(x + gw / 2, ty + gh, x, ty + gh);
        ctx.quadraticCurveTo(x - gw / 2, ty + gh, x - gw / 2, ty + gh * 0.25);
        ctx.closePath();
        ctx.fill();
        // חלון זוהר חמים (מהבהב עדין)
        var wtw = 0.75 + 0.25 * Math.sin(t * 0.006 + i * 1.9);
        ctx.fillStyle = hexA('#FFE9B0', 0.9 * wtw * a);
        ctx.beginPath();
        ctx.ellipse(x, ty + gh * 0.42, gw * 0.26, gh * 0.24, 0, 0, 6.2832);
        ctx.fill();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';

        // pop-in של כל הגלגל
        var popF = Math.max(0.001, clamp01(t / (dur * 0.14)));
        var pop = Math.max(0, easeOutBack(popF));
        var ang = t * spinRate;                            // זווית הסיבוב

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pop, pop);
        ctx.translate(-cx, -cy);

        // הילה רכה מאחורי הגלגל
        var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
        halo.addColorStop(0, hexA(primary, 0.16 * gFade));
        halo.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.7, 0, 6.2832); ctx.fill();

        // רגלי תמיכה A + בסיס
        ctx.strokeStyle = hexA('#8A96B0', 0.9 * gFade);
        ctx.lineWidth = 7 * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.62, groundY); ctx.lineTo(cx, cy);
        ctx.moveTo(cx + R * 0.62, groundY); ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.strokeStyle = hexA('#6A768E', 0.9 * gFade);
        ctx.lineWidth = 5 * unit;
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.8, groundY); ctx.lineTo(cx + R * 0.8, groundY);
        ctx.stroke();

        // חישורים
        ctx.strokeStyle = hexA('#AAB6CC', 0.75 * gFade);
        ctx.lineWidth = 2.6 * unit;
        for (var sp2 = 0; sp2 < NG; sp2++) {
          var sa = ang + (sp2 / NG) * 6.2832;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R);
          ctx.stroke();
        }
        // חישוק כפול
        ctx.strokeStyle = hexA('#C4CEE0', 0.9 * gFade);
        ctx.lineWidth = 4 * unit;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = hexA('#8A96B0', 0.6 * gFade);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 6.2832); ctx.stroke();

        // נורות מנצנצות על החישוק
        for (var l = 0; l < NL; l++) {
          var la = ang * 1.0 + (l / NL) * 6.2832;
          var lx = cx + Math.cos(la) * R, ly = cy + Math.sin(la) * R;
          var lc = sparkCols[l % sparkCols.length];
          var tw = 0.55 + 0.45 * Math.sin(t * 0.01 + l * 2.4);
          ctx.fillStyle = hexA(lc, 0.95 * tw * gFade);
          ctx.beginPath(); ctx.arc(lx, ly, 3.4 * unit * (0.7 + 0.5 * tw), 0, 6.2832); ctx.fill();
        }

        // ציר מרכזי זוהר
        var hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16 * unit);
        hub.addColorStop(0, hexA('#FFFFFF', 0.95 * gFade));
        hub.addColorStop(0.5, hexA(accent, 0.9 * gFade));
        hub.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = hub;
        ctx.beginPath(); ctx.arc(cx, cy, 16 * unit, 0, 6.2832); ctx.fill();

        // גונדולות — בקצוות החישורים, זקופות תמיד
        for (var g2 = 0; g2 < NG; g2++) {
          var ga = ang + (g2 / NG) * 6.2832;
          drawGondola(cx + Math.cos(ga) * R, cy + Math.sin(ga) * R,
                      gondCols[g2 % gondCols.length], gFade, t, g2);
        }
        ctx.restore();

        // נצנוצים נסחפים
        for (var si = 0; si < sparks.length; si++) {
          var sk = sparks[si];
          if (t < sk.born) continue;
          var sq = clamp01((t - sk.born) / sk.life);
          if (sq >= 1) continue;
          var sx = sk.x + Math.sin(t / 1000 * sk.rate + sk.phase) * sk.amp;
          var sy = sk.y - 20 * unit * sq;
          ctx.fillStyle = hexA(sk.color, Math.sin(Math.PI * sq) * 0.8 * gFade);
          ctx.beginPath(); ctx.arc(sx, sy, sk.size, 0, 6.2832); ctx.fill();
        }

        // טבעת זיקוקים מסיימת (סופר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 900);
          if (fq < 1) {
            for (var fi = 0; fi < finale.length; fi++) {
              var fp = finale[fi];
              var fd = R * 0.4 + fp.speed * easeOutCubic(fq);
              var fx1 = cx + Math.cos(fp.ang) * fd, fy1 = cy + Math.sin(fp.ang) * fd;
              ctx.strokeStyle = hexA(fp.color, 0.9 * (1 - fq) * gFade);
              ctx.lineWidth = fp.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(fx1, fy1);
              ctx.lineTo(fx1 - Math.cos(fp.ang) * 12 * unit * (1 - fq),
                         fy1 - Math.sin(fp.ang) * 12 * unit * (1 - fq));
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
