/* ── rig-common.js — shared helpers for the from-scratch savanna animal rigs ──
   Loaded BEFORE the animal files (lion.js, cats.js, zebra.js, giraffe.js,
   elephant.js, ostrich.js). Every rig draws in the same UNIT SPACE: paws on
   y = 0, facing +x; the caller anchors it with L.x/L.y, scales by L.s and
   mirrors with L.dir. lion.js is the reference implementation of the API:

     window.<Name>Rig = { draw(ctx, L, t), HEIGHT, WIDTH, colors }
       L = { x, y, s, dir, ph, wt, moving, pose, tint }
       pose 0..1 = progress of the animal's signature action (lion roar,
                   elephant trumpet, ostrich head-bury, giraffe graze …)
       tint       optional brightness factor for per-individual variety

   THE HOUSE STYLE (see lion.js): soft rounded shapes, no outlines, no spikes,
   sunset palette with soft gradients, cream belly/muzzle, body in profile
   with the head turned three-quarters toward the viewer so BOTH big amber
   eyes show, heavy dark brows, round ears with a lighter inner ear, blinking
   eyes, 2-segment round-jointed legs in a diagonal gait, a stride bob,
   breathing, a swishing tail.

   window.SavRig = { TAU, psr, lg, rg, shade, fluff, leg, eye, blink } */
(function(){
  const TAU = Math.PI * 2;
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;   // stable pseudo-random 0..1
  const lg = (g, x1, y1, x2, y2, st) => {
    const gr = g.createLinearGradient(x1, y1, x2, y2);
    st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
  };
  const rg = (g, x, y, r0, r1, st) => {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr;
  };
  // darken / lighten a '#rrggbb' colour by a factor (per-individual tints)
  function shade(hex, f){
    if (!f || f === 1 || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    const ch = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return 'rgb(' + ch(n >> 16) + ',' + ch(n >> 8 & 255) + ',' + ch(n & 255) + ')';
  }

  // ── a fluffy ring: an ellipse plus a necklace of round lobes on its rim.
  // Lobes vary in size and spacing, ripple gently (sway), and (drape) hang
  // longer at the bottom. Used for manes, feather bodies, fluffy tails.
  function fluff(g, cx, cy, rx, ry, n, col, t, seed, sway, drape){
    g.fillStyle = col;
    g.beginPath(); g.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, TAU); g.fill();
    const spacing = TAU * rx / n;
    for (let i = 0; i < n; i++){
      let a = (i / n) * TAU + (psr(i + seed) - 0.5) * 0.22;
      a += sway * 0.03 * Math.sin(t * 1.4 + i * 1.7 + seed);
      const lr = spacing * (0.5 + psr(i * 3 + seed) * 0.24);
      const dr = 1 + (drape || 0) * Math.pow(Math.max(0, Math.sin(a)), 1.4);
      const rr = 1 + sway * 0.035 * Math.sin(t * 1.1 + i * 2.3 + seed);
      const px = cx + Math.cos(a) * (rx - lr * 0.55) * rr * dr;
      const py = cy + Math.sin(a) * (ry - lr * 0.55) * rr * dr;
      g.beginPath(); g.arc(px, py, lr, 0, TAU); g.fill();
    }
  }

  // ── a two-segment leg drawn with round-capped strokes (smooth hip, knee
  // and ankle joints for free). Hip at (hx, hy); a1 swings the upper segment,
  // a2 bends the lower one (radians, + = clockwise). Ends in a broad paw with
  // toe lines, or — opts.hoof = '#colour' — a rounded hoof.
  //   opts: { hoof, toes = 3, paw = [rx, ry] }
  function leg(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col, dark, opts){
    opts = opts || {};
    g.save();
    g.translate(hx, hy); g.rotate(a1);
    g.strokeStyle = col; g.lineCap = 'round';
    g.lineWidth = w1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, upLen); g.stroke();
    g.translate(0, upLen); g.rotate(a2);
    g.lineWidth = w2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, loLen); g.stroke();
    if (opts.hoof){
      const hw = w2 * 0.62;
      g.fillStyle = opts.hoof;
      g.beginPath();
      g.moveTo(-hw, loLen - 1);
      g.quadraticCurveTo(-hw - 0.6, loLen + 5, -hw * 0.8, loLen + 5.6);
      g.lineTo(hw * 0.8, loLen + 5.6);
      g.quadraticCurveTo(hw + 0.6, loLen + 5, hw, loLen - 1);
      g.closePath(); g.fill();
    } else {
      const [prx, pry] = opts.paw || [8.4, 4.4];
      g.fillStyle = col;
      g.beginPath(); g.ellipse(prx * 0.33, loLen + 1.4, prx, pry, 0, 0, TAU); g.fill();
      g.strokeStyle = dark; g.lineWidth = 1;
      g.beginPath();
      const toes = opts.toes || 3, step = 3.7 * (prx / 8.4);
      for (let k = 0; k < toes; k++){ const tx = -0.8 + k * step; g.moveTo(tx, loLen + 2.2); g.lineTo(tx, loLen + 5.2); }
      g.stroke();
    }
    g.restore();
  }

  // ── a big cartoon eye: sclera, iris, pupil, highlight and an upper-lid
  // line. eyeH squashes it for blinks; gazeX shifts the iris.
  //   cols: { white, iris, pupil, line }
  const EYE_DEFAULT = { white: '#FFF4DC', iris: '#E99B2C', pupil: '#1B0E06', line: '#3B1D0C' };
  function eye(g, x, y, rx, ry, eyeH, gazeX, cols){
    cols = cols || EYE_DEFAULT;
    g.save();
    g.translate(x, y); g.scale(1, eyeH);
    g.fillStyle = cols.white;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = cols.iris;
    g.beginPath(); g.arc(gazeX, 0.3, rx * 0.72, 0, TAU); g.fill();
    g.fillStyle = cols.pupil;
    g.beginPath(); g.arc(gazeX + 0.1, 0.4, rx * 0.4, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.arc(gazeX - rx * 0.28, -ry * 0.32, rx * 0.2, 0, TAU); g.fill();
    g.strokeStyle = cols.line; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.restore();
  }
  // blink amount 0..1 — a fast snap on a slow rhythm (k sets the interval)
  const blink = (t, ph, k) => Math.pow(Math.max(0, Math.sin(t * (k || 0.45) + (ph || 0) * 2.3)), 200);

  window.SavRig = { TAU, psr, lg, rg, shade, fluff, leg, eye, blink };
})();
