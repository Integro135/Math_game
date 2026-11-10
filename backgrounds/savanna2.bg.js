/* ── Savanna 2 — Pride Rock over the plain, rebuilt from zero ───────────────
   window.BACKGROUNDS.savanna2 = { skin:'savanna', aids:'savanna', preload, init({stage}) → cleanup }

   A full redo of the savanna (2026-11). The old scene (savanna.bg.js + the
   rigs in savanna_animals/) stays in the folder, unloaded; this one shares
   nothing with it but the skin and the aids. The animals are the new rigs in
   savanna_rigs/ (kit.js + cats / zebra / giraffe / elephant / ostrich): soft
   shapes, no outlines, true profile, three-bone legs planted by IK.

   THE PICTURE, back to front (design space 1600×900, horizon HZ = 540; the
   design width follows the window's aspect, `S` maps design → screen):
   · the SKY — a day cycle, a sun that swells and reddens as it sinks, a moon
     and stars, slow flat-bottomed clouds, flocks of birds, shooting stars
   · the MOUNTAINS — a far violet range with one broad snow-capped peak, a
     nearer range of low hills, tiny acacias on the horizon in the haze
   · the PLAIN — bands of straw-gold grass, a WATERHOLE with a mud rim and
     reeds, flat-topped acacias, a fat baobab, bushes, a termite mound
   · PRIDE ROCK on the left (the game card hugs the right): a great slab
     rising from the edge to an overhanging ledge. The PRIDE lives on it —
     the lion, the lioness, a young lioness and a cub pace the top, stop,
     yawn, roar, and hearts rise when two of them meet face to face
   · the HERDS — zebras, giraffes, elephants, ostriches, cheetahs and
     lionesses cross the plain in small family groups (adults + young), each
     kind in its own gait, some at a run; every so often one does its thing
     (a bray, a trumpet, a display, a jump, a spin after its tail, a fart)
   · the FRONT — a big acacia at the right edge the herds pass behind,
     swaying grass along the bottom, fireflies at night, gold motes at dusk
   · "rumi" strolls across every few minutes (rumi/chibi-walker.js)

   THE HOUR (`lookAt(tod)`, DAY_SEC = 240): DAWN, MORNING, NOON, GOLDEN HOUR,
   SUNSET (the blaze), DUSK, NIGHT. Every colour is interpolated; the still
   layers repaint as the palette drifts, and the animals take the hour's
   light through `L.lit`. Click the sun, the moon or the waterhole → the
   clock tweens to the next key.

   CLICKS (document listener filtered by UI_SEL): an animal → it performs;
   the sun / moon / waterhole → the next hour; the baobab → the birds
   roosting in it burst out; the sky → a flock crosses.

   PERF (house rules as reef2 / maldives2 / autumn): backing store capped at
   1.5× and ~2.4 MP; sky, mountains, ground and the front are prebaked
   layers repainted only when the look steps; the animals are the per-frame
   vector work (culled off-screen, population capped, palettes cached per
   quantised tint × light); the rAF loop drops to every 2nd display frame
   while frames run long (the first 1.2 s after init/resize excluded).
   Hooks: window._sav2 = BACKGROUNDS.savanna2._test.  */
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

  // ── the rigs (savanna_rigs/): the kit first, then every animal file — each
  //    loaded once and shared across re-inits
  const RIG_DIR = BASE + 'savanna_rigs/';
  const RIG_FILES = [['CubRig', 'cats.js'], ['ZebraRig', 'zebra.js'], ['GiraffeRig', 'giraffe.js'],
                     ['ElephantRig', 'elephant.js'], ['OstrichRig', 'ostrich.js']];
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-savrig="' + globalName + '"]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = RIG_DIR + file; s.setAttribute('data-savrig', globalName);
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }
  function loadRigs(cb){
    needScript('SavKit', 'kit.js', () => {
      let left = RIG_FILES.length;
      RIG_FILES.forEach(([g, f]) => needScript(g, f, () => { if (--left === 0) cb(); }));
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
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 1-D value noise — the skyline of the ranges, the wind in the grass
  function noise1(x){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), u); }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOUR — keyed looks, blended
  // ══════════════════════════════════════════════════════════════════════════
  const DAY_SEC = 240;
  // sky top / mid / horizon · glow around the sun · sun disc + its radius ·
  // far / near range + snow · plain far → near · rock lit / face / shadow ·
  // crowns lit / shaded + trunk · grass blade + its dark · water · cloud ·
  // lit = the light the animals stand in · daylight, warm, stars, moon, sunA
  const KEYS = [
    { at: 0.00, name: 'dawn',    top: '#5B5C9A', mid: '#D897A8', hz: '#FFD3A0', glow: '#FFC08A', sun: '#FFE0A8', sunR: 70,
      mtF: '#A58DB8', mtN: '#8C7498', snow: '#FBE6E2', pF: '#C9A678', pM: '#B28C5A', pN: '#8E6C42', rockL: '#D9A680', rock: '#9A6E58', rockD: '#5E4244',
      tree: '#6E8448', treeD: '#465A38', trunk: '#54382E', grass: '#B0A054', grassD: '#7A6C3C', water: '#C6A8B4', cloud: '#FFD9D0',
      lit: '#ECC8C6', daylight: 0.5, warm: 0.6, stars: 0.12, moon: 0.15, sunA: 0.7 },
    { at: 0.10, name: 'morning', top: '#4A8FDC', mid: '#9CCBF2', hz: '#F3E6C6', glow: '#FFF1C2', sun: '#FFF4CC', sunR: 52,
      mtF: '#A9B6DA', mtN: '#9A9CB8', snow: '#FFFFFF', pF: '#DCC878', pM: '#C9AE58', pN: '#A88C40', rockL: '#D8B084', rock: '#A47C56', rockD: '#684A38',
      tree: '#6E9A3C', treeD: '#456C28', trunk: '#5A3C28', grass: '#B4BC50', grassD: '#7C8434', water: '#78B6E0', cloud: '#FFFFFF',
      lit: '#FFF6E8', daylight: 0.94, warm: 0.25, stars: 0, moon: 0, sunA: 0.95 },
    { at: 0.30, name: 'noon',    top: '#2F76D0', mid: '#79B6EE', hz: '#DDEFFA', glow: '#FFFFFF', sun: '#FFFBE6', sunR: 46,
      mtF: '#A4B8DE', mtN: '#9C9EBC', snow: '#FFFFFF', pF: '#DCC66E', pM: '#CDB463', pN: '#AC9040', rockL: '#D4AA7A', rock: '#A07A52', rockD: '#6E4F33',
      tree: '#6B9C3A', treeD: '#3F6A24', trunk: '#5A3C26', grass: '#A8BA4C', grassD: '#748230', water: '#5FA6D8', cloud: '#FFFFFF',
      lit: '#FFFFFF', daylight: 1.0, warm: 0.1, stars: 0, moon: 0, sunA: 1.0 },
    { at: 0.50, name: 'golden',  top: '#5E86C8', mid: '#F0C080', hz: '#FFD27A', glow: '#FFD890', sun: '#FFE9A8', sunR: 64,
      mtF: '#B79AA8', mtN: '#9A7C84', snow: '#FFE8C8', pF: '#E2B45C', pM: '#CC9844', pN: '#A67430', rockL: '#EEB070', rock: '#B07848', rockD: '#6C4430',
      tree: '#84963A', treeD: '#4E6026', trunk: '#583624', grass: '#C4B048', grassD: '#86702C', water: '#E6B870', cloud: '#FFE6C0',
      lit: '#FFE2BC', daylight: 0.86, warm: 0.85, stars: 0, moon: 0, sunA: 1.0 },
    { at: 0.64, name: 'sunset',  top: '#3A1840', mid: '#B8402E', hz: '#F7B04C', glow: '#FF8A3C', sun: '#FFD27A', sunR: 96,
      mtF: '#7A4A56', mtN: '#58303A', snow: '#F0A47C', pF: '#B8743A', pM: '#96582A', pN: '#70401E', rockL: '#E88A4A', rock: '#8E4C30', rockD: '#48262A',
      tree: '#4E3A24', treeD: '#33221A', trunk: '#36221A', grass: '#9A6C30', grassD: '#62401E', water: '#F29A4C', cloud: '#F47A4E',
      lit: '#FFC29A', daylight: 0.6, warm: 1.0, stars: 0.04, moon: 0.12, sunA: 1.0 },
    { at: 0.74, name: 'dusk',    top: '#1C1C4C', mid: '#5A4680', hz: '#C8785E', glow: '#D8704C', sun: '#FFB070', sunR: 84,
      mtF: '#4C426E', mtN: '#382E54', snow: '#9A8CB8', pF: '#5E5068', pM: '#483C56', pN: '#342A42', rockL: '#8A6C84', rock: '#54405A', rockD: '#2C2238',
      tree: '#2E3040', treeD: '#20202E', trunk: '#221C26', grass: '#565068', grassD: '#34304A', water: '#8A6C94', cloud: '#7A5C84',
      lit: '#A698C2', daylight: 0.32, warm: 0.5, stars: 0.55, moon: 0.7, sunA: 0.35 },
    { at: 0.84, name: 'night',   top: '#040817', mid: '#0E1B3F', hz: '#2B3D66', glow: '#3A4E80', sun: '#FFB070', sunR: 70,
      mtF: '#26325A', mtN: '#1C2646', snow: '#8E9CCA', pF: '#2A3652', pM: '#20293F', pN: '#171D30', rockL: '#55648E', rock: '#2E3856', rockD: '#161C30',
      tree: '#1A2A3A', treeD: '#101A28', trunk: '#10141E', grass: '#2E3E56', grassD: '#1A2438', water: '#3A5488', cloud: '#2C3A60',
      lit: '#6672AC', daylight: 0.12, warm: 0, stars: 1.0, moon: 1.0, sunA: 0 },
    { at: 0.95, name: 'night',   top: '#040817', mid: '#0E1B3F', hz: '#2B3D66', glow: '#3A4E80', sun: '#FFB070', sunR: 70,
      mtF: '#26325A', mtN: '#1C2646', snow: '#8E9CCA', pF: '#2A3652', pM: '#20293F', pN: '#171D30', rockL: '#55648E', rock: '#2E3856', rockD: '#161C30',
      tree: '#1A2A3A', treeD: '#101A28', trunk: '#10141E', grass: '#2E3E56', grassD: '#1A2438', water: '#3A5488', cloud: '#2C3A60',
      lit: '#6672AC', daylight: 0.12, warm: 0, stars: 1.0, moon: 1.0, sunA: 0 },
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
  // THE CAST — who crosses the plain, and how
  // ══════════════════════════════════════════════════════════════════════════
  // sc = size on the plain (design px per rig unit) · speed / runSpeed in design
  // px per second at sc 1 · runP = chance a whole herd comes through at a run ·
  // acts beyond the rig's own signature pose · vent = where a fart leaves
  // (rig units behind / above the feet)
  const KINDS = {
    zebra:    { rig: 'ZebraRig',    sc: 0.92, speed: 52, runSpeed: 150, runP: 0.3,  acts: ['pose', 'jump', 'fart'], jumpH: 26, vent: [56, 86] },
    ostrich:  { rig: 'OstrichRig',  sc: 0.88, speed: 64, runSpeed: 200, runP: 0.45, acts: ['pose', 'jump', 'fart'], jumpH: 30, vent: [40, 92] },
    elephant: { rig: 'ElephantRig', sc: 0.98, speed: 34, runSpeed: 80,  runP: 0.08, acts: ['pose', 'fart'],         jumpH: 0,  vent: [84, 120] },
    cheetah:  { rig: 'CheetahRig',  sc: 0.96, speed: 62, runSpeed: 300, runP: 0.6,  acts: ['pose', 'jump', 'spin', 'fart'], jumpH: 34, vent: [58, 62] },
    giraffe:  { rig: 'GiraffeRig',  sc: 0.86, speed: 44, runSpeed: 150, runP: 0.12, acts: ['pose', 'fart'],         jumpH: 0,  vent: [58, 150] },
    lioness:  { rig: 'LionessRig',  sc: 1.0,  speed: 54, runSpeed: 150, runP: 0,    acts: ['pose', 'jump', 'fart'], jumpH: 22, vent: [56, 64] },
  };
  const ACT_DUR = { pose: 2.0, jump: 0.8, spin: 2.2, fart: 1.5 };
  const BOWTIE_HERD = 0.2, BOWTIE_PRIDE = 0.35;
  const TINTS = [0.9, 0.95, 1, 1.05, 1.1];               // quantised — the rigs cache a palette per tint × light
  const noop = function(){};

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.savanna2 = {
    skin: 'savanna',
    aids: 'savanna',
    preload(){ loadRigs(noop); needRumi(noop); },
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0;
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
      // hand: the rock takes 60% of the width and the animals shrink with it.
      const DW0 = 1600, DH = 900, HZ = 540;
      let DW = DW0, AXK = 1, layoutDW = -1, narrow = false;
      const AX = x => x < 640 ? x * AXK : x >= 1000 ? DW - (DW0 - x) * AXK : DW / 2 + (x - 800) * AXK;
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };

      // ── the clock ──
      let tod = 0.12, todSpeed = 1, todTween = null;        // boot: a bright morning
      let L = lookAt(tod), lookKey = -1, LIT = [1, 1, 1];

      // ── sprites + layers ──
      const SPR = {};
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = { white: '255,255,255', warm: '255,228,170', gold: '255,170,80', blue: '180,200,255', shade: '14,10,20', green: '190,255,120' }[name] || '255,255,255';
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [0.3, 'rgba(' + col + ',0.4)'], [1, 'rgba(' + col + ',0)']]);
        g.fillRect(0, 0, 128, 128);
        return (SPR[name] = cv);
      }
      const glow = (g, name, x, y, r, a) => { if (a <= 0.003) return; g.globalAlpha = a; g.drawImage(sprite(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
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
        g.fillStyle = shadeCol ? lg(g, 0, 0, 0, dst.cv.height, [[0, rgb(col)], [0.55, rgb(col)], [1, rgb(shadeCol)]]) : rgb(col);
        g.fillRect(0, 0, dst.cv.width, dst.cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      let skyL = null, farL = null, groundL = null, frontL = null, vigL = null;
      const FAR_TOP = 180, GROUND_TOP = 300, FRONT_TOP = 830;   // design y of each layer's top row

      // ══════════════════════════════════════════════════════════════════════
      // THE LAYOUT — where the rock, the water and the trees stand
      // ══════════════════════════════════════════════════════════════════════
      // PRIDE ROCK in its own coordinates (the 1600 design): the top surface the
      // pride walks, from the left edge up to the tip of the ledge — then the
      // nose, the shadowed underside curving back to the foot, and the base
      const ROCK_TOP = [[-80, 492], [40, 474], [170, 450], [300, 420], [420, 388], [510, 360], [570, 344], [604, 338]];
      const ROCK_UNDER = [[620, 345], [616, 362], [574, 388], [520, 424], [478, 480], [452, 552], [440, 630], [446, 700]];
      const ROCK_FOOT = 722;
      let RKX = 1, RKY = 1, PRS = 1, HS = 1;        // rock x-scale · rock height scale (about its foot) · pride scale · herd scale
      const RX = x => x * RKX;
      function ridgeY0(x){
        const u = x / RKX, P = ROCK_TOP;
        if (u <= P[0][0]) return P[0][1];
        for (let i = 1; i < P.length; i++) if (u <= P[i][0]){ const a = P[i - 1], b = P[i]; return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0])); }
        return P[P.length - 1][1];
      }
      const ridgeY = x => ROCK_FOOT - (ROCK_FOOT - ridgeY0(x)) * RKY;
      const ridgeTilt = x => Math.atan2(ridgeY(x + 30) - ridgeY(x - 30), 60);
      const POND = { x: 0, y: 716, rx: 180, ry: 30 };
      const BAOBAB = { x: 0, y: 676, s: 1 };
      let ACACIAS = [], BUSHES = [], TUFTS = [], MOUND = null;
      function layout(){
        layoutDW = DW; narrow = DW < 1000;
        RKX = narrow ? DW * 0.62 / 604 : Math.max(0.7, AXK);
        RKY = narrow ? 0.38 : 1;
        PRS = clamp(DW / 1000, 0.62, 1);
        HS = clamp(DW / 1000, 0.6, 1);
        const r = makeRng(4242);
        if (narrow){
          POND.x = DW * 0.6; POND.rx = DW * 0.27; POND.ry = 26; POND.y = 724;
          BAOBAB.x = DW * 0.86; BAOBAB.s = 0.78; BAOBAB.y = 664;
          ACACIAS = [{ x: DW * 0.74, y: 606, s: 0.44, f: 1 }, { x: DW * 0.93, y: 590, s: 0.3, f: -1 }, { x: DW * 0.5, y: 588, s: 0.26, f: 1 }];
          MOUND = { x: POND.x - POND.rx - 34, y: 748, s: 0.7 };
        } else {
          POND.x = AX(1010); POND.rx = 150 + 40 * AXK; POND.ry = 30; POND.y = 716;
          BAOBAB.x = AX(1385); BAOBAB.s = 1; BAOBAB.y = 676;
          ACACIAS = [{ x: AX(700), y: 612, s: 0.52, f: 1 }, { x: AX(850), y: 596, s: 0.38, f: -1 }, { x: AX(1150), y: 602, s: 0.46, f: 1 },
                     { x: AX(1235), y: 652, s: 0.78, f: -1 }, { x: AX(1545), y: 604, s: 0.44, f: 1 }, { x: AX(585), y: 590, s: 0.3, f: -1 }];
          MOUND = { x: POND.x + POND.rx + 64, y: 694, s: 0.95 };
        }
        // bushes on the plain, grass tufts along the bottom edge (they sway, live)
        BUSHES = [];
        const nb = narrow ? 5 : 9;
        for (let i = 0; i < nb; i++){
          const x = RX(470) + (DW - RX(470)) * (i + 0.2 + r() * 0.6) / nb, y = 640 + r() * 110;
          if (Math.abs(x - POND.x) < POND.rx * 1.15 && Math.abs(y - POND.y) < 46) continue;
          BUSHES.push({ x, y, s: (0.5 + r() * 0.5) * (0.6 + (y - 640) / 220), seed: 1 + Math.floor(r() * 1e6) });
        }
        BUSHES.sort((a, b) => a.y - b.y);
        TUFTS = [];
        const nt = Math.round(clamp(DW / 46, 10, 36));
        for (let i = 0; i < nt; i++) TUFTS.push({ x: DW * (i + r()) / nt, y: 884 + r() * 30, s: 0.5 + r() * 0.5, v: Math.floor(r() * 3), ph: r() * TAU, f: r() < 0.5 ? -1 : 1 });
        TUFTS.sort((a, b) => a.y - b.y);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SKY — sun, moon, stars, clouds, birds
      // ══════════════════════════════════════════════════════════════════════
      // the sun comes up on the right, climbs over the plain and goes down on
      // the LEFT — at sunset it hangs huge right behind the pride on the ledge,
      // then sinks behind the rock. The moon rides over the rock all night.
      function sunPos(v){
        const k = clamp01(v / 0.76), a = Math.PI * k;
        const xs = RX(420), rx = (DW * 0.86 - xs) / 1.911, cx = DW * 0.86 - rx;
        return { x: cx + Math.cos(a) * rx, y: 500 - Math.pow(Math.sin(a), 0.75) * 390, up: v < 0.80 };
      }
      function moonPos(v){
        const k = clamp01(((v - 0.70 + 1) % 1) / 0.32);
        return { x: lerp(RX(90), RX(560), k), y: 250 - Math.sin(Math.PI * k) * 120, up: v > 0.69 || v < 0.03 };
      }
      const STARS = []; { const r = makeRng(77); for (let i = 0; i < 140; i++) STARS.push({ x: r(), y: r() * r() * 0.95 + 0.01, s: 0.6 + r() * 1.5, ph: r() * TAU, f: 0.5 + r() * 2 }); }
      function drawStars(g, t){
        const a = L.stars; if (a <= 0.01) return;
        g.fillStyle = '#FFFFFF';
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph);
          g.globalAlpha = a * tw * (1 - s.y * 0.6);
          g.fillRect(s.x * DW, s.y * (HZ - 60), s.s, s.s);
        }
        g.globalAlpha = 1;
      }
      let shoot = null, nextShootAt = 20;
      function drawShoot(g, t){
        if (L.stars < 0.6){ shoot = null; return; }
        if (!shoot && t > nextShootAt){ shoot = { t0: t, x: rnd(0.15, 0.85) * DW, y: rnd(30, 200), vx: rnd(-1, 1) < 0 ? -520 : 520, vy: rnd(120, 220) }; nextShootAt = t + rnd(14, 40); }
        if (!shoot) return;
        const p = (t - shoot.t0) / 0.9; if (p >= 1){ shoot = null; return; }
        const x = shoot.x + shoot.vx * p * 0.9, y = shoot.y + shoot.vy * p * 0.9, k = Math.sin(p * Math.PI);
        g.strokeStyle = lg(g, x, y, x - shoot.vx * 0.16, y - shoot.vy * 0.16, [[0, 'rgba(255,255,255,' + (0.9 * k) + ')'], [1, 'rgba(255,255,255,0)']]);
        g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - shoot.vx * 0.16, y - shoot.vy * 0.16); g.stroke();
      }
      function drawSun(g){
        const p = sunPos(tod); if (!p.up || L.sunA <= 0.01) return;
        const R = L.sunR, a = L.sunA;
        glow(g, 'gold', p.x, p.y, R * 4.4, 0.55 * a * L.warm);
        glow(g, 'warm', p.x, p.y, R * 3.2, 0.6 * a * (1 - L.warm * 0.5));
        g.globalAlpha = a;
        g.fillStyle = rg(g, p.x, p.y - R * 0.2, R * 0.1, R, [[0, rgb(mixc(L.sun, [255, 255, 255], 0.6))], [0.75, rgb(L.sun)], [1, rgb(mixc(L.sun, L.glow, 0.5))]]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      const CRATERS = [[-0.3, -0.25, 0.22], [0.28, 0.1, 0.17], [-0.1, 0.38, 0.13], [0.34, -0.4, 0.1], [-0.5, 0.2, 0.09]];
      function drawMoon(g){
        const p = moonPos(tod); if (!p.up || L.moon <= 0.01) return;
        const R = 40, a = L.moon;
        glow(g, 'blue', p.x, p.y, R * 4.5, 0.4 * a);
        g.globalAlpha = a;
        g.fillStyle = rg(g, p.x - R * 0.3, p.y - R * 0.3, R * 0.1, R * 1.2, [[0, '#FFFDF2'], [0.7, '#E9ECF6'], [1, '#C4CCE4']]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.fillStyle = 'rgba(150,162,200,.34)';
        for (const c of CRATERS){ g.beginPath(); g.arc(p.x + c[0] * R, p.y + c[1] * R, c[2] * R, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }

      // ── clouds: three flat-bottomed heaps baked white once, recoloured per look
      const CLOUD_SRC = [], CLOUD_T = [], CLOUDS = [];
      for (let v = 0; v < 3; v++){
        const src = makeLayer(360, 150, 1), g = src.cx, r = makeRng(900 + v * 31), n = 6 + v;
        g.fillStyle = '#fff';
        for (let i = 0; i < n; i++){
          const u = (i + 0.5) / n, rad = (30 + r() * 24) * (0.5 + 0.95 * Math.sin(u * Math.PI));
          g.beginPath(); g.arc(46 + 268 * u, 114 - rad * 0.74, rad, 0, TAU); g.fill();
        }
        g.beginPath(); g.ellipse(180, 108, 156, 13, 0, 0, TAU); g.fill();
        g.clearRect(0, 117, 360, 40);
        CLOUD_SRC.push(src); CLOUD_T.push(makeLayer(360, 150, 1));
      }
      { const r = makeRng(31); for (let i = 0; i < 6; i++) CLOUDS.push({ u: r(), y: 50 + r() * 230, s: 0.55 + r() * 0.8, v: i % 3, sp: 3 + r() * 6, a: 0.75 + r() * 0.25 }); }
      function drawClouds(g, dt){
        const n = narrow ? 4 : CLOUDS.length, a = 0.35 + 0.65 * L.daylight, cs = clamp(DW / 1100, 0.5, 1);
        for (let i = 0; i < n; i++){
          const c = CLOUDS[i], sc = c.s * cs, span = DW + 400 * sc;
          c.u = (c.u + c.sp * dt / span) % 1;
          g.globalAlpha = a * c.a;
          g.drawImage(CLOUD_T[c.v].cv, c.u * span - 380 * sc, c.y - 75 * sc, 360 * sc, 150 * sc);
        }
        g.globalAlpha = 1;
      }

      // ── birds: small V's of flapping strokes; a flock crosses now and then,
      //    one follows a tap on the sky, and the baobab's roost bursts out
      const FLOCKS = []; let nextFlockAt = 5;
      function spawnFlock(t, x, y, burst){
        const dir = burst ? 0 : (x === undefined ? (Math.random() < 0.5 ? 1 : -1) : (x < DW / 2 ? 1 : -1));
        const f = { x: x === undefined ? (dir > 0 ? -60 : DW + 60) : x, y: y === undefined ? rnd(70, 330) : y, vx: dir * rnd(46, 74), vy: burst ? 0 : rnd(-9, 3), t0: t, birds: [] };
        const n = burst ? 9 : 4 + Math.floor(Math.random() * 4), sz = burst ? 8 : rnd(7, 11);
        for (let i = 0; i < n; i++){
          const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
          if (burst){ const a = -Math.PI * rnd(0.12, 0.88), v = rnd(70, 130); f.birds.push({ dx: rnd(-40, 40), dy: rnd(-30, 20), vx: Math.cos(a) * v * 1.3, vy: Math.sin(a) * v, sz: sz * rnd(0.8, 1.2), ph: rnd(0, TAU), fr: rnd(11, 14) }); }
          else f.birds.push({ dx: -dir * rank * sz * 2.1 + rnd(-3, 3), dy: side * rank * sz * 1.1 + rnd(-3, 3), vx: 0, vy: 0, sz: sz * rnd(0.85, 1.1), ph: rnd(0, TAU), fr: rnd(7, 9) });
        }
        FLOCKS.push(f); return f;
      }
      function drawFlocks(g, t, dt){
        if (t > nextFlockAt){ nextFlockAt = t + rnd(14, 34); if (L.daylight > 0.3 && FLOCKS.length < 3) spawnFlock(t); }
        if (!FLOCKS.length) return;
        g.strokeStyle = rgb(mixc(L.treeD, [26, 22, 36], 0.55)); g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = FLOCKS.length - 1; i >= 0; i--){
          const f = FLOCKS[i]; f.x += f.vx * dt; f.y += f.vy * dt;
          let seen = false;
          for (const b of f.birds){
            b.dx += b.vx * dt; b.dy += b.vy * dt;
            const bx = f.x + b.dx, by = f.y + b.dy + Math.sin(t * 1.3 + b.ph) * 3, w = b.sz, fl = Math.sin(t * b.fr + b.ph);
            if (bx < -40 || bx > DW + 40 || by < -40) continue;
            seen = true;
            g.lineWidth = w * 0.24;
            g.beginPath(); g.moveTo(bx - w, by - fl * w * 0.6);
            g.quadraticCurveTo(bx - w * 0.45, by - w * 0.35 - fl * w * 0.2, bx, by);
            g.quadraticCurveTo(bx + w * 0.45, by - w * 0.35 - fl * w * 0.2, bx + w, by - fl * w * 0.6); g.stroke();
          }
          if (!seen && t - f.t0 > 2) FLOCKS.splice(i, 1);
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE STILL WORLD — painters for the baked layers
      // ══════════════════════════════════════════════════════════════════════
      // a smooth open line through points (quadratics through the midpoints)
      function smoothLine(g, P, kx, move){
        if (move) g.moveTo(P[0][0] * kx, P[0][1]); else g.lineTo(P[0][0] * kx, P[0][1]);
        for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0] * kx, P[i][1], (P[i][0] + P[i + 1][0]) / 2 * kx, (P[i][1] + P[i + 1][1]) / 2);
        g.lineTo(P[P.length - 1][0] * kx, P[P.length - 1][1]);
      }
      // a tapered limb along a quadratic curve — trunks and boughs
      function taperQ(g, x0, y0, cx, cy, x1, y1, w0, w1){
        const N = 8, A = [], B = [];
        for (let i = 0; i <= N; i++){
          const u = i / N, m = 1 - u;
          const x = m * m * x0 + 2 * m * u * cx + u * u * x1, y = m * m * y0 + 2 * m * u * cy + u * u * y1;
          let tx = 2 * m * (cx - x0) + 2 * u * (x1 - cx), ty = 2 * m * (cy - y0) + 2 * u * (y1 - cy);
          const l = Math.hypot(tx, ty) || 1, w = lerp(w0, w1, u) / 2; tx /= l; ty /= l;
          A.push([x - ty * w, y + tx * w]); B.push([x + ty * w, y - tx * w]);
        }
        g.beginPath(); g.moveTo(A[0][0], A[0][1]);
        for (let i = 1; i <= N; i++) g.lineTo(A[i][0], A[i][1]);
        for (let i = N; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
        g.closePath(); g.fill();
      }
      // a flat-topped ACACIA: a leaning trunk forking into boughs under a wide
      // umbrella of leaf pads. Units: ~170 tall, ~300 wide at s = 1; (x, y) = foot.
      // k = 0..1 how far it stands (far trees melt into the haze)
      function drawAcacia(g, x, y, s, f, seed, k){
        const r = makeRng(seed), far = k || 0;
        const trunk = mixc(L.trunk, L.mtN, far * 0.6), leaf = mixc(L.tree, L.mtN, far * 0.55), leafD = mixc(L.treeD, L.mtN, far * 0.55);
        const hi = mixc(leaf, [255, 244, 170], 0.3 * L.daylight * (1 - far));
        g.save(); g.translate(x, y); g.scale(s * f, s);
        g.fillStyle = lg(g, -12, 0, 16, 0, [[0, rgb(mixc(trunk, L.rockL, 0.22 * L.daylight))], [0.55, rgb(trunk)], [1, rgb(mixc(trunk, [0, 0, 0], 0.25))]]);
        const lean = 8 + r() * 14, fy = -70 - r() * 12;
        taperQ(g, 0, 2, lean * 0.2, fy * 0.5, lean, fy, 19, 11);
        g.beginPath(); g.ellipse(0, 1, 15, 4, 0, 0, TAU); g.fill();                       // the root flare
        const tips = [-112, -58, 4, 62, 116];
        for (const tx of tips) taperQ(g, lean, fy + 3, lean + (tx - lean) * 0.35, fy - 34, tx + r() * 12 - 6, -128 - r() * 8, 9, 3.4);
        // the crown: pads along a flat base — shaded underside, body, lit tops
        const PADS = [];
        for (let i = 0; i < 7; i++){ const u = i / 6; PADS.push([-128 + 256 * u + r() * 14 - 7, -140 - Math.sin(u * Math.PI) * 13 - r() * 6, 40 + r() * 16 + Math.sin(u * Math.PI) * 10, 15 + r() * 6]); }
        g.fillStyle = rgb(leafD);
        g.beginPath(); g.ellipse(0, -128, 148, 15, 0, 0, TAU); g.fill();
        for (const p of PADS){ g.beginPath(); g.ellipse(p[0], p[1] + 8, p[2], p[3], 0, 0, TAU); g.fill(); }
        g.fillStyle = lg(g, 0, -168, 0, -122, [[0, rgb(leaf)], [1, rgb(mixc(leaf, leafD, 0.7))]]);
        for (const p of PADS){ g.beginPath(); g.ellipse(p[0], p[1], p[2], p[3], 0, 0, TAU); g.fill(); }
        g.fillStyle = rgb(hi, 0.85);
        for (const p of PADS){ g.beginPath(); g.ellipse(p[0] - p[2] * 0.18, p[1] - p[3] * 0.42, p[2] * 0.62, p[3] * 0.42, 0, 0, TAU); g.fill(); }
        g.restore();
      }
      // the BAOBAB: a fat bottle of a trunk, stubby boughs, a few leaf puffs.
      // ~250 tall at s = 1; (x, y) = foot
      const BAO_TIPS = [[-92, -214, -40, -150], [-44, -246, -16, -160], [8, -256, 6, -160], [58, -240, 22, -158], [100, -204, 40, -148]];
      function drawBaobab(g, x, y, s){
        g.save(); g.translate(x, y); g.scale(s, s);
        const bark = mixc(L.trunk, L.rock, 0.45), barkL = mixc(bark, L.rockL, 0.55 * (0.4 + 0.6 * L.daylight)), barkD = mixc(bark, [0, 0, 0], 0.3);
        g.fillStyle = lg(g, -56, 0, 60, 0, [[0, rgb(barkL)], [0.45, rgb(bark)], [1, rgb(barkD)]]);
        for (const b of BAO_TIPS) taperQ(g, b[2], b[3], (b[0] + b[2]) / 2 + (b[0] < 0 ? -10 : 10), b[3] - 34, b[0], b[1], 26, 6);
        g.beginPath(); g.moveTo(-60, 2);
        g.bezierCurveTo(-46, -30, -52, -100, -44, -162); g.quadraticCurveTo(0, -178, 46, -160);
        g.bezierCurveTo(52, -100, 48, -30, 64, 2); g.quadraticCurveTo(0, 12, -60, 2); g.fill();
        g.strokeStyle = rgb(barkD, 0.22); g.lineWidth = 3; g.lineCap = 'round';
        for (const gx of [-26, -4, 20]){ g.beginPath(); g.moveTo(gx, -8); g.quadraticCurveTo(gx - 4, -80, gx + 2, -150); g.stroke(); }
        const leaf = L.tree, hi = mixc(leaf, [255, 244, 170], 0.3 * L.daylight);
        for (const b of BAO_TIPS){
          g.fillStyle = rgb(L.treeD); g.beginPath(); g.ellipse(b[0], b[1] + 3, 30, 15, 0, 0, TAU); g.fill();
          g.fillStyle = rgb(leaf);    g.beginPath(); g.ellipse(b[0], b[1] - 3, 28, 14, 0, 0, TAU); g.fill();
          g.fillStyle = rgb(hi, 0.8); g.beginPath(); g.ellipse(b[0] - 6, b[1] - 8, 16, 6, 0, 0, TAU); g.fill();
        }
        g.restore();
      }
      function drawBush(g, x, y, s, seed){
        const r = makeRng(seed), hi = mixc(L.tree, [255, 244, 170], 0.28 * L.daylight);
        g.fillStyle = rgb([14, 10, 20], 0.10 + 0.12 * L.daylight);
        g.beginPath(); g.ellipse(x, y + 2 * s, 40 * s, 7 * s, 0, 0, TAU); g.fill();
        for (let i = 0; i < 5; i++){
          const bx = x + (i - 2) * 14 * s + (r() - 0.5) * 8 * s, rad = (15 + r() * 9) * s * (1 - Math.abs(i - 2) * 0.14), by = y - rad * 0.8;
          g.fillStyle = rgb(L.treeD); g.beginPath(); g.arc(bx, by + 3 * s, rad, 0, TAU); g.fill();
          g.fillStyle = rgb(L.tree);  g.beginPath(); g.arc(bx, by, rad * 0.94, 0, TAU); g.fill();
          g.fillStyle = rgb(hi, 0.8); g.beginPath(); g.arc(bx - rad * 0.22, by - rad * 0.3, rad * 0.52, 0, TAU); g.fill();
        }
      }
      // the termite mound: a lumpy red-earth spire
      function drawMound(g, x, y, s){
        const c = mixc(L.rock, [176, 96, 60], 0.45), cL = mixc(c, L.rockL, 0.5), cD = mixc(c, L.rockD, 0.6);
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = rgb([14, 10, 20], 0.10 + 0.12 * L.daylight);
        g.beginPath(); g.ellipse(6, 1, 46, 7, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, -30, 0, 34, 0, [[0, rgb(cL)], [0.5, rgb(c)], [1, rgb(cD)]]);
        g.beginPath(); g.moveTo(-34, 2);
        g.bezierCurveTo(-26, -20, -20, -30, -14, -52); g.bezierCurveTo(-12, -74, -4, -92, 2, -92);
        g.bezierCurveTo(9, -92, 10, -70, 14, -58); g.bezierCurveTo(20, -66, 27, -62, 26, -46);
        g.bezierCurveTo(28, -24, 34, -12, 40, 2); g.closePath(); g.fill();
        g.restore();
      }

      function paintSky(){
        const g = skyL.cx;
        g.fillStyle = lg(g, 0, 0, 0, skyL.h, [[0, rgb(L.top)], [0.52, rgb(L.mid)], [0.92, rgb(L.hz)], [1, rgb(L.hz)]]);
        g.fillRect(0, 0, skyL.w, skyL.h);
      }
      // ── the mountains: a far violet range with one broad snow-capped peak,
      //    a nearer range of low hills, tiny acacias in the haze of the horizon
      const farY = x => { const KX = narrow ? DW * 0.56 : AX(1050), KW = 330 * Math.max(AXK, 0.62), d = Math.abs(x - KX) / KW;
        return 472 - noise1(x * 0.0042 + 3) * 50 - noise1(x * 0.014 + 9) * 16 - 132 * smooth(clamp01(1.12 * (1 - d))) - 22 * Math.max(0, 1 - d * d * 9); };
      const nearY = x => 512 - noise1(x * 0.0062 + 40) * 46 - noise1(x * 0.021 + 2) * 11;
      function paintFar(){
        const g = farL.cx; g.clearRect(0, 0, farL.w, farL.h);
        g.save(); g.translate(0, -FAR_TOP);
        g.fillStyle = lg(g, 0, 300, 0, HZ + 6, [[0, rgb(L.mtF)], [1, rgb(mixc(L.mtF, L.hz, 0.5))]]);
        g.beginPath(); g.moveTo(0, HZ + 10);
        for (let x = 0; x <= DW + 8; x += 8) g.lineTo(x, farY(x));
        g.lineTo(DW, HZ + 10); g.closePath(); g.fill();
        // the snow: everything above a ragged line on the big peak
        const KX = narrow ? DW * 0.56 : AX(1050), KW = 330 * Math.max(AXK, 0.62);
        g.fillStyle = lg(g, 0, 262, 0, 372, [[0, rgb(L.snow)], [1, rgb(mixc(L.snow, L.mtF, 0.4))]]);
        g.beginPath(); let started = false; const back = [];
        for (let x = KX - KW * 0.62; x <= KX + KW * 0.62; x += 6){
          const y = farY(x), line = 322 + noise1(x * 0.05) * 26 + Math.abs(((x * 0.045) % 2) - 1) * 18;
          if (y >= line) continue;
          if (!started){ g.moveTo(x, y); started = true; } else g.lineTo(x, y);
          back.push([x, line]);
        }
        for (let i = back.length - 1; i >= 0; i--) g.lineTo(back[i][0], back[i][1]);
        if (started){ g.closePath(); g.fill(); }
        g.fillStyle = lg(g, 0, 450, 0, HZ + 8, [[0, rgb(L.mtN)], [1, rgb(mixc(L.mtN, L.pF, 0.55))]]);
        g.beginPath(); g.moveTo(0, HZ + 10);
        for (let x = 0; x <= DW + 8; x += 8) g.lineTo(x, nearY(x));
        g.lineTo(DW, HZ + 10); g.closePath(); g.fill();
        const r = makeRng(606), n = Math.round(clamp(DW / 150, 4, 11));
        for (let i = 0; i < n; i++) drawAcacia(g, DW * (i + 0.15 + r() * 0.7) / n, HZ + 3 + r() * 9, 0.1 + r() * 0.07, r() < 0.5 ? -1 : 1, 50 + i * 7, 0.75);
        g.restore();
      }
      // ── the plain, the waterhole, the trees, PRIDE ROCK
      const waveY = (x, y0, amp, seed) => y0 + (noise1(x * 0.004 + seed) - 0.5) * amp * 2 + (noise1(x * 0.017 + seed * 3) - 0.5) * amp * 0.5;
      function paintPond(g){
        const P = POND, mud = mixc(L.pN, [70, 48, 30], 0.4);
        g.fillStyle = rgb(mud); g.beginPath(); g.ellipse(P.x, P.y + 2, P.rx + 16, P.ry + 8, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(mud, L.pF, 0.5), 0.8); g.beginPath(); g.ellipse(P.x - 4, P.y - 1, P.rx + 9, P.ry + 4, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, P.y - P.ry, 0, P.y + P.ry, [[0, rgb(mixc(L.water, L.hz, 0.45))], [0.5, rgb(L.water)], [1, rgb(mixc(L.water, L.top, 0.4))]]);
        g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(L.water, [255, 255, 255], 0.55), 0.35);
        g.beginPath(); g.ellipse(P.x - P.rx * 0.2, P.y - P.ry * 0.42, P.rx * 0.6, P.ry * 0.2, 0, 0, TAU); g.fill();
        // reeds at both ends
        const r = makeRng(88); g.lineCap = 'round';
        for (const side of [-1, 1]) for (let i = 0; i < 9; i++){
          const bx = P.x + side * (P.rx * (0.78 + r() * 0.3)), by = P.y + (r() - 0.35) * P.ry * 1.2, h = 26 + r() * 30, lean = (r() - 0.5) * 14;
          g.strokeStyle = rgb(mixc(L.tree, L.grassD, r())); g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + lean * 0.3, by - h * 0.6, bx + lean, by - h); g.stroke();
          if (i % 3 === 0){ g.fillStyle = rgb(mixc(L.trunk, [120, 70, 40], 0.4)); g.beginPath(); g.ellipse(bx + lean, by - h - 4, 2.6, 7, lean * 0.02, 0, TAU); g.fill(); }
        }
      }
      function rockPath(g){
        g.beginPath(); smoothLine(g, ROCK_TOP, RKX, true); smoothLine(g, ROCK_UNDER, RKX, false);
        g.quadraticCurveTo(RX(470), ROCK_FOOT + 10, RX(360), ROCK_FOOT + 12); g.lineTo(-80, ROCK_FOOT + 18); g.closePath();
      }
      function paintRock(g){
        const sh = [14, 10, 20];
        // its shadow on the plain, under the ledge
        g.fillStyle = rgb(sh, 0.14 + 0.16 * L.daylight);
        g.beginPath(); g.ellipse(RX(520), ROCK_FOOT + 8, RX(230), 20, 0, 0, TAU); g.fill();
        g.save(); g.translate(0, ROCK_FOOT); g.scale(1, RKY); g.translate(0, -ROCK_FOOT);
        g.fillStyle = lg(g, RX(120), 400, RX(500), 720, [[0, rgb(mixc(L.rock, L.rockL, 0.4))], [0.55, rgb(L.rock)], [1, rgb(L.rockD)]]);
        rockPath(g); g.fill();
        g.save(); rockPath(g); g.clip();
        // the underside of the ledge falls into shadow
        g.strokeStyle = rgb(L.rockD, 0.13); g.lineCap = 'round'; g.lineJoin = 'round';
        for (const w of [190, 130, 78, 40]){ g.lineWidth = w * Math.max(0.6, RKX); g.beginPath(); smoothLine(g, ROCK_UNDER, RKX, true); g.stroke(); }
        // strata: long ledges following the slope of the top, a lit lip over a dark seam
        const r = makeRng(515);
        for (const d of [44, 92, 146, 204, 268, 330]){
          const wob = 6 + r() * 8, ph = r() * 9;
          for (const pass of [0, 1]){
            g.strokeStyle = pass ? rgb(L.rockL, 0.16) : rgb(L.rockD, 0.26); g.lineWidth = pass ? 2.5 : 4.5;
            g.beginPath();
            for (let x = -80; x <= 640; x += 20){
              const y = ridgeY0(RX(Math.min(x, 604))) + d * (1 + (604 - Math.min(x, 604)) / 2400) + Math.sin(x * 0.021 + ph) * wob + (pass ? -4 : 0);
              if (x === -80) g.moveTo(RX(x), y); else g.lineTo(RX(x), y);
            }
            g.stroke();
          }
        }
        // a few cracks running down from the top
        g.strokeStyle = rgb(L.rockD, 0.3); g.lineWidth = 2.2;
        for (const cx of [70, 215, 345, 468]){
          let x = RX(cx), y = ridgeY0(x) + 20; g.beginPath(); g.moveTo(x, y);
          for (let i = 0; i < 4; i++){ x += (r() - 0.45) * 16; y += 14 + r() * 16; g.lineTo(x, y); }
          g.stroke();
        }
        // the top surface the pride walks on, lit by the sky
        g.fillStyle = lg(g, 0, 330, 0, 520, [[0, rgb(mixc(L.rockL, [255, 255, 255], 0.12))], [1, rgb(mixc(L.rockL, L.rock, 0.35))]]);
        g.beginPath(); smoothLine(g, ROCK_TOP, RKX, true);
        for (let i = ROCK_TOP.length - 1; i >= 0; i--) g.lineTo(RX(ROCK_TOP[i][0]) - 6 * (i / 7), ROCK_TOP[i][1] + 22 + 6 * (1 - i / 7));
        g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = rgb(mixc(L.rockL, [255, 250, 230], 0.45), 0.75); g.lineWidth = 2.4;
        g.beginPath(); smoothLine(g, ROCK_TOP, RKX, true); g.stroke();
        g.restore();
        // dry grass tufts on the top, boulders at the foot
        g.lineWidth = 2;
        for (const u of [28, 150, 262, 396, 500]){
          const x = RX(u), y = ridgeY(x) + 12 * RKY;
          for (let i = -2; i <= 2; i++){ g.strokeStyle = rgb(mixc(L.grass, L.grassD, (i + 2) / 4)); g.beginPath(); g.moveTo(x + i * 2, y); g.quadraticCurveTo(x + i * 4, y - 9, x + i * 7, y - 15 + Math.abs(i) * 2); g.stroke(); }
        }
        for (const b of [[474, 716, 26, 15], [520, 726, 17, 10], [398, 730, 20, 11]]){
          g.fillStyle = lg(g, 0, b[1] - b[3], 0, b[1] + b[3], [[0, rgb(mixc(L.rock, L.rockL, 0.5))], [1, rgb(L.rockD)]]);
          g.beginPath(); g.ellipse(RX(b[0]), b[1], b[2], b[3], 0, 0, TAU); g.fill();
        }
      }
      function paintGround(){
        const g = groundL.cx; g.clearRect(0, 0, groundL.w, groundL.h);
        g.save(); g.translate(0, -GROUND_TOP);
        g.fillStyle = lg(g, 0, HZ, 0, 640, [[0, rgb(mixc(L.pF, L.hz, 0.35))], [0.35, rgb(L.pF)], [1, rgb(mixc(L.pF, L.pM, 0.6))]]);
        g.fillRect(0, HZ, DW, 120);
        const band = (y0, amp, seed, c0, c1, yEnd) => {
          g.fillStyle = lg(g, 0, y0 - amp, 0, yEnd, [[0, rgb(c0)], [1, rgb(c1)]]);
          g.beginPath(); g.moveTo(0, DH + 2);
          for (let x = 0; x <= DW + 12; x += 12) g.lineTo(x, waveY(x, y0, amp, seed));
          g.lineTo(DW, DH + 2); g.closePath(); g.fill();
          g.strokeStyle = rgb(mixc(c0, [255, 246, 200], 0.3), 0.5); g.lineWidth = 2;
          g.beginPath(); for (let x = 0; x <= DW + 12; x += 12){ const y = waveY(x, y0, amp, seed) + 1; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
        };
        band(626, 9, 5, mixc(L.pM, L.pF, 0.25), L.pM, 760);
        band(752, 12, 11, mixc(L.pN, L.pM, 0.45), mixc(L.pN, [0, 0, 0], 0.16), DH);
        // dry grass: small fans of blades, denser and bigger toward the front
        const r = makeRng(1717), n = Math.round(DW * 0.42); g.lineCap = 'round';
        for (let i = 0; i < n; i++){
          const d = r(), y = HZ + 14 + d * d * 320, x = r() * DW, sz = 3 + d * 11;
          g.strokeStyle = rgb(mixc(L.grass, L.grassD, r()), 0.75); g.lineWidth = 1 + d * 1.2;
          g.beginPath();
          for (let b = -1; b <= 1; b++){ g.moveTo(x + b * sz * 0.2, y); g.quadraticCurveTo(x + b * sz * 0.45, y - sz * 0.6, x + b * sz * 0.9, y - sz + Math.abs(b) * sz * 0.25); }
          g.stroke();
        }
        // everything that stands on the plain, far to near
        const items = [{ y: POND.y - POND.ry, d: () => paintPond(g) }, { y: BAOBAB.y, d: () => { g.fillStyle = rgb([14, 10, 20], 0.10 + 0.14 * L.daylight); g.beginPath(); g.ellipse(BAOBAB.x, BAOBAB.y + 2, 118 * BAOBAB.s, 13 * BAOBAB.s, 0, 0, TAU); g.fill();
                         drawBaobab(g, BAOBAB.x, BAOBAB.y, BAOBAB.s); } },
                       { y: MOUND.y, d: () => drawMound(g, MOUND.x, MOUND.y, MOUND.s) }, { y: ROCK_FOOT - 30, d: () => paintRock(g) }];
        ACACIAS.forEach((a, i) => items.push({ y: a.y, d: () => {
          g.fillStyle = rgb([14, 10, 20], 0.10 + 0.14 * L.daylight); g.beginPath(); g.ellipse(a.x, a.y + 3 * a.s, 120 * a.s, 12 * a.s, 0, 0, TAU); g.fill();
          drawAcacia(g, a.x, a.y, a.s, a.f, 300 + i * 13, clamp01((640 - a.y) / 110) * 0.5); } }));
        for (const b of BUSHES) items.push({ y: b.y, d: () => drawBush(g, b.x, b.y, b.s, b.seed) });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) it.d();
        g.restore();
      }

      // ── the front: the grass bank along the bottom edge
      function paintFront(){
        const g = frontL.cx; g.clearRect(0, 0, frontL.w, frontL.h);
        g.save(); g.translate(0, -FRONT_TOP);
        const c0 = mixc(L.grassD, L.pN, 0.35), c1 = mixc(c0, [0, 0, 0], 0.3);
        g.fillStyle = lg(g, 0, 874, 0, DH, [[0, rgb(c0)], [1, rgb(c1)]]);
        g.beginPath(); g.moveTo(0, DH + 2);
        for (let x = 0; x <= DW + 12; x += 12) g.lineTo(x, waveY(x, 886, 5, 23));
        g.lineTo(DW, DH + 2); g.closePath(); g.fill();
        const r = makeRng(2323); g.lineCap = 'round';
        for (let x = 0; x < DW; x += 6 + r() * 6){
          const y = waveY(x, 888, 5, 23) + r() * 10, h = 12 + r() * 26, lean = (r() - 0.5) * 16;
          g.strokeStyle = rgb(mixc(L.grass, c0, 0.3 + r() * 0.6)); g.lineWidth = 2 + r() * 1.5;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke();
        }
        g.restore();
      }
      // ── the swaying tufts along the bottom: three fans of blades baked white,
      //    recoloured per look, rotated a little by the wind every frame
      const TUFT_SRC = [], TUFT_T = [];
      for (let v = 0; v < 3; v++){
        const src = makeLayer(96, 84, 1), g = src.cx, r = makeRng(40 + v * 17), n = 7 + v;
        g.strokeStyle = '#fff'; g.lineCap = 'round';
        for (let i = 0; i < n; i++){
          const u = i / (n - 1) - 0.5, h = 46 + r() * 30 - Math.abs(u) * 26, lean = u * 62 + (r() - 0.5) * 10;
          g.lineWidth = 3.2 + r() * 1.6;
          g.beginPath(); g.moveTo(48 + u * 16, 83); g.quadraticCurveTo(48 + u * 22 + lean * 0.25, 83 - h * 0.62, 48 + lean, 83 - h); g.stroke();
        }
        TUFT_SRC.push(src); TUFT_T.push(makeLayer(96, 84, 1));
      }
      const wind = t => 0.25 + 0.55 * noise1(t * 0.13) + 0.2 * noise1(t * 0.61 + 7);
      function drawTufts(g, t){
        const w = wind(t);
        for (const f of TUFTS){
          const a = (Math.sin(t * 1.5 + f.ph) * 0.07 + (w - 0.5) * 0.2) * f.f;
          g.save(); g.translate(f.x, f.y); g.rotate(a); g.scale(f.s * f.f, f.s);
          g.drawImage(TUFT_T[f.v].cv, -48, -83);
          g.restore();
        }
      }
      // the vignette: a small radial sprite stretched over the whole screen
      vigL = makeLayer(64, 64, 1);
      vigL.cx.fillStyle = rg(vigL.cx, 32, 30, 14, 46, [[0, 'rgba(12,6,22,0)'], [0.6, 'rgba(12,6,22,0.05)'], [1, 'rgba(12,6,22,0.42)']]);
      vigL.cx.fillRect(0, 0, 64, 64);

      let lookSig = '';
      function repaintIfNeeded(){
        const key = Math.floor(tod * KEYS.length * 24);
        if (key === lookKey) return;
        lookKey = key; L = lookAt(tod);
        // a key is HELD for a third of its span — nothing moved, nothing to repaint
        const sig = rgb(L.top) + rgb(L.pN) + rgb(L.rock) + rgb(L.tree) + rgb(L.lit) + L.daylight.toFixed(3);
        if (sig === lookSig) return;
        lookSig = sig;
        LIT = [Math.round(L.lit[0] / 255 * 50) / 50, Math.round(L.lit[1] / 255 * 50) / 50, Math.round(L.lit[2] / 255 * 50) / 50];
        paintSky(); paintFar(); paintGround(); paintFront();
        for (let v = 0; v < 3; v++){
          tintSprite(CLOUD_SRC[v], CLOUD_T[v], L.cloud, mixc(L.cloud, L.mid, 0.5));
          tintSprite(TUFT_SRC[v], TUFT_T[v], mixc(L.grass, [255, 246, 190], 0.12 * L.daylight), mixc(L.grassD, L.pN, 0.4));
        }
        perf.repaints = (perf.repaints || 0) + 1;
      }

      let warmTs = 0;
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = Math.max(1, Math.round(W * DPR)); canvas.height = Math.max(1, Math.round(H * DPR));
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H)))); AXK = Math.min(1, DW / DW0);
        S = H / DH; OX = (W - DW * S) / 2; OY = 0;
        if (DW !== layoutDW){ layout(); recast(); }
        const ld = DPR * S;                                  // layer pixels per design unit
        skyL = makeLayer(4, 256, 1);
        farL = makeLayer(DW, HZ + 12 - FAR_TOP, ld); groundL = makeLayer(DW, DH - GROUND_TOP, ld); frontL = makeLayer(DW, DH - FRONT_TOP, ld);
        lookKey = -1; lookSig = ''; repaintIfNeeded(); warmTs = 0;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE CAST — the pride on the rock, the herds on the plain
      // ══════════════════════════════════════════════════════════════════════
      // every animal: { R: its rig, q: the state the rig draws from (x, y = the
      // ground point, s, dir, wt, go, run, pose, tint, lit …), act, … }
      let rigsReady = false, autoHerds = true, lastKind = '', nextHerdAt = 1.5, prideActAt = 12, lionActAt = 40;
      const PRIDE = [], HERDS = [], PUFFS = [], HEARTS = [], DRAWN = [];
      let roar = null;                                     // { t0 } — the lion's roar shakes the ground
      const popCap = () => narrow ? 5 : IS_TOUCH ? 7 : 9;
      const maxHerds = () => narrow ? 1 : 2;
      function makeAnimal(rigName, x, y, s, dir){
        return { R: window[rigName], rigName, kind: '', herd: null, def: null,
                 q: { x, y, s, dir, ph: Math.random() * 6, wt: Math.random() * TAU, moving: false, go: 0, run: false, pose: 0,
                      tint: pick(TINTS), lit: LIT, bowtie: false, ribbon: false },
                 act: null, yOff: 0, rot: 0, tilt: 0, flip: 1, acts: ['pose'], jumpH: 0, vent: [50, 60], pauseUntil: 0, turn: false };
      }
      // the gait follows the ground covered, so the feet stay planted
      function advance(a, dx, dt){
        const q = a.q, R = a.R;
        q.moving = dx !== 0;
        q.go += ((q.moving ? 1 : 0) - q.go) * Math.min(1, dt * 5);
        if (dx) q.wt += TAU * Math.abs(dx) / ((q.run ? (R.RUN_STRIDE || R.STRIDE) : R.STRIDE) * q.s);
      }

      // ── the pride: rig · size · the stretch of the rock top it paces (rock
      //    coordinates) · speed · pause at each end · how deep it stands on the top
      const PRIDE_DEF = [
        { rig: 'LionRig',    s: 1.42, a: 200, b: 508, x0: 430, dir: 1,  speed: 30, pause: [3, 8], dy: 5,  bow: true, perch: true, acts: ['pose', 'fart'], vent: [78, 70] },
        { rig: 'LionessRig', s: 1.36, a: 70,  b: 400, x0: 240, dir: -1, speed: 36, pause: [3, 8], dy: 10, bow: true, acts: ['pose', 'jump', 'fart'], vent: [56, 64] },
        { rig: 'LionessRig', s: 0.98, a: 40,  b: 330, x0: 90,  dir: 1,  speed: 42, pause: [3, 8], dy: 14, ribbon: true, teen: true, acts: ['pose', 'jump', 'fart'], vent: [56, 64] },
        { rig: 'CubRig',     s: 1.3,  a: 24,  b: 520, x0: 340, dir: -1, speed: 62, pause: [2, 5], dy: 18, ribbon: true, acts: ['pose', 'jump', 'fart'], vent: [30, 34] },
      ];
      // in the game the exercise panel (.wrap, frosted glass) covers the middle of
      // the screen: where there is a clear strip to its left wide enough for a
      // lion, the pride keeps to it instead of pacing on under the glass
      let clearX = Infinity, nextClearAt = 0;
      function measureClear(){
        const w = doc.querySelector('.wrap'); let cx = Infinity;
        if (w){ const r = w.getBoundingClientRect(); if (r.width > 0) cx = (r.left - OX) / S; }
        clearX = cx > 360 ? cx : Infinity;
      }
      const seatY = (d, x) => ridgeY(x) + d.dy * PRS * Math.min(1, RKY + 0.3);
      function buildPride(){
        PRIDE.length = 0;
        if (!rigsReady) return;
        for (const d of PRIDE_DEF){
          if (!window[d.rig] || (d.teen && DW < 560)) continue;
          const a = makeAnimal(d.rig, Math.max(RX(d.x0), window[d.rig].WIDTH * d.s * PRS * 1.1), 0, d.s * PRS, d.dir);
          a.def = d; a.acts = d.acts; a.vent = d.vent; a.jumpH = 20; a.kind = 'pride';
          a.q.ribbon = !!d.ribbon; a.q.bowtie = !d.ribbon && d.bow && Math.random() < BOWTIE_PRIDE; a.q.tint = 1;
          a.q.y = seatY(d, a.q.x); a.pauseUntil = rnd(0, 3);
          PRIDE.push(a);
        }
      }
      // personal space: nobody settles down on top of a bigger member of the pride
      const size = a => a.R.HEIGHT * a.q.s;
      const crowded = a => PRIDE.some(b => b !== a && !b.q.moving && size(b) > size(a) && Math.abs(a.q.x - b.q.x) < (a.R.WIDTH * a.q.s + b.R.WIDTH * b.q.s) * 0.6);
      function stepPride(a, t, dt){
        const q = a.q, d = a.def; let dx = 0;
        if (!a.act && a.pauseUntil - t > 0.5 && crowded(a)) a.pauseUntil = t + 0.4;
        if (!a.act && t >= a.pauseUntil){
          if (a.turn){ q.dir = -q.dir; a.turn = false; }
          const lo = Math.max(RX(d.a), a.R.WIDTH * q.s * 1.22), hi = Math.max(lo + 40, Math.min(RX(d.b), clearX - a.R.WIDTH * q.s * 0.8));
          if (q.x > hi + 4) q.dir = -1;
          dx = q.dir * d.speed * PRS * dt; q.x += dx;
          if ((q.dir > 0 && q.x >= hi) || (q.dir < 0 && q.x <= lo)){ q.x = clamp(q.x, lo, hi); a.pauseUntil = t + (d.perch ? (q.dir > 0 ? rnd(6, 12) : rnd(0.6, 1.6)) : rnd(d.pause[0], d.pause[1])); a.turn = true; }
          else if (Math.random() < dt * 0.035 && !crowded(a)) a.pauseUntil = t + rnd(2, 5);        // stops to look out over the plain
        }
        q.y = seatY(d, q.x); a.tilt = ridgeTilt(q.x) * 0.8;
        advance(a, dx, dt);
      }
      // two of the pride meet nose to nose → a heart
      function prideHearts(t){
        for (let i = 0; i < PRIDE.length; i++) for (let j = i + 1; j < PRIDE.length; j++){
          let a = PRIDE[i], b = PRIDE[j]; if (a.q.x > b.q.x){ const c = a; a = b; b = c; }
          if (a.q.dir < 0 || b.q.dir > 0) continue;
          const gap = (b.q.x - b.R.WIDTH * b.q.s * 0.85) - (a.q.x + a.R.WIDTH * a.q.s * 0.85);
          if (gap > 18 * PRS || gap < -44 * PRS) continue;
          const id = i * 8 + j; if (HEARTS.some(h => h.id === id)) continue;
          HEARTS.push({ id, t0: t, x: (a.q.x + a.R.WIDTH * a.q.s * 0.85 + b.q.x - b.R.WIDTH * b.q.s * 0.85) / 2,
                        y: Math.min(a.q.y - a.R.HEIGHT * a.q.s, b.q.y - b.R.HEIGHT * b.q.s) - 8 });
        }
      }

      // ── the herds: a family of one kind crossing the plain in one lane
      const population = () => HERDS.reduce((n, h) => n + h.members.length, 0);
      function spawnHerd(t, forceKind, opts){
        if (!rigsReady) return null;
        opts = opts || {};
        const kinds = Object.keys(KINDS).filter(k => window[KINDS[k].rig]);
        let kind = forceKind && kinds.indexOf(forceKind) >= 0 ? forceKind : pick(kinds.filter(k => k !== lastKind));
        if (!kind) kind = kinds[0];
        if (!kind) return null;
        lastKind = kind;
        const K = KINDS[kind], R = window[K.rig], room = Math.max(1, popCap() - population());
        let adults = opts.adults || 1 + Math.floor(Math.random() * 3), young = opts.young !== undefined ? opts.young : (Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 0);
        while (adults + young > room){ if (young) young--; else adults--; }
        const sizes = []; for (let i = 0; i < adults; i++) sizes.push(1); for (let i = 0; i < young; i++) sizes.splice(1 + Math.floor(Math.random() * sizes.length), 0, pick([0.62, 0.5]));
        const dir = opts.dir || (Math.random() < 0.5 ? 1 : -1), run = opts.run !== undefined ? !!opts.run : Math.random() < K.runP;
        const other = HERDS[0], lane = opts.lane !== undefined ? opts.lane : other ? (other.lane < 0.5 ? rnd(0.6, 1) : rnd(0, 0.4)) : Math.random();
        const herd = { kind, dir, run, lane, members: [], haltUntil: 0, speed: (run ? K.runSpeed : K.speed) * rnd(0.92, 1.1) * HS, nextActAt: t + rnd(3, 9), entered: false };
        const y0 = 752 + lane * 84, sL = K.sc * HS * (0.96 + 0.26 * lane);
        let x = dir > 0 ? -R.WIDTH * sL * 1.3 : DW + R.WIDTH * sL * 1.3, prevHalf = 0;
        sizes.forEach((sz, i) => {
          // a lioness's young one is a real cub; the others are small copies
          const cub = sz < 1 && kind === 'lioness' && window.CubRig, rigName = cub ? 'CubRig' : K.rig, RR = window[rigName];
          const s = cub ? sL * 1.05 * (sz / 0.56) * 0.9 : sL * sz, half = RR.WIDTH * s;
          if (i) x -= dir * (prevHalf + half) * rnd(0.98, 1.3) * (run ? 1.2 : 1);
          prevHalf = half;
          const a = makeAnimal(rigName, x, y0 + (i ? rnd(-8, 8) : 0), s, dir);
          a.kind = kind; a.herd = herd; a.acts = K.acts; a.jumpH = K.jumpH; a.vent = cub ? [30, 34] : K.vent; a.q.run = run;
          if (sz < 1 && Math.random() < (cub ? 0.7 : 0.35)) a.q.ribbon = true;
          else if (sz === 1 && Math.random() < BOWTIE_HERD) a.q.bowtie = true;
          herd.members.push(a);
        });
        HERDS.push(herd);
        return herd;
      }
      function stepHerd(h, t, dt){
        const halted = t < h.haltUntil; let gone = true, onStage = null;
        for (const a of h.members){
          const q = a.q; let dx = 0;
          if (!halted && !(a.act && a.act.type !== 'jump')){ dx = h.dir * h.speed * dt; q.x += dx; }
          advance(a, dx, dt);
          const edge = a.R.WIDTH * q.s * 1.4 + 40;
          if (h.dir > 0 ? q.x < DW + edge : q.x > -edge) gone = false;
          if (q.x > 60 && q.x < DW - 60 && !a.act && (!onStage || Math.random() < 0.4)) onStage = a;
        }
        if (onStage && t > h.nextActAt){ h.nextActAt = t + rnd(5, 14); startAct(onStage, pickAct(onStage), t); }
        return gone;
      }

      // ── the acts: the rig's own signature pose, a jump, a spin after the tail,
      //    a fart (green puffs and a wiggle)
      function pickAct(a){
        const r = Math.random();
        if (r < 0.5 || a.acts.length === 1) return 'pose';
        if (r < 0.62 && a.acts.indexOf('fart') >= 0) return 'fart';
        const rest = a.acts.filter(x => x !== 'pose' && x !== 'fart');
        return rest.length ? pick(rest) : 'pose';
      }
      function startAct(a, type, t){
        if (!a || a.act) return false;
        if (a.acts.indexOf(type) < 0) type = 'pose';
        a.act = { type, t0: t, dur: type === 'pose' ? (a.R.ACT_SECONDS || ACT_DUR.pose) : ACT_DUR[type], lastPuff: 0 };
        if (a.herd && type !== 'jump') a.herd.haltUntil = Math.max(a.herd.haltUntil, t + a.act.dur + 0.25);
        if (a.rigName === 'LionRig' && type === 'pose') roar = { t0: t + a.act.dur * 0.25 };
        return true;
      }
      function puff(x, y, dirX, kind, s, t){
        if (PUFFS.length > 40) PUFFS.shift();
        PUFFS.push({ x, y, vx: dirX * rnd(14, 30), vy: -rnd(10, 20), r: rnd(11, 17) * Math.max(0.7, s), t0: t, life: kind === 'green' ? 2.2 : 1.4, kind });
      }
      function stepAct(a, t){
        const A = a.act, q = a.q, s = q.s;
        a.yOff = 0; a.rot = 0; a.flip = 1; q.pose = 0;
        if (!A) return;
        const p = (t - A.t0) / A.dur;
        if (p >= 1){ a.act = null; return; }
        if (A.type === 'pose') q.pose = clamp01(p);
        else if (A.type === 'jump'){ a.yOff = -Math.sin(p * Math.PI) * a.jumpH * s; a.rot = -Math.sin(p * TAU) * 0.06 * q.dir; }
        else if (A.type === 'fart'){
          a.yOff = -Math.abs(Math.sin(p * Math.PI * 3)) * 3 * s; a.rot = Math.sin(p * 40) * 0.015 * (1 - p) * q.dir;
          if (p < 0.55 && t - A.lastPuff > 0.16){ A.lastPuff = t; puff(q.x - a.vent[0] * s * q.dir, q.y - a.vent[1] * s, -q.dir, 'green', s, t); }
        } else if (A.type === 'spin'){
          a.yOff = -Math.abs(Math.sin(p * Math.PI * 6)) * 4 * s; a.rot = Math.sin(p * 30) * 0.03 * q.dir; a.flip = Math.cos(p * Math.PI * 4) >= 0 ? 1 : -1;
          if (t - A.lastPuff > 0.28){ A.lastPuff = t; puff(q.x + rnd(-30, 30) * s, q.y - 4 * s, rnd(-1, 1), 'dust', s, t); }
        }
      }
      function drawAnimal(g, a, t){
        const q = a.q, R = a.R, s = q.s, reach = R.WIDTH * s * 1.6 + 30;
        if (q.x < -reach || q.x > DW + reach) return;
        q.lit = LIT;
        const lift = clamp01(-a.yOff / (40 * s));
        g.fillStyle = 'rgba(14,10,20,' + ((0.10 + 0.2 * L.daylight) * (1 - lift * 0.5)).toFixed(3) + ')';
        const srx = R.WIDTH * (a.def ? 0.72 : 0.9) * s * (1 - lift * 0.3), sx = a.def ? Math.min(q.x, RX(598) - srx) : q.x;
        g.beginPath(); g.ellipse(sx, (a.def ? seatY(a.def, sx) : q.y) + 2 * s, srx, (a.def ? 4.5 : 6.5) * s, a.tilt, 0, TAU); g.fill();
        if (a.rot || a.tilt || a.yOff || a.flip < 0){
          g.save(); g.translate(q.x, q.y + a.yOff); g.rotate(a.rot + a.tilt); if (a.flip < 0) g.scale(-1, 1); g.translate(-q.x, -q.y);
          R.draw(g, q, t); g.restore();
        } else R.draw(g, q, t);
        perf.animals++;
      }
      function stepCast(t, dt){
        if (!rigsReady) return;
        if (t > nextClearAt){ nextClearAt = t + 2; measureClear(); }
        for (const a of PRIDE){ stepAct(a, t); stepPride(a, t, dt); }
        if (PRIDE.length){
          prideHearts(t);
          if (t > prideActAt){ prideActAt = t + rnd(9, 26); const a = pick(PRIDE.filter(m => m.rigName !== 'LionRig')); if (a) startAct(a, pickAct(a), t); }
          if (t > lionActAt){ lionActAt = t + rnd(45, 100); const lion = PRIDE.find(m => m.rigName === 'LionRig'); if (lion) startAct(lion, Math.random() < 0.85 ? 'pose' : 'fart', t); }
        }
        if (autoHerds && t > nextHerdAt){ nextHerdAt = t + rnd(4, 10); if (HERDS.length < maxHerds() && population() < popCap()) spawnHerd(t); }
        for (let i = HERDS.length - 1; i >= 0; i--){
          const h = HERDS[i];
          for (const a of h.members) stepAct(a, t);
          if (stepHerd(h, t, dt)) HERDS.splice(i, 1);
        }
      }
      function drawCast(g, t){
        DRAWN.length = 0; perf.animals = 0;
        for (const a of PRIDE) DRAWN.push(a);
        for (const h of HERDS) for (const a of h.members) DRAWN.push(a);
        DRAWN.sort((a, b) => a.q.y - b.q.y);
        for (const a of DRAWN) drawAnimal(g, a, t);
        // puffs, hearts
        for (let i = PUFFS.length - 1; i >= 0; i--){
          const p = PUFFS[i], age = t - p.t0, k = age / p.life; if (k >= 1 || k < 0){ PUFFS.splice(i, 1); continue; }
          glow(g, p.kind, p.x + p.vx * age, p.y + p.vy * age, p.r * (0.7 + 1.5 * k), (1 - k) * 0.85);
        }
        const kit = window.SavKit;
        for (let i = HEARTS.length - 1; i >= 0; i--){
          const h = HEARTS[i], k = (t - h.t0) / 1.6; if (k >= 1 || k < 0){ HEARTS.splice(i, 1); continue; }
          g.globalAlpha = Math.sin(k * Math.PI);
          if (kit) kit.heart(g, h.x + Math.sin(k * 7) * 4, h.y - k * 44, (9 + 5 * Math.sin(k * Math.PI)) * PRS, '#FF5C8A');
          g.globalAlpha = 1;
        }
      }
      // the window changed shape: the rock moved, so re-seat the pride and let the herds start over
      function recast(){ HERDS.length = 0; PUFFS.length = 0; HEARTS.length = 0; nextClearAt = 0; buildPride(); }
      function hitAnimal(x, y){
        let best = null;
        const test = a => { const q = a.q, s = q.s; if (Math.abs(x - q.x) < a.R.WIDTH * s && y > q.y - a.R.HEIGHT * s - 8 && y < q.y + 8 * s && (!best || q.y > best.q.y)) best = a; };
        PRIDE.forEach(test); for (const h of HERDS) h.members.forEach(test);
        return best;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE LIVE BITS — the water, the fireflies, the frame
      // ══════════════════════════════════════════════════════════════════════
      // the waterhole: slow glints, the sun's (or the moon's) path on the water,
      // a ripple ring now and then and wherever it is tapped
      const RIPPLES = []; let nextRippleAt = 3;
      const inPond = (x, y) => { const dx = (x - POND.x) / (POND.rx + 10), dy = (y - POND.y) / (POND.ry + 10); return dx * dx + dy * dy < 1; };
      function ripple(x, y, t){ if (RIPPLES.length > 5) RIPPLES.shift(); RIPPLES.push({ x, y, t0: t }); }
      function drawPondLife(g, t){
        const P = POND;
        if (t > nextRippleAt){ nextRippleAt = t + rnd(3, 8); const a = rnd(0, TAU), k = Math.sqrt(Math.random()) * 0.7; ripple(P.x + Math.cos(a) * P.rx * k, P.y + Math.sin(a) * P.ry * k, t); }
        glow(g, L.daylight > 0.25 ? 'warm' : 'blue', P.x - P.rx * 0.15, P.y - 2, P.ry * 1.5, 0.2 + 0.25 * L.warm);
        g.fillStyle = '#FFFFFF';
        for (let i = 0; i < 6; i++){
          const yn = (i + 0.5) / 6 * 1.4 - 0.7, span = Math.sqrt(1 - yn * yn) * P.rx * 0.72;
          const x = P.x + Math.sin(t * (0.21 + i * 0.05) + i * 2.3) * span, len = 10 + 8 * Math.sin(t * 0.9 + i);
          g.globalAlpha = (0.16 + 0.14 * Math.sin(t * 1.7 + i * 1.9)) * (0.4 + 0.6 * L.daylight);
          g.beginPath(); g.ellipse(x, P.y + yn * P.ry, len, 1.3, 0, 0, TAU); g.fill();
        }
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.6;
        for (let i = RIPPLES.length - 1; i >= 0; i--){
          const r = RIPPLES[i], k = (t - r.t0) / 1.8; if (k >= 1 || k < 0){ RIPPLES.splice(i, 1); continue; }
          g.globalAlpha = (1 - k) * 0.5;
          g.beginPath(); g.ellipse(r.x, r.y, 6 + 44 * k, (6 + 44 * k) * 0.24, 0, 0, TAU); g.stroke();
        }
        g.globalAlpha = 1;
      }
      // fireflies over the grass at night, gold motes drifting in the low sun
      const FLIES = []; { const r = makeRng(515); for (let i = 0; i < 24; i++) FLIES.push({ u: r(), v: r(), ph: r() * TAU, f: 0.3 + r() * 0.5, b: 1.2 + r() * 2.2 }); }
      function drawAmbient(g, t){
        const night = clamp01(1 - L.daylight * 2.6), dusk = L.warm * clamp01(L.daylight * 1.6) * 0.7;
        if (night > 0.02){
          const n = narrow ? 8 : 14;
          for (let i = 0; i < n; i++){
            const f = FLIES[i], x = f.u * DW + Math.sin(t * f.f + f.ph) * 46, y = 610 + f.v * 250 + Math.cos(t * f.f * 1.3 + f.ph) * 22;
            const blink = Math.pow(Math.max(0, Math.sin(t * f.b + f.ph)), 2);
            glow(g, 'green', x, y, 9 + 5 * blink, night * (0.25 + 0.75 * blink));
          }
        }
        if (dusk > 0.03){
          const n = narrow ? 12 : 24;
          for (let i = 0; i < n; i++){
            const f = FLIES[i], y = 860 - ((f.v * 420 + t * (7 + f.f * 10)) % 420), x = f.u * DW + Math.sin(t * f.f + f.ph) * 30;
            glow(g, 'gold', x, y, 4 + f.f * 4, dusk * (0.35 + 0.4 * Math.sin(t * f.b + f.ph)));
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
        // the roar: the ground bounces a few pixels
        let shake = 0;
        if (roar){ const p = (t - roar.t0) / 1.7; if (p >= 1) roar = null; else if (p > 0) shake = Math.abs(Math.sin(t * 34)) * Math.sin(p * Math.PI) * 4; }

        const g = ctx;
        g.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        g.globalAlpha = 1; g.imageSmoothingEnabled = true;
        g.drawImage(skyL.cv, 0, 0, DW, HZ + 8);
        drawStars(g, t); drawShoot(g, t);
        const sp = sunPos(tod);
        if (sp.up) glow(g, 'gold', sp.x, Math.max(sp.y, HZ - 60), 560, 0.3 * L.warm * L.sunA);
        drawSun(g); drawMoon(g);
        drawClouds(g, dt);
        g.drawImage(farL.cv, 0, FAR_TOP, DW, farL.h);
        drawFlocks(g, t, dt);
        g.drawImage(groundL.cv, 0, GROUND_TOP + shake, DW, groundL.h);
        drawPondLife(g, t);
        if (shake){ g.save(); g.translate(0, shake); drawCast(g, t); g.restore(); } else drawCast(g, t);
        g.drawImage(frontL.cv, 0, FRONT_TOP + shake * 0.5, DW, frontL.h);
        drawTufts(g, t);
        drawAmbient(g, t);
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
        catch (e){ if (!errLogged){ errLogged = true; console.error('savanna2 frame error', e); } }
        if (!warming) perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastGov > 1500){
          lastGov = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21, calm = perf.costEma <= 4.5 && perf.gapEma <= 19;
          if (heavy){ perf.halfRate = true; calmSince = 0; }
          else if (calm && perf.halfRate && !IS_TOUCH){ if (!calmSince) calmSince = ts; else if (ts - calmSince > 6000){ perf.halfRate = false; calmSince = 0; } }
          else calmSince = 0;
        }
      }

      // ── taps: an animal does its trick · the sun, the moon or the water moves
      //    the day on · the baobab lets its birds out · the sky sends a flock
      function onClick(e){
        if (stopped || !e.target || !e.target.closest || e.target.closest(UI_SEL)) return;
        const x = (e.clientX - OX) / S, y = (e.clientY - OY) / S, t = lastT;
        const a = hitAnimal(x, y);
        if (a){ if (!a.act) startAct(a, a.rigName === 'LionRig' ? 'pose' : pickAct(a), t); return; }
        const sp = sunPos(tod), mp = moonPos(tod);
        if ((sp.up && L.sunA > 0.2 && Math.hypot(x - sp.x, y - sp.y) < L.sunR + 30) || (mp.up && L.moon > 0.3 && Math.hypot(x - mp.x, y - mp.y) < 72)){ nextHour(t); return; }
        if (inPond(x, y)){ ripple(x, y, t); nextHour(t); return; }
        const B = BAOBAB;
        if (Math.abs(x - B.x) < 120 * B.s && y > B.y - 270 * B.s && y < B.y){ if (FLOCKS.length < 4) spawnFlock(t, B.x, B.y - 190 * B.s, true); return; }
        if (y < HZ - 70 && (x > RX(640) || y < ridgeY(x) - 40) && FLOCKS.length < 4) spawnFlock(t, undefined, clamp(y, 50, 400));
      }

      // ── hooks for the harness and the tests
      const info = a => ({ rig: a.rigName, kind: a.kind, x: a.q.x, y: a.q.y, s: a.q.s, dir: a.q.dir, go: a.q.go, run: a.q.run, pose: a.q.pose,
                           act: a.act ? a.act.type : null, bowtie: a.q.bowtie, ribbon: a.q.ribbon,
                           cx: OX + a.q.x * S, cy: OY + (a.q.y - a.R.HEIGHT * a.q.s * 0.5) * S });
      const everyone = () => { const all = PRIDE.slice(); for (const h of HERDS) for (const a of h.members) all.push(a); return all; };
      const XY = (x, y) => ({ x: OX + x * S, y: OY + y * S });
      const hook = {
        ready: () => rigsReady,
        tod: () => tod,
        setTod(v){ tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed(v){ todSpeed = v; },
        phase: () => L.name,
        look: () => L,
        time: () => lastT,
        seek(s){ if (t0 !== null) t0 -= (s - lastT) * 1000; lastT = s; },
        pride: () => PRIDE.map(info),
        herds: () => HERDS.map(h => ({ kind: h.kind, dir: h.dir, run: h.run, lane: h.lane, members: h.members.map(info) })),
        herd: () => HERDS.length ? HERDS[HERDS.length - 1].members.map(info) : [],
        spawn(kind, opts){ const h = spawnHerd(lastT, kind, opts); return h ? h.members.length : 0; },
        clearHerds(){ HERDS.length = 0; },
        auto(v){ autoHerds = !!v; },                          // false: no herds on the schedule (the tests bring their own)
        // act('lion' | 'lioness' | 'cub' | a herd kind | an index into pride+herds, type)
        act(who, type){
          const all = everyone(), key = String(who).toLowerCase();
          const a = typeof who === 'number' ? all[who] : all.find(m => m.rigName.toLowerCase() === key + 'rig') || all.find(m => m.kind === key);
          if (!a) return false;
          a.act = null; return startAct(a, type || 'pose', lastT);
        },
        roaring: () => !!roar,
        puffs: () => PUFFS.length, hearts: () => HEARTS.length, flocks: () => FLOCKS.length, ripples: () => RIPPLES.length,
        sunXY: () => { const p = sunPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.sunA > 0.2 }); },
        moonXY: () => { const p = moonPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.moon > 0.3 }); },
        pondXY: () => XY(POND.x, POND.y),
        baobabXY: () => XY(BAOBAB.x, BAOBAB.y - 150 * BAOBAB.s),
        skyXY: () => XY(DW * 0.72, 120),
        layout: () => ({ DW, narrow, RKX, RKY, PRS, HS, S, OX, OY, clearX, pond: Object.assign({}, POND), baobab: Object.assign({}, BAOBAB) }),
        perf: () => ({ dpr: DPR, DW, S, halfRate: perf.halfRate, gapEma: perf.gapEma, costEma: perf.costEma, frames: perf.frames, drawn: perf.drawn,
                       repaints: perf.repaints || 0, animals: perf.animals || 0 }),
        rumiLayer: () => rumiLayer,
      };
      window.BACKGROUNDS.savanna2._test = hook;
      window._sav2 = hook;

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
      loadRigs(() => { if (stopped) return; rigsReady = true; buildPride(); });

      return function cleanup(){
        stopped = true;
        cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (rumiPatrol) rumiPatrol.stop();
        if (window._sav2 === hook) delete window._sav2;
        if (window.BACKGROUNDS.savanna2._test === hook) delete window.BACKGROUNDS.savanna2._test;
        stage.innerHTML = '';
      };
    },
  };
})();
