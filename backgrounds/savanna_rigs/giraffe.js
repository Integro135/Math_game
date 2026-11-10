/* ── giraffe.js — the GIRAFFE, drawn from scratch (v2, 2026-11) ─────────────
   The tall one, in true profile: a short sloping body (high withers, low
   rump) on very long slim legs with knobbly knees and dark hooves, a long
   tapered neck with a short russet mane down its back edge, and a small
   long-muzzled head carried high — ONE dark eye with long lashes, two
   ossicones with dark tufts (the far one peeking behind the near one), leaf
   ears, a thin tail with a dark tassel. Coat: warm cream with irregular
   chestnut patches on torso, neck and upper legs, fading to cream socks.

   Legs: three bones placed by IK (kit.js). The walk is a PACE — the two legs
   of one side swing almost together — and the neck nods fore and aft in
   time. L.run = a slow rocking GALLOP, neck pumping. pose 0..1 = BROWSE: the
   neck stretches up and forward, the head tips up, the jaw drops (a real
   gap) and the long dark-purple tongue curls out for a leaf; ears wiggle.

   API — window.GiraffeRig { draw(ctx, L, t), HEIGHT, WIDTH, STRIDE, RUN_STRIDE,
                             ACT_SECONDS, WALK_CPS, RUN_CPS }
   Depends only on kit.js (window.SavKit). */
(function(){
  const { TAU, psr, clamp01, lerp, lg, alpha, palette, blob, bez, bezT, taper, limbPath, step, leg, xf,
          eye, blink, rim, bowtie, ribbon } = window.SavKit;

  const PAL = { coat: '#F3DDA4', coatL: '#FFF2CE', coatD: '#DCBC80', belly: '#FFF7DE', far: '#C7A56A',
                patch: '#B9692D', patchD: '#98511F', patchF: '#93602F', mane: '#A8541F', maneD: '#7E3C14',
                muz: '#B88B66', hoof: '#3A2A20', tuft: '#3B261A', horn: '#E6C88E',
                eyeW: '#FFF8EC', iris: '#5E3B20', pupil: '#17100C', line: '#3A2414', earIn: '#E9B4A6',
                mouth: '#5A1F2A', tongue: '#5E3F78', tongueL: '#8463A0' };
  const COAT = ['coat', 'coatL', 'coatD', 'belly', 'far', 'patch', 'patchD', 'patchF', 'horn'];
  // the pace: hind then fore of the SAME side, a beat apart; the gallop rocks
  const WALK = { stride: 132, duty: 0.63, lift: 14, off: [0.12, 0, 0.62, 0.5], bob: 2.2, over: 0, fsw: 0.75, hsw: 0.6 };
  const RUN  = { stride: 270, duty: 0.36, lift: 24, off: [0, 0.5, 0.1, 0.4], bob: 0, over: 10, fsw: 1.15, hsw: 0.85, gallop: true };

  // torso: chest → withers (hidden under the neck) → the long slope down to the rump → belly
  const BODY = [[52, -137], [49, -157], [29, -171], [4, -172], [-22, -163], [-45, -154], [-58, -138], [-56, -119],
                [-36, -107], [-4, -101], [27, -101], [46, -113]];
  const TOP = -178, CY = -138, SH = [30, -126], HP = [-38, -126], FREST = 31, HREST = -42, FAR = 7;
  const FL = [27, 51, 46], HL = [22, 56, 50], FW = [24, 14.5, 9.4, 7.6], HW = [36, 17, 9.8, 7.6];
  const HS = 1.32;                                         // head scale

  // ── the coat: rounded polygons on a jittered grid, with cream lanes between
  const RND = 0.3;                                        // how far along each edge a corner's curve starts
  function rpoly(g, pts){                                 // adds one rounded polygon to the current path
    const n = pts.length;
    for (let i = 0; i < n; i++){
      const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      const x0 = b[0] + (a[0] - b[0]) * RND, y0 = b[1] + (a[1] - b[1]) * RND;
      if (i) g.lineTo(x0, y0); else g.moveTo(x0, y0);
      g.quadraticCurveTo(b[0], b[1], b[0] + (c[0] - b[0]) * RND, b[1] + (c[1] - b[1]) * RND);
    }
    g.closePath();
  }
  function cell(cx, cy, rx, ry, seed){                    // one irregular 5/6-gon round (cx, cy)
    const n = 5 + (psr(seed) > 0.5 ? 1 : 0), a0 = psr(seed + 3) * TAU, out = [];
    for (let i = 0; i < n; i++){
      const a = a0 + (i + (psr(seed + i * 5 + 9) - 0.5) * 0.5) / n * TAU, k = 0.92 + psr(seed + i * 7 + 1) * 0.3;
      out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return out;
  }
  // torso patches (torso space), built once
  const PATCHES = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++){
    const n = i * 5 + j;
    PATCHES.push(cell(-54 + i * 16.5 + (j & 1) * 8 + (psr(n + 20) - 0.5) * 4, -172 + j * 14.6 + (psr(n + 60) - 0.5) * 3,
                      7.4 + psr(n + 31) * 1.6, 6.4 + psr(n + 47) * 1.2, n * 13 + 5));
  }
  // neck patches: [u along the neck, side −1..1, half-length in u, half-width share]
  const NECKP = [];
  for (let i = -1; i < 9; i++) for (let j = 0; j < 2; j++){
    const n = i * 2 + j;
    NECKP.push([0.05 + i * 0.108 + (j ? 0.054 : 0) + (psr(n + 5) - 0.5) * 0.02, (j ? 0.5 : -0.48) + (psr(n + 15) - 0.5) * 0.12,
                0.046 + psr(n + 35) * 0.006, 0.4 + psr(n + 25) * 0.08, n * 11 + 2]);
  }
  // leg patches per bone: [along the bone, side −1..1, size] — bone 0 in units from the root
  // (they cover the shoulder / haunch disc too), bone 1 as a share of its length
  const LEGP = [[[-7, -0.5, 1], [-5, 0.6, 0.95], [8, 0.05, 1.05], [21, -0.5, 0.8], [20, 0.6, 0.7]],
                [[0.22, 0.25, 0.78], [0.42, -0.3, 0.68], [0.6, 0.3, 0.58], [0.76, -0.2, 0.48], [0.9, 0.25, 0.36]]];
  const SKULL = [[-13, 2], [-12.5, -7.5], [-5, -12.2], [5, -11.8], [14.5, -8.4], [25, -5.2], [34.5, -4.2], [41, 0], [39.6, 6.3], [30, 8], [12, 9], [-3, 9.6]];
  const JAW = [[-4, 7.6], [10, 8.3], [25, 7.5], [34.5, 6.8], [37.8, 9.4], [32, 12.6], [13, 14], [-3, 12.2]];

  function ear(g, C, x, y, rot, far){                     // a leaf ear, pointing along −y before `rot`
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = far ? C.far : C.coat;
    g.beginPath(); g.moveTo(-3.6, 1); g.quadraticCurveTo(-7.4, -9, -0.4, -18.5); g.quadraticCurveTo(6.6, -9, 3.6, 1); g.closePath(); g.fill();
    if (!far){
      g.fillStyle = C.earIn;
      g.beginPath(); g.moveTo(-1.4, -1.5); g.quadraticCurveTo(-3.8, -8.5, -0.2, -14.6); g.quadraticCurveTo(3.4, -8.5, 1.6, -1.5); g.closePath(); g.fill();
    }
    g.restore();
  }
  function ossicone(g, C, x, y, rot, far){                // a stubby horn with a dark tuft on top
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = far ? C.far : C.horn;
    g.beginPath(); g.moveTo(-3.8, 3); g.quadraticCurveTo(-2.2, -3, -2.3, -10.5); g.lineTo(2.3, -10.5); g.quadraticCurveTo(2.2, -3, 3.8, 3); g.closePath(); g.fill();
    g.fillStyle = C.tuft;
    g.beginPath(); g.ellipse(0, -11.6, 4, 3.3, 0, 0, TAU); g.fill();
    g.restore();
  }
  function hoof(g, C, x, y, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.hoof;
    g.beginPath(); g.moveTo(-4, -2.2); g.lineTo(4.2, -2.2); g.quadraticCurveTo(7, 1.6, 6.4, 4); g.lineTo(-5.2, 4); g.quadraticCurveTo(-5.4, 0.6, -4, -2.2); g.fill();
    g.restore();
  }

  // the head, in head space: skull centre (0,0), muzzle toward +x. K = browse.
  function drawHead(g, C, L, t, K){
    const ph = L.ph || 0, jaw = 0.62 * K, HX = 0, HY = 9;
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.8 + ph * 2.7)), 40) * 0.45;
    const wig = K * Math.sin(t * 15) * 0.22;              // the ears wiggle while it browses
    ear(g, C, -7.6, -8, -0.8 - flick * 0.5 - wig, true);
    ossicone(g, C, 2.2, -9.6, 0.1, true);
    if (K > 0.03){                                        // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 12;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 8.6);
      g.lineTo(HX + (fx - HX) * c, HY + (fx - HX) * s + 0.6); g.lineTo(HX - 3, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // lower jaw on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    const jawP = () => blob(g, JAW, 5);
    g.fillStyle = lg(g, 0, 7, 0, 13, [[0, C.belly], [1, C.coat]]); jawP(); g.fill();
    g.save(); jawP(); g.clip();
    g.fillStyle = C.muz; g.beginPath(); g.ellipse(38, 9.4, 9, 7, 0, 0, TAU); g.fill();
    g.restore();
    g.restore();
    if (K > 0.05){                                        // the long tongue: out through the gap, curling up
      const e = K * K * (3 - 2 * K), c = Math.cos(jaw), s = Math.sin(jaw);
      const q = (x, y) => [HX + (x - HX) * c - (y - HY) * s, HY + (x - HX) * s + (y - HY) * c];
      const curl = Math.sin(t * 5) * 1.6 * K;
      const TP = [q(3, 8.6), q(lerp(16, 30, e), 7.6), q(lerp(24, 55, e), lerp(7, 9 + curl, e)), q(lerp(27, 53 + curl, e), lerp(7, -3, e))];
      taper(g, TP, 5.6, 3.8, C.tongue, { steps: 14 });
      taper(g, TP, 1.6, 0.8, alpha(C.tongueL, 0.5), { steps: 14 });
    }
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -12, 0, 10, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = C.muz;                                  // soft brown muzzle
    g.beginPath(); g.ellipse(41, 2.4, 10, 10, 0, 0, TAU); g.fill();
    g.fillStyle = C.patch;                                // a few small cheek patches
    g.beginPath();
    rpoly(g, cell(-8.5, 3, 4.2, 4.4, 71)); rpoly(g, cell(-1, 6.4, 3.4, 2.9, 83)); rpoly(g, cell(-10, -5.6, 3, 3.2, 97)); rpoly(g, cell(7, 6, 3, 2.5, 59));
    g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(13.5, 2.6, 4.4, 2.8, 0, 0, TAU); g.fill();
    g.restore();
    rim(g, skull, -5, C.rim, 1.3);
    g.fillStyle = 'rgba(40,20,10,.5)';                    // nostril, then the lip line — a little smile
    g.beginPath(); g.ellipse(37.4, -0.8, 1.9, 1.15, -0.5, 0, TAU); g.fill();
    if (K < 0.2){ g.strokeStyle = 'rgba(40,20,10,.42)'; g.lineWidth = 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(39.4, 5.2); g.quadraticCurveTo(32, 8.2, 23, 6.8); g.stroke(); }
    // ONE eye — big and dark, with long lashes; it narrows happily as it browses
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.3 * K);
    eye(g, 6, -2.8, 4.2, 4.7, eyeH, Math.sin(t * 0.3 + ph) * 0.5 + 0.4 * K, C, { iris: 0.88 });
    g.strokeStyle = C.line; g.lineWidth = 0.95; g.lineCap = 'round';
    g.beginPath(); g.moveTo(2.4, -5.6); g.lineTo(-0.2, -7.8); g.moveTo(3.5, -6.8); g.lineTo(2, -9.6); g.moveTo(5.2, -7.5); g.lineTo(4.7, -10.2); g.stroke();
    ossicone(g, C, -3.6, -9.8, -0.2, false);
    ear(g, C, -9.4, -7.4, -1.12 - flick + wig, false);
    if (L.ribbon) ribbon(g, -11, -12.5, 5.2, -0.5);
  }
  // unit-space patch shapes for the neck and the legs (stamped along a moving axis)
  const NECKS = NECKP.map(p => cell(0, 0, 1, 1, p[4]));
  const LEGS = LEGP.map((b, bi) => b.map((p, j) => cell(0, 0, 1, 1, bi * 40 + j * 7 + 3)));
  // add a unit shape to the path: centre (cx, cy), its x-axis along the unit vector (tx, ty)
  function stamp(g, sh, cx, cy, tx, ty, ru, rv){
    const n = sh.length;
    const X = i => cx + sh[i][0] * ru * tx - sh[i][1] * rv * ty, Y = i => cy + sh[i][0] * ru * ty + sh[i][1] * rv * tx;
    let ax = X(n - 1), ay = Y(n - 1), bx = X(0), by = Y(0);
    for (let i = 0; i < n; i++){
      const j = (i + 1) % n, qx = X(j), qy = Y(j), x0 = bx + (ax - bx) * RND, y0 = by + (ay - by) * RND;
      if (i) g.lineTo(x0, y0); else g.moveTo(x0, y0);
      g.quadraticCurveTo(bx, by, bx + (qx - bx) * RND, by + (qy - by) * RND);
      ax = bx; ay = by; bx = qx; by = qy;
    }
    g.closePath();
  }

  function draw(ctx, L, t){
    const C = palette(PAL, COAT, L.tint, L.lit);
    const ph = L.ph || 0, go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = L.run ? RUN : WALK, cyc = (L.wt || 0) / TAU;
    const K = L.pose ? Math.sin(clamp01(L.pose) * Math.PI) : 0;
    // body bob / rock, and the neck's fore-and-aft swing (sway −1..1)
    let drop, pitch = -0.03 * K, sway;
    if (G.gallop){
      const r = Math.sin(TAU * (cyc - 0.45));
      drop = go * -5 * Math.cos(2 * TAU * (cyc - 0.36)); pitch += go * 0.07 * r; sway = go * 1.15 * r;
    } else {
      drop = go * G.bob * Math.sin(2 * TAU * cyc + 0.6); sway = go * 0.55 * Math.sin(2 * TAU * cyc + 1.2);
    }
    sway += Math.sin(t * 0.5 + ph * 1.7) * 0.1 * (1 - go);
    const breathe = 1 + Math.sin(t * 1.1 + ph) * 0.008;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.coatL], [0.24, C.coat], [0.45, C.coatD], [0.64, C.coat], [1, C.coatL]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = (st.x * G.stride + (st.sw ? -G.over * Math.sin(TAU * st.sw) : 0)) * go;
      const lift = st.lift * G.lift * go * (hind ? 0.85 : 1);
      const swing = st.sw ? Math.sin(Math.PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR : 0), root[1], 0, CY, pitch, reach * (hind ? 0.16 : 0.2), drop);
      const fold = (hind ? -0.12 : 0.03) - reach / 140 + swing * (hind ? G.hsw : G.fsw);
      const fx = (hind ? HREST : FREST) + (far ? FAR : 0) + reach;
      const fill = far ? C.far : coatG;
      const ch = leg(ctx, r[0], r[1], fx, -lift - ws[3] / 2, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, fill);
      // patches on the two upper bones (clipped to the limb), shrinking toward the knee
      ctx.save(); limbPath(ctx, ch, ws); ctx.clip();
      ctx.fillStyle = far ? C.patchF : C.patch;
      ctx.beginPath();
      for (let b = 0; b < 2; b++){
        const ax = ch[b][0], ay = ch[b][1], dx = ch[b + 1][0] - ax, dy = ch[b + 1][1] - ay, l = Math.hypot(dx, dy) || 1;
        const tx = dx / l, ty = dy / l, P = LEGP[b];
        for (let j = 0; j < P.length; j++){
          const u = b ? P[j][0] : P[j][0] / l, w = (ws[b] + (ws[b + 1] - ws[b]) * u) / 2 * P[j][1], k = P[j][2];
          stamp(ctx, LEGS[b][j], ax + dx * u + ty * w, ay + dy * u - tx * w, tx, ty, (b ? 7.4 : 7) * k, (b ? 5 : 6.6) * k);
        }
      }
      ctx.fill(); ctx.restore();
      ctx.fillStyle = fill;                               // the knobbly knee / hock, and the fetlock
      ctx.beginPath(); ctx.arc(ch[2][0], ch[2][1], ws[2] * 0.66, 0, TAU);
      ctx.moveTo(ch[3][0] + 5, ch[3][1] - 3); ctx.arc(ch[3][0], ch[3][1] - 3, 5, 0, TAU); ctx.fill();
      hoof(ctx, C, ch[3][0], ch[3][1], lift > 0.5 ? fold * 0.9 : 0);
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, CY); ctx.rotate(pitch); ctx.translate(0, -CY); };

    oneLeg(2); oneLeg(3);

    // ── tail (a thin switch + long dark tassel), the neck, then the torso and its patches
    ctx.save(); bodyFrame();
    const sw = Math.sin(t * 1.5 + ph) * 5 + go * Math.sin(TAU * cyc * 2) * 3, fly = 10 * K + (G.gallop ? go * 22 : 0);
    const TP = [[-50, -141], [-62, -138 - fly * 0.4], [-67, -114 + sw * 0.4 - fly * 0.7], [-64 + sw - fly * 0.7, -88 - fly]];
    taper(ctx, TP, 6, 3, C.coat);
    const tp = bez(TP, 1), td = bezT(TP, 1), ta = Math.atan2(td[1], td[0]);
    ctx.fillStyle = C.tuft;
    ctx.beginPath(); ctx.ellipse(tp[0] + Math.cos(ta) * 9, tp[1] + Math.sin(ta) * 9, 12.5, 4.6, ta, 0, TAU); ctx.fill();
    const patchG = lg(ctx, 0, TOP, 0, -104, [[0, C.patch], [1, C.patchD]]);
    // the neck goes BEHIND the torso (the withers overlap its base): mane, neck, patches clipped onto it
    const NW0 = 42, NW1 = 19.5;
    const NP = [[25, -148], [42 + sway * 2, -188 - 3 * K], [62 + sway * 6 + 5 * K, -228 + sway * 1.5 - 7 * K],
                [78 + sway * 11 + 13 * K, -264 + sway * 4 - 12 * K]];
    for (let m = 0; m < 2; m++){                          // the short russet mane, down the BACK edge
      ctx.fillStyle = m ? C.mane : C.maneD; ctx.beginPath();   // (dark tufts, then the light ones between)
      for (let i = m; i < 15; i += 2){
        const u = 0.1 + i * 0.062, p = bez(NP, u), d = bezT(NP, u), l = Math.hypot(d[0], d[1]) || 1;
        const w = (NW0 + (NW1 - NW0) * u) / 2 - 0.6, mx = p[0] + d[1] / l * w, my = p[1] - d[0] / l * w;
        const ma = Math.atan2(d[1], d[0]) - 0.25;
        ctx.moveTo(mx + Math.cos(ma) * 5.4, my + Math.sin(ma) * 5.4); ctx.ellipse(mx, my, 5.4, 4.4, ma, 0, TAU);
      }
      ctx.fill();
    }
    const nm = bez(NP, 0.45), nd = bezT(NP, 0.45), nl = Math.hypot(nd[0], nd[1]) || 1, nx = nd[1] / nl * 15, ny = -nd[0] / nl * 15;
    taper(ctx, NP, NW0, NW1, lg(ctx, nm[0] + nx, nm[1] + ny, nm[0] - nx, nm[1] - ny, [[0, C.coat], [0.5, C.coatL], [1, C.belly]]));
    ctx.save(); taper(ctx, NP, NW0, NW1, null, { path: true }); ctx.clip();
    ctx.fillStyle = patchG;
    ctx.beginPath();
    for (let i = 0; i < NECKP.length; i++){
      const q = NECKP[i], p = bez(NP, q[0]), d = bezT(NP, q[0]), l = Math.hypot(d[0], d[1]) || 1;
      const w = (NW0 + (NW1 - NW0) * q[0]) / 2, tx = d[0] / l, ty = d[1] / l;
      stamp(ctx, NECKS[i], p[0] + ty * w * q[1], p[1] - tx * w * q[1], tx, ty, q[2] * l, w * q[3]);
    }
    ctx.fill(); ctx.restore();
    ctx.translate(0, CY); ctx.scale(1, breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = patchG;
    ctx.beginPath(); for (let i = 0; i < PATCHES.length; i++) rpoly(ctx, PATCHES[i]); ctx.fill();
    ctx.fillStyle = lg(ctx, 0, -108, 0, -100, [[0, alpha(C.belly, 0)], [1, alpha(C.belly, 0.9)]]);
    ctx.fillRect(-60, -108, 114, 10);                     // the patches fade out under the belly
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-80, -200, 88, 120); ctx.clip();      // rim light: the back only, not across the neck
    rim(ctx, body, TOP + 20, C.rim, 1.8);
    ctx.restore();
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── bow tie on the throat, then the head on the end of the neck
    ctx.save(); bodyFrame();
    if (L.bowtie){ const b = bez(NP, 0.2); bowtie(ctx, b[0] + 15, b[1] + 6, 9, 1.15); }
    const tip = NP[3];
    ctx.translate(tip[0] + 5, tip[1] - 5);
    ctx.rotate(0.28 + sway * 0.06 + Math.sin(t * 0.6 + ph) * 0.03 - 0.7 * K);
    ctx.scale(HS, HS);
    drawHead(ctx, C, L, t, K);
    ctx.restore();
    ctx.restore();
  }

  window.GiraffeRig = { draw, HEIGHT: 302, WIDTH: 112, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 2.6,
                        WALK_CPS: 0.72, RUN_CPS: 1.2 };
})();
