/* ── cats.js — the big cats, redrawn from scratch (v2, 2026-11) ─────────────
   LION, LIONESS, CUB and CHEETAH share one cat: a long soft torso with a cream
   belly, three-bone legs planted by IK (elbows back, knees forward, hocks
   back), round paws, a springy tail and a head in TRUE PROFILE — one amber
   eye under a brow, a blunt muzzle with a pink nose, a cream chin, one round
   ear in front and the far one peeking behind it. Each species is a parameter
   block (SP): its own torso, bones, head size, palette, gait and action.

     lion     a full mane framing the face and hanging over the chest.
              pose = ROAR — chest up, head thrown back, jaws wide.
     lioness  pose = YAWN — a long play-bow stretch, eyes shut, tongue curling.
     cub      big head, short legs, half the size. pose = POUNCE — a hop with a
              tiny squeaky roar.
     cheetah  slim, deep chest, tucked waist, long legs, spots, tear stripe,
              ringed tail. L.run = a real GALLOP (flight phases, rocking
              spine). pose = CROUCH — belly to the grass, rump wiggling.

   The open mouth is a real gap: only the throat behind the jaw hinge is dark.

   API — window.LionRig / LionessRig / CubRig / CheetahRig
     draw(ctx, L, t), HEIGHT, WIDTH (half-width), STRIDE, RUN_STRIDE, ACT_SECONDS
   Depends only on kit.js (window.SavKit). ES2015, file:// safe. */
(function(){
  const { TAU, psr, clamp01, lg, rg, alpha, palette, blob, bez, bezT, taper, step, leg, xf,
          eye, blink, brow, rim, scallop, rings, bowtie, ribbon } = window.SavKit;

  const COMMON = { eyeW: '#FFF8E8', pupil: '#1C120C', mouth: '#5A1F2A', tongue: '#EE8089', tooth: '#FFFDF4',
                   nose: '#7A4038', line: '#3A2414', iris: '#E09A22', earIn: '#DDA08C' };
  const COAT = ['coat', 'coatL', 'coatD', 'belly', 'far', 'mane', 'maneL', 'maneD'];
  const WALK = { stride: 60, duty: 0.66, lift: 7, off: [0, 0.25, 0.5, 0.75], bob: 1.1, over: 0, fsw: 0.95, hsw: 0.75 };

  const LIONESS = {
    k: 1, pal: Object.assign({ coat: '#DDB068', coatL: '#F2D08C', coatD: '#B8873F', belly: '#F9E9BF', far: '#A87C3A', tuft: '#6A4320' }, COMMON),
    body: [[38, -60], [33, -74], [14, -76], [-10, -72], [-32, -73], [-46, -64], [-47, -48], [-36, -40], [-10, -37], [14, -35], [32, -41]],
    belly: [-2, -34, 46, 15], top: -76, cy: -55,
    sh: [24, -50], hp: [-32, -52], frest: 27, hrest: -37, farDx: 5,
    fl: [13, 19.5, 14.5], hl: [19, 20, 16], fw: [21, 13, 9.2, 8.6], hw: [28, 14.5, 9, 8.6],
    ffold: 0.06, hfold: -0.28, paw: 1,
    neck: [[24, -62], [33, -69], [39, -77], [45, -83]], nw: [28, 21], head: [50, -86], hs: 1,
    tail: [-45, -63], tw: [7, 4], tl: 1, walk: WALK,
  };
  const LION = Object.assign({}, LIONESS, {
    k: 1.13, mane: true,
    pal: Object.assign({ coat: '#E2A64E', coatL: '#F6CB7A', coatD: '#B97A2E', belly: '#F9E4B6', far: '#A8702C', tuft: '#5A3214',
                         mane: '#93501F', maneL: '#BE7230', maneD: '#633412' }, COMMON),
    hs: 1.06, nw: [30, 22],
  });
  const CUB = {
    k: 0.56, cub: true, pal: Object.assign({ coat: '#E6BC78', coatL: '#F6D99C', coatD: '#C4944C', belly: '#FBEFCB', far: '#B18846', tuft: '#7A5028' }, COMMON),
    body: [[28, -46], [25, -58], [10, -61], [-8, -58], [-24, -58], [-34, -50], [-34, -38], [-26, -31], [-6, -28], [12, -28], [24, -33]],
    belly: [-2, -26, 33, 13], top: -61, cy: -44,
    sh: [18, -38], hp: [-23, -40], frest: 20, hrest: -27, farDx: 5,
    fl: [9.5, 13.5, 11.5], hl: [13.5, 13.5, 12.5], fw: [18, 12, 9.4, 9.5], hw: [22, 13.5, 9.8, 9.5],
    ffold: 0.06, hfold: -0.26, paw: 1.2,
    neck: [[18, -50], [24, -56], [28, -61], [32, -65]], nw: [23, 19], head: [38, -70], hs: 1.38,
    tail: [-33, -50], tw: [6, 4], tl: 0.72,
    walk: { stride: 44, duty: 0.62, lift: 7, off: [0, 0.25, 0.5, 0.75], bob: 1.6, over: 0, fsw: 1.0, hsw: 0.8 },
  };
  const CHEETAH = {
    k: 1, spots: true, pal: Object.assign({ coat: '#E6B860', coatL: '#F6D88C', coatD: '#C08C3A', belly: '#FCF2D6', far: '#AC7E36', tuft: '#FDF6E2', spot: '#2A1B0C' }, COMMON),
    body: [[36, -66], [31, -80], [12, -81], [-10, -77], [-30, -78], [-43, -72], [-45, -62], [-37, -56], [-14, -53], [10, -44], [29, -48]],
    belly: [2, -45, 44, 12], top: -81, cy: -62,
    sh: [23, -57], hp: [-31, -61], frest: 26, hrest: -36, farDx: 5,
    fl: [15.5, 22.5, 17.5], hl: [21, 23, 20], fw: [15, 8.6, 6.2, 6.4], hw: [21, 10, 6.6, 6.4],
    ffold: 0.06, hfold: -0.3, paw: 0.86,
    neck: [[24, -70], [32, -77], [38, -84], [43, -89]], nw: [22, 15], head: [47, -92], hs: 0.84,
    tail: [-43, -70], tw: [6.5, 4.6], tl: 1.25,
    walk: { stride: 66, duty: 0.64, lift: 8, off: [0, 0.25, 0.5, 0.75], bob: 1.1, over: 0, fsw: 0.95, hsw: 0.75 },
    run:  { stride: 190, duty: 0.27, lift: 15, off: [0, 0.52, 0.09, 0.43], bob: 0, over: 16, fsw: 1.5, hsw: 1.1, gallop: true },
  };
  // the cheetah's coat spots, in torso space (clipped to the torso)
  const SPOTS = [];
  for (let i = 0; i < 14; i++) for (let j = 0; j < 5; j++){
    const n = i * 5 + j;
    SPOTS.push([-46 + i * 6.2 + (j & 1) * 3.1 + (psr(n) - 0.5) * 3, -79 + j * 6 + (psr(n + 99) - 0.5) * 3, 1.05 + psr(n + 7) * 0.85]);
  }

  // ── the head, in head space: skull centre (0,0), muzzle toward +x. K = how
  //    far the action has the mouth open; shut = eyes squeezed (the yawn).
  const SKULL = [[-16, 3], [-15, -8], [-8, -15.5], [3, -17], [12, -13.5], [18, -8], [25, -5.5], [29.5, -1.5], [29, 4.5], [24, 7.6], [10, 8.6], [-6, 9]];
  const JAW = [[-6, 7], [8, 7.6], [20, 7], [24, 8.8], [20, 11.8], [8, 12.8], [-5, 11.4]];
  function drawHead(g, C, SP, L, t, K, jawMax, shut){
    const ph = L.ph || 0, jaw = jawMax * K, HX = -3, HY = 8;
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.83 + ph * 3.1)), 40) * 0.35;
    // far ear, behind everything
    g.fillStyle = C.far;
    g.beginPath(); g.ellipse(2.5, -18.5, 5, 6.6, -0.05 - flick * 0.6, 0, TAU); g.fill();
    if (SP.mane){                                         // the mane's back layers
      const sw = Math.sin(t * 1.1 + ph) * 0.05;
      g.fillStyle = C.maneD; scallop(g, -9, 21, 16, 19, 9, 0.24, sw, 0); g.fill();           // chest ruff
      g.fillStyle = C.maneD; scallop(g, -10, 1, 26, 29, 12, 0.2, -sw, 0); g.fill();
      g.fillStyle = C.mane;  scallop(g, -8, 0, 21, 24.5, 10, 0.2, sw + 0.3, 0); g.fill();
    }
    // the throat — the only dark part of an open mouth, back at the hinge
    if (K > 0.03){
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 7;
      const lx = HX + (fx - HX) * c + 1 * s, ly = HY + (fx - HX) * s - 1 * c + 1.5;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 4, HY - 1); g.lineTo(fx, 7.4);
      g.quadraticCurveTo(fx - 5 * K, (7.4 + ly) / 2, lx, ly); g.lineTo(HX - 4, HY + 3); g.closePath(); g.fill();
    }
    // lower jaw — cream chin on a hinge; tongue + lower fang ride on it
    g.save();
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    g.fillStyle = lg(g, 0, 8, 0, 13, [[0, C.belly], [1, C.coatL]]);
    blob(g, JAW, 5); g.fill();
    if (K > 0.08){
      g.fillStyle = C.tongue;
      g.beginPath(); g.ellipse(13, 7.4 - 0.6 * K, 8.5 + (shut ? 3 * K : 0), 1.6 + 1.9 * K, shut ? -0.16 * K : 0, 0, TAU); g.fill();
      g.fillStyle = C.tooth;
      g.beginPath(); g.moveTo(19.4, 7.8); g.lineTo(21, 3.6 - 1.4 * K); g.lineTo(22.6, 7.8); g.closePath(); g.fill();
    }
    g.restore();
    // skull + muzzle
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -17, 0, 9, [[0, C.coatL], [0.6, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = C.belly;                                // cream muzzle + lip
    g.beginPath(); g.ellipse(22, 4.2, 10, 6.4, -0.12, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(9, 3.4, 4.4, 2.8, 0, 0, TAU); g.fill();
    if (SP.spots){                                        // crown spots + the tear stripe
      g.fillStyle = C.spot;
      for (let i = 0; i < 9; i++){ g.beginPath(); g.arc(-12 + psr(i + 40) * 20, -15 + psr(i + 50) * 8, 0.9 + psr(i) * 0.5, 0, TAU); g.fill(); }
      g.strokeStyle = C.spot; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(12, -2.6); g.quadraticCurveTo(15, 3, 18.5, 7.2); g.stroke();
    }
    g.restore();
    rim(g, skull, -6, C.rim, 1.4);
    // nose, the lip line (a little smile), whisker dots + whiskers
    g.fillStyle = C.nose;
    g.beginPath(); g.ellipse(28.4, -0.9, 2.5, 2.2, 0.35, 0, TAU); g.fill();
    g.strokeStyle = alpha(C.line, 0.55); g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(28.2, 1.4); g.quadraticCurveTo(26.4, 5.2, 24.4, 7.2);
    if (K < 0.2){ g.quadraticCurveTo(17, 9.2, 10.5, 6.6); }
    g.stroke();
    g.fillStyle = alpha(C.line, 0.4);
    for (const [wx, wy] of [[21.5, 2.2], [19.4, 4.4], [22.8, 4.9]]){ g.beginPath(); g.arc(wx, wy, 0.55, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(21.5, 2.2); g.quadraticCurveTo(15, 3.5, 9, 8.5);
    g.moveTo(19.4, 4.4); g.quadraticCurveTo(14, 7, 10, 12);
    g.stroke();
    if (K > 0.08){                                        // the upper fang
      g.fillStyle = C.tooth;
      g.beginPath(); g.moveTo(21.4, 7.2); g.lineTo(23, 11.4 + 1.6 * K); g.lineTo(24.8, 7.2); g.closePath(); g.fill();
    }
    // ONE eye (true profile) under a brow that knits for the roar
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (shut ? 1 - 0.94 * K : 1 - 0.3 * K);
    eye(g, 9.4, -5.4, 4.3, 4.8, eyeH, Math.sin(t * 0.3 + ph) * 0.6, C);
    const knit = shut ? -1.2 * K : 2.4 * K;
    brow(g, C.line, 4.4, -11 - (shut ? 0 : K), 9.6, -14.4 - K, 14.6, -12 + knit, 1.6);
    if (SP.mane){                                         // mane over the cheek + a forelock
      const sw = Math.sin(t * 1.1 + ph) * 0.05;
      g.fillStyle = C.mane;  scallop(g, -17, 2, 12.5, 21, 8, 0.22, sw, 0); g.fill();
      g.fillStyle = C.maneL; scallop(g, -13, -9, 12, 11, 7, 0.24, -sw, 0.3); g.fill();
      g.fillStyle = C.maneL; scallop(g, -1, -17.5, 9, 5, 6, 0.3, sw, -0.2); g.fill();
    }
    // near ear on top (it flicks)
    g.save(); g.translate(-6.5, -13); g.rotate(-0.28 - flick);
    g.fillStyle = C.coat;  g.beginPath(); g.ellipse(0, -5, 6, 7.6, 0, 0, TAU); g.fill();
    g.fillStyle = C.earIn; g.beginPath(); g.ellipse(0.6, -4.4, 3.4, 5, 0, 0, TAU); g.fill();
    g.restore();
    if (L.ribbon) ribbon(g, -1, -19.5, 6.2, -0.2);
  }

  function paw(g, C, SP, x, y, rot, far){
    const k = SP.paw;
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = far ? C.far : C.coat;
    g.beginPath(); g.ellipse(2.6 * k, -0.4 * k, 7 * k, 4.2 * k, 0, 0, TAU); g.fill();
    if (!far){
      g.strokeStyle = alpha(C.line, 0.3); g.lineWidth = 0.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(5.2 * k, 0.6 * k); g.lineTo(5.6 * k, 3 * k); g.moveTo(7.6 * k, 0.2 * k); g.lineTo(8.2 * k, 2.4 * k); g.stroke();
    }
    g.restore();
  }

  function drawCat(ctx, L, t, SP, act){
    const C = palette(SP.pal, COAT, L.tint, L.lit);
    const ph = L.ph || 0, go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = L.run && SP.run ? SP.run : SP.walk, cyc = (L.wt || 0) / TAU;
    const K = L.pose ? Math.sin(clamp01(L.pose) * Math.PI) : 0;
    // what the action does to the body
    let drop = 0, pitch = 0, headRot = Math.sin(t * 0.6 + ph) * 0.03, jawMax = 0, shut = false, hop = 0, wig = 0;
    if (act === 'roar'){ pitch = -0.05 * K; headRot -= 0.42 * K; jawMax = 0.7; }
    else if (act === 'yawn'){ pitch = 0.13 * K; drop = 3 * K; headRot -= 0.5 * K; jawMax = 0.78; shut = true; }
    else if (act === 'pounce'){ hop = 16 * K; pitch = -0.22 * Math.sin(clamp01(L.pose) * TAU); headRot -= 0.3 * K; jawMax = 0.55; }
    else if (act === 'crouch'){ drop = 15 * K; pitch = 0.06 * K; headRot += 0.2 * K; wig = K * Math.sin(t * 22) * 1.6; }
    if (G.gallop){
      drop += go * -4.5 * Math.cos(2 * TAU * (cyc - 0.36));
      pitch += go * 0.085 * Math.sin(TAU * (cyc - 0.45));
      headRot -= go * 0.08 * Math.sin(TAU * (cyc - 0.45));
    } else drop += go * G.bob * Math.sin(2 * TAU * cyc + 0.6);
    drop -= hop;
    const breathe = 1 + Math.sin(t * 1.3 + ph) * 0.012;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1) * SP.k, L.s * SP.k);
    const coatG = lg(ctx, 0, SP.top, 0, 0, [[0, C.coatL], [0.42, C.coat], [1, C.coatD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = (st.x * G.stride + (st.sw ? -G.over * Math.sin(TAU * st.sw) : 0)) * go;
      const lift = st.lift * G.lift * go * (hind ? 0.85 : 1) + hop;
      const swing = st.sw ? Math.sin(Math.PI * st.sw) * go : 0;
      const root = hind ? SP.hp : SP.sh, len = hind ? SP.hl : SP.fl, ws = hind ? SP.hw : SP.fw;
      const r = xf(root[0] + (far ? SP.farDx : 0), root[1], 0, SP.cy, pitch, (hind ? wig + reach * 0.15 : reach * 0.3), drop);
      const fold = (hind ? SP.hfold : SP.ffold) - reach / 62 + swing * (hind ? G.hsw : G.fsw);
      const fx = (hind ? SP.hrest : SP.frest) + (far ? SP.farDx : 0) + reach;
      const ch = leg(ctx, r[0], r[1], fx, -lift - ws[3] / 2, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      if (SP.spots && !far){
        ctx.fillStyle = C.spot;
        for (let j = 0; j < 9; j++){
          const b = j < 5 ? 0 : 1, u = 0.15 + psr(j + i * 9) * 0.75, w = (psr(j * 3 + i) - 0.5) * ws[b] * 0.62;
          const ax = ch[b][0], ay = ch[b][1], dx = ch[b + 1][0] - ax, dy = ch[b + 1][1] - ay, l = Math.hypot(dx, dy) || 1;
          ctx.beginPath(); ctx.arc(ax + dx * u + dy / l * w, ay + dy * u - dx / l * w, 0.9 + psr(j + i) * 0.7, 0, TAU); ctx.fill();
        }
      }
      paw(ctx, C, SP, ch[3][0], ch[3][1] + ws[3] / 2 - 3.6 * SP.paw, lift > 0.5 ? fold * 0.8 : 0, far);
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, SP.cy); ctx.rotate(pitch); ctx.translate(0, -SP.cy); };

    oneLeg(2); oneLeg(3);                                 // far legs, behind

    // ── tail + torso, in the body's frame
    ctx.save(); bodyFrame();
    const tb = SP.tail, tl = SP.tl, sw = Math.sin(t * 1.4 + ph) * 3 + go * Math.sin(TAU * cyc * 2) * 2 + wig * 2;
    const up = G.gallop ? go * 26 : 0;                    // a sprinting cat flies its tail
    const TP = [[tb[0] + 3, tb[1] + 2], [tb[0] - 16 * tl, tb[1] + 4 - up * 0.5 + sw * 0.3 + wig],
                [tb[0] - 30 * tl, tb[1] + 26 * tl - up + sw], [tb[0] - 44 * tl, tb[1] + 20 * tl - up * 1.3 - sw * 1.4 - 10 * K * (act === 'crouch' ? 1 : 0)]];
    taper(ctx, TP, SP.tw[0], SP.tw[1], C.coat);
    const tip = bez(TP, 1);
    if (SP.spots){
      ctx.strokeStyle = C.spot; ctx.lineCap = 'butt';
      for (const u of [0.5, 0.64, 0.77, 0.89]){
        const p = bez(TP, u), d = bezT(TP, u), l = Math.hypot(d[0], d[1]) || 1, w = (SP.tw[0] + (SP.tw[1] - SP.tw[0]) * u) / 2;
        ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(p[0] + d[1] / l * w, p[1] - d[0] / l * w); ctx.lineTo(p[0] - d[1] / l * w, p[1] + d[0] / l * w); ctx.stroke();
      }
      ctx.fillStyle = C.tuft; ctx.beginPath(); ctx.arc(tip[0], tip[1], SP.tw[1] / 2 + 0.4, 0, TAU); ctx.fill();
    } else {
      const d = bezT(TP, 1);
      ctx.fillStyle = C.tuft; ctx.beginPath(); ctx.ellipse(tip[0], tip[1], 7 * (SP.cub ? 0.9 : 1), 4.2, Math.atan2(d[1], d[0]), 0, TAU); ctx.fill();
    }
    ctx.translate(0, SP.cy); ctx.scale(1, breathe); ctx.translate(0, -SP.cy);
    const body = () => blob(ctx, SP.body, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    const B = SP.belly;
    ctx.fillStyle = lg(ctx, 0, B[1] - B[3], 0, B[1] + 3, [[0, alpha(C.belly, 0)], [0.55, alpha(C.belly, 0.75)], [1, C.belly]]);
    ctx.fillRect(B[0] - B[2], B[1] - B[3], B[2] * 2, B[3] + 14);
    if (SP.spots){ ctx.fillStyle = C.spot; for (const s of SPOTS){ ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, TAU); ctx.fill(); } }
    ctx.restore();
    rim(ctx, body, SP.top + 14, C.rim, 1.8);
    ctx.restore();

    oneLeg(0); oneLeg(1);                                 // near legs, in front

    // ── neck, bow tie, head
    ctx.save(); bodyFrame();
    taper(ctx, SP.neck, SP.nw[0], SP.nw[1], coatG);
    ctx.translate(SP.head[0], SP.head[1] + (act === 'crouch' ? 5 * K : 0));
    ctx.rotate(headRot); ctx.scale(SP.hs, SP.hs);
    if (L.bowtie && !SP.mane) bowtie(ctx, -5, 16, 7, 0.5);
    drawHead(ctx, C, SP, L, t, K, jawMax, shut);
    if (L.bowtie && SP.mane) bowtie(ctx, 6, 19, 7.5, 0.25);
    ctx.restore();
    if (act === 'roar' || act === 'pounce'){
      const hx = SP.head[0] + 34 * SP.hs, hy = SP.head[1] + drop - 8;
      rings(ctx, hx, hy, K > 0.35 ? (K - 0.35) / 0.65 : 0, C.line, 0.6, act === 'roar' ? 1 : 0.6);
    }
    ctx.restore();
  }

  const mk = (SP, act, H, Wd, secs) => ({
    draw: (ctx, L, t) => drawCat(ctx, L, t, SP, act), HEIGHT: H, WIDTH: Wd, ACT_SECONDS: secs,
    STRIDE: SP.walk.stride * SP.k, RUN_STRIDE: (SP.run || SP.walk).stride * SP.k,
  });
  window.LionRig    = mk(LION, 'roar', 132, 100, 2.2);
  window.LionessRig = mk(LIONESS, 'yawn', 112, 88, 2.4);
  window.CubRig     = mk(CUB, 'pounce', 60, 48, 1.1);
  window.CheetahRig = mk(CHEETAH, 'crouch', 112, 98, 2.0);
})();
