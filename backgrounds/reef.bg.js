/* ── Reef background module ─────────────────────────────────────────────────
   Coral reef: static prerender (water gradient, sun bloom, sand, coral
   garden via the paint* family) + vignette; alive per frame: sun rays,
   sediment motes, seep bubbles, the fusilier school, kelp & seagrass, two
   anemones hosting six clownfish, 2 blacktip sharks, 3 blue tangs each with
   a clownfish buddy, 2 dolphins (each surfacing for a breath + blow every
   minute or so), a crab, a puffer that balloons every ~2 min, the
   butterflyfish couple (with heart), a treasure chest that opens every
   ~2.5 min AND on click, and the poop system (every fish, ~3 min).
   Passing giants: a blue whale ~20× the dolphin glides past the surface
   every few minutes; an orca ~5× cruises through now and then.
   Clicks and the 4–12 s random scheduler share one action path
   (fishTargets/doFishAct): sharks dash (and startle the school when they
   charge near it), tangs & dolphins dash / barrel-roll / blow a bubble
   ring, puffer inflates, butterflies emit hearts, a clicked anemone
   clownfish darts OUT for a loop (the scheduler keeps the shy hide),
   the school scatters — always with a bubble puff. Pooping is never
   click-driven. Docs: backgrounds/README.md.
   Loaded on demand by game/js/bg-loader.js. Registers itself into the
   BACKGROUNDS registry; init() mounts the scene into the given stage layer
   and returns a cleanup that stops every loop and listener it created. */
window.BACKGROUNDS = window.BACKGROUNDS || {};
window.BACKGROUNDS.reef = {
  skin: 'reef',                 // game look:  game/skins/reef.skin.css
  aids: 'reef',                 // aid art:    aids/reef.aids.js (dolphin line + pearl chest)
  init({stage}) {
  const layer = stage;
  let stopped = false;
  layer.innerHTML = '';
  layer.style.overflow = 'hidden';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
  layer.appendChild(canvas);
  const ctx    = canvas.getContext('2d');
  const DPR    = Math.min(devicePixelRatio || 1, 2);
  const TAU    = Math.PI * 2;
  let W, H;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function lg(c, x1,y1,x2,y2,st){const g=c.createLinearGradient(x1,y1,x2,y2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function rg(c, x,y,r1,r2,st){const g=c.createRadialGradient(x,y,r1,x,y,r2);st.forEach(([t,col])=>g.addColorStop(t,col));return g;}
  function shade(hex, f) {            // darken (f<1) or lighten (f>1) a #rrggbb color
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f | 0);
    const g = Math.min(255, ((n >> 8) & 255) * f | 0);
    const b = Math.min(255, (n & 255) * f | 0);
    return `rgb(${r},${g},${b})`;
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  function makeLayer(){
    const cv = document.createElement('canvas');
    cv.width = W * DPR; cv.height = H * DPR;
    const cx = cv.getContext('2d');
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { cv, cx };
  }

  // ── Scene state ────────────────────────────────────────────────────────────
  let RAYS, MOTES, BUBBLES, SCHOOL, KELP, GRASS;
  let SHARKS, DORIES, NEMOS, ANEMONES, CRAB, PUFFER, BUTTERS, CHEST, DOLPHS;
  let sandTopAt, sandPath, OUTCROPS;
  let staticLayer, vigLayer;
  let FXBUB, FXHEARTS, FXPUFF, FXRINGS, nextFishActAt;   // click/scheduled action state
  let WHALE, ORCA;                      // passing giants (blue whale / killer whale)

  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildScene();
    buildStaticLayers();
  }

  function buildScene() {
    sandTopAt = x => H * 0.87 + Math.sin(x * 0.010) * H * 0.018 + Math.sin(x * 0.027 + 2) * H * 0.008;
    sandPath = new Path2D();
    sandPath.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) sandPath.lineTo(x, sandTopAt(x));
    sandPath.lineTo(W, H);
    sandPath.closePath();

    // Two rocky reef bommies the corals colonise
    OUTCROPS = [
      { x: W * 0.14, w: W * 0.16, topY: H * 0.70 },
      { x: W * 0.82, w: W * 0.14, topY: H * 0.74 },
    ];

    // Sunbeams slanting down through clear water
    RAYS = Array.from({length: 6}, () => ({
      x: Math.random() * W,
      skew: (Math.random() - 0.5) * W * 0.16,
      width: W * (0.04 + Math.random() * 0.07),
      phase: Math.random() * TAU,
      speed: 0.3 + Math.random() * 0.4,
    }));

    // Suspended sediment — real water is never perfectly empty
    MOTES = Array.from({length: 65}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.3 + Math.random() * 1.0,
      vx: 0.04 + Math.random() * 0.08,
      vy: 0.01 + Math.random() * 0.04,
      phase: Math.random() * TAU,
    }));

    // Bubble streams from crevices in the reef
    const seeps = [W * 0.14, W * 0.52, W * 0.82];
    BUBBLES = Array.from({length: 22}, (_, i) => {
      const sx = seeps[i % seeps.length];
      return {
        sx,
        x: sx + (Math.random() - 0.5) * 20,
        y: Math.random() * H,
        r: 0.8 + Math.random() * 3,
        vy: -(0.4 + Math.random() * 0.7),
        sway: Math.random() * TAU,
      };
    });

    // A school of silvery fusiliers
    SCHOOL = Array.from({length: 18}, () => ({
      ox: (Math.random() - 0.5) * 130,
      oy: (Math.random() - 0.5) * 55,
      size: 3.4 + Math.random() * 2.4,
      phase: Math.random() * TAU,
    }));
    SCHOOL.leader = { x: W * 0.3, y: H * 0.32, vx: 0.6 };

    // Kelp — tall olive stipes with blades
    KELP = [
      { x: W * 0.045, h: H * 0.30, hue: '#4e7030' },
      { x: W * 0.255, h: H * 0.22, hue: '#5a7c38' },
      { x: W * 0.660, h: H * 0.26, hue: '#46682c' },
      { x: W * 0.945, h: H * 0.28, hue: '#52743a' },
    ];

    // Seagrass meadow — clusters of thin swaying blades
    GRASS = [0.025, 0.09, 0.215, 0.335, 0.43, 0.475, 0.565, 0.69, 0.755, 0.90, 0.965].map(fx => {
      const gx = W * fx;
      return {
        x: gx,
        blades: Array.from({length: 6 + (Math.random() * 4 | 0)}, () => ({
          dx: (Math.random() - 0.5) * W * 0.018,
          len: H * (0.04 + Math.random() * 0.065),
          lean: (Math.random() - 0.5) * 0.5,
          phase: Math.random() * TAU,
          w: 1.4 + Math.random() * 1.2,
          hue: ['#3f7d3a', '#4f9148', '#62a352', '#588a40'][Math.random() * 4 | 0],
        })),
      };
    });

    // Bubble-tip anemones — tentacles generated once so they keep their shape
    ANEMONES = [
      { x: OUTCROPS[0].x, y: OUTCROPS[0].topY + 2, s: H * 0.060,
        tcol: '#c8b078', tip: '#d864a8', base: '#8a4a78' },
      { x: W * 0.56, y: sandTopAt(W * 0.56) + 2, s: H * 0.052,
        tcol: '#a8bc8a', tip: '#c878e0', base: '#6a4880' },
    ].map(a => ({
      ...a,
      tents: Array.from({length: 26}, (_, i) => ({
        dx: ((i / 25) * 2 - 1) * (0.85 + Math.random() * 0.25),
        len: a.s * (0.75 + Math.random() * 0.45),
        phase: Math.random() * TAU,
        front: i % 2 === 1,
      })),
    }));

    // Ocellaris clownfish — a real anemone family: large female,
    // smaller male in one host, a juvenile in the other
    NEMOS = [
      { home: ANEMONES[0], s: Math.min(W, H) * 0.0210, w1: 0.42, w2: 0.9,  phase: Math.random() * TAU },
      { home: ANEMONES[0], s: Math.min(W, H) * 0.0150, w1: 0.55, w2: 1.2,  phase: Math.random() * TAU },
      { home: ANEMONES[0], s: Math.min(W, H) * 0.0130, w1: 0.62, w2: 1.05, phase: Math.random() * TAU },
      { home: ANEMONES[1], s: Math.min(W, H) * 0.0170, w1: 0.46, w2: 0.95, phase: Math.random() * TAU },
      { home: ANEMONES[1], s: Math.min(W, H) * 0.0125, w1: 0.50, w2: 1.1,  phase: Math.random() * TAU },
      { home: ANEMONES[1], s: Math.min(W, H) * 0.0140, w1: 0.58, w2: 1.25, phase: Math.random() * TAU },
    ];

    // Blacktip reef sharks patrolling the open water
    SHARKS = [
      { x: W * 0.2,  y: H * 0.16, vx: 0.6,   s: Math.min(W, H) * 0.072, hue: '#7e8b96', phase: Math.random() * TAU },
      { x: W * 0.85, y: H * 0.32, vx: -0.45, s: Math.min(W, H) * 0.048, hue: '#8d9aa6', phase: Math.random() * TAU },
    ];

    // Bottlenose dolphins cruising the open blue
    DOLPHS = [
      { x: W * 0.35, baseY: H * 0.14, vx: 1.35,  s: Math.min(W, H) * 0.058, phase: Math.random() * TAU },
      { x: W * 0.75, baseY: H * 0.26, vx: -1.05, s: Math.min(W, H) * 0.042, phase: Math.random() * TAU },
    ];

    // Blue tangs drifting along the reef face
    DORIES = Array.from({length: 3}, (_, i) => ({
      x: Math.random() * W,
      baseY: H * (0.30 + i * 0.13),
      vx: (i % 2 ? -1 : 1) * (0.45 + Math.random() * 0.35),
      s: Math.min(W, H) * (0.024 + Math.random() * 0.007),
      phase: Math.random() * TAU,
      // every tang has a little clownfish friend swimming with it
      buddy: { s: Math.min(W, H) * (0.015 + Math.random() * 0.004), phase: Math.random() * TAU },
    }));

    // A small reef crab working the sand
    CRAB = { x: W * 0.42, dir: 1, s: Math.min(W, H) * 0.016, phase: Math.random() * TAU };

    // A pufferfish that balloons up on schedule
    PUFFER = {
      x: W * 0.7, y: H * 0.55, vx: 0.3,
      s: Math.min(W, H) * 0.034,
      phase: Math.random() * TAU,
      puffStart: null, nextPuffAt: null,
    };

    // An inseparable pair of butterflyfish, heart and all
    BUTTERS = {
      x: W * 0.35, baseY: H * 0.44, vx: 0.4,
      s: Math.min(W, H) * 0.023,
      phase: Math.random() * TAU,
      fa: {}, fb: {},                  // per-fish poop state
    };

    // A sunken treasure chest that creaks open every few minutes (and on click)
    CHEST = {
      x: W * 0.68, s: Math.min(W, H) * 0.045,
      openStart: null, nextOpenAt: null, coins: [],
    };

    // Passing giants: a blue whale ~20× the dolphin gliding past the surface
    // every few minutes, and an orca ~5× the dolphin cruising by now and then
    WHALE = { active: false, nextAt: null, x: 0, y: 0, dir: 1, s: 0, phase: Math.random() * TAU };
    ORCA  = { active: false, nextAt: null, x: 0, y: 0, dir: 1, s: 0, phase: Math.random() * TAU };

    FXBUB = [];
    FXHEARTS = [];
    FXPUFF = [];     // white blow-mist puffs (dolphin breaths)
    FXRINGS = [];    // dolphin bubble rings
    nextFishActAt = null;
  }

  // ── Static layer (prerendered once per resize) ─────────────────────────────
  function buildStaticLayers() {
    staticLayer = makeLayer();
    vigLayer = makeLayer();
    paintScene(staticLayer.cx);
    paintVignette(vigLayer.cx);
  }

  function paintScene(c) {
    // Clear tropical water — green-tinged near the surface where sunlight
    // scatters, settling into blue with depth
    c.fillStyle = lg(c, 0, 0, 0, H, [
      [0,    '#9adfe4'],
      [0.15, '#5cc4d8'],
      [0.35, '#2fa3c8'],
      [0.60, '#1b7fb2'],
      [0.85, '#11649a'],
      [1,    '#0c5488'],
    ]);
    c.fillRect(0, 0, W, H);

    // Sun bloom overhead
    c.fillStyle = rg(c, W * 0.48, -H * 0.12, 0, H * 0.85, [
      [0,    'rgba(250, 252, 230, 0.45)'],
      [0.35, 'rgba(200, 240, 250, 0.13)'],
      [1,    'rgba(160, 225, 250, 0)'],
    ]);
    c.fillRect(0, 0, W, H);

    // Distant reef structure dissolving into blue haze
    c.fillStyle = 'rgba(22, 95, 145, 0.45)';
    [[0.30, 0.10], [0.50, 0.13], [0.68, 0.09]].forEach(([fx, fh]) => {
      const bx = W * fx, bh = H * fh, by = H * 0.88;
      c.beginPath();
      c.moveTo(bx - bh * 1.3, by);
      c.quadraticCurveTo(bx - bh * 0.4, by - bh, bx + bh * 0.2, by - bh * 0.8);
      c.quadraticCurveTo(bx + bh * 0.9, by - bh * 1.05, bx + bh * 1.4, by);
      c.closePath();
      c.fill();
    });

    // Depth haze pooling near the bottom — distant water, not darkness
    c.fillStyle = lg(c, 0, H * 0.55, 0, H * 0.88, [
      [0, 'rgba(16, 95, 150, 0)'],
      [1, 'rgba(16, 95, 150, 0.22)'],
    ]);
    c.fillRect(0, H * 0.55, W, H * 0.33);

    // ── Coral sand ──
    c.fillStyle = lg(c, 0, H * 0.84, 0, H, [
      [0,    '#e8d6ac'],
      [0.45, '#c4a878'],
      [1,    '#937450'],
    ]);
    c.fill(sandPath);

    // Ripple combing
    c.strokeStyle = 'rgba(140, 105, 62, 0.26)';
    c.lineWidth = 1.4;
    for (let row = 0; row < 6; row++) {
      const ry = H * (0.895 + row * 0.016);
      c.beginPath();
      for (let x = -20; x <= W + 20; x += 16) {
        const y = ry + Math.sin(x * 0.045 + row * 2.1) * 2.6;
        x === -20 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    // Coral rubble, pebbles, shell grit
    for (let i = 0; i < 34; i++) {
      const px = Math.random() * W;
      const py = sandTopAt(px) + 8 + Math.random() * (H - sandTopAt(px) - 14);
      c.fillStyle = `rgba(${165 + Math.random() * 60 | 0}, ${135 + Math.random() * 50 | 0}, ${95 + Math.random() * 30 | 0}, 0.55)`;
      c.beginPath();
      c.ellipse(px, py, 1.2 + Math.random() * 2.8, 0.9 + Math.random() * 1.6, Math.random(), 0, TAU);
      c.fill();
    }

    // ── Reef rock, then the coral community ──
    OUTCROPS.forEach(o => paintOutcrop(c, o));

    // Bommie A — staghorn thicket, sea fan, sponges
    paintStaghorn(c, OUTCROPS[0].x - OUTCROPS[0].w * 0.42, OUTCROPS[0].topY + 8, H * 0.115, '#c89858');
    paintSeaFan(c,   OUTCROPS[0].x + OUTCROPS[0].w * 0.42, OUTCROPS[0].topY + 8, H * 0.125, '#b8385c');
    paintSponges(c,  OUTCROPS[0].x - OUTCROPS[0].w * 0.78, sandTopAt(OUTCROPS[0].x - OUTCROPS[0].w * 0.78) + 4, H * 0.075, '#8a62b8');

    // Bommie B — sea fan, plate coral, sponges
    paintSeaFan(c,   OUTCROPS[1].x - OUTCROPS[1].w * 0.40, OUTCROPS[1].topY + 8, H * 0.105, '#c44a78');
    paintPlate(c,    OUTCROPS[1].x + OUTCROPS[1].w * 0.40, OUTCROPS[1].topY + 8, H * 0.055, '#caa05e');
    paintSponges(c,  OUTCROPS[1].x + OUTCROPS[1].w * 0.85, sandTopAt(OUTCROPS[1].x + OUTCROPS[1].w * 0.85) + 4, H * 0.065, '#9a6aae');

    // Coral garden across the sand flat
    paintTable(c,    W * 0.305, sandTopAt(W * 0.305) + 4, H * 0.085, '#cf9a72');
    paintBrain(c,    W * 0.395, sandTopAt(W * 0.395) + 4, H * 0.052, '#aa9a58');
    paintStaghorn(c, W * 0.475, sandTopAt(W * 0.475) + 4, H * 0.095, '#b888c0');
    paintSoft(c,     W * 0.635, sandTopAt(W * 0.635) + 4, H * 0.060, '#dcc294');
    paintBrain(c,    W * 0.715, sandTopAt(W * 0.715) + 4, H * 0.045, '#9ba662');
    paintTable(c,    W * 0.92,  sandTopAt(W * 0.92) + 4,  H * 0.07,  '#c2a06a');
    paintSeaFan(c,   W * 0.355, sandTopAt(W * 0.355) + 4, H * 0.08,  '#7a4ea0');

    // Sea stars on the open sand
    paintStarfish(c, W * 0.245, H * 0.945, Math.min(W, H) * 0.016, '#d8703a', 0.3);
    paintStarfish(c, W * 0.785, H * 0.952, Math.min(W, H) * 0.014, '#b84e60', -0.6);
  }

  function paintOutcrop(c, o) {
    const baseY = sandTopAt(o.x) + 10;
    // Weathered limestone with algae film
    c.fillStyle = lg(c, o.x, o.topY, o.x, baseY, [
      [0, '#8a8070'],
      [0.45, '#6e6456'],
      [1, '#4c4438'],
    ]);
    c.beginPath();
    c.moveTo(o.x - o.w, baseY);
    c.quadraticCurveTo(o.x - o.w * 0.85, o.topY + (baseY - o.topY) * 0.35, o.x - o.w * 0.45, o.topY + 6);
    c.quadraticCurveTo(o.x, o.topY - 10, o.x + o.w * 0.5, o.topY + 10);
    c.quadraticCurveTo(o.x + o.w * 0.9, o.topY + (baseY - o.topY) * 0.45, o.x + o.w, baseY);
    c.closePath();
    c.fill();
    // Sunlit crown with crustose algae — pink and green films real rock carries
    c.strokeStyle = 'rgba(225, 200, 215, 0.30)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(o.x - o.w * 0.45, o.topY + 6);
    c.quadraticCurveTo(o.x, o.topY - 10, o.x + o.w * 0.5, o.topY + 10);
    c.stroke();
    for (let i = 0; i < 10; i++) {
      const fx = o.x + (Math.random() - 0.5) * o.w * 1.4;
      const fy = o.topY + 12 + Math.random() * (baseY - o.topY - 18);
      c.fillStyle = Math.random() < 0.5 ? 'rgba(190, 120, 140, 0.22)' : 'rgba(120, 150, 90, 0.22)';
      c.beginPath();
      c.ellipse(fx, fy, 3 + Math.random() * 7, 2 + Math.random() * 4, Math.random(), 0, TAU);
      c.fill();
    }
    // Shadowed underhang
    c.fillStyle = 'rgba(20, 25, 30, 0.30)';
    c.beginPath();
    c.ellipse(o.x, baseY - 2, o.w * 0.95, 7, 0, 0, Math.PI);
    c.fill();
  }

  function coralShadow(c, x, y, r) {
    c.fillStyle = 'rgba(45, 55, 70, 0.28)';
    c.beginPath();
    c.ellipse(x, y + 3, r, r * 0.16, 0, 0, TAU);
    c.fill();
  }

  // Staghorn acropora — branching antlers with pale growth tips
  function paintStaghorn(c, x, base, size, col) {
    coralShadow(c, x, base, size * 0.6);
    c.lineCap = 'round';
    (function branch(x1, y1, ang, len, depth) {
      if (depth <= 0 || len < 3) return;
      const x2 = x1 + Math.cos(ang) * len;
      const y2 = y1 + Math.sin(ang) * len;
      c.strokeStyle = shade(col, 0.72 + depth * 0.1);
      c.lineWidth = Math.max(1.2, depth * size * 0.035);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      // polyp stipple along the branch
      c.fillStyle = 'rgba(255, 248, 235, 0.30)';
      for (let i = 0.25; i < 1; i += 0.25) {
        c.beginPath();
        c.arc(x1 + (x2 - x1) * i, y1 + (y2 - y1) * i, Math.max(0.7, depth * size * 0.012), 0, TAU);
        c.fill();
      }
      // pale axial growth tip
      if (depth === 1) {
        c.fillStyle = 'rgba(245, 240, 225, 0.85)';
        c.beginPath();
        c.arc(x2, y2, Math.max(1.2, size * 0.035), 0, TAU);
        c.fill();
      }
      branch(x2, y2, ang - 0.38 - Math.random() * 0.14, len * 0.74, depth - 1);
      branch(x2, y2, ang + 0.38 + Math.random() * 0.14, len * 0.74, depth - 1);
    })(x, base, -Math.PI / 2 + (Math.random() - 0.5) * 0.2, size * 0.48, 4);
  }

  // Table acropora — a flat plate on a stout pedestal
  function paintTable(c, x, base, size, col) {
    coralShadow(c, x, base, size * 1.3);
    // pedestal
    c.fillStyle = shade(col, 0.6);
    c.beginPath();
    c.moveTo(x - size * 0.16, base);
    c.lineTo(x - size * 0.10, base - size * 0.5);
    c.lineTo(x + size * 0.10, base - size * 0.5);
    c.lineTo(x + size * 0.16, base);
    c.closePath();
    c.fill();
    // tabletop, slightly domed
    const ty = base - size * 0.55;
    c.fillStyle = lg(c, x, ty - size * 0.16, x, ty + size * 0.1, [
      [0, shade(col, 1.18)],
      [1, shade(col, 0.72)],
    ]);
    c.beginPath();
    c.ellipse(x, ty, size * 1.5, size * 0.24, 0, 0, TAU);
    c.fill();
    // shadow under the rim
    c.fillStyle = 'rgba(40, 35, 30, 0.25)';
    c.beginPath();
    c.ellipse(x, ty + size * 0.1, size * 1.42, size * 0.14, 0, 0, Math.PI);
    c.fill();
    // branchlet texture across the top
    c.fillStyle = 'rgba(255, 246, 230, 0.40)';
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU, rr = Math.sqrt(Math.random());
      c.beginPath();
      c.arc(x + Math.cos(a) * rr * size * 1.35, ty - size * 0.04 + Math.sin(a) * rr * size * 0.16, 0.9 + Math.random() * 0.8, 0, TAU);
      c.fill();
    }
  }

  // Brain coral — weathered dome scored with meandering valleys
  function paintBrain(c, x, base, size, col) {
    coralShadow(c, x, base, size * 1.4);
    c.fillStyle = rg(c, x - size * 0.5, base - size * 1.0, 0, size * 2.5, [
      [0, shade(col, 1.22)],
      [0.6, col],
      [1, shade(col, 0.62)],
    ]);
    c.beginPath();
    c.ellipse(x, base - size * 0.35, size * 1.4, size * 0.95, 0, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(55, 50, 25, 0.45)';
    c.lineWidth = Math.max(1.2, size * 0.05);
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      const cy = base - size * 0.95 + i * size * 0.22;
      const span = Math.sqrt(Math.max(0, 1 - Math.pow((i - 2.5) / 3.2, 2)));
      for (let j = 0; j <= 9; j++) {
        const px = x - size * 1.25 * span + j * size * 0.28 * span;
        const py = cy + Math.sin(j * 1.6 + i * 1.1) * size * 0.08;
        j === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.stroke();
    }
  }

  // Gorgonian sea fan — a lattice of fine branches in one plane
  function paintSeaFan(c, x, base, size, col) {
    coralShadow(c, x, base, size * 0.7);
    c.lineCap = 'round';
    // translucent membrane hinted behind the lattice
    c.fillStyle = rgba(col, 0.16);
    c.beginPath();
    c.ellipse(x, base - size * 0.1, size * 0.85, size, 0, Math.PI * 1.04, -Math.PI * 0.04);
    c.fill();
    // radial ribs
    c.strokeStyle = rgba(col, 0.85);
    for (let i = -4; i <= 4; i++) {
      const a = Math.PI / 2 + i * 0.17;
      c.lineWidth = i === 0 ? size * 0.035 : size * 0.022;
      c.beginPath();
      c.moveTo(x, base);
      c.quadraticCurveTo(
        x - Math.cos(a) * size * 0.32, base - Math.sin(a) * size * 0.55,
        x - Math.cos(a) * size * 0.82, base - Math.sin(a) * size * 0.98
      );
      c.stroke();
    }
    // concentric cross-links forming the mesh
    c.strokeStyle = rgba(col, 0.55);
    c.lineWidth = size * 0.014;
    for (let r = 0.3; r <= 0.96; r += 0.16) {
      c.beginPath();
      c.ellipse(x, base, size * 0.85 * r, size * r, 0, Math.PI * 1.04, -Math.PI * 0.04);
      c.stroke();
    }
    // holdfast
    c.fillStyle = shade(col, 0.5);
    c.beginPath();
    c.ellipse(x, base, size * 0.12, size * 0.05, 0, 0, TAU);
    c.fill();
  }

  // Cluster of tube sponges
  function paintSponges(c, x, base, size, col) {
    coralShadow(c, x, base, size * 0.55);
    for (let i = 0; i < 4; i++) {
      const tx = x + (i - 1.5) * size * 0.30;
      const th = size * (0.65 + Math.sin(i * 2.4) * 0.18 + 0.35);
      const r = size * (0.11 + (i % 2) * 0.03);
      c.fillStyle = lg(c, tx - r, 0, tx + r, 0, [
        [0, shade(col, 0.62)],
        [0.45, col],
        [1, shade(col, 1.22)],
      ]);
      c.beginPath();
      c.moveTo(tx - r, base);
      c.lineTo(tx - r * 0.85, base - th + r);
      c.arc(tx, base - th + r, r * 0.9, Math.PI, 0);
      c.lineTo(tx + r, base);
      c.closePath();
      c.fill();
      // osculum — the dark exhalant opening
      c.fillStyle = 'rgba(25, 12, 30, 0.6)';
      c.beginPath();
      c.ellipse(tx, base - th + r, r * 0.55, r * 0.28, 0, 0, TAU);
      c.fill();
      // pitted surface
      c.fillStyle = 'rgba(240, 230, 250, 0.18)';
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.arc(tx + (Math.random() - 0.5) * r * 1.2, base - Math.random() * (th - r), 0.8, 0, TAU);
        c.fill();
      }
    }
  }

  // Toadstool leather coral — stalk and wavy cap
  function paintSoft(c, x, base, size, col) {
    coralShadow(c, x, base, size * 1.0);
    c.fillStyle = shade(col, 0.78);
    c.beginPath();
    c.moveTo(x - size * 0.30, base);
    c.quadraticCurveTo(x - size * 0.22, base - size * 0.5, x - size * 0.42, base - size * 0.62);
    c.lineTo(x + size * 0.42, base - size * 0.62);
    c.quadraticCurveTo(x + size * 0.22, base - size * 0.5, x + size * 0.30, base);
    c.closePath();
    c.fill();
    // undulating cap
    c.fillStyle = lg(c, x, base - size * 1.05, x, base - size * 0.5, [
      [0, shade(col, 1.15)],
      [1, shade(col, 0.8)],
    ]);
    c.beginPath();
    c.moveTo(x - size * 0.95, base - size * 0.60);
    for (let i = 0; i <= 8; i++) {
      const fx = x - size * 0.95 + (i / 8) * size * 1.9;
      const fy = base - size * (0.60 + Math.sin(i * 1.9) * 0.10 + Math.sin((i / 8) * Math.PI) * 0.38);
      c.quadraticCurveTo(fx - size * 0.1, fy - size * 0.06, fx, fy);
    }
    c.closePath();
    c.fill();
    // fine polyp fuzz on the cap
    c.fillStyle = 'rgba(255, 250, 235, 0.35)';
    for (let i = 0; i < 18; i++) {
      const fx = x + (Math.random() - 0.5) * size * 1.7;
      const fy = base - size * (0.62 + Math.random() * 0.32);
      c.beginPath();
      c.arc(fx, fy, 0.8, 0, TAU);
      c.fill();
    }
  }

  // Plate (lettuce) coral on rock
  function paintPlate(c, x, base, size, col) {
    for (let i = 2; i >= 0; i--) {
      const py = base - i * size * 0.42 - size * 0.12;
      const pr = size * (1.15 - i * 0.28);
      c.fillStyle = lg(c, x, py - size * 0.18, x, py + size * 0.1, [
        [0, shade(col, 1.18)],
        [1, shade(col, 0.68)],
      ]);
      c.beginPath();
      c.ellipse(x, py, pr, pr * 0.32, 0, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(70, 55, 35, 0.35)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, py + 1, pr * 0.94, pr * 0.27, 0, 0, Math.PI);
      c.stroke();
    }
  }

  function paintStarfish(c, x, y, size, col, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = 'rgba(110, 75, 40, 0.28)';
    c.beginPath();
    c.ellipse(0, size * 0.25, size * 1.1, size * 0.4, 0, 0, TAU);
    c.fill();
    c.fillStyle = lg(c, 0, -size, 0, size, [[0, shade(col, 1.18)], [1, shade(col, 0.72)]]);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.48;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    // ossicle bumps down each arm
    c.fillStyle = 'rgba(255, 235, 210, 0.45)';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      for (let d = 0.3; d <= 0.8; d += 0.25) {
        c.beginPath();
        c.arc(Math.cos(a) * size * d, Math.sin(a) * size * d, size * 0.05, 0, TAU);
        c.fill();
      }
    }
    c.restore();
  }

  function paintVignette(c) {
    c.fillStyle = rg(c, W / 2, H * 0.42, Math.min(W, H) * 0.5, Math.max(W, H) * 0.85, [
      [0, 'rgba(10, 60, 110, 0)'],
      [0.75, 'rgba(10, 60, 110, 0.10)'],
      [1, 'rgba(8, 45, 90, 0.28)'],
    ]);
    c.fillRect(0, 0, W, H);
  }

  // ── Dynamic light ──────────────────────────────────────────────────────────
  function drawSurface(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let band = 0; band < 3; band++) {
      const baseY = H * (0.022 + band * 0.028);
      ctx.strokeStyle = `rgba(240, 252, 255, ${0.26 - band * 0.08})`;
      ctx.lineWidth = 3 - band * 0.7;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 18) {
        const y = baseY + Math.sin(x * 0.018 + t * (1.2 + band * 0.3)) * 5 + Math.sin(x * 0.045 - t * 0.8) * 2.5;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRays(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of RAYS) {
      r.phase += 0.005 * r.speed;
      const a = 0.045 + 0.05 * Math.abs(Math.sin(r.phase));
      const drift = Math.sin(t * 0.15 + r.phase) * W * 0.02;
      const yEnd = H * 0.85;
      const g = ctx.createLinearGradient(r.x, 0, r.x + r.skew, yEnd);
      g.addColorStop(0,   `rgba(252, 250, 230, ${a.toFixed(3)})`);
      g.addColorStop(0.7, `rgba(220, 245, 255, ${(a * 0.35).toFixed(3)})`);
      g.addColorStop(1,   'rgba(210, 240, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r.x - r.width * 0.5 + drift, 0);
      ctx.lineTo(r.x + r.width * 0.5 + drift, 0);
      ctx.lineTo(r.x + r.skew + r.width * 0.22 + drift, yEnd);
      ctx.lineTo(r.x + r.skew - r.width * 0.22 + drift, yEnd);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCaustics(t) {
    ctx.save();
    ctx.clip(sandPath);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 16; k++) {
      const cx = ((k / 16) * W + t * 26 + Math.sin(t * 0.8 + k) * 28) % (W + 120) - 60;
      const cy = H * 0.895 + ((k * 53) % (H * 0.09));
      const rx = 26 + (k * 19) % 36;
      const a = 0.06 + 0.06 * Math.sin(t * 1.6 + k * 2.2);
      ctx.strokeStyle = `rgba(225, 250, 255, ${Math.max(0, a)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rx * 0.32, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Particles ──────────────────────────────────────────────────────────────
  function drawMotes(t) {
    for (const p of MOTES) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > W + 4) p.x = -4;
      if (p.y > H + 4) p.y = -4;
      const a = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.1 + p.phase));
      ctx.fillStyle = `rgba(230, 245, 250, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(t * 0.4 + p.phase) * 6, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawBubbles(t) {
    for (const b of BUBBLES) {
      b.y += b.vy;
      if (b.y < -10) {
        b.y = sandTopAt(b.sx) - 4;
        b.x = b.sx + (Math.random() - 0.5) * 20;
      }
      const x = b.x + Math.sin(t * 2 + b.sway) * 5;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, TAU);
      ctx.fillStyle = 'rgba(225, 248, 255, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(240, 252, 255, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, TAU);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
  }

  // ── Flora ──────────────────────────────────────────────────────────────────
  function drawKelp(t) {
    ctx.lineCap = 'round';
    for (const s of KELP) {
      const baseY = sandTopAt(s.x) + 4;
      const segs = 13;
      // stipe
      ctx.strokeStyle = s.hue;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.x, baseY);
      const pts = [];
      for (let i = 1; i <= segs; i++) {
        const fr = i / segs;
        const y = baseY - s.h * fr;
        const sway = Math.sin(t * 1.1 + s.x * 0.008 + i * 0.32) * fr * 20;
        pts.push([s.x + sway, y]);
        ctx.lineTo(s.x + sway, y);
      }
      ctx.stroke();
      // blades hanging off alternate segments
      ctx.fillStyle = rgba('#6a8c42', 0.85);
      for (let i = 2; i < segs; i += 2) {
        const [bx, by] = pts[i - 1];
        const dir = i % 4 === 0 ? 1 : -1;
        const flutter = Math.sin(t * 1.5 + i + s.x) * 0.18;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(dir * (0.9 + flutter));
        ctx.beginPath();
        ctx.ellipse(s.h * 0.075, 0, s.h * 0.085, s.h * 0.022, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawGrass(t) {
    ctx.lineCap = 'round';
    for (const g of GRASS) {
      const baseY = sandTopAt(g.x) + 3;
      for (const b of g.blades) {
        const sway = Math.sin(t * 1.2 + b.phase) * b.len * 0.18;
        ctx.strokeStyle = b.hue;
        ctx.lineWidth = b.w;
        ctx.beginPath();
        ctx.moveTo(g.x + b.dx, baseY);
        ctx.quadraticCurveTo(
          g.x + b.dx + b.lean * b.len * 0.4,
          baseY - b.len * 0.6,
          g.x + b.dx + b.lean * b.len + sway,
          baseY - b.len
        );
        ctx.stroke();
      }
    }
  }

  // ── Anemone & clownfish ────────────────────────────────────────────────────
  // Drawn in two passes so the fish can tuck in between the tentacles
  function drawAnemone(a, t, front) {
    if (!front) {
      // fleshy column
      ctx.fillStyle = lg(ctx, a.x, a.y - a.s * 0.45, a.x, a.y + a.s * 0.2, [
        [0, shade(a.base, 1.15)],
        [1, shade(a.base, 0.65)],
      ]);
      ctx.beginPath();
      ctx.ellipse(a.x, a.y - a.s * 0.12, a.s * 0.62, a.s * 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(a.base, 0.5);
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + a.s * 0.05, a.s * 0.72, a.s * 0.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    for (const tn of a.tents) {
      if (tn.front !== front) continue;
      const rootX = a.x + tn.dx * a.s * 0.55;
      const rootY = a.y - a.s * 0.18;
      const sway = Math.sin(t * 1.5 + tn.phase) * a.s * 0.15;
      const breathe = 1 + 0.06 * Math.sin(t * 1.0 + tn.phase * 0.7);
      const tipX = rootX + tn.dx * a.s * 0.55 + sway;
      const tipY = a.y - tn.len * breathe - a.s * 0.18;
      const col = front ? a.tcol : shade(a.tcol, 0.74);
      ctx.strokeStyle = col;
      ctx.lineWidth = a.s * 0.085;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.quadraticCurveTo(rootX + tn.dx * a.s * 0.28, (rootY + tipY) / 2, tipX, tipY);
      ctx.stroke();
      // the swollen bubble tip
      ctx.fillStyle = front ? a.tip : shade(a.tip, 0.78);
      ctx.beginPath();
      ctx.arc(tipX, tipY, a.s * 0.085, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 250, 250, 0.45)';
      ctx.beginPath();
      ctx.arc(tipX - a.s * 0.025, tipY - a.s * 0.025, a.s * 0.03, 0, TAU);
      ctx.fill();
    }
  }

  function drawNemo(n, t) {
    const a = n.home;
    // Bobbing and weaving inside the host's tentacle crown
    let px = a.x + Math.cos(t * n.w1 + n.phase) * a.s * 0.55;
    let py = a.y - a.s * 0.78 + Math.sin(t * n.w2 + n.phase) * a.s * 0.30;
    let facing = -Math.sin(t * n.w1 + n.phase) >= 0 ? 1 : -1;
    let rot = Math.cos(t * n.w2 + n.phase) * 0.10;
    // scheduler → ducks down between the tentacles, then peeks back out
    if (n.hideT != null) {
      const p = (t - n.hideT) / 1.6;
      if (p >= 1) n.hideT = null;
      else py += Math.sin(Math.min(1, p) * Math.PI) * a.s * 0.6;
    }
    // clicked → darts OUT of the anemone, loops around outside, swims back home
    if (n.outT != null) {
      const p = (t - n.outT) / 3.2;
      if (p >= 1) n.outT = null;
      else {
        const k = Math.sin(Math.min(1, p) * Math.PI);          // out, then back
        px += n.outDir * k * a.s * 2.6;
        py += -Math.sin(Math.min(1, p) * TAU) * a.s * 1.4;     // rises, dips, returns
        facing = Math.cos(p * Math.PI) >= 0 ? n.outDir : -n.outDir;  // faces his motion
        rot = -Math.cos(Math.min(1, p) * TAU) * 0.18 * n.outDir;
      }
    }
    drawClown(px, py, facing, rot, n.s, t, n.phase);
    // anemone dwellers are fish too
    updatePoop(n, px - facing * n.s * 0.85, py + n.s * 0.25, t, Math.max(1.2, n.s * 0.07));
  }

  // A clownfish drawn anywhere — used by the anemone dwellers and the
  // free swimmers tagging along with the tangs
  function drawClown(px, py, facing, rot, s, t, phase) {
    const wag = Math.sin(t * 8 + phase) * 0.4;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing, 1);
    ctx.rotate(rot);

    const ORANGE = '#ef7615', DARK = '#241204';

    // Rounded caudal fin (ocellaris tails are paddles, not forks)
    ctx.save();
    ctx.translate(-s * 0.88, 0);
    ctx.rotate(wag * 0.35);
    ctx.fillStyle = rgba(ORANGE, 0.92);
    ctx.strokeStyle = DARK;
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.16);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.34, -s * 0.62, 0);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.34, 0, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Body — deep orange, slightly paler below
    ctx.fillStyle = lg(ctx, 0, -s * 0.55, 0, s * 0.55, [
      [0, '#f8881e'],
      [0.6, ORANGE],
      [1, '#d8650c'],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.56, 0, 0, TAU);
    ctx.fill();

    // Dorsal fin — low and long with the characteristic mid-notch
    ctx.fillStyle = rgba(ORANGE, 0.95);
    ctx.strokeStyle = DARK;
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.46);
    ctx.quadraticCurveTo(s * 0.25, -s * 0.78, s * 0.02, -s * 0.62);
    ctx.quadraticCurveTo(-s * 0.12, -s * 0.74, -s * 0.48, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Anal + pelvic fins
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.32, s * 0.74, -s * 0.55, s * 0.40);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.46);
    ctx.quadraticCurveTo(s * 0.12, s * 0.74, -s * 0.05, s * 0.46);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Three white bars, each rimmed in black — the middle one bulges forward
    ctx.fillStyle = '#f6f4ee';
    ctx.strokeStyle = DARK;
    ctx.lineWidth = s * 0.035;
    // head bar
    ctx.beginPath();
    ctx.ellipse(s * 0.46, 0, s * 0.115, s * 0.46, 0.05, 0, TAU);
    ctx.fill(); ctx.stroke();
    // middle bar with the forward point
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.30, -s * 0.18, s * 0.10, 0);
    ctx.quadraticCurveTo(s * 0.30, s * 0.18, -s * 0.02, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.24, s * 0.28, -s * 0.24, 0);
    ctx.quadraticCurveTo(-s * 0.24, -s * 0.28, -s * 0.02, -s * 0.55);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // peduncle bar
    ctx.beginPath();
    ctx.ellipse(-s * 0.78, 0, s * 0.085, s * 0.26, 0, 0, TAU);
    ctx.fill(); ctx.stroke();

    // Pectoral fin paddling
    ctx.save();
    ctx.translate(s * 0.22, s * 0.08);
    ctx.rotate(0.4 + wag * 0.55);
    ctx.fillStyle = 'rgba(248, 150, 50, 0.85)';
    ctx.strokeStyle = rgba(DARK, 0.6);
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 0.10, s * 0.22, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Big sweet eye with a sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.60, -s * 0.16, s * 0.16, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90, 45, 8, 0.45)';
    ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.arc(s * 0.60, -s * 0.16, s * 0.16, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#1c1208';
    ctx.beginPath(); ctx.arc(s * 0.64, -s * 0.15, s * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.67, -s * 0.19, s * 0.034, 0, TAU); ctx.fill();
    // Little smile
    ctx.strokeStyle = '#5c2c08';
    ctx.lineWidth = s * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.95, s * 0.10);
    ctx.quadraticCurveTo(s * 0.80, s * 0.22, s * 0.62, s * 0.20);
    ctx.stroke();

    ctx.restore();
  }

  // ── Creatures ──────────────────────────────────────────────────────────────
  // Every so often a fish relieves itself — a thin brown strand trails from
  // the vent, breaks off, then sinks and dissolves. Nature is nature.
  function updatePoop(f, vx, vy, t, w) {
    // each fish goes once every 3 minutes; first times are staggered so
    // the whole reef doesn't go at once
    if (!f.poopAt) f.poopAt = t + Math.random() * 180;
    let p = f.poop;
    if (!p) {
      if (t > f.poopAt) f.poop = { pts: [{ x: vx, y: vy }], detachT: t + 2.5 + Math.random() * 2, fade: 1 };
      return;
    }
    if (p.detachT !== null) {
      const last = p.pts[p.pts.length - 1];
      const jump = Math.hypot(vx - last.x, vy - last.y);
      if (jump > 80) {
        p.detachT = null;                       // fish wrapped around the screen — let go
      } else if (jump > 4) {
        p.pts.push({ x: vx, y: vy });
        if (p.pts.length > 18) p.pts.shift();   // old bits crumble away
      }
      if (p.detachT !== null && t > p.detachT) p.detachT = null;
    }
    if (p.detachT === null) {
      p.fade -= 0.006;
      for (const pt of p.pts) {
        pt.y += 0.35;
        pt.x += Math.sin(t * 1.5 + pt.y * 0.05) * 0.08;
      }
      if (p.fade <= 0 || p.pts.length < 2) {
        f.poop = null;
        f.poopAt = t + 180;
        return;
      }
    }
    ctx.strokeStyle = `rgba(108, 74, 38, ${(0.7 * p.fade).toFixed(3)})`;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    p.pts.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
    ctx.stroke();
    // the fresh bit still emerging
    if (p.detachT !== null) {
      ctx.fillStyle = `rgba(94, 62, 30, ${(0.8 * p.fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(vx, vy, w * 0.7, 0, TAU);
      ctx.fill();
    }
  }

  // ── Fish actions: dash, barrel roll, bubble puffs, hide, scatter ───────────
  // Triggered by clicks AND on a random schedule; envelopes keep motion smooth.
  function actEnv(t0, t, dur) {
    if (t0 == null) return 0;
    const p = (t - t0) / dur;
    if (p <= 0 || p >= 1) return 0;
    return p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
  }
  function dashBoost(f, t) { return 1 + 3.2 * actEnv(f.dashT, t, 1.1); }
  function rollAng(f, t) {
    if (f.rollT == null) return 0;
    const p = (t - f.rollT) / 0.9;
    if (p >= 1) { f.rollT = null; return 0; }
    return TAU * p * p * (3 - 2 * p);   // one eased full turn
  }
  function burstBubbles(x, y, n) {
    for (let i = 0; i < n; i++)
      FXBUB.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10,
                   r: 0.8 + Math.random() * 2.4, vy: 30 + Math.random() * 40,
                   sway: Math.random() * TAU, life: 1.4 + Math.random() * 0.8, age: 0 });
  }
  function drawFxBubbles(t, dt) {
    for (let i = FXBUB.length - 1; i >= 0; i--) {
      const b = FXBUB[i];
      b.age += dt;
      if (b.age >= b.life || b.y < -10) { FXBUB.splice(i, 1); continue; }
      b.y -= b.vy * dt;
      const x = b.x + Math.sin(t * 3 + b.sway) * 4;
      const a = 1 - b.age / b.life;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, TAU);
      ctx.fillStyle = `rgba(225, 248, 255, ${(0.14 * a).toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(240, 252, 255, ${(0.5 * a).toFixed(3)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  function heartsBurst(x, y, t) {
    for (let i = 0; i < 4; i++)
      FXHEARTS.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 16,
                      vy: 35 + Math.random() * 25, sway: Math.random() * TAU,
                      s: 5 + Math.random() * 4, born: t });
  }
  function drawFxHearts(t, dt) {
    for (let i = FXHEARTS.length - 1; i >= 0; i--) {
      const hh = FXHEARTS[i];
      const lifeP = (t - hh.born) / 2.4;
      if (lifeP >= 1) { FXHEARTS.splice(i, 1); continue; }
      hh.y -= hh.vy * dt;
      hh.x += Math.sin(t * 1.1 + hh.sway) * 14 * dt;
      ctx.globalAlpha = 0.9 * (1 - lifeP * lifeP);
      drawHeart(hh.x, hh.y, hh.s);
      ctx.globalAlpha = 1;
    }
  }
  function scatterSchool(cx, cy, t) {
    SCHOOL.scatterT = t;
    const lx = SCHOOL.leader.x, ly = SCHOOL.leader.y;
    for (const m of SCHOOL) {
      const dx = lx + m.ox - cx, dy = ly + m.oy - cy;
      const d = Math.hypot(dx, dy) || 1;
      const K = 70 + Math.random() * 70;
      m.kix = dx / d * K;
      m.kiy = dy / d * K * 0.6;
    }
  }
  // every clickable fish, at its live position — shared by clicks & the scheduler
  function fishTargets(t) {
    const list = [];
    for (const dp of DOLPHS)
      list.push({ f: dp, kind: 'dolphin', x: dp.x, y: dp.baseY + Math.sin(t * 1.2 + dp.phase) * 30,
                  rx: dp.s * 1.8, ry: dp.s * 0.9 });
    for (const sh of SHARKS)
      list.push({ f: sh, kind: 'shark', x: sh.x, y: sh.y + Math.sin(t * 0.7 + sh.phase) * 6,
                  rx: sh.s * 1.9, ry: sh.s * 0.95 });
    for (const d of DORIES) {
      const y = d.baseY + Math.sin(t * 0.8 + d.phase) * 26;
      const dir = d.vx > 0 ? 1 : -1;
      list.push({ f: d, kind: 'dory', x: d.x, y, rx: d.s * 1.5, ry: d.s * 1.0 });
      const b = d.buddy;
      list.push({ f: b, kind: 'buddy', x: d.x - dir * d.s * 2.4,
                  y: y + Math.sin(t * 1.4 + b.phase) * 10 + d.s * 0.5,
                  rx: b.s * 1.7, ry: b.s * 1.1 });
    }
    list.push({ f: PUFFER, kind: 'puffer', x: PUFFER.x,
                y: PUFFER.y + Math.sin(t * 0.9 + PUFFER.phase) * 8,
                rx: PUFFER.s * 1.9, ry: PUFFER.s * 1.5 });
    {
      const B = BUTTERS, dir = B.vx > 0 ? 1 : -1;
      const y = B.baseY + Math.sin(t * 0.7 + B.phase) * 18;
      list.push({ f: B.fa, kind: 'bfly', x: B.x + dir * B.s * 1.6,
                  y: y - B.s * 0.75 + Math.sin(t * 1.3 + B.phase) * 5, rx: B.s * 1.6, ry: B.s * 1.1 });
      list.push({ f: B.fb, kind: 'bfly', x: B.x - dir * B.s * 1.6,
                  y: y + B.s * 0.75 + Math.cos(t * 1.1 + B.phase) * 5, rx: B.s * 1.5, ry: B.s * 1.05 });
    }
    for (const n of NEMOS) {
      const a = n.home;
      list.push({ f: n, kind: 'nemo',
                  x: a.x + Math.cos(t * n.w1 + n.phase) * a.s * 0.55,
                  y: a.y - a.s * 0.78 + Math.sin(t * n.w2 + n.phase) * a.s * 0.30,
                  rx: n.s * 1.6, ry: n.s * 1.2 });
    }
    list.push({ f: SCHOOL, kind: 'school', x: SCHOOL.leader.x,
                y: SCHOOL.leader.y + Math.sin(t * 0.7) * 16, rx: 150, ry: 70 });
    return list;
  }
  // what each kind of fish does when poked (by a click or by the scheduler)
  function doFishAct(h, t, cx, cy) {
    burstBubbles(h.x, h.y, 5);                       // every reaction blows bubbles
    const f = h.f;
    switch (h.kind) {
      case 'school':  scatterSchool(cx == null ? h.x : cx, cy == null ? h.y : cy, t); break;
      case 'shark':   f.dashT = t; break;
      case 'dory':    if (Math.random() < 0.5) f.dashT = t;
                      else if (f.rollT == null) f.rollT = t; break;
      case 'dolphin': {
        const pick = Math.random();
        if (pick < 0.34 && f.rollT == null) f.rollT = t;
        else if (pick < 0.67) f.dashT = t;
        else FXRINGS.push({ x: h.x + (f.vx > 0 ? 1 : -1) * f.s * 1.4,
                            y: h.y - f.s * 0.2, t0: t });   // blows a bubble ring
        break;
      }
      case 'puffer':  if (PUFFER.puffStart === null && Math.random() < 0.6) {
                        PUFFER.puffStart = t; PUFFER.nextPuffAt = t + 120;
                      } else f.dashT = t; break;
      case 'bfly':    heartsBurst(h.x, h.y - 10, t); break;
      case 'nemo':    // a click sends him OUT of the anemone for a little loop;
                      // the random scheduler keeps the shy duck-and-hide
                      if (cx != null) {
                        if (f.outT == null && f.hideT == null) {
                          f.outT = t;
                          f.outDir = Math.random() < 0.5 ? -1 : 1;
                        }
                      } else if (f.hideT == null && f.outT == null) f.hideT = t;
                      break;
      case 'buddy':   burstBubbles(h.x, h.y, 6); break;
    }
  }

  function drawShark(sh, t) {
    const boost = dashBoost(sh, t);
    sh.x += sh.vx * boost;
    // a charging shark startles the fusilier school into scattering
    if (boost > 2 && SCHOOL.scatterT == null &&
        Math.abs(sh.x - SCHOOL.leader.x) < 170 && Math.abs(sh.y - SCHOOL.leader.y) < 120)
      scatterSchool(sh.x, sh.y, t);
    if (sh.vx > 0 && sh.x > W + sh.s * 4) { sh.x = -sh.s * 4; sh.y = H * (0.10 + Math.random() * 0.28); }
    if (sh.vx < 0 && sh.x < -sh.s * 4)    { sh.x = W + sh.s * 4; sh.y = H * (0.10 + Math.random() * 0.28); }
    const s = sh.s;
    const wag = Math.sin(t * 2.6 + sh.phase) * 0.3;
    const BLACK = '#1c2228';
    ctx.save();
    ctx.translate(sh.x, sh.y + Math.sin(t * 0.7 + sh.phase) * 6);
    ctx.scale(sh.vx > 0 ? 1 : -1, 1);

    // Slender fusiform body
    const body = new Path2D();
    body.moveTo(s * 1.75, -s * 0.02);
    body.quadraticCurveTo(s * 0.9, -s * 0.40, s * 0.1, -s * 0.36);
    body.quadraticCurveTo(-s * 0.8, -s * 0.28, -s * 1.45, -s * 0.06);
    body.quadraticCurveTo(-s * 0.8, s * 0.10, 0, s * 0.28);
    body.quadraticCurveTo(s * 1.0, s * 0.32, s * 1.75, -s * 0.02);
    body.closePath();

    // Caudal fin — long upper lobe, both tips dipped in black
    ctx.save();
    ctx.translate(-s * 1.42, -s * 0.03);
    ctx.rotate(wag * 0.45);
    ctx.fillStyle = shade(sh.hue, 0.92);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.03);
    ctx.quadraticCurveTo(-s * 0.42, -s * 0.40, -s * 0.66, -s * 0.60);
    ctx.quadraticCurveTo(-s * 0.30, -s * 0.16, -s * 0.16, -s * 0.02);
    ctx.quadraticCurveTo(-s * 0.30, s * 0.10, -s * 0.36, s * 0.30);
    ctx.quadraticCurveTo(-s * 0.14, s * 0.12, 0, s * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.beginPath();                                       // upper lobe tip
    ctx.moveTo(-s * 0.52, -s * 0.46);
    ctx.lineTo(-s * 0.66, -s * 0.60);
    ctx.lineTo(-s * 0.44, -s * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();                                       // lower lobe tip
    ctx.moveTo(-s * 0.30, s * 0.20);
    ctx.lineTo(-s * 0.36, s * 0.30);
    ctx.lineTo(-s * 0.24, s * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // First dorsal — tall, with the signature black tip over a pale band
    ctx.fillStyle = shade(sh.hue, 0.95);
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.80, -s * 0.16, -s * 0.82);
    ctx.quadraticCurveTo(-s * 0.20, -s * 0.55, -s * 0.40, -s * 0.31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dde6ec';
    ctx.beginPath();
    ctx.moveTo(s * 0.015, -s * 0.66);
    ctx.quadraticCurveTo(-s * 0.07, -s * 0.72, -s * 0.17, -s * 0.70);
    ctx.lineTo(-s * 0.18, -s * 0.62);
    ctx.quadraticCurveTo(-s * 0.06, -s * 0.64, s * 0.04, -s * 0.60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.moveTo(s * 0.01, -s * 0.67);
    ctx.quadraticCurveTo(-s * 0.04, -s * 0.81, -s * 0.16, -s * 0.82);
    ctx.lineTo(-s * 0.17, -s * 0.70);
    ctx.quadraticCurveTo(-s * 0.07, -s * 0.72, s * 0.01, -s * 0.67);
    ctx.closePath();
    ctx.fill();
    // Second dorsal, small
    ctx.fillStyle = shade(sh.hue, 0.9);
    ctx.beginPath();
    ctx.moveTo(-s * 0.95, -s * 0.20);
    ctx.quadraticCurveTo(-s * 1.08, -s * 0.40, -s * 1.18, -s * 0.38);
    ctx.lineTo(-s * 1.22, -s * 0.16);
    ctx.closePath();
    ctx.fill();

    // Body with countershading — grey back, white belly, soft boundary
    ctx.fillStyle = lg(ctx, 0, -s * 0.4, 0, s * 0.32, [
      [0, shade(sh.hue, 1.05)],
      [0.55, sh.hue],
      [0.72, shade(sh.hue, 1.25)],
      [0.82, '#e6edf2'],
      [1, '#eef4f8'],
    ]);
    ctx.fill(body);

    // Pectoral fin — black-tipped
    ctx.save();
    ctx.translate(s * 0.42, s * 0.18);
    ctx.rotate(0.5 + wag * 0.1);
    ctx.fillStyle = shade(sh.hue, 0.88);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.06, s * 0.48, -s * 0.16, s * 0.60);
    ctx.quadraticCurveTo(-s * 0.20, s * 0.24, -s * 0.30, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, s * 0.50);
    ctx.lineTo(-s * 0.16, s * 0.60);
    ctx.lineTo(-s * 0.18, s * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Five gill slits
    ctx.strokeStyle = shade(sh.hue, 0.66);
    ctx.lineWidth = s * 0.022;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.72 - i * 0.07), -s * 0.14);
      ctx.quadraticCurveTo(s * (0.67 - i * 0.07), s * 0.0, s * (0.72 - i * 0.07), s * 0.13);
      ctx.stroke();
    }

    // Underslung mouth — just a quiet line
    ctx.strokeStyle = shade(sh.hue, 0.5);
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.moveTo(s * 1.5, s * 0.10);
    ctx.quadraticCurveTo(s * 1.3, s * 0.17, s * 1.12, s * 0.16);
    ctx.stroke();

    // Small lateral eye
    ctx.fillStyle = '#dce4ea';
    ctx.beginPath(); ctx.arc(s * 1.34, -s * 0.13, s * 0.05, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10161c';
    ctx.beginPath(); ctx.arc(s * 1.345, -s * 0.13, s * 0.032, 0, TAU); ctx.fill();

    ctx.restore();

    // even sharks have to go sometimes
    const shY = sh.y + Math.sin(t * 0.7 + sh.phase) * 6;
    const shDir = sh.vx > 0 ? 1 : -1;
    updatePoop(sh, sh.x - shDir * s * 1.15, shY + s * 0.16, t, Math.max(2, s * 0.055));
  }

  function drawDolphin(d, t) {
    d.x += d.vx * dashBoost(d, t);
    if (d.vx > 0 && d.x > W + d.s * 5) { d.x = -d.s * 5; d.baseY = H * (0.08 + Math.random() * 0.27); }
    if (d.vx < 0 && d.x < -d.s * 5)    { d.x = W + d.s * 5; d.baseY = H * (0.08 + Math.random() * 0.27); }
    const s = d.s;
    const dir = d.vx > 0 ? 1 : -1;
    let y = d.baseY + Math.sin(t * 1.2 + d.phase) * 30;
    let pitch = -Math.cos(t * 1.2 + d.phase) * 0.22;   // nose follows the dive
    // every minute or so the dolphin rises to the surface for a breath
    if (d.nextBreathAt == null) d.nextBreathAt = t + 15 + Math.random() * 40;
    if (d.breathT0 == null && t >= d.nextBreathAt) {
      d.breathT0 = t; d.blew = false;
      d.nextBreathAt = t + 45 + Math.random() * 45;
    }
    if (d.breathT0 != null) {
      const p = (t - d.breathT0) / 6;
      if (p >= 1) d.breathT0 = null;
      else {
        const k = Math.sin(p * Math.PI);
        y += (H * 0.055 - y) * k;                      // long arc up to the surface
        pitch += -Math.cos(p * Math.PI) * 0.30;        // nose up rising, down diving
        if (!d.blew && p > 0.45) {                     // the blow, right at the top
          d.blew = true;
          burstBubbles(d.x + dir * s * 0.6, y - s * 0.4, 8);
          FXPUFF.push({ x: d.x + dir * s * 0.62, y: y - s * 0.55, t0: t });
          FXPUFF.push({ x: d.x + dir * s * 0.66, y: y - s * 0.95, t0: t + 0.1 });
        }
      }
    }
    const wag = Math.sin(t * 4.5 + d.phase) * 0.35;
    const GRAY = '#6b8092';
    ctx.save();
    ctx.translate(d.x, y);
    ctx.scale(dir, 1);
    ctx.rotate(pitch + rollAng(d, t));   // clicked → a full barrel roll

    // tail stock and flukes, pitching with the stroke
    ctx.save();
    ctx.translate(-s * 1.42, 0);
    ctx.rotate(wag * 0.5);
    ctx.fillStyle = shade(GRAY, 0.88);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.30, -s * 0.34, -s * 0.62, -s * 0.40);
    ctx.quadraticCurveTo(-s * 0.30, -s * 0.06, -s * 0.26, 0);
    ctx.quadraticCurveTo(-s * 0.30, s * 0.06, -s * 0.62, s * 0.40);
    ctx.quadraticCurveTo(-s * 0.30, s * 0.34, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // sleek body with melon and rostrum, countershaded
    const body = new Path2D();
    body.moveTo(s * 1.55, s * 0.02);
    body.quadraticCurveTo(s * 1.25, -s * 0.18, s * 0.9, -s * 0.30);
    body.quadraticCurveTo(s * 0.2, -s * 0.46, -s * 0.6, -s * 0.28);
    body.quadraticCurveTo(-s * 1.25, -s * 0.12, -s * 1.48, -s * 0.03);
    body.quadraticCurveTo(-s * 1.25, s * 0.06, -s * 0.6, s * 0.26);
    body.quadraticCurveTo(s * 0.3, s * 0.42, s * 1.1, s * 0.16);
    body.quadraticCurveTo(s * 1.4, s * 0.08, s * 1.55, s * 0.02);
    body.closePath();
    ctx.fillStyle = lg(ctx, 0, -s * 0.45, 0, s * 0.4, [
      [0, '#56697a'],
      [0.45, GRAY],
      [0.7, '#9fb2c0'],
      [0.85, '#e6eef4'],
      [1, '#f2f7fa'],
    ]);
    ctx.fill(body);

    // the famous dolphin smile
    ctx.strokeStyle = 'rgba(35, 48, 60, 0.55)';
    ctx.lineWidth = s * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 1.52, s * 0.04);
    ctx.quadraticCurveTo(s * 1.2, s * 0.14, s * 0.98, s * 0.10);
    ctx.stroke();

    // falcate dorsal fin
    ctx.fillStyle = shade(GRAY, 0.82);
    ctx.beginPath();
    ctx.moveTo(s * 0.30, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.10, -s * 0.78, -s * 0.18, -s * 0.72);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.5, -s * 0.34, -s * 0.33);
    ctx.closePath();
    ctx.fill();

    // pectoral flipper
    ctx.save();
    ctx.translate(s * 0.35, s * 0.20);
    ctx.rotate(0.55 + wag * 0.2);
    ctx.fillStyle = shade(GRAY, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.18, s * 0.10, s * 0.30, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // eye with a sparkle, and the blowhole
    ctx.fillStyle = '#101820';
    ctx.beginPath(); ctx.arc(s * 0.92, -s * 0.10, s * 0.045, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath(); ctx.arc(s * 0.935, -s * 0.115, s * 0.016, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(30, 42, 52, 0.7)';
    ctx.beginPath(); ctx.ellipse(s * 0.62, -s * 0.36, s * 0.05, s * 0.025, -0.2, 0, TAU); ctx.fill();

    ctx.restore();

    // dolphins answer nature's call too
    updatePoop(d, d.x - dir * s * 1.3, y + s * 0.18, t, Math.max(1.5, s * 0.06));
  }

  function drawDory(d, t) {
    d.x += d.vx * dashBoost(d, t);
    if (d.vx > 0 && d.x > W + d.s * 4) { d.x = -d.s * 4; d.baseY = H * (0.22 + Math.random() * 0.35); }
    if (d.vx < 0 && d.x < -d.s * 4)    { d.x = W + d.s * 4; d.baseY = H * (0.22 + Math.random() * 0.35); }
    const s = d.s;
    const y = d.baseY + Math.sin(t * 0.8 + d.phase) * 26;
    const wag = Math.sin(t * 5.5 + d.phase) * 0.3;
    const INK = '#0e1626';
    ctx.save();
    ctx.translate(d.x, y);
    const roll = rollAng(d, t);
    if (roll) ctx.rotate(d.vx > 0 ? -roll : roll);   // forward somersault
    ctx.scale(d.vx > 0 ? 1 : -1, 1);

    // Yellow caudal fin with dark upper/lower margins
    ctx.save();
    ctx.translate(-s * 0.92, 0);
    ctx.rotate(wag * 0.3);
    ctx.fillStyle = '#f4c812';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.18);
    ctx.lineTo(-s * 0.52, -s * 0.42);
    ctx.lineTo(-s * 0.36, 0);
    ctx.lineTo(-s * 0.52, s * 0.42);
    ctx.lineTo(0, s * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.055;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.18); ctx.lineTo(-s * 0.5, -s * 0.40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.18);  ctx.lineTo(-s * 0.5, s * 0.40);  ctx.stroke();
    ctx.restore();

    // Deep royal-blue disc body
    ctx.fillStyle = lg(ctx, 0, -s * 0.62, 0, s * 0.62, [
      [0, '#2750cc'],
      [0.55, '#1c3cb0'],
      [1, '#142a84'],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.05, s * 0.64, 0, 0, TAU);
    ctx.fill();

    // Long low dorsal and anal fins, dark
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.42);
    ctx.quadraticCurveTo(0, -s * 0.88, -s * 0.62, -s * 0.52);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.56, s * 0.55, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.46);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.82, -s * 0.62, s * 0.5);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.55, s * 0.3, s * 0.46);
    ctx.closePath();
    ctx.fill();

    // The black "palette" loop with the blue window inside it
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(s * 0.72, -s * 0.16);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.62, -s * 0.55, -s * 0.48);
    ctx.quadraticCurveTo(-s * 0.98, -s * 0.26, -s * 0.88, -s * 0.02);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.14, -s * 0.08, s * 0.06);
    ctx.quadraticCurveTo(s * 0.42, 0, s * 0.72, -s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d49c8';
    ctx.beginPath();
    ctx.ellipse(-s * 0.20, -s * 0.25, s * 0.40, s * 0.15, -0.18, 0, TAU);
    ctx.fill();

    // Yellow pectoral fin
    ctx.save();
    ctx.translate(s * 0.22, s * 0.10);
    ctx.rotate(0.35 + wag * 0.45);
    ctx.fillStyle = 'rgba(244, 200, 18, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.16, s * 0.12, s * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Big cheerful eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.16, s * 0.17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#13203a';
    ctx.beginPath(); ctx.arc(s * 0.63, -s * 0.15, s * 0.095, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.66, -s * 0.20, s * 0.035, 0, TAU); ctx.fill();
    // Little smile
    ctx.strokeStyle = '#101c36';
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.98, s * 0.08);
    ctx.quadraticCurveTo(s * 0.84, s * 0.20, s * 0.68, s * 0.18);
    ctx.stroke();

    ctx.restore();

    // A little clownfish pal swimming alongside
    const b = d.buddy;
    const dir = d.vx > 0 ? 1 : -1;
    const bx = d.x - dir * s * 2.4;
    const by = y + Math.sin(t * 1.4 + b.phase) * 10 + s * 0.5;
    drawClown(bx, by, dir, Math.sin(t * 1.4 + b.phase) * 0.08, b.s, t, b.phase);

    // occasional business, both for the tang and its little friend
    updatePoop(d, d.x - dir * s * 0.75, y + s * 0.30, t, Math.max(1.5, s * 0.07));
    updatePoop(b, bx - dir * b.s * 0.8, by + b.s * 0.28, t, Math.max(1.2, b.s * 0.07));
  }

  function drawSchool(t) {
    SCHOOL.leader.x += SCHOOL.leader.vx;
    if (SCHOOL.leader.x > W + 150) { SCHOOL.leader.x = -150; SCHOOL.leader.y = H * (0.16 + Math.random() * 0.42); }
    const lx = SCHOOL.leader.x, ly = SCHOOL.leader.y + Math.sin(t * 0.7) * 16;
    // a startled school bursts apart, then drifts back into formation
    let scF = 0;
    if (SCHOOL.scatterT != null) {
      scF = actEnv(SCHOOL.scatterT, t, 2.2);
      if (t - SCHOOL.scatterT >= 2.2) SCHOOL.scatterT = null;
    }
    for (const m of SCHOOL) {
      const wob = Math.sin(t * 3 + m.phase) * 5;
      const px = lx + m.ox + wob + (scF ? m.kix * scF : 0);
      const py = ly + m.oy + Math.cos(t * 2 + m.phase) * 4 + (scF ? m.kiy * scF : 0);
      const glint = 0.5 + 0.5 * Math.sin(t * 4 + m.phase * 2);
      ctx.fillStyle = `rgba(${185 + glint * 55 | 0}, ${205 + glint * 40 | 0}, ${220 + glint * 25 | 0}, 0.9)`;
      ctx.beginPath();
      ctx.ellipse(px, py, m.size, m.size * 0.38, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - m.size * 0.9, py);
      ctx.lineTo(px - m.size * 1.45, py - m.size * 0.45);
      ctx.lineTo(px - m.size * 1.45, py + m.size * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a2430';
      ctx.beginPath();
      ctx.arc(px + m.size * 0.55, py - m.size * 0.08, m.size * 0.14, 0, TAU);
      ctx.fill();
    }
  }

  function drawCrab(t) {
    const c = CRAB;
    c.x += c.dir * 0.3;
    if (c.x > W * 0.50) c.dir = -1;
    if (c.x < W * 0.30) c.dir = 1;
    const s = c.s;
    const y = sandTopAt(c.x) + s * 0.5;
    ctx.save();
    ctx.translate(c.x, y);

    ctx.strokeStyle = '#8e4524';
    ctx.lineWidth = s * 0.11;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const lift = Math.sin(t * 7 + c.phase + i * 2 + (side > 0 ? Math.PI : 0)) * s * 0.10;
        ctx.beginPath();
        ctx.moveTo(side * s * 0.48, s * 0.05);
        ctx.quadraticCurveTo(side * s * (0.82 + i * 0.12), s * 0.15, side * s * (0.95 + i * 0.17), s * 0.40 + lift);
        ctx.stroke();
      }
    }
    // Claws held low, twitching as it feeds
    for (let side = -1; side <= 1; side += 2) {
      const wave = Math.sin(t * 2.2 + c.phase + side) * s * 0.06;
      ctx.strokeStyle = '#8e4524';
      ctx.lineWidth = s * 0.13;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.42, -s * 0.05);
      ctx.quadraticCurveTo(side * s * 0.75, -s * 0.12, side * s * 0.85, -s * 0.26 + wave);
      ctx.stroke();
      ctx.fillStyle = '#a85530';
      ctx.beginPath();
      ctx.arc(side * s * 0.88, -s * 0.32 + wave, s * 0.16, 0, TAU);
      ctx.fill();
    }
    // Carapace
    ctx.fillStyle = lg(ctx, 0, -s * 0.4, 0, s * 0.3, [
      [0, '#b05a30'],
      [1, '#7e3a1c'],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 0.42, 0, 0, TAU);
    ctx.fill();
    // mottling
    ctx.fillStyle = 'rgba(60, 25, 12, 0.35)';
    [[-0.2, -0.1], [0.15, -0.18], [0.25, 0.05], [-0.05, 0.12]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(s * fx, s * fy, s * 0.06, 0, TAU);
      ctx.fill();
    });
    // Short eye stalks
    for (let side = -1; side <= 1; side += 2) {
      ctx.strokeStyle = '#7e3a1c';
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.16, -s * 0.3);
      ctx.lineTo(side * s * 0.20, -s * 0.48);
      ctx.stroke();
      ctx.fillStyle = '#241208';
      ctx.beginPath(); ctx.arc(side * s * 0.20, -s * 0.52, s * 0.07, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // A pufferfish that balloons up once every two minutes
  function drawPuffer(t) {
    const P = PUFFER;
    if (P.nextPuffAt === null) P.nextPuffAt = t + 15 + Math.random() * 30;
    if (P.puffStart === null && t >= P.nextPuffAt) {
      P.puffStart = t;
      P.nextPuffAt = t + 120;
    }
    let p = 0;
    if (P.puffStart !== null) {
      const e = t - P.puffStart;
      if (e < 0.9)      p = e / 0.9;
      else if (e < 4.5) p = 1;
      else if (e < 6.0) p = 1 - (e - 4.5) / 1.5;
      else P.puffStart = null;
      p = p * p * (3 - 2 * p);
    }

    P.x += P.vx * (1 - 0.85 * p) * dashBoost(P, t);  // a balloon can barely swim
    if (P.vx > 0 && P.x > W + P.s * 5) { P.x = -P.s * 5; P.y = H * (0.4 + Math.random() * 0.3); }
    if (P.vx < 0 && P.x < -P.s * 5)    { P.x = W + P.s * 5; P.y = H * (0.4 + Math.random() * 0.3); }
    const s = P.s;
    const y = P.y + Math.sin(t * 0.9 + P.phase) * 8 - p * s * 0.4;
    const dir = P.vx > 0 ? 1 : -1;
    const rx = s * 1.12 * (1 + 0.45 * p);
    const ry = s * 0.80 * (1 + 0.80 * p);
    const wag = Math.sin(t * 6 + P.phase) * 0.35;

    ctx.save();
    ctx.translate(P.x, y);
    ctx.scale(dir, 1);

    // spikes pop out as it rounds up
    if (p > 0.03) {
      ctx.fillStyle = '#b8924c';
      const spike = s * 0.42 * p;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + 0.1;
        const ca = Math.cos(a), sa = Math.sin(a);
        const hw = s * 0.09;
        ctx.beginPath();
        ctx.moveTo(ca * rx - sa * hw, sa * ry + ca * hw);
        ctx.lineTo(ca * (rx + spike), sa * (ry + spike));
        ctx.lineTo(ca * rx + sa * hw, sa * ry - ca * hw);
        ctx.closePath();
        ctx.fill();
      }
    }

    // little tail
    ctx.save();
    ctx.translate(-rx * 0.98, 0);
    ctx.rotate(wag * 0.4);
    ctx.fillStyle = '#d8a850';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.14);
    ctx.quadraticCurveTo(-s * 0.45, -s * 0.26, -s * 0.5, 0);
    ctx.quadraticCurveTo(-s * 0.45, s * 0.26, 0, s * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // round speckled body with a pale belly
    ctx.fillStyle = lg(ctx, 0, -ry, 0, ry, [
      [0, '#e8c87e'],
      [0.55, '#d0a858'],
      [0.75, '#f0e2bc'],
      [1, '#f8f0d8'],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(122, 88, 36, 0.55)';
    [[-0.55, -0.45], [-0.15, -0.62], [0.3, -0.5], [-0.35, -0.1], [0.1, -0.2], [0.55, -0.15]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(fx * rx, fy * ry, s * 0.07, 0, TAU);
      ctx.fill();
    });

    // fluttering pectoral
    ctx.save();
    ctx.translate(rx * 0.15, ry * 0.15);
    ctx.rotate(0.3 + wag * 0.6);
    ctx.fillStyle = 'rgba(216, 168, 80, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.14, s * 0.10, s * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // puckered little mouth
    ctx.fillStyle = '#9a6a3a';
    ctx.beginPath();
    ctx.ellipse(rx * 0.92, ry * 0.10, s * 0.09, s * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 200, 0.5)';
    ctx.beginPath();
    ctx.ellipse(rx * 0.90, ry * 0.07, s * 0.04, s * 0.03, 0, 0, TAU);
    ctx.fill();

    // big sweet eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(rx * 0.55, -ry * 0.28, s * 0.20, 0, TAU); ctx.fill();
    ctx.fillStyle = '#241608';
    ctx.beginPath(); ctx.arc(rx * 0.58, -ry * 0.26, s * 0.115, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(rx * 0.61, -ry * 0.31, s * 0.045, 0, TAU); ctx.fill();

    ctx.restore();

    // puffers are fish too
    updatePoop(P, P.x - dir * rx * 0.9, y + ry * 0.35, t, Math.max(1.5, s * 0.07));
  }

  // One butterflyfish — yellow disc, eye band, false eye-spot by the tail
  function drawButterfly(px, py, facing, s, t, phase) {
    const wag = Math.sin(t * 6 + phase) * 0.3;
    const INKB = '#1a1410';
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(facing, 1);

    // tail with a thin dark band
    ctx.save();
    ctx.translate(-s * 0.92, 0);
    ctx.rotate(wag * 0.35);
    ctx.fillStyle = '#ffc926';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.16);
    ctx.quadraticCurveTo(-s * 0.42, -s * 0.3, -s * 0.48, 0);
    ctx.quadraticCurveTo(-s * 0.42, s * 0.3, 0, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INKB;
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.2);
    ctx.quadraticCurveTo(-s * 0.16, 0, -s * 0.1, s * 0.2);
    ctx.stroke();
    ctx.restore();

    // dorsal and anal fins, black-edged
    ctx.fillStyle = '#f6b51a';
    ctx.strokeStyle = INKB;
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.6);
    ctx.quadraticCurveTo(0, -s * 1.05, -s * 0.6, -s * 0.55);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.92, -s * 0.5, s * 0.52);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // tall yellow disc body with a pointed snout
    ctx.fillStyle = lg(ctx, 0, -s * 0.78, 0, s * 0.78, [
      [0, '#ffd84a'],
      [0.55, '#ffc01e'],
      [1, '#eda20e'],
    ]);
    ctx.beginPath();
    ctx.moveTo(s * 0.92, -s * 0.1);
    ctx.lineTo(s * 1.22, s * 0.02);
    ctx.lineTo(s * 0.9, s * 0.18);
    ctx.quadraticCurveTo(s * 0.5, s * 0.8, -s * 0.3, s * 0.72);
    ctx.quadraticCurveTo(-s * 1.05, s * 0.3, -s * 1.0, 0);
    ctx.quadraticCurveTo(-s * 1.05, -s * 0.3, -s * 0.3, -s * 0.74);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.8, s * 0.92, -s * 0.1);
    ctx.closePath();
    ctx.fill();

    // black band across the face
    ctx.fillStyle = INKB;
    ctx.beginPath();
    ctx.ellipse(s * 0.52, -s * 0.08, s * 0.14, s * 0.72, 0.10, 0, TAU);
    ctx.fill();

    // false eye-spot by the tail — predators bite the wrong end
    ctx.fillStyle = INKB;
    ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.32, s * 0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff6dc';
    ctx.lineWidth = s * 0.045;
    ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.32, s * 0.15, 0, TAU); ctx.stroke();

    // fluttering pectoral
    ctx.save();
    ctx.translate(s * 0.2, s * 0.12);
    ctx.rotate(0.4 + wag * 0.5);
    ctx.fillStyle = 'rgba(255, 200, 60, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.14, s * 0.10, s * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // big sweet eye sitting on the band
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.56, -s * 0.16, s * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#181008';
    ctx.beginPath(); ctx.arc(s * 0.60, -s * 0.15, s * 0.085, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.63, -s * 0.19, s * 0.032, 0, TAU); ctx.fill();
    // smile at the snout
    ctx.strokeStyle = '#7a4a08';
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 1.16, s * 0.06);
    ctx.quadraticCurveTo(s * 1.0, s * 0.18, s * 0.84, s * 0.16);
    ctx.stroke();

    ctx.restore();
  }

  function drawHeart(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255, 92, 138, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.95);
    ctx.bezierCurveTo(-s * 1.15, s * 0.15, -s * 0.85, -s * 0.8, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.85, -s * 0.8, s * 1.15, s * 0.15, 0, s * 0.95);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.32, -s * 0.3, s * 0.2, s * 0.13, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // The sweethearts — two butterflyfish in formation, heart between them
  function drawButters(t) {
    const B = BUTTERS;
    B.x += B.vx;
    if (B.vx > 0 && B.x > W + B.s * 6) { B.x = -B.s * 6; B.baseY = H * (0.24 + Math.random() * 0.32); }
    if (B.vx < 0 && B.x < -B.s * 6)    { B.x = W + B.s * 6; B.baseY = H * (0.24 + Math.random() * 0.32); }
    const dir = B.vx > 0 ? 1 : -1;
    const y = B.baseY + Math.sin(t * 0.7 + B.phase) * 18;
    const ax = B.x + dir * B.s * 1.6, ay = y - B.s * 0.75 + Math.sin(t * 1.3 + B.phase) * 5;
    const bx = B.x - dir * B.s * 1.6, by = y + B.s * 0.75 + Math.cos(t * 1.1 + B.phase) * 5;
    drawButterfly(ax, ay, dir, B.s, t, B.phase);
    drawButterfly(bx, by, dir, B.s * 0.92, t, B.phase + 2.1);
    // the heart floating between them, gently beating
    const hs = B.s * (0.46 + 0.06 * Math.sin(t * 3.2));
    drawHeart(B.x, y - B.s * 1.7, hs);
    // they are also fish
    updatePoop(B.fa, ax - dir * B.s * 0.85, ay + B.s * 0.3, t, Math.max(1.2, B.s * 0.06));
    updatePoop(B.fb, bx - dir * B.s * 0.85, by + B.s * 0.3, t, Math.max(1.2, B.s * 0.06));
  }

  // Sunken treasure chest — pops open every few minutes, coins and all
  // open the treasure chest — used by the schedule AND by a direct click
  function openChest(t) {
    const C = CHEST;
    if (C.openStart !== null) return;
    C.openStart = t;
    C.nextOpenAt = t + 150;
    C.coins = Array.from({length: 9}, () => ({
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(1.6 + Math.random() * 1.5),
      spin: Math.random() * TAU,
      r: C.s * (0.10 + Math.random() * 0.06),
      rest: false,
    }));
  }
  function drawChest(t) {
    const C = CHEST;
    if (C.nextOpenAt === null) C.nextOpenAt = t + 20 + Math.random() * 40;
    if (C.openStart === null && t >= C.nextOpenAt) openChest(t);
    let open = 0;
    if (C.openStart !== null) {
      const e = t - C.openStart;
      if (e < 0.8)      open = e / 0.8;
      else if (e < 6.5) open = 1;
      else if (e < 7.5) open = 1 - (e - 6.5);
      else { C.openStart = null; C.coins = []; }
      open = open * open * (3 - 2 * open);
    }
    const s = C.s;
    const baseY = sandTopAt(C.x) + s * 0.15;
    const boxTop = baseY - s * 0.85;

    // resting shadow
    ctx.fillStyle = 'rgba(45, 55, 70, 0.30)';
    ctx.beginPath();
    ctx.ellipse(C.x, baseY + 2, s * 1.05, s * 0.18, 0, 0, TAU);
    ctx.fill();

    // golden glow spilling out
    if (open > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rg(ctx, C.x, boxTop, 0, s * 2.6, [
        [0, `rgba(255, 215, 90, ${(0.45 * open).toFixed(3)})`],
        [0.5, `rgba(255, 190, 60, ${(0.15 * open).toFixed(3)})`],
        [1, 'rgba(255, 180, 40, 0)'],
      ]);
      ctx.beginPath();
      ctx.arc(C.x, boxTop, s * 2.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // wooden body
    ctx.fillStyle = lg(ctx, 0, boxTop, 0, baseY, [
      [0, '#8a5a2e'],
      [0.5, '#6e441f'],
      [1, '#4a2c12'],
    ]);
    ctx.beginPath();
    ctx.moveTo(C.x - s * 0.85, boxTop);
    ctx.lineTo(C.x + s * 0.85, boxTop);
    ctx.lineTo(C.x + s * 0.78, baseY);
    ctx.lineTo(C.x - s * 0.78, baseY);
    ctx.closePath();
    ctx.fill();
    // plank seams
    ctx.strokeStyle = 'rgba(40, 22, 8, 0.5)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(C.x - s * 0.82, boxTop + (baseY - boxTop) * i / 3);
      ctx.lineTo(C.x + s * 0.82, boxTop + (baseY - boxTop) * i / 3);
      ctx.stroke();
    }
    // brass straps
    ctx.fillStyle = '#caa84e';
    ctx.fillRect(C.x - s * 0.52, boxTop, s * 0.12, baseY - boxTop);
    ctx.fillRect(C.x + s * 0.40, boxTop, s * 0.12, baseY - boxTop);

    // the open mouth and the gold heaped inside
    if (open > 0.1) {
      ctx.fillStyle = '#2a1808';
      ctx.beginPath();
      ctx.ellipse(C.x, boxTop, s * 0.8, s * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f8ce4e';
      ctx.beginPath();
      ctx.ellipse(C.x, boxTop - s * 0.06 * open, s * 0.62, s * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff0a8';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(C.x - s * 0.4 + i * s * 0.2, boxTop - s * 0.08 * open, s * 0.05, 0, TAU);
        ctx.fill();
      }
    }

    // domed lid, hinged at the back corner
    ctx.save();
    ctx.translate(C.x - s * 0.85, boxTop);
    ctx.rotate(-open * 1.75);
    ctx.fillStyle = lg(ctx, 0, -s * 0.58, 0, 0, [
      [0, '#9a6736'],
      [1, '#6e441f'],
    ]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.55, s * 0.85, -s * 0.58);
    ctx.quadraticCurveTo(s * 1.6, -s * 0.55, s * 1.7, 0);
    ctx.closePath();
    ctx.fill();
    // lid strap
    ctx.fillStyle = '#caa84e';
    ctx.fillRect(s * 0.79, -s * 0.58, s * 0.12, s * 0.58);
    ctx.restore();
    // lock plate
    ctx.fillStyle = '#e0bc5a';
    ctx.beginPath();
    ctx.arc(C.x, boxTop + s * 0.18, s * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5a3c10';
    ctx.beginPath();
    ctx.arc(C.x, boxTop + s * 0.18, s * 0.045, 0, TAU);
    ctx.fill();

    // coins tumbling out and settling on the sand
    if (C.openStart !== null && open > 0.2) {
      for (const cn of C.coins) {
        if (!cn.rest) {
          cn.vy += 0.045;
          cn.x += cn.vx;
          cn.y += cn.vy;
          if (cn.y > s * 1.0 && cn.vy > 0) { cn.rest = true; cn.y = s * 1.0 + Math.random() * s * 0.15; }
        }
        const px = C.x + cn.x;
        const py = boxTop - s * 0.2 + cn.y;
        const ry = Math.abs(Math.sin(t * 5 + cn.spin));
        ctx.fillStyle = '#ffd54a';
        ctx.strokeStyle = '#a87808';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px, py, cn.r, cn.r * Math.max(0.25, ry), 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 250, 220, 0.8)';
        ctx.beginPath();
        ctx.arc(px - cn.r * 0.3, py - cn.r * 0.2, cn.r * 0.22, 0, TAU);
        ctx.fill();
      }
    }
  }

  // ── Surface-blow mist + dolphin bubble rings ───────────────────────────────
  function drawFxPuffs(t) {
    for (let i = FXPUFF.length - 1; i >= 0; i--) {
      const p = FXPUFF[i];
      const age = t - p.t0;
      if (age < 0) continue;
      if (age > 0.9) { FXPUFF.splice(i, 1); continue; }
      const q = age / 0.9;
      ctx.fillStyle = `rgba(240, 250, 255, ${(0.5 * (1 - q)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - q * 26, 7 + q * 30, 4 + q * 14, 0, 0, TAU);
      ctx.fill();
    }
  }
  // a dolphin's party trick: a bubble ring that rises, grows and wobbles
  function drawFxRings(t) {
    for (let i = FXRINGS.length - 1; i >= 0; i--) {
      const r = FXRINGS[i];
      const age = t - r.t0;
      if (age > 2.8) { FXRINGS.splice(i, 1); continue; }
      const q = age / 2.8;
      const wob = Math.sin(t * 5 + i) * 3 * q;
      const rx = 8 + q * 30, ry = 4 + q * 16;
      const a = 1 - q;
      ctx.strokeStyle = `rgba(225, 248, 255, ${(0.7 * a).toFixed(3)})`;
      ctx.lineWidth = 2.4 - q * 1.4;
      ctx.beginPath();
      ctx.ellipse(r.x + wob, r.y - age * 34, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.35 * a).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(r.x + wob, r.y - age * 34 - ry * 0.3, rx * 0.8, ry * 0.5, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // ── Passing giants — shared scheduler: idle → cross the screen → reschedule ─
  function updateGiant(G, firstMin, firstMax, gapMin, gapMax, sizeF, yMin, yMax, speed, t, dt) {
    if (!G.active) {
      if (G.nextAt == null) G.nextAt = t + firstMin + Math.random() * (firstMax - firstMin);
      if (t < G.nextAt) return false;
      G.active = true;
      G.s = Math.min(W, H) * sizeF;
      G.dir = Math.random() < 0.5 ? 1 : -1;
      G.x = G.dir > 0 ? -G.s * 2.4 : W + G.s * 2.4;
      G.y = H * (yMin + Math.random() * (yMax - yMin));
      G.nextAt = null;
    }
    G.x += G.dir * speed * Math.min(W, H) * dt;
    if ((G.dir > 0 && G.x > W + G.s * 2.5) || (G.dir < 0 && G.x < -G.s * 2.5)) {
      G.active = false;
      G.nextAt = t + gapMin + Math.random() * (gapMax - gapMin);
      return false;
    }
    return true;
  }

  // ── The blue whale — a colossal shadow gliding past the surface ──
  function drawWhale(G, t) {
    const s = G.s;
    const y = G.y + Math.sin(t * 0.5 + G.phase) * 12;
    const wag = Math.sin(t * 1.1 + G.phase) * 0.18;
    ctx.save();
    ctx.translate(G.x, y);
    ctx.scale(G.dir, 1);
    ctx.globalAlpha = 0.92;

    // flukes — slow, mighty beats
    ctx.save();
    ctx.translate(-s * 1.98, 0);
    ctx.rotate(wag * 0.6);
    ctx.fillStyle = '#33506a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.16, -s * 0.42, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.03, -s * 0.13, 0);
    ctx.quadraticCurveTo(-s * 0.16, s * 0.03, -s * 0.42, s * 0.22);
    ctx.quadraticCurveTo(-s * 0.16, s * 0.16, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // the long, streamlined body
    const body = new Path2D();
    body.moveTo(s * 2.1, s * 0.02);
    body.quadraticCurveTo(s * 1.7, -s * 0.16, s * 1.1, -s * 0.20);
    body.quadraticCurveTo(s * 0.1, -s * 0.26, -s * 0.9, -s * 0.18);
    body.quadraticCurveTo(-s * 1.7, -s * 0.10, -s * 2.0, -s * 0.02);
    body.quadraticCurveTo(-s * 1.6, s * 0.05, -s * 0.8, s * 0.14);
    body.quadraticCurveTo(s * 0.4, s * 0.26, s * 1.5, s * 0.16);
    body.quadraticCurveTo(s * 1.95, s * 0.10, s * 2.1, s * 0.02);
    body.closePath();
    ctx.fillStyle = lg(ctx, 0, -s * 0.26, 0, s * 0.26, [
      [0, '#3a5872'],
      [0.55, '#4a6c88'],
      [0.78, '#7a98ae'],
      [1, '#b2c8d6'],
    ]);
    ctx.fill(body);

    // mottled back — the blue whale's signature (stable pseudo-random spots)
    ctx.fillStyle = 'rgba(160, 190, 210, 0.16)';
    for (let i = 0; i < 14; i++) {
      const mx = (((i * 73) % 100) / 100 * 3.4 - 1.6) * s;
      const my = -s * 0.16 + (((i * 41) % 100) / 100) * s * 0.22;
      ctx.beginPath();
      ctx.ellipse(mx, my, s * 0.05, s * 0.025, i, 0, TAU);
      ctx.fill();
    }
    // throat grooves
    ctx.strokeStyle = 'rgba(20, 40, 58, 0.25)';
    ctx.lineWidth = s * 0.012;
    for (let g = 0; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(s * (1.9 - g * 0.04), s * (0.05 + g * 0.025));
      ctx.quadraticCurveTo(s * 0.9, s * (0.22 + g * 0.03), s * 0.1, s * (0.20 + g * 0.028));
      ctx.stroke();
    }
    // tiny falcate dorsal fin, far back
    ctx.fillStyle = '#33506a';
    ctx.beginPath();
    ctx.moveTo(-s * 1.18, -s * 0.155);
    ctx.quadraticCurveTo(-s * 1.26, -s * 0.30, -s * 1.38, -s * 0.27);
    ctx.quadraticCurveTo(-s * 1.34, -s * 0.16, -s * 1.42, -s * 0.13);
    ctx.closePath();
    ctx.fill();
    // long pectoral flipper
    ctx.save();
    ctx.translate(s * 0.85, s * 0.16);
    ctx.rotate(0.35 + wag * 0.15);
    ctx.fillStyle = '#41607c';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.16, s * 0.07, s * 0.30, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // jawline + the small eye just above it
    ctx.strokeStyle = 'rgba(18, 36, 52, 0.5)';
    ctx.lineWidth = s * 0.014;
    ctx.beginPath();
    ctx.moveTo(s * 2.06, s * 0.05);
    ctx.quadraticCurveTo(s * 1.4, s * 0.16, s * 0.95, s * 0.14);
    ctx.stroke();
    ctx.fillStyle = '#0e1c28';
    ctx.beginPath(); ctx.arc(s * 1.06, s * 0.06, s * 0.022, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    // a lazy bubble trail from the blowhole
    if (Math.random() < 0.10)
      burstBubbles(G.x + G.dir * s * 0.9, y - s * 0.22, 1);
  }

  // ── The orca — black & white, with the towering dorsal fin ──
  function drawOrca(G, t) {
    const s = G.s;
    const y = G.y + Math.sin(t * 0.9 + G.phase) * 16;
    const pitch = -Math.cos(t * 0.9 + G.phase) * 0.10;
    const wag = Math.sin(t * 3.2 + G.phase) * 0.3;
    const INKB = '#10161e';
    ctx.save();
    ctx.translate(G.x, y);
    ctx.scale(G.dir, 1);
    ctx.rotate(pitch);

    // flukes
    ctx.save();
    ctx.translate(-s * 1.46, 0);
    ctx.rotate(wag * 0.5);
    ctx.fillStyle = INKB;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.28, -s * 0.30, -s * 0.58, -s * 0.36);
    ctx.quadraticCurveTo(-s * 0.26, -s * 0.05, -s * 0.24, 0);
    ctx.quadraticCurveTo(-s * 0.26, s * 0.05, -s * 0.58, s * 0.36);
    ctx.quadraticCurveTo(-s * 0.28, s * 0.30, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // stocky body
    const body = new Path2D();
    body.moveTo(s * 1.58, s * 0.04);
    body.quadraticCurveTo(s * 1.3, -s * 0.22, s * 0.85, -s * 0.32);
    body.quadraticCurveTo(s * 0.1, -s * 0.46, -s * 0.65, -s * 0.30);
    body.quadraticCurveTo(-s * 1.3, -s * 0.13, -s * 1.52, -s * 0.03);
    body.quadraticCurveTo(-s * 1.3, s * 0.08, -s * 0.6, s * 0.28);
    body.quadraticCurveTo(s * 0.35, s * 0.45, s * 1.15, s * 0.18);
    body.quadraticCurveTo(s * 1.45, s * 0.10, s * 1.58, s * 0.04);
    body.closePath();
    ctx.fillStyle = lg(ctx, 0, -s * 0.45, 0, s * 0.45, [[0, '#181f28'], [0.6, INKB], [1, '#060a10']]);
    ctx.fill(body);

    // white chin + belly with the flank lobe, clipped to the body
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = '#eef4f8';
    ctx.beginPath();
    ctx.moveTo(s * 1.6, s * 0.06);
    ctx.quadraticCurveTo(s * 1.1, s * 0.34, s * 0.3, s * 0.40);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.44, -s * 0.55, s * 0.30);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.16, s * 0.5, s * 0.13);
    ctx.quadraticCurveTo(s * 1.2, s * 0.10, s * 1.6, s * 0.06);
    ctx.closePath();
    ctx.fill();
    // gray saddle patch behind the dorsal
    ctx.fillStyle = 'rgba(150, 165, 180, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.32, -s * 0.24, s * 0.26, s * 0.10, -0.25, 0, TAU);
    ctx.fill();
    ctx.restore();

    // the white eye patch
    ctx.fillStyle = '#f2f7fa';
    ctx.beginPath();
    ctx.ellipse(s * 0.98, -s * 0.16, s * 0.21, s * 0.075, -0.28, 0, TAU);
    ctx.fill();
    // towering dorsal fin
    ctx.fillStyle = INKB;
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.33);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.95, s * 0.0, -s * 1.12);
    ctx.quadraticCurveTo(-s * 0.04, -s * 0.6, -s * 0.30, -s * 0.30);
    ctx.closePath();
    ctx.fill();
    // paddle pectoral
    ctx.save();
    ctx.translate(s * 0.42, s * 0.22);
    ctx.rotate(0.5 + wag * 0.15);
    ctx.fillStyle = INKB;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.2, s * 0.13, s * 0.30, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // eye, tucked at the front of the patch
    ctx.fillStyle = '#06090d';
    ctx.beginPath(); ctx.arc(s * 0.88, -s * 0.10, s * 0.035, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ── Main loop ──────────────────────────────────────────────────────────────
  let rafId = null, lastT = 0, lastFrameT = 0;

  function renderFrame(t) {
    const dt = Math.min(0.05, Math.max(0, t - lastFrameT));
    lastFrameT = t;
    // every few seconds some fish does something on its own
    if (nextFishActAt === null) nextFishActAt = t + 3 + Math.random() * 5;
    if (t >= nextFishActAt) {
      nextFishActAt = t + 4 + Math.random() * 8;
      const list = fishTargets(t);
      const h = list[(Math.random() * list.length) | 0];
      doFishAct(h, t);
      // sometimes nature calls too — pooping is random/scheduled, never clicked
      if (h.kind !== 'school' && Math.random() < 0.25 && !h.f.poop) h.f.poopAt = t;
    }
    ctx.drawImage(staticLayer.cv, 0, 0, W, H);
    drawSurface(t);
    drawMotes(t);
    drawRays(t);
    drawCaustics(t);
    // passing giants glide far behind the reef life:
    // blue whale ~20× the dolphin (every few minutes), orca ~5× (now and then)
    if (updateGiant(WHALE, 35, 70, 150, 240, 0.78, 0.10, 0.22, 0.115, t, dt)) drawWhale(WHALE, t);
    if (updateGiant(ORCA,  15, 40,  80, 150, 0.29, 0.10, 0.30, 0.16,  t, dt)) drawOrca(ORCA, t);
    drawSchool(t);
    for (const dp of DOLPHS) drawDolphin(dp, t);
    for (const sh of SHARKS) drawShark(sh, t);
    for (const d of DORIES) drawDory(d, t);
    drawButters(t);
    drawPuffer(t);
    drawGrass(t);
    drawKelp(t);
    drawChest(t);
    for (const a of ANEMONES) {
      drawAnemone(a, t, false);                       // back tentacles
      for (const n of NEMOS) if (n.home === a) drawNemo(n, t);
      drawAnemone(a, t, true);                        // front tentacles overlap the fish
    }
    drawCrab(t);
    drawBubbles(t);
    drawFxBubbles(t, dt);
    drawFxHearts(t, dt);
    drawFxPuffs(t);
    drawFxRings(t);
    ctx.drawImage(vigLayer.cv, 0, 0, W, H);
  }

  function draw(ts) {
    if (stopped) return;
    lastT = ts / 1000;
    renderFrame(lastT);
    rafId = requestAnimationFrame(draw);
  }

  // ── Click a fish: it reacts (dash/roll/puff/hide/hearts/scatter + bubbles).
  // Pooping is NOT click-driven — it stays on the random/scheduled path only.
  // Clicks land on the game's layers, not the canvas — listen on the document
  // and react only to clicks that miss the game UI.
  const reefClick = e => {
    if (stopped) return;
    if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov'))return;
    const mx = e.clientX, my = e.clientY;
    const t = lastT;
    // closest fish whose (slightly padded) body contains the click
    let best = null, bestD = Infinity;
    for (const h of fishTargets(t)) {
      const q = Math.pow((mx - h.x) / h.rx, 2) + Math.pow((my - h.y) / h.ry, 2);
      if (q <= 1) {
        const d = Math.hypot(mx - h.x, my - h.y);
        if (d < bestD) { bestD = d; best = h; }
      }
    }
    if (best) { doFishAct(best, t, mx, my); return; }
    // no fish hit — maybe the treasure chest? it creaks open on demand
    {
      const s = CHEST.s, by = sandTopAt(CHEST.x) + s * 0.15;
      if (Math.abs(mx - CHEST.x) < s * 1.15 && my > by - s * 1.7 && my < by + s * 0.35) {
        openChest(t);
        burstBubbles(CHEST.x, by - s, 6);
      }
    }
  };
  document.addEventListener('click', reefClick);

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(draw);
  // the loader calls this when the background is switched away
  return function cleanup() {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', reefClick);
    stage.innerHTML = '';
  };
  },
};
