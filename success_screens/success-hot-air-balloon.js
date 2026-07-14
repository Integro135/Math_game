/* success-hot-air-balloon.js — מסך הצלחה: כַּדּוּר פּוֹרֵחַ 🎈☁️
   מסך עם רקע בָּהִיר (לא שחור!): שמי יום תכולים עם שמש רכה ועננים צפים —
   הקנבס מצייר רקע צבעוני אטום מעל כיסוי המודל (חריגה מכוונת מכלל "אל תצבע
   רקע" של הספק, לבקשת המשתמש). כדור פורח גדול עם פסים אנכיים בצבעי הפלטה
   מרחף מעלה מתחתית המסך אל המרכז עם נדנוד עדין, סל נצרים תלוי בחבלים, ובאמצע
   הדרך מתפרץ ממנו קונפטי צבעוני. בסופר: כדור גדול יותר + כדור חבר קטן + עוד
   קונפטי. הרקע נכנס ויוצא בעמעום רך כדי שהדילוג יישאר חלק.
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
    name: 'hot-air-balloon',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 3500 : 1700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var praise  = opts.praise || 'מַמְרִיאָה גָּבוֹהַּ!';

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

      // ─── הכדור ───
      var cx = W / 2;
      var R = (isSuper ? 130 : 108) * unit;              // רדיוס המעטפת
      var gores = 8;                                      // פסים אנכיים
      var goreCols = [primary, '#FFFFFF', accent, '#FFFFFF', glow, '#FFFFFF', mixHex(primary, accent, 0.5), '#FFFFFF'];
      var riseFrom = H + R * 2.4, riseTo = H * 0.44;      // ממריא אל מרכז המסך
      var riseDur = dur * 0.62;

      // כדור חבר קטן (סופר)
      var buddy = isSuper ? { x: W * 0.78, from: H + R, to: H * 0.30, scale: 0.42, delay: dur * 0.18 } : null;

      // ─── עננים ───
      var clouds = [];
      for (var c = 0; c < 4; c++) {
        clouds.push({
          x: W * (0.1 + 0.8 * Math.random()),
          y: H * (0.10 + 0.45 * Math.random()),
          s: (0.7 + Math.random() * 0.9) * unit,
          v: (6 + Math.random() * 10) * unit * (c % 2 ? 1 : -1)
        });
      }

      // ─── קונפטי מהסל ───
      var confetti = [];
      var NC = isSuper ? 46 : 26;
      var confCols = [primary, accent, glow, '#FF8FB8', '#7CE8B5', '#FFFFFF'];
      var confAt = dur * 0.5;
      for (var i = 0; i < NC; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        var sp = (170 + Math.random() * 220) * unit;
        confetti.push({
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          born: confAt + Math.random() * dur * 0.08,
          w: (5 + Math.random() * 5) * unit, h: (3 + Math.random() * 3) * unit,
          spin: Math.random() * 6.2832, spinRate: (Math.random() - 0.5) * 12,
          color: confCols[i % confCols.length]
        });
      }
      var grav = 620 * unit;

      // ─── טקסט שבח — צל כהה חזק כדי לקרוא על שמיים בהירים ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:#FFFFFF;' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 3px 10px rgba(10,40,80,.65),0 0 22px ' + hexA(primary, 0.85) + ',0 1px 2px rgba(10,40,80,.8)';
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
          'text-shadow:0 2px 8px rgba(10,40,80,.7),0 0 14px ' + hexA(accent, 0.9);
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── הרקע הבהיר: שמי יום + שמש + עננים ──
      function drawSky(t, bgA) {
        ctx.save();
        ctx.globalAlpha = bgA;
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#6FBBEE');
        g.addColorStop(0.55, '#A8DCF6');
        g.addColorStop(1, '#EAF7FF');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // שמש רכה בפינה
        var sx = W * 0.84, sy = H * 0.14;
        var sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 150 * unit);
        sun.addColorStop(0, 'rgba(255,244,200,.95)');
        sun.addColorStop(0.3, 'rgba(255,232,150,.55)');
        sun.addColorStop(1, 'rgba(255,232,150,0)');
        ctx.fillStyle = sun;
        ctx.beginPath(); ctx.arc(sx, sy, 150 * unit, 0, 6.2832); ctx.fill();
        // עננים נסחפים
        for (var i = 0; i < clouds.length; i++) {
          var cl = clouds[i];
          var x = cl.x + Math.sin(t * 0.0002 * cl.v) * 40 * unit + t * 0.004 * (cl.v > 0 ? 1 : -1);
          ctx.fillStyle = 'rgba(255,255,255,.88)';
          ctx.beginPath();
          ctx.ellipse(x, cl.y, 56 * cl.s, 18 * cl.s, 0, 0, 6.2832);
          ctx.ellipse(x + 38 * cl.s, cl.y - 9 * cl.s, 36 * cl.s, 14 * cl.s, 0, 0, 6.2832);
          ctx.ellipse(x - 40 * cl.s, cl.y - 5 * cl.s, 30 * cl.s, 12 * cl.s, 0, 0, 6.2832);
          ctx.fill();
        }
        ctx.restore();
      }

      // ── כדור פורח אחד ──
      function drawBalloon(bx, by, scale, t, a) {
        var r = R * scale;
        var sway = Math.sin(t * 0.0016 + scale) * 0.05;   // נדנוד עדין
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(sway);
        // חבלים + סל (מתחת למעטפת)
        var bw = r * 0.34, bh = r * 0.26, byy = r * 1.28;
        ctx.strokeStyle = hexA('#8A5A28', 0.9 * a);
        ctx.lineWidth = 2 * unit * scale;
        ctx.beginPath();
        ctx.moveTo(-r * 0.34, r * 0.82); ctx.lineTo(-bw / 2, byy);
        ctx.moveTo(r * 0.34, r * 0.82); ctx.lineTo(bw / 2, byy);
        ctx.stroke();
        // סל נצרים
        var bg = ctx.createLinearGradient(0, byy, 0, byy + bh);
        bg.addColorStop(0, hexA('#B8894E', a));
        bg.addColorStop(1, hexA('#8A5A28', a));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, byy); ctx.lineTo(bw / 2, byy);
        ctx.lineTo(bw * 0.42, byy + bh); ctx.lineTo(-bw * 0.42, byy + bh);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = hexA('#6A4018', 0.6 * a);
        ctx.lineWidth = 1.2 * unit * scale;
        for (var wv = 1; wv < 3; wv++) {
          ctx.beginPath();
          ctx.moveTo(-bw / 2 + wv * 2 * unit, byy + bh * wv / 3);
          ctx.lineTo(bw / 2 - wv * 2 * unit, byy + bh * wv / 3);
          ctx.stroke();
        }
        // המעטפת: פסים אנכיים (gores) מתחלפים
        for (var k = 0; k < gores; k++) {
          var f1 = -1 + 2 * k / gores, f2 = -1 + 2 * (k + 1) / gores;
          ctx.fillStyle = hexA(goreCols[k % goreCols.length], a);
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.bezierCurveTo(f1 * r * 1.35, -r * 0.55, f1 * r * 1.35, r * 0.5, 0, r * 0.86);
          ctx.bezierCurveTo(f2 * r * 1.35, r * 0.5, f2 * r * 1.35, -r * 0.55, 0, -r);
          ctx.closePath();
          ctx.fill();
        }
        // הצללה עדינה בצד + ברק
        var sh = ctx.createLinearGradient(-r, 0, r, 0);
        sh.addColorStop(0, 'rgba(30,50,90,0)');
        sh.addColorStop(1, hexA('#1E3250', 0.18 * a));
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.07, r * 1.0, r * 0.965, 0, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + 0.35 * a + ')';
        ctx.beginPath();
        ctx.ellipse(-r * 0.42, -r * 0.42, r * 0.16, r * 0.3, -0.5, 0, 6.2832);
        ctx.fill();
        // חצאית פתח
        ctx.fillStyle = hexA(mixHex(primary, '#402020', 0.4), a);
        ctx.beginPath();
        ctx.moveTo(-r * 0.36, r * 0.8); ctx.lineTo(r * 0.36, r * 0.8);
        ctx.lineTo(r * 0.28, r * 0.98); ctx.lineTo(-r * 0.28, r * 0.98);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        return { basketX: bx, basketY: by + byy + bh * 0.4 };
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        var bgA = Math.min(1, t / 200) * gFade;           // הרקע נכנס ויוצא רך
        ctx.clearRect(0, 0, W, H);

        drawSky(t, bgA);

        // הכדור עולה אל המרכז
        var rp = clamp01(t / riseDur);
        var by = riseFrom + (riseTo - riseFrom) * easeOutCubic(rp)
                 + Math.sin(t * 0.002) * 6 * unit;         // ריחוף
        var pos = drawBalloon(cx, by, 1, t, bgA);

        // כדור חבר קטן (סופר)
        if (buddy) {
          var bp = clamp01((t - buddy.delay) / (riseDur));
          if (bp > 0) {
            var byy2 = buddy.from + (buddy.to - buddy.from) * easeOutCubic(bp)
                       + Math.sin(t * 0.0025 + 2) * 5 * unit;
            drawBalloon(buddy.x, byy2, buddy.scale, t, bgA);
          }
        }

        // קונפטי מהסל
        for (var i = 0; i < confetti.length; i++) {
          var p = confetti[i];
          if (t < p.born) continue;
          var lt = (t - p.born) / 1000;
          var x = pos.basketX + p.vx * lt;
          var y = pos.basketY + p.vy * lt + 0.5 * grav * lt * lt;
          if (y > H + 20 * unit) continue;
          var spin = p.spin + p.spinRate * lt;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(spin);
          ctx.fillStyle = hexA(p.color, 0.95 * gFade);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
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
