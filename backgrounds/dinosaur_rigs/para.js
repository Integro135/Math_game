/* ── para.js — the PARASAUROLOPHUS, drawn from scratch (2026-11) ────────────
   The friendly duck-bill of the volcano valley, in true profile: a deep
   round body carried high at the hips, strong Z-folded hind legs and shorter
   slim front legs (chunky round-toed feet with little cream claws), a thick
   tail held level, a short neck curving up to a big soft head — ONE glossy
   eye under a soft brow, a blush, a rounded duck bill in its own warm colour
   — and the hallmark: the long tube CREST sweeping back from the snout over
   the head, banded near its tip. Tail, body and neck are ONE silhouette with
   one cream underside from the chin to the tail tip; soft saddle stripes
   down the back; a warm rim light on the top edge.

   Legs: three bones placed by IK (kit.js) on PLANTED feet. WALK = on all
   fours, an easy four-beat. L.run = it rises onto the hind legs and runs as a
   BIPED — the body tips up about the hips (blended with go, so it never
   snaps), the front legs tuck against the chest and paddle, the tail swings
   level for balance, the head reaches forward.
   pose 0..1 = TRUMPET: it rears up a little, lifts the head and trumpets
   through the crest — toot, tooot: the bill opens (a real gap, pink tongue),
   sound rings roll from the crest tip and the mouth, two little music notes
   float up, the eye squeezes into a happy arc, the tail wags.

   API — window.ParaRig { draw(ctx, L, t), mouth(L[, t]), crestTip(L[, t]), HEIGHT,
         WIDTH, STRIDE, RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   HEIGHT = ground → the crest tip standing on all fours; WIDTH = half the
   tail-tip-to-bill span at rest. Beyond that box: the run lifts the crest about
   23 units above HEIGHT and swings the tail about 20 past WIDTH behind; the
   trumpet lifts the crest about 15 above HEIGHT and the tail 15 past WIDTH, and
   its rings and notes reach about 65 above HEIGHT and 18 past WIDTH in front.
   Depends only on ../savanna_rigs/kit.js (SavKit). */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, blob, limbPath, step, leg, xf,
          eye, blink, brow, rings } = window.SavKit;
  const PI = Math.PI;
  // mix two of the palette's 'rgb(r,g,b)' strings (only run once per cached palette)
  const mix = (a, b, k) => {
    const p = a.match(/\d+/g), q = b.match(/\d+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  };

  // ── coats: each a full palette. spot = the saddle stripes and crest bands,
  //    bill* = the duck bill, claw / clawF = near / far claws
  const COMMON = { eyeW: '#FFFDF6', pupil: '#1B1420', mouth: '#6A2238', tongue: '#FF8FA0', claw: '#FFF6DE' };
  const mk = o => Object.assign({}, COMMON, o);
  const PALS = {
    coral: mk({ coat: '#FF9A8A', coatL: '#FFC6B6', coatD: '#EE7468', belly: '#FFF2D6', bellyD: '#F4D9AE', far: '#D66860',
                spot: '#E0526A', bill: '#FFD98A', billL: '#FFEDB8', billD: '#F2B860', clawF: '#D8C4BC', iris: '#B44A5E', line: '#6A2A36', cheek: '#FF5E74' }),
    teal:   mk({ coat: '#54C6C2', coatL: '#96E6DE', coatD: '#34A2A6', belly: '#FFF3D0', bellyD: '#EEDCA4', far: '#2C8E94',
                spot: '#1E8A96', bill: '#FFC49A', billL: '#FFE0C4', billD: '#F09E70', clawF: '#BCCFCC', iris: '#1E7E88', line: '#184A52', cheek: '#FF98A4' }),
    plum:   mk({ coat: '#C78AD6', coatL: '#E6BEEE', coatD: '#A566BC', belly: '#FFEEE6', bellyD: '#F0D0CE', far: '#9058A8',
                spot: '#8E48B0', bill: '#FFC2CE', billL: '#FFE0E6', billD: '#F09AB0', clawF: '#D0C2D6', iris: '#8040A8', line: '#4A2460', cheek: '#FF78B0' }),
    honey:  mk({ coat: '#FFCB62', coatL: '#FFE6A4', coatD: '#F2A83E', belly: '#FFFAE8', bellyD: '#F4E4BA', far: '#D89434',
                spot: '#EE8436', bill: '#FF9E86', billL: '#FFC4B2', billD: '#EC7A66', clawF: '#DACEB2', iris: '#B46A1E', line: '#6E441C', cheek: '#FF7E66' }),
    lime:   mk({ coat: '#A6DC6E', coatL: '#D2F2A8', coatD: '#7EBE4E', belly: '#FFFADC', bellyD: '#EEE4AE', far: '#6CA646',
                spot: '#56A63E', bill: '#FFD27E', billL: '#FFEAB4', billD: '#F0B052', clawF: '#C8D2B8', iris: '#4E8E2E', line: '#2E5022', cheek: '#FF988A' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'belly', 'bellyD', 'far', 'spot', 'bill', 'billL', 'billD'];

  // off[] = near hind, near front, far hind, far front. WALK = a lateral
  // four-beat; RUN = the two hind legs alone (the front pair is tucked).
  const WALK = { stride: 104, duty: 0.64, lift: 12, off: [0, 0.75, 0.5, 0.25], hsw: 0.5, fsw: 0.8 };
  const RUN  = { stride: 180, duty: 0.4, lift: 26, off: [0, 0.5, 0.5, 0], hsw: 0.8, fsw: 0.8 };
  const REAR_RUN = 0.42, REAR_POSE = 0.2;                 // how far the body tips up about the hips (radians)

  const OX = -4.5;                                          // the art's centre line (tail tip ↔ bill)
  // the body, CLOCKWISE on screen (rump → back → withers → chest → belly) like the tubes, so the union never punches holes
  const BODY = [[-66, -112], [-54, -142], [-22, -154], [14, -150], [44, -138], [66, -118], [74, -92],
                [64, -64], [30, -48], [-8, -46], [-44, -58], [-63, -84]];
  const CY = -104, HP = [-30, -98], SH = [46, -84], HREST = -30, FREST = 54, FAR = 12, TOE = 9, TOEF = 7;
  const HL = [38, 40, 27], FL = [31, 37, 15], HW = [64, 42, 24, 18], FW = [30, 21, 16, 14], HFOLD = -0.3, FFOLD = 0.05;
  const HS = 1.9, HX = 2, HY = 6.6;                        // head scale; the jaw hinge (head space)
  const SKULL = [[-15, 1], [-14.4, -7.4], [-8, -12.6], [2, -13], [11, -10], [18, -6], [23, -3], [25, 1.4], [23, 5.6], [14, 7], [3, 8], [-9, 8]];
  const BILL = [[14, 1], [15.4, -4.6], [22, -5.2], [29, -4.2], [35, -2.2], [37.6, 1.4], [35.8, 5], [28, 6.3], [16, 6.4]];
  const JAW = [[-7, 5.8], [6, 6.6], [16, 6.2], [27, 5.6], [34, 5], [35, 7.4], [28, 10], [13, 11.4], [0, 11.4], [-7, 9.6]];
  const JAWB = [[15, 5.8], [26, 5.4], [34, 4.8], [35.2, 7.3], [29, 10], [16.4, 11]];     // the lower bill, on the jaw
  const MOUTH = [35, 5.4];                                  // where sounds come from (head space)
  const CREST = [[18.5, -1.2], [5, -12], [-14, -22], [-33, -22.5]], CW0 = 13.4, CW1 = 10;   // the tube crest: snout → tip (head space)
  // neck and tail: cubic spines in the body's frame
  const NECK_REST = [[30, -114], [58, -108], [78, -126], [92, -149]];
  const NECK_RUN  = [[30, -114], [60, -110], [86, -112], [108, -116]];
  const NECK_POSE = [[30, -114], [58, -112], [74, -134], [84, -158]];
  const TAIL_REST = [[-18, -118], [-80, -124], [-124, -112], [-166, -118]];
  const NW0 = 56, NW1 = 34, NPW = 0.8, TW0 = 74, TW1 = 6, TPW = 0.9, UNDER = 0.2;   // UNDER: where the cream starts (share of the half-width below the spine)
  const STRIPES = [[-46, -144, 5.5, 13], [-25, -152, 6.5, 15], [-3, -151, 6.5, 24], [18, -147, 6, 24], [39, -138, 5, 19]];   // saddle stripes: [x, top y, half-width, length]

  // ── a tube (neck, tail, crest) sampled along its spine into typed scratch
  //    arrays: x, y, the unit normal toward the BACK (top) side, the half-width
  function mkTube(n){
    return { n, x: new Float32Array(n + 1), y: new Float32Array(n + 1), nx: new Float32Array(n + 1), ny: new Float32Array(n + 1), w: new Float32Array(n + 1) };
  }
  // a..d are passed in the order that travels toward +x (so the normal is the top side)
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
  const NT = mkTube(14), TT = mkTube(18), CT = mkTube(12);

  // ── the pose, solved once per draw (and by mouth() / crestTip()): a SHARED scratch
  const S = { NP: [[0, 0], [0, 0], [0, 0], [0, 0]], TP: [[0, 0], [0, 0], [0, 0], [0, 0]] };
  let lastT = 0;
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = S.G = L.run ? RUN : WALK, cyc = S.cyc = (L.wt || 0) / TAU;
    const p = S.p = clamp01(L.pose || 0);
    // the act: rear up 0–.2 · toot .17–.47 · tooot .51–.9 · back down
    const K = S.K = p > 0 ? smooth(clamp01(p / 0.2)) * smooth(clamp01((1 - p) / 0.14)) : 0;
    const gap = Math.exp(-Math.pow((p - 0.49) / 0.035, 2));              // the breath between the two toots
    const J = S.J = p > 0 ? smooth(clamp01((p - 0.17) / 0.07)) * smooth(clamp01((0.9 - p) / 0.07)) * (1 - 0.8 * gap) : 0;
    const rb = S.rb = smooth(L.run ? go : 0) * (1 - K);   // how far it is up on its hind legs to run
    const gg = S.gg = go * (1 - K);                       // how much the feet are in the gait
    S.air = Math.max(rb, K);                              // how far the front feet are off the ground
    S.jaw = J * (0.5 + 0.03 * Math.sin(p * TAU * 30));
    const beat = Math.sin(2 * TAU * cyc + 1.2);
    // the body: a small bob at the walk; at the run it sinks in mid-stance and sails between
    // the steps, tipped up about the hips. The trumpet rears it a little and makes it tremble.
    const drop = L.run ? 6 * Math.cos(2 * TAU * (cyc - G.duty / 2)) : 1.6 * Math.sin(2 * TAU * cyc + 0.6);
    S.oy = drop * gg + 5 * rb - 2 * K + J * Math.sin(p * TAU * 30) * 0.5;
    S.ox = -6 * K - 4 * rb;
    S.pitch = -(REAR_RUN * rb + REAR_POSE * K) + gg * (L.run ? 0.035 * Math.sin(2 * TAU * (cyc - 0.05)) : 0.012 * Math.sin(TAU * cyc + 1));
    // the neck: rest ↔ reaching forward (the run) ↔ lifted (the trumpet), nodding with every step
    const sway = gg * beat * (1 - rb) + Math.sin(t * 0.5 + ph * 1.7) * 0.5 * (1 - gg);
    const NP = S.NP;
    for (let i = 0; i < 4; i++){
      NP[i][0] = NECK_REST[i][0] + (NECK_RUN[i][0] - NECK_REST[i][0]) * rb + (NECK_POSE[i][0] - NECK_REST[i][0]) * K;
      NP[i][1] = NECK_REST[i][1] + (NECK_RUN[i][1] - NECK_REST[i][1]) * rb + (NECK_POSE[i][1] - NECK_REST[i][1]) * K;
    }
    NP[2][0] += 1.6 * sway; NP[3][0] += 3.6 * sway; NP[3][1] += 1.4 * sway + Math.sin(t * 0.9 + ph) * 0.8 - 2 * J;
    const tx = NP[3][0] - NP[2][0], ty = NP[3][1] - NP[2][1], tl = Math.hypot(tx, ty) || 1;
    S.hx = NP[3][0] + (tx * 5 + ty * 4) / tl; S.hy = NP[3][1] + (ty * 5 - tx * 4) / tl;
    // the head keeps its own angle to the WORLD whatever the body does (hrot is in the body's frame)
    const hw = 0.13 + 0.03 * sway + Math.sin(t * 0.6 + ph) * 0.03 * (1 - K) - 0.1 * rb + rb * gg * 0.04 * Math.sin(2 * TAU * cyc)
             - K * 0.4 - J * (0.12 + 0.02 * Math.sin(p * TAU * 30));
    S.hrot = hw - S.pitch;
    // the tail: held level — it swings up about its root as the body tips, with a slow travelling sway
    const TP = S.TP, ca = -S.pitch * 0.82 + 0.06 * rb, cc = Math.cos(ca), cs = Math.sin(ca);
    const wa = t * 0.9 + ph, wag = K * Math.sin(p * TAU * 6), bt = rb * gg * Math.sin(2 * TAU * cyc - 0.4);
    const s1 = Math.sin(wa) + gg * 0.6 * Math.sin(TAU * cyc + 0.4) + 1.5 * wag + 1.2 * bt;
    const s2 = Math.sin(wa - 1.0) + gg * 0.6 * Math.sin(TAU * cyc - 0.5) + 1.5 * K * Math.sin(p * TAU * 6 - 1.0) - 1.4 * bt;
    TP[0][0] = TAIL_REST[0][0]; TP[0][1] = TAIL_REST[0][1];
    for (let i = 1; i < 4; i++){
      const dx = TAIL_REST[i][0] - TP[0][0], dy = TAIL_REST[i][1] - TP[0][1];
      TP[i][0] = TP[0][0] + dx * cc - dy * cs; TP[i][1] = TP[0][1] + dx * cs + dy * cc;
    }
    TP[2][1] += 4 * s1; TP[3][1] += 9 * s2; TP[3][0] += 2 * s2;
    return S;
  }
  // head space → the caller's space (the same maths as draw)
  function headPoint(L, hx, hy){
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    const r = xf(S.hx + (hx * c - hy * s) * HS, S.hy + (hx * s + hy * c) * HS, HP[0], HP[1], S.pitch, S.ox, S.oy);
    return { x: L.x + (r[0] - OX) * L.s * (L.dir || 1), y: L.y + r[1] * L.s };
  }
  // where the mouth is on screen (the middle of the gap when the bill is open)
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    const a = S.jaw * 0.5, dx = MOUTH[0] - HX, dy = MOUTH[1] - HY;
    return headPoint(L, HX + dx * Math.cos(a) - dy * Math.sin(a), HY + dx * Math.sin(a) + dy * Math.cos(a));
  }
  // … and the tip of the crest, where the trumpet comes out
  function crestTip(L, t){
    solve(L, t == null ? lastT : t);
    return headPoint(L, CREST[3][0] - 4, CREST[3][1]);
  }

  // the head, in head space: skull centre (0,0), bill toward +x. Leaves the crest's spine in CT.
  function drawHead(g, C, L, t){
    const ph = S.ph, jaw = S.jaw, J = S.J;
    const headG = lg(g, 0, -30, 0, 10, [[0, C.coatL], [0.42, C.coatL], [0.74, C.coat], [1, C.coatD]]);
    if (jaw > 0.03){                                      // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 12;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 6.8);
      g.lineTo(HX + (fx - HX) * c, HY + (fx - HX) * s + 0.6); g.lineTo(HX - 3, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // the lower jaw on its hinge: tongue, cream chin, lower bill
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    if (jaw > 0.06){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(18, 5.7, 12, 1.2 + 1.6 * Math.min(1, jaw * 2.4), -0.03, 0, TAU); g.fill(); }
    g.fillStyle = lg(g, 0, 5, 0, 11, [[0, C.belly], [1, C.bellyD]]);
    blob(g, JAW, 5); g.fill();
    g.fillStyle = C.billD; blob(g, JAWB, 5); g.fill();
    g.restore();
    // the crest and the skull are one shape: the tube runs from the snout back over the head
    sample(CT, CREST[3], CREST[2], CREST[1], CREST[0], CW1, CW0, 1);       // tip → snout, so the normal is its top side
    g.fillStyle = C.x.rim; g.beginPath(); tubePath(g, CT, 0.9); g.fill();
    g.fillStyle = headG; g.beginPath(); tubePath(g, CT, 0); blobPath(g, SKULL, 5.5, 0, 1, 0); g.fill();
    g.fillStyle = C.x.spot; g.beginPath();                // three bands round the crest, toward its tip
    for (let i = 1; i < 6; i += 2){
      g.moveTo(CT.x[i] + CT.nx[i] * CT.w[i], CT.y[i] + CT.ny[i] * CT.w[i]);
      g.lineTo(CT.x[i + 1] + CT.nx[i + 1] * CT.w[i + 1], CT.y[i + 1] + CT.ny[i + 1] * CT.w[i + 1]);
      g.lineTo(CT.x[i + 1] - CT.nx[i + 1] * CT.w[i + 1], CT.y[i + 1] - CT.ny[i + 1] * CT.w[i + 1]);
      g.lineTo(CT.x[i] - CT.nx[i] * CT.w[i], CT.y[i] - CT.ny[i] * CT.w[i]); g.closePath();
    }
    g.fill();
    g.fillStyle = lg(g, 0, -5, 0, 6, [[0, C.billL], [0.5, C.bill], [1, C.billD]]);         // the duck bill
    blob(g, BILL, 5); g.fill();
    g.save(); g.translate(0.4, 3.8); g.scale(1, 0.62);          // the blush: the coat's own rosy tone, soft at the edge
    g.fillStyle = rg(g, 0, 0, 0, 5.6, [[0, C.x.ck0], [0.55, C.x.ck1], [1, C.x.ck2]]);
    g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.fill(); g.restore();
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(31.4, -0.6, 1.6, 1.05, -0.5, 0, TAU); g.fill();
    if (jaw < 0.06){                                      // the smile, along the bill and up into the cheek
      g.strokeStyle = C.x.smile; g.lineWidth = 1.05; g.lineCap = 'round';
      g.beginPath(); g.moveTo(36, 5.2); g.quadraticCurveTo(23, 7.6, 11, 6.7); g.quadraticCurveTo(8.6, 6.3, 8.2, 4.4); g.stroke();
    }
    // ONE eye under a soft brow; it squeezes into a happy arc to trumpet
    const ex = 6.6, ey = -2.4, rx = 5.3, ry = 6.1;
    if (J > 0.5){
      g.save(); g.translate(ex, ey); g.rotate(-(S.hrot + S.pitch) * 0.7);   // (kept level, so it reads as a smile)
      g.strokeStyle = C.line; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-rx, 2.2); g.quadraticCurveTo(0, -ry * 1.05, rx, 2.2); g.stroke();
      g.restore();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 1.7 * J);
      eye(g, ex, ey, rx, ry, eyeH, 0.3 + Math.sin(t * 0.3 + ph) * 0.4, C, { iris: 0.84, lid: 1.3 });
    }
    brow(g, C.x.brow, 0.2, -8.8 - 1.2 * J, 6, -11.8 - 1.6 * J, 12.2, -8.2 - 0.6 * J, 1.5);
  }

  // a chunky round-toed foot on the toe joint (x, y), sole on y + h: adds a
  // sub-path (so leg + foot fill as one shape). k = its size (1 = a hind foot).
  function footPath(g, x, y, rot, k, h){
    const c = Math.cos(rot) * k, s = Math.sin(rot) * k, H = h / k;
    const X = (px, py) => x + px * c - py * s, Y = (px, py) => y + px * s + py * c;
    g.moveTo(X(-8.6, 1), Y(-8.6, 1));
    g.quadraticCurveTo(X(-9, -7), Y(-9, -7), X(-1, -7.4), Y(-1, -7.4));
    g.quadraticCurveTo(X(11, -7), Y(11, -7), X(19, -1.6), Y(19, -1.6));
    g.quadraticCurveTo(X(26.6, 2.6), Y(26.6, 2.6), X(25.6, 5.4), Y(25.6, 5.4));
    g.quadraticCurveTo(X(24.6, H), Y(24.6, H), X(21, H), Y(21, H));
    g.lineTo(X(-5, H), Y(-5, H));
    g.quadraticCurveTo(X(-8.8, H), Y(-8.8, H), X(-8.6, 1), Y(-8.6, 1));
    g.closePath();
  }
  // … and three little cream claws on the toes
  const CLAWS = [22.4, 15.4, 8.4];
  function claws(g, x, y, rot, k, h, col){
    const c = Math.cos(rot), s = Math.sin(rot);
    g.fillStyle = col; g.beginPath();
    for (const nx of CLAWS){
      const cx = x + nx * k * c - h * s, cy = y + nx * k * s + h * c;
      g.moveTo(cx, cy); g.ellipse(cx, cy, 3.3 * k, 5.2 * k, rot, PI, TAU);
    }
    g.fill();
  }
  // a little music note (one path): head, stem, flag
  function note(g, x, y, r, rot, col){
    const c = Math.cos(rot) * r, s = Math.sin(rot) * r;
    const X = (px, py) => x + px * c - py * s, Y = (px, py) => y + px * s + py * c;
    g.fillStyle = col; g.beginPath();
    g.ellipse(x, y, r, r * 0.74, rot - 0.35, 0, TAU);
    g.moveTo(X(0.66, 0), Y(0.66, 0)); g.lineTo(X(0.66, -3.1), Y(0.66, -3.1));
    g.quadraticCurveTo(X(2.3, -2.7), Y(2.3, -2.7), X(2.1, -1.2), Y(2.1, -1.2));
    g.quadraticCurveTo(X(1.7, -2.1), Y(1.7, -2.1), X(1.0, -2.2), Y(1.0, -2.2));
    g.lineTo(X(1.0, 0), Y(1.0, 0)); g.closePath();
    g.fill();
  }

  function draw(ctx, L, t){
    lastT = t;
    const C = palette(PALS[L.coat] || PALS[COATS[0]], TINTED, L.tint, L.lit);
    if (!C.x){                                            // derived colours, once per cached palette
      const li = L.lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
      C.x = { rim: mix(C.coatL, 'rgb(' + q(255 * li[0]) + ',' + q(240 * li[1]) + ',' + q(205 * li[2]) + ')', 0.6),
              ck0: alpha(C.cheek, 0.78), ck1: alpha(C.cheek, 0.55), ck2: alpha(C.cheek, 0), spot: alpha(C.spot, 0.5), nostril: alpha(C.line, 0.5), smile: alpha(C.line, 0.6), brow: alpha(C.line, 0.72),
              sh0: alpha(C.far, 0), sh1: alpha(C.far, 0.45), bd0: alpha(C.bellyD, 0), bd1: alpha(C.bellyD, 1) };
    }
    solve(L, t);
    const G = S.G, cyc = S.cyc, gg = S.gg, ph = S.ph, pitch = S.pitch, ox = S.ox, oy = S.oy, p = S.p, rb = S.rb, air = S.air;
    const breathe = 1 + Math.sin(t * 1.2 + ph) * 0.01;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(-OX, 0);
    // ONE top-to-bottom gradient for the whole animal, so neck, body, tail and legs melt together
    const coatG = lg(ctx, 0, -230, 0, 0, [[0, C.coatL], [0.22, C.coatL], [0.5, C.coat], [1, C.coatD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1, fo = far ? FAR : 0, fill = far ? C.far : coatG;
      const st = step(cyc + G.off[i], G.duty);
      let ch, rot, k, h;
      if (hind){
        // a Z-folded dinosaur leg: knee forward, ankle back, up on its toes. To lift the
        // foot the ankle swings up and back and the shank tips forward.
        const reach = st.x * G.stride * gg, lift = (L.run ? Math.pow(st.lift, 0.7) : st.lift) * G.lift * gg;
        const swing = st.sw ? Math.sin(PI * st.sw) * gg : 0;
        const r = xf(HP[0] + fo * 0.5, HP[1], HP[0], HP[1], pitch, ox + reach * 0.12, oy);
        const fold = HFOLD - reach / (L.run ? 125 : 110) - swing * G.hsw;
        let sx = r[0], sy = r[1];
        const fx = HREST + 8 * rb + fo + reach, fy = -lift - TOE;
        const wx = fx + Math.sin(fold) * HL[2], wy = fy - Math.cos(fold) * HL[2];
        const d = Math.hypot(wx - sx, wy - sy), lim = (HL[0] + HL[1]) * 0.99;
        if (d > lim){ const q = (d - lim) / d; sx += (wx - sx) * q; sy += (wy - sy) * q; }   // (the hip gives, never the planted foot)
        ch = leg(ctx, sx, sy, fx, fy, HL[0], HL[1], HL[2], HW, 1, fold, fill);
        const fmax = Math.asin(Math.min(1, lift / 36));   // the toes droop, then lift to land — never into the ground
        rot = Math.max(-fmax, Math.min(fmax, swing * (1.0 - 1.5 * st.sw))); k = 1.25; h = TOE;
      } else {
        // a slim front leg: on the ground at the walk; tucked against the chest and
        // paddling when it runs on two legs; dangling while it rears to trumpet
        const on = 1 - air, reach = st.x * G.stride * gg * on, lift = st.lift * G.lift * 0.9 * gg * on;
        const swing = st.sw ? Math.sin(PI * st.sw) * gg * on : 0;
        const r = xf(SH[0] + fo * 0.5, SH[1], HP[0], HP[1], pitch, ox + reach * 0.2, oy), rx = r[0], ry = r[1];
        let fold = FFOLD - reach / 100 + swing * G.fsw, fx = FREST + fo + reach, fy = -lift - TOEF;
        const fmax = Math.asin(Math.min(1, lift / 27));
        rot = Math.max(-fmax, Math.min(fmax, fold * smooth(clamp01(lift / 4))));
        if (air > 0.001){
          const a = L.run ? TAU * cyc + (far ? PI : 0) : p * TAU * 3 + (far ? 2 : 0), e = smooth(air);
          const hx = L.run ? 15 : 10, hy = L.run ? 30 : 40;         // tucked high to run, hanging lower to trumpet
          const q = xf(SH[0] + fo * 0.5 + hx + 4 * Math.sin(a) * e, SH[1] + hy + 3 * Math.cos(a) * e, HP[0], HP[1], pitch, ox, oy);
          const af = (L.run ? 0.8 : 0.45) + 0.2 * Math.sin(a) + pitch * 0.5;
          fx = lerp(fx, q[0], e); fy = lerp(fy, q[1], e); fold = lerp(fold, af, e); rot = lerp(rot, af * 0.9, e);
        }
        // a foot on the ground stays where it is: if the leg cannot reach it, the
        // shoulder (hidden inside the body) slides toward it instead of the foot lifting
        let sx = rx, sy = ry;
        const wx = fx + Math.sin(fold) * FL[2], wy = fy - Math.cos(fold) * FL[2];
        const d = Math.hypot(wx - sx, wy - sy), lim = (FL[0] + FL[1]) * 0.99;
        if (d > lim){ const q = (d - lim) / d; sx += (wx - sx) * q; sy += (wy - sy) * q; }
        ch = leg(ctx, sx, sy, fx, fy, FL[0], FL[1], FL[2], FW, -1, fold, fill);
        k = 0.95; h = TOEF;
      }
      const px = ch[3][0], py = ch[3][1];
      ctx.beginPath(); footPath(ctx, px, py, rot, k, h); ctx.fill();
      if (!far && hind){
        // a soft shade under the thigh, so the folded leg reads against the belly
        ctx.fillStyle = lg(ctx, ch[1][0], ch[1][1] - 8, ch[1][0] - 10, ch[1][1] + 20, [[0, C.x.sh0], [1, C.x.sh1]]);
        limbPath(ctx, ch, HW); ctx.fill();
      }
      claws(ctx, px, py, rot, k, h, far ? C.clawF : C.claw);
    }
    const bodyFrame = () => { ctx.translate(ox, oy); ctx.translate(HP[0], HP[1]); ctx.rotate(pitch); ctx.translate(-HP[0], -HP[1]); };

    oneLeg(2); oneLeg(3);

    // ── tail + body + neck: one silhouette (the rim light is the same shape, a hair bigger on top)
    ctx.save(); bodyFrame();
    const NP = S.NP, TP = S.TP, nn = NT.n, tn = TT.n;
    sample(NT, NP[0], NP[1], NP[2], NP[3], NW0, NW1, NPW);
    sample(TT, TP[3], TP[2], TP[1], TP[0], TW1, TW0, TPW);       // tip → root, so its normal is the top side too
    ctx.fillStyle = C.x.rim; ctx.beginPath();
    tubePath(ctx, TT, 2); tubePath(ctx, NT, 2); blobPath(ctx, BODY, 5.5, CY, breathe, -2); ctx.fill();
    ctx.fillStyle = coatG; ctx.beginPath();
    tubePath(ctx, TT, 0); tubePath(ctx, NT, 0); blobPath(ctx, BODY, 5.5, CY, breathe, 0); ctx.fill();
    // the cream underside, clipped to the silhouette: everything below one line that runs
    // along the tail, dips across the flank and climbs the throat to the chin
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.belly; ctx.beginPath();
    ctx.moveTo(TT.x[0] + TT.ny[0] * 12 - TT.nx[0] * 200, TT.y[0] - TT.nx[0] * 12 - TT.ny[0] * 200);
    ctx.lineTo(TT.x[0] + TT.ny[0] * 12, TT.y[0] - TT.nx[0] * 12);
    const ta = tn - 6, nb = 3;                            // where the line leaves the tail / joins the neck
    for (let i = 0; i <= ta; i++) ctx.lineTo(TT.x[i] - TT.nx[i] * TT.w[i] * UNDER, TT.y[i] - TT.ny[i] * TT.w[i] * UNDER);
    const x0 = TT.x[ta] - TT.nx[ta] * TT.w[ta] * UNDER, y0 = TT.y[ta] - TT.ny[ta] * TT.w[ta] * UNDER;
    const x1 = NT.x[nb] - NT.nx[nb] * NT.w[nb] * UNDER, y1 = NT.y[nb] - NT.ny[nb] * NT.w[nb] * UNDER;
    const mx = 2, my = -76;
    ctx.bezierCurveTo(x0 - TT.ny[ta] * 16, y0 + TT.nx[ta] * 16, mx - 32, my, mx, my);
    ctx.bezierCurveTo(mx + 30, my, x1 + NT.ny[nb] * 22, y1 - NT.nx[nb] * 22, x1, y1);
    for (let i = nb + 1; i <= nn; i++) ctx.lineTo(NT.x[i] - NT.nx[i] * NT.w[i] * UNDER, NT.y[i] - NT.ny[i] * NT.w[i] * UNDER);
    ctx.lineTo(NT.x[nn] - NT.nx[nn] * 200, NT.y[nn] - NT.ny[nn] * 200);
    ctx.lineTo(700, 300); ctx.lineTo(-700, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -80, 0, -44, [[0, C.x.bd0], [1, C.x.bd1]]);        // the belly turns away from the light
    ctx.fillRect(-72, -80, 150, 38);
    ctx.restore();
    // soft saddle stripes down the back, and on along the neck and the tail
    ctx.fillStyle = C.x.spot; ctx.beginPath();
    for (const q of STRIPES){
      const cx = q[0] - 2, cy = q[1] + q[3] / 2 + 3;
      ctx.moveTo(cx + q[2], cy); ctx.ellipse(cx, cy, q[2], q[3] / 2, 0.16, 0, TAU);
    }
    for (let i = 4; i < nn - 2; i += 4){
      const w = NT.w[i] * 0.42, x = NT.x[i] + NT.nx[i] * (NT.w[i] - w - 2), y = NT.y[i] + NT.ny[i] * (NT.w[i] - w - 2);
      const a = Math.atan2(NT.ny[i], NT.nx[i]);
      ctx.moveTo(x + w * Math.cos(a), y + w * Math.sin(a)); ctx.ellipse(x, y, w, 3.6, a, 0, TAU);
    }
    for (let i = 4; i < tn - 5; i += 3){
      const w = TT.w[i] * 0.45, x = TT.x[i] + TT.nx[i] * (TT.w[i] - w - 1.5), y = TT.y[i] + TT.ny[i] * (TT.w[i] - w - 1.5);
      const a = Math.atan2(TT.ny[i], TT.nx[i]), r = 1.6 + 3 * i / tn;
      ctx.moveTo(x + w * Math.cos(a), y + w * Math.sin(a)); ctx.ellipse(x, y, w, r, a, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── the head on the end of the neck; the trumpet's sound rings and music notes
    ctx.save(); bodyFrame();
    const hc = Math.cos(S.hrot), hs = Math.sin(S.hrot);
    ctx.save();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot); ctx.scale(HS, HS);
    drawHead(ctx, C, L, t);
    if (S.J > 0.3){
      const k1 = p < 0.49 ? (p - 0.2) / 0.27 : frac((p - 0.53) / 0.18);
      ctx.save(); ctx.translate(MOUTH[0] + 3, MOUTH[1] + 2); ctx.rotate(S.jaw * 0.5);
      rings(ctx, 0, 0, clamp01(k1 * 1.15), C.line, 0.55, 0.62); ctx.restore();
      ctx.translate(CREST[3][0] - 5, CREST[3][1]); ctx.rotate(Math.atan2(CREST[3][1] - CREST[2][1], CREST[3][0] - CREST[2][0]));
      rings(ctx, 0, 0, 0.02 + 0.96 * clamp01(k1), C.line, 0.62, 0.8);
    }
    ctx.restore();
    if (p > 0.22 && p < 0.97){                            // two little notes float up from the crest
      const tx = S.hx + ((CREST[3][0] - 4) * hc - CREST[3][1] * hs) * HS, ty = S.hy + ((CREST[3][0] - 4) * hs + CREST[3][1] * hc) * HS;
      for (let j = 0; j < 2; j++){
        const u = (p - (j ? 0.56 : 0.22)) / 0.36;
        if (u <= 0 || u >= 1) continue;
        ctx.globalAlpha = Math.min(1, u * 6) * Math.min(1, (1 - u) * 3);
        note(ctx, tx - 16 - 34 * u - (j ? 10 : 0) + 5 * Math.sin(u * 9 + j), ty - 16 - 46 * u, 5.2 + 1.2 * j, (j ? 0.2 : -0.16) + 0.2 * Math.sin(u * 7), j ? C.spot : C.line);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    ctx.restore();
  }

  window.ParaRig = { draw, mouth, crestTip, HEIGHT: 215, WIDTH: 166, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 2.8,
                     WALK_CPS: 0.75, RUN_CPS: 1.5, COATS };
})();
