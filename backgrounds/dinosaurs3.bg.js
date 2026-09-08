/* ── dinosaurs3.bg.js — VOLCANO VALLEY AT DUSK, drawn on canvas with the NEW
   from-scratch dinosaur rigs (backgrounds/dino_rigs/). The 🦕 theme's scene.
   Replaces dinosaurs2.bg.js (SVG walkers) — same contract, same skin/aids,
   same layout (the volcano on the RIGHT, the game card hugging the LEFT).

   THE SCENE: a soft sunset sky on a slow day cycle (dusk → night with stars,
   a moon and shooting stars → dawn → back to dusk), a low sun, drifting puffy
   clouds, two hazy snow-capped mountain ranges, the ORIGINAL scene's indigo
   VOLCANO on the right (a truncated cone with a wide flat crater, a glowing
   lava lake and short drips over the rim) trailing smoke, a rolling green valley floor with ferns, round bushes,
   palms and rocks, and swaying foreground grass.

   THE DINOSAURS: canvas rigs (TrexRig, BrontoRig, StegoRig, TrikeRig,
   PteroRig, BabyRig) roam across the valley — up to 2 ground dinosaurs at a
   time, one species at a time, in two depths/sizes and random coats, pausing
   now and then to play their signature action (roar, graze, wag, charge) on a
   random schedule. One pterodactyl flies past overhead and may LAY AN EGG
   mid-flight: it falls, bounces, rests a while, then hatches (the baby peeks
   out) and fades. Clicking a dinosaur plays its action AND recolours it;
   clicking the egg hatches it.

   THE VOLCANO has two shows and clicks alternate between them: an ERUPTION
   (a 3-2-1 countdown, then a lava fountain, crater glow, ash cloud, screen
   shake) and an ASTEROID STORM (fiery streaks, impact flashes, dust) — when
   the asteroids fall every ground dinosaur bolts for the nearest edge with a
   startled hop and the pterodactyl squawks and speeds away; nobody wanders
   back in until the sky is quiet.

   AMBIENT: "rumi" (backgrounds/rumi/chibi-walker.js) strolls the valley every
   2–4 minutes, first after ~45 s–2¼ min of play — same as the old scene.

   Contract (game/js/bg-loader.js): window.BACKGROUNDS.dinosaurs3 =
   { skin: 'dinosaurs', aids: 'dinosaurs', preload(), init({stage}) → cleanup }.
   Dev harness: dinosaurs3.html; verify via _verify_dino3.py. Test hooks:
   window._dino3 = { seek, erupt, storm, egg, spawn, walkers, look, rumi }.
   ES2015, file:// safe (script-tag injection of the rigs, path-relative). */
window.BACKGROUNDS = window.BACKGROUNDS || {};
(function(){
  const doc = document;
  const BASE = (function(){ const s = doc.currentScript; return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();
  const RIG_DIR = BASE + 'dino_rigs/';
  const RIG_FILES = [['TrexRig', 'trex.js'], ['BrontoRig', 'bronto.js'], ['StegoRig', 'stego.js'],
                     ['TrikeRig', 'trike.js'], ['PteroRig', 'ptero.js'], ['BabyRig', 'baby.js']];
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-d3dep="' + globalName + '"]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = RIG_DIR + file; s.setAttribute('data-d3dep', globalName);
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
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
  function loadRigs(cb){
    needScript('DinoRig', 'rig-common.js', () => {
      let left = RIG_FILES.length;
      RIG_FILES.forEach(([g, f]) => needScript(g, f, () => { if (--left === 0) cb(); }));
    });
  }

  const TAU = Math.PI * 2;
  const DAY_SEC = 300;                                    // one whole day cycle
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hex = c => {                                        // '#rrggbb' or 'rgb(r,g,b)' → [r,g,b]
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], k)) + ',' + Math.round(lerp(A[1], B[1], k)) + ',' + Math.round(lerp(A[2], B[2], k)) + ')'; };
  const rgba = (c, a) => { const A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; };

  // ── the day cycle: looks keyed along tod 0..1, interpolated ──
  const KEYS = [
    { at: 0.00, sky: ['#3a1030', '#b53a2a', '#f08a3c', '#f7c25a'], sunY: 0.56, sunA: 0.95, star: 0.00, moon: 0.0, tint: [40, 10, 40, 0.00], cloud: '#ffd9bd', cloudD: '#e0876a', haze: '#c9705a' },
    { at: 0.36, sky: ['#1c0c30', '#5c1e40', '#b0483a', '#e8925a'], sunY: 0.74, sunA: 0.60, star: 0.35, moon: 0.2, tint: [30, 10, 50, 0.16], cloud: '#e6a49e', cloudD: '#8e4a66', haze: '#8a4a62' },
    { at: 0.50, sky: ['#060b1e', '#101c46', '#1d2c5c', '#3a4a78'], sunY: 1.10, sunA: 0.00, star: 1.00, moon: 1.0, tint: [20, 20, 60, 0.40], cloud: '#5c6c98', cloudD: '#2e3a60', haze: '#2a3458' },
    { at: 0.70, sky: ['#0a1030', '#2a2a66', '#7a4a7a', '#e09a70'], sunY: 0.96, sunA: 0.30, star: 0.45, moon: 0.4, tint: [30, 20, 60, 0.22], cloud: '#c9a0b8', cloudD: '#6a4a7a', haze: '#5a3a68' },
    { at: 0.84, sky: ['#5a3a7a', '#d8788a', '#ffb26a', '#ffe4a0'], sunY: 0.64, sunA: 0.90, star: 0.00, moon: 0.0, tint: [60, 30, 30, 0.05], cloud: '#ffe2d2', cloudD: '#e8a08a', haze: '#d08a7a' },
    { at: 1.00, sky: ['#3a1030', '#b53a2a', '#f08a3c', '#f7c25a'], sunY: 0.56, sunA: 0.95, star: 0.00, moon: 0.0, tint: [40, 10, 40, 0.00], cloud: '#ffd9bd', cloudD: '#e0876a', haze: '#c9705a' },
  ];
  function look(tod){
    tod = ((tod % 1) + 1) % 1;
    let i = 0; while (KEYS[i + 1].at < tod) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = (tod - a.at) / (b.at - a.at), e = k * k * (3 - 2 * k);
    return {
      sky: a.sky.map((c, j) => mix(c, b.sky[j], e)),
      sunY: lerp(a.sunY, b.sunY, e), sunA: lerp(a.sunA, b.sunA, e),
      star: lerp(a.star, b.star, e), moon: lerp(a.moon, b.moon, e),
      tint: a.tint.map((v, j) => lerp(v, b.tint[j], e)),
      cloud: mix(a.cloud, b.cloud, e), cloudD: mix(a.cloudD, b.cloudD, e), haze: mix(a.haze, b.haze, e),
    };
  }

  // ── species table: rig global, walking speed (units/s), size factor, act length
  const SPECIES = {
    trex:   { rig: 'TrexRig',   speed: 30, size: 1.00 },
    bronto: { rig: 'BrontoRig', speed: 20, size: 0.82 },
    stego:  { rig: 'StegoRig',  speed: 22, size: 1.00 },
    trike:  { rig: 'TrikeRig',  speed: 26, size: 1.00 },
  };
  const GROUND_KINDS = Object.keys(SPECIES);
  const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov';

  window.BACKGROUNDS.dinosaurs3 = {
    skin: 'dinosaurs', aids: 'dinosaurs',
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
      let skyL, sceneL, aniL, lookKey = -1, curLook = look(0);
      let tod = 0.06, todTween = null;
      let lastT = 0, rafId = null, t0 = null;
      let WALKERS = [], PTERO = null, EGG = null;
      let nextSpawnAt = 1.5, nextPteroAt = 6, lastKind = null;
      let CLOUDS, STARS, GRASS, PLANTS, PUFFS = [], SHOOTERS = [], nextShootAt = 0;
      let erupt = null, storm = null, volcanoClicks = 0, LAVA = [], ASH = [], METEORS = [], FLASHES = [];
      let RINGS = [], EMBERS = [], DEBRIS = [], CRATERS = [], FIRES = [], shake = 0, flashA = 0, ashHaze = 0, sceneDirty = false;

      function makeLayer(){
        const cv = doc.createElement('canvas');
        cv.width = W * DPR; cv.height = H * DPR;
        const cx = cv.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        return { cv, cx };
      }
      const lg = (g, x1, y1, x2, y2, st) => { const gr = g.createLinearGradient(x1, y1, x2, y2); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      const rg = (g, x, y, r0, r1, st) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };

      // ── geometry: the valley floor. depth 0 = far/small … 1 = near/big
      const groundTopY = x => H * 0.80 + Math.sin(x / W * 5.2 + 0.7) * H * 0.008 + Math.sin(x / W * 11.3) * H * 0.004;
      const groundY = depth => H * (0.845 + 0.075 * depth);
      const scaleAt = depth => U * (0.62 + 0.38 * depth);
      // the volcano, in the proportions of the ORIGINAL dinosaurs scene: a
      // TRUNCATED cone (flat crater rim ≈ 0.34 of the base width) with slightly
      // concave flanks, its mouth seen a little from above
      const VOL = () => ({ l: W * 0.615, r: W * 0.935, cl: W * 0.721, cr: W * 0.829, cy: H * 0.40, base: H * 0.81 });

      // ── scene objects ──
      function buildScene(){
        U = H / 620;
        CLOUDS = Array.from({ length: 6 }, (_, i) => ({
          x: psr(i + 200) * W, y: H * (0.06 + psr(i + 210) * 0.26), s: 0.55 + psr(i + 220) * 0.9, spd: 4 + psr(i + 230) * 6,
        }));
        STARS = Array.from({ length: 80 }, (_, i) => ({
          x: psr(i * 2 + 5) * W, y: H * (0.01 + psr(i * 2 + 6) * 0.5), r: 0.6 + psr(i + 50) * 1.2, ph: psr(i + 70) * TAU, tw: 0.4 + psr(i + 80) * 1.3,
        }));
        GRASS = Array.from({ length: Math.round(W / 9) }, (_, i) => ({
          x: (i + psr(i + 900) * 0.9) * 9, y: H * (0.935 + psr(i + 910) * 0.065), h: H * (0.03 + psr(i + 920) * 0.04), ph: psr(i + 930) * TAU, lean: (psr(i + 940) - 0.5) * 0.6,
        }));
        // plants along the valley's far edge (the card covers the left, so most sit right of centre)
        PLANTS = [];
        const spots = [0.04, 0.10, 0.17, 0.30, 0.40, 0.47, 0.53, 0.60, 0.66, 0.72, 0.86, 0.92, 0.97];
        spots.forEach((fx, i) => {
          const kinds = ['fern', 'bush', 'palm', 'fern', 'rock', 'bush', 'fern'];
          PLANTS.push({ kind: kinds[Math.floor(psr(i + 400) * kinds.length)], x: fx * W, y: groundTopY(fx * W) + H * (0.005 + psr(i + 410) * 0.03), s: U * (0.7 + psr(i + 420) * 0.6), seed: i });
        });
        PLANTS.push({ kind: 'palm', x: W * 0.955, y: groundTopY(W * 0.955) + H * 0.02, s: U * 1.25, seed: 77 });
        PLANTS.push({ kind: 'palm', x: W * 0.035, y: groundTopY(W * 0.035) + H * 0.02, s: U * 1.1, seed: 78 });
      }

      // ── painters ──
      function paintSky(g, L){
        g.clearRect(0, 0, W, H);
        g.fillStyle = lg(g, 0, 0, 0, H * 0.85, [[0, L.sky[0]], [0.45, L.sky[1]], [0.78, L.sky[2]], [1, L.sky[3]]]);
        g.fillRect(0, 0, W, H);
        if (L.sunA > 0.01){                                          // the low sun + its glow
          const sx = W * 0.40, sy = H * L.sunY, R = Math.min(W, H) * 0.075;
          g.fillStyle = rg(g, sx, sy, R * 0.5, R * 4.2, [[0, rgba('#ffd9a0', 0.55 * L.sunA)], [0.4, rgba('#ffb070', 0.22 * L.sunA)], [1, rgba('#ff9a50', 0)]]);
          g.fillRect(0, 0, W, H);
          g.fillStyle = rg(g, sx, sy, 0, R, [[0, rgba('#fff8e0', L.sunA)], [0.75, rgba('#ffe4a0', L.sunA)], [1, rgba('#ffc070', 0.85 * L.sunA)]]);
          g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fill();
        }
        if (L.moon > 0.02){                                          // a crescent moon, top right
          const mx = W * 0.90, my = H * 0.13, R = Math.min(W, H) * 0.045;
          g.globalAlpha = L.moon;
          g.fillStyle = rg(g, mx, my, R, R * 4, [[0, 'rgba(220,230,255,.35)'], [1, 'rgba(220,230,255,0)']]);
          g.fillRect(mx - R * 4, my - R * 4, R * 8, R * 8);
          g.fillStyle = '#f4f2e6'; g.beginPath(); g.arc(mx, my, R, 0, TAU); g.fill();
          g.fillStyle = L.sky[0]; g.beginPath(); g.arc(mx - R * 0.42, my - R * 0.18, R * 0.86, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
      }
      // a mountain silhouette across the width — pointed peaks (on the curve),
      // rounded valleys (the quadratic control points), soft snow caps clipped
      // to the ridge on the taller peaks
      function ridge(g, baseY, amp, n, seed, col, snow){
        const pts = [];
        for (let i = 0; i <= n; i++){
          const x = (i / n) * W + (psr(seed + i) - 0.5) * W / n * 0.6;
          const h = amp * (0.35 + 0.65 * psr(seed + i * 3 + 1));
          pts.push([x, baseY - (i === 0 || i === n ? h * 0.5 : h)]);
        }
        const path = () => {
          g.beginPath(); g.moveTo(-10, H); g.lineTo(-10, pts[0][1]); g.lineTo(pts[0][0], pts[0][1]);
          for (let i = 0; i < n; i++){
            const a = pts[i], b = pts[i + 1];
            g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + amp * 0.34, b[0], b[1]);
          }
          g.lineTo(W + 10, pts[n][1]); g.lineTo(W + 10, H); g.closePath();
        };
        g.fillStyle = col; path(); g.fill();
        if (snow){
          g.save(); path(); g.clip();
          g.fillStyle = snow;
          for (let i = 1; i < n; i++){
            const p = pts[i], h = baseY - p[1]; if (h < amp * 0.6) continue;
            const w = amp * 0.42, hh = h * 0.3;
            g.beginPath(); g.moveTo(p[0] - w * 0.7, p[1] + hh);
            g.lineTo(p[0], p[1] - 4); g.lineTo(p[0] + w * 0.7, p[1] + hh);
            g.quadraticCurveTo(p[0] + w * 0.4, p[1] + hh * 0.7, p[0] + w * 0.14, p[1] + hh * 1.05);
            g.quadraticCurveTo(p[0] - w * 0.08, p[1] + hh * 0.72, p[0] - w * 0.34, p[1] + hh * 1.02);
            g.quadraticCurveTo(p[0] - w * 0.55, p[1] + hh * 0.8, p[0] - w * 0.7, p[1] + hh); g.closePath(); g.fill();
          }
          g.restore();
        }
      }
      function fluff(g, cx, cy, r, n, col, seed){
        g.fillStyle = col;
        g.beginPath(); g.ellipse(cx, cy, r * 1.1, r * 0.72, 0, 0, TAU); g.fill();
        for (let i = 0; i < n; i++){
          const a = (i / n) * TAU, rr = r * (0.4 + psr(seed + i) * 0.3);
          g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.45 - r * 0.1, rr, 0, TAU); g.fill();
        }
      }
      // a plant scorched by an asteroid: a snapped trunk, a blackened lump, bent stalks
      function paintCharred(g, p){
        const { x, y, s } = p;
        g.save(); g.translate(x, y);
        g.fillStyle = '#2a201f'; g.strokeStyle = '#332622'; g.lineCap = 'round';
        if (p.kind === 'palm'){
          g.lineWidth = 5 * s;
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4 * s, -18 * s, 8 * s, -34 * s); g.stroke();
          g.beginPath(); g.moveTo(5 * s, -33 * s); g.lineTo(12 * s, -38 * s); g.lineTo(11 * s, -30 * s); g.closePath(); g.fill();
        } else if (p.kind === 'bush'){
          g.beginPath(); g.ellipse(0, -7 * s, 13 * s, 7 * s, 0, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(-3 * s, -11 * s, 8 * s, 5 * s, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,140,60,.7)';
          for (let i = 0; i < 3; i++){ g.beginPath(); g.arc((psr(p.seed + i * 3) - 0.5) * 18 * s, -9 * s - psr(p.seed + i * 5) * 6 * s, 1.2 * s, 0, TAU); g.fill(); }
        } else {                                                        // fern → an ash mound with short black stubs
          g.fillStyle = '#4a4045';
          g.beginPath(); g.ellipse(0, -2 * s, 12 * s, 4 * s, 0, 0, TAU); g.fill();
          g.strokeStyle = '#2a201f'; g.lineWidth = 2.6 * s;
          for (const [dx, lean, len] of [[-5, -0.35, 9], [0, 0.1, 11], [5, 0.4, 8]]){
            g.beginPath(); g.moveTo(dx * s, -2 * s); g.quadraticCurveTo(dx * s + lean * 4 * s, -2 * s - len * 0.6 * s, dx * s + lean * 9 * s, -2 * s - len * s); g.stroke();
          }
          g.fillStyle = 'rgba(255,140,60,.7)';
          g.beginPath(); g.arc(2 * s, -4 * s, 1.1 * s, 0, TAU); g.fill();
        }
        g.restore();
      }
      function paintPlant(g, p, L){
        if (p.hurt && p.kind !== 'rock'){ paintCharred(g, p); return; }
        const { x, y, s } = p;
        g.save(); g.translate(x, y);
        if (p.kind === 'fern'){
          g.strokeStyle = mix('#4f9a48', L.haze, 0.15); g.lineCap = 'round'; g.lineWidth = 2.2 * s;
          for (let i = -3; i <= 3; i++){
            const ang = -Math.PI / 2 + i * 0.36 + (psr(p.seed + i) - 0.5) * 0.1, len = s * (26 - Math.abs(i) * 4);
            g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(ang) * len * 0.5 + i * 2 * s, Math.sin(ang) * len * 0.62, Math.cos(ang) * len + i * 4 * s, Math.sin(ang) * len); g.stroke();
          }
          g.fillStyle = mix('#6cbf62', L.haze, 0.12);
          for (let i = -3; i <= 3; i++){
            const ang = -Math.PI / 2 + i * 0.36, len = s * (26 - Math.abs(i) * 4);
            g.beginPath(); g.ellipse(Math.cos(ang) * len + i * 4 * s, Math.sin(ang) * len, 4.2 * s, 2.6 * s, ang + Math.PI / 2, 0, TAU); g.fill();
          }
        } else if (p.kind === 'bush'){
          fluff(g, 0, -10 * s, 15 * s, 8, mix('#3f7d3a', L.haze, 0.18), p.seed);
          fluff(g, -3 * s, -14 * s, 10 * s, 7, mix('#5aa050', L.haze, 0.12), p.seed + 9);
          g.fillStyle = rgba('#f06a8a', 0.9);
          for (let i = 0; i < 4; i++){ g.beginPath(); g.arc((psr(p.seed + i * 5) - 0.5) * 26 * s, -12 * s - psr(p.seed + i * 7) * 12 * s, 1.8 * s, 0, TAU); g.fill(); }
        } else if (p.kind === 'palm'){
          g.strokeStyle = mix('#7a5232', L.haze, 0.2); g.lineCap = 'round'; g.lineWidth = 5 * s;
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6 * s, -40 * s, -4 * s, -78 * s); g.stroke();
          g.strokeStyle = mix('#3e8a3c', L.haze, 0.15); g.lineWidth = 3.2 * s;
          g.fillStyle = mix('#5ab050', L.haze, 0.12);
          for (let i = 0; i < 7; i++){
            const ang = -Math.PI + i * (Math.PI / 6) + 0.1, len = s * 34;
            const ex = -4 * s + Math.cos(ang) * len, ey = -78 * s + Math.sin(ang) * len * 0.75 + len * 0.35;
            g.beginPath(); g.moveTo(-4 * s, -78 * s); g.quadraticCurveTo(-4 * s + Math.cos(ang) * len * 0.6, -78 * s + Math.sin(ang) * len * 0.5 - 6 * s, ex, ey); g.stroke();
            g.beginPath(); g.ellipse(ex, ey, 5 * s, 3 * s, ang, 0, TAU); g.fill();
          }
          g.fillStyle = '#c98a3a';
          for (const [dx, dy] of [[-8, -74], [0, -72], [-4, -70]]){ g.beginPath(); g.arc(dx * s, dy * s, 2.6 * s, 0, TAU); g.fill(); }
        } else {                                                          // rock
          g.fillStyle = lg(g, 0, -16 * s, 0, 0, [[0, mix('#9a8a90', L.haze, 0.2)], [1, mix('#5a4a58', L.haze, 0.3)]]);
          g.beginPath(); g.ellipse(0, -5 * s, 16 * s, 9 * s, 0, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(8 * s, -9 * s, 8 * s, 7 * s, 0.2, 0, TAU); g.fill();
        }
        g.restore();
      }
      function paintScene(g, L){
        g.clearRect(0, 0, W, H);
        // far range — hazy, melting into the sky; near range — plum, snow-capped
        ridge(g, H * 0.70, H * 0.22, 9, 11, mix(L.haze, L.sky[2], 0.45), mix('#fff4ea', L.sky[3], 0.35));
        ridge(g, H * 0.76, H * 0.17, 7, 31, mix('#5a3050', L.haze, 0.35), mix('#fff4ea', L.sky[3], 0.2));
        // ── the volcano on the right — the ORIGINAL scene's truncated cone:
        //    slightly concave flanks flaring to a broad base, a wide flat crater
        //    rim seen a little from above with a glowing lava lake inside, and
        //    short lava drips spilling over the rim (they do NOT run to the
        //    ground); the right flank is in shadow, two soft gullies down the face
        const v = VOL();
        const rimR = (v.cr - v.cl) * 0.5, rimY = H * 0.026, cx0 = (v.cl + v.cr) / 2;
        // the flank curve: control points as fractions of (run, rise) — a hair
        // concave, exactly like the old cone's cubic
        const up = (x0, y0, x1, y1) => g.bezierCurveTo(          // base → rim
          x0 + (x1 - x0) * 0.32, y0 - (y0 - y1) * 0.435,
          x0 + (x1 - x0) * 0.679, y0 - (y0 - y1) * 0.808, x1, y1);
        const down = (x0, y0, x1, y1) => g.bezierCurveTo(        // rim → base (the same profile, mirrored)
          x0 + (x1 - x0) * 0.321, y0 + (y1 - y0) * 0.192,
          x0 + (x1 - x0) * 0.68, y0 + (y1 - y0) * 0.565, x1, y1);
        const conePath = () => {
          g.beginPath();
          g.moveTo(v.l - W * 0.02, v.base + 8);
          up(v.l - W * 0.02, v.base + 8, v.cl, v.cy);
          g.lineTo(v.cr, v.cy);
          down(v.cr, v.cy, v.r + W * 0.01, v.base + 8);
          g.closePath();
        };
        g.fillStyle = lg(g, v.l, 0, v.r, 0, [[0, mix('#7a5aa8', L.haze, 0.25)], [0.5, mix('#5b4792', L.haze, 0.25)], [1, mix('#453573', L.haze, 0.3)]]);
        conePath(); g.fill();
        g.save(); conePath(); g.clip();
        g.fillStyle = rgba(mix('#3a2c66', L.haze, 0.3), 0.55);         // the shaded right flank
        g.beginPath(); g.moveTo(cx0 + rimR * 0.5, v.cy); g.lineTo(v.cr, v.cy);
        g.lineTo(v.r + W * 0.02, v.base + 10); g.lineTo(cx0 + (v.r - cx0) * 0.42, v.base + 10); g.closePath(); g.fill();
        g.strokeStyle = rgba(mix('#3a2c66', L.haze, 0.3), 0.22); g.lineCap = 'round';   // two soft gullies
        g.lineWidth = Math.max(2, U * 3.2);
        for (const dx of [-0.45, 0.38]){
          const x0 = cx0 + rimR * dx;
          g.beginPath(); g.moveTo(x0, v.cy + rimY * 1.4);
          g.quadraticCurveTo(x0 + dx * W * 0.02, v.cy + (v.base - v.cy) * 0.28, x0 + dx * W * 0.05, v.cy + (v.base - v.cy) * 0.56);
          g.stroke();
        }
        g.restore();
        // the crater: a dark rim ellipse with a warm lava lake inside it. The rim
        // barely takes the haze, so it still reads as a dark ring at night.
        g.fillStyle = mix('#2b2350', L.haze, 0.08);
        g.beginPath(); g.ellipse(cx0, v.cy, rimR, rimY, 0, 0, TAU); g.fill();
        g.strokeStyle = rgba('#171233', 0.5); g.lineWidth = Math.max(1, U * 1.2);
        g.beginPath(); g.ellipse(cx0, v.cy, rimR, rimY, 0, 0, TAU); g.stroke();
        g.strokeStyle = rgba('#8a78c4', 0.35);                         // lit far lip
        g.beginPath(); g.ellipse(cx0, v.cy, rimR * 0.99, rimY * 0.98, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.fillStyle = lg(g, 0, v.cy - rimY, 0, v.cy + rimY, [[0, mix('#c4682e', L.haze, 0.15)], [1, mix('#ff9a4d', L.haze, 0.1)]]);
        g.beginPath(); g.ellipse(cx0, v.cy + rimY * 0.12, rimR * 0.68, rimY * 0.62, 0, 0, TAU); g.fill();
        // short lava spills over the near rim — fat orange tongues that stop well
        // short of the ground, with a couple of pale-yellow strands beside them
        // (exactly the old scene's arrangement: two left, one centre, one right)
        g.lineCap = 'round';
        for (const [dx, len, w, hot] of [[-0.62, 0.21, 5.4, 0], [-0.55, 0.16, 2.4, 1],
                                         [-0.02, 0.11, 3.2, 1], [0.55, 0.23, 4.8, 0], [0.63, 0.14, 2.2, 1]]){
          const x0 = cx0 + rimR * dx, y0 = v.cy + rimY * 0.6;
          const y1 = y0 + (v.base - v.cy) * len, bend = dx * W * 0.006;
          g.strokeStyle = rgba(hot ? '#ffd27d' : '#ff7a3d', hot ? 0.9 : 0.88);
          g.lineWidth = Math.max(2, U * w);
          g.beginPath(); g.moveTo(x0, y0);
          g.quadraticCurveTo(x0 + bend, (y0 + y1) / 2, x0 + bend * 1.7, y1); g.stroke();
          if (!hot){                                                   // a warm core inside the fat tongues
            g.strokeStyle = rgba('#ffc46a', 0.75); g.lineWidth = Math.max(1, U * w * 0.34);
            g.beginPath(); g.moveTo(x0, y0);
            g.quadraticCurveTo(x0 + bend, (y0 + y1) / 2, x0 + bend * 1.7, y1 - (v.base - v.cy) * 0.03); g.stroke();
          }
        }
        // the valley floor — rolling green, darker toward the front
        g.fillStyle = lg(g, 0, H * 0.78, 0, H, [[0, mix('#7aa856', L.haze, 0.14)], [0.35, mix('#4f8a40', L.haze, 0.18)], [1, mix('#243f22', L.haze, 0.25)]]);
        g.beginPath(); g.moveTo(-10, H); g.lineTo(-10, groundTopY(0));
        for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, groundTopY(x));
        g.lineTo(W + 10, H); g.closePath(); g.fill();
        g.strokeStyle = rgba('#ffd9a0', 0.35); g.lineWidth = 2;        // sunlit edge of the floor
        g.beginPath(); for (let x = 0; x <= W + 20; x += 20){ const y = groundTopY(x) + 1; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        // a worn path across the valley
        g.fillStyle = rgba('#c9a870', 0.28);
        g.beginPath(); g.moveTo(-10, H * 0.90); g.quadraticCurveTo(W * 0.5, H * 0.87, W + 10, H * 0.905); g.lineTo(W + 10, H * 0.925); g.quadraticCurveTo(W * 0.5, H * 0.90, -10, H * 0.925); g.closePath(); g.fill();
        // plants and rocks along the far edge (behind the dinosaurs)
        PLANTS.forEach(p => paintPlant(g, p, L));
      }
      function repaintIfNeeded(){
        const key = Math.round(tod * 90);
        if (key === lookKey) return;
        lookKey = key; curLook = look(tod);
        paintSky(skyL.cx, curLook); paintScene(sceneL.cx, curLook);
      }

      // ── dinosaur management ──
      function spawnWalker(kind){
        kind = kind || GROUND_KINDS.filter(k => k !== lastKind)[Math.floor(Math.random() * (GROUND_KINDS.length - 1))];
        const sp = SPECIES[kind], rig = window[sp.rig]; if (!rig) return null;
        lastKind = kind;
        const depth = Math.random() < 0.5 ? 0.15 + Math.random() * 0.25 : 0.7 + Math.random() * 0.3;
        const s = scaleAt(depth) * sp.size, dir = Math.random() < 0.5 ? 1 : -1;
        const pals = rig.PALS || [rig.DEFAULT];
        const w = {
          kind, rig, depth, dir,
          L: { x: dir > 0 ? -rig.WIDTH * s - 20 : W + rig.WIDTH * s + 20, y: groundY(depth), s, dir, ph: Math.random() * 6, wt: Math.random() * 6, moving: true, pose: 0,
               pal: pals[Math.floor(Math.random() * pals.length)], tint: 0.92 + Math.random() * 0.16 },
          speed: sp.speed, act: null, restUntil: 0, nextActAt: lastT + rnd(4, 9), palI: 0,
        };
        w.palI = pals.indexOf(w.L.pal);
        WALKERS.push(w);
        return w;
      }
      function spawnPtero(){
        const rig = window.PteroRig; if (!rig) return null;
        const depth = 0.3 + Math.random() * 0.5, s = scaleAt(depth) * 0.9, dir = Math.random() < 0.5 ? 1 : -1;
        const pals = rig.PALS || [rig.DEFAULT], alt = H * (0.26 + Math.random() * 0.16);
        PTERO = {
          kind: 'ptero', rig, depth, dir, alt,
          L: { x: dir > 0 ? -rig.WIDTH * s - 40 : W + rig.WIDTH * s + 40, y: alt + 74 * s, s, dir, ph: Math.random() * 6, wt: 0, moving: true, pose: 0,
               pal: pals[Math.floor(Math.random() * pals.length)], tint: 0.94 + Math.random() * 0.12 },
          speed: 52, act: null, nextActAt: lastT + rnd(3, 7), layAt: (W * (0.45 + Math.random() * 0.4)), laid: EGG !== null, palI: 0,
        };
        PTERO.palI = pals.indexOf(PTERO.L.pal);
        return PTERO;
      }
      function layEgg(x, y, depth, pal){
        const rig = window.BabyRig; if (!rig || EGG) return null;
        const s = scaleAt(depth) * 0.95;
        EGG = { rig, depth, L: { x, y, s, dir: 1, ph: Math.random() * 6, wt: 0, moving: false, pose: 0, pal }, vy: 0, state: 'fall', bounced: false, hatchAt: 0, alpha: 1, hatchT0: 0 };
        return EGG;
      }
      function startAct(a, now){ if (a.act || a.flee) return; a.act = { t0: now, dur: a.rig.ACT_SECONDS || 1.9 }; a.L.moving = false; }
      // ASTEROIDS! every ground dinosaur bolts for the nearest edge (a startled
      // hop first, legs pumping), the pterodactyl squawks and speeds away, and
      // no newcomer wanders in until the sky is quiet again
      function startStorm(now){
        if (storm) return;
        storm = { t0: now, count: 16, next: 0 };
        for (const w of WALKERS){
          w.flee = true; w.act = null; w.L.pose = 0; w.restUntil = 0; w.hopT0 = now + Math.random() * 0.3;
          w.dir = w.L.x < W * 0.5 ? -1 : 1; w.L.dir = w.dir;
        }
        if (PTERO && !PTERO.flee){ PTERO.flee = true; PTERO.speed *= 2.4; PTERO.act = null; PTERO.act = { t0: now, dur: PTERO.rig.ACT_SECONDS || 1.7 }; }
        nextSpawnAt = now + 16 * 0.42 + 7;
      }
      function recolor(a){
        const pals = a.rig.PALS || []; if (pals.length < 2) return;
        a.palI = (a.palI + 1) % pals.length; a.L.pal = pals[a.palI];
      }
      function updateAnimals(t, dt){
        // ground walkers
        if (!storm && WALKERS.length < 2 && t > nextSpawnAt){ spawnWalker(); nextSpawnAt = t + rnd(4, 9); }
        for (const w of WALKERS){
          const L = w.L;
          if (w.flee){                                               // running from the asteroids
            L.moving = true;
            L.x += w.dir * w.speed * 3.6 * L.s * dt;
            L.wt += dt * 6;
            const hk = w.hopT0 !== undefined ? (t - w.hopT0) / 0.5 : 2;
            L.y = groundY(w.depth) - (hk > 0 && hk < 1 ? Math.sin(hk * Math.PI) * 14 * L.s : 0);
          } else if (w.act){
            L.pose = clamp01((t - w.act.t0) / w.act.dur);
            if (L.pose >= 1){ w.act = null; L.pose = 0; w.restUntil = t + rnd(0.6, 1.6); }
            L.moving = false;
          } else if (t < w.restUntil){
            L.moving = false;
          } else {
            L.moving = true;
            L.x += w.dir * w.speed * L.s * dt;
            L.wt += dt * 2.2;
            if (t > w.nextActAt){
              w.nextActAt = t + rnd(7, 14);
              if (Math.random() < 0.7) startAct(w, t); else w.restUntil = t + rnd(1.5, 3);
            }
          }
        }
        WALKERS = WALKERS.filter(w => (w.dir > 0 ? w.L.x - w.rig.WIDTH * w.L.s < W + 30 : w.L.x + w.rig.WIDTH * w.L.s > -30));
        // the pterodactyl
        if (!PTERO && t > nextPteroAt) spawnPtero();
        if (PTERO){
          const p = PTERO, L = p.L;
          L.x += p.dir * p.speed * L.s * dt;
          L.y = p.alt + 74 * L.s + Math.sin(t * 0.9 + L.ph) * H * 0.012;
          if (p.act){ L.pose = clamp01((t - p.act.t0) / p.act.dur); if (L.pose >= 1){ p.act = null; L.pose = 0; } }
          else if (t > p.nextActAt){ p.nextActAt = t + rnd(6, 12); startAct(p, t); L.moving = true; }
          L.moving = true;
          if (!p.laid && !EGG && ((p.dir > 0 && L.x > p.layAt) || (p.dir < 0 && L.x < p.layAt))){
            p.laid = true;
            const e = layEgg(L.x - p.dir * 10 * L.s, L.y - 60 * L.s, 0.35 + Math.random() * 0.5, L.pal);
            if (e) e.vy = 20;
          }
          if (p.dir > 0 ? L.x - p.rig.WIDTH * L.s > W + 40 : L.x + p.rig.WIDTH * L.s < -40){ PTERO = null; nextPteroAt = t + rnd(8, 18); }
        }
        // the egg: falls, bounces, rests, hatches, fades
        if (EGG){
          const e = EGG, L = e.L, gy = groundY(e.depth);
          if (e.state === 'fall'){
            e.vy += 900 * dt * (H / 800); L.y += e.vy * dt;
            L.dir = 1;
            if (L.y >= gy){
              L.y = gy;
              if (!e.bounced && e.vy > 120){ e.vy = -e.vy * 0.28; e.bounced = true; PUFFS.push({ x: L.x, y: gy, t0: t, col: '#c9a870' }); }
              else { e.vy = 0; e.state = 'rest'; e.hatchAt = t + rnd(4, 8); }
            }
          } else if (e.state === 'rest'){
            if (t > e.hatchAt){ e.state = 'hatch'; e.hatchT0 = t; }
          } else if (e.state === 'hatch'){
            L.pose = clamp01((t - e.hatchT0) / (e.rig.ACT_SECONDS || 3.6));
            if (L.pose >= 1){ L.pose = 0; e.state = 'fade'; e.hatchT0 = t; }
          } else if (e.state === 'fade'){
            e.alpha = 1 - clamp01((t - e.hatchT0) / 1.2);
            if (e.alpha <= 0) EGG = null;
          }
        }
      }
      function drawAnimals(g, t){
        g.clearRect(0, 0, W, H);
        const list = WALKERS.slice();
        if (EGG) list.push(EGG);
        list.sort((a, b) => a.L.y - b.L.y);                          // far → near
        if (PTERO){
          g.fillStyle = 'rgba(30,10,20,.10)';
          g.beginPath(); g.ellipse(PTERO.L.x, groundY(PTERO.depth), PTERO.rig.WIDTH * 0.5 * PTERO.L.s, 4 * PTERO.L.s, 0, 0, TAU); g.fill();
          PTERO.rig.draw(g, PTERO.L, t);
        }
        for (const a of list){
          g.save();
          if (a.alpha !== undefined) g.globalAlpha = a.alpha;
          g.fillStyle = 'rgba(30,10,20,.26)';
          g.beginPath(); g.ellipse(a.L.x, groundY(a.depth) + 1.5 * a.L.s, a.rig.WIDTH * 0.9 * a.L.s, 5 * a.L.s, 0, 0, TAU); g.fill();
          a.rig.draw(g, a.L, t);
          g.restore();
        }
      }

      // ── sky life: stars, shooting stars, clouds ──
      function drawStars(t, L){
        if (L.star < 0.02) return;
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
          ctx.fillStyle = 'rgba(255,250,235,' + (L.star * tw * 0.9) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        }
        if (t > nextShootAt){ nextShootAt = t + rnd(5, 12); SHOOTERS.push({ x: rnd(W * 0.3, W * 0.95), y: rnd(H * 0.04, H * 0.3), t0: t, ang: rnd(2.5, 2.9), len: rnd(90, 160) * U }); }
        SHOOTERS = SHOOTERS.filter(s => t - s.t0 < 1.1);
        for (const s of SHOOTERS){
          const k = (t - s.t0) / 1.1, x = s.x + Math.cos(s.ang) * k * s.len * 2.2, y = s.y + Math.sin(s.ang) * k * s.len * 2.2;
          const tx = x - Math.cos(s.ang) * s.len, ty = y - Math.sin(s.ang) * s.len;    // the tail trails up and behind
          ctx.strokeStyle = lg(ctx, x, y, tx, ty, [[0, 'rgba(255,255,255,' + (0.9 * (1 - k) * L.star) + ')'], [0.35, 'rgba(160,210,255,' + (0.5 * (1 - k) * L.star) + ')'], [1, 'rgba(120,180,255,0)']]);
          ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * (1 - k) * L.star) + ')';
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
        }
      }
      function drawClouds(t, L, dt){
        for (const c of CLOUDS){
          c.x += c.spd * dt * U * 0.5; if (c.x > W + 120 * c.s * U) c.x = -120 * c.s * U;
          const r = 26 * c.s * U;
          ctx.fillStyle = lg(ctx, 0, c.y - r, 0, c.y + r * 0.6, [[0, L.cloud], [1, L.cloudD]]);
          for (const [dx, dy, k] of [[0, 0, 1], [-1.1, 0.25, 0.72], [1.15, 0.2, 0.8], [-0.5, -0.45, 0.78], [0.55, -0.5, 0.82], [2.0, 0.42, 0.55], [-2.0, 0.45, 0.5]]){
            ctx.beginPath(); ctx.arc(c.x + dx * r, c.y + dy * r, r * k, 0, TAU); ctx.fill();
          }
        }
      }

      // ── the volcano's life: smoke, eruption, meteor storm ──
      function drawVolcanoFx(t, dt){
        const v = VOL(), cx = (v.cl + v.cr) / 2, cy = v.cy;
        const boom = erupt && erupt.phase === 'erupt' ? clamp01((t - erupt.t0) / 0.6) * (1 - clamp01((t - erupt.t0 - 3.2) / 2.5)) : 0;
        // crater glow
        const glow = 0.28 + 0.1 * Math.sin(t * 1.7) + boom * 0.9;
        ctx.fillStyle = rg(ctx, cx, cy, 0, (v.cr - v.cl) * (0.55 + boom * 1.1), [[0, rgba('#ffb060', 0.5 * glow)], [1, rgba('#ff7a30', 0)]]);
        ctx.fillRect(cx - W * 0.3, cy - H * 0.3, W * 0.6, H * 0.45);
        // the lava lake brightens and breathes with the glow
        ctx.fillStyle = rgba('#ffb44f', 0.30 + 0.12 * Math.sin(t * 1.7) + boom * 0.5);
        ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.003, (v.cr - v.cl) * 0.34, H * 0.016 * (1 + boom * 0.3), 0, 0, TAU); ctx.fill();
        // gentle smoke puffs
        if (Math.random() < dt * (1.6 + boom * 12)) PUFFS.push({ x: cx + rnd(-8, 8) * U, y: cy - 6, t0: t, col: boom ? '#5a4a58' : '#a89aa8', smoke: true, big: boom });
        // eruption particles
        if (erupt){
          const k = t - erupt.t0;
          if (erupt.phase === 'count' && k >= 3){ erupt.phase = 'erupt'; erupt.t0 = t; }
          else if (erupt.phase === 'erupt'){
            if (k < 3.0) for (let i = 0; i < 2; i++) LAVA.push({ x: cx + rnd(-10, 10) * U, y: cy, vx: rnd(-85, 85) * U, vy: -rnd(240, 470) * U, t0: t, r: rnd(2.5, 6) * U, hot: Math.random() });
            if (k < 4.5 && Math.random() < dt * 6) ASH.push({ x: cx + rnd(-20, 20) * U, y: cy - 10, vx: rnd(-30, 30) * U, vy: -rnd(40, 90) * U, t0: t, r: rnd(14, 26) * U });
            if (k > 7) erupt = null;
          }
        }
        LAVA = LAVA.filter(p => t - p.t0 < 3.2 && p.y < H);
        for (const p of LAVA){
          p.vy += 620 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          const a = 1 - clamp01((t - p.t0) / 3.2);
          ctx.fillStyle = p.hot > 0.5 ? rgba('#ffe07a', a) : rgba('#ff7a3a', a);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * a), 0, TAU); ctx.fill();
        }
        ASH = ASH.filter(p => t - p.t0 < 6);
        for (const p of ASH){
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= (1 - dt * 0.5); p.r += 10 * U * dt;
          const a = 0.45 * (1 - clamp01((t - p.t0) / 6));
          ctx.fillStyle = rgba('#4a3a50', a); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        }
        PUFFS = PUFFS.filter(p => t - p.t0 < (p.smoke ? 5 : 1.2));
        for (const p of PUFFS){
          const k = (t - p.t0) / (p.smoke ? 5 : 1.2);
          if (p.smoke){
            const r = (6 + 30 * k) * U * (p.big ? 1.6 : 1), x = p.x + Math.sin(k * 5 + p.t0) * 10 * U, y = p.y - k * H * 0.12;
            ctx.fillStyle = rgba(p.col, 0.30 * (1 - k)); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          } else {
            for (let i = 0; i < 4; i++){
              const a = psr(i * 7 + 3), r = (3 + 4 * a + 9 * k) * U;
              ctx.fillStyle = rgba(p.col, (1 - k) * 0.35);
              ctx.beginPath(); ctx.arc(p.x + (i - 1.5) * 10 * U * (0.4 + k), p.y - (4 + 10 * a) * k * U - r * 0.4, r, 0, TAU); ctx.fill();
            }
          }
        }
        // the 3-2-1 countdown, floating above the crater
        if (erupt && erupt.phase === 'count'){
          const k = t - erupt.t0, n = 3 - Math.floor(k), f = k % 1;
          const size = Math.min(W, H) * (0.10 + 0.05 * (1 - f));
          ctx.save();
          ctx.globalAlpha = 1 - f * 0.6;
          ctx.font = '900 ' + size + 'px "Fredoka One", Georgia, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(255,150,60,.8)'; ctx.shadowBlur = 24;
          ctx.fillStyle = '#fff1d0'; ctx.fillText(String(n), cx, cy - H * 0.12 - f * H * 0.04);
          ctx.restore();
        }
      }

      // ── THE ASTEROID STORM — destructive. Each impact: a blinding flash, a
      //    shockwave ring, embers and rock debris flung into the air, a burning
      //    crater that smokes and scorches the ground for half a minute, plants
      //    nearby charred (they regrow later), the dinosaurs knocked into panic
      //    hops, the screen shaken and the sky filling with ash haze.
      function impact(x, y, big, t){
        FLASHES.push({ x, y, t0: t, big });
        RINGS.push({ x, y, t0: t, big });
        CRATERS.push({ x, y, t0: t, r: (big ? 46 : 26) * U });
        FIRES.push({ x, y, t0: t, dur: big ? rnd(7, 10) : rnd(4, 7), r: (big ? 16 : 10) * U, seed: Math.random() * 10 });
        for (let i = 0, n = big ? 28 : 14; i < n; i++){
          const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = rnd(120, big ? 440 : 300) * U;
          EMBERS.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: t, r: rnd(1.5, 4) * U, hot: Math.random() });
        }
        for (let i = 0, n = big ? 9 : 5; i < n; i++){
          const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15), sp = rnd(140, big ? 380 : 260) * U;
          DEBRIS.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: t, r: rnd(2.5, 6) * U, rot: rnd(0, TAU), vr: rnd(-6, 6) });
        }
        for (let i = 0; i < 3; i++) PUFFS.push({ x: x + rnd(-14, 14) * U, y, t0: t, col: '#7a6a70', smoke: true, big });
        PUFFS.push({ x, y, t0: t, col: '#c9a870' });
        shake = Math.max(shake, (big ? 16 : 8) * U);
        flashA = Math.max(flashA, big ? 0.55 : 0.22);
        ashHaze = Math.min(1, ashHaze + (big ? 0.25 : 0.12));
        const R = (big ? 0.13 : 0.075) * W;
        for (const p of PLANTS) if (p.kind !== 'rock' && !p.hurt && Math.abs(p.x - x) < R){ p.hurt = t; sceneDirty = true; }
        for (const w of WALKERS) if (Math.abs(w.L.x - x) < R * 1.6){ w.hopT0 = t; w.flee = true; w.act = null; w.L.pose = 0; w.dir = w.L.x < W * 0.5 ? -1 : 1; w.L.dir = w.dir; }
        if (EGG && EGG.state === 'rest' && Math.abs(EGG.L.x - x) < R * 1.4){ EGG.state = 'hatch'; EGG.hatchT0 = t; }
      }
      function updateStorm(t, dt){
        if (storm){
          const k = t - storm.t0;
          while (storm.next < storm.count && k > storm.next * 0.42){
            storm.next++;
            const big = storm.next === storm.count || Math.random() < 0.25;
            const ix = rnd(W * 0.28, W * 0.97), iy = groundY(rnd(0.05, 0.95));
            METEORS.push({ x0: ix - rnd(0.3, 0.6) * W, y0: -H * 0.15, x1: ix, y1: iy, t0: t, dur: big ? rnd(1.1, 1.4) : rnd(0.75, 1.05), done: false, big, r: (big ? 9 : 5) * U });
          }
          if (k > storm.count * 0.42 + 3) storm = null;
        }
        METEORS = METEORS.filter(m => t - m.t0 < m.dur + 0.05);
        for (const m of METEORS){
          if (!m.done && t - m.t0 >= m.dur){ m.done = true; impact(m.x1, m.y1, m.big, t); }
        }
        EMBERS = EMBERS.filter(p => t - p.t0 < 1.6);
        for (const p of EMBERS){ p.vy += 700 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        DEBRIS = DEBRIS.filter(p => t - p.t0 < 1.8 && p.y < H + 20);
        for (const p of DEBRIS){ p.vy += 900 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
        RINGS = RINGS.filter(r => t - r.t0 < 0.9);
        FLASHES = FLASHES.filter(f => t - f.t0 < 0.5);
        FIRES = FIRES.filter(f => t - f.t0 < f.dur + 1);
        CRATERS = CRATERS.filter(c => t - c.t0 < 32);
        for (const f of FIRES) if (t - f.t0 < f.dur && Math.random() < dt * 2.5) PUFFS.push({ x: f.x + rnd(-6, 6) * U, y: f.y - f.r, t0: t, col: '#6a5a60', smoke: true });
        shake *= Math.max(0, 1 - dt * 2.4);
        flashA *= Math.max(0, 1 - dt * 5);
        ashHaze = Math.max(0, ashHaze - dt * (storm ? 0.01 : 0.06));
        let dirty = sceneDirty; sceneDirty = false;                 // scorched plants regrow after half a minute
        for (const p of PLANTS) if (p.hurt && t - p.hurt > 30){ p.hurt = 0; dirty = true; }
        if (dirty) lookKey = -1;
      }
      // scorched craters on the valley floor (behind the dinosaurs)
      function drawCraters(t){
        for (const c of CRATERS){
          const age = t - c.t0, a = 1 - clamp01(age / 32);
          ctx.fillStyle = rgba('#2a1c1c', 0.6 * a);
          ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.34, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba('#5a4238', 0.5 * a);
          ctx.beginPath(); ctx.ellipse(c.x, c.y - c.r * 0.06, c.r * 0.7, c.r * 0.2, 0, 0, TAU); ctx.fill();
          if (age < 9){
            const g = (1 - age / 9) * (0.6 + 0.4 * Math.sin(t * 9 + c.x));
            ctx.fillStyle = rg(ctx, c.x, c.y, 0, c.r * 0.9, [[0, rgba('#ff9a40', 0.6 * g)], [1, rgba('#ff6a20', 0)]]);
            ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 0.9, c.r * 0.35, 0, 0, TAU); ctx.fill();
          }
        }
      }
      // meteors, flashes, shockwaves, embers, debris, fires, ash haze (in front of everything)
      function drawStormFx(t){
        for (const m of METEORS){
          const k = clamp01((t - m.t0) / m.dur), e = k * k * 0.3 + k * 0.7;
          const x = lerp(m.x0, m.x1, k), y = lerp(m.y0, m.y1, e);
          const kb = Math.max(0, k - (m.big ? 0.3 : 0.22)), px = lerp(m.x0, m.x1, kb), py = lerp(m.y0, m.y1, kb * kb * 0.3 + kb * 0.7);
          ctx.lineCap = 'round';
          ctx.strokeStyle = lg(ctx, x, y, px, py, [[0, 'rgba(90,60,70,.35)'], [1, 'rgba(90,60,70,0)']]);   // the smoke trail
          ctx.lineWidth = m.r * 3.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py); ctx.stroke();
          ctx.strokeStyle = lg(ctx, x, y, px, py, [[0, 'rgba(255,245,210,.95)'], [0.3, 'rgba(255,170,70,.8)'], [1, 'rgba(255,90,40,0)']]);   // the fire trail
          ctx.lineWidth = m.r * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py); ctx.stroke();
          for (let i = 0; i < 3; i++){                              // sparks shed along the trail
            const u = Math.random(), sx = lerp(x, px, u) + rnd(-1, 1) * m.r * 2, sy = lerp(y, py, u) + rnd(-1, 1) * m.r * 2;
            ctx.fillStyle = rgba('#ffd070', 0.8 * (1 - u)); ctx.beginPath(); ctx.arc(sx, sy, m.r * 0.22, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = rg(ctx, x, y, 0, m.r * 1.8, [[0, '#fffbe8'], [0.35, '#ffd070'], [0.7, rgba('#ff8a30', 0.9)], [1, rgba('#ff6a20', 0)]]);   // the fireball
          ctx.beginPath(); ctx.arc(x, y, m.r * 1.8, 0, TAU); ctx.fill();
        }
        for (const f of FLASHES){
          const k = (t - f.t0) / 0.5, r = (16 + 90 * k) * U * (f.big ? 1.6 : 1);
          ctx.fillStyle = rg(ctx, f.x, f.y, 0, r, [[0, rgba('#fff4d0', 0.9 * (1 - k))], [0.4, rgba('#ffb050', 0.5 * (1 - k))], [1, rgba('#ff8a40', 0)]]);
          ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill();
        }
        for (const r of RINGS){
          const k = (t - r.t0) / 0.9, rx = (12 + 130 * k) * U * (r.big ? 1.5 : 1);
          ctx.strokeStyle = rgba('#ffe0b0', 0.75 * (1 - k)); ctx.lineWidth = (7 - 5.5 * k) * U;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, rx, rx * 0.34, 0, 0, TAU); ctx.stroke();
        }
        for (const p of EMBERS){
          const a = 1 - clamp01((t - p.t0) / 1.6);
          ctx.fillStyle = p.hot > 0.6 ? rgba('#fff0a0', a) : p.hot > 0.3 ? rgba('#ff9a40', a) : rgba('#ff5a30', a);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * a), 0, TAU); ctx.fill();
        }
        for (const p of DEBRIS){
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = '#3a2a2a';
          ctx.beginPath(); ctx.moveTo(-p.r, -p.r * 0.5); ctx.lineTo(p.r * 0.3, -p.r); ctx.lineTo(p.r, p.r * 0.2); ctx.lineTo(0, p.r); ctx.lineTo(-p.r * 0.8, p.r * 0.5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        for (const f of FIRES){
          const life = 1 - clamp01((t - f.t0 - f.dur) / 1), grow = Math.min(1, (t - f.t0) / 0.4);
          if (life <= 0) continue;
          ctx.fillStyle = rg(ctx, f.x, f.y - f.r * 0.5, 0, f.r * 2.4, [[0, rgba('#ff9a40', 0.35 * life)], [1, rgba('#ff6a20', 0)]]);
          ctx.beginPath(); ctx.arc(f.x, f.y - f.r * 0.5, f.r * 2.4, 0, TAU); ctx.fill();
          for (let i = 0; i < 4; i++){
            const fl = 0.75 + 0.25 * Math.sin(t * 17 + i * 2.1 + f.seed), dx = (i - 1.5) * f.r * 0.45, h = f.r * (1.1 + 0.7 * psr(i + f.seed)) * fl * life * grow;
            const flame = (w, hh, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(f.x + dx - w, f.y); ctx.quadraticCurveTo(f.x + dx - w * 0.6, f.y - hh * 0.55, f.x + dx + Math.sin(t * 11 + i) * w * 0.3, f.y - hh); ctx.quadraticCurveTo(f.x + dx + w * 0.6, f.y - hh * 0.55, f.x + dx + w, f.y); ctx.closePath(); ctx.fill(); };
            flame(f.r * 0.42, h, rgba('#ff7a2a', 0.9)); flame(f.r * 0.24, h * 0.62, rgba('#ffd060', 0.95));
          }
        }
        if (ashHaze > 0.01){                                           // ash in the air
          ctx.fillStyle = lg(ctx, 0, 0, 0, H * 0.78, [[0, rgba('#3a2630', 0.55 * ashHaze)], [1, rgba('#3a2630', 0)]]);
          ctx.fillRect(0, 0, W, H * 0.78);
        }
        if (flashA > 0.01){ ctx.fillStyle = 'rgba(255,245,225,' + flashA + ')'; ctx.fillRect(0, 0, W, H); }
      }
      function drawGrass(t, L){
        ctx.lineCap = 'round';
        for (const b of GRASS){
          const sway = Math.sin(t * 1.4 + b.ph) * 0.18 + b.lean;
          ctx.strokeStyle = mix(b.y > H * 0.97 ? '#1f3a1e' : '#2f5a2c', L.haze, 0.25); ctx.lineWidth = 2.4 * U;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + sway * b.h * 0.4, b.y - b.h * 0.55, b.x + sway * b.h, b.y - b.h); ctx.stroke();
        }
      }

      // ── the frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        if (todTween){
          const k = clamp01((t - todTween.t0) / todTween.dur), e = k * k * (3 - 2 * k);
          tod = lerp(todTween.from, todTween.to, e); if (k >= 1) todTween = null;
        } else tod = (tod + dt / DAY_SEC) % 1;
        updateStorm(t, dt);
        repaintIfNeeded();
        const L = curLook;
        updateAnimals(t, dt);
        // screen shake: the eruption's rumble, the asteroids' impacts
        if (erupt && erupt.phase === 'erupt'){ const k = t - erupt.t0; if (k < 2.2) shake = Math.max(shake, (1 - k / 2.2) * 5 * U); }
        const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
        ctx.save(); ctx.translate(sx, sy);
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        drawStars(t, L);
        drawClouds(t, L, dt);
        ctx.drawImage(sceneL.cv, 0, 0, W, H);
        drawCraters(t);
        drawVolcanoFx(t, dt);
        // the animals on their own layer (sorted far → near)
        drawAnimals(aniL.cx, t);
        ctx.drawImage(aniL.cv, 0, 0, W, H);
        drawGrass(t, L);
        drawStormFx(t);
        // night: one soft darkening veil over the valley — mountains, volcano,
        // dinosaurs and grass together — fading in below the sky
        if (L.tint[3] > 0.004){
          const c = Math.round(L.tint[0]) + ',' + Math.round(L.tint[1]) + ',' + Math.round(L.tint[2]);
          ctx.fillStyle = lg(ctx, 0, H * 0.36, 0, H * 0.62, [[0, 'rgba(' + c + ',0)'], [1, 'rgba(' + c + ',' + L.tint[3] + ')']]);
          ctx.fillRect(0, H * 0.36, W, H * 0.64);
        }
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
        const keep = WALKERS.map(w => W ? w.L.x / W : 0);
        skyL = makeLayer(); sceneL = makeLayer(); aniL = makeLayer();
        buildScene();
        WALKERS.forEach((w, i) => { w.L.s = scaleAt(w.depth) * SPECIES[w.kind].size; w.L.y = groundY(w.depth); if (keep[i]) w.L.x = keep[i] * W; });
        if (PTERO){ PTERO.L.s = scaleAt(PTERO.depth) * 0.9; }
        if (EGG){ EGG.L.s = scaleAt(EGG.depth) * 0.95; if (EGG.state !== 'fall') EGG.L.y = groundY(EGG.depth); }
        lookKey = -1; repaintIfNeeded();
      }
      function hitVolcano(mx, my){
        const v = VOL(); if (my > v.base || my < v.cy - H * 0.06) return false;
        const f = (my - v.cy) / (v.base - v.cy);                     // 0 at the crater … 1 at the base
        const left = v.cl - (v.cl - v.l) * f, right = v.cr + (v.r - v.cr) * f;
        return mx > left - W * 0.02 && mx < right + W * 0.02;
      }
      const onClick = e => {
        if (stopped) return;
        if (e.target.closest && e.target.closest(UI_SEL)) return;
        const mx = e.clientX, my = e.clientY;
        let hit = null;
        const cands = WALKERS.slice(); if (PTERO) cands.push(PTERO);
        for (const a of cands){
          const hw = a.rig.WIDTH * a.L.s, hh = a.rig.HEIGHT * a.L.s;
          if (mx > a.L.x - hw && mx < a.L.x + hw && my > a.L.y - hh && my < a.L.y + 8 * a.L.s) if (!hit || a.L.y > hit.L.y) hit = a;
        }
        if (hit){ startAct(hit, lastT); recolor(hit); return; }
        if (EGG && Math.abs(mx - EGG.L.x) < EGG.rig.WIDTH * 1.4 * EGG.L.s && my > EGG.L.y - EGG.rig.HEIGHT * EGG.L.s && my < EGG.L.y + 8 * EGG.L.s){
          if (EGG.state === 'rest'){ EGG.state = 'hatch'; EGG.hatchT0 = lastT; } return;
        }
        if (hitVolcano(mx, my)){                                    // clicks alternate: eruption, asteroids, eruption …
          volcanoClicks++;
          if (volcanoClicks % 2 === 0) startStorm(lastT);
          else if (!erupt) erupt = { phase: 'count', t0: lastT };
          return;
        }
        // the sun or the moon fast-forward the day
        const sun = { x: W * 0.40, y: H * curLook.sunY }, moon = { x: W * 0.90, y: H * 0.13 }, R = Math.min(W, H) * 0.1;
        if (!todTween && ((curLook.sunA > 0.05 && Math.hypot(mx - sun.x, my - sun.y) < R) || (curLook.moon > 0.3 && Math.hypot(mx - moon.x, my - moon.y) < R))){
          const nextKey = KEYS.find(k => k.at > tod + 0.02) || KEYS[KEYS.length - 1];
          todTween = { from: tod, to: nextKey.at + 0.02, t0: lastT, dur: 2.4 };
        }
      };

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      loadRigs(() => { if (!stopped && rafId === null){ resize(); rafId = requestAnimationFrame(frame); } });

      // ── "rumi" strolls the valley every few minutes (ambient — she is not a
      //    dinosaur and not part of the walker cap; she brings her own blink /
      //    hearts / click reactions). Same cadence as the old dinosaurs scene.
      const rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      let rumiPatrol = null;
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, {
          height: '17%', bottom: '3.4%', duration: 17000, zIndex: 7,
          gapMin: 120000, gapMax: 240000,                 // reappears every 2–4 min
          startDelay: 45000 + Math.random() * 90000,      // first stroll after ~45 s–2¼ min
        });
      });

      const hooks = window._dino3 = {
        seek: f => { tod = f; lookKey = -1; },
        erupt: () => { if (!erupt) erupt = { phase: 'count', t0: lastT }; },
        boom: () => { erupt = { phase: 'erupt', t0: lastT }; },
        storm: () => startStorm(lastT),
        egg: () => { EGG = null; layEgg(W * 0.7, H * 0.3, 0.6, 'green'); },
        spawn: kind => spawnWalker(kind),
        ptero: () => spawnPtero(),
        act: () => { WALKERS.forEach(w => startAct(w, lastT)); if (PTERO) startAct(PTERO, lastT); },
        walkers: () => WALKERS, look: () => curLook, tod: () => tod,
        rumi: () => {                                     // force an immediate stroll (harness/tests)
          if (!window.ChibiWalker) return false;
          if (rumiPatrol) { try { rumiPatrol.stop(); } catch (e) {} }
          rumiPatrol = window.ChibiWalker.patrol(rumiLayer, {
            height: '17%', bottom: '3.4%', duration: 17000, zIndex: 7,
            gapMin: 120000, gapMax: 240000, startDelay: 0 });
          return true;
        },
        rumiLayer: () => rumiLayer,
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (rumiPatrol) { try { rumiPatrol.stop(); } catch (e) {} }
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        stage.innerHTML = '';
        if (window._dino3 === hooks) delete window._dino3;
      };
    },
  };
})();
