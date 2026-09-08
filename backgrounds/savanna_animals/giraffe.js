/* ── giraffe.js — the GIRAFFE rig, drawn from scratch in the lion.js style ──
   Workshop: backgrounds/savanna_animals/animals.html?animal=giraffe. Nothing
   in the game uses it yet. Shared helpers: rig-common.js (window.SavRig).

   THE LOOK: a tall tan body in profile with a sloping back, long slender
   legs ending in dark hooves (darker "socks" below the knee), a long THICK
   tapered neck that is a real curve (a cubic spine with a width profile),
   a short dark mane running down its back, a cream throat band, brown
   rounded patches over torso / neck / upper legs (varied colour via
   L.spotCol), a small head turned three-quarters toward the viewer with two
   big dark eyes, long lashes, heavy brows, side-sticking ears and two
   knobbed ossicones, and a thin tail with a dark tuft. Soft, no outlines.

   ALIVE: breathing, blinking, slow head sway, tail swish, a slow long-stride
   diagonal walk with a stride bob, and GRAZE (pose 0..1): the whole neck
   bends smoothly forward and down until the muzzle is at the grass, the jaw
   nibbles, the eyes look down, then it rises again.

   API — window.GiraffeRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint, spotCol }
       unit space: hooves on y = 0, facing +x, ~214 units tall
     HEIGHT 214   WIDTH 60 (half-width, hit boxes / shadows)
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, psr, lg, rg, shade, leg, eye, blink } = window.SavRig;
  const BASE = {
    coat: '#E8B86A', coatD: '#C8933F', coatL: '#F4D08A', belly: '#F7E6BE',
    patch: '#9C5A22', patchD: '#7E4519', dark: '#4A2A12', line: '#3B1D0C',
    muzzle: '#F2D9A8', nostril: '#5A3416', earIn: '#E9C9A0',
    eyeW: '#FFF4DC', iris: '#6B3E1A', pupil: '#1B0E06',
  };
  function tinted(f, spotCol){
    const c = Object.assign({}, BASE);
    if (f && f !== 1) for (const k of ['coat', 'coatD', 'coatL', 'belly', 'muzzle']) c[k] = shade(BASE[k], f);
    if (spotCol){ c.patch = spotCol; c.patchD = shade(spotCol, 0.82); }
    return c;
  }
  const bez = (P, u) => { const m = 1 - u; return [
    m*m*m*P[0][0] + 3*m*m*u*P[1][0] + 3*m*u*u*P[2][0] + u*u*u*P[3][0],
    m*m*m*P[0][1] + 3*m*m*u*P[1][1] + 3*m*u*u*P[2][1] + u*u*u*P[3][1]]; };
  const bezTan = (P, u) => { const m = 1 - u; const d = [
    3*m*m*(P[1][0] - P[0][0]) + 6*m*u*(P[2][0] - P[1][0]) + 3*u*u*(P[3][0] - P[2][0]),
    3*m*m*(P[1][1] - P[0][1]) + 6*m*u*(P[2][1] - P[1][1]) + 3*u*u*(P[3][1] - P[2][1])];
    const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
  // a round-capped stroke's outline, for clipping patches onto a leg segment
  function capsule(g, len, w){
    g.beginPath(); g.arc(0, 0, w / 2, Math.PI, 0); g.lineTo(w / 2, len); g.arc(0, len, w / 2, 0, Math.PI); g.closePath();
  }
  // an irregular rounded patch: three overlapping circles
  function blob(g, x, y, r, seed){
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + r * 0.55 * (psr(seed) - 0.5) * 2, y - r * 0.5, r * 0.7, 0, TAU); g.fill();
    g.beginPath(); g.arc(x - r * 0.5 * (psr(seed + 7) - 0.5) * 2, y + r * 0.55, r * 0.65, 0, TAU); g.fill();
  }

  // ── legs: SavRig.leg for the structure + hoof, then patches on the upper
  // segment and a darker sock on the lower one, in the leg's own frames
  function gLeg(g, hx, hy, up, lo, a1, a2, w1, w2, C, far, seed){
    const col = far ? C.coatD : C.coat;
    leg(g, hx, hy, up, lo, a1, a2, w1, w2, col, C.line, { hoof: C.dark });
    g.save();
    g.translate(hx, hy); g.rotate(a1);
    g.save(); capsule(g, up, w1); g.clip();
    g.fillStyle = far ? C.patchD : C.patch;
    blob(g, 1.5, up * 0.28, 3.4, seed * 5);
    blob(g, -1.5, up * 0.66, 3, seed * 5 + 3);
    g.restore();
    g.translate(0, up); g.rotate(a2);
    g.strokeStyle = far ? shade(C.coatD, 0.86) : C.coatD; g.lineWidth = w2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, lo * 0.5); g.lineTo(0, lo); g.stroke();
    g.restore();
  }

  // ── the neck: a cubic spine from the withers to the head joint, blended
  // between the upright rest pose and the bent-down graze pose
  const NECK_REST  = [[33, -110], [44, -150], [52, -176], [58, -192]];
  const NECK_GRAZE = [[33, -110], [50, -140], [74, -100], [60, -30]];
  const neckCtrl = k => NECK_REST.map((p, i) => [p[0] + (NECK_GRAZE[i][0] - p[0]) * k, p[1] + (NECK_GRAZE[i][1] - p[1]) * k]);
  const neckW = u => 27 - 12 * u;
  function neckSamples(P){
    const N = 18, S = [];
    for (let i = 0; i <= N; i++){
      const u = i / N, p = bez(P, u), tn = bezTan(P, u), w = neckW(u);
      S.push({ u, p, w, nx: -tn[1], ny: tn[0] });          // (nx, ny) → the throat side
    }
    return S;
  }
  function neckPath(g, S){
    g.beginPath();
    g.moveTo(S[0].p[0] + S[0].nx * S[0].w / 2, S[0].p[1] + S[0].ny * S[0].w / 2);
    for (const q of S) g.lineTo(q.p[0] + q.nx * q.w / 2, q.p[1] + q.ny * q.w / 2);
    for (let i = S.length - 1; i >= 0; i--){ const q = S[i]; g.lineTo(q.p[0] - q.nx * q.w / 2, q.p[1] - q.ny * q.w / 2); }
    g.closePath();
  }

  // ── the head, in head space: muzzle toward +x, the neck joins at (-3, 9)
  function drawHead(g, C, t, ph, k){
    const nib = k > 0.5 ? Math.abs(Math.sin(t * 9)) * 1.6 * Math.min(1, (k - 0.5) * 4) : 0;
    // ears stick out sideways (three-quarter view: one each side)
    for (const [ex, ey, rot, far] of [[-9.5, -7.5, -0.95, true], [8, -9.5, 0.8, false]]){
      g.save(); g.translate(ex, ey); g.rotate(rot);
      g.fillStyle = far ? C.coatD : C.coat;
      g.beginPath(); g.ellipse(0, -4, 3.4, 6.2, 0, 0, TAU); g.fill();
      g.fillStyle = C.earIn;
      g.beginPath(); g.ellipse(0, -3.6, 1.8, 4, 0, 0, TAU); g.fill();
      g.restore();
    }
    // two knobbed ossicones
    for (const [ox, oy] of [[-4, -10], [3.5, -11.5]]){
      g.strokeStyle = C.coat; g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + 0.6, oy - 7); g.stroke();
      g.fillStyle = C.dark;
      g.beginPath(); g.arc(ox + 0.6, oy - 7.5, 2.7, 0, TAU); g.fill();
    }
    // skull with a few face patches
    g.fillStyle = lg(g, 0, -12, 0, 10, [[0, C.coatL], [1, C.coat]]);
    g.beginPath(); g.ellipse(0, -1, 11.5, 10.5, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(0, -1, 11.5, 10.5, 0, 0, TAU); g.clip();
    g.fillStyle = C.patch;
    blob(g, -7.5, -5.5, 3, 31); blob(g, 5.5, -9.5, 2.4, 37); blob(g, -8.5, 4.5, 2.2, 41);
    g.restore();
    // muzzle — long, rounded, cream, with a soft darker nose end
    g.fillStyle = C.muzzle;
    g.beginPath(); g.ellipse(10.5, 3, 10, 7.6, 0.1, 0, TAU); g.fill();
    g.fillStyle = 'rgba(120,80,40,.26)';
    g.beginPath(); g.ellipse(16.5, 2.4, 4.6, 5.6, 0.1, 0, TAU); g.fill();
    g.fillStyle = C.nostril;                                   // two nostrils
    g.beginPath(); g.ellipse(15.6, -0.2, 1.4, 1, 0.5, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(18.4, 1.6, 1.3, 1, 0.5, 0, TAU); g.fill();
    // mouth: a smile, or a nibbling lower jaw while grazing
    g.strokeStyle = C.line; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(12, 6.8); g.quadraticCurveTo(15.5, 9.2 + nib, 19.6, 6.4 + nib * 0.6); g.stroke();
    if (nib > 0.3){
      g.fillStyle = C.muzzle;
      g.beginPath(); g.ellipse(15, 9.6 + nib, 4.2, 2.2, 0.1, 0, TAU); g.fill();
    }
    // eyes (both visible) with long lashes, heavy brows
    const eyeH = Math.max(0.08, 1 - blink(t, ph));
    const gaze = Math.sin(t * 0.3 + ph) * 0.35 + k * 0.5;    // eyes drop to the grass while grazing
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    const EYES = [[-4.6, -3, 3.2, 3.7, -1], [4.8, -3.4, 3.7, 4.2, 1]];
    for (const [ex, ey, rx, ry] of EYES) eye(g, ex, ey, rx, ry, eyeH, gaze, ec);
    g.strokeStyle = C.line; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath();
    for (const [ex, ey, rx, ry, side] of EYES)
      for (let i = 0; i < 3; i++){
        const a = -Math.PI / 2 + side * (0.3 + i * 0.34);
        const x0 = ex + Math.cos(a) * rx, y0 = ey + Math.sin(a) * ry * eyeH;
        g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a - side * 0.35) * 2.4, y0 + Math.sin(a - side * 0.35) * 2.4);
      }
    g.stroke();
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-8.4, -8.4); g.quadraticCurveTo(-4.8, -10.2, -1.4, -9);
    g.moveTo(1.8, -9.6);  g.quadraticCurveTo(5.2, -11.4, 9, -9.6);
    g.stroke();
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = tinted(L.tint, L.spotCol);
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const k = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.6);          // stride bob
    const wamp = moving ? 0.22 : 0;                                  // long, slow strides
    const A = i => wamp * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.30 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;

    // ── tail: thin, swishing, with a dark tuft
    const sw = Math.sin(t * 1.2 + ph);
    const tc = [[-40, -104], [-50, -100], [-56, -82 + sw * 2], [-53 + sw * 4, -60 + sw * 3]];
    ctx.strokeStyle = C.coatD; ctx.lineCap = 'round';
    let pp = bez(tc, 0);
    for (let i = 1; i <= 8; i++){
      const p = bez(tc, i / 8);
      ctx.lineWidth = 3.4 - 1.6 * (i / 8);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    {
      const e = tc[3], tn = bezTan(tc, 1);
      ctx.fillStyle = C.dark;
      for (const [f, r] of [[0, 3.8], [3.4, 3.2], [6.4, 2.3]]){
        ctx.beginPath(); ctx.arc(e[0] + tn[0] * f, e[1] + tn[1] * f, r, 0, TAU); ctx.fill();
      }
    }

    // ── far legs (darker)
    gLeg(ctx, -32, -92, 42, 44, -0.22 + A(2), 0.32 + B(2), 13, 8.5, C, true, 1);
    gLeg(ctx, 36, -100, 46, 48, 0.04 + A(0), -0.05 - B(0) * 0.5, 12, 8, C, true, 2);

    // ── torso — high withers, a back sloping to the rump, deep chest
    const breathe = 1 + Math.sin(t * 1.1 + ph) * 0.008;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(42, -94);
      ctx.bezierCurveTo(50, -104, 50, -118, 44, -126);
      ctx.quadraticCurveTo(36, -132, 22, -128);
      ctx.bezierCurveTo(4, -124, -16, -118, -30, -112);
      ctx.bezierCurveTo(-42, -108, -46, -98, -44, -90);
      ctx.quadraticCurveTo(-42, -80, -32, -78);
      ctx.quadraticCurveTo(-10, -74, 12, -78);
      ctx.quadraticCurveTo(32, -80, 42, -94);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -132, 0, -76, [[0, C.coatL], [0.5, C.coat], [1, C.coatD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = C.patch;                                        // the patch coat
    const PATCHES = [[-34, -100, 6], [-20, -116, 6.5], [-18, -96, 5.5], [-4, -110, 7], [8, -94, 5.5],
                     [12, -122, 6], [26, -108, 6.5], [36, -120, 5], [28, -92, 5]];
    PATCHES.forEach(([px, py, r], i) => blob(ctx, px, py, r, 100 + i * 3));
    ctx.fillStyle = lg(ctx, 0, -98, 0, -80, [[0, 'rgba(247,230,190,0)'], [1, C.belly]]);
    ctx.fillRect(-50, -100, 100, 26);                               // soft cream underside
    ctx.fillStyle = rg(ctx, -30, -100, 0, 16, [[0, 'rgba(255,220,160,.22)'], [1, 'rgba(255,220,160,0)']]);
    ctx.beginPath(); ctx.arc(-30, -100, 16, 0, TAU); ctx.fill();   // haunch highlight
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,170,90,.5)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();                                                // sunset rim light on the back
    ctx.moveTo(22, -127.5);
    ctx.bezierCurveTo(4, -123.5, -16, -117.5, -30, -111.5);
    ctx.bezierCurveTo(-40, -107.5, -44, -99, -43, -91);
    ctx.stroke();
    ctx.restore();

    // ── near legs
    gLeg(ctx, -22, -92, 42, 44, -0.22 + A(3), 0.32 + B(3), 13, 8.5, C, false, 3);
    gLeg(ctx, 24, -100, 46, 48, 0.04 + A(1), -0.05 - B(1) * 0.5, 12, 8, C, false, 4);

    // ── the neck (bends down smoothly to graze)
    const P = neckCtrl(k), S = neckSamples(P);
    ctx.fillStyle = lg(ctx, 18, 0, 66, 0, [[0, C.coatD], [0.45, C.coat], [1, C.coatL]]);
    neckPath(ctx, S); ctx.fill();
    ctx.save(); neckPath(ctx, S); ctx.clip();
    ctx.fillStyle = 'rgba(247,230,190,.55)';                          // cream throat band
    ctx.beginPath();
    S.forEach((q, i) => { const px = q.p[0] + q.nx * q.w * 0.14, py = q.p[1] + q.ny * q.w * 0.14; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    for (let i = S.length - 1; i >= 0; i--){ const q = S[i]; ctx.lineTo(q.p[0] + q.nx * q.w * 0.47, q.p[1] + q.ny * q.w * 0.47); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.patch;                                        // neck patches follow the bend
    [0.12, 0.3, 0.48, 0.66, 0.84].forEach((u, i) => {
      const q = S[Math.round(u * (S.length - 1))], side = i % 2 ? 1 : -1;
      const off = side * q.w * 0.16;
      blob(ctx, q.p[0] + q.nx * off, q.p[1] + q.ny * off, 4.6 - u * 1.6, 200 + i * 3);
    });
    ctx.restore();
    ctx.fillStyle = C.dark;                                         // the short mane down the back
    for (let i = 1; i < S.length - 1; i++){
      const q = S[i], r = 4.2 - 1.8 * q.u;
      ctx.beginPath(); ctx.arc(q.p[0] - q.nx * (q.w / 2 - 1), q.p[1] - q.ny * (q.w / 2 - 1), r, 0, TAU); ctx.fill();
    }

    // ── head: perpendicular to the neck at rest, muzzle down while grazing
    const top = P[3];
    const theta = 0.32 + 0.8 * k + Math.sin(t * 0.5 + ph) * 0.03;
    ctx.save();
    ctx.translate(top[0], top[1]);
    ctx.rotate(theta);
    ctx.scale(1.15, 1.15);
    ctx.translate(3, -9);
    drawHead(ctx, C, t, ph, k);
    ctx.restore();

    ctx.restore();
  }

  window.GiraffeRig = { draw, HEIGHT: 214, WIDTH: 60, colors: BASE };
})();
