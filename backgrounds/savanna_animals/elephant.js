/* ── elephant.js — a cartoon ELEPHANT, drawn from scratch on canvas ─────────
   One of the from-scratch savanna animal rigs (workshop:
   backgrounds/savanna_animals/animals.html). Shared helpers: rig-common.js
   (window.SavRig). Sibling of lion.js — same house style: soft rounded
   shapes, no outlines, body in profile, head turned three-quarters toward the
   viewer so both big friendly eyes show.

   THE LOOK: a big rounded grey body (lighter back, darker underside, a few
   faint wrinkles, sunset rim light along the back), a large domed head,
   HUGE floppy fan-shaped ears with a pinkish inner ear, a long tapered
   trunk with segment rings and a curled tip, two small ivory tusks, big dark
   eyes with heavy brows, a small smile under the trunk, four thick column
   legs with three toenails each, a short thin tail with a dark tuft.

   ALIVE: breathing, blinking, slow head sway, the near ear flaps, the trunk
   sways, tail flicks, a heavy slow diagonal-gait walk with a stride bob.
   pose 0..1 = TRUMPET: the trunk rises in an S-curve above the head, the
   mouth opens (tongue), both ears flare wide, the head tilts up, then it all
   relaxes (sine-shaped progress).

   API — window.ElephantRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint }
       unit space: feet on y = 0, facing +x, ~135 units tall
     HEIGHT 135, WIDTH 78 (half-width), colors
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, rg, shade, eye, blink } = window.SavRig;
  const BASE = {
    coat: '#9A9BA8', coatL: '#B9BAC8', coatD: '#767888', belly: '#6E7080',
    earIn: '#C9A0A8', tusk: '#F4EBD6', nail: '#E9E3D2',
    line: '#3E3E50', mouth: '#5A2A30', tongue: '#D9707A',
    eyeW: '#FFF4DC', iris: '#5C4636', pupil: '#1B1410',
  };
  const tinted = f => {
    if (!f || f === 1) return BASE;
    const c = Object.assign({}, BASE);
    for (const k of ['coat', 'coatL', 'coatD', 'belly']) c[k] = shade(BASE[k], f);
    return c;
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  // a thick column leg: two round-capped strokes (hip→knee→ankle) and a
  // broad rounded foot pad with three toenails on its front edge
  function column(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col, padCol, nail){
    g.save();
    g.translate(hx, hy); g.rotate(a1);
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = w1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, upLen); g.stroke();
    g.translate(0, upLen); g.rotate(a2);
    g.lineWidth = w2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, loLen); g.stroke();
    g.fillStyle = padCol;
    g.beginPath(); g.ellipse(1.5, loLen + 1, w2 * 0.66, 5.5, 0, 0, TAU); g.fill();
    g.fillStyle = nail;
    for (const nx of [-0.35, 0.15, 0.62]){
      g.beginPath(); g.ellipse(nx * w2 * 0.9 + 1.5, loLen + 3.6, 2.6, 2, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  // a fan-shaped ear hinged at (hx, hy) on the side of the head; sx = +1 for
  // the ear on the +x side, -1 for the other
  function ear(g, C, hx, hy, sx, rot, scale){
    g.save();
    g.translate(hx, hy); g.rotate(rot * sx); g.scale(scale * sx, scale);
    const shape = k => {                       // two merged circles: big top, smaller bottom
      g.beginPath();
      g.arc(11 * k, -7 * k, 19 * k, 0, TAU);
      g.arc(9 * k, 10 * k, 14 * k, 0, TAU);
    };
    g.fillStyle = C.coat;
    shape(1); g.fill();
    g.fillStyle = C.earIn;
    shape(0.72); g.fill();
    g.restore();
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = tinted(L.tint);
    const ph = L.ph || 0, wt = (L.wt || 0) * 0.75, moving = !!L.moving;
    const K = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // trumpet
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    if (moving) ctx.translate(0, Math.sin(wt * 2) * 1.6);          // heavy stride bob
    const wamp = moving ? 0.17 : 0;
    const A = i => wamp * Math.sin(wt + i * Math.PI / 2);
    const B = i => moving ? 0.16 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;

    // ── tail: short, thin, a dark tuft
    const sw = Math.sin(t * 1.3 + ph);
    ctx.strokeStyle = C.coatD; ctx.lineCap = 'round'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-61, -84);
    ctx.quadraticCurveTo(-72, -66 + sw * 2, -67 + sw * 4, -44 + sw * 2);
    ctx.stroke();
    ctx.fillStyle = C.line;
    for (const [dx, dy, r] of [[0, 0, 3.2], [-2.6, 5, 2.6], [2.2, 5.4, 2.4], [0, 9, 1.9]]){
      ctx.beginPath(); ctx.arc(-67 + sw * 4 + dx, -44 + sw * 2 + dy, r, 0, TAU); ctx.fill();
    }

    // ── far legs (darker) — short, chunky columns
    column(ctx, -47, -44, 20, 18, A(2) - 0.02, B(2), 22, 20, C.coatD, C.coatD, C.nail);
    column(ctx, 15, -46, 21, 19, A(0) + 0.02, -B(0) * 0.7, 21, 19, C.coatD, C.coatD, C.nail);

    // ── torso — a big soft boulder: high domed back, deep round belly
    const breathe = 1 + Math.sin(t * 1.1 + ph) * 0.008;
    ctx.save();
    ctx.scale(1, breathe);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(44, -50);
      ctx.bezierCurveTo(50, -64, 50, -92, 36, -106);
      ctx.bezierCurveTo(24, -115, -6, -117, -30, -111);
      ctx.bezierCurveTo(-52, -106, -66, -92, -64, -74);
      ctx.bezierCurveTo(-63, -58, -56, -46, -44, -41);
      ctx.quadraticCurveTo(-10, -33, 24, -38);
      ctx.quadraticCurveTo(38, -41, 44, -50);
      ctx.closePath();
    };
    ctx.fillStyle = lg(ctx, 0, -118, 0, -34, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -58, 0, -36, [[0, 'rgba(110,112,128,0)'], [1, C.belly]]);
    ctx.fillRect(-70, -60, 120, 30);                                // darker underside
    ctx.fillStyle = rg(ctx, -28, -86, 0, 30, [[0, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-28, -86, 30, 0, TAU); ctx.fill();    // soft flank highlight
    ctx.fillStyle = rg(ctx, 30, -80, 6, 34, [[0, 'rgba(40,40,60,.28)'], [1, 'rgba(40,40,60,0)']]);
    ctx.beginPath(); ctx.arc(30, -80, 34, 0, TAU); ctx.fill();     // the head's shadow on the shoulder
    // faint skin wrinkles on the rump and shoulder
    ctx.strokeStyle = 'rgba(50,50,70,.11)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-56, -90); ctx.quadraticCurveTo(-50, -80, -51, -70);
    ctx.moveTo(-48, -96); ctx.quadraticCurveTo(-42, -86, -43, -76);
    ctx.moveTo(-8, -48); ctx.quadraticCurveTo(2, -44, 14, -46);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,170,90,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();                                                // sunset rim light along the back
    ctx.moveTo(30, -108);
    ctx.bezierCurveTo(20, -113.5, -6, -115.5, -30, -109.5);
    ctx.bezierCurveTo(-48, -105, -60, -94, -61, -80);
    ctx.stroke();
    ctx.restore();

    // ── near legs
    column(ctx, -34, -42, 20, 18, A(3) + 0.02, B(3), 24, 22, C.coat, C.coat, C.nail);
    column(ctx, 30, -44, 21, 19, A(1) - 0.02, -B(1) * 0.7, 23, 21, C.coat, C.coat, C.nail);

    // ── head group — a big head, centre (34, -94); slow sway, tilts up for the trumpet
    ctx.save();
    ctx.translate(34, -94);
    ctx.rotate(Math.sin(t * 0.5 + ph) * 0.025 - 0.16 * K);
    ctx.scale(1.15, 1.15);
    // ears (behind the face) — the near one flaps; both flare wide when trumpeting
    const flap = Math.sin(t * 1.6 + ph) * 0.06;
    ear(ctx, C, -13, -6, -1, -0.10 + 0.38 * K, 1 + 0.12 * K);
    ear(ctx, C, 13, -6, 1, 0.10 + flap + 0.38 * K, 1 + 0.12 * K);
    // the domed face
    ctx.fillStyle = lg(ctx, 0, -28, 0, 20, [[0, C.coatL], [1, C.coat]]);
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.bezierCurveTo(-24, -19, -12, -28.5, 0, -28.5);
    ctx.bezierCurveTo(12, -28.5, 24, -19, 24, -4);
    ctx.bezierCurveTo(24, 10, 16, 20, 4, 20);
    ctx.bezierCurveTo(-8, 20, -24, 10, -24, -4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rg(ctx, -2, -16, 0, 16, [[0, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.arc(-2, -16, 16, 0, TAU); ctx.fill();     // forehead sheen
    // cheek blush
    ctx.fillStyle = 'rgba(210,150,160,.18)';
    ctx.beginPath(); ctx.ellipse(-15, 6, 5, 3.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(17, 5, 5, 3.6, 0, 0, TAU); ctx.fill();
    // eyes — both visible; blink; look toward the viewer
    const eyeH = Math.max(0.08, 1 - blink(t, ph)) * (1 - 0.15 * K);
    const gaze = Math.sin(t * 0.3 + ph) * 0.4;
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    eye(ctx, -8.5, -8, 4.1, 4.6, eyeH, gaze, ec);
    eye(ctx, 9.5, -9, 4.8, 5.3, eyeH, gaze, ec);
    // heavy brows, lifting for the trumpet
    const up = 1.8 * K;
    ctx.strokeStyle = C.line; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, -14 - up); ctx.quadraticCurveTo(-8.5, -16.4 - up * 1.4, -4, -14.6 - up);
    ctx.moveTo(4.5, -15.4 - up); ctx.quadraticCurveTo(9.5, -18 - up * 1.4, 15, -15.6 - up);
    ctx.stroke();
    // mouth under the trunk base: a smile, or a wide-open trumpet mouth
    if (K > 0.12){
      ctx.fillStyle = C.mouth;
      ctx.beginPath(); ctx.ellipse(5, 21 + 2 * K, 7.5, 2.2 + 4 * K, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.tongue;
      ctx.beginPath(); ctx.ellipse(5, 23 + 2.4 * K, 4.2, 1.1 + 2.1 * K, 0, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-9, 15.5); ctx.quadraticCurveTo(5, 22.5, 19, 15); ctx.stroke();
    }
    // tusks — ivory curves flanking the trunk, sweeping out and up
    ctx.strokeStyle = C.tusk; ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-5, 12); ctx.quadraticCurveTo(-13, 30, -19, 21); ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(14, 11); ctx.quadraticCurveTo(23, 30, 30, 20); ctx.stroke();
    // the trunk: rest hangs down with a curled tip, trumpet lifts it in an S
    const tsw = Math.sin(t * 0.9 + ph);
    const rest = [[4, 14], [3, 34], [16 + 2 * tsw, 54], [6 + 3 * tsw, 64]];
    const up2  = [[4, 14], [12, 30], [34, -6], [20, -38]];
    const P = rest.map((p, i) => [lerp(p[0], up2[i][0], K), lerp(p[1], up2[i][1], K)]);
    const bz = u => { const m = 1 - u; return [
      m*m*m*P[0][0] + 3*m*m*u*P[1][0] + 3*m*u*u*P[2][0] + u*u*u*P[3][0],
      m*m*m*P[0][1] + 3*m*m*u*P[1][1] + 3*m*u*u*P[2][1] + u*u*u*P[3][1]]; };
    ctx.strokeStyle = C.coat; ctx.lineCap = 'round';
    let pp = bz(0);
    for (let i = 1; i <= 14; i++){
      const p = bz(i / 14);
      ctx.lineWidth = 17 - 8.5 * (i / 14);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    // segment rings across the trunk + the tip's nostril
    ctx.strokeStyle = 'rgba(50,50,70,.30)'; ctx.lineWidth = 1.3;
    for (const u of [0.2, 0.36, 0.52, 0.68, 0.84]){
      const a = bz(u - 0.01), b = bz(u + 0.01);
      const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      const nx = -dy / dl, ny = dx / dl, w = (17 - 8.5 * u) * 0.42;
      const c = bz(u);
      ctx.beginPath();
      ctx.moveTo(c[0] - nx * w, c[1] - ny * w);
      ctx.quadraticCurveTo(c[0] + dx / dl * 2.2, c[1] + dy / dl * 2.2, c[0] + nx * w, c[1] + ny * w);
      ctx.stroke();
    }
    const tip = bz(1);
    ctx.fillStyle = C.coatD;
    ctx.beginPath(); ctx.ellipse(tip[0], tip[1], 2.6, 1.7, 0, 0, TAU); ctx.fill();
    ctx.restore();   // head

    ctx.restore();
  }

  window.ElephantRig = { draw, HEIGHT: 135, WIDTH: 84, colors: BASE };
})();
