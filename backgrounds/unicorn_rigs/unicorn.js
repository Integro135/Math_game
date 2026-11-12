/* ── unicorn.js — the UNICORN (2026-11) ─────────────────────────────────────
   A graceful, slightly chubby storybook unicorn in true profile: a round
   barrel on slim legs with dainty golden hooves, an arched neck, a short soft
   head — ONE big glossy eye with long lashes, a blush, a small smile, leaf
   ears — and a pearly spiral horn with a glow halo and twinkling sparkles.
   The MANE and TAIL are the stars: overlapping tapered locks in a pastel
   rainbow that wave when she stands and stream back when she runs or flies.

   L.coat   one of COATS (a full palette each)
   L.wings  a pegasus-unicorn: layered feathered wings, folded along the back
   L.fly    0..1 — the wings open and beat (fast down-stroke, slow up-stroke),
            the legs tuck into an airborne gallop, the body tips nose-up
   L.foal   baby proportions. The legs keep their unit length (so STRIDE and
            the planted feet stay true) — the caller draws a foal at a smaller
            L.s (FOAL_SCALE is the suggested factor)
   L.glow   0..1 extra horn glow / sparkle
   L.run    a GALLOP: hind pair, fore pair, then a flight phase
   pose     0..1 the MAGIC REAR: up on the hind legs, fore legs pawing, the
            horn flares into a starburst and a ring of stars spirals out

   Legs: three bones placed by IK (kit.js) on planted feet, as the savanna
   rigs. No outlines, no ctx.filter / shadowBlur — every glow is a gradient.

   API — window.UnicornRig { draw(ctx, L, t), hornTip(L[, t]), HEIGHT, WIDTH,
         STRIDE, RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS, ... }
   Depends only on ../savanna_rigs/kit.js (window.SavKit). */
(function(){
  const { TAU, psr, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, blob, bez, bezT, taper,
          step, leg, xf, eye, blink, rim, heart } = window.SavKit;
  const PI = Math.PI;

  // ── coats. m0..m5 = the mane / tail locks (and the wing-tip tints)
  const EYE = { eyeW: '#FFFFFF', pupil: '#22143A', line: '#3A2550', earIn: '#FFB9D0', mouth: '#7A2F4E', tongue: '#FF93A8',
                wing: '#FFFFFF', wingS: '#F4EEFB', wingD: '#E6DDF3', wingF: '#CFC6E2' };
  const RAINBOW = ['#FF9AC6', '#FFBC98', '#FFE285', '#A4EBC2', '#98D2FF', '#C8A6F6'];
  const mk = (o, m) => { const P = Object.assign({}, EYE, o); for (let i = 0; i < 6; i++) P['m' + i] = m[i]; return P; };
  const PALS = {
    pearl: mk({ coat: '#FBF6F5', coatL: '#FFFFFF', coatD: '#E3D8E8', belly: '#FFFFFF', far: '#D2C6DA',
                hoof: '#EFC25C', hoofL: '#FFE9A6', horn: '#FFF1C4', hornD: '#F0BF5A', iris: '#7B5AD2' }, RAINBOW),
    rose:  mk({ coat: '#FFD2E0', coatL: '#FFEAF1', coatD: '#F3ADC6', belly: '#FFF2F6', far: '#DE9FB8',
                hoof: '#FFF4E4', hoofL: '#FFFFFF', horn: '#FFF6DA', hornD: '#F6C877', iris: '#C24D8C' },
              ['#FF7DB4', '#FFA6CF', '#FFC9A6', '#FFE99E', '#D8A8F6', '#A8C8FF']),
    lilac: mk({ coat: '#DDCCF8', coatL: '#F1E8FF', coatD: '#BDA6E6', belly: '#F6F0FF', far: '#A994D2',
                hoof: '#FFF1D6', hoofL: '#FFFFFF', horn: '#FFF3CC', hornD: '#F2C36A', iris: '#6A49C4' },
              ['#8FD8FF', '#A6ECDC', '#FFF0A6', '#FFB8D8', '#F48EC6', '#B48AF0']),
    mint:  mk({ coat: '#CBF3DF', coatL: '#EBFFF5', coatD: '#A3DDC2', belly: '#F2FFF8', far: '#90C8AE',
                hoof: '#F3C968', hoofL: '#FFEBAE', horn: '#FFF3CC', hornD: '#F2C36A', iris: '#2E9A86' },
              ['#FF9AC6', '#FFC0A6', '#FFE285', '#8EE0D0', '#8AC8F6', '#B8A0F0']),
    sky:   mk({ coat: '#CDE5FB', coatL: '#EDF7FF', coatD: '#A6C8EC', belly: '#F3FAFF', far: '#93B4DA',
                hoof: '#FFF4E0', hoofL: '#FFFFFF', horn: '#FFF3CC', hornD: '#F2C36A', iris: '#3B78D0' },
              ['#FFF09E', '#FFC6A0', '#FF9AC6', '#D8A8F6', '#8EB8F6', '#8EE4E0']),
    gold:  mk({ coat: '#FCE7BA', coatL: '#FFF6DC', coatD: '#EDC888', belly: '#FFF9E8', far: '#D8B278',
                hoof: '#E2A63E', hoofL: '#FFDD8C', horn: '#FFF6DC', hornD: '#EDB04A', iris: '#B06A2A' },
              ['#FFB26A', '#FF988A', '#FFD26A', '#FFE9A6', '#FF8EA8', '#F6A8D0']),
    night: mk({ coat: '#3D3C7E', coatL: '#605FB0', coatD: '#28275A', belly: '#4E4D98', far: '#201F4C',
                hoof: '#D6E3F6', hoofL: '#FFFFFF', horn: '#F0F8FF', hornD: '#9FD6F0', iris: '#3FC0D8',
                line: '#14133A', earIn: '#8E7FD0', wing: '#E9F0FF', wingS: '#D4DEFA', wingD: '#B4C2F0', wingF: '#7F86C8' },
              ['#BFEFFF', '#8EE3E8', '#DCE6FF', '#A8B8FF', '#7ED0F0', '#F0F8FF']),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatD', 'far'];

  const WALK   = { stride: 82,  duty: 0.62, lift: 9,  off: [0, 0.25, 0.5, 0.75],   fsw: 1.15, hsw: 0.7 };
  // gallop: touch-downs far hind 0, near hind .1, far fore .35, near fore .45; all four off the ground .73–1
  const GALLOP = { stride: 190, duty: 0.28, lift: 21, off: [0.9, 0.55, 0, 0.65], fsw: 1.9,  hsw: 1.15 };

  const BODY = [[39, -61], [35, -79], [18, -85], [-8, -81.5], [-30, -84.5], [-46, -77], [-51, -59], [-43, -45], [-14, -39.5], [14, -40], [33, -47]];
  const TOP = -85, CY = -63, BELLY = -40, FARX = 6;
  const FL = [15.5, 24, 17], HL = [19.5, 22, 21], FW = [21, 12.5, 8.2, 7.2], HW = [30, 16, 8.6, 7.4];
  const SKULL = [[-14, 3], [-14, -8], [-6, -14.5], [6, -14], [16, -9.5], [23.5, -5], [30, -2.6], [33.4, 3], [30.6, 8.8], [22.5, 10.6], [9, 12], [-5, 11]];
  const SKULL_F = [[-14, 3], [-14, -8], [-6, -14.5], [6, -14], [14.5, -10], [20.5, -5.4], [25.6, -2.2], [28.8, 3], [26, 8.8], [19, 10.8], [8, 12], [-5, 11]];   // the foal: a short muzzle
  // the two builds. Body points map through bp(): x * bx, belly-anchored y * by
  const ADULT = { bx: 1, by: 1, sh: [26, -55], hp: [-34, -59], frest: 28, hrest: -39, lw: 1, mz: 0, skull: SKULL,
                  nb: [23, -69], nv: [17, -37], nw: [32, 19], hs: 1.12, es: 1, horn: 1, mane: 1, tail: 1, tr: [-47, -72],
                  wing: [3, -76], ws: 1, rear: 0.72 };
  const FOAL  = { bx: 0.78, by: 0.8, sh: [19, -53.5], hp: [-25, -57.5], frest: 21, hrest: -29, lw: 0.72, mz: -4.6, skull: SKULL_F,
                  nb: [16, -64], nv: [12, -27], nw: [24, 16], hs: 1.18, es: 1.22, horn: 0.42, mane: 0.5, tail: 0.5, tr: [-34, -68],
                  wing: [4, -72], ws: 0.62, rear: 0.55 };
  const JAW = [[-4, 8.4], [9, 9], [21, 8.4], [29, 7.4], [30.6, 9.6], [25, 12], [10, 13.4], [-3, 12.2]];
  const HORN_AT = [5.5, -11], HORN_A = -1.4, HORN_L = 31;
  const WING_CPS = 1.5;

  // ── a lock of hair: a tapered leaf along a cubic — a soft root, widest at
  //    about 40 %, running out to a point. One path, no allocations.
  const LN = 12, LW = [], LB = new Float64Array((LN + 1) * 2);
  for (let i = 0; i <= LN; i++) LW.push(Math.pow(Math.sin(PI * (0.15 + 0.85 * i / LN)), 0.8) / 2);
  function lock(g, x0, y0, x1, y1, x2, y2, x3, y3, w, fill){
    g.beginPath();
    for (let i = 0; i <= LN; i++){
      const u = i / LN, m = 1 - u, a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
      const px = a * x0 + b * x1 + c * x2 + d * x3, py = a * y0 + b * y1 + c * y2 + d * y3;
      let tx = 3 * m * m * (x1 - x0) + 6 * m * u * (x2 - x1) + 3 * u * u * (x3 - x2);
      let ty = 3 * m * m * (y1 - y0) + 6 * m * u * (y2 - y1) + 3 * u * u * (y3 - y2);
      const l = Math.hypot(tx, ty) || 1, hw = w * LW[i]; tx /= l; ty /= l;
      if (i) g.lineTo(px + ty * hw, py - tx * hw); else g.moveTo(px + ty * hw, py - tx * hw);
      LB[i * 2] = px - ty * hw; LB[i * 2 + 1] = py + tx * hw;
    }
    for (let i = LN; i >= 0; i--) g.lineTo(LB[i * 2], LB[i * 2 + 1]);
    g.closePath();
    g.moveTo(x0 + w * LW[0], y0); g.arc(x0, y0, w * LW[0], 0, TAU);
    g.fillStyle = fill; g.fill();
  }
  const SHEEN = 'rgba(255,255,255,.34)';
  // a four-point sparkle, r = long arm
  function sparkle(g, x, y, r, rot, fill){
    const c = Math.cos(rot), s = Math.sin(rot), k = r * 0.085;
    g.beginPath(); g.moveTo(x + c * r, y + s * r);
    g.quadraticCurveTo(x + (c - s) * k, y + (s + c) * k, x - s * r, y + c * r);
    g.quadraticCurveTo(x - (c + s) * k, y + (c - s) * k, x - c * r, y - s * r);
    g.quadraticCurveTo(x - (c - s) * k, y - (s + c) * k, x + s * r, y - c * r);
    g.quadraticCurveTo(x + (c + s) * k, y - (c - s) * k, x + c * r, y + s * r);
    g.fillStyle = fill; g.fill();
  }
  // a feather: pointed quill, round tip. From (x, y) along angle a.
  function feather(g, x, y, a, l, w, fill){
    const c = Math.cos(a), s = Math.sin(a), h = w / 2, tx = x + c * l, ty = y + s * l;
    g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + c * l * 0.3 + s * h * 1.1, y + s * l * 0.3 - c * h * 1.1, x + c * l * 0.92 + s * h * 1.25, y + s * l * 0.92 - c * h * 1.25, tx, ty);
    g.bezierCurveTo(x + c * l * 0.92 - s * h * 1.25, y + s * l * 0.92 + c * h * 1.25, x + c * l * 0.3 - s * h * 1.1, y + s * l * 0.3 + c * h * 1.1, x, y);
    g.fillStyle = fill; g.fill();
  }

  // ── the pose, solved once per draw (and by hornTip): a SHARED scratch
  const S = { NP: [[0, 0], [0, 0], [0, 0], [0, 0]] };
  let lastT = 0;
  function solve(L, t){
    const F = S.F = L.foal ? FOAL : ADULT, ph = S.ph = L.ph || 0;
    const fly = S.fly = clamp01(L.fly || 0);
    const go = S.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const run = !!L.run; S.G = run ? GALLOP : WALK;
    const cyc = S.cyc = (L.wt || 0) / TAU, p = clamp01(L.pose || 0);
    const K = S.K = p > 0 ? smooth(clamp01(p / 0.3)) * smooth(clamp01((1 - p) / 0.26)) : 0;
    S.flare = p > 0 ? Math.sin(clamp01((p - 0.2) / 0.62) * PI) : 0;        // the horn's burst
    S.q = clamp01((p - 0.3) / 0.62);                                        // the star ring
    const gg = S.gg = go * (1 - fly) * (1 - K);                             // how much the feet are in the gait
    const wp = frac(t * WING_CPS + ph * 0.37);                              // wing beat: 36 % down, 64 % up
    S.wb = wp < 0.36 ? Math.cos(PI * wp / 0.36) : -Math.cos(PI * (wp - 0.36) / 0.64);
    S.wopen = Math.max(smooth(clamp01(fly * 1.6)), 0.92 * K);
    let drop, pitch, nod;
    if (run){
      drop = -1 - 5 * Math.cos(TAU * (cyc - 0.87));                         // highest in the flight phase
      pitch = -0.085 * Math.cos(TAU * (cyc - 0.12));                        // nose up as the hinds land
      nod = 0.075 * Math.cos(TAU * (cyc - 0.16));
      S.gather = Math.cos(TAU * (cyc - 0.87));                              // +1 gathered, −1 stretched
    } else {
      drop = 1.2 * Math.sin(2 * TAU * cyc + 0.6); pitch = 0;
      nod = 0.04 * Math.sin(2 * TAU * cyc + 1.2); S.gather = 0;
    }
    S.pitch = pitch * gg - 0.14 * fly * (1 - K) - F.rear * K;
    S.pvx = lerp(0, F.hp[0], K); S.pvy = lerp(CY, F.hp[1], K);              // the rear turns about the hip
    S.ox = -5 * K + (L.foal ? Math.sin(t * 2.3 + ph) * 0.7 * (1 - go) : 0);
    S.oy = drop * gg - fly * 3.2 * Math.cos(TAU * (wp - 0.42)) + 4.5 * K;
    const str = S.str = clamp01(Math.max(go * (run ? 1 : 0.2) * (1 - K), fly * 0.9));   // how much the hair streams
    // neck: base → poll; it reaches forward at speed and arches for the rear
    const nb = F.nb, ex = F.nv[0] + (8 * str - 3 * K) * F.hs, ey = F.nv[1] + (7 * str + 2 * K) * F.hs, NP = S.NP;
    NP[0][0] = nb[0]; NP[0][1] = nb[1];
    NP[1][0] = nb[0] + ex * 0.28; NP[1][1] = nb[1] + ey * 0.45;
    NP[2][0] = nb[0] + ex * 0.62; NP[2][1] = nb[1] + ey * 0.84;
    NP[3][0] = nb[0] + ex; NP[3][1] = nb[1] + ey;
    S.hx = NP[3][0] + 4 * F.hs; S.hy = NP[3][1] - 4 * F.hs;
    S.hrot = 0.42 + nod * gg + Math.sin(t * 0.6 + ph) * 0.03 - 0.14 * str + K * (0.44 + 0.1 * Math.sin(p * TAU * 2.5));
    // the horn tip, in unit space
    const hl = HORN_L * F.horn, lx = (HORN_AT[0] + Math.cos(HORN_A) * hl) * F.hs, ly = (HORN_AT[1] + Math.sin(HORN_A) * hl) * F.hs;
    const c = Math.cos(S.hrot), s = Math.sin(S.hrot);
    const r = xf(S.hx + lx * c - ly * s, S.hy + lx * s + ly * c, S.pvx, S.pvy, S.pitch, S.ox, S.oy);
    S.tipX = r[0]; S.tipY = r[1];
    return S;
  }
  function hornTip(L, t){
    solve(L, t == null ? lastT : t);
    return { x: L.x + S.tipX * L.s * (L.dir || 1), y: L.y + S.tipY * L.s };
  }

  function ear(g, C, x, y, rot, far){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = far ? C.far : C.coat;
    g.beginPath(); g.moveTo(-4.6, 1.4); g.quadraticCurveTo(-6.8, -10, -0.4, -18); g.quadraticCurveTo(6, -9, 4.2, 1.4); g.closePath(); g.fill();
    if (!far){
      g.fillStyle = C.earIn;
      g.beginPath(); g.moveTo(-1.6, -1); g.quadraticCurveTo(-3, -8.4, -0.2, -13.4); g.quadraticCurveTo(3, -7.4, 2.2, -1); g.closePath(); g.fill();
    }
    g.restore();
  }
  // the spiral horn, in head space: a pearly cone wound with slanted beads
  function horn(g, C, F){
    const l = HORN_L * F.horn, w = 4.1 * (0.55 + 0.45 * F.horn), n = F.horn < 0.6 ? 3 : 6;
    g.save(); g.translate(HORN_AT[0], HORN_AT[1]); g.rotate(HORN_A + PI / 2);
    const fill = lg(g, -w, 0, w, 0, [[0, C.hornD], [0.42, C.horn], [0.62, C.horn], [1, C.hornD]]);
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(-w, 2); g.quadraticCurveTo(-w * 0.55, -l * 0.55, 0, -l); g.quadraticCurveTo(w * 0.55, -l * 0.55, w, 2); g.closePath(); g.fill();
    for (let i = 0; i < n; i++){
      const u = (i + 0.5) / n * 0.9, hw = w * (1 - u) * 1.12 + 0.3;
      g.beginPath(); g.ellipse(0, -l * u, hw, l / n * 0.4, -0.5, 0, TAU); g.fill();
    }
    g.strokeStyle = alpha(C.hornD, 0.85); g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath();
    for (let i = 1; i < n; i++){
      const u = i / n * 0.9, hw = w * (1 - u) * 0.95;
      g.moveTo(-hw, -l * u + hw * 0.5); g.lineTo(hw, -l * u - hw * 0.5);
    }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)';                                   // a pearly streak
    g.beginPath(); g.moveTo(-w * 0.35, -1); g.quadraticCurveTo(-w * 0.3, -l * 0.5, -0.2, -l * 0.9); g.quadraticCurveTo(w * 0.05, -l * 0.5, w * 0.05, -1); g.closePath(); g.fill();
    g.restore();
  }

  // forelock: three locks from the poll — over the brow when standing,
  // swept back at speed. [root, standing P1 P2 P3, streaming P1 P2 P3]
  const FORE = [
    [-8, -12.5, -13, -15.5, -16.5, -8, -13, -0.5, -12, -17, -20, -14, -26, -8],
    [-5, -14, -3.5, -19.5, 2, -16, 1.5, -10.4, -6, -20, -15, -18.5, -23, -13],
    [-3, -14.5, 2, -22, 12, -19, 18.5, -9.5, -2, -21, -12, -21.5, -21, -17.5]];
  function forelock(g, C, S, t, i0, i1){
    const k = S.str, m = 0.45 + 0.55 * S.F.mane;
    for (let i = i0; i < i1; i++){
      const f = FORE[i], w = Math.sin(t * 1.5 + S.ph + i) * (0.8 + 2 * k), w2 = Math.sin(t * 6 + S.ph + i * 1.3) * 2.2 * k;
      const x0 = f[0], y0 = f[1];
      lock(g, x0, y0,
           x0 + (lerp(f[2], f[8], k) - x0) * m, y0 + (lerp(f[3], f[9], k) - y0) * m,
           x0 + (lerp(f[4], f[10], k) - x0) * m, y0 + (lerp(f[5], f[11], k) - y0) * m + w2 * 0.5,
           x0 + (lerp(f[6], f[12], k) - x0) * m + w * 0.5, y0 + (lerp(f[7], f[13], k) - y0) * m + w * 0.4 + w2,
           (5.4 + i * 0.5) * m, C['m' + i]);
    }
  }

  // the head, in head space: skull centre (0,0), muzzle toward +x
  function drawHead(g, C, L, t, S){
    const F = S.F, ph = S.ph, jaw = 0.3 * S.flare * S.K, HX = 0, HY = 9, es = F.es, mz = F.mz;
    const flick = Math.pow(Math.max(0, Math.sin(t * 0.9 + ph * 2.7)), 40) * 0.4;
    ear(g, C, -1, -11.5, 0.16 - flick * 0.5 - 0.25 * S.str, true);
    if (jaw > 0.02){                                      // the throat, back at the hinge
      const c = Math.cos(jaw), s = Math.sin(jaw), fx = 14;
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HX - 3, HY - 1); g.lineTo(fx, 9.4);
      g.lineTo(HX + (fx - HX) * c, HY + (fx - HX) * s + 0.6); g.lineTo(HX - 3, HY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // lower jaw on its hinge
    g.translate(HX, HY); g.rotate(jaw); g.scale(1 + mz / 31, 1); g.translate(-HX, -HY);
    g.fillStyle = C.coatD; blob(g, JAW, 5); g.fill();
    if (jaw > 0.05){ g.fillStyle = C.tongue; g.beginPath(); g.ellipse(20, 8.4, 7, 0.8 + 3 * jaw, 0, 0, TAU); g.fill(); }
    g.restore();
    const skull = () => blob(g, F.skull, 5.5);
    g.fillStyle = lg(g, 0, -13, 0, 11, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    g.save(); skull(); g.clip();
    g.fillStyle = rg(g, 31 + mz, 4.5, 1, 11, [[0, alpha(C.belly, 0.95)], [1, alpha(C.belly, 0)]]);   // a pale velvet nose
    g.fillRect(19 + mz, -8, 16, 20);
    g.fillStyle = rg(g, 15 + mz * 0.4, 5.4, 0.5, 6.6, [[0, 'rgba(255,105,135,.42)'], [1, 'rgba(255,105,135,0)']]);   // blush
    g.fillRect(8, -2, 14, 14);
    g.restore();
    rim(g, skull, -5, alpha(C.coatL, 0.6), 1.3);
    g.fillStyle = alpha(C.line, 0.5);                     // nostril
    g.beginPath(); g.ellipse(30.6 + mz, 1.6, 1.5, 1, -0.6, 0, TAU); g.fill();
    g.strokeStyle = alpha(C.line, 0.5); g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath();                                        // the smile, with a dimple
    if (jaw < 0.06){ g.moveTo(31.4 + mz, 7.4); g.quadraticCurveTo(26.5 + mz, 10.4, 21.4 + mz, 7.6); }
    g.moveTo(21.8 + mz, 6); g.quadraticCurveTo(20.2 + mz, 7, 21 + mz, 8.6);
    g.stroke();
    horn(g, C, F);
    // ONE eye — big, glossy, long lashes; at the peak of the magic it shuts into a happy arc
    const ex = 6.6, ey = -2.2, rx = 5 * es, ry = 5.9 * es, shut = S.flare * S.K;
    g.strokeStyle = C.line; g.lineCap = 'round';
    if (shut > 0.6){
      g.lineWidth = 1.7;
      g.beginPath(); g.moveTo(ex - rx, ey + 1.6); g.quadraticCurveTo(ex, ey - ry * 1.05, ex + rx, ey + 1.6); g.stroke();
    } else {
      const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - shut * 1.3);
      eye(g, ex, ey, rx, ry, eyeH, 0.35 + Math.sin(t * 0.3 + ph) * 0.3, C, { iris: 0.84, lid: 1.25 });
      g.strokeStyle = C.line;
    }
    g.lineWidth = 0.95;                                   // lashes, swept back from the outer corner
    g.beginPath();
    for (let i = 0; i < 3; i++){
      const a = PI * (1.06 + i * 0.13), lx = ex + Math.cos(a) * rx, ly = ey + Math.sin(a) * ry * (shut > 0.6 ? 0.55 : 0.96);
      g.moveTo(lx, ly); g.quadraticCurveTo(lx - 2.2 * es, ly - 1.4 * es - i * 0.5, lx - 3.6 * es + i * 0.5, ly - 3.4 * es - i * 0.3);
    }
    g.stroke();
    forelock(g, C, S, t, 0, 1);
    ear(g, C, -6.6, -11, -0.34 - flick - 0.3 * S.str, false);
    forelock(g, C, S, t, 1, 3);
  }

  function hoof(g, C, x, y, rot, far){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.hoof;
    g.beginPath(); g.moveTo(-3.4, -2.2); g.lineTo(3.6, -2.2); g.quadraticCurveTo(5.6, 1.2, 5, 3.4); g.lineTo(-4.3, 3.4); g.quadraticCurveTo(-4.5, 0.4, -3.4, -2.2); g.fill();
    if (far){ g.fillStyle = 'rgba(80,60,120,.22)'; g.fill(); }
    else { g.fillStyle = C.hoofL; g.beginPath(); g.ellipse(-0.6, 0.2, 1.3, 2, 0.25, 0, TAU); g.fill(); }
    g.restore();
  }

  // ── the tail: six rainbow locks from the rump (body frame). Hanging, they
  //    fall in an S to the fetlocks — plumb to the WORLD, whatever the body's
  //    pitch; at speed they stream out behind with a travelling wave.
  function tail(g, C, S, t){
    const F = S.F, k = S.str, m = F.tail, x0 = F.tr[0], y0 = F.tr[1], ph = S.ph;
    const c = Math.cos(-S.pitch), s = Math.sin(-S.pitch), w = 12.5 * (0.5 + 0.5 * m), up = S.K * 0.25;
    for (let i = 5; i >= 0; i--){                         // the lock nearest the legs first, the outermost last
      const sp = i - 2.5, out = 5 - i, a = t * 1.5 + ph + i * 0.55, b = t * 7 + ph - i * 0.7;
      const slow = Math.sin(a) * (1 - k), slow2 = Math.sin(a - 1.2) * (1 - k), fast = Math.sin(b) * k, fast2 = Math.sin(b - 1.3) * k;
      // hanging offsets (world-plumb): a fan — the outer locks arc further out and end higher
      const h2x = -14 - out * 3.5 + slow * 2, h2y = 22 + i * 1.6, h3x = -1 - out * 5.2 + slow2 * 4.5, h3y = 59 - out * 3.2 - up * 30;
      // streaming offsets (along the body)
      const s2x = -40, s2y = -13 + sp * 2.6 + fast * 5, s3x = -72 + Math.abs(sp) * 4, s3y = 3 + sp * 6.5 + fast2 * 10;
      const p1x = lerp(-10 - out * 1.6, -19, k), p1y = lerp(-8 + i * 0.5, -5 + sp * 0.6, k);
      const p2x = lerp(h2x * c - h2y * s, s2x, k), p2y = lerp(h2x * s + h2y * c, s2y, k);
      const p3x = lerp(h3x * c - h3y * s, s3x, k), p3y = lerp(h3x * s + h3y * c, s3y, k);
      lock(g, x0, y0 + sp * 0.5, x0 + p1x * m, y0 + p1y * m, x0 + p2x * m, y0 + p2y * m, x0 + p3x * m, y0 + p3y * m, w, C['m' + i]);
      lock(g, x0, y0 + sp * 0.5, x0 + p1x * m, y0 + p1y * m, x0 + p2x * m, y0 + p2y * m, x0 + (p2x * 0.35 + p3x * 0.65) * m, y0 + (p2y * 0.35 + p3y * 0.65) * m, w * 0.3, SHEEN);
    }
  }
  // ── the mane: seven locks rooted along the crest of the neck (body frame),
  //    drawn withers-first so the upper ones overlap. Each hangs plumb with a
  //    lazy wave, or streams back with a fast one.
  function mane(g, C, S, t){
    const F = S.F, NP = S.NP, k = S.str, m = F.mane, ph = S.ph, N = 7, w = 10.5 * (0.5 + 0.5 * m);
    for (let i = N - 1; i >= 0; i--){
      const u = 0.98 - i * 0.135, p = bez(NP, u), d = bezT(NP, u), l = Math.hypot(d[0], d[1]) || 1;
      const hw = (F.nw[0] + (F.nw[1] - F.nw[0]) * u) / 2 - 3, nx = d[1] / l, ny = -d[0] / l;
      const x0 = p[0] + nx * hw, y0 = p[1] + ny * hw;
      const a = lerp(PI / 2 + 0.3 + (i - 3) * 0.11, PI + 0.3 - i * 0.09, k) - S.pitch * (1 - k);
      const dx = Math.cos(a), dy = Math.sin(a), len = m * (40 - i * 1.5 + 3 * Math.sin(i * 2.1)) * (1 + 0.25 * k);
      const sa = t * 1.4 + ph + i * 0.7, fa = t * 7.5 + ph - i * 0.9;
      const o2 = Math.sin(sa) * 1.8 * (1 - k) + Math.sin(fa) * 4 * k - 3.5 * (1 - k) + 4.5 * k;
      const o3 = Math.sin(sa - 1) * 3.6 * (1 - k) + Math.sin(fa - 1.4) * 8 * k + 2.5 - 6 * k;
      lock(g, x0, y0,
           x0 + nx * 6 * m + dx * len * 0.3, y0 + ny * 6 * m + dy * len * 0.3,
           x0 + dx * len * 0.68 - dy * o2, y0 + dy * len * 0.68 + dx * o2,
           x0 + dx * len - dy * o3, y0 + dy * len + dx * o3, w, C['m' + (i + 2) % 6]);
      lock(g, x0, y0, x0 + nx * 6 * m + dx * len * 0.3, y0 + ny * 6 * m + dy * len * 0.3,
           x0 + dx * len * 0.6 - dy * o2, y0 + dy * len * 0.6 + dx * o2,
           x0 + dx * len * 0.8 - dy * (o2 + o3) / 2, y0 + dy * len * 0.8 + dx * (o2 + o3) / 2, w * 0.3, SHEEN);
    }
  }

  // ── a wing (body frame): nine flight feathers fanned along the arm, a row
  //    of coverts over their quills, a row of small ones over those. Folded
  //    (open = 0) the fan closes and lies back along the body; the beat
  //    squashes the span in y — edge-on at mid-stroke, below the back at the
  //    bottom — as a wing seen from the side really does.
  const WN = 9;
  function wing(g, C, S, far){
    const F = S.F, o = S.wopen, amp = S.fly * o;
    let sy = 1 - amp * (1 - S.wb) * 0.74;                 // 1 (top of the stroke) … −0.48 (bottom)
    if (sy > -0.1 && sy < 0.1) sy = sy < 0 ? -0.1 : 0.1;
    g.save();
    g.translate(F.wing[0] + (far ? 7 : 0), F.wing[1] - (far ? 1.5 : 0));
    g.rotate((far ? 0.14 : 0) * o - S.pitch * 0.8 * o);   // it stays upright when the body rears
    const ws = F.ws * (1 + 0.28 * o);
    g.scale(ws, ws * sy);
    const hx = lerp(-13, -20, o), hy = lerp(7, -36, o), fw = lerp(10.5, 15, o);
    for (let pass = 0; pass < 3; pass++){
      const n = pass === 0 ? WN : pass === 1 ? 7 : 5, kl = pass === 0 ? 1 : pass === 1 ? 0.58 : 0.32;
      for (let i = n - 1; i >= 0; i--){
        const u = i / (n - 1) * (pass ? 0.94 : 1);
        const bx = hx * u + Math.sin(PI * u) * 11 * o, by = hy * u;
        const a = PI + lerp(-0.36 + 0.26 * u, -0.16 + 1.2 * Math.pow(u, 0.9), o) + pass * 0.05 * o;
        const l = lerp(27 + 19 * u, 38 + 14 * u, o) * kl;
        let fill;
        if (far) fill = pass ? C.wingD : C.wingF;
        else if (pass) fill = pass === 2 ? C.wing : C.wingS;
        else {
          const tx = bx + Math.cos(a) * l, ty = by + Math.sin(a) * l;
          fill = lg(g, bx, by, tx, ty, [[0, C.wing], [0.45, C.wing], [1, C['m' + i % 6]]]);
        }
        feather(g, bx, by, a, l, fw * (pass === 2 ? 0.8 : 1), fill);
      }
    }
    g.strokeStyle = far ? C.wingD : C.wing; g.lineWidth = 8; g.lineCap = 'round';       // the arm — the leading edge
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(hx * 0.5 + 16 * o, hy * 0.5, hx, hy); g.stroke();
    g.restore();
  }
  function draw(ctx, L, t){
    lastT = t;
    const P = PALS[L.coat] || PALS.pearl, C = palette(P, TINTED, L.tint, L.lit);
    solve(L, t);
    const F = S.F, G = S.G, cyc = S.cyc, gg = S.gg, K = S.K, fly = S.fly, ph = S.ph, pitch = S.pitch;
    const pvx = S.pvx, pvy = S.pvy, ox = S.ox, oy = S.oy, pose = clamp01(L.pose || 0);

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s * (L.dir || 1), L.s);
    const coatG = lg(ctx, 0, TOP, 0, 0, [[0, C.coatL], [0.4, C.coat], [1, C.coatD]]);
    const FWS = F.lw === 1 ? FW : FWF, HWS = F.lw === 1 ? HW : HWF;

    function oneLeg(i){
      const hind = !(i & 1), far = i > 1, fo = far ? FARX : 0;
      const st = step(cyc + G.off[i], G.duty);
      const reach = st.x * G.stride * gg, lift = st.lift * G.lift * gg * (hind ? 0.8 : 1);
      const swing = st.sw ? Math.sin(PI * st.sw) * gg : 0;
      const root = hind ? F.hp : F.sh, len = hind ? HL : FL, ws = hind ? HWS : FWS;
      const r = xf(root[0] + fo, root[1], pvx, pvy, pitch, ox + reach * (hind ? 0.15 : 0.3), oy);
      const rx = r[0], ry = r[1];
      let fold = (hind ? -0.16 : 0.03) - reach / 78 + swing * (hind ? G.hsw : G.fsw);
      let fx = (hind ? F.hrest : F.frest) + fo + reach, fy = -lift - ws[3] / 2;
      const w = hind ? fly : Math.max(fly, K);            // how much this leg is in the air
      if (w > 0.001){
        // an airborne hoof: tucked for flight (placed in the BODY's frame) …
        const a = t * 2.6 + ph + (far ? 2.4 : 0) + (hind ? 1.3 : 0);
        let ax, ay, af;
        if (hind){ ax = -30 + 6 * Math.sin(a); ay = 30 + 3 * Math.cos(a); af = 0.9 + 0.25 * Math.sin(a); }
        else { ax = 6 + 5 * Math.sin(a); ay = 27 + 3 * Math.cos(a); af = 1.4 + 0.25 * Math.sin(a); }
        const q = xf(root[0] + fo + ax, root[1] + ay, pvx, pvy, pitch, ox, oy);
        let qx = q[0], qy = q[1], qf = af + pitch;
        if (!hind && K > 0){                              // … or pawing for the rear: knee high, cannon dangling
          const rk = K / (K + fly + 1e-6), b = pose * TAU * 2.4 + (far ? 2.6 : 0);
          qx = lerp(qx, rx + 19 + 4 * Math.sin(b), rk); qy = lerp(qy, ry + 9 + 5 * Math.cos(b), rk);
          qf = lerp(qf, 0.4 + 0.3 * Math.sin(b + 0.8), rk);
        }
        fx = lerp(fx, qx, w); fy = lerp(fy, qy, w); fold = lerp(fold, qf, w);
      }
      const ch = leg(ctx, rx, ry, fx, fy, len[0], len[1], len[2], ws, hind ? 1 : -1, fold, far ? C.far : coatG);
      hoof(ctx, C, ch[3][0], ch[3][1], fold * 0.9 * Math.max(w, Math.min(1, lift / 3)), far);
    }
    const bodyFrame = () => { ctx.translate(ox + pvx, oy + pvy); ctx.rotate(pitch); ctx.translate(-pvx, -pvy); };

    if (L.wings && S.wopen > 0.03){ ctx.save(); bodyFrame(); wing(ctx, C, S, true); ctx.restore(); }
    oneLeg(2); oneLeg(3);

    // ── tail, then the barrel
    ctx.save(); bodyFrame();
    tail(ctx, C, S, t);
    ctx.save();
    ctx.translate(0, BELLY);                              // the foal's build, breathing, the gallop's stretch and gather
    ctx.scale(F.bx * (1 - 0.035 * S.gather * gg), F.by * (1 + Math.sin(t * 1.2 + ph) * 0.01));
    ctx.translate(0, -BELLY);
    const body = () => blob(ctx, BODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -57, 0, -39, [[0, alpha(C.belly, 0)], [1, alpha(C.belly, 0.9)]]);
    ctx.fillRect(-52, -57, 92, 20);
    if (P === PALS.night){                                // a starry sheen
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < STARS.length; i++){
        const st = STARS[i];
        ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 2.1))) * 0.9;
        ctx.beginPath(); ctx.arc(st[0], st[1], st[2], 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    rim(ctx, body, TOP + 14, alpha(C.coatL, 0.6), 1.8);
    ctx.restore();
    ctx.restore();

    oneLeg(0); oneLeg(1);

    // ── wing, neck, mane, head
    ctx.save(); bodyFrame();
    heart(ctx, -37 * F.bx, BELLY - 27 * F.by, 3.6 * F.by, alpha(C.m0, 0.9));   // her mark, on the haunch
    taper(ctx, S.NP, F.nw[0], F.nw[1], coatG);
    mane(ctx, C, S, t);
    if (L.wings) wing(ctx, C, S, false);
    ctx.translate(S.hx, S.hy); ctx.rotate(S.hrot); ctx.scale(F.hs, F.hs);
    drawHead(ctx, C, L, t, S);
    ctx.restore();

    // ── the magic (unit space, unlit — it shines at night): halo, twinkles, burst, the ring of stars
    const tx = S.tipX, ty = S.tipY, fl = S.flare, e = Math.max(clamp01(L.glow || 0), fl), hk = 0.55 + 0.45 * F.horn;
    const R = (11 + 22 * e + 1.5 * Math.sin(t * 2.3 + ph)) * hk;
    ctx.fillStyle = rg(ctx, tx, ty, 0, R, [[0, 'rgba(255,253,235,' + (0.5 + 0.45 * e) + ')'], [0.35, 'rgba(255,238,170,' + (0.18 + 0.3 * e) + ')'], [1, 'rgba(255,238,170,0)']]);
    ctx.fillRect(tx - R, ty - R, R * 2, R * 2);
    const n = 3 + Math.round(3 * e);
    for (let j = 0; j < n; j++){
      const tw = Math.pow(Math.max(0, Math.sin(t * 2.6 + j * 1.9 + ph)), 3), sz = (1.8 + 2.6 * psr(j + 5)) * (0.7 + 0.8 * e) * tw * hk;
      if (sz < 0.35) continue;
      const a = j * 2.4 + t * 0.5, rr = (5 + 7 * psr(j + 1)) * (1 + 0.8 * e) * hk;
      sparkle(ctx, tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * 0.9 - 1, sz, 0, 'rgba(255,255,255,.95)');
    }
    if (fl > 0.02){
      sparkle(ctx, tx, ty, (10 + 36 * fl) * hk, t * 0.5 + PI / 4, 'rgba(255,240,170,' + 0.8 * fl + ')');
      sparkle(ctx, tx, ty, (8 + 26 * fl) * hk, t * 0.5, 'rgba(255,255,255,' + 0.95 * fl + ')');
    }
    const q = S.q;
    if (q > 0 && q < 1){
      for (let j = 0; j < 12; j++){
        const a = j / 12 * TAU + q * 4.4 + ph, rr = (10 + 62 * q) * (0.72 + 0.28 * psr(j + 3)) * hk;
        const sz = (4 + 4 * psr(j + 9)) * (0.75 + 0.25 * Math.sin(t * 6 + j));
        const px = tx + Math.cos(a) * rr, py = ty + Math.sin(a) * rr;
        ctx.globalAlpha = Math.min(1, q * 8) * Math.pow(1 - q, 0.6);
        if (j % 3 === 2) heart(ctx, px, py, sz * 0.8, P['m' + j % 6]); else sparkle(ctx, px, py, sz * 1.25, a, j % 3 ? P['m' + j % 6] : '#FFFFFF');
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  const FWF = FW.map(v => v * FOAL.lw), HWF = HW.map(v => v * FOAL.lw);
  const STARS = [];                                       // the night coat's sheen — clear of the leg roots that cover the barrel
  for (let i = 0; STARS.length < 16 && i < 80; i++){
    const x = -44 + psr(i + 1) * 78, y = -82 + psr(i + 7) * 32;
    if (Math.hypot(x - ADULT.hp[0], y - ADULT.hp[1]) > 17 && Math.hypot(x - ADULT.sh[0], y - ADULT.sh[1]) > 12.5) STARS.push([x, y, 0.6 + psr(i + 13) * 0.9]);
  }
  solve({}, 0);
  const HEIGHT = Math.round(-S.tipY) + 2;
  window.UnicornRig = { draw, hornTip, HEIGHT, WIDTH: 80, STRIDE: WALK.stride, RUN_STRIDE: GALLOP.stride, ACT_SECONDS: 3.2,
                        WALK_CPS: 0.85, RUN_CPS: 1.55, COATS, FOAL_SCALE: 0.62, WING_CPS };

})();
