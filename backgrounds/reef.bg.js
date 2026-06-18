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
  // ── Unified sea current ──────────────────────────────────────────────────
  // One slowly-wandering horizontal current that every swaying thing (kelp,
  // seagrass, sediment, anemone tentacles, the seahorse) leans to together, so
  // the whole reef breathes with the same water instead of jittering randomly.
  // Returns a value in roughly [-1, 1]: sign = direction, magnitude = strength.
  function curX(t) {
    return 0.62 * Math.sin(t * 0.07)
         + 0.28 * Math.sin(t * 0.123 + 1.7)
         + 0.10 * Math.sin(t * 0.31  + 3.1);
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
  let SHARKS, DORIES, NEMOS, ANEMONES, CRABS, PUFFER, BUTTERS, CHEST, DOLPHS, POD, SHOALS;
  let sandTopAt, sandPath, OUTCROPS;
  let staticLayer, vigLayer;
  let FXBUB, FXHEARTS, FXPUFF, FXRINGS, FXSPARK, nextFishActAt;   // click/scheduled action state
  let WHALE, ORCA;                      // passing giants (blue whale / killer whale)
  let BOAT;                             // a wooden boat hull gliding across the surface
  let CLOUDSHADE;                        // drifting cloud shadow that dims the scene
  let SEAHORSE, SEAHORSE2;               // a clinging seahorse + one roaming the sandy bottom
  let FLATFISH, FXSAND;                   // camouflaged sole + its sand-puff particles
  let CLEANSTATION;                       // a cleaner wrasse + visiting client fish
  let SPAWN;                              // rare coral-spawning egg bundles drifting up
  let RAIN;                               // occasional rain: surface dimples + soft dimming
  let STARS;                              // clickable sea stars (animate on tap)
  let JELLIES;                            // a drifting group of pulsing jellyfish

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

    // Passing cloud shadow — a soft darkening blob that drifts overhead now and
    // then, dimming the whole scene as if a cloud crossed the sun above the water
    CLOUDSHADE = { active: false, next: null };

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
    SCHOOL = Array.from({length: 8}, () => ({
      ox: (Math.random() - 0.5) * 130,
      oy: (Math.random() - 0.5) * 55,
      size: 3.4 + Math.random() * 2.4,
      phase: Math.random() * TAU,
    }));
    SCHOOL.leader = { x: W * 0.3, y: H * 0.32, vx: 0.6, sp: 1.5 + Math.random() * 1.5 };   // fixed 1.5×–3× cruise
    SCHOOL.avoid = { x: 0, y: 0, t0: -99, strength: 0 };   // boids parting around cursor/click
    SCHOOL.ballF = 0;                                       // bait-ball intensity (shark near → 1)

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

    // Two seahorses that slowly roam the WHOLE screen (not just the bottom):
    // they drift horizontally and wander up/down across the full height.
    const mkSeahorse = hue => ({
      s: Math.min(W, H) * 0.0276, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * TAU,
      hue, state: 'roam', spd: 0.28 + Math.random() * 0.12,
      x: W * (0.15 + Math.random() * 0.7), y: H * (0.18 + Math.random() * 0.6),
      vy: (Math.random() - 0.5) * 0.5, reactT0: null,
    });
    SEAHORSE = mkSeahorse('#F2B23C');
    SEAHORSE2 = mkSeahorse('#E89BC0');

    // A camouflaged sole buried in the open sand — invisible until a sand click
    // makes it bolt out in a sand puff and re-bury somewhere else (see §click).
    FXSAND = [];
    {
      const fx = W * (0.30 + Math.random() * 0.4), s = Math.min(W, H) * 0.052;
      FLATFISH = {
        x: fx, y: sandTopAt(fx) + s * 0.32, s, state: 'buried', cool: 0,
        t0: 0, dur: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, phase: Math.random() * TAU,
      };
    }

    // A drifting group of 3–5 pulsing jellyfish (shared drift direction → a loose school)
    {
      const jdir = Math.random() < 0.5 ? -1 : 1;
      const pal = ['#E89BD0', '#C79BE8', '#9BB8E8'];
      JELLIES = Array.from({ length: 2 + (Math.random() * 2 | 0) }, (_, i) => ({
        x: W * (0.2 + Math.random() * 0.6), y: H * (0.28 + Math.random() * 0.30),
        s: Math.min(W, H) * (0.03 + Math.random() * 0.018),
        vx: jdir * (0.3 + Math.random() * 0.22), phase: Math.random() * TAU,
        pulseSpd: 1.5 + Math.random() * 0.8, hue: pal[i % pal.length],
      }));
    }

    // A cleaning station above a coral head: a tiny cleaner wrasse hovers here;
    // every ~40–80 s a bigger "client" fish swims in, hovers (mouth gaping)
    // while the cleaner fusses over it, then swims on.
    CLEANSTATION = {
      x: W * 0.40, y: sandTopAt(W * 0.40) - H * 0.11,
      cphase: Math.random() * TAU, client: null, nextAt: null, signF: 0,
    };

    // Coral spawning — a rare spectacle: the coral heads release clouds of tiny
    // pale egg bundles that drift up like reverse snow.
    // Each spawn point sits at the coral it belongs to (x + the height eggs
    // emerge from). Bommie corals ride high on the outcrops; garden corals mount
    // on the sand. Listing them here keeps clicks and auto-spawns aligned to the
    // actual coral art — including the raised bommie staghorn & tube sponges.
    const O0 = OUTCROPS[0], O1 = OUTCROPS[1];
    SPAWN = {
      parts: [], active: false, t0: 0, nextAt: null,
      points: [
        { x: O0.x - O0.w * 0.42, y: O0.topY + 8 },                      // bommie A — staghorn
        { x: O0.x + O0.w * 0.42, y: O0.topY + 8 },                      // bommie A — sea fan
        { x: O0.x - O0.w * 0.78, y: sandTopAt(O0.x - O0.w * 0.78) },    // bommie A — tube sponges
        { x: O1.x - O1.w * 0.40, y: O1.topY + 8 },                      // bommie B — sea fan
        { x: O1.x + O1.w * 0.40, y: O1.topY + 10 },                     // bommie B — boulder
        { x: O1.x + O1.w * 0.85, y: sandTopAt(O1.x + O1.w * 0.85) },    // bommie B — tube sponges
        ...[0.20, 0.305, 0.355, 0.395, 0.475, 0.55, 0.635, 0.715, 0.92]
          .map(f => ({ x: W * f, y: sandTopAt(W * f) })),              // coral garden (on the sand)
      ],
    };

    // Occasional rain seen from below: dimples pock the surface and the whole
    // scene dims softly under an overcast sky.
    RAIN = { active: false, t0: 0, dur: 0, nextAt: null, intensity: 0, dimples: [] };

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
    // A dolphin pod — 1–3 adults plus a baby — travelling together (see spawnPod)
    spawnPod();

    // Fish shoals — small same-species groups (clownfish OR tangs), 3–4 each,
    // and occasionally a mixed Nemo+Dory pair (see spawnShoal)
    SHOALS = Array.from({ length: 2 }, () => spawnShoal(true));

    // Reef crabs working the sand (5 of them, each on its own patrol range;
    // actT = click-reaction time)
    // Five crabs, each its own species colour (limb = legs/claw-arms,
    // claw = pincer ball, cara = carapace top→bottom gradient, dark = stalks/mottling).
    const CRAB_PALS = [
      { limb: '#8e4524', claw: '#a85530', cara: ['#b05a30', '#7e3a1c'], dark: '#5a2810' },  // red-brown
      { limb: '#b33a1a', claw: '#e0633a', cara: ['#ef6a36', '#b23a16'], dark: '#7a2510' },  // bright orange
      { limb: '#6a3a72', claw: '#9a5aa8', cara: ['#a862b8', '#5e3268'], dark: '#3e1f48' },  // purple
      { limb: '#256a62', claw: '#3a9a8e', cara: ['#46a99a', '#236158'], dark: '#143e38' },  // teal
      { limb: '#9a7a1a', claw: '#cfa82e', cara: ['#dcb83e', '#8a6e15'], dark: '#5e4a0e' },  // sandy yellow
    ];
    CRABS = [[0.06, 0.22], [0.27, 0.45], [0.42, 0.60], [0.62, 0.80], [0.80, 0.96]].map(([lo, hi], i) => ({
      lo: W * lo, hi: W * hi, x: W * (lo + Math.random() * (hi - lo)),
      dir: Math.random() < 0.5 ? 1 : -1, s: Math.min(W, H) * (0.013 + Math.random() * 0.006),
      phase: Math.random() * TAU, actT: null, pal: CRAB_PALS[i % CRAB_PALS.length],
    }));

    // Sea stars on the open sand — clickable, animate (wiggle) on a tap. Drawn
    // dynamically per frame (no longer painted into the static layer).
    STARS = [
      { x: W * 0.245, y: H * 0.945, s: Math.min(W, H) * 0.016, col: '#d8703a', rot: 0.3, actT: null },
      { x: W * 0.785, y: H * 0.952, s: Math.min(W, H) * 0.014, col: '#b84e60', rot: -0.6, actT: null },
    ];

    // A pufferfish that balloons up on schedule
    PUFFER = {
      x: W * 0.7, y: H * 0.55, vx: 0.3, sp: 1.5 + Math.random() * 1.5,   // fixed 1.5×–3× cruise
      s: Math.min(W, H) * 0.034,
      phase: Math.random() * TAU,
      puffStart: null, nextPuffAt: null,
    };

    // An inseparable pair of butterflyfish, heart and all
    BUTTERS = {
      x: W * 0.35, baseY: H * 0.44, vx: 0.4, sp: 1.5 + Math.random() * 1.5,   // fixed 1.5×–3× cruise
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
    BOAT  = { active: false, nextAt: null, x: 0, dir: 1, s: 0 };

    FXBUB = [];
    FXHEARTS = [];
    FXPUFF = [];     // white blow-mist puffs (dolphin breaths)
    FXRINGS = [];    // dolphin bubble rings
    FXSPARK = [];    // twinkle sparkles (e.g. a freshly-cleaned fish)
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

    // Bommie B — sea fan, a polyp boulder, sponges
    paintSeaFan(c,   OUTCROPS[1].x - OUTCROPS[1].w * 0.40, OUTCROPS[1].topY + 8, H * 0.105, '#c44a78');
    coralBoulder(c,  OUTCROPS[1].x + OUTCROPS[1].w * 0.40, OUTCROPS[1].topY + 10, W * 0.05, H * 0.045, '#caa05e');
    paintSponges(c,  OUTCROPS[1].x + OUTCROPS[1].w * 0.85, sandTopAt(OUTCROPS[1].x + OUTCROPS[1].w * 0.85) + 4, H * 0.065, '#9a6aae');

    // Coral garden — rock bases topped with corals built from many polyps.
    // The good elements stay: the staghorn (white-tipped branches), sea fans,
    // tube sponges, kelp, sea stars and the anemones are kept.
    const SY = f => sandTopAt(W * f) + 4;
    rockBase(c,      W * 0.20,  SY(0.20),  W * 0.075, H * 0.060, '#6f7a82');
    coralBoulder(c,  W * 0.20,  SY(0.20) - H * 0.018, W * 0.07,  H * 0.058, '#d98c4a');
    coralFingers(c,  W * 0.305, SY(0.305), H * 0.115, '#caa0d8');
    coralBoulder(c,  W * 0.395, SY(0.395), W * 0.058, H * 0.050, '#5fae8a');
    paintStaghorn(c, W * 0.475, SY(0.475), H * 0.095, '#b888c0');   // kept — branching white-tips
    paintSeaFan(c,   W * 0.355, SY(0.355), H * 0.08,  '#7a4ea0');   // kept
    rockBase(c,      W * 0.55,  SY(0.55),  W * 0.07,  H * 0.052, '#7c7064');
    coralPolyPlate(c, W * 0.55, SY(0.55) - H * 0.012, H * 0.058, '#e0b85e');
    coralFingers(c,  W * 0.635, SY(0.635), H * 0.12,  '#e07a86');
    coralBoulder(c,  W * 0.715, SY(0.715), W * 0.058, H * 0.048, '#b56a9a');
    rockBase(c,      W * 0.92,  SY(0.92),  W * 0.07,  H * 0.060, '#677787');
    coralBoulder(c,  W * 0.92,  SY(0.92) - H * 0.02,  W * 0.065, H * 0.056, '#5fae8a');
    // (sea stars are now drawn dynamically — see drawStars — so they can react to taps)
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

  // ── Polyp-built corals on rock bases (ported from reef_coral_lab) ─────────
  // A single corallite: a domed bead with a lit cap and a tiny mouth pit.
  function polyp(c, x, y, r, base, lit) {
    c.fillStyle = base; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = lit;  c.beginPath(); c.arc(x - r * 0.26, y - r * 0.3, r * 0.6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(35, 22, 38, 0.32)'; c.beginPath(); c.arc(x, y, r * 0.26, 0, TAU); c.fill();
  }
  // A lumpy rock boulder — varied colour / height / shape, the base for corals.
  function rockBase(c, cx, baseY, w, h, hue) {
    c.fillStyle = 'rgba(12, 34, 52, 0.30)';
    c.beginPath(); c.ellipse(cx, baseY + 3, w * 1.02, h * 0.16, 0, 0, TAU); c.fill();
    const top = baseY - h;
    c.beginPath(); c.moveTo(cx - w, baseY);
    for (let i = 0; i <= 24; i++) {
      const f = i / 24, px = cx - w + f * 2 * w;
      const env = Math.sin(f * Math.PI);
      const lump = Math.sin(f * 3.6 * Math.PI + cx) * 0.16 + Math.sin(f * 9 + cx) * 0.05;
      const py = baseY - h * env * (0.82 + lump);
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.lineTo(cx + w, baseY); c.closePath();
    c.fillStyle = lg(c, cx, top, cx, baseY, [[0, shade(hue, 1.22)], [0.5, hue], [1, shade(hue, 0.58)]]);
    c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(20, 30, 40, 0.28)'; c.lineWidth = Math.max(1, w * 0.02); c.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const rx0 = cx - w * 0.7 + Math.random() * w * 1.4;
      c.beginPath(); c.moveTo(rx0, top + Math.random() * h * 0.3);
      c.quadraticCurveTo(rx0 + (Math.random() - 0.5) * w * 0.5, baseY - h * 0.4, rx0 + (Math.random() - 0.5) * w * 0.6, baseY);
      c.stroke();
    }
    for (let k = 0; k < 50; k++) {
      const px = cx - w + Math.random() * 2 * w, py = top + Math.random() * h * 0.8;
      c.fillStyle = `rgba(${180 + Math.random() * 50 | 0}, ${190 + Math.random() * 40 | 0}, ${170 + Math.random() * 40 | 0}, ${(0.05 + Math.random() * 0.1).toFixed(3)})`;
      c.beginPath(); c.arc(px, py, 1 + Math.random() * 1.6, 0, TAU); c.fill();
    }
    c.restore();
  }
  // Massive boulder coral — a dome packed with hundreds of polyps.
  function coralBoulder(c, cx, baseY, rx, ry, hue) {
    coralShadow(c, cx, baseY, rx * 1.05);
    const cy = baseY - ry;
    c.fillStyle = rg(c, cx - rx * 0.3, cy - ry * 0.4, rx * 0.1, rx * 1.8, [[0, shade(hue, 1.1)], [1, shade(hue, 0.55)]]);
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fill();
    const pr = Math.max(2.2, rx * 0.075);
    c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.clip();
    for (let yy = -ry; yy <= ry * 0.55; yy += pr * 1.05) {
      for (let xx = -rx; xx <= rx; xx += pr * 1.05) {
        if ((xx / rx) ** 2 + (yy / ry) ** 2 > 1) continue;
        const jx = (Math.random() - 0.5) * pr * 0.7, jy = (Math.random() - 0.5) * pr * 0.7;
        const litAmt = 1 - (yy + ry) / (ry * 1.7);
        polyp(c, cx + xx + jx, cy + yy + jy, pr * (0.8 + Math.random() * 0.4),
              shade(hue, 0.74 + 0.32 * litAmt), shade(hue, 1.12 + 0.3 * litAmt));
      }
    }
    c.restore();
  }
  // Branching/finger coral — knobbly fingers of stacked polyps, pale tips.
  function coralFingers(c, cx, baseY, size, hue) {
    coralShadow(c, cx, baseY, size * 0.7);
    const fingers = 5 + (Math.random() * 3 | 0);
    for (let f = 0; f < fingers; f++) {
      const fx = cx + (f - (fingers - 1) / 2) * size * 0.26 + (Math.random() - 0.5) * size * 0.1;
      const fh = size * (0.7 + Math.random() * 0.6);
      const lean = (Math.random() - 0.5) * 0.5;
      const pr = Math.max(2.2, size * 0.075);
      const steps = Math.max(3, Math.round(fh / (pr * 0.95)));
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const px = fx + Math.sin(u * 2 + f) * size * 0.05 + lean * u * size * 0.4;
        const py = baseY - u * fh;
        const r = pr * (1.05 - u * 0.35);
        const tip = u > 0.82;
        polyp(c, px, py, r, tip ? shade(hue, 1.25) : shade(hue, 0.85 + u * 0.15), tip ? '#f3efe0' : shade(hue, 1.2));
        if (i % 3 === 0 && !tip) polyp(c, px + (i % 6 ? 1 : -1) * r * 0.9, py + r * 0.2, r * 0.7, shade(hue, 0.8), shade(hue, 1.1));
      }
    }
  }
  // Plate/cabbage coral — a disc tiled with concentric polyp rings.
  function coralPolyPlate(c, cx, baseY, size, hue) {
    coralShadow(c, cx, baseY, size * 1.1);
    const cy = baseY - size * 0.5;
    c.fillStyle = shade(hue, 0.6);
    c.beginPath(); c.ellipse(cx, baseY - size * 0.1, size * 0.18, size * 0.2, 0, 0, TAU); c.fill();
    c.fillStyle = lg(c, cx, cy - size * 0.2, cx, cy + size * 0.2, [[0, shade(hue, 1.18)], [1, shade(hue, 0.7)]]);
    c.beginPath(); c.ellipse(cx, cy, size * 1.15, size * 0.4, 0, 0, TAU); c.fill();
    const pr = Math.max(2, size * 0.06);
    for (let ring = 1; ring <= 6; ring++) {
      const rr = ring / 6, n = Math.round(8 * ring);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring;
        polyp(c, cx + Math.cos(a) * size * 1.05 * rr, cy + Math.sin(a) * size * 0.36 * rr,
              pr * (0.9 + Math.random() * 0.3), shade(hue, 0.82), shade(hue, 1.18));
      }
    }
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
    // bright sunlit rim along the upper edge + a soft sheen
    c.strokeStyle = 'rgba(255, 250, 235, 0.55)'; c.lineWidth = Math.max(1, size * 0.04);
    c.beginPath(); c.ellipse(x, ty - size * 0.015, size * 1.46, size * 0.22, 0, Math.PI * 1.08, -Math.PI * 0.08); c.stroke();
    c.fillStyle = 'rgba(255, 252, 240, 0.18)';
    c.beginPath(); c.ellipse(x - size * 0.4, ty - size * 0.06, size * 0.55, size * 0.09, 0, 0, TAU); c.fill();
  }

  // Brain coral — a lit dome densely scored with meandering ridges & valleys
  function paintBrain(c, x, base, size, col) {
    coralShadow(c, x, base, size * 1.5);
    const cyc = base - size * 0.5, rx = size * 1.4, ry = size * 0.95;
    c.save();
    c.beginPath(); c.ellipse(x, cyc, rx, ry, 0, 0, TAU); c.clip();
    // domed body, lit from the upper-left
    c.fillStyle = rg(c, x - rx * 0.35, cyc - ry * 0.45, rx * 0.1, rx * 1.9, [
      [0, shade(col, 1.34)], [0.45, shade(col, 1.06)], [1, shade(col, 0.56)],
    ]);
    c.fillRect(x - rx, cyc - ry, rx * 2, ry * 2);
    // meandering brain folds — a dark groove with a rounded lit ridge below it
    c.lineCap = 'round'; c.lineJoin = 'round';
    const rows = 10;
    for (let i = 0; i < rows; i++) {
      const fy = cyc - ry * 0.9 + (i / (rows - 1)) * ry * 1.8;
      const ph = i * 2.3, f1 = 0.055 + (i % 3) * 0.006;
      const pts = [];
      for (let j = 0; j <= 18; j++) {
        const px = x - rx * 1.15 + (j / 18) * rx * 2.3;
        const py = fy + Math.sin(px * f1 + ph) * size * 0.11 + Math.sin(px * 0.135 + ph * 1.6) * size * 0.045;
        pts.push([px, py]);
      }
      c.strokeStyle = shade(col, 0.46); c.lineWidth = size * 0.055;     // dark valley
      c.beginPath(); pts.forEach(([px, py], k) => k ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke();
      c.strokeStyle = shade(col, 1.24); c.lineWidth = size * 0.03;      // rounded lit ridge
      c.beginPath(); pts.forEach(([px, py], k) => k ? c.lineTo(px, py + size * 0.05) : c.moveTo(px, py + size * 0.05)); c.stroke();
    }
    // soft top sheen + fine polyp speckle
    c.fillStyle = 'rgba(255,252,240,0.16)';
    c.beginPath(); c.ellipse(x - rx * 0.25, cyc - ry * 0.42, rx * 0.5, ry * 0.3, -0.3, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,248,235,0.14)';
    for (let k = 0; k < 38; k++) {
      c.beginPath(); c.arc(x + (Math.random() - 0.5) * rx * 1.9, cyc + (Math.random() - 0.5) * ry * 1.7, 0.7, 0, TAU); c.fill();
    }
    c.restore();
    // ambient-occlusion rim
    c.strokeStyle = shade(col, 0.5); c.lineWidth = Math.max(1, size * 0.035);
    c.beginPath(); c.ellipse(x, cyc, rx, ry, 0, 0, TAU); c.stroke();
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
    // glossy sheen over the cap crown
    c.fillStyle = 'rgba(255, 252, 242, 0.20)';
    c.beginPath();
    c.ellipse(x - size * 0.18, base - size * 0.86, size * 0.55, size * 0.16, -0.1, 0, TAU);
    c.fill();
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
      c.strokeStyle = 'rgba(255, 248, 232, 0.5)';        // sunlit upper rim
      c.lineWidth = Math.max(1, size * 0.03);
      c.beginPath();
      c.ellipse(x, py - size * 0.01, pr * 0.96, pr * 0.30, 0, Math.PI * 1.05, -Math.PI * 0.05);
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
    const cur = curX(t);
    for (const p of MOTES) {
      p.x += p.vx + cur * 0.35;          // the suspended sediment drifts with the current
      p.y += p.vy;
      if (p.x > W + 4) p.x = -4;
      if (p.x < -4)    p.x = W + 4;       // can now flow either way
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
    const cur = curX(t);
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
        // current sets the lean (all kelp bows the same way); a small ripple on top
        const sway = (cur + Math.sin(t * 1.1 + s.x * 0.008 + i * 0.32) * 0.32) * fr * 24;
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
    const cur = curX(t);
    for (const g of GRASS) {
      const baseY = sandTopAt(g.x) + 3;
      for (const b of g.blades) {
        // tip leans with the current (dominant) plus a small per-blade ripple
        const sway = (cur + Math.sin(t * 1.2 + b.phase) * 0.28) * b.len * 0.26;
        ctx.strokeStyle = b.hue;
        ctx.lineWidth = b.w;
        ctx.beginPath();
        ctx.moveTo(g.x + b.dx, baseY);
        ctx.quadraticCurveTo(
          g.x + b.dx + b.lean * b.len * 0.4 + sway * 0.45,
          baseY - b.len * 0.6,
          g.x + b.dx + b.lean * b.len + sway,
          baseY - b.len
        );
        ctx.stroke();
      }
    }
  }

  // ── Seahorse ─────────────────────────────────────────────────────────────
  // Clings to the seagrass by a curled prehensile tail and sways with the
  // current; every ~12–22 s it lets go and swims upright to another grass
  // cluster, tail uncurling, then re-grips.
  function updateSeahorse(sh, t) {                      // drifts the whole screen, up & down
    sh.x += sh.dir * sh.spd;
    if (sh.x < W * 0.05) sh.dir = 1;
    if (sh.x > W * 0.95) sh.dir = -1;
    sh.y += sh.vy;
    if (sh.y < H * 0.10) sh.vy = Math.abs(sh.vy);
    if (sh.y > H * 0.84) sh.vy = -Math.abs(sh.vy);
    if (Math.random() < 0.01) sh.vy = (Math.random() - 0.5) * 0.6;   // occasionally change drift
  }
  function drawSeahorse(sh, t) {
    const S = sh.s, cur = curX(t);
    let yOff = Math.sin(t * 1.6 + sh.phase) * S * 0.18, curlTurns = 1.25, lean = 0, finRate = 13;
    if (sh.reactT0 != null) {                           // tapped → a quick startled hop + tilt
      const re = (t - sh.reactT0) / 0.7;
      if (re >= 1) sh.reactT0 = null;
      else { const k = Math.sin(Math.min(1, re) * Math.PI); yOff -= k * S * 1.3; lean = sh.dir * 0.22 * k; finRate = 22; }
    }
    const baseY = sh.y + yOff;
    ctx.save();
    ctx.translate(sh.x, baseY);
    ctx.rotate(cur * 0.12 + Math.sin(t * 1.3 + sh.phase) * 0.05 + lean);
    ctx.scale(sh.dir, 1);

    const body = sh.hue, out = '#C8861F', belly = '#FFD06A';

    // curled prehensile tail — a tapering spiral (uncurls while swimming)
    ctx.lineCap = 'round';
    ctx.strokeStyle = out;
    const cxT = -0.02 * S, cyT = 0.30 * S;
    let prev = null;
    for (let i = 0; i <= 24; i++) {
      const f = i / 24;
      const ang = -Math.PI * 0.5 + f * curlTurns * TAU;
      const rr = 0.30 * S * (1 - 0.64 * f);
      const x = cxT + Math.cos(ang) * rr, y = cyT + Math.sin(ang) * rr;
      if (prev) {
        ctx.lineWidth = Math.max(1, 0.15 * S * (1 - 0.7 * f));
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
      }
      prev = { x, y };
    }

    // dorsal fin — translucent, on the back, fluttering
    const flut = Math.sin(t * finRate + sh.phase) * 0.5;
    ctx.fillStyle = 'rgba(255, 224, 138, 0.7)';
    ctx.beginPath();
    ctx.moveTo(-0.16 * S, -0.22 * S);
    ctx.quadraticCurveTo((-0.44 + flut * 0.06) * S, -0.40 * S, -0.18 * S, -0.58 * S);
    ctx.quadraticCurveTo(-0.32 * S, -0.40 * S, -0.16 * S, -0.22 * S);
    ctx.closePath(); ctx.fill();

    // body + horse-like head silhouette (muzzle, brow "stop", crown, spiny back)
    ctx.beginPath();
    ctx.moveTo(0.10 * S, 0);
    ctx.quadraticCurveTo(0.32 * S, -0.16 * S, 0.30 * S, -0.40 * S);   // belly bulge
    ctx.quadraticCurveTo(0.28 * S, -0.58 * S, 0.20 * S, -0.70 * S);   // chest → throat
    ctx.quadraticCurveTo(0.26 * S, -0.78 * S, 0.36 * S, -0.80 * S);   // lower jaw
    ctx.lineTo(0.60 * S, -0.85 * S);                                  // muzzle underside → tip
    ctx.lineTo(0.58 * S, -0.91 * S);                                  // snout tip (tubular mouth)
    ctx.lineTo(0.40 * S, -0.92 * S);                                  // muzzle top
    ctx.quadraticCurveTo(0.31 * S, -0.90 * S, 0.30 * S, -0.95 * S);   // the brow "stop" dip
    ctx.quadraticCurveTo(0.26 * S, -1.06 * S, 0.12 * S, -1.04 * S);   // rounded crown
    ctx.quadraticCurveTo(-0.04 * S, -1.02 * S, -0.06 * S, -0.86 * S); // nape
    ctx.quadraticCurveTo(-0.16 * S, -0.62 * S, -0.16 * S, -0.42 * S); // upper back
    ctx.quadraticCurveTo(-0.20 * S, -0.26 * S, -0.12 * S, -0.12 * S); // back bulge
    ctx.quadraticCurveTo(-0.10 * S, -0.04 * S, 0.10 * S, 0);          // down to base
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.028 * S);
    ctx.strokeStyle = out;
    ctx.stroke();

    // little spiny bumps (חודחודים) marching down the back ridge
    ctx.fillStyle = body;
    ctx.strokeStyle = out;
    ctx.lineWidth = Math.max(0.6, 0.016 * S);
    const ridge = [[-0.05, -0.84], [-0.11, -0.68], [-0.155, -0.52], [-0.17, -0.36], [-0.145, -0.22]];
    for (const [rx, ry] of ridge) {
      ctx.beginPath();
      ctx.moveTo(rx * S, (ry + 0.05) * S);
      ctx.lineTo((rx - 0.11) * S, (ry - 0.01) * S);      // spike points back/out
      ctx.lineTo(rx * S, (ry - 0.06) * S);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // lighter belly highlight
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.moveTo(0.12 * S, -0.04 * S);
    ctx.quadraticCurveTo(0.26 * S, -0.22 * S, 0.22 * S, -0.42 * S);
    ctx.quadraticCurveTo(0.16 * S, -0.28 * S, 0.08 * S, -0.10 * S);
    ctx.closePath(); ctx.fill();

    // segment bands across the body
    ctx.strokeStyle = rgba('#C8861F', 0.5);
    ctx.lineWidth = Math.max(0.6, 0.016 * S);
    for (let i = 1; i <= 4; i++) {
      const fy = -i * 0.12 * S;
      ctx.beginPath();
      ctx.moveTo(-0.12 * S, fy);
      ctx.quadraticCurveTo(0.06 * S, fy - 0.02 * S, 0.24 * S, fy + 0.03 * S);
      ctx.stroke();
    }

    // coronet on the crown — a few upright spikes
    ctx.fillStyle = body; ctx.strokeStyle = out;
    for (let i = 0; i < 3; i++) {
      const bx = (0.04 + i * 0.07) * S, by = -1.05 * S;
      ctx.beginPath();
      ctx.moveTo(bx - 0.03 * S, by + 0.04 * S);
      ctx.lineTo(bx, by - 0.07 * S);
      ctx.lineTo(bx + 0.03 * S, by + 0.04 * S);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // cheek + snout shading and the tubular mouth
    ctx.strokeStyle = rgba('#C8861F', 0.6);
    ctx.lineWidth = Math.max(0.6, 0.016 * S);
    ctx.beginPath(); ctx.moveTo(0.40 * S, -0.88 * S); ctx.lineTo(0.57 * S, -0.88 * S); ctx.stroke();

    // eye on the head
    ctx.fillStyle = '#2a1a08';
    ctx.beginPath(); ctx.arc(0.26 * S, -0.84 * S, 0.05 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0.275 * S, -0.855 * S, 0.018 * S, 0, TAU); ctx.fill();

    ctx.restore();
  }

  // ── Hidden flatfish (sole) + sand puffs ──────────────────────────────────
  // Lies camouflaged in the open sand; a click on the sand makes it bolt out in
  // a puff of disturbed sand, swim a short hop, and re-bury somewhere else.
  function spawnSandPuff(x, y, scale) {
    const n = 5 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) {
      FXSAND.push({
        x: x + (Math.random() - 0.5) * FLATFISH.s * 1.2,
        y: y + (Math.random() - 0.5) * FLATFISH.s * 0.5,
        r0: (3 + Math.random() * 4) * scale,
        vx: (Math.random() - 0.5) * 26,
        vy: -(8 + Math.random() * 16) * scale,
        t0: lastT, life: 0.7 + Math.random() * 0.5,
      });
    }
  }
  function flatfishSandSpot() {
    const fx = W * (0.15 + Math.random() * 0.7);
    return { x: fx, y: sandTopAt(fx) + FLATFISH.s * 0.32 };
  }
  function startFlatfishDart(t) {
    const f = FLATFISH;
    if (f.state !== 'buried' || t < f.cool) return;
    spawnSandPuff(f.x, f.y - f.s * 0.1, 1);              // bursts from its hiding spot
    let spot = flatfishSandSpot(), tries = 0;
    while (Math.abs(spot.x - f.x) < W * 0.18 && tries++ < 6) spot = flatfishSandSpot();
    f.fromX = f.x; f.fromY = f.y; f.toX = spot.x; f.toY = spot.y;
    f.state = 'dart'; f.t0 = t; f.dur = 1.2 + Math.random() * 0.5;
  }
  function updateFlatfish(t) {
    const f = FLATFISH;
    if (f.state === 'buried') {                          // also moves on its own every few minutes
      if (f.nextAuto == null) f.nextAuto = t + 120 + Math.random() * 120;
      if (t >= f.nextAuto && t >= f.cool) { startFlatfishDart(t); f.nextAuto = null; }
      return;
    }
    const p = (t - f.t0) / f.dur;
    if (p >= 1) {
      f.state = 'buried'; f.x = f.toX; f.y = f.toY; f.cool = t + 0.8;
      spawnSandPuff(f.x, f.y - f.s * 0.1, 0.7);          // settling puff as it re-buries
      return;
    }
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // ease in-out
    f.x = f.fromX + (f.toX - f.fromX) * e;
    f.y = f.fromY + (f.toY - f.fromY) * e - Math.sin(p * Math.PI) * f.s * 1.7;  // hops off the sand
  }
  function drawFlatfish(t) {
    const f = FLATFISH, s = f.s;
    const darting = f.state === 'dart';
    const alpha = darting ? 1 : 0.5;                     // camouflaged when at rest
    ctx.save();
    ctx.translate(f.x, f.y);
    let undul = 0;
    if (darting) {
      ctx.scale(f.toX >= f.fromX ? 1 : -1, 1);           // face travel direction
      undul = Math.sin(t * 14 + f.phase);
    }
    ctx.globalAlpha = alpha;
    // flat leaf-shaped body — snout at the right, tail to the left.
    // brighter/contrastier while darting so the motion reads; sandy at rest.
    ctx.fillStyle = darting ? '#dcae5e' : '#c2a474';
    ctx.beginPath();
    ctx.moveTo(s * 0.95, 0);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.5, -s * 0.6, -s * 0.22 + undul * s * 0.14);
    ctx.quadraticCurveTo(-s * 1.05, 0, -s * 0.6, s * 0.22 + undul * s * 0.14);
    ctx.quadraticCurveTo(s * 0.3, s * 0.5, s * 0.95, 0);
    ctx.closePath();
    ctx.fill();
    // wavy fin fringe
    ctx.strokeStyle = darting ? 'rgba(120,86,40,0.9)' : 'rgba(150,120,80,0.5)';
    ctx.lineWidth = s * (darting ? 0.06 : 0.05);
    ctx.stroke();
    // mottled spots for camouflage
    ctx.fillStyle = darting ? 'rgba(120,95,60,0.5)' : 'rgba(120,95,60,0.42)';
    for (const [sx, sy, sr] of [[0.1, -0.12, 0.12], [-0.25, 0.1, 0.1], [0.35, 0.18, 0.08], [-0.45, -0.08, 0.07]]) {
      ctx.beginPath(); ctx.ellipse(sx * s, sy * s, sr * s, sr * s * 0.8, 0, 0, TAU); ctx.fill();
    }
    // both eyes on the up-facing side (flounder), near the head
    ctx.fillStyle = '#2a1d0c';
    ctx.beginPath(); ctx.arc(s * 0.46, -s * 0.12, s * 0.07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.46, s * 0.06, s * 0.07, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawFxSand(t) {
    for (let i = FXSAND.length - 1; i >= 0; i--) {
      const p = FXSAND[i];
      const age = t - p.t0;
      if (age > p.life) { FXSAND.splice(i, 1); continue; }
      const q = age / p.life;
      const x = p.x + p.vx * age;
      const y = p.y + p.vy * age + 70 * age * age;        // puff up, then settle back
      const r = p.r0 * (1 + q * 2.2);
      ctx.fillStyle = `rgba(198, 170, 122, ${(0.5 * (1 - q)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }

  // ── Twinkle sparkles (a 4-point glint with a soft glow) ──────────────────
  function drawSparkleShape(x, y, s, a, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = a;
    ctx.fillStyle = rg(ctx, 0, 0, 0, s * 1.7, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(0, 0, s * 1.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU - Math.PI / 2, rr = i % 2 === 0 ? s : s * 0.32;
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function spawnSparkles(x, y, n) {
    const m = Math.min(W, H);
    for (let i = 0; i < n; i++)
      FXSPARK.push({ x: x + (Math.random() - 0.5) * m * 0.13, y: y + (Math.random() - 0.5) * m * 0.10,
                     born: lastT, life: 0.6 + Math.random() * 0.55, s: 2.5 + Math.random() * 3.5, rot: Math.random() * TAU });
  }
  function drawFxSpark(t) {
    for (let i = FXSPARK.length - 1; i >= 0; i--) {
      const p = FXSPARK[i], age = t - p.born;
      if (age > p.life) { FXSPARK.splice(i, 1); continue; }
      const env = Math.sin((age / p.life) * Math.PI);
      drawSparkleShape(p.x, p.y, p.s * (0.5 + 0.7 * env), env, p.rot + age * 4);
    }
  }

  // ── Jellyfish (a drifting, pulsing group) ────────────────────────────────
  function drawOneJelly(x, y, s, pulse, hue, t, ph, flash) {
    flash = flash || 0;
    const bw = s * (1.1 - 0.12 * pulse), bh = s * (0.75 + 0.18 * pulse);  // bell squashes as it pulses
    ctx.save();
    ctx.translate(x, y);
    // soft glow — flares bright white when the jelly is tapped (flash)
    const gR = bw * (1.9 + flash * 1.6);
    ctx.fillStyle = rg(ctx, 0, -bh * 0.2, 0, gR, [
      [0, flash > 0.04 ? `rgba(255,255,255,${(0.2 + 0.6 * flash).toFixed(3)})` : rgba(hue, 0.16)],
      [1, rgba(hue, 0)]]);
    ctx.beginPath(); ctx.arc(0, -bh * 0.2, gR, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(hue, 0.45);                                      // trailing tentacles
    ctx.lineWidth = Math.max(1, s * 0.06);
    const nT = 5;
    for (let i = 0; i < nT; i++) {
      const tx0 = -bw * 0.6 + (i / (nT - 1)) * bw * 1.2, len = s * (2.2 + (i % 2) * 0.9);
      ctx.beginPath(); ctx.moveTo(tx0, 0);
      for (let k = 1; k <= 4; k++) { const f = k / 4; ctx.lineTo(tx0 + Math.sin(t * 3 + ph + i + f * 4) * s * 0.4 * f, f * len); }
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(hue, 0.62);                                      // thicker oral arms
    ctx.lineWidth = Math.max(1.5, s * 0.12);
    for (let i = 0; i < 3; i++) {
      const tx0 = (-1 + i) * bw * 0.28;
      ctx.beginPath(); ctx.moveTo(tx0, 0);
      for (let k = 1; k <= 3; k++) { const f = k / 3; ctx.lineTo(tx0 + Math.sin(t * 2.5 + ph + i + f * 3) * s * 0.3 * f, f * s * 1.3); }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(hue, 0.5 + 0.35 * flash);                         // translucent bell (brighter when flashing)
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, Math.PI, TAU);
    const sc = 5;
    for (let i = 1; i <= sc; i++) { const fx = bw - (i / sc) * 2 * bw; ctx.quadraticCurveTo(fx + bw / sc, bh * 0.34, fx, 0); }
    ctx.closePath(); ctx.fill();
    if (flash > 0.04) {                                                    // white flash overlay on the bell
      ctx.fillStyle = `rgba(255,255,255,${(0.7 * flash).toFixed(3)})`;
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';                              // inner highlight
    ctx.beginPath(); ctx.ellipse(-bw * 0.25, -bh * 0.3, bw * 0.3, bh * 0.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(hue, 0.7); ctx.lineWidth = Math.max(1, s * 0.05);  // rim
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, Math.PI, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawJellies(t) {
    const cur = curX(t), pred = giantNear();
    for (const j of JELLIES) {
      const margin = j.s * 4;
      if (j.parked) {                                  // hid off-screen while a giant passed
        if (!pred) { j.parked = false; j.x = j.vx > 0 ? -margin : W + margin; j.y = H * (0.22 + Math.random() * 0.34); }
        else { continue; }
      }
      j.x += j.vx * (pred ? 4.5 : 1) + cur * 0.3;       // pulse hard away from a giant
      // drift off the screen, then re-enter from the far side at a fresh depth
      if ((j.vx > 0 && j.x > W + margin) || (j.vx < 0 && j.x < -margin)) {
        if (pred) { j.parked = true; continue; }        // stay hidden until it leaves
        j.x = j.vx > 0 ? -margin : W + margin;
        j.y = H * (0.22 + Math.random() * 0.34);
        j.phase = Math.random() * TAU;
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * j.pulseSpd + j.phase);
      const y = j.y + Math.sin(t * j.pulseSpd + j.phase - 0.6) * j.s * 0.5 + Math.sin(t * 0.5 + j.phase) * 8;
      let flash = 0;
      if (j.flashT != null) {
        const age = t - j.flashT;
        if (age > 0.8) j.flashT = null;
        else flash = Math.abs(Math.sin(age * 16)) * (1 - age / 0.8);      // a few quick blinks, fading
      }
      j.drawY = y;                                                        // remember for click hit-testing
      drawOneJelly(j.x, y, j.s, pulse, j.hue, t, j.phase, flash);
    }
  }

  // ── Cleaning station ─────────────────────────────────────────────────────
  function spawnCleanClient(t) {
    const cs = CLEANSTATION;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const ex = dir > 0 ? -Math.min(W, H) * 0.12 : W + Math.min(W, H) * 0.12;
    const kind = ['tang', 'tang', 'dolphin', 'shark'][Math.random() * 4 | 0];   // tang most common
    cs.client = {
      kind, dir, state: 'in', t0: t, x: ex, y: cs.y + (Math.random() - 0.5) * H * 0.05,
      entryX: ex, outFrom: 0, dur: 0, s: Math.min(W, H) * (kind === 'tang' ? 0.05 : 0.06), gape: 0,
      phase: Math.random() * TAU, col: ['#A65E4A', '#8C7A48', '#6E8A6A'][Math.random() * 3 | 0],
      cleanFrac: 0, sparkled: false,                     // parasite spots get picked off, then it sparkles
      spots: Array.from({ length: 5 + (Math.random() * 4 | 0) }, () => ({
        ox: (Math.random() - 0.5) * 1.3, oy: (Math.random() - 0.5) * 0.8,
        r: 0.05 + Math.random() * 0.05, off: Math.random(),
      })),
    };
    cs.nextAt = null;
  }
  function updateCleanStation(t, dt) {
    const cs = CLEANSTATION;
    if (!cs.client) {
      if (cs.nextAt == null) cs.nextAt = t + 285 + Math.random() * 30;   // a client visits about once every 5 minutes
      if (t >= cs.nextAt) spawnCleanClient(t);
    } else {
      const cl = cs.client;
      if (cl.state === 'in') {
        const p = (t - cl.t0) / 2.0;
        const e = p < 1 ? p * p * (3 - 2 * p) : 1;
        cl.x = cl.entryX + (cs.x - cl.entryX) * e;
        cl.y += (cs.y - cl.y) * 0.08;
        if (p >= 1) { cl.state = 'clean'; cl.t0 = t; cl.dur = 5 + Math.random() * 3; }
      } else if (cl.state === 'clean') {
        cl.x += (cs.x - cl.x) * 0.1;
        cl.y += (cs.y - cl.y) * 0.1 + Math.sin(t * 1.5 + cl.phase) * 0.15;
        cl.gape = 0.5 + 0.5 * Math.sin(t * 2.4);          // mouth opens & closes
        cl.cleanFrac = Math.min(1, (t - cl.t0) / (cl.dur * 0.8));  // spots picked off over time
        if (cl.cleanFrac >= 1 && !cl.sparkled) { spawnSparkles(cl.x, cl.y, 9); cl.sparkled = true; }  // all clean → sparkle
        if ((t - cl.t0) / cl.dur >= 1) { cl.state = 'out'; cl.t0 = t; cl.outFrom = cl.x; cl.gape = 0; }
      } else {                                            // out — swims on the way it came
        const p = (t - cl.t0) / 2.4;
        const target = cl.dir > 0 ? W + Math.min(W, H) * 0.14 : -Math.min(W, H) * 0.14;
        cl.x = cl.outFrom + (target - cl.outFrom) * (p * p);
        if (p >= 1) { cs.client = null; cs.nextAt = t + 285 + Math.random() * 30; }   // next visit ~5 minutes later
      }
    }
    // the signboard shows while a client is visiting, fades out when it leaves
    const want = (cs.client && cs.client.state !== 'out') ? 1 : 0;
    cs.signF += (want - cs.signF) * 0.08;
  }
  // a little signboard reading "תַּחֲנַת נִיקּוּי" (Cleaning Station) on a post
  function drawCleanSign(t, f) {
    const cs = CLEANSTATION, m = Math.min(W, H);
    const bx = cs.x + m * 0.17, groundY = sandTopAt(bx) + 4;
    const postH = m * 0.14, boardW = m * 0.27, boardH = m * 0.072;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.translate(bx, groundY);
    ctx.rotate(Math.sin(t * 1.2) * 0.02);
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = Math.max(2, m * 0.012); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -postH); ctx.stroke();
    const by = -postH - boardH, x0 = -boardW / 2, r = Math.max(3, m * 0.012);
    ctx.fillStyle = '#f3e1b8'; ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1.5, m * 0.006);
    ctx.beginPath();
    ctx.moveTo(x0 + r, by); ctx.lineTo(x0 + boardW - r, by);
    ctx.quadraticCurveTo(x0 + boardW, by, x0 + boardW, by + r);
    ctx.lineTo(x0 + boardW, by + boardH - r);
    ctx.quadraticCurveTo(x0 + boardW, by + boardH, x0 + boardW - r, by + boardH);
    ctx.lineTo(x0 + r, by + boardH);
    ctx.quadraticCurveTo(x0, by + boardH, x0, by + boardH - r);
    ctx.lineTo(x0, by + r); ctx.quadraticCurveTo(x0, by, x0 + r, by);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a1c';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.font = `700 ${Math.round(boardH * 0.46)}px 'Nunito','Arial Hebrew',sans-serif`;
    ctx.fillText('תַּחֲנַת נִיקּוּי', 0, by + boardH * 0.54);
    // carnival-marquee bulbs chasing around the board edge
    const bulbs = [], nx = 7, ny = 2, cols = ['#FFE066', '#FF6F91', '#7DE0FF', '#9BE88B'];
    for (let i = 0; i < nx; i++) { const fx = x0 + (i / (nx - 1)) * boardW; bulbs.push([fx, by]); bulbs.push([fx, by + boardH]); }
    for (let j = 1; j <= ny; j++) { const fy = by + (j / (ny + 1)) * boardH; bulbs.push([x0, fy]); bulbs.push([x0 + boardW, fy]); }
    const br = Math.max(1.5, boardH * 0.13);
    bulbs.forEach(([bxp, byp], i) => {
      const lit = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 6 - i * 0.9));   // chase/blink
      ctx.fillStyle = `rgba(255,250,210,${(0.25 * lit).toFixed(3)})`;       // glow
      ctx.beginPath(); ctx.arc(bxp, byp, br * 2.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = f * (0.4 + 0.6 * lit);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(bxp, byp, br, 0, TAU); ctx.fill();
      ctx.globalAlpha = f;
    });
    ctx.restore();
  }
  // parasite spots the cleaner picks off — drawn in a fish's own body-local
  // frame (so they ride along), vanishing one by one as f.cleanFrac rises
  function bodySpots(f) {
    if (!f.cleanSpots) return;
    ctx.fillStyle = 'rgba(30, 24, 18, 0.72)';
    for (const sp of f.cleanSpots) {
      if (sp.off < (f.cleanFrac || 0)) continue;
      ctx.beginPath(); ctx.ellipse(sp.ox * f.s, sp.oy * f.s, sp.r * f.s, sp.r * f.s, 0, 0, TAU); ctx.fill();
    }
  }
  // the cleaning "client" — reuses the SAME art as the free-swimming reef
  // creatures (a blue tang / a dolphin / a shark), hovering to be cleaned, with
  // parasite spots that the cleaner picks off
  function drawClient(cl, t) {
    const common = { vx: cl.dir * 0.001, s: cl.s, phase: cl.phase, rollT: null, dashT: null,
                     cleanSpots: cl.spots, cleanFrac: cl.cleanFrac };
    if (cl.kind === 'dolphin')
      drawDolphin({ ...common, x: cl.x, baseY: cl.y, nextBreathAt: 1e9, breathT0: null }, t);
    else if (cl.kind === 'shark')
      drawShark({ ...common, x: cl.x, y: cl.y, hue: '#8d9aa6' }, t);
    else                                              // 'tang' — Dory template, recoloured purple/orange
      drawDory({ ...common, x: cl.x, baseY: cl.y, buddy: null,
                 pal: { body: ['#8a4fc4', '#6e37a8', '#4f2480'], tail: '#F08A2C',
                        ink: '#241433', window: '#a96fe0', pec: 'rgba(240,138,44,0.9)' } }, t);
  }
  // cleaner wrasse — built on the clownfish (Nemo) rig but recoloured: a blue
  // body with bold horizontal lateral stripes
  function drawCleanerFish(x, y, dir, t, ph) {
    const s = Math.max(5, Math.min(W, H) * 0.016);
    const wag = Math.sin(t * 10 + ph) * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const BLUE = '#5BB6E6', BODYLO = '#3E92C8', DARK = '#12303f';

    // rounded caudal fin
    ctx.save();
    ctx.translate(-s * 0.9, 0);
    ctx.rotate(wag * 0.4);
    ctx.fillStyle = rgba(BLUE, 0.92); ctx.strokeStyle = DARK; ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.14);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.3, -s * 0.56, 0);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.3, 0, s * 0.14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    // slim body
    ctx.fillStyle = lg(ctx, 0, -s * 0.5, 0, s * 0.5, [[0, BLUE], [0.6, BODYLO], [1, '#2f7aa8']]);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.5, 0, 0, TAU); ctx.fill();

    // low dorsal + anal fins
    ctx.fillStyle = rgba(BLUE, 0.95); ctx.strokeStyle = DARK; ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.4); ctx.quadraticCurveTo(0, -s * 0.66, -s * 0.55, -s * 0.4);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.46, s * 0.5, -s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.4, s * 0.4); ctx.quadraticCurveTo(-s * 0.05, s * 0.66, -s * 0.5, s * 0.4);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.46, s * 0.4, s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();

    // horizontal stripes (clipped to the body) — bold midline one widening to the
    // tail, plus a thinner lower stripe
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.5, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.moveTo(s * 1.05, -s * 0.05);
    ctx.lineTo(-s * 1.15, -s * 0.2);
    ctx.lineTo(-s * 1.15, s * 0.18);
    ctx.lineTo(s * 1.05, s * 0.07);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(DARK, 0.65);
    ctx.fillRect(-s * 1.15, s * 0.26, s * 2.2, s * 0.07);
    ctx.restore();

    // pectoral fin
    ctx.save();
    ctx.translate(s * 0.25, s * 0.06);
    ctx.rotate(0.4 + wag * 0.5);
    ctx.fillStyle = 'rgba(150, 215, 245, 0.85)'; ctx.strokeStyle = rgba(DARK, 0.6); ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.ellipse(0, s * 0.13, s * 0.09, s * 0.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();

    // big sweet eye with a sparkle (over the stripe)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.05, s * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f2230';
    ctx.beginPath(); ctx.arc(s * 0.66, -s * 0.04, s * 0.085, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(s * 0.69, -s * 0.08, s * 0.03, 0, TAU); ctx.fill();
    // little smile
    ctx.strokeStyle = '#0e2433'; ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.98, s * 0.07); ctx.quadraticCurveTo(s * 0.84, s * 0.17, s * 0.66, s * 0.16); ctx.stroke();
    ctx.restore();
  }
  function drawCleanStation(t) {
    const cs = CLEANSTATION;
    if (cs.client) drawClient(cs.client, t);
    // the cleaner: weaves around a visiting client, else hovers over the station
    let cx, cy, cdir;
    const c = cs.client;
    if (c && c.state === 'clean') {
      const a = t * 2.2 + cs.cphase;
      cx = c.x + Math.cos(a) * c.s * 0.95 * c.dir;
      cy = c.y + Math.sin(t * 3.1 + cs.cphase) * c.s * 0.5;
      cdir = Math.cos(a) >= 0 ? c.dir : -c.dir;
    } else {
      cx = cs.x + Math.sin(t * 1.5 + cs.cphase) * 18;
      cy = cs.y - 4 + Math.sin(t * 2.1 + cs.cphase) * 10;
      cdir = Math.cos(t * 1.5 + cs.cphase) >= 0 ? 1 : -1;
    }
    drawCleanerFish(cx, cy, cdir, t, cs.cphase);
  }

  // ── Coral spawning (rare) ────────────────────────────────────────────────
  function updateCoralSpawn(t, dt) {
    const sp = SPAWN;
    if (sp.nextAt == null) sp.nextAt = t + 40 + Math.random() * 50;   // first event after a while
    if (!sp.active && t >= sp.nextAt) { sp.active = true; sp.t0 = t; }
    if (sp.active) {
      if (t - sp.t0 > 5.5) { sp.active = false; sp.nextAt = t + 150 + Math.random() * 150; }
      else if (sp.parts.length < 150) {                 // release bundles from the coral heads
        for (let i = 0; i < 3; i++) {
          const pt = sp.points[(Math.random() * sp.points.length) | 0];
          sp.parts.push({
            x: pt.x + (Math.random() - 0.5) * W * 0.05, y: pt.y - Math.random() * 6,
            vx: (Math.random() - 0.5) * 6, vy: -(34 + Math.random() * 20),
            r: 1 + Math.random() * 1.8, ph: Math.random() * TAU, born: t, life: 7 + Math.random() * 4,
          });
        }
      }
    }
    const cur = curX(t);
    for (let i = sp.parts.length - 1; i >= 0; i--) {
      const p = sp.parts[i];
      if (t - p.born > p.life || p.y < H * 0.04) { sp.parts.splice(i, 1); continue; }
      p.x += (p.vx + cur * 9) * dt;
      p.y += p.vy * dt;
    }
  }
  function drawCoralSpawn(t) {
    for (const p of SPAWN.parts) {
      const age = t - p.born;
      const fadeIn = Math.min(1, age / 0.6);
      const fadeOut = Math.min(1, (p.y - H * 0.04) / (H * 0.2));   // dims as it nears the surface
      const a = 0.6 * fadeIn * Math.max(0, fadeOut);
      const x = p.x + Math.sin(t * 1.5 + p.ph) * 3;
      ctx.fillStyle = `rgba(255, 224, 234, ${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill();
    }
  }
  // a single coral head releases a burst of egg bundles when tapped
  function spawnCoralBurst(pt, t) {
    const sp = SPAWN;
    if (sp.parts.length > 220) return;
    const base = pt.y;
    for (let i = 0; i < 30; i++)
      sp.parts.push({ x: pt.x + (Math.random() - 0.5) * W * 0.05, y: base - Math.random() * H * 0.04,
                      vx: (Math.random() - 0.5) * 8, vy: -(34 + Math.random() * 22),
                      r: 1 + Math.random() * 1.8, ph: Math.random() * TAU, born: t, life: 7 + Math.random() * 4 });
    burstBubbles(pt.x, base - 6, 4);
  }

  // ── Rain (occasional, seen from below) ───────────────────────────────────
  function updateRain(t, dt) {
    const r = RAIN;
    if (r.nextAt == null) r.nextAt = t + 50 + Math.random() * 70;     // first shower after a while
    if (!r.active && t >= r.nextAt) { r.active = true; r.t0 = t; r.dur = 12 + Math.random() * 10; }
    if (r.active) {
      const age = t - r.t0;
      if (age > r.dur) { r.active = false; r.nextAt = t + 90 + Math.random() * 120; r.intensity = 0; }
      else {
        r.intensity = Math.max(0, Math.min(Math.min(1, age / 2), Math.min(1, (r.dur - age) / 2)));  // ramp in/out
        if (r.dimples.length < 70 && Math.random() < 0.7) {           // pock the surface
          for (let i = 0; i < 2; i++)
            r.dimples.push({ x: Math.random() * W, y: H * (0.016 + Math.random() * 0.022),
                             born: t, life: 0.9 + Math.random() * 0.6 });
        }
      }
    }
    for (let i = r.dimples.length - 1; i >= 0; i--)
      if (t - r.dimples[i].born > r.dimples[i].life) r.dimples.splice(i, 1);
  }
  function drawRain(t) {
    const r = RAIN;
    if (r.intensity <= 0 && !r.dimples.length) return;
    if (r.intensity > 0) {                                           // soft overcast dimming
      ctx.fillStyle = `rgba(18, 40, 66, ${(0.16 * r.intensity).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of r.dimples) {                                     // expanding ring ripples
      const q = (t - d.born) / d.life;
      const rx = 2 + q * 16;
      const a = 0.5 * (1 - q);
      ctx.strokeStyle = `rgba(225, 248, 255, ${a.toFixed(3)})`;
      ctx.lineWidth = 1.2 * (1 - q) + 0.3;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, rx * 0.32, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
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
    const cur = curX(t);
    for (const tn of a.tents) {
      if (tn.front !== front) continue;
      const rootX = a.x + tn.dx * a.s * 0.55;
      const rootY = a.y - a.s * 0.18;
      // the crown drifts with the current, each tentacle keeping its own ripple
      const sway = (cur * 0.85 + Math.sin(t * 1.5 + tn.phase) * 0.5) * a.s * 0.16;
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
        else {                                          // blows a bubble ring + a fish swims through it
          const rdir = f.vx > 0 ? 1 : -1;
          const cols = ['#FFC247', '#FF8A4C', '#5AB6E8', '#F46A9B', '#8DD17A'];
          FXRINGS.push({ x: h.x + rdir * f.s * 1.4, y: h.y - f.s * 0.2, t0: t,
                         dir: rdir, col: cols[(Math.random() * cols.length) | 0],
                         ph: Math.random() * TAU });
        }
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
      case 'school':  // the swarm opens a hole around the tap and flows back together
                      SCHOOL.avoid = { x: cx != null ? cx : h.x, y: cy != null ? cy : h.y, t0: t, strength: 1.7 };
                      break;
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

    bodySpots(sh);                                    // parasite spots (cleaning client only)
    ctx.restore();

    // even sharks have to go sometimes
    const shY = sh.y + Math.sin(t * 0.7 + sh.phase) * 6;
    const shDir = sh.vx > 0 ? 1 : -1;
    updatePoop(sh, sh.x - shDir * s * 1.15, shY + s * 0.16, t, Math.max(2, s * 0.055));
  }

  // ── Dolphin pod — adults + a baby swim together; positions set by updatePod ──
  function spawnPod() {
    const adults = 1 + (Math.random() * 3 | 0);          // 1–3 adults
    const dir = Math.random() < 0.5 ? 1 : -1;
    const aS = Math.min(W, H) * 0.052;
    POD = { dir, vx: dir * (1.0 + Math.random() * 0.4),
            x: dir > 0 ? -W * 0.25 : W * 1.25, baseY: H * (0.12 + Math.random() * 0.16) };
    const slots = [[0, 0], [W * 0.16, H * 0.05], [W * 0.13, -H * 0.06]];   // echelon behind the lead
    DOLPHS = [];
    for (let i = 0; i < adults; i++)
      DOLPHS.push({ behind: slots[i][0], oy: slots[i][1], s: aS * (0.9 + Math.random() * 0.18),
                    phase: Math.random() * TAU, baby: false, x: 0, baseY: 0, vx: POD.vx });
    DOLPHS.push({ behind: W * 0.06, oy: H * 0.055, s: aS * 0.5,             // the calf, tucked beside the lead
                  phase: Math.random() * TAU, baby: true, x: 0, baseY: 0, vx: POD.vx });
  }
  function updatePod() {
    POD.x += POD.vx;
    const reach = Math.min(W, H) * 0.45;
    if ((POD.dir > 0 && POD.x > W + reach) || (POD.dir < 0 && POD.x < -reach)) spawnPod();
    for (const d of DOLPHS) {
      d.vx = POD.vx;
      d.x = POD.x - POD.dir * d.behind;
      d.baseY = POD.baseY + d.oy;
    }
  }
  function drawDolphin(d, t) {
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

    bodySpots(d);                                     // parasite spots (cleaning client only)
    ctx.restore();

    // dolphins answer nature's call too
    updatePoop(d, d.x - dir * s * 1.3, y + s * 0.18, t, Math.max(1.5, s * 0.06));
  }

  // a tang body drawn at (x,y) with no movement/wrap — used by shoals AND by
  // drawDory (free-swimmer) and the recoloured cleaning client (via d.pal)
  function drawTangBody(x, y, dir, t, phase, roll, s, pal, spotsObj) {
    const P = pal || { body: ['#2750cc', '#1c3cb0', '#142a84'], tail: '#f4c812',
                       ink: '#0e1626', window: '#1d49c8', pec: 'rgba(244, 200, 18, 0.9)' };
    const INK = P.ink, wag = Math.sin(t * 5.5 + phase) * 0.3;
    ctx.save();
    ctx.translate(x, y);
    if (roll) ctx.rotate(dir > 0 ? -roll : roll);
    ctx.scale(dir, 1);
    // caudal fin
    ctx.save();
    ctx.translate(-s * 0.92, 0); ctx.rotate(wag * 0.3);
    ctx.fillStyle = P.tail;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.18); ctx.lineTo(-s * 0.52, -s * 0.42); ctx.lineTo(-s * 0.36, 0);
    ctx.lineTo(-s * 0.52, s * 0.42); ctx.lineTo(0, s * 0.18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = s * 0.055;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.18); ctx.lineTo(-s * 0.5, -s * 0.40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.18);  ctx.lineTo(-s * 0.5, s * 0.40);  ctx.stroke();
    ctx.restore();
    // disc body
    ctx.fillStyle = lg(ctx, 0, -s * 0.62, 0, s * 0.62, [[0, P.body[0]], [0.55, P.body[1]], [1, P.body[2]]]);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.64, 0, 0, TAU); ctx.fill();
    // dorsal + anal fins
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.moveTo(s * 0.55, -s * 0.42); ctx.quadraticCurveTo(0, -s * 0.88, -s * 0.62, -s * 0.52); ctx.quadraticCurveTo(-s * 0.2, -s * 0.56, s * 0.55, -s * 0.42); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.46); ctx.quadraticCurveTo(-s * 0.15, s * 0.82, -s * 0.62, s * 0.5); ctx.quadraticCurveTo(-s * 0.2, s * 0.55, s * 0.3, s * 0.46); ctx.closePath(); ctx.fill();
    // palette loop + window
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.moveTo(s * 0.72, -s * 0.16); ctx.quadraticCurveTo(s * 0.2, -s * 0.62, -s * 0.55, -s * 0.48); ctx.quadraticCurveTo(-s * 0.98, -s * 0.26, -s * 0.88, -s * 0.02); ctx.quadraticCurveTo(-s * 0.55, s * 0.14, -s * 0.08, s * 0.06); ctx.quadraticCurveTo(s * 0.42, 0, s * 0.72, -s * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.window;
    ctx.beginPath(); ctx.ellipse(-s * 0.20, -s * 0.25, s * 0.40, s * 0.15, -0.18, 0, TAU); ctx.fill();
    // pectoral fin
    ctx.save(); ctx.translate(s * 0.22, s * 0.10); ctx.rotate(0.35 + wag * 0.45); ctx.fillStyle = P.pec;
    ctx.beginPath(); ctx.ellipse(0, s * 0.16, s * 0.12, s * 0.26, 0, 0, TAU); ctx.fill(); ctx.restore();
    // eye + smile
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.16, s * 0.17, 0, TAU); ctx.fill();
    ctx.fillStyle = '#13203a'; ctx.beginPath(); ctx.arc(s * 0.63, -s * 0.15, s * 0.095, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.66, -s * 0.20, s * 0.035, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#101c36'; ctx.lineWidth = s * 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.98, s * 0.08); ctx.quadraticCurveTo(s * 0.84, s * 0.20, s * 0.68, s * 0.18); ctx.stroke();
    if (spotsObj) bodySpots(spotsObj);
    ctx.restore();
  }
  // free-swimming tang (also the cleaning-client tang, via d.pal) — advances & wraps
  function drawDory(d, t) {
    d.x += d.vx * dashBoost(d, t);
    if (d.vx > 0 && d.x > W + d.s * 4) { d.x = -d.s * 4; d.baseY = H * (0.22 + Math.random() * 0.35); }
    if (d.vx < 0 && d.x < -d.s * 4)    { d.x = W + d.s * 4; d.baseY = H * (0.22 + Math.random() * 0.35); }
    const s = d.s, dir = d.vx > 0 ? 1 : -1;
    const y = d.baseY + Math.sin(t * 0.8 + d.phase) * 26;
    drawTangBody(d.x, y, dir, t, d.phase, rollAng(d, t), s, d.pal, d);
    const b = d.buddy;
    if (b) {
      const bx = d.x - dir * s * 2.4, by = y + Math.sin(t * 1.4 + b.phase) * 10 + s * 0.5;
      drawClown(bx, by, dir, Math.sin(t * 1.4 + b.phase) * 0.08, b.s, t, b.phase);
      updatePoop(b, bx - dir * b.s * 0.8, by + b.s * 0.28, t, Math.max(1.2, b.s * 0.07));
    }
    updatePoop(d, d.x - dir * s * 0.75, y + s * 0.30, t, Math.max(1.5, s * 0.07));
  }

  // ── Fish shoals — small same-species groups + the occasional mixed pair ───
  function spawnShoal(onScreen) {
    const m = Math.min(W, H), r = Math.random();
    const dir = Math.random() < 0.5 ? 1 : -1;
    const vx = dir * (0.5 + Math.random() * 0.4);
    const baseY = H * (0.24 + Math.random() * 0.42);
    const x = onScreen ? W * (0.15 + Math.random() * 0.7) : (dir > 0 ? -W * 0.15 : W * 1.15);
    let members;
    if (r < 0.16) {                                    // occasional Nemo + Dory pair together
      members = [{ kind: 'clown', ox: 0, oy: -m * 0.018, s: m * 0.02, phase: Math.random() * TAU },
                 { kind: 'tang',  ox: m * 0.07, oy: m * 0.02, s: m * 0.026, phase: Math.random() * TAU }];
    } else {
      const kind = r < 0.58 ? 'clown' : 'tang';        // a small group of one species, 3–4
      const n = 3 + (Math.random() * 2 | 0);
      const bs = kind === 'clown' ? m * 0.02 : m * 0.026;
      members = Array.from({ length: n }, (_, i) => ({
        kind, ox: i * bs * 2.0 + (Math.random() - 0.5) * bs, oy: (Math.random() - 0.5) * bs * 3,
        s: bs * (0.85 + Math.random() * 0.3), phase: Math.random() * TAU,
      }));
    }
    return { x, baseY, vx, dir, members, sp: 1.5 + Math.random() * 1.5 };   // a fixed 1.5×–3× cruise for this pass
  }
  function giantNear() { return WHALE.active || ORCA.active; }   // a giant on screen → fish flee
  function updateShoals() {
    const pred = giantNear(), reach = W * 0.22;
    if (!pred && SHOALS.fled) {                         // danger passed → the shoals swim back in
      for (let i = 0; i < SHOALS.length; i++) SHOALS[i] = spawnShoal(false);
      SHOALS.fled = false;
    }
    for (let i = 0; i < SHOALS.length; i++) {
      const g = SHOALS[i];
      g.x += g.vx * g.sp * (pred ? 4.5 : 1);            // fixed 1.5×–3× cruise; dart faster from a giant
      if ((g.vx > 0 && g.x > W + reach) || (g.vx < 0 && g.x < -reach)) {
        if (pred) SHOALS.fled = true;                   // stay off-screen until it leaves
        else SHOALS[i] = spawnShoal(false);
      }
    }
  }
  function drawShoals(t) {
    for (const g of SHOALS) for (const fm of g.members) {
      const mx = g.x - g.dir * fm.ox;
      if (mx < -fm.s * 3 || mx > W + fm.s * 3) continue;
      const my = g.baseY + fm.oy + Math.sin(t * 0.9 + fm.phase) * fm.s * 0.45;
      if (fm.kind === 'clown') drawClown(mx, my, g.dir, Math.sin(t * 1.3 + fm.phase) * 0.06, fm.s, t, fm.phase);
      else drawTangBody(mx, my, g.dir, t, fm.phase, 0, fm.s, null, null);
    }
  }

  function drawSchool(t) {
    const fleeing = giantNear();                        // a giant on screen → the school bolts away & scatters
    SCHOOL.leader.x += SCHOOL.leader.vx * SCHOOL.leader.sp * (fleeing ? 5 : 1);
    if (SCHOOL.leader.x > W + 150) {
      if (fleeing) SCHOOL.leader.x = W + 300;            // stay off-screen until the danger passes
      else { SCHOOL.leader.x = -150; SCHOOL.leader.y = H * (0.16 + Math.random() * 0.42); SCHOOL.leader.sp = 1.5 + Math.random() * 1.5; }
    }
    if (fleeing && (SCHOOL.scatterT == null || t - SCHOOL.scatterT > 1.8)) SCHOOL.scatterT = t;
    const lx = SCHOOL.leader.x, ly = SCHOOL.leader.y + Math.sin(t * 0.7) * 16;
    // a startled school bursts apart, then drifts back into formation
    let scF = 0;
    if (SCHOOL.scatterT != null) {
      scF = actEnv(SCHOOL.scatterT, t, 2.2);
      if (t - SCHOOL.scatterT >= 2.2) SCHOOL.scatterT = null;
    }
    // boids-style parting: members near the cursor/click point flow around it
    // and re-merge as it fades (hover = brief & soft, click = firmer & longer)
    const av = SCHOOL.avoid;
    const avLife = av.strength > 1 ? 1.6 : 0.45;
    const avK = Math.max(0, 1 - (t - av.t0) / avLife) * av.strength;
    const avR = Math.min(W, H) * 0.34;
    // bait ball: a cruising shark nearby makes the school tighten into a
    // rotating defensive ball; it disperses again once the shark moves off
    // (a charging shark instead triggers the panic scatter — see drawShark)
    let predatorNear = false;
    for (const sh of SHARKS) {
      const sy = sh.y + Math.sin(t * 0.7 + sh.phase) * 6;
      if (Math.hypot(sh.x - lx, sy - ly) < Math.min(W, H) * 0.55) predatorNear = true;
    }
    const ballTarget = (predatorNear && SCHOOL.scatterT == null) ? 1 : 0;
    SCHOOL.ballF += (ballTarget - SCHOOL.ballF) * 0.05;     // smooth form / disperse
    const bf = SCHOOL.ballF;
    for (const m of SCHOOL) {
      const wob = Math.sin(t * 3 + m.phase) * 5;
      let px = lx + m.ox + wob + (scF ? m.kix * scF : 0);
      let py = ly + m.oy + Math.cos(t * 2 + m.phase) * 4 + (scF ? m.kiy * scF : 0);
      if (avK > 0) {                                   // push radially away from the avoid point
        const dx = px - av.x, dy = py - av.y, d = Math.hypot(dx, dy) || 1;
        if (d < avR) {
          const push = avK * (1 - d / avR) * 64;
          px += dx / d * push; py += dy / d * push;
        }
      }
      if (bf > 0.01) {                                 // blend toward a tight, swirling bait ball
        const ang = Math.atan2(m.oy, m.ox) + t * 1.9;  // each member orbits the centre
        const rad = 14 + Math.hypot(m.ox, m.oy) * 0.32;
        const bx = lx + Math.cos(ang) * rad;
        const by = ly + Math.sin(ang) * rad * 0.82;
        px = px * (1 - bf) + bx * bf;
        py = py * (1 - bf) + by * bf;
      }
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

  function drawCrab(c, t) {
    // click reaction: a quick startled scuttle — hops, scrabbles fast, claws up
    let act = 0, hop = 0;
    if (c.actT != null) {
      const p = (t - c.actT) / 1.0;
      if (p >= 1) c.actT = null;
      else { act = Math.sin(p * Math.PI); hop = act * c.s * 0.55; }
    }
    c.x += c.dir * (0.3 + act * 2.0);                   // scuttles faster when startled
    if (c.x > c.hi) c.dir = -1;
    if (c.x < c.lo) c.dir = 1;
    const s = c.s;
    const y = sandTopAt(c.x) + s * 0.5 - hop;
    ctx.save();
    ctx.translate(c.x, y);

    const pal = c.pal;
    const legRate = 7 + act * 16, legAmp = 0.10 + act * 0.12;
    ctx.strokeStyle = pal.limb;
    ctx.lineWidth = s * 0.11;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const lift = Math.sin(t * legRate + c.phase + i * 2 + (side > 0 ? Math.PI : 0)) * s * legAmp;
        ctx.beginPath();
        ctx.moveTo(side * s * 0.48, s * 0.05);
        ctx.quadraticCurveTo(side * s * (0.82 + i * 0.12), s * 0.15, side * s * (0.95 + i * 0.17), s * 0.40 + lift);
        ctx.stroke();
      }
    }
    // Claws — held low while feeding, raised and waving when startled
    for (let side = -1; side <= 1; side += 2) {
      const wave = Math.sin(t * (2.2 + act * 12) + c.phase + side) * s * (0.06 + act * 0.10);
      const raise = act * s * 0.55;
      ctx.strokeStyle = pal.limb;
      ctx.lineWidth = s * 0.13;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.42, -s * 0.05);
      ctx.quadraticCurveTo(side * s * 0.75, -s * 0.12 - raise * 0.6, side * s * 0.85, -s * 0.26 + wave - raise);
      ctx.stroke();
      ctx.fillStyle = pal.claw;
      ctx.beginPath();
      ctx.arc(side * s * 0.88, -s * 0.32 + wave - raise, s * 0.16, 0, TAU);
      ctx.fill();
    }
    // Carapace
    ctx.fillStyle = lg(ctx, 0, -s * 0.4, 0, s * 0.3, [
      [0, pal.cara[0]],
      [1, pal.cara[1]],
    ]);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 0.42, 0, 0, TAU);
    ctx.fill();
    // mottling
    ctx.fillStyle = rgba(pal.dark, 0.4);
    [[-0.2, -0.1], [0.15, -0.18], [0.25, 0.05], [-0.05, 0.12]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(s * fx, s * fy, s * 0.06, 0, TAU);
      ctx.fill();
    });
    // Short eye stalks
    for (let side = -1; side <= 1; side += 2) {
      ctx.strokeStyle = pal.dark;
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

  // Sea stars on the open sand — sit still until tapped, then wiggle their arms
  function drawStars(t) {
    for (const st of STARS) {
      let act = 0, spin = 0, pulse = 1;
      if (st.actT != null) {
        const p = (t - st.actT) / 1.4;
        if (p >= 1) st.actT = null;
        else { act = Math.sin(p * Math.PI); spin = Math.sin(p * TAU) * 0.18; pulse = 1 + 0.12 * Math.sin(p * Math.PI); }
      }
      const size = st.s;
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot + spin);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(110, 75, 40, 0.28)';
      ctx.beginPath(); ctx.ellipse(0, size * 0.25, size * 1.1, size * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lg(ctx, 0, -size, 0, size, [[0, shade(st.col, 1.18)], [1, shade(st.col, 0.72)]]);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        let a = (i / 10) * TAU - Math.PI / 2;
        let r = i % 2 === 0 ? size : size * 0.48;
        if (i % 2 === 0) {                              // arm tip flexes with a travelling wave
          const w = Math.sin(t * 7 - (i >> 1) * 1.3);
          r *= 1 + act * 0.18 * w; a += act * 0.13 * w;
        }
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255, 235, 210, 0.45)';      // ossicle bumps down each arm
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        for (let d = 0.3; d <= 0.8; d += 0.25) {
          ctx.beginPath();
          ctx.arc(Math.cos(a) * size * d, Math.sin(a) * size * d, size * 0.05, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
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

    P.x += P.vx * P.sp * (1 - 0.85 * p) * dashBoost(P, t) * (giantNear() ? 3.5 : 1);  // fixed 1.5×–3× cruise; flees a giant
    if (P.vx > 0 && P.x > W + P.s * 5) { P.x = -P.s * 5; P.y = H * (0.4 + Math.random() * 0.3); P.sp = 1.5 + Math.random() * 1.5; }
    if (P.vx < 0 && P.x < -P.s * 5)    { P.x = W + P.s * 5; P.y = H * (0.4 + Math.random() * 0.3); P.sp = 1.5 + Math.random() * 1.5; }
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
    B.x += B.vx * B.sp * (giantNear() ? 3.5 : 1);     // fixed 1.5×–3× cruise; the pair flees a passing giant
    if (B.vx > 0 && B.x > W + B.s * 6) { B.x = -B.s * 6; B.baseY = H * (0.24 + Math.random() * 0.32); B.sp = 1.5 + Math.random() * 1.5; }
    if (B.vx < 0 && B.x < -B.s * 6)    { B.x = W + B.s * 6; B.baseY = H * (0.24 + Math.random() * 0.32); B.sp = 1.5 + Math.random() * 1.5; }
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
  // a small reef fish — body + tail, used to swim through the bubble ring
  function drawMiniFish(x, y, s, dir, col, t, ph) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const wig = Math.sin(t * 12 + ph) * 0.25;            // tail wiggle
    ctx.fillStyle = col;
    ctx.beginPath();                                     // body
    ctx.ellipse(0, 0, s, s * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();                                     // tail
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.5, -s * 0.5 + wig * s);
    ctx.lineTo(-s * 1.5, s * 0.5 + wig * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';            // eye
    ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.12, s * 0.16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#13202b';
    ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.12, s * 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // a dolphin's party trick: a bubble ring that rises, grows and wobbles —
  // and a curious little fish swims right through the middle of it
  function drawFxRings(t) {
    for (let i = FXRINGS.length - 1; i >= 0; i--) {
      const r = FXRINGS[i];
      const age = t - r.t0;
      if (age > 2.8) { FXRINGS.splice(i, 1); continue; }
      const q = age / 2.8;
      const wob = Math.sin(t * 5 + i) * 3 * q;
      const cx = r.x + wob, cy = r.y - age * 34;
      const rx = 8 + q * 30, ry = 4 + q * 16;
      const a = 1 - q;
      // the swimmer crosses the ring centre around mid-life (age 0.5–2.3 s)
      const sp = (age - 0.5) / 1.8;
      if (r.dir && sp > 0 && sp < 1) {
        drawMiniFish(cx + (sp - 0.5) * 150 * r.dir, cy, 5.5, r.dir, r.col, t, r.ph);
      }
      ctx.strokeStyle = `rgba(225, 248, 255, ${(0.7 * a).toFixed(3)})`;
      ctx.lineWidth = 2.4 - q * 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.35 * a).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy - ry * 0.3, rx * 0.8, ry * 0.5, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // ── Passing giants — shared scheduler: idle → cross the screen → reschedule ─
  function updateGiant(G, firstMin, firstMax, gapMin, gapMax, sizeF, yMin, yMax, speed, t, dt, blockedBy) {
    if (!G.active) {
      if (G.nextAt == null) G.nextAt = t + firstMin + Math.random() * (firstMax - firstMin);
      if (t < G.nextAt) return false;
      if (blockedBy && blockedBy()) { G.nextAt = t + 25 + Math.random() * 25; return false; }  // never share the surface with another giant
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

    // flukes — slow, mighty beats (overlap the body so they read as connected)
    ctx.save();
    ctx.translate(-s * 1.88, 0);
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
    // lighter ventral belly + grooves, clipped to the body. The belly is a SOFT
    // vertical gradient (transparent up top → light gray at the belly) so it
    // feathers in with no hard edge — i.e. no rectangular gray patch — and the
    // clipped grooves can't poke into the water (gaps are solid body, not see-through).
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = lg(ctx, 0, -s * 0.05, 0, s * 0.28, [
      [0, 'rgba(198, 214, 226, 0)'],
      [1, 'rgba(208, 224, 234, 0.92)'],
    ]);
    ctx.fillRect(-s * 2.1, -s * 0.32, s * 4.3, s * 0.64);
    ctx.strokeStyle = 'rgba(70, 100, 122, 0.45)';
    ctx.lineWidth = s * 0.013;
    for (let g = 0; g < 6; g++) {                          // grooves run the belly, fading into the peduncle
      const yf = 0.045 + g * 0.04;
      ctx.beginPath();
      ctx.moveTo(s * 1.9, s * (yf * 0.5));
      ctx.quadraticCurveTo(s * 0.2, s * (0.15 + yf), -s * 1.35, s * (yf * 0.4));
      ctx.stroke();
    }
    ctx.restore();
    // tail stock — a smooth peduncle (pointed at both ends, no hard edge) that
    // blends the narrowing body into the tail tip and the flukes
    ctx.fillStyle = '#3a5872';
    ctx.beginPath();
    ctx.moveTo(-s * 1.3, 0);
    ctx.quadraticCurveTo(-s * 1.7, -s * 0.07, -s * 2.0, 0);
    ctx.quadraticCurveTo(-s * 1.7, s * 0.07, -s * 1.3, 0);
    ctx.closePath(); ctx.fill();
    // tiny falcate dorsal fin, far back — base tucked into the body so it connects
    ctx.fillStyle = '#33506a';
    ctx.beginPath();
    ctx.moveTo(-s * 1.12, -s * 0.135);
    ctx.quadraticCurveTo(-s * 1.26, -s * 0.32, -s * 1.40, -s * 0.27);
    ctx.quadraticCurveTo(-s * 1.30, -s * 0.16, -s * 1.46, -s * 0.10);
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

    // bright-white chin + belly with a WAVY black/white flank boundary, clipped to body
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = '#fbfdff';
    ctx.beginPath();
    ctx.moveTo(s * 1.62, 0);
    ctx.quadraticCurveTo(s * 1.30, s * 0.22, s * 1.00, s * 0.14);    // wave
    ctx.quadraticCurveTo(s * 0.74, s * 0.06, s * 0.50, s * 0.22);    // wave
    ctx.quadraticCurveTo(s * 0.24, s * 0.36, -s * 0.02, s * 0.22);   // flank lobe rises
    ctx.quadraticCurveTo(-s * 0.30, s * 0.10, -s * 0.62, s * 0.30);  // dips back toward the tail
    ctx.lineTo(-s * 0.75, s * 0.5); ctx.lineTo(s * 1.72, s * 0.5);
    ctx.closePath();
    ctx.fill();
    // gray saddle patch behind the dorsal
    ctx.fillStyle = 'rgba(150, 165, 180, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.32, -s * 0.24, s * 0.26, s * 0.10, -0.25, 0, TAU);
    ctx.fill();
    ctx.restore();

    // the white eye patch — elliptical, lowered off the edge, tilt reversed
    ctx.fillStyle = '#f5f9fc';
    ctx.beginPath();
    ctx.ellipse(s * 0.92, -s * 0.10, s * 0.21, s * 0.082, 0.30, 0, TAU);
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
    // the real eye — set BELOW the white patch; small, round and cute (a glossy
    // black bead with a big catch-light + a tiny sparkle)
    const ex = s * 0.96, ey = -s * 0.005;
    ctx.fillStyle = 'rgba(20,30,42,0.35)';                // faint soft socket
    ctx.beginPath(); ctx.arc(ex, ey, s * 0.045, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0e14';                            // round eyeball (smaller)
    ctx.beginPath(); ctx.arc(ex, ey, s * 0.03, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';             // big cute catch-light
    ctx.beginPath(); ctx.arc(ex - s * 0.011, ey - s * 0.013, s * 0.015, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';              // tiny sparkle
    ctx.beginPath(); ctx.arc(ex + s * 0.013, ey + s * 0.009, s * 0.006, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ── Passing cloud shadow ─────────────────────────────────────────────────
  // Every ~40–110 s a soft shadow drifts across, ramping its dim in/out so the
  // whole reef gently darkens and brightens as the cloud passes the sun.
  function updateCloudShade(t, dt) {
    const cs = CLOUDSHADE;
    if (cs.next === null) cs.next = t + 14 + Math.random() * 22;   // first one fairly soon
    if (!cs.active && t >= cs.next) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      cs.active = true;
      cs.dir = dir;
      cs.w = W * (0.7 + Math.random() * 0.5);                      // cloud half-reach
      cs.x = dir > 0 ? -cs.w : W + cs.w;                           // enters off one side
      cs.spd = (W + cs.w * 2) / (16 + Math.random() * 12);         // crosses in ~16–28 s
      cs.peak = 0.30 + Math.random() * 0.16;                       // max dim
    }
    if (cs.active) {
      cs.x += cs.dir * cs.spd * dt;
      if ((cs.dir > 0 && cs.x > W + cs.w) || (cs.dir < 0 && cs.x < -cs.w)) {
        cs.active = false;
        cs.next = t + 40 + Math.random() * 70;
      }
    }
  }
  function drawCloudShade() {
    const cs = CLOUDSHADE;
    if (!cs.active) return;
    // soft 2D falloff centred in the upper water column: darkest under the cloud,
    // fading outward and toward the sand (depth softens the shadow)
    const g = rg(ctx, cs.x, H * 0.14, 0, cs.w, [
      [0,    `rgba(4, 20, 42, ${cs.peak.toFixed(3)})`],
      [0.55, `rgba(4, 20, 42, ${(cs.peak * 0.5).toFixed(3)})`],
      [1,    'rgba(4, 20, 42, 0)'],
    ]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ── A wooden boat hull gliding across the surface (seen from below) ──────
  function updateBoat(t, dt) {
    const b = BOAT;
    if (!b.active) {
      if (b.nextAt == null) b.nextAt = t + 20 + Math.random() * 30;
      if (t < b.nextAt) return false;
      if (WHALE.active) { b.nextAt = t + 25 + Math.random() * 25; return false; }  // never while the whale is on screen — keep their timings far apart
      b.active = true; b.dir = Math.random() < 0.5 ? 1 : -1;
      b.s = Math.min(W, H) * (0.15 + Math.random() * 0.06);
      b.x = b.dir > 0 ? -b.s * 2.8 : W + b.s * 2.8;
      b.nextAt = null;
    }
    b.x += b.dir * Math.min(W, H) * 0.08 * dt;            // a slow glide
    if ((b.dir > 0 && b.x > W + b.s * 2.9) || (b.dir < 0 && b.x < -b.s * 2.9)) {
      b.active = false; b.nextAt = t + 70 + Math.random() * 90; return false;
    }
    return true;
  }
  function drawBoat(b, t) {
    const s = b.s, L = s * 2.2, D = s * 0.55;
    const surfaceY = H * 0.03 + Math.sin(t * 0.6) * 3;    // rides the swell
    ctx.save();
    ctx.translate(b.x, surfaceY);
    ctx.rotate(Math.sin(t * 0.5) * 0.015 * b.dir);
    ctx.scale(b.dir, 1);
    // soft shadow the hull casts down into the water
    ctx.fillStyle = 'rgba(8, 40, 70, 0.18)';
    ctx.beginPath(); ctx.ellipse(0, D * 1.5, L * 0.9, D * 0.7, 0, 0, TAU); ctx.fill();
    // hull — flat top (above the waterline, clipped by the canvas edge) down to a curved keel.
    // Filled with SOLID alternating plank bands so there are no see-through gaps.
    const top = -H * 0.06;
    const hull = new Path2D();
    hull.moveTo(-L, top); hull.lineTo(L, top); hull.lineTo(L * 0.98, 0);
    hull.quadraticCurveTo(0, D, -L * 0.98, 0); hull.closePath();
    ctx.fillStyle = '#7c5026'; ctx.fill(hull);
    ctx.save();
    ctx.clip(hull);
    const planks = ['#8a5e2e', '#6f481f', '#7c5026', '#67401b'];
    const nb = 6;
    for (let i = 0; i < nb; i++) {
      const ya = top + (i / nb) * (D - top);
      ctx.fillStyle = planks[i % planks.length];
      ctx.fillRect(-L, ya, L * 2, (D - top) / nb + 0.6);    // overlap avoids hairline gaps
    }
    ctx.strokeStyle = 'rgba(50, 32, 14, 0.5)'; ctx.lineWidth = Math.max(1, s * 0.01);
    for (let i = 1; i < nb; i++) {
      const ya = top + (i / nb) * (D - top);
      ctx.beginPath(); ctx.moveTo(-L, ya); ctx.lineTo(L, ya); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#4a2f16'; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.lineJoin = 'round';
    ctx.stroke(hull);
    // ── spinning propeller churning at the stern (connected to the hull by a shaft) ──
    {
      const px = -L * 0.6, py = D * 1.0, pr = s * 0.16;
      // prop wash: bubbles streaming aft and fading
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.8 + k * 0.17) % 1;
        const wx = px - s * 0.12 - ph * s * 0.8;
        const wy = py + Math.sin(k * 1.7 + t * 3) * s * 0.05 * (0.5 + ph);
        ctx.fillStyle = 'rgba(225,245,255,' + (0.22 * (1 - ph)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(wx, wy, s * 0.022 * (0.6 + ph), 0, TAU); ctx.fill();
      }
      // shaft from the hull down to the hub
      ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = Math.max(1.4, s * 0.02); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-L * 0.42, D * 0.5); ctx.lineTo(px, py); ctx.stroke();
      ctx.save();
      ctx.translate(px, py);
      // spin-blur disc behind the blades
      ctx.fillStyle = 'rgba(200,218,232,0.14)';
      ctx.beginPath(); ctx.ellipse(0, 0, pr * 0.4, pr, 0, 0, TAU); ctx.fill();
      // three blades rotating about a ~horizontal axis (foreshortened in x)
      const spin = t * 11 * b.dir;
      ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = Math.max(1.6, s * 0.024); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const a = spin + k * TAU / 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * pr * 0.4, Math.sin(a) * pr); ctx.stroke();
      }
      ctx.fillStyle = '#4a4f55'; ctx.beginPath(); ctx.arc(0, 0, pr * 0.22, 0, TAU); ctx.fill();   // hub
      ctx.restore();
    }
    // bright waterline glint where the hull meets the surface
    ctx.strokeStyle = 'rgba(240, 252, 255, 0.5)'; ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.beginPath(); ctx.moveTo(-L * 0.98, 0); ctx.lineTo(L * 0.98, 0); ctx.stroke();

    // a life ring (red & white) mounted on the hull side
    {
      const lr = D * 0.5, lx = -L * 0.45, ly = top * 0.5;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.fillStyle = '#e8392c';
      ctx.beginPath(); ctx.arc(0, 0, lr, 0, TAU); ctx.fill();          // red ring
      ctx.fillStyle = '#f5f5ef';                                       // two white bands
      for (const a0 of [-0.2, Math.PI - 0.2]) {
        ctx.beginPath();
        ctx.arc(0, 0, lr, a0, a0 + 1.4);
        ctx.arc(0, 0, lr * 0.55, a0 + 1.4, a0, true);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#6f481f';                                       // hole shows the hull (not water)
      ctx.beginPath(); ctx.arc(0, 0, lr * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,12,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, lr, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // an anchor hung off the bow, dangling into the water
    {
      const ax = L * 0.8, aLen = D * 1.25, aBot = aLen;
      ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = Math.max(1.6, s * 0.022);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(ax, -s * 0.04, s * 0.06, 0, TAU); ctx.stroke();   // top ring
      ctx.beginPath(); ctx.moveTo(ax, s * 0.02); ctx.lineTo(ax, aBot); ctx.stroke();  // shank
      ctx.beginPath(); ctx.moveTo(ax - s * 0.13, aLen * 0.32); ctx.lineTo(ax + s * 0.13, aLen * 0.32); ctx.stroke();  // stock
      ctx.beginPath(); ctx.moveTo(ax, aBot); ctx.quadraticCurveTo(ax - s * 0.24, aBot + s * 0.02, ax - s * 0.17, aBot - s * 0.14); ctx.stroke();  // fluke
      ctx.beginPath(); ctx.moveTo(ax, aBot); ctx.quadraticCurveTo(ax + s * 0.24, aBot + s * 0.02, ax + s * 0.17, aBot - s * 0.14); ctx.stroke();  // fluke
    }
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
    updateCloudShade(t, dt);
    updateFlatfish(t);
    updateCleanStation(t, dt);
    updateCoralSpawn(t, dt);
    updateRain(t, dt);
    updateSeahorse(SEAHORSE, t);
    updateSeahorse(SEAHORSE2, t);
    ctx.drawImage(staticLayer.cv, 0, 0, W, H);
    drawSurface(t);
    drawMotes(t);
    drawRays(t);
    drawCaustics(t);
    drawFlatfish(t);                                  // a bottom dweller on the sand
    // passing giants glide far behind the reef life:
    // blue whale ~20× the dolphin (every few minutes), orca ~5× (now and then)
    if (updateGiant(WHALE, 60, 110, 220, 340, 0.78, 0.10, 0.22, 0.115, t, dt, () => BOAT.active)) drawWhale(WHALE, t);
    if (updateGiant(ORCA,  15, 40,  80, 150, 0.29, 0.10, 0.30, 0.16,  t, dt)) drawOrca(ORCA, t);
    if (updateBoat(t, dt)) drawBoat(BOAT, t);         // a wooden hull glides past the surface
    drawSchool(t);
    updatePod();
    for (const dp of DOLPHS) drawDolphin(dp, t);
    for (const sh of SHARKS) drawShark(sh, t);
    updateShoals();
    drawShoals(t);
    drawButters(t);
    drawPuffer(t);
    drawJellies(t);                                  // a drifting group of pulsing jellyfish
    drawCleanStation(t);                             // cleaner wrasse + any visiting client
    drawSeahorse(SEAHORSE2, t);                      // the bottom-roamer (behind the grass)
    drawGrass(t);
    drawSeahorse(SEAHORSE, t);                       // the clinging one (among the grass)
    drawKelp(t);
    drawChest(t);
    for (const a of ANEMONES) {
      drawAnemone(a, t, false);                       // back tentacles
      for (const n of NEMOS) if (n.home === a) drawNemo(n, t);
      drawAnemone(a, t, true);                        // front tentacles overlap the fish
    }
    for (const c of CRABS) drawCrab(c, t);
    drawStars(t);
    drawBubbles(t);
    drawFxBubbles(t, dt);
    drawFxHearts(t, dt);
    drawFxPuffs(t);
    drawFxRings(t);
    drawFxSand(t);                                    // disturbed-sand clouds from the flatfish
    drawFxSpark(t);                                   // twinkle sparkles (freshly-cleaned fish, etc.)
    if (CLEANSTATION.signF > 0.02) drawCleanSign(t, CLEANSTATION.signF);   // "תחנת ניקוי" sign
    drawCoralSpawn(t);                                // rare drifting-up egg bundles
    drawCloudShade();                                 // cloud shadow dims everything beneath the surface
    drawRain(t);                                      // occasional surface dimples + overcast dimming
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
        return;
      }
    }
    // tap a jellyfish → it flashes/blinks
    for (const j of JELLIES) {
      const jy = j.drawY != null ? j.drawY : j.y;
      if (Math.hypot(mx - j.x, my - jy) < j.s * 1.6) { j.flashT = t; return; }
    }
    // a crab — a startled sideways scuttle (away from the tap)
    for (const c of CRABS) {
      const cy = sandTopAt(c.x) + c.s * 0.5;
      if (Math.hypot(mx - c.x, my - cy) < c.s * 1.7) {
        c.actT = t; c.dir = mx > c.x ? -1 : 1;
        burstBubbles(c.x, cy - c.s * 0.3, 4);
        return;
      }
    }
    // a sea star — a little arm wiggle
    for (const st of STARS) {
      if (Math.hypot(mx - st.x, my - st.y) < st.s * 1.6) { st.actT = t; return; }
    }
    // either roaming seahorse — tap it to startle it (a quick darting hop + turn)
    for (const sh of [SEAHORSE, SEAHORSE2]) {
      if (Math.hypot(mx - sh.x, my - sh.y) < Math.max(20, sh.s * 2.6)) { sh.reactT0 = t; sh.dir *= -1; return; }
    }
    // tap the cleaner wrasse → summon a client to the station (if none is there)
    {
      const cs = CLEANSTATION;
      if (!cs.client && Math.hypot(mx - cs.x, my - (cs.y - 4)) < Math.max(24, Math.min(W, H) * 0.06)) {
        spawnCleanClient(t); return;
      }
    }
    // tap a coral head → it releases its eggs (a burst of drifting bundles).
    // The band reaches well above each mount point so tall corals raised on the
    // bommies (staghorn, fingers, tube sponges) are clickable, not just the
    // garden corals sitting on the sand.
    for (const pt of SPAWN.points) {
      if (Math.abs(mx - pt.x) < W * 0.055 && my > pt.y - H * 0.16 && my < pt.y + H * 0.03) {
        spawnCoralBurst(pt, t); return;
      }
    }
    // clicked the open sand → a hidden flatfish bolts out in a sand puff and
    // re-buries elsewhere (a little discovery for poking around the seabed)
    if (my > sandTopAt(mx) - 6) {
      spawnSandPuff(mx, my, 0.7);
      startFlatfishDart(t);
    }
  };
  document.addEventListener('click', reefClick);

  // cursor parting: as the pointer passes near the school it opens around it
  // (soft & brief — a click parts it more firmly via doFishAct's 'school' case)
  const reefMove = e => {
    if (stopped || !SCHOOL || !SCHOOL.leader) return;
    if (e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov')) return;
    const lx = SCHOOL.leader.x, ly = SCHOOL.leader.y;
    if (Math.abs(e.clientX - lx) > 220 || Math.abs(e.clientY - ly) > 130) return;
    const cur = SCHOOL.avoid;
    const curActive = (lastT - cur.t0) < (cur.strength > 1 ? 1.6 : 0.45);
    if (curActive && cur.strength > 1) return;          // don't override an active click parting
    SCHOOL.avoid = { x: e.clientX, y: e.clientY, t0: lastT, strength: 0.85 };
  };
  document.addEventListener('mousemove', reefMove);

  window.addEventListener('resize', resize);
  resize();
  rafId = requestAnimationFrame(draw);

  // ── roaming chibi "rumi": swims past in FLY mode (rotated 90°, fast) every few minutes ──
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
      mode: 'fly', direction: 'ltr', alternate: false,   // swims rightward (fits the water)
      height: '30vh', bottom: '40%', duration: 3250,     // 25% slower than the original 2600
      gapMin: 120000, gapMax: 240000,             // reappears every 2–4 minutes
      startDelay: 60000 + Math.random() * 120000  // first appears only after 1–3 min of play
    });
  });

  // the loader calls this when the background is switched away
  return function cleanup() {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (chibiPatrol) chibiPatrol.stop();
    window.removeEventListener('resize', resize);
    document.removeEventListener('click', reefClick);
    document.removeEventListener('mousemove', reefMove);
    stage.innerHTML = '';
  };
  },
};
