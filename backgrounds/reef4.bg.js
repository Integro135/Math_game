/* ── Reef 4 — the 🐠 underwater world, painted again from scratch (2026-11) ────
   Theme `reef` → this module (`_BG_THEMES`). Harness: reef4.html. Notes:
   backgrounds/README.md ("reef4.bg.js"). Tests: tests/test_reef4.py,
   tests/test_reef_station.py. Stills: _verify_reef4.py; cost: _perf_reef4.py.

   A lush, deep reef: two coral masses frame a channel of sand under the game
   card; every colony is painted with light and shade; sea fans, soft corals
   and anemones sway; real reef fish live in it. The rule that keeps it cheap:
   ALL OF THE RICHNESS IS BAKED.
     · the still picture is ONE opaque layer (water, far reef, sand, rock,
       ~170 coral colonies, the floor's things), painted once per window size;
       the same pass paints the night's own light (emissive) and the mask of
       where moving light may fall
     · every creature is a FLIPBOOK — its loop rendered once, then one image
       blit per frame; only a creature in the middle of its trick is drawn live
     · every swaying thing is a sprite bent into 15 frames; one blit on screen
     · the moving caustics are one small masked layer; the sun's rays are two
       baked fans cross-fading; the hour is one gradient over the frame
     · quality tiers (Q 2/1/0) drop passes first; only the lowest halves the rate

   Parts, in order: helpers and textures · rigs loader · shapes and the hour ·
   the stage, the layout, the water · rock · corals · swaying things · far reef
   and sand · the composition · the floor · baking and the living light · sway
   books · flipbooks · the fish painter and the species · the cast · visitors
   and giants · bubbles and the cleaning station · tricks · the frame · taps
   and hooks (window._reef4).                                                  */
(function(){
  'use strict';
  const doc = document, TAU = Math.PI * 2;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  const BASE = (function(){ const sc = doc.currentScript; return sc && sc.src ? sc.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();

  // ── colour
  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => { c = hexc(c); return a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  const mixc = (a, b, k) => { a = hexc(a); b = hexc(b); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
  const LIGHT = [226, 248, 255], SHADE = [18, 36, 96], DEEP = [10, 52, 122];      // the sun through water · the shadow's blue · the far water
  const lit = (c, k) => rgb(mixc(c, LIGHT, k));               // where the light lands
  const shd = (c, k) => rgb(mixc(c, SHADE, k));               // in shade: toward deep blue-violet
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function noise1(x){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), u); }

  // ── small canvases
  function mkCanvas(w, h){ const cv = doc.createElement('canvas'); cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h)); return cv; }
  // a soft copy of a canvas: down and up again (works everywhere; `k` = how soft)
  function softCopy(src, k){
    const w = Math.max(2, Math.round(src.width / k)), h = Math.max(2, Math.round(src.height / k));
    const a = mkCanvas(w, h), ga = a.getContext('2d'); ga.imageSmoothingEnabled = true; ga.imageSmoothingQuality = 'high'; ga.drawImage(src, 0, 0, w, h);
    const b = mkCanvas(src.width, src.height), gb = b.getContext('2d'); gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = 'high'; gb.drawImage(a, 0, 0, src.width, src.height);
    return b;
  }

  // ── TEXTURES, made once for the page (they do not depend on the window)
  // a seamless cloud of soft noise, mid-grey on average — laid over rock and sand
  // in soft-light it breaks every flat fill
  let TEX = null;
  function textures(){
    if (TEX) return TEX;
    const N = 256, r = makeRng(1234);
    const lat = p => { const a = new Float32Array(p * p); for (let i = 0; i < a.length; i++) a[i] = r(); return a; };
    const L4 = lat(4), L8 = lat(8), L16 = lat(16), L32 = lat(32), L64 = lat(64);
    const val = (Lt, p, x, y) => { const fx = x * p, fy = y * p, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
      const a = Lt[(iy % p) * p + ix % p], b = Lt[(iy % p) * p + (ix + 1) % p], c = Lt[((iy + 1) % p) * p + ix % p], d = Lt[((iy + 1) % p) * p + (ix + 1) % p];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
    const noise = mkCanvas(N, N), gn = noise.getContext('2d'), im = gn.createImageData(N, N);
    const grain = mkCanvas(N, N), gg = grain.getContext('2d'), ig = gg.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
      const u = x / N, v = y / N, i = (y * N + x) * 4;
      const f = val(L4, 4, u, v) * 0.42 + val(L8, 8, u, v) * 0.27 + val(L16, 16, u, v) * 0.17 + val(L32, 32, u, v) * 0.09 + val(L64, 64, u, v) * 0.05;
      const c = clamp(Math.round(128 + (f - 0.5) * 300), 0, 255);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = c; im.data[i + 3] = 255;
      const gr0 = clamp(Math.round(128 + (val(L64, 64, u, v) - 0.5) * 150 + (r() - 0.5) * 90), 0, 255);       // fine grain
      ig.data[i] = ig.data[i + 1] = ig.data[i + 2] = gr0; ig.data[i + 3] = 255;
    }
    gn.putImageData(im, 0, 0); gg.putImageData(ig, 0, 0);
    // caustics: the bright net light draws on the bottom — cell borders of two
    // scattered point sets (second-nearest minus nearest distance), seamless
    const C = 256, caust = mkCanvas(C, C), gc = caust.getContext('2d'), ic = gc.createImageData(C, C);
    const sets = [22, 60].map(n => { const P = []; for (let i = 0; i < n; i++) P.push(r(), r()); return P; });
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++){
      const u = x / C, v = y / C; let acc = 0;
      for (let s = 0; s < 2; s++){
        const P = sets[s]; let f1 = 9, f2 = 9;
        for (let k = 0; k < P.length; k += 2){
          let dx = Math.abs(u - P[k]), dy = Math.abs(v - P[k + 1]); if (dx > 0.5) dx = 1 - dx; if (dy > 0.5) dy = 1 - dy;
          const d = dx * dx + dy * dy; if (d < f1){ f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        const e = Math.sqrt(f2) - Math.sqrt(f1), w = s ? 0.035 : 0.06;                 // thin where the two distances meet
        acc += Math.pow(clamp01(1 - e / w), 2.2) * (s ? 0.45 : 1);
      }
      const i = (y * C + x) * 4; ic.data[i] = 255; ic.data[i + 1] = 255; ic.data[i + 2] = 255; ic.data[i + 3] = clamp(Math.round(acc * 235), 0, 255);
    }
    gc.putImageData(ic, 0, 0);
    return (TEX = { noise, grain, caust });
  }
  // lay a texture over what is already painted in the current path's clip (call inside save/clip)
  function texture(g, tex, mode, alpha, scale, x, y, w, h){
    const p = g.createPattern(tex, 'repeat');
    g.save(); g.globalCompositeOperation = mode; g.globalAlpha = alpha; g.scale(scale, scale); g.fillStyle = p; g.fillRect(x / scale, y / scale, w / scale, h / scale); g.restore();
  }

  // ── the hero rigs: the savanna kit first (shared helpers), then reef_rigs/ —
  //    each loaded once and shared across re-inits
  const RIG_FILES = [['SavKit', 'savanna_rigs/kit.js'], ['TurtleRig', 'reef_rigs/painted.js'], ['JellyRig', 'reef_rigs/jelly.js']];     // painted.js holds seven creatures
  function needScript(globalName, file, cb){
    if (window[globalName]){ cb(); return; }
    const ex = doc.querySelector('script[data-reefrig="' + globalName + '"]') ||
               (globalName === 'SavKit' && doc.querySelector('script[data-savrig="SavKit"], script[data-unirig="SavKit"], script[data-dinorig="SavKit"]'));
    if (ex){ if (ex.getAttribute('data-done')) cb(); else { ex.addEventListener('load', cb); ex.addEventListener('error', cb); } return; }   // a tag that already finished (or failed) will not fire again
    const s = doc.createElement('script');
    s.src = BASE + file; s.setAttribute('data-reefrig', globalName);
    s.onload = s.onerror = () => { s.setAttribute('data-done', '1'); cb(); };
    doc.head.appendChild(s);
  }
  function loadRigs(cb){
    needScript('SavKit', RIG_FILES[0][1], () => {
      let left = RIG_FILES.length - 1; if (!left){ cb(); return; }
      RIG_FILES.slice(1).forEach(([g, f]) => needScript(g, f, () => { if (--left === 0) cb(); }));
    });
  }
  // the roaming "rumi" character (backgrounds/rumi/chibi-walker.js) — loaded once
  function needRumi(cb){
    if (window.ChibiWalker){ cb(); return; }
    const ex = doc.querySelector('script[data-chibi-walker]');
    if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    const s = doc.createElement('script');
    s.src = BASE + 'rumi/chibi-walker.js'; s.setAttribute('data-chibi-walker', '1');
    s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }

  // ── shape helpers
  // a lumpy closed outline round an ellipse (flatter underneath when `flat`)
  function blobPts(x, y, rx, ry, R, rough, n, flat){
    const P = []; n = n || 14;
    for (let i = 0; i < n; i++){
      const a = i / n * TAU, s = Math.sin(a), rr = 1 + (R() - 0.5) * rough * 2;
      P.push([x + Math.cos(a) * rx * rr, y + s * ry * rr * (flat && s > 0.3 ? 0.78 : 1)]);
    }
    return P;
  }
  function smoothClosed(g, P){
    const n = P.length; g.beginPath();
    g.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++){ const a = P[i], b = P[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  }
  function smoothOpen(g, P){
    g.beginPath(); g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    g.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
  }
  // a soft ellipse of colour: a shadow on the ground, a pool of light
  function softEllipse(g, x, y, rx, ry, col, a){
    if (rx <= 0 || ry <= 0) return;
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    g.fillStyle = rg(g, 0, 0, 0, rx, [[0, rgb(col, a)], [0.55, rgb(col, a * 0.55)], [1, rgb(col, 0)]]);
    g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }
  // a round limb from a to b, w0 wide at a and w1 at b, shaded like a cylinder
  // lit from the upper left: a dark body, a lighter core pushed toward the light
  function limb(g, x0, y0, x1, y1, w0, w1, col, k){
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const quad = (a, b, o) => { g.beginPath(); g.moveTo(x0 + nx * (a + o), y0 + ny * (a + o)); g.lineTo(x1 + nx * (b + o), y1 + ny * (b + o)); g.lineTo(x1 - nx * (b - o), y1 - ny * (b - o)); g.lineTo(x0 - nx * (a - o), y0 - ny * (a - o)); g.closePath(); g.fill(); };
    g.fillStyle = shd(col, 0.34); quad(w0 / 2, w1 / 2, 0);
    g.beginPath(); g.arc(x1, y1, w1 / 2, 0, TAU); g.fill();
    const side = (nx * -0.6 + ny * -0.8) > 0 ? 1 : -1;      // which side of the limb faces the light
    g.fillStyle = rgb(col); quad(w0 * 0.36, w1 * 0.36, side * w0 * 0.1);
    g.fillStyle = lit(col, k === undefined ? 0.4 : k); quad(w0 * 0.16, w1 * 0.16, side * w0 * 0.2);
  }
  // sprinkle n dots inside a box (call inside a clip)
  function dots(g, R, n, x0, y0, x1, y1, r0, r1, col, a0, a1){
    g.fillStyle = col;
    for (let i = 0; i < n; i++){ g.globalAlpha = a0 + R() * (a1 - a0); g.beginPath(); g.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), r0 + R() * (r1 - r0), 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOUR — keyed looks, blended. The reef is painted once in daylight; a
  // look is only: the gradient laid over the frame (its two colours and how
  // strong), how strong and warm the sun's rays are, the moon's, and how much
  // of the night's own light shows.
  // ══════════════════════════════════════════════════════════════════════════
  const DAY_SEC = 240;
  const KEYS = [
    { at: 0.00, name: 'dawn',    ovT: '#FF9E86', ovB: '#2A3A8C', ovA: 0.30, ray: 0.6,  warm: 0.75, moon: 0,    glow: 0.12, day: 0.75 },
    { at: 0.10, name: 'morning', ovT: '#FFFFFF', ovB: '#2A5AA6', ovA: 0.00, ray: 1.0,  warm: 0.1,  moon: 0,    glow: 0,    day: 1 },
    { at: 0.30, name: 'noon',    ovT: '#FFFFFF', ovB: '#2A5AA6', ovA: 0.00, ray: 0.92, warm: 0,    moon: 0,    glow: 0,    day: 1 },
    { at: 0.50, name: 'golden',  ovT: '#FFB85E', ovB: '#3A4A9E', ovA: 0.2,  ray: 0.9,  warm: 0.85, moon: 0,    glow: 0,    day: 0.9 },
    { at: 0.64, name: 'sunset',  ovT: '#FF7648', ovB: '#22186A', ovA: 0.42, ray: 0.6,  warm: 1,    moon: 0,    glow: 0.25, day: 0.6 },
    { at: 0.74, name: 'dusk',    ovT: '#40368E', ovB: '#0A0E40', ovA: 0.58, ray: 0.1,  warm: 0.6,  moon: 0.3,  glow: 0.7,  day: 0.34 },
    { at: 0.84, name: 'night',   ovT: '#0C1850', ovB: '#03061E', ovA: 0.7,  ray: 0,    warm: 0,    moon: 0.6,  glow: 1,    day: 0.12 },
    { at: 0.95, name: 'night',   ovT: '#0C1850', ovB: '#03061E', ovA: 0.7,  ray: 0,    warm: 0,    moon: 0.6,  glow: 1,    day: 0.12 },
  ];
  const HOLD = 0.35;   // fraction of each gap held on the key before blending to the next
  function lookAt(tod){
    tod = ((tod % 1) + 1) % 1;
    let i = KEYS.length - 1;
    for (let k = 0; k < KEYS.length; k++) if (KEYS[k].at <= tod) i = k;
    const A = KEYS[i], B = KEYS[(i + 1) % KEYS.length];
    const span = ((B.at - A.at) + 1) % 1 || 1;
    const w = smooth(clamp01(((tod - A.at) / span - HOLD) / (1 - HOLD)));
    const o = { name: w < 0.5 ? A.name : B.name };
    for (const k in A){ if (k === 'at' || k === 'name') continue; const a = A[k], b = B[k]; o[k] = typeof a === 'number' ? lerp(a, b, w) : mixc(a, b, w); }
    return o;
  }
  const noop = function(){};

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.reef4 = {
    skin: 'reef',
    aids: 'reef',
    preload(){ loadRigs(noop); needRumi(noop); },
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0, warmTs = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: false });
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov,#settings-ov,#parent-ov';
      const TX = textures();

      // ── the stage ──
      // RESPONSIVE: the design height is fixed at 900, the design WIDTH follows
      // the window's aspect (1600 on 16:9, ~1200 on a landscape tablet, ~675
      // portrait, ~415 phone); AX() keeps left things at the left edge, right
      // things at the right, and compresses the middle. Below DW 1000 layout()
      // re-composes by hand. The backing store is capped (1.5× and 2.4 MP; less
      // on touch devices): this scene's cost is pixels filled.
      const DW0 = 1600, DH = 900, SAND = 800;
      let DW = DW0, AXK = 1, layoutDW = -1, narrow = false;
      const AX = x => x < 640 ? x * AXK : x >= 1000 ? DW - (DW0 - x) * AXK : DW / 2 + (x - 800) * AXK;
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, IS_TOUCH ? 1.25 : 1.5, Math.sqrt((IS_TOUCH ? 2.0e6 : 2.4e6) / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0, LD = 1;        // LD = layer pixels per design unit
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0, bakes: 0, blits: 0, live: 0, cast: 0, fx: 0, area: 0, screens: 0, bakeMs: 0 };
      let Q = IS_TOUCH ? 1 : 2, qPin = null, qBadSince = 0, qGoodSince = 0, qClimbs = 0;
      let tod = 0.13, todSpeed = 1, todTween = null;        // boot: a bright morning
      let L = lookAt(tod), lookKey = -1;

      const SPR = {};
      const SPR_COL = { white: '255,255,255', warm: '255,226,170', aqua: '150,240,255', pink: '255,150,210', gold: '255,214,120', green: '170,255,190', blue: '150,190,255', ink: '40,30,70' };
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = mkCanvas(96, 96), g = cv.getContext('2d'), col = SPR_COL[name] || name;
        g.fillStyle = rg(g, 48, 48, 0, 48, [[0, 'rgba(' + col + ',1)'], [0.3, 'rgba(' + col + ',0.4)'], [1, 'rgba(' + col + ',0)']]);
        g.fillRect(0, 0, 96, 96);
        return (SPR[name] = cv);
      }
      const glow = (g, name, x, y, r, a) => { if (a <= 0.004) return; g.globalAlpha = a > 1 ? 1 : a; g.drawImage(sprite(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
      function makeLayer(w, h, dpr, opaque){
        const cv = mkCanvas(w * dpr, h * dpr);
        const cx = cv.getContext('2d', opaque ? { alpha: false } : undefined); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h, dpr };
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE LAYOUT
      // ══════════════════════════════════════════════════════════════════════
      // two reef masses frame an open channel of sand: a tall coral BOMMIE on
      // the left, a PINNACLE with a swim-through on the right. Each is a height
      // profile (how far its top stands above the sand) over its own width.
      const LEFT = { x0: -30, x1: 520, k: 1 }, RIGHT = { x0: 1080, x1: 1630, k: 1 };
      const prof = P => u => { u = clamp01(u); for (let i = 1; i < P.length; i++) if (u <= P[i][0]){ const a = P[i - 1], b = P[i]; return lerp(a[1], b[1], smooth((u - a[0]) / (b[0] - a[0]))); } return P[P.length - 1][1]; };
      const LEFT_H = prof([[0, 400], [0.16, 452], [0.34, 470], [0.5, 392], [0.66, 318], [0.8, 200], [0.92, 86], [1, 0]]);
      const RIGHT_H = prof([[0, 0], [0.1, 120], [0.22, 250], [0.38, 356], [0.56, 512], [0.74, 548], [0.9, 492], [1, 470]]);
      const leftY = x => SAND - LEFT_H((x - LEFT.x0) / (LEFT.x1 - LEFT.x0)) * LEFT.k - 14 * noise1(x * 0.02 + 3);
      const rightY = x => SAND - RIGHT_H((x - RIGHT.x0) / (RIGHT.x1 - RIGHT.x0)) * RIGHT.k - 14 * noise1(x * 0.02 + 9);
      const SUN = { x: 0, y: -70 };                           // where the light comes from (above the surface, left of centre)
      let CS = 1;                                             // the cast's scale
      function layoutBase(){
        layoutDW = DW; narrow = DW < 1000;
        CS = clamp(DW / 1000, 0.62, 1);
        if (narrow){ LEFT.x0 = -20; LEFT.x1 = DW * 0.5; LEFT.k = 0.5; RIGHT.x0 = DW * 0.56; RIGHT.x1 = DW + 24; RIGHT.k = 0.52; }
        else { LEFT.x0 = -30; LEFT.x1 = Math.max(400, 520 * AXK); LEFT.k = 1; RIGHT.x0 = DW - Math.max(430, 550 * AXK); RIGHT.x1 = DW + 30; RIGHT.k = 1; }
        SUN.x = DW * (narrow ? 0.3 : 0.24);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE WATER — deep blue under a bright skin, the sun's bloom, long rays
      // ══════════════════════════════════════════════════════════════════════
      const WATER = [[0, '#9BEBFA'], [0.05, '#4FC9EE'], [0.2, '#1E9BDA'], [0.45, '#1273C0'], [0.72, '#0B4F9E'], [1, '#093A82']];
      const waterAt = y => { const u = clamp01(y / DH); for (let i = 1; i < WATER.length; i++) if (u <= WATER[i][0]) return mixc(WATER[i - 1][1], WATER[i][1], (u - WATER[i - 1][0]) / (WATER[i][0] - WATER[i - 1][0])); return hexc(WATER[WATER.length - 1][1]); };
      // a fan of soft rays from the sun into a layer (white on clear); softened afterwards
      function rayFan(g, w, h, sx, sy, R, n, len, a0){
        for (let i = 0; i < n; i++){
          const a = 0.5 + (i + R() * 0.8) / n * 1.7, wd = 0.012 + R() * R() * 0.07, l = len * (0.6 + R() * 0.5), al = a0 * (0.35 + R() * 0.65);
          const ex = sx + Math.cos(a) * l, ey = sy + Math.sin(a) * l;
          g.fillStyle = lg(g, sx, sy, ex, ey, [[0, 'rgba(255,255,255,' + al + ')'], [0.35, 'rgba(255,255,255,' + al * 0.6 + ')'], [1, 'rgba(255,255,255,0)']]);
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - wd) * l, sy + Math.sin(a - wd) * l); g.lineTo(sx + Math.cos(a + wd) * l, sy + Math.sin(a + wd) * l); g.closePath(); g.fill();
        }
      }
      function paintWater(g){
        g.fillStyle = lg(g, 0, 0, 0, DH, WATER.map(s => [s[0], s[1]])); g.fillRect(0, 0, DW, DH);
        // the water is not one flat sheet of colour: slow clouds of lighter and deeper blue
        g.save(); g.beginPath(); g.rect(0, 0, DW, DH); g.clip(); texture(g, TX.noise, 'soft-light', 0.5, 5.5, 0, 0, DW, DH); g.restore();
        // the sun: a wide bloom through the surface, a brighter heart
        g.fillStyle = rg(g, SUN.x, SUN.y, 30, 880, [[0, 'rgba(255,255,244,0.95)'], [0.16, 'rgba(214,250,255,0.62)'], [0.45, 'rgba(120,214,246,0.26)'], [1, 'rgba(60,160,230,0)']]);
        g.fillRect(0, 0, DW, DH);
        // long rays, painted into their own layer, softened, laid over in screen
        const rl = mkCanvas(DW * 0.25, DH * 0.25), gr = rl.getContext('2d'), R = makeRng(71);
        gr.scale(0.25, 0.25); rayFan(gr, DW, DH, SUN.x, SUN.y, R, 26, 1150, 0.55);
        g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.7; g.imageSmoothingQuality = 'high'; g.drawImage(softCopy(rl, 2.2), 0, 0, DW, DH); g.restore();
        // the skin of the sea: a bright band, wavelets catching the sun, their shadows
        g.fillStyle = lg(g, 0, 0, 0, 90, [[0, 'rgba(236,255,255,0.75)'], [0.4, 'rgba(190,244,255,0.25)'], [1, 'rgba(160,230,255,0)']]); g.fillRect(0, 0, DW, 90);
        const r = makeRng(17); g.lineCap = 'round';
        for (let i = 0, n = Math.round(DW / 9); i < n; i++){
          const x = r() * DW, d = r() * r(), y = 2 + d * 58, w = (14 + r() * 46) * (1 - d * 0.5), near = 1 - Math.min(1, Math.abs(x - SUN.x) / (DW * 0.6));
          g.strokeStyle = r() < 0.72 ? 'rgba(255,255,255,' + (0.2 + 0.6 * near * (1 - d)) + ')' : 'rgba(20,110,180,' + (0.12 + 0.2 * (1 - d)) + ')';
          g.lineWidth = (1 + r() * 2.6) * (1 - d * 0.6);
          g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.3, y + 3 + r() * 3, x, y + 1); g.quadraticCurveTo(x + w * 0.4, y - 2, x + w, y + 1.5); g.stroke();
        }
        // depth: the far water darkens toward the bottom corners
        g.fillStyle = rg(g, DW * 0.5, DH * 0.2, DH * 0.3, Math.max(DW, DH) * 0.85, [[0, 'rgba(6,30,90,0)'], [1, 'rgba(6,24,84,0.36)']]); g.fillRect(0, 0, DW, DH);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE ROCK — reef limestone: piles of lumpy boulders, each lit from above,
      // grained, pitted, crusted with colour
      // ══════════════════════════════════════════════════════════════════════
      // painters take a bundle B = { g: the picture, e: the night's own light
      // (emissive, may be null), m: where moving light may fall (mask, may be null) }
      const SUNLIT = [255, 240, 206];
      const ROCK_TONES = ['#7C6A58', '#6A5E66', '#86705A', '#5E5462', '#8E7A60', '#74665E', '#6E6A52'];
      const CRUSTS = ['#C97F9E', '#A988C8', '#D58A4A', '#D6B552', '#B85C62', '#7FA066', '#5EA69C', '#D79AB6', '#9FB25E', '#8E7CB4'];
      function crust(g, R, x, y, rx, ry){                      // a splash of living colour on the rock: coralline algae, a sponge, turf
        const col = CRUSTS[Math.floor(R() * CRUSTS.length)];
        for (let k = 0, n = 3 + Math.floor(R() * 4); k < n; k++){   // a few overlapping lobes make one ragged patch
          const px = x + (R() - 0.5) * rx * 1.5, py = y + (R() - 0.5) * ry * 1.3, qx = rx * (0.35 + R() * 0.6), qy = ry * (0.35 + R() * 0.6), P = blobPts(px, py, qx, qy, R, 0.42, 9);
          smoothClosed(g, P); g.fillStyle = lg(g, px - qx, py - qy, px + qx, py + qy, [[0, lit(col, 0.3)], [0.6, rgb(col)], [1, shd(col, 0.35)]]); g.globalAlpha = 0.5 + R() * 0.3; g.fill();
        }
        g.globalAlpha = 1;
        dots(g, R, Math.round(rx * ry / 10), x - rx, y - ry, x + rx, y + ry, 0.5, 1.5, lit(col, 0.55), 0.25, 0.7);
      }
      function boulder(B, x, y, rx, ry, R, far){
        const g = B.g, tone = ROCK_TONES[Math.floor(R() * ROCK_TONES.length)], P = blobPts(x, y, rx, ry, R, 0.26, 12, true);
        softEllipse(g, x + rx * 0.1, y + ry * 0.55, rx * 1.25, ry * 0.8, [10, 16, 52], 0.5);                 // the hollow it leaves behind and below
        smoothClosed(g, P);
        // a lit cap, a body that turns from the light, a deep underside
        g.fillStyle = lg(g, x - rx * 0.3, y - ry, x + rx * 0.2, y + ry, [[0, rgb(mixc(tone, SUNLIT, 0.46))], [0.2, rgb(mixc(tone, SUNLIT, 0.16))], [0.42, rgb(tone)], [0.72, shd(tone, 0.55)], [1, shd(tone, 0.84)]]);
        g.fill();
        g.save(); g.clip();
        texture(g, TX.noise, 'soft-light', 0.8, 0.5 + R() * 0.5, x - rx * 1.3, y - ry * 1.3, rx * 2.6, ry * 2.6);      // big soft blotches
        texture(g, TX.grain, 'soft-light', 0.4, 0.8, x - rx * 1.3, y - ry * 1.3, rx * 2.6, ry * 2.6);                  // grain
        const n = Math.round(rx * ry / 150);                   // pits and pocks
        for (let i = 0; i < n; i++){
          const px = x + (R() - 0.5) * rx * 1.8, py = y + (R() - 0.5) * ry * 1.7, pr = 1.2 + R() * R() * 5;
          g.fillStyle = shd(tone, 0.7); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(px, py, pr, pr * 0.7, 0, 0, TAU); g.fill();
          g.fillStyle = lit(tone, 0.4); g.globalAlpha = 0.25; g.beginPath(); g.ellipse(px + pr * 0.3, py + pr * 0.5, pr * 0.9, pr * 0.3, 0, 0, TAU); g.fill();
        }
        g.globalAlpha = 0.45; g.strokeStyle = shd(tone, 0.8); g.lineCap = 'round';
        for (let i = 0; i < 2 + Math.round(rx / 40); i++){     // cracks
          const cx = x + (R() - 0.5) * rx * 1.4, cy = y + (R() - 0.4) * ry * 1.1, len = rx * (0.3 + R() * 0.5), a = R() * 1.2 - 0.6 + (R() < 0.5 ? 0 : 1.57);
          g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * len * 0.5 + (R() - 0.5) * 12, cy + Math.sin(a) * len * 0.5 + (R() - 0.5) * 12, cx + Math.cos(a) * len, cy + Math.sin(a) * len); g.stroke();
        }
        g.globalAlpha = 1;
        if (!far) for (let i = 0, k = Math.round(R() * 2.6 + rx / 60); i < k; i++){ const u = R() * 2 - 1, v = R() * 1.2 - 0.9; crust(g, R, x + u * rx * 0.8, y + v * ry * 0.7, 10 + R() * rx * 0.4, 6 + R() * ry * 0.3); }
        // the sun pools on its upper left shoulder; a cold glimmer from the open water low on one side
        softEllipse(g, x - rx * 0.3, y - ry * 0.72, rx * 0.8, ry * 0.42, SUNLIT, 0.26);
        softEllipse(g, x + rx * 0.72, y + ry * 0.1, rx * 0.36, ry * 0.5, [60, 140, 220], 0.14);
        g.restore();
        if (B.m){ smoothClosed(B.m, P); B.m.fillStyle = lg(B.m, 0, y - ry, 0, y + ry, [[0, 'rgba(255,255,255,0.7)'], [0.35, 'rgba(255,255,255,0.3)'], [0.8, 'rgba(255,255,255,0)']]); B.m.fill(); }
      }
      // a reef mass under a top profile fy(x): boulders scattered through it, a row
      // along the crest; returns them (y-sorted by the caller with everything else)
      function rockMass(x0, x1, fy, seed, size){
        const R = makeRng(seed), out = [];
        for (let x = x0; x <= x1; x += size * 0.7){
          const top = fy(x); if (top > SAND - 12) continue;
          for (let y = top, row = 0; y < SAND + 60; y += size * 0.62, row++){
            const xx = x + (R() - 0.5) * size * 0.7, yy0 = fy(xx); if (yy0 > SAND - 6) continue;
            const rx = size * (0.66 + R() * 0.6) * (row ? 1 + Math.min(0.5, row * 0.08) : 0.9), ry = rx * (0.55 + R() * 0.26);
            out.push({ k: 'rock', x: xx, y: Math.max(yy0 + ry * 0.72, y + ry * 0.7 + (R() - 0.5) * size * 0.3), rx, ry, seed: 1 + Math.floor(R() * 1e9) });
          }
        }
        return out;
      }
      // the hollows between boulders: a dark heart painted first, a little inside the pile's outline
      function rockBacking(g, items){
        g.fillStyle = '#1E2042';
        for (const it of items){ g.beginPath(); g.ellipse(it.x, it.y + it.ry * 0.2, it.rx * 0.96, it.ry * 0.96, 0, 0, TAU); g.fill(); }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE CORALS — every colony painted with form: a base that turns from
      // the light, its own surface (grooves, polyps, ribs), a highlight, a
      // contact shadow. Each stands on (0, 0) and is about 130 wide at s = 1.
      // ══════════════════════════════════════════════════════════════════════
      const COR = { gold: '#C9A44A', olive: '#8FA85A', green: '#5FA873', teal: '#3E9E96', blue: '#5A7FD6', violet: '#8A68C8', magenta: '#C85A9E', pink: '#E07A9A',
                    salmon: '#E8846A', orange: '#E89044', red: '#D0504E', cream: '#E6D2A8', brown: '#9A6E52', lavender: '#B49AE0', yellow: '#E6C84A', rose: '#F0A0B8' };
      const NEON = ['#5CFFB0', '#5CE8FF', '#FF6AD8', '#FFB05C', '#B48CFF', '#F6FF6A'];
      const neonOf = col => { const c = hexc(col), i = (c[0] > c[2] ? (c[1] > c[0] * 0.75 ? 5 : c[1] > c[2] ? 3 : 2) : (c[1] > c[0] ? (c[2] > c[1] ? 1 : 0) : 4)); return NEON[i]; };
      // the night's own light: a soft body and bright specks, into the emissive layer
      function emitDots(e, R, n, x0, y0, x1, y1, col, r){
        if (!e) return;
        e.fillStyle = col;
        for (let i = 0; i < n; i++){ e.globalAlpha = 0.5 + R() * 0.5; e.beginPath(); e.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), (r || 1.6) * (0.6 + R() * 0.8), 0, TAU); e.fill(); }
        e.globalAlpha = 1;
      }
      const maskFill = (m, top, bot) => { if (!m) return; m.fillStyle = lg(m, 0, top, 0, bot, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0.08)']]); m.fill(); };
      function open3(B, x, y, s){ for (const c of [B.g, B.e, B.m]) if (c){ c.save(); c.translate(x, y); c.scale(s, s); } }
      function close3(B){ for (const c of [B.g, B.e, B.m]) if (c) c.restore(); }

      // BRAIN CORAL: a dome scored with meandering valleys; a christmas-tree worm or two
      function cBrain(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 6, 2, 84, 17, [10, 16, 52], 0.55);
        const dome = c => { c.beginPath(); c.moveTo(-68, 2); c.bezierCurveTo(-74, -44, -40, -66, 0, -64); c.bezierCurveTo(42, -66, 76, -40, 68, 2); c.closePath(); };
        dome(g); g.fillStyle = rg(g, -24, -46, 6, 104, [[0, lit(col, 0.5)], [0.42, rgb(col)], [1, shd(col, 0.62)]]); g.fill();
        g.save(); g.clip(); g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 0; i < 13; i++){                          // the valleys: each row wanders, breaks, doubles back
          const y0 = 0 - i * 5.4, ph = R() * 6;
          const pts = []; for (let xx = -74; xx <= 74; xx += 5) pts.push([xx, y0 - (1 - xx * xx / 5500) * (6 + i * 0.5) + Math.sin(xx * 0.33 + ph) * 2.4 + Math.sin(xx * 0.12 + ph * 2) * 2.8]);
          g.strokeStyle = shd(col, 0.5); g.globalAlpha = 0.55; g.lineWidth = 2.1; smoothOpen(g, pts); g.stroke();
          g.translate(0, -1.7); g.strokeStyle = lit(col, 0.6); g.globalAlpha = 0.42; g.lineWidth = 1.1; smoothOpen(g, pts); g.stroke(); g.translate(0, 1.7);
        }
        g.globalAlpha = 0.4; g.strokeStyle = shd(col, 0.46); g.lineWidth = 1.8;
        for (let i = 0; i < 34; i++){ const cx = -62 + R() * 124, cy = -6 - R() * 54, a = R() * TAU; g.beginPath(); g.arc(cx, cy, 2.6 + R() * 2.4, a, a + 2.4 + R() * 1.6); g.stroke(); }   // the turns between rows
        g.globalAlpha = 1;
        texture(g, TX.grain, 'soft-light', 0.5, 0.6, -80, -70, 160, 76);
        softEllipse(g, -26, -44, 36, 15, LIGHT, 0.38);
        g.fillStyle = lg(g, 0, -20, 0, 4, [[0, rgb(SHADE, 0)], [1, rgb(SHADE, 0.5)]]); g.fillRect(-80, -20, 160, 26);
        g.restore();
        for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++){   // christmas-tree worms: two little spirals each
          const wx = -44 + R() * 88, wy = -22 - R() * 34, wc = [COR.yellow, COR.blue, COR.red, '#FFFFFF', COR.orange][Math.floor(R() * 5)];
          for (const d of [-3.2, 3.2]) for (let k = 0; k < 4; k++){ g.fillStyle = k % 2 ? lit(wc, 0.4) : rgb(wc); g.beginPath(); g.ellipse(wx + d, wy - k * 2.6, 4.4 - k * 0.95, 1.9, 0, 0, TAU); g.fill(); }
          if (B.e){ B.e.fillStyle = neonOf(wc); B.e.beginPath(); B.e.arc(wx, wy - 4, 5, 0, TAU); B.e.fill(); }
        }
        if (B.e){ dome(B.e); B.e.fillStyle = rgb(hexc(neonOf(col)), 0.088); B.e.fill(); emitDots(B.e, R, 40, -58, -56, 58, -4, neonOf(col), 1.5); }
        if (B.m){ dome(B.m); maskFill(B.m, -64, 2); }
        close3(B);
      }
      // TABLE CORAL: a plate of fine branchlets on a short stalk, seen a little from above
      function cTable(B, x, y, s, col, R, tip){
        const g = B.g; tip = tip || COR.lavender; open3(B, x, y, s);
        softEllipse(g, 8, 2, 70, 13, [10, 16, 52], 0.5);
        g.fillStyle = lg(g, -16, 0, 16, 0, [[0, lit(col, 0.2)], [0.5, rgb(col)], [1, shd(col, 0.6)]]);
        g.beginPath(); g.moveTo(-26, 2); g.bezierCurveTo(-20, -18, -34, -38, -52, -50); g.lineTo(50, -50); g.bezierCurveTo(26, -38, 16, -18, 24, 2); g.closePath(); g.fill();
        softEllipse(g, 0, -40, 96, 22, [10, 16, 52], 0.5);     // the plate's own shadow on its stalk
        const plate = (c, yy) => { c.beginPath(); c.ellipse(0, yy, 96, 25, 0, 0, TAU); };
        plate(g, -50); g.fillStyle = shd(col, 0.68); g.fill();                                                    // the underside
        plate(g, -55); g.fillStyle = rg(g, -30, -64, 6, 112, [[0, lit(col, 0.46)], [0.5, rgb(col)], [1, shd(col, 0.4)]]); g.fill();
        g.save(); g.clip();
        for (let i = 0; i < 1300; i++){                        // the surface: a carpet of tiny branchlets, paler toward the rim
          const a = R() * TAU, d = Math.sqrt(R()), px = Math.cos(a) * 92 * d, py = -55 + Math.sin(a) * 22.5 * d, edge = d > 0.72;
          g.fillStyle = edge && R() < 0.7 ? lit(tip, 0.1 + R() * 0.3) : (R() < 0.55 ? lit(col, 0.3 + R() * 0.2) : shd(col, 0.26)); g.globalAlpha = 0.5 + R() * 0.4;
          g.beginPath(); g.ellipse(px, py, 0.9 + R() * 0.9, 0.7 + R() * 0.5, 0, 0, TAU); g.fill();
        }
        g.globalAlpha = 1; softEllipse(g, -34, -62, 50, 10, LIGHT, 0.36); g.restore();
        g.lineCap = 'round';
        for (let i = 0; i < 70; i++){                          // the rim: little fingers reaching out, pale at their tips
          const a = 0.06 + i / 69 * (Math.PI - 0.12), px = Math.cos(a) * 95, py = -54 + Math.sin(a) * 25, len = 4 + R() * 5;
          g.strokeStyle = shd(col, 0.2); g.lineWidth = 2.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len * 0.5 + 1.5); g.stroke();
          g.fillStyle = lit(tip, 0.3); g.beginPath(); g.arc(px + Math.cos(a) * len, py + Math.sin(a) * len * 0.5 + 1.5, 1.2, 0, TAU); g.fill();
        }
        if (B.e){ plate(B.e, -55); B.e.fillStyle = rgb(hexc(neonOf(tip)), 0.072); B.e.fill(); for (let i = 0; i < 34; i++){ const a = R() * TAU, d = 0.7 + R() * 0.3; B.e.fillStyle = neonOf(tip); B.e.globalAlpha = 0.5 + R() * 0.5; B.e.beginPath(); B.e.arc(Math.cos(a) * 94 * d, -55 + Math.sin(a) * 24 * d, 1.6, 0, TAU); B.e.fill(); } B.e.globalAlpha = 1; }
        if (B.m){ plate(B.m, -55); B.m.fillStyle = 'rgba(255,255,255,0.95)'; B.m.fill(); }
        close3(B);
      }
      // STAGHORN: a thicket of branching antlers, round in section, pale at the growing tips
      function cStag(B, x, y, s, col, R, tip){
        const g = B.g; tip = tip || '#EAF2FF'; open3(B, x, y, s);
        softEllipse(g, 6, 2, 74, 14, [10, 16, 52], 0.5);
        const tips = [];
        const grow = (x0, y0, a, len, w, d) => {
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          limb(g, x0, y0, x1, y1, w, w * 0.74, col, 0.44);
          if (d > 0){ const n = d > 1 && R() < 0.35 ? 3 : 2; for (let i = 0; i < n; i++) grow(x1, y1, a + (i - (n - 1) / 2) * (0.62 + R() * 0.3) + (R() - 0.5) * 0.2, len * (0.66 + R() * 0.2), w * 0.74, d - 1); }
          else tips.push([x1, y1, w * 0.74]);
        };
        g.fillStyle = shd(col, 0.5); g.beginPath(); g.ellipse(0, 0, 34, 10, 0, Math.PI, TAU); g.fill();
        for (const a of [-2.42, -2.0, -1.57, -1.14, -0.72]) grow((a + 1.57) * 16, -3, a + (R() - 0.5) * 0.16, 34 + R() * 10, 12, 3);
        for (const tp of tips){ g.fillStyle = lit(tip, 0.1); g.beginPath(); g.arc(tp[0], tp[1], tp[2] * 0.5, 0, TAU); g.fill();
          if (B.e){ B.e.fillStyle = neonOf(tip === '#EAF2FF' ? col : tip); B.e.beginPath(); B.e.arc(tp[0], tp[1], tp[2] * 0.7, 0, TAU); B.e.fill(); }
          if (B.m){ B.m.fillStyle = 'rgba(255,255,255,0.8)'; B.m.beginPath(); B.m.arc(tp[0], tp[1], tp[2] * 1.4, 0, TAU); B.m.fill(); } }
        close3(B);
      }

      // PLATE CORAL: wavy shelves stacked up a slope, each lit on top, dark beneath
      function cPlate(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 6, 2, 80, 15, [10, 16, 52], 0.5);
        for (let i = 0, n = 5; i < n; i++){
          const k = i / (n - 1), w = 78 - k * 30 + R() * 10, cx = (R() - 0.5) * 30, cy = -6 - i * 19, wav = 5 + R() * 4, ph = R() * 6;
          softEllipse(g, cx + 4, cy + 12, w * 0.9, 10, [10, 16, 52], 0.4);
          const shelf = (c, dy, th) => { c.beginPath();
            for (let j = 0; j <= 40; j++){ const a = j / 40 * TAU, sn = Math.sin(a), rr = 1 + Math.sin(a * 7 + ph) * 0.05 * (sn > 0 ? 1 : 0.3), xx = cx + Math.cos(a) * w * rr, yy = cy + dy + sn * (sn > 0 ? th : 5) * rr; if (j) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
            c.closePath(); };
          shelf(g, 5, 15); g.fillStyle = shd(col, 0.62); g.fill();                                                // its thick underside
          shelf(g, 0, 11); g.fillStyle = lg(g, cx - w, cy - 6, cx + w, cy + 12, [[0, lit(col, 0.44)], [0.5, rgb(col)], [1, shd(col, 0.3)]]); g.fill();
          g.save(); g.clip();
          g.strokeStyle = lit(col, 0.5); g.globalAlpha = 0.4; g.lineWidth = 1;                                    // growth lines
          for (let j = 1; j < 5; j++){ g.beginPath(); g.ellipse(cx, cy - 4, w * j / 5, 14 * j / 5 + 2, 0, 0.1, Math.PI - 0.1); g.stroke(); }
          g.globalAlpha = 1; dots(g, R, 50, cx - w, cy - 6, cx + w, cy + 14, 0.5, 1.3, lit(col, 0.6), 0.3, 0.7);
          softEllipse(g, cx - w * 0.3, cy - 1, w * 0.5, 5, LIGHT, 0.34);
          g.restore();
          g.strokeStyle = lit(col, 0.62); g.lineWidth = 1.6; g.globalAlpha = 0.7; shelf(g, 0, 11); g.stroke(); g.globalAlpha = 1;     // the pale growing edge
          if (B.e){ shelf(B.e, 0, 11); B.e.strokeStyle = rgb(hexc(neonOf(col)), 0.26); B.e.lineWidth = 1.2; B.e.stroke(); B.e.fillStyle = rgb(hexc(neonOf(col)), 0.056); B.e.fill(); }
          if (B.m){ shelf(B.m, 0, 11); B.m.fillStyle = 'rgba(255,255,255,0.9)'; B.m.fill(); }
        }
        close3(B);
      }
      // TUBE SPONGES: a cluster of open pipes, ribbed, dark inside, pale at the lip
      function cTube(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 6, 2, 62, 13, [10, 16, 52], 0.5);
        const tubes = [[-34, 58, 13, -0.16], [-10, 96, 16, -0.04], [18, 74, 15, 0.08], [40, 50, 12, 0.2], [2, 44, 13, 0.02]].sort((a, b) => b[1] - a[1]);
        for (const tb of tubes){
          const tx = tb[0] + (R() - 0.5) * 6, h = tb[1] * (0.85 + R() * 0.3), r = tb[2];
          g.save(); g.translate(tx, 0); g.rotate(tb[3]);
          const tube = c => { c.beginPath(); c.moveTo(-r * 0.86, 2); c.bezierCurveTo(-r * 1.05, -h * 0.5, -r * 0.9, -h * 0.9, -r, -h); c.lineTo(r, -h); c.bezierCurveTo(r * 0.9, -h * 0.9, r * 1.05, -h * 0.5, r * 0.86, 2); c.closePath(); };
          tube(g); g.fillStyle = lg(g, -r, 0, r, 0, [[0, lit(col, 0.36)], [0.3, rgb(col)], [0.72, shd(col, 0.36)], [1, shd(col, 0.62)]]); g.fill();
          g.save(); g.clip();
          g.strokeStyle = shd(col, 0.5); g.globalAlpha = 0.3; g.lineWidth = 1.2; for (let j = -3; j <= 3; j++){ g.beginPath(); g.moveTo(j * r * 0.26, 0); g.quadraticCurveTo(j * r * 0.3, -h * 0.5, j * r * 0.26, -h); g.stroke(); }   // ribs
          g.globalAlpha = 1; dots(g, R, Math.round(h * r / 22), -r, -h, r, 0, 0.6, 1.5, shd(col, 0.55), 0.25, 0.6);                                                                          // pores
          g.fillStyle = lg(g, 0, -h * 0.4, 0, 2, [[0, rgb(SHADE, 0)], [1, rgb(SHADE, 0.5)]]); g.fillRect(-r * 1.2, -h * 0.4, r * 2.4, h * 0.4 + 2);
          g.restore();
          g.fillStyle = lit(col, 0.5); g.beginPath(); g.ellipse(0, -h, r, r * 0.4, 0, 0, TAU); g.fill();            // the lip
          g.fillStyle = rg(g, 0, -h + 2, 1, r * 0.8, [[0, '#101636'], [1, shd(col, 0.75)]]); g.beginPath(); g.ellipse(0, -h + 1.2, r * 0.72, r * 0.27, 0, 0, TAU); g.fill();
          if (B.e){ B.e.save(); B.e.translate(tx, 0); B.e.rotate(tb[3]); B.e.strokeStyle = rgb(hexc(neonOf(col)), 0.4); B.e.lineWidth = 1.2; B.e.beginPath(); B.e.ellipse(0, -h, r, r * 0.4, 0, 0, TAU); B.e.stroke(); tube(B.e); B.e.fillStyle = rgb(hexc(neonOf(col)), 0.048); B.e.fill(); B.e.restore(); }
          if (B.m){ B.m.save(); B.m.translate(tx, 0); B.m.rotate(tb[3]); tube(B.m); maskFill(B.m, -h, 0); B.m.restore(); }
          g.restore();
        }
        close3(B);
      }
      // BARREL SPONGE: a great ribbed vase with a dark mouth
      function cBarrel(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 8, 2, 78, 16, [10, 16, 52], 0.55);
        const body = c => { c.beginPath(); c.moveTo(-40, 2); c.bezierCurveTo(-74, -30, -70, -86, -50, -112); c.lineTo(50, -112); c.bezierCurveTo(70, -86, 74, -30, 40, 2); c.closePath(); };
        body(g); g.fillStyle = lg(g, -66, 0, 66, 0, [[0, lit(col, 0.34)], [0.3, rgb(col)], [0.7, shd(col, 0.4)], [1, shd(col, 0.7)]]); g.fill();
        g.save(); g.clip();
        for (let j = -6; j <= 6; j++){                         // deep ribs running up the barrel
          const u = j / 6.5, bx = u * 44, mx = u * 70, tx = u * 50;
          g.strokeStyle = shd(col, 0.66); g.globalAlpha = 0.5; g.lineWidth = 3.4; g.beginPath(); g.moveTo(bx, 2); g.bezierCurveTo(mx, -30, mx * 1.02, -86, tx, -112); g.stroke();
          g.strokeStyle = lit(col, 0.5); g.globalAlpha = 0.34; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx - 3, 2); g.bezierCurveTo(mx - 3.4, -30, mx * 1.02 - 3.4, -86, tx - 3, -112); g.stroke();
        }
        g.globalAlpha = 1; texture(g, TX.grain, 'soft-light', 0.6, 0.7, -80, -116, 160, 120);
        softEllipse(g, -34, -74, 22, 44, LIGHT, 0.26);
        g.fillStyle = lg(g, 0, -34, 0, 2, [[0, rgb(SHADE, 0)], [1, rgb(SHADE, 0.55)]]); g.fillRect(-80, -34, 160, 36);
        g.restore();
        g.fillStyle = lit(col, 0.42); g.beginPath(); g.ellipse(0, -112, 50, 15, 0, 0, TAU); g.fill();
        g.fillStyle = rg(g, 6, -108, 2, 44, [[0, '#0C1230'], [0.8, shd(col, 0.72)], [1, shd(col, 0.4)]]); g.beginPath(); g.ellipse(0, -110.5, 41, 11, 0, 0, TAU); g.fill();
        if (B.e){ B.e.strokeStyle = rgb(hexc(neonOf(col)), 0.34); B.e.lineWidth = 1.6; B.e.beginPath(); B.e.ellipse(0, -112, 50, 15, 0, 0, TAU); B.e.stroke(); body(B.e); B.e.fillStyle = rgb(hexc(neonOf(col)), 0.040); B.e.fill(); }
        if (B.m){ body(B.m); maskFill(B.m, -112, 2); }
        close3(B);
      }
      // BUBBLE CORAL: a heap of pearly beads, each with its own gleam
      function cBubble(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 4, 2, 62, 12, [10, 16, 52], 0.5);
        const beads = [];
        for (let i = 0; i < 46; i++){ const a = R() * Math.PI, d = Math.sqrt(R()), bx = Math.cos(a) * 54 * d, by = -Math.sin(a) * 44 * d - 4; beads.push([bx, by, 8 + R() * 6 - d * 2]); }
        beads.sort((p, q) => q[1] - p[1] ? p[1] - q[1] : 0);
        for (const b of beads){
          g.fillStyle = rg(g, b[0] - b[2] * 0.3, b[1] - b[2] * 0.35, b[2] * 0.1, b[2] * 1.1, [[0, lit(col, 0.7)], [0.5, rgb(col)], [1, shd(col, 0.55)]]);
          g.beginPath(); g.arc(b[0], b[1], b[2], 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(b[0] - b[2] * 0.3, b[1] - b[2] * 0.38, b[2] * 0.24, b[2] * 0.15, -0.6, 0, TAU); g.fill();
          if (B.e){ B.e.fillStyle = rgb(hexc(neonOf(col)), 0.200); B.e.beginPath(); B.e.arc(b[0], b[1], b[2] * 0.8, 0, TAU); B.e.fill(); }
          if (B.m){ B.m.fillStyle = 'rgba(255,255,255,0.7)'; B.m.beginPath(); B.m.arc(b[0], b[1], b[2], 0, TAU); B.m.fill(); }
        }
        close3(B);
      }
      // LEATHER (toadstool) CORAL: a stalk, a broad folded cap furred with tiny polyps
      function cMush(B, x, y, s, col, R){
        const g = B.g; open3(B, x, y, s);
        softEllipse(g, 6, 2, 60, 12, [10, 16, 52], 0.5);
        g.fillStyle = lg(g, -18, 0, 18, 0, [[0, lit(col, 0.3)], [0.5, rgb(col)], [1, shd(col, 0.6)]]);
        g.beginPath(); g.moveTo(-17, 2); g.bezierCurveTo(-12, -20, -16, -38, -22, -50); g.lineTo(22, -50); g.bezierCurveTo(16, -38, 12, -20, 17, 2); g.closePath(); g.fill();
        const cap = (c, dy) => { c.beginPath(); c.moveTo(-70, -48 + dy);
          for (let j = 0; j <= 14; j++){ const u = j / 14; c.lineTo(-70 + u * 140, -48 + dy - Math.sin(u * Math.PI) * 30 - Math.sin(u * 15) * 2.5); }
          for (let j = 14; j >= 0; j--){ const u = j / 14; c.lineTo(-70 + u * 140, -48 + dy + Math.sin(u * Math.PI) * 12 + Math.sin(u * 11 + 1) * 4); }
          c.closePath(); };
        softEllipse(g, 0, -38, 72, 14, [10, 16, 52], 0.5);
        cap(g, 5); g.fillStyle = shd(col, 0.6); g.fill();
        cap(g, 0); g.fillStyle = rg(g, -24, -70, 6, 100, [[0, lit(col, 0.5)], [0.5, rgb(col)], [1, shd(col, 0.36)]]); g.fill();
        g.save(); g.clip();
        g.strokeStyle = lit(col, 0.7); g.lineWidth = 1.1; g.lineCap = 'round';
        for (let i = 0; i < 230; i++){ const px = -68 + R() * 136, py = -80 + R() * 44; g.globalAlpha = 0.4 + R() * 0.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (R() - 0.5) * 2, py - 2.6 - R() * 2.4); g.stroke(); }   // the fur of polyps
        g.globalAlpha = 1; softEllipse(g, -26, -68, 34, 10, LIGHT, 0.34);
        g.restore();
        if (B.e){ cap(B.e, 0); B.e.fillStyle = rgb(hexc(neonOf(col)), 0.080); B.e.fill(); emitDots(B.e, R, 70, -64, -78, 64, -40, neonOf(col), 1.3); }
        if (B.m){ cap(B.m, 0); B.m.fillStyle = 'rgba(255,255,255,0.9)'; B.m.fill(); }
        close3(B);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SWAYING THINGS — painted once each (fine detail is free here), then
      // bent into 15 baked frames (swayBook); on screen a plant is one blit.
      // Painters draw in their own units with (0, 0) at the foot.
      // ══════════════════════════════════════════════════════════════════════
      const SWAY_SIZE = { fan: [300, 300], soft: [200, 230], whip: [190, 330], grass: [190, 190], anemB: [300, 170], anemF: [300, 170], plume: [170, 270] };
      const SWAY_AMP = { fan: 14, soft: 16, whip: 34, grass: 26, anemB: 16, anemF: 22, plume: 30 };
      const SWAY_COL = { fan: [[COR.red, COR.orange], [COR.violet, COR.lavender], [COR.yellow, COR.cream], [COR.magenta, COR.rose]],
                         soft: [[COR.pink, '#FFD9E6'], [COR.orange, '#FFE2C0'], [COR.violet, '#E9DCFF'], [COR.red, '#FFD0C8']],
                         anem: [['#F3E7C2', '#C96AD8', '#B24A8E'], ['#CFF0C4', '#F06AA0', '#8A4AB4'], ['#F6D9E2', '#6AC8E0', '#C45A6E']] };
      function paintSway(g, kind, c, R){
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (kind === 'fan'){                                  // a gorgonian: one plane of ever finer branches, a net between them, pale polyps
          const C = SWAY_COL.fan[c % 4], twigs = [];
          const grow = (x, y, a, len, w, d) => {
            const bend = (R() - 0.5) * 0.5, mx = x + Math.cos(a + bend) * len * 0.5, my = y + Math.sin(a + bend) * len * 0.5, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
            g.strokeStyle = d > 3 ? shd(C[0], 0.3) : d > 1 ? rgb(C[0]) : lit(C[1], 0.1); g.lineWidth = w;
            g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
            twigs.push([mx, my, ex, ey, d]);
            if (d > 0){
              const n = d > 2 ? 3 : 2;
              for (let i = 0; i < n; i++) grow(ex, ey, a + (i - (n - 1) / 2) * (0.5 + R() * 0.16) + (R() - 0.5) * 0.14, len * (0.7 + R() * 0.12), w * 0.66, d - 1);
              if (d > 1) grow(mx, my, a + (R() < 0.5 ? -1 : 1) * (0.7 + R() * 0.3), len * 0.6, w * 0.6, d - 2);
            }
          };
          g.strokeStyle = shd(C[0], 0.4); g.lineWidth = 11; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -34); g.stroke();
          for (const a of [-2.3, -1.92, -1.57, -1.22, -0.84]) grow(0, -30, a, 64, 7, 5);
          g.strokeStyle = lit(C[1], 0.05); g.globalAlpha = 0.3; g.lineWidth = 0.8;               // the fine net between neighbouring twigs
          for (let i = 0; i < twigs.length; i++){ const p = twigs[i]; for (let j = i + 1; j < Math.min(twigs.length, i + 30); j++){ const q = twigs[j], d2 = (p[2] - q[2]) * (p[2] - q[2]) + (p[3] - q[3]) * (p[3] - q[3]); if (d2 < 260 && d2 > 20){ g.beginPath(); g.moveTo(p[2], p[3]); g.lineTo(q[2], q[3]); g.stroke(); } } }
          g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,0.75)';
          for (const p of twigs) if (p[4] < 3 && R() < 0.6){ g.beginPath(); g.arc(p[0] + (R() - 0.5) * 3, p[1] + (R() - 0.5) * 3, 0.9, 0, TAU); g.fill(); }
        } else if (kind === 'soft'){                           // a soft coral tree: a glassy trunk, branches ending in spiky bunches
          const C = SWAY_COL.soft[c % 4];
          const trunk = (x0, y0, x1, y1, w) => { g.strokeStyle = rgb(mixc(C[0], [255, 240, 244], 0.7), 0.6); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (R() - 0.5) * 12, (y0 + y1) / 2, x1, y1); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(x0 - w * 0.2, y0); g.quadraticCurveTo((x0 + x1) / 2 - w * 0.2, (y0 + y1) / 2, x1 - w * 0.2, y1); g.stroke(); };
          trunk(0, 0, 0, -70, 20);
          const ends = [[-62, -122], [-34, -164], [0, -184], [36, -166], [64, -124], [-22, -112], [24, -110], [-66, -82], [66, -84], [-40, -58], [40, -60]];
          for (const e of ends) trunk((R() - 0.5) * 8, -52 - R() * 14, e[0] * 0.8, e[1] * 0.86, 8);
          for (const e of ends.concat([[0, -138], [-44, -142], [46, -144], [0, -84], [-20, -66], [22, -68]])){
            for (let k = 0; k < 9; k++){                       // a bunch: a few knobs, each a burst of spicules
              const bx = e[0] + (R() - 0.5) * 34, by = e[1] + (R() - 0.5) * 30, br = 8 + R() * 6;
              g.fillStyle = rg(g, bx - br * 0.3, by - br * 0.3, 1, br * 1.2, [[0, C[1]], [0.5, rgb(C[0])], [1, shd(C[0], 0.4)]]); g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
              g.strokeStyle = lit(C[0], 0.5); g.lineWidth = 1.1;
              for (let s = 0; s < 9; s++){ const a = R() * TAU; g.beginPath(); g.moveTo(bx + Math.cos(a) * br * 0.6, by + Math.sin(a) * br * 0.6); g.lineTo(bx + Math.cos(a) * br * 1.35, by + Math.sin(a) * br * 1.35); g.stroke(); }
            }
          }
        } else if (kind === 'whip'){                           // sea whips: long slender rods from one foot, dotted with polyps
          const col = [COR.red, COR.orange, COR.yellow, COR.magenta][c % 4];
          for (let i = 0; i < 9; i++){
            const lean = (i - 4) * 16 + (R() - 0.5) * 14, h = 200 + R() * 110, cx = lean * 0.3 + (R() - 0.5) * 20;
            g.strokeStyle = shd(col, 0.3); g.lineWidth = 5.4; g.beginPath(); g.moveTo((i - 4) * 4, 0); g.quadraticCurveTo(cx, -h * 0.55, lean, -h); g.stroke();
            g.strokeStyle = lit(col, 0.25); g.lineWidth = 2.2; g.beginPath(); g.moveTo((i - 4) * 4 - 1, 0); g.quadraticCurveTo(cx - 1, -h * 0.55, lean - 1, -h); g.stroke();
            g.fillStyle = 'rgba(255,246,230,0.8)';
            for (let k = 0; k < 16; k++){ const u = 0.12 + R() * 0.86, q = 1 - u, px = q * q * (i - 4) * 4 + 2 * q * u * cx + u * u * lean, py = 2 * q * u * (-h * 0.55) + u * u * -h; g.beginPath(); g.arc(px + (R() < 0.5 ? -3 : 3), py, 1.1, 0, TAU); g.fill(); }
          }
        } else if (kind === 'grass'){                          // seagrass: ribbons, each lit along one edge
          for (let i = 0; i < 17; i++){
            const x0 = -54 + i * 6.8 + (R() - 0.5) * 6, lean = (i - 8) * 5 + (R() - 0.5) * 26, h = 76 + R() * 96, w = 5 + R() * 3.4, tone = R();
            const colA = tone < 0.4 ? '#3F9A5C' : tone < 0.8 ? '#62B766' : '#8FCB6A';
            g.fillStyle = lg(g, 0, 0, 0, -h, [[0, shd(colA, 0.45)], [0.4, colA], [1, lit(colA, 0.34)]]);
            g.beginPath(); g.moveTo(x0 - w / 2, 0); g.quadraticCurveTo(x0 - w / 2 + lean * 0.3, -h * 0.6, x0 + lean, -h); g.quadraticCurveTo(x0 + w / 2 + lean * 0.42, -h * 0.56, x0 + w / 2, 0); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(230,255,210,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, -2); g.quadraticCurveTo(x0 + lean * 0.34, -h * 0.58, x0 + lean, -h + 2); g.stroke();
          }
        } else if (kind === 'plume'){                          // a sea plume: feathery, every side-branch a row of fine pinnules
          const col = [COR.violet, COR.brown, COR.teal][c % 3];
          for (let i = 0; i < 5; i++){
            const lean = (i - 2) * 26 + (R() - 0.5) * 10, h = 170 + R() * 80, cx = lean * 0.4;
            g.strokeStyle = shd(col, 0.3); g.lineWidth = 3.4; g.beginPath(); g.moveTo((i - 2) * 5, 0); g.quadraticCurveTo(cx, -h * 0.55, lean, -h); g.stroke();
            g.strokeStyle = lit(col, 0.2); g.lineWidth = 1.2;
            for (let k = 0; k < 40; k++){ const u = 0.14 + k / 40 * 0.84, q = 1 - u, px = q * q * (i - 2) * 5 + 2 * q * u * cx + u * u * lean, py = 2 * q * u * (-h * 0.55) + u * u * -h, len = 16 * (1 - u * 0.6);
              for (const d of [-1, 1]){ g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + d * len * 0.6, py - 3, px + d * len, py - 8 - len * 0.2); g.stroke(); } }
          }
        } else {                                               // an anemone: anemB = its column and the far tentacles, anemF = the near ones
          const C = SWAY_COL.anem[c % 3], front = kind === 'anemF';
          if (!front){
            g.fillStyle = lg(g, -70, 0, 70, 0, [[0, lit(C[2], 0.3)], [0.4, C[2]], [1, shd(C[2], 0.55)]]);
            g.beginPath(); g.moveTo(-50, 0); g.bezierCurveTo(-72, -16, -62, -40, -44, -44); g.lineTo(44, -44); g.bezierCurveTo(62, -40, 72, -16, 50, 0); g.closePath(); g.fill();
            g.fillStyle = shd(C[2], 0.3); for (let i = 0; i < 20; i++){ g.globalAlpha = 0.3; g.beginPath(); g.arc(-52 + R() * 104, -6 - R() * 32, 2 + R() * 2, 0, TAU); g.fill(); } g.globalAlpha = 1;   // the column's warts
            g.fillStyle = shd(C[0], 0.4); g.beginPath(); g.ellipse(0, -44, 60, 13, 0, 0, TAU); g.fill();
          }
          const n = front ? 42 : 46;
          for (let i = 0; i < n; i++){                         // each tentacle: a tapering curve that leans out and nods, a bulb at its tip
            const u = (i + R() * 0.8) / n, a = Math.PI * (1.04 + u * 0.92), reach = front ? 0.9 + R() * 0.5 : 0.5 + R() * 0.5, len = (front ? 62 : 84) + R() * 34;
            const bx = Math.cos(a) * 54 * (0.3 + R() * 0.7), by = -44 + (front ? 4 + R() * 8 : -R() * 6);
            const ex = bx + Math.cos(a) * len * reach, ey = by - len * (front ? 0.5 + R() * 0.3 : 0.86) + Math.abs(Math.cos(a)) * len * 0.34 + (front ? R() * 26 : 0);
            const mx = bx + Math.cos(a) * len * reach * 0.4, my = by - len * (front ? 0.62 : 0.7);
            const base = front ? C[0] : shd(C[0], 0.22), w0 = 8.4, w1 = 4.6;
            g.strokeStyle = shd(base, 0.34); g.lineWidth = w0; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
            g.strokeStyle = base; g.lineWidth = w0 * 0.66; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
            g.strokeStyle = lit(base, 0.5); g.lineWidth = w1 * 0.4; g.beginPath(); g.moveTo(bx - 1.2, by); g.quadraticCurveTo(mx - 1.4, my, ex - 1, ey); g.stroke();
            g.fillStyle = rg(g, ex - 1.6, ey - 1.8, 0.5, 6.4, [[0, lit(C[1], 0.6)], [0.6, C[1]], [1, shd(C[1], 0.4)]]); g.beginPath(); g.arc(ex, ey, 5.6, 0, TAU); g.fill();
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE FAR REEF AND THE SAND
      // ══════════════════════════════════════════════════════════════════════
      // the sand runs back between the two masses and sinks away into the blue
      const sandTop = x => 746 - 34 * Math.exp(-Math.pow((x - DW * 0.52) / (DW * 0.26), 2)) + 7 * noise1(x * 0.008 + 1.3);
      // one far plane of reef: a ridge of mounds with a few shapes standing on it, in
      // one hazy tone (distance takes the colour); painted small and softened
      function farPlane(g, base, amp, seed, tone, k){
        const R = makeRng(seed), f = 0.0026 + seed % 5 * 0.0006;
        const fy = x => base - amp * noise1(x * f + seed) - amp * 0.4 * noise1(x * f * 3.1 + seed * 2) - (x < DW * 0.5 ? (0.5 - x / DW) : (x / DW - 0.5)) * amp * 1.5;
        const cv = mkCanvas(DW / k, DH / k), c = cv.getContext('2d'); c.scale(1 / k, 1 / k);
        c.fillStyle = rgb(tone); c.strokeStyle = rgb(tone); c.lineCap = 'round';
        c.beginPath(); c.moveTo(-10, DH); for (let x = -10; x <= DW + 10; x += 14) c.lineTo(x, fy(x)); c.lineTo(DW + 10, DH); c.closePath(); c.fill();
        for (let i = 0, n = Math.round(DW / 120); i < n; i++){
          const x = (i + R()) * DW / n, y = fy(x) + 8, q = R(), s = 0.7 + R() * 0.9;
          if (q < 0.3){                                        // a sea fan
            for (let b = -4; b <= 4; b++){ c.lineWidth = 3.4 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + b * 8 * s, y - 34 * s, x + b * 15 * s, y - (70 - Math.abs(b) * 7) * s); c.stroke(); }
            c.lineWidth = 1.6 * s; for (let r0 = 1; r0 <= 4; r0++){ c.beginPath(); c.arc(x, y, 17 * r0 * s, Math.PI * 1.14, Math.PI * 1.86); c.stroke(); }
          } else if (q < 0.5){                                 // a table coral
            c.fillRect(x - 5 * s, y - 34 * s, 10 * s, 36 * s); c.beginPath(); c.ellipse(x, y - 36 * s, 46 * s, 9 * s, 0, 0, TAU); c.fill();
          } else if (q < 0.75){                                // a coral head, a smaller one beside it
            c.beginPath(); c.ellipse(x, y, 40 * s, 32 * s, 0, Math.PI, TAU); c.fill(); c.beginPath(); c.ellipse(x + 34 * s, y, 22 * s, 18 * s, 0, Math.PI, TAU); c.fill();
          } else {                                             // staghorn
            for (let b = -3; b <= 3; b++){ c.lineWidth = 5 * s; c.beginPath(); c.moveTo(x + b * 5 * s, y); c.lineTo(x + b * 15 * s, y - (52 - Math.abs(b) * 6) * s); c.stroke(); c.beginPath(); c.moveTo(x + b * 10 * s, y - 26 * s); c.lineTo(x + b * 10 * s + 12 * s, y - 46 * s); c.stroke(); }
          }
        }
        g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(softCopy(cv, 1.6), 0, 0, DW, DH); g.restore();
      }
      function paintFar(g){
        const w0 = waterAt(640);
        farPlane(g, 668, 70, 3, mixc(mixc(w0, [8, 30, 84], 0.26), LIGHT, 0.05), 4);
        g.fillStyle = lg(g, 0, 560, 0, 800, [[0, rgb(w0, 0)], [1, rgb(w0, 0.42)]]); g.fillRect(0, 560, DW, 240);      // water between the planes
        farPlane(g, 712, 60, 8, mixc(w0, [8, 22, 66], 0.52), 3);
        g.fillStyle = lg(g, 0, 620, 0, 820, [[0, rgb(w0, 0)], [1, rgb(w0, 0.3)]]); g.fillRect(0, 620, DW, 200);
      }
      const sandFront = x => 842 + 10 * noise1(x * 0.007 + 5) - 6 * Math.sin(x * 0.004);
      // the whole floor is painted ONCE into its own sheet; the picture takes it twice
      // (behind the reef, then its front strip over the reef's feet) so no join shows
      const SAND_Y = 700; let sandL = null;
      function bakeSand(){
        sandL = makeLayer(DW, DH - SAND_Y, LD); const g = sandL.cx, R = makeRng(41); g.translate(0, -SAND_Y);
        g.fillStyle = lg(g, 0, 712, 0, DH, [[0, '#4C8DC6'], [0.1, '#7FAFD0'], [0.26, '#C6C8B4'], [0.55, '#E6D7AE'], [1, '#D7BE8C']]); g.fillRect(0, SAND_Y, DW, 200);
        texture(g, TX.noise, 'soft-light', 0.6, 1.8, 0, SAND_Y, DW, 200); texture(g, TX.grain, 'soft-light', 0.5, 0.7, 0, SAND_Y, DW, 200);
        for (let i = 0; i < 34; i++){                          // low dunes: a lit back, a shaded lee
          const k = Math.pow(R(), 0.7), x = R() * DW, y = 736 + k * 160, rx = (90 + R() * 170) * (0.5 + k), ry = (7 + R() * 9) * (0.4 + k);
          softEllipse(g, x, y, rx, ry, [255, 246, 216], 0.16 + R() * 0.14); softEllipse(g, x + rx * 0.2, y + ry * 1.5, rx * 0.9, ry * 0.9, [96, 92, 132], 0.12 + R() * 0.1);
        }
        g.lineCap = 'round';
        for (let i = 0, n = Math.round(DW / 9); i < n; i++){   // ripple marks: short broken arcs, finer and closer far away
          const k = Math.pow(R(), 0.8), x = R() * DW, y = 730 + k * 170, len = (40 + R() * 130) * (0.35 + k), amp = (1 + R() * 2.4) * (0.3 + k), wl = TAU / (len * (0.9 + R())), ph = R() * 6;
          const pts = []; for (let u = 0; u <= 6; u++){ const xx = x + (u / 6 - 0.5) * len; pts.push([xx, y + Math.sin(xx * wl + ph) * amp]); }
          g.strokeStyle = 'rgba(126,104,96,' + (0.07 + k * 0.13) + ')'; g.lineWidth = 0.8 + k * 1.8; smoothOpen(g, pts); g.stroke();
          g.translate(0, -(1 + k * 1.6)); g.strokeStyle = 'rgba(255,252,236,' + (0.1 + k * 0.2) + ')'; g.lineWidth = 0.7 + k * 1.2; smoothOpen(g, pts); g.stroke(); g.translate(0, 1 + k * 1.6);
        }
        // rubble, shells, specks
        g.fillStyle = 'rgba(128,100,80,0.42)'; g.beginPath(); for (let i = 0, n = Math.round(DW / 2); i < n; i++){ const x = R() * DW, y = 736 + R() * 164, s = 0.7 + R() * 1.5; g.rect(x, y, s, s); } g.fill();
        g.fillStyle = 'rgba(255,255,246,0.5)'; g.beginPath(); for (let i = 0, n = Math.round(DW / 4); i < n; i++){ const x = R() * DW, y = 740 + R() * 160, s = 0.6 + R() * 1.2; g.rect(x, y, s, s); } g.fill();
        for (let i = 0, n = Math.round(DW / 40); i < n; i++){
          const x = R() * DW, k = R(), y = 748 + k * 146, s = 0.5 + k * 0.9, q = R();
          g.fillStyle = 'rgba(70,56,70,0.24)'; g.beginPath(); g.ellipse(x + 2 * s, y + 3 * s, 9 * s, 3 * s, 0, 0, TAU); g.fill();
          if (q < 0.5){ g.fillStyle = ['#F6EEE2', '#F2D6DC', '#D9D2E4', '#EADFC6'][Math.floor(R() * 4)]; g.beginPath(); g.ellipse(x, y, (4 + R() * 7) * s, (2.4 + R() * 3) * s, R() * 3, 0, TAU); g.fill(); }
          else if (q < 0.8){ const P = blobPts(x, y, 9 * s, 6 * s, R, 0.3, 7); smoothClosed(g, P); g.fillStyle = lg(g, x, y - 6 * s, x, y + 6 * s, [[0, '#C8BECF'], [1, '#7E7694']]); g.fill(); }
          else { g.fillStyle = ['#FFD8E0', '#FFE9CC', '#E6DCFF'][Math.floor(R() * 3)]; g.beginPath(); g.moveTo(x, y); for (let j = 0; j <= 6; j++){ const a = Math.PI + j / 6 * Math.PI; g.lineTo(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 8 * s - (j % 2 ? 0 : 1.4)); } g.closePath(); g.fill(); }
        }
      }
      function paintSand(B, front){
        const g = B.g, top = front ? sandFront : sandTop;
        const path = c => { c.beginPath(); c.moveTo(-10, DH + 10); for (let x = -10; x <= DW + 10; x += 12) c.lineTo(x, top(x)); c.lineTo(DW + 10, DH + 10); c.closePath(); };
        if (!sandL || sandL.w !== DW || sandL.ld !== LD){ bakeSand(); sandL.w = DW; sandL.ld = LD; }
        g.save(); path(g); g.clip(); g.drawImage(sandL.cv, 0, SAND_Y, DW, DH - SAND_Y); g.restore();
        if (B.m){ path(B.m); B.m.fillStyle = 'rgba(255,255,255,0.9)'; B.m.fill(); }
      }
      // a sea star with five slender arms (the blue one of the reefs, or red), lying on the sand
      function cStar(B, x, y, s, col, R){
        const g = B.g; g.save(); g.translate(x, y); g.scale(s, s * 0.62); g.rotate(R() * TAU);
        softEllipse(g, 3, 6, 34, 30, [60, 40, 30], 0.3);
        for (let i = 0; i < 5; i++){
          g.save(); g.rotate(i / 5 * TAU + (R() - 0.5) * 0.2);
          g.fillStyle = lg(g, -6, 0, 6, 0, [[0, lit(col, 0.36)], [0.5, rgb(col)], [1, shd(col, 0.4)]]);
          g.beginPath(); g.moveTo(-6.4, 0); g.quadraticCurveTo(-5, -20, -2 + (R() - 0.5) * 6, -36); g.quadraticCurveTo(5, -20, 6.4, 0); g.closePath(); g.fill();
          g.fillStyle = lit(col, 0.6); for (let k = 1; k < 7; k++){ g.beginPath(); g.arc(-1.4, -k * 5, 0.9, 0, TAU); g.fill(); }
          g.restore();
        }
        g.fillStyle = rgb(col); g.beginPath(); g.arc(0, 0, 7.4, 0, TAU); g.fill();
        g.restore();
        if (B.e){ B.e.fillStyle = rgb(hexc(neonOf(col)), 0.6); B.e.beginPath(); B.e.arc(x, y, 14 * s, 0, TAU); B.e.fill(); }
      }
      // a sea urchin: a dark ball in a burst of spines
      function cUrchin(B, x, y, s, R){
        const g = B.g; g.save(); g.translate(x, y); g.scale(s, s);
        softEllipse(g, 2, 4, 24, 7, [40, 30, 50], 0.4);
        g.strokeStyle = '#2A2440'; g.lineCap = 'round'; g.lineWidth = 1.5;
        for (let i = 0; i < 46; i++){ const a = Math.PI + (i + R()) / 46 * Math.PI * 1.0 + (R() - 0.5) * 0.3, len = 14 + R() * 12; g.beginPath(); g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6 - 4); g.lineTo(Math.cos(a) * len, Math.sin(a) * len - 4); g.stroke(); }
        g.fillStyle = rg(g, -3, -8, 1, 12, [[0, '#5A4A7E'], [1, '#1E1A30']]); g.beginPath(); g.ellipse(0, -4, 10, 8.4, 0, 0, TAU); g.fill();
        g.restore();
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE COMPOSITION — what grows where
      // ══════════════════════════════════════════════════════════════════════
      const CORALS_FN = { brain: cBrain, table: cTable, stag: cStag, plate: cPlate, tube: cTube, barrel: cBarrel, bubble: cBubble, mush: cMush };
      const KCOL = { brain: [COR.gold, COR.olive, COR.rose, COR.green, COR.salmon], table: [[COR.brown, COR.lavender], [COR.olive, COR.yellow], [COR.teal, '#EAF2FF'], [COR.salmon, COR.rose]],
                     stag: [[COR.blue, '#EAF2FF'], [COR.cream, COR.lavender], [COR.gold, '#FFF6DC'], [COR.violet, COR.rose]], plate: [COR.orange, COR.green, COR.violet, COR.gold, COR.salmon],
                     tube: [COR.yellow, COR.violet, COR.blue, COR.salmon], barrel: [COR.red, COR.brown, '#A8566A'], bubble: [COR.green, COR.cream, COR.rose], mush: [COR.rose, COR.cream, COR.olive] };
      let CORALS = [], PLANTS = [], ANEMS = [], ROCKS = [];               // baked colonies (tap targets) · live swaying things · anemones
      // heroes: [kind, u across the mass, v down its face (0 crest … 1 sand), size, colour index]; live = a swaying sprite
      const HERO_L = [['table', 0.14, 0, 1.25, 0], ['stag', 0.36, 0, 1.05, 0], ['fan', 0.5, 0.02, 1.0, 0, 'live'], ['table', 0.66, 0.1, 1.05, 3, '', 'station'], ['brain', 0.5, 0.3, 1.1, 0], ['tube', 0.22, 0.34, 0.95, 0], ['plate', 0.44, 0.42, 1.0, 0],
                      ['soft', 0.86, 0.34, 0.74, 0, 'live'], ['barrel', 0.8, 0.5, 0.85, 0], ['bubble', 0.06, 0.4, 0.8, 0], ['mush', 0.3, 0.62, 0.8, 0], ['whip', 0.04, 0.02, 0.8, 1, 'live'], ['brain', 0.12, 0.7, 0.9, 2],
                      ['plume', 0.58, 0.5, 0.7, 0, 'live'], ['soft', 0.97, 0.62, 0.58, 1, 'live']];
      const HERO_R = [['octo', 0.09, 0, 1, 0], ['fan', 0.3, 0.02, 1.15, 1, 'live'], ['stag', 0.58, 0, 1.15, 2], ['table', 0.44, 0.06, 1.1, 1], ['table', 0.84, 0.02, 1.0, 2], ['brain', 0.2, 0.3, 1.0, 3], ['tube', 0.52, 0.36, 1.0, 1],
                      ['plate', 0.72, 0.3, 1.05, 1], ['whip', 0.94, 0, 0.9, 0, 'live'], ['soft', 0.2, 0.22, 0.8, 2, 'live'], ['barrel', 0.36, 0.62, 0.9, 1], ['bubble', 0.62, 0.6, 0.8, 1], ['mush', 0.9, 0.44, 0.85, 1],
                      ['plume', 0.7, 0.12, 0.8, 1, 'live'], ['fan', 0.96, 0.4, 0.8, 2, 'live'], ['soft', 0.5, 0.78, 0.6, 3, 'live'], ['plate', 0.26, 0.64, 0.8, 2]];
      function composeMass(M, fy, rocks, heroes, seed){
        const R = makeRng(seed), used = new Set(), queue = rocks.map(b => ({ key: b.y, rock: b })), sc = narrow ? 0.62 : 1;
        const nearest = (tx, ty) => { let best = null, bd = 1e9; for (const b of rocks){ if (used.has(b) || b.y > SAND - 24) continue; const d = (b.x - tx) * (b.x - tx) + (b.y - b.ry * 0.6 - ty) * (b.y - b.ry * 0.6 - ty); if (d < bd){ bd = d; best = b; } } return best; };
        for (const h of heroes){
          const tx = M.x0 + h[1] * (M.x1 - M.x0), top = fy(tx), b = nearest(tx, top + h[2] * (SAND - top)); if (!b) continue;
          used.add(b);
          if (h[0] === 'octo'){ OCTO.x = b.x; OCTO.y = b.y - b.ry * 0.78; continue; }
          const ax = b.x, ay = b.y - b.ry * 0.66, s = h[3] * sc;
          if (h[5] === 'live') PLANTS.push({ k: h[0], c: h[4], x: ax, y: ay + 6, s, ph: R() * TAU });
          else { const pal = KCOL[h[0]][h[4] % KCOL[h[0]].length]; queue.push({ key: b.y + 0.01, coral: { k: h[0], x: ax, y: ay + 4, s, col: Array.isArray(pal) ? pal[0] : pal, tip: Array.isArray(pal) ? pal[1] : undefined, seed: 1 + Math.floor(R() * 1e9), tag: h[6] } }); }
        }
        const kinds = ['brain', 'stag', 'plate', 'tube', 'bubble', 'mush', 'table', 'stag', 'brain'];
        for (const b of rocks){                               // the smaller colonies that fill the rest of the reef
          if (used.has(b) || b.y > SAND - 20 || R() > 0.8) continue;
          const k = kinds[Math.floor(R() * kinds.length)], pal = KCOL[k][Math.floor(R() * KCOL[k].length)], s = (0.3 + R() * 0.3) * sc * Math.min(1.3, b.rx / 56);
          queue.push({ key: b.y + 0.01, coral: { k, x: b.x + (R() - 0.5) * b.rx * 0.5, y: b.y - b.ry * 0.64, s, col: Array.isArray(pal) ? pal[0] : pal, tip: Array.isArray(pal) ? pal[1] : undefined, seed: 1 + Math.floor(R() * 1e9) } });
        }
        return queue;
      }
      function paintReef(B){
        const g = B.g, size = narrow ? 46 : 64;
        const rl = rockMass(LEFT.x0, LEFT.x1, leftY, 301, size), rr = rockMass(RIGHT.x0, RIGHT.x1, rightY, 302, size);
        CORALS = []; PLANTS = []; ROCKS = rl.concat(rr);
        const queue = composeMass(LEFT, leftY, rl, HERO_L, 11).concat(composeMass(RIGHT, rightY, rr, HERO_R, 12));
        queue.sort((a, b) => a.key - b.key);
        rockBacking(g, rl.concat(rr));
        for (const q of queue){
          if (q.rock) boulder(B, q.rock.x, q.rock.y, q.rock.rx, q.rock.ry, makeRng(q.rock.seed));
          else { const c = q.coral; CORALS_FN[c.k](B, c.x, c.y, c.s, c.col, makeRng(c.seed), c.tip); CORALS.push(c); }
        }
      }
      // the light on the reef as a whole (painted INTO the reef's own pixels): its depths
      // darker, its sun side warmer, a still net of caustics on what faces up
      function lightReef(r){
        r.save(); r.globalCompositeOperation = 'source-atop';
        r.fillStyle = lg(r, 0, 260, 0, DH, [[0, 'rgba(10,14,70,0)'], [0.6, 'rgba(10,14,70,0.12)'], [1, 'rgba(8,10,64,0.32)']]); r.fillRect(0, 0, DW, DH);
        r.fillStyle = rg(r, SUN.x, SUN.y, 80, 1000, [[0, 'rgba(255,250,224,0.34)'], [0.5, 'rgba(210,244,255,0.14)'], [1, 'rgba(120,200,255,0)']]); r.fillRect(0, 0, DW, DH);
        r.globalAlpha = 0.2; r.scale(2.4, 2.4); r.fillStyle = r.createPattern(TX.caust, 'repeat'); r.fillRect(0, 0, DW / 2.4, 700 / 2.4);
        r.restore();
        r.save(); r.globalCompositeOperation = 'source-atop'; r.fillStyle = 'rgba(16,84,176,0.09)'; r.fillRect(0, 0, DW, DH); r.restore();      // the water's own colour over everything
      }
      function paintPicture(g, e, m){
        const B = { g, e: e || null, m: m || null };
        if (location.hash.indexOf('corals') >= 0){             // a sheet of every coral, for looking closely
          paintWater(g);
          const kinds = Object.keys(CORALS_FN), cols = [COR.gold, COR.salmon, COR.blue, COR.orange, COR.yellow, COR.red, COR.green, COR.rose], R = makeRng(5);
          g.fillStyle = 'rgba(8,40,100,0.55)'; g.fillRect(0, 0, DW, DH);
          kinds.forEach((k, i) => { const x = 200 + (i % 4) * 400, y = 400 + Math.floor(i / 4) * 420; CORALS_FN[k](B, x, y, 1.9, cols[i], R); });
          return;
        }
        if (location.hash.indexOf('fish') >= 0){               // a sheet of every fish
          paintWater(g); g.fillStyle = 'rgba(8,40,100,0.45)'; g.fillRect(0, 0, DW, DH);
          Object.keys(FISH).forEach((k, i) => { g.save(); g.translate(210 + (i % 4) * 395, 190 + Math.floor(i / 4) * 270); g.scale(2.7, 2.7); paintFish(g, FISH[k], 0.9 + i, 0); g.restore(); });
          return;
        }
        if (location.hash.indexOf('sway') >= 0){               // a sheet of every swaying thing
          paintWater(g);
          g.fillStyle = 'rgba(8,40,100,0.55)'; g.fillRect(0, 0, DW, DH);
          const list = [['fan', 0], ['fan', 1], ['soft', 0], ['soft', 2], ['whip', 0], ['grass', 0], ['plume', 0], ['anemB', 0], ['anemB', 1]];
          list.forEach((k, i) => { const x = 170 + (i % 5) * 320, y = 430 + Math.floor(i / 5) * 430; g.save(); g.translate(x, y); g.scale(1.3, 1.3); paintSway(g, k[0], k[1], makeRng(40 + i)); if (k[0] === 'anemB') paintSway(g, 'anemF', k[1], makeRng(90 + i)); g.restore(); });
          return;
        }
        paintWater(g);
        paintFar(g);
        paintSand(B);
        const reef = makeLayer(DW, DH, LD);
        paintReef({ g: reef.cx, e: B.e, m: B.m });
        lightReef(reef.cx);
        g.drawImage(reef.cv, 0, 0, DW, DH);
        // the reef's own shade on the sand at its feet, then the front of the floor over them
        for (const M of [LEFT, RIGHT]){ const cx = (Math.max(0, M.x0) + Math.min(DW, M.x1)) / 2, w = (Math.min(DW, M.x1) - Math.max(0, M.x0)) / 2; softEllipse(g, cx, 846, w * 1.08, 30, [16, 30, 90], 0.5); }
        paintSand(B, true);
        for (const M of [LEFT, RIGHT]) for (let x = Math.max(-20, M.x0 + 30); x < Math.min(DW + 20, M.x1 - 20); x += 44) softEllipse(g, x, sandFront(x) + 7, 70, 13, [28, 34, 92], 0.24);
        paintFloor(B);
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE FLOOR'S OWN THINGS — anemones, giant clams, the chest, sea stars,
      // urchins, grass, a few coral heads out on the sand; and the anchors the
      // cast uses (the cleaning station, the octopus's rock, the seahorse's blade)
      // ══════════════════════════════════════════════════════════════════════
      const CLAMS = [], STARS = [], VENTS = [];
      const CHEST = { x: 0, y: 0, s: 1 }, STATION = { x: 0, y: 0 }, SIGN = { x: 0, y: 0, w: 168, h: 62, foot: 0 }, OCTO = { x: 0, y: 0, s: 1 }, HORSE = { x: 0, y: 0, s: 1 };
      const CORAL_R = { brain: 62, table: 92, stag: 64, plate: 60, tube: 46, barrel: 46, bubble: 50, mush: 54 };      // tap radius
      function paintChestBody(g){
        const s = CHEST.s;
        g.save(); g.translate(CHEST.x, CHEST.y); g.scale(s, s);
        softEllipse(g, 6, 0, 78, 14, [40, 30, 70], 0.45);
        g.fillStyle = lg(g, 0, -44, 0, 4, [[0, '#9A6840'], [0.5, '#7E5034'], [1, '#553426']]); g.beginPath(); g.roundRect(-48, -44, 96, 48, 5); g.fill();
        g.strokeStyle = 'rgba(40,22,16,0.4)'; g.lineWidth = 1.4; for (const y of [-32, -20, -8]){ g.beginPath(); g.moveTo(-46, y); g.lineTo(46, y + (y % 3)); g.stroke(); }      // planks
        g.fillStyle = lg(g, 0, -44, 0, 4, [[0, '#6E7486'], [1, '#3A3E52']]); for (const x of [-48, -6, 38]) g.fillRect(x, -44, 10, 48);                                   // iron bands
        g.fillStyle = '#C8CCDA'; for (const x of [-43, -1, 43]) for (const y of [-38, -22, -6]){ g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); }
        g.fillStyle = lg(g, 0, -34, 0, -12, [[0, '#FFE9A0'], [1, '#C8902C']]); g.beginPath(); g.roundRect(-9, -34, 18, 20, 4); g.fill(); g.fillStyle = '#4A2C1C'; g.beginPath(); g.arc(0, -26, 2.6, 0, TAU); g.fill(); g.fillRect(-1, -26, 2, 7);
        g.fillStyle = 'rgba(96,170,120,0.5)'; for (const p of [[-40, -10, 9], [30, -2, 12], [-20, 0, 8]]){ g.beginPath(); g.ellipse(p[0], p[1], p[2], p[2] * 0.5, 0, 0, TAU); g.fill(); }      // a little weed on it
        // the sand has drifted up against it; a few coins lie where they fell
        g.fillStyle = lg(g, 0, -8, 0, 8, [[0, '#EADBB2'], [1, '#D9C392']]); g.beginPath(); g.moveTo(-70, 6); g.quadraticCurveTo(-40, -8, -10, 0); g.quadraticCurveTo(24, -10, 66, 6); g.closePath(); g.fill();
        for (const p of [[-58, 3], [-50, 6], [56, 4], [22, 6]]){ g.fillStyle = '#B8862C'; g.beginPath(); g.ellipse(p[0], p[1] + 1, 5, 2.4, 0, 0, TAU); g.fill(); g.fillStyle = '#FFE27A'; g.beginPath(); g.ellipse(p[0], p[1], 5, 2.4, 0, 0, TAU); g.fill(); }
        g.restore();
      }
      function paintFloor(B){
        const g = B.g, R = makeRng(77), a = LEFT.x1 - 30, b = RIGHT.x0 + 30, cx = u => a + (b - a) * u;
        ANEMS = []; CLAMS.length = 0; STARS.length = 0;
        const F = narrow
          ? { anem: [[DW * 0.3, 874, 0.6, 0]], clam: [[DW * 0.69, 882, 0.56]], chest: [DW * 0.82, 876, 0.56], star: [[DW * 0.14, 888, 0.6, 0], [DW * 0.5, 890, 0.56, 1]], urch: [[DW * 0.72, 870, 0.6]],
              grass: [[DW * 0.06, 870, 0.4], [DW * 0.46, 868, 0.36], [DW * 0.94, 870, 0.4]], head: [] }
          : { anem: [[cx(0.1), 836, 1, 0], [cx(0.88), 814, 0.9, 1]], clam: [[cx(0.3), 860, 0.9], [cx(0.72), 848, 0.8]], chest: [cx(0.53), 802, 0.9],
              star: [[cx(0.2), 878, 0.9, 0], [cx(0.62), 872, 0.8, 1], [cx(0.44), 828, 0.6, 2], [cx(0.93), 886, 0.9, 0]], urch: [[cx(0.36), 808, 0.8], [cx(0.67), 798, 0.7], [cx(0.05), 874, 1]],
              grass: [[cx(0.0), 800, 0.5], [cx(0.2), 826, 0.46], [cx(0.99), 800, 0.5], [cx(0.8), 862, 0.56], [cx(0.4), 782, 0.36], [cx(0.66), 772, 0.4]],
              head: [[cx(0.24), 798, 0.5, 'brain', 4], [cx(0.77), 794, 0.5, 'mush', 0], [cx(0.47), 774, 0.36, 'stag', 1]] };
        for (const h of F.head){                               // a lump of rock out on the sand with one colony on it
          softEllipse(g, h[0] + 6, h[1] + 4, 70 * h[2] * 2, 16 * h[2] * 2, [30, 34, 90], 0.34);
          boulder(B, h[0], h[1] - 14 * h[2] * 2, 56 * h[2] * 2, 30 * h[2] * 2, makeRng(900 + h[0] | 0));
          const pal = KCOL[h[3]][h[4] % KCOL[h[3]].length], c = { k: h[3], x: h[0], y: h[1] - 30 * h[2] * 2, s: h[2], col: Array.isArray(pal) ? pal[0] : pal, tip: Array.isArray(pal) ? pal[1] : undefined, seed: 500 + h[0] | 0 };
          CORALS_FN[c.k](B, c.x, c.y, c.s, c.col, makeRng(c.seed), c.tip); CORALS.push(c);
        }
        for (const u of F.urch) cUrchin(B, u[0], u[1], u[2], R);
        F.star.forEach((s, i) => { cStar(B, s[0], s[1], s[2], [COR.blue, COR.red, COR.orange][s[3]], R); STARS.push({ x: s[0], y: s[1], s: s[2], kick: 0 }); });
        CHEST.x = F.chest[0]; CHEST.y = F.chest[1]; CHEST.s = F.chest[2]; paintChestBody(g);
        for (const c of F.clam){ softEllipse(g, c[0] + 3, c[1] + 3, 58 * c[2], 11 * c[2], [40, 30, 70], 0.4); CLAMS.push({ x: c[0], y: c[1], s: c[2], ph: R() * 6, open: 0.2, want: 0, until: 0 }); }
        for (const an of F.anem){ softEllipse(g, an[0] + 4, an[1] + 2, 84 * an[2], 15 * an[2], [30, 30, 84], 0.42); ANEMS.push({ x: an[0], y: an[1], s: an[2], c: an[3] }); }
        for (const p of F.grass) PLANTS.push({ k: 'grass', c: 0, x: p[0], y: p[1], s: p[2], ph: R() * TAU });
        VENTS.length = 0; VENTS.push({ x: CHEST.x + 30 * CHEST.s, y: CHEST.y - 46 * CHEST.s }); for (const c of CORALS) if ((c.k === 'barrel' || c.k === 'tube') && c.s > 0.7 && VENTS.length < 5) VENTS.push({ x: c.x, y: c.y - 70 * c.s });
        // the anchors
        const st = CORALS.find(c => c.tag === 'station') || CORALS.find(c => c.k === 'table') || CORALS[0], k = narrow ? 0.62 : 1;
        STATION.x = st.x; STATION.y = st.y - 52 * st.s;
        SIGN.w = 150 * k; SIGN.h = 54 * k; SIGN.x = clamp(STATION.x - SIGN.w / 2 - 30 * st.s, 6, DW - SIGN.w - 6); SIGN.y = Math.max(70, STATION.y - 128 * k); SIGN.foot = STATION.y + 6;
        const gr = F.grass[narrow ? 1 : 5];        // the seahorse's blade: clear of every tap target HORSE.s = narrow ? 0.62 : 0.85; HORSE.x = gr[0] + 34 * HORSE.s; HORSE.y = gr[1] - 54 * HORSE.s;
        OCTO.s = narrow ? 0.56 : 0.8;
      }
      // ── what moves by itself on the floor: the giant clams (they gape slowly; a
      //    tap opens one wide on its pearl) and the chest's lid
      function drawClams(g, t, dt){
        for (const c of CLAMS){
          if (c.until && t > c.until){ c.want = 0; c.until = 0; }
          const idle = 0.22 + 0.1 * Math.sin(t * 0.5 + c.ph);
          c.open += ((c.want ? 1 : idle) - c.open) * Math.min(1, dt * (c.want ? 5 : 2.2));
          const s = c.s, o = c.open, lift = 30 * o;
          g.save(); g.translate(c.x, c.y); g.scale(s, s);
          const shell = up => { g.beginPath(); g.moveTo(-44, 0); for (let i = 0; i < 5; i++) g.quadraticCurveTo(-44 + (i + 0.5) * 17.6, up * (11 + (i === 2 ? 4 : 0)), -44 + (i + 1) * 17.6, 0); g.bezierCurveTo(42, -up * 32, -42, -up * 32, -44, 0); g.fill(); };
          g.fillStyle = lg(g, 0, 0, 0, 26, [[0, '#E4D6C6'], [1, '#8E7A9E']]); g.save(); g.translate(0, -2); g.scale(1, -0.9); shell(-1); g.restore();          // the lower shell
          if (o > 0.08){                                       // the mantle: a wavy lip of electric blue, dotted; the dark inside; the pearl
            g.fillStyle = '#241A52'; g.beginPath(); g.ellipse(0, -4 - lift * 0.4, 38, 4 + lift * 0.5, 0, 0, TAU); g.fill();
            g.fillStyle = lg(g, -40, 0, 40, 0, [[0, '#2EE0D0'], [0.35, '#3A8CFF'], [0.7, '#7A5CF0'], [1, '#2EC8E8']]);
            g.beginPath(); for (let i = 0; i <= 12; i++){ const x = -38 + i * 6.33, y = -6 + Math.sin(i * 1.6 + t * 1.4) * 1.8; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.lineTo(38, 1); g.lineTo(-38, 1); g.closePath(); g.fill();
            g.fillStyle = 'rgba(200,255,250,0.8)'; for (let i = 0; i < 9; i++){ g.beginPath(); g.arc(-32 + i * 8, -2.4 + (i % 2), 1, 0, TAU); g.fill(); }
            if (o > 0.5){ const k = (o - 0.5) * 2; glow(g, 'white', 0, -10 - lift * 0.3, 20 * k, 0.7 * k); g.fillStyle = rg(g, -3, -13 - lift * 0.3, 1, 9, [[0, '#FFFFFF'], [1, '#E6D8F2']]); g.globalAlpha = k; g.beginPath(); g.arc(0, -10 - lift * 0.3, 7.5, 0, TAU); g.fill(); g.globalAlpha = 1; }
          }
          g.save(); g.translate(0, -6 - lift); g.fillStyle = lg(g, 0, -30, 0, 6, [[0, '#F4EADC'], [0.6, '#D6C2C0'], [1, '#A690B4']]); shell(1);                 // the upper shell, lifting
          g.strokeStyle = 'rgba(120,96,140,0.5)'; g.lineWidth = 1.6; for (let i = 1; i < 5; i++){ g.beginPath(); g.moveTo(-44 + i * 17.6, 0); g.quadraticCurveTo(-30 + i * 12, -14, -16 + i * 6.4, -22); g.stroke(); }
          g.strokeStyle = 'rgba(255,255,250,0.5)'; g.lineWidth = 1.2; for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(-38 + i * 17.6, -3); g.quadraticCurveTo(-26 + i * 12.4, -14, -12 + i * 6.4, -21); g.stroke(); }
          g.restore(); g.restore();
        }
      }
      const chest = { open: 0, want: 0, until: 0, taps: 0 };
      function drawChestLid(g, t, dt){
        if (chest.until && t > chest.until){ chest.want = 0; chest.until = 0; }
        chest.open += (chest.want - chest.open) * Math.min(1, dt * 5);
        const s = CHEST.s, o = chest.open;
        g.save(); g.translate(CHEST.x, CHEST.y); g.scale(s, s);
        if (o > 0.05){                                         // gold inside, a glint dancing on it
          g.fillStyle = '#3A2018'; g.beginPath(); g.ellipse(0, -44, 44, 8 * o + 2, 0, 0, TAU); g.fill();
          g.fillStyle = lg(g, 0, -56, 0, -40, [[0, '#FFF2A0'], [1, '#E8A832']]); g.beginPath(); g.ellipse(0, -45, 38, 9 * o, 0, Math.PI, TAU); g.fill();
          glow(g, 'gold', Math.sin(t * 2.3) * 22, -50, 26 * o, 0.8 * o); glow(g, 'white', Math.sin(t * 3.1 + 1) * 16, -52, 10 * o, 0.9 * o);
        }
        g.translate(-48, -44); g.rotate(-o * 1.05);            // the lid swings up on its back edge
        g.fillStyle = lg(g, 0, -30, 0, 0, [[0, '#B07A4A'], [1, '#7A4C30']]); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(4, -34, 92, -34, 96, 0); g.closePath(); g.fill();
        g.fillStyle = lg(g, 0, -30, 0, 0, [[0, '#8C92A6'], [1, '#444860']]);
        for (const x of [0, 42, 86]){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 1, -(x === 42 ? 26 : 13)); g.lineTo(x + 10, -(x === 42 ? 26 : x ? 12 : 18)); g.lineTo(x + 10, 0); g.closePath(); g.fill(); }
        g.restore();
      }

      // ══════════════════════════════════════════════════════════════════════
      // BAKING — everything still is painted once: the picture (opaque), the
      // night's own light (emissive, half size), where moving light may fall
      // (mask, quarter size), two blurred foreground corners
      // ══════════════════════════════════════════════════════════════════════
      let bgL = null, glowL = null, maskL = null, litL = null, frontA = null, frontB = null;
      const LIT_TOP = 230, FRONT_W = 380, FRONT_H = 250;
      function bakePicture(){
        const t0 = performance.now();
        bgL = makeLayer(DW, DH, LD, true); glowL = makeLayer(DW, DH, LD * 0.5); maskL = makeLayer(DW, DH, LD * 0.25);
        paintPicture(bgL.cx, glowL.cx, maskL.cx);
        // the glow: the sharp lights over their own soft halo
        { const sharp = mkCanvas(glowL.cv.width, glowL.cv.height); sharp.getContext('2d').drawImage(glowL.cv, 0, 0);
          const g = glowL.cx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, glowL.cv.width, glowL.cv.height);
          g.globalAlpha = 0.9; g.drawImage(softCopy(sharp, 7), 0, 0); g.globalAlpha = 0.8; g.drawImage(softCopy(sharp, 3), 0, 0); g.globalAlpha = 1; g.drawImage(sharp, 0, 0); g.restore(); }
        litL = makeLayer(DW, DH - LIT_TOP, LD * 0.5);
        // the foreground: corals close to the eye, dark against the light and out of focus
        const corner = flip => {
          const L0 = makeLayer(FRONT_W, FRONT_H, LD * 0.6), f = L0.cx, R = makeRng(flip ? 91 : 92), B = { g: f, e: null, m: null };
          if (flip){ f.translate(FRONT_W, 0); f.scale(-1, 1); }
          f.fillStyle = '#20264E'; f.beginPath(); f.moveTo(-10, FRONT_H + 6); f.lineTo(-10, 150); f.bezierCurveTo(60, 132, 130, 176, 200, 212); f.bezierCurveTo(260, 232, 320, 242, FRONT_W + 6, FRONT_H + 6); f.closePath(); f.fill();
          cStag(B, 84, 178, 1.1, COR.violet, R, COR.rose); cTube(B, 18, 196, 0.9, COR.blue, R); cPlate(B, 190, 232, 0.8, COR.magenta, R); cBubble(B, 280, 246, 0.7, COR.teal, R);
          f.setTransform(L0.dpr, 0, 0, L0.dpr, 0, 0); f.globalCompositeOperation = 'source-atop';
          f.fillStyle = lg(f, 0, 0, 0, FRONT_H, [[0, 'rgba(10,24,84,0.56)'], [1, 'rgba(6,14,58,0.84)']]); f.fillRect(0, 0, FRONT_W, FRONT_H);
          f.globalCompositeOperation = 'source-over';
          const soft = softCopy(L0.cv, 2.6), out = mkCanvas(L0.cv.width, L0.cv.height); out.getContext('2d').drawImage(soft, 0, 0);
          return { cv: out };
        };
        frontA = corner(false); frontB = corner(true);
        perf.bakes++; perf.bakeMs = performance.now() - t0;
      }
      function drawFront(g){
        const s = narrow ? 0.4 : 1, w = FRONT_W * s, h = FRONT_H * s;
        g.drawImage(frontA.cv, -8, DH - h + 6, w, h); g.drawImage(frontB.cv, DW - w + 8, DH - h + 6, w, h); perf.blits += 2; perf.area += 2 * w * h;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE LIVING LIGHT — rays that breathe, caustics that crawl over the reef
      // and the sand (and only there), the hour's gradient
      // ══════════════════════════════════════════════════════════════════════
      const RAY = [mkCanvas(256, 256), mkCanvas(256, 256)], gradeL = makeLayer(4, 64, 1);
      function bakeRays(){                                     // two different fans; the frame cross-fades between them
        const col = mixc([255, 255, 244], [255, 196, 120], L.warm), cs = (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0);
        for (let i = 0; i < 2; i++){
          const tmp = mkCanvas(128, 128), g = tmp.getContext('2d'), R = makeRng(200 + i * 17);
          for (let k = 0; k < 13; k++){
            const a = 0.42 + (k + R() * 0.8) / 13 * 1.4, wd = 0.014 + R() * R() * 0.06, l = 120 + R() * 60, al = 0.3 + R() * 0.5;
            g.fillStyle = lg(g, 30, -8, 30 + Math.cos(a) * l, -8 + Math.sin(a) * l, [[0, 'rgba(' + cs + ',' + al + ')'], [0.4, 'rgba(' + cs + ',' + al * 0.55 + ')'], [1, 'rgba(' + cs + ',0)']]);
            g.beginPath(); g.moveTo(30, -8); g.lineTo(30 + Math.cos(a - wd) * l, -8 + Math.sin(a - wd) * l); g.lineTo(30 + Math.cos(a + wd) * l, -8 + Math.sin(a + wd) * l); g.closePath(); g.fill();
          }
          const c = RAY[i].getContext('2d'); c.clearRect(0, 0, 256, 256); c.imageSmoothingQuality = 'high'; c.drawImage(softCopy(tmp, 2), 0, 0, 256, 256);
        }
      }
      function drawRays(g, t, night){
        if (Q === 0) return;
        const k = night ? L.moon * 0.5 : L.ray; if (k <= 0.02) return;
        const w = Math.min(DW * 1.05, 1500), h = 860, x0 = SUN.x - w * (30 / 128), sway = Math.sin(t * 0.17) * 18;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < (Q === 2 ? 2 : 1); i++){
          g.globalAlpha = k * (night ? 0.16 : 0.2) * (0.55 + 0.45 * Math.sin(t * 0.43 + i * Math.PI));
          g.drawImage(RAY[i], x0 + (i ? -sway : sway), -50, w, h); perf.blits++; perf.area += Math.min(w, DW) * h;
        }
        g.restore();
      }
      // moving caustics: the caustic tile scrolled twice into a half-size layer, cut by
      // the mask so the light lands only on the reef's upturned faces and the sand
      let litFrame = 0;
      function updateLit(t){
        const c = litL.cx, k = litL.dpr, tw = 360, th = 360;
        c.setTransform(k, 0, 0, k, 0, -LIT_TOP * k); c.globalCompositeOperation = 'source-over'; c.clearRect(0, LIT_TOP, DW, DH - LIT_TOP);
        for (let p = 0; p < 2; p++){
          const ox = ((t * (p ? -15 : 21)) % tw + tw) % tw, oy = ((t * (p ? 7 : -5)) % th + th) % th;
          c.globalAlpha = p ? 0.6 : 0.9;
          for (let x = -ox; x < DW; x += tw) for (let y = LIT_TOP - oy; y < DH; y += th) c.drawImage(TX.caust, x, y, tw, th);
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in'; c.drawImage(maskL.cv, 0, 0, DW, DH);
        c.globalCompositeOperation = 'source-over';
      }
      function drawLit(g, t){
        if (Q === 0 || L.day < 0.2) return;
        if ((litFrame++ % (Q === 2 ? 2 : 4)) === 0) updateLit(t);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 * clamp01((L.day - 0.2) * 1.5);
        g.drawImage(litL.cv, 0, LIT_TOP, DW, DH - LIT_TOP); g.restore(); perf.blits++; perf.area += DW * (DH - LIT_TOP) * 0.5;
      }
      function paintGrade(){
        const g = gradeL.cx; g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = lg(g, 0, 0, 0, 64, [[0, rgb(L.ovT)], [0.5, rgb(mixc(L.ovT, L.ovB, 0.6))], [1, rgb(L.ovB)]]); g.fillRect(0, 0, 4, 64);
        bakeRays();
      }

      // ── the swaying things on screen: each sprite painted once, then SWAY_N bent
      //    frames of it (built out of 2-px slices, each pushed over by the square of
      //    its height); a plant is one plain blit of the frame the swell picks
      const SWAY = {}, SWAYB = {}, SWAY_N = 15;
      let swayBudget = 0;                                      // at most one sway book is built per frame
      function swayBook(kind, c){
        const key = kind + c; if (SWAYB[key]) return SWAYB[key];
        if (swayBudget <= 0) return null;
        swayBudget--;
        const sz = SWAY_SIZE[kind], w = sz[0], h = sz[1], src = makeLayer(w, h, LD), g0 = src.cx;
        g0.translate(w / 2, h - 2); paintSway(g0, kind, c, makeRng(kind.length * 31 + c * 7 + 5));
        const A = SWAY_AMP[kind], ap = Math.ceil(A * LD), sw = src.cv.width, sh = src.cv.height, cw = sw + ap * 2, ch = sh;
        const cols = Math.max(1, Math.min(SWAY_N, Math.floor(2040 / cw))), rows = Math.ceil(SWAY_N / cols);
        const cv = mkCanvas(cols * cw, rows * ch), g = cv.getContext('2d');
        for (let f = 0; f < SWAY_N; f++){
          const lean = (f / (SWAY_N - 1) * 2 - 1) * ap, ox = (f % cols) * cw + ap, oy = Math.floor(f / cols) * ch;
          for (let y = 0; y < sh; y += 2){ const k = 1 - (y + 1) / sh; g.drawImage(src.cv, 0, y, sw, 2, ox + lean * k * k, oy + y, sw, 2); }
        }
        perf.bakes++;
        return (SWAYB[key] = { cv, cols, cw, ch, uw: w + A * 2, uh: h });
      }
      function drawSway(g, kind, c, x, y, s, cur){             // a plant standing on (x, y): cur = the swell, -1..1
        const b = swayBook(kind, c); if (!b) return;
        const f = Math.round((clamp(cur, -1, 1) * 0.5 + 0.5) * (SWAY_N - 1));
        g.drawImage(b.cv, (f % b.cols) * b.cw, Math.floor(f / b.cols) * b.ch, b.cw, b.ch, x - b.uw * s / 2, y - b.uh * s + 2 * s, b.uw * s, b.uh * s);
        perf.blits++; perf.area += b.uw * b.uh * s * s;
      }
      const current = (t, x, ph) => Math.sin(t * 0.8 + ph) * 0.6 + Math.sin(t * 0.33 + x * 0.004) * 0.4;      // the shared swell, -1..1

      // ══════════════════════════════════════════════════════════════════════
      // FLIPBOOKS — a creature's swimming loop, rendered once into a grid of
      // frames; after that a frame is ONE image blit.
      // ══════════════════════════════════════════════════════════════════════
      // a source = { n, box: [x0, y0, x1, y1] in the creature's own units, paint(g, wt) }
      const BOOKS = {}, BAKE_Q = [];
      function book(key, make, px){                            // px = bake resolution (layer pixels per unit); null until baked
        const b = BOOKS[key];
        if (b) return b.ready ? b : null;
        BOOKS[key] = { ready: false }; BAKE_Q.push({ key, make, px });
        return null;
      }
      function bakeOne(){                                      // one book per frame at most, so a busy boot never hitches
        const job = BAKE_Q.shift(); if (!job) return false;
        const src = job.make(); if (!src){ delete BOOKS[job.key]; return true; }
        const px = Math.max(0.3, Math.min(job.px, 2.2)), x0 = src.box[0], y0 = src.box[1];
        const cw = Math.ceil((src.box[2] - x0) * px) + 2, ch = Math.ceil((src.box[3] - y0) * px) + 2;
        const cols = Math.max(1, Math.min(src.n, Math.floor(2040 / cw))), rows = Math.ceil(src.n / cols);
        const cv = doc.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch;
        const g = cv.getContext('2d');
        const tmp = src.warp ? mkCanvas(cw, ch) : null, tg = tmp && tmp.getContext('2d');
        for (let k = 0; k < src.n; k++){
          const wt = k / src.n * TAU, ox = (k % cols) * cw, oy = Math.floor(k / cols) * ch;
          if (tmp){                                            // painted straight, then bent: each 2-px column slides up or down a little
            tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, cw, ch); tg.setTransform(px, 0, 0, px, -x0 * px + 1, -y0 * px + 1); tg.save(); src.paint(tg, wt); tg.restore();
            g.setTransform(1, 0, 0, 1, 0, 0);
            for (let sx = 0; sx < cw; sx += 2) g.drawImage(tmp, sx, 0, 2, ch, ox + sx, oy + src.warp(wt, x0 + (sx - 1) / px) * px, 2, ch);
            continue;
          }
          g.setTransform(px, 0, 0, px, ox - x0 * px + 1, oy - y0 * px + 1);
          g.save(); g.beginPath(); g.rect(x0, y0, (cw - 2) / px, (ch - 2) / px); g.clip();                 // a frame never bleeds into its neighbour
          src.paint(g, wt); g.restore();
        }
        Object.assign(BOOKS[job.key], { ready: true, cv, n: src.n, cols, cw, ch, px, x0: x0 - 1 / px, y0: y0 - 1 / px, uw: cw / px, uh: ch / px });
        perf.bakes++;
        return true;
      }
      // blit frame `wt` of a book at (x, y): u = design px per creature unit; fx / fy flip or squash it
      function drawBook(g, b, wt, x, y, u, fx, fy, blend){
        const fk = (((wt / TAU) % 1) + 1) % 1 * b.n, k = Math.floor(fk) % b.n;
        g.setTransform(BT * u * fx, 0, 0, BT * u * (fy === undefined ? 1 : fy), BT * x + BX, BT * y + BY);
        g.drawImage(b.cv, (k % b.cols) * b.cw, Math.floor(k / b.cols) * b.ch, b.cw, b.ch, b.x0, b.y0, b.uw, b.uh);
        perf.blits++; perf.area += b.uw * b.uh * u * u * Math.abs(fx);
        if (blend){                                            // an opaque creature in a slow loop: the next frame fades in over this one
          const f = fk - Math.floor(fk), k2 = (k + 1) % b.n, a0 = g.globalAlpha;
          if (f > 0.04){ g.globalAlpha = a0 * f; g.drawImage(b.cv, (k2 % b.cols) * b.cw, Math.floor(k2 / b.cols) * b.ch, b.cw, b.ch, b.x0, b.y0, b.uw, b.uh); g.globalAlpha = a0; perf.blits++; perf.area += b.uw * b.uh * u * u * Math.abs(fx); }
        }
      }
      const baseT = g => g.setTransform(BT, 0, 0, BT, BX, BY);

      // ══════════════════════════════════════════════════════════════════════
      // THE REEF FISH — one painter, the species as data (q42). Unit space: the
      // nose at +50, the tail's root at −38, facing +x; bh / bl = the body's
      // half heights above and below its axis. A fish is painted the way the
      // reef is: light from above (a pale sheen on the back, a shaded belly),
      // fins that are membranes with rays in them, an eye with an iris. The
      // loop is baked; the body's S-bend is put in afterwards, strip by strip.
      // ══════════════════════════════════════════════════════════════════════
      const topAt = (sp, x) => x > sp.px ? -sp.bh * Math.sqrt(Math.max(0, 1 - Math.pow((x - sp.px) / (52 - sp.px), 2.4))) : -lerp(sp.bh, sp.pd, smooth((sp.px - x) / (sp.px + 38)));
      const botAt = (sp, x) => x > sp.px ? sp.bl * Math.sqrt(Math.max(0, 1 - Math.pow((x - sp.px) / (52 - sp.px), 2.4))) : lerp(sp.bl, sp.pd, smooth((sp.px - x) / (sp.px + 38)));
      function fishBody(g, sp){
        const bh = sp.bh, bl = sp.bl, px = sp.px, pd = sp.pd, ny = sp.ny;
        g.beginPath(); g.moveTo(50, ny);
        g.bezierCurveTo(sp.hu[0], -bh * sp.hu[1], px + 24, -bh, px, -bh); g.bezierCurveTo(px - 26, -bh, -28, -pd - 4, -38, -pd);
        g.lineTo(-38, pd);
        g.bezierCurveTo(-28, pd + 4, px - 26, bl, px, bl); g.bezierCurveTo(px + 24, bl, sp.hl[0], bl * sp.hl[1], 50, ny);
        g.closePath();
      }
      // the tail fin: part 0 = its whole outline, 1 = the trailing edge alone, 2 = the upper and lower edges alone
      function tailPath(g, T, pd, part){
        const l = T.l, h = T.h, k = T.k;
        const tip = k === 'fan' ? [-l * 0.84, h * 0.82] : k === 'lyre' ? [-l * 1.3, h * 0.96] : k === 'lunate' ? [-l * 1.05, h] : [-l, h];
        const c1 = k === 'fan' ? [-l * 0.45, h * 0.95] : k === 'trunc' ? [-l * 0.5, h * 0.8] : k === 'lunate' ? [-l * 0.4, h * 0.7] : k === 'lyre' ? [-l * 0.5, h * 0.7] : [-l * 0.5, h * 0.55];
        g.beginPath();
        if (part !== 1){ g.moveTo(2, -pd); g.quadraticCurveTo(c1[0], -c1[1], tip[0], -tip[1]); } else g.moveTo(tip[0], -tip[1]);
        if (part !== 2){
          if (k === 'fan') g.quadraticCurveTo(-l * 1.14, 0, tip[0], tip[1]);
          else if (k === 'trunc') g.quadraticCurveTo(-l * 0.88, 0, tip[0], tip[1]);
          else if (k === 'lunate') g.quadraticCurveTo(-l * 0.46, 0, tip[0], tip[1]);
          else { const n = k === 'lyre' ? -l * 0.6 : -l * 0.44; g.quadraticCurveTo(n - l * 0.1, -h * 0.34, n, 0); g.quadraticCurveTo(n - l * 0.1, h * 0.34, tip[0], tip[1]); }
        } else g.moveTo(tip[0], tip[1]);
        if (part !== 1){ g.quadraticCurveTo(c1[0], c1[1], 2, pd); if (!part) g.closePath(); }
      }
      // a fin along the back (up = −1) or the belly (+1): F = { a, b: where its base starts and ends, h: height,
      // tip: how far its rear trails, k: its shape, col, rim, spot }
      function backFin(g, sp, F, up, fl){
        const n = 9, B = [], E = [];
        for (let i = 0; i < n; i++){
          const u = i / (n - 1), x = lerp(F.a, F.b, u), yb = up < 0 ? topAt(sp, x) : botAt(sp, x);
          let p = F.k === 'two' ? (u < 0.46 ? 0.4 + 0.5 * Math.sin(Math.PI * u / 0.46) : 0.4 + 0.6 * Math.sin(Math.PI * (u - 0.46) / 0.54 * 0.85 + 0.1))
                : F.k === 'low' ? smooth(u / 0.16) * (1 - 0.45 * u)
                : F.k === 'rise' ? smooth(u / 0.3) * (0.5 + 0.5 * u)
                : smooth(u / 0.3) * (1 - 0.12 * u);
          if (i === n - 1) p *= F.end === undefined ? 0.5 : F.end;
          B.push([x, yb]); E.push([x - F.tip * u * u + fl * u * 1.4, yb + up * F.h * p]);
        }
        const edge = () => { g.moveTo(E[0][0], E[0][1]); for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(E[i][0], E[i][1], (E[i][0] + E[i + 1][0]) / 2, (E[i][1] + E[i + 1][1]) / 2); g.lineTo(E[n - 1][0], E[n - 1][1]); };
        g.beginPath(); edge(); for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1] * 0.6); g.closePath();
        const y0 = up < 0 ? -sp.bh - F.h : sp.bl + F.h, y1 = up < 0 ? -sp.bh * 0.5 : sp.bl * 0.5;
        g.fillStyle = lg(g, 0, y0, 0, y1, [[0, rgb(mixc(F.col, '#FFFFFF', 0.28), 0.9)], [0.7, rgb(F.col, 0.97)], [1, rgb(F.col)]]); g.fill();
        if (!sp.tiny){ g.strokeStyle = rgb(mixc(F.col, '#FFFFFF', 0.55), 0.5); g.lineWidth = 0.7; g.beginPath(); for (let i = 1; i < n; i++){ g.moveTo(B[i][0], B[i][1]); g.lineTo(E[i][0], E[i][1]); } g.stroke(); }
        if (F.rim){ g.strokeStyle = F.rim; g.lineWidth = F.rw || 1.6; g.lineJoin = 'round'; g.beginPath(); edge(); g.stroke(); }
        if (F.spot){ const i = Math.round(F.spot[0] * (n - 1)), x = lerp(B[i][0], E[i][0], 0.62), y = lerp(B[i][1], E[i][1], 0.62); g.fillStyle = F.spot[2]; g.beginPath(); g.arc(x, y, F.spot[1], 0, TAU); g.fill(); }
      }
      function paintFish(g, sp, wt, gape){
        const bh = sp.bh, bl = sp.bl, pd = sp.pd, ny = sp.ny, fl = Math.sin(wt * 2), T = sp.tail, tw = 0.6 + 0.4 * Math.pow(Math.cos(wt - 2.4), 2);
        // the tail: it sweeps toward and away from the eye, so it narrows and leans
        g.save(); g.translate(-36, 0); g.rotate(Math.sin(wt - 2.6) * 0.15); g.scale(tw, 1);
        tailPath(g, T, pd, 0); g.fillStyle = lg(g, -T.l, 0, 4, 0, [[0, rgb(mixc(T.col, '#FFFFFF', 0.3), 0.86)], [0.7, rgb(T.col, 0.96)], [1, rgb(T.col)]]); g.fill();
        if (!sp.tiny){ g.strokeStyle = rgb(mixc(T.col, '#FFFFFF', 0.55), 0.5); g.lineWidth = 0.7; g.beginPath(); for (let i = -3; i <= 3; i++){ g.moveTo(0, i * pd * 0.3); g.lineTo(-T.l * 0.86, i / 3 * T.h * 0.78); } g.stroke(); }
        if (T.marg){ g.save(); tailPath(g, T, pd, 0); g.clip(); g.strokeStyle = T.marg; g.lineWidth = T.mw || 7; tailPath(g, T, pd, 2); g.stroke(); g.restore(); }
        if (T.rim){ g.save(); tailPath(g, T, pd, 0); g.clip(); g.strokeStyle = T.rim; g.lineWidth = T.rw || 3.4; tailPath(g, T, pd, 1); g.stroke(); g.restore(); }
        g.restore();
        // the fins behind the body: dorsal, anal, pelvic
        if (sp.dorsal) backFin(g, sp, sp.dorsal, -1, fl);
        if (sp.anal) backFin(g, sp, sp.anal, 1, -fl);
        if (sp.streamer){                                      // the long thread of its dorsal fin, trailing
          g.strokeStyle = sp.streamer; g.lineCap = 'round'; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -bh - 14); g.bezierCurveTo(-8, -bh - 30, -26, -bh - 34 + fl * 2, -42, -bh - 26 + fl * 3); g.stroke();
          g.lineWidth = 1; g.beginPath(); g.moveTo(-41, -bh - 26.5 + fl * 3); g.quadraticCurveTo(-56, -bh - 18 + fl * 5, -64, -bh - 4 + fl * 7); g.stroke();
        }
        { const yb = botAt(sp, 12), c = sp.pelv || (sp.anal ? sp.anal.col : sp.mid);
          g.fillStyle = rgb(c, 0.94); g.beginPath(); g.moveTo(15, yb - 3); g.quadraticCurveTo(9, yb + 11, -3, yb + 13 + fl); g.quadraticCurveTo(3, yb + 3, 4, yb - 3); g.closePath(); g.fill(); }
        // the body: its own colours from back to belly, its markings, then the light
        fishBody(g, sp); g.fillStyle = lg(g, 0, -bh, 0, bl, [[0, sp.back], [0.45, sp.mid], [1, sp.belly]]); g.fill();
        g.save(); fishBody(g, sp); g.clip();
        if (sp.pat) PAT[sp.pat](g, sp);
        if (!sp.tiny){                                         // scales: a faint net of small arcs
          g.strokeStyle = 'rgba(255,255,255,0.11)'; g.lineWidth = 0.7; g.beginPath();
          for (let r0 = 0, y = -bh + 3; y < bl; y += 5.2, r0++) for (let x = 22 - (r0 % 2) * 3; x > -36; x -= 6){ g.moveTo(x + 3.2 * Math.cos(-1), y + 3.2 * Math.sin(-1)); g.arc(x, y, 3.2, -1, 1); }
          g.stroke();
        }
        g.fillStyle = lg(g, 0, -bh, 0, bl, [[0, 'rgba(8,16,70,0.2)'], [0.16, 'rgba(8,16,70,0)'], [0.6, 'rgba(8,16,70,0)'], [1, 'rgba(10,18,84,0.36)']]); g.fillRect(-42, -bh - 2, 96, bh + bl + 4);
        softEllipse(g, 6, -bh * 0.52, 30, Math.max(3, bh * 0.24), [255, 255, 255], sp.sheen === undefined ? 0.42 : sp.sheen);                       // the sun along its back
        softEllipse(g, 34, -bh * 0.34, 9, Math.max(2.4, bh * 0.2), [255, 255, 255], 0.22);
        if (!sp.tiny){ g.strokeStyle = 'rgba(16,16,50,0.22)'; g.lineWidth = 1.1; g.beginPath(); g.arc(18, 0, Math.max(9, bl * 0.72), -1.05, 1.05); g.stroke(); }      // the gill cover
        if (!sp.tiny && !sp.beak && !gape){ g.strokeStyle = 'rgba(30,18,40,0.5)'; g.lineWidth = 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, ny + 0.8); g.quadraticCurveTo(46.6, ny + 2.8, 43.4, ny + 1.6); g.stroke(); }
        g.restore();
        fishBody(g, sp); g.strokeStyle = rgb(mixc(sp.back, [10, 10, 40], 0.5), 0.4); g.lineWidth = 0.9; g.stroke();
        // the pectoral fin, fluttering
        g.save(); g.translate(17, bl * 0.2); g.rotate(0.55 + fl * 0.28);
        g.fillStyle = rgb(sp.pect || sp.mid, 0.8); g.beginPath(); g.moveTo(0, -1.4); g.quadraticCurveTo(-11, -8, -21, -1); g.quadraticCurveTo(-22, 5, -13, 7); g.quadraticCurveTo(-5, 6, 0, 2.6); g.closePath(); g.fill();
        if (sp.pectTip){ g.fillStyle = sp.pectTip; g.beginPath(); g.ellipse(-17, 1.6, 4.6, 5, 0, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = 0.6; g.beginPath(); for (let i = 0; i < 5; i++){ g.moveTo(-1, 0.6); g.lineTo(-19 + i, -3.4 + i * 2.3); } g.stroke();
        g.restore();
        // the mouth (a beak, on the parrotfish), the eye
        if (sp.beak){ g.fillStyle = '#F6F0D2'; g.beginPath(); g.moveTo(50.5, ny); g.quadraticCurveTo(45, ny - 6.5, 40, ny - 2.4); g.lineTo(44.5, ny + 0.6); g.lineTo(40.5, ny + 3.6); g.quadraticCurveTo(45, ny + 7, 50.5, ny); g.fill(); }
        if (gape){ g.fillStyle = '#4A1626'; g.beginPath(); g.ellipse(47.4, ny + 1.6, 2.6 + gape * 2, 1.8 + gape * 3, 0, 0, TAU); g.fill(); }
        const ex = sp.ex, ey = sp.ey, er = sp.er;
        g.fillStyle = 'rgba(16,12,36,0.6)'; g.beginPath(); g.arc(ex, ey, er + 0.8, 0, TAU); g.fill();
        g.fillStyle = rg(g, ex - er * 0.2, ey - er * 0.3, er * 0.2, er, [[0, rgb(mixc(sp.iris, '#FFFFFF', 0.45))], [0.7, sp.iris], [1, rgb(mixc(sp.iris, '#201020', 0.45))]]); g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
        g.fillStyle = '#0C0A1A'; g.beginPath(); g.arc(ex + er * 0.1, ey, er * 0.58, 0, TAU); g.fill();
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex + er * 0.36, ey - er * 0.32, er * 0.24, 0, TAU); g.fill();
        g.globalAlpha = 0.5; g.beginPath(); g.arc(ex - er * 0.2, ey + er * 0.34, er * 0.12, 0, TAU); g.fill(); g.globalAlpha = 1;
      }

      // ── the species. len = design px nose to tail root at CS 1; the rest is the
      //    painter's data (see q41). `tiny` fish (the schools) skip the fine detail.
      const K0 = '#16121C';
      const FISH = {
        clown:   { len: 70,  bh: 21, bl: 21, px: 8,  hu: [47, 0.75], hl: [46, 0.7],  back: '#EE6418', mid: '#FF8626', belly: '#FFAE5C', iris: '#C8641E', pat: 'clown', pect: '#FF9434', ex: 35,
                   dorsal: { a: 30, b: -30, h: 11, tip: 4, k: 'two', col: '#FF8626', rim: K0, rw: 2 }, anal: { a: 0, b: -30, h: 10, tip: 4, col: '#FF8626', rim: K0, rw: 2 }, tail: { k: 'fan', l: 24, h: 17, col: '#FF8A2A', rim: K0, rw: 4 } },
        dory:    { len: 104, bh: 27, bl: 25, px: 6,  hu: [45, 0.7],  hl: [44, 0.62], back: '#1C48D8', mid: '#2A66F0', belly: '#4C8AFF', iris: '#2A2A40', pat: 'dory', pect: '#2A66F0', pectTip: '#FFD63A',
                   dorsal: { a: 28, b: -32, h: 9, tip: 3, col: '#2A5CE8', rim: '#10183A' }, anal: { a: 2, b: -32, h: 8, tip: 3, col: '#2A5CE8', rim: '#10183A' }, tail: { k: 'trunc', l: 26, h: 19, col: '#FFD63A', marg: '#10183A' } },
        ytang:   { len: 84,  bh: 33, bl: 31, px: 4,  hu: [38, 0.3],  hl: [38, 0.34], ny: 2, back: '#FFC410', mid: '#FFD92E', belly: '#FFEA70', iris: '#B8862A', pat: 'ytang', sheen: 0.5,
                   dorsal: { a: 26, b: -30, h: 17, tip: 10, col: '#FFD21E', rim: '#E6A810' }, anal: { a: 6, b: -30, h: 15, tip: 10, col: '#FFD21E', rim: '#E6A810' }, tail: { k: 'lunate', l: 22, h: 18, col: '#FFDA36', rim: '#E6A810', rw: 2 } },
        angel:   { len: 118, bh: 34, bl: 32, px: 6,  hu: [46, 0.72], hl: [45, 0.66], back: '#2038B0', mid: '#2A50CC', belly: '#3A66DA', iris: '#201C3A', pat: 'emperor', pect: '#F2C420',
                   dorsal: { a: 30, b: -30, h: 13, tip: 14, k: 'rise', col: '#F2C420', rim: '#EAF6FF', end: 0.7 }, anal: { a: 2, b: -30, h: 13, tip: 12, k: 'rise', col: '#2038B0', rim: '#58C0FF', end: 0.7 }, tail: { k: 'fan', l: 24, h: 18, col: '#F6C61E', rim: '#FFF0A0', rw: 2 } },
        bfly:    { len: 80,  bh: 32, bl: 30, px: 4,  hu: [36, 0.16], hl: [38, 0.3],  ny: 2, back: '#F4F4EC', mid: '#FFFFFF', belly: '#FFFDF2', iris: '#2A2430', pat: 'bfly', pect: '#FFF6D0',
                   dorsal: { a: 26, b: -30, h: 14, tip: 10, col: '#FFD026', rim: K0, rw: 1.2, spot: [0.8, 3.4, K0] }, anal: { a: 6, b: -30, h: 13, tip: 9, col: '#FFD026', rim: K0, rw: 1.2 }, tail: { k: 'fan', l: 20, h: 15, col: '#FFD83A', rim: 'rgba(255,255,255,0.8)', rw: 3 } },
        idol:    { len: 86,  bh: 36, bl: 34, px: 6,  hu: [34, 0.05], hl: [36, 0.2],  ny: 4, back: '#F6F2E4', mid: '#FFFFFF', belly: '#FFFFFF', iris: '#3A2A20', pat: 'idol', pect: '#3A3440', streamer: '#FFFFFF', top: 40, ey: -9,
                   dorsal: { a: 22, b: -30, h: 24, tip: 22, k: 'rise', col: '#F4F0E2', rim: K0, rw: 1.4, end: 0.4 }, anal: { a: 4, b: -30, h: 20, tip: 16, k: 'rise', col: '#2A2630', rim: '#FFFFFF', rw: 1.4, end: 0.4 }, tail: { k: 'trunc', l: 20, h: 15, col: '#1E1A24', rim: '#FFFFFF', rw: 3 } },
        parrot:  { len: 126, bh: 28, bl: 27, px: 12, hu: [50, 0.86], hl: [49, 0.8],  back: '#1AA898', mid: '#34C4AE', belly: '#92E6C8', iris: '#F0A040', pat: 'parrot', pect: '#5AD0E8', beak: 1,
                   dorsal: { a: 30, b: -30, h: 8, tip: 2, k: 'low', col: '#FF8FB8', rim: '#3AA6E6' }, anal: { a: -2, b: -30, h: 7, tip: 2, k: 'low', col: '#FF8FB8', rim: '#3AA6E6' }, tail: { k: 'lyre', l: 26, h: 20, col: '#2EBEAE', marg: '#FF8FB8', mw: 6 } },
        gramma:  { len: 58,  bh: 19, bl: 18, px: 10, hu: [46, 0.7],  hl: [45, 0.66], back: '#8A36DC', mid: '#A452F0', belly: '#B870F6', iris: '#3A2A50', pat: 'gramma', pect: '#C89AF6',
                   dorsal: { a: 28, b: -30, h: 8, tip: 4, k: 'low', col: '#B060F0', spot: [0.12, 2.2, K0] }, anal: { a: 0, b: -30, h: 7, tip: 4, k: 'low', col: '#FFD032' }, tail: { k: 'fan', l: 20, h: 13, col: '#FFD032' } },
        anthias: { len: 46,  bh: 17, bl: 16, px: 10, hu: [46, 0.7],  hl: [45, 0.66], back: '#FF6E2A', mid: '#FF944A', belly: '#FFC47E', iris: '#7A4AD0', pat: 'anthias', pect: '#FFB070', tiny: 1,
                   dorsal: { a: 26, b: -30, h: 9, tip: 4, k: 'low', col: '#FF8A3E', rim: '#C86AF0', rw: 1.2 }, anal: { a: 0, b: -30, h: 7, tip: 4, k: 'low', col: '#FF8A3E', rim: '#C86AF0', rw: 1.2 }, tail: { k: 'lyre', l: 22, h: 16, col: '#FF8436' } },
        chromis: { len: 40,  bh: 17, bl: 16, px: 8,  hu: [46, 0.72], hl: [45, 0.68], back: '#2EBAD2', mid: '#62DCE0', belly: '#BAF6EC', iris: '#2A6A8A', pect: '#8AE8E8', tiny: 1,
                   dorsal: { a: 26, b: -30, h: 7, tip: 3, k: 'low', col: '#4ACCE0' }, anal: { a: 0, b: -30, h: 6, tip: 3, k: 'low', col: '#4ACCE0' }, tail: { k: 'fork', l: 20, h: 14, col: '#56D2E2' } },
        fusil:   { len: 54,  bh: 13, bl: 12, px: 10, hu: [44, 0.6],  hl: [44, 0.56], back: '#2A7EDC', mid: '#62AEF0', belly: '#E6F2FA', iris: '#3A4A6A', pat: 'fusil', pect: '#9CCCF6', tiny: 1, ey: -2,
                   dorsal: { a: 22, b: -30, h: 5, tip: 2, k: 'low', col: '#4A96E6' }, anal: { a: -4, b: -30, h: 4, tip: 2, k: 'low', col: '#BFE0FA' }, tail: { k: 'fork', l: 22, h: 14, col: '#58A6EE', rim: '#18305A', rw: 3 } },
        wrasse:  { len: 62,  bh: 10, bl: 9.5, px: 10, hu: [44, 0.56], hl: [44, 0.5], back: '#7CC8FF', mid: '#EAF6FF', belly: '#FFFFFF', iris: '#3A3A50', pat: 'wrasse', pect: '#CFE8FF', ey: -2, er: 3.4,
                   dorsal: { a: 26, b: -32, h: 4.4, tip: 1, k: 'low', col: '#5AB0FF' }, anal: { a: -6, b: -32, h: 3.6, tip: 1, k: 'low', col: '#BFE0FF' }, tail: { k: 'fan', l: 18, h: 10, col: '#14182C', marg: '#4AA0FF', mw: 3 } },
      };
      for (const k in FISH){ const sp = FISH[k]; sp.pd = sp.pd || Math.min(6.5, sp.bh * 0.3); sp.ny = sp.ny || 1; sp.ex = sp.ex || 33; sp.ey = sp.ey === undefined ? -sp.bh * 0.24 : sp.ey; sp.er = sp.er || clamp(3.6 + sp.bh * 0.08, 4, 6.4); sp.bend = sp.bend || 3.2; }
      // the markings, painted inside the body's outline
      const PAT = {
        clown(g, sp){ const h = sp.bh * 1.3, B = [[23, 5.8, 0.12], [-4, 7.4, 0.04], [-31.5, 4.4, 0]];
          g.fillStyle = K0; for (const b of B){ g.beginPath(); g.ellipse(b[0], 0, b[1] + 2, h, b[2], 0, TAU); g.fill(); }
          g.fillStyle = '#FFFDF6'; for (const b of B){ g.beginPath(); g.ellipse(b[0], 0, b[1], h, b[2], 0, TAU); g.fill(); } },
        dory(g, sp){ const h = sp.bh;
          g.fillStyle = '#0E1430'; g.beginPath(); g.moveTo(36, -h * 0.26); g.bezierCurveTo(27, -h * 0.98, -10, -h * 1.06, -40, -sp.pd - 1); g.lineTo(-40, 2.4); g.bezierCurveTo(-24, 3, -18, h * 0.06, -4, h * 0.13);
          g.bezierCurveTo(8, h * 0.2, 20, h * 0.1, 24, -h * 0.12); g.bezierCurveTo(27, -h * 0.3, 31, -h * 0.3, 36, -h * 0.26); g.fill();
          g.fillStyle = lg(g, 0, -h * 0.6, 0, 0, [[0, '#3272F6'], [1, '#2458E0']]); g.beginPath(); g.ellipse(-3, -h * 0.37, 15, h * 0.2, -0.08, 0, TAU); g.fill(); },
        ytang(g, sp){ g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(26, -3); g.quadraticCurveTo(0, -8, -30, -2); g.stroke(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(-32, 0, 5, 1.6, 0, 0, TAU); g.fill(); },
        emperor(g, sp){ const h = sp.bh;
          g.strokeStyle = '#F6CE2A'; g.lineWidth = 2.5; for (let i = -6; i <= 6; i++){ g.beginPath(); g.moveTo(20, i * 5.6 - 2); g.bezierCurveTo(2, i * 6.4 - 5, -20, i * 6.2 - 4, -42, i * 4.2); g.stroke(); }
          g.fillStyle = '#DDECF4'; g.beginPath(); g.ellipse(48, 4, 19, h * 1.2, 0, 0, TAU); g.fill();
          for (const m of [[32, -4, 6.4, 1.2, 0.12], [19.5, 7, 5, 0.6, 0.1]]){ g.fillStyle = '#101A4A'; g.beginPath(); g.ellipse(m[0], m[1], m[2], h * m[3], m[4], 0, TAU); g.fill(); g.strokeStyle = '#3AB6FF'; g.lineWidth = 1.4; g.stroke(); } },
        bfly(g, sp){ const h = sp.bh;
          g.fillStyle = lg(g, 12, 0, -36, 0, [[0, 'rgba(255,212,40,0)'], [0.6, '#FFD428'], [1, '#FFC81E']]); g.fillRect(-42, -h - 2, 60, h * 2 + 4);
          g.strokeStyle = 'rgba(40,40,60,0.36)'; g.lineWidth = 1.1;
          for (let i = 0; i < 6; i++){ g.beginPath(); g.moveTo(22 - i * 7, -h); g.lineTo(34 - i * 7, -2); g.stroke(); }
          for (let i = 0; i < 8; i++){ g.beginPath(); g.moveTo(22 - i * 7, -4); g.lineTo(4 - i * 7, h); g.stroke(); }
          g.fillStyle = K0; g.beginPath(); g.ellipse(33, 0, 4.2, h * 1.2, 0.14, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(26.6, 0, 1.5, h * 1.1, 0.14, 0, TAU); g.fill(); },
        idol(g, sp){ const h = sp.bh;
          g.fillStyle = lg(g, 6, 0, -14, 0, [[0, 'rgba(255,226,110,0)'], [1, '#FFE272']]); g.fillRect(-14, -h - 2, 22, h * 2 + 4);
          g.fillStyle = K0; g.beginPath(); g.ellipse(23, 0, 9.5, h * 1.3, 0.1, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-22, 0, 9, h * 1.3, 0.16, 0, TAU); g.fill();
          g.fillStyle = '#FFD23C'; g.fillRect(-42, -9, 9, 18); g.fillStyle = '#FF8A2A'; g.beginPath(); g.ellipse(43, 0.5, 5.4, 2.6, -0.3, 0, TAU); g.fill(); },
        parrot(g, sp){ const h = sp.bh;
          g.strokeStyle = 'rgba(255,130,180,0.72)'; g.lineWidth = 1.3; for (let r0 = 0; r0 < 6; r0++) for (let c0 = 0; c0 < 9; c0++){ g.beginPath(); g.arc(24 - c0 * 8 - (r0 % 2) * 4, -h + 6 + r0 * 9.4, 5, -1, 1); g.stroke(); }
          g.fillStyle = 'rgba(255,214,90,0.5)'; g.beginPath(); g.ellipse(6, h * 0.56, 26, 7, 0, 0, TAU); g.fill();
          g.strokeStyle = '#FF86B4'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(42, -5); g.quadraticCurveTo(34, -9, 25, -5); g.moveTo(43, 8); g.quadraticCurveTo(35, 11, 27, 8); g.stroke(); },
        gramma(g, sp){ g.fillStyle = lg(g, 12, 0, -22, 0, [[0, 'rgba(255,208,50,0)'], [1, '#FFD032']]); g.fillRect(-42, -sp.bh - 2, 56, sp.bh * 2 + 4); g.strokeStyle = 'rgba(30,20,50,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(48, 0); g.lineTo(26, -8); g.stroke(); },
        anthias(g, sp){ g.strokeStyle = '#B45AF0'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, -1); g.lineTo(17, 6); g.stroke(); },
        fusil(g, sp){ g.strokeStyle = '#FFD83A'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, -6); g.quadraticCurveTo(0, -9, -40, -3); g.stroke(); g.strokeStyle = 'rgba(210,236,255,0.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(38, -3); g.quadraticCurveTo(0, -5.6, -40, 0); g.stroke(); },
        wrasse(g, sp){ g.fillStyle = '#12162A'; g.beginPath(); g.moveTo(49, -0.6); g.quadraticCurveTo(0, -4.6, -40, -6.4); g.lineTo(-40, 5.4); g.quadraticCurveTo(0, 3, 49, 1.8); g.fill(); },
      };
      const FISH_BOX = sp => [-(44 + sp.tail.l * 1.32), -(sp.bh + (sp.top || sp.dorsal.h + 4) + sp.bend + 3), 58, sp.bl + sp.anal.h + sp.bend + 8];
      // a fish's book: `haze` (0..1) = how much of the water's colour it has taken (the far schools)
      const fishBook = (kind, haze) => book('fish:' + kind + (haze ? ':h' : ''), () => { const sp = FISH[kind], box = FISH_BOX(sp);
        return { n: sp.tiny ? 8 : 10, box, warp: (wt, x) => { const k = clamp01((50 - x) / 96); return Math.sin(wt - k * 2.2) * sp.bend * k * k; },
                 paint: (g, wt) => { paintFish(g, sp, wt, 0); if (haze){ g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgb(waterAt(420), haze); g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]); g.globalCompositeOperation = 'source-over'; } } }; },
        FISH[kind].len / 100 * CS * LD * (haze ? 0.8 : 1.2));
      // a hero rig's book: frames rendered by its own draw (see reef_rigs/ — the cruise look is a pure function of wt)
      function rigBook(rigName, coat, size, extra, frames){
        const R = window[rigName]; if (!R || !R.BOX) return null;
        const box = extra && extra.puff && R.BOX_PUFF ? R.BOX_PUFF : R.BOX;
        return book(rigName + ':' + coat + (extra ? ':' + JSON.stringify(extra) : ''), () => ({ n: frames || R.FRAMES || 10, box,
          paint: (g, wt) => R.draw(g, Object.assign({ x: 0, y: 0, s: 1, dir: 1, wt, pose: 0, coat, tint: 1, lit: [1, 1, 1] }, extra || {}), 0) }), size / (R.LEN || 100) * LD * 1.1);
      }


      // ══════════════════════════════════════════════════════════════════════
      // THE CAST — who lives here, and how they move
      // ══════════════════════════════════════════════════════════════════════
      let rigsReady = false, autoCast = true;
      const ACTORS = [];                                       // everything that swims, sits or scuttles
      const ORBIT = { arrived: 0, passed: 0, stale: 0 };       // how targets were retired (stale should stay 0)
      const castCap = () => (narrow ? 27 : 52) - (Q === 0 ? 10 : 0);
      const WATER_TOP = 110, WATER_BOT = SAND - 60;
      // a swimmer: steers toward a target inside its zone; the target is retired on
      // arrival, once it has been passed, or after a travel-time-scaled timeout —
      // so nobody can orbit a point it cannot turn tightly enough to reach
      function newTarget(a, t){
        const z = a.zone;
        a.tx = clamp(z.x + rnd(-1, 1) * z.rx, 30, DW - 30); a.ty = clamp(z.y + rnd(-1, 1) * z.ry, WATER_TOP, SAND - 24);
        const d = Math.hypot(a.tx - a.x, a.ty - a.y);
        a.tMax = t + d / Math.max(20, a.speed) * 1.7 + 2.5; a.best = d; a.soft = false;
      }
      function steer(a, t, dt, sp){
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1;
        const goal = Math.max(26, 1.6 * sp / a.turn);
        if (d < goal){ ORBIT.arrived++; a.arrive ? a.arrive(a, t) : newTarget(a, t); }
        else if (d > a.best + 22 && d < 220){ ORBIT.passed++; a.arrive ? a.arrive(a, t) : newTarget(a, t); }
        else if (t > a.tMax){ if (!a.soft) ORBIT.stale++; newTarget(a, t); }
        if (d < a.best) a.best = d;
        const k = Math.min(1, a.turn * dt);
        a.vx += (dx / d * sp - a.vx) * k; a.vy += (dy / d * sp * 0.8 - a.vy) * k;
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (Math.abs(a.vx) > 5) a.dir = a.vx > 0 ? 1 : -1;
        a.face += (a.dir - a.face) * Math.min(1, dt * 7);         // a turn thins the fish through zero
        a.wt += dt * TAU * (0.9 + Math.hypot(a.vx, a.vy) / Math.max(30, a.len) * 1.5);
      }
      function makeFish(kind, x, y, zone, o){
        o = o || {};
        const sp = FISH[kind], len = sp.len * CS * (o.k || 1);
        const a = { type: 'fish', kind, sp, len, u: len / 100, x, y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 1 : -1, face: 1, wt: Math.random() * TAU,
                    speed: (o.speed || 46) * CS, turn: o.turn || 2.2, zone, layer: o.layer === undefined ? 2 : o.layer, act: null, role: o.role || 'roam',
                    appear: 0, poopAt: rnd(40, 200), haze: o.haze || 0, lead: null, spots: null, cs: null, fy: 1, rot: 0, tx: x, ty: y, tMax: 0, best: 1e9 };
        a.face = a.dir; newTarget(a, 0); return a;
      }
      function makeRig(kind, rigName, size, x, y, o){
        o = o || {};
        const R = window[rigName]; if (!R) return null;
        const coat = o.coat || pick(R.COATS || ['']);
        return { type: 'rig', kind, rigName, R, coat, len: size, u: size / (R.LEN || 100), x, y, vx: 0, vy: 0, dir: o.dir || 1, face: o.dir || 1, wt: Math.random() * TAU,
                 speed: (o.speed || 30) * CS, turn: o.turn || 1.4, zone: o.zone || null, layer: o.layer === undefined ? 2 : o.layer, act: null, role: o.role || kind,
                 appear: 0, fy: 1, rot: 0, extra: o.extra || null, tx: x, ty: y, tMax: 0, best: 1e9, cps: o.cps || 0.5, frames: o.frames || 0, blend: !!o.blend };
      }
      const bookOf = a => a.type === 'fish' ? fishBook(a.kind, a.haze) : rigBook(a.rigName, a.coat, a.len, a.extra, a.frames);

      // ── the residents. Each keeps to its own part of the reef: the clownfish to
      //    their anemones, the tangs over the crests, the angelfish and the grammas
      //    along the reef's faces, a cloud of anthias over the right-hand crest, a
      //    school of chromis weaving behind the sea fans, a far school of fusiliers
      //    already the colour of the water, the wrasse at its station
      const CLEAN_KINDS = ['dory', 'bfly', 'ytang', 'angel', 'parrot', 'gramma', 'idol'];
      let school = null, wrasse = null, octo = null, horse = null, puffer = null;
      function buildCast(){
        ACTORS.length = 0; school = wrasse = octo = horse = puffer = null;
        const lx0 = Math.max(0, LEFT.x0), lw = LEFT.x1 - lx0, lc = lx0 + lw * 0.5, rx1 = Math.min(DW, RIGHT.x1), rw = rx1 - RIGHT.x0, rc = RIGHT.x0 + rw * 0.5;
        const crestL = leftY(lc), crestR = rightY(rc);
        const open = { x: DW / 2, y: narrow ? 320 : 400, rx: DW * 0.46, ry: narrow ? 190 : 260 };
        const leftTop = { x: lc, y: crestL - 70, rx: lw * 0.5, ry: 70 }, rightTop = { x: rc, y: crestR - 60, rx: rw * 0.46, ry: 70 };
        const leftFace = { x: lc, y: (crestL + SAND) / 2, rx: lw * 0.46, ry: (SAND - crestL) * 0.36 }, rightFace = { x: rc, y: (crestR + SAND) / 2 + 30, rx: rw * 0.44, ry: (SAND - crestR) * 0.34 };
        const add = a => { if (a && ACTORS.length < castCap()) ACTORS.push(a); return a; };
        const group = (kind, n, x, y, zone, o) => {             // a leader wanders, the rest hold loose slots behind it (one shared book)
          const lead = add(makeFish(kind, x, y, zone, o)); if (!lead) return null;
          const all = [lead];
          for (let i = 1; i < n; i++){ const f = add(makeFish(kind, x - i * 16, y + (i % 3 - 1) * 14, zone, Object.assign({}, o, { speed: o.speed * 1.1, k: (o.k || 1) * (0.84 + Math.random() * 0.26) })));
            if (f){ f.lead = lead; f.slot = { dx: -(14 + i * 12) * (o.k || 1), dy: ((i * 7) % 5 - 2) * 13 * (o.k || 1) }; all.push(f); } }
          return all;
        };
        // the clownfish keep to their anemones
        ANEMS.forEach((an, i) => { for (let k = 0; k < (i === 0 && !narrow ? 2 : 1); k++){ const z = { x: an.x, y: an.y - 96 * an.s, rx: 70 * an.s, ry: 34 * an.s }; const f = add(makeFish('clown', z.x, z.y, z, { role: 'clown', speed: 30, turn: 3, k: k ? 0.8 : 1 })); if (f){ f.anem = an; f.anemI = i; } } });
        add(makeFish('dory', DW * 0.3, 360, open, { speed: 62 }));
        const b1 = add(makeFish('bfly', DW * 0.7, 420, open, { speed: 44 })), b2 = add(makeFish('bfly', DW * 0.72, 440, open, { speed: 50, k: 0.9 }));
        if (b1 && b2){ b2.follow = b1; b1.mate = b2; b2.mate = b1; }
        add(makeFish('ytang', leftTop.x, leftTop.y, leftTop, { speed: 40 }));
        add(makeFish('gramma', leftFace.x, leftFace.y, leftFace, { speed: 30, turn: 3 }));
        if (!narrow){
          add(makeFish('ytang', rightTop.x, rightTop.y, rightTop, { speed: 40, k: 0.9 }));
          add(makeFish('angel', rightFace.x, rightFace.y, { x: (DW / 2 + rc) / 2, y: 470, rx: DW * 0.3, ry: 200 }, { speed: 38, turn: 1.6 }));
          add(makeFish('parrot', DW * 0.4, 600, { x: DW / 2, y: 610, rx: DW * 0.42, ry: 110 }, { speed: 36, turn: 1.6 }));
          const i1 = add(makeFish('idol', DW * 0.36, 300, { x: (DW / 2 + lc) / 2, y: 380, rx: DW * 0.3, ry: 190 }, { speed: 42 })), i2 = add(makeFish('idol', DW * 0.34, 320, open, { speed: 46, k: 0.9 }));
          if (i1 && i2) i2.follow = i1;
          add(makeFish('gramma', rightFace.x, rightFace.y, rightFace, { speed: 30, turn: 3, k: 0.9 }));
        }
        // the far school (it takes the water's colour: it is a long way off), the chromis behind the fans, the anthias over their crest
        group('fusil', narrow ? 5 : Q === 2 ? 9 : 6, DW * 0.6, 240, { x: DW / 2, y: narrow ? 260 : 270, rx: DW * 0.56, ry: 130 }, { speed: 52, layer: -1, role: 'school', haze: 0.46, k: 0.72 });
        school = group('chromis', narrow ? 5 : Q === 2 ? 8 : 6, lc, crestL - 60, { x: lc + lw * 0.2, y: crestL - 50, rx: lw * 0.62, ry: 96 }, { speed: 54, layer: 0, role: 'school' });
        for (let i = 0, n = narrow ? 4 : Q === 2 ? 7 : 5; i < n; i++) add(makeFish('anthias', rc + rnd(-1, 1) * rw * 0.3, crestR - rnd(20, 90), { x: rc - rw * 0.06, y: crestR - 56, rx: rw * 0.4, ry: 62 }, { speed: 20, turn: 3, role: 'cloud', k: 0.8 + Math.random() * 0.35 }));
        // the cleaner wrasse keeps its station
        wrasse = add(makeFish('wrasse', STATION.x + 30, STATION.y - 46, { x: STATION.x + 20, y: STATION.y - 50, rx: 34, ry: 18 }, { role: 'wrasse', speed: 30, turn: 4 }));
        if (rigsReady){
          octo = add(makeRig('octopus', 'OctopusRig', 124 * OCTO.s, OCTO.x, OCTO.y + 5 * OCTO.s, { layer: 1, cps: 0.24, frames: 16, blend: true }));
          horse = add(makeRig('seahorse', 'SeahorseRig', 96 * HORSE.s, HORSE.x + 4, HORSE.y, { layer: 1, cps: 0.35, frames: 16, blend: true }));
          puffer = add(makeRig('puffer', 'PufferRig', 92 * CS, DW * 0.66, 520, { zone: { x: DW * (narrow ? 0.6 : 0.6), y: narrow ? 420 : 560, rx: DW * 0.2, ry: 120 }, speed: 22, turn: 1.6, cps: 0.9 }));
          if (puffer){ puffer.puff = 0; puffer.puffUntil = 0; puffer.nextPuff = rnd(60, 150); newTarget(puffer, 0); }
          const c0 = narrow ? 30 : LEFT.x1 + 40, c1 = narrow ? DW - 30 : RIGHT.x0 - 40;
          for (let i = 0, n = narrow ? 1 : 2; i < n; i++){ const c = add(makeRig('crab', 'CrabRig', 70 * CS, lerp(c0, c1, (i + 0.5) / n), 868 + i * 16, { layer: 1, speed: 36, cps: 1.2 })); if (c){ c.dir = i ? -1 : 1; c.pauseUntil = rnd(1, 4); c.x0 = c0; c.x1 = c1; } }
          for (let i = 0, n = narrow || Q < 2 ? 2 : 3; i < n; i++){ const j = add(makeRig('jelly', 'JellyRig', (96 + i * 14) * CS, DW * [0.14, 0.88, 0.5][i], 300 + i * 110, { layer: 3, cps: 0.45, frames: 24, extra: { glow: 0.6 } })); if (j){ j.vy = -(12 + i * 3); j.ph = Math.random() * TAU; j.x0 = j.x; } }
        }
      }


      // ── the visitors: a turtle, a pair of dolphins, the friendly shark — each
      //    crosses now and then; and a GIANT (a whale or an orca) high in the far
      //    water, a baked silhouette with a slow tail
      let nextTurtleAt = 20, nextDolphinAt = 45, nextSharkAt = 70, nextGiantAt = 110, giant = null;
      const visiting = kind => ACTORS.some(a => a.kind === kind);
      function spawnVisitor(kind, t, o){
        if (!rigsReady || visiting(kind)) return null;
        o = o || {};
        const dir = o.dir || (Math.random() < 0.5 ? 1 : -1);
        const cfg = { turtle: ['TurtleRig', 190, 40, 0.34, [220, 520]], dolphin: ['DolphinRig', 250, 150, 1.1, [170, 420]], shark: ['SharkRig', 270, 70, 0.7, [260, 560]] }[kind];
        const out = [];
        for (let i = 0, n = kind === 'dolphin' && !narrow ? 2 : 1; i < n; i++){
          const size = cfg[1] * CS * (i ? 0.84 : 1), y = o.y === undefined ? rnd(cfg[4][0], cfg[4][1]) : o.y;
          const a = makeRig(kind, cfg[0], size, dir > 0 ? -size * 0.7 - i * size * 0.8 : DW + size * 0.7 + i * size * 0.8, y + i * 46, { dir, speed: cfg[2], cps: cfg[3], role: 'visitor', blend: kind !== 'dolphin', frames: kind === 'turtle' ? 16 : 0 });
          if (!a) return null;
          a.base = a.y; a.ph = Math.random() * TAU; a.gone = false; ACTORS.push(a); out.push(a);
        }
        return out;
      }
      function stepVisitor(a, t, dt){
        const sp = a.speed * (a.act && a.act.type === 'dash' ? 2.4 : 1);
        a.x += a.dir * sp * dt; a.face = a.dir;
        a.y = a.base + Math.sin(t * (a.kind === 'dolphin' ? 1.3 : 0.5) + a.ph) * (a.kind === 'dolphin' ? 34 : 16);
        a.vx = a.dir * sp; a.wt += dt * TAU * a.cps * (sp / a.speed);
        if (a.kind === 'shark' && !a.act){                    // the small fish give the shark room
          for (const f of ACTORS) if (f.type === 'fish' && f.role !== 'wrasse' && f.role !== 'clown' && !f.cs && Math.abs(f.x - a.x - a.dir * 80) < 150 && Math.abs(f.y - a.y) < 110 && t > (f.fledAt || 0) + 2){
            f.fledAt = t; f.tx = clamp(f.x + (f.x < a.x ? -1 : 1) * 190, 30, DW - 30); f.ty = clamp(f.y + (f.y < a.y ? -120 : 120), WATER_TOP, SAND - 30); f.tMax = t + 4; f.best = 1e9; f.boost = t + 1.2; f.soft = true; }
        }
        return a.dir > 0 ? a.x > DW + a.len : a.x < -a.len;
      }
      // the giants are painted here (they are far and hazy — a soft silhouette is enough)
      function paintGiant(g, kind, wt){
        const fl = Math.sin(wt) * 0.22, orca = kind === 'orca';
        const hz = c => rgb(mixc(c, waterAt(210), 0.66)), back = hz(orca ? '#2A3048' : '#5E8AB4'), belly = hz(orca ? '#F4F6FA' : '#9CC0DC');
        g.save(); g.translate(-150, 0); g.rotate(fl);          // the flukes
        g.fillStyle = back; g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(-30, -8, -64, -44); g.quadraticCurveTo(-44, -2, -64, 44); g.quadraticCurveTo(-30, 8, 10, 0); g.fill(); g.restore();
        g.fillStyle = lg(g, 0, -46, 0, 46, [[0, back], [0.56, back], [0.7, belly], [1, belly]]);
        g.beginPath(); g.moveTo(170, 6); g.bezierCurveTo(150, -40, 40, -52, -60, -34); g.bezierCurveTo(-110, -22, -140, -10, -152, -6 + fl * 30); g.lineTo(-152, 8 + fl * 30);
        g.bezierCurveTo(-110, 20, -40, 46, 60, 46); g.bezierCurveTo(130, 44, 164, 28, 170, 6); g.fill();
        g.fillStyle = back; g.beginPath();                     // dorsal fin (tall on the orca), the flipper
        if (orca){ g.moveTo(10, -44); g.quadraticCurveTo(-2, -100, -24, -108); g.quadraticCurveTo(-22, -70, -40, -40); }
        else { g.moveTo(-70, -32); g.quadraticCurveTo(-84, -48, -98, -46); g.quadraticCurveTo(-92, -36, -100, -26); }
        g.fill();
        g.save(); g.translate(70, 30); g.rotate(0.5 + Math.sin(wt + 1) * 0.12); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-20, 30, -66, 46); g.quadraticCurveTo(-34, 14, -22, -4); g.fill(); g.restore();
        if (orca){ g.fillStyle = belly; g.beginPath(); g.ellipse(118, -14, 20, 8, -0.2, 0, TAU); g.fill(); }                          // the eye patch
        else { g.strokeStyle = 'rgba(40,70,110,0.3)'; g.lineWidth = 1.6; for (let i = 0; i < 7; i++){ g.beginPath(); g.moveTo(150 - i * 4, 22 + i * 2); g.quadraticCurveTo(70, 36 + i * 1.4, 0, 34 + i); g.stroke(); } }   // throat pleats
        g.fillStyle = hz('#10182A'); g.beginPath(); g.arc(orca ? 134 : 126, orca ? -2 : 4, 3.4, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(20,30,50,0.4)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(168, 10); g.quadraticCurveTo(146, 18, 124, 14); g.stroke();
      }
      const giantBook = kind => book('giant:' + kind, () => ({ n: 8, box: [-222, -116, 178, 84], paint: (g, wt) => paintGiant(g, kind, wt) }), (kind === 'orca' ? 1.3 : 2.0) * CS * LD * 0.7);
      function spawnGiant(t, kind, o){
        if (giant) return null;
        o = o || {};
        kind = kind || (Math.random() < 0.6 ? 'whale' : 'orca');
        const dir = o.dir || (Math.random() < 0.5 ? 1 : -1), u = (kind === 'orca' ? 1.3 : 2.0) * CS;
        giant = { kind, dir, u, x: o.x !== undefined ? o.x : (dir > 0 ? -230 * u : DW + 230 * u), y: o.y === undefined ? rnd(150, 250) : o.y, wt: 0, sp: (kind === 'orca' ? 44 : 26) * CS };
        return giant;
      }
      function drawGiant(g, t, dt){
        if (!giant) return;
        const b = giantBook(giant.kind);
        giant.x += giant.dir * giant.sp * dt; giant.wt += dt * TAU * 0.16;
        if (giant.dir > 0 ? giant.x > DW + 240 * giant.u : giant.x < -240 * giant.u){ giant = null; return; }
        if (!b) return;
        drawBook(g, b, giant.wt, giant.x, giant.y + Math.sin(t * 0.3) * 8, giant.u, giant.dir, 1, true);   // painted hazed: far away, the water takes most of its colour
        baseT(g);
      }

      // ── drawing an actor: its book frame (one blit), or — only in the middle
      //    of a trick — the live drawing
      function drawActor(g, a, t){
        if (a.act && a.act.live){                              // live: the rig's pose, or a posing fish with its mouth open
          g.save(); g.translate(a.x, a.y); if (a.rot) g.rotate(a.rot);
          if (a.type === 'rig') a.R.draw(g, Object.assign({ x: 0, y: 0, s: a.u, dir: a.face < 0 ? -1 : 1, wt: a.wt, pose: a.act.pose || 0, coat: a.coat, tint: 1, lit: [1, 1, 1] }, a.extra || {}, a.act.extra || {}), t);
          else { g.scale(a.u * (a.face < 0 ? -1 : 1), a.u * a.fy); paintFish(g, a.sp, a.wt, a.act.gape || 0); }
          g.restore(); perf.live++;
          return;
        }
        const b = bookOf(a); if (!b) return;
        if (a.appear < 1){ a.appear = Math.min(1, a.appear + 0.05); g.globalAlpha = a.appear; }
        if (a.rot){ g.save(); g.translate(a.x, a.y); g.rotate(a.rot); const k = Math.floor((((a.wt / TAU) % 1) + 1) % 1 * b.n) % b.n; g.scale(a.u * a.face, a.u * a.fy);
          g.drawImage(b.cv, (k % b.cols) * b.cw, Math.floor(k / b.cols) * b.ch, b.cw, b.ch, b.x0, b.y0, b.uw, b.uh); g.restore(); perf.blits++; }
        else { drawBook(g, b, a.wt, a.x, a.y, a.u, Math.abs(a.face) < 0.08 ? (a.face < 0 ? -0.08 : 0.08) : a.face, a.fy, a.blend && a.appear >= 1); baseT(g); }
        if (a.appear < 1) g.globalAlpha = 1;
        if (a.spots) drawSpots(g, a);
      }


      // ── bubbles and small particles: capped pools, each drawn as one batched path
      const BUB = [], FXP = [];
      const bubCap = () => Q === 2 ? 60 : Q === 1 ? 36 : 18;
      function bubbles(x, y, n, spread){
        for (let i = 0; i < n; i++){ if (BUB.length >= bubCap()) BUB.shift(); BUB.push({ x: x + rnd(-1, 1) * (spread || 10), y: y + rnd(-6, 6), r: rnd(2, 6.5), vy: rnd(40, 90), ph: Math.random() * TAU, t0: lastT, life: rnd(2, 4.5) }); }
      }
      function fxp(kind, x, y, o){
        if (FXP.length >= (Q === 0 ? 40 : 90)) FXP.shift();
        o = o || {};
        FXP.push({ kind, x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, t0: lastT, life: o.life || 1.4, c: o.c || '#FFFFFF', s: o.s || 1, own: o.own || null });
      }
      function drawBubbles(g, t, dt){
        if (BUB.length){
          g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath();
          for (let i = BUB.length - 1; i >= 0; i--){
            const b = BUB[i]; b.y -= b.vy * dt; const k = (t - b.t0) / b.life;
            if (k >= 1 || b.y < 6){ BUB.splice(i, 1); continue; }
            const x = b.x + Math.sin(t * 2.4 + b.ph) * 5; g.moveTo(x + b.r, b.y); g.arc(x, b.y, b.r, 0, TAU);
          }
          g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath();
          for (const b of BUB){ const x = b.x + Math.sin(t * 2.4 + b.ph) * 5 - b.r * 0.35; g.rect(x, b.y - b.r * 0.45, b.r * 0.34, b.r * 0.34); }
          g.fill();
        }
        for (let i = FXP.length - 1; i >= 0; i--){
          const p = FXP[i], age = t - p.t0, k = age / p.life;
          if (k >= 1){ FXP.splice(i, 1); continue; }
          if (p.own && age < 1.1){ p.x = p.own.x - p.own.face * p.own.len * 0.42; p.y = p.own.y + 4; }                 // the poop strand trails its owner, then lets go
          else { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
          const a = k < 0.12 ? k / 0.12 : 1 - smooth((k - 0.12) / 0.88);
          g.globalAlpha = a; g.fillStyle = p.c;
          if (p.kind === 'heart'){ const r = 6.5 * p.s; g.beginPath(); g.moveTo(p.x, p.y + r * 0.9); g.bezierCurveTo(p.x - r * 1.5, p.y - r * 0.2, p.x - r * 0.7, p.y - r * 1.3, p.x, p.y - r * 0.45); g.bezierCurveTo(p.x + r * 0.7, p.y - r * 1.3, p.x + r * 1.5, p.y - r * 0.2, p.x, p.y + r * 0.9); g.fill(); }
          else if (p.kind === 'poop'){ g.beginPath(); g.roundRect(p.x - 6 * p.s, p.y, 12 * p.s, 3 * p.s, 1.5); g.fill(); }
          else if (p.kind === 'ink'){ g.globalAlpha = a * 0.7; g.beginPath(); g.arc(p.x, p.y, 12 * p.s * (0.6 + k * 1.6), 0, TAU); g.fill(); }
          else { g.beginPath(); g.arc(p.x, p.y, 2.6 * p.s, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 1; perf.fx = FXP.length + BUB.length;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE CLEANING STATION — the wrasse's coral head on the left shelf. Now
      // and then a fish turns spotty, comes over, hangs head-up with its mouth
      // open, and the wrasse picks the spots off one by one; the neon sign on
      // its post lights while a client is being cleaned.
      // ══════════════════════════════════════════════════════════════════════
      const station = { client: null, served: 0, taps: 0, nibbling: false, spot: null, nibbleAt: 0, nextAt: 22, sign: { lit: 0, on: false, t0: 0 } };
      const posePoint = () => ({ x: Math.min(DW - 40, STATION.x + 96 * CS), y: STATION.y - 84 * CS });
      function soil(f, hurry){                                 // a fish turns spotty; it wanders a little, then goes to be cleaned
        if (!f || f.spots || station.client) return false;
        f.spots = []; const n = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) f.spots.push({ ux: rnd(-26, 26), uy: rnd(-0.6, 0.6) * f.sp.bh, r: rnd(2.4, 3.6), k: 1 });
        station.client = f; f.cs = hurry ? 'going' : 'roaming'; f.csAt = lastT + (hurry ? 0 : rnd(3, 7)); f.hurry = !!hurry;
        return true;
      }
      function drawSpots(g, a){
        g.fillStyle = 'rgba(70,40,60,0.85)'; g.beginPath();
        const c = Math.cos(a.rot || 0), s = Math.sin(a.rot || 0), f = a.face < 0 ? -1 : 1;
        for (const p of a.spots){ if (p.k <= 0.02) continue; const lx = p.ux * a.u * f, ly = p.uy * a.u, x = a.x + lx * c - ly * s, y = a.y + lx * s + ly * c; g.moveTo(x + p.r * p.k, y); g.arc(x, y, p.r * p.k * Math.max(0.7, a.u), 0, TAU); }
        g.fill();
      }
      function stepStation(t, dt){
        const st = station, f = st.client, sg = st.sign;
        if (autoCast && !f && t > st.nextAt){ st.nextAt = t + rnd(28, 55); soil(pick(ACTORS.filter(a => a.type === 'fish' && CLEAN_KINDS.indexOf(a.kind) >= 0 && !a.act)), false); }
        if (f){
          const P = posePoint();
          if (f.cs === 'roaming' && t > f.csAt) f.cs = 'going';
          if (f.cs === 'going'){ f.tx = P.x; f.ty = P.y; f.tMax = t + 9; f.best = 1e9;
            if (Math.hypot(f.x - P.x, f.y - P.y) < 30){ f.cs = 'posing'; f.csAt = t; f.vx = f.vy = 0; f.act = { type: 'clean', live: true, gape: 1, t0: t, dur: 1e9 }; sg.on = true; sg.t0 = t; st.nibbleAt = t + 0.9; } }
          else if (f.cs === 'posing'){                         // head up, mouth open; the wrasse works from spot to spot
            f.x += (P.x - f.x) * Math.min(1, dt * 4); f.y += (P.y + Math.sin(t * 1.6) * 3 - f.y) * Math.min(1, dt * 4);
            f.rot += (-1.2 * (f.face < 0 ? -1 : 1) - f.rot) * Math.min(1, dt * 4); f.wt += dt * 4;
            const left = f.spots.filter(p => p.k > 0.02);
            if (!left.length){ f.cs = 'leaving'; f.csAt = t; f.act = null; f.spots = null; st.nibbling = false; st.spot = null; st.served++; sg.on = false; sg.t0 = t;
              fxp('heart', f.x, f.y - 30, { vy: -40, life: 1.6, c: '#FF7FA8', s: 1.3 }); bubbles(f.x, f.y, 4, 14); newTarget(f, t); }
            else if (t > st.nibbleAt){
              if (!st.spot || st.spot.k <= 0.02){ st.spot = left[0]; st.nibbling = true; }
              st.spot.k -= dt / 0.75;
              if (Math.random() < dt * 9){ const w = wrasse || f; fxp('crumb', w.x + w.face * 20, w.y, { vx: rnd(-14, 14), vy: rnd(10, 40), g: 30, life: 1.1, c: '#6A4660', s: 0.7 }); }
            }
          } else if (f.cs === 'leaving'){ f.rot += (0 - f.rot) * Math.min(1, dt * 5); if (t > f.csAt + 0.8){ f.rot = 0; f.cs = null; st.client = null; } }
        }
        // the neon sign: a flicker as it comes on, steady (with a wink) while the wrasse works, a flicker off
        const age = t - sg.t0;
        if (sg.on) sg.lit = age < 0.75 ? ((age * 13 % 1) < 0.55 ? 0.3 + age : 0.05) : 1;
        else sg.lit = sg.lit > 0 && age < 0.4 ? ((age * 15 % 1) < 0.5 ? 0.5 : 0) : 0;
        // the wrasse: to the spot it is working on, else its little dance over the coral head
        if (wrasse){
          if (f && f.cs === 'posing' && st.spot && st.spot.k > 0.02){
            const c = Math.cos(f.rot), s = Math.sin(f.rot), fs = f.face < 0 ? -1 : 1, lx = st.spot.ux * f.u * fs, ly = st.spot.uy * f.u;
            wrasse.tx = f.x + lx * c - ly * s - wrasse.len * 0.42 * (wrasse.x < f.x ? 1 : -1); wrasse.ty = f.y + lx * s + ly * c; wrasse.tMax = t + 5; wrasse.best = 1e9; wrasse.busy = true;
          } else if (wrasse.busy){ wrasse.busy = false; newTarget(wrasse, t); }
        }
      }
      // the sign itself (drawn after the hour's gradient: it is a light)
      function drawSign(g, t){
        const sg = station.sign, x = SIGN.x, y = SIGN.y, w = SIGN.w, h = SIGN.h, lit = sg.lit, wink = station.nibbling ? 0.75 + 0.25 * Math.sin(t * 9) : 1;
        g.fillStyle = '#5A4A6E'; g.fillRect(x + w / 2 - 3, y + h, 6, SIGN.foot - y - h);                           // the post
        g.fillStyle = 'rgba(30,26,60,0.88)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill();
        g.strokeStyle = lit > 0.05 ? 'rgba(255,120,200,' + (0.9 * lit) + ')' : 'rgba(150,130,180,0.5)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 4, y + 4, w - 8, h - 8, 9); g.stroke();
        if (lit > 0.05) glow(g, 'pink', x + w / 2, y + h / 2, w * 0.72, 0.4 * lit * wink);
        g.font = '700 ' + Math.round(h * 0.42) + 'px "Varela Round","Rubik","Arial",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = lit > 0.05 ? 'rgba(150,250,255,' + Math.min(1, lit * wink + 0.1) + ')' : 'rgba(120,130,170,0.55)';
        g.fillText('תחנת ניקוי', x + w / 2, y + h / 2 + 1);
        if (lit > 0.6) for (let i = 0; i < 3; i++){ const k = (t * 1.6 + i / 3) % 1; g.globalAlpha = (1 - k) * lit; g.strokeStyle = '#96FAFF'; g.lineWidth = 2; g.beginPath(); g.arc(x + w - 14 + i * 2, y - 6 - k * 22, 3 + i, 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }


      // ── the tricks. A fish: a dash in a stream of bubbles, a barrel roll, hearts
      //    for the butterflyfish pair. A hero rig: its own pose, drawn live (the
      //    octopus also changes its colour and puffs ink; the dolphin does a flip;
      //    the pufferfish balloons).
      function startTrick(a, t, type){
        if (!a || a.act || a.cs) return false;
        if (a.type === 'fish'){
          type = type || (a.mate ? 'hearts' : Math.random() < 0.5 ? 'dash' : 'roll');
          if (type === 'hearts' && !a.mate) type = 'dash';
          a.act = { type, t0: t, dur: type === 'dash' ? 1.2 : type === 'roll' ? 0.8 : 1.6, last: 0 };
          if (type === 'dash'){ newTarget(a, t); a.boost = t + 1.2; }
          bubbles(a.x, a.y, 4, 12);
          return true;
        }
        const R = a.R;
        if (a.kind === 'puffer'){ a.act = { type: 'puff', live: true, t0: t, dur: 4.2, extra: { puff: 0 }, pose: 0 }; bubbles(a.x, a.y, 5, 16); return true; }
        a.act = { type: 'pose', live: true, t0: t, dur: R.ACT_SECONDS || 2, pose: 0, flip: a.kind === 'dolphin' && Math.random() < 0.6 };
        if (a.kind === 'octopus'){                             // a new colour, and a puff of ink
          const C = R.COATS || [a.coat]; a.coat = C[(Math.max(0, C.indexOf(a.coat)) + 1 + Math.floor(Math.random() * Math.max(1, C.length - 1))) % C.length];
          for (let i = 0; i < 7; i++) fxp('ink', a.x - a.face * 30 * a.u, a.y - 44 * a.u, { vx: -a.face * rnd(20, 70), vy: rnd(-40, 10), life: rnd(1.4, 2.4), c: '#3A2E5E', s: rnd(0.8, 1.5) });
        } else if (a.kind === 'seahorse' || a.kind === 'turtle') fxp('heart', a.x, a.y - a.len * 0.5, { vy: -34, life: 1.6, c: '#FF7FA8', s: 1.2 });
        bubbles(a.x + a.face * a.len * 0.3, a.y, a.kind === 'crab' ? 2 : 5, 14);
        return true;
      }
      function stepTrick(a, t, dt){
        const A = a.act; if (!A || A.type === 'clean') return;
        const p = (t - A.t0) / A.dur;
        if (p >= 1){ a.act = null; a.fy = 1; if (A.flip || A.type === 'roll') a.rot = 0; return; }
        if (A.type === 'roll') a.fy = Math.cos(p * TAU);                               // over on its back and round again
        else if (A.type === 'dash'){ if (t - A.last > 0.09){ A.last = t; bubbles(a.x - a.face * a.len * 0.4, a.y, 1, 6); } }
        else if (A.type === 'hearts'){ if (t - A.last > 0.22){ A.last = t; const m = a.mate || a; fxp('heart', (a.x + m.x) / 2 + rnd(-14, 14), Math.min(a.y, m.y) - 16, { vx: rnd(-10, 10), vy: rnd(-56, -34), life: 1.5, c: pick(['#FF7FA8', '#FF9CC0', '#FFB8D4']), s: rnd(0.9, 1.5) }); } }
        else if (A.type === 'puff'){ A.extra.puff = p < 0.12 ? smooth(p / 0.12) : p > 0.86 ? 1 - smooth((p - 0.86) / 0.14) : 1; }
        else if (A.type === 'pose'){ A.pose = p; if (A.flip) a.rot = -a.face * smooth(clamp01((p - 0.1) / 0.6)) * TAU; }
      }
      // the poop gag: every fish goes once in a while — a strand trails, lets go, sinks, fades
      let poops = 0;
      function poop(a, t){ poops++; fxp('poop', a.x, a.y, { own: a, vy: 8, g: 22, life: 4.5, c: '#7A5A3C', s: Math.max(0.6, a.u) }); a.poopAt = t + rnd(150, 260); }

      function stepCast(t, dt){
        const P = posePoint();
        for (let i = ACTORS.length - 1; i >= 0; i--){
          const a = ACTORS[i];
          if (a.type === 'fish'){
            if (a.cs === 'posing'){ /* the station holds it */ }
            else if (a.slot && a.lead){                       // a schooling fish holds its slot behind the leader
              const ld = a.lead, gx = ld.x + a.slot.dx * ld.dir, gy = ld.y + a.slot.dy + Math.sin(t * 1.3 + i) * 5, k = Math.min(1, dt * 3.2);
              a.vx += ((gx - a.x) * 2.4 - a.vx) * k; a.vy += ((gy - a.y) * 2.4 - a.vy) * k; a.x += a.vx * dt; a.y += a.vy * dt;
              if (Math.abs(a.vx) > 8) a.dir = a.vx > 0 ? 1 : -1; a.face += (a.dir - a.face) * Math.min(1, dt * 7); a.wt += dt * TAU * (1.2 + Math.abs(a.vx) / 60);
            } else {
              if (a.follow && !a.cs && !(a.fledAt && t < a.fledAt + 2)){ const m = a.follow; a.tx = m.x - m.dir * 46 * CS; a.ty = m.y + 18 * CS; a.tMax = t + 9; a.best = 1e9; }
              if (a.role === 'clown' && !a.act){              // now and then it ducks into the tentacles
                if (!a.hideAt) a.hideAt = t + rnd(5, 14);
                if (t > a.hideAt){ a.hiding = t + 2.2; a.hideAt = t + rnd(8, 18); }
                if (a.hiding && t < a.hiding){ a.tx = a.anem.x + (a.x < a.anem.x ? -14 : 14); a.ty = a.anem.y - 44 * a.anem.s; a.tMax = t + 4; a.best = 1e9; a.soft = true; } else a.hiding = 0;
              }
              let sp = a.speed * ((a.boost && t < a.boost) || (a.cs === 'going' && a.hurry) ? 2.6 : 1) * (a.cs === 'going' ? 1.3 : 1);
              if (a.role === 'wrasse' && !a.busy) a.y += Math.sin(t * 6) * 9 * dt;     // its little dance
              steer(a, t, dt, sp);
            }
            if (autoCast && !a.act && !a.cs && t > a.poopAt && a.x > 40 && a.x < DW - 40) poop(a, t);
          } else if (a.role === 'visitor'){ if (stepVisitor(a, t, dt)){ ACTORS.splice(i, 1); continue; } }
          else if (a.kind === 'puffer'){ steer(a, t, dt, a.speed); if (autoCast && !a.act && t > a.nextPuff){ a.nextPuff = t + rnd(90, 170); startTrick(a, t); } }
          else if (a.kind === 'crab'){                         // sideways along the sand, a pause now and then
            if (!a.act && t > a.pauseUntil){ a.x += a.dir * a.speed * dt; a.wt += a.R.STRIDE ? a.dir * TAU * a.speed * dt / (a.R.STRIDE * a.u) : dt * TAU * a.cps;      // its steps follow the ground
              if (a.x > a.x1) a.dir = -1; else if (a.x < a.x0) a.dir = 1;
              if (Math.random() < dt * 0.12){ a.pauseUntil = t + rnd(1.5, 4); if (Math.random() < 0.4) a.dir = -a.dir; } }
            a.face = 1;
          } else if (a.kind === 'jelly'){                      // it rises on its pulses, drifting; from the top it starts again below
            a.wt += dt * TAU * a.cps; a.y += a.vy * dt * (0.5 + 0.9 * Math.max(0, Math.sin(a.wt))); a.x = a.x0 + Math.sin(t * 0.21 + a.ph) * 34;
            if (a.y < -a.len){ a.y = DH + a.len; a.x0 = rnd(0.06, 0.94) * DW; }
          } else {                                             // the octopus on its rock, the seahorse by its blade
            a.wt += dt * TAU * a.cps;
            if (a.kind === 'seahorse'){ a.y = HORSE.y + Math.sin(t * 0.9) * 7; a.x = HORSE.x + 4 + Math.sin(t * 0.5) * 5; }
          }
          stepTrick(a, t, dt);
        }
        stepStation(t, dt);
        if (autoCast && t > nextVentAt && Q > 0){ nextVentAt = t + rnd(0.5, 1.5); const v = VENTS[Math.floor(t / 7) % Math.max(1, VENTS.length)]; if (v) bubbles(v.x, v.y, 1, 5); }
        if (autoCast && rigsReady){
          if (t > nextTurtleAt){ nextTurtleAt = t + rnd(50, 100); spawnVisitor('turtle', t); }
          if (t > nextDolphinAt){ nextDolphinAt = t + rnd(60, 120); spawnVisitor('dolphin', t); }
          if (t > nextSharkAt){ nextSharkAt = t + rnd(80, 150); spawnVisitor('shark', t); }
          if (t > nextGiantAt){ nextGiantAt = t + rnd(150, 280); spawnGiant(t); }
          if (t > nextTrickAt){ nextTrickAt = t + rnd(5, 12); startTrick(pick(ACTORS.filter(a => !a.act && !a.cs && a.role !== 'school' && a.role !== 'cloud' && a.x > 60 && a.x < DW - 60)), t); }
        }
        perf.cast = ACTORS.length + (giant ? 1 : 0);
      }
      let nextTrickAt = 8, nextVentAt = 3;
      function recast(){
        BUB.length = 0; FXP.length = 0; giant = null; station.client = null; station.nibbling = false; station.spot = null; station.sign.on = false; station.sign.lit = 0;
        buildCast();
      }

      // ── plankton: a handful of drifting specks (one batched path); at night they
      //    are the sea's own stars — drawn after the hour's gradient, glowing
      const MOTES = []; { const r = makeRng(5); for (let i = 0; i < 34; i++) MOTES.push({ u: r(), v: r(), ph: r() * TAU, f: 0.3 + r() * 0.8, s: 1 + r() * 1.6 }); }
      function drawPlankton(g, t, glowPass){
        const n = Q === 2 ? 34 : Q === 1 ? 20 : 10;
        if (!glowPass){
          g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath();
          for (let i = 0; i < n; i++){ const m = MOTES[i], x = ((m.u * DW + t * (6 + m.f * 8)) % (DW + 40)) - 20, y = 60 + m.v * (SAND - 100) + Math.sin(t * m.f + m.ph) * 16; g.rect(x, y, m.s, m.s); }
          g.fill();
        } else if (L.glow > 0.05){
          for (let i = 0; i < Math.min(n, 16); i++){ const m = MOTES[i], x = ((m.u * DW + t * (6 + m.f * 8)) % (DW + 40)) - 20, y = 60 + m.v * (SAND - 100) + Math.sin(t * m.f + m.ph) * 16;
            glow(g, i % 3 ? 'aqua' : 'green', x, y, 9 + m.s * 3, L.glow * (0.35 + 0.45 * Math.max(0, Math.sin(t * (0.6 + m.f) + m.ph)))); }
        }
      }


      // ══════════════════════════════════════════════════════════════════════
      // THE FRAME — a fixed, short list of things, in order
      // ══════════════════════════════════════════════════════════════════════
      let BT = 1, BX = 0, BY = 0;                              // the frame's base transform (set each frame)
      const nextKeyFrom = v => { for (const K of KEYS) if (K.at > v + 0.01) return K.at; return KEYS[0].at + 1; };
      const nextHour = t => { todTween = { from: tod, to: nextKeyFrom(tod), t0: t, dur: 2.2 }; };
      let gradeSig = '';
      function updateLook(){
        const key = Math.floor(tod * KEYS.length * 24);
        if (key === lookKey) return;
        lookKey = key; L = lookAt(tod);
        const sig = rgb(L.ovT) + rgb(L.ovB) + L.warm.toFixed(2);
        if (sig !== gradeSig){ gradeSig = sig; paintGrade(); }       // two tiny canvases — never the reef itself
      }
      function drawLayer(g, t, layer){ for (const a of ACTORS) if (a.layer === layer && !(a.hiding && layer === 2)) drawActor(g, a, t); }
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t;
        if (todTween){
          const k = clamp01((t - todTween.t0) / todTween.dur);
          tod = lerp(todTween.from, todTween.to, smooth(k)) % 1;
          if (k >= 1) todTween = null;
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        updateLook();
        bakeOne(); swayBudget = 1;
        stepCast(t, dt);
        perf.blits = 0; perf.live = 0; perf.area = 0;

        const g = ctx;
        BT = DPR * S; BX = DPR * OX; BY = DPR * OY; baseT(g);
        g.globalAlpha = 1; g.imageSmoothingEnabled = true;
        g.drawImage(bgL.cv, 0, 0, DW, DH); perf.blits++; perf.area += DW * DH;                    // 1 · the whole still picture (opaque)
        drawGiant(g, t, dt);                                                 // 2 · a whale or an orca, far and high
        drawLayer(g, t, -1); baseT(g);                                       // 3 · the far school, already the water's colour
        drawRays(g, t, false);                                               // 4 · the sun's rays
        drawLayer(g, t, 0); baseT(g);                                        // 5 · the school that weaves behind the fans
        for (const an of ANEMS) drawSway(g, 'anemB', an.c, an.x, an.y, an.s, current(t, an.x, an.c));
        for (const a of ACTORS) if (a.hiding) drawActor(g, a, t);            //     a clownfish tucked between the tentacles
        baseT(g);
        for (const an of ANEMS) drawSway(g, 'anemF', an.c, an.x, an.y, an.s, current(t, an.x, an.c + 1));
        for (const p of PLANTS) drawSway(g, p.k, p.c, p.x, p.y, p.s, current(t, p.x, p.ph));   // 6 · the swaying things
        drawLit(g, t);                                                       // 7 · light crawling over the reef and the sand
        drawClams(g, t, dt); drawChestLid(g, t, dt);                         // 8 · the clams, the chest's lid
        drawLayer(g, t, 1);                                                  // 9 · on the bottom: octopus, seahorse, crabs
        drawLayer(g, t, 2);                                                  // 10 · the fish and the visitors
        baseT(g);
        drawFront(g);                                                        // 11 · the two foreground corners
        drawPlankton(g, t, false); drawBubbles(g, t, dt);                    // 12 · specks, bubbles, small particles
        if (L.ovA > 0.012){ g.globalAlpha = L.ovA; g.drawImage(gradeL.cv, 0, 0, DW, DH); g.globalAlpha = 1; perf.blits++; perf.area += DW * DH; }   // 13 · the hour: one gradient over everything
        if (L.glow > 0.02 && Q > 0){ g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = L.glow * 0.8; g.drawImage(glowL.cv, 0, 0, DW, DH); g.restore(); perf.blits++; perf.area += DW * DH * 0.25; }   // 14 · the reef's own light
        drawLayer(g, t, 3);                                                  // 15 · what glows: the jellyfish, the sign, the plankton, the moon
        baseT(g);
        drawSign(g, t);
        drawPlankton(g, t, true);
        drawRays(g, t, true);
        glow(g, 'white', SUN.x, 14, 150, 0.3 * L.ray * (0.8 + 0.2 * Math.sin(t * 1.7)));
        perf.screens += (perf.area / (DW * DH) - perf.screens) * 0.1;                  // how many screens of pixels this frame painted (averaged)
        perf.drawn++;
      }

      // ── the loop. First the QUALITY tier steps down (fewer passes, fewer
      //    things); only at the lowest tier is the frame rate halved.
      let prevTs = 0, lastDrawTs = 0, lastGov = 0, calmSince = 0, errLogged = false;
      function frame(ts){
        if (stopped) return;
        rafId = requestAnimationFrame(frame);
        if (t0 === null) t0 = ts;
        if (!warmTs) warmTs = ts;
        const warming = ts - warmTs < 1500 || BAKE_Q.length > 0 || perf.drawn < 40;                // baking the books is a one-off — not a reason to drop quality
        if (prevTs && !warming) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (warming){ perf.gapEma = 16.7; perf.costEma = 0; }
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!errLogged){ errLogged = true; console.error('reef4 frame error', e); } }
        if (!warming) perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastGov > 1000 && !warming){
          lastGov = ts;
          const heavy = perf.costEma > 5 || perf.gapEma > 19.5, calm = perf.costEma <= 3 && perf.gapEma <= 18;
          if (qPin === null){
            if (heavy){ qGoodSince = 0; if (!qBadSince) qBadSince = ts; else if (ts - qBadSince > 3000){ qBadSince = 0; if (Q > 0) Q--; else perf.halfRate = true; } }
            else if (calm){ qBadSince = 0; if (!qGoodSince) qGoodSince = ts; else if (ts - qGoodSince > 12000){ qGoodSince = 0; if (perf.halfRate && !IS_TOUCH) perf.halfRate = false; else if (Q < 2 && qClimbs < 2){ Q++; qClimbs++; } } }
            else { qBadSince = 0; qGoodSince = 0; }
          }
        }
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = Math.max(1, Math.round(W * DPR)); canvas.height = Math.max(1, Math.round(H * DPR));
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H)))); AXK = Math.min(1, DW / DW0);
        S = H / DH; OX = (W - DW * S) / 2; OY = 0; LD = DPR * S;
        for (const k in SWAYB) delete SWAYB[k];
        for (const k in BOOKS) delete BOOKS[k];
        BAKE_Q.length = 0;                                     // sprites and books are baked at the screen's resolution
        const relaid = DW !== layoutDW;
        if (relaid) layoutBase();
        bakePicture(); gradeSig = ''; lookKey = -1; updateLook();
        if (relaid) recast(); else for (const a of ACTORS) if (a.anem) a.anem = ANEMS[a.anemI] || a.anem;
        warmTs = 0;
      }


      // ── taps
      const TAPS = { cast: 0, station: 0, anemone: 0, clam: 0, chest: 0, star: 0, coral: 0, hour: 0, water: 0 };
      function hitActor(x, y){
        for (let i = ACTORS.length - 1; i >= 0; i--){
          const a = ACTORS[i], tall = a.kind === 'jelly' || a.kind === 'seahorse' ? 0.6 : a.type === 'rig' ? 0.42 : 0.34;
          const cy = a.kind === 'octopus' ? a.y - a.len * 0.4 : a.kind === 'crab' ? a.y - a.len * 0.3 : a.y;
          if (Math.abs(x - a.x) < a.len * 0.52 + 8 && Math.abs(y - cy) < a.len * tall + 10) return a;
        }
        return null;
      }
      function tapStation(t){
        TAPS.station++; station.taps++; bubbles(STATION.x, STATION.y - 40, 8, 30);
        if (wrasse) wrasse.boost = t + 1;
        const f = station.client;
        if (f){ if (f.cs === 'roaming'){ f.cs = 'going'; } f.hurry = true; }
        else soil(pick(ACTORS.filter(a => a.type === 'fish' && CLEAN_KINDS.indexOf(a.kind) >= 0 && !a.act)), true);
      }
      function onClick(e){
        if (stopped || !e.target || !e.target.closest || e.target.closest(UI_SEL)) return;
        const x = (e.clientX - OX) / S, y = (e.clientY - OY) / S, t = lastT;
        if ((x > SIGN.x && x < SIGN.x + SIGN.w && y > SIGN.y && y < SIGN.y + SIGN.h) || (wrasse && Math.hypot(x - wrasse.x, y - wrasse.y) < 34)){ tapStation(t); return; }
        const a = hitActor(x, y);
        if (a){
          TAPS.cast++;
          if (a.spots && a.cs === 'roaming'){ a.cs = 'going'; a.hurry = true; bubbles(a.x, a.y, 4, 12); }          // a spotty fish goes to the station now
          else startTrick(a, t);
          return;
        }
        if (Math.abs(x - STATION.x) < 70 * CS + 10 && y > STATION.y - 74 && y < STATION.y + 40){ tapStation(t); return; }
        for (const an of ANEMS) if (Math.abs(x - an.x) < 92 * an.s && y > an.y - 116 * an.s && y < an.y + 6){
          TAPS.anemone++; bubbles(an.x, an.y - 70 * an.s, 6, 40);
          for (const f of ACTORS) if (f.anem === an){ f.hiding = 0; f.boost = t + 2; f.tx = clamp(an.x + rnd(-1, 1) * 220, 30, DW - 30); f.ty = clamp(an.y - rnd(120, 300), WATER_TOP, SAND - 40); f.tMax = t + 4; f.best = 1e9; f.darted = t; f.soft = true; }
          return;
        }
        for (const c of CLAMS) if (Math.abs(x - c.x) < 52 * c.s && Math.abs(y - (c.y - 16 * c.s)) < 38 * c.s){ TAPS.clam++; c.want = c.want ? 0 : 1; c.until = c.want ? t + 4 : 0; bubbles(c.x, c.y - 20, 4, 20); return; }
        if (Math.abs(x - CHEST.x) < 58 * CHEST.s && y > CHEST.y - 84 * CHEST.s && y < CHEST.y + 8){
          TAPS.chest++; chest.taps++; chest.want = 1; chest.until = t + 4.5; bubbles(CHEST.x, CHEST.y - 50 * CHEST.s, 12, 30);
          for (let i = 0; i < 6; i++) fxp('spark', CHEST.x + rnd(-30, 30), CHEST.y - 50, { vx: rnd(-30, 30), vy: rnd(-90, -40), g: 60, life: 1.2, c: '#FFE27A', s: 1.2 });
          return;
        }
        for (const s of STARS) if (Math.hypot(x - s.x, (y - s.y) * 1.3) < 36 * s.s){ TAPS.star++; s.kick = t; for (let i = 0; i < 5; i++) fxp('spark', s.x, s.y - 6, { vx: rnd(-50, 50), vy: rnd(-80, -30), g: 80, life: 1, c: '#FFF2A0' }); summonRumi(); return; }
        for (const c of CORALS) if (Math.abs(x - c.x) < CORAL_R[c.k] * c.s && y > c.y - 96 * c.s && y < c.y + 6){               // a coral lets go a puff of spawn
          TAPS.coral++;
          for (let i = 0; i < 12; i++) fxp('egg', c.x + rnd(-1, 1) * CORAL_R[c.k] * c.s * 0.7, c.y - rnd(20, 70) * c.s, { vx: rnd(-10, 10), vy: rnd(-46, -18), life: rnd(2, 3.4), c: pick(['#FFD0E2', '#FFF2B8', '#D8F6EC']), s: rnd(0.6, 1.1) });
          return;
        }
        if (Math.abs(x - SUN.x) < DW * 0.17 && y < 76){ TAPS.hour++; nextHour(t); return; }
        if (y < SAND - 10){ TAPS.water++; bubbles(x, y, 7, 14); }
      }

      // ── hooks for the harness and the tests
      const XY = (x, y) => ({ x: OX + x * S, y: OY + y * S });
      const info = a => ({ type: a.type, kind: a.kind, role: a.role, coat: a.coat || null, x: a.x, y: a.y, len: a.len, dir: a.dir, face: a.face, layer: a.layer, act: a.act ? a.act.type : null,
                           live: !!(a.act && a.act.live), cs: a.cs || null, spots: a.spots ? a.spots.filter(p => p.k > 0.02).length : 0, hiding: !!a.hiding, cx: OX + a.x * S, cy: OY + a.y * S });
      const RUMI_FLY = { mode: 'fly', direction: 'ltr', height: '30vh', bottom: '40%', duration: 3250, zIndex: 7 };
      function summonRumi(){ if (stopped) return; needRumi(() => { if (stopped || !window.ChibiWalker || rumiLayer.querySelector('.chibi-walker')) return; window.ChibiWalker.walk(rumiLayer, RUMI_FLY); }); }
      const hook = {
        ready: () => rigsReady,
        baked: () => BAKE_Q.length === 0 && Object.keys(BOOKS).length > 0,
        tod: () => tod,
        setTod(v){ tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed(v){ todSpeed = v; },
        phase: () => L.name, look: () => L, time: () => lastT,
        quality(q){ if (q === undefined) return Q; if (q === null) qPin = null; else { qPin = Q = clamp(q | 0, 0, 2); perf.halfRate = false; } return Q; },
        auto(v){ autoCast = !!v; },
        taps: () => Object.assign({}, TAPS),
        actors: () => ACTORS.map(info),
        fish: () => ACTORS.filter(a => a.type === 'fish').map(info),
        counts: () => { const c = {}; for (const a of ACTORS) c[a.kind] = (c[a.kind] || 0) + 1; return c; },
        act(who, type){ const a = typeof who === 'number' ? ACTORS[who] : ACTORS.find(m => m.kind === who && !m.act && !m.cs) || ACTORS.find(m => m.kind === who); if (!a) return false; a.act = null; a.fy = 1; a.rot = 0; return startTrick(a, lastT, type); },
        visit(kind, o){ const v = spawnVisitor(kind, lastT, o); return v ? v.length : 0; },
        giant(kind, o){ return !!spawnGiant(lastT, kind, o); },
        giantNow: () => giant ? { kind: giant.kind, x: giant.x, y: giant.y } : null,
        station: () => { const f = station.client; return { x: STATION.x, y: STATION.y, cleaner: wrasse ? { x: wrasse.x, y: wrasse.y, nibbling: station.nibbling } : null, client: f ? { kind: f.kind, cs: f.cs } : null,
          dirty: ACTORS.filter(a => a.spots && a.spots.some(p => p.k > 0.02)).map(a => a.kind), served: station.served, taps: station.taps, sign: { lit: station.sign.lit, x: SIGN.x, y: SIGN.y, w: SIGN.w, h: SIGN.h } }; },
        soil(kind){ return soil(ACTORS.find(a => a.type === 'fish' && a.kind === kind && !a.spots), false); },
        orbit: () => Object.assign({}, ORBIT),
        poop(){ const f = ACTORS.find(a => a.type === 'fish' && !a.act && !a.cs); if (f) poop(f, lastT); return !!f; },
        poops: () => poops,
        clams: () => CLAMS.map(c => ({ open: c.open, want: c.want })), chest: () => ({ open: chest.open, want: chest.want, taps: chest.taps }),
        bubbles: () => BUB.length, particles: () => FXP.length,
        stationXY: () => XY(STATION.x, STATION.y - 6), signXY: () => XY(SIGN.x + SIGN.w / 2, SIGN.y + SIGN.h / 2),
        anemXY: i => { const an = ANEMS[i || 0]; return XY(an.x, an.y - 20 * an.s); },
        clamXY: i => { const c = CLAMS[i || 0]; return XY(c.x, c.y - 16 * c.s); },
        chestXY: () => XY(CHEST.x, CHEST.y - 30 * CHEST.s),
        starXY: i => { const s = STARS[i || 0]; return XY(s.x, s.y); },
        coralXY: i => { const c = CORALS[i || 0]; return XY(c.x, c.y - 30 * c.s); },
        sunXY: () => XY(SUN.x, 30), waterXY: () => XY(DW * 0.5, 150),
        hitAt(cx, cy){ const a = hitActor((cx - OX) / S, (cy - OY) / S); return a ? a.kind : null; },
        layout: () => ({ DW, narrow, CS, S, OX, OY, LD, left: Object.assign({}, LEFT), right: Object.assign({}, RIGHT), sun: SUN.x, station: Object.assign({}, STATION), chest: Object.assign({}, CHEST),
                         anemones: ANEMS.length, plants: PLANTS.length, corals: CORALS.length, clams: CLAMS.length, stars: STARS.length }),
        perf: () => { let px = 0, nb = 0; for (const k in BOOKS){ const b = BOOKS[k]; if (b.ready){ nb++; px += b.cv.width * b.cv.height; } }
          return { dpr: DPR, DW, S, Q, pinned: qPin !== null, halfRate: perf.halfRate, gapEma: perf.gapEma, costEma: perf.costEma, frames: perf.frames, drawn: perf.drawn, bakes: perf.bakes,
                   blits: perf.blits, live: perf.live, screens: perf.screens, cast: perf.cast, fx: perf.fx, books: nb, bookMP: px / 1e6, queue: BAKE_Q.length }; },
        rumi(){ summonRumi(); return !!window.ChibiWalker; },
        rumiLayer: () => rumiLayer,
      };
      window.BACKGROUNDS.reef4._test = hook;
      window._reef4 = hook;

      // ── rumi glides past in FLY mode every few minutes (an overlay above the canvas)
      const rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      let rumiPatrol = null;
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, Object.assign({}, RUMI_FLY, { alternate: false, gapMin: 120000, gapMax: 240000, startDelay: 60000 + Math.random() * 120000 }));
      });

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);
      loadRigs(() => { if (stopped) return; rigsReady = !!window.SavKit; recast(); });

      return function cleanup(){
        stopped = true;
        cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (rumiPatrol){ try { rumiPatrol.stop(); } catch (e){} }
        if (window._reef4 === hook) delete window._reef4;
        if (window.BACKGROUNDS.reef4._test === hook) delete window.BACKGROUNDS.reef4._test;
        stage.innerHTML = '';
      };
    },
  };
})();
