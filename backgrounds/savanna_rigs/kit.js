/* ── kit.js — shared helpers for the from-scratch SAVANNA rigs (v2, 2026-11) ──
   Loaded BEFORE the animal files (cats.js, zebra.js, giraffe.js, elephant.js,
   ostrich.js). The old rigs live on untouched in ../savanna_animals/ (only the
   retired savanna.bg.js uses them); these are a full redraw for savanna2.bg.js.

   Every rig draws in the same UNIT SPACE: feet on y = 0, facing +x; the caller
   anchors it with L.x / L.y, scales by L.s and mirrors with L.dir.

     window.<Name>Rig = { draw(ctx, L, t), HEIGHT, WIDTH, STRIDE, RUN_STRIDE?, ACT_SECONDS? }
       L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, bowtie, ribbon }
       wt    walk phase in radians — one full step cycle per 2π. To keep the
             feet PLANTED the caller advances it with the distance covered:
               wt += TAU * dx / (Rig.STRIDE * L.s)      (RUN_STRIDE when L.run)
       go    0..1 how much it is walking (eases the legs in and out of the
             gait; falls back to moving ? 1 : 0)
       pose  0..1 progress of the signature action (roar, yawn, trumpet …)
       tint  brightness factor for per-individual variety
       lit   [r, g, b] multipliers — the hour's light (night blue, sunset amber)

   THE HOUSE STYLE (the dinosaur rigs' — Eran's rules): soft rounded shapes, NO
   outlines, gentle top-to-bottom gradients, a cream belly, a warm rim light on
   the top edge, and everything in TRUE PROFILE — ONE big glossy eye under a
   brow, never two. An open mouth is a real GAP: only the throat at the back is
   dark, the background shows between the jaws.

   THE LEGS are the big change from the old rigs: three bones (shoulder → elbow
   → wrist → paw, hip → knee → hock → toe) drawn as one tapered filled limb and
   placed by IK on a foot that is planted for the stance part of the cycle and
   lifted in an arc for the swing — see step() and leg().

   window.SavKit = { TAU, psr, clamp01, lerp, smooth, frac, lg, rg, shade, alpha,
                     palette, blob, bez, bezT, taper, limbPath, limb, step, leg,
                     xf, eye, blink, brow, rim, scallop, heart, rings, dust,
                     bowtie, ribbon } */
(function(){
  const TAU = Math.PI * 2;
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;   // stable pseudo-random 0..1
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const frac = v => v - Math.floor(v);
  const lg = (g, x1, y1, x2, y2, st) => {
    const gr = g.createLinearGradient(x1, y1, x2, y2);
    for (let i = 0; i < st.length; i++) gr.addColorStop(st[i][0], st[i][1]); return gr;
  };
  const rg = (g, x, y, r0, r1, st) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    for (let i = 0; i < st.length; i++) gr.addColorStop(st[i][0], st[i][1]); return gr;
  };
  function rgb(col){
    if (col[0] === '#'){ const n = parseInt(col.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
    const m = col.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const cl = v => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  function shade(col, f){
    if (!f || f === 1) return col;
    const c = rgb(col); return 'rgb(' + cl(c[0] * f) + ',' + cl(c[1] * f) + ',' + cl(c[2] * f) + ')';
  }
  const alpha = (col, a) => { const c = rgb(col); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  // ── a rig's colours for one individual at one hour. BASE = { key: '#hex' };
  //    COAT lists the keys the per-individual tint touches; lit = [r, g, b]
  //    multiplies everything. Cached on BASE (the scene quantises `lit`).
  function palette(BASE, COAT, tint, lit){
    tint = tint || 1;
    const key = tint.toFixed(2) + (lit ? '|' + lit[0].toFixed(2) + ',' + lit[1].toFixed(2) + ',' + lit[2].toFixed(2) : '');
    let cache = BASE._cache;
    if (!cache){ cache = new Map(); Object.defineProperty(BASE, '_cache', { value: cache }); }
    let C = cache.get(key);
    if (C) return C;
    if (cache.size > 48) cache.clear();
    C = {};
    for (const k in BASE){
      const c = rgb(BASE[k]), f = COAT.indexOf(k) >= 0 ? tint : 1;
      C[k] = 'rgb(' + cl(c[0] * f * (lit ? lit[0] : 1)) + ',' + cl(c[1] * f * (lit ? lit[1] : 1)) + ',' + cl(c[2] * f * (lit ? lit[2] : 1)) + ')';
    }
    C.rim = 'rgba(' + cl(255 * (lit ? lit[0] : 1)) + ',' + cl(214 * (lit ? lit[1] : 1)) + ',' + cl(150 * (lit ? lit[2] : 1)) + ',.5)';
    C.blush = 'rgba(255,110,125,.26)';
    cache.set(key, C);
    return C;
  }

  // ── a smooth closed blob through control points (Catmull-Rom → Bezier).
  //    k = tension (6 = classic; bigger = tighter to the points)
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
  const bez = (P, u) => { const m = 1 - u; return [
    m*m*m*P[0][0] + 3*m*m*u*P[1][0] + 3*m*u*u*P[2][0] + u*u*u*P[3][0],
    m*m*m*P[0][1] + 3*m*m*u*P[1][1] + 3*m*u*u*P[2][1] + u*u*u*P[3][1]]; };
  const bezT = (P, u) => { const m = 1 - u; return [
    3*m*m*(P[1][0]-P[0][0]) + 6*m*u*(P[2][0]-P[1][0]) + 3*u*u*(P[3][0]-P[2][0]),
    3*m*m*(P[1][1]-P[0][1]) + 6*m*u*(P[2][1]-P[1][1]) + 3*u*u*(P[3][1]-P[2][1])]; };

  // ── a tapered tube along a cubic Bezier with round ends (tails, necks,
  //    trunks). opts: { steps = 18, ease(u) → 0..1 width profile, path: true
  //    = only build the path (for clipping), no fill }
  function taper(g, P, w0, w1, fill, opts){
    opts = opts || {};
    const steps = opts.steps || 18;
    g.beginPath();
    for (let pass = 0; pass < 2; pass++){
      for (let i = 0; i <= steps; i++){
        const u = pass ? 1 - i / steps : i / steps, p = bez(P, u), d = bezT(P, u);
        const l = Math.hypot(d[0], d[1]) || 1, sg = pass ? -1 : 1;
        const w = (w0 + (w1 - w0) * (opts.ease ? opts.ease(u) : u)) / 2 * sg;
        const x = p[0] + d[1] / l * w, y = p[1] - d[0] / l * w;
        if (!pass && !i) g.moveTo(x, y); else g.lineTo(x, y);
      }
    }
    g.closePath();
    const a = bez(P, 0), b = bez(P, 1);
    g.moveTo(a[0] + w0 / 2, a[1]); g.arc(a[0], a[1], w0 / 2, 0, TAU);
    g.moveTo(b[0] + w1 / 2, b[1]); g.arc(b[0], b[1], w1 / 2, 0, TAU);
    if (!opts.path){ g.fillStyle = fill; g.fill(); }
  }

  // ── a limb through a chain of joints: tapered segments + a round joint at
  //    every point, as ONE path (all sub-paths wind the same way, so the
  //    overlaps never punch holes). ws = the width at each joint.
  function limbPath(g, pts, ws){
    g.beginPath();
    for (let i = 0; i < pts.length - 1; i++){
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const ra = ws[i] / 2, rb = ws[i + 1] / 2;
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l;
      g.moveTo(ax + nx * ra, ay + ny * ra); g.lineTo(bx + nx * rb, by + ny * rb);
      g.lineTo(bx - nx * rb, by - ny * rb); g.lineTo(ax - nx * ra, ay - ny * ra); g.closePath();
    }
    for (let i = 0; i < pts.length; i++){
      g.moveTo(pts[i][0] + ws[i] / 2, pts[i][1]); g.arc(pts[i][0], pts[i][1], ws[i] / 2, 0, TAU);
    }
  }
  function limb(g, pts, ws, fill){ limbPath(g, pts, ws); g.fillStyle = fill; g.fill(); }

  // ── one leg's place in the step cycle. p = its phase 0..1, duty = the share
  //    of the cycle it spends on the ground. Returns a SHARED scratch object:
  //      x     −duty/2 … +duty/2, in strides (+ = ahead of the rest spot):
  //            planted and sliding back under the body, then swung forward
  //      lift  0..1 height of the swing arc        sw  0..1 swing progress
  const ST = { x: 0, lift: 0, sw: 0 };
  function step(p, duty){
    p = frac(p);
    if (p < duty){ ST.x = (0.5 - p / duty) * duty; ST.lift = 0; ST.sw = 0; return ST; }
    const u = (p - duty) / (1 - duty);
    ST.x = (-0.5 + (1 - Math.cos(Math.PI * u)) / 2) * duty;
    ST.lift = Math.sin(Math.PI * u); ST.sw = u;
    return ST;
  }

  // ── a three-bone leg, placed by IK. Root (rx, ry) = shoulder / hip; (fx, fy)
  //    = where the foot touches down. l1, l2, l3 = bone lengths; ws = widths
  //    at root, upper joint, ankle, foot. bend +1 = the upper joint points
  //    forward (a knee), −1 = backward (an elbow). fold = the last bone's
  //    lean in radians (0 = upright; + = the foot trails behind the ankle).
  //    Draws the limb and returns the SHARED joint chain [root, joint, ankle,
  //    foot] — valid until the next call (limbPath(g, chain, ws) re-traces it
  //    for a clip: stripes, spots, socks).
  const CH = [[0, 0], [0, 0], [0, 0], [0, 0]];
  function leg(g, rx, ry, fx, fy, l1, l2, l3, ws, bend, fold, fill){
    const sf = Math.sin(fold), cf = Math.cos(fold);
    let ax = fx + sf * l3, ay = fy - cf * l3;
    let dx = ax - rx, dy = ay - ry, d = Math.hypot(dx, dy) || 1e-6;
    const dmax = (l1 + l2) * 0.999, dmin = Math.abs(l1 - l2) + 0.5;
    if (d > dmax || d < dmin){
      const k = (d > dmax ? dmax : dmin) / d; dx *= k; dy *= k; d *= k;
      ax = rx + dx; ay = ry + dy; fx = ax - sf * l3; fy = ay + cf * l3;
    }
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const th = Math.atan2(dy, dx) - bend * a;
    CH[0][0] = rx; CH[0][1] = ry;
    CH[1][0] = rx + Math.cos(th) * l1; CH[1][1] = ry + Math.sin(th) * l1;
    CH[2][0] = ax; CH[2][1] = ay; CH[3][0] = fx; CH[3][1] = fy;
    if (fill) limb(g, CH, ws, fill);
    return CH;
  }

  // ── a point carried by a body that is shifted by (ox, oy) and pitched by
  //    `rot` about (cx, cy) — where a shoulder or hip really is, for leg().
  //    Returns a SHARED [x, y].
  const XF = [0, 0];
  function xf(px, py, cx, cy, rot, ox, oy){
    const c = Math.cos(rot), s = Math.sin(rot), x = px - cx, y = py - cy;
    XF[0] = cx + x * c - y * s + ox; XF[1] = cy + x * s + y * c + oy; return XF;
  }

  // ── a big glossy cartoon eye: white, lid shadow, iris, pupil, two
  //    highlights, an upper-lid line. eyeH squashes it for blinks; gaze −1..1
  //    shifts the iris. C needs eyeW, iris, pupil, line.
  function eye(g, x, y, rx, ry, eyeH, gaze, C, opts){
    opts = opts || {};
    g.save();
    g.translate(x, y); g.scale(1, Math.max(0.06, eyeH));
    g.fillStyle = C.eyeW;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
    g.fillStyle = alpha(C.line, 0.14);
    g.beginPath(); g.ellipse(0, -ry * 0.78, rx * 1.1, ry * 0.42, 0, 0, TAU); g.fill();
    const ir = rx * (opts.iris || 0.74), gx = gaze * rx * 0.24 + rx * 0.08;
    g.fillStyle = C.iris;
    g.beginPath(); g.arc(gx, 0.3, ir, 0, TAU); g.fill();
    g.fillStyle = C.pupil;
    g.beginPath(); g.arc(gx + 0.1, 0.5, ir * 0.62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.ellipse(gx - ir * 0.34, -ir * 0.42, ir * 0.32, ir * 0.25, -0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath(); g.arc(gx + ir * 0.38, ir * 0.42, ir * 0.14, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = C.line; g.lineWidth = opts.lid || 1.3; g.lineCap = 'round';
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.restore();
  }
  // blink amount 0..1 — a fast snap on a slow rhythm (k sets the interval)
  const blink = (t, ph, k) => Math.pow(Math.max(0, Math.sin(t * (k || 0.45) + (ph || 0) * 2.3)), 200);
  function brow(g, col, x0, y0, cx, cy, x1, y1, w){
    g.strokeStyle = col; g.lineWidth = w || 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  }
  // a warm rim light hugging the TOP edge of a silhouette (above yCut)
  function rim(g, pathFn, yCut, col, w){
    g.save();
    pathFn(); g.clip();
    g.beginPath(); g.rect(-2000, -2000, 4000, 2000 + yCut); g.clip();
    pathFn(); g.strokeStyle = col; g.lineWidth = (w || 2) * 2; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  // ── a fluffy scalloped ring (manes, tufts, plumes): n soft lobes around an
  //    ellipse, each bulging out by `amp` (a share of the radius); `ph` slides
  //    the lobes round, `rot` tilts the ellipse. Builds the path only.
  function scallop(g, cx, cy, rx, ry, n, amp, ph, rot){
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    const P = (a, k) => { const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; return [cx + x * c - y * s, cy + x * s + y * c]; };
    g.beginPath();
    for (let i = 0; i <= n; i++){
      const a = (i / n) * TAU + (ph || 0), p = P(a, 1);
      if (!i){ g.moveTo(p[0], p[1]); continue; }
      const q = P(a - TAU / n / 2, 1 + amp);
      g.quadraticCurveTo(q[0], q[1], p[0], p[1]);
    }
    g.closePath();
  }
  function heart(g, x, y, r, col){
    g.fillStyle = col; g.beginPath();
    g.moveTo(x, y + r);
    g.bezierCurveTo(x - r * 1.7, y - r * 0.1, x - r * 0.95, y - r * 1.35, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.95, y - r * 1.35, x + r * 1.7, y - r * 0.1, x, y + r);
    g.fill();
  }
  // sound rings fanning out toward +x from (x, y); k 0..1 = progress
  function rings(g, x, y, k, col, spread, size){
    if (k <= 0 || k >= 1) return;
    g.lineCap = 'round'; size = size || 1;
    for (let i = 0; i < 3; i++){
      const kk = clamp01(k * 1.3 - i * 0.15); if (kk <= 0) continue;
      g.strokeStyle = alpha(col, (1 - kk) * 0.6); g.lineWidth = (2.8 - kk * 1.4) * size;
      g.beginPath(); g.arc(x, y, (10 + 34 * kk) * size, -(spread || 0.55), spread || 0.55); g.stroke();
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
  // ── dress-up: a bow tie under the chin (boys) / a ribbon bow by the ear
  //    (girls). Centre (x, y), r = half-width.
  function bow(g, x, y, r, rot, c0, c1, knot){
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    for (const sx of [-1, 1]){
      g.fillStyle = sx < 0 ? c1 : c0;
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(sx * r * 0.5, -r * 0.95, sx * r * 1.15, -r * 0.8, sx * r, 0);
      g.bezierCurveTo(sx * r * 1.15, r * 0.8, sx * r * 0.5, r * 0.95, 0, 0);
      g.fill();
    }
    g.fillStyle = knot;
    g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.36, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.ellipse(-r * 0.08, -r * 0.12, r * 0.12, r * 0.1, 0, 0, TAU); g.fill();
    g.restore();
  }
  const bowtie = (g, x, y, r, rot) => bow(g, x, y, r, rot, '#E0453E', '#C42F33', '#A8242B');
  const ribbon = (g, x, y, r, rot) => bow(g, x, y, r, rot, '#FF8FC4', '#F06AAB', '#D94C93');

  window.SavKit = { TAU, psr, clamp01, lerp, smooth, frac, lg, rg, shade, alpha, palette, blob, bez, bezT,
                    taper, limbPath, limb, step, leg, xf, eye, blink, brow, rim, scallop, heart, rings, dust,
                    bowtie, ribbon };
})();
