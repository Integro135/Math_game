/* ── aurora.bg.js — AURORA & ICE: a polar night over a frozen lake ───────────
   THE ❄️ THEME's scene — it replaced frozen.bg.js, and reuses that theme's
   skin (game/skins/frozen.skin.css) and aids (aids/frozen.aids.js). Developed
   against backgrounds/aurora.html. One self-contained IIFE, canvas + a DOM
   layer for Olaf, ES2015, file:// safe. Registers
       window.BACKGROUNDS.aurora = { skin:'frozen', aids:'frozen', preload(), init({stage}) → cleanup }

   THE PICTURE: a deep indigo night sky with a faint Milky Way and hundreds of
   stars (the bright ones twinkle), a full moon with an ICE HALO high on the
   right. Across the sky THE AURORA: three curtains of light — a bright green
   main arc with a sharp lower edge fading to teal and violet high up, a
   cooler cyan arc, and a faint pink/violet veil above — drawn as hundreds of
   vertical rays whose brightness, height and position follow layered value
   noise, so the curtains fold, drift, pulse and shimmer like the real thing.
   Additive compositing plus a soft upscaled glow pass gives the light its
   bloom. Below: two snow-capped mountain ranges (a hazy far range, a darker
   near one, snow lit by moon and aurora), a wide FROZEN LAKE whose pale ice
   carries a dim, smeared mirror of the aurora and the mountains, criss-crossed
   by fine cracks and dusted with snow patches; faceted ICEBERGS and shards
   with moonlit edges and aurora light glowing through their bases; snow banks
   in the foreground; low mist drifting over the far shore; gentle snowfall
   with a breath of wind; ice sparkles; the odd shooting star.

   Layers: skyL (static: gradient, Milky Way, dim stars) · auroraL (half-res,
   redrawn every frame) → auroraLo (1/8-res, its upscale is the glow) · mtnL
   (static) · lakeL (static: ice, cracks, snow patches) · foreL (static:
   icebergs, shore, drifts). Per frame: twinkle, moon halo shimmer, aurora,
   reflections (clipped to the lake), mist, sparkles, snow, shooting stars.

   THE FIGURES: an ICE CASTLE on the far shore (crystal spires with tiered
   collars, glowing windows, a grand stair; painted into the mountain layer so
   it mirrors in the ice); an OPEN CHANNEL of dark water through the ice where
   two ORCAS cruise and porpoise (the dorsal fin cuts the surface, the back
   rolls up with a spout, a faint body shows through the water, and every
   ~25 s one BREACHES with a splash and a ring); three harbour SEALS lounging
   on ledges of the icebergs (raised heads that look about, blink, bark, a
   flipper flap); and THE PRINCESS — the low-poly paper-art princess from
   princess/princess.html (packaged as princess/princess.js, injected on
   demand; pose frames built by rotating her Left_Arm group and rasterized via
   <img> data URLs) — walking the snow bank with a bob, a lean, an arm swing
   and a breath, pausing now and then to raise her arm and conjure snowflakes.

   Plus: a second, BLONDE sister (the same SVG recoloured — rose gown, icy
   trims, pink gems, blue eyes); a POLAR BEAR mother and cub ambling across the
   ice (heavy gait, head sway, a stop to sniff; the cub trots to keep up); an
   IGLOO on the far ice with a warm light in its tunnel; a big detailed MOON
   (maria, craters, limb darkening, soft glow). CLICKS: the sky → an aurora
   SURGE (brighter, faster curtains for ~5 s); a princess → she casts; a seal →
   it waves a flipper.

   ANIMATION: the seals act on a schedule (and on click) — a belly-up ROLL, a
   GALUMPH along the ledge, a CLAP + bark, and a DIVE (slide off the iceberg
   with a splash, swim with the head above the water, hop back out). The bears
   act too — the mother SITS up to watch the sky, SHAKES snow off, SNIFFS; the
   cub belly-SLIDES, STANDS up on its hind legs, shakes, sniffs (click a bear:
   sit / stand). The igloo's doorway firelight flickers and spills on the snow,
   smoke curls from its chimney, and an ARCTIC FOX trots out, sits to look
   about, and trots back in. The castle's windows flicker, its door breathes
   light, the spire tips twinkle, a sheen sweeps the crystal, a pennant waves.

   OLAF strolls the foreground snow bank: the pure-CSS rig from olaf/olaf.js
   (lifted verbatim out of the old frozen.bg.js), mounted as a DOM layer OVER
   the scene canvas — the snowfall and the conjured snowflakes then draw on an
   fx canvas above him, so snow falls in front of him too. Click him → a happy
   hop + a burst of snowflakes.

   Test hooks: window.BACKGROUNDS.aurora._test = window._aurora =
   { intensity(v), snow(on), wind(v), shoot(), cast(), breach(), surge(), wave(),
     sniff(), dive(), roll(), sit(), slide(), fox(), hop(), princess(), orcas(),
     bears(), olaf() }.
   Wiring: _BG_THEMES.frozen → aurora (themes.js), THEMES.frozen,
   body.theme-frozen, the ❄️ menu button + toggle-cycle entry, frozen.skin.css,
   frozen.aids.js, and the body.theme-frozen #bg load-flash fallback
   (game/css/themes.css). Verify via _verify_aurora.py. */
window.BACKGROUNDS = window.BACKGROUNDS || {};
(function(){
  const doc = document;
  const BASE = (function(){ const sc = doc.currentScript; return sc && sc.src ? sc.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-audep="' + globalName + '"]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const sc = doc.createElement('script');
    sc.src = BASE + file; sc.setAttribute('data-audep', globalName);
    sc.onload = cb; sc.onerror = cb;
    doc.head.appendChild(sc);
  }
  const TAU = Math.PI * 2;
  const psr = i => Math.abs(Math.sin(i * 127.1) * 43758.545) % 1;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const rnd = (a, b) => a + Math.random() * (b - a);
  // 1-D value noise and a small fbm — the aurora's folds, rays and pulses
  function vnoise(x, seed){
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(psr(i + seed * 57.31), psr(i + 1 + seed * 57.31), u);
  }
  function fbm(x, seed, oct){
    let a = 0, amp = 0.5, fr = 1, n = 0;
    for (let o = 0; o < (oct || 3); o++){ a += amp * vnoise(x * fr, seed + o * 11); n += amp; amp *= 0.5; fr *= 2.13; }
    return a / n;
  }

  window.BACKGROUNDS.aurora = {
    skin: 'frozen', aids: 'frozen',
    preload(){ needScript('PrincessArt', 'princess/princess.js', function(){}); needScript('OlafArt', 'olaf/olaf.js', function(){}); },
    init({ stage }){
      let stopped = false;
      stage.innerHTML = '';
      stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const DPR = Math.min(devicePixelRatio || 1, 2);
      let W, H, LAKE, U;
      let skyL, mtnL, lakeL, foreL, auroraL, auroraLo;
      let STARS, TWINKLE, FLAKES, SPARKS, MIST, SHOOTERS = [], nextShootAt = 4;
      let CHANNEL, SEALS, ORCAS, PR, MAGIC = [], SPOUTS = [], SPLASH = [], nextBreachAt = 14;
      let PFR = null, PRINCESSES = [], BEARS = [], surge = null, auroraT = 0, surgeBoost = 1;
      let CASTLE = null, IGLOO = null, FOX = null, SMOKE = [], FURFX = [];
      let OLAF = null, olafLayer = null, fxCv = null, fxCtx = null;
      let intensity = 1, snowOn = true, wind = 0;
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov';
      let lastT = 0, rafId = null, t0 = null;

      const lg = (g, x1, y1, x2, y2, st) => { const gr = g.createLinearGradient(x1, y1, x2, y2); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      const rg = (g, x, y, r0, r1, st) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      function makeLayer(w, h, dpr){
        const cv = doc.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
        const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h };
      }

      // ── the aurora: ray textures (a sharp bright lower edge fading upward) + curtains
      function makeTex(stops){
        const cv = doc.createElement('canvas'); cv.width = 4; cv.height = 256;
        const g = cv.getContext('2d');
        g.fillStyle = lg(g, 0, 0, 0, 256, stops); g.fillRect(0, 0, 4, 256);
        return cv;
      }
      const TEX = [
        makeTex([[0, 'rgba(210,70,190,0)'], [0.22, 'rgba(150,80,230,0.22)'], [0.5, 'rgba(60,200,170,0.45)'], [0.82, 'rgba(70,235,140,0.85)'], [0.955, 'rgba(150,255,190,1)'], [1, 'rgba(160,255,200,0)']]),
        makeTex([[0, 'rgba(120,90,255,0)'], [0.3, 'rgba(90,140,255,0.2)'], [0.6, 'rgba(60,220,210,0.5)'], [0.9, 'rgba(110,255,200,0.9)'], [0.96, 'rgba(190,255,230,1)'], [1, 'rgba(190,255,230,0)']]),
        makeTex([[0, 'rgba(255,90,170,0)'], [0.35, 'rgba(230,90,200,0.3)'], [0.7, 'rgba(160,110,255,0.4)'], [0.93, 'rgba(120,200,255,0.6)'], [1, 'rgba(120,200,255,0)']]),
      ];
      const BANDS = [
        { tex: 0, y: 0.36, amp: 0.05, wl: 1.3, spd: 0.11,  hMin: 0.18, hMax: 0.30, seed: 1,  gain: 1.00, rayF: 46, raySpd: 0.50,  u0: 0.00, u1: 1.00 },
        { tex: 1, y: 0.28, amp: 0.06, wl: 0.9, spd: -0.07, hMin: 0.12, hMax: 0.26, seed: 7,  gain: 0.70, rayF: 60, raySpd: -0.35, u0: 0.15, u1: 1.00 },
        { tex: 2, y: 0.22, amp: 0.04, wl: 1.7, spd: 0.05,  hMin: 0.20, hMax: 0.34, seed: 13, gain: 0.42, rayF: 30, raySpd: 0.25,  u0: 0.00, u1: 0.85 },
      ];
      function drawAurora(g, w, h, t){
        g.clearRect(0, 0, w, h);
        g.globalCompositeOperation = 'lighter';
        const N = 150, colW = w / N + 1.5;
        const breathe = 0.8 + 0.2 * Math.sin(t * 0.13) * Math.sin(t * 0.071 + 1);
        for (const b of BANDS){
          const tex = TEX[b.tex];
          for (let i = 0; i <= N; i++){
            const u = i / N;
            const win = smooth(clamp01((u - b.u0) / 0.14)) * smooth(clamp01((b.u1 - u) / 0.14));
            if (win <= 0.001) continue;
            const fold = 0.5 + 0.5 * fbm(u * 5.5 + t * 0.02, b.seed + 8, 2);                       // dark folds in the curtain
            const env = win * fold * (0.45 + 0.55 * fbm(u * 2.2 + t * 0.045, b.seed, 2));
            const uw = u + 0.04 * (fbm(u * 2.7 + t * 0.02, b.seed + 21, 2) - 0.5);                  // warp: rays of uneven width and spacing
            const ray = Math.pow(0.6 * fbm(uw * b.rayF + t * b.raySpd, b.seed + 3, 2) + 0.4 * fbm(uw * b.rayF * 2.3 - t * b.raySpd * 0.6, b.seed + 4, 2), 1.6);
            const br = env * (0.3 + 0.9 * ray) * b.gain * breathe * intensity * surgeBoost;
            if (br < 0.01) continue;
            const yb = h * (b.y + b.amp * Math.sin(u * TAU * b.wl + t * b.spd + b.seed) + 0.03 * (fbm(u * 3.1 + t * 0.03, b.seed + 5, 2) - 0.5));
            const hh = h * (b.hMin + (b.hMax - b.hMin) * fbm(u * 3.7 + t * 0.05, b.seed + 9, 2)) * (0.8 + 0.4 * ray);
            g.globalAlpha = Math.min(1, br);
            g.drawImage(tex, u * w - colW / 2, yb - hh, colW, hh);
          }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }

      // ── static painters ──
      function paintSky(g){
        g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#04050f'], [0.35, '#0a1230'], [0.62, '#132a4e'], [0.78, '#1d4463'], [1, '#1d4463']]);
        g.fillRect(0, 0, W, H);
        // the Milky Way: a soft diagonal band of haze and countless faint stars
        g.save(); g.translate(W * 0.42, H * 0.3); g.rotate(-0.55);
        g.fillStyle = lg(g, 0, -H * 0.16, 0, H * 0.16, [[0, 'rgba(120,140,200,0)'], [0.5, 'rgba(150,170,230,0.10)'], [1, 'rgba(120,140,200,0)']]);
        g.fillRect(-W, -H * 0.16, 2 * W, H * 0.32);
        for (let i = 0; i < 900; i++){
          const x = (psr(i * 3 + 1) - 0.5) * 2.2 * W, spread = (psr(i * 5 + 2) - 0.5) + (psr(i * 7 + 3) - 0.5);
          const y = spread * H * 0.13;
          g.fillStyle = 'rgba(210,220,255,' + (0.05 + 0.25 * psr(i + 9)) + ')';
          g.beginPath(); g.arc(x, y, 0.3 + psr(i + 4) * 0.7, 0, TAU); g.fill();
        }
        g.restore();
        // dim fixed stars
        for (const s of STARS){
          if (s.tw) continue;
          g.fillStyle = 'rgba(' + s.col + ',' + s.a + ')';
          g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
        }
      }
      // a mountain range as a shaded HEIGHTFIELD: a noisy skyline (big massifs,
      // low saddles, rocky detail), moonlit on its right-facing slopes, a snow
      // line that whitens with altitude — painted column by column
      function hexc(c){
        if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
        const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
      }
      const mixc = (a, b, k) => { const A = hexc(a), B = hexc(b); return 'rgb(' + Math.round(lerp(A[0], B[0], k)) + ',' + Math.round(lerp(A[1], B[1], k)) + ',' + Math.round(lerp(A[2], B[2], k)) + ')'; };
      function range(g, base, amp, seed, colDark, colLit, snow){
        // the skyline carries 4 octaves of rocky detail; the LIGHTING follows only
        // the broad massif shape (2 octaves), so flanks shade in wide sweeps.
        // Every 1-px column is an OPAQUE pre-mixed gradient (snow at the crest →
        // moonlit or shadowed rock → dark foot), so no seams appear between columns.
        const shape = (x, oct) => {
          const u = x / W, n = fbm(u * 6.5, seed, oct), m = fbm(u * 1.6 + 3, seed + 50, 2);
          return base - amp * (0.15 + 0.85 * Math.pow(n, 0.9)) * (0.45 + 1.1 * m);
        };
        const N = Math.ceil(W) + 3, ys = new Float32Array(N), yl = new Float32Array(N);
        for (let i = 0; i < N; i++){ ys[i] = shape(i - 1, 4); yl[i] = shape(i - 1, 2); }
        const slopeAt = i => (yl[Math.min(N - 1, i + 16)] - yl[Math.max(0, i - 16)]) / 32;
        const snowC = 'rgb(' + snow + ')';
        for (let i = 0; i < N; i++){
          const x = i - 1, y = Math.floor(ys[i]), lit = clamp01(0.38 + slopeAt(i) * 1.9), litK = clamp01((lit - 0.4) * 1.3);
          const rel = clamp01((base - y) / amp), snowK = clamp01((rel - 0.18) * 1.5);
          const rock = mixc(colDark, colLit, 0.15 + 0.75 * litK);
          const crest = mixc(rock, snowC, snowK * (0.6 + 0.4 * lit));
          const depth = Math.max(4, amp * (0.12 + 0.45 * snowK)), span = base - y + 3;
          g.fillStyle = lg(g, 0, y, 0, base + 3, [[0, crest], [Math.min(0.95, depth / span), mixc(rock, snowC, snowK * 0.25)], [1, mixc(colDark, rock, 0.4)]]);
          g.fillRect(x, y, 1, span);
        }
        // a thin bright rim along the skyline where the moon catches the crest
        g.strokeStyle = 'rgba(' + snow + ',.35)'; g.lineWidth = 1;
        g.beginPath(); for (let i = 0; i < N; i++){ if (i === 0) g.moveTo(i - 1, ys[i]); else g.lineTo(i - 1, ys[i]); } g.stroke();
      }
      function paintMountains(g){
        g.clearRect(0, 0, W, H);
        range(g, H * 0.63, H * 0.30, 41, '#1f3558', '#5a7fae', '210,228,248');   // far range
        g.fillStyle = lg(g, 0, H * 0.36, 0, H * 0.62, [[0, 'rgba(29,68,99,0)'], [1, 'rgba(29,68,99,.42)']]);   // distance haze
        g.fillRect(0, H * 0.36, W, H * 0.29);
        range(g, H * 0.65, H * 0.19, 77, '#0c1628', '#31496e', '232,242,252');   // near range
        paintCastle(g);
      }
      // ── THE ICE CASTLE on the far shore: crystalline spires with tiered collars,
      //    glowing windows, a grand stair, a halo of its own light
      function paintCastle(g){
        // the ❄️ skin hugs the game card to the LEFT, so the castle stands on the
        // RIGHT of the far shore (its lower-left tucks behind the big iceberg)
        const cx = W * 0.865, base = LAKE + 1, S = H * 0.26;
        CASTLE = { lights: [], tips: [], spires: [], door: null, cx, base, S };
        g.fillStyle = rg(g, cx, base - S * 0.45, 0, S * 1.1, [[0, 'rgba(120,200,255,.28)'], [0.5, 'rgba(120,200,255,.10)'], [1, 'rgba(120,200,255,0)']]);
        g.fillRect(cx - S * 1.2, base - S * 1.6, S * 2.4, S * 1.7);
        const spire = (dx, h, w, seed) => {
          const x = cx + dx * S, top = base - h * S, hw = w * S, sh = top + h * S * 0.18;   // shoulder
          CASTLE.spires.push({ x, top, hw, sh }); CASTLE.tips.push({ x, y: top - S * 0.06, seed });
          const body = () => { g.beginPath(); g.moveTo(x - hw, base + 2); g.lineTo(x - hw * 0.8, sh); g.lineTo(x, top); g.lineTo(x + hw * 0.8, sh); g.lineTo(x + hw, base + 2); g.closePath(); };
          g.fillStyle = lg(g, 0, top, 0, base, [[0, '#f2fbff'], [0.3, '#bfe3f8'], [0.7, '#78b7e6'], [1, '#4a86c4']]);
          body(); g.fill();
          g.save(); body(); g.clip();
          g.fillStyle = 'rgba(20,60,120,.30)'; g.fillRect(x - hw, top, hw * 0.55, h * S + 4);            // the shadowed left face
          g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + hw * 0.05, top, hw * 0.16, h * S + 4);   // a highlight seam
          for (let k = 1; k <= 3; k++){                                                                   // tiered crystal collars
            const y = top + (h * S) * (0.2 + k * 0.2), cw = hw * (0.55 + k * 0.16);
            g.fillStyle = lg(g, 0, y - S * 0.02, 0, y + S * 0.03, [[0, 'rgba(235,250,255,.9)'], [1, 'rgba(120,180,230,.5)']]);
            g.beginPath(); g.moveTo(x - cw, y + S * 0.03); g.lineTo(x - cw * 0.85, y - S * 0.02); g.lineTo(x + cw * 0.85, y - S * 0.02); g.lineTo(x + cw, y + S * 0.03); g.closePath(); g.fill();
          }
          for (let k = 0; k < 4; k++){                                                                    // glowing windows
            const y = top + (h * S) * (0.32 + k * 0.16), ww = Math.max(1.5, hw * 0.16), wh = S * 0.035;
            if (y + wh > base) break;
            CASTLE.lights.push({ x: x + hw * 0.15, y, r: wh * 1.6, seed: seed * 7 + k });
            g.fillStyle = rg(g, x + hw * 0.15, y, 0, wh * 1.6, [[0, 'rgba(200,245,255,.55)'], [1, 'rgba(200,245,255,0)']]);
            g.beginPath(); g.arc(x + hw * 0.15, y, wh * 1.6, 0, TAU); g.fill();
            g.fillStyle = '#d9f6ff'; g.beginPath(); g.moveTo(x + hw * 0.15 - ww, y + wh); g.lineTo(x + hw * 0.15 - ww, y - wh * 0.4); g.lineTo(x + hw * 0.15, y - wh); g.lineTo(x + hw * 0.15 + ww, y - wh * 0.4); g.lineTo(x + hw * 0.15 + ww, y + wh); g.closePath(); g.fill();
          }
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1;                                        // the moonlit right edge + needle
          g.beginPath(); g.moveTo(x, top); g.lineTo(x + hw * 0.8, sh); g.lineTo(x + hw, base); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, top - S * 0.06); g.lineTo(x, top + S * 0.04); g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, top - S * 0.06, 1.6, 0, TAU); g.fill();
        };
        // the walls and the grand stair, then the spires (back ones first)
        const wallH = S * 0.22, wl = cx - S * 0.62, wr = cx + S * 0.6;
        g.fillStyle = lg(g, 0, base - wallH, 0, base, [[0, '#cfe8f8'], [1, '#5b95cf']]);
        g.beginPath(); g.moveTo(wl, base + 2); g.lineTo(wl + S * 0.04, base - wallH);
        for (let i = 0; i <= 14; i++){ const x = wl + S * 0.04 + (wr - wl - S * 0.08) * i / 14; g.lineTo(x, base - wallH - (i % 2 ? S * 0.03 : 0)); }
        g.lineTo(wr, base + 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(20,60,120,.22)'; g.fillRect(wl, base - wallH, (wr - wl) * 0.4, wallH + 2);
        for (let k = 0; k < 4; k++){                                                                      // the stair
          const y = base - S * 0.02 - k * S * 0.02, hw2 = S * (0.16 + k * -0.025);
          g.fillStyle = k % 2 ? '#b9dcf3' : '#dff1fb'; g.fillRect(cx - hw2, y - S * 0.02, hw2 * 2, S * 0.02);
        }
        CASTLE.door = { x: cx, y: base - S * 0.13, r: S * 0.12 };
        g.fillStyle = rg(g, cx, base - S * 0.13, 0, S * 0.12, [[0, 'rgba(210,248,255,.95)'], [0.5, 'rgba(160,225,255,.6)'], [1, 'rgba(160,225,255,0)']]);   // the great door
        g.beginPath(); g.arc(cx, base - S * 0.13, S * 0.12, 0, TAU); g.fill();
        g.fillStyle = '#cdf2ff'; g.beginPath(); g.moveTo(cx - S * 0.045, base - S * 0.08); g.lineTo(cx - S * 0.045, base - S * 0.15); g.lineTo(cx, base - S * 0.20); g.lineTo(cx + S * 0.045, base - S * 0.15); g.lineTo(cx + S * 0.045, base - S * 0.08); g.closePath(); g.fill();
        spire(-0.42, 0.46, 0.09, 1); spire(0.40, 0.52, 0.09, 2);
        spire(-0.22, 0.70, 0.12, 3); spire(0.21, 0.78, 0.13, 4);
        spire(0, 1.0, 0.16, 5);
      }
      function paintLake(g){
        g.clearRect(0, 0, W, H);
        // the ice: pale and hazy at the far shore, deepening toward us
        g.fillStyle = lg(g, 0, LAKE, 0, H, [[0, '#9fc3d8'], [0.08, '#6f9ab8'], [0.3, '#3b6688'], [0.65, '#1f3f5c'], [1, '#132a40']]);
        g.fillRect(0, LAKE, W, H - LAKE);
        // faint sheen bands (wind-polished ice)
        for (let i = 0; i < 6; i++){
          const y = LAKE + (H - LAKE) * (0.12 + psr(i + 300) * 0.75), hh = (H - LAKE) * (0.02 + psr(i + 310) * 0.05);
          g.fillStyle = lg(g, 0, y - hh, 0, y + hh, [[0, 'rgba(180,220,240,0)'], [0.5, 'rgba(180,220,240,' + (0.05 + psr(i + 320) * 0.06) + ')'], [1, 'rgba(180,220,240,0)']]);
          g.fillRect(0, y - hh, W, hh * 2);
        }
        // frost: a fine speckle over the ice, denser toward the foreground
        for (let i = 0; i < 1400; i++){
          const y = LAKE + (H - LAKE) * Math.pow(psr(i * 3 + 800), 0.7), depthK = (y - LAKE) / (H - LAKE);
          g.fillStyle = 'rgba(220,240,255,' + (0.05 + 0.18 * psr(i + 801) * depthK) + ')';
          g.beginPath(); g.arc(psr(i * 5 + 802) * W, y, (0.4 + psr(i + 803) * 1.4) * (0.5 + depthK), 0, TAU); g.fill();
        }
        // cracks: long, nearly straight, translucent — a pale line over a faint dark shadow, a rare shallow branch
        const crack = (x, y, ang, len, w, depth) => {
          let px = x, py = y, a = ang;
          for (let s = 0; s < 7; s++){
            const seg = len * (0.7 + Math.random() * 0.6), nx = px + Math.cos(a) * seg, ny = py + Math.sin(a) * seg * 0.3;
            g.strokeStyle = 'rgba(5,20,40,.22)'; g.lineWidth = w * 1.8; g.beginPath(); g.moveTo(px, py + 1.2); g.lineTo(nx, ny + 1.2); g.stroke();
            g.strokeStyle = 'rgba(205,238,255,.42)'; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
            if (depth < 1 && Math.random() < 0.18) crack(nx, ny, a + (Math.random() < 0.5 ? 0.35 : -0.35), len * 0.55, w * 0.7, depth + 1);
            px = nx; py = ny; a += (Math.random() - 0.5) * 0.22;
          }
        };
        g.lineCap = 'round';
        for (let i = 0; i < 11; i++){
          const y = LAKE + (H - LAKE) * (0.15 + psr(i * 3 + 500) * 0.8), depthK = (y - LAKE) / (H - LAKE);
          crack(psr(i * 5 + 501) * W, y, (psr(i * 7 + 502) - 0.5) * 0.9 + (psr(i + 503) < 0.5 ? 0 : Math.PI), (26 + 60 * depthK) * U, (0.5 + 1.0 * depthK), 0);
        }
        // snow patches drifted onto the ice
        for (let i = 0; i < 26; i++){
          const y = LAKE + (H - LAKE) * (0.1 + psr(i * 3 + 600) * 0.9), depthK = (y - LAKE) / (H - LAKE);
          const x = psr(i * 5 + 601) * W, rx = (18 + 60 * psr(i + 602)) * U * (0.4 + depthK), ry = rx * 0.22;
          g.fillStyle = rg(g, x, y, 0, rx, [[0, 'rgba(235,245,255,' + (0.28 + 0.2 * depthK) + ')'], [1, 'rgba(235,245,255,0)']]);
          g.save(); g.translate(x, y); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
        }
        // THE OPEN CHANNEL: a lead of dark water through the ice, jagged bright rims
        const t0 = CHANNEL.top[0], b0 = CHANNEL.bot[0];
        g.fillStyle = lg(g, 0, t0, 0, b0, [[0, '#071426'], [0.45, '#0b243e'], [1, '#081b30']]);
        channelPath(g); g.fill();
        g.save(); channelPath(g); g.clip();
        for (let i = 0; i < CHANNEL.top.length; i++){                                       // depth shadow under the far ice edge
          const x = i * CHANNEL.step, y = CHANNEL.top[i], d = (H - LAKE) * 0.07;
          g.fillStyle = lg(g, 0, y, 0, y + d, [[0, 'rgba(0,5,15,.55)'], [1, 'rgba(0,5,15,0)']]); g.fillRect(x - 1, y - 2, CHANNEL.step + 2, d + 2);
        }
        for (let i = 0; i < 46; i++){                                                        // faint ripples
          const x = psr(i * 3 + 950) * W, y = lerp(chanTop(x), chanBot(x), 0.15 + psr(i + 951) * 0.8), len = (14 + psr(i + 952) * 60) * U;
          g.strokeStyle = 'rgba(150,200,240,' + (0.06 + 0.1 * psr(i + 953)) + ')'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - len, y); g.lineTo(x + len, y); g.stroke();
        }
        g.restore();
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(90,140,190,.45)'; g.lineWidth = 4 * U;                       // the near rim: a lit lip of ice with a shadow line
        g.beginPath(); CHANNEL.bot.forEach((y, i) => i ? g.lineTo(i * CHANNEL.step, y + 3 * U) : g.moveTo(0, y + 3 * U)); g.stroke();
        g.strokeStyle = 'rgba(235,250,255,.92)'; g.lineWidth = 2.6 * U;
        g.beginPath(); CHANNEL.bot.forEach((y, i) => i ? g.lineTo(i * CHANNEL.step, y) : g.moveTo(0, y)); g.stroke();
        g.strokeStyle = 'rgba(225,245,255,.8)'; g.lineWidth = 1.8 * U;                     // the far rim
        g.beginPath(); CHANNEL.top.forEach((y, i) => i ? g.lineTo(i * CHANNEL.step, y) : g.moveTo(0, y)); g.stroke();
        paintIgloo(g, W * 0.175, LAKE + (H - LAKE) * 0.085, W * 0.085);
      }
      // an IGLOO on the far ice: a dome of snow blocks, a tunnel entrance with a warm glow inside
      function paintIgloo(g, x, y, w){
        const h = w * 0.52;
        g.fillStyle = 'rgba(10,25,50,.25)'; g.beginPath(); g.ellipse(x + w * 0.1, y + 1, w * 0.62, h * 0.12, 0, 0, TAU); g.fill();
        const dome = () => { g.beginPath(); g.moveTo(x - w * 0.5, y); g.bezierCurveTo(x - w * 0.5, y - h * 0.95, x - w * 0.15, y - h * 1.08, x, y - h * 1.08); g.bezierCurveTo(x + w * 0.15, y - h * 1.08, x + w * 0.5, y - h * 0.95, x + w * 0.5, y); g.closePath(); };
        g.fillStyle = lg(g, x - w * 0.5, y - h, x + w * 0.5, y, [[0, '#f6fbff'], [0.5, '#d7e9f7'], [1, '#93b8d8']]);
        dome(); g.fill();
        g.save(); dome(); g.clip();
        g.strokeStyle = 'rgba(70,110,160,.35)'; g.lineWidth = 1;
        for (let k = 1; k <= 4; k++){ const yy = y - h * k * 0.22, hw = w * 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow(k * 0.22 / 1.05, 2))); g.beginPath(); g.moveTo(x - hw - 2, yy); g.quadraticCurveTo(x, yy - h * 0.03, x + hw + 2, yy); g.stroke(); }
        for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++){ const yy = y - h * (k * 0.22), xx = x - w * 0.42 + (j + (k % 2) * 0.5) * w * 0.14; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + w * 0.01, yy - h * 0.2); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - w * 0.12, y - h * 0.8, w * 0.22, h * 0.14, -0.2, 0, TAU); g.fill();   // moonlit crown
        g.restore();
        // the entrance tunnel, its dark mouth and the warm light spilling out
        const ex = x + w * 0.38, ew = w * 0.2, eh = h * 0.42;
        IGLOO = { x, y, w, h, ex, ew, eh };
        g.fillStyle = lg(g, ex, y - eh, ex, y, [[0, '#e9f4fc'], [1, '#a6c6e0']]);
        g.beginPath(); g.moveTo(ex - ew, y); g.lineTo(ex - ew, y - eh * 0.55); g.arc(ex, y - eh * 0.55, ew, Math.PI, 0); g.lineTo(ex + ew, y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(40,25,20,.95)';                                                                 // the dark mouth (its firelight flickers live)
        g.beginPath(); g.moveTo(ex - ew * 0.6, y); g.lineTo(ex - ew * 0.6, y - eh * 0.5); g.arc(ex, y - eh * 0.5, ew * 0.6, Math.PI, 0); g.lineTo(ex + ew * 0.6, y); g.closePath(); g.fill();
      }
      function channelPath(g){
        const n = CHANNEL.top.length - 1, st = CHANNEL.step;
        g.beginPath(); g.moveTo(-10, CHANNEL.top[0]);
        CHANNEL.top.forEach((y, i) => g.lineTo(i * st, y)); g.lineTo(W + 10, CHANNEL.top[n]); g.lineTo(W + 10, CHANNEL.bot[n]);
        for (let i = n; i >= 0; i--) g.lineTo(i * st, CHANNEL.bot[i]);
        g.lineTo(-10, CHANNEL.bot[0]); g.closePath();
      }
      const chanAt = (arr, x) => { const f = Math.max(0, Math.min(arr.length - 1.001, x / CHANNEL.step)), i = Math.floor(f); return lerp(arr[i], arr[i + 1], f - i); };
      const chanTop = x => chanAt(CHANNEL.top, x), chanBot = x => chanAt(CHANNEL.bot, x);
      // a faceted iceberg standing on the ice at (x, y), width w, height h.
      // pts: outline in unit space (0..1 across, 0 at the base up to -1 at the peak)
      function iceberg(g, x, y, w, h, pts, seed){
        const P = pts.map(p => [x + p[0] * w, y + p[1] * h]);
        const path = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.closePath(); };
        let peak = 0; P.forEach((p, i) => { if (p[1] < P[peak][1]) peak = i; });
        // its moon shadow across the ice (to the left), then the faint mirror below
        g.fillStyle = 'rgba(5,20,45,.22)';
        g.beginPath(); g.ellipse(x + w * 0.3, y + h * 0.05, w * 0.7, h * 0.09, 0, 0, TAU); g.fill();
        g.save(); g.translate(0, y); g.scale(1, -0.5); g.translate(0, -y);
        g.fillStyle = lg(g, 0, y, 0, y - h, [[0, 'rgba(205,235,250,.30)'], [1, 'rgba(205,235,250,0)']]);
        path(); g.fill();
        g.restore();
        // body: white-blue top to deep cyan-blue base
        g.fillStyle = lg(g, 0, y - h, 0, y, [[0, '#f4fbff'], [0.35, '#d2eafa'], [0.75, '#8cc3ea'], [1, '#5a98d2']]);
        path(); g.fill();
        g.save(); path(); g.clip();
        // facets: faces fan from the peak (and from a second high point) to the base points
        let peak2 = -1; P.forEach((p, i) => { if (i !== peak && Math.abs(i - peak) > 1 && (peak2 < 0 || p[1] < P[peak2][1])) peak2 = i; });
        for (let i = 0; i < P.length - 1; i++){
          const a = P[i], b = P[i + 1], mid = (a[0] + b[0]) / 2, apex = (peak2 >= 0 && Math.abs(mid - P[peak2][0]) < Math.abs(mid - P[peak][0])) ? P[peak2] : P[peak];
          const lit = mid > apex[0];
          g.fillStyle = lit ? 'rgba(255,255,255,' + (0.08 + 0.14 * psr(seed + i)) + ')' : 'rgba(25,70,130,' + (0.10 + 0.20 * psr(seed + i)) + ')';
          g.beginPath(); g.moveTo(apex[0], apex[1]); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
        }
        // inner translucency: a cold cyan core and aurora light glowing up through the base
        g.fillStyle = rg(g, x + w * 0.5, y - h * 0.25, 0, w * 0.55, [[0, 'rgba(120,220,255,.28)'], [1, 'rgba(120,220,255,0)']]);
        g.fillRect(x - w, y - h, w * 3, h);
        g.fillStyle = lg(g, 0, y - h * 0.45, 0, y, [[0, 'rgba(90,255,190,0)'], [1, 'rgba(90,255,190,.26)']]);
        g.fillRect(x - w, y - h, w * 3, h);
        // fracture lines running down from the peak
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.lineCap = 'round';
        for (let i = 0; i < 4; i++){
          const ang = Math.PI / 2 + (psr(seed + i * 3) - 0.5) * 1.6, len = h * (0.35 + 0.5 * psr(seed + i * 5));
          g.beginPath(); g.moveTo(P[peak][0], P[peak][1] + 2);
          g.lineTo(P[peak][0] + Math.cos(ang) * len * 0.5, P[peak][1] + Math.sin(ang) * len * 0.5);
          g.lineTo(P[peak][0] + Math.cos(ang) * len + (psr(seed + i) - 0.5) * w * 0.1, P[peak][1] + Math.sin(ang) * len); g.stroke();
        }
        g.restore();
        // moonlit rim on the right-facing edges; a cool edge everywhere else; frost at the foot
        g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1, 1.5 * U);
        g.beginPath();
        for (let i = 0; i < P.length - 1; i++){ const a = P[i], b = P[i + 1]; if (b[0] > a[0] && b[1] > a[1]){ g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } }
        g.stroke();
        g.strokeStyle = 'rgba(170,215,245,.4)'; g.lineWidth = 1; path(); g.stroke();
        g.fillStyle = rg(g, x + w * 0.5, y, 0, w * 0.6, [[0, 'rgba(240,248,255,.45)'], [1, 'rgba(240,248,255,0)']]);
        g.save(); g.translate(x + w * 0.5, y); g.scale(1, 0.12); g.beginPath(); g.arc(0, 0, w * 0.6, 0, TAU); g.fill(); g.restore();
      }
      function paintFore(g){
        g.clearRect(0, 0, W, H);
        // icebergs and shards — the big one right, a mid one left, shards along the far shore
        iceberg(g, W * 0.70, LAKE + (H - LAKE) * 0.42, W * 0.27, H * 0.26,
          [[0, 0], [0.06, -0.42], [0.18, -0.55], [0.30, -0.98], [0.42, -0.70], [0.55, -0.82], [0.61, -0.52], [0.90, -0.47], [0.96, -0.20], [1, 0]], 3);
        iceberg(g, W * 0.02, LAKE + (H - LAKE) * 0.30, W * 0.19, H * 0.15,
          [[0, 0], [0.10, -0.55], [0.25, -0.62], [0.42, -1.0], [0.58, -0.66], [0.72, -0.78], [0.88, -0.36], [1, 0]], 9);
        iceberg(g, W * 0.40, LAKE + (H - LAKE) * 0.18, W * 0.09, H * 0.06,
          [[0, 0], [0.2, -0.7], [0.45, -1.0], [0.7, -0.6], [0.9, -0.75], [1, 0]], 15);
        for (let i = 0; i < 7; i++){
          const x = W * (0.12 + psr(i * 3 + 700) * 0.8), y = LAKE + (H - LAKE) * (0.06 + psr(i + 701) * 0.14), w = W * (0.02 + psr(i + 702) * 0.035), h = H * (0.015 + psr(i + 703) * 0.03);
          iceberg(g, x, y, w, h, [[0, 0], [0.3, -0.8], [0.55, -1.0], [0.8, -0.5], [1, 0]], 20 + i);
        }
        // foreground shore: snow banks with blue shadows and wind ripples
        g.fillStyle = lg(g, 0, H * 0.86, 0, H, [[0, 'rgba(225,238,250,0)'], [0.35, '#d7e8f6'], [1, '#b9d2e8']]);
        g.beginPath(); g.moveTo(-10, H);
        for (let x = -10; x <= W + 20; x += 24){ g.lineTo(x, H * 0.91 + Math.sin(x / W * 9 + 1) * H * 0.012 + Math.sin(x / W * 23) * H * 0.006 + (fbm(x / W * 12, 99, 2) - 0.5) * H * 0.02); }
        g.lineTo(W + 10, H); g.closePath(); g.fill();
        // wind-sculpted drifts: soft light crests with blue shadow beneath
        for (const [fx, fy, r] of [[0.08, 0.955, 0.06], [0.3, 0.965, 0.05], [0.58, 0.96, 0.07], [0.86, 0.955, 0.055]]){
          const x = fx * W, y = fy * H, rx = r * W;
          g.fillStyle = rg(g, x, y - rx * 0.05, 0, rx, [[0, 'rgba(250,253,255,.9)'], [0.6, 'rgba(240,247,255,.5)'], [1, 'rgba(240,247,255,0)']]);
          g.save(); g.translate(x, y); g.scale(1, 0.26); g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
          g.fillStyle = rg(g, x - rx * 0.15, y + rx * 0.1, 0, rx * 0.9, [[0, 'rgba(90,130,180,.22)'], [1, 'rgba(90,130,180,0)']]);
          g.save(); g.translate(x - rx * 0.15, y + rx * 0.1); g.scale(1, 0.14); g.beginPath(); g.arc(0, 0, rx * 0.9, 0, Math.PI); g.fill(); g.restore();
        }
        for (let i = 0; i < 260; i++){                                 // snow grains catching the light
          const x = psr(i * 3 + 900) * W, y = H * (0.905 + psr(i * 5 + 901) * 0.09);
          g.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.35 * psr(i + 902)) + ')';
          g.beginPath(); g.arc(x, y, 0.5 + psr(i + 903) * 0.9, 0, TAU); g.fill();
        }
        // a vignette: dark cold corners
        g.fillStyle = rg(g, W * 0.5, H * 0.5, Math.min(W, H) * 0.45, Math.max(W, H) * 0.78, [[0, 'rgba(0,4,16,0)'], [1, 'rgba(0,4,16,.55)']]);
        g.fillRect(0, 0, W, H);
      }

      // ── scene objects ──
      function buildScene(){
        U = Math.min(W, H) / 800;
        LAKE = H * 0.64;
        STARS = Array.from({ length: 320 }, (_, i) => {
          const bright = psr(i + 50) > 0.72;
          return { x: psr(i * 2 + 5) * W, y: psr(i * 2 + 6) * H * 0.6, r: bright ? 0.9 + psr(i + 60) * 1.1 : 0.35 + psr(i + 60) * 0.7,
                   a: bright ? 0.9 : 0.25 + psr(i + 61) * 0.5, tw: bright, ph: psr(i + 70) * TAU, spd: 0.6 + psr(i + 80) * 1.8,
                   col: psr(i + 90) < 0.15 ? '255,225,200' : psr(i + 90) < 0.3 ? '200,215,255' : '235,240,255' };
        });
        TWINKLE = STARS.filter(s => s.tw);
        FLAKES = Array.from({ length: 160 }, (_, i) => ({
          x: Math.random() * W, y: Math.random() * H, r: (0.5 + psr(i + 100) * 1.8) * U, vy: (14 + psr(i + 110) * 30) * U, ph: psr(i + 120) * TAU, a: 0.35 + psr(i + 130) * 0.55,
        }));
        SPARKS = Array.from({ length: 46 }, (_, i) => ({
          x: psr(i * 3 + 200) * W, y: LAKE + (H - LAKE) * (0.1 + psr(i * 5 + 201) * 0.88), ph: psr(i + 210) * TAU, spd: 0.25 + psr(i + 220) * 0.5, r: (2 + psr(i + 230) * 3) * U,
        }));
        MIST = Array.from({ length: 4 }, (_, i) => ({
          x: psr(i + 400) * W, y: LAKE + (H - LAKE) * (0.02 + psr(i + 410) * 0.12), w: W * (0.3 + psr(i + 420) * 0.4), h: H * (0.02 + psr(i + 430) * 0.03), spd: (3 + psr(i + 440) * 5) * U, a: 0.10 + psr(i + 450) * 0.08,
        }));
        CHANNEL = { step: 8, top: [], bot: [] };
        for (let x = 0; x <= W + 16; x += 8){
          const u = x / W;
          CHANNEL.top.push(LAKE + (H - LAKE) * (0.13 + 0.02 * Math.sin(u * 7 + 0.6) + 0.025 * (fbm(u * 9, 61, 2) - 0.5)));
          CHANNEL.bot.push(LAKE + (H - LAKE) * (0.44 + 0.03 * Math.sin(u * 5 + 1.3) + 0.035 * (fbm(u * 7, 62, 2) - 0.5)));
        }
        // seals on the icebergs' ledges: [x, y, slope, scale, dir, phase]
        const bigX = W * 0.70, bigY = LAKE + (H - LAKE) * 0.42, bigW = W * 0.27, bigH = H * 0.26;
        const leftX = W * 0.02, leftY = LAKE + (H - LAKE) * 0.30, leftW = W * 0.19, leftH = H * 0.15;
        SEALS = [
          { x: bigX + bigW * 0.70, y: bigY - bigH * 0.505, rot: Math.atan2(0.05 * bigH, 0.29 * bigW), s: U * 1.45, dir: -1, ph: 0.3, waveT0: -10, waterX: bigX - bigW * 0.04 },
          { x: bigX + bigW * 0.84, y: bigY - bigH * 0.482, rot: Math.atan2(0.05 * bigH, 0.29 * bigW), s: U * 0.9, dir: 1, ph: 2.1, waveT0: -10, waterX: bigX - bigW * 0.04 },
          { x: leftX + leftW * 0.18, y: leftY - leftH * 0.585, rot: Math.atan2(-0.07 * leftH, 0.15 * leftW), s: U * 1.3, dir: 1, ph: 4.0, waveT0: -10, waterX: leftX + leftW * 1.04 },
        ];
        ORCAS = [
          { lane: 0.32, x: W * 0.25, dir: 1, speed: 26, ph: 0.0, cycle: 4.6, breach: 0, spouted: false },
          { lane: 0.72, x: W * 0.78, dir: -1, speed: 22, ph: 2.4, cycle: 5.4, breach: 0, spouted: false },
        ];
        PRINCESSES = [
          { name: 'brunette', x: W * 0.30, dir: 1, wt: 0, walking: true, pauseUntil: 0, nextPauseAt: 7, castT0: -10, s: H * 0.20 / 100, sc: H * 0.25 / 751, y: H * 0.952, speed: 24 },
          { name: 'blonde', x: W * 0.68, dir: -1, wt: 1.7, walking: true, pauseUntil: 0, nextPauseAt: 13, castT0: -10, s: H * 0.20 / 100, sc: H * 0.25 / 751 * 0.93, y: H * 0.958, speed: 28 },
        ];
        PR = PRINCESSES[0];
        if (!OLAF) OLAF = { x: W * 0.45, dir: 1, walking: true, pauseUntil: 0, nextPauseAt: 8, hopBusy: false, el: null, w: 0, h: 0, y: 0 };
        OLAF.speed = H * 0.045;
        OLAF.x = Math.max(W * 0.06, Math.min(W * 0.94, OLAF.x));
        // a polar bear mother and her cub, ambling across the ice
        BEARS = [
          { x: W * 0.52, dir: -1, y: LAKE + (H - LAKE) * 0.64, s: U * 1.0, speed: 15, wt: 0, ph: 0.4, sniffT0: -10, nextSniffAt: 9 },
          { x: W * 0.52 + 110 * U, dir: -1, y: LAKE + (H - LAKE) * 0.66, s: U * 0.58, speed: 15, wt: 1.3, ph: 2.2, sniffT0: -10, nextSniffAt: 16, cub: true },
        ];
      }

      // ── SEALS: plump harbour seals lounging on the ice — a raised head that
      //    looks about, blinks, a flap of the front flipper, a slow breath
      // The seals ACT on a schedule (and on click): a belly-up ROLL with wiggling
      // flippers, a GALUMPH (hop) along the ledge, a CLAP + bark, and a DIVE — a
      // slide down the iceberg into the channel with a splash, a swim with the
      // head bobbing above the water, and a hop back onto the ledge.
      function updateSeals(t, dt){
        for (const S of SEALS){
          if (S.nextActAt === undefined) S.nextActAt = t + rnd(4, 12);
          if (S.act && t - S.act.t0 > S.act.dur){ S.act = null; S.nextActAt = t + rnd(7, 15); }
          if (!S.act && t > S.nextActAt) startSealAct(S, null, t);
        }
      }
      function startSealAct(S, type, t){
        if (S.act) return;
        type = type || ['roll', 'scoot', 'clap', 'dive', 'dive'][Math.floor(Math.random() * 5)];
        S.act = { type, t0: t, dur: type === 'dive' ? 9.5 : type === 'roll' ? 3.4 : 1.8, wx: S.waterX };
      }
      function sealPose(S, t){
        const P = { x: S.x, y: S.y, rot: S.rot, dir: S.dir, flip: 0, hop: 0, clap: 0, wiggle: 0, swim: false };
        const a = S.act; if (!a) return P;
        const k = clamp01((t - a.t0) / a.dur);
        if (a.type === 'roll'){
          const up = smooth(clamp01(k / 0.18)), down = smooth(clamp01((k - 0.8) / 0.2));
          P.flip = Math.PI * (up - down); P.wiggle = up - down;
          P.hop = 12 * S.s * (Math.sin(Math.PI * clamp01(k / 0.18)) + Math.sin(Math.PI * clamp01((k - 0.8) / 0.2)));
        } else if (a.type === 'scoot'){
          P.x += S.dir * 16 * S.s * Math.sin(Math.PI * k); P.hop = 9 * S.s * Math.abs(Math.sin(2 * Math.PI * k));
        } else if (a.type === 'clap'){ P.clap = Math.sin(Math.PI * k); }
        else if (a.type === 'dive'){
          const wx = a.wx, wy = lerp(chanTop(wx), chanBot(wx), 0.92), sgn = Math.sign(wx - S.x) || S.dir;
          if (k < 0.12){                                                                             // the slide down into the water
            const u = smooth(k / 0.12);
            P.x = lerp(S.x, wx, u); P.y = lerp(S.y, wy - 4 * S.s, u) - Math.sin(Math.PI * u) * 6 * S.s; P.rot = lerp(S.rot, 0.7, u) * sgn; P.dir = sgn;
            if (u > 0.9 && !a.splashed){ a.splashed = true; for (let i = 0; i < 16; i++) SPLASH.push({ x: wx + rnd(-10, 10) * S.s, y: wy, vx: rnd(-50, 50) * S.s, vy: -rnd(40, 170) * S.s, t0: t, r: rnd(1, 2.4) * S.s }); SPLASH.push({ ring: true, x: wx, y: wy, t0: t, s: S.s * 0.5 }); }
          } else if (k < 0.82){                                                                      // the swim: out and back, head above the water
            const u = (k - 0.12) / 0.7;
            P.swim = true; P.dir = u < 0.5 ? sgn : -sgn;
            P.x = wx + sgn * 90 * S.s * Math.sin(Math.PI * u);
            P.clipY = lerp(chanTop(P.x), chanBot(P.x), 0.92);
            P.y = P.clipY + 5 * S.s + Math.sin(t * 3) * 1.5 * S.s; P.rot = -0.12 * Math.sin(t * 3);
          } else {                                                                                   // the hop back onto the ledge
            const u = smooth((k - 0.82) / 0.18);
            P.x = lerp(wx, S.x, u); P.y = lerp(wy - 4 * S.s, S.y, u) - Math.sin(Math.PI * u) * 24 * S.s; P.rot = lerp(-0.5 * sgn, S.rot, u); P.dir = -sgn;
            if (u < 0.06 && !a.exitSplash){ a.exitSplash = true; for (let i = 0; i < 10; i++) SPLASH.push({ x: wx + rnd(-8, 8) * S.s, y: wy, vx: rnd(-30, 30) * S.s, vy: -rnd(60, 180) * S.s, t0: t, r: rnd(1, 2) * S.s }); }
          }
        }
        return P;
      }
      function drawSeal(g, S, t, P){
        const { s, ph } = S, rot = P.rot, dir = P.dir;
        g.save();
        if (P.swim){                                                                                 // only what is above the water line shows, plus a wake
          g.strokeStyle = 'rgba(200,230,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(P.x - dir * 14 * s, P.clipY); g.lineTo(P.x - dir * 50 * s, P.clipY + 2 * s); g.stroke();
          g.beginPath(); g.rect(0, 0, W, P.clipY); g.clip();
        }
        g.translate(P.x, P.y); g.rotate(rot); g.scale(dir * s, s);
        if (!P.swim){ g.fillStyle = 'rgba(10,25,50,.28)'; g.beginPath(); g.ellipse(0, 3, 30 - (P.hop / s) * 0.4, 5, 0, 0, TAU); g.fill(); }   // shadow on the ice
        g.translate(0, -P.hop / s);
        g.translate(0, -5); g.rotate(P.flip); g.translate(0, 5);                                    // the belly-up roll
        const breathe = 1 + 0.02 * Math.sin(t * 1.1 + ph);
        g.rotate(0.05 * Math.sin(t * 0.9 + ph));                                                   // rocking on the ice
        g.save(); g.scale(1, breathe);
        const body = () => { g.beginPath(); g.moveTo(-27, 1); g.bezierCurveTo(-26, -8, -14, -13, 2, -13); g.bezierCurveTo(14, -13, 22, -8, 24, -1); g.bezierCurveTo(23, 3, 14, 5, 0, 5); g.bezierCurveTo(-14, 5, -26, 4, -27, 1); g.closePath(); };
        g.fillStyle = lg(g, 0, -13, 0, 5, [[0, '#b7c9d9'], [0.55, '#8ea3b8'], [1, '#5f748a']]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = 'rgba(40,60,85,.32)';
        for (const [x, y, r] of [[-14, -6, 2.6], [-6, -9, 2.1], [4, -7, 2.4], [-18, 0, 1.8], [10, -3, 1.7], [-2, -2, 1.5]]){ g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0.3, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-4, -10, 12, 2.5, 0, 0, TAU); g.fill();      // moonlit back
        if (P.swim){ g.fillStyle = 'rgba(120,150,180,.35)'; g.fillRect(-30, -4, 60, 12); }                            // wet, darker
        g.restore();
        g.restore();
        // tail flippers (wiggle faster belly-up)
        g.fillStyle = '#7f94a9';
        for (const a of [-0.55, 0.45]){ g.save(); g.translate(-28, 1); g.rotate(a + (0.16 + 0.5 * P.wiggle) * Math.sin(t * (3.1 + 8 * P.wiggle) + ph) + 0.08 * Math.sin(t * 1.7 + ph)); g.beginPath(); g.ellipse(-5, 0, 6, 2.4, 0, 0, TAU); g.fill(); g.restore(); }
        // front flipper: flaps now and then, WAVES (slow rhythm or click), CLAPS, wiggles belly-up
        const wk = t - S.waveT0, wave = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.17 + ph * 2)), 14), wk > 0 && wk < 1.8 ? Math.sin(wk / 1.8 * Math.PI) : 0);
        const flap = Math.pow(Math.max(0, Math.sin(t * 0.9 + ph)), 6) * 0.5 + wave * (1.9 + 0.25 * Math.sin(t * 9)) + P.clap * (1.1 + 0.9 * Math.sin(t * 16)) + P.wiggle * (0.7 + 0.6 * Math.sin(t * 11 + 1));
        g.save(); g.translate(6, 2); g.rotate(0.55 - flap); g.fillStyle = '#7f94a9'; g.beginPath(); g.ellipse(5, 0, 7.5, 2.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(40,60,85,.5)'; g.lineWidth = 0.8; g.beginPath(); for (const k of [-1, 0, 1]){ g.moveTo(6, k * 1.2); g.lineTo(12, k * 1.8); } g.stroke(); g.restore();
        // the head: raised, looking about; the occasional lift and bark (the clap barks too)
        const lift = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.23 + ph)), 8), P.clap * (0.6 + 0.4 * Math.sin(t * 8)));
        g.save(); g.translate(18, -6); g.rotate(-0.12 * Math.sin(t * 0.6 + ph) - 0.5 * lift + (P.swim ? -0.35 : 0));
        g.fillStyle = lg(g, 0, -12, 0, 4, [[0, '#bfd0de'], [1, '#8296aa']]);
        g.beginPath(); g.arc(6, -3, 8, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(12.5, -1.2, 4.2, 3.2, 0.2, 0, TAU); g.fill();                     // muzzle
        g.fillStyle = '#26303c'; g.beginPath(); g.ellipse(15.8, -2.4, 1.3, 1.0, 0.3, 0, TAU); g.fill();   // nose
        if (lift > 0.5){ g.fillStyle = '#3a1e22'; g.beginPath(); g.ellipse(13.5, 1.6, 2.2, 1.4 * (lift - 0.5) * 2, 0.2, 0, TAU); g.fill(); }   // a bark
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.7;                                // whiskers
        g.beginPath(); for (let k = 0; k < 3; k++){ g.moveTo(13, -0.5 + k * 1.1); g.lineTo(21, -2.5 + k * 2.4); } g.stroke();
        const blinkK = Math.pow(Math.max(0, Math.sin(t * 0.7 + ph * 1.3)), 60);                    // one big dark eye (profile)
        g.save(); g.translate(8, -6); g.scale(1, Math.max(0.1, 1 - blinkK));
        g.fillStyle = '#141a22'; g.beginPath(); g.ellipse(0, 0, 2.2, 2.4, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-0.7, -0.8, 0.7, 0, TAU); g.fill();
        g.restore();
        g.strokeStyle = 'rgba(40,60,85,.6)'; g.lineWidth = 0.9; g.beginPath(); g.arc(8, -6, 3.2, -2.6, -0.6); g.stroke();   // a brow line
        g.restore();
        g.restore();
      }
      // ── ORCAS: they cruise the channel, porpoising — the dorsal fin cuts the
      //    surface, the back rolls up with a spout, and now and then one BREACHES
      function drawOrcaBody(g, C){
        const body = () => { g.beginPath(); g.moveTo(-52, 0); g.bezierCurveTo(-40, -10, -20, -15, 6, -15); g.bezierCurveTo(30, -15, 46, -9, 54, 0); g.bezierCurveTo(46, 8, 28, 14, 4, 14); g.bezierCurveTo(-20, 14, -42, 9, -52, 0); g.closePath(); };
        g.fillStyle = lg(g, 0, -15, 0, 14, [[0, '#1a1f28'], [0.6, '#0b0e14'], [1, '#05070b']]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = '#f2f5f8';
        g.beginPath(); g.moveTo(54, 1); g.bezierCurveTo(44, 8, 26, 13, 4, 14); g.bezierCurveTo(-10, 14, -18, 12, -22, 9); g.bezierCurveTo(-8, 7, 12, 4, 30, 2); g.closePath(); g.fill();   // white chin + belly
        g.beginPath(); g.ellipse(31, -6.5, 7.5, 3, -0.15, 0, TAU); g.fill();                        // the eye patch
        g.fillStyle = 'rgba(160,170,185,.55)'; g.beginPath(); g.ellipse(-8, -12, 11, 3.2, 0, 0, TAU); g.fill();   // saddle patch
        g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(8, -11, 26, 3, 0, 0, TAU); g.fill();       // wet sheen along the back
        g.restore();
        g.fillStyle = '#0b0e14';
        g.beginPath(); g.moveTo(10, -13); g.bezierCurveTo(6, -30, 0, -40, -6, -44); g.bezierCurveTo(-8, -32, -12, -20, -14, -13); g.closePath(); g.fill();   // dorsal fin
        g.save(); g.translate(24, 7); g.rotate(0.5); g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, TAU); g.fill(); g.restore();               // pectoral fin
        g.beginPath(); g.moveTo(-50, -1); g.bezierCurveTo(-58, -9, -66, -11, -70, -8); g.bezierCurveTo(-64, -4, -60, -2, -56, 0); g.bezierCurveTo(-60, 2, -64, 4, -70, 8); g.bezierCurveTo(-66, 11, -58, 9, -50, 1); g.closePath(); g.fill();   // flukes
        g.fillStyle = '#0b0e14'; g.beginPath(); g.arc(37, -3.6, 1.1, 0, TAU); g.fill();            // the eye
      }
      function updateOrcas(t, dt){
        for (const o of ORCAS){
          const s = U * (0.8 + 1.0 * o.lane);
          o.x += o.dir * o.speed * s * dt;
          if (o.x > W + 90 * s){ o.dir = -1; o.lane = 0.25 + Math.random() * 0.6; }
          if (o.x < -90 * s){ o.dir = 1; o.lane = 0.25 + Math.random() * 0.6; }
          const p = (t / o.cycle) * TAU + o.ph, rise = Math.max(0, Math.sin(p));
          if (rise > 0.35 && !o.spouted){ o.spouted = true; SPOUTS.push({ x: o.x + o.dir * 40 * s, y: lerp(chanTop(o.x), chanBot(o.x), o.lane) - 8 * s, t0: t, s }); }
          if (rise < 0.05) o.spouted = false;
          if (o.breach && rise < 0.02 && Math.cos(p) > 0){ o.breach = 0; }
          if (o.breach === 1 && rise < 0.06 && Math.cos(p) < 0){
            o.breach = 2;
            const wy = lerp(chanTop(o.x), chanBot(o.x), o.lane);
            for (let i = 0; i < 26; i++) SPLASH.push({ x: o.x + rnd(-40, 40) * s, y: wy, vx: rnd(-70, 70) * s, vy: -rnd(60, 260) * s, t0: t, r: rnd(1.2, 3.2) * s });
            SPLASH.push({ ring: true, x: o.x, y: wy, t0: t, s });
          }
        }
        if (t > nextBreachAt){ nextBreachAt = t + rnd(18, 32); const o = ORCAS[Math.floor(Math.random() * ORCAS.length)]; if (!o.breach) o.breach = 1; }
        SPOUTS = SPOUTS.filter(q => t - q.t0 < 1.4);
        SPLASH = SPLASH.filter(q => t - q.t0 < (q.ring ? 1.0 : 1.3));
        for (const q of SPLASH) if (!q.ring){ q.vy += 520 * q.r / 2 * dt * 3; q.x += q.vx * dt; q.y += q.vy * dt; }
      }
      function drawOrcas(t){
        for (const o of ORCAS){
          const s = U * (0.8 + 1.0 * o.lane), wy = lerp(chanTop(o.x), chanBot(o.x), o.lane);
          const p = (t / o.cycle) * TAU + o.ph, rise = Math.max(0, Math.sin(p)), k = o.breach ? 1 : 0.32;
          const amp = (26 + 70 * (o.breach ? 1 : 0)) * s, ang = -Math.cos(p) * (o.breach ? 0.9 : 0.35) * (rise > 0 || o.breach ? 1 : 0);
          const cy = wy + 9 * s - rise * amp;
          // the body under the surface: a faint dark shape seen through the water
          ctx.save(); ctx.beginPath(); ctx.rect(0, wy, W, H - wy); ctx.clip(); ctx.globalAlpha = 0.16;
          ctx.translate(o.x, cy); ctx.rotate(ang * o.dir); ctx.scale(o.dir * s, s); drawOrcaBody(ctx); ctx.restore();
          // the body above the surface
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, wy); ctx.clip();
          ctx.translate(o.x, cy); ctx.rotate(ang * o.dir); ctx.scale(o.dir * s, s); drawOrcaBody(ctx); ctx.restore();
          // the wake where the fin cuts the water
          ctx.strokeStyle = 'rgba(200,230,255,.35)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(o.x - o.dir * 20 * s, wy); ctx.lineTo(o.x - o.dir * 70 * s, wy + 2 * s); ctx.stroke();
        }
        for (const q of SPOUTS){
          const k = (t - q.t0) / 1.4;
          for (let i = 0; i < 5; i++){ const a = psr(i * 3 + 7); ctx.fillStyle = 'rgba(230,245,255,' + (0.4 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(q.x + (a - 0.5) * 14 * q.s * (0.5 + k), q.y - (8 + 26 * a) * q.s * k, (2 + 3 * a + 6 * k) * q.s, 0, TAU); ctx.fill(); }
        }
        for (const q of SPLASH){
          if (q.ring){ const k = (t - q.t0); ctx.strokeStyle = 'rgba(220,240,255,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 2 * q.s; ctx.beginPath(); ctx.ellipse(q.x, q.y, (10 + 90 * k) * q.s, (3 + 25 * k) * q.s, 0, 0, TAU); ctx.stroke(); }
          else { const a = 1 - (t - q.t0) / 1.3; ctx.fillStyle = 'rgba(235,248,255,' + (0.9 * a) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
        }
      }
      // ── THE PRINCESSES: two sisters, both the low-poly SVG from
      //    princess/princess.html (window.PrincessArt, injected on demand). The
      //    younger sister is the same art RECOLOURED (blonde hair, a rose gown
      //    with icy trims, pink gems, blue eyes). Pose FRAMES come from injecting
      //    a transform into the Left_Arm group — three arm swings for the walk,
      //    one raised arm for the cast — rasterized through <img> data URLs.
      //    They walk the snow bank (bob, lean, arm swing, breath), turn at the
      //    edges and when they meet, and pause now and then to conjure snowflakes.
      const ARM_PIVOT = [238, 256], HAND0 = [212, 412];              // the shoulder joint and the palm, in SVG units
      const SISTER = {
        '#682E1E': '#E8C86B', '#32120D': '#B8923A', '#522319': '#D9B45A', '#773922': '#F0D786', '#662C1D': '#C99E45', '#5D261A': '#C09338',
        '#733621': '#E3C26A', '#5F271A': '#CFA94E', '#8A432A': '#F6E3A0', '#54231B': '#BF9840', '#692E1F': '#B48A3C', '#662D1C': '#B48A3C',
        '#567A72': '#B05A8E', '#63838F': '#C777A8', '#6FBBA9': '#F0A3C9', '#68A396': '#E08BB7', '#6EBBA9': '#F0A3C9', '#639E91': '#D67FAE', '#9CA4A9': '#E6D6F0',
        '#EEBB7F': '#DCE9F5', '#F5BD7E': '#E6F0FA', '#F2B579': '#CFDDEC', '#F0A545': '#BFD9F2', '#F5AA47': '#DDEEFB',
        '#6CB77C': '#F06292', '#74BD85': '#F48FB1', '#73BC85': '#F48FB1', '#769C9B': '#7FB0E8', '#56817D': '#3D74C4',
      };
      function poseSvg(armDeg, pal){
        let svg = window.PrincessArt.svg.replace('<g id="Left_Arm">', '<g id="Left_Arm" transform="rotate(' + armDeg + ' ' + ARM_PIVOT[0] + ' ' + ARM_PIVOT[1] + ')">');
        if (pal) svg = svg.replace(/#[0-9A-Fa-f]{6}/g, c => pal[c.toUpperCase()] || c);
        return svg;
      }
      function buildPrincessFrames(){
        if (!window.PrincessArt || PFR) return;
        const mk = (deg, pal) => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(poseSvg(deg, pal)); return im; };
        const set = pal => ({ walk: [mk(-14, pal), mk(0, pal), mk(14, pal)], cast: mk(150, pal) });
        PFR = { brunette: set(null), blonde: set(SISTER) };
      }
      function armHand(deg){
        const r = deg * Math.PI / 180, vx = HAND0[0] - ARM_PIVOT[0], vy = HAND0[1] - ARM_PIVOT[1];
        return [ARM_PIVOT[0] + vx * Math.cos(r) - vy * Math.sin(r), ARM_PIVOT[1] + vx * Math.sin(r) + vy * Math.cos(r)];
      }
      function princessPose(P, t){
        const castK = t - P.castT0, cast = castK > 0 && castK < 2.8;
        const fi = P.walking ? (Math.sin(P.wt) > 0.35 ? 2 : Math.sin(P.wt) < -0.35 ? 0 : 1) : 1;
        return { cast, fi, deg: cast ? 150 : [-14, 0, 14][fi] };
      }
      function princessHand(P, t){
        const A = window.PrincessArt, h = armHand(princessPose(P, t).deg);
        return { x: P.x + P.dir * (h[0] - A.centerX) * P.sc, y: P.y - (A.feetY - h[1]) * P.sc };
      }
      function startCast(P, t){ P.pauseUntil = t + 3.4; P.castT0 = t + 0.3; }
      function updatePrincess(P, t, dt){
        if (t < P.pauseUntil){ P.walking = false; }
        else {
          P.walking = true;
          P.x += P.dir * P.speed * P.s * dt; P.wt += dt * 2.3;
          if (P.x > W * 0.9) P.dir = -1; if (P.x < W * 0.1) P.dir = 1;
          for (const Q of PRINCESSES) if (Q !== P && Math.abs(Q.x - P.x) < 46 * P.s && Math.sign(Q.x - P.x) === P.dir) P.dir = -P.dir;   // the sisters do not walk through each other
          if (t > P.nextPauseAt){ P.nextPauseAt = t + rnd(11, 19); startCast(P, t); }
        }
        const castK = t - P.castT0;
        if (castK > 0 && castK < 2.2 && Math.random() < dt * 28){
          const hp = princessHand(P, t);
          MAGIC.push({ x: hp.x, y: hp.y, vx: rnd(-1, 1) * 30 * P.s + P.dir * 20 * P.s, vy: -rnd(20, 60) * P.s, t0: t, r: rnd(2, 4.5) * P.s, ph: rnd(0, TAU), spin: rnd(-3, 3) });
        }
      }
      function updateMagic(t, dt){
        MAGIC = MAGIC.filter(m => t - m.t0 < 1.8);
        const s0 = PR.s;
        for (const m of MAGIC){ m.x += (m.vx + Math.sin(t * 3 + m.ph) * 18 * s0) * dt; m.y += m.vy * dt; m.vy -= 8 * s0 * dt; }
      }
      function snowflake(g, x, y, r, rot, col){
        g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.lineWidth = Math.max(0.6, r * 0.18); g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i < 6; i++){ const a = i * Math.PI / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); g.lineTo(Math.cos(a + 0.5) * r * 0.85, Math.sin(a + 0.5) * r * 0.85); g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); g.lineTo(Math.cos(a - 0.5) * r * 0.85, Math.sin(a - 0.5) * r * 0.85); }
        g.stroke(); g.restore();
      }
      function drawPrincess(g, P, t){
        const A = window.PrincessArt;
        if (!PFR || !A) return;
        const set = PFR[P.name], pose = princessPose(P, t), img = pose.cast ? set.cast : set.walk[pose.fi];
        if (!img.complete || !img.naturalWidth) return;
        g.save(); g.translate(P.x, P.y);
        g.fillStyle = 'rgba(20,40,80,.28)'; g.beginPath(); g.ellipse(0, 1, 26 * P.s, 4 * P.s, 0, 0, TAU); g.fill();   // her shadow on the snow
        const bob = P.walking ? Math.sin(P.wt * 2) * 1.2 * P.s : 0, breathe = 1 + 0.004 * Math.sin(t * 1.3 + P.wt);
        g.translate(0, bob);
        g.rotate(P.walking ? Math.sin(P.wt) * 0.025 * P.dir : 0);
        g.scale(P.dir, breathe);
        g.drawImage(img, -A.centerX * P.sc, -A.feetY * P.sc, A.viewBox[2] * P.sc, A.viewBox[3] * P.sc);
        g.restore();
        if (pose.cast){                                               // a cold glow in the raised hand
          const castK = t - P.castT0, k = Math.sin(Math.min(1, castK / 0.6) * Math.PI / 2) * (castK > 2.2 ? Math.max(0, 1 - (castK - 2.2) / 0.6) : 1);
          const h = princessHand(P, t);
          g.fillStyle = rg(g, h.x, h.y, 0, 16 * P.s, [[0, 'rgba(180,240,255,' + (0.7 * k) + ')'], [1, 'rgba(180,240,255,0)']]);
          g.beginPath(); g.arc(h.x, h.y, 16 * P.s, 0, TAU); g.fill();
        }
      }
      function drawMagic(g, t){
        for (const m of MAGIC){
          const k = (t - m.t0) / 1.8, a = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k);
          snowflake(g, m.x, m.y, m.r * (0.8 + 0.3 * k), t * m.spin + m.ph, 'rgba(225,245,255,' + (0.95 * a) + ')');
          g.fillStyle = 'rgba(180,235,255,' + (0.35 * a) + ')'; g.beginPath(); g.arc(m.x, m.y, m.r * 1.6, 0, TAU); g.fill();
        }
      }
      // ── POLAR BEARS: a mother and her cub ambling across the ice — a heavy
      //    four-legged gait, a swaying head, a stop to sniff the ice; the cub
      //    trots behind and catches up. Profile (one eye), soft moonlit fur.
      function bearLeg(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col, paw){
        g.save(); g.translate(hx, hy); g.rotate(a1);
        g.strokeStyle = col; g.lineCap = 'round';
        g.lineWidth = w1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, upLen); g.stroke();
        g.translate(0, upLen); g.rotate(a2);
        g.lineWidth = w2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, loLen); g.stroke();
        g.translate(0, loLen); g.rotate(-(a1 + a2));
        g.fillStyle = col; g.beginPath(); g.ellipse(2, 1.5, w2 * 0.75, w2 * 0.38, 0, 0, TAU); g.fill();
        g.fillStyle = paw; for (const k of [-1, 0, 1]){ g.beginPath(); g.arc(2 + k * w2 * 0.42, 1.5 + w2 * 0.28, w2 * 0.12, 0, TAU); g.fill(); }
        g.restore();
      }
      // The bears ACT on a schedule: the mother SITS up on her haunches to watch
      // the sky, SHAKES snow off her fur, SNIFFS the ice; the cub belly-SLIDES
      // across the ice, STANDS up on its hind legs, shakes and sniffs too.
      function bearAct(B, t){
        const a = B.act; if (!a) return { type: null, k: 0, e: 0 };
        const k = clamp01((t - a.t0) / a.dur), e = Math.sin(Math.min(1, k / 0.2) * Math.PI / 2) * (k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.2) : 1);
        return { type: a.type, k, e };
      }
      function startBearAct(B, type, t){
        if (B.act) return;
        const dur = { sit: 6.5, shake: 1.7, sniff: 2.8, slide: 2.6, stand: 2.6 }[type];
        B.act = { type, t0: t, dur }; if (type === 'slide') B.slideDir = B.dir;
      }
      function drawBear(g, B, t){
        const { s, dir, ph } = B, wt = B.wt, moving = B.moving, act = bearAct(B, t);
        const sniff = act.type === 'sniff' ? act.e : 0, sit = act.type === 'sit' ? act.e : 0, stand = act.type === 'stand' ? act.e : 0, slide = act.type === 'slide' ? act.e : 0, shake = act.type === 'shake' ? act.e : 0;
        g.save(); g.translate(B.x, B.y);
        g.fillStyle = 'rgba(10,25,50,.28)'; g.beginPath(); g.ellipse(0, 2, (52 - 10 * sit) * s, 6 * s, 0, 0, TAU); g.fill();
        g.scale(dir * s, s);
        if (moving && !slide) g.translate(0, Math.sin(wt * 2) * 1.4);
        g.translate(0, 8 * slide);                                                                   // belly-sliding: low to the ice
        g.rotate(Math.sin(t * 42) * 0.09 * shake);                                                   // the shake
        const A = i => (moving && !slide ? 0.22 : 0) * Math.sin(wt + i * Math.PI / 2), Bk = i => moving && !slide ? 0.22 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;
        const splay = 0.9 * slide;                                                                   // legs out flat while sliding
        const fur = '#f2f6fa', furD = '#c8d8e6', furS = '#a9bfd2';
        bearLeg(g, -30, -30, 14, 14, A(2) + splay, 0.05 + Bk(2) - splay * 0.4, 13, 12, furD, furS);   // far hind leg
        g.save();
        g.translate(-28, -16); g.rotate(-(0.62 * sit + 1.05 * stand)); g.translate(28, 16);          // sitting / rearing: the body pivots on the hind hips
        bearLeg(g, 30, -32, 14, 14, A(0) - splay - 0.8 * stand, -0.05 - Bk(0) * 0.6 + splay * 0.4, 12, 11, furD, furS);   // far front leg
        const body = () => { g.beginPath(); g.moveTo(-46, -26); g.bezierCurveTo(-50, -42, -38, -56, -14, -58); g.bezierCurveTo(6, -62, 30, -60, 44, -50); g.bezierCurveTo(52, -42, 50, -26, 40, -18); g.bezierCurveTo(24, -12, -20, -12, -36, -16); g.bezierCurveTo(-44, -18, -47, -22, -46, -26); g.closePath(); };
        g.fillStyle = lg(g, 0, -62, 0, -12, [[0, '#fbfdff'], [0.55, fur], [1, furD]]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = lg(g, 0, -30, 0, -12, [[0, 'rgba(169,191,210,0)'], [1, 'rgba(169,191,210,.7)']]); g.fillRect(-60, -34, 120, 24);   // the shadowed underside
        g.fillStyle = 'rgba(120,255,190,.10)'; g.beginPath(); g.ellipse(-4, -56, 40, 6, 0, 0, TAU); g.fill();                              // aurora light on the back
        g.restore();
        g.fillStyle = furD; g.beginPath(); g.arc(-47, -28, 4, 0, TAU); g.fill();                                                         // tail nub
        bearLeg(g, 24, -30, 14, 14, A(1) - splay - 0.8 * stand, -0.05 - Bk(1) * 0.6 + splay * 0.4, 13, 12, fur, furS);    // near front leg
        // neck + head (sways; lowers to sniff; lifts to watch the sky when sitting)
        g.save(); g.translate(44, -48); g.rotate(0.05 * Math.sin(t * 0.8 + ph) + 0.55 * sniff - 0.25 * sit - 0.2 * stand); g.translate(0, 10 * sniff);
        g.strokeStyle = fur; g.lineCap = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(-6, 0); g.lineTo(10, -2); g.stroke();
        const hs = B.cub ? 1.15 : 1;
        g.save(); g.scale(hs, hs);
        g.fillStyle = lg(g, 0, -14, 0, 10, [[0, '#fbfdff'], [1, furD]]);
        g.beginPath(); g.arc(12, -2, 11, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(22, 2, 7, 5.2, 0.15, 0, TAU); g.fill();                                                                 // snout
        for (const [ex, ey] of [[6, -11], [15, -12]]){ g.fillStyle = fur; g.beginPath(); g.arc(ex, ey, 3.6, 0, TAU); g.fill(); g.fillStyle = furS; g.beginPath(); g.arc(ex, ey, 2, 0, TAU); g.fill(); }   // ears
        g.fillStyle = '#1a1c22'; g.beginPath(); g.ellipse(28.5, 1.5, 2.6, 2, 0.2, 0, TAU); g.fill();                                      // nose
        g.strokeStyle = 'rgba(40,50,60,.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(27, 4); g.quadraticCurveTo(24, 6.5, 20, 5.5); g.stroke();   // mouth
        const blinkK = Math.pow(Math.max(0, Math.sin(t * 0.6 + ph)), 60);
        g.save(); g.translate(16, -4); g.scale(1, Math.max(0.1, 1 - blinkK)); g.fillStyle = '#141820'; g.beginPath(); g.ellipse(0, 0, 1.7, 1.9, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-0.5, -0.6, 0.55, 0, TAU); g.fill(); g.restore();   // the eye
        g.restore(); g.restore();
        g.restore();                                                                                                                      // end of the pivoting group
        bearLeg(g, -22, -28, 14, 14, A(3) + splay, 0.05 + Bk(3) - splay * 0.4, 14, 13, fur, furS);    // near hind leg
        g.restore();
      }
      function updateBears(t, dt){
        const mom = BEARS[0];
        for (const B of BEARS){
          if (B.nextActAt === undefined) B.nextActAt = t + rnd(6, 14);
          if (B.act && t - B.act.t0 > B.act.dur){ B.act = null; B.nextActAt = t + rnd(9, 18); }
          if (!B.act && t > B.nextActAt){
            const pool = B.cub ? ['slide', 'stand', 'shake', 'sniff'] : ['sit', 'shake', 'sniff', 'sit'];
            startBearAct(B, pool[Math.floor(Math.random() * pool.length)], t);
          }
          const act = bearAct(B, t);
          if (act.type === 'shake' && act.e > 0.4 && Math.random() < dt * 40) FURFX.push({ x: B.x + rnd(-40, 40) * B.s, y: B.y - rnd(20, 56) * B.s, vx: rnd(-60, 60) * B.s, vy: -rnd(20, 90) * B.s, t0: t, r: rnd(1, 2.2) * B.s });
          if (act.type === 'slide'){
            B.moving = true; B.dir = B.slideDir;
            const sp = B.speed * 3.4 * B.s * (1 - act.k);
            B.x += B.dir * sp * dt;
            if (Math.random() < dt * 30) FURFX.push({ x: B.x - B.dir * 30 * B.s, y: B.y, vx: -B.dir * rnd(20, 80) * B.s, vy: -rnd(10, 60) * B.s, t0: t, r: rnd(1, 2.6) * B.s });
            continue;
          }
          if (B.act){ B.moving = false; continue; }
          if (B.cub){
            const target = mom.x - mom.dir * 95 * mom.s, dx = target - B.x;
            B.moving = Math.abs(dx) > 6 * B.s;
            if (B.moving){ B.dir = dx > 0 ? 1 : -1; B.x += B.dir * Math.min(Math.abs(dx), B.speed * 1.35 * B.s * dt); B.wt += dt * 3.2; }
            else B.dir = mom.dir;
          } else {
            B.moving = true;
            B.x += B.dir * B.speed * B.s * dt; B.wt += dt * 2.1; if (B.x > W * 0.92) B.dir = -1; if (B.x < W * 0.08) B.dir = 1;
          }
        }
        FURFX = FURFX.filter(q => t - q.t0 < 1.1);
        for (const q of FURFX){ q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      }
      function drawFurFx(g, t){
        for (const q of FURFX){ const a = 1 - (t - q.t0) / 1.1; g.fillStyle = 'rgba(240,247,255,' + (0.85 * a) + ')'; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); }
      }

      // ── THE CASTLE comes alive: windows flicker each on their own rhythm (with
      //    the odd blink), the great door breathes light, the spire tips twinkle, a
      //    sheen of light sweeps across the crystal, and a pennant waves on the
      //    tallest spire.
      function drawCastleFx(t){
        if (!CASTLE) return;
        const S = CASTLE.S;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const L of CASTLE.lights){
          const f = 0.55 + 0.45 * Math.sin(t * (1.1 + psr(L.seed) * 1.6) + psr(L.seed + 1) * TAU), blink = Math.pow(Math.max(0, Math.sin(t * 0.37 + psr(L.seed + 2) * TAU)), 40);
          const a = (0.25 + 0.45 * f) * (1 - 0.8 * blink);
          ctx.fillStyle = rg(ctx, L.x, L.y, 0, L.r * 1.4, [[0, 'rgba(190,240,255,' + a + ')'], [1, 'rgba(190,240,255,0)']]);
          ctx.beginPath(); ctx.arc(L.x, L.y, L.r * 1.4, 0, TAU); ctx.fill();
        }
        if (CASTLE.door){
          const D = CASTLE.door, f = 0.6 + 0.4 * Math.sin(t * 2.3) * Math.sin(t * 1.1 + 1);
          ctx.fillStyle = rg(ctx, D.x, D.y, 0, D.r * 1.3, [[0, 'rgba(200,250,255,' + (0.35 * f) + ')'], [1, 'rgba(200,250,255,0)']]);
          ctx.beginPath(); ctx.arc(D.x, D.y, D.r * 1.3, 0, TAU); ctx.fill();
        }
        for (const T of CASTLE.tips){
          const k = Math.pow(Math.max(0, Math.sin(t * (0.7 + psr(T.seed) * 0.9) + psr(T.seed + 3) * TAU)), 24), r = S * 0.05 * k;
          if (k < 0.03) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * k) + ')'; ctx.lineWidth = 1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(T.x - r, T.y); ctx.lineTo(T.x + r, T.y); ctx.moveTo(T.x, T.y - r); ctx.lineTo(T.x, T.y + r); ctx.stroke();
          ctx.fillStyle = rg(ctx, T.x, T.y, 0, r, [[0, 'rgba(255,255,255,' + (0.6 * k) + ')'], [1, 'rgba(255,255,255,0)']]); ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, TAU); ctx.fill();
        }
        const sk = (t * 0.12) % 1, bx = CASTLE.cx - S * 1.1 + sk * S * 2.2;                       // the sweeping sheen
        ctx.save();
        ctx.beginPath(); for (const sp of CASTLE.spires){ ctx.moveTo(sp.x - sp.hw, CASTLE.base + 2); ctx.lineTo(sp.x - sp.hw * 0.8, sp.sh); ctx.lineTo(sp.x, sp.top); ctx.lineTo(sp.x + sp.hw * 0.8, sp.sh); ctx.lineTo(sp.x + sp.hw, CASTLE.base + 2); ctx.closePath(); }
        ctx.clip();
        ctx.translate(bx, CASTLE.base); ctx.rotate(-0.35);
        ctx.fillStyle = lg(ctx, -S * 0.3, 0, S * 0.3, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(230,250,255,.22)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(-S * 0.3, -S * 1.7, S * 0.6, S * 2.2);
        ctx.restore();
        ctx.restore();
        const main = CASTLE.spires.reduce((a, b) => (b.top < a.top ? b : a));                      // the pennant
        const px = main.x, py = main.top - S * 0.06, fl = S * 0.14, fh = S * 0.05;
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py + S * 0.01); ctx.lineTo(px, py - fh * 1.4); ctx.stroke();
        ctx.fillStyle = lg(ctx, px, 0, px + fl, 0, [[0, '#eaf8ff'], [1, '#8fd0f2']]);
        ctx.beginPath(); ctx.moveTo(px, py - fh * 1.4);
        for (let i = 1; i <= 6; i++){ const u = i / 6; ctx.lineTo(px + fl * u, py - fh * 1.4 + Math.sin(t * 6 - u * 5) * fh * 0.25 * u - fh * 0.15 * u); }
        for (let i = 6; i >= 1; i--){ const u = i / 6; ctx.lineTo(px + fl * u, py - fh * 1.4 + Math.sin(t * 6 - u * 5) * fh * 0.25 * u + fh * (1 - 0.65 * u)); }
        ctx.closePath(); ctx.fill();
      }

      // ── THE IGLOO comes alive: firelight flickers in the doorway and spills on
      //    the snow, smoke curls from the chimney hole, and an ARCTIC FOX trots
      //    out now and then, sits to look about (ears up, tail wagging), and
      //    trots back inside.
      function drawIglooFx(t, dt){
        if (!IGLOO) return;
        const I = IGLOO, f = 0.72 + 0.22 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.06 * Math.sin(t * 13.7);
        ctx.fillStyle = rg(ctx, I.ex, I.y - I.eh * 0.35, 0, I.ew * 0.9, [[0, 'rgba(255,205,130,' + (0.95 * f) + ')'], [0.6, 'rgba(255,160,80,' + (0.7 * f) + ')'], [1, 'rgba(255,140,60,0)']]);
        ctx.beginPath(); ctx.moveTo(I.ex - I.ew * 0.6, I.y); ctx.lineTo(I.ex - I.ew * 0.6, I.y - I.eh * 0.5); ctx.arc(I.ex, I.y - I.eh * 0.5, I.ew * 0.6, Math.PI, 0); ctx.lineTo(I.ex + I.ew * 0.6, I.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rg(ctx, I.ex + I.ew * 0.4, I.y + 1, 0, I.w * 0.45, [[0, 'rgba(255,190,110,' + (0.38 * f) + ')'], [1, 'rgba(255,190,110,0)']]);
        ctx.save(); ctx.translate(I.ex + I.ew * 0.4, I.y + 1); ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(0, 0, I.w * 0.45, 0, TAU); ctx.fill(); ctx.restore();
        if (Math.random() < dt * 1.4) SMOKE.push({ x: I.x - I.w * 0.08, y: I.y - I.h * 1.05, t0: t, r: I.w * 0.03, drift: rnd(-0.3, 0.3) });
        SMOKE = SMOKE.filter(q => t - q.t0 < 4.5);
        for (const q of SMOKE){
          const k = (t - q.t0) / 4.5, x = q.x + (q.drift + wind * 0.6) * k * I.w * 0.6 + Math.sin(k * 6 + q.t0) * I.w * 0.05, y = q.y - k * I.h * 2.2, r = q.r * (1 + 4 * k);
          ctx.fillStyle = 'rgba(200,210,225,' + (0.22 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
        updateFox(t, dt); drawFox(ctx, t);
      }
      function updateFox(t, dt){
        const I = IGLOO;
        if (!FOX) FOX = { state: 'in', t0: t, nextOutAt: t + rnd(5, 12), x: I.ex, y: I.y + I.h * 0.02, dir: 1, s: U * 0.5, wt: 0, tx: I.ex };
        const F = FOX, k = t - F.t0;
        if (F.state === 'in'){ if (t > F.nextOutAt){ F.state = 'out'; F.t0 = t; F.dir = 1; F.tx = I.ex + I.w * (0.55 + Math.random() * 0.5); } }
        else if (F.state === 'out'){ const u = clamp01(k / 2.6); F.x = lerp(I.ex, F.tx, u); F.wt += dt * 9; if (u >= 1){ F.state = 'sit'; F.t0 = t; } }
        else if (F.state === 'sit'){ if (k > 4.5){ F.state = 'back'; F.t0 = t; F.dir = -1; } }
        else if (F.state === 'back'){ const u = clamp01(k / 2.6); F.x = lerp(F.tx, I.ex, u); F.wt += dt * 9; if (u >= 1){ F.state = 'in'; F.t0 = t; F.nextOutAt = t + rnd(18, 34); } }
      }
      function drawFox(g, t){
        const F = FOX; if (!F || F.state === 'in') return;
        const s = F.s, sit = F.state === 'sit';
        g.save(); g.translate(F.x, F.y); g.scale(F.dir * s, s);
        g.fillStyle = 'rgba(10,25,50,.25)'; g.beginPath(); g.ellipse(0, 1, 26, 3.5, 0, 0, TAU); g.fill();
        const fur = '#f6f8fb', furD = '#cdd9e4';
        g.strokeStyle = fur; g.lineCap = 'round'; g.lineWidth = 4.5;
        if (sit){ g.beginPath(); g.moveTo(-8, -10); g.lineTo(-12, 0); g.moveTo(6, -14); g.lineTo(8, 0); g.moveTo(11, -14); g.lineTo(13, 0); g.stroke(); }
        else for (let i = 0; i < 4; i++){ const a = Math.sin(F.wt + i * Math.PI / 2) * 0.5, hx = i < 2 ? -12 + i * 4 : 8 + (i - 2) * 4; g.beginPath(); g.moveTo(hx, -12); g.lineTo(hx + Math.sin(a) * 12, -12 + Math.cos(a) * 12); g.stroke(); }
        const wag = sit ? Math.sin(t * 5) * 0.35 : Math.sin(F.wt * 0.5) * 0.15;                                      // the bushy tail
        g.save(); g.translate(-16, sit ? -8 : -14); g.rotate(-0.6 + wag); g.fillStyle = fur; g.beginPath(); g.ellipse(-12, 0, 14, 5.5, 0, 0, TAU); g.fill(); g.fillStyle = furD; g.beginPath(); g.ellipse(-22, 0, 5, 4, 0, 0, TAU); g.fill(); g.restore();
        g.save(); if (sit) g.rotate(-0.55);
        g.fillStyle = lg(g, 0, -22, 0, -8, [[0, fur], [1, furD]]); g.beginPath(); g.ellipse(0, -15, 17, 8, 0, 0, TAU); g.fill();
        g.restore();
        const look = sit ? Math.sin(t * 0.9) * 0.25 : 0;                                                              // the head turns to look about
        g.save(); g.translate(sit ? 8 : 15, sit ? -30 : -20); g.rotate(look);
        g.fillStyle = fur; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(3, -2); g.lineTo(12, 1.5); g.lineTo(3, 4); g.closePath(); g.fill();
        for (const ex of [-3, 2.5]){ g.beginPath(); g.moveTo(ex - 2.5, -4); g.lineTo(ex, -11); g.lineTo(ex + 2.5, -4); g.closePath(); g.fill(); }
        g.fillStyle = '#1a1c22'; g.beginPath(); g.arc(12, 1.5, 1.2, 0, TAU); g.fill(); g.beginPath(); g.ellipse(3, -1.5, 1.1, 1.3, 0, 0, TAU); g.fill();
        g.restore();
        g.restore();
      }

      // ── OLAF (olaf/olaf.js — the pure-CSS rig lifted out of the old
      //    frozen.bg.js). He ambles along the foreground snow bank, pausing now
      //    and then; the walk cycle (stepping feet, swinging twig arms, rocking
      //    head) is the rig's own CSS, switched by the `fzo-walk` class, and the
      //    crossing is a transform this scene drives. Click him → a happy HOP
      //    (on the inner .fzo-a, so the walk keeps playing underneath) and a
      //    burst of snowflakes.
      function buildOlaf(){
        if (!window.OlafArt || !olafLayer || (OLAF && OLAF.el)) return;
        if (!doc.getElementById('aurora-olaf-css')){
          const st = doc.createElement('style'); st.id = 'aurora-olaf-css';
          st.textContent = window.OlafArt.css; doc.head.appendChild(st);
        }
        const wrap = doc.createElement('div');
        wrap.className = 'fz-olaf';
        wrap.style.left = '0'; wrap.style.top = '0';
        wrap.innerHTML = '<div class="fz-shadow"></div><div class="fzo-a"><div class="fzo-sc">' + window.OlafArt.html + '</div></div>';
        olafLayer.appendChild(wrap);
        OLAF.el = wrap; OLAF.act = wrap.querySelector('.fzo-a'); OLAF.sc = wrap.querySelector('.fzo-sc');
        fitOlaf();
      }
      function fitOlaf(){
        if (!OLAF || !OLAF.el) return;
        OLAF.h = H * 0.20; OLAF.y = H * 0.968;
        const k = OLAF.h / window.OlafArt.nativeH;
        OLAF.w = window.OlafArt.nativeW * k;
        OLAF.el.style.height = OLAF.h.toFixed(1) + 'px';
        OLAF.el.style.width = OLAF.w.toFixed(1) + 'px';
        OLAF.sc.style.transform = 'scale(' + k.toFixed(4) + ')';
      }
      function updateOlaf(t, dt){
        const O = OLAF; if (!O || !O.el) return;
        if (t < O.pauseUntil) O.walking = false;
        else {
          O.walking = true;
          O.x += O.dir * O.speed * dt;
          if (O.x > W * 0.94) O.dir = -1;
          if (O.x < W * 0.06) O.dir = 1;
          if (t > O.nextPauseAt){ O.pauseUntil = t + rnd(2.5, 5.5); O.nextPauseAt = t + rnd(13, 24); }
        }
        O.el.classList.toggle('fzo-walk', O.walking);
        O.el.style.transform = 'translate(' + (O.x - O.w / 2).toFixed(1) + 'px,' + (O.y - O.h).toFixed(1) + 'px)';
      }
      function olafHop(t){
        const O = OLAF; if (!O || !O.act) return;
        if (!O.hopBusy && O.act.animate){
          O.hopBusy = true;
          const a = O.act.animate([
            { transform: 'translateY(0) rotate(0)' },
            { transform: 'translateY(-16px) rotate(-4deg)', offset: 0.35 },
            { transform: 'translateY(0) rotate(2deg)', offset: 0.7 },
            { transform: 'translateY(0) rotate(0)' },
          ], { duration: 620, easing: 'ease-out' });
          a.onfinish = () => { O.hopBusy = false; };
          setTimeout(() => { O.hopBusy = false; }, 800);
        }
        for (let i = 0; i < 14; i++){                                  // a burst of snowflakes around his head
          const ang = rnd(-Math.PI, 0), sp = rnd(30, 110) * (H / 800);
          MAGIC.push({ x: O.x + rnd(-0.2, 0.2) * O.w, y: O.y - O.h * 0.78, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
                       t0: t, r: rnd(2.5, 5.5) * (H / 800), ph: rnd(0, TAU), spin: rnd(-3, 3) });
        }
      }

      // ── per-frame drawing ──
      function drawTwinkle(t){
        for (const s of TWINKLE){
          const tw = 0.55 + 0.45 * Math.sin(t * s.spd + s.ph);
          ctx.fillStyle = 'rgba(' + s.col + ',' + (s.a * tw) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
          if (s.r > 1.6){                                             // a faint cross on the brightest
            ctx.strokeStyle = 'rgba(' + s.col + ',' + (0.25 * tw) + ')'; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(s.x - s.r * 3, s.y); ctx.lineTo(s.x + s.r * 3, s.y); ctx.moveTo(s.x, s.y - s.r * 3); ctx.lineTo(s.x, s.y + s.r * 3); ctx.stroke();
          }
        }
        if (t > nextShootAt){ nextShootAt = t + rnd(7, 16); SHOOTERS.push({ x: rnd(W * 0.1, W * 0.9), y: rnd(H * 0.03, H * 0.3), t0: t, ang: rnd(2.6, 3.0), len: rnd(70, 140) * U }); }
        SHOOTERS = SHOOTERS.filter(s => t - s.t0 < 1.0);
        for (const s of SHOOTERS){
          const k = (t - s.t0), x = s.x + Math.cos(s.ang) * k * s.len * 2.4, y = s.y + Math.sin(s.ang) * k * s.len * 2.4;
          const tx = x - Math.cos(s.ang) * s.len, ty = y - Math.sin(s.ang) * s.len, a = 1 - k;
          ctx.strokeStyle = lg(ctx, x, y, tx, ty, [[0, 'rgba(255,255,255,' + 0.9 * a + ')'], [0.4, 'rgba(180,220,255,' + 0.45 * a + ')'], [1, 'rgba(150,200,255,0)']]);
          ctx.lineWidth = 1.8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }
      // ── THE MOON: big, full, with maria, craters, limb darkening and a soft
      //    glow (no halo ring). Details are painted once into a small canvas.
      let moonCv = null, moonR = 0;
      function paintMoon(R){
        moonR = R; moonCv = doc.createElement('canvas'); const D = Math.ceil(R * 2 * DPR) + 4; moonCv.width = moonCv.height = D;
        const g = moonCv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); const c = D / (2 * DPR);
        g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip();
        g.fillStyle = rg(g, c - R * 0.25, c - R * 0.3, R * 0.1, R * 1.05, [[0, '#fffdf3'], [0.55, '#efeadb'], [0.85, '#d6d1c3'], [1, '#aaa69a']]);
        g.fillRect(0, 0, D, D);
        for (const [dx, dy, rx, ry, rot] of [[-0.28, -0.25, 0.34, 0.24, 0.3], [0.18, -0.05, 0.28, 0.2, -0.5], [-0.05, 0.42, 0.24, 0.14, 0.2], [0.4, -0.4, 0.15, 0.11, 0.6], [-0.5, 0.15, 0.16, 0.22, 0.1], [0.3, 0.35, 0.18, 0.1, -0.3]]){
          g.fillStyle = 'rgba(120,124,132,.28)'; g.beginPath(); g.ellipse(c + dx * R, c + dy * R, rx * R, ry * R, rot, 0, TAU); g.fill();   // the maria
          g.fillStyle = 'rgba(105,110,120,.18)'; g.beginPath(); g.ellipse(c + dx * R + R * 0.04, c + dy * R + R * 0.05, rx * R * 0.7, ry * R * 0.7, rot, 0, TAU); g.fill();
        }
        for (let i = 0; i < 26; i++){                                                                  // craters: a dark floor, a lit rim on the sunward side
          const a = psr(i * 3 + 70) * TAU, d = Math.sqrt(psr(i * 5 + 71)) * 0.92, x = c + Math.cos(a) * d * R, y = c + Math.sin(a) * d * R, r = R * (0.025 + psr(i + 72) * 0.07);
          g.fillStyle = 'rgba(95,100,110,' + (0.22 + 0.18 * psr(i + 73)) + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(0.6, r * 0.18); g.beginPath(); g.arc(x, y, r * 0.92, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
          g.strokeStyle = 'rgba(60,65,75,.3)'; g.beginPath(); g.arc(x, y, r * 0.92, Math.PI * -0.05, Math.PI * 0.75); g.stroke();
        }
        g.fillStyle = rg(g, c + R * 0.3, c + R * 0.3, R * 0.5, R * 1.02, [[0, 'rgba(60,60,80,0)'], [1, 'rgba(60,60,80,.42)']]);   // limb darkening
        g.fillRect(0, 0, D, D);
        g.restore();
      }
      function drawMoon(t){
        const mx = W * 0.82, my = H * 0.15, R = Math.min(W, H) * 0.068;
        if (!moonCv || Math.abs(moonR - R) > 0.5) paintMoon(R);
        const gl = 0.22 + 0.03 * Math.sin(t * 0.3);
        ctx.fillStyle = rg(ctx, mx, my, R * 0.9, R * 4.5, [[0, 'rgba(210,222,255,' + gl + ')'], [0.4, 'rgba(200,215,255,' + (gl * 0.35) + ')'], [1, 'rgba(200,215,255,0)']]);
        ctx.fillRect(mx - R * 5, my - R * 5, R * 10, R * 10);
        ctx.drawImage(moonCv, mx - moonCv.width / (2 * DPR), my - moonCv.height / (2 * DPR), moonCv.width / DPR, moonCv.height / DPR);
      }
      function drawReflections(){
        ctx.save();
        ctx.beginPath(); ctx.rect(0, LAKE, W, H - LAKE); ctx.clip();
        ctx.translate(0, LAKE); ctx.scale(1, -0.75); ctx.translate(0, -LAKE);
        ctx.globalAlpha = 0.20; ctx.drawImage(mtnL.cv, 0, 0, W, H);       // the ranges, dim in the ice
        ctx.globalCompositeOperation = 'lighter';
        for (const [dy, a] of [[0, 0.20], [-H * 0.014, 0.11], [H * 0.014, 0.11], [H * 0.03, 0.06]]){   // the aurora, smeared vertically
          ctx.globalAlpha = a; ctx.drawImage(auroraLo.cv, 0, dy, W, H);
        }
        ctx.restore();
        // the open water mirrors the aurora far more brightly than the ice
        ctx.save(); channelPath(ctx); ctx.clip();
        ctx.translate(0, LAKE); ctx.scale(1, -0.75); ctx.translate(0, -LAKE);
        ctx.globalCompositeOperation = 'lighter';
        for (const [dy, a] of [[0, 0.30], [-H * 0.01, 0.16], [H * 0.01, 0.16]]){ ctx.globalAlpha = a; ctx.drawImage(auroraLo.cv, 0, dy, W, H); }
        ctx.restore();
        // the aurora's light on the far ice and the snow line
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lg(ctx, 0, H * 0.5, 0, H * 0.72, [[0, 'rgba(60,200,140,0)'], [0.55, 'rgba(60,200,140,' + (0.07 * intensity) + ')'], [1, 'rgba(60,200,140,0)']]);
        ctx.fillRect(0, H * 0.5, W, H * 0.22);
        ctx.restore();
      }
      function drawMist(t, dt){
        for (const m of MIST){
          m.x += m.spd * dt * (1 + wind * 0.3); if (m.x - m.w > W) m.x = -m.w;
          ctx.fillStyle = rg(ctx, m.x, m.y, 0, m.w, [[0, 'rgba(210,230,245,' + m.a + ')'], [1, 'rgba(210,230,245,0)']]);
          ctx.save(); ctx.translate(m.x, m.y); ctx.scale(1, m.h / m.w); ctx.beginPath(); ctx.arc(0, 0, m.w, 0, TAU); ctx.fill(); ctx.restore();
        }
      }
      function drawSparks(t){
        for (const s of SPARKS){
          const k = Math.pow(Math.max(0, Math.sin(t * s.spd + s.ph)), 40); if (k < 0.02) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * k) + ')'; ctx.lineWidth = 1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.x - s.r, s.y); ctx.lineTo(s.x + s.r, s.y); ctx.moveTo(s.x, s.y - s.r * 0.7); ctx.lineTo(s.x, s.y + s.r * 0.7); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * k) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 0.9, 0, TAU); ctx.fill();
        }
      }
      function drawSnow(g, t, dt){
        if (!snowOn) return;
        const gust = Math.sin(t * 0.21) * 9 * U + wind * 18 * U;
        for (const f of FLAKES){
          f.y += f.vy * dt; f.x += (Math.sin(t * 0.8 + f.ph) * 8 * U + gust) * dt * (0.6 + f.r / U * 0.4);
          if (f.y > H + 4){ f.y = -4; f.x = Math.random() * W; }
          if (f.x > W + 4) f.x = -4; else if (f.x < -4) f.x = W + 4;
          g.fillStyle = 'rgba(240,247,255,' + f.a + ')';
          g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
        }
      }

      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        // an aurora SURGE (click the sky): brighter, faster curtains for ~5 s
        const sk = surge ? Math.sin(clamp01((t - surge.t0) / 5) * Math.PI) : 0;
        if (surge && t - surge.t0 > 5) surge = null;
        auroraT += dt * (1 + 2.6 * sk); surgeBoost = 1 + 1.1 * sk;
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        drawTwinkle(t);
        drawMoon(t);
        // the aurora: rays at half-res, a soft bloom from the 1/8-res copy, added to the sky
        drawAurora(auroraL.cx, auroraL.w, auroraL.h, auroraT);
        auroraLo.cx.clearRect(0, 0, auroraLo.w, auroraLo.h);
        auroraLo.cx.drawImage(auroraL.cv, 0, 0, auroraLo.w, auroraLo.h);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9; ctx.drawImage(auroraLo.cv, 0, 0, W, H);
        ctx.globalAlpha = 0.8; ctx.drawImage(auroraL.cv, 0, 0, W, H);
        ctx.restore();
        ctx.drawImage(mtnL.cv, 0, 0, W, H);
        drawCastleFx(t);
        ctx.drawImage(lakeL.cv, 0, 0, W, H);
        drawReflections();
        drawIglooFx(t, dt);
        updateOrcas(t, dt); drawOrcas(t);
        updateSeals(t, dt);
        const sealPoses = SEALS.map(S => [S, sealPose(S, t)]);
        for (const [S, P] of sealPoses) if (P.swim) drawSeal(ctx, S, t, P);          // swimming seals: behind the icebergs
        drawMist(t, dt);
        ctx.drawImage(foreL.cv, 0, 0, W, H);
        for (const [S, P] of sealPoses) if (!P.swim) drawSeal(ctx, S, t, P);
        updateBears(t, dt); for (const B of BEARS) drawBear(ctx, B, t); drawFurFx(ctx, t);
        drawSparks(t);
        for (const P of PRINCESSES) updatePrincess(P, t, dt);
        updateMagic(t, dt);
        for (const P of PRINCESSES.slice().sort((a, b) => a.y - b.y)) drawPrincess(ctx, P, t);
        updateOlaf(t, dt);
        fxCtx.clearRect(0, 0, W, H);                                   // the layer ABOVE Olaf
        drawMagic(fxCtx, t);
        drawSnow(fxCtx, t, dt);
      }
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        renderFrame((ts - t0) / 1000);
        rafId = requestAnimationFrame(frame);
      }

      function resize(){
        W = innerWidth; H = innerHeight;
        canvas.width = W * DPR; canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        fxCv.width = W * DPR; fxCv.height = H * DPR;
        fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
        buildScene();
        fitOlaf();
        skyL = makeLayer(W, H, DPR); mtnL = makeLayer(W, H, DPR); lakeL = makeLayer(W, H, DPR); foreL = makeLayer(W, H, DPR);
        auroraL = makeLayer(Math.round(W / 2), Math.round(H / 2), 1);
        auroraLo = makeLayer(Math.round(W / 8), Math.round(H / 8), 1);
        auroraLo.cx.imageSmoothingEnabled = true;
        paintSky(skyL.cx); paintMountains(mtnL.cx); paintLake(lakeL.cx); paintFore(foreL.cx);
      }

      const onClick = e => {
        if (stopped) return;
        if (e.target.closest && e.target.closest(UI_SEL)) return;
        const mx = e.clientX, my = e.clientY;
        for (const P of PRINCESSES) if (Math.abs(mx - P.x) < 40 * P.s && my < P.y + 6 * P.s && my > P.y - 190 * P.s){ startCast(P, lastT); return; }
        for (const S of SEALS) if (Math.abs(mx - S.x) < 34 * S.s && Math.abs(my - S.y + 6 * S.s) < 24 * S.s){ S.waveT0 = lastT; if (!S.act && Math.random() < 0.5) startSealAct(S, null, lastT); return; }
        for (const B of BEARS) if (Math.abs(mx - B.x) < 50 * B.s && my < B.y + 4 * B.s && my > B.y - 70 * B.s){ startBearAct(B, B.cub ? 'stand' : 'sit', lastT); return; }
        if (OLAF && OLAF.el && Math.abs(mx - OLAF.x) < OLAF.w * 0.7 && my < OLAF.y + 8 && my > OLAF.y - OLAF.h){ olafHop(lastT); return; }
        if (my < H * 0.58) surge = { t0: lastT };
      };
      doc.addEventListener('click', onClick);
      // OLAF is a pure-CSS DOM rig, so he rides his own layer OVER the scene
      // canvas; the snowfall and the conjured snowflakes then draw on an fx
      // canvas ABOVE him, so snow falls in front of him as it does the others.
      olafLayer = doc.createElement('div');
      // direction:ltr — the game page is RTL, where an absolutely positioned
      // box with auto offsets takes its static position at the RIGHT edge
      olafLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;direction:ltr';
      stage.appendChild(olafLayer);
      fxCv = doc.createElement('canvas');
      fxCv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none';
      stage.appendChild(fxCv);
      fxCtx = fxCv.getContext('2d');
      resize();
      addEventListener('resize', resize);
      rafId = requestAnimationFrame(frame);
      needScript('PrincessArt', 'princess/princess.js', () => { if (!stopped) buildPrincessFrames(); });
      needScript('OlafArt', 'olaf/olaf.js', () => { if (!stopped) buildOlaf(); });

      const hooks = {
        intensity: v => { intensity = Math.max(0, +v || 0); },
        snow: on => { snowOn = !!on; },
        wind: v => { wind = +v || 0; },
        shoot: () => { nextShootAt = lastT - 1; },
        cast: () => PRINCESSES.forEach((P, i) => { P.pauseUntil = lastT + 3.4; P.castT0 = lastT + 0.3 + i * 0.5; }),
        breach: () => { const o = ORCAS[0]; o.breach = 1; },
        surge: () => { surge = { t0: lastT }; },
        wave: () => SEALS.forEach(S => { S.waveT0 = lastT; }),
        sniff: () => BEARS.forEach(B => startBearAct(B, 'sniff', lastT)),
        dive: () => startSealAct(SEALS[0], 'dive', lastT),
        roll: () => SEALS.forEach(S => startSealAct(S, 'roll', lastT)),
        sit: () => { startBearAct(BEARS[0], 'sit', lastT); startBearAct(BEARS[1], 'stand', lastT); },
        slide: () => startBearAct(BEARS[1], 'slide', lastT),
        fox: () => { if (FOX && FOX.state === 'in') FOX.nextOutAt = lastT - 1; },
        hop: () => olafHop(lastT),
        olaf: () => OLAF,
        princess: () => PRINCESSES, orcas: () => ORCAS, bears: () => BEARS,
      };
      window.BACKGROUNDS.aurora._test = hooks; window._aurora = hooks;

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        stage.innerHTML = '';
        if (window._aurora === hooks) delete window._aurora;
        if (window.BACKGROUNDS.aurora._test === hooks) delete window.BACKGROUNDS.aurora._test;
      };
    },
  };
})();
