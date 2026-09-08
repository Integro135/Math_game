/* ── ostrich.js — the OSTRICH rig, drawn from scratch on canvas ────────────
   A sibling of lion.js (same house style, same API; workshop:
   backgrounds/savanna_animals/animals.html?animal=ostrich). Shared helpers:
   rig-common.js (window.SavRig).

   THE LOOK: a big round FLUFFY body of dark feathers (rings of soft lobes,
   like the lion's mane) with a cream-tipped wing lobe on its side and a pale
   fluffy tail plume behind; a long thin pinkish-grey neck rising in a gentle
   S to a small head turned three-quarters toward the viewer — broad flat
   beak, two big dark eyes with long lashes and heavy brows, a tiny tuft on
   top; long thin legs with the hock bending BACKWARD and big two-toed feet.

   ALIVE: breathing body, blinking, neck sway + head tilt, feather ripple, a
   bouncy alternating-leg walk, and the HEAD-BURY (pose 0..1): the bird
   crouches and tilts forward, the neck arcs down in front and the head goes
   into the ground with a puff of dust, then comes back up.

   API — window.OstrichRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, tint }
       unit space: feet on y = 0, facing +x, ~136 units tall
     HEIGHT / WIDTH  units (top of head / half-width) for hit boxes & shadows
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, lg, shade, fluff, eye, blink } = window.SavRig;
  const BASE = {
    body0: '#2B1C18', body1: '#3E2A24', body2: '#544038',
    plume: '#F3E6D2', plumeD: '#DCC9AF',
    skin: '#DDAE95', skinD: '#BE8B74', skinL: '#EDC7B2',
    beak: '#E2B27C', beakD: '#C48E56', line: '#2A1810',
    eyeW: '#FFF4DC', iris: '#4A2A18', pupil: '#150B06', nail: '#4A3A32',
    dust: '201,160,106',
  };
  const tinted = f => {
    if (!f || f === 1) return BASE;
    const c = Object.assign({}, BASE);
    for (const k of ['body0', 'body1', 'body2', 'skin', 'skinD', 'skinL', 'beak', 'beakD']) c[k] = shade(BASE[k], f);
    return c;
  };
  const smooth = k => k * k * (3 - 2 * k);
  const lerp = (a, b, k) => a + (b - a) * k;

  // ── a bird leg: drumstick down-and-back to the hock, shank down-and-forward
  // to the ankle, then a level two-toed foot. Round-capped strokes → smooth
  // joints; `lift` (0..1) droops the toes when the foot is off the ground.
  function birdLeg(g, hx, hy, a1, a2, lift, col, nail){
    const upLen = 26, loLen = 30;
    g.save();
    g.translate(hx, hy); g.rotate(a1);
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = 8.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, upLen); g.stroke();     // drumstick
    g.translate(0, upLen); g.rotate(a2);
    g.lineWidth = 5.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, loLen); g.stroke();     // shank
    g.fillStyle = col;
    g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); g.fill();                                     // hock knob
    g.translate(0, loLen); g.rotate(-(a1 + a2) + lift * 0.6);                              // foot stays level
    g.lineWidth = 4.2; g.beginPath(); g.moveTo(-1, 1.2); g.lineTo(6.8, 3.4); g.stroke();   // short toe
    g.lineWidth = 5.2; g.beginPath(); g.moveTo(0, 0.4); g.lineTo(12.6, 2.2); g.stroke();   // long toe
    g.fillStyle = nail;
    g.beginPath(); g.ellipse(13.6, 2.4, 2.3, 1.7, 0.12, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(7.8, 3.7, 1.8, 1.4, 0.3, 0, TAU); g.fill();
    g.restore();
  }

  // ── the head, head-local: centre (0,0), beak toward +x, face turned
  // three-quarters toward the viewer so both eyes show
  function drawHead(g, C, t, ph){
    g.fillStyle = lg(g, 0, -8, 0, 8, [[0, C.skinL], [1, C.skin]]);
    g.beginPath(); g.ellipse(0, 0, 9.8, 8.8, 0, 0, TAU); g.fill();
    // broad flat beak: upper + lower, a mouth line, a nostril
    g.fillStyle = C.beak;
    g.beginPath();
    g.moveTo(5.5, -3.2); g.quadraticCurveTo(14, -4.2, 19.6, -0.4);
    g.quadraticCurveTo(20.4, 1.2, 18.4, 1.8); g.lineTo(5.5, 1.8);
    g.closePath(); g.fill();
    g.fillStyle = C.beakD;
    g.beginPath();
    g.moveTo(5.5, 1.6); g.lineTo(18.2, 1.6); g.quadraticCurveTo(18.6, 3.8, 15.6, 4.6);
    g.quadraticCurveTo(10, 5.4, 5.5, 4.4);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(42,24,16,.5)'; g.lineWidth = 0.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(7, 1.7); g.lineTo(17.8, 1.7); g.stroke();
    g.fillStyle = 'rgba(42,24,16,.4)';
    g.beginPath(); g.ellipse(13.8, -1.7, 1, 0.6, 0.2, 0, TAU); g.fill();
    // two big dark eyes, long lashes, heavy brows
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.5));
    const gaze = Math.sin(t * 0.35 + ph) * 0.35;
    const ec = { white: C.eyeW, iris: C.iris, pupil: C.pupil, line: C.line };
    const eyes = [[-3.8, -1.2, 2.9, 3.3], [3.6, -1.7, 3.3, 3.8]];
    for (const [ex, ey, rx, ry] of eyes) eye(g, ex, ey, rx, ry, eyeH, gaze, ec);
    g.strokeStyle = C.line; g.lineWidth = 0.9;
    g.beginPath();
    eyes.forEach(([ex, ey, rx, ry], i) => {
      for (const a of [-1.25, -0.9, -0.55]){
        const aa = i === 0 ? -Math.PI - a : a;          // far eye lashes sweep up-left, near eye up-right
        const x0 = ex + Math.cos(aa) * rx, y0 = ey + Math.sin(aa) * ry * eyeH;
        g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(aa) * 2.4, y0 + Math.sin(aa) * 2.4);
      }
    });
    g.stroke();
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(-7.4, -5.8); g.quadraticCurveTo(-4, -7.8, -0.8, -6.2);
    g.moveTo(0.4, -7); g.quadraticCurveTo(4, -9.2, 7.6, -6.8);
    g.stroke();
    // a tiny tuft of feathers on top
    g.fillStyle = C.body1;
    for (const [x, y, r] of [[-3.4, -9, 2.3], [0, -10.4, 2.8], [3.4, -9, 2.2]]){
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = tinted(L.tint);
    const ph = L.ph || 0, wt = L.wt || 0, moving = !!L.moving;
    const k = L.pose ? Math.sin(Math.min(1, Math.max(0, L.pose)) * Math.PI) : 0;   // bury 0 → 1 → 0
    const ks = smooth(k);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    // walk: the two legs alternate; the body bounces once per step
    const wamp = moving ? 0.42 : 0;
    const A = i => wamp * Math.sin(wt + i * Math.PI);
    const Bf = i => moving ? 0.55 * Math.max(0, -Math.cos(wt + i * Math.PI)) : 0;
    const bob = moving ? -Math.abs(Math.sin(wt)) * 2.4 : 0;
    // bury crouch: the legs fold and the whole bird drops so the feet stay planted
    const crouch = 10 * ks;
    ctx.translate(0, crouch);
    const hip = [-4, -58];
    const a1 = 0.35 + 0.5 * ks, a2 = -0.6 - 0.7 * ks;

    // ── legs (both emerge from under the feathers; far one darker)
    birdLeg(ctx, hip[0] - 5, hip[1], a1 + A(1), a2 - Bf(1), Bf(1), C.skinD, C.nail);
    birdLeg(ctx, hip[0] + 1, hip[1], a1 + A(0), a2 - Bf(0), Bf(0), C.skin, C.nail);

    // ── body group: bounces, breathes, tilts forward around the hips for the bury
    const br = 1 + 0.012 * Math.sin(t * 1.4 + ph);
    const tilt = 0.3 * ks;
    const bodyPoint = (px, py) => {                    // body-frame → current frame
      const bx = -6 + (px + 6) * br, by = -70 + (py + 70) * br;
      const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = bx - hip[0], dy = by - hip[1];
      return [hip[0] + dx * cs - dy * sn, hip[1] + dx * sn + dy * cs + bob];
    };
    ctx.save();
    ctx.translate(0, bob);
    ctx.translate(hip[0], hip[1]); ctx.rotate(tilt); ctx.translate(-hip[0], -hip[1]);
    ctx.translate(-6, -70); ctx.scale(br, br); ctx.translate(6, 70);
    fluff(ctx, -30, -84, 11, 10, 8, C.plume, t, ph + 21, 0.8, 0);       // tail plume (behind)
    fluff(ctx, -6, -70, 25, 23, 12, C.body0, t, ph + 1, 0.6, 0.05);     // body: dark rim …
    fluff(ctx, -5, -69, 21, 19.5, 11, C.body1, t, ph + 5, 0.45, 0.03);
    fluff(ctx, -4, -68, 16, 15, 10, C.body2, t, ph + 9, 0.3, 0);        // … to a lighter core
    fluff(ctx, -14, -60, 12, 8, 7, C.plume, t, ph + 31, 0.5, 0.1);      // cream wing tips …
    fluff(ctx, -7, -64, 14, 9, 8, C.body1, t, ph + 35, 0.4, 0);         // … under the wing lobe
    ctx.restore();

    // ── neck + head (clipped at the ground so the buried head disappears)
    const root = bodyPoint(6, -80);
    const sway = Math.sin(t * 0.7 + ph) * 1.6;
    const P = (u, d) => [lerp(u[0], d[0], ks), lerp(u[1], d[1], ks)];
    const c1 = P([10, -98], [26, -86]);
    const c2 = P([28, -112], [38, -34]);
    const hd = P([22 + sway, -124 + bob * 0.6], [24, 6]);
    const bz = u => { const m = 1 - u; return [
      m*m*m*root[0] + 3*m*m*u*c1[0] + 3*m*u*u*c2[0] + u*u*u*hd[0],
      m*m*m*root[1] + 3*m*m*u*c1[1] + 3*m*u*u*c2[1] + u*u*u*hd[1]]; };
    ctx.save();
    ctx.beginPath(); ctx.rect(-200, -400, 400, 399 - crouch); ctx.clip();
    ctx.strokeStyle = C.skin; ctx.lineCap = 'round';
    let pp = bz(0);
    for (let i = 1; i <= 12; i++){
      const p = bz(i / 12);
      ctx.lineWidth = 9 - 2.8 * (i / 12);
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      pp = p;
    }
    ctx.strokeStyle = 'rgba(255,236,222,.35)'; ctx.lineWidth = 1.8;   // a soft highlight up the front
    ctx.beginPath();
    for (let i = 1; i <= 12; i++){ const p = bz(i / 12); i === 1 ? ctx.moveTo(p[0] + 1.8, p[1]) : ctx.lineTo(p[0] + 1.8, p[1]); }
    ctx.stroke();
    ctx.save();
    ctx.translate(hd[0], hd[1]);
    ctx.rotate(lerp(-0.08 + Math.sin(t * 0.9 + ph) * 0.05, 1.45, ks));
    ctx.translate(3, -6.4);
    drawHead(ctx, C, t, ph);
    ctx.restore();
    ctx.restore();   // clip
    // a feather collar where the neck leaves the body
    fluff(ctx, root[0], root[1] + 3, 9, 6.5, 7, C.body1, t, ph + 41, 0.3, 0);
    // dust where the head meets the ground
    if (k > 0.05 && hd[1] > -crouch - 10){
      const gy = -crouch - 1;
      for (let i = 0; i < 5; i++){
        const px = hd[0] - 6 + i * 3.4 + Math.sin(t * 5 + i) * 1.2;
        const r = 3 + ((i * 7) % 3) + Math.sin(t * 7 + i * 2) * 0.6;
        ctx.fillStyle = 'rgba(' + C.dust + ',' + (0.45 * k).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, gy - r * 0.6 - k * 2, r, 0, TAU); ctx.fill();
      }
    }

    ctx.restore();
  }

  window.OstrichRig = { draw, HEIGHT: 136, WIDTH: 42, colors: BASE };
})();
