/* ── Volcano Valley 4 — the 🦕 world, rebuilt from scratch (2026-11) ─────────
   The dinosaurs theme's backdrop. One canvas, a responsive design space (900
   high, 400–2400 wide) and a handful of baked layers, in the manner of
   savanna2 / unicorns4:

     sky strip → stars, shooting stars → sun / moon → clouds → FAR layer (two
     hazy ranges, a table mountain with its thread of a waterfall, the jungle
     line, THE VOLCANO) → the volcano's live fire (lava lake, glowing streams,
     smoke, embers) and the far herd on the ridge → GROUND layer (three jungle
     meadows, the lake, palms, tree ferns, cycads, rocks, a fallen log) → the
     lake's life (glints, ripples, the long-necked SWIMMER) → THE CAST → front
     bank + swaying fronds → dragonflies, fireflies, pollen, the shows'
     particles → vignette.

   The game card hugs the LEFT in this theme (game/skins/dinosaurs.skin.css),
   so the volcano stands on the RIGHT: crater at ~77 % of the width, its left
   foot at ~56 %.

   A whole day is DAY_SEC = 240 s through eight keys (dawn, morning, noon,
   golden, sunset, dusk, night ×2): the sun comes up on the right, passes over
   the crater and sinks behind the volcano's shoulder; at night the lava lights
   the cone, the moon and the stars come out, fireflies drift over the grass.

   THE CAST are canvas rigs (dinosaur_rigs/, on the savanna kit): families of
   T-REX, RAPTORS, BRONTOSAURUS, PARASAUROLOPHUS, STEGOSAURUS and TRICERATOPS
   cross the valley in depth lanes at a walk or a run, with their young; a
   PTERANODON flies over and may drop an EGG, which bounces, rests, cracks and
   hatches a BABY that toddles away; a friendly long-necked swimmer surfaces
   in the lake.

   THE VOLCANO has two shows and taps alternate between them: an ERUPTION (a
   3-2-1 countdown, a lava fountain, lava bombs, an ash cloud, the ground
   shaking) and a METEOR SHOWER (fiery streaks, flashes beyond the ranges) —
   either way every dinosaur bolts for the nearest edge and nobody wanders
   back in until the sky is quiet.

   Taps: a dinosaur → its trick AND a new coat (the T-rex always roars, and
   the ground shakes) · the volcano → the next show · the pteranodon → a
   squawk, and the egg drops · an egg → it hatches · the lake → the swimmer
   comes up (again: she squirts) · a palm → a coconut falls · the sun / the
   moon → the next hour · the open sky → a flock of far flyers (a shooting
   star at night).

   The old valley (dinosaurs3.bg.js + dino_rigs/) stays in the folder, unloaded.

   Docs: backgrounds/README.md. Registers window.BACKGROUNDS.dinosaurs4 (skin
   'dinosaurs', aids 'dinosaurs'); init({stage}) returns a cleanup.
   Hooks: window._dino4 = BACKGROUNDS.dinosaurs4._test.  */
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
  const RIG_FILES = [['SavKit', 'savanna_rigs/kit.js'], ['TrexRig', 'dinosaur_rigs/trex.js'], ['RaptorRig', 'dinosaur_rigs/raptor.js'],
                     ['BrontoRig', 'dinosaur_rigs/bronto.js'], ['ParaRig', 'dinosaur_rigs/para.js'], ['StegoRig', 'dinosaur_rigs/stego.js'],
                     ['TrikeRig', 'dinosaur_rigs/trike.js'], ['PteroRig', 'dinosaur_rigs/ptero.js'], ['EggRig', 'dinosaur_rigs/hatch.js']];
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-dinorig="' + globalName + '"]') ||
               (globalName === 'SavKit' && doc.querySelector('script[data-savrig="SavKit"], script[data-unirig="SavKit"]'));
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = BASE + file; s.setAttribute('data-dinorig', globalName);
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
  // near range + their snow · the jungle line · meadow far / mid / near + its
  // shade · volcano lit / dark · water light / deep · cloud top / underside ·
  // smoke · tint = the light on painted things (trees, rocks, fronds) · lit =
  // the light the cast stands in · daylight, warm, stars, moon, sunA, lava (how
  // strongly the fire lights the cone), mist
  const KEYS = [
    { at: 0.00, name: 'dawn',    top: '#5A6CBC', mid: '#F0A49C', hz: '#FFE2B6', glow: '#FFC29A', sun: '#FFE2B0', sunR: 64,
      mtnF: '#A6A8D0', mtnN: '#7E94B6', snow: '#FFEFE6', jung: '#5E9E92', gF: '#A6DA9A', gM: '#84CA88', gN: '#60B478', gD: '#3E9268',
      vol: '#9A7CA6', volD: '#5E4A7C', water: '#C2E6EE', waterD: '#6CA8CC', cloud: '#FFEDE4', cloudS: '#F2A6A4', smoke: '#C8A6B8',
      tint: '#FFE8E0', lit: '#FFE6DE', daylight: 0.78, warm: 0.5, stars: 0.05, moon: 0, sunA: 1, lava: 0.55, mist: 0.6 },
    { at: 0.10, name: 'morning', top: '#4AA2E6', mid: '#A2DAF2', hz: '#EAF6DC', glow: '#FFF4CC', sun: '#FFF6D0', sunR: 50,
      mtnF: '#9EC2DA', mtnN: '#76AEC0', snow: '#FFFFFF', jung: '#52B088', gF: '#B6EA9C', gM: '#8EDC86', gN: '#64C672', gD: '#40A264',
      vol: '#9488B4', volD: '#5C5088', water: '#B6E8F6', waterD: '#5CB0E0', cloud: '#FFFFFF', cloudS: '#DCE8F4', smoke: '#D2D0DC',
      tint: '#FFFFFF', lit: '#FFFFFF', daylight: 1, warm: 0.1, stars: 0, moon: 0, sunA: 1, lava: 0.35, mist: 0.3 },
    { at: 0.30, name: 'noon',    top: '#3A96E6', mid: '#8CCEF6', hz: '#E0F6EA', glow: '#FFFFFF', sun: '#FFFCE8', sunR: 44,
      mtnF: '#A2C8E0', mtnN: '#7AB4C6', snow: '#FFFFFF', jung: '#54B88A', gF: '#BCEE9E', gM: '#92E088', gN: '#68CA74', gD: '#42A866',
      vol: '#988CB8', volD: '#60548C', water: '#B2EAFA', waterD: '#54B2E6', cloud: '#FFFFFF', cloudS: '#DCEAF6', smoke: '#D6D6E0',
      tint: '#FFFFFF', lit: '#FFFFFF', daylight: 1, warm: 0, stars: 0, moon: 0, sunA: 1, lava: 0.3, mist: 0 },
    { at: 0.50, name: 'golden',  top: '#6890D6', mid: '#F6C69A', hz: '#FFE4A2', glow: '#FFD890', sun: '#FFECB0', sunR: 62,
      mtnF: '#C8AAB8', mtnN: '#A68CA4', snow: '#FFF0DC', jung: '#7AA676', gF: '#CCDE8E', gM: '#A8CE7E', gN: '#84BA6E', gD: '#5E9C62',
      vol: '#A07A9C', volD: '#684A78', water: '#FFE0B4', waterD: '#E69C8C', cloud: '#FFF2DC', cloudS: '#F4B49C', smoke: '#D8B4AC',
      tint: '#FFEED4', lit: '#FFF0D8', daylight: 0.9, warm: 0.6, stars: 0, moon: 0, sunA: 1, lava: 0.5, mist: 0 },
    { at: 0.64, name: 'sunset',  top: '#3C1440', mid: '#C8442E', hz: '#FFB252', glow: '#FF8A44', sun: '#FFD88C', sunR: 92,
      mtnF: '#B86450', mtnN: '#7C3C54', snow: '#FFD2B8', jung: '#5E4854', gF: '#A0A262', gM: '#808E56', gN: '#60784A', gD: '#466042',
      vol: '#7C4874', volD: '#482854', water: '#FFB07C', waterD: '#C8584C', cloud: '#FFC8A8', cloudS: '#E0705C', smoke: '#A86C74',
      tint: '#FFC4A8', lit: '#FFCEB2', daylight: 0.62, warm: 1, stars: 0.08, moon: 0.1, sunA: 1, lava: 0.8, mist: 0 },
    { at: 0.74, name: 'dusk',    top: '#1C1848', mid: '#663C7C', hz: '#DE7A6C', glow: '#DC7458', sun: '#FFB080', sunR: 84,
      mtnF: '#6A4C80', mtnN: '#4A3868', snow: '#D8BCD8', jung: '#384660', gF: '#5E8272', gM: '#4A6E66', gN: '#3A5C5A', gD: '#2C4A52',
      vol: '#52447C', volD: '#30285A', water: '#A88CC4', waterD: '#5A4C94', cloud: '#B890C0', cloudS: '#7C5C9C', smoke: '#7C6490',
      tint: '#B4A0D8', lit: '#C0AEE0', daylight: 0.36, warm: 0.5, stars: 0.5, moon: 0.7, sunA: 0.4, lava: 0.95, mist: 0.2 },
    { at: 0.84, name: 'night',   top: '#060A26', mid: '#101E4E', hz: '#2C4676', glow: '#3A5088', sun: '#FFB080', sunR: 70,
      mtnF: '#283A6E', mtnN: '#1E2E5A', snow: '#A8B8E6', jung: '#1C3652', gF: '#2E5C62', gM: '#254E58', gN: '#1D404E', gD: '#163242',
      vol: '#383468', volD: '#201E48', water: '#5E7CC8', waterD: '#28408A', cloud: '#4C5898', cloudS: '#2E3874', smoke: '#56548C',
      tint: '#7C8CD2', lit: '#8896DC', daylight: 0.12, warm: 0, stars: 1, moon: 1, sunA: 0, lava: 1, mist: 0.35 },
    { at: 0.95, name: 'night',   top: '#060A26', mid: '#101E4E', hz: '#2C4676', glow: '#3A5088', sun: '#FFB080', sunR: 70,
      mtnF: '#283A6E', mtnN: '#1E2E5A', snow: '#A8B8E6', jung: '#1C3652', gF: '#2E5C62', gM: '#254E58', gN: '#1D404E', gD: '#163242',
      vol: '#383468', volD: '#201E48', water: '#5E7CC8', waterD: '#28408A', cloud: '#4C5898', cloudS: '#2E3874', smoke: '#56548C',
      tint: '#7C8CD2', lit: '#8896DC', daylight: 0.12, warm: 0, stars: 1, moon: 1, sunA: 0, lava: 1, mist: 0.35 },
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
  // THE CAST — who crosses the valley, and how
  // ══════════════════════════════════════════════════════════════════════════
  // h = how tall it stands on screen (design px, in the middle lane) · speed /
  // runSpeed in design px per second · runP = chance a whole family comes
  // through at a run · herd = how many adults · young = chance of a little one ·
  // acts beyond the rig's own signature pose · jumpH = the hop's height
  const KINDS = {
    trex:   { rig: 'TrexRig',   h: 206, speed: 56, runSpeed: 190, runP: 0.25, herd: [1, 2], young: 0.5,  acts: ['pose', 'jump', 'fart'], jumpH: 30 },
    raptor: { rig: 'RaptorRig', h: 104, speed: 78, runSpeed: 300, runP: 0.6,  herd: [2, 4], young: 0.3,  acts: ['pose', 'jump', 'fart'], jumpH: 40 },
    bronto: { rig: 'BrontoRig', h: 300, speed: 30, runSpeed: 74,  runP: 0.05, herd: [1, 2], young: 0.7,  acts: ['pose', 'fart'],         jumpH: 0 },
    para:   { rig: 'ParaRig',   h: 190, speed: 46, runSpeed: 170, runP: 0.25, herd: [1, 3], young: 0.5,  acts: ['pose', 'jump', 'fart'], jumpH: 26 },
    stego:  { rig: 'StegoRig',  h: 164, speed: 34, runSpeed: 96,  runP: 0.1,  herd: [1, 2], young: 0.6,  acts: ['pose', 'fart'],         jumpH: 0 },
    trike:  { rig: 'TrikeRig',  h: 146, speed: 40, runSpeed: 130, runP: 0.2,  herd: [1, 3], young: 0.6,  acts: ['pose', 'jump', 'fart'], jumpH: 20 },
  };
  const ACT_DUR = { pose: 2.2, jump: 0.8, fart: 1.5 };
  const TINTS = [0.92, 0.96, 1, 1.04, 1.08];             // quantised — the rigs cache a palette per coat × tint × light
  const noop = function(){};

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.dinosaurs4 = {
    skin: 'dinosaurs',
    aids: 'dinosaurs',
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
      // hand (a smaller volcano, fewer trees, a smaller cast).
      const DW0 = 1600, DH = 900, HZ = 600;
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
      const SPR_COL = { white: '255,255,255', warm: '255,236,190', gold: '255,190,110', fire: '255,120,40', red: '255,70,40', blue: '176,196,255',
                        green: '200,255,150', dust: '210,190,170' };
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
      // the hour's light on a painted colour (trunks, rocks, flowers)
      const T = c => rgb(mulc(hexc(c), L.tint));
      const TA = (c, a) => rgb(mulc(hexc(c), L.tint), a);
      let skyL = null, farL = null, groundL = null, frontL = null, vigL = null;
      const FAR_TOP = 150, GROUND_TOP = 380, FRONT_TOP = 826;   // design y of each layer's top row

      // ══════════════════════════════════════════════════════════════════════
      // THE LAYOUT — where the volcano, the lake and the trees stand
      // ══════════════════════════════════════════════════════════════════════
      const VOL = { x: 0, base: 606, rim: 260, bw: 340, rw: 64, s: 1 };     // crater centre · foot · rim · half widths
      const LAKE = { x: 0, y: 704, rx: 170, ry: 27 };
      const TEPUI = { x: 0, w: 260, top: 388 };
      let HS = 1;                                               // the cast's scale
      let TREES = [], ROCKS = [], FERNS = [], FRONDS = [], LOG = null;
      const laneY = k => 752 + k * 84;
      function layout(){
        layoutDW = DW; narrow = DW < 1000;
        const r = makeRng(6565);
        HS = clamp(DW / 1000, 0.6, 1);
        if (narrow){
          VOL.s = clamp(DW / 860, 0.5, 0.82); VOL.x = DW * 0.66;
          LAKE.x = DW * 0.36; LAKE.rx = DW * 0.25; LAKE.ry = 22; LAKE.y = 716;
          TEPUI.x = DW * 0.2; TEPUI.w = 150; TEPUI.top = 452;
          TREES = [{ k: 'palm', x: DW * 0.93, y: 690, s: 0.78, f: -1 }, { k: 'fern', x: DW * 0.1, y: 652, s: 0.5, f: 1 }, { k: 'palm', x: DW * 0.56, y: 634, s: 0.46, f: 1 },
                   { k: 'cycad', x: DW * 0.78, y: 664, s: 0.6, f: 1 }];
          LOG = { x: DW * 0.7, y: 742, s: 0.6 };
        } else {
          VOL.s = 0.74 + 0.26 * AXK; VOL.x = AX(1237);
          LAKE.x = AX(900); LAKE.rx = 140 + 34 * AXK; LAKE.ry = 27; LAKE.y = 704;
          TEPUI.x = AX(640); TEPUI.w = 250; TEPUI.top = 392;
          TREES = [{ k: 'palm', x: AX(1528), y: 694, s: 1.0, f: -1 }, { k: 'palm', x: AX(1050), y: 644, s: 0.6, f: 1 }, { k: 'fern', x: AX(1150), y: 630, s: 0.5, f: -1 },
                   { k: 'cycad', x: AX(1360), y: 668, s: 0.8, f: 1 }, { k: 'palm', x: AX(1440), y: 626, s: 0.46, f: 1 }, { k: 'fern', x: AX(740), y: 626, s: 0.5, f: 1 },
                   { k: 'palm', x: AX(110), y: 692, s: 0.96, f: 1 }, { k: 'fern', x: AX(300), y: 640, s: 0.62, f: -1 }, { k: 'palm', x: AX(480), y: 630, s: 0.5, f: -1 },
                   { k: 'cycad', x: AX(600), y: 662, s: 0.7, f: -1 }];
          LOG = { x: AX(1200), y: 738, s: 0.9 };
        }
        VOL.rim = VOL.base - 346 * VOL.s; VOL.bw = 340 * VOL.s; VOL.rw = 64 * VOL.s;
        TREES.sort((p, q) => p.y - q.y);
        // rocks and fern clumps on the meadows; big fronds along the front edge (they sway, live)
        const free = (x, y) => !(Math.abs(x - LAKE.x) < LAKE.rx * 1.25 && Math.abs(y - LAKE.y) < 54);
        ROCKS = []; FERNS = [];
        const nr = narrow ? 3 : 6, nf = narrow ? 5 : 11;
        for (let i = 0; i < nr; i++){ const x = DW * (i + 0.2 + r() * 0.6) / nr, y = 640 + r() * 100; if (free(x, y)) ROCKS.push({ x, y, s: (0.5 + r() * 0.6) * (0.6 + (y - 640) / 200), seed: 1 + Math.floor(r() * 1e6) }); }
        for (let i = 0; i < nf; i++){ const x = DW * (i + 0.1 + r() * 0.8) / nf, y = 626 + r() * 116; if (free(x, y)) FERNS.push({ x, y, s: (0.45 + r() * 0.5) * (0.6 + (y - 626) / 220), v: Math.floor(r() * 3), f: r() < 0.5 ? -1 : 1 }); }
        ROCKS.sort((p, q) => p.y - q.y); FERNS.sort((p, q) => p.y - q.y);
        FRONDS = [];
        const nt = Math.round(clamp(DW / 64, 7, 26));
        for (let i = 0; i < nt; i++) FRONDS.push({ x: DW * (i + r()) / nt, y: 886 + r() * 30, s: (0.4 + r() * 0.38) * clamp(DW / 900, 0.62, 1), v: Math.floor(r() * 4), ph: r() * TAU, f: r() < 0.5 ? -1 : 1 });
        FRONDS.sort((p, q) => p.y - q.y);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SKY — sun, moon, stars, clouds, far flyers
      // ══════════════════════════════════════════════════════════════════════
      // the sun comes up on the right edge, passes over the crater and sinks
      // behind the volcano's left shoulder (in the clear half beside the game
      // card). The moon rides the right-hand sky all night.
      function sunPos(v){
        const k = clamp01(v / 0.76);
        return { x: lerp(DW * 0.97, VOL.x - VOL.bw * 0.86, k), y: 548 - Math.pow(Math.sin(Math.PI * k), 0.75) * 440, up: v < 0.80 };
      }
      function moonPos(v){
        const k = clamp01(((v - 0.70 + 1) % 1) / 0.32);
        return { x: lerp(DW * 0.58, DW * 0.93, k), y: 220 - Math.sin(Math.PI * k) * 120, up: v > 0.69 || v < 0.03 };
      }
      const STARS = []; { const r = makeRng(77); for (let i = 0; i < 150; i++) STARS.push({ x: r(), y: r() * r() * 0.95 + 0.01, s: 0.7 + r() * 1.6, ph: r() * TAU, f: 0.5 + r() * 2, c: r() < 0.2 ? '#FFE2C0' : r() < 0.4 ? '#CFE0FF' : '#FFFFFF' }); }
      function drawStars(g, t){
        const a = L.stars; if (a <= 0.01) return;
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph);
          g.fillStyle = s.c; g.globalAlpha = a * tw * (1 - s.y * 0.5);
          g.fillRect(s.x * DW, s.y * (HZ - 90), s.s, s.s);
        }
        g.globalAlpha = 1;
      }
      let shoot = null, nextShootAt = 18;
      function startShoot(t, x, y){ shoot = { t0: t, x: x === undefined ? rnd(0.15, 0.85) * DW : x, y: y === undefined ? rnd(30, 200) : y, vx: Math.random() < 0.5 ? -560 : 560, vy: rnd(120, 230) }; }
      function drawShoot(g, t){
        if (!shoot && L.stars > 0.6 && t > nextShootAt && !show){ startShoot(t); nextShootAt = t + rnd(14, 36); }
        if (!shoot) return;
        const p = (t - shoot.t0) / 1.0; if (p >= 1){ shoot = null; return; }
        const x = shoot.x + shoot.vx * p, y = shoot.y + shoot.vy * p, k = Math.sin(p * Math.PI);
        g.strokeStyle = lg(g, x, y, x - shoot.vx * 0.2, y - shoot.vy * 0.2, [[0, 'rgba(255,255,255,' + (0.95 * k) + ')'], [1, 'rgba(255,220,180,0)']]);
        g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - shoot.vx * 0.2, y - shoot.vy * 0.2); g.stroke();
        glow(g, 'white', x, y, 10 * k + 2, k);
      }
      function drawSun(g){
        const p = sunPos(tod); if (!p.up || L.sunA <= 0.01) return;
        const R = L.sunR, a = L.sunA;
        glow(g, 'fire', p.x, p.y, R * 4.6, 0.5 * a * L.warm);
        glow(g, 'warm', p.x, p.y, R * 3.3, 0.65 * a * (1 - L.warm * 0.4));
        g.globalAlpha = a;
        g.fillStyle = rg(g, p.x, p.y - R * 0.2, R * 0.1, R, [[0, rgb(mixc(L.sun, [255, 255, 255], 0.6))], [0.75, rgb(L.sun)], [1, rgb(mixc(L.sun, L.glow, 0.5))]]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      const CRATERS = [[-0.3, -0.25, 0.22], [0.28, 0.1, 0.17], [-0.1, 0.38, 0.13], [0.34, -0.4, 0.1], [-0.5, 0.2, 0.09]];
      function drawMoon(g){
        const p = moonPos(tod); if (!p.up || L.moon <= 0.01) return;
        const R = 46, a = L.moon;
        glow(g, 'blue', p.x, p.y, R * 4.6, 0.4 * a);
        g.globalAlpha = a;
        g.fillStyle = rg(g, p.x - R * 0.3, p.y - R * 0.3, R * 0.1, R * 1.2, [[0, '#FFFDF2'], [0.7, '#EDEAF6'], [1, '#C8C8E6']]);
        g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
        g.fillStyle = 'rgba(150,158,204,.34)';
        for (const c of CRATERS){ g.beginPath(); g.arc(p.x + c[0] * R, p.y + c[1] * R, c[2] * R, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }

      // ── clouds: three puffy heaps baked white once, recoloured per look
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
        for (let i = 0; i < 6; i++) CLOUDS.push({ u: (i + r() * 0.7) / 6, y: 44 + r() * 190, s: 0.42 + r() * 0.52, v: i % 3, sp: 4 + r() * 7 }); }
      function drawClouds(g, dt){
        const cs = clamp(DW / 1100, 0.5, 1), span = DW + 520 * cs, n = narrow ? 4 : CLOUDS.length;
        for (let i = 0; i < n; i++){
          const c = CLOUDS[i];
          c.u = (c.u + c.sp * dt / span) % 1;
          const w = 380 * c.s * cs, h = 170 * c.s * cs;
          g.drawImage(CLOUD_T[c.v].cv, c.u * span - 420 * cs, c.y - h / 2, w, h);
        }
      }

      // ── far flyers: little flocks of pterosaurs crossing the far sky by day —
      //    each a body and two wings that beat
      const FLOCKS = []; let nextFlockAt = 10;
      function spawnFlock(t, x0, y0){
        const dir = Math.random() < 0.5 ? 1 : -1, n = 3 + Math.floor(Math.random() * 3), birds = [];
        for (let i = 0; i < n; i++) birds.push({ dx: -i * 24 - Math.random() * 10, dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 13 + Math.random() * 5, ph: Math.random() * TAU });
        FLOCKS.push({ x: x0 !== undefined ? x0 : (dir > 0 ? -60 : DW + 60), y: y0 !== undefined ? y0 : rnd(80, 330), dir, v: rnd(40, 64), s: rnd(0.8, 1.2), birds });
      }
      function drawFlocks(g, t, dt){
        if (L.daylight > 0.3 && t > nextFlockAt && FLOCKS.length < 2 && !show){ nextFlockAt = t + rnd(18, 44); spawnFlock(t); }
        if (!FLOCKS.length) return;
        g.fillStyle = rgb(mixc(L.mtnN, L.top, 0.55), 0.85 * clamp01(L.daylight * 1.6));
        for (let i = FLOCKS.length - 1; i >= 0; i--){
          const f = FLOCKS[i];
          f.x += f.dir * f.v * dt;
          if (f.x < -260 || f.x > DW + 260){ FLOCKS.splice(i, 1); continue; }
          for (const b of f.birds){
            const x = f.x + b.dx * f.dir * f.s, y = f.y + b.dy * f.s + Math.sin(t * 1.2 + b.ph) * 3, w = Math.sin(t * 6 + b.ph), s = f.s * f.dir;
            g.beginPath();                                   // a crest, a beak, two pointed wings
            g.moveTo(x + 9 * s, y); g.lineTo(x + 2 * s, y - 1.6 * f.s); g.lineTo(x - 2 * s, y - 9 * f.s * w - 2); g.lineTo(x - 1 * s, y - 1.5 * f.s);
            g.lineTo(x - 8 * s, y - 2.6 * f.s); g.lineTo(x - 3 * s, y + 1 * f.s); g.lineTo(x - 5 * s, y + 8 * f.s * w + 3); g.lineTo(x + 2 * s, y + 1.6 * f.s);
            g.closePath(); g.fill();
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SCENERY — baked per look
      // ══════════════════════════════════════════════════════════════════════
      function paintSky(){
        const g = skyL.cx;
        g.fillStyle = lg(g, 0, 0, 0, 256, [[0, rgb(L.top)], [0.5, rgb(L.mid)], [0.88, rgb(L.hz)], [1, rgb(mixc(L.hz, [255, 255, 255], 0.2))]]);
        g.fillRect(0, 0, 4, 256);
      }
      // the ranges: ridged noise makes rugged peaks; a little snow on the highest
      const ridge = (x, f, o) => 1 - Math.abs(2 * noise1(x * f + o) - 1);
      const mtnFY = x => 500 - 150 * ridge(x, 0.0048, 7.1) - 34 * noise1(x * 0.019 + 2);
      const mtnNY = x => 556 - 112 * ridge(x, 0.0062, 21.4) - 26 * noise1(x * 0.027 + 8);
      function paintRange(g, fy, col, snowY, base){
        g.beginPath(); g.moveTo(-10, base);
        for (let x = -10; x <= DW + 10; x += 8) g.lineTo(x, fy(x));
        g.lineTo(DW + 10, base); g.closePath();
        g.fillStyle = lg(g, 0, 330, 0, base, [[0, rgb(mixc(col, [255, 255, 255], 0.12))], [0.5, rgb(col)], [1, rgb(mixc(col, L.hz, 0.6))]]);
        g.fill();
        g.save(); g.clip();
        g.fillStyle = rgb(mixc(col, L.top, 0.45), 0.22);       // the shaded flank of every peak
        for (let x = -10; x <= DW + 10; x += 8){
          const y = fy(x), yl = fy(x - 8), yr = fy(x + 8);
          if (y <= yl && y < yr){ g.beginPath(); g.moveTo(x, y); g.lineTo(x - 24, y + 56); g.lineTo(x - 66, base); g.lineTo(x + 8, base); g.lineTo(x - 6, y + 66); g.closePath(); g.fill(); }
        }
        g.fillStyle = lg(g, 0, snowY - 100, 0, snowY + 40, [[0, rgb(L.snow)], [1, rgb(mixc(L.snow, col, 0.3))]]);
        g.beginPath(); g.moveTo(-10, 0);
        for (let x = -10; x <= DW + 10; x += 11){ const y = fy(x), d = clamp(snowY - y, 0, 60) * 0.75; g.lineTo(x, y + d + (d > 6 ? (((x / 11) | 0) % 2 ? 8 : -4) : -2)); }
        g.lineTo(DW + 10, 0); g.closePath(); g.fill();
        g.restore();
      }
      // the table mountain: sheer sides, a flat green top, a thread of water down its face
      function paintTepui(g){
        const x = TEPUI.x, w = TEPUI.w, top = TEPUI.top, base = HZ + 20, col = mixc(L.mtnN, L.vol, 0.35);
        g.beginPath(); g.moveTo(x - w * 0.72, base); g.bezierCurveTo(x - w * 0.6, base - 60, x - w * 0.56, top + 60, x - w * 0.5, top + 6);
        g.quadraticCurveTo(x - w * 0.2, top - 6, x, top); g.quadraticCurveTo(x + w * 0.3, top + 4, x + w * 0.5, top + 4);
        g.bezierCurveTo(x + w * 0.56, top + 70, x + w * 0.62, base - 50, x + w * 0.78, base); g.closePath();
        g.fillStyle = lg(g, x - w * 0.6, 0, x + w * 0.6, 0, [[0, rgb(mixc(col, [255, 255, 255], 0.2))], [0.5, rgb(col)], [1, rgb(mixc(col, L.top, 0.35))]]); g.fill();
        g.save(); g.clip();
        g.strokeStyle = rgb(mixc(col, L.top, 0.5), 0.3); g.lineWidth = 3;
        for (let i = 0; i < 5; i++){ const y = top + 30 + i * 34; g.beginPath(); g.moveTo(x - w, y + i * 3); g.quadraticCurveTo(x, y - 8, x + w, y + 6); g.stroke(); }
        g.fillStyle = lg(g, 0, base - 90, 0, base, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.6)]]); g.fillRect(x - w, base - 90, w * 2, 90);
        g.restore();
        g.fillStyle = rgb(mixc(L.jung, L.gF, 0.4));               // the green cap, a few tufts hanging over
        g.beginPath(); g.moveTo(x - w * 0.52, top + 10); g.quadraticCurveTo(x - w * 0.2, top - 14, x, top - 8); g.quadraticCurveTo(x + w * 0.3, top - 6, x + w * 0.52, top + 8);
        for (let i = 0; i < 9; i++){ const xx = x + w * 0.52 - (i + 1) * w * 1.04 / 9; g.quadraticCurveTo(xx + w * 0.06, top + 22 + (i % 3) * 5, xx, top + 9); }
        g.closePath(); g.fill();
      }
      // the jungle line along the horizon: two rows of round canopy, palms standing out of it
      function paintJungle(g){
        const r = makeRng(141);
        for (let row = 0; row < 2; row++){
          const col = row ? L.jung : mixc(L.jung, L.hz, 0.42), y0 = row ? 600 : 584, n = Math.round(DW / (row ? 26 : 22));
          g.fillStyle = lg(g, 0, y0 - 44, 0, y0 + 30, [[0, rgb(mixc(col, [255, 255, 255], 0.14))], [1, rgb(col)]]);
          g.beginPath(); g.moveTo(-10, y0 + 40);
          for (let i = 0; i <= n; i++){ const x = i * DW / n, rad = 13 + r() * 16; g.lineTo(x - rad, y0); g.arc(x, y0 - r() * 9, rad, Math.PI, 0); }
          g.lineTo(DW + 10, y0 + 40); g.closePath(); g.fill();
          g.strokeStyle = rgb(col); g.lineCap = 'round';
          for (let i = 0, np = Math.round(DW / 150); i < np; i++){   // far palms: a thin trunk, a star of fronds
            const x = (i + r()) * DW / np, h = 36 + r() * 30, top = y0 - h - 8, lean = (r() - 0.5) * 12;
            g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + lean * 0.4, y0 - h * 0.5, x + lean, top); g.stroke();
            g.lineWidth = 3;
            for (let k = 0; k < 6; k++){ const a = -Math.PI * (0.08 + k * 0.168); g.beginPath(); g.moveTo(x + lean, top); g.quadraticCurveTo(x + lean + Math.cos(a) * 12, top + Math.sin(a) * 12 - 4, x + lean + Math.cos(a) * 20, top + Math.sin(a) * 9 + 5); g.stroke(); }
          }
        }
      }

      // ── THE VOLCANO: a concave cone with a wide crater, gullies down its
      //    face, dark lava channels (their fire is drawn live), jungle creeping
      //    up its foot
      const LAVA_CH = [[[-30, 6], [-50, 74], [-40, 150], [-80, 236], [-70, 300]], [[8, 8], [22, 84], [58, 154], [54, 240], [92, 312]], [[42, 4], [78, 62], [118, 132], [150, 168]]];
      const vP = (x, y) => [VOL.x + x * VOL.s, VOL.rim + y * VOL.s];
      function lavaPt(c, k){                                   // a point along a channel (k 0..1), in design space
        const P = LAVA_CH[c], f = k * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), u = f - i;
        return vP(lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u));
      }
      function conePath(g){
        const x = VOL.x, b = VOL.base, rim = VOL.rim, bw = VOL.bw, rw = VOL.rw;
        g.beginPath(); g.moveTo(x - bw - 40, b + 14);
        g.bezierCurveTo(x - bw * 0.62, b - (b - rim) * 0.2, x - rw * 2.3, rim + (b - rim) * 0.34, x - rw, rim);
        g.quadraticCurveTo(x, rim + rw * 0.2, x + rw, rim);
        g.bezierCurveTo(x + rw * 2.3, rim + (b - rim) * 0.34, x + bw * 0.6, b - (b - rim) * 0.2, x + bw * 0.96 + 40, b + 14);
        g.closePath();
      }
      function paintVolcano(g){
        const x = VOL.x, b = VOL.base, rim = VOL.rim, bw = VOL.bw, rw = VOL.rw, s = VOL.s, r = makeRng(313);
        conePath(g);
        g.fillStyle = lg(g, x - bw, 0, x + bw, 0, [[0, rgb(mixc(L.vol, [255, 255, 255], 0.16))], [0.42, rgb(L.vol)], [0.62, rgb(mixc(L.vol, L.volD, 0.55))], [1, rgb(L.volD)]]);
        g.fill();
        g.save(); g.clip();
        // gullies and ribs fanning down from the rim
        for (let i = 0; i < 11; i++){
          const u = (i + 0.5) / 11 * 2 - 1, x0 = x + u * rw * 0.96, x1 = x + u * bw * (0.86 + r() * 0.2), mx = lerp(x0, x1, 0.4) + u * 16 * s;
          g.strokeStyle = i % 2 ? rgb(L.volD, 0.26 + r() * 0.14) : 'rgba(255,255,255,' + (0.07 + r() * 0.07) + ')';
          g.lineWidth = (6 + r() * 12) * s; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x0, rim + 12 * s); g.quadraticCurveTo(mx, rim + (b - rim) * 0.5, x1, b + 10); g.stroke();
        }
        // ledges of rock
        g.fillStyle = rgb(L.volD, 0.26);
        for (let i = 0; i < 9; i++){ const u = r() * 2 - 1, k = 0.2 + r() * 0.7, xx = x + u * lerp(rw, bw, k) * 0.86, yy = rim + (b - rim) * k; g.beginPath(); g.ellipse(xx, yy, (16 + r() * 22) * s, (5 + r() * 4) * s, 0, 0, TAU); g.fill(); }
        // the dark lava channels (the fire runs in them, live)
        g.strokeStyle = rgb(mixc(L.volD, [60, 10, 20], 0.5), 0.9); g.lineJoin = 'round'; g.lineCap = 'round';
        for (let c = 0; c < LAVA_CH.length; c++){
          g.lineWidth = (c === 2 ? 9 : 12) * s; g.beginPath();
          for (let k = 0; k <= 20; k++){ const p = lavaPt(c, k / 20); if (k === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
          g.stroke();
        }
        // haze and jungle green creeping up the foot
        g.fillStyle = lg(g, 0, b - 130 * s, 0, b + 14, [[0, rgb(L.jung, 0)], [0.7, rgb(mixc(L.jung, L.hz, 0.3), 0.5)], [1, rgb(L.jung, 0.85)]]); g.fillRect(x - bw - 60, b - 130 * s, bw * 2 + 120, 130 * s + 14);
        g.restore();
        // the crater: a lit rim seen a little from above, a dark throat
        g.fillStyle = rgb(mixc(L.vol, [255, 255, 255], 0.22)); g.beginPath(); g.ellipse(x, rim + 1 * s, rw * 1.03, rw * 0.23, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(L.volD, [30, 6, 20], 0.5)); g.beginPath(); g.ellipse(x, rim + 3 * s, rw * 0.86, rw * 0.17, 0, 0, TAU); g.fill();
      }
      // the far herd: a long-neck silhouette baked white once, tinted per look
      const farSrc = makeLayer(96, 60, 1), farT = makeLayer(96, 60, 1);
      { const g = farSrc.cx; g.fillStyle = '#FFFFFF';
        g.beginPath(); g.ellipse(44, 38, 22, 11, 0, 0, TAU); g.fill();
        g.lineCap = 'round'; g.strokeStyle = '#FFFFFF';
        g.lineWidth = 6; g.beginPath(); g.moveTo(60, 34); g.quadraticCurveTo(72, 22, 78, 9); g.stroke();             // the neck
        g.beginPath(); g.ellipse(82, 8, 6.5, 3.6, -0.2, 0, TAU); g.fill();
        g.lineWidth = 5; g.beginPath(); g.moveTo(24, 36); g.quadraticCurveTo(10, 38, 2, 46); g.stroke();             // the tail
        g.lineWidth = 6; for (const lx of [32, 40, 50, 57]){ g.beginPath(); g.moveTo(lx, 42); g.lineTo(lx, 58); g.stroke(); } }

      // ── the trees. Greens follow the hour's meadow colours; trunks take the tint.
      // a frond: a tapered arching spine with a fringe of leaflets
      function frond(g, x, y, len, ang, droop, cTop, cUnder, wd){
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + droop, mx = x + Math.cos(ang) * len * 0.55, my = y + Math.sin(ang) * len * 0.55 - Math.abs(droop) * 0.35;
        g.fillStyle = cUnder;                                 // the body: a crescent between two arcs
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my - wd, ex, ey); g.quadraticCurveTo(mx, my + wd * 1.5, x, y); g.fill();
        g.fillStyle = cTop;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my - wd, ex, ey); g.quadraticCurveTo(mx, my + wd * 0.25, x, y); g.fill();
        g.strokeStyle = cUnder; g.lineWidth = Math.max(1, wd * 0.16); g.lineCap = 'round';
        for (let i = 1; i < 8; i++){                           // leaflet cuts along the underside
          const k = i / 8, qx = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * mx + k * k * ex, qy = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * (my + wd * 0.6) + k * k * ey;
          g.beginPath(); g.moveTo(qx, qy - wd * 0.3); g.lineTo(qx + Math.cos(ang) * wd * 0.5, qy + wd * (1.1 - k * 0.7)); g.stroke();
        }
      }
      const leafTop = () => rgb(mixc(L.gF, [255, 255, 255], 0.08)), leafMid = () => rgb(L.gN), leafDark = () => rgb(mixc(L.gD, [10, 40, 50], 0.25));
      const groundShade = (g, x, y, rx, ry) => { g.fillStyle = rgb(mixc(L.gD, [10, 20, 60], 0.4), 0.24); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
      const palmTop = tr => ({ x: tr.x + 46 * tr.s * tr.f, y: tr.y - 226 * tr.s });      // where the crown sits (and the coconuts hang)
      function paintPalm(g, tr){
        const s = tr.s, f = tr.f;
        g.save(); g.translate(tr.x, tr.y); g.scale(s * f, s);
        groundShade(g, 14, 3, 70, 10);
        g.fillStyle = lg(g, -12, 0, 60, 0, [[0, T('#C89A6C')], [1, T('#8A5E48')]]);      // the trunk leans, thinner toward the top
        g.beginPath(); g.moveTo(-15, 2); g.bezierCurveTo(-8, -70, 14, -150, 38, -226); g.lineTo(54, -224); g.bezierCurveTo(34, -150, 18, -70, 17, 2); g.closePath(); g.fill();
        g.strokeStyle = TA('#6A4234', 0.5); g.lineWidth = 2.4; g.lineCap = 'round';
        for (let i = 1; i < 12; i++){ const k = i / 12, cx = -1 + k * k * 47 + k * 2, cy = -k * 226, w = 15 - k * 7; g.beginPath(); g.moveTo(cx - w, cy + 3); g.quadraticCurveTo(cx, cy - 3, cx + w, cy + 2); g.stroke(); }
        const cx = 46, cy = -226;
        for (const a of [3.5, 3.9, -0.4, 0.05, 2.85]) frond(g, cx, cy, 104, a, 52, leafMid(), leafDark(), 15);          // the back fronds hang lower
        for (const a of [3.3, -0.16, 4.1, -0.96, 3.72, -0.56]) frond(g, cx, cy, 112, a, a > 3.5 && a < 4 || a < -0.4 && a > -0.8 ? 14 : 34, leafTop(), leafMid(), 16);
        g.fillStyle = T('#8A5A3C'); for (const c of [[-9, 8], [7, 10], [-1, 16]]){ g.beginPath(); g.arc(cx + c[0], cy + c[1], 8.5, 0, TAU); g.fill(); }
        g.fillStyle = TA('#D8A878', 0.6); for (const c of [[-9, 8], [7, 10], [-1, 16]]){ g.beginPath(); g.arc(cx + c[0] - 2.4, cy + c[1] - 2.6, 3, 0, TAU); g.fill(); }
        g.restore();
      }
      function paintTreeFern(g, tr){
        const s = tr.s, f = tr.f;
        g.save(); g.translate(tr.x, tr.y); g.scale(s * f, s);
        groundShade(g, 6, 3, 76, 10);
        g.fillStyle = lg(g, -14, 0, 14, 0, [[0, T('#8E6A5A')], [1, T('#5A3E40')]]);
        g.beginPath(); g.moveTo(-14, 2); g.lineTo(-10, -170); g.lineTo(10, -170); g.lineTo(14, 2); g.closePath(); g.fill();
        g.fillStyle = TA('#3E2A30', 0.4); for (let i = 0; i < 20; i++){ g.beginPath(); g.ellipse(-7 + (i % 3) * 7, -8 - i * 8, 3.4, 2.2, 0.5, 0, TAU); g.fill(); }
        for (let i = 0; i < 9; i++){ const a = Math.PI + (i + 0.5) / 9 * Math.PI; frond(g, 0, -170, 104 + (i % 2) * 14, a, 62 - Math.abs(i - 4) * 4, leafMid(), leafDark(), 13); }
        for (let i = 0; i < 7; i++){ const a = Math.PI + (i + 0.5) / 7 * Math.PI; frond(g, 0, -174, 84, a, 22, leafTop(), leafMid(), 12); }
        g.strokeStyle = leafTop(); g.lineWidth = 4; g.lineCap = 'round';                       // two fiddleheads uncurling
        for (const d of [-1, 1]){ g.beginPath(); g.moveTo(d * 3, -172); g.quadraticCurveTo(d * 10, -206, d * 5, -214); g.arc(d * 9, -212, 5, Math.PI * (d > 0 ? 1 : 0), Math.PI * (d > 0 ? 2.6 : -1.6), d < 0); g.stroke(); }
        g.restore();
      }
      function paintCycad(g, tr){
        const s = tr.s, f = tr.f;
        g.save(); g.translate(tr.x, tr.y); g.scale(s * f, s);
        groundShade(g, 4, 3, 66, 9);
        for (let i = 0; i < 9; i++){ const a = Math.PI + (i + 0.5) / 9 * Math.PI; frond(g, 0, -46, 92, a, 40 - Math.abs(i - 4) * 5, leafMid(), leafDark(), 12); }
        g.fillStyle = lg(g, -22, 0, 22, 0, [[0, T('#B88A5C')], [1, T('#7A5440')]]);           // the fat scaly trunk
        g.beginPath(); g.moveTo(-20, 2); g.bezierCurveTo(-28, -30, -18, -56, 0, -58); g.bezierCurveTo(18, -56, 28, -30, 20, 2); g.closePath(); g.fill();
        g.strokeStyle = TA('#5E3C30', 0.45); g.lineWidth = 1.8;
        for (let i = 0; i < 6; i++){ g.beginPath(); g.moveTo(-24, -6 - i * 9); g.lineTo(24, -16 - i * 9); g.moveTo(24, -6 - i * 9); g.lineTo(-24, -16 - i * 9); g.stroke(); }
        for (let i = 0; i < 7; i++){ const a = Math.PI + (i + 0.5) / 7 * Math.PI; frond(g, 0, -54, 78, a, 12, leafTop(), leafMid(), 11); }
        g.fillStyle = lg(g, 0, -92, 0, -52, [[0, T('#FFC06A')], [1, T('#E0783C')]]); g.beginPath(); g.ellipse(0, -70, 10, 20, 0, 0, TAU); g.fill();   // the cone
        g.restore();
      }
      const paintTree = (g, tr) => tr.k === 'palm' ? paintPalm(g, tr) : tr.k === 'fern' ? paintTreeFern(g, tr) : paintCycad(g, tr);
      function paintRock(g, x, y, s, seed){
        const r = makeRng(seed);
        g.save(); g.translate(x, y); g.scale(s, s);
        groundShade(g, 4, 2, 52, 8);
        const lobes = [[-22, -14, 24], [8, -22, 30], [34, -10, 18]];
        for (const l of lobes){ g.fillStyle = lg(g, 0, l[1] - l[2], 0, 4, [[0, T('#C8BCD0')], [1, T('#7E7090')]]); g.beginPath(); g.ellipse(l[0], l[1] + 6, l[2] * 1.15, l[2], 0, Math.PI, TAU); g.lineTo(l[0] + l[2] * 1.15, 2); g.lineTo(l[0] - l[2] * 1.15, 2); g.fill(); }
        g.fillStyle = TA('#FFFFFF', 0.25); g.beginPath(); g.ellipse(2, -34, 16, 6, -0.2, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(L.gM, L.gF, 0.5), 0.9);                                      // moss
        for (let i = 0; i < 4; i++){ g.beginPath(); g.ellipse(-26 + r() * 56, -24 - r() * 14, 9 + r() * 6, 4, 0, 0, TAU); g.fill(); }
        g.restore();
      }
      function paintFern(g, x, y, s, v, f){
        g.save(); g.translate(x, y); g.scale(s * f, s);
        groundShade(g, 0, 2, 44, 6);
        if (v === 1){                                          // horsetails: jointed stalks with whorls
          g.lineCap = 'round';
          for (let i = 0; i < 5; i++){
            const xx = -28 + i * 14, h = 54 + (i * 37 % 30);
            g.strokeStyle = i % 2 ? leafMid() : leafTop(); g.lineWidth = 4.4; g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx + (i - 2) * 2, -h); g.stroke();
            g.lineWidth = 2;
            for (let k = 1; k < 6; k++){ const yy = -h * k / 6.4, xk = xx + (i - 2) * 2 * k / 6.4; g.beginPath(); g.moveTo(xk - 9, yy - 5); g.lineTo(xk, yy); g.lineTo(xk + 9, yy - 5); g.stroke(); }
          }
        } else {
          for (let i = 0; i < 7; i++){ const a = Math.PI + (i + 0.5) / 7 * Math.PI; frond(g, 0, -4, 56 + (i % 2) * 8, a, 22 - Math.abs(i - 3) * 3, i % 2 ? leafTop() : leafMid(), leafDark(), 9); }
          if (v === 2){                                        // a big early bloom or two
            for (const b of [[-16, -42], [14, -52]]){
              for (let k = 0; k < 6; k++){ g.save(); g.translate(b[0], b[1]); g.rotate(k / 6 * TAU); g.fillStyle = T(k % 2 ? '#FFD6E2' : '#FFF4F0'); g.beginPath(); g.ellipse(0, -9, 5.4, 10, 0, 0, TAU); g.fill(); g.restore(); }
              g.fillStyle = T('#FFC84A'); g.beginPath(); g.arc(b[0], b[1], 5, 0, TAU); g.fill();
            }
          }
        }
        g.restore();
      }
      function paintLog(g){
        if (!LOG) return;
        const s = LOG.s;
        g.save(); g.translate(LOG.x, LOG.y); g.scale(s, s);
        groundShade(g, 0, 4, 96, 10);
        g.fillStyle = lg(g, 0, -40, 0, 6, [[0, T('#B8865E')], [1, T('#6E4838')]]); g.beginPath(); g.roundRect(-84, -38, 158, 42, 20); g.fill();
        g.fillStyle = T('#D8AE82'); g.beginPath(); g.ellipse(74, -17, 13, 21, 0, 0, TAU); g.fill();              // the cut end, hollow
        g.fillStyle = T('#5A3A30'); g.beginPath(); g.ellipse(75, -16, 8, 14, 0, 0, TAU); g.fill();
        g.strokeStyle = TA('#5A3A30', 0.4); g.lineWidth = 2; g.lineCap = 'round';
        for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(-70 + i * 28, -30 + (i % 2) * 8); g.lineTo(-52 + i * 28, -28 + (i % 2) * 8); g.stroke(); }
        g.fillStyle = rgb(mixc(L.gM, L.gF, 0.5)); for (const m of [[-56, -38, 22], [-8, -40, 28], [40, -38, 16]]){ g.beginPath(); g.ellipse(m[0], m[1], m[2], 6, 0, Math.PI, TAU); g.fill(); }
        for (const m of [[-34, -44, '#FF9A7A'], [-22, -46, '#FFC06A'], [16, -44, '#FF9A7A']]){              // little mushrooms on top
          g.fillStyle = T('#FFF4E6'); g.fillRect(m[0] - 1.6, m[1], 3.2, 8);
          g.fillStyle = T(m[2]); g.beginPath(); g.ellipse(m[0], m[1], 7, 5, 0, Math.PI, TAU); g.fill();
        }
        g.restore();
      }

      const band1Y = x => 606 - 12 * noise1(x * 0.004 + 2) - 5 * Math.sin(x * 0.006);
      const band2Y = x => 672 - 22 * noise1(x * 0.003 + 7) - 8 * Math.sin(x * 0.004 + 1);
      const band3Y = x => 758 - 26 * noise1(x * 0.0026 + 4) - 8 * Math.sin(x * 0.005 + 2);
      // one meadow band: a rolling crest, a light rim, grass ticks, a few small blooms
      function paintBand(g, fy, c0, c1, bottom, k, seed){
        g.beginPath(); g.moveTo(-10, bottom);
        for (let x = -10; x <= DW + 10; x += 10) g.lineTo(x, fy(x));
        g.lineTo(DW + 10, bottom); g.closePath();
        const top = fy(DW / 2) - 40;
        g.fillStyle = lg(g, 0, top, 0, bottom, [[0, rgb(mixc(c0, [255, 255, 255], 0.18))], [0.22, rgb(c0)], [1, rgb(c1)]]); g.fill();
        g.strokeStyle = rgb(mixc(c0, [255, 255, 255], 0.45), 0.55); g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath(); for (let x = -10; x <= DW + 10; x += 10){ const y = fy(x) + 1.5; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        const r = makeRng(seed), n = Math.round(DW / (narrow ? 6 : 5) * k), depth = bottom - top - 40;
        g.lineCap = 'round';
        for (let i = 0; i < n; i++){
          const x = r() * DW, d = r(), y = fy(x) + 8 + d * depth, sz = (1.3 + d * 1.6) * (0.7 + k * 0.5), q = r();
          if (q < 0.74){ g.strokeStyle = rgb(q < 0.36 ? mixc(c1, [10, 50, 60], 0.25) : mixc(c0, [255, 255, 255], 0.3), 0.5); g.lineWidth = 1.3 * sz * 0.5;
            g.beginPath(); g.moveTo(x - 3 * sz, y); g.lineTo(x - 1.5 * sz, y - 4 * sz); g.moveTo(x, y); g.lineTo(x, y - 5.4 * sz); g.moveTo(x + 3 * sz, y); g.lineTo(x + 1.5 * sz, y - 4 * sz); g.stroke(); }
          else { g.fillStyle = TA(q < 0.84 ? '#FFF6E0' : q < 0.93 ? '#FFC0A8' : '#FFE27A', 0.9); g.beginPath(); g.arc(x, y, sz * 0.9, 0, TAU); g.fill(); }
        }
      }
      function paintLake(g){
        const P = LAKE;
        g.fillStyle = rgb(mixc(L.gD, [20, 30, 70], 0.35), 0.28); g.beginPath(); g.ellipse(P.x, P.y + 5, P.rx + 18, P.ry + 11, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, P.y - P.ry - 8, 0, P.y + P.ry + 8, [[0, T('#E8D6B4')], [1, T('#B89A7C')]]);          // a sandy shore
        g.beginPath(); g.ellipse(P.x, P.y, P.rx + 10, P.ry + 7, 0, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, P.y - P.ry, 0, P.y + P.ry, [[0, rgb(mixc(L.water, L.hz, 0.25))], [0.45, rgb(L.water)], [1, rgb(L.waterD)]]);
        g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(P.x, P.y, P.rx, P.ry, 0, 0, TAU); g.clip();
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(P.x - P.rx * 0.2, P.y - P.ry * 0.62, P.rx * 0.6, P.ry * 0.3, 0, 0, TAU); g.fill();
        g.restore();
        const r = makeRng(88);
        for (let i = 0; i < 10; i++){ const a = r() * TAU, x = P.x + Math.cos(a) * (P.rx + 9), y = P.y + Math.sin(a) * (P.ry + 6); g.fillStyle = T(i % 2 ? '#A898B0' : '#D8CCC0'); g.beginPath(); g.ellipse(x, y, 7 + r() * 6, 4 + r() * 2, 0, 0, TAU); g.fill(); }
        // horsetails on the far shore, lily pads on the water
        g.lineCap = 'round';
        for (let i = 0; i < 7; i++){ const x = P.x - P.rx * (0.82 - i * 0.06), y = P.y - P.ry * 0.42 + i * 1.5, h = 30 + (i * 13 % 22);
          g.strokeStyle = rgb(i % 2 ? L.gD : mixc(L.gN, L.gD, 0.5)); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (i % 3 - 1) * 3, y - h); g.stroke();
          g.lineWidth = 1.6; for (let k = 1; k < 4; k++){ const yy = y - h * k / 4.2; g.beginPath(); g.moveTo(x - 6, yy - 4); g.lineTo(x, yy); g.lineTo(x + 6, yy - 4); g.stroke(); } }
        for (let i = 0; i < (narrow ? 2 : 4); i++){
          const a = r() * TAU, k = 0.3 + r() * 0.5, x = P.x + Math.cos(a) * P.rx * k + P.rx * 0.2, y = P.y + Math.abs(Math.sin(a)) * P.ry * k * 0.8, s = 0.7 + r() * 0.5;
          g.fillStyle = rgb(mixc(L.gN, L.gD, 0.5)); g.beginPath(); g.ellipse(x, y, 17 * s, 6.5 * s, 0, 0.5, TAU - 0.2); g.lineTo(x, y); g.fill();
          g.fillStyle = rgb(mixc(L.gF, [255, 255, 255], 0.2), 0.6); g.beginPath(); g.ellipse(x - 3 * s, y - 1.2 * s, 9 * s, 3 * s, 0, 0, TAU); g.fill();
        }
      }
      function paintFar(){
        const g = farL.cx;
        g.setTransform(farL.dpr, 0, 0, farL.dpr, 0, -FAR_TOP * farL.dpr);
        g.clearRect(0, FAR_TOP, DW, farL.h);
        paintRange(g, mtnFY, L.mtnF, 392, HZ + 20);
        g.fillStyle = lg(g, 0, 440, 0, HZ + 20, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.5)]]); g.fillRect(0, 440, DW, HZ + 20 - 440);
        paintRange(g, mtnNY, L.mtnN, 458, HZ + 20);
        paintTepui(g);
        g.fillStyle = lg(g, 0, 500, 0, HZ + 20, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.55)]]); g.fillRect(0, 500, DW, HZ + 20 - 500);
        paintVolcano(g);
      }
      function paintGround(){
        const g = groundL.cx;
        g.setTransform(groundL.dpr, 0, 0, groundL.dpr, 0, -GROUND_TOP * groundL.dpr);
        g.clearRect(0, GROUND_TOP, DW, groundL.h);
        paintJungle(g);
        paintBand(g, band1Y, L.gF, L.gM, 720, 0.5, 11);
        for (const tr of TREES) if (tr.y < 660) paintTree(g, tr);
        for (const f of FERNS) if (f.y < 668) paintFern(g, f.x, f.y, f.s, f.v, f.f);
        for (const k of ROCKS) if (k.y < 668) paintRock(g, k.x, k.y, k.s, k.seed);
        paintBand(g, band2Y, L.gM, L.gN, 810, 0.8, 23);
        paintLake(g);
        for (const tr of TREES) if (tr.y >= 660) paintTree(g, tr);
        for (const f of FERNS) if (f.y >= 668) paintFern(g, f.x, f.y, f.s, f.v, f.f);
        for (const k of ROCKS) if (k.y >= 668) paintRock(g, k.x, k.y, k.s, k.seed);
        paintBand(g, band3Y, L.gN, L.gD, DH + 4, 1.1, 37);
        paintLog(g);
      }
      const frontY = x => 856 + 12 * noise1(x * 0.006 + 9) - 8 * Math.sin(x * 0.004);
      function paintFront(){
        const g = frontL.cx;
        g.setTransform(frontL.dpr, 0, 0, frontL.dpr, 0, -FRONT_TOP * frontL.dpr);
        g.clearRect(0, FRONT_TOP, DW, frontL.h);
        g.beginPath(); g.moveTo(-10, DH + 4);
        for (let x = -10; x <= DW + 10; x += 10) g.lineTo(x, frontY(x));
        g.lineTo(DW + 10, DH + 4); g.closePath();
        g.fillStyle = lg(g, 0, 850, 0, DH, [[0, rgb(mixc(L.gN, L.gD, 0.5))], [1, rgb(mixc(L.gD, [10, 30, 60], 0.4))]]); g.fill();
        const r = makeRng(404); g.lineCap = 'round';
        for (let i = 0, n = Math.round(DW / 7); i < n; i++){
          const x = r() * DW, y = frontY(x) + 4 + r() * 10, h = 12 + r() * 22, lean = (r() - 0.5) * 12;
          g.strokeStyle = rgb(r() < 0.5 ? mixc(L.gN, [255, 255, 255], 0.12) : L.gD, 0.9); g.lineWidth = 2 + r() * 1.6;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke();
        }
      }
      // ── the big front fronds: four kinds, baked small per look, swaying live
      const FRL = [], FW = 150, FH = 150;
      for (let v = 0; v < 4; v++) FRL.push(makeLayer(FW, FH, 1));
      function paintFrond(v){
        const g = FRL[v].cx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FW, FH); g.translate(FW / 2, FH - 4);
        const top = rgb(mixc(L.gN, L.gM, 0.35)), mid = rgb(mixc(L.gD, L.gN, 0.3)), dark = rgb(mixc(L.gD, [10, 30, 60], 0.45));
        if (v === 0){ for (const a of [-2.5, -2.05, -1.57, -1.1, -0.65]) frond(g, 0, 0, 104 + (a === -1.57 ? 26 : 0), a, 26, top, dark, 15); }
        else if (v === 1){                                     // a broad split leaf on a stalk
          g.strokeStyle = dark; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-8, -50, 4, -84); g.stroke();
          g.fillStyle = mid; g.beginPath(); g.moveTo(4, -66); g.bezierCurveTo(-60, -62, -62, -132, 6, -146); g.bezierCurveTo(70, -132, 66, -62, 4, -66); g.fill();
          g.fillStyle = top; g.beginPath(); g.moveTo(4, -68); g.bezierCurveTo(-52, -70, -54, -126, 6, -144); g.lineTo(4, -68); g.fill();
          g.strokeStyle = dark; g.lineWidth = 2.6;
          g.beginPath(); g.moveTo(4, -68); g.lineTo(6, -142); g.stroke();
          for (const d of [[-40, -92], [-38, -114], [-24, -132], [44, -92], [42, -114], [28, -132]]){ g.beginPath(); g.moveTo(5, d[1] + 16); g.quadraticCurveTo(d[0] * 0.5, d[1] + 4, d[0], d[1]); g.stroke(); }
        } else if (v === 2){                                   // a tuft of long blades
          g.lineCap = 'round';
          for (let i = 0; i < 9; i++){ const lean = (i - 4) * 9, h = 70 + (i * 29 % 46); g.strokeStyle = i % 2 ? top : mid; g.lineWidth = 5 - (i % 3); g.beginPath(); g.moveTo((i - 4) * 4, 0); g.quadraticCurveTo(lean * 0.4, -h * 0.6, lean * 1.5, -h); g.stroke(); }
        } else {                                               // fiddleheads: curled young ferns
          g.lineCap = 'round';
          for (const d of [[-20, 82, -1], [10, 108, 1], [34, 70, 1]]){
            g.strokeStyle = d[1] > 100 ? top : mid; g.lineWidth = 7; g.beginPath(); g.moveTo(d[0] * 0.3, 0); g.quadraticCurveTo(d[0] * 0.7, -d[1] * 0.6, d[0], -d[1]);
            g.arc(d[0] + d[2] * 11, -d[1], 11, d[2] > 0 ? Math.PI : 0, d[2] > 0 ? Math.PI * 2.7 : -Math.PI * 1.7, d[2] < 0); g.stroke();
          }
        }
      }
      function drawFronds(g, t){
        for (const f of FRONDS){
          const sw = Math.sin(t * 1.0 + f.ph) * 0.06 + Math.sin(t * 0.41 + f.x * 0.01) * 0.05 + (shake ? Math.sin(t * 30 + f.ph) * 0.02 * shake : 0);
          g.save(); g.translate(f.x, f.y); g.rotate(sw); g.scale(f.s * f.f, f.s);
          g.drawImage(FRL[f.v].cv, -FW / 2, -FH + 4, FW, FH); g.restore();
        }
      }
      // the vignette: a small radial sprite stretched over the whole screen
      vigL = makeLayer(64, 64, 1);
      vigL.cx.fillStyle = rg(vigL.cx, 32, 30, 14, 46, [[0, 'rgba(10,20,30,0)'], [0.6, 'rgba(10,20,30,0.04)'], [1, 'rgba(8,16,28,0.38)']]);
      vigL.cx.fillRect(0, 0, 64, 64);

      let lookSig = '';
      function repaintIfNeeded(){
        const key = Math.floor(tod * KEYS.length * 24);
        if (key === lookKey) return;
        lookKey = key; L = lookAt(tod);
        // a key is HELD for a third of its span — nothing moved, nothing to repaint
        const sig = rgb(L.top) + rgb(L.gN) + rgb(L.vol) + rgb(L.tint) + rgb(L.lit) + L.daylight.toFixed(3);
        if (sig === lookSig) return;
        lookSig = sig;
        LIT = [Math.round(L.lit[0] / 255 * 50) / 50, Math.round(L.lit[1] / 255 * 50) / 50, Math.round(L.lit[2] / 255 * 50) / 50];
        paintSky(); paintFar(); paintGround(); paintFront();
        for (let v = 0; v < 3; v++) tintSprite(CLOUD_SRC[v], CLOUD_T[v], L.cloud, L.cloudS);
        tintSprite(CLOUD_SRC[1], smokeT, L.smoke, mixc(L.smoke, L.volD, 0.5));
        tintSprite(farSrc, farT, mixc(L.jung, L.mtnN, 0.4));
        for (let v = 0; v < 4; v++) paintFrond(v);
        perf.repaints++;
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = Math.max(1, Math.round(W * DPR)); canvas.height = Math.max(1, Math.round(H * DPR));
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H)))); AXK = Math.min(1, DW / DW0);
        S = H / DH; OX = (W - DW * S) / 2; OY = 0;
        if (DW !== layoutDW){ layout(); recast(); }
        const ld = DPR * S;                                  // layer pixels per design unit
        skyL = makeLayer(4, 256, 1);
        farL = makeLayer(DW, HZ + 20 - FAR_TOP, ld); groundL = makeLayer(DW, DH - GROUND_TOP, ld); frontL = makeLayer(DW, DH - FRONT_TOP, ld);
        lookKey = -1; lookSig = ''; repaintIfNeeded(); warmTs = 0;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE CAST — families crossing the valley, the pteranodon, eggs, babies
      // ══════════════════════════════════════════════════════════════════════
      let rigsReady = false, autoCast = true, lastKind = '', nextHerdAt = 2, nextPteroAt = 14, roar = null, panicAt = -99;
      const HERDS = [], EGGS = [], BABIES = [];
      let ptero = null;
      const popCap = () => narrow ? 4 : IS_TOUCH ? 6 : 8;
      const maxHerds = () => narrow ? 1 : 2;
      const population = () => HERDS.reduce((n, h) => n + h.members.length, 0);
      const laneS = k => 0.9 + 0.22 * k;                     // nearer = bigger
      function makeDino(kind, x, lane, dir, young){
        const K = KINDS[kind], R = window[K.rig];
        const s = K.h / R.HEIGHT * HS * laneS(lane) * (young ? 0.55 : 1) * rnd(0.96, 1.04);
        return { type: 'dino', kind, R, K, lane, young: !!young, act: null, yOff: 0, rot: 0,
                 q: { x, y: laneY(lane), s, dir, ph: Math.random() * TAU, wt: Math.random() * TAU, moving: false, go: 0, run: false, pose: 0,
                      tint: pick(TINTS), lit: LIT, coat: pick(R.COATS || ['']) } };
      }
      // move an actor by dx: the walk phase follows the distance so the feet stay planted
      function advance(a, dx, dt){
        const q = a.q, R = a.R, d = Math.abs(dx);
        q.moving = d > 0.0001;
        q.go += ((q.moving ? 1 : 0) - q.go) * Math.min(1, dt * 5);
        if (q.moving) q.wt += TAU * d / (((q.run ? R.RUN_STRIDE : R.STRIDE) || 100) * q.s);
        q.lit = LIT;
      }
      // a family of one kind in a lane of its own, crossing at a walk or a run
      function spawnHerd(t, forceKind, opts){
        if (!rigsReady) return null;
        opts = opts || {};
        const kinds = Object.keys(KINDS).filter(k => window[KINDS[k].rig]);
        if (!kinds.length) return null;
        const kind = forceKind && kinds.indexOf(forceKind) >= 0 ? forceKind : pick(kinds.filter(k => k !== lastKind).concat(kinds.length === 1 ? kinds : []));
        const K = KINDS[kind], room = Math.max(1, popCap() - population());
        const dir = opts.dir || (Math.random() < 0.5 ? 1 : -1), run = opts.run === undefined ? Math.random() < K.runP : !!opts.run;
        const lane = opts.lane === undefined ? rnd(0.05, 1) : opts.lane;
        let adults = opts.adults || (K.herd[0] + Math.floor(Math.random() * (K.herd[1] - K.herd[0] + 1)));
        if (narrow && opts.adults === undefined) adults = Math.min(adults, kind === 'raptor' ? 2 : 1);
        adults = Math.max(1, Math.min(adults, room));
        const young = opts.young === undefined ? (adults < room && Math.random() < K.young ? 1 : 0) : opts.young;
        const h = { kind, dir, run, lane, speed: run ? K.runSpeed : K.speed, haltUntil: 0, nextActAt: t + rnd(3, 8), members: [], fled: false };
        let back = 0;
        const order = [];
        for (let i = 0; i < adults; i++) order.push(false);
        for (let i = 0; i < young; i++) order.splice(Math.min(order.length, 1 + i), 0, true);          // the little ones walk behind the leader
        order.forEach((yng, i) => {
          const a = makeDino(kind, 0, clamp(lane + (i ? rnd(-0.07, 0.07) : 0), 0, 1), dir, yng), hw = a.R.WIDTH * a.q.s;
          back += i ? hw * 1.2 + rnd(8, 44) * HS : 0;
          a.q.x = dir > 0 ? -hw * 1.3 - back : DW + hw * 1.3 + back; back += hw * 1.2;
          a.q.run = run; a.herd = h; h.members.push(a);
        });
        HERDS.push(h); lastKind = kind; return h;
      }
      function stepHerd(h, t, dt){
        const halted = t < h.haltUntil && !h.fled; let gone = true, onStage = null;
        for (const a of h.members){
          const q = a.q; let dx = 0;
          if (h.fled){ dx = q.dir * a.K.runSpeed * 1.25 * HS * laneS(a.lane) * dt; q.x += dx; }                // bolting for the nearest edge
          else if (!halted && !(a.act && a.act.type !== 'jump')){ dx = h.dir * h.speed * HS * laneS(a.lane) * dt; q.x += dx; }
          advance(a, dx, dt);
          const edge = a.R.WIDTH * q.s * 1.5 + 40;
          if (q.x > -edge && q.x < DW + edge) gone = false;
          else if (!h.fled && (h.dir > 0 ? q.x < 0 : q.x > DW)) gone = false;                                // still on its way in
          if (q.x > 70 && q.x < DW - 70 && !a.act && (!onStage || Math.random() < 0.4)) onStage = a;
        }
        if (autoCast && !h.fled && onStage && t > h.nextActAt){ h.nextActAt = t + rnd(5, 14); startAct(onStage, pickAct(onStage), t); }
        return gone;
      }
      // the shows frighten everyone: a startled hop, then a dash for the nearest edge
      function panic(t){
        panicAt = t;
        for (const h of HERDS){
          h.fled = true; h.haltUntil = 0;
          for (const a of h.members){ a.q.dir = a.q.x < DW / 2 ? -1 : 1; a.q.run = true; a.q.pose = 0; a.act = { type: 'jump', t0: t + Math.random() * 0.25, dur: 0.5, startled: true }; }
        }
        for (const b of BABIES){ b.q.dir = b.q.x < DW / 2 ? -1 : 1; b.q.run = true; b.act = null; b.q.pose = 0; }
        if (ptero){ ptero.sp *= 2.2; ptero.act = null; startAct(ptero, 'pose', t); }
      }

      // ── the tricks: the rig's own signature pose, a hop, a fart (green puffs
      //    and a wiggle). The T-rex's roar shakes the ground.
      function pickAct(a){
        if (a.type !== 'dino') return 'pose';
        const acts = a.K.acts, r = Math.random();
        if (r < 0.14 && acts.indexOf('fart') >= 0) return 'fart';
        if (r < 0.42 && acts.indexOf('jump') >= 0) return 'jump';
        return 'pose';
      }
      function startAct(a, type, t){
        if (!a || a.act) return false;
        if (a.type !== 'dino' || a.K.acts.indexOf(type) < 0) type = 'pose';
        const dur = type === 'pose' ? (a.R.ACT_SECONDS || ACT_DUR.pose) : ACT_DUR[type];
        a.act = { type, t0: t, dur, last: 0 };
        if (a.herd && type !== 'jump') a.herd.haltUntil = Math.max(a.herd.haltUntil, t + dur + 0.25);
        if (a.kind === 'trex' && type === 'pose') roar = { t0: t + dur * 0.25 };
        return true;
      }
      function stepAct(a, t, dt){
        const A = a.act; if (!A) return;
        const q = a.q, p = (t - A.t0) / A.dur;
        if (p < 0) return;
        if (p >= 1){ a.act = null; a.yOff = 0; a.rot = 0; q.pose = 0; return; }
        if (A.type === 'pose') q.pose = p;
        else if (A.type === 'jump'){ const rel = a.K ? q.s * a.R.HEIGHT / a.K.h : HS; a.yOff = -Math.sin(p * Math.PI) * (A.startled || !a.K ? 22 : a.K.jumpH) * rel; }   // jumpH is for a grown one in the middle lane
        else if (A.type === 'fart'){
          a.rot = Math.sin(p * Math.PI * 6) * 0.04 * (1 - p);
          if (t - A.last > 0.14 && p > 0.18 && p < 0.72){ A.last = t;
            fx('puff', q.x - q.dir * a.R.WIDTH * q.s * 0.72, q.y - a.R.HEIGHT * q.s * 0.4, { vx: -q.dir * rnd(30, 70), vy: rnd(-30, 4), g: -14, life: rnd(0.9, 1.5), c: pick(['#C8EC7A', '#A8DC6A', '#DCF09A']), s: rnd(0.9, 1.5) * Math.max(0.6, q.s), drag: 1.2 }); }
        }
      }
      const roarShake = t => { if (!roar) return 0; const p = (t - roar.t0) / 1.7; if (p >= 1){ roar = null; return 0; } return p > 0 ? Math.abs(Math.sin(t * 34)) * Math.sin(p * Math.PI) * 4 : 0; };
      // a tap: the trick, and a new coat in a puff of sparkles
      function recolour(a){
        const C = a.R.COATS; if (!C || C.length < 2) return;
        a.q.coat = C[(Math.max(0, C.indexOf(a.q.coat)) + 1 + Math.floor(Math.random() * (C.length - 1))) % C.length];
        const cy = a.type === 'ptero' ? a.q.y : a.q.y - a.R.HEIGHT * a.q.s * 0.5;
        burst('spark', a.q.x, cy, 12, 150, { g: 60, life: 0.9, c: pick(['#FFF4B0', '#FFFFFF', '#FFD0E8']), s: 1.3, drag: 1.4 });
      }

      // ── the pteranodon: crosses the sky, now flapping, now gliding; it may
      //    carry an egg and let it go on the way
      function spawnPtero(t, o){
        const R = window.PteroRig;
        if (!rigsReady || !R || ptero) return null;
        o = o || {};
        const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), s = rnd(0.95, 1.15) * clamp(DW / 1000, 0.6, 1);
        const carry = o.carry === undefined ? (Math.random() < 0.6 && !!window.EggRig && EGGS.length < 2) : !!o.carry && !!window.EggRig;
        const eggLane = rnd(0.2, 0.9);
        ptero = { type: 'ptero', kind: 'ptero', R, act: null, yOff: 0, rot: 0, base: o.y === undefined ? rnd(110, 300) : o.y, sp: rnd(130, 180) * Math.max(0.7, HS),
                  dropX: o.dropX === undefined ? pickDropX() : o.dropX, eggLane,
                  q: { x: dir > 0 ? -R.WIDTH * s - 30 : DW + R.WIDTH * s + 30, y: 0, s, dir, ph: Math.random() * TAU, wt: 0, glide: 0, pose: 0, tint: pick(TINTS), lit: LIT,
                       coat: pick(R.COATS || ['']), carry, grip: carry ? 1 : 0, eggS: eggScale(eggLane) / s, eggCoat: pick((window.EggRig && window.EggRig.COATS) || ['']) } };
        ptero.q.y = ptero.base;
        return ptero;
      }
      const eggScale = lane => 58 / ((window.EggRig && window.EggRig.HEIGHT) || 56) * HS * laneS(lane);
      function pickDropX(){ for (let i = 0; i < 8; i++){ const x = rnd(0.14, 0.88) * DW; if (Math.abs(x - LAKE.x) > LAKE.rx + 50) return x; } return DW * 0.5; }
      function stepPtero(t, dt){
        const a = ptero, q = a.q, R = a.R;
        q.x += q.dir * a.sp * dt; q.y = a.base + Math.sin(t * 0.8 + q.ph) * 18;
        q.glide = a.act ? 0 : clamp01(Math.sin(t * 0.55 + q.ph) * 1.6 - 0.5);
        q.wt += TAU * (R.FLAP_CPS || 1.6) * dt * (1 - q.glide * 0.9); q.lit = LIT;
        q.grip = q.carry ? 1 : Math.max(0, (q.grip || 0) - dt * 1.6);                           // the legs let go and trail again
        if (q.carry && autoCast && !showBusy() && (q.dir > 0 ? q.x >= a.dropX : q.x <= a.dropX)) layEgg(t);
        if (q.x < -R.WIDTH * q.s - 80 || q.x > DW + R.WIDTH * q.s + 80) ptero = null;
      }
      // ── eggs: fall, bounce, rest a while rocking, crack, hatch — and the baby
      //    hops out and toddles away
      function dropEgg(t, x, y, vx, coat, lane){
        const E = window.EggRig; if (!E || !window.BabyRig) return null;
        if (EGGS.length >= 3) EGGS.shift();
        lane = lane === undefined ? rnd(0.2, 0.9) : lane; const s = eggScale(lane);
        const e = { type: 'egg', kind: 'egg', R: E, state: 'fall', t0: t, vx: vx || 0, vy: 0, gy: laneY(lane), lane, bounces: 0, yOff: 0, act: null,
                    q: { x, y, s, dir: Math.random() < 0.5 ? 1 : -1, ph: Math.random() * TAU, lit: LIT, tint: 1, coat: coat || pick(E.COATS || ['']), wobble: 0, crack: 0, hatch: 0 } };
        EGGS.push(e); return e;
      }
      function layEgg(t){
        if (!ptero || !ptero.q.carry) return null;
        const R = ptero.R, f = R.feet ? R.feet(ptero.q) : { x: ptero.q.x, y: ptero.q.y + 30 * ptero.q.s };     // feet() = the carried egg's centre
        ptero.q.carry = false;
        return dropEgg(t, f.x, f.y + ((window.EggRig && window.EggRig.HEIGHT) || 56) / 2 * eggScale(ptero.eggLane), ptero.q.dir * ptero.sp * 0.35, ptero.q.eggCoat, ptero.eggLane);
      }
      const hatchNow = (e, t) => { if (e.state === 'rest' || e.state === 'fall'){ if (e.state === 'fall'){ e.q.y = e.gy; } e.state = 'crack'; e.t0 = t; return true; } return false; };
      function stepEgg(e, t, dt){
        const q = e.q, p = t - e.t0; q.lit = LIT;
        if (e.state === 'fall'){
          e.vy += 760 * dt; q.x = clamp(q.x + e.vx * dt, 30, DW - 30); q.y += e.vy * dt; q.wobble = 0.5;
          if (q.y >= e.gy){ q.y = e.gy; burst('dust', q.x, e.gy, 3, 30, { arc: [-2.6, -0.5], g: -8, life: 0.8, c: '#D8CCB0' });
            if (++e.bounces < 3 && Math.abs(e.vy) > 120){ e.vy = -e.vy * 0.42; e.vx *= 0.5; } else { e.state = 'rest'; e.t0 = t; e.restFor = rnd(3, 5.5); } }
        } else if (e.state === 'rest'){ q.wobble = 0.15 + 0.5 * smooth(p / e.restFor); if (p > e.restFor){ e.state = 'crack'; e.t0 = t; } }
        else if (e.state === 'crack'){ q.wobble = 1; q.crack = clamp01(p / 1.1); if (p > 1.1){ e.state = 'hatch'; e.t0 = t; burst('spark', q.x, q.y - 40 * q.s, 6, 80, { g: 200, life: 0.6, c: '#FFF6E0' }); } }
        else if (e.state === 'hatch'){ q.wobble = 0.3 * (1 - clamp01(p / 0.6)); q.crack = 1; q.hatch = smooth(p / 1.4); if (p > 2.6){ e.state = 'out'; e.t0 = t; spawnBaby(e, t); } }
        else if (e.state === 'out'){ if (p > 1.6) return true; }                                    // the empty shell lingers, then fades
        return false;
      }
      function spawnBaby(e, t){
        const R = window.BabyRig; if (!R) return;
        if (BABIES.length >= 3) BABIES.shift();
        const dir = e.q.dir, s = e.q.s;
        const b = { type: 'baby', kind: 'baby', R, lane: e.lane, act: null, yOff: 0, rot: 0, nextActAt: t + rnd(3, 6), pauseUntil: 0,
                    q: { x: e.q.x - 5.5 * s * dir, y: e.q.y, s, dir, ph: Math.random() * TAU, wt: 0, moving: false, go: 0, run: false, pose: 0, tint: 1, lit: LIT, coat: e.q.coat, cap: true } };
        b.act = { type: 'jump', t0: t, dur: 0.55, startled: true };                              // out she hops
        burst('heart', b.q.x, b.q.y - 50 * s, 3, 50, { arc: [-2.4, -0.7], g: -12, life: 1.3, c: '#FF9AB0' });
        BABIES.push(b);
      }
      function stepBaby(b, t, dt){
        const q = b.q; let dx = 0;
        if (!(b.act && b.act.type === 'pose') && t >= b.pauseUntil){ dx = q.dir * (q.run ? 150 : 44) * HS * dt; q.x += dx; }
        advance(b, dx, dt);
        if (autoCast && !b.act && !q.run && t > b.nextActAt){ b.nextActAt = t + rnd(5, 10); startAct(b, 'pose', t); }
        return q.x < -80 || q.x > DW + 80;
      }

      function drawActor(g, a, t){
        const q = a.q, R = a.R;
        if (a.type === 'dino' || a.type === 'baby'){            // a soft ground shadow, shrinking under a hop
          const lift = clamp01(-a.yOff / (60 * q.s + 1)), rx = R.WIDTH * q.s * 0.78 * (1 - lift * 0.35);
          g.fillStyle = 'rgba(10,20,40,' + (0.22 * (1 - lift * 0.5) * (0.5 + 0.5 * L.daylight)) + ')';
          g.beginPath(); g.ellipse(q.x, q.y + 2, rx, Math.max(3, rx * 0.13), 0, 0, TAU); g.fill();
        }
        const y = q.y; q.y = y + a.yOff;
        if (a.rot){ const py = q.y - R.HEIGHT * q.s * 0.5; g.save(); g.translate(q.x, py); g.rotate(a.rot); g.translate(-q.x, -py); R.draw(g, q, t); g.restore(); }
        else R.draw(g, q, t);
        q.y = y;
      }
      function recast(){
        HERDS.length = 0; EGGS.length = 0; BABIES.length = 0; FX.length = 0; COCOS.length = 0; ptero = null; roar = null; show = null; shake = 0; quietAt = 0;
        swim.state = 'down'; swim.up = 0;
      }
      const everyone = () => { const all = []; for (const h of HERDS) for (const a of h.members) all.push(a); if (ptero) all.push(ptero); return all.concat(BABIES); };
      let ORDER = [];
      function stepCast(t, dt){
        if (!rigsReady) return;
        for (let i = HERDS.length - 1; i >= 0; i--) if (stepHerd(HERDS[i], t, dt)) HERDS.splice(i, 1);
        if (autoCast && t > nextHerdAt){ nextHerdAt = t + rnd(4, 10); if (!showBusy() && HERDS.length < maxHerds() && population() < popCap()) spawnHerd(t); }
        if (autoCast && t > nextPteroAt && !ptero){ nextPteroAt = t + rnd(26, 55); if (!showBusy()) spawnPtero(t); }
        if (ptero) stepPtero(t, dt);
        for (let i = EGGS.length - 1; i >= 0; i--) if (stepEgg(EGGS[i], t, dt)) EGGS.splice(i, 1);
        for (let i = BABIES.length - 1; i >= 0; i--) if (stepBaby(BABIES[i], t, dt)) BABIES.splice(i, 1);
        const all = everyone();
        for (const a of all) stepAct(a, t, dt);
        ORDER = all.filter(a => a.type !== 'ptero').concat(EGGS);
        ORDER.sort((p, q) => p.q.y - q.q.y);
        perf.cast = all.length + EGGS.length;
      }
      function drawSky(g, t){ if (ptero && rigsReady) drawActor(g, ptero, t); }
      function drawCast(g, t){
        if (!rigsReady) return;
        for (const a of ORDER){
          if (a.type === 'egg' && a.state === 'out'){ g.globalAlpha = clamp01((1.6 - (t - a.t0)) / 0.6); a.R.draw(g, Object.assign({}, a.q, { hatch: 1, empty: true }), t); g.globalAlpha = 1; }
          else drawActor(g, a, t);
        }
      }

      // the frontmost actor under a point: babies and eggs, then the dinosaurs (nearest first), then the pteranodon
      function hitCast(x, y){
        const hit = (a, pad) => { const q = a.q, w = a.R.WIDTH * q.s + pad, h = a.R.HEIGHT * q.s + pad; return Math.abs(x - q.x) < w && y > q.y + a.yOff - h && y < q.y + a.yOff + pad; };
        for (const b of BABIES) if (hit(b, 10)) return b;
        for (const e of EGGS) if (e.state !== 'out' && hit(e, 12)) return e;
        for (let i = ORDER.length - 1; i >= 0; i--) if (ORDER[i].type === 'dino' && hit(ORDER[i], 6)) return ORDER[i];
        if (ptero){ const q = ptero.q; if (Math.abs(x - q.x) < ptero.R.WIDTH * q.s + 10 && Math.abs(y - q.y) < ptero.R.HEIGHT * q.s * 0.6 + 10) return ptero; }
        return null;
      }
      function tapActor(a, t){
        if (a.type === 'egg'){ hatchNow(a, t); return; }
        if (a.type === 'ptero'){ if (a.q.carry) layEgg(t); if (!a.act) startAct(a, 'pose', t); recolour(a); return; }
        if (a.act) return;
        startAct(a, a.type === 'dino' && a.kind !== 'trex' ? pickAct(a) : 'pose', t);       // the T-rex always roars
        recolour(a);
      }
      // ── the cast's hooks
      const info = a => ({ type: a.type, kind: a.kind, coat: a.q.coat, x: a.q.x, y: a.q.y, s: a.q.s, dir: a.q.dir, go: a.q.go || 0, run: !!a.q.run, pose: a.q.pose || 0,
                           young: !!a.young, carry: !!a.q.carry, yOff: a.yOff, act: a.act ? a.act.type : null,
                           cx: OX + a.q.x * S, cy: OY + (a.type === 'ptero' ? a.q.y : a.q.y + a.yOff - a.R.HEIGHT * a.q.s * 0.5) * S });
      const eggInfo = e => ({ state: e.state, coat: e.q.coat, x: e.q.x, y: e.q.y, crack: e.q.crack, hatch: e.q.hatch, wobble: e.q.wobble,
                              cx: OX + e.q.x * S, cy: OY + (e.q.y - e.R.HEIGHT * e.q.s * 0.5) * S });
      const castHooks = {
        everyone: () => everyone().map(info),
        herds: () => HERDS.map(h => ({ kind: h.kind, dir: h.dir, run: h.run, lane: h.lane, fled: h.fled, members: h.members.map(info) })),
        herd: () => HERDS.length ? HERDS[HERDS.length - 1].members.map(info) : [],
        spawn(kind, opts){ const h = spawnHerd(lastT, kind, opts); return h ? h.members.length : 0; },
        clearHerds(){ HERDS.length = 0; EGGS.length = 0; BABIES.length = 0; ptero = null; },
        auto(v){ autoCast = !!v; },                           // false: nobody comes or performs on the schedule (the tests bring their own)
        kinds: () => Object.keys(KINDS).filter(k => window[KINDS[k].rig]),
        // act(a kind | 'ptero' | 'baby' | an index into everyone(), type)
        act(who, type){
          const all = everyone(), a = typeof who === 'number' ? all[who] : all.find(m => m.kind === who);
          if (!a) return false;
          a.act = null; a.yOff = 0; a.rot = 0; return startAct(a, type || 'pose', lastT);
        },
        fly(o){ return !!spawnPtero(lastT, o); },
        ptero: () => ptero ? info(ptero) : null,
        lay(){ return !!layEgg(lastT); },                     // the pteranodon lets its egg go now
        egg(o){ o = o || {}; return !!dropEgg(lastT, o.x === undefined ? DW * 0.7 : o.x, o.y === undefined ? 260 : o.y, 0, o.coat, o.lane); },   // an egg falls from the sky
        eggs: () => EGGS.map(eggInfo),
        hatch(i){ const e = EGGS[i || 0]; return e ? hatchNow(e, lastT) : false; },
        babies: () => BABIES.map(info),
        roaring: () => !!roar,
        panicked: () => lastT - panicAt < 6,
        hitAt(cx, cy){ const a = hitCast((cx - OX) / S, (cy - OY) / S); return a ? a.kind : null; },   // who a tap at client x, y would reach
      };

      // ══════════════════════════════════════════════════════════════════════
      // THE LIVE BITS — the volcano's fire, the shows, the lake, the air
      // ══════════════════════════════════════════════════════════════════════
      // particles: lava, sparks, ash, dust, water drops, hearts, puffs — one capped pool
      const FX = [];
      const fxCap = () => narrow || IS_TOUCH ? 130 : 230;
      function fx(kind, x, y, o){
        if (FX.length >= fxCap()) FX.shift();
        o = o || {};
        FX.push({ kind, x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g === undefined ? 60 : o.g, t0: lastT + (o.delay || 0), life: o.life || 1.2,
                  c: o.c || '#FFFFFF', s: o.s || 1, rot: Math.random() * TAU, drag: o.drag || 0 });
      }
      function burst(kind, x, y, n, sp, o){
        o = o || {};
        for (let i = 0; i < n; i++){
          const a = o.arc ? o.arc[0] + Math.random() * (o.arc[1] - o.arc[0]) : Math.random() * TAU, v = sp * (0.35 + Math.random() * 0.65);
          fx(kind, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g, life: (o.life || 1.2) * (0.7 + Math.random() * 0.5), c: o.c,
                           s: (o.s || 1) * (0.6 + Math.random() * 0.7), delay: o.delay, drag: o.drag });
        }
      }
      const LAVA_COL = ['#FFF2A0', '#FFC24A', '#FF8A30', '#E2401E', '#8A1C1C'];
      function heartPath(g, r){ g.beginPath(); g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.5, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.45); g.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.5, -r * 0.2, 0, r * 0.9); }
      function drawFX(g, t, dt){
        for (let i = FX.length - 1; i >= 0; i--){
          const p = FX[i], age = t - p.t0;
          if (age < 0) continue;
          if (age >= p.life){ FX.splice(i, 1); continue; }
          p.vy += p.g * dt; if (p.drag){ const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          const k = age / p.life, a = k < 0.12 ? k / 0.12 : 1 - smooth((k - 0.12) / 0.88);
          if (p.kind === 'lava'){                              // cools as it flies: yellow → orange → dark red
            g.fillStyle = LAVA_COL[Math.min(4, Math.floor(k * 5))]; g.globalAlpha = Math.min(1, a * 1.6);
            g.beginPath(); g.arc(p.x, p.y, 4.6 * p.s * (1 - k * 0.4), 0, TAU); g.fill(); g.globalAlpha = 1;
          } else if (p.kind === 'spark' || p.kind === 'drop'){
            g.fillStyle = p.c; g.globalAlpha = a; g.beginPath(); g.arc(p.x, p.y, (p.kind === 'drop' ? 3.2 : 2.4) * p.s, 0, TAU); g.fill(); g.globalAlpha = 1;
          } else if (p.kind === 'heart'){
            g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(age * 3 + p.rot) * 0.3); g.globalAlpha = a; g.fillStyle = p.c; heartPath(g, 7 * p.s); g.fill(); g.restore(); g.globalAlpha = 1;
          } else {                                             // ash, dust, puff: a soft growing ball
            g.fillStyle = p.c; g.globalAlpha = a * (p.kind === 'ash' ? 0.5 : 0.6);
            g.beginPath(); g.arc(p.x, p.y, (p.kind === 'ash' ? 16 : 9) * p.s * (0.6 + k * 1.2), 0, TAU); g.fill(); g.globalAlpha = 1;
          }
        }
        perf.fx = FX.length;
      }

      // ── the volcano's fire: the lava lake in the crater, the glowing streams
      //    in their channels, the smoke plume, embers at night
      const smokeT = makeLayer(380, 170, 1);
      const SMOKE = []; let nextSmokeAt = 0, shake = 0;
      function drawVolcanoLive(g, t, dt){
        const x = VOL.x, rim = VOL.rim, rw = VOL.rw, s = VOL.s, er = eruptPower(t);
        const lv = Math.min(1.3, 0.45 + 0.55 * L.lava + er * 0.5);
        // the night glow on the cone and above the crater
        glow(g, 'red', x, rim + 70 * s, VOL.bw * 0.9, 0.2 * L.lava + 0.2 * er);
        glow(g, 'fire', x, rim - 10 * s, rw * (2.6 + er * 2.4), 0.3 + 0.35 * L.lava + 0.3 * er);
        // the streams: a hot core with brighter pulses running down
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let c = 0; c < LAVA_CH.length; c++){
          const wd = (c === 2 ? 5 : 7) * s;
          g.beginPath(); for (let k = 0; k <= 20; k++){ const p = lavaPt(c, k / 20); if (k === 0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
          g.strokeStyle = 'rgba(255,110,36,' + Math.min(1, 0.8 * lv) + ')'; g.lineWidth = wd; g.stroke();
          g.strokeStyle = 'rgba(255,220,110,' + Math.min(1, 0.85 * lv) + ')'; g.lineWidth = wd * 0.42;
          g.setLineDash([16 * s, 26 * s]); g.lineDashOffset = -t * (34 + c * 9) * s; g.stroke(); g.setLineDash([]);
          for (const k of [0.25, 0.6, 0.95]){ const p = lavaPt(c, k); glow(g, 'fire', p[0], p[1], 26 * s, 0.3 * lv * (0.7 + 0.3 * Math.sin(t * 2 + c + k * 9))); }
        }
        // the lava lake
        const pulse = 0.85 + 0.15 * Math.sin(t * 2.3);
        g.fillStyle = rg(g, x, rim + 3 * s, 2, rw * 0.8, [[0, '#FFF6B0'], [0.5, '#FFB23C'], [1, '#E2501E']]);
        g.globalAlpha = Math.min(1, (0.75 + 0.25 * L.lava) * pulse + er); g.beginPath(); g.ellipse(x, rim + 3.5 * s, rw * 0.78, rw * 0.14, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        // the smoke: puffs rise from the crater, grow, lean with the wind and thin out
        const cap = narrow ? 9 : 15;
        if (t > nextSmokeAt && SMOKE.length < cap){ nextSmokeAt = t + (er > 0.2 ? 0.16 : 0.55); SMOKE.push({ x: x + rnd(-0.4, 0.4) * rw, y: rim - 6 * s, vx: rnd(6, 16), vy: rnd(-36, -22) * (1 + er), r: rnd(22, 34) * s, t0: t, life: rnd(5.5, 8), dark: er > 0.2 }); }
        for (let i = SMOKE.length - 1; i >= 0; i--){
          const p = SMOKE[i], k = (t - p.t0) / p.life;
          if (k >= 1){ SMOKE.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - 0.12 * dt;
          const r = p.r * (1 + k * 2.6), a = (k < 0.12 ? k / 0.12 : 1 - k) * (p.dark ? 0.8 : 0.55);
          g.globalAlpha = a; g.drawImage(smokeT.cv, p.x - r * 1.5, p.y - r * 0.8, r * 3, r * 1.5);
          if (p.dark){ g.globalAlpha = a * 0.5; g.fillStyle = '#2A2030'; g.beginPath(); g.arc(p.x, p.y, r * 0.7, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 1;
        if (L.lava > 0.6 && Math.random() < dt * 3 * L.lava) fx('spark', x + rnd(-0.6, 0.6) * rw, rim, { vx: rnd(-14, 26), vy: rnd(-70, -30), g: -6, life: rnd(1.4, 2.6), c: pick(['#FFD27A', '#FF9A3C', '#FF6A2A']), s: rnd(0.6, 1.1) });
      }

      // ── the far herd: long-neck silhouettes plodding along behind the jungle line
      const FARH = [{ u: 0.12, s: 0.62 }, { u: 0.2, s: 0.44 }, { u: 0.62, s: 0.56 }];
      function drawFarHerd(g, t){
        const span = DW + 240, n = narrow ? 2 : FARH.length;
        for (let i = 0; i < n; i++){
          const f = FARH[i], x = span - ((f.u * span + t * 5) % span) - 120, w = 96 * f.s, h = 60 * f.s;
          g.save(); g.translate(x, 600 - h * 0.86 + Math.sin(t * 1.6 + i * 2) * 0.8); g.scale(-1, 1);          // they head left
          g.drawImage(farT.cv, -w / 2, 0, w, h); g.restore();
        }
      }
      // the thread of water down the table mountain
      function drawTepuiFall(g, t){
        const x = TEPUI.x + TEPUI.w * 0.16, y0 = TEPUI.top + 4, y1 = HZ - 14;
        g.strokeStyle = rgb(mixc(L.water, [255, 255, 255], 0.6), 0.85); g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 2, y1); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.setLineDash([10, 18]); g.lineDashOffset = -t * 60; g.stroke(); g.setLineDash([]);
        glow(g, 'white', x + 2, y1, 22, 0.4);
      }
      // morning mist lying along the foot of the jungle
      function drawMist(g, t){
        const a = L.mist; if (a <= 0.02) return;
        const w = Math.max(700, DW * 0.7);
        for (let i = 0; i < 3; i++){
          const x = ((i * 0.37 * (DW + w) + t * (6 + i * 3)) % (DW + w)) - w;
          g.globalAlpha = a * 0.4; g.drawImage(CLOUD_T[i].cv, x, 566 + i * 22, w, 80);
        }
        g.globalAlpha = 1;
      }

      // ── THE SHOWS: an eruption (3-2-1, a lava fountain, lava bombs, ash) and a
      //    meteor shower; taps on the volcano alternate between them. Either
      //    way the cast bolts (panic) and nobody comes back until it is quiet.
      let show = null, nextShow = 'erupt', quietAt = 0, shows = 0;
      const COUNT = 1.8, ERUPT_DUR = 8.2, STORM_DUR = 7.6;
      const showBusy = () => !!show || lastT < quietAt;
      function eruptPower(t){                                  // 0..1 how hard the volcano is blowing right now
        if (!show || show.type !== 'erupt') return 0;
        const p = t - show.t0;
        return p < COUNT ? 0.15 * p / COUNT : p < COUNT + 4.6 ? 1 : Math.max(0, 1 - (p - COUNT - 4.6) / 1.4);
      }
      function startShow(t, type){
        if (show) return false;
        type = type || nextShow; nextShow = type === 'erupt' ? 'storm' : 'erupt'; shows++;
        show = { type, t0: t, boomed: false, bombs: [], meteors: [], nextBomb: 0, lastLava: 0 };
        if (type === 'storm'){
          const n = narrow ? 6 : 10;
          for (let i = 0; i < n; i++) show.meteors.push({ at: 0.3 + i * (5.2 / n) + Math.random() * 0.3, x0: rnd(0.35, 1.25) * DW, vx: -rnd(340, 500), vy: rnd(300, 390), hit: false, s: rnd(0.8, 1.4) });
        }
        return true;
      }
      function stepShow(t, dt){
        shake = 0;
        if (!show) return;
        const p = t - show.t0, x = VOL.x, rim = VOL.rim, rw = VOL.rw, s = VOL.s;
        if (show.type === 'erupt'){
          if (p < COUNT) shake = 1.2 + p;
          else {
            if (!show.boomed){ show.boomed = true; panic(t); burst('lava', x, rim, narrow ? 30 : 54, 520 * s, { arc: [-2.4, -0.74], g: 520, life: 2.2, s: 1.5 }); }
            const pw = eruptPower(t);
            shake = 8 * pw * (0.6 + 0.4 * Math.sin(t * 40));
            if (pw > 0.1 && t - show.lastLava > (narrow ? 0.05 : 0.028)){                    // the fountain
              show.lastLava = t;
              fx('lava', x + rnd(-0.5, 0.5) * rw, rim, { vx: rnd(-150, 150) * s, vy: -rnd(300, 620) * s * pw, g: 560, life: rnd(1.4, 2.4), s: rnd(0.9, 1.7) });
              if (Math.random() < 0.3) fx('ash', x + rnd(-1, 1) * rw, rim - 20 * s, { vx: rnd(-20, 50), vy: rnd(-90, -50), g: -8, life: rnd(2, 3.4), c: '#3A3040', s: rnd(1, 2) * s });
            }
            if (pw > 0.5 && t > show.nextBomb && show.bombs.length < 7){                      // a lava bomb, thrown wide
              show.nextBomb = t + rnd(0.45, 0.8);
              const tx = clamp(x + rnd(-1.5, 1.0) * VOL.bw, 40, DW - 40), ty = rnd(618, 700), fl = rnd(1.5, 2.1);
              show.bombs.push({ x0: x, y0: rim, x1: tx, y1: ty, t0: t, fl, h: rnd(260, 400) * s, done: false });
            }
          }
          if (p > ERUPT_DUR){ show = null; quietAt = t + 2.5; }
        } else {
          if (p > 0.5 && !show.boomed){ show.boomed = true; panic(t); }
          if (p > STORM_DUR){ show = null; quietAt = t + 2.5; }
        }
      }
      function drawShow(g, t){
        if (!show) return;
        const p = t - show.t0, x = VOL.x, rim = VOL.rim, s = VOL.s;
        if (show.type === 'erupt'){
          if (p < COUNT){                                      // 3 … 2 … 1 over the crater
            const n = 3 - Math.floor(p / 0.6), k = (p % 0.6) / 0.6, sz = 130 * s * (1.35 - 0.35 * smooth(Math.min(1, k * 3)));
            glow(g, 'fire', x, rim - 120 * s, 120 * s, 0.6 * (1 - k * 0.5));
            g.font = '900 ' + Math.round(sz) + 'px "Fredoka One","Arial Rounded MT Bold","Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
            g.fillStyle = '#C2401E'; g.fillText(String(n), x + 3 * s, rim - 116 * s);
            g.fillStyle = '#FFF2C4'; g.fillText(String(n), x, rim - 120 * s);
            g.globalAlpha = 1;
          } else if (p < COUNT + 0.5) glow(g, 'warm', x, rim, 520 * s * (0.5 + p - COUNT), 0.8 * (1 - (p - COUNT) / 0.5));   // the flash
          for (const b of show.bombs){                         // bombs: a glowing rock on an arc, a splash of sparks where it lands
            const k = (t - b.t0) / b.fl; if (b.done) continue;
            if (k >= 1){ b.done = true; burst('lava', b.x1, b.y1, 9, 150, { arc: [-2.7, -0.44], g: 420, life: 0.9 }); burst('dust', b.x1, b.y1, 4, 40, { arc: [-2.6, -0.5], g: -10, life: 1.2, c: '#B8A090', s: 1.4 }); glow(g, 'fire', b.x1, b.y1, 70, 0.8); continue; }
            const bx = lerp(b.x0, b.x1, k), by = lerp(b.y0, b.y1, k) - Math.sin(k * Math.PI) * b.h;
            glow(g, 'fire', bx, by, 26, 0.9); g.fillStyle = '#FFD27A'; g.beginPath(); g.arc(bx, by, 6.5, 0, TAU); g.fill();
            if (Math.random() < 0.6) fx('spark', bx, by, { vx: rnd(-20, 20), vy: rnd(-10, 30), g: 40, life: 0.6, c: '#FF9A3C' });
          }
        } else {
          for (const m of show.meteors){
            const k = p - m.at; if (k < 0 || m.hit) continue;
            const mx = m.x0 + m.vx * k, my = -40 + m.vy * k, ground = Math.min(HZ - 30, mtnFY(clamp(mx, 0, DW)) + 34);
            if (my >= ground || mx < -80){                     // down beyond the ranges: a flash, a puff of dust
              m.hit = true; m.fx = mx; m.fy = ground; m.ft = t;
              burst('dust', mx, ground, 5, 50, { arc: [-2.6, -0.5], g: -14, life: 1.6, c: '#D8B8A0', s: 2 }); burst('spark', mx, ground, 8, 160, { arc: [-2.8, -0.3], g: 300, life: 0.7, c: '#FFC06A' });
              continue;
            }
            const tx = mx - m.vx * 0.26, ty = my - m.vy * 0.26;
            g.strokeStyle = lg(g, mx, my, tx, ty, [[0, 'rgba(255,240,190,0.95)'], [0.3, 'rgba(255,150,60,0.7)'], [1, 'rgba(255,80,40,0)']]);
            g.lineWidth = 7 * m.s; g.lineCap = 'round'; g.beginPath(); g.moveTo(mx, my); g.lineTo(tx, ty); g.stroke();
            glow(g, 'fire', mx, my, 30 * m.s, 0.9); g.fillStyle = '#FFF6D0'; g.beginPath(); g.arc(mx, my, 5 * m.s, 0, TAU); g.fill();
          }
          for (const m of show.meteors) if (m.hit && t - m.ft < 0.7){ const k = (t - m.ft) / 0.7; glow(g, 'warm', m.fx, m.fy, 150 * (0.5 + k), 0.9 * (1 - k)); if (k < 0.2) shake = Math.max(shake, 3); }
        }
      }

      // ── the lake: glints, the sun's (or the moon's) path, ripples — and the
      //    SWIMMER, a friendly long-neck who comes up for a look and a squirt
      const RIPPLES = []; let nextRippleAt = 3;
      const inLake = (x, y) => { const dx = (x - LAKE.x) / LAKE.rx, dy = (y - LAKE.y) / LAKE.ry; return dx * dx + dy * dy < 1; };
      function ripple(x, y, t, big){ if (RIPPLES.length < 8) RIPPLES.push({ x, y, t0: t, big: !!big }); }
      const swim = { state: 'down', t0: 0, up: 0, nextAt: 14, squirts: 0, lastDrop: 0 };
      const swimXY = () => ({ x: LAKE.x + LAKE.rx * 0.16, y: LAKE.y + LAKE.ry * 0.16, s: clamp(LAKE.rx / 170, 0.62, 1) });
      function surface(t){                                     // comes up; if she is up already she squirts
        if (swim.state === 'down'){ swim.state = 'rise'; swim.t0 = t; const p = swimXY(); ripple(p.x, p.y, t, true); return 'rise'; }
        if (swim.state === 'look'){ swim.state = 'squirt'; swim.t0 = t; swim.squirts++; return 'squirt'; }
        return swim.state;
      }
      function stepSwimmer(t, dt){
        const st = swim.state, p = t - swim.t0;
        if (st === 'down'){ swim.up = 0; if (autoCast && t > swim.nextAt && !showBusy()) surface(t); }
        else if (st === 'rise'){ swim.up = smooth(p / 1.1); if (p >= 1.1){ swim.state = 'look'; swim.t0 = t; } }
        else if (st === 'look'){ swim.up = 1; if (p > 4.5 || (show && show.boomed)){ swim.state = 'sink'; swim.t0 = t; } }
        else if (st === 'squirt'){ swim.up = 1; if (p > 1.5){ swim.state = 'look'; swim.t0 = t; } }
        else if (st === 'sink'){ swim.up = 1 - smooth(p / 0.9); if (p >= 0.9){ swim.state = 'down'; swim.up = 0; swim.nextAt = t + rnd(22, 48); const q = swimXY(); ripple(q.x, q.y, t, true); } }
      }

      const litc = (c, a) => rgb(mulc(hexc(c), [LIT[0] * 255, LIT[1] * 255, LIT[2] * 255]), a);
      function drawSwimmer(g, t){
        const u = swim.up; if (u <= 0.01) return;
        const P = swimXY(), s = P.s, bx = P.x, by = P.y, rise = (1 - u) * 132 * s, sq = swim.state === 'squirt' ? Math.sin(Math.min(1, (t - swim.t0) / 1.5) * Math.PI) : 0;
        g.save(); g.beginPath(); g.rect(bx - 220, by - 320, 440, 320); g.clip();          // nothing shows below the waterline
        const bob = Math.sin(t * 1.4) * 2.4 * s, y0 = by + rise + bob;
        // two humps of her back behind the neck
        g.fillStyle = lg(g, 0, y0 - 22 * s, 0, y0 + 10 * s, [[0, litc('#7ED8CC')], [1, litc('#3E9E9C')]]);
        g.beginPath(); g.ellipse(bx - 52 * s, y0 + 6 * s, 30 * s, 20 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(bx - 100 * s, y0 + 12 * s, 20 * s, 14 * s, 0, 0, TAU); g.fill();
        // the neck: a thick curve up to the head, a cream stripe down its front
        const hx = bx + (30 + sq * 8) * s, hy = y0 - (116 + sq * 6) * s, cx = bx - 16 * s, cy = y0 - 62 * s;
        g.lineCap = 'round';
        g.strokeStyle = lg(g, bx - 20 * s, 0, bx + 40 * s, 0, [[0, litc('#3E9E9C')], [0.6, litc('#6CCEC2')], [1, litc('#8EE2D4')]]); g.lineWidth = 24 * s;
        g.beginPath(); g.moveTo(bx, y0 + 26 * s); g.quadraticCurveTo(cx, cy, hx - 8 * s, hy + 6 * s); g.stroke();
        g.strokeStyle = litc('#FFF4D8', 0.75); g.lineWidth = 8 * s;
        g.beginPath(); g.moveTo(bx + 7 * s, y0 + 26 * s); g.quadraticCurveTo(cx + 9 * s, cy + 2 * s, hx - 3 * s, hy + 12 * s); g.stroke();
        g.fillStyle = litc('#2E8A8C', 0.5); for (let i = 0; i < 4; i++){ const k = 0.25 + i * 0.17, qx = (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * cx + k * k * (hx - 8 * s), qy = (1 - k) * (1 - k) * (y0 + 26 * s) + 2 * (1 - k) * k * cy + k * k * (hy + 6 * s); g.beginPath(); g.arc(qx - 9 * s, qy, 4 * s, 0, TAU); g.fill(); }
        // the head: round, a soft snout, ONE eye, a blush, a smile
        g.save(); g.translate(hx, hy); g.rotate(-0.12 - sq * 0.5);
        g.fillStyle = lg(g, 0, -16 * s, 0, 14 * s, [[0, litc('#9AE8DA')], [1, litc('#52B4AE')]]);
        g.beginPath(); g.ellipse(0, 0, 21 * s, 15.5 * s, 0, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(17 * s, 3.5 * s, 15 * s, 10.5 * s, 0, 0, TAU); g.fill();
        g.fillStyle = litc('#FFF4D8', 0.8); g.beginPath(); g.ellipse(14 * s, 9 * s, 13 * s, 4.6 * s, 0, 0, Math.PI); g.fill();
        const blink = (t * 0.31 + 0.2) % 1 > 0.955;
        if (blink || sq > 0.3){ g.strokeStyle = litc('#22323E'); g.lineWidth = 2 * s; g.beginPath(); g.arc(5 * s, -3 * s, 4.4 * s, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); }
        else { g.fillStyle = litc('#FFFFFF'); g.beginPath(); g.arc(5 * s, -4 * s, 5.8 * s, 0, TAU); g.fill();
          g.fillStyle = '#1E2A36'; g.beginPath(); g.arc(6.4 * s, -3.6 * s, 3.5 * s, 0, TAU); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(7.6 * s, -5.2 * s, 1.3 * s, 0, TAU); g.fill(); }
        g.fillStyle = litc('#FF9AA8', 0.6); g.beginPath(); g.ellipse(13 * s, 4 * s, 5 * s, 3 * s, 0, 0, TAU); g.fill();
        if (sq > 0.15){ g.fillStyle = litc('#3A4A5A'); g.beginPath(); g.ellipse(30.5 * s, 4 * s, 2.6 * s, 3.4 * s, 0, 0, TAU); g.fill(); }
        else { g.strokeStyle = litc('#2E6E72'); g.lineWidth = 1.8 * s; g.beginPath(); g.arc(22 * s, 3 * s, 7 * s, Math.PI * 0.15, Math.PI * 0.6); g.stroke(); }
        g.restore();
        g.restore();
        if (sq > 0.15 && t - swim.lastDrop > 0.03){              // the squirt: an arc of drops from her mouth
          swim.lastDrop = t; const a = -0.62 - sq * 0.3, mx = hx + Math.cos(a) * 32 * s, my = hy + Math.sin(a) * 32 * s + 10 * s;
          fx('drop', mx, my, { vx: Math.cos(a) * rnd(210, 290) * s, vy: Math.sin(a) * rnd(210, 290) * s, g: 520, life: rnd(0.7, 1), c: '#D6F2FF', s: rnd(0.8, 1.3) });
        }
        g.strokeStyle = 'rgba(255,255,255,' + (0.5 * u) + ')'; g.lineWidth = 2;
        for (const bxx of [bx + 4 * s, bx - 60 * s]){ g.beginPath(); g.ellipse(bxx, by + 2, (30 + 3 * Math.sin(t * 2)) * s, 7 * s, 0, 0, TAU); g.stroke(); }
      }
      function drawLakeLife(g, t){
        const P = LAKE, sp = sunPos(tod), mp = moonPos(tod);
        if (sp.up && L.sunA > 0.2) glow(g, 'warm', clamp(sp.x, P.x - P.rx * 0.6, P.x + P.rx * 0.6), P.y, P.ry * 1.5, 0.3 * L.sunA);
        else if (mp.up) glow(g, 'blue', clamp(mp.x, P.x - P.rx * 0.6, P.x + P.rx * 0.6), P.y, P.ry * 1.4, 0.4 * L.moon);
        if (L.lava > 0.6) glow(g, 'fire', P.x + P.rx * 0.3, P.y - P.ry * 0.3, P.ry * 1.6, 0.22 * L.lava);       // the fire on the water
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
        drawSwimmer(g, t);
      }

      // ── coconuts: a tapped palm drops one; it bounces, rolls a little, fades
      const COCOS = [];
      function dropCoconut(tr, t){
        if (COCOS.length >= 4) COCOS.shift();
        const p = palmTop(tr);
        COCOS.push({ x: p.x, y: p.y + 12 * tr.s, vx: rnd(-30, 30), vy: 0, gy: tr.y + 2, t0: t, rot: 0, r: 9 * tr.s, rest: 0 });
      }
      function drawCoconuts(g, t, dt){
        for (let i = COCOS.length - 1; i >= 0; i--){
          const c = COCOS[i];
          c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vx * dt / Math.max(4, c.r);
          if (c.y > c.gy){ c.y = c.gy; if (Math.abs(c.vy) > 90){ c.vy = -c.vy * 0.45; burst('dust', c.x, c.gy, 2, 26, { arc: [-2.6, -0.5], g: -8, life: 0.7, c: '#D8C8A8' }); } else { c.vy = 0; c.vx *= 1 - 2.2 * dt; if (!c.rest) c.rest = t; } }
          const a = c.rest ? 1 - (t - c.rest - 2.5) / 0.8 : 1;
          if (a <= 0){ COCOS.splice(i, 1); continue; }
          g.globalAlpha = Math.min(1, a);
          g.fillStyle = T('#8A5A3C'); g.beginPath(); g.arc(c.x, c.y - c.r, c.r, 0, TAU); g.fill();
          g.fillStyle = TA('#D8A878', 0.6); g.beginPath(); g.arc(c.x + Math.cos(c.rot) * c.r * 0.35, c.y - c.r + Math.sin(c.rot) * c.r * 0.35, c.r * 0.32, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
      }

      // ── the air: dragonflies and drifting pollen by day, fireflies at night
      const AIR = []; { const r = makeRng(5); for (let i = 0; i < 26; i++) AIR.push({ u: r(), v: r(), ph: r() * TAU, f: 0.4 + r() * 0.9, b: 1 + r() * 2.2 }); }
      const DRAGON = []; { const r = makeRng(12); for (let i = 0; i < 4; i++) DRAGON.push({ u: r(), y: 640 + r() * 170, ph: r() * TAU, c: ['#4AC8D8', '#FF9A5A', '#B48CF0', '#7AD88A'][i] }); }
      function drawAir(g, t){
        const day = clamp01((L.daylight - 0.2) * 1.6), night = clamp01(1 - L.daylight * 2.4);
        if (day > 0.03){
          const n = narrow ? 8 : 14;
          for (let i = 0; i < n; i++){                         // pollen: soft motes rising on the warm air
            const f = AIR[i], y = 870 - ((f.v * 360 + t * (8 + f.f * 9)) % 360), x = f.u * DW + Math.sin(t * f.f + f.ph) * 30;
            glow(g, 'warm', x, y, 4 + f.b * 1.6, day * (0.3 + 0.3 * Math.sin(t * f.b + f.ph)));
          }
          const nd = narrow ? 2 : DRAGON.length;
          for (let i = 0; i < nd; i++){                         // dragonflies: hover, dart, hover
            const d = DRAGON[i], ph = t * 0.23 + d.ph, hop = Math.floor(ph), k = smooth(clamp01((ph - hop) * 3.2));
            const px = h => ((d.u + h * 0.377) % 1) * DW, py = h => d.y + Math.sin(h * 2.7 + d.ph) * 60;
            const x = lerp(px(hop), px(hop + 1), k) + Math.sin(t * 5 + d.ph) * 4, y = lerp(py(hop), py(hop + 1), k) + Math.cos(t * 4 + d.ph) * 3, dir = px(hop + 1) >= px(hop) ? 1 : -1;
            g.save(); g.translate(x, y); g.scale(dir, 1); g.globalAlpha = day;
            g.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * Math.abs(Math.sin(t * 40 + d.ph))) + ')';
            for (const w of [[-2, -0.5], [-2, 0.5], [3, -0.3], [3, 0.3]]){ g.save(); g.translate(w[0], 0); g.rotate(w[1] * (1 + 0.4 * Math.sin(t * 50))); g.beginPath(); g.ellipse(0, -9, 3, 10, 0, 0, TAU); g.fill(); g.restore(); }
            g.strokeStyle = d.c; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-13, 0); g.lineTo(7, 0); g.stroke();
            g.fillStyle = d.c; g.beginPath(); g.arc(9, 0, 3, 0, TAU); g.fill();
            g.restore(); g.globalAlpha = 1;
          }
        }
        if (night > 0.03){
          const n = narrow ? 12 : 22;
          for (let i = 0; i < n; i++){
            const f = AIR[i], x = f.u * DW + Math.sin(t * f.f * 0.5 + f.ph) * 70, y = 630 + f.v * 240 + Math.sin(t * f.f * 0.8 + f.ph * 2) * 30, a = night * Math.max(0, Math.sin(t * f.b + f.ph));
            glow(g, 'green', x, y, 13, a * 0.9); if (a > 0.1){ g.globalAlpha = a; g.fillStyle = '#FFFFE0'; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); g.globalAlpha = 1; }
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
        stepShow(t, dt);
        stepSwimmer(t, dt);
        stepCast(t, dt);
        const sh = shake + roarShake(t);                       // the ground bounces: an eruption, a meteor, the T-rex's roar

        const g = ctx;
        g.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        g.globalAlpha = 1; g.imageSmoothingEnabled = true;
        g.drawImage(skyL.cv, 0, 0, DW, HZ + 30);
        drawStars(g, t); drawShoot(g, t);
        const sp = sunPos(tod);
        if (sp.up) glow(g, 'fire', sp.x, Math.max(sp.y, HZ - 80), 600, 0.3 * L.warm * L.sunA);
        drawSun(g); drawMoon(g);
        drawClouds(g, dt);
        drawFlocks(g, t, dt);
        g.drawImage(farL.cv, 0, FAR_TOP + sh * 0.5, DW, farL.h);
        drawTepuiFall(g, t);
        drawVolcanoLive(g, t, dt);
        drawShow(g, t);
        drawSky(g, t);                                        // the pteranodon passes in front of the volcano, behind the palms
        drawFarHerd(g, t);
        if (sh){ g.save(); g.translate(0, sh); }
        g.drawImage(groundL.cv, 0, GROUND_TOP, DW, groundL.h);
        drawMist(g, t);
        drawLakeLife(g, t);
        drawCoconuts(g, t, dt);
        drawCast(g, t);
        if (sh) g.restore();
        g.drawImage(frontL.cv, 0, FRONT_TOP + sh * 0.5, DW, frontL.h);
        drawFronds(g, t);
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
        catch (e){ if (!errLogged){ errLogged = true; console.error('dinosaurs4 frame error', e); } }
        if (!warming) perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastGov > 1500){
          lastGov = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21, calm = perf.costEma <= 4.5 && perf.gapEma <= 19;
          if (heavy){ perf.halfRate = true; calmSince = 0; }
          else if (calm && perf.halfRate && !IS_TOUCH){ if (!calmSince) calmSince = ts; else if (ts - calmSince > 6000){ perf.halfRate = false; calmSince = 0; } }
          else calmSince = 0;
        }
      }

      // ── taps: a dinosaur does its trick and changes its coat · the volcano
      //    puts on its next show · the pteranodon squawks and lets its egg go ·
      //    an egg hatches · the swimmer comes up (or squirts) · a palm drops a
      //    coconut · the sun or the moon moves the day on · the sky sends flyers
      const TAPS = { cast: 0, hour: 0, volcano: 0, lake: 0, palm: 0, sky: 0 };
      const inVolcano = (x, y) => { if (y < VOL.rim - 20 * VOL.s || y > VOL.base - 6) return false; const k = (y - VOL.rim) / (VOL.base - VOL.rim), hw = lerp(VOL.rw * 1.1, VOL.bw * 0.82, k * k * 0.6 + k * 0.4); return Math.abs(x - VOL.x) < hw; };
      function onClick(e){
        if (stopped || !e.target || !e.target.closest || e.target.closest(UI_SEL)) return;
        const x = (e.clientX - OX) / S, y = (e.clientY - OY) / S, t = lastT;
        const a = hitCast(x, y);
        if (a){ TAPS.cast++; tapActor(a, t); return; }
        const sp = sunPos(tod), mp = moonPos(tod);
        if ((sp.up && L.sunA > 0.2 && Math.hypot(x - sp.x, y - sp.y) < L.sunR + 30) || (mp.up && L.moon > 0.3 && Math.hypot(x - mp.x, y - mp.y) < 76)){ TAPS.hour++; nextHour(t); return; }
        if (inLake(x, y)){ TAPS.lake++; ripple(x, y, t, true); surface(t); return; }
        for (let i = TREES.length - 1; i >= 0; i--){
          const tr = TREES[i]; if (tr.k !== 'palm') continue;
          const p = palmTop(tr);
          if (Math.hypot(x - p.x, (y - p.y) * 1.2) < 92 * tr.s || (Math.abs(x - (tr.x + 20 * tr.s * tr.f)) < 26 * tr.s && y > p.y && y < tr.y)){ TAPS.palm++; dropCoconut(tr, t); return; }
        }
        if (inVolcano(x, y)){ TAPS.volcano++; startShow(t); return; }
        if (y < HZ - 90){ TAPS.sky++; if (L.stars > 0.5) startShoot(t, x, y); else if (FLOCKS.length < 4) spawnFlock(t, undefined, clamp(y, 60, 380)); }
      }

      // ── hooks for the harness and the tests
      const XY = (x, y) => ({ x: OX + x * S, y: OY + y * S });
      const RUMI_OPT = { height: '17%', bottom: '3.4%', duration: 17000, zIndex: 7, gapMin: 120000, gapMax: 240000 };
      const hook = Object.assign({
        ready: () => rigsReady,
        tod: () => tod,
        setTod(v){ tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed(v){ todSpeed = v; },
        phase: () => L.name,
        look: () => L,
        time: () => lastT,
        taps: () => Object.assign({}, TAPS),
        erupt(){ return startShow(lastT, 'erupt'); },
        storm(){ return startShow(lastT, 'storm'); },
        show: () => show ? { type: show.type, t: lastT - show.t0, boomed: show.boomed, bombs: show.bombs.length, meteors: show.meteors.length } : null,
        shows: () => shows, nextShow: () => nextShow, busy: () => showBusy(), shake: () => shake,
        surface(){ return surface(lastT); },
        swimmer: () => ({ state: swim.state, up: swim.up, squirts: swim.squirts }),
        coconuts: () => COCOS.length, ripples: () => RIPPLES.length, flocks: () => FLOCKS.length, smoke: () => SMOKE.length, fxCount: () => FX.length,
        shooting: () => !!shoot,
        sunXY: () => { const p = sunPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.sunA > 0.2 }); },
        moonXY: () => { const p = moonPos(tod); return Object.assign(XY(p.x, p.y), { up: p.up && L.moon > 0.3 }); },
        volcanoXY: () => XY(VOL.x + VOL.bw * 0.2, lerp(VOL.rim, VOL.base, 0.45)),
        lakeXY: () => XY(LAKE.x - LAKE.rx * 0.45, LAKE.y + LAKE.ry * 0.3),
        palmXY: i => { const P = TREES.filter(tr => tr.k === 'palm'), p = palmTop(P[i || 0]); return XY(p.x, p.y - 30 * P[i || 0].s); },
        skyXY: () => XY(DW * 0.5, 70),
        layout: () => ({ DW, narrow, HS, S, OX, OY, volcano: Object.assign({}, VOL), lake: Object.assign({}, LAKE), tepui: Object.assign({}, TEPUI),
                         trees: TREES.length, palms: TREES.filter(tr => tr.k === 'palm').length, fronds: FRONDS.length }),
        perf: () => ({ dpr: DPR, DW, S, halfRate: perf.halfRate, gapEma: perf.gapEma, costEma: perf.costEma, frames: perf.frames, drawn: perf.drawn,
                       repaints: perf.repaints, cast: perf.cast, fx: perf.fx }),
        rumi(){                                               // force an immediate stroll (harness / tests)
          if (!window.ChibiWalker) return false;
          if (rumiPatrol){ try { rumiPatrol.stop(); } catch (e){} }
          rumiPatrol = window.ChibiWalker.patrol(rumiLayer, Object.assign({}, RUMI_OPT, { startDelay: 0 }));
          return true;
        },
        rumiLayer: () => rumiLayer,
      }, castHooks);
      window.BACKGROUNDS.dinosaurs4._test = hook;
      window._dino4 = hook;

      // ── "rumi" strolls the valley every few minutes (an overlay above the canvas)
      const rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      let rumiPatrol = null;
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, Object.assign({}, RUMI_OPT, { startDelay: 45000 + Math.random() * 90000 }));   // first after ~45 s – 2¼ min
      });

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);
      loadRigs(() => { if (stopped) return; rigsReady = !!window.SavKit; recast(); });

      return function cleanup(){
        stopped = true;
        cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (rumiPatrol){ try { rumiPatrol.stop(); } catch (e){} }
        if (window._dino4 === hook) delete window._dino4;
        if (window.BACKGROUNDS.dinosaurs4._test === hook) delete window.BACKGROUNDS.dinosaurs4._test;
        stage.innerHTML = '';
      };
    },
  };
})();
