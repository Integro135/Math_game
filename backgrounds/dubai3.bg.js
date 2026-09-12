/* ── Dubai v3 — the skyline at golden hour, built from zero ──────────────────
   window.BACKGROUNDS.dubai3 = { skin:'dubai', aids:'dubai', init({stage}) → cleanup }

   A painterly Dubai seen from the water at the end of the day, and the tower
   that owns the picture: the BURJ KHALIFA. Nothing here is shared with the
   older dubai / dubai2 scenes (both kept in the folder, unloaded).

   DESIGN SPACE 1600×900, waterline HZ=790, cover-fitted and bottom-anchored
   (a wide window crops the sides, a tall one shows more sky); `S` maps design
   → screen, hit-tests map back. The sun sets low LEFT of centre, so every
   west face is warm and every east face is cool blue — that one rule is what
   makes the glass read as glass.

   THE CITY, left → right (the game card sits centre, max-width 700, so the
   heroes stand on the sides and the centre skyline stays low):
   · the BURJ AL ARAB on its island — the white sail: a mast, the ribbed
     exoskeleton, the glowing atrium wall, the helipad disc, Al Muntaha
   · the JUMEIRAH BEACH HOTEL wave behind it
   · the MARINA cluster with the CAYAN twist (helical facets) and AIN DUBAI,
     the wheel, turning over the water on Bluewaters
   · downtown middle, low and hazy: the EMIRATES TOWERS (twin triangular
     crowns), the MUSEUM OF THE FUTURE torus with its calligraphy, generic
     glass towers with real massing (two lit faces, floor bands, mullions,
     podiums, crowns)
   · the BURJ KHALIFA — built as a stack of TIERS around a core: three wings
     stepping back in a spiral (each tier a shaft with a rounded shoulder and
     its own two-tone lighting), silver-blue banded glass with the sunset
     climbing its west edge, floor spandrels, vertical fins, the telescoping
     spire and needle with a blinking beacon; at its feet the ADDRESS towers,
     the OPERA, the DUBAI MALL front and the FOUNTAIN LAKE
   · the golden DUBAI FRAME far right

   THE HOUR: a slow cycle golden → blue hour → night → back (`DAY_PERIOD`);
   the sky, the glass, the haze and the water re-key together (`look(t)`),
   the city's lights come up as it darkens.

   LIVING: the Burj LED SHOW (bands racing up the tower, shimmer, a finale —
   scheduled and on click), the DUBAI FOUNTAIN (choreographed lit jets in the
   lake — scheduled and on click), FIREWORKS over downtown (click the upper
   sky), AIN DUBAI turning (click → spin-up + rainbow rim), a boat fleet with
   wakes and lit reflections (click → horn-blink), an A380 crossing with its
   beacons, a helicopter to the Al Arab helipad, dusk birds, night shooting
   stars, SZR traffic streams, palm fronds in the breeze, the Al Arab façade
   wash (click → new colour), the Museum's pulse rings (click), dolphins in
   the open water (click), the Frame's golden shimmer, twinkling stars.

   PERF (house rules, see aurora.bg.js): backing store capped at 1.5× AND
   ~2.4 MP; the still city in ONE prebaked layer per look-key (24 keys per
   cycle); its rippled water mirror in a second, ⅛-res layer; every glow is a
   sprite; gradients memoised; the rAF loop drops to every 2nd display frame
   while frames run long. Hooks: window._dubai3 = BACKGROUNDS.dubai3._test.  */
(function(){
  'use strict';
  const doc = document, TAU = Math.PI * 2;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const psr = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // stable pseudo-random per index
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);

  // ── colour helpers ──
  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const mixc = (a, b, k) => { a = hexc(a); b = hexc(b); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
  const mix = (a, b, k, al) => rgb(mixc(a, b, k), al);
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.dubai3 = {
    skin: 'dubai',
    aids: 'dubai',
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov';

      // ── the stage ──
      const DW = 1600, DH = 900, HZ = 790;                       // design space; waterline
      const SUNX = 520, SUNY = 782;                              // the sun sets low, left of centre
      const BX = 1290;                                           // Burj Khalifa axis
      const DAY_PERIOD = 260;                                    // golden → blue hour → night → golden
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;  // S: design → screen scale; OX/OY: design origin on screen
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      const PROF = { frames: 0 }; let profT = 0;
      const mark = k => { const n = performance.now(); PROF[k] = (PROF[k] || 0) + (n - profT); profT = n; };

      // ── memo + sprites ──
      let GCACHE = {};
      const lgc = (key, g, x0, y0, x1, y1, st) => GCACHE[key] || (GCACHE[key] = lg(g, x0, y0, x1, y1, st));
      const rgc = (key, g, x, y, r0, r1, st) => GCACHE[key] || (GCACHE[key] = rg(g, x, y, r0, r1, st));
      const SPR = {};
      function sprite(name){                                     // 128-px radial glows, drawn once
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = { warm: '255,205,130', white: '255,255,255', gold: '255,180,70', cyan: '120,220,255', blue: '110,170,255', rose: '255,120,170', green: '120,255,180' }[name] || '255,255,255';
        const soft = name === 'white' ? 0.35 : 0.5;
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

      // ── the hour: three keys, blended ──
      // 0 golden hour · 1 blue hour · 2 night · back through 1 to 0
      const KEYS = [
        { sky: ['#1c1f4a', '#4b3a6e', '#b45a5a', '#f0a05a', '#ffd48a'], glow: [255, 190, 110], glowA: 0.95, haze: [230, 150, 120], hazeA: 0.30,
          warm: [255, 190, 120], cool: [110, 140, 190], glass: [120, 150, 190], lights: 0.35, stars: 0.0, sun: 1.0, water: ['#5a4a70', '#2c2f58', '#12162e'], sunPath: 1.0 },
        { sky: ['#070b24', '#141c4e', '#3a2f6e', '#8a4e6a', '#d08a6a'], glow: [240, 150, 110], glowA: 0.6, haze: [150, 110, 140], hazeA: 0.26,
          warm: [255, 200, 140], cool: [80, 110, 170], glass: [60, 90, 140], lights: 0.85, stars: 0.55, sun: 0.35, water: ['#2a2a58', '#14183a', '#0a0d22'], sunPath: 0.45 },
        { sky: ['#03040f', '#070b26', '#0e1640', '#1c2450', '#3a3a5a'], glow: [140, 120, 160], glowA: 0.28, haze: [80, 90, 140], hazeA: 0.22,
          warm: [255, 210, 160], cool: [60, 90, 150], glass: [30, 50, 95], lights: 1.0, stars: 1.0, sun: 0.0, water: ['#101638', '#0a0d26', '#05071a'], sunPath: 0.15 },
      ];
      let LOOK = null, lookKey = -1;
      function look(t){
        const ph = (t % DAY_PERIOD) / DAY_PERIOD;                // 0..1
        // golden holds, then slides to blue hour, night holds, comes back
        let a, b, k;
        if (ph < 0.22){ a = 0; b = 0; k = 0; }
        else if (ph < 0.36){ a = 0; b = 1; k = smooth((ph - 0.22) / 0.14); }
        else if (ph < 0.46){ a = 1; b = 2; k = smooth((ph - 0.36) / 0.10); }
        else if (ph < 0.72){ a = 2; b = 2; k = 0; }
        else if (ph < 0.84){ a = 2; b = 1; k = smooth((ph - 0.72) / 0.12); }
        else { a = 1; b = 0; k = smooth((ph - 0.84) / 0.16); }
        const A = KEYS[a], B = KEYS[b], o = { ph };
        for (const key in A){
          const va = A[key], vb = B[key];
          if (typeof va === 'number') o[key] = lerp(va, vb, k);
          else if (Array.isArray(va) && typeof va[0] === 'number') o[key] = mixc(va, vb, k);
          else o[key] = va.map((c, i) => mixc(c, vb[i], k));
        }
        o.night = clamp01((o.lights - 0.35) / 0.65);           // 0 at golden hour → 1 at night
        return o;
      }

      // ── layers ──
      let cityL = null, reflL = null, skyL = null, fxL = null;   // still city (per look-key) · its water mirror · sky · scratch
      let B_SKY = 0;                                             // the sky is only blitted down to where the city is opaque

      // ═══════════════════════════ THE STILL CITY ═══════════════════════════
      // Everything below is painted in DESIGN coordinates onto a context whose
      // transform is (S, OX, OY). `L` is the current LOOK.
      function paintSky(g, L){
        g.fillStyle = lg(g, 0, 0, 0, HZ, [[0, rgb(L.sky[0])], [0.30, rgb(L.sky[1])], [0.62, rgb(L.sky[2])], [0.86, rgb(L.sky[3])], [1, rgb(L.sky[4])]]);
        g.fillRect(-400, -400, DW + 800, HZ + 400);
        // the sun's glow, low left, and its band along the whole horizon
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = rg(g, SUNX, SUNY, 0, 620, [[0, rgb(L.glow, 0.85 * L.glowA)], [0.25, rgb(L.glow, 0.32 * L.glowA)], [0.6, rgb(L.glow, 0.08 * L.glowA)], [1, rgb(L.glow, 0)]]);
        g.fillRect(-400, 0, DW + 800, HZ);
        g.fillStyle = lg(g, 0, HZ - 220, 0, HZ, [[0, rgb(L.haze, 0)], [1, rgb(L.haze, L.hazeA)]]);
        g.fillRect(-400, HZ - 220, DW + 800, 220);
        // the sun itself, a flattened disc sinking into the haze
        if (L.sun > 0.02){
          g.fillStyle = rg(g, SUNX, SUNY + 6, 0, 60, [[0, rgb([255, 245, 220], 0.95 * L.sun)], [0.35, rgb([255, 215, 150], 0.7 * L.sun)], [1, rgb([255, 190, 120], 0)]]);
          g.beginPath(); g.ellipse(SUNX, SUNY + 6, 60, 26, 0, 0, TAU); g.fill();
        }
        g.restore();
        // cirrus: long streaks lit from below near the horizon, cooler higher up
        for (let i = 0; i < 14; i++){
          const cy = i < 8 ? 120 + psr(i + 1) * 300 : 470 + psr(i + 1) * 170;
          const cx = -100 + psr(i + 30) * (DW + 200), w = 220 + psr(i + 60) * 420, h = 6 + psr(i + 90) * 16, low = cy > 430;
          const col = low ? mixc(L.glow, [255, 255, 255], 0.35) : mixc(L.sky[1], [255, 255, 255], 0.55);
          const a = ((low ? 0.22 : 0.14) * (0.6 + 0.4 * (1 - L.night)) + 0.04) * (1 - 0.7 * L.night);
          g.save(); g.translate(cx, cy); g.rotate((psr(i + 120) - 0.5) * 0.16);
          g.fillStyle = rg(g, 0, 0, 0, 1, [[0, rgb(col, a)], [0.55, rgb(col, a * 0.5)], [1, rgb(col, 0)]]);
          g.save(); g.scale(w, h); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
          g.restore();
        }
        // stars (dim at dusk, out at night)
        if (L.stars > 0.02){
          for (let i = 0; i < 340; i++){
            const x = psr(i * 2 + 7) * DW, y = psr(i * 2 + 8) * 560, r = 0.4 + psr(i + 9) * 1.1;
            const a = (0.25 + psr(i + 10) * 0.7) * L.stars * clamp01((560 - y) / 200 + 0.4);
            g.fillStyle = 'rgba(' + (psr(i + 11) < 0.2 ? '255,230,200' : '225,235,255') + ',' + a + ')';
            g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          }
        }
        // the moon: high right of centre, a waxing crescent with earthshine
        { const mx = 250, my = 130, R = 24;                       // top-left over the sail: clear of the card, balancing the Burj
          g.save(); g.globalCompositeOperation = 'lighter';
          g.fillStyle = rg(g, mx, my, R * 0.6, R * 5, [[0, 'rgba(255,240,210,0.16)'], [1, 'rgba(255,240,210,0)']]); g.fillRect(mx - R * 5, my - R * 5, R * 10, R * 10);
          g.restore();
          // the crescent is painted on a scratch canvas (disc minus bite) so the
          // dark side stays SKY, with only a breath of earthshine on it
          const mc = doc.createElement('canvas'); mc.width = mc.height = Math.ceil(R * 2.4 * 4);
          const q = mc.getContext('2d'); q.setTransform(4, 0, 0, 4, 0, 0); const c = R * 1.2;
          q.fillStyle = lg(q, c - R, c, c + R, c, [[0, '#fff6dc'], [1, '#e8d8a8']]); q.beginPath(); q.arc(c, c, R, 0, TAU); q.fill();
          q.globalCompositeOperation = 'destination-out'; q.beginPath(); q.arc(c - R * 0.55, c - R * 0.08, R * 0.9, 0, TAU); q.fill();
          q.globalCompositeOperation = 'source-over'; q.fillStyle = 'rgba(190,200,240,0.10)'; q.beginPath(); q.arc(c, c, R, 0, TAU); q.fill();   // earthshine
          g.drawImage(mc, mx - c, my - c, c * 2, c * 2); }
      }

      // ── far haze skyline (two depth layers, silhouettes only) ──
      function paintFar(g, L){
        for (let layer = 0; layer < 2; layer++){
          const k = layer ? 0.5 : 0.25, col = mixc(L.sky[3], L.cool, layer ? 0.55 : 0.3), n = layer ? 34 : 26;
          g.fillStyle = rgb(col, layer ? 0.55 : 0.34);
          for (let i = 0; i < n; i++){
            const x = i * (DW / n) + (psr(i + layer * 100) - 0.5) * 30, w = 20 + psr(i + 40 + layer * 100) * 50, h = (layer ? 40 : 60) + psr(i + 80 + layer * 100) * (layer ? 90 : 150);
            g.fillRect(x, HZ - h, w, h + 2);
            if (psr(i + 120 + layer * 100) < 0.3){ g.beginPath(); g.moveTo(x + w * 0.5 - 2, HZ - h); g.lineTo(x + w * 0.5, HZ - h - 28); g.lineTo(x + w * 0.5 + 2, HZ - h); g.fill(); }
          }
          void k;
        }
      }

      // ── generic glass tower ──
      // Two lit faces (west warm / east cool), floor spandrels, mullions, a
      // podium with shopfronts, crowns: 'flat' | 'spire' | 'crown' | 'slant' | 'twin'
      const TOWERS = [];
      function tower(o){ TOWERS.push(o); return o; }
      function paintTower(g, L, T){
        const { x, w, h, d = w * 0.42, crown = 'flat', tone = 0.5, pal = 0 } = T, base = HZ - (T.lift || 0), top = base - h;
        const GLASS = [[120, 150, 190], [70, 95, 150], [70, 130, 150], [160, 125, 95], [150, 158, 175], [110, 100, 140], [50, 60, 95], [200, 196, 190]][pal];
        const glass = mixc(GLASS, L.glass, 0.35);
        const warm = mixc(glass, L.warm, 0.55 * (1 - 0.7 * L.night) * tone), cool = mixc(glass, L.cool, 0.45), dark = mixc(cool, [8, 10, 24], 0.55 + 0.25 * L.night);
        // the west (left) face is lit by the sun, the east return is in shade
        g.fillStyle = lg(g, x, top, x, base, [[0, rgb(mixc(warm, L.sky[1], 0.35))], [0.6, rgb(warm)], [1, rgb(mixc(warm, [20, 20, 40], 0.5))]]);
        g.fillRect(x, top, w, h);
        g.fillStyle = lg(g, x + w, top, x + w + d, top, [[0, rgb(dark)], [1, rgb(mixc(dark, [0, 0, 0], 0.35))]]);
        g.fillRect(x + w, top, d, h);
        // glass sheen: a soft diagonal band
        g.save(); g.beginPath(); g.rect(x, top, w, h); g.clip();
        g.fillStyle = lg(g, x, top, x + w, base, [[0, 'rgba(255,255,255,0)'], [0.35, 'rgba(255,255,255,0.10)'], [0.5, 'rgba(255,255,255,0.22)'], [0.62, 'rgba(255,255,255,0.06)'], [1, 'rgba(255,255,255,0)']]);
        g.fillRect(x, top, w, h);
        g.restore();
        // floor spandrels + mullions
        const fl = T.floor || 9;
        g.fillStyle = rgb(mixc(dark, [0, 0, 0], 0.3), 0.55);
        for (let y = top + fl; y < base - 4; y += fl) g.fillRect(x, y, w + d, 1.2);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        for (let mx = x + 6; mx < x + w - 2; mx += 7) g.fillRect(mx, top, 0.8, h);
        // lit windows: warm dots on a grid, denser at night, random rows off
        const lit = L.lights;
        for (let y = top + fl * 1.5; y < base - 14; y += fl){
          for (let wx = x + 3; wx < x + w + d - 4; wx += 7){
            const s = psr((wx * 31 + y * 17 + T.seed) | 0);
            if (s < 0.28 + 0.45 * lit){
              const onEast = wx > x + w, cw = T.winCool ? 0.6 : 0.2, c = s < 0.12 ? [255, 230, 190] : (s < 0.12 + cw ? [200, 225, 255] : [255, 200, 130]);
              g.fillStyle = rgb(c, (0.25 + 0.65 * lit) * (onEast ? 0.7 : 1) * (0.5 + 0.5 * psr(wx + y)));
              g.fillRect(wx, y, 3.6, fl * 0.42);
            }
          }
        }
        // the podium
        const ph = T.podium || 0;
        if (ph){
          g.fillStyle = rgb(mixc(dark, L.warm, 0.12)); g.fillRect(x - 10, base - ph, w + d + 20, ph);
          for (let sx = x - 6; sx < x + w + d + 8; sx += 9){ g.fillStyle = rgb([255, 205, 140], 0.35 + 0.55 * lit); g.fillRect(sx, base - ph + 5, 5, ph - 9); }
        }
        // the crown
        g.fillStyle = rgb(mixc(warm, [255, 255, 255], 0.25));
        if (crown === 'spire'){ g.beginPath(); g.moveTo(x + w * 0.5 - 4, top); g.lineTo(x + w * 0.5, top - h * 0.16); g.lineTo(x + w * 0.5 + 4, top); g.fill();
          g.fillStyle = rgb(dark); g.fillRect(x + w * 0.5 - 1, top - h * 0.24, 2, h * 0.08); }
        else if (crown === 'crown'){ for (let i = 0; i < 5; i++){ const cx = x + (i + 0.5) * w / 5; g.fillRect(cx - 1.5, top - 14 - (i === 2 ? 10 : 0), 3, 14 + (i === 2 ? 10 : 0)); } g.fillRect(x, top - 4, w, 4); }
        else if (crown === 'slant'){ g.fillStyle = rgb(mixc(warm, L.sky[1], 0.2)); g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, top - w * 0.55); g.lineTo(x + w + d, top - w * 0.55 + d * 0.2); g.lineTo(x + w + d, top); g.lineTo(x + w, top); g.fill(); }
        else if (crown === 'twin'){ g.fillStyle = rgb(mixc(warm, [255, 255, 255], 0.2)); g.beginPath(); g.moveTo(x, top); g.lineTo(x + w * 0.62, top - w * 0.9); g.lineTo(x + w, top); g.fill();   // Emirates-style triangular top
          g.fillStyle = rgb(dark); g.beginPath(); g.moveTo(x + w, top); g.lineTo(x + w * 0.62, top - w * 0.9); g.lineTo(x + w + d, top - w * 0.9 + d * 0.5); g.lineTo(x + w + d, top); g.fill(); }
        else { g.fillRect(x - 1, top - 3, w + d + 2, 3); g.fillStyle = rgb(dark); g.fillRect(x + w * 0.3, top - 12, 2.5, 9); }
        // roof beacon spot (lit per frame)
        T._beacon = [x + w * 0.5, top - (crown === 'spire' ? h * 0.24 : crown === 'twin' ? w * 0.9 : 12)];
      }

      // ── the BURJ KHALIFA ──
      // A core with three wings stepping back in a spiral. In elevation, each
      // side shows a stack of TIERS: shafts of decreasing width whose tops rise
      // toward the core, capped by rounded shoulders. Silver-blue banded glass;
      // the sun climbs the west edge, the east faces sit in cool shadow.
      const BURJ = { x: BX, base: HZ - 2, top: 58, coreHW: 8 };
      (function buildBurj(){
        const bodyH = 512;                                            // the glass body; the spire adds the rest
        // setbacks as [half-width from the axis, top as a fraction of the body],
        // outermost first. The east wing's steps sit a little lower than the
        // west's, so the tiers read as a spiral, not a symmetric ziggurat.
        const W = [[64, .27], [57, .36], [50, .44], [44, .51], [38, .58], [33, .64], [28, .70], [24, .76], [20, .81], [16, .86], [13, .90], [11, .94], [9, .97]];
        const E = [[60, .24], [53, .33], [47, .41], [41, .48], [36, .55], [31, .61], [26, .67], [22, .73], [18, .79], [15, .84], [12, .89], [10, .93], [8, .965]];
        BURJ.west = W.map(([hw, k]) => ({ hw, top: BURJ.base - bodyH * k }));
        BURJ.east = E.map(([hw, k]) => ({ hw, top: BURJ.base - bodyH * k }));
        BURJ.bodyTop = BURJ.base - bodyH; BURJ.spireTop = BURJ.top;
      })();
      // the silhouette: a stepped outline, one closed path
      function burjBody(g){
        const { west: Wn, east: En, base, bodyTop, coreHW } = BURJ;
        g.moveTo(BX - Wn[0].hw, base);
        for (let i = 0; i < Wn.length; i++){ g.lineTo(BX - Wn[i].hw, Wn[i].top); g.lineTo(BX - (i + 1 < Wn.length ? Wn[i + 1].hw : coreHW), Wn[i].top); }
        g.lineTo(BX - coreHW, bodyTop); g.lineTo(BX + coreHW, bodyTop);
        for (let i = En.length - 1; i >= 0; i--){ g.lineTo(BX + (i + 1 < En.length ? En[i + 1].hw : coreHW), En[i].top); g.lineTo(BX + En[i].hw, En[i].top); }
        g.lineTo(BX + En[0].hw, base); g.closePath();
      }
      function burjSpire(g){
        const bt = BURJ.bodyTop, st = BURJ.spireTop;
        const secs = [[11, 0, .3], [7.5, .3, .55], [4.8, .55, .76], [2.6, .76, .92], [1.2, .92, 1]];
        for (const [w, k0, k1] of secs) g.rect(BX - w / 2, bt - (bt - st) * k1, w, (bt - st) * (k1 - k0) + 1);
        g.rect(BX - 0.6, st - 26, 1.2, 28);
      }
      function burjPath(g){ g.beginPath(); burjBody(g); burjSpire(g); }
      function paintBurj(g, L){
        const { base, bodyTop, spireTop, west: Wn, east: En } = BURJ, night = L.night;
        const silver = mixc([178, 190, 208], L.glass, 0.22);
        const warm = mixc(silver, L.warm, 0.42 * (1 - 0.8 * night)), bright = mixc(silver, [255, 255, 255], 0.14);
        const cool = mixc(silver, L.cool, 0.42), shade = mixc(cool, [8, 12, 30], 0.42 + 0.28 * night);
        const x0 = BX - Wn[0].hw, x1 = BX + En[0].hw;
        // ONE fill for the whole mass: the sun on the west facets, the core's
        // west-facing lobe catching the brightest light, the east in blue shade
        g.beginPath(); burjBody(g);
        g.fillStyle = lg(g, x0, 0, x1, 0, [[0, rgb(warm)], [0.36, rgb(mixc(warm, bright, 0.5))], [0.47, rgb(bright)], [0.53, rgb(silver)], [0.62, rgb(cool)], [1, rgb(shade)]]);
        g.fill();
        g.save(); g.beginPath(); burjBody(g); g.clip();
        // sky at the top, haze at the foot
        g.fillStyle = lg(g, 0, spireTop, 0, base, [[0, rgb(L.sky[0], 0.22)], [0.45, rgb(L.sky[1], 0.0)], [1, rgb(mixc(L.haze, [10, 12, 30], 0.5), 0.5)]]);
        g.fillRect(x0, spireTop, x1 - x0, base - spireTop);
        // the setbacks: a shadow under every step, a bright lip on it, a seam down each lobe
        for (const side of [Wn, En]){
          const sgn = side === Wn ? -1 : 1;
          for (let i = 0; i < side.length; i++){
            const st = side[i], inner = i + 1 < side.length ? side[i + 1].hw : BURJ.coreHW;
            const xa = Math.min(BX + sgn * st.hw, BX + sgn * inner), xb = Math.max(BX + sgn * st.hw, BX + sgn * inner);
            g.fillStyle = 'rgba(0,4,20,0.35)'; g.fillRect(xa, st.top, xb - xa, 4);                   // the terrace shadow
            g.fillStyle = 'rgba(255,255,255,' + (side === Wn ? 0.55 : 0.30) + ')'; g.fillRect(xa - 0.5, st.top - 1.2, xb - xa + 1, 1.4);   // the lip
            const sx = BX + sgn * inner;                                                              // the seam where the lobe meets the next
            g.fillStyle = side === Wn ? 'rgba(255,255,255,0.20)' : 'rgba(0,4,20,0.30)'; g.fillRect(sx - (side === Wn ? 1.2 : 0), st.top, 1.2, base - st.top);
            g.fillStyle = side === Wn ? 'rgba(0,4,20,0.22)' : 'rgba(255,255,255,0.10)'; g.fillRect(sx + (side === Wn ? 0 : -1.2), st.top, 1.2, base - st.top);
          }
        }
        // spandrels and fins
        g.fillStyle = 'rgba(8,12,30,0.42)'; for (let y = bodyTop + 5; y < base; y += 5) g.fillRect(x0, y, x1 - x0, 1);
        g.fillStyle = 'rgba(255,255,255,' + (0.09 + 0.05 * (1 - night)) + ')'; for (let fx = x0 + 2; fx < x1; fx += 4) g.fillRect(fx, bodyTop, 0.6, base - bodyTop);
        // the sunset climbing the west edge of every lobe
        if (night < 0.95){ g.save(); g.globalCompositeOperation = 'lighter';
          for (const st of Wn){ g.fillStyle = lgc('burjrim' + st.hw, g, BX - st.hw, 0, BX - st.hw + 7, 0, [[0, rgb(L.warm, 0.55 * (1 - night))], [1, rgb(L.warm, 0)]]); g.fillRect(BX - st.hw, st.top, 7, base - st.top); }
          g.restore(); }
        // lit cells at night, sparse between the bands
        if (L.lights > 0.4){
          const a = (L.lights - 0.4) / 0.6;
          for (let y = bodyTop + 6; y < base - 22; y += 5) for (let wx = x0 + 1; wx < x1 - 2; wx += 4){
            const sd = psr((wx * 13 + y * 7 + 3) | 0);
            if (sd < 0.20){ g.fillStyle = rgb(sd < 0.06 ? [200, 225, 255] : [255, 222, 175], 0.75 * a * (0.5 + 0.5 * psr(wx * y))); g.fillRect(wx + 0.6, y + 1, 2.4, 2.2); }
          }
        }
        g.restore();
        // the spire: telescoping, silver, a warm west edge, banded
        g.save(); g.beginPath(); burjSpire(g); g.clip();
        g.fillStyle = lg(g, BX - 6, 0, BX + 6, 0, [[0, rgb(mixc(silver, L.warm, 0.45 * (1 - night)))], [0.45, rgb(mixc(silver, [255, 255, 255], 0.35))], [1, rgb(shade)]]);
        g.fillRect(BX - 8, spireTop - 30, 16, bodyTop - spireTop + 32);
        g.fillStyle = 'rgba(8,12,30,0.35)'; for (let y = spireTop; y < bodyTop; y += 6) g.fillRect(BX - 8, y, 16, 0.8);
        g.restore();
        g.fillStyle = rgb(mixc(silver, [255, 255, 255], 0.4)); g.fillRect(BX - BURJ.coreHW - 2, bodyTop - 2.5, BURJ.coreHW * 2 + 4, 3);   // the sky-terrace ring
        BURJ.beacons = [[BX, spireTop - 26], [BX, bodyTop - (bodyTop - spireTop) * 0.55], [BX, bodyTop - (bodyTop - spireTop) * 0.3 + 4]];
      }

      // ── the BURJ AL ARAB: the sail on its island ──
      const ALARAB = { x: 175, base: HZ + 2, h: 250 };
      function paintAlArab(g, L){
        const { x, base, h } = ALARAB, night = L.night, top = base - h;
        // the island: a round pad with a lit rim, and the causeway to the shore
        g.fillStyle = rgb(mixc([40, 44, 70], L.warm, 0.15)); g.beginPath(); g.ellipse(x, base + 2, 92, 9, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc([60, 66, 96], L.warm, 0.2)); g.fillRect(x + 60, base - 6, 260, 5);
        // the mast (the sail's leading edge), a tall pole leaning into the sky
        g.strokeStyle = rgb(mixc([240, 242, 248], L.warm, 0.35 * (1 - night))); g.lineWidth = 3.2;
        g.beginPath(); g.moveTo(x - 46, base); g.lineTo(x - 14, top - 26); g.stroke();
        // the sail: a taut curved plane, white, lit warm on the sun side
        const sail = () => { g.beginPath(); g.moveTo(x - 44, base); g.quadraticCurveTo(x - 30, base - h * 0.55, x - 14, top - 22); g.quadraticCurveTo(x + 24, top + 40, x + 44, base - 70); g.quadraticCurveTo(x + 48, base - 30, x + 42, base); g.closePath(); };
        sail();
        g.fillStyle = lg(g, x - 44, 0, x + 44, 0, [[0, rgb(mixc([246, 246, 250], L.warm, 0.4 * (1 - night)))], [0.55, rgb(mixc([232, 236, 244], L.cool, 0.15))], [1, rgb(mixc([200, 208, 226], L.cool, 0.35))]]);
        g.fill();
        // the glowing atrium wall (the Teflon fabric face), lit from inside
        g.save(); sail(); g.clip();
        const wash = ALARAB.wash || [255, 200, 120];
        g.fillStyle = lg(g, x - 22, top, x + 22, base, [[0, rgb(wash, 0.10 + 0.5 * night)], [0.5, rgb(mixc(wash, [255, 255, 255], 0.4), 0.12 + 0.45 * night)], [1, rgb(wash, 0.05 + 0.3 * night)]]);
        g.beginPath(); g.moveTo(x - 22, base); g.quadraticCurveTo(x - 16, base - h * 0.5, x - 4, top - 4); g.lineTo(x + 22, top + 60); g.quadraticCurveTo(x + 26, base - 60, x + 24, base); g.closePath(); g.fill();
        // the exoskeleton: diagonal ribs, and floor lines
        g.strokeStyle = 'rgba(40,50,80,0.28)'; g.lineWidth = 1;
        for (let i = 0; i < 10; i++){ const yy = base - 20 - i * 22; g.beginPath(); g.moveTo(x - 44, yy); g.lineTo(x + 46, yy - 10); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.4;
        for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(x - 40 + i * 6, base); g.quadraticCurveTo(x - 28 + i * 8, base - h * 0.5, x + 10 + i * 8, top + 30 - i * 6); g.stroke(); }
        g.restore();
        // the helipad disc out to the left, on its arm; Al Muntaha's box to the right
        g.fillStyle = rgb(mixc([215, 220, 232], L.warm, 0.3)); g.fillRect(x - 40, top + 36, 24, 4);
        g.beginPath(); g.ellipse(x - 40, top + 34, 17, 4.5, 0, 0, TAU); g.fill();
        g.fillStyle = rgb([255, 240, 200], 0.7); g.beginPath(); g.ellipse(x - 40, top + 34, 10, 2.6, 0, 0, TAU); g.fill();
        g.strokeStyle = rgb(mixc([215, 220, 232], L.warm, 0.3)); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 40, top + 38); g.lineTo(x - 28, top + 60); g.stroke();   // its brace
        g.fillStyle = rgb(mixc([225, 228, 238], L.cool, 0.2)); g.fillRect(x + 20, top + 62, 34, 12);
        g.fillStyle = rgb([255, 215, 150], 0.55 + 0.4 * night); for (let i = 0; i < 6; i++) g.fillRect(x + 23 + i * 5.2, top + 65, 3, 5);
        ALARAB.top = top; ALARAB.helipad = [x - 40, top + 32];
      }
      function paintJBH(g, L){
        const { x, base } = ALARAB, night = L.night;
        // the breaking-wave hotel on the shore beside the sail
        g.fillStyle = rgb(mixc([170, 190, 218], L.cool, 0.45));
        g.beginPath(); g.moveTo(x + 74, base - 4); g.quadraticCurveTo(x + 92, base - 122, x + 160, base - 120); g.quadraticCurveTo(x + 230, base - 118, x + 262, base - 40); g.lineTo(x + 262, base - 4); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; for (let i = 0; i < 12; i++){ const yy = base - 12 - i * 9; g.fillRect(x + 90 + i * 3, yy, 160 - i * 9, 1.3); }
        g.fillStyle = rgb([255, 220, 170], 0.3 + 0.55 * night); for (let i = 0; i < 40; i++){ const s = psr(i + 500); g.fillRect(x + 96 + s * 150, base - 16 - psr(i + 501) * 90, 2.6, 3); }
      }

      // ── AIN DUBAI: the wheel on Bluewaters ──
      const AIN = { x: 470, y: HZ - 132, r: 112 };
      function paintAinStatic(g, L){
        // the island podium + the two A-frame legs
        g.fillStyle = rgb(mixc([46, 52, 80], L.warm, 0.18)); g.fillRect(AIN.x - 150, HZ - 12, 300, 12);
        g.strokeStyle = rgb(mixc([200, 206, 222], L.cool, 0.3)); g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(AIN.x - 62, HZ - 10); g.lineTo(AIN.x, AIN.y); g.lineTo(AIN.x + 62, HZ - 10); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(AIN.x - 40, HZ - 10); g.lineTo(AIN.x, AIN.y); g.lineTo(AIN.x + 40, HZ - 10); g.stroke();
        // Bluewaters low-rise at its feet
        for (let i = 0; i < 9; i++){ const bx = AIN.x - 140 + i * 32, bh = 26 + psr(i + 700) * 30; g.fillStyle = rgb(mixc([120, 110, 120], L.cool, 0.4)); g.fillRect(bx, HZ - bh, 26, bh); g.fillStyle = rgb([255, 215, 160], 0.5 + 0.45 * L.night); for (let k = 0; k < 4; k++) g.fillRect(bx + 3 + k * 6, HZ - bh + 6, 3, 4); }
      }

      // ── the MUSEUM OF THE FUTURE: the torus on its mound ──
      const MUSEUM = { x: 905, y: HZ - 82, rx: 46, ry: 60 };
      function paintMuseum(g, L){
        const { x, y, rx, ry } = MUSEUM, night = L.night;
        g.fillStyle = rgb(mixc([60, 100, 70], L.cool, 0.35)); g.beginPath(); g.ellipse(x, HZ - 2, 86, 24, 0, Math.PI, TAU); g.fill();   // the green mound
        g.fillStyle = lg(g, x - rx, y - ry, x + rx, y + ry, [[0, rgb(mixc([190, 200, 215], L.warm, 0.35 * (1 - night)))], [0.5, rgb(mixc([160, 172, 195], L.cool, 0.25))], [1, rgb(mixc([90, 100, 130], L.cool, 0.4))]]);
        const ring = () => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.ellipse(x + 2, y + 2, rx * 0.42, ry * 0.5, 0, 0, TAU); };
        ring(); g.fill('evenodd');                                                                     // the void is a real hole
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x + 2, y + 2, rx * 0.42, ry * 0.5, 0, 0, TAU); g.stroke();
        // calligraphy: flowing strokes of light across the shell
        g.save(); ring(); g.clip('evenodd');
        g.strokeStyle = rgb([255, 225, 170], 0.35 + 0.6 * night); g.lineWidth = 1.6; g.lineCap = 'round';
        for (let i = 0; i < 7; i++){ const yy = y - ry + 12 + i * 15, ph = psr(i + 800) * 6; g.beginPath(); for (let k = 0; k <= 12; k++){ const xx = x - rx + k * (rx / 6), sway = Math.sin(k * 0.9 + ph) * 3.5; k ? g.lineTo(xx, yy + sway) : g.moveTo(xx, yy + sway); } g.stroke(); }
        g.restore();
      }

      // ── the DUBAI FRAME far right ──
      const FRAME = { x: 1548, w: 62, h: 150 };
      function paintFrame(g, L){
        const { x, w, h } = FRAME, base = HZ - 4, gold = mixc([235, 190, 100], L.warm, 0.3), night = L.night;
        g.fillStyle = lg(g, x, base - h, x, base, [[0, rgb(mixc(gold, [255, 255, 255], 0.25))], [1, rgb(mixc(gold, [60, 40, 20], 0.4))]]);
        g.fillRect(x, base - h, 9, h); g.fillRect(x + w - 9, base - h, 9, h); g.fillRect(x, base - h, w, 8);
        g.fillStyle = rgb(mixc(gold, [255, 255, 255], 0.5), 0.35 + 0.5 * night); for (let y = base - h + 12; y < base; y += 7){ g.fillRect(x + 2, y, 5, 3); g.fillRect(x + w - 7, y, 5, 3); }
        g.fillStyle = rgb(mixc([160, 200, 240], L.cool, 0.3), 0.55); g.fillRect(x + 9, base - h + 8, w - 18, 7);   // the glass bridge
      }

      // ── the shore: promenade, palms, the SZR road, the fountain lake ──
      const PALMS = [];
      const LAKE = { x0: 1120, x1: 1470, y: HZ };
      function paintShore(g, L){
        const night = L.night;
        // the promenade strip along the whole waterline
        g.fillStyle = rgb(mixc([54, 56, 84], L.warm, 0.14)); g.fillRect(-400, HZ - 5, DW + 800, 7);
        g.fillStyle = rgb([255, 215, 150], 0.35 + 0.5 * night); for (let x = -380; x < DW + 400; x += 26) g.fillRect(x, HZ - 8, 2, 3);   // promenade lamps
        // the road behind the promenade (traffic runs on it per frame)
        g.fillStyle = rgb(mixc([30, 32, 52], L.warm, 0.08)); g.fillRect(-400, HZ - 16, DW + 800, 8);
        // the fountain lake in front of the Burj: a pool of the sky
        const lcx = (LAKE.x0 + LAKE.x1) / 2, lrx = (LAKE.x1 - LAKE.x0) / 2;
        g.fillStyle = rgb(mixc([60, 62, 90], L.warm, 0.18)); g.beginPath(); g.ellipse(lcx, HZ - 8, lrx + 8, 17, 0, 0, TAU); g.fill();          // the stone rim
        g.fillStyle = lg(g, 0, HZ - 24, 0, HZ + 4, [[0, rgb(mixc(L.sky[3], L.water[0], 0.55))], [1, rgb(mixc(L.water[1], L.sky[4], 0.25))]]);
        g.beginPath(); g.ellipse(lcx, HZ - 8, lrx, 13, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(L.glow, [255, 255, 255], 0.4), 0.18 + 0.1 * (1 - night)); g.beginPath(); g.ellipse(lcx + 40, HZ - 12, lrx * 0.5, 4, 0, 0, TAU); g.fill();   // the sky on it
        g.fillStyle = rgb([255, 215, 150], 0.45 + 0.5 * night); for (let i = 0; i < 18; i++){ const a = Math.PI + i / 17 * Math.PI; g.fillRect(lcx + Math.cos(a) * (lrx + 4) - 1, HZ - 8 + Math.sin(a) * 15 - 1, 2, 2); }   // rim lamps
      }
      function paintPalm(g, L, x, y, s, lean){
        const night = L.night, trunk = rgb(mixc([60, 44, 34], L.warm, 0.25 * (1 - night)));
        g.strokeStyle = trunk; g.lineWidth = 3 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 6 * s, y - 22 * s, x + lean * 10 * s, y - 40 * s); g.stroke();
        const tx = x + lean * 10 * s, ty = y - 40 * s;
        g.strokeStyle = rgb(mixc([40, 90, 60], L.warm, 0.2 * (1 - night))); g.lineWidth = 2 * s;
        for (let i = 0; i < 7; i++){ const a = -Math.PI * 0.95 + i * (Math.PI * 0.9 / 6), len = (16 + psr(i + x) * 8) * s; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 4 * s, tx + Math.cos(a) * len, ty + Math.sin(a) * len + 10 * s); g.stroke(); }
      }

      // ── the composition ──
      function buildCity(){
        TOWERS.length = 0; PALMS.length = 0;
        // Marina cluster (behind the wheel and left of centre), tall and close
        tower({ x: 300, w: 30, h: 250, crown: 'spire', pal: 1, seed: 1, podium: 14, tone: 0.8, floor: 8 });
        tower({ x: 345, w: 40, h: 320, crown: 'flat', pal: 6, seed: 2, tone: 0.9, floor: 10, winCool: 1 });
        tower({ x: 405, w: 26, h: 290, crown: 'crown', pal: 4, seed: 3, floor: 7 });
        tower({ x: 540, w: 34, h: 340, crown: 'flat', pal: 7, seed: 4, podium: 12, floor: 9 });
        tower({ x: 590, w: 44, h: 405, crown: 'slant', pal: 2, seed: 5, tone: 0.7, floor: 11, winCool: 1 });   // the tallest of the Marina
        tower({ x: 650, w: 30, h: 300, crown: 'spire', pal: 0, seed: 6, floor: 8 });
        tower({ x: 700, w: 36, h: 250, crown: 'flat', pal: 3, seed: 7, podium: 16, floor: 9 });
        // downtown middle: low, so the card floats over calm sky
        tower({ x: 760, w: 34, h: 232, crown: 'twin', pal: 4, seed: 8, floor: 8 });                     // Emirates Towers
        tower({ x: 812, w: 30, h: 202, crown: 'twin', pal: 4, seed: 9, floor: 8 });
        tower({ x: 968, w: 40, h: 205, crown: 'flat', pal: 6, seed: 10, podium: 12, floor: 10, winCool: 1 });
        tower({ x: 1028, w: 30, h: 262, crown: 'crown', pal: 5, seed: 11, floor: 7 });
        tower({ x: 1072, w: 26, h: 226, crown: 'flat', pal: 0, seed: 12, floor: 9 });
        // downtown at the Burj's feet: the Address towers, the Opera, Sky View
        tower({ x: 1130, w: 44, h: 330, crown: 'crown', pal: 3, seed: 13, tone: 0.9, floor: 9 });        // Address Downtown
        tower({ x: 1188, w: 30, h: 262, crown: 'flat', pal: 6, seed: 14, floor: 8, winCool: 1 });
        tower({ x: 1380, w: 34, h: 300, crown: 'flat', pal: 1, seed: 15, floor: 9 });
        tower({ x: 1425, w: 34, h: 300, crown: 'flat', pal: 1, seed: 16, floor: 9 });                    // Sky View pair (bridge painted after)
        tower({ x: 1482, w: 26, h: 220, crown: 'spire', pal: 7, seed: 17, floor: 7 });
        tower({ x: 1235, w: 28, h: 150, crown: 'flat', pal: 3, seed: 18, podium: 20, floor: 10 });      // the Dubai Mall front
        for (let i = 0; i < 26; i++){ const x = -60 + i * 68 + psr(i + 900) * 30; if (x < 300 || (x > LAKE.x0 - 20 && x < LAKE.x1 + 20)) continue; PALMS.push({ x, s: 0.8 + psr(i + 901) * 0.5, lean: psr(i + 902) < 0.5 ? -1 : 1 }); }
      }
      function paintCity(g, L){
        paintSky(g, L);
        paintFar(g, L);
        // depth order: far-left island, Marina, wheel behind its towers? — the
        // wheel stands in FRONT of the Marina (it is on the water), so: towers,
        // then the wheel's frame, then downtown, the Burj, then the shore
        const byX = TOWERS.slice().sort((a, b) => a.x - b.x);
        paintJBH(g, L);
        for (const T of byX) if (T.x < 720) paintTower(g, L, T);
        paintAlArab(g, L);
        paintAinStatic(g, L);
        for (const T of byX) if (T.x >= 720 && T.x < 1100) paintTower(g, L, T);
        paintMuseum(g, L);
        for (const T of byX) if (T.x >= 1100 && T.x !== 1235) paintTower(g, L, T);
        // the Sky View bridge between its two towers
        g.fillStyle = rgb(mixc([200, 215, 235], L.cool, 0.3)); g.fillRect(1414, HZ - 300 + 6, 14, 22);
        paintBurj(g, L);
        for (const T of byX) if (T.x === 1235) paintTower(g, L, T);
        paintFrame(g, L);
        paintShore(g, L);
        for (const P of PALMS) paintPalm(g, L, P.x, HZ - 6, P.s, P.lean);
        // haze at the horizon over everything far
        g.fillStyle = lg(g, 0, HZ - 260, 0, HZ, [[0, rgb(L.haze, 0)], [1, rgb(L.haze, L.hazeA * 0.55)]]);
        g.fillRect(-400, HZ - 260, DW + 800, 260);
      }

      // ── the water: a rippled mirror of the city (⅛-res layer) + the deep ──
      function paintWater(g, L){
        g.fillStyle = lg(g, 0, HZ, 0, DH, [[0, rgb(L.water[0])], [0.4, rgb(L.water[1])], [1, rgb(L.water[2])]]);
        g.fillRect(-400, HZ, DW + 800, DH - HZ + 400);
      }
      function buildRefl(L){
        const g = reflL.cx, d = reflL.dpr;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, reflL.cv.width, reflL.cv.height); g.restore();
        // the city mirrored around the waterline, sliced with a horizontal wobble
        const src = cityL.cv, sd = cityL.dpr, hzS = OY + HZ * S;
        const slice = 3 * S, depth = (H - hzS);
        for (let y = 0; y < depth; y += slice){
          const k = y / depth, wob = Math.sin(y * 0.11 + 1.7) * 3.5 * S * (0.3 + k) + Math.sin(y * 0.031) * 2 * S;
          const srcY = hzS - y * 0.92 - slice;                    // the mirror is compressed a little
          g.globalAlpha = 0.72 * (1 - k * 0.75);
          g.drawImage(src, 0, Math.max(0, srcY * sd), src.width, slice * sd, wob, hzS + y, W, slice + 0.5);
        }
        g.globalAlpha = 1;
        // the sun's path on the water
        g.save(); g.globalCompositeOperation = 'lighter';
        const sx = OX + SUNX * S;
        g.beginPath(); g.moveTo(sx - 50 * S, hzS); g.lineTo(sx + 50 * S, hzS); g.lineTo(sx + 300 * S, H); g.lineTo(sx - 300 * S, H); g.closePath(); g.clip();
        g.fillStyle = lg(g, sx - 300 * S, 0, sx + 300 * S, 0, [[0, rgb(L.glow, 0)], [0.5, rgb(L.glow, 0.55 * L.sunPath)], [1, rgb(L.glow, 0)]]);
        g.fillRect(sx - 300 * S, hzS, 600 * S, H - hzS);
        g.fillStyle = lg(g, 0, hzS, 0, H, [[0, rgb(L.water[2], 0)], [0.35, rgb(L.water[2], 0.35)], [1, rgb(L.water[2], 0.7)]]);   // fading away with depth
        g.globalCompositeOperation = 'source-over'; g.fillRect(sx - 300 * S, hzS, 600 * S, H - hzS);
        g.restore();
      }

      // ── build / resize ──
      function repaint(L){
        const g = cityL.cx;
        g.save(); g.setTransform(cityL.dpr, 0, 0, cityL.dpr, 0, 0); g.clearRect(0, 0, cityL.cv.width, cityL.cv.height); g.restore();
        g.save(); g.setTransform(cityL.dpr * S, 0, 0, cityL.dpr * S, cityL.dpr * OX, cityL.dpr * OY);
        paintCity(g, L); paintWater(g, L);
        g.restore();
        buildRefl(L);
        GCACHE = {};
      }
      function repaintIfNeeded(t){
        const L = look(t), key = Math.round(L.ph * 24);          // 24 keys per cycle → a repaint every ~11 s
        LOOK = L;
        if (key !== lookKey){ lookKey = key; repaint(L); PROF.repaints = (PROF.repaints || 0) + 1; }
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // cover-fit, bottom-anchored: the waterline keeps its place, wide windows crop the sides
        S = Math.max(W / DW, H / DH); OX = (W - DW * S) / 2; OY = H - DH * S;
        cityL = makeLayer(W, H, DPR); reflL = makeLayer(W, H, 0.5);
        lookKey = -1; GCACHE = {};
        repaintIfNeeded(lastT);
      }

      // to design coords and back
      const dx = x => OX + x * S, dy = y => OY + y * S;
      const toDesign = (sx, sy) => [(sx - OX) / S, (sy - OY) / S];

      // ═══════════════════════════ THE LIVING CITY ═══════════════════════════
      // (part 2 — in this file below)
      // ── schedules ──
      const SHOW_PERIOD = 150, SHOW_FIRST = 9;                    // the Burj LED show
      const FN_PERIOD = 180, FN_FIRST = 34;                       // the fountain
      const FW_PERIOD = 120, FW_FIRST = 70;                       // fireworks
      let SHOW = null, FOUNTAIN = null, nextShow = SHOW_FIRST, nextFn = FN_FIRST, nextFw = FW_FIRST;
      const FW = [], MFX = [], SHOOTERS = [], DOLPHINS = [], RINGS = [];
      let nextShootAt = 6, wheelBoost = null, ainAng = 0, ainHue = 40, washT0 = -99, washFrom = [255, 200, 120], washTo = [255, 200, 120];

      // ── the fleet ──
      const KINDS = ['dhow', 'yacht', 'abra', 'speed', 'yacht', 'abra'];
      const BOATS = KINDS.map((kind, i) => ({
        kind, x: psr(i + 40) * DW, y: HZ + 16 + psr(i + 41) * 60, dir: psr(i + 42) < 0.5 ? -1 : 1,
        spd: kind === 'speed' ? 34 : kind === 'yacht' ? 14 : kind === 'abra' ? 10 : 8, s: 0.85 + psr(i + 43) * 0.4, blinkUntil: -1, ph: psr(i + 44) * TAU,
      }));
      const BIRDS = [0, 1].map(f => ({ x: -200 - f * 900, y: 250 + f * 120, spd: 26 + f * 8, n: 6 + f, ph: f * 2 }));
      const PLANE = { t0: 18, period: 46, len: 24 };
      const HELI = { t0: 24, period: 80 };
      const CARS = Array.from({ length: 44 }, (_, i) => ({ x: psr(i + 60) * DW, v: (psr(i + 61) < 0.5 ? -1 : 1) * (40 + psr(i + 62) * 70), lane: psr(i + 63) < 0.5 ? 0 : 1 }));
      const TWINKLE = Array.from({ length: 40 }, (_, i) => ({ x: psr(i + 70) * DW, y: psr(i + 71) * 420, ph: psr(i + 72) * TAU, sp: 1 + psr(i + 73) * 2 }));
      const GLINTS = Array.from({ length: 30 }, (_, i) => ({ x: SUNX + (psr(i + 80) - 0.5) * 380 * (0.4 + psr(i + 81)), y: HZ + 6 + psr(i + 82) * 90, ph: psr(i + 83) * TAU }));
      const BURJ_WIN = Array.from({ length: 34 }, (_, i) => ({ y: HZ - 30 - psr(i + 90) * 470, k: psr(i + 91), ph: psr(i + 92) * TAU, sp: 0.4 + psr(i + 93) }));

      // ── triggers ──
      function startShow(t, len){ SHOW = { t0: t, len: len || 16, pal: [[255, 190, 70], [90, 220, 255], [255, 110, 190], [255, 255, 255], [120, 255, 170]][Math.floor(Math.random() * 5)] }; }
      function startFountain(t, len){ FOUNTAIN = { t0: t, len: len || 24, mode: Math.floor(Math.random() * 3) }; }
      function fireworks(t, n, x, y){
        for (let i = 0; i < (n || 1); i++){
          const hue = Math.floor(Math.random() * 360), fx = x !== undefined ? x : rnd(1000, 1500), fy = y !== undefined ? y : rnd(120, 330);
          const sparks = [];
          for (let k = 0; k < 64; k++){ const a = rnd(0, TAU), v = rnd(0.35, 1); sparks.push({ ca: Math.cos(a) * v, sa: Math.sin(a) * v, r: rnd(1, 2.2), life: rnd(1.2, 2) }); }
          FW.push({ x: fx, y: fy, t0: t + i * rnd(0.3, 0.7), hue, sparks, rise: rnd(0.8, 1.1) });
        }
      }
      const spinWheel = t => { wheelBoost = { t0: t }; };
      function washAlArab(t){ washFrom = ALARAB.wash || [255, 200, 120]; washTo = [[255, 150, 170], [140, 200, 255], [160, 240, 200], [255, 210, 120], [200, 160, 255], [255, 240, 220]][Math.floor(Math.random() * 6)]; washT0 = t; }
      const museumRing = t => { MFX.push({ t0: t, hue: (MFX.length * 67 + 200) % 360 }); if (MFX.length > 6) MFX.shift(); };
      const dolphin = (t, x) => { DOLPHINS.push({ x, t0: t, dir: Math.random() < 0.5 ? -1 : 1 }); };

      // ── clicks (design coords) ──
      function onClick(e){
        if (stopped) return;
        if (e.target.closest && e.target.closest(UI_SEL)) return;
        const [mx, my] = toDesign(e.clientX, e.clientY), t = lastT;
        if (Math.abs(mx - BX) < 70 && my > BURJ.top - 20 && my < HZ){ Math.random() < 0.7 ? startShow(t, 14) : fireworks(t, 4); return; }
        for (const b of BOATS) if (Math.abs(mx - b.x) < 44 * b.s && Math.abs(my - b.y) < 30){ b.blinkUntil = t + 2.2; return; }
        if (Math.hypot(mx - AIN.x, my - AIN.y) < AIN.r + 16){ spinWheel(t); return; }
        if (Math.abs(mx - ALARAB.x) < 64 && my > (ALARAB.top || HZ - 250) - 40 && my < HZ){ washAlArab(t); return; }
        if (((mx - MUSEUM.x) / (MUSEUM.rx + 10)) ** 2 + ((my - MUSEUM.y) / (MUSEUM.ry + 10)) ** 2 < 1){ museumRing(t); return; }
        if (mx > LAKE.x0 && mx < LAKE.x1 && Math.abs(my - HZ) < 34){ startFountain(t, 20); return; }
        for (const T of TOWERS){ const d = T.w + (T.d || T.w * 0.42); if (mx > T.x && mx < T.x + d && my > HZ - T.h - 30 && my < HZ){ T.boostUntil = t + 5; return; } }
        if (my > HZ + 8){ dolphin(t, mx); return; }
        if (my < HZ - 200){ fireworks(t, 1, mx, my); return; }
      }

      // ── drawing the living city (design coords) ──
      function drawLiving(g, L, t, dt){
        const night = L.night;
        // schedules
        if (t > nextShow){ nextShow += SHOW_PERIOD; startShow(t, 16); }
        if (t > nextFn){ nextFn += FN_PERIOD; startFountain(t, 24); }
        if (t > nextFw){ nextFw += FW_PERIOD; fireworks(t, 5); }
        if (SHOW && t - SHOW.t0 > SHOW.len) SHOW = null;
        if (FOUNTAIN && t - FOUNTAIN.t0 > FOUNTAIN.len) FOUNTAIN = null;

        drawTwinkle(g, L, t);
        drawShooters(g, L, t);
        drawBirds(g, L, t, dt);
        drawPlane(g, L, t);
        drawAin(g, L, t, dt);
        drawAlArabLive(g, L, t);
        drawMuseumFx(g, t);
        drawBeacons(g, L, t);
        drawTowerBoost(g, L, t);
        drawBurjLive(g, L, t);
        drawTraffic(g, L, t, dt);
        drawGlints(g, L, t);
        drawBoats(g, L, t, dt);
        drawDolphins(g, L, t);
        drawFountain(g, L, t);
        drawFireworks(g, L, t);
        drawHeli(g, L, t);
      }

      function drawTwinkle(g, L, t){
        if (L.stars < 0.05) return;
        g.fillStyle = '#fff';
        for (const s of TWINKLE){ const a = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * L.stars; g.globalAlpha = a; g.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6); }
        g.globalAlpha = 1;
      }
      function drawShooters(g, L, t){
        if (L.stars > 0.5 && t > nextShootAt){ nextShootAt = t + rnd(5, 12); SHOOTERS.push({ x: rnd(150, 1450), y: rnd(30, 300), t0: t, ang: rnd(2.55, 3.05), len: rnd(90, 190) }); }
        for (let i = SHOOTERS.length - 1; i >= 0; i--){
          const s = SHOOTERS[i], k = (t - s.t0) / 0.9; if (k > 1){ SHOOTERS.splice(i, 1); continue; }
          const hx = s.x + Math.cos(s.ang) * s.len * k, hy = s.y - Math.sin(s.ang) * s.len * k, a = Math.sin(k * Math.PI);
          g.strokeStyle = lgc('shoot', g, 0, 0, 1, 0, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,1)']]);
          g.save(); g.translate(hx, hy); g.rotate(-s.ang + Math.PI); g.scale(s.len * 0.45, 1); g.globalAlpha = 0.8 * a; g.lineWidth = 1 / (s.len * 0.45) * 1.6;
          g.beginPath(); g.moveTo(0, 0); g.lineTo(1, 0); g.stroke(); g.restore();
          glow(g, 'white', hx, hy, 7, 0.9 * a); g.globalAlpha = 1;
        }
      }
      function drawBirds(g, L, t, dt){
        const a = 0.75 * (1 - night(L));
        if (a < 0.03) return;
        g.strokeStyle = 'rgba(20,16,30,' + a + ')'; g.lineWidth = 1.4; g.lineCap = 'round';
        for (const F of BIRDS){
          F.x += F.spd * dt; if (F.x > DW + 200){ F.x = -300 - rnd(0, 600); F.y = rnd(200, 420); }
          for (let i = 0; i < F.n; i++){
            const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1, bx = F.x - row * 16, by = F.y + row * side * 7, s = 4 + (i === 0 ? 1.5 : 0);
            const flap = Math.sin(t * 7 + F.ph + i * 0.7) * 2.6;
            g.beginPath(); g.moveTo(bx - s, by - flap); g.quadraticCurveTo(bx, by + 1, bx + s, by - flap); g.stroke();
          }
        }
      }
      const night = L => L.night;
      function drawPlane(g, L, t){
        const e = (t - PLANE.t0) % PLANE.period; if (e < 0 || e > PLANE.len) return;
        const k = e / PLANE.len, x = DW + 120 - k * (DW + 240), y = 110 + Math.sin(k * 3) * 6;
        const bodyC = mixc([225, 228, 236], L.warm, 0.35 * (1 - L.night)), dark = mixc([60, 66, 90], L.cool, 0.2);
        g.save(); g.translate(x, y);
        // contrail
        g.fillStyle = lgc('trail', g, 0, 0, 260, 0, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(20, -1, 260, 3);
        // fuselage, tail, wings (silhouette with a lit top)
        g.fillStyle = rgb(bodyC); g.beginPath(); g.ellipse(0, 0, 30, 3.6, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(dark); g.beginPath(); g.moveTo(-8, 0); g.lineTo(-30, 12); g.lineTo(-16, 12); g.lineTo(6, 1); g.fill();   // wing
        g.beginPath(); g.moveTo(-22, -1); g.lineTo(-30, -12); g.lineTo(-25, -12); g.lineTo(-15, -1); g.fill();                    // fin
        // nav lights: red port, green starboard, a white strobe
        const strobe = (t * 2 % 1) < 0.08;
        glow(g, 'rose', -28, 12, 6, 0.9); glow(g, 'green', -28, -11, 5, 0.8); if (strobe) glow(g, 'white', 2, 0, 10, 1);
        g.restore();
      }
      function drawAin(g, L, t, dt){
        // rotation, with the click spin-up
        let spd = 0.045, hueK = 0;
        if (wheelBoost){ const k = (t - wheelBoost.t0) / 5; if (k > 1) wheelBoost = null; else { const env = Math.sin(k * Math.PI); spd += env * 0.9; hueK = env; } }
        ainAng += spd * dt;
        const { x, y, r } = AIN, nightK = L.night;
        const rimC = hueK > 0 ? 'hsl(' + ((t * 120) % 360) + ',95%,65%)' : rgb(mixc([255, 205, 130], [120, 210, 255], 0.5 + 0.5 * Math.sin(t * 0.25)));
        g.save(); g.translate(x, y); g.rotate(ainAng);
        g.strokeStyle = rgb(mixc([200, 206, 222], L.cool, 0.3), 0.9); g.lineWidth = 1.2;
        for (let i = 0; i < 24; i++){ const a = i / 24 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); }
        g.lineWidth = 4; g.strokeStyle = rgb(mixc([215, 220, 232], L.cool, 0.25)); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.stroke();
        // the rim LEDs and the 48 capsules
        g.strokeStyle = rimC; g.globalAlpha = 0.25 + 0.7 * nightK + 0.5 * hueK; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r + 2.5, 0, TAU); g.stroke(); g.globalAlpha = 1;
        for (let i = 0; i < 48; i++){ const a = i / 48 * TAU, cx = Math.cos(a) * (r + 1), cy = Math.sin(a) * (r + 1);
          g.fillStyle = rgb(mixc([230, 236, 248], L.warm, 0.2)); g.beginPath(); g.arc(cx, cy, 3.2, 0, TAU); g.fill();
          if (nightK > 0.2 || hueK > 0){ g.fillStyle = hueK > 0 ? 'hsl(' + ((i * 7.5 + t * 120) % 360) + ',95%,65%)' : 'rgba(255,220,160,' + (0.5 * nightK) + ')'; g.beginPath(); g.arc(cx, cy, 1.6, 0, TAU); g.fill(); } }
        g.restore();
        g.fillStyle = rgb(mixc([240, 244, 252], L.warm, 0.3)); g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();       // the hub
        glow(g, 'warm', x, y, 16, 0.25 + 0.4 * nightK);
      }
      function drawAlArabLive(g, L, t){
        // the sail's colour wash, live (so a click can change it without a repaint)
        const k = clamp01((t - washT0) / 1.2), col = mixc(washFrom, washTo, smooth(k));
        ALARAB.wash = col;
        const a = 0.06 + 0.34 * L.night + 0.25 * Math.sin(k * Math.PI);
        const { x, base, h } = ALARAB, top = base - h;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
        g.fillStyle = lgc('wash' + (col.map(v => v | 0).join(',')), g, x - 22, 0, x + 26, 0, [[0, rgb(col, 0)], [0.45, rgb(col, 0.6)], [1, rgb(col, 0)]]);
        g.beginPath(); g.moveTo(x - 22, base); g.quadraticCurveTo(x - 16, base - h * 0.5, x - 4, top - 4); g.lineTo(x + 22, top + 60); g.quadraticCurveTo(x + 26, base - 60, x + 24, base); g.closePath(); g.fill();
        g.restore();
        glow(g, 'warm', x, base + 6, 60, 0.12 + 0.2 * L.night);   // its light on the water
      }
      function drawMuseumFx(g, t){
        for (let i = MFX.length - 1; i >= 0; i--){ const m = MFX[i], k = (t - m.t0) / 1.5; if (k > 1){ MFX.splice(i, 1); continue; }
          g.strokeStyle = 'hsla(' + m.hue + ',90%,70%,' + (0.9 * (1 - k)) + ')'; g.lineWidth = 2.5 * (1 - k * 0.6);
          g.beginPath(); g.ellipse(MUSEUM.x, MUSEUM.y, MUSEUM.rx + 8 + k * 70, MUSEUM.ry + 8 + k * 80, 0, 0, TAU); g.stroke(); }
      }
      function drawBeacons(g, L, t){
        // slow red aircraft-warning blinks on every roof, staggered
        for (let i = 0; i < TOWERS.length; i++){ const T = TOWERS[i]; if (!T._beacon) continue; const on = ((t * 0.7 + i * 0.37) % 1) < 0.5; if (on) glow(g, 'rose', T._beacon[0], T._beacon[1], 5, 0.7); }
        if (BURJ.beacons) for (let i = 0; i < BURJ.beacons.length; i++){ const b = BURJ.beacons[i], k = (t * 1.1 + i * 0.3) % 1; if (k < 0.12) glow(g, 'rose', b[0], b[1], 7 - i, 1); }
      }
      function drawTowerBoost(g, L, t){
        for (const T of TOWERS){ if (!T.boostUntil || t > T.boostUntil) continue; const k = (T.boostUntil - t) / 5, a = Math.sin(Math.min(1, (5 - (T.boostUntil - t)) / 0.4) * Math.PI / 2) * (0.35 + 0.25 * Math.sin(t * 9)) * k;
          const d = T.d || T.w * 0.42; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgb([255, 205, 130], a); g.fillRect(T.x, HZ - T.h, T.w + d, T.h); g.restore(); }
      }
      // the Burj alive: its sky-lobby windows switching, the LED show, its light in the lake
      function drawBurjLive(g, L, t){
        const night = L.night;
        // a few windows switching over time
        for (const w of BURJ_WIN){ const on = 0.5 + 0.5 * Math.sin(t * w.sp + w.ph); if (on > 0.6 && night > 0.1){
          const side = w.k < 0.5 ? BURJ.west : BURJ.east, i = Math.floor((w.k * 2 % 1) * side.length), st = side[i];
          if (w.y > st.top + 4){ const inner = i + 1 < side.length ? side[i + 1].hw : BURJ.coreHW, x = BX + (w.k < 0.5 ? -st.hw + (w.k * 97 % 1) * (st.hw - inner) : inner + (w.k * 97 % 1) * (st.hw - inner));
            g.fillStyle = rgb([255, 225, 180], (on - 0.6) * 2 * night); g.fillRect(x, w.y, 2.6, 2.2); } } }
        if (!SHOW) return;
        const e = t - SHOW.t0, len = SHOW.len, fin = e > len - 3.2 ? (e - (len - 3.2)) / 3.2 : 0, env = Math.min(1, e / 0.8) * (fin ? 1 - fin * 0.5 : 1);
        const pal = SHOW.pal, body = BURJ.base - BURJ.spireTop;
        g.save(); burjPath(g); g.clip(); g.globalCompositeOperation = 'lighter';
        // bands racing up the tower
        for (let i = 0; i < 6; i++){
          const sp = 170 + i * 22, y = BURJ.base - ((e * sp + i * 137) % (body + 120)) + 60, hh = 36 + i * 6;
          const c = i % 3 === 0 ? pal : i % 3 === 1 ? [255, 255, 255] : mixc(pal, [120, 200, 255], 0.6);
          g.fillStyle = lgc('band' + i + (c.map(v => v | 0).join(',')), g, 0, -hh, 0, hh, [[0, rgb(c, 0)], [0.5, rgb(c, 0.75)], [1, rgb(c, 0)]]);
          g.save(); g.translate(0, y); g.globalAlpha = env; g.fillRect(BX - 120, -hh, 240, hh * 2); g.restore();
        }
        // shimmer pixels
        g.globalAlpha = env * 0.9;
        for (let i = 0; i < 90; i++){ const side = i % 2 ? BURJ.west : BURJ.east, st = side[(i >> 1) % side.length], k = psr(i * 3 + Math.floor(t * 12)), y = st.top + 4 + k * (BURJ.base - st.top - 8); g.fillStyle = rgb(i % 3 ? pal : [255, 255, 255], 0.35 + 0.5 * psr(i + Math.floor(t * 12) * 2)); g.fillRect(BX + (i % 2 ? -1 : 1) * psr(i + 5 + Math.floor(t * 9)) * st.hw - 1.3, y, 2.6, 2); }
        g.globalAlpha = 1;
        // the finale: a white pulse and rings leaving the spire
        if (fin){ g.fillStyle = rgb([255, 255, 255], 0.5 * Math.sin(fin * Math.PI) * (0.6 + 0.4 * Math.sin(t * 30))); g.fillRect(BX - 120, BURJ.spireTop - 40, 240, body + 60); }
        g.restore();
        if (fin){ for (let i = 0; i < 3; i++){ const k = (fin * 1.4 - i * 0.25); if (k > 0 && k < 1){ g.strokeStyle = rgb(pal, 0.7 * (1 - k)); g.lineWidth = 3 * (1 - k * 0.5); g.beginPath(); g.arc(BX, BURJ.spireTop - 20, k * 260, 0, TAU); g.stroke(); } } }
        // its light on the lake and the water
        glow(g, 'gold', BX, HZ + 40, 180, 0.22 * env); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgb(pal, 0.10 * env); g.fillRect(BX - 130, HZ, 260, 110); g.restore();
      }
      function drawTraffic(g, L, t, dt){
        const a = 0.25 + 0.7 * L.night;
        for (const c of CARS){ c.x += c.v * dt; if (c.x > DW + 20) c.x = -20; if (c.x < -20) c.x = DW + 20;
          const y = HZ - 14 + c.lane * 3.5, head = c.v < 0;
          g.fillStyle = head ? 'rgba(255,245,220,' + a + ')' : 'rgba(255,60,50,' + a + ')'; g.fillRect(c.x, y, head ? 3 : 2.4, 1.6); }
      }
      function drawGlints(g, L, t){
        const a = 0.6 * L.sunPath; if (a < 0.03) return;
        g.fillStyle = '#fff5dc';
        for (const s of GLINTS){ const k = 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph + s.y * 0.3); if (k > 0.55){ g.globalAlpha = (k - 0.55) * 2 * a; g.fillRect(s.x - 3 * k, s.y, 6 * k, 1.1); } }
        g.globalAlpha = 1;
      }
      function drawBoats(g, L, t, dt){
        const night = L.night;
        for (const b of BOATS){
          b.x += b.dir * b.spd * dt * b.s; if (b.dir > 0 && b.x > DW + 120){ b.x = -120; b.y = HZ + 16 + rnd(0, 60); } if (b.dir < 0 && b.x < -120){ b.x = DW + 120; b.y = HZ + 16 + rnd(0, 60); }
          const bob = Math.sin(t * 1.4 + b.ph) * 1.2, x = b.x, y = b.y + bob, s = b.s * (0.7 + 0.3 * (b.y - HZ) / 76);
          const blink = b.blinkUntil > t, lit = blink ? ((t * 10 % 1) < 0.5 ? 1 : 0.1) : 0.5 + 0.5 * night;
          // wake
          g.strokeStyle = 'rgba(255,255,255,' + (0.10 + 0.08 * night) + ')'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - b.dir * 16 * s, y + 3); g.lineTo(x - b.dir * (60 + b.spd) * s, y + 8 * s); g.moveTo(x - b.dir * 16 * s, y + 3); g.lineTo(x - b.dir * (60 + b.spd) * s, y - 1); g.stroke();
          g.save(); g.translate(x, y); g.scale(b.dir * s, s);
          const hull = mixc([30, 32, 50], L.warm, 0.12), deck = mixc([230, 232, 240], L.warm, 0.35 * (1 - night));
          if (b.kind === 'dhow'){
            g.fillStyle = rgb(hull); g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(0, 8, 26, -2); g.lineTo(20, -6); g.lineTo(-22, -5); g.closePath(); g.fill();
            g.fillStyle = rgb(mixc([240, 232, 215], L.warm, 0.5 * (1 - night))); g.beginPath(); g.moveTo(-4, -6); g.quadraticCurveTo(6, -30, 22, -40); g.quadraticCurveTo(10, -22, 12, -6); g.closePath(); g.fill();   // the lateen sail
            g.strokeStyle = rgb(hull); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-4, -6); g.lineTo(22, -40); g.stroke();
            glow(g, 'warm', 14, -8, 6, 0.8 * lit);
          } else if (b.kind === 'yacht'){
            g.fillStyle = rgb(deck); g.beginPath(); g.moveTo(-34, 0); g.lineTo(34, 0); g.lineTo(30, -7); g.lineTo(-30, -7); g.closePath(); g.fill();
            g.fillStyle = rgb(mixc(deck, [255, 255, 255], 0.3)); g.fillRect(-18, -15, 30, 8); g.fillRect(-8, -21, 14, 6);
            g.fillStyle = rgb(hull); g.beginPath(); g.moveTo(-34, 0); g.quadraticCurveTo(0, 5, 34, 0); g.lineTo(34, 1); g.lineTo(-34, 1); g.fill();
            g.fillStyle = rgb([255, 220, 160], lit); for (let i = 0; i < 6; i++) g.fillRect(-16 + i * 5, -13, 3, 3);
            glow(g, 'rose', -33, -8, 4, 0.9 * lit); glow(g, 'green', 33, -8, 4, 0.9 * lit); glow(g, 'warm', 0, -22, 6, 0.9 * lit);
          } else if (b.kind === 'abra'){
            g.fillStyle = rgb(mixc([120, 80, 50], L.warm, 0.2)); g.beginPath(); g.moveTo(-18, 0); g.quadraticCurveTo(0, 5, 18, 0); g.lineTo(15, -4); g.lineTo(-15, -4); g.closePath(); g.fill();
            g.fillStyle = rgb(hull); g.fillRect(-12, -12, 22, 1.5); for (let i = 0; i < 3; i++) g.fillRect(-10 + i * 10, -11, 1, 7);
            g.fillStyle = rgb(mixc([240, 230, 200], L.warm, 0.4)); g.fillRect(-13, -13.5, 24, 2);
            glow(g, 'warm', 6, -6, 5, 0.9 * lit);
          } else {
            g.fillStyle = rgb(deck); g.beginPath(); g.moveTo(-20, 0); g.lineTo(22, 0); g.lineTo(18, -5); g.lineTo(-16, -5); g.closePath(); g.fill();
            g.fillStyle = rgb(hull); g.fillRect(-4, -10, 10, 5);
            g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, 1); g.lineTo(-40, 3); g.stroke();   // the spray
            glow(g, 'white', 4, -9, 4, 0.9 * lit);
          }
          g.restore();
          // the lights' smear on the water
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 + 0.25 * lit * night;
          g.fillStyle = lgc('boatsmear', g, 0, 0, 0, 30, [[0, 'rgba(255,220,170,0.6)'], [1, 'rgba(255,220,170,0)']]);
          g.save(); g.translate(x, y + 2); g.scale(s, s); g.fillRect(-14, 0, 28, 30); g.restore(); g.restore();
        }
      }
      function drawDolphins(g, L, t){
        for (let i = DOLPHINS.length - 1; i >= 0; i--){
          const d = DOLPHINS[i], k = (t - d.t0) / 1.5; if (k > 1){ DOLPHINS.splice(i, 1); continue; }
          const x = d.x + d.dir * (k - 0.5) * 120, y = HZ + 22 - Math.sin(k * Math.PI) * 60, ang = -d.dir * (k - 0.5) * 1.6;
          g.save(); g.translate(x, y); g.rotate(ang); g.scale(d.dir, 1);
          g.fillStyle = rgb(mixc([90, 110, 140], L.cool, 0.3));
          g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-4, -9, 18, -2); g.quadraticCurveTo(24, 0, 26, 2); g.quadraticCurveTo(10, 6, -18, 4); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(-2, -5); g.lineTo(2, -14); g.lineTo(7, -5); g.fill();                                         // dorsal
          g.beginPath(); g.moveTo(-22, 1); g.lineTo(-32, -6); g.lineTo(-26, 1); g.lineTo(-32, 8); g.closePath(); g.fill();   // fluke
          g.restore();
          if (k < 0.2 || k > 0.8){ const sp = k < 0.2 ? k / 0.2 : (1 - k) / 0.2; g.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - sp)) + ')'; for (let j = 0; j < 8; j++){ const a = -Math.PI * (0.15 + 0.7 * psr(j + 3)), r = 8 + 26 * sp; g.beginPath(); g.arc(x + Math.cos(a) * r, HZ + 20 + Math.sin(a) * r * 0.6, 1.5, 0, TAU); g.fill(); } }
        }
      }
      function drawFountain(g, L, t){
        if (!FOUNTAIN) return;
        const e = t - FOUNTAIN.t0, len = FOUNTAIN.len, env = Math.min(1, e / 1.2) * Math.min(1, (len - e) / 1.5);
        const n = 17, cx = (LAKE.x0 + LAKE.x1) / 2, span = (LAKE.x1 - LAKE.x0) * 0.44, mode = FOUNTAIN.mode;
        g.save(); g.globalCompositeOperation = 'lighter';
        glow(g, 'cyan', cx, HZ - 6, 200, 0.18 * env); glow(g, 'white', cx, HZ - 8, 120, 0.22 * env);
        for (let i = 0; i < n; i++){
          const u = (i / (n - 1)) * 2 - 1, x = cx + u * span;
          let hgt;
          if (mode === 0) hgt = 0.5 + 0.5 * Math.sin(e * 2.2 - Math.abs(u) * 3.2);                 // a wave rolling out from the centre
          else if (mode === 1) hgt = 0.5 + 0.5 * Math.sin(e * 1.6 + i * 0.9);                       // a chase
          else hgt = (0.4 + 0.6 * (1 - Math.abs(u))) * (0.6 + 0.4 * Math.sin(e * 3 + (i % 2) * Math.PI));   // a crown, breathing
          hgt = Math.max(0.05, hgt) * (70 + 120 * (1 - Math.abs(u) * 0.6)) * env;
          const top = HZ - 10 - hgt, wl = 2.4 + hgt * 0.03;
          const c = i % 2 ? [200, 240, 255] : [255, 235, 200];
          g.strokeStyle = rgb(c, 0.85); g.lineWidth = wl; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, HZ - 10); g.quadraticCurveTo(x + Math.sin(e * 5 + i) * 3, top + hgt * 0.4, x, top); g.stroke();
          // spray at the head, falling drops
          glow(g, 'white', x, top, 9 + hgt * 0.08, 0.9);
          for (let j = 0; j < 8; j++){ const s = psr(j + i * 7 + Math.floor(e * 6)), fx = x + (s - 0.5) * (10 + hgt * 0.25), fy = top + s * hgt * 0.5; g.fillStyle = rgb(c, 0.6 * (1 - s)); g.fillRect(fx, fy, 1.4, 3); }
        }
        // the lit pool
        g.fillStyle = rgb([160, 220, 255], 0.16 * env); g.beginPath(); g.ellipse(cx, HZ - 8, (LAKE.x1 - LAKE.x0) / 2, 12, 0, 0, TAU); g.fill();
        g.restore();
      }
      function drawFireworks(g, L, t){
        for (let i = FW.length - 1; i >= 0; i--){
          const f = FW[i], e = t - f.t0; if (e < 0) continue; if (e > f.rise + 2.2){ FW.splice(i, 1); continue; }
          if (e < f.rise){ const k = e / f.rise, x = f.x, y = HZ - (HZ - f.y) * smooth(k); glow(g, 'gold', x, y, 5, 0.9); g.fillStyle = 'rgba(255,220,160,0.5)'; g.fillRect(x - 0.6, y, 1.2, 16); continue; }
          const k = (e - f.rise), col = 'hsl(' + f.hue + ',95%,68%)';
          g.save(); g.globalCompositeOperation = 'lighter';
          if (k < 0.25) glow(g, 'white', f.x, f.y, 40 * (1 - k / 0.25) + 10, 0.9 * (1 - k / 0.25));
          g.fillStyle = col;
          for (const s of f.sparks){ const q = k / s.life; if (q > 1) continue; const px = f.x + s.ca * 140 * (1 - Math.exp(-k * 2.2)), py = f.y + s.sa * 140 * (1 - Math.exp(-k * 2.2)) + 60 * k * k; g.globalAlpha = (1 - q) * (q > 0.6 && Math.sin(k * 40 + s.r * 9) < 0 ? 0.4 : 1); g.beginPath(); g.arc(px, py, s.r * (1 - q * 0.5), 0, TAU); g.fill(); }
          g.globalAlpha = 1; g.restore();
          // the burst's light on the water
          g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'hsla(' + f.hue + ',90%,65%,' + (0.12 * Math.max(0, 1 - k / 1.5)) + ')'; g.fillRect(f.x - 160, HZ, 320, 90); g.restore();
        }
      }
      function drawHeli(g, L, t){
        const e = (t - HELI.t0) % HELI.period; if (e < 0 || e > 30) return;
        // in from the right high, down to the helipad, wait, up and away
        const pad = ALARAB.helipad || [120, HZ - 220];
        let x, y;
        if (e < 10){ const k = smooth(e / 10); x = lerp(DW + 60, pad[0], k); y = lerp(150, pad[1] - 60, k); }
        else if (e < 13){ const k = smooth((e - 10) / 3); x = pad[0]; y = lerp(pad[1] - 60, pad[1] - 9, k); }
        else if (e < 19){ x = pad[0]; y = pad[1] - 9; }
        else if (e < 22){ const k = smooth((e - 19) / 3); x = pad[0] - k * 20; y = lerp(pad[1] - 9, pad[1] - 80, k); }
        else { const k = smooth((e - 22) / 8); x = lerp(pad[0] - 20, -80, k); y = lerp(pad[1] - 80, 120, k); }
        const bodyC = mixc([40, 44, 66], L.cool, 0.25);
        g.save(); g.translate(x, y);
        g.fillStyle = rgb(bodyC); g.beginPath(); g.ellipse(0, 0, 11, 4.5, 0, 0, TAU); g.fill(); g.fillRect(8, -1.5, 14, 2); g.fillRect(20, -6, 1.5, 6);
        g.fillStyle = 'rgba(200,220,255,0.55)'; g.beginPath(); g.ellipse(-4, -1, 5, 2.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(230,235,245,0.55)'; g.lineWidth = 1; const ra = t * 40; g.beginPath(); g.moveTo(Math.cos(ra) * -16, -6 + Math.sin(ra) * 1.5); g.lineTo(Math.cos(ra) * 16, -6 - Math.sin(ra) * 1.5); g.stroke();
        g.fillStyle = 'rgba(230,235,245,0.18)'; g.beginPath(); g.ellipse(0, -6, 16, 2, 0, 0, TAU); g.fill();
        if ((t * 1.5 % 1) < 0.15) glow(g, 'rose', 0, -8, 5, 1); glow(g, 'white', 11, 1, 4, 0.7);
        g.restore();
      }

      // ── frame ──
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
        profT = performance.now(); PROF.frames++;
        repaintIfNeeded(t);
        const L = LOOK;
        ctx.drawImage(cityL.cv, 0, 0, W, H);
        mark('city');
        ctx.drawImage(reflL.cv, 0, 0, W, H);
        mark('water');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawLiving(ctx, L, t, dt);
        ctx.restore();
        mark('living');
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
        catch (e){ if (!frameErr){ frameErr = true; console.error('dubai3 frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          lastDecide = ts;
          const heavy = perf.costEma > 7 || perf.gapEma > 21;
          if (heavy){ perf.halfRate = true; calmSince = ts; }
          else if (perf.costEma > 3.5 || perf.gapEma > 17.5) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
        }
      }

      buildCity();
      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      window._dubai3 = BACKGROUNDS.dubai3._test = {
        seek: ph => { t0 = (t0 === null ? 0 : t0); const nt = lastT + (ph * DAY_PERIOD - (lastT % DAY_PERIOD)); t0 -= (nt - lastT) * 1000; lastT = nt; lookKey = -1; nextShow = nt + 8; nextFn = nt + 30; nextFw = nt + 60; },
        look: () => LOOK, show: () => startShow(lastT, 16), fountain: () => startFountain(lastT, 24), fireworks: () => fireworks(lastT, 4),
        spin: () => spinWheel(lastT), horn: () => BOATS.forEach(b => b.blinkUntil = lastT + 2), heli: () => (HELI.t0 = lastT - 0.01),
        dolphin: () => dolphin(lastT, 760), wash: () => washAlArab(lastT), museum: () => museumRing(lastT), plane: () => (PLANE.t0 = lastT),
        shoot: () => SHOOTERS.push({ x: rnd(200, 1400), y: rnd(40, 300), t0: lastT, ang: rnd(2.6, 3.0), len: rnd(90, 180) }),
        boats: () => BOATS, burj: () => BURJ, tiers: () => BURJ.west.length + BURJ.east.length, busy: () => ({ show: !!SHOW, fountain: !!FOUNTAIN, fw: FW.length, refl: !!reflL }),
        perf: () => ({ dpr: +DPR.toFixed(2), halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1), costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn, S: +S.toFixed(3) }),
        prof: () => { const o = {}; for (const k in PROF) o[k] = (k === 'frames' || k === 'repaints') ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; },
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        if (window._dubai3 === BACKGROUNDS.dubai3._test) delete window._dubai3;
        stage.innerHTML = '';
      };
    },
  };
})();
