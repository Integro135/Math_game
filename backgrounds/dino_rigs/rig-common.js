/* ── rig-common.js — shared helpers for the from-scratch DINOSAUR rigs ──────
   Loaded BEFORE the dinosaur files (trex.js, bronto.js, stego.js, trike.js,
   ptero.js, baby.js). Every rig draws in the same UNIT SPACE: feet on y = 0,
   facing +x; the caller anchors it with L.x/L.y, scales by L.s and mirrors
   with L.dir. trex.js is the reference implementation of the API:

     window.<Name>Rig = { draw(ctx, L, t), HEIGHT, WIDTH, PALS, DEFAULT, FLYER? }
       L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       pose 0..1 = progress of the dinosaur's signature action (T-Rex roar,
                   bronto graze, stego wag, trike charge, ptero squawk,
                   the baby's hatch …)
       pal        palette name (see PALETTES below; each rig lists its PALS
                  and a DEFAULT)
       tint       optional brightness factor for per-individual variety

   THE HOUSE STYLE: soft rounded shapes, NO outlines, gentle top-to-bottom
   gradients (light back → deeper underside), a cream belly panel with soft
   horizontal belly stripes, a few darker soft spots along the back, a warm
   sunset rim light along the top edge, everything in TRUE PROFILE — one big
   glossy eye under a heavy dark brow (only the baby in its egg faces the
   viewer), blushing cheeks, chunky round-toed feet with little cream claws,
   2-segment round-jointed legs in a diagonal gait, a stride bob, breathing,
   blinking, a swaying tail.

   window.DinoRig = { TAU, psr, clamp01, lerp, lg, rg, shade, alpha,
                      PALETTES, palette, blob, bez, bezT, taper, leg, foot,
                      eye, blink, brow, spots, stripes, heart, rings, dust } */
(function(){
  const TAU = Math.PI * 2;
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;   // stable pseudo-random 0..1
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lg = (g, x1, y1, x2, y2, st) => {
    const gr = g.createLinearGradient(x1, y1, x2, y2);
    st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
  };
  const rg = (g, x, y, r0, r1, st) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
  };
  function rgb(col){
    if (col[0] === '#'){ const n = parseInt(col.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
    const m = col.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  // darken / lighten a colour by a factor (per-individual tints)
  function shade(col, f){
    if (!f || f === 1) return col;
    const c = rgb(col).map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  const alpha = (col, a) => { const c = rgb(col); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  // ── PALETTES — one closed set of keys so every rig can wear every coat.
  //    body/bodyL/bodyD  the hide          belly/bellyD  the cream panel + stripes
  //    spot              back spots        line          brows, lids, nostrils
  //    iris              eye colour        accent*       plates / crest / frill knobs
  const PALETTES = {
    green:  { body: '#8DCB74', bodyL: '#BEE6A2', bodyD: '#5A9B4A', belly: '#F6EDC4', bellyD: '#D8C98F', spot: '#4B8A3F', line: '#2F4A26', iris: '#E9A43A', accent: '#F09A5A', accentL: '#FFC58E', accentD: '#C66A38' },
    teal:   { body: '#5FC9AA', bodyL: '#9CE5CD', bodyD: '#2E9377', belly: '#EEFAF0', bellyD: '#C6E5CE', spot: '#267A66', line: '#1C4640', iris: '#F2B84B', accent: '#F7C455', accentL: '#FFE49E', accentD: '#CE942B' },
    pink:   { body: '#F3A8C8', bodyL: '#FCCEE2', bodyD: '#CF6F9F', belly: '#FFF3E8', bellyD: '#F0D4C6', spot: '#C25E91', line: '#5E2646', iris: '#57B7B0', accent: '#72D2C6', accentL: '#AEEFE6', accentD: '#3F9E95' },
    sun:    { body: '#F7B852', bodyL: '#FFDB93', bodyD: '#D2842B', belly: '#FFF4CF', bellyD: '#F0DAA2', spot: '#C6702A', line: '#5A3410', iris: '#4FA3D8', accent: '#E86A5B', accentL: '#FF9F8F', accentD: '#B8443B' },
    coral:  { body: '#F5A688', bodyL: '#FFCCB6', bodyD: '#D57150', belly: '#FFEDE0', bellyD: '#F2D1BE', spot: '#BE5A3E', line: '#5A2A1A', iris: '#4EB0A6', accent: '#E8607A', accentL: '#FF9DB2', accentD: '#B93E58' },
    violet: { body: '#AD92E4', bodyL: '#D3C0F6', bodyD: '#7C5EC0', belly: '#F4EEFF', bellyD: '#DDD1F3', spot: '#6446A6', line: '#35255C', iris: '#F0B650', accent: '#F27AB8', accentL: '#FFB6DB', accentD: '#C1508E' },
    sky:    { body: '#85C4ED', bodyL: '#BCE0F9', bodyD: '#4B90CC', belly: '#ECF7FF', bellyD: '#D0E4F6', spot: '#3B78AE', line: '#223E5E', iris: '#F0A648', accent: '#FFD35F', accentL: '#FFEAA8', accentD: '#D2A030' },
  };
  const COMMON = {
    claw: '#F7F0DC', eyeW: '#FFF9EC', pupil: '#1A130E', mouth: '#5A1F2A', tongue: '#EA7F88',
    tooth: '#FFFDF6', blush: 'rgba(255,110,125,.30)', beak: '#F3C26E', beakD: '#D99A3E',
    rim: 'rgba(255,190,120,.55)',
  };
  const TINTED = ['body', 'bodyL', 'bodyD', 'belly', 'bellyD', 'spot'];
  function palette(name, tint, fallback){
    const base = PALETTES[name] || PALETTES[fallback] || PALETTES.green;
    const c = Object.assign({}, COMMON, base);
    if (tint && tint !== 1) for (const k of TINTED) c[k] = shade(c[k], tint);
    return c;
  }

  // ── a smooth closed blob through control points (Catmull-Rom → Bezier).
  //    k = tension (6 = classic Catmull-Rom; bigger = tighter to the points)
  function blob(g, pts, k){
    k = k || 6; const n = pts.length;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++){
      const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / k, p1[1] + (p2[1] - p0[1]) / k,
                      p2[0] - (p3[0] - p1[0]) / k, p2[1] - (p3[1] - p1[1]) / k, p2[0], p2[1]);
    }
    g.closePath();
  }

  // ── cubic Bezier point / tangent
  const bez = (P, u) => { const m = 1 - u; return [
    m*m*m*P[0][0] + 3*m*m*u*P[1][0] + 3*m*u*u*P[2][0] + u*u*u*P[3][0],
    m*m*m*P[0][1] + 3*m*m*u*P[1][1] + 3*m*u*u*P[2][1] + u*u*u*P[3][1]]; };
  const bezT = (P, u) => { const m = 1 - u; return [
    3*m*m*(P[1][0]-P[0][0]) + 6*m*u*(P[2][0]-P[1][0]) + 3*u*u*(P[3][0]-P[2][0]),
    3*m*m*(P[1][1]-P[0][1]) + 6*m*u*(P[2][1]-P[1][1]) + 3*u*u*(P[3][1]-P[2][1])]; };

  // ── a tapered tube along a cubic Bezier with rounded ends (tails, necks,
  //    horns, crests). Fills with `fill` right away (gradients welcome).
  //    opts: { steps = 22, ease(u) → 0..1 width profile }
  function taper(g, P, w0, w1, fill, opts){
    opts = opts || {};
    const steps = opts.steps || 22, Lp = [], Rp = [];
    for (let i = 0; i <= steps; i++){
      const u = i / steps, p = bez(P, u), d = bezT(P, u);
      const l = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l;
      const w = (w0 + (w1 - w0) * (opts.ease ? opts.ease(u) : u)) / 2;
      Lp.push([p[0] + nx * w, p[1] + ny * w]); Rp.push([p[0] - nx * w, p[1] - ny * w]);
    }
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i <= steps; i++) g.lineTo(Lp[i][0], Lp[i][1]);
    for (let i = steps; i >= 0; i--) g.lineTo(Rp[i][0], Rp[i][1]);
    g.closePath(); g.fill();
    const p0 = bez(P, 0), p1 = bez(P, 1);
    g.beginPath(); g.arc(p0[0], p0[1], w0 / 2, 0, TAU); g.fill();
    g.beginPath(); g.arc(p1[0], p1[1], w1 / 2, 0, TAU); g.fill();
  }

  // ── a chunky dinosaur foot, drawn in ankle space (ankle at the origin,
  //    ground below): a flat pad, round toes and little cream claws (or
  //    short rounded nails for the sauropods). w = shin width.
  //    opts: { toes = 3, pad = [rx, ry], claw = '#colour', nails }
  function foot(g, w, col, opts){
    opts = opts || {};
    const [prx, pry] = opts.pad || [w * 0.80, w * 0.34];
    const toes = opts.toes || 3, claw = opts.claw || COMMON.claw;
    const tr = Math.min(pry * 0.95, prx * 0.40);
    g.fillStyle = col;
    g.beginPath(); g.ellipse(prx * 0.28, pry * 0.55, prx, pry, 0, 0, TAU); g.fill();
    for (let k = 0; k < toes; k++){
      const f = toes === 1 ? 0.5 : k / (toes - 1);
      const tx = prx * 0.28 - prx * 0.62 + f * prx * 1.34, ty = pry * 0.62 + tr * 0.35;
      g.fillStyle = col;
      g.beginPath(); g.arc(tx, ty, tr, 0, TAU); g.fill();
      g.fillStyle = claw;
      if (opts.nails){
        g.beginPath(); g.ellipse(tx + tr * 0.2, ty + tr * 0.72, tr * 0.58, tr * 0.40, 0, 0, TAU); g.fill();
      } else {
        g.beginPath();
        g.moveTo(tx - tr * 0.15, ty + tr * 0.98);
        g.quadraticCurveTo(tx + tr * 0.55, ty + tr * 1.55, tx + tr * 1.35, ty + tr * 1.05);
        g.quadraticCurveTo(tx + tr * 1.05, ty + tr * 0.45, tx + tr * 0.72, ty + tr * 0.22);
        g.closePath(); g.fill();
      }
    }
  }

  // ── a two-segment leg drawn with round-capped strokes (smooth hip, knee
  //    and ankle joints for free). Hip at (hx, hy); a1 swings the thigh
  //    (negative = forward, toward +x), a2 bends the shin (positive = back).
  //    The foot is un-rotated at the ankle so it always sits flat.
  function leg(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col, opts){
    g.save();
    g.translate(hx, hy); g.rotate(a1);
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = w1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, upLen); g.stroke();
    g.translate(0, upLen); g.rotate(a2);
    g.lineWidth = w2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, loLen); g.stroke();
    g.translate(0, loLen); g.rotate(-(a1 + a2));
    foot(g, w2, col, opts);
    g.restore();
  }

  // ── a big glossy cartoon eye: sclera, soft lid shadow, iris with a radial
  //    depth gradient, pupil, two highlights and an upper-lid line.
  //    eyeH squashes it for blinks; gaze −1..1 shifts the iris.
  function eye(g, x, y, rx, ry, eyeH, gaze, C, opts){
    opts = opts || {};
    g.save();
    g.translate(x, y); g.scale(1, Math.max(0.06, eyeH));
    g.fillStyle = C.eyeW;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
    g.fillStyle = alpha(C.line, 0.13);
    g.beginPath(); g.ellipse(0, -ry * 0.78, rx * 1.1, ry * 0.42, 0, 0, TAU); g.fill();
    const ir = rx * (opts.iris || 0.70), gx = gaze * rx * 0.26;
    g.fillStyle = rg(g, gx - ir * 0.22, 0.3 - ir * 0.28, ir * 0.08, ir, [[0, shade(C.iris, 1.28)], [0.72, C.iris], [1, shade(C.iris, 0.62)]]);
    g.beginPath(); g.arc(gx, 0.3, ir, 0, TAU); g.fill();
    g.fillStyle = C.pupil;
    g.beginPath(); g.arc(gx + 0.1, 0.5, ir * 0.54, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.93)';
    g.beginPath(); g.ellipse(gx - ir * 0.36, -ir * 0.42, ir * 0.30, ir * 0.23, -0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath(); g.arc(gx + ir * 0.36, ir * 0.40, ir * 0.13, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = C.line; g.lineWidth = opts.lid || 1.4; g.lineCap = 'round';
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.restore();
  }
  // blink amount 0..1 — a fast snap on a slow rhythm (k sets the interval)
  const blink = (t, ph, k) => Math.pow(Math.max(0, Math.sin(t * (k || 0.45) + (ph || 0) * 2.3)), 200);

  // ── a heavy brow: a round-capped arc from (x0,y0) through the control
  //    point (cx,cy) to (x1,y1)
  function brow(g, C, x0, y0, cx, cy, x1, y1, w){
    g.strokeStyle = C.line; g.lineWidth = w || 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  }
  // soft spots: [[x, y, rx, ry, rot?], …]
  function spots(g, col, list){
    g.fillStyle = col;
    for (const [x, y, rx, ry, rot] of list){ g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
  }
  // belly stripes: gentle bulging arcs [[x0, y, x1, bulge], …]
  function stripes(g, col, w, list){
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    for (const [x0, y, x1, b] of list){ g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y + b, x1, y); }
    g.stroke();
  }
  // ── a warm rim light hugging the TOP edge of a silhouette: clip to the
  //    shape (and to everything above yCut), then stroke the shape itself so
  //    a band of width w lies just inside its upper edge.
  function rim(g, pathFn, yCut, col, w){
    g.save();
    pathFn(); g.clip();
    g.beginPath(); g.rect(-2000, -2000, 4000, 2000 + yCut); g.clip();
    pathFn(); g.strokeStyle = col; g.lineWidth = (w || 2) * 2; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  function heart(g, x, y, r, col){
    g.fillStyle = col; g.beginPath();
    g.moveTo(x, y + r);
    g.bezierCurveTo(x - r * 1.7, y - r * 0.1, x - r * 0.95, y - r * 1.35, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.95, y - r * 1.35, x + r * 1.7, y - r * 0.1, x, y + r);
    g.fill();
  }
  // sound rings fanning out toward +x from (x, y); k 0..1 = progress
  function rings(g, x, y, k, col, spread){
    if (k <= 0 || k >= 1) return;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++){
      const kk = clamp01(k * 1.3 - i * 0.15); if (kk <= 0) continue;
      const r = 10 + 34 * kk;
      g.strokeStyle = alpha(col, (1 - kk) * 0.55); g.lineWidth = 2.6 - kk * 1.4;
      g.beginPath(); g.arc(x, y, r, -(spread || 0.55), spread || 0.55); g.stroke();
    }
  }
  // a dust puff cloud rising from (x, y); k 0..1 = progress, drift ±x
  function dust(g, x, y, k, col, drift){
    if (k <= 0 || k >= 1) return;
    for (let i = 0; i < 5; i++){
      const a = psr(i * 7 + 3), r = 4 + 5 * a + 8 * k;
      const px = x + (drift || 1) * (6 + 18 * a) * k + (a - 0.5) * 10, py = y - (6 + 14 * a) * k - r * 0.4;
      g.fillStyle = alpha(col, (1 - k) * (0.28 + 0.2 * a));
      g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    }
  }

  window.DinoRig = { TAU, psr, clamp01, lerp, lg, rg, shade, alpha, PALETTES, palette,
                     blob, bez, bezT, taper, leg, foot, eye, blink, brow, spots, stripes, rim, heart, rings, dust };
})();
