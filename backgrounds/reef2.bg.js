/* ── Reef v2 — a coral reef built from zero ──────────────────────────────────
   window.BACKGROUNDS.reef2 = { skin:'reef', aids:'reef', init({stage}) → cleanup }

   A shallow tropical reef seen from just above the sand, at mid-morning,
   the sun high on the LEFT. Nothing here is shared with the older reef.bg.js
   (kept in the folder, unloaded). This first pass is the REEF ITSELF — the
   water, the rock, the corals, the anemones, the sand — with NO fish; the
   life gets layered on afterwards.

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
   capped at 1.5× AND ~2.4 MP; the still reef in ONE prebaked layer (backL)
   plus a foreground band layer (foreL) blitted only over its band; the
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
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      const PROF = { frames: 0 }; let profT = 0;
      const mark = k => { const n = performance.now(); PROF[k] = (PROF[k] || 0) + (n - profT); profT = n; };

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
        // christmas-tree worms living on it
        if (C.worms) for (let i = 0; i < C.worms; i++){
          const wx = x + (psr(sd + 200 + i * 2) - 0.5) * r * 1.2, wy = y - ry * 0.2 + (psr(sd + 201 + i * 2) - 0.5) * ry * 0.8;
          const wc = [[255, 120, 60], [60, 140, 230], [250, 210, 70], [240, 240, 240]][(sd + i) % 4];
          paintWorm(g, wx, wy, 5 + psr(sd + i) * 3, haze(wc, wy, z));
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
        shadow(g, x, y + 3, w * 0.55, w * 0.1, 0.35);
        const layers = 5;
        for (let L = 0; L < layers; L++){
          const k = L / (layers - 1), ly = y - k * w * 0.36, lw = w * (0.55 - k * 0.22), lh = w * (0.16 - k * 0.04);
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
        for (const f of fingers){
          const tx = f.fx + f.lean * f.fh, ty = y - f.fh;
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
        for (const T of tubes){
          const tx = T.tx + T.lean * T.th, ty = y - T.th;
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
      }

      // ── GIANT CLAM: a ridged shell with a wavy iridescent mantle ──
      function paintClam(g, C){
        const { x, y, w, sd, z = 0.1 } = C, h = w * 0.55;
        const shell = haze([200, 190, 170], y, z), shellLo = haze([120, 110, 100], y, z);
        const mantle = haze([40, 110, 160], y, z), mantleHi = haze([90, 220, 230], y, z), spots = haze([20, 60, 120], y, z);
        shadow(g, x, y + 3, w * 0.55, h * 0.2, 0.35);
        // lower valve (a wedge)
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(shell)], [1, rgb(shellLo)]]);
        g.beginPath(); g.moveTo(x - w * 0.5, y - h * 0.5); g.quadraticCurveTo(x - w * 0.3, y + h * 0.3, x, y + h * 0.15); g.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.5, y - h * 0.5); g.closePath(); g.fill();
        // the mantle: a wavy band between the valves
        g.beginPath();
        for (let i = 0; i <= 30; i++){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * 0.2 + Math.sin(u * TAU * 3.5 + sd) * h * 0.12; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        for (let i = 30; i >= 0; i--){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * 0.55 - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.12; g.lineTo(px, py); }
        g.closePath();
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(mantle)], [0.5, rgb(mantleHi)], [1, rgb(mantle)]]); g.fill();
        g.save(); g.clip(); g.fillStyle = rgb(spots, 0.8);
        for (let i = 0; i < 24; i++){ g.beginPath(); g.arc(x - w * 0.45 + psr(sd + i * 2) * w * 0.9, y - h * 0.62 - psr(sd + i * 2 + 1) * h * 0.25, 1.2 + psr(sd + i) * 1.4, 0, TAU); g.fill(); }
        g.restore();
        // upper valve ridges
        g.fillStyle = lg(g, x - w * 0.5, 0, x + w * 0.5, 0, [[0, rgb(lit(shell, 0.2))], [1, rgb(shellLo)]]);
        g.beginPath();
        for (let i = 0; i <= 30; i++){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * 0.55 - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.12; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        for (let i = 30; i >= 0; i--){ const u = i / 30, px = x - w * 0.5 + u * w, py = y - h * 0.5 - Math.sin(u * Math.PI) * h * 1.15 - Math.sin(u * TAU * 3.5 + sd + 1) * h * 0.1; g.lineTo(px, py); }
        g.closePath(); g.fill();
        g.strokeStyle = rgb(shellLo, 0.55); g.lineWidth = 1;
        for (let i = 1; i < 7; i++){ const u = i / 7; g.beginPath(); g.moveTo(x - w * 0.5 + u * w, y - h * 0.5 - Math.sin(u * Math.PI) * h * 0.6); g.lineTo(x + (u - 0.5) * w * 0.5, y - h * 0.5 - Math.sin(u * Math.PI) * h * 1.1); g.stroke(); }
      }

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
        for (let r = 0.22; r < 0.98; r += 0.11){
          g.beginPath();
          for (let i = 0; i <= 24; i++){
            const u = i / 24, a = -TAU / 4 - 1.05 + u * 2.1, rr = h * r * (1 - Math.abs(u - 0.5) * 0.5) * (1 + Math.sin(u * 30 + sd + r * 40) * 0.05);
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
          // the puffs: a cluster of polyp balls, lighter core
          for (const p of s.puffs){
            const px = ex + p.dx, py = ey + p.dy;
            g.fillStyle = rgb(col, 0.9); g.beginPath(); g.arc(px, py, p.r, 0, TAU); g.fill();
            g.fillStyle = rgb(hi, 0.7); g.beginPath(); g.arc(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.5, 0, TAU); g.fill();
            g.fillStyle = rgb(lit(col, -0.3), 0.5);
            for (let k = 0; k < 5; k++){ const a = k / 5 * TAU + p.r; g.beginPath(); g.arc(px + Math.cos(a) * p.r * 0.75, py + Math.sin(a) * p.r * 0.75, p.r * 0.22, 0, TAU); g.fill(); }
          }
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
        for (let i = 0; i < n; i++){
          const u = (i - (n - 1) / 2) / n, len = h * (0.6 + psr(sd + i) * 0.4), bx = x + u * h * 0.35;
          const bend = (c * 0.7 + Math.sin(t * 1.3 + sd * 2 + i * 0.7) * 0.15) * len * 0.5 + u * len * 0.3;
          g.strokeStyle = rgb(psr(sd + i + 30) < 0.5 ? col : hi, 0.92); g.lineWidth = 1.4 + psr(sd + i + 60) * 1.2;
          g.beginPath(); g.moveTo(bx, y + 2); g.quadraticCurveTo(bx + bend * 0.15, y - len * 0.6, bx + bend, y - len + Math.abs(bend) * 0.3); g.stroke();
        }
      }

      // ── SEA ANEMONE: the clownfish house ──
      function buildAnemone(A){
        const rnd = makeRng(A.sd * 19 + 23), tents = [], n = A.n || 130;
        for (let i = 0; i < n; i++){
          const th0 = rnd() * TAU, rho = Math.sqrt(rnd());            // where on the oral disc it grows (angle, radius 0..1)
          const len = A.r * (0.7 + rnd() * 0.6), th = A.r * (0.035 + rnd() * 0.03);
          tents.push({ th0, rho, len, th, ph: rnd() * TAU, wob: 0.5 + rnd() * 0.9, curl: 0.4 + rnd() * 0.7, v: (Math.sin(th0) + 1) / 2 });
        }
        tents.sort((a, b) => a.v - b.v);                                // back of the disc first (v small = back)
        A.tents = tents; return A;
      }
      function drawAnemone(g, A, t, c){
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
        // tentacles: each grows outward from its spot on the disc, rises, and curls
        g.lineCap = 'round';
        const drawTent = T => {
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
          g.fillStyle = T.cTip; g.beginPath(); g.arc(ex, ey, T.th * 1.35, 0, TAU); g.fill();
          g.fillStyle = T.cTipHi; g.beginPath(); g.arc(ex - T.th * 0.4, ey - T.th * 0.45, T.th * 0.5, 0, TAU); g.fill();
        };
        const n = A.tents.length, back = n >> 1;
        for (let i = 0; i < back; i++) drawTent(A.tents[i]);
        g.fillStyle = rgb(lit(colLo, -0.3), 0.9); g.beginPath(); g.ellipse(x, top, cw * 0.2, dr * 0.3, 0, 0, TAU); g.fill();
        for (let i = back; i < n; i++) drawTent(A.tents[i]);
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
        p = onRock(L2, 0.45); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemone(g, ANEMS[0], t, c)); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 2, r: 66, sd: 106, z: 0.09, pal: 0, n: 130 })); }
        p = onRock(L2, -0.05); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0] + 8, y: q[1] + 8, r: 26, sd: 107, z: 0.10, pal: 0 })); }
        p = onRock(L2, 0.95); { const q = p; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[0], t, c)); FANS.push(buildFan({ x: q[0], y: q[1] + 6, h: 95, sd: 108, z: 0.1, pal: 0 })); }
        p = onRock(L3, -0.4); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 110, sd: 109, z: 0.06, pal: 0 })); }
        p = onRock(L3, 0.55); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 64, sd: 110, z: 0.06, pal: 0 })); }
        p = onRock(L3, 0.95); { const q = p; live(q[1] + 2, (g, t, c) => drawWhips(g, { x: q[0], y: q[1] + 4, h: 120, n: 6, sd: 111, z: 0.06, pal: 0 }, t, c)); }
        p = onRock(L4, -0.3); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 2, r: 58, sd: 112, z: 0.03, pal: 4, flat: true, worms: 2 }), true); }
        p = onRock(L4, 0.6); { const q = p; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[0], t, c), true); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 78, sd: 113, z: 0.03, pal: 0 })); }
        p = onRock(L5, 0.55); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 105, sd: 114, z: 0.0, pal: 2, spread: 1.15 }), true); }
        p = onRock(L5, 0.0); { const q = p; still(q[1] + 3, g => paintBrain(g, { x: q[0], y: q[1] - 4, r: 50, sd: 115, z: 0.0, pal: 1 }), true); }
        p = onRock(L5, 0.9); { const q = p; still(q[1] + 2, g => paintClam(g, { x: q[0] + 14, y: q[1] + 4, w: 64, sd: 116, z: 0.0 }), true); }
        still(770, g => paintTubes(g, { x: 400, y: 760, h: 70, sd: 117, z: 0.09, pal: 1 }));

        // ── corals on the right ──
        p = onRock(R1, -0.35); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1] + 2, h: 105, sd: 121, z: 0.14, pal: 2, spread: 1.05 })); }
        p = onRock(R1, 0.55); { const q = p; still(q[1] + 3, g => paintTable(g, { x: q[0], y: q[1] + 2, w: 120, sd: 122, z: 0.14, pal: 0 })); }
        p = onRock(R1, -0.95); { const q = p; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[1], t, c)); FANS.push(buildFan({ x: q[0] - 6, y: q[1] + 14, h: 110, sd: 123, z: 0.13, pal: 1 })); }
        { const q = [1400, 700]; still(q[1] + 2, g => paintTubes(g, { x: q[0], y: q[1], h: 110, sd: 124, z: 0.12, pal: 1 })); }
        p = onRock(R2, -0.2); { const q = p; still(q[1] + 3, g => paintBrain(g, { x: q[0], y: q[1] - 6, r: 70, sd: 125, z: 0.12, pal: 2 })); }
        p = onRock(R2, 0.6); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 130, sd: 126, z: 0.12, pal: 1 })); }
        p = onRock(R2, -0.75); { const q = p; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[1], t, c)); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 90, sd: 127, z: 0.12, pal: 1 })); }
        p = onRock(R3, -0.55); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemone(g, ANEMS[1], t, c)); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 2, r: 74, sd: 128, z: 0.09, pal: 1, n: 140 })); }
        p = onRock(R3, 0.5); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 4, r: 56, sd: 129, z: 0.10, pal: 2, worms: 3 })); }
        p = onRock(R3, 0.98); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0], y: q[1] + 6, r: 24, sd: 130, z: 0.10, pal: 2 })); }
        p = onRock(R4, -0.5); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 58, sd: 131, z: 0.06, pal: 2 })); }
        p = onRock(R4, 0.5); { const q = p; still(q[1] + 3, g => paintBarrel(g, { x: q[0], y: q[1] + 2, h: 74, sd: 132, z: 0.06 })); }
        p = onRock(R5, -0.5); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1] - 2, r: 64, sd: 133, z: 0.02, pal: 1, flat: true, worms: 2 }), true); }
        p = onRock(R5, 0.45); { const q = p; live(q[1] + 2, (g, t, c) => drawAnemone(g, ANEMS[2], t, c), true); ANEMS.push(buildAnemone({ x: q[0], y: q[1] + 4, r: 58, sd: 134, z: 0.02, pal: 2, n: 110 })); }
        p = onRock(R6, -0.2); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 110, sd: 135, z: 0.0, pal: 0 }), true); }
        p = onRock(R6, -0.85); { const q = p; live(q[1] + 3, (g, t, c) => drawWhips(g, { x: q[0], y: q[1] + 4, h: 130, n: 7, sd: 136, z: 0.0, pal: 1 }, t, c), true); }
        p = onRock(R6, 0.4); { const q = p; still(q[1] + 3, g => paintLettuce(g, { x: q[0], y: q[1], w: 120, sd: 137, z: 0.0, pal: 2 }), true); }
        { const q = [1240, 800]; still(q[1] + 2, g => paintClam(g, { x: q[0], y: q[1], w: 58, sd: 138, z: 0.05 })); }
        { const q = [1180, 700]; live(q[1] + 3, (g, t, c) => drawFan(g, FANS[2], t, c)); FANS.push(buildFan({ x: q[0], y: q[1] + 2, h: 72, sd: 139, z: 0.15, pal: 2 })); }

        // ── the centre channel ──
        p = onRock(C1, -0.3); { const q = p; still(q[1] + 3, g => paintBoulder(g, { x: q[0], y: q[1], r: 30, sd: 141, z: 0.06, pal: 3, flat: true })); }
        p = onRock(C1, 0.7); { const q = p; still(q[1] + 3, g => paintMushroom(g, { x: q[0], y: q[1] + 4, r: 20, sd: 142, z: 0.06, pal: 1 })); }
        p = onRock(C2, 0.2); { const q = p; still(q[1] + 3, g => paintFingers(g, { x: q[0], y: q[1] + 2, w: 40, sd: 143, z: 0.04, pal: 1 })); }
        p = onRock(C3, 0.0); { const q = p; still(q[1] + 3, g => paintStaghorn(g, { x: q[0], y: q[1], h: 70, sd: 144, z: 0.12, pal: 3, spread: 1.2 })); }
        { const q = [640, 850]; live(q[1] + 3, (g, t, c) => drawSoft(g, SOFTS[2], t, c), true); SOFTS.push(buildSoft({ x: q[0], y: q[1], h: 60, sd: 145, z: 0.0, pal: 2 })); }
        { const q = [980, 860]; live(q[1] + 2, (g, t, c) => drawAnemone(g, ANEMS[3], t, c), true); ANEMS.push(buildAnemone({ x: q[0], y: q[1], r: 46, sd: 146, z: 0.0, pal: 0, n: 90 })); }
        // sea stars, urchins, shells, grass on the sand
        still(842, g => paintStar(g, { x: 590, y: 838, r: 22, sd: 151, z: 0.04, pal: 0 }));
        still(884, g => paintStar(g, { x: 1090, y: 880, r: 26, sd: 152, z: 0.0, pal: 1 }), true);
        still(830, g => paintStar(g, { x: 860, y: 826, r: 15, sd: 153, z: 0.05, pal: 2 }));
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
        g.save(); g.globalCompositeOperation = 'lighter';
        // the light plays on the sand proper; a breath of it reaches the rock band above
        const sandClip = () => { g.beginPath(); g.moveTo(-400, DH + 300); for (let x = -400; x <= DW + 400; x += 20) g.lineTo(x, ground(x)); g.lineTo(DW + 400, DH + 300); g.closePath(); };
        const passes = [[sandClip, 0.30], [() => { g.beginPath(); g.rect(-400, 660, DW + 800, 140); }, 0.05]];
        for (const [clip, a] of passes){
          g.save(); clip(); g.clip();
          for (let pass = 0; pass < 2; pass++){
            const sc = pass ? 2.1 : 1.5, ox = (t * (pass ? 7 : -5)) % 256, oy = (t * (pass ? 3 : 5)) % 256;
            g.save(); g.translate(ox, oy); g.scale(sc, sc * 0.45);
            g.fillStyle = causPat; g.globalAlpha = a * (pass ? 0.7 : 1);
            g.fillRect(-1600, -400, 5200, 3400);
            g.restore();
          }
          g.restore();
        }
        g.restore();
      }
      // god-rays: a few long soft wedges from the sun, swinging slowly; each
      // ray is three nested wedges so its edges melt into the water
      function drawRays(g, t){
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
      // motes drifting with the current, bubbles seeping up from the reef
      const MOTES = Array.from({ length: 110 }, (_, i) => ({ x: psr(i + 600) * DW, y: psr(i + 601) * DH, r: 0.6 + psr(i + 602) * 1.6, vy: -2 - psr(i + 603) * 5, ph: psr(i + 604) * TAU, a: 0.15 + psr(i + 605) * 0.35 }));
      const SEEPS = [[250, 690], [1330, 705], [1460, 470], [720, 800], [1560, 640]];
      const BUBBLES = [];
      let nextBub = 1;
      function drawParticles(g, t, dt, c){
        for (const m of MOTES){
          m.x += (c * 14 + Math.sin(t * 0.7 + m.ph) * 4) * dt; m.y += m.vy * dt;
          if (m.y < -20) m.y = DH + 10; if (m.x < -20) m.x = DW + 10; else if (m.x > DW + 20) m.x = -10;
          g.fillStyle = 'rgba(220,245,255,' + (m.a * (0.6 + 0.4 * Math.sin(t * 1.3 + m.ph))) + ')';
          g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.fill();
        }
        if (t > nextBub){ nextBub = t + 0.8 + Math.random() * 2.2; const s = SEEPS[Math.floor(Math.random() * SEEPS.length)]; const n = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) BUBBLES.push({ x: s[0] + (Math.random() - 0.5) * 12, y: s[1], r: 1.5 + Math.random() * 3, v: 40 + Math.random() * 40, ph: Math.random() * TAU, t0: t + i * 0.25 }); }
        g.lineWidth = 1;
        for (let i = BUBBLES.length - 1; i >= 0; i--){
          const b = BUBBLES[i]; if (t < b.t0) continue;
          b.y -= b.v * dt; b.x += (Math.sin(t * 3 + b.ph) * 12 + c * 10) * dt; b.r += dt * 0.6;
          if (b.y < -10){ BUBBLES.splice(i, 1); continue; }
          g.strokeStyle = 'rgba(230,250,255,0.55)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.28, 0, TAU); g.fill();
          g.fillStyle = 'rgba(200,240,255,0.12)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
        }
      }

      // ── layers ──
      let backL = null, foreL = null, vigL = null, FORE_TOP = 0;
      function paintBack(g){
        paintWater(g); paintFarReef(g); paintSand(g);
        for (const e of STILL) if (!e.fore) e.draw(g);
      }
      function paintFore(g){ for (const e of STILL) if (e.fore) e.draw(g); }
      function buildVignette(){
        vigL = makeLayer(W, H, 0.25); const g = vigL.cx;
        g.fillStyle = rg(g, W * 0.5, H * 0.45, Math.min(W, H) * 0.45, Math.max(W, H) * 0.78, [[0, 'rgba(2,20,40,0)'], [0.7, 'rgba(2,20,40,0.18)'], [1, 'rgba(2,20,40,0.50)']]);
        g.fillRect(0, 0, W, H);
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        S = Math.max(W / DW, H / DH); OX = (W - DW * S) / 2; OY = H - DH * S;
        backL = makeLayer(W, H, DPR); foreL = makeLayer(W, H, DPR);
        let g = backL.cx; g.save(); g.setTransform(backL.dpr * S, 0, 0, backL.dpr * S, backL.dpr * OX, backL.dpr * OY); paintBack(g); g.restore();
        g = foreL.cx; g.save(); g.setTransform(foreL.dpr * S, 0, 0, foreL.dpr * S, foreL.dpr * OX, foreL.dpr * OY); paintFore(g); g.restore();
        FORE_TOP = Math.max(0, Math.floor(OY + 560 * S));       // the foreground band starts here (design y 560)
        buildVignette();
        PROF.repaints = (PROF.repaints || 0) + 1;
      }

      // ── frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        profT = performance.now(); PROF.frames++;
        const c = cur(t);
        ctx.drawImage(backL.cv, 0, 0, W, H);
        mark('back');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawRays(ctx, t); mark('rays');
        drawCaustics(ctx, t); mark('caustics');
        for (const e of LIVE) if (!e.fore) e.draw(ctx, t, c);
        mark('live');
        ctx.restore();
        if (FORE_TOP < H){ const sy = FORE_TOP * foreL.dpr; ctx.drawImage(foreL.cv, 0, sy, foreL.cv.width, foreL.cv.height - sy, 0, FORE_TOP, W, H - FORE_TOP); }
        mark('fore');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        for (const e of LIVE) if (e.fore) e.draw(ctx, t, c);
        drawParticles(ctx, t, dt, c);
        ctx.restore();
        mark('front');
        ctx.drawImage(vigL.cv, 0, 0, W, H);
        mark('vignette');
      }
      let prevTs = null, lastDrawTs = 0, lastDecide = 0, calmSince = 0, frameErr = false;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);
        if (prevTs !== null) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts; perf.drawn++;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!frameErr){ frameErr = true; console.error('reef2 frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          lastDecide = ts;
          const heavy = perf.costEma > 7 || perf.gapEma > 21;
          if (heavy){ perf.halfRate = true; calmSince = ts; }
          else if (perf.costEma > 3.5 || perf.gapEma > 17.5) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
        }
      }

      // ── clicks: nothing yet (the life comes next); the filter is in place ──
      function onClick(e){ if (e.target.closest(UI_SEL)) return; }

      buildCaustics();
      buildReef();
      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      window._reef2 = BACKGROUNDS.reef2._test = {
        seek: s => { t0 = (t0 === null ? 0 : t0); t0 -= (s - lastT) * 1000; lastT = s; },
        current: () => cur(lastT),
        counts: () => ({ still: STILL.length, live: LIVE.length, rocks: ROCKS.length, anemones: ANEMS.length, fans: FANS.length, softs: SOFTS.length, bubbles: BUBBLES.length }),
        perf: () => ({ dpr: +DPR.toFixed(2), halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1), costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn, S: +S.toFixed(3) }),
        prof: () => { const o = {}; for (const k in PROF) o[k] = (k === 'frames' || k === 'repaints') ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; },
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (window._reef2 === BACKGROUNDS.reef2._test) delete window._reef2;
        stage.innerHTML = '';
      };
    },
  };
})();
