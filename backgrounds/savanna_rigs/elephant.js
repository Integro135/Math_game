/* ── elephant.js — the ELEPHANT, drawn from scratch (v2, 2026-11) ───────────
   A big soft blue-grey elephant in true profile: a high domed back on four
   thick column legs (round feet, three pale toenails each), a large domed
   head with ONE glossy eye and lashes, one big African ear lying over the
   shoulder (pink-lilac inside; the far ear peeks out behind the head), a
   short cream tusk, a small smiling mouth tucked under the trunk, a thin tail
   with a dark tuft. The TRUNK is the star: a long tapered tube along two
   joined Beziers (the hang + the curled tip) whose control points are
   animated — it hangs in an S, swings with the walk, and has soft creases.

   Legs: three bones placed by IK (kit.js). WALK = an amble (lateral sequence,
   never fewer than two feet down). L.run = a fast amble — an elephant never
   leaves the ground — with flapping ears and a bouncing trunk. pose 0..1 =
   TRUMPET: the head tips up, the trunk swings high into an S above the head,
   the mouth opens (a real gap, pink tongue), the ears fan wide, the tail
   flies, sound rings burst from the trunk tip.

   Cheap to draw: no clips, no blur, no offscreen work. The light rims are
   the same shape filled a hair higher; the leg shade is one more fill of the
   leg's own path; the pale underside lives in the body's gradient.

   API — window.ElephantRig { draw(ctx, L, t), HEIGHT, WIDTH, STRIDE, RUN_STRIDE,
                              ACT_SECONDS, WALK_CPS, RUN_CPS }
   HEIGHT = ground → top of the head; WIDTH = half the tail-to-trunk span at
   rest. The trumpet reaches past both: the trunk tip tops out about 262 units
   up (the rings a little higher) and about 12 units beyond WIDTH in front.
   WALK_CPS / RUN_CPS = natural gait cycles per second (a slow heavy cadence).
   Depends only on kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, alpha, palette, blob, bez, bezT, taper, limbPath, step, leg, xf,
          eye, blink, brow, rings, bowtie, ribbon } = window.SavKit;
  // mix two of the palette's 'rgb(r,g,b)' strings (only run once per cached palette)
  const mix = (a, b, k) => {
    const p = a.match(/\d+/g), q = b.match(/\d+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  };

  const PAL = { coat: '#A8B4CE', coatL: '#C9D2E6', coatD: '#8B8FB6', belly: '#D6D4EA', far: '#7C83A8',
                earIn: '#E2B8D2', earInD: '#BC94BE', tusk: '#FFF7E0', tuskD: '#E9D6AE', nail: '#F6EEDC', nailF: '#B9B6C6',
                tuft: '#474360', eyeW: '#FFF8EC', iris: '#7A4E2C', pupil: '#17100C', line: '#3A3554',
                mouth: '#5A1F2A', tongue: '#EE8089' };
  const COAT = ['coat', 'coatL', 'coatD', 'belly', 'far'];
  // off[] = near hind, near front, far hind, far front — a LATERAL sequence:
  // each hind foot is followed by the front foot of the same side
  const WALK = { stride: 104, duty: 0.70, lift: 12, off: [0, 0.75, 0.5, 0.25], bob: 1.5, sink: 0, fsw: 0.5, hsw: 0.42 };
  const RUN  = { stride: 150, duty: 0.56, lift: 17, off: [0, 0.80, 0.5, 0.30], bob: 2.6, sink: 3, fsw: 0.85, hsw: 0.7 };

  const OX = 40;                                          // the art sits back of the origin so the trunk fits the half-width
  const BODY = [[68, -116], [72, -150], [56, -180], [22, -193], [-20, -193], [-56, -182], [-78, -156], [-82, -122],
                [-70, -90], [-36, -77], [4, -73], [40, -78], [63, -94]];
  const TOP = -193, CY = -130, SH = [36, -104], HP = [-43, -106], FREST = 38, HREST = -50, FAR = 12;
  const FL = [29, 40.2, 20], HL = [37, 34.3, 20], FW = [44, 35, 30, 31], HW = [48, 37, 30, 31], FR = 15.5;
  const HEAD = [84, -160], HS = 1.16;
  const SKULL = [[-30, 8], [-33, -12], [-25, -30], [-8, -40], [12, -40], [28, -31], [37, -15], [40, 4], [34, 19], [17, 25], [0, 26], [-18, 22]];
  const JAW = [[0, 20], [10, 21], [18, 26], [22, 33], [18, 36], [10, 33], [2, 28]];
  const EAR = [[-9, -17], [-19, -33], [-40, -38], [-60, -31], [-72, -12], [-72, 11], [-62, 31], [-47, 45], [-33, 50], [-22, 39], [-14, 20], [-10, 2]];
  const EARIN = EAR.map(p => [-39 + (p[0] + 39) * 0.68, 6 + (p[1] - 6) * 0.7]);
  // the trunk, in head space: [A0, A1, A2, A3] = the main Bezier, then the
  // tip's two last control points as offsets from A3 (its first continues the
  // main curve's tangent). HANG = at rest, an S with a curled tip; UP = trumpet.
  const HANG = [[26, 2], [60, 30], [34, 64], [38, 92], [20, 22], [30, 8]];
  const UP   = [[26, 2], [60, 29], [88, 8], [85, -16], [-4, -20], [16, -28]];
  const TW0 = 38, TW1 = 12, NA = 16, NB = 9, NT = NA + NB;
  // the trunk's sampled spine (SHARED scratch): x, y, unit normal, half-width
  const TX = new Float32Array(NT + 1), TY = new Float32Array(NT + 1), TNX = new Float32Array(NT + 1),
        TNY = new Float32Array(NT + 1), TW = new Float32Array(NT + 1);
  const TC = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
  const TUSK = [[23, 14], [32, 25], [44, 29], [54, 22]], NAILS = [15.5, 8, 0.5], WRINKLES = [-4, 1, 6];

  // a round foot on the last joint (x, y): a flat sole … (adds a sub-path,
  // wound like limbPath's, so leg + foot can be filled as one shape)
  function footPath(g, x, y, rot){
    const c = Math.cos(rot), s = Math.sin(rot), R = FR;
    const X = (px, py) => x + px * c - py * s, Y = (px, py) => y + px * s + py * c;
    g.moveTo(X(-15, -9), Y(-15, -9)); g.lineTo(X(15, -9), Y(15, -9));
    g.quadraticCurveTo(X(20, 4), Y(20, 4), X(20, 11), Y(20, 11));
    g.quadraticCurveTo(X(20, R), Y(20, R), X(15, R), Y(15, R));
    g.lineTo(X(-13, R), Y(-13, R));
    g.quadraticCurveTo(X(-18, R), Y(-18, R), X(-17.5, 10), Y(-17.5, 10));
    g.quadraticCurveTo(X(-17, 0), Y(-17, 0), X(-15, -9), Y(-15, -9));
    g.closePath();
  }
  // … and three pale toenails in front
  function nails(g, x, y, rot, col){
    const c = Math.cos(rot), s = Math.sin(rot);
    g.fillStyle = col; g.beginPath();
    for (const nx of NAILS){
      const cx = x + nx * c - FR * s, cy = y + nx * s + FR * c;
      g.moveTo(cx, cy); g.ellipse(cx, cy, 3.5, 5.6, rot, Math.PI, TAU);
    }
    g.fill();
  }

  // one ear, in head space; fan = how far it is spread (scales it out from its front hinge)
  function ear(g, C, fan, rot, far){
    g.save(); g.translate(-9, -4); g.rotate(rot); g.scale(fan, 1); g.translate(9, 4);
    const path = () => blob(g, EAR, 5.5);
    if (far){ g.fillStyle = C.far; path(); g.fill(); g.restore(); return; }
    g.fillStyle = C.x.rim; g.translate(0, -1.7); path(); g.fill(); g.translate(0, 1.7);   // the light rim: the same shape, a hair higher
    g.fillStyle = lg(g, 0, -38, 0, 50, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    path(); g.fill();
    g.fillStyle = lg(g, -62, 0, -18, 0, [[0, C.earInD], [0.6, C.earIn], [1, C.earIn]]);
    g.globalAlpha = 0.8; blob(g, EARIN, 5.5); g.fill(); g.globalAlpha = 1;
    g.restore();
  }

  // the trunk: sample the two joined Beziers into the scratch spine, then the
  // tube, a lighter underside, creases and the tip. Leaves the spine for the caller.
  function trunk(g, C, fill){
    const A = [TC[0], TC[1], TC[2], TC[3]];
    const b1 = [TC[3][0] + (TC[3][0] - TC[2][0]) * 0.5, TC[3][1] + (TC[3][1] - TC[2][1]) * 0.5];
    const B = [TC[3], b1, [TC[3][0] + TC[4][0], TC[3][1] + TC[4][1]], [TC[3][0] + TC[5][0], TC[3][1] + TC[5][1]]];
    for (let i = 0; i <= NT; i++){
      const Q = i <= NA ? A : B, u = i <= NA ? i / NA : (i - NA) / NB, p = bez(Q, u), d = bezT(Q, u), l = Math.hypot(d[0], d[1]) || 1;
      TX[i] = p[0]; TY[i] = p[1]; TNX[i] = d[1] / l; TNY[i] = -d[0] / l;
      TW[i] = (TW0 + (TW1 - TW0) * Math.pow(i / NT, 0.85)) / 2;
    }
    g.fillStyle = fill; g.beginPath();
    g.moveTo(TX[0] + TNX[0] * TW[0], TY[0] + TNY[0] * TW[0]);
    for (let i = 1; i <= NT; i++) g.lineTo(TX[i] + TNX[i] * TW[i], TY[i] + TNY[i] * TW[i]);
    for (let i = NT; i >= 0; i--) g.lineTo(TX[i] - TNX[i] * TW[i], TY[i] - TNY[i] * TW[i]);
    g.closePath();
    g.moveTo(TX[0] + TW[0], TY[0]); g.arc(TX[0], TY[0], TW[0], 0, TAU);
    g.moveTo(TX[NT] + TW[NT], TY[NT]); g.arc(TX[NT], TY[NT], TW[NT], 0, TAU);
    g.fill();
    g.fillStyle = C.x.under; g.beginPath();               // a lighter band along the underside
    g.moveTo(TX[0] - TNX[0] * TW[0] * 0.99, TY[0] - TNY[0] * TW[0] * 0.99);
    for (let i = 1; i <= NT; i++) g.lineTo(TX[i] - TNX[i] * TW[i] * 0.99, TY[i] - TNY[i] * TW[i] * 0.99);
    for (let i = NT; i >= 0; i--) g.lineTo(TX[i] - TNX[i] * TW[i] * 0.42, TY[i] - TNY[i] * TW[i] * 0.42);
    g.closePath(); g.fill();
    g.strokeStyle = C.x.crease; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath();
    for (let i = 6; i <= NT - 2; i += 3){                 // soft creases over the top side
      const w = TW[i], nx = TNX[i], ny = TNY[i];
      g.moveTo(TX[i] + nx * w * 0.95, TY[i] + ny * w * 0.95);
      g.quadraticCurveTo(TX[i] + nx * w * 0.4 - ny * 3, TY[i] + ny * w * 0.4 + nx * 3, TX[i] - nx * w * 0.25, TY[i] - ny * w * 0.25);
    }
    g.stroke();
    const a = Math.atan2(TNX[NT], -TNY[NT]);              // the tip's heading
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(TX[NT] + Math.cos(a) * 3.4, TY[NT] + Math.sin(a) * 3.4, 2, TW1 * 0.32, a, 0, TAU); g.fill();
    return a;
  }

  // the head, in head space: skull centre (0,0), face toward +x. K = trumpet.
  // Returns the trunk tip's heading (the spine scratch holds its place).
  function drawHead(g, C, L, t, K, earFan, earRot){
    const ph = L.ph || 0, jaw = 0.8 * K, HX = 6, HY = 23;
    const headG = lg(g, 0, -40, 0, 96, [[0, C.coatL], [0.4, C.coat], [1, C.coatD]]);
    if (K > 0.03){                                        // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw);
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2, HY - 3); g.lineTo(16.5, 22);
      g.lineTo(HX + 8 * c, HY + 8 * s + 2); g.lineTo(HX - 2, HY + 4); g.closePath(); g.fill();
    }
    g.save();                                             // lower lip on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    g.fillStyle = headG; blob(g, JAW, 5); g.fill();
    if (K > 0.08){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(13, 25.6, 7, 1.4 + 1.8 * K, 0.55, 0, TAU); g.fill(); }
    g.restore();
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = C.x.rim; g.translate(0, -1.7); skull(); g.fill(); g.translate(0, 1.7);   // the light rim, under the trunk's root
    const tipA = trunk(g, C, headG);
    g.fillStyle = headG; skull(); g.fill();
    if (K < 0.2){                                         // the smile, tucked under the trunk
      g.strokeStyle = C.x.smile; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(21, 30); g.quadraticCurveTo(13, 27, 8.4, 22.4); g.quadraticCurveTo(6.4, 20.4, 6.4, 18); g.stroke();
    }
    // a short cream tusk beside the trunk, its root under a fold of the cheek
    taper(g, TUSK, 9, 3.2, lg(g, 22, 12, 52, 28, [[0, C.tuskD], [0.4, C.tusk], [1, C.tusk]]), { steps: 10 });
    g.fillStyle = headG; g.beginPath(); g.ellipse(21, 11.5, 9, 7, 0.85, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(9, 9.6, 7.5, 4.6, 0.1, 0, TAU); g.fill();
    // ONE eye, with lashes; it squeezes shut for the trumpet
    if (K > 0.5){                                         // … into a happy arc
      g.strokeStyle = C.line; g.lineWidth = 1.9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(8.8, -5.4); g.quadraticCurveTo(15, -12.6, 21.4, -5.8); g.stroke();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 1.6 * K);
      eye(g, 15, -8, 6.4, 7.4, eyeH, Math.sin(t * 0.3 + ph) * 0.5, C, { iris: 0.84, lid: 1.5 });
    }
    g.strokeStyle = C.line; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(9.4, -12); g.lineTo(6.2, -15); g.moveTo(11, -14.4); g.lineTo(8.8, -18.2); g.moveTo(13.6, -15.8); g.lineTo(12.6, -19.8); g.stroke();
    brow(g, C.x.brow, 10, -22.5 - 2 * K, 17, -26 - 2 * K, 23.5, -21.5, 1.6);
    ear(g, C, earFan, earRot, false);
    if (L.ribbon) ribbon(g, 7, -41.5, 9, -0.1);
    return tipA;
  }

  function draw(ctx, L, t){
    const C = palette(PAL, COAT, L.tint, L.lit);
    if (!C.x){                                            // derived colours, once per cached palette
      const li = L.lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
      C.x = { under: alpha(C.belly, 0.4), crease: alpha(C.line, 0.2), nostril: alpha(C.line, 0.4),
              smile: alpha(C.line, 0.6), brow: alpha(C.line, 0.7), wr: alpha(C.line, 0.2),
              sh0: alpha(C.far, 0), sh1: alpha(C.far, 0.45),
              // the warm light rim along the top edges (the kit's amber reads as an outline on blue)
              rim: mix(C.coatL, 'rgb(' + q(255 * li[0]) + ',' + q(238 * li[1]) + ',' + q(218 * li[2]) + ')', 0.55),
              // the body's own gradient stops: the coat with the lighter underside folded in
              b1: mix(C.coatL, C.coat, 0.82), b2: mix(mix(C.coat, C.coatD, 0.17), C.belly, 0.5),
              b3: mix(mix(C.coat, C.coatD, 0.31), C.belly, 0.7) };
    }
    const ph = L.ph || 0, go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = L.run ? RUN : WALK, cyc = (L.wt || 0) / TAU, run = L.run ? go : 0;
    const K = L.pose ? Math.sin(clamp01(L.pose) * Math.PI) : 0;
    const drop = go * (G.bob * Math.sin(2 * TAU * cyc + 0.6) + G.sink);
    const pitch = go * 0.012 * Math.sin(TAU * cyc + 1) - 0.05 * K;      // the slow heavy sway
    const breathe = 1 + Math.sin(t * 1.0 + ph) * 0.008;
    const nod = go * Math.sin(2 * TAU * cyc + 1.4) * (0.025 + 0.02 * run);
    const headRot = Math.sin(t * 0.5 + ph) * 0.02 + nod - 0.42 * K;
    // ears: a slow fan at idle, flapping on the run, spread wide to trumpet
    const flap = Math.sin(t * 0.7 + ph) * 0.5 + 0.5;
    const earFan = 0.87 + 0.13 * flap + run * 0.16 * Math.sin(2 * TAU * cyc) + K * (0.3 + 0.03 * Math.sin(t * 19));
    const earRot = 0.03 * flap + 0.4 * K + run * 0.05 * Math.sin(2 * TAU * cyc + 0.8);
    // the trunk's control points: hang ↔ trumpet, a pendulum swing with the walk
    const e = smooth(clamp01(K * 1.15)), mid = 4 * e * (1 - e);
    const sw = (Math.sin(t * 0.8 + ph) * 0.45 + go * Math.sin(TAU * cyc * (L.run ? 2 : 1) + 0.8) * (1 + 0.5 * run)) * (1 - e);
    for (let i = 0; i < 6; i++){ TC[i][0] = lerp(HANG[i][0], UP[i][0], e); TC[i][1] = lerp(HANG[i][1], UP[i][1], e); }
    TC[1][0] += 2 * sw; TC[2][0] += 7 * sw + 20 * mid; TC[2][1] += 10 * mid; TC[3][0] += 12 * sw + 36 * mid; TC[3][1] += 14 * mid;
    TC[4][0] += 2 * sw; TC[5][0] += 4 * sw; TC[5][1] -= 2 * Math.abs(sw) + run * 4 * Math.sin(2 * TAU * cyc);

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(-OX, 0);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.coatL], [0.45, C.coat], [1, C.coatD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = st.x * G.stride * go, lift = st.lift * G.lift * go * (hind ? 0.85 : 1);
      const swing = st.sw ? Math.sin(Math.PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR * 0.6 : 0), root[1], 0, CY, pitch, reach * 0.25, drop);
      const fold = -reach / 150 + swing * (hind ? G.hsw : G.fsw);
      const fx = (hind ? HREST : FREST) + (far ? FAR : 0) + reach, fy = -lift - FR;
      // a column leg stays nearly straight: when the foot is far out the
      // root (hidden inside the body) slides toward it instead of the foot lifting
      let rx = r[0], ry = r[1];
      const ax = fx + Math.sin(fold) * len[2], ay = fy - Math.cos(fold) * len[2];
      const d = Math.hypot(ax - rx, ay - ry), lim = (len[0] + len[1]) * 0.996;
      if (d > lim){ const k = (d - lim) / d; rx += (ax - rx) * k; ry += (ay - ry) * k; }
      const ch = leg(ctx, rx, ry, fx, fy, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      const px = ch[3][0], py = ch[3][1], frot = fold * smooth(clamp01(lift / 5));
      ctx.beginPath(); footPath(ctx, px, py, frot); ctx.fill();
      if (!far){
        // a soft shade down the back of the column — a wedge that widens toward
        // the foot and is gone by the top, so the leg still melts into the body.
        // (one more fill of the leg's own path with a tilted gradient: no clip)
        const hw = ws[3] / 2 + 2, bx = px - hw + 2, by = py + FR;
        const ux = px + 2 - (ch[0][0] - ws[0] / 2), uy = by - (ch[0][1] + 6), ul = Math.hypot(ux, uy) || 1;
        const snx = uy / ul, sny = -ux / ul, sd = hw * snx;
        ctx.fillStyle = lg(ctx, bx, by, bx + snx * sd, by + sny * sd, [[0, C.x.sh1], [1, C.x.sh0]]);
        limbPath(ctx, ch, ws); footPath(ctx, px, py, frot); ctx.fill();
        // … and wrinkle arcs at the knee / wrist
        const j = hind ? 1 : 2, jx = ch[j][0], jy = ch[j][1], dx = ch[j + 1][0] - jx, dy = ch[j + 1][1] - jy, l = Math.hypot(dx, dy) || 1;
        const tx = dx / l, ty = dy / l, w = ws[j] * 0.3;
        ctx.strokeStyle = C.x.wr; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
        for (const o of WRINKLES){
          const qx = jx + tx * o, qy = jy + ty * o;
          ctx.moveTo(qx + ty * w, qy - tx * w); ctx.quadraticCurveTo(qx + tx * 2.6, qy + ty * 2.6, qx - ty * w, qy + tx * w);
        }
        ctx.stroke();
      }
      nails(ctx, px, py, frot, far ? C.nailF : C.nail);
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, CY); ctx.rotate(pitch); ctx.translate(0, -CY); };
    const headFrame = () => { bodyFrame(); ctx.translate(HEAD[0], HEAD[1]); ctx.rotate(headRot); ctx.scale(HS, HS); };

    oneLeg(2); oneLeg(3);

    // ── the far ear (behind the head and the body), tail, then the body
    ctx.save(); headFrame(); ctx.translate(6, -5); ear(ctx, C, earFan * 1.03, earRot - 0.05, true); ctx.restore();
    ctx.save(); bodyFrame();
    const ts = Math.sin(t * 1.5 + ph) * 5 + go * Math.sin(TAU * cyc * 2) * 4, fly = 22 * K;
    const TP = [[-77, -154], [-91, -148 - fly * 0.5], [-95, -120 + ts * 0.4 - fly], [-91 + ts - fly * 0.5, -94 - fly * 1.3]];
    taper(ctx, TP, 6.4, 3.4, C.coat);
    const tp = bez(TP, 1), td = bezT(TP, 1), ta = Math.atan2(td[1], td[0]);
    ctx.fillStyle = C.tuft;
    ctx.beginPath(); ctx.ellipse(tp[0] + Math.cos(ta) * 6, tp[1] + Math.sin(ta) * 6, 9.5, 4.4, ta, 0, TAU); ctx.fill();
    ctx.translate(0, CY); ctx.scale(1, breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = C.x.rim; ctx.translate(0, -2); body(); ctx.fill(); ctx.translate(0, 2);
    ctx.fillStyle = lg(ctx, 0, TOP, 0, 0, [[0, C.coatL], [0.368, C.x.b1], [0.546, C.x.b2], [0.622, C.x.b3], [1, C.coatD]]);
    body(); ctx.fill();                                   // the coat, lighter toward the underside
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── bow tie on the chest, head (trunk, tusk, eye, near ear), sound rings
    ctx.save(); bodyFrame();
    if (L.bowtie) bowtie(ctx, 73, -113, 12, 0.45);
    ctx.translate(HEAD[0], HEAD[1]); ctx.rotate(headRot); ctx.scale(HS, HS);
    const tipA = drawHead(ctx, C, L, t, K, earFan, earRot);
    if (K > 0.45){                                        // toot · toot · toot
      ctx.translate(TX[NT], TY[NT]); ctx.rotate(tipA);
      rings(ctx, 2, 0, 0.02 + 0.96 * frac((L.pose - 0.16) * 4.4), C.line, 0.6, 0.9);
    }
    ctx.restore();
    ctx.restore();
  }

  window.ElephantRig = { draw, HEIGHT: 208, WIDTH: 134, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 2.6,
                         WALK_CPS: 0.6, RUN_CPS: 1.25 };
})();
