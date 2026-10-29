/* success-cupcake-sprinkles.js — מסך הצלחה: קַאפְּקֵייק וְסוּכָּרִיּוֹת 🧁
   קאפקייק גדול וחמוד (פנים אל הצופה: שתי עיניים, חיוך) נופל פנימה ומתכווץ בנחיתה,
   שקית זילוף מזלפת עליו ספירלה של קצפת ורודה מלמטה למעלה, סוכריות צבעוניות
   בכל צבעי הקשת יורדות כגשם, קופצות מהקצפת ונדבקות אליה, ודובדבן אדום נוחת
   למעלה עם "פלופ" מתכווץ — והקאפקייק פותח פה בחיוך גדול.
   בסופר: שלושה קאפקייקס בשורה (ורוד, לילך ומנטה), על האמצעי נעוץ נר מפוספס
   שנדלק בניצוץ ומנצנץ, ומטר קונפטי של סוכריות מתפזר על כל המסך.
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
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function mixHex(h1, h2, t) {
    var r1 = parseInt(h1.slice(1, 3), 16), g1 = parseInt(h1.slice(3, 5), 16), b1 = parseInt(h1.slice(5, 7), 16);
    var r2 = parseInt(h2.slice(1, 3), 16), g2 = parseInt(h2.slice(3, 5), 16), b2 = parseInt(h2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t) & 255, g = Math.round(g1 + (g2 - g1) * t) & 255, b = Math.round(b1 + (b2 - b1) * t) & 255;
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  function sparkPath(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.closePath();
  }
  // damped squash wobble: 0 at impact, positive = squashed
  function wob(dt, k) { return dt <= 0 ? 0 : Math.sin(dt * 0.026) * Math.exp(-dt * (k || 0.0065)); }

  var RAINBOW = ['#FF5A6E', '#FFA03D', '#FFE14D', '#5ED66E', '#4DB8FF', '#A97CFF', '#FF7BD0'];
  var FROST = {
    pink:  { base: '#FF8CC6', light: '#FFE0F0', dark: '#D94E92' },
    lilac: { base: '#C7A0FF', light: '#F1E6FF', dark: '#8E5EDB' },
    mint:  { base: '#86E6C0', light: '#E4FFF3', dark: '#3FB58A' }
  };

  // ─── piped frosting: a rising spiral of blobs (cupcake-local units, base of liner = 0) ───
  var PATH = (function () {
    var pts = [], N = 180, TURNS = 3.1;
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1);
      var th = -Math.PI / 2 + u * TURNS * TAU;
      var R = 0.6 * Math.pow(1 - u, 0.9) + 0.02;
      var yb = -0.95 - 0.88 * Math.pow(u, 0.95);
      var br = 0.2 - 0.11 * u;
      pts.push({ x: R * Math.cos(th), y: yb + R * 0.3 * Math.sin(th), r: br, f: Math.sin(th) });
    }
    return pts;
  })();
  // top / bottom envelope of the frosting for sprinkle hits
  var ENV_N = 69, ENV_X0 = -0.85, ENV_DX = 1.7 / (ENV_N - 1), ENV_T = [], ENV_B = [];
  (function () {
    for (var i = 0; i < ENV_N; i++) {
      var x = ENV_X0 + i * ENV_DX, top = 9, bot = -9;
      for (var j = 0; j < PATH.length; j++) {
        var p = PATH[j], d = x - p.x;
        if (Math.abs(d) >= p.r) continue;
        var h = Math.sqrt(p.r * p.r - d * d);
        if (p.y - h < top) top = p.y - h;
        if (p.y + h > bot) bot = p.y + h;
      }
      ENV_T.push(top); ENV_B.push(bot);
    }
  })();
  function envAt(arr, x) {
    var f = (x - ENV_X0) / ENV_DX, i = Math.floor(f);
    if (i < 0 || i >= ENV_N - 1) return null;
    var a = arr[i], b = arr[i + 1];
    if (a === 9 || b === 9 || a === -9 || b === -9) return null;
    return lerp(a, b, f - i);
  }
  var TOP_Y = Math.min.apply(null, ENV_T);

  window.SUCCESS.styles.push({
    name: 'cupcake-sprinkles',
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
      var praise  = opts.praise || 'כָּל הַכָּבוֹד!';

      // ─── canvas, DPR-aware, re-fitted on resize ───
      var cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
      root.appendChild(cv);
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, unit = 1;
      function fit() {
        W = root.clientWidth || window.innerWidth || 342;
        H = root.clientHeight || window.innerHeight || 455;
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(W * DPR));
        cv.height = Math.max(1, Math.round(H * DPR));
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        unit = Math.min(W, H) / 800;
      }
      fit();
      window.addEventListener('resize', fit);

      // frosting blob sprites (off-DOM canvases)
      function blobSprite(F) {
        var c = document.createElement('canvas'); c.width = c.height = 96;
        var g = c.getContext('2d');
        var gr = g.createRadialGradient(34, 30, 3, 48, 48, 47);
        gr.addColorStop(0, F.light); gr.addColorStop(0.42, F.base); gr.addColorStop(0.9, F.dark); gr.addColorStop(1, F.dark);
        g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 46, 0, TAU); g.fill();
        g.strokeStyle = hexA(F.dark, 0.9); g.lineWidth = 2.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(33, 27, 12, 6, -0.6, 0, TAU); g.fill();
        return c;
      }
      var sprites = { pink: blobSprite(FROST.pink), lilac: blobSprite(FROST.lilac), mint: blobSprite(FROST.mint) };

      // ─── timeline (fractions of dur) ───
      var T = isSuper
        ? { drop: [0.0, 0.1], pipe: [0.1, 0.33], spr: [0.24, 0.48], top: [0.46, 0.52, 0.5], light: 0.6, conf: 0.63, txt: 0.27 }
        : { drop: [0.0, 0.13], pipe: [0.12, 0.42], spr: [0.3, 0.56], top: [0.64], light: null, conf: null, txt: 0.32 };
      function ms(f) { return f * dur; }

      var cakes = [];
      if (isSuper) {
        cakes.push({ off: -1, sc: 0.78, frost: 'lilac', liner: glow, topper: 'cherry', tTop: ms(T.top[0]), delay: 140 });
        cakes.push({ off: 0, sc: 1, frost: 'pink', liner: primary, topper: 'candle', tTop: ms(T.top[2]), delay: 0 });
        cakes.push({ off: 1, sc: 0.78, frost: 'mint', liner: accent, topper: 'cherry', tTop: ms(T.top[1]), delay: 260 });
      } else {
        cakes.push({ off: 0, sc: 1, frost: 'pink', liner: primary, topper: 'cherry', tTop: ms(T.top[0]), delay: 0 });
      }
      cakes.forEach(function (c) {
        c.lA = c.liner; c.lB = mixHex(c.liner, '#FFFFFF', 0.55);
        c.tLand = ms(T.drop[1]) + c.delay;
        c.sprinkles = [];
        var n = isSuper ? (c.sc < 1 ? 22 : 30) : 44;
        for (var i = 0; i < n; i++) {
          var x = rnd(-1, 1); x = x * Math.abs(x) * 0.25 + x * 0.65;     // denser in the middle
          c.sprinkles.push({ t0: lerp(ms(T.spr[0]), ms(T.spr[1]), i / n) + rnd(-60, 60) + c.delay * 0.5,
            x: x, y: 0, vx: rnd(-0.3, 0.3), vy: rnd(1.5, 3.5), rot: rnd(0, TAU), vr: rnd(-9, 9),
            col: RAINBOW[i % RAINBOW.length], st: -1, b: 0, depth: rnd(0.04, 0.85), hitY: 0, a: 1 });
        }
      });

      // background twinkles
      var bgStars = [];
      for (var bs = 0; bs < (isSuper ? 30 : 22); bs++)
        bgStars.push({ x: Math.random(), y: Math.random() * 0.62, tw: Math.random() * TAU, rate: 2 + Math.random() * 4,
                       size: 0.8 + Math.random() * 1.5, color: bs % 4 === 0 ? glow : bs % 5 === 0 ? accent : '#FFFFFF' });
      // super: confetti sprinkles from the candle all over the screen
      var conf = [];
      if (isSuper) {
        for (var ci = 0; ci < 150; ci++) {
          var ca = -Math.PI / 2 + rnd(-1.6, 1.6), cs = rnd(0.5, 1.6);
          conf.push({ a: ca, sp: cs, rot: rnd(0, TAU), vr: rnd(-8, 8), col: RAINBOW[ci % RAINBOW.length],
                      star: ci % 6 === 0, delay: rnd(0, 260), len: rnd(0.8, 1.3), sway: rnd(0, TAU) });
        }
      }

      // ─── praise + points ───
      var txt = document.createElement('div');
      txt.dir = 'rtl';
      txt.textContent = praise;
      txt.style.cssText =
        'position:absolute;left:50%;top:13%;transform:translate(-50%,-50%) scale(0);opacity:0;' +
        'font-weight:900;white-space:nowrap;text-align:center;will-change:transform,opacity;' +
        'color:' + textCol + ';font-size:' + (isSuper ? 'clamp(34px,8vw,84px)' : 'clamp(28px,5.6vw,58px)') + ';' +
        'text-shadow:0 0 18px ' + hexA(primary, 0.95) + ',0 0 46px ' + hexA('#FF8CC6', 0.6) + ',0 2px 5px rgba(0,0,0,.45)';
      root.appendChild(txt);
      var txtAt = ms(T.txt);
      var ptsEl = null;
      if (typeof opts.points === 'number') {
        ptsEl = document.createElement('div');
        ptsEl.dir = 'rtl';
        ptsEl.textContent = '+' + opts.points + ' ⭐';
        ptsEl.style.cssText =
          'position:absolute;left:50%;top:calc(13% + 8.5%);transform:translate(-50%,-50%) scale(0);opacity:0;' +
          'font-weight:900;white-space:nowrap;will-change:transform,opacity;color:' + accent + ';' +
          'font-size:clamp(20px,3.5vw,34px);text-shadow:0 0 14px ' + hexA(accent, 0.8) + ',0 2px 4px rgba(0,0,0,.45)';
        root.appendChild(ptsEl);
      }

      // ─── drawing helpers (cupcake-local units) ───
      function drawPlate() {
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.beginPath(); ctx.ellipse(0, 0.07, 0.86, 0.14, 0, 0, TAU); ctx.fill();
        var g = ctx.createLinearGradient(0, -0.1, 0, 0.14);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D9D2EE');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.8, 0.12, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(glow, 0.7); ctx.lineWidth = 0.022; ctx.stroke();
        ctx.strokeStyle = 'rgba(160,150,200,.5)'; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.ellipse(0, 0.0, 0.55, 0.075, 0, 0, TAU); ctx.stroke();
      }
      function linerPath() {
        ctx.beginPath();
        ctx.moveTo(-0.6, -0.76); ctx.lineTo(0.6, -0.76);
        ctx.lineTo(0.46, -0.02); ctx.quadraticCurveTo(0, 0.07, -0.46, -0.02); ctx.closePath();
      }
      function drawLiner(c) {
        var n = 10;
        ctx.save(); linerPath(); ctx.clip();
        for (var i = 0; i < n; i++) {
          var a0 = i / n, a1 = (i + 1) / n;
          ctx.fillStyle = i % 2 ? c.lB : c.lA;
          ctx.beginPath();
          ctx.moveTo(lerp(-0.6, 0.6, a0), -0.8); ctx.lineTo(lerp(-0.6, 0.6, a1), -0.8);
          ctx.lineTo(lerp(-0.46, 0.46, a1), 0.1); ctx.lineTo(lerp(-0.46, 0.46, a0), 0.1); ctx.closePath(); ctx.fill();
        }
        var sh = ctx.createLinearGradient(-0.6, 0, 0.6, 0);
        sh.addColorStop(0, 'rgba(40,10,60,.38)'); sh.addColorStop(0.3, 'rgba(255,255,255,.12)');
        sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(40,10,60,.42)');
        ctx.fillStyle = sh; ctx.fillRect(-0.7, -0.9, 1.4, 1.1);
        ctx.restore();
        ctx.strokeStyle = hexA(mixHex(c.lA, '#000000', 0.45), 0.9); ctx.lineWidth = 0.03;
        linerPath(); ctx.stroke();
      }
      function drawFace(c, t) {
        var happy = t > c.tTop + 150;
        var blinkQ = (t - c.tLand - 380) / 160;
        var bl = blinkQ > 0 && blinkQ < 1 ? Math.max(0.1, Math.abs(Math.cos(blinkQ * Math.PI))) : 1;
        ctx.lineCap = 'round';
        // blush
        ctx.fillStyle = 'rgba(255,120,160,.55)';
        ctx.beginPath(); ctx.ellipse(-0.32, -0.3, 0.075, 0.045, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.32, -0.3, 0.075, 0.045, 0, 0, TAU); ctx.fill();
        // two eyes (facing the viewer)
        for (var e = -1; e <= 1; e += 2) {
          var ex = e * 0.19, ey = -0.43;
          if (happy) {
            ctx.strokeStyle = '#2A1530'; ctx.lineWidth = 0.035;
            ctx.beginPath(); ctx.arc(ex, ey + 0.03, 0.065, Math.PI + 0.3, TAU - 0.3); ctx.stroke();
          } else {
            ctx.fillStyle = '#2A1530';
            ctx.beginPath(); ctx.ellipse(ex, ey, 0.06, 0.075 * bl, 0, 0, TAU); ctx.fill();
            if (bl > 0.5) {
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath(); ctx.arc(ex - 0.02, ey - 0.028, 0.022, 0, TAU); ctx.fill();
              ctx.beginPath(); ctx.arc(ex + 0.022, ey + 0.025, 0.011, 0, TAU); ctx.fill();
            }
          }
        }
        // mouth: closed smile → open happy mouth (a real gap: rosy inside, tongue, dark only deep at the top)
        var open = clamp01((t - c.tTop - 60) / 180);
        if (open <= 0) {
          ctx.strokeStyle = '#2A1530'; ctx.lineWidth = 0.03;
          ctx.beginPath(); ctx.arc(0, -0.31, 0.09, 0.35, Math.PI - 0.35); ctx.stroke();
        } else {
          var mw = 0.11, mh = 0.11 * easeOutBack(open), my = -0.27;
          ctx.save();
          ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + 0.012, mw, my);
          ctx.bezierCurveTo(mw, my + mh * 1.1, -mw, my + mh * 1.1, -mw, my); ctx.closePath();
          ctx.fillStyle = '#B9406A'; ctx.fill();
          ctx.clip();
          ctx.fillStyle = '#5A1530';
          ctx.beginPath(); ctx.ellipse(0, my + 0.005, mw * 0.55, mh * 0.32, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#FF8DB0';
          ctx.beginPath(); ctx.ellipse(0, my + mh * 0.95, mw * 0.7, mh * 0.45, 0, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = '#2A1530'; ctx.lineWidth = 0.022;
          ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + 0.012, mw, my);
          ctx.bezierCurveTo(mw, my + mh * 1.1, -mw, my + mh * 1.1, -mw, my); ctx.closePath(); ctx.stroke();
        }
      }
      function drawDome() {
        var g = ctx.createLinearGradient(0, -1.0, 0, -0.65);
        g.addColorStop(0, '#E0A36A'); g.addColorStop(1, '#A8693A');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -0.8, 0.66, 0.2, 0, Math.PI, TAU); ctx.lineTo(0.6, -0.76); ctx.lineTo(-0.6, -0.76); ctx.fill();
        ctx.strokeStyle = 'rgba(110,60,30,.8)'; ctx.lineWidth = 0.022; ctx.stroke();
      }
      function drawFrosting(c, u) {
        var spr = sprites[c.frost], n = Math.floor(u * PATH.length);
        for (var i = 0; i < n; i++) {
          var p = PATH[i];
          ctx.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
        // a soft curl on the very top once finished
        if (u >= 1) {
          var F = FROST[c.frost], tp = PATH[PATH.length - 1];
          ctx.fillStyle = F.base; ctx.strokeStyle = F.dark; ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(tp.x - 0.07, tp.y - 0.02);
          ctx.quadraticCurveTo(tp.x - 0.02, tp.y - 0.2, tp.x + 0.08, tp.y - 0.17);
          ctx.quadraticCurveTo(tp.x + 0.02, tp.y - 0.1, tp.x + 0.07, tp.y - 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      function drawBag(c, u, a, lift) {
        if (a <= 0) return;
        var i = Math.min(PATH.length - 1, Math.max(0, Math.floor(u * PATH.length) - 1)), p = PATH[i];
        var F = FROST[c.frost];
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(p.x, p.y - p.r * 0.6 - lift); ctx.rotate(0.32 + Math.sin(u * 40) * 0.04);
        // nozzle (metal star tip)
        ctx.fillStyle = '#D8DCE8'; ctx.strokeStyle = '#8A90A6'; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.moveTo(-0.035, -0.02); ctx.lineTo(0.035, -0.02); ctx.lineTo(0.07, -0.16); ctx.lineTo(-0.07, -0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,125,150,.7)';
        ctx.beginPath(); ctx.moveTo(0, -0.03); ctx.lineTo(0, -0.15); ctx.moveTo(-0.025, -0.03); ctx.lineTo(-0.045, -0.15); ctx.moveTo(0.025, -0.03); ctx.lineTo(0.045, -0.15); ctx.stroke();
        // bag: translucent cone with frosting inside
        ctx.beginPath(); ctx.moveTo(-0.07, -0.15); ctx.lineTo(-0.3, -0.78); ctx.quadraticCurveTo(0, -0.92, 0.3, -0.78); ctx.lineTo(0.07, -0.15); ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = hexA(F.base, 0.75); ctx.fillRect(-0.4, -0.15 - 0.5 * (1 - u * 0.6), 0.8, 0.6);
        ctx.restore();
        ctx.strokeStyle = 'rgba(150,140,190,.9)'; ctx.lineWidth = 0.02; ctx.stroke();
        // twist + a little hand? no — a cute bow at the top
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(-0.08, -0.84, 0.08, 0.045, -0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0.08, -0.84, 0.08, 0.045, 0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -0.84, 0.03, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawSprinkle(x, y, rot, col, a, L) {
        ctx.globalAlpha = a;
        var c = Math.cos(rot) * 0.045 * (L || 1), s2 = Math.sin(rot) * 0.045 * (L || 1);
        ctx.strokeStyle = col; ctx.lineWidth = 0.036;
        ctx.beginPath(); ctx.moveTo(x - c, y - s2); ctx.lineTo(x + c, y + s2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      function drawCherry(x, y, sqv) {
        ctx.save(); ctx.translate(x, y + 0.15); ctx.scale(1 + sqv * 0.35, 1 - sqv * 0.35); ctx.translate(0, -0.15);
        // stem + leaf
        ctx.strokeStyle = '#5E7A2E'; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.0, -0.12); ctx.quadraticCurveTo(0.02, -0.3, 0.13, -0.36); ctx.stroke();
        ctx.fillStyle = '#7CC24A';
        ctx.beginPath(); ctx.moveTo(0.1, -0.33); ctx.quadraticCurveTo(0.2, -0.43, 0.27, -0.34); ctx.quadraticCurveTo(0.18, -0.29, 0.1, -0.33); ctx.fill();
        var g = ctx.createRadialGradient(-0.05, -0.05, 0.01, 0, 0, 0.17);
        g.addColorStop(0, '#FF7C8E'); g.addColorStop(0.55, '#E3203F'); g.addColorStop(1, '#9A0E26');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, -0.11);
        ctx.bezierCurveTo(0.12, -0.2, 0.2, -0.05, 0.15, 0.06); ctx.bezierCurveTo(0.1, 0.16, -0.1, 0.16, -0.15, 0.06);
        ctx.bezierCurveTo(-0.2, -0.05, -0.12, -0.2, 0, -0.11); ctx.fill();
        ctx.strokeStyle = 'rgba(110,10,30,.8)'; ctx.lineWidth = 0.018; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(-0.07, -0.04, 0.035, 0.022, -0.6, 0, TAU); ctx.fill();
        ctx.restore();
      }
      function drawCandle(x, y, lit, t) {
        var h = 0.55, w = 0.065;
        ctx.save(); ctx.translate(x, y);
        ctx.save();
        ctx.beginPath(); ctx.rect(-w, -h, w * 2, h); ctx.clip();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w, -h, w * 2, h);
        ctx.strokeStyle = primary; ctx.lineWidth = 0.05;
        for (var k = -2; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-w, -k * 0.09); ctx.lineTo(w, -k * 0.09 - 0.08); ctx.stroke(); }
        var sg = ctx.createLinearGradient(-w, 0, w, 0);
        sg.addColorStop(0, 'rgba(60,20,80,.25)'); sg.addColorStop(0.4, 'rgba(255,255,255,.15)'); sg.addColorStop(1, 'rgba(60,20,80,.3)');
        ctx.fillStyle = sg; ctx.fillRect(-w, -h, w * 2, h);
        ctx.restore();
        ctx.strokeStyle = 'rgba(120,90,150,.8)'; ctx.lineWidth = 0.015; ctx.strokeRect(-w, -h, w * 2, h);
        ctx.strokeStyle = '#3A2A30'; ctx.lineWidth = 0.018;
        ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0.008, -h - 0.06); ctx.stroke();
        if (lit > 0) {
          var fl = 1 + 0.08 * Math.sin(t * 0.03) + 0.05 * Math.sin(t * 0.071);
          var fy = -h - 0.05;
          var gg = ctx.createRadialGradient(0, fy - 0.1, 0, 0, fy - 0.1, 0.55 * lit);
          gg.addColorStop(0, hexA('#FFE9A0', 0.55 * lit)); gg.addColorStop(1, hexA('#FFB040', 0));
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, fy - 0.1, 0.55 * lit, 0, TAU); ctx.fill();
          ctx.save(); ctx.translate(0, fy); ctx.scale(lit * fl * 0.9, lit * fl); ctx.rotate(Math.sin(t * 0.017) * 0.08);
          var fg = ctx.createLinearGradient(0, 0, 0, -0.26);
          fg.addColorStop(0, '#FF8A2A'); fg.addColorStop(0.5, '#FFD64A'); fg.addColorStop(1, '#FFF6C8');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.moveTo(0, -0.27); ctx.bezierCurveTo(0.06, -0.16, 0.09, -0.04, 0, 0.02); ctx.bezierCurveTo(-0.09, -0.04, -0.06, -0.16, 0, -0.27); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.beginPath(); ctx.ellipse(0, -0.05, 0.025, 0.05, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      var raf = 0, killed = false, t0 = performance.now(), last = t0;
      function frame(now) {
        if (killed) return;
        var t = now - t0, dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        var gFade = clamp01((dur - t) / 280);
        cv.style.opacity = gFade.toFixed(3);
        ctx.clearRect(0, 0, W, H);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        var portrait = W < H;
        var s = Math.min(W * (isSuper ? 0.2 : 0.26), H * (isSuper ? 0.17 : 0.19));
        var B = H * (portrait ? 0.8 : 0.88);
        var spacing = Math.min(W * 0.31, s * 2.2);

        // background twinkles
        for (var i = 0; i < bgStars.length; i++) {
          var s0 = bgStars[i], k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s0.rate + s0.tw));
          ctx.fillStyle = hexA(s0.color, 0.7 * k);
          sparkPath(ctx, s0.x * W, s0.y * H, s0.size * 2.2 * unit); ctx.fill();
        }
        // soft table glow under the cupcakes
        var tg = ctx.createRadialGradient(W / 2, B, 0, W / 2, B, Math.max(s * 3.4, spacing * 2));
        tg.addColorStop(0, hexA(primary, 0.22)); tg.addColorStop(1, hexA(primary, 0));
        ctx.fillStyle = tg; ctx.fillRect(0, B - s * 3.4, W, s * 6.8);

        var bursts = [];
        // draw side cakes first, middle last
        var order = cakes.length === 3 ? [0, 2, 1] : [0];
        for (var oi = 0; oi < order.length; oi++) {
          var c = cakes[order[oi]];
          var S = s * c.sc, cx = W / 2 + c.off * spacing;
          var tDrop0 = ms(T.drop[0]) + c.delay;
          if (t < tDrop0) continue;
          var dq = clamp01((t - tDrop0) / (c.tLand - tDrop0));
          var yOff = (1 - dq * dq) * -(B + S * 0.5);
          var sq = wob(t - c.tLand) * 0.16 + wob(t - c.tTop - 150) * 0.07;
          var u = clamp01((t - ms(T.pipe[0]) - c.delay * 0.4) / (ms(T.pipe[1]) - ms(T.pipe[0])));
          u = easeInOut(u) * 0.15 + u * 0.85;

          ctx.save();
          ctx.translate(cx, B + yOff);
          ctx.save(); ctx.scale(S, S); drawPlate(); ctx.restore();
          ctx.scale(S * (1 + sq), S * (1 - sq));
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          drawLiner(c);
          drawFace(c, t);
          drawDome();
          drawFrosting(c, u);

          // sprinkles: fall, bounce once on the frosting, then stick
          var spawnY = -(B / S) - 0.4;
          for (var si = 0; si < c.sprinkles.length; si++) {
            var p = c.sprinkles[si];
            if (t < p.t0) continue;
            if (p.st === -1) { p.st = 0; p.y = spawnY - rnd(0, 0.6); var et = envAt(ENV_T, p.x), eb = envAt(ENV_B, p.x);
              p.hitY = et == null ? null : lerp(et, Math.min(eb, -0.7), p.depth); }
            if (p.st === 0) {
              p.vy += 15 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
              var surf = p.hitY;
              if (u >= 1 && surf != null && p.y >= surf && p.vy > 0) {
                if (p.b === 0) { p.vy = -p.vy * 0.36; p.vx += p.x * 0.9 + rnd(-0.3, 0.3); p.b = 1; p.y = surf; }
                else {
                  var et2 = envAt(ENV_T, p.x), eb2 = envAt(ENV_B, p.x);
                  if (et2 != null) { p.y = lerp(et2, Math.min(eb2, -0.7), p.depth); p.st = 1; }
                  else p.hitY = null;
                }
              } else if (p.b === 1 && p.hitY != null) {
                var et3 = envAt(ENV_T, p.x); if (et3 == null) p.hitY = null; else if (p.vy > 0) p.hitY = lerp(et3, Math.min(envAt(ENV_B, p.x), -0.7), p.depth);
              }
              if (surf == null && p.y > -0.02 && Math.abs(p.x) < 0.78 && p.b < 2 && p.vy > 0) { p.vy = -p.vy * 0.3; p.vx += p.x * 1.2; p.b = 2; }
              if (p.y > 1.5) p.a = Math.max(0, p.a - dt * 4);
            }
            drawSprinkle(p.x, p.y, p.rot, p.col, p.a);
          }

          // topper
          var topY = TOP_Y - 0.06;
          if (t > c.tTop - 260) {
            var tq = clamp01((t - c.tTop + 260) / 260);
            var ty = lerp(spawnY, topY, tq * tq);
            var tsq = wob(t - c.tTop, 0.006);
            if (c.topper === 'cherry') drawCherry(0, ty - 0.1, tsq);
            else {
              var lit = T.light ? clamp01((t - ms(T.light)) / 200) : 0;
              drawCandle(0, ty + 0.12 + Math.max(0, tsq) * 0.04, lit, t);
            }
            if (t >= c.tTop && t < c.tTop + 600) bursts.push({ x: cx, y: B + yOff + (topY - 0.1) * S * (1 - sq), q: (t - c.tTop) / 600, S: S });
          }
          // piping bag rides the spiral then lifts away
          var bagA = u < 1 ? clamp01((t - ms(T.pipe[0]) + 200) / 200) : 1 - clamp01((t - ms(T.pipe[1]) - c.delay * 0.4) / 260);
          var bagLift = u < 1 ? (1 - clamp01((t - ms(T.pipe[0]) + 200) / 200)) * 1.2 : clamp01((t - ms(T.pipe[1]) - c.delay * 0.4) / 260) * 1.5;
          if (t > ms(T.pipe[0]) - 200) drawBag(c, Math.max(u, 0.02), bagA, bagLift);
          ctx.restore();
        }

        // plop sparkles
        ctx.globalCompositeOperation = 'lighter';
        for (var bi = 0; bi < bursts.length; bi++) {
          var bb = bursts[bi], e = easeOut(bb.q);
          for (var bk = 0; bk < 10; bk++) {
            var ba = bk / 10 * TAU + 0.3, br = bb.S * (0.15 + e * 0.75);
            ctx.fillStyle = hexA(bk % 2 ? '#FFFFFF' : accent, 1 - bb.q);
            sparkPath(ctx, bb.x + Math.cos(ba) * br, bb.y + Math.sin(ba) * br * 0.8, bb.S * 0.07 * (1 - bb.q * 0.5)); ctx.fill();
          }
          ctx.strokeStyle = hexA('#FFFFFF', 0.5 * (1 - bb.q)); ctx.lineWidth = 2 * unit;
          ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.S * (0.1 + e * 0.55), 0, TAU); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        // super: candle spark, glitter, confetti
        if (isSuper) {
          var mid = cakes[1], Sm = s * mid.sc;
          var fx = W / 2, fy = B + (TOP_Y - 0.06 + 0.12 - 0.55 - 0.15) * Sm;
          var tl = ms(T.light);
          // a spark flies in and lights the wick
          if (t > tl - 380 && t < tl + 60) {
            var lq = clamp01((t - tl + 380) / 380), le = easeInOut(lq);
            var lx = lerp(W * 0.86, fx, le), ly = lerp(H * 0.32, fy, le) - Math.sin(lq * Math.PI) * s * 0.6;
            ctx.globalCompositeOperation = 'lighter';
            for (var tr = 0; tr < 6; tr++) {
              var tq2 = clamp01(lq - tr * 0.04), tx2 = lerp(W * 0.86, fx, easeInOut(tq2)), ty2 = lerp(H * 0.32, fy, easeInOut(tq2)) - Math.sin(tq2 * Math.PI) * s * 0.6;
              ctx.fillStyle = hexA(tr ? accent : '#FFFFFF', 0.9 - tr * 0.14);
              sparkPath(ctx, tx2, ty2, s * (0.1 - tr * 0.012)); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          if (t > tl) {
            // ignition flash
            var iq = (t - tl) / 420;
            if (iq < 1) {
              var ig = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 1.6);
              ig.addColorStop(0, hexA('#FFF1B8', 0.6 * (1 - iq))); ig.addColorStop(1, hexA('#FFF1B8', 0));
              ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(fx, fy, s * 1.6, 0, TAU); ctx.fill();
            }
            // twinkles streaming from the flame
            ctx.globalCompositeOperation = 'lighter';
            for (var gk = 0; gk < 14; gk++) {
              var gp = ((t - tl) * 0.0011 + gk / 14) % 1, ga = gk * 2.4;
              var gx = fx + Math.cos(ga) * gp * s * 0.9, gy = fy - s * 0.05 + Math.sin(ga) * gp * s * 0.7 - gp * s * 0.3;
              ctx.fillStyle = hexA(gk % 3 ? accent : '#FFFFFF', (1 - gp) * clamp01((t - tl) / 200));
              sparkPath(ctx, gx, gy, s * 0.06 * (1 - gp * 0.5)); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
          }
          // confetti sprinkles everywhere
          var tc = ms(T.conf);
          if (t > tc) {
            var reach = Math.max(W, H) * 0.75;
            for (var cj = 0; cj < conf.length; cj++) {
              var C = conf[cj], ct = (t - tc - C.delay) / 1000;
              if (ct <= 0) continue;
              var dist = reach * C.sp * (1 - Math.exp(-ct * 2.4)) / 1.0;
              var px = fx + Math.cos(C.a) * dist + Math.sin(ct * 3 + C.sway) * s * 0.15;
              var py = fy + Math.sin(C.a) * dist * 0.75 + ct * ct * H * 0.22;
              var ca2 = clamp01(ct * 8) * (1 - clamp01((ct - 1.9) / 0.5));
              if (C.star) {
                ctx.fillStyle = hexA(C.col === RAINBOW[2] ? '#FFFFFF' : accent, ca2);
                sparkPath(ctx, px, py, s * 0.07); ctx.fill();
              } else {
                ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
                drawSprinkle(0, 0, C.rot + C.vr * ct, C.col, ca2, C.len * 1.2);
                ctx.restore();
              }
            }
          }
        }

        var tp = clamp01((t - txtAt) / 320);
        txt.style.transform = 'translate(-50%,-50%) scale(' + (tp > 0 ? easeOutBack(tp) * (1 + 0.03 * Math.sin(t * 0.004)) : 0) + ')';
        txt.style.opacity = String(Math.min(tp * 2, 1) * gFade);
        if (ptsEl) {
          var pq = clamp01((t - txtAt - 280) / 300);
          ptsEl.style.transform = 'translate(-50%,-50%) scale(' + (pq > 0 ? easeOutBack(pq) : 0) + ')';
          ptsEl.style.opacity = String(Math.min(pq * 2, 1) * gFade);
        }
        if (killed) return;
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
        sprites = null;
      };
    }
  });
})();
