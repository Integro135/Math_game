/* ── stego.js — the STEGOSAURUS (2026-11) ───────────────────────────────────
   A big gentle plodder in true profile: a round arched back that peaks over
   the hips, carrying TWO rows of kite-shaped plates (the near row in front,
   the far row offset behind it and darker; they grow toward the hips and have
   a lighter centre), a small sweet head carried low on a short neck — ONE
   glossy eye under a soft brow, a blush, a cream chin — four sturdy legs
   (hind legs longer than the front) on chunky round feet with cream claws,
   and a tail held out with four cream spikes at its end.

   Legs: three bones placed by IK (kit.js) on planted feet. WALK = a steady
   four-beat plod (lateral sequence), the plates rocking a little with every
   step. L.run = a rolling trot (diagonal pairs, the back rocking).
   pose 0..1 = PROUD WAG: the spiked tail lifts and swings high, the plates
   flush brighter one after another in a wave from the neck to the tail, the
   head lifts with a happy closed eye and an open-mouth call (a real gap —
   pink tongue, dark only at the throat) with sound rings.

   API — window.StegoRig { draw(ctx, L, t), mouth(L[, t]), HEIGHT, WIDTH, STRIDE,
         RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   HEIGHT = ground → the top of the tallest plate; WIDTH = half the span from
   the tail spikes to the snout at rest. The wag reaches past both: the lifted
   tail's spikes top out about 201 units up, and the sound rings fan out to
   about 195 in front (the body itself stays inside WIDTH).
   mouth(L) → { x, y } in the caller's space: between the lips, same pose
   maths as draw (t defaults to the last draw's).
   No clips but one (the body's cream underside and spots), no blur, no
   offscreen work; all plates share two gradients made in unit space.
   Depends only on ../savanna_rigs/kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, blob, bez, bezT, step, leg, xf,
          eye, blink, brow, rings } = window.SavKit;
  const PI = Math.PI;
  // mix two of the palette's 'rgb(r,g,b)' strings (only run once per cached palette)
  const mix = (a, b, k) => {
    const p = a.match(/\d+/g), q = b.match(/\d+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  };

  // ── coats: hide (body*), cream underside, far-side limbs, soft spots, the
  //    plates (near row plate*, their light centre plateC, far row plateF*)
  const SHARED = { eyeW: '#FFFBF0', pupil: '#1B1320', mouth: '#6A2238', tongue: '#F58A9A', cheek: '#FF8E9E',
                   claw: '#FFF4D6', clawF: '#CDBF9A', spike: '#FFF6DA', spikeD: '#EBCF98', spikeF: '#EAD8AE', spikeFD: '#D0B688' };
  const mk = o => Object.assign({}, SHARED, o);
  const PALS = {
    mint:   mk({ body: '#86D9B8', bodyL: '#B6F0D6', bodyD: '#5CBB9B', belly: '#FFF6D8', bellyD: '#F1E0B0', far: '#4C9F86', spot: '#44A98C',
                 plate: '#FF9478', plateL: '#FFB79A', plateD: '#EE6E68', plateC: '#FFD6B4', plateF: '#D9665F', plateFD: '#B94F58',
                 iris: '#2F8F74', line: '#2A5248' }),
    lilac:  mk({ body: '#C4AAF1', bodyL: '#E3D4FF', bodyD: '#9D82D5', belly: '#FFF4E0', bellyD: '#F0DCC0', far: '#8468BC', spot: '#9475D6',
                 plate: '#FFD466', plateL: '#FFE690', plateD: '#F4AE48', plateC: '#FFF3B8', plateF: '#DCA046', plateFD: '#BC7E3C',
                 iris: '#6A49C4', line: '#3F2D66' }),
    peach:  mk({ body: '#FFB48C', bodyL: '#FFD8BC', bodyD: '#F08E6C', belly: '#FFF6DC', bellyD: '#F4DDB8', far: '#D2765C', spot: '#EC8660',
                 plate: '#56CABF', plateL: '#86E2D4', plateD: '#30A4A6', plateC: '#B4F2E4', plateF: '#2C8E94', plateFD: '#24747E',
                 iris: '#B5562E', line: '#6A3424' }),
    sky:    mk({ body: '#8ECAF6', bodyL: '#C2E6FF', bodyD: '#64A4E0', belly: '#FFF7E2', bellyD: '#EEDFC0', far: '#4F88C4', spot: '#5A9CE0',
                 plate: '#FF90B8', plateL: '#FFB2CE', plateD: '#EE6699', plateC: '#FFD2E2', plateF: '#D05888', plateFD: '#AE4676',
                 iris: '#2F6FC0', line: '#27406A' }),
    butter: mk({ body: '#FBDD7C', bodyL: '#FFF1B4', bodyD: '#EDB952', belly: '#FFFBEA', bellyD: '#F2E2B8', far: '#CF9C44', spot: '#E8AC44',
                 plate: '#B27CE2', plateL: '#CC9EF0', plateD: '#8C54C6', plateC: '#E2C4FA', plateF: '#7848AC', plateFD: '#5E3890',
                 iris: '#A8641E', line: '#6A4718' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['body', 'bodyL', 'bodyD', 'far', 'spot'];

  // off[] = near hind, near front, far hind, far front. WALK: a lateral
  // sequence (each hind foot is followed by the front foot of its side);
  // TROT: diagonal pairs
  const WALK = { stride: 84,  duty: 0.70, lift: 10, off: [0, 0.75, 0.5, 0.25], bob: 1.6, fsw: 0.5, hsw: 0.4 };
  const TROT = { stride: 128, duty: 0.52, lift: 17, off: [0, 0.5, 0.5, 0],     bob: 3.2, fsw: 0.8, hsw: 0.65 };

  const OX = 15;                                          // the art sits forward of the origin so the long tail fits the half-width
  const BK = 5.5;                                         // the body blob's tension
  const BODY = [[72, -76], [66, -100], [44, -121], [14, -135], [-18, -139], [-48, -132], [-70, -114], [-78, -92],
                [-68, -70], [-36, -52], [6, -46], [44, -50], [66, -60]];
  const BELLY = [[80, -84], [52, -67], [10, -61], [-34, -65], [-64, -78], [-86, -90], [-84, -40], [0, -30], [84, -40]];
  const SPOTS = [[30, -112, 7, 4.6, -0.3], [3, -121, 8, 5, 0], [-28, -123, 7.5, 5, 0.2], [-54, -109, 6.5, 4.4, 0.5],
                 [16, -101, 5, 3.4, 0], [-11, -105, 5.6, 3.6, 0], [-40, -114, 4.8, 3.2, 0.2], [48, -99, 4.6, 3, -0.4],
                 [3, -85, 5, 3.3, 0], [21, -79, 3.8, 2.6, -0.2]];   // (kept clear of the hip and the shoulder, which the legs cover)
  const TOP = -139, CY = -92, SH = [48, -74], HP = [-40, -84], FREST = 52, HREST = -44, FAR = 11;
  const FL = [25, 24, 14], HL = [31, 28, 16], FW = [33, 30, 27, 24], HW = [40, 36, 30, 24], FR = 12;
  const CLAWS = [1.42, 0.84, 0.26];
  // neck and tail: cubic control points at rest and in the proud wag
  const NECK = [[56, -86], [76, -86], [91, -78], [102, -69]], NECK_UP = [[56, -88], [75, -96], [86, -105], [95, -113]];
  const NW0 = 40, NW1 = 24;
  const TAIL = [[-60, -96], [-96, -99], [-132, -86], [-166, -96]], TW0 = 48, TW1 = 10;
  const TSPOTS = [[0.3, 13, 4.6, 3], [0.47, 10.5, 3.6, 2.4], [0.62, 8, 2.8, 1.9]];   // [place along the tail, depth below its top, rx, ry]
  const TBEND = [0, 0.35, 0.8, 1.1];                      // how much of the wag's lift each tail point takes: it curls up toward the tip
  const HEADX = 8, HEADY = -3, HS = 1.3;                 // the skull centre, from the neck's end; the head's scale
  const SKULL = [[-15, 3], [-15, -8], [-7, -15], [6, -15.5], [16.5, -11.4], [23.5, -6.4], [27.6, 0], [27.4, 6.4], [21.6, 9.5], [9, 10.5], [-5, 10]];
  const JAW = [[-7, 6], [6, 8.2], [17, 8], [24.4, 7.2], [26.4, 8.8], [23.4, 11.8], [12, 13.6], [-4, 12.6]];
  const MOUTH = [24.4, 8.2];                              // between the lips, at the front
  const HX = -3, HY = 7;                                  // the jaw hinge

  // ── the plates: [host, a, b, width, height, wave]. host 0 = the neck (a =
  //    place along it), 1 = the back (a = BODY segment, b = place on it),
  //    2 = the tail. wave = its turn in the neck-to-tail flush.
  const NEAR = [[0, 0.5, 0, 13, 14, 0], [1, 1, 0.45, 20, 23, 1], [1, 2, 0.5, 27, 32, 2], [1, 3, 0.5, 34, 42, 3],
                [1, 4, 0.5, 37, 47, 4], [1, 5, 0.55, 32, 39, 5], [2, 0.22, 0, 24, 27, 6], [2, 0.4, 0, 18, 20, 7], [2, 0.57, 0, 13, 14, 8]];
  const FARP = [[0, 0.2, 0, 15, 17, 0.5], [1, 2, 0, 23, 27, 1.5], [1, 3, 0, 28, 34, 2.5],
                [1, 4, 0, 33, 43, 3.5], [1, 5, 0.05, 30, 38, 4.5], [1, 6, 0, 25, 30, 5.5], [2, 0.31, 0, 20, 23, 6.5],
                [2, 0.49, 0, 15, 16, 7.5], [2, 0.65, 0, 10, 10, 8.5]];
  // seat the back's plates on the body blob's top edge, once: a, b become x, y and [6] the lean
  for (const pl of NEAR.concat(FARP)){
    if (pl[0] !== 1) continue;
    const n = BODY.length, sg = pl[1], p0 = BODY[(sg + n - 1) % n], p1 = BODY[sg], p2 = BODY[(sg + 1) % n], p3 = BODY[(sg + 2) % n];
    const Q = [p1, [p1[0] + (p2[0] - p0[0]) / BK, p1[1] + (p2[1] - p0[1]) / BK], [p2[0] - (p3[0] - p1[0]) / BK, p2[1] - (p3[1] - p1[1]) / BK], p2];
    const p = bez(Q, pl[2]), d = bezT(Q, pl[2]);
    pl[1] = p[0]; pl[2] = p[1]; pl[6] = (Math.atan2(d[1], d[0]) - PI + TAU * 1.5) % TAU - PI;
  }

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
  // a place on a tube's top edge → SHARED [x, y, heading]; sg = the top's side of the normal
  const AT = [0, 0, 0];
  function tubeAt(A, u, sg, sink){
    const f = clamp01(u) * NS, i = Math.min(NS - 1, f | 0), k = f - i;
    const nx = lerp(A.nx[i], A.nx[i + 1], k), ny = lerp(A.ny[i], A.ny[i + 1], k), w = lerp(A.w[i], A.w[i + 1], k) - sink;
    AT[0] = lerp(A.x[i], A.x[i + 1], k) + sg * nx * w; AT[1] = lerp(A.y[i], A.y[i + 1], k) + sg * ny * w;
    AT[2] = Math.atan2(sg * nx, -sg * ny);                // the rotation that stands a plate on the edge
    return AT;
  }

  // ── a kite-shaped plate in UNIT space (stands on the origin, 1 wide, 1 tall,
  //    pointing up): a narrow foot, soft shoulders below the middle, a soft point
  function kite(g){
    g.beginPath();
    g.moveTo(-0.2, 0.06);
    g.bezierCurveTo(-0.3, -0.12, -0.57, -0.29, -0.5, -0.46);
    g.bezierCurveTo(-0.44, -0.64, -0.17, -0.91, -0.05, -0.983);
    g.quadraticCurveTo(0, -1.012, 0.05, -0.983);
    g.bezierCurveTo(0.17, -0.91, 0.44, -0.64, 0.5, -0.46);
    g.bezierCurveTo(0.57, -0.29, 0.3, -0.12, 0.2, 0.06);
    g.closePath();
  }
  // one plate standing on (x, y), leaning by rot; glow 0..1 = the flush
  let haloG = null;                                       // the halo's gradient (unit space), made by draw() while the wag plays
  function plate(g, C, x, y, w, h, rot, glow, fill, far){
    const k = 1 + 0.1 * glow;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(w * k, h * k);
    if (glow > 0.02 && !far){                             // a soft halo behind a flushing plate
      g.fillStyle = haloG; g.globalAlpha = glow;
      g.beginPath(); g.arc(0, -0.5, 0.95, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
    g.fillStyle = fill; kite(g); g.fill();
    g.translate(0, -0.45); g.scale(0.5, 0.54); g.translate(0, 0.47);
    g.fillStyle = far ? C.x.farC : C.plateC; kite(g); g.fill();          // the lighter centre
    if (glow > 0.02){
      g.fillStyle = C.x.flush; g.globalAlpha = glow * (far ? 0.4 : 0.62);
      g.translate(0, -0.47); g.scale(2, 1 / 0.54); g.translate(0, 0.45); kite(g); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }
  // a cream tail spike in UNIT space (stands on the origin, pointing up)
  function spike(g, x, y, w, len, rot, fill){
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(w, len);
    g.beginPath(); g.moveTo(-0.5, 0.1); g.quadraticCurveTo(-0.36, -0.5, -0.07, -0.965);
    g.quadraticCurveTo(0, -1.03, 0.07, -0.965); g.quadraticCurveTo(0.36, -0.5, 0.5, 0.1); g.closePath();
    g.fillStyle = fill; g.fill();
    g.restore();
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

  // ── the pose, solved once per draw (and by mouth()): a SHARED scratch
  const S = { NP: [[0, 0], [0, 0], [0, 0], [0, 0]], TP: [[0, 0], [0, 0], [0, 0], [0, 0]] };
  let lastT = 0;
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = S.G = L.run ? TROT : WALK, run = S.run = L.run ? go : 0;
    const cyc = S.cyc = (L.wt || 0) / TAU, p = S.p = clamp01(L.pose || 0);
    // the wag: eased in and out; beat = three swings of the tail / three calls
    const K = S.K = p > 0 ? smooth(clamp01(p / 0.2)) * smooth(clamp01((1 - p) / 0.22)) : 0;
    const beat = Math.sin(p * TAU * 3);
    S.wave = p > 0.1 && p < 0.9 ? frac((p - 0.1) / 0.4) * 12.6 - 2 : -9;   // the flush runs neck → tail, twice
    S.drop = go * G.bob * Math.sin(2 * TAU * cyc + 0.6) - 2 * K * Math.abs(beat);
    S.pitch = go * (L.run ? 0.03 * Math.sin(2 * TAU * cyc + 2.4) : 0.012 * Math.sin(TAU * cyc + 1)) - 0.035 * K;
    S.breathe = 1 + Math.sin(t * 1.1 + ph) * 0.009;
    // neck: rest ↔ lifted; it nods with the steps and drifts when standing
    const nod = go * Math.sin(2 * TAU * cyc + 1.2) * (1 + run) + Math.sin(t * 0.6 + ph) * 0.8 * (1 - K);
    const NP = S.NP;
    for (let i = 0; i < 4; i++){
      NP[i][0] = lerp(NECK[i][0], NECK_UP[i][0], K);
      NP[i][1] = lerp(NECK[i][1], NECK_UP[i][1], K) + nod * i * 0.7;
    }
    S.hx = NP[3][0] + HEADX; S.hy = NP[3][1] + HEADY;
    S.hrot = 0.12 + nod * 0.02 - 0.62 * K + 0.07 * K * beat;
    S.jaw = 0.74 * K * (0.78 + 0.22 * beat);
    // tail: sways at rest and with the steps; in the wag it lifts and swings
    // from the root, the tip whipping a little late
    const sway = Math.sin(t * 1.3 + ph) * 3.2 * (1 - K) + go * Math.sin(2 * TAU * cyc + 0.3) * (2.4 + 2 * run);
    const ang = K * (0.5 + 0.13 * beat), late = K * 0.09 * Math.sin(p * TAU * 3 - 0.9);
    const TP = S.TP, rx = TAIL[0][0], ry = TAIL[0][1];
    TP[0][0] = rx; TP[0][1] = ry;
    for (let i = 1; i < 4; i++){
      const a = ang * TBEND[i] + late * (i - 1), c = Math.cos(a), s = Math.sin(a);
      const x = TAIL[i][0] - rx, y = TAIL[i][1] - ry + sway * (i - 1) * 0.5;
      TP[i][0] = rx + x * c - y * s; TP[i][1] = ry + x * s + y * c;
    }
    // the mouth (between the jaws, at the front), in unit space
    const j = S.jaw * 0.5, mx0 = MOUTH[0] - HX, my0 = MOUTH[1] - HY;
    const mx = HX + mx0 * Math.cos(j) - my0 * Math.sin(j), my = HY + mx0 * Math.sin(j) + my0 * Math.cos(j);
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    const r = xf(S.hx + (mx * c - my * s) * HS, S.hy + (mx * s + my * c) * HS, 0, CY, S.pitch, OX, S.drop);
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
    C.x = { rim: mix(C.bodyL, warm, 0.6), headL: mix(C.bodyL, C.body, 0.35), spot: alpha(C.spot, 0.5),
            farC: mix(C.plateF, C.plateC, 0.38), flush: mix(C.plateC, warm, 0.6),
            halo1: alpha(mix(C.plateC, warm, 0.5), 0.6), halo0: alpha(mix(C.plateC, warm, 0.5), 0),
            cheek: alpha(C.cheek, 0.72), smile: alpha(C.line, 0.62), brow: alpha(C.line, 0.6), nostril: alpha(C.line, 0.5) };
  }

  // ── the head, in head space: skull centre (0,0), snout toward +x
  function drawHead(g, C, t){
    const ph = S.ph, K = S.K, jaw = S.jaw;
    if (jaw > 0.02){                                      // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), d = 13;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2, HY - 2); g.lineTo(HX + d, HY + 2.8);
      g.lineTo(HX + d * c - 1.6 * s, HY + d * s + 1.6 * c); g.lineTo(HX - 2, HY + 4); g.closePath(); g.fill();
    }
    const chinG = lg(g, 0, 6, 0, 14, [[0, C.belly], [1, C.bellyD]]);
    g.fillStyle = chinG;                                  // the cream throat, over the neck's end
    g.beginPath(); g.ellipse(-8.5, 6.4, 8.5, 5.6, 0.25, 0, TAU); g.fill();
    g.save();                                             // the cream lower jaw on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    g.fillStyle = chinG; blob(g, JAW, 5); g.fill();
    if (jaw > 0.05){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(13.4, 8.7, 7.4, 0.8 + 2.6 * jaw, 0, 0, TAU); g.fill(); }
    g.restore();
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = C.x.rim; g.translate(0, -1.3); skull(); g.fill(); g.translate(0, 1.3);   // the light rim: the same shape, a hair higher
    g.fillStyle = lg(g, 0, -15, 0, 11, [[0, C.x.headL], [0.5, C.body], [1, C.bodyD]]);
    skull(); g.fill();
    g.fillStyle = C.x.cheek;                              // the blush
    g.beginPath(); g.ellipse(13.2, 3.5, 4.7, 3, 0.05, 0, TAU); g.fill();
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(23.4, -2.4, 1.5, 1, -0.6, 0, TAU); g.fill();
    g.strokeStyle = C.x.smile; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath();                                        // the smile, with a dimple
    if (jaw < 0.06){ g.moveTo(26.2, 7.6); g.quadraticCurveTo(19, 10.8, 10.6, 9.4); }
    g.moveTo(10.9, 7.6); g.quadraticCurveTo(9.2, 9, 10.5, 10.7);
    g.stroke();
    // ONE eye; in the wag it squeezes shut into a happy arc
    const ex = 4.4, ey = -4.2, rx = 5.6, ry = 6.3;
    if (K > 0.5){
      g.strokeStyle = C.line; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(ex - rx, ey + 1.8); g.quadraticCurveTo(ex, ey - ry * 1.05, ex + rx, ey + 1.8); g.stroke();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 1.6 * K);
      eye(g, ex, ey, rx, ry, eyeH, 0.3 + Math.sin(t * 0.3 + ph) * 0.35, C, { iris: 0.84, lid: 1.3 });
    }
    brow(g, C.x.brow, -1, -12.8 - K, 4.6, -15.4 - 1.6 * K, 10, -12.8 - 0.6 * K, 1.3);
  }

  function draw(ctx, L, t){
    lastT = t;
    const C = palette(PALS[L.coat] || PALS[COATS[0]], TINTED, L.tint, L.lit);
    if (!C.x) derive(C, L.lit);
    solve(L, t);
    const go = S.go, G = S.G, cyc = S.cyc, K = S.K, ph = S.ph;
    spine(NK, S.NP, NW0, NW1, 1); spine(TL, S.TP, TW0, TW1, 0.8);
    // the plates rock with each step, sway a hair at rest, shimmy in the wag
    const rockA = go * (0.07 + 0.04 * S.run), rockP = 2 * TAU * cyc, shimP = S.p * TAU * 6;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(OX, 0);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.bodyL], [0.42, C.body], [1, C.bodyD]]);
    const nearG = lg(ctx, 0, -1, 0, 0, [[0, C.plateL], [0.5, C.plate], [1, C.plateD]]);   // unit space: shared by every plate
    const farG = lg(ctx, 0, -1, 0, 0, [[0, C.plateF], [1, C.plateFD]]);
    const spikeG = lg(ctx, 0, -1, 0, 0, [[0, C.spike], [0.6, C.spike], [1, C.spikeD]]);
    const spikeFG = lg(ctx, 0, -1, 0, 0, [[0, C.spikeF], [1, C.spikeFD]]);
    haloG = K > 0 ? rg(ctx, 0, -0.5, 0.1, 0.95, [[0, C.x.halo1], [1, C.x.halo0]]) : null;

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = st.x * G.stride * go, lift = st.lift * G.lift * go * (hind ? 0.85 : 1);
      const swing = st.sw ? Math.sin(PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR * 0.7 : 0), root[1], 0, CY, S.pitch, reach * (hind ? 0.15 : 0.25), S.drop);
      const fold = (hind ? -0.14 : 0.05) - reach / (hind ? 150 : 120) + swing * (hind ? G.hsw : G.fsw);
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
    // one row's plates on one host (0 neck, 1 back, 2 tail)
    function plates(list, host, far, fill){
      for (let i = 0; i < list.length; i++){
        const pl = list[i]; if (pl[0] !== host) continue;
        let x, y, rot;
        if (host === 1){ x = pl[1]; y = pl[2] + 3; rot = pl[6] * 0.7; }
        else { const A = tubeAt(host ? TL : NK, pl[1], host ? -1 : 1, 2.5); x = A[0]; y = A[1]; rot = A[2]; }
        const wv = pl[5], d = wv - S.wave, glow = K > 0 && d > -1.8 && d < 1.8 ? K * (1 - d * d / 3.24) : 0;
        rot += rockA * Math.sin(rockP - wv * 0.8) + 0.012 * Math.sin(t * 1.1 + ph + wv * 0.6) + 0.05 * K * Math.sin(shimP - wv);
        plate(ctx, C, x + (far ? 4 : 0), y - (far ? 1 : 0), pl[3], pl[4], rot, glow, fill, far);
      }
    }
    // the four tail spikes fan out behind the tail's end: the far pair, then the near pair
    function spikes(far){
      for (let i = far ? 0 : 1; i < 4; i += 2){
        const A = tubeAt(TL, 0.77 + i * 0.065, -1, 5);
        spike(ctx, A[0], A[1], far ? 11 : 12, far ? 27 : 31, A[2] + 0.2 - i * 0.3, far ? spikeFG : spikeG);
      }
    }
    const bodyFrame = () => { ctx.translate(0, S.drop); ctx.translate(0, CY); ctx.rotate(S.pitch); ctx.translate(0, -CY); };

    oneLeg(2); oneLeg(3);

    ctx.save(); bodyFrame();
    ctx.translate(0, CY); ctx.scale(1, S.breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, BK);
    // ── the far row on the back and the body's light rim (the same shape a
    //    hair higher) — both go under the tail and the neck
    plates(FARP, 1, true, farG);
    ctx.fillStyle = C.x.rim; ctx.translate(0, -2); body(); ctx.fill(); ctx.translate(0, 2);
    // ── the tail: its far plates and the four spikes behind it, near plates on it
    plates(FARP, 2, true, farG); spikes(true); spikes(false);
    ctx.fillStyle = C.x.rim; tubePath(ctx, TL, -1.6); ctx.fill();
    ctx.fillStyle = coatG; tubePath(ctx, TL, 0); ctx.fill();
    ctx.fillStyle = C.belly; tubeUnder(ctx, TL, 1, 0.3, 1); ctx.fill();
    ctx.fillStyle = C.x.spot; ctx.beginPath();           // soft spots along the tail's top
    for (const q of TSPOTS){
      const A = tubeAt(TL, q[0], -1, q[1]), c = Math.cos(A[2]) * q[2], s = Math.sin(A[2]) * q[2];
      ctx.moveTo(A[0] + c, A[1] + s); ctx.ellipse(A[0], A[1], q[2], q[3], A[2], 0, TAU);
    }
    ctx.fill();
    plates(NEAR, 2, false, nearG);
    // ── the neck (it leaves from under the shoulder, so before the body)
    plates(FARP, 0, true, farG);
    ctx.fillStyle = C.x.rim; tubePath(ctx, NK, -1.6); ctx.fill();
    ctx.fillStyle = coatG; tubePath(ctx, NK, 0); ctx.fill();
    ctx.fillStyle = C.belly; tubeUnder(ctx, NK, -1, 0.3, 0.3); ctx.fill();
    plates(NEAR, 0, false, nearG);
    // ── the body: cream underside, soft spots; then the near row
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -84, 0, -44, [[0, C.belly], [1, C.bellyD]]);
    blob(ctx, BELLY, 5.5); ctx.fill();
    ctx.fillStyle = C.x.spot; ctx.beginPath();
    for (const sp of SPOTS){ ctx.moveTo(sp[0] + sp[2] * Math.cos(sp[4]), sp[1] + sp[2] * Math.sin(sp[4])); ctx.ellipse(sp[0], sp[1], sp[2], sp[3], sp[4], 0, TAU); }
    ctx.fill();
    ctx.restore();
    plates(NEAR, 1, false, nearG);
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── the head, and the call's sound rings
    ctx.save(); bodyFrame();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot); ctx.scale(HS, HS);
    drawHead(ctx, C, t);
    if (S.p > 0.17 && S.p < 0.86) rings(ctx, 29, 9, 0.02 + 0.96 * frac((S.p - 0.17) * 3), C.line, 0.6, 0.8);
    ctx.restore();
    ctx.restore();
  }

  window.StegoRig = { draw, mouth, HEIGHT: 180, WIDTH: 162, STRIDE: WALK.stride, RUN_STRIDE: TROT.stride, ACT_SECONDS: 2.6,
                      WALK_CPS: 0.62, RUN_CPS: 1.2, COATS };
})();
