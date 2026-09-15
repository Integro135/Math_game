/* ── Reef v2 — a coral reef built from zero ──────────────────────────────────
   window.BACKGROUNDS.reef2 = { skin:'reef', aids:'reef', init({stage}) → cleanup }

   A shallow tropical reef seen from just above the sand, at mid-morning,
   the sun high on the LEFT. Nothing here is shared with the older reef.bg.js
   (kept in the folder, unloaded). Built in two passes: the REEF ITSELF —
   the water, the rock, the corals, the anemones, the sand — and then THE
   FISH (below).

   THE FISH — one vector renderer (`drawFish`), species as data (`SPECIES`):
   body spline + fins + eye + mouth, the rear of the body flexing with the
   tail beat (`mkWarp`), a turn that thins the fish through zero (`face`),
   pitch following the heading, a flapping pectoral, an occasional gulp.
   · CLOWNFISH — two per big anemone, one in the small one; they hover over
     the crown, duck INTO the tentacles now and then (drawn between the back
     and front tentacles), and dart out in loops when their anemone is tapped
   · DORY — the regal blue tang with the black palette and yellow tail,
     cruising the open water; tap → dash or a barrel roll
   · the BUTTERFLYFISH pair (threadfin: white, yellow rear, black eye bar);
     the second follows the first; tap → hearts
   · two YELLOW TANGS over the reef tops, two ROYAL GRAMMAS low by the rocks
   · a SCHOOL of 14 blue-green CHROMIS: a leader wanders, the rest hold
     loose slots; tap → scatter and regroup
   · two bottlenose DOLPHINS, fast in the open water, each rising to the
     surface for a breath now and then (a burst of bubbles); tap → dash / roll
   · two BLACKTIP REEF SHARKS patrolling the middle water; the small fish
     scatter ahead of them; tap → a charge
   · a PUFFER pottering about the rocks that balloons (spines out) every
     couple of minutes and on tap
   · CRABS scuttling sideways along the sand (tap → a startled hop), sea
     stars on the bottom (tap → summons RUMI)
   · THE CORALS THEMSELVES LIVE: every hard coral registers its polyps while
     it is baked, and those pulse per frame in a slow wave across the reef
     (a few batched paths) and PULL IN when a fish brushes past; christmas-
     tree worms dart into their tubes; sponges breathe (a glow at each
     opening, specks drifting out); mushroom corals wave a fringe of
     tentacles; the giant clams gape slowly, their mantles shimmering, and
     SNAP SHUT when startled; tap any coral → it SPAWNS a cloud of eggs
   · RUMI (rumi/chibi-walker.js, fly mode) glides across every 2–4 minutes
   · the passing GIANTS: a BLUE WHALE glides just under the surface every
     few minutes, an ORCA cruises by now and then (never both at once)
   · every action blows a bubble puff; a scheduler makes a random fish act
     every 4–12 s; and THE POOP GAG — every fish goes once per ~3 minutes,
     a strand trails, lets go, sinks and fades (never on click).

   DESIGN SPACE 1600×900, sand line ~790, cover-fitted and bottom-anchored
   (a wide window crops the sides, a tall one shows more water). `S` maps
   design → screen. The game card sits centre (max-width ~720 px), so the
   reef HEROES stand on the two sides and the centre is a low sand channel.

   THE PICTURE, bottom to top:
   · the WATER — turquoise at the surface, deepening to teal-blue, a sun
     bloom top-left with GOD-RAYS slowly swinging through it
   · FAR REEF silhouettes in blue haze, two planes deep
   · the ROCK — lumpy boulders and shelves on both sides, crusted with pink
     coralline algae, crevices, a tall pinnacle on the right
   · the CORAL GARDEN — brain coral (meandering grooves), boulder coral
     (polyp-pitted domes), staghorn (branching, pale tips), table coral
     (a plate on a stalk), lettuce/plate coral (stacked wavy leaves),
     mushroom coral (radial septa), finger coral, tube sponges, a barrel
     sponge, christmas-tree worms, giant clams with wavy blue lips
   · the SWAYING things, drawn live to one shared CURRENT: sea fans,
     soft corals (cauliflower puffs on translucent stalks), sea whips,
     seagrass, and the SEA ANEMONES — the clownfish houses — bulb-tipped
     tentacle crowns on striped columns, each tentacle wiggling on its own
   · the SAND channel — rippled, lit by drifting CAUSTICS, with sea stars,
     urchins, shells
   · drifting motes and seep bubbles, a soft vignette

   PERF (house rules, see aurora.bg.js / dubai3.bg.js): backing store
   capped at 1.25× AND ~2.0 MP; the still picture in prebaked layers — the
   water (waterL), the reef band (reefL, blitted from its top edge down, so
   the giants pass BEHIND the rocks; the two are PRE-COMPOSITED into bgL and
   the frame blits that one layer whenever no giant is passing) and a
   foreground band (foreL), each with the vignette folded in; the god-rays
   in a half-res layer refreshed every 4th frame; a QUALITY tier (Q 2/1/0)
   that draws less before the loop drops to every 2nd frame; the
   caustic tile is baked once and scrolled as a pattern; glows are sprites;
   the rAF loop drops to every 2nd display frame while frames run long.
   Hooks: window._reef2 = BACKGROUNDS.reef2._test.  */
(function(){
  'use strict';
  const doc = document, TAU = Math.PI * 2;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const psr = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  const BASE = (function(){ const s = doc.currentScript; return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();

  // ── colour helpers ──
  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const mixc = (a, b, k) => { a = hexc(a); b = hexc(b); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
  const lit = (c, k) => { c = hexc(c); return k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k); };
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  // seeded RNG for the build (the reef is the same every load)
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.reef2 = {
    skin: 'reef',
    aids: 'reef',
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov';

      // ── the stage ──
      const DW = 1600, DH = 900;
      const SUNX = 330, SUNY = -40;                              // the sun, high left, just off the top
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(2.0e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      let Q = IS_TOUCH ? 1 : 2, lastQ = 0, qUps = 0, qPin = false;  // quality tier: 2 full · 1 reduced · 0 minimal (see frame()); qPin = held by a hook
      const PROF = { frames: 0 }; let profT = 0;
      const PMAX = {};
      const mark = k => { const n = performance.now(); const d = n - profT; PROF[k] = (PROF[k] || 0) + d; if (d > (PMAX[k] || 0)) PMAX[k] = d; profT = n; };

      // ── sprites + layers ──
      const SPR = {};
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = { white: '255,255,255', sun: '255,250,220', cyan: '170,240,255', shade: '0,10,30' }[name] || '255,255,255';
        const soft = name === 'shade' ? 0.45 : 0.35;
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [soft, 'rgba(' + col + ',0.35)'], [1, 'rgba(' + col + ',0)']]);
        g.fillRect(0, 0, 128, 128);
        return (SPR[name] = cv);
      }
      const glow = (g, name, x, y, r, a) => { g.globalAlpha = a; g.drawImage(sprite(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
      function makeLayer(w, h, dpr){
        const cv = doc.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
        const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h, dpr };
      }

      // ── the water: colour by depth (design y), used for haze everywhere ──
      const WATER = [[0, [72, 196, 214]], [0.18, [34, 156, 190]], [0.45, [16, 112, 158]], [0.75, [10, 82, 128]], [1, [8, 66, 108]]];
      function waterAt(y){
        const k = clamp01(y / DH);
        for (let i = 1; i < WATER.length; i++) if (k <= WATER[i][0]){ const a = WATER[i - 1], b = WATER[i]; return mixc(a[1], b[1], (k - a[0]) / (b[0] - a[0])); }
        return WATER[WATER.length - 1][1];
      }
      const haze = (col, y, z) => mixc(col, waterAt(y), clamp01(z));   // z: 0 near → 1 lost in the blue

      // ── the shared current: one slow wandering value in ~[-1,1] ──
      const cur = t => 0.6 * Math.sin(t * 0.21) + 0.3 * Math.sin(t * 0.37 + 1.7) + 0.1 * Math.sin(t * 0.83 + 0.4);

      // ── shapes ──
      // a lumpy closed blob around an ellipse; `rough` = radius noise, `sd` = seed
      function blobPath(g, x, y, rx, ry, n, rough, sd, flatBottom){ g.beginPath(); blobTo(g, x, y, rx, ry, n, rough, sd, flatBottom); }
      function blobTo(g, x, y, rx, ry, n, rough, sd, flatBottom){
        const pts = [];
        for (let i = 0; i < n; i++){
          const a = i / n * TAU, k = 1 + (psr(sd + i * 3) - 0.5) * rough * 2;
          let px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
          if (flatBottom && py > ry * 0.55) py = ry * 0.55 + (py - ry * 0.55) * 0.25;
          pts.push([x + px, y + py]);
        }
        for (let i = 0; i < n; i++){
          const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(p[0], p[1], mx, my);
        }
        const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        g.closePath();
      }
      // a soft contact shadow under an element
      function shadow(g, x, y, rx, ry, a){
        g.save(); g.translate(x + rx * 0.18, y); g.scale(rx, ry);
        g.fillStyle = rg(g, 0, 0, 0, 1, [[0, 'rgba(4,20,40,' + a + ')'], [0.6, 'rgba(4,20,40,' + a * 0.45 + ')'], [1, 'rgba(4,20,40,0)']]);
        g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
      }

      // ═══════════════════════════ CORAL LIFE ═══════════════════════════
      // The hard corals stay baked in the still layers (that is what keeps the
      // scene cheap), but while they are painted they REGISTER the parts of
      // themselves that live: polyps (LIFE), christmas-tree worms (WORMS),
      // sponge openings (VENTS), mushroom-coral fringes (FRINGES). Those are
      // drawn per frame in a handful of batched paths (drawCoralLife): polyps
      // pulse in a slow wave across the reef and pull IN when a fish brushes
      // past or a coral is tapped (CORALS[].ret), worms dart into their tubes,
      // sponges breathe, and a tapped coral SPAWNS a cloud of eggs. Giant clams
      // are drawn live (CLAMS): they gape slowly and snap shut when startled.
      const CORALS = [], LIFE = [], WORMS = [], VENTS = [], FRINGES = [], CLAMS = [], EGGS = [], SPECKS = [];
      let PAINT_FORE = false;                                     // set while the foreground band is painted
      const POLYP_COL = ['255,246,228', '255,204,218', '226,246,194', '228,208,255'];   // warm white · pink · pale green · lilac
      function coralReg(kind, x, y, r, pal){ CORALS.push({ kind, x, y, r, pal, ret: 0, retT: -99, fore: PAINT_FORE }); return CORALS.length - 1; }
      function polyp(ci, x, y, r, b, sd){ LIFE.push({ x, y, r, b: b & 3, ph: psr(sd) * TAU, ci, fore: PAINT_FORE }); }
      function startleCoral(C, t){ C.ret = 1; C.retT = t; }
      function snapClam(K, t){ if (t < K.snapT + 3) return; K.snapT = t; puff(K.x, K.y - K.w * 0.4, 4); }
      function spawnCoral(C, t){
        startleCoral(C, t);
        for (let i = 0; i < 40; i++) EGGS.push({ x: C.x + (Math.random() - 0.5) * C.r * 1.5, y: C.y - Math.random() * C.r * 0.7, v: 12 + Math.random() * 22, t0: t + Math.random() * 1.2, ph: Math.random() * TAU, k: Math.random() < 0.6 ? 0 : 1 });
      }

      // ═══════════════════════════ THE STILL REEF ═══════════════════════════
      function paintWater(g){
        g.fillStyle = lg(g, 0, 0, 0, DH, WATER.map(s => [s[0], rgb(s[1])]));
        g.fillRect(-400, -600, DW + 800, DH + 600);
        // above the surface line the sky-through-water is brighter still
        g.fillStyle = lg(g, 0, -600, 0, 0, [[0, 'rgba(200,245,255,1)'], [1, rgb(WATER[0][1])]]);
        g.fillRect(-400, -600, DW + 800, 600);
        // sun bloom, high left
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = rg(g, SUNX, SUNY, 0, 760, [[0, 'rgba(255,250,220,0.55)'], [0.18, 'rgba(230,250,255,0.22)'], [0.5, 'rgba(180,240,255,0.07)'], [1, 'rgba(180,240,255,0)']]);
        g.fillRect(-400, -600, DW + 800, DH + 600);
        g.restore();
        // the surface: a band of rippled light along the top edge
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++){
          const x = -100 + psr(i + 900) * (DW + 200), w = 60 + psr(i + 901) * 160, y = 6 + psr(i + 902) * 42, a = 0.10 + psr(i + 903) * 0.16;
          g.fillStyle = rg(g, x, y, 0, 1, [[0, 'rgba(220,250,255,' + a + ')'], [1, 'rgba(220,250,255,0)']]);
          g.save(); g.translate(x, y); g.scale(w, 4 + psr(i + 904) * 6); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
        g.restore();
        // gentle darkening of the lower water (depth)
        g.fillStyle = lg(g, 0, 380, 0, DH, [[0, 'rgba(4,30,60,0)'], [1, 'rgba(4,30,60,0.28)']]);
        g.fillRect(-400, 380, DW + 800, DH - 380);
      }

      // ── far reef: two planes of hazy silhouettes with coral-like bumps ──
      function paintFarReef(g){
        for (let plane = 0; plane < 2; plane++){
          const z = plane ? 0.55 : 0.74, baseY = plane ? 768 : 735, n = plane ? 22 : 18;
          for (let i = 0; i < n; i++){
            const x = -80 + (i + psr(i + plane * 50) * 0.8) * (DW + 160) / n, rx = 40 + psr(i + 11 + plane * 50) * 70, ry = 26 + psr(i + 22 + plane * 50) * (plane ? 60 : 90);
            const y = baseY + psr(i + 33 + plane * 50) * 20;
            const col = haze([70, 90, 95], y, z);
            g.fillStyle = rgb(col, plane ? 0.85 : 0.75);
            blobPath(g, x, y, rx, ry, 12, 0.22, i * 7 + plane * 300, true); g.fill();
            // bumps: coral heads on the ridge
            for (let b = 0; b < 4; b++){
              const bx = x + (psr(i * 5 + b + plane * 70) - 0.5) * rx * 1.4, by = y - ry * (0.55 + psr(i * 5 + b + 1) * 0.4), br = 8 + psr(i * 5 + b + 2) * 16;
              g.fillStyle = rgb(haze(psr(b + i) < 0.5 ? [110, 80, 70] : [90, 110, 80], by, z + 0.08), 0.7);
              g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
            }
            // a few staghorn silhouettes
            if (psr(i + 44 + plane * 50) < 0.4){
              g.strokeStyle = rgb(haze([80, 70, 80], y, z), 0.8); g.lineCap = 'round';
              for (let k = 0; k < 5; k++){
                const a = -TAU / 4 + (k - 2) * 0.32 + (psr(i + k) - 0.5) * 0.2, len = 26 + psr(i * 3 + k) * 30;
                g.lineWidth = 3.5; g.beginPath(); g.moveTo(x, y - ry * 0.7); g.lineTo(x + Math.cos(a) * len, y - ry * 0.7 + Math.sin(a) * len); g.stroke();
              }
            }
          }
        }
      }

      // ── the sand ──
      const ground = x => 792 + Math.sin(x * 0.0071) * 9 + Math.sin(x * 0.0193 + 2) * 4;   // the sand line
      function paintSand(g){
        const sand = [222, 205, 168];
        g.beginPath(); g.moveTo(-400, DH + 200);
        for (let x = -400; x <= DW + 400; x += 16) g.lineTo(x, ground(x));
        g.lineTo(DW + 400, DH + 200); g.closePath();
        g.fillStyle = lg(g, 0, 760, 0, DH, [[0, rgb(haze(sand, 780, 0.42))], [0.4, rgb(haze(sand, 830, 0.30))], [1, rgb(haze(lit(sand, -0.12), 900, 0.22))]]);
        g.fill();
        // the sand line's soft edge blends into the water behind it
        g.save(); g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgb(haze(lit(sand, 0.18), 785, 0.35), 0.7); g.lineWidth = 2.5;
        g.beginPath(); for (let x = -400; x <= DW + 400; x += 16) x === -400 ? g.moveTo(x, ground(x) + 1) : g.lineTo(x, ground(x) + 1); g.stroke();
        g.restore();
        // ripples: wavy lines, darker on the far side of each crest, lighter on the near side
        for (let r = 0; r < 12; r++){
          const y0 = 800 + r * 9 + r * r * 0.35, amp = 2 + r * 0.25, ph = psr(r + 700) * TAU, a = 0.12 + r * 0.02;
          g.strokeStyle = 'rgba(40,70,100,' + a + ')'; g.lineWidth = 1.6 + r * 0.12;
          g.beginPath();
          for (let x = -400; x <= DW + 400; x += 12){ const y = y0 + Math.sin(x * 0.018 + ph) * amp + Math.sin(x * 0.041 + ph * 2) * amp * 0.5; x === -400 ? g.moveTo(x, y) : g.lineTo(x, y); }
          g.stroke();
          g.strokeStyle = 'rgba(255,250,235,' + a * 0.9 + ')'; g.lineWidth = 1.2;
          g.beginPath();
          for (let x = -400; x <= DW + 400; x += 12){ const y = y0 + 2.4 + Math.sin(x * 0.018 + ph) * amp + Math.sin(x * 0.041 + ph * 2) * amp * 0.5; x === -400 ? g.moveTo(x, y) : g.lineTo(x, y); }
          g.stroke();
        }
        // grains and bits of shell
        for (let i = 0; i < 260; i++){
          const x = psr(i + 1000) * DW, y = 800 + psr(i + 1001) * 100, r = 0.6 + psr(i + 1002) * 1.4;
          g.fillStyle = psr(i + 1003) < 0.6 ? 'rgba(255,250,240,0.35)' : 'rgba(60,80,100,0.3)';
          g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
      }

      // ── ROCK: a lumpy boulder — a main body plus a few lumps, encrusted with
      //    turf algae and coralline crusts, lit from the upper left ──
      // a rock is a main body plus 2–4 lumps; each is a blob [x, y, rx, ry, n, rough, sd, flat]
      function rockBlobs(R){
        if (R.blobs) return R.blobs;
        const { x, y, rx, ry, sd } = R, out = [[x, y, rx, ry, 22, 0.20, sd, true]];
        const nl = 2 + Math.round(psr(sd + 500) * 2);
        for (let i = 0; i < nl; i++){
          const u = (psr(sd + 510 + i) - 0.5) * 1.5, lx = x + u * rx, ly = y - ry * (0.35 + psr(sd + 520 + i) * 0.45) * Math.sqrt(Math.max(0.1, 1 - u * u * 0.6));
          out.push([lx, ly, rx * (0.22 + psr(sd + 530 + i) * 0.25), ry * (0.25 + psr(sd + 540 + i) * 0.3), 12, 0.22, sd + 600 + i * 9, false]);
        }
        return (R.blobs = out);
      }
      const blobAt = (g, b, dx, dy) => blobTo(g, b[0] + dx, b[1] + dy, b[2], b[3], b[4], b[5], b[6], b[7]);
      function rockPath(g, R){ g.beginPath(); for (const b of rockBlobs(R)) blobAt(g, b, 0, 0); }
      function paintRock(g, R){
        const { x, y, rx, ry, sd, z = 0.1, tone = 0 } = R;
        const base = tone === 1 ? [104, 80, 58] : tone === 2 ? [78, 84, 58] : [92, 70, 72];
        const c = haze(base, y, z), hi = haze(lit(mixc(base, [200, 176, 120], 0.45), 0.3), y, z), lo = haze(lit(base, -0.7), y, z);
        shadow(g, x, y + ry * 0.62, rx * 1.05, ry * 0.3, 0.45);
        rockPath(g, R);
        g.fillStyle = lg(g, x - rx * 0.5, y - ry * 1.1, x + rx * 0.4, y + ry * 0.7, [[0, rgb(hi)], [0.4, rgb(c)], [1, rgb(lo)]]);
        g.fill();
        g.save(); rockPath(g, R); g.clip();
        // sunlit top: a warm wash from the upper left
        g.fillStyle = rg(g, x - rx * 0.3, y - ry * 0.9, 0, Math.max(rx, ry) * 1.15, [[0, rgb(hi, 0.5)], [0.45, rgb(hi, 0.14)], [1, rgb(hi, 0)]]);
        g.fillRect(x - rx * 1.4, y - ry * 1.6, rx * 2.8, ry * 3);
        const rnd = makeRng(sd * 41 + 1);
        // grain: a dense speckle, dark and light
        for (let i = 0; i < 130; i++){
          const px = x + (rnd() - 0.5) * rx * 2.4, py = y + (rnd() - 0.6) * ry * 2.4, pr = 0.6 + rnd() * 2.0, dark = rnd() < 0.62;
          g.fillStyle = dark ? rgb(lo, 0.16 + rnd() * 0.2) : rgb(hi, 0.12 + rnd() * 0.16);
          g.beginPath(); g.ellipse(px, py, pr * 1.4, pr, 0, 0, TAU); g.fill();
        }
        // pits with a lit upper lip
        for (let i = 0; i < 18; i++){
          const px = x + (rnd() - 0.5) * rx * 1.8, py = y + (rnd() - 0.6) * ry * 1.8, pr = 3 + rnd() * 8;
          g.fillStyle = rgb(lo, 0.45); g.beginPath(); g.ellipse(px, py, pr, pr * 0.65, 0, 0, TAU); g.fill();
          g.fillStyle = rgb(hi, 0.3); g.beginPath(); g.ellipse(px - pr * 0.25, py - pr * 0.55, pr * 0.65, pr * 0.22, 0, 0, TAU); g.fill();
        }
        // turf algae: olive / khaki fuzz patches, then coralline crusts: pink, lilac, rusty
        for (let i = 0; i < 20; i++){
          const px = x + (rnd() - 0.5) * rx * 1.9, py = y + (rnd() - 0.55) * ry * 1.9, pr = 5 + rnd() * 18, k = rnd();
          const pc = k < 0.35 ? [116, 132, 54] : k < 0.5 ? [156, 148, 78] : k < 0.78 ? [198, 104, 146] : k < 0.9 ? [146, 88, 160] : [168, 92, 56];
          g.fillStyle = rgb(haze(pc, y, z), k < 0.5 ? 0.6 : 0.7);
          blobPath(g, px, py, pr, pr * (0.5 + rnd() * 0.4), 9, 0.32, sd + i * 11); g.fill();
        }
        // crevices
        g.strokeStyle = rgb(lo, 0.6); g.lineCap = 'round';
        for (let i = 0; i < 6; i++){
          const cx0 = x + (rnd() - 0.5) * rx * 1.5, cy0 = y + (rnd() - 0.7) * ry * 1.3;
          g.lineWidth = 0.8 + rnd() * 1.8; g.beginPath(); g.moveTo(cx0, cy0);
          g.quadraticCurveTo(cx0 + (rnd() - 0.5) * 40, cy0 + 20 + rnd() * 30, cx0 + (rnd() - 0.5) * 30, cy0 + 40 + rnd() * 40); g.stroke();
        }
        // the deep underside
        g.fillStyle = lg(g, 0, y + ry * 0.1, 0, y + ry * 0.7, [[0, rgb(lo, 0)], [1, rgb(lo, 0.55)]]);
        g.fillRect(x - rx * 1.4, y + ry * 0.1, rx * 2.8, ry);
        g.restore();
        // rim light along each blob's upper-left edge: the sliver left uncovered
        // when the blob is laid over a copy of itself shifted down-right
        g.fillStyle = rgb(lit(hi, 0.4), 0.42);
        for (const b of rockBlobs(R)){
          g.save(); g.beginPath(); blobAt(g, b, 0, 0); g.clip();
          g.beginPath(); blobAt(g, b, 0, 0); blobAt(g, b, 2.5, 4.5); g.fill('evenodd');
          g.restore();
        }
      }

      // ── BRAIN CORAL: a dome carved with meandering grooves ──
      function paintBrain(g, C){
        const { x, y, r, sd, z = 0.1, pal = 0 } = C, ry = r * 0.72;
        const base = [[196, 164, 96], [150, 168, 92], [178, 140, 110], [120, 160, 130]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.35), y, z), groove = haze(lit(base, -0.55), y, z);
        const ci = coralReg('brain', x, y - ry * 0.3, r, pal);
        shadow(g, x, y + ry * 0.7, r * 1.1, ry * 0.3, 0.4);
        blobPath(g, x, y, r, ry, 16, 0.08, sd, true);
        g.fillStyle = rg(g, x - r * 0.35, y - ry * 0.55, 0, r * 1.5, [[0, rgb(hi)], [0.5, rgb(c)], [1, rgb(lit(c, -0.35))]]);
        g.fill();
        g.save(); g.clip();
        // the meanders: random walks that turn back on themselves
        const rnd = makeRng(sd * 31 + 7);
        g.lineCap = 'round'; g.lineJoin = 'round';
        const walks = [];
        for (let w = 0; w < Math.round(r * 0.42); w++){
          let px = x + (rnd() - 0.5) * r * 1.6, py = y + (rnd() - 0.5) * ry * 1.6, a = rnd() * TAU;
          const pts = [[px, py]];
          for (let k = 0; k < 8 + rnd() * 10; k++){ a += (rnd() - 0.5) * 2.2; px += Math.cos(a) * 5; py += Math.sin(a) * 4; pts.push([px, py]); }
          walks.push(pts);
          // polyps sit in the grooves; keep the ones inside the dome
          for (let k = 2; k < pts.length; k += 5){ const nx = (pts[k][0] - x) / r, ny = (pts[k][1] - y) / ry; if (nx * nx + ny * ny < 0.8) polyp(ci, pts[k][0], pts[k][1], 1.3, [0, 2, 1, 2][pal], sd + w * 7 + k); }
        }
        const draw = (w, col) => { g.strokeStyle = col; g.lineWidth = w; for (const pts of walks){ g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); } };
        draw(3.6, rgb(groove, 0.85));
        g.save(); g.translate(-0.8, -1.2); draw(1.2, rgb(hi, 0.55)); g.restore();
        g.restore();
      }

      // ── BOULDER CORAL (Porites): a dome pitted with polyps ──
      function paintBoulder(g, C){
        const { x, y, r, sd, z = 0.1, pal = 0 } = C, ry = r * (C.flat ? 0.5 : 0.8);
        const base = [[190, 170, 120], [130, 150, 90], [160, 120, 140], [110, 140, 160], [200, 150, 90]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.3), y, z), lo = haze(lit(base, -0.4), y, z);
        const ci = coralReg('boulder', x, y - ry * 0.3, r, pal);
        for (let i = 0; i < Math.round(r * 0.6); i++){ const a = psr(sd + 400 + i * 2) * TAU, d = Math.sqrt(psr(sd + 401 + i * 2)) * 0.92; polyp(ci, x + Math.cos(a) * d * r, y + Math.sin(a) * d * ry, 1.1 + psr(sd + i) * 0.5, [0, 2, 3, 0, 1][pal], sd + 500 + i); }
        shadow(g, x, y + ry * 0.7, r * 1.1, ry * 0.3, 0.38);
        blobPath(g, x, y, r, ry, 16, 0.10, sd, true);
        g.fillStyle = rg(g, x - r * 0.35, y - ry * 0.5, 0, r * 1.5, [[0, rgb(hi)], [0.55, rgb(c)], [1, rgb(lo)]]);
        g.fill();
        g.save(); g.clip();
        const step = 4.2;
        for (let py = y - ry * 1.05; py < y + ry * 1.05; py += step){
          for (let px = x - r * 1.05; px < x + r * 1.05; px += step){
            const ox = px + (psr(sd + px * 3 + py * 7) - 0.5) * 2, oy = py + (psr(sd + px * 5 + py * 3) - 0.5) * 2;
            const nx = (ox - x) / r, ny = (oy - y) / ry; if (nx * nx + ny * ny > 1) continue;
            const shade = clamp01(0.55 + (nx * 0.5 + ny * 0.6));
            g.fillStyle = rgb(lo, 0.30 + shade * 0.35); g.beginPath(); g.arc(ox, oy, 1.35, 0, TAU); g.fill();
            g.fillStyle = rgb(hi, 0.3 * (1 - shade)); g.beginPath(); g.arc(ox - 0.7, oy - 0.8, 0.7, 0, TAU); g.fill();
          }
        }
        g.restore();
        // christmas-tree worms living on it — drawn live so they can retract
        if (C.worms) for (let i = 0; i < C.worms; i++){
          const wx = x + (psr(sd + 200 + i * 2) - 0.5) * r * 1.2, wy = y - ry * 0.2 + (psr(sd + 201 + i * 2) - 0.5) * ry * 0.8;
          const wc = [[255, 120, 60], [60, 140, 230], [250, 210, 70], [240, 240, 240]][(sd + i) % 4];
          g.fillStyle = rgb(lo, 0.7); g.beginPath(); g.ellipse(wx + 1, wy + 1, 6, 2, 0, 0, TAU); g.fill();   // the tube mouths they hide in
          WORMS.push({ x: wx, y: wy, h: 5 + psr(sd + i) * 3, col: haze(wc, wy, z), ci, ext: 1, ph: psr(sd + i + 7) * TAU, fore: PAINT_FORE });
        }
      }
      function paintWorm(g, x, y, h, col){
        for (let k = 0; k < 2; k++){
          const bx = x + (k ? 5 : -3), sp = k ? 0.85 : 1;
          g.strokeStyle = rgb(col, 0.9); g.lineWidth = 0.9; g.lineCap = 'round';
          for (let i = 0; i < 6; i++){
            const yy = y - i * h * 0.34 * sp, w = (6 - i) * 1.1 * sp;
            g.beginPath(); g.moveTo(bx - w, yy); g.lineTo(bx + w, yy - 1.2); g.stroke();
            g.fillStyle = rgb(col, 0.9); g.beginPath(); g.ellipse(bx, yy - 0.5, w * 0.9, 1.3, 0, 0, TAU); g.fill();
          }
        }
      }

      // ── STAGHORN: branching arms with pale growing tips ──
      function paintStaghorn(g, C){
        const { x, y, h, sd, z = 0.1, pal = 0, spread = 1 } = C;
        const base = [[176, 140, 100], [120, 130, 190], [188, 150, 112], [200, 170, 120], [150, 110, 160]][pal];
        const c = haze(base, y, z), tip = haze(pal === 2 ? [214, 190, 236] : lit(base, 0.7), y, z), dark = haze(lit(base, -0.4), y, z);
        const ci = coralReg('staghorn', x, y - h * 0.45, h * 0.55, pal);
        shadow(g, x, y + 4, h * 0.55, h * 0.12, 0.35);
        const rnd = makeRng(sd * 17 + 3);
        g.lineCap = 'round';
        const seg = (x0, y0, a, len, w, depth) => {
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          const cx = x0 + Math.cos(a - 0.35 * (rnd() - 0.5)) * len * 0.5, cy = y0 + Math.sin(a) * len * 0.5;
          g.strokeStyle = rgb(dark); g.lineWidth = w + 1.6; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
          g.strokeStyle = rgb(c); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
          // polyp texture: pale dots along the branch
          g.fillStyle = rgb(tip, 0.45);
          for (let k = 0.15; k < 1; k += 0.22){ const px = lerp(x0, x1, k) + (rnd() - 0.5) * w, py = lerp(y0, y1, k); g.beginPath(); g.arc(px, py, 0.9, 0, TAU); g.fill(); }
          if (depth <= 0 || w < 1.4){
            // pale growing tip
            g.fillStyle = rgb(tip); g.beginPath(); g.arc(x1, y1, w * 0.55 + 0.4, 0, TAU); g.fill();
            polyp(ci, x1, y1, w * 0.5 + 0.9, pal === 2 ? 3 : 0, sd + x1 * 3 + y1);
            return;
          }
          const n = rnd() < 0.7 ? 2 : 1;
          for (let i = 0; i < n; i++){
            const da = n === 1 ? (rnd() - 0.5) * 0.5 : (i === 0 ? -1 : 1) * (0.32 + rnd() * 0.3) * spread;
            seg(x1, y1, a + da, len * (0.62 + rnd() * 0.2), w * 0.7, depth - 1);
          }
        };
        const arms = 3 + Math.round(rnd() * 2);
        for (let i = 0; i < arms; i++){
          const a = -TAU / 4 + (i - (arms - 1) / 2) * 0.5 * spread + (rnd() - 0.5) * 0.2;
          seg(x + (i - (arms - 1) / 2) * 6, y, a, h * (0.3 + rnd() * 0.12), h * 0.085, 4);
        }
      }

      // ── TABLE CORAL: a wide plate on a short stalk ──
      function paintTable(g, C){
        const { x, y, w, sd, z = 0.1, pal = 0 } = C, h = w * 0.42, py = y - h, ry = w * 0.16;
        const base = [[188, 160, 108], [130, 150, 100], [176, 150, 120]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.35), y, z), lo = haze(lit(base, -0.45), y, z);
        const ci = coralReg('table', x, py, w * 0.5, pal);
        for (let i = 0; i < Math.round(w * 0.3); i++){ const a = psr(sd + 600 + i * 2) * TAU, d = Math.sqrt(psr(sd + 601 + i * 2)) * 0.92; polyp(ci, x + Math.cos(a) * d * w * 0.5, py + Math.sin(a) * d * ry, 1.1 + psr(sd + i) * 0.5, [0, 2, 0][pal], sd + 700 + i); }
        shadow(g, x, y + 3, w * 0.5, w * 0.08, 0.35);
        // stalk
        g.fillStyle = lg(g, x - w * 0.1, 0, x + w * 0.1, 0, [[0, rgb(hi)], [0.5, rgb(c)], [1, rgb(lo)]]);
        g.beginPath(); g.moveTo(x - w * 0.09, y + 2); g.lineTo(x - w * 0.14, py + ry * 0.5); g.lineTo(x + w * 0.14, py + ry * 0.5); g.lineTo(x + w * 0.09, y + 2); g.closePath(); g.fill();
        // the underside rim (dark), then the plate top
        g.fillStyle = rgb(lo); blobPath(g, x, py + ry * 0.35, w * 0.5, ry, 20, 0.08, sd); g.fill();
        g.fillStyle = rg(g, x - w * 0.15, py - ry * 0.3, 0, w * 0.6, [[0, rgb(hi)], [0.6, rgb(c)], [1, rgb(lit(c, -0.15))]]);
        blobPath(g, x, py, w * 0.5, ry, 20, 0.08, sd); g.fill();
        g.save(); blobPath(g, x, py, w * 0.5, ry, 20, 0.08, sd); g.clip();
        // branchlet texture: fine dots, radial streaks
        const rnd = makeRng(sd * 5 + 1);
        for (let i = 0; i < w * 3; i++){
          const a = rnd() * TAU, d = Math.sqrt(rnd()); const dx = Math.cos(a) * d * w * 0.5, dy = Math.sin(a) * d * ry;
          g.fillStyle = rnd() < 0.5 ? rgb(lo, 0.45) : rgb(hi, 0.5); g.beginPath(); g.arc(x + dx, py + dy, 0.9 + rnd() * 0.8, 0, TAU); g.fill();
        }
        g.strokeStyle = rgb(lo, 0.25); g.lineWidth = 0.8;
        for (let i = 0; i < 18; i++){ const a = i / 18 * TAU; g.beginPath(); g.moveTo(x, py); g.lineTo(x + Math.cos(a) * w * 0.5, py + Math.sin(a) * ry); g.stroke(); }
        g.restore();
        // pale rim
        g.strokeStyle = rgb(lit(hi, 0.3), 0.6); g.lineWidth = 1.6; blobPath(g, x, py, w * 0.5, ry, 20, 0.08, sd); g.stroke();
      }

      // ── LETTUCE / PLATE CORAL: stacked wavy leaves ──
      function paintLettuce(g, C){
        const { x, y, w, sd, z = 0.1, pal = 0 } = C;
        const base = [[214, 150, 70], [150, 170, 80], [200, 120, 90], [190, 160, 200]][pal];
        const ci = coralReg('lettuce', x, y - w * 0.2, w * 0.5, pal);
        shadow(g, x, y + 3, w * 0.55, w * 0.1, 0.35);
        const layers = 5;
        for (let L = 0; L < layers; L++){
          const k = L / (layers - 1), ly = y - k * w * 0.36, lw = w * (0.55 - k * 0.22), lh = w * (0.16 - k * 0.04);
          for (let i = 1; i < 24; i += 3){ const u = i / 24, px = x - lw + u * lw * 2, wave = Math.sin(u * TAU * 3 + sd + L) * lh * 0.32; polyp(ci, px, ly - Math.sin(u * Math.PI) * lh * 1.9 + wave + 1.5, 1.1, [0, 2, 1, 3][pal], sd + L * 40 + i); }
          const col = haze(lit(base, -0.3 + k * 0.55), ly, z), edge = haze(lit(base, 0.5), ly, z);
          g.fillStyle = lg(g, 0, ly - lh, 0, ly + lh * 0.4, [[0, rgb(lit(col, 0.15))], [1, rgb(lit(col, -0.25))]]);
          g.beginPath(); g.moveTo(x - lw, ly);
          for (let i = 0; i <= 24; i++){
            const u = i / 24, px = x - lw + u * lw * 2, wave = Math.sin(u * TAU * 3 + sd + L) * lh * 0.32;
            const py = ly - Math.sin(u * Math.PI) * lh * 1.9 + wave;
            g.lineTo(px, py);
          }
          g.lineTo(x + lw, ly + lh * 0.4); g.lineTo(x - lw, ly + lh * 0.4); g.closePath(); g.fill();
          g.strokeStyle = rgb(edge, 0.7); g.lineWidth = 1.2;
          g.beginPath();
          for (let i = 0; i <= 24; i++){ const u = i / 24, px = x - lw + u * lw * 2, wave = Math.sin(u * TAU * 3 + sd + L) * lh * 0.32; const py = ly - Math.sin(u * Math.PI) * lh * 1.9 + wave; i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.stroke();
          // radial ribs
          g.strokeStyle = rgb(lit(col, -0.35), 0.35); g.lineWidth = 0.8;
          for (let i = 1; i < 10; i++){ const u = i / 10; g.beginPath(); g.moveTo(x + (u - 0.5) * lw * 0.6, ly + lh * 0.3); g.lineTo(x - lw + u * lw * 2, ly - Math.sin(u * Math.PI) * lh * 1.6); g.stroke(); }
        }
      }

      // ── MUSHROOM CORAL: an oval disc with radiating septa ──
      function paintMushroom(g, C){
        const { x, y, r, sd, z = 0.1, pal = 0 } = C, ry = r * 0.55;
        const base = [[214, 120, 60], [120, 170, 90], [170, 110, 170], [200, 160, 100]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.5), y, z), lo = haze(lit(base, -0.45), y, z);
        shadow(g, x, y + ry * 0.5, r * 1.05, ry * 0.4, 0.35);
        g.fillStyle = rgb(lo); g.beginPath(); g.ellipse(x, y + 2, r, ry, 0, 0, TAU); g.fill();
        g.fillStyle = rg(g, x - r * 0.2, y - ry * 0.3, 0, r, [[0, rgb(lit(c, 0.1))], [1, rgb(c)]]); g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, TAU); g.clip();
        const n = Math.round(r * 1.3);
        for (let i = 0; i < n; i++){
          const a = i / n * TAU, big = i % 2 === 0;
          g.strokeStyle = rgb(big ? hi : lo, big ? 0.75 : 0.5); g.lineWidth = big ? 1.4 : 0.7;
          g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.16, y + Math.sin(a) * ry * 0.16); g.lineTo(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * ry * 1.02); g.stroke();
        }
        g.restore();
        // the central mouth slit
        g.fillStyle = rgb(lo, 0.9); g.beginPath(); g.ellipse(x, y, r * 0.22, ry * 0.12, 0, 0, TAU); g.fill();
        g.strokeStyle = rgb(hi, 0.5); g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, TAU); g.stroke();
        const ci = coralReg('mushroom', x, y, r, pal);
        FRINGES.push({ x, y, rx: r * 1.02, ry: ry * 1.02, col: rgb(lit(hi, 0.3), 0.85), ci, n: Math.round(r * 1.1), ph: psr(sd) * TAU, fore: PAINT_FORE });
      }

      // ── FINGER CORAL: knobbly upright fingers ──
      function paintFingers(g, C){
        const { x, y, w, sd, z = 0.1, pal = 0 } = C;
        const base = [[150, 110, 170], [190, 165, 120], [120, 160, 190], [200, 130, 110]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.4), y, z), lo = haze(lit(base, -0.4), y, z);
        shadow(g, x, y + 3, w * 0.6, w * 0.12, 0.36);
        const rnd = makeRng(sd * 13 + 5), n = 5 + Math.round(rnd() * 4);
        const fingers = [];
        for (let i = 0; i < n; i++){ const u = (i - (n - 1) / 2) / n; fingers.push({ fx: x + u * w * 1.3 + (rnd() - 0.5) * 6, fh: w * (0.45 + rnd() * 0.5) * (1 - Math.abs(u) * 0.7), fw: w * (0.09 + rnd() * 0.05), lean: (rnd() - 0.5) * 0.25 + u * 0.35 }); }
        fingers.sort((a, b) => b.fh - a.fh);   // taller (further back) first
        const ci = coralReg('fingers', x, y - w * 0.35, w * 0.7, pal);
        for (const f of fingers){
          const tx = f.fx + f.lean * f.fh, ty = y - f.fh;
          polyp(ci, tx, ty, f.fw * 0.7, [3, 0, 0, 1][pal], sd + tx * 3);
          g.save();
          g.strokeStyle = rgb(lo); g.lineCap = 'round'; g.lineWidth = f.fw * 2 + 1.5; g.beginPath(); g.moveTo(f.fx, y + 2); g.quadraticCurveTo(f.fx + f.lean * f.fh * 0.3, y - f.fh * 0.5, tx, ty); g.stroke();
          g.strokeStyle = lg(g, f.fx - f.fw, 0, f.fx + f.fw, 0, [[0, rgb(hi)], [0.55, rgb(c)], [1, rgb(lo)]]); g.lineWidth = f.fw * 2;
          g.beginPath(); g.moveTo(f.fx, y + 2); g.quadraticCurveTo(f.fx + f.lean * f.fh * 0.3, y - f.fh * 0.5, tx, ty); g.stroke();
          // knobs + a pale cap
          for (let k = 0.2; k < 0.95; k += 0.16){
            const kx = lerp(f.fx, tx, k) + (rnd() - 0.5) * f.fw, ky = lerp(y, ty, k);
            g.fillStyle = rgb(lo, 0.35); g.beginPath(); g.arc(kx + f.fw * 0.3, ky, f.fw * 0.35, 0, TAU); g.fill();
            g.fillStyle = rgb(hi, 0.35); g.beginPath(); g.arc(kx - f.fw * 0.3, ky - f.fw * 0.2, f.fw * 0.3, 0, TAU); g.fill();
          }
          g.fillStyle = rgb(lit(hi, 0.3)); g.beginPath(); g.arc(tx, ty, f.fw * 0.85, 0, TAU); g.fill();
          g.restore();
        }
      }

      // ── TUBE SPONGES: a cluster of open tubes ──
      function paintTubes(g, C){
        const { x, y, h, sd, z = 0.1, pal = 0 } = C;
        const base = [[130, 70, 170], [230, 190, 60], [220, 120, 60], [190, 60, 90], [90, 150, 200]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.35), y, z), lo = haze(lit(base, -0.5), y, z);
        shadow(g, x, y + 3, h * 0.45, h * 0.1, 0.36);
        const rnd = makeRng(sd * 11 + 9), n = 3 + Math.round(rnd() * 3);
        const tubes = [];
        for (let i = 0; i < n; i++){ const u = (i - (n - 1) / 2) / Math.max(1, n - 1); tubes.push({ tx: x + u * h * 0.5, th: h * (0.6 + rnd() * 0.4) * (1 - Math.abs(u) * 0.35), tw: h * (0.08 + rnd() * 0.05), lean: u * 0.4 + (rnd() - 0.5) * 0.2 }); }
        tubes.sort((a, b) => b.th - a.th);
        const ci = coralReg('tubes', x, y - h * 0.5, h * 0.5, pal);
        for (const T of tubes){
          const tx = T.tx + T.lean * T.th, ty = y - T.th;
          VENTS.push({ x: tx, y: ty, r: T.tw, ci, ph: psr(sd + tx) * TAU, nextAt: Math.random() * 3, fore: PAINT_FORE });
          g.save();
          g.beginPath(); g.moveTo(T.tx - T.tw * 0.8, y + 2); g.quadraticCurveTo(T.tx - T.tw + T.lean * T.th * 0.4, y - T.th * 0.5, tx - T.tw, ty);
          g.lineTo(tx + T.tw, ty); g.quadraticCurveTo(T.tx + T.tw + T.lean * T.th * 0.4, y - T.th * 0.5, T.tx + T.tw * 0.8, y + 2); g.closePath();
          g.fillStyle = lg(g, T.tx - T.tw, 0, T.tx + T.tw, 0, [[0, rgb(hi)], [0.45, rgb(c)], [1, rgb(lo)]]); g.fill();
          g.clip();
          g.strokeStyle = rgb(lo, 0.35); g.lineWidth = 0.8;
          for (let k = -0.6; k <= 0.6; k += 0.3){ g.beginPath(); g.moveTo(T.tx + k * T.tw, y + 2); g.quadraticCurveTo(T.tx + k * T.tw + T.lean * T.th * 0.4, y - T.th * 0.5, tx + k * T.tw, ty); g.stroke(); }
          for (let i = 0; i < 30; i++){ g.fillStyle = rgb(rnd() < 0.5 ? lo : hi, 0.3); g.beginPath(); g.arc(T.tx + (rnd() - 0.5) * T.tw * 2 + T.lean * T.th * rnd(), y - rnd() * T.th, 0.8, 0, TAU); g.fill(); }
          g.restore();
          // the opening
          g.fillStyle = rgb(lit(lo, -0.5)); g.beginPath(); g.ellipse(tx, ty, T.tw, T.tw * 0.45, 0, 0, TAU); g.fill();
          g.strokeStyle = rgb(hi, 0.8); g.lineWidth = 1.4; g.beginPath(); g.ellipse(tx, ty, T.tw, T.tw * 0.45, 0, 0, TAU); g.stroke();
        }
      }

      // ── BARREL SPONGE: one big ribbed vase ──
      function paintBarrel(g, C){
        const { x, y, h, sd, z = 0.1 } = C, base = [170, 80, 60], w = h * 0.62;
        const c = haze(base, y, z), hi = haze(lit(base, 0.35), y, z), lo = haze(lit(base, -0.5), y, z);
        shadow(g, x, y + 3, w * 0.7, h * 0.1, 0.4);
        g.beginPath(); g.moveTo(x - w * 0.42, y + 2); g.bezierCurveTo(x - w * 0.7, y - h * 0.3, x - w * 0.62, y - h * 0.8, x - w * 0.5, y - h);
        g.lineTo(x + w * 0.5, y - h); g.bezierCurveTo(x + w * 0.62, y - h * 0.8, x + w * 0.7, y - h * 0.3, x + w * 0.42, y + 2); g.closePath();
        g.fillStyle = lg(g, x - w * 0.6, 0, x + w * 0.6, 0, [[0, rgb(hi)], [0.4, rgb(c)], [1, rgb(lo)]]); g.fill();
        g.save(); g.clip();
        g.strokeStyle = rgb(lo, 0.5); g.lineWidth = 1.6;
        for (let i = -4; i <= 4; i++){ const u = i / 4; g.beginPath(); g.moveTo(x + u * w * 0.4, y + 2); g.bezierCurveTo(x + u * w * 0.66, y - h * 0.3, x + u * w * 0.6, y - h * 0.8, x + u * w * 0.5, y - h); g.stroke(); }
        const rnd = makeRng(sd);
        for (let i = 0; i < 60; i++){ g.fillStyle = rgb(rnd() < 0.5 ? lo : hi, 0.35); g.beginPath(); g.arc(x + (rnd() - 0.5) * w * 1.2, y - rnd() * h, 1 + rnd(), 0, TAU); g.fill(); }
        g.restore();
        g.fillStyle = rgb(lit(lo, -0.55)); g.beginPath(); g.ellipse(x, y - h, w * 0.5, w * 0.2, 0, 0, TAU); g.fill();
        g.strokeStyle = rgb(hi, 0.85); g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - h, w * 0.5, w * 0.2, 0, 0, TAU); g.stroke();
        const ci = coralReg('barrel', x, y - h * 0.5, w * 0.6, 0);
        VENTS.push({ x, y: y - h, r: w * 0.45, ci, ph: psr(sd) * TAU, nextAt: Math.random() * 3, big: true, fore: PAINT_FORE });
      }

      // ── GIANT CLAM: a ridged shell with a wavy iridescent mantle ──
      function paintClam(g, C, open, t){
        const { x, y, w, sd, z = 0.1 } = C, h = w * 0.55, o = open === undefined ? 1 : open, tt = t || 0;
        const shell = haze([200, 190, 170], y, z), shellLo = haze([120, 110, 100], y, z);
        const mantle = haze([40, 110, 160], y, z), mantleHi = haze([90, 220, 230], y, z), spots = haze([20, 60, 120], y, z);
        shadow(g, x, y + 3, w * 0.55, h * 0.2, 0.35);
        // lower valve (a wedge)
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(shell)], [1, rgb(shellLo)]]);
        g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.5); g.quadraticCurveTo(x - w * 0.3, y + h * 0.3, x, y + h * 0.15); g.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.5, y - h * 0.5); g.closePath(); g.fill();
        // the mantle: a wavy band between the valves
        g.beginPath();
        for (let i = 0; i <= 30; i++){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * 0.2 + Math.sin(u * TAU * 3.5 + sd) * h * 0.12; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        // the gape: the upper valve rides on the mantle, which shrinks to nothing when the clam shuts
        const gape = 0.2 + 0.45 * o;
        for (let i = 30; i >= 0; i--){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * gape - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.12 * o; g.lineTo(px, py); }
        g.closePath();
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(mantle)], [0.5, rgb(mantleHi)], [1, rgb(mantle)]]); g.fill();
        g.save(); g.clip();
        // the mantle's iridescent spots shimmer between blue and green
        for (let i = 0; i < 24; i++){ const k = 0.5 + 0.5 * Math.sin(tt * 2 + i * 1.7); g.fillStyle = rgb(mixc(spots, mantleHi, k * 0.7), 0.85); g.beginPath(); g.arc(x - w * 0.45 + psr(sd + i * 2) * w * 0.9, y - h * 0.5 - (0.12 + psr(sd + i * 2 + 1) * 0.25) * h * gape / 0.65, 1.2 + psr(sd + i) * 1.4, 0, TAU); g.fill(); }
        g.restore();
        // upper valve ridges
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(lit(shell, 0.2))], [1, rgb(shellLo)]]);
        g.beginPath();
        for (let i = 0; i <= 30; i++){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * gape - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.12 * o; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        for (let i = 30; i >= 0; i--){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * (gape + 0.6) - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.1; g.lineTo(px, py); }
        g.closePath(); g.fill();
        g.strokeStyle = rgb(shellLo, 0.55); g.lineWidth = 1;
        for (let i = 1; i < 7; i++){ const u = i / 7; g.beginPath(); g.moveTo(x - w * 0.5 + u * w, y - h * 0.5 - Math.sin(u * Math.PI) * h * (gape + 0.05)); g.lineTo(x + (u - 0.5) * w * 0.5, y - h * 0.5 - Math.sin(u * Math.PI) * h * (gape + 0.55)); g.stroke(); }
      }
      function drawClam(g, K, t){ paintClam(g, K, K.open, t); }

      // ── SEA STAR / URCHIN / SHELL ──
      function paintStar(g, C){
        const { x, y, r, sd, z = 0.05, pal = 0 } = C, base = [[230, 110, 60], [60, 110, 220], [210, 60, 90]][pal];
        const c = haze(base, y, z), hi = haze(lit(base, 0.4), y, z), lo = haze(lit(base, -0.4), y, z), rot = psr(sd) * TAU;
        shadow(g, x, y + r * 0.2, r * 1.1, r * 0.35, 0.3);
        g.save(); g.translate(x, y); g.scale(1, 0.55); g.rotate(rot);
        g.beginPath();
        for (let i = 0; i < 10; i++){ const a = i / 10 * TAU, rr = i % 2 === 0 ? r : r * 0.34; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? g.quadraticCurveTo(Math.cos(a - TAU / 20) * rr * (i % 2 ? 0.9 : 0.75), Math.sin(a - TAU / 20) * rr * (i % 2 ? 0.9 : 0.75), px, py) : g.moveTo(px, py); }
        g.closePath(); g.fillStyle = rg(g, -r * 0.2, -r * 0.2, 0, r, [[0, rgb(hi)], [1, rgb(c)]]); g.fill();
        g.fillStyle = rgb(lo, 0.7);
        for (let i = 0; i < 5; i++){ const a = i / 5 * TAU; for (let k = 0.2; k < 0.95; k += 0.14){ g.beginPath(); g.arc(Math.cos(a) * r * k, Math.sin(a) * r * k, 1.1, 0, TAU); g.fill(); } }
        g.restore();
      }
      function paintUrchin(g, C){
        const { x, y, r, sd, z = 0.05 } = C, c = haze([30, 22, 50], y, z), sp = haze([60, 40, 90], y, z);
        shadow(g, x, y + r * 0.3, r * 1.4, r * 0.4, 0.3);
        g.strokeStyle = rgb(sp, 0.9); g.lineWidth = 1; g.lineCap = 'round';
        for (let i = 0; i < 44; i++){ const a = psr(sd + i) * TAU, len = r * (1.3 + psr(sd + i + 50) * 0.9); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.75); g.stroke(); }
        g.fillStyle = rg(g, x - r * 0.3, y - r * 0.3, 0, r, [[0, rgb(lit(c, 0.35))], [1, rgb(c)]]); g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, TAU); g.fill();
      }
      function paintShell(g, C){
        const { x, y, r, sd, z = 0.05 } = C, c = haze([235, 215, 190], y, z), lo = haze([170, 130, 120], y, z);
        g.save(); g.translate(x, y); g.rotate((psr(sd) - 0.5) * 0.8); g.scale(1, 0.6);
        g.fillStyle = rg(g, -r * 0.2, -r * 0.3, 0, r, [[0, rgb(c)], [1, rgb(lo)]]);
        g.beginPath(); g.moveTo(0, r * 0.6); for (let i = 0; i <= 9; i++){ const a = Math.PI + i / 9 * Math.PI, rr = r * (1 + (i % 2) * 0.12); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9 + r * 0.2); } g.closePath(); g.fill();
        g.strokeStyle = rgb(lo, 0.6); g.lineWidth = 0.7;
        for (let i = 1; i < 9; i++){ const a = Math.PI + i / 9 * Math.PI; g.beginPath(); g.moveTo(0, r * 0.6); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9 + r * 0.2); g.stroke(); }
        g.restore();
      }

      // ═══════════════════════════ THE SWAYING THINGS ═══════════════════════════
      // Drawn live in design coords. `c` = the current (~[-1,1]) at this frame.
      // Each element bends from its base: `bend(k)` returns the x-offset at
      // height fraction k for a given amplitude, with the element's own phase.

      // ── SEA FAN: a lattice fan on a short stem ──
      function buildFan(F){
        const rnd = makeRng(F.sd * 7 + 2), branches = [];
        const n = 9 + Math.round(rnd() * 4);
        for (let i = 0; i < n; i++){
          const a = -TAU / 4 + (i - (n - 1) / 2) / (n - 1) * 2.1 + (rnd() - 0.5) * 0.12;
          const len = F.h * (0.75 + rnd() * 0.25) * (1 - Math.abs(i - (n - 1) / 2) / (n - 1) * 0.35);
          const cx = Math.cos(a) * len * 0.5 + (rnd() - 0.5) * F.h * 0.1, cy = Math.sin(a) * len * 0.5 - F.h * 0.1;
          branches.push({ a, len, cx, cy });
        }
        F.branches = branches; return F;
      }
      function drawFan(g, F, t, c){
        const { x, y, h, z = 0.1, pal = 0, sd } = F, base = [[170, 60, 130], [220, 100, 60], [200, 60, 90], [120, 70, 160]][pal];
        const col = haze(base, y - h * 0.5, z), hi = haze(lit(base, 0.35), y - h * 0.5, z);
        const bendA = c * 0.16 + Math.sin(t * 0.9 + sd) * 0.02;   // whole fan leans with the current
        g.save(); g.translate(x, y); g.rotate(bendA * (F.face || 1));
        g.lineCap = 'round';
        // stem
        g.strokeStyle = rgb(lit(col, -0.35)); g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -h * 0.14); g.stroke();
        // branches
        g.strokeStyle = rgb(col, 0.9);
        for (const b of F.branches){
          g.lineWidth = h * 0.022; g.beginPath(); g.moveTo(0, -h * 0.12); g.quadraticCurveTo(b.cx, b.cy - h * 0.12, Math.cos(b.a) * b.len, Math.sin(b.a) * b.len - h * 0.12); g.stroke();
        }
        // the lattice: wavy arcs crossing the branches, lighter
        g.strokeStyle = rgb(hi, 0.65); g.lineWidth = h * 0.012;
        for (let r = 0.22; r < 0.98; r += 0.13){
          g.beginPath();
          for (let i = 0; i <= 16; i++){
            const u = i / 16, a = -TAU / 4 - 1.05 + u * 2.1, rr = h * r * (1 - Math.abs(u - 0.5) * 0.5) * (1 + Math.sin(u * 30 + sd + r * 40) * 0.05);
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr - h * 0.12;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.stroke();
        }
        g.restore();
      }

      // ── SOFT CORAL (Dendronephthya): translucent stalks with puffs ──
      function buildSoft(Sf){
        const rnd = makeRng(Sf.sd * 3 + 11), stalks = [], n = 5 + Math.round(rnd() * 4);
        for (let i = 0; i < n; i++){
          const a = -TAU / 4 + (i - (n - 1) / 2) / n * 1.9 + (rnd() - 0.5) * 0.2, len = Sf.h * (0.55 + rnd() * 0.45);
          const puffs = []; const m = 3 + Math.round(rnd() * 3);
          for (let k = 0; k < m; k++) puffs.push({ dx: (rnd() - 0.5) * Sf.h * 0.22, dy: (rnd() - 0.5) * Sf.h * 0.16, r: Sf.h * (0.05 + rnd() * 0.06) });
          stalks.push({ a, len, puffs, ph: rnd() * TAU });
        }
        Sf.stalks = stalks; return Sf;
      }
      function drawSoft(g, Sf, t, c){
        const { x, y, h, z = 0.1, pal = 0, sd } = Sf, base = [[240, 110, 150], [250, 140, 70], [230, 80, 100], [200, 120, 230], [250, 200, 90]][pal];
        const col = haze(base, y - h * 0.5, z), hi = haze(lit(base, 0.55), y - h * 0.5, z), stalk = haze(lit(base, 0.5), y, z);
        const lean = c * 0.13;
        g.save(); g.translate(x, y);
        g.lineCap = 'round';
        // trunk
        g.strokeStyle = rgb(stalk, 0.75); g.lineWidth = h * 0.09; g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(lean * h * 0.2, -h * 0.12, lean * h * 0.35, -h * 0.25); g.stroke();
        for (const s of Sf.stalks){
          const wob = Math.sin(t * 1.1 + s.ph) * 0.03 + lean * 0.9;
          const ex = Math.cos(s.a + wob) * s.len + lean * h * 0.35, ey = Math.sin(s.a + wob) * s.len - h * 0.25;
          g.strokeStyle = rgb(stalk, 0.7); g.lineWidth = h * 0.035; g.beginPath(); g.moveTo(lean * h * 0.35, -h * 0.25); g.quadraticCurveTo(lean * h * 0.35 + (ex - lean * h * 0.35) * 0.4, -h * 0.25 + (ey + h * 0.25) * 0.6, ex, ey); g.stroke();
          // the puffs: a cluster of polyp balls, lighter core (one path per colour)
          g.fillStyle = rgb(col, 0.9); g.beginPath();
          for (const p of s.puffs){ const px = ex + p.dx, py = ey + p.dy; g.moveTo(px + p.r, py); g.arc(px, py, p.r, 0, TAU); }
          g.fill();
          g.fillStyle = rgb(hi, 0.7); g.beginPath();
          for (const p of s.puffs){ const px = ex + p.dx - p.r * 0.3, py = ey + p.dy - p.r * 0.3, pr = p.r * 0.5; g.moveTo(px + pr, py); g.arc(px, py, pr, 0, TAU); }
          g.fill();
          g.fillStyle = rgb(lit(col, -0.3), 0.5); g.beginPath();
          for (const p of s.puffs){
            const px = ex + p.dx, py = ey + p.dy, pr = p.r * 0.22;
            for (let k = 0; k < 5; k++){ const a = k / 5 * TAU + p.r, cxp = px + Math.cos(a) * p.r * 0.75, cyp = py + Math.sin(a) * p.r * 0.75; g.moveTo(cxp + pr, cyp); g.arc(cxp, cyp, pr, 0, TAU); }
          }
          g.fill();
        }
        g.restore();
      }

      // ── SEA WHIPS: long thin rods that bow in the current ──
      function drawWhips(g, Wp, t, c){
        const { x, y, h, n = 5, z = 0.1, pal = 0, sd } = Wp, base = [[250, 200, 60], [230, 90, 60], [170, 70, 190], [240, 150, 60]][pal];
        const col = haze(base, y - h * 0.5, z), hi = haze(lit(base, 0.4), y - h * 0.5, z);
        g.lineCap = 'round';
        for (let i = 0; i < n; i++){
          const u = (i - (n - 1) / 2) / Math.max(1, n - 1), len = h * (0.7 + psr(sd + i) * 0.3), bx = x + u * h * 0.12;
          const bend = (c * 0.55 + Math.sin(t * 0.8 + sd + i) * 0.08) * len * 0.35 + u * len * 0.12;
          const tipx = bx + bend, tipy = y - len + Math.abs(bend) * 0.25;
          g.strokeStyle = rgb(lit(col, -0.3)); g.lineWidth = 3.2; g.beginPath(); g.moveTo(bx, y + 2); g.quadraticCurveTo(bx + bend * 0.25, y - len * 0.6, tipx, tipy); g.stroke();
          g.strokeStyle = rgb(col); g.lineWidth = 2; g.beginPath(); g.moveTo(bx, y + 2); g.quadraticCurveTo(bx + bend * 0.25, y - len * 0.6, tipx, tipy); g.stroke();
          g.strokeStyle = rgb(hi, 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(bx - 0.6, y); g.quadraticCurveTo(bx - 0.6 + bend * 0.25, y - len * 0.6, tipx - 0.5, tipy); g.stroke();
        }
      }

      // ── SEAGRASS: a tuft of blades ──
      function drawGrass(g, Gr, t, c){
        const { x, y, h, n = 9, z = 0.05, sd } = Gr, base = [70, 150, 80];
        const col = haze(base, y, z), hi = haze(lit(base, 0.4), y, z);
        g.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++){                    // dark blades, then pale ones
          g.strokeStyle = rgb(pass ? hi : col, 0.92); g.lineWidth = 1.8; g.beginPath();
          for (let i = 0; i < n; i++){
            if ((psr(sd + i + 30) < 0.5 ? 0 : 1) !== pass) continue;
            const u = (i - (n - 1) / 2) / n, len = h * (0.6 + psr(sd + i) * 0.4), bx = x + u * h * 0.35;
            const bend = (c * 0.7 + Math.sin(t * 1.3 + sd * 2 + i * 0.7) * 0.15) * len * 0.5 + u * len * 0.3;
            g.moveTo(bx, y + 2); g.quadraticCurveTo(bx + bend * 0.15, y - len * 0.6, bx + bend, y - len + Math.abs(bend) * 0.3);
          }
          g.stroke();
        }
      }

      // ── SEA ANEMONE: the clownfish house ──
      function buildAnemone(A){
        A.idx = ANEMS.length;
        const rnd = makeRng(A.sd * 19 + 23), tents = [], n = A.n || 130;
        for (let i = 0; i < n; i++){
          const th0 = rnd() * TAU, rho = Math.sqrt(rnd());            // where on the oral disc it grows (angle, radius 0..1)
          const len = A.r * (0.7 + rnd() * 0.6), th = A.r * (0.036 + rnd() * 0.03);
          tents.push({ th0, rho, len, th, tipR: th * (1.0 + rnd() * 0.7), ph: rnd() * TAU, wob: 0.5 + rnd() * 0.9, curl: 0.4 + rnd() * 0.7, v: (Math.sin(th0) + 1) / 2 });
        }
        tents.sort((a, b) => a.v - b.v);                                // back of the disc first (v small = back)
        A.tents = tents; return A;
      }
      function paintAnemone(g, A, t, c, part){
        const { x, y, r, z = 0.08, pal = 0, sd } = A;
        const PAL = [
          { col: [120, 50, 140], tent: [196, 176, 128], tip: [232, 120, 160] },   // purple column, sandy tentacles, pink bulbs
          { col: [176, 66, 58],  tent: [176, 168, 112], tip: [150, 220, 110] },   // red column, olive-tan tentacles, green tips
          { col: [200, 120, 60], tent: [222, 204, 170], tip: [236, 130, 90] },    // orange column, pale tentacles, orange tips
        ][pal];
        const cw = r * 0.55, ch = r * 0.42, top = y - ch, dr = cw * 0.42;   // column half-width/height, oral disc half-depth
        if (!A.pre){
          const colC = haze(PAL.col, y, z), colHi = haze(lit(PAL.col, 0.35), y, z), colLo = haze(lit(PAL.col, -0.45), y, z);
          const tent = haze(PAL.tent, top - r * 0.4, z), tentLo = haze(lit(PAL.tent, -0.45), top - r * 0.4, z), tip = haze(PAL.tip, top - r * 0.5, z), tipHi = haze(lit(PAL.tip, 0.55), top - r * 0.5, z);
          A.pre = { colC, colHi, colLo };
          for (const T of A.tents){
            const shade = 0.45 + 0.55 * T.v;                           // front tentacles are lit, back ones sit in shade
            T.cBody = rgb(mixc(tentLo, tent, shade)); T.cHi = rgb(lit(tent, 0.35), 0.4 * shade);
            T.cTip = rgb(mixc(lit(tip, -0.35), tip, shade)); T.cTipHi = rgb(tipHi, 0.8 * shade);
            T.bx = Math.cos(T.th0) * T.rho * cw * 0.95; T.by = Math.sin(T.th0) * T.rho * dr;   // base on the disc
          }
        }
        const { colC, colHi, colLo } = A.pre;
        const lean = c * 0.3;
        const n = A.tents.length, back = n >> 1;
        g.lineCap = 'round';
        if (part === 'front'){ for (let i = back; i < n; i++) drawTent(A.tents[i], g, t, lean); return; }
        if (part === 'back'){ for (let i = 0; i < back; i++) drawTent(A.tents[i], g, t, lean); return; }
        shadow(g, x, y + r * 0.08, r * 1.2, r * 0.26, 0.42);
        // the column: mostly hidden under the drape, fleshy, striped
        g.fillStyle = lg(g, x - cw, 0, x + cw, 0, [[0, rgb(colHi)], [0.45, rgb(colC)], [1, rgb(colLo)]]);
        g.beginPath(); g.moveTo(x - cw * 0.85, y + 1); g.bezierCurveTo(x - cw * 1.1, y - ch * 0.4, x - cw * 1.02, top + dr, x - cw, top); g.lineTo(x + cw, top); g.bezierCurveTo(x + cw * 1.02, top + dr, x + cw * 1.1, y - ch * 0.4, x + cw * 0.85, y + 1); g.closePath(); g.fill();
        g.save(); g.clip(); g.strokeStyle = rgb(colLo, 0.35); g.lineWidth = 1.1;
        for (let i = -5; i <= 5; i++){ const u = i / 5; g.beginPath(); g.moveTo(x + u * cw * 0.85, y); g.quadraticCurveTo(x + u * cw * 1.05, y - ch * 0.5, x + u * cw, top); g.stroke(); }
        g.fillStyle = rgb(colHi, 0.3);
        for (let i = 0; i < 30; i++){ g.beginPath(); g.arc(x + (psr(sd + i) - 0.5) * cw * 2, y - psr(sd + i + 100) * ch, 1.1, 0, TAU); g.fill(); }
        g.restore();
        // the oral disc
        g.fillStyle = lg(g, 0, top - dr, 0, top + dr, [[0, rgb(lit(colC, 0.3))], [1, rgb(colLo)]]);
        g.beginPath(); g.ellipse(x, top, cw * 1.02, dr, 0, 0, TAU); g.fill();
        // the mouth — the tentacles live in their own layers, drawn either side of this one
        g.fillStyle = rgb(lit(colLo, -0.3), 0.9); g.beginPath(); g.ellipse(x, top, cw * 0.2, dr * 0.3, 0, 0, TAU); g.fill();
        function drawTent(T, g, t, lean){
          const bx = x + T.bx, by = top + T.by;
          const out = T.rho * 0.9 + 0.25;                                          // outward push: edge tentacles splay, centre ones stand
          const dirx = Math.cos(T.th0) * out * 1.15 + lean + Math.sin(t * T.wob + T.ph) * 0.08;
          const front = Math.sin(T.th0) > 0;                                       // front-of-disc tentacles hang down over the column
          const rise = front ? (0.95 - T.rho * 0.75) : (1.05 - T.rho * 0.3);
          const L = T.len;
          const cx1 = bx + dirx * L * 0.55, cy1 = by - L * rise * 0.85;
          const ex = bx + dirx * L * 1.05 + Math.sin(t * T.wob * 0.7 + T.ph) * L * 0.04;
          const ey = by - L * rise + L * T.curl * (front ? 0.55 * T.rho : 0.15) + Math.abs(dirx) * L * 0.2;
          g.strokeStyle = T.cBody; g.lineWidth = T.th * 2.1;
          g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(cx1, cy1, ex, ey); g.stroke();
          g.strokeStyle = T.cHi; g.lineWidth = T.th * 0.6;
          g.beginPath(); g.moveTo(bx - T.th * 0.6, by); g.quadraticCurveTo(cx1 - T.th * 0.6, cy1, ex - T.th * 0.5, ey); g.stroke();
          g.fillStyle = T.cTip; g.beginPath(); g.arc(ex, ey, T.tipR, 0, TAU); g.fill();
          g.fillStyle = T.cTipHi; g.beginPath(); g.arc(ex - T.tipR * 0.3, ey - T.tipR * 0.35, T.tipR * 0.38, 0, TAU); g.fill();
        };
      }
      // one baked layer per half (back+column, front); the sway is a transform
      let anemBuilt = 0;                                          // at most one crown is baked per frame
      function anemLayers(A){
        const scale = DPR * S, q = 1 / scale;                     // one device pixel, in design units
        const snap = v => Math.round(v * scale) * q;
        const w = snap(A.r * 5.2), h = snap(A.r * 3.4);
        const ox = snap(A.x - w / 2), oy = snap(A.y + A.r * 0.45 - h);
        if (!A.L || A.L.scale !== scale){
          A.L = { scale, q, w, h, ox, oy, col: makeLayer(w, h, scale), back: makeLayer(w, h, scale), front: makeLayer(w, h, scale), built: false };
        }
        return A.L;
      }
      function bakeAnemone(A){
        const L = anemLayers(A);
        for (const k of ['col', 'back', 'front']){
          const g = L[k].cx;
          g.save(); g.setTransform(L.scale, 0, 0, L.scale, 0, 0); g.clearRect(0, 0, L[k].cv.width, L[k].cv.height); g.restore();
          g.save(); g.translate(-L.ox, -L.oy); paintAnemone(g, A, 0, 0, k); g.restore();
        }
        L.built = true;
      }
      // how far the crown leans this frame: the current plus two slow breaths
      function anemLean(A, t, c){
        return (c * 0.24 + Math.sin(t * 0.7 + A.sd) * 0.06 + Math.sin(t * 1.13 + A.sd * 2) * 0.035) * A.r * 0.5;
      }
      function drawAnemone(g, A, t, c){
        const L = anemLayers(A);
        if (!L.built){
          if (anemBuilt >= 1) return;                             // spread the first bake over a few frames
          anemBuilt++; bakeAnemone(A);
        }
        const q = L.q, raw = anemLean(A, t, c);
        const dx = Math.round(raw / q) * q, dy = Math.round(-Math.abs(raw) * 0.12 / q) * q;   // whole device pixels
        g.drawImage(L.col.cv, L.ox, L.oy, L.w, L.h);
        g.drawImage(L.back.cv, L.ox + dx, L.oy + dy, L.w, L.h);
        if (A.midDraw){ g.save(); A.midDraw(g); g.restore(); }
        g.drawImage(L.front.cv, L.ox + dx, L.oy + dy, L.w, L.h);
      }

      // ═══════════════════════════ THE LAYOUT ═══════════════════════════
      const STILL = [];      // static elements → backL   { y (paint order), fore?, draw(g) }
      const LIVE = [];       // swaying elements, drawn per frame  { y, draw(g,t,c) }
      const ROCKS = [];
      const still = (y, draw, fore) => STILL.push({ y, draw, fore: !!fore });
      const live = (y, draw, fore) => LIVE.push({ y, draw, fore: !!fore });
      const rock = R => { ROCKS.push(R); still(R.y + R.ry * 0.55, g => paintRock(g, R), R.fore); return R; };
      // a point on a rock's top surface, u∈[-1,1] across it
      const onRock = (R, u) => [R.x + u * R.rx * 0.82, R.y - R.ry * Math.sqrt(Math.max(0, 1 - u * u * 0.67)) * 0.92 + 3];

      function buildReef(){
        // ── LEFT REEF: a heaped shelf climbing to the left edge ──
        const L1 = rock({ x: 60, y: 690, rx: 210, ry: 130, sd: 11, z: 0.12, tone: 1 });
        const L2 = rock({ x: 300, y: 730, rx: 150, ry: 92, sd: 12, z: 0.10 });
        const L3 = rock({ x: 470, y: 790, rx: 120, ry: 58, sd: 13, z: 0.06, tone: 2 });
        const L4 = rock({ x: 170, y: 800, rx: 130, ry: 62, sd: 14, z: 0.03, tone: 2, fore: true });
        const L5 = rock({ x: -40, y: 840, rx: 170, ry: 80, sd: 15, z: 0.0, tone: 1, fore: true });
        // ── RIGHT REEF: a pinnacle and a broad shelf ──
        const R1 = rock({ x: 1450, y: 600, rx: 120, ry: 170, sd: 21, z: 0.14, tone: 1 });     // the pinnacle
        const R2 = rock({ x: 1560, y: 700, rx: 190, ry: 120, sd: 22, z: 0.12 });
        const R3 = rock({ x: 1270, y: 740, rx: 160, ry: 88, sd: 23, z: 0.10, tone: 2 });
        const R4 = rock({ x: 1120, y: 795, rx: 110, ry: 54, sd: 24, z: 0.06 });
        const R5 = rock({ x: 1420, y: 810, rx: 150, ry: 66, sd: 25, z: 0.02, tone: 2, fore: true });
        const R6 = rock({ x: 1640, y: 850, rx: 170, ry: 80, sd: 26, z: 0.0, tone: 1, fore: true });
        // ── CENTRE: low rocks in the sand channel ──
        const C1 = rock({ x: 700, y: 812, rx: 70, ry: 30, sd: 31, z: 0.06, tone: 2 });
        const C2 = rock({ x: 900, y: 826, rx: 60, ry: 26, sd: 32, z: 0.04 });
        const C3 = rock({ x: 810, y: 780, rx: 46, ry: 22, sd: 33, z: 0.12, tone: 1 });

        let p;
        // ── corals on the left shelf ──
        p = onRock(L1, -0.55); still(p[1] + 8, g => paintBrain(g, { x: p[0], y: p[1] - 6, r: 62, sd: 101, z: 0.12, pal: 0 }));
        p = onRock(L1, 0.15); { const q = p; still(q[1] + 6, g => paintTable(g, { x: q[0], y: q[1], w: 150, sd: 102, z: 0.12, pal: 1 })); }
        p = onRock(L1, 0.72); { const q = p; still(q[1] + 4, g => paintStaghorn(g, { x: q[0], y: q[1], h: 120, sd: 103, z: 0.11, pal: 1 })); }
        p = onRock(L1, -0.95); { const q = p; still(q[1] + 4, g => paintTubes(g, { x: q[0] + 20, y: q[1] + 10, h: 90, sd: 104, z: 0.12, pal: 0 })); }
        p = onRock(L2, -0.5); { const q = p; still(q[1] + 4, g => paintBoulder(g, { x: q[0], y: q[1] - 4, r: 48, sd: 105, z: 0.10, pal: 0, worms: 3 })); }
        p = onRock(L2, 0.45); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemoneAndFish(g, ANEMS[0], t, c, DT)); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 2, r: 66, sd: 106, z: 0.09, pal: 0, n: 120 })); }
        p = onRock(L2, -0.05); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0] + 8, y: q[1] + 8, r: 26, sd: 107, z: 0.10, pal: 0 })); }
        p = onRock(L2, 0.95); { const q = p; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[0], t, c)); FANS.push(buildFan({ x: q[0], y: q[1] + 6, h: 95, sd: 108, z: 0.1, pal: 0 })); }
        p = onRock(L3, -0.4); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 110, sd: 109, z: 0.06, pal: 0 })); }
        p = onRock(L3, 0.55); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 64, sd: 110, z: 0.06, pal: 0 })); }
        p = onRock(L3, 0.95); { const q = p; live(q[1] + 2, (g, t, c) => drawWhips(g, { x: q[0], y: q[1] + 4, h: 120, n: 6, sd: 111, z: 0.06, pal: 0 }, t, c)); }
        p = onRock(L4, -0.3); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 2, r: 58, sd: 112, z: 0.03, pal: 4, flat: true, worms: 2 }), true); }
        p = onRock(L4, 0.6); { const q = p; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[0], t, c), true); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 78, sd: 113, z: 0.03, pal: 0 })); }
        p = onRock(L5, 0.55); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 105, sd: 114, z: 0.0, pal: 2, spread: 1.15 }), true); }
        p = onRock(L5, 0.0); { const q = p; still(q[1] + 3, g => paintBrain(g, { x: q[0], y: q[1] - 4, r: 50, sd: 115, z: 0.0, pal: 1 }), true); }
        p = onRock(L5, 0.9); { const q = p; const K = { x: q[0] + 14, y: q[1] + 4, w: 64, sd: 116, z: 0.0, open: 0.8, snapT: -99, ph: 1.3 }; CLAMS.push(K); live(q[1] + 2, (g, t) => drawClam(g, K, t), true); }
        still(770, g => paintTubes(g, { x: 400, y: 760, h: 70, sd: 117, z: 0.09, pal: 1 }));

        // ── corals on the right ──
        p = onRock(R1, -0.35); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1] + 2, h: 105, sd: 121, z: 0.14, pal: 2, spread: 1.05 })); }
        p = onRock(R1, 0.55); { const q = p; still(q[1] + 3, g => paintTable(g, { x: q[0], y: q[1] + 2, w: 120, sd: 122, z: 0.14, pal: 0 })); }
        p = onRock(R1, -0.95); { const q = p; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[1], t, c)); FANS.push(buildFan({ x: q[0] - 6, y: q[1] + 14, h: 110, sd: 123, z: 0.13, pal: 1 })); }
        { const q = [1400, 700]; still(q[1] + 2, g => paintTubes(g, { x: q[0], y: q[1], h: 110, sd: 124, z: 0.12, pal: 1 })); }
        p = onRock(R2, -0.2); { const q = p; still(q[1] + 3, g => paintBrain(g, { x: q[0], y: q[1] - 6, r: 70, sd: 125, z: 0.12, pal: 2 })); }
        p = onRock(R2, 0.6); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 130, sd: 126, z: 0.12, pal: 1 })); }
        p = onRock(R2, -0.75); { const q = p; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[1], t, c)); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 90, sd: 127, z: 0.12, pal: 1 })); }
        p = onRock(R3, -0.55); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemoneAndFish(g, ANEMS[1], t, c, DT)); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 2, r: 74, sd: 128, z: 0.09, pal: 1, n: 132 })); }
        p = onRock(R3, 0.5); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 4, r: 56, sd: 129, z: 0.10, pal: 2, worms: 3 })); }
        p = onRock(R3, 0.98); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0], y: q[1] + 6, r: 24, sd: 130, z: 0.10, pal: 2 })); }
        p = onRock(R4, -0.5); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 58, sd: 131, z: 0.06, pal: 2 })); }
        p = onRock(R4, 0.5); { const q = p; still(q[1] + 3, g => paintBarrel(g, { x: q[0], y: q[1] + 2, h: 74, sd: 132, z: 0.06 })); }
        p = onRock(R5, -0.5); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 2, r: 64, sd: 133, z: 0.02, pal: 1, flat: true, worms: 2 }), true); }
        p = onRock(R5, 0.45); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemoneAndFish(g, ANEMS[2], t, c, DT), true); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 4, r: 58, sd: 134, z: 0.02, pal: 2, n: 104 })); }
        p = onRock(R6, -0.2); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 110, sd: 135, z: 0.0, pal: 0 }), true); }
        p = onRock(R6, -0.85); { const q = p; live(q[1] + 3, (g, t, c) => drawWhips(g, { x: q[0], y: q[1] + 4, h: 130, n: 7, sd: 136, z: 0.0, pal: 1 }, t, c), true); }
        p = onRock(R6, 0.4); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 120, sd: 137, z: 0.0, pal: 2 }), true); }
        { const q = [1240, 800]; const K = { x: q[0], y: q[1], w: 58, sd: 138, z: 0.05, open: 0.8, snapT: -99, ph: 4.1 }; CLAMS.push(K); live(q[1] + 2, (g, t) => drawClam(g, K, t)); }
        { const q = [1180, 700]; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[2], t, c)); FANS.push(buildFan({ x: q[0], y: q[1] + 2, h: 72, sd: 139, z: 0.15, pal: 2 })); }

        // ── the centre channel ──
        p = onRock(C1, -0.3); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1], r: 30, sd: 141, z: 0.06, pal: 3, flat: true })); }
        p = onRock(C1, 0.7); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0], y: q[1] + 4, r: 20, sd: 142, z: 0.06, pal: 1 })); }
        p = onRock(C2, 0.2); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 40, sd: 143, z: 0.04, pal: 1 })); }
        p = onRock(C3, 0.0); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 70, sd: 144, z: 0.12, pal: 3, spread: 1.2 })); }
        { const q = [640, 850]; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[2], t, c), true); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 60, sd: 145, z: 0.0, pal: 2 })); }
        { const q = [980, 860]; live(q[1] + 2, (g, t, c) => drawAnemoneAndFish(g, ANEMS[3], t, c, DT), true); ANEMS.push(buildAnemone({ x: q[0], y: q[1], r: 46, sd: 146, z: 0.0, pal: 0, n: 84 })); }
        // sea stars, urchins, shells, grass on the sand
        const star = (x, y, r, sd, z, pal, fore) => { STARS.push({ x, y, r }); still(y + 4, g => paintStar(g, { x, y, r, sd, z, pal }), fore); };
        star(590, 838, 22, 151, 0.04, 0); star(1090, 880, 26, 152, 0.0, 1, true); star(860, 826, 15, 153, 0.05, 2);
        star(720, 872, 20, 159, 0.0, 1, true); star(1290, 858, 18, 149, 0.02, 0, true); star(470, 862, 17, 148, 0.02, 2, true);
        still(846, g => paintUrchin(g, { x: 1000, y: 842, r: 12, sd: 154, z: 0.04 }));
        still(816, g => paintUrchin(g, { x: 540, y: 812, r: 9, sd: 155, z: 0.06 }));
        still(850, g => paintShell(g, { x: 760, y: 848, r: 12, sd: 156 }));
        still(870, g => paintShell(g, { x: 1180, y: 868, r: 10, sd: 157 }), true);
        still(838, g => paintShell(g, { x: 430, y: 836, r: 9, sd: 158 }));
        for (let i = 0; i < 9; i++){
          const gx = 520 + i * 68 + psr(i + 170) * 30, gy = 812 + psr(i + 171) * 60, gh = 26 + psr(i + 172) * 30;
          live(gy, (g, t, c) => drawGrass(g, { x: gx, y: gy, h: gh, n: 7 + (i % 4), sd: 160 + i, z: 0.04 }, t, c), gy > 840);
        }
        for (let i = 0; i < 6; i++){
          const gx = i < 3 ? 380 + i * 40 : 1180 + (i - 3) * 44, gy = 806 + psr(i + 180) * 40, gh = 22 + psr(i + 181) * 22;
          live(gy, (g, t, c) => drawGrass(g, { x: gx, y: gy, h: gh, n: 6, sd: 180 + i, z: 0.05 }, t, c));
        }
        STILL.sort((a, b) => a.y - b.y);
        LIVE.sort((a, b) => a.y - b.y);
      }
      const ANEMS = [], FANS = [], SOFTS = [];
      let DT = 0;                                                // this frame's dt, for live elements that animate residents

      // ═══════════════════════════ LIVE WATER ═══════════════════════════
      // caustic tile: a seamless web of soft bright curves, scrolled as a pattern
      let CAUS = null, causPat = null;
      function buildCaustics(){
        const N = 256, cv = doc.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
        const rnd = makeRng(777); g.lineCap = 'round';
        const curves = [];
        for (let i = 0; i < 18; i++) curves.push([rnd() * N, rnd() * N, rnd() * N, rnd() * N, rnd() * N, rnd() * N, 3 + rnd() * 4]);
        for (const [x0, y0, cx, cy, x1, y1, w] of curves){
          for (let dx = -N; dx <= N; dx += N) for (let dy = -N; dy <= N; dy += N){
            g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = w * 3.2; g.beginPath(); g.moveTo(x0 + dx, y0 + dy); g.quadraticCurveTo(cx + dx, cy + dy, x1 + dx, y1 + dy); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = w * 1.6; g.beginPath(); g.moveTo(x0 + dx, y0 + dy); g.quadraticCurveTo(cx + dx, cy + dy, x1 + dx, y1 + dy); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,0.30)'; g.lineWidth = w * 0.7; g.beginPath(); g.moveTo(x0 + dx, y0 + dy); g.quadraticCurveTo(cx + dx, cy + dy, x1 + dx, y1 + dy); g.stroke();
          }
        }
        CAUS = cv; causPat = ctx.createPattern(cv, 'repeat');
      }
      function drawCaustics(g, t){
        // two scrolling passes over the lower water + sand, brighter on the sand
        if (Q === 0) return;
        g.save(); g.globalCompositeOperation = 'lighter';
        // the light plays on the sand proper; a breath of it reaches the rock band above
        const sandClip = () => { g.beginPath(); g.moveTo(-400, DH + 300); for (let x = -400; x <= DW + 400; x += 20) g.lineTo(x, ground(x)); g.lineTo(DW + 400, DH + 300); g.closePath(); };
        const bandClip = () => { g.beginPath(); g.rect(-400, 660, DW + 800, 140); };
        const passes = Q === 2 ? [[sandClip, 0.36, 1], [bandClip, 0.06, 1]] : [[sandClip, 0.36, 1]];
        for (const [clip, a, np] of passes){
          g.save(); clip(); g.clip();
          for (let pass = 0; pass < np; pass++){
            const sc = pass ? 2.1 : 1.5, ox = (t * (pass ? 7 : -5)) % 256, oy = (t * (pass ? 3 : 5)) % 256;
            g.save(); g.translate(ox, oy); g.scale(sc, sc * 0.45);
            g.fillStyle = causPat; g.globalAlpha = a * (pass ? 0.7 : 1);
            // only the band the clip can show, in this pass's scaled space
            g.fillRect(-500 / sc, 600 / (sc * 0.45), (DW + 1000) / sc, 500 / (sc * 0.45));
            g.restore();
          }
          g.restore();
        }
        g.restore();
      }
      // god-rays: a few long soft wedges from the sun, swinging slowly; each
      // ray is three nested wedges so its edges melt into the water
      function paintRays(g, t){
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++){
          const a0 = 0.78 + i * 0.19 + Math.sin(t * 0.09 + i * 1.7) * 0.035, w0 = 0.04 + psr(i + 500) * 0.05;
          const a = (0.026 + 0.02 * psr(i + 501)) * (0.7 + 0.3 * Math.sin(t * 0.21 + i * 2.1)), len = 1500;
          const grad = lg(g, SUNX, SUNY, SUNX + Math.cos(a0) * len, SUNY + Math.sin(a0) * len, [[0, 'rgba(225,250,255,' + a + ')'], [0.45, 'rgba(200,245,255,' + a * 0.55 + ')'], [1, 'rgba(200,245,255,0)']]);
          g.fillStyle = grad;
          for (let k = 0; k < 3; k++){
            const w = w0 * (1 - k * 0.32);
            g.beginPath(); g.moveTo(SUNX, SUNY);
            g.lineTo(SUNX + Math.cos(a0 - w) * len, SUNY + Math.sin(a0 - w) * len);
            g.lineTo(SUNX + Math.cos(a0 + w) * len, SUNY + Math.sin(a0 + w) * len);
            g.closePath(); g.fill();
          }
        }
        g.restore();
      }
      // Eighteen long additive gradient wedges were the single biggest painted
      // area in the scene. They swing at ~0.09 rad/s, so they are painted into a
      // HALF-resolution layer every 4th frame (8th at reduced quality) and the
      // frame takes one additive blit; at minimal quality they are skipped.
      let raysL = null, rayTick = 0;
      function drawRays(g, t){
        if (Q === 0 || !raysL) return;
        if (!raysL.built || (rayTick++ % (Q === 2 ? 4 : 8)) === 0){
          const q = raysL.cx;
          q.save(); q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, raysL.cv.width, raysL.cv.height); q.restore();
          q.save(); q.setTransform(raysL.dpr * S, 0, 0, raysL.dpr * S, raysL.dpr * OX, raysL.dpr * OY); paintRays(q, t); q.restore();
          raysL.built = true;
        }
        g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.globalCompositeOperation = 'lighter';
        g.drawImage(raysL.cv, 0, 0, W, H);
        g.restore();
      }
      // motes drifting with the current, bubbles seeping up from the reef
      const BUCK = [[], [], [], [], []], LIVEB = [];             // reused scratch: mote buckets, live bubbles
      const MOTES = Array.from({ length: 110 }, (_, i) => ({ x: psr(i + 600) * DW, y: psr(i + 601) * DH, r: 0.6 + psr(i + 602) * 1.6, vy: -2 - psr(i + 603) * 5, ph: psr(i + 604) * TAU, a: 0.15 + psr(i + 605) * 0.35 }));
      const SEEPS = [[250, 690], [1330, 705], [1460, 470], [720, 800], [1560, 640]];
      const BUBBLES = [];
      let nextBub = 1;
      function drawParticles(g, t, dt, c){
        for (let b = 0; b < 5; b++) BUCK[b].length = 0;          // 5 alpha buckets → 5 fills instead of 110
        for (let mi = 0; mi < MOTES.length; mi += (Q === 2 ? 1 : Q === 1 ? 2 : 4)){ const m = MOTES[mi];
          m.x += (c * 14 + Math.sin(t * 0.7 + m.ph) * 4) * dt; m.y += m.vy * dt;
          if (m.y < -20) m.y = DH + 10; if (m.x < -20) m.x = DW + 10; else if (m.x > DW + 20) m.x = -10;
          BUCK[Math.min(4, (m.a * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph)) * 10) | 0)].push(m);
        }
        for (let b = 0; b < 5; b++){
          if (!BUCK[b].length) continue;
          g.fillStyle = 'rgba(220,245,255,' + ((b + 0.5) / 10).toFixed(2) + ')';
          g.beginPath();
          for (const m of BUCK[b]){ g.moveTo(m.x + m.r, m.y); g.arc(m.x, m.y, m.r, 0, TAU); }
          g.fill();
        }
        if (t > nextBub){ nextBub = t + 0.8 + Math.random() * 2.2; const s = SEEPS[Math.floor(Math.random() * SEEPS.length)]; const n = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) BUBBLES.push({ x: s[0] + (Math.random() - 0.5) * 12, y: s[1], r: 1.5 + Math.random() * 3, v: 40 + Math.random() * 40, ph: Math.random() * TAU, t0: t + i * 0.25 }); }
        g.lineWidth = 1;
        const live = LIVEB; live.length = 0;
        for (let i = BUBBLES.length - 1; i >= 0; i--){
          const b = BUBBLES[i]; if (t < b.t0) continue;
          b.y -= b.v * dt; b.x += (Math.sin(t * 3 + b.ph) * 12 + c * 10) * dt; b.r += dt * 0.6;
          if (b.y < -10){ BUBBLES.splice(i, 1); continue; }
          live.push(b);
        }
        if (live.length){
          g.beginPath(); for (const b of live){ g.moveTo(b.x + b.r, b.y); g.arc(b.x, b.y, b.r, 0, TAU); }
          g.fillStyle = 'rgba(200,240,255,0.12)'; g.fill();
          g.strokeStyle = 'rgba(230,250,255,0.55)'; g.stroke();
          g.beginPath(); for (const b of live){ const hx = b.x - b.r * 0.35, hy = b.y - b.r * 0.4, hr = b.r * 0.28; g.moveTo(hx + hr, hy); g.arc(hx, hy, hr, 0, TAU); }
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
        }
      }


      // ═══════════════════════════ THE FISH ═══════════════════════════
      // One vector fish renderer, many species. A fish is drawn in LOCAL
      // coords: body length 1, nose at +0.5, tail base at −0.5, y down.
      // `wp` warps every point so the rear of the body flexes with the tail
      // beat; the caudal fin adds its own swing on top. The fish is placed
      // with translate / rotate(pitch) / scale(face·s, s): `face` runs
      // −1..1, so a turn thins the fish through zero instead of snapping.
      const FISH = [], HEARTS = [], SHARKS = [];
      const _WX = [], _WY = [], _W2 = [0, 0];                     // reused: warped outlines, and one warped point
      function smoothPath(g, pts, wp, closed){
        // closed Catmull-Rom through (warped) points → cubic beziers
        const n = pts.length;
        for (let i = 0; i < n; i++){ const q = wp(pts[i][0], pts[i][1]); _WX[i] = q[0]; _WY[i] = q[1]; }
        g.moveTo(_WX[0], _WY[0]);
        for (let i = 0; i < (closed ? n : n - 1); i++){
          const a = (i - 1 + n) % n, b = i, c = (i + 1) % n, d = (i + 2) % n;
          g.bezierCurveTo(_WX[b] + (_WX[c] - _WX[a]) / 6, _WY[b] + (_WY[c] - _WY[a]) / 6, _WX[c] - (_WX[d] - _WX[b]) / 6, _WY[c] - (_WY[d] - _WY[b]) / 6, _WX[c], _WY[c]);
        }
        if (closed) g.closePath();
      }
      const poly = (g, pts, wp) => { for (let i = 0; i < pts.length; i++){ const q = wp(pts[i][0], pts[i][1]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.closePath(); };
      // the warp returns ONE reused pair — read it before calling again
      const mkWarp = bend => (x, y) => { _W2[0] = x; _W2[1] = x < 0 ? y + bend * x * x * 1.6 : y; return _W2; };
      const warpY = (bend, x, y) => x < 0 ? y + bend * x * x * 1.6 : y;

      // ── species ──
      // body: outline anchors · tail: {kind, len} · dorsal/anal: fin polygons ·
      // pect: pectoral fin root · eye · col: top/bottom body, fin, finEdge · pattern(g, P)
      const SPECIES = {
        clown: {
          body: [[0.5, 0.0], [0.42, -0.14], [0.2, -0.27], [-0.1, -0.27], [-0.35, -0.17], [-0.5, -0.07], [-0.5, 0.07], [-0.35, 0.17], [-0.1, 0.26], [0.2, 0.25], [0.42, 0.13]],
          tail: { kind: 'round', len: 0.26, h: 0.2 }, dorsal: [[0.22, -0.24], [0.05, -0.36], [-0.15, -0.36], [-0.32, -0.19]], anal: [[-0.1, 0.25], [-0.18, 0.36], [-0.33, 0.17]],
          pelvic: [[0.1, 0.25], [0.03, 0.36], [-0.06, 0.26]], pect: [0.18, 0.06, 0.16], eye: [0.36, -0.05, 0.045, [230, 170, 60]],
          col: { top: [236, 110, 30], bot: [250, 160, 60], fin: [240, 120, 40], edge: [30, 20, 20] },
          pattern(g, P){
            // three white bands edged in black: head, the bulging middle, the tail base
            const band = (pts) => { g.fillStyle = P.black; g.beginPath(); smoothPath(g, pts, P.wp, true); g.fill(); };
            const bands = [
              [[0.32, -0.3], [0.22, -0.3], [0.2, 0], [0.24, 0.3], [0.34, 0.3], [0.3, 0]],
              [[-0.02, -0.32], [-0.14, -0.32], [-0.1, 0], [-0.14, 0.32], [-0.02, 0.32], [0.12, 0.05], [0.1, -0.15]],
              [[-0.4, -0.25], [-0.5, -0.25], [-0.5, 0.25], [-0.4, 0.25], [-0.44, 0]],
            ];
            for (const b of bands){ band(b); g.fillStyle = P.white; g.beginPath(); smoothPath(g, b.map(p => [p[0] + (p[0] > 0.1 ? 0 : 0), p[1] * 0.93]), (x, y) => P.wp(x * 0.92 + (b[0][0] + b[1][0]) / 2 * 0.08, y), true); g.fill(); }
          },
        },
        dory: {
          body: [[0.5, 0.02], [0.4, -0.14], [0.15, -0.28], [-0.15, -0.28], [-0.4, -0.15], [-0.5, -0.06], [-0.5, 0.06], [-0.4, 0.15], [-0.15, 0.27], [0.15, 0.26], [0.4, 0.14]],
          tail: { kind: 'trunc', len: 0.24, h: 0.22 }, dorsal: [[0.25, -0.24], [0.1, -0.36], [-0.25, -0.38], [-0.45, -0.2]], anal: [[0.05, 0.25], [-0.15, 0.36], [-0.45, 0.2]],
          pelvic: [[0.2, 0.22], [0.14, 0.32], [0.06, 0.24]], pect: [0.2, 0.04, 0.17], eye: [0.36, -0.06, 0.04, [40, 40, 60]],
          col: { top: [30, 70, 210], bot: [60, 120, 240], fin: [40, 90, 230], edge: [10, 10, 30], tail: [250, 210, 40] },
          pattern(g, P){
            // the black "palette": from behind the eye along the back, down the tail base and
            // forward along the lower flank — enclosing a blue oval on the rear half
            g.fillStyle = P.black; g.beginPath();
            smoothPath(g, [[0.3, -0.07], [0.12, -0.18], [-0.15, -0.24], [-0.38, -0.21], [-0.5, -0.1], [-0.5, 0.1], [-0.36, 0.15], [-0.12, 0.13], [0.02, 0.06], [0.12, -0.02], [0.24, 0.0]], P.wp, true); g.fill();
            g.fillStyle = P.top; g.beginPath(); smoothPath(g, [[-0.06, -0.1], [-0.2, -0.16], [-0.36, -0.13], [-0.42, -0.02], [-0.34, 0.07], [-0.16, 0.06], [-0.04, 0.0]], P.wp, true); g.fill();
            // the yellow wedge where the tail meets the body
            g.fillStyle = P.yellow; g.beginPath(); poly(g, [[-0.5, -0.07], [-0.4, 0], [-0.5, 0.07]], P.wp); g.fill();
          },
        },
        bfly: {   // threadfin butterflyfish
          body: [[0.5, 0.04], [0.38, -0.12], [0.15, -0.34], [-0.15, -0.34], [-0.4, -0.16], [-0.5, -0.06], [-0.5, 0.06], [-0.4, 0.18], [-0.15, 0.32], [0.15, 0.3], [0.38, 0.14]],
          tail: { kind: 'round', len: 0.2, h: 0.24 }, dorsal: [[0.15, -0.32], [-0.02, -0.46], [-0.3, -0.44], [-0.42, -0.2]], anal: [[-0.02, 0.31], [-0.15, 0.44], [-0.35, 0.36], [-0.44, 0.18]],
          pelvic: [[0.18, 0.26], [0.1, 0.4], [0.0, 0.3]], pect: [0.2, 0.02, 0.15], eye: [0.36, -0.08, 0.04, [40, 30, 20]],
          col: { top: [240, 236, 220], bot: [250, 248, 238], fin: [250, 200, 40], edge: [40, 30, 20] },
          pattern(g, P){
            // yellow rear, chevrons of fine grey lines, a black eye bar
            g.fillStyle = P.yellow; g.beginPath(); smoothPath(g, [[-0.05, -0.36], [-0.3, -0.3], [-0.5, -0.1], [-0.5, 0.1], [-0.3, 0.32], [-0.05, 0.36], [-0.15, 0.0]], P.wp, true); g.fill();
            g.strokeStyle = P.grey; g.lineWidth = 0.014;
            for (let i = 0; i < 5; i++){ const o = i * 0.07; g.beginPath(); let q = P.wp(0.3 - o, -0.3 + o * 0.3); g.moveTo(q[0], q[1]); q = P.wp(-0.05 - o * 0.4, 0.02 + o * 0.2); g.lineTo(q[0], q[1]); g.stroke(); }
            for (let i = 0; i < 5; i++){ const o = i * 0.07; g.beginPath(); let q = P.wp(0.28 - o, 0.3 - o * 0.3); g.moveTo(q[0], q[1]); q = P.wp(-0.02 - o * 0.4, 0.0 - o * 0.2); g.lineTo(q[0], q[1]); g.stroke(); }
            g.fillStyle = P.black; g.beginPath(); smoothPath(g, [[0.42, -0.26], [0.32, -0.26], [0.3, 0.02], [0.4, 0.02]], P.wp, true); g.fill();
            g.fillStyle = P.black; g.beginPath(); g.arc(-0.22, -0.34, 0.035, 0, TAU); g.fill();   // the dorsal spot
          },
        },
        tang: {   // yellow tang
          body: [[0.5, 0.03], [0.4, -0.1], [0.2, -0.3], [-0.1, -0.34], [-0.38, -0.18], [-0.5, -0.06], [-0.5, 0.06], [-0.38, 0.18], [-0.1, 0.3], [0.2, 0.26], [0.4, 0.12]],
          tail: { kind: 'trunc', len: 0.2, h: 0.22 }, dorsal: [[0.2, -0.29], [0.02, -0.5], [-0.3, -0.46], [-0.42, -0.2]], anal: [[0.05, 0.27], [-0.1, 0.44], [-0.35, 0.36], [-0.42, 0.2]],
          pelvic: [[0.2, 0.24], [0.12, 0.36], [0.02, 0.27]], pect: [0.2, 0.02, 0.15], eye: [0.36, -0.08, 0.04, [40, 30, 20]],
          col: { top: [250, 200, 30], bot: [255, 220, 60], fin: [255, 215, 70], edge: [160, 105, 10] },
          pattern(g, P){ g.fillStyle = P.white; g.beginPath(); poly(g, [[-0.44, -0.02], [-0.36, -0.03], [-0.36, 0.03]], P.wp); g.fill(); },   // the white tail spine
        },
        gramma: { // royal gramma
          body: [[0.5, 0.0], [0.4, -0.1], [0.15, -0.18], [-0.15, -0.18], [-0.4, -0.1], [-0.5, -0.05], [-0.5, 0.05], [-0.4, 0.1], [-0.15, 0.17], [0.15, 0.17], [0.4, 0.09]],
          tail: { kind: 'round', len: 0.22, h: 0.16 }, dorsal: [[0.25, -0.16], [0.1, -0.26], [-0.3, -0.26], [-0.45, -0.12]], anal: [[-0.05, 0.16], [-0.2, 0.26], [-0.45, 0.12]],
          pelvic: [[0.2, 0.15], [0.12, 0.26], [0.04, 0.17]], pect: [0.2, 0.03, 0.14], eye: [0.36, -0.03, 0.04, [60, 30, 80]],
          col: { top: [150, 40, 200], bot: [190, 90, 230], fin: [170, 60, 220], edge: [80, 20, 120] },
          pattern(g, P){
            g.fillStyle = P.yellow; g.beginPath(); smoothPath(g, [[-0.05, -0.2], [-0.3, -0.2], [-0.5, -0.08], [-0.5, 0.08], [-0.3, 0.2], [-0.02, 0.2], [-0.12, 0.0]], P.wp, true); g.fill();
            g.fillStyle = P.black; g.beginPath(); g.arc(-0.15, -0.16, 0.03, 0, TAU); g.fill();
          },
        },
        chromis: {
          body: [[0.5, 0.0], [0.35, -0.12], [0.05, -0.2], [-0.3, -0.16], [-0.5, -0.05], [-0.5, 0.05], [-0.3, 0.16], [0.05, 0.2], [0.35, 0.12]],
          tail: { kind: 'fork', len: 0.3, h: 0.22 }, dorsal: [[0.2, -0.16], [0.0, -0.27], [-0.3, -0.24], [-0.4, -0.12]], anal: [[-0.05, 0.18], [-0.2, 0.27], [-0.4, 0.12]],
          pelvic: null, pect: [0.18, 0.02, 0.12], eye: [0.34, -0.03, 0.045, [40, 60, 60]],
          col: { top: [70, 200, 190], bot: [140, 240, 210], fin: [120, 230, 210], edge: [40, 120, 110] },
          pattern(g, P){ g.fillStyle = P.white; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(0.05, 0.02, 0.3, 0.06, 0, 0, TAU); g.fill(); g.globalAlpha = 1; },
        },
      };

      // pre-hazed palette per fish (colours don't change while it swims)
      function fishPalette(F){
        const sp = SPECIES[F.kind]; if (!sp) return;
        const y = F.y, z = F.z, C = sp.col;
        const H = c => rgb(haze(c, y, z));
        F.P = {
          top: H(C.top), bot: H(C.bot), fin: H(C.fin), edge: H(C.edge),
          black: H([20, 16, 20]), white: H([250, 250, 245]), yellow: H([250, 210, 40]), grey: rgb(haze([120, 110, 100], y, z), 0.7),
          finA: rgb(haze(C.fin, y, z), 0.85), tail: rgb(haze(C.tail || C.fin, y, z), 0.92), eyeIris: H(sp.eye[3]), wp: null,
        };
      }

      function drawFish(g, F, t){
        const sp = SPECIES[F.kind], P = F.P, s = F.s * (1 - F.z * 0.55);
        const tiny = s * S < 26;                                  // too small on screen for the fine detail
        const wag = Math.sin(F.ph) * F.wagAmp;
        const wp = mkWarp(wag * 0.9); P.wp = wp;
        g.save(); g.translate(F.x, F.y); g.rotate(F.pitch);
        const roll = F.rollT !== undefined && t < F.rollT ? Math.cos((F.rollT - t) / F.rollLen * TAU) : 1;
        g.scale(F.face * s, s * roll);
        if (F.alpha !== undefined) g.globalAlpha = F.alpha;
        // caudal fin (behind the body)
        const T = sp.tail, tb = wp(-0.5, 0), swing = wag * 1.8;
        g.save(); g.translate(tb[0], tb[1]); g.rotate(swing);
        g.fillStyle = P.tail; g.beginPath();
        if (T.kind === 'fork'){ g.moveTo(0.02, -0.04); g.lineTo(-T.len, -T.h); g.lineTo(-T.len * 0.5, 0); g.lineTo(-T.len, T.h); g.lineTo(0.02, 0.04); }
        else if (T.kind === 'trunc'){ g.moveTo(0.02, -0.06); g.lineTo(-T.len, -T.h); g.lineTo(-T.len * 0.9, 0); g.lineTo(-T.len, T.h); g.lineTo(0.02, 0.06); }
        else { g.moveTo(0.02, -0.06); g.quadraticCurveTo(-T.len * 1.1, -T.h * 1.3, -T.len, 0); g.quadraticCurveTo(-T.len * 1.1, T.h * 1.3, 0.02, 0.06); }
        g.closePath(); g.fill();
        g.strokeStyle = P.edge; g.lineWidth = 0.012; g.stroke();
        if (!tiny){                                               // fin rays
          g.strokeStyle = P.edge; g.globalAlpha *= 0.35; g.lineWidth = 0.008;
          for (let k = -2; k <= 2; k++){ g.beginPath(); g.moveTo(0, 0); g.lineTo(-T.len * 0.95, k * T.h * 0.45); g.stroke(); }
          g.globalAlpha /= 0.35;
        }
        g.restore();
        // dorsal + anal + pelvic fins
        g.fillStyle = P.finA; g.strokeStyle = P.edge; g.lineWidth = 0.012;
        for (const fin of [sp.dorsal, sp.anal, sp.pelvic]) if (fin){ g.beginPath(); smoothPath(g, fin, wp, true); g.fill(); g.stroke(); }
        // the body: gradient back → belly, then the pattern, then shading, clipped to the outline
        g.beginPath(); smoothPath(g, sp.body, wp, true);
        g.fillStyle = lg(g, 0, -0.3, 0, 0.3, [[0, P.top], [0.55, P.top], [1, P.bot]]); g.fill();
        g.save(); g.clip();
        sp.pattern(g, P);
        // belly light, back sheen, gill line
        g.fillStyle = lg(g, 0, -0.3, 0, 0.3, [[0, 'rgba(255,255,255,0.22)'], [0.35, 'rgba(255,255,255,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.18)']]); g.fillRect(-0.6, -0.5, 1.2, 1);
        if (!tiny){ g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.012; g.beginPath(); g.arc(0.14, 0.0, 0.16, -1.1, 1.1); g.stroke(); }
        g.restore();
        g.strokeStyle = P.edge; g.lineWidth = 0.012; g.globalAlpha *= 0.6; g.beginPath(); smoothPath(g, sp.body, wp, true); g.stroke(); g.globalAlpha /= 0.6;
        // pectoral fin (flaps)
        if (!tiny){
          const [px, py, pl] = sp.pect, flap = Math.sin(F.ph * 1.3 + 1) * 0.35 - 0.2;
          g.save(); g.translate(px, py); g.rotate(0.5 + flap);
          g.fillStyle = P.finA; g.globalAlpha *= 0.8; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-pl * 0.5, pl * 0.25, -pl, pl * 0.1); g.quadraticCurveTo(-pl * 0.6, pl * 0.5, -pl * 0.1, pl * 0.35); g.closePath(); g.fill();
          g.strokeStyle = P.edge; g.lineWidth = 0.01; g.stroke(); g.restore();
        }
        // eye: ring, pupil, catchlight
        const [ex, ey, er] = sp.eye;
        g.fillStyle = P.eyeIris; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
        g.fillStyle = '#0a0a12'; g.beginPath(); g.arc(ex + er * 0.05, ey, er * 0.62, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex + er * 0.3, ey - er * 0.35, er * 0.25, 0, TAU); g.fill();
        // mouth (opens now and then)
        const mo = tiny ? 0 : (F.mouth || 0);
        if (!tiny){ g.strokeStyle = P.edge; g.lineWidth = 0.014; g.beginPath(); g.moveTo(0.5, sp.body[0][1]); g.lineTo(0.44, sp.body[0][1] + 0.02 + mo * 0.05); g.stroke(); }
        if (mo > 0.2){ g.fillStyle = 'rgba(20,10,10,0.7)'; g.beginPath(); g.moveTo(0.5, sp.body[0][1] - 0.01); g.lineTo(0.45, sp.body[0][1] + 0.005); g.lineTo(0.5, sp.body[0][1] + 0.02 + mo * 0.05); g.closePath(); g.fill(); }
        g.restore();
      }

      // ── behaviour ──
      function makeFish(o){
        const F = Object.assign({ x: 0, y: 0, z: 0.15, s: 50, face: 1, pitch: 0, ph: Math.random() * TAU, wagAmp: 0.12, vx: 20, vy: 0, spd: 40, turn: 1.6, target: null, wait: 0, mouth: 0, mouthAt: 3 + Math.random() * 6, poopAt: 0 }, o);
        fishPalette(F); FISH.push(F); return F;
      }
      function steer(F, tx, ty, speed, dt, turn){
        const dx = tx - F.x, dy = ty - F.y, d = Math.hypot(dx, dy) || 1;
        const wx = dx / d * speed, wy = dy / d * speed, k = Math.min(1, dt * (turn || F.turn));
        F.vx += (wx - F.vx) * k; F.vy += (wy - F.vy) * k;
        return d;
      }
      function integrate(F, dt, t){
        F.x += F.vx * dt; F.y += F.vy * dt;
        const spd = Math.hypot(F.vx, F.vy);
        // face the way we swim; the flip eases through zero
        const want = Math.abs(F.vx) > 3 ? (F.vx > 0 ? 1 : -1) : (F.face >= 0 ? 1 : -1);
        F.face += (want - F.face) * Math.min(1, dt * 5);
        if (Math.abs(F.face) < 0.05) F.face = want * 0.05;
        const pitchWant = Math.max(-0.45, Math.min(0.45, Math.atan2(F.vy, Math.abs(F.vx) + 1))) * (F.face > 0 ? 1 : -1);
        F.pitch += (pitchWant - F.pitch) * Math.min(1, dt * 4);
        F.ph += dt * (2.5 + spd * 0.09) * (F.wagRate || 1);
        F.wagAmp += ((0.06 + Math.min(0.14, spd * 0.0016)) * (F.wagBase || 1) - F.wagAmp) * Math.min(1, dt * 3);
        // an occasional gulp
        if (t > F.mouthAt){ F.mouth = Math.max(0, Math.sin((t - F.mouthAt) * 6)); if (t > F.mouthAt + 0.5){ F.mouth = 0; F.mouthAt = t + 3 + Math.random() * 8; } }
      }
      // a free swimmer wandering its home box
      function wander(F, t, dt){
        const dash = F.dashUntil && t < F.dashUntil, hover = F.wait > 0;
        if (!F.target){ F.target = [lerp(F.home[0], F.home[1], Math.random()), lerp(F.home[2], F.home[3], Math.random())]; }
        const speed = F.spd * (dash ? 3.4 : 1) * (hover ? 0.18 : 1);
        const d = steer(F, F.target[0], F.target[1], speed, dt, dash ? 5 : undefined);
        if (d < 30 && !hover){ F.wait = 0.5 + Math.random() * 2.5; F.target = null; }
        if (hover){ F.wait -= dt; }
        integrate(F, dt, t);
      }
      function fleeFrom(F, x, y, t){ const dx = F.x - x, dy = F.y - y, d = Math.hypot(dx, dy) || 1; F.target = [F.x + dx / d * 260, Math.max(100, Math.min(720, F.y + dy / d * 120))]; F.dashUntil = t + 1.1; F.wait = 0; }

      // ── the poop gag: every fish goes once per ~3 minutes, staggered; the
      //    strand trails from the vent, lets go, sinks and fades (never on click) ──
      function updatePoop(g, F, t, dt, vx, vy, w){
        if (!F.poopAt) F.poopAt = t + Math.random() * 180;
        let p = F.poop;
        const maxLen = Math.min(60, Math.max(14, F.s * 0.55));    // never longer than about half the fish, and never a log
        if (!p){ if (t > F.poopAt) F.poop = { pts: [[vx, vy]], detachT: t + 1.6 + Math.random() * 1.4, fade: 1, len: 0 }; return; }
        if (p.detachT !== null){
          const last = p.pts[p.pts.length - 1], jump = Math.hypot(vx - last[0], vy - last[1]);
          if (jump > 80) p.detachT = null;
          else if (jump > 2.5){ p.pts.push([vx + (Math.random() - 0.5) * 1.2, vy + (Math.random() - 0.5) * 1.2]); p.len += jump; while (p.len > maxLen && p.pts.length > 2){ p.len -= Math.hypot(p.pts[1][0] - p.pts[0][0], p.pts[1][1] - p.pts[0][1]); p.pts.shift(); } }
          if (p.detachT !== null && t > p.detachT) p.detachT = null;
        }
        if (p.detachT === null){
          p.fade -= dt * 0.3;
          for (const q of p.pts){ q[1] += 18 * dt; q[0] += Math.sin(t * 1.5 + q[1] * 0.05) * 5 * dt; }
          if (p.fade <= 0 || p.pts.length < 2){ F.poop = null; F.poopAt = t + 180; return; }
        }
        g.strokeStyle = 'rgba(96,70,36,' + (0.8 * p.fade) + ')'; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(p.pts[0][0], p.pts[0][1]); for (let i = 1; i < p.pts.length; i++) g.lineTo(p.pts[i][0], p.pts[i][1]); g.stroke();
      }
      const ventOf = F => { const s = F.s * (1 - F.z * 0.55); return [F.x - F.face * s * 0.4, F.y + s * 0.12]; };
      const DRAWERS = { dolphin: (g, F, t) => drawDolphin(g, F, t), shark: (g, F, t) => drawShark(g, F, t), puffer: (g, F, t) => drawPuffer(g, F, t) };
      const drawFishFull = (g, F, t, dt) => { (DRAWERS[F.kind] || drawFish)(g, F, t); const v = ventOf(F); updatePoop(g, F, t, dt, v[0], v[1], Math.min(3, Math.max(1, F.s * 0.03))); };

      // ── bubble puff + hearts ──
      function puff(x, y, n){ for (let i = 0; i < (n || 6); i++) BUBBLES.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 10, r: 1.2 + Math.random() * 2.5, v: 30 + Math.random() * 40, ph: Math.random() * TAU, t0: lastT + Math.random() * 0.3 }); }
      function drawHearts(g, t){
        for (let i = HEARTS.length - 1; i >= 0; i--){
          const h = HEARTS[i], e = t - h.t0; if (e > 2.6){ HEARTS.splice(i, 1); continue; }
          const y = h.y - e * 28, x = h.x + Math.sin(e * 3 + h.ph) * 6, s = h.s * (0.6 + Math.min(1, e * 2) * 0.4), a = e < 2 ? 0.9 : 0.9 * (2.6 - e) / 0.6;
          g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a;
          g.fillStyle = '#ff5d8f'; g.beginPath(); g.moveTo(0, 0.35); g.bezierCurveTo(-0.9, -0.3, -0.45, -0.95, 0, -0.45); g.bezierCurveTo(0.45, -0.95, 0.9, -0.3, 0, 0.35); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-0.28, -0.5, 0.14, 0, TAU); g.fill();
          g.restore();
        }
      }

      // ── the clownfish: each anemone's residents hover over the crown, duck
      //    into the tentacles now and then, and dart out when tapped ──
      function updateClown(F, t, dt){
        const A = F.home_a, cx = A.x, cy = A.y - A.r * 0.78, r = A.r;
        if (F.dartUntil && t < F.dartUntil){
          if (!F.target || Math.hypot(F.target[0] - F.x, F.target[1] - F.y) < 24) F.target = [cx + (Math.random() - 0.5) * r * 4, cy - r * (0.6 + Math.random() * 1.6)];
          steer(F, F.target[0], F.target[1], F.spd * 3.2, dt, 6);
          F.inside += (0 - F.inside) * Math.min(1, dt * 6);
        } else {
          if (t > F.hideAt){ F.hiding = !F.hiding; F.hideAt = t + (F.hiding ? 3 + Math.random() * 4 : 6 + Math.random() * 14); F.target = null; }
          const near = Math.hypot(F.x - cx, F.y - (cy + r * 0.15)) < r * 0.6;
          const want = F.hiding && near ? 1 : 0; F.inside += (want - F.inside) * Math.min(1, dt * 4);
          if (!F.target || Math.hypot(F.target[0] - F.x, F.target[1] - F.y) < 8){
            F.target = F.hiding ? [cx + (Math.random() - 0.5) * r * 0.8, cy + r * (0.05 + Math.random() * 0.25)] : [cx + (Math.random() - 0.5) * r * 1.7, cy - r * (0.05 + Math.random() * 0.55)];
          }
          steer(F, F.target[0], F.target[1], F.spd * (F.hiding && !near ? 1.3 : F.hiding ? 0.5 : 1) * (0.6 + 0.4 * Math.sin(t * 0.7 + F.ph0)), dt, 2.6);
        }
        integrate(F, dt, t);
        F.pitch += Math.sin(t * 9 + F.ph0) * 0.05;   // the clownfish waddle
        F.alpha = 1 - F.inside * 0.25;
      }
      function drawAnemoneAndFish(g, A, t, c, dt){
        // residents hiding in the crown are drawn between the back and front tentacles
        A.midDraw = g2 => { const dx = anemLean(A, t, c); g2.save(); g2.translate(dx, 0); for (const F of A.fish) if (F.inside > 0.5) drawFishFull(g2, F, t, dt); g2.restore(); };
        drawAnemone(g, A, t, c);
        for (const F of A.fish) if (F.inside <= 0.5) drawFishFull(g, F, t, dt);
      }

      // ── the chromis school: a leader wanders, the rest hold loose slots ──
      let SCHOOL = null;
      function updateSchool(t, dt){
        const L = SCHOOL.leader; wander(L, t, dt);
        const spread = SCHOOL.scatterUntil && t < SCHOOL.scatterUntil ? 3.2 : 1;
        SCHOOL.spread += (spread - SCHOOL.spread) * Math.min(1, dt * 2.5);
        for (const F of SCHOOL.members){
          const tx = L.x + F.slot[0] * SCHOOL.spread + Math.sin(t * 0.9 + F.ph0) * 8, ty = L.y + F.slot[1] * SCHOOL.spread + Math.cos(t * 1.1 + F.ph0) * 5;
          steer(F, tx, ty, Math.max(L.spd * 0.8, Math.hypot(tx - F.x, ty - F.y) * 1.6), dt, 3.5);
          integrate(F, dt, t);
        }
      }

      // ── the passing giants ──
      const WHALE = { kind: 'whale', active: false, nextAt: null, first: [60, 110], gap: [220, 340], len: 2050, yr: [232, 262], spd: 95, z: 0.34, ph: Math.random() * TAU };
      const ORCA = { kind: 'orca', active: false, nextAt: null, first: [18, 45], gap: [90, 160], len: 950, yr: [380, 450], spd: 160, z: 0.24, ph: Math.random() * TAU };
      function updateGiant(G, t, dt, other){
        if (!G.active){
          if (G.nextAt === null) G.nextAt = t + G.first[0] + Math.random() * (G.first[1] - G.first[0]);
          if (t < G.nextAt) return false;
          if (other.active){ G.nextAt = t + 25 + Math.random() * 25; return false; }
          G.active = true; G.dir = Math.random() < 0.5 ? 1 : -1;
          G.x = G.dir > 0 ? -G.len * 0.9 : DW + G.len * 0.9; G.y = lerp(G.yr[0], G.yr[1], Math.random()); G.t0 = t;
        }
        G.x += G.dir * G.spd * dt;
        if ((G.dir > 0 && G.x > DW + G.len) || (G.dir < 0 && G.x < -G.len)){ G.active = false; G.nextAt = t + G.gap[0] + Math.random() * (G.gap[1] - G.gap[0]); return false; }
        return true;
      }
      function drawWhale(g, G, t){
        const s = G.len, y = G.y + Math.sin(t * 0.45 + G.ph) * 10, beat = Math.sin(t * 1.0 + G.ph) * 0.08, wp = mkWarp(beat * 0.7);
        const top = rgb(haze([68, 92, 128], y, G.z)), mid = rgb(haze([96, 122, 158], y, G.z)), bot = rgb(haze([170, 186, 204], y, G.z)), dark = rgb(haze([38, 52, 80], y, G.z));
        g.save(); g.translate(G.x, y); g.scale(G.dir * s, s); g.globalAlpha = 0.96;
        // flukes (behind), the tail stock swinging
        const tb = wp(-0.5, 0); g.save(); g.translate(tb[0], tb[1]); g.rotate(beat * 1.6);
        g.fillStyle = mid; g.beginPath(); g.moveTo(0.02, -0.02); g.quadraticCurveTo(-0.12, -0.11, -0.2, -0.045); g.quadraticCurveTo(-0.1, -0.01, -0.06, 0); g.quadraticCurveTo(-0.1, 0.02, -0.2, 0.06); g.quadraticCurveTo(-0.12, 0.11, 0.02, 0.02); g.closePath(); g.fill();
        g.restore();
        // the small hooked dorsal fin (its base hidden under the body)
        g.fillStyle = mid;
        { const d0y = warpY(beat * 0.7, -0.26, -0.03), d1y = warpY(beat * 0.7, -0.33, -0.135), d2y = warpY(beat * 0.7, -0.37, -0.03);
          g.beginPath(); g.moveTo(-0.26, d0y); g.quadraticCurveTo(-0.33 + 0.03, d1y + 0.02, -0.33, d1y); g.quadraticCurveTo(-0.33 - 0.01, d1y + 0.05, -0.37, d2y); g.closePath(); g.fill(); }
        // the body
        const body = [[0.5, 0.02], [0.45, -0.055], [0.28, -0.1], [0.02, -0.12], [-0.22, -0.095], [-0.4, -0.05], [-0.5, -0.02], [-0.5, 0.02], [-0.4, 0.05], [-0.22, 0.1], [0.02, 0.135], [0.28, 0.135], [0.45, 0.085]];
        g.beginPath(); smoothPath(g, body, wp, true);
        g.fillStyle = lg(g, 0, -0.12, 0, 0.14, [[0, top], [0.5, mid], [0.72, mid], [1, bot]]); g.fill();
        g.save(); g.clip();
        // mottling on the back, throat pleats, the long mouth line, the eye
        g.fillStyle = 'rgba(200,215,235,0.13)'; g.beginPath();
        for (let i = 0; i < 260; i++){ const q = wp(-0.44 + psr(i + 300) * 0.9, -0.115 + psr(i + 301) * 0.17); const rx = 0.0025 + psr(i + 302) * 0.006; g.moveTo(q[0] + rx, q[1]); g.ellipse(q[0], q[1], rx, 0.0018 + psr(i + 303) * 0.003, 0, 0, TAU); }
        g.fill();
        g.strokeStyle = 'rgba(40,50,80,0.22)'; g.lineWidth = 0.004; g.beginPath();
        for (let i = 0; i < 7; i++){ const yy = 0.06 + i * 0.011; g.moveTo(0.44, yy); g.quadraticCurveTo(0.3, yy + 0.05, 0.05, yy + 0.06); }
        g.stroke();
        g.strokeStyle = dark; g.lineWidth = 0.006; g.beginPath(); g.moveTo(0.49, 0.03); g.quadraticCurveTo(0.35, 0.07, 0.2, 0.055); g.stroke();
        g.restore();
        g.fillStyle = dark; g.beginPath(); g.arc(0.39, 0.03, 0.009, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(0.392, 0.027, 0.003, 0, TAU); g.fill();
        // the long flipper
        g.fillStyle = top; g.beginPath(); g.moveTo(0.22, 0.1); g.quadraticCurveTo(0.08, 0.2, -0.02, 0.25); g.quadraticCurveTo(0.04, 0.17, 0.1, 0.125); g.closePath(); g.fill();
        g.restore();
      }
      function drawOrca(g, G, t){
        const s = G.len, y = G.y + Math.sin(t * 0.8 + G.ph) * 8, beat = Math.sin(t * 1.9 + G.ph) * 0.1, wp = mkWarp(beat * 0.8);
        const blk = rgb(haze([14, 16, 24], y, G.z)), wht = rgb(haze([235, 240, 245], y, G.z)), sad = rgb(haze([150, 160, 175], y, G.z));
        g.save(); g.translate(G.x, y); g.scale(G.dir * s, s); g.globalAlpha = 0.97;
        // flukes
        const tb = wp(-0.5, 0); g.save(); g.translate(tb[0], tb[1]); g.rotate(beat * 1.5);
        g.fillStyle = blk; g.beginPath(); g.moveTo(0.02, -0.02); g.quadraticCurveTo(-0.1, -0.13, -0.2, -0.05); g.quadraticCurveTo(-0.1, -0.01, -0.06, 0); g.quadraticCurveTo(-0.1, 0.02, -0.2, 0.06); g.quadraticCurveTo(-0.1, 0.13, 0.02, 0.02); g.closePath(); g.fill();
        g.restore();
        // far pectoral (behind the body), then the body
        g.fillStyle = blk; g.beginPath(); g.ellipse(0.16, 0.1, 0.09, 0.045, 0.9, 0, TAU); g.fill();
        const body = [[0.5, 0.03], [0.43, -0.065], [0.22, -0.12], [-0.03, -0.13], [-0.28, -0.095], [-0.44, -0.04], [-0.5, -0.02], [-0.5, 0.02], [-0.44, 0.05], [-0.28, 0.11], [-0.03, 0.16], [0.22, 0.15], [0.43, 0.1]];
        g.beginPath(); smoothPath(g, body, wp, true); g.fillStyle = blk; g.fill();
        g.save(); g.clip();
        // white chin and belly, the flank lobe, the eye patch, the grey saddle
        g.fillStyle = wht; g.beginPath(); smoothPath(g, [[0.5, 0.035], [0.44, 0.07], [0.25, 0.12], [0.0, 0.14], [-0.2, 0.12], [-0.3, 0.04], [-0.22, 0.0], [-0.12, 0.06], [0.1, 0.09], [0.3, 0.08], [0.46, 0.05]], wp, true); g.fill();
        g.beginPath(); g.ellipse(0.285, -0.062, 0.078, 0.022, 0.3, 0, TAU); g.fill();
        g.fillStyle = sad; g.beginPath(); smoothPath(g, [[-0.05, -0.12], [-0.12, -0.13], [-0.25, -0.1], [-0.22, -0.05], [-0.12, -0.04], [-0.06, -0.08]], wp, true); g.fill();
        g.restore();
        // the eye: a small dark eye in a lighter socket, just in front of and below the patch
        g.fillStyle = rgb(haze([92, 98, 108], y, G.z)); g.beginPath(); g.arc(0.362, -0.028, 0.013, 0, TAU); g.fill();
        g.fillStyle = '#07070c'; g.beginPath(); g.arc(0.363, -0.028, 0.0085, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(0.366, -0.031, 0.003, 0, TAU); g.fill();
        // mouth line
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.006; g.beginPath(); g.moveTo(0.49, 0.04); g.quadraticCurveTo(0.4, 0.06, 0.3, 0.05); g.stroke();
        // the tall dorsal fin and the near pectoral paddle
        { const bw = beat * 0.8, f0y = warpY(bw, 0.08, -0.115), f1y = warpY(bw, -0.05, -0.42), f2y = warpY(bw, -0.16, -0.11);
          g.fillStyle = blk; g.beginPath(); g.moveTo(0.08, f0y); g.quadraticCurveTo(0.08 - 0.02, f1y + 0.1, -0.05, f1y); g.quadraticCurveTo(-0.05 - 0.03, f1y + 0.15, -0.16, f2y); g.closePath(); g.fill(); }
        g.beginPath(); g.ellipse(0.2, 0.15, 0.1, 0.05, 0.8 + beat * 0.6, 0, TAU); g.fill();
        g.restore();
      }


      // ═══════════════ DOLPHINS · SHARKS · THE PUFFER · CRABS · RUMI ═══════════════
      // Custom renderers for the animals a "fish" template can't carry; they
      // share the placement (translate / rotate(pitch) / scale(face·s, s)),
      // the body warp and the behaviour engine (steer / integrate / wander).
      const pal = (F, mk) => F.P || (F.P = mk());          // per-animal pre-hazed palette
      const CRABS = [], STARS = [];

      // ── DOLPHIN: bottlenose — melon, beak, curved dorsal, flippers, flukes ──
      function drawDolphin(g, F, t){
        const s = F.s * (1 - F.z * 0.55), wag = Math.sin(F.ph) * F.wagAmp, wp = mkWarp(wag * 0.8);
        const P = pal(F, () => { const H = c => rgb(haze(c, F.y, F.z)); return { top: H([84, 100, 122]), side: H([148, 164, 182]), belly: H([236, 240, 244]), dark: H([40, 50, 66]), edge: rgb(haze([30, 40, 56], F.y, F.z), 0.5) }; });
        g.save(); g.translate(F.x, F.y); g.rotate(F.pitch);
        const roll = F.rollT !== undefined && t < F.rollT ? Math.cos((F.rollT - t) / F.rollLen * TAU) : 1;
        g.scale(F.face * s, s * roll);
        // flukes (edge-on lobes) swinging with the beat
        const tb = wp(-0.5, 0); g.save(); g.translate(tb[0], tb[1]); g.rotate(wag * 1.6);
        g.fillStyle = P.top; g.beginPath(); g.moveTo(0.02, -0.015); g.quadraticCurveTo(-0.1, -0.1, -0.2, -0.06); g.quadraticCurveTo(-0.1, -0.01, -0.06, 0); g.quadraticCurveTo(-0.1, 0.02, -0.2, 0.07); g.quadraticCurveTo(-0.1, 0.11, 0.02, 0.015); g.closePath(); g.fill(); g.restore();
        // far flipper
        g.fillStyle = P.side; g.beginPath(); g.moveTo(0.22, 0.06); g.quadraticCurveTo(0.1, 0.16, 0.0, 0.2); g.quadraticCurveTo(0.08, 0.13, 0.15, 0.08); g.closePath(); g.fill();
        // body
        const body = [[0.5, 0.03], [0.46, -0.01], [0.38, -0.06], [0.22, -0.105], [0.0, -0.12], [-0.2, -0.095], [-0.38, -0.05], [-0.5, -0.02], [-0.5, 0.02], [-0.38, 0.06], [-0.2, 0.11], [0.0, 0.13], [0.22, 0.125], [0.38, 0.1], [0.46, 0.065]];
        g.beginPath(); smoothPath(g, body, wp, true);
        g.fillStyle = lg(g, 0, -0.12, 0, 0.13, [[0, P.top], [0.45, P.side], [0.7, P.side], [0.8, P.belly], [1, P.belly]]); g.fill();
        g.save(); g.clip();
        g.fillStyle = P.top; g.beginPath(); smoothPath(g, [[0.44, -0.03], [0.3, -0.08], [0.0, -0.13], [-0.3, -0.09], [-0.5, -0.03], [-0.3, -0.02], [0.0, -0.025], [0.3, -0.015]], wp, true); g.fill();   // the darker cape
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(0.05, -0.05, 0.3, 0.025, 0, 0, TAU); g.fill();
        g.restore();
        g.strokeStyle = P.edge; g.lineWidth = 0.008; g.beginPath(); smoothPath(g, body, wp, true); g.stroke();
        // dorsal fin (curved back), the near flipper
        g.fillStyle = P.top;
        { const bw = wag * 0.8, d0y = warpY(bw, 0.06, -0.1), d1y = warpY(bw, -0.12, -0.3), d2y = warpY(bw, -0.16, -0.08);
          g.beginPath(); g.moveTo(0.06, d0y); g.quadraticCurveTo(0.06 - 0.02, d1y + 0.06, -0.12, d1y); g.quadraticCurveTo(-0.12, d1y + 0.14, -0.16, d2y); g.closePath(); g.fill(); }
        g.fillStyle = P.side; g.beginPath(); g.moveTo(0.24, 0.08); g.quadraticCurveTo(0.14, 0.2, 0.04, 0.24); g.quadraticCurveTo(0.1, 0.14, 0.18, 0.09); g.closePath(); g.fill(); g.strokeStyle = P.edge; g.stroke();
        // smile along the beak, blowhole, eye
        g.strokeStyle = P.dark; g.lineWidth = 0.01; g.beginPath(); g.moveTo(0.5, 0.035); g.quadraticCurveTo(0.42, 0.075, 0.33, 0.06); g.stroke();
        g.fillStyle = P.dark; g.beginPath(); g.ellipse(0.2, -0.115, 0.012, 0.006, 0, 0, TAU); g.fill();
        g.fillStyle = '#0a0a12'; g.beginPath(); g.arc(0.37, 0.005, 0.016, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(0.375, 0.0, 0.006, 0, TAU); g.fill();
        g.restore();
      }

      // ── SHARK: blacktip reef shark — heterocercal tail, black-tipped fins, gill slits ──
      function drawShark(g, F, t){
        const s = F.s * (1 - F.z * 0.55), wag = Math.sin(F.ph) * F.wagAmp, wp = mkWarp(wag * 1.0);
        const P = pal(F, () => { const H = c => rgb(haze(c, F.y, F.z)); return { top: H([116, 114, 106]), mid: H([160, 158, 150]), belly: H([232, 230, 222]), black: H([24, 22, 24]), edge: rgb(haze([40, 40, 40], F.y, F.z), 0.45), gill: rgb(haze([60, 58, 54], F.y, F.z), 0.7) }; });
        g.save(); g.translate(F.x, F.y); g.rotate(F.pitch); g.scale(F.face * s, s);
        // caudal fin: the upper lobe long, both tips black
        const tailPath = () => { g.beginPath(); g.moveTo(0.02, -0.02); g.quadraticCurveTo(-0.12, -0.06, -0.26, -0.19); g.quadraticCurveTo(-0.2, -0.06, -0.12, 0.0); g.quadraticCurveTo(-0.16, 0.05, -0.18, 0.1); g.quadraticCurveTo(-0.1, 0.05, 0.02, 0.03); g.closePath(); };
        const tb = wp(-0.5, 0); g.save(); g.translate(tb[0], tb[1]); g.rotate(wag * 1.7);
        g.fillStyle = P.mid; tailPath(); g.fill(); g.strokeStyle = P.edge; g.lineWidth = 0.008; g.stroke();
        g.fillStyle = P.black; g.beginPath(); g.moveTo(-0.19, -0.12); g.lineTo(-0.26, -0.19); g.lineTo(-0.2, -0.17); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-0.15, 0.07); g.lineTo(-0.18, 0.1); g.lineTo(-0.165, 0.065); g.closePath(); g.fill();
        g.restore();
        // far pectoral
        g.fillStyle = P.mid; g.beginPath(); g.moveTo(0.2, 0.06); g.quadraticCurveTo(0.05, 0.14, -0.06, 0.2); g.quadraticCurveTo(0.06, 0.1, 0.12, 0.08); g.closePath(); g.fill();
        // body
        const body = [[0.5, 0.02], [0.45, -0.035], [0.32, -0.08], [0.12, -0.1], [-0.1, -0.09], [-0.3, -0.06], [-0.45, -0.03], [-0.5, -0.015], [-0.5, 0.015], [-0.45, 0.035], [-0.3, 0.07], [-0.1, 0.1], [0.12, 0.1], [0.32, 0.085], [0.45, 0.05]];
        g.beginPath(); smoothPath(g, body, wp, true);
        g.fillStyle = lg(g, 0, -0.1, 0, 0.1, [[0, P.top], [0.5, P.mid], [0.66, P.belly], [1, P.belly]]); g.fill();
        g.save(); g.clip();
        g.strokeStyle = P.gill; g.lineWidth = 0.007; g.beginPath();
        for (let i = 0; i < 5; i++){ const gx = 0.3 - i * 0.022; g.moveTo(gx, -0.02); g.quadraticCurveTo(gx - 0.012, 0.02, gx, 0.06); }
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(0.05, -0.04, 0.3, 0.02, 0, 0, TAU); g.fill();
        g.restore();
        g.strokeStyle = P.edge; g.lineWidth = 0.008; g.beginPath(); smoothPath(g, body, wp, true); g.stroke();
        // fins: first dorsal (black tip), second dorsal, pelvic, anal, near pectoral (black tip)
        const fin = (pts, tip) => {
          g.fillStyle = P.mid; g.beginPath(); poly(g, pts, wp); g.fill(); g.strokeStyle = P.edge; g.stroke();
          if (tip !== undefined){
            const bw = wag * 1.0, i1 = (tip + 1) % pts.length, i2 = (tip + 2) % pts.length;
            const ax = pts[tip][0], ay = warpY(bw, ax, pts[tip][1]);
            const bx = pts[i1][0], by = warpY(bw, bx, pts[i1][1]);
            const cx2 = pts[i2][0], cy2 = warpY(bw, cx2, pts[i2][1]);
            g.fillStyle = P.black; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, bx, 0.3), lerp(ay, by, 0.3)); g.lineTo(lerp(ax, cx2, 0.3), lerp(ay, cy2, 0.3)); g.closePath(); g.fill(); }
        };
        fin([[0.14, -0.09], [-0.02, -0.3], [-0.1, -0.08]], 1);
        fin([[-0.28, -0.06], [-0.35, -0.14], [-0.4, -0.04]]);
        fin([[-0.12, 0.09], [-0.2, 0.15], [-0.24, 0.08]]);
        fin([[-0.32, 0.065], [-0.38, 0.12], [-0.42, 0.045]]);
        g.fillStyle = P.mid; g.beginPath(); g.moveTo(0.22, 0.08); g.quadraticCurveTo(0.06, 0.18, -0.06, 0.26); g.quadraticCurveTo(0.08, 0.12, 0.14, 0.095); g.closePath(); g.fill(); g.strokeStyle = P.edge; g.stroke();
        g.fillStyle = P.black; g.beginPath(); g.moveTo(-0.06, 0.26); g.lineTo(-0.005, 0.215); g.lineTo(0.005, 0.235); g.closePath(); g.fill();
        // eye, the underslung mouth
        g.fillStyle = '#0a0a12'; g.beginPath(); g.arc(0.41, -0.02, 0.012, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(0.414, -0.024, 0.004, 0, TAU); g.fill();
        g.strokeStyle = P.gill; g.lineWidth = 0.009; g.beginPath(); g.moveTo(0.47, 0.045); g.quadraticCurveTo(0.42, 0.07, 0.34, 0.065); g.stroke();
        g.restore();
      }

      // ── PUFFER: a round spotted blowfish; `F.puff` 0..1 balloons it and brings out the spines ──
      function drawPuffer(g, F, t){
        const s = F.s * (1 - F.z * 0.55), p = F.puff || 0, wag = Math.sin(F.ph) * F.wagAmp;
        const P = pal(F, () => { const H = c => rgb(haze(c, F.y, F.z)); return { top: H([206, 176, 112]), mid: H([226, 204, 150]), belly: H([246, 240, 226]), spot: H([96, 66, 40]), fin: rgb(haze([230, 200, 140], F.y, F.z), 0.85), edge: rgb(haze([90, 70, 40], F.y, F.z), 0.6), spine: H([225, 210, 185]) }; });
        const rx = 0.5 * (1 + p * 0.25), ry = lerp(0.3, rx, p);
        g.save(); g.translate(F.x, F.y); g.rotate(F.pitch); g.scale(F.face * s, s);
        g.fillStyle = P.fin; g.strokeStyle = P.edge; g.lineWidth = 0.01;
        g.save(); g.translate(-rx * 0.98, 0); g.rotate(wag * 2);
        g.beginPath(); g.moveTo(0, -0.06); g.quadraticCurveTo(-0.2, -0.16, -0.22, 0); g.quadraticCurveTo(-0.2, 0.16, 0, 0.06); g.closePath(); g.fill(); g.stroke(); g.restore();
        const fl = Math.sin(F.ph * 2.2) * 0.25;
        g.beginPath(); g.moveTo(-0.05, -ry * 0.95); g.quadraticCurveTo(-0.18 + fl * 0.1, -ry - 0.12, -0.26, -ry * 0.85); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-0.05, ry * 0.95); g.quadraticCurveTo(-0.18 - fl * 0.1, ry + 0.11, -0.26, ry * 0.85); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
        g.fillStyle = lg(g, 0, -ry, 0, ry, [[0, P.top], [0.5, P.mid], [0.72, P.belly], [1, P.belly]]); g.fill();
        g.save(); g.clip();
        g.fillStyle = P.spot; g.beginPath();
        for (let i = 0; i < 26; i++){ const a = psr(i + 700) * TAU, d = Math.sqrt(psr(i + 701)); const sx = Math.cos(a) * d * rx * 0.9, sy = -Math.abs(Math.sin(a)) * d * ry * 0.85 + ry * 0.1, srx = 0.02 + psr(i + 702) * 0.025; g.moveTo(sx + srx, sy); g.ellipse(sx, sy, srx, 0.016 + psr(i + 703) * 0.02, 0, 0, TAU); }
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.ellipse(-0.05, -ry * 0.55, rx * 0.5, ry * 0.18, 0, 0, TAU); g.fill();
        g.restore();
        g.strokeStyle = P.edge; g.lineWidth = 0.012; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
        if (p > 0.15){
          g.strokeStyle = P.spine; g.lineWidth = 0.014; g.lineCap = 'round';
          const n = 34, L = 0.03 + 0.09 * p; g.beginPath();
          for (let i = 0; i < n; i++){ const a = i / n * TAU + 0.1, x0 = Math.cos(a) * rx * 0.98, y0 = Math.sin(a) * ry * 0.98; g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); }
          g.stroke();
        }
        g.save(); g.translate(rx * 0.3, 0.02); g.rotate(0.4 + Math.sin(F.ph * 2.4) * 0.5);
        g.fillStyle = P.fin; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-0.1, 0.03, -0.16, 0.0); g.quadraticCurveTo(-0.1, 0.1, -0.02, 0.09); g.closePath(); g.fill(); g.strokeStyle = P.edge; g.lineWidth = 0.008; g.stroke(); g.restore();
        const ex = rx * 0.58, ey = -ry * 0.28, er = 0.075 + p * 0.02;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill();
        g.fillStyle = P.spot; g.beginPath(); g.arc(ex + er * 0.15, ey, er * 0.62, 0, TAU); g.fill();
        g.fillStyle = '#0a0a12'; g.beginPath(); g.arc(ex + er * 0.2, ey, er * 0.4, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex + er * 0.35, ey - er * 0.35, er * 0.2, 0, TAU); g.fill();
        g.strokeStyle = P.edge; g.lineWidth = 0.012; g.beginPath(); g.ellipse(rx * 0.98, 0.03, 0.03, 0.045, 0, 0, TAU); g.stroke();   // the pout
        g.restore();
      }

      // ── CRAB: a red reef crab that scuttles sideways along the sand ──
      function drawCrab(g, C, t){
        const s = C.s;
        const P = pal(C, () => { const H = c => rgb(haze(c, C.y, 0.02)); return { top: H([226, 96, 54]), mid: H([196, 70, 40]), lo: H([130, 40, 26]), hi: H([250, 160, 110]) }; });
        const hop = C.hopUntil && t < C.hopUntil ? Math.sin((C.hopUntil - t) / C.hopLen * Math.PI) * 14 : 0;
        const moving = Math.abs(C.vx) > 2, step = C.legPh;
        g.save(); g.translate(C.x, C.y - hop); g.scale(s, s);
        shadow(g, 0, 0.55 + hop / s * 0.3, 1.3, 0.28, 0.3);
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let side = -1; side <= 1; side += 2){
          for (let i = 0; i < 4; i++){
            const ph = step + i * 1.6 + (side > 0 ? Math.PI : 0), lift = moving ? Math.max(0, Math.sin(ph)) * 0.18 : 0;
            const bx = side * (0.45 + i * 0.12), by = 0.05 + i * 0.05;
            const kx = side * (0.95 + i * 0.1), ky = -0.25 + i * 0.12 - lift, fx = side * (1.15 + i * 0.12) + (moving ? Math.cos(ph) * 0.06 * side : 0), fy = 0.5 + i * 0.02 - lift * 0.5;
            g.strokeStyle = P.lo; g.lineWidth = 0.13; g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
            g.strokeStyle = P.mid; g.lineWidth = 0.08; g.beginPath(); g.moveTo(bx, by); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
          }
        }
        const raise = C.hopUntil && t < C.hopUntil + 0.6 ? 0.45 : 0.1 + Math.sin(t * 1.3 + C.ph0) * 0.05;
        for (let side = -1; side <= 1; side += 2){
          const ax = side * 0.55, ay = -0.15, ex = side * 1.0, ey = -0.45 - raise;
          g.strokeStyle = P.lo; g.lineWidth = 0.2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(side * 0.9, -0.1 - raise * 0.5); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = P.mid; g.lineWidth = 0.13; g.beginPath(); g.moveTo(ax, ay); g.lineTo(side * 0.9, -0.1 - raise * 0.5); g.lineTo(ex, ey); g.stroke();
          g.fillStyle = P.top; g.beginPath(); g.ellipse(ex, ey - 0.12, 0.2, 0.15, side * 0.4, 0, TAU); g.fill();
          g.strokeStyle = P.lo; g.lineWidth = 0.03; g.stroke();
          g.fillStyle = P.lo; g.beginPath(); g.moveTo(ex + side * 0.08, ey - 0.26); g.lineTo(ex + side * 0.2, ey - 0.16); g.lineTo(ex + side * 0.02, ey - 0.12); g.closePath(); g.fill();
        }
        g.beginPath(); g.moveTo(-0.7, 0.1); g.quadraticCurveTo(-0.75, -0.45, 0, -0.5); g.quadraticCurveTo(0.75, -0.45, 0.7, 0.1); g.quadraticCurveTo(0.4, 0.42, 0, 0.42); g.quadraticCurveTo(-0.4, 0.42, -0.7, 0.1); g.closePath();
        g.fillStyle = lg(g, 0, -0.5, 0, 0.42, [[0, P.hi], [0.35, P.top], [1, P.mid]]); g.fill();
        g.strokeStyle = P.lo; g.lineWidth = 0.04; g.stroke();
        g.fillStyle = P.lo; for (let i = 0; i < 6; i++){ g.beginPath(); g.arc(-0.4 + i * 0.16, -0.05 + Math.sin(i * 1.7) * 0.06, 0.035, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(-0.15, -0.3, 0.3, 0.08, 0.1, 0, TAU); g.fill();
        for (let side = -1; side <= 1; side += 2){
          g.strokeStyle = P.mid; g.lineWidth = 0.07; g.beginPath(); g.moveTo(side * 0.22, -0.42); g.lineTo(side * 0.26, -0.68); g.stroke();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(side * 0.26, -0.72, 0.1, 0, TAU); g.fill();
          g.fillStyle = '#0a0a12'; g.beginPath(); g.arc(side * 0.27 + (C.vx > 0 ? 0.02 : C.vx < 0 ? -0.02 : 0), -0.72, 0.055, 0, TAU); g.fill();
        }
        g.strokeStyle = P.lo; g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.1, 0.22); g.quadraticCurveTo(0, 0.3, 0.1, 0.22); g.stroke();
        g.restore();
      }
      function updateCrab(C, t, dt){
        if (C.wait > 0){ C.wait -= dt; C.vx = 0; }
        else {
          if (C.target === null) C.target = lerp(C.home[0], C.home[1], Math.random());
          const d = C.target - C.x, spd = (C.hopUntil && t < C.hopUntil + 0.8) ? 95 : 26;
          if (Math.abs(d) < 3){ C.target = null; C.wait = 1 + Math.random() * 4; C.vx = 0; }
          else { C.vx = Math.sign(d) * spd; C.x += C.vx * dt; C.legPh += dt * spd * 0.3; }
        }
        C.y = ground(C.x) + C.dy;
      }
      function startleCrab(C, t){
        C.hopUntil = t + 0.5; C.hopLen = 0.5; C.wait = 0;
        C.target = Math.max(C.home[0], Math.min(C.home[1], C.x + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 80)));
        puff(C.x, C.y - 10, 4);
      }
      const crabAt = (dx, dy) => CRABS.find(C => Math.hypot((dx - C.x) / (C.s * 1.6), (dy - C.y) / (C.s * 1.1)) < 1);

      // ── behaviours ──
      function updateDolphin(F, t, dt){
        if (F.breathing){
          steer(F, F.target[0], F.target[1], F.spd * 1.5, dt, 2.5); integrate(F, dt, t);
          if (F.y < -30){ puff(F.x, 6, 10); F.breathing = false; F.breathAt = t + 35 + Math.random() * 40; F.target = [F.x + F.face * 220, 180 + Math.random() * 220]; F.wait = 0; }
        } else if (t > F.breathAt){ F.breathing = true; F.target = [F.x + (F.face > 0 ? 1 : -1) * 260, -90]; }
        else wander(F, t, dt);
      }
      function updatePuffer(F, t, dt){
        if (!F.puffAt) F.puffAt = t + 25 + Math.random() * 50;
        if (t > F.puffAt && F.puffT0 === undefined) inflate(F, t);
        if (F.puffT0 !== undefined){
          const e = t - F.puffT0;
          F.puff = e < 0.6 ? smooth(e / 0.6) : e < 3.6 ? 1 : e < 4.8 ? 1 - smooth((e - 3.6) / 1.2) : 0;
          if (e >= 4.8){ F.puffT0 = undefined; F.puff = 0; F.puffAt = t + 90 + Math.random() * 60; }
        }
        const base = F.spd; F.spd = base * (1 - 0.7 * (F.puff || 0)); wander(F, t, dt); F.spd = base;
      }
      function inflate(F, t){ if (F.puffT0 === undefined){ F.puffT0 = t; puff(F.x, F.y, 5); } }

      // ── rumi (backgrounds/rumi/chibi-walker.js) glides past in FLY mode every few
      //    minutes; a tapped sea star summons her early (as in the old reef) ──
      const rumiLayer = doc.createElement('div');
      rumiLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
      stage.appendChild(rumiLayer);
      let rumiPatrol = null;
      const RUMI_FLY = { mode: 'fly', direction: 'ltr', height: '30vh', bottom: '40%', duration: 3250, zIndex: 7 };
      function needRumi(cb){
        if (window.ChibiWalker){ cb(); return; }
        const ex = doc.querySelector('script[data-chibi-walker]');
        if (ex){ ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
        const s = doc.createElement('script');
        s.src = BASE + 'rumi/chibi-walker.js'; s.setAttribute('data-chibi-walker', '1');
        s.onload = cb; s.onerror = cb;
        doc.head.appendChild(s);
      }
      needRumi(() => {
        if (stopped || !window.ChibiWalker) return;
        rumiPatrol = window.ChibiWalker.patrol(rumiLayer, Object.assign({}, RUMI_FLY, { alternate: false, gapMin: 120000, gapMax: 240000, startDelay: 60000 + Math.random() * 120000 }));
      });
      function summonRumi(){
        if (stopped) return;
        needRumi(() => { if (stopped || !window.ChibiWalker || rumiLayer.querySelector('.chibi-walker')) return; window.ChibiWalker.walk(rumiLayer, RUMI_FLY); });
      }

      // ── build the cast ──
      function buildFish(){
        // clownfish: two for each big anemone, one for the small one
        ANEMS.forEach((A, i) => {
          A.fish = [];
          const n = A.r > 50 ? 2 : 1;
          for (let k = 0; k < n; k++){
            const F = makeFish({ kind: 'clown', x: A.x + (k - 0.5) * 40, y: A.y - A.r * 0.9, z: A.z, s: (A.r > 50 ? 34 : 28) * (0.85 + k * 0.25), spd: 42, turn: 2.5, wagBase: 1.4, wagRate: 1.5, home_a: A, inside: 0, hiding: false, hideAt: 8 + Math.random() * 12, ph0: Math.random() * TAU });
            F.isClown = true; A.fish.push(F);
          }
        });
        // Dory — the regal blue tang, cruising the open water
        makeFish({ kind: 'dory', x: 800, y: 380, z: 0.12, s: 78, spd: 46, home: [120, 1480, 160, 620], dash: 'roll' });
        // the butterflyfish pair
        const B1 = makeFish({ kind: 'bfly', x: 500, y: 300, z: 0.18, s: 58, spd: 36, home: [200, 1400, 180, 600], bfly: true });
        const B2 = makeFish({ kind: 'bfly', x: 460, y: 320, z: 0.2, s: 54, spd: 40, follow: B1, bfly: true });
        // two yellow tangs grazing the reef tops
        makeFish({ kind: 'tang', x: 300, y: 480, z: 0.14, s: 62, spd: 34, home: [60, 560, 340, 540] });
        makeFish({ kind: 'tang', x: 1350, y: 460, z: 0.2, s: 56, spd: 34, home: [1000, 1580, 300, 520] });
        // royal grammas low by the rocks
        makeFish({ kind: 'gramma', x: 1200, y: 700, z: 0.08, s: 30, spd: 30, home: [1060, 1560, 560, 740] });
        makeFish({ kind: 'gramma', x: 450, y: 720, z: 0.06, s: 28, spd: 30, home: [200, 620, 600, 750] });
        // two bottlenose dolphins, fast in the open water, rising for a breath now and then
        makeFish({ kind: 'dolphin', x: 400, y: 260, z: 0.1, s: 230, spd: 85, turn: 1.3, wagBase: 0.7, wagRate: 0.6, home: [60, 1540, 90, 470], breathAt: 20 + Math.random() * 30, dash: 'roll' });
        makeFish({ kind: 'dolphin', x: 1200, y: 320, z: 0.16, s: 205, spd: 85, turn: 1.3, wagBase: 0.7, wagRate: 0.6, home: [60, 1540, 90, 470], breathAt: 45 + Math.random() * 30, dash: 'roll' });
        // two blacktip reef sharks patrolling the middle water
        SHARKS.push(makeFish({ kind: 'shark', x: 250, y: 500, z: 0.14, s: 250, spd: 40, turn: 0.9, wagBase: 0.9, wagRate: 0.55, home: [-40, 1640, 250, 560] }));
        SHARKS.push(makeFish({ kind: 'shark', x: 1300, y: 420, z: 0.22, s: 215, spd: 40, turn: 0.9, wagBase: 0.9, wagRate: 0.55, home: [-40, 1640, 250, 560] }));
        // the blowfish, pottering about the rocks
        makeFish({ kind: 'puffer', x: 640, y: 640, z: 0.1, s: 62, spd: 18, turn: 1.4, wagBase: 0.8, wagRate: 2.2, home: [220, 1380, 470, 730], puff: 0 });
        // crabs on the sand of the centre channel
        for (let i = 0; i < 3; i++){
          const dy = [14, 34, 52][i], home = [[560, 1040], [600, 1000], [540, 1060]][i];
          CRABS.push({ x: lerp(home[0], home[1], Math.random()), y: 0, dy, s: 15 + dy * 0.12, home, target: null, wait: Math.random() * 3, vx: 0, legPh: Math.random() * TAU, ph0: Math.random() * TAU });
        }
        // the chromis school
        const leader = makeFish({ kind: 'chromis', x: 900, y: 260, z: 0.3, s: 20, spd: 44, home: [300, 1300, 120, 440] });
        SCHOOL = { leader, members: [], spread: 1 };
        for (let i = 0; i < 13; i++){
          const a = Math.random() * TAU, d = 20 + Math.random() * 70;
          SCHOOL.members.push(makeFish({ kind: 'chromis', x: leader.x + Math.cos(a) * d, y: leader.y + Math.sin(a) * d * 0.5, z: 0.26 + Math.random() * 0.12, s: 16 + Math.random() * 6, spd: 44, slot: [Math.cos(a) * d, Math.sin(a) * d * 0.5], ph0: Math.random() * TAU, schooling: true }));
        }
        FISH.sort((a, b) => b.z - a.z);
      }
      function giantNear(F){
        for (const G of [WHALE, ORCA]) if (G.active && Math.abs(G.x - F.x) < G.len * 0.4 && Math.abs(G.y - F.y) < G.len * 0.2) return G;
        return null;
      }
      function updateFish(t, dt){
        for (const F of FISH){
          if (!F.isClown && !F.schooling && !(F.dashUntil && t < F.dashUntil)){ const G = giantNear(F); if (G) fleeFrom(F, G.x, G.y - 40, t); }
          if (!F.isClown && !F.schooling && F.kind !== 'shark' && F.kind !== 'dolphin' && !(F.dashUntil && t < F.dashUntil))
            for (const Sh of SHARKS) if (Math.hypot(Sh.x - F.x, Sh.y - F.y) < (Sh.dashUntil && t < Sh.dashUntil ? 260 : 150)){ fleeFrom(F, Sh.x, Sh.y, t); break; }
          if (F.isClown) updateClown(F, t, dt);
          else if (F.kind === 'dolphin') updateDolphin(F, t, dt);
          else if (F.kind === 'puffer') updatePuffer(F, t, dt);
          else if (F.schooling || F === (SCHOOL && SCHOOL.leader)) continue;
          else if (F.follow){ const L = F.follow; steer(F, L.x - L.face * 46 + Math.sin(t * 0.8) * 10, L.y + 14, F.spd * (F.dashUntil && t < F.dashUntil ? 3 : 1) + Math.hypot(L.x - F.x, L.y - F.y) * 0.6, dt, 2.4); integrate(F, dt, t); }
          else wander(F, t, dt);
        }
        if (SCHOOL){
          for (const Sh of SHARKS) if (Math.hypot(Sh.x - SCHOOL.leader.x, Sh.y - SCHOOL.leader.y) < 220) SCHOOL.scatterUntil = t + 1.2;
          updateSchool(t, dt);
        }
        for (const C of CRABS) updateCrab(C, t, dt);
      }
      // actions (clicks + the scheduler share these)
      function actOn(F, t){
        const m = F.face > 0 ? F.x + F.s * 0.4 : F.x - F.s * 0.4; puff(m, F.y, 5);
        if (F.kind === 'puffer'){ inflate(F, t); return; }
        if (F.kind === 'shark'){ F.dashUntil = t + 1.6; F.target = [lerp(F.home[0], F.home[1], Math.random()), lerp(F.home[2], F.home[3], Math.random())]; F.wait = 0; return; }
        if (F.bfly){ for (let i = 0; i < 3; i++) HEARTS.push({ x: F.x + (Math.random() - 0.5) * 20, y: F.y - F.s * 0.3, t0: t + i * 0.25, ph: Math.random() * TAU, s: 8 + Math.random() * 6 }); F.dashUntil = t + 0.6; }
        else if (F.dash === 'roll' && Math.random() < 0.5){ F.rollT = t + 1.1; F.rollLen = 1.1; }
        else if (F.isClown){ F.dartUntil = t + 3; F.target = null; }
        else if (F.schooling || (SCHOOL && F === SCHOOL.leader)){ SCHOOL.scatterUntil = t + 1.6; }
        else { F.dashUntil = t + 1.2; F.target = [lerp(F.home[0], F.home[1], Math.random()), lerp(F.home[2], F.home[3], Math.random())]; F.wait = 0; }
      }
      let nextAct = 6;
      function scheduler(t){
        if (t < nextAct) return; nextAct = t + 4 + Math.random() * 8;
        const F = FISH[Math.floor(Math.random() * FISH.length)];
        actOn(F, t);
        if (Math.random() < 0.25 && !F.poop) F.poopAt = t;
      }
      function fishAt(dx, dy){
        let best = null, bd = 1e9;
        for (const F of FISH){ const s = F.s * (1 - F.z * 0.55), d = Math.hypot((dx - F.x) / (s * 0.65), (dy - F.y) / (s * 0.45)); if (d < 1 && d < bd){ bd = d; best = F; } }
        return best;
      }
      function drawGiants(g, t, dt){
        if (updateGiant(WHALE, t, dt, ORCA)) drawWhale(g, WHALE, t);
        if (updateGiant(ORCA, t, dt, WHALE)) drawOrca(g, ORCA, t);
      }
      const drawFishBand = (g, t, dt, far) => { for (const F of FISH) if (!F.isClown && (far ? F.z > 0.22 : F.z <= 0.22)) drawFishFull(g, F, t, dt); if (!far) for (const C of CRABS) drawCrab(g, C, t); };

      // ── coral life, per frame ──
      function updateCorals(t, dt){
        for (const C of CORALS) if (C.ret > 0 && t > C.retT + 2.5) C.ret = Math.max(0, C.ret - dt * 0.4);   // polyps creep back out
        if ((PROF.frames % 3) === 0){                             // a fish brushing past pulls the polyps in, shuts a clam
          for (const C of CORALS){
            if (C.ret > 0.9) continue;
            for (const F of FISH){
              if (F.isClown) continue;
              const s = F.s * (1 - F.z * 0.55) * 0.5;
              if (Math.abs(F.x - C.x) < C.r * 0.9 + s && Math.abs(F.y - C.y) < C.r * 0.6 + s * 0.6){ startleCoral(C, t); break; }
            }
          }
          for (const K of CLAMS){ if (K.open < 0.3) continue; for (const F of FISH){ if (F.isClown) continue; const s = F.s * (1 - F.z * 0.55) * 0.5; if (Math.hypot(F.x - K.x, F.y - K.y) < K.w * 0.8 + s){ snapClam(K, t); break; } } }
        }
        for (const W of WORMS){ const want = CORALS[W.ci].ret > 0.5 ? 0 : 1; W.ext += (want - W.ext) * Math.min(1, dt * (want ? 1.4 : 9)); }
        for (const K of CLAMS){ const want = t < K.snapT + 3 ? 0.02 : 0.7 + 0.3 * Math.sin(t * 0.45 + K.ph); K.open += (want - K.open) * Math.min(1, dt * (want < 0.1 ? 14 : 0.8)); }
        for (const V of VENTS) if (t > V.nextAt){ V.nextAt = t + (V.big ? 0.8 : 2) + Math.random() * 3; SPECKS.push({ x: V.x + (Math.random() - 0.5) * V.r, y: V.y, v: 7 + Math.random() * 9, t0: t, ph: Math.random() * TAU }); }
        for (let i = SPECKS.length - 1; i >= 0; i--){ const p = SPECKS[i]; p.y -= p.v * dt; p.x += Math.sin(t * 2 + p.ph) * 4 * dt; if (t - p.t0 > 5) SPECKS.splice(i, 1); }
        const c = cur(t);
        for (let i = EGGS.length - 1; i >= 0; i--){ const e = EGGS[i]; if (t < e.t0) continue; e.y -= e.v * dt; e.x += (Math.sin(t * 1.7 + e.ph) * 8 + c * 12) * dt; if (t - e.t0 > 7) EGGS.splice(i, 1); }
      }
      function drawCoralLife(g, t, fore){
        if (Q === 0) return;
        // polyps: a slow pulse that travels across the reef; pulled in when startled
        for (let b = 0; b < 4; b++){
          for (let pass = Q === 2 ? 0 : 1; pass < 2; pass++){       // a soft halo (full quality only), then the bright core
            let any = false; g.beginPath();
            for (const Pp of LIFE){
              if (Pp.fore !== fore || Pp.b !== b) continue;
              const C = CORALS[Pp.ci], pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + Pp.ph + (Pp.x + Pp.y) * 0.012);
              const r = Pp.r * 1.6 * (0.3 + 0.7 * pulse) * (1 - C.ret) * (pass ? 1 : 2.1);
              if (r < 0.3) continue;
              g.moveTo(Pp.x + r, Pp.y); g.arc(Pp.x, Pp.y, r, 0, TAU); any = true;
            }
            if (any){ g.fillStyle = 'rgba(' + POLYP_COL[b] + (pass ? ',0.95)' : ',0.28)'); g.fill(); }
          }
        }
        // mushroom fringes: a ring of short tentacles that lengthen, shorten and waver
        g.lineCap = 'round'; g.lineWidth = 1.4;
        for (const Fr of FRINGES){
          if (Fr.fore !== fore) continue;
          const L = (3.5 + 3.5 * (0.5 + 0.5 * Math.sin(t * 1.1 + Fr.ph))) * (1 - CORALS[Fr.ci].ret); if (L < 0.4) continue;
          g.strokeStyle = Fr.col; g.beginPath();
          for (let i = 0; i < Fr.n; i++){ const a = i / Fr.n * TAU, wob = Math.sin(t * 2.3 + i * 1.3 + Fr.ph) * 0.3; const x0 = Fr.x + Math.cos(a) * Fr.rx, y0 = Fr.y + Math.sin(a) * Fr.ry; g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a + wob) * L, y0 + Math.sin(a + wob) * L * 0.7); }
          g.stroke();
        }
        // christmas-tree worms: feather crowns that sway, and vanish into their tubes when startled
        for (const W of WORMS){ if (W.fore !== fore || W.ext < 0.04) continue; g.save(); g.translate(W.x, W.y); g.rotate(Math.sin(t * 1.6 + W.ph) * 0.07); g.scale(1, W.ext); paintWorm(g, 0, 0, W.h, W.col); g.restore(); }
        // sponges pumping: a breathing glow at each opening, specks drifting out
        if (Q === 2) for (const V of VENTS){ if (V.fore !== fore) continue; glow(g, 'cyan', V.x, V.y - V.r * 0.3, V.r * 2.6, 0.12 + 0.10 * Math.sin(t * 1.1 + V.ph)); }
        if (!fore){
          if (SPECKS.length){ g.fillStyle = 'rgba(230,245,255,0.5)'; g.beginPath(); for (const p of SPECKS){ const a = 1 - (t - p.t0) / 5, r = 0.8 + a * 0.7; g.moveTo(p.x + r, p.y); g.arc(p.x, p.y, r, 0, TAU); } g.fill(); }
          // coral spawning: clouds of eggs rising
          if (EGGS.length) for (let k = 0; k < 2; k++){
            g.fillStyle = k ? 'rgba(255,170,120,0.85)' : 'rgba(255,190,205,0.85)'; g.beginPath(); let any = false;
            for (const e of EGGS){ if (e.k !== k || t < e.t0) continue; const r = 1.7 * (1 - (t - e.t0) / 7 * 0.5); g.moveTo(e.x + r, e.y); g.arc(e.x, e.y, r, 0, TAU); any = true; }
            if (any) g.fill();
          }
        }
      }

      // ── layers ──
      let waterL = null, reefL = null, foreL = null, bgL = null, FORE_TOP = 0, REEF_TOP = 0;
      function paintWaterL(g){ paintWater(g); paintFarReef(g); }
      function paintReefL(g){ CORALS.length = LIFE.length = WORMS.length = VENTS.length = FRINGES.length = 0; PAINT_FORE = false; paintSand(g); for (const e of STILL) if (!e.fore) e.draw(g); }
      function paintFore(g){ PAINT_FORE = true; for (const e of STILL) if (e.fore) e.draw(g); PAINT_FORE = false; }
      // the vignette used to be a full-screen blend every frame; it is now folded
      // into each still layer once (source-atop on the transparent ones, so it
      // only darkens what they paint) — the same darkening, no per-frame cost
      function foldVignette(L, comp){
        const g = L.cx; g.save(); g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); g.globalCompositeOperation = comp;
        g.fillStyle = rg(g, W * 0.5, H * 0.45, Math.min(W, H) * 0.45, Math.max(W, H) * 0.78, [[0, 'rgba(2,20,40,0)'], [0.7, 'rgba(2,20,40,0.18)'], [1, 'rgba(2,20,40,0.50)']]);
        g.fillRect(0, 0, W, H); g.restore();
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        S = Math.max(W / DW, H / DH); OX = (W - DW * S) / 2; OY = H - DH * S;
        waterL = makeLayer(W, H, DPR); reefL = makeLayer(W, H, DPR); foreL = makeLayer(W, H, DPR);
        let g = waterL.cx; g.save(); g.setTransform(waterL.dpr * S, 0, 0, waterL.dpr * S, waterL.dpr * OX, waterL.dpr * OY); paintWaterL(g); g.restore();
        g = reefL.cx; g.save(); g.setTransform(reefL.dpr * S, 0, 0, reefL.dpr * S, reefL.dpr * OX, reefL.dpr * OY); paintReefL(g); g.restore();
        g = foreL.cx; g.save(); g.setTransform(foreL.dpr * S, 0, 0, foreL.dpr * S, foreL.dpr * OX, foreL.dpr * OY); paintFore(g); g.restore();
        foldVignette(waterL, 'source-over'); foldVignette(reefL, 'source-atop'); foldVignette(foreL, 'source-atop');
        // water + reef pre-composited: the frame blits ONE layer unless a giant is passing between them
        bgL = makeLayer(W, H, DPR);
        { const b = bgL.cx; b.save(); b.setTransform(1, 0, 0, 1, 0, 0); b.drawImage(waterL.cv, 0, 0); b.drawImage(reefL.cv, 0, 0); b.restore(); }
        raysL = makeLayer(W, H, DPR * 0.5); raysL.built = false;
        for (const A of ANEMS) A.L = null;                      // the crown caches are resolution-bound
        warmTs = 0;                                             // repainting every layer: don't judge these frames
        REEF_TOP = Math.max(0, Math.floor(OY + 300 * S));       // the reef band starts here (design y 300: above the tallest coral)
        FORE_TOP = Math.max(0, Math.floor(OY + 560 * S));       // the foreground band starts here (design y 560)
        PROF.repaints = (PROF.repaints || 0) + 1;
      }

      // ── frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        profT = performance.now(); PROF.frames++;
        const c = cur(t); DT = dt;
        anemBuilt = 0;
        updateFish(t, dt); scheduler(t); updateCorals(t, dt);
        mark('think');
        const giantOn = WHALE.active || ORCA.active;              // only then must the water and the reef be separate layers
        ctx.drawImage((giantOn ? waterL : bgL).cv, 0, 0, W, H);
        mark('water');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawGiants(ctx, t, dt); mark('giants');
        drawFishBand(ctx, t, dt, true); mark('farfish');
        ctx.restore();
        if (giantOn && REEF_TOP < H){ const sy = REEF_TOP * reefL.dpr; ctx.drawImage(reefL.cv, 0, sy, reefL.cv.width, reefL.cv.height - sy, 0, REEF_TOP, W, H - REEF_TOP); }
        mark('reef');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawRays(ctx, t); mark('rays');
        drawCaustics(ctx, t); mark('caustics');
        for (const e of LIVE) if (!e.fore) e.draw(ctx, t, c);
        mark('live');
        drawCoralLife(ctx, t, false); mark('corals');
        drawFishBand(ctx, t, dt, false); mark('fish');
        ctx.restore();
        if (FORE_TOP < H){ const sy = FORE_TOP * foreL.dpr; ctx.drawImage(foreL.cv, 0, sy, foreL.cv.width, foreL.cv.height - sy, 0, FORE_TOP, W, H - FORE_TOP); }
        mark('fore');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        for (const e of LIVE) if (e.fore) e.draw(ctx, t, c);
        drawCoralLife(ctx, t, true);
        drawParticles(ctx, t, dt, c);
        drawHearts(ctx, t);
        ctx.restore();
        mark('front');
      }
      let prevTs = null, lastDrawTs = 0, lastDecide = 0, calmSince = 0, frameErr = false, warmTs = 0;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);
        if (!warmTs) warmTs = ts;
        const warming = ts - warmTs < 1200;                        // the build spike must not latch half rate
        if (warming){ perf.gapEma = 16.7; perf.costEma = 0; lastDecide = ts; calmSince = ts; }
        else if (prevTs !== null) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts; perf.drawn++;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!frameErr){ frameErr = true; console.error('reef2 frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          // While frames run long the scene first DRAWS LESS (Q 2→1→0: cached rays
          // refreshed half as often, one caustic pass, no polyp halos / vent glows,
          // fewer motes; then no rays, caustics or coral life at all) and only
          // then falls back to every 2nd display frame. It climbs back after a
          // long calm, at most twice, so a borderline machine doesn't flap.
          lastDecide = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21, warm = perf.costEma > 5 || perf.gapEma > 19.5;
          if (heavy || warm){
            calmSince = ts;
            if (!qPin && Q > 0 && ts - lastQ > 3000){ Q--; lastQ = ts; }
            else if (heavy && Q === 0) perf.halfRate = true;
          }
          else if (perf.costEma > 4 || perf.gapEma > 18.5) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
          else if (!qPin && Q < 2 && !IS_TOUCH && qUps < 2 && ts - calmSince > 12000 && ts - lastQ > 12000){ Q++; qUps++; lastQ = ts; }
        }
      }

      // ── clicks (design coords): the nearest hit fish acts; a tapped anemone
      //    sends its clownfish darting out; pooping is never click-driven ──
      function onClick(e){
        if (e.target.closest(UI_SEL)) return;
        const dx = (e.clientX - OX) / S, dy = (e.clientY - OY) / S, t = lastT;
        const F = fishAt(dx, dy);
        if (F){ actOn(F, t); return; }
        const C = crabAt(dx, dy);
        if (C){ startleCrab(C, t); return; }
        for (const st of STARS) if (Math.hypot(dx - st.x, dy - st.y) < st.r * 1.6){ puff(st.x, st.y - 6, 5); summonRumi(); return; }
        for (const K of CLAMS) if (Math.hypot(dx - K.x, dy - K.y) < K.w * 0.7){ snapClam(K, t); return; }
        { let best = null, bd = 1e9; for (const C of CORALS){ const d = Math.hypot((dx - C.x) / (C.r * 1.05), (dy - C.y) / (C.r * 0.8)); if (d < 1 && d < bd){ bd = d; best = C; } }
          if (best){ spawnCoral(best, t); puff(best.x, best.y - best.r * 0.5, 3); return; } }
        for (const A of ANEMS){
          if (Math.hypot((dx - A.x) / (A.r * 1.1), (dy - (A.y - A.r * 0.6)) / (A.r * 0.9)) < 1){ puff(A.x, A.y - A.r * 0.8, 8); for (const f of A.fish){ f.dartUntil = t + 3 + Math.random(); f.target = null; } return; }
        }
      }

      buildCaustics();
      buildReef();
      buildFish();
      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      window._reef2 = BACKGROUNDS.reef2._test = {
        seek: s => { t0 = (t0 === null ? 0 : t0); t0 -= (s - lastT) * 1000; lastT = s; },
        current: () => cur(lastT),
        counts: () => ({ still: STILL.length, live: LIVE.length, rocks: ROCKS.length, anemones: ANEMS.length, fans: FANS.length, softs: SOFTS.length, bubbles: BUBBLES.length, fish: FISH.length, hearts: HEARTS.length, whale: WHALE.active, orca: ORCA.active }),
        fish: () => FISH.map(F => ({ kind: F.kind, x: Math.round(F.x), y: Math.round(F.y), face: +F.face.toFixed(2), inside: F.inside, puff: F.puff })),
        whale: x => { WHALE.active = true; WHALE.dir = 1; WHALE.x = x === undefined ? 800 : x; WHALE.y = (WHALE.yr[0] + WHALE.yr[1]) / 2; WHALE.t0 = lastT; },
        orca: x => { ORCA.active = true; ORCA.dir = -1; ORCA.x = x === undefined ? 800 : x; ORCA.y = (ORCA.yr[0] + ORCA.yr[1]) / 2; ORCA.t0 = lastT; },
        act: kind => { const F = FISH.find(f => f.kind === kind); if (F) actOn(F, lastT); return !!F; },
        dart: () => ANEMS.forEach(A => A.fish.forEach(f => { f.dartUntil = lastT + 3; f.target = null; })),
        hide: () => ANEMS.forEach(A => A.fish.forEach(f => { f.hiding = true; f.hideAt = lastT + 6; f.target = null; })),
        poop: () => FISH.forEach(F => { if (!F.poop) F.poopAt = lastT; }),
        breath: () => { const D = FISH.find(f => f.kind === 'dolphin'); if (D){ D.breathAt = lastT - 1; } return !!D; },
        shark: () => SHARKS.forEach(S => actOn(S, lastT)),
        puffer: () => { const F = FISH.find(f => f.kind === 'puffer'); if (F) inflate(F, lastT); return !!F; },
        crab: () => CRABS.forEach(C => startleCrab(C, lastT)),
        crabs: () => CRABS.map(C => ({ x: Math.round(C.x), y: Math.round(C.y) })),
        rumi: () => { summonRumi(); return !!window.ChibiWalker; },
        corals: () => ({ corals: CORALS.length, polyps: LIFE.length, worms: WORMS.length, vents: VENTS.length, fringes: FRINGES.length, clams: CLAMS.length, eggs: EGGS.length }),
        startle: () => { CORALS.forEach(C => startleCoral(C, lastT)); CLAMS.forEach(K => snapClam(K, lastT)); },
        spawn: i => { const C = CORALS[i === undefined ? Math.floor(Math.random() * CORALS.length) : i]; if (C) spawnCoral(C, lastT); return !!C; },
        clam: () => CLAMS.forEach(K => snapClam(K, lastT)),
        perf: () => ({ dpr: +DPR.toFixed(2), q: Q, halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1), costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn, S: +S.toFixed(3) }),
        quality: q => { if (q === null){ qPin = false; } else if (q !== undefined){ Q = Math.max(0, Math.min(2, q | 0)); qPin = true; lastQ = performance.now(); } return Q; },   // quality(2) pins; quality(null) releases
        pmax: () => PMAX,
        prof: () => { const o = {}; for (const k in PROF) o[k] = (k === 'frames' || k === 'repaints') ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; },
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (rumiPatrol){ try { rumiPatrol.stop(); } catch (e) {} }
        if (window._reef2 === BACKGROUNDS.reef2._test) delete window._reef2;
        stage.innerHTML = '';
      };
    },
  };
})();
