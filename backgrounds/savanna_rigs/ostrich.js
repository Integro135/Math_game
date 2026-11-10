/* ── ostrich.js — the OSTRICH, drawn from scratch (v2, 2026-11) ─────────────
   A tall silly bird in true profile: a big fluffy egg of charcoal plumage
   carried high and level on two long bare pink legs, white plumes puffing out
   at the tail and hanging from the wing edge, a long thin pink neck in an S
   with a white fuzz collar at its base, and a small round head — ONE huge
   eye with long lashes, a short flat orange beak, a wisp of fluff on top.

   Legs: a BIPED on the kit's three-bone IK (hip → knee → ankle → toes). The
   thigh is hidden in a feathered tuft against the body; the knee points
   forward under the plumage, so the joint you SEE — the ankle — bends
   backward. A big two-toed foot, planted for the stance part of the cycle.
   WALK = a stately stride, the head bobbing back-and-forth pigeon style.
   L.run = long bounds with a flight phase: body tipped forward, neck
   stretched out, wing half open, plumes streaming.
   pose 0..1 = DISPLAY SQUAWK: the wing fans up and open (all the white
   plumes), the tail fluffs, the body bobs, the neck stretches up tall and the
   beak opens wide (a real gap — pink tongue, dark only at the throat) with
   sound rings bursting from it.

   API — window.OstrichRig { draw(ctx, L, t), HEIGHT, WIDTH, STRIDE, RUN_STRIDE,
                             ACT_SECONDS, WALK_CPS, RUN_CPS }
   Depends only on kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, smooth, frac, lg, alpha, palette, blob, taper, step, leg, xf,
          eye, blink, rim, scallop, rings, bowtie, ribbon } = window.SavKit;

  const PAL = { coat: '#3B3538', coatL: '#62595B', coatD: '#211D20', plume: '#FFFDF7', plumeD: '#E2D9CC', plumeF: '#EBE4D8', plumeFD: '#C8BDAE',
                skin: '#E6B4A8', skinL: '#F6D3C7', skinD: '#C48E86', skinF: '#A97F79', claw: '#5B463F',
                beak: '#F5A062', beakL: '#FFC58C', beakD: '#DB7C4A', fuzz: '#A3948E',
                eyeW: '#FFF8EC', iris: '#7A4A22', pupil: '#17100C', line: '#2A2022',
                mouth: '#5A1F2A', tongue: '#F08490' };
  const COAT = ['coat', 'coatL', 'coatD', 'skin', 'skinL', 'skinD', 'skinF'];
  // lean = how far the shank tips per unit of reach. sw = the swing fold: a
  // bird's ankle only ever bends ONE way (it points backward), so to lift the
  // foot the ankle swings up and BACK under the tail and the shank tips
  // forward (a "Z") — the opposite sign to a mammal's hock.
  const WALK = { stride: 78, duty: 0.62, lift: 13, lean: 74, sw: -0.42, snap: 1 };
  const RUN  = { stride: 196, duty: 0.36, lift: 34, lean: 72, sw: -0.9, snap: 0.6 };   // snap: the feet leave the ground fast

  const BODY = [[39, -100], [35, -116], [17, -126], [-8, -128], [-31, -122], [-47, -109], [-49, -93], [-38, -78], [-15, -70], [10, -69], [30, -79]];
  const TOP = -128, CY = -98, HP = [-3, -90], FREST = -2, FAR = 6, FARF = 12, FOLD = -0.16, TOE = 5.2, HS = 1.45;
  const LEN = [20, 42, 46], LW = [12, 19, 10, 7.6];
  const SHOULDER = [19, -108];
  const FEATHERS = [[27, -96, 5], [18, -88, 5], [30, -86, 4.4], [22, -78, 4.4], [8, -78, 4.6], [-36, -90, 5], [-27, -82, 4.6], [-40, -101, 4.4], [-14, -76, 4.4]];
  const SKULL = [[-9.5, 1], [-8.6, -6], [-2, -9.6], [5, -8.6], [10, -4.2], [12, 0.4], [9, 4.6], [2, 6.6], [-5, 6]];

  // the head, in head space: skull centre (0,0), beak toward +x. K = squawk.
  function drawHead(g, C, L, t, K, J){
    const ph = L.ph || 0, jaw = 0.66 * J, up = -0.3 * J, HX = 5, HY = 2.6;
    if (K > 0.03){                                        // the throat, back at the hinge
      const d = 6.5;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 2, HY - 1.4); g.lineTo(HX + d * Math.cos(up), HY + d * Math.sin(up) - 0.4);
      g.lineTo(HX + d * Math.cos(jaw), HY + d * Math.sin(jaw) + 0.6); g.lineTo(HX - 2, HY + 2.4); g.closePath(); g.fill();
    }
    g.save();                                             // lower mandible on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    if (K > 0.08){
      g.fillStyle = C.tongue; g.beginPath(); g.ellipse(13, 2.7 - 0.5 * K, 6.6, 0.8 + 1.5 * K, -0.06, 0, TAU); g.fill();
    }
    g.fillStyle = C.beakD;
    g.beginPath(); g.moveTo(4, 2.6); g.lineTo(23, 2.7); g.quadraticCurveTo(24.4, 4.4, 21.4, 5.2); g.quadraticCurveTo(12, 6.6, 4, 6); g.closePath(); g.fill();
    g.restore();
    g.save();                                             // upper mandible (it lifts a little too)
    g.translate(HX, HY); g.rotate(up); g.translate(-HX, -HY);
    g.fillStyle = lg(g, 0, -5, 0, 3.4, [[0, C.beakL], [0.55, C.beak], [1, C.beakD]]);
    g.beginPath(); g.moveTo(5, -5); g.quadraticCurveTo(17, -5, 25.4, 0.4); g.quadraticCurveTo(27, 2.6, 24.6, 3.1); g.lineTo(4, 3.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(90,40,20,.5)';                    // nostril
    g.beginPath(); g.ellipse(15.5, -1.5, 1.7, 0.9, 0.25, 0, TAU); g.fill();
    g.restore();
    // skull
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -10, 0, 7, [[0, C.skinL], [0.55, C.skin], [1, C.skinD]]);
    skull(); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(1.5, 3.6, 3.4, 1.9, 0, 0, TAU); g.fill();
    rim(g, skull, -4, C.rim, 1.2);
    g.strokeStyle = alpha(C.line, 0.5); g.lineWidth = 0.9; g.lineCap = 'round';      // the corner of a smile
    if (K < 0.2){ g.beginPath(); g.moveTo(12, 3); g.quadraticCurveTo(8.4, 4.6, 6.6, 2.4); g.stroke(); }
    // a wisp of fluff on the crown, curling back; it stands on end for the squawk
    const sway = Math.sin(t * 2.1 + ph) * 0.1;
    g.strokeStyle = C.fuzz; g.lineWidth = 1.05;
    g.beginPath();
    for (let i = 0; i < 5; i++){
      const bx = -7.4 + i * 2, by = -7.6 - Math.sin((i + 0.6) / 5.4 * Math.PI) * 2, l = 4.6 + (i % 2) * 2.4 + 2 * K;
      const a = -2.25 + i * 0.16 + sway * (1 + i * 0.3) + 0.55 * K;
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + Math.cos(a + 0.5) * l * 0.55, by + Math.sin(a + 0.5) * l * 0.55, bx + Math.cos(a) * l, by + Math.sin(a) * l);
    }
    g.stroke();
    // ONE huge eye with long lashes; it pops wide for the squawk
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 + 0.06 * K);
    eye(g, 3, -1.3, 4.5, 5, eyeH, Math.sin(t * 0.3 + ph) * 0.5 + 0.2, C, { iris: 0.8 - 0.14 * K, lid: 1.1 });
    g.strokeStyle = C.line; g.lineWidth = 0.85; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-1.1, -3.2); g.lineTo(-4.3, -4.6); g.moveTo(-0.3, -4.6); g.lineTo(-2.9, -7); g.moveTo(1.2, -5.7); g.lineTo(-0.1, -8.6);
    g.stroke();
    if (L.ribbon) ribbon(g, -3.5, -11, 5.2, -0.2);
  }

  // the two-toed foot, in foot space: the toe joint at (0,0), the sole on y = TOE.
  // The big toe with its claw, and the short outer toe lying against it.
  function foot(g, C, x, y, rot, far){
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1.3, 1.3);
    g.fillStyle = far ? C.skinF : C.skin;                 // the big toe, flat on the ground
    g.beginPath(); g.moveTo(-4.8, 0.6); g.quadraticCurveTo(-4.8, -3.6, 0, -3.5); g.quadraticCurveTo(9, -1.6, 16, 0.8);
    g.quadraticCurveTo(19, 2.2, 18.4, 4); g.lineTo(-2.6, 4); g.quadraticCurveTo(-4.8, 3.6, -4.8, 0.6); g.fill();
    g.fillStyle = C.claw;
    g.beginPath(); g.moveTo(15.2, 0.6); g.quadraticCurveTo(20.6, 1.4, 22, 4); g.lineTo(15.8, 4); g.closePath(); g.fill();
    if (!far){                                            // the outer toe
      g.fillStyle = C.skinL;
      g.beginPath(); g.moveTo(-1.5, 0.6); g.quadraticCurveTo(5, 0, 10.4, 1.5); g.quadraticCurveTo(12.6, 2.6, 11.6, 4); g.lineTo(-1, 4); g.quadraticCurveTo(-2.6, 2.4, -1.5, 0.6); g.fill();
    }
    g.restore();
  }

  // the wing, in wing space: shoulder at (0,0), lying back along −x. open 0..1
  // fans the white plumes out (and a crown of them past the tip); ruf ruffles
  // the lobes. far = the other wing, seen behind the body, in shadow.
  function wing(g, C, open, ruf, far){
    const fan = 1 + 0.6 * open, wh = far ? C.plumeF : C.plume, sh = far ? C.plumeFD : C.plumeD;
    if (open > 0.05){
      g.fillStyle = sh; scallop(g, -54 - 8 * open, 1, 17 * open, 13 * open, 7, 0.3, -ruf, 0.2); g.fill();
      g.fillStyle = wh;       scallop(g, -50 - 6 * open, 3, 14 * open, 10.5 * open, 6, 0.32, ruf + 0.5, 0.1); g.fill();
    }
    g.fillStyle = sh; scallop(g, -45 - 6 * open, 12, 17 * fan, 12 * fan, 7, 0.3, ruf, 0.3); g.fill();
    g.fillStyle = wh;       scallop(g, -39 - 5 * open, 15, 15 * fan, 10 * fan, 6, 0.32, 0.4 - ruf, 0.2); g.fill();
    g.fillStyle = wh;       scallop(g, -20 - 2 * open, 15 + 3 * open, 14 * fan, 8.6 * fan, 6, 0.32, 0.9 + ruf, 0.05); g.fill();
    g.fillStyle = far ? C.coatD : lg(g, 0, -12, 0, 19, [[0, C.coatL], [0.6, C.coat], [1, C.coatD]]);
    scallop(g, -21, 3, 29, 14.5, 9, 0.16, ruf * 0.5, 0.1); g.fill();
    if (!far){ g.fillStyle = alpha(C.coatL, 0.5); scallop(g, -15, -0.5, 18, 8, 7, 0.2, -ruf, 0.1); g.fill(); }
  }

  function draw(ctx, L, t){
    const C = palette(PAL, COAT, L.tint, L.lit);
    const ph = L.ph || 0, go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = L.run ? RUN : WALK, run = L.run ? go : 0, cyc = (L.wt || 0) / TAU;
    const P = L.pose ? clamp01(L.pose) : 0, K = Math.sin(P * Math.PI);
    // the body: a small bob at the walk; at the run it sinks in mid-stance and
    // sails through the flight phase, tipped forward. The squawk bobs it.
    let drop = L.run ? go * 8.5 * Math.cos(2 * TAU * (cyc - G.duty / 2)) : go * 1.5 * Math.sin(2 * TAU * cyc + 0.6);
    let pitch = 0.15 * run + 0.025 * run * Math.sin(2 * TAU * (cyc - 0.05));
    drop += -3 * K + K * Math.sin(P * TAU * 5) * 2.4; pitch -= 0.1 * K;
    const breathe = 1 + Math.sin(t * 1.2 + ph) * 0.012;
    const ruf = Math.sin(t * 1.4 + ph) * 0.07 + go * Math.sin(2 * TAU * cyc) * 0.06 + K * Math.sin(t * 19) * 0.07;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    const coatG = lg(ctx, 0, TOP, 0, -66, [[0, C.coatL], [0.45, C.coat], [1, C.coatD]]);
    const skinG = lg(ctx, 0, -82, 0, 0, [[0, C.skinD], [0.4, C.skin], [1, C.skinL]]);

    function oneLeg(far){
      const st = step(cyc + (far ? 0.5 : 0), G.duty);
      const reach = st.x * G.stride * go, lift = Math.pow(st.lift, G.snap) * G.lift * go;
      const swing = st.sw ? Math.sin(Math.PI * st.sw) * go : 0, dx = far ? FAR : 0;
      const r = xf(HP[0] + dx, HP[1], 0, CY, pitch, reach * 0.12, drop);
      const fold = FOLD - reach / G.lean + swing * G.sw;
      const ch = leg(ctx, r[0], r[1], FREST + (far ? FARF : 0) + reach, -lift - TOE, LEN[0], LEN[1], LEN[2], LW, 1, fold, far ? C.skinF : skinG);
      ctx.beginPath(); ctx.arc(ch[2][0], ch[2][1], 6, 0, TAU); ctx.fill();          // the knobbly ankle
      foot(ctx, C, ch[3][0], ch[3][1], swing * (1.1 - 1.5 * st.sw), far);      // toes droop, then lift to land
      // the feathered thigh: a fluffy tuft over hip + knee, so the bare leg
      // comes out of the plumage
      const mx = (ch[0][0] + ch[1][0]) / 2, my = (ch[0][1] + ch[1][1]) / 2 + 2;
      ctx.fillStyle = far ? C.coatD : coatG;
      scallop(ctx, mx, my, 22, 16, 8, 0.16, 0.3, Math.atan2(ch[1][1] - ch[0][1], ch[1][0] - ch[0][0]));
      ctx.fill();
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, CY); ctx.rotate(pitch); ctx.translate(0, -CY); };

    oneLeg(true);                                         // far leg, behind

    // ── tail plumes, then the egg of a body
    ctx.save(); bodyFrame();
    const wopen = Math.max(K, 0.35 * run), wrot = 0.3 * run + 1.0 * K + ruf * 0.3 + run * Math.sin(2 * TAU * cyc + 1) * 0.07;
    if (wopen > 0.05){                                    // the far wing, up behind the back
      ctx.save(); ctx.translate(SHOULDER[0] + FAR + 2, SHOULDER[1] - 2); ctx.rotate(wrot * 1.28 + 0.08);
      wing(ctx, C, wopen, -ruf, true); ctx.restore();
    }
    const fl = 1 + 0.4 * K, flut = run * Math.sin(t * 17 + ph) * 0.12;
    ctx.fillStyle = C.plumeD; scallop(ctx, -54 - 6 * run, -102 - 7 * K - 3 * run, 17 * fl + 4 * run, 13 * fl - run, 7, 0.3, ruf + flut, -0.5 + 0.35 * run + 0.3 * K); ctx.fill();
    ctx.fillStyle = C.plume;  scallop(ctx, -49 - 6 * run, -110 - 9 * K - 2 * run, 15 * fl + 4 * run, 11 * fl - run, 6, 0.32, 0.5 - ruf - flut, -0.75 + 0.5 * run + 0.3 * K); ctx.fill();
    ctx.translate(0, CY); ctx.scale(1, breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.strokeStyle = alpha(C.coatL, 0.55); ctx.lineWidth = 1.5; ctx.lineCap = 'round';   // a few feather tips
    ctx.beginPath();
    for (const f of FEATHERS){ ctx.moveTo(f[0] + f[2], f[1]); ctx.arc(f[0], f[1], f[2], 0, Math.PI); }
    ctx.stroke();
    rim(ctx, body, TOP + 16, C.rim, 1.8);
    ctx.restore();

    oneLeg(false);                                        // near leg, in front

    // ── the wing over the body: half open at the run, fanned up for the squawk
    ctx.save(); bodyFrame();
    ctx.translate(SHOULDER[0], SHOULDER[1]);
    ctx.rotate(wrot);
    wing(ctx, C, wopen, ruf, false);
    ctx.restore();

    // ── neck (an S), the fuzz collar, head. The head bobs pigeon-style at the
    //    walk: it hangs back while the body walks on, then darts forward.
    ctx.save(); bodyFrame();
    const u = frac(2 * cyc + 0.2);
    const saw = u < 0.68 ? 1 - 2 * u / 0.68 : -1 + 2 * smooth((u - 0.68) / 0.32);
    const bob = (go - run) * 5.5 * saw, peek = Math.pow(Math.max(0, Math.sin(t * 0.37 + ph * 1.9)), 24);
    const NP = [[31, -113], [56 - 2 * run + bob * 0.2, -127 - 4 * K],
                [26 + 18 * run + bob * 0.7 + 2 * K, -146 + 5 * run - 9 * K],
                [41 + 13 * run + bob - 2 * K + peek * 3, -159 + 5 * run - 12 * K + Math.sin(t * 0.9 + ph) * 0.8]];
    taper(ctx, NP, 13, 8.4, lg(ctx, 0, -168, 0, -110, [[0, C.skinL], [0.5, C.skin], [1, C.skinD]]));
    ctx.fillStyle = C.plumeD; scallop(ctx, 30, -112, 12, 9, 7, 0.3, ruf, -0.6); ctx.fill();
    ctx.fillStyle = C.plume;  scallop(ctx, 31, -114, 10, 7, 6, 0.34, 0.4 - ruf, -0.6); ctx.fill();
    if (L.bowtie) bowtie(ctx, 36, -121, 7, 0.5);
    ctx.translate(NP[3][0] + 4, NP[3][1] - 7);
    ctx.rotate(-pitch + Math.sin(t * 0.6 + ph) * 0.04 + peek * 0.22 - 0.3 * K + run * 0.06);
    ctx.scale(HS, HS);
    drawHead(ctx, C, L, t, K, K * (0.84 + 0.16 * Math.sin(P * TAU * 5)));
    rings(ctx, 30, 2, P > 0.2 && P < 0.83 ? frac((P - 0.2) / 0.21) : 0, C.line, 0.6, 0.62);
    ctx.restore();
    ctx.restore();
  }

  window.OstrichRig = { draw, HEIGHT: 182, WIDTH: 88, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride, ACT_SECONDS: 2.2,
                        WALK_CPS: 0.8, RUN_CPS: 1.7 };
})();
