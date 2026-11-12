/* ── raptor.js — the RAPTOR (dinosaur rigs on the savanna kit, 2026-11) ─────
   A small, quick, feathered hunter in true profile — more fluffy chick than
   predator: a round head with a short snout, ONE big glossy eye, a blush and
   a fluffy feather CREST; a plump feathered body with a cream belly and bib;
   feathered arms (little wings with bright tips); a long stiff banded tail
   ending in a feather FAN; slim bare bird legs with the sickle claw held up
   on the inner toe.

   Legs: a BIPED on the kit's three-bone IK (hip → knee → ankle → toes). The
   thigh hides in a feather tuft, so the joint you see — the ankle — bends
   backward, as a bird's. Feet planted for the stance part of the cycle.
   WALK  = quick and bobbing, the head darting forward pigeon-style.
   L.run = a flat-out sprint: body low and level, neck stretched, tail
            straight out, arms swept back, a flight phase between the steps.
   pose 0..1 = CHIRP-HOP: it crouches, springs straight up with the arm
   feathers spread and the crest fanned, calls with the snout open (a real
   gap) and sound rings, then lands softly in a little squat.

   API — window.RaptorRig { draw(ctx, L, t), mouth(L[, t]) → {x, y}, HEIGHT,
         WIDTH, STRIDE, RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat }
   Depends only on ../savanna_rigs/kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, smooth, frac, lg, rg, alpha, palette, blob, bez, bezT, taper, step, leg,
          eye, blink, brow, scallop, rings } = window.SavKit;
  const PI = Math.PI;

  // ── coats: feathers (back / light / shade), cream belly, far-side feathers,
  //    markings, a0..a2 = the bright crest / wing-tip / tail-fan feathers
  const BASE = { eyeW: '#FFFDF6', pupil: '#1B1310', line: '#3A2A2E', tooth: '#FFFBEF', claw: '#FFF4DA', clawF: '#DCCDB0',
                 mouth: '#6A2238', tongue: '#FF8FA6', cheek: '#FF8E98' };
  const mk = o => Object.assign({}, BASE, o);
  const PALS = {
    sky:   mk({ coat: '#72BEF4', coatL: '#ACDEFF', coatD: '#4A98DC', belly: '#FFF7DE', bellyD: '#F4E2B4', far: '#3F82C4', spot: '#3E8AD2',
                a0: '#FFD650', a1: '#FF9A52', a2: '#FF6482', aF: '#D9A63C', leg: '#F4B860', legL: '#FFD58E', legF: '#CC9244', iris: '#B8651E' }),
    peach: mk({ coat: '#FFB280', coatL: '#FFD6AC', coatD: '#F08A60', belly: '#FFF8E8', bellyD: '#F8E0C0', far: '#D47452', spot: '#EE7E58',
                a0: '#62D0C6', a1: '#3FAEC0', a2: '#6E86E0', aF: '#3E96A0', leg: '#E89A8A', legL: '#FFC2B0', legF: '#BE7468', iris: '#3F8E86', cheek: '#FF7A8C' }),
    mint:  mk({ coat: '#80DEB8', coatL: '#B8F4D8', coatD: '#50C09A', belly: '#FFFCE6', bellyD: '#EEEABC', far: '#40A486', spot: '#44B090',
                a0: '#FF94B8', a1: '#FF6C92', a2: '#C864C8', aF: '#CC6A8C', leg: '#F6C26A', legL: '#FFDE9C', legF: '#CE9C4A', iris: '#B8651E' }),
    lilac: mk({ coat: '#C4A6F2', coatL: '#E4D0FF', coatD: '#9E7CDA', belly: '#FFF5F8', bellyD: '#F2D8E4', far: '#8765C0', spot: '#9270D4',
                a0: '#FFE26C', a1: '#FFB250', a2: '#FF8070', aF: '#D2A84C', leg: '#F2A8B8', legL: '#FFCCD8', legF: '#C8808E', iris: '#8A5326', cheek: '#FF8CBC' }),
    rose:  mk({ coat: '#FF96BA', coatL: '#FFC4D8', coatD: '#E86C96', belly: '#FFF7EE', bellyD: '#F6DEC8', far: '#CA5A80', spot: '#E2628E',
                a0: '#92DEF8', a1: '#5EB8F2', a2: '#7C80EA', aF: '#5E9CC8', leg: '#F6C070', legL: '#FFDCA0', legF: '#CC984E', iris: '#3F7EB8', cheek: '#FF6E8C' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'far', 'spot'];

  // lean = how far the foot bone tips per unit of reach; sw = the swing fold
  // (a bird's ankle swings up and BACK); snap < 1 = the feet leave the ground fast
  const WALK = { stride: 54, duty: 0.6, lift: 9, lean: 52, sw: -0.5, snap: 1, hip: 0.14 };
  const RUN  = { stride: 138, duty: 0.32, lift: 15, lean: 58, sw: -0.95, snap: 0.6, hip: 0.3 };

  const BODY = [[27, -62], [25, -75], [14, -83], [-2, -84.5], [-18, -80], [-28, -69], [-27, -55], [-16, -42], [0, -37], [15, -41], [24, -51]];
  const CREAM = [[36, -84], [38, -56], [26, -37], [4, -29], [-18, -32], [-32, -48], [-20, -48], [-5, -44.5], [8, -48], [14.5, -57], [16.5, -68], [20, -80]];
  const FEATHERS = [[-13, -72, 4], [-3, -75.5, 4], [7, -74, 3.8], [-19, -63, 3.8], [-9, -64.5, 4], [1.5, -66.5, 3.8], [-15, -55, 3.6]];
  const TOP = -84.5, CY = -60, OX = 12;
  const HP = [-4, -46], FREST = 1, FAR = 5, FARF = 9, FOLD = -0.3, TOE = 3;
  const LEN = [14, 22, 20], LW = [8, 9, 6, 5.4];
  // the head: PIV = where it sits on the neck, in head space; (HX, HY) = the jaw hinge
  const PIV = [-5, 3], HS = 1.3, HX = 1, HY = 4.5;
  const SKULL = [[-11, 3.5], [-12.5, -4], [-8.5, -11], [0, -14], [8.5, -12], [15.5, -7.6], [22, -4.4], [26.5, -1.6], [27.4, 2],
                 [24, 5], [13, 5.6], [2, 6], [-6, 6]];
  const JAW = [[-2.5, 4], [8, 5], [20, 4.6], [25.6, 4.4], [26.4, 6.6], [20, 9], [8, 10], [-3.5, 9]];
  const TONGUE = [[3, 6.4], [8, 3.6], [16, 3.2], [21.4, 4.6], [19, 6.6], [9, 7]];
  const UTEETH = [13.6, 18, 22.2];
  const SHOULDER = [12, -65], TAILROOT = [-20, -64];

  // 'rgb(r,g,b)' × 2 → the mix, k of the second
  function mix(a, b, k){
    const p = a.match(/[\d.]+/g), q = b.match(/[\d.]+/g);
    return 'rgb(' + Math.round(+p[0] + (q[0] - p[0]) * k) + ',' + Math.round(+p[1] + (q[1] - p[1]) * k) + ',' + Math.round(+p[2] + (q[2] - p[2]) * k) + ')';
  }
  // colours derived once per cached palette
  function derive(C, lit){
    const li = lit || [1, 1, 1], q = v => Math.min(255, Math.round(v));
    const warm = 'rgb(' + q(255 * li[0]) + ',' + q(244 * li[1]) + ',' + q(214 * li[2]) + ')';
    const rimC = mix(C.coatL, warm, 0.6);
    return { rim: alpha(rimC, 0.8), rim0: alpha(rimC, 0), blush: alpha(C.cheek, 0.92), blush1: alpha(C.cheek, 0.6), blush0: alpha(C.cheek, 0),
             tip: alpha(C.coatL, 0.7), band: alpha(C.spot, 0.75), brow: alpha(mix(C.coatD, C.line, 0.3), 0.85),
             smile: alpha(mix(C.coatD, C.line, 0.55), 0.8), nostril: alpha(C.line, 0.5), a0D: mix(C.a0, C.a1, 0.5), a1D: mix(C.a1, C.a2, 0.5),
             legD: mix(C.leg, C.legF, 0.55), aFD: mix(C.aF, C.line, 0.16), wing: mix(C.coat, C.coatD, 0.45) };
  }
  // ── the pose, solved once per draw (and by mouth()): a SHARED scratch
  const S = { NP: [[0, 0], [0, 0], [0, 0], [0, 0]], TP: [[0, 0], [0, 0], [0, 0], [0, 0]], ux: 0, uy: 0 };
  let lastT = 0;
  // a point of the head (head space) → unit space, through the head and body frames
  function toUnit(hx, hy){
    const ch = Math.cos(S.headRot), sh = Math.sin(S.headRot), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const x = (hx - PIV[0]) * HS, y = (hy - PIV[1]) * HS;
    const bx = S.NP[3][0] + x * ch - y * sh - HP[0], by = S.NP[3][1] + x * sh + y * ch - HP[1];
    S.ux = HP[0] + bx * cp - by * sp + OX; S.uy = HP[1] + bx * sp + by * cp + S.drop;
  }
  function solve(L, t){
    const ph = S.ph = L.ph || 0, go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const run = S.run = L.run ? go : 0, walk = go - run, cyc = S.cyc = (L.wt || 0) / TAU, G = S.G = L.run ? RUN : WALK;
    const p = S.p = clamp01(L.pose || 0);
    // CHIRP-HOP: crouch → spring → airtime (a parabola) → a soft squat → up again
    let hop = 0, sq = 0, air = 0, lag = 0, flap = 0;
    if (p > 0){
      if (p < 0.2) sq = 9 * smooth(p / 0.2);
      else if (p < 0.28){ const k = (p - 0.2) / 0.08; sq = 9 * (1 - k * k); }
      else if (p < 0.72){ const u = (p - 0.28) / 0.44; hop = 36 * 4 * u * (1 - u); lag = 1 - 2 * u; flap = Math.sin(u * TAU * 2.5); }
      else if (p < 0.8) sq = 8 * Math.sin((p - 0.72) / 0.08 * PI / 2);
      else sq = 8 * (1 - smooth((p - 0.8) / 0.2));
      air = smooth(clamp01((p - 0.23) / 0.1)) * smooth(clamp01((0.8 - p) / 0.1));
    }
    const call = S.call = p > 0 ? smooth(clamp01((p - 0.3) / 0.07)) * smooth(clamp01((0.7 - p) / 0.08)) : 0;
    S.hop = hop; S.air = air; S.sq = sq;
    S.footLift = hop > 7 ? (hop - 7) * 1.2 : 0;                         // the legs stretch first, then the feet leave the ground
    let drop, pitch;
    if (L.run){
      drop = go * (5 + 2.6 * Math.cos(2 * TAU * (cyc - G.duty / 2)));   // low, with a small bounce
      pitch = go * (0.2 + 0.025 * Math.sin(2 * TAU * (cyc - 0.05)));
    } else {
      drop = go * (0.6 + 1.5 * Math.cos(2 * TAU * (cyc - 0.08)));       // a quick bob on every step
      pitch = go * 0.035 * Math.sin(2 * TAU * (cyc - 0.1));
    }
    const br = Math.sin(t * 1.5 + ph);
    S.breathe = 1 + br * 0.014;
    S.drop = drop + sq - hop;
    S.pitch = pitch + 0.014 * sq - 0.2 * air;
    // neck (an S) and head: darting pigeon-style at the walk, stretched out at the run, up for the hop
    const u2 = frac(2 * cyc + 0.2), saw = u2 < 0.66 ? 1 - 2 * u2 / 0.66 : -1 + 2 * smooth((u2 - 0.66) / 0.34);
    const dart = walk * 5 * saw, peek = Math.pow(Math.max(0, Math.sin(t * 0.41 + ph * 1.9)), 22), NP = S.NP;
    NP[0][0] = 15; NP[0][1] = -71;
    NP[1][0] = 27 + dart * 0.2 + 3 * run; NP[1][1] = -76 + 2 * run;
    NP[2][0] = 23 + dart * 0.7 + 10 * run - 2 * air; NP[2][1] = -82 + 5 * run - 2 * air + 0.2 * sq;
    NP[3][0] = 31 + dart + 11 * run - 2 * air + 0.2 * sq + peek * 1.5; NP[3][1] = -84 + 7 * run - 5 * air + 0.3 * sq - br * 0.5;
    S.headRot = -S.pitch * 0.8 + Math.sin(t * 0.7 + ph) * 0.04 + peek * 0.2 - 0.03 * dart - 0.24 * air + 0.012 * sq + 0.05 * run;
    S.jaw = call * (0.5 + 0.1 * Math.sin(p * TAU * 11));
    S.fan = Math.max(air, 0.5 * peek); S.sweep = run;                    // the crest: fanned up / swept back
    // the arm feathers: folded along the body, swept back at the run, spread and flapping in the air
    S.wopen = Math.max(air, 0.3 * run);
    S.wrot = Math.sin(t * 1.9 + ph) * 0.04 + walk * 0.08 * Math.sin(2 * TAU * cyc) + 0.22 * run + run * 0.06 * Math.sin(2 * TAU * cyc + 1)
           + air * (1.3 + 0.42 * flap) - 0.03 * sq;
    // tail: stiff — it bobs as one piece; level behind the sprint; it lags behind the hop
    const tb = Math.sin(t * 1.5 + ph) * 2.4 + walk * 2.2 * Math.sin(2 * TAU * cyc + 0.6) + run * 1.4 * Math.sin(2 * TAU * cyc + 2);
    const tl = 12 * run + 9 * lag * air - 0.7 * sq, TP = S.TP;
    TP[0][0] = TAILROOT[0]; TP[0][1] = TAILROOT[1];
    TP[1][0] = -37; TP[1][1] = -67 + tl * 0.22 + tb * 0.2;
    TP[2][0] = -54; TP[2][1] = -69.5 + tl * 0.6 + tb * 0.6;
    TP[3][0] = -70; TP[3][1] = -71.5 + tl + tb;
    S.spread = 0.3 + 0.2 * air + 0.03 * Math.sin(t * 2.1 + ph);
    // the mouth: midway between the lip tips
    const cj = Math.cos(S.jaw), sj = Math.sin(S.jaw);
    const lx = HX + (26.4 - HX) * cj - (5.6 - HY) * sj, ly = HY + (26.4 - HX) * sj + (5.6 - HY) * cj;
    S.mhx = (27.4 + lx) / 2; S.mhy = (3.6 + ly) / 2;
  }
  function mouth(L, t){
    solve(L, t == null ? lastT : t);
    toUnit(S.mhx, S.mhy);
    return { x: L.x + S.ux * L.s * (L.dir || 1), y: L.y + S.uy * L.s };
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
  // a little cream claw at (x, y) pointing along angle a, curling down; r = its length (adds a sub-path)
  function claw(g, x, y, a, r){
    const c = Math.cos(a), s = Math.sin(a);
    g.moveTo(x + (-0.1 * c + 0.48 * s) * r, y + (-0.1 * s - 0.48 * c) * r);
    g.quadraticCurveTo(x + (0.7 * c + 0.4 * s) * r, y + (0.7 * s - 0.4 * c) * r, x + (1 * c - 0.34 * s) * r, y + (1 * s + 0.34 * c) * r);
    g.quadraticCurveTo(x + (0.5 * c - 0.5 * s) * r, y + (0.5 * s + 0.5 * c) * r, x + (-0.1 * c - 0.46 * s) * r, y + (-0.1 * s + 0.46 * c) * r);
    g.closePath();
  }
  // a soft leaf of a feather from (x, y) along angle a; l = length, w = fullness (adds a sub-path)
  function feather(g, x, y, a, l, w){
    const c = Math.cos(a) * l, s = Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    g.moveTo(x, y);
    g.bezierCurveTo(x + c * 0.25 + nx, y + s * 0.25 + ny, x + c * 0.86 + nx * 0.8, y + s * 0.86 + ny * 0.8, x + c, y + s);
    g.bezierCurveTo(x + c * 0.86 - nx * 0.8, y + s * 0.86 - ny * 0.8, x + c * 0.25 - nx, y + s * 0.25 - ny, x, y);
  }

  // ── the head, in head space: skull centre (0,0), snout toward +x. The crest
  //    feathers fan up (S.fan) or sweep flat (S.sweep); the lower jaw hinges
  //    at (HX, HY) — the gap stays EMPTY, only the throat wedge is dark.
  const CREST = [8, 10.2, 11.6, 10.2, 8];
  function drawHead(g, C, t){
    const J = S.jaw, ph = S.ph, open = J > 0.03, fan = S.fan, sweep = S.sweep;
    for (let i = 0; i < 5; i++){
      const a = -2.72 + i * 0.17 + fan * (0.17 + i * 0.21) - sweep * (0.23 + i * 0.1) + Math.sin(t * 2.3 + ph + i * 1.3) * 0.035;
      g.fillStyle = i === 0 ? C.a2 : (i & 1 ? C.a1 : C.a0);
      g.beginPath(); feather(g, -7.5 + i * 2.6, -10.6 - Math.sin((i + 0.5) / 5 * PI) * 2.2, a, CREST[i] * (1 + 0.24 * fan), 4.4); g.fill();
    }
    if (open){
      const d = 9.5, cj = Math.cos(J), sj = Math.sin(J), lx = HX + d * cj - 1.2 * sj, ly = HY + d * sj + 1.2 * cj;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2.5, HY - 1.4); g.lineTo(HX + d, 4.4);
      g.quadraticCurveTo(HX + d * 0.62, (4.4 + ly) / 2, lx, ly); g.lineTo(HX - 2.5, HY + 2.2); g.closePath(); g.fill();
    }
    g.save();                                             // the lower jaw on its hinge
    g.translate(HX, HY); g.rotate(J); g.translate(-HX, -HY);
    if (open){ g.fillStyle = C.tongue; blob(g, TONGUE, 5); g.fill(); }
    g.fillStyle = lg(g, 0, 4, 0, 10, [[0, C.belly], [1, C.bellyD]]);
    blob(g, JAW, 5.5); g.fill();
    g.restore();
    if (open){                                            // a few tiny teeth show in the call
      g.fillStyle = C.tooth; g.beginPath();
      for (let i = 0; i < UTEETH.length; i++){
        const x = UTEETH[i]; g.moveTo(x - 1.9, 4.2); g.bezierCurveTo(x - 1.7, 8.6, x + 1.7, 8.6, x + 1.9, 4.2);
      }
      g.fill();
    }
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -14, 0, 6, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    rimFade(g, C, skull, -13, -2, 1.1);
    blush(g, C, -3.6, 2.4, 5.4, 0.7);
    g.fillStyle = C.x.nostril;
    g.beginPath(); g.ellipse(23.4, -0.7, 1.15, 0.75, -0.4, 0, TAU); g.fill();
    if (J < 0.12){                                        // the corner of the smile
      g.strokeStyle = C.x.smile; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(9.5, 5.7); g.quadraticCurveTo(3.4, 6.5, 1, 3); g.stroke();
    }
    // ONE big eye; it opens wide for the hop
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.5)) * (1 + 0.07 * S.air);
    eye(g, 3.6, -3.7, 5.7, 6.3, eyeH, Math.sin(t * 0.33 + ph) * 0.5 + 0.25, C, { iris: 0.82 - 0.1 * S.air, lid: 1.25 });
    brow(g, C.x.brow, -0.6, -11.6 - 0.6 * S.air, 3.8, -13.2 - 0.7 * S.air, 8.2, -11.3 - 0.5 * S.air, 1.1);
  }
  // ── the foot, in foot space: the toe joint at (0,0), the ground on y = TOE.
  //    Two slim toes on the ground, and the inner toe held UP with its big
  //    sickle claw.
  function foot(g, C, x, y, rot, far){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.lineCap = 'round';
    g.strokeStyle = far ? C.legF : C.x.legD; g.lineWidth = 3.4;          // the outer toe, a step behind
    g.beginPath(); g.moveTo(-1, -0.2); g.lineTo(11.8, TOE - 2.8); g.stroke();
    g.strokeStyle = far ? C.legF : C.leg; g.lineWidth = 3.6;             // the middle toe
    g.beginPath(); g.moveTo(-1.4, 0.6); g.lineTo(9, TOE - 1.8); g.stroke();
    g.fillStyle = far ? C.clawF : C.claw;
    g.beginPath(); claw(g, 12.8, TOE - 2.7, 0.12, 2.8); if (!far) claw(g, 10, TOE - 1.7, 0.12, 2.8); g.fill();
    g.strokeStyle = far ? C.legF : C.legL; g.lineWidth = 3.4;            // the inner toe, raised …
    g.beginPath(); g.moveTo(0, -0.6); g.lineTo(4, -4.2); g.stroke();
    g.fillStyle = far ? C.clawF : C.claw;                                // … and its sickle
    g.beginPath(); claw(g, 4.2, -4.8, 0.45, far ? 4.6 : 5.4); g.fill();
    g.restore();
  }

  // ── a feathered arm, in wing space: the shoulder at (0,0), lying back and
  //    down along the body. open 0..1 fans the five bright flight feathers.
  //    (The caller's rotation lifts it: + = up.)
  function wing(g, C, coatG, open, far){
    const A0 = 2.79;
    for (let i = 0; i < 5; i++){
      const a = A0 + (i - 2) * (0.14 + 0.24 * open), l = (15 + 3 * i) * (1 + 0.22 * open);
      g.fillStyle = far ? (i & 1 ? C.aF : C.x.aFD) : (i === 2 ? C.a2 : (i & 1 ? C.a1 : C.a0));
      g.beginPath(); feather(g, -2.5 - 1.7 * i, 1 + 0.6 * i, a, l, 4.4); g.fill();
    }
    g.fillStyle = far ? C.far : C.x.wing;                                // the fluffy arm over their roots
    scallop(g, -4.6, 1.8, 7.6, 5, 7, 0.14, 0.4, -0.36); g.fill();
    if (!far){
      g.strokeStyle = C.x.tip; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-8.4, 1.8); g.arc(-6.2, 1.8, 2.2, PI, 0, true); g.moveTo(-3.3, 0.4); g.arc(-1.2, 0.4, 2.1, PI, 0, true); g.stroke();
    }
  }

  // ── the tail: a long stiff tapered tube along S.TP with soft bands, ending
  //    in a fan of five feathers (the middle one longest)
  const FANO = [0, 4, 1, 3, 2], BANDS = [0.4, 0.6, 0.8];
  function tail(g, C, coatG){
    const TP = S.TP, tip = bez(TP, 1), d = bezT(TP, 1), ta = Math.atan2(d[1], d[0]);
    const bx = tip[0] - Math.cos(ta) * 3, by = tip[1] - Math.sin(ta) * 3;
    for (let i = 0; i < 5; i++){
      const k = FANO[i];
      g.fillStyle = k === 2 ? C.a0 : (k & 1 ? C.a1 : C.a2);
      g.beginPath(); feather(g, bx, by, ta + (k - 2) * S.spread, 28 - Math.abs(k - 2) * 4, 9); g.fill();
    }
    taper(g, TP, 16, 5.6, coatG, { steps: 10 });
    g.strokeStyle = C.x.band; g.lineCap = 'butt'; g.lineWidth = 3.2;
    g.beginPath();
    for (let j = 0; j < BANDS.length; j++){
      const u = BANDS[j], p = bez(TP, u), q = bezT(TP, u), l = Math.hypot(q[0], q[1]) || 1, w = (16 - 10.4 * u) / 2 - 0.25;
      g.moveTo(p[0] + q[1] / l * w, p[1] - q[0] / l * w); g.lineTo(p[0] - q[1] / l * w, p[1] + q[0] / l * w);
    }
    g.stroke();
  }
  function draw(ctx, L, t){
    const C = palette(PALS[L.coat] || PALS.sky, TINTED, L.tint, L.lit);
    if (!C.x) C.x = derive(C, L.lit);
    solve(L, t); lastT = t;
    const g = ctx, go = S.go, G = S.G, NP = S.NP;

    g.save();
    g.translate(L.x, L.y);
    g.scale(L.s * (L.dir || 1), L.s);
    g.translate(OX, 0);
    const coatG = lg(g, 0, TOP - 8, 0, -38, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    const legG = lg(g, 0, -36, 0, 0, [[0, C.x.legD], [0.45, C.leg], [1, C.legL]]);
    const thighG = lg(g, 0, -58, 0, -28, [[0, C.coat], [1, C.coatD]]);
    const bellyG = lg(g, 0, -86, 0, -36, [[0, C.belly], [1, C.bellyD]]);
    const droop = clamp01(S.footLift / 8);                // toes hang when it is off the ground

    function oneLeg(far){
      const st = step(S.cyc + (far ? 0.5 : 0), G.duty);
      const reach = st.x * G.stride * go, lift = Math.pow(st.lift, G.snap) * G.lift * go + S.footLift;
      const swing = st.sw ? Math.sin(PI * st.sw) * go : 0, frot = swing * (1 - 1.5 * st.sw) + 0.7 * droop;
      const rx = HP[0] + (far ? FAR : 0) + reach * G.hip, ry = HP[1] + S.drop;
      const fold = FOLD - reach / G.lean + swing * G.sw - 0.22 * droop;
      const ch = leg(g, rx, ry, FREST + (far ? FARF : 0) + reach, -lift - TOE, LEN[0], LEN[1], LEN[2], LW, 1, fold, far ? C.legF : legG);
      g.beginPath(); g.arc(ch[2][0], ch[2][1], 3.5, 0, TAU); g.fill();        // the knobbly ankle
      foot(g, C, ch[3][0], ch[3][1], frot, far);
      // the feathered thigh: a fluffy tuft over hip + knee, so the bare leg comes out of the plumage
      const mx = (ch[0][0] + ch[1][0]) / 2, my = (ch[0][1] + ch[1][1]) / 2 + 1;
      g.fillStyle = far ? C.far : thighG;
      scallop(g, mx, my, 12.5, 9.6, 8, 0.15, 0.3, Math.atan2(ch[1][1] - ch[0][1], ch[1][0] - ch[0][0])); g.fill();
    }
    const bodyFrame = () => { g.translate(0, S.drop); g.translate(HP[0], HP[1]); g.rotate(S.pitch); g.translate(-HP[0], -HP[1]); };

    oneLeg(true);                                         // far leg, behind

    // ── far arm, tail with its fan, then the plump body: cream belly, feather tips
    g.save(); bodyFrame();
    g.save(); g.translate(SHOULDER[0] + 4, SHOULDER[1] - 1.5); g.rotate(S.wrot * 1.12 + 0.1); wing(g, C, coatG, S.wopen, true); g.restore();
    tail(g, C, coatG);
    g.translate(0, CY); g.scale(1, S.breathe); g.translate(0, -CY);
    const body = () => blob(g, BODY, 5.5);
    g.fillStyle = coatG; body(); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = bellyG; blob(g, CREAM, 5.5); g.fill();
    g.restore();
    g.strokeStyle = C.x.tip; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < FEATHERS.length; i++){ const f = FEATHERS[i]; g.moveTo(f[0] + f[2], f[1]); g.arc(f[0], f[1], f[2], 0, PI); }
    g.stroke();
    rimFade(g, C, body, TOP - 2, -64, 1.3);
    g.restore();

    oneLeg(false);                                        // near leg, in front

    // ── neck, the fluffy cream bib, the near arm, then the head and its call
    g.save(); bodyFrame();
    g.translate(3.4, 1.8); taper(g, NP, 21, 14.5, bellyG, { steps: 10 }); g.translate(-3.4, -1.8);   // the cream throat
    taper(g, NP, 21, 14.5, coatG, { steps: 10 });
    g.fillStyle = bellyG; scallop(g, 23.6, -66, 5.2, 8.6, 6, 0.24, 0.5, 0.32); g.fill();             // chest fluff
    g.save(); g.translate(SHOULDER[0], SHOULDER[1]); g.rotate(S.wrot); wing(g, C, coatG, S.wopen, false); g.restore();
    g.translate(NP[3][0], NP[3][1]); g.rotate(S.headRot); g.scale(HS, HS); g.translate(-PIV[0], -PIV[1]);
    drawHead(g, C, t);
    if (S.call > 0.3){                                    // chirp · chirp
      g.translate(S.mhx, S.mhy); g.rotate(S.jaw * 0.5 - 0.05);
      const rk = 0.02 + 0.96 * frac((S.p - 0.31) / 0.19);
      rings(g, 4.4, 0, rk, C.eyeW, 0.6, 0.72);            // a light twin, so they show against a night sky too
      rings(g, 3, 0, rk, C.line, 0.6, 0.72);
    }
    g.restore();
    g.restore();
  }

  window.RaptorRig = { draw, mouth, HEIGHT: 116, WIDTH: 86, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 1.7,
                       WALK_CPS: 1.5, RUN_CPS: 2.7, COATS };
})();
