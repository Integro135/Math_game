/* ── jelly.js — the JELLYFISH (reef rigs, 2026-11) ───────────────────────────
   A delicate storybook jellyfish, drawn UPRIGHT and swimming up (never
   rotated): a translucent dome with a brighter scalloped rim, a four-leaf
   pattern and a few pale spots showing through its top, a frilly ring of oral
   arms under it and a curtain of fine trailing tentacles. No face.

   BAKED: the cruise look is a pure function of `wt` (and `glow`) — the scene
   renders FRAMES frames at wt = k·TAU/FRAMES and blits them. Over one cycle
   the bell SQUEEZES quickly and relaxes slowly; the rim follows a moment
   later (so it flares while the bell is tight and tucks in as it opens), the
   frills and the tentacles later still, the lag growing toward their tips.

   L = { x, y, s, dir, wt, pose, coat, tint, lit, glow }
     wt    pulse phase in radians, one squeeze-and-relax per 2π (CPS is a
           comfortable speed: wt += TAU * CPS * dt)
     glow  0..1 the night light: a soft halo round the bell and a brighter
           core (bake-safe: a pure function of glow and wt). BOX covers glow 1;
           BOX_PLAIN is the tighter box of a loop baked at glow 0.
     pose  0..1 the FLASH (drawn live): two quick pulses while the whole bell
           lights up and a ring of light spreads from it with each of them
   UNIT SPACE: (0, 0) = the middle of the bell, y down; ~70 wide, LEN tall.

   API — window.JellyRig { draw(ctx, L, t), mouth(L), BOX, BOX_PLAIN, LEN,
         FRAMES, ACT_SECONDS, COATS, CPS }
     mouth(L)  the middle of the bell's underside, where the oral arms meet
   Depends only on ../savanna_rigs/kit.js (window.SavKit). No outlines, no
   ctx.filter / shadowBlur, no offscreen canvases, no clipping. */
(function(){
  const { TAU, clamp01, lerp, smooth, frac, lg, rg, alpha, palette, psr } = window.SavKit;
  const PI = Math.PI;

  // ── coats: bell / bellL / bellD = the dome (body, light top, deep edge),
  //    core = its inner light, leaf = the pattern showing through the top,
  //    arm / armD = the oral arms, tent = the tentacles, halo = the night glow
  const PALS = {
    rose:  { bell: '#FF8DB6', bellL: '#FFD3E4', bellD: '#EE5C98', core: '#FFF3F8', leaf: '#FFFFFF', arm: '#FFB5D1', armD: '#F07FB0', tent: '#FFC9DD', halo: '#FF9FC6' },
    aqua:  { bell: '#4ED2E8', bellL: '#CFF8FC', bellD: '#1EA0C8', core: '#F0FDFF', leaf: '#FFFFFF', arm: '#9FE9F3', armD: '#4AC2DC', tent: '#C0F3F9', halo: '#7CE4F6' },
    lilac: { bell: '#B69AF4', bellL: '#E6DAFF', bellD: '#8C6CE0', core: '#F9F3FF', leaf: '#FFFFFF', arm: '#D2C0FA', armD: '#A486EA', tent: '#DED2FC', halo: '#C2AAFF' },
    gold:  { bell: '#FFC956', bellL: '#FFF0BC', bellD: '#F09C2C', core: '#FFFCEA', leaf: '#FFFFFF', arm: '#FFDF96', armD: '#F5B24A', tent: '#FFE9B0', halo: '#FFD672' },
    mint:  { bell: '#78E0B2', bellL: '#D2F9E6', bellD: '#40BC8C', core: '#F3FFF9', leaf: '#FFFFFF', arm: '#B0F0D2', armD: '#5CCE9E', tent: '#CAF7E2', halo: '#92F2C6' },
  };
  const COATS = Object.keys(PALS);
  const TINTED = ['bell', 'bellL', 'bellD', 'arm', 'armD', 'tent'];

  // ── the pulse. SQ = the share of the cycle spent squeezing (quick), the rest
  //    relaxes (slow). bump / flashPulse = the two quick squeezes of the FLASH.
  const SQ = 0.34, CPS = 0.6, NS = 7;
  const sq = p => { p = frac(p); return p < SQ ? smooth(p / SQ) : 1 - smooth((p - SQ) / (1 - SQ)); };
  const bump = u => u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(PI * Math.pow(u, 0.62)), 2);
  const flashPulse = q => bump((q - 0.06) / 0.3) + bump((q - 0.36) / 0.3);

  // ── the pose, solved once per draw (and by mouth): a SHARED scratch
  const S = {};
  // how squeezed the jelly is `lag` cycles down its body (0 = the bell itself)
  const con = lag => { const c = sq(S.p - lag); return S.K ? lerp(c, flashPulse(S.q - lag * 0.45), S.K) : c; };
  function solve(L){
    S.wt = L.wt || 0; S.p = frac(S.wt / TAU);
    const q = S.q = clamp01(L.pose || 0), on = q > 0 && q < 1;
    S.K = on ? smooth(clamp01(q / 0.08)) * smooth(clamp01((1 - q) / 0.3)) : 0;
    S.F = on ? smooth(clamp01(q / 0.1)) * smooth(clamp01((1 - q) / 0.4)) * (0.72 + 0.28 * Math.min(1, flashPulse(q))) : 0;
    S.glow = clamp01(L.glow || 0);
    const cB = S.cB = con(0), cR = S.cR = con(0.11);
    // it surges up with the squeeze and sinks back while it opens
    S.oy = -2.6 * Math.cos(TAU * (S.p - 0.42)) * (1 - S.K) - 4 * S.K * flashPulse(q - 0.05);
    S.top = -27 - 4.5 * cB;                              // the apex
    S.wM = lerp(34, 25.5, cB); S.yM = 2 - 2 * cB;        // the widest part of the dome
    S.wR = lerp(31.5, 23, cR) + 2.2 * (cB - cR);         // the rim's corners: flared while it lags the bell
    S.yR = 15 + 4 * cR;
    S.sag = 4.6 + 1.4 * cR;                              // how far the near edge hangs below them
    return S;
  }
  function mouth(L){
    solve(L);
    return { x: L.x, y: L.y + (S.oy + S.yR + 2) * L.s };
  }

  // ── the bell. The rim is a ring seen from a little above: its near edge
  //    hangs lower in the middle and is cut into NS scallops.
  const rimY = (x, sag) => S.yR + sag * (1 - (x / S.wR) * (x / S.wR));
  const rimX = i => S.wR * lerp(1 - 2 * i / NS, Math.cos(PI * i / NS), 0.55);
  function scallops(g){                                   // from the right corner to the left one
    for (let i = 1; i <= NS; i++){
      const x0 = rimX(i - 1), x1 = rimX(i), xm = (x0 + x1) / 2;
      g.quadraticCurveTo(i === 1 ? x0 + 0.7 : i === NS ? x1 - 0.7 : xm, rimY(xm, S.sag) + 2.2 + 0.18 * (x0 - x1), x1, rimY(x1, S.sag));
    }
  }
  function dome(g){
    const wM = S.wM, wR = S.wR, yM = S.yM, yR = S.yR, top = S.top;
    g.beginPath(); g.moveTo(-wR, yR);
    g.bezierCurveTo(-wR, yR - 6, -wM, yM + 8, -wM, yM);
    g.bezierCurveTo(-wM, yM - 17, -wM * 0.58, top, 0, top);
    g.bezierCurveTo(wM * 0.58, top, wM, yM - 17, wM, yM);
    g.bezierCurveTo(wM, yM + 8, wR, yR - 6, wR, yR);
    scallops(g);
    g.closePath();
  }
  function rimBand(g){                                    // the brighter band along the near edge
    g.beginPath(); g.moveTo(S.wR, S.yR);
    scallops(g);
    g.quadraticCurveTo(0, S.yR + 2 * (S.sag - 3.6), S.wR, S.yR);
    g.closePath();
  }

  // ── a trailing strand (tentacle / oral arm): where it is `s` 0..1 down its
  //    length. The squeeze reaches it late and pulls it in toward the axis; it
  //    billows out again, swaying, while the bell opens. Whole harmonics only.
  const PH = [], PH2 = [];
  for (let i = 0; i < 24; i++){ PH[i] = psr(i + 3) * 1.2; PH2[i] = psr(i + 11) * TAU; }
  function strandX(x0, s, i, A){
    const c = con(0.14 + 0.36 * s);
    return x0 * (1 - 0.3 * s * c)
         + A * (1 - 0.5 * c) * Math.pow(s, 1.15) * (Math.sin(S.wt - PH[i] - 3.3 * s) + 0.35 * Math.sin(2 * S.wt - PH2[i] - 5.5 * s));
  }
  const strandY = (len, s) => len * s * (0.96 + 0.09 * con(0.1 + 0.3 * s));

  // the fine tentacles: tapered strands, w0 wide at the rim → w1 at the tip,
  // added to the current path (one fill for the lot)
  const TN = 9, TX = new Float32Array(TN + 1), TY = new Float32Array(TN + 1), TW = new Float32Array(TN + 1);
  function tentacle(g, x0, y0, len, i, A, w0, w1){
    const reach = len / 80;
    for (let k = 0; k <= TN; k++){
      const s = k / TN; TX[k] = strandX(x0, s * reach, i, A); TY[k] = y0 + strandY(len, s * reach) / reach; TW[k] = (w0 + (w1 - w0) * s) / 2;
    }
    g.moveTo(TX[0] - TW[0], TY[0]);
    for (let k = 1; k < TN; k++) g.quadraticCurveTo(TX[k] - TW[k], TY[k], (TX[k] - TW[k] + TX[k + 1] - TW[k + 1]) / 2, (TY[k] + TY[k + 1]) / 2);
    g.quadraticCurveTo(TX[TN], TY[TN] + w1, (TX[TN] + TW[TN] + TX[TN - 1] + TW[TN - 1]) / 2, (TY[TN] + TY[TN - 1]) / 2);
    for (let k = TN - 1; k > 0; k--) g.quadraticCurveTo(TX[k] + TW[k], TY[k], (TX[k] + TW[k] + TX[k - 1] + TW[k - 1]) / 2, (TY[k] + TY[k - 1]) / 2);
    g.lineTo(TX[0] + TW[0], TY[0]);
    g.closePath();
  }
  // an oral arm: a ribbon with ruffled edges, the ruffles rippling down it
  const AN = 11, AL = new Float32Array(AN + 1), AR = new Float32Array(AN + 1), AY = new Float32Array(AN + 1);
  function arm(g, x0, y0, len, w0, i, A){
    const reach = len / 80;
    for (let k = 0; k <= AN; k++){
      const s = k / AN, x = strandX(x0, s * reach, i, A), w = w0 * (1 - 0.7 * s) * (0.5 + 0.5 * smooth(Math.min(1, s / 0.22))) / 2;
      AL[k] = x - w * (1 + 0.5 * Math.sin(s * 13 + PH2[i] - S.wt));
      AR[k] = x + w * (1 + 0.5 * Math.sin(s * 13 + PH2[i + 5] - S.wt));
      AY[k] = y0 + strandY(len, s * reach) / reach;
    }
    g.beginPath(); g.moveTo(AL[0], AY[0]);
    for (let k = 1; k < AN; k++) g.quadraticCurveTo(AL[k], AY[k], (AL[k] + AL[k + 1]) / 2, (AY[k] + AY[k + 1]) / 2);
    g.quadraticCurveTo(AL[AN], AY[AN] + 2, (AL[AN] + AR[AN]) / 2, AY[AN] + 2.4);
    g.quadraticCurveTo(AR[AN], AY[AN] + 2, (AR[AN] + AR[AN - 1]) / 2, (AY[AN] + AY[AN - 1]) / 2);
    for (let k = AN - 1; k > 0; k--) g.quadraticCurveTo(AR[k], AY[k], (AR[k] + AR[k - 1]) / 2, (AY[k] + AY[k - 1]) / 2);
    g.lineTo(AR[0], AY[0]);
    g.closePath(); g.fill();
  }

  // where the tentacles hang from (a share of the rim's half-width), their
  // lengths and sway; the oral arms: [x share, length, width, sway]
  const T_BACK = [[-0.8, 56, 3.6], [-0.42, 63, 4.2], [0.02, 60, 4.6], [0.46, 65, 4], [0.82, 54, 3.4]];
  const T_FRONT = [[1, 63, 4.4], [2, 70, 5], [3, 66, 5.4], [4, 72, 5.2], [5, 68, 4.8], [6, 61, 4.2]];
  const A_BACK = [[-0.36, 34, 9, 2.6], [0.4, 37, 9.5, 2.8]];
  const A_FRONT = [[-0.2, 48, 11.5, 3.4], [0.14, 54, 12.5, 3.8], [0.44, 42, 10, 3], [-0.5, 40, 9.5, 3]];
  const SPOTS = [[-0.62, 0.62, 1.9], [0.6, 0.44, 2.2], [0.76, 0.68, 1.5], [0.34, 0.78, 1.4], [-0.4, 0.82, 1.3]];

  // derived colours, once per cached palette
  function derive(C){
    return C.x = {
      domeT: alpha(C.bellL, 0.94), domeM: alpha(C.bell, 0.84), domeB: alpha(C.bellD, 0.88),
      edge0: alpha(C.bellD, 0), edge1: alpha(C.bellD, 0.5), band: alpha(C.bellL, 0.9),
      leaf: alpha(C.leaf, 0.5), leafIn: alpha(C.leaf, 0.45), spot: alpha(C.leaf, 0.45), gloss: 'rgba(255,255,255,.6)',
      frill: alpha(C.armD, 0.6), belly: alpha(C.bellD, 0.22),
      armB: alpha(C.armD, 0.55), armT: alpha(C.arm, 0.92), armM: alpha(C.arm, 0.75), armE: alpha(C.armD, 0.45),
      tentB: alpha(C.tent, 0.45), tentB0: alpha(C.tent, 0.12), tentF: alpha(C.tent, 0.92), tentF0: alpha(C.tent, 0.36),
      core0: alpha(C.core, 0), halo0: alpha(C.halo, 0) };
  }

  const HALO = 45;                                        // the night halo's radius (inside BOX)
  function draw(ctx, L, t){
    const C = palette(PALS[L.coat] || PALS[COATS[0]], TINTED, L.tint, L.lit);
    const X = C.x || derive(C), g = ctx;
    solve(L);
    const wM = S.wM, wR = S.wR, yR = S.yR, top = S.top, glow = S.glow, F = S.F, shine = Math.min(1, glow + F);
    const kx = wM / 33;
    g.save();
    g.translate(L.x, L.y); g.scale(L.s * (L.dir || 1), L.s); g.translate(0, S.oy);

    // the night light: a soft halo round the bell
    if (shine > 0.01){
      const R = HALO + 22 * F;
      g.fillStyle = rg(g, 0, 0, 4, R, [[0, alpha(C.halo, 0.7 * shine)], [0.6, alpha(C.halo, 0.44 * shine)], [0.82, alpha(C.halo, 0.16 * shine)], [1, X.halo0]]);
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.save(); g.translate(0, 46); g.scale(1, 1.7);
      g.fillStyle = rg(g, 0, 0, 0, 30, [[0, alpha(C.halo, 0.24 * shine)], [0.6, alpha(C.halo, 0.12 * shine)], [1, X.halo0]]);
      g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
      g.restore();
    }
    // the far tentacles
    g.fillStyle = lg(g, 0, yR, 0, yR + 67, [[0, X.tentB], [1, X.tentB0]]);
    g.beginPath();
    for (let i = 0; i < T_BACK.length; i++){ const q = T_BACK[i]; tentacle(g, q[0] * wR, yR + 1, q[1], i + 8, q[2], 1.4, 0.7); }
    g.fill();
    // the oral arms: two behind, deeper, then the frilly ones in front
    const yA = yR + 1.5, kw = 0.75 + 0.25 * wR / 31.5;
    g.fillStyle = lg(g, 0, yA, 0, yA + 40, [[0, X.armB], [1, X.armE]]);
    for (let i = 0; i < A_BACK.length; i++){ const q = A_BACK[i]; arm(g, q[0] * wR, yA, q[1], q[2] * kw, i + 14, q[3]); }
    g.fillStyle = lg(g, 0, yA, 0, yA + 58, [[0, X.armT], [0.55, X.armM], [1, X.armE]]);
    for (let i = 0; i < A_FRONT.length; i++){ const q = A_FRONT[i]; arm(g, q[0] * wR, yA, q[1], q[2] * kw, i, q[3]); }
    // a short frill all round under the rim, rippling
    const fw = wR * 0.86;
    g.fillStyle = X.frill;
    g.beginPath(); g.moveTo(-fw, rimY(-fw, S.sag) - 1);
    for (let k = 0; k <= 40; k++){
      const u = k / 20 - 1, x = u * fw;
      g.lineTo(x, rimY(x, S.sag) - 1 + (8 + 1.8 * Math.sin(k * 0.95 - S.wt)) * (1 - u * u * u * u));
    }
    g.lineTo(fw, rimY(fw, S.sag) - 1); g.closePath(); g.fill();

    // ── the bell: a translucent dome, deeper toward its edge, lit from inside
    dome(g);
    g.fillStyle = lg(g, 0, top, 0, yR + S.sag, [[0, X.domeT], [0.5, X.domeM], [1, X.domeB]]);
    g.fill();
    const er = yR - 4 - top;
    g.fillStyle = rg(g, 0, yR - 4, er * 0.5, er, [[0, X.edge0], [1, X.edge1]]);
    g.fill();
    const a0 = Math.min(0.96, 0.56 + 0.34 * glow + 0.4 * F);
    g.save(); g.translate(0, top * 0.25 + 3); g.scale(wM / 26, 1);
    g.fillStyle = rg(g, 0, 0, 0, 20, [[0, alpha(C.core, a0)], [0.5, alpha(C.core, a0 * 0.5)], [1, X.core0]]);
    g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = X.belly;                                // the far side of the rim, through the glass
    g.beginPath(); g.ellipse(0, yR - 1.5, wR * 0.8, 4.2, 0, 0, TAU); g.fill();
    // the four-leaf pattern showing through the top, and a few pale spots
    const ly = top + 15;
    for (let pass = 0; pass < 2; pass++){
      const k = pass ? 0.5 : 1;
      g.fillStyle = pass ? X.leafIn : X.leaf; g.beginPath();
      for (let i = 0; i < 4; i++){
        const sx = i & 1 ? 1 : -1, far = i < 2, rot = sx * (far ? -0.55 : 0.5);
        const cx = sx * (far ? 4 : 5) * kx, cy = ly + (far ? -2.6 : 2.9), rx = (far ? 4.3 : 5.4) * kx * k;
        g.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
        g.ellipse(cx, cy, rx, (far ? 2.5 : 3.3) * k, rot, 0, TAU);
      }
      g.fill();
    }
    g.fillStyle = X.spot; g.beginPath();
    for (let i = 0; i < SPOTS.length; i++){
      const q = SPOTS[i], x = q[0] * wM, y = top + q[1] * (yR - top);
      g.moveTo(x + q[2], y); g.arc(x, y, q[2], 0, TAU);
    }
    g.fill();
    rimBand(g); g.fillStyle = X.band; g.fill();
    g.fillStyle = X.gloss;                                // the gloss on its shoulder
    g.beginPath(); g.ellipse(-wM * 0.58, top + 11.5, 7 * kx, 2.6, -0.82, 0, TAU); g.fill();
    g.beginPath(); g.arc(-wM * 0.8, top + 21, 1.5, 0, TAU); g.fill();
    if (F > 0.01){ dome(g); g.fillStyle = alpha(C.core, 0.6 * F); g.fill(); }

    // the near tentacles, from between the scallops
    g.fillStyle = lg(g, 0, yR, 0, yR + 77, [[0, X.tentF], [1, X.tentF0]]);
    g.beginPath();
    for (let i = 0; i < T_FRONT.length; i++){
      const q = T_FRONT[i], x = rimX(q[0]);
      tentacle(g, x, rimY(x, S.sag) - 0.6, q[1], i, q[2], 1.9, 0.8);
    }
    g.fill();

    // the FLASH: a ring of light spreads from the bell with each pulse
    if (S.q > 0 && S.q < 1) for (let k = 0; k < 2; k++){
      const u = (S.q - 0.1 - 0.3 * k) / 0.5;
      if (u <= 0 || u >= 1) continue;
      const R = 33 + 55 * (1 - (1 - u) * (1 - u)), a = (1 - u) * (1 - u), w = 5 + 4 * u;
      g.fillStyle = rg(g, 0, 0, R - w, R + w, [[0, X.halo0], [0.3, alpha(C.halo, 0.5 * a)], [0.5, alpha(C.core, 0.9 * a)], [0.7, alpha(C.halo, 0.5 * a)], [1, X.halo0]]);
      g.beginPath(); g.arc(0, 0, R + w, 0, TAU); g.arc(0, 0, R - w, 0, TAU, true); g.fill();
    }
    g.restore();
  }

  window.JellyRig = { draw, mouth, BOX: [-48, -50, 48, 103], BOX_PLAIN: [-37, -37, 37, 100], LEN: 130, FRAMES: 12, ACT_SECONDS: 1.7, COATS, CPS };
})();
