/* ── bronto.js — the BRONTOSAURUS, drawn from scratch (2026-11) ─────────────
   The gentle giant of the volcano valley, in true profile: a great round
   boulder of a body on four pillar legs (chunky round feet, three cream claws
   each), a long thick tail tapering to a point that swings slowly, and a long
   neck rising in a soft S to a small sweet head — ONE big glossy eye under a
   soft brow, a blush, a little smile, a cream chin. Neck, body and tail are
   ONE silhouette with one cream underside running from the chin to the tail
   tip; soft darker spots along the back; a warm rim light on the top edge.

   Legs: three bones placed by IK (kit.js) on PLANTED feet. WALK = a slow heavy
   amble (lateral sequence, never fewer than two feet down), the neck swaying
   fore and aft. L.run = a heavy JOG — diagonal pairs, no flight phase — with
   the neck stretched forward and the tail lifted.
   pose 0..1 = MUNCH AND CALL: the head reaches up high and plucks a sprig of
   leaves, munches it (cheek working, the sprig shrinking, a leaf or two
   falling), then gives a deep happy call — the jaw drops (a real gap, pink
   tongue), big sound rings roll out, the eye closes in a smile, the tail sways.

   API — window.BrontoRig { draw(ctx, L, t), mouth(L[, t]), HEIGHT, WIDTH, STRIDE,
         RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   HEIGHT = ground → top of the head with the neck held up; WIDTH = half the
   tail-tip-to-nose span at rest. Beyond that box: the walk sways the head about
   13 units past WIDTH; the jog stretches it about 45 past WIDTH in front (and
   25 lower); the act lifts the head about 75 above HEIGHT, and the call's sound
   rings reach about 107 above HEIGHT and 45 past WIDTH in front.
   Depends only on ../savanna_rigs/kit.js (SavKit). */
(function(){
  const { TAU, clamp01, smooth, frac, lg, rg, alpha, palette, blob, limbPath, step, leg, xf,
          eye, blink, brow, rings } = window.SavKit;
  const PI = Math.PI;
  // mix two of the palette's 'rgb(r,g,b)' strings (only run once per cached palette)
  const mix = (a, b, k) => {
    const p = a.match(/\d+/g), q = b.match(/\d+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  };

  // ── coats: each a full palette. spot = the markings, claw / clawF = near / far claws
  const COMMON = { eyeW: '#FFFDF6', pupil: '#1B1420', mouth: '#6A2238', tongue: '#FF8FA0', tooth: '#FFF8E6',
                   leaf: '#7CCB5E', leafD: '#4FA548', twig: '#8E6B3E' };
  const mk = o => Object.assign({}, COMMON, o);
  const PALS = {
    sky:    mk({ coat: '#7FC4EE', coatL: '#B6E2FA', coatD: '#5AA3DA', belly: '#FFF3D2', bellyD: '#F0D8A6', far: '#4F90C6',
                 spot: '#3F86CC', claw: '#FFF6DE', clawF: '#C6CCD2', iris: '#3A6FBC', line: '#2A3D68', cheek: '#FF8FB8' }),
    mint:   mk({ coat: '#86DCB2', coatL: '#BEF3D6', coatD: '#5ABE92', belly: '#FFF6D8', bellyD: '#ECDDA6', far: '#4CA884',
                 spot: '#36A27C', claw: '#FFF6DE', clawF: '#C4CFC6', iris: '#2C8E72', line: '#224E44', cheek: '#FF9A98' }),
    lilac:  mk({ coat: '#BCA6EE', coatL: '#DED2FB', coatD: '#977CD8', belly: '#FFF1E2', bellyD: '#EED4C4', far: '#866AC4',
                 spot: '#7C5ECC', claw: '#FFF6E6', clawF: '#CBC4D6', iris: '#6A49C4', line: '#3A2A68', cheek: '#FF86B6' }),
    peach:  mk({ coat: '#FFB28A', coatL: '#FFD8BC', coatD: '#F08C66', belly: '#FFF6DC', bellyD: '#F2DDAE', far: '#DA7C5A',
                 spot: '#E86C52', claw: '#FFF8E8', clawF: '#D6C6BC', iris: '#B0562A', line: '#6A3026', cheek: '#FF6F74' }),
    butter: mk({ coat: '#FFDC72', coatL: '#FFF0AE', coatD: '#F2BC48', belly: '#FFFBEA', bellyD: '#F4E6BC', far: '#DAA63E',
                 spot: '#F09A3A', claw: '#FFFDF2', clawF: '#D8CEB4', iris: '#B8741E', line: '#6E4A1C', cheek: '#FF8E72' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'belly', 'bellyD', 'far', 'spot'];

  // off[] = near hind, near front, far hind, far front. WALK = a lateral
  // sequence (each hind foot is followed by the front foot of its side);
  // RUN = a jog on diagonal pairs whose stances overlap — never airborne.
  const WALK = { stride: 128, duty: 0.72, lift: 13, off: [0, 0.75, 0.5, 0.25], bob: 2.0, sink: 0, fsw: 0.42, hsw: 0.38 };
  const RUN  = { stride: 186, duty: 0.58, lift: 21, off: [0, 0.54, 0.5, 0.04], bob: 4.2, sink: 3, fsw: 0.8, hsw: 0.62 };

  const OX = 4;                                           // the art's centre line (tail tip ↔ nose)
  // the body, CLOCKWISE on screen (rump → back → chest → belly) like the tubes, so the union never punches holes
  const BODY = [[-98, -140], [-80, -180], [-42, -207], [8, -214], [58, -202], [90, -168], [100, -128],
                [88, -90], [62, -63], [14, -48], [-34, -49], [-78, -70], [-97, -106]];
  const CY = -138, SH = [50, -116], HP = [-60, -118], FREST = 52, HREST = -66, FAR = 17, FR = 22;
  const FL = [32, 42, 21], HL = [36, 40.4, 21], FW = [58, 49, 43, 43], HW = [66, 53, 45, 44];
  const HS = 2.25, HX = -3, HY = 6;                      // head scale; the jaw hinge (head space)
  const SKULL = [[-15.5, -1], [-14, -9], [-7, -14.6], [3, -15.4], [11.5, -12.8], [17, -8.8], [21.6, -6.8], [25.6, -3.8], [26.8, 0.8], [24.6, 5], [16, 6.3], [6, 6.2], [-4, 7.6], [-12.5, 6]];
  const JAW = [[-9, 4.6], [2, 5], [12, 5.2], [19.6, 4.6], [22.4, 6.8], [19, 10.8], [8, 12.8], [-5, 12.2]];
  const MOUTH = [23.5, 6];                                  // where sounds and leaves come from (head space)
  // neck and tail: cubic spines in the body's frame. NECK_* = at rest / reaching up (the pose) / stretched (the jog)
  const NECK_REST = [[30, -165], [104, -180], [116, -262], [174, -276]];
  const NECK_UP   = [[30, -165], [108, -186], [100, -298], [146, -338]];
  const NECK_RUN  = [[30, -165], [120, -172], [148, -250], [208, -250]];
  const TAIL_REST = [[-33, -167], [-112, -150], [-170, -52], [-230, -72]];
  const TAIL_UP   = [[-33, -167], [-112, -160], [-176, -122], [-234, -146]];
  const NW0 = 86, NW1 = 32, NPW = 0.6, TW0 = 80, TW1 = 4.5, TPW = 1.25, UNDER = 0.22;   // UNDER: where the cream starts (share of the half-width below the spine)
  const SPOTS = [[-50, -188, 13, 8, 0.25], [-10, -197, 11, 7, 0], [30, -193, 9.5, 6, -0.2], [-84, -164, 9.5, 6, 0.6],
                 [-30, -177, 6, 4, 0], [8, -179, 5.6, 3.8, 0], [52, -178, 6.5, 4.4, -0.3], [-62, -166, 5, 3.4, 0.4]];
  const CLAWS = [22.5, 12.5, 2.5], WRINKLES = [-4, 3];

  // ── a tube (neck, tail) sampled along its spine into typed scratch arrays:
  //    x, y, the unit normal toward the BACK (top) side, the half-width
  function mkTube(n){
    return { n, x: new Float32Array(n + 1), y: new Float32Array(n + 1), nx: new Float32Array(n + 1), ny: new Float32Array(n + 1), w: new Float32Array(n + 1) };
  }
  // P0..P3 are passed in the order that travels toward +x (so the normal is the top side)
  function sample(T, a, b, c, d, w0, w1, pw){
    const n = T.n;
    for (let i = 0; i <= n; i++){
      const u = i / n, m = 1 - u, k0 = m * m * m, k1 = 3 * m * m * u, k2 = 3 * m * u * u, k3 = u * u * u;
      const tx = 3 * m * m * (b[0] - a[0]) + 6 * m * u * (c[0] - b[0]) + 3 * u * u * (d[0] - c[0]);
      const ty = 3 * m * m * (b[1] - a[1]) + 6 * m * u * (c[1] - b[1]) + 3 * u * u * (d[1] - c[1]);
      const l = Math.hypot(tx, ty) || 1;
      T.x[i] = k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0]; T.y[i] = k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1];
      T.nx[i] = ty / l; T.ny[i] = -tx / l;
      T.w[i] = (w0 + (w1 - w0) * Math.pow(u, pw)) / 2;
    }
  }
  // add the tube's outline to the current path (clockwise, round ends). grow = extra on the top side (the rim light)
  function tubePath(g, T, grow){
    const n = T.n; grow = grow || 0;
    g.moveTo(T.x[0] + T.nx[0] * (T.w[0] + grow), T.y[0] + T.ny[0] * (T.w[0] + grow));
    for (let i = 1; i <= n; i++) g.lineTo(T.x[i] + T.nx[i] * (T.w[i] + grow), T.y[i] + T.ny[i] * (T.w[i] + grow));
    for (let i = n; i >= 0; i--) g.lineTo(T.x[i] - T.nx[i] * T.w[i], T.y[i] - T.ny[i] * T.w[i]);
    g.closePath();
    for (let i = 0; i <= n; i += n){                      // the caps lean to the top side by `grow` too (no ring round a tip)
      const cx = T.x[i] + T.nx[i] * grow, cy = T.y[i] + T.ny[i] * grow;
      g.moveTo(cx + T.w[i], cy); g.arc(cx, cy, T.w[i], 0, TAU);
    }
  }
  // add a closed Catmull-Rom blob to the current path; y squashed by sy about cy (breathing), shifted by dy
  function blobPath(g, pts, k, cy, sy, dy){
    const n = pts.length;
    g.moveTo(pts[0][0], cy + (pts[0][1] - cy) * sy + dy);
    for (let i = 0; i < n; i++){
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / k, cy + (p1[1] + (p2[1] - p0[1]) / k - cy) * sy + dy,
                      p2[0] - (p3[0] - p1[0]) / k, cy + (p2[1] - (p3[1] - p1[1]) / k - cy) * sy + dy,
                      p2[0], cy + (p2[1] - cy) * sy + dy);
    }
    g.closePath();
  }
  const NT = mkTube(24), TT = mkTube(22);

  // ── the pose, solved once per draw (and by mouth()): a SHARED scratch
  const S = { NP: [[0, 0], [0, 0], [0, 0], [0, 0]], TP: [[0, 0], [0, 0], [0, 0], [0, 0]] };
  let lastT = 0;
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = S.G = L.run ? RUN : WALK, cyc = S.cyc = (L.wt || 0) / TAU, run = S.run = L.run ? go : 0;
    const p = S.p = clamp01(L.pose || 0);
    // the act: reach up 0–.13 · munch .13–.56 · call .60–.93 · settle
    const up = S.up = p > 0 ? smooth(clamp01(p / 0.13)) * smooth(clamp01((1 - p) / 0.1)) : 0;
    const chew = S.chew = p > 0 ? smooth(clamp01((p - 0.13) / 0.04)) * smooth(clamp01((0.56 - p) / 0.04)) : 0;
    const call = S.call = p > 0 ? smooth(clamp01((p - 0.6) / 0.06)) * smooth(clamp01((0.93 - p) / 0.07)) : 0;
    const bite = S.bite = chew * (0.5 - 0.5 * Math.cos((p - 0.13) * 13 * TAU));       // one hump per chew
    S.jaw = 0.17 * bite + call * (0.5 + 0.035 * Math.sin(p * TAU * 24));
    S.drop = go * (G.bob * Math.sin(2 * TAU * cyc + 0.6) + G.sink) + 1.5 * call;
    S.pitch = go * 0.012 * Math.sin(TAU * cyc + 1) - 0.03 * up - 0.015 * call;
    // the neck: rest ↔ up ↔ stretched, swaying fore and aft with every step (and lazily when it stands)
    const kr = S.kr = run * (1 - up);
    const sway = go * Math.sin(2 * TAU * cyc + 1.2) * (L.run ? 0.75 : 1) * (1 - up)
               + Math.sin(t * 0.5 + ph * 1.7) * 0.45 * (1 - go) * (1 - 0.7 * up);
    const NP = S.NP;
    for (let i = 0; i < 4; i++){
      NP[i][0] = NECK_REST[i][0] + (NECK_UP[i][0] - NECK_REST[i][0]) * up + (NECK_RUN[i][0] - NECK_REST[i][0]) * kr;
      NP[i][1] = NECK_REST[i][1] + (NECK_UP[i][1] - NECK_REST[i][1]) * up + (NECK_RUN[i][1] - NECK_REST[i][1]) * kr;
    }
    NP[1][0] += 2 * sway; NP[2][0] += 6 * sway; NP[2][1] += sway;
    NP[3][0] += 11 * sway; NP[3][1] += 3.5 * sway + 2.6 * bite - 7 * call + Math.sin(t * 0.9 + ph) * 1.2;
    NP[2][1] -= 3 * call;
    // the head rides the end of the neck
    const tx = NP[3][0] - NP[2][0], ty = NP[3][1] - NP[2][1], tl = Math.hypot(tx, ty) || 1;
    S.hx = NP[3][0] + (tx * 6 + ty * 4) / tl; S.hy = NP[3][1] + (ty * 6 - tx * 4) / tl;
    S.hrot = -0.05 + sway * 0.03 + Math.sin(t * 0.6 + ph) * 0.03 * (1 - up) - 0.2 * up + 0.07 * bite - 0.2 * call + 0.16 * kr;
    // the tail: a slow travelling swing; lifted for the jog, half-lifted and wagging for the call
    const lift = Math.max(run, 0.45 * call), TP = S.TP;
    const wa = t * 0.8 + ph, wag = call * Math.sin(p * TAU * 7);
    const s1 = Math.sin(wa) + go * 0.5 * Math.sin(TAU * cyc + 0.4) + 1.6 * wag;
    const s2 = Math.sin(wa - 1.0) + go * 0.5 * Math.sin(TAU * cyc - 0.5) + 1.6 * call * Math.sin(p * TAU * 7 - 1.0);
    for (let i = 0; i < 4; i++){
      TP[i][0] = TAIL_REST[i][0] + (TAIL_UP[i][0] - TAIL_REST[i][0]) * lift;
      TP[i][1] = TAIL_REST[i][1] + (TAIL_UP[i][1] - TAIL_REST[i][1]) * lift;
    }
    const bt = run * Math.sin(2 * TAU * cyc - 0.6);
    TP[1][1] += 2 * s1; TP[2][1] += 7 * s1 + 6 * bt; TP[2][0] += 2 * s1; TP[3][1] += 15 * s2 - 10 * bt; TP[3][0] += 5 * s2;
    return S;
  }
  // head space → the caller's space (the same maths as draw)
  function headPoint(L, hx, hy){
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    const r = xf(S.hx + (hx * c - hy * s) * HS, S.hy + (hx * s + hy * c) * HS, 0, CY, S.pitch, 0, S.drop);
    return { x: L.x + (r[0] - OX) * L.s * (L.dir || 1), y: L.y + r[1] * L.s };
  }
  // where the mouth is on screen (the middle of the gap when it is open)
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    const a = S.jaw * 0.5, dx = MOUTH[0] - HX, dy = MOUTH[1] - HY;
    return headPoint(L, HX + dx * Math.cos(a) - dy * Math.sin(a), HY + dx * Math.sin(a) + dy * Math.cos(a));
  }

  // a leaf: a pointed oval from (x, y) along angle a
  function leaf(g, x, y, a, l, w, fill){
    const c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + c * l * 0.45 + s * w, y + s * l * 0.45 - c * w, x + c * l, y + s * l);
    g.quadraticCurveTo(x + c * l * 0.45 - s * w, y + s * l * 0.45 + c * w, x, y);
    g.fillStyle = fill; g.fill();
  }
  // the sprig it plucks: a twig with five leaves, held in the front of the
  // mouth and pulled in a little further with every chew (head space)
  const SPRIG = 25, LEAVES = [[5, 1, 9.5], [10, -1, 10], [15, 1, 9.5], [20, -1, 8.5], [25, 0, 9]];   // [along the twig, side, length]
  function sprig(g, C, p, t){
    const grow = smooth(clamp01((p - 0.085) / 0.045)), c = (p - 0.13) * 13 - 0.35;
    const eaten = clamp01((Math.floor(c) + smooth(frac(c))) / 4.6);
    if (grow <= 0 || eaten >= 1) return;
    const mx = 19, my = 7.2, a = 0.2 + 0.05 * Math.sin(t * 2.2), ca = Math.cos(a), sa = Math.sin(a);
    const out = SPRIG * (1 - eaten) * grow;               // how much of it is still outside
    g.strokeStyle = C.twig; g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(mx - 3 * ca, my - 3 * sa); g.lineTo(mx + out * ca, my + out * sa); g.stroke();
    for (let j = 0; j < LEAVES.length; j++){
      const q = LEAVES[j], m = (q[0] - SPRIG * eaten) * grow;
      if (m < 1.5) continue;
      const la = a + q[1] * (0.95 + 0.06 * Math.sin(t * 2.6 + j)), x = mx + m * ca, y = my + m * sa;
      leaf(g, x, y, la, q[2] * grow, 3.6 * grow, j & 1 ? C.leafD : C.leaf);
    }
  }

  // the head, in head space: skull centre (0,0), snout toward +x
  function drawHead(g, C, L, t){
    const ph = S.ph, jaw = S.jaw, call = S.call, bite = S.bite, p = S.p;
    const headG = lg(g, 0, -15, 0, 9, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    if (p > 0.085 && p < 0.53) sprig(g, C, p, t);
    if (jaw > 0.03){                                      // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 8;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 6.2);
      g.lineTo(HX + (fx - HX) * c, HY + (fx - HX) * s + 0.6); g.lineTo(HX - 3, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // the lower jaw on its hinge: a pink tongue, a cream chin
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    if (jaw > 0.06){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(11, 5.3, 9, 1.2 + 1.5 * Math.min(1, jaw * 2.4), -0.03, 0, TAU); g.fill(); }
    g.fillStyle = lg(g, 0, 5, 0, 13, [[0, C.belly], [1, C.bellyD]]);
    blob(g, JAW, 5); g.fill();
    g.restore();
    if (jaw > 0.1){                                       // three soft peg teeth under the lip
      g.fillStyle = C.tooth; g.beginPath();
      for (let i = 0; i < 3; i++){ const x = 12 + i * 4.3; g.moveTo(x + 1.7, 6.5); g.arc(x, 6.5 - i * 0.4, 1.7, 0, TAU); }
      g.fill();
    }
    g.fillStyle = C.x.rim; g.translate(0, -0.9); blob(g, SKULL, 5.5); g.fill(); g.translate(0, 0.9);   // the light rim: the same shape, a hair higher
    g.fillStyle = headG; blob(g, SKULL, 5.5); g.fill();
    if (bite > 0.01 || S.chew > 0.01){                    // the cheek, working
      g.beginPath(); g.ellipse(2, 5.2, 5.4 + 0.8 * bite, 3 * S.chew + 1.5 * bite, 0.05, 0, TAU); g.fill();
    }
    g.save(); g.translate(0.8, 2.8); g.scale(1, 0.62);          // the blush: the coat's own rosy tone, soft at the edge
    g.fillStyle = rg(g, 0, 0, 0, 5.6, [[0, C.x.ck0], [0.55, C.x.ck1], [1, C.x.ck2]]);
    g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.fill(); g.restore();
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(22.6, -2.4, 1.5, 1, -0.6, 0, TAU); g.fill();
    g.fillStyle = C.x.spot;                               // two little freckle spots on the crown
    g.beginPath(); g.ellipse(-6.5, -9.4, 2.6, 1.7, 0.4, 0, TAU); g.ellipse(-10.5, -4, 1.7, 1.2, 1.1, 0, TAU); g.fill();
    if (jaw < 0.06){                                      // the smile, tucked into the cheek
      g.strokeStyle = C.x.smile; g.lineWidth = 1.05; g.lineCap = 'round';
      g.beginPath(); g.moveTo(24, 4.8); g.quadraticCurveTo(15, 7.2, 8.6, 6); g.quadraticCurveTo(6.6, 5.5, 6.2, 3.8); g.stroke();
    }
    // ONE eye under a soft brow; it half-closes to munch and shuts into a happy arc to call
    const ex = 5.4, ey = -5, rx = 5.4, ry = 6.2;
    if (call > 0.5){
      g.save(); g.translate(ex, ey); g.rotate(-S.hrot * 0.7);       // (kept level, so it reads as a smile)
      g.strokeStyle = C.line; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-rx, 2.2); g.quadraticCurveTo(0, -ry * 1.05, rx, 2.2); g.stroke();
      g.restore();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.22 * S.chew - 0.1 * bite) * (1 - 1.7 * call);
      eye(g, ex, ey, rx, ry, eyeH, 0.3 + Math.sin(t * 0.3 + ph) * 0.4 - 0.2 * S.up, C, { iris: 0.84, lid: 1.3 });
    }
    brow(g, C.x.brow, -1, -11.8 - 1.2 * call, 5, -14.6 - 1.6 * call, 11.2, -11.4 - 0.6 * call, 1.5);
  }

  // a chunky round foot on the last joint (x, y): a flat sole (adds a sub-path
  // wound like limbPath's, so leg + foot fill as one shape) …
  function footPath(g, x, y, rot){
    const c = Math.cos(rot), s = Math.sin(rot), R = FR;
    const X = (px, py) => x + px * c - py * s, Y = (px, py) => y + px * s + py * c;
    g.moveTo(X(-21, -12), Y(-21, -12)); g.lineTo(X(21, -12), Y(21, -12));
    g.quadraticCurveTo(X(28.5, 5), Y(28.5, 5), X(28.5, 15), Y(28.5, 15));
    g.quadraticCurveTo(X(28.5, R), Y(28.5, R), X(21.5, R), Y(21.5, R));
    g.lineTo(X(-18, R), Y(-18, R));
    g.quadraticCurveTo(X(-25, R), Y(-25, R), X(-24.6, 14), Y(-24.6, 14));
    g.quadraticCurveTo(X(-23.6, 0), Y(-23.6, 0), X(-21, -12), Y(-21, -12));
    g.closePath();
  }
  // … and three little cream claws in front
  function claws(g, x, y, rot, col){
    const c = Math.cos(rot), s = Math.sin(rot);
    g.fillStyle = col; g.beginPath();
    for (const nx of CLAWS){
      const cx = x + nx * c - FR * s, cy = y + nx * s + FR * c;
      g.moveTo(cx, cy); g.ellipse(cx, cy, 5, 8, rot, PI, TAU);
    }
    g.fill();
  }

  function draw(ctx, L, t){
    lastT = t;
    const C = palette(PALS[L.coat] || PALS[COATS[0]], TINTED, L.tint, L.lit);
    if (!C.x){                                            // derived colours, once per cached palette
      const li = L.lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
      C.x = { rim: mix(C.coatL, 'rgb(' + q(255 * li[0]) + ',' + q(240 * li[1]) + ',' + q(205 * li[2]) + ')', 0.6),
              ck0: alpha(C.cheek, 0.78), ck1: alpha(C.cheek, 0.55), ck2: alpha(C.cheek, 0), spot: alpha(C.spot, 0.5), nostril: alpha(C.line, 0.55), smile: alpha(C.line, 0.6), brow: alpha(C.line, 0.72),
              wr: alpha(C.line, 0.16), sh0: alpha(C.far, 0), sh1: alpha(C.far, 0.5), bd0: alpha(C.bellyD, 0), bd1: alpha(C.bellyD, 1) };
    }
    solve(L, t);
    const G = S.G, cyc = S.cyc, go = S.go, ph = S.ph, drop = S.drop, pitch = S.pitch, p = S.p;
    const breathe = 1 + Math.sin(t * 1.0 + ph) * 0.008;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(-OX, 0);
    // ONE top-to-bottom gradient for the whole animal, so neck, body, tail and legs melt together
    const coatG = lg(ctx, 0, -330, 0, 0, [[0, C.coatL], [0.36, C.coatL], [0.6, C.coat], [1, C.coatD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = st.x * G.stride * go, lift = st.lift * G.lift * go * (hind ? 0.9 : 1);
      const swing = st.sw ? Math.sin(PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR * 0.6 : 0), root[1], 0, CY, pitch, reach * 0.25, drop);
      const fold = -reach / 190 + swing * (hind ? G.hsw : G.fsw);
      const fx = (hind ? HREST : FREST) + (far ? FAR : 0) + reach, fy = -lift - FR;
      // a pillar leg stays nearly straight: when the foot is far out the root
      // (hidden inside the body) slides toward it instead of the foot lifting
      let rx = r[0], ry = r[1];
      const ax = fx + Math.sin(fold) * len[2], ay = fy - Math.cos(fold) * len[2];
      const d = Math.hypot(ax - rx, ay - ry), lim = (len[0] + len[1]) * 0.996;
      if (d > lim){ const k = (d - lim) / d; rx += (ax - rx) * k; ry += (ay - ry) * k; }
      const ch = leg(ctx, rx, ry, fx, fy, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      // the foot tips with the shank once it is off the ground — never so far that a toe or heel dips into it
      const px = ch[3][0], py = ch[3][1], fmax = Math.asin(Math.min(1, lift / 29));
      const frot = Math.max(-fmax, Math.min(fmax, fold * smooth(clamp01(lift / 5))));
      ctx.beginPath(); footPath(ctx, px, py, frot); ctx.fill();
      if (!far){
        // a soft shade down the back of the pillar — a wedge that widens toward the
        // foot and is gone by the top (one more fill of the leg's own path: no clip)
        const hw = ws[3] / 2 + 3, bx = px - hw + 2, by = py + FR;
        const ux = px + 2 - (ch[0][0] - ws[0] / 2), uy = by - (ch[0][1] + 8), ul = Math.hypot(ux, uy) || 1;
        const snx = uy / ul, sny = -ux / ul, sd = hw * snx;
        ctx.fillStyle = lg(ctx, bx, by, bx + snx * sd, by + sny * sd, [[0, C.x.sh1], [1, C.x.sh0]]);
        limbPath(ctx, ch, ws); footPath(ctx, px, py, frot); ctx.fill();
        const j = hind ? 1 : 2, jx = ch[j][0], jy = ch[j][1], dx = ch[j + 1][0] - jx, dy = ch[j + 1][1] - jy, l = Math.hypot(dx, dy) || 1;
        const tx = dx / l, ty = dy / l, w = ws[j] * 0.3;
        ctx.strokeStyle = C.x.wr; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
        for (const o of WRINKLES){                        // two soft creases at the knee / wrist
          const qx = jx + tx * o, qy = jy + ty * o;
          ctx.moveTo(qx + ty * w, qy - tx * w); ctx.quadraticCurveTo(qx + tx * 3, qy + ty * 3, qx - ty * w, qy + tx * w);
        }
        ctx.stroke();
      }
      claws(ctx, px, py, frot, far ? C.clawF : C.claw);
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, CY); ctx.rotate(pitch); ctx.translate(0, -CY); };

    oneLeg(2); oneLeg(3);

    // ── tail + body + neck: one silhouette (the rim light is the same shape, a hair bigger on top)
    ctx.save(); bodyFrame();
    const NP = S.NP, TP = S.TP, nn = NT.n, tn = TT.n;
    sample(NT, NP[0], NP[1], NP[2], NP[3], NW0, NW1, NPW);
    sample(TT, TP[3], TP[2], TP[1], TP[0], TW1, TW0, TPW);       // tip → root, so its normal is the top side too
    ctx.fillStyle = C.x.rim; ctx.beginPath();
    tubePath(ctx, TT, 2.2); tubePath(ctx, NT, 2.2); blobPath(ctx, BODY, 5.5, CY, breathe, -2.2); ctx.fill();
    ctx.fillStyle = coatG; ctx.beginPath();
    tubePath(ctx, TT, 0); tubePath(ctx, NT, 0); blobPath(ctx, BODY, 5.5, CY, breathe, 0); ctx.fill();
    // the cream underside, clipped to the silhouette: everything below one line that runs
    // along the tail, dips across the flank and climbs the throat to the chin
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.belly; ctx.beginPath();
    ctx.moveTo(TT.x[0] + TT.ny[0] * 14 - TT.nx[0] * 200, TT.y[0] - TT.nx[0] * 14 - TT.ny[0] * 200);
    ctx.lineTo(TT.x[0] + TT.ny[0] * 14, TT.y[0] - TT.nx[0] * 14);
    const ta = tn - 7, nb = 3;                            // where the line leaves the tail / joins the neck
    for (let i = 0; i <= ta; i++) ctx.lineTo(TT.x[i] - TT.nx[i] * TT.w[i] * UNDER, TT.y[i] - TT.ny[i] * TT.w[i] * UNDER);
    const x0 = TT.x[ta] - TT.nx[ta] * TT.w[ta] * UNDER, y0 = TT.y[ta] - TT.ny[ta] * TT.w[ta] * UNDER;
    const x1 = NT.x[nb] - NT.nx[nb] * NT.w[nb] * UNDER, y1 = NT.y[nb] - NT.ny[nb] * NT.w[nb] * UNDER;
    const mx = -8, my = -96;
    ctx.bezierCurveTo(x0 - TT.ny[ta] * 22, y0 + TT.nx[ta] * 22, mx - 50, my, mx, my);
    ctx.bezierCurveTo(mx + 46, my, x1 + NT.ny[nb] * 34, y1 - NT.nx[nb] * 34, x1, y1);
    for (let i = nb + 1; i <= nn; i++) ctx.lineTo(NT.x[i] - NT.nx[i] * NT.w[i] * UNDER, NT.y[i] - NT.ny[i] * NT.w[i] * UNDER);
    ctx.lineTo(NT.x[nn] - NT.nx[nn] * 200, NT.y[nn] - NT.ny[nn] * 200);
    ctx.lineTo(700, 300); ctx.lineTo(-700, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -98, 0, -46, [[0, C.x.bd0], [1, C.x.bd1]]);       // the belly turns away from the light
    ctx.fillRect(-108, -98, 210, 54);
    ctx.restore();
    // soft spots: on the back, up the neck, down the tail
    ctx.fillStyle = C.x.spot; ctx.beginPath();
    for (const q of SPOTS){ ctx.moveTo(q[0] + q[2], q[1]); ctx.ellipse(q[0], q[1], q[2], q[3], q[4], 0, TAU); }
    for (let i = 5; i < nn - 1; i += 4){
      const k = 1 - i / nn, x = NT.x[i] + NT.nx[i] * NT.w[i] * 0.5, y = NT.y[i] + NT.ny[i] * NT.w[i] * 0.5;
      const a = Math.atan2(NT.nx[i], -NT.ny[i]), rx = 4.4 + 5 * k, ry = 2.8 + 3 * k;
      ctx.moveTo(x + rx * Math.cos(a), y + rx * Math.sin(a)); ctx.ellipse(x, y, rx, ry, a, 0, TAU);
    }
    for (let i = 4; i < tn - 8; i += 4){
      const k = i / tn, x = TT.x[i] + TT.nx[i] * TT.w[i] * 0.42, y = TT.y[i] + TT.ny[i] * TT.w[i] * 0.42;
      const a = Math.atan2(TT.nx[i], -TT.ny[i]), rx = 2.6 + 7 * k, ry = 1.6 + 4.4 * k;
      ctx.moveTo(x + rx * Math.cos(a), y + rx * Math.sin(a)); ctx.ellipse(x, y, rx, ry, a, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── the head on the end of the neck; the call's sound rings; leaves falling from the munch
    ctx.save(); bodyFrame();
    ctx.save();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot); ctx.scale(HS, HS);
    drawHead(ctx, C, L, t);
    if (p > 0.635 && p < 0.925){
      ctx.translate(27, 9.5); ctx.rotate(S.jaw * 0.5);
      rings(ctx, 0, 0, 0.02 + 0.96 * frac((p - 0.635) / 0.145), C.line, 0.62, 0.95);
    }
    ctx.restore();
    if (p > 0.25 && p < 0.62){
      const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
      const lx = S.hx + (MOUTH[0] * c - MOUTH[1] * s) * HS, ly = S.hy + (MOUTH[0] * s + MOUTH[1] * c) * HS;
      for (let j = 0; j < 2; j++){
        const u = (p - (0.25 + j * 0.13)) / 0.24;
        if (u <= 0 || u >= 1) continue;
        ctx.globalAlpha = Math.min(1, (1 - u) * 4);
        leaf(ctx, lx + 8 + (j ? -14 : 16) * Math.sin(u * 7 + j), ly + 10 + 150 * u * (0.4 + 0.6 * u), u * 6 + j * 2.2, 19, 7.4, j ? C.leafD : C.leaf);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    ctx.restore();
  }

  window.BrontoRig = { draw, mouth, HEIGHT: 320, WIDTH: 235, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 4.4,
                       WALK_CPS: 0.5, RUN_CPS: 1.0, COATS };
})();
