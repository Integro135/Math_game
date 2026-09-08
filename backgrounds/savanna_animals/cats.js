/* ── cats.js — the LIONESS and the CHEETAH, drawn from scratch on canvas ─────
   Siblings of lion.js (same house style, same body language, same face
   grammar: cream two-puff muzzle, big amber eyes, heavy brows, round ears),
   sharing one cat body rig with per-species parameters. Shared helpers:
   rig-common.js (window.SavRig). Workshop: animals.html (tabs lioness /
   cub / cheetah).

   LIONESS — the lion's body a touch slimmer and lighter, no mane, a smaller
   round head with two fully visible ears, a small dark tail tuft.
   L.ribbon → a pink hair-ribbon bow between the ears (the scene's cub and
   medium lioness wear it). pose 0..1 = a YAWN: the jaw opens wide (dark
   mouth + tongue), the eyes squeeze shut, the head tips up, then all returns.

   CHEETAH — slimmer still, longer legs, tucked waist, a smaller head with
   rounder ears; golden coat, black tear stripes from the inner eye corners
   down beside the muzzle, black spots over the torso / neck / upper legs, a
   long tail with dark rings and a black tip. pose 0..1 = a CROUCH ready to
   sprint: the body lowers on bent legs, the head drops forward, the tail
   lifts, then it springs back.

   API — window.LionessRig / window.CheetahRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint, ribbon }
       unit space: paws on y = 0, facing +x
     HEIGHT / WIDTH    units (paw line → top of the head / half-width)
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, psr, lg, rg, shade, leg, eye, blink } = window.SavRig;

  const LIONESS = {
    coat: '#DDB068', coatD: '#B8873F', coatL: '#F0CD8A', belly: '#F7E6BA',
    dark: '#4A2210', tuft: '#4A2210',
    line: '#3B1D0C', nose: '#4B2617', mouth: '#5A1F17', tongue: '#D96A66',
    fang: '#FFF6E6', eyeW: '#FFF4DC', iris: '#E99B2C', pupil: '#1B0E06',
    earIn: '#E9B79C', ribbon: '#FF5FA2', ribbonD: '#D63E84', ribbonL: '#FF8FC0',
  };
  const CHEETAH = {
    coat: '#E0B25E', coatD: '#BD8A3A', coatL: '#F2D28E', belly: '#F8EBC8',
    dark: '#1E1408', tuft: '#1E1408', spot: '#231708',
    line: '#2A1808', nose: '#3A2014', mouth: '#5A1F17', tongue: '#D96A66',
    fang: '#FFF6E6', eyeW: '#FFF4DC', iris: '#E1A030', pupil: '#1B0E06',
    earIn: '#E9B79C',
  };
  const tinted = (base, f) => {
    if (!f || f === 1) return base;
    const c = Object.assign({}, base);
    for (const k of ['coat', 'coatD', 'coatL', 'belly']) c[k] = shade(base[k], f);
    return c;
  };

  // species parameters: body shape offsets, leg geometry, head placement
  const SPECIES = {
    lioness: {
      bly: 3,            // belly lift (tucked waist)
      bk: 4,             // back drop — a slimmer torso than the lion's
      legs: { hind: [20, 22, 15, 10], front: [22, 24, 12.5, 9], hipY: -46, shY: -50 },
      hips: { farH: -33, nearH: -25, farF: 31, nearF: 23 },
      head: { x: 38, y: -79, sc: 0.72 },
      earR: 6.4, tailW: [5.2, 2.4],
    },
    cheetah: {
      bly: 8,
      bk: 6,
      legs: { hind: [21, 25, 12, 8], front: [23, 27, 10, 7.5], hipY: -49, shY: -53 },
      hips: { farH: -33, nearH: -25, farF: 31, nearF: 23 },
      head: { x: 39, y: -80, sc: 0.66 },
      earR: 6.8, tailW: [4.2, 2.6],
    },
  };

  function ear(g, C, x, y, r, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.coat;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = C.earIn;
    g.beginPath(); g.ellipse(0, r * 0.1, r * 0.58, r * 0.64, 0, 0, TAU); g.fill();
    g.restore();
  }

  // the pink hair-ribbon bow — two loops, a knot and two short trailing tails
  function ribbon(g, C, x, y, sc){
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.strokeStyle = C.ribbon; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0); g.quadraticCurveTo(-4, 5, -4.2, 10);
    g.moveTo(0, 0); g.quadraticCurveTo(4, 5, 4.2, 10);
    g.stroke();
    g.fillStyle = C.ribbon; g.strokeStyle = C.ribbonD; g.lineWidth = 1;
    g.beginPath();                                   // left loop
    g.moveTo(0, 0);
    g.quadraticCurveTo(-10, -7, -10, -0.5);
    g.quadraticCurveTo(-10, 5, 0, 0);
    g.closePath(); g.fill(); g.stroke();
    g.beginPath();                                   // right loop
    g.moveTo(0, 0);
    g.quadraticCurveTo(10, -7, 10, -0.5);
    g.quadraticCurveTo(10, 5, 0, 0);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.ribbonL;                         // knot
    g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.fill();
    g.restore();
  }

  // ── the head, in head space: face centre (0,0), muzzle toward +x, face
  // turned three-quarters toward the viewer. Face radius ≈ 20 (same grammar
  // as the lion's, without the mane).
  //   k: yawn/crouch amount 0..1 (species decides what it means)
  function drawHead(g, C, sp, t, ph, k, opts){
    const yawn = sp === 'lioness' ? k : 0;
    const eyeRx = sp === 'cheetah' ? 3.7 : 4, eyeRy = sp === 'cheetah' ? 4.3 : 4.5;
    // ears: two round ears, fully visible above the skull
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.7 + ph * 2)), 40) * 0.35;
    const er = SPECIES[sp].earR;
    ear(g, C, -13.5, -16.5, er, -0.12 + flick);
    ear(g, C, 13, -17.5, er, 0.12);
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
    if (sp === 'cheetah'){
      // a few forehead spots
      g.fillStyle = C.spot;
      for (const [dx, dy, r] of [[-9, -14, 1.1], [-3, -17, 1.0], [4, -18, 1.1], [10, -15, 1.0], [-14, -9, 0.9], [16, -10, 0.9]]){
        g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.fill();
      }
    }
    // muzzle: two cream cheek puffs + chin (drops open during the yawn)
    const jaw = 7 * yawn;
    g.fillStyle = C.belly;
    g.beginPath(); g.arc(0.5, 8, 8.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(10.5, 7.2, 8.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(6, 14 + jaw, 6, 5.2, 0, 0, TAU); g.fill();
    if (yawn > 0.12){                                 // the wide yawn
      g.fillStyle = C.mouth;
      g.beginPath(); g.ellipse(6, 10.3 + jaw * 0.5, 6.4, 2.6 + 4.6 * yawn, 0, 0, TAU); g.fill();
      g.fillStyle = C.tongue;
      g.beginPath(); g.ellipse(6, 12.4 + jaw * 0.6, 3.6, 1.4 + 2.6 * yawn, 0, 0, TAU); g.fill();
      g.fillStyle = C.fang;
      g.beginPath();
      g.moveTo(1.2, 8.6); g.lineTo(2.3, 11.4 + 2 * yawn); g.lineTo(3.4, 8.8);
      g.moveTo(8.9, 8.8); g.lineTo(10, 11.4 + 2 * yawn); g.lineTo(11.1, 8.6);
      g.closePath(); g.fill();
    } else {
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
    // cheetah tear stripes: from the inner eye corners down beside the muzzle
    if (sp === 'cheetah'){
      g.strokeStyle = C.spot; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-3.2, -2.4); g.quadraticCurveTo(-4.6, 3, -6.4, 7.6);
      g.moveTo(6.2, -2.6);  g.quadraticCurveTo(7.6, 2.4, 9.8, 6.2);
      g.stroke();
    }
    // eyes — both visible; blink on their own rhythm; squeezed shut by a yawn
    const eyeH = Math.max(0.08, (1 - blink(t, ph)) * (1 - 0.94 * yawn));
    const gaze = Math.sin(t * 0.3 + ph) * 0.4;
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    eye(g, -6.5, -6, eyeRx, eyeRy, eyeH, gaze, ec);
    eye(g, 9, -6.6, eyeRx + 0.6, eyeRy + 0.6, eyeH, gaze, ec);
    // brows
    const up = 1.6 * yawn;
    g.strokeStyle = C.line; g.lineWidth = 2.3; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-11.5, -11.6 - up); g.quadraticCurveTo(-7, -14 - up * 1.4, -2, -12.3 - up);
    g.moveTo(4, -13 - up);       g.quadraticCurveTo(9, -15.4 - up * 1.4, 14.5, -12.8 - up);
    g.stroke();
    if (opts.ribbon) ribbon(g, C, -1, -22.5, 1.15);
  }

  // ── the whole cat
  function drawCat(ctx, L, t, sp, base){
    const P = SPECIES[sp];
    const { x, y, s, dir } = L;
    const C = tinted(base, L.tint);
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const pose = L.pose != null ? L.pose : 0;
    const k = pose ? Math.sin(Math.min(1, Math.max(0, pose)) * Math.PI) : 0;
    const crouch = sp === 'cheetah' ? k : 0;         // body lowers on bent legs
    const yawn = sp === 'lioness' ? k : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.3);          // stride bob
    const wamp = moving ? 0.28 : 0;
    const A = i => wamp * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.38 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;
    // crouch: the torso drops, the legs fold (hips forward, knees bent)
    const drop = 14 * crouch;
    const hb = 0.55 * crouch;                        // hind bend
    const fb = 0.5 * crouch;                         // front bend
    const bly = P.bly, bk = P.bk || 0;

    // ── tail: a tapering swish (lifted high in the crouch)
    const sw = Math.sin(t * 1.05 + ph);
    const lift = 26 * crouch;
    const tc = [[-44, -54 + drop], [-60, -56 + drop - lift * 0.4], [-74, -40 + sw * 3 + drop - lift],
                [-70 + sw * 6, -18 + sw * 5 + drop - lift * 1.4]];
    const bz = u => { const m = 1 - u; return [
      m*m*m*tc[0][0] + 3*m*m*u*tc[1][0] + 3*m*u*u*tc[2][0] + u*u*u*tc[3][0],
      m*m*m*tc[0][1] + 3*m*m*u*tc[1][1] + 3*m*u*u*tc[2][1] + u*u*u*tc[3][1]]; };
    ctx.strokeStyle = C.coatD; ctx.lineCap = 'round';
    let pp = bz(0);
    const [tw0, tw1] = P.tailW;
    for (let i = 1; i <= 10; i++){
      const p = bz(i / 10);
      ctx.lineWidth = tw0 - (tw0 - tw1) * (i / 10);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    if (sp === 'cheetah'){
      // dark rings toward the end, then a black tip
      ctx.strokeStyle = C.dark; ctx.lineCap = 'butt';
      for (const [u0, u1] of [[0.58, 0.64], [0.7, 0.76], [0.82, 0.88]]){
        ctx.lineWidth = tw0 - (tw0 - tw1) * u1;
        ctx.beginPath();
        for (let u = u0; u <= u1 + 0.001; u += 0.02){ const p = bz(u); u === u0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
        ctx.stroke();
      }
      ctx.lineCap = 'round'; ctx.lineWidth = tw1 + 0.4;
      ctx.beginPath();
      for (let u = 0.92; u <= 1.0001; u += 0.02){ const p = bz(u); u === 0.92 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.stroke();
      const e = tc[3];
      ctx.fillStyle = C.dark;
      ctx.beginPath(); ctx.arc(e[0], e[1], tw1 * 0.8 + 0.6, 0, TAU); ctx.fill();
    } else {
      // the lioness's small dark tuft
      const q = bz(0.92), e = tc[3];
      const dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
      const ux = (e[0] - q[0]) / dl, uy = (e[1] - q[1]) / dl;
      ctx.fillStyle = C.tuft;
      for (const [f, r] of [[0, 4.2], [3.4, 3.4], [6.4, 2.2]]){
        ctx.beginPath(); ctx.arc(e[0] + ux * f, e[1] + uy * f, r, 0, TAU); ctx.fill();
      }
    }

    // ── legs geometry
    const [hUp, hLo, hW1, hW2] = P.legs.hind, [fUp, fLo, fW1, fW2] = P.legs.front;
    const hipY = P.legs.hipY + drop, shY = P.legs.shY + drop;
    // when crouching the legs fold: thigh swings forward, shank folds back
    const hindA1 = -0.30 - 0.55 * crouch, hindA2 = 0.45 + hb + 0.4 * crouch;
    const frontA1 = 0.05 + 0.28 * crouch, frontA2 = -0.06 - fb * 0.5 - 0.18 * crouch;
    const pawOpt = sp === 'cheetah' ? { paw: [7.4, 3.9] } : undefined;
    // far legs (darker), behind the torso
    leg(ctx, P.hips.farH, hipY, hUp, hLo, hindA1 + A(2), hindA2 + B(2), hW1, hW2, C.coatD, C.line, pawOpt);
    leg(ctx, P.hips.farF, shY, fUp, fLo, frontA1 + A(0), frontA2 - B(0) * 0.6, fW1, fW2, C.coatD, C.line, pawOpt);

    // ── torso — high withers, compact back, round rump, deep chest; the
    // cheetah's belly is lifted for the tucked waist
    const breathe = 1 + Math.sin(t * 1.3 + ph) * 0.01;
    ctx.save();
    ctx.translate(0, drop);
    ctx.scale(1, breathe);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(40, -40);
      ctx.bezierCurveTo(48, -48, 50, -64 + bk * 0.5, 44, -76 + bk);
      ctx.quadraticCurveTo(30, -84 + bk, 10, -80 + bk);
      ctx.bezierCurveTo(-4, -78 + bk, -18, -74 + bk, -28, -72 + bk);
      ctx.bezierCurveTo(-40, -70 + bk * 0.8, -46, -60 + bk * 0.4, -44, -50);
      ctx.quadraticCurveTo(-44, -38, -36, -33);
      ctx.quadraticCurveTo(-24, -27, -12, -31 - bly);
      ctx.quadraticCurveTo(2, -36 - bly, 18, -34 - bly * 0.6);
      ctx.quadraticCurveTo(32, -32, 40, -40);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -84, 0, -28, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -48 - bly, 0, -33 - bly, [[0, 'rgba(246,227,180,0)'], [1, C.belly]]);
    ctx.fillRect(-50, -50 - bly, 100, 24 + bly);                     // soft cream underside
    ctx.fillStyle = rg(ctx, -30, -54, 0, 15, [[0, 'rgba(255,220,160,.28)'], [1, 'rgba(255,220,160,0)']]);
    ctx.beginPath(); ctx.arc(-30, -54, 15, 0, TAU); ctx.fill();    // haunch highlight
    ctx.fillStyle = rg(ctx, 34, -66, 4, 22, [[0, 'rgba(60,28,10,.20)'], [1, 'rgba(60,28,10,0)']]);
    ctx.beginPath(); ctx.arc(34, -66, 22, 0, TAU); ctx.fill();     // the head's shadow on the shoulder
    if (sp === 'cheetah'){
      // black coat spots, kept on the torso
      ctx.fillStyle = C.spot;
      for (let i = 0; i < 46; i++){
        const sx = -46 + psr(i * 2 + 11) * 92, sy = -80 + psr(i * 3 + 5) * 50;
        const r = 1.2 + psr(i + 17) * 1.4;
        ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.85, psr(i) * 3, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,170,90,.5)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();                                                // sunset rim light
    ctx.moveTo(10, -79.5 + bk);
    ctx.bezierCurveTo(-4, -77.5 + bk, -18, -73.5 + bk, -28, -71.5 + bk);
    ctx.bezierCurveTo(-39, -69.5 + bk * 0.8, -45, -60 + bk * 0.4, -43, -51);
    ctx.stroke();
    ctx.restore();

    // ── near legs (the near haunch gets a muscle mass the leg grows out of)
    ctx.fillStyle = lg(ctx, 0, -60 + drop, 0, -30 + drop, [[0, C.coat], [1, C.coatD]]);
    ctx.beginPath(); ctx.ellipse(-27, -43 + drop, sp === 'cheetah' ? 9.5 : 11.5, sp === 'cheetah' ? 9 : 10, -0.2, 0, TAU); ctx.fill();
    if (sp === 'cheetah'){
      ctx.save();
      ctx.beginPath(); ctx.ellipse(-27, -43 + drop, 9.5, 9, -0.2, 0, TAU); ctx.clip();
      ctx.fillStyle = C.spot;
      for (let i = 0; i < 9; i++){
        const sx = -36 + psr(i * 5 + 3) * 19, sy = -52 + drop + psr(i * 7 + 9) * 18;
        ctx.beginPath(); ctx.arc(sx, sy, 1.1 + psr(i + 4) * 1.1, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    leg(ctx, P.hips.nearH, hipY + 1, hUp, hLo, hindA1 + A(3), hindA2 + B(3), hW1, hW2, C.coat, C.line, pawOpt);
    leg(ctx, P.hips.nearF, shY, fUp, fLo, frontA1 + A(1), frontA2 - B(1) * 0.6, fW1, fW2, C.coat, C.line, pawOpt);
    if (sp === 'cheetah'){
      // a few spots on the near upper legs
      ctx.fillStyle = C.spot;
      for (const [sx, sy] of [[-24, -36], [-27, -30], [-22, -26], [24, -40], [22, -33], [25, -28]]){
        ctx.beginPath(); ctx.arc(sx, sy + drop, 1.1, 0, TAU); ctx.fill();
      }
    }

    // ── neck: blends the head into the shoulders (no mane to hide it)
    const H = P.head;
    const hx = H.x - 6 * crouch, hy = H.y + drop + 10 * crouch - 3 * yawn;
    const nx0 = 30, ny0 = -62 + bk * 0.5 + drop, nx1 = hx - 1, ny1 = hy + 6;
    const ncx = (nx0 + nx1) / 2, ncy = (ny0 + ny1) / 2;
    const nlen = Math.hypot(nx1 - nx0, ny1 - ny0), nrot = Math.atan2(ny1 - ny0, nx1 - nx0);
    const neckPath = () => { ctx.beginPath(); ctx.ellipse(ncx, ncy, nlen / 2 + 9, sp === 'cheetah' ? 11 : 13, nrot, 0, TAU); };
    ctx.fillStyle = lg(ctx, 0, hy - 4, 0, -48 + drop, [[0, C.coatL], [1, C.coat]]);
    neckPath(); ctx.fill();
    if (sp === 'cheetah'){
      ctx.save();
      neckPath(); ctx.clip();
      ctx.fillStyle = C.spot;
      for (let i = 0; i < 10; i++){
        const sx = hx - 16 + psr(i * 3 + 21) * 30, sy = hy + 4 + psr(i * 5 + 23) * 20;
        ctx.beginPath(); ctx.arc(sx, sy, 1 + psr(i + 8) * 0.9, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ── head, swaying slowly; tipped up by a yawn, dropped forward by a crouch
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.sin(t * 0.6 + ph) * 0.03 - 0.18 * yawn + 0.16 * crouch);
    ctx.scale(H.sc, H.sc);
    drawHead(ctx, C, sp, t, ph, k, { ribbon: !!L.ribbon });
    ctx.restore();

    ctx.restore();
  }

  window.LionessRig = {
    draw: (ctx, L, t) => drawCat(ctx, L, t, 'lioness', LIONESS),
    HEIGHT: 104, WIDTH: 52, colors: LIONESS,
  };
  window.CheetahRig = {
    draw: (ctx, L, t) => drawCat(ctx, L, t, 'cheetah', CHEETAH),
    HEIGHT: 104, WIDTH: 54, colors: CHEETAH,
  };
})();
