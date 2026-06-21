/* success-sky-lanterns.js — מסך הצלחה: פָּנָסֵי שָׁמַיִם
   פנסי נייר זוהרים עולים מלמטה אל שמי לילה זרועי כוכבים. כל פנס: גוף טרפז מעוגל
   בגרדיאנט חם, הילה זוהרת, להבה קטנה מרצדת בפנים, ושובל עדין כלפי מעלה; הם
   מתנדנדים הצידה (סינוס, פאזה שונה) בעודם עולים במהירויות שונות ומתכווצים מעט עם
   המרחק. כוכבי רקע מנצנצים (נקודות עם אלפא פועם) וכמה גחלילים נסחפים. בסופר: יותר
   פנסים, פנס-ענק מוביל, הילות בהירות יותר, וכוכב נופל חוצה את המסך. נרשם לפי החוזה
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
  // מאיר/מכהה גוון #rrggbb ומחזיר #rrggbb תקין (לעולם לא 'rgb(...)' או שם צבע)
  function shade(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    if (f >= 0) {                       // מאיר לעבר לבן
      r = Math.round(r + (255 - r) * f);
      g = Math.round(g + (255 - g) * f);
      b = Math.round(b + (255 - b) * f);
    } else {                            // מכהה לעבר שחור
      var k = 1 + f;
      r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
    }
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  window.SUCCESS.styles.push({
    name: 'sky-lanterns',
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
      var praise  = opts.praise || 'אַתְּ אוֹר שֶׁל הַשָּׁמַיִם!';

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

      var unit = Math.min(W, H) / 800;   // קנה מידה לכל המסכים (גם 342×455)

      // גווני גוף הפנס — חמים, נגזרים מ-accent/primary (תמיד #rrggbb)
      var bodyTop = [shade(accent, 0.35), shade(primary, 0.30), shade(accent, 0.20)];
      var bodyBot = [shade(accent, -0.20), shade(primary, -0.25), shade('#FF7E4D', -0.10)];

      // ─── פנסים ───
      var N = isSuper ? 14 : 8;
      var lanterns = [];
      for (var i = 0; i < N; i++) {
        var depth = Math.random();                       // 0=רחוק/קטן, 1=קרוב/גדול
        lanterns.push({
          xBase: 0.08 + 0.84 * ((i + Math.random() * 0.5) / N),  // שבר מ-W
          born: Math.random() * dur * 0.30,
          rise: (0.40 + Math.random() * 0.45 + depth * 0.25),    // מהירות עלייה
          size: (26 + Math.random() * 16) * unit * (0.7 + depth * 0.6),
          swayPhase: Math.random() * 6.2832,
          swayRate: 0.6 + Math.random() * 0.7,
          swayAmp: (16 + Math.random() * 22) * unit,
          flick: Math.random() * 6.2832,
          depth: depth,
          ci: i % bodyTop.length
        });
      }
      // פנס-ענק מוביל (סופר) — מצויר מעל השאר, גדול ובהיר במיוחד
      var lead = null;
      if (isSuper) {
        lead = {
          xBase: 0.5,
          born: 0,
          rise: 0.34,
          size: 64 * unit,
          swayPhase: 0,
          swayRate: 0.5,
          swayAmp: 22 * unit,
          flick: 0,
          depth: 1,
          ci: 0
        };
      }

      // ─── כוכבי רקע מנצנצים ───
      var NS = isSuper ? 64 : 44;
      var stars = [];
      for (var s = 0; s < NS; s++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.78,
          r: (0.6 + Math.random() * 1.6) * unit,
          base: 0.25 + Math.random() * 0.45,
          amp: 0.25 + Math.random() * 0.45,
          rate: 1.5 + Math.random() * 3.0,
          phase: Math.random() * 6.2832
        });
      }

      // ─── גחלילים נסחפים ───
      var NE = isSuper ? 18 : 10;
      var embers = [];
      var emberCols = [accent, glow, '#FFFFFF'];
      for (var e = 0; e < NE; e++) {
        embers.push({
          x: Math.random() * W,
          y: H * (0.4 + Math.random() * 0.6),
          drift: (Math.random() - 0.5) * 26 * unit,
          rise: (18 + Math.random() * 40) * unit,
          size: (0.8 + Math.random() * 1.8) * unit,
          phase: Math.random() * 6.2832,
          rate: 1.2 + Math.random() * 2.4,
          color: emberCols[e % emberCols.length]
        });
      }

      // ─── כוכב נופל (סופר) ───
      var shootAt = dur * 0.46;
      var shootDur = 700;
      var shootY = H * (0.12 + Math.random() * 0.12);
      var shootX0 = W * 1.05, shootX1 = -W * 0.1;        // ימין → שמאל
      var shootDrop = H * 0.16;

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:60%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
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
          'position:absolute;left:50%;top:72%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── מצייר פנס בודד ──
      function drawLantern(lt, t, gFade) {
        var age = t - lt.born;
        if (age < 0) return;
        var sz = lt.size;
        // עלייה מלמטה כלפי מעלה
        var y = H + sz * 2.4 - lt.rise * age * 0.18 * unit * 0.9 - lt.rise * age * 0.10;
        if (y < -sz * 2.6) return;
        var x = W * lt.xBase + Math.sin(age * 0.001 * lt.swayRate + lt.swayPhase) * lt.swayAmp;
        var flick = 0.78 + 0.22 * Math.sin(t * 0.018 + lt.flick) + 0.06 * Math.sin(t * 0.041 + lt.flick * 2);
        var a = (0.5 + 0.5 * lt.depth) * gFade;          // קרובים אטומים יותר

        var topCol = bodyTop[lt.ci];
        var botCol = bodyBot[lt.ci];

        // שובל עדין כלפי מעלה
        var trailG = ctx.createLinearGradient(x, y - sz * 2.2, x, y - sz * 0.6);
        trailG.addColorStop(0, hexA(accent, 0));
        trailG.addColorStop(1, hexA(accent, 0.10 * a * flick));
        ctx.fillStyle = trailG;
        ctx.beginPath();
        ctx.moveTo(x - sz * 0.18, y - sz * 0.6);
        ctx.lineTo(x + sz * 0.18, y - sz * 0.6);
        ctx.lineTo(x + sz * 0.05, y - sz * 2.2);
        ctx.lineTo(x - sz * 0.05, y - sz * 2.2);
        ctx.closePath();
        ctx.fill();

        // הילה זוהרת סביב הפנס
        var halR = sz * (isSuper ? 2.4 : 2.0);
        var halo = ctx.createRadialGradient(x, y, 0, x, y, halR);
        halo.addColorStop(0, hexA(glow, 0.34 * a * flick));
        halo.addColorStop(0.4, hexA(accent, 0.20 * a * flick));
        halo.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(x, y, halR, 0, 6.2832); ctx.fill();

        // גוף הפנס — טרפז מעוגל (צר למעלה, רחב למטה), גרדיאנט חם
        var wTop = sz * 0.62, wBot = sz * 0.86;
        var hTop = y - sz * 0.95, hBot = y + sz * 0.95;
        var bodyG = ctx.createLinearGradient(0, hTop, 0, hBot);
        bodyG.addColorStop(0, hexA(topCol, 0.92 * a));
        bodyG.addColorStop(0.5, hexA(shade(topCol, -0.05), 0.96 * a * flick));
        bodyG.addColorStop(1, hexA(botCol, 0.95 * a));
        ctx.fillStyle = bodyG;
        var rTop = sz * 0.22, rBot = sz * 0.26;
        ctx.beginPath();
        ctx.moveTo(x - wTop + rTop, hTop);
        ctx.lineTo(x + wTop - rTop, hTop);
        ctx.quadraticCurveTo(x + wTop, hTop, x + wTop + (wBot - wTop) * 0.5, y);
        ctx.quadraticCurveTo(x + wBot, hBot - rBot, x + wBot - rBot, hBot);
        ctx.lineTo(x - wBot + rBot, hBot);
        ctx.quadraticCurveTo(x - wBot, hBot - rBot, x - wTop - (wBot - wTop) * 0.5, y);
        ctx.quadraticCurveTo(x - wTop, hTop, x - wTop + rTop, hTop);
        ctx.closePath();
        ctx.fill();

        // הדגשת אור פנימית (פנס מואר מבפנים)
        var inG = ctx.createRadialGradient(x, y + sz * 0.15, 0, x, y + sz * 0.15, sz * 0.9);
        inG.addColorStop(0, hexA('#FFFFFF', 0.55 * a * flick));
        inG.addColorStop(0.5, hexA(shade(accent, 0.4), 0.30 * a * flick));
        inG.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = inG;
        ctx.beginPath(); ctx.arc(x, y + sz * 0.1, sz * 0.9, 0, 6.2832); ctx.fill();

        // כתר/פתח עליון
        ctx.fillStyle = hexA(shade(accent, -0.3), 0.7 * a);
        ctx.fillRect(x - wTop * 0.9, hTop - sz * 0.06, wTop * 1.8, sz * 0.10);

        // להבה קטנה מרצדת בפנים
        var fh = sz * (0.30 + 0.10 * Math.sin(t * 0.03 + lt.flick * 3));
        var fx = x + Math.sin(t * 0.02 + lt.flick) * sz * 0.04;
        var fy = y + sz * 0.32;
        var flG = ctx.createRadialGradient(fx, fy - fh * 0.3, 0, fx, fy - fh * 0.3, fh);
        flG.addColorStop(0, hexA('#FFFFFF', 0.95 * a));
        flG.addColorStop(0.4, hexA(accent, 0.9 * a));
        flG.addColorStop(1, hexA(shade(accent, -0.2), 0));
        ctx.fillStyle = flG;
        ctx.beginPath();
        ctx.moveTo(fx, fy - fh);
        ctx.quadraticCurveTo(fx + fh * 0.5, fy - fh * 0.2, fx, fy + fh * 0.2);
        ctx.quadraticCurveTo(fx - fh * 0.5, fy - fh * 0.2, fx, fy - fh);
        ctx.closePath();
        ctx.fill();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);

        var appear = easeOutCubic(clamp01(t / (dur * 0.25)));

        // 1) כוכבי רקע מנצנצים
        for (var si = 0; si < stars.length; si++) {
          var st = stars[si];
          var tw = st.base + st.amp * (0.5 + 0.5 * Math.sin(t * 0.001 * st.rate + st.phase));
          ctx.fillStyle = hexA('#FFFFFF', clamp01(tw) * appear * gFade);
          ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.2832); ctx.fill();
        }

        // 2) גחלילים נסחפים
        for (var ei = 0; ei < embers.length; ei++) {
          var em = embers[ei];
          var ey = em.y - em.rise * (t * 0.001) * 0.6;
          var ex = em.x + Math.sin(t * 0.001 * em.rate + em.phase) * em.drift;
          if (ey < -10) { ey = ((ey % (H + 20)) + (H + 20)) % (H + 20); }
          var ea = (0.35 + 0.35 * Math.sin(t * 0.004 * em.rate + em.phase)) * appear * gFade;
          ctx.fillStyle = hexA(em.color, clamp01(ea));
          ctx.beginPath(); ctx.arc(ex, ey, em.size, 0, 6.2832); ctx.fill();
        }

        // 3) כוכב נופל (סופר)
        if (isSuper && t >= shootAt) {
          var shq = clamp01((t - shootAt) / shootDur);
          if (shq < 1) {
            var p = easeOutCubic(shq);
            var hx = shootX0 + (shootX1 - shootX0) * p;
            var hy = shootY + shootDrop * p;
            var tailLen = 120 * unit;
            var dirx = (shootX1 - shootX0), diry = shootDrop;
            var dl = Math.sqrt(dirx * dirx + diry * diry) || 1;
            var ux = dirx / dl, uy = diry / dl;
            var sha = Math.sin(Math.PI * shq) * gFade;
            var tg = ctx.createLinearGradient(hx, hy, hx - ux * tailLen, hy - uy * tailLen);
            tg.addColorStop(0, hexA('#FFFFFF', 0.95 * sha));
            tg.addColorStop(0.4, hexA(glow, 0.6 * sha));
            tg.addColorStop(1, hexA(glow, 0));
            ctx.strokeStyle = tg;
            ctx.lineWidth = 3 * unit;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx - ux * tailLen, hy - uy * tailLen);
            ctx.stroke();
            ctx.fillStyle = hexA('#FFFFFF', 0.95 * sha);
            ctx.beginPath(); ctx.arc(hx, hy, 2.6 * unit, 0, 6.2832); ctx.fill();
          }
        }

        // 4) פנסים (ממוינים לפי עומק — רחוקים תחילה)
        // ציור ישיר לפי סדר המערך שמערבב עומקים; הקרובים אטומים יותר ממילא.
        for (var li = 0; li < lanterns.length; li++) {
          drawLantern(lanterns[li], t, gFade);
        }
        // פנס-ענק מוביל אחרון, מעל כולם (סופר)
        if (lead) drawLantern(lead, t, gFade);

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
