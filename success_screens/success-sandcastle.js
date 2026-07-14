/* success-sandcastle.js — מסך הצלחה: אַרְמוֹן חוֹל 🏰🏖️
   ארמון חול נבנה מעצמו על גבעת חול בשליש התחתון: לבנת הבסיס צונחת ומתייצבת
   (קפיצת easeOutBounce + squash קל), שני מגדלי צד נוחתים אחריה, מגדל מרכזי גבוה,
   גגות חרוט קופצים על כל מגדל, ולבסוף תורן נשלף ומעליו דגל מתנופף בצבע הפלטה.
   סביב הארמון — נצנוצי זהב נסחפים, קונכייה וכוכב־ים קטנים על החול. בסופר: ארמון
   רחב יותר עם חמישה מגדלים, שחפים חגים מעל, וטבעת נצנוצים מסיימת.
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
  function easeOutBounce(x) {
    var n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
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
    name: 'sandcastle',
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
      var praise  = opts.praise || 'בָּנִית אַרְמוֹן!';

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

      // ─── חוֹל: צבעים חמים קריאים על כיסוי כהה ───
      var sandLite = '#F4E2B8', sandMid = '#E4C88E', sandDark = '#B8935A';
      var trim = mixHex(accent, '#FFFFFF', 0.25);        // שפת המגדלים

      // ─── גיאומטריה ───
      var cx = W / 2;
      var groundY = H * 0.80;
      var castleW = Math.min(W * (isSuper ? 0.62 : 0.5), (isSuper ? 330 : 260) * unit);
      var baseH = castleW * 0.30;
      var towerW = castleW * (isSuper ? 0.17 : 0.22);
      var towerH = castleW * 0.34;
      var midW = castleW * 0.26, midH = castleW * 0.52;

      // ─── חלקי הארמון — כל חלק צונח ממעל ומתייצב (bounce) בתורו ───
      // {x, w, h(גובה סופי), at(שיעור התחלה), kind}
      var parts = [
        { x: cx, w: castleW, h: baseH, at: 0.04, kind: 'base' },
        { x: cx - castleW / 2 + towerW / 2, w: towerW, h: baseH + towerH, at: 0.20, kind: 'tower' },
        { x: cx + castleW / 2 - towerW / 2, w: towerW, h: baseH + towerH, at: 0.27, kind: 'tower' },
        { x: cx, w: midW, h: baseH + midH, at: 0.36, kind: 'tower' }
      ];
      if (isSuper) {
        parts.push({ x: cx - castleW * 0.24, w: towerW, h: baseH + towerH * 1.28, at: 0.30, kind: 'tower' });
        parts.push({ x: cx + castleW * 0.24, w: towerW, h: baseH + towerH * 1.28, at: 0.33, kind: 'tower' });
      }
      var dropDur = dur * 0.20;                          // משך צניחת חלק
      var roofAt = 0.52, flagAt = 0.62;                  // גגות ואז דגל

      // ─── נצנוצים נסחפים ───
      var sparks = [];
      var NS = isSuper ? 44 : 26;
      var sparkCols = ['#FFFFFF', accent, glow, '#FFFFFF', primary];
      for (var s = 0; s < NS; s++) {
        sparks.push({
          x: cx + (Math.random() - 0.5) * castleW * 2.2,
          baseY: groundY - Math.random() * 300 * unit,
          amp: (10 + Math.random() * 26) * unit,
          rate: 1.2 + Math.random() * 1.8,
          phase: Math.random() * 6.2832,
          born: dur * 0.25 + Math.random() * dur * 0.5,
          life: 650 + Math.random() * 750,
          size: (1 + Math.random() * 2.2) * unit,
          color: sparkCols[s % sparkCols.length]
        });
      }

      // ─── שחפים (סופר) — קשתות ∨ קטנות חגות מעל ───
      var gulls = [];
      if (isSuper) for (var gI = 0; gI < 3; gI++) {
        gulls.push({ x0: cx + (gI - 1) * 150 * unit, y0: H * 0.22 + gI * 26 * unit,
                     dir: gI % 2 ? -1 : 1, phase: gI * 2.1 });
      }

      // ─── טבעת נצנוצים מסיימת (סופר) ───
      var finaleAt = dur * 0.74, finale = [];
      if (isSuper) for (var fI = 0; fI < 36; fI++) {
        finale.push({ ang: (fI / 36) * 6.2832 + Math.random() * 0.15,
                      speed: (130 + Math.random() * 90) * unit,
                      size: (1.5 + Math.random() * 2.2) * unit,
                      color: sparkCols[fI % sparkCols.length] });
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

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── גבעת החול + פריטי חוף ──
      function drawGround(gFade) {
        var g = ctx.createLinearGradient(0, groundY - 14 * unit, 0, H);
        g.addColorStop(0, hexA(sandMid, 0.95 * gFade));
        g.addColorStop(1, hexA(sandDark, 0.9 * gFade));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - castleW * 1.35, H);
        ctx.quadraticCurveTo(cx - castleW * 0.9, groundY - 18 * unit, cx, groundY - 10 * unit);
        ctx.quadraticCurveTo(cx + castleW * 0.9, groundY - 18 * unit, cx + castleW * 1.35, H);
        ctx.closePath();
        ctx.fill();
        // כוכב־ים קטן
        ctx.save();
        ctx.translate(cx - castleW * 0.78, groundY + 26 * unit);
        ctx.rotate(0.4);
        ctx.fillStyle = hexA('#FF8A65', 0.9 * gFade);
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
          var a1 = (i / 5) * 6.2832 - 1.5708, a2 = a1 + 0.628;
          ctx.lineTo(Math.cos(a1) * 11 * unit, Math.sin(a1) * 11 * unit);
          ctx.lineTo(Math.cos(a2) * 4.5 * unit, Math.sin(a2) * 4.5 * unit);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // קונכייה קטנה
        ctx.fillStyle = hexA('#F6E8F1', 0.9 * gFade);
        ctx.strokeStyle = hexA('#D9BFD2', 0.9 * gFade);
        ctx.lineWidth = 1.4 * unit;
        ctx.beginPath();
        ctx.arc(cx + castleW * 0.82, groundY + 30 * unit, 9 * unit, Math.PI, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // ── לבנת חול: מלבן עם טקסטורת נקודות + שיניים (צריח) ──
      function drawBlock(x, w, hNow, hFull, gFade, crenels) {
        var y = groundY - hNow;
        var g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, hexA(sandLite, 0.98 * gFade));
        g.addColorStop(0.55, hexA(sandMid, 0.98 * gFade));
        g.addColorStop(1, hexA(sandDark, 0.98 * gFade));
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, y, w, hNow);
        // שיניים בראש (רק כשהחלק כמעט מלא)
        if (crenels && hNow > hFull * 0.9) {
          var n = Math.max(3, Math.round(w / (16 * unit)));
          var cw = w / (n * 2 - 1);
          ctx.fillStyle = hexA(sandLite, 0.98 * gFade);
          for (var i = 0; i < n; i++)
            ctx.fillRect(x - w / 2 + i * 2 * cw, y - cw * 0.9, cw, cw * 0.9);
        }
        // נקודות חול (טקסטורה עדינה, דטרמיניסטית)
        ctx.fillStyle = hexA(sandDark, 0.35 * gFade);
        for (var d = 0; d < w * hNow / (900 * unit * unit); d++) {
          var dx = x - w / 2 + ((d * 37) % 97) / 97 * w;
          var dy = y + ((d * 53) % 89) / 89 * hNow;
          ctx.fillRect(dx, dy, 1.3 * unit, 1.3 * unit);
        }
      }

      // ── גג חרוט + שיפולי טפט ──
      function drawRoof(x, w, topY, popF, gFade, color) {
        if (popF <= 0) return;
        var e = easeOutBack(popF);
        var rw = w * 0.75 * e, rh = w * 0.95 * e;
        var g = ctx.createLinearGradient(x - rw, topY, x + rw, topY);
        g.addColorStop(0, hexA(mixHex(color, '#FFFFFF', 0.35), 0.96 * gFade));
        g.addColorStop(1, hexA(color, 0.96 * gFade));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - rw, topY);
        ctx.lineTo(x + rw, topY);
        ctx.lineTo(x, topY - rh);
        ctx.closePath();
        ctx.fill();
      }

      // ── תורן + דגל מתנופף ──
      function drawFlag(t, topY, upF, gFade) {
        if (upF <= 0) return;
        var poleH = 66 * unit * easeOutCubic(upF);
        var px = cx, py = topY;
        ctx.strokeStyle = hexA('#8A6A40', 0.95 * gFade);
        ctx.lineWidth = 3 * unit;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - poleH);
        ctx.stroke();
        if (upF > 0.55) {
          // דגל משולש מתנופף (גל סינוס בקצה)
          var fw = 52 * unit, fh = 26 * unit;
          var wave = Math.sin(t * 0.012) * 5 * unit;
          var fy = py - poleH;
          ctx.fillStyle = hexA(primary, 0.96 * gFade);
          ctx.beginPath();
          ctx.moveTo(px, fy);
          ctx.quadraticCurveTo(px + fw * 0.55, fy - 4 * unit + wave * 0.4, px + fw, fy + fh * 0.28 + wave);
          ctx.quadraticCurveTo(px + fw * 0.5, fy + fh * 0.6 + wave * 0.4, px, fy + fh * 0.62);
          ctx.closePath();
          ctx.fill();
          // כוכב קטן על הדגל
          ctx.fillStyle = hexA('#FFFFFF', 0.9 * gFade);
          ctx.beginPath();
          ctx.arc(px + fw * 0.34, fy + fh * 0.3 + wave * 0.5, 3.4 * unit, 0, 6.2832);
          ctx.fill();
        }
      }

      // ── שער קשת + חלונות על הבסיס ──
      function drawDetails(gFade, doneF) {
        if (doneF <= 0) return;
        var a = doneF * gFade;
        // שער
        var dw = castleW * 0.13, dh = baseH * 0.62;
        ctx.fillStyle = hexA(mixHex(sandDark, '#000000', 0.35), 0.85 * a);
        ctx.beginPath();
        ctx.moveTo(cx - dw / 2, groundY);
        ctx.lineTo(cx - dw / 2, groundY - dh * 0.6);
        ctx.quadraticCurveTo(cx, groundY - dh * 1.25, cx + dw / 2, groundY - dh * 0.6);
        ctx.lineTo(cx + dw / 2, groundY);
        ctx.closePath(); ctx.fill();
        // חלונות עגולים על מגדלי הצד
        ctx.fillStyle = hexA(trim, 0.8 * a);
        for (var i = 0; i < 2; i++) {
          var wx = i === 0 ? cx - castleW / 2 + towerW / 2 : cx + castleW / 2 - towerW / 2;
          ctx.beginPath();
          ctx.arc(wx, groundY - baseH - towerH * 0.55, 5 * unit, 0, 6.2832);
          ctx.fill();
        }
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var f = t / dur;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';

        // הילה חמה רכה מאחורי הארמון
        var halo = ctx.createRadialGradient(cx, groundY - baseH, 0, cx, groundY - baseH, castleW * 1.15);
        halo.addColorStop(0, hexA(accent, 0.18 * gFade));
        halo.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, groundY - baseH, castleW * 1.15, 0, 6.2832); ctx.fill();

        drawGround(gFade);

        // חלקי הארמון צונחים למקומם
        var roofsDone = 0;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          var pp = clamp01((f - p.at) / (dropDur / dur));
          if (pp <= 0) continue;
          var b = easeOutBounce(pp);
          var hNow = p.h * b;
          // squash קצר בנחיתה
          var squash = pp > 0.75 && pp < 0.95 ? 1 + 0.05 * Math.sin((pp - 0.75) / 0.2 * Math.PI) : 1;
          drawBlock(p.x, p.w * squash, hNow, p.h, gFade, p.kind === 'base' ? true : pp >= 1);
          // גג על כל מגדל (לא הבסיס)
          if (p.kind === 'tower') {
            var rf = clamp01((f - roofAt - roofsDone * 0.04) / 0.12);
            drawRoof(p.x, p.w, groundY - p.h - p.w * 0.16, rf, gFade,
                     roofsDone % 2 ? glow : accent);
            roofsDone++;
          }
        }

        drawDetails(gFade, clamp01((f - roofAt) / 0.2));
        drawFlag(t, groundY - (baseH + midH) - midW * 0.16 - midW * 0.75 * 0.95,
                 clamp01((f - flagAt) / 0.2), gFade);

        // שחפים (סופר)
        for (var gi = 0; gi < gulls.length; gi++) {
          var gu = gulls[gi];
          var gx = gu.x0 + Math.sin(t * 0.0011 * gu.dir + gu.phase) * 90 * unit;
          var gy = gu.y0 + Math.sin(t * 0.0017 + gu.phase) * 14 * unit;
          var fl = Math.sin(t * 0.02 + gu.phase) * 4 * unit;
          ctx.strokeStyle = hexA(textCol, 0.75 * gFade);
          ctx.lineWidth = 2.4 * unit;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(gx - 11 * unit, gy);
          ctx.quadraticCurveTo(gx - 5 * unit, gy - 7 * unit - fl, gx, gy);
          ctx.quadraticCurveTo(gx + 5 * unit, gy - 7 * unit - fl, gx + 11 * unit, gy);
          ctx.stroke();
        }

        // נצנוצים נסחפים
        for (var si = 0; si < sparks.length; si++) {
          var sk = sparks[si];
          if (t < sk.born) continue;
          var sq = clamp01((t - sk.born) / sk.life);
          if (sq >= 1) continue;
          var sx = sk.x + Math.sin(t / 1000 * sk.rate + sk.phase) * sk.amp;
          var sy = sk.baseY - 26 * unit * sq;
          ctx.fillStyle = hexA(sk.color, Math.sin(Math.PI * sq) * 0.85 * gFade);
          ctx.beginPath(); ctx.arc(sx, sy, sk.size, 0, 6.2832); ctx.fill();
        }

        // טבעת מסיימת (סופר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 850);
          if (fq < 1) {
            var fy0 = groundY - baseH - midH * 0.5;
            for (var fi = 0; fi < finale.length; fi++) {
              var fp = finale[fi];
              var fd = fp.speed * easeOutCubic(fq);
              ctx.strokeStyle = hexA(fp.color, 0.9 * (1 - fq) * gFade);
              ctx.lineWidth = fp.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              var fx1 = cx + Math.cos(fp.ang) * fd, fy1 = fy0 + Math.sin(fp.ang) * fd;
              ctx.moveTo(fx1, fy1);
              ctx.lineTo(fx1 - Math.cos(fp.ang) * 10 * unit * (1 - fq),
                         fy1 - Math.sin(fp.ang) * 10 * unit * (1 - fq));
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
