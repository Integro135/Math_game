/* ── Unicorn Valley v2 — a rainbow meadow through a full DAY CYCLE ──────────
   The 🦄 (girls) theme's backdrop, rebuilt from scratch as ONE self-contained
   canvas module (the previous DOM/CSS scene is unicorns.bg.js + unicorns/,
   kept as legacy). Same structure as savanna.bg.js: prerendered sky/scenery
   layers that are repainted only while the palette drifts, an actor layer
   tinted by the hour, and per-frame ambient life on top.

   THE DAY (DAY_SEC seconds, four looks, colours interpolated across a soft
   window at every boundary): DAWN — peach-rose-lavender sky, a big soft sun
   climbing at the left; DAY — candy-blue sky, cotton clouds, small bright sun;
   SUNSET — pink-gold-violet blaze, the sun sinking at the right; NIGHT —
   indigo sky with twinkling + shooting stars, a glowing moon top-right,
   AURORA ribbons, fireflies, glowing mushrooms and lit castle windows.

   THE VALLEY: two lilac mountain ranges with snow caps, a RAINBOW spanning
   the sky, a fairytale CASTLE on a hill at the right (purple spires, golden
   trim, fluttering flags), a CLIFF at the left with a blossom tree and a
   WATERFALL pouring into a pond (streaks, mist, ripples, the sun/moon caught
   in the water), rolling flower meadows and a foreground of swaying grass,
   big flowers and mushrooms. Petals fall, sparkles twinkle, butterflies
   flutter by day, fireflies glow by night.

   THE UNICORNS are a from-scratch canvas rig (drawUni): one body silhouette
   with a fat-stroke outline, two-segment legs with golden hooves and a
   diagonal walk/gallop gait, a flowing rainbow (or pastel) mane and tail
   that wave, a spiralled golden horn that twinkles now and then, a big
   blinking eye with lashes + blush, a star/heart cutie-mark, and feathered
   wings for the flyers. Five palettes (classic white + rainbow, pink,
   lilac, mint, sky) and a rare midnight one. WALKERS cross the meadow in
   depth lanes — singles and mother+foal pairs (the foal trots behind and
   copies its mother's jumps) — some GALLOP with stardust from the hooves;
   FLYERS cross the sky trailing sparkles and somersault. At most 4 on the
   meadow + 2 in the air. On a schedule AND on click a unicorn acts: JUMP,
   REAR UP, HORN MAGIC (a rainbow ring + sparkles from the horn tip), a
   rainbow TOOT with an embarrassed shimmy, or (scheduled only) GRAZE. ❤ float
   up when two adults meet face to face.

   CLICKS: unicorn → act · castle → fireworks + window flare · rainbow →
   a shimmer sweeps the arc · a cloud → glitter rain · the pond → rainbow
   fish leap · the meadow → flowers bloom where you click · the sky → a
   sparkle burst · the SUN, the MOON or the WATERFALL (always visible beside
   the game card) → fast-forward to the next part of the day.
   Ambient: the rainbow shimmers / the castle windows flare on their own
   every 12–30 s; fish leap every so often. "Rumi" (rumi/chibi-walker.js)
   strolls across the meadow every 2–4 minutes, first after 1–3 minutes.

   Docs: backgrounds/README.md. Registers window.BACKGROUNDS.unicorns2
   (skin 'unicorns', aids 'unicorns'); init() mounts into the given stage
   and returns a cleanup. Test hooks: window._uni2. */
window.BACKGROUNDS = window.BACKGROUNDS || {};
(function(){
  const doc = document;
  const BASE = (function(){ const s = doc.currentScript; return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();
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
  const PHASE_NAMES = ['dawn', 'day', 'sunset', 'night'];
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const ease = u => { u = clamp(u, 0, 1); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
  const mixN = (a, b, w) => a + (b - a) * w;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
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
  const withA = (c, a) => { const p = parseCol(c); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; };
  const rgbaOf = (arr, aMul) => 'rgba(' + Math.round(arr[0]) + ',' + Math.round(arr[1]) + ',' + Math.round(arr[2]) + ',' + (arr[3] * (aMul == null ? 1 : aMul)).toFixed(3) + ')';
  function lg(c, x1, y1, x2, y2, st){ const g = c.createLinearGradient(x1, y1, x2, y2); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function rg(c, x, y, r0, r1, st){ const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }

  // ── THE FOUR LOOKS (keyframes at each phase centre) ──────────────────────
  const LOOKS = [
    { // dawn — peach and rose over lavender, a big soft sun low at the left
      sky: [[0, '#7a5aa8'], [0.42, '#df8fbc'], [0.74, '#ffc6a9'], [1, '#fff0cc']],
      sunCol: '#fff3d2', glow: 'rgba(255,205,185,.55)', sunR: 0.10, haze: 'rgba(255,205,225,.35)',
      mtnFar: '#bb92d2', mtnNear: '#a26fbf', snow: '#fff0f8',
      hillFar: '#98d092', hillMid: '#7fc478', hillNear: '#69b866', hillFront: '#57a857',
      wall: '#fbe6f5', wallD: '#e6c3e6', roof: '#9a63d9', roofL: '#c39af0', gold: '#f3c65a',
      rock: '#c993d4', rockD: '#9d68ae', rockL: '#e2b6e8',
      water: '#8fd2f2', waterD: '#5fb0e0', cloud: '#fff2f7', cloudTint: '#ffcfe4',
      grass: '#62ae5e', grassD: '#4a9348', blossom: '#ffb6da', blossomD: '#ee8fc0', mush: '#ff7fb0',
      rainbowA: 0.5, auroraA: 0, starA: 0.12, daylight: 0.8, tint: [255, 195, 205, 0.08],
    },
    { // day — candy-blue sky, small bright sun, crisp colours
      sky: [[0, '#58a6f0'], [0.45, '#9fd1fb'], [0.8, '#dff0ff'], [1, '#fff6fb']],
      sunCol: '#fffbe8', glow: 'rgba(255,255,230,.5)', sunR: 0.075, haze: 'rgba(230,240,255,.25)',
      mtnFar: '#c7a8e3', mtnNear: '#ad85d5', snow: '#ffffff',
      hillFar: '#9de08e', hillMid: '#82d276', hillNear: '#6cc463', hillFront: '#5ab552',
      wall: '#fff5fb', wallD: '#ead0ea', roof: '#8e5bd6', roofL: '#bb95ee', gold: '#f5c445',
      rock: '#d4a5dd', rockD: '#aa79bc', rockL: '#ecc8f0',
      water: '#7ccff5', waterD: '#4aaee8', cloud: '#ffffff', cloudTint: '#ffd9ec',
      grass: '#5fb85a', grassD: '#469a44', blossom: '#ffaad5', blossomD: '#f087bd', mush: '#ff6fa8',
      rainbowA: 0.62, auroraA: 0, starA: 0, daylight: 1, tint: [255, 255, 255, 0],
    },
    { // sunset — pink-gold blaze, violet zenith, the big sun sinking at the right
      sky: [[0, '#4a2a7a'], [0.42, '#c85c9c'], [0.74, '#ff9d6e'], [1, '#ffd58e']],
      sunCol: '#ffd98c', glow: 'rgba(255,175,125,.65)', sunR: 0.125, haze: 'rgba(255,165,155,.3)',
      mtnFar: '#8e5ca2', mtnNear: '#6f428a', snow: '#ffd3c4',
      hillFar: '#8fa95a', hillMid: '#7a954a', hillNear: '#66833d', hillFront: '#557130',
      wall: '#f7d2e2', wallD: '#dcaac8', roof: '#6a3fa8', roofL: '#9a72d0', gold: '#ffd05c',
      rock: '#a970aa', rockD: '#7a4b82', rockL: '#d09aca',
      water: '#f0aa8a', waterD: '#c87a70', cloud: '#ffc6cc', cloudTint: '#ff9fb8',
      grass: '#708b3b', grassD: '#526b2b', blossom: '#f08eba', blossomD: '#d46aa0', mush: '#e86a9c',
      rainbowA: 0.3, auroraA: 0, starA: 0.2, daylight: 0.65, tint: [255, 150, 110, 0.14],
    },
    { // night — indigo, moonlight, stars and aurora
      sky: [[0, '#0b0a2a'], [0.45, '#1e1652'], [0.8, '#3a2a7a'], [1, '#553b94']],
      sunCol: '#f6f2e6', glow: 'rgba(200,190,255,.35)', sunR: 0.06, haze: 'rgba(60,40,120,.3)',
      mtnFar: '#2f2554', mtnNear: '#251b44', snow: '#aa9bd2',
      hillFar: '#284b46', hillMid: '#213f3b', hillNear: '#1b3430', hillFront: '#152b27',
      wall: '#5c4c8c', wallD: '#463870', roof: '#2c1f58', roofL: '#4a3a7e', gold: '#d8a84a',
      rock: '#3b2b5a', rockD: '#271b42', rockL: '#4e3b72',
      water: '#2b3b7a', waterD: '#1c285a', cloud: '#4b4082', cloudTint: '#5e4a98',
      grass: '#23433b', grassD: '#19312a', blossom: '#7b5ba2', blossomD: '#5e4382', mush: '#c05a90',
      rainbowA: 0.08, auroraA: 1, starA: 1, daylight: 0.15, tint: [60, 40, 130, 0.45],
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
  // sun: rises at the left at tod 0, peaks at the day keyframe (0.375), sets
  // at the right as night begins (0.75). moon: rises right at dusk (0.70),
  // peaks around the night keyframe, sets after dawn — a lower arc that stays
  // in the top-right sky, beside the game card
  const sunP = tod => tod / 0.75;
  const moonP = tod => ((tod < 0.5 ? tod + 1 : tod) - 0.70) / 0.42;

  // ── unicorn palettes ─────────────────────────────────────────────────────
  const RAINBOW = ['#ff7eb3', '#ffb86b', '#ffe66d', '#8ee59b', '#7dc4ff', '#c77dff'];
  const PALS = [
    { name: 'classic', body: '#ffffff', shade: '#efe3f6', out: '#c9a6dc', mane: RAINBOW, mark: '#ff6fb5', wing: '#ffffff' },
    { name: 'pink',    body: '#ffd8e9', shade: '#f7bfd8', out: '#d78bb6', mane: ['#c77dff', '#a58bff', '#8fb4ff', '#d49bff', '#a58bff', '#c77dff'], mark: '#ffe66d', wing: '#fff0f7' },
    { name: 'lilac',   body: '#e6d6ff', shade: '#cfbbf6', out: '#a889de', mane: ['#8ee5c9', '#7de0ff', '#b6f0a8', '#8ee5c9', '#c9f7f0', '#7de0ff'], mark: '#ff9ac9', wing: '#f4edff' },
    { name: 'mint',    body: '#d4f4e9', shade: '#b7e6d5', out: '#83c2ad', mane: ['#ff8fc8', '#ffb0d8', '#ff7eb3', '#ffc4e1', '#ffa4d0', '#ff8fc8'], mark: '#7dc4ff', wing: '#eefcf7' },
    { name: 'sky',     body: '#d0e7ff', shade: '#b4d4f7', out: '#83afe0', mane: ['#ffe66d', '#ffd166', '#ffb86b', '#fff0a0', '#ffd166', '#ffe66d'], mark: '#c77dff', wing: '#eef6ff' },
    { name: 'midnight', body: '#4a3560', shade: '#3a2a4e', out: '#251a36', mane: RAINBOW, mark: '#ffe66d', wing: '#5a4570', rare: true },
  ];
  const HOOF = '#e9b949', HOOF_D = '#c9972e', HORN_A = '#fff1b8', HORN_B = '#f2c14e', HORN_C = '#c98a1e';
  function pickPal(){ return Math.random() < 0.08 ? PALS[5] : PALS[Math.floor(Math.random() * 5)]; }

  const UNI = { WIDTH: 68, HEIGHT: 150 };   // rig extents in rig units (× L.s)
  const ACT_DUR = { jump: 0.9, rear: 1.4, horn: 1.7, toot: 1.5, graze: 3.8, flip: 1.1 };

  // ── THE UNICORN RIG ──────────────────────────────────────────────────────
  // L = { x, y (ground), s (px per unit), dir (±1), ph, wt (walk clock),
  //       moving, gallop, fly, wings, pal, mark, foal, bow (0..1 grazing),
  //       rear (0..1), leap (0..1 legs stretched mid-air), hornGlow (0..1) }
  const LEG_HIND = [-21, -40], LEG_FRONT = [21, -42], LU = 21, LL = 21;
  function starPath(c, x, y, r){
    c.beginPath();
    for (let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }
  function heartPath(c, x, y, r){
    c.beginPath(); c.moveTo(x, y + r * 0.95);
    c.bezierCurveTo(x - r * 1.7, y - r * 0.25, x - r * 0.85, y - r * 1.35, x, y - r * 0.5);
    c.bezierCurveTo(x + r * 0.85, y - r * 1.35, x + r * 1.7, y - r * 0.25, x, y + r * 0.95);
    c.closePath();
  }
  function sparkPath(c, x, y, r){
    c.beginPath(); c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath();
  }
  function bodyPath(c){
    c.beginPath();
    c.moveTo(36, -46);
    c.bezierCurveTo(42, -60, 30, -74, 8, -73);
    c.bezierCurveTo(-12, -72, -30, -72, -38, -58);
    c.bezierCurveTo(-45, -46, -38, -30, -20, -29);
    c.bezierCurveTo(-4, -27, 12, -27, 26, -31);
    c.bezierCurveTo(38, -34, 40, -40, 36, -46);
    c.closePath();
  }
  function neckPath(c){
    c.beginPath();
    c.moveTo(28, -50);
    c.bezierCurveTo(34, -66, 36, -82, 46, -96);   // throat
    c.lineTo(36, -114);                           // under the head (hidden by it)
    c.bezierCurveTo(22, -98, 12, -84, 2, -70);    // crest down to the withers
    c.closePath();
  }
  // the head in its own coordinates; drawUni scales it about (40,-100) — a
  // touch bigger on adults, much bigger on foals
  const HEAD_PIVOT = [40, -100], HEAD_SCALE = foal => foal ? 1.28 : 1.12;
  function headPath(c){
    c.beginPath();
    c.moveTo(38, -88);
    c.bezierCurveTo(46, -86, 58, -85, 66, -90);    // jaw → chin
    c.bezierCurveTo(73, -93, 73, -101, 66, -105);  // nose
    c.bezierCurveTo(60, -109, 52, -111, 46, -114); // muzzle top → forehead
    c.bezierCurveTo(42, -119, 33, -118, 29, -111); // forehead → poll
    c.bezierCurveTo(26, -104, 30, -94, 38, -88);   // back of the head (into the neck)
    c.closePath();
  }
  // a point on the crest cubic (poll → withers) for the mane roots
  function crestPt(u){
    const p0 = [30, -110], p1 = [22, -98], p2 = [12, -84], p3 = [2, -70], v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
            v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  }
  function legAngles(L, t){
    const wt = L.wt, mv = L.moving && !L.fly, gal = L.gallop && mv;
    const amp = gal ? 0.78 : 0.46, bend = gal ? 1.0 : 0.62;
    const idle = Math.sin(t * 1.3 + L.ph) * 0.025;
    function walkLeg(off, front){
      if (!mv) return [idle, idle];
      const a = Math.sin(wt + off) * amp, f = Math.max(0, Math.sin(wt + off + 0.9));
      return [a, front ? a - f * bend : a + f * bend * 0.7];
    }
    // diagonal pairs: near-front with far-hind, far-front with near-hind
    let nf = walkLeg(0, true), fh = walkLeg(0, false), ff = walkLeg(Math.PI, true), nh = walkLeg(Math.PI, false);
    // in the air (flyers / jump apex): front legs tucked, hind legs stretched back
    const air = L.fly ? 1 : (L.leap || 0);
    if (air > 0){
      const g = L.fly ? Math.sin(L.wt) * 0.3 : 0;
      const tuckF = [0.65 + g, -1.35 + g * 0.6], tuckH = [-0.75 - g, -1.35 - g * 0.5];
      const tuckF2 = [0.85 + g, -1.15], tuckH2 = [-0.55 - g, -1.05];
      nf = [mixN(nf[0], tuckF[0], air), mixN(nf[1], tuckF[1], air)];
      ff = [mixN(ff[0], tuckF2[0], air), mixN(ff[1], tuckF2[1], air)];
      nh = [mixN(nh[0], tuckH[0], air), mixN(nh[1], tuckH[1], air)];
      fh = [mixN(fh[0], tuckH2[0], air), mixN(fh[1], tuckH2[1], air)];
    }
    // rearing: the front legs paw the air
    const r = L.rear || 0;
    if (r > 0){
      const pw = Math.sin(t * 9 + L.ph) * 0.2;
      nf = [mixN(nf[0], 0.95 + pw, r), mixN(nf[1], -1.25 + pw, r)];
      ff = [mixN(ff[0], 0.7 - pw, r), mixN(ff[1], -1.45 - pw, r)];
      nh = [mixN(nh[0], 0.05, r), mixN(nh[1], 0.05, r)];
      fh = [mixN(fh[0], -0.05, r), mixN(fh[1], -0.05, r)];
    }
    return { nf, ff, nh, fh };
  }
  function drawLeg(c, hip, ang, pal, far){
    const [hx, hy] = hip, [a, b] = ang;
    const kx = hx + Math.sin(a) * LU, ky = hy + Math.cos(a) * LU;
    const fx = kx + Math.sin(b) * LL, fy = ky + Math.cos(b) * LL;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = pal.out; c.lineWidth = 10.5;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = 8.6; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    c.strokeStyle = far ? pal.shade : pal.body; c.lineWidth = 7.8;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy); c.stroke();
    // hoof
    c.fillStyle = far ? HOOF_D : HOOF;
    c.beginPath(); c.ellipse(fx + Math.sin(b) * 1.5, fy + Math.cos(b) * 1.5, 4.8, 3.4, b, 0, TAU); c.fill();
  }
  function drawWing(c, L, t, far){
    const root = [2, -64], flap = L.fly ? Math.sin(t * 7.5 + L.ph) * 0.55 - 0.25 : 0.55;
    c.save(); c.translate(root[0], root[1]); c.rotate(far ? -flap * 0.8 - 0.25 : -flap);
    const n = 5, fill = far ? L.pal.shade : L.pal.wing;
    for (let i = 0; i < n; i++){
      const th = -2.45 + i * 0.24, len = (far ? 40 : 46) - i * 4.5, w = 7.5 - i * 0.6;
      const tx = Math.cos(th) * len, ty = Math.sin(th) * len, px = -Math.sin(th), py = Math.cos(th);
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(tx * 0.5 + px * w, ty * 0.5 + py * w, tx, ty);
      c.quadraticCurveTo(tx * 0.5 - px * w, ty * 0.5 - py * w, 0, 0);
      c.closePath();
      c.fillStyle = fill; c.strokeStyle = L.pal.out; c.lineWidth = 1.6; c.fill(); c.stroke();
    }
    c.restore();
  }
  function drawTail(c, L, t){
    const rx = -38, ry = -60, mane = L.pal.mane;
    c.lineCap = 'round';
    for (let k = 0; k < 5; k++){
      const w1 = Math.sin(t * 3 + k * 0.7 + L.ph) * 4, w2 = Math.cos(t * 2.4 + k * 0.9 + L.ph) * 5;
      const sw = L.moving ? -6 : 0;
      c.strokeStyle = mane[k % mane.length]; c.lineWidth = 6.5 - k * 0.6;
      c.beginPath(); c.moveTo(rx, ry + k * 1.5);
      c.bezierCurveTo(rx - 14 + sw, ry - 14 + k * 3 + w1, rx - 28 + sw, ry - 6 + k * 6 + w2, rx - 30 - k * 3 + sw + w1, ry + 14 + k * 7 + w2);
      c.stroke();
    }
  }
  function drawMane(c, L, t){
    const mane = L.pal.mane; c.lineCap = 'round';
    for (let k = 0; k < 6; k++){
      const [bx, by] = crestPt(k / 5.6 + 0.04);
      const w1 = Math.sin(t * 3.2 + k * 0.8 + L.ph) * 3, w2 = Math.cos(t * 2.6 + k * 0.5 + L.ph) * 3;
      const sw = L.moving ? -5 : 0;
      c.strokeStyle = mane[k % mane.length]; c.lineWidth = 6 - k * 0.35;
      c.beginPath(); c.moveTo(bx + 2, by);
      c.quadraticCurveTo(bx - 10 + sw + w1, by - 3 + w2, bx - 21 + sw + w1 * 0.6, by + 12 + k * 0.8 + w2 * 0.5);
      c.stroke();
    }
  }
  function drawHorn(c, L, t){
    const bx = 46, by = -115, tx = 57, ty = L.foal ? -134 : -142;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy), px = -dy / len, py = dx / len;
    const wb = 4.2;
    c.fillStyle = lg(c, bx + px * wb, by + py * wb, bx - px * wb, by - py * wb, [[0, HORN_A], [0.5, HORN_B], [1, HORN_C]]);
    c.beginPath(); c.moveTo(bx + px * wb, by + py * wb); c.lineTo(tx, ty); c.lineTo(bx - px * wb, by - py * wb); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,70,10,.45)'; c.lineWidth = 1.2; c.stroke();
    // spiral ridges
    c.strokeStyle = 'rgba(140,85,15,.55)'; c.lineWidth = 1;
    for (let i = 1; i <= 6; i++){
      const u = i / 7.2, w = wb * (1 - u), x = bx + dx * u, y = by + dy * u;
      c.beginPath(); c.moveTo(x + px * w, y + py * w); c.quadraticCurveTo(x + dx * 0.04, y + dy * 0.04, x - px * w, y - py * w); c.stroke();
    }
    // the tip twinkles briefly every ~26 s; glows during horn magic
    const cyc = (t + L.ph * 4) % 26, twk = cyc < 1.6 ? Math.pow(Math.sin(cyc / 1.6 * Math.PI), 2) : 0;
    const g = Math.max(twk * 0.8, L.hornGlow || 0);
    if (g > 0.02){
      c.fillStyle = rg(c, tx, ty, 0, 14 + 12 * g, [[0, 'rgba(255,255,230,' + (0.9 * g).toFixed(3) + ')'], [0.4, 'rgba(255,220,250,' + (0.35 * g).toFixed(3) + ')'], [1, 'rgba(255,220,250,0)']]);
      c.beginPath(); c.arc(tx, ty, 14 + 12 * g, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,' + g.toFixed(3) + ')'; sparkPath(c, tx, ty, 6 + 4 * g); c.fill();
    }
  }
  function drawHead(c, L, t){
    // ear
    c.fillStyle = L.pal.body; c.strokeStyle = L.pal.out; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(31, -111); c.lineTo(35, -128); c.lineTo(41, -113); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,150,190,.55)'; c.beginPath(); c.moveTo(33.5, -113); c.lineTo(35.3, -123); c.lineTo(38.5, -114); c.closePath(); c.fill();
    // forelock over the forehead, then the horn
    c.strokeStyle = L.pal.mane[0]; c.lineWidth = 4.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(33, -115); c.quadraticCurveTo(44, -121, 52, -112 + Math.sin(t * 2 + L.ph) * 1.2); c.stroke();
    drawHorn(c, L, t);
    // eye (blinks every ~3.6 s, staggered by ph)
    const cyc = (t + L.ph * 2.3) % 3.6, bl = cyc < 0.16 ? Math.sin(cyc / 0.16 * Math.PI) : 0;
    const ex = 53, ey = -101, er = L.foal ? 4.6 : 4.2;
    c.save(); c.translate(ex, ey); c.scale(1, Math.max(0.06, 1 - bl));
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 0, er * 1.15, er, 0, 0, TAU); c.fill();
    c.fillStyle = L.pal.name === 'midnight' ? '#7dc4ff' : '#4a2a5a'; c.beginPath(); c.arc(er * 0.15, 0, er * 0.7, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(er * 0.35, -er * 0.3, er * 0.26, 0, TAU); c.fill();
    c.restore();
    if (bl > 0.6){ c.strokeStyle = L.pal.out; c.lineWidth = 1.4; c.beginPath(); c.arc(ex, ey, er * 1.05, 0.15, Math.PI - 0.15); c.stroke(); }
    // lashes, blush, nostril, smile
    c.strokeStyle = '#4a2a5a'; c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ex + er * 0.9, ey - er * 0.7); c.lineTo(ex + er * 1.6, ey - er * 1.3);
    c.moveTo(ex + er * 0.3, ey - er * 1.05); c.lineTo(ex + er * 0.6, ey - er * 1.8); c.stroke();
    c.fillStyle = 'rgba(255,130,175,.32)'; c.beginPath(); c.ellipse(60, -96, 5, 3.6, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(80,40,90,.7)'; c.beginPath(); c.arc(67, -95.5, 1.2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(80,40,90,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(63, -91.5, 3.2, 0.2, 1.3); c.stroke();
  }
  function drawUni(c, L, t){
    const pal = L.pal, s = L.s, fly = !!L.fly, mv = L.moving && !fly, gal = L.gallop && mv;
    const bob = fly ? 0 : (mv ? Math.abs(Math.sin(L.wt)) * (gal ? 4 : 2) : Math.sin(t * 1.6 + L.ph) * 0.6);
    const pitch = gal ? Math.sin(L.wt) * 0.06 : (fly ? -0.12 + Math.sin(t * 2.2 + L.ph) * 0.05 : 0);
    c.save();
    c.translate(L.x, L.y);
    c.scale(L.dir * s, s);
    if (L.rear > 0){ c.translate(LEG_HIND[0], 0); c.rotate(-0.66 * L.rear); c.translate(-LEG_HIND[0], 0); }
    c.translate(0, -bob);
    if (pitch){ c.translate(0, -50); c.rotate(pitch); c.translate(0, 50); }
    const legs = legAngles(L, t);
    drawLeg(c, LEG_HIND, legs.fh, pal, true); drawLeg(c, LEG_FRONT, legs.ff, pal, true);
    if (L.wings) drawWing(c, L, t, true);
    drawTail(c, L, t);
    // body + neck/head: fat outline pass, then the fills (a clean union outline)
    const bow = L.bow || 0, hm = HEAD_SCALE(L.foal);
    const neck = fn => { c.save(); if (bow > 0){ c.translate(12, -68); c.rotate(bow * 1.45); c.translate(-12, 68); } fn(); c.restore(); };
    const head = fn => neck(() => { c.save(); c.translate(HEAD_PIVOT[0], HEAD_PIVOT[1]); c.scale(hm, hm); c.translate(-HEAD_PIVOT[0], -HEAD_PIVOT[1]); fn(); c.restore(); });
    c.lineJoin = 'round'; c.strokeStyle = pal.out; c.lineWidth = 5;
    bodyPath(c); c.stroke();
    neck(() => { neckPath(c); c.stroke(); });
    head(() => { headPath(c); c.lineWidth = 5 / hm; c.stroke(); });
    c.fillStyle = lg(c, 0, -74, 0, -28, [[0, pal.body], [0.6, pal.body], [1, pal.shade]]);
    bodyPath(c); c.fill();
    c.fillStyle = pal.body;
    neck(() => { neckPath(c); c.fill(); });
    head(() => { headPath(c); c.fill(); });
    // cutie mark on the haunch
    c.fillStyle = pal.mark;
    if (L.mark === 'heart') heartPath(c, -19, -52, 5.2); else starPath(c, -19, -52, 6);
    c.fill();
    if (L.wings) drawWing(c, L, t, false);
    drawLeg(c, LEG_HIND, legs.nh, pal, false); drawLeg(c, LEG_FRONT, legs.nf, pal, false);
    neck(() => drawMane(c, L, t));
    head(() => drawHead(c, L, t));
    c.restore();
  }

  window.BACKGROUNDS.unicorns2 = {
    skin: 'unicorns', aids: 'unicorns',
    preload(){ needRumi(function(){}); },
    init({ stage }){
      let stopped = false;
      stage.innerHTML = '';
      stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const DPR = Math.min(devicePixelRatio || 1, 2);
      let W, H, U, K;
      let skyL, sceneL, actL, vigL, lookKey = null, curLook = LOOKS[0];
      let tod = 0.22, todSpeed = 1, todTween = null;          // start late in the dawn
      let lastT = 0, rafId = null, t0 = null;
      let HERD = [], FLYERS = [], seq = 0, nextGroupAt = 0, nextFlyerAt = 0;
      let CLOUDS, STARS, MOTES, PETALS, BFLY, FLIES, GRASS, FLOWERS, MUSH, CASTLE, POND, FALL, RB;
      let SPARK = [], RINGS = [], PUFFS = [], HEARTS = [], FISH = [], BLOOMS = [], SHOOTERS = [], FW = [];
      let rainFx = null, castleFx = null, sunBoost = null, nextAmbientAt = 12, nextShootAt = 0, nextFishAt = 25;
      let rumiLayer = null, rumiPatrol = null;

      function makeLayer(){
        const cv = doc.createElement('canvas');
        cv.width = W * DPR; cv.height = H * DPR;
        const cx = cv.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        return { cv, cx };
      }

      // ── the castle layout (shared by the static paint and the live glow) ──
      const TOWERS = [
        { dx: -84, w: 20, h: 85, rh: 40, rw: 28 }, { dx: 84, w: 20, h: 85, rh: 40, rw: 28 },
        { dx: -48, w: 24, h: 118, rh: 48, rw: 34 }, { dx: 48, w: 24, h: 118, rh: 48, rw: 34 },
        { dx: 0, w: 32, h: 152, rh: 60, rw: 46 },
      ];
      function castleLayout(cx, by, k){
        const C = { cx, by, k, windows: [], flags: [], box: [cx - 96 * k, by - 225 * k, cx + 96 * k, by] };
        TOWERS.forEach(tw => {
          C.windows.push({ x: cx + tw.dx * k, y: by - tw.h * 0.42 * k, w: 6 * k, h: 10 * k });
          C.windows.push({ x: cx + tw.dx * k, y: by - tw.h * 0.7 * k, w: 6 * k, h: 10 * k });
          C.flags.push({ x: cx + tw.dx * k, y: by - (tw.h + tw.rh + 3) * k, h: 13 * k, ph: psr(tw.dx + 9) * TAU });
        });
        C.windows.push({ x: cx - 30 * k, y: by - 42 * k, w: 6 * k, h: 10 * k }, { x: cx + 30 * k, y: by - 42 * k, w: 6 * k, h: 10 * k });
        return C;
      }

      // ── scene objects ──
      function buildScene(){
        U = Math.min(W, H) / 420;
        K = Math.min(W * 0.0011, H * 0.0018);
        RB = { cx: W * 0.5, cy: H * 0.66, r: Math.min(W * 0.36, H * 0.58) };
        POND = { x: W * 0.13, y: H * 0.758, rx: W * 0.10, ry: H * 0.026 };
        FALL = { x0: W * 0.105, x1: W * 0.150, yTop: H * 0.482, yBot: H * 0.75 };
        CASTLE = castleLayout(W * 0.86, H * 0.622, K);
        CLOUDS = Array.from({ length: 7 }, (_, i) => ({
          x: psr(i + 200) * W, y: H * (0.05 + psr(i + 210) * 0.26),
          s: 0.55 + psr(i + 220) * 0.85, spd: 3 + psr(i + 230) * 6, flash: -9,
        }));
        STARS = Array.from({ length: 90 }, (_, i) => ({
          x: psr(i * 2 + 5) * W, y: H * (0.01 + psr(i * 2 + 6) * 0.5),
          r: 0.6 + psr(i + 50) * 1.2, ph: psr(i + 70) * TAU, tw: 0.4 + psr(i + 80) * 1.3,
          col: i % 7 === 0 ? '255,200,235' : i % 5 === 0 ? '200,225,255' : '255,250,240',
        }));
        MOTES = Array.from({ length: 30 }, (_, i) => ({
          x: psr(i + 3) * W, y: H * (psr(i + 41) * 0.98), r: 2 + psr(i + 7) * 3.5,
          per: 2.5 + psr(i + 13) * 4, ph: psr(i + 23) * TAU, col: i % 3 === 0 ? '255,180,220' : i % 3 === 1 ? '255,255,255' : '220,190,255',
        }));
        PETALS = Array.from({ length: 20 }, (_, i) => ({
          x: psr(i + 600) * W, y: psr(i + 610) * H, s: 0.7 + psr(i + 620) * 0.8, sp: 18 + psr(i + 630) * 22,
          ph: psr(i + 640) * TAU, rot: psr(i + 650) * TAU, rs: (psr(i + 660) - 0.5) * 3,
        }));
        BFLY = Array.from({ length: 4 }, (_, i) => ({
          x: psr(i + 700) * W, y: H * (0.6 + psr(i + 710) * 0.35), vx: (psr(i + 720) - 0.5) * 60, vy: 0, ph: psr(i + 730) * TAU,
          col: ['#ff7eb3', '#c77dff', '#ffe66d', '#7dc4ff'][i], turnAt: 0, s: 0.8 + psr(i + 740) * 0.5,
        }));
        FLIES = Array.from({ length: 16 }, (_, i) => ({
          x: psr(i + 400) * W, y: H * (0.7 + psr(i + 410) * 0.26), ph: psr(i + 420) * TAU, sp: 0.4 + psr(i + 430) * 0.8,
        }));
        GRASS = Array.from({ length: 26 }, (_, i) => ({
          x: (i / 26) * W + psr(i) * 40, y: H * (0.935 + psr(i + 9) * 0.065),
          s: U * (0.5 + psr(i + 17) * 0.7), ph: psr(i + 31) * TAU,
        }));
        FLOWERS = Array.from({ length: 14 }, (_, i) => ({
          x: (i / 14) * W + psr(i + 800) * 60, y: H * (0.94 + psr(i + 810) * 0.06),
          s: U * (0.55 + psr(i + 820) * 0.5), ph: psr(i + 830) * TAU,
          col: ['#ff8fc8', '#ffe66d', '#ffffff', '#c77dff', '#ffb0d8'][i % 5],
        }));
        MUSH = [[0.30, 0.965, 0.75], [0.56, 0.99, 0.6], [0.93, 0.955, 0.95], [0.72, 0.975, 0.55]]
          .map(([fx, fy, s], i) => ({ x: W * fx, y: H * fy, s: U * s, ph: i * 1.7 }));
        HERD = []; FLYERS = []; SPARK = []; RINGS = []; PUFFS = []; HEARTS = []; FISH = []; BLOOMS = []; SHOOTERS = []; FW = [];
        rainFx = null; castleFx = null; sunBoost = null;
        window._uni2 = {
          tod: () => tod, setTod: v => { tod = ((v % 1) + 1) % 1; todTween = null; },
          setSpeed: v => { todSpeed = v; }, phase: () => PHASE_NAMES[Math.floor(tod / P) % 4],
          herd: () => HERD, flyers: () => FLYERS,
          spawn: (o) => spawnGroup(lastT, o || {}), flyer: () => spawnFlyer(lastT),
          act: (a, type) => startAct(a, type || 'jump', lastT),
          fx: { rainbow: () => { rainFx = { t0: lastT }; }, castle: () => fireworks(lastT), fish: () => fishLeap(lastT),
                bloom: (x, y) => bloom(x, y, lastT), glitter: i => glitter(CLOUDS[i || 0], lastT) },
          castle: () => CASTLE, pond: () => POND, fall: () => FALL, rumiLayer: () => rumiLayer,
        };
      }

      // ── static painting (repainted whenever the palette drifts) ──
      function paintSky(c, L){
        c.clearRect(0, 0, W, H);
        c.fillStyle = lg(c, 0, 0, 0, H * 0.7, L.sky.map(([p, col]) => [clamp(p, 0, 1), col]));
        c.fillRect(0, 0, W, H);
      }
      function mountainRange(c, baseY, amp, n, seed, col, snow){
        const pts = [], mids = [];
        for (let i = 0; i <= n; i++) pts.push([(i / n) * W, baseY - amp * (0.35 + 0.65 * psr(i + seed))]);
        for (let i = 1; i <= n; i++) mids[i] = [(pts[i - 1][0] + pts[i][0]) / 2, baseY - amp * 0.22 * (0.4 + psr(i * 7 + seed))];
        c.fillStyle = col;
        c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, baseY);
        for (let i = 0; i < pts.length; i++){
          if (i > 0) c.lineTo(mids[i][0], mids[i][1]);
          c.lineTo(pts[i][0], pts[i][1]);
        }
        c.lineTo(W + 10, baseY); c.lineTo(W + 10, H); c.closePath(); c.fill();
        if (snow){
          c.fillStyle = snow;
          for (let i = 1; i < n; i++){
            const [x, y] = pts[i]; if (baseY - y < amp * 0.6) continue;
            const h = (baseY - y) * 0.2, yc = y + h;
            const [xl, yl] = mids[i], [xr, yr] = mids[i + 1];
            const xL = x + (xl - x) * clamp(h / (yl - y), 0, 1), xR = x + (xr - x) * clamp(h / (yr - y), 0, 1);
            c.beginPath(); c.moveTo(x, y); c.lineTo(xR, yc);
            c.quadraticCurveTo(x + (xR - x) * 0.5, yc + h * 0.4, x + (xR - x) * 0.1, yc - h * 0.05);
            c.quadraticCurveTo(x + (xL - x) * 0.5, yc + h * 0.3, xL, yc);
            c.closePath(); c.fill();
          }
        }
      }
      function hillBand(c, yTop, col, wave, seed){
        c.fillStyle = col;
        c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, yTop);
        for (let x = 0; x <= W + 40; x += 40)
          c.lineTo(x, yTop + Math.sin(x * 0.0035 + seed) * wave + Math.sin(x * 0.009 + seed * 3) * wave * 0.45);
        c.lineTo(W + 10, H); c.closePath(); c.fill();
      }
      function flowerDots(c, y0, y1, n, seed, alpha){
        const cols = ['#ff8fc8', '#ffffff', '#ffe66d', '#c77dff', '#ffb0d8'];
        for (let i = 0; i < n; i++){
          const x = psr(i * 3 + seed) * W, y = y0 + psr(i * 3 + seed + 1) * (y1 - y0), r = 1.2 + psr(i + seed + 2) * 1.6 * U * 0.6;
          c.fillStyle = withA(cols[i % 5], alpha);
          c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
          if (i % 3 === 0){ c.fillStyle = 'rgba(255,255,255,' + (alpha * 0.8).toFixed(2) + ')'; c.beginPath(); c.arc(x, y, r * 0.4, 0, TAU); c.fill(); }
        }
      }
      function bush(c, x, y, s, L){
        c.fillStyle = L.grassD;
        for (const [dx, dy, r] of [[-8, -4, 7], [0, -8, 9], [9, -4, 7]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
        c.fillStyle = L.grass;
        for (const [dx, dy, r] of [[-4, -7, 5], [5, -9, 5]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
      }
      function blossomTree(c, x, y, s, L){
        c.strokeStyle = '#6b4a3a'; c.lineCap = 'round';
        c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 2 * s, y - 16 * s, x + 2 * s, y - 30 * s); c.stroke();
        c.lineWidth = 2 * s; c.beginPath();
        c.moveTo(x + 1 * s, y - 22 * s); c.lineTo(x - 12 * s, y - 34 * s);
        c.moveTo(x + 1 * s, y - 24 * s); c.lineTo(x + 14 * s, y - 36 * s); c.stroke();
        c.fillStyle = L.blossomD;
        for (const [dx, dy, r] of [[-14, -40, 11], [0, -46, 13], [14, -40, 11], [-6, -34, 9], [8, -34, 9]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
        c.fillStyle = L.blossom;
        for (const [dx, dy, r] of [[-10, -44, 8], [4, -49, 9], [13, -43, 7], [-2, -38, 6]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.45)';
        for (let i = 0; i < 9; i++){ c.beginPath(); c.arc(x + (psr(i + 90) - 0.5) * 34 * s, y - (34 + psr(i + 91) * 20) * s, 1.4 * s, 0, TAU); c.fill(); }
      }
      function mushroom(c, m, L){
        const { x, y, s } = m;
        c.fillStyle = '#fff4ea'; c.beginPath(); c.moveTo(x - 5 * s, y); c.lineTo(x - 4 * s, y - 14 * s); c.lineTo(x + 4 * s, y - 14 * s); c.lineTo(x + 5 * s, y); c.closePath(); c.fill();
        c.fillStyle = L.mush; c.beginPath(); c.ellipse(x, y - 14 * s, 13 * s, 9 * s, 0, Math.PI, TAU); c.lineTo(x + 13 * s, y - 13 * s); c.lineTo(x - 13 * s, y - 13 * s); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)';
        for (const [dx, dy, r] of [[-6, -18, 2], [2, -21, 2.4], [8, -16, 1.6]]){ c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); }
      }
      function paintCastle(c, L, C){
        const { cx, by, k } = C;
        const tower = tw => {
          const x = cx + tw.dx * k, w = tw.w * k, h = tw.h * k;
          c.fillStyle = lg(c, x - w / 2, 0, x + w / 2, 0, [[0, L.wall], [0.55, L.wall], [1, L.wallD]]);
          c.fillRect(x - w / 2, by - h, w, h + 2);
          c.strokeStyle = 'rgba(90,42,82,.22)'; c.lineWidth = 1; c.strokeRect(x - w / 2, by - h, w, h + 2);
          // gold band + conical roof with a highlight
          c.fillStyle = L.gold; c.fillRect(x - tw.rw * k / 2, by - h - 3 * k, tw.rw * k, 3 * k);
          c.fillStyle = lg(c, x - tw.rw * k / 2, 0, x + tw.rw * k / 2, 0, [[0, L.roofL], [0.45, L.roof], [1, L.roof]]);
          c.beginPath(); c.moveTo(x - tw.rw * k / 2, by - h - 3 * k); c.lineTo(x, by - h - tw.rh * k - 3 * k); c.lineTo(x + tw.rw * k / 2, by - h - 3 * k); c.closePath(); c.fill();
          c.fillStyle = L.gold; c.beginPath(); c.arc(x, by - h - tw.rh * k - 3 * k, 2.2 * k, 0, TAU); c.fill();
          // battlement-style lower trim
          c.fillStyle = L.wallD; c.fillRect(x - w / 2, by - h * 0.28, w, 2 * k);
        };
        // keep wall with merlons
        c.fillStyle = lg(c, 0, by - 72 * k, 0, by, [[0, L.wall], [1, L.wallD]]);
        c.fillRect(cx - 62 * k, by - 72 * k, 124 * k, 74 * k);
        c.fillStyle = L.wall;
        for (let i = 0; i < 8; i++) c.fillRect(cx - 62 * k + (i * 16.5 + 2) * k, by - 80 * k, 9 * k, 9 * k);
        c.strokeStyle = 'rgba(90,42,82,.22)'; c.lineWidth = 1; c.strokeRect(cx - 62 * k, by - 72 * k, 124 * k, 74 * k);
        // gate
        c.fillStyle = L.gold; c.beginPath(); c.moveTo(cx - 15 * k, by); c.lineTo(cx - 15 * k, by - 24 * k); c.arc(cx, by - 24 * k, 15 * k, Math.PI, 0); c.lineTo(cx + 15 * k, by); c.closePath(); c.fill();
        c.fillStyle = '#6b3a5a'; c.beginPath(); c.moveTo(cx - 11 * k, by); c.lineTo(cx - 11 * k, by - 22 * k); c.arc(cx, by - 22 * k, 11 * k, Math.PI, 0); c.lineTo(cx + 11 * k, by); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,220,150,.35)'; c.lineWidth = k; c.beginPath(); c.moveTo(cx, by - 31 * k); c.lineTo(cx, by); c.stroke();
        TOWERS.forEach(tower);
        // windows (arched, plum by day — the live layer paints their glow at night)
        C.windows.forEach(w => {
          c.fillStyle = 'rgba(90,42,82,.55)';
          c.beginPath(); c.moveTo(w.x - w.w / 2, w.y + w.h / 2); c.lineTo(w.x - w.w / 2, w.y - w.h / 4); c.arc(w.x, w.y - w.h / 4, w.w / 2, Math.PI, 0); c.lineTo(w.x + w.w / 2, w.y + w.h / 2); c.closePath(); c.fill();
        });
        // heart above the gate
        c.fillStyle = '#ff6fb5'; heartPath(c, cx, by - 52 * k, 5 * k); c.fill();
      }
      function cliffPath(c){
        const F = FALL;
        c.beginPath();
        c.moveTo(-10, H * 0.77); c.lineTo(-10, H * 0.47);
        c.quadraticCurveTo(W * 0.03, H * 0.462, W * 0.07, H * 0.472);
        c.lineTo(F.x0 - W * 0.006, F.yTop - H * 0.004); c.lineTo(F.x0, F.yTop);
        c.lineTo(F.x1, F.yTop); c.lineTo(F.x1 + W * 0.006, F.yTop - H * 0.005);
        c.quadraticCurveTo(W * 0.18, H * 0.475, W * 0.205, H * 0.49);
        c.quadraticCurveTo(W * 0.228, H * 0.56, W * 0.212, H * 0.64);
        c.quadraticCurveTo(W * 0.205, H * 0.70, W * 0.222, H * 0.745);
        c.lineTo(W * 0.20, H * 0.77); c.closePath();
      }
      function paintCliff(c, L){
        const F = FALL;
        c.fillStyle = lg(c, 0, H * 0.46, 0, H * 0.76, [[0, L.rockL], [0.4, L.rock], [1, L.rockD]]);
        cliffPath(c); c.fill();
        // volume: light from the left, shade towards the falls and the far edge
        c.fillStyle = lg(c, 0, 0, W * 0.22, 0, [[0, 'rgba(255,255,255,.12)'], [0.3, 'rgba(255,255,255,0)'], [0.55, 'rgba(0,0,0,.08)'], [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.16)']]);
        cliffPath(c); c.fill();
        // the recess behind the falls
        c.fillStyle = L.rockD; c.fillRect(F.x0 - 2, F.yTop, F.x1 - F.x0 + 4, F.yBot - F.yTop);
        // strata + soft highlights
        c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; c.lineCap = 'round';
        for (let k = 0; k < 6; k++){
          const fy = 0.52 + k * 0.04;
          c.beginPath(); c.moveTo(W * (0.005 + psr(k) * 0.02), H * fy); c.quadraticCurveTo(W * 0.05, H * (fy - 0.008), W * (0.085 + psr(k + 3) * 0.015), H * (fy + 0.004)); c.stroke();
          c.beginPath(); c.moveTo(W * 0.16, H * (fy + 0.01)); c.quadraticCurveTo(W * 0.19, H * (fy + 0.002), W * (0.205 + psr(k + 5) * 0.01), H * (fy + 0.014)); c.stroke();
        }
        c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(-10, H * 0.472); c.quadraticCurveTo(W * 0.03, H * 0.464, W * 0.07, H * 0.474); c.stroke();
        // greenery + the blossom tree on the ledge
        bush(c, W * 0.03, H * 0.472, U * 0.55, L); bush(c, W * 0.19, H * 0.492, U * 0.5, L); bush(c, W * 0.09, H * 0.478, U * 0.4, L);
        blossomTree(c, W * 0.055, H * 0.474, U * 1.05, L);
      }
      function paintPondBase(c, L){
        const p = POND;
        c.fillStyle = L.hillMid; c.beginPath(); c.ellipse(p.x, p.y, p.rx * 1.07, p.ry * 1.4, 0, 0, TAU); c.fill();
        c.fillStyle = lg(c, 0, p.y - p.ry, 0, p.y + p.ry, [[0, L.waterD], [1, mixCol(L.water, '#ffffff', 0.25)]]);
        c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); c.fill();
        // lily pads
        c.fillStyle = L.grassD;
        for (const [fx, fy, r] of [[-0.6, 0.35, 0.09], [0.55, -0.3, 0.08], [0.72, 0.45, 0.07]]){
          c.beginPath(); c.ellipse(p.x + fx * p.rx, p.y + fy * p.ry, r * p.rx, r * p.rx * 0.45, 0, 0, TAU); c.fill();
        }
        c.fillStyle = '#ff9ac9'; c.beginPath(); c.arc(p.x + 0.55 * p.rx, p.y - 0.3 * p.ry - 2, 2.2 * U * 0.6, 0, TAU); c.fill();
      }
      function paintScenery(c, L){
        c.clearRect(0, 0, W, H);
        c.fillStyle = lg(c, 0, H * 0.42, 0, H * 0.64, [[0, 'rgba(0,0,0,0)'], [1, L.haze]]);
        c.fillRect(0, H * 0.42, W, H * 0.22);
        mountainRange(c, H * 0.635, H * 0.27, 7, 3, L.mtnFar, L.snow);
        mountainRange(c, H * 0.645, H * 0.20, 5, 11, L.mtnNear, L.snow);
        // the castle hill + castle
        c.fillStyle = L.hillFar;
        c.beginPath(); c.moveTo(W * 0.62, H * 0.70); c.quadraticCurveTo(W * 0.86, H * 0.575, W * 1.1, H * 0.70); c.lineTo(W * 1.1, H * 0.72); c.lineTo(W * 0.62, H * 0.72); c.closePath(); c.fill();
        paintCastle(c, L, CASTLE);
        hillBand(c, H * 0.655, L.hillFar, 5, 1);
        flowerDots(c, H * 0.66, H * 0.72, 60, 40, 0.5);
        hillBand(c, H * 0.72, L.hillMid, 6, 5);
        paintCliff(c, L);
        paintPondBase(c, L);
        flowerDots(c, H * 0.73, H * 0.82, 90, 70, 0.7);
        hillBand(c, H * 0.82, L.hillNear, 7, 9);
        flowerDots(c, H * 0.83, H * 0.93, 120, 100, 0.85);
        hillBand(c, H * 0.93, L.hillFront, 6, 13);
        flowerDots(c, H * 0.94, H, 70, 130, 0.9);
        bush(c, W * 0.42, H * 0.925, U * 0.8, L); bush(c, W * 0.80, H * 0.94, U * 0.7, L); bush(c, W * 0.12, H * 0.955, U * 0.6, L);
        MUSH.forEach(m => mushroom(c, m, L));
      }
      function paintVignette(c){
        c.clearRect(0, 0, W, H);
        c.fillStyle = rg(c, W / 2, H / 2, Math.min(W, H) * 0.45, Math.max(W, H) * 0.82, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(60,10,50,.28)']]);
        c.fillRect(0, 0, W, H);
      }
      function repaintIfNeeded(){
        const ph = phaseAt(tod), key = ph.a * 1000 + Math.round(ph.w * 400) + (ph.a === ph.b ? 0 : ph.b * 0.1);
        if (key === lookKey) return;
        lookKey = key; curLook = lookAt(tod);
        paintSky(skyL.cx, curLook); paintScenery(sceneL.cx, curLook);
      }

      // ── unicorns ──
      function spawnGroup(t, o){
        const adults = HERD.filter(a => a.kind === 'adult').length;
        if (HERD.length >= 4) return null;
        let foal = o.foal != null ? o.foal : Math.random() < 0.45;
        if (HERD.length >= 3) foal = false;
        const fromLeft = o.fromLeft != null ? o.fromLeft : Math.random() < 0.5, dir = fromLeft ? 1 : -1;
        const lane = o.lane != null ? o.lane : Math.random();
        const pal = o.pal ? PALS.find(p => p.name === o.pal) || pickPal() : pickPal();
        const gallop = o.gallop != null ? o.gallop : (!foal && adults > 0 && Math.random() < 0.3);
        const s = U * 0.56 * (0.86 + 0.24 * lane);
        const speed = gallop ? rnd(72, 95) : rnd(19, 29);
        const x = o.x != null ? o.x : (fromLeft ? -UNI.WIDTH * s - 30 : W + UNI.WIDTH * s + 30);
        const y = H * (0.80 + lane * 0.16);
        const a = { kind: 'adult', id: seq++, entered: o.x != null, speed,
          L: { x, y, s, dir, ph: Math.random() * TAU, wt: Math.random() * TAU, moving: true, pal, gallop,
               mark: Math.random() < 0.5 ? 'star' : 'heart', bow: 0, rear: 0, leap: 0, hornGlow: 0 },
          nextActAt: t + rnd(3, 9) };
        HERD.push(a);
        if (foal){
          const f = { kind: 'foal', id: seq++, parent: a, entered: a.entered, speed,
            L: { x: x - dir * 74 * s, y: y + rnd(-6, 6), s: s * 0.58, dir, ph: Math.random() * TAU, wt: Math.random() * TAU, moving: true,
                 pal: Math.random() < 0.6 ? pal : pickPal(), gallop, mark: 'heart', foal: true, bow: 0, rear: 0, leap: 0, hornGlow: 0 },
            nextActAt: t + rnd(5, 12) };
          HERD.push(f);
        }
        return a;
      }
      function spawnFlyer(t){
        if (FLYERS.length >= 2) return null;
        const fromLeft = Math.random() < 0.5, dir = fromLeft ? 1 : -1, s = U * rnd(0.36, 0.48);
        const f = { kind: 'flyer', id: seq++, entered: false, speed: rnd(38, 56), lastTrail: 0, nextActAt: t + rnd(4, 9),
          L: { x: fromLeft ? -UNI.WIDTH * s - 40 : W + UNI.WIDTH * s + 40, y: H * rnd(0.10, 0.33), s, dir, ph: Math.random() * TAU, wt: Math.random() * TAU,
               moving: true, fly: true, wings: true, pal: pickPal(), mark: 'star', bow: 0, rear: 0, leap: 0, hornGlow: 0 } };
        FLYERS.push(f);
        return f;
      }
      function startAct(a, type, t){
        if (!a || a.act) return;
        if (!ACT_DUR[type]) type = 'jump';
        a.act = { type, t0: t };
        // the foal copies its mother's jump a beat later
        if (type === 'jump') HERD.forEach(f => { if (f.parent === a && !f.act) f.mimicAt = t + 0.35; });
      }
      function pickAct(a, clicked){
        const r = Math.random();
        if (a.kind === 'flyer') return 'flip';
        if (!clicked && r < 0.22) return 'graze';
        if (r < 0.45) return 'jump';
        if (r < 0.65) return 'rear';
        if (r < 0.87) return 'horn';
        return 'toot';
      }
      // per-frame act state: returns { yOff, rot } and sets the rig's pose fields
      function actFx(a, t){
        const L = a.L; L.bow = 0; L.rear = 0; L.leap = 0; L.hornGlow = 0;
        if (a.mimicAt != null && t >= a.mimicAt){ a.mimicAt = null; if (!a.act) a.act = { type: 'jump', t0: t }; }
        if (!a.act) return null;
        const type = a.act.type, p = (t - a.act.t0) / ACT_DUR[type];
        if (p >= 1){ a.act = null; return null; }
        if (type === 'jump'){
          const h = (a.kind === 'foal' ? 24 : 32) * L.s;
          L.leap = Math.sin(p * Math.PI);
          if (p > 0.05 && p < 0.12 && !a.act.dust){ a.act.dust = true; for (let i = 0; i < 6; i++) SPARK.push({ x: L.x + rnd(-20, 20) * L.s, y: L.y, vx: rnd(-25, 25), vy: rnd(-30, -5), g: 40, t0: t, life: 0.7, r: rnd(2, 4), col: pick(RAINBOW), kind: 'dot' }); }
          return { yOff: -Math.sin(p * Math.PI) * h, rot: -Math.sin(p * TAU) * 0.08 * L.dir };
        }
        if (type === 'rear'){ L.rear = Math.sin(p * Math.PI); return { yOff: 0, rot: 0 }; }
        if (type === 'graze'){ L.bow = p < 0.22 ? smooth(p / 0.22) : p > 0.82 ? smooth((1 - p) / 0.18) : 1; return { yOff: 0, rot: 0 }; }
        if (type === 'horn'){
          L.hornGlow = p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1;
          if (p > 0.2 && !a.act.fired){
            a.act.fired = true;
            const tip = hornTip(a);
            RINGS.push({ x: tip.x, y: tip.y, t0: t, s: L.s * 0.9, rainbow: true });
            for (let i = 0; i < 16; i++){
              const an = rnd(0, TAU), sp = rnd(40, 120) * L.s;
              SPARK.push({ x: tip.x, y: tip.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 30 * L.s, g: 30, t0: t, life: rnd(0.8, 1.4), r: rnd(3, 6) * L.s * 0.8, col: RAINBOW[i % 6], kind: i % 3 ? 'star' : 'dot' });
            }
            for (let i = 0; i < 3; i++) SPARK.push({ x: tip.x, y: tip.y, vx: rnd(-20, 20), vy: rnd(-90, -60) * L.s, g: 20, t0: t + i * 0.1, life: 1.6, r: 7 * L.s, col: '#ffffff', kind: 'star' });
          }
          return { yOff: 0, rot: 0 };
        }
        if (type === 'toot'){
          if ((a.lastPuff || 0) < t - 0.14 && p < 0.55){
            a.lastPuff = t;
            PUFFS.push({ x: L.x - 44 * L.s * L.dir, y: L.y - 50 * L.s, dx: -L.dir * rnd(8, 16) * L.s, t0: t, r: rnd(6, 10) * L.s, ph: Math.random() * TAU, col: pick(RAINBOW) });
            if (Math.random() < 0.5) SPARK.push({ x: L.x - 46 * L.s * L.dir, y: L.y - 50 * L.s, vx: -L.dir * rnd(10, 40), vy: rnd(-30, 0), g: 10, t0: t, life: 1.2, r: 3 * L.s, col: '#ffffff', kind: 'star' });
          }
          return { yOff: -Math.abs(Math.sin(p * Math.PI * 3)) * 3 * L.s, rot: Math.sin(p * 40) * 0.015 * (1 - p) * L.dir };
        }
        // flip: the flyer's eased somersault
        return { yOff: 0, rot: -ease(p) * TAU * L.dir, pivot: -55 };
      }
      function hornTip(a){
        const L = a.L, hm = HEAD_SCALE(L.foal), ty = L.foal ? -134 : -142;
        const x = HEAD_PIVOT[0] + (57 - HEAD_PIVOT[0]) * hm, y = HEAD_PIVOT[1] + (ty - HEAD_PIVOT[1]) * hm;
        return { x: L.x + L.dir * x * L.s, y: L.y + y * L.s };
      }
      function updateWalker(a, t, dt){
        const L = a.L;
        if (a.kind === 'foal'){
          const p = a.parent, target = p.L.x - p.L.dir * 74 * p.L.s;
          const dx = target - L.x;
          L.dir = p.L.dir;
          L.x += dx * Math.min(1, dt * 2.4);
          L.y += (p.L.y + 4 - L.y) * Math.min(1, dt * 1.5);
          L.moving = Math.abs(dx) > 3 * L.s && !a.act;
          if (L.moving) L.wt += dt * (a.speed / 6) * (L.gallop ? 1.2 : 1.9);
          if (!a.act && a.entered && t >= a.nextActAt){ startAct(a, Math.random() < 0.6 ? 'jump' : 'graze', t); a.nextActAt = t + rnd(9, 18); }
        } else {
          if (!a.act && a.entered && t >= a.nextActAt){ startAct(a, pickAct(a, false), t); a.nextActAt = t + rnd(8, 16); }
          L.moving = !a.act;
          if (L.moving){
            L.wt += dt * (a.speed / 6) * (L.gallop ? 1.15 : 1.6);
            L.x += L.dir * a.speed * U * dt;
            if (L.gallop && (a.lastDust || 0) < t - 0.08){
              a.lastDust = t;
              SPARK.push({ x: L.x - L.dir * rnd(10, 40) * L.s, y: L.y - rnd(0, 6) * L.s, vx: -L.dir * rnd(10, 30), vy: rnd(-40, -15), g: 30, t0: t, life: rnd(0.5, 0.9), r: rnd(1.5, 3.5) * L.s, col: pick(RAINBOW), kind: 'star' });
            }
          }
        }
        if (L.x > 0 && L.x < W) a.entered = true;
      }
      function updateFlyer(f, t, dt){
        const L = f.L;
        if (!f.act && f.entered && t >= f.nextActAt){ startAct(f, 'flip', t); f.nextActAt = t + rnd(7, 14); }
        L.wt += dt * 9;
        L.x += L.dir * f.speed * U * dt;
        L.y += Math.sin(t * 0.9 + L.ph) * 12 * dt;
        if (L.x > 0 && L.x < W) f.entered = true;
        if (f.lastTrail < t - 0.045){
          f.lastTrail = t;
          SPARK.push({ x: L.x - L.dir * 44 * L.s, y: L.y - 52 * L.s + rnd(-8, 8) * L.s, vx: -L.dir * 8, vy: rnd(8, 20), g: 6, t0: t, life: rnd(0.9, 1.5), r: rnd(1.6, 3.4) * L.s, col: RAINBOW[Math.floor(t * 9) % 6], kind: Math.random() < 0.4 ? 'star' : 'dot' });
        }
      }
      function drawActor(c, a, t){
        const L = a.L, fx = actFx(a, t);
        if (!fx){ drawUni(c, L, t); return; }
        c.save();
        if (fx.rot){ const py = L.y + (fx.pivot || 0) * L.s; c.translate(L.x, py); c.rotate(fx.rot); c.translate(-L.x, -py); }
        const sy = L.y; L.y += fx.yOff;
        drawUni(c, L, t);
        L.y = sy;
        c.restore();
      }
      function checkHearts(t){
        const A = HERD.filter(a => a.kind === 'adult');
        for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++){
          const a = A[i], b = A[j], left = a.L.x <= b.L.x ? a : b, right = left === a ? b : a;
          if (!(left.L.dir > 0 && right.L.dir < 0)) continue;
          const gap = (right.L.x - 62 * right.L.s) - (left.L.x + 62 * left.L.s), key = a.id + '-' + b.id;
          if (gap < 16 && gap > -40 && !HEARTS.some(h => h.key === key)){
            const s = Math.max(left.L.s, right.L.s);
            HEARTS.push({ key, t0: t, x: (left.L.x + right.L.x) / 2, y: Math.min(left.L.y, right.L.y) - 120 * s, r: 9 * s });
          }
        }
      }

      // ── clickable magic ──
      function fireworks(t){
        const C = CASTLE;
        castleFx = { t0: t };
        for (let i = 0; i < 3; i++){
          const x = C.cx + rnd(-90, 90) * C.k, y = C.by - rnd(180, 300) * C.k, at = t + i * 0.38, col = pick(RAINBOW);
          FW.push({ x, y, t0: at, col });
        }
      }
      function fishLeap(t){
        const p = POND, n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++){
          const dir = Math.random() < 0.5 ? 1 : -1, x0 = p.x + rnd(-0.55, 0.55) * p.rx;
          FISH.push({ x0, y0: p.y, dir, t0: t + i * 0.42, dur: rnd(0.9, 1.2), h: rnd(0.045, 0.07) * H, dx: dir * rnd(0.25, 0.4) * p.rx, col: pick(RAINBOW), s: U * rnd(0.55, 0.75) });
        }
        nextFishAt = t + rnd(25, 50);
      }
      function bloom(x, y, t){
        const n = 6 + Math.floor(Math.random() * 4), fl = [];
        for (let i = 0; i < n; i++) fl.push({ dx: rnd(-46, 46) * U * 0.6, dy: rnd(-10, 12) * U * 0.6, r: rnd(3.5, 6) * U * 0.6, col: pick(['#ff8fc8', '#ffe66d', '#ffffff', '#c77dff', '#ffb0d8', '#7dc4ff']), d: Math.random() * 0.3 });
        BLOOMS.push({ x, y, t0: t, fl });
        for (let i = 0; i < 10; i++){ const an = rnd(0, TAU); SPARK.push({ x, y, vx: Math.cos(an) * rnd(30, 90), vy: Math.sin(an) * rnd(30, 90) - 40, g: 60, t0: t, life: rnd(0.6, 1), r: rnd(2, 4), col: pick(RAINBOW), kind: 'star' }); }
      }
      function glitter(cl, t){
        if (!cl) return;
        cl.flash = t;
        const s = cl.s * U;
        for (let i = 0; i < 34; i++)
          SPARK.push({ x: cl.x + rnd(-52, 52) * s, y: cl.y + rnd(4, 14) * s, vx: rnd(-8, 8), vy: rnd(10, 40), g: 26, t0: t + Math.random() * 0.6, life: rnd(1.8, 2.6), r: rnd(1.8, 3.6), col: pick(RAINBOW.concat(['#ffffff'])), kind: i % 2 ? 'star' : 'dot' });
      }
      function skyBurst(x, y, t){
        for (let i = 0; i < 14; i++){ const an = rnd(0, TAU); SPARK.push({ x, y, vx: Math.cos(an) * rnd(30, 110), vy: Math.sin(an) * rnd(30, 110), g: 20, t0: t, life: rnd(0.6, 1.1), r: rnd(2, 5), col: pick(RAINBOW), kind: i % 4 === 0 ? 'heart' : 'star' }); }
      }

      // ── dynamic sky things ──
      function celestial(){
        const sp = sunP(tod), mp = moonP(tod);
        const sun = (sp >= -0.02 && sp <= 1.02) ? { x: W * (0.06 + 0.90 * sp), y: H * (0.60 - 0.54 * Math.sin(Math.PI * clamp(sp, 0, 1))) } : null;
        const moon = (mp >= -0.02 && mp <= 1.02) ? { x: W * (0.99 - 0.34 * mp), y: H * (0.55 - 0.40 * Math.sin(Math.PI * clamp(mp, 0, 1))) } : null;
        return { sun, moon, sp, mp };
      }
      function drawStars(t, L){
        if (L.starA <= 0.01) return;
        for (const s of STARS){
          const tw = 0.5 + 0.5 * Math.sin(t * s.tw + s.ph);
          ctx.fillStyle = 'rgba(' + s.col + ',' + (L.starA * tw).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
          if (s.r > 1.5 && tw > 0.8){ ctx.fillStyle = 'rgba(255,255,255,' + (L.starA * (tw - 0.8) * 2).toFixed(3) + ')'; sparkPath(ctx, s.x, s.y, s.r * 3.2); ctx.fill(); }
        }
      }
      function drawShooters(t, L){
        if (L.starA > 0.6 && t >= nextShootAt){
          SHOOTERS.push({ x0: W * rnd(0.1, 0.9), y0: H * rnd(0.03, 0.25), dx: (Math.random() < 0.5 ? -1 : 1) * rnd(200, 400), dy: rnd(90, 170), t0: t, dur: rnd(0.7, 1.2), col: pick(['255,255,255', '255,200,235', '200,230,255']) });
          nextShootAt = t + rnd(5, 13);
        }
        SHOOTERS = SHOOTERS.filter(s => t - s.t0 < s.dur);
        for (const s of SHOOTERS){
          const p = (t - s.t0) / s.dur, x = s.x0 + s.dx * p, y = s.y0 + s.dy * p;
          const g = ctx.createLinearGradient(x - s.dx * 0.18, y - s.dy * 0.18, x, y);
          g.addColorStop(0, 'rgba(' + s.col + ',0)'); g.addColorStop(1, 'rgba(' + s.col + ',' + (0.9 * (1 - p)).toFixed(3) + ')');
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - s.dx * 0.18, y - s.dy * 0.18); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      function drawAurora(t, L){
        const a = L.auroraA; if (a < 0.02) return;
        const cols = ['142,229,201', '255,154,201', '199,125,255'];
        ctx.save();
        for (let i = 0; i < 3; i++){
          const base = H * (0.03 + i * 0.065), hgt = H * 0.21, x0 = W * 0.46, x1 = W * 1.04, n = 30;
          const al = a * (0.42 + 0.16 * Math.sin(t * 0.5 + i * 1.7));
          ctx.fillStyle = lg(ctx, 0, base - hgt * 0.3, 0, base + hgt, [[0, 'rgba(' + cols[i] + ',0)'], [0.55, 'rgba(' + cols[i] + ',' + al.toFixed(3) + ')'], [1, 'rgba(' + cols[i] + ',0)']]);
          ctx.beginPath();
          for (let k = 0; k <= n; k++){ const x = x0 + (x1 - x0) * k / n, y = base + Math.sin(x * 0.0045 + t * 0.35 + i * 1.3) * H * 0.04 + Math.sin(x * 0.011 - t * 0.2 + i) * H * 0.015; ctx.lineTo(x, y - hgt * 0.3); }
          for (let k = n; k >= 0; k--){ const x = x0 + (x1 - x0) * k / n, y = base + Math.sin(x * 0.0045 + t * 0.35 + i * 1.3) * H * 0.04 + Math.sin(x * 0.011 - t * 0.2 + i) * H * 0.015; ctx.lineTo(x, y + hgt); }
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      function drawSunMoon(t, L, cel){
        const R = Math.min(W, H) * L.sunR;
        if (cel.sun){
          const { x, y } = cel.sun;
          ctx.fillStyle = rg(ctx, x, y, R * 0.6, R * 4.5, [[0, L.glow], [1, 'rgba(255,200,150,0)']]);
          ctx.beginPath(); ctx.arc(x, y, R * 4.5, 0, TAU); ctx.fill();
          // soft rays, turning slowly (fast for a moment when the sun is clicked)
          const boost = sunBoost ? clamp(1 - (t - sunBoost.t0) / 3, 0, 1) : 0;
          if (sunBoost && boost <= 0) sunBoost = null;
          const ang = t * 0.08 + (sunBoost ? sunBoost.extra + (t - sunBoost.t0) * 2.2 * boost : 0);
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
          ctx.fillStyle = 'rgba(255,245,210,' + (0.10 + 0.25 * boost).toFixed(3) + ')';
          for (let i = 0; i < 8; i++){ ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(0, -R * 0.4); ctx.lineTo(R * 0.35, -R * 2.6); ctx.lineTo(-R * 0.35, -R * 2.6); ctx.closePath(); ctx.fill(); }
          ctx.restore();
          ctx.fillStyle = rg(ctx, x, y, 0, R, [[0, '#ffffff'], [0.6, L.sunCol], [1, mixCol(L.sunCol, '#ffa24c', 0.35)]]);
          ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        }
        if (cel.moon && L.starA > 0.05){
          const { x, y } = cel.moon, r = Math.min(W, H) * 0.06, a = clamp(L.starA * 1.3, 0, 1);
          ctx.save(); ctx.globalAlpha = a;
          ctx.fillStyle = rg(ctx, x, y, r * 0.8, r * 4, [[0, 'rgba(210,200,255,.38)'], [1, 'rgba(210,200,255,0)']]);
          ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill();
          ctx.fillStyle = rg(ctx, x - r * 0.3, y - r * 0.3, r * 0.2, r, [[0, '#fffdf4'], [1, '#e0dcf0']]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(170,160,200,.4)';
          for (const [dx, dy, rr] of [[-0.35, -0.2, 0.18], [0.25, 0.1, 0.13], [0.05, 0.45, 0.1], [0.4, -0.4, 0.08], [-0.1, -0.55, 0.07]]){
            ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
      }
      function drawClouds(t, dt, L){
        ctx.save();
        for (const c of CLOUDS){
          c.x += c.spd * dt; if (c.x - 150 * c.s * U > W) c.x = -150 * c.s * U;
          const s = c.s * U, fl = clamp(1 - (t - c.flash) / 1.2, 0, 1);
          ctx.globalAlpha = 0.6 + 0.4 * L.daylight;
          ctx.fillStyle = mixCol(L.cloudTint, '#ff9ac9', fl * 0.6);
          for (const [dx, dy, r] of [[-40, 10, 20], [-14, -4, 27], [16, 2, 24], [40, 12, 18], [0, 14, 22]]){ ctx.beginPath(); ctx.arc(c.x + dx * s, c.y + dy * s + 4 * s, r * s, 0, TAU); ctx.fill(); }
          ctx.fillStyle = mixCol(L.cloud, '#ffd0e8', fl * 0.6);
          for (const [dx, dy, r] of [[-40, 6, 20], [-14, -8, 27], [16, -2, 24], [40, 8, 18], [0, 10, 22]]){ ctx.beginPath(); ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      }
      function drawRainbow(t, L){
        const a = L.rainbowA; if (a < 0.01) return;
        const { cx, cy, r } = RB, bw = r * 0.032;
        ctx.save(); ctx.lineCap = 'butt';
        for (let i = 0; i < 6; i++){
          ctx.strokeStyle = withA(RAINBOW[i], a); ctx.lineWidth = bw + 0.6;
          ctx.beginPath(); ctx.arc(cx, cy, r - bw * (i + 0.5), Math.PI, TAU); ctx.stroke();
        }
        if (rainFx){
          const p = (t - rainFx.t0) / 2.8;
          if (p >= 1) rainFx = null;
          else {
            const an = Math.PI + p * Math.PI, hw = 0.22;
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * Math.sin(p * Math.PI)).toFixed(3) + ')'; ctx.lineWidth = bw * 6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(cx, cy, r - bw * 3, an - hw, an + hw); ctx.stroke();
            if ((rainFx.last || 0) < t - 0.07){ rainFx.last = t; const rr = r - bw * rnd(0.5, 5.5); SPARK.push({ x: cx + Math.cos(an) * rr, y: cy + Math.sin(an) * rr, vx: rnd(-20, 20), vy: rnd(-40, -10), g: 20, t0: t, life: 0.9, r: rnd(3, 6), col: '#ffffff', kind: 'star' }); }
          }
        }
        ctx.restore();
      }
      function drawWaterfall(t, L){
        const F = FALL, w = F.x1 - F.x0, h = F.yBot - F.yTop;
        ctx.fillStyle = lg(ctx, F.x0, 0, F.x1, 0, [[0, withA(L.water, 0.55)], [0.5, withA(mixCol(L.water, '#ffffff', 0.35), 0.85)], [1, withA(L.water, 0.55)]]);
        ctx.fillRect(F.x0, F.yTop, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++){
          const fx = F.x0 + w * (0.06 + 0.88 * psr(i + 900)), sp = 260 + psr(i + 910) * 200, len = h * (0.12 + psr(i + 920) * 0.12);
          const y = F.yTop + ((t * sp + psr(i + 930) * h * 2) % (h + len)) - len;
          const ya = Math.max(F.yTop, y), yb = Math.min(F.yBot, y + len);
          if (yb <= ya) continue;
          ctx.lineWidth = 1.2 + psr(i + 940) * 2; ctx.globalAlpha = 0.35 + 0.45 * psr(i + 950);
          ctx.beginPath(); ctx.moveTo(fx, ya); ctx.lineTo(fx, yb); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // the lip of the falls + mist at the foot
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse((F.x0 + F.x1) / 2, F.yTop + 2, w * 0.55, 3.5, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 6; i++){
          const mx = F.x0 + w * (0.1 + 0.8 * psr(i + 960)) + Math.sin(t * 1.3 + i) * 6, my = F.yBot - 4 - Math.abs(Math.sin(t * 1.1 + i * 1.3)) * 10, r = (8 + psr(i + 970) * 8) * U * 0.6;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.16 + 0.1 * Math.sin(t * 2 + i)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
        }
        // ripples where the water lands
        const p = POND;
        ctx.save(); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); ctx.clip();
        for (let i = 0; i < 3; i++){
          const q = ((t * 0.7 + i / 3) % 1), rr = q * p.rx * 0.5;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 * (1 - q)).toFixed(3) + ')'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse((F.x0 + F.x1) / 2, p.y - p.ry * 0.5, rr, rr * 0.3, 0, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
      function drawPondLight(L, cel){
        const p = POND, body = cel.sun || (cel.moon && L.starA > 0.3 ? cel.moon : null); if (!body) return;
        const a = cel.sun ? 0.22 * L.daylight : 0.25 * L.starA;
        ctx.save(); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); ctx.clip();
        const rx = clamp(body.x, p.x - p.rx * 0.7, p.x + p.rx * 0.7);
        ctx.fillStyle = rg(ctx, rx, p.y, 0, p.rx * 0.5, [[0, 'rgba(255,250,225,' + a.toFixed(3) + ')'], [1, 'rgba(255,250,225,0)']]);
        ctx.fillRect(p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
        ctx.restore();
      }
      function drawCastleLive(t, L){
        const C = CASTLE, fl = castleFx ? clamp(1 - (t - castleFx.t0) / 2.6, 0, 1) : 0;
        if (castleFx && fl <= 0) castleFx = null;
        const glow = clamp((1 - L.daylight) * 1.3, 0, 1) * 0.85 + fl * Math.sin(fl * Math.PI) * 0.9;
        if (glow > 0.03){
          for (const w of C.windows){
            ctx.fillStyle = rg(ctx, w.x, w.y, 0, w.w * 2.6, [[0, 'rgba(255,225,140,' + (0.55 * glow).toFixed(3) + ')'], [1, 'rgba(255,225,140,0)']]);
            ctx.beginPath(); ctx.arc(w.x, w.y, w.w * 2.6, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,238,170,' + (0.95 * glow).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(w.x - w.w / 2, w.y + w.h / 2); ctx.lineTo(w.x - w.w / 2, w.y - w.h / 4); ctx.arc(w.x, w.y - w.h / 4, w.w / 2, Math.PI, 0); ctx.lineTo(w.x + w.w / 2, w.y + w.h / 2); ctx.closePath(); ctx.fill();
          }
        }
        if (fl > 0){
          ctx.fillStyle = rg(ctx, C.cx, C.by - 110 * C.k, 0, 200 * C.k, [[0, 'rgba(255,230,180,' + (0.28 * Math.sin(fl * Math.PI)).toFixed(3) + ')'], [1, 'rgba(255,230,180,0)']]);
          ctx.beginPath(); ctx.arc(C.cx, C.by - 110 * C.k, 200 * C.k, 0, TAU); ctx.fill();
        }
        // fluttering pennants
        for (const f of C.flags){
          const wv = Math.sin(t * 6 + f.ph) * 0.18;
          ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1, C.k); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - f.h * 1.5); ctx.stroke();
          ctx.fillStyle = f.ph % 2 > 1 ? '#ff6fb5' : '#c77dff';
          ctx.beginPath(); ctx.moveTo(f.x, f.y - f.h * 1.5); ctx.quadraticCurveTo(f.x + f.h * 0.7, f.y - f.h * (1.3 - wv), f.x + f.h * 1.2, f.y - f.h * (1.15 + wv)); ctx.lineTo(f.x, f.y - f.h * 0.8); ctx.closePath(); ctx.fill();
        }
      }
      function drawFireworks(t){
        FW = FW.filter(f => t - f.t0 < 1.7);
        for (const f of FW){
          if (t < f.t0) continue;
          if (!f.burst){
            f.burst = true;
            RINGS.push({ x: f.x, y: f.y, t0: t, s: CASTLE.k * 1.3, col: f.col });
            for (let i = 0; i < 26; i++){ const an = (i / 26) * TAU, sp = rnd(70, 130) * CASTLE.k; SPARK.push({ x: f.x, y: f.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 55, t0: t, life: rnd(1, 1.5), r: rnd(2, 4.5), col: i % 2 ? f.col : '#ffffff', kind: i % 3 ? 'dot' : 'star' }); }
          }
          const p = (t - f.t0) / 1.7;
          if (p < 0.25){ ctx.fillStyle = withA(f.col, 0.8 * (1 - p / 0.25)); ctx.beginPath(); ctx.arc(f.x, f.y, 10 * CASTLE.k * (1 + p * 4), 0, TAU); ctx.fill(); }
        }
      }
      function drawFish(t){
        FISH = FISH.filter(f => t - f.t0 < f.dur);
        for (const f of FISH){
          if (t < f.t0) continue;
          const p = (t - f.t0) / f.dur, x = f.x0 + f.dx * p, y = f.y0 - Math.sin(p * Math.PI) * f.h;
          if (p < 0.08 || p > 0.92){ ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 3; i++){ ctx.beginPath(); ctx.arc(x + rnd(-8, 8) * f.s, f.y0 - rnd(2, 10) * f.s, rnd(1.5, 3) * f.s, 0, TAU); ctx.fill(); } }
          if (y > f.y0 - 4) continue;
          const ang = Math.atan2(-Math.cos(p * Math.PI) * f.h * Math.PI, f.dx);
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (f.dir < 0) ctx.scale(1, -1);
          ctx.fillStyle = f.col; ctx.beginPath(); ctx.ellipse(0, 0, 11 * f.s, 5 * f.s, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-9 * f.s, 0); ctx.lineTo(-16 * f.s, -6 * f.s); ctx.lineTo(-16 * f.s, 6 * f.s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(1 * f.s, 1.5 * f.s, 7 * f.s, 2.2 * f.s, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#4a2a5a'; ctx.beginPath(); ctx.arc(6 * f.s, -1.5 * f.s, 1.3 * f.s, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      function drawBlooms(t){
        BLOOMS = BLOOMS.filter(b => t - b.t0 < 11);
        for (const b of BLOOMS){
          const age = t - b.t0, fade = age > 9.5 ? clamp(1 - (age - 9.5) / 1.5, 0, 1) : 1;
          for (const f of b.fl){
            const g = smooth((age - f.d) / 0.6); if (g <= 0) continue;
            const x = b.x + f.dx, y = b.y + f.dy, r = f.r * g, sway = Math.sin(t * 2 + f.dx) * 1.5;
            ctx.globalAlpha = fade;
            ctx.strokeStyle = '#4a9448'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + sway, y - r * 1.2, x + sway, y - r * 2.6); ctx.stroke();
            ctx.fillStyle = f.col;
            for (let k = 0; k < 5; k++){ const an = k / 5 * TAU + t * 0.2; ctx.beginPath(); ctx.arc(x + sway + Math.cos(an) * r * 0.9, y - r * 2.6 + Math.sin(an) * r * 0.9, r * 0.62, 0, TAU); ctx.fill(); }
            ctx.fillStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(x + sway, y - r * 2.6, r * 0.5, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
      function drawSpark(t){
        SPARK = SPARK.filter(p => t - p.t0 < p.life);
        for (const p of SPARK){
          const age = t - p.t0; if (age < 0) continue;
          const q = age / p.life, x = p.x + p.vx * age, y = p.y + p.vy * age + 0.5 * p.g * age * age, al = 1 - q * q;
          ctx.fillStyle = withA(p.col, al);
          if (p.kind === 'star') { sparkPath(ctx, x, y, p.r * (1.2 - q * 0.5)); ctx.fill(); }
          else if (p.kind === 'heart') { heartPath(ctx, x, y, p.r * 0.9); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(x, y, p.r * (1 - q * 0.4), 0, TAU); ctx.fill(); }
        }
      }
      function drawFx(t){
        RINGS = RINGS.filter(r => t - r.t0 < 1.5);
        for (const r of RINGS){
          const p = (t - r.t0) / 1.5;
          if (r.rainbow){
            for (let i = 0; i < 6; i++){
              const q = p * 1.15 - i * 0.03; if (q <= 0 || q >= 1) continue;
              ctx.strokeStyle = withA(RAINBOW[i], 0.6 * (1 - q)); ctx.lineWidth = (6 - q * 4) * r.s;
              ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.5, (8 + q * 110 - i * 3) * r.s), 0, TAU); ctx.stroke();
            }
          } else {
            for (const k of [0, 0.2]){
              const q = p * 1.2 - k; if (q <= 0 || q >= 1) continue;
              ctx.strokeStyle = withA(r.col, 0.5 * (1 - q)); ctx.lineWidth = 3 * (1 - q) + 1;
              ctx.beginPath(); ctx.arc(r.x, r.y, (10 + q * 120) * r.s, 0, TAU); ctx.stroke();
            }
          }
        }
        PUFFS = PUFFS.filter(p => t - p.t0 < 2.2);
        for (const p of PUFFS){
          const age = t - p.t0, q = age / 2.2, x = p.x + p.dx * age + Math.sin(t * 2 + p.ph) * 3, y = p.y - 18 * age, r = p.r * (1 + q * 1.6), al = 0.38 * (1 - q);
          ctx.fillStyle = rg(ctx, x, y, 0, r, [[0, withA(p.col, al)], [0.6, withA(p.col, al * 0.55)], [1, withA(p.col, 0)]]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
        HEARTS = HEARTS.filter(h => t - h.t0 < 1.7);
        for (const h of HEARTS){
          const age = (t - h.t0) / 1.7, r = h.r * (1 + age * 0.3);
          ctx.fillStyle = 'rgba(255,90,150,' + (1 - age).toFixed(3) + ')'; heartPath(ctx, h.x, h.y - 46 * age, r); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - age)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(h.x - r * 0.45, h.y - 46 * age - r * 0.5, r * 0.22, 0, TAU); ctx.fill();
        }
      }
      function drawMotes(t){
        for (const m of MOTES){
          const k = Math.pow(Math.max(0, Math.sin(t / m.per * TAU + m.ph)), 6); if (k < 0.03) continue;
          ctx.fillStyle = 'rgba(' + m.col + ',' + (0.85 * k).toFixed(3) + ')'; sparkPath(ctx, m.x, m.y, m.r * (0.6 + 0.4 * k)); ctx.fill();
        }
      }
      function drawPetals(t, dt){
        for (const p of PETALS){
          p.y += p.sp * dt; p.x += Math.sin(t * 0.8 + p.ph) * 22 * dt; p.rot += p.rs * dt;
          if (p.y > H + 10){ p.y = -10; p.x = Math.random() * W; }
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = 'rgba(255,170,212,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 4.2 * p.s * U * 0.6, 2.6 * p.s * U * 0.6, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      function drawButterflies(t, dt, L){
        const a = clamp(L.daylight - 0.25, 0, 1); if (a < 0.02) return;
        ctx.save(); ctx.globalAlpha = a;
        for (const b of BFLY){
          if (t >= b.turnAt){ b.turnAt = t + rnd(1.5, 4); b.vx = rnd(-55, 55); b.vy = rnd(-22, 22); }
          b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(t * 6 + b.ph) * 14 * dt;
          if (b.x < -20) b.vx = Math.abs(b.vx); if (b.x > W + 20) b.vx = -Math.abs(b.vx);
          if (b.y < H * 0.05) b.vy = Math.abs(b.vy); if (b.y > H * 0.97) b.vy = -Math.abs(b.vy);
          const fl = Math.abs(Math.cos(t * 13 + b.ph)), s = b.s * U * 0.6;
          ctx.save(); ctx.translate(b.x, b.y); if (b.vx < 0) ctx.scale(-1, 1);
          ctx.fillStyle = b.col;
          ctx.beginPath(); ctx.ellipse(-4 * s * fl, -3 * s, 5 * s * fl, 4.5 * s, -0.3, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-3.5 * s * fl, 3 * s, 4 * s * fl, 3.5 * s, 0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-4.5 * s * fl, -3.5 * s, 1.6 * s * fl, 0, TAU); ctx.fill();
          ctx.fillStyle = '#4a2a5a'; ctx.beginPath(); ctx.ellipse(0, 0, 1.2 * s, 5 * s, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      function drawFireflies(t, L){
        const n = clamp((L.starA - 0.5) / 0.5, 0, 1); if (n < 0.02) return;
        for (const f of FLIES){
          const x = f.x + Math.sin(t * f.sp + f.ph) * 40 + Math.sin(t * 0.37 + f.ph * 2) * 60, y = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 18;
          const bl = Math.pow(Math.max(0, Math.sin(t * 1.3 + f.ph * 3)), 3) * n; if (bl < 0.03) continue;
          ctx.fillStyle = rg(ctx, x, y, 0, 9, [[0, 'rgba(255,240,170,' + (0.9 * bl).toFixed(3) + ')'], [1, 'rgba(255,240,170,0)']]);
          ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
        }
        // glowing mushrooms
        for (const m of MUSH){
          const g = n * (0.5 + 0.3 * Math.sin(t * 1.5 + m.ph));
          ctx.fillStyle = rg(ctx, m.x, m.y - 16 * m.s, 0, 26 * m.s, [[0, 'rgba(255,150,220,' + (0.45 * g).toFixed(3) + ')'], [1, 'rgba(255,150,220,0)']]);
          ctx.beginPath(); ctx.arc(m.x, m.y - 16 * m.s, 26 * m.s, 0, TAU); ctx.fill();
        }
      }
      function drawForeground(t, L){
        for (const g of GRASS){
          const sway = Math.sin(t * 1.6 + g.ph) * 2.2 * g.s;
          ctx.strokeStyle = L.grassD; ctx.lineWidth = 1.6 * g.s; ctx.lineCap = 'round'; ctx.beginPath();
          for (let k = -2; k <= 2; k++){ ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(g.x + k * 3 * g.s + sway * 0.5, g.y - 10 * g.s, g.x + k * 5.5 * g.s + sway, g.y - 17 * g.s); }
          ctx.stroke();
        }
        for (const f of FLOWERS){
          const sway = Math.sin(t * 1.4 + f.ph) * 2 * f.s, hx = f.x + sway, hy = f.y - 20 * f.s;
          ctx.strokeStyle = L.grassD; ctx.lineWidth = 1.8 * f.s; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + sway * 0.4, f.y - 10 * f.s, hx, hy); ctx.stroke();
          ctx.fillStyle = L.grass; ctx.beginPath(); ctx.ellipse(f.x + 4 * f.s, f.y - 6 * f.s, 4.5 * f.s, 2 * f.s, -0.6, 0, TAU); ctx.fill();
          ctx.fillStyle = withA(f.col, 0.5 + 0.5 * L.daylight);
          for (let k = 0; k < 5; k++){ const an = k / 5 * TAU + f.ph; ctx.beginPath(); ctx.arc(hx + Math.cos(an) * 4.2 * f.s, hy + Math.sin(an) * 4.2 * f.s, 3 * f.s, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#ffe66d'; ctx.beginPath(); ctx.arc(hx, hy, 2.4 * f.s, 0, TAU); ctx.fill();
        }
      }

      // ── the frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        if (todTween){
          const p = clamp((t - todTween.t0) / todTween.dur, 0, 1);
          tod = (todTween.from + (todTween.to - todTween.from) * smooth(p)) % 1;
          if (p >= 1) todTween = null;
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        repaintIfNeeded();
        const L = curLook, cel = celestial();
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        drawStars(t, L); drawShooters(t, L); drawAurora(t, L); drawSunMoon(t, L, cel); drawRainbow(t, L); drawClouds(t, dt, L);
        ctx.drawImage(sceneL.cv, 0, 0, W, H);
        drawCastleLive(t, L); drawWaterfall(t, L); drawPondLight(L, cel);
        // ambient celebrations
        if (t >= nextAmbientAt){ nextAmbientAt = t + rnd(12, 30); if (Math.random() < 0.5) rainFx = { t0: t }; else castleFx = { t0: t }; }
        if (t >= nextFishAt) fishLeap(t);
        // spawn cadence: keep the meadow alive, never crowded
        const adults = HERD.filter(a => a.kind === 'adult').length;
        if (t >= nextGroupAt && adults < 2 && HERD.length < 4){ spawnGroup(t, {}); nextGroupAt = t + rnd(6, 14); }
        if (t >= nextFlyerAt && FLYERS.length < 1){ spawnFlyer(t); nextFlyerAt = t + rnd(18, 40); }
        for (const a of HERD) updateWalker(a, t, dt);
        for (const f of FLYERS) updateFlyer(f, t, dt);
        const gone = new Set();
        HERD.forEach(a => { if (a.kind === 'adult' && a.entered){ const pad = UNI.WIDTH * a.L.s * 1.6 + 120; if (a.L.x < -pad || a.L.x > W + pad) gone.add(a); } });
        HERD = HERD.filter(a => !gone.has(a) && !gone.has(a.parent));
        FLYERS = FLYERS.filter(f => { if (!f.entered) return true; const pad = UNI.WIDTH * f.L.s * 1.6 + 160; return f.L.x > -pad && f.L.x < W + pad; });
        checkHearts(t);
        // ground shadows lean away from the sun; fainter at night
        const walkers = HERD.slice().sort((a, b) => a.L.y - b.L.y), shDx = cel.sun ? (0.5 - clamp(cel.sp, 0, 1)) * 26 : 0;
        for (const a of walkers){
          const fx = a.act && a.act.type === 'jump' ? 1 - Math.sin((t - a.act.t0) / ACT_DUR.jump * Math.PI) * 0.4 : 1;
          ctx.fillStyle = 'rgba(40,10,50,' + ((0.10 + 0.16 * L.daylight) * fx).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(a.L.x + shDx * a.L.s * 0.5, a.L.y + 1.5 * a.L.s, 46 * a.L.s * fx, 6 * a.L.s, 0, 0, TAU); ctx.fill();
        }
        // actors on their own layer, tinted by the hour
        const ac = actL.cx;
        ac.clearRect(0, 0, W, H);
        for (const f of FLYERS) drawActor(ac, f, t);
        for (const a of walkers) drawActor(ac, a, t);
        if (L.tint[3] > 0.004){
          ac.save(); ac.globalCompositeOperation = 'source-atop'; ac.fillStyle = rgbaOf(L.tint); ac.fillRect(0, 0, W, H); ac.restore();
        }
        ctx.drawImage(actL.cv, 0, 0, W, H);
        drawFireworks(t); drawFish(t); drawBlooms(t); drawFx(t); drawSpark(t);
        drawForeground(t, L); drawButterflies(t, dt, L); drawFireflies(t, L); drawPetals(t, dt); drawMotes(t);
        ctx.drawImage(vigL.cv, 0, 0, W, H);
      }
      let renderErr = false;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);          // scheduled first: a bad frame never kills the loop
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!renderErr){ renderErr = true; console.error('unicorns2 frame error', e); } }
      }

      // ── layout / input ──
      function resize(){
        const first = !W;
        const keep = HERD.map(a => ({ a, fx: a.L.x / W, fy: a.L.y / H, su: a.L.s / U }));
        const keepF = FLYERS.map(f => ({ f, fx: f.L.x / W, fy: f.L.y / H, su: f.L.s / U }));
        W = innerWidth; H = innerHeight;
        canvas.width = W * DPR; canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        skyL = makeLayer(); sceneL = makeLayer(); actL = makeLayer(); vigL = makeLayer();
        buildScene();
        if (!first){
          keep.forEach(({ a, fx, fy, su }) => { a.L.x = fx * W; a.L.y = fy * H; a.L.s = su * U; HERD.push(a); });
          keepF.forEach(({ f, fx, fy, su }) => { f.L.x = fx * W; f.L.y = fy * H; f.L.s = su * U; FLYERS.push(f); });
        } else {
          // the valley is never empty: a mother + foal at the left, a single at the right
          const a = spawnGroup(0, { x: W * 0.12, fromLeft: true, foal: true, lane: 0.55, gallop: false });
          if (a) a.nextActAt = 2;
          const b = spawnGroup(0, { x: W * 0.72, fromLeft: false, foal: false, lane: 0.25, gallop: false });
          if (b) b.nextActAt = 5;
          nextGroupAt = 14; nextFlyerAt = 6;
        }
        paintVignette(vigL.cx); lookKey = null; repaintIfNeeded();
      }
      const onClick = e => {
        if (stopped) return;
        if (e.target.closest && e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
        const mx = e.clientX, my = e.clientY, t = lastT;
        let hit = null;
        for (const a of HERD.concat(FLYERS)){
          const hw = UNI.WIDTH * a.L.s, hh = UNI.HEIGHT * a.L.s;
          if (mx > a.L.x - hw && mx < a.L.x + hw && my > a.L.y - hh && my < a.L.y + 8 * a.L.s) if (!hit || a.L.y > hit.L.y) hit = a;
        }
        if (hit){ if (!hit.act) startAct(hit, pickAct(hit, true), t); return; }
        const C = CASTLE;
        if (mx > C.box[0] && mx < C.box[2] && my > C.box[1] && my < C.box[3]){ fireworks(t); return; }
        const p = POND;
        if (Math.pow((mx - p.x) / (p.rx * 1.1), 2) + Math.pow((my - p.y) / (p.ry * 1.6), 2) < 1){ fishLeap(t); return; }
        const cel = celestial(), R = Math.min(W, H) * 0.12;
        const F = FALL, onFall = mx > F.x0 - 12 && mx < F.x1 + 12 && my > F.yTop && my < F.yBot;
        const body = (cel.sun && Math.hypot(mx - cel.sun.x, my - cel.sun.y) < R) ? 'sun'
                   : (cel.moon && curLook.starA > 0.05 && Math.hypot(mx - cel.moon.x, my - cel.moon.y) < R) ? 'moon'
                   : onFall ? 'fall' : null;
        if (body){
          if (body === 'sun'){ sunBoost = { t0: t, extra: sunBoost ? sunBoost.extra + (t - sunBoost.t0) * 2.2 * clamp(1 - (t - sunBoost.t0) / 3, 0, 1) : 0 }; skyBurst(cel.sun.x, cel.sun.y, t); }
          if (!todTween){ const next = (Math.floor(tod / P) + 1) * P + P / 2; todTween = { from: tod, to: next, t0: t, dur: 2.6 }; }
          return;
        }
        for (const cl of CLOUDS){
          const s = cl.s * U;
          if (mx > cl.x - 60 * s && mx < cl.x + 60 * s && my > cl.y - 36 * s && my < cl.y + 34 * s){ glitter(cl, t); return; }
        }
        // the rainbow's band
        const d = Math.hypot(mx - RB.cx, my - RB.cy);
        if (my < RB.cy && d < RB.r + 8 && d > RB.r - RB.r * 0.032 * 6 - 8){ rainFx = { t0: t }; return; }
        if (my > H * 0.66) bloom(mx, my, t); else skyBurst(mx, my, t);
      };

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      // ── "rumi" strolls across the meadow every few minutes
      rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, {
          height: '19vh', bottom: '4.5vh', duration: 16000, zIndex: 7,
          gapMin: 120000, gapMax: 240000,
          startDelay: 60000 + Math.random() * 120000,
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
