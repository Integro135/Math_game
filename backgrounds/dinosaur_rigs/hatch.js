/* ── hatch.js — the EGG and the HATCHLING (dinosaur rigs, 2026-11) ───────────
   Two rigs that share one set of five COATS, so an egg of a coat hatches a
   baby of that coat (the shell is a pale tint of the coat, its speckles are
   the coat's colour).

   EggRig — a speckled dinosaur egg, 56 units tall, its bottom on y = 0.
     L = { x, y, s, dir, lit, tint, coat, wobble, crack, hatch, empty, ph }
       wobble 0..1  it rocks from side to side, rolling on its round bottom
       crack  0..1  zig-zag cracks spread across the shell
       hatch  0..1  (crack it fully first) the top lifts and tips back like a lid: ONE big eye peeks
                    out of the gap and blinks, the head and snout push out, the
                    lid drops open behind, a happy squeak; at 1 the baby sits
                    in the lower half-shell looking out. Bits of shell fall.
       empty  true  the open shell as at hatch = 1 WITHOUT the baby (for the
                    moment after the hatchling has hopped out)

   BabyRig — the hatchling once it is out: a chubby two-legged baby dinosaur,
   a head as big as its body, a stubby tail, little arms, big feet, a piece of
   eggshell on its head like a cap (L.cap, default true).
     L = { x, y, s, dir, ph, wt, moving, go, run, pose, tint, lit, coat, cap }
       walk = a wobbly toddle; L.run = a frantic little scurry
       pose 0..1 = SQUEAK-HOP: a happy hop, arms up, mouth open, a heart pops
     Legs: three bones placed by IK (kit.js) on planted feet.

   API — window.EggRig  { draw(ctx, L, t), HEIGHT, WIDTH, COATS }
         window.BabyRig { draw(ctx, L, t), mouth(L[, t]), HEIGHT, WIDTH, STRIDE,
                          RUN_STRIDE, ACT_SECONDS, WALK_CPS, RUN_CPS, COATS }
   Depends only on ../savanna_rigs/kit.js (window.SavKit). No outlines, no
   ctx.filter / shadowBlur, no offscreen canvases. */
(function(){
  const { TAU, psr, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, blob, taper, limb, step, leg, xf,
          eye, blink, brow, rim, heart, rings } = window.SavKit;
  const PI = Math.PI;

  // ── coats: the baby's colours and its egg's (shell*, speck, inner, crack)
  const FACE = { eyeW: '#FFFDF6', pupil: '#2A1830', line: '#4A3040', mouth: '#7A2E48', tongue: '#FF93A6', claw: '#FFF6E0',
                 tooth: '#FFFBEE', heart: '#FF6F91', cheek: '#FF7692' };
  const mk = o => Object.assign({}, FACE, o);
  const PALS = {
    mint:   mk({ coat: '#7FDDB8', coatL: '#BDF4DA', coatD: '#52BC94', belly: '#FFF7DC', bellyD: '#F1DEAC', far: '#46A583', spot: '#4FBD96',
                 scute: '#FF9E8C', scuteD: '#EE7A68', iris: '#2E9478', glow: '#E4FBD4',
                 shell: '#E2F8E9', shellL: '#FAFFF8', shellD: '#B2E0C5', speck: '#5FC49E', inner: '#8DBFA6', crack: '#4E8F78' }),
    coral:  mk({ coat: '#FF9C88', coatL: '#FFC9B8', coatD: '#EA7461', belly: '#FFF2D8', bellyD: '#F3D9A8', far: '#D4624F', spot: '#F0786A',
                 scute: '#7FD6C8', scuteD: '#52B8A8', iris: '#B5523E', glow: '#FFE3C4',
                 shell: '#FFE6DC', shellL: '#FFF8F2', shellD: '#F2B9A6', speck: '#F28D78', inner: '#D69C8A', crack: '#B0604E' }),
    lilac:  mk({ coat: '#C4A9F2', coatL: '#E4D6FF', coatD: '#9F82DA', belly: '#FFF4E6', bellyD: '#EFDCC0', far: '#8C6EC6', spot: '#A688E4',
                 scute: '#FFD36E', scuteD: '#EDB04A', iris: '#7650C6', glow: '#F6E4FF',
                 shell: '#EEE4FC', shellL: '#FCF8FF', shellD: '#C9B6EC', speck: '#AA8CE2', inner: '#A894CC', crack: '#7A62A8' }),
    butter: mk({ coat: '#FFD874', coatL: '#FFEEB4', coatD: '#EFB548', belly: '#FFF9E6', bellyD: '#F3E2B6', far: '#DBA23C', spot: '#F3B846',
                 scute: '#B48EEA', scuteD: '#906ACC', iris: '#B4742A', glow: '#FFF8D0',
                 shell: '#FFF3CA', shellL: '#FFFCEA', shellD: '#ECCE88', speck: '#EDB850', inner: '#CDB070', crack: '#A8843A' }),
    sky:    mk({ coat: '#86CAF6', coatL: '#C0E6FF', coatD: '#5AA6E0', belly: '#FFF7E2', bellyD: '#EFDFB4', far: '#4A92CC', spot: '#5CABE8',
                 scute: '#FF9EC0', scuteD: '#EC78A0', iris: '#3478C8', glow: '#E0F3FF',
                 shell: '#DEF0FD', shellL: '#F6FBFF', shellD: '#A9CEEC', speck: '#66B0E8', inner: '#8CB0CC', crack: '#4E7FA8' }),
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['coat', 'coatL', 'coatD', 'far', 'spot', 'shell', 'shellD'];   // one list: both rigs share the palette cache

  // ═══ THE EGG ═══════════════════════════════════════════════════════════════
  // centre (0, −26), 44 wide; the lower half is 26 tall, the upper 30. The lid
  // is everything above the zig-zag seam ZIG (its ends lie on the shell).
  const EH = 56, ECY = -26, ERX = 22, ERT = 30, ERB = 26, RB = ERX * ERX / ERB;
  const ZIG = [[-21.4, -33], [-16, -37.5], [-10, -30.5], [-3.5, -38], [3, -31], [9.5, -38], [15.5, -31.5], [21.2, -34]];
  const A_L = PI + Math.asin(7 / ERT), A_R = -Math.asin(8 / ERT);     // the seam's ends as angles on the upper ellipse
  const BRANCH = [                                                   // side cracks: [threshold, on the lid?, points…]
    [0.35, 0, [[-10, -30.5], [-12.5, -25], [-8.5, -21.5], [-11, -16.5]]],
    [0.5, 1, [[9.5, -38], [12, -43], [8.5, -46.5], [10.5, -51]]],
    [0.62, 0, [[3, -31], [6.5, -26.5], [4, -22.5]]],
    [0.74, 1, [[-3.5, -38], [-6.5, -43.5], [-3.5, -47.5]]],
    [0.84, 0, [[15.5, -31.5], [13, -26], [16, -22]]],
  ];
  // speckles [x, y, rx, ry, rot, alpha]: a few soft blotches and a scatter of dots, all inside the shell
  const SPECK = [[-9, -14, 4.6, 3.4, 0.4, 0.4], [10, -40, 3.8, 3, -0.3, 0.38], [8, -9, 3.4, 2.6, 0.2, 0.36], [-12, -43, 2.8, 2.2, 0.5, 0.36]];
  for (let i = 0; SPECK.length < 19 && i < 80; i++){
    const x = (psr(i * 3 + 1) - 0.5) * 38, y = -3 - psr(i * 5 + 2) * 50, ry = y < ECY ? ERT : ERB;
    if ((x * x) / (ERX * ERX) + ((y - ECY) * (y - ECY)) / (ry * ry) > 0.72) continue;
    const r = 1 + psr(i * 7 + 3) * 1.5;
    SPECK.push([x, y, r * 1.25, r, psr(i * 11) * 3, 0.75]);
  }
  const eggPath = g => { g.beginPath(); g.ellipse(0, ECY, ERX, ERT, 0, PI, TAU); g.ellipse(0, ECY, ERX, ERB, 0, 0, PI); g.closePath(); };
  const seam = (g, dy) => { for (let i = 1; i < ZIG.length; i++) g.lineTo(ZIG[i][0], ZIG[i][1] + dy); };
  const lidPath = g => { g.beginPath(); g.moveTo(ZIG[0][0], ZIG[0][1]); seam(g, 0); g.ellipse(0, ECY, ERX, ERT, 0, A_R, A_L - TAU, true); g.closePath(); };
  const lowPath = g => {
    g.beginPath(); g.moveTo(ZIG[0][0], ZIG[0][1]); seam(g, 0);
    g.ellipse(0, ECY, ERX, ERT, 0, A_R, 0); g.ellipse(0, ECY, ERX, ERB, 0, 0, PI); g.ellipse(0, ECY, ERX, ERT, 0, PI, A_L); g.closePath();
  };
  // the shell's skin on one piece: a soft top-to-bottom gradient, a sheen, speckles
  function eggSkin(g, C, path, clip){
    path(g); g.fillStyle = lg(g, 0, -EH, 0, 0, [[0, C.shellL], [0.45, C.shell], [1, C.shellD]]); g.fill();
    if (clip){ g.save(); path(g); g.clip(); }
    g.fillStyle = rg(g, -6, -37, 0, 14, [[0, alpha(C.shellL, 0.9)], [1, alpha(C.shellL, 0)]]);       // (it stays inside the shell)
    g.beginPath(); g.arc(-6, -37, 14, 0, TAU); g.fill();
    for (let i = 0; i < SPECK.length; i++){
      const s = SPECK[i];
      g.fillStyle = alpha(C.speck, s[5]);
      g.beginPath(); g.ellipse(s[0], s[1], s[2], s[3], s[4], 0, TAU); g.fill();
    }
    if (clip) g.restore();
  }
  // part of a polyline, from parameter u0 to u1 (in segments)
  function polyPart(g, P, u0, u1){
    const n = P.length - 1; if (u1 <= u0) return;
    let i = Math.min(n - 1, Math.floor(u0)), f = u0 - i;
    g.moveTo(lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f));
    for (i++; i <= u1 && i <= n; i++) g.lineTo(P[i][0], P[i][1]);
    if (i <= n && u1 > i - 1){ f = u1 - (i - 1); g.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); }
  }
  // cracks: part 0 = the seam and every side crack (a whole egg), 1 = the lower shell's, 2 = the lid's
  function cracks(g, C, c, part){
    g.strokeStyle = alpha(C.crack, 0.8); g.lineWidth = 1.15; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath();
    if (!part){
      const n = ZIG.length - 1, m = n * 0.6, k = clamp01(c * 1.35);
      polyPart(g, ZIG, m * (1 - k), m + (n - m) * k);
    }
    for (let i = 0; i < BRANCH.length; i++){
      const b = BRANCH[i]; if (part && part !== b[1] + 1) continue;
      polyPart(g, b[2], 0, clamp01((c - b[0]) / 0.25) * (b[2].length - 1));
    }
    g.stroke();
  }

  // ═══ THE BABY'S HEAD (shared: it peeks out of the egg, then walks about) ═══
  // head space: the middle of the skull at (0, 0), the short snout toward +x.
  const HEAD = [[-12, 1], [-11, -8.5], [-4, -14.8], [6, -15.2], [14, -11.5], [20.5, -6.5], [26, -3], [28, 2], [25, 6.4], [15, 7.6], [4, 8.6], [-7, 8]];
  const JAWP = [[1, 6.6], [12, 7], [23.5, 6], [25.4, 8.4], [21, 11.6], [11, 13], [2, 12.2], [-2, 9.4]];
  const HNX = 3, HNY = 7, MOUTH = [26, 6.5];              // the jaw's hinge; where a squeak comes out
  const CAPZ = [[-11, -10.5], [-8, -13.6], [-4.8, -10.2], [-1.4, -13.8], [2, -10.6], [5.4, -13.6], [9, -11]];
  // a soft pink cheek (a radial glow, so it stays pink on the green and blue coats)
  function blush(g, C, x, y, r){
    g.save(); g.translate(x, y); g.scale(1, 0.66);
    g.fillStyle = rg(g, 0, 0, 0, r, [[0, alpha(C.cheek, 0.9)], [0.5, alpha(C.cheek, 0.6)], [1, alpha(C.cheek, 0)]]);
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.restore();
  }
  // a piece of eggshell worn as a cap, tilted by `a`
  function capPiece(g, C, a){
    g.save(); g.translate(-1, -12); g.rotate(a); g.translate(1, 12);
    g.beginPath(); g.moveTo(CAPZ[0][0], CAPZ[0][1]);
    for (let i = 1; i < CAPZ.length; i++) g.lineTo(CAPZ[i][0], CAPZ[i][1]);
    g.bezierCurveTo(9.6, -18, 5, -22.4, -1, -22.4); g.bezierCurveTo(-7, -22.4, -11.6, -18, -11, -10.5);
    g.closePath();
    g.fillStyle = lg(g, 0, -22.4, 0, -10, [[0, C.shellL], [0.5, C.shell], [1, C.shellD]]); g.fill();
    g.fillStyle = alpha(C.speck, 0.75);
    g.beginPath(); g.ellipse(-5.4, -16.6, 1.7, 1.3, 0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(1.6, -19, 1.4, 1.1, -0.3, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(5.2, -15.2, 1.1, 0.9, 0.2, 0, TAU); g.fill();
    g.restore();
  }
  // J = how far the mouth is open, eyeH = the eye's height (blinks), cap = wear the shell
  function babyHead(g, C, J, eyeH, gaze, cap, capA){
    const jaw = 0.44 * J;
    g.fillStyle = lg(g, 0, -13, 0, 0, [[0, C.scute], [1, C.scuteD]]);        // two little bumps down the back of the head
    g.beginPath(); g.moveTo(-6.1, -10.6); g.arc(-9.4, -10.6, 3.3, 0, TAU); g.moveTo(-9.6, -3.4); g.arc(-12.5, -3.4, 2.9, 0, TAU); g.fill();
    if (J > 0.03){                                        // the throat, back at the hinge
      g.fillStyle = C.mouth;
      g.beginPath(); g.moveTo(HNX - 2.5, HNY - 1.5); g.lineTo(HNX + 10, HNY - 0.6);
      g.lineTo(HNX + 10 * Math.cos(jaw), HNY + 10 * Math.sin(jaw) + 0.5); g.lineTo(HNX - 2.5, HNY + 3); g.closePath(); g.fill();
    }
    g.save();                                             // the cream lower jaw on its hinge
    g.translate(HNX, HNY); g.rotate(jaw); g.translate(-HNX, -HNY);
    if (J > 0.08){
      g.fillStyle = C.tongue; g.beginPath(); g.ellipse(14, 6.9 - 0.8 * J, 7, 0.8 + 2 * J, -0.03, 0, TAU); g.fill();
    }
    g.fillStyle = lg(g, 0, 6, 0, 13, [[0, C.belly], [1, C.bellyD]]);
    blob(g, JAWP, 5.5); g.fill();
    g.restore();
    g.fillStyle = C.tooth;                                // one tiny tooth
    g.beginPath(); g.arc(21.6, 6.8, 1.7, 0, TAU); g.fill();
    const skull = () => blob(g, HEAD, 5.5);
    g.fillStyle = lg(g, 0, -15, 0, 9, [[0, C.coatL], [0.55, C.coat], [1, C.coatD]]);
    skull(); g.fill();
    blush(g, C, 15.5, 3.2, 5.2);
    rim(g, skull, -7, alpha(C.glow, 0.8), 1.3);
    g.fillStyle = alpha(C.line, 0.45);                    // nostril
    g.beginPath(); g.ellipse(24.8, -1.4, 0.9, 1.3, 0.3, 0, TAU); g.fill();
    if (J < 0.15){                                        // the corner of a smile
      g.strokeStyle = alpha(C.line, 0.5); g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(11, 8); g.quadraticCurveTo(6.4, 8.6, 4.4, 5.2); g.stroke();
    }
    eye(g, 7, -3.6, 6.8, 7.6, eyeH, gaze, C, { iris: 0.8, lid: 1.3 });       // ONE big eye
    brow(g, C.coatD, 1, -12, 7.5, -14.3, 13.6, -10.9, 1.6);
    if (cap) capPiece(g, C, capA);
  }
  // a little mitten of a hand, the fingers toward `a`
  function hand(g, C, x, y, a, fill){
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = fill;
    g.beginPath(); g.ellipse(0.6, 0, 3.6, 3, 0, 0, TAU); g.fill();
    g.fillStyle = C.claw;
    for (let i = -1; i <= 1; i++){ g.beginPath(); g.ellipse(3.6, i * 1.9, 1.5, 0.95, i * 0.3, 0, TAU); g.fill(); }
    g.restore();
  }

  // ═══ EggRig.draw ═══════════════════════════════════════════════════════════
  // the FAR rim of a piece: the same zig-zag half a tooth along, filled back to
  //    y = base inside the piece — its teeth show between the near rim's
  function rimStrip(g, base){
    const n = ZIG.length - 1;
    g.beginPath(); g.moveTo(ZIG[0][0], ZIG[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(ZIG[i][0] + 3.3, ZIG[i][1]);
    g.lineTo(ZIG[n][0], ZIG[n][1]); g.lineTo(ZIG[n][0] - 2, base); g.lineTo(ZIG[0][0] + 2, base);
    g.closePath();
  }
  const gauss = (v, c, w) => Math.exp(-((v - c) / w) * ((v - c) / w));
  function drawEgg(ctx, L, t){
    const C = palette(PALS[L.coat] || PALS.mint, TINTED, L.tint, L.lit);
    const ph = L.ph || 0, empty = !!L.empty, wob = clamp01(L.wobble || 0);
    const h = empty ? 1 : clamp01(L.hatch || 0);
    // the lid: pop → it tips open (the eye) → swings right back (the head) → drops open behind
    const pop = smooth(clamp01(h / 0.1)), open = smooth(clamp01((h - 0.1) / 0.26));
    const crack = Math.max(clamp01(L.crack || 0), pop);   // the side cracks finish as the lid pops
    const wide = smooth(clamp01((h - 0.36) / 0.24)), fall = smooth(clamp01((h - 0.6) / 0.18));
    const jolt = h > 0 && h < 0.36 ? Math.sin(h * 110) * 0.035 * (1 - open) : 0;
    const th = wob * (0.2 * Math.sin(t * 8.5 + ph) + 0.06 * Math.sin(t * 19.3 + ph * 2)) + jolt;
    ctx.save();
    ctx.translate(L.x, L.y); ctx.scale(L.s * (L.dir || 1), L.s);
    ctx.translate(RB * th, -RB); ctx.rotate(th); ctx.translate(0, RB);        // it rolls on its round bottom
    if (h <= 0){
      eggSkin(ctx, C, eggPath, false);
      if (crack > 0) cracks(ctx, C, crack, 0);
      ctx.restore(); return;
    }
    const settle = clamp01((h - 0.78) / 0.2);
    // … and it ends upside down on the ground behind the shell, leaning on it like a bowl
    const la = -(0.1 * pop + 0.42 * open + 0.75 * wide + 2.12 * fall) + Math.sin(settle * PI * 3) * 0.08 * (1 - settle) - jolt * 2;
    const hx = ZIG[0][0] - 7 * wide + 24 * fall, hy = ZIG[0][1] - 2 * wide + 6.5 * fall - 9 * Math.sin(PI * fall);
    const lidFrame = () => { ctx.translate(hx, hy); ctx.rotate(la); ctx.translate(-ZIG[0][0], -ZIG[0][1]); };
    const lidSkin = () => { ctx.save(); lidFrame(); eggSkin(ctx, C, lidPath, true); cracks(ctx, C, crack, 2); ctx.restore(); };
    ctx.save(); lidFrame(); ctx.fillStyle = C.inner; rimStrip(ctx, -42); ctx.fill(); ctx.restore();   // the lid's far rim, behind everything
    if (fall > 0) lidSkin();                              // the lid open, behind the shell
    ctx.fillStyle = C.inner; rimStrip(ctx, -27); ctx.fill();                  // the far rim of the lower shell
    if (fall <= 0){                                       // the dark inside, in the gap under the lid
      const n = ZIG.length - 1, dx = ZIG[n][0] - ZIG[0][0], dy = ZIG[n][1] - ZIG[0][1], c = Math.cos(la), s = Math.sin(la);
      ctx.fillStyle = alpha(C.crack, 0.9 * (1 - smooth(clamp01((-la - 0.5) / 0.45))));
      ctx.beginPath(); ctx.moveTo(ZIG[0][0], ZIG[0][1]); seam(ctx, 0);
      ctx.lineTo(hx + dx * c - dy * s, hy + dx * s + dy * c); ctx.lineTo(hx, hy); ctx.closePath(); ctx.fill();
    }
    if (!empty){
      // the baby: curled up inside, it pushes its head up into the gap, then right out
      const r1 = smooth(clamp01((h - 0.02) / 0.28)), sq = h > 0.7 && h < 0.94 ? Math.sin(PI * (h - 0.7) / 0.24) : 0;
      const out = h >= 0.6 ? 1 : 0;
      const bx = lerp(-6, -2.5, r1) + 3.5 * wide, by = lerp(-27, -38, r1) - 8 * wide - 2 * sq + out * Math.sin(t * 2.1 + ph) * 0.6;
      const br = lerp(0.35, 0.1, r1) - 0.16 * wide - 0.1 * sq + out * Math.sin(t * 1.3 + ph) * 0.03;
      const cy = Math.min(by + 19, -17);                  // its back, down in the shell
      ctx.fillStyle = lg(ctx, 0, cy - 12, 0, cy + 12, [[0, C.coat], [1, C.coatD]]);
      ctx.beginPath(); ctx.ellipse(bx - 3, cy, 10, 12, 0.1, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(br);
      const eyeH = h < 0.6 ? 1 - gauss(h, 0.2, 0.016) - gauss(h, 0.285, 0.016) : (1 - blink(t, ph)) * (1 - 0.2 * sq);
      babyHead(ctx, C, sq, Math.max(0.08, eyeH), h < 0.36 ? Math.sin(h * 38) * 0.7 : 0.35 + Math.sin(t * 0.5 + ph) * 0.3,
               L.cap !== false, -0.12 + Math.sin(t * 2.1 + ph) * 0.03 * out);
      if (sq > 0) rings(ctx, MOUTH[0] + 5, MOUTH[1], clamp01((h - 0.7) / 0.24), C.line, 0.6, 0.5);
      ctx.restore();
    }
    eggSkin(ctx, C, lowPath, true); cracks(ctx, C, crack, 1);             // the lower shell, in front of it
    if (fall <= 0) lidSkin();                             // the lid, still over its head
    if (pop < 1){                                         // the seam is still a crack as the lid starts to lift
      ctx.strokeStyle = alpha(C.crack, 0.8 * (1 - pop)); ctx.lineWidth = 1.15; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ZIG[0][0], ZIG[0][1]); seam(ctx, 0); ctx.stroke();
    }
    if (!empty && wide > 0.5) hand(ctx, C, 17, -35.4 + 3 * (1 - wide), 1.25, C.coat);   // a hand on the rim
    for (let k = 0; k < 5; k++){                          // bits of shell fly off the seam
      const u = (h - 0.03 - k * 0.07) / 0.3; if (u <= 0 || u >= 1) continue;
      const z = ZIG[1 + k], vx = (k - 2) * 9 + (k & 1 ? 4 : -4);
      ctx.save();
      ctx.translate(z[0] + vx * u, Math.min(-1.5, z[1] - 26 * u + 62 * u * u)); ctx.rotate(u * 7 + k);
      ctx.globalAlpha = u > 0.75 ? (1 - u) * 4 : 1;
      ctx.fillStyle = k & 1 ? C.shell : C.shellD;
      ctx.beginPath(); ctx.moveTo(-3.2, 2); ctx.lineTo(0.5, -3); ctx.lineTo(3.2, 1.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  window.EggRig = { draw: drawEgg, HEIGHT: EH, WIDTH: 23, COATS };

  // ═══ BabyRig ═══════════════════════════════════════════════════════════════
  // unit space: feet on y = 0, facing +x. A pear of a body over two stubby legs
  // (the knee tucked up under the belly, the ankle pointing back), the big head
  // sitting straight on it.
  const WALK = { stride: 26, duty: 0.6, lift: 6.5, lean: 30, sw: -0.5 };
  const RUN  = { stride: 46, duty: 0.4, lift: 9.5, lean: 34, sw: -0.9 };
  const BBODY = [[9, -27], [6.5, -35], [-3, -38], [-12, -34], [-17, -25], [-16, -15], [-8, -9.5], [3, -10], [9.5, -17]];
  const BHP = [-4, -17], BFREST = -3, BFAR = 3.5, BFOLD = -0.2, BTOE = 3;
  const BLEN = [8, 8.5, 6], BLW = [10.5, 8.4, 6, 5.6];
  const BHC = [6.5, -41.5], BSH = [6.5, -25.5], ARM = [6, 5.5];
  const BSPOTS = [[-9, -30, 2.6], [-13.4, -23, 2.1], [-6, -34.6, 1.7]];
  const BSCUTE = [[-13.6, -32, 2.7], [-17.4, -24, 2.5]];

  // ── the pose, solved once per draw (and by mouth): a SHARED scratch
  const Q = {};
  let lastTB = 0;
  function solveB(L, t){
    const ph = Q.ph = L.ph || 0, go = Q.go = L.go != null ? L.go : (L.moving ? 1 : 0);
    const run = Q.run = L.run ? go : 0, G = Q.G = L.run ? RUN : WALK;
    const cyc = Q.cyc = (L.wt || 0) / TAU, p = Q.p = clamp01(L.pose || 0);
    // the squeak-hop: a crouch (0–.18), up and down (.18–.62), a squashy landing (.62–.84)
    const air = Q.air = p > 0.18 && p < 0.62 ? Math.sin(PI * (p - 0.18) / 0.44) : 0;
    const crouch = p <= 0 ? 0 : p < 0.18 ? smooth(p / 0.18) : 1 - smooth(clamp01((p - 0.18) / 0.08));
    const land = p > 0.62 && p < 0.84 ? Math.sin(PI * (p - 0.62) / 0.22) : 0;
    const K = Q.K = p > 0 ? smooth(clamp01(p / 0.16)) * smooth(clamp01((1 - p) / 0.2)) : 0;
    Q.J = p > 0 ? smooth(clamp01((p - 0.14) / 0.12)) * smooth(clamp01((0.86 - p) / 0.16)) : 0;
    Q.gg = go * (1 - K);                                                     // how much the feet are in the gait
    const gw = Q.gg * (1 - run), gr = Q.gg * run;
    Q.hop = 15 * air; Q.squat = crouch + land;
    Q.sy = 1 - 0.09 * Q.squat + 0.05 * air;                                  // squash and stretch of the body
    // walk = a toddle: two little bobs a cycle and a rock back and forth; run = a scurry, tipped forward
    const drop = gw * 1.2 * Math.sin(2 * TAU * cyc + 0.6) + gr * 2 * Math.cos(2 * TAU * (cyc - G.duty / 2));
    Q.oy = drop + 3.2 * crouch + 2.6 * land - Q.hop + Math.sin(t * 1.6 + ph) * 0.35 * (1 - go);
    Q.ox = gw * 0.9 * Math.sin(TAU * cyc + 0.4);
    Q.pitch = gw * (0.03 + 0.075 * Math.sin(TAU * cyc + 0.3)) + gr * (0.3 + 0.04 * Math.sin(2 * TAU * cyc)) + 0.1 * crouch - 0.12 * air + 0.06 * land;
    const tilt = Math.pow(Math.max(0, Math.sin(t * 0.31 + ph * 1.7)), 12) * (1 - go) * (1 - K);   // a curious tilt now and then
    Q.hx = BHC[0] + 2.5 * gr; Q.hy = BHC[1] + 2 * gr + (1 - Q.sy) * 27;
    Q.hrot = -Q.pitch * 0.6 + gw * 0.07 * Math.sin(2 * TAU * cyc + 1.8) + Math.sin(t * 0.6 + ph) * 0.035 - 0.17 * tilt - 0.42 * K * (0.5 + 0.5 * air);
    return Q;
  }
  function mouthB(L, t){
    solveB(L, t == null ? lastTB : t);
    const c = Math.cos(Q.hrot), s = Math.sin(Q.hrot);
    const r = xf(Q.hx + MOUTH[0] * c - MOUTH[1] * s, Q.hy + MOUTH[0] * s + MOUTH[1] * c, BHP[0], BHP[1], Q.pitch, Q.ox, Q.oy);
    return { x: L.x + r[0] * L.s * (L.dir || 1), y: L.y + r[1] * L.s };
  }
  // the big foot, in foot space: the toe joint at (0, 0), the sole on y = BTOE
  function bfoot(g, C, x, y, rot, far, fill){
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = fill;
    g.beginPath(); g.moveTo(-4.8, 0.4); g.quadraticCurveTo(-4.8, -3.7, 0, -3.5); g.quadraticCurveTo(6.4, -3.1, 9.8, -0.4);
    g.quadraticCurveTo(11.8, 1.4, 10.6, 3); g.lineTo(-3, 3); g.quadraticCurveTo(-4.8, 2.6, -4.8, 0.4); g.fill();
    g.fillStyle = far ? C.bellyD : C.claw;                // three round little claws
    for (let i = 0; i < 3; i++){ g.beginPath(); g.ellipse(10.5 - i * 3, 2 - i * 0.1, 1.9, 1.45, 0, 0, TAU); g.fill(); }
    g.restore();
  }
  // a little arm from the shoulder: upper arm along a1, forearm along a2, a mitten
  const AP = [[0, 0], [0, 0], [0, 0]], AW = [5.6, 4.6, 4];
  function arm(g, C, x, y, a1, a2, fill){
    AP[0][0] = x; AP[0][1] = y;
    AP[1][0] = x + Math.cos(a1) * ARM[0]; AP[1][1] = y + Math.sin(a1) * ARM[0];
    AP[2][0] = AP[1][0] + Math.cos(a2) * ARM[1]; AP[2][1] = AP[1][1] + Math.sin(a2) * ARM[1];
    limb(g, AP, AW, fill);
    hand(g, C, AP[2][0] + Math.cos(a2) * 1.6, AP[2][1] + Math.sin(a2) * 1.6, a2, fill);
  }

  const BT = [[-12, -20], [-19, -19.5], [0, 0], [0, 0]];
  function drawBaby(ctx, L, t){
    lastTB = t;
    const C = palette(PALS[L.coat] || PALS.mint, TINTED, L.tint, L.lit);
    solveB(L, t);
    const ph = Q.ph, G = Q.G, cyc = Q.cyc, gg = Q.gg, K = Q.K, air = Q.air, pitch = Q.pitch, ox = Q.ox, oy = Q.oy, p = Q.p;
    const go = Q.go, run = gg * Q.run, gw = gg - run, feetUp = Math.max(0, Q.hop - 2) * 0.9;
    ctx.save();
    ctx.translate(L.x, L.y); ctx.scale(L.s * (L.dir || 1), L.s);
    const coatG = lg(ctx, 0, -40, 0, -6, [[0, C.coatL], [0.45, C.coat], [1, C.coatD]]);

    function oneLeg(far){
      const st = step(cyc + (far ? 0.5 : 0), G.duty);
      const reach = st.x * G.stride * gg, lift = st.lift * G.lift * gg + feetUp;
      const swing = st.sw ? Math.sin(PI * st.sw) * gg : 0, fo = far ? BFAR : 0, fill = far ? C.far : C.coat;
      const fold = BFOLD - reach / G.lean + swing * G.sw + 0.45 * air;
      const ch = leg(ctx, BHP[0] + fo + ox, BHP[1] + oy, BFREST + fo + reach, -lift - BTOE, BLEN[0], BLEN[1], BLEN[2], BLW, 1, fold, fill);
      bfoot(ctx, C, ch[3][0], ch[3][1], swing * (1 - 1.5 * st.sw) + 0.5 * air, far, fill);   // toes droop, then lift to land
    }
    function oneArm(far){
      const o = far ? PI : 0;
      let a1 = 1.0 + Math.sin(t * 1.3 + ph + o) * 0.06 + gw * (-0.45 + 0.5 * Math.sin(TAU * cyc + PI + o));
      a1 = lerp(a1, 0.25 + 0.36 * Math.sin(2 * TAU * cyc + o * 0.6), run);   // the scurry: paddling out in front
      a1 = lerp(a1, -0.1 + 0.28 * Math.sin(p * TAU * 4 + o), K);             // the hop: arms up, waving
      arm(ctx, C, BSH[0] + (far ? 3 : 0), BSH[1] - (far ? 0.6 : 0), a1, a1 - lerp(lerp(0.65, 0.5, run), 0.4, K), far ? C.far : C.coat);
    }
    const bodyFrame = () => { ctx.translate(ox + BHP[0], oy + BHP[1]); ctx.rotate(pitch); ctx.translate(-BHP[0], -BHP[1]); };

    ctx.save(); bodyFrame(); oneArm(true); ctx.restore();  // the far arm and leg, behind
    oneLeg(true);

    // ── the stubby tail, the pear of a body
    ctx.save(); bodyFrame();
    const wag = Math.sin(t * 2.2 + ph) * 2.2 * (1 - go) + gw * 3 * Math.sin(TAU * cyc + 1) + run * 1.6 * Math.sin(2 * TAU * cyc);
    BT[2][0] = -25; BT[2][1] = -18.4 + wag * 0.5 - 3 * run - 4 * K;
    BT[3][0] = -29 + 1.5 * K; BT[3][1] = -15.5 + wag - 8 * run - 10 * K;
    taper(ctx, BT, 14, 3.4, coatG);
    ctx.translate(0, -10); ctx.scale(1 + (1 - Q.sy) * 0.6, Q.sy); ctx.translate(0, 10);   // squash and stretch
    ctx.fillStyle = lg(ctx, 0, -35, 0, -20, [[0, C.scute], [1, C.scuteD]]);                // two bumps down the back
    ctx.beginPath();
    for (let i = 0; i < BSCUTE.length; i++){ const s = BSCUTE[i]; ctx.moveTo(s[0] + s[2], s[1]); ctx.arc(s[0], s[1], s[2], 0, TAU); }
    ctx.fill();
    const body = () => blob(ctx, BBODY, 5.5);
    ctx.fillStyle = coatG; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lg(ctx, 0, -30, 0, -9, [[0, C.belly], [1, C.bellyD]]);
    ctx.beginPath(); ctx.ellipse(5, -19, 8.6, 11.5, 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = alpha(C.spot, 0.6);
    for (let i = 0; i < BSPOTS.length; i++){ const s = BSPOTS[i]; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, TAU); ctx.fill(); }
    ctx.restore();
    rim(ctx, body, -27, alpha(C.glow, 0.8), 1.4);
    ctx.restore();

    oneLeg(false);                                        // the near leg, in front

    // ── the big head, then the near arm over it
    ctx.save(); bodyFrame();
    ctx.save();
    ctx.translate(Q.hx, Q.hy); ctx.rotate(Q.hrot);
    const capA = -0.12 + gw * 0.07 * Math.sin(2 * TAU * cyc + 2.6) + run * 0.1 * Math.sin(2 * TAU * cyc + 2) - 0.2 * Q.squat * (p > 0.6 ? 1 : 0) + 0.1 * air;
    babyHead(ctx, C, Math.max(Q.J, 0.25 * run), Math.max(0.08, 1 - blink(t, ph, 0.5)) * (1 + 0.05 * K),
             0.3 + Math.sin(t * 0.5 + ph) * 0.4, L.cap !== false, capA);
    rings(ctx, MOUTH[0] + 5, MOUTH[1], p > 0.2 && p < 0.8 ? frac((p - 0.2) / 0.3) : 0, C.line, 0.6, 0.5);
    ctx.restore();
    oneArm(false);
    ctx.restore();

    if (p > 0.26 && p < 0.97){                            // a little heart pops above it
      const q = (p - 0.26) / 0.71, a = Math.min(1, q * 6) * (1 - smooth(clamp01((q - 0.62) / 0.38)));
      heart(ctx, 15 + Math.sin(q * 8) * 1.8, -74 - 14 * q - Q.hop * 0.5, 2.4 + 2.6 * smooth(clamp01(q * 5)), alpha(C.heart, a));
    }
    ctx.restore();
  }
  window.BabyRig = { draw: drawBaby, mouth: mouthB, HEIGHT: 63, WIDTH: 34, STRIDE: WALK.stride, RUN_STRIDE: RUN.stride,
                     ACT_SECONDS: 1.3, WALK_CPS: 1.5, RUN_CPS: 3.2, COATS };
})();
