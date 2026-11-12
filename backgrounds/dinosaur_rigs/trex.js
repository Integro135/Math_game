/* ── trex.js — the T-REX (dinosaur rigs on the savanna kit, 2026-11) ────────
   A chubby, lovable tyrant in true profile: a HUGE round head with a short
   deep snout and a toothy grin (cream bumps under the lip), ONE big glossy
   eye under a soft brow, a blush; a barrel body carried level over two strong
   legs, a cream underside from chin to tail, soft spots down the back, a
   thick tail held out behind for balance, and two tiny two-fingered arms
   that wiggle.

   Legs: a BIPED on the kit's three-bone IK (hip → knee → ankle → toes): a
   big drumstick thigh, the knee forward, the ankle back, and a long foot with
   three round toes and cream claws, planted for the stance part of the cycle.
   WALK  = a proud stomp: high knees, a bob on every footfall, a head nod.
   L.run = a bounding jog: body tipped forward, tail streaming, a short flight.
   pose 0..1 = ROAR: a breath in, then the feet plant, the body leans forward,
   the tail lifts, the jaw drops wide (a real gap — cream teeth, pink tongue,
   dark only at the throat), the eye squeezes shut, the little arms shake and
   sound rings burst from the mouth. Proud and funny, not frightening.

   API — window.TrexRig { draw(ctx, L, t), mouth(L[, t]) → {x, y}, HEIGHT,
         WIDTH, STRIDE, RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   Depends only on ../savanna_rigs/kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, smooth, frac, lg, rg, alpha, palette, blob, bez, bezT, step, leg,
          eye, blink, brow, rings } = window.SavKit;
  const PI = Math.PI;

  // ── coats: back / light / shade, the cream underside, far-side limbs, spots
  const BASE = { eyeW: '#FFFDF6', pupil: '#1B1310', line: '#3A2A2E', tooth: '#FFFBEF', toothD: '#EFE3C8',
                 claw: '#FFF4DA', clawF: '#DCCDB0', mouth: '#6A2238', tongue: '#FF8FA6', cheek: '#FF8E98' };
  const mk = o => Object.assign({}, BASE, o);
  const PALS = {
    fern:   mk({ coat: '#7FCB6E', coatL: '#B4E596', coatD: '#57AE62', belly: '#FFF4D2', bellyD: '#F2DDA6',
                 far: '#4C9A5C', farD: '#3F8752', spot: '#4DA763', iris: '#C0701F' }),
    coral:  mk({ coat: '#FF937E', coatL: '#FFC0A8', coatD: '#EE6F6A', belly: '#FFF2DC', bellyD: '#F7DAB6',
                 far: '#D15F64', farD: '#BC5058', spot: '#E85F74', iris: '#8A5326', cheek: '#FF6E8C' }),
    teal:   mk({ coat: '#54C6C3', coatL: '#93E5DA', coatD: '#30A4AE', belly: '#F7FBE0', bellyD: '#DDEBBC',
                 far: '#2B8C9A', farD: '#237A88', spot: '#2E97AA', iris: '#C9801F' }),
    plum:   mk({ coat: '#B892E6', coatL: '#DBC1F7', coatD: '#926ACA', belly: '#FFF1F4', bellyD: '#F3D5E0',
                 far: '#7D5AB4', farD: '#6C4BA2', spot: '#875CC6', iris: '#B2621F', cheek: '#FF8CBC' }),
    butter: mk({ coat: '#FFD466', coatL: '#FFEC9F', coatD: '#F3AE45', belly: '#FFFAEA', bellyD: '#F7E3BA',
                 far: '#DB9731', farD: '#C78327', spot: '#F28E42', iris: '#8E5A22', cheek: '#FF8E7E' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'far', 'farD', 'spot'];

  // lean = how far the foot bone tips per unit of reach; sw = the swing fold
  // (the ankle swings up and BACK, as a bird's); snap < 1 = a quick lift-off
  const WALK = { stride: 100, duty: 0.64, lift: 23, lean: 92, sw: -0.6, snap: 1, hip: 0.14 };
  const RUN  = { stride: 190, duty: 0.4, lift: 28, lean: 90, sw: -0.9, snap: 0.7, hip: 0.34 };

  // the barrel, with the stump of the neck rising at the front (the head pivots on it)
  const BODY = [[72, -146], [70, -162], [54, -178], [32, -172], [12, -162], [-12, -161], [-37, -156], [-56, -141],
                [-65, -118], [-58, -92], [-36, -72], [-4, -63], [28, -68], [50, -86], [60, -110], [66, -130]];
  const CREAM = [[80, -166], [84, -134], [70, -100], [50, -76], [24, -58], [-8, -54], [-44, -64], [-68, -88], [-76, -112],
                 [-58, -108], [-34, -89], [-4, -81], [22, -86], [37, -102], [45, -123], [52, -144], [60, -164]];
  const SPOTS = [[-40, -144, 7, 4.4, -0.35], [-14, -151, 8.4, 4.8, -0.05], [10, -150, 6.4, 4, 0.1], [-26, -133, 4.4, 3, -0.2],
                 [-2, -138, 5, 3.2, 0], [28, -160, 5, 3.2, 0.5], [-50, -128, 3.6, 2.6, -0.5]];
  const TOP = -162, CY = -112, OX = 3;
  const HP = [-10, -92], FREST = 2, FAR = 17, FARF = 23, FOLD = -0.58, TOE = 9;
  const LEN = [36, 38, 27], LW = [58, 34, 19, 18];
  // the head: NK = where it pivots on the neck (body space); PIV = the same spot in head space
  const NK = [38, -158], PIV = [-22, 4], HS = 1.22, HX = -18, HY = 8;
  const SKULL = [[-30, 8], [-36, -8], [-33, -26], [-20, -39], [-1, -43], [16, -38], [27, -29.5], [37, -24], [46, -17], [51, -6],
                 [50, 4], [44, 10.5], [28, 12], [6, 12], [-14, 11]];
  const JAW = [[-26, 5], [-8, 8], [16, 9], [38, 8.5], [46, 12], [45, 20], [34, 27], [10, 30], [-12, 28], [-26, 18]];
  const CHIN = [[-32, 38], [-28, 19.5], [-8, 22.6], [14, 23.2], [32, 21], [50, 15], [58, 38]];
  const TONGUE = [[-6, 11], [0, 6], [12, 4.4], [24, 4.8], [31.5, 7.4], [28, 11.5], [10, 12]];
  const HSPOTS = [[-19, -27, 4.6, 3, -0.6], [-6, -34, 3.6, 2.4, -0.1], [-25, -13, 3.4, 2.4, -1.2]];
  const UTEETH = [12.5, 20, 27.5, 35, 42], LTEETH = [18, 25.6, 33.2, 40.4];
  const SHOULDER = [51, -106];

  // 'rgb(r,g,b)' × 2 → the mix, k of the second
  function mix(a, b, k){
    const p = a.match(/[\d.]+/g), q = b.match(/[\d.]+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  }
  // colours derived once per cached palette
  function derive(C, lit){
    const li = lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
    const warm = 'rgb(' + q(255 * li[0]) + ',' + q(244 * li[1]) + ',' + q(214 * li[2]) + ')';
    const rimC = mix(C.coatL, warm, 0.6), bl = C.cheek;
    return { rim: alpha(rimC, 0.8), rim0: alpha(rimC, 0), rimT: alpha(rimC, 0.45), blush: alpha(bl, 0.92), blush1: alpha(bl, 0.6), blush0: alpha(bl, 0),
             spot: alpha(C.spot, 0.55), brow: alpha(mix(C.coatD, C.line, 0.3), 0.85),
             smile: alpha(mix(C.coatD, C.line, 0.55), 0.8), nostril: alpha(C.line, 0.5), leg: mix(C.coat, C.coatD, 0.35), toe: mix(C.coat, C.coatD, 0.7),
             arm: mix(C.coat, C.coatD, 0.55), farL: mix(C.far, C.coatD, 0.45) };
  }
  // ── the pose, solved once per draw (and by mouth()): a SHARED scratch
  const S = { TP: [[0, 0], [0, 0], [0, 0], [0, 0]], ux: 0, uy: 0 };
  let lastT = 0;
  // a point of the head (head space) → unit space, through the head and body frames
  function toUnit(hx, hy){
    const ch = Math.cos(S.headRot), sh = Math.sin(S.headRot), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const x = (hx - PIV[0]) * HS, y = (hy - PIV[1]) * HS;
    const bx = NK[0] + x * ch - y * sh - HP[0], by = NK[1] + S.headY + x * sh + y * ch - HP[1];
    S.ux = HP[0] + bx * cp - by * sp + S.shx + OX; S.uy = HP[1] + bx * sp + by * cp + S.drop;
  }
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const run = S.run = L.run ? go : 0, cyc = S.cyc = (L.wt || 0) / TAU, G = S.G = L.run ? RUN : WALK;
    const p = S.p = clamp01(L.pose || 0);
    // ROAR: a breath in (wind), then the burst K with a tremble on it
    const K = S.K = p > 0 ? smooth(clamp01((p - 0.17) / 0.12)) * smooth(clamp01((1 - p) / 0.2)) : 0;
    const wind = S.wind = p > 0 ? Math.sin(clamp01(p / 0.3) * PI) * (1 - K) : 0;
    const shake = S.shake = K * Math.sin(p * TAU * 13);
    let drop, pitch, nod;
    if (L.run){
      drop = go * (4 + 6 * Math.cos(2 * TAU * (cyc - G.duty / 2)));    // sinks in mid-stance, sails through the flight
      pitch = go * (0.15 + 0.03 * Math.sin(2 * TAU * (cyc - 0.08)));
      nod = go * (-0.06 + 0.035 * Math.cos(2 * TAU * (cyc - 0.2)));
    } else {
      drop = go * (1.4 + 3.2 * Math.cos(2 * TAU * (cyc - 0.09)));       // the stomp: lowest just after each footfall
      pitch = go * (-0.025 + 0.02 * Math.cos(2 * TAU * (cyc - 0.12)));  // chest out, a dip on every step
      nod = go * 0.075 * Math.cos(2 * TAU * (cyc - 0.17));
    }
    const br = Math.sin(t * 1.2 + ph);
    S.breathe = 1 + br * 0.011; S.headY = -br * 0.9;
    S.drop = drop + 5.5 * K - 3 * wind + 0.8 * shake;
    S.pitch = pitch + 0.17 * K - 0.07 * wind;
    S.shx = 3 * K - 2 * wind;
    S.headRot = Math.sin(t * 0.55 + ph) * 0.03 + nod - 0.46 * K - 0.1 * wind + 0.012 * shake;
    S.jaw = K * (0.78 + 0.05 * Math.sin(p * TAU * 13 + 1)) + 0.05 * wind;
    S.shut = clamp01(K * 1.7);                                          // the eye squeezes shut
    // tail: held out behind, a slow wave down its length; it streams when running, lifts for the roar
    const w1 = Math.sin(t * 1.3 + ph), w2 = Math.sin(t * 1.3 + ph - 1.1);
    const sw = go * Math.sin(TAU * cyc * 2 + 1.2) * (1 - 0.5 * run), fl = run * Math.sin(t * 9 + ph) * 1.6;
    const up = 17 * K + 9 * run - 6 * wind, TP = S.TP;
    TP[0][0] = -44; TP[0][1] = -118;
    TP[1][0] = -76; TP[1][1] = -123 - up * 0.25;
    TP[2][0] = -104 - 3 * run; TP[2][1] = -121 + w2 * 2.5 + sw * 2 - up * 0.75 + fl * 0.5;
    TP[3][0] = -130 - 6 * run + 6 * K; TP[3][1] = -126 + w1 * 6 + sw * 4.5 - up * 1.6 + fl + 4 * shake;
    // the little arms: a fidget, a pump with the stride, a shake for the roar
    S.arm = Math.sin(t * 2.3 + ph) * 0.1 + go * Math.sin(TAU * cyc * 2 + 0.4) * 0.16 - 0.75 * K + 0.3 * wind + 0.22 * shake;
    S.fore = 0.12 * Math.sin(t * 3.1 + ph * 1.7) + 0.3 * K - 0.25 * K * Math.sin(p * TAU * 13 + 0.8);
    // the mouth: midway between the lip tips
    const cj = Math.cos(S.jaw), sj = Math.sin(S.jaw);
    const lx = HX + (45 - HX) * cj - (12 - HY) * sj, ly = HY + (45 - HX) * sj + (12 - HY) * cj;
    S.mhx = (46 + lx) / 2; S.mhy = (10 + ly) / 2;
  }
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    toUnit(S.mhx, S.mhy);
    return { x: L.x + S.ux * L.s * (L.dir || 1), y: L.y + S.uy * L.s };
  }
  // a row of soft cream tooth bumps along y, pointing dir (+1 = down, −1 = up)
  function teeth(g, C, xs, y, h, dir){
    g.fillStyle = C.tooth; g.beginPath();
    for (let i = 0; i < xs.length; i++){
      const x = xs[i], w = 3.75, yy = y - (dir > 0 ? Math.max(0, x - 30) * 0.1 : 0);
      g.moveTo(x - w, yy); g.bezierCurveTo(x - w * 0.95, yy + dir * h * 1.3, x + w * 0.95, yy + dir * h * 1.3, x + w, yy);
    }
    g.fill();
  }
  // a rim light along the top of a silhouette: the path stroked inside its
  // own clip, fading out between y0 and y1 (so it never ends in a step)
  function rimFade(g, C, pathFn, y0, y1, w){
    g.save(); pathFn(); g.clip();
    g.strokeStyle = lg(g, 0, y0, 0, y1, [[0, C.x.rim], [1, C.x.rim0]]); g.lineWidth = w * 2; g.lineJoin = 'round';
    g.stroke(); g.restore();
  }
  function blush(g, C, x, y, r, sq){
    g.save(); g.translate(x, y); g.scale(1, sq);
    g.fillStyle = rg(g, 0, 0, 0, r, [[0, C.x.blush], [0.55, C.x.blush1], [1, C.x.blush0]]);
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  }
  function spots(g, col, list){
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i < list.length; i++){
      const s = list[i]; g.moveTo(s[0] + s[2], s[1]); g.ellipse(s[0], s[1], s[2], s[3], s[4], 0, TAU);
    }
    g.fill();
  }

  // ── the head, in head space: skull centre (0,0), snout toward +x. The lower
  //    jaw hinges at (HX, HY) by S.jaw; the gap between the jaws stays EMPTY —
  //    only the throat wedge back at the hinge is dark.
  function drawHead(g, C, t){
    const K = S.K, J = S.jaw, ph = S.ph, open = J > 0.03;
    if (open){
      const d = 27, cj = Math.cos(J), sj = Math.sin(J);
      const ux = HX + d, uy = 9.5, lx = HX + d * cj - 3 * sj, ly = HY + d * sj + 3 * cj;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 6, HY - 2); g.lineTo(ux, uy);
      g.quadraticCurveTo((ux + lx) / 2 - 10 * K, (uy + ly) / 2, lx, ly);
      g.lineTo(HX - 6, HY + 4); g.closePath(); g.fill();
    }
    g.save();                                             // the lower jaw on its hinge
    g.translate(HX, HY); g.rotate(J); g.translate(-HX, -HY);
    if (open){                                            // tongue and lower teeth ride on it
      g.fillStyle = C.tongue;
      TONGUE[2][1] = 4.4 - 1.2 * K; TONGUE[3][1] = 4.8 - 1.4 * K;
      blob(g, TONGUE, 5); g.fill();
      teeth(g, C, LTEETH, 10.8, 7, -1);
    }
    const jaw = () => blob(g, JAW, 5.5);
    g.fillStyle = lg(g, 0, 8, 0, 30, [[0, C.coat], [1, C.coatD]]);
    jaw(); g.fill();
    g.save(); jaw(); g.clip();                            // the cream chin
    g.fillStyle = lg(g, 0, 16, 0, 31, [[0, C.belly], [1, C.bellyD]]);
    blob(g, CHIN, 5.5); g.fill();
    g.restore();
    g.restore();
    teeth(g, C, UTEETH, 9.4, 8.6, 1);                     // the grin: bumps under the lip
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -43, 0, 12, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    spots(g, C.x.spot, HSPOTS);
    rimFade(g, C, skull, -40, -4, 1.5);
    blush(g, C, -2, 1, 10.5, 0.66);
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(41.5, -10.5, 2.3, 1.4, -0.5, 0, TAU); g.fill();
    if (J < 0.12){                                        // the corner of the smile
      g.strokeStyle = C.x.smile; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(4, 11.6); g.quadraticCurveTo(-5.5, 11.6, -9.5, 5.4); g.stroke();
    }
    // ONE big eye; it squeezes shut into a happy arc for the roar
    if (S.shut > 0.62){
      g.strokeStyle = C.line; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.4, -13.5); g.quadraticCurveTo(9.5, -26, 18.6, -14.5);
      g.moveTo(-1.6, -15.5); g.lineTo(-5.6, -18.4); g.moveTo(-1.2, -12); g.lineTo(-5.4, -10.4);
      g.stroke();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 1.45 * S.shut);
      eye(g, 9, -17, 9.4, 10.6, eyeH, Math.sin(t * 0.3 + ph) * 0.5 + 0.25, C, { iris: 0.8, lid: 1.6 });
    }
    brow(g, C.x.brow, -1.5, -30 - 1.5 * K, 8, -36 - 2.5 * K, 18.5, -31.5 - 0.5 * K, 2.2);
  }
  // a little cream claw at (x, y) pointing along angle a, curling down; r = its length
  function claw(g, x, y, a, r){
    const c = Math.cos(a), s = Math.sin(a);
    g.moveTo(x + (-0.1 * c + 0.48 * s) * r, y + (-0.1 * s - 0.48 * c) * r);
    g.quadraticCurveTo(x + (0.7 * c + 0.4 * s) * r, y + (0.7 * s - 0.4 * c) * r, x + (1 * c - 0.34 * s) * r, y + (1 * s + 0.34 * c) * r);
    g.quadraticCurveTo(x + (0.5 * c - 0.5 * s) * r, y + (0.5 * s + 0.5 * c) * r, x + (-0.1 * c - 0.46 * s) * r, y + (-0.1 * s + 0.46 * c) * r);
    g.closePath();
  }

  // ── the foot, in foot space: the toe joint at (0,0), the ground on y = TOE.
  //    Three chubby round toes lying forward — seen a little from above, so
  //    the far one sits a step higher and darker, the near one lowest and
  //    lightest — each tipped with a cream claw.
  const TOES = [[-0.14, 22], [0.01, 28.5], [0.1, 21]];                   // angle, length (far, middle, near)
  function foot(g, C, x, y, rot, far){
    const bx = -3, by = TOE - 8.4, r0 = 8.4, r1 = 6.3;
    g.save(); g.translate(x, y); g.rotate(rot);
    for (let i = 0; i < 3; i++){
      const a = TOES[i][0], c = Math.cos(a), s = Math.sin(a), tx = bx + c * TOES[i][1], ty = by + s * TOES[i][1];
      g.fillStyle = far ? (i === 0 ? C.farD : i === 1 ? C.far : C.x.farL) : (i === 0 ? C.far : i === 1 ? C.x.toe : C.x.leg);
      g.beginPath(); g.moveTo(bx + s * r0, by - c * r0); g.lineTo(tx + s * r1, ty - c * r1);
      g.arc(tx, ty, r1, a - PI / 2, a + PI / 2); g.lineTo(bx - s * r0, by + c * r0);
      g.arc(bx, by, r0, a + PI / 2, a + PI * 1.5); g.fill();
      g.fillStyle = far ? C.clawF : C.claw;
      g.beginPath(); claw(g, tx + c * 3.2, ty + s * 3.2 + 0.6, a + 0.3 - i * 0.12, 8.6); g.fill();
    }
    g.restore();
  }

  // ── a tiny arm from the shoulder (0,0): the upper arm hangs down and a
  //    little back, the forearm reaches forward, and a hand of two fingers
  //    tipped with cream claws. a1 = the shoulder's swing (− = up and
  //    forward), a2 = the elbow.
  function arm(g, C, a1, a2, far){
    g.save(); g.rotate(a1); g.scale(1.14, 1.14);
    g.strokeStyle = far ? C.far : C.x.arm; g.lineCap = 'round';
    g.lineWidth = 9.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(-1.5, 11.5); g.stroke();
    g.translate(-1.5, 11.5); g.rotate(a2);
    g.lineWidth = 7.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(10.5, 2.4); g.stroke();
    g.translate(10.5, 2.4);
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, -1); g.lineTo(5.2, -3.6); g.moveTo(0.4, 1); g.lineTo(5.8, 2.2); g.stroke();
    g.fillStyle = far ? C.clawF : C.claw;
    g.beginPath(); claw(g, 5.4, -3.8, -0.2, 5); claw(g, 6, 2.2, 0.5, 5); g.fill();
    g.restore();
  }

  // ── the tail: a thick tapered tube along the Bezier S.TP, with the cream
  //    underside, spots along the top and the rim light. E = scratch edges
  //    (top x, top y, bottom x, bottom y per sample).
  const TN = 16, E = new Float32Array((TN + 1) * 4), TSPOT = [0.2, 0.36, 0.5, 0.63, 0.75];
  const tailW = u => 52 - 36 * Math.pow(u, 1.3);
  function tail(g, C, coatG, bellyG){
    const TP = S.TP;
    for (let i = 0; i <= TN; i++){
      const u = i / TN, p = bez(TP, u), d = bezT(TP, u), l = Math.hypot(d[0], d[1]) || 1;
      const w = tailW(u) / 2, nx = d[1] / l, ny = -d[0] / l, k = i * 4;       // n points to the underside
      E[k] = p[0] - nx * w; E[k + 1] = p[1] - ny * w; E[k + 2] = p[0] + nx * w; E[k + 3] = p[1] + ny * w;
    }
    const tip = bez(TP, 1);
    g.fillStyle = coatG; g.beginPath(); g.moveTo(E[0], E[1]);
    for (let i = 1; i <= TN; i++) g.lineTo(E[i * 4], E[i * 4 + 1]);
    for (let i = TN; i >= 0; i--) g.lineTo(E[i * 4 + 2], E[i * 4 + 3]);
    g.closePath(); g.moveTo(tip[0] + tailW(1) / 2, tip[1]); g.arc(tip[0], tip[1], tailW(1) / 2, 0, TAU, true); g.fill();
    g.fillStyle = bellyG; g.beginPath(); g.moveTo(E[2], E[3]);            // the cream underside
    for (let i = 1; i <= TN; i++) g.lineTo(E[i * 4 + 2], E[i * 4 + 3]);
    for (let i = TN; i >= 0; i--){
      const k = i * 4, f = 0.4 * (1 - Math.pow(i / TN, 3));
      g.lineTo(E[k + 2] + (E[k] - E[k + 2]) * f, E[k + 3] + (E[k + 1] - E[k + 3]) * f);
    }
    g.closePath(); g.fill();
    g.fillStyle = C.x.spot; g.beginPath();
    for (let j = 0; j < TSPOT.length; j++){
      const u = TSPOT[j], p = bez(TP, u), d = bezT(TP, u), l = Math.hypot(d[0], d[1]) || 1, w = tailW(u) * 0.24;
      const x = p[0] - d[1] / l * w, y = p[1] + d[0] / l * w, r = 5.6 - 3.6 * u;
      g.moveTo(x + r, y); g.ellipse(x, y, r, r * 0.62, Math.atan2(d[1], d[0]), 0, TAU);
    }
    g.fill();
    g.strokeStyle = C.x.rimT; g.lineWidth = 1.8; g.lineCap = 'butt'; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < TN; i++){
      const k = i * 4, x = E[k] + (E[k + 2] - E[k]) * 0.03, y = E[k + 1] + (E[k + 3] - E[k + 1]) * 0.03 + 0.4;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  function draw(ctx, L, t){
    const C = palette(PALS[L.coat] || PALS.fern, TINTED, L.tint, L.lit);
    if (!C.x) C.x = derive(C, L.lit);
    solve(L, t); lastT = t;
    const g = ctx, go = S.go, G = S.G;

    g.save();
    g.translate(L.x, L.y);
    g.scale(L.s * (L.dir || 1), L.s);
    g.translate(OX, 0);
    const coatG = lg(g, 0, TOP, 0, -64, [[0, C.coatL], [0.42, C.coat], [1, C.coatD]]);
    const bellyG = lg(g, 0, -150, 0, -62, [[0, C.belly], [1, C.bellyD]]);
    const legG = lg(g, 0, -120, 0, 0, [[0, C.coat], [0.5, C.x.leg], [1, C.coatD]]);

    function oneLeg(far){
      const st = step(S.cyc + (far ? 0.5 : 0), G.duty);
      const reach = st.x * G.stride * go, lift = Math.pow(st.lift, G.snap) * G.lift * go;
      const swing = st.sw ? Math.sin(PI * st.sw) * go : 0, frot = swing * (0.9 - 1.5 * st.sw);
      const rx = HP[0] + (far ? FAR : 0) + S.shx + reach * G.hip, ry = HP[1] + S.drop;
      const fold = FOLD - reach / G.lean + swing * G.sw;
      const ch = leg(g, rx, ry, FREST + (far ? FARF : 0) + reach, -lift - TOE, LEN[0], LEN[1], LEN[2], LW, 1, fold, far ? C.far : legG);
      foot(g, C, ch[3][0], ch[3][1], frot, far);            // toes droop as it lifts, then reach up to land
    }
    const bodyFrame = () => { g.translate(S.shx, S.drop); g.translate(HP[0], HP[1]); g.rotate(S.pitch); g.translate(-HP[0], -HP[1]); };

    oneLeg(true);                                         // far leg, behind

    // ── far arm, tail, then the barrel with its cream underside and spots
    g.save(); bodyFrame();
    g.save(); g.translate(SHOULDER[0] + 8, SHOULDER[1] - 2); arm(g, C, S.arm * 0.85 - 0.14, S.fore * 0.8, true); g.restore();
    tail(g, C, coatG, bellyG);
    g.translate(0, CY); g.scale(1, S.breathe); g.translate(0, -CY);
    const body = () => blob(g, BODY, 5.5);
    g.fillStyle = coatG; body(); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = bellyG; blob(g, CREAM, 5.5); g.fill();
    g.restore();
    spots(g, C.x.spot, SPOTS);
    rimFade(g, C, body, TOP - 6, -126, 2);
    g.restore();

    oneLeg(false);                                        // near leg: the drumstick, over the body

    // ── head (jaws, teeth, eye), sound rings, and the near arm on the chest
    g.save(); bodyFrame();
    g.save();
    g.translate(NK[0], NK[1] + S.headY); g.rotate(S.headRot); g.scale(HS, HS); g.translate(-PIV[0], -PIV[1]);
    drawHead(g, C, t);
    if (S.p > 0.2 && S.p < 0.84){                         // ROAR · ROAR · ROAR
      g.translate(S.mhx, S.mhy); g.rotate(S.jaw * 0.5 - 0.05);
      const rk = 0.02 + 0.96 * frac((S.p - 0.2) / 0.213);
      rings(g, 6.4, 0, rk, C.eyeW, 0.62, 1.55);           // a light twin, so they show against a night sky too
      rings(g, 4, 0, rk, C.line, 0.62, 1.55);
    }
    g.restore();
    g.translate(SHOULDER[0], SHOULDER[1]); arm(g, C, S.arm, S.fore, false);
    g.restore();
    g.restore();
  }

  window.TrexRig = { draw, mouth, HEIGHT: 215, WIDTH: 136, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 2.6,
                     WALK_CPS: 0.72, RUN_CPS: 1.45, COATS };
})();
