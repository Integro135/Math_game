/* ── critters.js — the small folk of the UNICORN VALLEY (2026-11) ───────────
   Two rigs in the savanna rigs' house style (soft rounded shapes, NO outlines,
   gentle gradients, a lighter belly, a rim light on the top edge, TRUE PROFILE
   with exactly ONE big glossy eye, a soft blush). Depends only on
   ../savanna_rigs/kit.js (window.SavKit), which must be loaded first.

   Unit space: feet / waterline on y = 0, facing +x. The caller anchors with
   L.x / L.y, scales with L.s, mirrors with L.dir; L.lit = [r, g, b] is the
   hour's light; L.ph a per-individual phase; t = seconds.

   window.BunnyRig = { draw(ctx, L, t), HEIGHT, WIDTH, STAND_HEIGHT, HOP, HOP_RISE,
                       HOP_SECONDS, ACT_SECONDS, COATS, hopX(k) }
     L.coat    one of COATS ('snow', 'cream', 'grey', 'cocoa', 'rose')
     L.hop     0..1 progress of ONE hop (undefined / 0 = sitting). The rig draws
               the hop in place; the caller moves the anchor forward by
                   x = x0 + dir * BunnyRig.hopX(hop) * BunnyRig.HOP * L.s
               — with exactly that easing the feet stay planted on the ground
               at take-off and at landing.
     L.pose    0..1 the signature: stands up tall, looks around, then a binky
     L.nibble  0..1 munching a little flower, cheeks going

   window.SwanRig = { draw(ctx, L, t), HEIGHT, WIDTH, POSE_HEIGHT, POSE_WIDTH, ACT_SECONDS,
                      CYGNET_HEIGHT, CYGNET_WIDTH }      (WIDTHs are half-widths)
     L.moving  paddling (the neck sways, the body rocks a little)
     L.pose    0..1 rears up and beats both wings twice, droplets flying
     L.cygnet  true = a fluffy grey baby */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, alpha, palette, blob, bez, bezT, taper, leg,
          eye, blink, rim, scallop, heart, psr } = window.SavKit;
  const PI = Math.PI;
  const ramp = (v, a, b) => smooth(clamp01((v - a) / (b - a)));
  const bump = (v, a, b, c) => v < b ? ramp(v, a, b) : 1 - ramp(v, b, c);

  // a leaf-shaped blade along a cubic Bezier (ears, feathers): w0 wide at the
  // root, swelling to wm, a soft round tip. Fills with `fill`.
  function leaf(g, P, w0, wm, fill){
    const n = 14;
    g.beginPath();
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= n; i++){
      const u = Math.sin((pass ? 1 - i / n : i / n) * PI / 2), p = bez(P, u), d = bezT(P, u), l = Math.hypot(d[0], d[1]) || 1;
      const w = (w0 * (1 - u) * (1 - u) + wm * Math.pow(Math.sin(PI * Math.pow(u, 0.8)), 0.6)) / 2 * (pass ? -1 : 1);
      const x = p[0] + d[1] / l * w, y = p[1] - d[0] / l * w;
      if (!pass && !i) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fillStyle = fill; g.fill();
  }

  /* ════════════════════════════ THE BUNNY ════════════════════════════════ */
  const FACE = { eyeW: '#FFFDF8', iris: '#6B4226', pupil: '#1C1210', line: '#4A3434', earIn: '#FFB5C5', earInD: '#EE94AB',
                 nose: '#F3849E', heart: '#FF7FA8', stem: '#6FB24E', petal: '#FFD1E3', petalC: '#FFD45E' };
  const mkCoat = o => Object.assign({}, FACE, o);
  const BPAL = {
    snow:  mkCoat({ coatL: '#FFFFFF', coat: '#FCFAF7', coatD: '#DAD5EA', far: '#C9C3DC', belly: '#E9E5F3', fluff: '#FFFFFF', tail: '#FFFFFF', whisk: '#B9B2C4' }),
    cream: mkCoat({ coatL: '#FFF0D2', coat: '#F8DBAC', coatD: '#E4BA86', far: '#D3A777', belly: '#FFF7E8', fluff: '#FFFAF0', tail: '#FFFDF6', whisk: '#FFFFFF' }),
    grey:  mkCoat({ coatL: '#CDD0DA', coat: '#AEB2C0', coatD: '#8C91A3', far: '#7C8194', belly: '#F0EFF3', fluff: '#F6F5F8', tail: '#FFFFFF', whisk: '#FFFFFF', iris: '#4A4A66' }),
    cocoa: mkCoat({ coatL: '#BE8F6C', coat: '#9F7052', coatD: '#7C543C', far: '#6A4532', belly: '#F0DCC6', fluff: '#F5E4D0', tail: '#FFF6EA', whisk: '#FFF3E4', earIn: '#F2A9AE', iris: '#4E2E1A' }),
    rose:  mkCoat({ coatL: '#FFDFE8', coat: '#FBC6D5', coatD: '#E9A3B9', far: '#DC92AB', belly: '#FFF4F6', fluff: '#FFF8FA', tail: '#FFFFFF', whisk: '#FFFFFF', earIn: '#FF9DB8', iris: '#7A3E5E' }),
  };
  const COATS = Object.keys(BPAL);
  const BCOAT = ['coatL', 'coat', 'coatD', 'far'];
  const HOP = 70, RISE = 22, AIR0 = 0.16, AIR1 = 0.84;
  // the anchor's travel over one hop, 0..1: still while it crouches, a smooth
  // glide through the air, still again while it gathers itself
  const hopX = k => smooth(clamp01((k - 0.1) / 0.8));

  const BODY = [[-20, 3], [-17, -10], [-6, -17.5], [6, -15.5], [14, -8], [17, 2], [12, 11], [0, 14.5], [-13, 13.5]];
  const SKULL = [[-13, 0], [-11, -8.5], [-3, -13], [6, -11.5], [12, -5], [14.5, 1.5], [12, 7.5], [5, 11.5], [-4, 11.5], [-11, 7]];
  const HLEN = [13, 13, 16], HW = [16, 11, 6.5, 5.6];       // hind leg: thigh, shin, the long foot
  const FLEN = [9, 9, 3], FW = [8.4, 5.6, 4.4, 4.4];            // front leg
  const EAR = [[0, 0], [0, 0], [0, 0], [0, 0]];

  // one ear, in head space: root (x, y), pointing up, tipped by `a` (− = back).
  // bend curls the tip; inner = the pink inside shows
  function ear(g, x, y, a, bend, len, col, inner){
    g.save(); g.translate(x, y); g.rotate(a);
    EAR[1][0] = -1.5;        EAR[1][1] = -len * 0.36;
    EAR[2][0] = bend * 0.5;  EAR[2][1] = -len * 0.7;
    EAR[3][0] = bend * 2.2;  EAR[3][1] = -len;
    leaf(g, EAR, 5.5, 10.5, col);
    if (inner){
      EAR[0][1] = -4; EAR[3][0] = bend * 1.9; EAR[3][1] = -len * 0.9;
      leaf(g, EAR, 2.5, 5.6, inner);
      EAR[0][1] = 0;
    }
    g.restore();
  }

  // the head, in head space: centre (0, 0), nose toward +x
  function bunnyHead(g, C, t, ph, earA, earB, bend, gaze, N, wide){
    const tw = Math.sin(t * 9 + ph * 3) * (0.6 + 0.4 * Math.sin(t * 0.7 + ph)), chew = N * Math.sin(t * 11 + ph);
    ear(g, -0.5, -10, earB, bend, 26, C.far, C.earInD);                      // the far ear, peeking out behind
    const skull = () => blob(g, SKULL, 5.5);
    g.fillStyle = lg(g, 0, -13, 0, 12, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    rim(g, skull, -6, C.rim, 1.1);
    g.fillStyle = C.fluff;                                                   // the soft muzzle (it works when munching)
    g.beginPath(); g.ellipse(9.2, 6.3 + chew * 0.6, 5.2, 4.2 + chew * 0.7, -0.1, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(0.6, 6.2, 3.9, 2.4, 0, 0, TAU); g.fill();
    g.strokeStyle = alpha(C.whisk, 0.85); g.lineWidth = 0.55; g.lineCap = 'round';   // whiskers
    const wv = tw * 0.5;
    g.beginPath();
    g.moveTo(10.2, 4.6); g.quadraticCurveTo(15, 2.6, 21.5, 2.4 + wv);
    g.moveTo(10.2, 5.6); g.quadraticCurveTo(15.5, 5.6, 21.8, 6.6 + wv);
    g.moveTo(9.8, 6.6);  g.quadraticCurveTo(14.5, 8.6, 19.6, 10.8 + wv);
    g.stroke();
    if (N > 0.02){                                                           // a little flower to munch
      const fx = 20 - 2 * (1 - N) + chew * 0.5, fy = 8.4 + chew * 0.8;
      g.strokeStyle = C.stem; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(11.6, 6.4 + chew * 0.5); g.quadraticCurveTo(15.5, 8.6, fx, fy); g.stroke();
      g.fillStyle = C.petal;
      g.beginPath();
      for (let i = 0; i < 5; i++){ const a = i / 5 * TAU + chew * 0.2; g.moveTo(fx + Math.cos(a) * 2.2 + 2, fy + Math.sin(a) * 2.2); g.arc(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 2, 0, TAU); }
      g.fill();
      g.fillStyle = C.petalC; g.beginPath(); g.arc(fx, fy, 1.5, 0, TAU); g.fill();
    }
    g.strokeStyle = alpha(C.line, 0.6); g.lineWidth = 0.8;                   // the smile under the nose
    g.beginPath(); g.moveTo(13.5, 3.4 + chew * 0.3); g.quadraticCurveTo(12.9, 6.3 + chew * 0.6, 10.2, 6.5 + chew * 0.6); g.stroke();
    g.fillStyle = C.nose;                                                    // the nose never keeps still
    g.beginPath(); g.ellipse(14.2, 1.7 + tw * 0.45, 1.9, 1.5 + tw * 0.15, 0.2, 0, TAU); g.fill();
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 + 0.07 * wide);
    eye(g, 3.8, -2.6, 4.4, 5.2, eyeH, gaze, C, { iris: 0.84, lid: 1.1 });
    g.strokeStyle = C.line; g.lineWidth = 0.8;                               // two lashes
    g.beginPath(); g.moveTo(-0.1, -4.5); g.lineTo(-2.5, -5.9); g.moveTo(0.7, -6.1); g.lineTo(-1.1, -8.1); g.stroke();
    ear(g, -5, -9.5, earA, bend, 27, lg(g, 0, -27, 0, 0, [[0, C.coat], [1, C.coatL]]), C.earIn);
  }

  function drawBunny(ctx, L, t){
    const C = palette(BPAL[L.coat] || BPAL.snow, BCOAT, L.tint, L.lit);
    const ph = L.ph || 0;
    const h = L.hop ? clamp01(L.hop) : 0, P = L.pose ? clamp01(L.pose) : 0, N = L.nibble ? clamp01(L.nibble) : 0;
    const X = hopX(h) * HOP;
    // ── the hop: crouch → push → a ballistic arc → front paws → gather
    const u = clamp01((h - AIR0) / (AIR1 - AIR0)), arc = 4 * u * (1 - u);
    const crouch = bump(h, 0, 0.11, 0.24), squash = bump(h, 0.76, 0.87, 1);
    const air = ramp(h, 0.14, 0.34) * (1 - ramp(h, 0.8, 0.98));
    // ── the pose: S = standing tall, then the binky (a happy twisting jump)
    const S = ramp(P, 0.02, 0.2) * (1 - ramp(P, 0.64, 0.78));
    const bk = clamp01((P - 0.72) / 0.24), binky = Math.sin(PI * bk), twist = Math.sin(TAU * bk) * binky;
    const breathe = Math.sin(t * 1.7 + ph);
    let bx = -3 - 2 * crouch + 13 * bump(h, 0.1, 0.34, 0.62) + 5 * bump(h, 0.55, 0.72, 0.95) - 3 * S;
    let by = -15 + 2.5 * crouch + 2 * squash - RISE * arc - 12 * S - 20 * binky;
    let rot = 0.06 * crouch - 0.5 * bump(h, 0.12, 0.32, 0.52) + 0.48 * bump(h, 0.5, 0.72, 0.95) - 1.05 * S - 0.42 * twist;
    const len = (1 - 0.1 * crouch + 0.2 * bump(h, 0.14, 0.36, 0.7) - 0.08 * squash + 0.06 * S + 0.08 * binky) * (1 + breathe * 0.012);
    const wid = 1 - (len - 1) * 0.55;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const bp = (px, py) => [bx + px * len * cr - py * wid * sr, by + px * len * sr + py * wid * cr];

    // ── feet. Planted = fixed on the ground while the anchor travels (−X).
    const wA = 1 - ramp(h, 0.3, 0.4), wB = ramp(h, 0.76, 0.86), wT = 1 - wA - wB;
    const s2 = ramp(h, 0.44, 0.76), trail = bp(-31, 9), tuck = bp(6, 17);
    const lift = 20 * binky - 7 * Math.max(0, twist);
    const hfx = wA * (9 - X) + wB * (9 + HOP - X) + wT * lerp(trail[0], tuck[0], s2) - 9 * binky;
    const hfy = (wA + wB) * -3.4 + wT * lerp(trail[1], tuck[1], s2) - lift;
    const hfold = wA * lerp(-PI / 2, -0.25, ramp(h, 0.16, 0.34)) + wB * -PI / 2 + wT * lerp(1.15, -1.35, s2) + 1.3 * binky;
    const wFA = 1 - ramp(h, 0.12, 0.22), wFB = ramp(h, 0.64, 0.76), wFT = 1 - wFA - wFB;
    const reach = bp(lerp(22, 27, ramp(h, 0.3, 0.65)), lerp(12, 17, ramp(h, 0.3, 0.65)));
    const hang = bp(21 + 2 * binky, 8.5 - 3 * binky), up = Math.max(S, binky);
    const ffx = lerp(wFA * (17.5 - X) + wFB * (17.5 + HOP - X) + wFT * reach[0], hang[0], up);
    const ffy = lerp((wFA + wFB) * -2.5 + wFT * reach[1], hang[1], up);
    const hip = bp(-14, 3), sh = bp(12, -1);
    // the front legs are a little elastic: straight little columns when it sits, long enough to reach when it lands
    const fd = Math.hypot(ffx - sh[0], ffy - FLEN[2] - sh[1]), fl = Math.max(7.4, Math.min(13.5, fd * 0.515));

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.lineCap = 'round';

    // far legs, in shadow
    leg(ctx, hip[0] + 4, hip[1], hfx + 4.5, hfy, HLEN[0], HLEN[1], HLEN[2], HW, 1, hfold + 0.12 * wT, C.far);
    leg(ctx, sh[0] + 1.2, sh[1], ffx + 3 + 2 * wFT, ffy - 1.5 * wFT, fl, fl, FLEN[2], FW, -1, 0.1 * wFT, C.far);

    // the pompom tail, then the loaf of a body (drawn in its own tilted frame,
    // so the light belly turns to the front when it stands up)
    const tl = bp(-21.5, 3.5); if (tl[1] > -8.8 && !h) tl[1] = -8.8;
    ctx.fillStyle = C.coatD; scallop(ctx, tl[0] - 0.6, tl[1] + 1, 7.4, 7.2, 7, 0.22, rot + 0.4, 0); ctx.fill();
    ctx.fillStyle = C.tail;  scallop(ctx, tl[0] - 1, tl[1] - 0.4, 6.6, 6.4, 7, 0.24, rot, 0); ctx.fill();
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(rot); ctx.scale(len, wid);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = lg(ctx, 0, -16, 0, 15, [[0, C.coatL], [0.42, C.coat], [0.74, C.coat], [1, C.belly]]);
    body(); ctx.fill();
    if (S < 0.3) rim(ctx, body, -7, C.rim, 1.5);            // (standing, the top edge is the head's)
    ctx.restore();

    // near hind leg: a round haunch and the long foot
    const ch = leg(ctx, hip[0], hip[1], hfx, hfy, HLEN[0], HLEN[1], HLEN[2], HW, 1, hfold, C.coat);
    const kx = ch[1][0], ky = ch[1][1], ax = ch[2][0], ay = ch[2][1], tx = ch[3][0], ty = ch[3][1];
    const mx = (hip[0] + kx) / 2, my = (hip[1] + ky) / 2, ha = Math.atan2(ky - hip[1], kx - hip[0]);
    ctx.fillStyle = lg(ctx, 0, my - 10, 0, my + 10, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    ctx.beginPath(); ctx.ellipse(mx, my, 12.5, 9.6, ha, 0, TAU); ctx.fill();
    ctx.fillStyle = C.fluff;
    ctx.beginPath();
    const fa = Math.atan2(ty - ay, tx - ax);
    ctx.ellipse((ax + tx) / 2 + Math.cos(fa) * 0.6, (ay + ty) / 2 + Math.sin(fa) * 0.6, 9.5, 3.4, fa, 0, TAU); ctx.fill();

    // chest fluff, near front leg with its little paw
    const cf = bp(16.5, 3.5);
    ctx.fillStyle = C.fluff; scallop(ctx, cf[0], cf[1], 5.6, 8, 7, 0.24, 0.3 + breathe * 0.04, rot); ctx.fill();
    const fc = leg(ctx, sh[0], sh[1], ffx, ffy, fl, fl, FLEN[2], FW, -1, 0, C.coat);
    ctx.fillStyle = C.fluff;
    ctx.beginPath(); ctx.ellipse(fc[3][0] + 0.8, fc[3][1], 3.6, 2.6, 0, 0, TAU); ctx.fill();

    // head: it stays nearly level whatever the body does
    const nk = bp(14, -6), ha2 = rot * 0.35, ox = 6 - 2 * S + 3 * N, oy = -11 + 5 * N;
    const hx = nk[0] + ox * Math.cos(ha2) - oy * Math.sin(ha2), hy = nk[1] + ox * Math.sin(ha2) + oy * Math.cos(ha2);
    const look = S * Math.sin(P * TAU * 2.1);
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.83 + ph * 1.7)), 30) * Math.sin(t * 26);
    const sway = Math.sin(t * 1.3 + ph) * 0.04;
    const earA = -0.42 + sway + flick * 0.16 - 1.0 * air + 0.74 * S + look * 0.06 - 0.5 * twist - 0.4 * binky;
    const earB = earA + 0.36 - 0.14 * air - flick * 0.3 - look * 0.14 + 0.3 * twist;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rot * 0.36 + look * 0.13 + 0.36 * N + 0.2 * twist + Math.sin(t * 0.6 + ph) * 0.02);
    bunnyHead(ctx, C, t, ph, earA, earB, -1.2 + 2.2 * air - 1.5 * twist, Math.sin(t * 0.33 + ph) * 0.4 + 0.25 + look * 0.7, N, Math.max(S, air));
    ctx.restore();
    if (P > 0.72 && P < 1){                               // a little heart pops out of the binky
      const k = (P - 0.72) / 0.28;
      heart(ctx, hx + 8 + 5 * k, hy - 30 - 16 * k, 4.6 * Math.sin(PI * Math.sqrt(k)) + 0.01, alpha(C.heart, 1 - k * k));
    }
    ctx.restore();
  }

  window.BunnyRig = { draw: drawBunny, HEIGHT: 68, WIDTH: 38, STAND_HEIGHT: 92, HOP, HOP_RISE: RISE, HOP_SECONDS: 0.62,
                      ACT_SECONDS: 3.2, COATS, hopX };

  /* ════════════════════════════ THE SWAN ═════════════════════════════════ */
  const SPAL = { white: '#FFFFFF', whiteM: '#E3EAF8', whiteD: '#CBD7EE', far: '#C2CDE4', farD: '#B1BDD8',
                 bill: '#F78B3A', billL: '#FFB56A', billD: '#DB6A2C', knob: '#2B252B',
                 eyeW: '#FFFDF8', iris: '#4A3226', pupil: '#17100E', line: '#3A2C34', drop: '#F4FCFF',
                 cyg: '#C6C3C6', cygL: '#ECEAEA', cygD: '#9E9AA2', cygF: '#8F8B96', cygBill: '#5B5660', cygBillL: '#7C7682',
                 mouth: '#7A2E3A', tongue: '#F08A98' };
  const SBODY = [[-41, -16], [-29, -13.5], [-10, -17], [8, -17.5], [20, -14], [25.5, -5], [22, 4], [0, 7], [-22, 6], [-35, -2]];
  const FE = [[0, 0], [0, 0], [0, 0], [0, 0]], NP = [[0, 0], [0, 0], [0, 0], [0, 0]];

  // a wing, in wing space: shoulder at (0, 0), the feathers fanning back (−x).
  // open 0 = folded and a little raised (half a heart), 1 = fanned up wide;
  // lift swings the whole fan (the beat). far = the other wing, in shade.
  function swanWing(g, C, open, lift, far){
    const n = 6;
    for (let i = n - 1; i >= 0; i--){                     // the top feather first, the lower ones over it
      const f = i / (n - 1);
      const a = lerp(PI + 0.1 + f * 0.8, PI + 0.62 + f * 1.66, open) + lift * (0.25 + 0.75 * f);
      const len = lerp(42 - 13 * f, 60 - 14 * f * f, open), ca = Math.cos(a), sa = Math.sin(a);
      const ux = -sa, uy = ca, r0 = 4 * f * open;
      FE[0][0] = ca * r0; FE[0][1] = sa * r0;
      FE[1][0] = ca * len * 0.35 - ux * 2; FE[1][1] = sa * len * 0.35 - uy * 2;
      FE[2][0] = ca * len * 0.7 - ux;      FE[2][1] = sa * len * 0.7 - uy;
      FE[3][0] = ca * len + ux * 3.5;      FE[3][1] = sa * len + uy * 3.5;
      leaf(g, FE, 7, 12.5 + open, far ? (i % 2 ? C.far : C.farD) : (i % 2 ? C.whiteM : C.white));
    }
    if (!far) for (let i = 3; i >= 0; i--){                // a shorter row of feathers over them
      const f = i / 3, a = lerp(PI + 0.22 + f * 0.6, PI + 0.75 + f * 1.4, open) + lift * (0.3 + 0.6 * f);
      const len = lerp(27 - 6 * f, 34 - 5 * f, open), ca = Math.cos(a), sa = Math.sin(a);
      FE[0][0] = 0; FE[0][1] = 0;
      FE[1][0] = ca * len * 0.35 + sa * 1.5; FE[1][1] = sa * len * 0.35 - ca * 1.5;
      FE[2][0] = ca * len * 0.7 + sa;        FE[2][1] = sa * len * 0.7 - ca;
      FE[3][0] = ca * len - sa * 2;          FE[3][1] = sa * len + ca * 2;
      leaf(g, FE, 7, 11, i % 2 ? C.white : C.whiteM);
    }
    const am = lerp(PI + 0.5, PI + 1.35, open) + lift * 0.6;       // the soft coverts over the roots
    g.fillStyle = far ? C.far : lg(g, 0, -16, 0, 8, [[0, C.white], [0.6, C.white], [1, C.whiteM]]);
    g.beginPath(); g.ellipse(Math.cos(am) * 8, Math.sin(am) * 8, 12.5, lerp(8.6, 10, open), am, 0, TAU); g.fill();
  }

  // the swan's head, in head space: centre (0, 0), the bill toward +x
  function swanHead(g, C, t, ph, wide){
    g.fillStyle = lg(g, 0, -3, 0, 4.4, [[0, C.billL], [0.5, C.bill], [1, C.billD]]);          // the orange bill
    g.beginPath(); g.moveTo(3, -3.2); g.quadraticCurveTo(10, -2.2, 15.2, 1.4); g.quadraticCurveTo(16.6, 3.2, 14.6, 3.9);
    g.quadraticCurveTo(8, 4.6, 3, 4); g.closePath(); g.fill();
    g.fillStyle = C.knob;                                                                   // its dark nail, the black base and knob
    g.beginPath(); g.ellipse(15.1, 2.8, 1.3, 1, 0.5, 0, TAU); g.fill();
    const skull = () => { g.beginPath(); g.ellipse(-0.6, 0, 7.4, 6.5, -0.1, 0, TAU); };
    g.fillStyle = lg(g, 0, -6.5, 0, 6.5, [[0, C.white], [0.55, C.white], [1, C.whiteD]]);
    skull(); g.fill();
    rim(g, skull, -3, C.rim, 0.9);
    g.fillStyle = C.knob;                                                                   // the black mask and the knob on the brow
    g.beginPath(); g.moveTo(3.9, -1.9); g.quadraticCurveTo(5.4, -4.6, 7.5, -4.4); g.quadraticCurveTo(9.2, -3.8, 8.5, -2);
    g.quadraticCurveTo(7.2, 0.2, 6.7, 3.6); g.quadraticCurveTo(5.5, 3, 5.1, 1.4); g.closePath(); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(0.2, 3.3, 2.7, 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = alpha(C.knob, 0.55); g.lineWidth = 0.6; g.lineCap = 'round';             // the bill's smile line
    g.beginPath(); g.moveTo(6.4, 2.3); g.quadraticCurveTo(10.5, 3.4, 14, 2.9); g.stroke();
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 + 0.08 * wide);
    eye(g, 0.9, -1.2, 2.9, 3.3, eyeH, Math.sin(t * 0.3 + ph) * 0.4 + 0.3, C, { iris: 0.86, lid: 0.95 });
    g.strokeStyle = C.line; g.lineWidth = 0.65;                                             // long lashes
    g.beginPath(); g.moveTo(-1.9, -2.5); g.lineTo(-4.1, -3.5); g.moveTo(-1.3, -3.7); g.lineTo(-3, -5.4); g.stroke();
  }

  // droplets flung off the beating wings; k 0..1 = the pose's progress
  function droplets(g, C, k){
    for (let i = 0; i < 9; i++){
      const kk = frac(k * 2 + psr(i * 3 + 1) * 0.5), a = PI + 0.5 + psr(i * 5 + 2) * 2.1, d = 30 + 34 * kk;
      const x = 2 + Math.cos(a) * d, y = -22 + Math.sin(a) * d * 0.9 + 26 * kk * kk;
      g.fillStyle = alpha(C.drop, (1 - kk * kk) * 0.95);
      g.beginPath(); g.ellipse(x, y, 1.1 + psr(i) * 0.9, 1.6 + psr(i) * 1.2, a + PI / 2, 0, TAU); g.fill();
    }
  }

  const NOCOAT = [];
  const setNeck = (a, b, c, d, e, f, g2, h) => { NP[0][0] = a; NP[0][1] = b; NP[1][0] = c; NP[1][1] = d; NP[2][0] = e; NP[2][1] = f; NP[3][0] = g2; NP[3][1] = h; };

  function drawSwan(ctx, L, t){
    if (L.cygnet) return drawCygnet(ctx, L, t);
    const C = palette(SPAL, NOCOAT, 1, L.lit);
    const ph = L.ph || 0, P = L.pose ? clamp01(L.pose) : 0, mv = L.moving ? 1 : 0;
    // the pose: rear up out of the water and beat both wings twice
    const up = ramp(P, 0, 0.2) * (1 - ramp(P, 0.8, 1));
    const bt = P > 0.16 && P < 0.84 ? Math.sin((P - 0.16) / 0.68 * TAU * 2) : 0;
    const open = up * (0.8 + 0.2 * bt), lift = up * bt * 0.42;
    const bob = Math.sin(t * 1.3 + ph) * 0.8 + mv * Math.sin(t * 2.6 + ph) * 0.4;
    const rock = Math.sin(t * 0.9 + ph * 1.3) * 0.015 + mv * Math.sin(t * 2.6 + ph + 1) * 0.012 - 0.34 * up - 0.03 * up * bt;
    const sw = mv * Math.sin(t * 2.6 + ph) + Math.sin(t * 0.7 + ph) * 0.3;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.save();
    ctx.beginPath(); ctx.rect(-200, -300, 400, 300); ctx.clip();          // nothing below the waterline
    ctx.translate(-22, bob - 2 * up); ctx.rotate(rock); ctx.translate(22, 0);
    ctx.save(); ctx.translate(11.5, -15); ctx.rotate(-0.17 + 0.55 * up);  // the far wing, peeking over
    swanWing(ctx, C, open, lift * 1.15 + 0.04, true); ctx.restore();
    ctx.fillStyle = lg(ctx, 0, -18, 0, 4, [[0, C.white], [0.45, C.white], [1, C.whiteD]]);
    blob(ctx, SBODY, 5.5); ctx.fill();
    // the neck: an S, swaying as it paddles; it stretches up tall for the pose
    setNeck(15, -10, 40 - 6 * up, -20 - 5 * up, 6 + 10 * up - 1.5 * sw, -37 - 8 * up, 24 + 3 * up + 2.2 * sw, -52 - 11 * up);
    taper(ctx, NP, 12, 7, lg(ctx, 30, 0, 8, 0, [[0, C.white], [0.5, C.white], [1, C.whiteM]]));
    ctx.save();
    ctx.translate(NP[3][0] + 2.4, NP[3][1] - 3);
    ctx.rotate(0.3 - 0.42 * up - rock + sw * 0.03 + Math.sin(t * 0.6 + ph) * 0.03);
    ctx.scale(1.12, 1.12);
    swanHead(ctx, C, t, ph, up);
    ctx.restore();
    ctx.save(); ctx.translate(8, -14); ctx.rotate(-0.06 * up);            // the near wing
    swanWing(ctx, C, open, lift, false); ctx.restore();
    ctx.restore();
    if (P > 0.2 && P < 0.92) droplets(ctx, C, (P - 0.2) / 0.72);
    ctx.restore();
  }

  function drawCygnet(ctx, L, t){
    const C = palette(SPAL, NOCOAT, 1, L.lit);
    const ph = L.ph || 0, P = L.pose ? clamp01(L.pose) : 0, mv = L.moving ? 1 : 0;
    const up = ramp(P, 0, 0.2) * (1 - ramp(P, 0.8, 1));
    const bt = P > 0.16 && P < 0.84 ? Math.sin((P - 0.16) / 0.68 * TAU * 3) : 0;
    const peep = up * Math.max(0, bt);
    const bob = Math.sin(t * 1.7 + ph) * 0.7 + mv * Math.sin(t * 4.2 + ph) * 0.4;
    const rock = Math.sin(t * 1.1 + ph * 1.3) * 0.03 + mv * Math.sin(t * 4.2 + ph + 1) * 0.03 - 0.22 * up;
    const sw = mv * Math.sin(t * 4.2 + ph) + Math.sin(t * 0.8 + ph) * 0.3;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.save();
    ctx.beginPath(); ctx.rect(-100, -150, 200, 150); ctx.clip();
    ctx.translate(-10, bob - 1.5 * up); ctx.rotate(rock); ctx.translate(10, 0);
    ctx.fillStyle = C.cygD;                                               // a stub of a tail
    scallop(ctx, -17.5, -11.5, 4.6, 3.6, 5, 0.4, 0.2, -0.6); ctx.fill();
    const fluff = Math.sin(t * 1.4 + ph) * 0.04;
    ctx.fillStyle = lg(ctx, 0, -20, 0, 3, [[0, C.cygL], [0.45, C.cyg], [1, C.cygD]]);       // a ball of down
    scallop(ctx, -2, -7.5, 16.5, 11.5, 11, 0.13, 0.2 + fluff, 0); ctx.fill();
    setNeck(8, -12, 11, -17, 11.5 + sw, -21 - 3 * up, 12.5 + 1.5 * sw + up, -25 - 3.5 * up);
    taper(ctx, NP, 12, 9.5, lg(ctx, 0, -30, 0, -8, [[0, C.cygL], [1, C.cyg]]));
    ctx.save();
    ctx.translate(NP[3][0] + 1.5, NP[3][1] - 3.5);
    ctx.rotate(0.08 - 0.3 * up - rock + sw * 0.05);
    cygnetHead(ctx, C, t, ph, peep, up);
    ctx.restore();
    ctx.save(); ctx.translate(0, -11.5); ctx.rotate(0.12 + up * (0.75 + 0.5 * bt));        // the tiny wing
    ctx.fillStyle = lg(ctx, 0, -5, 0, 7, [[0, C.cyg], [1, C.cygD]]);
    ctx.beginPath(); ctx.moveTo(3, -1); ctx.quadraticCurveTo(-4, -6.5 - up, -13, -3.4); ctx.quadraticCurveTo(-19 - 3 * up, -1.6, -20.5 - 4 * up, 1.4);
    ctx.quadraticCurveTo(-14, 6.6 + up, -5, 5.6); ctx.quadraticCurveTo(2.6, 4.4, 3, -1); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // the cygnet's head, in head space: a round ball of down, a stubby bill that
  // opens for a peep (a real gap: dark only at the throat)
  function cygnetHead(g, C, t, ph, peep, wide){
    const jaw = 0.55 * peep, HX = 6.6, HY = 2.2;
    if (peep > 0.04){
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 1, HY - 1); g.lineTo(HX + 3.4, HY - 0.6 - peep); g.lineTo(HX + 3.2 * Math.cos(jaw), HY + 0.6 + 3.2 * Math.sin(jaw)); g.closePath(); g.fill();
    }
    g.save(); g.translate(HX, HY); g.rotate(jaw); g.translate(-HX, -HY);                    // lower mandible
    g.fillStyle = C.cygBill;
    g.beginPath(); g.moveTo(6, 1.6); g.lineTo(12.2, 1.9); g.quadraticCurveTo(12.6, 3.3, 10.6, 3.6); g.quadraticCurveTo(8, 4, 6, 3.6); g.closePath(); g.fill();
    g.restore();
    g.save(); g.translate(HX, HY); g.rotate(-0.3 * peep); g.translate(-HX, -HY);            // upper mandible
    g.fillStyle = lg(g, 0, -2.4, 0, 2.6, [[0, C.cygBillL], [1, C.cygBill]]);
    g.beginPath(); g.moveTo(6, -2.4); g.quadraticCurveTo(10.6, -1.8, 13.2, 1); g.quadraticCurveTo(13.8, 2.3, 12.4, 2.5); g.lineTo(6, 2.5); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = C.cyg;                                                                    // a tuft of down on top
    scallop(g, -1.6, -8, 3.6, 2.6, 5, 0.5, 0.3 + Math.sin(t * 1.9 + ph) * 0.08, -0.5); g.fill();
    const skull = () => { g.beginPath(); g.arc(0, 0, 8.6, 0, TAU); };
    g.fillStyle = lg(g, 0, -8.6, 0, 8.6, [[0, C.cygL], [0.5, C.cyg], [1, C.cygD]]);
    skull(); g.fill();
    rim(g, skull, -4, C.rim, 1);
    g.fillStyle = C.cygL;                                                                   // pale cheek
    g.beginPath(); g.ellipse(3.6, 3.4, 4.6, 3.6, -0.2, 0, TAU); g.fill();
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(0.2, 4.2, 3, 1.9, 0, 0, TAU); g.fill();
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.6)) * (1 + 0.08 * wide);
    eye(g, 1.6, -1.4, 3.3, 3.8, eyeH, Math.sin(t * 0.4 + ph) * 0.4 + 0.3, C, { iris: 0.86, lid: 0.95 });
  }

  window.SwanRig = { draw: drawSwan, HEIGHT: 62, WIDTH: 44, POSE_HEIGHT: 88, POSE_WIDTH: 54, ACT_SECONDS: 2.6, CYGNET_HEIGHT: 40, CYGNET_WIDTH: 28 };
})();
