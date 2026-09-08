/* ── ptero.js — a cartoon PTERODACTYL, drawn from scratch on canvas ──────────
   One of the from-scratch dinosaur rigs (workshop: backgrounds/dino_rigs/
   dinos.html). Shared helpers: rig-common.js (window.DinoRig). Sibling of
   trex.js — same house style, but this one FLIES: it hovers above the
   ground line, wings beating.

   THE LOOK: a slim streamlined body with a cream underside, two big
   membrane wings (a near wing and a darker far wing) hinged at the
   shoulders, each with a lighter arm bone along the leading edge, faint
   finger rays, a soft sheen and a tiny wrist claw; small tucked-back legs
   with clawed feet, a short tail ending in a rounded accent-coloured vane;
   a long warm-orange beak, a sweeping accent crest, and one big eye under a
   heavy brow (true profile).

   ALIVE: slow wing beats in bursts with glides between (both wings beat
   together, the far one a touch behind; the membrane flattens and sweeps
   back as it comes down), the body lifts gently on each downstroke and
   drifts on a slow swell, blinks, the tail vane wags, the crest trails.
   pose 0..1 = SQUAWK: the head tips up, the beak opens wide, the wings
   surge faster and bigger and sound rings burst from the beak.

   API — window.PteroRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: hovering — body centre ≈ (0, -74), the ground line at
       y = 0 stays clear; facing +x; wing tips reach ~ -160
     HEIGHT 160, WIDTH 64 (half-width), FLYER true, PALS, DEFAULT 'coral'
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, alpha, shade, palette, blob, taper, leg, eye, blink, brow, spots, stripes, rim, rings } = window.DinoRig;
  const PALS = ['coral', 'violet', 'sky', 'sun', 'teal'];

  // ── one wing in wing space (shoulder at the origin, extends UP = -y and
  //    back = -x); the caller squashes it with sy for the side-view flap.
  function wing(g, C, far){
    const edge = () => { g.moveTo(0, 0); g.quadraticCurveTo(15, -30, 9, -56); g.quadraticCurveTo(4, -76, -6, -96); };
    const shape = () => {
      g.beginPath(); edge();
      g.bezierCurveTo(-8, -70, -32, -46, -48, -28);
      g.quadraticCurveTo(-56, -10, -30, 4);
      g.closePath();
    };
    g.fillStyle = far ? lg(g, 0, 0, -14, -96, [[0, C.bodyD], [1, shade(C.bodyD, 0.86)]])
                      : lg(g, 0, 0, -14, -96, [[0, C.body], [0.45, C.bodyD], [1, shade(C.bodyD, 0.92)]]);
    shape(); g.fill();
    g.save(); shape(); g.clip();
    g.strokeStyle = far ? alpha(C.body, 0.55) : alpha(C.bodyL, 0.75); g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); edge(); g.stroke();                               // the arm bone
    g.strokeStyle = alpha(C.line, 0.14); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(9, -56); g.lineTo(-34, -42); g.moveTo(9, -56); g.lineTo(-44, -18); g.stroke();   // finger rays
    g.fillStyle = rg(g, -16, -46, 0, 34, [[0, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.arc(-16, -46, 34, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = C.claw;                                            // the wrist claw
    g.beginPath(); g.moveTo(10.5, -57); g.quadraticCurveTo(17, -56, 15.5, -50); g.quadraticCurveTo(12.5, -53.5, 9, -53.5); g.closePath(); g.fill();
  }

  // ── the head, in head space: skull centre (0,0), beak toward +x. K = squawk.
  function drawHead(g, C, t, ph, K){
    // the crest — a long soft blade sweeping back from the skull
    taper(g, [[-3, -7], [-14, -13], [-26, -16], [-36, -15 + Math.sin(t * 2.4 + ph) * 1.5]], 12, 3,
          lg(g, -36, 0, 0, 0, [[0, C.accentD], [0.5, C.accent], [1, C.accentL]]));
    taper(g, [[-6, -8], [-16, -12], [-26, -14], [-33, -14 + Math.sin(t * 2.4 + ph) * 1.5]], 4, 1.5, alpha(C.accentL, 0.55));
    // the dark open mouth: the wedge between the upper beak's underside and
    // the dropped lower beak (drawn first — the lower beak covers its bottom)
    const open = 0.55 * K;
    if (K > 0.05){
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(6, 2); g.lineTo(34, 1.5);
      g.lineTo(6 + Math.cos(open) * 28, 3 + Math.sin(open) * 28); g.closePath(); g.fill();
    }
    // lower beak — cream, pivoting open at the corner of the mouth
    g.save();
    g.translate(6, 3); g.rotate(open); g.translate(-6, -3);
    if (K > 0.1){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(14, 2.8, 5, 1 + 1.4 * K, 0, 0, TAU); g.fill(); }
    g.fillStyle = lg(g, 0, 3, 0, 10, [[0, C.belly], [1, C.bellyD]]);
    blob(g, [[5, 3], [18, 3.5], [33, 3.5], [22, 8.5], [10, 9.5]], 5);
    g.fill();
    g.restore();
    // upper beak — long, warm, a lighter tip
    g.fillStyle = lg(g, 6, 0, 40, 0, [[0, C.beakD], [0.35, C.beak], [1, shade(C.beak, 1.1)]]);
    blob(g, [[5, -6.5], [18, -5], [30, -2.5], [40, 1.5], [30, 3.5], [18, 3.5], [6, 3]], 5);
    g.fill();
    g.fillStyle = alpha(C.line, 0.6);
    g.beginPath(); g.ellipse(13, -2.5, 1.5, 0.9, -0.3, 0, TAU); g.fill();       // nostril
    // the skull
    const skull = () => blob(g, [[-10, 2], [-9, -6], [-3, -10.5], [5, -9.5], [10, -4], [9, 3], [3, 7], [-6, 6.5]], 5.5);
    g.fillStyle = lg(g, 0, -11, 0, 7, [[0, C.bodyL], [0.6, C.body], [1, C.bodyD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = C.blush; g.beginPath(); g.ellipse(6, 3.5, 3.2, 2, 0, 0, TAU); g.fill();
    g.restore();
    rim(g, skull, -4, C.rim, 1.3);
    // the eye — one, in profile — widening for the squawk under a heavy brow
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.55)) * (1 + 0.1 * K);
    const gaze = Math.sin(t * 0.4 + ph) * 0.6;
    eye(g, 0, -2.5, 4.8, 5.2, eyeH, gaze, C);
    brow(g, C, -5.5, -9 - K, 0, -11.5 - K, 5.5, -8.5 - K, 2.1);
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'coral', L.tint, 'coral');
    const ph = L.ph || 0, moving = !!L.moving;
    const K = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // squawk
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    // FLIGHT: slow wing beats in BURSTS with glides between (env fades the
    // beat in and out on a ~11 s rhythm; a squawk always flaps). In side
    // view the wings stay raised: each beat squashes the membrane (sy) and
    // sweeps it back (shear). Both wings beat TOGETHER, the far one a touch
    // behind, and the body lifts gently on every downstroke.
    const fc = t * (moving ? 3.0 : 2.4) * (1 + 0.5 * K) + ph * 3;
    const env = Math.max(K, 0.5 + 0.5 * Math.tanh(3 * Math.sin(t * 0.55 + ph)));
    const beat = Math.sin(fc) * env, amp = 0.5 + 0.2 * K;
    const syN = Math.sin(0.95 + amp * beat), syF = Math.sin(0.95 + amp * Math.sin(fc + 0.5) * env);
    const glide = Math.sin(t * 0.9 + ph) * 3 - 2.5 * beat;
    ctx.translate(0, -74 + glide);
    ctx.rotate(-0.06 + beat * 0.02);

    // ── far wing, legs, tail (behind the body)
    ctx.save(); ctx.translate(-6, -7); ctx.transform(1, 0, -0.45 * (1 - syF) - 0.25, syF * 0.86, 0, 0); wing(ctx, C, true); ctx.restore();
    const lo = { toes: 3, claw: C.claw, pad: [3.4, 1.5] };
    leg(ctx, -12, 6, 8, 7, 1.15, -0.35, 4.6, 3.8, C.bodyD, lo);
    leg(ctx, -9, 7, 8, 7, 1.05, -0.3, 4.6, 3.8, C.body, lo);
    const vane = Math.sin(t * 2.2 + ph) * 2;
    taper(ctx, [[-20, 4], [-28, 4.5], [-36, 5 + vane * 0.5], [-42, 5.5 + vane]], 7, 3, C.bodyD);
    ctx.fillStyle = lg(ctx, -50, 0, -40, 12, [[0, C.accentL], [1, C.accentD]]);
    blob(ctx, [[-38, 5.5 + vane], [-44, 0.5 + vane], [-52, 5.5 + vane], [-44, 10.5 + vane]], 5);
    ctx.fill();

    // ── body — a streamlined teardrop with a cream underside
    const body = () => blob(ctx, [[-22, 3], [-16, -6], [0, -10], [16, -9], [26, -2], [22, 8], [6, 13], [-12, 12]], 5.5);
    ctx.fillStyle = lg(ctx, 0, -10, 0, 13, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, 0, 0, 13, [[0, C.belly], [1, C.bellyD]]);
    ctx.beginPath(); ctx.ellipse(3, 9, 22, 7.5, 0.05, 0, TAU); ctx.fill();
    stripes(ctx, alpha(C.spot, 0.2), 1.6, [[-10, 6, 16, 1.5], [-6, 9.5, 14, 1.2]]);
    spots(ctx, alpha(C.spot, 0.4), [[-8, -5, 3, 2, 0.2], [6, -6.5, 2.4, 1.6, 0]]);
    ctx.restore();
    rim(ctx, body, -2, C.rim, 1.5);

    // ── near wing (over the body)
    ctx.save(); ctx.translate(2, -5); ctx.transform(1, 0, -0.45 * (1 - syN) - 0.05, syN, 0, 0); wing(ctx, C, false); ctx.restore();

    // ── neck + head (tips up for the squawk)
    taper(ctx, [[18, -6], [26, -12], [30, -18], [34, -22]], 13, 11, lg(ctx, 16, -24, 36, -4, [[0, C.body], [1, C.bodyD]]));
    ctx.save();
    ctx.translate(37, -25);
    ctx.rotate(Math.sin(t * 0.7 + ph) * 0.04 - 0.45 * K);
    ctx.scale(1.15, 1.15);
    drawHead(ctx, C, t, ph, K);
    ctx.restore();
    rings(ctx, 84, -24, K > 0.3 ? (K - 0.3) / 0.7 : 0, C.line, 0.5);

    ctx.restore();
  }

  window.PteroRig = { draw, HEIGHT: 160, WIDTH: 64, FLYER: true, PALS, DEFAULT: 'coral', ACT_SECONDS: 1.7 };
})();
