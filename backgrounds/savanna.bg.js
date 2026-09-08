/* ── Savanna — Pride Rock through a full DAY CYCLE ──────────────────────────
   The savanna scene, rebuilt from scratch around the from-scratch animal rigs
   (the previous sunset-only scene lives in git history). The whole day
   passes in DAY_SEC seconds through four looks — MORNING (soft pink dawn,
   the sun rising behind the left mountains), NOON (bright blue sky, small
   white sun high up, crisp colours), AFTERNOON (the golden sunset blaze, big
   orange sun sinking right, warm-tinted animals) and NIGHT (deep blue, moon,
   twinkling + shooting stars, fireflies, blue-lit animals). Looks are
   keyframes; every colour in the scene is interpolated across a soft
   transition window at each phase boundary, and the sky/scenery layers are
   repainted as the palette drifts. Sun and moon travel real arcs, ground
   shadows lean away from the sun.

   ANIMALS are the from-scratch rigs in backgrounds/savanna_animals/ (loaded
   on demand, relative to this file): the resident PRIDE on Pride Rock —
   lion, lioness, a medium lioness and a cub (ribbons) pacing the ridge —
   and roaming HERDS crossing the plain (zebra, ostrich, elephant, cheetah,
   giraffe, lionesses; 2–5 per herd, some young, per-individual tints, depth
   lanes, up to two herds at once). Every animal blinks, breathes and walks
   with its rig's gait; on a random schedule AND on click it performs its
   signature action (rig `pose`: roar / yawn / crouch / bray / graze /
   trumpet / head-bury), a jump or (rarer) a green toot from the rear with an
   embarrassed shimmy; the cheetah also chases its tail. The
   lion's roar adds shockwave rings + a screen shake; the elephant's trumpet
   adds sound rings. A ❤️ floats up when two pride members meet face to face.
   Click the SUN, the MOON or the WATERHOLE to fast-forward to the next part
   of the day.

   Ambient: drifting clouds, bird flocks by day, golden dust motes at
   sunset, a waterhole that catches the sun/moon, swaying foreground grass.
   "Rumi" (backgrounds/rumi/chibi-walker.js) strolls across the plain every
   2–4 minutes, first after 1–3 minutes of play.
   Docs: backgrounds/README.md. Registers window.BACKGROUNDS.savanna;
   init() mounts into the given stage and returns a cleanup. Test hooks:
   window._sav2. */
window.BACKGROUNDS = window.BACKGROUNDS || {};
(function(){
  const doc = document;
  const BASE = (function(){ const s = doc.currentScript; return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();
  const RIG_DIR = BASE + 'savanna_animals/';
  const RIG_FILES = [['LionRig', 'lion.js'], ['LionessRig', 'cats.js'], ['ZebraRig', 'zebra.js'],
                     ['GiraffeRig', 'giraffe.js'], ['ElephantRig', 'elephant.js'], ['OstrichRig', 'ostrich.js']];
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-sav2dep="' + globalName + '"]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = RIG_DIR + file; s.setAttribute('data-sav2dep', globalName);
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }
  function loadRigs(cb){
    needScript('SavRig', 'rig-common.js', () => {
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

  const TAU = Math.PI * 2;
  const DAY_SEC = 240;                       // a whole day; 60 s per phase
  const PHASE_NAMES = ['morning', 'noon', 'afternoon', 'night'];
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const mixN = (a, b, w) => a + (b - a) * w;
  function parseCol(c){
    if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
    const m = c.match(/[\d.]+/g).map(Number); return m.length === 3 ? [m[0], m[1], m[2], 1] : m;
  }
  function mixCol(c1, c2, w){
    if (w <= 0) return c1; if (w >= 1) return c2;
    const a = parseCol(c1), b = parseCol(c2);
    return 'rgba(' + Math.round(mixN(a[0], b[0], w)) + ',' + Math.round(mixN(a[1], b[1], w)) + ',' +
           Math.round(mixN(a[2], b[2], w)) + ',' + mixN(a[3], b[3], w).toFixed(3) + ')';
  }
  const rgbaOf = (arr, aMul) => 'rgba(' + Math.round(arr[0]) + ',' + Math.round(arr[1]) + ',' + Math.round(arr[2]) + ',' + (arr[3] * (aMul == null ? 1 : aMul)).toFixed(3) + ')';
  function lg(c, x1, y1, x2, y2, st){ const g = c.createLinearGradient(x1, y1, x2, y2); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function rg(c, x, y, r0, r1, st){ const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }

  // ── THE FOUR LOOKS (keyframes at each phase centre) ──────────────────────
  const LOOKS = [
    { // morning — a soft pink-violet dawn, long low light from the left
      sky: [[0, '#4a3d7d'], [0.45, '#c77c8f'], [0.8, '#f4b98a'], [1, '#fbe0b0']],
      sunCol: '#fff0c0', glow: 'rgba(255,220,170,.55)', sunR: 0.11,
      haze: 'rgba(250,200,170,.35)',
      mtnFar: '#7d6a9c', mtnNear: '#5a4a78', snow: '#f5e6ea',
      plainFar: '#b8a15e', plainMid: '#a58c48', plainNear: '#8a7238',
      rock: '#8a6a4a', rockD: '#5e4530', rockL: '#a8875f',
      tree: '#5c7a36', treeD: '#3f5a25', trunk: '#4a3520',
      grass: '#8fa04a', grassD: '#6e7d38', water: '#7fa9c9', cloud: '#fbe4d8',
      tint: [255, 200, 150, 0.06], starA: 0, daylight: 0.8,
    },
    { // noon — bright blue sky, a small white sun straight up, crisp colours
      sky: [[0, '#2f76d0'], [0.5, '#79b6ee'], [0.85, '#c6e2f7'], [1, '#e6f2fb']],
      sunCol: '#fffbe6', glow: 'rgba(255,255,230,.5)', sunR: 0.075,
      haze: 'rgba(220,235,250,.25)',
      mtnFar: '#8d9bb8', mtnNear: '#6b7592', snow: '#ffffff',
      plainFar: '#cdb463', plainMid: '#b99a48', plainNear: '#9a7c36',
      rock: '#a07a52', rockD: '#6e4f33', rockL: '#c39a6b',
      tree: '#5f8f36', treeD: '#3f6a24', trunk: '#5a3f26',
      grass: '#9db24a', grassD: '#7a8f38', water: '#5fa6d8', cloud: '#ffffff',
      tint: [255, 255, 255, 0], starA: 0, daylight: 1,
    },
    { // afternoon — the golden sunset blaze, big orange sun sinking right
      sky: [[0, '#3a1030'], [0.45, '#b53a2a'], [0.78, '#f08a3c'], [1, '#f7c25a']],
      sunCol: '#ffd27a', glow: 'rgba(255,190,90,.65)', sunR: 0.13,
      haze: 'rgba(255,150,80,.3)',
      mtnFar: '#7a4a52', mtnNear: '#4e2b33', snow: '#f7c9a8',
      plainFar: '#b06e33', plainMid: '#8e5327', plainNear: '#6e3f1e',
      rock: '#7a4a2e', rockD: '#4a2a18', rockL: '#a0663d',
      tree: '#3f2a1e', treeD: '#2c1c14', trunk: '#2a1a10',
      grass: '#8a5a2a', grassD: '#5e3c1c', water: '#e0905a', cloud: '#f6c1a8',
      tint: [255, 150, 70, 0.12], starA: 0.15, daylight: 0.7,
    },
    { // night — deep blue, moonlight, stars, fireflies
      sky: [[0, '#040817'], [0.5, '#0e1b3f'], [0.85, '#1d2e58'], [1, '#2b3d66']],
      sunCol: '#f4f1e0', glow: 'rgba(200,215,255,.35)', sunR: 0.06,
      haze: 'rgba(40,60,110,.3)',
      mtnFar: '#1e2544', mtnNear: '#12172e', snow: '#8b98c4',
      plainFar: '#2a3652', plainMid: '#20293f', plainNear: '#171d30',
      rock: '#2a2c44', rockD: '#161828', rockL: '#3a3d5a',
      tree: '#0f1626', treeD: '#0a0f1c', trunk: '#0b0e1a',
      grass: '#22304a', grassD: '#182338', water: '#1e3560', cloud: '#3a4670',
      tint: [30, 45, 110, 0.45], starA: 1, daylight: 0.15,
    },
  ];
  const P = 0.25, TW = 0.12;                 // phase length, transition window
  function phaseAt(tod){
    const k = Math.floor(tod / P) % 4, nb = (k + 1) * P, pb = k * P;
    if (tod > nb - TW / 2) return { a: k, b: (k + 1) % 4, w: smooth((tod - (nb - TW / 2)) / TW) };
    if (tod < pb + TW / 2) return { a: (k + 3) % 4, b: k, w: smooth((tod - (pb - TW / 2)) / TW) };
    return { a: k, b: k, w: 0 };
  }
  function lookAt(tod){
    const { a, b, w } = phaseAt(tod);
    if (w === 0 || a === b) return LOOKS[a];
    const A = LOOKS[a], B = LOOKS[b], out = {};
    for (const k in A){
      const va = A[k], vb = B[k];
      if (typeof va === 'number') out[k] = mixN(va, vb, w);
      else if (typeof va === 'string') out[k] = mixCol(va, vb, w);
      else if (typeof va[0] === 'number') out[k] = va.map((v, i) => mixN(v, vb[i], w));
      else out[k] = va.map((st, i) => [mixN(st[0], vb[i][0], w), mixCol(st[1], vb[i][1], w)]);
    }
    return out;
  }
  // sun arc: rises behind the left mountains at tod 0, peaks at the noon
  // keyframe (0.375), sets right as night begins (0.75); the moon rises at
  // dusk (0.72), peaks at the night keyframe (0.88) and sets just after dawn
  const sunP = tod => tod / 0.75;
  const moonP = tod => ((tod < 0.5 ? tod + 1 : tod) - 0.72) / 0.32;

  // the herd species (rig global, scene scale, speed in units/s, acts)
  // vent = where a toot comes out, in rig units behind (x) and above (y) the anchor
  const KINDS = {
    zebra:    { rig: 'ZebraRig',    sc: 0.80, speed: 26,  acts: ['pose', 'jump', 'fart'],         jumpH: 26, vent: [50, 56] },
    ostrich:  { rig: 'OstrichRig',  sc: 0.74, speed: 70,  acts: ['pose', 'jump', 'fart'],         jumpH: 30, vent: [30, 78] },
    elephant: { rig: 'ElephantRig', sc: 0.90, speed: 12,  acts: ['pose', 'fart'],                 vent: [62, 72] },
    cheetah:  { rig: 'CheetahRig',  sc: 0.78, speed: 120, acts: ['pose', 'jump', 'spin', 'fart'], jumpH: 34, vent: [46, 46] },
    giraffe:  { rig: 'GiraffeRig',  sc: 0.80, speed: 16,  acts: ['pose', 'fart'],                 vent: [40, 100] },
    lioness:  { rig: 'LionessRig',  sc: 0.86, speed: 30,  acts: ['pose', 'jump', 'fart'],         jumpH: 22, vent: [46, 48] },
  };
  const ACT_DUR = { pose: 1.7, jump: 0.8, spin: 2.2, fart: 1.5 };
  // the cliff's walkable top, left screen edge → overhanging tip (fractions)
  const RIDGE = [[0, 0.525], [0.08, 0.495], [0.18, 0.44], [0.29, 0.395], [0.37, 0.38]];

  window.BACKGROUNDS.savanna = {
    skin: 'savanna', aids: 'savanna',
    preload(){ loadRigs(function(){}); needRumi(function(){}); },
    init({ stage }){
      let stopped = false;
      stage.innerHTML = '';
      stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const DPR = Math.min(devicePixelRatio || 1, 2);
      let W, H, U;
      let skyL, sceneL, aniL, vigL, lookKey = -1;
      let tod = 0.12, todSpeed = 1, todTween = null;      // start in the morning
      let lastT = 0, rafId = null, t0 = null;
      let PRIDE = [], HERD = [], nextHerdAt = 0, lastKind = null, herdSeq = 0;
      let CLOUDS, STARS, BIRDS, MOTES, FLIES, GRASS, SHOOTERS = [], nextShootAt = 0;
      let RINGS = [], PUFFS = [], HEARTS = [], roar = null;
      let rumiLayer = null, rumiPatrol = null;              // the roaming "rumi" (see below)
      let curLook = LOOKS[0];

      function makeLayer(){
        const cv = doc.createElement('canvas');
        cv.width = W * DPR; cv.height = H * DPR;
        const cx = cv.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        return { cv, cx };
      }
      function ridgeY(x){
        const nx = x / W;
        for (let i = 1; i < RIDGE.length; i++){
          if (nx <= RIDGE[i][0]){
            const a = RIDGE[i - 1], b = RIDGE[i], f = (nx - a[0]) / (b[0] - a[0]);
            return H * (a[1] + f * (b[1] - a[1]));
          }
        }
        return H * RIDGE[RIDGE.length - 1][1];
      }

      // ── scene objects ──
      function buildScene(){
        U = Math.min(W, H) / 420;
        CLOUDS = Array.from({ length: 6 }, (_, i) => ({
          x: psr(i + 200) * W, y: H * (0.05 + psr(i + 210) * 0.24),
          s: 0.6 + psr(i + 220) * 0.9, spd: 4 + psr(i + 230) * 7,
        }));
        STARS = Array.from({ length: 70 }, (_, i) => ({
          x: psr(i * 2 + 5) * W, y: H * (0.01 + psr(i * 2 + 6) * 0.55),
          r: 0.6 + psr(i + 50) * 1.1, ph: psr(i + 70) * TAU, tw: 0.4 + psr(i + 80) * 1.2,
        }));
        BIRDS = Array.from({ length: 2 }, (_, i) => ({
          x: psr(i + 300) * W, y: H * (0.12 + psr(i + 310) * 0.2), spd: 18 + psr(i + 320) * 12,
          n: 4 + Math.floor(psr(i + 330) * 4), ph: psr(i + 340) * TAU,
        }));
        MOTES = Array.from({ length: 24 }, (_, i) => ({
          x: psr(i + 3) * W, y: H * (0.3 + psr(i + 41) * 0.6),
          r: 0.6 + psr(i + 7) * 1.4, sp: 4 + psr(i + 13) * 9, ph: psr(i + 23) * TAU,
        }));
        FLIES = Array.from({ length: 14 }, (_, i) => ({
          x: psr(i + 400) * W, y: H * (0.72 + psr(i + 410) * 0.22), ph: psr(i + 420) * TAU, sp: 0.4 + psr(i + 430) * 0.8,
        }));
        GRASS = Array.from({ length: 34 }, (_, i) => ({
          x: (i / 34) * W + psr(i) * 40, y: H * (0.93 + psr(i + 9) * 0.07),
          s: U * (0.5 + psr(i + 17) * 0.7), ph: psr(i + 31) * TAU,
        }));
        // the resident pride: paces the ridge from the left edge to the tip
        const mk = (kind, rigName, s, fx, o) => Object.assign({
          kind, rig: window[rigName], L: { x: W * fx, y: 0, s, dir: 1, ph: psr(fx * 97) * TAU, wt: 0, moving: false, pose: 0 },
          speed: 12, lo: W * 0.03, hi: W * 0.30, pauseUntil: 2 + psr(fx * 13) * 5, pMin: 3, pMax: 8,
          acts: ['pose'], jumpH: 20, yFn: ridgeY, nextActAt: 8 + psr(fx * 31) * 20, resident: true,
        }, o);
        PRIDE = [
          mk('lion',    'LionRig',    U * 0.90, 0.27, { speed: 12, acts: ['pose', 'fart'], vent: [46, 50], nextActAt: 40 + psr(1) * 50, lo: W * 0.15, hi: W * 0.30 }),
          mk('lioness', 'LionessRig', U * 0.90, 0.12, { speed: 11, acts: ['pose', 'jump', 'fart'], vent: [46, 48], jumpH: 20, lo: W * 0.03, hi: W * 0.22 }),
          mk('medlio',  'LionessRig', U * 0.62, 0.20, { speed: 13, acts: ['pose', 'jump', 'fart'], vent: [46, 48], jumpH: 18, lo: W * 0.06, hi: W * 0.32 }),
          mk('cub',     'LionessRig', U * 0.46, 0.06, { speed: 16, acts: ['pose', 'jump', 'fart'], vent: [46, 48], jumpH: 14, lo: W * 0.02, hi: W * 0.25, pMin: 2, pMax: 5 }),
        ];
        PRIDE[2].L.ribbon = true; PRIDE[3].L.ribbon = true;
        PRIDE[3].L.dir = -1;
        for (const a of PRIDE) a.L.y = ridgeY(a.L.x);
        HERD = []; nextHerdAt = 1.5; lastKind = null;
        RINGS = []; PUFFS = []; HEARTS = []; roar = null; SHOOTERS = [];
        window._sav2 = {
          tod: () => tod, setTod: v => { tod = ((v % 1) + 1) % 1; todTween = null; },
          setSpeed: v => { todSpeed = v; }, phase: () => PHASE_NAMES[Math.floor(tod / P) % 4],
          pride: () => PRIDE, herd: () => HERD, spawn: k => spawnHerd(lastT, k), act: (a, type) => startAct(a, type || 'pose', lastT),
          rumiLayer: () => rumiLayer,
        };
      }

      // ── static painting (repainted whenever the palette drifts) ──
      function paintSky(c, L){
        c.clearRect(0, 0, W, H);
        c.fillStyle = lg(c, 0, 0, 0, H * 0.78, L.sky.map(([p, col]) => [clamp(p, 0, 1), col]));
        c.fillRect(0, 0, W, H);
      }
      function mountainRange(c, baseY, amp, n, seed, col, snow){
        // peaks at regular x, a lower "saddle" point between each pair
        const pts = [], mids = [];
        for (let i = 0; i <= n; i++) pts.push([(i / n) * W, baseY - amp * (0.35 + 0.65 * psr(i + seed))]);
        for (let i = 1; i <= n; i++) mids[i] = [(pts[i - 1][0] + pts[i][0]) / 2, baseY - amp * 0.2 * (0.4 + psr(i * 7 + seed))];
        c.fillStyle = col;
        c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, baseY);
        for (let i = 0; i < pts.length; i++){
          if (i > 0) c.lineTo(mids[i][0], mids[i][1]);
          c.lineTo(pts[i][0], pts[i][1]);
        }
        c.lineTo(W + 10, baseY); c.lineTo(W + 10, H); c.closePath(); c.fill();
        if (snow){
          // a cap on each tall peak: its lower corners lie ON the two slopes
          // (the peak→saddle segments), so the snow hugs the mountain
          c.fillStyle = snow;
          for (let i = 1; i < n; i++){
            const [x, y] = pts[i]; if (baseY - y < amp * 0.72) continue;
            const h = (baseY - y) * 0.22, yc = y + h;
            const [xl, yl] = mids[i], [xr, yr] = mids[i + 1];
            const xL = x + (xl - x) * clamp(h / (yl - y), 0, 1), xR = x + (xr - x) * clamp(h / (yr - y), 0, 1);
            c.beginPath(); c.moveTo(x, y); c.lineTo(xR, yc);
            c.quadraticCurveTo(x + (xR - x) * 0.5, yc + h * 0.35, x + (xR - x) * 0.1, yc - h * 0.05);
            c.quadraticCurveTo(x + (xL - x) * 0.5, yc + h * 0.25, xL, yc);
            c.closePath(); c.fill();
          }
        }
      }
      function plainBand(c, yTop, col, wave, seed){
        c.fillStyle = col;
        c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, yTop);
        for (let x = 0; x <= W + 40; x += 40)
          c.lineTo(x, yTop + Math.sin(x * 0.004 + seed) * wave + Math.sin(x * 0.011 + seed * 3) * wave * 0.4);
        c.lineTo(W + 10, H); c.closePath(); c.fill();
      }
      function acacia(c, x, y, s, L){
        c.strokeStyle = L.trunk; c.lineCap = 'round';
        c.lineWidth = 3.2 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2 * s, y - 16 * s, x + 1 * s, y - 28 * s); c.stroke();
        c.lineWidth = 1.7 * s; c.beginPath();
        c.moveTo(x + 1 * s, y - 20 * s); c.lineTo(x - 11 * s, y - 31 * s);
        c.moveTo(x + 1 * s, y - 22 * s); c.lineTo(x + 13 * s, y - 32 * s); c.stroke();
        c.fillStyle = L.treeD; c.beginPath(); c.ellipse(x, y - 33 * s, 25 * s, 7 * s, 0, 0, TAU); c.fill();
        c.fillStyle = L.tree;  c.beginPath(); c.ellipse(x - 3 * s, y - 35.5 * s, 19 * s, 5 * s, 0, 0, TAU); c.fill();
      }
      function baobab(c, x, y, s, L){
        c.fillStyle = L.trunk;
        c.beginPath(); c.moveTo(x - 9 * s, y); c.quadraticCurveTo(x - 7 * s, y - 30 * s, x - 4 * s, y - 44 * s);
        c.lineTo(x + 4 * s, y - 44 * s); c.quadraticCurveTo(x + 7 * s, y - 30 * s, x + 9 * s, y); c.closePath(); c.fill();
        c.strokeStyle = L.trunk; c.lineWidth = 1.8 * s; c.lineCap = 'round'; c.beginPath();
        for (const [dx, dy] of [[-14, -14], [-6, -18], [5, -19], [14, -13]]){
          c.moveTo(x, y - 43 * s); c.lineTo(x + dx * s, y - 43 * s + dy * s);
        }
        c.stroke();
        c.fillStyle = L.treeD;
        for (const [dx, dy, r] of [[-14, -58, 9], [0, -63, 11], [14, -57, 9], [-6, -52, 8], [8, -52, 8]]){
          c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill();
        }
        c.fillStyle = L.tree;
        for (const [dx, dy, r] of [[-9, -60, 6], [4, -64, 7], [12, -59, 5]]){
          c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill();
        }
      }
      function bush(c, x, y, s, L){
        c.fillStyle = L.treeD;
        for (const [dx, dy, r] of [[-8, -4, 7], [0, -8, 9], [9, -4, 7]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
        c.fillStyle = L.tree;
        for (const [dx, dy, r] of [[-4, -7, 5], [5, -9, 5]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
      }
      function tuft(c, x, y, s, col){
        c.strokeStyle = col; c.lineWidth = 1.4 * s; c.lineCap = 'round'; c.beginPath();
        for (let k = -2; k <= 2; k++){ c.moveTo(x, y); c.quadraticCurveTo(x + k * 3 * s, y - 8 * s, x + k * 5 * s, y - 13 * s); }
        c.stroke();
      }
      function paintRock(c, L){
        const tipX = RIDGE[RIDGE.length - 1][0] * W, tipY = RIDGE[RIDGE.length - 1][1] * H;
        c.fillStyle = lg(c, 0, H * 0.36, 0, H * 0.76, [[0, L.rockL], [0.35, L.rock], [1, L.rockD]]);
        c.beginPath();
        c.moveTo(-10, H * 0.535);
        RIDGE.forEach(([fx, fy]) => c.lineTo(fx * W, fy * H));
        c.lineTo(tipX + W * 0.018, tipY + H * 0.02);                       // the tip's blunt nose
        c.quadraticCurveTo(W * 0.33, H * 0.47, W * 0.26, H * 0.50);        // underside of the overhang
        c.quadraticCurveTo(W * 0.225, H * 0.55, W * 0.235, H * 0.66);      // pillar front
        c.lineTo(W * 0.24, H * 0.78); c.lineTo(-10, H * 0.78);
        c.closePath(); c.fill();
        // shadow under the overhang + strata
        c.fillStyle = 'rgba(0,0,0,.18)';
        c.beginPath(); c.moveTo(tipX + W * 0.018, tipY + H * 0.02);
        c.quadraticCurveTo(W * 0.33, H * 0.47, W * 0.26, H * 0.50); c.quadraticCurveTo(W * 0.30, H * 0.44, tipX + W * 0.01, tipY + H * 0.03);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2; c.lineCap = 'round';
        for (let k = 0; k < 5; k++){
          const fy = 0.56 + k * 0.045;
          c.beginPath(); c.moveTo(W * (0.02 + psr(k) * 0.04), H * fy);
          c.quadraticCurveTo(W * 0.12, H * (fy - 0.01), W * (0.2 + psr(k + 3) * 0.03), H * (fy + 0.006)); c.stroke();
        }
        c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2.2;
        c.beginPath(); RIDGE.forEach(([fx, fy], i) => i ? c.lineTo(fx * W, fy * H + 1.5) : c.moveTo(fx * W, fy * H + 1.5)); c.stroke();
        // greenery on the rock
        bush(c, W * 0.06, H * 0.515, U * 0.6, L); tuft(c, W * 0.13, H * 0.468, U * 0.7, L.grass); tuft(c, W * 0.22, H * 0.42, U * 0.6, L.grass);
        tuft(c, W * 0.30, H * 0.392, U * 0.5, L.grass);
      }
      function paintScenery(c, L){
        c.clearRect(0, 0, W, H);
        // haze band at the horizon
        c.fillStyle = lg(c, 0, H * 0.48, 0, H * 0.68, [[0, 'rgba(0,0,0,0)'], [1, L.haze]]);
        c.fillRect(0, H * 0.48, W, H * 0.2);
        mountainRange(c, H * 0.665, H * 0.15, 11, 3, L.mtnFar, null);
        mountainRange(c, H * 0.675, H * 0.11, 8, 17, L.mtnNear, L.snow);
        plainBand(c, H * 0.66, L.plainFar, 2, 1);
        // far trees on the plain
        for (let i = 0; i < 7; i++) acacia(c, W * (0.30 + i * 0.105 + psr(i + 60) * 0.04), H * (0.70 + psr(i + 61) * 0.02), U * (0.42 + psr(i + 62) * 0.2), L);
        paintRock(c, L);
        // the waterhole
        const px = W * 0.64, py = H * 0.775, prx = W * 0.105, pry = H * 0.022;
        c.fillStyle = L.plainMid; c.beginPath(); c.ellipse(px, py, prx * 1.08, pry * 1.35, 0, 0, TAU); c.fill();
        c.fillStyle = lg(c, 0, py - pry, 0, py + pry, [[0, L.water], [1, mixCol(L.water, '#ffffff', 0.25)]]);
        c.beginPath(); c.ellipse(px, py, prx, pry, 0, 0, TAU); c.fill();
        plainBand(c, H * 0.79, L.plainMid, 3, 5);
        plainBand(c, H * 0.875, L.plainNear, 4, 9);
        // near flora (the game column sits lower-right; trees stay left/centre)
        baobab(c, W * 0.085, H * 0.895, U * 0.95, L);
        acacia(c, W * 0.86, H * 0.86, U * 0.9, L);
        bush(c, W * 0.40, H * 0.885, U * 0.8, L); bush(c, W * 0.72, H * 0.9, U * 0.7, L);
        for (let i = 0; i < 12; i++) tuft(c, W * psr(i + 500), H * (0.80 + psr(i + 510) * 0.1), U * (0.5 + psr(i + 520) * 0.5), L.grassD);
      }
      function paintVignette(c){
        c.clearRect(0, 0, W, H);
        c.fillStyle = rg(c, W / 2, H / 2, Math.min(W, H) * 0.45, Math.max(W, H) * 0.8, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,0,10,.35)']]);
        c.fillRect(0, 0, W, H);
      }
      function repaintIfNeeded(){
        const key = Math.floor(tod * 800);         // repaint as the palette drifts
        if (key === lookKey) return;
        lookKey = key; curLook = lookAt(tod);
        paintSky(skyL.cx, curLook); paintScenery(sceneL.cx, curLook);
      }

      // ── herds ──
      function spawnHerd(t, forceKind){
        const kinds = Object.keys(KINDS).filter(k => k !== lastKind && window[KINDS[k].rig]);
        if (!kinds.length) return;
        const kind = forceKind && KINDS[forceKind] ? forceKind : kinds[Math.floor(Math.random() * kinds.length)];
        lastKind = kind;
        const K = KINDS[kind], rig = window[K.rig];
        const adults = 1 + Math.floor(Math.random() * 3), young = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 0;
        const fromLeft = Math.random() < 0.5, dir = fromLeft ? 1 : -1;
        const baseSpeed = K.speed * (0.85 + Math.random() * 0.35);
        const hid = herdSeq++;
        for (let i = 0; i < adults + young; i++){
          const lane = Math.random();                          // 0 far … 1 near
          const sizeF = i < adults ? 1 : (Math.random() < 0.5 ? 0.62 : 0.5);
          const s = U * K.sc * sizeF * (0.84 + 0.26 * lane);
          const spacing = W * (0.06 + Math.random() * 0.05);
          const start = fromLeft ? -W * 0.08 - i * spacing : W * 1.08 + i * spacing;
          HERD.push({
            kind, rig, herdId: hid, entered: false,
            L: { x: start + (Math.random() - 0.5) * W * 0.02, y: H * (0.80 + lane * 0.13), s, dir,
                 ph: Math.random() * TAU, wt: Math.random() * TAU, moving: true, pose: 0,
                 tint: 0.86 + Math.random() * 0.28, ribbon: kind === 'lioness' && sizeF < 1 && Math.random() < 0.7 },
            speed: baseSpeed * (0.92 + Math.random() * 0.18), acts: K.acts, jumpH: K.jumpH || 24, vent: K.vent,
            nextActAt: t + 3 + Math.random() * 9,
          });
        }
      }
      function startAct(a, type, t){
        if (a.act) return;
        a.act = { type, t0: t };
        if (type === 'pose' && a.kind === 'lion') roar = { t0: t, a };
        if (type === 'pose' && a.kind === 'elephant')
          RINGS.push({ x: a.L.x + a.L.dir * 60 * a.L.s, y: a.L.y - 95 * a.L.s, t0: t + 0.5, s: a.L.s * 0.6, col: '200,215,255' });
      }
      function pickAct(a){
        const r = Math.random();
        if (r < 0.5) return 'pose';
        if (r < 0.62 && a.acts.includes('fart')) return 'fart';
        const others = a.acts.filter(k => k !== 'fart');
        return others[Math.floor(Math.random() * others.length)] || 'pose';
      }
      // returns the scene-level transform for the current act (and sets L.pose)
      function actFx(a, t){
        const L = a.L; L.pose = 0;
        if (!a.act) return null;
        const p = (t - a.act.t0) / ACT_DUR[a.act.type];
        if (p >= 1){ a.act = null; return null; }
        if (a.act.type === 'pose'){ L.pose = p; return { yOff: 0, rot: 0 }; }
        if (a.act.type === 'jump') return { yOff: -Math.sin(p * Math.PI) * a.jumpH * L.s, rot: -Math.sin(p * TAU) * 0.06 * L.dir };
        if (a.act.type === 'fart'){
          // embarrassed shimmy + soft green puffs drifting away from the rear
          if ((a.lastPuff || 0) < t - 0.16 && p < 0.55){
            a.lastPuff = t;
            const [vx, vy] = a.vent || [46, 50];
            PUFFS.push({ x: L.x - vx * L.s * L.dir, y: L.y - vy * L.s, dx: -L.dir * (7 + Math.random() * 8) * L.s,
                         t0: t, r: (6 + Math.random() * 5) * L.s, ph: Math.random() * TAU, green: true });
          }
          return { yOff: -Math.abs(Math.sin(p * Math.PI * 3)) * 3 * L.s, rot: Math.sin(p * 40) * 0.015 * (1 - p) * L.dir };
        }
        // spin: the cheetah chases its tail — about-faces, little bounces, dust
        if ((a.lastPuff || 0) < t - 0.28){
          a.lastPuff = t;
          PUFFS.push({ x: L.x + (Math.random() - 0.5) * 40 * L.s, y: L.y - 4 * L.s, dx: (Math.random() - 0.5) * 12 * L.s, t0: t, r: (8 + Math.random() * 5) * L.s });
        }
        return { yOff: -Math.abs(Math.sin(p * Math.PI * 6)) * 4 * L.s, rot: Math.sin(p * 30) * 0.03 * L.dir, flip: Math.cos(p * TAU * 2) >= 0 ? 1 : -1 };
      }
      function updatePride(a, t, dt){
        const L = a.L;
        if (!a.act && t >= a.nextActAt){ startAct(a, pickAct(a), t); a.nextActAt = t + (a.kind === 'lion' ? 60 + Math.random() * 60 : 10 + Math.random() * 25); }
        L.moving = t >= a.pauseUntil && !a.act;
        if (L.moving){
          L.wt += dt * (a.speed / 6) * 1.6;
          L.x += L.dir * a.speed * U * dt;
          L.y = a.yFn(L.x);
          if (L.x < a.lo){ L.dir = 1;  a.pauseUntil = t + a.pMin + psr(t) * (a.pMax - a.pMin); }
          if (L.x > a.hi){ L.dir = -1; a.pauseUntil = t + a.pMin + psr(t + 1) * (a.pMax - a.pMin); }
        }
      }
      function updateHerdMember(m, t, dt){
        const L = m.L;
        if (!m.act && m.entered && t >= m.nextActAt){ startAct(m, pickAct(m), t); m.nextActAt = t + 4 + Math.random() * 10; }
        L.moving = !m.act;
        if (L.moving){
          L.wt += dt * (m.speed / 6) * 1.6;
          L.x += L.dir * m.speed * U * dt;
        }
        if (L.x > 0 && L.x < W) m.entered = true;
      }
      function drawAnimal(c, a, t){
        const L = a.L, R = a.rig, fx = actFx(a, t);
        if (!fx){ R.draw(c, L, t); return; }
        c.save();
        if (fx.rot){ c.translate(L.x, L.y); c.rotate(fx.rot); c.translate(-L.x, -L.y); }
        const sy = L.y, sd = L.dir;
        L.y += fx.yOff; if (fx.flip) L.dir *= fx.flip;
        R.draw(c, L, t);
        L.y = sy; L.dir = sd;
        c.restore();
      }

      // ── dynamic sky things ──
      function drawStars(t, L){
        if (L.starA <= 0.01) return;
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
          ctx.fillStyle = 'rgba(255,250,235,' + (L.starA * tw).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        }
      }
      function celestial(){
        const sp = sunP(tod), mp = moonP(tod);
        const sun = (sp >= -0.02 && sp <= 1.02) ? { x: W * (0.42 + 0.50 * sp), y: H * (0.70 - 0.62 * Math.sin(Math.PI * clamp(sp, 0, 1))) } : null;
        const moon = (mp >= -0.02 && mp <= 1.02) ? { x: W * (0.30 + 0.55 * mp), y: H * (0.64 - 0.48 * Math.sin(Math.PI * clamp(mp, 0, 1))) } : null;
        return { sun, moon, sp, mp };
      }
      function drawSunMoon(L, cel){
        const R = Math.min(W, H) * L.sunR;
        if (cel.sun){
          const { x, y } = cel.sun;
          ctx.fillStyle = rg(ctx, x, y, R * 0.6, R * 4.2, [[0, L.glow], [1, 'rgba(255,200,120,0)']]);
          ctx.beginPath(); ctx.arc(x, y, R * 4.2, 0, TAU); ctx.fill();
          ctx.fillStyle = rg(ctx, x, y, 0, R, [[0, '#ffffff'], [0.6, L.sunCol], [1, mixCol(L.sunCol, '#ff9a3c', 0.35)]]);
          ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        }
        if (cel.moon && L.starA > 0.05){
          const { x, y } = cel.moon, r = Math.min(W, H) * 0.055, a = clamp(L.starA * 1.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = rg(ctx, x, y, r * 0.8, r * 3.5, [[0, 'rgba(200,215,255,.35)'], [1, 'rgba(200,215,255,0)']]);
          ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, TAU); ctx.fill();
          ctx.fillStyle = rg(ctx, x - r * 0.3, y - r * 0.3, r * 0.2, r, [[0, '#fbfaf2'], [1, '#d9d8c8']]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(160,160,150,.45)';
          for (const [dx, dy, rr] of [[-0.35, -0.2, 0.18], [0.25, 0.1, 0.13], [0.05, 0.45, 0.1], [0.4, -0.4, 0.08]]){
            ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      }
      function drawClouds(t, dt, L){
        ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * L.daylight;
        for (const c of CLOUDS){
          c.x += c.spd * dt; if (c.x - 140 * c.s > W) c.x = -140 * c.s;
          const s = c.s * U;
          ctx.fillStyle = mixCol(L.cloud, 'rgba(255,255,255,0)', 0.1);
          for (const [dx, dy, r] of [[-40, 6, 20], [-14, -8, 27], [16, -2, 24], [40, 8, 18], [0, 10, 22]]){
            ctx.beginPath(); ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = 'rgba(0,0,30,.06)';
          ctx.beginPath(); ctx.ellipse(c.x, c.y + 16 * s, 58 * s, 8 * s, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      function drawBirds(t, dt, L){
        const a = clamp(L.daylight - 0.2, 0, 1) * 0.8; if (a < 0.02) return;
        ctx.strokeStyle = 'rgba(40,25,20,' + a.toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        for (const f of BIRDS){
          f.x += f.spd * dt; if (f.x > W + 80) { f.x = -120; f.y = H * (0.1 + Math.random() * 0.22); }
          for (let i = 0; i < f.n; i++){
            const bx = f.x - i * 14 - (i % 2) * 6, by = f.y + i * 5 + Math.sin(t * 2 + f.ph + i) * 2;
            const flap = Math.sin(t * 6 + f.ph + i * 0.7) * 3;
            ctx.beginPath(); ctx.moveTo(bx - 6, by + flap); ctx.quadraticCurveTo(bx, by - 2, bx + 6, by + flap); ctx.stroke();
          }
        }
      }
      function drawShooters(t, L){
        if (L.starA > 0.6 && t >= nextShootAt){
          SHOOTERS.push({ x0: W * (0.1 + Math.random() * 0.8), y0: H * (0.03 + Math.random() * 0.25), dx: (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 200), dy: 90 + Math.random() * 80, t0: t, dur: 0.7 + Math.random() * 0.5 });
          nextShootAt = t + 5 + Math.random() * 9;
        }
        SHOOTERS = SHOOTERS.filter(s => t - s.t0 < s.dur);
        for (const s of SHOOTERS){
          const p = (t - s.t0) / s.dur, x = s.x0 + s.dx * p, y = s.y0 + s.dy * p;
          const g = ctx.createLinearGradient(x - s.dx * 0.18, y - s.dy * 0.18, x, y);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,' + (0.9 * (1 - p)).toFixed(3) + ')');
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - s.dx * 0.18, y - s.dy * 0.18); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      function drawMotes(t, L){
        const dusk = clamp(1 - Math.abs(tod - 0.625) / 0.14, 0, 1); if (dusk < 0.02) return;
        for (const m of MOTES){
          const x = m.x + Math.sin(t * 0.3 + m.ph) * 30, y = m.y - ((t * m.sp) % (H * 0.7));
          const yy = y < H * 0.25 ? y + H * 0.7 : y;
          ctx.fillStyle = 'rgba(255,220,150,' + (dusk * (0.35 + 0.35 * Math.sin(t * 2 + m.ph))).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, yy, m.r, 0, TAU); ctx.fill();
        }
      }
      function drawFireflies(t, L){
        const n = clamp((L.starA - 0.5) / 0.5, 0, 1); if (n < 0.02) return;
        for (const f of FLIES){
          const x = f.x + Math.sin(t * f.sp + f.ph) * 40 + Math.sin(t * 0.37 + f.ph * 2) * 60;
          const y = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 18;
          const bl = Math.pow(Math.max(0, Math.sin(t * 1.3 + f.ph * 3)), 3) * n;
          if (bl < 0.03) continue;
          ctx.fillStyle = rg(ctx, x, y, 0, 9, [[0, 'rgba(220,255,140,' + (0.9 * bl).toFixed(3) + ')'], [1, 'rgba(220,255,140,0)']]);
          ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
        }
      }
      function drawGrass(t, L){
        for (const g of GRASS){
          const sway = Math.sin(t * 1.6 + g.ph) * 2.2 * g.s;
          ctx.strokeStyle = L.grassD; ctx.lineWidth = 1.6 * g.s; ctx.lineCap = 'round'; ctx.beginPath();
          for (let k = -2; k <= 2; k++){ ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(g.x + k * 3 * g.s + sway * 0.5, g.y - 10 * g.s, g.x + k * 5.5 * g.s + sway, g.y - 17 * g.s); }
          ctx.stroke();
        }
      }
      function drawPond(L, cel){
        const px = W * 0.64, py = H * 0.775, prx = W * 0.105, pry = H * 0.022;
        const body = cel.sun || (cel.moon && L.starA > 0.3 ? cel.moon : null); if (!body) return;
        const a = cel.sun ? 0.22 * L.daylight : 0.25 * L.starA;
        ctx.save(); ctx.beginPath(); ctx.ellipse(px, py, prx, pry, 0, 0, TAU); ctx.clip();
        const rx = clamp(body.x, px - prx * 0.7, px + prx * 0.7);
        ctx.fillStyle = rg(ctx, rx, py, 0, prx * 0.5, [[0, 'rgba(255,250,220,' + a.toFixed(3) + ')'], [1, 'rgba(255,250,220,0)']]);
        ctx.fillRect(px - prx, py - pry, prx * 2, pry * 2);
        ctx.restore();
      }
      function drawFx(t){
        RINGS = RINGS.filter(r => t - r.t0 < 1.6 && t >= r.t0 - 0.6);
        for (const r of RINGS){
          if (t < r.t0) continue;
          const p = (t - r.t0) / 1.6;
          for (const k of [0, 0.22, 0.44]){
            const q = p * 1.2 - k; if (q <= 0 || q >= 1) continue;
            ctx.strokeStyle = 'rgba(' + r.col + ',' + (0.5 * (1 - q)).toFixed(3) + ')'; ctx.lineWidth = 3 * (1 - q) + 1;
            ctx.beginPath(); ctx.arc(r.x, r.y, (10 + q * 130) * r.s, 0, TAU); ctx.stroke();
          }
        }
        // puffs: brown dust (spin) and soft green toots (fart) — rise, drift, fade
        PUFFS = PUFFS.filter(p => t - p.t0 < (p.green ? 2.2 : 1.4));
        for (const p of PUFFS){
          const life = p.green ? 2.2 : 1.4, age = t - p.t0, q = age / life;
          if (p.green){
            const x = p.x + p.dx * age + Math.sin(t * 2 + p.ph) * 3, y = p.y - 16 * age, r = p.r * (1 + q * 1.6), al = 0.34 * (1 - q);
            ctx.fillStyle = rg(ctx, x, y, 0, r, [[0, 'rgba(178,232,140,' + al.toFixed(3) + ')'],
              [0.6, 'rgba(150,215,120,' + (al * 0.6).toFixed(3) + ')'], [1, 'rgba(140,205,110,0)']]);
            ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(190,150,100,' + (0.35 * (1 - q)).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(p.x + p.dx * q, p.y - 18 * q * (p.r / 10), p.r * (0.6 + q), 0, TAU); ctx.fill();
          }
        }
        HEARTS = HEARTS.filter(h => t - h.t0 < 1.6);
        for (const h of HEARTS){
          const age = (t - h.t0) / 1.6;
          ctx.save(); ctx.globalAlpha = 1 - age; ctx.font = (h.sz * (1 + age * 0.3)) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('❤️', h.x, h.y - 40 * age); ctx.restore();
        }
      }
      function checkHearts(t){
        for (let i = 0; i < PRIDE.length; i++) for (let j = i + 1; j < PRIDE.length; j++){
          const a = PRIDE[i], b = PRIDE[j], left = a.L.x <= b.L.x ? a : b, right = left === a ? b : a;
          if (!(left.L.dir > 0 && right.L.dir < 0)) continue;
          const gap = (right.L.x - right.rig.WIDTH * 0.7 * right.L.s) - (left.L.x + left.rig.WIDTH * 0.7 * left.L.s);
          const key = i + '-' + j;
          if (gap < 14 && gap > -30){
            if (!(HEARTS.some(h => h.key === key))){
              const s = Math.max(left.L.s, right.L.s);
              HEARTS.push({ key, t0: t, x: (left.L.x + right.L.x) / 2, y: Math.min(left.L.y, right.L.y) - 105 * s, sz: 18 * s });
            }
          }
        }
      }

      // ── the frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        // time of day (a tween after clicking the sun/moon)
        if (todTween){
          const p = clamp((t - todTween.t0) / todTween.dur, 0, 1);
          tod = (todTween.from + (todTween.to - todTween.from) * smooth(p)) % 1;
          if (p >= 1) todTween = null;
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        repaintIfNeeded();
        const L = curLook, cel = celestial();
        // roar shake
        const roarP = roar ? clamp((t - roar.t0) / 1.7, 0, 1) : 0;
        if (roar && roarP >= 1) roar = null;
        const shake = Math.sin(roarP * Math.PI) * 4;
        ctx.save();
        if (shake > 0.1) ctx.translate((psr(t * 53.7) - 0.5) * 2 * shake, (psr(t * 71.3) - 0.5) * 2 * shake);
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        drawStars(t, L); drawShooters(t, L); drawClouds(t, dt, L); drawSunMoon(L, cel); drawBirds(t, dt, L);
        ctx.drawImage(sceneL.cv, 0, 0, W, H);
        drawPond(L, cel);
        // herds: keep up to two crossing; spawn on a cadence
        const active = new Set(HERD.map(m => m.herdId)).size;
        if (t >= nextHerdAt && active < 2){ spawnHerd(t); nextHerdAt = t + 4 + Math.random() * 6; }
        for (const m of HERD) updateHerdMember(m, t, dt);
        HERD = HERD.filter(m => { if (!m.entered) return true; const pad = m.rig.WIDTH * m.L.s * 1.6 + 120; return m.L.x > -pad && m.L.x < W + pad; });
        for (const a of PRIDE) updatePride(a, t, dt);
        checkHearts(t);
        // roar rings follow the lion's head
        if (roar && roarP > 0.15 && !roar.rung){ roar.rung = true; RINGS.push({ x: roar.a.L.x + roar.a.L.dir * 36 * roar.a.L.s, y: roar.a.L.y - 80 * roar.a.L.s, t0: t, s: roar.a.L.s, col: '255,220,160' }); }
        // ground shadows lean away from the sun; fainter at night
        const all = PRIDE.concat(HERD).sort((a, b) => a.L.y - b.L.y);
        const shDx = cel.sun ? (0.5 - clamp(cel.sp, 0, 1)) * 26 : 0;
        for (const a of all){
          ctx.fillStyle = 'rgba(30,12,6,' + (0.12 + 0.2 * L.daylight).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(a.L.x + shDx * a.L.s * 0.5, a.L.y + 1.5 * a.L.s, a.rig.WIDTH * 0.95 * a.L.s, 6 * a.L.s, 0, 0, TAU); ctx.fill();
        }
        // animals on their own layer, tinted by the hour
        const ac = aniL.cx;
        ac.clearRect(0, 0, W, H);
        for (const a of all) drawAnimal(ac, a, t);
        if (L.tint[3] > 0.004){
          ac.save(); ac.globalCompositeOperation = 'source-atop'; ac.fillStyle = rgbaOf(L.tint); ac.fillRect(0, 0, W, H); ac.restore();
        }
        ctx.drawImage(aniL.cv, 0, 0, W, H);
        drawFx(t); drawGrass(t, L); drawFireflies(t, L); drawMotes(t, L);
        ctx.drawImage(vigL.cv, 0, 0, W, H);
        ctx.restore();
      }
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        renderFrame((ts - t0) / 1000);
        rafId = requestAnimationFrame(frame);
      }

      // ── layout / input ──
      function resize(){
        W = innerWidth; H = innerHeight;
        canvas.width = W * DPR; canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const keep = PRIDE.map(a => ({ a, fx: W ? a.L.x / W : 0 }));
        skyL = makeLayer(); sceneL = makeLayer(); aniL = makeLayer(); vigL = makeLayer();
        const first = !PRIDE.length;
        buildScene();
        if (!first) keep.forEach(({ fx }, i) => { PRIDE[i].L.x = fx * W; PRIDE[i].L.y = ridgeY(PRIDE[i].L.x); });
        paintVignette(vigL.cx); lookKey = -1; repaintIfNeeded();
      }
      const onClick = e => {
        if (stopped) return;
        if (e.target.closest && e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
        const mx = e.clientX, my = e.clientY;
        let hit = null;
        for (const a of PRIDE.concat(HERD)){
          const hw = a.rig.WIDTH * a.L.s, hh = a.rig.HEIGHT * a.L.s;
          if (mx > a.L.x - hw && mx < a.L.x + hw && my > a.L.y - hh && my < a.L.y + 8 * a.L.s) if (!hit || a.L.y > hit.L.y) hit = a;
        }
        if (hit){ if (!hit.act) startAct(hit, pickAct(hit), lastT); return; }
        // the sun, the moon — or the waterhole, which is never hidden behind the
        // game's panel — fast-forward to the next part of the day
        const cel = celestial(), R = Math.min(W, H) * 0.12;
        const pond = Math.pow((mx - W * 0.64) / (W * 0.115), 2) + Math.pow((my - H * 0.775) / (H * 0.035), 2) < 1;
        const body = (cel.sun && Math.hypot(mx - cel.sun.x, my - cel.sun.y) < R) ? 'sun'
                   : (cel.moon && curLook.starA > 0.05 && Math.hypot(mx - cel.moon.x, my - cel.moon.y) < R) ? 'moon'
                   : pond ? 'pond' : null;
        if (body && !todTween){
          const next = (Math.floor(tod / P) + 1) * P + P / 2;      // the next phase's centre
          todTween = { from: tod, to: next, t0: lastT, dur: 2.6 };
        }
      };

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      loadRigs(() => { if (!stopped && rafId === null){ resize(); rafId = requestAnimationFrame(frame); } });

      // ── "rumi" strolls across the plain every few minutes (in front of the
      //    herds; she brings her own blink / hearts / click reactions)
      rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, {
          height: '19vh', bottom: '5.5vh', duration: 16000, zIndex: 7,
          gapMin: 120000, gapMax: 240000,                 // reappears every 2–4 minutes
          startDelay: 60000 + Math.random() * 120000,     // first appears after 1–3 minutes of play
        });
      });

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (rumiPatrol) rumiPatrol.stop();
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        stage.innerHTML = '';
      };
    },
  };
})();
