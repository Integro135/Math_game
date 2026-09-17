/* ── Maldives v2 — a tropical island shore built from zero ───────────────────
   window.BACKGROUNDS.maldives2 = { skin:'maldives', aids:'maldives', init({stage}) → cleanup }

   A white-sand beach on a Maldivian atoll, seen from the shade of the palms
   looking out over the lagoon. NOTHING is shared with the older
   maldives.bg.js (DOM/SVG), which stays in the folder, unloaded. No boats,
   no birds, no fish: the sky, the sea, the sand, the palms, the hour, the
   weather — and the POKEMON WALKERS (see the end of this header).

   THE PICTURE, back to front (design space 1600×900, waterline HZ = 470,
   cover-fitted and bottom-anchored; `S` maps design → screen):
   · the SKY — a full-day gradient, the sun and the moon on real arcs (both
     left → right; the moon rises on the left as the sun sets on the right), a
     field of stars after dark, cumulus with flat bases and lit tops drifting
     on the trade wind, cirrus high up
   · the ATOLL — a chain of low palm islands on the horizon in blue haze,
     the reef line where the ocean breaks white on the drop-off
   · the LAGOON — deep ocean blue at the horizon stepping down through the
     reef colours to gin-clear turquoise over the sand flats, the sky
     mirrored along the horizon, soft coral heads under the shallows; the
     sun's (or the moon's) glitter path — a soft fan of dancing glints —
     ripples, and the ROLLING SHORE WASH: three sets of low waves run up the
     beach, each breaking into a foam edge that slides over the wet sand and
     drains back, leaving the sand darker where it just was
   · the BEACH — white coral sand sweeping in from both sides with a soft
     bay in the middle (the game card sits centre, so the middle is kept
     calm), wet sand shining where the wash reaches, dry ripples, shells,
     and the spiky shadows of the palm crowns lying across it, swinging
     with the hour
   · the PALMS — coconut palms leaning out over the water from BOTH sides:
     curved ringed trunks, crowns of long fronds, each frond a dense blade
     of overlapping leaflets on an arching rachis that bends under its own
     weight (upright fronds curl over, side fronds droop, a couple of dead
     brown ones hang down), coconuts under the crown boss; a live wind:
     every frond rides the gust with its own lag and the whole crown leans
     in the storm

   THE HOUR (`lookAt(tod)`, DAY_SEC = 300): seven keyed looks — DAWN (violet
   to peach, the sun rising over the left horizon), MORNING (clear and
   bright), NOON (hard white light, the lagoon at its most turquoise),
   GOLDEN HOUR (long warm light from the right), SUNSET (flame sky, the
   sun melting into the sea right of centre, a gold path on the water), DUSK
   (blue hour, the first stars, the moon rising), NIGHT (indigo, moon path
   on the water, stars, the beach silver). Every colour in the picture is
   interpolated between the keys; the still layers repaint as the palette
   drifts (24 steps per transition). Click the sun or the moon → the clock
   tweens to the next key.

   THE WEATHER (`STORM`): every 2–4 minutes a squall comes through — a bank
   of dark cumulonimbus rolls in from one side of the ocean, the light
   drops, the wind picks up (the palms bend hard, fronds streaming), RAIN
   falls in slanted streaks with splashes pocking the lagoon and the wet
   sand, forked LIGHTNING drops out of the cloud base over the sea with a
   sky flash and its light on the water, then it passes, the sky opens and
   a RAINBOW stands over the lagoon opposite the sun while the last drops
   fall. Storms are rarer at night; `_mv2.storm()` forces one.

   THE POKEMON WALKERS (`WALKERS`, `PROFILE`, `updateWalkers`). The DOM rigs
   in backgrounds/pokemons/*.js (window.Pokemons: eevee, pikachu, bulbasaur,
   squirtle, jigglypuff + the flying gooey ghost) are injected on demand and
   placed in an ACTORS layer between two canvases — the world (sky, sea,
   sand, wash) behind them, the palms + rain + tone in front — so they walk
   the dry sand in front of the water and behind the trunks. One ground
   walker at a time (a shuffled round-robin so every one appears), the
   flyer on its own rarer schedule. Their MOVEMENT is driven per frame from
   the scene loop (a compositor-only transform on the rig's wrapper; the
   rig's own flip / acts live on inner layers), each to its own profile:
   · PIKACHU scampers, quick cadence, a joyful skip-hop now and then, stops
     to look around · EEVEE trots with a springy bounce, sniffs, sometimes
     turns back for a few steps before carrying on · BULBASAUR plods, slow,
     the body rocking side to side with the legs, long pauses · SQUIRTLE
     waddles with a pronounced rock and the odd little hop · JIGGLYPUFF
     BOUNCES along in hops (moves only while airborne, a squash on every
     landing) and stops to dance · GOOEY floats over the lagoon on a slow
     bob, drifting up and down, hovering in place now and then.
   Leg gaits (pikachu, eevee) get their cadence from the speed (--pk-step);
   the rigs with always-on CSS gaits (bulbasaur, squirtle) have theirs
   paused while standing (mv2-idle). When a storm comes the ground walkers
   HURRY off (×1.6, no pauses) and no new one comes out until it passes;
   the ghost keeps floating. Clicking a pokemon fires its own signature
   move (the rig's document-level hit-test).

   PERF (house rules, see reef2 / dubai3 / aurora): backing store capped at
   1.5× and ~2.4 MP; the sky, the far world, the sea and the beach are
   prebaked layers repainted only when the look changes; every palm frond
   is a baked sprite (rebaked only when the frond colour actually changes)
   drawn by TRANSLATION + a small rotation about the crown (never sheared);
   the wash, glitter, rain and lightning are the only per-frame vector
   work; the walkers cost one transform write per frame each; the rAF loop
   drops to every 2nd display frame while frames run long.
   Hooks: window._mv2 = BACKGROUNDS.maldives2._test.  */
(function(){
  'use strict';
  const doc = document, TAU = Math.PI * 2;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  const BASE = (function(){ const s = doc.currentScript; return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();

  // ── the pokemon rigs: injected on demand from backgrounds/pokemons/ (the
  //    game's index.html does not ship them; the harness needs nothing extra) ──
  const GROUND = ['eevee', 'pikachu', 'bulbasaur', 'squirtle', 'jigglypuff'], FLYER = 'gooey';
  function needPokemon(name, cb){
    if (window.Pokemons && window.Pokemons[name] && window.Pokemons[name].place){ cb(); return; }
    const sel = 'script[data-mvpk="' + name + '"]', ex = doc.querySelector(sel);
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const sc = doc.createElement('script');
    sc.src = BASE + 'pokemons/' + name + '.js'; sc.setAttribute('data-mvpk', name);
    sc.onload = cb; sc.onerror = cb;                        // never block the scene on a missing rig
    doc.head.appendChild(sc);
  }
  function loadPokemons(cb){
    const names = GROUND.concat([FLYER]); let left = names.length;
    names.forEach(n => needPokemon(n, () => { if (--left === 0) cb(); }));
  }
  const havePokemon = name => !!(window.Pokemons && window.Pokemons[name] && window.Pokemons[name].place);
  // idle overrides for the rigs whose gait CSS never stops on its own
  function injectCSS(){
    if (doc.getElementById('maldives2-css')) return;
    const st = doc.createElement('style'); st.id = 'maldives2-css';
    st.textContent = [
      '.mv2-actors{position:absolute;inset:0;overflow:hidden;pointer-events:none}',
      '.pkw-bulb.mv2-idle .pkbulb .legs .leg,.pkw-bulb.mv2-idle .pkbulb .hind-legs .leg{animation-play-state:paused!important}',
      '.pkw-sq.mv2-idle .pksq,.pkw-sq.mv2-idle .pksq::after,.pkw-sq.mv2-idle .pksq .leg,.pkw-sq.mv2-idle .pksq .arm,',
      '.pkw-sq.mv2-idle .pksq .head,.pkw-sq.mv2-idle .pksq .tail{animation-play-state:paused!important}',
    ].join('\n');
    doc.head.appendChild(st);
  }

  // ── colour helpers ──
  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const mixc = (a, b, k) => { a = hexc(a); b = hexc(b); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
  const lit = (c, k) => { c = hexc(c); return k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k); };
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOUR — seven keyed looks around the day. tod 0..1; keys at `at`.
  // ══════════════════════════════════════════════════════════════════════════
  const DAY_SEC = 300;
  const KEYS = [
    { name: 'dawn', at: 0.04,
      sky: [[0, '#3b3a78'], [0.35, '#8a5f95'], [0.62, '#e39a8a'], [0.82, '#f7c9a0'], [1, '#fbe3c4']],
      horizonGlow: [255, 190, 140, 0.55],
      sun: '#ffd9a8', sunGlow: [255, 200, 150, 0.55], sunR: 46,
      seaFar: '#3d5f9a', seaMid: '#4e8fb2', seaReef: '#6fb8c4', seaShal: '#9ad9d2', seaShore: '#cdeee6',
      sand: '#f3e6cf', sandWet: '#d8c3a2', sandDeep: '#e4d2b4',
      island: '#4a6f74', islandFar: '#7d8fb0', haze: [230, 200, 200, 0.35],
      frond: '#3f7a4e', frondD: '#2b5a38', trunk: '#8a6a48', trunkD: '#5c4530',
      cloud: '#f8d9d4', cloudD: '#b98a9c', cloudA: 0.96,
      stars: 0.15, daylight: 0.62, ambient: [255, 205, 170, 0.10], shadow: 0.35, glitter: 0.4, moon: 0 },
    { name: 'morning', at: 0.16,
      sky: [[0, '#1f6fd0'], [0.3, '#3f92e0'], [0.55, '#7fc0ee'], [0.82, '#b9e3f6'], [1, '#e6f6fb']],
      horizonGlow: [255, 255, 255, 0.25],
      sun: '#fff8dc', sunGlow: [255, 250, 220, 0.5], sunR: 36,
      seaFar: '#1a4f9e', seaMid: '#1e86b8', seaReef: '#22b9c6', seaShal: '#5fe0d6', seaShore: '#b8f2ea',
      sand: '#fbf4e4', sandWet: '#dccba9', sandDeep: '#efe2c6',
      island: '#2f7a5c', islandFar: '#7fa7c4', haze: [220, 240, 250, 0.3],
      frond: '#3d9a55', frondD: '#256b39', trunk: '#a07c52', trunkD: '#6b4f34',
      cloud: '#ffffff', cloudD: '#b9cfe0', cloudA: 0.97,
      stars: 0, daylight: 0.95, ambient: [255, 255, 255, 0], shadow: 0.42, glitter: 0.55, moon: 0 },
    { name: 'noon', at: 0.34,
      sky: [[0, '#1461c8'], [0.3, '#2f88dc'], [0.55, '#6ab8ec'], [0.82, '#aadcf4'], [1, '#dff3fa']],
      horizonGlow: [255, 255, 255, 0.2],
      sun: '#fffdf0', sunGlow: [255, 255, 240, 0.5], sunR: 32,
      seaFar: '#14479a', seaMid: '#177fb8', seaReef: '#12b7c8', seaShal: '#4fe3d8', seaShore: '#b3f4ec',
      sand: '#fffaf0', sandWet: '#dfceac', sandDeep: '#f3e8cf',
      island: '#2c7f5b', islandFar: '#86adc8', haze: [225, 240, 250, 0.25],
      frond: '#3fa458', frondD: '#25703b', trunk: '#a8845a', trunkD: '#705338',
      cloud: '#ffffff', cloudD: '#b4cbdd', cloudA: 0.97,
      stars: 0, daylight: 1, ambient: [255, 255, 255, 0], shadow: 0.38, glitter: 0.7, moon: 0 },
    { name: 'golden', at: 0.56,
      sky: [[0, '#2f5fb0'], [0.25, '#4f80c4'], [0.5, '#8fb0dc'], [0.76, '#f0c48c'], [1, '#ffd9a0']],
      horizonGlow: [255, 200, 120, 0.45],
      sun: '#ffe2a0', sunGlow: [255, 200, 120, 0.6], sunR: 42,
      seaFar: '#2a4f8e', seaMid: '#2f7fa8', seaReef: '#3fb0b8', seaShal: '#7fd6cc', seaShore: '#d0eede',
      sand: '#fbead0', sandWet: '#d8bd95', sandDeep: '#eed6b2',
      island: '#3f6d55', islandFar: '#8f97b4', haze: [255, 210, 160, 0.35],
      frond: '#4c8d4e', frondD: '#2f5f35', trunk: '#a67a4c', trunkD: '#6b4a2e',
      cloud: '#ffe6c8', cloudD: '#c88a78', cloudA: 0.96,
      stars: 0, daylight: 0.82, ambient: [255, 190, 120, 0.10], shadow: 0.45, glitter: 0.9, moon: 0 },
    { name: 'sunset', at: 0.70,
      sky: [[0, '#2a1e5c'], [0.3, '#7a3c7a'], [0.58, '#e05a48'], [0.8, '#ff9a4a'], [1, '#ffd27c']],
      horizonGlow: [255, 150, 70, 0.75],
      sun: '#ff9a3c', sunGlow: [255, 140, 60, 0.75], sunR: 52,
      seaFar: '#2c3a72', seaMid: '#4a5c8e', seaReef: '#6f7fa0', seaShal: '#b4a8a8', seaShore: '#e8c8b0',
      sand: '#f2d8bc', sandWet: '#c9a684', sandDeep: '#e2c19f',
      island: '#2e3450', islandFar: '#6e5a7c', haze: [255, 150, 90, 0.35],
      frond: '#3a4a3c', frondD: '#232e26', trunk: '#5a3f2c', trunkD: '#38261a',
      cloud: '#ffb08a', cloudD: '#8a3a52', cloudA: 0.96,
      stars: 0.05, daylight: 0.6, ambient: [255, 120, 60, 0.14], shadow: 0.3, glitter: 1, moon: 0.2 },
    { name: 'dusk', at: 0.80,
      sky: [[0, '#0d1240'], [0.4, '#252a6e'], [0.72, '#5b4a8a'], [0.9, '#a06a7a'], [1, '#c98a78']],
      horizonGlow: [230, 130, 110, 0.4],
      sun: '#ff8a4a', sunGlow: [255, 120, 80, 0.3], sunR: 50,
      seaFar: '#13214a', seaMid: '#1f2f5e', seaReef: '#2e4470', seaShal: '#4e5f86', seaShore: '#8e8fa8',
      sand: '#bfb4b8', sandWet: '#8f8690', sandDeep: '#aa9fa6',
      island: '#141a30', islandFar: '#2e3358', haze: [120, 90, 130, 0.3],
      frond: '#1d2a26', frondD: '#101a16', trunk: '#3a2c26', trunkD: '#22181a',
      cloud: '#6a5a8a', cloudD: '#2c2340', cloudA: 0.94,
      stars: 0.6, daylight: 0.32, ambient: [60, 50, 120, 0.18], shadow: 0.12, glitter: 0.3, moon: 0.8 },
    { name: 'night', at: 0.91,
      sky: [[0, '#040718'], [0.3, '#080d2a'], [0.55, '#0e1640'], [0.82, '#182450'], [1, '#243360']],
      horizonGlow: [90, 120, 200, 0.25],
      sun: '#ffffff', sunGlow: [200, 210, 255, 0], sunR: 40,
      seaFar: '#0a1636', seaMid: '#10224a', seaReef: '#183260', seaShal: '#254774', seaShore: '#4a6a90',
      sand: '#8f97ac', sandWet: '#5e6680', sandDeep: '#7a8399',
      island: '#0a0f22', islandFar: '#1a2244', haze: [40, 60, 120, 0.25],
      frond: '#0f1a1c', frondD: '#070f10', trunk: '#241c1e', trunkD: '#140e10',
      cloud: '#3a4468', cloudD: '#161b30', cloudA: 0.9,
      stars: 1, daylight: 0.16, ambient: [30, 50, 120, 0.28], shadow: 0.08, glitter: 0.25, moon: 1 },
  ];
  // interpolate between the two keys around tod (wrapping through midnight)
  function lookAt(tod){
    tod = ((tod % 1) + 1) % 1;
    let i = KEYS.length - 1;
    for (let k = 0; k < KEYS.length; k++) if (KEYS[k].at <= tod) i = k;
    const A = KEYS[i], B = KEYS[(i + 1) % KEYS.length];
    let span = B.at - A.at; if (span <= 0) span += 1;
    let d = tod - A.at; if (d < 0) d += 1;
    const w = smooth(d / span);
    if (w <= 0.001) return blend(A, A, 0);
    return blend(A, B, w);
  }
  function blend(A, B, w){
    const out = {};
    for (const k in A){
      const va = A[k], vb = B[k];
      if (k === 'name') continue;
      if (typeof va === 'number') out[k] = lerp(va, vb, w);
      else if (typeof va === 'string') out[k] = w === 0 ? hexc(va) : mixc(va, vb, w);
      else if (Array.isArray(va) && typeof va[0] === 'number') out[k] = va.map((v, i) => lerp(v, vb[i], w));
      else if (Array.isArray(va)) out[k] = va.map((st, i) => [lerp(st[0], vb[i][0], w), w === 0 ? hexc(st[1]) : mixc(st[1], vb[i][1], w)]);
      else out[k] = va;
    }
    out.name = w < 0.5 ? A.name : B.name;
    return out;
  }
  // the storm pulls every colour toward its own grey-green gloom (k = STORM.k)
  function stormify(L0, k){
    if (k < 0.01) return L0;
    const o = Object.assign({}, L0);
    const g = (c, to, f) => mixc(c, to, f * k);
    o.sand = g(L0.sand, '#8f949c', 0.42); o.sandWet = g(L0.sandWet, '#5f656e', 0.42); o.sandDeep = g(L0.sandDeep, '#7d838c', 0.42);
    o.seaFar = g(L0.seaFar, '#2a3a4a', 0.5); o.seaMid = g(L0.seaMid, '#3a4e5e', 0.5); o.seaReef = g(L0.seaReef, '#4e6a74', 0.5);
    o.seaShal = g(L0.seaShal, '#6f8e94', 0.5); o.seaShore = g(L0.seaShore, '#a9bcbc', 0.45);
    o.frond = g(L0.frond, '#1f3a2c', 0.55); o.frondD = g(L0.frondD, '#12241a', 0.55);
    o.trunk = g(L0.trunk, '#4a4038', 0.5); o.trunkD = g(L0.trunkD, '#2a2420', 0.5);
    o.island = g(L0.island, '#2a3a44', 0.5); o.islandFar = g(L0.islandFar, '#55606e', 0.5);
    o.cloud = g(L0.cloud, '#5a6478', 0.8); o.cloudD = g(L0.cloudD, '#2a3142', 0.85);
    o.daylight = L0.daylight * (1 - 0.4 * k); o.shadow = L0.shadow * (1 - 0.85 * k);
    o.glitter = L0.glitter * (1 - 0.9 * k); o.stars = L0.stars * (1 - k);
    o.horizonGlow = [L0.horizonGlow[0], L0.horizonGlow[1], L0.horizonGlow[2], L0.horizonGlow[3] * (1 - 0.7 * k)];
    o.ambient = [lerp(L0.ambient[0], 40, k), lerp(L0.ambient[1], 50, k), lerp(L0.ambient[2], 72, k), L0.ambient[3] * (1 - k) + 0.16 * k];
    return o;
  }
  // the sun: rises at tod 0.0 (left), noon at 0.36, sets at 0.72 (right of centre)
  const sunP = tod => tod / 0.72;
  // the moon: rises on the LEFT at 0.72 (as the sun sets on the right), high at 0.94, sets right at 1.16
  const moonP = tod => (((tod < 0.5 ? tod + 1 : tod) - 0.72) / 0.44);

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.maldives2 = {
    skin: 'maldives',
    aids: 'maldives',
    preload(){ loadPokemons(function(){}); },
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      injectCSS();
      const canvas = doc.createElement('canvas');                     // the WORLD: sky, sea, sand, wash
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const actors = doc.createElement('div'); actors.className = 'mv2-actors';   // the pokemon walkers
      stage.appendChild(actors);
      const canvasF = doc.createElement('canvas');                    // the FRONT: palms, rain, tone
      canvasF.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
      stage.appendChild(canvasF);
      const ctxF = canvasF.getContext('2d');
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov,#settings-ov,#parent-ov';

      // ── the stage ──
      // RESPONSIVE (2026-09): the design height is fixed, the design WIDTH follows
      // the screen's aspect so the sides are never cropped — 1600 on 16:9, ~1200
      // on a landscape tablet, ~675 portrait tablet, ~415 phone. The palms and
      // the far islands keep their 1600-space x in the code and are placed by
      // AX(): left things hold to the left edge, right things to the right edge,
      // the middle compresses; on a narrow screen the two medium palms are left
      // out and the big ones shrink a little so the crowns don't swallow the view.
      const DW0 = 1600, DH = 900, HZ = 470;                         // reference design space, waterline
      let DW = DW0, AXK = 1;
      const AX = x => x < 620 ? x * AXK : x >= 1100 ? DW - (DW0 - x) * AXK : DW / 2 + (x - 800) * AXK;
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      const PROF = { frames: 0, repaints: 0, crowns: 0 }; let profT = 0;
      const PMAX = {};
      const mark = k => { const n = performance.now(); const d = n - profT; PROF[k] = (PROF[k] || 0) + d; if (d > (PMAX[k] || 0)) PMAX[k] = d; profT = n; };

      // ── the clock ──
      let tod = 0.10, todSpeed = 1, todTween = null;                // boot: a bright early morning
      let L = lookAt(tod), lookKey = -1;           // re-derived (and storm-dimmed) in repaintIfNeeded

      // ── sprites + layers ──
      const SPR = {};
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = { white: '255,255,255', warm: '255,236,200', sun: '255,220,150', blue: '170,200,255', shade: '0,10,30', gold: '255,200,110' }[name] || '255,255,255';
        const soft = name === 'shade' ? 0.45 : 0.3;
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [soft, 'rgba(' + col + ',0.4)'], [1, 'rgba(' + col + ',0)']]);
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
      const toDesign = (lay, g) => g.setTransform(lay.dpr * S, 0, 0, lay.dpr * S, lay.dpr * OX, lay.dpr * OY);

      // ══════════════════════════════════════════════════════════════════════
      // THE WEATHER
      // ══════════════════════════════════════════════════════════════════════
      const STORM = { k: 0, target: 0, phase: 'clear', t0: 0, dur: 0, nextAt: rnd(120, 240), wind: 0, rain: 0, flash: 0, bolts: [], nextBolt: 0, rainbow: 0, front: 0, dir: 1, drift: 0 };
      const DROPS = [], SPLASH = [];
      let stormCount = 0;
      function startStorm(now, len){
        if (STORM.phase !== 'clear') return;
        STORM.phase = 'build'; STORM.t0 = now; STORM.dur = len || rnd(34, 55); STORM.dir = Math.random() < 0.5 ? -1 : 1;
        STORM.nextBolt = now + rnd(4, 7); STORM.front = 0; STORM.drift = 0; stormCount++;
      }
      function updateStorm(t, dt){
        const P = STORM;
        if (P.phase === 'clear'){
          if (t > P.nextAt){
            if (L.daylight < 0.4 && Math.random() < 0.6) P.nextAt = t + rnd(60, 120);   // rarer at night
            else startStorm(t);
          }
        } else {
          const e = t - P.t0;
          if (P.phase === 'build'){ P.target = 1; if (e > 9) P.phase = 'peak'; }
          else if (P.phase === 'peak'){ if (e > P.dur - 14) P.phase = 'fade'; }
          else if (P.phase === 'fade'){ P.target = 0; if (e > P.dur){ P.phase = 'clear'; P.front = 0; P.nextAt = t + rnd(120, 240); P.bolts.length = 0; } }
          if (P.phase !== 'fade') P.front = Math.min(1, P.front + dt / 9);
          else P.front = Math.max(0, P.front - dt / 12);
          P.drift += dt * (6 + P.wind * 26);
        }
        P.k += (P.target - P.k) * Math.min(1, dt * 0.35);
        const rainT = P.phase === 'peak' || (P.phase === 'build' && (t - P.t0) > 4) ? 1 : (P.phase === 'fade' && (t - P.t0) < P.dur - 5 ? 0.5 : 0);
        P.rain += (rainT - P.rain) * Math.min(1, dt * 0.5);
        const windT = P.phase === 'clear' ? 0 : (P.phase === 'fade' ? 0.35 : 1);
        P.wind += (windT - P.wind) * Math.min(1, dt * 0.3);
        const rbT = (P.phase === 'fade' && P.rain < 0.6 && L.daylight > 0.45 && P.k < 0.8) ? 1 : 0;
        P.rainbow += (rbT - P.rainbow) * Math.min(1, dt * (rbT ? 0.25 : 0.4));
        P.flash *= Math.exp(-dt * 9);
        if (P.k > 0.55 && P.phase !== 'fade' && t > P.nextBolt){
          strike(t);
          P.nextBolt = t + rnd(2.5, 7.5) * (1.4 - P.k * 0.4);
        }
        for (let i = P.bolts.length - 1; i >= 0; i--) if (t - P.bolts[i].t0 > 0.7) P.bolts.splice(i, 1);
        // rain
        const want = Math.round(P.rain * P.k * (IS_TOUCH ? 240 : 420));
        while (DROPS.length < want) DROPS.push({ x: rnd(-200, DW + 200), y: rnd(-100, DH), l: rnd(16, 36), v: rnd(900, 1300) });
        if (DROPS.length > want) DROPS.length = want;
        const slant = 170 * P.wind * P.dir;
        for (const d of DROPS){
          d.y += d.v * dt; d.x += slant * dt;
          if (d.y > DH + 20 || d.x < -260 || d.x > DW + 260){
            if (d.y > DH + 20 && SPLASH.length < 140 && Math.random() < 0.35){
              const sx = d.x, sy = rnd(HZ + 6, DH - 10);
              SPLASH.push({ x: sx, y: sy, t0: t, r: rnd(4, 9), sea: sy < shoreYAt(sx) });
            }
            d.y = rnd(-120, -20); d.x = rnd(-200, DW + 200);
          }
        }
        for (let i = SPLASH.length - 1; i >= 0; i--) if (t - SPLASH[i].t0 > 0.5) SPLASH.splice(i, 1);
      }
      // ── lightning: midpoint-displacement bolts dropping out of the cloud base ──
      function genBolt(x1, y1, x2, y2, disp, out){
        if (disp < 6){ out.push(x1, y1, x2, y2); return; }
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp * 0.5;
        genBolt(x1, y1, mx, my, disp * 0.55, out);
        genBolt(mx, my, x2, y2, disp * 0.55, out);
      }
      function strike(t){
        const P = STORM;
        const big = Math.random() < 0.45;
        const tx = rnd(160, DW - 160), ty = HZ + rnd(-6, 4);
        const sx = tx + rnd(-0.1, 0.1) * DW, sy = rnd(150, 240);
        const segs = []; genBolt(sx, sy, tx, ty, 130, segs);
        const branches = [];
        const nb = big ? 3 : 1;
        for (let b = 0; b < nb; b++){
          const mi = Math.floor(rnd(0.2, 0.7) * (segs.length / 4)) * 4;
          const bs = []; genBolt(segs[mi], segs[mi + 1], segs[mi] + (Math.random() < 0.5 ? -1 : 1) * rnd(60, 150), segs[mi + 1] + rnd(80, 170), 55, bs);
          branches.push(bs);
        }
        P.bolts.push({ t0: t, segs, branches, tx, ty, sx, sy, big, hidden: !big && Math.random() < 0.35 });
        P.flash = Math.max(P.flash, big ? 1 : 0.55);
      }
      function drawBolts(g, t){
        for (const B of STORM.bolts){
          const te = t - B.t0;
          if (te > 0.55) continue;
          const flick = 0.72 + 0.28 * Math.sin(te * 95 + B.tx);
          const a = Math.pow(1 - te / 0.55, 1.6) * flick;
          glow(g, 'blue', B.sx, B.sy, 380, a * 0.4);                 // the cloud lit from inside
          glow(g, 'blue', B.tx, B.ty, 240, a * 0.3);
          if (B.hidden) continue;                                   // sheet lightning: only the glow
          g.lineCap = 'round'; g.lineJoin = 'round';
          const paths = [B.segs].concat(B.branches);
          for (let p = 0; p < paths.length; p++){
            const segs = paths[p], k = p === 0 ? 1 : 0.55;
            g.strokeStyle = 'rgba(150,190,255,' + (0.35 * a * k) + ')'; g.lineWidth = p === 0 ? 11 : 6;
            g.beginPath(); for (let i = 0; i < segs.length; i += 4){ g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); } g.stroke();
            g.strokeStyle = 'rgba(245,248,255,' + (0.95 * a * k) + ')'; g.lineWidth = p === 0 ? 2.6 : 1.4;
            g.beginPath(); for (let i = 0; i < segs.length; i += 4){ g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); } g.stroke();
          }
          // the strike's light on the water below it
          g.fillStyle = lg(g, 0, B.ty, 0, B.ty + 260, [[0, 'rgba(200,220,255,' + (0.5 * a) + ')'], [1, 'rgba(200,220,255,0)']]);
          g.beginPath(); g.moveTo(B.tx - 40, B.ty); g.lineTo(B.tx + 40, B.ty); g.lineTo(B.tx + 220, B.ty + 260); g.lineTo(B.tx - 220, B.ty + 260); g.closePath(); g.fill();
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE WIND — one shared gust every swaying thing leans to
      // ══════════════════════════════════════════════════════════════════════
      function wind(t){
        const base = Math.sin(t * 0.37) * 0.5 + Math.sin(t * 0.91 + 1.7) * 0.3 + Math.sin(t * 2.3 + 0.4) * 0.2;
        return base * (0.35 + STORM.wind * 0.65) + STORM.wind * 0.9 * STORM.dir * (0.8 + 0.2 * Math.sin(t * 1.3));
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SHORE — where the sand meets the water (design y at design x)
      // ══════════════════════════════════════════════════════════════════════
      function shoreYAt(x){
        const u = x / DW;
        return 700 + 70 * Math.cos((u - 0.5) * Math.PI) - 22 * Math.sin(u * 7.3) - 12 * Math.sin(u * 13.1 + 1);
      }
      const SHORE = []; for (let x = -40; x <= DW + 40; x += 20) SHORE.push([x, shoreYAt(x)]);
      function shorePath(g, dy, close){
        g.beginPath(); g.moveTo(SHORE[0][0], SHORE[0][1] + dy);
        for (let i = 1; i < SHORE.length; i++){
          const p = SHORE[i - 1], q = SHORE[i];
          g.quadraticCurveTo(p[0], p[1] + dy, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + dy);
        }
        g.lineTo(SHORE[SHORE.length - 1][0], SHORE[SHORE.length - 1][1] + dy);
        if (close){ g.lineTo(DW + 60, DH + 60); g.lineTo(-60, DH + 60); g.closePath(); }
      }
      // fill the band of beach between the shore shifted by dyTop (toward the water) and dyBottom (down the beach)
      function fillShoreBand(g, dyTop, dyBottom){
        shorePath(g, dyTop, false); g.lineTo(DW + 60, DH + 60); g.lineTo(-60, DH + 60); g.closePath();
        g.save(); g.clip();
        shorePath(g, dyBottom, false); g.lineTo(DW + 60, -100); g.lineTo(-60, -100); g.closePath(); g.fill();
        g.restore();
      }

      // ══════════════════════════════════════════════════════════════════════
      // SKY + FAR WORLD (skyL) — repainted per look
      // ══════════════════════════════════════════════════════════════════════
      const R1 = makeRng(7);
      const STARS = []; for (let i = 0; i < 160; i++) STARS.push({ x: R1() * DW, y: Math.pow(R1(), 1.6) * (HZ - 40), r: 0.6 + R1() * 1.5, ph: R1() * TAU, sp: 1 + R1() * 2.5 });
      const CLOUDS = [];
      for (let i = 0; i < 5; i++) CLOUDS.push({ x: (i + 0.5) / 5 * DW + (R1() - 0.5) * 200, y: 200 + R1() * 130, s: 0.5 + R1() * 0.5, v: 5 + R1() * 6, seed: i * 17 + 3, puffs: null });
      const SCLOUDS = [];                                              // the storm's bank, off-screen until it rolls in
      for (let i = 0; i < 5; i++) SCLOUDS.push({ u: (i + 0.5) / 5 + (R1() - 0.5) * 0.08, y: 140 + R1() * 110, s: 1.6 + R1() * 0.7, seed: 101 + i, puffs: null });
      const CIRRUS = []; for (let i = 0; i < 4; i++) CIRRUS.push({ x: R1() * DW, y: 40 + R1() * 120, w: 260 + R1() * 300, v: 10 + R1() * 6 });
      // the atoll islands on the horizon: x, width, height, haze 0..1 (far), palms [offset, height]
      const ISLANDS = [
        { x: 190, x0: 190, w: 280, h: 15, far: 0.5, palms: [[-0.3, 34], [-0.12, 44], [0.08, 40], [0.28, 30]] },
        { x: 560, x0: 560, w: 130, h: 7, far: 0.8, palms: [[0, 18]] },
        { x: 1080, x0: 1080, w: 190, h: 10, far: 0.7, palms: [[-0.2, 24], [0.1, 28]] },
        { x: 1430, x0: 1430, w: 360, h: 18, far: 0.35, palms: [[-0.35, 38], [-0.2, 50], [-0.02, 46], [0.15, 56], [0.32, 36]] },
      ];
      function sunPos(tod){
        const p = sunP(tod);                                          // 0 rise … 1 set
        const x = lerp(0.30, 0.725, p) * DW, y = HZ - Math.sin(clamp01(p) * Math.PI) * 400 + 14;
        return { x, y, up: p > -0.02 && p < 1.02 };
      }
      function moonPos(tod){
        const p = moonP(tod);
        const x = lerp(0.28, 0.72, p) * DW, y = HZ - Math.sin(clamp01(p) * Math.PI) * 360 + 12;
        return { x, y, up: p > -0.02 && p < 1.02, p };
      }
      let skyL = null;
      function paintSky(g){
        g.fillStyle = lg(g, 0, 0, 0, HZ, L.sky.map(s => [s[0], rgb(s[1])]));
        g.fillRect(-100, -100, DW + 200, HZ + 100);
        if (STORM.k > 0.01){                                          // the overcast
          const k = STORM.k;
          g.fillStyle = lg(g, 0, 0, 0, HZ, [[0, 'rgba(40,48,66,' + (0.85 * k) + ')'], [0.6, 'rgba(70,80,100,' + (0.75 * k) + ')'], [1, 'rgba(120,130,150,' + (0.45 * k) + ')']]);
          g.fillRect(-100, -100, DW + 200, HZ + 100);
        }
        const hg = L.horizonGlow;
        g.fillStyle = lg(g, 0, HZ - 220, 0, HZ, [[0, rgb(hg, 0)], [1, rgb(hg, hg[3] * (1 - STORM.k * 0.7))]]);
        g.fillRect(-100, HZ - 220, DW + 200, 220);
        const sp = sunPos(tod);
        if (sp.up && L.daylight > 0.2){                               // the sun's bloom in the sky itself
          const sg = L.sunGlow;
          const near = clamp01(1 - (HZ - sp.y) / 300);
          g.fillStyle = rg(g, sp.x, sp.y, 0, 380 + near * 260, [[0, rgb(sg, sg[3] * 0.9 * (1 - STORM.k * 0.8))], [0.35, rgb(sg, sg[3] * 0.35 * (1 - STORM.k * 0.8))], [1, rgb(sg, 0)]]);
          g.fillRect(-100, -100, DW + 200, HZ + 100);
        }
        const mp = moonPos(tod);
        if (mp.up && L.moon > 0.05){
          g.fillStyle = rg(g, mp.x, mp.y, 0, 300, [[0, 'rgba(200,215,255,' + (0.22 * L.moon * (1 - STORM.k)) + ')'], [1, 'rgba(200,215,255,0)']]);
          g.fillRect(-100, -100, DW + 200, HZ + 100);
        }
        const hz = L.haze;
        g.fillStyle = lg(g, 0, HZ - 60, 0, HZ + 30, [[0, rgb(hz, 0)], [1, rgb(hz, hz[3])]]);
        g.fillRect(-100, HZ - 60, DW + 200, 90);
      }
      function paintIslands(g){
        for (const I of ISLANDS){
          const col = mixc(L.island, L.islandFar, I.far);
          const sandc = mixc(mixc(L.sand, L.islandFar, I.far * 0.8), L.sky[L.sky.length - 1][1], 0.2);
          const y = HZ + 1;
          g.fillStyle = rgb(col);
          g.beginPath(); g.moveTo(I.x - I.w / 2, y);
          const n = 11;
          for (let k = 0; k <= n; k++){
            const u = k / n, x = I.x - I.w / 2 + u * I.w;
            const h = I.h * (0.35 + 0.65 * Math.sin(u * Math.PI)) * (1 + 0.45 * Math.sin(u * 17 + I.x));
            g.lineTo(x, y - h);
          }
          g.lineTo(I.x + I.w / 2, y); g.closePath(); g.fill();
          for (const p of I.palms){                                   // palm silhouettes standing on it
            const px = I.x + p[0] * I.w, ph = p[1] * 0.6;
            g.strokeStyle = rgb(col); g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(px, y - 2); g.quadraticCurveTo(px + 3, y - ph * 0.6, px + 6, y - ph); g.stroke();
            g.lineWidth = 2.4;
            for (let f = 0; f < 7; f++){
              const a = -Math.PI * 0.98 + f * (Math.PI * 0.96 / 6);
              g.beginPath(); g.moveTo(px + 6, y - ph);
              g.quadraticCurveTo(px + 6 + Math.cos(a) * ph * 0.4, y - ph + Math.sin(a) * ph * 0.4 - 3, px + 6 + Math.cos(a) * ph * 0.66, y - ph + Math.sin(a) * ph * 0.66 + ph * 0.3);
              g.stroke();
            }
          }
          g.fillStyle = rgb(sandc, 0.9);                              // the thin sand strip
          g.fillRect(I.x - I.w / 2 - 4, y - 0.5, I.w + 8, 2.6);
        }
      }
      function paintSkyL(){ const g = skyL.cx; g.save(); toDesign(skyL, g); paintSky(g); paintIslands(g); g.restore(); }

      // ══════════════════════════════════════════════════════════════════════
      // THE LAGOON (seaL) — the colour bands from the drop-off to the sand
      // ══════════════════════════════════════════════════════════════════════
      let seaL = null;
      function paintSea(g){
        const dark = STORM.k;
        const far = L.seaFar, mid = L.seaMid, reef = L.seaReef, shal = L.seaShal, shore = L.seaShore;
        g.fillStyle = lg(g, 0, HZ, 0, 760, [[0, rgb(far)], [0.09, rgb(mid)], [0.22, rgb(mixc(mid, reef, 0.5))], [0.36, rgb(reef)], [0.6, rgb(shal)], [0.85, rgb(mixc(shal, shore, 0.6))], [1, rgb(shore)]]);
        g.fillRect(-100, HZ, DW + 200, DH - HZ + 100);
        // the sky mirrored along the horizon (this is what makes the sunset sea burn)
        const skyBot = L.sky[L.sky.length - 1][1];
        g.fillStyle = lg(g, 0, HZ, 0, HZ + 180, [[0, rgb(skyBot, 0.7 * (1 - dark * 0.5))], [0.35, rgb(skyBot, 0.28)], [1, rgb(skyBot, 0)]]);
        g.fillRect(-100, HZ, DW + 200, 180);
        // the islands' reflections
        for (const I of ISLANDS){ g.fillStyle = rgb(mixc(L.island, L.islandFar, I.far), 0.28); g.fillRect(I.x - I.w * 0.42, HZ + 1, I.w * 0.84, 3); }
        // the reef line: a paler streak where the ocean breaks on the drop-off
        const bk = 0.55 * L.daylight + 0.15;
        g.fillStyle = 'rgba(255,255,255,' + (0.28 * bk) + ')';
        g.beginPath();
        for (let x = -40; x <= DW + 40; x += 16){ const y = HZ + 78 + Math.sin(x * 0.011) * 9 + Math.sin(x * 0.037 + 2) * 4; if (x === -40) g.moveTo(x, y); else g.lineTo(x, y); }
        for (let x = DW + 40; x >= -40; x -= 16){ const y = HZ + 86 + Math.sin(x * 0.011) * 9 + Math.sin(x * 0.029 + 1) * 5; g.lineTo(x, y); }
        g.closePath(); g.fill();
        g.fillStyle = rgb(mixc(mid, reef, 0.3), 0.7);
        g.fillRect(-100, HZ + 62, DW + 200, 10);
        // coral heads under the shallows: soft, irregular, dim
        const R2 = makeRng(21);
        const pa = 0.075 * L.daylight + 0.02;
        const coral = mixc(reef, '#0b5a52', 0.55);
        for (let i = 0; i < 14; i++){
          const x = R2() * DW, y = HZ + 130 + R2() * 240, w = 26 + R2() * 60, h = 5 + R2() * 7;
          if (y > shoreYAt(x) - 70) continue;
          g.fillStyle = rgb(coral, pa);
          for (let k = 0; k < 7; k++){
            const ox = (R2() - 0.5) * w * 1.4, oy = (R2() - 0.5) * h * 1.6;
            g.beginPath(); g.ellipse(x + ox, y + oy, w * (0.22 + R2() * 0.3), h * (0.4 + R2() * 0.5), 0, 0, TAU); g.fill();
          }
        }
        // the sand flats glowing through the very shallow water near the shore
        g.fillStyle = rgb(mixc(shore, L.sand, 0.5), 0.55);
        shorePath(g, -34, false); g.lineTo(DW + 60, DH); g.lineTo(-60, DH); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,' + (0.25 * L.daylight) + ')'; g.fillRect(-100, HZ - 0.5, DW + 200, 1.2);
      }
      function paintSeaL(){ const g = seaL.cx; g.save(); toDesign(seaL, g); paintSea(g); g.restore(); }

      // ══════════════════════════════════════════════════════════════════════
      // THE BEACH (sandL) — white coral sand, ripples, the wet band, shells
      // ══════════════════════════════════════════════════════════════════════
      let sandL = null;
      function paintSand(g){
        const sand = L.sand, deep = L.sandDeep, wet = L.sandWet;
        g.fillStyle = lg(g, 0, 640, 0, DH, [[0, rgb(mixc(sand, wet, 0.35))], [0.25, rgb(sand)], [1, rgb(deep)]]);
        shorePath(g, 0, true); g.fill();
        g.fillStyle = lg(g, 0, 660, 0, 760, [[0, rgb(wet, 0.9)], [1, rgb(wet, 0)]]);
        fillShoreBand(g, 0, 44);
        const R3 = makeRng(33);
        g.lineWidth = 1.2;
        for (let i = 0; i < 40; i++){                                 // ripples paralleling the shore
          const dy = 50 + R3() * 260, x0 = R3() * DW, len = 80 + R3() * 220;
          g.strokeStyle = rgb(lit(deep, -0.08), 0.18 + R3() * 0.12);
          g.beginPath();
          for (let x = x0; x <= x0 + len; x += 20){ const y = shoreYAt(x) + dy + Math.sin(x * 0.05) * 2; if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
          g.stroke();
        }
        for (let i = 0; i < 90; i++){                                 // grains and specks
          const x = R3() * DW, y = shoreYAt(x) + 20 + R3() * 240;
          g.fillStyle = R3() < 0.5 ? 'rgba(255,255,255,' + (0.35 * L.daylight + 0.1) + ')' : rgb(lit(deep, -0.15), 0.45);
          g.beginPath(); g.arc(x, y, 0.8 + R3() * 1.6, 0, TAU); g.fill();
        }
        for (let i = 0; i < 9; i++){                                  // shells
          const x = 60 + R3() * (DW - 120), y = shoreYAt(x) + 40 + R3() * 120;
          g.fillStyle = rgb(mixc('#f6e4dc', deep, 0.3)); g.strokeStyle = rgb(lit(deep, -0.3), 0.6); g.lineWidth = 0.8;
          g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x, y - 7, x + 5, y); g.closePath(); g.fill(); g.stroke();
        }
        // the palms' shadows: the crown as a spiky star of frond shadows, the trunk as a strip
        const sp = sunPos(tod), mp = moonPos(tod);
        const src = L.daylight > 0.3 ? sp : mp;
        const sa = L.shadow * (L.daylight > 0.3 ? 1 : L.moon * 0.6) * (1 - STORM.k * 0.85);
        if (sa > 0.01 && src.up){
          const lean = clamp((src.x - DW / 2) / (DW / 2), -1, 1);       // light from the left → shadow to the right
          const len = 1.0 + 1.6 * clamp01(1 - (HZ - src.y) / 400);      // low light → long shadows
          g.fillStyle = 'rgba(30,40,60,' + (sa * 0.5) + ')';
          for (const P of PALMS){
            const top = trunkPt(P, 1, 0);
            const cx = top[0] - lean * len * P.h * 0.42, cy = P.y + 4 + P.h * 0.03 * len;
            g.save(); g.translate(cx, cy); g.scale(1 + 0.35 * (len - 1), 0.3);
            const nF = P.fronds;
            for (let i = 0; i < nF; i++){
              const a = (i + 0.5) / nF * TAU + P.ph, l = P.h * 0.26 * (0.75 + 0.25 * Math.sin(i * 2.7 + P.ph));
              g.save(); g.rotate(a);
              g.beginPath(); g.ellipse(l * 0.5, 0, l * 0.5, P.h * 0.028, 0, 0, TAU); g.fill();
              g.restore();
            }
            g.beginPath(); g.arc(0, 0, P.h * 0.07, 0, TAU); g.fill();
            g.restore();
            g.beginPath(); g.moveTo(P.x - 10 * P.big, P.y); g.lineTo(P.x + 10 * P.big, P.y); g.lineTo(cx + 4, cy); g.lineTo(cx - 4, cy); g.closePath(); g.fill();
          }
        }
      }
      function paintSandL(){ const g = sandL.cx; g.save(); toDesign(sandL, g); paintSand(g); g.restore(); }

      // ══════════════════════════════════════════════════════════════════════
      // THE PALMS — trunks drawn live (they bend); every frond a baked sprite
      // in SCREEN orientation, drawn by translation + a small sway rotation.
      // ══════════════════════════════════════════════════════════════════════
      // x, y = trunk base; h = height; lean = -1 left / +1 right; fronds = count;
      // ph = a seed; big = scale; coco = coconuts; dead = hanging dry fronds
      const PALMS_ALL = [
        { x: 90,   y: 850, h: 540, lean: 0.5,   fronds: 13, ph: 0.3, big: 1,    coco: true,  dead: 2 },
        { x: 265,  y: 878, h: 390, lean: 0.35,  fronds: 11, ph: 1.9, big: 0.85, coco: true,  dead: 1, medium: true },
        { x: 25,   y: 900, h: 300, lean: 0.75,  fronds: 9,  ph: 4.1, big: 0.7,  coco: false, dead: 0 },
        { x: 1560, y: 855, h: 560, lean: -0.45, fronds: 13, ph: 2.6, big: 1,    coco: true,  dead: 2 },
        { x: 1360, y: 885, h: 360, lean: -0.3,  fronds: 11, ph: 5.0, big: 0.8,  coco: true,  dead: 1, medium: true },
        { x: 1585, y: 900, h: 290, lean: -0.8,  fronds: 9,  ph: 0.9, big: 0.7,  coco: false, dead: 0 },
      ];
      for (const P of PALMS_ALL){ P.x0 = P.x; P.h0 = P.h; P.big0 = P.big; }
      const PALMS = [];                                              // the ones in play for this width (layoutBeach)
      let layoutDW = -1;
      function layoutBeach(){
        AXK = Math.min(1, DW / DW0);
        const shrink = Math.max(0.5, Math.min(1, DW / DW0 + 0.24));  // the palms lose up to half their height on a phone, so the crowns frame the view instead of filling it
        for (const I of ISLANDS) I.x = AX(I.x0);
        PALMS.length = 0;
        for (const P of PALMS_ALL){
          if (P.medium && DW < 900) continue;
          P.x = AX(P.x0); P.h = P.h0 * shrink; P.big = P.big0 * shrink; P.crown = null;
          PALMS.push(P);
        }
      }
      function trunkPt(P, u, bend){
        const x = P.x + P.lean * P.h * 0.42 * u * u + bend * P.h * 0.3 * u * u * u;
        const y = P.y - P.h * u * (1 - 0.08 * u);
        return [x, y];
      }
      function drawTrunk(g, P, bend){
        const pts = []; for (let k = 0; k <= 12; k++) pts.push(trunkPt(P, k / 12, bend));
        const wBase = 22 * P.big, wTop = 11 * P.big;
        g.beginPath();
        for (let k = 0; k <= 12; k++){ const w = lerp(wBase, wTop, k / 12); g.lineTo(pts[k][0] - w / 2, pts[k][1]); }
        for (let k = 12; k >= 0; k--){ const w = lerp(wBase, wTop, k / 12); g.lineTo(pts[k][0] + w / 2, pts[k][1]); }
        g.closePath();
        const c = pts[6];
        g.fillStyle = lg(g, c[0] - wBase, c[1], c[0] + wBase, c[1], [[0, rgb(L.trunkD)], [0.45, rgb(L.trunk)], [0.75, rgb(lit(L.trunk, 0.08))], [1, rgb(L.trunkD)]]);
        g.fill();
        g.strokeStyle = rgb(L.trunkD, 0.55); g.lineWidth = 1.6 * P.big;
        g.beginPath();
        for (let k = 1; k < 12; k++){
          const w = lerp(wBase, wTop, k / 12) * 0.5, p = pts[k], q = pts[k - 1];
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          g.moveTo(mx - w, my); g.quadraticCurveTo(mx, my + 3, mx + w, my);
        }
        g.stroke();
        return pts[12];
      }
      // the rachis: starts out at angle a and bends progressively toward straight down
      function frondSpine(a, len, droopK){
        const n = 22, pts = [];
        let x = 0, y = 0, d = Math.PI / 2 - a;
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        for (let i = 0; i <= n; i++){
          const u = i / n, th = a + d * droopK * u * u;
          pts.push([x, y, th]);
          x += Math.cos(th) * len / n; y += Math.sin(th) * len / n;
        }
        return pts;
      }
      // one frond in screen orientation: a dense blade of leaflets each side of the rachis
      function drawFrondAt(g, pts, len, colL, colD, wScale, dead){
        const n = pts.length - 1;
        g.strokeStyle = rgb(colD); g.lineWidth = 2.6 * wScale; g.lineCap = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
        const nl = dead ? 22 : 34;
        const mid = pts[Math.floor(n / 2)];
        for (const side of [1, -1]){
          // the side whose leaflets face up is the lit one
          const ny = -side * Math.cos(mid[2]);
          const light = clamp01(0.5 - 0.6 * ny);
          g.fillStyle = rgb(mixc(colD, colL, 0.2 + 0.8 * light));
          g.beginPath();
          for (let k = 0; k < nl; k++){
            const u = 0.09 + 0.91 * k / (nl - 1);
            const i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i;
            const px = lerp(pts[i][0], pts[i + 1][0], f), py = lerp(pts[i][1], pts[i + 1][1], f), th = pts[i][2];
            const tx = Math.cos(th), ty = Math.sin(th), nx = Math.sin(th) * side, nyy = -Math.cos(th) * side;
            const ll = (len * (dead ? 0.17 : 0.22) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.06)), 0.65) + 3) * (0.92 + 0.08 * Math.sin(k * 3.1));
            const phi = 0.78 + 0.1 * Math.sin(k * 1.7);                 // the leaflet leaves the rachis forward and out
            let dx = tx * Math.cos(phi) + nx * Math.sin(phi), dy = ty * Math.cos(phi) + nyy * Math.sin(phi);
            dy += dead ? 0.7 : 0.32;                                    // it sags
            const dn = Math.hypot(dx, dy); dx /= dn; dy /= dn;
            const w = (1.4 + ll * 0.045) * wScale;
            const ox = -dy * w, oy = dx * w;
            const mx = px + dx * ll * 0.5, my = py + dy * ll * 0.5, ex = px + dx * ll, ey = py + dy * ll;
            g.moveTo(px + ox, py + oy);
            g.quadraticCurveTo(mx + ox * 0.9, my + oy * 0.9, ex, ey);
            g.quadraticCurveTo(mx - ox * 0.9, my - oy * 0.9, px - ox, py - oy);
          }
          g.fill();
        }
      }
      const crownKeyOf = () => ((L.frond[0] / 12) | 0) * 40000 + ((L.frond[1] / 12) | 0) * 200 + ((L.frond[2] / 12) | 0) + (L.daylight > 0.3 ? 1e7 : 0);
      function bakeCrown(P){
        const t0 = performance.now();
        const R = makeRng(P.ph * 1000 + 5);
        const len = P.h * 0.5, out = [];
        const scale = Math.min(S * DPR, 1.35);
        const colL = L.frond, colD = L.frondD;
        const dk = 0.2 + 0.4 * L.daylight;
        const deadL = mixc(L.trunk, '#9a8a55', dk), deadD = mixc(L.trunkD, '#6a5a30', dk);
        const total = P.fronds + P.dead;
        for (let i = 0; i < total; i++){
          const dead = i >= P.fronds;
          let a, l, droopK;
          if (dead){ a = Math.PI / 2 + (R() - 0.5) * 0.9; l = len * 0.7; droopK = 0.9; }
          else {
            // the fan: from left-up to right-up, denser toward the top; gravity does the drooping
            const u = (i + 0.5) / P.fronds;
            a = -Math.PI * 0.94 + u * Math.PI * 0.88 + (R() - 0.5) * 0.14;
            l = len * (0.82 + R() * 0.3); droopK = 0.5 + R() * 0.3;
          }
          const pts = frondSpine(a, l, droopK);
          const reach = l * 0.25 + 10;
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const p of pts){ if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
          x0 -= reach; y0 -= reach; x1 += reach; y1 += reach;
          const cw = Math.ceil((x1 - x0) * scale), ch = Math.ceil((y1 - y0) * scale);
          const cv = doc.createElement('canvas'); cv.width = Math.max(2, cw); cv.height = Math.max(2, ch);
          const g = cv.getContext('2d');
          g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
          drawFrondAt(g, pts, l, dead ? deadL : colL, dead ? deadD : colD, P.big, dead);
          out.push({ cv, a, ox: -x0, oy: -y0, w: cw / scale, h: ch / scale, ph: R() * TAU, k: 0.7 + R() * 0.6, back: dead || (i % 2 === 0), dead });
        }
        P.crown = out; P.crownKey = crownKeyOf();
        PROF.crowns = (PROF.crowns || 0) + (performance.now() - t0);
      }
      function drawPalm(g, P, t, w){
        const bend = clamp(w, -1.3, 1.3) * 0.55 * (0.4 + 0.6 * P.big);
        const top = drawTrunk(g, P, bend);
        if (!P.crown || P.crownKey !== crownKeyOf()) bakeCrown(P);
        const gust = clamp(w, -1.6, 1.6) * 0.5;
        const cx = top[0], cy = top[1] - 3 * P.big;
        const drawFrond = F => {
          const sway = Math.sin(t * 1.7 * F.k + F.ph) * 0.04 * (1 + Math.abs(w) * 1.5) + gust * 0.3 * (F.dead ? 0.6 : 1);
          g.save(); g.translate(cx, cy); g.rotate(sway); g.drawImage(F.cv, -F.ox, -F.oy, F.w, F.h); g.restore();
        };
        for (const F of P.crown) if (F.back) drawFrond(F);
        // the crown boss (leaf sheaths) and the coconuts hanging under it
        g.fillStyle = rgb(mixc(L.trunk, L.frondD, 0.5));
        g.beginPath(); g.ellipse(cx, cy + 2, 13 * P.big, 9 * P.big, 0, 0, TAU); g.fill();
        if (P.coco){
          const cc = mixc(L.trunk, '#2a1a0a', 0.5), ch = lit(cc, 0.18);
          for (let k = 0; k < 4; k++){
            const ox = (k - 1.5) * 8 * P.big + gust * 5, oy = 10 * P.big + (k % 2) * 6 * P.big;
            g.fillStyle = rgb(cc); g.beginPath(); g.arc(cx + ox, cy + oy, 6.5 * P.big, 0, TAU); g.fill();
            g.fillStyle = rgb(ch); g.beginPath(); g.arc(cx + ox - 2 * P.big, cy + oy - 2 * P.big, 2.5 * P.big, 0, TAU); g.fill();
          }
        }
        for (const F of P.crown) if (!F.back) drawFrond(F);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE WATER, LIVE — ripples, the glitter path, the wash
      // ══════════════════════════════════════════════════════════════════════
      const R4 = makeRng(99);
      const RIPPLES = []; for (let i = 0; i < 70; i++) RIPPLES.push({ x: R4() * DW, y: HZ + 30 + Math.pow(R4(), 1.5) * 300, w: 20 + R4() * 60, ph: R4() * TAU, sp: 0.4 + R4() * 0.8 });
      const GLINTS = []; for (let i = 0; i < 90; i++) GLINTS.push({ u: R4(), v: R4(), ph: R4() * TAU, sp: 2 + R4() * 4 });
      function drawWaterLive(g, t){
        const dl = L.daylight, storm = STORM.k;
        g.fillStyle = 'rgba(255,255,255,' + (0.14 * (0.4 + dl * 0.6) * (1 - storm * 0.6)) + ')';
        g.beginPath();
        for (const R of RIPPLES){
          const x = R.x + Math.sin(t * R.sp + R.ph) * 14, a = 0.5 + 0.5 * Math.sin(t * R.sp * 1.3 + R.ph);
          if (a < 0.35) continue;
          g.moveTo(x - R.w, R.y); g.lineTo(x + R.w, R.y); g.lineTo(x + R.w * 0.6, R.y + 1.6); g.lineTo(x - R.w * 0.6, R.y + 1.6);
        }
        g.fill();
        // whitecaps in a storm
        if (storm > 0.1){
          g.fillStyle = 'rgba(255,255,255,' + (0.35 * storm) + ')';
          g.beginPath();
          for (let i = 0; i < RIPPLES.length; i += 2){
            const R = RIPPLES[i], ph = t * 1.4 + R.ph, x = R.x + Math.sin(ph) * 30 * STORM.dir, k = 0.5 + 0.5 * Math.sin(ph * 1.7);
            if (k < 0.5) continue;
            g.moveTo(x - R.w * 0.5, R.y); g.quadraticCurveTo(x, R.y - 5 * k, x + R.w * 0.5, R.y); g.lineTo(x + R.w * 0.3, R.y + 2); g.lineTo(x - R.w * 0.3, R.y + 2);
          }
          g.fill();
        }
        // the glitter path under the sun (or the moon)
        const sp = sunPos(tod), mp = moonPos(tod);
        let src = null, str = 0, col = L.sun;
        if (sp.up && dl > 0.25){ src = sp; str = L.glitter * clamp01((sp.y - (HZ - 440)) / 300 + 0.4); }
        else if (mp.up && L.moon > 0.2){ src = mp; str = 0.55 * L.moon; col = [220, 230, 255]; }
        if (src && str > 0.02){
          str *= (1 - storm * 0.9);
          const low = clamp01(1 - (HZ - src.y) / 400);
          const len = 200 + low * 280, wTop = 24 + low * 40, wBot = 150 + low * 260;
          // the body: a stack of soft ellipses widening down the water
          const boost = 1 + low * 0.7;
          for (const [wf, af] of [[1, 0.16], [0.62, 0.16], [0.3, 0.2]]){
            g.fillStyle = lg(g, 0, HZ, 0, HZ + len, [[0, rgb(col, af * str * boost)], [0.3, rgb(col, af * 0.55 * str * boost)], [1, rgb(col, 0)]]);
            g.beginPath();
            g.moveTo(src.x - wTop * wf, HZ);
            g.lineTo(src.x + wTop * wf, HZ);
            g.quadraticCurveTo(src.x + wBot * wf * 0.55, HZ + len * 0.5, src.x + wBot * wf, HZ + len);
            g.lineTo(src.x - wBot * wf, HZ + len);
            g.quadraticCurveTo(src.x - wBot * wf * 0.55, HZ + len * 0.5, src.x - wTop * wf, HZ);
            g.closePath(); g.fill();
          }
          g.fillStyle = rgb(lit(col, 0.5), 0.9 * str);
          g.beginPath();
          for (const G of GLINTS){
            const v = G.v, y = HZ + 6 + v * v * len, hw = lerp(wTop, wBot, v * v) * 0.85;
            const x = src.x + (G.u * 2 - 1) * hw + Math.sin(t * 0.7 + G.ph) * 6;
            const tw = Math.sin(t * G.sp + G.ph);
            if (tw < 0.55) continue;
            const r = (0.6 + v * 2.2) * (tw - 0.55) / 0.45;
            g.moveTo(x - r * 3, y); g.lineTo(x + r * 3, y); g.lineTo(x + r * 1.5, y + r * 0.6); g.lineTo(x - r * 1.5, y + r * 0.6);
          }
          g.fill();
        }
        if (sp.up && dl > 0.25 && sp.y > HZ - 140){                   // the low sun's blaze on the water
          const k = clamp01((sp.y - (HZ - 140)) / 140) * (1 - storm * 0.9);
          glow(g, 'sun', sp.x, HZ + 14 + (sp.y - HZ) * 0.2, 110 + k * 70, 0.6 * k * L.glitter);
        }
      }
      const WAVES = [
        { ph: 0, per: 9.5, amp: 46, foam: 1 },
        { ph: 3.6, per: 12.5, amp: 30, foam: 0.75 },
        { ph: 7.1, per: 7.8, amp: 22, foam: 0.6 },
      ];
      function drawWash(g, t){
        const storm = STORM.k, dl = L.daylight;
        const power = 1 + storm * 0.9;
        for (const Wv of WAVES){
          const u = ((t + Wv.ph) % Wv.per) / Wv.per;
          const amp = Wv.amp * power;
          // the front: whitewater comes in from the sea (0→0.3), runs up the sand (0.3→0.55), drains back (0.55→0.9)
          let dy, phase;
          if (u < 0.3){ dy = -amp * 0.7 * (1 - smooth(u / 0.3)); phase = 0; }
          else if (u < 0.55){ dy = amp * smooth((u - 0.3) / 0.25); phase = 1; }
          else if (u < 0.9){ dy = amp * (1 - smooth((u - 0.55) / 0.35)); phase = 2; }
          else { dy = 0; phase = 3; }
          // the sand it has wetted this cycle, fading once the water is gone
          const reach = phase === 0 ? 0 : (phase === 1 ? dy : amp);
          const wetA = phase === 0 ? 0 : 0.42 * (u < 0.9 ? 1 : 1 - smooth((u - 0.9) / 0.1));
          if (reach > 1 && wetA > 0.01){ g.fillStyle = rgb(L.sandWet, wetA); fillShoreBand(g, -2, reach); }
          // the water sheet over the sand: thin and translucent, thinning as it drains
          if (dy > 0.5){
            g.fillStyle = rgb(mixc(L.seaShore, '#ffffff', 0.35), phase === 1 ? 0.4 : 0.34 * (dy / amp));
            fillShoreBand(g, -6, dy);
          }
          // the foam edge: bright as it breaks onto the sand, dissolving on the way back
          let foamA = Wv.foam * (0.4 + 0.5 * dl);
          if (phase === 0) foamA *= 0.45 + 0.55 * (u / 0.3);
          else if (phase === 2) foamA *= 1 - smooth((u - 0.55) / 0.35);
          else if (phase === 3) foamA = 0;
          if (foamA > 0.02){
            g.strokeStyle = 'rgba(255,255,255,' + foamA + ')'; g.lineWidth = (3 + 3 * (phase === 1 ? 1 : 0.5)) * power; g.lineCap = 'round';
            g.beginPath();
            for (let i = 0; i < SHORE.length; i++){
              const p = SHORE[i], jag = Math.sin(p[0] * 0.05 + t * 2 + Wv.ph) * 3 + Math.sin(p[0] * 0.13 + t) * 2;
              const y = p[1] + dy + jag;
              if (i === 0) g.moveTo(p[0], y); else g.lineTo(p[0], y);
            }
            g.stroke();
            // foam speckle trailing on the SEAWARD side of the edge
            g.fillStyle = 'rgba(255,255,255,' + (foamA * 0.55) + ')';
            g.beginPath();
            for (let i = 0; i < SHORE.length; i += 2){
              const p = SHORE[i];
              for (let k = 0; k < 3; k++){
                const fx = p[0] + Math.sin(i * 7.3 + k * 2.1 + Wv.ph) * 12, fy = p[1] + dy - 4 - k * 5 + Math.sin(t * 1.5 + i + k) * 2;
                g.moveTo(fx + 2, fy); g.arc(fx, fy, 1.5 + (k === 0 ? 1 : 0), 0, TAU);
              }
            }
            g.fill();
          }
        }
        if (storm > 0.05){                                            // chop standing off the shore in a storm
          g.strokeStyle = 'rgba(255,255,255,' + (0.35 * storm) + ')'; g.lineWidth = 5;
          g.beginPath();
          for (let i = 0; i < SHORE.length; i++){ const p = SHORE[i]; const y = p[1] - 30 + Math.sin(p[0] * 0.03 + t * 4) * 6 * storm; if (i === 0) g.moveTo(p[0], y); else g.lineTo(p[0], y); }
          g.stroke();
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SKY, LIVE — clouds, the sun disc, the moon, stars, rain, rainbow
      // ══════════════════════════════════════════════════════════════════════
      function bakeCloudPuffs(C){
        const R = makeRng(C.seed), puffs = [];
        const n = 6 + Math.floor(R() * 4), Wc = 150 + R() * 100;
        for (let i = 0; i < n; i++){
          const u = (i + 0.5) / n, r = 26 + 36 * Math.sin(u * Math.PI) + (R() - 0.5) * 12;
          puffs.push({ dx: (u - 0.5) * Wc + (R() - 0.5) * 16, dy: -r * 0.62, r });
        }
        for (let i = 0; i < 3; i++){ const u = 0.25 + R() * 0.5, r = 18 + R() * 16; puffs.push({ dx: (u - 0.5) * Wc, dy: -(58 + R() * 30), r }); }
        C.puffs = puffs;
      }
      // a cumulus: one silhouette (the union of its puffs) lit top-down, clipped to a flat base
      function drawCloud(g, C, x, y, s, top, bot, alpha, lx){
        if (!C.puffs) bakeCloudPuffs(C);
        g.save(); g.translate(x, y); g.scale(s, s);
        g.beginPath(); g.rect(-320, -280, 640, 282); g.clip();
        g.fillStyle = lg(g, 0, -110, 0, 2, [[0, rgb(top, alpha)], [0.55, rgb(mixc(top, bot, 0.4), alpha)], [1, rgb(bot, alpha)]]);
        g.beginPath(); for (const p of C.puffs){ g.moveTo(p.dx + p.r, p.dy); g.arc(p.dx, p.dy, p.r, 0, TAU); } g.fill();
        g.fillStyle = rgb(lit(top, 0.6), alpha * 0.45);
        g.beginPath(); for (const p of C.puffs){ const hx = p.dx + lx, hy = p.dy - p.r * 0.25; g.moveTo(hx + p.r * 0.58, hy); g.arc(hx, hy, p.r * 0.58, 0, TAU); } g.fill();
        g.restore();
      }
      function drawClouds(g, t){
        const storm = STORM.k;
        const sp = sunPos(tod);
        const lx = sp.x < DW / 2 ? -5 : 5;
        const top = L.cloud, bot = L.cloudD;
        for (const C of CLOUDS){
          C.x += C.v * (1 + STORM.wind * 3) * DT * STORM.dir;
          if (C.x > DW + 320) C.x -= DW + 640; if (C.x < -320) C.x += DW + 640;
          drawCloud(g, C, C.x, C.y - storm * 30, C.s * (1 + storm * 0.25), top, bot, L.cloudA, lx);
        }
        // cirrus, high and thin, gone in the storm
        g.lineCap = 'round';
        for (const C of CIRRUS){ C.x += C.v * DT * 0.3 * STORM.dir; if (C.x > DW + 400) C.x -= DW + 800; if (C.x < -400) C.x += DW + 800; }
        const cw = [[16, 0.05], [9, 0.08], [4, 0.12]];
        for (const [lw, la] of cw){
          g.strokeStyle = rgb(L.cloud, la * (1 - storm)); g.lineWidth = lw;
          g.beginPath();
          for (const C of CIRRUS){
            g.moveTo(C.x - C.w / 2, C.y + 6); g.bezierCurveTo(C.x - C.w * 0.2, C.y - 14, C.x + C.w * 0.15, C.y + 10, C.x + C.w / 2, C.y - 4);
            g.moveTo(C.x - C.w * 0.3, C.y + 18); g.quadraticCurveTo(C.x + C.w * 0.1, C.y + 4, C.x + C.w * 0.42, C.y + 12);
          }
          g.stroke();
        }
        // the storm's bank: a wall of cumulonimbus rolling in from one side and sliding across
        if (storm > 0.02 || STORM.front > 0.01){
          const front = STORM.front, dir = STORM.dir;
          const stop = mixc('#7a8496', L.cloud, 0.3 * (1 - storm)), sbot = mixc('#262c3a', L.cloudD, 0.3 * (1 - storm));
          const leaving = STORM.phase === 'fade' || STORM.phase === 'clear';
          const alpha = 0.97 * smooth(Math.min(1, front * 3));
          for (const C of SCLOUDS){
            const x = C.u * DW + (leaving ? 1 : -1) * dir * (1 - front) * DW * 1.4 + STORM.drift * dir * 0.15;
            drawCloud(g, C, x, C.y, C.s, stop, sbot, alpha, lx);
          }
        }
      }
      function drawSunMoon(g, t){
        const storm = STORM.k;
        const sp = sunPos(tod);
        if (sp.up && L.daylight > 0.18){
          const low = clamp01(1 - (HZ - sp.y) / 200);
          const r = L.sunR * (1 + low * 0.25);
          const col = mixc(L.sun, '#ff6a2a', low * 0.5);
          glow(g, 'sun', sp.x, sp.y, r * 4.5, (0.55 - low * 0.2) * (1 - storm * 0.85));
          g.save(); g.beginPath(); g.rect(-100, -100, DW + 200, HZ + 100); g.clip();
          g.fillStyle = rgb(col, 1 - storm * 0.7);
          g.beginPath(); g.ellipse(sp.x, sp.y, r, r * (1 - low * 0.18), 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - low) * (1 - storm)) + ')';
          g.beginPath(); g.arc(sp.x, sp.y, r * 0.72, 0, TAU); g.fill();
          g.restore();
        }
        const mp = moonPos(tod);
        if (mp.up && L.moon > 0.03){
          const a = L.moon * (1 - storm * 0.8);
          glow(g, 'blue', mp.x, mp.y, 150, 0.35 * a);
          g.fillStyle = rg(g, mp.x - 8, mp.y - 8, 4, 32, [[0, 'rgba(250,252,255,' + a + ')'], [1, 'rgba(214,222,242,' + a + ')']]);
          g.beginPath(); g.arc(mp.x, mp.y, 30, 0, TAU); g.fill();
          g.fillStyle = 'rgba(170,182,212,' + (a * 0.55) + ')';
          g.beginPath();
          g.moveTo(mp.x + 3, mp.y - 9); g.arc(mp.x - 6, mp.y - 9, 9, 0, TAU);
          g.moveTo(mp.x + 18, mp.y + 6); g.arc(mp.x + 11, mp.y + 6, 7, 0, TAU);
          g.moveTo(mp.x - 5, mp.y + 14); g.arc(mp.x - 10, mp.y + 14, 5, 0, TAU);
          g.moveTo(mp.x + 15, mp.y - 14); g.arc(mp.x + 12, mp.y - 14, 3, 0, TAU);
          g.fill();
          g.fillStyle = rgb(L.sky[0][1], a * 0.35);                    // a soft shaded limb on the side away from the sun
          g.beginPath(); g.arc(mp.x, mp.y, 30, Math.PI * 0.6, Math.PI * 1.4); g.arc(mp.x - 12, mp.y, 30, Math.PI * 1.4, Math.PI * 0.6, true); g.fill();
        }
      }
      function drawStars(g, t){
        const a = L.stars;
        if (a < 0.02) return;
        g.fillStyle = 'rgba(255,255,255,' + a + ')';
        g.beginPath();
        for (const s of STARS){ const r = s.r * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph)); g.moveTo(s.x + r, s.y); g.arc(s.x, s.y, r, 0, TAU); }
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + (a * 0.5) + ')'; g.lineWidth = 0.8;
        g.beginPath();
        for (let i = 0; i < 8; i++){ const s = STARS[i * 19]; const f = 3 + 2 * Math.sin(t * s.sp + s.ph); g.moveTo(s.x - f, s.y); g.lineTo(s.x + f, s.y); g.moveTo(s.x, s.y - f); g.lineTo(s.x, s.y + f); }
        g.stroke();
      }
      function drawRain(g, t){
        if (!DROPS.length) return;
        const slant = 170 * STORM.wind * STORM.dir;
        g.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++){                          // two depths: near bright, far dim
          g.strokeStyle = pass ? 'rgba(210,225,245,0.55)' : 'rgba(200,215,235,0.28)'; g.lineWidth = pass ? 1.4 : 1;
          g.beginPath();
          for (let i = pass; i < DROPS.length; i += 2){ const d = DROPS[i], k = d.l / d.v; g.moveTo(d.x, d.y); g.lineTo(d.x - slant * k, d.y - d.l); }
          g.stroke();
        }
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
        g.beginPath();
        for (const s of SPLASH){
          const q = (t - s.t0) / 0.5, r = s.r * (0.3 + q);
          if (s.sea){ g.moveTo(s.x + r, s.y); g.ellipse(s.x, s.y, r, r * 0.35, 0, 0, TAU); }
          else { g.moveTo(s.x - r * 0.5, s.y); g.lineTo(s.x, s.y - r * 0.8); g.lineTo(s.x + r * 0.5, s.y); }
        }
        g.stroke();
      }
      function drawRainbow(g){
        const a = STORM.rainbow * 0.4 * L.daylight;
        if (a < 0.01) return;
        const sp = sunPos(tod);
        const cx = DW - sp.x, cy = HZ + 240, r0 = 520, bw = 14;
        const bands = ['#ff4040', '#ff9a30', '#ffe040', '#40d060', '#40a0ff', '#6060ff', '#a040d0'];
        g.save(); g.beginPath(); g.rect(-100, -100, DW + 200, HZ + 100); g.clip();
        g.lineWidth = bw;
        for (let i = 0; i < bands.length; i++){
          g.strokeStyle = rgb(hexc(bands[i]), a * (i === 0 || i === 6 ? 0.7 : 1));
          g.beginPath(); g.arc(cx, cy, r0 - i * bw, Math.PI, TAU); g.stroke();
        }
        g.restore();
      }

      // ══════════════════════════════════════════════════════════════════════
      // TONE — ambient tint + storm gloom + the lightning flash + vignette
      // ══════════════════════════════════════════════════════════════════════
      let vigL = null;
      function buildVignette(){
        vigL = makeLayer(W, H, 0.25); const g = vigL.cx;
        g.fillStyle = rg(g, W * 0.5, H * 0.5, Math.min(W, H) * 0.5, Math.max(W, H) * 0.8, [[0, 'rgba(10,20,40,0)'], [0.75, 'rgba(10,20,40,0.10)'], [1, 'rgba(10,20,40,0.34)']]);
        g.fillRect(0, 0, W, H);
      }
      function drawTone(g){
        const am = L.ambient;
        if (am[3] > 0.005){ g.fillStyle = rgb(am, am[3]); g.fillRect(0, 0, W, H); }
        if (STORM.k > 0.01){ g.fillStyle = 'rgba(30,40,58,' + (0.10 * STORM.k) + ')'; g.fillRect(0, 0, W, H); }
        if (STORM.flash > 0.01){ g.fillStyle = 'rgba(225,235,255,' + (0.42 * STORM.flash) + ')'; g.fillRect(0, 0, W, H); }
      }

      // ══════════════════════════════════════════════════════════════════════
      // LAYERS, REPAINT, RESIZE
      // ══════════════════════════════════════════════════════════════════════
      function repaintIfNeeded(){
        const key = Math.floor(tod * KEYS.length * 24) * 16 + Math.round(STORM.k * 12);
        if (key === lookKey) return;
        lookKey = key; L = stormify(lookAt(tod), STORM.k);
        paintSkyL(); paintSeaL(); paintSandL();
        PROF.repaints++;
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        canvasF.width = W * DPR; canvasF.height = H * DPR; ctxF.setTransform(DPR, 0, 0, DPR, 0, 0);
        // the design is as wide as the window is, at the fixed design height — nothing is cropped
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H))));
        S = H / DH; OX = (W - DW * S) / 2; OY = 0;
        if (DW !== layoutDW){ layoutDW = DW; layoutBeach(); }
        clearWalkers(); nextGroundAt = lastT + 2.5; nextFlyAt = lastT + 8;
        skyL = makeLayer(W, H, DPR); seaL = makeLayer(W, H, DPR); sandL = makeLayer(W, H, DPR);
        for (const P of PALMS) P.crown = null;
        lookKey = -1; repaintIfNeeded();
        buildVignette();
        warmTs = 0;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE POKEMON WALKERS — DOM rigs on the actors layer, moved per frame
      // ══════════════════════════════════════════════════════════════════════
      const FOOT_Y = 838;                                   // design y of the foot line on the dry sand
      // h: height in % of the stage · speed: px/s at S = 1 · gait: 'legs' (pk-walk + --pk-step
      // cadence) / 'css' (the rig's own gait, paused while idle) / 'hop' (bounces along) / 'fly'
      // bob: bounce as a fraction of the height · rock: side-to-side degrees · idle: seconds
      // standing · every: seconds between events · hop: chance of a skip-hop at an event
      const PROFILE = {
        pikachu:    { h: 20.5, speed: [120, 160], gait: 'legs', cadence: 60, bob: 0.045, rock: 0,   lean: 3,   idle: [0.7, 1.8], every: [3, 6],  hop: 0.45, hopH: 0.32, hopDur: 0.5,  turn: 0.15 },
        eevee:      { h: 19,   speed: [100, 140], gait: 'legs', cadence: 70, bob: 0.055, rock: 1.5, lean: 6,   idle: [1.2, 2.6], every: [3, 6],  hop: 0.4,  hopH: 0.3,  hopDur: 0.5,  turn: 0.25 },
        bulbasaur:  { h: 22,   speed: [45, 62],   gait: 'css',  period: 1.5, bob: 0.03,  rock: 3.2, lean: 1.5, idle: [1.5, 3.2], every: [5, 9],  hop: 0,    hopH: 0,    hopDur: 0.5,  turn: 0.1 },
        squirtle:   { h: 23,   speed: [60, 80],   gait: 'css',  period: 0.5, bob: 0,     rock: 3.5, lean: 2,   idle: [1.0, 2.2], every: [4, 7],  hop: 0.3,  hopH: 0.28, hopDur: 0.55, turn: 0.2 },
        jigglypuff: { h: 13,   speed: [85, 110],  gait: 'hop',  hopDur: 0.5, hopH: 0.55, gap: [0.05, 0.22], bob: 0, rock: 0, lean: 0, idle: [1.5, 3], every: [4, 8], hop: 0, turn: 0.2 },
        gooey:      { h: [22, 27], speed: [40, 65], gait: 'fly', bob: 0.10, rock: 3, lean: 4, idle: [2, 4], every: [6, 11] },
      };
      const WALKERS = [];
      let nextGroundAt = 1e9, nextFlyAt = 1e9, pokeReady = false, queue = null, lastWalker = null, holdWalkers = false, autoSpawn = true;
      // a shuffled round-robin, so every ground pokemon appears once per cycle
      function nextGround(){
        const avail = GROUND.filter(havePokemon);
        if (!avail.length) return null;
        if (!queue || !queue.length){
          queue = avail.slice();
          for (let i = queue.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const tmp = queue[i]; queue[i] = queue[j]; queue[j] = tmp; }
          if (queue.length > 1 && queue[0] === lastWalker) queue.push(queue.shift());
        }
        lastWalker = queue.shift();
        return lastWalker;
      }
      function setGait(Wk, on){
        const P = Wk.P;
        if (P.gait === 'legs' && Wk.inst.setWalking) Wk.inst.setWalking(on);
        if (P.gait === 'css') Wk.el.classList.toggle('mv2-idle', !on);
        Wk.gaitOn = on;
      }
      function setCadence(Wk){
        if (Wk.P.gait !== 'legs') return;
        Wk.step = clamp(Wk.P.cadence * S / (Wk.speed * Wk.hurry), 0.18, 0.9);
        Wk.el.style.setProperty('--pk-step', Wk.step.toFixed(2) + 's');
      }
      function spawnWalker(name, xFrac){
        const def = window.Pokemons && window.Pokemons[name], P = PROFILE[name];
        if (!def || !def.place || !P) return null;
        const fly = P.gait === 'fly';
        const hPct = Array.isArray(P.h) ? rnd(P.h[0], P.h[1]) : P.h;
        const hpx = H * hPct / 100, ff = def.footFrac || 0.92;
        // the wrapper's bottom: the foot line on the sand (design FOOT_Y), less the rig's own gap under its feet
        let bottomPx = H - (OY + FOOT_Y * S) - (1 - ff) * hpx;
        if (fly) bottomPx = H - (OY + rnd(400, 500) * S);           // over the lagoon, below the game card
        const inst = def.place({ parent: actors, height: hpx.toFixed(1) + 'px', left: '0px', bottom: Math.max(0, bottomPx).toFixed(1) + 'px' });
        if (!inst) return null;
        const el = inst.element; el.style.transformOrigin = '50% 100%';
        const w = el.offsetWidth || hpx;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const Wk = { name, P, inst, el, w, hpx, fly, dir, speed: rnd(P.speed[0], P.speed[1]) * S, hurry: 1,
                     x: dir > 0 ? -w - 30 : W + 30, state: 'walk', until: 0, ph: Math.random(), bobPh: rnd(0, TAU),
                     nextEvent: lastT + rnd(P.every[0], P.every[1]), hop: null, land: -9, yw: 0, yTarget: 0, gaitOn: false, step: 0.5, lean: 0 };
        if (xFrac !== undefined){ Wk.x = xFrac * W - w / 2; Wk.state = 'idle'; Wk.until = 1e9; }
        inst.setFlip(dir > 0);                                       // the rigs face LEFT natively
        setCadence(Wk);
        setGait(Wk, Wk.state === 'walk');
        el.style.transform = 'translate(' + Wk.x.toFixed(1) + 'px,0px)';
        WALKERS.push(Wk);
        return Wk;
      }
      function removeWalker(Wk){
        const i = WALKERS.indexOf(Wk); if (i >= 0) WALKERS.splice(i, 1);
        try { Wk.inst.remove(); } catch (e) {}
        if (Wk.fly) nextFlyAt = lastT + rnd(35, 70); else nextGroundAt = lastT + rnd(2.5, 6);
      }
      function clearWalkers(){ for (const Wk of WALKERS.slice()){ try { Wk.inst.remove(); } catch (e) {} } WALKERS.length = 0; }
      function startHop(Wk, t, h, dur){ Wk.hop = { t0: t, dur, h }; }
      function updateWalkers(t, dt){
        // the schedule: one ground walker at a time (none while a storm is up), the flyer on its own
        if (pokeReady && !holdWalkers && autoSpawn){
          if (t > nextGroundAt && STORM.k < 0.3 && !WALKERS.some(w => !w.fly)){ const n = nextGround(); if (n) spawnWalker(n); nextGroundAt = t + 1e9; }
          if (t > nextFlyAt && havePokemon(FLYER) && !WALKERS.some(w => w.fly)){ spawnWalker(FLYER); nextFlyAt = t + 1e9; }
        }
        if (holdWalkers) return;
        const stormy = STORM.k > 0.3;
        for (let i = WALKERS.length - 1; i >= 0; i--){
          const Wk = WALKERS[i], P = Wk.P;
          if (!Wk.el.parentNode){ WALKERS.splice(i, 1); continue; }
          let vy = 0, rock = 0, sx = 1, sy = 1;
          if (Wk.fly){
            // ── the ghost: drifts, wanders up and down, hovers in place now and then ──
            if (Wk.state === 'idle'){ if (t > Wk.until){ Wk.state = 'walk'; Wk.nextEvent = t + rnd(P.every[0], P.every[1]); } }
            else {
              Wk.x += Wk.dir * Wk.speed * (0.8 + 0.2 * Math.sin(t * 0.7 + Wk.bobPh)) * dt;
              if (t > Wk.nextEvent){ Wk.state = 'idle'; Wk.until = t + rnd(P.idle[0], P.idle[1]); }
            }
            if (Math.random() < dt * 0.2) Wk.yTarget = rnd(-70, 70) * S;
            Wk.yw += (Wk.yTarget - Wk.yw) * Math.min(1, dt * 0.5);
            vy = Wk.yw + Math.sin(t * 1.1 + Wk.bobPh) * P.bob * Wk.hpx;
            Wk.lean += ((Wk.state === 'walk' ? P.lean * Wk.dir : 0) - Wk.lean) * Math.min(1, dt * 3);
            rock = Math.sin(t * 0.8 + Wk.bobPh) * P.rock + Wk.lean;
          } else {
            const hurry = stormy ? 1.6 : 1;
            if (hurry !== Wk.hurry){ Wk.hurry = hurry; setCadence(Wk); }
            const v = Wk.speed * hurry;
            if (stormy && Wk.state !== 'walk' && Wk.state !== 'hopping'){ Wk.state = 'walk'; Wk.hop = null; Wk.dir = Wk.homeDir || Wk.dir; Wk.inst.setFlip(Wk.dir > 0); }
            // ── the state machine ──
            if (Wk.state === 'idle'){
              if (t > Wk.until){ Wk.state = 'walk'; Wk.nextEvent = t + rnd(P.every[0], P.every[1]); }
            } else if (Wk.state === 'turnA'){                          // stop, turn, walk back a few steps …
              if (t > Wk.until){ Wk.homeDir = Wk.dir; Wk.dir = -Wk.dir; Wk.inst.setFlip(Wk.dir > 0); Wk.state = 'back'; Wk.until = t + rnd(1.2, 2.2); }
            } else if (Wk.state === 'back'){
              Wk.x += Wk.dir * v * dt;
              if (t > Wk.until){ Wk.state = 'turnB'; Wk.until = t + 0.45; }
            } else if (Wk.state === 'turnB'){                          // … stop, turn again, carry on
              if (t > Wk.until){ Wk.dir = Wk.homeDir; Wk.inst.setFlip(Wk.dir > 0); Wk.state = 'walk'; Wk.nextEvent = t + rnd(P.every[0], P.every[1]); }
            } else if (Wk.state === 'walk'){
              if (P.gait === 'hop'){
                // ── jigglypuff bounces: airborne it moves, on the ground it squashes and waits a beat ──
                if (Wk.hop){
                  const u = (t - Wk.hop.t0) / Wk.hop.dur;
                  if (u >= 1){ Wk.hop = null; Wk.land = t; Wk.until = t + rnd(P.gap[0], P.gap[1]); }
                  else { Wk.x += Wk.dir * v * 1.7 * dt; vy = -Wk.hop.h * 4 * u * (1 - u); }
                } else if (t > Wk.until){
                  if (t > Wk.nextEvent && !stormy){ Wk.state = 'idle'; Wk.until = t + rnd(P.idle[0], P.idle[1]); }
                  else startHop(Wk, t, P.hopH * Wk.hpx * rnd(0.8, 1.15), P.hopDur * rnd(0.9, 1.1));
                }
              } else {
                Wk.x += Wk.dir * v * dt;
                if (Wk.hop){                                             // a skip-hop while walking
                  const u = (t - Wk.hop.t0) / Wk.hop.dur;
                  if (u >= 1){ Wk.hop = null; Wk.land = t; } else vy = -Wk.hop.h * 4 * u * (1 - u);
                }
                if (t > Wk.nextEvent && !stormy && !Wk.hop){
                  const r = Math.random();
                  if (r < P.hop) startHop(Wk, t, P.hopH * Wk.hpx, P.hopDur);
                  else if (r < P.hop + P.turn){ Wk.state = 'turnA'; Wk.until = t + 0.45; }
                  else { Wk.state = 'idle'; Wk.until = t + rnd(P.idle[0], P.idle[1]); }
                  Wk.nextEvent = t + rnd(P.every[0], P.every[1]);
                }
              }
            }
            // ── the gait: legs on while moving, the body bouncing and rocking with the steps ──
            const moving = (Wk.state === 'walk' && !(P.gait === 'hop' && !Wk.hop)) || Wk.state === 'back';
            if (moving !== Wk.gaitOn) setGait(Wk, moving);
            Wk.lean += ((moving ? P.lean * Wk.dir * (Wk.hop ? 1.6 : 1) : 0) - Wk.lean) * Math.min(1, dt * 8);
            rock = Wk.lean;
            if (moving && P.gait !== 'hop'){
              const per = P.gait === 'legs' ? Wk.step : P.period;
              Wk.ph += dt / per;
              vy += -P.bob * Wk.hpx * Math.abs(Math.sin(TAU * Wk.ph));
              rock += P.rock * Math.sin(TAU * Wk.ph) * Wk.dir;
            }
            // squash-and-stretch on landing
            const k = 1 - (t - Wk.land) / 0.16;
            if (k > 0){ sy = 1 - 0.12 * k; sx = 1 + 0.09 * k; }
          }
          Wk.el.style.transform = 'translate(' + Wk.x.toFixed(1) + 'px,' + vy.toFixed(1) + 'px) rotate(' + rock.toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
          // off the far edge → gone
          if ((Wk.dir > 0 && Wk.x > W + 40) || (Wk.dir < 0 && Wk.x < -Wk.w - 40)) removeWalker(Wk);
        }
      }
      loadPokemons(() => {
        if (stopped) return;
        pokeReady = true;
        nextGroundAt = lastT + rnd(2.5, 5); nextFlyAt = lastT + rnd(12, 26);
      });

      // ── frame ──
      let DT = 0;
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t; DT = dt;
        profT = performance.now(); PROF.frames++;
        if (todTween){
          const k = clamp01((t - todTween.t0) / todTween.dur);
          tod = todTween.from + (todTween.to - todTween.from) * smooth(k);
          if (k >= 1){ tod = todTween.to % 1; todTween = null; }
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        updateStorm(t, dt);
        repaintIfNeeded();
        updateWalkers(t, dt);
        mark('think');
        const w = wind(t);
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        mark('sky');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawStars(ctx, t);
        drawSunMoon(ctx, t);
        drawClouds(ctx, t);
        drawRainbow(ctx);
        ctx.restore();
        mark('skylive');
        const seaTop = Math.max(0, Math.floor(OY + (HZ - 2) * S));
        if (seaTop < H){ const sy = seaTop * seaL.dpr; ctx.drawImage(seaL.cv, 0, sy, seaL.cv.width, seaL.cv.height - sy, 0, seaTop, W, H - seaTop); }
        mark('sea');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawWaterLive(ctx, t);
        drawBolts(ctx, t);
        ctx.restore();
        mark('water');
        const sandTop = Math.max(0, Math.floor(OY + 600 * S));
        if (sandTop < H){ const sy = sandTop * sandL.dpr; ctx.drawImage(sandL.cv, 0, sy, sandL.cv.width, sandL.cv.height - sy, 0, sandTop, W, H - sandTop); }
        mark('sand');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawWash(ctx, t);
        ctx.restore();
        mark('wash');
        // ── the FRONT canvas: everything that stands in front of the walkers ──
        ctxF.clearRect(0, 0, W, H);
        ctxF.save(); ctxF.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        for (const P of PALMS) if (P.big < 0.9) drawPalm(ctxF, P, t, w);
        for (const P of PALMS) if (P.big >= 0.9) drawPalm(ctxF, P, t, w);
        mark('palms');
        drawRain(ctxF, t);
        ctxF.restore();
        mark('rain');
        drawTone(ctxF);
        ctxF.drawImage(vigL.cv, 0, 0, W, H);
        mark('tone');
      }
      let prevTs = null, lastDrawTs = 0, lastDecide = 0, calmSince = 0, frameErr = false, warmTs = 0;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);
        if (!warmTs) warmTs = ts;
        const warming = ts - warmTs < 1200;
        if (warming){ perf.gapEma = 16.7; perf.costEma = 0; lastDecide = ts; calmSince = ts; }
        else if (prevTs !== null) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts; perf.drawn++;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!frameErr){ frameErr = true; console.error('maldives2 frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          lastDecide = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21;
          if (heavy){ perf.halfRate = true; calmSince = ts; }
          else if (perf.costEma > 4.5 || perf.gapEma > 19) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
        }
      }

      // ── clicks: the sun or the moon → tween the clock to the next key ──
      function nextKeyFrom(v){
        for (const K of KEYS) if (K.at > v + 0.01) return K.at;
        return KEYS[0].at + 1;
      }
      function tweenTo(to){ todTween = { from: tod, to, t0: lastT, dur: 2.2 }; }
      function onClick(e){
        if (e.target.closest(UI_SEL)) return;
        const dx = (e.clientX - OX) / S, dy = (e.clientY - OY) / S;
        const sp = sunPos(tod), mp = moonPos(tod);
        if (sp.up && L.daylight > 0.18 && Math.hypot(dx - sp.x, dy - sp.y) < 90){ tweenTo(nextKeyFrom(tod)); return; }
        if (mp.up && L.moon > 0.1 && Math.hypot(dx - mp.x, dy - mp.y) < 70){ tweenTo(nextKeyFrom(tod)); return; }
      }

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      window._mv2 = BACKGROUNDS.maldives2._test = {
        tod: () => tod,
        setTod: v => { tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed: v => { todSpeed = v; },
        phase: () => L.name,
        look: () => L,
        seek: s => { t0 = (t0 === null ? 0 : t0); t0 -= (s - lastT) * 1000; lastT = s; },
        storm: len => { STORM.phase = 'clear'; startStorm(lastT, len); },
        stormAt: (k, phase) => { STORM.k = STORM.target = k; STORM.rain = k; STORM.wind = k; STORM.phase = phase || (k > 0 ? 'peak' : 'clear'); STORM.t0 = lastT - 10; STORM.dur = 60; STORM.front = k > 0 ? 1 : 0; STORM.drift = 0; if (k === 0){ STORM.bolts.length = 0; DROPS.length = 0; STORM.rainbow = 0; } lookKey = -1; },
        clearStorm: () => { STORM.phase = 'fade'; STORM.t0 = lastT - STORM.dur + 8; },
        bolt: () => strike(lastT),
        stormState: () => ({ phase: STORM.phase, k: +STORM.k.toFixed(2), rain: +STORM.rain.toFixed(2), wind: +STORM.wind.toFixed(2), rainbow: +STORM.rainbow.toFixed(2), front: +STORM.front.toFixed(2), bolts: STORM.bolts.length, drops: DROPS.length, nextAt: +STORM.nextAt.toFixed(1), count: stormCount }),
        wind: () => wind(lastT),
        sun: () => sunPos(tod), moon: () => moonPos(tod),
        palms: () => PALMS.map(P => ({ x: P.x, h: P.h, fronds: P.crown ? P.crown.length : 0, spriteKB: P.crown ? Math.round(P.crown.reduce((s, F) => s + F.cv.width * F.cv.height * 4, 0) / 1024) : 0 })),
        // walkers: walk(name?, xFrac?) spawns one (xFrac → parked there for a still), fly(xFrac?) the ghost,
        // walkers() the live list, hold(b) freezes their movement, nextName() peeks the round-robin
        walk: (name, xFrac) => { const n = name || nextGround(); return n ? !!spawnWalker(n, xFrac) : false; },
        fly: xFrac => !!spawnWalker(FLYER, xFrac),
        walkers: () => WALKERS.map(Wk => ({ name: Wk.name, x: Math.round(Wk.x), dir: Wk.dir, state: Wk.state, hop: !!Wk.hop, gait: Wk.gaitOn, speed: Math.round(Wk.speed), h: Math.round(Wk.hpx), w: Math.round(Wk.w) })),
        hold: b => { holdWalkers = b !== false; },
        auto: b => { autoSpawn = b !== false; },
        // act(name, fn) calls a rig method on a live walker: act('squirtle','water'), act('pikachu','zap'), act('jigglypuff','sing') …
        act: (name, fn) => { const Wk = WALKERS.find(w => w.name === name); if (Wk && typeof Wk.inst[fn] === 'function'){ Wk.inst[fn](); return true; } return false; },
        clear: () => clearWalkers(),
        nextName: () => nextGround(),
        pokeReady: () => pokeReady,
        layout: () => ({ DW, k: +AXK.toFixed(3), palms: PALMS.map(P => Math.round(P.x)), islands: ISLANDS.map(I => Math.round(I.x)) }),
        perf: () => ({ dpr: +DPR.toFixed(2), DW, halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1), costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn, S: +S.toFixed(3) }),
        pmax: () => PMAX,
        prof: () => { const o = {}; for (const k in PROF) o[k] = (k === 'frames' || k === 'repaints' || k === 'crowns') ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; PROF.repaints = 0; PROF.crowns = 0; },
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        clearWalkers();
        if (window._mv2 === BACKGROUNDS.maldives2._test) delete window._mv2;
        stage.innerHTML = '';
      };
    },
  };
})();
