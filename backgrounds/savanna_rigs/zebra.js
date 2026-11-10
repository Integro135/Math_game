/* ── zebra.js — the ZEBRA, redrawn from scratch (v2, 2026-11) ───────────────
   A round little horse in true profile: a barrel body on long slim legs with
   dark hooves, an arched neck with an upright striped brush mane, a long head
   carried nose-down — ONE dark eye with lashes, a charcoal muzzle, leaf ears
   (the near one in front, the far one peeking behind), a thin tail with a
   dark tassel. Stripes everywhere: bars down the barrel that sweep back over
   the haunch, rings round the neck and down every leg, fine lines on the face.

   Legs: three bones placed by IK (kit.js) — planted feet, hocks that fold.
   L.run = a TROT (diagonal pairs, a springy bob). pose 0..1 = BRAY: the neck
   stretches up, the head tips back, the jaw drops (a real gap — big square
   teeth, pink tongue), the eye squeezes shut, the ears lie back, the tail
   flies, sound rings burst from the mouth.

   API — window.ZebraRig { draw(ctx, L, t), HEIGHT, WIDTH, STRIDE, RUN_STRIDE, ACT_SECONDS }
   Depends only on kit.js (window.SavKit). */
(function(){
  const { TAU, clamp01, lg, alpha, palette, blob, bez, bezT, taper, limbPath, step, leg, xf,
          eye, blink, brow, rim, rings, bowtie, ribbon } = window.SavKit;

  const PAL = { coat: '#F6F1E6', coatL: '#FFFFFF', coatD: '#D9D0C0', belly: '#FFFBF2', far: '#BDB4A4',
                stripe: '#2A2320', stripeF: '#4E453E', muzzle: '#3B312C', hoof: '#2B2522',
                eyeW: '#FFF8EC', iris: '#6B4526', pupil: '#17100C', line: '#2A2320', earIn: '#E8B9B2',
                mouth: '#5A1F2A', tongue: '#EE8089', tooth: '#FFFDF4' };
  const COAT = ['coat', 'coatD', 'far'];
  const WALK = { stride: 82, duty: 0.62, lift: 9, off: [0, 0.25, 0.5, 0.75], bob: 1.2, fsw: 1.15, hsw: 0.7 };
  const TROT = { stride: 132, duty: 0.42, lift: 15, off: [0, 0.5, 0.5, 0], bob: 2.6, fsw: 1.5, hsw: 0.95 };

  const BODY = [[40, -66], [36, -84], [18, -90], [-8, -86], [-30, -89], [-46, -81], [-50, -63], [-42, -51], [-14, -46], [14, -46], [34, -52]];
  const TOP = -90, CY = -68, SH = [26, -60], HP = [-34, -64], FREST = 28, HREST = -39, FAR = 6;
  const FL = [15, 25, 18.5], HL = [20, 24, 23], FW = [19, 10.5, 7.2, 6.8], HW = [26, 12, 7.4, 6.8];
  // barrel bars: [x top, x bottom, bulge]; haunch sweeps: quadratic [x0,y0, cx,cy, x1,y1]
  const BARS = [[30, 33, 2], [21, 23, 2], [12, 13, 1], [3, 3, 0], [-6, -7, -1], [-15, -17, -2]];
  const SWEEPS = [[-22, -92, -27, -70, -22, -48], [-30, -92, -42, -76, -34, -52], [-38, -90, -52, -76, -47, -58],
                  [-46, -84, -56, -74, -54, -64]];
  const SKULL = [[-13, 3], [-13, -7], [-6, -12.5], [6, -12], [18, -8.5], [28, -6], [36, -4], [39, 1.5], [36, 7], [26, 8], [10, 9.5], [-4, 10]];
  const JAW = [[-4, 8], [10, 8.6], [26, 7.4], [35, 6.6], [36.5, 9], [30, 11.6], [12, 13.4], [-3, 12]];

  function ear(g, C, x, y, rot, far){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = far ? C.far : C.coat;
    g.beginPath(); g.moveTo(-4.4, 1); g.quadraticCurveTo(-6.4, -10, -0.6, -17); g.quadraticCurveTo(5.4, -9, 4, 1); g.closePath(); g.fill();
    if (!far){
      g.fillStyle = C.earIn;
      g.beginPath(); g.moveTo(-1.8, -1); g.quadraticCurveTo(-3, -8, -0.4, -12.4); g.quadraticCurveTo(2.6, -7, 2, -1); g.closePath(); g.fill();
    }
    g.fillStyle = C.stripe;                               // dark tip
    g.beginPath(); g.moveTo(-3.6, -12.4); g.quadraticCurveTo(-2.6, -15.4, -0.6, -17); g.quadraticCurveTo(1.6, -15, 2.6, -12.6); g.closePath(); g.fill();
    g.restore();
  }

  // the head, in head space: skull centre (0,0), muzzle toward +x. K = bray.
  function drawHead(g, C, L, t, K){
    const ph = L.ph || 0, jaw = 0.52 * K, HX = 0, HY = 9;
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.9 + ph * 2.7)), 40) * 0.4;
    ear(g, C, -1.5, -11, 0.1 - flick * 0.5 - 0.7 * K, true);
    if (K > 0.03){                                        // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 12;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 8.6);
      g.lineTo(HX + (fx - HX) * c, HY + (fx - HX) * s + 0.6); g.lineTo(HX - 3, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // lower jaw on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);
    const jawP = () => blob(g, JAW, 5);
    g.fillStyle = C.coat; jawP(); g.fill();
    g.save(); jawP(); g.clip();
    g.fillStyle = C.muzzle; g.beginPath(); g.ellipse(36, 9, 11.5, 9, 0, 0, TAU); g.fill();
    g.restore();
    if (K > 0.08){
      g.fillStyle = C.tongue; g.beginPath(); g.ellipse(22, 7.6, 9, 1.4 + 1.6 * K, 0, 0, TAU); g.fill();
      g.fillStyle = C.tooth; g.beginPath(); g.rect(28.4, 7.2 - 2.6 * K, 2.7, 2.8 * K + 0.6); g.rect(31.6, 7 - 2.6 * K, 2.7, 2.8 * K + 0.6); g.fill();
    }
    g.restore();
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -13, 0, 10, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.strokeStyle = C.stripe; g.lineCap = 'round'; g.lineWidth = 1.7;      // face stripes
    g.beginPath();
    for (const x of [-10, -5.6, -1.2]){ g.moveTo(x, -13); g.quadraticCurveTo(x - 2.4, 0, x + 1, 11); }
    for (const [y0, y1] of [[-9.4, -6.6], [-6.2, -3.6], [-2.6, -0.4], [1.4, 2.6], [5.2, 5.6]]){ g.moveTo(11, y0); g.quadraticCurveTo(18, (y0 + y1) / 2 - 0.6, 25.5, y1); }
    g.stroke();
    g.fillStyle = C.muzzle;                               // the charcoal muzzle
    g.beginPath(); g.ellipse(37.5, 2, 11.5, 11, 0, 0, TAU); g.fill();
    g.restore();
    rim(g, skull, -5, alpha(C.coatL, 0.6), 1.3);
    g.fillStyle = 'rgba(0,0,0,.45)';                      // nostril, lip
    g.beginPath(); g.ellipse(36, -0.6, 1.9, 1.2, -0.5, 0, TAU); g.fill();
    if (K < 0.2){ g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(38, 5.4); g.quadraticCurveTo(31, 8, 24, 7.4); g.stroke(); }
    if (K > 0.08){
      g.fillStyle = C.tooth; g.beginPath(); g.rect(28.6, 7.4, 2.7, 2.2 + 1.4 * K); g.rect(31.8, 7.2, 2.7, 2.2 + 1.4 * K); g.fill();
    }
    // ONE eye — dark and soft, with lashes; it squeezes shut for the bray
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.9 * K);
    eye(g, 5.2, -3.2, 3.9, 4.4, eyeH, Math.sin(t * 0.3 + ph) * 0.5, C, { iris: 0.86 });
    g.strokeStyle = C.line; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(1.6, -5.6); g.lineTo(-0.4, -7.6); g.moveTo(2.6, -6.8); g.lineTo(1.4, -9.2); g.stroke();
    ear(g, C, -7, -10.4, -0.32 - flick - 0.7 * K, false);
    g.fillStyle = C.stripe;                               // forelock
    g.beginPath(); g.ellipse(-2.4, -13.4, 5.6, 3, -0.3, 0, TAU); g.fill();
    if (L.ribbon) ribbon(g, -5, -17, 5.4, -0.2);
  }

  function hoof(g, C, x, y, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.hoof;
    g.beginPath(); g.moveTo(-3.3, -1.6); g.lineTo(3.5, -1.6); g.quadraticCurveTo(5.6, 1.4, 5, 3.4); g.lineTo(-4.2, 3.4); g.quadraticCurveTo(-4.4, 0.6, -3.3, -1.6); g.fill();
    g.restore();
  }

  function draw(ctx, L, t){
    const C = palette(PAL, COAT, L.tint, L.lit);
    const ph = L.ph || 0, go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const G = L.run ? TROT : WALK, cyc = (L.wt || 0) / TAU;
    const K = L.pose ? Math.sin(clamp01(L.pose) * Math.PI) : 0;
    const drop = go * G.bob * Math.sin(2 * TAU * cyc + 0.6), pitch = -0.03 * K;
    const breathe = 1 + Math.sin(t * 1.2 + ph) * 0.01;
    const nod = go * Math.sin(2 * TAU * cyc + 1.2) * 0.035;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.coatL], [0.4, C.coat], [1, C.coatD]]);

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1;
      const st = step(cyc + G.off[i], G.duty);
      const reach = st.x * G.stride * go, lift = st.lift * G.lift * go * (hind ? 0.8 : 1);
      const swing = st.sw ? Math.sin(Math.PI * st.sw) * go : 0;
      const root = hind ? HP : SH, len = hind ? HL : FL, ws = hind ? HW : FW;
      const r = xf(root[0] + (far ? FAR : 0), root[1], 0, CY, pitch, reach * (hind ? 0.15 : 0.3), drop);
      const fold = (hind ? -0.22 : 0.03) - reach / 78 + swing * (hind ? G.hsw : G.fsw);
      const fx = (hind ? HREST : FREST) + (far ? FAR : 0) + reach;
      const ch = leg(ctx, r[0], r[1], fx, -lift - ws[3] / 2, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      // rings: a clip to the limb, then bars across each bone
      ctx.save(); limbPath(ctx, ch, ws); ctx.clip();
      ctx.strokeStyle = far ? C.stripeF : C.stripe; ctx.lineCap = 'butt'; ctx.lineWidth = 2.7;
      ctx.beginPath();
      for (let b = 0; b < 3; b++){
        const ax = ch[b][0], ay = ch[b][1], dx = ch[b + 1][0] - ax, dy = ch[b + 1][1] - ay, l = Math.hypot(dx, dy) || 1;
        const n = b === 0 ? 3 : 4, w = ws[b] * 0.7;
        for (let j = 0; j < n; j++){
          const u = (j + (b === 0 ? 0.9 : 0.5)) / n, px = ax + dx * u, py = ay + dy * u, sk = b === 0 ? 0.35 : 0;
          ctx.moveTo(px + dy / l * w - dx / l * w * sk, py - dx / l * w - dy / l * w * sk);
          ctx.lineTo(px - dy / l * w + dx / l * w * sk, py + dx / l * w + dy / l * w * sk);
        }
      }
      ctx.stroke(); ctx.restore();
      hoof(ctx, C, ch[3][0], ch[3][1], lift > 0.5 ? fold * 0.9 : 0);
    }
    const bodyFrame = () => { ctx.translate(0, drop); ctx.translate(0, CY); ctx.rotate(pitch); ctx.translate(0, -CY); };

    oneLeg(2); oneLeg(3);

    // ── tail (a thin switch + dark tassel), then the barrel
    ctx.save(); bodyFrame();
    const sw = Math.sin(t * 1.7 + ph) * 4 + go * Math.sin(TAU * cyc * 2) * 3, fly = 26 * K;
    const TP = [[-47, -78], [-58, -76 - fly * 0.4], [-63, -60 + sw * 0.4 - fly], [-60 + sw - fly * 0.6, -42 - fly * 1.2]];
    taper(ctx, TP, 5.4, 3.2, C.coat);
    const tp = bez(TP, 1), td = bezT(TP, 1), ta = Math.atan2(td[1], td[0]);
    ctx.fillStyle = C.stripe;
    ctx.beginPath(); ctx.ellipse(tp[0] + Math.cos(ta) * 7, tp[1] + Math.sin(ta) * 7, 10, 4.2, ta, 0, TAU); ctx.fill();
    ctx.translate(0, CY); ctx.scale(1, breathe); ctx.translate(0, -CY);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.strokeStyle = C.stripe; ctx.lineCap = 'round'; ctx.lineWidth = 4.4;
    ctx.beginPath();
    for (const [xt, xb, bl] of BARS){ ctx.moveTo(xt, -94); ctx.quadraticCurveTo((xt + xb) / 2 + bl * 2, -68, xb, -44); }
    for (const q of SWEEPS){ ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]); }
    ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -55, 0, -46, [[0, alpha(C.belly, 0)], [1, alpha(C.belly, 0.95)]]);
    ctx.fillRect(-40, -55, 76, 13);                       // the stripes fade out under the belly
    ctx.restore();
    rim(ctx, body, TOP + 14, alpha(C.coatL, 0.55), 1.8);
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── neck (ringed), brush mane, head
    ctx.save(); bodyFrame();
    const st = 9 * K;                                     // the bray stretch
    const NP = [[25, -76], [35, -89 - st * 0.3], [43, -100 - st * 0.7], [49 + st * 0.3, -109 - st]];
    taper(ctx, NP, 31, 18, coatG);
    ctx.save(); taper(ctx, NP, 31, 18, null, { path: true }); ctx.clip();
    ctx.strokeStyle = C.stripe; ctx.lineCap = 'butt'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (const u of [0.08, 0.27, 0.46, 0.65, 0.84]){
      const p = bez(NP, u), d = bezT(NP, u), l = Math.hypot(d[0], d[1]) || 1;
      ctx.moveTo(p[0] + d[1] / l * 20, p[1] - d[0] / l * 20); ctx.lineTo(p[0] - d[1] / l * 20, p[1] + d[0] / l * 20);
    }
    ctx.stroke(); ctx.restore();
    for (let i = 0; i < 9; i++){                          // the upright brush mane, striped
      const u = 0.04 + i * 0.115, p = bez(NP, u), d = bezT(NP, u), l = Math.hypot(d[0], d[1]) || 1;
      const w = (31 + (18 - 31) * u) / 2, nx = d[1] / l, ny = -d[0] / l, h = 5.6 - Math.abs(u - 0.5) * 3;
      ctx.fillStyle = i & 1 ? C.coat : C.stripe;
      ctx.beginPath(); ctx.ellipse(p[0] + nx * (w - 1.5), p[1] + ny * (w - 1.5), 4.3, h, Math.atan2(d[1], d[0]) - 0.22, 0, TAU); ctx.fill();
    }
    if (L.bowtie) bowtie(ctx, 41, -86, 7, 0.9);
    ctx.translate(55 + st * 0.3, -113 - st);
    ctx.rotate(0.62 + nod + Math.sin(t * 0.6 + ph) * 0.03 - 0.95 * K);
    drawHead(ctx, C, L, t, K);
    rings(ctx, 46, 6, K > 0.35 ? (K - 0.35) / 0.65 : 0, C.line, 0.6);
    ctx.restore();
    ctx.restore();
  }

  window.ZebraRig = { draw, HEIGHT: 136, WIDTH: 88, STRIDE: WALK.stride, RUN_STRIDE: TROT.stride, ACT_SECONDS: 2.0 };
})();
