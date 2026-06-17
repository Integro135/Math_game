/* ── Savanna background module — Pride Rock at sunset ───────────────────────
   The Lion King moment: a blazing savanna sunset, layered hazy plains with
   acacia silhouettes, and the iconic Pride Rock promontory. On the rock: a
   richly drawn LION (layered wind-blown mane, breathing, blinking amber
   eyes, swishing tufted tail) and a LIONESS at his side; a CHEETAH sits on
   the lower ledge (tear marks, ringed tail that flicks, spotted coat, ear
   twitches) and a second cheetah stands watch on the plain.
   Passing animals on the plain: a ZEBRA built on the unicorn rig (same
   silhouette + two-segment walking legs, striped & brush-maned) and a
   GIRAFFE, both patrolling with walk cycles, turn-arounds and grazing
   pauses. Ambient: drifting clouds, bird flocks, golden dust motes, and
   swaying foreground grass. Docs: backgrounds/README.md.
   Loaded on demand by game/js/bg-loader.js. Registers itself into the
   BACKGROUNDS registry; init() mounts the scene into the given stage layer
   and returns a cleanup that stops every loop and listener it created. */
window.BACKGROUNDS = window.BACKGROUNDS || {};
window.BACKGROUNDS.savanna = {
  skin: 'savanna',              // game look:  game/skins/savanna.skin.css
  aids: 'savanna',              // cheetah number line + amber fruit jar (aids/savanna.aids.js)
  init({stage}) {
  let stopped = false;
  stage.innerHTML = '';
  stage.style.overflow = 'hidden';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;
  let W, H, U;                                   // U = animal unit scale

  function lg(c, x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function rg(c, x,y,r1,r2,st){const g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function psr(i){ return Math.abs(Math.sin(i * 127.1) * 43758.545) % 1; }   // stable pseudo-random
  // cheaply darken/lighten a #rrggbb by a factor (used for per-animal coat
  // shade variety — far cheaper than ctx.filter, which we no longer use)
  function shade(hex, f){
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round((n >> 16) * f)));
    const g = Math.max(0, Math.min(255, Math.round((n >> 8 & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function makeLayer(){
    const cv = document.createElement('canvas');
    cv.width = W * DPR; cv.height = H * DPR;
    const cx = cv.getContext('2d');
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv, cx };
  }

  // ── Scene state ──
  let staticLayer, vigLayer, GRASS, MOTES, FARTS, STARS, CLOUDS;
  let SUN, SUNSPOTS, sunBoostT = null, sunSpin = 0;   // click the sun → it spins
  let SHOOTERS = [], nextShootAt = 0;                 // shooting stars (meteors)
  let SKYUNI = null;                                  // click the sun → a unicorn flies by
  // the lion roars only on a slow cadence (persists across resize): once every
  // 5 minutes, OR every 5th click on the lion
  const ROAR_EVERY_SEC = 300, ROAR_EVERY_CLICKS = 5;
  let roarClicks = 0, roarTimerStart = null, roarPending = false;
  let LION, LIONESS, CUB, MEDLIO;         // the resident cliff pride (permanent)
  let HERD = [], nextHerdAt = 0, lastHerdType = null, herdSeq = 0;  // roaming plain herds

  // the cliff's walkable top, from the left screen edge to the overhanging
  // tip — piecewise-linear along the rock's upper contour (paintPrideRock).
  // The whole pride patrols this; their feet ride the surface via yFn.
  function ridgeY(x){
    const nx = x / W;
    const pts = [[0.00, 0.545], [0.07, 0.52], [0.166, 0.433], [0.255, 0.372], [0.40, 0.355]];
    for (let i = 1; i < pts.length; i++){
      if (nx <= pts[i][0]){
        const a = pts[i - 1], b = pts[i];
        const f = (nx - a[0]) / (b[0] - a[0]);
        return H * (a[1] + f * (b[1] - a[1]));
      }
    }
    return H * pts[pts.length - 1][1];
  }

  function buildScene(){
    U = Math.min(W, H) / 420;

    GRASS = Array.from({length: 30}, (_, i) => ({
      x: (i / 30) * W + psr(i) * 40,
      y: H * (0.92 + psr(i + 9) * 0.08),
      s: U * (0.5 + psr(i + 17) * 0.7),
      ph: psr(i + 31) * TAU,
    }));
    MOTES = Array.from({length: 26}, (_, i) => ({
      x: psr(i + 3) * W, y: H * (0.3 + psr(i + 41) * 0.6),
      r: 0.6 + psr(i + 7) * 1.4, sp: 4 + psr(i + 13) * 9, ph: psr(i + 23) * TAU,
    }));
    // a few early stars in the dark upper sky (away from the low sun's glare),
    // gently twinkling — drawn per-frame so clouds can drift over them.
    SHOOTERS = []; nextShootAt = 2 + psr(7) * 3;
    // puffy drifting clouds (ported from the unicorns scene), warm-tinted
    CLOUDS = Array.from({length: 6}, (_, i) => ({
      x: psr(i + 200) * W,
      y: H * (0.05 + psr(i + 210) * 0.22),
      s: 0.55 + psr(i + 220) * 0.9,
      spd: 5 + psr(i + 230) * 8,
      tint: psr(i + 240),
    }));
    STARS = Array.from({length: 32}, (_, i) => {
      const x = psr(i * 2 + 5) * W;
      // fade out toward the bright sun side (right) and lower sky
      const yf = 0.015 + psr(i * 2 + 6) * 0.205;
      return {
        x, y: H * yf,
        r: 0.6 + psr(i + 50) * 1.1,
        ph: psr(i + 70) * TAU,
        tw: 0.4 + psr(i + 80) * 1.1,
        // dimmer near the sun (x ~ 0.70W) and near the haze line
        base: (0.45 + 0.55 * Math.min(1, Math.abs(x / W - 0.7) / 0.4)) *
              (1 - yf / 0.26),
      };
    });

    // ── the resident pride: lions on the cliff. They never leave or change. ──
    // acts (borrowed from the unicorn valley): jump / rear-up / a green toot.
    // the whole pride paces the full ridge — from the left screen border
    // (lo) to the overhanging tip (hi), turning around at each end.
    LION    = { x: W * 0.31, y: ridgeY(W * 0.31), s: U * 1.00, dir: 1, ph: 0.0,
                speed: 13, lo: W * 0.04, hi: W * 0.34, pauseUntil: 6, wt: 0,
                pMin: 3, pMax: 8, acts: ['rear', 'fart'], rearPiv: -32,
                ventX: 46, ventY: 48, hitW: 64, hitH: 112, yFn: ridgeY };
    LIONESS = { x: W * 0.185, y: ridgeY(W * 0.185), s: U * 0.74, dir: 1, ph: 2.2,
                speed: 11, lo: W * 0.04, hi: W * 0.34, pauseUntil: 3, wt: 0,
                pMin: 3, pMax: 7, acts: ['jump', 'roll', 'fart'], jumpH: 24,
                ventX: 46, ventY: 44, hitW: 60, hitH: 100, yFn: ridgeY };
    // a lion cub — a small lioness — friskier, pacing the same ridge
    CUB     = { x: W * 0.300, y: ridgeY(W * 0.300), s: U * 0.44, dir: -1, ph: 1.3,
                speed: 16, lo: W * 0.04, hi: W * 0.34, pauseUntil: 2, wt: 0,
                pMin: 2, pMax: 5, acts: ['jump', 'roll', 'fart'], jumpH: 14,
                ventX: 46, ventY: 44, hitW: 60, hitH: 100, yFn: ridgeY };
    // a medium-sized lioness — between the grown lioness and the cub
    MEDLIO  = { x: W * 0.240, y: ridgeY(W * 0.240), s: U * 0.60, dir: 1, ph: 3.6,
                speed: 12, lo: W * 0.04, hi: W * 0.34, pauseUntil: 5, wt: 0,
                pMin: 3, pMax: 7, acts: ['jump', 'roll', 'fart'], jumpH: 20,
                ventX: 46, ventY: 44, hitW: 60, hitH: 100, yFn: ridgeY };

    // ── the plain is crossed by HERDS, one species at a time: a random group
    //    (3–10, some cub-sized) enters from a side, ambles across and exits;
    //    then a different herd arrives. (see HERD_KINDS / spawnHerd / the loop)
    HERD = [];  nextHerdAt = 0;  lastHerdType = null;  herdSeq = 0;
    // the sun — geometry stored for click-to-spin; surface spots for the spin
    SUN = { x: W * 0.70, y: H * 0.50, r: Math.min(W, H) * 0.155 };
    SUNSPOTS = Array.from({ length: 6 }, (_, i) => ({
      rad: 0.18 + psr(i + 300) * 0.6, ang: psr(i + 311) * TAU,
      rx: 0.07 + psr(i + 322) * 0.1, ry: 0.05 + psr(i + 333) * 0.08,
    }));
    sunBoostT = null; sunSpin = 0;
    FARTS = [];
    // debug/automation handle (harness): the resident pride + the live herd
    window._savAnimals = { LION, LIONESS, CUB, MEDLIO, herd: () => HERD,
                           shooters: () => SHOOTERS, starCount: () => STARS.length };
  }

  // ── Static scenery ─────────────────────────────────────────────────────────
  function drawAcacia(c, x, y, s, col){
    c.strokeStyle = col; c.lineWidth = s * 2.4; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + s * 2, y - s * 16, x - s * 4, y - s * 26);
    c.moveTo(x + s * 1, y - s * 12);
    c.quadraticCurveTo(x + s * 8, y - s * 20, x + s * 13, y - s * 25);
    c.stroke();
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x - s * 4,  y - s * 28, s * 16, s * 3.6, -0.05, 0, TAU);
    c.ellipse(x + s * 11, y - s * 27, s * 11, s * 3.0,  0.06, 0, TAU);
    c.fill();
  }

  // ── more flora: a few distinct tree & plant species for variety ──
  function drawBaobab(c, x, y, s){
    // the iconic swollen "bottle" trunk
    c.fillStyle = '#3c2113';
    c.beginPath();
    c.moveTo(x - s * 7, y);
    c.quadraticCurveTo(x - s * 9, y - s * 18, x - s * 3, y - s * 29);
    c.lineTo(x + s * 3, y - s * 29);
    c.quadraticCurveTo(x + s * 9, y - s * 18, x + s * 7, y);
    c.closePath(); c.fill();
    // stubby root-like branches splaying from the crown
    c.strokeStyle = '#3c2113'; c.lineWidth = s * 2.0; c.lineCap = 'round';
    c.beginPath();
    for (const ex of [-11, -6, 0, 6, 11]){ c.moveTo(x, y - s * 28); c.lineTo(x + ex * s, y - s * 40); }
    c.stroke();
    // sparse leaf clumps at the branch tips
    c.fillStyle = 'rgba(74,92,42,.9)';
    for (const [dx, dy] of [[-11, -41], [-6, -43], [0, -44], [6, -43], [11, -41]]){
      c.beginPath(); c.ellipse(x + dx * s, y + dy * s, s * 3.2, s * 2.1, 0, 0, TAU); c.fill();
    }
    // warm rim on the sun side
    c.strokeStyle = 'rgba(255,182,92,.4)'; c.lineWidth = s * 0.9;
    c.beginPath(); c.moveTo(x + s * 7, y);
    c.quadraticCurveTo(x + s * 9, y - s * 18, x + s * 3, y - s * 29); c.stroke();
  }
  function drawRoundTree(c, x, y, s){
    // a lush round-canopy tree (fig / marula) on a slim trunk
    c.strokeStyle = '#2c1a10'; c.lineWidth = s * 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s * 15); c.stroke();
    c.fillStyle = '#21331a';
    c.beginPath(); c.arc(x, y - s * 23, s * 12, 0, TAU); c.fill();
    c.fillStyle = '#2d4522';
    for (const [dx, dy, r] of [[-6, -2, 7], [6, -1, 7], [0, -9, 8], [-7, -8, 5], [7, -7, 5]]){
      c.beginPath(); c.arc(x + dx * s, y - s * 23 + dy * s, s * r, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,190,100,.28)';
    c.beginPath(); c.arc(x + s * 6, y - s * 27, s * 6, 0, TAU); c.fill();
  }
  function drawPalm(c, x, y, s){
    // a doum palm: a curved trunk topped with a burst of fronds
    c.strokeStyle = '#2c1a10'; c.lineWidth = s * 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + s * 2, y - s * 16, x, y - s * 28); c.stroke();
    const tx = x, ty = y - s * 28;
    c.strokeStyle = '#2f4a24'; c.lineWidth = s * 1.4;
    for (const a of [-2.9, -2.4, -1.9, -1.4, -1.0, -0.6]){
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * s * 7, ty + Math.sin(a) * s * 7,
                         tx + Math.cos(a) * s * 13, ty + Math.sin(a) * s * 13 + s * 3);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,190,100,.25)';
    c.beginPath(); c.arc(tx, ty, s * 2.2, 0, TAU); c.fill();
  }
  function drawAloe(c, x, y, s){
    // a succulent rosette with little orange flower spikes
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++){
      const a = -Math.PI + (i / 8) * Math.PI;
      const len = s * (7 + (i % 2) * 2);
      c.strokeStyle = i % 2 ? '#3d6149' : '#4f7a5a'; c.lineWidth = s * 1.8;
      c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.9); c.stroke();
    }
    c.strokeStyle = '#c8531f'; c.lineWidth = s * 1.4;
    c.beginPath();
    c.moveTo(x - s * 1.5, y); c.lineTo(x - s * 3, y - s * 11);
    c.moveTo(x + s * 1.5, y); c.lineTo(x + s * 3.5, y - s * 10); c.stroke();
    c.fillStyle = '#e8702a';
    c.beginPath();
    c.ellipse(x - s * 3, y - s * 11, s * 1.4, s * 2.4, 0, 0, TAU);
    c.ellipse(x + s * 3.5, y - s * 10, s * 1.4, s * 2.4, 0, 0, TAU); c.fill();
  }
  function drawTallGrass(c, x, y, s){
    // a golden grass tussock with seed heads
    c.lineCap = 'round';
    for (let b = 0; b < 7; b++){
      const off = (b - 3) * 1.6 * s;
      const lean = (b - 3) * 0.18 + (psr(b + x) - 0.5) * 0.2;
      const h = s * (13 + (b % 3) * 4);
      c.strokeStyle = b % 2 ? '#b07d22' : '#caa03a'; c.lineWidth = s * 1.1;
      c.beginPath(); c.moveTo(x + off, y);
      c.quadraticCurveTo(x + off + lean * h * 0.5, y - h * 0.6, x + off + lean * h, y - h);
      c.stroke();
      c.fillStyle = '#e6c463';
      c.beginPath(); c.ellipse(x + off + lean * h, y - h, s * 0.9, s * 2.2, lean, 0, TAU); c.fill();
    }
  }
  function paintFlora(c){
    // a baobab anchoring the left of the plain
    drawBaobab(c, W * 0.085, H * 0.905, U * 1.7);
    // lush round trees back-left and far right
    drawRoundTree(c, W * 0.255, H * 0.815, U * 1.15);
    drawRoundTree(c, W * 0.965, H * 0.86, U * 1.35);
    // a doum palm near the rock base
    drawPalm(c, W * 0.345, H * 0.80, U * 1.0);
    // aloe rosettes dotted across the plain
    drawAloe(c, W * 0.20, H * 0.935, U * 1.2);
    drawAloe(c, W * 0.55, H * 0.965, U * 1.1);
    drawAloe(c, W * 0.90, H * 0.95, U * 1.0);
    // green bushes (Task-1 helper, reused on the plain)
    drawBush(c, W * 0.42, H * 0.935, U * 4.2);
    drawBush(c, W * 0.72, H * 0.905, U * 3.6);
    drawBush(c, W * 0.02, H * 0.965, U * 5.0);
    // golden tall-grass tussocks in the foreground
    drawTallGrass(c, W * 0.30, H * 0.985, U * 1.4);
    drawTallGrass(c, W * 0.62, H * 0.99,  U * 1.5);
    drawTallGrass(c, W * 0.83, H * 0.97,  U * 1.3);
    drawTallGrass(c, W * 0.10, H * 0.99,  U * 1.4);
  }

  // distant mountain ranges on the horizon — hazy sunset silhouettes, layered
  // for depth, with snow-capped peaks, sitting behind the far plains.
  function drawMountains(c){
    const ranges = [
      { base: 0.715, amp: 0.15, col: '#5a2742', n: 5, seed: 1,  haze: 0.55, snow: 0.5 },
      { base: 0.730, amp: 0.10, col: '#7c3640', n: 7, seed: 30, haze: 0.72, snow: 0.62 },
    ];
    for (const r of ranges){
      const seg = W / r.n;
      const peaks = [], vals = [];
      for (let i = 0; i <= r.n; i++)
        peaks.push([i * seg + (psr(i + r.seed) - 0.5) * seg * 0.4,
                    H * (r.base - r.amp * (0.55 + psr(i + r.seed * 2) * 0.45))]);
      for (let i = 1; i <= r.n; i++)
        vals.push([peaks[i][0] - seg * 0.5, H * (r.base - r.amp * 0.12 * psr(i + r.seed + 3))]);
      c.save();
      c.globalAlpha = r.haze;
      // the mountain silhouette
      c.fillStyle = r.col;
      c.beginPath();
      c.moveTo(0, H * r.base);
      for (let i = 0; i <= r.n; i++){
        if (i > 0) c.lineTo(vals[i - 1][0], vals[i - 1][1]);
        c.lineTo(peaks[i][0], peaks[i][1]);
      }
      c.lineTo(W, H * r.base);
      c.closePath(); c.fill();
      // snow caps on the peaks (a droopy snow-line below each summit)
      c.fillStyle = `rgba(245,248,255,${r.snow})`;
      for (let i = 0; i <= r.n; i++){
        const pk = peaks[i];
        const lv = vals[i - 1] || [pk[0] - seg * 0.5, pk[1] + H * r.amp * 0.3];
        const rv = vals[i]     || [pk[0] + seg * 0.5, pk[1] + H * r.amp * 0.3];
        const f = 0.42;                                  // how far down the snow reaches
        const lb = [pk[0] + (lv[0] - pk[0]) * f, pk[1] + (lv[1] - pk[1]) * f];
        const rb = [pk[0] + (rv[0] - pk[0]) * f, pk[1] + (rv[1] - pk[1]) * f];
        const mid = [(lb[0] + rb[0]) / 2, Math.max(lb[1], rb[1]) + H * 0.012];
        c.beginPath();
        c.moveTo(pk[0], pk[1]);
        c.lineTo(lb[0], lb[1]);
        c.quadraticCurveTo(mid[0], mid[1], rb[0], rb[1]);
        c.closePath(); c.fill();
      }
      c.restore();
    }
  }

  function paintScene(c){
    // blazing sunset sky
    c.fillStyle = lg(c, 0, 0, 0, H * 0.78, [
      [0, '#33102e'], [0.22, '#6d2030'], [0.45, '#b3402a'],
      [0.65, '#e07028'], [0.82, '#f59c3c'], [1, '#ffc568'],
    ]);
    c.fillRect(0, 0, W, H * 0.78);

    // the great low sun
    const sx = W * 0.70, sy = H * 0.50, sr = Math.min(W, H) * 0.155;
    c.fillStyle = rg(c, sx, sy, sr * 0.2, sr * 3.6, [
      [0, 'rgba(255,210,120,.55)'], [0.4, 'rgba(255,160,70,.18)'], [1, 'rgba(255,140,60,0)'],
    ]);
    c.fillRect(0, 0, W, H);
    c.fillStyle = rg(c, sx, sy, sr * 0.1, sr, [
      [0, '#fff3cd'], [0.7, '#ffd470'], [1, '#ffae45'],
    ]);
    c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();

    // distant mountains, silhouetted against the sky/sun
    drawMountains(c);

    // (clouds are no longer baked into the static layer — they DRIFT now,
    //  drawn per-frame by drawClouds(t) in the render loop)

    // hazy far plains + tiny acacias
    c.fillStyle = '#8a4030';
    c.beginPath();
    c.moveTo(0, H * 0.70);
    for (let x = 0; x <= W; x += 60) c.lineTo(x, H * 0.70 + Math.sin(x * 0.004) * H * 0.012);
    c.lineTo(W, H * 0.78); c.lineTo(0, H * 0.78); c.closePath(); c.fill();
    for (let i = 0; i < 5; i++)
      drawAcacia(c, W * (0.45 + i * 0.13) + psr(i + 5) * 40, H * 0.715, U * 0.5, 'rgba(80,30,24,.85)');

    // the cliff rises from BEHIND the savanna ground — drawn before the plain
    // so the foreground ground covers its base; the animals then walk on the
    // ground IN FRONT of the rock, instead of appearing embedded in it.
    paintPrideRock(c);

    // the main savanna plain (foreground ground — covers the rock's base)
    c.fillStyle = lg(c, 0, H * 0.72, 0, H, [
      [0, '#a25c2c'], [0.4, '#8a4a22'], [1, '#5a2c14'],
    ]);
    c.beginPath();
    c.moveTo(0, H * 0.74);
    for (let x = 0; x <= W; x += 50) c.lineTo(x, H * 0.74 + Math.sin(x * 0.006 + 2) * H * 0.01);
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    // warm light pooling under the sun
    c.fillStyle = rg(c, sx, H * 0.78, 0, W * 0.4, [
      [0, 'rgba(255,170,80,.20)'], [1, 'rgba(255,170,80,0)'],
    ]);
    c.fillRect(0, H * 0.7, W, H * 0.3);
    // big acacia on the right plain
    drawAcacia(c, W * 0.86, H * 0.86, U * 1.5, '#2e1410');

    paintFlora(c);
    // sparse dry-grass strokes on the plain
    c.strokeStyle = 'rgba(220,150,70,.20)'; c.lineWidth = 1;
    for (let i = 0; i < 60; i++){
      const gx = W * (0.42 + psr(i + 101) * 0.58), gy = H * (0.76 + psr(i + 111) * 0.22);
      c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 2, gy - 6 - psr(i) * 6); c.stroke();
    }
  }

  // the iconic promontory, lit from the sun on the right
  function paintPrideRock(c){
    const tipX = W * 0.40, tipY = H * 0.355;
    // back stack silhouettes — flush to the left edge (runs off-screen so its
    // start is hidden)
    c.fillStyle = '#33232c';
    c.beginPath();
    c.moveTo(-W * 0.03, H * 0.84);
    c.lineTo(-W * 0.03, H * 0.50);
    c.quadraticCurveTo(W * 0.06, H * 0.47, W * 0.12, H * 0.49);
    c.quadraticCurveTo(W * 0.18, H * 0.51, W * 0.20, H * 0.60);
    c.lineTo(W * 0.22, H * 0.84);
    c.closePath(); c.fill();
    // the main slab — its left flank runs off the left edge (no visible start),
    // rising to the overhanging tip on the right
    const rockG = lg(c, 0, tipY, 0, H * 0.88, [
      [0, '#9a6638'], [0.32, '#7c4d2b'], [0.64, '#543421'], [1, '#332430'],
    ]);
    c.fillStyle = rockG;
    c.beginPath();
    c.moveTo(-W * 0.03, H * 0.90);
    c.lineTo(-W * 0.03, H * 0.55);
    c.lineTo(W * 0.07, H * 0.52);
    c.quadraticCurveTo(W * 0.17, H * 0.42, W * 0.255, H * 0.372);
    c.lineTo(tipX, tipY);                          // the very tip
    c.lineTo(tipX - W * 0.012, tipY + H * 0.035);  // underside of the point
    c.quadraticCurveTo(W * 0.30, H * 0.46, W * 0.225, H * 0.52);
    c.quadraticCurveTo(W * 0.16, H * 0.575, W * 0.135, H * 0.66);
    c.lineTo(W * 0.10, H * 0.86);
    c.closePath(); c.fill();
    // model the rock: warm sun light from the right, cool shadow on the left,
    // layered strata and a soft shadow under the overhang — clipped to the slab
    c.save(); c.clip();
    c.fillStyle = lg(c, -W * 0.03, 0, W * 0.42, 0, [
      [0, 'rgba(28,18,34,.5)'], [0.5, 'rgba(70,42,28,0)'], [1, 'rgba(255,168,86,.42)'],
    ]);
    c.fillRect(-W * 0.05, H * 0.33, W * 0.5, H * 0.62);
    c.strokeStyle = 'rgba(38,22,16,.18)'; c.lineWidth = U * 1.8; c.lineCap = 'round';
    for (let i = 0; i < 4; i++){
      const yy = H * (0.56 + i * 0.075);
      c.beginPath();
      c.moveTo(-W * 0.03, yy);
      c.quadraticCurveTo(W * 0.12, yy - H * 0.02, W * 0.24, yy + H * 0.01);
      c.stroke();
    }
    c.fillStyle = 'rgba(24,14,12,.4)';            // shadow beneath the overhanging tip
    c.beginPath();
    c.moveTo(tipX - W * 0.012, tipY + H * 0.035);
    c.quadraticCurveTo(W * 0.30, H * 0.46, W * 0.225, H * 0.52);
    c.quadraticCurveTo(W * 0.27, H * 0.45, tipX - W * 0.03, tipY + H * 0.03);
    c.closePath(); c.fill();
    c.restore();
    // support column under the slab
    c.fillStyle = lg(c, W * 0.13, 0, W * 0.225, 0, [[0, '#281a20'], [1, '#6e4327']]);
    c.beginPath();
    c.moveTo(W * 0.155, H * 0.50);
    c.lineTo(W * 0.21, H * 0.475);
    c.lineTo(W * 0.225, H * 0.86);
    c.lineTo(W * 0.135, H * 0.86);
    c.closePath(); c.fill();
    // the lower ledge (the cheetah's spot)
    c.fillStyle = '#6e4527';
    c.beginPath();
    c.moveTo(W * 0.035, H * 0.625);
    c.quadraticCurveTo(W * 0.10, H * 0.575, W * 0.175, H * 0.59);
    c.lineTo(W * 0.185, H * 0.64);
    c.quadraticCurveTo(W * 0.10, H * 0.615, W * 0.045, H * 0.665);
    c.closePath(); c.fill();
    // sun-kissed edges
    c.strokeStyle = 'rgba(255,160,80,.6)'; c.lineWidth = U * 1.4; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(W * 0.07, H * 0.52);
    c.quadraticCurveTo(W * 0.17, H * 0.42, W * 0.255, H * 0.372);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = 'rgba(255,150,75,.35)';
    c.beginPath();
    c.moveTo(W * 0.045, H * 0.625);
    c.quadraticCurveTo(W * 0.10, H * 0.575, W * 0.175, H * 0.59);
    c.stroke();
    // cracks
    c.strokeStyle = 'rgba(20,8,4,.45)'; c.lineWidth = U * 0.8;
    for (let i = 0; i < 4; i++){
      const cx2 = W * (0.06 + i * 0.05), cy2 = H * (0.56 + psr(i + 121) * 0.1);
      c.beginPath();
      c.moveTo(cx2, cy2);
      c.lineTo(cx2 + W * 0.012, cy2 + H * 0.06 + psr(i) * H * 0.04);
      c.stroke();
    }
    // ── green vegetation clinging to the rock: low shrubs + grass tufts,
    //    sunset-lit on their right edge so they sit in the scene's light ──
    rockGreens(c);
  }

  // a small rounded bush (clumped foliage) with a warm sun-rim
  function drawBush(c, x, y, s){
    const dark = '#2f4a1e', mid = '#456a28', rim = 'rgba(190,215,95,.55)';
    for (const [dx, dy, r, col] of [
      [0, 0, 1, mid], [-0.7*s, 0.1*s, 0.66, dark], [0.7*s, 0.08*s, 0.66, mid],
      [-0.3*s, -0.5*s, 0.6, mid], [0.35*s, -0.45*s, 0.58, dark]]){
      c.fillStyle = col;
      c.beginPath(); c.ellipse(x + dx, y + dy, s * r, s * r * 0.82, 0, 0, TAU); c.fill();
    }
    c.fillStyle = rim;
    c.beginPath(); c.ellipse(x + 0.5*s, y - 0.35*s, s * 0.5, s * 0.4, 0.3, 0, TAU); c.fill();
  }
  // a fan of green grass blades
  function drawGreenTuft(c, x, y, s, seed){
    c.lineCap = 'round';
    for (let b = 0; b < 5; b++){
      const lean = (b - 2) * 0.4 + (psr(seed + b) - 0.5) * 0.5;
      const len = s * (9 + (b % 3) * 4);
      c.strokeStyle = b % 2 ? '#3c6020' : '#4f7a2a';
      c.lineWidth = 1.4 * s;
      c.beginPath();
      c.moveTo(x + b * 2 * s, y);
      c.quadraticCurveTo(x + b * 2 * s + lean * len * 0.4, y - len * 0.6,
                         x + b * 2 * s + lean * len, y - len);
      c.stroke();
    }
  }
  function rockGreens(c){
    // bushes nestled on the ledges / slab
    drawBush(c, W * 0.075, H * 0.638, U * 7);
    drawBush(c, W * 0.145, H * 0.602, U * 5.5);
    drawBush(c, W * 0.205, H * 0.392, U * 4.5);
    drawBush(c, W * 0.025, H * 0.84,  U * 8);
    // grass tufts sprouting from cracks
    drawGreenTuft(c, W * 0.105, H * 0.595, U, 201);
    drawGreenTuft(c, W * 0.165, H * 0.585, U, 211);
    drawGreenTuft(c, W * 0.055, H * 0.655, U, 221);
    drawGreenTuft(c, W * 0.235, H * 0.378, U, 231);
  }

  function paintVignette(c){
    c.fillStyle = rg(c, W / 2, H * 0.45, Math.min(W, H) * 0.48, Math.max(W, H) * 0.85, [
      [0, 'rgba(20,5,8,0)'], [0.7, 'rgba(20,5,8,.14)'], [1, 'rgba(15,3,6,.45)'],
    ]);
    c.fillRect(0, 0, W, H);
  }

  // ── THE LION — the showpiece ───────────────────────────────────────────────
  // Unit space: feet on y=0, facing +x, ~100 units tall. Layered wind-blown
  // mane, breathing chest, blinking amber eye, swishing tufted tail.
  function maneBlob(g, cx, cy, rx, ry, n, col, t, seed){
    // organic clumped fur mass: a tall ellipse of big irregular tufts,
    // heavier and longer at the bottom so the mane drapes onto the chest
    const tip = i => {
      const a = (i / n) * TAU;
      const drape = 1 + 0.32 * Math.max(0, Math.sin(a));
      const clump = 0.92 + psr(i + seed) * 0.3;
      return [cx + Math.cos(a) * rx * 1.16 * clump * drape,
              cy + Math.sin(a) * ry * 1.16 * clump * drape + Math.sin(t * 0.8 + i * 2.1)];
    };
    const val = i => {
      const a = (i / n) * TAU;
      const drape = 1 + 0.22 * Math.max(0, Math.sin(a));
      return [cx + Math.cos(a) * rx * 0.9 * drape,
              cy + Math.sin(a) * ry * 0.9 * drape];
    };
    g.fillStyle = col;
    g.beginPath();
    const v0 = val(-0.5);
    g.moveTo(v0[0], v0[1]);
    for (let i = 0; i < n; i++){
      const tp = tip(i), vv = val(i + 0.5);
      g.quadraticCurveTo(tp[0], tp[1], vv[0], vv[1]);
    }
    g.closePath(); g.fill();
  }
  function lionLeg(g, hx, a1, a2, coat, dark, hind){
    // jointed two-segment leg with organic taper; hind legs rest in a
    // natural Z (thigh forward, hock back) via built-in joint biases
    g.save();
    g.translate(hx, -50);
    g.rotate(a1 + (hind ? 0.20 : -0.02));
    g.fillStyle = coat;
    g.beginPath();                                  // muscular thigh / forearm
    g.moveTo(-8.5, -2);
    g.quadraticCurveTo(-7, 12, -4, 23);
    g.lineTo(4, 23);
    g.quadraticCurveTo(8, 11, 8.5, -2);
    g.closePath(); g.fill();
    g.translate(0, 22);
    g.rotate(a2 - (hind ? 0.30 : 0.02));
    g.beginPath();                                  // slim shank
    g.moveTo(-3.6, -2);
    g.quadraticCurveTo(-3.1, 11, -3.4, 21);
    g.lineTo(3.4, 21);
    g.quadraticCurveTo(3.5, 9, 3.6, -2);
    g.closePath(); g.fill();
    g.beginPath();                                  // broad soft paw
    g.ellipse(1.8, 22.6, 6.2, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = dark; g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(0.8, 21.6); g.lineTo(0.8, 24.4);
    g.moveTo(3.6, 21.8); g.lineTo(3.6, 24.4);
    g.stroke();
    g.restore();
  }
  function drawLion(L, t, female, moving, opts){
    opts = opts || {};
    const { x, y, s, dir, ph } = L;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    if (moving) ctx.translate(0, Math.sin(L.wt * 2) * 1.2);   // gentle stride bob
    const wamp = moving ? 0.20 : 0;
    const A = i => wamp * Math.sin(L.wt + i * Math.PI / 2);
    const B = i => moving ? 0.30 * Math.max(0, -Math.cos(L.wt + i * Math.PI / 2)) : 0;
    const C = {
      coat: '#C2914C', coatD: '#996B33', coatL: '#DCAF6B', belly: '#E8CD96',
      maneD: '#371808', mane2: '#532713', mane: '#6E371A', maneL: '#915228', maneHi: '#B57A40', line: '#3F2410',
    };
    // cheetah variant: same lioness rig, golden coat, slimmer tucked belly
    if (opts.cheetah){
      C.coat = '#E0B25E'; C.coatD = '#BB8638'; C.coatL = '#F2D79A'; C.belly = '#F6E9CA'; C.line = '#241808';
    }
    // per-individual coat shade (herd members carry a tint; the resident pride
    // doesn't) — cheap colour math instead of a per-frame ctx.filter
    if (L.tint && L.tint !== 1){
      C.coat = shade(C.coat, L.tint); C.coatD = shade(C.coatD, L.tint);
      C.coatL = shade(C.coatL, L.tint); C.belly = shade(C.belly, L.tint);
    }
    const bly = opts.cheetah ? 7 : 0;   // belly lift → slimmer waist for the cheetah
    // tail — long swish
    const sw = Math.sin(t * 1.05 + ph);
    const tex = -72 + sw * 6, tey = -14 + sw * 4;
    ctx.strokeStyle = C.coatD; ctx.lineWidth = opts.cheetah ? 2.8 : 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, -56);
    ctx.bezierCurveTo(-64, -50, -76, -32 + sw * 4, tex, tey);
    ctx.stroke();
    if (opts.cheetah){
      // a thin BLACK tip — just the last quarter of the tail, no widening
      const bz = u => { const m = 1 - u; return [
        m*m*m*(-46) + 3*m*m*u*(-64) + 3*m*u*u*(-76) + u*u*u*tex,
        m*m*m*(-56) + 3*m*m*u*(-50) + 3*m*u*u*(-32 + sw*4) + u*u*u*tey]; };
      ctx.strokeStyle = '#1b1108'; ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let u = 0.72; u <= 1.0001; u += 0.07){ const p = bz(u);
        u === 0.72 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.stroke();
    } else {
      ctx.fillStyle = C.maneD;
      ctx.beginPath();
      ctx.ellipse(tex, -10 + sw * 4, 4, 6.4, sw * 0.3, 0, TAU); ctx.fill();
    }
    // far legs (darker)
    lionLeg(ctx, -36, A(2) + 0.02, B(2), C.coatD, C.line, true);
    lionLeg(ctx, 26, A(0) - 0.02, B(0), C.coatD, C.line, false);
    // torso — high withers, dipped loin, round croup, deep chest
    const breathe = 1 + Math.sin(t * 1.35 + ph) * 0.008;
    ctx.save();
    ctx.scale(1, breathe);
    const bodyPath = () => {
      ctx.beginPath();
      ctx.moveTo(44, -36);                                  // chest point (behind mane)
      ctx.bezierCurveTo(51, -46, 51, -62, 43, -72);         // massive front
      ctx.quadraticCurveTo(28, -81, 8, -80);                // high withers
      ctx.bezierCurveTo(-8, -78, -20, -73, -30, -71);       // loin dips
      ctx.bezierCurveTo(-45, -69, -52, -59, -52, -49);      // round croup
      ctx.quadraticCurveTo(-52, -39 - bly, -45, -34 - bly); // rump into thigh
      ctx.quadraticCurveTo(-32, -28 - bly, -20, -32 - bly); // thigh front
      ctx.quadraticCurveTo(-2, -42 - bly, 18, -40 - bly);   // waist tuck (lifted for cheetah)
      ctx.quadraticCurveTo(34, -34 - bly, 44, -36);         // deep chest
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -82, 0, -32, [
      [0, C.coatL], [0.55, C.coat], [1, C.coatD],
    ]);
    bodyPath(); ctx.fill();
    // muscle forms: thigh + shoulder, core shadow under the belly
    ctx.fillStyle = 'rgba(255,205,135,.16)';
    ctx.beginPath(); ctx.ellipse(-33, -52, 14, 12, -0.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24, -56, 10, 9, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,35,12,.20)';
    ctx.beginPath(); ctx.ellipse(-2, -39, 30, 5, 0.04, 0, TAU); ctx.fill();
    // sunset rim light along the spine
    ctx.strokeStyle = 'rgba(255,165,85,.55)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(8, -79.5);
    ctx.bezierCurveTo(-8, -77.5, -20, -72.5, -30, -70.5);
    ctx.bezierCurveTo(-42, -68.5, -49, -60, -50, -51);
    ctx.stroke();
    if (opts.cheetah){                                 // black coat spots, kept on the body
      ctx.save(); bodyPath(); ctx.clip();
      ctx.fillStyle = C.line;
      for (let i = 0; i < 40; i++){
        const sx2 = -50 + psr(i * 2 + 1) * 96, sy2 = -80 + psr(i * 3 + 2) * 50;
        const r = 0.9 + psr(i + 7) * 1.2;
        ctx.beginPath(); ctx.ellipse(sx2, sy2, r, r * 0.82, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    // near legs
    lionLeg(ctx, -28, A(3) - 0.02, B(3), C.coat, C.line, true);
    lionLeg(ctx, 34, A(1) + 0.02, B(1), C.coat, C.line, false);
    // ── the head — bigger, framed by a tall draping mane ──
    const roarK = (!female && L.act && L.act.type === 'roar')
      ? Math.sin(Math.min(1, (t - L.act.t0) / 1.6) * Math.PI) : 0;
    const hb = Math.sin(t * 0.5 + ph) * 0.045;     // slow regal head sway
    ctx.save();
    ctx.translate(46, female ? -82 : -86);
    ctx.rotate(hb - 0.26 * roarK);                 // head thrown back mid-roar
    if (!female){
      // the soft clumped ruff (no spiky edges) — many overlapping layers from
      // dark roots out to warm tips give it depth and a realistic fullness
      maneBlob(ctx, -8, 6, 27, 34, 13, C.maneD,  t, ph + 3);   // outer, darkest
      maneBlob(ctx, -8, 5, 24, 30, 12, C.mane2,  t, ph + 7);   // mid-dark
      maneBlob(ctx, -7, 4, 21, 27, 12, C.mane,   t, ph + 11);  // body
      maneBlob(ctx, -6, 2, 17, 22, 11, C.maneL,  t, ph + 17);  // inner, lit
      maneBlob(ctx, -3, 0, 12, 16,  9, C.maneHi, t, ph + 23);  // warm sun sheen
    } else {
      // lioness ears sit clear of any mane
      for (const ex of [-8, 3]){
        ctx.fillStyle = C.coat;
        ctx.beginPath(); ctx.arc(ex, -12, 5.4, 0, TAU); ctx.fill();
        ctx.fillStyle = C.coatD;
        ctx.beginPath(); ctx.arc(ex, -12, 2.8, 0, TAU); ctx.fill();
      }
      // neck blends head into the shoulders
      ctx.fillStyle = C.coat;
      ctx.beginPath();
      ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-20, 0, -30, 14);
      ctx.lineTo(-8, 20); ctx.quadraticCurveTo(2, 8, 8, 2);
      ctx.closePath(); ctx.fill();
    }
    // skull — broad cranium with a defined brow
    ctx.fillStyle = lg(ctx, 0, -13, 0, 11, [[0, C.coatL], [1, C.coat]]);
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.bezierCurveTo(-13, -11, -6, -14.5, 1, -14);  // cranium
    ctx.quadraticCurveTo(9, -13, 12, -7);            // brow
    ctx.quadraticCurveTo(14.5, -2, 13, 3);
    ctx.quadraticCurveTo(9, 10, 0, 11);
    ctx.bezierCurveTo(-8, 11, -13, 6, -13, -2);
    ctx.closePath(); ctx.fill();
    // male ear tufts peeking from the mane
    if (!female){
      ctx.fillStyle = C.coat;
      ctx.beginPath(); ctx.arc(-7, -12.5, 4.8, 0, TAU); ctx.fill();
      ctx.fillStyle = C.maneL;
      ctx.beginPath(); ctx.arc(-7, -12.5, 2.4, 0, TAU); ctx.fill();
    }
    // muzzle + lower jaw (the jaw drops wide open during the roar)
    ctx.fillStyle = C.belly;
    ctx.beginPath(); ctx.ellipse(11, 4, 10.4, 7.6, 0.06, 0, TAU); ctx.fill();
    if (roarK > 0.15){
      ctx.fillStyle = '#5A1E14';                   // the roaring maw
      ctx.beginPath(); ctx.ellipse(12, 7 + 2.5 * roarK, 5.4, 3.6 * roarK, 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#F4EBD8';                   // fangs
      ctx.beginPath();
      ctx.moveTo(15.5, 4.8); ctx.lineTo(16.6, 7.6 + 1.6 * roarK); ctx.lineTo(17.6, 5);
      ctx.moveTo(8.5, 8.6 + 4.4 * roarK); ctx.lineTo(9.6, 6.2 + 2.4 * roarK); ctx.lineTo(10.7, 8.8 + 4.4 * roarK);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#D9B988';
    ctx.beginPath(); ctx.ellipse(8, 9.6 + 5 * roarK, 6.4, 4, 0.12 * roarK, 0, TAU); ctx.fill();
    // nose + bridge shading
    ctx.fillStyle = '#5A2C1C';
    ctx.beginPath();
    ctx.moveTo(16.4, -0.2);
    ctx.quadraticCurveTo(22.8, 0.2, 21.8, 3.4);
    ctx.quadraticCurveTo(18.4, 5.8, 16.4, 3.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,75,35,.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.quadraticCurveTo(14.5, -4, 16.6, -0.6); ctx.stroke();
    // philtrum + mouth
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(18.6, 5); ctx.lineTo(16.6, 7.8);
    ctx.quadraticCurveTo(13.2, 10.2, 9.6, 9);
    ctx.stroke();
    // amber eye with blink + heavy brow line
    const bl = Math.pow(Math.max(0, Math.sin(t * 0.42 + ph * 2.3)), 60);
    const eyeH = Math.max(0.08, 1 - bl);
    ctx.save();
    ctx.translate(5.6, -4.4); ctx.scale(1, eyeH);
    ctx.fillStyle = '#2A1808';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.3, 2.6, -0.12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#E8A030';
    ctx.beginPath(); ctx.arc(0.3, 0, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#190C04';
    ctx.beginPath(); ctx.arc(0.5, 0.1, 1.05, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(-0.2, -0.8, 0.55, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(63,36,16,.7)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(2, -7.8); ctx.quadraticCurveTo(5.8, -9, 9.2, -7.2); ctx.stroke();
    // whisker dots + whiskers
    ctx.fillStyle = 'rgba(63,36,16,.55)';
    for (let i = 0; i < 4; i++)
      ctx.fillRect(10 + (i % 2) * 3.6, 2.6 + (i / 2 | 0) * 2.4, 0.8, 0.8);
    ctx.strokeStyle = 'rgba(255,250,235,.5)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++){
      ctx.beginPath();
      ctx.moveTo(13, 3 + i * 1.6);
      ctx.quadraticCurveTo(21, 1.5 + i * 2.4, 26, 2.5 + i * 3.2);
      ctx.stroke();
    }
    // cheetah face markings: tear stripes + a few forehead spots
    if (opts.cheetah){
      ctx.strokeStyle = '#241808'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4.6, -2);   ctx.quadraticCurveTo(7, 4, 11, 9.5);
      ctx.moveTo(7.8, -2.4); ctx.quadraticCurveTo(10.4, 3, 13.8, 8);
      ctx.stroke();
      ctx.fillStyle = '#241808';
      for (const [dx, dy] of [[-3, -9], [2, -10], [-6, -4], [6, -7], [0, -6]]){
        ctx.beginPath(); ctx.arc(dx, dy, 0.9, 0, TAU); ctx.fill();
      }
    }
    // a pretty hair ribbon (bow) on top of the head — the young lionesses
    if (opts.ribbon){
      const bx = -3, by = -13;
      ctx.strokeStyle = '#FF5FA2'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';   // trailing tails
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 4, by + 4, bx - 3.5, by + 8);
      ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 4, by + 4, bx + 3.5, by + 8);
      ctx.stroke();
      ctx.fillStyle = '#FF5FA2'; ctx.strokeStyle = '#D63E84'; ctx.lineWidth = 0.9;
      ctx.beginPath();                                   // left loop
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 8, by - 5.5, bx - 8, by - 0.5);
      ctx.quadraticCurveTo(bx - 8, by + 4, bx, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();                                   // right loop
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 8, by - 5.5, bx + 8, by - 0.5);
      ctx.quadraticCurveTo(bx + 8, by + 4, bx, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FF8FC0';                         // center knot
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, TAU); ctx.fill();
    }
    // front mane framing the face + forelock over the brow
    if (!female){
      maneBlob(ctx, -10, 1, 15, 19, 11, C.mane,  t, ph + 19);   // darker under-frame
      maneBlob(ctx, -10, 0, 13, 17, 10, C.maneL, t, ph + 23);
      ctx.fillStyle = C.mane;
      ctx.beginPath();
      ctx.moveTo(-6, -13);
      ctx.quadraticCurveTo(2, -18, 9, -11);
      ctx.quadraticCurveTo(3, -10, -2, -8);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();   // head
    ctx.restore();   // lion
  }

  // ── THE CHEETAH — sleek, spotted, tear-marked ──────────────────────────────
  function cheetahHead(t, ph, C){
    // local: skull at (0,0), facing +x; scanning gaze + occasional ear twitch
    const scan = Math.sin(t * 0.33 + ph) * 0.10;
    ctx.save();
    ctx.rotate(scan);
    const tw = Math.pow(Math.max(0, Math.sin(t * 0.9 + ph * 3)), 30) * 0.5;
    for (const [ex, twr] of [[-5.5, 0], [3.5, tw]]){
      ctx.save();
      ctx.translate(ex, -7); ctx.rotate(twr);
      ctx.fillStyle = C.coat;
      ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = C.spot;
      ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = lg(ctx, 0, -8, 0, 8, [[0, C.coatL], [1, C.coat]]);
    ctx.beginPath(); ctx.ellipse(0, 0, 8.4, 7.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.belly;
    ctx.beginPath(); ctx.ellipse(5.6, 2.6, 5.4, 4.4, 0.05, 0, TAU); ctx.fill();
    // nose + mouth
    ctx.fillStyle = '#46221A';
    ctx.beginPath();
    ctx.moveTo(8.7, 0.6); ctx.quadraticCurveTo(11.8, 1, 11, 2.8);
    ctx.quadraticCurveTo(9.2, 4, 8.4, 2.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2A1608'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(9.7, 3.4); ctx.lineTo(8.6, 5.2);
    ctx.quadraticCurveTo(6.2, 6.6, 4, 5.8);
    ctx.stroke();
    // THE tear marks — the cheetah's signature
    ctx.strokeStyle = '#241408'; ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(3.4, -1.6);
    ctx.quadraticCurveTo(4.6, 1.6, 7.2, 3.6);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(1.6, -1.8);
    ctx.quadraticCurveTo(2.2, 1.8, 4.2, 4.4);
    ctx.stroke();
    // amber eye, blink
    const bl = Math.pow(Math.max(0, Math.sin(t * 0.5 + ph * 1.9)), 60);
    ctx.save();
    ctx.translate(3.2, -2.6); ctx.scale(1, Math.max(0.08, 1 - bl));
    ctx.fillStyle = '#1E1206';
    ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.9, -0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#D9952E';
    ctx.beginPath(); ctx.arc(0.2, 0, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120A02';
    ctx.beginPath(); ctx.arc(0.3, 0.1, 0.65, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(-0.2, -0.6, 0.35, 0, TAU); ctx.fill();
    ctx.restore();
    // forehead spot flecks
    ctx.fillStyle = C.spot;
    for (let i = 0; i < 5; i++)
      ctx.fillRect(-5 + psr(i + ph) * 8, -6.5 + psr(i + 9 + ph) * 3.5, 1, 1);
    ctx.restore();
  }
  function cheetahSpots(seed, x0, y0, w, h, n){
    ctx.fillStyle = 'rgba(43,26,11,.85)';
    for (let i = 0; i < n; i++){
      const sx2 = x0 + psr(i * 1.7 + seed) * w;
      const sy2 = y0 + psr(i * 2.3 + seed + 40) * h;
      const r = 0.8 + psr(i + seed + 80) * 1.1;
      ctx.beginPath();
      ctx.ellipse(sx2, sy2, r, r * 0.85, psr(i) * 3, 0, TAU);
      ctx.fill();
    }
  }
  function tailRings(pts){
    // pts: sampled tail points from the tip backwards
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++){
      const p = pts[i];
      ctx.strokeStyle = '#241608'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(p[0] - 1.4, p[1] - 2); ctx.lineTo(p[0] + 1.4, p[1] + 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#F3E8D2';
    ctx.beginPath(); ctx.arc(pts[4][0], pts[4][1], 2.1, 0, TAU); ctx.fill();
  }
  function drawCheetahSit(Ch, t){
    const { x, y, s, dir, ph } = Ch;
    const C = { coat: '#D9A95C', coatL: '#EFCE96', belly: '#F3E3C2', spot: '#2B1A0B' };
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.fillStyle = 'rgba(40,12,4,.28)';
    ctx.beginPath(); ctx.ellipse(-4, 1.5, 34, 5, 0, 0, TAU); ctx.fill();
    // ringed tail curled on the ground, tip flicking
    const fl = Math.sin(t * 2.2 + ph) * 3;
    ctx.strokeStyle = C.coat; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.bezierCurveTo(-34, -4, -33, 6, -14, 7);
    ctx.quadraticCurveTo(0, 8, 12 + fl, 4);
    ctx.stroke();
    tailRings([[3 + fl * 0.6, 6.4], [6 + fl * 0.8, 5.8], [9 + fl * 0.9, 5.2], [11 + fl, 4.6], [13 + fl, 4.2]]);
    // haunch + seated base — lean
    ctx.fillStyle = lg(ctx, -12, -40, -12, 0, [[0, C.coat], [1, '#B5854A']]);
    ctx.beginPath(); ctx.ellipse(-10, -22, 14, 16.5, -0.08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, -5, 13, 5, 0, 0, TAU); ctx.fill();
    // upright chest & neck
    ctx.fillStyle = lg(ctx, 6, -64, 22, -10, [[0, C.coatL], [1, C.coat]]);
    ctx.beginPath();
    ctx.moveTo(2, -62);
    ctx.quadraticCurveTo(12, -67, 16, -60);
    ctx.bezierCurveTo(20, -48, 20, -28, 19, -8);
    ctx.quadraticCurveTo(18, -3, 13, -3);
    ctx.lineTo(4, -3);
    ctx.quadraticCurveTo(-2, -22, -6, -32);
    ctx.quadraticCurveTo(-4, -50, 2, -62);
    ctx.closePath(); ctx.fill();
    // pale chest stripe
    ctx.fillStyle = 'rgba(243,227,194,.6)';
    ctx.beginPath(); ctx.ellipse(13, -30, 3.6, 18, 0.04, 0, TAU); ctx.fill();
    // far front leg + near front leg
    ctx.fillStyle = '#B5854A';
    ctx.beginPath(); ctx.moveTo(16, -26); ctx.lineTo(20.4, -26); ctx.lineTo(19.6, -3); ctx.lineTo(15.6, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18.4, -2, 4.4, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.coat;
    ctx.beginPath(); ctx.moveTo(9.6, -28); ctx.lineTo(14.4, -28); ctx.lineTo(13.6, -3); ctx.lineTo(9, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, -1.8, 4.6, 2.5, 0, 0, TAU); ctx.fill();
    // hind paw peeking forward
    ctx.beginPath(); ctx.ellipse(0, -2.2, 5, 2.6, 0, 0, TAU); ctx.fill();
    // spots over haunch + back
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-11, -22, 16, 17, -0.08, 0, TAU);
    ctx.moveTo(14, -56);
    ctx.bezierCurveTo(19, -44, 19, -24, 18, -8);
    ctx.lineTo(4, -8);
    ctx.quadraticCurveTo(-3, -30, -5, -40);
    ctx.quadraticCurveTo(-2, -54, 6, -60);
    ctx.closePath();
    ctx.clip();
    cheetahSpots(ph * 10, -28, -42, 48, 42, 34);
    ctx.restore();
    // head
    ctx.save();
    ctx.translate(9, -68);
    cheetahHead(t, ph, C);
    ctx.restore();
    ctx.restore();
  }
  function cheetahLeg(hx, a1, a2, col, hind){
    // greyhound legs — shortened ~18% for sturdier proportions; the anchor is
    // dropped from -46 to -39 so the (shorter) leg still plants on the ground.
    ctx.save();
    ctx.translate(hx, -39);
    ctx.rotate(a1 + (hind ? 0.14 : -0.02));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-5.5, -2);
    ctx.quadraticCurveTo(-4.6, 8, -2.8, 17);
    ctx.lineTo(2.6, 17);
    ctx.quadraticCurveTo(5.2, 7, 5.5, -2);
    ctx.closePath(); ctx.fill();
    ctx.translate(0, 16);
    ctx.rotate(a2 - (hind ? 0.20 : 0.02));
    ctx.beginPath();
    ctx.moveTo(-2.4, 0);
    ctx.quadraticCurveTo(-2.1, 10, -1.7, 20);
    ctx.lineTo(1.8, 20);
    ctx.quadraticCurveTo(2.3, 10, 2.6, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 20.6, 4.2, 2.1, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawCheetahStand(Ch, t, moving){
    const { x, y, s, dir, ph } = Ch;
    const C = { coat: '#D9A95C', coatL: '#EFCE96', belly: '#F3E3C2', spot: '#2B1A0B' };
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    if (moving) ctx.translate(0, Math.sin(Ch.wt * 2) * 1.4);
    const wamp = moving ? 0.32 : 0;
    const A = i => wamp * Math.sin(Ch.wt + i * Math.PI / 2);
    const B = i => moving ? 0.40 * Math.max(0, -Math.cos(Ch.wt + i * Math.PI / 2)) : 0;
    ctx.fillStyle = 'rgba(40,12,4,.28)';
    ctx.beginPath(); ctx.ellipse(-2, 1.5 - (Ch._yOff || 0) / s, 46, 5.5, 0, 0, TAU); ctx.fill();
    // raised ringed tail off the croup
    const fl = Math.sin(t * 2.4 + ph) * 3;
    const T0 = [-43, -38], T1 = [-58, -36], T2 = [-67, -44 + fl * 0.4], T3 = [-65, -56 + fl];
    ctx.strokeStyle = C.coat; ctx.lineWidth = 2.9; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(T0[0], T0[1]);
    ctx.bezierCurveTo(T1[0], T1[1], T2[0], T2[1], T3[0], T3[1]);
    ctx.stroke();
    // ring marks SAMPLED along the actual tail curve, so the black bands always
    // sit ON the tail (they used to be offset above it, floating outside).
    const bez = u => { const m = 1 - u; return [
      m*m*m*T0[0] + 3*m*m*u*T1[0] + 3*m*u*u*T2[0] + u*u*u*T3[0],
      m*m*m*T0[1] + 3*m*m*u*T1[1] + 3*m*u*u*T2[1] + u*u*u*T3[1]]; };
    // black bands confined to the tip third — the body-side of the tail stays
    // plain coat (less black overall, trimmed from the body end, tip unchanged)
    tailRings([bez(0.7), bez(0.8), bez(0.88), bez(0.95), bez(1)]);
    // far legs — long, slim, jointed
    cheetahLeg(-32, A(2) + 0.04, B(2), '#B5854A', true);
    cheetahLeg(22, A(0) - 0.03, B(0), '#B5854A', false);
    // ONE silhouette: deep chest, tucked waist, arched loin, upright neck
    const bodyP = () => {
      ctx.beginPath();
      ctx.moveTo(31, -38);                              // chest point, low front
      ctx.bezierCurveTo(37, -46, 37, -58, 31, -64);     // front of chest
      ctx.quadraticCurveTo(28, -70, 27, -78);           // throat rising to head
      ctx.lineTo(20, -80);                              // nape
      ctx.quadraticCurveTo(16, -70, 13, -64);           // back of neck down
      ctx.quadraticCurveTo(2, -60, -12, -58);           // back, slight loin arch
      ctx.quadraticCurveTo(-26, -57, -34, -55);         // loin to croup
      ctx.bezierCurveTo(-42, -52, -45, -46, -44, -40);  // round croup
      ctx.quadraticCurveTo(-43, -34, -38, -31);         // rump
      ctx.quadraticCurveTo(-24, -27, -10, -31);         // hind tuck
      ctx.quadraticCurveTo(8, -38, 24, -36);            // dramatic waist sweep
      ctx.quadraticCurveTo(29, -36, 31, -38);           // back to chest
      ctx.closePath();
    };
    const breathe = 1 + Math.sin(t * 1.8 + ph) * 0.01;
    ctx.save();
    ctx.scale(1, breathe);
    ctx.fillStyle = lg(ctx, 0, -78, 0, -28, [[0, C.coatL], [0.55, C.coat], [1, '#B5854A']]);
    bodyP(); ctx.fill();
    // pale chest front + belly, warm shading along the loin
    ctx.fillStyle = 'rgba(243,227,194,.5)';
    ctx.beginPath(); ctx.ellipse(2, -34, 16, 3.4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(27, -56, 3.6, 11, 0.10, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,165,85,.45)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(13, -63); ctx.quadraticCurveTo(2, -59.5, -12, -57.5);
    ctx.stroke();
    ctx.restore();
    // spots over body + neck
    ctx.save();
    bodyP(); ctx.clip();
    cheetahSpots(ph * 10 + 5, -42, -78, 74, 46, 56);
    ctx.restore();
    // muscular shoulder + haunch at the NEAR-side leg roots — these bridge the
    // legs smoothly into the body (no pasted-on seam) and carry a few spots so
    // they read as part of the coat.
    const haunch = (hx, hy, rx, ry, rot) => {
      ctx.save();
      ctx.fillStyle = lg(ctx, hx, hy - ry, hx, hy + ry, [[0, C.coat], [1, '#B5854A']]);
      ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, rot, 0, TAU); ctx.fill();
      ctx.clip();
      cheetahSpots(hx * 7 + hy * 3, hx - rx, hy - ry, rx * 2, ry * 2, 7);
      ctx.restore();
    };
    haunch(-25, -40, 12.5, 13.5, -0.06);   // hind thigh
    haunch(29, -45, 11,   14,   0.06);      // front shoulder
    // near legs
    cheetahLeg(-24, A(3) - 0.04, B(3), C.coat, true);
    cheetahLeg(30, A(1) + 0.03, B(1), C.coat, false);
    // head — high on the upright neck, scanning the plain
    ctx.save();
    ctx.translate(22, -86);
    ctx.rotate(0.02);
    cheetahHead(t, ph, C);
    ctx.restore();
    ctx.restore();
  }

  // ── THE ZEBRA — a true horse build: barrel, arched neck, long head ──────
  function zebraLeg(hx, a1, a2, far){
    // ground at y=0; hip/shoulder joint sits at -44
    const coat = far ? '#D9D7D2' : '#F4F2EE';
    ctx.save();
    ctx.translate(hx, -44);
    ctx.rotate(a1);
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-4.2, 9, -3, 19);
    ctx.lineTo(3, 19);
    ctx.quadraticCurveTo(4.4, 9, 5, -2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23232A';                       // upper-leg bands
    ctx.fillRect(-4.4, 2, 8.8, 2.4);
    ctx.fillRect(-4, 8, 8, 2.2);
    ctx.fillRect(-3.6, 14, 7.2, 2);
    ctx.translate(0, 18);
    ctx.rotate(a2);
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-2.8, 0); ctx.lineTo(2.8, 0);
    ctx.lineTo(2.2, 19); ctx.lineTo(-2.2, 19);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23232A';                       // lower bands
    ctx.fillRect(-2.6, 4, 5.2, 2);
    ctx.fillRect(-2.4, 10, 4.8, 1.8);
    ctx.beginPath();                                 // dark hoof
    ctx.moveTo(-3, 19); ctx.lineTo(3, 19);
    ctx.lineTo(3, 24); ctx.quadraticCurveTo(0, 25.6, -3, 24);
    ctx.closePath();
    ctx.fillStyle = '#1A1A1E'; ctx.fill();
    ctx.restore();
  }
  function drawZebra(Z, t, moving){
    const { x, y, s, dir, ph } = Z;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    if (moving) ctx.translate(0, Math.sin(Z.wt * 2) * 1.5);
    const w = Z.wt;                                  // walk clock
    const amp = moving ? 0.30 : 0.02;
    const A = i => amp * Math.sin(w + i * Math.PI / 2);
    const B = i => moving ? 0.42 * Math.max(0, -Math.cos(w + i * Math.PI / 2)) : 0;
    // tail off the croup, black tuft swishing
    const swt = Math.sin(t * 1.3 + ph) * 3;
    ctx.strokeStyle = '#E8E6E1'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, -58);
    ctx.quadraticCurveTo(-54, -48, -55 + swt * 0.5, -34 + swt * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#1D1D22';
    ctx.beginPath();
    ctx.ellipse(-55.6 + swt * 0.6, -27 + swt * 0.3, 3.2, 7.5, swt * 0.05, 0, TAU);
    ctx.fill();
    // far legs (hind then front)
    zebraLeg(-28, A(2), B(2), true);
    zebraLeg(20, A(0), B(0), true);
    // torso + neck — two Path2Ds so stripes can clip to the union
    const bodyP = new Path2D();
    bodyP.moveTo(34, -40);                               // chest point
    bodyP.bezierCurveTo(42, -46, 42, -60, 36, -68);      // chest front
    bodyP.quadraticCurveTo(26, -76, 10, -76);            // shoulder to withers
    bodyP.bezierCurveTo(-6, -76, -16, -72, -26, -70);    // back, slight dip
    bodyP.bezierCurveTo(-40, -68, -48, -58, -48, -48);   // round croup
    bodyP.quadraticCurveTo(-48, -38, -42, -33);          // rump
    bodyP.quadraticCurveTo(-30, -27, -16, -30);          // belly rear
    bodyP.quadraticCurveTo(4, -36, 20, -36);             // belly line
    bodyP.quadraticCurveTo(30, -36, 34, -40);            // up to chest
    bodyP.closePath();
    const neckP = new Path2D();
    neckP.moveTo(6, -76);                                // base of crest
    neckP.bezierCurveTo(20, -84, 36, -94, 48, -106);     // crest up to poll
    neckP.lineTo(59, -97);                               // head joins here
    neckP.bezierCurveTo(52, -86, 46, -74, 40, -62);      // throat line down
    neckP.quadraticCurveTo(26, -54, 14, -60);            // into the chest
    neckP.closePath();
    ctx.fillStyle = lg(ctx, 0, -106, 0, -28, [[0, '#FAF8F4'], [0.6, '#EFEDE8'], [1, '#CFCCC6']]);
    ctx.fill(neckP); ctx.fill(bodyP);
    // STRIPES — clipped to torso+neck union, following the body's contours
    ctx.save();
    const clipP = new Path2D();
    clipP.addPath(bodyP); clipP.addPath(neckP);
    ctx.clip(clipP);
    ctx.strokeStyle = '#23232A'; ctx.lineCap = 'round';
    ctx.lineWidth = 3.2;
    for (let i = 0; i < 6; i++){                     // neck bands, crest→throat
      const px = 12 + i * 6.8, py = -80 - i * 4.6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + 9, py + 10, px + 13, py + 22);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++){                     // shoulder chevrons
      ctx.beginPath();
      ctx.moveTo(20 - i * 7, -76);
      ctx.quadraticCurveTo(29 - i * 7, -58, 23 - i * 7, -40);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++){                     // barrel verticals
      const x0 = -4 - i * 7.5;
      ctx.beginPath();
      ctx.moveTo(x0, -75);
      ctx.quadraticCurveTo(x0 + 3, -55, x0 - 2, -36);  // fade out at the belly
      ctx.stroke();
    }
    for (const r of [16, 23, 30, 37]){               // haunch wrap-around arcs
      ctx.beginPath();
      ctx.arc(-58, -26, r, -1.45, -0.15);
      ctx.stroke();
    }
    ctx.lineWidth = 2;                               // dorsal stripe along spine
    ctx.beginPath();
    ctx.moveTo(8, -77);
    ctx.quadraticCurveTo(-16, -73.5, -44, -66);
    ctx.stroke();
    ctx.restore();
    // soft outline over the fill
    ctx.strokeStyle = 'rgba(85,83,79,.65)'; ctx.lineWidth = 1.6;
    ctx.stroke(bodyP); ctx.stroke(neckP);
    // near legs
    zebraLeg(-36, A(3), B(3), false);
    zebraLeg(28, A(1), B(1), false);
    // ── HEAD — long horse skull, angled down-forward off the poll ──
    ctx.save();
    ctx.translate(56, -102);
    ctx.rotate(0.62);
    // far ear behind
    ctx.fillStyle = '#C9C6C0';
    ctx.beginPath();
    ctx.moveTo(-10, -6); ctx.lineTo(-8, -18); ctx.lineTo(-3.4, -7);
    ctx.closePath(); ctx.fill();
    // skull: forehead → straight nose bridge → rounded muzzle → jaw
    ctx.fillStyle = lg(ctx, 0, -10, 0, 9, [[0, '#FAF8F4'], [1, '#E2DFDA']]);
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.quadraticCurveTo(2, -11, 8, -7);
    ctx.bezierCurveTo(14, -4.5, 20, -1.5, 26, 1);
    ctx.quadraticCurveTo(30, 2.5, 30, 6);
    ctx.quadraticCurveTo(26, 9.5, 20, 8.5);
    ctx.bezierCurveTo(12, 7.5, 4, 8, -4, 8);
    ctx.quadraticCurveTo(-10, 6, -10, -1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(85,83,79,.6)'; ctx.lineWidth = 1.3; ctx.stroke();
    // black muzzle with nostril
    ctx.fillStyle = '#1D1D22';
    ctx.beginPath(); ctx.ellipse(25.5, 4.5, 5.8, 4.8, 0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4A4A50';
    ctx.beginPath(); ctx.ellipse(26.5, 2.6, 1.5, 2, 0.4, 0, TAU); ctx.fill();
    // face bars along the nose bridge
    ctx.strokeStyle = '#23232A'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++){
      ctx.beginPath();
      ctx.moveTo(-1 + i * 5.5, -9 + i * 0.6);
      ctx.lineTo(2.4 + i * 5.5, 7.6 - i * 0.4);
      ctx.stroke();
    }
    // near ear, white with dark rim + inner
    ctx.fillStyle = '#F4F2EE'; ctx.strokeStyle = '#3A3A40'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, -7); ctx.quadraticCurveTo(-5.5, -16, -2.6, -20);
    ctx.quadraticCurveTo(-0.2, -14, 0.6, -6.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8E8C88';
    ctx.beginPath();
    ctx.moveTo(-4.6, -8.4); ctx.lineTo(-2.8, -16); ctx.lineTo(-1.2, -8);
    ctx.closePath(); ctx.fill();
    // eye high on the skull
    ctx.fillStyle = '#241A12';
    ctx.beginPath(); ctx.ellipse(2.4, -2.6, 2.5, 3, -0.12, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(3.2, -3.8, 0.95, 0, TAU); ctx.fill();
    ctx.restore();
    // upright brush mane — black/white ticks sampled along the crest bezier
    const crest = p => {
      const q = 1 - p;
      return [q*q*q*6  + 3*q*q*p*20 + 3*q*p*p*36 + p*p*p*48,
              q*q*q*-76 + 3*q*q*p*-84 + 3*q*p*p*-94 + p*p*p*-106];
    };
    for (let i = 0; i <= 11; i++){
      const [mx2, my2] = crest(i / 11);
      ctx.strokeStyle = i % 2 ? '#F4F2EE' : '#1D1D22';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(mx2, my2 + 1);
      ctx.lineTo(mx2 - 4.6, my2 - 6.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── THE GIRAFFE — tall walker with patch coat and swaying neck ──
  function giraffeLeg(hx, hy, a1, a2, far){
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a1);
    ctx.fillStyle = far ? '#C49858' : '#E2B670';
    ctx.beginPath();
    ctx.moveTo(-4.6, -2); ctx.lineTo(4.6, -2);
    ctx.lineTo(2.8, 27); ctx.lineTo(-2.8, 27);
    ctx.closePath(); ctx.fill();
    ctx.translate(0, 26);
    ctx.rotate(a2);
    ctx.beginPath();
    ctx.moveTo(-2.6, 0); ctx.lineTo(2.6, 0);
    ctx.lineTo(2, 28); ctx.lineTo(-2, 28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5C4020';
    ctx.fillRect(-2.6, 26, 5.2, 5);
    ctx.restore();
  }
  function drawGiraffe(G, t, moving){
    const { x, y, s, dir, ph } = G;
    const spot = G.spotCol || '#B07028';     // per-giraffe patch colour (some browner)
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    const w = G.wt;
    const amp = moving ? 0.22 : 0.015;
    const A = i => amp * Math.sin(w + i * Math.PI / 2);
    const B = i => moving ? 0.34 * Math.max(0, -Math.cos(w + i * Math.PI / 2)) : 0;
    // tail
    ctx.strokeStyle = '#D2A862'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-36, -62);
    ctx.quadraticCurveTo(-44, -44, -42, -28 + Math.sin(t * 1.4 + ph) * 3);
    ctx.stroke();
    ctx.fillStyle = '#4C3418';
    ctx.beginPath(); ctx.ellipse(-42, -25 + Math.sin(t * 1.4 + ph) * 3, 2.4, 4.4, 0, 0, TAU); ctx.fill();
    // legs (far then near)
    giraffeLeg(-26, -54, A(2), B(2), true);
    giraffeLeg(20, -56, A(0), B(0), true);
    // body + neck + head as one lit group
    const sway = Math.sin(t * 0.4 + ph) * 0.025 + (moving ? Math.sin(w) * 0.012 : 0);
    ctx.fillStyle = lg(ctx, 0, -150, 0, -44, [[0, '#EEC27A'], [1, '#D2A055']]);
    ctx.beginPath();                                 // torso, back sloping to the rump
    ctx.moveTo(30, -64);
    ctx.bezierCurveTo(36, -74, 34, -90, 24, -97);
    ctx.quadraticCurveTo(-2, -94, -22, -86);
    ctx.bezierCurveTo(-36, -80, -40, -70, -38, -60);
    ctx.quadraticCurveTo(-34, -50, -26, -48);
    ctx.quadraticCurveTo(-6, -44, 12, -50);
    ctx.quadraticCurveTo(24, -54, 30, -64);
    ctx.closePath(); ctx.fill();
    // neck (sways) + head
    ctx.save();
    ctx.translate(20, -92);
    ctx.rotate(sway);
    ctx.fillStyle = '#E2B670';
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.quadraticCurveTo(10, -28, 22, -52);
    ctx.lineTo(32, -48);
    ctx.quadraticCurveTo(18, -22, 9, 6);
    ctx.closePath(); ctx.fill();
    // mane ridge ticks
    ctx.strokeStyle = '#7A5424'; ctx.lineWidth = 1.8;
    for (let i = 0; i <= 6; i++){
      const p = i / 6;
      const nx = -7 + p * 29, ny = 2 - p * 54;
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx - 3, ny - 2.5); ctx.stroke();
    }
    // neck patches — clipped to the neck so none stray outside the body
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.quadraticCurveTo(10, -28, 22, -52);
    ctx.lineTo(32, -48);
    ctx.quadraticCurveTo(18, -22, 9, 6);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = spot;
    for (let i = 0; i < 7; i++){
      const p = psr(i * 3 + ph), q = psr(i * 7 + ph + 30);
      ctx.beginPath();
      ctx.ellipse(-2 + p * 24, -2 - q * 44, 3.2, 4, p * 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // head
    ctx.save();
    ctx.translate(28, -52);
    ctx.fillStyle = '#E2B670';
    ctx.beginPath(); ctx.ellipse(2, -2, 8, 6.4, -0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#D9B380';
    ctx.beginPath(); ctx.ellipse(9, 1.5, 5.4, 4.2, -0.3, 0, TAU); ctx.fill();
    // ossicones + ears
    ctx.strokeStyle = '#C49858'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, -7); ctx.lineTo(-2.6, -13);
    ctx.moveTo(3.5, -8); ctx.lineTo(3, -14);
    ctx.stroke();
    ctx.fillStyle = '#5C4020';
    ctx.beginPath(); ctx.arc(-2.8, -14, 1.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.9, -15, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#E2B670';
    ctx.beginPath(); ctx.ellipse(-7.5, -6, 4, 2.2, 0.5, 0, TAU); ctx.fill();
    // eye + nostril + mouth
    ctx.fillStyle = '#2A1C0E';
    ctx.beginPath(); ctx.ellipse(1.5, -3.5, 1.7, 2, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(2.1, -4.3, 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5C4020';
    ctx.beginPath(); ctx.arc(12.4, 0.4, 0.9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7A5424'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(13.4, 2.6); ctx.quadraticCurveTo(9, 4.6, 5.5, 3.6); ctx.stroke();
    ctx.restore();
    ctx.restore();   // neck group
    // body patches
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(30, -64);
    ctx.bezierCurveTo(36, -74, 34, -90, 24, -97);
    ctx.quadraticCurveTo(-2, -94, -22, -86);
    ctx.bezierCurveTo(-36, -80, -40, -70, -38, -60);
    ctx.quadraticCurveTo(-34, -50, -26, -48);
    ctx.quadraticCurveTo(-6, -44, 12, -50);
    ctx.quadraticCurveTo(24, -54, 30, -64);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = spot;
    for (let i = 0; i < 16; i++){
      const p = psr(i * 1.9 + ph), q = psr(i * 4.3 + ph + 60);
      ctx.beginPath();
      ctx.ellipse(-38 + p * 70, -96 + q * 50, 4.6, 5.4, p * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // near legs
    giraffeLeg(-32, -56, A(3), B(3), false);
    giraffeLeg(26, -58, A(1), B(1), false);
    ctx.restore();
  }

  // progress of a named act on this animal (0 when idle / other act)
  function actP(a, type, dur){
    if (!a.act || a.act.type !== type) return 0;
    return Math.min(1, (lastT - a.act.t0) / dur);
  }

  // ── THE ELEPHANT — gentle giant with a posable trunk ──
  // Acts: 'trumpet' (trunk thrown up in an S, ears flare, sound rings) and
  // 'shower' (trunk curls over the back and rains dust on it).
  function drawElephant(E, t, moving){
    const { x, y, s, dir, ph } = E;
    const trumpK = Math.sin(actP(E, 'trumpet', 1.8) * Math.PI);
    const showK  = Math.sin(actP(E, 'shower', 2.2) * Math.PI);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    const eg = c => (E.tint && E.tint !== 1) ? shade(c, E.tint) : c;   // per-elephant grey shade
    if (moving) ctx.translate(0, Math.sin(E.wt * 2) * 1.2);
    const wamp = moving ? 0.10 : 0;
    const A = i => wamp * Math.sin(E.wt + i * Math.PI / 2);
    // tail
    ctx.strokeStyle = eg('#7E7E86'); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, -54);
    ctx.quadraticCurveTo(-54, -40, -52 + Math.sin(t * 1.2 + ph) * 3, -26);
    ctx.stroke();
    ctx.fillStyle = eg('#55555E');
    ctx.beginPath(); ctx.ellipse(-52 + Math.sin(t * 1.2 + ph) * 3, -23, 2.6, 4.6, 0, 0, TAU); ctx.fill();
    // columnar legs (far pair darker), gentle swing, toenail arcs
    for (const [hx, far, phI] of [[-34, 1, 2], [18, 1, 0], [-24, 0, 3], [28, 0, 1]]){
      ctx.save();
      ctx.translate(hx, -52);
      ctx.rotate(A(phI));
      ctx.fillStyle = far ? eg('#80808A') : eg('#9A9AA2');
      ctx.beginPath();
      ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0);
      ctx.lineTo(5.8, 50); ctx.lineTo(-5.8, 50);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(235,232,225,.85)';
      for (let n = 0; n < 3; n++){
        ctx.beginPath();
        ctx.arc(-3.4 + n * 3.4, 49.4, 1.6, Math.PI, 0); ctx.fill();
      }
      ctx.restore();
    }
    // massive body — high rounded back
    ctx.fillStyle = lg(ctx, 0, -92, 0, -38, [[0, eg('#B2B2BA')], [0.55, eg('#9A9AA2')], [1, eg('#7E7E86')]]);
    ctx.beginPath();
    ctx.moveTo(34, -48);
    ctx.bezierCurveTo(42, -58, 44, -74, 34, -82);
    ctx.quadraticCurveTo(14, -92, -8, -88);
    ctx.bezierCurveTo(-34, -84, -48, -70, -48, -56);
    ctx.quadraticCurveTo(-48, -46, -42, -42);
    ctx.quadraticCurveTo(-16, -34, 10, -38);
    ctx.quadraticCurveTo(28, -42, 34, -48);
    ctx.closePath(); ctx.fill();
    // sunset rim along the back
    ctx.strokeStyle = 'rgba(255,165,85,.5)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(30, -82); ctx.quadraticCurveTo(14, -92, -8, -88);
    ctx.bezierCurveTo(-30, -85, -44, -74, -47, -60);
    ctx.stroke();
    // dust-shower puffs raining onto the back
    if (showK > 0.35 && (E.lastPuff || 0) < t - 0.12){
      E.lastPuff = t;
      FARTS.push({ x: x + dir * (Math.random() - 0.6) * 30 * s, y: y - (88 + Math.random() * 14) * s,
                   dx: (Math.random() - 0.5) * 6 * s, t0: t,
                   r: (7 + Math.random() * 5) * s, ph: Math.random() * TAU, col: 'dust' });
    }
    // head + big flapping ear + trunk
    const flap = Math.sin(t * 1.1 + ph) * 0.05 + trumpK * 0.22;
    ctx.save();
    ctx.translate(40, -64);
    ctx.rotate(-trumpK * 0.10);                     // head lifts when trumpeting
    // skull dome + cheek
    ctx.fillStyle = eg('#A4A4AC');
    ctx.beginPath(); ctx.ellipse(2, -2, 15, 14, 0.1, 0, TAU); ctx.fill();
    // tusks (far + near)
    ctx.strokeStyle = '#EDE8DC'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(8, 6); ctx.quadraticCurveTo(15, 11, 20, 9); ctx.stroke();
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(6, 8); ctx.quadraticCurveTo(14, 14, 21, 12); ctx.stroke();
    // THE TRUNK — three poses blended: idle sway / trumpet-up / shower-curl
    const sway = Math.sin(t * 0.9 + ph) * 3;
    const idle  = [[16, 14], [14, 32], [10 + sway, 46]];
    const up    = [[24, -6], [30, -22], [24, -34]];
    const curl  = [[22, -10], [6, -26], [-12, -24]];
    const k = Math.max(trumpK, showK), pose = trumpK >= showK ? up : curl;
    const pt = i => [idle[i][0] + (pose[i][0] - idle[i][0]) * k,
                     idle[i][1] + (pose[i][1] - idle[i][1]) * k];
    const [c1, c2, tip] = [pt(0), pt(1), pt(2)];
    ctx.strokeStyle = eg('#9A9AA2');
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]); ctx.stroke();
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(c2[0], c2[1]); ctx.quadraticCurveTo((c2[0] + tip[0]) / 2, (c2[1] + tip[1]) / 2, tip[0], tip[1]); ctx.stroke();
    // trumpet sound-rings from the raised tip
    if (trumpK > 0.5){
      ctx.strokeStyle = `rgba(255,220,160,${(0.55 * (trumpK - 0.5) * 2).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      for (const rr of [6, 11]){
        ctx.beginPath();
        ctx.arc(tip[0] + 4, tip[1] - 2, rr + (1 - trumpK) * 8, -1.2, 0.6);
        ctx.stroke();
      }
    }
    // ear — big, flapping, darker inner
    ctx.save();
    ctx.translate(-8, -4);
    ctx.rotate(flap);
    ctx.fillStyle = eg('#8A8A92');
    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.quadraticCurveTo(-20, -16, -24, 2);
    ctx.quadraticCurveTo(-22, 16, -4, 14);
    ctx.quadraticCurveTo(4, 6, 2, -12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(90,80,90,.35)';
    ctx.beginPath();
    ctx.moveTo(-2, -8); ctx.quadraticCurveTo(-16, -10, -19, 2);
    ctx.quadraticCurveTo(-17, 12, -5, 10); ctx.quadraticCurveTo(1, 4, -2, -8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // eye + brow wrinkle
    ctx.fillStyle = '#26262E';
    ctx.beginPath(); ctx.arc(6, -6, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(6.5, -6.6, 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,70,.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(3, -9.5); ctx.quadraticCurveTo(6, -10.5, 9, -9); ctx.stroke();
    ctx.restore();   // head
    ctx.restore();   // elephant
  }

  // ── THE OSTRICH — fluffy plume, long pink legs, and the famous head-bury ──
  function ostLeg(hx, a1, a2){
    ctx.save();
    ctx.translate(hx, -52);
    ctx.rotate(a1);
    ctx.strokeStyle = '#D8A090'; ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, 26); ctx.stroke();
    ctx.translate(2, 26);
    ctx.rotate(a2);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-1, 25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, 25); ctx.lineTo(7, 27); ctx.stroke();   // toe
    ctx.restore();
  }
  function drawOstrich(O, t, moving){
    const { x, y, s, dir, ph } = O;
    const bp = actP(O, 'bury', 2.8);
    // bury envelope: dive 0→.3, stay .3→.75, pull out .75→1
    const buryK = bp <= 0 ? 0 : bp < 0.3 ? bp / 0.3 : bp < 0.75 ? 1 : (1 - bp) / 0.25;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    if (moving) ctx.translate(0, Math.sin(O.wt * 2) * 2);
    ctx.rotate(buryK * 0.14);                       // tips forward, tail up
    const wamp = moving ? 0.5 : 0;
    const A = i => wamp * Math.sin(O.wt + i * Math.PI);
    const B = i => moving ? 0.5 * Math.max(0, -Math.cos(O.wt + i * Math.PI)) : 0;
    // legs (far + near)
    ostLeg(-4, A(1) + 0.04, B(1));
    ostLeg(6, A(0) - 0.04, B(0));
    // tail plume — fluffy white fan (lifts during the bury)
    ctx.save();
    ctx.translate(-22, -74);
    ctx.rotate(-buryK * 0.3);
    ctx.strokeStyle = 'rgba(238,233,222,.9)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++){
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-8, -2 - i * 3, -15, 2 - i * 5 + Math.sin(t * 2 + i) * 1.2);
      ctx.stroke();
    }
    ctx.restore();
    // plump feathered body
    ctx.fillStyle = lg(ctx, 0, -92, 0, -50, [[0, '#3A3430'], [1, '#241F1C']]);
    ctx.beginPath(); ctx.ellipse(-2, -70, 26, 20, -0.08, 0, TAU); ctx.fill();
    // fluffy fringe strokes
    ctx.strokeStyle = 'rgba(58,52,48,.8)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i++){
      const a2 = 0.6 + i * 0.32;
      ctx.beginPath();
      ctx.moveTo(-2 + Math.cos(a2) * 25, -70 + Math.sin(a2) * 19);
      ctx.lineTo(-2 + Math.cos(a2) * 30, -70 + Math.sin(a2) * 23);
      ctx.stroke();
    }
    // white wing patch
    ctx.fillStyle = 'rgba(238,233,222,.85)';
    ctx.beginPath(); ctx.ellipse(-8, -66, 12, 8, -0.15, 0, TAU); ctx.fill();
    // ── the neck + head: upright ↔ buried in the sand ──
    const nb = moving ? Math.sin(O.wt * 2) * 3 : 0;            // strut head-bob
    const baseX = 16, baseY = -78;
    const headUp = [34 + nb, -128], headDn = [40, 4];
    const hx2 = headUp[0] + (headDn[0] - headUp[0]) * buryK;
    const hy2 = headUp[1] + (headDn[1] - headUp[1]) * buryK;
    const cx2 = baseX + 12 + buryK * 14, cy2 = (baseY + hy2) / 2 - (1 - buryK) * 14 + buryK * 10;
    ctx.strokeStyle = '#D8A090'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(cx2, cy2, hx2, hy2);
    ctx.stroke();
    if (buryK < 0.92){
      // head with the big innocent eye + beak + crest fluffs
      ctx.save();
      ctx.translate(hx2, hy2);
      ctx.rotate(buryK * 1.1);
      ctx.fillStyle = '#D8A090';
      ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#C89060';
      ctx.beginPath();
      ctx.moveTo(4, -1.6); ctx.lineTo(11, 0.4); ctx.lineTo(4, 2.4);
      ctx.closePath(); ctx.fill();
      const bl = Math.pow(Math.max(0, Math.sin(t * 0.6 + ph * 2)), 50);
      ctx.save();
      ctx.translate(1.2, -1.4); ctx.scale(1, Math.max(0.1, 1 - bl));
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1A1208';
      ctx.beginPath(); ctx.arc(0.5, 0, 1.3, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(58,52,48,.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -5); ctx.lineTo(-4, -8);
      ctx.moveTo(1, -5.4); ctx.lineTo(1.5, -8.6);
      ctx.stroke();
      ctx.restore();
    }
    // sand mound + kicked dust where the head goes in
    if (buryK > 0.5){
      ctx.fillStyle = '#8a5a2c';
      ctx.beginPath(); ctx.ellipse(42, 0, 11, 3.6, 0, Math.PI, TAU); ctx.fill();
      if ((O.lastPuff || 0) < t - 0.18 && bp < 0.45){
        O.lastPuff = t;
        FARTS.push({ x: x + dir * 42 * s, y: y - 4 * s,
                     dx: (Math.random() - 0.5) * 10 * s, t0: t,
                     r: (5 + Math.random() * 4) * s, ph: Math.random() * TAU, col: 'dust' });
      }
    }
    ctx.restore();
  }

  // ── walkers: patrol their patch, pause to graze, turn around at the edges.
  //    Only the cliff pride uses this now — their patch is the rock itself,
  //    with yFn keeping their paws on the sloping ridge. ──
  function updateWalker(Wk, t, dt){
    const moving = t >= Wk.pauseUntil && !Wk.act;
    if (moving){
      Wk.wt += dt * (Wk.speed / 6);
      Wk.x += Wk.dir * Wk.speed * U * dt;
      if (Wk.yFn) Wk.y = Wk.yFn(Wk.x);
      const pMin = Wk.pMin || 2, pMax = Wk.pMax || 5;
      if (Wk.x < Wk.lo){ Wk.dir = 1;  Wk.pauseUntil = t + pMin + psr(t) * (pMax - pMin); }
      if (Wk.x > Wk.hi){ Wk.dir = -1; Wk.pauseUntil = t + pMin + psr(t + 1) * (pMax - pMin); }
    }
    return moving;
  }

  // ── herds: one species crosses the plain at a time. Each kind carries its
  //    draw fn, depth lane, base speed and the act/vent props its rig needs. ──
  const HERD_KINDS = {
    zebra:    { draw: (m, t, mv) => drawZebra(m, t, mv),        sc: 0.58, lane: 0.885, speed: 26, acts: ['jump', 'rear', 'roll', 'fart'], jumpH: 30, rearPiv: -32, ventX: 50, ventY: 46, hitW: 58, hitH: 118 },
    ostrich:  { draw: (m, t, mv) => drawOstrich(m, t, mv),      sc: 0.62, lane: 0.915, speed: 80, acts: ['bury', 'jump', 'fart'],          jumpH: 34, ventX: 24, ventY: 62, hitW: 40, hitH: 140 },
    elephant: { draw: (m, t, mv) => drawElephant(m, t, mv),     sc: 0.62, lane: 0.830, speed: 12, acts: ['trumpet', 'shower', 'fart'],     ventX: 52, ventY: 44, hitW: 74, hitH: 104 },
    cheetah:  { draw: (m, t, mv) => drawLion(m, t, true, mv, { cheetah: true }), sc: 0.76, lane: 0.920, speed: 160, acts: ['jump', 'spin', 'fart'], jumpH: 40, ventX: 46, ventY: 44, hitW: 60, hitH: 100 },
    giraffe:  { draw: (m, t, mv) => drawGiraffe(m, t, mv),      sc: 0.50, lane: 0.800, speed: 16, acts: ['jump', 'fart'],                   jumpH: 10, ventX: 38, ventY: 60, hitW: 52, hitH: 168 },
    lion:     { draw: (m, t, mv) => drawLion(m, t, true, mv),   sc: 0.74, lane: 0.900, speed: 32, acts: ['jump', 'roll', 'fart'],          jumpH: 24, rearPiv: -32, ventX: 46, ventY: 44, hitW: 60, hitH: 100 },
  };
  function spawnHerd(t){
    const kinds = Object.keys(HERD_KINDS).filter(k => k !== lastHerdType);
    const type = kinds[(Math.random() * kinds.length) | 0];
    lastHerdType = type;
    const K = HERD_KINDS[type];
    const adults = 1 + (Math.random() * 4 | 0);         // 1..4 grown (big) animals
    const extras = Math.random() < 0.5 ? 1 + (Math.random() * 2 | 0) : 0;  // + a medium/small or two
    const n = adults + extras;
    const fromLeft = Math.random() < 0.5;
    const dir = fromLeft ? 1 : -1;
    const baseSpeed = K.speed * (0.85 + Math.random() * 0.4);
    const lane = K.lane + (Math.random() - 0.5) * 0.03;
    const hid = herdSeq++;                                // groups members of one herd
    for (let i = 0; i < n; i++){
      const depth = (Math.random() - 0.5) * 0.045;       // y spread → fake depth
      // three sizes: big (adults) and extras that are medium (0.75) or small (0.5)
      const sizeF = i < adults ? 1 : (Math.random() < 0.5 ? 0.75 : 0.5);
      const cub = sizeF < 1;
      const sc = K.sc * sizeF * (1 + depth * 1.2);
      // per-individual colour variety: a brightness shade (lionesses/elephants/
      // giraffes read it), plus a giraffe patch colour (some browner)
      const tint = 0.82 + Math.random() * 0.34;          // 0.82–1.16
      const spotCol = type === 'giraffe'
        ? ['#B07028', '#8A5A28', '#71481E', '#9C6A2E', '#7E552A'][Math.random() * 5 | 0]
        : null;
      const spacing = W * (0.05 + Math.random() * 0.045);
      const start = fromLeft ? -(W * 0.06) - i * spacing
                             :  (W + W * 0.06) + i * spacing;
      HERD.push({
        x: start + (Math.random() - 0.5) * W * 0.02,
        y: H * (lane + depth),
        s: U * sc, dir, ph: Math.random() * TAU, wt: 0,
        speed: baseSpeed * (0.9 + Math.random() * 0.22),
        acts: K.acts, jumpH: K.jumpH, rearPiv: K.rearPiv,
        ventX: K.ventX, ventY: K.ventY, hitW: K.hitW, hitH: K.hitH,
        draw: K.draw, entered: false, herdId: hid, kind: type, cub, size: sizeF,
        tint, spotCol,
        nextActAt: t + 3 + Math.random() * 10,
      });
    }
  }
  function updateHerdMember(m, t, dt){
    const moving = !m.act;                               // pauses only to act
    if (moving){
      m.wt += dt * (m.speed / 6);
      m.x += m.dir * m.speed * U * dt;
    }
    return moving;
  }

  // ── animal acts, borrowed from the unicorn valley: a joyful jump, a
  //    rear-up on the hind legs, or (zebras only) a gentle green toot ──
  function animalAct(a, t){
    if (!a.acts) return null;
    if (!a.act){
      if (a.nextActAt === undefined) a.nextActAt = t + 5 + psr(a.ph * 7.3) * 12;
      if (t >= a.nextActAt){
        let type = a.acts[(Math.random() * a.acts.length) | 0];
        // farts are ~3× less frequent (with many animals they were too common):
        // if 'fart' came up, re-pick a non-fart act 2/3 of the time
        if (type === 'fart' && Math.random() < 2 / 3){
          const others = a.acts.filter(x => x !== 'fart');
          if (others.length) type = others[(Math.random() * others.length) | 0];
        }
        a.act = { type, t0: t };
        a.nextActAt = t + 9 + Math.random() * 16;
      }
      if (!a.act) return null;
    }
    const act = a.act;
    const dur = { jump: 0.8, fart: 1.5, rear: 1.2, roar: 1.6, spin: 2.4, roll: 2.2,
                  trumpet: 1.8, shower: 2.2, bury: 2.8 }[act.type];
    const p = (t - act.t0) / dur;
    if (p >= 1){ a.act = null; return null; }
    if (act.type === 'jump')
      return { yOff: -Math.sin(p * Math.PI) * (a.jumpH || 30) * a.s,
               rot: -Math.sin(p * TAU) * 0.07 * a.dir, pivot: 0 };
    if (act.type === 'rear')
      return { yOff: 0, rot: -0.45 * Math.sin(p * Math.PI) * a.dir,
               pivot: a.rearPiv || -30 };
    if (act.type === 'roar')
      // chest rises in a mini-rear; the head/mouth/shockwaves are drawn by
      // drawLion + the renderFrame roar FX (rings + screen shake)
      return { yOff: 0, rot: -0.10 * Math.sin(p * Math.PI) * a.dir,
               pivot: a.rearPiv || -30 };
    if (act.type === 'trumpet' || act.type === 'shower' || act.type === 'bury')
      // choreographed inside the animal's own draw (trunk / neck poses)
      return { yOff: 0, rot: 0, pivot: 0 };
    if (act.type === 'spin'){
      // chasing its own tail: rapid about-faces, little bounces, kicked dust
      if ((a.lastPuff || 0) < t - 0.3){
        a.lastPuff = t;
        FARTS.push({ x: a.x + (Math.random() - 0.5) * 40 * a.s, y: a.y - 4 * a.s,
                     dx: (Math.random() - 0.5) * 12 * a.s, t0: t,
                     r: (8 + Math.random() * 5) * a.s, ph: Math.random() * TAU, col: 'dust' });
      }
      return { yOff: -Math.abs(Math.sin(p * Math.PI * 6)) * 4 * a.s,
               rot: Math.sin(p * 30) * 0.03 * a.dir, pivot: 0,
               flip: Math.cos(p * TAU * 2) >= 0 ? 1 : -1 };
    }
    if (act.type === 'roll'){
      // a good dust roll: the animal shakes inside a billowing brown cloud
      if ((a.lastPuff || 0) < t - 0.11){
        a.lastPuff = t;
        FARTS.push({ x: a.x + (Math.random() - 0.5) * 70 * a.s,
                     y: a.y - Math.random() * (a.hitH || 100) * 0.5 * a.s,
                     dx: (Math.random() - 0.5) * 10 * a.s, t0: t,
                     r: (11 + Math.random() * 7) * a.s, ph: Math.random() * TAU, col: 'dust' });
      }
      return { yOff: -Math.abs(Math.sin(p * Math.PI * 4)) * 3 * a.s,
               rot: Math.sin(p * 26) * 0.05 * a.dir, pivot: 0 };
    }
    // fart: embarrassed shimmy + soft green puffs from the rear
    if ((a.lastPuff || 0) < t - 0.16 && p < 0.55){
      a.lastPuff = t;
      FARTS.push({ x: a.x - (a.ventX || 46) * a.s * a.dir,
                   y: a.y - (a.ventY || 70) * a.s,
                   dx: -a.dir * (7 + Math.random() * 8) * a.s, t0: t,
                   r: (6 + Math.random() * 5) * a.s, ph: Math.random() * TAU });
    }
    return { yOff: -Math.abs(Math.sin(p * Math.PI * 3)) * 3 * a.s,
             rot: Math.sin(p * 40) * 0.015 * (1 - p) * a.dir, pivot: 0 };
  }
  function drawWithAct(a, t, fn){
    // ground shadow — drawn in WORLD space, before any act transform, so it
    // stays flat on the floor while the animal jumps, rears on its hind legs,
    // or spins (it no longer lifts or tilts with the body)
    if (a.hitW){
      ctx.fillStyle = 'rgba(38,14,6,.30)';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 1.5 * a.s, a.hitW * 0.82 * a.s, a.hitW * 0.11 * a.s, 0, 0, TAU);
      ctx.fill();
    }
    const fx2 = animalAct(a, t);
    if (!fx2){ fn(); return; }
    ctx.save();
    if (fx2.rot){
      const px = a.x + fx2.pivot * a.s * a.dir, py = a.y;
      ctx.translate(px, py); ctx.rotate(fx2.rot); ctx.translate(-px, -py);
    }
    const sy = a.y, sd = a.dir;
    a.y += fx2.yOff;
    if (fx2.flip) a.dir *= fx2.flip;
    fn();
    a.y = sy; a.dir = sd;
    ctx.restore();
  }
  // gentle green toot clouds — drift away from the rear, rise and fade
  function drawFarts(t){
    for (let i = FARTS.length - 1; i >= 0; i--){
      const f = FARTS[i];
      const age = t - f.t0;
      if (age > 2.2){ FARTS.splice(i, 1); continue; }
      const q = age / 2.2;
      const x = f.x + f.dx * age + Math.sin(t * 2 + f.ph) * 3;
      const y = f.y - 16 * age;
      const r = f.r * (1 + q * 1.6);
      const dust = f.col === 'dust';
      const a = (dust ? 0.42 : 0.34) * (1 - q);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${dust ? '190, 154, 106' : '178, 232, 140'}, ${a.toFixed(3)})`);
      g.addColorStop(0.6, `rgba(${dust ? '168, 132, 88' : '150, 215, 120'}, ${(a * 0.6).toFixed(3)})`);
      g.addColorStop(1, `rgba(${dust ? '150, 116, 76' : '140, 205, 110'}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }

  // ── ambient life ──
  // early stars twinkling in the dark upper sky (drawn before clouds so the
  // clouds drift over them)
  function drawStars(t){
    ctx.save();
    for (const s of STARS){
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
      const a = s.base * tw;
      if (a <= 0.02) continue;
      ctx.globalAlpha = Math.min(1, a * 0.9);
      ctx.fillStyle = '#fff3d8';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      if (s.r > 1.25){                          // a faint sparkle cross
        ctx.globalAlpha = Math.min(1, a * 0.5);
        ctx.strokeStyle = '#fff3d8'; ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 2.2, s.y); ctx.lineTo(s.x + s.r * 2.2, s.y);
        ctx.moveTo(s.x, s.y - s.r * 2.2); ctx.lineTo(s.x, s.y + s.r * 2.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // shooting stars: every few seconds a meteor streaks across the upper sky
  // with a fading tail, then vanishes.
  function drawShooters(t){
    if (t >= nextShootAt){
      nextShootAt = t + 3 + Math.random() * 6;
      const fromLeft = Math.random() < 0.6, dir = fromLeft ? 1 : -1;
      const sp = W * (0.45 + Math.random() * 0.35);
      SHOOTERS.push({
        x: W * (fromLeft ? 0.04 + Math.random() * 0.4 : 0.56 + Math.random() * 0.4),
        y: H * (0.03 + Math.random() * 0.17),
        vx: dir * sp, vy: sp * (0.32 + Math.random() * 0.3),
        tail: W * (0.06 + Math.random() * 0.05),
        t0: t, life: 0.7 + Math.random() * 0.6,
      });
    }
    ctx.save(); ctx.lineCap = 'round';
    for (let i = SHOOTERS.length - 1; i >= 0; i--){
      const s = SHOOTERS[i], e = t - s.t0, p = e / s.life;
      if (p >= 1){ SHOOTERS.splice(i, 1); continue; }
      const hx = s.x + s.vx * e, hy = s.y + s.vy * e;
      const mag = Math.hypot(s.vx, s.vy), ux = s.vx / mag, uy = s.vy / mag;
      const tx = hx - ux * s.tail, ty = hy - uy * s.tail;
      const a = Math.sin(p * Math.PI);
      const g = ctx.createLinearGradient(hx, hy, tx, ty);
      g.addColorStop(0, `rgba(255,250,235,${(0.9 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,250,${(0.95 * a).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(hx, hy, 1.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // when the lion roars, three jagged lightning bolts flash across the sky
  function drawRoarBolts(t, roarP){
    if (roarP <= 0 || roarP >= 0.55) return;
    const t0 = (LION.act && LION.act.t0) || 0, seed = Math.floor(t0 * 9);
    const flick = Math.max(0, 1 - roarP / 0.55) * (Math.sin(t * 55) > 0 ? 1 : 0.5);
    if (flick < 0.06) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // a faint flash washing the sky
    ctx.fillStyle = `rgba(212,228,255,${(0.12 * flick).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H * 0.72);
    for (let b = 0; b < 3; b++){
      const bx = W * (0.2 + b * 0.3) + (psr(b + seed) - 0.5) * W * 0.06;
      const botY = H * (0.30 + psr(b + seed + 5) * 0.12), segs = 6;
      const pts = [[bx, 0]];
      for (let s2 = 1; s2 <= segs; s2++)
        pts.push([bx + (psr(b * 9 + s2 + seed) - 0.5) * W * 0.045, botY * (s2 / segs)]);
      const trace = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); };
      ctx.strokeStyle = `rgba(150,190,255,${(0.35 * flick).toFixed(3)})`; ctx.lineWidth = 7; trace();
      ctx.strokeStyle = `rgba(245,250,255,${(0.95 * flick).toFixed(3)})`; ctx.lineWidth = 2.4; trace();
      // a short fork off the middle
      const f = pts[3];
      ctx.beginPath(); ctx.moveTo(f[0], f[1]);
      ctx.lineTo(f[0] + (psr(b + seed + 2) - 0.5) * W * 0.05, f[1] + botY * 0.2); ctx.stroke();
    }
    ctx.restore();
  }
  // puffy clouds drifting across the high sky — ported from the unicorns
  // scene (overlapping arc-puffs + a soft under-light), warm-tinted for sunset
  function drawClouds(t, dt){
    for (const cl of CLOUDS){
      cl.x += cl.spd * dt;
      if (cl.x - 160 * cl.s > W) cl.x = -170 * cl.s;
      const puffs = [[0, 0, 46], [-38, 10, 32], [38, 8, 34], [-14, -14, 34], [18, -12, 30]];
      const tint = cl.tint;
      ctx.fillStyle = `rgba(255, ${(228 - tint * 30) | 0}, ${(198 - tint * 40) | 0}, 0.82)`;
      ctx.beginPath();
      for (const [px, py, pr] of puffs){
        ctx.moveTo(cl.x + px * cl.s + pr * cl.s, cl.y + py * cl.s);
        ctx.arc(cl.x + px * cl.s, cl.y + py * cl.s, pr * cl.s, 0, TAU);
      }
      ctx.fill();
      // warm sunset under-light
      ctx.fillStyle = 'rgba(255, 150, 88, 0.26)';
      ctx.beginPath();
      ctx.ellipse(cl.x, cl.y + 22 * cl.s, 60 * cl.s, 12 * cl.s, 0, 0, TAU);
      ctx.fill();
    }
  }
  function drawBirds(t){
    ctx.strokeStyle = 'rgba(40,12,10,.8)'; ctx.lineWidth = U * 0.95; ctx.lineCap = 'round';
    // three flocks at different heights/speeds for a livelier sky
    for (const [spd, off, by, n] of [[26, 0, 0.09, 5], [19, 700, 0.17, 4], [14, 1300, 0.13, 3]]){
      const span = W + 300;
      const bx = ((t * spd + off) % span) - 150;
      for (let i = 0; i < n; i++){
        const px = bx - i * 28 - (i % 2) * 9;
        const py = H * by + Math.sin(t * 0.8 + i) * 8 + i * 6;
        const flap = Math.sin(t * 7 + i * 1.3) * 4;
        ctx.beginPath();
        ctx.moveTo(px - 6.5, py - flap);
        ctx.quadraticCurveTo(px, py + 2.5, px + 6.5, py - flap);
        ctx.stroke();
      }
    }
  }
  function drawMotes(t){
    for (const m of MOTES){
      const mx2 = (m.x + t * m.sp) % (W + 20) - 10;
      const my2 = m.y + Math.sin(t * 0.5 + m.ph) * 14;
      ctx.fillStyle = `rgba(255,200,120,${0.10 + 0.10 * Math.sin(t * 1.2 + m.ph)})`;
      ctx.beginPath(); ctx.arc(mx2, my2, m.r, 0, TAU); ctx.fill();
    }
  }
  function drawGrass(t){
    ctx.lineCap = 'round';
    for (const g of GRASS){
      for (let b = 0; b < 5; b++){
        const lean = (b - 2) * 0.35 + Math.sin(t * 1.3 + g.ph + b) * 0.16;
        const len = (14 + (b % 3) * 6) * g.s;
        ctx.strokeStyle = b % 2 ? 'rgba(120,70,30,.85)' : 'rgba(160,95,40,.85)';
        ctx.lineWidth = 1.6 * g.s;
        ctx.beginPath();
        ctx.moveTo(g.x + b * 3 * g.s, g.y);
        ctx.quadraticCurveTo(
          g.x + b * 3 * g.s + lean * len * 0.4, g.y - len * 0.6,
          g.x + b * 3 * g.s + lean * len, g.y - len);
        ctx.stroke();
      }
    }
  }

  // ── main loop ──
  let rafId = null, lastT = 0;
  // click-spin envelope (borrowed from the space scene's Saturn): a quick
  // ramp-up then a slow ease-back over `dur` seconds.
  function clickEnv(t0, t, dur){
    if (t0 == null) return 0;
    const e = t - t0;
    if (e < 0 || e > dur) return 0;
    return e < 0.35 ? e / 0.35 : 1 - (e - 0.35) / (dur - 0.35);
  }
  // when clicked, the sun comes forward and visibly spins — sunspots sweep
  // across the disc and the corona rays rotate, then it eases back to rest.
  function drawSunSpin(t, dt){
    const f = clickEnv(sunBoostT, t, 4);
    if (f <= 0) return;
    sunSpin += dt * (0.5 + 2.4 * f);          // accumulates → no angle jump
    const { x, y, r } = SUN;
    ctx.save();
    ctx.translate(x, y);
    // rotating corona rays flaring out
    ctx.save();
    ctx.rotate(sunSpin * 0.5);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++){
      const a = i / 12 * TAU;
      ctx.strokeStyle = `rgba(255,210,120,${(0.28 * f).toFixed(3)})`;
      ctx.lineWidth = 2 + (i % 2) * 2.5;
      const r2 = r * (1.16 + 0.06 * Math.sin(t * 3 + i));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
    // the glowing disc (same look as the resting sun), clipped, with a
    // rotating surface so the spin reads
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.fillStyle = rg(ctx, 0, 0, r * 0.1, r, [
      [0, '#fff3cd'], [0.7, '#ffd470'], [1, '#ffae45'],
    ]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.rotate(sunSpin);
    for (const sp of SUNSPOTS){
      const sx2 = Math.cos(sp.ang) * sp.rad * r, sy2 = Math.sin(sp.ang) * sp.rad * r;
      ctx.fillStyle = 'rgba(228,140,52,.45)';
      ctx.beginPath(); ctx.ellipse(sx2, sy2, sp.rx * r, sp.ry * r, sp.ang, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,.4)';
      ctx.beginPath(); ctx.ellipse(sx2 - sp.rx * r * 0.4, sy2 - sp.ry * r * 0.4, sp.rx * r * 0.5, sp.ry * r * 0.5, sp.ang, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ── flying unicorn (ported from the unicorns scene) — crosses the sky when
  //    the sun is clicked, trailing sparkles ──
  const UNI_BODY = '#FFFBFE', UNI_OUT = '#E9B9D6';
  function uniRRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function uniSparkle(x, y, s, a, rot, col){
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
    ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
    ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
    ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
    ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
  }
  function uniFeather(ang, len, w, fill, line){
    ctx.save(); ctx.rotate(ang);
    ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-w, -len * 0.45, -w * 0.55, -len * 0.85);
    ctx.quadraticCurveTo(0, -len * 1.04, w * 0.55, -len * 0.85);
    ctx.quadraticCurveTo(w, -len * 0.45, 0, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -len * 0.15); ctx.lineTo(0, -len * 0.92);
    ctx.strokeStyle = 'rgba(233, 185, 214, 0.45)'; ctx.stroke();
    ctx.restore();
  }
  function uniWing(t, ph, far, spread){
    const flap = Math.sin(t * 7 + ph) * 0.38 - 0.10;
    ctx.save();
    ctx.translate(10, -22); ctx.rotate(flap + (far ? 0.20 : 0));
    if (far) ctx.scale(0.92, 0.92);
    const priF = far ? '#F5D7E9' : '#FFFEFE', priL = far ? '#DCAACB' : UNI_OUT;
    const covF = far ? '#F0C6DF' : '#FFE4F2', covL = far ? '#D9A2C5' : '#EBB6D6';
    const span = 1.15 * spread + 0.30;
    for (let i = 6; i >= 0; i--){
      const fr = i / 6;
      uniFeather(-0.50 - fr * span, (46 - fr * 14) * (0.68 + 0.32 * spread), 6.2, priF, priL);
    }
    for (let i = 4; i >= 0; i--){
      const fr = i / 4;
      uniFeather(-0.52 - fr * span * 0.78, (24 - fr * 6) * (0.7 + 0.3 * spread), 4.8, covF, covL);
    }
    ctx.fillStyle = priF; ctx.strokeStyle = covL; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -2, 7.5, 5.5, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawUnicorn(x, y, sc, dir, t, ph){
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.2 + ph) * 2.2 * sc);
    ctx.scale(sc * dir, sc);
    const maneCols = ['#FF6FB5', '#C77DFF', '#7DC4FF', '#FFD2E8'];
    const wave = i => Math.sin(t * 2.2 + ph + i * 1.7) * 4;
    uniWing(t, ph, true, 1);
    for (let i = 0; i < 4; i++){
      ctx.strokeStyle = maneCols[i]; ctx.lineWidth = 7.5 - i * 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-43, -18 + i * 4);
      ctx.bezierCurveTo(-66, -28 + i * 6 + wave(i), -88, -4 + i * 9 - wave(i + 1),
                        -94, 28 + i * 7 + wave(i + 2));
      ctx.stroke();
    }
    const leg = (hx, hy, a1, a2, far) => {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a1);
      ctx.fillStyle = far ? '#F3DCEC' : UNI_BODY; ctx.strokeStyle = far ? '#DDB3CF' : UNI_OUT; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-5.5, -2); ctx.lineTo(5.5, -2); ctx.lineTo(3.4, 24); ctx.lineTo(-3.4, 24);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.translate(0, 23); ctx.rotate(a2);
      ctx.beginPath(); ctx.moveTo(-3.2, 0); ctx.lineTo(3.2, 0); ctx.lineTo(2.4, 29); ctx.lineTo(-2.4, 29);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F2B968'; uniRRect(-3.4, 27, 6.8, 7, 2.6); ctx.fill();
      ctx.restore();
    };
    leg(-24, 8,  0.85, 0.30, true);
    leg(-32, 10, 0.65, 0.22, false);
    leg(30, 8,  -0.80, -0.45, true);
    leg(22, 10, -0.55, -0.50, false);
    ctx.fillStyle = UNI_BODY; ctx.strokeStyle = UNI_OUT; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-44, -20);
    ctx.bezierCurveTo(-53, -12, -53, 2, -44, 12);
    ctx.quadraticCurveTo(-20, 23, 8, 20);
    ctx.bezierCurveTo(24, 18, 34, 12, 36, 2);
    ctx.quadraticCurveTo(39, -6, 42, -14);
    ctx.bezierCurveTo(48, -26, 54, -38, 58, -50);
    ctx.quadraticCurveTo(63, -56, 66, -61);
    ctx.bezierCurveTo(73, -63, 79, -66, 82, -69);
    ctx.lineTo(83, -74);
    ctx.bezierCurveTo(76, -79, 68, -81, 61, -82);
    ctx.bezierCurveTo(54, -79, 49, -70, 42, -56);
    ctx.quadraticCurveTo(33, -42, 24, -33);
    ctx.quadraticCurveTo(-4, -30, -26, -31);
    ctx.quadraticCurveTo(-40, -32, -44, -20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(244, 188, 220, 0.30)';
    ctx.beginPath(); ctx.ellipse(-8, 8, 28, 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48, -38, 7, 15, -0.65, 0, TAU); ctx.fill();
    ctx.fillStyle = '#E8A0C8';
    ctx.beginPath(); ctx.ellipse(77, -71.5, 1.6, 2.0, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = UNI_OUT; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(77.5, -69.5, 3.4, 0.5, 1.5); ctx.stroke();
    ctx.fillStyle = UNI_BODY; ctx.strokeStyle = UNI_OUT; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(46, -82); ctx.lineTo(50.5, -95); ctx.lineTo(55.5, -81.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F9C8E2';
    ctx.beginPath(); ctx.moveTo(48.5, -83); ctx.lineTo(50.6, -91); ctx.lineTo(53, -82.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = lg(ctx, 54, -86, 66, -114, [[0, '#FFDF8A'], [1, '#FFAE3D']]);
    ctx.strokeStyle = '#E8A24C'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(53.5, -82.5); ctx.lineTo(65, -113); ctx.lineTo(59.5, -81);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    uniSparkle(65, -114, 3.4 + Math.sin(t * 3 + ph) * 1.4, 0.55 + 0.45 * Math.sin(t * 3 + ph), t, '#FFF6D8');
    ctx.fillStyle = '#5A3A55';
    ctx.beginPath(); ctx.ellipse(59, -72.5, 2.6, 3.3, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(59.9, -73.7, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 190, 0.40)';
    ctx.beginPath(); ctx.arc(66, -64, 3.4, 0, TAU); ctx.fill();
    uniWing(t, ph + 0.5, false, 1);
    for (let i = 0; i < 4; i++){
      ctx.strokeStyle = maneCols[i]; ctx.lineWidth = 7.2 - i * 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(50 - i, -82 + i * 2.5);
      ctx.bezierCurveTo(42 - i * 2, -66 + wave(i), 36 - i * 3, -48 - wave(i + 1), 14 - i * 5, -30 + wave(i));
      ctx.stroke();
    }
    ctx.strokeStyle = '#FF6FB5'; ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(52, -84);
    ctx.quadraticCurveTo(61 + wave(0) * 0.4, -82, 64, -76); ctx.stroke();
    ctx.restore();
  }
  function spawnSkyUnicorn(){
    const dir = Math.random() < 0.5 ? 1 : -1;
    SKYUNI = {
      x: dir > 0 ? -240 : W + 240, dir,
      yBase: H * (0.15 + Math.random() * 0.14),
      spd: W * (0.20 + Math.random() * 0.08),
      sc: Math.min(W, H) / 1050, ph: Math.random() * TAU, trail: [],
    };
  }
  function drawSkyUnicorn(t, dt){
    if (!SKYUNI) return;
    const f = SKYUNI;
    f.x += f.dir * f.spd * dt;
    const y = f.yBase + Math.sin(t * 1.1 + f.ph) * H * 0.03;
    if ((f.dir > 0 && f.x - 240 > W) || (f.dir < 0 && f.x + 240 < 0)){ SKYUNI = null; return; }
    const cols = ['#FF6F91', '#FFD166', '#8AE08A', '#7DC4FF', '#C77DFF'];
    f.trail.push({ x: f.x - f.dir * 60 * f.sc, y: y + 6, born: t });
    while (f.trail.length && t - f.trail[0].born > 1.2) f.trail.shift();
    f.trail.forEach((tp, i) => {
      const age = (t - tp.born) / 1.2;
      uniSparkle(tp.x, tp.y + Math.sin(t * 3 + i) * 4, 4.5 * (1 - age) + 1,
                 (1 - age) * 0.8, i * 0.7, cols[i % cols.length]);
    });
    drawUnicorn(f.x, y, f.sc, f.dir, t, f.ph);
  }

  // a floating heart shown ONLY while two cliff cats meet FACE TO FACE — from
  // ~½cm before their fronts touch through ~1cm of overlap, and only then.
  function drawPrideHearts(t){
    const pride = [LION, LIONESS, CUB, MEDLIO].filter(Boolean);
    const CM = 38;                                  // ~1cm on screen
    for (let i = 0; i < pride.length; i++){
      for (let j = i + 1; j < pride.length; j++){
        const a = pride[i], b = pride[j];
        const left = a.x <= b.x ? a : b, right = a.x <= b.x ? b : a;
        // face-to-face only: the left one faces right, the right one faces left
        if (!(left.dir > 0 && right.dir < 0)) continue;
        const faceL = (left.hitW || 60) * 0.8 * left.s;
        const faceR = (right.hitW || 60) * 0.8 * right.s;
        const gap = (right.x - faceR) - (left.x + faceL);   // +apart … 0 touch … −overlap
        if (gap > 0.5 * CM || gap < -CM) continue;          // only the meeting window
        const mx = ((left.x + faceL) + (right.x - faceR)) / 2;
        const topS = Math.max(left.s, right.s);
        const my = Math.min(left.y, right.y) - 92 * topS + Math.sin(t * 2) * 4;
        const sz = (20 + Math.sin(t * 4.5) * 3) * topS;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = sz + 'px serif';
        ctx.fillText('❤️', mx, my);
        ctx.restore();
      }
    }
  }

  function renderFrame(t){
    const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    // lion roar cadence: armed by the 5-minute timer or the 5th click, it fires
    // as soon as the lion is free (so the roar is rare, not part of the rotation)
    if (roarTimerStart === null) roarTimerStart = t;
    if (t - roarTimerStart >= ROAR_EVERY_SEC) roarPending = true;
    if (roarPending && !LION.act){
      LION.act = { type: 'roar', t0: t };
      roarPending = false; roarClicks = 0; roarTimerStart = t;
    }
    // the roar rattles the whole frame
    const roarP = (LION.act && LION.act.type === 'roar')
      ? Math.min(1, (t - LION.act.t0) / 1.6) : 0;
    const shake = Math.sin(roarP * Math.PI) * 4;
    ctx.save();
    if (shake > 0.1)
      ctx.translate((psr(t * 53.7) - 0.5) * 2 * shake, (psr(t * 71.3) - 0.5) * 2 * shake);
    ctx.drawImage(staticLayer.cv, 0, 0, W, H);
    drawSunSpin(t, dt);
    drawStars(t);
    drawShooters(t);
    drawRoarBolts(t, roarP);
    drawClouds(t, dt);
    drawSkyUnicorn(t, dt);
    drawMotes(t);
    drawBirds(t);
    // roaming herds: keep SEVERAL crossing at once — spawn on a brisk cadence
    // up to a cap, then move/draw each member back→front; cull on exit.
    const MAX_HERDS = 2;
    const activeHerds = new Set(HERD.map(m => m.herdId)).size;
    if (t >= nextHerdAt && activeHerds < MAX_HERDS){
      spawnHerd(t);
      nextHerdAt = t + 3 + Math.random() * 4;
    }
    for (const m of HERD.slice().sort((a, b) => a.y - b.y)){
      const mv = updateHerdMember(m, t, dt);
      drawWithAct(m, t, () => m.draw(m, t, mv));
    }
    HERD = HERD.filter(m => {
      if (m.x > 0 && m.x < W) m.entered = true;          // it's on screen
      if (!m.entered) return true;                       // not entered yet
      const pad = (m.hitW || 60) * m.s * 1.5 + 130;      // fully past the edge
      return m.x > -pad && m.x < W + pad;                // else it has left
    });
    // the resident pride paces its rock (drawn over the plain)
    const movLs = updateWalker(LIONESS, t, dt);
    drawWithAct(LIONESS, t, () => drawLion(LIONESS, t, true, movLs));
    const movCb = updateWalker(CUB, t, dt);
    drawWithAct(CUB, t, () => drawLion(CUB, t, true, movCb, { ribbon: true }));
    const movMl = updateWalker(MEDLIO, t, dt);
    drawWithAct(MEDLIO, t, () => drawLion(MEDLIO, t, true, movMl, { ribbon: true }));
    const movL = updateWalker(LION, t, dt);
    drawWithAct(LION, t, () => drawLion(LION, t, false, movL));
    drawPrideHearts(t);
    // roar shockwaves rippling out from the lion's head
    if (roarP > 0 && roarP < 1){
      const hx = LION.x + 44 * LION.s * LION.dir, hy = LION.y - 86 * LION.s;
      for (const k of [0, 0.22, 0.44]){
        const q = roarP * 1.2 - k;
        if (q <= 0 || q >= 1) continue;
        ctx.strokeStyle = `rgba(255, 220, 160, ${(0.5 * (1 - q)).toFixed(3)})`;
        ctx.lineWidth = 3 * (1 - q) + 1;
        ctx.beginPath();
        ctx.arc(hx + LION.dir * 8 * LION.s, hy, (10 + q * 130) * LION.s, 0, TAU);
        ctx.stroke();
      }
    }
    drawFarts(t);
    drawGrass(t);
    ctx.drawImage(vigLayer.cv, 0, 0, W, H);
    ctx.restore();   // roar shake
  }
  function draw(ts){
    if (stopped) return;
    renderFrame(ts / 1000);
    rafId = requestAnimationFrame(draw);
  }

  function resize(){
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildScene();
    staticLayer = makeLayer(); vigLayer = makeLayer();
    paintScene(staticLayer.cx); paintVignette(vigLayer.cx);
  }
  // ── click an animal → it performs one of its acts right away ──
  // (document listener + game-UI filter, per the porting checklist)
  const savClick = e => {
    if (stopped) return;
    if (e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov')) return;
    const mx = e.clientX, my = e.clientY;
    // every clickable critter: the resident pride + ALL live herd members
    let hit = null;
    for (const a of [LION, LIONESS, CUB, MEDLIO, ...HERD]){
      if (!a || !a.acts) continue;
      const hw = (a.hitW || 60) * a.s, hh = (a.hitH || 110) * a.s;
      if (mx > a.x - hw && mx < a.x + hw && my > a.y - hh && my < a.y + 8 * a.s){
        if (!hit || a.y > hit.y) hit = a;          // prefer the front-most
      }
    }
    if (hit === LION){
      // every click on the lion counts toward its roar cadence (even mid-act);
      // the 5th arms a roar, clicks 1–4 give a small rear reaction
      if (++roarClicks >= ROAR_EVERY_CLICKS) roarPending = true;
      else if (!hit.act) hit.act = { type: 'rear', t0: lastT };
      return;
    }
    if (hit && !hit.act){
      hit.act = { type: hit.acts[(Math.random() * hit.acts.length) | 0], t0: lastT };
      return;
    }
    // click the sun → it spins (like Saturn) AND a unicorn flies across the sky
    if (SUN && (mx - SUN.x) ** 2 + (my - SUN.y) ** 2 < SUN.r * SUN.r){
      sunBoostT = lastT;
      if (!SKYUNI) spawnSkyUnicorn();
    }
  };
  document.addEventListener('click', savClick);

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(draw);

  // ── roaming chibi "rumi": strolls across the savanna every few minutes ──
  const chibiLayer = document.createElement('div');
  chibiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
  stage.appendChild(chibiLayer);
  let chibiPatrol = null;
  function ensureChibiWalker(cb){
    if (window.ChibiWalker){ cb(); return; }
    const ex = document.querySelector('script[data-chibi-walker]');
    if (ex){ ex.addEventListener('load', cb); return; }
    const s = document.createElement('script');
    s.src = 'backgrounds/rumi/chibi-walker.js';
    s.setAttribute('data-chibi-walker', '1');
    s.onload = cb;
    document.head.appendChild(s);
  }
  ensureChibiWalker(function(){
    if (stopped) return;                          // background already switched away
    chibiPatrol = ChibiWalker.patrol(chibiLayer, {
      height: '18.4vh', bottom: '6vh', duration: 16000,   // ~big-lioness height (16vh +15%)
      gapMin: 120000, gapMax: 240000,             // reappears every 2–4 minutes
      startDelay: 6000
    });
  });

  return function cleanup(){
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (chibiPatrol) chibiPatrol.stop();
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', savClick);
    stage.innerHTML = '';
  };
  },
};
