/* success-star-train.js — מסך הצלחה: רַכֶּבֶת כּוֹכָבִים 🚂✨
   רכבת לילה קסומה חוצה את המסך מימין לשמאל (כיוון קריאה עברי!) על מסילת
   נצנצים: קטר עגלגל עם ארובה שפולטת פחי עשן בצורת כוכבים, פנס קדמי שולח
   אלומת אור, גלגלים מסתובבים עם חישורים, ושניים-שלושה קרונות עם חלונות
   מוארים חמים. אבק כוכבים נגרר מאחור ומסילת הנצנצים מרצדת. בסופר: רכבת
   ארוכה יותר (4 קרונות), מהירה יותר, ופרץ כוכבים כשמגיעה למרכז.
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
  function starPath(ctx, x, y, rOut, rIn, rot) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? rIn : rOut;
      var a = rot + (i / 10) * 6.2832 - 1.5708;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  window.SUCCESS.styles.push({
    name: 'star-train',
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
      var praise  = opts.praise || 'נוֹסַעַת רָחוֹק!';

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

      // ─── הרכבת ───
      var railY = H * 0.60;                                // קו המסילה
      var CH = (isSuper ? 66 : 60) * unit;                 // גובה תא הקטר
      var wheelR = 13 * unit;
      var NC = isSuper ? 4 : 2;                            // קרונות
      var carW = CH * 1.5, carGap = 14 * unit;
      var locoW = CH * 1.9;
      var trainLen = locoW + NC * (carW + carGap);
      // נוסעת מימין לשמאל: מתחילה מחוץ למסך מימין ומסיימת כשכולה בפנים משמאל
      var fromX = W + 40 * unit, toX = W * 0.5 - trainLen * 0.5 + trainLen; // חזית הקטר נעצרת כך שהרכבת ממורכזת
      var travelDur = dur * 0.78;
      var carCols = [primary, glow, accent, mixHex(primary, '#FF8FB8', 0.5)];

      // ─── פחי עשן — כוכבים עולים מהארובה ───
      var puffs = [];
      var NP = isSuper ? 22 : 13;
      for (var p = 0; p < NP; p++) {
        puffs.push({
          born: dur * 0.06 + p * dur * 0.05,
          life: 900 + Math.random() * 500,
          drift: (14 + Math.random() * 22) * unit,
          rise: (46 + Math.random() * 55) * unit,
          size: (4 + Math.random() * 5) * unit,
          rot: Math.random() * 6.2832
        });
      }

      // ─── מסילת נצנצים ───
      var railTw = [];
      for (var r = 0; r < 30; r++) railTw.push(Math.random() * 6.2832);

      // ─── פרץ כוכבים במרכז (סופר) ───
      var burstAt = dur * 0.66, burst = [];
      if (isSuper) for (var b = 0; b < 26; b++) {
        burst.push({ ang: (b / 26) * 6.2832 + Math.random() * 0.2,
                     speed: (140 + Math.random() * 130) * unit,
                     size: (2.4 + Math.random() * 3) * unit,
                     color: carCols[b % carCols.length] });
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

      // ── גלגל עם חישורים מסתובבים ──
      function wheel(x, y, rr, rot, a) {
        ctx.fillStyle = hexA('#3A4458', a);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = hexA('#B8C4D8', 0.9 * a);
        ctx.lineWidth = 2 * unit;
        ctx.beginPath(); ctx.arc(x, y, rr * 0.82, 0, 6.2832); ctx.stroke();
        ctx.lineWidth = 1.6 * unit;
        for (var s = 0; s < 4; s++) {
          var sa = rot + s * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(sa) * rr * 0.8, y - Math.sin(sa) * rr * 0.8);
          ctx.lineTo(x + Math.cos(sa) * rr * 0.8, y + Math.sin(sa) * rr * 0.8);
          ctx.stroke();
        }
        ctx.fillStyle = hexA(accent, a);
        ctx.beginPath(); ctx.arc(x, y, rr * 0.2, 0, 6.2832); ctx.fill();
      }

      // ── קרון ──
      function drawCar(x, y, wdt, color, wheelRot, a, t, i) {
        // גוף
        var g = ctx.createLinearGradient(0, y - CH * 0.72, 0, y);
        g.addColorStop(0, hexA(mixHex(color, '#FFFFFF', 0.28), a));
        g.addColorStop(1, hexA(color, a));
        ctx.fillStyle = g;
        ctx.beginPath();
        var rr = 8 * unit;
        ctx.moveTo(x + rr, y - CH * 0.72);
        ctx.lineTo(x + wdt - rr, y - CH * 0.72);
        ctx.arcTo(x + wdt, y - CH * 0.72, x + wdt, y - CH * 0.72 + rr, rr);
        ctx.lineTo(x + wdt, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y - CH * 0.72 + rr);
        ctx.arcTo(x, y - CH * 0.72, x + rr, y - CH * 0.72, rr);
        ctx.closePath();
        ctx.fill();
        // גג
        ctx.fillStyle = hexA(mixHex(color, '#202848', 0.4), a);
        ctx.fillRect(x - 3 * unit, y - CH * 0.78, wdt + 6 * unit, 7 * unit);
        // חלונות מוארים
        var wn = 2, wwd = wdt * 0.24;
        for (var w = 0; w < wn; w++) {
          var wx = x + wdt * (0.18 + 0.44 * w);
          var flick = 0.8 + 0.2 * Math.sin(t * 0.008 + i * 2 + w * 3);
          ctx.fillStyle = hexA('#FFE9B0', 0.92 * flick * a);
          ctx.beginPath();
          ctx.moveTo(wx + 3 * unit, y - CH * 0.58);
          ctx.lineTo(wx + wwd - 3 * unit, y - CH * 0.58);
          ctx.arcTo(wx + wwd, y - CH * 0.58, wx + wwd, y - CH * 0.5, 4 * unit);
          ctx.lineTo(wx + wwd, y - CH * 0.24);
          ctx.lineTo(wx, y - CH * 0.24);
          ctx.lineTo(wx, y - CH * 0.5);
          ctx.arcTo(wx, y - CH * 0.58, wx + 3 * unit, y - CH * 0.58, 4 * unit);
          ctx.closePath();
          ctx.fill();
        }
        // גלגלים
        wheel(x + wdt * 0.24, y, wheelR * 0.85, wheelRot, a);
        wheel(x + wdt * 0.76, y, wheelR * 0.85, wheelRot, a);
      }

      // ── הקטר (חרטום פונה שמאלה — כיוון הנסיעה) ──
      function drawLoco(x, y, wheelRot, a, t) {
        // דוד הקטר (גליל שוכב עם חרטום מעוגל)
        var bw = locoW * 0.62, bh = CH * 0.5;
        var g = ctx.createLinearGradient(0, y - bh - CH * 0.2, 0, y);
        g.addColorStop(0, hexA(mixHex(primary, '#FFFFFF', 0.3), a));
        g.addColorStop(1, hexA(mixHex(primary, '#283058', 0.35), a));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + bw, y);
        ctx.lineTo(x + bh * 0.5, y);
        ctx.arc(x + bh * 0.5, y - bh * 0.5, bh * 0.5, 1.5708, 4.7124, false); // חרטום עגול
        ctx.lineTo(x + bw, y - bh);
        ctx.closePath();
        ctx.fill();
        // תא הנהג (מאחור, גבוה)
        var cw = locoW * 0.4;
        var cg = ctx.createLinearGradient(0, y - CH, 0, y);
        cg.addColorStop(0, hexA(mixHex(primary, '#FFFFFF', 0.2), a));
        cg.addColorStop(1, hexA(mixHex(primary, '#283058', 0.4), a));
        ctx.fillStyle = cg;
        ctx.beginPath();
        var rr = 7 * unit;
        ctx.moveTo(x + bw + rr, y - CH);
        ctx.lineTo(x + bw + cw - rr, y - CH);
        ctx.arcTo(x + bw + cw, y - CH, x + bw + cw, y - CH + rr, rr);
        ctx.lineTo(x + bw + cw, y);
        ctx.lineTo(x + bw, y);
        ctx.lineTo(x + bw, y - CH + rr);
        ctx.arcTo(x + bw, y - CH, x + bw + rr, y - CH, rr);
        ctx.closePath();
        ctx.fill();
        // גג התא + חלון
        ctx.fillStyle = hexA(mixHex(primary, '#181C38', 0.55), a);
        ctx.fillRect(x + bw - 3 * unit, y - CH - 6 * unit, cw + 6 * unit, 7 * unit);
        var flick = 0.85 + 0.15 * Math.sin(t * 0.009);
        ctx.fillStyle = hexA('#FFE9B0', 0.92 * flick * a);
        ctx.beginPath();
        ctx.arc(x + bw + cw * 0.5, y - CH * 0.62, CH * 0.16, 0, 6.2832);
        ctx.fill();
        // ארובה
        var chimX = x + bh * 0.62;
        ctx.fillStyle = hexA(mixHex(accent, '#7A5A20', 0.35), a);
        ctx.beginPath();
        ctx.moveTo(chimX - 7 * unit, y - bh);
        ctx.lineTo(chimX + 7 * unit, y - bh);
        ctx.lineTo(chimX + 10 * unit, y - bh - CH * 0.34);
        ctx.lineTo(chimX - 10 * unit, y - bh - CH * 0.34);
        ctx.closePath();
        ctx.fill();
        // פנס קדמי + אלומה שמאלה
        var lx = x + 2 * unit, ly = y - bh * 0.5;
        var beam = ctx.createLinearGradient(lx, ly, lx - 150 * unit, ly);
        beam.addColorStop(0, hexA('#FFF2C0', 0.5 * a));
        beam.addColorStop(1, hexA('#FFF2C0', 0));
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 5 * unit);
        ctx.lineTo(lx - 150 * unit, ly - 30 * unit);
        ctx.lineTo(lx - 150 * unit, ly + 30 * unit);
        ctx.lineTo(lx, ly + 5 * unit);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hexA('#FFF6D8', 0.95 * a);
        ctx.beginPath(); ctx.arc(lx + 2 * unit, ly, 5.5 * unit, 0, 6.2832); ctx.fill();
        // מרים-פסים (cow-catcher)
        ctx.fillStyle = hexA('#B8C4D8', 0.9 * a);
        ctx.beginPath();
        ctx.moveTo(x + 4 * unit, y - 6 * unit);
        ctx.lineTo(x - 12 * unit, y + wheelR);
        ctx.lineTo(x + 10 * unit, y + wheelR);
        ctx.closePath();
        ctx.fill();
        // גלגלים: גדול + קטן
        wheel(x + bw * 0.72, y, wheelR * 1.25, wheelRot, a);
        wheel(x + bw * 0.3, y, wheelR * 0.85, wheelRot * 1.4, a);
        wheel(x + bw + cw * 0.55, y, wheelR * 0.85, wheelRot * 1.4, a);
        return { chimX: chimX, chimY: y - bh - CH * 0.34 };
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';

        // ── מסילת נצנצים ──
        var wy = railY + wheelR + 4 * unit;
        var railG = ctx.createLinearGradient(0, wy, W, wy);
        railG.addColorStop(0, hexA(glow, 0.05));
        railG.addColorStop(0.5, hexA(glow, 0.5 * gFade));
        railG.addColorStop(1, hexA(glow, 0.05));
        ctx.strokeStyle = railG;
        ctx.lineWidth = 3 * unit;
        ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.stroke();
        // אדני נצנץ
        for (var r = 0; r < railTw.length; r++) {
          var rx = (r + 0.5) * W / railTw.length;
          var twk = 0.4 + 0.6 * Math.sin(t * 0.006 + railTw[r]);
          ctx.fillStyle = hexA('#FFFFFF', 0.5 * twk * gFade);
          ctx.beginPath(); ctx.arc(rx, wy + 5 * unit, 1.6 * unit * twk + 0.6 * unit, 0, 6.2832); ctx.fill();
        }

        // ── מיקום הרכבת (חזית הקטר) ──
        var mv = easeOutCubic(clamp01(t / travelDur));
        var headX = fromX + (toX - fromX - trainLen) * mv;  // קצה שמאלי (חרטום)
        var wheelRot = -t * 0.012;                           // גלגלים מסתובבים (שמאלה)

        // אבק כוכבים נגרר מאחורי הרכבת
        var tailX = headX + trainLen;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (var d = 0; d < 7; d++) {
          var ddx = tailX + d * 16 * unit + Math.sin(t * 0.01 + d) * 5 * unit;
          var da = (1 - d / 7) * 0.4 * gFade;
          ctx.fillStyle = hexA(glow, da);
          ctx.beginPath(); ctx.arc(ddx, railY - CH * 0.3 + Math.sin(t * 0.008 + d * 2) * 8 * unit, (3.5 - d * 0.4) * unit, 0, 6.2832); ctx.fill();
        }
        ctx.restore();

        // הקרונות (מאחורי הקטר, כלומר מימינו)
        var cxr = headX + locoW + carGap;
        for (var c = 0; c < NC; c++) {
          drawCar(cxr, railY, carW, carCols[c % carCols.length], wheelRot, gFade, t, c);
          cxr += carW + carGap;
        }
        // הקטר
        var chim = drawLoco(headX, railY, wheelRot, gFade, t);

        // פחי עשן — כוכבים עולים מהארובה
        for (var p = 0; p < puffs.length; p++) {
          var pf = puffs[p];
          if (t < pf.born) continue;
          var q = clamp01((t - pf.born) / pf.life);
          if (q >= 1) continue;
          // נולד במיקום הארובה של אותו רגע — מקורב לפי המיקום הנוכחי פחות הנסיעה מאז
          var bornMv = easeOutCubic(clamp01(pf.born / travelDur));
          var bornChimX = fromX + (toX - fromX - trainLen) * bornMv + (chim.chimX - headX);
          var px2 = bornChimX + pf.drift * q + 10 * unit * q;
          var py2 = chim.chimY - pf.rise * q;
          var pa = Math.sin(Math.PI * q) * 0.9 * gFade;
          ctx.fillStyle = hexA(q < 0.5 ? '#FFF2C0' : accent, pa);
          starPath(ctx, px2, py2, pf.size * (0.7 + q), pf.size * (0.3 + q * 0.4), pf.rot + q * 3);
          ctx.fill();
        }

        // פרץ כוכבים במרכז (סופר)
        if (isSuper && t >= burstAt) {
          var bq = clamp01((t - burstAt) / 900);
          if (bq < 1) {
            for (var bi = 0; bi < burst.length; bi++) {
              var bp = burst[bi];
              var bd = bp.speed * easeOutCubic(bq);
              var bx2 = W / 2 + Math.cos(bp.ang) * bd;
              var by2 = railY - CH * 0.6 + Math.sin(bp.ang) * bd * 0.8;
              ctx.fillStyle = hexA(bp.color, 0.9 * (1 - bq) * gFade);
              starPath(ctx, bx2, by2, bp.size * 1.6, bp.size * 0.6, bq * 5);
              ctx.fill();
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
