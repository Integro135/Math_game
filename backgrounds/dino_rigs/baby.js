/* ── baby.js — a BABY T-REX hatching from its egg, drawn from scratch ────────
   One of the from-scratch dinosaur rigs (workshop: backgrounds/dino_rigs/
   dinos.html). Shared helpers: rig-common.js (window.DinoRig). The
   from-scratch successor of dinasours/baby-trex-egg.js, in the same house
   style as trex.js.

   THE LOOK: a big speckled cream egg resting on the ground, a zigzag crack
   running round its upper third. Inside — a round-headed hatchling with
   HUGE glossy eyes, soft brows, a cream muzzle with three tiny pearly
   teeth, blushing cheeks, two little accent-coloured head bumps, and a
   piece of eggshell perched on its head like a hat. Two tiny clawed hands
   grip the rim.

   ALIVE: the egg rests closed, rattling now and then; the baby blinks and
   looks around when it is out. pose 0..1 = HATCH: the lid pops up and
   tilts back, the baby rises out of the dark opening, its hands grab the
   rim, it blinks and wobbles, a little heart floats up — then it sinks back
   and the lid settles shut.

   API — window.BabyRig
     draw(ctx, L, t)   L = { x, y, s, dir, ph, wt, moving, pose, pal, tint }
       unit space: the egg's base on y = 0, facing +x; ~72 units tall
       closed, ~112 with the baby out
     HEIGHT 112, WIDTH 34 (half-width), PALS, DEFAULT 'green', ACT_SECONDS 3.6
   ES2015, file:// safe, depends only on rig-common.js. */
(function(){
  const { TAU, psr, lg, rg, alpha, palette, blob, eye, blink, brow, heart } = window.DinoRig;
  const PALS = ['green', 'pink', 'teal', 'violet', 'sun'];
  const EGG = { cx: 0, cy: -30, rx: 25, ryB: 30, ryT: 38, crackY: -47 };
  const RIGHT = Math.asin((EGG.crackY - EGG.cy) / EGG.ryT);          // ellipse angle of the crack's right end
  const ZIG = [[-22.4, -47], [-16, -51], [-9, -44.5], [-2, -51.5], [5, -45], [12, -50.5], [18, -45.5], [22.4, -47]];

  function lidPath(g){
    g.beginPath(); g.moveTo(ZIG[0][0], ZIG[0][1]);
    for (let i = 1; i < ZIG.length; i++) g.lineTo(ZIG[i][0], ZIG[i][1]);
    g.ellipse(EGG.cx, EGG.cy, EGG.rx, EGG.ryT, 0, RIGHT, -Math.PI - RIGHT, true);
    g.closePath();
  }
  function shellPath(g){
    g.beginPath(); g.moveTo(ZIG[0][0], ZIG[0][1]);
    for (let i = 1; i < ZIG.length; i++) g.lineTo(ZIG[i][0], ZIG[i][1]);
    g.ellipse(EGG.cx, EGG.cy, EGG.rx, EGG.ryT, 0, RIGHT, 0, false);
    g.ellipse(EGG.cx, EGG.cy, EGG.rx, EGG.ryB, 0, 0, Math.PI, false);
    g.ellipse(EGG.cx, EGG.cy, EGG.rx, EGG.ryT, 0, Math.PI, Math.PI - RIGHT, false);
    g.closePath();
  }
  // egg skin painted inside the current clip: warm cream gradient, a sheen, speckles
  function eggSkin(g, C){
    g.fillStyle = lg(g, 0, -68, 0, 0, [[0, '#FFF8E6'], [0.55, '#F3E2BF'], [1, '#D9BF92']]);
    g.fillRect(-30, -70, 60, 72);
    g.fillStyle = rg(g, -8, -48, 0, 22, [[0, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.arc(-8, -48, 22, 0, TAU); g.fill();
    g.fillStyle = alpha(C.accentD, 0.28);
    for (let i = 0; i < 16; i++){
      const a = psr(i * 3 + 1), b = psr(i * 5 + 2);
      const px = (a - 0.5) * 44, py = -6 - b * 58, r = 1.2 + psr(i * 7) * 1.6;
      g.beginPath(); g.ellipse(px, py, r * 1.3, r, a * 3, 0, TAU); g.fill();
    }
  }

  function drawBaby(g, C, t, ph, K, out){
    // body (mostly hidden below the rim) then the head
    g.fillStyle = lg(g, 0, 8, 0, 40, [[0, C.body], [1, C.bodyD]]);
    g.beginPath(); g.ellipse(0, 26, 13, 18, 0, 0, TAU); g.fill();
    g.fillStyle = C.belly;
    g.beginPath(); g.ellipse(3, 30, 8, 12, 0, 0, TAU); g.fill();
    // the head faces the viewer straight on (the one rig that is not a profile)
    const head = () => blob(g, [[-18.5, -2], [-15.5, -13], [-5, -19.5], [5, -19.5], [15.5, -13], [18.5, -2], [16.5, 8], [9, 13.5], [-9, 13.5], [-16.5, 8]], 5.5);
    g.fillStyle = lg(g, 0, -20, 0, 14, [[0, C.bodyL], [0.55, C.body], [1, C.bodyD]]);
    head(); g.fill();
    g.save(); head(); g.clip();
    g.fillStyle = rg(g, 0, -8, 0, 16, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.arc(0, -8, 16, 0, TAU); g.fill();
    g.fillStyle = alpha(C.belly, 0.95);
    g.beginPath(); g.ellipse(0, 7.5, 11, 6.2, 0, 0, TAU); g.fill();           // cream muzzle
    g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(-13.5, 4, 3.6, 2.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(13.5, 4, 3.6, 2.4, 0, 0, TAU); g.fill();
    g.restore();
    // mouth + three tiny teeth, two nostrils
    g.strokeStyle = alpha(C.line, 0.6); g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-8, 9); g.quadraticCurveTo(0, 13, 8, 9); g.stroke();
    g.fillStyle = C.tooth;
    for (const tx of [-3.6, 0, 3.6]){ const y0 = 10.4 + (1 - Math.abs(tx) / 3.6) * 0.6; g.beginPath(); g.moveTo(tx - 1.2, y0); g.lineTo(tx, y0 + 2.8); g.lineTo(tx + 1.2, y0); g.closePath(); g.fill(); }
    g.fillStyle = alpha(C.line, 0.6);
    g.beginPath(); g.ellipse(-2.6, 3.2, 1, 0.7, 0.3, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(2.6, 3.2, 1, 0.7, -0.3, 0, TAU); g.fill();
    // two little head bumps in the accent colour
    g.fillStyle = lg(g, 0, -24, 0, -17, [[0, C.accentL], [1, C.accent]]);
    g.beginPath(); g.arc(-4.5, -19, 3, 0, TAU); g.fill();
    g.beginPath(); g.arc(3.5, -19.5, 2.6, 0, TAU); g.fill();
    // huge eyes (the baby looks straight at you), soft brows
    const eyeH = Math.max(0.08, 1 - blink(t, ph, 0.7)) * out;
    const gaze = Math.sin(t * 1.3 + ph) * 0.8;
    eye(g, 7.5, -4.5, 6.2, 6.8, eyeH, gaze, C, { iris: 0.74 });
    eye(g, -7.5, -4.5, 6.2, 6.8, eyeH, gaze, C, { iris: 0.74 });
    brow(g, C, 1.5, -12.5, 7.5, -14.8, 13.5, -12.2, 1.9);
    brow(g, C, -13.5, -12.2, -7.5, -14.8, -1.5, -12.5, 1.9);
    // an eggshell shard perched on the head like a hat
    g.save(); g.translate(6, -21); g.rotate(-0.25 + Math.sin(t * 3 + ph) * 0.05 * K);
    g.beginPath(); g.moveTo(-9, 2); g.lineTo(-6, -1.5); g.lineTo(-3, 1.5); g.lineTo(0, -2); g.lineTo(3, 1.5); g.lineTo(6, -1.5); g.lineTo(9, 2);
    g.quadraticCurveTo(6, -8, 0, -9); g.quadraticCurveTo(-6, -8, -9, 2); g.closePath();
    g.fillStyle = lg(g, 0, -9, 0, 2, [[0, '#FFF8E6'], [1, '#E8D3AA']]); g.fill();
    g.fillStyle = alpha(C.accentD, 0.28);
    for (const [sx, sy, r] of [[-3, -4, 1.1], [3, -3, 0.9], [0, -6.5, 0.8]]){ g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); }
    g.restore();
  }

  // a tiny clawed hand gripping the rim at (x, y)
  function hand(g, C, x, y, flip){
    g.save(); g.translate(x, y); g.scale(flip, 1);
    g.fillStyle = C.body;
    g.beginPath(); g.ellipse(0, 0, 4.2, 3.4, 0, 0, TAU); g.fill();
    g.fillStyle = C.claw;
    for (const [dx, rot] of [[-2.6, 0.5], [0.4, 0.15], [3, -0.2]]){
      g.save(); g.translate(dx, 1.5); g.rotate(rot);
      g.beginPath(); g.moveTo(-1.3, 0); g.quadraticCurveTo(0.2, 2.6, 0.8, 3.8); g.quadraticCurveTo(1.7, 1.6, 1.3, 0); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }

  function draw(ctx, L, t){
    const { x, y, s, dir } = L;
    const C = palette(L.pal || 'green', L.tint, 'green');
    const ph = L.ph || 0;
    const p = Math.min(1, Math.max(0, L.pose || 0));
    const K = p ? Math.sin(p * Math.PI) : 0;                          // hatch amount
    const out = Math.min(1, K * 1.6);                                 // how far the baby is out
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (dir || 1), s);
    // the resting egg rattles now and then; it wobbles while hatching
    const rattle = Math.pow(Math.max(0, Math.sin(t * 0.55 + ph * 1.7)), 30);
    ctx.rotate(Math.sin(t * 28) * 0.045 * rattle + Math.sin(t * 7) * 0.03 * K);

    // ── the lid swings open on a hinge at the back of the crack (behind the baby)
    ctx.save();
    ctx.translate(-3 * K, -5 * K);
    ctx.translate(-21, EGG.crackY); ctx.rotate(-1.2 * K); ctx.translate(21, -EGG.crackY);
    ctx.save(); lidPath(ctx); ctx.clip(); eggSkin(ctx, C); ctx.restore();
    ctx.restore();
    // the dark opening
    if (K > 0.02){
      ctx.fillStyle = alpha('#5A3320', 0.95 * Math.min(1, K * 3));
      ctx.beginPath(); ctx.ellipse(0, EGG.crackY - 1, 22, 6.5, 0, 0, TAU); ctx.fill();
    }
    // ── the baby rising out of the opening
    if (K > 0.02){
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, EGG.crackY - 1, 22, 6.5, 0, Math.PI, TAU); ctx.lineTo(60, -200); ctx.lineTo(-60, -200); ctx.closePath(); ctx.clip();
      ctx.translate(0, EGG.crackY + 14 - 40 * out + Math.sin(t * 3 + ph) * 1.2 * K);
      ctx.rotate(Math.sin(t * 2.2 + ph) * 0.06 * K);
      drawBaby(ctx, C, t, ph, K, out);
      ctx.restore();
    }
    // ── the bottom shell (in front of the baby's body)
    ctx.save(); shellPath(ctx); ctx.clip(); eggSkin(ctx, C); ctx.restore();
    ctx.strokeStyle = 'rgba(120,80,40,.28)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';   // the crack line
    ctx.beginPath(); ctx.moveTo(ZIG[0][0], ZIG[0][1]); for (let i = 1; i < ZIG.length; i++) ctx.lineTo(ZIG[i][0], ZIG[i][1]); ctx.stroke();
    // ── little hands gripping the rim
    if (out > 0.55){
      const h = Math.min(1, (out - 0.55) / 0.3);
      ctx.save(); ctx.globalAlpha = h;
      hand(ctx, C, -14, -50 + 3 * (1 - h), -1);
      hand(ctx, C, 14, -50 + 3 * (1 - h), 1);
      ctx.restore();
    }
    // ── a little heart floating up
    if (p > 0.38 && p < 0.98){
      const q = (p - 0.38) / 0.6;
      heart(ctx, 18 + 8 * q + Math.sin(q * 9) * 2, -96 - 30 * q, 4 + 2.5 * q, alpha('#FF6F91', Math.min(1, q * 4) * (1 - q)));
    }
    ctx.restore();
  }

  window.BabyRig = { draw, HEIGHT: 112, WIDTH: 34, PALS, DEFAULT: 'green', ACT_SECONDS: 3.6 };
})();
