/* success-turtle-lagoon.js — מסך הצלחה: צָב יָם בַּלָּגוּנָה 🐢
   מסך עם רקע בָּהִיר (לא שחור!): לגונה טורקיז שטופת שמש — גרדיאנט תכלת→טורקיז
   עם קרני שמש נושמות ובועות עולות (הקנבס מצייר רקע צבעוני אטום מעל כיסוי
   המודל — חריגה מכוונת לבקשת המשתמש). צב ים מצויר וחייכן גולש משמאל למרכז:
   שריון עם תבנית לוחות, ארבעה סנפירים מחתרים בקצב חתירה אמיתי, ראש עם עין
   וחיוך; שלישיית דגיגים שוחה אחריו ושובל בועות נגרר. בסופר: צב גדול יותר,
   להקת דגיגים גדולה ופרץ פנינים נוצץ באמצע. נרשם לפי החוזה
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
    name: 'turtle-lagoon',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var praise  = opts.praise || 'שׂוֹחָה קָדִימָה!';

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

      // ─── הצב: גולש משמאל אל המרכז ───
      var TS = (isSuper ? 1.35 : 1) * 66 * unit;          // קנה מידה (רדיוס שריון)
      var fromX = -TS * 3, toX = W * 0.46;
      var swimDur = dur * 0.62;
      var baseY = H * 0.52;
      var shellCol = '#2FA36B', shellRim = '#1E7A4C', plateCol = '#6FDCA4';
      var skinCol = '#8FE0B8', skinDark = '#57B884';

      // ─── דגיגים נלווים ───
      var fish = [];
      var NF = isSuper ? 7 : 3;
      var fCols = [accent, '#FF9AB8', mixHex(primary, '#FFFFFF', 0.3), '#7CC8F0'];
      for (var i = 0; i < NF; i++) {
        fish.push({
          dx: -TS * (1.8 + (i % 3) * 0.75) - (i > 2 ? TS * 1.4 : 0),
          dy: (i - NF / 2) * 26 * unit + 8 * unit,
          size: (10 + (i % 3) * 3) * unit,
          ph: i * 1.3,
          color: fCols[i % fCols.length]
        });
      }

      // ─── בועות עולות (רקע) + שובל בועות מהצב ───
      var bubbles = [];
      var NB = isSuper ? 26 : 16;
      for (var b = 0; b < NB; b++) {
        bubbles.push({
          x: Math.random() * W, born: Math.random() * dur * 0.8,
          speed: (60 + Math.random() * 90) * unit,
          r: (2.5 + Math.random() * 5) * unit,
          wob: Math.random() * 6.2832
        });
      }
      var trail = [];
      var NT = isSuper ? 14 : 9;
      for (var tb = 0; tb < NT; tb++) {
        trail.push({ born: dur * 0.12 + tb * dur * 0.055, r: (2 + Math.random() * 3.5) * unit,
                     up: (46 + Math.random() * 60) * unit, wob: Math.random() * 6.2832 });
      }

      // ─── פרץ פנינים (סופר) ───
      var pearlsAt = dur * 0.6, pearls = [];
      if (isSuper) for (var p = 0; p < 16; p++) {
        pearls.push({ ang: (p / 16) * 6.2832, speed: (110 + Math.random() * 90) * unit,
                      r: (3.5 + Math.random() * 3) * unit });
      }

      // ─── טקסט שבח — צל כהה כדי לקרוא על טורקיז בהיר ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:#FFFFFF;' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 3px 10px rgba(4,60,70,.7),0 0 22px ' + hexA(accent, 0.85) + ',0 1px 2px rgba(4,60,70,.85)';
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
          'text-shadow:0 2px 8px rgba(4,60,70,.75),0 0 14px ' + hexA(accent, 0.9);
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── הרקע הבהיר: מי לגונה + קרני שמש נושמות ──
      function drawWater(t, bgA) {
        ctx.save();
        ctx.globalAlpha = bgA;
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#9FF0EA');
        g.addColorStop(0.4, '#4FD4D2');
        g.addColorStop(1, '#1690B4');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // נצנוץ פני המים למעלה
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (var w = 0; w < 5; w++) {
          var wx = (w / 5) * W + Math.sin(t * 0.0012 + w * 2) * 30 * unit;
          ctx.beginPath();
          ctx.ellipse(wx + W * 0.1, H * 0.045, 60 * unit, 5 * unit, 0, 0, 6.2832);
          ctx.fill();
        }
        // קרני שמש אלכסוניות נושמות
        for (var r = 0; r < 4; r++) {
          var bx = W * (0.15 + 0.24 * r);
          var breathe = 0.5 + 0.5 * Math.sin(t * 0.0009 + r * 1.5);
          var grad = ctx.createLinearGradient(bx, 0, bx - W * 0.12, H);
          grad.addColorStop(0, 'rgba(255,255,240,' + (0.20 + 0.14 * breathe) + ')');
          grad.addColorStop(1, 'rgba(255,255,240,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(bx - 18 * unit, 0);
          ctx.lineTo(bx + 26 * unit, 0);
          ctx.lineTo(bx - W * 0.1 + 40 * unit, H);
          ctx.lineTo(bx - W * 0.1 - 40 * unit, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // ── סנפיר (אליפסה מסתובבת סביב כתף) ──
      function flipper(px, py, len, wid, baseAng, paddle, a) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(baseAng + paddle);
        var g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, hexA(skinDark, a));
        g.addColorStop(1, hexA(skinCol, a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // ── הצב: שריון + לוחות + ראש + 4 סנפירים חותרים ──
      function drawTurtle(x, y, t, a) {
        var sec = t / 1000;
        var paddle = Math.sin(sec * 5.2) * 0.5;           // קצב חתירה
        var bob = Math.sin(sec * 2.1) * 6 * unit;
        y += bob;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(sec * 2.1 + 1) * 0.04);

        // סנפירים אחוריים (מאחורי השריון)
        flipper(-TS * 0.72, TS * 0.28, TS * 0.5, TS * 0.28, 2.6, paddle * 0.5, a);
        flipper(-TS * 0.72, -TS * 0.28, TS * 0.5, TS * 0.28, -2.6, -paddle * 0.5, a);
        // סנפירים קדמיים גדולים
        flipper(TS * 0.42, TS * 0.42, TS * 0.95, TS * 0.4, 1.05, paddle, a);
        flipper(TS * 0.42, -TS * 0.42, TS * 0.95, TS * 0.4, -1.05, -paddle, a);

        // זנב קטן
        ctx.fillStyle = hexA(skinDark, a);
        ctx.beginPath();
        ctx.moveTo(-TS * 0.95, 0);
        ctx.lineTo(-TS * 1.2, -TS * 0.1);
        ctx.lineTo(-TS * 1.2, TS * 0.1);
        ctx.closePath(); ctx.fill();

        // ראש + צוואר (לפני השריון, בכיוון התנועה)
        var hx = TS * 1.02, hr = TS * 0.34;
        ctx.fillStyle = hexA(skinCol, a);
        ctx.beginPath();
        ctx.ellipse(TS * 0.78, 0, TS * 0.36, TS * 0.2, 0, 0, 6.2832);  // צוואר
        ctx.fill();
        var hg = ctx.createRadialGradient(hx - hr * 0.3, -hr * 0.3, 0, hx, 0, hr * 1.2);
        hg.addColorStop(0, hexA(mixHex(skinCol, '#FFFFFF', 0.35), a));
        hg.addColorStop(1, hexA(skinCol, a));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(hx, 0, hr, hr * 0.85, 0, 0, 6.2832);
        ctx.fill();
        // עין + חיוך
        ctx.fillStyle = hexA('#1A3A2A', a);
        ctx.beginPath(); ctx.arc(hx + hr * 0.35, -hr * 0.22, hr * 0.14, 0, 6.2832); ctx.fill();
        ctx.fillStyle = hexA('#FFFFFF', 0.85 * a);
        ctx.beginPath(); ctx.arc(hx + hr * 0.30, -hr * 0.28, hr * 0.05, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = hexA('#1A3A2A', 0.75 * a);
        ctx.lineWidth = 1.6 * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(hx + hr * 0.28, hr * 0.14, hr * 0.3, 0.25, 1.35);
        ctx.stroke();

        // השריון: כיפה + שפה בהירה
        var sg = ctx.createRadialGradient(-TS * 0.15, -TS * 0.35, 0, 0, 0, TS * 1.12);
        sg.addColorStop(0, hexA(mixHex(shellCol, '#FFFFFF', 0.25), a));
        sg.addColorStop(0.75, hexA(shellCol, a));
        sg.addColorStop(1, hexA(shellRim, a));
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(0, 0, TS, TS * 0.74, 0, 0, 6.2832);
        ctx.fill();
        ctx.strokeStyle = hexA(shellRim, a);
        ctx.lineWidth = 3 * unit;
        ctx.stroke();
        // לוחות השריון (משושה מרכזי + עלי כותרת)
        ctx.strokeStyle = hexA(plateCol, 0.8 * a);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        var pr = TS * 0.34;
        for (var h = 0; h <= 6; h++) {
          var ha = (h / 6) * 6.2832 + 0.26;
          var hxp = Math.cos(ha) * pr, hyp = Math.sin(ha) * pr * 0.74;
          if (h === 0) ctx.moveTo(hxp, hyp); else ctx.lineTo(hxp, hyp);
        }
        for (var h2 = 0; h2 < 6; h2++) {
          var ha2 = (h2 / 6) * 6.2832 + 0.26;
          ctx.moveTo(Math.cos(ha2) * pr, Math.sin(ha2) * pr * 0.74);
          ctx.lineTo(Math.cos(ha2) * TS * 0.9, Math.sin(ha2) * TS * 0.66);
        }
        ctx.stroke();
        // ברק על השריון
        ctx.fillStyle = 'rgba(255,255,255,' + 0.3 * a + ')';
        ctx.beginPath();
        ctx.ellipse(-TS * 0.3, -TS * 0.34, TS * 0.3, TS * 0.13, -0.4, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // ── דגיג קטן ──
      function drawFish(fx, fy, size, ph, color, t, a) {
        var sec = t / 1000;
        var wag = Math.sin(sec * 7 + ph) * 0.35;
        ctx.save();
        ctx.translate(fx, fy + Math.sin(sec * 3 + ph) * 5 * unit);
        ctx.fillStyle = hexA(color, 0.95 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.55, 0, 0, 6.2832);
        ctx.fill();
        // זנב מתנפנף
        ctx.save();
        ctx.translate(-size, 0);
        ctx.rotate(wag);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size * 0.8, -size * 0.5);
        ctx.lineTo(-size * 0.8, size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // עין
        ctx.fillStyle = hexA('#183040', a);
        ctx.beginPath(); ctx.arc(size * 0.5, -size * 0.1, size * 0.13, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        var bgA = Math.min(1, t / 200) * gFade;
        ctx.clearRect(0, 0, W, H);

        drawWater(t, bgA);

        // בועות רקע עולות
        for (var b = 0; b < bubbles.length; b++) {
          var bb = bubbles[b];
          if (t < bb.born) continue;
          var lt = (t - bb.born) / 1000;
          var byp = H + bb.r - bb.speed * lt;
          if (byp < -bb.r) continue;
          var bxp = bb.x + Math.sin(lt * 2 + bb.wob) * 12 * unit;
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.5 * bgA + ')';
          ctx.lineWidth = 1.2 * unit;
          ctx.beginPath(); ctx.arc(bxp, byp, bb.r, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + 0.28 * bgA + ')';
          ctx.beginPath(); ctx.arc(bxp - bb.r * 0.3, byp - bb.r * 0.3, bb.r * 0.3, 0, 6.2832); ctx.fill();
        }

        // הצב גולש פנימה
        var sp = clamp01(t / swimDur);
        var tx = fromX + (toX - fromX) * easeOutCubic(sp);
        drawTurtle(tx, baseY, t, bgA);

        // שובל בועות מאחורי הצב
        for (var tr = 0; tr < trail.length; tr++) {
          var tp2 = trail[tr];
          if (t < tp2.born) continue;
          var ltt = (t - tp2.born) / 1000;
          var q = clamp01(ltt / 1.1);
          if (q >= 1) continue;
          var bx2 = tx - TS * 1.3 - ltt * 30 * unit + Math.sin(ltt * 4 + tp2.wob) * 8 * unit;
          var by2 = baseY - tp2.up * q;
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.55 * (1 - q) * bgA + ')';
          ctx.lineWidth = 1.2 * unit;
          ctx.beginPath(); ctx.arc(bx2, by2, tp2.r * (0.6 + q), 0, 6.2832); ctx.stroke();
        }

        // דגיגים נלווים
        for (var f = 0; f < fish.length; f++) {
          var ff = fish[f];
          drawFish(tx + ff.dx, baseY + ff.dy, ff.size, ff.ph, ff.color, t, bgA);
        }

        // פרץ פנינים (סופר)
        if (isSuper && t >= pearlsAt) {
          var pq2 = clamp01((t - pearlsAt) / 900);
          if (pq2 < 1) {
            for (var p2 = 0; p2 < pearls.length; p2++) {
              var pe = pearls[p2];
              var pd = pe.speed * easeOutCubic(pq2);
              var px2 = tx + Math.cos(pe.ang) * pd;
              var py2 = baseY + Math.sin(pe.ang) * pd * 0.7;
              var pa = (1 - pq2) * gFade;
              var pg = ctx.createRadialGradient(px2 - pe.r * 0.3, py2 - pe.r * 0.3, 0, px2, py2, pe.r);
              pg.addColorStop(0, 'rgba(255,255,255,' + pa + ')');
              pg.addColorStop(1, hexA('#D8E8F4', 0.75 * pa));
              ctx.fillStyle = pg;
              ctx.beginPath(); ctx.arc(px2, py2, pe.r, 0, 6.2832); ctx.fill();
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
