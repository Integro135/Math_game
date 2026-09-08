/* ── bronto.js — a cartoon BRONTOSAURUS, drawn from scratch on canvas ────────
   One of the from-scratch dinosaur rigs (workshop: backgrounds/dino_rigs/
   dinos.html). Shared helpers: rig-common.js (window.DinoRig). Sibling of
   trex.js — same house style: soft rounded shapes, no outlines, everything
   in true profile (one eye).

   THE LOOK: a gentle giant — a huge round boulder of a body on four thick
   pillar legs with flat round-nailed feet, a long thick tail sweeping down
   to a curl, and a LONG neck that rises in one soft S-curve to a small,
   sweet head: a big eye under a heavy brow, a cream muzzle, a shy smile, a
   blushing cheek. Cream belly panel with soft stripes, a trail of darker
   soft spots along the back, sunset rim light along the spine.

   ALIVE: breathing, blinking, the neck sways slowly, the tail sways, a slow
   heavy diagonal-gait walk with a stride bob. pose 0..1 = GRAZE: the neck
   swings down in a long arc until the head reaches the ground ahead, a fern
   springs up and the little mouth munches it, then the neck rises back.

   API — window.BrontoRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: feet on y = 0, facing +x, ~196 units tall
     HEIGHT 196, WIDTH 120 (half-width), PALS, DEFAULT 'sky', ACT_SECONDS 3.4
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, alpha, lerp, palette, blob, taper, leg, eye, blink, brow, spots, stripes, rim } = window.DinoRig;
  const PALS = ['sky', 'teal', 'green', 'violet', 'pink'];

  // ── the head, in head space: skull centre (0,0), snout toward +x
  function drawHead(g, C, t, ph, chew){
    const skull = () => blob(g, [[-13, -6], [-8, -12.5], [4, -14], [14, -10], [20, -3], [19, 5], [11, 9.5], [-2, 10.5], [-12, 5]], 5.5);
    g.fillStyle = lg(g, 0, -14, 0, 11, [[0, C.bodyL], [0.6, C.body], [1, C.bodyD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = alpha(C.belly, 0.92);
    g.beginPath(); g.ellipse(11, 5.5, 9.5, 5.2, 0, 0, TAU); g.fill();       // cream muzzle
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(6.5, 3, 3.8, 2.3, 0, 0, TAU); g.fill();
    spots(g, alpha(C.spot, 0.4), [[-5, -9, 2.4, 1.6, 0.3], [5, -11, 1.9, 1.3, 0]]);
    g.restore();
    rim(g, skull, -6, C.rim, 1.4);
    // mouth: a sweet smile, or munching (open oval + tongue) while grazing
    if (chew > 0.15){
      g.fillStyle = C.mouth; g.beginPath(); g.ellipse(12, 8, 5, 1.2 + 2.6 * chew, 0, 0, TAU); g.fill();
      g.fillStyle = C.tongue; g.beginPath(); g.ellipse(12, 9 + 1.2 * chew, 3, 0.8 + 1.2 * chew, 0, 0, TAU); g.fill();
    } else {
      g.strokeStyle = alpha(C.line, 0.7); g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(4, 7); g.quadraticCurveTo(12, 11, 18.5, 6.5); g.stroke();
    }
    g.fillStyle = alpha(C.line, 0.7);
    g.beginPath(); g.ellipse(15.5, -3.5, 1.4, 0.9, -0.4, 0, TAU); g.fill();   // nostril
    // the eye — one, in profile — under a heavy brow
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.5));
    const gaze = Math.sin(t * 0.35 + ph) * 0.6;
    eye(g, 2, -4.5, 4.6, 5.1, eyeH, gaze, C);
    brow(g, C, -4, -11, 2, -13.8, 8.5, -11, 2);
  }

  // a little fern at ground level for the graze (fades in with `a`)
  function fern(g, x, y, a, t){
    if (a <= 0) return;
    g.save(); g.translate(x, y); g.globalAlpha = a;
    g.strokeStyle = '#4E9A4A'; g.lineCap = 'round'; g.lineWidth = 2.4;
    for (let i = -2; i <= 2; i++){
      const ang = -Math.PI / 2 + i * 0.42 + Math.sin(t * 2 + i) * 0.04, len = 18 - Math.abs(i) * 3;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(ang) * len * 0.5 + i * 2, Math.sin(ang) * len * 0.6, Math.cos(ang) * len + i * 4, Math.sin(ang) * len);
      g.stroke();
    }
    g.fillStyle = '#6CBF62';
    for (let i = -2; i <= 2; i++){
      const ang = -Math.PI / 2 + i * 0.42, len = 18 - Math.abs(i) * 3;
      g.beginPath(); g.ellipse(Math.cos(ang) * len + i * 4, Math.sin(ang) * len, 3.2, 2, ang + Math.PI / 2, 0, TAU); g.fill();
    }
    g.restore();
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'sky', L.tint, 'sky');
    const ph = L.ph || 0, wt = (L.wt || 0) * 0.75, moving = !!L.moving;
    const K = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // graze
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.8);          // heavy stride bob
    const A = i => (moving ? 0.16 : 0) * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.18 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;

    // ── tail: long, thick, sweeping down to a soft curl
    const sw = Math.sin(t * 0.9 + ph);
    taper(ctx, [[-56, -80], [-96, -90 + sw * 2], [-126, -64 + sw * 4], [-150, -32 + sw * 6]],
          34, 5, lg(ctx, 0, -96, 0, -30, [[0, C.body], [1, C.bodyD]]), { ease: u => Math.pow(u, 0.9) });

    // ── far legs (darker) — pillars with flat nailed feet
    const fo = { toes: 3, nails: true, claw: C.claw, pad: [15, 5.8] };
    leg(ctx, -44, -62, 28, 24, A(2), 0.04 + B(2), 22, 20, C.bodyD, fo);
    leg(ctx, 34, -64, 29, 25, A(0), -0.04 - B(0) * 0.6, 20, 18, C.bodyD, fo);

    // ── the neck: one long S-curve, blended between UP and GRAZE by K. It
    //    rises from under the shoulder, so it is drawn BEFORE the body.
    const swN = Math.sin(t * 0.7 + ph);
    const up   = [[36, -92], [60, -128], [66, -158], [80 + swN * 3, -180 + swN]];
    const down = [[36, -92], [78, -86], [114, -56], [126, -20]];
    const P = up.map((p, i) => [lerp(p[0], down[i][0], K), lerp(p[1], down[i][1], K)]);
    taper(ctx, P, 34, 18, lg(ctx, 20, -180, 60, -60, [[0, C.bodyL], [0.6, C.body], [1, C.bodyD]]));
    taper(ctx, P.map(p => [p[0] + 6, p[1] + 2]), 13, 7, alpha(C.belly, 0.45));     // the soft throat stripe
    ctx.fillStyle = alpha(C.spot, 0.35);                                            // spots up the back of the neck
    for (let i = 1; i <= 4; i++){
      const u = i / 5, m = 1 - u;
      const px = m*m*m*P[0][0] + 3*m*m*u*P[1][0] + 3*m*u*u*P[2][0] + u*u*u*P[3][0];
      const py = m*m*m*P[0][1] + 3*m*m*u*P[1][1] + 3*m*u*u*P[2][1] + u*u*u*P[3][1];
      const w = (34 + (18 - 34) * u) / 2;
      ctx.beginPath(); ctx.ellipse(px - w * 0.55, py - w * 0.2, 2.4 - u * 0.6, 1.6 - u * 0.4, 0.4, 0, TAU); ctx.fill();
    }

    // ── torso — one big soft boulder
    const breathe = 1 + Math.sin(t * 1.0 + ph) * 0.009;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => blob(ctx, [[-60, -70], [-56, -92], [-30, -106], [8, -108], [40, -98], [56, -82], [56, -62], [38, -48], [0, -44], [-36, -48], [-58, -56]], 5.5);
    ctx.fillStyle = lg(ctx, 0, -110, 0, -42, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -76, 0, -44, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, [[54, -78], [58, -62], [42, -48], [0, -44], [-36, -48], [-56, -58], [-46, -66], [-18, -63], [16, -65], [44, -72]], 5.5);
    ctx.fill();
    stripes(ctx, alpha(C.spot, 0.2), 2.4, [[-40, -52, 44, 3], [-34, -59, 40, 3], [-20, -66, 30, 2.5]]);
    spots(ctx, alpha(C.spot, 0.42), [[-30, -100, 6.5, 4, 0.2], [0, -104, 5.5, 3.4, 0], [28, -98, 4.6, 3, -0.4], [-48, -88, 4, 2.6, 0.5], [-14, -92, 3, 2, 0], [16, -90, 2.6, 1.8, 0], [-38, -78, 2.4, 1.6, 0]]);
    ctx.fillStyle = rg(ctx, -14, -80, 0, 26, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-14, -80, 26, 0, TAU); ctx.fill();    // soft flank highlight
    ctx.restore();
    rim(ctx, body, -84, C.rim, 2.2);
    ctx.restore();

    // ── near legs
    leg(ctx, -30, -60, 28, 24, A(3), 0.04 + B(3), 24, 22, C.body, fo);
    leg(ctx, 22, -62, 29, 25, A(1), -0.04 - B(1) * 0.6, 22, 20, C.body, fo);

    // ── the head at the neck's end; it nods forward, and down to the fern
    const end = P[3];
    const chew = K > 0.55 ? Math.max(0, Math.sin(t * 11)) * Math.min(1, (K - 0.55) / 0.3) : 0;
    ctx.save();
    ctx.translate(end[0] + 4, end[1] - 2);
    ctx.rotate(lerp(-0.08, 0.7, K) + Math.sin(t * 0.8 + ph) * 0.03);
    ctx.scale(1.18, 1.18);
    drawHead(ctx, C, t, ph, chew);
    ctx.restore();
    fern(ctx, 142, 0, Math.min(1, K * 1.6), t);

    ctx.restore();
  }

  window.BrontoRig = { draw, HEIGHT: 196, WIDTH: 120, PALS, DEFAULT: 'sky', ACT_SECONDS: 3.4 };
})();
