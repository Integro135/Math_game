/* success-kaleidoscope-bloom.js — מסך הצלחה: פְּרִיחַת קָלֵידוֹסְקוֹפּ
   קָלֵידוֹסְקוֹפּ סִימֶטְרִי במרכז המסך: N מקטעי-טריז (8 רגיל) שכל אחד מציֵר את
   אותה קבוצת רסיסים/עלי-כותרת צבעוניים, והסימטריה משקפת ומסובבת אותם למנדלה.
   הדוגמה פורחת החוצה מהמרכז (רדיוס מ-0 ל-maxR), מסתובבת לאט, והצבעים מתחלפים
   בלולאה דרך הפלטה. סמוך לסוף — הבזק התכנסות עדין. בסופר: יותר מקטעים (16),
   פריחה מהירה יותר, סחרור צבעים בהיר יותר ופולס בהיר אחרון.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  // מיזוג בין שני צבעי hex לפי t∈[0,1] עם אלפא — לסחרור הצבעים החלק
  function mixA(h1, h2, t, a) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t),
        g = Math.round(g1 + (g2 - g1) * t),
        b = Math.round(b1 + (b2 - b1) * t);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'kaleidoscope-bloom',
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
      var praise  = opts.praise || 'אַתְּ מַקְסִימָה!';

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

      var cx = W / 2, cy = H * 0.46;
      var unit = Math.min(W, H) / 800;                          // קנה מידה למסכים קטנים
      var maxR = Math.min(W, H) * (isSuper ? 0.64 : 0.55);
      var segments = isSuper ? 16 : 8;                          // מספר מקטעי הטריז
      var wedge = (Math.PI * 2) / segments;                     // זווית טריז

      // מחזור הצבעים שהרסיסים עוברים דרכו (בלולאה רציפה)
      var cyc = [primary, glow, accent, '#FFFFFF', accent, primary];
      var cycN = cyc.length;
      var cycSpeed = (isSuper ? 1.9 : 1.15) / dur;              // מהירות סחרור הצבעים

      // ─── קבוצת הרסיסים — מחושבת פעם אחת, רק מסובבים/מותחים אותה בכל פריים ───
      // כל רסיס מוגדר ברדיוס יחסי (rr∈[0,1] מתוך maxR) וזווית בתוך הטריז.
      var shards = [];
      var SH = isSuper ? 11 : 8;
      for (var s = 0; s < SH; s++) {
        var rr = 0.14 + (s / SH) * 0.82 + (Math.random() - 0.5) * 0.05; // טבעת בתוך הטריז
        rr = clamp01(rr);
        var kind = s % 3;                                       // 0 משולש, 1 קשת, 2 נקודה/פתית
        shards.push({
          rr: rr,
          ah: (0.18 + Math.random() * 0.64),                   // מיקום זוויתי בתוך הטריז (שבר)
          size: (0.05 + Math.random() * 0.10),                 // גודל יחסי ל-maxR
          kind: kind,
          colA: s % cycN,                                      // היסט בלוח הצבעים
          spin: (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.8),
          delay: (s / SH) * 0.42,                              // פריחה מדורגת מבפנים החוצה
          petals: 3 + (s % 3)                                  // לקשתות/עלים
        });
      }

      // ─── נצנוצי כוכבים לבנים/זהובים שמתעוררים כשהפריחה מגיעה אליהם ───
      var sparks = [];
      var NS = isSuper ? 64 : 40;
      var scolors = ['#FFFFFF', '#FFFFFF', accent, glow];
      for (var k = 0; k < NS; k++) {
        var sd = 0.20 + Math.random() * 0.95;                  // שבר מ-maxR
        sparks.push({
          ang: Math.random() * 6.2832,
          dist: sd,
          r: (0.7 + Math.random() * 1.6) * unit,
          tw: Math.random() * 6.28,
          tws: 0.006 + Math.random() * 0.010,
          color: scolors[k % scolors.length],
          arr: clamp01(sd) * 0.55                              // הופעה כשהפריחה עוברת
        });
      }

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(40px,8vw,86px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(glow, 0.95) + ',0 0 46px ' + hexA(primary, 0.7) +
        ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = dur * 0.34;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:' + (isSuper ? '61%' : '58%') + ';transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.85) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // מצייר רסיס יחיד במערכת קואורדינטות מקומית של הטריז (מרכז ב-0,0, ציר חוצה הטריז = X חיובי)
      function drawShard(sh, bloomR, fillCol, edgeCol, alpha, t) {
        var rad = sh.rr * bloomR;                               // רדיוס בפועל לפי הפריחה
        var ang = (sh.ah - 0.5) * wedge;                        // זווית בתוך חצי-הטריז
        var px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
        var sz = sh.size * maxR;
        var rot = t * 0.001 * sh.spin;                          // סיבוב עצמי עדין של הרסיס
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang + rot);
        ctx.globalAlpha = alpha;
        if (sh.kind === 0) {
          // משולש מוארך (רסיס זכוכית)
          ctx.beginPath();
          ctx.moveTo(sz * 1.5, 0);
          ctx.lineTo(-sz * 0.7, sz * 0.85);
          ctx.lineTo(-sz * 0.7, -sz * 0.85);
          ctx.closePath();
          ctx.fillStyle = fillCol;
          ctx.fill();
          ctx.lineWidth = 1.1 * unit;
          ctx.strokeStyle = edgeCol;
          ctx.stroke();
        } else if (sh.kind === 1) {
          // עלה-כותרת / קשת — טיפת לוז עם קצה בהיר
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sz * 0.9, -sz * 0.7, sz * 1.7, 0);
          ctx.quadraticCurveTo(sz * 0.9, sz * 0.7, 0, 0);
          ctx.closePath();
          ctx.fillStyle = fillCol;
          ctx.fill();
          ctx.lineWidth = 1.0 * unit;
          ctx.strokeStyle = edgeCol;
          ctx.stroke();
        } else {
          // נקודה זוהרת
          var dr = sz * 0.7;
          var dg = ctx.createRadialGradient(0, 0, 0, 0, 0, dr * 2.4);
          dg.addColorStop(0, edgeCol);
          dg.addColorStop(0.4, fillCol);
          dg.addColorStop(1, fillCol.replace(/[\d.]+\)$/, '0)'));
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.arc(0, 0, dr * 2.4, 0, 6.2832);
          ctx.fill();
        }
        ctx.restore();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);                  // דעיכה כללית ב-250 מ"ש האחרונות
        ctx.clearRect(0, 0, W, H);

        // התקדמות הפריחה (0→1) — מהירה יותר בסופר
        var bloomP = easeOutCubic(clamp01(t / (dur * (isSuper ? 0.40 : 0.52))));
        var bloomR = maxR * bloomP;
        var globalRot = t * 0.0004 * (isSuper ? 1.5 : 1) + easeOutCubic(clamp01(t / dur)) * (isSuper ? 1.1 : 0.7);

        // ─── וִינְיֶטָה רכה במרכז — רק כדי שהטקסט ייקרא (מאחורי המנדלה) ───
        var vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.5);
        vg.addColorStop(0, 'rgba(6,4,16,' + 0.32 * gFade + ')');
        vg.addColorStop(0.6, 'rgba(6,4,16,' + 0.13 * gFade + ')');
        vg.addColorStop(1, 'rgba(6,4,16,0)');
        ctx.fillStyle = vg;
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.5, 0, 6.2832); ctx.fill();

        // ─── נצנוצי רקע (מאחורי המנדלה, נדלקים כשהפריחה עוברת) ───
        ctx.globalCompositeOperation = 'lighter';
        for (var qi = 0; qi < sparks.length; qi++) {
          var sp = sparks[qi];
          if (bloomP < sp.arr) continue;
          var sa = clamp01((bloomP - sp.arr) / 0.12);
          var sx = cx + Math.cos(sp.ang + globalRot * 0.3) * sp.dist * maxR;
          var sy = cy + Math.sin(sp.ang + globalRot * 0.3) * sp.dist * maxR;
          var tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * sp.tws + sp.tw));
          ctx.fillStyle = hexA(sp.color, sa * tw * 0.85 * gFade);
          ctx.beginPath(); ctx.arc(sx, sy, sp.r, 0, 6.2832); ctx.fill();
        }

        // ─── המנדלה: מקטעי טריז עם שיקוף קלידוסקופי אמיתי ───
        // ציור הרסיסים כזכוכית צבעונית מלאה (source-over) — לא תוסף, כדי
        // שהצבעים לא יישָׁרְפוּ ללבן בחפיפות הרבות בין המקטעים.
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(globalRot);
        for (var seg = 0; seg < segments; seg++) {
          for (var mir = 0; mir < 2; mir++) {                  // שתי מחציות מראה לכל טריז
            ctx.save();
            ctx.rotate(seg * wedge);
            if (mir === 1) ctx.scale(1, -1);                   // שיקוף מראה — קלידוסקופ אמיתי
            for (var i = 0; i < shards.length; i++) {
              var sh = shards[i];
              // staggered bloom — each shard fades + scales in by its delay, but
              // sits at its OWN radius (rr × bloomR) so the shards fill the whole
              // disc into a mandala (not pile up at the bloom front).
              var sb = clamp01((bloomP - sh.delay) / (1 - sh.delay + 0.0001));
              if (sb <= 0) continue;
              // סחרור צבעים: כל רסיס נע על לוח הצבעים בלולאה
              var cpos = (sh.colA + t * cycSpeed * cycN) % cycN;
              var ci = Math.floor(cpos), cf = cpos - ci;
              var cFill = mixA(cyc[ci], cyc[(ci + 1) % cycN], cf, 0.88 * gFade);
              var cEdge = mixA(cyc[(ci + 1) % cycN], '#FFFFFF', 0.5, 0.95 * gFade);
              var shTmp = { rr: sh.rr, ah: sh.ah, size: sh.size * (0.45 + 0.55 * easeOutBack(sb)), kind: sh.kind, spin: sh.spin };
              drawShard(shTmp, bloomR, cFill, cEdge, sb * gFade, t);
            }
            ctx.restore();
          }
        }
        ctx.restore();

        // ─── טבעות מסגרת דקות שמתרחבות עם הפריחה (מחזקות את תחושת המנדלה) ───
        var ringN = isSuper ? 4 : 3;
        for (var rg = 0; rg < ringN; rg++) {
          var rp = clamp01((bloomP - rg * 0.12) / 0.6);
          if (rp <= 0) continue;
          var ringR = bloomR * (0.30 + rg * 0.22);
          if (ringR < 1) continue;
          var cpos2 = (rg + t * cycSpeed * cycN * 0.5) % cycN;
          var rcol = mixA(cyc[Math.floor(cpos2)], cyc[(Math.floor(cpos2) + 1) % cycN], cpos2 - Math.floor(cpos2), 0.30 * rp * gFade);
          ctx.strokeStyle = rcol;
          ctx.lineWidth = 1.4 * unit;
          ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, 6.2832); ctx.stroke();
        }

        // ─── ליבה זוהרת במרכז המנדלה (זוהר תוסף) ───
        ctx.globalCompositeOperation = 'lighter';
        var coreA = (0.5 + 0.5 * Math.sin(t * 0.006)) * 0.6 * gFade;
        var coreR = (10 + 6 * Math.sin(t * 0.006)) * unit * (isSuper ? 1.4 : 1);
        var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
        cg.addColorStop(0, 'rgba(255,255,255,' + coreA + ')');
        cg.addColorStop(0.4, hexA(accent, coreA * 0.6));
        cg.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, coreR * 3, 0, 6.2832); ctx.fill();

        // ─── הבזק התכנסות עדין סמוך לסוף ───
        var flashStart = dur * (isSuper ? 0.80 : 0.78);
        if (t > flashStart) {
          var fp = clamp01((t - flashStart) / (dur - flashStart));
          var fa = Math.sin(Math.PI * fp) * (isSuper ? 0.55 : 0.40) * gFade;
          if (fa > 0.01) {
            var fr = maxR * (0.30 + 0.85 * easeInOutSine(fp));
            var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.4, hexA(glow, fa * 0.55));
            fg.addColorStop(1, hexA(glow, 0));
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(cx, cy, fr, 0, 6.2832); ctx.fill();
          }
          // בסופר: פולס בהיר אחרון מתפרץ מהמרכז
          if (isSuper) {
            var pp = clamp01((t - dur * 0.90) / (dur * 0.10));
            if (pp > 0) {
              var pr = maxR * 1.15 * easeOutCubic(pp);
              var pa = (1 - pp) * 0.7 * gFade;
              ctx.strokeStyle = 'rgba(255,255,255,' + pa + ')';
              ctx.lineWidth = (8 * (1 - pp) + 2) * unit;
              ctx.beginPath(); ctx.arc(cx, cy, pr, 0, 6.2832); ctx.stroke();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── טקסט ───
        var tp = clamp01((t - txtAt) / 340);
        txt.style.transform = 'translate(-50%,-50%) scale(' +
          (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pp2 = clamp01((t - txtAt - 280) / 320);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pp2 > 0 ? easeOutBack(pp2) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pp2 * 2, 1) * gFade);
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
