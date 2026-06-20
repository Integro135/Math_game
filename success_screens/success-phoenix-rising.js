/* success-phoenix-rising.js — מסך הצלחה: עוֹף הַחוֹל (פִינִיקְס)
   ציפור-אש עשויה גחלים זוהרות עולה מתחתית המסך אל המרכז, מנפנפת בכנפיים
   הרחבות ומשאירה שובל חם; גחלים נושרות מהכנפיים והזנב ועולות מעלה ודועכות
   (לבן→זהב→כתום). בשיא (~65%) הציפור פורשת כנפיים לרוחב ומתפוצצת למזרקת
   נוצות זהב וניצוצות שמתעקלים החוצה ונופלים בכבידה, עם הבזק חם רך. השבח
   קופץ במרכז עם הילת זהב. בסופר: ציפור גדולה יותר, עלייה ארוכה עם מחזור
   נפנוף נוסף, הרבה יותר גחלים וטבעת התפרצות נוצות רחבה.
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
  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  // מיזוג שני צבעי hex לפי t∈[0,1] — מחזיר rgba מוכן עם אלפא
  function mixA(h1, h2, t, a) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    return 'rgba(' + Math.round(r1 + (r2 - r1) * t) + ',' +
                     Math.round(g1 + (g2 - g1) * t) + ',' +
                     Math.round(b1 + (b2 - b1) * t) + ',' + a + ')';
  }

  window.SUCCESS.styles.push({
    name: 'phoenix-rising',
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
      var praise  = opts.praise || 'אַתְּ קָמָה מֵחָדָשׁ!';

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

      var unit = Math.min(W, H) / 800;                          // קנה מידה למסכים קטנים
      var cx = W / 2;
      var startY = H * 1.04;                                    // מתחת לתחתית
      var apexY  = H * 0.40;                                    // גובה השיא
      var scale  = (isSuper ? 1.32 : 1.0) * unit;               // גודל הציפור

      // ─── חלוקת הזמן ───
      var tRise  = dur * 0.62;                                  // זמן עלייה עד השיא
      var tBurst = dur * 0.65;                                  // רגע ההתפרצות
      var flaps  = isSuper ? 3 : 2;                             // מחזורי נפנוף בעלייה

      // ─── שלד הציפור — נקודות לאורך צללית עוף, בקואורדינטות מקומיות ───
      // x ימינה, y מעלה-שלילה. כל נקודה: gx,gy + סימון אם היא קצה-כנף (לנפנוף).
      // wing=1 כנף ימין, wing=-1 כנף שמאל, 0 גוף/זנב. wt = משקל הנפנוף (0..1 לפי המרחק מהגוף).
      var SK = [];
      function addBody() {
        // גוף+ראש: עמוד אנכי דק מעט מורחב, ראש למעלה
        var bn = isSuper ? 22 : 16;
        for (var i = 0; i < bn; i++) {
          var s = i / (bn - 1);                                // 0 זנב-מעל-גוף .. 1 ראש
          var gy = (-26 + s * 64);                             // -26 (תחתית גוף) .. 38 (ראש)
          var ww = 7 * Math.sin(Math.PI * clamp01((s + 0.1)));  // רוחב הגוף
          SK.push({ gx: (Math.random() - 0.5) * ww, gy: gy, wing: 0, wt: 0, b: Math.random() });
        }
        // מקור קטן
        SK.push({ gx: 0, gy: 44, wing: 0, wt: 0, b: 1 });
      }
      function addWing(side) {
        // כנף רחבה: קשת מהכתף החוצה-מעלה ואז קצה מחודד מטה
        var wn = isSuper ? 30 : 22;
        for (var i = 0; i < wn; i++) {
          var s = i / (wn - 1);                                // 0 כתף .. 1 קצה כנף
          // צורת כנף: יוצאת החוצה ועולה, קצה צונח מעט
          var span = (10 + s * 96);                            // מרחק אופקי מהגוף
          var lift = Math.sin(s * Math.PI * 0.92) * 40 - s * 14 + 14;
          // מילוי פנים הכנף — כמה שורות נוצות
          var rows = (s < 0.85) ? 2 : 1;
          for (var r = 0; r < rows; r++) {
            var jitter = r * (6 + s * 10);
            SK.push({
              gx: side * span,
              gy: lift - jitter,
              wing: side,
              wt: s,                                           // קצה הכנף זז הכי הרבה
              b: Math.random()
            });
          }
        }
      }
      function addTail() {
        // זנב ארוך: שלוש נוצות מתפצלות כלפי מטה
        var tn = isSuper ? 16 : 12;
        var spreadAng = [-0.34, 0, 0.34];
        for (var f = 0; f < 3; f++) {
          for (var i = 0; i < tn; i++) {
            var s = i / (tn - 1);                              // 0 בסיס .. 1 קצה
            var len = (30 + s * 90);
            SK.push({
              gx: Math.sin(spreadAng[f]) * len * 0.9 + (Math.random() - 0.5) * 4,
              gy: -26 - Math.cos(spreadAng[f]) * len,
              wing: 0,
              wt: s * 0.5,                                     // הזנב מתנופף קצת
              tail: 1,
              b: Math.random()
            });
          }
        }
      }
      addBody();
      addWing(1);
      addWing(-1);
      addTail();

      // צבעי גחלת לכל נקודה (לבן→זהב→כתום-פטל) לפי b
      var EMBER = '#FF7A1A';                                   // כתום-גחלת חם
      for (var si0 = 0; si0 < SK.length; si0++) {
        var p = SK[si0];
        p.col1 = (p.b < 0.4) ? '#FFFFFF' : (p.b < 0.75 ? accent : EMBER);
        p.col2 = (p.b < 0.4) ? accent : EMBER;
        p.size = (1.4 + Math.random() * 1.8);
      }

      // ─── גחלים נושרות (פולטים מהכנפיים/זנב בזמן העלייה) ───
      // משוחזרים מ-pool כדי לא ליצור DOM/אובייקטים בלולאה.
      var sparks = [];
      var NS = isSuper ? 130 : 80;
      for (var k = 0; k < NS; k++) {
        sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, born: 0, life: 0, r: 0, hue: 0 });
      }
      var sparkCursor = 0;
      function emitSpark(x, y, t, up) {
        var s = sparks[sparkCursor];
        sparkCursor = (sparkCursor + 1) % NS;
        s.active = true;
        s.x = x; s.y = y;
        s.vx = (Math.random() - 0.5) * 0.9 * unit;
        s.vy = (up ? -(0.5 + Math.random() * 1.0) : (Math.random() - 0.5) * 0.6) * unit;
        s.born = t;
        s.life = 520 + Math.random() * 520;
        s.r = (0.8 + Math.random() * 1.6) * unit;
        s.hue = Math.random();                                 // 0 לבן..1 כתום
      }

      // ─── נוצות + ניצוצות ההתפרצות (נוצרים מראש, מופעלים בשיא) ───
      var feathers = [];
      var NF = isSuper ? 64 : 38;
      for (var f0 = 0; f0 < NF; f0++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.75; // בעיקר כלפי מעלה והצדדים
        var spd = (0.32 + Math.pow(Math.random(), 1.4) * 0.95) * (isSuper ? 1.25 : 1);
        feathers.push({
          ang: ang,
          spd: spd,
          rot: Math.random() * 6.2832,
          spin: (Math.random() - 0.5) * 0.18,
          len: (10 + Math.random() * 16) * scale * 0.9,
          wob: Math.random() * 6.2832,
          col: (Math.random() < 0.5 ? accent : (Math.random() < 0.5 ? '#FFFFFF' : EMBER)),
          life: 0.9 + Math.random() * 0.35
        });
      }
      // טבעת נוצות רדיאלית (סופר בלבד) — פרץ אחיד וסימטרי
      var ring = [];
      if (isSuper) {
        var NR = 26;
        for (var ri = 0; ri < NR; ri++) {
          ring.push({ ang: (ri / NR) * 6.2832, len: (12 + Math.random() * 8) * scale });
        }
      }
      // ניצוצות מהירים בהתפרצות
      var burstSparks = [];
      var NB = isSuper ? 90 : 50;
      for (var b0 = 0; b0 < NB; b0++) {
        burstSparks.push({
          ang: Math.random() * 6.2832,
          spd: (0.3 + Math.pow(Math.random(), 1.6) * 1.1),
          r: (1 + Math.random() * 2) * unit,
          col: (Math.random() < 0.6 ? '#FFFFFF' : accent),
          life: 0.55 + Math.random() * 0.4
        });
      }
      var burstR = Math.max(W, H) * (isSuper ? 0.62 : 0.46);

      // שובל העלייה — נקודות שהציפור מותירה (טבעת זיכרון קבועה, נכתבת מראש)
      var trail = [];
      var NT = 30;
      for (var ti = 0; ti < NT; ti++) trail.push({ x: cx, y: startY, a: 0 });
      var trailHead = 0;

      // ─── טקסט שבח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';' +
        'font-size:' + (isSuper ? 'clamp(42px,8.5vw,90px)' : 'clamp(30px,6vw,62px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(accent, 0.95) + ',0 0 46px ' + hexA(EMBER, 0.6) +
        ',0 2px 5px rgba(0,0,0,.35)';
      root.appendChild(txt);
      var txtAt = tBurst + 120;

      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:58%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();
      var lastT = 0;

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var dt = Math.min(t - lastT, 40); lastT = t;            // dt בטוח לפיזיקה
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // מצב העלייה (לפני ההתפרצות)
        var riseQ = clamp01(t / tRise);                         // 0..1 לאורך העלייה
        var bx = cx;
        var by = startY + (apexY - startY) * easeInOutCubic(riseQ);
        // ריחוף עדין סביב השיא
        if (t > tRise) by = apexY + Math.sin((t - tRise) * 0.006) * 6 * unit;
        // נדנוד אופקי קל בזמן הטיסה
        bx = cx + Math.sin(t * 0.004) * 10 * unit * (1 - riseQ * 0.6);

        // פאזת נפנוף הכנפיים
        var flapPhase = riseQ * flaps * Math.PI * 2;
        var flap = Math.sin(flapPhase);                         // -1..1
        // פרישת כנפיים בשיא ההתפרצות
        var spread = 0;
        if (t >= tBurst - 220 && t < tBurst) spread = clamp01((t - (tBurst - 220)) / 220);

        var preBurst = t < tBurst;
        var burstT = t - tBurst;                                // ms מאז ההתפרצות

        // ─── שובל חם מתחת לציפור (תמיד מצויר ראשון, נמוך ב-z) ───
        if (preBurst) {
          // עדכון ראש השובל ~כל 45ms
          if (t - trail[trailHead].t0 > 40 || trail[trailHead].a === 0) {
            trailHead = (trailHead + 1) % NT;
            trail[trailHead].x = bx;
            trail[trailHead].y = by + 8 * scale;
            trail[trailHead].a = 1;
            trail[trailHead].t0 = t;
          }
          for (var tr = 0; tr < NT; tr++) {
            var tp0 = trail[tr];
            if (tp0.a <= 0) continue;
            var age = (t - tp0.t0) / 700;
            var ta = clamp01(1 - age);
            if (ta <= 0) continue;
            var trad = (10 + (1 - ta) * 26) * scale;
            var tg = ctx.createRadialGradient(tp0.x, tp0.y, 0, tp0.x, tp0.y, trad);
            tg.addColorStop(0, hexA(accent, 0.16 * ta * gFade));
            tg.addColorStop(0.5, hexA(EMBER, 0.10 * ta * gFade));
            tg.addColorStop(1, hexA(EMBER, 0));
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.arc(tp0.x, tp0.y, trad, 0, 6.2832); ctx.fill();
          }
        }

        // ─── ציור הציפור (חלקיקי גחלת) ───
        if (preBurst) {
          ctx.globalCompositeOperation = 'lighter';
          var bodyGlow = 0.9 + 0.1 * Math.sin(t * 0.02);
          // הילה רכה סביב כל הציפור
          var hr = (78 + 10 * Math.abs(flap)) * scale;
          var hg = ctx.createRadialGradient(bx, by, 0, bx, by, hr);
          hg.addColorStop(0, hexA(accent, 0.30 * bodyGlow * gFade));
          hg.addColorStop(0.45, hexA(EMBER, 0.16 * gFade));
          hg.addColorStop(1, hexA(EMBER, 0));
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(bx, by, hr, 0, 6.2832); ctx.fill();

          for (var pi = 0; pi < SK.length; pi++) {
            var pt = SK[pi];
            // נפנוף: קצה הכנף עולה/יורד לפי wt; פרישה דוחפת החוצה
            var liftAmt = pt.wing !== 0 ? (flap * 30 * pt.wt) : 0;
            var spreadAmt = (pt.wing !== 0 ? pt.wing * spread * 40 * pt.wt : 0);
            var tailWave = pt.tail ? Math.sin(t * 0.01 + pt.gy * 0.05) * 6 * pt.wt : 0;
            var lx = bx + (pt.gx + spreadAmt + tailWave) * scale;
            var ly = by - (pt.gy + liftAmt) * scale;             // gy חיובי = מעלה

            var pulse = 0.75 + 0.25 * Math.sin(t * 0.018 + pt.b * 6.28);
            var psz = pt.size * scale * pulse;
            var col = mixA(pt.col1, pt.col2, clamp01(0.3 + 0.4 * Math.sin(t * 0.01 + pt.b * 6)), 0.95 * gFade);
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(lx, ly, psz, 0, 6.2832); ctx.fill();

            // נקודת ליבה לבנה
            ctx.fillStyle = hexA('#FFFFFF', 0.5 * pulse * gFade);
            ctx.beginPath(); ctx.arc(lx, ly, psz * 0.45, 0, 6.2832); ctx.fill();

            // פליטת גחלים מקצות הכנפיים והזנב — בשיא הנפנוף
            if ((pt.wt > 0.55) && Math.random() < 0.05 + 0.06 * Math.abs(flap)) {
              emitSpark(lx, ly, t, true);
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // ─── גחלים נושרות (עולות ודועכות) ───
        ctx.globalCompositeOperation = 'lighter';
        for (var sp = 0; sp < NS; sp++) {
          var s = sparks[sp];
          if (!s.active) continue;
          var sage = t - s.born;
          if (sage >= s.life) { s.active = false; continue; }
          // אינטגרציה: ציפה מעלה + ריחוף
          s.vy -= 0.0009 * unit * dt;                           // ציפה (גחלת חמה עולה)
          s.x += s.vx * dt * 0.06 + Math.sin(t * 0.005 + sp) * 0.12 * unit;
          s.y += s.vy * dt * 0.06;
          var sq = sage / s.life;
          var sa = (1 - sq) * gFade;
          var scol = s.hue < 0.45 ? '#FFFFFF' : (s.hue < 0.78 ? accent : EMBER);
          ctx.fillStyle = hexA(scol, 0.9 * sa);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - sq * 0.4), 0, 6.2832); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // ─── ההתפרצות בשיא ───
        if (!preBurst) {
          var bq = clamp01(burstT / (dur - tBurst));

          // הבזק חם רך (דועך מהר)
          var fa = (isSuper ? 0.5 : 0.4) * Math.exp(-burstT / 200) * gFade;
          if (fa > 0.01) {
            var fg = ctx.createRadialGradient(bx, apexY, 0, bx, apexY, Math.max(W, H) * 0.85);
            fg.addColorStop(0, 'rgba(255,255,255,' + fa + ')');
            fg.addColorStop(0.3, hexA(accent, fa * 0.65));
            fg.addColorStop(0.6, hexA(EMBER, fa * 0.35));
            fg.addColorStop(1, hexA(EMBER, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, W, H);
          }

          ctx.globalCompositeOperation = 'lighter';

          // טבעת הדף חמה
          var shq = clamp01(burstT / (dur * 0.4));
          if (shq < 1) {
            var shr = burstR * 1.05 * easeOutCubic(shq);
            ctx.strokeStyle = hexA(accent, 0.30 * (1 - shq) * gFade);
            ctx.lineWidth = (12 * (1 - shq) + 4) * unit;
            ctx.beginPath(); ctx.arc(bx, apexY, shr, 0, 6.2832); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,' + 0.55 * (1 - shq) * gFade + ')';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(bx, apexY, shr, 0, 6.2832); ctx.stroke();
          }

          // טבעת נוצות רדיאלית (סופר)
          if (isSuper) {
            var rq = clamp01(burstT / (dur * 0.5));
            var rrad = burstR * 0.92 * easeOutCubic(rq);
            for (var rg = 0; rg < ring.length; rg++) {
              var rr = ring[rg];
              var rx = bx + Math.cos(rr.ang) * rrad;
              var ry = apexY + Math.sin(rr.ang) * rrad + rq * rq * 70 * unit; // נופלות מעט
              var ra = (1 - rq) * gFade;
              drawFeather(rx, ry, rr.ang + Math.PI / 2 + rq * 2, rr.len, accent, ra);
            }
          }

          // ניצוצות מהירים
          for (var bs = 0; bs < NB; bs++) {
            var bsp = burstSparks[bs];
            var bsq = clamp01(burstT / (bsp.life * dur));
            if (bsq >= 1) continue;
            var bd = bsp.spd * burstR * easeOutCubic(bsq);
            var bxp = bx + Math.cos(bsp.ang) * bd;
            var byp = apexY + Math.sin(bsp.ang) * bd + bsq * bsq * 90 * unit;
            var bsa = (1 - bsq) * gFade;
            ctx.fillStyle = hexA(bsp.col, 0.9 * bsa);
            ctx.beginPath(); ctx.arc(bxp, byp, bsp.r * (1 - bsq * 0.5), 0, 6.2832); ctx.fill();
          }

          // נוצות זהב — מתעקלות החוצה ונופלות בכבידה
          for (var fe = 0; fe < NF; fe++) {
            var ft = feathers[fe];
            var feq = clamp01(burstT / (ft.life * dur));
            if (feq >= 1) continue;
            var fd = ft.spd * burstR * easeOutCubic(feq);
            var fxp = bx + Math.cos(ft.ang) * fd + Math.sin(burstT * 0.004 + ft.wob) * 14 * unit * feq;
            var fyp = apexY + Math.sin(ft.ang) * fd + feq * feq * 150 * unit; // כבידה
            var fea = (1 - feq * feq) * gFade;
            var frot = ft.rot + ft.spin * burstT * 0.06 + feq * 1.5;
            drawFeather(fxp, fyp, frot, ft.len, ft.col, 0.92 * fea);
          }

          ctx.globalCompositeOperation = 'source-over';
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

      // נוצה: עלה מאורך עם גזע — מצויר ב-lighter, כבר תחת globalAlpha חיצוני? לא, מעבירים אלפא בצבע
      function drawFeather(x, y, rot, len, col, alpha) {
        if (alpha <= 0.01) return;
        var w = len * 0.42;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        // גוף הנוצה
        ctx.fillStyle = hexA(col, 0.85 * alpha);
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.5);
        ctx.quadraticCurveTo(w, 0, 0, len * 0.5);
        ctx.quadraticCurveTo(-w, 0, 0, -len * 0.5);
        ctx.fill();
        // ליבה בהירה
        ctx.strokeStyle = hexA('#FFFFFF', 0.6 * alpha);
        ctx.lineWidth = Math.max(1, len * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.5);
        ctx.lineTo(0, len * 0.45);
        ctx.stroke();
        ctx.restore();
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
