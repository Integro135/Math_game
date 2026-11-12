/* ── trike.js — the TRICERATOPS (2026-11) ───────────────────────────────────
   A sturdy little tank in true profile: a barrel body on four strong legs
   (chunky round feet, cream claws), a short thick tail, and the BIG head that
   makes it — a wide scalloped frill with a coloured rim and a soft spot on
   every lobe, two long cream brow horns (the far one peeking behind) and a
   short nose horn, a parrot beak, ONE glossy eye under a soft brow and a rosy
   cheek.

   Legs: three bones placed by IK (kit.js) on planted feet. WALK = a solid
   four-beat (lateral sequence), the head nodding. L.run = a charging trot
   (diagonal pairs), head lowered, frill up.
   pose 0..1 = SNORT AND STOMP: the head lowers, a front foot paws the ground
   three times (a little dust), then the head tosses up with a snort — two
   small puffs from the nose, the beak opens in a call (a real gap — pink
   tongue, dark only at the throat) with sound rings, and the frill's rim
   flashes brighter.

   API — window.TrikeRig { draw(ctx, L, t), mouth(L[, t]), HEIGHT, WIDTH, STRIDE,
         RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   HEIGHT = ground → the top of the frill; WIDTH = half the span from the tail
   tip to the horn tips at rest. The lowered head reaches past WIDTH in front
   (about 147 on the run, 154 in the pose with the rings); the tossed head
   tops out about 172 units up and the flicked tail about 136 behind.
   mouth(L) → { x, y } in the caller's space: between the beak's tips, same
   pose maths as draw (t defaults to the last draw's).
   No clips but one (the body's cream underside and spots), no blur, no
   offscreen work.
   Depends only on ../savanna_rigs/kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, alpha, palette, blob, step, leg, xf,
          eye, blink, brow, rings, dust } = window.SavKit;
  const PI = Math.PI;
  // mix two of the palette's 'rgb(r,g,b)' strings (only run once per cached palette)
  const mix = (a, b, k) => {
    const p = a.match(/\d+/g), q = b.match(/\d+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  };

  // ── coats: hide (body*), cream underside, far-side limbs, soft spots, the
  //    frill's coloured edge (fr*, the lobe spots frC — not 'rim': the kit's
  //    palette() owns that key), the beak, the horns
  const SHARED = { eyeW: '#FFFBF0', pupil: '#1B1320', mouth: '#6A2238', tongue: '#F58A9A', cheek: '#FF8494',
                   belly: '#FFF5DC', bellyD: '#F1DFB6', claw: '#FFF4D6', clawF: '#CDBF9A',
                   horn: '#FFF3D2', hornL: '#FFFCEE', hornD: '#E9CE98', hornF: '#E6D3A8', hornFD: '#CBB080',
                   beak: '#FFD27A', beakL: '#FFE9AE', beakD: '#F0AC52', dust: '#DCC8A4', puff: '#FFFFFF' };
  const mk = o => Object.assign({}, SHARED, o);
  const PALS = {
    coral:  mk({ body: '#FF9E8A', bodyL: '#FFC8B6', bodyD: '#EE7A6E', far: '#CF6660', spot: '#E8746A',
                 fr: '#4FC4C0', frL: '#8CE4D8', frD: '#2E9FA4', frC: '#CCF6EC', iris: '#B5562E', line: '#6A2E2A' }),
    teal:   mk({ body: '#62C9C4', bodyL: '#9CE8DE', bodyD: '#3FA5A8', far: '#35898E', spot: '#389CA0',
                 fr: '#FFB45E', frL: '#FFD490', frD: '#F08E42', frC: '#FFF0C4', iris: '#1F7F86', line: '#1F4A52' }),
    plum:   mk({ body: '#B892E8', bodyL: '#DCC6FA', bodyD: '#9068CC', far: '#7854B0', spot: '#8C62CC',
                 fr: '#FF8FBE', frL: '#FFB8D6', frD: '#EA6298', frC: '#FFE2EE', iris: '#6A3FB4', line: '#3C2860' }),
    butter: mk({ body: '#FBD872', bodyL: '#FFEFAE', bodyD: '#ECB44C', far: '#CC973E', spot: '#E4A63E',
                 fr: '#FF8A6E', frL: '#FFB49C', frD: '#E8604E', frC: '#FFE2D2', iris: '#A8641E', line: '#6A4718',
                 beak: '#FFAE62', beakL: '#FFCE96', beakD: '#EE8642' }),
    sky:    mk({ body: '#86BFF2', bodyL: '#BEE2FF', bodyD: '#5C9ADC', far: '#4A80C0', spot: '#5492DA',
                 fr: '#B48AF0', frL: '#D4B8FA', frD: '#8E62D4', frC: '#F0E4FF', iris: '#2F6FC0', line: '#27406A' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['body', 'bodyL', 'bodyD', 'far', 'spot'];

  // off[] = near hind, near front, far hind, far front. WALK: a lateral
  // sequence; TROT: diagonal pairs
  const WALK = { stride: 80,  duty: 0.68, lift: 10, off: [0, 0.75, 0.5, 0.25], bob: 1.5, fsw: 0.5, hsw: 0.4 };
  const TROT = { stride: 124, duty: 0.50, lift: 17, off: [0, 0.5, 0.5, 0],     bob: 3.4, fsw: 0.85, hsw: 0.7 };

  const OX = -7;                                          // the art sits back of the origin so the horns fit the half-width
  const BK = 5.5;                                         // the body blob's tension
  const BODY = [[58, -70], [56, -96], [34, -111], [2, -116], [-30, -114], [-56, -103], [-70, -84], [-66, -62],
                [-40, -47], [-4, -42], [30, -45], [50, -54]];
  const BELLY = [[66, -68], [44, -59], [6, -56], [-36, -60], [-60, -72], [-80, -84], [-78, -36], [0, -26], [72, -36]];
  const SPOTS = [[26, -101, 6.2, 4, -0.3], [2, -105, 7.6, 4.8, 0], [-25, -105, 7, 4.4, 0.15], [-47, -102, 4.8, 3, 0.45],
                 [-2, -89, 5.2, 3.4, 0], [10, -97, 4, 2.8, 0], [-10, -98, 3.6, 2.6, 0.2]];   // (kept clear of the hip and the shoulder, which the legs cover)
  const TOP = -116, CY = -80, SH = [34, -76], HP = [-36, -78], FREST = 36, HREST = -42, FAR = 12;
  const FL = [28, 26, 15], HL = [29, 27, 15], FW = [38, 35, 31, 26], HW = [42, 39, 33, 26], FR = 13;
  const CLAWS = [1.42, 0.84, 0.26];
  const TAIL = [[-52, -84], [-82, -87], [-102, -77], [-118, -58]], TW0 = 42, TW1 = 9;
  const NECK = [[44, -84], [56, -87], [66, -90], [76, -92]], NW0 = 50, NW1 = 40;
  const HEAD = [84, -93];                                 // the head's origin (the middle of the face), at rest
  // ── the head, in head space: face centre (0,0), beak toward +x
  const FACE = [[-17, 2], [-16, -12], [-8, -22], [6, -26], [19, -22], [29, -14], [36, -5], [38, 4], [33, 10], [20, 12], [4, 13], [-10, 11]];
  const BEAK = [[30, -5], [37, -4], [43.5, 2.6], [45.6, 9.6], [43.2, 13.6], [39.4, 10.6], [33, 10.2], [29.6, 3]];
  const JAW = [[-6, 9], [8, 12], [22, 11.6], [33, 11.2], [37.4, 12.6], [35.6, 17], [26, 20.4], [10, 21.4], [-4, 18]];
  const BEAKLO = [[29.6, 11.3], [36.6, 11.9], [38.4, 14.2], [35, 17.6], [29.6, 16.6]];
  const HX = 0, HY = 11;                                  // the jaw hinge
  const MOUTH = [39, 12];                                 // between the beak's tips
  const NOSE = [33.4, 0.4];                               // the nostril
  // horns: [root x, y, control x, y, tip x, y, width at the root]
  const HORN_NEAR = [14, -19, 19, -41, 41, -57, 12.5], HORN_FAR = [23, -18.5, 28.5, -39, 50, -52, 11.5], HORN_NOSE = [34.4, -3.4, 36.4, -13, 44, -19.6, 11];
  // the frill: a fan about (FX, FY) from FA0 round the back and over the top to FA1, in NL soft lobes
  const FX = -6, FY = -14, FRX = 44, FRY = 45.5, FA0 = 0.72 * PI, FA1 = 1.74 * PI, NL = 7;
  const FCOS = [], FSIN = [];                             // unit directions at every half-lobe
  for (let i = 0; i <= NL * 2; i++){ const a = FA0 + (FA1 - FA0) * i / (NL * 2); FCOS.push(Math.cos(a) * FRX); FSIN.push(Math.sin(a) * FRY); }
  const PATCH = [[-27, -13, 9, 13.5, 0.25], [-13, -37, 9, 13, 1.0]];     // two soft patches on the shield

  // ── a tapered tube along a cubic (the neck, the tail), sampled into a
  //    SHARED spine: x, y, unit normal, half-width at NS + 1 stations
  const NS = 14;
  const mkSpine = () => ({ x: new Float32Array(NS + 1), y: new Float32Array(NS + 1), nx: new Float32Array(NS + 1),
                           ny: new Float32Array(NS + 1), w: new Float32Array(NS + 1) });
  const NK = mkSpine(), TL = mkSpine();
  function spine(A, P, w0, w1, pw){
    for (let i = 0; i <= NS; i++){
      const u = i / NS, m = 1 - u, a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
      A.x[i] = a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0];
      A.y[i] = a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1];
      const tx = 3 * m * m * (P[1][0] - P[0][0]) + 6 * m * u * (P[2][0] - P[1][0]) + 3 * u * u * (P[3][0] - P[2][0]);
      const ty = 3 * m * m * (P[1][1] - P[0][1]) + 6 * m * u * (P[2][1] - P[1][1]) + 3 * u * u * (P[3][1] - P[2][1]);
      const l = Math.hypot(tx, ty) || 1;
      A.nx[i] = ty / l; A.ny[i] = -tx / l;
      A.w[i] = (w0 + (w1 - w0) * Math.pow(u, pw)) / 2;
    }
  }
  // the tube's outline as one path with round ends; dy lifts it (the light rim)
  function tubePath(g, A, dy){
    g.beginPath();
    g.moveTo(A.x[0] + A.nx[0] * A.w[0], A.y[0] + A.ny[0] * A.w[0] + dy);
    for (let i = 1; i <= NS; i++) g.lineTo(A.x[i] + A.nx[i] * A.w[i], A.y[i] + A.ny[i] * A.w[i] + dy);
    for (let i = NS; i >= 0; i--) g.lineTo(A.x[i] - A.nx[i] * A.w[i], A.y[i] - A.ny[i] * A.w[i] + dy);
    g.closePath();
    g.moveTo(A.x[0] + A.w[0], A.y[0] + dy); g.arc(A.x[0], A.y[0] + dy, A.w[0], 0, TAU);
    g.moveTo(A.x[NS] + A.w[NS], A.y[NS] + dy); g.arc(A.x[NS], A.y[NS] + dy, A.w[NS], 0, TAU);
  }
  // the cream underside: a band along one edge (sg = which side of the
  // normal), its inner edge at k0 … k1 of the half-width from end to end
  function tubeUnder(g, A, sg, k0, k1){
    g.beginPath();
    g.moveTo(A.x[0] + sg * A.nx[0] * A.w[0], A.y[0] + sg * A.ny[0] * A.w[0]);
    for (let i = 1; i <= NS; i++) g.lineTo(A.x[i] + sg * A.nx[i] * A.w[i], A.y[i] + sg * A.ny[i] * A.w[i]);
    for (let i = NS; i >= 0; i--){
      const k = sg * A.w[i] * (k0 + (k1 - k0) * i / NS);
      g.lineTo(A.x[i] + A.nx[i] * k, A.y[i] + A.ny[i] * k);
    }
    g.closePath();
  }

  // a place near a tube's top edge (sink = how far below it) → SHARED [x, y, heading]; sg = the top's side of the normal
  const AT = [0, 0, 0];
  function tubeAt(A, u, sg, sink){
    const f = clamp01(u) * NS, i = Math.min(NS - 1, f | 0), k = f - i;
    const nx = lerp(A.nx[i], A.nx[i + 1], k), ny = lerp(A.ny[i], A.ny[i + 1], k), w = lerp(A.w[i], A.w[i + 1], k) - sink;
    AT[0] = lerp(A.x[i], A.x[i + 1], k) + sg * nx * w; AT[1] = lerp(A.y[i], A.y[i + 1], k) + sg * ny * w;
    AT[2] = Math.atan2(sg * nx, -sg * ny);
    return AT;
  }

  // ── a chunky round-toed foot on the last joint (x, y): a flat sole, the
  //    toes bulging forward (a sub-path wound like the kit's limbPath, so leg
  //    and foot fill as one shape) … and three little cream claws
  function footPath(g, x, y, rot){
    const c = Math.cos(rot), s = Math.sin(rot), R = FR;
    const X = (px, py) => x + px * c - py * s, Y = (px, py) => y + px * s + py * c;
    g.moveTo(X(-R, -R * 0.6), Y(-R, -R * 0.6)); g.lineTo(X(R, -R * 0.6), Y(R, -R * 0.6));
    g.quadraticCurveTo(X(R * 1.8, -R * 0.2), Y(R * 1.8, -R * 0.2), X(R * 1.82, R * 0.5), Y(R * 1.82, R * 0.5));
    g.quadraticCurveTo(X(R * 1.82, R), Y(R * 1.82, R), X(R * 1.4, R), Y(R * 1.4, R));
    g.lineTo(X(-R * 0.9, R), Y(-R * 0.9, R));
    g.quadraticCurveTo(X(-R * 1.3, R), Y(-R * 1.3, R), X(-R * 1.24, R * 0.45), Y(-R * 1.24, R * 0.45));
    g.quadraticCurveTo(X(-R * 1.18, -R * 0.2), Y(-R * 1.18, -R * 0.2), X(-R, -R * 0.6), Y(-R, -R * 0.6));
    g.closePath();
  }
  function claws(g, x, y, rot, col){
    const c = Math.cos(rot), s = Math.sin(rot);
    g.fillStyle = col; g.beginPath();
    for (const k of CLAWS){
      const cx = x + k * FR * c - FR * s, cy = y + k * FR * s + FR * c;
      g.moveTo(cx, cy); g.ellipse(cx, cy, 3.1, 5, rot, PI, TAU);
    }
    g.fill();
  }

  // ── a cream horn: a curved cone from its root over a control point to a soft
  //    tip. H = [root x, y, control x, y, tip x, y, width]; c0..c2 = root → tip
  function horn(g, H, c0, c1, c2){
    const x0 = H[0], y0 = H[1], cx = H[2], cy = H[3], x1 = H[4], y1 = H[5];
    const dx = cx - x0, dy = cy - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * H[6] / 2, ny = dx / l * H[6] / 2;
    g.fillStyle = lg(g, x0, y0, x1, y1, [[0, c0], [0.4, c1], [1, c2]]);
    const ex = x1 - cx, ey = y1 - cy, el = Math.hypot(ex, ey) || 1, tx = -ey / el * 1.3, ty = ex / el * 1.3;   // the blunt tip
    g.beginPath(); g.moveTo(x0 + nx, y0 + ny);
    g.quadraticCurveTo(cx + nx * 0.62, cy + ny * 0.62, x1 + tx, y1 + ty);
    g.quadraticCurveTo(x1 + ex / el * 2.4, y1 + ey / el * 2.4, x1 - tx, y1 - ty);
    g.quadraticCurveTo(cx - nx * 0.62, cy - ny * 0.62, x0 - nx, y0 - ny);
    g.closePath(); g.fill();
  }
  // ── the frill's outline, in head space: the scalloped fan (k scales it out
  //    from its centre, amp = how far each lobe bulges; 0.026 = a plain arc),
  //    closed down behind the brow and the cheek, where the face covers it
  function frillPath(g, k, amp){
    const km = k * (1 + amp);
    g.beginPath();
    g.moveTo(FX + FCOS[0] * k, FY + FSIN[0] * k);
    for (let i = 1; i < FCOS.length; i += 2)
      g.quadraticCurveTo(FX + FCOS[i] * km, FY + FSIN[i] * km, FX + FCOS[i + 1] * k, FY + FSIN[i + 1] * k);
    g.quadraticCurveTo(22, -30, 13, -15);
    g.lineTo(-8, 8);
    g.quadraticCurveTo(-20, 21, FX + FCOS[0] * k, FY + FSIN[0] * k);
    g.closePath();
  }

  // ── the pose, solved once per draw (and by mouth()): a SHARED scratch
  const S = { TP: [[0, 0], [0, 0], [0, 0], [0, 0]] };
  const TBEND = [0, 0.4, 0.8, 1.1];
  const TSPOTS = [[0.37, 9.5, 4.4, 2.9], [0.53, 7.5, 3.5, 2.3], [0.68, 5.5, 2.6, 1.8]];   // [place along the tail, depth below its top, rx, ry]
  let lastT = 0;
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = S.G = L.run ? TROT : WALK, run = S.run = L.run ? go : 0;
    const cyc = S.cyc = (L.wt || 0) / TAU, p = S.p = clamp01(L.pose || 0);
    // snort and stomp: the head goes down (the pawing), is tossed up (the
    // snort and the call), and settles
    const down = S.down = p > 0 ? smooth(clamp01(p / 0.14)) * (1 - smooth(clamp01((p - 0.5) / 0.12))) : 0;
    const up = S.up = p > 0 ? smooth(clamp01((p - 0.54) / 0.11)) * (1 - smooth(clamp01((p - 0.84) / 0.16))) : 0;
    // the pawing front foot: three scrapes — up and forward, then dragged back along the ground
    const pe = p > 0 ? smooth(clamp01((p - 0.1) / 0.05)) * (1 - smooth(clamp01((p - 0.5) / 0.05))) : 0;
    const u = frac((p - 0.1) / 0.14);
    if (u < 0.4){ S.pawX = pe * lerp(-9, 16, smooth(u / 0.4)); S.pawLift = pe * Math.sin(PI * u / 0.4) * 13; S.scrape = 0; }
    else { const k = (u - 0.4) / 0.6; S.pawX = pe * lerp(16, -9, k); S.pawLift = 0; S.scrape = pe > 0.6 ? k : 0; }
    S.drop = go * G.bob * Math.sin(2 * TAU * cyc + 0.6) + 2.4 * down - 1.6 * up;
    S.pitch = go * (L.run ? 0.028 * Math.sin(2 * TAU * cyc + 2.4) : 0.012 * Math.sin(TAU * cyc + 1)) + 0.03 * run + 0.034 * down - 0.03 * up;
    S.breathe = 1 + Math.sin(t * 1.15 + ph) * 0.009;
    // the head: nods with the steps, carried low on the run; down to paw, tossed up to snort
    const nod = go * Math.sin(2 * TAU * cyc + 1.2);
    S.hx = HEAD[0] + 3 * down - 4 * up + 2 * run;
    S.hy = HEAD[1] + 8 * down - 5 * up + 1.8 * nod + 5 * run + Math.sin(t * 0.6 + ph) * 0.6;
    S.hrot = 0.05 + 0.045 * nod + Math.sin(t * 0.55 + ph) * 0.025 + 0.26 * run + 0.44 * down - 0.44 * up
           + 0.04 * pe * Math.sin(TAU * (p - 0.1) / 0.14);
    S.jaw = 0.62 * up * (0.82 + 0.18 * Math.sin(p * TAU * 8));
    S.flash = up * (0.7 + 0.3 * Math.sin(p * TAU * 9));
    // the tail: sways at rest and with the steps; it flicks up with the toss
    const sway = Math.sin(t * 1.4 + ph) * 3 + go * Math.sin(2 * TAU * cyc + 0.3) * (2.4 + 2 * run);
    const ang = 0.34 * up - 0.06 * down;
    const TP = S.TP, rx = TAIL[0][0], ry = TAIL[0][1];
    TP[0][0] = rx; TP[0][1] = ry;
    for (let i = 1; i < 4; i++){
      const a = ang * TBEND[i], c = Math.cos(a), s = Math.sin(a);
      const x = TAIL[i][0] - rx, y = TAIL[i][1] - ry + sway * (i - 1) * 0.5;
      TP[i][0] = rx + x * c - y * s; TP[i][1] = ry + x * s + y * c;
    }
    // the mouth (between the beak's tips), in unit space
    const j = S.jaw * 0.5, mx0 = MOUTH[0] - HX, my0 = MOUTH[1] - HY;
    const mx = HX + mx0 * Math.cos(j) - my0 * Math.sin(j), my = HY + mx0 * Math.sin(j) + my0 * Math.cos(j);
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    const r = xf(S.hx + mx * c - my * s, S.hy + mx * s + my * c, 0, CY, S.pitch, OX, S.drop);
    S.mx = r[0]; S.my = r[1];
    return S;
  }
  // where the mouth is on screen for this L (t defaults to the last draw's)
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    return { x: L.x + S.mx * L.s * (L.dir || 1), y: L.y + S.my * L.s };
  }
  // derived colours, once per cached palette
  function derive(C, lit){
    const li = lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
    const warm = 'rgb(' + q(255 * li[0]) + ',' + q(238 * li[1]) + ',' + q(204 * li[2]) + ')';
    C.x = { rim: mix(C.bodyL, warm, 0.6), frillRim: mix(C.frL, warm, 0.55), spot: alpha(C.spot, 0.5), patch: alpha(C.spot, 0.4),
            flash: mix(C.frC, warm, 0.5), cheek: alpha(C.cheek, 0.72), smile: alpha(C.line, 0.62), brow: alpha(C.line, 0.6),
            nostril: alpha(C.line, 0.55), rimT: mix(C.frL, C.fr, 0.5), headL: mix(C.bodyL, C.body, 0.3) };
  }

  // ── the head, in head space: face centre (0,0), beak toward +x
  function drawHead(g, C, t){
    const ph = S.ph, jaw = S.jaw, up = S.up, down = S.down, flash = S.flash;
    // the frill: its light rim (the same shape a hair higher), the coloured
    // scalloped edge with a soft spot on every lobe, then the shield inside it
    g.fillStyle = C.x.frillRim; g.translate(0, -1.6); frillPath(g, 1, 0.3); g.fill(); g.translate(0, 1.6);
    g.fillStyle = lg(g, 0, FY - FRY, 0, FY + FRY * 0.8, [[0, C.x.rimT], [0.5, C.fr], [1, C.frD]]);
    frillPath(g, 1, 0.3); g.fill();
    if (flash > 0.02){ g.fillStyle = C.x.flash; g.globalAlpha = flash * 0.75; g.fill(); g.globalAlpha = 1; }
    g.fillStyle = C.frC; g.beginPath();
    for (let i = 1; i < FCOS.length; i += 2){
      const x = FX + FCOS[i] * 0.97, y = FY + FSIN[i] * 0.97;
      g.moveTo(x + 3.3, y); g.arc(x, y, 3.3, 0, TAU);
    }
    g.fill();
    g.fillStyle = lg(g, 0, FY - FRY * 0.8, 0, FY + FRY * 0.7, [[0, C.bodyL], [0.5, C.body], [1, C.bodyD]]);
    frillPath(g, 0.8, 0.026); g.fill();
    g.fillStyle = C.x.patch; g.beginPath();
    for (const q of PATCH){ g.moveTo(q[0] + q[2] * Math.cos(q[4]), q[1] + q[2] * Math.sin(q[4])); g.ellipse(q[0], q[1], q[2], q[3], q[4], 0, TAU); }
    g.fill();
    // the horns stand behind the face's top edge: far brow horn, near brow horn, nose horn
    horn(g, HORN_FAR, C.hornFD, C.hornF, C.hornF);
    horn(g, HORN_NEAR, C.hornD, C.horn, C.hornL);
    horn(g, HORN_NOSE, C.hornD, C.horn, C.hornL);
    if (jaw > 0.02){                                      // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), d = 17;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2, HY - 2); g.lineTo(HX + d, HY + 1.4);
      g.lineTo(HX + d * c - 1.6 * s, HY + d * s + 1.6 * c); g.lineTo(HX - 2, HY + 5); g.closePath(); g.fill();
    }
    g.save();                                             // the cream lower jaw on its hinge, with the beak's lower tip
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    g.fillStyle = lg(g, 0, 10, 0, 22, [[0, C.belly], [1, C.bellyD]]);
    blob(g, JAW, 5); g.fill();
    if (jaw > 0.05){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(19, 12.2, 10, 0.8 + 3 * jaw, 0, 0, TAU); g.fill(); }
    g.fillStyle = C.beakD; blob(g, BEAKLO, 5); g.fill();
    g.restore();
    const face = () => blob(g, FACE, 5.5);
    g.fillStyle = C.x.rim; g.translate(0, -1.1); face(); g.fill(); g.translate(0, 1.1);
    g.fillStyle = lg(g, 0, -26, 0, 13, [[0, C.x.headL], [0.5, C.body], [1, C.bodyD]]);
    face(); g.fill();
    g.fillStyle = lg(g, 0, -5, 0, 14, [[0, C.beakL], [0.5, C.beak], [1, C.beakD]]);      // the parrot beak
    blob(g, BEAK, 5); g.fill();
    g.fillStyle = C.x.cheek;                              // the rosy cheek
    g.beginPath(); g.ellipse(17.5, 5.2, 5.8, 3.7, 0.05, 0, TAU); g.fill();
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(NOSE[0], NOSE[1], 1.7, 1.1, -0.6, 0, TAU); g.fill();
    g.strokeStyle = C.x.smile; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath();                                        // the smile, with a dimple
    if (jaw < 0.06){ g.moveTo(33.4, 10.8); g.quadraticCurveTo(20, 13.6, 7.4, 11.8); }
    g.moveTo(7.8, 9.6); g.quadraticCurveTo(5.6, 11.4, 7.2, 13.6);
    g.stroke();
    // ONE eye: it narrows for the pawing and squeezes into a happy arc for the call
    const ex = 12.4, ey = -7.6, rx = 6.4, ry = 7.2;
    if (up > 0.5){
      g.strokeStyle = C.line; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ex - rx, ey + 2); g.quadraticCurveTo(ex, ey - ry * 1.05, ex + rx, ey + 2); g.stroke();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.22 * down) * (1 - 1.6 * up);
      eye(g, ex, ey, rx, ry, eyeH, 0.3 + Math.sin(t * 0.3 + ph) * 0.35, C, { iris: 0.84, lid: 1.4 });
    }
    brow(g, C.x.brow, 5.6, -17.4 - up - 0.6 * down, 12, -20.2 - 1.4 * up, 19.2, -16.6 - up + 2.4 * down, 1.5);
  }

  const NP = [NECK[0], NECK[1], [0, 0], [0, 0]];          // the neck's control points: its end follows the head
  function draw(ctx, L, t){
    lastT = t;
    const C = palette(PALS[L.coat] || PALS[COATS[0]], TINTED, L.tint, L.lit);
    if (!C.x) derive(C, L.lit);
    solve(L, t);
    const go = S.go, G = S.G, cyc = S.cyc, p = S.p;
    NP[3][0] = S.hx - 8; NP[3][1] = S.hy + 4;
    NP[2][0] = (NECK[2][0] + NP[3][0] - 10) / 2; NP[2][1] = (NECK[2][1] + NP[3][1] + 2) / 2;
    spine(NK, NP, NW0, NW1, 1); spine(TL, S.TP, TW0, TW1, 0.8);

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(OX, 0);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.bodyL], [0.42, C.body], [1, C.bodyD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1, paw = i === 1;
      const st = step(cyc + G.off[i], G.duty);
      const gr = st.x * G.stride * go, reach = gr + (paw ? S.pawX : 0);
      const lift = st.lift * G.lift * go * (hind ? 0.85 : 1) + (paw ? S.pawLift : 0);
      const swing = st.sw ? Math.sin(PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR * 0.7 : 0), root[1], 0, CY, S.pitch, gr * (hind ? 0.1 : 0.25), S.drop);
      const fold = (hind ? -0.14 : 0.05) - reach / (hind ? 150 : 120) + swing * (hind ? G.hsw : G.fsw) + (paw ? S.pawLift * 0.035 : 0);
      const fx = (hind ? HREST : FREST) + (far ? FAR : 0) + reach, fy = -lift - FR;
      // a sturdy leg stays nearly straight: when the foot is far out the root
      // (hidden inside the body) slides toward it instead of the foot lifting
      let rx = r[0], ry = r[1];
      const ax = fx + Math.sin(fold) * len[2], ay = fy - Math.cos(fold) * len[2];
      const d = Math.hypot(ax - rx, ay - ry), lim = (len[0] + len[1]) * 0.992;
      if (d > lim){ const k = (d - lim) / d; rx += (ax - rx) * k; ry += (ay - ry) * k; }
      const ch = leg(ctx, rx, ry, fx, fy, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      // the lifted foot tips with the last bone — but never so far that a toe or the heel dips under the ground
      const px = ch[3][0], py = ch[3][1], fm = lift / (1.85 * FR), frot = Math.max(-1.4 * fm, Math.min(fm, fold * smooth(clamp01(lift / 5))));
      ctx.beginPath(); footPath(ctx, px, py, frot); ctx.fill();
      claws(ctx, px, py, frot, far ? C.clawF : C.claw);
      if (!far){                                          // soft spots riding the near leg's upper bone
        const ux = ch[1][0] - ch[0][0], uy = ch[1][1] - ch[0][1], k = hind ? 0.42 : 0.55;
        ctx.fillStyle = C.x.spot; ctx.beginPath();
        ctx.ellipse(ch[0][0] + ux * k - 4, ch[0][1] + uy * k, hind ? 5 : 3.8, hind ? 3.4 : 2.8, 0.3, 0, TAU);
        if (hind){ ctx.moveTo(ch[1][0] + 6.4, ch[1][1] - 3); ctx.ellipse(ch[1][0] + 3, ch[1][1] - 3, 3.4, 2.5, -0.2, 0, TAU); }
        ctx.fill();
      }
    }
    const bodyFrame = () => { ctx.translate(0, S.drop); ctx.translate(0, CY); ctx.rotate(S.pitch); ctx.translate(0, -CY); };

    oneLeg(2); oneLeg(3);

    ctx.save(); bodyFrame();
    ctx.translate(0, CY); ctx.scale(1, S.breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, BK);
    // ── the body's light rim (the same shape a hair higher) goes under the tail and the neck
    ctx.fillStyle = C.x.rim; ctx.translate(0, -2); body(); ctx.fill(); ctx.translate(0, 2);
    // ── the short thick tail
    ctx.fillStyle = C.x.rim; tubePath(ctx, TL, -1.6); ctx.fill();
    ctx.fillStyle = coatG; tubePath(ctx, TL, 0); ctx.fill();
    ctx.fillStyle = C.belly; tubeUnder(ctx, TL, 1, 0.3, 1); ctx.fill();
    ctx.fillStyle = C.x.spot; ctx.beginPath();           // soft spots along the tail's top
    for (const q of TSPOTS){
      const A = tubeAt(TL, q[0], -1, q[1]), c = Math.cos(A[2]) * q[2], s = Math.sin(A[2]) * q[2];
      ctx.moveTo(A[0] + c, A[1] + s); ctx.ellipse(A[0], A[1], q[2], q[3], A[2], 0, TAU);
    }
    ctx.fill();
    // ── the neck (mostly hidden behind the frill and the jaw)
    ctx.fillStyle = coatG; tubePath(ctx, NK, 0); ctx.fill();
    // ── the body: cream underside, soft spots
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -76, 0, -40, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, BELLY, 5.5); ctx.fill();
    ctx.fillStyle = C.x.spot; ctx.beginPath();
    for (const sp of SPOTS){ ctx.moveTo(sp[0] + sp[2] * Math.cos(sp[4]), sp[1] + sp[2] * Math.sin(sp[4])); ctx.ellipse(sp[0], sp[1], sp[2], sp[3], sp[4], 0, TAU); }
    ctx.fill();
    ctx.restore();
    ctx.restore();

    oneLeg(0); oneLeg(1);
    if (S.scrape > 0) dust(ctx, FREST + S.pawX - 16, 0, S.scrape, C.dust, -1);      // a little dust behind the pawing foot

    // ── the head; then the snort's two puffs and the call's sound rings
    ctx.save(); bodyFrame();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot);
    drawHead(ctx, C, t);
    for (let i = 0; i < 2; i++){
      const k = (p - 0.6 - i * 0.09) / 0.2;
      if (k <= 0 || k >= 1) continue;
      const x = NOSE[0] + 6 + 20 * k, y = NOSE[1] - 2 - 9 * k - i * 3;
      ctx.fillStyle = C.puff; ctx.globalAlpha = (1 - k) * 0.9;
      ctx.beginPath(); ctx.arc(x, y, 3.4 + 5.4 * k, 0, TAU);
      ctx.moveTo(x + 6 + 6.6 * k, y - 2.5); ctx.arc(x + 4 + 3 * k, y - 2.5, 2 + 3.6 * k, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (p > 0.62 && p < 0.9) rings(ctx, MOUTH[0] + 6, MOUTH[1] + 3, 0.02 + 0.96 * frac((p - 0.62) / 0.14), C.line, 0.6, 0.9);
    ctx.restore();
    ctx.restore();
  }

  window.TrikeRig = { draw, mouth, HEIGHT: 160, WIDTH: 130, STRIDE: WALK.stride, RUN_STRIDE: TROT.stride, ACT_SECONDS: 2.8,
                      WALK_CPS: 0.66, RUN_CPS: 1.3, COATS };
})();
