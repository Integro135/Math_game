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
  aids: 'classic',              // kangaroo + cookies fit the savanna fine
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
  function makeLayer(){
    const cv = document.createElement('canvas');
    cv.width = W * DPR; cv.height = H * DPR;
    const cx = cv.getContext('2d');
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv, cx };
  }

  // ── Scene state ──
  let staticLayer, vigLayer, GRASS, MOTES, FARTS;
  let LION, LIONESS, CHEET1, CHEET2, ZEBRA, GIRAFFE, ELEPHANT, OSTRICH;

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

    // everyone moves: the pride paces its rock, the plain dwellers patrol.
    // acts (borrowed from the unicorn valley): jump / rear-up / a green toot.
    LION    = { x: W * 0.362, y: H * 0.356, s: U * 1.00, dir:  1, ph: 0.0,
                speed: 6,  lo: W * 0.300, hi: W * 0.388, pauseUntil: 8, wt: 0,
                pMin: 6, pMax: 14, acts: ['roar', 'rear', 'fart'], rearPiv: -32,
                ventX: 46, ventY: 48, hitW: 64, hitH: 112 };
    LION.yFn    = x => H * (0.372 - (x / W - 0.255) / 0.145 * 0.017);
    LIONESS = { x: W * 0.185, y: H * 0.410, s: U * 0.74, dir:  1, ph: 2.2,
                speed: 5,  lo: W * 0.178, hi: W * 0.246, pauseUntil: 4, wt: 0,
                pMin: 5, pMax: 12, acts: ['jump', 'roll', 'fart'], jumpH: 24,
                ventX: 46, ventY: 44, hitW: 60, hitH: 100 };
    LIONESS.yFn = x => H * (0.372 + (0.255 - x / W) / 0.085 * 0.043);
    CHEET1  = { x: W * 0.115, y: H * 0.580, s: U * 0.80, dir:  1, ph: 1.1,
                acts: ['jump', 'fart'], jumpH: 16,
                ventX: 24, ventY: 10, hitW: 38, hitH: 82 };
    CHEET2  = { x: W * 0.575, y: H * 0.935, s: U * 1.00, dir: -1, ph: 3.3,
                speed: 30, lo: W * 0.45, hi: W * 0.80, pauseUntil: 1.5, wt: 0,
                acts: ['jump', 'spin', 'fart'], jumpH: 40,
                ventX: 40, ventY: 34, hitW: 56, hitH: 92 };
    ZEBRA   = { x: W * 0.92,  y: H * 0.885, s: U * 0.58, dir: -1, ph: 1.7,
                speed: 26, lo: W * 0.50, hi: W * 1.06, pauseUntil: 0, wt: 0,
                acts: ['jump', 'rear', 'roll', 'fart'], jumpH: 30, rearPiv: -32,
                ventX: 50, ventY: 46, hitW: 58, hitH: 118 };
    GIRAFFE = { x: W * 0.62,  y: H * 0.795, s: U * 0.50, dir:  1, ph: 4.1,
                speed: 16, lo: W * 0.47, hi: W * 1.06, pauseUntil: 3, wt: 0,
                acts: ['jump', 'fart'], jumpH: 10,
                ventX: 38, ventY: 60, hitW: 52, hitH: 168 };
    ELEPHANT = { x: W * 0.78, y: H * 0.825, s: U * 0.62, dir: -1, ph: 5.3,
                speed: 10, lo: W * 0.48, hi: W * 1.04, pauseUntil: 2, wt: 0,
                pMin: 3, pMax: 7, acts: ['trumpet', 'shower', 'fart'],
                ventX: 52, ventY: 44, hitW: 74, hitH: 104 };
    OSTRICH = { x: W * 0.52, y: H * 0.915, s: U * 0.62, dir:  1, ph: 0.7,
                speed: 38, lo: W * 0.44, hi: W * 0.98, pauseUntil: 1, wt: 0,
                acts: ['bury', 'jump', 'fart'], jumpH: 34,
                ventX: 24, ventY: 62, hitW: 40, hitH: 140 };
    FARTS = [];
    // debug/automation handle (harness + tests): poke an animal directly
    window._savAnimals = { LION, LIONESS, CHEET1, CHEET2, ZEBRA, GIRAFFE, ELEPHANT, OSTRICH };
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

    // thin sun-lit cloud streaks
    for (let i = 0; i < 6; i++){
      const cy = H * (0.10 + psr(i + 61) * 0.34);
      const cw = W * (0.12 + psr(i + 71) * 0.22);
      const cx2 = psr(i + 81) * W;
      c.fillStyle = `rgba(255, ${170 + (i % 3) * 25}, 110, ${0.16 + psr(i + 91) * 0.12})`;
      c.beginPath(); c.ellipse(cx2, cy, cw, H * 0.008 + psr(i) * H * 0.006, 0, 0, TAU); c.fill();
    }

    // hazy far plains + tiny acacias
    c.fillStyle = '#8a4030';
    c.beginPath();
    c.moveTo(0, H * 0.70);
    for (let x = 0; x <= W; x += 60) c.lineTo(x, H * 0.70 + Math.sin(x * 0.004) * H * 0.012);
    c.lineTo(W, H * 0.78); c.lineTo(0, H * 0.78); c.closePath(); c.fill();
    for (let i = 0; i < 5; i++)
      drawAcacia(c, W * (0.45 + i * 0.13) + psr(i + 5) * 40, H * 0.715, U * 0.5, 'rgba(80,30,24,.85)');

    // the main savanna plain
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

    paintPrideRock(c);
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
    // back stack silhouettes
    c.fillStyle = '#3c1d12';
    c.beginPath();
    c.moveTo(-10, H * 0.80);
    c.quadraticCurveTo(W * 0.02, H * 0.52, W * 0.09, H * 0.50);
    c.quadraticCurveTo(W * 0.16, H * 0.49, W * 0.20, H * 0.60);
    c.lineTo(W * 0.22, H * 0.80);
    c.closePath(); c.fill();
    // the main slab — rises to the overhanging tip
    const rockG = lg(c, 0, tipY, 0, H * 0.86, [
      [0, '#7a4526'], [0.45, '#5c3018'], [1, '#38190e'],
    ]);
    c.fillStyle = rockG;
    c.beginPath();
    c.moveTo(-10, H * 0.86);
    c.lineTo(W * 0.015, H * 0.64);
    c.lineTo(W * 0.07, H * 0.52);
    c.quadraticCurveTo(W * 0.17, H * 0.42, W * 0.255, H * 0.372);
    c.lineTo(tipX, tipY);                          // the very tip
    c.lineTo(tipX - W * 0.012, tipY + H * 0.035);  // underside of the point
    c.quadraticCurveTo(W * 0.30, H * 0.46, W * 0.225, H * 0.52);
    c.quadraticCurveTo(W * 0.16, H * 0.575, W * 0.135, H * 0.66);
    c.lineTo(W * 0.10, H * 0.86);
    c.closePath(); c.fill();
    // support column under the slab
    c.fillStyle = lg(c, W * 0.13, 0, W * 0.21, 0, [[0, '#34170c'], [1, '#5c3018']]);
    c.beginPath();
    c.moveTo(W * 0.155, H * 0.50);
    c.lineTo(W * 0.21, H * 0.475);
    c.lineTo(W * 0.225, H * 0.86);
    c.lineTo(W * 0.135, H * 0.86);
    c.closePath(); c.fill();
    // the lower ledge (the cheetah's spot)
    c.fillStyle = '#542a14';
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
  function drawLion(L, t, female, moving){
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
      maneD: '#54290F', mane: '#71381A', maneL: '#8F4E26', line: '#3F2410',
    };
    // grounding shadow
    ctx.fillStyle = 'rgba(40,12,4,.30)';
    ctx.beginPath(); ctx.ellipse(-4, 1.5, 52, 6, 0, 0, TAU); ctx.fill();
    // tail — long swish, dark tuft
    const sw = Math.sin(t * 1.05 + ph);
    ctx.strokeStyle = C.coatD; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, -56);
    ctx.bezierCurveTo(-64, -50, -76, -32 + sw * 4, -72 + sw * 6, -14 + sw * 4);
    ctx.stroke();
    ctx.fillStyle = C.maneD;
    ctx.beginPath();
    ctx.ellipse(-72 + sw * 6, -10 + sw * 4, 4, 6.4, sw * 0.3, 0, TAU); ctx.fill();
    // far legs (darker)
    lionLeg(ctx, -36, A(2) + 0.02, B(2), C.coatD, C.line, true);
    lionLeg(ctx, 26, A(0) - 0.02, B(0), C.coatD, C.line, false);
    // torso — high withers, dipped loin, round croup, deep chest
    const breathe = 1 + Math.sin(t * 1.35 + ph) * 0.008;
    ctx.save();
    ctx.scale(1, breathe);
    ctx.fillStyle = lg(ctx, 0, -82, 0, -32, [
      [0, C.coatL], [0.55, C.coat], [1, C.coatD],
    ]);
    ctx.beginPath();
    ctx.moveTo(44, -36);                             // chest point (behind mane)
    ctx.bezierCurveTo(51, -46, 51, -62, 43, -72);    // massive front
    ctx.quadraticCurveTo(28, -81, 8, -80);           // high withers
    ctx.bezierCurveTo(-8, -78, -20, -73, -30, -71);  // loin dips
    ctx.bezierCurveTo(-45, -69, -52, -59, -52, -49); // round croup
    ctx.quadraticCurveTo(-52, -39, -45, -34);        // rump into thigh
    ctx.quadraticCurveTo(-32, -28, -20, -32);        // thigh front
    ctx.quadraticCurveTo(-2, -42, 18, -40);          // waist tuck rising fwd
    ctx.quadraticCurveTo(34, -34, 44, -36);          // deep chest
    ctx.closePath(); ctx.fill();
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
      maneBlob(ctx, -8, 5, 26, 33, 12, C.maneD, t, ph + 3);
      maneBlob(ctx, -7, 3, 21, 27, 11, C.mane, t, ph + 11);
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
    // front mane framing the face + forelock over the brow
    if (!female){
      maneBlob(ctx, -10, 0, 14, 18, 10, C.maneL, t, ph + 23);
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
    // long greyhound legs: curved thigh, thin shank, small oval paw
    ctx.save();
    ctx.translate(hx, -46);
    ctx.rotate(a1 + (hind ? 0.14 : -0.02));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-5.5, -2);
    ctx.quadraticCurveTo(-4.6, 10, -2.8, 21);
    ctx.lineTo(2.6, 21);
    ctx.quadraticCurveTo(5.2, 9, 5.5, -2);
    ctx.closePath(); ctx.fill();
    ctx.translate(0, 20);
    ctx.rotate(a2 - (hind ? 0.20 : 0.02));
    ctx.beginPath();
    ctx.moveTo(-2.4, 0);
    ctx.quadraticCurveTo(-2.1, 12, -1.7, 24);
    ctx.lineTo(1.8, 24);
    ctx.quadraticCurveTo(2.3, 12, 2.6, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, 24.6, 4.2, 2.1, 0, 0, TAU); ctx.fill();
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
    ctx.beginPath(); ctx.ellipse(-2, 1.5, 46, 5.5, 0, 0, TAU); ctx.fill();
    // raised ringed tail off the croup
    const fl = Math.sin(t * 2.4 + ph) * 3;
    ctx.strokeStyle = C.coat; ctx.lineWidth = 2.9; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-43, -38);
    ctx.bezierCurveTo(-58, -36, -67, -44 + fl * 0.4, -65, -56 + fl);
    ctx.stroke();
    tailRings([[-61.5, -49 + fl * 0.8], [-63, -51.5 + fl * 0.9], [-64, -53.5 + fl], [-64.6, -55 + fl], [-65, -56.6 + fl]]);
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
    ctx.fillStyle = 'rgba(40,12,4,.26)';
    ctx.beginPath(); ctx.ellipse(-4, 2, 50, 6, 0, 0, TAU); ctx.fill();
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
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.fillStyle = 'rgba(40,12,4,.24)';
    ctx.beginPath(); ctx.ellipse(-2, 2, 46, 5.5, 0, 0, TAU); ctx.fill();
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
    // neck patches
    ctx.fillStyle = '#B07028';
    for (let i = 0; i < 7; i++){
      const p = psr(i * 3 + ph), q = psr(i * 7 + ph + 30);
      ctx.beginPath();
      ctx.ellipse(-2 + p * 24, -2 - q * 44, 3.2, 4, p * 2, 0, TAU);
      ctx.fill();
    }
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
    ctx.fillStyle = '#B07028';
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
    if (moving) ctx.translate(0, Math.sin(E.wt * 2) * 1.2);
    ctx.fillStyle = 'rgba(40,12,4,.30)';
    ctx.beginPath(); ctx.ellipse(-2, 1.5, 56, 7, 0, 0, TAU); ctx.fill();
    const wamp = moving ? 0.10 : 0;
    const A = i => wamp * Math.sin(E.wt + i * Math.PI / 2);
    // tail
    ctx.strokeStyle = '#7E7E86'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, -54);
    ctx.quadraticCurveTo(-54, -40, -52 + Math.sin(t * 1.2 + ph) * 3, -26);
    ctx.stroke();
    ctx.fillStyle = '#55555E';
    ctx.beginPath(); ctx.ellipse(-52 + Math.sin(t * 1.2 + ph) * 3, -23, 2.6, 4.6, 0, 0, TAU); ctx.fill();
    // columnar legs (far pair darker), gentle swing, toenail arcs
    for (const [hx, far, phI] of [[-34, 1, 2], [18, 1, 0], [-24, 0, 3], [28, 0, 1]]){
      ctx.save();
      ctx.translate(hx, -52);
      ctx.rotate(A(phI));
      ctx.fillStyle = far ? '#80808A' : '#9A9AA2';
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
    ctx.fillStyle = lg(ctx, 0, -92, 0, -38, [[0, '#B2B2BA'], [0.55, '#9A9AA2'], [1, '#7E7E86']]);
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
    ctx.fillStyle = '#A4A4AC';
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
    ctx.strokeStyle = '#9A9AA2';
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
    ctx.fillStyle = '#8A8A92';
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
    ctx.fillStyle = 'rgba(40,12,4,.28)';
    ctx.beginPath(); ctx.ellipse(0, 1.5, 30, 4.5, 0, 0, TAU); ctx.fill();
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
  //    The lions use the same machinery — their patch is the rock itself,
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

  // ── animal acts, borrowed from the unicorn valley: a joyful jump, a
  //    rear-up on the hind legs, or (zebras only) a gentle green toot ──
  function animalAct(a, t){
    if (!a.acts) return null;
    if (!a.act){
      if (a.nextActAt === undefined) a.nextActAt = t + 5 + psr(a.ph * 7.3) * 12;
      if (t >= a.nextActAt){
        a.act = { type: a.acts[(Math.random() * a.acts.length) | 0], t0: t };
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
  function drawBirds(t){
    ctx.strokeStyle = 'rgba(40,12,10,.75)'; ctx.lineWidth = U * 0.8; ctx.lineCap = 'round';
    for (const [spd, off, by, n] of [[26, 0, 0.10, 5], [19, 700, 0.19, 3]]){
      const span = W + 300;
      const bx = ((t * spd + off) % span) - 150;
      for (let i = 0; i < n; i++){
        const px = bx - i * 26 - (i % 2) * 8;
        const py = H * by + Math.sin(t * 0.8 + i) * 8 + i * 5;
        const flap = Math.sin(t * 7 + i * 1.3) * 3.5;
        ctx.beginPath();
        ctx.moveTo(px - 5, py - flap);
        ctx.quadraticCurveTo(px, py + 2, px + 5, py - flap);
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
  function renderFrame(t){
    const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    // the roar rattles the whole frame
    const roarP = (LION.act && LION.act.type === 'roar')
      ? Math.min(1, (t - LION.act.t0) / 1.6) : 0;
    const shake = Math.sin(roarP * Math.PI) * 4;
    ctx.save();
    if (shake > 0.1)
      ctx.translate((psr(t * 53.7) - 0.5) * 2 * shake, (psr(t * 71.3) - 0.5) * 2 * shake);
    ctx.drawImage(staticLayer.cv, 0, 0, W, H);
    drawMotes(t);
    drawBirds(t);
    // plain dwellers, far → near — everyone patrols, pauses and acts
    const movG = updateWalker(GIRAFFE, t, dt);
    drawWithAct(GIRAFFE, t, () => drawGiraffe(GIRAFFE, t, movG));
    const movE = updateWalker(ELEPHANT, t, dt);
    drawWithAct(ELEPHANT, t, () => drawElephant(ELEPHANT, t, movE));
    const movZ = updateWalker(ZEBRA, t, dt);
    drawWithAct(ZEBRA, t, () => drawZebra(ZEBRA, t, movZ));
    const movO = updateWalker(OSTRICH, t, dt);
    drawWithAct(OSTRICH, t, () => drawOstrich(OSTRICH, t, movO));
    const movC = updateWalker(CHEET2, t, dt);
    drawWithAct(CHEET2, t, () => drawCheetahStand(CHEET2, t, movC));
    // the pride paces its rock
    drawWithAct(CHEET1, t, () => drawCheetahSit(CHEET1, t));
    const movLs = updateWalker(LIONESS, t, dt);
    drawWithAct(LIONESS, t, () => drawLion(LIONESS, t, true, movLs));
    const movL = updateWalker(LION, t, dt);
    drawWithAct(LION, t, () => drawLion(LION, t, false, movL));
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
    for (const a of [CHEET1, CHEET2, OSTRICH, ZEBRA, LION, LIONESS, ELEPHANT, GIRAFFE]){
      const hw = (a.hitW || 60) * a.s, hh = (a.hitH || 110) * a.s;
      if (mx > a.x - hw && mx < a.x + hw && my > a.y - hh && my < a.y + 8 * a.s){
        if (!a.act) a.act = { type: a.acts[(Math.random() * a.acts.length) | 0], t0: lastT };
        break;
      }
    }
  };
  document.addEventListener('click', savClick);

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(draw);

  return function cleanup(){
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', savClick);
    stage.innerHTML = '';
  };
  },
};
