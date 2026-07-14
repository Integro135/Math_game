/* success-ice-cream-tower.js — מסך הצלחה: מִגְדַּל גְּלִידָה 🍦
   גביע וופל קופץ למרכז (easeOutBack), ואז כדורי גלידה בצבעי פסטל של הפלטה
   צונחים מלמעלה אחד־אחד ומתיישבים זה על זה עם squash-and-settle. בראש נוחת
   דובדבן אדום עם נצנוץ וטבעת הבזק. סוכריות צבעוניות (מקלונים זעירים מסתובבים)
   יורדות ברקע כל הזמן. בסופר: מגדל גבוה יותר (5 כדורים), גשם סוכריות כפול
   ופרץ סוכריות רדיאלי כשנוחת הדובדבן. נרשם לפי החוזה ב-success_screens_spec.md —
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
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255;
    var g = Math.round(g1 + (g2 - g1) * t) & 255;
    var b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  window.SUCCESS.styles.push({
    name: 'ice-cream-tower',
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
      var praise  = opts.praise || 'מְתוּקָה שֶׁלִּי!';

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

      // ─── גיאומטריית הגביע והכדורים ───
      var cx = W / 2;
      var coneTipY = H * 0.82;                            // חוד הגביע
      var coneW = (isSuper ? 120 : 108) * unit;           // רוחב פתח הגביע
      var coneH = (isSuper ? 150 : 135) * unit;           // גובה הגביע
      var coneTopY = coneTipY - coneH;
      var scoopR = coneW * 0.62;                          // רדיוס כדור

      // צבעי הכדורים — פסטלים של הפלטה + תות ומנטה
      var scoopCols = [
        mixHex(primary, '#FFFFFF', 0.45),
        mixHex(glow, '#FFFFFF', 0.45),
        '#FFC2D9',                                        // תות
        mixHex(accent, '#FFFFFF', 0.3),
        '#BFF0DC'                                         // מנטה
      ];
      var NSC = isSuper ? 5 : 3;
      var scoops = [];
      for (var i = 0; i < NSC; i++) {
        scoops.push({
          y: coneTopY - scoopR * 0.62 - i * scoopR * 1.06, // מקום סופי במגדל
          at: 0.16 + i * (isSuper ? 0.115 : 0.15),         // שיעור התחלת הצניחה
          color: scoopCols[i % scoopCols.length]
        });
      }
      var scoopDrop = dur * 0.16;                          // משך צניחת כדור
      var topY = scoops[NSC - 1].y;                        // ראש המגדל
      var cherryAt = scoops[NSC - 1].at + 0.17;            // הדובדבן אחרי הכדור האחרון
      var cherryR = 11 * unit;

      // ─── גשם סוכריות (מקלונים זעירים מסתובבים) ───
      var rain = [];
      var NR = isSuper ? 64 : 36;
      var sprCols = [primary, accent, glow, '#FF8FB8', '#7CE8B5', '#FFFFFF'];
      for (var r = 0; r < NR; r++) {
        rain.push({
          x: Math.random() * W,
          born: dur * 0.1 + Math.random() * dur * 0.7,
          speed: (140 + Math.random() * 160) * unit,
          len: (7 + Math.random() * 6) * unit,
          spin: Math.random() * 6.2832,
          spinRate: (Math.random() - 0.5) * 9,
          color: sprCols[r % sprCols.length]
        });
      }

      // ─── פרץ סוכריות רדיאלי כשנוחת הדובדבן ───
      var burst = [];
      var NB = isSuper ? 30 : 18;
      for (var b = 0; b < NB; b++) {
        burst.push({
          ang: (b / NB) * 6.2832 + Math.random() * 0.2,
          speed: (170 + Math.random() * 150) * unit,
          len: (6 + Math.random() * 5) * unit,
          spinRate: (Math.random() - 0.5) * 12,
          color: sprCols[b % sprCols.length]
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
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = dur * 0.3;

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

      // ── הגביע: משולש הפוך עם סריג וופל ──
      function drawCone(popF, gFade) {
        if (popF <= 0) return;
        var e = Math.max(0, easeOutBack(popF));
        ctx.save();
        ctx.translate(cx, coneTipY);
        ctx.scale(e, e);
        ctx.translate(-cx, -coneTipY);
        var g = ctx.createLinearGradient(cx - coneW / 2, 0, cx + coneW / 2, 0);
        g.addColorStop(0, hexA('#E8B268', 0.98 * gFade));
        g.addColorStop(0.5, hexA('#D89A48', 0.98 * gFade));
        g.addColorStop(1, hexA('#B87830', 0.98 * gFade));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - coneW / 2, coneTopY);
        ctx.lineTo(cx + coneW / 2, coneTopY);
        ctx.lineTo(cx, coneTipY);
        ctx.closePath();
        ctx.fill();
        // סריג וופל (קווים אלכסוניים חתוכים למשולש)
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = hexA('#A06024', 0.55 * gFade);
        ctx.lineWidth = 1.8 * unit;
        var step = 13 * unit;
        for (var d = -coneH; d < coneH * 2; d += step) {
          ctx.beginPath();
          ctx.moveTo(cx - coneW / 2 + d, coneTopY);
          ctx.lineTo(cx - coneW / 2 + d - coneH * 0.55, coneTipY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + coneW / 2 - d, coneTopY);
          ctx.lineTo(cx + coneW / 2 - d + coneH * 0.55, coneTipY);
          ctx.stroke();
        }
        ctx.restore();
        // שפה עליונה
        ctx.fillStyle = hexA('#F0C078', 0.98 * gFade);
        ctx.fillRect(cx - coneW / 2 - 3 * unit, coneTopY - 4 * unit, coneW + 6 * unit, 8 * unit);
        ctx.restore();
      }

      // ── כדור גלידה: כיפה עם טפטופים ונצנוץ ──
      function drawScoop(x, y, rr, color, squashY, gFade, alpha) {
        var g = ctx.createRadialGradient(x - rr * 0.32, y - rr * 0.36, 0, x, y, rr * 1.15);
        g.addColorStop(0, hexA(mixHex(color, '#FFFFFF', 0.5), alpha * gFade));
        g.addColorStop(0.6, hexA(color, alpha * gFade));
        g.addColorStop(1, hexA(mixHex(color, '#7A5A8A', 0.25), alpha * gFade));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rr, rr * squashY, 0, 0, 6.2832);
        ctx.fill();
        // שוליים מטפטפים (שלוש בליטות בתחתית)
        for (var d = -1; d <= 1; d++) {
          ctx.beginPath();
          ctx.ellipse(x + d * rr * 0.55, y + rr * squashY * 0.72, rr * 0.24, rr * 0.30 * squashY, 0, 0, 6.2832);
          ctx.fill();
        }
        // ברק לבן
        ctx.fillStyle = hexA('#FFFFFF', 0.5 * alpha * gFade);
        ctx.beginPath();
        ctx.ellipse(x - rr * 0.34, y - rr * 0.34, rr * 0.2, rr * 0.13, -0.6, 0, 6.2832);
        ctx.fill();
      }

      // ── דובדבן + גבעול ──
      function drawCherry(x, y, popF, gFade) {
        if (popF <= 0) return;
        var a = Math.min(1, popF * 1.4);
        // גבעול
        ctx.strokeStyle = hexA('#6A8A3A', 0.95 * a * gFade);
        ctx.lineWidth = 2.6 * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - cherryR * 0.5);
        ctx.quadraticCurveTo(x + cherryR * 0.9, y - cherryR * 2.1, x + cherryR * 1.6, y - cherryR * 2.4);
        ctx.stroke();
        // הדובדבן
        var g = ctx.createRadialGradient(x - cherryR * 0.3, y - cherryR * 0.3, 0, x, y, cherryR * 1.15);
        g.addColorStop(0, hexA('#FF7A8A', a * gFade));
        g.addColorStop(0.7, hexA('#E82C4C', a * gFade));
        g.addColorStop(1, hexA('#B01830', a * gFade));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, cherryR, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.8 * a * gFade);
        ctx.beginPath();
        ctx.arc(x - cherryR * 0.32, y - cherryR * 0.34, cherryR * 0.22, 0, 6.2832);
        ctx.fill();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var f = t / dur;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        // הילה רכה מאחורי המגדל
        var hy = (coneTipY + topY) / 2;
        var halo = ctx.createRadialGradient(cx, hy, 0, cx, hy, 260 * unit);
        halo.addColorStop(0, hexA(accent, 0.16 * gFade));
        halo.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, hy, 260 * unit, 0, 6.2832); ctx.fill();

        // גשם סוכריות (מאחורי המגדל)
        for (var ri = 0; ri < rain.length; ri++) {
          var rp = rain[ri];
          if (t < rp.born) continue;
          var rt = (t - rp.born) / 1000;
          var ry = -20 * unit + rp.speed * rt;
          if (ry > H + 20 * unit) continue;
          var spin = rp.spin + rp.spinRate * rt;
          ctx.strokeStyle = hexA(rp.color, 0.85 * gFade);
          ctx.lineWidth = 3 * unit;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(rp.x - Math.cos(spin) * rp.len / 2, ry - Math.sin(spin) * rp.len / 2);
          ctx.lineTo(rp.x + Math.cos(spin) * rp.len / 2, ry + Math.sin(spin) * rp.len / 2);
          ctx.stroke();
        }

        // הגביע קופץ פנימה
        drawCone(clamp01(f / 0.14), gFade);

        // הכדורים צונחים ונערמים
        for (var i = 0; i < scoops.length; i++) {
          var sc = scoops[i];
          var sp = clamp01((f - sc.at) / (scoopDrop / dur));
          if (sp <= 0) continue;
          var e = easeOutCubic(sp);
          var y = -scoopR + (sc.y + scoopR) * e;          // מלמעלה אל מקומו
          // squash בנחיתה: רגע ההגעה מוחץ מעט את הכדור, ואז מתאושש
          var squash = 1;
          if (sp > 0.82) squash = 1 - 0.16 * Math.sin((sp - 0.82) / 0.18 * Math.PI);
          drawScoop(cx, sp >= 1 ? sc.y : y, scoopR, sc.color, squash, gFade, Math.min(1, sp * 3));
        }

        // הדובדבן צונח לראש המגדל
        var cp = clamp01((f - cherryAt) / 0.14);
        if (cp > 0) {
          var cy = topY - scoopR * 0.95;
          var yNow = -cherryR + (cy + cherryR) * easeOutCubic(cp);
          drawCherry(cx, cp >= 1 ? cy : yNow, cp, gFade);
          // טבעת הבזק + פרץ סוכריות בנחיתה
          var bq = clamp01((f - cherryAt - 0.13) / 0.36);
          if (bq > 0 && bq < 1) {
            ctx.strokeStyle = hexA('#FFFFFF', 0.7 * (1 - bq) * gFade);
            ctx.lineWidth = 2.5 * unit;
            ctx.beginPath();
            ctx.arc(cx, cy, (cherryR + 70 * unit * easeOutCubic(bq)), 0, 6.2832);
            ctx.stroke();
            for (var bi = 0; bi < burst.length; bi++) {
              var bp = burst[bi];
              var bd = bp.speed * easeOutCubic(bq);
              var bx = cx + Math.cos(bp.ang) * bd;
              var by = cy + Math.sin(bp.ang) * bd + 40 * unit * bq * bq;
              var spn = bp.spinRate * bq * 3;
              ctx.strokeStyle = hexA(bp.color, 0.95 * (1 - bq) * gFade);
              ctx.lineWidth = 3 * unit;
              ctx.beginPath();
              ctx.moveTo(bx - Math.cos(spn) * bp.len / 2, by - Math.sin(spn) * bp.len / 2);
              ctx.lineTo(bx + Math.cos(spn) * bp.len / 2, by + Math.sin(spn) * bp.len / 2);
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
