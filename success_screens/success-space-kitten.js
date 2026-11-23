/* success-space-kitten.js — מסך הצלחה: חֲתַלְתּוּלָה בֶּחָלָל 🚀
   חתלתולה אסטרונאוטית מתוקה (מבט חזיתי / שלושה-רבעים: פרווה כתומה-קרם עם פסים,
   עיניים גדולות ונוצצות, אף ורוד, שפם וסומק, אוזניים מחודדות עם פנים ורוד)
   בתוך קסדת זכוכית עגולה עם השתקפות מעוגלת, בחליפת חלל לבנה עם טלאים בצבעי
   הסקין ותרמיל סילון קטן שפולט ענני עשן רכים. היא מרחפת פנימה מהפינה בסחרור
   עדין, מבחינה בכוכב זהב זוהר, שוחה אליו ומחבקת אותו — והכוכב מתפוצץ לטבעת
   כוכבונים בזמן שהיא עושה סלטה שמחה, מנופפת בכפה וקורצת.
   ברקע: כוכב לכת עם טבעת, ירח סהר, שדה כוכבים מנצנץ וכוכב נופל.
   בסופר: היא רוכבת על הכוכב כמו שביט בלולאת אינסוף עם שובל קשת נוצץ,
   כוכבי לכת קטנים מקיפים את המחמאה, ופיצוץ גדול של כוכבים ולבבות מסיים.
   נרשם לפי החוזה ב-success_screens_spec.md — ללא גלובלים מלבד window.SUCCESS;
   cleanup מסיר הכל (canvas, טקסט, rAF, מאזין resize). קריא מעל הכיסוי הכהה. */
(function () {
  'use strict';
  window.SUCCESS = window.SUCCESS || {};
  window.SUCCESS.styles = window.SUCCESS.styles || [];

  var TAU = Math.PI * 2;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function bez(a, c, b, t) { var u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(h1, h2, k) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp(a >> 16 & 255, b >> 16 & 255, k)), g = Math.round(lerp(a >> 8 & 255, b >> 8 & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  function starPath(ctx, x, y, r, rot, inner) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.48) : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function heartPath(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y + r * 0.9);
    c.bezierCurveTo(x - r * 1.3, y + r * 0.05, x - r * 0.95, y - r * 1.0, x, y - r * 0.4);
    c.bezierCurveTo(x + r * 0.95, y - r * 1.0, x + r * 1.3, y + r * 0.05, x, y + r * 0.9);
    c.closePath();
  }

  // kitten + suit colours (the palette goes on the patches, the glass and the sky)
  var FUR  = { light: '#FFDDAA', base: '#FFB566', deep: '#F39A48', dark: '#E27F30', line: '#B85C26',
               cream: '#FFF5E6', ear: '#FFA9C2', earDk: '#F07FA0', nose: '#FF7FA3', noseDk: '#D9577E' };
  var SUIT = { line: '#7D85AE', sleeve: '#F3F5FC' };
  var EYEC = '#2A1636', MOUTHC = '#7E3424';
  var RAINBOW = ['#FF6F91', '#FFA24D', '#FFE066', '#7BE38F', '#5EC4FF', '#B98CFF'];

  // kitten local units: helmet centre = (0,0), helmet radius = 1, y down
  var PIV = 0.62;               // pivot (centre of mass) — she tumbles/flips around it
  var HUGY = 1.3, HUGR = 0.42;  // star hugged against the chest
  var SEATY = 1.95, SEATR = 0.56; // star she rides on (super)
  var RIDE_SC = 0.8;

  window.SUCCESS.styles.push({
    name: 'space-kitten',
    supportsSuper: true,

    show: function (opts) {
      var root = opts.root;
      var isSuper = !!opts.isSuper;
      var dur = opts.durationMs || (isSuper ? 4500 : 2700);
      var pal = opts.palette || {};
      var primary = pal.primary || '#C77DFF';
      var accent  = pal.accent  || '#FFD27D';
      var glow    = pal.glow    || '#7DC4FF';
      var textCol = pal.text    || '#FFFFFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(primary)) primary = '#C77DFF';
      if (!/^#[0-9a-fA-F]{6}$/.test(accent)) accent = '#FFD27D';
      if (!/^#[0-9a-fA-F]{6}$/.test(glow)) glow = '#7DC4FF';
      if (!/^#[0-9a-fA-F]{6}$/.test(textCol)) textCol = '#FFFFFF';
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';
      var primDk = mixHex(primary, '#1A0A2A', 0.38), primLt = mixHex(primary, '#FFFFFF', 0.45);
      var accDk = mixHex(accent, '#3A1A00', 0.4);

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { starIn: [0.03, 0.1], spot: 0.1, sw0: 0.14, h0: 0.235, m0: 0.28, r0: 0.315, r1: 0.74, b: 0.75, f0: 0.76, f1: 0.86, txt: 0.2, orbit: 0.21 }
        : { starIn: [0.06, 0.18], spot: 0.215, sw0: 0.29, h0: 0.48, b: 0.58, f0: 0.59, f1: 0.73, txt: 0.27 };
      function ms(f) { return f * dur; }
      var PHN = isSuper ? ['float', 'swim', 'hug', 'mount', 'ride', 'flip', 'wave'] : ['float', 'swim', 'hug', 'flip', 'wave'];
      var PHT = isSuper ? [0, T.sw0, T.h0, T.m0, T.r0, T.f0, T.f1] : [0, T.sw0, T.h0, T.f0, T.f1];
      var tSpot = ms(T.spot), tSw0 = ms(T.sw0), tH0 = ms(T.h0), tB = ms(T.b), tF0 = ms(T.f0), tF1 = ms(T.f1);
      var tR0 = isSuper ? ms(T.r0) : 0, tR1 = isSuper ? ms(T.r1) : 0, tM0 = isSuper ? ms(T.m0) : 0;
      var BLINKS = isSuper ? [380, 2050, 2900, 4150] : [380, 1150, 2330];
      var BLEND = 150;

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1, DPR = 1, s = 100;
      function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h || w)); return c; }

      // ─── fixed sprites (off-DOM) ───
      var spr = mk(64), sg = spr.getContext('2d'), sgr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
      sgr.addColorStop(0, 'rgba(255,255,235,1)'); sgr.addColorStop(0.2, 'rgba(255,236,170,.8)');
      sgr.addColorStop(0.5, 'rgba(255,210,120,.25)'); sgr.addColorStop(1, 'rgba(255,210,120,0)');
      sg.fillStyle = sgr; sg.fillRect(0, 0, 64, 64);
      var halo = mk(128), hgc = halo.getContext('2d'), hgr = hgc.createRadialGradient(64, 64, 0, 64, 64, 64);
      hgr.addColorStop(0, hexA(glow, 0.55)); hgr.addColorStop(0.4, hexA(primary, 0.22)); hgr.addColorStop(1, hexA(primary, 0));
      hgc.fillStyle = hgr; hgc.fillRect(0, 0, 128, 128);
      // a soft cartoon cloud puff: three overlapping round lobes, white with a palette-tinted rim
      var puffSpr = mk(64), pgc = puffSpr.getContext('2d');
      [[24, 37, 15], [40, 36, 15], [32, 25, 16]].forEach(function (L) {
        var pg0 = pgc.createRadialGradient(L[0] - 3, L[1] - 4, 1, L[0], L[1], L[2]);
        pg0.addColorStop(0, 'rgba(255,255,255,1)'); pg0.addColorStop(0.6, 'rgba(250,248,255,0.92)');
        pg0.addColorStop(0.85, hexA(mixHex(glow, '#FFFFFF', 0.55), 0.5)); pg0.addColorStop(1, hexA(glow, 0));
        pgc.fillStyle = pg0; pgc.beginPath(); pgc.arc(L[0], L[1], L[2], 0, TAU); pgc.fill();
      });
      var raySpr = mk(256), rgc = raySpr.getContext('2d');
      rgc.translate(128, 128);
      for (var ri = 0; ri < 8; ri++) {
        rgc.rotate(TAU / 8);
        var rl = ri % 2 ? 72 : 124, rw = ri % 2 ? 6 : 10, rlg = rgc.createLinearGradient(0, 0, 0, -rl);
        rlg.addColorStop(0, 'rgba(255,244,200,0.95)'); rlg.addColorStop(1, 'rgba(255,220,140,0)');
        rgc.fillStyle = rlg; rgc.beginPath(); rgc.moveTo(-rw, 0); rgc.lineTo(0, -rl); rgc.lineTo(rw, 0); rgc.closePath(); rgc.fill();
      }
      function mkStarSpr(light, mid, edge, line) {
        var c = mk(64), g = c.getContext('2d'), gr = g.createRadialGradient(27, 25, 2, 32, 33, 26);
        gr.addColorStop(0, light); gr.addColorStop(0.55, mid); gr.addColorStop(1, edge);
        g.fillStyle = gr; g.strokeStyle = line; g.lineWidth = 4; g.lineJoin = 'round';
        starPath(g, 32, 34, 25, 0, 0.5); g.stroke(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(27, 25, 6, 3, -0.5, 0, TAU); g.fill();
        return c;
      }
      function tint(hex) { return mkStarSpr(mixHex(hex, '#FFFFFF', 0.75), mixHex(hex, '#FFFFFF', 0.2), hex, mixHex(hex, '#1A0A2A', 0.35)); }
      var starSprs = [mkStarSpr('#FFFBE0', '#FFE066', '#F5A623', '#D9831A'), mkStarSpr('#FFFFFF', '#FFFFFF', '#DCD6F6', '#A99FD6'),
                      tint(primary), tint(glow), tint(accent)];
      function mkHeartSpr(light, mid, line) {
        var c = mk(64), g = c.getContext('2d'), gr = g.createRadialGradient(24, 22, 2, 32, 32, 30);
        gr.addColorStop(0, light); gr.addColorStop(0.6, mid); gr.addColorStop(1, mixHex(mid, '#1A0A2A', 0.15));
        g.fillStyle = gr; g.strokeStyle = line; g.lineWidth = 3.5; g.lineJoin = 'round';
        heartPath(g, 32, 33, 24); g.stroke(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(22, 22, 6, 3.5, -0.6, 0, TAU); g.fill();
        return c;
      }
      var heartSprs = [mkHeartSpr('#FFE0EC', '#FF7FB0', '#D64C86'), mkHeartSpr(mixHex(primary, '#FFFFFF', 0.7), primary, primDk),
                       mkHeartSpr('#FFF1F5', '#FFA3C4', '#E0628F')];

      // ─── size-dependent sprites: distant ringed planet, crescent moon, little orbiting planets ───
      function mkPlanet(R, base, ringCol, tilt, hasRing) {
        var ext = R * (hasRing ? 1.95 : 1.2), c = mk(ext * 2 * DPR), g = c.getContext('2d');
        g.scale(DPR, DPR); g.translate(ext, ext); g.rotate(tilt);
        function ring(front) {
          g.save(); g.beginPath();
          if (front) g.rect(-ext, 0, ext * 2, ext); else g.rect(-ext, -ext, ext * 2, ext);
          g.clip();
          g.beginPath(); g.ellipse(0, 0, R * 1.82, R * 0.46, 0, 0, TAU); g.ellipse(0, 0, R * 1.3, R * 0.3, 0, 0, TAU);
          var rg = g.createLinearGradient(-R * 1.8, 0, R * 1.8, 0);
          rg.addColorStop(0, hexA(ringCol, 0.55)); rg.addColorStop(0.45, hexA(mixHex(ringCol, '#FFFFFF', 0.5), 0.95)); rg.addColorStop(1, hexA(ringCol, 0.6));
          g.fillStyle = rg; g.fill('evenodd');
          g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = Math.max(0.6, R * 0.035);
          g.beginPath(); g.ellipse(0, 0, R * 1.56, R * 0.385, 0, 0, TAU); g.stroke();
          g.restore();
        }
        if (hasRing) ring(false);
        var pg = g.createRadialGradient(-R * 0.4, -R * 0.45, R * 0.08, 0, 0, R * 1.02);
        pg.addColorStop(0, mixHex(base, '#FFFFFF', 0.6)); pg.addColorStop(0.5, base); pg.addColorStop(1, mixHex(base, '#120822', 0.55));
        g.fillStyle = pg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.17)';
        g.beginPath(); g.ellipse(0, -R * 0.4, R * 1.2, R * 0.09, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(0, R * 0.3, R * 1.2, R * 0.12, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(40,10,60,0.13)';
        g.beginPath(); g.ellipse(0, -R * 0.06, R * 1.2, R * 0.1, 0, 0, TAU); g.fill();
        g.restore();
        if (hasRing) ring(true);
        return { c: c, ext: ext };
      }
      function mkMoon(R) {
        var ext = R * 1.9, c = mk(ext * 2 * DPR), g = c.getContext('2d');
        g.scale(DPR, DPR); g.translate(ext, ext);
        var mg = g.createRadialGradient(-R * 0.35, -R * 0.3, R * 0.1, 0, 0, R);
        mg.addColorStop(0, '#FFFCEB'); mg.addColorStop(0.6, '#FFEBAE'); mg.addColorStop(1, '#F4CF72');
        g.fillStyle = mg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(214,168,82,0.35)';
        g.beginPath(); g.arc(-R * 0.5, R * 0.22, R * 0.13, 0, TAU); g.fill();
        g.beginPath(); g.arc(-R * 0.22, -R * 0.55, R * 0.09, 0, TAU); g.fill();
        g.beginPath(); g.arc(-R * 0.62, -R * 0.22, R * 0.07, 0, TAU); g.fill();
        g.beginPath(); g.arc(-R * 0.18, R * 0.62, R * 0.08, 0, TAU); g.fill();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(R * 0.48, -R * 0.24, R * 0.86, 0, TAU); g.fill();
        g.globalCompositeOperation = 'destination-over';
        var gg = g.createRadialGradient(0, 0, R * 0.5, 0, 0, ext);
        gg.addColorStop(0, 'rgba(255,240,190,0.32)'); gg.addColorStop(1, 'rgba(255,240,190,0)');
        g.fillStyle = gg; g.fillRect(-ext, -ext, ext * 2, ext * 2);
        return { c: c, ext: ext };
      }
      var planetS = null, moonS = null, minis = [];

      // ─── deterministic particles (pure functions of time → robust to dropped frames) ───
      var PUFF_DT = 36, puffs = [];
      for (var pi0 = 0; pi0 < Math.ceil(dur / PUFF_DT) + 2; pi0++)
        puffs.push({ te: pi0 * PUFF_DT + rnd(0, PUFF_DT * 0.8), side: pi0 % 2 ? 1 : -1, th: Math.random(), sp: rnd(0.75, 1.3),
                     ang: rnd(-0.3, 0.3), sz: rnd(0.75, 1.25), life: rnd(520, 820), o: null });
      var tSparks = [];
      if (isSuper) for (var tj = 0; tj < (tR1 - tR0) / 18; tj++)
        tSparks.push({ te: tR0 + tj * 18 + rnd(0, 14), off: rnd(-1, 1), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), life: rnd(550, 950),
                       col: tj % 3 === 0 ? '#FFFFFF' : tj % 3 === 1 ? '#FFE27A' : RAINBOW[tj % 6], sz: rnd(0.04, 0.085), ph: rnd(0, TAU), o: null });
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 90 : 72); bs++)
        bgStars.push({ x: Math.random(), y: Math.random(), ph: Math.random() * TAU, rate: 1.5 + Math.random() * 4, big: bs % 7 === 0,
                       r: 0.7 + Math.random() * 1.5, a: 0.45 + Math.random() * 0.55,
                       col: bs % 4 === 0 ? glow : bs % 9 === 0 ? accent : bs % 6 === 0 ? '#FFE9C4' : '#FFFFFF' });
      var shooters = [{ t0: 0.07, d: 700, x0: 0.97, y0: 0.05, x1: 0.62, y1: 0.36 }, { t0: 0.5, d: 650, x0: 0.04, y0: 0.12, x1: 0.33, y1: 0.4 }];
      if (isSuper) shooters.push({ t0: 0.3, d: 650, x0: 0.98, y0: 0.42, x1: 0.68, y1: 0.66 }, { t0: 0.66, d: 600, x0: 0.85, y0: 0.03, x1: 0.56, y1: 0.28 });
      var ring = [];
      for (var rs = 0; rs < 12; rs++)
        ring.push({ ang: rs / 12 * TAU + rnd(-0.1, 0.1), spin: rnd(-4, 4), spr: starSprs[rs % 2 ? (rs % 4 === 1 ? 2 : 3) : (rs % 4 === 0 ? 0 : 4)],
                    sz: rs % 2 ? rnd(0.12, 0.15) : rnd(0.16, 0.2), tw: rnd(0, TAU), dl: rnd(0, 70) });
      var dust = [];
      for (var ds = 0; ds < (isSuper ? 34 : 20); ds++)
        dust.push({ ang: rnd(0, TAU), sp: rnd(0.9, isSuper ? 3.4 : 2.4), sz: rnd(0.04, 0.08), col: ds % 3 === 0 ? accent : ds % 3 === 1 ? '#FFFFFF' : glow, dl: rnd(0, 120) });
      var finale = [];
      if (isSuper) for (var fs = 0; fs < 30; fs++) {
        var isH = fs % 5 === 1 || fs % 5 === 3;
        finale.push({ ang: fs / 30 * TAU + rnd(-0.1, 0.1), dist: fs % 2 ? rnd(1.7, 2.4) : rnd(2.6, 3.6), spin: rnd(-3, 3), heart: isH,
                      spr: isH ? heartSprs[fs % 3] : starSprs[fs % 5], sz: isH ? rnd(0.22, 0.3) : rnd(0.17, 0.26), dl: rnd(0, 90), tw: rnd(0, TAU) });
      }
      var orbiters = isSuper ? [{ ph: 0.3, i: 0 }, { ph: 0.3 + TAU / 4, i: 1 }, { ph: 0.3 + TAU / 2, i: 2 }, { ph: 0.3 + TAU * 0.75, i: 3 }] : [];

      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
        s = Math.min(H * 0.165, W * 0.25);
        planetS = mkPlanet(Math.min(s * 0.4, W * 0.085), primary, accent, -0.38, true);
        moonS = mkMoon(Math.min(s * 0.32, W * 0.07));
        minis = isSuper ? [mkPlanet(s * 0.16, glow, '#FFFFFF', 0.35, true), mkPlanet(s * 0.15, accent, accent, 0, false),
                           mkPlanet(s * 0.15, '#FF8FC8', '#FFFFFF', -0.3, true), mkPlanet(s * 0.13, primary, primary, 0, false)] : [];
        for (var i = 0; i < puffs.length; i++) puffs[i].o = null;
        for (var j = 0; j < tSparks.length; j++) tSparks[j].o = null;
      }
      fit();
      window.addEventListener('resize', fit);

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA(glow, 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + ' + (isSuper ? '9.5%' : '8%') + ');transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── layout ───
      function CY() { return H * 0.6; }
      function SPAN() { return Math.max(0, Math.min(W * 0.2, s * 2.0, W / 2 - 1.35 * s)); }   // keep her paws on screen
      function starHome() {     // where the golden star waits: beside her (landscape) or up-right (portrait)
        var cx = W / 2, cy = CY();
        return W > H * 1.05 ? { x: cx + SPAN() * 0.95, y: cy - 0.3 * s } : { x: W * 0.77, y: cy - 1.15 * s };
      }

      // ─── the choreography: pose(t) is a pure function of time ───
      function rideState(t) {
        var q = clamp01((t - tR0) / (tR1 - tR0)), u = q * 0.5 + easeInOut(q) * 0.5;
        var Ax = Math.max(W * 0.1, Math.min(W * 0.3, W / 2 - 1.1 * s * RIDE_SC)), Ay = Math.min(H * 0.12, s);
        var a = TAU * u;
        var dx = Ax * Math.cos(a), dy = -2 * Ay * Math.cos(2 * a), l = Math.sqrt(dx * dx + dy * dy) || 1;
        var ramp = smooth(q / 0.12) * smooth((1 - q) / 0.12);
        return { x: W / 2 + Ax * Math.sin(a), y: CY() - Ay * Math.sin(2 * a), dxN: dx / l * ramp, dyN: dy / l * ramp,
                 k: lerp(1, RIDE_SC, smooth(q / 0.1) * smooth((1 - q) / 0.1)) };
      }
      function limbsFor(n, t, o) {
        var ph;
        if (n === 'float') {
          o.aL = 0.95 + 0.12 * Math.sin(t * 0.005); o.bL = 0.6 + 0.12 * Math.sin(t * 0.004 + 1);
          o.aR = 0.95 + 0.12 * Math.sin(t * 0.005 + 2.1); o.bR = 0.6 + 0.12 * Math.sin(t * 0.004 + 3);
          o.lL = 0.24 + 0.1 * Math.sin(t * 0.006); o.lR = 0.24 + 0.1 * Math.sin(t * 0.006 + 2);
          o.look = 0; o.eL = 0; o.eR = 0;
          var k = smooth((t - tSpot) / 170);
          if (k > 0) {           // "oh!" — paws up, eyes on the star
            o.aL = lerp(o.aL, 1.5, k); o.aR = lerp(o.aR, 1.5, k); o.bL = lerp(o.bL, 1.0, k); o.bR = lerp(o.bR, 1.0, k); o.look = 0.75 * k;
          }
        } else if (n === 'swim') {
          ph = (t - tSw0) * 0.019;
          o.aR = 1.4 + 0.85 * Math.sin(ph); o.bR = 0.35 + 0.35 * Math.sin(ph + 0.8);
          o.aL = 1.4 + 0.85 * Math.sin(ph + Math.PI); o.bL = 0.35 + 0.35 * Math.sin(ph + Math.PI + 0.8);
          o.lL = 0.28 + 0.3 * Math.sin(ph * 1.2); o.lR = 0.28 + 0.3 * Math.sin(ph * 1.2 + Math.PI);
          o.look = 0.7; o.eL = 0; o.eR = 0;
        } else if (n === 'hug') {
          var hk = Math.sin(t * 0.012);
          o.aL = 0.85 + 0.05 * hk; o.bL = -2.2 - 0.05 * hk; o.aR = 0.85 + 0.05 * hk; o.bR = -2.2 - 0.05 * hk;
          o.lL = 0.14; o.lR = 0.55 + 0.2 * Math.sin(t * 0.014);
          o.look = 0; o.eL = 1; o.eR = 1;
        } else if (n === 'mount' || n === 'ride') {
          o.aR = 2.6 + 0.12 * Math.sin(t * 0.009); o.bR = 0.15 + 0.4 * Math.sin(t * 0.022);
          o.aL = 0.3; o.bL = -0.9;
          o.lL = 1.15 + 0.08 * Math.sin(t * 0.02); o.lR = 1.15 + 0.08 * Math.sin(t * 0.02 + 1.5);
          o.look = n === 'ride' ? rideState(t).dxN * 0.8 : 0; o.eL = 0; o.eR = 0;
        } else if (n === 'flip') {
          o.aL = 1.8; o.aR = 1.8; o.bL = 0.4; o.bR = 0.4; o.lL = 0.5; o.lR = 0.5; o.look = 0; o.eL = 1; o.eR = 1;
        } else {                 // wave + wink
          var wt = t - tF1;
          o.aR = 2.5; o.bR = 0.2 + 0.5 * Math.sin(wt * 0.018);
          o.aL = 0.6; o.bL = 0.55; o.lL = 0.2 + 0.06 * Math.sin(t * 0.006); o.lR = 0.26 + 0.06 * Math.sin(t * 0.006 + 1.5);
          o.look = 0; o.eL = 0; o.eR = wt > 260 && wt < 640 ? 1 : 0;
        }
      }
      var LIMB_KEYS = ['aL', 'bL', 'aR', 'bR', 'lL', 'lR', 'look', 'eL', 'eR'], tmpL = {};
      function blinkAt(t) {
        for (var i = 0; i < BLINKS.length; i++) { var q = (t - BLINKS[i]) / 170; if (q > 0 && q < 1) return Math.abs(Math.cos(q * Math.PI)); }
        return 1;
      }
      function pose(t) {
        var i = 0;
        while (i + 1 < PHN.length && t >= PHT[i + 1] * dur) i++;
        var n = PHN[i], P = { t: t, n: n };
        limbsFor(n, t, P);
        if (i > 0) {
          var w = smooth((t - PHT[i] * dur) / BLEND);
          if (w < 1) { limbsFor(PHN[i - 1], t, tmpL); for (var k = 0; k < LIMB_KEYS.length; k++) P[LIMB_KEYS[k]] = lerp(tmpL[LIMB_KEYS[k]], P[LIMB_KEYS[k]], w); }
        }
        // body motion (absolute per phase, continuous at the seams)
        var a0 = PHT[i] * dur, a1 = (i + 1 < PHN.length ? PHT[i + 1] : 1) * dur, q = clamp01((t - a0) / Math.max(1, a1 - a0));
        var cx = W / 2, cy = CY(), sp = SPAN(), Fx = cx - sp, Fy = cy + 0.05 * s;
        P.x = cx; P.y = cy; P.rot = 0; P.sc = s; P.jet = 0.3;
        if (n === 'float') {
          var e = easeOut(q);
          P.x = bez(-1.7 * s, Fx - sp * 0.8 - 0.4 * s, Fx, e);
          P.y = bez(H + 1.5 * s, cy - 0.6 * s, Fy, e);
          P.rot = -2.0 * Math.pow(1 - e, 1.5) + 0.16 * Math.sin(t * 0.006) * (1 - e);
          P.sc = s * lerp(0.72, 1, e);
          var sk = (t - tSpot) / 420;
          if (sk > 0 && sk < 1) P.y -= Math.sin(Math.PI * sk) * 0.1 * s;     // a startled little hop
          P.jet = 0.65 - 0.35 * smooth((t - tSpot) / 250);
        } else if (n === 'swim') {
          var e2 = easeInOut(q), sq = Math.sin(Math.PI * q);
          P.x = lerp(Fx, cx, e2);
          P.y = lerp(Fy, cy, e2) - sq * 0.22 * s + Math.sin((t - tSw0) * 0.038) * 0.035 * s * sq;
          P.rot = 0.28 * sq;
          P.jet = 1;
        } else if (n === 'hug') {
          P.y = cy + Math.sin(Math.PI * q) * 0.04 * s;
          P.rot = 0.08 * Math.sin(q * TAU * 1.5) * (1 - q * 0.5);
          P.sc = s * (1 + 0.05 * Math.sin(Math.PI * clamp01(q * 1.25)));
          P.jet = 0.2;
        } else if (n === 'mount') {
          P.jet = 0.15;
        } else if (n === 'ride') {
          var R = rideState(t);
          P.x = R.x; P.y = R.y; P.rot = 0.36 * R.dxN + 0.06 * Math.sin(t * 0.012); P.sc = s * R.k; P.jet = 0;
        } else if (n === 'flip') {
          P.y = cy - Math.sin(Math.PI * q) * 0.5 * s; P.rot = -TAU * easeInOut(q); P.jet = 0.25;
        } else {
          var wt = t - tF1;
          P.y = cy + Math.sin(wt * 0.004) * 0.05 * s; P.rot = 0.07 * Math.sin(wt * 0.006); P.jet = 0.3;
        }
        // expression
        var sq2 = (t - tSpot) / 480, inSpot = sq2 > 0 && sq2 < 1;
        P.wide = inSpot ? Math.sin(Math.PI * Math.min(1, sq2 * 1.6)) * (1 - sq2 * 0.3) : 0;
        P.earTw = inSpot ? Math.sin(sq2 * Math.PI * 5) * 0.2 * (1 - sq2) : 0;
        P.mouth = n === 'float' ? (sq2 > 0.04 && sq2 < 0.9 ? 2 : 0) : n === 'swim' ? 0 : 1;
        P.palm = n === 'wave' || n === 'ride' || n === 'mount';
        P.blink = blinkAt(t);
        P.tailAmp = n === 'ride' ? 2 : n === 'swim' ? 1.5 : 1;
        return P;
      }
      function toWorld(P, lx, ly) {
        var px = lx * P.sc, py = (ly - PIV) * P.sc, c = Math.cos(P.rot), sn = Math.sin(P.rot);
        return { x: P.x + px * c - py * sn, y: P.y + px * sn + py * c };
      }

      // ─── drawing helpers ───
      function glowDot(x, y, r, a) {
        if (a <= 0 || r <= 0) return;
        var ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * a;
        ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = ga;
      }
      function rrect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      }
      function taper(x0, y0, x1, y1, w) {       // a fur stripe: wide at (x0,y0), pointed at (x1,y1)
        var dx = x1 - x0, dy = y1 - y0, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l * w, ny = dx / l * w;
        ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny);
        ctx.quadraticCurveTo(x0 + dx * 0.55 + nx * 0.9, y0 + dy * 0.55 + ny * 0.9, x1, y1);
        ctx.quadraticCurveTo(x0 + dx * 0.55 - nx * 0.9, y0 + dy * 0.55 - ny * 0.9, x0 - nx, y0 - ny);
        ctx.closePath(); ctx.fill();
      }
      function drawSprite(img, x, y, r, rot, a) {
        if (a <= 0 || r <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(img, -r, -r, r * 2, r * 2); ctx.restore();
      }

      // ── kitten parts (local units) ──
      function drawPack(P) {
        var wob = Math.sin(P.t * 0.011) * 0.07, tx = -1.12 + wob, ty = -0.08 + Math.abs(wob) * 0.4;
        ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(-0.6, 1.0); ctx.quadraticCurveTo(-1.0, 0.5, tx, ty); ctx.stroke();
        ctx.strokeStyle = '#E4E8F8'; ctx.lineWidth = 0.024; ctx.stroke();
        glowDot(tx, ty, 0.32, 0.7 + 0.3 * Math.sin(P.t * 0.01));
        ctx.fillStyle = accent; ctx.strokeStyle = accDk; ctx.lineWidth = 0.025;
        ctx.beginPath(); ctx.arc(tx, ty, 0.075, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(tx - 0.024, ty - 0.024, 0.022, 0, TAU); ctx.fill();
        var g = ctx.createLinearGradient(-0.8, 0, 0.8, 0);
        g.addColorStop(0, '#EEF1FB'); g.addColorStop(1, '#AAB2D6');
        ctx.fillStyle = g; ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.04;
        rrect(-0.8, 0.98, 1.6, 0.8, 0.2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = glow;
        rrect(-0.79, 1.2, 0.1, 0.32, 0.04); ctx.fill(); rrect(0.69, 1.2, 0.1, 0.32, 0.04); ctx.fill();
        for (var sd = -1; sd <= 1; sd += 2) {
          var nx = sd * 0.6;
          ctx.fillStyle = '#9AA2C6'; ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.03;
          ctx.beginPath(); ctx.moveTo(nx - 0.1, 1.74); ctx.lineTo(nx + 0.1, 1.74); ctx.lineTo(nx + 0.14 + sd * 0.03, 1.95); ctx.lineTo(nx - 0.14 + sd * 0.03, 1.95); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#5E668E'; ctx.beginPath(); ctx.ellipse(nx + sd * 0.03, 1.95, 0.14, 0.035, 0, 0, TAU); ctx.fill();
          if (P.jet > 0.05) glowDot(nx + sd * 0.04, 2.0, 0.32 * P.jet * (0.85 + 0.15 * Math.sin(P.t * 0.05 + sd)), 0.95);
        }
      }
      function drawTail(P) {
        var sw = Math.sin(P.t * 0.006) * 0.1 * P.tailAmp;
        ctx.beginPath(); ctx.moveTo(0.4, 1.6);
        ctx.bezierCurveTo(0.95, 1.85, 1.22 + sw, 1.55, 1.1 + sw, 1.22);
        ctx.quadraticCurveTo(1.04 + sw * 1.1, 1.04, 0.9 + sw * 1.3, 1.1);
        ctx.strokeStyle = FUR.line; ctx.lineWidth = 0.2; ctx.stroke();
        ctx.strokeStyle = FUR.base; ctx.lineWidth = 0.14; ctx.stroke();
        ctx.setLineDash([0.06, 0.09]); ctx.lineCap = 'butt';
        ctx.strokeStyle = FUR.dark; ctx.lineWidth = 0.14; ctx.stroke();
        ctx.setLineDash([]); ctx.lineCap = 'round';
        ctx.fillStyle = FUR.cream; ctx.beginPath(); ctx.arc(0.9 + sw * 1.3, 1.1, 0.068, 0, TAU); ctx.fill();
      }
      function drawLeg(side, a) {
        var hx = side * 0.25, hy = 1.76, L = 0.3;
        var fx = hx + side * Math.sin(a) * L, fy = hy + Math.cos(a) * L;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy);
        ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.3; ctx.stroke();
        ctx.strokeStyle = '#E9EDFA'; ctx.lineWidth = 0.235; ctx.stroke();
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(-side * a);
        var g = ctx.createLinearGradient(0, -0.1, 0, 0.16);
        g.addColorStop(0, primLt); g.addColorStop(1, primary);
        ctx.fillStyle = g; ctx.strokeStyle = primDk; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.ellipse(side * 0.03, 0.05, 0.17, 0.12, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.ellipse(side * 0.03, 0.05, 0.14, 0.085, 0, 0.35, Math.PI - 0.35); ctx.stroke();
        ctx.restore();
      }
      function torsoPath() {
        ctx.beginPath(); ctx.moveTo(-0.44, 0.9);
        ctx.bezierCurveTo(-0.74, 1.02, -0.78, 1.72, -0.5, 1.9);
        ctx.quadraticCurveTo(0, 2.04, 0.5, 1.9);
        ctx.bezierCurveTo(0.78, 1.72, 0.74, 1.02, 0.44, 0.9);
        ctx.quadraticCurveTo(0, 0.8, -0.44, 0.9); ctx.closePath();
      }
      function drawTorso(P) {
        var g = ctx.createLinearGradient(-0.7, 0.9, 0.75, 1.7);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#EEF1FB'); g.addColorStop(1, '#BAC2E4');
        torsoPath(); ctx.fillStyle = g; ctx.fill();
        ctx.save(); torsoPath(); ctx.clip();
        ctx.fillStyle = primary; ctx.fillRect(-0.8, 1.6, 1.6, 0.13);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-0.8, 1.6, 1.6, 0.03);
        ctx.strokeStyle = 'rgba(120,130,180,0.25)'; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(-0.55, 1.47); ctx.quadraticCurveTo(0, 1.53, 0.55, 1.47); ctx.stroke();
        ctx.restore();
        torsoPath(); ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.04; ctx.stroke();
        // belt buckle
        ctx.fillStyle = accent; ctx.strokeStyle = accDk; ctx.lineWidth = 0.022;
        rrect(-0.085, 1.585, 0.17, 0.16, 0.045); ctx.fill(); ctx.stroke();
        // chest panel with blinking palette buttons
        ctx.fillStyle = '#E2E6F6'; ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.025;
        rrect(-0.24, 1.08, 0.48, 0.27, 0.07); ctx.fill(); ctx.stroke();
        var cols = [primary, accent, glow];
        for (var i = 0; i < 3; i++) {
          var bx = -0.13 + i * 0.13, by = 1.215, on = 0.5 + 0.5 * Math.sin(P.t * 0.012 + i * 2.1);
          ctx.fillStyle = cols[i]; ctx.strokeStyle = mixHex(cols[i], '#1A0A2A', 0.4); ctx.lineWidth = 0.018;
          ctx.beginPath(); ctx.arc(bx, by, 0.045, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.5 * on).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(bx - 0.014, by - 0.014, 0.016, 0, TAU); ctx.fill();
        }
        // round mission patch with a little gold star
        ctx.fillStyle = primary; ctx.strokeStyle = primDk; ctx.lineWidth = 0.02;
        ctx.beginPath(); ctx.arc(0.38, 1.44, 0.085, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFE066'; starPath(ctx, 0.38, 1.445, 0.058, 0, 0.5); ctx.fill();
      }
      function drawGlassBack() {
        var g = ctx.createRadialGradient(0.15, 0.2, 0.1, 0, 0, 1);
        g.addColorStop(0, hexA(glow, 0.05)); g.addColorStop(0.7, hexA(glow, 0.1)); g.addColorStop(1, hexA(glow, 0.3));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        ctx.fillStyle = '#CDD3EC'; ctx.beginPath(); ctx.ellipse(0, 0.8, 0.42, 0.13, 0, 0, TAU); ctx.fill();
      }
      function earPts(side, tw, hx) {
        var pvx = side * 0.42, pvy = -0.22, c = Math.cos(side * tw), sn = Math.sin(side * tw);
        function R(x, y) { var dx = side * x - pvx, dy = y - pvy; return [pvx + dx * c - dy * sn + hx, pvy + dx * sn + dy * c]; }
        return { O: R(0.66, -0.0), T: R(0.53, -0.78), I: R(0.15, -0.4), c1: R(0.71, -0.44), c2: R(0.3, -0.67) };
      }
      function earPath(E) {
        ctx.beginPath(); ctx.moveTo(E.O[0], E.O[1]);
        ctx.quadraticCurveTo(E.c1[0], E.c1[1], E.T[0], E.T[1]);
        ctx.quadraticCurveTo(E.c2[0], E.c2[1], E.I[0], E.I[1]);
        ctx.closePath();
      }
      function headPieces(ears, hx, mode) {
        // mode: 'stroke' | 'fill' — each piece separately so overlaps never cancel
        function done() { if (mode === 'stroke') ctx.stroke(); else ctx.fill(); }
        earPath(ears[0]); done(); earPath(ears[1]); done();
        ctx.beginPath(); ctx.ellipse(hx, 0.12, 0.68, 0.56, 0, 0, TAU); done();
        for (var sd = -1; sd <= 1; sd += 2) {   // fluffy cheek tufts
          ctx.beginPath(); ctx.moveTo(hx + sd * 0.6, 0.16); ctx.lineTo(hx + sd * 0.8, 0.29); ctx.lineTo(hx + sd * 0.61, 0.36); ctx.closePath(); done();
          ctx.beginPath(); ctx.moveTo(hx + sd * 0.56, 0.37); ctx.lineTo(hx + sd * 0.71, 0.5); ctx.lineTo(hx + sd * 0.46, 0.52); ctx.closePath(); done();
        }
        ctx.beginPath(); ctx.moveTo(hx - 0.09, -0.41); ctx.quadraticCurveTo(hx - 0.04, -0.52, hx + 0.04, -0.58);   // top tuft
        ctx.quadraticCurveTo(hx + 0.02, -0.5, hx + 0.08, -0.42); ctx.closePath(); done();
      }
      function drawEye(ex, ey, side, P, hp) {
        var fs = 1 - 0.2 * Math.max(0, side * P.look), big = 1 + 0.14 * P.wide;
        var rx = 0.122 * fs * big, ry = 0.148 * big;
        ctx.strokeStyle = EYEC;
        if (hp > 0.5) {                          // happy closed eye  ∩
          ctx.lineWidth = 0.045;
          ctx.beginPath(); ctx.arc(ex, ey + 0.06, 0.088 * fs, Math.PI + 0.45, TAU - 0.45); ctx.stroke();
          var ax = ex + side * 0.088 * fs * 0.9, ay = ey + 0.06 - 0.088 * 0.435;
          ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + side * 0.05, ay - 0.035); ctx.stroke();
          return;
        }
        var bl = Math.max(0.08, P.blink);
        ctx.save();
        ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry * bl, 0, 0, TAU);
        var g = ctx.createLinearGradient(0, ey - ry, 0, ey + ry);
        g.addColorStop(0, '#120A22'); g.addColorStop(0.55, '#2A1846'); g.addColorStop(1, '#4E3380');
        ctx.fillStyle = g; ctx.fill();
        ctx.clip();
        var px = P.look * 0.028;
        ctx.fillStyle = hexA(glow, 0.6);
        ctx.beginPath(); ctx.ellipse(ex + px, ey + ry * 0.66, rx * 0.72, ry * 0.36, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.ellipse(ex - rx * 0.28 + px, ey - ry * 0.34, rx * 0.42, ry * 0.33, -0.35, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + rx * 0.42 + px, ey + ry * 0.3, rx * 0.17, 0, TAU); ctx.fill();
        var tw = 0.55 + 0.45 * Math.sin(P.t * 0.012 + side * 1.7);
        sparkPath(ctx, ex + rx * 0.45 + px, ey - ry * 0.5, rx * 0.28 * tw); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 0.026;
        ctx.beginPath(); ctx.ellipse(ex, ey, rx * 1.03, ry * bl * 1.03, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        if (bl > 0.5) {                          // two little lashes at the outer corner
          var ca = side > 0 ? Math.PI * 1.85 : Math.PI * 1.15, cb = side > 0 ? Math.PI * 1.72 : Math.PI * 1.28;
          var x1 = ex + Math.cos(ca) * rx, y1 = ey + Math.sin(ca) * ry * bl, x2 = ex + Math.cos(cb) * rx, y2 = ey + Math.sin(cb) * ry * bl;
          ctx.lineWidth = 0.024;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + side * 0.055, y1 - 0.04);
          ctx.moveTo(x2, y2); ctx.lineTo(x2 + side * 0.035, y2 - 0.058); ctx.stroke();
        }
      }
      function drawHead(P) {
        var L = P.look, fx = L * 0.085, hx = L * 0.03;
        var ears = [earPts(-1, P.earTw, hx), earPts(1, P.earTw, hx)];
        ctx.strokeStyle = FUR.line; ctx.lineWidth = 0.055;
        headPieces(ears, hx, 'stroke');
        var g = ctx.createRadialGradient(hx - 0.22, -0.12, 0.05, hx, 0.12, 0.85);
        g.addColorStop(0, FUR.light); g.addColorStop(0.55, FUR.base); g.addColorStop(1, FUR.deep);
        ctx.fillStyle = g;
        headPieces(ears, hx, 'fill');
        // pink inner ears with a wisp of fluff
        for (var k = 0; k < 2; k++) {
          var E = ears[k], sd = k ? 1 : -1, gx = (E.O[0] + E.T[0] + E.I[0]) / 3, gy = (E.O[1] + E.T[1] + E.I[1]) / 3 + 0.04;
          var sh = function (p, f) { return [gx + (p[0] - gx) * f, gy + (p[1] - gy) * f]; };
          var inner = { O: sh(E.O, 0.55), T: sh(E.T, 0.62), I: sh(E.I, 0.55), c1: sh(E.c1, 0.58), c2: sh(E.c2, 0.58) };
          var eg = ctx.createLinearGradient(inner.T[0], inner.T[1], gx, gy + 0.12);
          eg.addColorStop(0, FUR.earDk); eg.addColorStop(1, FUR.ear);
          ctx.fillStyle = eg; earPath(inner); ctx.fill();
          ctx.strokeStyle = 'rgba(255,248,240,0.85)'; ctx.lineWidth = 0.018;
          ctx.beginPath(); ctx.moveTo(gx - sd * 0.02, gy + 0.08); ctx.quadraticCurveTo(gx + sd * 0.02, gy - 0.02, gx + sd * 0.0, gy - 0.1);
          ctx.moveTo(gx + sd * 0.05, gy + 0.07); ctx.quadraticCurveTo(gx + sd * 0.07, gy, gx + sd * 0.07, gy - 0.06); ctx.stroke();
        }
        // tabby stripes
        ctx.save(); ctx.beginPath(); ctx.ellipse(hx, 0.12, 0.68, 0.56, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = hexA(FUR.dark, 0.85);
        taper(fx - 0.15, -0.47, fx - 0.11, -0.26, 0.042);
        taper(fx, -0.5, fx, -0.21, 0.05);
        taper(fx + 0.15, -0.47, fx + 0.11, -0.26, 0.042);
        taper(hx - 0.72, 0.0, hx - 0.5, 0.05, 0.042); taper(hx - 0.72, 0.13, hx - 0.54, 0.15, 0.036);
        taper(hx + 0.72, 0.0, hx + 0.5, 0.05, 0.042); taper(hx + 0.72, 0.13, hx + 0.54, 0.15, 0.036);
        ctx.restore();
        // cream muzzle + chin
        ctx.fillStyle = FUR.cream;
        ctx.beginPath(); ctx.arc(fx - 0.105, 0.38, 0.135, 0, TAU); ctx.moveTo(fx + 0.24, 0.38); ctx.arc(fx + 0.105, 0.38, 0.135, 0, TAU);
        ctx.moveTo(fx + 0.12, 0.5); ctx.ellipse(fx, 0.5, 0.12, 0.08, 0, 0, TAU); ctx.fill();
        // blush
        ctx.fillStyle = 'rgba(255,105,150,0.45)';
        ctx.beginPath(); ctx.ellipse(fx - 0.42, 0.3, 0.1, 0.058, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(fx + 0.42, 0.3, 0.1, 0.058, 0, 0, TAU); ctx.fill();
        // eyes
        var ex = 0.245 * (1 - 0.08 * Math.abs(L));
        drawEye(fx - ex, 0.1, -1, P, P.eL);
        drawEye(fx + ex, 0.1, 1, P, P.eR);
        // nose
        var nx = fx, ny = 0.285;
        ctx.fillStyle = FUR.nose; ctx.strokeStyle = FUR.noseDk; ctx.lineWidth = 0.016;
        ctx.beginPath(); ctx.moveTo(nx - 0.058, ny - 0.03); ctx.quadraticCurveTo(nx, ny - 0.062, nx + 0.058, ny - 0.03);
        ctx.quadraticCurveTo(nx + 0.03, ny + 0.035, nx, ny + 0.04); ctx.quadraticCurveTo(nx - 0.03, ny + 0.035, nx - 0.058, ny - 0.03);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(nx - 0.018, ny - 0.024, 0.017, 0.01, -0.3, 0, TAU); ctx.fill();
        // mouth
        ctx.strokeStyle = MOUTHC; ctx.lineWidth = 0.026;
        if (P.mouth === 1) {                      // open happy smile with a tongue
          ctx.save();
          ctx.beginPath(); ctx.moveTo(nx - 0.088, ny + 0.078); ctx.quadraticCurveTo(nx, ny + 0.25, nx + 0.088, ny + 0.078);
          ctx.quadraticCurveTo(nx, ny + 0.105, nx - 0.088, ny + 0.078); ctx.closePath();
          ctx.fillStyle = '#7A2238'; ctx.fill(); ctx.clip();
          ctx.fillStyle = '#FF7C9C'; ctx.beginPath(); ctx.ellipse(nx, ny + 0.19, 0.06, 0.05, 0, 0, TAU); ctx.fill();
          ctx.restore();
        } else if (P.mouth === 2) {               // "oh!"
          ctx.fillStyle = '#7A2238'; ctx.beginPath(); ctx.ellipse(nx, ny + 0.13, 0.036, 0.046, 0, 0, TAU); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(nx, ny + 0.04); ctx.lineTo(nx, ny + 0.075);
        if (P.mouth !== 2) {
          ctx.moveTo(nx, ny + 0.075); ctx.arc(nx - 0.045, ny + 0.075, 0.045, 0, Math.PI * 0.95);
          ctx.moveTo(nx, ny + 0.075); ctx.arc(nx + 0.045, ny + 0.075, 0.045, Math.PI, Math.PI * 0.05, true);
        }
        ctx.stroke();
        // whiskers
        ctx.strokeStyle = 'rgba(255,250,240,0.92)'; ctx.lineWidth = 0.015;
        ctx.beginPath();
        for (var sd2 = -1; sd2 <= 1; sd2 += 2)
          for (var w = -1; w <= 1; w++) {
            var x0 = fx + sd2 * 0.27, y0 = 0.34 + w * 0.04, x1 = fx + sd2 * 0.8, y1 = 0.27 + w * 0.1;
            ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 0.035, x1, y1);
          }
        ctx.stroke();
      }
      var GL_A0 = 3.5, GL_A1 = 4.9;
      function drawGlassFront() {
        var g = ctx.createRadialGradient(0, 0, 0.8, 0, 0, 1);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, hexA(glow, 0.12)); g.addColorStop(1, 'rgba(235,245,255,0.42)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        // the big curved reflection, upper-left
        var ax = Math.cos(GL_A0) * 0.9, ay = Math.sin(GL_A0) * 0.9, bx = Math.cos(GL_A1) * 0.9, by = Math.sin(GL_A1) * 0.9;
        var am = (GL_A0 + GL_A1) / 2, mx = (ax + bx) / 2, my = (ay + by) / 2;
        var cxp = 2 * Math.cos(am) * 0.75 - mx, cyp = 2 * Math.sin(am) * 0.75 - my;
        var lg = ctx.createLinearGradient(ax, ay, bx, by);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.45, 'rgba(255,255,255,0.78)'); lg.addColorStop(1, 'rgba(255,255,255,0.06)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(0, 0, 0.9, GL_A0, GL_A1); ctx.quadraticCurveTo(cxp, cyp, ax, ay); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(0.3, -0.83, 0.045, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0.43, -0.77, 0.022, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.arc(0, 0, 0.88, 0.2, 0.95); ctx.stroke();
        ctx.strokeStyle = hexA(glow, 0.55); ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.018; ctx.stroke();
      }
      function drawCollar() {
        var g = ctx.createLinearGradient(-0.62, 0, 0.62, 0);
        g.addColorStop(0, '#A3ABCF'); g.addColorStop(0.32, '#FAFBFF'); g.addColorStop(0.7, '#D5DAEE'); g.addColorStop(1, '#8C95BE');
        ctx.fillStyle = g; ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.ellipse(0, 0.92, 0.62, 0.16, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = primary; ctx.lineWidth = 0.055;
        ctx.beginPath(); ctx.ellipse(0, 0.93, 0.53, 0.105, 0, 0.12, Math.PI - 0.12); ctx.stroke();
      }
      function drawArm(side, a, b, palm) {
        var sx = side * 0.5, sy = 1.04, L1 = 0.34, L2 = 0.3;
        var ex = sx + side * Math.sin(a) * L1, ey = sy + Math.cos(a) * L1;
        var a2 = a + b, dx = side * Math.sin(a2), dy = Math.cos(a2);
        var px = ex + dx * L2, py = ey + dy * L2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(px, py);
        ctx.strokeStyle = SUIT.line; ctx.lineWidth = 0.275; ctx.stroke();
        ctx.strokeStyle = SUIT.sleeve; ctx.lineWidth = 0.21; ctx.stroke();
        var c0x = ex + dx * L2 * 0.6, c0y = ey + dy * L2 * 0.6, c1x = ex + dx * L2 * 0.84, c1y = ey + dy * L2 * 0.84;
        ctx.beginPath(); ctx.moveTo(c0x, c0y); ctx.lineTo(c1x, c1y); ctx.lineCap = 'butt';
        ctx.strokeStyle = primDk; ctx.lineWidth = 0.262; ctx.stroke();
        ctx.strokeStyle = primary; ctx.lineWidth = 0.205; ctx.stroke();
        ctx.lineCap = 'round';
        var qx = px + dx * 0.06, qy = py + dy * 0.06, nx = -dy, ny = dx;
        ctx.fillStyle = FUR.light; ctx.strokeStyle = FUR.line; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.arc(qx, qy, 0.125, 0, TAU); ctx.fill(); ctx.stroke();
        if (palm) {                              // pink toe beans
          ctx.fillStyle = '#FF9DB8';
          ctx.beginPath(); ctx.ellipse(qx - dx * 0.025, qy - dy * 0.025, 0.055, 0.045, Math.atan2(dy, dx) + Math.PI / 2, 0, TAU); ctx.fill();
          for (var k = -1; k <= 1; k++) {
            ctx.beginPath(); ctx.arc(qx + dx * (0.065 + (k ? 0 : 0.018)) + nx * k * 0.058, qy + dy * (0.065 + (k ? 0 : 0.018)) + ny * k * 0.058, 0.025, 0, TAU); ctx.fill();
          }
        } else {
          ctx.lineWidth = 0.018; ctx.beginPath();
          for (var m = -1; m <= 1; m += 2) {
            var tx = qx + dx * 0.12 + nx * m * 0.035, ty = qy + dy * 0.12 + ny * m * 0.035;
            ctx.moveTo(tx, ty); ctx.lineTo(tx - dx * 0.05, ty - dy * 0.05);
          }
          ctx.stroke();
        }
      }
      function drawKitten(P) {
        ctx.save();
        ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.scale(P.sc, P.sc); ctx.translate(0, -PIV);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        drawPack(P);
        drawTail(P);
        drawLeg(-1, P.lL); drawLeg(1, P.lR);
        drawTorso(P);
        drawGlassBack();
        drawHead(P);
        drawGlassFront();
        drawCollar();
        if (P.mid) { ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); P.mid(); ctx.restore(); }
        drawArm(-1, P.aL, P.bL, false);
        drawArm(1, P.aR, P.bR, P.palm);
        ctx.restore();
      }

      // the golden star (with a sweet little face)
      function drawStarGlow(x, y, r, rot, a, t, boost) {
        if (a <= 0 || r <= 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDot(x, y, r * (3.4 + boost * 1.5), 0.9 * a);
        ctx.globalAlpha = 0.5 * a * (0.8 + 0.2 * Math.sin(t * 0.006));
        ctx.translate(x, y); ctx.rotate(t * 0.0007 + rot);
        var rr = r * (2.5 + boost);
        ctx.drawImage(raySpr, -rr, -rr, rr * 2, rr * 2);
        ctx.restore();
      }
      function drawBigStar(x, y, r, rot, a, t, happy, boost, noGlow) {
        if (a <= 0 || r <= 0) return;
        if (!noGlow) drawStarGlow(x, y, r, rot, a, t, boost);
        else { ctx.globalCompositeOperation = 'lighter'; glowDot(x, y, r * 1.9, 0.3 * a); ctx.globalCompositeOperation = 'source-over'; }
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        var g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
        g.addColorStop(0, '#FFFBE0'); g.addColorStop(0.5, '#FFE066'); g.addColorStop(1, '#F7A928');
        ctx.fillStyle = g; ctx.strokeStyle = '#E08A1E'; ctx.lineWidth = r * 0.13;
        starPath(ctx, 0, 0, r, 0, 0.52); ctx.stroke(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.36, r * 0.16, r * 0.075, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,110,0.5)';
        ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.16, r * 0.085, r * 0.05, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.16, r * 0.085, r * 0.05, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8A4E0E'; ctx.fillStyle = '#6A3A08'; ctx.lineWidth = r * 0.055;
        if (happy) {
          ctx.beginPath(); ctx.arc(-r * 0.17, r * 0.05, r * 0.07, Math.PI + 0.4, TAU - 0.4); ctx.stroke();
          ctx.beginPath(); ctx.arc(r * 0.17, r * 0.05, r * 0.07, Math.PI + 0.4, TAU - 0.4); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.ellipse(-r * 0.16, r * 0.0, r * 0.05, r * 0.065, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(r * 0.16, r * 0.0, r * 0.05, r * 0.065, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath(); ctx.arc(-r * 0.175, -r * 0.022, r * 0.02, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(r * 0.145, -r * 0.022, r * 0.02, 0, TAU); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.09, 0.35, Math.PI - 0.35); ctx.stroke();
        ctx.restore();
      }
      function drawPuffs(t) {
        for (var i = 0; i < puffs.length; i++) {
          var p = puffs[i], age = t - p.te;
          if (age < 0 || age > p.life) continue;
          if (p.o === null) {
            var Pe = pose(p.te);
            if (Pe.jet < p.th * 0.9 + 0.08) { p.o = false; continue; }
            var nz = toWorld(Pe, p.side * 0.63, 1.98), c = Math.cos(Pe.rot), sn = Math.sin(Pe.rot);
            var lx = p.side * 0.32 + p.ang, ly = 1, ll = Math.sqrt(lx * lx + ly * ly);
            var spd = Pe.sc * 1.15 * p.sp * (0.55 + 0.45 * Pe.jet);
            p.o = { x: nz.x, y: nz.y, vx: (lx * c - ly * sn) / ll * spd, vy: (lx * sn + ly * c) / ll * spd, k: Pe.jet, sc: Pe.sc };
          }
          if (!p.o) continue;
          var q = age / p.life, d = age / 1000 * (1 - 0.45 * q);
          var r = p.o.sc * (0.08 + 0.26 * easeOut(q)) * p.sz * (0.6 + 0.4 * p.o.k);
          ctx.globalAlpha = 0.9 * (1 - q * q) * Math.min(1, age / 50) * (0.6 + 0.4 * p.o.k);
          ctx.drawImage(puffSpr, p.o.x + p.o.vx * d - r, p.o.y + p.o.vy * d - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
      }
      function drawRainbow(t) {
        if (!isSuper || t < tR0 || t > tR1 + 320) return;
        var N = 30, DTk = 15, pts = [], i, k;
        for (k = 0; k <= N; k++) {
          var tk = Math.max(tR0, Math.min(tR1, t - k * DTk)), Pk = pose(tk), wpt = toWorld(Pk, 0, SEATY);
          pts.push(wpt.x, wpt.y);
        }
        var hx = pts[0], hy = pts[1], ex = pts[N * 2], ey = pts[N * 2 + 1];
        if (Math.abs(hx - ex) + Math.abs(hy - ey) < 2) return;
        var fade = 1 - clamp01((t - tR1) / 320), bw = SEATR * s * RIDE_SC * 1.9 / 6;
        var nrm = [], lnx = 0, lny = -1;
        for (k = 0; k <= N; k++) {
          var a = Math.max(0, k - 1), b = Math.min(N, k + 1), tx = pts[a * 2] - pts[b * 2], ty = pts[a * 2 + 1] - pts[b * 2 + 1], tl = Math.sqrt(tx * tx + ty * ty);
          if (tl > 0.01) { lnx = -ty / tl; lny = tx / tl; }
          nrm.push(lnx, lny);
        }
        // soft white glow under the rainbow
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var wg = ctx.createLinearGradient(hx, hy, ex, ey);
        wg.addColorStop(0, 'rgba(255,255,255,' + (0.22 * fade).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = wg; ctx.lineWidth = bw * 8;
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (k = 1; k <= N; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]); ctx.stroke();
        ctx.restore();
        for (i = 0; i < 6; i++) {
          var gr = ctx.createLinearGradient(hx, hy, ex, ey);
          gr.addColorStop(0, hexA(RAINBOW[i], 0.95 * fade)); gr.addColorStop(0.7, hexA(RAINBOW[i], 0.5 * fade)); gr.addColorStop(1, hexA(RAINBOW[i], 0));
          ctx.fillStyle = gr; ctx.beginPath();
          for (k = 0; k <= N; k++) {
            var tp = 1 - 0.7 * Math.pow(k / N, 1.2), o1 = (i - 3) * bw * tp;
            if (k) ctx.lineTo(pts[k * 2] + nrm[k * 2] * o1, pts[k * 2 + 1] + nrm[k * 2 + 1] * o1);
            else ctx.moveTo(pts[0] + nrm[0] * o1, pts[1] + nrm[1] * o1);
          }
          for (k = N; k >= 0; k--) {
            var tp2 = 1 - 0.7 * Math.pow(k / N, 1.2), o2 = (i - 2) * bw * tp2 + (i < 5 ? 0.6 : 0);
            ctx.lineTo(pts[k * 2] + nrm[k * 2] * o2, pts[k * 2 + 1] + nrm[k * 2 + 1] * o2);
          }
          ctx.closePath(); ctx.fill();
        }
      }
      function drawTrailSparks(t) {
        if (!isSuper) return;
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < tSparks.length; i++) {
          var p = tSparks[i], age = t - p.te;
          if (age < 0 || age > p.life) continue;
          if (!p.o) {
            var Pe = pose(p.te), w = toWorld(Pe, 0, SEATY), R = rideState(p.te), off = p.off * SEATR * Pe.sc * 0.95;
            p.o = { x: w.x - R.dyN * off, y: w.y + R.dxN * off };
          }
          var q = age / p.life, x = p.o.x + p.vx * s * age / 1000, y = p.o.y + p.vy * s * age / 1000;
          var a = (1 - q) * (0.65 + 0.35 * Math.sin(age * 0.03 + p.ph));
          ctx.fillStyle = hexA(p.col, a);
          sparkPath(ctx, x, y, s * p.sz * (1 - q * 0.5)); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      function drawShooter(sh, t) {
        var q = (t - ms(sh.t0)) / sh.d;
        if (q <= 0 || q >= 1) return;
        var x0 = sh.x0 * W, y0 = sh.y0 * H, x1 = sh.x1 * W, y1 = sh.y1 * H;
        var hx = lerp(x0, x1, q), hy = lerp(y0, y1, q), dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var a = Math.sin(Math.PI * q), tl = Math.min(len * 0.5, 170 * unit + 40) * (0.4 + 0.6 * a);
        var g = ctx.createLinearGradient(hx - dx / len * tl, hy - dy / len * tl, hx, hy);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,250,230,' + (0.9 * a).toFixed(3) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 2.4 * unit + 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - dx / len * tl, hy - dy / len * tl); ctx.lineTo(hx, hy); ctx.stroke();
        glowDot(hx, hy, 13 * unit + 6, a);
      }

      var raf = 0, killed = false, t0 = performance.now();
      function frame(now) {
        if (killed) return;
        var t = now - t0, gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        var appear = clamp01(t / 350), i, k;
        var land = W > H;

        // soft nebula washes (palette) — translucent, never an opaque background
        ctx.globalAlpha = 0.12 * appear; ctx.drawImage(halo, -W * 0.2, H * 0.35, W * 0.85, W * 0.85);
        ctx.globalAlpha = 0.09 * appear; ctx.drawImage(halo, W * 0.5, -H * 0.15, W * 0.7, W * 0.7);
        ctx.globalAlpha = 1;
        // twinkling starfield
        for (i = 0; i < bgStars.length; i++) {
          var st = bgStars[i], tk = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t / 1000 * st.rate + st.ph)), sa = tk * appear * st.a;
          var sx = st.x * W, sy = st.y * H;
          if (st.big) {
            glowDot(sx, sy, st.r * 6 * unit + 3, sa * 0.6);
            ctx.fillStyle = hexA(st.col, sa); sparkPath(ctx, sx, sy, (st.r * 3.2 * unit + 2) * (0.7 + 0.3 * tk)); ctx.fill();
          } else {
            ctx.fillStyle = hexA(st.col, sa * 0.85);
            ctx.beginPath(); ctx.arc(sx, sy, st.r * unit + 0.5, 0, TAU); ctx.fill();
          }
        }
        // the distant ringed planet + crescent moon
        var pIn = easeOut(clamp01((t - 60) / 500));
        if (pIn > 0) {
          var plx = W * (land ? 0.12 : 0.17), ply = H * (land ? 0.37 : 0.3) + Math.sin(t * 0.0013) * 4 * unit;
          ctx.globalAlpha = 0.88 * pIn;
          ctx.drawImage(planetS.c, plx - planetS.ext, ply - planetS.ext, planetS.ext * 2, planetS.ext * 2);
          var mnx = W * (land ? 0.88 : 0.84), mny = H * (land ? 0.3 : 0.27) + Math.sin(t * 0.0011 + 1) * 3 * unit;
          ctx.globalAlpha = 0.92 * pIn;
          ctx.drawImage(moonS.c, mnx - moonS.ext, mny - moonS.ext, moonS.ext * 2, moonS.ext * 2);
          ctx.globalAlpha = 1;
        }
        for (i = 0; i < shooters.length; i++) drawShooter(shooters[i], t);

        // super: little planets orbit the praise (dotted orbit + depth scaling)
        if (isSuper) {
          var oq = clamp01((t - ms(T.orbit)) / 450);
          if (oq > 0) {
            var otx = W / 2, oty = H * 0.175, orx = Math.min(W * 0.4, s * 3.6), ory = H * 0.078;
            ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 * oq).toFixed(3) + ')'; ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.ellipse(otx, oty, orx * easeOut(oq), ory * easeOut(oq), 0, 0, TAU); ctx.stroke();
            ctx.restore();
            var ord = [];
            for (i = 0; i < orbiters.length; i++) {
              var oa = orbiters[i].ph + (t - ms(T.orbit)) * 0.0017, dep = 0.5 + 0.5 * Math.sin(oa);
              ord.push({ x: otx + Math.cos(oa) * orx, y: oty + Math.sin(oa) * ory, d: dep, i: orbiters[i].i });
            }
            ord.sort(function (A, B) { return A.d - B.d; });
            for (i = 0; i < ord.length; i++) {
              var O = ord[i], ms0 = minis[O.i], osc = (0.65 + 0.5 * O.d) * easeOutBack(oq);
              if (osc <= 0) continue;
              ctx.globalAlpha = 0.7 + 0.3 * O.d;
              ctx.drawImage(ms0.c, O.x - ms0.ext * osc, O.y - ms0.ext * osc, ms0.ext * 2 * osc, ms0.ext * 2 * osc);
            }
            ctx.globalAlpha = 1;
          }
        }

        // super: rainbow comet tail behind the ride
        drawRainbow(t);

        var P = pose(t);
        drawPuffs(t);
        // a soft halo behind the kitten so she glows over the dark
        var hr = 2.5 * P.sc, hc = toWorld(P, 0, 0.55);
        ctx.globalAlpha = 0.42 * appear; ctx.drawImage(halo, hc.x - hr, hc.y - hr, hr * 2, hr * 2); ctx.globalAlpha = 1;

        // ─── the star ───
        var starAlive = t < tB, freeStar = null, held = null;
        if (starAlive) {
          var qi = clamp01((t - ms(T.starIn[0])) / (ms(T.starIn[1]) - ms(T.starIn[0])));
          var wink = (t - tSpot + 120) / 380, boost = wink > 0 && wink < 1 ? Math.sin(Math.PI * wink) * 1.2 : 0;
          if (t < tH0 && qi > 0) {
            var home = starHome(), S0x = home.x, S0y = home.y, hux = W / 2, huy = CY() + (HUGY - PIV) * s;
            var qm = clamp01((t - tSw0 - (tH0 - tSw0) * 0.25) / ((tH0 - tSw0) * 0.75)), em = easeInOut(qm);
            var bob = Math.sin(t * 0.004) * 0.08 * s * (1 - em);
            freeStar = { x: lerp(S0x, hux, em) + Math.sin(Math.PI * em) * 0.25 * s, y: lerp(S0y, huy, em) + bob - Math.sin(Math.PI * em) * 0.2 * s,
                         r: s * lerp(0.34, HUGR, em) * easeOutBack(qi), a: clamp01(qi * 3), rot: Math.sin(t * 0.003) * 0.15, boost: boost, happy: false };
          } else if (t >= tH0) {
            var ly = HUGY, lr = HUGR;
            if (isSuper && t >= tM0) { var mq = smooth((t - tM0) / (tR0 - tM0)); ly = lerp(HUGY, SEATY, mq); lr = lerp(HUGR, SEATR, mq); }
            var charge = smooth((t - (tB - 220)) / 220);
            var hp = toWorld(P, 0, ly);
            held = { x: hp.x, y: hp.y, r: lr * P.sc * (1 + 0.06 * Math.sin(t * 0.012) + 0.18 * charge), a: 1, rot: P.rot + Math.sin(t * 0.005) * 0.1,
                     boost: 0.4 + charge * 1.4, happy: true };
          }
        }
        // glows sit BEHIND her so they never wash out the suit and face
        if (held) {
          drawStarGlow(held.x, held.y, held.r, held.rot, held.a, t, held.boost);
          P.mid = function () { drawBigStar(held.x, held.y, held.r, held.rot, held.a, t, held.happy, held.boost, true); };
        }
        var bt = t - tB, Pb = null, bc = null;
        if (bt >= 0) {
          Pb = pose(tB); bc = toWorld(Pb, 0, isSuper ? 1.25 : HUGY);
          var fq = bt / (isSuper ? 650 : 480);
          if (fq < 1) {
            ctx.globalCompositeOperation = 'lighter';
            glowDot(bc.x, bc.y, s * (0.9 + (isSuper ? 3.2 : 2.2) * easeOut(fq)), 0.95 * (1 - fq));
            ctx.strokeStyle = hexA(accent, 0.7 * (1 - fq)); ctx.lineWidth = (5 * (1 - fq) + 1) * unit + 1;
            ctx.beginPath(); ctx.arc(bc.x, bc.y, s * (0.3 + (isSuper ? 3.0 : 2.2) * easeOut(fq)), 0, TAU); ctx.stroke();
            ctx.strokeStyle = hexA(glow, 0.5 * (1 - fq)); ctx.lineWidth = 2 * unit + 1;
            ctx.beginPath(); ctx.arc(bc.x, bc.y, s * (0.2 + (isSuper ? 2.2 : 1.6) * easeOut(fq)), 0, TAU); ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        drawKitten(P);
        if (freeStar) drawBigStar(freeStar.x, freeStar.y, freeStar.r, freeStar.rot, freeStar.a, t, false, freeStar.boost);

        // "oh!" — little surprise marks when she spots the star
        var sq = (t - tSpot) / 460;
        if (sq > 0 && sq < 1) {
          var o = toWorld(P, 0.7, -0.95), ea = easeOut(sq);
          ctx.strokeStyle = hexA(accent, 1 - sq); ctx.lineWidth = 3.2 * unit + 1.2; ctx.lineCap = 'round';
          ctx.beginPath();
          for (k = 0; k < 3; k++) {
            var ang = -2.0 + k * 0.55, r0 = 0.12 * s + ea * 0.08 * s, r1 = r0 + 0.2 * s * (0.6 + 0.4 * ea);
            ctx.moveTo(o.x + Math.cos(ang) * r0, o.y + Math.sin(ang) * r0); ctx.lineTo(o.x + Math.cos(ang) * r1, o.y + Math.sin(ang) * r1);
          }
          ctx.stroke();
        }

        drawTrailSparks(t);

        // ─── the burst ───
        if (bc) {
          ctx.globalCompositeOperation = 'lighter';
          for (i = 0; i < dust.length; i++) {
            var D = dust[i], dq = (bt - D.dl) / 900;
            if (dq <= 0 || dq >= 1) continue;
            var dr = s * D.sp * easeOut(dq);
            ctx.fillStyle = hexA(D.col, 1 - dq);
            sparkPath(ctx, bc.x + Math.cos(D.ang) * dr, bc.y + Math.sin(D.ang) * dr, s * D.sz * (1 - dq * 0.5)); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          if (!isSuper) {
            // ring of little stars that settles around her and twinkles
            var kcx = W / 2, kcy = CY() - 0.05 * s, rrx = Math.min(2.05 * s, W * 0.45), rry = 1.85 * s;
            for (i = 0; i < ring.length; i++) {
              var Rg = ring[i], q2 = clamp01((bt - Rg.dl) / 650), e3 = easeOutBack(q2);
              if (q2 <= 0) continue;
              var ang2 = Rg.ang + bt * 0.00035;
              var x = lerp(bc.x, kcx + Math.cos(ang2) * rrx, e3), y = lerp(bc.y, kcy + Math.sin(ang2) * rry, e3);
              var sz = s * Rg.sz * (0.45 + 0.55 * clamp01(q2 * 2)) * (0.82 + 0.22 * Math.sin(t * 0.01 + Rg.tw));
              ctx.globalCompositeOperation = 'lighter'; glowDot(x, y, sz * 2.6, 0.55); ctx.globalCompositeOperation = 'source-over';
              drawSprite(Rg.spr, x, y, sz, Rg.spin * bt / 1000 * (1 - 0.75 * clamp01(q2)), 1);
            }
          } else {
            // the big finale: stars AND hearts fly out across the sky
            for (i = 0; i < finale.length; i++) {
              var Fn = finale[i], q3 = clamp01((bt - Fn.dl) / 900);
              if (q3 <= 0) continue;
              var e4 = easeOut(q3), fd = s * Fn.dist * e4, ang3 = Fn.ang + bt * 0.0002;
              var fx2 = bc.x + Math.cos(ang3) * fd, fy2 = bc.y + Math.sin(ang3) * fd * 0.9 - (Fn.heart ? e4 * 0.25 * s : 0);
              var fsz = s * Fn.sz * (0.4 + 0.6 * clamp01(q3 * 2.5)) * (0.85 + 0.2 * Math.sin(t * 0.011 + Fn.tw));
              var fa = 1 - clamp01((bt - 650) / 500) * 0.25;
              if (!Fn.heart) { ctx.globalCompositeOperation = 'lighter'; glowDot(fx2, fy2, fsz * 2.4, 0.5 * fa); ctx.globalCompositeOperation = 'source-over'; }
              drawSprite(Fn.spr, fx2, fy2, fsz, Fn.heart ? Math.sin(bt * 0.006 + Fn.tw) * 0.25 : Fn.spin * bt / 1000, fa);
            }
          }
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq2 = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq2 > 0 ? easeOutBack(pq2) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq2 * 2, 1) * gFade);
        }
        if (t < dur) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, W, H);
      }
      raf = requestAnimationFrame(frame);

      return function cleanup() {
        killed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', fit);
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        if (txt.parentNode) txt.parentNode.removeChild(txt);
        if (ptsEl && ptsEl.parentNode) ptsEl.parentNode.removeChild(ptsEl);
        spr = null; halo = null; puffSpr = null; raySpr = null; planetS = null; moonS = null; minis = []; starSprs = []; heartSprs = [];
      };
    }
  });
})();
