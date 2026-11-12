/* ── ptero.js — the PTERANODON, in flight (dinosaur rigs, 2026-11) ───────────
   A chubby storybook pteranodon seen from the side as it flies past overhead:
   a small pear of a body with a cream belly, a round head with ONE big glossy
   eye, a long pointed beak, the long crest sweeping back, two membrane wings
   and little legs trailing behind.

   THE WINGS are a small 3-D model, not a squashed picture: a planform (arm →
   wrist → the long wing finger, two finger struts to a scalloped trailing
   edge) lifted by a flap angle and seen from a little below. So the near wing
   rises in front and shows its LIGHT UNDERSIDE with the struts through it, the
   far wing is behind and darker, and at the bottom of the stroke the near
   wing turns its coloured top to us. The hand lags the arm and the trailing
   edge lags the hand (the membrane bends), and on the up-stroke the hand
   folds back at the wrist — a strong down-stroke, a light folding recovery.
   The body rises and sinks with it.

   L = { x, y, s, dir, ph, wt, glide, pose, tint, lit, coat, carry, eggCoat }
     wt     wing-beat phase in radians (wt += TAU * FLAP_CPS * dt); when it is
            undefined the rig beats by itself from `t`
     glide  0..1 holds the wings out flat and still (soaring)
     pose   0..1 the SQUAWK: head tossed up, the beak wide open (a real gap,
            pink tongue), sound rings, the wings flared
     carry  true = an egg (coat `eggCoat`, drawn by EggRig when hatch.js is
            loaded) hangs in its feet. Optional: grip 0..1 (the legs' holding
            pose; default carry ? 1 : 0), eggS (the egg's scale, default 1)
   UNIT SPACE: (0, 0) = the middle of the body, facing +x, y down.

   API — window.PteroRig { draw(ctx, L, t), feet(L[, t]), mouth(L[, t]), HEIGHT,
         WIDTH, ACT_SECONDS, FLAP_CPS, COATS }
     feet(L)   the carried egg's CENTRE in the caller's space (+ rot, its lean)
     mouth(L)  the beak tip
   Depends only on ../savanna_rigs/kit.js (window.SavKit). No outlines, no
   ctx.filter / shadowBlur, no offscreen canvases. */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, blob, taper, limb, eye, blink, brow, rim, rings } = window.SavKit;
  const PI = Math.PI;

  // ── coats. memU / memUD = the wing's light underside (root → tip), memR its
  //    struts; top / topD = its deeper upper side; memF / topF = the far wing
  const FACE = { eyeW: '#FFFDF6', pupil: '#2A1830', line: '#4A3040', mouth: '#7A2E48', tongue: '#FF93A6', claw: '#FFF3D6', cheek: '#FF7692',
                 shell: '#FFF4DC', shellD: '#E9D2A4', speck: '#D9A66A' };
  const mk = o => Object.assign({}, FACE, o);
  const PALS = {
    coral:  mk({ coat: '#FF9A7E', coatL: '#FFC6AC', coatD: '#E8735C', belly: '#FFF1D4', bellyD: '#F2D7A2', far: '#CC6452', spot: '#F0775F',
                 memU: '#FFE2AE', memUD: '#FFC582', memR: '#EE9A5E', top: '#FFB678', topD: '#F59658', memF: '#EFB57C', topF: '#D98A58',
                 crest: '#55C8BC', crestL: '#9DEADF', crestD: '#34A398', beak: '#FFCB5E', beakL: '#FFE6A2', beakD: '#F0A640', iris: '#2F9C92', glow: '#FFE0C0' }),
    sky:    mk({ coat: '#7FC6F5', coatL: '#B9E4FF', coatD: '#52A2DE', belly: '#FFF6E0', bellyD: '#EEDDB0', far: '#4488C4', spot: '#55A8EA',
                 memU: '#FFF3C6', memUD: '#FFE08C', memR: '#E8B85A', top: '#FFD978', topD: '#F5BC50', memF: '#EDD084', topF: '#D9A850',
                 crest: '#FF9086', crestL: '#FFC2B6', crestD: '#E86A62', beak: '#FFB85A', beakL: '#FFDCA0', beakD: '#EE9240', iris: '#3478C8', glow: '#E0F3FF' }),
    lilac:  mk({ coat: '#BC9FF2', coatL: '#DFCFFF', coatD: '#9776D8', belly: '#FFF3E8', bellyD: '#EFD9C2', far: '#8062C0', spot: '#A07FE2',
                 memU: '#FFDDEE', memUD: '#FFB8DA', memR: '#E888BC', top: '#FFACD4', topD: '#F58CBE', memF: '#E8A8CC', topF: '#D97CAC',
                 crest: '#FFD45E', crestL: '#FFEBA4', crestD: '#EDAE3A', beak: '#FFAE62', beakL: '#FFD5A4', beakD: '#EE8A46', iris: '#7650C6', glow: '#F4E2FF' }),
    mint:   mk({ coat: '#72D8B2', coatL: '#ACF2D4', coatD: '#47B690', belly: '#FFF8DE', bellyD: '#EEE0AC', far: '#3C9E7E', spot: '#48BC96',
                 memU: '#F4FBC0', memUD: '#DDF08E', memR: '#A8CC5E', top: '#D6EC84', topD: '#BCD860', memF: '#CADF86', topF: '#A2C058',
                 crest: '#FF8FA8', crestL: '#FFC0CE', crestD: '#E8688A', beak: '#FFBE52', beakL: '#FFE09A', beakD: '#EE9A3A', iris: '#2E9478', glow: '#E2FBD2' }),
    butter: mk({ coat: '#FFD86C', coatL: '#FFEEAE', coatD: '#F0B440', belly: '#FFFAE8', bellyD: '#F2E0B4', far: '#D89C38', spot: '#F4B43E',
                 memU: '#FFD8C0', memUD: '#FFB494', memR: '#EE8866', top: '#FFAC8C', topD: '#F58C6C', memF: '#EBAA8C', topF: '#D97C60',
                 crest: '#A486EA', crestL: '#CDBAFA', crestD: '#8262D0', beak: '#FF9E62', beakL: '#FFCBA0', beakD: '#EC7A48', iris: '#B4742A', glow: '#FFF6CC' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'far', 'spot'];

  // ── the beat: DN = the share of the cycle spent on the down-stroke; the flap
  //    angle (radians above the horizontal) runs UP_A → LO_A → UP_A
  const FLAP_CPS = 1.4, DN = 0.42, UP_A = 0.78, LO_A = -0.66, GL_A = 0.33, FL_A = 0.7;
  const SE = 0.16, CE = 0.987;                            // the camera: 9° below the horizon
  const RW = 32, TR = [66, -76], P1R = [47, -91], P2R = [15, -90];   // span at the wrist; tip and strut ends from the wrist
  const SH = [0, -12], ROOT = [-38, -2], FARX = 13, FARY = -2.5;
  const BODY = [[33, -3], [27, -15], [10, -20], [-10, -18], [-28, -11], [-43, -3], [-40, 5], [-24, 14], [-2, 20], [18, 17], [31, 8]];
  const SPOTS = [[-4, -13, 4.2, 2.6], [-17, -9, 3.2, 2.1], [8, -14, 2.6, 1.8], [-27, -4, 2.4, 1.7]];
  const HC = [61, -30], HS = 1.22, TIP = [57, 3];
  const SKULL = [[-15, 2], [-14, -8], [-6, -15], [5, -15.5], [14, -10], [18, -2], [16, 7], [8, 12], [-3, 12.5], [-11, 9]];
  const HIP = [-22, 8], LEGL = [15, 13, 8], LEGW = [13.5, 8.6, 5.6, 5];
  const TRAIL = [2.62, 3.32, 2.9], HOLD_N = [0.55, 2.1, 1.0], HOLD_F = [1.2, 2.4, 2.0];
  const GRIP = [-17, 29];                                 // the top of a carried egg
  const EGG_H = 56;

  const flap = p => {
    p = frac(p);
    return p < DN ? UP_A + (LO_A - UP_A) * (1 - Math.cos(PI * p / DN)) / 2
                  : LO_A + (UP_A - LO_A) * (1 - Math.cos(PI * (p - DN) / (1 - DN))) / 2;
  };

  // ── the pose, solved once per draw (and by feet / mouth): a SHARED scratch
  const S = {};
  let lastT = 0;
  function solve(L, t){
    const ph = S.ph = L.ph || 0;
    const p = S.p = frac((L.wt != null ? L.wt : t * TAU * FLAP_CPS + ph) / TAU);
    const gl = S.gl = clamp01(L.glide || 0), q = S.q = clamp01(L.pose || 0);
    const K = S.K = q > 0 ? smooth(clamp01(q / 0.2)) * smooth(clamp01((1 - q) / 0.24)) : 0;
    S.J = K * (0.84 + 0.16 * Math.sin(q * TAU * 6));                         // the beak, with a vibrato
    S.beat = (1 - gl) * (1 - K);                                             // how much the wings are beating
    S.rock = Math.sin(t * 0.9 + ph) * 0.05;
    S.shiver = Math.sin(q * TAU * 7) * 0.08;
    // lowest as the down-stroke starts, highest just after it ends
    S.oy = 3.4 * Math.cos(TAU * (p - 0.04)) * S.beat + Math.sin(t * 0.8 + ph * 1.3) * 2.2 * gl - 5 * K;
    S.pitch = -0.05 + 0.035 * Math.sin(TAU * (p - 0.3)) * S.beat + 0.04 * gl - 0.2 * K;
    S.hx = HC[0] - 8 * K; S.hy = HC[1] - 8 * K + 1.3 * Math.cos(TAU * (p - 0.12)) * S.beat;
    S.hrot = -S.pitch * 0.7 + Math.sin(t * 0.7 + ph) * 0.035 - 0.5 * K + 0.05 * K * Math.sin(q * TAU * 6);
    S.grip = L.grip != null ? clamp01(L.grip) : (L.carry ? 1 : 0);
    S.eS = L.eggS || 1;
    S.erot = 0.07 * Math.sin(TAU * (p - 0.35)) * S.beat + 0.035 * Math.sin(t * 1.3 + ph);   // the egg swings from the grip
    return S;
  }
  // a body-frame point → the caller's space
  function out(L, bx, by, o){
    const c = Math.cos(S.pitch), s = Math.sin(S.pitch);
    o.x = L.x + (bx * c - by * s) * L.s * (L.dir || 1); o.y = L.y + (bx * s + by * c + S.oy) * L.s;
    return o;
  }
  function feet(L, t){
    solve(L, t == null ? lastT : t);
    const d = EGG_H / 2 * S.eS;
    const o = out(L, GRIP[0] - Math.sin(S.erot) * d, GRIP[1] + Math.cos(S.erot) * d, {});
    o.rot = (S.erot + S.pitch) * (L.dir || 1);
    return o;
  }
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    return out(L, S.hx + (TIP[0] * c - TIP[1] * s) * HS, S.hy + (TIP[0] * s + TIP[1] * c) * HS, {});
  }

  // ── one wing. Planform points (span r, chord c) are lifted by the flap angle
  //    — the arm's inside the wrist, the point's own lagging one beyond it —
  //    and seen from below: screen y = −(height · CE ± lateral · SE).
  const O_ = [0, 0], E_ = [0, 0], W_ = [0, 0], T_ = [0, 0], P1 = [0, 0], P2 = [0, 0];
  const ARM = [O_, E_, W_], ARMW = [9.5, 7.6, 5.6], FING = [[0, 0], [0, 0], [0, 0], [0, 0]], FOPT = { steps: 8 };
  const ang = (pp, side) => lerp(lerp(flap(pp), GL_A + S.rock * side, S.gl), FL_A + S.shiver, S.K);
  function wpt(o, r, c, rw, aA, a, side){
    const ri = r < rw ? r : rw, ro = r - ri;
    o[0] = O_[0] + c;
    o[1] = O_[1] - ((ri * Math.sin(aA) + ro * Math.sin(a)) * CE + side * (ri * Math.cos(aA) + ro * Math.cos(a)) * SE);
  }
  const sc = (g, a, bx, by, tx, ty, k) => {               // one scallop of the trailing edge, sagging toward (tx, ty)
    const mx = (a[0] + bx) / 2, my = (a[1] + by) / 2;
    g.quadraticCurveTo(mx + (tx - mx) * k, my + (ty - my) * k, bx, by);
  };
  function membrane(g, bx, by){
    const dx = T_[0] - W_[0], dy = T_[1] - W_[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (nx < 0){ nx = -nx; ny = -ny; }
    g.beginPath(); g.moveTo(O_[0], O_[1]);
    g.quadraticCurveTo(E_[0] + 3, E_[1], W_[0], W_[1]);
    g.quadraticCurveTo((W_[0] + T_[0]) / 2 + nx * 4, (W_[1] + T_[1]) / 2 + ny * 4, T_[0], T_[1]);
    sc(g, T_, P1[0], P1[1], W_[0], W_[1], 0.22);
    sc(g, P1, P2[0], P2[1], W_[0], W_[1], 0.26);
    sc(g, P2, bx, by, (O_[0] + W_[0]) / 2, (O_[1] + W_[1]) / 2, 0.3);
    g.quadraticCurveTo((bx + O_[0]) / 2, (by + O_[1]) / 2 + 5, O_[0], O_[1]);
    g.closePath();
  }
  function wing(g, C, far){
    const side = far ? -1 : 1, p = S.p - (far ? 0.035 : 0), u = frac(p);
    const aA = ang(p, side), aL = ang(p - 0.05, side), aH = ang(p - 0.07, side), aT = ang(p - 0.13, side);
    const F = u > DN ? Math.sin(PI * (u - DN) / (1 - DN)) * 0.5 * S.beat : 0;      // the up-stroke fold
    const d = F * 0.8, rw = RW - 4 * F, wc = 7 + 2 * F;
    const c1 = Math.cos(d), s1 = Math.sin(d), c2 = Math.cos(d * 0.55), s2 = Math.sin(d * 0.55), c3 = Math.cos(d * 0.2), s3 = Math.sin(d * 0.2);
    O_[0] = SH[0] + (far ? FARX : 0); O_[1] = SH[1] + (far ? FARY : 0);
    const bx = ROOT[0] + (far ? FARX : 0), by = ROOT[1] + (far ? FARY : 0);
    wpt(E_, rw * 0.5, 4.5 + 3 * F, rw, aA, aA, side);
    wpt(W_, rw, wc, rw, aA, aA, side);
    wpt(T_, rw + TR[0] * c1 + TR[1] * s1, wc - TR[0] * s1 + TR[1] * c1, rw, aA, aH, side);
    wpt(P1, rw + P1R[0] * c2 + P1R[1] * s2, wc - P1R[0] * s2 + P1R[1] * c2, rw, aL, aT, side);
    wpt(P2, rw + P2R[0] * c3 + P2R[1] * s3, wc - P2R[0] * s3 + P2R[1] * c3, rw, aL, aT, side);
    // which face is toward us? (the near wing shows its underside while raised)
    const tx = T_[0] - O_[0], ty = T_[1] - O_[1], rx = bx - O_[0], ry = by - O_[1], cr = tx * ry - ty * rx;
    const under = (cr < 0) !== far;
    const open = clamp01(Math.abs(cr) / (Math.hypot(tx, ty) * Math.hypot(rx, ry) + 1e-6) * 3.5);   // 0 = seen edge-on
    membrane(g, bx, by);
    g.fillStyle = far ? (under ? C.memF : C.topF)
                      : lg(g, O_[0], O_[1], T_[0], T_[1], under ? [[0, C.memU], [1, C.memUD]] : [[0, C.top], [1, C.topD]]);
    g.fill();
    g.strokeStyle = far ? alpha(C.far, 0.4 * open) : alpha(C.memR, (under ? 0.7 : 0.85) * open);     // the finger struts
    g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W_[0], W_[1]); g.lineTo(P1[0], P1[1]); g.moveTo(W_[0], W_[1]); g.lineTo(P2[0], P2[1]); g.stroke();
    // the arm along the leading edge, the long wing finger, three little claws at the wrist
    const dx = T_[0] - W_[0], dy = T_[1] - W_[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l * 2.4, ny = dx / l * 2.4;
    if (nx < 0){ nx = -nx; ny = -ny; }
    FING[0][0] = W_[0]; FING[0][1] = W_[1]; FING[3][0] = T_[0]; FING[3][1] = T_[1];
    FING[1][0] = W_[0] + dx / 3 + nx; FING[1][1] = W_[1] + dy / 3 + ny;
    FING[2][0] = W_[0] + dx * 2 / 3 + nx; FING[2][1] = W_[1] + dy * 2 / 3 + ny;
    const arm = far ? C.far : C.coat;
    taper(g, FING, 5.6, 2, arm, FOPT);
    limb(g, ARM, ARMW, arm);
    g.fillStyle = far ? C.bellyD : C.claw;
    for (let i = 0; i < 3; i++){
      g.beginPath(); g.ellipse(W_[0] + 4.8, W_[1] - 2.4 + i * 2.4, 2.7, 1.15, (i - 1) * 0.3, 0, TAU); g.fill();
    }
  }

  // ── a little round-toed foot at (x, y), the toes pointing along `a`
  function foot(g, C, x, y, a, far, spread){
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = far ? C.far : C.coat;
    for (let i = -1; i <= 1; i++){
      g.beginPath(); g.ellipse(4.4, i * 3 * spread, 5.2, 2.6, i * 0.36 * spread, 0, TAU); g.fill();
    }
    g.fillStyle = far ? C.bellyD : C.claw;
    for (let i = -1; i <= 1; i++){
      const b = i * 0.36 * spread;
      g.beginPath(); g.ellipse(4.4 + Math.cos(b) * 5, i * 3 * spread + Math.sin(b) * 5, 2, 1.35, b, 0, TAU); g.fill();
    }
    g.restore();
  }
  // a leg: trailing behind in flight, or reaching down to hold the egg
  const LP = [[0, 0], [0, 0], [0, 0], [0, 0]];
  function oneLeg(g, C, far, fill){
    const hold = far ? HOLD_F : HOLD_N, k = smooth(S.grip);
    const sway = (0.09 * Math.sin(TAU * (S.p - 0.3)) * S.beat + 0.03 * Math.sin(lastT * 1.1 + S.ph)) * (1 - k);
    let x = HIP[0] + (far ? 5 : 0), y = HIP[1] - (far ? 1 : 0), a = 0;
    LP[0][0] = x; LP[0][1] = y;
    for (let i = 0; i < 3; i++){
      a = lerp(TRAIL[i] + sway * (1 + i * 0.6) + (far ? 0.12 : 0), hold[i], k);
      x += Math.cos(a) * LEGL[i]; y += Math.sin(a) * LEGL[i];
      LP[i + 1][0] = x; LP[i + 1][1] = y;
    }
    limb(g, LP, LEGW, fill);
    foot(g, C, x, y, a + (far ? 0.25 : -0.25) * k, far, 1 + 0.25 * k);
  }

  // ── the egg in its feet: EggRig's own drawing when hatch.js is loaded (the
  //    very same look), else a plain speckled egg. Its top hangs from GRIP.
  const EL = { x: 0, y: 0, s: 1, dir: 1, coat: null, lit: null, tint: 1, wobble: 0, crack: 0, hatch: 0 };
  function carried(g, C, L, t){
    const E = window.EggRig, es = S.eS;
    g.save(); g.translate(GRIP[0], GRIP[1]); g.rotate(S.erot);
    if (E && E.draw){
      EL.y = E.HEIGHT * es; EL.s = es; EL.coat = L.eggCoat; EL.lit = L.lit;
      E.draw(g, EL, t);
    } else {
      g.scale(es, es);
      g.beginPath(); g.ellipse(0, 30, 22, 30, 0, PI, TAU); g.ellipse(0, 30, 22, 26, 0, 0, PI); g.closePath();
      g.fillStyle = lg(g, 0, 0, 0, EGG_H, [[0, C.shell], [1, C.shellD]]); g.fill();
      g.fillStyle = alpha(C.speck, 0.6);
      for (let i = 0; i < 7; i++){ g.beginPath(); g.arc(Math.sin(i * 2.4) * 13, 9 + i * 6, 1.6 + (i % 3) * 0.7, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  // ── the head, in head space: skull centre (0, 0), the beak toward +x
  const CR = [[-3, -8], [-17, -18], [-30, -27], [-43, -33]], CR2 = [[-6, -10], [-17, -17], [-28, -24.5], [-38, -30]];
  const COPT = { steps: 12, ease: u => u * (0.6 + 0.4 * u) };
  function drawHead(g, C, t){
    const ph = S.ph, K = S.K, J = S.J, jaw = 0.6 * J, up = -0.13 * J, HX = 9, HY = 5.5;
    // the crest: a long soft blade sweeping back, trailing in the wind
    const cw = Math.sin(t * 2.3 + ph) * 1.5 * (1 - K) + K * Math.sin(S.q * TAU * 7) * 1.5;
    CR[3][1] = -33 + cw; CR[2][1] = -27 + cw * 0.5; CR2[3][1] = -30 + cw; CR2[2][1] = -24.5 + cw * 0.5;
    taper(g, CR, 19, 5, lg(g, 0, -38, 0, -6, [[0, C.crestL], [0.5, C.crest], [1, C.crestD]]), COPT);
    taper(g, CR2, 3.6, 1.2, alpha(C.crestL, 0.6), FOPT);
    if (J > 0.03){                                        // the throat, back at the hinge
      const d = 17;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2, HY - 1.5); g.lineTo(HX + d * Math.cos(up), HY + d * Math.sin(up) - 0.3);
      g.lineTo(HX + d * Math.cos(jaw), HY + d * Math.sin(jaw) + 0.5); g.lineTo(HX - 2, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // the lower beak on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    if (J > 0.08){
      g.fillStyle = C.tongue; g.beginPath(); g.ellipse(25, 4.4 - 1.2 * J, 12, 0.8 + 2.4 * J, -0.04, 0, TAU); g.fill();
    }
    g.fillStyle = lg(g, 0, 4, 0, 12, [[0, C.beak], [1, C.beakD]]);
    g.beginPath(); g.moveTo(7, 5); g.lineTo(49.5, 4.4); g.quadraticCurveTo(54, 5.4, 50, 7.6); g.quadraticCurveTo(28, 13.4, 7, 12.4); g.closePath(); g.fill();
    g.restore();
    g.save();                                             // the upper beak (it lifts a little too)
    g.translate(HX, HY); g.rotate(up); g.translate(-HX, -HY);
    g.fillStyle = lg(g, 0, -10, 0, 6, [[0, C.beakL], [0.55, C.beak], [1, C.beakD]]);
    g.beginPath(); g.moveTo(7, -11); g.quadraticCurveTo(33, -10, 55, 1); g.quadraticCurveTo(59.6, 3.4, 55.4, 5.2); g.quadraticCurveTo(31, 6.8, 7, 5.8); g.closePath(); g.fill();
    g.fillStyle = alpha(C.line, 0.45);                    // nostril
    g.beginPath(); g.ellipse(25, -3.6, 1.9, 1.1, 0.3, 0, TAU); g.fill();
    g.restore();
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -16, 0, 13, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    g.save(); g.translate(10.5, 6); g.scale(1, 0.66);     // a soft pink cheek
    g.fillStyle = rg(g, 0, 0, 0, 5.6, [[0, alpha(C.cheek, 0.9)], [0.5, alpha(C.cheek, 0.6)], [1, alpha(C.cheek, 0)]]);
    g.beginPath(); g.arc(0, 0, 5.6, 0, TAU); g.fill();
    g.restore();
    rim(g, skull, -7, alpha(C.glow, 0.8), 1.4);
    if (J < 0.15){                                        // the corner of a smile
      g.strokeStyle = alpha(C.line, 0.5); g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(18.5, 6.4); g.quadraticCurveTo(13.5, 8.6, 11.5, 4.8); g.stroke();
    }
    // ONE big eye under a soft brow; it pops wide for the squawk
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 + 0.06 * K);
    eye(g, 3.5, -3.2, 6.8, 7.6, eyeH, 0.3 + Math.sin(t * 0.4 + ph) * 0.4, C, { iris: 0.8 - 0.1 * K, lid: 1.3 });
    brow(g, C.coatD, -4, -12.2 - K, 3.5, -14.8 - 1.6 * K, 11, -11 - K, 1.9);
  }

  const TL = [[-34, -1], [-42, 0], [-49, 1], [-56, 2]], NP = [[14, -5], [30, -9], [0, 0], [0, 0]];
  function draw(ctx, L, t){
    lastT = t;
    const C = palette(PALS[L.coat] || PALS.coral, TINTED, L.tint, L.lit);
    solve(L, t);
    const ph = S.ph, K = S.K;
    ctx.save();
    ctx.translate(L.x, L.y); ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(0, S.oy); ctx.rotate(S.pitch);
    const coatG = lg(ctx, 0, -42, 0, 21, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);

    wing(ctx, C, true);                                   // the far wing and leg, behind
    oneLeg(ctx, C, true, C.far);
    const tw = Math.sin(t * 2 + ph) * 1.5 + 2 * Math.sin(TAU * (S.p - 0.2)) * S.beat;
    TL[2][1] = 1 + tw * 0.5; TL[3][1] = 2 + tw;
    taper(ctx, TL, 14, 3, coatG);                         // a stub of a tail

    // ── the neck (under the body, so the cream belly stays whole), then the body:
    //    a chubby pear with a cream belly and a few soft spots
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    NP[3][0] = S.hx + (-9 * c - 5 * s) * HS; NP[3][1] = S.hy + (-9 * s + 5 * c) * HS;
    NP[2][0] = NP[3][0] - 8 - 3 * K; NP[2][1] = NP[3][1] + 7 + 3 * K;
    NP[1][0] = 30 - 2 * K; NP[1][1] = -9 - 4 * K;
    taper(ctx, NP, 31, 19, coatG);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, 0, 0, 21, [[0, alpha(C.belly, 0)], [0.5, alpha(C.belly, 0.96)], [0.75, C.belly], [1, C.bellyD]]);
    ctx.beginPath(); ctx.ellipse(4, 15, 36, 15, 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = alpha(C.spot, 0.55);
    for (let i = 0; i < SPOTS.length; i++){
      const s = SPOTS[i]; ctx.beginPath(); ctx.ellipse(s[0], s[1], s[2], s[3], -0.15, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.save(); body(); ctx.clip();                       // a rim light along the back (not across the neck)
    ctx.beginPath(); ctx.rect(-60, -40, 66, 30); ctx.clip();
    body(); ctx.strokeStyle = alpha(C.glow, 0.8); ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();

    if (L.carry) carried(ctx, C, L, t);                   // the egg, then the near foot over it
    oneLeg(ctx, C, false, coatG);

    // ── the head
    ctx.save();
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot); ctx.scale(HS, HS);
    drawHead(ctx, C, t);
    rings(ctx, 62, 3, S.q > 0.18 && S.q < 0.8 ? frac((S.q - 0.18) / 0.31) : 0, C.line, 0.6, 1.15);
    ctx.restore();

    wing(ctx, C, false);                                  // the near wing, in front
    ctx.restore();
  }

  window.PteroRig = { draw, feet, mouth, HEIGHT: 134, WIDTH: 130, ACT_SECONDS: 1.8, FLAP_CPS, COATS };
})();
