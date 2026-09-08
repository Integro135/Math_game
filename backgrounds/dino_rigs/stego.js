/* ── stego.js — a cartoon STEGOSAURUS, drawn from scratch on canvas ──────────
   One of the from-scratch dinosaur rigs (workshop: backgrounds/dino_rigs/
   dinos.html). Shared helpers: rig-common.js (window.DinoRig). Sibling of
   trex.js — same house style: soft rounded shapes, no outlines, everything
   in true profile (one eye).

   THE LOOK: a low, arched body — tall hind legs, short front legs, the back
   peaking over the hips — crowned by TWO staggered rows of soft leaf-shaped
   plates in the accent colour (a bright near row, a deeper far row, each
   with a darker inner vein), biggest over the hips and shrinking toward the
   neck and down the tail. A thick tail sweeping back to four rounded cream
   tail-spikes. A small sweet head held low, cream muzzle, a big eye under a
   heavy brow, a blush. Cream belly panel with soft stripes, spots on the flank,
   sunset rim light along the plates' side of the back.

   ALIVE: breathing, blinking, a slow head nod, the tail sways, the plates
   breathe with the body, a diagonal-gait walk with a stride bob.
   pose 0..1 = a happy WAG: the tail whips up and down, every plate shimmies
   and glows in turn, the head wiggles, the body bounces on its toes.

   API — window.StegoRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: feet on y = 0, facing +x, ~134 units tall
     HEIGHT 134, WIDTH 100 (half-width), PALS, DEFAULT 'teal'
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, alpha, palette, blob, bez, bezT, taper, leg, eye, blink, brow, spots, stripes, rim } = window.DinoRig;
  const PALS = ['teal', 'green', 'pink', 'sun', 'violet'];

  // y of the top edge of the body at x (seats the plates); slope for their tilt
  const backY = x => x > -14 ? -100 + 0.0094 * (x + 14) * (x + 14) : -100 + 0.012 * (x + 14) * (x + 14);
  const backSlope = x => x > -14 ? 0.0188 * (x + 14) : 0.024 * (x + 14);

  // one soft leaf-shaped plate standing on (x, y): width w, height h
  function plate(g, C, x, y, w, h, rot, glow, far){
    g.save(); g.translate(x, y); g.rotate(rot);
    const shape = k => {
      g.beginPath(); g.moveTo(-w * 0.5 * k, 2.5);
      g.quadraticCurveTo(-w * 0.64 * k, -h * 0.5 * k, -w * 0.16 * k, -h * k);
      g.quadraticCurveTo(0, -h * 1.08 * k, w * 0.16 * k, -h * k);
      g.quadraticCurveTo(w * 0.64 * k, -h * 0.5 * k, w * 0.5 * k, 2.5);
      g.closePath();
    };
    g.fillStyle = far ? lg(g, 0, -h, 0, 2, [[0, C.accent], [1, C.accentD]])
                      : lg(g, 0, -h, 0, 2, [[0, C.accentL], [0.55, C.accent], [1, C.accentD]]);
    shape(1); g.fill();
    g.fillStyle = alpha(C.accentD, far ? 0.38 : 0.30);               // the inner vein
    g.save(); g.translate(0, -h * 0.1); shape(0.52); g.fill(); g.restore();
    if (!far){
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.beginPath(); g.ellipse(-w * 0.16, -h * 0.62, w * 0.12, h * 0.2, 0.15, 0, TAU); g.fill();   // sheen
    }
    if (glow > 0){ g.fillStyle = alpha('#FFFFFF', 0.38 * glow); shape(1); g.fill(); }
    g.restore();
  }
  // a rounded cream tail spike standing on (x, y), pointing along `rot`
  function spike(g, C, x, y, len, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    taper(g, [[0, 2], [0, -len * 0.35], [0, -len * 0.7], [0, -len]], 7, 2, lg(g, -3, 0, 3, 0, [[0, C.claw], [1, '#DCCDAA']]));
    g.restore();
  }

  function drawHead(g, C, t, ph, K){
    const skull = () => blob(g, [[-13, -6], [-9, -12], [3, -14], [13, -10.5], [19, -3], [18.5, 5], [11, 9.5], [-2, 10.5], [-12, 5]], 5.5);
    g.fillStyle = lg(g, 0, -14, 0, 11, [[0, C.bodyL], [0.6, C.body], [1, C.bodyD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = alpha(C.belly, 0.92);
    g.beginPath(); g.ellipse(11, 5.5, 9.5, 5.2, 0, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(6.5, 3, 3.8, 2.3, 0, 0, TAU); g.fill();
    spots(g, alpha(C.spot, 0.4), [[-5, -9, 2.4, 1.6, 0.3], [5, -11.5, 1.9, 1.3, 0]]);
    g.restore();
    rim(g, skull, -6, C.rim, 1.4);
    g.strokeStyle = alpha(C.line, 0.7); g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(4, 7); g.quadraticCurveTo(12, 11 + 1.5 * K, 18.5, 6.5); g.stroke();   // the smile widens
    g.fillStyle = alpha(C.line, 0.7);
    g.beginPath(); g.ellipse(15, -3.5, 1.4, 0.9, -0.4, 0, TAU); g.fill();
    // the eye — one, in profile — under a heavy brow that lifts in the wag
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.5));
    const gaze = Math.sin(t * 0.35 + ph) * 0.6;
    eye(g, 2, -4.5, 4.6, 5.1, eyeH, gaze, C);
    brow(g, C, -4, -11 - K, 2, -13.8 - K, 8.5, -11 - K, 2);
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'teal', L.tint, 'teal');
    const ph = L.ph || 0, wt = (L.wt || 0) * 0.9, moving = !!L.moving;
    const K = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // wag
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.5);
    ctx.translate(0, -2.5 * Math.abs(Math.sin(t * 9)) * K);          // the happy bounce
    const A = i => (moving ? 0.2 : 0) * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.2 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;
    const shimmy = i => Math.sin(t * 12 + i * 0.9) * 0.11 * K;
    const glow = i => K * Math.pow(Math.max(0, Math.sin(t * 6 - i * 0.8)), 6);

    // ── tail: thick, sweeping back and up, whipping during the wag
    const wag = Math.sin(t * 1.1 + ph) * 2 + Math.sin(t * 9) * 12 * K;
    const T = [[-58, -66], [-88, -72 + wag * 0.3], [-110, -58 + wag * 0.7], [-126, -40 + wag]];
    const tailAt = u => { const p = bez(T, u), d = bezT(T, u); return { p, ang: Math.atan2(d[1], d[0]) }; };
    // far-row tail plate + far spikes sit behind the tail (rot = tangent + π
    // stands a plate on the tail's upper side)
    { const q = tailAt(0.34); plate(ctx, C, q.p[0], q.p[1] - 5, 11, 15, q.ang + Math.PI + shimmy(6), glow(6), true); }
    for (const [u, len] of [[0.74, 13], [0.88, 11]]){ const q = tailAt(u); spike(ctx, C, q.p[0] + 4, q.p[1] - 2, len, q.ang + Math.PI - 0.15); }
    taper(ctx, T, 28, 8, lg(ctx, 0, -76, 0, -36, [[0, C.body], [1, C.bodyD]]), { ease: u => Math.pow(u, 0.9) });
    { const q = tailAt(0.2); plate(ctx, C, q.p[0], q.p[1] - 8, 13, 17, q.ang + Math.PI + shimmy(5), glow(5), false); }
    { const q = tailAt(0.48); plate(ctx, C, q.p[0], q.p[1] - 5, 10, 12, q.ang + Math.PI + shimmy(7), glow(7), false); }
    for (const [u, len] of [[0.74, 15], [0.88, 12]]){ const q = tailAt(u); spike(ctx, C, q.p[0] - 1, q.p[1] + 1, len, q.ang + Math.PI - 0.35); }

    // ── far row of plates (behind the body), then far legs
    const FAR = [[42, 10, 8], [20, 22, 14], [-4, 30, 19], [-28, 30, 19], [-52, 20, 14]];
    FAR.forEach(([px, h, w], i) => plate(ctx, C, px + 4, backY(px) - 1, w * 0.88, h * 0.88, Math.atan(backSlope(px)) * 0.75 + shimmy(i), glow(i), true));
    const fo = { toes: 3, nails: true, claw: C.claw, pad: [13, 5.2] };
    leg(ctx, -32, -66, 30, 26, A(2), 0.05 + B(2), 21, 17, C.bodyD, fo);
    leg(ctx, 46, -44, 18, 16, A(0), -0.04 - B(0) * 0.5, 16, 13, C.bodyD, fo);
    // the neck emerges from under the shoulder, so it is drawn BEFORE the body
    taper(ctx, [[50, -54], [58, -48], [64, -42], [68, -38]], 24, 18, lg(ctx, 44, -60, 72, -34, [[0, C.body], [1, C.bodyD]]));

    // ── torso — arched: low neck, peak over the hips
    const breathe = 1 + Math.sin(t * 1.1 + ph) * 0.01;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => blob(ctx, [[-60, -62], [-52, -84], [-30, -99], [-4, -100], [24, -86], [46, -66], [58, -48], [56, -34], [32, -27], [-8, -34], [-40, -42], [-58, -50]], 5.5);
    ctx.fillStyle = lg(ctx, 0, -100, 0, -26, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -60, 0, -28, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, [[56, -50], [58, -36], [40, -27], [4, -32], [-30, -40], [-52, -50], [-44, -58], [-18, -52], [16, -50], [42, -56]], 5.5);
    ctx.fill();
    stripes(ctx, alpha(C.spot, 0.2), 2.2, [[-36, -37, 36, 3], [-28, -44, 30, 3], [-10, -50, 22, 2]]);
    spots(ctx, alpha(C.spot, 0.42), [[-26, -84, 6, 3.8, 0.2], [4, -84, 5, 3.2, 0.3], [30, -70, 4, 2.6, -0.5], [-46, -70, 4.2, 2.8, 0.5], [-12, -72, 3, 2, 0], [18, -60, 2.6, 1.8, 0]]);
    ctx.fillStyle = rg(ctx, -16, -72, 0, 22, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-16, -72, 22, 0, TAU); ctx.fill();
    ctx.restore();
    rim(ctx, body, -78, C.rim, 2);
    ctx.restore();

    // ── near row of plates standing on the back line
    const NEAR = [[30, 15, 11], [8, 26, 17], [-16, 32, 21], [-40, 26, 18]];
    NEAR.forEach(([px, h, w], i) => plate(ctx, C, px, backY(px) + 3, w, h, Math.atan(backSlope(px)) * 0.75 + shimmy(i + 1), glow(i + 1), false));

    // ── near legs
    leg(ctx, -20, -64, 30, 26, A(3), 0.05 + B(3), 23, 19, C.body, fo);
    leg(ctx, 36, -42, 18, 16, A(1), -0.04 - B(1) * 0.5, 17, 14, C.body, fo);

    // ── the small head held low; it nods, and wiggles in the wag
    ctx.save();
    ctx.translate(76, -36);
    ctx.rotate(Math.sin(t * 0.7 + ph) * 0.04 + Math.sin(t * 10) * 0.09 * K + 0.08);
    ctx.scale(1.12, 1.12);
    drawHead(ctx, C, t, ph, K);
    ctx.restore();

    ctx.restore();
  }

  window.StegoRig = { draw, HEIGHT: 134, WIDTH: 100, PALS, DEFAULT: 'teal', ACT_SECONDS: 2.2 };
})();
