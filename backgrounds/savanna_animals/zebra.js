/* ── zebra.js — a cartoon ZEBRA, drawn from scratch on canvas ───────────────
   Sibling of lion.js (same house style, same API, same unit space). Workshop:
   backgrounds/savanna_animals/animals.html?animal=zebra. Nothing in the game
   uses it yet. Shared helpers: rig-common.js (window.SavRig).

   THE LOOK: horse-like body in profile — deep rounded chest, arched neck
   rising to a smallish head turned three-quarters toward the viewer (both big
   dark eyes show), round rump. Off-white coat with soft BLACK stripes: curved
   bands on the torso, a diagonal fan on the rump, bands across the neck,
   rings on the legs, a blaze + chevrons on the face. A striped brush mane
   along the crest, a black forelock, a tail ending in a black tuft, dark
   rounded muzzle with nostrils and a small smile, black hooves.

   ALIVE: breathing, blinking, head sway, ear flick, tail swish, the mane
   brush ripples, a diagonal-gait walk cycle (2-segment round-jointed legs),
   and a BRAY (pose 0..1): head tosses up and back, mouth opens on a strip of
   teeth, ears pin back, then it all settles.

   API — window.ZebraRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint }
       unit space: hooves on y = 0, facing +x, ~122 units tall to the ear tips
     HEIGHT / WIDTH    units (paws→ear tips / half-width) for hit boxes, shadows
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, shade, leg, eye, blink } = window.SavRig;
  const BASE = {
    coat: '#F4EFE4', coatD: '#D9CFBE', coatL: '#FFFDF7', stripe: '#211C1A',
    muzzle: '#3E342E', muzzleL: '#5A4D44', nostril: '#1E1816', earIn: '#EBD0C0',
    hoof: '#2B2018', line: '#2A2220', eyeW: '#FFF7EA', iris: '#5A3820', pupil: '#17100C',
    mouth: '#4A1F1C', teeth: '#FFF6E6',
  };
  const tinted = f => {
    if (!f || f === 1) return BASE;
    const c = Object.assign({}, BASE);
    for (const k of ['coat', 'coatD', 'coatL']) c[k] = shade(BASE[k], f);
    return c;
  };
  const bez = (p, u) => { const m = 1 - u; return [
    m*m*m*p[0][0] + 3*m*m*u*p[1][0] + 3*m*u*u*p[2][0] + u*u*u*p[3][0],
    m*m*m*p[0][1] + 3*m*m*u*p[1][1] + 3*m*u*u*p[2][1] + u*u*u*p[3][1]]; };

  // the neck's crest (top edge) — the mane brush rides along it
  const CREST = [[12, -76], [22, -86], [34, -98], [44, -106]];

  // black rings around a leg — same transforms as SavRig.leg so they sit on it
  function legRings(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col){
    g.save(); g.translate(hx, hy); g.rotate(a1);
    g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 2.6;
    const band = (yy, w) => { g.beginPath(); g.moveTo(-w / 2 + 1.3, yy); g.quadraticCurveTo(0, yy + 0.9, w / 2 - 1.3, yy); g.stroke(); };
    for (const f of [0.5, 0.8]) band(upLen * f, w1);
    g.translate(0, upLen); g.rotate(a2);
    for (const f of [0.2, 0.48, 0.76]) band(loLen * f, w2);
    g.restore();
  }

  function ear(g, C, x, y, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.coat;
    g.beginPath(); g.ellipse(0, 0, 3.9, 7.2, 0, 0, TAU); g.fill();
    g.fillStyle = C.earIn;
    g.beginPath(); g.ellipse(0, 0.8, 2.1, 4.6, 0, 0, TAU); g.fill();
    g.fillStyle = C.stripe;                        // dark ear tip
    g.beginPath(); g.ellipse(0, -5.6, 2.6, 1.9, 0, 0, TAU); g.fill();
    g.restore();
  }

  // ── the head, in head space: face centre (0,0), muzzle down-forward (+x,+y),
  // turned three-quarters toward the viewer.
  function drawHead(g, C, t, ph, k){
    // ears (the face overlaps their bases); pinned back mid-bray, the far one flicks
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.8 + ph * 2)), 40) * 0.3;
    ear(g, C, -7.5, -17, -0.2 + flick + 0.7 * k);
    ear(g, C, 6.5, -18, 0.18 + 0.7 * k);
    // the face — broad forehead tapering to the muzzle
    const face = () => {
      g.beginPath();
      g.moveTo(-12, -8);
      g.bezierCurveTo(-12, -16, -6, -19.5, 0, -19.5);
      g.bezierCurveTo(7, -19.5, 13, -15, 13.5, -7);
      g.bezierCurveTo(14.2, 2, 14, 9.5, 11, 14.5);
      g.bezierCurveTo(8.5, 19, -1, 19.5, -5.5, 16);
      g.bezierCurveTo(-10.5, 12, -12.5, 2, -12, -8);
      g.closePath();
    };
    g.fillStyle = lg(g, 0, -19, 0, 18, [[0, C.coatL], [1, C.coat]]);
    face(); g.fill();
    // one soft dark blaze down the nose, kept inside the face
    g.save(); face(); g.clip();
    g.strokeStyle = 'rgba(33,28,26,.82)'; g.lineCap = 'round'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(0.4, -20); g.quadraticCurveTo(0.2, -8, 1.6, 2.5); g.quadraticCurveTo(2.2, 5, 3.2, 6.5); g.stroke();
    g.restore();
    // muzzle — dark, soft-shaded, with nostrils
    const jaw = 2.4 * k;
    g.fillStyle = lg(g, 0, 5, 0, 19, [[0, C.muzzleL], [1, C.muzzle]]);
    g.beginPath(); g.ellipse(3.5, 12 + jaw * 0.3, 9.6, 6.9, 0.05, 0, TAU); g.fill();
    g.fillStyle = C.nostril;
    g.beginPath(); g.ellipse(-1.2, 10.4, 1.5, 2, -0.35, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(8.2, 9.9, 1.6, 2.1, 0.3, 0, TAU); g.fill();
    if (k > 0.15){                                  // the braying mouth
      g.fillStyle = C.mouth;
      g.beginPath(); g.ellipse(3.8, 15.6 + jaw, 6.2, 2 + 2.6 * k, 0.05, 0, TAU); g.fill();
      g.fillStyle = C.teeth;
      g.beginPath(); g.ellipse(3.8, 14.2 + jaw * 0.6, 5, 1.1 + 0.4 * k, 0.05, 0, TAU); g.fill();
    } else {
      g.strokeStyle = C.nostril; g.lineWidth = 1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-2, 15.4); g.quadraticCurveTo(3.6, 18.2, 9.4, 15.2); g.stroke();
    }
    // eyes — both visible; dark brown irises
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.22 * k);
    const gaze = Math.sin(t * 0.3 + ph) * 0.35;
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    eye(g, -5.6, -3, 3.9, 4.5, eyeH, gaze, ec);
    eye(g, 6.6, -3.6, 4.5, 5.05, eyeH, gaze, ec);
    // lashes at the outer corners + heavy brows (lift when braying)
    g.strokeStyle = C.line; g.lineCap = 'round';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-9.6, -4.8); g.lineTo(-11.3, -6.3);
    g.moveTo(11.2, -6.2); g.lineTo(13.1, -7.9);
    g.stroke();
    const up = 1.6 * k;
    g.lineWidth = 2.7;
    g.beginPath();
    g.moveTo(-10, -9.4 - up); g.quadraticCurveTo(-6, -11.6 - up * 1.3, -2, -10 - up);
    g.moveTo(3, -10.6 - up);  g.quadraticCurveTo(7.2, -12.8 - up * 1.3, 11.6, -10.6 - up);
    g.stroke();
    // forelock — one soft black tuft of overlapping lobes between the ears
    g.fillStyle = C.stripe;
    for (const [fx, fy, fr] of [[-2.6, -19.4, 3.4], [1.4, -21, 3.9], [5, -19.4, 3.2]]){
      g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.fill();
    }
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = tinted(L.tint);
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const k = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // bray
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.3);          // stride bob
    const wamp = moving ? 0.28 : 0;
    const A = i => wamp * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.38 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;

    // ── tail: a tapering swish ending in a black tuft
    const sw = Math.sin(t * 1.1 + ph);
    const tc = [[-45, -68], [-54, -66], [-61, -48 + sw * 3], [-58 + sw * 5, -30 + sw * 4]];
    ctx.strokeStyle = C.coatD; ctx.lineCap = 'round';
    let pp = bez(tc, 0);
    for (let i = 1; i <= 10; i++){
      const p = bez(tc, i / 10);
      ctx.lineWidth = 4.6 - 2 * (i / 10);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    {
      const q = bez(tc, 0.9), e = tc[3];
      const dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
      const ux = (e[0] - q[0]) / dl, uy = (e[1] - q[1]) / dl;
      ctx.fillStyle = C.stripe;
      for (const [f, r] of [[0, 4.6], [4.4, 4.2], [8.6, 3.4], [12, 2.2]]){
        ctx.beginPath(); ctx.arc(e[0] + ux * f, e[1] + uy * f, r, 0, TAU); ctx.fill();
      }
    }

    // ── far legs (darker), behind the body
    const legs = [
      // [hx, hy, upLen, loLen, a1, a2, w1, w2, phase, near]
      [-31, -48, 22, 22, -0.30, 0.45, 15, 8.5, 2, false],
      [ 30, -52, 24, 22,  0.05, -0.06, 12, 8, 0, false],
      [-23, -47, 22, 22, -0.30, 0.45, 15, 8.5, 3, true],
      [ 22, -52, 24, 22,  0.05, -0.06, 12, 8, 1, true],
    ];
    const drawLeg = (lg_, col) => {
      const [hx, hy, up, lo, a1, a2, w1, w2, i, hind] = lg_;
      const A1 = a1 + A(i), A2 = a2 + (a2 > 0 ? B(i) : -B(i) * 0.6);
      leg(ctx, hx, hy, up, lo, A1, A2, w1, w2, col, C.line, { hoof: C.hoof });
      legRings(ctx, hx, hy, up, lo, A1, A2, w1, w2, C.stripe);
    };
    drawLeg(legs[0], C.coatD); drawLeg(legs[1], C.coatD);

    // ── neck: an arched band from the withers up to the head
    const neck = () => {
      ctx.beginPath();
      ctx.moveTo(CREST[0][0], CREST[0][1]);
      ctx.bezierCurveTo(CREST[1][0], CREST[1][1], CREST[2][0], CREST[2][1], CREST[3][0], CREST[3][1]);
      ctx.lineTo(60, -98);
      ctx.bezierCurveTo(57, -88, 51, -76, 44, -62);
      ctx.lineTo(28, -60);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 20, -100, 52, -70, [[0, C.coatL], [1, C.coatD]]);
    neck(); ctx.fill();
    ctx.save(); neck(); ctx.clip();
    ctx.strokeStyle = C.stripe; ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
    for (const [x0, y0, x1, y1] of [[19, -85, 35, -70], [26, -92, 42, -77], [33, -98, 49, -84], [40, -104, 56, -92]]){
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 2.5, (y0 + y1) / 2 + 2, x1, y1); ctx.stroke();
    }
    ctx.restore();

    // ── torso — deep chest, straight-ish back, round rump
    const breathe = 1 + Math.sin(t * 1.3 + ph) * 0.01;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(38, -42);
      ctx.bezierCurveTo(48, -50, 50, -64, 42, -74);
      ctx.quadraticCurveTo(30, -80, 12, -78);
      ctx.bezierCurveTo(-4, -78, -20, -76, -30, -74);
      ctx.bezierCurveTo(-44, -72, -50, -60, -48, -50);
      ctx.quadraticCurveTo(-48, -38, -40, -34);
      ctx.quadraticCurveTo(-26, -30, -12, -34);
      ctx.quadraticCurveTo(4, -40, 20, -38);
      ctx.quadraticCurveTo(32, -36, 38, -42);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -82, 0, -30, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // stripes: curved bands down the flank (thinning toward the white belly)
    ctx.strokeStyle = C.stripe; ctx.lineCap = 'round';
    for (const [x0, x1, y1, w] of [[29, 26, -55, 4.4], [19, 16, -49, 4.8], [8, 6, -47, 5], [-3, -5, -49, 4.8]]){
      // a smooth taper: the band's curve stroked in segments of shrinking width
      const cx = (x0 + x1) / 2 + 1.8, N = 6;
      const q = u => { const m = 1 - u; return [m*m*x0 + 2*m*u*cx + u*u*x1, m*m*(-82) + 2*m*u*(-66) + u*u*y1]; };
      let p0 = q(0);
      for (let i = 1; i <= N; i++){
        const p1 = q(i / N);
        ctx.lineWidth = w * (1 - 0.55 * (i - 0.5) / N);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        p0 = p1;
      }
    }
    // the rump: a fan of diagonal bands sweeping down and back
    ctx.lineWidth = 4;
    for (const [x0, y0, x1, y1] of [[-22, -78, -35, -55], [-30, -76, -43, -59], [-38, -72, -48, -63]]){
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - 3, (y0 + y1) / 2 + 2, x1, y1); ctx.stroke();
    }
    // soft shading: shadow under the neck, light along the belly
    ctx.fillStyle = rg(ctx, 34, -66, 4, 22, [[0, 'rgba(60,40,30,.22)'], [1, 'rgba(60,40,30,0)']]);
    ctx.beginPath(); ctx.arc(34, -66, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -46, 0, -33, [[0, 'rgba(255,253,247,0)'], [1, C.coatL]]);
    ctx.fillRect(-50, -48, 100, 20);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,190,120,.45)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();                                                // sunset rim light
    ctx.moveTo(12, -77.5);
    ctx.bezierCurveTo(-4, -77.5, -20, -75.5, -30, -73.5);
    ctx.bezierCurveTo(-42, -71.5, -47, -60, -46, -51);
    ctx.stroke();
    ctx.restore();

    // ── near legs (the near haunch gets a striped muscle mass)
    const haunch = () => { ctx.beginPath(); ctx.ellipse(-26, -44, 12, 10.5, -0.2, 0, TAU); };
    ctx.fillStyle = lg(ctx, 0, -82, 0, -30, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    haunch(); ctx.fill();
    ctx.save(); haunch(); ctx.clip();
    ctx.strokeStyle = C.stripe; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, -56); ctx.quadraticCurveTo(-31, -46, -34, -36);
    ctx.moveTo(-15, -52); ctx.quadraticCurveTo(-22, -44, -26, -34);
    ctx.stroke();
    ctx.restore();
    drawLeg(legs[2], C.coat); drawLeg(legs[3], C.coat);

    // ── mane: a brush of short strokes standing along the crest, black with
    // white streaks (the neck stripes run on into it); it ripples a little
    ctx.lineCap = 'round';
    const crestPt = u => {
      const p = bez(CREST, u), q = bez(CREST, Math.min(1, u + 0.01));
      const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
      return [p[0], p[1], ty / tl, -tx / tl];                      // point + outward normal (up-left)
    };
    ctx.strokeStyle = C.stripe; ctx.lineWidth = 7;                 // the solid brush band
    ctx.beginPath();
    for (let i = 0; i <= 12; i++){
      const [px, py, nx, ny] = crestPt(0.03 + (i / 12) * 0.9);
      const off = 3 + Math.sin(t * 2 + i * 0.8 + ph) * 0.5;
      i ? ctx.lineTo(px + nx * off, py + ny * off) : ctx.moveTo(px + nx * off, py + ny * off);
    }
    ctx.stroke();
    ctx.strokeStyle = C.coat; ctx.lineWidth = 1.7;                 // white streaks across it
    for (let i = 0; i < 5; i++){
      const [px, py, nx, ny] = crestPt(0.13 + i * 0.165);
      ctx.beginPath();
      ctx.moveTo(px + nx * 1.4 - ny * 0.5, py + ny * 1.4 + nx * 0.5);
      ctx.lineTo(px + nx * 5.2 - ny * 1.3, py + ny * 5.2 + nx * 1.3);
      ctx.stroke();
    }

    // ── head: slow sway, a nod while walking, tossed up and back mid-bray
    ctx.save();
    ctx.translate(54, -100);
    ctx.rotate(Math.sin(t * 0.6 + ph) * 0.03 + (moving ? Math.sin(wt * 2) * 0.03 : 0) - 0.42 * k);
    drawHead(ctx, C, t, ph, k);
    ctx.restore();

    ctx.restore();
  }

  window.ZebraRig = { draw, HEIGHT: 122, WIDTH: 58, colors: BASE };
})();
