/* ── trex.js — a NEW cartoon T-REX, drawn from scratch on canvas ─────────────
   The reference rig of the from-scratch dinosaurs (workshop:
   backgrounds/dino_rigs/dinos.html, all of them in parade.html). The game's
   dinosaur scene, backgrounds/dinosaurs3.bg.js, loads these rigs on demand —
   iterate here, the scene picks the change up. Shared helpers: rig-common.js
   (window.DinoRig).

   THE LOOK: a chunky, friendly tyrant — big drumstick thighs on strong
   two-segment legs with three-toed clawed feet, an upright barrel chest, a
   long tapering tail held out behind for balance, and a BIG head on a short
   thick neck, seen in true profile: one huge amber eye under a heavy brow.
   A cream chin and chest panel with soft belly
   stripes, a row of little pearly teeth peeking under the lip, a blushing
   cheek, tiny two-clawed arms tucked in front of the chest. Soft gradients,
   no outlines.

   ALIVE: breathing, blinking, a slow head sway, the tail sways, the little
   arms fidget, a two-legged walk cycle with a stride bob. pose 0..1 = ROAR:
   the body squats, the head throws back, the jaw drops wide — a real gap
   between the jaws with only the throat dark, tongue on the lower jaw, fangs
   top and bottom — the brow knits, the arms fly up and sound rings burst
   from the mouth — then it all settles back.

   API — window.TrexRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: feet on y = 0, facing +x, ~152 units tall
     HEIGHT 152, WIDTH 76 (half-width), PALS, DEFAULT 'green'
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, alpha, shade, palette, blob, taper, leg, eye, blink, brow, spots, stripes, rim, rings } = window.DinoRig;
  const PALS = ['green', 'teal', 'pink', 'sun', 'violet'];

  // ── the head, in head space: skull centre (0,0), snout toward +x, seen in
  //    profile. K = roar amount.
  function drawHead(g, C, t, ph, K){
    const jaw = 0.66 * K;                               // lower-jaw drop (radians)
    const HX = -9, HY = 7;                              // the jaw hinge
    // the open mouth is a real GAP: only the throat at the back is dark; in
    // front of it the background shows between the upper teeth and the jaw
    if (K > 0.02){
      const c = Math.cos(jaw), s = Math.sin(jaw);
      const rot = (x, y) => [HX + (x - HX) * c - (y - HY) * s, HY + (x - HX) * s + (y - HY) * c];
      const fx = 9;                                     // how far forward the throat reaches
      const lo = rot(fx, 7.5), back = rot(HX - 3, HY + 1);
      g.fillStyle = lg(g, HX, 0, fx, 0, [[0, shade(C.mouth, 0.7)], [1, C.mouth]]);
      g.beginPath();
      g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 6.5);
      g.quadraticCurveTo((fx + lo[0]) / 2 - 7 * K, (6.5 + lo[1]) / 2, lo[0], lo[1]);
      g.lineTo(back[0], back[1]); g.closePath(); g.fill();
    }
    // lower jaw — cream chin, pivoting at the hinge; tongue + lower fangs ride on it
    g.save();
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    g.fillStyle = lg(g, 0, 6, 0, 20, [[0, C.belly], [1, C.bellyD]]);
    blob(g, [[-13, 6], [0, 7.5], [16, 7.5], [28, 8], [30, 13], [21, 19], [4, 20], [-10, 16]], 5);
    g.fill();
    if (K > 0.1){
      g.fillStyle = C.tongue;
      g.beginPath(); g.ellipse(11, 8.5, 9, 2.4 + 2.2 * K, 0, 0, TAU); g.fill();
      g.fillStyle = C.tooth;
      for (const tx of [3, 24]){
        g.beginPath(); g.moveTo(tx - 1.8, 8.4); g.lineTo(tx, 4.2 - 1.5 * K); g.lineTo(tx + 1.8, 8.4); g.closePath(); g.fill();
      }
    }
    g.restore();
    // upper skull — a broad rounded muzzle, boxy back, high forehead
    const skull = () => blob(g, [[-20, 4], [-20, -8], [-14, -18], [-2, -22.5], [12, -20.5], [23, -14], [30, -4.5], [30.5, 5], [23, 8], [2, 8.5], [-12, 8]], 5.5);
    g.fillStyle = lg(g, 0, -23, 0, 9, [[0, C.bodyL], [0.55, C.body], [1, C.bodyD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = rg(g, 4, -12, 0, 20, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.arc(4, -12, 20, 0, TAU); g.fill();               // forehead sheen
    spots(g, alpha(C.spot, 0.42), [[-9, -16, 3.2, 2.1, 0.3], [3, -19, 2.4, 1.6, 0.1], [17, -14, 2.6, 1.7, -0.5]]);
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(19, 1, 4.8, 2.9, 0, 0, TAU); g.fill();    // cheek blush
    g.strokeStyle = alpha(C.line, 0.45); g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-10, 7.5); g.quadraticCurveTo(10, 9, 29, 7); g.stroke();   // lip line
    g.restore();
    rim(g, skull, -8, C.rim, 1.8);
    // nostril — a soft dark comma with a highlight above
    g.fillStyle = alpha(C.line, 0.75);
    g.beginPath(); g.ellipse(24.5, -6.5, 1.9, 1.2, -0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.beginPath(); g.ellipse(23.5, -8.3, 1.6, 0.7, -0.5, 0, TAU); g.fill();
    // upper teeth — little pearly triangles hanging under the lip
    g.fillStyle = C.tooth;
    for (const tx of [4, 9.5, 15, 20.5, 26]){
      const h = 4.2 + 1.6 * K;
      g.beginPath(); g.moveTo(tx - 2, 7.6); g.lineTo(tx, 7.6 + h); g.lineTo(tx + 2, 7.6); g.closePath(); g.fill();
    }
    // the eye — a true profile shows ONE big eye; it narrows mid-roar
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.35 * K);
    const gaze = Math.sin(t * 0.3 + ph) * 0.6;
    eye(g, 5, -9, 5.8, 6.5, eyeH, gaze, C);
    // a heavy brow — lifts, and its front end drops into a fierce glare for the roar
    const up = 2 * K, knit = 2.8 * K;
    brow(g, C, -3, -17.5 - up, 5, -21.5 - up, 13.5, -16.5 - up + knit, 2.7);
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'green', L.tint, 'green');
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const pose = L.pose != null ? L.pose : L.roar;
    const K = pose ? Math.sin(Math.min(1, Math.max(0, pose)) * Math.PI) : 0;   // roar amount
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.6);          // stride bob
    const A = i => (moving ? 0.42 : 0) * Math.sin(wt + i * Math.PI);
    const B = i => moving ? 0.45 * Math.max(0, -Math.cos(wt + i * Math.PI)) : 0;
    const squat = 3.5 * K;                                         // the roar crouch

    // ── tail: a long tapering balance, swaying; wags harder on the move
    const sw = Math.sin(t * 1.3 + ph) + (moving ? 0.6 * Math.sin(wt * 2 + 1) : 0);
    taper(ctx, [[-38, -72 + squat], [-72, -82 + sw * 2 + squat], [-98, -66 + sw * 4], [-122, -44 + sw * 7]],
          30, 5, lg(ctx, 0, -88, 0, -44, [[0, C.body], [1, C.bodyD]]), { ease: u => Math.pow(u, 0.85) });

    // ── far leg (darker) behind the body
    const legOpts = { toes: 3, claw: C.claw, pad: [13, 5.4] };
    leg(ctx, -16, -60 + squat, 28, 26, -0.45 + A(1) - 0.12 * K, 0.8 + B(1) + 0.3 * K, 19, 14, C.bodyD, legOpts);

    // ── torso — an upright barrel: tall chest, round rump
    const breathe = 1 + Math.sin(t * 1.2 + ph) * 0.012;
    ctx.save();
    ctx.translate(0, squat);
    ctx.scale(1, breathe);
    const body = () => blob(ctx, [[28, -54], [40, -72], [40, -92], [28, -108], [4, -112], [-22, -104], [-42, -86], [-46, -66], [-34, -50], [-8, -42], [14, -43]], 5.5);
    ctx.fillStyle = lg(ctx, 0, -112, 0, -40, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // cream chest + belly panel with soft stripes
    ctx.fillStyle = lg(ctx, 0, -100, 0, -44, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, [[36, -100], [42, -80], [40, -60], [26, -46], [0, -40], [-22, -44], [-34, -52], [-26, -60], [-4, -58], [16, -66], [24, -82]], 5.5);
    ctx.fill();
    stripes(ctx, alpha(C.spot, 0.22), 2.2, [[10, -52, 34, 2.5], [14, -60, 36, 2.5], [18, -68, 36, 2], [20, -76, 35, 2]]);
    spots(ctx, alpha(C.spot, 0.45), [[-8, -104, 6, 3.6, 0.15], [14, -105, 4.4, 2.8, 0.45], [-28, -96, 4.6, 2.9, -0.35], [2, -94, 3, 2, 0], [-24, -84, 2.8, 1.8, 0], [-38, -76, 2.4, 1.6, 0]]);
    ctx.fillStyle = rg(ctx, -22, -78, 0, 20, [[0, 'rgba(255,255,255,.10)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-22, -78, 20, 0, TAU); ctx.fill();    // soft flank highlight
    ctx.restore();
    rim(ctx, body, -86, C.rim, 2);
    ctx.restore();

    // ── near leg: a big drumstick thigh the leg grows out of
    ctx.fillStyle = lg(ctx, 0, -72, 0, -40, [[0, C.body], [1, C.bodyD]]);
    ctx.beginPath(); ctx.ellipse(-10, -56 + squat, 18, 15, -0.2, 0, TAU); ctx.fill();
    leg(ctx, -6, -60 + squat, 28, 26, -0.45 + A(0) - 0.12 * K, 0.8 + B(0) + 0.3 * K, 20, 15, C.body, legOpts);

    // ── neck (short, thick), then the head (swaying; thrown back mid-roar)
    taper(ctx, [[28, -100 + squat], [34, -106 + squat], [38, -112 + squat * 0.6], [42, -116 + squat * 0.4]], 30, 26,
          lg(ctx, 20, -120, 46, -90, [[0, C.body], [1, C.bodyD]]));
    ctx.save();
    ctx.translate(50, -124 + squat * 0.4);
    ctx.rotate(Math.sin(t * 0.6 + ph) * 0.035 - 0.42 * K);
    ctx.scale(1.3, 1.3);
    drawHead(ctx, C, t, ph, K);
    ctx.restore();
    rings(ctx, 92, -118 + squat, K > 0.35 ? (K - 0.35) / 0.65 : 0, C.line, 0.6);

    // ── the near arm: tiny, bent at the elbow (upper arm down and back, the
    //    forearm forward), a little two-fingered HAND hanging from the wrist —
    //    a round palm and two curled fingers tipped with cream claws. It
    //    fidgets, and flies up with the fingers splayed for the roar.
    ctx.save();
    ctx.translate(34, -80 + squat);
    const a1 = 0.35 + Math.sin(t * 2.1 + ph) * 0.08 - 1.5 * K, a2 = -1.75 + 0.25 * K;
    ctx.rotate(a1);
    ctx.strokeStyle = C.body; ctx.lineCap = 'round'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();      // upper arm
    ctx.translate(0, 12); ctx.rotate(a2);
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 11); ctx.stroke();   // forearm
    ctx.translate(0, 11); ctx.rotate(-(a1 + a2) * (0.75 - 0.6 * K));      // the hand hangs (follows the arm mid-roar)
    ctx.fillStyle = C.body;
    ctx.beginPath(); ctx.arc(0, 1, 4.3, 0, TAU); ctx.fill();               // the palm
    for (const [dx, ang, len] of [[-1.8, 0.22, 5.4], [1.9, -0.18, 5.8]]){
      ctx.save(); ctx.translate(dx, 2); ctx.rotate(ang);
      ctx.strokeStyle = C.body; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.4, len * 0.6, 1.5, len); ctx.stroke();   // a finger, curling forward
      ctx.translate(1.5, len);
      ctx.fillStyle = C.claw;
      ctx.beginPath(); ctx.moveTo(-1.6, -0.3); ctx.quadraticCurveTo(0.4, 3.2, 1.6, 4.2); ctx.quadraticCurveTo(2.1, 1.4, 1.5, -0.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.restore();
  }

  window.TrexRig = { draw, HEIGHT: 152, WIDTH: 76, PALS, DEFAULT: 'green' };
})();
