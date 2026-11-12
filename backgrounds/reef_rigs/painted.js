/* ── reef_rigs/painted.js — the reef's larger creatures, repainted (2026-11) ──
   Turtle · Dolphin · Shark · Octopus · Seahorse · Crab · Pufferfish, painted the
   way reef4's fish are: real proportions, colour from back to belly, light from
   above, fins and flippers with form, a glossy eye. They replace the cartoon
   rigs (turtle.js, dolphin.js, shark.js, octopus.js, seahorse.js, crab.js,
   puffer.js); jelly.js is unchanged.

   API (what reef4.bg.js uses) — window.<Name>Rig = { draw(ctx, L, t), BOX, LEN,
   FRAMES, ACT_SECONDS, COATS, mouth(L) [, STRIDE, CPS, BOX_PUFF, siphon(L)] }
     L = { x, y, s, dir, wt, pose, coat [, puff] }
       wt    the cruise phase in radians. The cruise look is a PURE FUNCTION of
             wt (2π-periodic): the scene bakes FRAMES cells of BOX and blits them
       pose  0..1 — the creature's trick, drawn live (0 and 1 = the cruise look)
       coat  one of COATS
     LEN = the creature's length in units (the scene scales it to a size in px)
   UNIT SPACE: facing +x, y down. Swimmers: (0, 0) = mid-body. The octopus and
   the crab: (0, 0) = the ground under them.
   Dev page: reef_rigs/painted_dev.html (every creature, large, in motion).       */
(function(){
  'use strict';
  const TAU = Math.PI * 2, clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v, lerp = (a, b, k) => a + (b - a) * k;
  const lg = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) q.addColorStop(s[0], s[1]); return q; };
  const rg = (g, x, y, r0, r1, st) => { const q = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) q.addColorStop(s[0], s[1]); return q; };
  const open = (g, L) => { g.save(); g.translate(L.x || 0, L.y || 0); g.scale((L.s || 1) * (L.dir || 1), L.s || 1); };
  const env = q => Math.sin(Math.PI * clamp01(q));                 // a trick's 0 → 1 → 0 envelope
  const at = (L, x, y) => ({ x: (L.x || 0) + x * (L.s || 1) * (L.dir || 1), y: (L.y || 0) + y * (L.s || 1) });
  // a glossy eye: a dark ring, an iris, the pupil, two lights
  function eye(g, x, y, r, iris){
    g.fillStyle = 'rgba(12,10,26,.7)'; g.beginPath(); g.arc(x, y, r + 0.9, 0, TAU); g.fill();
    g.fillStyle = rg(g, x - r * 0.2, y - r * 0.3, r * 0.2, r, [[0, '#ffffff'], [0.35, iris], [1, '#1a1426']]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = '#0a0816'; g.beginPath(); g.arc(x + r * 0.08, y, r * 0.56, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + r * 0.34, y - r * 0.34, r * 0.26, 0, TAU); g.fill();
    g.globalAlpha = 0.6; g.beginPath(); g.arc(x - r * 0.24, y + r * 0.34, r * 0.13, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // a tapering limb through points (round joints): w0 wide at the start, w1 at the end
  function taper(g, P, w0, w1, col){
    g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < P.length - 1; i++){ g.lineWidth = lerp(w0, w1, i / (P.length - 1)); g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 1][0], P[i + 1][1]); g.stroke(); }
  }
  const dots = (g, list, col) => { g.fillStyle = col; g.beginPath(); for (const p of list){ g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); } g.fill(); };

  // ══ THE SEA TURTLE: a domed shell of scutes, a pale belly, long wing-like front
  //    flippers that row it along, a scaled head with a beak. Trick: it waves.
  const TURTLE_COATS = { sea: ['#5d7a3c', '#a2b064', '#34491f', '#e9dca8', '#6c7a3e'], amber: ['#8a6a34', '#cfa860', '#55401e', '#f0e0b0', '#8a7038'], jade: ['#3f7f6a', '#84c6a6', '#255042', '#e2ecc8', '#4a8068'] };   // shell · its light · its seams · skin · scales
  const T_SCUTES = [[-54, -22], [-30, -32], [-4, -36], [22, -32], [46, -20], [-42, -4], [-16, -8], [10, -8], [36, -2]];
  const T_SCALES = [[78, -10, 2.6], [84, -13, 2.2], [90, -12, 2.4], [84, -7, 2], [96, -9, 2], [72, -6, 2.2], [78, -3, 1.8]];
  function turtle(g, L, t){
    const C = TURTLE_COATS[L.coat] || TURTLE_COATS.sea, wt = L.wt || 0, q = L.pose || 0, e = env(q), st = Math.sin(wt);
    open(g, L); g.translate(0, st * 2.4);
    const skin = lg(g, 0, -12, 0, 26, [[0, C[3]], [1, C[4]]]);
    const flipper = (x, y, ang, len, wd, dark) => {             // a long wing of a flipper, scaled along its leading edge
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = dark ? C[4] : skin; g.beginPath(); g.moveTo(-4, -wd * 0.5); g.bezierCurveTo(len * 0.3, -wd * 0.9, len * 0.7, -wd * 0.5, len, 0); g.bezierCurveTo(len * 0.7, wd * 0.5, len * 0.3, wd * 0.6, -4, wd * 0.5); g.closePath(); g.fill();
      g.fillStyle = 'rgba(52,68,30,.5)'; g.beginPath(); for (let i = 0; i < 6; i++){ const u = 0.12 + i * 0.14; g.moveTo(len * u + 3, -wd * 0.36 * (1 - u * 0.6)); g.ellipse(len * u, -wd * 0.36 * (1 - u * 0.6), 3.2 * (1 - u * 0.4), 2.2 * (1 - u * 0.4), 0, 0, TAU); } g.fill();
      g.restore();
    };
    flipper(36, 4, 1.1 + st * 0.6, 62, 20, true);                // the far front flipper
    flipper(-58, 10, 2.5 + Math.sin(wt + 1) * 0.22, 30, 13, true);   // the far hind flipper
    g.fillStyle = C[4]; g.beginPath(); g.moveTo(-74, 2); g.lineTo(-92, 8); g.lineTo(-74, 10); g.closePath(); g.fill();                         // the tail
    g.fillStyle = lg(g, 0, 0, 0, 24, [[0, C[3]], [1, '#b7a66a']]);                                                                             // the plastron
    g.beginPath(); g.moveTo(-76, 4); g.bezierCurveTo(-40, 22, 40, 22, 70, 0); g.bezierCurveTo(44, 12, -40, 14, -76, 4); g.closePath(); g.fill();
    const shell = () => { g.beginPath(); g.moveTo(-78, 4); g.bezierCurveTo(-76, -30, -40, -52, 0, -52); g.bezierCurveTo(36, -52, 64, -32, 72, -2); g.bezierCurveTo(40, 12, -40, 14, -78, 4); g.closePath(); };
    g.fillStyle = lg(g, 0, -52, 0, 12, [[0, C[1]], [0.45, C[0]], [1, C[2]]]); shell(); g.fill();
    g.save(); shell(); g.clip();
    g.fillStyle = 'rgba(255,236,170,.3)'; for (const [x, y] of T_SCUTES){ g.beginPath(); g.ellipse(x, y, 11, 8.6, 0, 0, TAU); g.fill(); }                 // each scute's paler heart
    g.strokeStyle = 'rgba(255,232,160,.34)'; g.lineWidth = 0.9; g.beginPath(); for (const [x, y] of T_SCUTES) for (let k = 0; k < 6; k++){ const a = k / 6 * TAU + 0.3; g.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 2.4); g.lineTo(x + Math.cos(a) * 9.6, y + Math.sin(a) * 7.4); } g.stroke();
    g.strokeStyle = C[2]; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-72, -12); g.quadraticCurveTo(0, -22, 68, -10);                 // the seams between the scutes
    for (const x of [-42, -17, 9, 34]){ g.moveTo(x - 3, 12); g.lineTo(x, -15); g.lineTo(x + 5, -52); } g.stroke();
    g.fillStyle = lg(g, 0, -52, 0, -28, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(-4, -42, 52, 10, 0, 0, TAU); g.fill();   // the sun on the dome
    g.fillStyle = lg(g, 0, -6, 0, 12, [[0, 'rgba(20,30,60,0)'], [1, 'rgba(20,30,60,.4)']]); g.fillRect(-80, -6, 156, 20);
    g.restore();
    g.strokeStyle = 'rgba(244,232,180,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-77, 3); g.bezierCurveTo(-40, 13, 40, 11, 72, -2); g.stroke();   // the shell's pale rim
    g.save(); g.translate(64, -2); g.rotate(-0.22 * e + st * 0.03); g.translate(-64, 2);                                                       // neck and head (it lifts to say hello)
    g.fillStyle = skin; g.beginPath(); g.moveTo(58, -13); g.bezierCurveTo(74, -17, 88, -19, 100, -13); g.bezierCurveTo(108, -9, 110, 0, 104, 4); g.bezierCurveTo(98, 8, 84, 11, 58, 9); g.closePath(); g.fill();
    dots(g, T_SCALES, 'rgba(60,76,34,.6)');
    g.strokeStyle = 'rgba(50,60,30,.7)'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(108.6, -2); g.quadraticCurveTo(103, 3.4, 95, 2.4); g.stroke();                       // the beak's line
    g.fillStyle = 'rgba(50,60,30,.7)'; g.beginPath(); g.arc(105.4, -6.4, 0.7, 0, TAU); g.fill();
    eye(g, 93.6, -6, 4.4, '#7a5a26');
    g.restore();
    flipper(-52, 12, 2.3 + Math.sin(wt + 0.6) * 0.24, 34, 15, false);                                                                          // the near hind flipper
    flipper(40, 8, 1.25 + st * 0.62 - 2.1 * e + Math.sin(q * TAU * 3) * 0.3 * e, 70, 23, false);                                               // the near front flipper: it rows — and waves
    g.restore();
  }
  window.TurtleRig = { draw: turtle, mouth: L => at(L, 106, 0), BOX: [-100, -70, 124, 92], LEN: 200, FRAMES: 12, ACT_SECONDS: 2.6, COATS: Object.keys(TURTLE_COATS) };

  // ══ THE DOLPHIN: a sleek body, slate above, pale below; a beak with its smile,
  //    a curved fin, a tail that beats up and down. Trick: it chatters.
  const DOLPHIN_COATS = { grey: ['#566a82', '#93a8bc', '#edf1f4'], blue: ['#43658c', '#88aace', '#eff3f7'], dusk: ['#6a5f84', '#aa9fc0', '#f6eef0'] };   // back · flank · belly
  function dolphin(g, L, t){
    const C = DOLPHIN_COATS[L.coat] || DOLPHIN_COATS.grey, wt = L.wt || 0, q = L.pose || 0, e = env(q), st = Math.sin(wt);
    open(g, L); g.rotate(-st * 0.05 - 0.1 * e); g.translate(0, st * 2);
    const hide = lg(g, 0, -36, 0, 32, [[0, C[0]], [0.42, C[1]], [0.7, C[2]], [1, '#cfd9e2']]);
    g.save(); g.translate(-46, 0); g.rotate(st * 0.26);                                             // the tail stock and the flukes
    g.fillStyle = hide; g.beginPath(); g.moveTo(10, -20); g.bezierCurveTo(-20, -18, -52, -9, -72, -5); g.lineTo(-72, 5); g.bezierCurveTo(-52, 10, -20, 20, 10, 21); g.closePath(); g.fill();
    g.translate(-70, 0); g.rotate(Math.sin(wt - 0.9) * 0.42);
    g.fillStyle = lg(g, -36, 0, 4, 0, [[0, '#34465c'], [1, C[0]]]);
    g.beginPath(); g.moveTo(5, -4.4); g.bezierCurveTo(-8, -10, -20, -26, -36, -31); g.bezierCurveTo(-29, -17, -25, -6, -21, 0); g.bezierCurveTo(-25, 6, -29, 17, -36, 31); g.bezierCurveTo(-20, 26, -8, 10, 5, 4.4); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = lg(g, -26, 0, 10, 0, [[0, '#34465c'], [1, C[0]]]);                                 // the dorsal fin
    g.beginPath(); g.moveTo(10, -32); g.bezierCurveTo(3, -47, -8, -57, -23, -61); g.bezierCurveTo(-17, -51, -18, -41, -28, -30); g.closePath(); g.fill();
    const body = () => { g.beginPath(); g.moveTo(119, 4); g.bezierCurveTo(105, -2, 97, -8, 89, -16); g.bezierCurveTo(77, -30, 41, -36, 4, -33.6); g.bezierCurveTo(-20, -32, -40, -25, -50, -20);
      g.lineTo(-50, 21); g.bezierCurveTo(-30, 28, 10, 33, 50, 27); g.bezierCurveTo(76, 22.6, 96, 14.6, 104, 10.6); g.bezierCurveTo(110, 9.6, 117, 8.4, 119, 4); g.closePath(); };
    g.fillStyle = hide; body(); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = C[2]; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(96, 2); g.bezierCurveTo(60, -4, 20, 2, -10, 8); g.bezierCurveTo(20, 12, 60, 12, 100, 12); g.closePath(); g.fill(); g.globalAlpha = 1;   // the pale blaze along its flank
    g.fillStyle = lg(g, 0, -36, 0, -18, [[0, 'rgba(214,236,255,.55)'], [1, 'rgba(214,236,255,0)']]); g.beginPath(); g.ellipse(26, -29, 46, 5, -0.03, 0, TAU); g.fill();                              // the light on its wet back
    g.fillStyle = lg(g, 0, 18, 0, 34, [[0, 'rgba(30,50,90,0)'], [1, 'rgba(30,50,90,.28)']]); g.fillRect(-52, 16, 160, 18);
    g.restore();
    if (e > 0.03){ g.fillStyle = '#5a2030'; g.beginPath(); g.moveTo(118, 5); g.lineTo(88, 7.6); g.lineTo(116, 6 + 9 * e); g.closePath(); g.fill();                                                   // it opens its beak to chatter
      g.fillStyle = hide; g.beginPath(); g.moveTo(88, 7.6); g.lineTo(117, 5.6 + 9 * e); g.bezierCurveTo(108, 12 + 8 * e, 98, 13 + 4 * e, 88, 13); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(30,42,62,.7)'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(118, 5); g.quadraticCurveTo(100, 8.6, 85, 5.6); g.stroke();                                // the smile
    eye(g, 80, -3.4, 3.4, '#4a4036');
    g.fillStyle = 'rgba(20,30,50,.6)'; g.beginPath(); g.ellipse(69, -30.6, 2.2, 0.9, -0.1, 0, TAU); g.fill();                                                                                        // the blowhole
    g.save(); g.translate(48, 19); g.rotate(0.4 + st * 0.12); g.fillStyle = lg(g, -30, 0, 0, 0, [[0, '#34465c'], [1, C[0]]]);                                                                        // the flipper
    g.beginPath(); g.moveTo(2, -2); g.bezierCurveTo(-5, 13, -21, 29, -36, 33); g.bezierCurveTo(-27, 19, -19, 7, -15, -3); g.closePath(); g.fill(); g.restore();
    g.restore();
  }
  window.DolphinRig = { draw: dolphin, mouth: L => at(L, 118, 6), BOX: [-166, -74, 126, 70], LEN: 260, FRAMES: 12, ACT_SECONDS: 1.9, COATS: Object.keys(DOLPHIN_COATS) };

  // ══ THE REEF SHARK (a blacktip): a torpedo of a body, bronze-grey above and white
  //    below, black tips on every fin, a tail that sweeps. Trick: a wide friendly grin.
  const SHARK_COATS = { reef: ['#647384', '#9ba8b6', '#f3f6f8'], sand: ['#827c72', '#b4ad9e', '#f7f5ef'] };   // back · flank · belly
  function shark(g, L, t){
    const C = SHARK_COATS[L.coat] || SHARK_COATS.reef, wt = L.wt || 0, q = L.pose || 0, e = env(q), st = Math.sin(wt), TIP = '#1c2230';
    open(g, L); g.rotate(-0.06 * e); g.translate(0, st * 1.5);
    const hide = lg(g, 0, -30, 0, 24, [[0, C[0]], [0.5, C[1]], [1, C[1]]]);
    const fin = (pts, tipY0, tipY1) => {                         // a fin with its black tip
      g.beginPath(); g.moveTo(pts[0], pts[1]); g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); g.bezierCurveTo(pts[8], pts[9], pts[10], pts[11], pts[12], pts[13]); g.closePath();
      g.fillStyle = lg(g, 0, tipY0, 0, tipY1, [[0, TIP], [0.5, TIP], [1, C[0]]]); g.fill();
    };
    g.save(); g.translate(-40, -2); g.rotate(st * 0.22);                                            // the tail stock, the small fins on it, the tail
    g.fillStyle = hide; g.beginPath(); g.moveTo(12, -21); g.bezierCurveTo(-20, -18, -56, -9, -78, -5); g.lineTo(-78, 4.4); g.bezierCurveTo(-56, 9, -20, 17, 12, 19); g.closePath(); g.fill();
    g.fillStyle = C[2]; g.beginPath(); g.moveTo(12, 19); g.bezierCurveTo(-20, 17, -56, 9, -78, 4.4); g.bezierCurveTo(-56, 4, -20, 6, 12, 8); g.closePath(); g.fill();
    fin([-34, -12, -40, -20, -46, -24, -52, -25, -50, -18, -50, -13, -54, -9], -25, -12);
    fin([-40, 9, -46, 15, -52, 19, -58, 19, -55, 13, -55, 9, -58, 6], 19, 8);
    g.translate(-76, 0); g.rotate(Math.sin(wt - 0.8) * 0.36);
    g.beginPath(); g.moveTo(3, -4.6); g.bezierCurveTo(-12, -22, -30, -46, -48, -60); g.bezierCurveTo(-41, -37, -31, -17, -23, -2); g.bezierCurveTo(-27, 8, -31, 20, -36, 29); g.bezierCurveTo(-23, 23, -9, 11, 3, 4.6); g.closePath();
    g.fillStyle = lg(g, -52, -60, -4, 0, [[0, TIP], [0.3, TIP], [0.6, C[0]], [1, C[0]]]); g.fill();
    g.restore();
    fin([27, -28, 19, -47, 9, -63, -4, -71, -2, -53, -8, -39, -19, -28], -71, -44);                  // the first dorsal fin
    fin([-12, 17, -18, 24, -26, 30, -34, 31, -30, 24, -29, 19, -31, 15], 31, 18);                    // a pelvic fin
    const body = () => { g.beginPath(); g.moveTo(137, 2); g.bezierCurveTo(121, -10, 97, -22, 60, -27.6); g.bezierCurveTo(30, -31, -10, -28, -32, -22); g.lineTo(-32, 18); g.bezierCurveTo(0, 25, 50, 27, 90, 21); g.bezierCurveTo(110, 18, 129, 11, 137, 2); g.closePath(); };
    g.fillStyle = hide; body(); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = lg(g, 0, 4, 0, 26, [[0, '#ffffff'], [1, '#d3dde6']]);                              // the white belly, its edge a clean sweep
    g.beginPath(); g.moveTo(140, 3); g.bezierCurveTo(110, 9, 60, 3, 20, 6); g.bezierCurveTo(0, 7.6, -20, 9, -34, 8); g.lineTo(-34, 30); g.lineTo(140, 30); g.closePath(); g.fill();
    g.fillStyle = lg(g, 0, -31, 0, -14, [[0, 'rgba(214,236,255,.5)'], [1, 'rgba(214,236,255,0)']]); g.beginPath(); g.ellipse(40, -24, 60, 5, -0.03, 0, TAU); g.fill();
    g.fillStyle = lg(g, 0, 14, 0, 28, [[0, 'rgba(30,50,90,0)'], [1, 'rgba(30,50,90,.24)']]); g.fillRect(-36, 12, 180, 18);
    g.restore();
    g.strokeStyle = 'rgba(30,40,58,.5)'; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 5; i++){ const x = 60 + i * 5.6; g.moveTo(x, -6 + i * 0.4); g.quadraticCurveTo(x - 2.4, 1, x, 8 - i * 0.6); } g.stroke();   // gill slits
    if (e > 0.03){                                                                                   // the grin: the jaw drops, small rounded teeth show
      g.fillStyle = '#5a2030'; g.beginPath(); g.moveTo(128, 9.4); g.quadraticCurveTo(116, 13 + 10 * e, 102, 12.6); g.quadraticCurveTo(114, 9, 128, 9.4); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 5; i++){ const x = 108 + i * 4.2; g.moveTo(x + 1.6, 10.4); g.arc(x, 10.4, 1.6, 0, Math.PI); } g.fill();
    }
    g.strokeStyle = 'rgba(30,40,58,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(129, 9); g.quadraticCurveTo(115, 12.6, 101, 12.4); g.quadraticCurveTo(98.6, 12, 97, 9.6); g.stroke();                 // the mouth, turned up at its corner
    g.fillStyle = 'rgba(30,40,58,.6)'; g.beginPath(); g.ellipse(128, 1, 1.5, 0.8, 0.5, 0, TAU); g.fill();
    eye(g, 109, -5.4, 3.6, '#5a6470');
    g.save(); g.translate(50, 19); g.rotate(0.16 + st * 0.06);                                       // the near pectoral fin
    g.beginPath(); g.moveTo(2, -3); g.bezierCurveTo(-9, 15, -29, 35, -52, 44); g.bezierCurveTo(-41, 27, -31, 11, -29, -3); g.closePath(); g.fillStyle = lg(g, -52, 44, -10, 4, [[0, TIP], [0.34, TIP], [0.7, C[0]], [1, C[0]]]); g.fill(); g.restore();
    g.restore();
  }
  window.SharkRig = { draw: shark, mouth: L => at(L, 122, 12), BOX: [-176, -80, 142, 72], LEN: 280, FRAMES: 12, ACT_SECONDS: 2.4, COATS: Object.keys(SHARK_COATS) };

  // ══ THE OCTOPUS, sitting on its rock ((0, 0) = the rock under it): a soft
  //    mantle, two eyes with a level pupil, eight arms that coil and feel about,
  //    suckers beneath them. Trick: it flings its arms wide (the scene changes
  //    its colour and adds the ink).
  const OCTO_COATS = { coral: ['#e8705a', '#ffb49e', '#b0463c'], lilac: ['#a884e0', '#dccafc', '#7654b0'], mint: ['#58c09c', '#b4f0d6', '#2f8a74'], amber: ['#e2a23e', '#ffdc94', '#a66c1e'] };   // body · light · dark
  const O_SPOTS = [[-14, -84, 2.6], [4, -92, 2.2], [16, -76, 2.8], [-22, -66, 2.2], [-2, -70, 2], [24, -60, 2], [-10, -54, 1.8], [10, -52, 1.6]];
  function octopus(g, L, t){
    const C = OCTO_COATS[L.coat] || OCTO_COATS.coral, wt = L.wt || 0, q = L.pose || 0, e = env(q);
    open(g, L);
    const arm = (side, rank, near) => {                           // one arm: out from under the head, along the rock, its tip coiled
      const a0 = (0.9 - rank * 0.28) - 0.75 * e, len = 70 + rank * 7, n = 13, seg = len / n, turn = -(1.9 + rank * 0.2) * (1 - 0.72 * e), P = [];
      let a = a0, x = (5 + rank * 5), y = -30 + rank * 2;
      P.push([side * x, y]);
      for (let i = 1; i <= n; i++){
        const k = i / n; a += turn * (0.2 + 1.6 * k) / n + Math.sin(wt + rank * 1.3 + (near ? 0 : 2) + k * 4) * 0.07;
        x += Math.cos(a) * seg; y += Math.sin(a) * seg; if (y > -2.4){ y = -2.4; if (a > 0.05) a = 0.05; }
        P.push([side * x, y]);
      }
      taper(g, P, near ? 14 : 12, 2, near ? C[0] : C[2]);
      if (near){ g.fillStyle = 'rgba(255,244,236,.8)'; g.beginPath(); for (let i = 2; i < n; i++){ const r = lerp(1.9, 0.6, i / n); g.moveTo(P[i][0] + r, P[i][1] + r * 1.4); g.arc(P[i][0], P[i][1] + r * 1.4, r, 0, TAU); } g.fill(); }   // suckers
    };
    for (const side of [-1, 1]) for (const rank of [3, 1]) arm(side, rank, false);                  // the far arms
    for (const side of [-1, 1]) for (const rank of [2, 0]) arm(side, rank, true);                   // the near arms
    g.save(); g.translate(0, -30); g.scale(1 + 0.03 * Math.sin(wt), 1 - 0.03 * Math.sin(wt) + 0.05 * e); g.translate(0, 30);   // it breathes
    g.fillStyle = C[2]; g.beginPath(); g.ellipse(-27, -40, 7, 4.4, -0.5, 0, TAU); g.fill();                                     // the siphon
    const mantle = () => { g.beginPath(); g.moveTo(-25, -33); g.bezierCurveTo(-41, -52, -39, -93, -8, -105); g.bezierCurveTo(21, -113, 41, -87, 35, -58); g.bezierCurveTo(33, -46, 27, -36, 21, -31); g.bezierCurveTo(6, -24, -12, -25, -25, -33); g.closePath(); };
    g.fillStyle = rg(g, -10, -84, 6, 70, [[0, C[1]], [0.5, C[0]], [1, C[2]]]); mantle(); g.fill();
    g.save(); mantle(); g.clip();
    dots(g, O_SPOTS, 'rgba(255,255,255,.3)'); dots(g, O_SPOTS.map(p => [p[0] + 7, p[1] + 9, p[2] * 0.7]), 'rgba(60,20,40,.22)');
    g.fillStyle = lg(g, 0, -106, 0, -80, [[0, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(-8, -94, 22, 9, -0.3, 0, TAU); g.fill();
    g.restore();
    for (const [x, y, r] of [[-12, -41, 6.6], [14, -40, 8.4]]){                                    // the eyes: raised, a level slot of a pupil
      g.fillStyle = C[0]; g.beginPath(); g.arc(x, y, r + 1.6, 0, TAU); g.fill();
      g.fillStyle = rg(g, x - r * 0.2, y - r * 0.3, r * 0.2, r, [[0, '#fff6d8'], [0.5, '#f0c860'], [1, '#8a5a1e']]); g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.fill();
      g.fillStyle = '#16121e'; g.beginPath(); g.ellipse(x, y, r * 0.62, r * 0.26 + r * 0.3 * e, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.36, r * 0.2, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(60,20,40,.5)'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.arc(1, -34 - 2 * e, 5, 0.3, Math.PI - 0.3); g.stroke();   // the hint of a smile
    g.restore();
    g.restore();
  }
  window.OctopusRig = { draw: octopus, mouth: L => at(L, 1, -30), siphon: L => at(L, -30, -42), BOX: [-104, -118, 104, 6], LEN: 140, FRAMES: 12, ACT_SECONDS: 2.2, COATS: Object.keys(OCTO_COATS) };

  // ══ THE SEAHORSE: upright, a ringed body with a pale belly, a horse's head with
  //    a long snout and a little crown, a fin that flutters on its back, a tail
  //    curled like a fern. Trick: it bows and uncurls its tail.
  const HORSE_COATS = { sun: ['#f0a630', '#ffe08a', '#b86a14'], rose: ['#ec7a9a', '#ffc6d2', '#b0446a'], lime: ['#8cc44a', '#dcf29a', '#55862a'], violet: ['#9a78dc', '#d6c6f8', '#644aa6'] };   // body · belly · shade
  const H_SPINE = [[2, -33, 7], [6, -23, 10.4], [7, -11, 12.4], [4, 1, 11.4], [0, 12, 9], [-3, 22, 6.8], [-4, 31, 5.2]];
  function seahorse(g, L, t){
    const C = HORSE_COATS[L.coat] || HORSE_COATS.sun, wt = L.wt || 0, q = L.pose || 0, e = env(q), st = Math.sin(wt);
    open(g, L); g.rotate(st * 0.06 + 0.12 * e); g.translate(0, Math.sin(wt * 2) * 1.2);
    const P = H_SPINE.slice();                                    // the body's beads, then the tail's coil
    const coil = 1 + 0.7 * e;
    for (let i = 1; i <= 12; i++){ const k = i / 12, a = Math.PI - k * 4.3 / coil, rad = lerp(9.4, 2.4, k) * coil; P.push([5.4 + Math.cos(a) * rad, 40 + Math.sin(a) * rad * 0.9 + (coil - 1) * 6, lerp(4.4, 1.3, k)]); }
    g.fillStyle = C[1]; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.7;                               // the fin on its back, fluttering
    { const fl = Math.sin(wt * 5) * 2; g.beginPath(); g.moveTo(-5, -12); g.lineTo(-19, -9 + fl); g.lineTo(-21, 5 + fl); g.lineTo(-6, 9); g.closePath(); g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1;
      g.beginPath(); for (let i = 0; i < 5; i++){ g.moveTo(-6, -8 + i * 4); g.lineTo(-19.6, -8 + i * 3.4 + fl); } g.stroke(); }
    g.fillStyle = lg(g, -14, 0, 16, 0, [[0, C[2]], [0.45, C[0]], [1, C[1]]]);                               // dark at the back, pale at the belly
    g.beginPath(); for (const p of P){ g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); } g.fill();
    g.strokeStyle = 'rgba(80,40,10,.3)'; g.lineWidth = 0.9; g.beginPath();                                  // the rings of its armour
    for (let i = 1; i < P.length - 1; i++){ const p = P[i], n = P[i + 1], a = Math.atan2(n[1] - p[1], n[0] - p[0]) + Math.PI / 2; g.moveTo(p[0] - Math.cos(a) * p[2] * 0.9, p[1] - Math.sin(a) * p[2] * 0.9); g.lineTo(p[0] + Math.cos(a) * p[2] * 0.9, p[1] + Math.sin(a) * p[2] * 0.9); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); for (let i = 0; i < 7; i++){ const p = H_SPINE[i]; g.moveTo(p[0] + p[2] * 0.5 + 1, p[1] - 2); g.arc(p[0] + p[2] * 0.5, p[1] - 2, 1, 0, TAU); } g.fill();
    g.save(); g.translate(2, -36); g.rotate(0.5 * e - st * 0.04);                                            // the head: it nods when it bows
    g.fillStyle = C[2]; g.beginPath(); g.moveTo(-3, -14); g.lineTo(-1, -21); g.lineTo(1.6, -15); g.lineTo(4.4, -20.6); g.lineTo(5.6, -14.4); g.closePath(); g.fill();   // the crown
    g.fillStyle = lg(g, 0, -16, 0, 2, [[0, C[1]], [1, C[0]]]);
    g.beginPath(); g.arc(3, -7, 8.8, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(8, -10); g.bezierCurveTo(16, -9.6, 24, -8, 29.6, -7.4); g.bezierCurveTo(31.6, -6.6, 31.6, -1.6, 29.4, -1); g.bezierCurveTo(22, -1, 14, -0.6, 7, 0); g.closePath(); g.fill();   // the snout: a slender tube, flared at its tip
    g.fillStyle = 'rgba(80,40,10,.5)'; g.beginPath(); g.ellipse(30, -4.2, 0.9, 1.8, 0, 0, TAU); g.fill();
    g.fillStyle = C[2]; g.beginPath(); g.moveTo(-2, -2); g.lineTo(-8.6, 0); g.lineTo(-1, 2.6); g.closePath(); g.fill();                                                    // a cheek spine
    eye(g, 6, -8.6, 3.4, '#c8872a');
    g.restore();
    g.restore();
  }
  window.SeahorseRig = { draw: seahorse, mouth: L => at(L, 30, -40), BOX: [-36, -68, 46, 64], LEN: 120, FRAMES: 12, ACT_SECONDS: 2.4, COATS: Object.keys(HORSE_COATS) };

  // ══ THE CRAB, seen from the front ((0, 0) = the ground under it): a broad
  //    shell, eyes on stalks, two great claws, eight legs that step sideways.
  //    One step cycle covers STRIDE units. Trick: it snaps its claws overhead.
  const CRAB_COATS = { red: ['#e0503c', '#ffa07e', '#9e2a22'], orange: ['#f08a2e', '#ffc680', '#b25a12'], violet: ['#9c6ad8', '#d4b8f6', '#6440a2'], blue: ['#4a8ed6', '#a8d2f6', '#285c9c'] };   // shell · light · dark
  const STRIDE = 16;
  function crab(g, L, t){
    const C = CRAB_COATS[L.coat] || CRAB_COATS.red, wt = L.wt || 0, q = L.pose || 0, e = env(q), bob = Math.abs(Math.sin(wt)) * 1.6 + 2 * e;
    open(g, L);
    for (const side of [-1, 1]) for (let i = 3; i >= 0; i--){                                    // the legs: hip, knee held high, a pointed foot on the ground
      const ph = wt + i * Math.PI / 2 + (side > 0 ? Math.PI : 0), hip = [side * (20 + i * 4), -22 + i * 1.4 - bob], foot = [side * (40 + i * 8) + Math.sin(ph) * 4, -Math.max(0, Math.cos(ph)) * 5];
      const knee = [(hip[0] + foot[0]) / 2 + side * 9, Math.min(hip[1], foot[1]) - 15 + i * 2];
      taper(g, [hip, knee, foot], 5.6, 1.8, i % 2 ? C[2] : C[0]);
    }
    const snap = 0.22 + 0.16 * Math.sin(wt * 0.5) + e * (0.5 + 0.45 * Math.sin(q * TAU * 5));
    for (const side of [-1, 1]){                                                                 // the claws: an arm, a broad hand, a fixed finger and one that snaps
      const sh = [side * 28, -32 - bob], el = [side * (46 - 6 * e), -42 - bob - 18 * e];
      taper(g, [sh, el], 7, 6, C[0]);
      g.save(); g.translate(el[0], el[1]); g.scale(side, 1); g.rotate(-0.5 - 0.5 * e);
      g.fillStyle = lg(g, 0, -10, 0, 10, [[0, C[1]], [0.6, C[0]], [1, C[2]]]);
      g.beginPath(); g.moveTo(-3, 3); g.bezierCurveTo(-2, -9, 10, -12, 17, -7); g.bezierCurveTo(24, -3, 30, 0, 33, 3); g.bezierCurveTo(26, 5, 20, 6, 14, 6); g.bezierCurveTo(8, 9, 0, 9, -3, 3); g.closePath(); g.fill();
      g.save(); g.translate(13, -6); g.rotate(-snap); g.beginPath(); g.moveTo(-1, 3); g.bezierCurveTo(4, -5, 13, -6, 20, -1.6); g.bezierCurveTo(13, 0, 6, 3, -1, 3); g.closePath(); g.fill(); g.restore();
      g.restore();
    }
    const shell = () => { g.beginPath(); g.moveTo(-35, -22 - bob); g.bezierCurveTo(-40, -45 - bob, -21, -53 - bob, 0, -53 - bob); g.bezierCurveTo(21, -53 - bob, 40, -45 - bob, 35, -22 - bob); g.bezierCurveTo(24, -11 - bob, -24, -11 - bob, -35, -22 - bob); g.closePath(); };
    g.fillStyle = lg(g, 0, -53 - bob, 0, -11 - bob, [[0, C[1]], [0.4, C[0]], [1, C[2]]]); shell(); g.fill();
    g.save(); shell(); g.clip(); g.translate(0, -bob);
    dots(g, [[-18, -40, 2.6], [-6, -45, 2], [8, -43, 2.4], [20, -38, 2], [-12, -32, 1.6], [12, -31, 1.6], [0, -37, 1.4]], 'rgba(255,255,255,.34)');
    g.fillStyle = lg(g, 0, -53, 0, -40, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(0, -47, 26, 6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,244,230,.85)'; g.beginPath(); g.ellipse(0, -15, 15, 6, 0, 0, TAU); g.fill();                                          // the pale apron under its face
    g.restore();
    g.translate(0, -bob);
    for (const side of [-1, 1]){                                                                 // eyes on their stalks
      g.strokeStyle = C[0]; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(side * 9, -50); g.lineTo(side * 10.6, -60 - 3 * e); g.stroke();
      eye(g, side * 10.6, -62 - 3 * e, 4.6, '#3a3040');
    }
    g.strokeStyle = 'rgba(70,20,20,.7)'; g.lineWidth = 1.3; g.beginPath(); g.arc(0, -25, 6 + 2 * e, 0.3, Math.PI - 0.3); g.stroke();                 // its smile
    g.restore();
  }
  window.CrabRig = { draw: crab, mouth: L => at(L, 0, -22), BOX: [-74, -86, 74, 5], LEN: 98, FRAMES: 12, ACT_SECONDS: 2.0, COATS: Object.keys(CRAB_COATS), STRIDE };

  // ══ THE PUFFERFISH: a boxy little fish, spotted above and white below, big-eyed,
  //    with a small beak and tiny fins. L.puff 0..1 blows it into a ball of spines.
  const PUFFER_COATS = { sand: ['#d6ae54', '#f4dc98', '#fbf7e8', '#6a4a22'], sky: ['#6aa4d4', '#b6d8f2', '#f5f9fc', '#2c4c7c'], rose: ['#e08a9a', '#f8c6ce', '#fdf3f1', '#8a3c4c'] };   // back · flank · belly · spots
  const P_SPOTS = [[0.5, -0.62, 3], [0.2, -0.72, 3.4], [-0.1, -0.66, 3], [-0.4, -0.6, 2.6], [0.36, -0.36, 2.6], [0.04, -0.4, 3], [-0.28, -0.34, 2.6], [-0.56, -0.3, 2.2], [0.62, -0.3, 2.2], [-0.7, -0.08, 2]];
  function puffer(g, L, t){
    const C = PUFFER_COATS[L.coat] || PUFFER_COATS.sand, wt = L.wt || 0, p = clamp01(L.puff || 0), fl = Math.sin(wt * 2);
    const rx = lerp(44, 52, p), ry = lerp(27, 52, p), cx = lerp(0, -4, p);
    open(g, L); g.translate(0, Math.sin(wt) * 1.6);
    g.save(); g.translate(cx - rx + 2, 0); g.rotate(Math.sin(wt) * 0.3);                            // the tail: a small fan
    g.fillStyle = lg(g, -18, 0, 2, 0, [[0, C[1]], [1, C[0]]]); g.beginPath(); g.moveTo(3, -4); g.quadraticCurveTo(-9, -12, -18, -11); g.quadraticCurveTo(-21, 0, -18, 11); g.quadraticCurveTo(-9, 12, 3, 4); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 0.7; g.beginPath(); for (const a of [-0.5, -0.17, 0.17, 0.5]){ g.moveTo(0, a * 5); g.lineTo(-17, a * 18); } g.stroke(); g.restore();
    g.fillStyle = C[0]; for (const up of [-1, 1]){ g.beginPath(); g.moveTo(cx - rx * 0.36, up * ry * 0.84); g.quadraticCurveTo(cx - rx * 0.6, up * (ry + 12 + fl * up), cx - rx * 0.82, up * (ry * 0.8 + 6)); g.quadraticCurveTo(cx - rx * 0.7, up * ry * 0.7, cx - rx * 0.36, up * ry * 0.84); g.fill(); }   // dorsal and anal fins
    const body = () => { g.beginPath(); g.moveTo(cx + rx, 2); g.bezierCurveTo(cx + rx, -ry * 0.9, cx + rx * 0.4, -ry, cx - rx * 0.1, -ry); g.bezierCurveTo(cx - rx * 0.7, -ry, cx - rx, -ry * 0.4, cx - rx, 0);
      g.bezierCurveTo(cx - rx, ry * 0.4, cx - rx * 0.7, ry, cx - rx * 0.1, ry); g.bezierCurveTo(cx + rx * 0.4, ry, cx + rx, ry * 0.9, cx + rx, 2); g.closePath(); };
    if (p > 0.04){ g.strokeStyle = '#fff6dc'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath();                                                // the spines round its outline
      for (let i = 0; i < 34; i++){ const a = i / 34 * TAU + 0.1; if (Math.cos(a) > 0.86) continue; g.moveTo(cx + Math.cos(a) * rx * 0.94, Math.sin(a) * ry * 0.94); g.lineTo(cx + Math.cos(a) * (rx + 8 * p), Math.sin(a) * (ry + 8 * p)); } g.stroke(); }
    g.fillStyle = lg(g, 0, -ry, 0, ry, [[0, C[0]], [0.42, C[1]], [0.6, C[2]], [1, '#dfe6ea']]); body(); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = C[3]; g.globalAlpha = 0.6; g.beginPath(); for (const s of P_SPOTS){ g.moveTo(cx + s[0] * rx + s[2], s[1] * ry); g.arc(cx + s[0] * rx, s[1] * ry, s[2], 0, TAU); } g.fill(); g.globalAlpha = 1;
    if (p > 0.04){ g.strokeStyle = 'rgba(255,250,232,.85)'; g.lineWidth = 1.1; g.beginPath(); for (let i = 0; i < 26; i++){ const u = ((i * 0.618) % 1) * 2 - 1, v = ((i * 0.377) % 1) * 2 - 1; if (u * u + v * v > 0.8) continue; const x = cx + u * rx, y = v * ry; g.moveTo(x - 2.4 * p, y + 2.4 * p); g.lineTo(x, y - 2.6 * p); g.lineTo(x + 2.4 * p, y + 2.4 * p); } g.stroke(); }   // …and all over it
    g.fillStyle = lg(g, 0, -ry, 0, -ry * 0.4, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(cx, -ry * 0.72, rx * 0.6, ry * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = lg(g, 0, ry * 0.5, 0, ry, [[0, 'rgba(30,50,90,0)'], [1, 'rgba(30,50,90,.22)']]); g.fillRect(cx - rx, ry * 0.4, rx * 2, ry * 0.6);
    g.restore();
    g.save(); g.translate(cx + rx * 0.12, ry * 0.14); g.rotate(0.5 + fl * 0.3);                    // the pectoral fin, fluttering
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(0, -2); g.quadraticCurveTo(-10, -8, -17, -2); g.quadraticCurveTo(-18, 5, -10, 7); g.quadraticCurveTo(-4, 6, 0, 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,100,60,.4)'; g.lineWidth = 0.6; g.beginPath(); for (let i = 0; i < 4; i++){ g.moveTo(-1, 0); g.lineTo(-15, -3 + i * 2.6); } g.stroke(); g.restore();
    g.fillStyle = '#f6efd8'; g.beginPath(); g.ellipse(cx + rx - 1.6, 5, 3.4, 3 + 1.4 * p, 0, 0, TAU); g.fill();                                       // the little beak
    g.fillStyle = '#5a2a30'; g.beginPath(); g.ellipse(cx + rx - 1, 5, 1.5, 1.2 + 1.2 * p, 0, 0, TAU); g.fill();
    eye(g, cx + rx * 0.5, -ry * 0.3, lerp(6.6, 7.8, p), '#2e9a8a');
    g.restore();
  }
  window.PufferRig = { draw: puffer, mouth: L => at(L, 44, 5), BOX: [-68, -44, 60, 44], BOX_PUFF: [-82, -66, 62, 66], LEN: 116, FRAMES: 12, ACT_SECONDS: 2.2, COATS: Object.keys(PUFFER_COATS), CPS: 0.9 };
})();
