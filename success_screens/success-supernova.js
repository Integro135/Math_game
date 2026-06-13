/* success-supernova.js — מסך הצלחה: סוּפֶּרְנוֹבָה
   כוכב במרכז קורס פנימה (חלקיקים נשאבים אליו והוא מתבהר), ואז מתפוצץ:
   הבזק רך, גלי הדף מתרחבים, ענן ערפילית צבעוני וגשם חלקיקים — ובמרכז
   נשאר פולסר מנצנץ. בסופר: שלושה גלי הדף, יותר חלקיקים והבזק גדול יותר.
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

  window.SUCCESS.styles.push({
    name: 'supernova',
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
      var praise  = opts.praise || 'אַתְּ כּוֹכֶבֶת עָל!';

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

      var cx = W / 2, cy = H * 0.42;
      var unit = Math.min(W, H) / 800;                         // קנה מידה למסכים קטנים
      var maxR = Math.max(W, H) * (isSuper ? 0.60 : 0.48);
      var tE = dur * 0.28;                                     // רגע הפיצוץ

      // ─── חלקיקי קריסה — נשאבים אל הכוכב לפני הפיצוץ ───
      var infall = [];
      var NI = isSuper ? 46 : 30;
      for (var i = 0; i < NI; i++) {
        var born = Math.random() * tE * 0.5;
        infall.push({
          ang: Math.random() * 6.2832,
          r0: (90 + Math.random() * 170) * unit,
          born: born,
          life: tE - born,                                     // מגיע למרכז בדיוק בפיצוץ
          w: 0.8 + Math.random() * 1.2
        });
      }

      // ─── חלקיקי פיצוץ ───
      var ejecta = [];
      var NE = isSuper ? 170 : 90;
      var ecolors = [glow, primary, accent, '#FFFFFF', '#FFFFFF'];
      for (var j = 0; j < NE; j++) {
        ejecta.push({
          ang: Math.random() * 6.2832,
          speed: 0.25 + Math.pow(Math.random(), 1.5) * 0.75,   // שבר מ-maxR
          life: dur * 0.72 * (0.7 + Math.random() * 0.3),
          size: (1 + Math.random() * 2.2) * unit,
          streak: Math.random() < 0.3,                         // חלקם פסי אנרגיה
          color: ecolors[j % ecolors.length]
        });
      }

      // ─── ערפילית — כתמי צבע רכים שמתרחבים אחרי הפיצוץ ───
      var nebula = [];
      var ncolors = [primary, accent, glow, primary, accent, glow];
      for (var k = 0; k < 6; k++) {
        nebula.push({
          dx: (Math.random() - 0.5) * 90 * unit,
          dy: (Math.random() - 0.5) * 90 * unit,
          baseR: (45 + Math.random() * 50) * unit,
          color: ncolors[k]
        });
      }

      // גלי הדף: רגיל — אחד; סופר — שלושה בזה אחר זה
      var shocks = isSuper ? [tE, tE + 260, tE + 540] : [tE];

      // ─── אבק כוכבים — כוכבונים שגל ההדף "מדליק" מאחוריו ───
      var dust = [];
      var ND = isSuper ? 70 : 40;
      var dcolors = ['#FFFFFF', '#FFFFFF', glow, accent];
      for (var di = 0; di < ND; di++) {
        var dd = maxR * (0.12 + Math.random() * 0.45);
        // מתי גל ההדף הראשון מגיע לרדיוס הזה (היפוך easeOutCubic)
        var dq = 1 - Math.pow(1 - dd / (maxR * 1.05), 1 / 3);
        dust.push({
          x: cx + Math.cos(Math.random() * 6.2832) * dd,
          y: cy + Math.sin(Math.random() * 6.2832) * dd,
          arr: dq * dur * 0.55,
          r: (0.8 + Math.random() * 1.4) * unit,
          tw: Math.random() * 6.28,
          color: dcolors[di % dcolors.length]
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:67%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = tE + 120;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:79%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        if (t < tE) {
          // ─── שלב הקריסה ───
          var charge = t / tE;
          for (var ii = 0; ii < infall.length; ii++) {
            var f = infall[ii];
            var fq = clamp01((t - f.born) / f.life);
            if (fq <= 0 || fq >= 1) continue;
            var fr = f.r0 * (1 - fq * fq);                     // מאיץ פנימה
            var fx = cx + Math.cos(f.ang) * fr, fy = cy + Math.sin(f.ang) * fr;
            var len = (10 + 16 * fq) * unit;                   // פס המצביע פנימה
            ctx.strokeStyle = hexA(ii % 2 ? glow : '#FFFFFF', fq * 0.8 * gFade);
            ctx.lineWidth = f.w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(cx + Math.cos(f.ang) * (fr + len), cy + Math.sin(f.ang) * (fr + len));
            ctx.stroke();
          }
          // הכוכב מתבהר, פועם מהר יותר ומתנפח לקראת הסוף
          var swell = charge > 0.85 ? 1 + (charge - 0.85) * 4 : 1;
          var cr = (5 + 9 * charge) * unit * swell *
                   (1 + 0.12 * charge * Math.sin(t * 0.02 * (1 + 2 * charge)));
          var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 6);
          cg.addColorStop(0, 'rgba(255,255,255,' + (0.5 + 0.5 * charge) + ')');
          cg.addColorStop(0.3, hexA(accent, 0.5 * charge + 0.2));
          cg.addColorStop(1, hexA(accent, 0));
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(cx, cy, cr * 6, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.2832); ctx.fill();
        } else {
          // ─── אחרי הפיצוץ ───
          var te = t - tE;

          // ערפילית מתרחבת
          var nq = clamp01(te / (dur - tE));
          var na = Math.sin(Math.PI * nq) * 0.20;
          for (var ni = 0; ni < nebula.length; ni++) {
            var nb = nebula[ni];
            var nr = nb.baseR + nq * maxR * 0.30;
            var ng = ctx.createRadialGradient(cx + nb.dx * (1 + nq * 2), cy + nb.dy * (1 + nq * 2), 0,
                                              cx + nb.dx * (1 + nq * 2), cy + nb.dy * (1 + nq * 2), nr);
            ng.addColorStop(0, hexA(nb.color, na * gFade));
            ng.addColorStop(1, hexA(nb.color, 0));
            ctx.fillStyle = ng;
            ctx.beginPath();
            ctx.arc(cx + nb.dx * (1 + nq * 2), cy + nb.dy * (1 + nq * 2), nr, 0, 6.2832);
            ctx.fill();
          }

          // גלי הדף
          for (var si = 0; si < shocks.length; si++) {
            var ste = t - shocks[si];
            if (ste < 0) continue;
            var sq = clamp01(ste / (dur * 0.55));
            if (sq >= 1) continue;
            var sr = maxR * 1.05 * easeOutCubic(sq);
            var sa = (1 - sq) * gFade;
            ctx.strokeStyle = hexA(glow, 0.22 * sa);           // הילה רחבה
            ctx.lineWidth = (12 * (1 - sq) + 4) * unit;
            ctx.beginPath(); ctx.arc(cx, cy, sr, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * sa + ')';  // קצה בהיר
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(cx, cy, sr, 0, 6.2832); ctx.stroke();
          }

          // אבק כוכבים — נדלק כשגל ההדף עובר, מנצנץ עד הסוף
          for (var du = 0; du < dust.length; du++) {
            var d = dust[du];
            var da = clamp01((te - d.arr) / 220);
            if (da <= 0) continue;
            ctx.fillStyle = hexA(d.color, da * (0.45 + 0.4 * Math.sin(t * 0.01 + d.tw)) * gFade);
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, 6.2832);
            ctx.fill();
          }

          // חלקיקי פיצוץ
          for (var ei = 0; ei < ejecta.length; ei++) {
            var e = ejecta[ei];
            var eq = clamp01(te / e.life);
            if (eq >= 1) continue;
            var ed = e.speed * maxR * easeOutCubic(eq);
            var ex = cx + Math.cos(e.ang) * ed, ey = cy + Math.sin(e.ang) * ed;
            var ea = (1 - eq) * gFade;
            if (e.streak) {
              var sl = (16 * (1 - eq) + 4) * unit;
              ctx.strokeStyle = hexA(e.color, 0.85 * ea);
              ctx.lineWidth = e.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(ex, ey);
              ctx.lineTo(ex - Math.cos(e.ang) * sl, ey - Math.sin(e.ang) * sl);
              ctx.stroke();
            } else {
              ctx.fillStyle = hexA(e.color, 0.9 * ea);
              ctx.beginPath();
              ctx.arc(ex, ey, e.size * (1 - eq * 0.5), 0, 6.2832);
              ctx.fill();
            }
          }

          // הבזק רך (דועך מהר)
          var fa = (isSuper ? 0.5 : 0.4) * Math.exp(-te / 180) * gFade;
          if (fa > 0.01) {
            var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.35, hexA(accent, fa * 0.5));
            fg.addColorStop(1, hexA(accent, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }

          // פולסר — שריד מנצנץ במרכז
          var pa = clamp01((te - 250) / 300) * gFade;
          if (pa > 0) {
            var prr = (3 + Math.sin(t * 0.015) * 1.2) * unit * (isSuper ? 1.4 : 1);
            var pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, prr * 6);
            pg.addColorStop(0, 'rgba(255,255,255,' + 0.9 * pa + ')');
            pg.addColorStop(0.4, hexA(glow, 0.5 * pa));
            pg.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(cx, cy, prr * 6, 0, 6.2832); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,' + pa + ')';
            ctx.beginPath(); ctx.arc(cx, cy, prr, 0, 6.2832); ctx.fill();
            if (isSuper) {                                     // הבזק-צלב לפולסר
              var fl = prr * (5 + 2 * Math.sin(t * 0.015));
              ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * pa + ')';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(cx - fl, cy); ctx.lineTo(cx + fl, cy);
              ctx.moveTo(cx, cy - fl); ctx.lineTo(cx, cy + fl);
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
