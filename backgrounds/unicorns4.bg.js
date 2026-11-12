/* ── Unicorn Valley 4 — the 🦄 world, rebuilt from scratch (2026-11) ─────────
   The girls theme's backdrop (the game's default look). One canvas, a
   responsive design space (900 high, 400–2400 wide) and a handful of baked
   layers, in the manner of savanna2 / reef2 / maldives2:

     sky strip → stars, aurora, shooting stars → sun / moon → the RAINBOW
     (behind the ranges) → clouds → FAR layer (lilac snow ranges, the castle
     hill with the fairy-tale CASTLE, the crystal cliff) → live castle bits
     (waving flags, glowing windows, spire twinkles, fireworks) → GROUND layer
     (three rolling flower meadows, the pond, blossom trees, mushrooms) → the
     WATERFALL and the pond's life (swans, lilies, fish, ripples) → THE CAST
     → front grass bank + swaying flowers → petals, butterflies, fireflies,
     magic particles → vignette.

   A whole day is DAY_SEC = 240 s through eight keys (dawn, morning, noon,
   golden, sunset, dusk, night ×2): the sun climbs from behind the cliff and
   sets behind the castle; at night the moon, the stars, an aurora and the
   fireflies come out, the castle windows glow and every horn shines.

   THE CAST are canvas rigs (unicorn_rigs/, on the savanna kit): a resident
   MARE AND HER FOAL in the meadow, VISITING unicorns in every coat crossing
   at a walk or a gallop, a winged FLYER crossing the sky on a trail of
   sparkles, hopping BUNNIES in the front grass and a SWAN with her cygnets on
   the pond.

   Taps: a unicorn → her magic (the horn-flare rear with a burst of stars, a
   leap that leaves a little rainbow, a shower of hearts, the rare sparkly
   toot) · a bunny → stands up and binkies away · the swan → beats her wings ·
   the castle → fireworks · the waterfall → rainbow water · the rainbow →
   a shimmer · the pond → a fish jumps · a blossom tree → a flurry of petals ·
   the sun / the moon → the next hour · the open sky → a shooting star.

   The old valley (unicorns3.bg.js + unicorns/*.item.js, DOM actors) stays in
   the folder, unloaded — autumn.bg.js still borrows unicorns/bunny.item.js.

   Docs: backgrounds/README.md. Registers window.BACKGROUNDS.unicorns4 (skin
   'unicorns', aids 'unicorns'); init({stage}) returns a cleanup.
   Hooks: window._uni4 = BACKGROUNDS.unicorns4._test.  */
(function(){
  'use strict';
  const doc = document, TAU = Math.PI * 2;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  const BASE = (function(){ const sc = doc.currentScript; return sc && sc.src ? sc.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();

  // ── the rigs: the savanna kit first (shared helpers), then the valley's own
  //    files — each loaded once and shared across re-inits
  const RIG_FILES = [['SavKit', 'savanna_rigs/kit.js'], ['UnicornRig', 'unicorn_rigs/unicorn.js'], ['BunnyRig', 'unicorn_rigs/critters.js']];
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-unirig="' + globalName + '"]') ||
               (globalName === 'SavKit' && doc.querySelector('script[data-savrig="SavKit"]'));
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = BASE + file; s.setAttribute('data-unirig', globalName);
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }
  function loadRigs(cb){
    needScript('SavKit', RIG_FILES[0][1], () => {
      let left = RIG_FILES.length - 1;
      RIG_FILES.slice(1).forEach(([g, f]) => needScript(g, f, () => { if (--left === 0) cb(); }));
    });
  }
  // the roaming "rumi" character (backgrounds/rumi/chibi-walker.js) — loaded once
  function needRumi(cb){
    if (window.ChibiWalker){ cb(); return; }
    const ex = doc.querySelector('script[data-chibi-walker]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = BASE + 'rumi/chibi-walker.js'; s.setAttribute('data-chibi-walker', '1');
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }

  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const mulc = (a, b) => [a[0] * b[0] / 255, a[1] * b[1] / 255, a[2] * b[2] / 255];
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 1-D value noise — the skylines, the roll of the meadows, the wind
  function noise1(x){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), u); }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOUR — keyed looks, blended
  // ══════════════════════════════════════════════════════════════════════════
  const DAY_SEC = 240;
  // sky top / mid / horizon · glow round the sun · sun disc + radius · far and
  // near range + snow · meadow far / mid / near + its shade · cliff lit / dark ·
  // water light / deep · cloud top / underside · tint = the light on painted
  // things (castle, trees, flowers) · lit = the light the cast stands in ·
  // daylight, warm, stars, moon, sunA, aurora, bow (the rainbow), win (windows)
  const KEYS = [
    { at: 0.00, name: 'dawn',    top: '#8E86D6', mid: '#F3A9CE', hz: '#FFD9C2', glow: '#FFC2D6', sun: '#FFE3C0', sunR: 62,
      mtnF: '#C7B2E8', mtnN: '#B195DC', snow: '#FFF1F6', hF: '#B9E6B4', hM: '#9BDCA4', hN: '#7FD096', hD: '#5FB58C',
      cliff: '#D4A8EA', cliffD: '#9468C6', water: '#BFE6F7', waterD: '#7FB4E6', cloud: '#FFF2F7', cloudS: '#F6B9D6',
      tint: '#FFE9F0', lit: '#FFE6EA', daylight: 0.8, warm: 0.5, stars: 0.05, moon: 0, sunA: 1, aurora: 0, bow: 0.75, win: 0.25 },
    { at: 0.10, name: 'morning', top: '#6FB1F2', mid: '#B4DCFA', hz: '#FDE3EE', glow: '#FFF3D0', sun: '#FFF6D2', sunR: 50,
      mtnF: '#C9BCF0', mtnN: '#B4A0E6', snow: '#FFFFFF', hF: '#BFEFB0', hM: '#9FE49C', hN: '#7FD68A', hD: '#5BBE86',
      cliff: '#D9B2F0', cliffD: '#9A72D0', water: '#BDEBFA', waterD: '#74BDEE', cloud: '#FFFFFF', cloudS: '#F9D0E4',
      tint: '#FFFFFF', lit: '#FFFFFF', daylight: 1, warm: 0.1, stars: 0, moon: 0, sunA: 1, aurora: 0, bow: 0.9, win: 0 },
    { at: 0.30, name: 'noon',    top: '#58A2EE', mid: '#A2D4FA', hz: '#EAF4FF', glow: '#FFFFFF', sun: '#FFFCE8', sunR: 44,
      mtnF: '#CDC2F4', mtnN: '#B6A6EA', snow: '#FFFFFF', hF: '#C4F2B2', hM: '#A2E89C', hN: '#80DA8A', hD: '#5CC286',
      cliff: '#DDB8F4', cliffD: '#9E78D4', water: '#B9ECFC', waterD: '#6CBDF0', cloud: '#FFFFFF', cloudS: '#F3D6EC',
      tint: '#FFFFFF', lit: '#FFFFFF', daylight: 1, warm: 0, stars: 0, moon: 0, sunA: 1, aurora: 0, bow: 0.85, win: 0 },
    { at: 0.50, name: 'golden',  top: '#7FA4E4', mid: '#F6C7B8', hz: '#FFE0A8', glow: '#FFDC9C', sun: '#FFEDB4', sunR: 60,
      mtnF: '#D2B4E0', mtnN: '#BC98D4', snow: '#FFF3E2', hF: '#D2EBA2', hM: '#B2DE92', hN: '#92D084', hD: '#6CB67E',
      cliff: '#E6B4DC', cliffD: '#A870BC', water: '#FFE2C6', waterD: '#F0A6B8', cloud: '#FFF4E4', cloudS: '#F8B8B8',
      tint: '#FFEFD8', lit: '#FFF0DA', daylight: 0.9, warm: 0.6, stars: 0, moon: 0, sunA: 1, aurora: 0, bow: 0.8, win: 0.15 },
    { at: 0.64, name: 'sunset',  top: '#5B3F9E', mid: '#E86FA8', hz: '#FFC27A', glow: '#FF9CA8', sun: '#FFD890', sunR: 88,
      mtnF: '#B07CC8', mtnN: '#8E5EB4', snow: '#FFD2DC', hF: '#C8C890', hM: '#A2B886', hN: '#7EA680', hD: '#5A8C7C',
      cliff: '#E0A0C8', cliffD: '#9C62A8', water: '#FFB8A8', waterD: '#D872A8', cloud: '#FFD8D2', cloudS: '#E87CA8',
      tint: '#FFC8C0', lit: '#FFD2C4', daylight: 0.62, warm: 1, stars: 0.08, moon: 0.1, sunA: 1, aurora: 0, bow: 0.6, win: 0.6 },
    { at: 0.74, name: 'dusk',    top: '#2C2670', mid: '#7E5AB4', hz: '#E896B4', glow: '#E890B8', sun: '#FFB8A0', sunR: 80,
      mtnF: '#7E66B8', mtnN: '#644E9E', snow: '#DCC6F0', hF: '#7EA0A0', hM: '#648E94', hN: '#4E7C8A', hD: '#3C6680',
      cliff: '#A884C8', cliffD: '#6C4E98', water: '#B49AD8', waterD: '#6E5EB4', cloud: '#C8A8DC', cloudS: '#8C6CB8',
      tint: '#B8A4E0', lit: '#C4B2E8', daylight: 0.36, warm: 0.5, stars: 0.5, moon: 0.7, sunA: 0.4, aurora: 0.25, bow: 0.4, win: 0.9 },
    { at: 0.84, name: 'night',   top: '#0C0B36', mid: '#22246A', hz: '#4A4A9E', glow: '#5A5AB4', sun: '#FFB8A0', sunR: 70,
      mtnF: '#4A4690', mtnN: '#3A3678', snow: '#B8BEEE', hF: '#3E6E8A', hM: '#30607E', hN: '#265272', hD: '#1C4266',
      cliff: '#7466B4', cliffD: '#453C86', water: '#6E7ED2', waterD: '#33408E', cloud: '#5C5CA4', cloudS: '#3A3A80',
      tint: '#7C86D2', lit: '#8892DC', daylight: 0.12, warm: 0, stars: 1, moon: 1, sunA: 0, aurora: 1, bow: 0.32, win: 1 },
    { at: 0.95, name: 'night',   top: '#0C0B36', mid: '#22246A', hz: '#4A4A9E', glow: '#5A5AB4', sun: '#FFB8A0', sunR: 70,
      mtnF: '#4A4690', mtnN: '#3A3678', snow: '#B8BEEE', hF: '#3E6E8A', hM: '#30607E', hN: '#265272', hD: '#1C4266',
      cliff: '#7466B4', cliffD: '#453C86', water: '#6E7ED2', waterD: '#33408E', cloud: '#5C5CA4', cloudS: '#3A3A80',
      tint: '#7C86D2', lit: '#8892DC', daylight: 0.12, warm: 0, stars: 1, moon: 1, sunA: 0, aurora: 1, bow: 0.32, win: 1 },
  ];
  const HOLD = 0.35;   // fraction of each gap held on the key before blending to the next
  function lookAt(tod){
    tod = ((tod % 1) + 1) % 1;
    let i = KEYS.length - 1;
    for (let k = 0; k < KEYS.length; k++) if (KEYS[k].at <= tod) i = k;
    const A = KEYS[i], B = KEYS[(i + 1) % KEYS.length];
    const span = ((B.at - A.at) + 1) % 1 || 1;
    const w = smooth(clamp01(((tod - A.at) / span - HOLD) / (1 - HOLD)));
    return blend(A, B, w);
  }
  function blend(A, B, w){
    const o = { name: w < 0.5 ? A.name : B.name };
    for (const k in A){
      if (k === 'at' || k === 'name') continue;
      const a = A[k], b = B[k];
      o[k] = typeof a === 'number' ? lerp(a, b, w) : mixc(hexc(a), hexc(b), w);
    }
    return o;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE CAST — coats, sizes, speeds
  // ══════════════════════════════════════════════════════════════════════════
  const COATS_FALLBACK = ['pearl', 'rose', 'lilac', 'mint', 'sky', 'gold', 'night'];
  const UNI = { sc: 1.12, speed: 50, runSpeed: 230 };          // design px per rig unit · px/s at sc 1
  const ACT_DUR = { pose: 2.4, jump: 1.0, hearts: 1.8, toot: 1.5 };
  const BOW = ['#FF8FB1', '#FFB27A', '#FFE27A', '#9BE8A8', '#8CCBFF', '#C4A2FF'];   // the valley's pastel rainbow
  const noop = function(){};

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.unicorns4 = {
    skin: 'unicorns',
    aids: 'unicorns',
    preload(){ loadRigs(noop); needRumi(noop); },
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0, warmTs = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov,#settings-ov,#parent-ov';

      // ── the stage ──
      // RESPONSIVE: the design height is fixed at 900, the design WIDTH follows
      // the window's aspect so nothing is cropped (1600 on 16:9, ~1200 on a
      // landscape tablet, ~675 portrait, ~415 phone). Things keep their 1600-space
      // x and go through AX(): left things hold to the left edge, right things to
      // the right, the middle compresses. Below DW 1000 layout() re-composes by
      // hand (a lower cliff, a smaller castle, a smaller cast).
      const DW0 = 1600, DH = 900, HZ = 560;
      let DW = DW0, AXK = 1, layoutDW = -1, narrow = false;
      const AX = x => x < 640 ? x * AXK : x >= 1000 ? DW - (DW0 - x) * AXK : DW / 2 + (x - 800) * AXK;
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0, repaints: 0, cast: 0, fx: 0 };

      // ── the clock ──
      let tod = 0.13, todSpeed = 1, todTween = null;        // boot: a bright morning
      let L = lookAt(tod), lookKey = -1, LIT = [1, 1, 1];

      // ── sprites + layers ──
      const SPR = {};
      const SPR_COL = { white: '255,255,255', warm: '255,236,190', gold: '255,196,120', pink: '255,160,205', blue: '176,196,255',
                        green: '200,255,150', lilac: '206,170,255', aqua: '150,240,235' };
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = SPR_COL[name] || name;
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [0.3, 'rgba(' + col + ',0.4)'], [1, 'rgba(' + col + ',0)']]);
        g.fillRect(0, 0, 128, 128);
        return (SPR[name] = cv);
      }
      const glow = (g, name, x, y, r, a) => { if (a <= 0.003) return; g.globalAlpha = a > 1 ? 1 : a; g.drawImage(sprite(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
      function makeLayer(w, h, dpr){
        const cv = doc.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
        const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h, dpr };
      }
      // a white-on-clear sprite recoloured for the hour (source-atop keeps its alpha)
      function tintSprite(src, dst, col, shadeCol){
        const g = dst.cx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, dst.cv.width, dst.cv.height); g.drawImage(src.cv, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = shadeCol ? lg(g, 0, 0, 0, dst.cv.height, [[0, rgb(col)], [0.5, rgb(col)], [1, rgb(shadeCol)]]) : rgb(col);
        g.fillRect(0, 0, dst.cv.width, dst.cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      // the hour's light on a painted colour (the castle, the trees, the flowers)
      const T = c => rgb(mulc(hexc(c), L.tint));
      const TA = (c, a) => rgb(mulc(hexc(c), L.tint), a);
      let skyL = null, farL = null, groundL = null, frontL = null, vigL = null, bowL = null;
      const FAR_TOP = 120, GROUND_TOP = 240, FRONT_TOP = 822;   // design y of each layer's top row

      // ══════════════════════════════════════════════════════════════════════
      // THE LAYOUT — where the cliff, the water, the castle and the trees stand
      // ══════════════════════════════════════════════════════════════════════
      // THE CLIFF in its own coordinates (the 1600 design): a crystal bluff on
      // the left edge with the falls cut into its face; CLX / CLY scale it (the
      // height about its foot) — a low one on a phone
      const CLIFF_TOP = 396, CLIFF_FOOT = 700, CLIFF_W = 318, FALL_X = 196, FALL_W = 58;
      let CLX = 1, CLY = 1, CS = 1;                    // cliff x-scale · cliff height scale · cast scale
      const CX = x => x * CLX;
      const CY = y => CLIFF_FOOT - (CLIFF_FOOT - y) * CLY;
      const POND = { x: 0, y: 716, rx: 190, ry: 32 };
      const CASTLE = { x: 0, y: 552, s: 1 };
      const RBOW = { x: 0, y: 610, r: 560, w: 80 };
      const ZONE = { x0: 0, x1: 0, y0: 778, y1: 848 };  // the meadow the cast walks: lane 0 (far) … 1 (near)
      let TREES = [], SHROOMS = [], BUSHES = [], FLOWERS = [], LILIES = [];
      function layout(){
        layoutDW = DW; narrow = DW < 1000;
        const r = makeRng(1717);
        CS = clamp(DW / 1000, 0.6, 1);
        if (narrow){
          CLX = DW * 0.36 / CLIFF_W; CLY = 0.56;
          POND.rx = DW * 0.25; POND.ry = 24; POND.x = CX(FALL_X) + POND.rx * 0.55; POND.y = 724;
          CASTLE.s = clamp(DW / 760, 0.5, 0.86); CASTLE.x = DW * 0.74; CASTLE.y = 566;
          TREES = [{ x: CX(70), y: CY(CLIFF_TOP) + 2, s: 0.5, v: 0 }, { x: DW * 0.52, y: 612, s: 0.42, v: 1 }, { x: DW * 0.95, y: 688, s: 0.7, v: 0 }];
        } else {
          CLX = Math.max(0.72, AXK); CLY = 1;
          POND.rx = 150 + 40 * AXK; POND.ry = 32; POND.x = CX(FALL_X) + POND.rx * 0.62; POND.y = 716;
          CASTLE.s = 0.82 + 0.18 * AXK; CASTLE.x = AX(1322); CASTLE.y = 552;
          TREES = [{ x: CX(78), y: CLIFF_TOP + 2, s: 0.62, v: 0 }, { x: AX(600), y: 606, s: 0.4, v: 1 }, { x: AX(760), y: 628, s: 0.56, v: 0 },
                   { x: AX(1040), y: 612, s: 0.44, v: 2 }, { x: AX(1540), y: 700, s: 0.95, v: 0 }, { x: AX(1150), y: 666, s: 0.74, v: 1 }];
        }
        // the rainbow springs from behind the cliff and comes down behind the castle
        const a = CX(150), b = CASTLE.x + 60 * CASTLE.s;
        RBOW.r = Math.min(640, (b - a) / 2); RBOW.x = (a + b) / 2; RBOW.y = 640; RBOW.w = clamp(RBOW.r * 0.2, 44, 96);
        ZONE.x0 = POND.x + POND.rx + 70 * CS; ZONE.x1 = DW - 70 * CS;
        // mushrooms and bushes in the meadow, big flowers along the front edge (they sway, live)
        const free = (x, y) => !(Math.abs(x - POND.x) < POND.rx * 1.2 && Math.abs(y - POND.y) < 60);
        SHROOMS = []; BUSHES = [];
        const nm = narrow ? 3 : 6, nb = narrow ? 4 : 8;
        for (let i = 0; i < nm; i++){ const x = DW * (i + 0.2 + r() * 0.6) / nm, y = 690 + r() * 120; if (free(x, y)) SHROOMS.push({ x, y, s: (0.55 + r() * 0.5) * (0.7 + (y - 690) / 300), v: Math.floor(r() * 3) }); }
        for (let i = 0; i < nb; i++){ const x = CX(330) + (DW - CX(330)) * (i + 0.2 + r() * 0.6) / nb, y = 632 + r() * 120; if (free(x, y)) BUSHES.push({ x, y, s: (0.5 + r() * 0.5) * (0.62 + (y - 632) / 240), seed: 1 + Math.floor(r() * 1e6) }); }
        SHROOMS.sort((p, q) => p.y - q.y); BUSHES.sort((p, q) => p.y - q.y);
        FLOWERS = [];
        const nf = Math.round(clamp(DW / 58, 8, 28));
        for (let i = 0; i < nf; i++) FLOWERS.push({ x: DW * (i + r()) / nf, y: 876 + r() * 32, s: (0.46 + r() * 0.42) * clamp(DW / 900, 0.62, 1), v: Math.floor(r() * 5), ph: r() * TAU, f: r() < 0.5 ? -1 : 1 });
        FLOWERS.sort((p, q) => p.y - q.y);
        LILIES = [];
        for (let i = 0; i < (narrow ? 3 : 5); i++){ const a2 = r() * TAU, k = 0.35 + r() * 0.5; LILIES.push({ x: POND.x + Math.cos(a2) * POND.rx * k + POND.rx * 0.12, y: POND.y + Math.sin(a2) * POND.ry * k * 0.8, s: 0.7 + r() * 0.5, bloom: r() < 0.6, ph: r() * TAU }); }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SKY — sun, moon, stars, aurora, clouds, the rainbow
      // ══════════════════════════════════════════════════════════════════════
      // the sun comes up from behind the cliff, climbs over the valley and goes
      // down behind the castle (its spires stand against the sunset). The moon
      // rides over the cliff side all night.
      function sunPos(v){
        const k = clamp01(v / 0.76);
        return { x: lerp(CX(250), CASTLE.x - 40 * CASTLE.s, k), y: 524 - Math.pow(Math.sin(Math.PI * k), 0.75) * 410, up: v < 0.80 };
      }
      function moonPos(v){
        const k = clamp01(((v - 0.70 + 1) % 1) / 0.32);
        return { x: lerp(CX(120), Math.max(CX(420), DW * 0.4), k), y: 236 - Math.sin(Math.PI * k) * 120, up: v > 0.69 || v < 0.03 };
      }
      const STARS = []; { const r = makeRng(77); for (let i = 0; i < 150; i++) STARS.push({ x: r(), y: r() * r() * 0.95 + 0.01, s: 0.7 + r() * 1.7, ph: r() * TAU, f: 0.5 + r() * 2, c: r() < 0.25 ? '#FFD9F0' : r() < 0.4 ? '#CFE4FF' : '#FFFFFF', big: r() < 0.06 }); }
      function star4(g, x, y, r, a){                       // a four-point twinkle
        if (a <= 0.01) return;
        g.globalAlpha = a > 1 ? 1 : a;
        g.beginPath();
        g.moveTo(x, y - r); g.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y); g.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
        g.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y); g.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
        g.fill(); g.globalAlpha = 1;
      }
      function drawStars(g, t){
        const a = L.stars; if (a <= 0.01) return;
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph), x = s.x * DW, y = s.y * (HZ - 70);
          g.fillStyle = s.c;
          if (s.big) star4(g, x, y, 3 + s.s * 2.4 * tw, a * (0.5 + 0.5 * tw));
          else { g.globalAlpha = a * tw * (1 - s.y * 0.5); g.fillRect(x, y, s.s, s.s); }
        }
        g.globalAlpha = 1;
      }
      let shoot = null, nextShootAt = 16;
      function startShoot(t, x, y){ shoot = { t0: t, x: x === undefined ? rnd(0.15, 0.85) * DW : x, y: y === undefined ? rnd(30, 200) : y, vx: Math.random() < 0.5 ? -560 : 560, vy: rnd(120, 230) }; }
      function drawShoot(g, t){
        if (!shoot && L.stars > 0.6 && t > nextShootAt){ startShoot(t); nextShootAt = t + rnd(12, 34); }
        if (!shoot) return;
        const p = (t - shoot.t0) / 1.0; if (p >= 1){ shoot = null; return; }
        const x = shoot.x + shoot.vx * p, y = shoot.y + shoot.vy * p, k = Math.sin(p * Math.PI);
        g.strokeStyle = lg(g, x, y, x - shoot.vx * 0.2, y - shoot.vy * 0.2, [[0, 'rgba(255,255,255,' + (0.95 * k) + ')'], [0.4, 'rgba(255,200,240,' + (0.5 * k) + ')'], [1, 'rgba(200,180,255,0)']]);
        g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - shoot.vx * 0.2, y - shoot.vy * 0.2); g.stroke();
        g.fillStyle = '#FFFFFF'; star4(g, x, y, 9 * k + 2, k);
      }
      // the aurora: a curtain baked once (soft vertical streaks, mint → aqua → pink),
      // drawn twice, drifting against itself
      const auroraL = makeLayer(256, 96, 1);
      { const g = auroraL.cx;
        for (let x = 0; x < 256; x += 2){
          const n = noise1(x * 0.045) * 0.6 + noise1(x * 0.16 + 9) * 0.4, top = 8 + (1 - n) * 40, h = 30 + n * 56;
          const k = x / 256, c = k < 0.45 ? mixc([120, 255, 200], [120, 220, 255], k / 0.45) : mixc([120, 220, 255], [240, 150, 240], (k - 0.45) / 0.55);
          g.fillStyle = lg(g, 0, top, 0, top + h, [[0, rgb(c, 0)], [0.25, rgb(c, 0.5 * n + 0.1)], [1, rgb(c, 0)]]);
          g.fillRect(x, top, 2, h);
        } }
      function drawAurora(g, t){
        const a = L.aurora; if (a <= 0.02) return;
        const w = Math.max(DW, 900) * 1.5, y = 20;
        g.globalAlpha = a * (0.55 + 0.15 * Math.sin(t * 0.21));
        g.drawImage(auroraL.cv, -w * 0.18 + Math.sin(t * 0.05) * w * 0.08, y, w, 330);
        g.globalAlpha = a * (0.4 + 0.15 * Math.sin(t * 0.17 + 2));
        g.drawImage(auroraL.cv, -w * 0.3 - Math.sin(t * 0.04 + 1) * w * 0.1, y + 40, w * 1.2, 280);
        g.globalAlpha = 1;
      }
      // the sun's soft rays: a wheel of wedges baked once, turning slowly
      const raysL = makeLayer(256, 256, 1);
      { const g = raysL.cx; g.translate(128, 128);
        for (let i = 0; i < 14; i++){
          const a0 = i / 14 * TAU, wd = 0.085 + (i % 3) * 0.03;
          g.fillStyle = rg(g, 0, 0, 20, 128, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
          g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 128, a0 - wd, a0 + wd); g.closePath(); g.fill();
        } }
      function drawSun(g, t){
        const p = sunPos(tod); if (!p.up || L.sunA <= 0.01) return;
        const R = L.sunR, a = L.sunA;
        glow(g, 'pink', p.x, p.y, R * 5, 0.42 * a * L.warm);
        glow(g, 'warm', p.x, p.y, R * 3.4, 0.7 * a);
        g.save(); g.translate(p.x, p.y); g.rotate(t * 0.03); g.globalAlpha = a * (0.3 + 0.25 * L.daylight);
        g.drawImage(raysL.cv, -R * 4.2, -R * 4.2, R * 8.4, R * 8.4); g.restore(); g.globalAlpha = a;
        g.fillStyle = rg(g, p.x - R * 0.25, p.y - R * 0.3, R * 0.1, R * 1.05, [[0, '#FFFFFF'], [0.55, rgb(L.sun)], [1, rgb(mixc(L.sun, L.glow, 0.6))]]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      const CRATERS = [[-0.3, -0.25, 0.2], [0.28, 0.1, 0.16], [-0.1, 0.38, 0.12], [0.34, -0.4, 0.09]];
      function drawMoon(g, t){
        const p = moonPos(tod); if (!p.up || L.moon <= 0.01) return;
        const R = 44, a = L.moon;
        glow(g, 'lilac', p.x, p.y, R * 5, 0.35 * a);
        glow(g, 'blue', p.x, p.y, R * 2.6, 0.5 * a);
        g.globalAlpha = a;
        g.fillStyle = rg(g, p.x - R * 0.3, p.y - R * 0.3, R * 0.1, R * 1.2, [[0, '#FFFFFF'], [0.7, '#F1EEFF'], [1, '#CFC8F2']]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.fillStyle = 'rgba(176,160,226,.3)';
        for (const c of CRATERS){ g.beginPath(); g.arc(p.x + c[0] * R, p.y + c[1] * R, c[2] * R, 0, TAU); g.fill(); }
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < 3; i++) star4(g, p.x + Math.cos(i * 2.2 + 0.6) * R * 1.55, p.y + Math.sin(i * 2.2 + 0.6) * R * 1.3, 5 + 3 * Math.sin(t * 1.3 + i * 2), a * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2)));
        g.globalAlpha = 1;
      }

      // ── clouds: three fluffy heaps baked white once, recoloured per look (a
      //    blush underside)
      const CLOUD_SRC = [], CLOUD_T = [], CLOUDS = [];
      for (let v = 0; v < 3; v++){
        const src = makeLayer(380, 170, 1), g = src.cx, r = makeRng(900 + v * 31), n = 7 + v;
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < n; i++){
          const k = i / (n - 1), x = 50 + k * 280, hump = Math.sin(k * Math.PI), rad = 26 + hump * (34 + r() * 24);
          g.beginPath(); g.arc(x, 112 - rad * 0.55 - hump * 14 * r(), rad, 0, TAU); g.fill();
        }
        g.beginPath(); g.ellipse(190, 116, 150, 30, 0, 0, TAU); g.fill();
        CLOUD_SRC.push(src); CLOUD_T.push(makeLayer(380, 170, 1));
      }
      { const r = makeRng(31);
        for (let i = 0; i < 6; i++) CLOUDS.push({ u: (i + r() * 0.7) / 6, y: 50 + r() * 210, s: 0.42 + r() * 0.5, v: i % 3, sp: 4 + r() * 7 }); }
      function drawClouds(g, dt){
        const cs = clamp(DW / 1100, 0.5, 1), span = DW + 520 * cs, n = narrow ? 4 : CLOUDS.length;
        for (let i = 0; i < n; i++){
          const c = CLOUDS[i];
          c.u = (c.u + c.sp * dt / span) % 1;
          const w = 380 * c.s * cs, h = 170 * c.s * cs;
          g.drawImage(CLOUD_T[c.v].cv, c.u * span - 420 * cs, c.y - h / 2, w, h);
        }
      }

      // ── the rainbow: six soft bands baked once on a half-disc, drawn behind
      //    the ranges; a tap sends a shimmer along it
      let shimmer = null;
      function bakeRainbow(){
        const sc = 0.5, R = RBOW.r, wd = RBOW.w;
        bowL = makeLayer((R + wd) * 2 * sc, (R + wd) * sc, 1);
        const g = bowL.cx; g.scale(sc, sc);
        const cx = R + wd, cy = R + wd, bw = wd / BOW.length;
        g.lineCap = 'butt';
        for (let i = 0; i < BOW.length; i++){
          const rr = R + wd / 2 - bw * (i + 0.5);
          g.strokeStyle = BOW[i]; g.globalAlpha = 0.34; g.lineWidth = bw * 1.7; g.beginPath(); g.arc(cx, cy, rr, Math.PI, TAU); g.stroke();   // a soft bleed
          g.globalAlpha = 0.8; g.lineWidth = bw * 0.9; g.beginPath(); g.arc(cx, cy, rr, Math.PI, TAU); g.stroke();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out';             // the feet melt into the haze
        g.fillStyle = lg(g, 0, cy - R * 0.42, 0, cy, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
        g.fillRect(0, cy - R * 0.42, cx * 2, R * 0.42 + 2);
        g.globalCompositeOperation = 'source-over';
      }
      function drawRainbow(g, t){
        if (!bowL) return;
        let a = L.bow * (0.82 + 0.08 * Math.sin(t * 0.6)), sh = 0;
        if (shimmer){ sh = (t - shimmer.t0) / 2.6; if (sh >= 1){ shimmer = null; sh = 0; } else a = Math.min(1, a + 0.45 * Math.sin(sh * Math.PI)); }
        const R = RBOW.r, wd = RBOW.w;
        g.globalAlpha = a; g.drawImage(bowL.cv, RBOW.x - R - wd, RBOW.y - R - wd, (R + wd) * 2, R + wd); g.globalAlpha = 1;
        if (sh > 0){                                        // sparkles run along the arc
          g.fillStyle = '#FFFFFF';
          for (let i = 0; i < 9; i++){
            const k = sh * 1.25 - i * 0.045; if (k <= 0.04 || k >= 0.96) continue;
            const an = Math.PI * (1 + k), rr = R + (i % 3 - 1) * wd * 0.3;
            const x = RBOW.x + Math.cos(an) * rr, y = RBOW.y + Math.sin(an) * rr, f = Math.sin(k * Math.PI);
            glow(g, 'white', x, y, 26 * f, 0.6 * f); star4(g, x, y, 12 * f * (1 - i / 14), 0.95 * f);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SCENERY — baked per look
      // ══════════════════════════════════════════════════════════════════════
      function paintSky(){
        const g = skyL.cx;
        g.fillStyle = lg(g, 0, 0, 0, 256, [[0, rgb(L.top)], [0.52, rgb(L.mid)], [0.9, rgb(L.hz)], [1, rgb(mixc(L.hz, [255, 255, 255], 0.25))]]);
        g.fillRect(0, 0, 4, 256);
      }
      // the ranges: ridged noise makes pointed peaks; snow above the snow line
      const ridge = (x, f, o) => 1 - Math.abs(2 * noise1(x * f + o) - 1);
      const mtnFY = x => 452 - 170 * ridge(x, 0.0056, 3.3) - 30 * noise1(x * 0.021);
      const mtnNY = x => 512 - 128 * ridge(x, 0.0054, 11.7) - 24 * noise1(x * 0.03 + 5);
      function paintRange(g, fy, col, snowY, base){
        g.beginPath(); g.moveTo(-10, base);
        for (let x = -10; x <= DW + 10; x += 8) g.lineTo(x, fy(x));
        g.lineTo(DW + 10, base); g.closePath();
        g.fillStyle = lg(g, 0, 260, 0, base, [[0, rgb(mixc(col, [255, 255, 255], 0.14))], [0.55, rgb(col)], [1, rgb(mixc(col, L.hz, 0.55))]]);
        g.fill();
        g.save(); g.clip();
        // the shaded flank of every peak (light comes from the sun's side)
        g.fillStyle = rgb(mixc(col, L.top, 0.4), 0.22);
        for (let x = -10; x <= DW + 10; x += 8){
          const y = fy(x), yl = fy(x - 8), yr = fy(x + 8);
          if (y <= yl && y < yr){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y + 60); g.lineTo(x + 70, base); g.lineTo(x - 6, base); g.lineTo(x + 8, y + 70); g.closePath(); g.fill(); }
        }
        // snow: everything above a zig-zag line
        g.fillStyle = lg(g, 0, snowY - 120, 0, snowY + 40, [[0, rgb(L.snow)], [1, rgb(mixc(L.snow, col, 0.3))]]);
        g.beginPath(); g.moveTo(-10, 0);
        for (let x = -10; x <= DW + 10; x += 11){ const y = fy(x), d = clamp(snowY - y, 0, 70) * 0.8; g.lineTo(x, y + d + (d > 6 ? (((x / 11) | 0) % 2 ? 9 : -5) : -2)); }
        g.lineTo(DW + 10, 0); g.closePath(); g.fill();
        g.restore();
      }

      // ── THE CASTLE (local units: ground at y 0, about 320 wide, 350 tall) ──
      const WALL = '#FFF8FC', WALL_M = '#F3E6F8', WALL_D = '#D9C5EC', TRIM = '#C9A8E8';
      const ROOFS = { rose: ['#FFB0D0', '#F06CAE', '#C74C98'], lilac: ['#CDB0FA', '#9F74E6', '#7A52C8'], aqua: ['#B4F1EA', '#6AD3CF', '#3FA9B4'] };
      const CWIN = [], CFLAG = [], CTWINK = [];           // window lights, flags, finial twinkles (castle units)
      function cTower(g, cx, w, top, roofH, roof, opt){
        opt = opt || {};
        const base = opt.base || 0, x0 = cx - w / 2;
        g.fillStyle = lg(g, x0, 0, x0 + w, 0, [[0, T(WALL)], [0.45, T(WALL_M)], [1, T(WALL_D)]]);
        g.fillRect(x0, top, w, base - top);
        // a cap ring under the roof and a trim band
        g.fillStyle = lg(g, x0 - 4, 0, x0 + w + 4, 0, [[0, T('#FFFFFF')], [1, T(TRIM)]]);
        g.beginPath(); g.roundRect(x0 - 4, top - 3, w + 8, 9, 3); g.fill();
        if (base - top > 70){ g.fillStyle = TA(TRIM, 0.55); g.fillRect(x0, top + (base - top) * 0.46, w, 3); }
        // the cone roof, a soft curve at its foot
        const R = ROOFS[roof], rw = w / 2 + 7;
        g.fillStyle = lg(g, cx - rw, 0, cx + rw, 0, [[0, T(R[0])], [0.5, T(R[1])], [1, T(R[2])]]);
        g.beginPath(); g.moveTo(cx - rw, top - 3); g.quadraticCurveTo(cx - rw * 0.34, top - roofH * 0.5, cx, top - roofH);
        g.quadraticCurveTo(cx + rw * 0.34, top - roofH * 0.5, cx + rw, top - 3); g.quadraticCurveTo(cx, top + 4, cx - rw, top - 3); g.fill();
        g.fillStyle = TA('#FFFFFF', 0.35);                     // a sheen down the lit side
        g.beginPath(); g.moveTo(cx - rw * 0.62, top - 6); g.quadraticCurveTo(cx - rw * 0.3, top - roofH * 0.5, cx - 1, top - roofH * 0.94);
        g.quadraticCurveTo(cx - rw * 0.16, top - roofH * 0.5, cx - rw * 0.3, top - 5); g.fill();
        // the finial: a gold ball, and a pole for a flag
        g.fillStyle = T('#FFD76A'); g.beginPath(); g.arc(cx, top - roofH - 2, 3.2, 0, TAU); g.fill();
        if (opt.flag){ g.fillStyle = T('#E9C25A'); g.fillRect(cx - 0.8, top - roofH - 26, 1.6, 24); CFLAG.push([cx, top - roofH - 25, opt.flag]); }
        else CTWINK.push([cx, top - roofH - 4]);
        // windows down the shaft
        const n = opt.win === undefined ? Math.max(1, Math.round((base - top) / 62)) : opt.win;
        for (let i = 0; i < n; i++) cWindow(g, cx, top + 22 + i * 46, Math.min(9, w * 0.3), 16);
      }
      function cWindow(g, cx, y, w, h){
        g.fillStyle = TA(TRIM, 0.9);
        g.beginPath(); g.roundRect(cx - w / 2 - 1.5, y - 1.5, w + 3, h + 3, [w / 2 + 1.5, w / 2 + 1.5, 2, 2]); g.fill();
        g.fillStyle = lg(g, 0, y, 0, y + h, [[0, T('#8E7AD6')], [1, T('#5F4EB0')]]);
        g.beginPath(); g.roundRect(cx - w / 2, y, w, h, [w / 2, w / 2, 1, 1]); g.fill();
        g.fillStyle = TA('#FFFFFF', 0.4); g.fillRect(cx - w / 2 + 1, y + 2, 1.4, h * 0.5);
        CWIN.push([cx, y + h / 2, w, h]);
      }
      function cWall(g, x0, x1, top, teeth){
        g.fillStyle = lg(g, x0, 0, x1, 0, [[0, T(WALL)], [0.6, T(WALL_M)], [1, T(WALL_D)]]);
        g.fillRect(x0, top, x1 - x0, -top);
        const n = teeth || Math.max(3, Math.round((x1 - x0) / 13)), tw = (x1 - x0) / (n * 2 - 1);
        for (let i = 0; i < n; i++) g.fillRect(x0 + i * 2 * tw, top - 7, tw, 8);       // battlements
        g.fillStyle = TA(TRIM, 0.5); g.fillRect(x0, top + 6, x1 - x0, 2.4);
        g.fillStyle = TA(TRIM, 0.28);                                                    // a few stones
        for (let i = 0; i < 7; i++){ const bx = x0 + 4 + ((i * 37) % Math.max(8, x1 - x0 - 14)), by = top + 16 + ((i * 23) % Math.max(6, -top - 30)); g.beginPath(); g.roundRect(bx, by, 9, 4.5, 2); g.fill(); }
      }
      function paintCastle(g, x, y, s){
        CWIN.length = 0; CFLAG.length = 0; CTWINK.length = 0;
        g.save(); g.translate(x, y); g.scale(s, s);
        // far towers peeking between the near ones
        cTower(g, -74, 22, -196, 62, 'lilac', { win: 2 }); cTower(g, 76, 22, -212, 66, 'aqua', { win: 2, flag: '#FF8FC0' });
        // the wings and their round corner towers
        cWall(g, -138, -44, -84); cWall(g, 44, 138, -84);
        for (const wx of [-108, -78, 78, 108]) cWindow(g, wx, -58, 9, 16);
        cTower(g, -140, 46, -138, 84, 'rose', { flag: '#B894FF' }); cTower(g, 140, 46, -150, 88, 'lilac', { flag: '#7FDCD4' });
        // the keep, its corner turrets and the great spire
        cWall(g, -52, 52, -158, 5);
        cTower(g, -52, 20, -186, 46, 'aqua', { base: -150, win: 1 }); cTower(g, 52, 20, -186, 46, 'rose', { base: -150, win: 1 });
        cTower(g, 0, 44, -252, 104, 'rose', { base: -160, win: 2, flag: '#FFD76A' });
        // a rose window, a balcony, the gate with its steps
        g.fillStyle = TA(TRIM, 0.9); g.beginPath(); g.arc(0, -112, 15, 0, TAU); g.fill();
        g.fillStyle = rg(g, 0, -112, 1, 13, [[0, T('#FFC6E4')], [0.6, T('#B48CF0')], [1, T('#6E5AC8')]]); g.beginPath(); g.arc(0, -112, 12, 0, TAU); g.fill();
        g.strokeStyle = TA('#FFFFFF', 0.6); g.lineWidth = 1.2;
        for (let i = 0; i < 4; i++){ const a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 12, -112 + Math.sin(a) * 12); g.lineTo(-Math.cos(a) * 12, -112 - Math.sin(a) * 12); g.stroke(); }
        CWIN.push([0, -112, 22, 22]);
        g.fillStyle = T(WALL); g.beginPath(); g.roundRect(-30, -86, 60, 7, 3); g.fill();
        g.fillStyle = TA(TRIM, 0.8); for (let i = -26; i <= 26; i += 6.5) g.fillRect(i - 1, -80, 2, 9);
        for (const wx of [-30, 30]) cWindow(g, wx, -138, 9, 17);
        g.fillStyle = TA(TRIM, 0.95); g.beginPath(); g.roundRect(-25, -62, 50, 62, [25, 25, 0, 0]); g.fill();
        g.fillStyle = lg(g, -20, 0, 20, 0, [[0, T('#E890B8')], [0.5, T('#C76AA2')], [1, T('#9E4E8C')]]);
        g.beginPath(); g.roundRect(-20, -56, 40, 56, [20, 20, 0, 0]); g.fill();
        g.fillStyle = TA('#7A3A74', 0.5); g.fillRect(-0.8, -56, 1.6, 56);
        g.fillStyle = T('#FFD76A'); g.beginPath(); g.arc(-5, -24, 2.2, 0, TAU); g.arc(5, -24, 2.2, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(0, -70); g.bezierCurveTo(-9, -80, -14, -66, 0, -60); g.bezierCurveTo(14, -66, 9, -80, 0, -70); g.fillStyle = T('#FF8FC0'); g.fill();   // a heart over the gate
        CWIN.push([0, -30, 34, 50]);
        for (let i = 0; i < 3; i++){ g.fillStyle = lg(g, 0, i * 4, 0, i * 4 + 5, [[0, T('#FFFFFF')], [1, T(WALL_D)]]); g.beginPath(); g.roundRect(-30 - i * 7, i * 4 - 1, 60 + i * 14, 5.5, 2); g.fill(); }
        g.restore();
      }

      const hill1Y = x => 568 - 20 * noise1(x * 0.0035 + 2) - 8 * Math.sin(x * 0.006);
      const hill2Y = x => 646 - 28 * noise1(x * 0.003 + 7) - 10 * Math.sin(x * 0.004 + 1);
      const hill3Y = x => 752 - 30 * noise1(x * 0.0026 + 4) - 8 * Math.sin(x * 0.005 + 2);
      const castleHillY = x => { const u = (x - CASTLE.x) / (300 * CASTLE.s); return CASTLE.y + 6 + (Math.abs(u) < 1.6 ? 54 * CASTLE.s * (1 - Math.cos(Math.min(1, Math.abs(u)) * Math.PI)) * 0.5 + (Math.abs(u) > 1 ? (Math.abs(u) - 1) * 30 : 0) : 60); };
      function paintFar(){
        const g = farL.cx;
        g.setTransform(farL.dpr, 0, 0, farL.dpr, 0, -FAR_TOP * farL.dpr);
        g.clearRect(0, FAR_TOP, DW, farL.h);
        paintRange(g, mtnFY, L.mtnF, 334, HZ + 20);
        // haze between the ranges
        g.fillStyle = lg(g, 0, 400, 0, HZ + 20, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.5)]]); g.fillRect(0, 400, DW, HZ + 20 - 400);
        paintRange(g, mtnNY, L.mtnN, 404, HZ + 20);
        g.fillStyle = lg(g, 0, 470, 0, HZ + 20, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.6)]]); g.fillRect(0, 470, DW, HZ + 20 - 470);
        // the castle's hill, with the path winding down from the gate
        const cx = CASTLE.x, s = CASTLE.s, hw = 480 * s;
        g.beginPath(); g.moveTo(cx - hw, HZ + 24);
        for (let x = cx - hw; x <= cx + hw; x += 10) g.lineTo(x, Math.min(HZ + 24, castleHillY(x)));
        g.lineTo(cx + hw, HZ + 24); g.closePath();
        g.fillStyle = lg(g, 0, CASTLE.y, 0, HZ + 24, [[0, rgb(mixc(L.hF, [255, 255, 255], 0.22))], [1, rgb(L.hF)]]); g.fill();
        g.fillStyle = TA('#FFF3DC', 0.9);
        g.beginPath(); g.moveTo(cx - 13 * s, CASTLE.y + 8); g.bezierCurveTo(cx - 30 * s, CASTLE.y + 26, cx + 40 * s, CASTLE.y + 30, cx - 10 * s, HZ + 24);
        g.lineTo(cx - 62 * s, HZ + 24); g.bezierCurveTo(cx - 6 * s, CASTLE.y + 36, cx - 56 * s, CASTLE.y + 24, cx + 13 * s, CASTLE.y + 8); g.closePath(); g.fill();
        // a soft shadow under the walls, then the castle
        g.fillStyle = rgb(mixc(L.hD, [40, 20, 80], 0.3), 0.22); g.beginPath(); g.ellipse(cx + 14 * s, CASTLE.y + 5, 176 * s, 12 * s, 0, 0, TAU); g.fill();
        paintCastle(g, cx, CASTLE.y + 4, s);
      }

      // ── the crystal cliff: lilac rock in facets, a grassy cap, the dark cut of the falls
      const CRYSTALS = [[258, 694, 44, 0.16, 0], [286, 698, 30, -0.22, 1], [302, 700, 20, 0.34, 2], [22, 698, 34, -0.15, 2], [48, 700, 22, 0.2, 0], [118, 700, 24, 0.1, 1]];
      function crystal(g, x, y, h, rot, v){
        const C = [['#FFD0EA', '#F58CC4', '#C760A6'], ['#D2F6F2', '#84DCD8', '#4AAEBE'], ['#E6D4FF', '#B694F4', '#8662D2']][v];
        g.save(); g.translate(x, y); g.rotate(rot);
        const w = h * 0.34;
        g.fillStyle = T(C[1]); g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.66); g.lineTo(0, -h); g.lineTo(w, -h * 0.66); g.lineTo(w, 0); g.closePath(); g.fill();
        g.fillStyle = T(C[0]); g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.66); g.lineTo(0, -h); g.lineTo(-w * 0.1, -h * 0.6); g.lineTo(-w * 0.1, 0); g.closePath(); g.fill();
        g.fillStyle = TA(C[2], 0.75); g.beginPath(); g.moveTo(w, 0); g.lineTo(w, -h * 0.66); g.lineTo(0, -h); g.lineTo(w * 0.38, -h * 0.58); g.lineTo(w * 0.38, 0); g.closePath(); g.fill();
        g.restore();
      }
      function paintCliff(g){
        g.save(); g.translate(0, CLIFF_FOOT); g.scale(CLX, CLY); g.translate(0, -CLIFF_FOOT);
        const top = CLIFF_TOP, foot = CLIFF_FOOT + 8, w = CLIFF_W;
        const body = () => { g.beginPath(); g.moveTo(-60, foot); g.lineTo(-60, top + 6); g.bezierCurveTo(40, top - 8, 160, top + 2, w - 46, top + 2);
          g.bezierCurveTo(w - 8, top + 6, w - 6, top + 60, w - 22, top + 110); g.bezierCurveTo(w - 40, top + 190, w + 6, top + 240, w + 16, foot); g.closePath(); };
        body(); g.fillStyle = lg(g, 0, 0, w, 0, [[0, rgb(mixc(L.cliff, [255, 255, 255], 0.16))], [0.55, rgb(L.cliff)], [1, rgb(mixc(L.cliff, L.cliffD, 0.6))]]); g.fill();
        g.save(); g.clip();
        // facets: long planes of lighter and darker rock, a few ledges
        const r = makeRng(55);
        for (let x = -60; x < w + 20;){                       // crystal columns: each lit on its left, dark on its right
          const ww = 22 + r() * 30, drop = r() * 46;
          g.fillStyle = lg(g, x, 0, x + ww, 0, [[0, 'rgba(255,255,255,' + (0.3 + r() * 0.16) + ')'], [0.3, 'rgba(255,255,255,0.04)'], [0.7, rgb(L.cliffD, 0.05)], [1, rgb(L.cliffD, 0.42 + r() * 0.14)]]);
          g.fillRect(x, top - 10 + drop * 0.2, ww, foot - top + 10);
          g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(x, top + 14 + drop); g.lineTo(x + ww * 0.5, top + 2 + drop); g.lineTo(x + ww, top + 18 + drop); g.lineTo(x + ww, top + 30 + drop); g.lineTo(x, top + 26 + drop); g.closePath(); g.fill();
          x += ww;
        }
        g.fillStyle = lg(g, 0, top, 0, foot, [[0, 'rgba(255,220,240,0.22)'], [0.5, 'rgba(255,255,255,0)'], [1, rgb(L.cliffD, 0.2)]]); g.fillRect(-60, top - 10, w + 90, foot - top + 10);
        g.strokeStyle = rgb(L.cliffD, 0.3); g.lineWidth = 2.4; g.lineCap = 'round';
        for (let i = 0; i < 6; i++){ const y = top + 46 + i * 44 + r() * 14, x = -30 + r() * 200; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 40, y + 6, x + 70 + r() * 50, y - 2); g.stroke(); }
        // the cut of the falls: a dark wet recess, lighter lips
        g.fillStyle = lg(g, FALL_X - FALL_W / 2 - 8, 0, FALL_X + FALL_W / 2 + 8, 0, [[0, rgb(L.cliffD, 0.9)], [0.5, rgb(mixc(L.cliffD, L.waterD, 0.5), 0.95)], [1, rgb(L.cliffD, 0.9)]]);
        g.beginPath(); g.roundRect(FALL_X - FALL_W / 2 - 8, top - 4, FALL_W + 16, foot - top + 4, 10); g.fill();
        g.fillStyle = lg(g, 0, foot - 90, 0, foot, [[0, rgb(L.cliffD, 0)], [1, rgb(L.cliffD, 0.42)]]); g.fillRect(-60, foot - 90, w + 90, 90);   // the foot in shade
        g.restore();
        // the grassy cap, hanging over the edge in scallops, with a lighter crest
        g.fillStyle = lg(g, 0, top - 14, 0, top + 18, [[0, rgb(mixc(L.hF, [255, 255, 255], 0.2))], [1, rgb(L.hN)]]);
        g.beginPath(); g.moveTo(-60, top + 10); g.lineTo(-60, top - 4); g.bezierCurveTo(40, top - 18, 160, top - 9, w - 44, top - 8); g.quadraticCurveTo(w - 16, top - 6, w - 12, top + 8);
        for (let x = w - 12; x > -50; x -= 26){ if (x < FALL_X + FALL_W / 2 + 26 && x > FALL_X - FALL_W / 2) { g.lineTo(FALL_X + FALL_W / 2 + 6, top + 4); g.lineTo(FALL_X - FALL_W / 2 - 6, top + 4); x = FALL_X - FALL_W / 2; continue; } g.quadraticCurveTo(x - 13, top + 22, x - 26, top + 8); }
        g.closePath(); g.fill();
        // vines hang from the cap, dotted with blossom
        const rv = makeRng(91); g.lineCap = 'round';
        for (let i = 0; i < 7; i++){
          const x = -30 + i * 46 + rv() * 20, len = 34 + rv() * 60; if (Math.abs(x - FALL_X) < FALL_W / 2 + 12) continue;
          g.strokeStyle = rgb(mixc(L.hN, L.hD, 0.5)); g.lineWidth = 2.6;
          g.beginPath(); g.moveTo(x, top + 4); g.quadraticCurveTo(x + 8, top + len * 0.5, x - 3, top + len); g.stroke();
          for (let k = 1; k <= 3; k++){ const yy = top + len * k / 3.4, xx = x + Math.sin(k * 1.3) * 4;
            g.fillStyle = rgb(mixc(L.hF, L.hM, 0.5)); g.beginPath(); g.ellipse(xx + 4, yy, 5.5, 2.6, 0.5, 0, TAU); g.fill();
            if ((i + k) % 2){ g.fillStyle = T(k % 2 ? '#FF9CC8' : '#FFFFFF'); g.beginPath(); g.arc(xx - 2, yy + 2, 2.8, 0, TAU); g.fill(); } }
        }
        for (const c of CRYSTALS) crystal(g, c[0], c[1], c[2], c[3], c[4]);
        g.restore();
      }

      // ── blossom trees: a curvy plum trunk under a cloud of blossom
      const BLOSSOM = [['#FFD3E6', '#FFA8CE', '#F07FB4'], ['#EBD8FF', '#CDAAF8', '#A982E8'], ['#FFF0F4', '#FFD2E0', '#F8A8C6']];
      function paintTree(g, x, y, s, v){
        const C = BLOSSOM[v % 3], r = makeRng(300 + v * 17 + Math.round(x));
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = rgb(mixc(L.hD, [30, 20, 70], 0.35), 0.2); g.beginPath(); g.ellipse(8, 2, 78, 11, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, -14, 0, 16, 0, [[0, T('#B07A8C')], [1, T('#7C4E66')]]);
        g.beginPath(); g.moveTo(-15, 2); g.bezierCurveTo(-6, -30, -12, -64, -4, -100); g.lineTo(-34, -132); g.lineTo(-28, -136); g.lineTo(0, -112);
        g.lineTo(6, -146); g.lineTo(13, -144); g.lineTo(9, -108); g.lineTo(36, -128); g.lineTo(40, -122); g.lineTo(12, -96); g.bezierCurveTo(8, -60, 10, -28, 19, 2); g.closePath(); g.fill();
        // the crown: shaded puffs underneath, lit puffs on top, loose blossom dots
        const puffs = [];
        for (let i = 0; i < 13; i++){ const a = i / 13 * TAU + r() * 0.4, d = 20 + r() * 44; puffs.push([Math.cos(a) * d * 1.25, -150 + Math.sin(a) * d * 0.7, 30 + r() * 20]); }
        puffs.push([0, -152, 46]);
        g.fillStyle = T(C[2]); for (const p of puffs){ g.beginPath(); g.arc(p[0] + 4, p[1] + 9, p[2], 0, TAU); g.fill(); }
        g.fillStyle = T(C[1]); for (const p of puffs){ g.beginPath(); g.arc(p[0], p[1], p[2] * 0.94, 0, TAU); g.fill(); }
        g.fillStyle = T(C[0]); for (const p of puffs){ g.beginPath(); g.arc(p[0] - p[2] * 0.2, p[1] - p[2] * 0.26, p[2] * 0.62, 0, TAU); g.fill(); }
        for (let i = 0; i < 26; i++){ const a = r() * TAU, d = r() * 70; g.fillStyle = i % 3 ? TA('#FFFFFF', 0.85) : T('#FF7FB4'); g.beginPath(); g.arc(Math.cos(a) * d * 1.2, -150 + Math.sin(a) * d * 0.72, 2 + r() * 2.2, 0, TAU); g.fill(); }
        g.restore();
      }
      const SHROOM = [['#FF9DBE', '#F06C9E'], ['#C8A6FA', '#9A76E4'], ['#9FE8E0', '#58C4C4']];
      function paintShroom(g, x, y, s, v){
        const C = SHROOM[v % 3];
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = rgb(mixc(L.hD, [30, 20, 70], 0.3), 0.22); g.beginPath(); g.ellipse(2, 1, 26, 5, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, -9, 0, 9, 0, [[0, T('#FFF8EE')], [1, T('#E9D4D8')]]); g.beginPath(); g.roundRect(-8, -26, 16, 28, 7); g.fill();
        g.fillStyle = lg(g, 0, -52, 0, -22, [[0, T(C[0])], [1, T(C[1])]]);
        g.beginPath(); g.moveTo(-28, -22); g.bezierCurveTo(-28, -58, 28, -58, 28, -22); g.quadraticCurveTo(0, -14, -28, -22); g.fill();
        g.fillStyle = TA('#FFFFFF', 0.92); for (const d of [[-13, -34, 4.4], [3, -42, 5.2], [15, -30, 3.6], [-3, -27, 2.8]]){ g.beginPath(); g.arc(d[0], d[1], d[2], 0, TAU); g.fill(); }
        g.restore();
      }
      function paintBush(g, x, y, s, seed){
        const r = makeRng(seed);
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = rgb(mixc(L.hD, [30, 20, 70], 0.3), 0.2); g.beginPath(); g.ellipse(4, 2, 58, 9, 0, 0, TAU); g.fill();
        const lobes = []; for (let i = 0; i < 6; i++) lobes.push([-40 + i * 16 + r() * 8, -16 - Math.sin(i / 5 * Math.PI) * 18 - r() * 6, 20 + r() * 9]);
        g.fillStyle = rgb(L.hD); for (const l of lobes){ g.beginPath(); g.arc(l[0] + 3, l[1] + 6, l[2], 0, TAU); g.fill(); }
        g.fillStyle = rgb(mixc(L.hN, L.hM, 0.5)); for (const l of lobes){ g.beginPath(); g.arc(l[0], l[1], l[2] * 0.92, 0, TAU); g.fill(); }
        g.fillStyle = rgb(mixc(L.hF, [255, 255, 255], 0.2)); for (const l of lobes){ g.beginPath(); g.arc(l[0] - 5, l[1] - 6, l[2] * 0.5, 0, TAU); g.fill(); }
        for (let i = 0; i < 7; i++){ g.fillStyle = T(BOW[(i + (seed % 6)) % 6]); g.beginPath(); g.arc(-38 + r() * 76, -34 + r() * 28, 3.2, 0, TAU); g.fill(); }
        g.restore();
      }

      // one meadow band: a rolling crest, a light rim, grass ticks and a sprinkle of flowers
      function paintBand(g, fy, c0, c1, bottom, k, seed){
        g.beginPath(); g.moveTo(-10, bottom);
        for (let x = -10; x <= DW + 10; x += 10) g.lineTo(x, fy(x));
        g.lineTo(DW + 10, bottom); g.closePath();
        const top = fy(DW / 2) - 40;
        g.fillStyle = lg(g, 0, top, 0, bottom, [[0, rgb(mixc(c0, [255, 255, 255], 0.2))], [0.22, rgb(c0)], [1, rgb(c1)]]); g.fill();
        g.strokeStyle = rgb(mixc(c0, [255, 255, 255], 0.5), 0.6); g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath(); for (let x = -10; x <= DW + 10; x += 10){ const y = fy(x) + 1.5; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        const r = makeRng(seed), n = Math.round(DW / (narrow ? 5 : 4.2) * k), depth = bottom - top - 40;
        g.lineCap = 'round';
        for (let i = 0; i < n; i++){
          const x = r() * DW, d = r(), y = fy(x) + 8 + d * depth, sz = (1.3 + d * 1.6) * (0.7 + k * 0.5), q = r();
          if (q < 0.42){ g.strokeStyle = rgb(q < 0.2 ? mixc(c1, [20, 60, 70], 0.2) : mixc(c0, [255, 255, 255], 0.35), 0.5); g.lineWidth = 1.3 * sz * 0.5;
            g.beginPath(); g.moveTo(x - 3 * sz, y); g.lineTo(x - 1.5 * sz, y - 4 * sz); g.moveTo(x, y); g.lineTo(x, y - 5 * sz); g.moveTo(x + 3 * sz, y); g.lineTo(x + 1.5 * sz, y - 4 * sz); g.stroke(); }
          else { const c = q < 0.6 ? '#FFFFFF' : BOW[(i * 7) % 6];
            g.fillStyle = TA(c, 0.92); g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill();
            if (sz > 2.1){ g.fillStyle = TA('#FFE27A', 0.95); g.beginPath(); g.arc(x, y, sz * 0.4, 0, TAU); g.fill(); } }
        }
      }
      function paintPond(g){
        const P = POND;
        g.fillStyle = rgb(mixc(L.hD, [30, 30, 80], 0.3), 0.25); g.beginPath(); g.ellipse(P.x, P.y + 5, P.rx + 16, P.ry + 10, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, P.y - P.ry - 8, 0, P.y + P.ry + 8, [[0, T('#FFF1E4')], [1, T('#EBCFD8')]]);          // a pale sandy rim
        g.beginPath(); g.ellipse(P.x, P.y, P.rx + 9, P.ry + 6, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, P.y - P.ry, 0, P.y + P.ry, [[0, rgb(mixc(L.water, L.hz, 0.25))], [0.45, rgb(L.water)], [1, rgb(L.waterD)]]);
        g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(P.x - P.rx * 0.2, P.y - P.ry * 0.62, P.rx * 0.6, P.ry * 0.3, 0, 0, TAU); g.fill();
        g.restore();
        // pebbles on the rim, reeds at the far side, lily pads (the blooms open by day)
        const r = makeRng(88);
        for (let i = 0; i < 9; i++){ const a = r() * TAU, x = P.x + Math.cos(a) * (P.rx + 8), y = P.y + Math.sin(a) * (P.ry + 5); g.fillStyle = T(i % 2 ? '#E2CBE2' : '#FFF6EC'); g.beginPath(); g.ellipse(x, y, 7 + r() * 5, 4 + r() * 2, 0, 0, TAU); g.fill(); }
        g.strokeStyle = rgb(L.hD); g.lineWidth = 2.6; g.lineCap = 'round';
        for (let i = 0; i < 6; i++){ const x = P.x + P.rx * (0.5 + i * 0.07), y = P.y - P.ry * 0.5 + i * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - 22, x + (i % 2 ? 9 : -5), y - 40 - i * 3); g.stroke();
          if (i % 2){ g.fillStyle = T('#B07A6A'); g.beginPath(); g.roundRect(x + 5, y - 48 - i * 3, 5, 14, 2.5); g.fill(); } }
        for (const l of LILIES){
          g.fillStyle = rgb(mixc(L.hN, L.hD, 0.5)); g.beginPath(); g.ellipse(l.x, l.y, 17 * l.s, 6.5 * l.s, 0, 0.5, TAU - 0.2); g.lineTo(l.x, l.y); g.fill();
          g.fillStyle = rgb(mixc(L.hF, [255, 255, 255], 0.2), 0.6); g.beginPath(); g.ellipse(l.x - 3 * l.s, l.y - 1.2 * l.s, 9 * l.s, 3 * l.s, 0, 0, TAU); g.fill();
          if (l.bloom){ for (let i = -2; i <= 2; i++){ g.fillStyle = T(i % 2 ? '#FFC2DE' : '#FF9CC8'); g.beginPath(); g.ellipse(l.x + i * 3.4 * l.s, l.y - 6 * l.s + Math.abs(i) * 1.6 * l.s, 3.2 * l.s, 7 * l.s, i * 0.36, 0, TAU); g.fill(); }
            g.fillStyle = T('#FFE27A'); g.beginPath(); g.arc(l.x, l.y - 4 * l.s, 2.4 * l.s, 0, TAU); g.fill(); }
        }
      }
      function paintGround(){
        const g = groundL.cx;
        g.setTransform(groundL.dpr, 0, 0, groundL.dpr, 0, -GROUND_TOP * groundL.dpr);
        g.clearRect(0, GROUND_TOP, DW, groundL.h);
        paintBand(g, hill1Y, L.hF, L.hM, 700, 0.5, 11);
        // the castle path comes on across the first meadow
        const cx = CASTLE.x, s = CASTLE.s;
        g.fillStyle = TA('#FFF3DC', 0.85);
        g.beginPath(); g.moveTo(cx - 62 * s, hill1Y(cx) - 2); g.bezierCurveTo(cx - 130 * s, 600, cx - 60 * s, 624, cx - 190 * s, 668);
        g.lineTo(cx - 96 * s, 668); g.bezierCurveTo(cx - 10 * s, 630, cx - 70 * s, 600, cx - 10 * s, hill1Y(cx) - 2); g.closePath(); g.fill();
        for (const tr of TREES) if (tr.y < 636 && tr.y > CY(CLIFF_TOP) + 60) paintTree(g, tr.x, tr.y, tr.s, tr.v);
        for (const b of BUSHES) if (b.y < 650) paintBush(g, b.x, b.y, b.s, b.seed);
        paintBand(g, hill2Y, L.hM, L.hN, 800, 0.8, 23);
        for (const tr of TREES) if (tr.y >= 636 && tr.y < 742) paintTree(g, tr.x, tr.y, tr.s, tr.v);
        for (const b of BUSHES) if (b.y >= 650 && b.y < 742) paintBush(g, b.x, b.y, b.s, b.seed);
        for (const m of SHROOMS) if (m.y < 742) paintShroom(g, m.x, m.y, m.s, m.v);
        // the cliff stands on the second meadow, its tree on top; the pond at its foot
        paintCliff(g);
        for (const tr of TREES) if (tr.y <= CY(CLIFF_TOP) + 60) paintTree(g, tr.x, tr.y, tr.s, tr.v);
        paintBand(g, hill3Y, L.hN, L.hD, DH + 4, 1.1, 37);
        paintPond(g);
        for (const b of BUSHES) if (b.y >= 742) paintBush(g, b.x, b.y, b.s, b.seed);
        for (const m of SHROOMS) if (m.y >= 742) paintShroom(g, m.x, m.y, m.s, m.v);
      }
      const frontY = x => 852 + 12 * noise1(x * 0.006 + 9) - 8 * Math.sin(x * 0.004);
      function paintFront(){
        const g = frontL.cx;
        g.setTransform(frontL.dpr, 0, 0, frontL.dpr, 0, -FRONT_TOP * frontL.dpr);
        g.clearRect(0, FRONT_TOP, DW, frontL.h);
        g.beginPath(); g.moveTo(-10, DH + 4);
        for (let x = -10; x <= DW + 10; x += 10) g.lineTo(x, frontY(x));
        g.lineTo(DW + 10, DH + 4); g.closePath();
        g.fillStyle = lg(g, 0, 846, 0, DH, [[0, rgb(mixc(L.hN, L.hD, 0.4))], [1, rgb(mixc(L.hD, [20, 40, 80], 0.3))]]); g.fill();
        const r = makeRng(404); g.lineCap = 'round';
        for (let i = 0, n = Math.round(DW / 7); i < n; i++){
          const x = r() * DW, y = frontY(x) + 4 + r() * 10, h = 12 + r() * 20, lean = (r() - 0.5) * 12;
          g.strokeStyle = rgb(r() < 0.5 ? mixc(L.hN, [255, 255, 255], 0.16) : L.hD, 0.9); g.lineWidth = 2 + r() * 1.6;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke();
        }
      }
      // ── the big front flowers: five kinds, baked small per look, swaying live
      const FLW = [], FW = 84, FH = 118;
      for (let v = 0; v < 5; v++) FLW.push(makeLayer(FW, FH, 1));
      function paintFlower(v){
        const g = FLW[v].cx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FW, FH); g.translate(FW / 2, FH - 4);
        g.strokeStyle = rgb(mixc(L.hN, L.hD, 0.6)); g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -40, 0, -78); g.stroke();
        g.fillStyle = rgb(mixc(L.hM, L.hD, 0.4));
        g.beginPath(); g.ellipse(-11, -26, 12, 5, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(10, -40, 11, 4.6, 0.6, 0, TAU); g.fill();
        const C = [['#FFFFFF', '#FFE27A'], ['#FF9CC8', '#FFD76A'], ['#C8A6FA', '#FFF2A8'], ['#FFD76A', '#FF9A6A'], ['#9FDCFF', '#FFFFFF']][v], n = v === 1 ? 6 : v === 3 ? 5 : 8;
        g.translate(0, -80);
        for (let i = 0; i < n; i++){ g.save(); g.rotate(i / n * TAU); g.fillStyle = T(C[0]); g.beginPath(); g.ellipse(0, -13, v === 1 ? 8.5 : 5.6, 12, 0, 0, TAU); g.fill();
          g.fillStyle = TA('#FFFFFF', 0.35); g.beginPath(); g.ellipse(-1.4, -15, 2, 7, 0, 0, TAU); g.fill(); g.restore(); }
        g.fillStyle = T(C[1]); g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
        g.fillStyle = TA('#FFFFFF', 0.5); g.beginPath(); g.arc(-2, -2, 2.6, 0, TAU); g.fill();
      }
      function drawFlowers(g, t){
        for (const f of FLOWERS){
          const sw = Math.sin(t * 1.1 + f.ph) * 0.07 + Math.sin(t * 0.43 + f.x * 0.01) * 0.05 + (f.kick ? Math.sin((t - f.kick) * 14) * 0.3 * Math.max(0, 1 - (t - f.kick) / 0.9) : 0);
          g.save(); g.translate(f.x, f.y); g.rotate(sw); g.scale(f.s * f.f, f.s);
          g.drawImage(FLW[f.v].cv, -FW / 2, -FH + 4, FW, FH); g.restore();
        }
      }
      // the vignette: a small radial sprite stretched over the whole screen
      vigL = makeLayer(64, 64, 1);
      vigL.cx.fillStyle = rg(vigL.cx, 32, 30, 14, 46, [[0, 'rgba(60,20,90,0)'], [0.62, 'rgba(60,20,90,0.03)'], [1, 'rgba(50,16,84,0.3)']]);
      vigL.cx.fillRect(0, 0, 64, 64);

      let lookSig = '';
      function repaintIfNeeded(){
        const key = Math.floor(tod * KEYS.length * 24);
        if (key === lookKey) return;
        lookKey = key; L = lookAt(tod);
        // a key is HELD for a third of its span — nothing moved, nothing to repaint
        const sig = rgb(L.top) + rgb(L.hN) + rgb(L.cliff) + rgb(L.tint) + rgb(L.lit) + L.daylight.toFixed(3);
        if (sig === lookSig) return;
        lookSig = sig;
        LIT = [Math.round(L.lit[0] / 255 * 50) / 50, Math.round(L.lit[1] / 255 * 50) / 50, Math.round(L.lit[2] / 255 * 50) / 50];
        paintSky(); paintFar(); paintGround(); paintFront();
        for (let v = 0; v < 3; v++) tintSprite(CLOUD_SRC[v], CLOUD_T[v], L.cloud, L.cloudS);
        for (let v = 0; v < 5; v++) paintFlower(v);
        perf.repaints++;
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = Math.max(1, Math.round(W * DPR)); canvas.height = Math.max(1, Math.round(H * DPR));
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H)))); AXK = Math.min(1, DW / DW0);
        S = H / DH; OX = (W - DW * S) / 2; OY = 0;
        if (DW !== layoutDW){ layout(); bakeRainbow(); recast(); }
        const ld = DPR * S;                                  // layer pixels per design unit
        skyL = makeLayer(4, 256, 1);
        farL = makeLayer(DW, HZ + 24 - FAR_TOP, ld); groundL = makeLayer(DW, DH - GROUND_TOP, ld); frontL = makeLayer(DW, DH - FRONT_TOP, ld);
        lookKey = -1; lookSig = ''; repaintIfNeeded(); warmTs = 0;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE CAST — the mare and her foal, visitors, the flyer, bunnies, swans
      // ══════════════════════════════════════════════════════════════════════
      let rigsReady = false, autoCast = true, nextVisitAt = 9, nextFlyAt = 16;
      const FAMILY = [], VISITORS = [], BUNNIES = [], SWANS = [], ARCS = [];
      let flyer = null;
      const coats = () => (window.UnicornRig && window.UnicornRig.COATS) || COATS_FALLBACK;
      const laneY = k => lerp(ZONE.y0, ZONE.y1, k);
      const laneS = k => 0.84 + 0.3 * k;                     // nearer = bigger
      const uniS = () => 168 / ((window.UnicornRig && window.UnicornRig.HEIGHT) || 168) * UNI.sc * CS;   // rig units → design px
      function makeUni(role, coat, x, lane, dir, o){
        o = o || {};
        const R = window.UnicornRig, k = (o.foal ? 0.6 : 1) * (o.k || 1);
        return { type: 'uni', role, R, lane, k, act: null, yOff: 0, rot: 0, pauseUntil: 0, nextActAt: lastT + rnd(8, 20), tx: x, tl: lane,
                 q: { x, y: laneY(lane), s: uniS() * laneS(lane) * k, dir, ph: Math.random() * TAU, wt: Math.random() * TAU, moving: false, go: 0, run: false,
                      pose: 0, tint: 1, lit: LIT, coat, wings: !!o.wings, fly: 0, foal: !!o.foal, glow: 0 } };
      }
      // move an actor by dx, dy: the walk phase follows the distance so the feet stay planted
      function advance(a, dx, dt){
        const q = a.q, R = a.R, d = Math.abs(dx);
        q.moving = d > 0.0001;
        q.go += ((q.moving ? 1 : 0) - q.go) * Math.min(1, dt * 5);
        if (q.moving) q.wt += TAU * d / (((q.run ? R.RUN_STRIDE : R.STRIDE) || 100) * q.s);
        q.lit = LIT; q.glow += ((a.act ? 1 : clamp01(0.9 - L.daylight) * 0.9) - q.glow) * Math.min(1, dt * 4);
      }
      // the family wanders the meadow: the mare strolls from spot to spot, the
      // foal keeps near her and breaks into a gallop when she gets too far
      function buildFamily(){
        FAMILY.length = 0;
        if (!rigsReady) return;
        const x = lerp(ZONE.x0, ZONE.x1, narrow ? 0.45 : 0.3);
        FAMILY.push(makeUni('mare', 'pearl', x, 0.55, 1));
        FAMILY.push(makeUni('foal', pick(['rose', 'lilac', 'sky']), x - 170 * CS, 0.8, 1, { foal: true }));
      }
      function retarget(a, t){
        const mare = FAMILY[0];
        if (a.role === 'foal' && mare){ a.tx = clamp(mare.q.x + (Math.random() < 0.5 ? -1 : 1) * rnd(120, 210) * CS, ZONE.x0, ZONE.x1); a.tl = clamp(mare.lane + rnd(-0.35, 0.45), 0, 1); }
        else { a.tx = rnd(ZONE.x0, ZONE.x1); a.tl = rnd(0.15, 0.95); }
      }
      function stepFamily(a, t, dt){
        const q = a.q; let dx = 0;
        if (!a.act && t >= a.pauseUntil){
          const mare = FAMILY[0], ex = a.tx - q.x, el = a.tl - a.lane, far = a.role === 'foal' && mare && Math.abs(mare.q.x - q.x) > 260 * CS;
          if (far && !q.run){ q.run = true; retarget(a, t); }
          if (Math.abs(ex) < 6){ q.run = false; a.pauseUntil = t + (a.role === 'foal' ? rnd(1.5, 4) : rnd(4, 9)); retarget(a, t); }
          else {
            q.dir = ex > 0 ? 1 : -1;
            const sp = (q.run ? UNI.runSpeed * 0.75 : UNI.speed * (a.role === 'foal' ? 1.25 : 1)) * CS * laneS(a.lane);
            dx = q.dir * Math.min(Math.abs(ex), sp * dt); q.x += dx;
            a.lane += clamp(el, -1, 1) * Math.min(1, Math.abs(dx) / Math.max(1, Math.abs(ex))) ;
            a.lane = clamp(a.lane, 0, 1);
          }
        }
        q.y = laneY(a.lane); q.s = uniS() * laneS(a.lane) * a.k;
        advance(a, dx, dt);
        if (!a.act && autoCast && t > a.nextActAt && !q.run){ a.nextActAt = t + rnd(14, 30); startAct(a, pickAct(a), t); }
      }
      // visitors: a party of one to three in a lane of its own, crossing at a
      // walk or a gallop — every coat but the mare's
      function spawnVisitors(t, o){
        if (!rigsReady) return null;
        o = o || {};
        const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), run = o.run === undefined ? Math.random() < 0.35 : !!o.run;
        const lane = o.lane === undefined ? rnd(0.05, 1) : o.lane, n = o.n || (narrow ? 1 : pick([1, 2, 2, 3]));
        const pool = coats().filter(c => c !== 'pearl'), party = { dir, run, lane, haltUntil: 0, members: [], nextActAt: t + rnd(3, 8) };
        let back = 0;
        for (let i = 0; i < n; i++){
          const foal = o.foal === undefined ? (i > 0 && Math.random() < 0.3) : (!!o.foal && i === n - 1 && n > 1);
          const a = makeUni('visitor', o.coat && i === 0 ? o.coat : pool.splice(Math.floor(Math.random() * pool.length), 1)[0] || 'rose',
                            0, clamp(lane + (i ? rnd(-0.08, 0.08) : 0), 0, 1), dir, { foal, wings: o.wings === undefined ? Math.random() < 0.2 : !!o.wings, k: 0.94 + Math.random() * 0.1 });
          const hw = a.R.WIDTH * a.q.s;
          back += i ? hw * 1.25 + rnd(10, 50) * CS : 0;
          a.q.x = dir > 0 ? -hw * 1.3 - back : DW + hw * 1.3 + back; back += hw * 1.25;
          a.q.run = run; a.party = party; party.members.push(a);
        }
        VISITORS.push(party); return party;
      }
      function stepParty(p, t, dt){
        const halted = t < p.haltUntil; let gone = true, onStage = null;
        for (const a of p.members){
          const q = a.q; let dx = 0;
          if (!halted && !(a.act && a.act.type !== 'jump')){ dx = p.dir * (p.run ? UNI.runSpeed : UNI.speed) * CS * laneS(a.lane) * dt; q.x += dx; }
          advance(a, dx, dt);
          const edge = a.R.WIDTH * q.s * 1.5 + 40;
          if (p.dir > 0 ? q.x < DW + edge : q.x > -edge) gone = false;
          if (q.x > 70 && q.x < DW - 70 && !a.act && (!onStage || Math.random() < 0.4)) onStage = a;
        }
        if (autoCast && onStage && t > p.nextActAt){ p.nextActAt = t + rnd(6, 14); startAct(onStage, pickAct(onStage), t); }
        return gone;
      }
      // the flyer: a winged unicorn crossing the sky on a ribbon of rainbow
      function spawnFlyer(t, o){
        if (!rigsReady || flyer) return null;
        o = o || {};
        const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), a = makeUni('flyer', o.coat || pick(coats()), 0, 0, dir, { wings: true });
        a.q.s = uniS() * (o.s || rnd(0.52, 0.7)); a.q.fly = 1; a.q.run = true; a.q.go = 1; a.q.moving = true;
        a.base = o.y === undefined ? rnd(130, 330) : o.y; a.q.x = dir > 0 ? -160 : DW + 160; a.q.y = a.base; a.trail = []; a.sp = rnd(120, 170) * Math.max(0.7, CS);
        flyer = a; return a;
      }
      function stepFlyer(t, dt){
        const a = flyer, q = a.q; if (!a) return;
        q.x += q.dir * a.sp * dt; q.y = a.base + Math.sin(t * 0.9 + q.ph) * 26 + a.yOff;
        q.wt += dt * TAU * 1.2; q.lit = LIT; q.glow = 0.6 + 0.4 * clamp01(1 - L.daylight);
        a.tilt = Math.cos(t * 0.9 + q.ph) * 0.1 * q.dir;
        const tx = q.x - q.dir * a.R.WIDTH * q.s * 0.7, ty = q.y - a.R.HEIGHT * q.s * 0.45;
        a.trail.push(tx, ty); if (a.trail.length > 84) a.trail.splice(0, 2);
        if (Math.random() < dt * 14) fx('star', tx + rnd(-8, 8), ty + rnd(-10, 10), { vx: -q.dir * rnd(10, 50), vy: rnd(-12, 30), g: 24, life: rnd(0.8, 1.5), c: Math.random() < 0.4 ? '#FFFFFF' : pick(BOW), s: rnd(0.6, 1.1) });
        if (q.x < -260 || q.x > DW + 260) flyer = null;
      }
      function drawTrail(g, a){
        const tr = a.trail, n = tr.length / 2; if (n < 3) return;
        const wd = 3.2 * a.q.s / 0.6;
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let b = 0; b < BOW.length; b++){
          const off = (b - 2.5) * wd;
          g.strokeStyle = BOW[b]; g.lineWidth = wd * 1.15;
          for (let i = 1; i < n; i += 3){                    // three-point pieces so the ribbon can fade along its length
            const j = Math.min(n - 1, i + 3);
            g.globalAlpha = 0.75 * (i / n) * (i / n);
            g.beginPath(); g.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1] + off);
            for (let k = i; k <= j; k++) g.lineTo(tr[k * 2], tr[k * 2 + 1] + off);
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      }

      // bunnies in the front grass: sit, look about, then a few hops along
      function buildSmall(){
        BUNNIES.length = 0; SWANS.length = 0;
        if (!rigsReady) return;
        const B = window.BunnyRig, SW = window.SwanRig;
        if (B){
          const n = narrow ? 2 : 3, bc = B.COATS || ['snow'];
          for (let i = 0; i < n; i++){
            const s = 62 / (B.HEIGHT || 62) * clamp(DW / 1000, 0.7, 1) * rnd(0.9, 1.1);
            BUNNIES.push({ type: 'bunny', role: 'bunny', R: B, act: null, yOff: 0, hops: 0, hopK: 0, x0: 0, nextHopAt: rnd(1, 5), nextActAt: rnd(10, 30),
                           q: { x: DW * (i + 0.3 + Math.random() * 0.4) / n, y: 880 + Math.random() * 12, s, dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * TAU,
                                lit: LIT, coat: bc[(i * 2 + Math.floor(Math.random() * 2)) % bc.length], hop: 0, pose: 0, nibble: 0 } });
          }
        }
        if (SW){
          const n = narrow ? 2 : 3;
          for (let i = 0; i < n; i++){
            const cyg = i > 0, s = (cyg ? 30 / (SW.CYGNET_HEIGHT || 40) : 54 / (SW.HEIGHT || 62)) * clamp(POND.rx / 190, 0.7, 1);
            SWANS.push({ type: 'swan', role: cyg ? 'cygnet' : 'swan', R: SW, act: null, yOff: 0, lag: i * 0.5, nextActAt: rnd(12, 30),
                         q: { x: POND.x, y: POND.y, s, dir: 1, ph: Math.random() * TAU, lit: LIT, pose: 0, cygnet: cyg, moving: true } });
          }
        }
      }
      function stepBunny(a, t, dt){
        const q = a.q, R = a.R; q.lit = LIT;
        if (a.act) return;
        if (a.hops > 0){
          a.hopK += dt / (R.HOP_SECONDS || 0.5);
          const k = Math.min(1, a.hopK), e = R.hopX ? R.hopX(k) : k;
          q.hop = k; q.x = a.x0 + q.dir * (R.HOP || 40) * q.s * e;
          if (k >= 1){ a.hops--; a.hopK = 0; a.x0 = q.x; q.hop = 0; if (a.hops <= 0) a.nextHopAt = t + rnd(2, 7); }
        } else {
          q.hop = 0; q.nibble = 0.5 + 0.5 * Math.sin(t * 0.4 + q.ph) > 0.8 ? 1 : 0;
          if (t > a.nextHopAt){
            if (q.x < 60) q.dir = 1; else if (q.x > DW - 60) q.dir = -1; else if (Math.random() < 0.35) q.dir = -q.dir;
            a.hops = 1 + Math.floor(Math.random() * 4); a.hopK = 0; a.x0 = q.x;
          } else if (autoCast && t > a.nextActAt){ a.nextActAt = t + rnd(16, 40); startAct(a, 'pose', t); }
        }
      }
      // the swan and her cygnets glide round the pond in a line
      function stepSwan(a, t, dt){
        const q = a.q, an = t * 0.16 - a.lag, x = POND.x + Math.cos(an) * POND.rx * 0.56 + POND.rx * 0.06, y = POND.y + Math.sin(an) * POND.ry * 0.42 + POND.ry * 0.12;
        if (!a.act){ q.dir = x >= q.x ? 1 : -1; q.x = x; q.y = y; q.moving = true; } else q.moving = false;
        q.lit = LIT;
        if (autoCast && !a.act && a.role === 'swan' && t > a.nextActAt){ a.nextActAt = t + rnd(20, 45); startAct(a, 'pose', t); }
      }

      // ── the tricks. A unicorn: the horn-flare rear (pose) with a burst of
      //    stars, a leap that leaves a little rainbow, a shower of hearts, the
      //    rare sparkly toot. A bunny or the swan: its own pose.
      function pickAct(a){
        if (a.type !== 'uni') return 'pose';
        const r = Math.random();
        return r < 0.4 ? 'pose' : r < 0.68 ? 'jump' : r < 0.93 ? 'hearts' : 'toot';
      }
      function startAct(a, type, t){
        if (!a || a.act) return false;
        if (a.type !== 'uni' || a.role === 'flyer') type = a.role === 'flyer' ? 'loop' : 'pose';
        else if (!ACT_DUR[type]) type = 'pose';
        const dur = type === 'pose' ? (a.R.ACT_SECONDS || ACT_DUR.pose) : type === 'loop' ? 1.1 : ACT_DUR[type];
        a.act = { type, t0: t, dur, fired: false, last: 0, x0: a.q.x };
        if (a.party && type !== 'jump') a.party.haltUntil = Math.max(a.party.haltUntil, t + dur + 0.25);
        if (a.type === 'bunny'){ a.hops = 0; a.q.hop = 0; }
        return true;
      }
      const hornXY = a => { const R = a.R; if (R.hornTip){ const p = R.hornTip(Object.assign({}, a.q, { y: a.q.y + a.yOff })); if (p && isFinite(p.x)) return p; } return { x: a.q.x + a.q.dir * R.WIDTH * a.q.s * 0.8, y: a.q.y + a.yOff - R.HEIGHT * a.q.s }; };
      function stepAct(a, t, dt){
        const A = a.act; if (!A) return;
        const q = a.q, p = (t - A.t0) / A.dur;
        if (p >= 1){
          a.act = null; a.yOff = 0; a.rot = 0; q.pose = 0;
          if (a.type === 'bunny'){ a.hops = 3; a.hopK = 0; a.x0 = q.x; if (Math.random() < 0.5) q.dir = -q.dir; }     // and away she hops
          return;
        }
        if (A.type === 'pose'){
          q.pose = p;
          if (a.type === 'uni' && !A.fired && p > 0.42){ A.fired = true; const h = hornXY(a); burst('star', h.x, h.y, 14, 190, { g: 50, life: 1.3, drag: 1.1, s: 1.2 }); burst('spark', h.x, h.y, 10, 120, { g: 40, life: 1 }); }
          if (a.type === 'swan' && !A.fired && p > 0.3){ A.fired = true; ripple(q.x, q.y + 3, t, true); burst('spark', q.x, q.y - 20 * q.s, 6, 80, { arc: [-2.8, -0.4], g: 220, life: 0.6, c: '#FFFFFF' }); }
        } else if (A.type === 'jump'){
          const sp = (q.run ? UNI.runSpeed : UNI.speed * 2.2) * CS * 0.9;
          if (!a.party && a.role !== 'flyer'){ const nx = clamp(q.x + q.dir * sp * dt, ZONE.x0, ZONE.x1); advance(a, nx - q.x, dt); q.x = nx; }
          a.yOff = -Math.sin(p * Math.PI) * 78 * q.s;
          if (!A.fired){ A.fired = true; ARCS.push({ x0: q.x, y: q.y, dir: q.dir, t0: t, a, x1: q.x, s: q.s }); }
          if (t - A.last > 0.05){ A.last = t; fx('spark', q.x - q.dir * 20 * q.s, q.y + a.yOff - 30 * q.s, { vx: -q.dir * rnd(10, 40), vy: rnd(-20, 30), g: 60, life: 0.8, c: pick(BOW), s: 1.2 }); }
        } else if (A.type === 'hearts'){
          a.yOff = -Math.abs(Math.sin(p * Math.PI * 3)) * 5 * q.s;
          if (t - A.last > 0.16 && p < 0.8){ A.last = t; fx('heart', q.x + rnd(-40, 40) * q.s, q.y - a.R.HEIGHT * q.s * rnd(0.5, 1), { vx: rnd(-14, 14), vy: rnd(-70, -40), g: -8, life: rnd(1.2, 1.9), c: pick(['#FF7FB4', '#FF9CC8', '#FFB8DC', '#C8A6FA']), s: rnd(0.9, 1.6) }); }
        } else if (A.type === 'toot'){
          a.rot = Math.sin(p * Math.PI * 6) * 0.05 * (1 - p);
          if (t - A.last > 0.13 && p > 0.18 && p < 0.72){ A.last = t; const vx = q.x - q.dir * a.R.WIDTH * q.s * 0.78, vy = q.y - a.R.HEIGHT * q.s * 0.5;
            fx('puff', vx, vy, { vx: -q.dir * rnd(30, 70), vy: rnd(-30, 6), g: -14, life: rnd(0.9, 1.4), c: pick(BOW), s: rnd(0.8, 1.4) * q.s, drag: 1.2 });
            fx('star', vx, vy, { vx: -q.dir * rnd(40, 100), vy: rnd(-50, 20), g: 30, life: 0.9, s: 0.8 }); }
        } else if (A.type === 'loop'){
          a.rot = -q.dir * smooth(p) * TAU; a.yOff = -Math.sin(p * Math.PI) * 30;
          if (!A.fired){ A.fired = true; burst('star', q.x, q.y - a.R.HEIGHT * q.s * 0.5, 12, 160, { g: 30, life: 1.2, drag: 1 }); }
        }
      }
      // a leap leaves a little rainbow from where she took off to where she lands
      function drawArcs(g, t){
        for (let i = ARCS.length - 1; i >= 0; i--){
          const r = ARCS[i], age = t - r.t0;
          if (r.a.act && r.a.act.type === 'jump') r.x1 = r.a.q.x;
          if (age > 2.6){ ARCS.splice(i, 1); continue; }
          const w = Math.abs(r.x1 - r.x0); if (w < 12) continue;
          const cx = (r.x0 + r.x1) / 2, rad = w / 2, a = age < 1.6 ? 0.85 : 0.85 * (1 - (age - 1.6)), bw = Math.max(1.6, 3.4 * r.s);
          const grow = r.a.act && r.a.act.type === 'jump' ? clamp01(age / r.a.act.dur) : 1;
          g.lineCap = 'round'; g.globalAlpha = Math.max(0, a);
          for (let b = 0; b < BOW.length; b++){
            g.strokeStyle = BOW[b]; g.lineWidth = bw;
            const a0 = r.dir > 0 ? Math.PI : TAU, a1 = r.dir > 0 ? Math.PI + Math.PI * grow : TAU - Math.PI * grow;
            g.beginPath(); g.ellipse(cx, r.y - 6 * r.s, Math.max(2, rad - b * bw), Math.max(2, (rad - b * bw) * 0.62 + 36 * r.s), 0, a0, a1, r.dir < 0); g.stroke();
          }
          g.globalAlpha = 1;
        }
      }

      function drawActor(g, a, t){
        const q = a.q, R = a.R;
        if (a.type === 'uni' && a.role !== 'flyer'){           // a soft ground shadow, shrinking under a leap
          const lift = clamp01(-a.yOff / (90 * q.s)), rx = R.WIDTH * q.s * 0.74 * (1 - lift * 0.4);
          g.fillStyle = 'rgba(40,30,90,' + (0.2 * (1 - lift * 0.5) * (0.5 + 0.5 * L.daylight)) + ')';
          g.beginPath(); g.ellipse(q.x, q.y + 2, rx, rx * 0.16, 0, 0, TAU); g.fill();
        }
        if (q.glow > 0.05 && a.type === 'uni'){ const h = hornXY(a); glow(g, 'warm', h.x, h.y, 34 * q.s * (1 + 0.15 * Math.sin(t * 3 + q.ph)), 0.45 * q.glow); }
        const y = q.y; q.y = y + a.yOff;
        if (a.rot || a.tilt){
          const py = q.y - R.HEIGHT * q.s * 0.5;
          g.save(); g.translate(q.x, py); g.rotate((a.rot || 0) + (a.tilt || 0)); g.translate(-q.x, -py);
          R.draw(g, q, t); g.restore();
        } else R.draw(g, q, t);
        q.y = y;
      }
      function recast(){
        VISITORS.length = 0; ARCS.length = 0; FX.length = 0; flyer = null;
        buildFamily(); buildSmall();
      }
      const everyone = () => { const all = FAMILY.slice(); for (const p of VISITORS) for (const a of p.members) all.push(a); if (flyer) all.push(flyer); return all.concat(BUNNIES, SWANS); };
      let ORDER = [];
      function stepCast(t, dt){
        if (!rigsReady) return;
        for (const a of FAMILY) stepFamily(a, t, dt);
        for (let i = VISITORS.length - 1; i >= 0; i--) if (stepParty(VISITORS[i], t, dt)) VISITORS.splice(i, 1);
        if (autoCast && t > nextVisitAt){ nextVisitAt = t + rnd(12, 28); if (VISITORS.length < (narrow ? 1 : 2)) spawnVisitors(t); }
        if (autoCast && t > nextFlyAt && !flyer){ nextFlyAt = t + rnd(28, 60); spawnFlyer(t); }
        if (flyer) stepFlyer(t, dt);
        for (const b of BUNNIES) stepBunny(b, t, dt);
        for (const s of SWANS) stepSwan(s, t, dt);
        const all = everyone();
        for (const a of all) stepAct(a, t, dt);
        ORDER = FAMILY.slice(); for (const p of VISITORS) for (const a of p.members) ORDER.push(a);
        ORDER.sort((p, q) => p.q.y - q.q.y);
        perf.cast = all.length;
      }
      function drawSky(g, t){ if (flyer && rigsReady){ drawTrail(g, flyer); drawActor(g, flyer, t); } }
      function drawCast(g, t){
        if (!rigsReady) return;
        const sw = SWANS.slice().sort((p, q) => p.q.y - q.q.y);
        for (const s of sw){
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(s.q.x - s.q.dir * 10 * s.q.s, s.q.y + 1, s.R.WIDTH * s.q.s * 1.1, 3 * s.q.s + 1, 0, 0, TAU); g.fill();   // the wake
          drawActor(g, s, t);
        }
        drawArcs(g, t);
        for (const a of ORDER) drawActor(g, a, t);
      }
      function drawFront(g, t){ if (rigsReady) for (const b of BUNNIES) drawActor(g, b, t); }
      // the frontmost actor under a point: bunnies, then the unicorns (nearest first), the flyer, the swans
      function hitCast(x, y){
        const hit = (a, pad) => { const q = a.q, w = a.R.WIDTH * q.s + pad, h = a.R.HEIGHT * q.s + pad; return Math.abs(x - q.x) < w && y > q.y + a.yOff - h && y < q.y + a.yOff + pad; };
        for (const b of BUNNIES) if (hit(b, 12)) return b;
        for (let i = ORDER.length - 1; i >= 0; i--) if (hit(ORDER[i], 6)) return ORDER[i];
        if (flyer && hit(flyer, 16)) return flyer;
        for (const s of SWANS) if (hit(s, 10)) return s;
        return null;
      }
      function tapActor(a, t){
        if (a.act) return;
        startAct(a, a.type === 'uni' ? pickAct(a) : 'pose', t);
        if (a.type === 'bunny') burst('heart', a.q.x, a.q.y - a.R.HEIGHT * a.q.s, 3, 60, { arc: [-2.4, -0.7], g: -10, life: 1.2, c: '#FF9CC8' });
      }
      // ── the cast's hooks
      const info = a => ({ type: a.type, role: a.role, coat: a.q.coat, x: a.q.x, y: a.q.y, s: a.q.s, dir: a.q.dir, go: a.q.go, run: !!a.q.run, pose: a.q.pose,
                           fly: a.q.fly || 0, wings: !!a.q.wings, foal: !!a.q.foal, hop: a.q.hop || 0, glow: a.q.glow || 0, yOff: a.yOff, act: a.act ? a.act.type : null,
                           cx: OX + a.q.x * S, cy: OY + (a.q.y + a.yOff - a.R.HEIGHT * a.q.s * 0.5) * S });
      const castHooks = {
        everyone: () => everyone().map(info),
        family: () => FAMILY.map(info),
        visitors: () => VISITORS.map(p => ({ dir: p.dir, run: p.run, lane: p.lane, members: p.members.map(info) })),
        flyer: () => flyer ? info(flyer) : null,
        bunnies: () => BUNNIES.map(info),
        swans: () => SWANS.map(info),
        arcs: () => ARCS.length,
        spawn(o){ const p = spawnVisitors(lastT, o); return p ? p.members.length : 0; },
        fly(o){ return !!spawnFlyer(lastT, o); },
        clearVisitors(){ VISITORS.length = 0; flyer = null; },
        auto(v){ autoCast = !!v; },                           // false: nobody comes or performs on the schedule (the tests bring their own)
        // act('mare' | 'foal' | 'visitor' | 'flyer' | 'bunny' | 'swan' | 'cygnet' | an index into everyone(), type)
        act(who, type){
          const all = everyone(), a = typeof who === 'number' ? all[who] : all.find(m => m.role === who);
          if (!a) return false;
          a.act = null; a.yOff = 0; a.rot = 0; return startAct(a, type || 'pose', lastT);
        },
        hitAt(cx, cy){ const a = hitCast((cx - OX) / S, (cy - OY) / S); return a ? a.role : null; },   // who a tap at client x, y would reach
        hornXY(i){ const a = everyone()[i || 0]; if (!a || a.type !== 'uni') return null; const h = hornXY(a); return { x: OX + h.x * S, y: OY + h.y * S }; },
      };

      // ══════════════════════════════════════════════════════════════════════
      // THE LIVE BITS — the falls, the pond, the castle's lights, the magic
      // ══════════════════════════════════════════════════════════════════════
      // magic particles: stars, hearts, sparks, petals, puffs — one capped pool
      const FX = [];
      const fxCap = () => narrow || IS_TOUCH ? 110 : 190;
      function fx(kind, x, y, o){
        if (FX.length >= fxCap()) FX.shift();
        o = o || {};
        FX.push({ kind, x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g === undefined ? 60 : o.g, t0: lastT + (o.delay || 0), life: o.life || 1.2,
                  c: o.c || '#FFFFFF', s: o.s || 1, rot: Math.random() * TAU, vr: rnd(-3, 3), drag: o.drag || 0 });
      }
      function burst(kind, x, y, n, sp, o){
        o = o || {};
        for (let i = 0; i < n; i++){
          const a = o.arc ? o.arc[0] + Math.random() * (o.arc[1] - o.arc[0]) : Math.random() * TAU, v = sp * (0.35 + Math.random() * 0.65);
          fx(kind, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g, life: (o.life || 1.2) * (0.7 + Math.random() * 0.5), c: o.c || pick(BOW),
                           s: (o.s || 1) * (0.6 + Math.random() * 0.7), delay: o.delay, drag: o.drag });
        }
      }
      function heartPath(g, r){ g.beginPath(); g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.5, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.45); g.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.5, -r * 0.2, 0, r * 0.9); }
      function drawFX(g, t, dt){
        for (let i = FX.length - 1; i >= 0; i--){
          const p = FX[i], age = t - p.t0;
          if (age < 0) continue;
          if (age >= p.life){ FX.splice(i, 1); continue; }
          p.vy += p.g * dt; if (p.drag){ const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          const k = age / p.life, a = k < 0.15 ? k / 0.15 : 1 - smooth((k - 0.15) / 0.85);
          g.fillStyle = p.c;
          if (p.kind === 'star') star4(g, p.x, p.y, 7 * p.s * (0.6 + 0.4 * Math.sin(age * 9 + p.rot)), a);
          else if (p.kind === 'spark'){ g.globalAlpha = a; g.beginPath(); g.arc(p.x, p.y, 2.4 * p.s, 0, TAU); g.fill(); g.globalAlpha = 1; }
          else if (p.kind === 'puff'){ g.globalAlpha = a * 0.6; g.beginPath(); g.arc(p.x, p.y, 9 * p.s * (0.6 + k), 0, TAU); g.fill(); g.globalAlpha = 1; }
          else { g.save(); g.translate(p.x, p.y); g.rotate(p.kind === 'heart' ? Math.sin(age * 3 + p.rot) * 0.3 : p.rot); g.globalAlpha = a;
            if (p.kind === 'heart'){ heartPath(g, 7 * p.s * (0.7 + 0.3 * Math.min(1, k * 4))); g.fill(); }
            else { g.scale(1, 0.55 + 0.45 * Math.sin(age * 5 + p.rot)); g.beginPath(); g.ellipse(0, 0, 6 * p.s, 3.4 * p.s, 0, 0, TAU); g.fill(); }
            g.restore(); g.globalAlpha = 1; }
        }
        perf.fx = FX.length;
      }

      // ── the waterfall: a bright column in the cut of the cliff, two sheets of
      //    streaks scrolling down it, foam and mist at the foot; a tap turns the
      //    water to rainbow for a while
      const streakL = makeLayer(64, 256, 1);
      { const g = streakL.cx, r = makeRng(606);
        for (let i = 0; i < 70; i++){
          const x = r() * 64, y = r() * 256, h = 30 + r() * 80, w = 1.2 + r() * 3.4;
          for (const yy of [y, y - 256]){ g.fillStyle = lg(g, 0, yy, 0, yy + h, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,' + (0.3 + r() * 0.5) + ')'], [1, 'rgba(255,255,255,0)']]); g.fillRect(x, yy, w, h); }
        } }
      let bowFallUntil = -1;
      const fallBox = () => { const x = CX(FALL_X), w = Math.max(18, FALL_W * CLX), y0 = CY(CLIFF_TOP) - 2, y1 = POND.y - POND.ry * 0.45; return { x, w, y0, y1 }; };
      function drawFalls(g, t){
        const F = fallBox(), h = F.y1 - F.y0, x0 = F.x - F.w / 2;
        const rb = bowFallUntil > t ? smooth(Math.min(1, (bowFallUntil - t) / 1.2)) * smooth(Math.min(1, (t - (bowFallUntil - 7)) / 0.6)) : 0;
        g.save(); g.beginPath(); g.rect(x0, F.y0, F.w, h); g.clip();
        g.fillStyle = lg(g, 0, F.y0, 0, F.y1, [[0, rgb(mixc(L.water, [255, 255, 255], 0.75))], [0.5, rgb(mixc(L.water, [255, 255, 255], 0.35))], [1, rgb(mixc(L.water, [255, 255, 255], 0.6))]]);
        g.fillRect(x0, F.y0, F.w, h);
        if (rb > 0.01){ const st = BOW.map((c, i) => [i / (BOW.length - 1), c]); g.globalAlpha = 0.75 * rb; g.fillStyle = lg(g, x0, 0, x0 + F.w, 0, st); g.fillRect(x0, F.y0, F.w, h); g.globalAlpha = 1; }
        for (let k = 0; k < 2; k++){
          const sh = 256 * (h / 256 > 1 ? 1.4 : 1), off = ((t * (k ? 210 : 150)) % sh);
          g.globalAlpha = k ? 0.9 : 0.6;
          g.drawImage(streakL.cv, x0 - (k ? 3 : 0), F.y0 + off - sh, F.w + 6, sh); g.drawImage(streakL.cv, x0 - (k ? 3 : 0), F.y0 + off, F.w + 6, sh);
        }
        g.globalAlpha = 1;
        g.fillStyle = lg(g, x0, 0, x0 + F.w, 0, [[0, rgb(L.cliffD, 0.3)], [0.2, rgb(L.cliffD, 0)], [0.8, rgb(L.cliffD, 0)], [1, rgb(L.cliffD, 0.3)]]); g.fillRect(x0, F.y0, F.w, h);
        g.restore();
        // the lip at the top, foam and mist at the foot
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(F.x, F.y0 + 1, F.w * 0.52, 4, 0, 0, TAU); g.fill();
        glow(g, 'white', F.x, F.y1, F.w * 1.7, 0.5 + 0.1 * Math.sin(t * 2.1));
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < 7; i++){
          const a = t * (1.6 + i * 0.23) + i * 1.7, r = (5 + (i % 3) * 3) * (0.7 + 0.3 * Math.sin(a)) * Math.max(0.6, CLX);
          g.globalAlpha = 0.75; g.beginPath(); g.arc(F.x + (i - 3) * F.w * 0.17 + Math.sin(a * 0.7) * 3, F.y1 + Math.cos(a) * 2.4, r, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        if (rb > 0.2 && Math.random() < 0.5) fx('spark', F.x + rnd(-F.w, F.w) * 0.5, F.y1 - rnd(0, h * 0.2), { vx: rnd(-40, 40), vy: rnd(-90, -30), g: 160, life: 0.9, c: pick(BOW), s: 1.2 });
      }

      // ── the pond: glints, the sun's (or the moon's) path, ripples, a jumping fish
      const RIPPLES = []; let nextRippleAt = 3, fish = null;
      const inPond = (x, y) => { const dx = (x - POND.x) / POND.rx, dy = (y - POND.y) / POND.ry; return dx * dx + dy * dy < 1; };
      function ripple(x, y, t, big){ if (RIPPLES.length < 8) RIPPLES.push({ x, y, t0: t, big: !!big }); }
      function fishJump(t, x){
        if (fish) return false;
        const fxx = clamp(x === undefined ? POND.x + rnd(-0.5, 0.5) * POND.rx : x, POND.x - POND.rx * 0.6, POND.x + POND.rx * 0.6);
        fish = { t0: t, x: fxx, y: POND.y + POND.ry * 0.1, dir: Math.random() < 0.5 ? -1 : 1, c: pick(['#FF9CC8', '#FFC66A', '#C8A6FA']) };
        ripple(fxx, fish.y, t, true); return true;
      }
      function drawPondLife(g, t){
        const P = POND;
        const sp = sunPos(tod), mp = moonPos(tod);
        if (sp.up && L.sunA > 0.2) glow(g, 'warm', clamp(sp.x, P.x - P.rx * 0.6, P.x + P.rx * 0.6), P.y, P.ry * 1.5, 0.3 * L.sunA);
        else if (mp.up) glow(g, 'blue', clamp(mp.x, P.x - P.rx * 0.6, P.x + P.rx * 0.6), P.y, P.ry * 1.4, 0.4 * L.moon);
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineCap = 'round'; g.lineWidth = 1.8;
        for (let i = 0; i < 8; i++){
          const a = i * 2.4, k = 0.2 + (i % 4) * 0.19, x = P.x + Math.cos(a) * P.rx * k, y = P.y + Math.sin(a) * P.ry * k * 0.9, w = 7 + (i % 3) * 5;
          g.globalAlpha = 0.25 + 0.4 * Math.max(0, Math.sin(t * 1.3 + i * 1.9));
          g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y); g.stroke();
        }
        g.globalAlpha = 1;
        if (t > nextRippleAt){ nextRippleAt = t + rnd(3, 8); ripple(P.x + rnd(-0.6, 0.6) * P.rx, P.y + rnd(-0.4, 0.5) * P.ry, t); }
        for (let i = RIPPLES.length - 1; i >= 0; i--){
          const r = RIPPLES[i], k = (t - r.t0) / (r.big ? 1.9 : 1.5);
          if (k >= 1){ RIPPLES.splice(i, 1); continue; }
          g.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)) + ')'; g.lineWidth = 2;
          for (let j = 0; j < (r.big ? 3 : 2); j++){ const rr = (k * (r.big ? 64 : 40) - j * 12); if (rr > 2){ g.beginPath(); g.ellipse(r.x, r.y, rr, rr * 0.3, 0, 0, TAU); g.stroke(); } }
        }
        if (fish){
          const k = (t - fish.t0) / 1.1;
          if (k >= 1){ ripple(fish.x + fish.dir * 46, fish.y, t, true); burst('spark', fish.x + fish.dir * 46, fish.y, 7, 90, { arc: [-2.6, -0.5], g: 260, life: 0.6, c: '#FFFFFF' }); fish = null; }
          else {
            const x = fish.x + fish.dir * 46 * k, y = fish.y - Math.sin(k * Math.PI) * 62, rot = (k - 0.5) * 2.4;
            g.save(); g.translate(x, y); g.scale(fish.dir, 1); g.rotate(rot);
            g.fillStyle = fish.c; g.beginPath(); g.ellipse(0, 0, 15, 7.5, 0, 0, TAU); g.fill();
            g.beginPath(); g.moveTo(-12, 0); g.lineTo(-25, -8); g.lineTo(-21, 0); g.lineTo(-25, 8); g.closePath(); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(2, -2.6, 8, 2.6, 0, 0, TAU); g.fill();
            g.fillStyle = '#3A2A4A'; g.beginPath(); g.arc(8, -1.4, 1.7, 0, TAU); g.fill();
            g.restore();
          }
        }
      }

      // ── the castle's live bits: lit windows, waving flags, twinkles on the
      //    spires, fireworks over the roofs
      const ROCKETS = []; let nextShowAt = 30;
      const cP = (x, y) => [CASTLE.x + x * CASTLE.s, CASTLE.y + 4 + y * CASTLE.s];
      function fireworks(t, n){
        for (let i = 0; i < (n || 3); i++) ROCKETS.push({ t0: t + i * 0.42, x: CASTLE.x + rnd(-150, 150) * CASTLE.s, y0: CASTLE.y - 200 * CASTLE.s, y1: CASTLE.y - rnd(330, 470) * CASTLE.s, c: pick(BOW), done: false });
      }
      function drawCastleLive(g, t){
        const s = CASTLE.s, win = L.win;
        if (win > 0.02){
          for (let i = 0; i < CWIN.length; i++){
            const w = CWIN[i], p = cP(w[0], w[1]), fl = 0.82 + 0.18 * Math.sin(t * (2.2 + (i % 5) * 0.5) + i * 1.3);
            glow(g, 'gold', p[0], p[1], Math.max(w[2], w[3]) * s * 1.5, 0.5 * win * fl);
            g.globalAlpha = 0.9 * win * fl; g.fillStyle = '#FFE9A8';
            g.beginPath(); g.roundRect(p[0] - w[2] * s * 0.36, p[1] - w[3] * s * 0.4, w[2] * s * 0.72, w[3] * s * 0.8, w[2] * s * 0.3); g.fill(); g.globalAlpha = 1;
          }
        }
        for (let i = 0; i < CFLAG.length; i++){                 // pennants: a ribbon of three bends
          const f = CFLAG[i], p = cP(f[0], f[1]), len = 26 * s, a = t * 3.2 + i * 1.7;
          g.fillStyle = T(f[2]);
          g.beginPath(); g.moveTo(p[0], p[1]);
          g.quadraticCurveTo(p[0] + len * 0.5, p[1] + Math.sin(a) * 4 * s, p[0] + len, p[1] + 5 * s + Math.sin(a + 1.4) * 4 * s);
          g.quadraticCurveTo(p[0] + len * 0.5, p[1] + 9 * s + Math.sin(a + 0.5) * 3 * s, p[0], p[1] + 11 * s); g.closePath(); g.fill();
        }
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < CTWINK.length; i++){ const w = CTWINK[i], p = cP(w[0], w[1]), k = Math.max(0, Math.sin(t * 1.7 + i * 2.3)); star4(g, p[0], p[1], (4 + 7 * k) * s, 0.25 + 0.75 * k); }
        // fireworks: a rocket climbs, then a ring of stars and sparks
        if (L.stars > 0.8 && t > nextShowAt && ROCKETS.length === 0){ nextShowAt = t + rnd(40, 90); fireworks(t, 2); }
        for (let i = ROCKETS.length - 1; i >= 0; i--){
          const r = ROCKETS[i], k = (t - r.t0) / 0.7;
          if (k < 0) continue;
          if (k < 1){ const y = lerp(r.y0, r.y1, smooth(k)); glow(g, 'white', r.x, y, 10, 0.9); g.fillStyle = r.c; star4(g, r.x, y, 6, 1); }
          else { burst('star', r.x, r.y1, 12, 190, { g: 70, life: 1.5, c: r.c, drag: 1.4, s: 1.3 }); burst('spark', r.x, r.y1, 16, 150, { g: 90, life: 1.3, drag: 1.2 }); ROCKETS.splice(i, 1); }
        }
      }

      // ── the air: drifting petals and butterflies by day, magic motes always,
      //    fireflies at night
      const AIR = []; { const r = makeRng(5); for (let i = 0; i < 30; i++) AIR.push({ u: r(), v: r(), ph: r() * TAU, f: 0.4 + r() * 0.9, b: 1 + r() * 2.2, c: Math.floor(r() * 6) }); }
      const FLUTTER = []; { const r = makeRng(12); for (let i = 0; i < 6; i++) FLUTTER.push({ u: r(), y: 620 + r() * 200, ph: r() * TAU, sp: 14 + r() * 16, c: Math.floor(r() * 6), s: 0.8 + r() * 0.5 }); }
      function drawAir(g, t){
        const day = clamp01((L.daylight - 0.2) * 1.6), night = clamp01(1 - L.daylight * 2.4);
        if (day > 0.03){
          // blossom petals on the breeze
          const n = narrow ? 10 : 20;
          for (let i = 0; i < n; i++){
            const f = AIR[i], y = (f.v * 940 + t * (16 + f.f * 16)) % 940 - 20, x = ((f.u * (DW + 200) + t * (20 + f.f * 22) + Math.sin(t * f.f + f.ph) * 40) % (DW + 200)) - 100;
            g.save(); g.translate(x, y); g.rotate(t * f.b + f.ph); g.scale(1, 0.5 + 0.5 * Math.sin(t * f.b * 1.7 + f.ph));
            g.globalAlpha = 0.85 * day; g.fillStyle = i % 3 ? '#FFC1DC' : '#FFFFFF';
            g.beginPath(); g.ellipse(0, 0, 6.5, 3.6, 0, 0, TAU); g.fill(); g.restore();
          }
          g.globalAlpha = 1;
          const nb = narrow ? 3 : FLUTTER.length;
          for (let i = 0; i < nb; i++){
            const b = FLUTTER[i], x = ((b.u * (DW + 160) + t * b.sp) % (DW + 160)) - 80 + Math.sin(t * 0.9 + b.ph) * 46, y = b.y + Math.sin(t * 1.3 + b.ph) * 34 + Math.sin(t * 3.1 + b.ph) * 8;
            const flap = Math.abs(Math.sin(t * 9 + b.ph)), s = b.s * (narrow ? 0.8 : 1);
            g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.3 + b.ph) * 0.3); g.globalAlpha = day;
            for (const sd of [-1, 1]){
              g.save(); g.scale(sd * (0.25 + 0.75 * flap), 1);
              g.fillStyle = BOW[b.c]; g.beginPath(); g.ellipse(7 * s, -4 * s, 8 * s, 6.5 * s, -0.5, 0, TAU); g.fill();
              g.fillStyle = BOW[(b.c + 2) % 6]; g.beginPath(); g.ellipse(6 * s, 4 * s, 5.5 * s, 4.6 * s, 0.5, 0, TAU); g.fill();
              g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(8 * s, -4.4 * s, 2 * s, 0, TAU); g.fill();
              g.restore();
            }
            g.fillStyle = '#5A3A6A'; g.beginPath(); g.ellipse(0, 0, 1.5 * s, 6 * s, 0, 0, TAU); g.fill();
            g.restore(); g.globalAlpha = 1;
          }
        }
        // magic motes: little four-point twinkles rising over the meadow
        g.fillStyle = '#FFFFFF';
        for (let i = 20; i < (narrow ? 26 : 30); i++){
          const f = AIR[i], y = 860 - ((f.v * 330 + t * (9 + f.f * 8)) % 330), x = f.u * DW + Math.sin(t * f.f + f.ph) * 26, k = Math.max(0, Math.sin(t * f.b + f.ph));
          star4(g, x, y, 3 + 5 * k, (0.25 + 0.6 * k) * (0.6 + 0.4 * night));
        }
        if (night > 0.03){
          const n = narrow ? 12 : 22;
          for (let i = 0; i < n; i++){
            const f = AIR[i], x = f.u * DW + Math.sin(t * f.f * 0.5 + f.ph) * 70, y = 610 + f.v * 250 + Math.sin(t * f.f * 0.8 + f.ph * 2) * 30, a = night * Math.max(0, Math.sin(t * f.b + f.ph));
            glow(g, i % 3 ? 'green' : 'pink', x, y, 13, a * 0.9); if (a > 0.1){ g.globalAlpha = a; g.fillStyle = '#FFFFE0'; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); g.globalAlpha = 1; }
          }
        }
      }

      const nextKeyFrom = v => { for (const K of KEYS) if (K.at > v + 0.01) return K.at; return KEYS[0].at + 1; };
      const nextHour = t => { todTween = { from: tod, to: nextKeyFrom(tod), t0: t, dur: 2.2 }; };
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t;
        if (todTween){
          const k = clamp01((t - todTween.t0) / todTween.dur);
          tod = lerp(todTween.from, todTween.to, smooth(k)) % 1;
          if (k >= 1) todTween = null;
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        repaintIfNeeded();
        stepCast(t, dt);

        const g = ctx;
        g.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        g.globalAlpha = 1; g.imageSmoothingEnabled = true;
        g.drawImage(skyL.cv, 0, 0, DW, HZ + 30);
        drawStars(g, t); drawAurora(g, t); drawShoot(g, t);
        const sp = sunPos(tod);
        if (sp.up) glow(g, 'pink', sp.x, Math.max(sp.y, HZ - 70), 600, 0.28 * L.warm * L.sunA);
        drawSun(g, t); drawMoon(g, t);
        drawRainbow(g, t);
        drawClouds(g, dt);
        g.drawImage(farL.cv, 0, FAR_TOP, DW, farL.h);
        drawCastleLive(g, t);
        drawSky(g, t);                                        // the flyer passes in front of the castle, behind the meadow
        g.drawImage(groundL.cv, 0, GROUND_TOP, DW, groundL.h);
        drawFalls(g, t);
        drawPondLife(g, t);
        drawCast(g, t);
        g.drawImage(frontL.cv, 0, FRONT_TOP, DW, frontL.h);
        drawFlowers(g, t);
        drawFront(g, t);                                      // the bunnies hop in front of the flowers
        drawAir(g, t);
        drawFX(g, t, dt);
        g.drawImage(vigL.cv, 0, 0, DW, DH);
        perf.drawn++;
      }

      // ── the frame loop, with the governor: a slow device drops to every other
      //    frame (touch devices start there) and comes back only when it is calm
      let prevTs = 0, lastDrawTs = 0, lastGov = 0, calmSince = 0, errLogged = false;
      function frame(ts){
        if (stopped) return;
        rafId = requestAnimationFrame(frame);
        if (t0 === null) t0 = ts;
        if (!warmTs) warmTs = ts;
        const warming = ts - warmTs < 1200;
        if (prevTs && !warming) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (warming){ perf.gapEma = 16.7; perf.costEma = 0; }
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!errLogged){ errLogged = true; console.error('unicorns4 frame error', e); } }
        if (!warming) perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastGov > 1500){
          lastGov = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21, calm = perf.costEma <= 4.5 && perf.gapEma <= 19;
          if (heavy){ perf.halfRate = true; calmSince = 0; }
          else if (calm && perf.halfRate && !IS_TOUCH){ if (!calmSince) calmSince = ts; else if (ts - calmSince > 6000){ perf.halfRate = false; calmSince = 0; } }
          else calmSince = 0;
        }
      }

      // ── taps: a unicorn, a bunny or the swan does its trick · the sun or the
      //    moon moves the day on · the falls turn to rainbow · a fish jumps ·
      //    fireworks over the castle · petals off a tree · a flower nods · the
      //    rainbow shimmers · the open sky sends a shooting star
      const TAPS = { cast: 0, hour: 0, falls: 0, pond: 0, castle: 0, tree: 0, flower: 0, rainbow: 0, sky: 0 };
      const treeTop = tr => ({ x: tr.x, y: tr.y - 150 * tr.s, r: 84 * tr.s });
      function petalFlurry(x, y, r, n){
        for (let i = 0; i < n; i++) fx('petal', x + rnd(-r, r), y + rnd(-r, r) * 0.6, { vx: rnd(-30, 70), vy: rnd(10, 60), g: 26, life: rnd(2.2, 3.8), c: Math.random() < 0.3 ? '#FFFFFF' : pick(['#FFC1DC', '#FF9CC8', '#E2C8FF']), s: rnd(0.8, 1.4), drag: 0.4 });
      }
      const FX_DO = {
        rainbow(){ shimmer = { t0: lastT }; },
        rainbowFall(){ bowFallUntil = lastT + 7; },
        castle(){ fireworks(lastT, 3); },
        fish(x){ return fishJump(lastT, x); },
        petals(i){ const tr = TREES[i || 0]; if (tr){ const p = treeTop(tr); petalFlurry(p.x, p.y, p.r, 22); } },
        star(x, y){ startShoot(lastT, x, y); },
      };
      function onClick(e){
        if (stopped || !e.target || !e.target.closest || e.target.closest(UI_SEL)) return;
        const x = (e.clientX - OX) / S, y = (e.clientY - OY) / S, t = lastT;
        const a = hitCast(x, y);
        if (a){ TAPS.cast++; tapActor(a, t); return; }
        const sp = sunPos(tod), mp = moonPos(tod);
        if ((sp.up && L.sunA > 0.2 && Math.hypot(x - sp.x, y - sp.y) < L.sunR + 30) || (mp.up && L.moon > 0.3 && Math.hypot(x - mp.x, y - mp.y) < 74)){ TAPS.hour++; nextHour(t); return; }
        const F = fallBox();
        if (Math.abs(x - F.x) < F.w / 2 + 14 && y > F.y0 - 10 && y < F.y1 + 6){ TAPS.falls++; FX_DO.rainbowFall(); burst('star', F.x, (F.y0 + F.y1) / 2, 8, 120, { g: 40, life: 1.1 }); return; }
        if (inPond(x, y)){ TAPS.pond++; ripple(x, y, t, true); fishJump(t, x); return; }
        for (let i = TREES.length - 1; i >= 0; i--){ const p = treeTop(TREES[i]); if (Math.hypot(x - p.x, (y - p.y) * 1.3) < p.r){ TAPS.tree++; petalFlurry(p.x, p.y, p.r, 22); return; } }
        if (y > 800){
          let best = null, bd = 46;
          for (const f of FLOWERS){ const d = Math.hypot(x - f.x, y - (f.y - 60 * f.s)); if (d < bd){ bd = d; best = f; } }
          if (best){ TAPS.flower++; best.kick = t; burst('star', best.x, best.y - 76 * best.s, 6, 90, { g: 30, life: 0.9, s: 0.9 }); return; }
        }
        const cs = CASTLE.s;
        if (Math.abs(x - CASTLE.x) < 165 * cs && y > CASTLE.y - 360 * cs && y < CASTLE.y + 8){ TAPS.castle++; fireworks(t, 3); return; }
        const rd = Math.hypot(x - RBOW.x, y - RBOW.y);
        if (y < RBOW.y - RBOW.r * 0.3 && Math.abs(rd - RBOW.r) < RBOW.w * 0.75 && L.bow > 0.2){ TAPS.rainbow++; FX_DO.rainbow(); return; }
        if (y < HZ - 70){ TAPS.sky++; startShoot(t, x, y); burst('star', x, y, 5, 70, { g: 20, life: 0.9, c: '#FFFFFF' }); }
      }

      // ── hooks for the harness and the tests
      const XY = (x, y) => ({ x: OX + x * S, y: OY + y * S });
      const hook = Object.assign({
        ready: () => rigsReady,
        tod: () => tod,
        setTod(v){ tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed(v){ todSpeed = v; },
        phase: () => L.name,
        look: () => L,
        time: () => lastT,
        taps: () => Object.assign({}, TAPS),
        fx: FX_DO,
        fxCount: () => FX.length, rockets: () => ROCKETS.length, ripples: () => RIPPLES.length, fishUp: () => !!fish,
        shimmering: () => !!shimmer, rainbowWater: () => bowFallUntil > lastT, shooting: () => !!shoot,
        kicks: () => FLOWERS.map(f => f.kick ? Math.max(0, 1 - (lastT - f.kick) / 0.9) : 0),
        sunXY: () => { const p = sunPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.sunA > 0.2 }); },
        moonXY: () => { const p = moonPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.moon > 0.3 }); },
        pondXY: () => XY(POND.x - POND.rx * 0.2, POND.y + POND.ry * 0.3),
        fallsXY: () => { const F = fallBox(); return XY(F.x, (F.y0 + F.y1) / 2); },
        castleXY: () => XY(CASTLE.x + 100 * CASTLE.s, CASTLE.y - 110 * CASTLE.s),
        rainbowXY: () => XY(RBOW.x + Math.cos(-Math.PI * 0.62) * RBOW.r, RBOW.y + Math.sin(-Math.PI * 0.62) * RBOW.r),
        treeXY: i => { const p = treeTop(TREES[i || 0]); return XY(p.x, p.y); },
        flowerXY: i => { const f = FLOWERS[i || 0]; return XY(f.x, f.y - 60 * f.s); },
        skyXY: () => XY(RBOW.x + RBOW.r * 0.2, RBOW.y - RBOW.r * 0.42),          // open sky under the arch
        layout: () => ({ DW, narrow, CLX, CLY, CS, S, OX, OY, pond: Object.assign({}, POND), castle: Object.assign({}, CASTLE), rainbow: Object.assign({}, RBOW),
                         zone: Object.assign({}, ZONE), trees: TREES.length, flowers: FLOWERS.length, cliffTop: CY(CLIFF_TOP) }),
        perf: () => ({ dpr: DPR, DW, S, halfRate: perf.halfRate, gapEma: perf.gapEma, costEma: perf.costEma, frames: perf.frames, drawn: perf.drawn,
                       repaints: perf.repaints, cast: perf.cast, fx: perf.fx }),
        rumiLayer: () => rumiLayer,
      }, castHooks);
      window.BACKGROUNDS.unicorns4._test = hook;
      window._uni4 = hook;

      // ── rumi wanders across the grass every few minutes (an overlay above the canvas)
      const rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      let rumiPatrol = null;
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, { height: '19vh', bottom: '5.5vh', duration: 16000, zIndex: 7,
                                                           gapMin: 120000, gapMax: 240000, startDelay: 60000 + Math.random() * 120000 });
      });

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);
      loadRigs(() => { if (stopped) return; rigsReady = !!(window.SavKit && window.UnicornRig); recast(); });

      return function cleanup(){
        stopped = true;
        cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (rumiPatrol) rumiPatrol.stop();
        if (window._uni4 === hook) delete window._uni4;
        if (window.BACKGROUNDS.unicorns4._test === hook) delete window.BACKGROUNDS.unicorns4._test;
        stage.innerHTML = '';
      };
    },
  };
})();
