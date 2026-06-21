/* success-enchanted-tree.js — מסך הצלחה: עֵץ קָסוּם
   עֵץ קָסוּם צוֹמֵחַ מֵהָאֲדָמָה בַּמֶּרְכָּז: תְּחִלָּה הַגֶּזַע מִתְרוֹמֵם (easeOutCubic),
   אַחַר כָּךְ עֲנָפִים נִשְׁלָחִים הַחוּצָה בְּכַמָּה רְבָדִים, וְאָז פְּרָחִים זוֹהֲרִים
   (עִגּוּלִים רַכִּים בְּצֶבַע הַפָּלֶטָה עִם לִבָּה בְּהִירָה) קוֹפְצִים אֶחָד אַחַר הַשֵּׁנִי
   לְאֹרֶךְ הָעֲנָפִים (מְדֻרָּג, easeOutBack). עֲלֵי כּוֹתֶרֶת נוֹשְׁרִים וְגַחְלִילִיּוֹת
   זוֹהֲרוֹת מְרַחֲפוֹת מַעְלָה סְבִיב הַצַּמֶּרֶת; הִילָה רַכָּה מֵאָחוֹר. בְּסוּפֶּר: עֵץ
   גָּבוֹהַּ וּמָלֵא יוֹתֵר, עוֹד פְּרָחִים, מְעַרְבֹּלֶת גַּחְלִילִיּוֹת, וְטַבַּעַת נִיצוֹצוֹת
   סִיּוּם סְבִיב הַצַּמֶּרֶת. נִרְשָׁם לְפִי הַחוֹזֶה ב-success_screens_spec.md —
   לְלֹא גְלוֹבָלִים מִלְּבַד window.SUCCESS. */
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
  // מַחֲזִיר #rrggbb מְעֻרְבָּב בֵּין שְׁנֵי גְּוָנֵי hex (t=0 → a, t=1 → b)
  function mixHex(a, b, t) {
    t = clamp01(t);
    var ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    var br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    var r = Math.round(ar + (br - ar) * t),
        g = Math.round(ag + (bg - ag) * t),
        bl = Math.round(ab + (bb - ab) * t);
    return '#' + (1 << 24 | r << 16 | g << 8 | bl).toString(16).slice(1);
  }

  window.SUCCESS.styles.push({
    name: 'enchanted-tree',
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
      var praise  = opts.praise || 'אַתְּ פּוֹרַחַת כְּמוֹ עֵץ קָסוּם!';
      var TRUNK   = '#5B3A24';                 // חוּם כֵּהֶה לַגֶּזַע
      var TRUNKHI = mixHex(TRUNK, '#FFFFFF', 0.22);   // הֶאָרַת קָצֶה לַגֶּזַע

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

      var unit = Math.min(W, H) / 800;          // קְנֵה מִידָה לְמָסַכִּים קְטַנִּים (גַּם 342×455)
      var groundY = H * 0.92;                    // קַו הַקַּרְקַע
      var cx = W / 2;                            // מֶרְכָּז הָעֵץ אֲנָכִי
      // גֹּבַהּ הַגֶּזַע — גָּבוֹהַּ יוֹתֵר בְּסוּפֶּר, חָסוּם כָּךְ שֶׁהַצַּמֶּרֶת לֹא תֵּצֵא מֵהַמָּסָךְ
      var trunkH = Math.min(H * (isSuper ? 0.46 : 0.40), 360 * unit);
      var canopyY = groundY - trunkH;            // רֹאשׁ הַגֶּזַע / בְּסִיס הַצַּמֶּרֶת
      var trunkW = 22 * unit * (isSuper ? 1.15 : 1);

      // ─── הָעֲנָפִים: בְּנוּיִים בַּיָּד, לֹא רֵקוּרְסְיָה עֲמֻקָּה ───
      // כָּל עָנָף: זָוִית (מֵהָאֲנָךְ), אֹרֶךְ (שֶׁבֶר מ-trunkH), נְקֻדַּת הִתְפַּצְּלוּת
      // לְאֹרֶךְ הַגֶּזַע (frac 0=בְּסִיס,1=רֹאשׁ), וְשֵׁלָב הַצְּמִיחָה (level).
      var branchDefs = [
        { ang: -0.62, len: 0.46, frac: 0.46, level: 0 },
        { ang:  0.58, len: 0.44, frac: 0.52, level: 0 },
        { ang: -0.30, len: 0.52, frac: 0.66, level: 1 },
        { ang:  0.34, len: 0.50, frac: 0.70, level: 1 },
        { ang: -0.86, len: 0.34, frac: 0.74, level: 1 },
        { ang:  0.88, len: 0.32, frac: 0.78, level: 1 },
        { ang: -0.08, len: 0.42, frac: 0.92, level: 2 },
        { ang:  0.14, len: 0.40, frac: 0.90, level: 2 }
      ];
      if (isSuper) {
        branchDefs.push(
          { ang: -1.18, len: 0.30, frac: 0.62, level: 1 },
          { ang:  1.20, len: 0.28, frac: 0.66, level: 1 },
          { ang: -0.46, len: 0.40, frac: 0.84, level: 2 },
          { ang:  0.50, len: 0.40, frac: 0.86, level: 2 }
        );
      }

      // נְקֻדַּת בְּסִיס + קָצֶה לְכָל עָנָף (נֶחְשָׁבוֹת פַּעַם אַחַת)
      var branches = [];
      for (var bi = 0; bi < branchDefs.length; bi++) {
        var d = branchDefs[bi];
        var bx0 = cx + (d.frac - 0.5) * trunkW * 0.4;       // יוֹצֵא קְצָת מֵהַצַּד שֶׁל הַגֶּזַע
        var by0 = groundY - trunkH * d.frac;
        var len = trunkH * d.len;
        var bx1 = bx0 + Math.sin(d.ang) * len;
        var by1 = by0 - Math.cos(d.ang) * len;             // עוֹלֶה כְּלַפֵּי מַעְלָה
        branches.push({
          x0: bx0, y0: by0, x1: bx1, y1: by1,
          ang: d.ang, level: d.level, len: len,
          w: (8 - d.level * 2) * unit                       // עָנָף עָבֶה יוֹתֵר נָמוּךְ יוֹתֵר
        });
      }

      // ─── תִּזְמוּן הַצְּמִיחָה ───
      var trunkGrow = dur * 0.26;                 // הַגֶּזַע מִתְרוֹמֵם
      var branchGrow = dur * 0.22;                // מֶשֶׁךְ צְמִיחַת הָעֲנָפִים
      var branchStart = trunkGrow * 0.78;         // עֲנָפִים מַתְחִילִים לִקְרַאת סוֹף הַגֶּזַע
      var bloomStart = branchStart + branchGrow * 0.85;
      var bloomSpan = dur * 0.34;                 // חַלּוֹן הוֹפָעַת הַפְּרָחִים

      // ─── הַפְּרָחִים הַזּוֹהֲרִים: מְמֻקָּמִים לְאֹרֶךְ קָצוֹת הָעֲנָפִים וְהַגֶּזַע ───
      var blossomCols = [primary, glow, mixHex(primary, '#FFFFFF', 0.25), accent];
      var blossoms = [];
      var bloomPerBranch = isSuper ? 3 : 2;
      for (var bj = 0; bj < branches.length; bj++) {
        var br = branches[bj];
        for (var k = 0; k < bloomPerBranch; k++) {
          // מְפֻזָּרִים עַל הַשְּׁלִישׁ הָעֶלְיוֹן שֶׁל הָעָנָף + רַעַשׁ קָטָן בַּצַּד
          var f = 0.58 + 0.42 * (k / Math.max(1, bloomPerBranch - 1));
          var perpX = Math.cos(br.ang), perpY = Math.sin(br.ang);   // נִיצָב לָעָנָף
          var jit = (Math.random() - 0.5) * 26 * unit;
          blossoms.push({
            x: br.x0 + (br.x1 - br.x0) * f + perpX * jit,
            y: br.y0 + (br.y1 - br.y0) * f + perpY * jit,
            r: (9 + Math.random() * 7) * unit,
            color: blossomCols[(bj + k) % blossomCols.length],
            phase: Math.random() * 6.2832,
            twRate: 1.6 + Math.random() * 1.4
          });
        }
      }
      // מְעַט פְּרָחִים נוֹסָפִים בְּצַמֶּרֶת מֶרְכָּזִית מֵעַל רֹאשׁ הַגֶּזַע
      var crownN = isSuper ? 6 : 3;
      for (var cci = 0; cci < crownN; cci++) {
        var cang = (cci / crownN) * 6.2832;
        blossoms.push({
          x: cx + Math.cos(cang) * 36 * unit * (0.6 + Math.random() * 0.6),
          y: canopyY - 24 * unit - Math.abs(Math.sin(cang)) * 30 * unit * Math.random(),
          r: (9 + Math.random() * 8) * unit,
          color: blossomCols[cci % blossomCols.length],
          phase: Math.random() * 6.2832,
          twRate: 1.6 + Math.random() * 1.4
        });
      }
      // סֵדֶר הוֹפָעָה מְדֻרָּג: מְמַיְּנִים לְפִי גֹּבַהּ (נָמוּךְ קוֹדֵם) לְתְחוּשַׁת פְּרִיחָה עוֹלָה
      blossoms.sort(function (p, q) { return q.y - p.y; });
      var NB = blossoms.length;
      for (var bb = 0; bb < NB; bb++) {
        blossoms[bb].at = bloomStart + bloomSpan * (bb / Math.max(1, NB));
      }

      // ─── עֲלֵי כּוֹתֶרֶת נוֹשְׁרִים ───
      var petals = [];
      var NP = isSuper ? 26 : 16;
      for (var pi = 0; pi < NP; pi++) {
        petals.push({
          x: cx + (Math.random() - 0.5) * W * 0.6,
          y: canopyY - Math.random() * trunkH * 0.5,
          born: bloomStart + Math.random() * (dur - bloomStart) * 0.7,
          fall: (40 + Math.random() * 90) * unit,
          drift: (Math.random() - 0.5) * 60 * unit,
          sway: 8 + Math.random() * 10,
          swayR: 1.5 + Math.random() * 1.5,
          size: (3 + Math.random() * 3) * unit,
          life: 900 + Math.random() * 800,
          color: blossomCols[pi % blossomCols.length],
          rot: Math.random() * 6.2832
        });
      }

      // ─── גַּחְלִילִיּוֹת זוֹהֲרוֹת (עוֹלוֹת וּמְרַחֲפוֹת סְבִיב הַצַּמֶּרֶת) ───
      var flies = [];
      var NFlies = isSuper ? 30 : 16;
      for (var fi = 0; fi < NFlies; fi++) {
        flies.push({
          baseX: cx + (Math.random() - 0.5) * W * 0.62,
          baseY: groundY - Math.random() * trunkH * 1.05,
          ampX: (14 + Math.random() * 30) * unit,
          ampY: (10 + Math.random() * 26) * unit,
          rateX: 0.6 + Math.random() * 0.9,
          rateY: 0.5 + Math.random() * 0.9,
          phX: Math.random() * 6.2832,
          phY: Math.random() * 6.2832,
          rise: (10 + Math.random() * 50) * unit,
          born: Math.random() * dur * 0.5,
          size: (1.3 + Math.random() * 1.8) * unit,
          twRate: 3 + Math.random() * 4,
          color: Math.random() < 0.5 ? accent : mixHex(accent, '#FFFFFF', 0.3)
        });
      }

      // ─── טַבַּעַת נִיצוֹצוֹת סִיּוּם (סוּפֶּר) סְבִיב הַצַּמֶּרֶת ───
      var finaleAt = dur * 0.72;
      var finale = [];
      if (isSuper) {
        var NFin = 38;
        var finCols = [accent, glow, primary, '#FFFFFF'];
        for (var fI = 0; fI < NFin; fI++) {
          finale.push({
            ang: (fI / NFin) * 6.2832,
            speed: (120 + Math.random() * 80) * unit,
            size: (1.6 + Math.random() * 2.2) * unit,
            color: finCols[fI % finCols.length]
          });
        }
      }
      var canopyCx = cx;
      var canopyCy = canopyY - 6 * unit;          // מֶרְכָּז הַצַּמֶּרֶת לַטַּבַּעַת/הִילָה

      // ─── טֶקְסְט שֶׁבַח ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
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
          'position:absolute;left:50%;top:22%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;' +
          'color:' + accent + ';font-size:clamp(20px,3.5vw,34px);' +
          'text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.35)';
        root.appendChild(ptsEl);
      }

      var raf = 0, killed = false;
      var t0 = performance.now();

      // ── הִילָה רַכָּה מֵאָחוֹר לָעֵץ ──
      function drawGlow(t, gFade) {
        var pulse = 0.6 + 0.4 * Math.sin(t * 0.0035);
        var rad = Math.max(1, (trunkH * 0.62) * (0.7 + 0.3 * pulse));
        var g = ctx.createRadialGradient(canopyCx, canopyCy, 0, canopyCx, canopyCy, rad);
        g.addColorStop(0, hexA(accent, 0.26 * pulse * gFade));
        g.addColorStop(0.5, hexA(glow, 0.12 * gFade));
        g.addColorStop(1, hexA(glow, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(canopyCx, canopyCy, rad, 0, 6.2832); ctx.fill();
      }

      // ── הַגֶּזַע (מִתְרוֹמֵם) ──
      function drawTrunk(t, gFade, grow) {
        var topY = groundY - trunkH * grow;
        // צֵל קַרְקַע רַךְ
        ctx.fillStyle = hexA('#000000', 0.18 * gFade);
        ctx.beginPath();
        ctx.ellipse(cx, groundY + 4 * unit, trunkW * 1.7, 8 * unit, 0, 0, 6.2832);
        ctx.fill();
        // גּוּף הַגֶּזַע — מִצְטַמְצֵם כְּלַפֵּי מַעְלָה
        var halfB = trunkW * 0.5;
        var halfT = trunkW * 0.28;
        var grad = ctx.createLinearGradient(cx - halfB, 0, cx + halfB, 0);
        grad.addColorStop(0, hexA(TRUNK, 0.96 * gFade));
        grad.addColorStop(0.5, hexA(TRUNKHI, 0.96 * gFade));
        grad.addColorStop(1, hexA(TRUNK, 0.96 * gFade));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - halfB, groundY);
        ctx.lineTo(cx - halfT, topY);
        ctx.quadraticCurveTo(cx, topY - 6 * unit, cx + halfT, topY);
        ctx.lineTo(cx + halfB, groundY);
        ctx.closePath();
        ctx.fill();
      }

      // ── עָנָף בּוֹדֵד (גָּדֵל מֵהַבְּסִיס לַקָּצֶה) ──
      function drawBranch(br, t, gFade, grow) {
        if (grow <= 0) return;
        var ex = br.x0 + (br.x1 - br.x0) * grow;
        var ey = br.y0 + (br.y1 - br.y0) * grow;
        // עִקּוּם קַל לְמַרְאֶה אוֹרְגָנִי
        var mx = (br.x0 + ex) / 2 - Math.cos(br.ang) * br.len * 0.12 * grow;
        var my = (br.y0 + ey) / 2 - Math.sin(br.ang) * br.len * 0.12 * grow;
        ctx.strokeStyle = hexA(TRUNK, 0.95 * gFade);
        ctx.lineWidth = Math.max(1, br.w);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(br.x0, br.y0);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
        // הֶאָרַת קָצֶה דַּקָּה
        ctx.strokeStyle = hexA(TRUNKHI, 0.5 * gFade);
        ctx.lineWidth = Math.max(0.5, br.w * 0.4);
        ctx.beginPath();
        ctx.moveTo(br.x0, br.y0);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
      }

      // ── פֶּרַח זוֹהֵר בּוֹדֵד ──
      function drawBlossom(bl, t, gFade, pop) {
        if (pop <= 0) return;
        var tw = 0.85 + 0.15 * Math.sin(t / 1000 * bl.twRate + bl.phase);
        var r = bl.r * pop;
        if (r <= 0.3) return;
        // הִילָה רַכָּה
        var g = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, Math.max(1, r * 2.6));
        g.addColorStop(0, hexA(bl.color, 0.85 * tw * gFade));
        g.addColorStop(0.45, hexA(bl.color, 0.35 * tw * gFade));
        g.addColorStop(1, hexA(bl.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bl.x, bl.y, r * 2.6, 0, 6.2832); ctx.fill();
        // גּוּף הַפֶּרַח
        ctx.fillStyle = hexA(bl.color, 0.85 * gFade);
        ctx.beginPath(); ctx.arc(bl.x, bl.y, r, 0, 6.2832); ctx.fill();
        // לִבָּה בְּהִירָה
        ctx.fillStyle = hexA('#FFFFFF', 0.92 * tw * gFade);
        ctx.beginPath(); ctx.arc(bl.x, bl.y, Math.max(0.5, r * 0.42), 0, 6.2832); ctx.fill();
      }

      function frame(now) {
        if (killed) return;
        var t = now - t0;
        var gFade = clamp01((dur - t) / 250);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round';

        // 1) הִילָה מֵאָחוֹר (מִתְחַזֶּקֶת עִם הַצְּמִיחָה)
        var canopyRise = easeOutCubic(clamp01((t - branchStart) / Math.max(1, branchGrow)));
        drawGlow(t, gFade * (0.3 + 0.7 * canopyRise));

        // 2) גֶּזַע
        var trunkGr = easeOutCubic(clamp01(t / trunkGrow));
        drawTrunk(t, gFade, trunkGr);

        // 3) עֲנָפִים — מַתְחִילִים לִצְמֹחַ אַחֲרֵי שֶׁהַגֶּזַע כִּמְעַט הִגִּיעַ לְגָבְהוֹ
        for (var i = 0; i < branches.length; i++) {
          var br = branches[i];
          // הַשְׁהָיָה קַלָּה לְפִי הָרֹבֶד — רְבָדִים גְּבוֹהִים צוֹמְחִים מְאֻחָר יוֹתֵר
          var delay = branchStart + br.level * branchGrow * 0.16;
          var bg = easeOutCubic(clamp01((t - delay) / Math.max(1, branchGrow)));
          drawBranch(br, t, gFade, bg);
        }

        // 4) פְּרָחִים זוֹהֲרִים — קוֹפְצִים אֶחָד אַחַר הַשֵּׁנִי (easeOutBack)
        for (var j = 0; j < blossoms.length; j++) {
          var bl = blossoms[j];
          var bp = clamp01((t - bl.at) / 300);
          var pop = bp > 0 ? easeOutBack(bp) : 0;
          if (pop < 0) pop = 0;
          drawBlossom(bl, t, gFade, pop);
        }

        // 5) עֲלֵי כּוֹתֶרֶת נוֹשְׁרִים
        for (var p = 0; p < petals.length; p++) {
          var pt = petals[p];
          if (t < pt.born) continue;
          var pq = clamp01((t - pt.born) / pt.life);
          if (pq >= 1) continue;
          var px = pt.x + pt.drift * pq + Math.sin(t / 1000 * pt.swayR + pt.rot) * pt.sway;
          var py = pt.y + pt.fall * easeOutCubic(pq) + pq * 30 * unit;
          var pa = Math.sin(Math.PI * pq) * 0.8 * gFade;
          ctx.save();
          ctx.globalAlpha = pa;
          ctx.translate(px, py);
          ctx.rotate(pt.rot + t / 1000 * pt.swayR);
          ctx.fillStyle = hexA(pt.color, 1);
          ctx.beginPath();
          ctx.ellipse(0, 0, pt.size, pt.size * 0.55, 0, 0, 6.2832);
          ctx.fill();
          ctx.restore();
        }

        // 6) גַּחְלִילִיּוֹת זוֹהֲרוֹת
        for (var f = 0; f < flies.length; f++) {
          var fl = flies[f];
          if (t < fl.born) continue;
          var ft = (t - fl.born) / 1000;
          var prog = clamp01(ft / (dur / 1000));
          var fx = fl.baseX + Math.sin(ft * fl.rateX + fl.phX) * fl.ampX;
          var fy = fl.baseY + Math.cos(ft * fl.rateY + fl.phY) * fl.ampY - fl.rise * easeOutCubic(prog);
          var tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t / 1000 * fl.twRate + fl.phX));
          var fa = tw * gFade;
          var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(1, fl.size * 4));
          fg.addColorStop(0, hexA(fl.color, 0.9 * fa));
          fg.addColorStop(1, hexA(fl.color, 0));
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(fx, fy, fl.size * 4, 0, 6.2832); ctx.fill();
          ctx.fillStyle = hexA('#FFFFFF', 0.9 * fa);
          ctx.beginPath(); ctx.arc(fx, fy, fl.size, 0, 6.2832); ctx.fill();
        }

        // 7) טַבַּעַת נִיצוֹצוֹת סִיּוּם (סוּפֶּר)
        if (isSuper && t >= finaleAt) {
          var fq = clamp01((t - finaleAt) / 900);
          if (fq < 1) {
            for (var fin = 0; fin < finale.length; fin++) {
              var fp = finale[fin];
              var fd = fp.speed * easeOutCubic(fq);
              var fxp = canopyCx + Math.cos(fp.ang) * fd;
              var fyp = canopyCy + Math.sin(fp.ang) * fd * 0.78;
              var fa2 = (1 - fq) * gFade;
              var fsl = (10 * (1 - fq) + 3) * unit;
              ctx.strokeStyle = hexA(fp.color, 0.9 * fa2);
              ctx.lineWidth = fp.size;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(fxp, fyp);
              ctx.lineTo(fxp - Math.cos(fp.ang) * fsl, fyp - Math.sin(fp.ang) * fsl * 0.78);
              ctx.stroke();
            }
          }
        }

        // ─── טֶקְסְט ───
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
