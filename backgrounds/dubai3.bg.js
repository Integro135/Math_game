/* ── Dubai v3 — the skyline at golden hour, built from zero ──────────────────
   window.BACKGROUNDS.dubai3 = { skin:'dubai', aids:'dubai', init({stage}) → cleanup }

   A painterly Dubai seen from the water at the end of the day, and the tower
   that owns the picture: the BURJ KHALIFA. Nothing here is shared with the
   two older Dubai scenes, which were deleted once this one shipped.

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
   beacons, a UFO that abducts a boat (or the helicopter) with a TRACTOR
   BEAM, a helicopter to the Al Arab helipad, the NEW-YEAR FIREWORKS fired
   from the Burj's own flanks, a DRONE SHOW that forms shapes in the left sky,
   the INTERCEPTION show (a
   salvo from the right, the alert on the Al Arab's mast, an interceptor that
   banks onto its target, a fireball with shockwaves, debris, drifting smoke
   and a shake of the picture), dusk birds, night shooting
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
      // The sun and the moon RIDE THE HOUR. `look().ph` runs 0..1 over the day
      // cycle, and both bodies are placed on an arc from it: the sun starts high
      // right of centre, sinks left through the golden hour, drops below the
      // waterline for the night and climbs back; the moon runs the opposite way,
      // rising as the sun sets. Everything keyed on the sun (its glow, the band
      // on the horizon, the path on the water, the glints) follows them.
      const SUN_SET = 520;                                       // where it touches down
      function sunAt(ph){
        // 0 → high right, .30 → touching the horizon left of centre, .5 → deep
        // below, 1 → back up. A cosine arc keeps the motion even, not linear.
        const u = (ph + 0.18) % 1, ang = u * TAU;
        return { x: 1180 - 900 * u * 1.0, y: 470 - 330 * Math.cos(ang) };
      }
      function moonAt(ph){
        const u = (ph + 0.68) % 1, ang = u * TAU;
        return { x: 1280 - 1060 * u, y: 430 - 330 * Math.cos(ang) };
      }
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
      let skyL = null, cityL = null, reflL = null, mirL = null;  // still SKY · still city over a transparent sky · the water mirror · a scratch composite for it
      let B_SKY = 0;                                             // the sky is only blitted down to where the city is opaque

      // ═══════════════════════════ THE STILL CITY ═══════════════════════════
      // Everything below is painted in DESIGN coordinates onto a context whose
      // transform is (S, OX, OY). `L` is the current LOOK.
      function paintSky(g, L){
        g.fillStyle = lg(g, 0, 0, 0, HZ, [[0, rgb(L.sky[0])], [0.30, rgb(L.sky[1])], [0.62, rgb(L.sky[2])], [0.86, rgb(L.sky[3])], [1, rgb(L.sky[4])]]);
        g.fillRect(-400, -400, DW + 800, HZ + 400);
        // the sun's glow, low left, and its band along the whole horizon
        g.save(); g.globalCompositeOperation = 'lighter';
        // (the sun's own glow travels with it and is drawn LIVE — see
        //  drawSunMoon — so it glides instead of stepping with the look-key)
        g.fillStyle = lg(g, 0, HZ - 220, 0, HZ, [[0, rgb(L.haze, 0)], [1, rgb(L.haze, L.hazeA)]]);
        g.fillRect(-400, HZ - 220, DW + 800, 220);
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
      }


      // ── the sun and the moon, drawn LIVE ────────────────────────────────────
      //    They ride `look().ph`, which advances every frame — but the still city
      //    layer is only rebuilt 24 times a cycle, so painting them there made
      //    both teleport once every ~11 s. They are drawn per frame instead,
      //    between the sky blit and the city blit, so the motion is smooth AND
      //    they still pass behind the skyline.
      // the crescent: a disc with the bite CUT OUT, so the dark side stays sky
      // and carries only a breath of earthshine. Baked once — it is drawn every
      // frame now, and allocating a canvas per frame would be absurd.
      let _moonCv = null;
      function moonSprite(R){
        if (_moonCv) return _moonCv;
        const mc = doc.createElement('canvas'); mc.width = mc.height = Math.ceil(R * 2.4 * 4);
        const q = mc.getContext('2d'); q.setTransform(4, 0, 0, 4, 0, 0); const c = R * 1.2;
        q.fillStyle = lg(q, c - R, c, c + R, c, [[0, '#fff6dc'], [1, '#e8d8a8']]); q.beginPath(); q.arc(c, c, R, 0, TAU); q.fill();
        q.globalCompositeOperation = 'destination-out'; q.beginPath(); q.arc(c - R * 0.55, c - R * 0.08, R * 0.9, 0, TAU); q.fill();
        q.globalCompositeOperation = 'source-over'; q.fillStyle = 'rgba(190,200,240,0.10)'; q.beginPath(); q.arc(c, c, R, 0, TAU); q.fill();
        return (_moonCv = mc);
      }
      function drawSunMoon(g, L){
        const SUN = sunAt(L.ph);
        g.save(); g.globalCompositeOperation = 'lighter';
        // the broad glow it throws into the sky, travelling with it
        g.fillStyle = rg(g, SUN.x, Math.min(SUN.y, HZ - 4), 0, 620, [[0, rgb(L.glow, 0.85 * L.glowA)], [0.25, rgb(L.glow, 0.32 * L.glowA)], [0.6, rgb(L.glow, 0.08 * L.glowA)], [1, rgb(L.glow, 0)]]);
        g.fillRect(-400, 0, DW + 800, HZ);
        // the sun itself, a flattened disc sinking into the haze
        if (L.sun > 0.02 && SUN.y < HZ + 40){
          // it flattens and reddens as it meets the haze at the waterline
          // ROUND all the way down, and only squashed by refraction in the last
          // 90 px above the waterline — the halo shares the core's aspect, so the
          // disc never reads as an ellipse hanging in a clear sky
          const low = clamp01((SUN.y - (HZ - 90)) / 90), R = 30;
          const rx = R * (1 + 0.55 * low), ry = R * (1 - 0.22 * low);
          g.fillStyle = rg(g, SUN.x, SUN.y, 0, 100, [[0, rgb(mixc([255, 245, 220], [255, 170, 90], low), 0.95 * L.sun)], [0.3, rgb(mixc([255, 215, 150], [255, 140, 70], low), 0.6 * L.sun)], [1, rgb([255, 190, 120], 0)]]);
          g.beginPath(); g.ellipse(SUN.x, SUN.y, rx * 2.1, ry * 2.1, 0, 0, TAU); g.fill();
          g.fillStyle = rgb(mixc([255, 250, 235], [255, 165, 80], low), 0.92 * L.sun);
          g.beginPath(); g.ellipse(SUN.x, SUN.y, rx, ry, 0, 0, TAU); g.fill();
        }
        g.restore();
        { const MOON = moonAt(L.ph), mx = MOON.x, my = MOON.y, R = 24;
          if (my < HZ - 30) {
          g.save(); g.globalCompositeOperation = 'lighter';
          g.fillStyle = rg(g, mx, my, R * 0.6, R * 5, [[0, 'rgba(255,240,210,0.16)'], [1, 'rgba(255,240,210,0)']]); g.fillRect(mx - R * 5, my - R * 5, R * 10, R * 10);
          g.restore();
          const c = R * 1.2;
          g.drawImage(moonSprite(R), mx - c, my - c, c * 2, c * 2); } }
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
      const BURJ = { x: BX, base: HZ - 2, top: 58, lobes: [], wins: [] };
      (function buildBurj(){
        // The tower is a Y of three wings; from the lake you see the wings' ROUND
        // tips as a bundle of slender cylinders stepping up toward the core, the
        // setbacks spiralling (the east steps sit lower than the west). Each lobe:
        // [left edge from the axis, width, height above the base]. Outer first.
        const west = [[-57, 24, 38], [-49, 16, 92], [-41, 16, 150], [-33, 16, 208], [-26, 15, 268], [-19, 14, 328], [-13, 12, 384], [-8, 10, 436], [-4, 8, 482]];
        const east = [[33, 24, 50], [31, 16, 118], [24, 16, 178], [16, 16, 238], [10, 15, 298], [4, 14, 354], [0, 12, 410], [-3, 10, 460], [-5, 8, 506]];
        const L = [];
        for (const [x, w, h] of west) L.push({ x: BX + x, w, h, side: -1 });
        for (const [x, w, h] of east) L.push({ x: BX + x, w, h, side: 1 });
        L.push({ x: BX - 7, w: 14, h: 545, side: 0 });                        // the core
        L.sort((a, b) => a.h - b.h);                                          // painter's order: the tall inner lobes stand in front
        BURJ.lobes = L; BURJ.bodyTop = BURJ.base - 545; BURJ.spireTop = BURJ.top;
        // the core steps into the mast: [width, height] cylinders, then the needle
        BURJ.spire = [[10, 40], [7, 44], [4.6, 44], [2.6, 30], [1.6, 22], [0.9, 15]];
        // lit windows for the night, fixed to lobes
        for (let i = 0; i < 46; i++){ const lb = L[Math.floor(psr(i + 300) * (L.length - 1))]; BURJ.wins.push({ x: lb.x + 1.5 + psr(i + 301) * (lb.w - 4), y: BURJ.base - psr(i + 302) * (lb.h - 12) - 6, ph: psr(i + 303) * TAU, sp: 0.3 + psr(i + 304) * 0.9 }); }
      })();
      function burjBody(g){ for (const lb of BURJ.lobes) g.rect(lb.x, BURJ.base - lb.h, lb.w, lb.h); }
      function burjSpire(g){
        let y = BURJ.bodyTop;
        for (const [w, h] of BURJ.spire){ g.rect(BX - w / 2, y - h, w, h + 0.5); y -= h; }
        BURJ.spireTop = y;
      }
      function burjPath(g){ g.beginPath(); burjBody(g); burjSpire(g); }
      // one round-nosed lobe: a cylinder lit from the west, a flat lit terrace cap
      function paintLobe(g, L, lb){
        const night = L.night, top = BURJ.base - lb.h, silver = mixc([176, 188, 206], L.glass, 0.2);
        const warmK = lb.side <= 0 ? 0.55 : 0.22, tone = lb.side === 0 ? 0.08 : 0;
        const lit = mixc(mixc(silver, [255, 255, 255], 0.28 + tone), L.warm, warmK * (1 - 0.85 * night));
        const mid = mixc(silver, L.cool, lb.side > 0 ? 0.38 : 0.18), dark = mixc(mixc(silver, L.cool, 0.5), [6, 10, 26], 0.55 + 0.25 * night);
        const rim = mixc(dark, L.sky[1], 0.5);
        g.fillStyle = lg(g, lb.x, 0, lb.x + lb.w, 0, [[0, rgb(mixc(mid, dark, 0.35))], [0.22, rgb(lit)], [0.5, rgb(mid)], [0.82, rgb(dark)], [0.95, rgb(mixc(dark, [0, 0, 0], 0.3))], [1, rgb(rim)]]);
        g.fillRect(lb.x, top, lb.w, lb.h);
        // the terrace cap: a flat lit disc seen edge-on, a warm line under its lip
        g.fillStyle = rgb(mixc(silver, [255, 255, 255], 0.55)); g.beginPath(); g.ellipse(lb.x + lb.w / 2, top, lb.w / 2, 1.6, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(L.warm, 0.55 * (1 - 0.5 * night)); g.fillRect(lb.x + 1, top + 1.2, lb.w - 2, 1);
        g.fillStyle = 'rgba(0,4,20,0.35)'; g.fillRect(lb.x, top + 2.2, lb.w, 2);
      }
      function paintBurj(g, L){
        const { base, bodyTop, lobes } = BURJ, night = L.night;
        const x0 = lobes.reduce((m, lb) => Math.min(m, lb.x), 1e9), x1 = lobes.reduce((m, lb) => Math.max(m, lb.x + lb.w), -1e9);
        // the podium at its feet (the mall / hotel base), lit shopfronts
        g.fillStyle = lg(g, 0, base - 22, 0, base, [[0, rgb(mixc([40, 48, 78], L.warm, 0.12))], [1, rgb(mixc([22, 28, 48], L.warm, 0.05))]]);
        g.fillRect(BX - 104, base - 22, 208, 22);
        g.fillStyle = rgb([255, 205, 130], 0.4 + 0.5 * night); for (let k = 0; k < 24; k++) g.fillRect(BX - 98 + k * 8.4, base - 15, 3.8, 6);
        // the lobes, outer/low first
        for (const lb of lobes) paintLobe(g, L, lb);
        g.save(); g.beginPath(); burjBody(g); g.clip();
        // the glass mirrors the sky: blue high up, the sunset toward the horizon
        g.fillStyle = lg(g, 0, bodyTop, 0, base, [[0, rgb(mixc(L.sky[0], L.sky[1], 0.5), 0.26)], [0.45, rgb(L.sky[2], 0.08)], [0.8, rgb(L.glow, 0.16 * (1 - night))], [1, rgb(L.glow, 0.30 * (1 - night))]]);
        g.fillRect(x0, bodyTop, x1 - x0, base - bodyTop);
        // floor bands: every 3.4 px, a heavier one each mechanical floor
        for (let f = 3.4, k = 0; f < base - bodyTop; f += 3.4, k++){ const heavy = k % 5 === 4; g.fillStyle = heavy ? 'rgba(4,8,22,0.55)' : 'rgba(6,10,26,0.30)'; g.fillRect(x0, base - f, x1 - x0, heavy ? 1.4 : 0.7); }
        // the vertical fin along each nose (a hair of light on the highlight line)
        g.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.1 * (1 - night)) + ')'; for (const lb of lobes) g.fillRect(lb.x + lb.w * 0.24, base - lb.h + 3, 0.7, lb.h - 3);
        // haze at the foot
        g.fillStyle = lg(g, 0, base - 140, 0, base, [[0, rgb(L.haze, 0)], [1, rgb(L.haze, 0.28)]]); g.fillRect(x0, base - 140, x1 - x0, 140);
        // lit windows, more of them as it darkens
        if (L.lights > 0.4){ const a = (L.lights - 0.4) / 0.6; for (const w of BURJ.wins){ if (psr(w.x * 3 + w.y) > a * 1.2) continue; g.fillStyle = rgb(psr(w.x + w.y) < 0.2 ? [200, 225, 255] : [255, 222, 175], 0.8 * a); g.fillRect(w.x, w.y, 2.2, 2.4); } }
        g.restore();
        // the spire: the core stepping into the mast, each section a small cylinder
        let y = bodyTop;
        for (const [w, h] of BURJ.spire){
          const silver = mixc([190, 200, 216], L.glass, 0.15);
          g.fillStyle = lg(g, BX - w / 2, 0, BX + w / 2, 0, [[0, rgb(mixc(silver, L.cool, 0.3))], [0.25, rgb(mixc(silver, [255, 255, 255], 0.45))], [0.55, rgb(silver)], [1, rgb(mixc(silver, [10, 14, 30], 0.6))]]);
          g.fillRect(BX - w / 2, y - h, w, h + 0.5);
          if (w >= 2.6){ g.fillStyle = rgb(mixc(silver, [255, 255, 255], 0.6)); g.beginPath(); g.ellipse(BX, y - h, w / 2, Math.max(0.8, w * 0.16), 0, 0, TAU); g.fill();
            g.fillStyle = 'rgba(4,8,22,0.45)'; for (let yy = y - h + 4; yy < y; yy += 4) g.fillRect(BX - w / 2, yy, w, 0.7); }
          y -= h;
        }
        BURJ.spireTop = y;
        BURJ.beacons = [[BX, y + 2], [BX, bodyTop - 84], [BX, bodyTop - 128]];
      }

      // ── the BURJ AL ARAB: the sail on its island ──
      // Seen from the beach with the sea on the LEFT: the tapering silver MAST up
      // the seaward edge and past the top, the white fabric WINGS, the blue GLASS
      // CURTAIN WALL down the middle mirroring the dusk, the warm ATRIUM FABRIC
      // WALL glowing through it (its colour is live — clicks recolour it), the
      // white X-BRACED exoskeleton along the billowing trailing edge, the HELIPAD
      // on its cantilevered arm to the sea, AL MUNTAHA landward, all on an island
      // with a lit sea wall and a causeway to the shore.
      const ALARAB = { x: 175, base: HZ + 2, h: 272 };
      function sailPath(g){ const { x, base, h } = ALARAB, top = base - h;
        g.beginPath(); g.moveTo(x - 2, base); g.quadraticCurveTo(x - 7, base - h * 0.55, x + 3, top + 6); g.quadraticCurveTo(x + 62, top + 42, x + 74, base); g.closePath(); }
      function atriumPath(g){ const { x, base, h } = ALARAB, top = base - h;
        g.beginPath(); g.moveTo(x + 30, top + 44); g.quadraticCurveTo(x + 60, top + 78, x + 64, base - 8); g.lineTo(x + 46, base - 8); g.quadraticCurveTo(x + 44, top + 82, x + 30, top + 44); g.closePath(); }
      function paintAlArab(g, L){
        const { x, base, h } = ALARAB, night = L.night, top = base - h;
        g.fillStyle = rg(g, x + 34, base - h * 0.45, 0, h * 0.9, [[0, 'rgba(220,235,255,0.12)'], [1, 'rgba(220,235,255,0)']]);
        g.fillRect(x - 120, top - 70, 300, h + 80);                                              // the halo the white building throws
        // the island, its sea wall, the causeway to the shore
        g.fillStyle = rgb(mixc([20, 29, 51], L.warm, 0.06));
        g.beginPath(); g.moveTo(x - 40, base + 5); g.lineTo(x - 32, base - 6); g.lineTo(x + 94, base - 6); g.lineTo(x + 102, base + 5); g.closePath(); g.fill();
        g.fillStyle = 'rgba(70,86,116,0.8)'; g.fillRect(x - 32, base - 7, 126, 1.4);
        g.strokeStyle = 'rgba(66,82,112,0.95)'; g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(x + 98, base - 1); g.quadraticCurveTo(x + 160, base + 0.5, x + 220, base + 3); g.stroke();
        g.strokeStyle = 'rgba(50,62,90,0.9)'; g.lineWidth = 1.2;
        for (let k = 0; k < 6; k++){ g.beginPath(); g.moveTo(x + 110 + k * 20, base - 0.5 + k * 0.5); g.lineTo(x + 110 + k * 20, base + 6); g.stroke(); }
        for (let k = 0; k < 8; k++){ g.fillStyle = rgb([255, 205, 130], 0.5 + 0.4 * psr(k + 40)); g.fillRect(x - 28 + k * 16, base - 9, 1.6, 1.8); if (k < 6) g.fillRect(x + 104 + k * 18, base - 4 + k * 0.6, 1.4, 1.4); }
        // the mast: a tapering silver spine up the seaward edge, past the top
        g.fillStyle = rgb(mixc([211, 221, 233], L.warm, 0.3 * (1 - night)));
        g.beginPath(); g.moveTo(x - 1, base); g.quadraticCurveTo(x - 6, base - h * 0.55, x + 3, top + 10);
        g.lineTo(x + 5, top - 36); g.lineTo(x + 6.6, top - 36); g.lineTo(x + 8, top + 10);
        g.quadraticCurveTo(x + 1, base - h * 0.55, x + 6, base); g.closePath(); g.fill();
        // the sail: white fabric, warm on the sun side, cooling into its own shade
        sailPath(g);
        g.fillStyle = lg(g, x, 0, x + 74, 0, [[0, rgb(mixc([246, 249, 252], L.warm, 0.32 * (1 - night)))], [0.45, rgb(mixc([230, 238, 246], L.warm, 0.12 * (1 - night)))], [0.8, rgb(mixc([207, 219, 232], L.cool, 0.12))], [1, rgb(mixc([196, 186, 168], L.cool, 0.25))]]);
        g.fill();
        // the blue glass curtain wall down the middle, mirroring the dusk
        g.beginPath(); g.moveTo(x + 9, top + 30); g.quadraticCurveTo(x + 46, top + 60, x + 52, base - 8); g.lineTo(x + 14, base - 8); g.quadraticCurveTo(x + 7, base - h * 0.55, x + 9, top + 30); g.closePath();
        g.fillStyle = lg(g, 0, top + 30, 0, base, [[0, rgb(mixc([141, 189, 230], L.sky[1], 0.35))], [0.4, rgb(mixc([79, 131, 189], L.sky[2], 0.3))], [0.75, rgb(mixc([47, 92, 144], L.cool, 0.3))], [1, rgb(mixc([61, 91, 124], L.glow, 0.25 * (1 - night)))]]);
        g.fill();
        g.fillStyle = 'rgba(240,250,255,0.22)';                                                   // the sky sheen on the glass
        g.beginPath(); g.moveTo(x + 10, top + 34); g.quadraticCurveTo(x + 30, top + 58, x + 34, base - 30); g.lineTo(x + 24, base - 30); g.quadraticCurveTo(x + 12, base - h * 0.55, x + 10, top + 34); g.closePath(); g.fill();
        // floor lines across the wing, stronger toward the foot
        for (let yy = top + 26; yy < base - 8; yy += 6.5){
          const tt = (yy - top) / h, wAt = (4 + tt * 62) * 0.92;
          g.strokeStyle = 'rgba(240,248,255,' + (0.12 + tt * 0.16) + ')'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + 4, yy); g.quadraticCurveTo(x + 4 + wAt * 0.5, yy + 1.6, x + 4 + wAt, yy - 1); g.stroke();
        }
        // the white exoskeleton: X-braces along the billowing trailing edge
        g.strokeStyle = 'rgba(255,255,255,0.78)'; g.lineWidth = 1.3;
        for (let sg = 0; sg < 9; sg++){
          const u0 = sg / 9, u1 = (sg + 1) / 9;
          const ex0 = x + 5 + 69 * u0 * u0 * 0.9 + 6 * u0, ey0 = top + 8 + (base - top - 8) * u0;
          const ex1 = x + 5 + 69 * u1 * u1 * 0.9 + 6 * u1, ey1 = top + 8 + (base - top - 8) * u1;
          g.beginPath(); g.moveTo(ex0, ey0); g.lineTo(ex1 - 9, ey1); g.moveTo(ex0 - 9, ey0); g.lineTo(ex1, ey1); g.stroke();
        }
        g.strokeStyle = rgb(mixc([255, 240, 215], L.warm, 0.3), 0.65); g.lineWidth = 1.3;         // trailing-edge rim light
        g.beginPath(); g.moveTo(x + 5, top + 8); g.quadraticCurveTo(x + 64, top + 44, x + 74, base); g.stroke();
        g.strokeStyle = 'rgba(120,145,175,0.55)'; g.lineWidth = 1;                                // leading-edge seam
        g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x - 3, base - h * 0.55, x + 5, top + 8); g.stroke();
        // the helipad on its cantilevered arm to the sea
        g.strokeStyle = rgb(mixc([150, 170, 192], L.warm, 0.2)); g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(x + 4, top + 52); g.lineTo(x - 14, top + 40); g.stroke();
        g.fillStyle = '#2f3c55'; g.beginPath(); g.ellipse(x - 14, top + 39, 16, 3.8, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc([201, 214, 228], L.warm, 0.3 * (1 - night))); g.beginPath(); g.ellipse(x - 14, top + 38, 16, 3.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(90,220,140,0.8)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x - 14, top + 38, 9.5, 2.1, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(90,220,140,0.95)'; g.fillRect(x - 14.8, top + 36.4, 1.6, 1.6);
        // Al Muntaha, cantilevered off the landward side
        g.fillStyle = rgb(mixc([185, 200, 216], L.cool, 0.15)); g.beginPath(); g.ellipse(x + 47, top + 56, 12, 3.4, 0, 0, TAU); g.fill();
        g.fillStyle = rgb([255, 212, 150], 0.5 + 0.45 * night); g.fillRect(x + 38, top + 57, 18, 1.3);
        g.fillStyle = '#7f92a8'; g.fillRect(x + 40, top + 59, 14, 1.4);
        ALARAB.top = top; ALARAB.helipad = [x - 14, top + 36]; ALARAB.mastTop = [x + 5.8, top - 36];
      }
      function paintJBH(g, L){
        const { x, base } = ALARAB, night = L.night;
        // the breaking-wave hotel on the shore beside the sail
        g.fillStyle = lg(g, x + 74, 0, x + 262, 0, [[0, rgb(mixc([93, 117, 149], L.cool, 0.3))], [0.5, rgb(mixc([142, 166, 196], L.warm, 0.18 * (1 - night)))], [1, rgb(mixc([66, 88, 122], L.cool, 0.3))]]);
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
        g.fillStyle = rgb(mixc([30, 32, 52], L.warm, 0.08));
        g.fillRect(-400, HZ - 16, LAKE.x0 - 14 + 400, 8);                       // the road stops at the lake…
        g.fillRect(LAKE.x1 + 14, HZ - 16, DW + 400 - LAKE.x1 - 14, 8);          // …and picks up past it
        // the fountain lake in front of the Burj: a pool of the sky
        const lcx = (LAKE.x0 + LAKE.x1) / 2, lrx = (LAKE.x1 - LAKE.x0) / 2;
        g.fillStyle = rgb(mixc([60, 62, 90], L.warm, 0.18)); g.beginPath(); g.ellipse(lcx, HZ - 8, lrx + 8, 17, 0, 0, TAU); g.fill();          // the stone rim
        g.fillStyle = lg(g, 0, HZ - 24, 0, HZ + 4, [[0, rgb(mixc(L.sky[3], L.water[0], 0.55))], [1, rgb(mixc(L.water[1], L.sky[4], 0.25))]]);
        g.beginPath(); g.ellipse(lcx, HZ - 8, lrx, 13, 0, 0, TAU); g.fill();
        g.fillStyle = rgb(mixc(L.glow, [255, 255, 255], 0.4), 0.18 + 0.1 * (1 - night)); g.beginPath(); g.ellipse(lcx + 40, HZ - 12, lrx * 0.5, 4, 0, 0, TAU); g.fill();   // the sky on it
        g.fillStyle = rgb([255, 215, 150], 0.45 + 0.5 * night); for (let i = 0; i < 18; i++){ const a = Math.PI + i / 17 * Math.PI; g.fillRect(lcx + Math.cos(a) * (lrx + 4) - 1, HZ - 8 + Math.sin(a) * 15 - 1, 2, 2); }   // rim lamps
      }

      // ═══════════════ EVERY ELEMENT MOVES ═══════════════
      // What is painted into the still city cannot move, so anything that should
      // breathe is drawn here instead, over it, once per frame. The wind that
      // bends the palms also drives the sea and the beam's dust.
      const wind = t => 0.55 + 0.45 * Math.sin(t * 0.21) * Math.sin(t * 0.073 + 1.3);

      // palms: the trunk bends with the gust, each frond trails it on its own lag
      function drawPalms(g, L, t){
        const night = L.night, wv = wind(t);
        const trunk = rgb(mixc([60, 44, 34], L.warm, 0.25 * (1 - night)));
        const frond = rgb(mixc([40, 90, 60], L.warm, 0.2 * (1 - night)));
        g.lineCap = 'round';
        for (const P of PALMS){
          const s = P.s, y = HZ - 6, sway = Math.sin(t * 1.15 + P.ph) * (2.2 + 3.4 * wv) * s;
          const tx = P.x + P.lean * 10 * s + sway, ty = y - 40 * s;
          g.strokeStyle = trunk; g.lineWidth = 3 * s;
          g.beginPath(); g.moveTo(P.x, y); g.quadraticCurveTo(P.x + P.lean * 6 * s + sway * 0.35, y - 22 * s, tx, ty); g.stroke();
          g.strokeStyle = frond; g.lineWidth = 2 * s;
          for (let i = 0; i < 7; i++){
            const lag = Math.sin(t * 1.9 + P.ph + i * 0.8) * (0.06 + 0.10 * wv);
            const a = -Math.PI * 0.95 + i * (Math.PI * 0.9 / 6) + lag, len = (16 + psr(i + P.x) * 8) * s;
            g.beginPath(); g.moveTo(tx, ty);
            g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 4 * s, tx + Math.cos(a) * len + sway * 0.6, ty + Math.sin(a) * len + 10 * s);
            g.stroke();
          }
        }
      }

      // tower windows switching on and off through the evening
      const WINLIFE = [];
      function buildWinLife(){
        WINLIFE.length = 0;
        for (const T of TOWERS){
          const d = T.d || T.w * 0.42, n = Math.round(T.h / 26);
          for (let i = 0; i < n; i++){
            const k = psr(i * 7 + T.seed * 31);
            WINLIFE.push({ x: T.x + 3 + psr(i * 3 + T.seed) * (T.w + d - 8), y: HZ - 16 - k * (T.h - 30),
                           w: 3.6, h: (T.floor || 9) * 0.42, ph: psr(i + T.seed * 5) * TAU, sp: 0.18 + psr(i + T.seed * 9) * 0.5,
                           cool: psr(i + T.seed * 13) < 0.25 });
          }
        }
      }
      function drawWinLife(g, L, t){
        if (L.lights < 0.25) return;
        const a0 = (L.lights - 0.25) / 0.75;
        for (const c of WINLIFE){
          const k = Math.sin(t * c.sp + c.ph);
          if (k < 0.55) continue;
          g.fillStyle = rgb(c.cool ? [200, 225, 255] : [255, 208, 140], (k - 0.55) / 0.45 * 0.8 * a0);
          g.fillRect(c.x, c.y, c.w, c.h);
        }
      }

      // the far skyline: red aircraft-warning beacons, slow and out of step
      const FARBEACON = Array.from({ length: 16 }, (_, i) => ({ x: 40 + psr(i + 610) * (DW - 80), y: HZ - 80 - psr(i + 611) * 150, ph: psr(i + 612) }));
      function drawFarLife(g, L, t){
        for (const b of FARBEACON){ if (((t * 0.55 + b.ph) % 1) < 0.42) glow(g, 'rose', b.x, b.y, 3.4, 0.30 + 0.35 * L.night); }
      }

      // cirrus drifting on the high wind
      const DRIFT = Array.from({ length: 4 }, (_, i) => ({ x: psr(i + 620) * DW, y: 90 + psr(i + 621) * 330, w: 200 + psr(i + 622) * 300, h: 7 + psr(i + 623) * 12, sp: 2.4 + psr(i + 624) * 4 }));
      function drawDrift(g, L, t){
        for (const c of DRIFT){
          const x = ((c.x + t * c.sp) % (DW + 700)) - 350, low = c.y > 330;
          const col = low ? mixc(L.glow, [255, 255, 255], 0.35) : mixc(L.sky[1], [255, 255, 255], 0.5);
          g.save(); g.translate(x, c.y);
          g.fillStyle = rgc('drift' + c.w, g, 0, 0, 0, 1, [[0, rgb(col, 0.16 * (1 - 0.6 * L.night))], [0.55, rgb(col, 0.08 * (1 - 0.6 * L.night))], [1, rgb(col, 0)]]);
          g.scale(c.w, c.h); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
      }

      // the Dubai Frame: a light runs up one leg, across the bridge and down
      function drawFrameLive(g, L, t){
        const { x, w, h } = FRAME, base = HZ - 4, per = 7, k = (t % per) / per;
        const P = 2 * h + w, d = k * P;
        let px, py;
        if (d < h){ px = x + 4.5; py = base - d; }
        else if (d < h + w){ px = x + 4.5 + (d - h); py = base - h + 4; }
        else { px = x + w - 4.5; py = base - h + (d - h - w); }
        g.save(); g.globalCompositeOperation = 'lighter';
        glow(g, 'gold', px, py, 13, 0.85);
        g.fillStyle = rgb([255, 225, 160], 0.35 + 0.3 * Math.sin(t * 1.6));                 // the glass bridge breathing
        g.fillRect(x + 9, base - h + 8, w - 18, 7);
        g.restore();
      }

      // the Museum: light flowing along the calligraphy, the void breathing
      function drawMuseumLive(g, L, t){
        const { x, y, rx, ry } = MUSEUM;
        g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.ellipse(x + 2, y + 2, rx * 0.42, ry * 0.5, 0, 0, TAU); g.clip('evenodd');
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (let i = 0; i < 7; i++){
          const yy = y - ry + 12 + i * 15, ph = psr(i + 800) * 6, head = ((t * 0.33 + i * 0.14) % 1);
          g.strokeStyle = rgb([255, 225, 170], (0.25 + 0.5 * L.night));
          g.lineWidth = 1.5; g.beginPath();
          for (let k = 0; k <= 12; k++){
            const u = k / 12, xx = x - rx + k * (rx / 6), sway = Math.sin(k * 0.9 + ph + t * 0.5) * 3.5;
            const lit = Math.max(0, 1 - Math.abs(u - head) * 5);
            if (lit > 0.02){ g.globalAlpha = lit; k ? g.lineTo(xx, yy + sway) : g.moveTo(xx, yy + sway); }
            else { g.stroke(); g.beginPath(); g.moveTo(xx, yy + sway); }
          }
          g.stroke(); g.globalAlpha = 1;
        }
        g.restore();
        const br = 0.5 + 0.5 * Math.sin(t * 0.8);
        g.save(); g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgb([190, 235, 255], (0.10 + 0.25 * L.night) * br); g.lineWidth = 2;
        g.beginPath(); g.ellipse(x + 2, y + 2, rx * 0.42, ry * 0.5, 0, 0, TAU); g.stroke(); g.restore();
      }

      // the fountain lake: rings crossing it, and the shore lamps flickering
      function drawShoreLife(g, L, t){
        const lcx = (LAKE.x0 + LAKE.x1) / 2, lrx = (LAKE.x1 - LAKE.x0) / 2;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++){
          const k = ((t * 0.28 + i * 0.33) % 1);
          g.strokeStyle = rgb(mixc(L.glow, [180, 225, 255], 0.5), 0.20 * (1 - k));
          g.lineWidth = 1.2; g.beginPath(); g.ellipse(lcx, HZ - 8, lrx * k, 13 * k, 0, 0, TAU); g.stroke();
        }
        g.restore();
        const a = 0.35 + 0.5 * L.night;
        for (let x = -380, i = 0; x < DW + 400; x += 26, i++){
          const fl = 0.75 + 0.25 * Math.sin(t * (1.6 + psr(i + 660)) + psr(i + 661) * TAU);
          g.fillStyle = rgb([255, 215, 150], a * fl); g.fillRect(x, HZ - 8, 2, 3);
          if (psr(i + 662) < 0.12) glow(g, 'warm', x + 1, HZ - 7, 5, 0.25 * a * fl);
        }
      }

      // the Al Arab's exoskeleton lights up rung by rung after dark
      function drawSailLife(g, L, t){
        if (L.night < 0.15) return;
        const { x, base, h } = ALARAB, top = base - h;
        g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.4;
        for (let sg = 0; sg < 9; sg++){
          const u0 = sg / 9, u1 = (sg + 1) / 9, lit = Math.max(0, 1 - Math.abs(((t * 0.3) % 1.3) - u0) * 4.5);
          if (lit < 0.03) continue;
          const ex0 = x + 5 + 69 * u0 * u0 * 0.9 + 6 * u0, ey0 = top + 8 + (base - top - 8) * u0;
          const ex1 = x + 5 + 69 * u1 * u1 * 0.9 + 6 * u1, ey1 = top + 8 + (base - top - 8) * u1;
          g.strokeStyle = rgb([210, 240, 255], 0.7 * lit * L.night);
          g.beginPath(); g.moveTo(ex0, ey0); g.lineTo(ex1 - 9, ey1); g.moveTo(ex0 - 9, ey0); g.lineTo(ex1, ey1); g.stroke();
        }
        g.restore();
        // the JBH's windows twinkling next door
        for (let i = 0; i < 22; i++){
          const k = 0.5 + 0.5 * Math.sin(t * (0.5 + psr(i + 670)) + psr(i + 671) * TAU);
          if (k < 0.6) continue;
          g.fillStyle = rgb([255, 220, 170], (k - 0.6) * 2.5 * (0.3 + 0.6 * L.night));
          g.fillRect(x + 96 + psr(i + 672) * 150, base - 18 - psr(i + 673) * 88, 2.6, 3);
        }
      }

      // ── THE UFO ─────────────────────────────────────────────────────────────
      // It slides in over the water, picks a boat (or the helicopter, if one is
      // flying), hangs above it wobbling, opens a TRACTOR BEAM — a cone of light
      // with bands travelling down it and dust rising up — lifts its catch
      // spinning into the hull, flashes, and shoots off. Click it and it drops
      // everything and bolts.
      const UFO = { st: 'off', t0: 0, x: 0, y: 0, x0: 0, y0: 0, target: null, kind: '', hue: 150, nextAt: 55, dust: [] };
      const UFO_R = 34;
      function startUfo(t){
        if (UFO.st !== 'off') return;
        const heliUp = HELI.flying && !HELI.taken && !HELI.gone;
        const pick = UFO.force ? UFO.force : (heliUp && Math.random() < 0.45 ? 'heli' : 'boat');
        UFO.force = null;
        if (pick === 'heli' && !heliUp) return;
        let target = null;
        if (pick === 'boat'){
          // the open middle water: the beam should fall clear of BOTH heroes —
          // the sail on the left and the Burj Khalifa on the right
          let cands = BOATS.filter(b => !b.taken && !b.gone && b.x > 500 && b.x < 1080);
          if (!cands.length) cands = BOATS.filter(b => !b.taken && !b.gone && b.x > 340 && b.x < 1160);
          if (!cands.length){ cands = BOATS.filter(b => !b.taken && !b.gone); if (!cands.length) return;
            cands[0].x = rnd(560, 1020); }                                            // none in view: bring one in
          target = cands[(Math.random() * cands.length) | 0];
        }
        UFO.kind = pick; UFO.target = target;
        UFO.st = 'arrive'; UFO.t0 = t; UFO.nextAt = null; UFO.hue = [150, 190, 280, 60][(Math.random() * 4) | 0];
        UFO.x0 = Math.random() < 0.5 ? -140 : DW + 140; UFO.y0 = 120 + rnd(0, 90);
        UFO.x = UFO.x0; UFO.y = UFO.y0; UFO.dust.length = 0;
      }
      function ufoTargetPos(){
        if (UFO.kind === 'heli') return HELI.pos || [DW * 0.5, 300];
        return UFO.target ? [UFO.target.x, UFO.target.y] : [DW * 0.5, HZ + 40];
      }
      function ufoRelease(t){                                            // clicked: drop it and run
        if (UFO.target){ UFO.target.taken = false; UFO.target.lift = 0; UFO.target.spin = 0; }
        if (UFO.kind === 'heli'){ HELI.taken = false; HELI.lift = 0; }
        UFO.st = 'flee'; UFO.t0 = t;
      }
      function updateUfo(t, dt){
        if (UFO.st === 'off'){ if (UFO.nextAt == null) UFO.nextAt = t + 70 + rnd(0, 60); if (t > UFO.nextAt) startUfo(t); return; }
        const e = t - UFO.t0, [txp, typ] = ufoTargetPos();
        const hoverY = Math.max(110, Math.min(typ - 250, HZ - 370));   // clear of the skyline, so the beam falls the whole way
        if (UFO.st === 'arrive'){
          const k = smooth(clamp01(e / 3.4));
          UFO.x = lerp(UFO.x0, txp, k); UFO.y = lerp(UFO.y0, hoverY, k);
          if (k >= 1){ UFO.st = 'open'; UFO.t0 = t; }
        } else if (UFO.st === 'open'){
          UFO.x += (txp - UFO.x) * Math.min(1, dt * 3); UFO.y += (hoverY - UFO.y) * Math.min(1, dt * 3);
          if (e > 1.1){ UFO.st = 'lift'; UFO.t0 = t;
            if (UFO.kind === 'heli') HELI.taken = true; else if (UFO.target) UFO.target.taken = true; }
        } else if (UFO.st === 'lift'){
          UFO.x += (txp - UFO.x) * Math.min(1, dt * 2);
          const k = clamp01(e / 3.2), rise = (typ - (UFO.y + 12)) * smooth(k);
          if (UFO.kind === 'heli'){ HELI.lift = -rise; HELI.spin = k * 7; }
          else if (UFO.target){ UFO.target.lift = -rise; UFO.target.spin = k * 7; }
          if (k >= 1){ UFO.st = 'gulp'; UFO.t0 = t;
            if (UFO.kind === 'heli'){ HELI.gone = true; HELI.lift = 0; } else if (UFO.target){ UFO.target.gone = true; UFO.target.lift = 0; } }
        } else if (UFO.st === 'gulp'){
          if (e > 0.7){ UFO.st = 'leave'; UFO.t0 = t; }
        } else if (UFO.st === 'leave' || UFO.st === 'flee'){
          // accelerate away and keep going until it is REALLY off the stage —
          // ending the state on a timer alone left it winking out in mid-air
          const k = clamp01(e / (UFO.st === 'flee' ? 1.4 : 2.6));
          const dir = UFO.x0 < 0 ? -1 : 1;
          UFO.x += dir * (UFO.st === 'flee' ? 700 : 380) * dt * (0.35 + k * 1.6);
          UFO.y -= (UFO.st === 'flee' ? 230 : 120) * dt * (0.35 + k);
          const gone = dir < 0 ? UFO.x < -(UFO_R + 80) : UFO.x > DW + UFO_R + 80;
          if (gone || UFO.y < -(UFO_R + 80)){
            UFO.st = 'off'; UFO.nextAt = t + 90 + rnd(0, 70);
            if (UFO.target && UFO.target.gone){ const b = UFO.target; setTimeout(() => {}, 0); b.gone = false; b.taken = false; b.spin = 0; b.x = b.dir > 0 ? -120 : DW + 120; b.y = HZ + 16 + rnd(0, 60); }
            if (UFO.kind === 'heli' && HELI.gone){ HELI.gone = false; HELI.taken = false; HELI.spin = 0; HELI.t0 = t + 20; }
            UFO.target = null;
          }
        }
        // dust drawn up the beam
        if (UFO.st === 'lift' || UFO.st === 'open'){
          if (Math.random() < dt * 30) UFO.dust.push({ x: txp + rnd(-30, 30), y: typ + rnd(-6, 12), t0: t, life: rnd(1.1, 2.0), r: rnd(0.8, 2.4) });
        }
        for (let i = UFO.dust.length - 1; i >= 0; i--) if (t - UFO.dust[i].t0 > UFO.dust[i].life) UFO.dust.splice(i, 1);
      }
      function drawUfo(g, L, t){
        if (UFO.st === 'off') return;
        const e = t - UFO.t0, wob = Math.sin(t * 2.3) * 3, x = UFO.x, y = UFO.y + wob;
        const beamOn = UFO.st === 'open' || UFO.st === 'lift' || UFO.st === 'gulp';
        const [txp, typ] = ufoTargetPos();
        // the beam: a cone of light, bands travelling down it, dust rising
        if (beamOn){
          const open = UFO.st === 'open' ? smooth(clamp01(e / 1.1)) : (UFO.st === 'gulp' ? 1 - smooth(clamp01(e / 0.7)) : 1);
          const btm = typ + 14, wTop = 10 * open, wBtm = 46 * open;
          g.save(); g.globalCompositeOperation = 'lighter';
          g.beginPath(); g.moveTo(x - wTop, y + 8); g.lineTo(x + wTop, y + 8); g.lineTo(x + wBtm, btm); g.lineTo(x - wBtm, btm); g.closePath();
          g.fillStyle = lg(g, 0, y + 8, 0, btm, [[0, 'hsla(' + UFO.hue + ',95%,80%,' + (0.55 * open) + ')'], [0.6, 'hsla(' + UFO.hue + ',95%,70%,' + (0.22 * open) + ')'], [1, 'hsla(' + UFO.hue + ',95%,65%,0.02)']]);
          g.fill();
          g.save(); g.clip();                                            // bands travelling down the cone
          for (let i = 0; i < 5; i++){
            const k = ((t * 0.7 + i * 0.2) % 1), yy = lerp(y + 8, btm, k);
            g.fillStyle = 'hsla(' + UFO.hue + ',100%,88%,' + (0.30 * open * (1 - k)) + ')';
            g.fillRect(x - wBtm, yy - 3, wBtm * 2, 6);
          }
          g.restore();
          for (const d of UFO.dust){                                      // dust drawn up the beam
            const k = (t - d.t0) / d.life;
            g.fillStyle = 'hsla(' + UFO.hue + ',100%,92%,' + (0.9 * (1 - k)) + ')';
            g.beginPath(); g.arc(d.x + Math.sin(k * 6 + d.r) * 5, lerp(d.y, y + 14, smooth(k)), d.r * (1 - k * 0.5), 0, TAU); g.fill();
          }
          g.fillStyle = 'hsla(' + UFO.hue + ',95%,75%,' + (0.16 * open) + ')';   // the pool of light where it lands
          g.beginPath(); g.ellipse(txp, btm, wBtm, wBtm * 0.22, 0, 0, TAU); g.fill();
          g.restore();
        }
        if (UFO.st === 'gulp' && e < 0.3) glow(g, 'white', x, y + 6, 40 * (1 - e / 0.3) + 10, 1 - e / 0.3);
        // the saucer: a dark hull, a lit rim, a glass dome, chasing lights
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.1) * 0.05);
        glow(g, 'white', 0, 6, UFO_R * 1.5, 0.10 + 0.10 * Math.sin(t * 3));
        g.fillStyle = 'hsla(' + UFO.hue + ',60%,72%,0.9)';                        // the dome
        g.beginPath(); g.ellipse(0, -5, UFO_R * 0.42, UFO_R * 0.36, 0, Math.PI, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-UFO_R * 0.14, -9, UFO_R * 0.16, UFO_R * 0.1, -0.5, 0, TAU); g.fill();
        g.fillStyle = lg(g, 0, -6, 0, 10, [[0, '#dfe6f2'], [0.45, '#98a6c0'], [1, '#3b4560']]);   // the hull
        g.beginPath(); g.ellipse(0, 0, UFO_R, UFO_R * 0.30, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(10,14,28,0.55)'; g.beginPath(); g.ellipse(0, 3.4, UFO_R * 0.92, UFO_R * 0.2, 0, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -1, UFO_R * 0.78, UFO_R * 0.18, 0, Math.PI, TAU); g.stroke();
        for (let i = 0; i < 9; i++){                                             // the chasing rim lights
          const a = i / 9 * TAU, px = Math.cos(a) * UFO_R * 0.84, py = 3 + Math.sin(a) * UFO_R * 0.24;
          const on = Math.pow(Math.max(0, Math.sin(t * 4 - i * 0.7)), 6);
          g.fillStyle = 'hsla(' + ((UFO.hue + i * 12) % 360) + ',100%,' + (55 + 35 * on) + '%,' + (0.5 + 0.5 * on) + ')';
          g.beginPath(); g.arc(px, py, 2.2 + on * 1.2, 0, TAU); g.fill();
          if (on > 0.5) glow(g, 'white', px, py, 7, on * 0.5);
        }
        g.restore();
        UFO.hit = [x, y, UFO_R + 8];
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
        tower({ x: 1194, w: 26, h: 150, crown: 'flat', pal: 3, seed: 18, podium: 20, floor: 10 });      // the Dubai Mall front, clear of the Burj's western feet
        for (let i = 0; i < 26; i++){ const x = -60 + i * 68 + psr(i + 900) * 30; if (x < 300 || (x > LAKE.x0 - 20 && x < LAKE.x1 + 20)) continue; PALMS.push({ x, s: 0.8 + psr(i + 901) * 0.5, lean: psr(i + 902) < 0.5 ? -1 : 1, ph: psr(i + 903) * TAU }); }
      }
      // the city WITHOUT its sky — painted over a transparent top so the live
      // sun and moon can pass behind it
      function paintCity(g, L){
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
        for (const T of byX) if (T.x >= 1100 && T.x !== 1194) paintTower(g, L, T);
        // the Sky View bridge between its two towers
        g.fillStyle = rgb(mixc([200, 215, 235], L.cool, 0.3)); g.fillRect(1414, HZ - 300 + 6, 14, 22);
        paintBurj(g, L);
        for (const T of byX) if (T.x === 1194) paintTower(g, L, T);
        paintFrame(g, L);
        paintShore(g, L);
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
        const src = mirL.cv, sd = mirL.dpr, hzS = OY + HZ * S;
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
        const sx = OX + sunAt(L.ph).x * S;
        g.beginPath(); g.moveTo(sx - 50 * S, hzS); g.lineTo(sx + 50 * S, hzS); g.lineTo(sx + 300 * S, H); g.lineTo(sx - 300 * S, H); g.closePath(); g.clip();
        g.fillStyle = lg(g, sx - 300 * S, 0, sx + 300 * S, 0, [[0, rgb(L.glow, 0)], [0.5, rgb(L.glow, 0.55 * L.sunPath)], [1, rgb(L.glow, 0)]]);
        g.fillRect(sx - 300 * S, hzS, 600 * S, H - hzS);
        g.fillStyle = lg(g, 0, hzS, 0, H, [[0, rgb(L.water[2], 0)], [0.35, rgb(L.water[2], 0.35)], [1, rgb(L.water[2], 0.7)]]);   // fading away with depth
        g.globalCompositeOperation = 'source-over'; g.fillRect(sx - 300 * S, hzS, 600 * S, H - hzS);
        g.restore();
      }

      // ── build / resize ──
      function repaint(L){
        for (const lay of [skyL, cityL]){
          const g = lay.cx;
          g.save(); g.setTransform(lay.dpr, 0, 0, lay.dpr, 0, 0); g.clearRect(0, 0, lay.cv.width, lay.cv.height); g.restore();
        }
        { const g = skyL.cx;
          g.save(); g.setTransform(skyL.dpr * S, 0, 0, skyL.dpr * S, skyL.dpr * OX, skyL.dpr * OY);
          paintSky(g, L); g.restore(); }
        { const g = cityL.cx;
          g.save(); g.setTransform(cityL.dpr * S, 0, 0, cityL.dpr * S, cityL.dpr * OX, cityL.dpr * OY);
          paintCity(g, L); paintWater(g, L); g.restore(); }
        // the mirror needs the WHOLE picture, so compose the two into a scratch
        // layer first (once per repaint, not per frame)
        { const g = mirL.cx;
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, mirL.cv.width, mirL.cv.height);
          g.drawImage(skyL.cv, 0, 0, mirL.cv.width, mirL.cv.height);
          g.drawImage(cityL.cv, 0, 0, mirL.cv.width, mirL.cv.height);
          g.restore(); }
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
        skyL = makeLayer(W, H, DPR); cityL = makeLayer(W, H, DPR);
        mirL = makeLayer(W, H, 0.5); reflL = makeLayer(W, H, 0.5);
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
      const NY_PERIOD = 300, NY_FIRST = 120;                      // the new-year show on the tower
      const DRONE_PERIOD = 210, DRONE_FIRST = 55;                 // the drone show
      let nextNY = NY_FIRST, nextDrones = DRONE_FIRST;
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
      const HELI = { t0: 24, period: 80, flying: false, taken: false, gone: false, lift: 0, spin: 0, pos: null };
      const CARS = Array.from({ length: 44 }, (_, i) => ({ x: psr(i + 60) * DW, v: (psr(i + 61) < 0.5 ? -1 : 1) * (40 + psr(i + 62) * 70), lane: psr(i + 63) < 0.5 ? 0 : 1 }));
      const TWINKLE = Array.from({ length: 40 }, (_, i) => ({ x: psr(i + 70) * DW, y: psr(i + 71) * 420, ph: psr(i + 72) * TAU, sp: 1 + psr(i + 73) * 2 }));
      const GLINTS = Array.from({ length: 30 }, (_, i) => ({ dx: (psr(i + 80) - 0.5) * 380 * (0.4 + psr(i + 81)), y: HZ + 6 + psr(i + 82) * 90, ph: psr(i + 83) * TAU }));

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

      // ── NEW-YEAR FIREWORKS ON THE BURJ ──────────────────────────────────────
      //    The real thing does not launch from the ground: gold fires straight
      //    OUT OF THE TOWER'S FLANKS at a dozen heights at once, a curtain pours
      //    down the facade, and shells open in the sky above. Emitters are placed
      //    on the tower's own silhouette (BURJ.lobes gives its half-width at any
      //    height), so the jets always leave the building's real edge.
      const NY = { t0: -99, len: 22, jets: [], sparks: [], fall: [], flash: [] };
      function burjHalfWidthAt(y){
        // the widest lobe still standing at this height, as a half-width
        let hw = 8;                                                  // the core's half-width; the lobes widen it lower down
        for (const lb of BURJ.lobes){ if (BURJ.base - lb.h <= y) hw = Math.max(hw, Math.abs(lb.x + lb.w / 2 - BX) + lb.w / 2); }
        return hw;
      }
      function startNY(t){
        if (t - NY.t0 < NY.len) return;
        NY.t0 = t; NY.jets.length = 0; NY.sparks.length = 0; NY.fall.length = 0; NY.flash.length = 0;
        const top = BURJ.bodyTop, base = BURJ.base - 30;
        for (let i = 0; i < 15; i++){                                  // fifteen heights, both sides
          const k = i / 14, y = lerp(base, top + 30, k), hw = burjHalfWidthAt(y);
          for (const side of [-1, 1])
            NY.jets.push({ x: BX + side * hw, y, side, at: 0.35 + k * 0.9 + (side < 0 ? 0 : 0.12),
                           every: 1.2 + psr(i * 3 + (side > 0 ? 1 : 0)) * 1.1, last: -99 });
        }
        for (let i = 0; i < 6; i++) NY.jets.push({ x: BX, y: BURJ.spireTop + 40, side: 0, at: 2.4 + i * 3.2, every: 3.4, last: -99, shell: true });
      }
      function nyFire(t, j){
        const n = j.shell ? 0 : 30;
        for (let k = 0; k < n; k++){
          const spread = rnd(-0.34, 0.34), sp = rnd(55, 165);           // SHORT and flat — a jet at the tower, not a shower over the city
          NY.sparks.push({ x: j.x, y: j.y, vx: j.side * Math.cos(spread) * sp, vy: Math.sin(spread) * sp - rnd(20, 95),
                           t0: t, life: rnd(0.6, 1.25), r: rnd(1.8, 3.6), hue: 38 + rnd(-14, 14) });
        }
        if (!j.shell) NY.flash.push({ x: j.x, y: j.y, side: j.side, t0: t });
        if (j.shell){                                                   // a shell opening over the spire
          const sparks = [];
          for (let k = 0; k < 90; k++){ const a = rnd(0, TAU), v = rnd(0.25, 1); sparks.push({ ca: Math.cos(a) * v, sa: Math.sin(a) * v, r: rnd(0.9, 2.3), life: rnd(1, 1.9) }); }
          FW.push({ x: BX + rnd(-160, 160), y: BURJ.spireTop - rnd(20, 150), t0: t, hue: [45, 200, 320, 140][(Math.random() * 4) | 0], sparks, rise: 0.001 });
        } else {                                                        // and a curtain pouring down the facade
          for (let k = 0; k < 8; k++) NY.fall.push({ x: j.x + rnd(-4, 4), y: j.y, t0: t + rnd(0, 0.4), life: rnd(1.4, 2.6), r: rnd(0.7, 1.7) });
        }
      }
      function drawNY(g, L, t){
        const e = t - NY.t0;
        if (e < 0 || e > NY.len + 3) return;
        // every jet keeps firing on its own beat for the whole show, so the
        // tower stays alight instead of flashing once at the start
        if (e < NY.len) for (const j of NY.jets)
          if (e >= j.at && t - j.last >= j.every){ j.last = t; nyFire(t, j); }
        g.save(); g.globalCompositeOperation = 'lighter';
        // the mouth flash where a jet leaves the facade
        for (let i = NY.flash.length - 1; i >= 0; i--){
          const f = NY.flash[i], k = (t - f.t0) / 0.28;
          if (k > 1){ NY.flash.splice(i, 1); continue; }
          glow(g, 'gold', f.x + f.side * 8, f.y, 26 * (1 - k) + 8, 0.9 * (1 - k));
        }
        // each spark is a STREAK along its own motion with a hot head — a field
        // of dots reads as dust, a field of streaks reads as fireworks
        g.lineCap = 'round';
        for (let i = NY.sparks.length - 1; i >= 0; i--){
          const q = NY.sparks[i], age = t - q.t0;
          if (age > q.life){ NY.sparks.splice(i, 1); continue; }
          const k = age / q.life;
          const x = q.x + q.vx * age, y = q.y + q.vy * age + 300 * age * age;
          const pa = Math.max(0, age - 0.055);
          const px = q.x + q.vx * pa, py = q.y + q.vy * pa + 300 * pa * pa;
          g.strokeStyle = 'hsla(' + q.hue + ',100%,' + (78 - 22 * k) + '%,' + (0.9 * (1 - k)) + ')';
          g.lineWidth = q.r * 1.5 * (1 - k * 0.35);
          g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
          g.fillStyle = 'hsla(' + q.hue + ',100%,92%,' + (1 - k) + ')';
          g.beginPath(); g.arc(x, y, q.r * 0.85 * (1 - k * 0.3), 0, TAU); g.fill();
        }
        for (let i = NY.fall.length - 1; i >= 0; i--){
          const q = NY.fall[i], age = t - q.t0;
          if (age < 0) continue;
          if (age > q.life){ NY.fall.splice(i, 1); continue; }
          const k = age / q.life, y = q.y + 120 * age * age;
          if (y > BURJ.base) continue;
          g.fillStyle = 'rgba(255,' + (210 - 50 * k) + ',130,' + (0.85 * (1 - k)) + ')';
          g.fillRect(q.x - q.r / 2, y, q.r, q.r * 3.2);
        }
        glow(g, 'gold', BX, BURJ.base - 240, 300, 0.05 * Math.min(1, e / 2) * Math.max(0, 1 - (e - NY.len) / 3));
        g.fillStyle = rgb([255, 190, 110], 0.07 * Math.max(0, 1 - e / NY.len));   // the tower's light on the water
        g.fillRect(BX - 260, HZ, 520, 130);
        g.restore();
      }

      // ── THE DRONE SHOW ──────────────────────────────────────────────────────
      //    A swarm climbs out of the left horizon, then FORMS SHAPES in the sky
      //    and morphs between them — a star, a heart, a palm, a ring — each drone
      //    easing to its own point with a little drift so the figure breathes.
      //    Parked in the LEFT pocket of sky on purpose: the game card sits in the
      //    middle, so a formation there would be hidden behind it.
      const DR = { n: 44, cx: 300, cy: 245, r: 150, t0: -99, len: 34, list: [], shape: 0 };
      const SHAPES = ['star', 'heart', 'palm', 'ring'];
      function shapePoint(kind, i, n){
        const u = i / n;
        if (kind === 'star'){
          const a = u * TAU * 2.5 % TAU, spike = (Math.floor(u * 10) % 2) ? 0.45 : 1;
          const rr = spike, ang = -Math.PI / 2 + u * TAU;
          return { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr };
        }
        if (kind === 'heart'){
          const th = u * TAU;
          return { x: 16 * Math.pow(Math.sin(th), 3) / 17, y: -(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) / 17 };
        }
        if (kind === 'palm'){
          if (u < 0.34){ const k = u / 0.34; return { x: -0.06 + 0.12 * k * k, y: 1 - k * 1.15 }; }   // the trunk
          const f = (u - 0.34) / 0.66, blade = Math.floor(f * 6), tt = (f * 6) % 1;
          const a = -Math.PI * 0.92 + blade * (Math.PI * 0.84 / 5);
          return { x: 0.06 + Math.cos(a) * tt * 0.95, y: -0.15 + Math.sin(a) * tt * 0.8 + tt * tt * 0.35 };
        }
        const ang = u * TAU; return { x: Math.cos(ang), y: Math.sin(ang) * 0.72 };
      }
      function startDrones(t){
        if (t - DR.t0 < DR.len) return;
        DR.t0 = t; DR.shape = 0; DR.list.length = 0;
        for (let i = 0; i < DR.n; i++)
          DR.list.push({ i, x: -140 + psr(i + 20) * 120, y: HZ - 40 + psr(i + 21) * 30,
                         px: 0, py: 0, ph: psr(i + 22) * TAU, hue: (i / DR.n) * 360 });
      }
      function drawDrones(g, L, t, dt){
        const e = t - DR.t0;
        if (e < 0 || e > DR.len + 2 || !DR.list.length) return;
        const IN = 3.2, OUT = DR.len - 3.5;
        const per = (OUT - IN) / SHAPES.length;
        const si = Math.max(0, Math.min(SHAPES.length - 1, Math.floor((e - IN) / per)));
        const sk = clamp01(((e - IN) % per) / per);
        const kind = SHAPES[si], nextKind = SHAPES[Math.min(SHAPES.length - 1, si + 1)];
        const morph = sk > 0.82 ? smooth((sk - 0.82) / 0.18) : 0;       // slide into the next figure
        const fade = e < 1.2 ? e / 1.2 : (e > OUT ? Math.max(0, 1 - (e - OUT) / 3.5) : 1);
        const spin = Math.sin(e * 0.16) * 0.25;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const d of DR.list){
          let tx, ty;
          if (e < IN){                                                   // climbing out of the horizon
            const k = smooth(clamp01(e / IN)), a = shapePoint(kind, d.i, DR.n);
            tx = lerp(d.x, DR.cx + a.x * DR.r, k); ty = lerp(d.y, DR.cy + a.y * DR.r, k);
          } else if (e > OUT){                                           // and away over the sea
            const k = smooth(clamp01((e - OUT) / 3.5)), a = shapePoint(kind, d.i, DR.n);
            tx = lerp(DR.cx + a.x * DR.r, DR.cx - 500 - psr(d.i) * 300, k);
            ty = lerp(DR.cy + a.y * DR.r, 40 + psr(d.i + 7) * 60, k);
          } else {
            const A = shapePoint(kind, d.i, DR.n), B = shapePoint(nextKind, d.i, DR.n);
            const ax = lerp(A.x, B.x, morph), ay = lerp(A.y, B.y, morph);
            const ca = Math.cos(spin), sa = Math.sin(spin);
            tx = DR.cx + (ax * ca - ay * sa) * DR.r; ty = DR.cy + (ax * sa + ay * ca) * DR.r;
          }
          tx += Math.sin(t * 1.3 + d.ph) * 3; ty += Math.cos(t * 1.1 + d.ph) * 3;   // the figure breathes
          d.px = d.px || tx; d.py = d.py || ty;
          d.px += (tx - d.px) * Math.min(1, dt * 4.5); d.py += (ty - d.py) * Math.min(1, dt * 4.5);
          const hue = (d.hue + e * 26 + si * 70) % 360;
          const a = fade * (0.7 + 0.3 * Math.sin(t * 3 + d.ph));
          drawDrone(g, d, hue, a, t, tx - d.px);
        }
        g.restore();
      }
      // one machine: a body, four arms, four rotor discs blurred by their own
      // spin, skids, a white nav strobe and the coloured belly light that draws
      // the figure. Small — but at this size it still reads as a quadcopter
      // rather than a dot, which is the whole point of a drone show.
      function drawDrone(g, d, hue, a, t, vx){
        const S2 = 4.6, tilt = Math.max(-0.5, Math.min(0.5, vx * 0.05));   // it banks the way it is heading
        g.save(); g.translate(d.px, d.py); g.rotate(tilt);
        g.globalAlpha = a;
        // the glow it throws, so the formation still reads from far away
        g.globalAlpha = a * 0.20; g.drawImage(sprite('white'), -S2 * 2.4, -S2 * 2.4, S2 * 4.8, S2 * 4.8); g.globalAlpha = a;
        // arms
        g.strokeStyle = 'rgba(232,238,250,0.95)'; g.lineWidth = 0.9; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-S2, -S2 * 0.62); g.lineTo(S2, S2 * 0.62);
        g.moveTo(-S2, S2 * 0.62); g.lineTo(S2, -S2 * 0.62);
        g.stroke();
        // four rotor discs, blurred by the spin
        const blur = 0.55 + 0.45 * Math.sin(t * 22 + d.ph);
        g.strokeStyle = 'rgba(210,225,255,' + (0.45 + 0.3 * blur) + ')'; g.lineWidth = 0.7;
        for (const [ox, oy] of [[-S2, -S2 * 0.62], [S2, S2 * 0.62], [-S2, S2 * 0.62], [S2, -S2 * 0.62]]){
          g.beginPath(); g.ellipse(ox, oy, S2 * 0.62, S2 * 0.2 + S2 * 0.16 * blur, 0, 0, TAU); g.stroke();
        }
        // the body and its skids
        g.fillStyle = 'rgba(30,36,54,0.95)';
        g.beginPath(); g.ellipse(0, 0, S2 * 0.52, S2 * 0.36, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(225,232,248,0.9)'; g.fillRect(-S2 * 0.5, -S2 * 0.34, S2, S2 * 0.2);
        g.strokeStyle = 'rgba(200,212,236,0.8)'; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(-S2 * 0.4, S2 * 0.3); g.lineTo(-S2 * 0.5, S2 * 0.62);
        g.moveTo(S2 * 0.4, S2 * 0.3); g.lineTo(S2 * 0.5, S2 * 0.62); g.stroke();
        // the belly light — this is the pixel that paints the figure
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = a * 0.55;                                        // a COLOURED halo, so the figure reads in its own hue
        g.fillStyle = 'hsla(' + hue + ',100%,62%,1)';
        g.beginPath(); g.arc(0, S2 * 0.36, S2 * 1.15, 0, TAU); g.fill();
        g.globalAlpha = a;
        g.fillStyle = 'hsla(' + hue + ',100%,72%,1)';
        g.beginPath(); g.arc(0, S2 * 0.36, S2 * 0.46, 0, TAU); g.fill();
        g.fillStyle = 'hsla(' + hue + ',100%,94%,1)';
        g.beginPath(); g.arc(0, S2 * 0.36, S2 * 0.2, 0, TAU); g.fill();
        // a white strobe, out of step with its neighbours
        if (((t * 1.6 + d.ph) % 1) < 0.1){ g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); g.arc(S2 * 0.9, -S2 * 0.56, S2 * 0.24, 0, TAU); g.fill(); }
        g.restore();
      }

      // ── clicks (design coords) ──
      function onClick(e){
        if (stopped) return;
        if (e.target.closest && e.target.closest(UI_SEL)) return;
        const [mx, my] = toDesign(e.clientX, e.clientY), t = lastT;
        if (UFO.hit && UFO.st !== 'off' && Math.hypot(mx - UFO.hit[0], my - UFO.hit[1]) < UFO.hit[2]){ ufoRelease(t); return; }
        for (const m of MIS.inc) if (Math.abs(mx - m.x) < 28 && Math.abs(my - m.y) < 28){ MIS.inc.splice(MIS.inc.indexOf(m), 1); popMissile(t, m.x, m.y); return; }
        if (Math.abs(mx - BX) < 70 && my > BURJ.top - 20 && my < HZ){
          const r = Math.random();
          r < 0.45 ? startShow(t, 14) : r < 0.8 ? startNY(t) : fireworks(t, 4);   // LED show / new-year fireworks / a burst
          return; }
        for (const b of BOATS) if (Math.abs(mx - b.x) < 44 * b.s && Math.abs(my - b.y) < 30){ b.blinkUntil = t + 2.2; return; }
        if (Math.hypot(mx - AIN.x, my - AIN.y) < AIN.r + 16){ spinWheel(t); return; }
        if (mx > ALARAB.x - 40 && mx < ALARAB.x + 80 && my > (ALARAB.top || HZ - 272) - 44 && my < HZ){ washAlArab(t); startMissiles(t); return; }
        if (((mx - MUSEUM.x) / (MUSEUM.rx + 10)) ** 2 + ((my - MUSEUM.y) / (MUSEUM.ry + 10)) ** 2 < 1){ museumRing(t); return; }
        if (mx > LAKE.x0 && mx < LAKE.x1 && Math.abs(my - HZ) < 34){ startFountain(t, 20); return; }
        for (const T of TOWERS){ const d = T.w + (T.d || T.w * 0.42); if (mx > T.x && mx < T.x + d && my > HZ - T.h - 30 && my < HZ){ T.boostUntil = t + 5; return; } }
        if (my > HZ + 8){ dolphin(t, mx); return; }
        if (mx < 620 && my < HZ - 260){ startDrones(t); return; }     // the left sky: the drone show
        if (my < HZ - 200){ fireworks(t, 1, mx, my); return; }
      }

      // ── drawing the living city (design coords) ──
      function drawLiving(g, L, t, dt){
        const night = L.night;
        // schedules
        if (t > nextShow){ nextShow += SHOW_PERIOD; startShow(t, 16); }
        if (t > nextFn){ nextFn += FN_PERIOD; startFountain(t, 24); }
        if (t > nextFw){ nextFw += FW_PERIOD; fireworks(t, 5); }
        if (t > nextNY){ nextNY += NY_PERIOD; startNY(t); }
        if (t > nextDrones){ nextDrones += DRONE_PERIOD; startDrones(t); }
        if (SHOW && t - SHOW.t0 > SHOW.len) SHOW = null;
        if (FOUNTAIN && t - FOUNTAIN.t0 > FOUNTAIN.len) FOUNTAIN = null;

        drawTwinkle(g, L, t);
        drawDrift(g, L, t);
        drawShooters(g, L, t);
        drawBirds(g, L, t, dt);
        drawPlane(g, L, t);
        drawFarLife(g, L, t);
        drawWinLife(g, L, t);
        drawAin(g, L, t, dt);
        drawAlArabLive(g, L, t);
        drawSailLife(g, L, t);
        drawFrameLive(g, L, t);
        drawMuseumLive(g, L, t);
        drawMuseumFx(g, t);
        drawBeacons(g, L, t);
        drawTowerBoost(g, L, t);
        drawBurjLive(g, L, t);
        drawTraffic(g, L, t, dt);
        drawShoreLife(g, L, t);
        drawPalms(g, L, t);
        drawGlints(g, L, t);
        drawBoats(g, L, t, dt);
        drawDolphins(g, L, t);
        drawFountain(g, L, t);
        drawFireworks(g, L, t);
        drawNY(g, L, t);
        drawDrones(g, L, t, dt);
        drawMissiles(g, L, t, dt);
        drawHeli(g, L, t);
        updateUfo(t, dt); drawUfo(g, L, t);
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
        // the atrium's fabric wall glows from inside — warm by default, any colour
        // on a click, RED while the alert is up — and the sail flares as it changes
        const k = clamp01((t - washT0) / 1.2), flare = Math.sin(k * Math.PI);
        const alertK = clamp01((MIS.alertT0 + ALERT_LEN - t) / ALERT_LEN);
        let col = mixc(washFrom, washTo, smooth(k));
        if (alertK > 0) col = mixc(col, [255, 60, 50], alertK * (0.55 + 0.45 * Math.sin(t * 12)));
        ALARAB.wash = col;
        const { x, base } = ALARAB;
        g.save(); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.14 + 0.5 * L.night + 0.3 * flare + 0.25 * alertK;
        g.fillStyle = lgc('wash' + (col.map(v => v | 0).join(',')), g, x + 30, 0, x + 64, 0, [[0, rgb(col, 0)], [0.5, rgb(col, 0.7)], [1, rgb(col, 0)]]);
        atriumPath(g); g.fill();
        if (flare > 0.02){ g.globalAlpha = 0.35 * flare; g.fillStyle = rgb(col); sailPath(g); g.fill(); }
        g.restore();
        if ((t * 1.2 % 1) < 0.12) glow(g, 'rose', ALARAB.mastTop[0], ALARAB.mastTop[1], 6, 1);    // the mast beacon
        glow(g, 'warm', x + 30, base + 6, 70, 0.10 + 0.2 * L.night);                              // its light on the water
      }

      // ── THE INTERCEPTION SHOW ───────────────────────────────────────────────
      // A salvo of one to three rockets dives in from the right on grey smoke. As
      // the first crosses into range the Burj Al Arab's mast raises the ALERT
      // (radar rings, the atrium pulsing red). When a rocket closes past mid-city
      // an INTERCEPTOR leaves the mast in a flash and a bloom of smoke, builds
      // speed and CURVES onto it — a turn-rate limit makes it bank, so it flies a
      // real pursuit curve instead of a straight line. The KILL is a white flash
      // over the whole picture, a fireball, a double shockwave, burning debris on
      // smoke trails, a cloud that drifts and thins, the burst's light on the
      // water, and a short shake. Every 3-4.5 min, on an Al Arab click, and a
      // click on a rocket pops it early.
      const ALERT_LEN = 3.2;
      const MIS = { nextAt: 38, inc: [], def: [], booms: [], debris: [], smoke: [], flash: null, alertT0: -99, id: 0 };
      const MTRAIL = [];
      let shakeT0 = -99;
      const shakeAmp = t => { const k = (t - shakeT0) / 0.6; return k < 0 || k > 1 ? 0 : 5 * (1 - k) * (1 - k) * Math.sin(k * 42); };
      function startMissiles(t){
        if (MIS.inc.length || MIS.booms.length) return;
        const n = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
        for (let i = 0; i < n; i++)
          MIS.inc.push({ id: ++MIS.id, x: DW + 70 + i * 210 + rnd(0, 90), y: 120 + rnd(0, 120), vx: -(150 + rnd(0, 50)), vy: 16 + rnd(0, 16), hasDef: false });
        MIS.nextAt = null; MIS.alertT0 = -99;
      }
      function launchInterceptor(t, target){
        const [mx, my] = ALARAB.mastTop;
        MIS.def.push({ x: mx, y: my, ang: -1.25, t0: t, target: target.id });
        target.hasDef = true;
        for (let k = 0; k < 12; k++) MIS.smoke.push({ x: mx + rnd(-6, 6), y: my + rnd(-2, 10), vx: rnd(-16, 16), vy: rnd(-8, 12), r: rnd(3, 8), t0: t, life: 1.5, c: '235,228,214', a: 0.5 });
        MIS.flash = { x: mx, y: my, t0: t };
      }
      function popMissile(t, x, y){
        MIS.booms.push({ x, y, t0: t }); shakeT0 = t;
        const sparks = [];
        for (let k = 0; k < 110; k++){ const a = rnd(0, TAU), v = rnd(0.2, 1); sparks.push({ ca: Math.cos(a) * v, sa: Math.sin(a) * v, r: rnd(0.8, 2.4), life: rnd(0.7, 1.7) }); }
        FW.push({ x, y, t0: t, hue: 28 + rnd(-12, 14), sparks, rise: 0.001 });
        for (let k = 0; k < 14; k++){ const a = rnd(0, TAU), v = rnd(70, 230); MIS.debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, t0: t, life: rnd(1.2, 2.4), r: rnd(1, 2.4) }); }
        for (let k = 0; k < 10; k++) MIS.smoke.push({ x: x + rnd(-14, 14), y: y + rnd(-12, 12), vx: rnd(-20, 6), vy: rnd(-24, -6), r: rnd(10, 24), t0: t, life: 3.4, c: '96,92,102', a: 0.45 });
      }
      // a drawn rocket: body, nose cone, fins, and a hot exhaust plume
      function drawRocket(g, x, y, ang, len, body, flame){
        const h = len * 0.2;
        g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = body;
        g.beginPath(); g.moveTo(-len * 0.5, -h / 2); g.lineTo(len * 0.26, -h / 2); g.lineTo(len * 0.5, 0); g.lineTo(len * 0.26, h / 2); g.lineTo(-len * 0.5, h / 2); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(-len * 0.5, -h / 2); g.lineTo(-len * 0.36, -h * 1.5); g.lineTo(-len * 0.2, -h / 2); g.closePath();
        g.moveTo(-len * 0.5, h / 2); g.lineTo(-len * 0.36, h * 1.5); g.lineTo(-len * 0.2, h / 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-len * 0.42, -h * 0.5, len * 0.6, h * 0.28);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = flame;
        g.beginPath(); g.moveTo(-len * 0.5, -h * 0.45); g.lineTo(-len * (0.95 + 0.3 * Math.random()), 0); g.lineTo(-len * 0.5, h * 0.45); g.closePath(); g.fill();
        g.restore();
        glow(g, 'gold', x - Math.cos(ang) * len * 0.6, y - Math.sin(ang) * len * 0.6, len * 0.45, 0.85);
      }
      function drawMissiles(g, L, t, dt){
        if (!MIS.inc.length && !MIS.booms.length && !MIS.def.length){
          if (MIS.nextAt == null) MIS.nextAt = t + 180 + rnd(0, 90);
          if (t >= MIS.nextAt) startMissiles(t);
        }
        // smoke: the trails behind everything, then the clouds
        for (let i = MTRAIL.length - 1; i >= 0; i--){
          const q = MTRAIL[i], age = t - q.t0;
          if (age > q.life){ MTRAIL.splice(i, 1); continue; }
          const k = age / q.life;
          g.fillStyle = 'rgba(' + q.c + ',' + (q.a * (1 - k)) + ')';
          g.beginPath(); g.arc(q.x + q.vx * age, q.y - age * 5, q.r + age * q.grow, 0, TAU); g.fill();
        }
        for (let i = MIS.smoke.length - 1; i >= 0; i--){
          const q = MIS.smoke[i], age = t - q.t0;
          if (age > q.life){ MIS.smoke.splice(i, 1); continue; }
          const k = age / q.life;
          g.fillStyle = 'rgba(' + q.c + ',' + (q.a * (1 - k) * Math.min(1, age * 6)) + ')';
          g.beginPath(); g.arc(q.x + q.vx * age, q.y + q.vy * age, q.r * (1 + k * 1.8), 0, TAU); g.fill();
        }
        // the alert: radar rings leaving the mast
        const al = t - MIS.alertT0;
        if (al >= 0 && al < ALERT_LEN){
          const [mx, my] = ALARAB.mastTop;
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 3; i++){
            const k = (al * 0.75 + i * 0.33) % 1;
            g.strokeStyle = 'rgba(120,230,255,' + (0.55 * (1 - k) * (1 - al / ALERT_LEN)) + ')'; g.lineWidth = 1.6;
            g.beginPath(); g.arc(mx, my, 6 + k * 200, 0, TAU); g.stroke();
          }
          glow(g, 'cyan', mx, my, 13, (0.4 + 0.5 * Math.abs(Math.sin(al * 9))) * (1 - al / ALERT_LEN));
          g.restore();
        }
        // the incoming salvo
        for (let i = MIS.inc.length - 1; i >= 0; i--){
          const m = MIS.inc[i];
          m.x += m.vx * dt; m.y += m.vy * dt;
          const ang = Math.atan2(m.vy, m.vx);
          if (Math.random() < dt * 55) MTRAIL.push({ x: m.x + 16, y: m.y, vx: 6, t0: t, life: 1.9, r: 2.2, grow: 9, a: 0.42, c: '112,112,124' });
          drawRocket(g, m.x, m.y, ang, 34, 'rgb(46,48,60)', 'rgba(255,190,90,0.95)');
          glow(g, 'rose', m.x + Math.cos(ang) * 17, m.y + Math.sin(ang) * 17, 5, 0.75);           // the hot nose
          if (m.x < 1340 && t - MIS.alertT0 > 20) MIS.alertT0 = t;
          if (!m.hasDef && m.x < 1020) launchInterceptor(t, m);
          if (m.x < -80){ MIS.inc.splice(i, 1); }
          else if (m.y > HZ - 34){ MIS.inc.splice(i, 1); popMissile(t, m.x, HZ - 40); }
        }
        // the launch flash at the mast
        if (MIS.flash){ const k = (t - MIS.flash.t0) / 0.35; if (k > 1) MIS.flash = null; else glow(g, 'white', MIS.flash.x, MIS.flash.y, 28 * (1 - k) + 6, 1 - k); }
        // the interceptors: build speed, bank onto the target, strike
        for (let i = MIS.def.length - 1; i >= 0; i--){
          const d = MIS.def[i], tg = MIS.inc.find(m => m.id === d.target);
          if (!tg){                                                                                // its target is already gone
            MIS.def.splice(i, 1);
            for (let k = 0; k < 4; k++) MIS.smoke.push({ x: d.x, y: d.y, vx: rnd(-10, 10), vy: rnd(-10, 10), r: 3, t0: t, life: 0.9, c: '230,222,206', a: 0.4 });
            continue;
          }
          const age = t - d.t0, spd = Math.min(460, 90 + 620 * age);
          let da = Math.atan2(tg.y - d.y, tg.x - d.x) - d.ang;
          while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          const turn = 3.4 * dt;                                                                   // the turn-rate limit: it banks, it does not snap
          d.ang += Math.max(-turn, Math.min(turn, da));
          d.x += Math.cos(d.ang) * spd * dt; d.y += Math.sin(d.ang) * spd * dt;
          if (Math.random() < dt * 90) MTRAIL.push({ x: d.x, y: d.y, vx: 0, t0: t, life: 1.1, r: 1.6, grow: 6, a: 0.5, c: '255,236,208' });
          drawRocket(g, d.x, d.y, d.ang, 20, 'rgb(225,230,240)', 'rgba(180,230,255,0.95)');
          if (Math.hypot(tg.x - d.x, tg.y - d.y) < 22){
            popMissile(t, tg.x, tg.y);
            MIS.inc.splice(MIS.inc.indexOf(tg), 1); MIS.def.splice(i, 1);
          }
        }
        // burning debris on its own smoke
        for (let i = MIS.debris.length - 1; i >= 0; i--){
          const q = MIS.debris[i], age = t - q.t0;
          if (age > q.life){ MIS.debris.splice(i, 1); continue; }
          const k = age / q.life, px = q.x + q.vx * age, py = q.y + q.vy * age + 130 * age * age;
          if (Math.random() < dt * 18) MTRAIL.push({ x: px, y: py, vx: 0, t0: t, life: 0.8, r: 1.2, grow: 5, a: 0.3, c: '120,116,124' });
          g.fillStyle = 'rgba(255,' + (140 + 90 * (1 - k)) + ',80,' + (1 - k) + ')';
          g.beginPath(); g.arc(px, py, q.r * (1 - k * 0.4), 0, TAU); g.fill();
        }
        // the kills
        for (let i = MIS.booms.length - 1; i >= 0; i--){
          const b = MIS.booms[i], e = t - b.t0;
          if (e < 0 || e > 1.6){ MIS.booms.splice(i, 1); continue; }
          g.save(); g.globalCompositeOperation = 'lighter';
          if (e < 0.5){                                                                            // the fireball
            const k = e / 0.5;
            glow(g, 'white', b.x, b.y, 14 + k * 34, 1 - k);
            g.fillStyle = 'rgba(255,' + (200 - 90 * k) + ',' + (120 - 90 * k) + ',' + (0.85 * (1 - k)) + ')';
            g.beginPath(); g.arc(b.x, b.y, 6 + k * 30, 0, TAU); g.fill();
          }
          for (const [sp, wd, col] of [[150, 3.2, '255,220,160'], [90, 1.8, '160,220,255']]){      // a double shockwave
            const r = e * sp, k = clamp01(e / (sp > 120 ? 1.2 : 1.5));
            if (k < 1){ g.strokeStyle = 'rgba(' + col + ',' + (0.55 * (1 - k)) + ')'; g.lineWidth = wd * (1 - k) + 0.6; g.beginPath(); g.arc(b.x, b.y, 10 + r, 0, TAU); g.stroke(); }
          }
          g.fillStyle = 'rgba(255,190,120,' + (0.13 * Math.max(0, 1 - e / 1.2)) + ')';             // its light on the water
          g.fillRect(b.x - 220, HZ, 440, 120);
          g.restore();
        }
        // the white flash over the whole picture, at the moment of the kill
        for (const b of MIS.booms){ const e = t - b.t0; if (e >= 0 && e < 0.22){ g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(230,240,255,' + (0.30 * (1 - e / 0.22)) + ')'; g.fillRect(-400, -200, DW + 800, DH + 400); g.restore(); } }
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
        for (const w of BURJ.wins){ const on = 0.5 + 0.5 * Math.sin(t * w.sp * 1.7 + w.ph); if (on > 0.75 && night > 0.1){ g.fillStyle = rgb([255, 235, 200], (on - 0.75) * 4 * night); g.fillRect(w.x - 0.3, w.y - 0.3, 2.8, 3); } }
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
        for (let i = 0; i < 90; i++){ const lb = BURJ.lobes[i % BURJ.lobes.length], k = psr(i * 3 + Math.floor(t * 12)), y = BURJ.base - lb.h + 4 + k * (lb.h - 8); g.fillStyle = rgb(i % 3 ? pal : [255, 255, 255], 0.35 + 0.5 * psr(i + Math.floor(t * 12) * 2)); g.fillRect(lb.x + psr(i + 5 + Math.floor(t * 9)) * (lb.w - 2.6), y, 2.6, 2); }
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
        for (const c of CARS){
          c.x += c.v * dt; if (c.x > DW + 20) c.x = -20; if (c.x < -20) c.x = DW + 20;
          // the road does not cross the fountain lake — the promenade runs round
          // it, so a car over that span is simply not on the road
          if (c.x > LAKE.x0 - 14 && c.x < LAKE.x1 + 14) continue;
          const y = HZ - 14 + c.lane * 3.5, head = c.v < 0;
          g.fillStyle = head ? 'rgba(255,245,220,' + a + ')' : 'rgba(255,60,50,' + a + ')'; g.fillRect(c.x, y, head ? 3 : 2.4, 1.6);
        }
      }
      function drawGlints(g, L, t){
        const a = 0.6 * L.sunPath; if (a < 0.03) return;
        g.fillStyle = '#fff5dc';
        const gx = sunAt(L.ph).x;
        for (const s of GLINTS){ const k = 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph + s.y * 0.3); if (k > 0.55){ g.globalAlpha = (k - 0.55) * 2 * a; g.fillRect(gx + s.dx - 3 * k, s.y, 6 * k, 1.1); } }
        g.globalAlpha = 1;
      }
      function drawBoats(g, L, t, dt){
        const night = L.night;
        for (const b of BOATS){
          if (b.gone) continue;
          if (!b.taken) b.x += b.dir * b.spd * dt * b.s; if (b.dir > 0 && b.x > DW + 120){ b.x = -120; b.y = HZ + 16 + rnd(0, 60); } if (b.dir < 0 && b.x < -120){ b.x = DW + 120; b.y = HZ + 16 + rnd(0, 60); }
          const bob = Math.sin(t * 1.4 + b.ph) * 1.2, x = b.x, y = b.y + bob + (b.lift || 0), s = b.s * (0.7 + 0.3 * (b.y - HZ) / 76);
          const blink = b.blinkUntil > t, lit = blink ? ((t * 10 % 1) < 0.5 ? 1 : 0.1) : 0.5 + 0.5 * night;
          // wake
          g.strokeStyle = 'rgba(255,255,255,' + (0.10 + 0.08 * night) + ')'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x - b.dir * 16 * s, y + 3); g.lineTo(x - b.dir * (60 + b.spd) * s, y + 8 * s); g.moveTo(x - b.dir * 16 * s, y + 3); g.lineTo(x - b.dir * (60 + b.spd) * s, y - 1); g.stroke();
          g.save(); g.translate(x, y);
          if (b.lift) g.rotate(Math.sin((b.spin || 0) * 1.7) * 0.35 * Math.min(1, -b.lift / 40));   // it turns as the beam takes it
          g.scale(b.dir * s, s);
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
          if (b.lift) continue;
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
        if (HELI.gone){ HELI.flying = false; return; }
        const e = (t - HELI.t0) % HELI.period;
        HELI.flying = e >= 0 && e <= 30;
        if (!HELI.flying) return;
        // in from the right high, down to the helipad, wait, up and away
        const pad = ALARAB.helipad || [160, HZ - 236];
        let x, y; const x0h = DW + 60;
        if (HELI.taken){ x = HELI.pos ? HELI.pos[0] : x0h; y = HELI.pos ? HELI.pos[1] : 150; }
        else if (e < 10){ const k = smooth(e / 10); x = lerp(DW + 60, pad[0], k); y = lerp(150, pad[1] - 60, k); }
        else if (e < 13){ const k = smooth((e - 10) / 3); x = pad[0]; y = lerp(pad[1] - 60, pad[1] - 9, k); }
        else if (e < 19){ x = pad[0]; y = pad[1] - 9; }
        else if (e < 22){ const k = smooth((e - 19) / 3); x = pad[0] - k * 20; y = lerp(pad[1] - 9, pad[1] - 80, k); }
        else { const k = smooth((e - 22) / 8); x = lerp(pad[0] - 20, -80, k); y = lerp(pad[1] - 80, 120, k); }
        const bodyC = mixc([40, 44, 66], L.cool, 0.25);
        HELI.pos = [x, y];
        if (HELI.taken){ y += HELI.lift; }
        g.save(); g.translate(x, y);
        if (HELI.taken) g.rotate(Math.sin(HELI.spin * 1.7) * 0.4);
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
        const sh = shakeAmp(t), shx = sh * S, shy = sh * 0.4 * S;    // a kill shakes the picture
        ctx.drawImage(skyL.cv, shx, shy, W, H);
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * (OX + shx), DPR * (OY + shy));
        drawSunMoon(ctx, L);                                        // live, so they glide instead of stepping
        ctx.restore();
        ctx.drawImage(cityL.cv, shx, shy, W, H);
        mark('city');
        ctx.drawImage(reflL.cv, shx, shy, W, H);
        mark('water');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * (OX + shx), DPR * (OY + shy));
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
      buildWinLife();
      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);

      window._dubai3 = BACKGROUNDS.dubai3._test = {
        seek: ph => {
          t0 = (t0 === null ? 0 : t0);
          const nt = lastT + (ph * DAY_PERIOD - (lastT % DAY_PERIOD));
          t0 -= (nt - lastT) * 1000; lastT = nt; lookKey = -1;
          // sweep everything timed off the old clock — a backward jump would
          // otherwise leave mid-flight effects with a negative elapsed time
          FW.length = 0; MFX.length = 0; SHOOTERS.length = 0; DOLPHINS.length = 0;
          MIS.inc.length = 0; MIS.def.length = 0; MIS.booms.length = 0; MIS.debris.length = 0;
          MIS.smoke.length = 0; MTRAIL.length = 0; MIS.flash = null; MIS.alertT0 = -99;
          NY.t0 = -99; NY.sparks.length = 0; NY.fall.length = 0; NY.flash.length = 0;
          DR.t0 = -99; DR.list.length = 0;
          UFO.st = 'off'; UFO.target = null; UFO.dust.length = 0;
          SHOW = null; FOUNTAIN = null; shakeT0 = -99;
          for (const b of BOATS){ b.taken = false; b.gone = false; b.lift = 0; b.spin = 0; }
          HELI.taken = false; HELI.gone = false; HELI.lift = 0;
          nextShow = nt + 8; nextFn = nt + 30; nextFw = nt + 60;
          nextNY = nt + 25; nextDrones = nt + 18; MIS.nextAt = nt + 40; UFO.nextAt = nt + 60;
        },
        look: () => LOOK, show: () => startShow(lastT, 16), fountain: () => startFountain(lastT, 24), fireworks: () => fireworks(lastT, 4),
        spin: () => spinWheel(lastT), horn: () => BOATS.forEach(b => b.blinkUntil = lastT + 2), heli: () => (HELI.t0 = lastT - 0.01),
        dolphin: () => dolphin(lastT, 760), wash: () => washAlArab(lastT), missile: () => startMissiles(lastT), ny: () => { NY.t0 = -99; startNY(lastT); }, drones: () => { DR.t0 = -99; startDrones(lastT); }, ufo: kind => { UFO.st = 'off'; UFO.nextAt = null; UFO.force = kind || null; if (kind === 'heli'){ HELI.t0 = lastT - 12; HELI.flying = true; } startUfo(lastT); return UFO.kind; }, museum: () => museumRing(lastT), plane: () => (PLANE.t0 = lastT),
        shoot: () => SHOOTERS.push({ x: rnd(200, 1400), y: rnd(40, 300), t0: lastT, ang: rnd(2.6, 3.0), len: rnd(90, 180) }),
        boats: () => BOATS, burj: () => BURJ, lobes: () => BURJ.lobes.length, busy: () => ({ show: !!SHOW, fountain: !!FOUNTAIN, fw: FW.length, refl: !!reflL, inc: MIS.inc.length, def: MIS.def.length, booms: MIS.booms.length, ufo: UFO.st, ufoKind: UFO.kind, ufoX: Math.round(UFO.x), ny: +(lastT - NY.t0 < NY.len).toString(), nySparks: NY.sparks.length, drones: DR.list.length && lastT - DR.t0 < DR.len ? DR.list.length : 0 }),
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
