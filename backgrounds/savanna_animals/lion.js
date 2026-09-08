/* ── lion.js — a NEW cartoon LION, drawn from scratch on canvas ─────────────
   The reference rig of the from-scratch savanna animals (workshop:
   backgrounds/savanna_animals/animals.html, or lion.html for the lion alone).
   The game's savanna scene (savanna.bg.js) draws these rigs; iterate here
   and the scene picks the changes up. Shared helpers: rig-common.js (window.SavRig).

   THE LOOK: body in profile, head turned three-quarters toward the viewer
   (both eyes visible), framed by a big soft "halo" mane of round overlapping
   lobes in four tones (dark rim → warm roots around the face). Broad cream
   muzzle, big amber eyes with heavy brows, round ears, a soft hairline, a
   long tail ending in a pom-pom tuft. Everything is soft and rounded — no
   spikes.

   ALIVE: breathing torso, both eyes blink, slow head sway, ear flick, tail
   swish, mane lobes ripple, a diagonal-gait walk cycle (2-segment legs with
   round joints), and a ROAR (head thrown back, jaw open with tongue + fangs,
   brows up, mane flares).

   API — window.LionRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint }
       unit space: paws on y = 0, facing +x, ~116 units tall incl. the mane
       x, y   paw-line anchor in canvas px       s    px per unit
       dir    1 faces right, -1 faces left       ph   per-instance phase
       wt     walk-cycle clock (advance it while moving)
       moving true → legs step + stride bob      pose 0..1 roar progress
       (L.roar is accepted as an alias of pose)  tint coat brightness factor
     HEIGHT  units from paws to the top of the mane
     WIDTH   half-width in units (hit boxes / shadows)
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, shade, fluff, leg, eye, blink } = window.SavRig;
  const BASE = {
    coat: '#D9A85A', coatD: '#B5813D', coatL: '#EEC782', belly: '#F6E3B4',
    mane0: '#4A2210', mane1: '#6E351A', mane2: '#92492A', mane3: '#B86B33',
    line: '#3B1D0C', nose: '#4B2617', mouth: '#5A1F17', tongue: '#D96A66',
    fang: '#FFF6E6', eyeW: '#FFF4DC', iris: '#E99B2C', pupil: '#1B0E06',
    earIn: '#E9B79C',
  };
  const tinted = f => {
    if (!f || f === 1) return BASE;
    const c = Object.assign({}, BASE);
    for (const k of ['coat', 'coatD', 'coatL', 'belly']) c[k] = shade(BASE[k], f);
    return c;
  };

  function ear(g, C, x, y, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.coat;
    g.beginPath(); g.arc(0, 0, 6.6, 0, TAU); g.fill();
    g.fillStyle = C.earIn;
    g.beginPath(); g.ellipse(0, 0.7, 3.9, 4.3, 0, 0, TAU); g.fill();
    g.restore();
  }

  // ── the head, in head space: face centre (0,0), muzzle toward +x, the
  // face turned three-quarters toward the viewer. Face radius ≈ 20.
  function drawHead(g, C, t, ph, roarK){
    // mane halo behind everything — four rings, dark rim in to warm roots
    g.save();
    const flare = 1 + 0.06 * roarK;
    g.scale(flare, flare);
    fluff(g, 0, 3,   36.5, 37.5, 13, C.mane0, t, ph + 1,  1.0,  0.22);
    fluff(g, 0, 2.5, 32,   32.5, 12, C.mane1, t, ph + 5,  0.7,  0.14);
    fluff(g, 0, 2,   27.5, 28,   12, C.mane2, t, ph + 9,  0.45, 0.07);
    fluff(g, 0, 1.5, 22.5, 22.8, 13, C.mane3, t, ph + 13, 0.25, 0);
    g.restore();
    // ears (the face overlaps their bases); the far ear flicks now and then
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.7 + ph * 2)), 40) * 0.35;
    ear(g, C, -16, -17.5, -0.15 + flick);
    ear(g, C, 15.5, -18.5, 0.15);
    // the face — broad cheeks, a slightly flat forehead
    g.fillStyle = lg(g, 0, -20, 0, 19, [[0, C.coatL], [1, C.coat]]);
    g.beginPath();
    g.moveTo(-19, -7);
    g.bezierCurveTo(-19, -18, -10, -21, 0, -20.5);
    g.bezierCurveTo(10, -21, 19.5, -17, 20.5, -6);
    g.bezierCurveTo(21, 5, 17, 14.5, 7, 18);
    g.bezierCurveTo(-2, 20, -14.5, 14.5, -18.5, 5);
    g.bezierCurveTo(-20.5, 0, -19, -4, -19, -7);
    g.closePath(); g.fill();
    // muzzle: two cream cheek puffs + chin (drops open during the roar)
    const jaw = 6 * roarK;
    g.fillStyle = C.belly;
    g.beginPath(); g.arc(0.5, 8, 8.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(10.5, 7.2, 8.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(6, 14 + jaw, 6, 5.2, 0, 0, TAU); g.fill();
    if (roarK > 0.12){                               // the open roaring mouth
      g.fillStyle = C.mouth;
      g.beginPath(); g.ellipse(6, 10.3 + jaw * 0.5, 6.7, 2.6 + 4.3 * roarK, 0, 0, TAU); g.fill();
      g.fillStyle = C.tongue;
      g.beginPath(); g.ellipse(6, 12.2 + jaw * 0.6, 3.8, 1.4 + 2.4 * roarK, 0, 0, TAU); g.fill();
      g.fillStyle = C.fang;
      g.beginPath();
      g.moveTo(1, 8.6);  g.lineTo(2.2, 12 + 2.4 * roarK);  g.lineTo(3.4, 8.8);
      g.moveTo(8.9, 8.8); g.lineTo(10.1, 12 + 2.4 * roarK); g.lineTo(11.3, 8.6);
      g.closePath(); g.fill();
    } else {
      // closed mouth: philtrum + a gentle smile
      g.strokeStyle = C.line; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(5.8, 6.2); g.lineTo(5.8, 9.8);
      g.moveTo(5.8, 9.8); g.quadraticCurveTo(2.6, 12.8, -1.5, 10);
      g.moveTo(5.8, 9.8); g.quadraticCurveTo(9.2, 12.8, 13.4, 9.8);
      g.stroke();
    }
    // nose — a soft rounded triangle with a highlight
    g.fillStyle = C.nose;
    g.beginPath();
    g.moveTo(0.8, 0);
    g.quadraticCurveTo(5.8, -2.6, 10.8, 0);
    g.quadraticCurveTo(9.6, 5.2, 5.8, 6.4);
    g.quadraticCurveTo(2, 5.2, 0.8, 0);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.beginPath(); g.ellipse(4.4, 0.8, 1.9, 0.9, -0.3, 0, TAU); g.fill();
    // whisker dots + whiskers
    g.fillStyle = 'rgba(59,29,12,.5)';
    for (const [dx, dy] of [[-4, 5.5], [-1.7, 7.9], [-4.3, 9.1], [13.7, 5.5], [15.8, 7.9], [13.9, 9.4]]){
      g.beginPath(); g.arc(dx, dy, 0.65, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(255,250,235,.55)'; g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 3; i++){
      g.moveTo(-5, 6 + i * 1.8);  g.quadraticCurveTo(-14, 4.8 + i * 3, -23, 6.6 + i * 4);
      g.moveTo(16.5, 6 + i * 1.8); g.quadraticCurveTo(25, 4.8 + i * 3, 33, 6.6 + i * 4);
    }
    g.stroke();
    // eyes — both visible (three-quarter view); blink on their own rhythm
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.18 * roarK);
    const gaze = Math.sin(t * 0.3 + ph) * 0.4;
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    eye(g, -6.5, -6, 4, 4.5, eyeH, gaze, ec);
    eye(g, 9, -6.6, 4.6, 5.1, eyeH, gaze, ec);
    // heavy brows; they lift during the roar
    const up = 1.8 * roarK;
    g.strokeStyle = C.line; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-11.5, -11.6 - up); g.quadraticCurveTo(-7, -14 - up * 1.4, -2, -12.3 - up);
    g.moveTo(4, -13 - up);       g.quadraticCurveTo(9, -15.4 - up * 1.4, 14.5, -12.8 - up);
    g.stroke();
    // a soft hairline: three mane lobes resting on the top edge of the face
    g.fillStyle = C.mane1;
    for (const [x, y, r] of [[-4, -21.5, 4.6], [2, -22.2, 5.2], [7.6, -20.8, 4.4]]){
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.fillStyle = C.mane2;
    g.beginPath(); g.arc(4.8, -20.6, 2.6, 0, TAU); g.fill();
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = tinted(L.tint);
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const pose = L.pose != null ? L.pose : L.roar;
    const roarK = pose ? Math.sin(Math.min(1, Math.max(0, pose)) * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.3);          // stride bob
    const wamp = moving ? 0.28 : 0;
    const A = i => wamp * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.38 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;

    // ── tail: a tapering swish ending in a pom-pom tuft
    const sw = Math.sin(t * 1.05 + ph);
    const tc = [[-44, -54], [-60, -56], [-74, -40 + sw * 3], [-70 + sw * 6, -18 + sw * 5]];
    const bz = u => { const m = 1 - u; return [
      m*m*m*tc[0][0] + 3*m*m*u*tc[1][0] + 3*m*u*u*tc[2][0] + u*u*u*tc[3][0],
      m*m*m*tc[0][1] + 3*m*m*u*tc[1][1] + 3*m*u*u*tc[2][1] + u*u*u*tc[3][1]]; };
    ctx.strokeStyle = C.coatD; ctx.lineCap = 'round';
    let pp = bz(0);
    for (let i = 1; i <= 10; i++){
      const p = bz(i / 10);
      ctx.lineWidth = 6 - 2.6 * (i / 10);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    {
      const q = bz(0.92), e = tc[3];
      const dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
      const ux = (e[0] - q[0]) / dl, uy = (e[1] - q[1]) / dl;
      ctx.fillStyle = C.mane0;
      for (const [f, r] of [[0, 5.8], [4.6, 4.8], [8.8, 3.2]]){
        ctx.beginPath(); ctx.arc(e[0] + ux * f, e[1] + uy * f, r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C.mane2;
      ctx.beginPath(); ctx.arc(e[0] + ux * 1.5 - uy * 1.7, e[1] + uy * 1.5 + ux * 1.7, 2.1, 0, TAU); ctx.fill();
    }

    // ── far legs (darker), behind the torso
    leg(ctx, -33, -46, 20, 22, -0.30 + A(2), 0.45 + B(2), 17, 11, C.coatD, C.line);
    leg(ctx, 31, -50, 22, 24, 0.05 + A(0), -0.06 - B(0) * 0.6, 14, 10, C.coatD, C.line);

    // ── torso — high withers, a compact back, round rump, deep chest
    const breathe = 1 + Math.sin(t * 1.3 + ph) * 0.01;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(40, -40);
      ctx.bezierCurveTo(48, -48, 50, -64, 44, -76);
      ctx.quadraticCurveTo(30, -84, 10, -80);
      ctx.bezierCurveTo(-4, -78, -18, -74, -28, -72);
      ctx.bezierCurveTo(-40, -70, -46, -60, -44, -50);
      ctx.quadraticCurveTo(-44, -38, -36, -33);
      ctx.quadraticCurveTo(-24, -27, -12, -31);
      ctx.quadraticCurveTo(2, -36, 18, -34);
      ctx.quadraticCurveTo(32, -32, 40, -40);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -84, 0, -28, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -48, 0, -33, [[0, 'rgba(246,227,180,0)'], [1, C.belly]]);
    ctx.fillRect(-50, -50, 100, 24);                                // soft cream underside
    ctx.fillStyle = rg(ctx, -30, -54, 0, 15, [[0, 'rgba(255,220,160,.28)'], [1, 'rgba(255,220,160,0)']]);
    ctx.beginPath(); ctx.arc(-30, -54, 15, 0, TAU); ctx.fill();    // haunch highlight
    ctx.fillStyle = rg(ctx, 30, -62, 4, 26, [[0, 'rgba(60,28,10,.30)'], [1, 'rgba(60,28,10,0)']]);
    ctx.beginPath(); ctx.arc(30, -62, 26, 0, TAU); ctx.fill();     // the mane's shadow
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,170,90,.5)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();                                                // sunset rim light
    ctx.moveTo(10, -79.5);
    ctx.bezierCurveTo(-4, -77.5, -18, -73.5, -28, -71.5);
    ctx.bezierCurveTo(-39, -69.5, -45, -60, -43, -51);
    ctx.stroke();
    ctx.restore();

    // ── near legs (the near haunch gets a muscle mass the leg grows out of)
    ctx.fillStyle = lg(ctx, 0, -60, 0, -30, [[0, C.coat], [1, C.coatD]]);
    ctx.beginPath(); ctx.ellipse(-27, -43, 12.5, 11, -0.2, 0, TAU); ctx.fill();
    leg(ctx, -25, -45, 20, 22, -0.30 + A(3), 0.45 + B(3), 17, 11, C.coat, C.line);
    leg(ctx, 23, -50, 22, 24, 0.05 + A(1), -0.06 - B(1) * 0.6, 14, 10, C.coat, C.line);

    // ── head (mane + face), swaying slowly; thrown back mid-roar
    ctx.save();
    ctx.translate(36, -80);
    ctx.rotate(Math.sin(t * 0.6 + ph) * 0.03 - 0.22 * roarK);
    ctx.scale(0.82, 0.82);
    drawHead(ctx, C, t, ph, roarK);
    ctx.restore();

    ctx.restore();
  }

  window.LionRig = { draw, HEIGHT: 116, WIDTH: 56, colors: BASE };
})();
