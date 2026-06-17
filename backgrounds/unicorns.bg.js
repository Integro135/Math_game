/* ── Unicorn Valley background module ───────────────────────────────────────
   Candy-pink valley: static prerender (candy sky, sun halo, three mountain
   ridges with snow caps, rainbow, princess castle, hills, meadow flowers in
   paintScenery) + dynamic layer (drifting candy clouds, twinkling sparkles,
   falling petals, rising hearts, 3 butterflies, 3 winged flyers with sparkle
   ribbon trails, 3 standing unicorns incl. the foal, click bursts).
   Unicorn rig: drawUnicorn(...,pose) with 'stand'/'fly' poses — actions reuse
   'fly' instead of new rigs.
   Click reactions (click + per-unicorn random schedule share one code path):
   standing unicorn → jump (0.9 s parabola) or rear-up (1.25 s, pivots on the
   hind hooves); flyer → eased 360° somersault; castle → golden halo + window
   flares + rising sparkles; rainbow → brightens + a color pulse sweeps the
   arch; every click also pops a 14-particle sparkle+heart burst.
   Docs: backgrounds/README.md.
   Loaded on demand by game/js/bg-loader.js. Registers itself into the
   BACKGROUNDS registry; init() mounts the scene into the given stage layer
   and returns a cleanup that stops every loop and listener it created. */
window.BACKGROUNDS=window.BACKGROUNDS||{};
window.BACKGROUNDS.unicorns={
  skin:'unicorns',              // game look:  game/skins/unicorns.skin.css
  aids:'unicorns',              // aid art:    aids/unicorns.aids.js (unicorn line + cupcake jar)
  init({stage}){
  const layer=stage;
  let stopped=false;
  layer.innerHTML='';layer.style.overflow='hidden';
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%';
  layer.appendChild(canvas);
  const ctx    = canvas.getContext('2d');
  const DPR    = Math.min(devicePixelRatio || 1, 2);
  const TAU    = Math.PI * 2;
  let W, H;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function lg(c, x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function rg(c, x,y,r1,r2,st){const g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  function hexA(hex, a){ const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n>>16) + ',' + (n>>8&255) + ',' + (n&255) + ',' + a + ')'; }
  function makeLayer(){
    const cv = document.createElement('canvas');
    cv.width = W * DPR; cv.height = H * DPR;
    const cx = cv.getContext('2d');
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv, cx };
  }

  // ── Scene state ──────────────────────────────────────────────────────────
  let CLOUDS, SPARKLES, PETALS, HEARTS, BUTTERFLIES, FLYER, UNICORNS, BURSTS, FARTS;
  let RAINFX, CASTLEFX, CASTLE, CASTLE_BFLY, nextSceneryAt;
  let SUN, SUNSPOTS, sunBoostT = null, sunSpin = 0;   // click the sun → it spins
  let skyLayer;
  // colour variants for the roaming unicorns (null = the classic white +
  // rainbow mane); the others are cyan and pink
  const CYAN_PAL = { body: '#DDF2FF', out: '#8FC8E0', bodyFar: '#CDEAF7', outFar: '#7FB6D0',
                     mane: ['#42C6EE', '#7DC4FF', '#A9E4FF', '#D9F4FF'] };
  const PINK_PAL = { body: '#FFE2EF', out: '#F0A0C4', bodyFar: '#FAD2E5', outFar: '#E892B6',
                     mane: ['#FF5FA8', '#FF8FC8', '#FFB6DE', '#FFD7EC'] };
  const UNI_PALS = [null, CYAN_PAL, PINK_PAL];
  // every 5th click on a unicorn fires a random horn effect (lightning / nova)
  const HORN_EVERY = 5;
  const HORN_AUTO_EVERY_SEC = 180;                  // also fire on a timer: once every 3 min
  let hornClicks = 0, HORNFX = [], hornTimerStart = null;
  // a unicorn toots on a deliberate cadence: once every 3 minutes OR every 5
  // clicks, whichever comes first (both counters reset when a toot fires).
  // Kept at closure scope so a window resize (which re-runs init) never resets it.
  const FART_EVERY_SEC = 180, FART_EVERY_CLICKS = 5;
  let fartClicks = 0, fartTimerStart = null, fartPending = false;

  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    init();
    skyLayer = makeLayer();
    paintScenery(skyLayer.cx);
  }

  function init() {
    // the dreamy sun — geometry for click-to-spin (matches paintScenery)
    SUN = { x: W * 0.76, y: H * 0.20, r: Math.min(W, H) * 0.09 };
    SUNSPOTS = Array.from({ length: 6 }, () => ({
      rad: 0.18 + Math.random() * 0.6, ang: Math.random() * TAU,
      rx: 0.07 + Math.random() * 0.1, ry: 0.05 + Math.random() * 0.08,
    }));
    sunBoostT = null; sunSpin = 0;
    // Puffy candy clouds drifting across the sky
    CLOUDS = Array.from({length: 6}, (_, i) => ({
      x: Math.random() * W,
      y: H * (0.06 + Math.random() * 0.30),
      s: 0.55 + Math.random() * 0.9,        // size factor
      spd: 6 + Math.random() * 10,          // px per second
      tint: Math.random(),                  // 0 → white, 1 → pink
    }));
    // Twinkling magic sparkles scattered over the whole valley
    SPARKLES = Array.from({length: 42}, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.9,
      s: 2.2 + Math.random() * 4.5,
      spd: 0.8 + Math.random() * 2.0,
      ph: Math.random() * TAU,
      rot: Math.random() * TAU,
    }));
    // Petals raining gently
    PETALS = Array.from({length: 26}, () => spawnPetal(true));
    // Little hearts floating up
    HEARTS = Array.from({length: 8}, () => spawnHeart(true));
    // Butterflies wandering
    BUTTERFLIES = Array.from({length: 3}, () => ({
      x: Math.random() * W,
      y: H * (0.45 + Math.random() * 0.35),
      ang: Math.random() * TAU,
      spd: 28 + Math.random() * 22,
      ph: Math.random() * TAU,
      hue: Math.random() < 0.5 ? '#FF6FB5' : '#C77DFF',
    }));
    // Winged unicorns crossing the sky, each with its own sparkle trail.
    // Keep the scene light: at most 5 unicorns on screen at once (sky + ground),
    // so 2 sky flyers + 3 roaming = 5 total.
    FLYER = Array.from({length: 2}, (_, i) => spawnFlyer(true, i));
    // Roaming unicorns: solo wanderers that walk the meadow and slip in/out of
    // the screen edges (like the savanna herds); 3 on stage, mixed colours.
    UNICORNS = Array.from({ length: 3 }, () => spawnUnicorn(true));
    CASTLE_BFLY = [];   // butterflies that burst from the castle on click
    // Click-burst particles (sparkles + hearts)
    BURSTS = [];
    FARTS = [];   // gentle green toots
    // Rainbow shimmer + castle celebration (click & random schedule)
    RAINFX = { t0: null };
    CASTLEFX = { t0: null };
    nextSceneryAt = null;
    CASTLE = { x: W * 0.855, y: H * 0.655, s: Math.min(W, H) * 0.0016 };
    HORNFX = [];
  }

  function spawnPetal(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -12,
      vy: 14 + Math.random() * 18,          // px/s falling
      sway: Math.random() * TAU,
      swaySpd: 0.8 + Math.random() * 1.4,
      s: 3 + Math.random() * 4,
      rot: Math.random() * TAU,
      col: ['#FF9FCB', '#FFB7DB', '#F58FBE', '#FFD2E8'][0 | Math.random() * 4],
    };
  }

  function spawnFlyer(first, i) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    return {
      dir,
      spd: 75 + Math.random() * 55,
      x: dir > 0 ? -220 : W + 220,
      yBase: H * (0.08 + Math.random() * 0.26),
      sc: Math.min(W, H) / (820 + Math.random() * 320),
      ph: Math.random() * TAU,
      wait: first ? i * 4 + Math.random() * 4 : 5 + Math.random() * 10,
      trail: [],
    };
  }

  // a solo roaming unicorn: walks the meadow, exits an edge, re-enters from a
  // side. onScreen=true seeds it somewhere visible; otherwise it waits off-edge.
  function spawnUnicorn(onScreen) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const sc = Math.min(W, H) / (660 + Math.random() * 540);
    const pad = 150 * sc + 80;
    return {
      x: onScreen ? Math.random() * W : (dir > 0 ? -pad : W + pad),
      gy: H * (0.86 + Math.random() * 0.09),
      sc, dir, ph: Math.random() * TAU,
      spd: 26 + Math.random() * 26,
      wt: Math.random() * TAU,
      pal: UNI_PALS[Math.random() * UNI_PALS.length | 0],
      wait: onScreen ? 0 : Math.random() * 1.6,
      act: null, nextActAt: undefined,
    };
  }

  function spawnHeart(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 14,
      vy: 9 + Math.random() * 10,           // px/s rising
      sway: Math.random() * TAU,
      s: 4 + Math.random() * 5,
      a: 0.35 + Math.random() * 0.4,
    };
  }

  // ── A princess castle perched on the mountains ───────────────────────────
  function drawCastle(c, x, y, s) {
    // x,y — base center; s — unit scale (castle is ~150 units tall)
    const wallF = '#FFF1F8', wallS = '#F6D3E8', line = '#D9A2C5';
    const roofF = '#E85FA8', roofD = '#C9447F';
    c.lineWidth = 1.4;

    // rocky plateau the castle stands on, merging into the ridge below
    c.fillStyle = '#B65BA6';
    c.beginPath();
    c.moveTo(x - 100 * s, y + 34 * s);
    c.quadraticCurveTo(x - 72 * s, y - 6 * s, x - 32 * s, y - 2 * s);
    c.quadraticCurveTo(x, y - 9 * s, x + 32 * s, y - 2 * s);
    c.quadraticCurveTo(x + 72 * s, y - 6 * s, x + 100 * s, y + 34 * s);
    c.closePath(); c.fill();

    const litWindow = (wx, wy, w, h) => {
      c.fillStyle = '#FFD978';
      c.strokeStyle = '#E8A24C';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(x + (wx - w / 2) * s, y + (wy + h / 2) * s);
      c.lineTo(x + (wx - w / 2) * s, y + (wy - h / 2 + w / 2) * s);
      c.arc(x + wx * s, y + (wy - h / 2 + w / 2) * s, w / 2 * s, Math.PI, 0);
      c.lineTo(x + (wx + w / 2) * s, y + (wy + h / 2) * s);
      c.closePath(); c.fill(); c.stroke();
    };
    const pennant = (tx, topY) => {
      c.strokeStyle = '#C99A3F';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x + tx * s, y + topY * s);
      c.lineTo(x + tx * s, y + (topY - 14) * s);
      c.stroke();
      c.fillStyle = '#FF5FA8';
      c.beginPath();
      c.moveTo(x + tx * s, y + (topY - 14) * s);
      c.lineTo(x + (tx - 12) * s, y + (topY - 11) * s);
      c.lineTo(x + tx * s, y + (topY - 8) * s);
      c.closePath(); c.fill();
    };
    const tower = (tx, w, hTop, coneH, flag) => {
      c.fillStyle = wallF;
      c.strokeStyle = line;
      c.lineWidth = 1.4;
      c.fillRect(x + (tx - w / 2) * s, y - hTop * s, w * s, hTop * s);
      c.strokeRect(x + (tx - w / 2) * s, y - hTop * s, w * s, hTop * s);
      c.fillStyle = wallS;                              // soft side shading
      c.fillRect(x + (tx + w * 0.18) * s, y - hTop * s, w * 0.32 * s, hTop * s);
      c.fillStyle = roofF;                              // cone roof
      c.strokeStyle = roofD;
      c.beginPath();
      c.moveTo(x + (tx - w / 2 - 5) * s, y - hTop * s);
      c.lineTo(x + tx * s, y - (hTop + coneH) * s);
      c.lineTo(x + (tx + w / 2 + 5) * s, y - hTop * s);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#FFD978';                          // golden tip
      c.beginPath();
      c.arc(x + tx * s, y - (hTop + coneH) * s, 2.4 * s, 0, TAU);
      c.fill();
      if (flag) pennant(tx, -(hTop + coneH) - 2);
    };

    // back side-towers
    tower(-52, 24, 70, 30, false);
    tower(52, 24, 70, 30, false);
    litWindow(-52, -52, 7, 12);
    litWindow(52, -52, 7, 12);
    // curtain wall with battlements
    c.fillStyle = wallF;
    c.strokeStyle = line;
    c.fillRect(x - 44 * s, y - 36 * s, 88 * s, 36 * s);
    c.strokeRect(x - 44 * s, y - 36 * s, 88 * s, 36 * s);
    for (let i = 0; i < 7; i++) {                       // crenellations
      c.fillRect(x + (-44 + 2 + i * 12.5) * s, y - 42 * s, 7 * s, 7 * s);
      c.strokeRect(x + (-44 + 2 + i * 12.5) * s, y - 42 * s, 7 * s, 7 * s);
    }
    // small front turrets
    tower(-26, 15, 58, 24, false);
    tower(26, 15, 58, 24, false);
    litWindow(-26, -44, 5.5, 9);
    litWindow(26, -44, 5.5, 9);
    // tall central keep
    tower(0, 30, 92, 38, true);
    litWindow(0, -74, 8, 13);
    litWindow(0, -52, 8, 13);
    // arched gate with a golden knob
    c.fillStyle = '#C9659E';
    c.strokeStyle = '#A84B82';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x - 9 * s, y);
    c.lineTo(x - 9 * s, y - 16 * s);
    c.arc(x, y - 16 * s, 9 * s, Math.PI, 0);
    c.lineTo(x + 9 * s, y);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#FFD978';
    c.beginPath(); c.arc(x + 4 * s, y - 8 * s, 1.5 * s, 0, TAU); c.fill();
  }

  // ── Static scenery: sky, sun, rainbow, mountains, hills, flowers ─────────
  function ridge(c, yTop, amp, n, color, snow) {
    // a jagged mountain range across the width, peaks at semi-random heights
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * W;
      const peak = (i % 2 === 1);
      const y = yTop + (peak ? -amp * (0.55 + Math.random() * 0.45)
                             :  amp * (0.15 + Math.random() * 0.3));
      pts.push([x, y]);
    }
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-10, H);
    c.lineTo(-10, pts[0][1]);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(W + 10, H);
    c.closePath();
    c.fill();
    if (snow) {
      // snowy pink-white caps on the peaks
      c.fillStyle = 'rgba(255, 244, 250, 0.95)';
      for (let i = 1; i < pts.length - 1; i += 2) {
        const [px, py] = pts[i];
        const lx = (pts[i - 1][0] + px) / 2, ly = (pts[i - 1][1] + py) / 2;
        const rx = (pts[i + 1][0] + px) / 2, ry = (pts[i + 1][1] + py) / 2;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + (lx - px) * 0.45, py + (ly - py) * 0.45);
        c.quadraticCurveTo(px, py + (ly - py) * 0.62, px + (rx - px) * 0.45, py + (ry - py) * 0.45);
        c.closePath();
        c.fill();
      }
    }
    return pts;
  }

  function paintScenery(c) {
    // Candy sky — deep rose up top melting into peach at the horizon
    c.fillStyle = lg(c, 0, 0, 0, H, [
      [0,    '#F7A8D8'],
      [0.35, '#FFC3E2'],
      [0.62, '#FFDDEE'],
      [0.78, '#FFE9D9'],
      [1,    '#FFD9EC'],
    ]);
    c.fillRect(0, 0, W, H);

    // Dreamy sun with a soft halo
    const sx = W * 0.76, sy = H * 0.20, sr = Math.min(W, H) * 0.09;
    c.fillStyle = rg(c, sx, sy, sr * 0.2, sr * 3.4, [
      [0,   'rgba(255, 252, 235, 0.9)'],
      [0.3, 'rgba(255, 235, 210, 0.35)'],
      [1,   'rgba(255, 220, 200, 0)'],
    ]);
    c.fillRect(0, 0, W, H);
    c.fillStyle = rg(c, sx, sy, sr * 0.1, sr, [
      [0, '#FFFDF2'], [0.75, '#FFF3CE'], [1, '#FFE9B8'],
    ]);
    c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();

    // Far mountains — pale lavender, hazy
    ridge(c, H * 0.52, H * 0.16, 8, '#E8BBE4', true);
    // Rainbow arching between the far and middle ranges
    {
      const bands = ['#FF6F91', '#FFA45C', '#FFE066', '#8AE08A', '#7DC4FF', '#C77DFF'];
      const rx = W * 0.50, ry = H * 0.66, rad = Math.min(W, H) * 0.42;
      c.save();
      c.globalAlpha = 0.42;
      bands.forEach((col, i) => {
        c.strokeStyle = col;
        c.lineWidth = Math.min(W, H) * 0.016;
        c.beginPath();
        c.arc(rx, ry, rad - i * c.lineWidth * 0.92, Math.PI, TAU);
        c.stroke();
      });
      c.restore();
    }
    // Middle mountains — orchid pink with snow caps
    ridge(c, H * 0.62, H * 0.17, 6, '#DD93CF', true);
    // Near mountains — deep raspberry, no snow
    ridge(c, H * 0.72, H * 0.13, 5, '#C66BB4', false);
    // A broad earthen mound under the castle so it sits on connected ground
    // (rises from the foreground hills up to the castle base, not floating).
    {
      const cx = W * 0.855, cs = Math.min(W, H) * 0.0016;
      const top = H * 0.655 + 30 * cs;                  // just under the castle plateau
      c.fillStyle = lg(c, 0, top, 0, H, [[0, '#BE63AE'], [1, '#A14A8C']]);
      c.beginPath();
      c.moveTo(cx - W * 0.30, H);
      c.quadraticCurveTo(cx - W * 0.20, top + H * 0.05, cx - W * 0.07, top);
      c.quadraticCurveTo(cx, top - H * 0.012, cx + W * 0.07, top);
      c.quadraticCurveTo(cx + W * 0.20, top + H * 0.05, cx + W * 0.31, H);
      c.closePath();
      c.fill();
    }
    // Princess castle perched on the right-side ridge
    drawCastle(c, W * 0.855, H * 0.655, Math.min(W, H) * 0.0016);

    // Rolling foreground hills
    c.fillStyle = lg(c, 0, H * 0.74, 0, H, [
      [0, '#F08FC4'], [0.55, '#E06CAE'], [1, '#C4519A'],
    ]);
    c.beginPath();
    c.moveTo(-10, H);
    c.lineTo(-10, H * 0.84);
    c.quadraticCurveTo(W * 0.22, H * 0.755, W * 0.46, H * 0.835);
    c.quadraticCurveTo(W * 0.62, H * 0.885, W * 0.82, H * 0.845);
    c.quadraticCurveTo(W * 0.94, H * 0.823, W + 10, H * 0.855);
    c.lineTo(W + 10, H);
    c.closePath();
    c.fill();

    // Tiny meadow flowers sprinkled over the hills
    for (let i = 0; i < 90; i++) {
      const fx = Math.random() * W;
      const fy = H * (0.86 + Math.random() * 0.13);
      const fs = 1.2 + Math.random() * 2.0;
      c.fillStyle = ['#FFE9F4', '#FFD2E8', '#FFF6CE', '#E8D8FF'][0 | Math.random() * 4];
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * TAU;
        c.beginPath();
        c.arc(fx + Math.cos(a) * fs, fy + Math.sin(a) * fs, fs * 0.75, 0, TAU);
        c.fill();
      }
      c.fillStyle = '#FFB948';
      c.beginPath(); c.arc(fx, fy, fs * 0.6, 0, TAU); c.fill();
    }
  }

  // ── A hand-drawn cartoon unicorn ─────────────────────────────────────────
  // Local coords: origin at body center, +x toward the head; ground at y≈68.
  // pose: 'stand' (idle sway) or 'fly' (winged alicorn, legs in a gallop)
  const BODY = '#FFFBFE', OUT = '#E9B9D6';

  // One feather: a slim rounded vane with a faint central shaft, drawn pointing
  // "up" in local space and rotated into place around the shoulder pivot.
  function feather(ang, len, w, fill, line) {
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = fill;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-w, -len * 0.45, -w * 0.55, -len * 0.85);
    ctx.quadraticCurveTo(0, -len * 1.04, w * 0.55, -len * 0.85);   // rounded tip
    ctx.quadraticCurveTo(w, -len * 0.45, 0, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();                                   // feather shaft
    ctx.moveTo(0, -len * 0.15);
    ctx.lineTo(0, -len * 0.92);
    ctx.strokeStyle = 'rgba(233, 185, 214, 0.45)';
    ctx.stroke();
    ctx.restore();
  }

  // A bird-like wing: a fan of long primary feathers under a layer of shorter
  // pink coverts, rooted at the shoulder. spread: 1 = full flight, ~0.45 = folded.
  function drawWing(t, ph, far, spread) {
    const flying = spread > 0.7;
    const flap = flying
      ? Math.sin(t * 7 + ph) * 0.38 - 0.10
      : Math.sin(t * 1.6 + ph) * 0.04;                 // gentle breathing fold
    ctx.save();
    ctx.translate(10, -22);                            // shoulder joint
    ctx.rotate(flap + (far ? 0.20 : 0));
    if (far) ctx.scale(0.92, 0.92);
    const priF = far ? '#F5D7E9' : '#FFFEFE';
    const priL = far ? '#DCAACB' : OUT;
    const covF = far ? '#F0C6DF' : '#FFE4F2';
    const covL = far ? '#D9A2C5' : '#EBB6D6';
    // primaries — longest at the leading edge, fanning back (trailing first)
    const span = 1.15 * spread + 0.30;
    for (let i = 6; i >= 0; i--) {
      const fr = i / 6;                                // 0 leading … 1 trailing
      const ang = -0.50 - fr * span;
      const len = (46 - fr * 14) * (0.68 + 0.32 * spread);
      feather(ang, len, 6.2, priF, priL);
    }
    // coverts — a shorter, blush-tinted layer on top
    for (let i = 4; i >= 0; i--) {
      const fr = i / 4;
      const ang = -0.52 - fr * span * 0.78;
      feather(ang, (24 - fr * 6) * (0.7 + 0.3 * spread), 4.8, covF, covL);
    }
    // shoulder cap
    ctx.fillStyle = priF;
    ctx.strokeStyle = covL;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -2, 7.5, 5.5, -0.5, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawUnicorn(x, y, sc, dir, t, ph, pose, opts) {
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.2 + ph) * 2.2 * sc);  // gentle idle bob
    ctx.scale(sc * dir, sc);

    const fly = pose === 'fly';
    // colour palette (shadows the module defaults so cyan/pink variants work)
    const BODY = opts.body || '#FFFBFE', OUT = opts.out || '#E9B9D6';
    const FAR_BODY = opts.bodyFar || '#F3DCEC', FAR_OUT = opts.outFar || '#DDB3CF';
    const maneCols = opts.mane || ['#FF6FB5', '#C77DFF', '#7DC4FF', '#FFD2E8'];
    const wave = i => Math.sin(t * 2.2 + ph + i * 1.7) * 4;

    drawWing(t, ph, true, fly ? 1 : 0.45);              // far wing behind the body

    // ── tail: long flowing ribbons with a curl at the tip ──
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = maneCols[i];
      ctx.lineWidth = 7.5 - i * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-43, -18 + i * 4);
      ctx.bezierCurveTo(
        -66, -28 + i * 6 + wave(i),
        -88, -4 + i * 9 - wave(i + 1),
        -76 - (fly ? 18 : 0), 28 + i * 7 + wave(i + 2)
      );
      ctx.stroke();
    }

    // ── legs: two segments with a knee joint + golden hooves ──
    // (hx,hy) hip/shoulder pivot; a1 upper-segment angle; a2 knee bend; far pair dimmer
    const leg = (hx, hy, a1, a2, far) => {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(a1);
      ctx.fillStyle = far ? FAR_BODY : BODY;
      ctx.strokeStyle = far ? FAR_OUT : OUT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();                                  // tapered upper segment
      ctx.moveTo(-5.5, -2); ctx.lineTo(5.5, -2);
      ctx.lineTo(3.4, 24); ctx.lineTo(-3.4, 24);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.translate(0, 23);
      ctx.rotate(a2);
      ctx.beginPath();                                  // slimmer lower segment
      ctx.moveTo(-3.2, 0); ctx.lineTo(3.2, 0);
      ctx.lineTo(2.4, 29); ctx.lineTo(-2.4, 29);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F2B968';                        // golden hoof
      r_rect(-3.4, 27, 6.8, 7, 2.6);
      ctx.fill();
      ctx.restore();
    };
    if (fly) {
      leg(-24, 8,  0.85, 0.30, true);                   // hind pair trailing back
      leg(-32, 10, 0.65, 0.22, false);
      leg(30, 8,  -0.80, -0.45, true);                  // front pair reaching out
      leg(22, 10, -0.55, -0.50, false);
    } else if (pose === 'walk') {
      const wk = opts.wt || 0, s1 = Math.sin(wk), s2 = Math.sin(wk + Math.PI);
      leg(-30, 9,  0.10 + s2 * 0.34, -0.10, true);      // diagonal gait
      leg(-28, 12, 0.10 + s1 * 0.34, -0.06, false);
      leg(30, 9,  -0.10 + s1 * 0.34,  0.06, true);
      leg(22, 12, -0.10 + s2 * 0.34,  0.04, false);
    } else {
      leg(-26, 10,  0.14, -0.08, true);
      leg(-34, 12,  0.04, -0.02, false);
      leg(30, 10,  -0.12,  0.05, true);
      leg(22, 12,  -0.02,  0.02, false);
    }

    // ── body, arched neck and a long horse face — one continuous silhouette ──
    ctx.fillStyle = BODY;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-44, -20);                               // tail set, low on the croup
    ctx.bezierCurveTo(-53, -12, -53, 2, -44, 12);       // rounded buttock
    ctx.quadraticCurveTo(-20, 23, 8, 20);               // belly underline
    ctx.bezierCurveTo(24, 18, 34, 12, 36, 2);           // girth up to the chest
    ctx.quadraticCurveTo(39, -6, 42, -14);              // chest front
    ctx.bezierCurveTo(48, -26, 54, -38, 58, -50);       // throat rising
    ctx.quadraticCurveTo(63, -56, 66, -61);             // jaw and round cheek
    ctx.bezierCurveTo(73, -63, 79, -66, 82, -69);       // under the chin
    ctx.lineTo(83, -74);                                // lips
    ctx.bezierCurveTo(76, -79, 68, -81, 61, -82);       // long straight face bridge
    ctx.bezierCurveTo(54, -79, 49, -70, 42, -56);       // poll down the arched crest
    ctx.quadraticCurveTo(33, -42, 24, -33);             // crest into the withers
    ctx.quadraticCurveTo(-4, -30, -26, -31);            // back with a soft dip
    ctx.quadraticCurveTo(-40, -32, -44, -20);           // rise of the croup
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // belly + neck shading
    ctx.fillStyle = 'rgba(244, 188, 220, 0.30)';
    ctx.beginPath(); ctx.ellipse(-8, 8, 28, 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48, -38, 7, 15, -0.65, 0, TAU); ctx.fill();

    // ── cutie mark on the haunch: a little heart / star, like real unicorns ──
    {
      const marks = ['💜', '⭐', '💗', '🌟', '✨'];
      const cm = marks[Math.abs(Math.floor(ph * 7)) % marks.length];
      ctx.save();
      ctx.translate(-27, -5);
      ctx.scale(dir, 1);                 // keep the emoji upright when facing left
      ctx.font = '17px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cm, 0, 0);
      ctx.restore();
    }

    // ── nostril + mouth line on the long muzzle ──
    ctx.fillStyle = '#E8A0C8';
    ctx.beginPath(); ctx.ellipse(77, -71.5, 1.6, 2.0, -0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(77.5, -69.5, 3.4, 0.5, 1.5); ctx.stroke();

    // ── ear, alert on the poll ──
    ctx.fillStyle = BODY;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(46, -82); ctx.lineTo(50.5, -95); ctx.lineTo(55.5, -81.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F9C8E2';
    ctx.beginPath();
    ctx.moveTo(48.5, -83); ctx.lineTo(50.6, -91); ctx.lineTo(53, -82.5);
    ctx.closePath(); ctx.fill();

    // ── the horn: a slim, gently curved, spiralled golden spike with a glow ──
    {
      const bx = 53, by = -81, tx = 66.5, ty = -117;          // base centre → tip
      const aL = Math.hypot(tx - bx, ty - by);
      const ux = (tx - bx) / aL, uy = (ty - by) / aL;          // axis unit
      const nx = -uy, ny = ux;                                 // perpendicular unit
      const wB = 3.4, mx = bx + (tx - bx) * 0.5, my = by + (ty - by) * 0.5;  // base half-width, midpoint
      // the tip twinkles only once every few tens of seconds (not continuously):
      // a short bright burst on a per-unicorn cycle, dim and calm in between
      const TWK_PERIOD = 26;                                   // ~26 s between twinkles
      const TWK_DUR = 1.1;                                     // each twinkle lasts ~1.1 s
      const cyc = ((t / TWK_PERIOD) + (ph * 0.61) % 1) % 1;    // 0..1 progress, staggered by ph
      const twk = cyc < TWK_DUR / TWK_PERIOD                   // smooth in/out during the burst
                ? Math.sin((cyc / (TWK_DUR / TWK_PERIOD)) * Math.PI) : 0;
      // soft glowing aura at the tip — faint at rest, flares during a twinkle
      const glow = 0.12 + 0.62 * twk;
      ctx.fillStyle = rg(ctx, tx, ty, 0, 15, [
        [0, `rgba(255,246,205,${glow.toFixed(3)})`], [1, 'rgba(255,246,205,0)']]);
      ctx.beginPath(); ctx.arc(tx, ty, 15, 0, TAU); ctx.fill();
      // the horn body — a tapering spike, edges bowed slightly out then to a point
      ctx.fillStyle = lg(ctx, bx, by, tx, ty, [
        [0, '#E89B28'], [0.35, '#FFCF66'], [0.72, '#FFE7A2'], [1, '#FFF7DC']]);
      ctx.strokeStyle = '#C9821F'; ctx.lineWidth = 0.8; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(bx + nx * wB, by + ny * wB);
      ctx.quadraticCurveTo(mx + nx * wB * 0.55, my + ny * wB * 0.55, tx, ty);          // one edge to the tip
      ctx.quadraticCurveTo(mx - nx * wB * 0.55, my - ny * wB * 0.55, bx - nx * wB, by - ny * wB);  // other edge
      ctx.quadraticCurveTo(bx - ux * 2, by - uy * 2, bx + nx * wB, by + ny * wB);      // rounded root
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // spiral ridges wrapping up the horn (chevrons bowed toward the tip)
      ctx.strokeStyle = 'rgba(168,108,22,.5)'; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const u = 0.1 + i * 0.12, w = wB * (1 - u * 0.9);
        const cx = bx + (tx - bx) * u, cy = by + (ty - by) * u;
        ctx.lineWidth = Math.max(0.4, 1.0 * (1 - u * 0.55));
        ctx.beginPath();
        ctx.moveTo(cx + nx * w, cy + ny * w);
        ctx.quadraticCurveTo(cx + ux * 3, cy + uy * 3, cx - nx * w, cy - ny * w);
        ctx.stroke();
      }
      // a bright sheen running up the front edge
      ctx.strokeStyle = 'rgba(255,250,228,.7)'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(bx - nx * wB * 0.4, by - ny * wB * 0.4);
      ctx.quadraticCurveTo(mx - nx * wB * 0.2, my, tx, ty);
      ctx.stroke();
      if (twk > 0.02)                                         // sparkle only during a twinkle burst
        drawSparkle(tx, ty, 2.4 + 4.0 * twk, twk, t * 2, '#FFF6D8');
    }

    // ── big sparkly eye with lashes, high on the face + blush on the cheek ──
    ctx.fillStyle = '#5A3A55';
    ctx.beginPath(); ctx.ellipse(59, -72.5, 2.6, 3.3, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(59.9, -73.7, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(58.3, -71.3, 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5A3A55';
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(57.4, -75.8); ctx.lineTo(55.4, -77.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(59.0, -76.4); ctx.lineTo(57.9, -78.6); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 140, 190, 0.40)';
    ctx.beginPath(); ctx.arc(66, -64, 3.4, 0, TAU); ctx.fill();

    drawWing(t, ph + 0.5, false, fly ? 1 : 0.45);       // near wing over the body

    // ── mane: full ribbons flowing down the arched crest onto the withers ──
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = maneCols[i];
      ctx.lineWidth = 7.2 - i * 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(50 - i, -82 + i * 2.5);
      ctx.bezierCurveTo(
        42 - i * 2, -66 + wave(i),
        36 - i * 3, -48 - wave(i + 1),
        14 - i * 5, -30 + wave(i)
      );
      ctx.stroke();
    }
    // pale shine strand on top of the mane
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(50, -83);
    ctx.bezierCurveTo(42, -67 + wave(0) * 0.6, 36, -50, 18, -33 + wave(1) * 0.5);
    ctx.stroke();
    // forelock falling over the brow
    ctx.strokeStyle = maneCols[0];
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(52, -84);
    ctx.quadraticCurveTo(61 + wave(0) * 0.4, -82, 64, -76);
    ctx.stroke();

    ctx.restore();
  }

  function r_rect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── Dynamic elements ─────────────────────────────────────────────────────
  function drawClouds(t, dt) {
    for (const cl of CLOUDS) {
      cl.x += cl.spd * dt;
      if (cl.x - 160 * cl.s > W) cl.x = -170 * cl.s;
      const puffs = [[0, 0, 46], [-38, 10, 32], [38, 8, 34], [-14, -14, 34], [18, -12, 30]];
      const tint = cl.tint;
      ctx.fillStyle = `rgba(${255}, ${244 - tint * 26 | 0}, ${250 - tint * 14 | 0}, 0.85)`;
      ctx.beginPath();
      for (const [px, py, pr] of puffs)
        ctx.moveTo(cl.x + px * cl.s + pr * cl.s, cl.y + py * cl.s),
        ctx.arc(cl.x + px * cl.s, cl.y + py * cl.s, pr * cl.s, 0, TAU);
      ctx.fill();
      // rosy under-light
      ctx.fillStyle = 'rgba(255, 170, 215, 0.30)';
      ctx.beginPath();
      ctx.ellipse(cl.x, cl.y + 22 * cl.s, 60 * cl.s, 12 * cl.s, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawSparkle(x, y, s, a, rot, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
    ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
    ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
    ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSparkles(t) {
    for (const sp of SPARKLES) {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(t * sp.spd + sp.ph));
      drawSparkle(sp.x, sp.y, sp.s, a * 0.8, sp.rot, '#FFFFFF');
    }
  }

  function drawPetals(t, dt) {
    for (let i = 0; i < PETALS.length; i++) {
      const p = PETALS[i];
      p.y += p.vy * dt;
      p.x += Math.sin(t * p.swaySpd + p.sway) * 22 * dt;
      p.rot += dt * 1.6;
      if (p.y > H + 14) { PETALS[i] = spawnPetal(false); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function heartPath(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.85);
    ctx.bezierCurveTo(-s * 1.25, -s * 0.1, -s * 0.55, -s, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.55, -s, s * 1.25, -s * 0.1, 0, s * 0.85);
    ctx.closePath();
  }

  function drawHearts(t, dt) {
    for (let i = 0; i < HEARTS.length; i++) {
      const hh = HEARTS[i];
      hh.y -= hh.vy * dt;
      hh.x += Math.sin(t * 0.9 + hh.sway) * 12 * dt;
      if (hh.y < -16) { HEARTS[i] = spawnHeart(false); continue; }
      ctx.save();
      ctx.translate(hh.x, hh.y);
      ctx.globalAlpha = hh.a * (0.7 + 0.3 * Math.sin(t * 2 + hh.sway));
      ctx.fillStyle = '#FF5FA8';
      heartPath(hh.s);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawButterflies(t, dt) {
    for (const b of BUTTERFLIES) {
      b.ang += (Math.sin(t * 0.7 + b.ph) * 0.9) * dt;
      b.x += Math.cos(b.ang) * b.spd * dt;
      b.y += Math.sin(b.ang) * b.spd * 0.5 * dt;
      if (b.x < -20) b.x = W + 18; if (b.x > W + 20) b.x = -18;
      b.y = Math.max(H * 0.30, Math.min(H * 0.88, b.y));
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 14 + b.ph));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = b.hue;
      ctx.beginPath(); ctx.ellipse(-4, 0, 5.5, 7.5 * flap, -0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, 0, 5.5, 7.5 * flap, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7A4068';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // ── castle butterfly burst — clicking the keep sends a flurry of butterflies
  //    fluttering outward, then fading ──
  function spawnCastleButterflies(t) {
    const { x, y, s } = CASTLE;
    const cols = ['#FF6FB5', '#C77DFF', '#7DC4FF', '#FFD166', '#8AE08A', '#FF9FCB'];
    const n = 16 + (Math.random() * 8 | 0);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;   // up & outward
      const spd = 38 + Math.random() * 95;
      CASTLE_BFLY.push({
        x: x + (Math.random() - 0.5) * 90 * s, y: y - (30 + Math.random() * 70) * s,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        ph: Math.random() * TAU, t0: t, life: 2.6 + Math.random() * 2.2,
        hue: cols[i % cols.length], sc: 0.7 + Math.random() * 0.8,
      });
    }
  }
  function drawCastleButterflies(t, dt) {
    for (let i = CASTLE_BFLY.length - 1; i >= 0; i--) {
      const b = CASTLE_BFLY[i], age = t - b.t0;
      if (age > b.life) { CASTLE_BFLY.splice(i, 1); continue; }
      b.x += (b.vx + Math.sin(t * 3 + b.ph) * 18) * dt;     // flutter sideways
      b.y += b.vy * dt;
      b.vx *= (1 - 0.4 * dt); b.vy *= (1 - 0.4 * dt);       // ease out the launch
      const k = age / b.life, alpha = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 16 + b.ph));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(b.x, b.y); ctx.scale(b.sc, b.sc);
      ctx.fillStyle = b.hue;
      ctx.beginPath(); ctx.ellipse(-4, 0, 5.5, 7.5 * flap, -0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, 0, 5.5, 7.5 * flap, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7A4068';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ── horn effects (fired every 5th unicorn click): a lightning bolt or a
  //    supernova, both bursting from the horn tip ──
  function hornTip(u) {                                  // world position of the horn tip
    const bob = Math.sin(lastT * 1.2 + u.ph) * 2.2 * u.sc;
    const drawY = u.gy - 70 * u.sc + bob;
    return { x: u.x + 66.5 * u.sc * u.dir, y: drawY + (-117) * u.sc };
  }
  function fireHornFx(u, t, force) {
    u.recoilT0 = t;                                   // knock the firing unicorn backward (recoil)
    const tip = hornTip(u), unit = Math.max(0.7, u.sc * 0.95);
    if ((force || (Math.random() < 0.5 ? 'bolt' : 'nova')) === 'bolt') {
      // lightning bolt: a jagged forked spear up & forward from the tip
      const ax = 0.35 * u.dir, ay = -0.94, len = (80 + Math.random() * 45) * unit;
      const px = -ay, py = ax, segs = 6, pts = [];
      for (let i = 0; i <= segs; i++) {
        const f = i / segs, jit = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 18 * unit;
        pts.push([tip.x + ax * len * f + px * jit, tip.y + ay * len * f + py * jit]);
      }
      HORNFX.push({ type: 'bolt', t0: t, x: tip.x, y: tip.y, pts, dir: u.dir, unit });
    } else {
      // supernova (ported from the success screen), scaled to the horn
      const maxR = 120 * unit, ej = [], inf = [];
      const ec = ['#7DC4FF', '#C77DFF', '#FFD27D', '#FFFFFF', '#FFFFFF'];
      for (let j = 0; j < 56; j++) ej.push({ ang: Math.random() * TAU,
        speed: 0.25 + Math.pow(Math.random(), 1.5) * 0.75, life: 1.1 * (0.7 + Math.random() * 0.3),
        size: (1 + Math.random() * 2) * unit, streak: Math.random() < 0.3, color: ec[j % 5] });
      for (let i = 0; i < 14; i++) { const born = Math.random() * 0.22;
        inf.push({ ang: Math.random() * TAU, r0: (40 + Math.random() * 70) * unit, born, life: 0.45 - born, w: 0.7 + Math.random() }); }
      HORNFX.push({ type: 'nova', t0: t, x: tip.x, y: tip.y, unit, maxR, ej, inf });
    }
  }
  function drawHornFxAll(t) {
    for (let i = HORNFX.length - 1; i >= 0; i--)
      if (!(HORNFX[i].type === 'bolt' ? drawHornBolt(HORNFX[i], t) : drawHornNova(HORNFX[i], t)))
        HORNFX.splice(i, 1);
  }
  function drawHornBolt(fx, t) {
    const p = (t - fx.t0) / 0.55;
    if (p >= 1) return false;
    const flick = (Math.sin(t * 60) > 0 ? 1 : 0.45) * (1 - p * 0.7);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = `rgba(205,232,255,${(0.5 * flick).toFixed(3)})`;          // muzzle flash
    ctx.beginPath(); ctx.arc(fx.x, fx.y, 4 + 9 * fx.unit * flick, 0, TAU); ctx.fill();
    const trace = () => { ctx.beginPath(); ctx.moveTo(fx.pts[0][0], fx.pts[0][1]);
      for (let i = 1; i < fx.pts.length; i++) ctx.lineTo(fx.pts[i][0], fx.pts[i][1]); ctx.stroke(); };
    ctx.strokeStyle = `rgba(150,200,255,${(0.4 * flick).toFixed(3)})`; ctx.lineWidth = 7 * fx.unit; trace();
    ctx.strokeStyle = `rgba(247,251,255,${(0.95 * flick).toFixed(3)})`; ctx.lineWidth = 2.3 * fx.unit; trace();
    const b = fx.pts[3];                                                       // a small fork
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + 14 * fx.dir * fx.unit, b[1] - 20 * fx.unit); ctx.stroke();
    ctx.restore();
    return true;
  }
  function drawHornNova(fx, t) {
    const dur = 1.7, tE = 0.45, te0 = t - fx.t0;
    if (te0 >= dur) return false;
    const cx = fx.x, cy = fx.y, unit = fx.unit, maxR = fx.maxR, gF = clamp01((dur - te0) / 0.25);
    ctx.save(); ctx.lineCap = 'round';
    if (te0 < tE) {
      const charge = te0 / tE;
      for (const f of fx.inf) {
        const fq = clamp01((te0 - f.born) / f.life); if (fq <= 0 || fq >= 1) continue;
        const fr = f.r0 * (1 - fq * fq), len = (8 + 12 * fq) * unit;
        ctx.strokeStyle = `rgba(222,240,255,${(fq * 0.8 * gF).toFixed(3)})`; ctx.lineWidth = f.w;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(f.ang) * fr, cy + Math.sin(f.ang) * fr);
        ctx.lineTo(cx + Math.cos(f.ang) * (fr + len), cy + Math.sin(f.ang) * (fr + len)); ctx.stroke();
      }
      const cr = (4 + 7 * charge) * unit * (charge > 0.85 ? 1 + (charge - 0.85) * 4 : 1);
      ctx.fillStyle = rg(ctx, cx, cy, 0, cr * 6, [[0, `rgba(255,255,255,${0.5 + 0.5 * charge})`],
        [0.3, hexA('#FFD27D', 0.5 * charge + 0.2)], [1, hexA('#FFD27D', 0)]]);
      ctx.beginPath(); ctx.arc(cx, cy, cr * 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
    } else {
      const te = te0 - tE;
      const sq = clamp01(te / (dur * 0.55));               // shock ring
      if (sq < 1) {
        const sr = maxR * 1.05 * (1 - Math.pow(1 - sq, 3)), sa = (1 - sq) * gF;
        ctx.strokeStyle = hexA('#7DC4FF', 0.22 * sa); ctx.lineWidth = (12 * (1 - sq) + 4) * unit;
        ctx.beginPath(); ctx.arc(cx, cy, sr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${(0.7 * sa).toFixed(3)})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, sr, 0, TAU); ctx.stroke();
      }
      for (const e of fx.ej) {                             // ejecta
        const eq = clamp01(te / e.life); if (eq >= 1) continue;
        const ed = e.speed * maxR * (1 - Math.pow(1 - eq, 3));
        const ex = cx + Math.cos(e.ang) * ed, ey = cy + Math.sin(e.ang) * ed, ea = (1 - eq) * gF;
        if (e.streak) {
          const sl = (14 * (1 - eq) + 4) * unit;
          ctx.strokeStyle = hexA(e.color, 0.85 * ea); ctx.lineWidth = e.size;
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(e.ang) * sl, ey - Math.sin(e.ang) * sl); ctx.stroke();
        } else {
          ctx.fillStyle = hexA(e.color, 0.9 * ea);
          ctx.beginPath(); ctx.arc(ex, ey, e.size * (1 - eq * 0.5), 0, TAU); ctx.fill();
        }
      }
      const fa = 0.45 * Math.exp(-te / 0.18) * gF;          // soft flash
      if (fa > 0.01) {
        ctx.fillStyle = rg(ctx, cx, cy, 0, maxR * 2, [[0, `rgba(255,255,255,${fa.toFixed(3)})`],
          [0.4, hexA('#FFD27D', fa * 0.5)], [1, hexA('#FFD27D', 0)]]);
        ctx.beginPath(); ctx.arc(cx, cy, maxR * 2, 0, TAU); ctx.fill();
      }
      const pa = clamp01((te - 0.25) / 0.3) * gF;           // lingering pulsar
      if (pa > 0) {
        const prr = (3 + Math.sin(t * 9) * 1.2) * unit;
        ctx.fillStyle = rg(ctx, cx, cy, 0, prr * 6, [[0, `rgba(255,255,255,${0.9 * pa})`],
          [0.4, hexA('#7DC4FF', 0.5 * pa)], [1, hexA('#7DC4FF', 0)]]);
        ctx.beginPath(); ctx.arc(cx, cy, prr * 6, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${pa.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(cx, cy, prr, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    return true;
  }

  function drawFlyer(t, dt) {
    const cols = ['#FF6F91', '#FFD166', '#8AE08A', '#7DC4FF', '#C77DFF'];
    for (const f of FLYER) {
      if (f.wait > 0) { f.wait -= dt; continue; }
      f.x += f.dir * f.spd * dt;
      const y = f.yBase + Math.sin(t * 1.1 + f.ph) * H * 0.03;
      if ((f.dir > 0 && f.x - 240 > W) || (f.dir < 0 && f.x + 240 < 0)) {
        Object.assign(f, spawnFlyer(false, 0));
        continue;
      }
      // sparkle ribbon trailing behind
      f.trail.push({ x: f.x - f.dir * 60 * (f.sc * 900 / Math.min(W, H)), y: y + 6, born: t });
      while (f.trail.length && t - f.trail[0].born > 1.2) f.trail.shift();
      f.trail.forEach((tp, i) => {
        const age = (t - tp.born) / 1.2;
        drawSparkle(tp.x, tp.y + Math.sin(t * 3 + i) * 4, 4.5 * (1 - age) + 1,
                    (1 - age) * 0.8, i * 0.7, cols[i % cols.length]);
      });
      // somersault on a random schedule too, not only on click
      if (!f.act) {
        if (f.nextActAt === undefined) f.nextActAt = t + 3 + Math.random() * 10;
        if (t >= f.nextActAt) {
          f.act = { t0: t };
          f.nextActAt = t + 6 + Math.random() * 14;
        }
      }
      // click action: a full mid-air somersault
      let rot = 0;
      if (f.act) {
        const p = (t - f.act.t0) / 0.85;
        if (p >= 1) f.act = null;
        else rot = -f.dir * TAU * (p * p * (3 - 2 * p));   // eased 360° loop
      }
      ctx.save();
      ctx.translate(f.x, y);
      ctx.rotate(rot);
      ctx.translate(-f.x, -y);
      drawUnicorn(f.x, y, f.sc, f.dir, t, f.ph, 'fly');
      ctx.restore();
    }
  }

  // ── Scenery FX: the rainbow shimmers, the castle celebrates ──────────────
  function drawRainbowFx(t) {
    if (RAINFX.t0 == null) return;
    const p = (t - RAINFX.t0) / 3;
    if (p >= 1) { RAINFX.t0 = null; return; }
    const f = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    const bands = ['#FF6F91', '#FFA45C', '#FFE066', '#8AE08A', '#7DC4FF', '#C77DFF'];
    const rx = W * 0.50, ry = H * 0.66, rad = Math.min(W, H) * 0.42, bw = Math.min(W, H) * 0.016;
    ctx.save();
    // the whole arch brightens…
    ctx.globalAlpha = 0.30 * f;
    bands.forEach((col, i) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.arc(rx, ry, rad - i * bw * 0.92, Math.PI, TAU);
      ctx.stroke();
    });
    // …and a bright pulse sweeps along it, left to right
    const a0 = Math.PI + p * Math.PI;
    bands.forEach((col, i) => {
      const r = rad - i * bw * 0.92;
      ctx.globalAlpha = 0.85 * f;
      ctx.strokeStyle = col;
      ctx.lineWidth = bw;
      ctx.beginPath(); ctx.arc(rx, ry, r, a0 - 0.14, a0 + 0.14); ctx.stroke();
      ctx.globalAlpha = 0.55 * f;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = bw * 0.4;
      ctx.beginPath(); ctx.arc(rx, ry, r, a0 - 0.07, a0 + 0.07); ctx.stroke();
    });
    ctx.restore();
    ctx.globalAlpha = 1;
    // sparkles riding the pulse
    for (let i = 0; i < 3; i++) {
      const r = rad - Math.random() * 5 * bw;
      drawSparkle(rx + Math.cos(a0) * r, ry + Math.sin(a0) * r,
                  3 + Math.random() * 4, f * 0.9, Math.random() * TAU, '#FFFFFF');
    }
  }

  function drawCastleFx(t) {
    if (CASTLEFX.t0 == null) return;
    const p = (t - CASTLEFX.t0) / 2.6;
    if (p >= 1) { CASTLEFX.t0 = null; return; }
    const f = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    const { x, y, s } = CASTLE;
    // golden halo over the whole keep
    ctx.fillStyle = rg(ctx, x, y - 70 * s, 0, 160 * s, [
      [0, `rgba(255, 220, 130, ${(0.30 * f).toFixed(3)})`],
      [1, 'rgba(255, 220, 130, 0)'],
    ]);
    ctx.beginPath(); ctx.arc(x, y - 70 * s, 160 * s, 0, TAU); ctx.fill();
    // every window flares in its own rhythm
    const wins = [[-52, -52], [52, -52], [-26, -44], [26, -44], [0, -74], [0, -52]];
    wins.forEach(([wx, wy], i) => {
      const a = f * (0.45 + 0.55 * Math.abs(Math.sin(t * 6 + i * 1.3)));
      const px = x + wx * s, py = y + wy * s;
      ctx.fillStyle = `rgba(255, 217, 120, ${(a * 0.35).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, 9 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255, 240, 190, ${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, 3 * s, 0, TAU); ctx.fill();
    });
    // magic sparkles rising around the towers
    for (let i = 0; i < 3; i++)
      drawSparkle(x + (Math.random() - 0.5) * 170 * s,
                  y - Math.random() * 150 * s,
                  2.5 + Math.random() * 3.5, f * 0.85, Math.random() * TAU, '#FFF6D8');
  }

  // ── Main loop ────────────────────────────────────────────────────────────
  let rafId = null, lastT = 0, lastFrameT = 0;

  // click-spin envelope + a sun that visibly spins when tapped (ported from the
  // savanna scene): sunspots sweep the disc and the soft rays rotate, then ease.
  function clickEnv(t0, t, dur){
    if (t0 == null) return 0;
    const e = t - t0;
    if (e < 0 || e > dur) return 0;
    return e < 0.35 ? e / 0.35 : 1 - (e - 0.35) / (dur - 0.35);
  }
  function drawSunSpin(t, dt){
    const f = clickEnv(sunBoostT, t, 4);
    if (f <= 0) return;
    sunSpin += dt * (0.5 + 2.4 * f);
    const { x, y, r } = SUN;
    ctx.save();
    ctx.translate(x, y);
    ctx.save();
    ctx.rotate(sunSpin * 0.5);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++){
      const a = i / 12 * TAU;
      ctx.strokeStyle = `rgba(255,238,190,${(0.30 * f).toFixed(3)})`;
      ctx.lineWidth = 2 + (i % 2) * 2.5;
      const r2 = r * (1.18 + 0.07 * Math.sin(t * 3 + i));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.fillStyle = rg(ctx, 0, 0, r * 0.1, r, [
      [0, '#FFFDF2'], [0.75, '#FFF3CE'], [1, '#FFE9B8'],
    ]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.rotate(sunSpin);
    for (const sp of SUNSPOTS){
      const sx2 = Math.cos(sp.ang) * sp.rad * r, sy2 = Math.sin(sp.ang) * sp.rad * r;
      ctx.fillStyle = 'rgba(255,206,150,.4)';
      ctx.beginPath(); ctx.ellipse(sx2, sy2, sp.rx * r, sp.ry * r, sp.ang, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,252,235,.45)';
      ctx.beginPath(); ctx.ellipse(sx2 - sp.rx * r * 0.4, sy2 - sp.ry * r * 0.4, sp.rx * r * 0.5, sp.ry * r * 0.5, sp.ang, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function renderFrame(t) {
    const dt = Math.min(0.05, t - lastFrameT);
    lastFrameT = t;
    ctx.drawImage(skyLayer.cv, 0, 0, W, H);
    drawSunSpin(t, dt);
    // every so often the scenery joins in too
    if (nextSceneryAt === null) nextSceneryAt = t + 10 + Math.random() * 15;
    if (t >= nextSceneryAt) {
      nextSceneryAt = t + 15 + Math.random() * 25;
      if (Math.random() < 0.5) RAINFX.t0 = t; else CASTLEFX.t0 = t;
    }
    drawRainbowFx(t);
    drawCastleFx(t);
    drawClouds(t, dt);
    drawSparkles(t);
    drawFlyer(t, dt);
    // ── scheduled toot: once every 3 min OR every 5 clicks (whichever first) ──
    if (fartTimerStart === null) fartTimerStart = t;
    if (t - fartTimerStart >= FART_EVERY_SEC) fartPending = true;
    if (fartPending) {
      const free = UNICORNS.filter(u => !u.act);
      if (free.length) {                                  // pick a free unicorn to toot
        free[0 | Math.random() * free.length].act = { type: 'fart', t0: t };
        fartPending = false; fartClicks = 0; fartTimerStart = t;
      }
    }
    // ── scheduled horn effect: a random unicorn fires a bolt/nova every 3 min ──
    if (hornTimerStart === null) hornTimerStart = t;
    if (t - hornTimerStart >= HORN_AUTO_EVERY_SEC) {
      const free = UNICORNS.filter(u => !u.act && u.wait <= 0 && u.x > 0 && u.x < W);
      if (free.length) {                                  // on-stage, idle unicorn fires
        fireHornFx(free[0 | Math.random() * free.length], t);
        hornTimerStart = t;
      }
    }
    for (const u of UNICORNS) {
      if (u.wait > 0) { u.wait -= dt; continue; }       // brief stagger off-stage
      // every so often: jump / rear / somersault / a toot / fire the horn —
      // 'horn' shares the same odds as the others so the bolt/nova is seen often
      if (!u.act) {
        if (u.nextActAt === undefined) u.nextActAt = t + 4 + Math.random() * 12;
        if (t >= u.nextActAt) {
          const pick = ['jump', 'rear', 'spin', 'fart', 'horn'][Math.random() * 5 | 0];
          if (pick === 'horn') fireHornFx(u, t);          // bolt/nova + recoil
          else u.act = { type: pick, t0: t };
          u.nextActAt = t + 8 + Math.random() * 18;
        }
      }
      // recoil from firing a horn effect — a sharp backward jolt that eases back
      const RECOIL_DUR = 0.5;
      let recoiling = u.recoilT0 != null && (t - u.recoilT0) < RECOIL_DUR;
      // walk the meadow when not mid-act and not kicking back; slip out an edge and re-enter
      const moving = !u.act && !recoiling;
      if (moving) {
        u.wt += dt * (u.spd / 26);
        u.x += u.dir * u.spd * dt;
        const pad = 150 * u.sc + 80;
        if ((u.dir > 0 && u.x - pad > W) || (u.dir < 0 && u.x + pad < 0)) {
          Object.assign(u, spawnUnicorn(false));        // exited → a new wanderer enters
          continue;
        }
      }
      let yOff = 0, rot = 0, pose = moving ? 'walk' : 'stand', pivX = u.x, pivY = u.gy, recX = 0;
      if (recoiling) {
        const re = (t - u.recoilT0) / RECOIL_DUR;
        const k = (1 - re) * (1 - re);                      // sharp impulse, quick settle
        recX = -u.dir * 46 * u.sc * k;                      // shoved opposite to facing
        yOff -= 10 * u.sc * Math.sin(re * Math.PI);         // small upward kick
        rot += 0.18 * u.dir * k;                            // rocked back on its haunches
        pose = 'fly';
        if (re >= 1) { recoiling = false; u.recoilT0 = null; }
      }
      const act = u.act;
      if (act) {
        const dur = act.type === 'jump' ? 0.9 : act.type === 'fart' ? 2.2
                  : act.type === 'spin' ? 1.0 : 1.25;
        const p = (t - act.t0) / dur;
        if (p >= 1) u.act = null;
        else if (act.type === 'jump') {
          yOff = -Math.sin(p * Math.PI) * 95 * u.sc;          // parabolic hop
          rot = -Math.sin(p * TAU) * 0.10 * u.dir;            // nose up, then down
          if (p > 0.10 && p < 0.90) pose = 'fly';             // gallop legs + wings
        } else if (act.type === 'spin') {
          rot = -u.dir * TAU * (p * p * (3 - 2 * p));         // eased 360° somersault
          pivY = u.gy - 70 * u.sc;                            // around the body centre
          pose = 'fly';
        } else if (act.type === 'fart') {
          if (act.pink === undefined) act.pink = Math.random() < 0.5;  // colour the whole toot once
          rot = Math.sin(p * 40) * 0.018 * (1 - p) * u.dir;
          yOff = -Math.abs(Math.sin(p * Math.PI * 3)) * 4 * u.sc;
          if ((u.lastPuff || 0) < t - 0.11 && p < 0.6) {
            u.lastPuff = t;
            for (let k = 0; k < 2; k++)               // denser cloud
              FARTS.push({ x: u.x - (48 + Math.random() * 8) * u.sc * u.dir,
                           y: u.gy - (58 + Math.random() * 12) * u.sc,
                           dx: -u.dir * (14 + Math.random() * 20), t0: t,
                           r: (12 + Math.random() * 9) * u.sc, ph: Math.random() * TAU,
                           pink: act.pink });
          }
        } else {
          rot = -0.55 * Math.sin(p * Math.PI) * u.dir;        // rear up and settle
          pivX = u.x - 32 * u.sc * u.dir;                     // pivot on hind hooves
          if (p > 0.08 && p < 0.92) pose = 'fly';             // front legs pawing
        }
      }
      // soft grounding shadow — smaller and fainter while airborne
      const air = Math.min(1, -yOff / (60 * u.sc + 1));
      ctx.fillStyle = `rgba(150, 40, 110, ${(0.16 * (1 - 0.55 * air)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(u.x + recX, u.gy + 3 * u.sc, 56 * u.sc * (1 - 0.3 * air), 8 * u.sc * (1 - 0.3 * air), 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(pivX + recX, pivY);
      ctx.rotate(rot);
      ctx.translate(-(pivX + recX), -pivY);
      drawUnicorn(u.x + recX, u.gy - 70 * u.sc + yOff, u.sc, u.dir, t, u.ph, pose, { wt: u.wt, ...(u.pal || {}) });
      ctx.restore();
    }
    drawFarts(t);
    drawButterflies(t, dt);
    drawCastleButterflies(t, dt);
    drawPetals(t, dt);
    drawHearts(t, dt);
    drawBursts(t);
    drawHornFxAll(t);   // lightning / supernova from a clicked unicorn's horn
  }

  // ── Bold toot clouds — green or (randomly) pink, vivid, linger and drift up ──
  function drawFarts(t) {
    const LIFE = 3.4;                               // lingers longer for emphasis
    for (let i = FARTS.length - 1; i >= 0; i--) {
      const f = FARTS[i];
      const age = t - f.t0;
      if (age > LIFE) { FARTS.splice(i, 1); continue; }
      const q = age / LIFE;
      const x = f.x + f.dx * age + Math.sin(t * 2 + f.ph) * 4;
      const y = f.y - 22 * age;
      const r = f.r * (1 + q * 1.9);
      const a = 0.68 * (1 - q * 0.85);              // bolder, fades late
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (f.pink) {                                 // pink toot variant
        g.addColorStop(0,   `rgba(255, 170, 220, ${a.toFixed(3)})`);
        g.addColorStop(0.5, `rgba(255, 110, 185, ${(a * 0.78).toFixed(3)})`);
        g.addColorStop(1,   'rgba(230, 70, 150, 0)');
      } else {                                      // classic green toot
        g.addColorStop(0,   `rgba(170, 255, 90, ${a.toFixed(3)})`);
        g.addColorStop(0.5, `rgba(96, 230, 55, ${(a * 0.78).toFixed(3)})`);
        g.addColorStop(1,   'rgba(60, 200, 40, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }

  // ── Click-burst: sparkles and hearts popping where a unicorn was tapped ──
  function drawBursts(t) {
    for (let i = BURSTS.length - 1; i >= 0; i--) {
      const b = BURSTS[i];
      const age = t - b.t0;
      if (age > 1.1) { BURSTS.splice(i, 1); continue; }
      const fade = 1 - age / 1.1;
      for (const p of b.parts) {
        const px = b.x + Math.cos(p.ang) * p.spd * age;
        const py = b.y + Math.sin(p.ang) * p.spd * age + 30 * age * age;
        if (p.heart) {
          ctx.save();
          ctx.translate(px, py);
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = '#FF5FA8';
          heartPath(5 + 3 * fade);
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
        } else {
          drawSparkle(px, py, 3 + 5 * fade, fade, p.ang + age * 4, p.col);
        }
      }
    }
  }

  function draw(ts) {
    if (stopped) return;
    lastT = ts / 1000;
    renderFrame(lastT);
    rafId = requestAnimationFrame(draw);
  }

  // ── Click a unicorn to make it move ──────────────────────────────────────
  // Standing ones jump or rear up (random); flying ones do a somersault.
  // Lives on document — the game's form sits above the stage, so canvas
  // clicks never fire; the game UI is filtered out first.
  const valleyClick = e => {
    // every click (anywhere) counts toward the toot cadence; the 5th arms a toot
    if (++fartClicks >= FART_EVERY_CLICKS) fartPending = true;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov'))return;
    const mx = e.clientX, my = e.clientY;
    const t = lastT;
    const burst = () => BURSTS.push({
      x: mx, y: my, t0: t,
      parts: Array.from({length: 14}, (_, i) => ({
        ang: (i / 14) * TAU + Math.random() * 0.4,
        spd: 40 + Math.random() * 70,
        col: ['#FFFFFF', '#FFD166', '#FF6F91', '#C77DFF'][i % 4],
        heart: i % 5 === 4,
      })),
    });

    // click the sun → it spins (same as the savanna sun)
    if (SUN && (mx - SUN.x) ** 2 + (my - SUN.y) ** 2 < SUN.r * SUN.r){
      sunBoostT = t; burst(); return;
    }
    // roaming unicorns are in the foreground — test them first
    for (const u of UNICORNS) {
      if (u.wait > 0) continue;
      if (mx > u.x - 95 * u.sc && mx < u.x + 95 * u.sc &&
          my > u.gy - 190 * u.sc && my < u.gy + 10 * u.sc) {
        // every 5th unicorn-click fires a horn effect (lightning / supernova);
        // the others make it jump, rear or somersault
        if (++hornClicks >= HORN_EVERY) { hornClicks = 0; fireHornFx(u, t); }
        else if (!u.act) u.act = { type: ['jump', 'rear', 'spin'][Math.random() * 3 | 0], t0: t };
        burst();
        return;
      }
    }
    // then the flyers crossing the sky
    for (const f of FLYER) {
      if (f.wait > 0) continue;
      const fy = f.yBase + Math.sin(t * 1.1 + f.ph) * H * 0.03;
      if (mx > f.x - 100 * f.sc && mx < f.x + 100 * f.sc &&
          my > fy - 130 * f.sc && my < fy + 90 * f.sc) {
        if (!f.act) f.act = { t0: t };
        burst();
        return;
      }
    }
    // the princess castle celebrates
    {
      const c = CASTLE;
      if (mx > c.x - 110 * c.s && mx < c.x + 110 * c.s &&
          my > c.y - 140 * c.s && my < c.y + 36 * c.s) {
        CASTLEFX.t0 = t;
        spawnCastleButterflies(t);   // many butterflies fly out of the castle
        burst();
        return;
      }
    }
    // the rainbow shimmers (its upper arch band)
    {
      const rx = W * 0.5, ry = H * 0.66;
      const rad = Math.min(W, H) * 0.42, bw = Math.min(W, H) * 0.016;
      const d = Math.hypot(mx - rx, my - ry);
      if (my < ry && d < rad + bw && d > rad - 7 * bw) {
        RAINFX.t0 = t;
        burst();
        return;
      }
    }
  };
  document.addEventListener('click', valleyClick);

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(draw);

  // ── roaming chibi "rumi": strolls across the valley every few minutes ──
  // Overlay layer (transparent, full-screen, click-through) above the canvas.
  const chibiLayer = document.createElement('div');
  chibiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
  layer.appendChild(chibiLayer);
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
      height: '18vh', bottom: '6vh', duration: 16000,   // 40% smaller than the savanna size
      gapMin: 120000, gapMax: 240000,             // reappears every 2–4 minutes
      startDelay: 6000
    });
  });

  // the loader calls this when the background is switched away
  return function cleanup(){
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (chibiPatrol) chibiPatrol.stop();
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', valleyClick);
    stage.innerHTML = '';
  };
  },
};
