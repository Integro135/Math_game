/* ── Aurora 2 — the ❄️ ice world, painted again from scratch (2026-11) ─────────
   Theme `frozen` → this module (`_BG_THEMES`); skin and aids are the ❄️ theme's
   (`frozen`). Harness: aurora2.html. Notes: backgrounds/README.md ("aurora2").
   Tests: tests/test_aurora2.py. Stills: _verify_aurora2.py.

   A polar night over a frozen lake. Everything that is PAINTED is new:
     · THE SKY — a deep gradient paling to teal at the horizon, the Milky Way as
       gas cut by tiling noise into clouds with a dust lane, veils of violet and
       teal, thousands of faint stars (painted once)
     · THE AURORA — three curtains; the rays are drawn one pixel wide into a
       narrow strip that is stretched across the sky with smoothing, so a curtain
       is silk rather than a picket fence (~500 tiny blits every other frame)
     · THE RANGES — painted PER PIXEL at reduced size: a jagged skyline, a ridged
       relief whose spurs run downhill, every pixel lit by its slope toward the
       moon (bright snow · blue shadow · dark rock where it is too steep for
       snow), haze with depth, the aurora's green on the high snow; a line of
       firs along the far shore
     · THE ICE PALACE — crystal prisms of three faces with snow on their ledges,
       warm lancet windows, an arcade, flying bridges, a great gate
     · THE LAKE — cloudy ice (noise laid in soft-light), cracks, drifted snow, the
       open channel; it mirrors the ranges and the palace, and the aurora
     · ICEBERGS — blue glacier ice with lit facets, melt grooves, a light
       inside, snow on every ledge
     · THE NEAR SHORE — deep snow with hollows and crests, firs under snow at
       both ends

   THE ANIMALS are repainted too (v10.31): seals, orcas, the polar bears and the
   arctic fox each have a new draw function (cached gradients, no per-frame
   allocations); `_aurora2.sheet(true)` shows them all large.

   THE CAST's behaviour and the engine are aurora.bg.js's, carried over VERBATIM
   (see that file's header for how each works): harbour seals on the icebergs (roll, clap,
   galumph, dive), two orcas in the channel (they porpoise and breach), the two
   princess sisters (princess/princess.js) who walk the shore and conjure
   snowflakes, the snowman (olaf/olaf.js, a DOM rig on its own layer), a polar
   bear and her cub, the igloo's firelight and its arctic fox, the palace's
   flickering windows and — on a tap — a lightning storm over its spires,
   shooting stars, snowfall, mist. Layers, the pacing loop, the taps and the
   hooks are unchanged; the hook is now window._aurora2.
   ─────────────────────────────────────────────────────────────────────────── */
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
  // a 4096-entry hash table stands in for the sin() hash — several times cheaper, same look
  const HTAB = new Float32Array(4096); for (let i = 0; i < 4096; i++) HTAB[i] = psr(i + 0.37);
  function vnoise(x, seed){
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), sh = (seed * 97 | 0) * 7919;
    return lerp(HTAB[(i * 1013 + sh) & 4095], HTAB[((i + 1) * 1013 + sh) & 4095], u);
  }
  function fbm(x, seed, oct){
    let a = 0, amp = 0.5, fr = 1, n = 0;
    for (let o = 0; o < (oct || 3); o++){ a += amp * vnoise(x * fr, seed + o * 11); n += amp; amp *= 0.5; fr *= 2.13; }
    return a / n;
  }

  window.BACKGROUNDS.aurora2 = {
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
      // The backing store is the single biggest lever on the GPU side: every
      // fill and every blit scales with its area. Capped at 1.5x AND at ~2.4 MP,
      // so a big window drops the ratio instead of paying for it (1920x1200 →
      // ~1.0x). Same cap as unicorns3.
      const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), FDPR = 1;
      let W, H, LAKE, U, AURH = 0;
      // the painted band of each static layer (CSS px, measured on resize) — a
      // layer is blitted over ITS band, not over the whole screen
      let B_SKY = 0, MID_Y0 = 0, FORE_Y0 = 0, FORE_Y1 = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      let skyL, mtnL, lakeL, midL, foreL, auroraL, auroraLo, reflL, auroraReady = false;
      let STARS, TWINKLE, FLAKES, SPARKS, MIST, SHOOTERS = [], nextShootAt = 4;
      let CHANNEL, SEALS, ORCAS, PR, MAGIC = [], SPOUTS = [], SPLASH = [], nextBreachAt = 14;
      let PFR = null, PRINCESSES = [], BEARS = [], surge = null, auroraT = 0, surgeBoost = 1;
      let CASTLE = null, IGLOO = null, FOX = null, SMOKE = [], FURFX = [];
      let OLAF = null, olafLayer = null, fxCv = null, fxCtx = null;
      let STRIKES = [], stormT0 = -99, castleBlaze = 0;
      // per-section render timers (ms, accumulated) — read via _aurora.prof()
      const PROF = { frames: 0 }; let profT = 0;
      const mark = k => { const n = performance.now(); PROF[k] = (PROF[k] || 0) + (n - profT); profT = n; };
      let intensity = 1, snowOn = true, wind = 0;
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov';
      let lastT = 0, rafId = null, t0 = null;

      const lg = (g, x1, y1, x2, y2, st) => { const gr = g.createLinearGradient(x1, y1, x2, y2); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      const rg = (g, x, y, r0, r1, st) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
      // memoised gradients for the figures (constant local-space args) — creating
      // dozens of CanvasGradients per frame is a real cost; cleared on resize
      let GCACHE = {};
      const lgc = (key, g, x1, y1, x2, y2, st) => GCACHE[key] || (GCACHE[key] = lg(g, x1, y1, x2, y2, st));
      const rgc = (key, g, x, y, r0, r1, st) => GCACHE[key] || (GCACHE[key] = rg(g, x, y, r0, r1, st));
      // soft round sprites (a radial falloff painted once) for glows and mist
      const SPR = {};
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = name === 'glowCyan' ? '190,240,255' : name === 'glowWhite' ? '255,255,255' : '210,230,245';
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [1, 'rgba(' + col + ',0)']]); g.fillRect(0, 0, 128, 128);
        return (SPR[name] = cv);
      }
      // How far down a static layer actually paints, and from which row it is
      // OPAQUE all the way to the bottom (everything above that row still needs
      // the sky behind it; everything below is hidden by this layer). Measured
      // once per resize from a 48x192 thumbnail — exact enough at ±1 thumbnail
      // row, and padded by one.
      function layerBounds(L){
        const TW = 48, TH = 192;
        const c = doc.createElement('canvas'); c.width = TW; c.height = TH;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(L.cv, 0, 0, TW, TH);
        let d; try { d = g.getImageData(0, 0, TW, TH).data; } catch (e){ return { y0: 0, y1: H, solid: H }; }
        const full = new Uint8Array(TH); let top = -1, bot = -1;
        for (let y = 0; y < TH; y++){
          let any = false, all = true;
          for (let x = 0; x < TW; x++){ const a = d[(y * TW + x) * 4 + 3]; if (a > 3) any = true; if (a < 250) all = false; }
          full[y] = all ? 1 : 0;
          if (any){ if (top < 0) top = y; bot = y; }
        }
        let solid = TH;                                                  // the first row with nothing but opaque rows below it
        for (let y = TH - 1; y >= 0 && full[y]; y--) solid = y;
        const k = H / TH;
        return { y0: top < 0 ? 0 : Math.max(0, (top - 1) * k),
                 y1: bot < 0 ? 0 : Math.min(H, (bot + 2) * k),
                 solid: Math.min(H, (solid + 2) * k) };
      }
      // blit rows y0..y1 of a full-screen layer (the rest of it is empty or hidden)
      function band(L, y0, y1){
        if (y1 <= y0) return;
        const d = L.cv.width / L.w;                                      // the layer's own device ratio
        ctx.drawImage(L.cv, 0, y0 * d, L.cv.width, (y1 - y0) * d, 0, y0, W, y1 - y0);
      }
      function makeLayer(w, h, dpr){
        const cv = doc.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
        const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h };
      }

  /* ── NOISE: what makes gas look like gas and a world like a world ────────────
     A tiling fbm (value noise, summed octaves). Used two ways: as small ALPHA
     TILES that cut flat colour into clouds and filaments (the deep sky, the Sun's
     granulation), and PER PIXEL when a world's surface map is painted (bands,
     seas, weather). All of it happens once, when the scene is laid out.          */
  function mulberry(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  // f(u, v [, ridged]) for u, v in [0,1) → 0..1, tiling in both; P0 = lattice cells across at the first octave
  function makeFbm(seed,oct,P0){
    const R=mulberry(seed),L=[];
    for(let o=0;o<oct;o++){const P=P0<<o,a=new Float32Array(P*P);for(let i=0;i<a.length;i++)a[i]=R();L.push([P,a]);}
    return(u,v,ridged)=>{let s=0,amp=.5,norm=0;
      for(let o=0;o<oct;o++){const P=L[o][0],a=L[o][1],x=u*P,y=v*P,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
        const i0=((x0%P)+P)%P,i1=(i0+1)%P,j0=((y0%P)+P)%P,j1=(j0+1)%P;
        let n=(a[j0*P+i0]*(1-sx)+a[j0*P+i1]*sx)*(1-sy)+(a[j1*P+i0]*(1-sx)+a[j1*P+i1]*sx)*sy;
        if(ridged)n=1-Math.abs(2*n-1);
        s+=n*amp;norm+=amp;amp*=.5;}
      return s/norm;};
  }
  // the alpha tiles: soft (clouds) · wisp (filaments) · lane (thin dark lanes) · grain (fine mottling)
  let NZ=null;
  function noiseTiles(){
    if(NZ)return NZ;
    const N=256,tile=(seed,ridged,lo,hi,pw)=>{const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),im=g.createImageData(N,N),d=im.data,f=makeFbm(seed,5,4);
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=(f(x/N,y/N,ridged)-lo)/(hi-lo);v=v<0?0:v>1?1:v;const i=(y*N+x)*4;d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.pow(v,pw)*255;}
      g.putImageData(im,0,0);return c;};
    return(NZ={soft:tile(11,false,.3,.7,1.2),wisp:tile(23,true,.52,.92,1.5),lane:tile(37,true,.66,.96,1.2),grain:tile(51,false,.2,.8,1)});
  }

      // ── THE AURORA: curtains of light. Each curtain is a row of thin rays whose
      //    brightness, height and position follow layered noise (folds, drifting
      //    rays of uneven width, a slow pulse). The rays are drawn ONE PIXEL wide
      //    into a narrow strip, and the strip is stretched across the sky with
      //    smoothing — so a curtain is silk, not a picket fence, and a redraw is
      //    ~500 one-pixel blits (the old one drew 360 wide, hard-edged columns).
      function makeTex(stops){
        const cv = doc.createElement('canvas'); cv.width = 4; cv.height = 256;
        const g = cv.getContext('2d');
        g.fillStyle = lg(g, 0, 0, 0, 256, stops); g.fillRect(0, 0, 4, 256);
        return cv;
      }
      const TEX = [
        // the main curtain: a white-green hem, emerald, teal, then violet and a crimson crown
        makeTex([[0, 'rgba(255,60,120,0)'], [0.14, 'rgba(232,70,170,0.2)'], [0.32, 'rgba(150,90,240,0.3)'], [0.52, 'rgba(60,200,190,0.5)'], [0.8, 'rgba(60,240,140,0.9)'], [0.95, 'rgba(190,255,210,1)'], [1, 'rgba(200,255,220,0)']]),
        // the cool curtain: cyan and blue
        makeTex([[0, 'rgba(110,90,255,0)'], [0.3, 'rgba(90,130,255,0.26)'], [0.6, 'rgba(60,210,230,0.55)'], [0.9, 'rgba(120,255,220,0.92)'], [0.96, 'rgba(210,255,240,1)'], [1, 'rgba(210,255,240,0)']]),
        // the high veil: rose and violet
        makeTex([[0, 'rgba(255,90,160,0)'], [0.3, 'rgba(250,90,190,0.34)'], [0.65, 'rgba(170,110,255,0.44)'], [0.92, 'rgba(120,190,255,0.6)'], [1, 'rgba(120,200,255,0)']]),
      ];
      const BANDS = [
        { tex: 0, y: 0.36, amp: 0.05, wl: 1.3, spd: 0.11,  hMin: 0.18, hMax: 0.31, seed: 1,  gain: 1.00, rayF: 30, raySpd: 0.50,  u0: 0.00, u1: 1.00 },
        { tex: 1, y: 0.28, amp: 0.06, wl: 0.9, spd: -0.07, hMin: 0.12, hMax: 0.26, seed: 7,  gain: 0.72, rayF: 38, raySpd: -0.35, u0: 0.15, u1: 1.00 },
        { tex: 2, y: 0.22, amp: 0.04, wl: 1.7, spd: 0.05,  hMin: 0.20, hMax: 0.34, seed: 13, gain: 0.5,  rayF: 20, raySpd: 0.25,  u0: 0.00, u1: 0.85 },
      ];
      const AUR_N = 168; let aurStrip = null;
      function drawAurora(g, w, h, t){
        const sh = g.canvas.height;
        if (!aurStrip || aurStrip.height !== sh){ aurStrip = doc.createElement('canvas'); aurStrip.width = AUR_N + 2; aurStrip.height = sh; }
        const s = aurStrip.getContext('2d');
        s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1; s.clearRect(0, 0, AUR_N + 2, sh);
        s.globalCompositeOperation = 'lighter';
        const breathe = 0.8 + 0.2 * Math.sin(t * 0.13) * Math.sin(t * 0.071 + 1);
        for (const b of BANDS){
          const tex = TEX[b.tex];
          for (let i = 0; i <= AUR_N; i++){
            const u = i / AUR_N;
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
            s.globalAlpha = Math.min(1, br * 1.1);
            s.drawImage(tex, i, yb - hh, 1, hh);
          }
        }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(aurStrip, 0.5, 0, AUR_N, sh, 0, 0, w, sh);                                     // stretched: neighbouring rays melt into one another
      }
      // ── static painters ──
      const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      // THE SKY: never flat — a deep gradient that pales to teal at the horizon, the
      // Milky Way as gas cut by noise into clouds with a dust lane, veils of violet
      // and teal, thousands of faint stars (thicker along the Milky Way)
      function paintSky(g){
        const NT = noiseTiles(), R = mulberry(4711), rr = (a, b) => a + R() * (b - a), M = Math.min(W, H);
        g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#020513'], [0.2, '#050f36'], [0.4, '#0a1f52'], [0.56, '#113f6a'], [0.66, '#1c5c7a'], [1, '#1c5c7a']]);
        g.fillRect(0, 0, W, H);
        const q = 0.5, SH = H * 0.7, GW = Math.ceil(W * q), GH = Math.ceil(SH * q), mk = () => { const c = doc.createElement('canvas'); c.width = GW; c.height = GH; return c; };
        const gas = mk(), G = gas.getContext('2d'), tmp = mk(), T = tmp.getContext('2d');
        const cloud = (cx, cy, rx, ry, rot, stops, tile, ts, a, mode) => {
          T.setTransform(1, 0, 0, 1, 0, 0); T.globalCompositeOperation = 'source-over'; T.clearRect(0, 0, GW, GH);
          T.setTransform(q, 0, 0, q, 0, 0); T.translate(cx, cy); T.rotate(rot); T.scale(1, ry / rx);
          T.fillStyle = rg(T, 0, 0, 0, rx, stops); T.beginPath(); T.arc(0, 0, rx, 0, TAU); T.fill();
          if (tile){ T.setTransform(q * ts, 0, 0, q * ts, R() * 200, R() * 200); T.globalCompositeOperation = 'destination-in'; T.fillStyle = T.createPattern(tile, 'repeat'); T.fillRect(-300, -300, W / ts + 600, SH / ts + 600); }
          G.globalCompositeOperation = mode || 'lighter'; G.globalAlpha = a; G.drawImage(tmp, 0, 0); G.globalAlpha = 1;
        };
        const DARK = [[0, 'rgba(0,0,0,1)'], [0.6, 'rgba(0,0,0,.7)'], [1, 'rgba(0,0,0,0)']];
        const ax = -W * 0.14, ay = H * 0.5, bx = W * 0.72, by = -H * 0.14, mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
        cloud(W * 0.2, H * 0.1, M * 0.9, M * 0.6, 0, [[0, 'rgba(60,50,160,.4)'], [1, 'rgba(40,30,120,0)']], null, 1, 0.7);
        cloud(W * 0.8, H * 0.3, M * 0.7, M * 0.4, 0, [[0, 'rgba(20,110,130,.32)'], [1, 'rgba(20,80,110,0)']], null, 1, 0.7);
        cloud(mx, my, L * 0.6, M * 0.2, ang, [[0, 'rgba(236,236,255,.55)'], [0.35, 'rgba(170,186,255,.34)'], [0.7, 'rgba(100,120,220,.16)'], [1, 'rgba(80,100,200,0)']], NT.soft, 3, 0.8);
        cloud(mx, my, L * 0.58, M * 0.11, ang, [[0, 'rgba(250,246,255,.62)'], [0.5, 'rgba(210,214,255,.3)'], [1, 'rgba(150,160,240,0)']], NT.wisp, 2.3, 0.7);
        for (let i = 0; i < 6; i++){ const u = rr(0.1, 0.9), o = rr(-1, 1) * M * 0.05; cloud(ax + (bx - ax) * u - Math.sin(ang) * o, ay + (by - ay) * u + Math.cos(ang) * o, M * rr(0.06, 0.12), M * rr(0.035, 0.07), ang + rr(-0.3, 0.3), [[0, 'rgba(244,240,255,.55)'], [1, 'rgba(230,226,255,0)']], NT.soft, 1.7, 0.6); }
        cloud(mx, my, L * 0.54, M * 0.045, ang, DARK, NT.lane, 2.6, 0.9, 'destination-out');
        cloud(W * 0.34, H * 0.2, M * 0.3, M * 0.2, 0.4, [[0, 'rgba(190,110,255,.36)'], [1, 'rgba(130,70,220,0)']], NT.wisp, 3.2, 0.7);
        cloud(W * 0.62, H * 0.08, M * 0.26, M * 0.16, -0.3, [[0, 'rgba(90,190,255,.36)'], [1, 'rgba(60,130,230,0)']], NT.wisp, 2.8, 0.7);
        g.imageSmoothingQuality = 'high'; g.globalAlpha = 0.9; g.drawImage(gas, 0, 0, W, SH); g.globalAlpha = 1;
        // star dust, in a few tints and three brightnesses; half of it along the Milky Way
        const TINT = ['255,255,255', '206,224,255', '255,240,220', '190,208,255', '255,214,190'], area = W * H / 1e6;
        for (let b = 0; b < 15; b++){
          g.fillStyle = 'rgba(' + TINT[b % 5] + ',' + [0.3, 0.55, 0.85][(b / 5) | 0] + ')'; g.beginPath();
          for (let i = 0, n = Math.round(110 * area); i < n; i++){ const s = rr(0.5, 1.25) * (b > 9 ? 1.15 : 1), y = Math.pow(R(), 1.25) * H * 0.64; g.rect(R() * W, y, s, s); }
          for (let i = 0, n = Math.round(110 * area); i < n; i++){ const u = R(), o = (R() + R() + R() - 1.5) * M * 0.17, s = rr(0.5, 1.2); g.rect(ax + (bx - ax) * u - Math.sin(ang) * o, ay + (by - ay) * u + Math.cos(ang) * o, s, s); }
          g.fill();
        }
        // the fixed stars (the bright ones twinkle, drawn live)
        for (const s of STARS){
          if (s.tw) continue;
          g.fillStyle = 'rgba(' + s.col + ',' + s.a + ')';
          g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
        }
      }
      // A SNOW RANGE. Summits and the saddles between them, joined by a jagged skyline.
      // The whole massif is laid in shade first; then every peak gets its MOONLIT
      // FLANK — from the summit down the right-hand skyline to the saddle, and back up
      // a zigzag ridge — so each mountain has a bright face and a blue one. Spurs run
      // down both flanks (thin shadows on the bright side, slivers of light on the
      // dark side); a noise texture, haze toward the foot and a lit crest finish it.
      // o: { base, amp, seed, n (peaks across a 16:9 screen), shade, light, haze, hazeK }
      const rgb3 = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
      function range(g, o){
        const L = makeLayer(W, H, DPR), c = L.cx, R = mulberry(o.seed), rr = (a, b) => a + R() * (b - a), asp = Math.max(0.5, W / H / 1.78);
        const K = []; let x = -W * 0.1;
        while (x < W * 1.1){ const hgt = o.amp * rr(0.42, 1), gap = W / (o.n * asp) * rr(0.72, 1.3); K.push([x, o.base - hgt, 1]); K.push([x + gap * rr(0.42, 0.6), o.base - hgt * rr(0.2, 0.46), 0]); x += gap; }
        const sky = [];
        for (let i = 0; i < K.length - 1; i++){
          const a = K[i], b = K[i + 1], n = 7;
          for (let j = 0; j < n; j++){ const t = j / n, e = j ? 1 : 0; sky.push([a[0] + (b[0] - a[0]) * t + e * rr(-1, 1) * o.amp * 0.02, a[1] + (b[1] - a[1]) * Math.pow(t, a[2] ? 0.85 : 1.2) + e * rr(-1, 1) * o.amp * 0.035, j === 0 ? a[2] : -1]); }
        }
        const top = o.base - o.amp, bot = o.base + 3;
        c.beginPath(); c.moveTo(sky[0][0], bot); for (const p of sky) c.lineTo(p[0], p[1]); c.lineTo(sky[sky.length - 1][0], bot); c.closePath();
        c.fillStyle = lg(c, 0, top, 0, bot, [[0, rgb3(o.shade)], [1, rgb3(mix3(o.shade, o.haze, 0.55))]]); c.fill();
        c.lineJoin = 'round'; c.lineCap = 'round';
        for (let i = 0; i < sky.length; i++){
          if (sky[i][2] !== 1) continue;
          let j = i + 1; while (j < sky.length && sky[j][2] !== 0) j++; if (j >= sky.length) break;
          const P = sky[i], S = sky[j], span = S[0] - P[0], m = 7, drift = rr(-0.08, 0.22) * span, zig = span * 0.1 * rr(0.6, 1.3), ridge = [];
          for (let k = 1; k <= m; k++){ const t = k / m; ridge.push([P[0] + t * drift + (k % 2 ? 1 : -1) * zig * (0.3 + t) * rr(0.6, 1.2), P[1] + (bot - P[1]) * t]); }
          c.beginPath(); c.moveTo(P[0], P[1]); for (let q = i + 1; q <= j; q++) c.lineTo(sky[q][0], sky[q][1]);
          c.lineTo(S[0], bot); for (let k = m - 1; k >= 0; k--) c.lineTo(ridge[k][0], ridge[k][1]); c.closePath();
          c.fillStyle = lg(c, 0, P[1], 0, bot, [[0, rgb3(o.light)], [0.55, rgb3(mix3(o.light, o.shade, 0.22))], [1, rgb3(mix3(o.light, o.haze, 0.62))]]); c.fill();
          const spur = (sx, sy, dir, col, wd) => {            // a spur: a tapering zigzag running downhill
            let px = sx, py = sy; const len = (bot - sy) * rr(0.35, 0.8), n = 5;
            for (let k = 0; k < n; k++){ const nx = px + dir * span * rr(0.02, 0.07) * (k % 2 ? -0.5 : 1), ny = py + len / n; c.strokeStyle = col; c.lineWidth = wd * (1 - k / n) + 0.6; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny; }
          };
          for (let q = i + 1; q < j; q += 2) spur(sky[q][0], sky[q][1] + 2, -1, rgb3(o.shade, 0.3), o.amp * 0.026);                 // shadows on the bright flank
          for (let q = i - 1; q > i - 5 && q > 0 && sky[q][2] !== 0; q -= 2) spur(sky[q][0], sky[q][1] + 2, 1, rgb3(o.light, 0.34), o.amp * 0.028);   // light on the dark flank
          c.strokeStyle = 'rgba(255,255,255,' + (0.8 - o.hazeK) + ')'; c.lineWidth = 1.3;                                                // the crest catches the moon
          c.beginPath(); c.moveTo(P[0], P[1]); for (let q = i + 1; q <= j; q++) c.lineTo(sky[q][0], sky[q][1]); c.stroke();
        }
        // only on what is painted: the grain of rock and snow, haze thickening toward the foot
        c.globalCompositeOperation = 'source-atop';
        { const NT = noiseTiles(); for (const [tile, sx, sy, mode, a] of [[NT.soft, 1.5, 2.6, 'soft-light', 0.6], [NT.wisp, 1.1, 2.2, 'soft-light', 0.3]]){
            c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a * 0.5; c.translate(o.seed * 13 % 97, top - 40); c.scale(sx, sy); c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(-200, 0, W / sx + 400, (bot - top + 80) / sy); c.restore(); } }
        c.fillStyle = lg(c, 0, top, 0, bot, [[0, rgb3(o.haze, o.hazeK)], [0.5, rgb3(o.haze, o.hazeK + 0.08)], [1, rgb3(o.haze, Math.min(0.9, o.hazeK + 0.4))]]); c.fillRect(0, top - 40, W, bot - top + 80);
        g.drawImage(L.cv, 0, 0, W, H);
      }
      // a fir under snow: tiers of drooping boughs, each with snow lying on it (white
      // toward the moon, blue in its own shade)
      function fir(g, x, y, h, seed){
        const w = h * 0.44, tiers = Math.max(3, Math.round(h / 26));
        g.fillStyle = '#1c1416'; g.fillRect(x - h * 0.018, y - h * 0.1, h * 0.036, h * 0.1);
        for (let i = 0; i < tiers; i++){
          const u = i / tiers, ty = y - h * 0.06 - h * 0.94 * u, tw = w * (1 - u * 0.86) * (0.92 + 0.16 * psr(seed + i)), th = h * 0.94 / tiers * 2.0;
          g.beginPath(); g.moveTo(x, ty - th); g.lineTo(x + tw, ty);
          for (let k = 0; k < 5; k++){ const x1 = x + tw - (k + 1) * tw * 0.4, xm = x + tw - (k + 0.5) * tw * 0.4; g.quadraticCurveTo(xm, ty + th * 0.16, x1, ty - th * 0.04); }
          g.closePath(); g.fillStyle = lg(g, x - tw, 0, x + tw, 0, [[0, '#081a26'], [0.6, '#10303e'], [1, '#1a4450']]); g.fill();
          g.beginPath(); g.moveTo(x - tw * 0.92, ty - th * 0.08); g.quadraticCurveTo(x - tw * 0.3, ty - th * 0.74, x, ty - th);                     // the snow on the bough
          g.quadraticCurveTo(x + tw * 0.36, ty - th * 0.7, x + tw, ty - th * 0.03); g.quadraticCurveTo(x + tw * 0.5, ty - th * 0.3, x + tw * 0.05, ty - th * 0.5);
          g.quadraticCurveTo(x - tw * 0.4, ty - th * 0.3, x - tw * 0.92, ty - th * 0.08);
          g.fillStyle = lg(g, x - tw, 0, x + tw, 0, [[0, '#8fb0d4'], [0.45, '#d6e6f6'], [1, '#fbfdff']]); g.fill();
        }
      }
      function paintMountains(g){
        g.clearRect(0, 0, W, H);
        range(g, { base: H * 0.635, amp: H * 0.31, seed: 41, n: 5, shade: [58, 88, 146], light: [204, 222, 246], haze: [44, 98, 150], hazeK: 0.22 });      // the far range
        range(g, { base: H * 0.645, amp: H * 0.19, seed: 77, n: 7, shade: [30, 54, 104], light: [234, 243, 255], haze: [40, 92, 140], hazeK: 0.06 });      // the near range
        range(g, { base: H * 0.652, amp: H * 0.05, seed: 93, n: 11, shade: [64, 100, 158], light: [242, 248, 255], haze: [80, 130, 170], hazeK: 0 });     // snowy foothills at the shore
        // the aurora's light lies on the snow: green on the high faces
        g.save(); g.globalCompositeOperation = 'source-atop';
        g.fillStyle = lg(g, 0, H * 0.3, 0, H * 0.66, [[0, 'rgba(80,255,170,.16)'], [0.6, 'rgba(60,220,190,.06)'], [1, 'rgba(60,200,200,0)']]); g.fillRect(0, H * 0.25, W, H * 0.42);
        g.restore();
        // a line of firs along the far shore, small with distance
        for (let i = 0, n = Math.round(W / 26); i < n; i++){
          const x = psr(i * 3 + 300) * W, k = psr(i * 5 + 301);
          if (Math.abs(x - W * 0.865) < H * 0.2 || (psr(i + 302) < 0.35)) continue;                 // a clearing round the castle, gaps in the wood
          fir(g, x, LAKE + 2 + k * 3, H * (0.022 + 0.03 * k), i * 7);
        }
        paintCastle(g);
      }
      // ── THE ICE PALACE on the far shore: slender crystal spires, each a prism of
      //    three faces (shade · body · moonlit), banded with ledges where snow lies,
      //    lit from inside — tall lancet windows glowing warm — with walls and an
      //    arcade between them, two flying bridges, a great gate and its stair.
      //    Painted into the mountain layer, so it mirrors in the ice. What the live
      //    effects need (windows, spire tips, the gate, the silhouettes) is recorded.
      function paintCastle(g){
        // the ❄️ skin hugs the game card to the LEFT, so the palace stands on the
        // RIGHT of the far shore (its lower-left tucks behind the big iceberg)
        const cx = W * 0.865, base = LAKE + 1, S = H * 0.26;
        CASTLE = { lights: [], tips: [], spires: [], door: null, cx, base, S,
                   box: { x0: cx - S * 0.68, x1: cx + S * 0.68, y0: base - S * 1.12, y1: base + 2 } };
        g.fillStyle = rg(g, cx, base - S * 0.5, 0, S * 1.25, [[0, 'rgba(130,210,255,.34)'], [0.5, 'rgba(120,190,255,.12)'], [1, 'rgba(120,190,255,0)']]);   // the light it throws into the cold air
        g.fillRect(cx - S * 1.3, base - S * 1.75, S * 2.6, S * 1.85);
        const spire = (dx, h, w, seed) => {
          const x = cx + dx * S, top = base - h * S, hw = w * S, sh = top + h * S * 0.18, HT = h * S;   // sh: the shoulder
          CASTLE.spires.push({ x, top, hw, sh }); CASTLE.tips.push({ x, y: top - S * 0.06, seed });
          const body = () => { g.beginPath(); g.moveTo(x - hw, base + 2); g.lineTo(x - hw * 0.8, sh); g.lineTo(x, top); g.lineTo(x + hw * 0.8, sh); g.lineTo(x + hw, base + 2); g.closePath(); };
          g.fillStyle = lg(g, 0, top, 0, base, [[0, '#f6fdff'], [0.18, '#cdeefd'], [0.5, '#86c6f0'], [0.82, '#4f8fd2'], [1, '#3a6cb4']]);
          body(); g.fill();
          g.save(); body(); g.clip();
          g.fillStyle = lg(g, x - hw, 0, x - hw * 0.3, 0, [[0, 'rgba(10,40,110,.5)'], [1, 'rgba(10,40,110,.16)']]); g.fillRect(x - hw, top, hw * 0.7, HT + 4);          // the shaded face
          g.fillStyle = lg(g, x + hw * 0.3, 0, x + hw, 0, [[0, 'rgba(255,255,255,.1)'], [1, 'rgba(255,255,255,.44)']]); g.fillRect(x + hw * 0.3, top, hw * 0.7, HT + 4);   // the moonlit face
          g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;                                          // the prism's edges, meeting at the point
          g.beginPath(); g.moveTo(x - hw * 0.3, base); g.lineTo(x - hw * 0.24, sh); g.lineTo(x, top); g.moveTo(x + hw * 0.3, base); g.lineTo(x + hw * 0.24, sh); g.lineTo(x, top); g.stroke();
          g.fillStyle = rg(g, x, top + HT * 0.55, 0, HT * 0.5, [[0, 'rgba(190,245,255,.42)'], [1, 'rgba(160,230,255,0)']]); g.fillRect(x - hw, top, hw * 2, HT + 4);       // the light inside
          for (let k = 1; k <= 3; k++){                                                                   // ledges: a shadow beneath, a bright lip, snow lying on it
            const y = top + HT * (0.2 + k * 0.2), cw = hw * (0.6 + k * 0.14);
            g.fillStyle = 'rgba(10,40,100,.28)'; g.fillRect(x - cw, y + S * 0.012, cw * 2, S * 0.022);
            g.fillStyle = lg(g, 0, y - S * 0.018, 0, y + S * 0.014, [[0, '#ffffff'], [1, 'rgba(170,214,246,.9)']]);
            g.beginPath(); g.moveTo(x - cw, y + S * 0.014); g.quadraticCurveTo(x - cw * 0.9, y - S * 0.022, x - cw * 0.5, y - S * 0.018); g.lineTo(x + cw * 0.5, y - S * 0.018); g.quadraticCurveTo(x + cw * 0.9, y - S * 0.022, x + cw, y + S * 0.014); g.closePath(); g.fill();
          }
          for (let k = 0; k < 4; k++){                                                                    // tall lancet windows, warm inside
            const y = top + HT * (0.31 + k * 0.2), ww = Math.max(1.4, hw * 0.15), wh = S * 0.04, wx = x + hw * 0.02;
            if (y + wh > base - S * 0.02) break;
            CASTLE.lights.push({ x: wx, y, r: wh * 1.5, seed: seed * 7 + k });
            g.fillStyle = rg(g, wx, y, 0, wh * 1.7, [[0, 'rgba(255,236,170,.6)'], [1, 'rgba(255,220,150,0)']]); g.beginPath(); g.arc(wx, y, wh * 1.7, 0, TAU); g.fill();
            g.fillStyle = lg(g, 0, y - wh, 0, y + wh, [[0, '#fffbe6'], [1, '#ffd98a']]);
            g.beginPath(); g.moveTo(wx - ww, y + wh); g.lineTo(wx - ww, y - wh * 0.3); g.quadraticCurveTo(wx - ww, y - wh, wx, y - wh * 1.1); g.quadraticCurveTo(wx + ww, y - wh, wx + ww, y - wh * 0.3); g.lineTo(wx + ww, y + wh); g.closePath(); g.fill();
          }
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1;                                       // the moonlit right edge, the needle and its star
          g.beginPath(); g.moveTo(x, top); g.lineTo(x + hw * 0.8, sh); g.lineTo(x + hw, base); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, top - S * 0.06); g.lineTo(x, top + S * 0.04); g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, top - S * 0.06, 1.6, 0, TAU); g.fill();
        };
        const bridge = (x0, y0, x1, y1) => {                                                              // a flying bridge: a thin arch of ice with a rail of light
          const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - S * 0.05;
          g.strokeStyle = 'rgba(70,130,200,.8)'; g.lineWidth = S * 0.022; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
          g.strokeStyle = 'rgba(235,250,255,.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0 - S * 0.011); g.quadraticCurveTo(mx, my - S * 0.011, x1, y1 - S * 0.011); g.stroke();
        };
        spire(-0.58, 0.3, 0.055, 6); spire(0.57, 0.34, 0.055, 7);                                         // the outer turrets
        // the walls with their arcade, then the spires (back ones first), the bridges between them
        const wallH = S * 0.22, wl = cx - S * 0.62, wr = cx + S * 0.6;
        g.fillStyle = lg(g, 0, base - wallH, 0, base, [[0, '#d6eefb'], [0.5, '#8fc0ea'], [1, '#4f86c6']]);
        g.beginPath(); g.moveTo(wl, base + 2); g.lineTo(wl + S * 0.04, base - wallH);
        for (let i = 0; i <= 14; i++){ const x = wl + S * 0.04 + (wr - wl - S * 0.08) * i / 14; g.lineTo(x, base - wallH - (i % 2 ? S * 0.03 : 0)); }
        g.lineTo(wr, base + 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(16,52,120,.26)'; g.fillRect(wl, base - wallH, (wr - wl) * 0.4, wallH + 2);
        for (let i = 0; i < 9; i++){                                                                      // the arcade: nine dark arches with a lit sill
          const x = wl + (wr - wl) * (i + 0.5) / 9, aw = S * 0.028, ah = S * 0.1;
          g.fillStyle = 'rgba(14,44,104,.55)'; g.beginPath(); g.moveTo(x - aw, base - S * 0.02); g.lineTo(x - aw, base - ah); g.quadraticCurveTo(x, base - ah - aw * 1.6, x + aw, base - ah); g.lineTo(x + aw, base - S * 0.02); g.closePath(); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(wl + S * 0.03, base - wallH - 1, wr - wl - S * 0.06, 1.4);
        spire(-0.42, 0.46, 0.09, 1); spire(0.40, 0.52, 0.09, 2);
        bridge(cx - S * 0.4, base - S * 0.3, cx - S * 0.2, base - S * 0.42); bridge(cx + S * 0.4, base - S * 0.34, cx + S * 0.2, base - S * 0.48);
        spire(-0.22, 0.70, 0.12, 3); spire(0.21, 0.78, 0.13, 4);
        spire(0, 1.0, 0.16, 5);
        // the great gate (its light breathes, live) and the stair down to the ice
        CASTLE.door = { x: cx, y: base - S * 0.13, r: S * 0.12 };
        g.fillStyle = rg(g, cx, base - S * 0.12, 0, S * 0.14, [[0, 'rgba(255,244,200,.9)'], [0.5, 'rgba(255,226,160,.5)'], [1, 'rgba(255,220,150,0)']]);
        g.beginPath(); g.arc(cx, base - S * 0.12, S * 0.14, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, base - S * 0.2, 0, base - S * 0.04, [[0, '#fffbe8'], [1, '#ffd480']]);
        g.beginPath(); g.moveTo(cx - S * 0.05, base - S * 0.04); g.lineTo(cx - S * 0.05, base - S * 0.14); g.quadraticCurveTo(cx - S * 0.05, base - S * 0.2, cx, base - S * 0.215); g.quadraticCurveTo(cx + S * 0.05, base - S * 0.2, cx + S * 0.05, base - S * 0.14); g.lineTo(cx + S * 0.05, base - S * 0.04); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(60,110,190,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, base - S * 0.21); g.lineTo(cx, base - S * 0.04); g.stroke();
        for (let k = 0; k < 4; k++){
          const y = base - k * S * 0.012, hw2 = S * (0.1 + (3 - k) * 0.03);
          g.fillStyle = k % 2 ? '#bfe0f5' : '#eaf6fd'; g.fillRect(cx - hw2, y - S * 0.012, hw2 * 2, S * 0.012);
        }
      }
      function paintLake(g){
        g.clearRect(0, 0, W, H);
        // the ice: pale and hazy at the far shore, deepening toward us
        g.fillStyle = lg(g, 0, LAKE, 0, H, [[0, '#b8dcea'], [0.06, '#6faac4'], [0.22, '#2c6e8e'], [0.55, '#164664'], [1, '#0b2640']]);
        g.fillRect(0, LAKE, W, H - LAKE);
        // the ice is cloudy: milky patches, wind-drawn streaks, a fine grain
        { const NT = noiseTiles();
          for (const [tile, sx, sy, mode, a] of [[NT.soft, 3.2, 0.7, 'soft-light', 0.55], [NT.wisp, 2.4, 0.4, 'soft-light', 0.4], [NT.grain, 0.5, 0.2, 'overlay', 0.2]]){
            g.save(); g.beginPath(); g.rect(0, LAKE, W, H - LAKE); g.clip(); g.globalCompositeOperation = mode; g.globalAlpha = a;
            g.translate(0, LAKE); g.scale(sx, sy); g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, W / sx, (H - LAKE) / sy); g.restore(); } }
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
      // an ICEBERG standing on the ice at (x, y), width w, height h — old blue glacier
      // ice: white where the snow lies, aquamarine in the body, deep blue at the foot;
      // facets lit toward the moon, melt grooves, a light inside, snow on every ledge.
      // pts: outline in unit space (0..1 across, 0 at the base up to -1 at the peak)
      function iceberg(g, x, y, w, h, pts, seed){
        const P = pts.map(p => [x + p[0] * w, y + p[1] * h]);
        const path = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.closePath(); };
        let peak = 0; P.forEach((p, i) => { if (p[1] < P[peak][1]) peak = i; });
        // its moon shadow across the ice (to the left), then its mirror below
        g.fillStyle = 'rgba(4,18,42,.3)';
        g.beginPath(); g.ellipse(x + w * 0.36, y + h * 0.05, w * 0.7, h * 0.09, 0, 0, TAU); g.fill();
        g.save(); g.translate(0, y); g.scale(1, -0.55); g.translate(0, -y);
        g.fillStyle = lg(g, 0, y, 0, y - h, [[0, 'rgba(190,232,250,.44)'], [0.7, 'rgba(190,232,250,.08)'], [1, 'rgba(190,232,250,0)']]);
        path(); g.fill();
        g.restore();
        g.fillStyle = lg(g, 0, y - h, 0, y, [[0, '#f6fcff'], [0.22, '#d8f0fb'], [0.5, '#93d2ee'], [0.8, '#519fd6'], [1, '#2f6fb4']]);
        path(); g.fill();
        g.save(); path(); g.clip();
        // facets: faces fan from the peak (and from a second high point) to the base points
        let peak2 = -1; P.forEach((p, i) => { if (i !== peak && Math.abs(i - peak) > 1 && (peak2 < 0 || p[1] < P[peak2][1])) peak2 = i; });
        for (let i = 0; i < P.length - 1; i++){
          const a = P[i], b = P[i + 1], mid = (a[0] + b[0]) / 2, apex = (peak2 >= 0 && Math.abs(mid - P[peak2][0]) < Math.abs(mid - P[peak][0])) ? P[peak2] : P[peak];
          const lit = mid > apex[0], k = psr(seed + i);
          g.fillStyle = lit ? lg(g, apex[0], apex[1], mid, y, [[0, 'rgba(255,255,255,' + (0.3 + 0.2 * k) + ')'], [1, 'rgba(255,255,255,.04)']])
                            : lg(g, apex[0], apex[1], mid, y, [[0, 'rgba(14,52,124,' + (0.16 + 0.2 * k) + ')'], [1, 'rgba(14,52,124,' + (0.3 + 0.2 * k) + ')']]);
          g.beginPath(); g.moveTo(apex[0], apex[1]); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
        }
        // melt grooves: fine striations running down
        g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1; g.lineCap = 'round'; g.beginPath();
        for (let i = 0, n = Math.round(w / 6); i < n; i++){ const sx = x + psr(seed * 13 + i) * w, sy = y - h * psr(seed * 17 + i); g.moveTo(sx, sy); g.lineTo(sx + (psr(seed + i) - 0.5) * 5, sy + h * (0.08 + 0.26 * psr(seed * 5 + i))); }
        g.stroke();
        // the light inside: a cold cyan heart, the aurora coming up through the foot
        g.fillStyle = rg(g, x + w * 0.5, y - h * 0.28, 0, w * 0.55, [[0, 'rgba(130,232,255,.4)'], [1, 'rgba(120,220,255,0)']]);
        g.fillRect(x - w, y - h, w * 3, h);
        g.fillStyle = lg(g, 0, y - h * 0.5, 0, y, [[0, 'rgba(90,255,190,0)'], [1, 'rgba(90,255,190,.3)']]);
        g.fillRect(x - w, y - h, w * 3, h);
        { const NT = noiseTiles(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.5; g.translate(x, y - h); g.scale(0.8, 1.3); g.fillStyle = g.createPattern(NT.soft, 'repeat'); g.fillRect(0, 0, w / 0.8, h / 1.3); }   // ice is not glass-smooth
        g.restore();
        // snow lying on every ledge and shoulder; the moonlit rim on the right-facing edges; a cold edge elsewhere
        const sw = Math.max(2, Math.min(7, h * 0.035)); g.lineCap = 'round';
        for (let i = 0; i < P.length - 1; i++){
          const a = P[i], b = P[i + 1]; if (Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]) * 0.9) continue;
          g.strokeStyle = 'rgba(120,170,220,.5)'; g.lineWidth = sw; g.beginPath(); g.moveTo(a[0], a[1] + sw * 0.9); g.lineTo(b[0], b[1] + sw * 0.9); g.stroke();
          g.strokeStyle = '#ffffff'; g.lineWidth = sw; g.beginPath(); g.moveTo(a[0], a[1] + sw * 0.3); g.lineTo(b[0], b[1] + sw * 0.3); g.stroke();
        }
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, 1.5 * U);
        g.beginPath();
        for (let i = 0; i < P.length - 1; i++){ const a = P[i], b = P[i + 1]; if (b[0] > a[0] && b[1] > a[1]){ g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } }
        g.stroke();
        g.strokeStyle = 'rgba(170,215,245,.4)'; g.lineWidth = 1; path(); g.stroke();
        g.fillStyle = rg(g, x + w * 0.5, y, 0, w * 0.6, [[0, 'rgba(240,248,255,.5)'], [1, 'rgba(240,248,255,0)']]);                       // frost at the foot
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
        // THE NEAR SHORE: deep snow — a far drift in blue shade, the bank itself, soft
        // hollows and moonlit crests, the grain of the snow, sparkles
        const bank = x => H * 0.91 + Math.sin(x / W * 9 + 1) * H * 0.012 + Math.sin(x / W * 23) * H * 0.006 + (fbm(x / W * 12, 99, 2) - 0.5) * H * 0.02;
        const shore = (dy, fill) => { g.beginPath(); g.moveTo(-10, H + 4); for (let x = -10; x <= W + 20; x += 16) g.lineTo(x, bank(x) + dy); g.lineTo(W + 20, H + 4); g.closePath(); g.fillStyle = fill; g.fill(); };
        g.fillStyle = lg(g, 0, H * 0.85, 0, H * 0.92, [[0, 'rgba(220,236,250,0)'], [1, 'rgba(220,236,250,.5)']]); g.fillRect(0, H * 0.85, W, H * 0.07);       // spindrift at its foot
        shore(-H * 0.012, '#9dbcdc');
        shore(0, lg(g, 0, H * 0.89, 0, H, [[0, '#f4f9ff'], [0.3, '#dbe9f7'], [1, '#a9c5e2']]));
        g.save(); g.beginPath(); g.moveTo(-10, H + 4); for (let x = -10; x <= W + 20; x += 16) g.lineTo(x, bank(x)); g.lineTo(W + 20, H + 4); g.closePath(); g.clip();
        { const NT = noiseTiles(); for (const [tile, sx, sy, mode, a] of [[NT.soft, 2.6, 0.5, 'soft-light', 0.7], [NT.grain, 0.4, 0.2, 'overlay', 0.25]]){
            g.save(); g.globalCompositeOperation = mode; g.globalAlpha = a; g.translate(0, H * 0.86); g.scale(sx, sy); g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, W / sx, H * 0.14 / sy); g.restore(); } }
        for (let i = 0, n = Math.round(W / 150); i < n; i++){                                 // wind-sculpted drifts: a light crest, a blue hollow under it
          const x = (i + 0.2 + psr(i + 880) * 0.6) / n * W, y = H * (0.94 + psr(i + 881) * 0.04), rx = W * (0.05 + psr(i + 882) * 0.04);
          g.fillStyle = rg(g, x, y - rx * 0.05, 0, rx, [[0, 'rgba(252,254,255,.9)'], [0.6, 'rgba(242,248,255,.45)'], [1, 'rgba(240,247,255,0)']]);
          g.save(); g.translate(x, y); g.scale(1, 0.24); g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
          g.fillStyle = rg(g, x - rx * 0.2, y + rx * 0.09, 0, rx * 0.9, [[0, 'rgba(70,116,176,.3)'], [1, 'rgba(80,124,180,0)']]);
          g.save(); g.translate(x - rx * 0.2, y + rx * 0.09); g.scale(1, 0.14); g.beginPath(); g.arc(0, 0, rx * 0.9, 0, Math.PI); g.fill(); g.restore();
        }
        g.restore();
        g.fillStyle = '#ffffff'; g.beginPath();
        for (let i = 0; i < 300; i++){ const x = psr(i * 3 + 900) * W, y = H * (0.9 + psr(i * 5 + 901) * 0.095), s = 0.6 + psr(i + 903) * 1.2; g.rect(x, y, s, s); }
        g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
        // firs under snow at the two ends of the shore (the walkers pass in front of them)
        const th = Math.min(H * 0.3, W * 0.42);
        for (const [fx, k, sd] of [[-0.012, 1, 1], [0.045, 0.62, 2], [1.012, 1.08, 3], [0.957, 0.6, 4], [0.905, 0.36, 5]]){
          const x = fx * W; fir(g, x, bank(Math.max(0, Math.min(W, x))) + th * k * 0.06, th * k, sd * 31);
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
          const bright = psr(i + 50) > 0.82;
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
      // a harbour seal, repainted: a plump body, silver above and cream below, mottled
      // with spots and pale rings; paddle flippers with their digits; a round head
      // with a pale whisker pad, long whiskers, a big wet eye
      const SEAL_SPOTS = [[-15, -6.5, 2.4], [-7, -9.6, 2], [3, -8, 2.3], [-19, -1.5, 1.7], [10, -4.4, 1.7], [-3, -3.2, 1.5], [-11, -1.6, 1.3], [15, -8.6, 1.4], [-22, -6, 1.3], [6, -11.6, 1.2]];
      const SEAL_RINGS = [[-11, -9, 1.7], [-1, -6, 1.5], [8, -8.4, 1.4], [-17, -4, 1.4], [14, -5.6, 1.2]];
      function drawSeal(g, S, t, P){
        const { s, ph } = S, rot = P.rot, dir = P.dir;
        g.save();
        if (P.swim){                                                                                 // only what is above the water line shows, plus a wake
          g.strokeStyle = 'rgba(200,230,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(P.x - dir * 14 * s, P.clipY); g.lineTo(P.x - dir * 50 * s, P.clipY + 2 * s); g.stroke();
          g.beginPath(); g.rect(0, 0, W, P.clipY); g.clip();
        }
        g.translate(P.x, P.y); g.rotate(rot); g.scale(dir * s, s);
        if (!P.swim){ g.fillStyle = 'rgba(10,25,50,.3)'; g.beginPath(); g.ellipse(0, 3.4, 31 - (P.hop / s) * 0.4, 5, 0, 0, TAU); g.fill(); }   // shadow on the ice
        g.translate(0, -P.hop / s);
        g.translate(0, -5); g.rotate(P.flip); g.translate(0, 5);                                    // the belly-up roll
        const breathe = 1 + 0.025 * Math.sin(t * 1.1 + ph);
        g.rotate(0.05 * Math.sin(t * 0.9 + ph));                                                   // rocking on the ice
        // tail flippers behind the body (they wiggle faster belly-up): two paddles with their digits
        for (const a of [-0.5, 0.42]){
          g.save(); g.translate(-27, 1); g.rotate(a + (0.16 + 0.5 * P.wiggle) * Math.sin(t * (3.1 + 8 * P.wiggle) + ph) + 0.08 * Math.sin(t * 1.7 + ph));
          g.fillStyle = lgc('seal2Flip', g, -12, 0, 0, 0, [[0, '#6f8398'], [1, '#9fb1c4']]);
          g.beginPath(); g.moveTo(1, -1.6); g.quadraticCurveTo(-6, -4, -11.6, -2.8); g.quadraticCurveTo(-13.4, 0, -11.6, 2.6); g.quadraticCurveTo(-6, 3.4, 1, 1.6); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(40,58,82,.45)'; g.lineWidth = 0.6; g.beginPath(); for (const k of [-1, 0, 1]){ g.moveTo(-3, k * 0.8); g.lineTo(-11.4, k * 1.9); } g.stroke();
          g.restore();
        }
        g.save(); g.scale(1, breathe);
        const body = () => { g.beginPath(); g.moveTo(-28, 1); g.bezierCurveTo(-27, -7, -16, -13.5, 0, -14.5); g.bezierCurveTo(13, -15, 23, -10, 25.5, -2); g.bezierCurveTo(25, 3, 15, 5.4, 0, 5.4); g.bezierCurveTo(-14, 5.4, -27, 4.4, -28, 1); g.closePath(); };
        g.fillStyle = lgc('seal2Body', g, 0, -15, 0, 5.4, [[0, '#dfe8f0'], [0.34, '#b5c5d5'], [0.72, '#93a6ba'], [1, '#aebccb']]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = lgc('seal2Belly', g, 0, -3, 0, 5.4, [[0, 'rgba(244,247,250,0)'], [0.6, 'rgba(244,247,250,.75)'], [1, 'rgba(232,238,244,.9)']]); g.fillRect(-30, -3, 58, 9);     // the pale belly
        g.fillStyle = 'rgba(50,68,96,.36)'; g.beginPath();
        for (const [x, y, r] of SEAL_SPOTS){ g.moveTo(x + r * 1.3, y); g.ellipse(x, y, r * 1.3, r, 0.3, 0, TAU); }
        g.fill();
        g.strokeStyle = 'rgba(238,244,250,.55)'; g.lineWidth = 0.55; g.beginPath();
        for (const [x, y, r] of SEAL_RINGS){ g.moveTo(x + r, y); g.ellipse(x, y, r, r * 0.78, 0.3, 0, TAU); }
        g.stroke();
        g.fillStyle = lgc('seal2Sheen', g, 0, -15, 0, -8, [[0, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.ellipse(-3, -11.4, 17, 3.4, -0.04, 0, TAU); g.fill();   // the moon on its back
        g.fillStyle = 'rgba(110,255,190,.12)'; g.beginPath(); g.ellipse(-13, -8.6, 12, 3, -0.3, 0, TAU); g.fill();                                                                     // a touch of the aurora
        g.fillStyle = lgc('seal2Under', g, 0, 1.5, 0, 5.6, [[0, 'rgba(36,56,88,0)'], [1, 'rgba(36,56,88,.34)']]); g.fillRect(-30, 1, 58, 5);                                           // shade where it lies on the ice
        if (P.swim){ g.fillStyle = 'rgba(96,128,160,.36)'; g.fillRect(-30, -4, 60, 12); }                                                                                             // wet, darker
        g.restore();
        g.restore();
        // the front flipper: flaps now and then, WAVES (slow rhythm or click), CLAPS, wiggles belly-up
        const wk = t - S.waveT0, wave = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.17 + ph * 2)), 14), wk > 0 && wk < 1.8 ? Math.sin(wk / 1.8 * Math.PI) : 0);
        const flap = Math.pow(Math.max(0, Math.sin(t * 0.9 + ph)), 6) * 0.5 + wave * (1.9 + 0.25 * Math.sin(t * 9)) + P.clap * (1.1 + 0.9 * Math.sin(t * 16)) + P.wiggle * (0.7 + 0.6 * Math.sin(t * 11 + 1));
        g.save(); g.translate(6, 2); g.rotate(0.55 - flap);
        g.fillStyle = lgc('seal2Fore', g, 0, -3, 0, 3, [[0, '#a9bacb'], [1, '#75899e']]);
        g.beginPath(); g.moveTo(-1.5, -2.2); g.quadraticCurveTo(6, -3.8, 12.6, -2.4); g.quadraticCurveTo(14.4, 0, 12.6, 2.6); g.quadraticCurveTo(6, 3.2, -1.5, 2.2); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(38,56,80,.34)'; g.lineWidth = 0.5; g.beginPath(); for (const k of [-0.7, 0, 0.7]){ g.moveTo(7, k * 0.9); g.lineTo(12.6, k * 1.8); } g.stroke();
        g.restore();
        // the head: raised, looking about; the occasional lift and bark (the clap barks too)
        const lift = Math.max(Math.pow(Math.max(0, Math.sin(t * 0.23 + ph)), 8), P.clap * (0.6 + 0.4 * Math.sin(t * 8)));
        g.save(); g.translate(18, -6); g.rotate(-0.12 * Math.sin(t * 0.6 + ph) - 0.5 * lift + (P.swim ? -0.35 : 0));
        g.fillStyle = lgc('seal2Head', g, 0, -12, 0, 5, [[0, '#e6eef5'], [0.55, '#b9c8d7'], [1, '#93a6b9']]);
        g.beginPath(); g.moveTo(-12, 5.6); g.bezierCurveTo(-12, -5, -5, -11.6, 6, -11.6); g.bezierCurveTo(11, -11.6, 14.2, -8.6, 15.6, -5.6); g.bezierCurveTo(18.6, -4.8, 19, -0.6, 16.6, 1.6); g.bezierCurveTo(13.6, 3.8, 7, 6.4, -12, 5.6); g.closePath(); g.fill();
        g.fillStyle = 'rgba(52,70,96,.3)'; g.beginPath(); for (const [x, y, r] of [[0.5, -8.6, 1.3], [-1.6, -4.4, 1.1], [3.6, -10, 0.9]]){ g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill();     // spots on the crown
        g.fillStyle = 'rgba(247,249,251,.8)'; g.beginPath(); g.ellipse(13.6, -1, 3.6, 2.7, 0.2, 0, TAU); g.fill();                    // the pale whisker pad
        if (lift > 0.5){ g.fillStyle = '#4a1e26'; g.beginPath(); g.ellipse(13.6, 1.8, 2.4, 1.6 * (lift - 0.5) * 2, 0.2, 0, TAU); g.fill(); }   // a bark
        else { g.strokeStyle = 'rgba(40,52,70,.6)'; g.lineWidth = 0.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(16.8, -0.6); g.quadraticCurveTo(14.4, 2, 10.6, 1.2); g.stroke(); }               // a gentle smile
        g.fillStyle = '#1c232c'; g.beginPath(); g.moveTo(15.2, -3.6); g.quadraticCurveTo(16.6, -4.6, 18, -3.4); g.quadraticCurveTo(17.6, -1.4, 16.6, -1.2); g.quadraticCurveTo(15.4, -1.6, 15.2, -3.6); g.fill();   // the nose
        g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(16.4, -3.5, 0.4, 0, TAU); g.fill();
        g.fillStyle = 'rgba(40,52,70,.6)'; g.beginPath(); for (const [x, y] of [[12.4, -1.4], [13.6, -0.2], [12.2, 0.6]]){ g.moveTo(x + 0.3, y); g.arc(x, y, 0.3, 0, TAU); } g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.55;                               // long whiskers, and two over the eye
        g.beginPath(); for (let k = 0; k < 4; k++){ g.moveTo(13, -1.4 + k * 0.8); g.quadraticCurveTo(18, -2 + k * 1.4, 23, -3.4 + k * 2.6); }
        g.moveTo(8, -9); g.lineTo(6, -13); g.moveTo(9.4, -9); g.lineTo(9.6, -13);
        g.stroke();
        const blinkK = Math.pow(Math.max(0, Math.sin(t * 0.7 + ph * 1.3)), 60);                    // one big wet eye (profile)
        g.save(); g.translate(8.2, -5.8); g.scale(1, Math.max(0.1, 1 - blinkK));
        g.fillStyle = 'rgba(60,76,100,.45)'; g.beginPath(); g.ellipse(0, 0, 3.3, 3.4, 0, 0, TAU); g.fill();
        g.fillStyle = '#0c1118'; g.beginPath(); g.ellipse(0, 0, 2.6, 2.8, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(120,170,220,.5)'; g.beginPath(); g.ellipse(0.4, 1, 1.6, 1, 0, 0, Math.PI); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-0.8, -1, 0.85, 0, TAU); g.fill(); g.beginPath(); g.arc(0.9, 0.9, 0.35, 0, TAU); g.fill();
        g.restore();
        g.fillStyle = 'rgba(30,42,60,.7)'; g.beginPath(); g.ellipse(2, -4.6, 0.6, 0.9, 0.3, 0, TAU); g.fill();                         // the ear
        g.restore();
        g.restore();
      }
      // ── ORCAS: they cruise the channel, porpoising — the dorsal fin cuts the
      //    surface, the back rolls up with a spout, and now and then one BREACHES.
      //    Repainted: glossy black that catches the moon and the aurora, the white
      //    chin, belly and the flank patch sweeping up toward the tail, the eye
      //    patch, the grey saddle behind the fin, a tall fin with a lit leading edge,
      //    a broad paddle of a flipper, notched flukes
      function drawOrcaBody(g){
        const body = () => { g.beginPath(); g.moveTo(-52, 0); g.bezierCurveTo(-40, -9, -22, -15.5, 4, -16); g.bezierCurveTo(28, -16.4, 46, -10.5, 55, -1.5); g.bezierCurveTo(56.4, 1, 54, 3.6, 50, 5.2); g.bezierCurveTo(40, 10.6, 24, 14.6, 4, 14.6); g.bezierCurveTo(-20, 14.6, -42, 9, -52, 0); g.closePath(); };
        g.fillStyle = lgc('orca2Fluke', g, -74, 0, -48, 0, [[0, '#1c2430'], [1, '#07090e']]);
        g.beginPath(); g.moveTo(-48, -1.4); g.bezierCurveTo(-56, -8, -66, -13.4, -74, -10.4); g.bezierCurveTo(-68, -5.6, -63, -2.4, -59.4, 0); g.bezierCurveTo(-63, 2.4, -68, 5.6, -74, 10.4); g.bezierCurveTo(-66, 13.4, -56, 8, -48, 1.4); g.closePath(); g.fill();
        g.fillStyle = lgc('orca2Body', g, 0, -16, 0, 15, [[0, '#2c3646'], [0.3, '#131922'], [0.7, '#07090e'], [1, '#04060a']]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = lgc('orca2White', g, 0, 0, 0, 15, [[0, '#ffffff'], [1, '#cddae6']]);          // chin and throat, the belly, the flank patch sweeping up
        g.beginPath(); g.moveTo(57, 0.6); g.bezierCurveTo(48, 6.4, 34, 4.4, 26, 5); g.bezierCurveTo(10, 6.2, -4, 8.8, -14, 5); g.bezierCurveTo(-21, 1.6, -29, 0.4, -36, 3.4); g.bezierCurveTo(-32, 12, -10, 16.4, 6, 16.4); g.bezierCurveTo(30, 16.4, 48, 10, 57, 0.6); g.closePath(); g.fill();
        g.fillStyle = '#f6f9fb'; g.beginPath(); g.ellipse(30.5, -6.4, 8.2, 3, -0.2, 0, TAU); g.fill();                             // the eye patch
        g.fillStyle = 'rgba(172,184,200,.6)'; g.beginPath(); g.moveTo(-4, -15.6); g.bezierCurveTo(-14, -14.6, -24, -11.4, -31, -7); g.bezierCurveTo(-23, -9.4, -14, -10.6, -3, -11.4); g.closePath(); g.fill();   // the saddle
        g.fillStyle = lgc('orca2Gloss', g, 0, -16, 0, -9, [[0, 'rgba(214,236,255,.55)'], [1, 'rgba(214,236,255,0)']]); g.beginPath(); g.ellipse(12, -13, 31, 2.7, -0.02, 0, TAU); g.fill();    // the wet back catches the moon
        g.fillStyle = 'rgba(120,255,200,.14)'; g.beginPath(); g.ellipse(-20, -9.4, 19, 2.4, 0.26, 0, TAU); g.fill();              // and the aurora
        g.restore();
        g.strokeStyle = 'rgba(196,210,224,.55)'; g.lineWidth = 0.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(55, 0.4); g.quadraticCurveTo(46, 2.6, 39, 0.8); g.stroke();   // the mouth
        g.fillStyle = '#05070b'; g.beginPath(); g.arc(38.4, -2.6, 1.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(38.8, -3, 0.42, 0, TAU); g.fill();
        g.fillStyle = lgc('orca2Fin', g, -15, 0, 12, 0, [[0, '#05070b'], [1, '#1d2532']]);          // the dorsal fin, its leading edge lit
        g.beginPath(); g.moveTo(12, -14.8); g.bezierCurveTo(9, -30, 3, -41, -5, -46); g.bezierCurveTo(-7.6, -46.8, -8.6, -45, -8, -43); g.bezierCurveTo(-6.6, -32, -11, -21, -15, -14); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(190,226,255,.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(12, -14.8); g.bezierCurveTo(9, -30, 3, -41, -5, -46); g.stroke();
        g.save(); g.translate(25, 7.6); g.rotate(0.55); g.fillStyle = '#0a0d13';                    // the flipper: a broad paddle
        g.beginPath(); g.moveTo(-3.4, -3); g.bezierCurveTo(4, -5.4, 11.6, -3.4, 13.6, 1); g.bezierCurveTo(11.6, 5.4, 3, 5.2, -3.4, 3); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(180,210,240,.3)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-2, -3); g.bezierCurveTo(4, -5, 10, -3.4, 12.6, 0); g.stroke(); g.restore();
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
      // the SVG pose frames are rasterised ONCE per size into bitmaps — drawing an
      // SVG <img> straight to the canvas re-rasterises it every frame, which is slow
      function princessBitmap(P, pose, img){
        const key = pose.cast ? 'cast' : 'walk' + pose.fi;
        if (!P.bmp || P.bmpSc !== P.sc){ P.bmp = {}; P.bmpSc = P.sc; }
        let cv = P.bmp[key];
        if (!cv){
          const A = window.PrincessArt, w = Math.ceil(A.viewBox[2] * P.sc * DPR), h = Math.ceil(A.viewBox[3] * P.sc * DPR);
          cv = doc.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          P.bmp[key] = cv;
        }
        return cv;
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
        g.drawImage(princessBitmap(P, pose, img), -A.centerX * P.sc, -A.feetY * P.sc, A.viewBox[2] * P.sc, A.viewBox[3] * P.sc);
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
      //    trots behind and catches up. Profile (one eye). Repainted: ivory fur
      //    shaded blue beneath, a high rump and a long neck, a small head with a
      //    long arched muzzle, legs with a broad thigh narrowing to the knee and
      //    wide furry paws with dark claws.
      function bearLeg(g, hx, hy, upLen, loLen, a1, a2, w1, w2, col, shade){
        g.save(); g.translate(hx, hy); g.rotate(a1);
        g.fillStyle = lgc('bl1' + col + w1, g, -w1 * 0.7, 0, w1 * 0.7, 0, [[0, shade], [0.5, col], [1, col]]);              // the thigh: a broad mass narrowing to the knee
        g.beginPath(); g.moveTo(-w1 * 0.7, -3); g.bezierCurveTo(-w1 * 0.76, upLen * 0.5, -w2 * 0.6, upLen * 0.8, -w2 * 0.5, upLen + 1); g.lineTo(w2 * 0.5, upLen + 1);
        g.bezierCurveTo(w2 * 0.62, upLen * 0.8, w1 * 0.76, upLen * 0.5, w1 * 0.7, -3); g.closePath(); g.fill();
        g.translate(0, upLen); g.rotate(a2);
        g.fillStyle = lgc('bl2' + col + w2, g, -w2 * 0.6, 0, w2 * 0.6, 0, [[0, shade], [0.5, col], [1, col]]);              // the shin, and the knee that joins them
        g.beginPath(); g.moveTo(-w2 * 0.5, -1); g.lineTo(-w2 * 0.46, loLen); g.lineTo(w2 * 0.5, loLen); g.lineTo(w2 * 0.52, -1); g.closePath(); g.fill();
        g.beginPath(); g.arc(0, 0, w2 * 0.51, 0, TAU); g.fill();
        g.translate(0, loLen); g.rotate(-(a1 + a2));
        g.fillStyle = col;                                                                                                   // the paw: broad, furred over the toes
        g.beginPath(); g.moveTo(-w2 * 0.52, -2.4); g.bezierCurveTo(-w2 * 0.62, 3.4, w2 * 0.2, 4, w2 * 0.86, 3.2); g.bezierCurveTo(w2 * 1.02, 1, w2 * 0.72, -1.6, w2 * 0.5, -2.6); g.closePath(); g.fill();
        g.fillStyle = shade; g.beginPath(); g.ellipse(w2 * 0.16, 3.3, w2 * 0.7, 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = '#2a2f38'; for (const k of [0, 1, 2]){ g.beginPath(); g.ellipse(w2 * (0.6 + k * 0.13), 2.9 - k * 0.55, w2 * 0.07, w2 * 0.045, -0.3, 0, TAU); g.fill(); }   // claws
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
      const BEAR_FUR = [[-36, -50], [-26, -54], [-14, -55], [-2, -56], [10, -58], [22, -59], [34, -55], [42, -48], [-40, -40], [-30, -42], [-18, -44], [-4, -44], [10, -46], [24, -46], [36, -40], [-34, -30], [-20, -32], [-4, -32], [12, -34], [28, -32]];
      function drawBear(g, B, t){
        const { s, dir, ph } = B, wt = B.wt, moving = B.moving, act = bearAct(B, t);
        const sniff = act.type === 'sniff' ? act.e : 0, sit = act.type === 'sit' ? act.e : 0, stand = act.type === 'stand' ? act.e : 0, slide = act.type === 'slide' ? act.e : 0, shake = act.type === 'shake' ? act.e : 0;
        g.save(); g.translate(B.x, B.y);
        g.fillStyle = 'rgba(10,25,50,.3)'; g.beginPath(); g.ellipse(0, 2, (54 - 10 * sit) * s, 6 * s, 0, 0, TAU); g.fill();
        g.scale(dir * s, s);
        if (moving && !slide) g.translate(0, Math.sin(wt * 2) * 1.4);
        g.translate(0, 8 * slide);                                                                   // belly-sliding: low to the ice
        g.rotate(Math.sin(t * 42) * 0.09 * shake);                                                   // the shake
        const A = i => (moving && !slide ? 0.22 : 0) * Math.sin(wt + i * Math.PI / 2), Bk = i => moving && !slide ? 0.22 * Math.max(0, -Math.cos(wt + i * Math.PI / 2)) : 0;
        const splay = 0.9 * slide;                                                                   // legs out flat while sliding
        const fur = '#fbfcfa', furD = '#c6d2de', furS = '#9db3c8';
        bearLeg(g, -30, -30, 14, 14, A(2) + splay, 0.05 + Bk(2) - splay * 0.4, 13.5, 12.5, furD, furS);   // far hind leg
        g.save();
        g.translate(-28, -16); g.rotate(-(0.62 * sit + 1.05 * stand)); g.translate(28, 16);          // sitting / rearing: the body pivots on the hind hips
        bearLeg(g, 30, -32, 14, 14, A(0) - splay - 0.8 * stand, -0.05 - Bk(0) * 0.6 + splay * 0.4, 12.5, 11.5, furD, furS);   // far front leg
        // the body: a heavy rump, a back that dips and rises to the shoulder hump, a deep chest, a belly that hangs a little
        const body = () => { g.beginPath(); g.moveTo(-46, -28); g.bezierCurveTo(-52, -44, -40, -58, -20, -58); g.bezierCurveTo(-4, -58, 8, -56, 22, -58); g.bezierCurveTo(34, -60, 44, -56, 48, -48);
          g.bezierCurveTo(51, -40, 49, -28, 42, -20); g.bezierCurveTo(28, -12, -16, -11, -34, -15); g.bezierCurveTo(-42, -17, -47, -22, -46, -28); g.closePath(); };
        g.fillStyle = lgc('bear2Body', g, 0, -64, 0, -10, [[0, '#ffffff'], [0.4, '#f5f7f5'], [0.74, '#d9e2ea'], [1, '#b2c3d3']]);
        body(); g.fill();
        g.save(); body(); g.clip();
        g.fillStyle = lgc('bear2Under', g, 0, -30, 0, -10, [[0, 'rgba(132,160,190,0)'], [1, 'rgba(132,160,190,.85)']]); g.fillRect(-60, -34, 120, 26);   // the shadowed underside
        g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-30, -42, 15, 12, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(31, -45, 14, 12, 0, 0, TAU); g.fill();                              // the haunch and the shoulder catch the moon
        g.strokeStyle = 'rgba(138,164,190,.3)'; g.lineWidth = 1.1; g.lineCap = 'round';
        g.beginPath(); g.arc(-30, -36, 19, 0.3, 2.3); g.moveTo(47, -30); g.arc(31, -40, 19, 0.55, 2.4); g.stroke();                                                                 // …and are modelled by a soft line beneath
        g.fillStyle = 'rgba(214,236,255,.5)'; g.beginPath(); g.ellipse(-2, -56.6, 40, 3.4, 0, 0, TAU); g.fill();                                                                         // aurora light on the back
        g.strokeStyle = 'rgba(150,172,196,.24)'; g.lineWidth = 0.8; g.beginPath(); for (const [x, y] of BEAR_FUR){ g.moveTo(x, y); g.quadraticCurveTo(x - 2.4, y + 0.6, x - 4, y + 2.4); } g.stroke();           // the lie of the fur
        g.restore();
        g.strokeStyle = '#cdd9e3'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 11; i++){ const x = -30 + i * 6.6; g.moveTo(x, -13.6); g.lineTo(x - 1.6, -10.6 - (i % 3) * 0.7); } g.stroke();   // shaggy tufts under the belly
        g.fillStyle = furD; g.beginPath(); g.ellipse(-48, -29, 4.6, 3.6, 0.5, 0, TAU); g.fill();                                                                                     // the stub of a tail
        bearLeg(g, 24, -30, 14, 14, A(1) - splay - 0.8 * stand, -0.05 - Bk(1) * 0.6 + splay * 0.4, 13.5, 12.5, fur, furS);    // near front leg
        // neck + head (sways; lowers to sniff; lifts to watch the sky when sitting)
        g.save(); g.translate(44, -48); g.rotate(0.05 * Math.sin(t * 0.8 + ph) + 0.55 * sniff - 0.25 * sit - 0.2 * stand); g.translate(0, 10 * sniff);
        g.fillStyle = lgc('bear2NeckA', g, -22, 0, -6, 0, [[0, 'rgba(246,248,247,0)'], [1, 'rgba(246,248,247,1)']]);
        g.beginPath(); g.moveTo(-22, -12); g.bezierCurveTo(-8, -14.6, 4, -13.6, 11, -11.4); g.lineTo(13, 8.6); g.bezierCurveTo(4, 13, -8, 15, -22, 13); g.closePath(); g.fill();
        g.fillStyle = lgc('bear2NeckB', g, 0, 4, 0, 14, [[0, 'rgba(160,182,204,0)'], [1, 'rgba(160,182,204,.5)']]); g.beginPath(); g.moveTo(-18, 4); g.lineTo(13, 3); g.lineTo(13, 8.6); g.bezierCurveTo(4, 13, -8, 15, -18, 13.4); g.closePath(); g.fill();          // the thick neck
        const hs = B.cub ? 1.15 : 1;
        g.save(); g.scale(hs, hs);
        g.fillStyle = '#c3d1dd'; g.beginPath(); g.arc(11.6, -12.6, 3.3, 0, TAU); g.fill();                                                                                            // the far ear
        g.fillStyle = lgc('bear2Head', g, 0, -15, 0, 10, [[0, '#ffffff'], [0.6, '#f1f4f4'], [1, '#d0dbe4']]);                                                                         // a small skull, a long arched muzzle
        g.beginPath(); g.moveTo(1, -8); g.bezierCurveTo(4, -15, 15, -15.6, 20, -10.6); g.bezierCurveTo(25.4, -9, 30.6, -5.4, 33.6, -1.6); g.bezierCurveTo(35.4, 0.8, 34.4, 3.8, 31.4, 4.6);
        g.bezierCurveTo(26, 6.6, 20, 8.8, 14, 9.2); g.bezierCurveTo(7, 9.8, 1, 5, 1, -8); g.closePath(); g.fill();
        g.fillStyle = '#f4f7f8'; g.beginPath(); g.arc(6.4, -11.8, 3.9, 0, TAU); g.fill(); g.fillStyle = '#aebfcf'; g.beginPath(); g.arc(6.8, -11.6, 2.1, 0, TAU); g.fill();          // the near ear
        g.fillStyle = 'rgba(160,182,204,.42)'; g.beginPath(); g.moveTo(14, 9.2); g.bezierCurveTo(20, 8.8, 26, 6.6, 31.4, 4.6); g.bezierCurveTo(27, 4.8, 20, 5.4, 13, 5.6); g.closePath(); g.fill();   // shade under the jaw
        g.fillStyle = '#14171c'; g.beginPath(); g.moveTo(30.8, -1.8); g.quadraticCurveTo(33.6, -3.4, 35, -0.6); g.quadraticCurveTo(35, 2.2, 32.6, 2.6); g.quadraticCurveTo(30.2, 1.6, 30.8, -1.8); g.fill();   // the nose
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(32.6, -1.2, 0.9, 0.5, -0.4, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(40,48,58,.65)'; g.lineWidth = 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(32.6, 2.8); g.quadraticCurveTo(28, 6.2, 21.6, 5.2); g.stroke();       // the mouth
        const blinkK = Math.pow(Math.max(0, Math.sin(t * 0.6 + ph)), 60);
        g.save(); g.translate(17.6, -4.6); g.scale(1, Math.max(0.1, 1 - blinkK)); g.fillStyle = '#12161d'; g.beginPath(); g.ellipse(0, 0, 1.6, 1.7, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(-0.55, -0.65, 0.6, 0, TAU); g.fill(); g.restore();                                                               // the eye
        g.strokeStyle = 'rgba(150,172,196,.5)'; g.lineWidth = 0.8; g.beginPath(); g.arc(17.6, -4.6, 3.3, -2.5, -0.7); g.stroke();                                                    // a soft brow
        g.restore(); g.restore();
        g.restore();                                                                                                                      // end of the pivoting group
        bearLeg(g, -22, -28, 14, 14, A(3) + splay, 0.05 + Bk(3) - splay * 0.4, 14.5, 13.5, fur, furS);    // near hind leg
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
          const a = (0.25 + 0.45 * f) * (1 - 0.8 * blink) + 0.6 * castleBlaze;
          ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite('glowCyan'), L.x - L.r * 1.4, L.y - L.r * 1.4, L.r * 2.8, L.r * 2.8);
        }
        if (CASTLE.door){
          const D = CASTLE.door, f = 0.6 + 0.4 * Math.sin(t * 2.3) * Math.sin(t * 1.1 + 1);
          ctx.globalAlpha = 0.35 * f; ctx.drawImage(sprite('glowCyan'), D.x - D.r * 1.3, D.y - D.r * 1.3, D.r * 2.6, D.r * 2.6);
        }
        ctx.globalAlpha = 1;
        for (const T of CASTLE.tips){
          const k = Math.pow(Math.max(0, Math.sin(t * (0.7 + psr(T.seed) * 0.9) + psr(T.seed + 3) * TAU)), 24), r = S * 0.05 * k;
          if (k < 0.03) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * k) + ')'; ctx.lineWidth = 1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(T.x - r, T.y); ctx.lineTo(T.x + r, T.y); ctx.moveTo(T.x, T.y - r); ctx.lineTo(T.x, T.y + r); ctx.stroke();
          ctx.globalAlpha = 0.6 * k; ctx.drawImage(sprite('glowWhite'), T.x - r, T.y - r, r * 2, r * 2); ctx.globalAlpha = 1;
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
        ctx.globalAlpha = f;
        ctx.fillStyle = rgc('iglooDoor', ctx, I.ex, I.y - I.eh * 0.35, 0, I.ew * 0.9, [[0, 'rgba(255,205,130,0.95)'], [0.6, 'rgba(255,160,80,0.7)'], [1, 'rgba(255,140,60,0)']]);
        ctx.beginPath(); ctx.moveTo(I.ex - I.ew * 0.6, I.y); ctx.lineTo(I.ex - I.ew * 0.6, I.y - I.eh * 0.5); ctx.arc(I.ex, I.y - I.eh * 0.5, I.ew * 0.6, Math.PI, 0); ctx.lineTo(I.ex + I.ew * 0.6, I.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgc('iglooSpill', ctx, I.ex + I.ew * 0.4, I.y + 1, 0, I.w * 0.45, [[0, 'rgba(255,190,110,0.38)'], [1, 'rgba(255,190,110,0)']]);
        ctx.save(); ctx.translate(I.ex + I.ew * 0.4, I.y + 1); ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(0, 0, I.w * 0.45, 0, TAU); ctx.fill(); ctx.restore();
        ctx.globalAlpha = 1;
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
      // the arctic fox, repainted: a thick white coat shaded blue beneath, a soft brush
      // with a pale tip, slender legs with dark little feet, a pointed muzzle, ears
      // lined with grey, an amber eye. Trotting — or sitting on its haunches, the
      // brush curled along the ice, looking about.
      function drawFox(g, t){
        const F = FOX; if (!F || F.state === 'in') return;
        const s = F.s, sit = F.state === 'sit';
        g.save(); g.translate(F.x, F.y); g.scale(F.dir * s, s);
        g.fillStyle = 'rgba(10,25,50,.28)'; g.beginPath(); g.ellipse(0, 1, sit ? 20 : 27, 3.6, 0, 0, TAU); g.fill();
        const fur = '#fbfcfd', furD = '#cfdae4', furS = '#9fb4c8';
        const leg = (hx, hy, a, col) => {                                // a slender leg: thigh, shin, a small dark foot
          const kx = hx + Math.sin(a) * 6.4, ky = hy + Math.cos(a) * 6.4, fx = kx + Math.sin(a * 0.4) * 5.6, fy = ky + Math.cos(a * 0.4) * 5.6;
          g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = 4.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.stroke();
          g.lineWidth = 3; g.beginPath(); g.moveTo(kx, ky); g.lineTo(fx, fy); g.stroke();
          g.fillStyle = '#4a5462'; g.beginPath(); g.ellipse(fx + 0.9, fy + 0.4, 2.3, 1.2, 0, 0, TAU); g.fill();
        };
        const brush = () => {                                            // the tail, drawn pointing −x from its root at 0,0
          g.fillStyle = lgc('fox2Tail', g, 0, -7, 0, 6, [[0, fur], [0.6, '#e6edf3'], [1, furS]]);
          g.beginPath(); g.moveTo(3, -3); g.bezierCurveTo(-6, -8.6, -19, -8, -24, -1); g.bezierCurveTo(-21, 5.6, -8, 6.2, 3, 3); g.closePath(); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-19.4, -1.4, 5, 4, 0.1, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(150,172,196,.5)'; g.lineWidth = 0.7; g.beginPath(); for (const [x, y] of [[-5, -2.6], [-10, -3.6], [-14.6, -3], [-7.6, 1.6], [-13, 1.8]]){ g.moveTo(x, y); g.lineTo(x - 3, y + 0.9); } g.stroke();
        };
        if (sit){
          g.save(); g.translate(-13, -3.4); g.rotate(0.12 + Math.sin(t * 5) * 0.16); brush(); g.restore();                    // the brush lies along the ice, its tip twitching
          g.fillStyle = lgc('fox2Sit', g, 0, -30, 0, 0, [[0, '#ffffff'], [0.6, '#f1f5f8'], [1, furD]]);
          g.beginPath(); g.ellipse(-6.6, -8.4, 9.6, 8.6, 0, 0, TAU); g.fill();                                                 // the haunches
          g.beginPath(); g.moveTo(-13, -12); g.bezierCurveTo(-11, -24, 1, -30.6, 9, -27.4); g.bezierCurveTo(13.6, -24, 14.6, -14, 12.4, -7.6); g.bezierCurveTo(6, -3.6, -6, -4, -13, -12); g.closePath(); g.fill();   // the body, upright
          g.strokeStyle = 'rgba(150,172,196,.45)'; g.lineWidth = 0.8; g.beginPath(); g.arc(-6.6, -8.4, 9, -1.1, 0.5); g.stroke();
          g.fillStyle = '#4a5462'; g.beginPath(); g.ellipse(0.6, -0.6, 3, 1.3, 0, 0, TAU); g.fill();                              // a hind foot
          leg(11.6, -13, 0.04, furD); leg(8, -13, 0.04, fur);                                                                   // the forelegs, straight
          g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 4; i++){ const y = -23 + i * 3.2; g.moveTo(10.6, y - 1.6); g.lineTo(15.8, y + 1); g.lineTo(10.6, y + 1.8); } g.fill();   // the ruff on its chest
        } else {
          for (const i of [0, 2]) leg(i < 2 ? -11 : 10, -12, Math.sin(F.wt + i * Math.PI / 2) * 0.5, furD);                     // the far pair
          g.save(); g.translate(-15, -15); g.rotate(-0.22 + Math.sin(F.wt * 0.5) * 0.15); brush(); g.restore();                 // the brush streams behind
          g.fillStyle = lgc('fox2Body', g, 0, -24, 0, -7, [[0, '#ffffff'], [0.55, '#f1f5f8'], [1, furD]]);
          g.beginPath(); g.moveTo(-17, -14); g.bezierCurveTo(-17, -21.6, -5, -23.6, 6, -23); g.bezierCurveTo(14.4, -22.4, 19, -19.6, 19, -15.4); g.bezierCurveTo(19, -10.6, 10, -8, 0, -8); g.bezierCurveTo(-10, -8, -17, -9.6, -17, -14); g.closePath(); g.fill();
          g.fillStyle = lgc('fox2Under', g, 0, -13, 0, -8, [[0, 'rgba(150,176,200,0)'], [1, 'rgba(150,176,200,.6)']]); g.beginPath(); g.ellipse(0, -10.4, 16, 3, 0, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 3; i++){ const y = -19 + i * 3; g.moveTo(15.6, y - 1.6); g.lineTo(20.8, y + 1); g.lineTo(15.6, y + 1.8); } g.fill();
          for (const i of [1, 3]) leg(i < 2 ? -8 : 13, -12, Math.sin(F.wt + i * Math.PI / 2) * 0.5, fur);                       // the near pair
        }
        const look = sit ? Math.sin(t * 0.9) * 0.25 : 0;                                                              // the head turns to look about
        g.save(); g.translate(sit ? 9 : 16, sit ? -31 : -21); g.rotate(look);
        g.fillStyle = furD; g.beginPath(); g.moveTo(-1.6, -4.4); g.lineTo(1.6, -12); g.lineTo(4.6, -5); g.closePath(); g.fill();                                             // the far ear
        g.fillStyle = lgc('fox2Head', g, 0, -8, 0, 7, [[0, '#ffffff'], [1, '#dfe7ee']]);
        g.beginPath(); g.moveTo(-6.6, 1); g.bezierCurveTo(-7.2, -6, 0, -8.4, 4.4, -5.4); g.lineTo(12.8, 0.4); g.bezierCurveTo(13.6, 1.6, 12.8, 2.9, 11.2, 2.9); g.lineTo(3, 5.6); g.bezierCurveTo(-2, 7.2, -6.5, 5, -6.6, 1); g.closePath(); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-6.4, 2); g.lineTo(-9.6, 4.6); g.lineTo(-5, 4.6); g.lineTo(-6.6, 7.4); g.lineTo(-2, 6); g.closePath(); g.fill();   // the cheek ruff
        g.fillStyle = fur; g.beginPath(); g.moveTo(-5.6, -3.6); g.lineTo(-3, -12); g.lineTo(0.6, -4.6); g.closePath(); g.fill();                                              // the near ear, lined with grey
        g.fillStyle = '#9aaec2'; g.beginPath(); g.moveTo(-4.4, -4.8); g.lineTo(-2.9, -9.8); g.lineTo(-0.8, -5); g.closePath(); g.fill();
        g.fillStyle = '#16181d'; g.beginPath(); g.ellipse(12.4, 1.2, 1.4, 1.2, 0, 0, TAU); g.fill();                                                                         // nose, mouth, eye
        g.strokeStyle = 'rgba(40,48,58,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(11.6, 2.4); g.quadraticCurveTo(8.6, 4, 5.6, 3.4); g.stroke();
        g.fillStyle = '#16181d'; g.beginPath(); g.ellipse(3.2, -1.4, 1.5, 1.5, 0, 0, TAU); g.fill();
        g.fillStyle = '#c98a2a'; g.beginPath(); g.arc(3.2, -1.4, 0.95, 0, TAU); g.fill(); g.fillStyle = '#16181d'; g.beginPath(); g.arc(3.3, -1.4, 0.5, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(2.8, -1.8, 0.3, 0, TAU); g.fill();
        g.restore();
        g.restore();
      }
      // a sheet of every animal, large (the harness's `sheet(true)` hook) — for looking closely at the art
      let SHEET = false;
      function drawSheet(t){
        ctx.fillStyle = lgc('sheetBg', ctx, 0, 0, 0, 900, [[0, '#1d4f78'], [1, '#2f6f96']]); ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(225,240,252,.9)'; ctx.fillRect(0, H * 0.44, W, H * 0.02); ctx.fillRect(0, H * 0.9, W, H * 0.1);
        const S0 = { x: W * 0.2, y: H * 0.42, rot: 0, s: 5.2, dir: 1, ph: 0.3, waveT0: -10 };
        drawSeal(ctx, S0, t, { x: S0.x, y: S0.y, rot: 0, dir: 1, flip: 0, hop: 0, clap: 0, wiggle: 0, swim: false });
        ctx.save(); ctx.translate(W * 0.68, H * 0.26); ctx.scale(4.2, 4.2); drawOrcaBody(ctx); ctx.restore();
        drawBear(ctx, { x: W * 0.22, y: H * 0.9, dir: 1, s: 3.3, wt: t * 3, ph: 0.4, moving: true }, t);
        drawBear(ctx, { x: W * 0.55, y: H * 0.9, dir: 1, s: 2.1, wt: 0, ph: 2, cub: true, moving: false }, t);
        const keep = FOX;
        FOX = { state: 'sit', x: W * 0.9, y: H * 0.9, dir: -1, s: 4.6, wt: 0 }; drawFox(ctx, t);
        FOX = { state: 'out', x: W * 0.76, y: H * 0.9, dir: 1, s: 4.6, wt: t * 9 }; drawFox(ctx, t);
        FOX = keep;
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

      // ── CASTLE LIGHTNING — click the ice castle and a storm breaks over it.
      //    Ported from success_screens/success-lightning-storm.js: each bolt is
      //    built by MIDPOINT DISPLACEMENT (genBolt), drawn as a wide soft glow
      //    plus a bright core (drawSegs), with a secondary branch, a soft flash
      //    at the impact point and a spray of sparks. Here the strikes are aimed
      //    at the castle's own spire tips, and its windows blaze white with each
      //    hit. It does NOT touch the aurora — only clicking the aurora does.
      function genBolt(x1, y1, x2, y2, disp, out){
        if (disp < 8){ out.push(x1, y1, x2, y2); return; }
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * disp;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * disp * 0.5;
        genBolt(x1, y1, mx, my, disp * 0.55, out);
        genBolt(mx, my, x2, y2, disp * 0.55, out);
      }
      function drawSegs(g, segs, alpha){
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(125,196,255,' + (0.40 * alpha) + ')';           // the wide halo
        g.lineWidth = 10 * U;
        g.beginPath();
        for (let k = 0; k < segs.length; k += 4){ g.moveTo(segs[k], segs[k + 1]); g.lineTo(segs[k + 2], segs[k + 3]); }
        g.stroke();
        g.strokeStyle = 'rgba(245,250,255,' + (0.98 * alpha) + ')';           // the bright core
        g.lineWidth = 2.8 * U;
        g.beginPath();
        for (let k = 0; k < segs.length; k += 4){ g.moveTo(segs[k], segs[k + 1]); g.lineTo(segs[k + 2], segs[k + 3]); }
        g.stroke();
      }
      function castleStorm(t){
        if (!CASTLE || t - stormT0 < 1.2) return;
        stormT0 = t;
        STRIKES = [];
        const tips = CASTLE.tips.slice().sort((a, b) => a.y - b.y);           // the tallest spires first
        const times = [0.05, 0.42, 0.68, 0.95, 1.25];
        for (let i = 0; i < times.length; i++){
          const tip = tips[Math.min(tips.length - 1, i === 0 ? 0 : Math.floor(Math.random() * tips.length))];
          const tx = tip.x + rnd(-8, 8) * U, ty = tip.y + rnd(-4, 10) * U;
          const segs = []; genBolt(tx + rnd(-0.18, 0.18) * W, -30, tx, ty, H * 0.16, segs);
          const mi = (Math.floor(segs.length / 8) * 4) || 0;                   // a branch off the middle
          const bsegs = [];
          genBolt(segs[mi], segs[mi + 1], segs[mi] + (Math.random() < 0.5 ? -1 : 1) * rnd(50, 110) * U,
                  segs[mi + 1] + rnd(70, 130) * U, H * 0.06, bsegs);
          const sparks = [];
          for (let k = 0; k < 14; k++){
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
            sparks.push({ ca: Math.cos(ang), sa: Math.sin(ang), speed: rnd(0.08, 0.28) * U, life: rnd(0.30, 0.58), r: rnd(0.8, 2.4) * U });
          }
          STRIKES.push({ at: times[i], segs, bsegs, tx, ty, sparks });
        }
      }
      function drawLightning(g, t){
        if (!STRIKES.length) return;
        const et = t - stormT0;
        if (et > 2.6){ STRIKES = []; castleBlaze = 0; return; }
        let blaze = 0, flash = 0;
        for (const st of STRIKES){
          const te = et - st.at;
          if (te < 0) continue;
          blaze = Math.max(blaze, Math.exp(-te / 0.18));
          if (te <= 0.38){
            const a = Math.pow(1 - te / 0.38, 1.5) * (0.75 + 0.25 * Math.sin(te * 90));    // a fine flicker
            drawSegs(g, st.segs, a);
            drawSegs(g, st.bsegs, a * 0.6);
          }
          const fa = 0.24 * Math.exp(-te / 0.14);
          if (fa > 0.008){
            flash = Math.max(flash, fa);
            g.fillStyle = rg(g, st.tx, st.ty, 0, H * 0.55, [[0, 'rgba(125,196,255,' + fa + ')'], [1, 'rgba(125,196,255,0)']]);
            g.fillRect(0, 0, W, H);
          }
          for (let i = 0; i < st.sparks.length; i++){
            const sp = st.sparks[i], q = te / sp.life;
            if (q >= 1 || q < 0) continue;
            const dec = 1 - 0.5 * q;
            g.fillStyle = (i % 3) ? 'rgba(255,255,255,' + ((1 - q) * 0.9) + ')' : 'rgba(255,210,125,' + ((1 - q) * 0.9) + ')';
            g.beginPath();
            g.arc(st.tx + sp.ca * sp.speed * te * 1000 * dec, st.ty + sp.sa * sp.speed * te * 1000 * dec + 900 * te * te * U, sp.r * (1 - q * 0.5), 0, TAU);
            g.fill();
          }
        }
        castleBlaze = blaze;
        if (flash > 0.02){ g.fillStyle = 'rgba(220,240,255,' + (flash * 0.5) + ')'; g.fillRect(0, 0, W, H); }
      }

      // ── per-frame drawing ──
      function drawTwinkle(t){
        for (const s of TWINKLE){
          const tw = 0.55 + 0.45 * Math.sin(t * s.spd + s.ph);
          ctx.fillStyle = 'rgba(' + s.col + ',' + (s.a * tw) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
          if (s.r > 1.75){                                            // a faint cross on the very brightest
            ctx.strokeStyle = 'rgba(' + s.col + ',' + (0.25 * tw) + ')'; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(s.x - s.r * 3, s.y); ctx.lineTo(s.x + s.r * 3, s.y); ctx.moveTo(s.x, s.y - s.r * 3); ctx.lineTo(s.x, s.y + s.r * 3); ctx.stroke();
          }
        }
        if (t > nextShootAt){                                        // they come often, and often in twos and threes
          nextShootAt = t + rnd(1.8, 5);
          const n = Math.random() < 0.35 ? (Math.random() < 0.4 ? 3 : 2) : 1;
          for (let i = 0; i < n; i++)
            SHOOTERS.push({ x: rnd(W * 0.05, W * 0.95), y: rnd(H * 0.02, H * 0.34), t0: t + i * rnd(0.05, 0.25),
                            ang: rnd(2.55, 3.05), len: rnd(60, 170) * U });
        }
        SHOOTERS = SHOOTERS.filter(s => t - s.t0 < 1.0);
        for (const s of SHOOTERS){
          if (t < s.t0) continue;                                    // a staggered member of a burst
          const k = (t - s.t0), x = s.x + Math.cos(s.ang) * k * s.len * 2.4, y = s.y + Math.sin(s.ang) * k * s.len * 2.4;
          const tx = x - Math.cos(s.ang) * s.len, ty = y - Math.sin(s.ang) * s.len, a = 1 - k;
          ctx.strokeStyle = lg(ctx, x, y, tx, ty, [[0, 'rgba(255,255,255,' + 0.9 * a + ')'], [0.4, 'rgba(180,220,255,' + 0.45 * a + ')'], [1, 'rgba(150,200,255,0)']]);
          ctx.lineWidth = 1.8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        }
      }
      // ── THE MOON: big, full, with maria, craters, limb darkening and a soft
      //    glow (no halo ring). Details are painted once into a small canvas.
      let moonCv = null, moonGlow = null, moonR = 0;
      function paintMoon(R){
        moonR = R;
        moonGlow = doc.createElement('canvas');                        // the soft glow, painted once (alpha 0.25 at the disc)
        { const D = Math.ceil(R * 9 * DPR); moonGlow.width = moonGlow.height = D; const gg = moonGlow.getContext('2d'); gg.setTransform(DPR, 0, 0, DPR, 0, 0);
          gg.fillStyle = rg(gg, R * 4.5, R * 4.5, R * 0.9, R * 4.5, [[0, 'rgba(210,222,255,0.25)'], [0.4, 'rgba(200,215,255,0.0875)'], [1, 'rgba(200,215,255,0)']]); gg.fillRect(0, 0, R * 9, R * 9); }
        moonCv = doc.createElement('canvas'); const D = Math.ceil(R * 2 * DPR) + 4; moonCv.width = moonCv.height = D;
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
        ctx.globalAlpha = gl / 0.25; ctx.drawImage(moonGlow, mx - R * 4.5, my - R * 4.5, R * 9, R * 9); ctx.globalAlpha = 1;
        ctx.drawImage(moonCv, mx - moonCv.width / (2 * DPR), my - moonCv.height / (2 * DPR), moonCv.width / DPR, moonCv.height / DPR);
      }
      // the lake's mirror of the aurora: built at 1/8 res whenever the aurora is
      // re-rendered (a handful of tiny blits), then blitted ONCE per frame — it
      // used to be seven full-screen flipped blits every frame
      function buildRefl(){
        const g = reflL.cx;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, reflL.cv.width, reflL.cv.height); g.restore();
        g.save(); g.beginPath(); g.rect(0, LAKE, W, H - LAKE); g.clip();
        g.translate(0, LAKE); g.scale(1, -0.75); g.translate(0, -LAKE);
        g.globalCompositeOperation = 'lighter';
        for (const [dy, a] of [[0, 0.20], [-H * 0.014, 0.11], [H * 0.014, 0.11], [H * 0.03, 0.06]]){ g.globalAlpha = a; g.drawImage(auroraLo.cv, 0, dy, W, AURH); }   // smeared vertically
        g.restore();
        g.save(); channelPath(g); g.clip();                             // the open water mirrors it far more brightly
        g.translate(0, LAKE); g.scale(1, -0.75); g.translate(0, -LAKE);
        g.globalCompositeOperation = 'lighter';
        for (const [dy, a] of [[0, 0.30], [-H * 0.01, 0.16], [H * 0.01, 0.16]]){ g.globalAlpha = a; g.drawImage(auroraLo.cv, 0, dy, W, AURH); }
        g.restore();
      }
      function drawReflections(){
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        band(reflL, LAKE, H);                                            // the mirror only exists in the lake
        ctx.globalAlpha = Math.min(1, intensity);                        // the aurora's light on the far ice and the snow line
        ctx.fillStyle = lgc('horizonGlow', ctx, 0, H * 0.5, 0, H * 0.72, [[0, 'rgba(60,200,140,0)'], [0.55, 'rgba(60,200,140,0.07)'], [1, 'rgba(60,200,140,0)']]);
        ctx.fillRect(0, H * 0.5, W, H * 0.22);
        ctx.restore();
      }
      function drawMist(t, dt){
        for (const m of MIST){
          m.x += m.spd * dt * (1 + wind * 0.3); if (m.x - m.w > W) m.x = -m.w;
          ctx.globalAlpha = m.a; ctx.drawImage(sprite('mist'), m.x - m.w, m.y - m.h, m.w * 2, m.h * 2); ctx.globalAlpha = 1;
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
        profT = performance.now(); PROF.frames++;
        // an aurora SURGE (click the sky): brighter, faster curtains for ~5 s
        const sk = surge ? Math.sin(clamp01((t - surge.t0) / 5) * Math.PI) : 0;
        if (surge && t - surge.t0 > 5) surge = null;
        auroraT += dt * (1 + 2.6 * sk); surgeBoost = 1 + 1.1 * sk;
        band(skyL, 0, B_SKY);                                          // below B_SKY the mid layer is opaque
        drawTwinkle(t);
        drawMoon(t);
        mark('sky');
        // the aurora: rays at half-res, a soft bloom from the 1/8-res copy, added to
        // the sky. The curtains move slowly, so they (and the lake's mirror of them)
        // are re-rendered every OTHER frame — halving the heaviest pass.
        if ((PROF.frames & 1) === 0 || !auroraReady){
          drawAurora(auroraL.cx, auroraL.w, auroraL.hDraw, auroraT);   // hDraw: the band is a WINDOW on a full-height coordinate space
          auroraLo.cx.clearRect(0, 0, auroraLo.w, auroraLo.h);
          auroraLo.cx.drawImage(auroraL.cv, 0, 0, auroraLo.w, auroraLo.h);
          buildRefl();
          // the bloom (the 1/8-res copy, upscaled) is folded INTO the curtain
          // layer, so the sky takes ONE additive blit of the band instead of two
          // full-screen ones. 0.85 splits the old pair (curtains .8, bloom .9).
          auroraL.cx.save(); auroraL.cx.globalCompositeOperation = 'lighter';
          auroraL.cx.drawImage(auroraLo.cv, 0, 0, auroraL.w, auroraL.h);
          auroraL.cx.restore();
          auroraReady = true;
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85; ctx.drawImage(auroraL.cv, 0, 0, W, AURH);
        ctx.restore();
        mark('aurora');
        band(midL, MID_Y0, H);                                       // ranges + castle + ice + the ranges' mirror, one blit
        drawCastleFx(t);
        mark('layers');
        drawReflections();
        mark('reflect');
        drawIglooFx(t, dt);
        mark('igloo');
        updateOrcas(t, dt); drawOrcas(t);
        mark('orcas');
        updateSeals(t, dt);
        const sealPoses = SEALS.map(S => [S, sealPose(S, t)]);
        for (const [S, P] of sealPoses) if (P.swim) drawSeal(ctx, S, t, P);          // swimming seals: behind the icebergs
        drawMist(t, dt);
        band(foreL, FORE_Y0, FORE_Y1);
        for (const [S, P] of sealPoses) if (!P.swim) drawSeal(ctx, S, t, P);
        mark('seals+fore');
        updateBears(t, dt); for (const B of BEARS) drawBear(ctx, B, t); drawFurFx(ctx, t);
        mark('bears');
        drawSparks(t);
        for (const P of PRINCESSES) updatePrincess(P, t, dt);
        updateMagic(t, dt);
        for (const P of PRINCESSES.slice().sort((a, b) => a.y - b.y)) drawPrincess(ctx, P, t);
        mark('princess');
        updateOlaf(t, dt);
        mark('olaf');
        fxCtx.clearRect(0, 0, W, H);                                   // the layer ABOVE Olaf
        drawMagic(fxCtx, t);
        drawSnow(fxCtx, t, dt);
        drawLightning(fxCtx, t);
        mark('fx');
        if (SHEET) drawSheet(t);
      }
      // The canvas paces itself: while frames run long it renders every 2nd
      // display frame and returns to full rate after 6 quiet seconds (Olaf is a
      // DOM/CSS rig and keeps animating at display rate either way). Touch
      // devices start there. Ported from unicorns3.
      let prevTs = null, lastDrawTs = 0, lastDecide = 0, calmSince = 0, frameErr = false;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);                          // scheduled first: a bad frame never kills the loop
        if (prevTs !== null) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts; perf.drawn++;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!frameErr){ frameErr = true; console.error('aurora2 frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          lastDecide = ts;
          const heavy = perf.costEma > 7 || perf.gapEma > 21;
          if (heavy){ perf.halfRate = true; calmSince = ts; }
          else if (perf.costEma > 3.5 || perf.gapEma > 17.5) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
        }
      }

      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR(); FDPR = Math.min(DPR, 1);
        canvas.width = W * DPR; canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        fxCv.width = W * FDPR; fxCv.height = H * FDPR;                 // snow / magic / lightning are soft — 1x is plenty
        fxCtx.setTransform(FDPR, 0, 0, FDPR, 0, 0);
        buildScene();
        fitOlaf();
        skyL = makeLayer(W, H, DPR); mtnL = makeLayer(W, H, DPR); lakeL = makeLayer(W, H, DPR); midL = makeLayer(W, H, DPR); foreL = makeLayer(W, H, DPR);
        reflL = makeLayer(W, H, 0.125);                                // the aurora's lake mirror, 1/8 res
        GCACHE = {}; auroraReady = false;
        // the curtains hang in the top ~43% of the sky (BANDS: the lowest edge a
        // band can reach is y+amp+.015 = .425H) — the layer is only that tall, so
        // the render, the mirror source and the sky blit all shrink with it. It
        // stays a WINDOW on a full-height space (hDraw), so the bands keep their
        // proportions.
        AURH = Math.round(H * 0.46);
        auroraL = makeLayer(Math.round(W / 2), Math.round(AURH / 2), 1); auroraL.hDraw = H / 2;
        auroraLo = makeLayer(Math.round(W / 8), Math.round(AURH / 8), 1);
        auroraLo.cx.imageSmoothingEnabled = true;
        paintSky(skyL.cx); paintMountains(mtnL.cx); paintLake(lakeL.cx); paintFore(foreL.cx);
        // ONE static mid layer: the ranges + castle, the ice, and the ranges' dim mirror in it
        { const g = midL.cx; g.clearRect(0, 0, W, H);
          g.drawImage(mtnL.cv, 0, 0, W, H); g.drawImage(lakeL.cv, 0, 0, W, H);
          g.save(); g.beginPath(); g.rect(0, LAKE, W, H - LAKE); g.clip();
          g.translate(0, LAKE); g.scale(1, -0.75); g.translate(0, -LAKE);
          g.globalAlpha = 0.36; g.drawImage(mtnL.cv, 0, 0, W, H); g.restore(); }      // the ranges and the palace, mirrored in the ice
        { const mid = layerBounds(midL), fore = layerBounds(foreL);
          MID_Y0 = mid.y0; B_SKY = mid.solid; FORE_Y0 = fore.y0; FORE_Y1 = fore.y1; }
      }

      const onClick = e => {
        if (stopped) return;
        if (e.target.closest && e.target.closest(UI_SEL)) return;
        const mx = e.clientX, my = e.clientY;
        for (const P of PRINCESSES) if (Math.abs(mx - P.x) < 40 * P.s && my < P.y + 6 * P.s && my > P.y - 190 * P.s){ startCast(P, lastT); return; }
        for (const S of SEALS) if (Math.abs(mx - S.x) < 34 * S.s && Math.abs(my - S.y + 6 * S.s) < 24 * S.s){ S.waveT0 = lastT; if (!S.act && Math.random() < 0.5) startSealAct(S, null, lastT); return; }
        for (const B of BEARS) if (Math.abs(mx - B.x) < 50 * B.s && my < B.y + 4 * B.s && my > B.y - 70 * B.s){ startBearAct(B, B.cub ? 'stand' : 'sit', lastT); return; }
        if (OLAF && OLAF.el && Math.abs(mx - OLAF.x) < OLAF.w * 0.7 && my < OLAF.y + 8 && my > OLAF.y - OLAF.h){ olafHop(lastT); return; }
        if (CASTLE && CASTLE.box && mx > CASTLE.box.x0 && mx < CASTLE.box.x1 && my > CASTLE.box.y0 && my < CASTLE.box.y1){ castleStorm(lastT); return; }
        if (my < H * 0.36) surge = { t0: lastT };                       // the aurora band only
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
        lightning: () => castleStorm(lastT),
        busy: () => ({ strikes: STRIKES.length, surge: !!surge, castleBox: CASTLE && CASTLE.box }),
        prof: () => { const o = {}; for (const k in PROF) o[k] = k === 'frames' ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        perf: () => ({ dpr: +DPR.toFixed(2), fdpr: FDPR, halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1),
                       costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn,
                       bands: { sky: Math.round(B_SKY), mid: Math.round(MID_Y0), fore: [Math.round(FORE_Y0), Math.round(FORE_Y1)], aurora: AURH, H } }),
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; },
        olaf: () => OLAF,
        sheet: on => { SHEET = !!on; },
        princess: () => PRINCESSES, orcas: () => ORCAS, bears: () => BEARS,
      };
      window.BACKGROUNDS.aurora2._test = hooks; window._aurora2 = hooks;

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        stage.innerHTML = '';
        if (window._aurora2 === hooks) delete window._aurora2;
        if (window.BACKGROUNDS.aurora2._test === hooks) delete window.BACKGROUNDS.aurora2._test;
      };
    },
  };
})();
