/* ── trike.js — a cartoon TRICERATOPS, drawn from scratch on canvas ──────────
   One of the from-scratch dinosaur rigs (workshop: backgrounds/dino_rigs/
   dinos.html). Shared helpers: rig-common.js (window.DinoRig). Sibling of
   trex.js — same house style: soft rounded shapes, no outlines, everything
   in true profile (one eye).

   THE LOOK: a stocky barrel body on four thick legs with flat nailed feet,
   a short thick tail, and a BIG head: a broad rounded neck frill rimmed
   with soft accent-coloured knobs (a lighter inner shield behind the face),
   two long gently curving cream brow horns (the far one peeking behind) and
   a stubby nose horn, a warm-orange parrot beak, a big eye under a heavy
   brow, a blushing cheek.
   Cream belly panel with soft stripes, spots on the flank, sunset rim
   light along the back and the frill.

   ALIVE: breathing, blinking, a slow head sway, the tail flicks, a heavy
   diagonal-gait walk with a stride bob. pose 0..1 = CHARGE STANCE: the head
   drops and shakes, the near front foot paws the ground kicking up dust,
   two little snorts puff from the nostril, then the head lifts again.

   API — window.TrikeRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: feet on y = 0, facing +x, ~126 units tall
     HEIGHT 126, WIDTH 98 (half-width), PALS, DEFAULT 'sun'
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, alpha, palette, blob, taper, leg, eye, blink, brow, spots, stripes, rim, dust } = window.DinoRig;
  const PALS = ['sun', 'green', 'teal', 'violet', 'pink'];

  // a cream horn standing on (x, y) — a tapered curve, rounded tip
  function horn(g, C, P, w0, w1, dark){
    taper(g, P, w0, w1, lg(g, P[0][0] - 6, 0, P[0][0] + 6, 0, [[0, dark ? '#E4D6B6' : C.claw], [1, dark ? '#CBB894' : '#E2D2AE']]));
  }

  // ── the head, in head space: face centre (0,0), beak toward +x. The frill
  //    fans out behind the face. K = charge amount.
  function drawHead(g, C, t, ph, K, snort){
    // the frill — a broad rounded shield with a lighter inner disc
    const frill = () => { g.beginPath(); g.ellipse(-12, -10, 31, 35, -0.18, 0, TAU); g.closePath(); };
    g.fillStyle = lg(g, 0, -46, 0, 26, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    frill(); g.fill();
    g.save(); frill(); g.clip();
    g.fillStyle = alpha(C.belly, 0.35);
    g.beginPath(); g.ellipse(-12, -8, 21, 25, -0.18, 0, TAU); g.fill();
    spots(g, alpha(C.spot, 0.35), [[-30, -22, 3.2, 2.2, 0.4], [-22, -36, 2.6, 1.8, 0], [-34, -4, 2.4, 1.6, 0.3]]);
    g.restore();
    rim(g, frill, -30, C.rim, 1.8);
    // knobs along the frill's rim — soft accent beads
    for (let i = 0; i < 9; i++){
      const a = -2.75 + i * 0.4;
      const kx = -12 + Math.cos(a) * 31 * Math.cos(-0.18) - Math.sin(a) * 35 * Math.sin(-0.18);
      const ky = -10 + Math.cos(a) * 31 * Math.sin(-0.18) + Math.sin(a) * 35 * Math.cos(-0.18);
      g.fillStyle = lg(g, kx, ky - 4.4, kx, ky + 4.4, [[0, C.accentL], [1, C.accentD]]);
      g.beginPath(); g.arc(kx, ky, 4.4, 0, TAU); g.fill();
    }
    // the far brow horn (behind the face)
    horn(g, C, [[-3, -16], [-4, -27], [-2, -36], [1, -44]], 7, 1.8, true);
    // the face — broad, with a deep rounded snout
    const face = () => blob(g, [[-10, -21], [6, -22.5], [20, -17], [30, -7], [34, 4], [30, 13], [18, 19], [2, 18], [-9, 10], [-13, -4]], 5.5);
    g.fillStyle = lg(g, 0, -22, 0, 20, [[0, C.bodyL], [0.55, C.body], [1, C.bodyD]]);
    face(); g.fill();
    g.save(); face(); g.clip();
    g.fillStyle = rg(g, 6, -10, 0, 18, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.arc(6, -10, 18, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(21, 5, 4.8, 3, 0, 0, TAU); g.fill();
    spots(g, alpha(C.spot, 0.38), [[-4, -15, 2.8, 1.9, 0.3], [10, -18, 2.2, 1.5, 0]]);
    g.restore();
    rim(g, face, -10, C.rim, 1.5);
    // the beak — a warm parrot hook over a cream lower lip
    g.fillStyle = lg(g, 26, 4, 36, 20, [[0, C.beak], [1, C.beakD]]);
    blob(g, [[26, 3], [34, 4], [38, 10], [35, 17], [28, 20], [23, 15], [24, 8]], 5);
    g.fill();
    g.strokeStyle = alpha(C.line, 0.55); g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(16, 15); g.quadraticCurveTo(26, 19, 34, 14); g.stroke();      // mouth line
    // nostril + snort puffs
    g.fillStyle = alpha(C.line, 0.7);
    g.beginPath(); g.ellipse(27.5, -2, 1.8, 1.2, -0.4, 0, TAU); g.fill();
    if (snort > 0){
      g.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - snort)) + ')';
      for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(32 + 10 * snort + i * 4, -3 - 5 * snort - i * 3, 2.5 + 4 * snort, 0, TAU); g.fill(); }
    }
    // nose horn + near brow horn
    horn(g, C, [[27, -9], [29, -14], [31, -18], [33, -22]], 6.5, 1.6, false);
    horn(g, C, [[14, -15], [17, -27], [22, -37], [27, -46]], 8.5, 2, false);
    // the eye — one, in profile — narrowing into the charge under a heavy brow
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.42)) * (1 - 0.3 * K);
    const gaze = Math.sin(t * 0.3 + ph) * 0.6;
    eye(g, 10, -5, 5.4, 5.9, eyeH, gaze, C);
    const knit = 2.4 * K;
    brow(g, C, 2.5, -13, 9.5, -16.5, 17.5, -12.5 + knit, 2.5);
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'sun', L.tint, 'sun');
    const ph = L.ph || 0, wt = (L.wt || 0) * 0.8, moving = !!L.moving;
    const pose = Math.min(1, Math.max(0, L.pose || 0));
    const K = pose ? Math.sin(pose * Math.PI) : 0;                  // charge amount
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.6);
    const A = i => (moving ? 0.18 : 0) * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.2 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;
    const paw = K * Math.sin(t * 8) * 0.28;                          // the pawing front foot

    // ── tail: short and thick, flicking
    const sw = Math.sin(t * 1.4 + ph);
    taper(ctx, [[-54, -68], [-80, -70 + sw], [-94, -58 + sw * 2], [-102, -42 + sw * 4]],
          24, 5, lg(ctx, 0, -74, 0, -40, [[0, C.body], [1, C.bodyD]]), { ease: u => Math.pow(u, 0.9) });

    // ── far legs (darker)
    const fo = { toes: 3, nails: true, claw: C.claw, pad: [14, 5.6] };
    leg(ctx, -38, -60, 26, 24, A(2), 0.05 + B(2), 22, 19, C.bodyD, fo);
    leg(ctx, 32, -62, 26, 24, A(0), -0.05 - B(0) * 0.6, 20, 17, C.bodyD, fo);

    // ── torso — a stocky barrel
    const breathe = 1 + Math.sin(t * 1.15 + ph) * 0.01;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => blob(ctx, [[-56, -60], [-54, -80], [-32, -94], [0, -95], [28, -89], [46, -75], [54, -58], [48, -42], [16, -35], [-22, -37], [-50, -46]], 5.5);
    ctx.fillStyle = lg(ctx, 0, -96, 0, -34, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -66, 0, -36, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, [[50, -60], [50, -44], [24, -35], [-12, -36], [-42, -42], [-52, -52], [-42, -58], [-14, -54], [16, -55], [40, -66]], 5.5);
    ctx.fill();
    stripes(ctx, alpha(C.spot, 0.2), 2.2, [[-34, -44, 30, 3], [-26, -51, 26, 3], [-8, -58, 20, 2]]);
    spots(ctx, alpha(C.spot, 0.42), [[-24, -86, 6, 3.8, 0.15], [4, -88, 5, 3.2, 0.3], [30, -80, 4, 2.6, -0.5], [-44, -74, 4.2, 2.8, 0.5], [-10, -76, 3, 2, 0], [18, -70, 2.6, 1.8, 0]]);
    ctx.fillStyle = rg(ctx, -14, -70, 0, 22, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-14, -70, 22, 0, TAU); ctx.fill();
    ctx.restore();
    rim(ctx, body, -72, C.rim, 2);
    ctx.restore();

    // ── near legs (the front one paws the ground in the charge stance)
    leg(ctx, -26, -58, 26, 24, A(3), 0.05 + B(3), 24, 21, C.body, fo);
    leg(ctx, 22, -60, 26, 24, A(1) - Math.max(0, paw), -0.05 - B(1) * 0.6 + Math.max(0, -paw) * 1.2, 22, 19, C.body, fo);
    dust(ctx, 30, 0, pose > 0.15 && pose < 0.85 ? (pose - 0.15) / 0.7 : 0, '#B08A60', 1);

    // ── the head: swaying; dropped and shaking in the charge
    ctx.save();
    ctx.translate(58, -74);
    ctx.rotate(Math.sin(t * 0.55 + ph) * 0.03 + 0.42 * K + Math.sin(t * 26) * 0.05 * K);
    ctx.scale(1.08, 1.08);
    const snort = K > 0.3 ? (Math.sin(t * 5) > 0 ? (Math.sin(t * 5) * 0.9) : 0) : 0;
    drawHead(ctx, C, t, ph, K, snort);
    ctx.restore();

    ctx.restore();
  }

  window.TrikeRig = { draw, HEIGHT: 126, WIDTH: 98, PALS, DEFAULT: 'sun', ACT_SECONDS: 2.4 };
})();
