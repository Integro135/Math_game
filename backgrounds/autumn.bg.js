/* ── Autumn — a golden grove in the first days of the rains ─────────────────
   window.BACKGROUNDS.autumn = { skin:'autumn', aids:'autumn', init({stage}) → cleanup }

   A small clearing in a grove at the turn of the season, seen from the
   path. Built from zero in 2026-10, nothing shared with the other scenes.

   THE PICTURE, back to front (design space 1600×900, horizon HZ = 560, the
   design width follows the window's aspect — see the RESPONSIVE note in
   init; `S` maps design → screen):
   · the SKY — a day cycle over a pale autumn sky, a low soft sun that
     stays warm all day, a moon and stars after dark, slow clouds, the
     skeins of MIGRATING STORKS crossing high up (autumn is the migration
     over Israel) in wavering V's
   · the FAR HILLS — three ranges in blue-violet haze
   · the GROVE — tall deciduous trees on BOTH sides of the clearing (the
     game card sits centre, so the middle stays low and calm): sculpted
     trunks with bark grooves, boughs forking into twigs, and CROWNS built
     from hundreds of small leaf clusters in yellow → orange → red, baked
     once into sprites; every crown breathes with the wind as a whole and
     its LEAVES LET GO one at a time — more in a gust; and every time the scene starts,
     one tree on each side stands BARE already — live swaying twigs with a
     few last leaves clinging, a thick carpet of its leaves beneath
   · the GROUND — a meadow going straw-gold, a dirt path, a wooden fence on
     the right, a leaf carpet that THICKENS where leaves land, mushrooms
     under the trees, acorns and pine cones, puddles after the rain
   · the SEA SQUILLS (חצב, Drimia maritima — THE flower of the Israeli
     autumn): tall bare stalks carrying spikes of small white six-point
     stars, open at the bottom and still buds at the tip, swaying, bees
     at the open flowers by day
   · the SNAILS — cute garden snails (big round eyes on stalks, a spiral
     shell, a glossy foot) crawling along the ground AND up the trunks,
     leaving a faint silver slime trail; they stop, look around, and tuck
     into their shell when tapped
   · the HEDGEHOG — trundles across the clearing now and then with a leaf
     stuck on its back; tap → it curls into a ball and unrolls
   · the RAIN (יורה, the first rain): a short shower every few minutes —
     the light cools, rain streaks, drops ring the puddles, the sun comes
     back and a RAINBOW stands over the hills while the last drops fall
   · drifting seed fluff, golden dust in the low sun, a dew-strung spider
     web on the fence, fireflies after dark

   THE HOUR (`lookAt(tod)`, DAY_SEC = 300): keyed looks — DAWN (mist in
   the clearing), MORNING, NOON (a high pale sun), GOLDEN HOUR (long light
   through the crowns, every leaf lit from behind), SUNSET, DUSK, NIGHT
   (moon, stars, fireflies, the crowns silver-blue). Every colour is
   interpolated; the still layers repaint as the palette drifts. Click the
   sun or the moon → the clock tweens to the next key.

   CLICKS (document listener filtered by UI_SEL): a tree → a GUST, a burst
   of leaves lets go from that crown; a snail → it tucks in and peeks out;
   the hedgehog → it curls up; a BUNNY (the unicorn valley's hopping
   rabbits, unicorns/bunny.item.js, visiting the foreground) → a sparkly
   spring and a new coat; a sea squill → a puff of bees and petals;
   the ground → a mushroom pops up where you tapped (or a leaf pile
   scatters); the sky → a skein of storks; a cloud → a shower.

   PERF (house rules as reef2 / maldives2): backing store capped at 1.5×
   and ~2.4 MP; sky, hills, trunks + crowns, ground are prebaked layers
   repainted only when the look changes; falling leaves are a few dozen
   baked sprites; snails, squills, hedgehog and rain are the per-frame
   vector work; the rAF loop drops to every 2nd display frame while frames
   run long (the first 1.2 s after init/resize excluded).
   Hooks: window._aut = BACKGROUNDS.autumn._test.  */
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
  // the unicorn valley's hopping CSS rabbits (backgrounds/unicorns/bunny.item.js),
  // borrowed as guests — loaded once, shared with the unicorn scene
  const BASE = (function(){ const sc = doc.currentScript; return sc && sc.src ? sc.src.replace(/[^/]*$/, '') : 'backgrounds/'; })();
  function needBunny(cb){
    if (window.Bunny){ cb(); return; }
    let ex = doc.querySelector('script[data-uni3dep="Bunny"]');
    if (!ex){
      ex = doc.createElement('script');
      ex.src = BASE + 'unicorns/bunny.item.js'; ex.setAttribute('data-uni3dep', 'Bunny');
      doc.head.appendChild(ex);
    }
    ex.addEventListener('load', cb); ex.addEventListener('error', cb);
  }

  function hexc(c){
    if (Array.isArray(c)) return c;
    if (c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  const rgb = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function lg(g, x0, y0, x1, y1, st){ const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rg(g, x, y, r0, r1, st){ const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function makeRng(seed){ let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 1-D value noise, periodic — used for the wind and the mist
  function noise1(x){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const h = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), u); }

  // ══════════════════════════════════════════════════════════════════════════
  // THE HOUR — keyed looks, blended
  // ══════════════════════════════════════════════════════════════════════════
  const DAY_SEC = 300;
  // sky: top / mid / horizon colours · sun: warmth of the light · daylight 0..1 ·
  // haze: colour of the far hills · ground tint · leaf light (how lit the crowns are)
  const KEYS = [
    { at: 0.00, name: 'dawn',    top: '#6E6A9E', mid: '#D9A8B4', hz: '#FFD9B0', daylight: 0.45, warm: 0.55, haze: '#9A8CB8', mist: 0.75, stars: 0.15, moon: 0.2, sunA: 0.6 },
    { at: 0.12, name: 'morning', top: '#8FB9E6', mid: '#C9E0F2', hz: '#F2E7D2', daylight: 0.92, warm: 0.25, haze: '#9DAACB', mist: 0.25, stars: 0,    moon: 0,   sunA: 0.9 },
    { at: 0.30, name: 'noon',    top: '#79AEE8', mid: '#BBD8F4', hz: '#EDE9DC', daylight: 1.0,  warm: 0.15, haze: '#A3B2CF', mist: 0,    stars: 0,    moon: 0,   sunA: 1.0 },
    { at: 0.50, name: 'golden',  top: '#8FA9D6', mid: '#F2C98E', hz: '#FFD58A', daylight: 0.88, warm: 0.85, haze: '#B49AB0', mist: 0.08, stars: 0,    moon: 0,   sunA: 1.0 },
    { at: 0.64, name: 'sunset',  top: '#5E5C9C', mid: '#E58A6A', hz: '#FFB85C', daylight: 0.62, warm: 1.0,  haze: '#8C6E98', mist: 0.1,  stars: 0.05, moon: 0.2, sunA: 0.95 },
    { at: 0.74, name: 'dusk',    top: '#2A2D5E', mid: '#6D5C8E', hz: '#D98C6C', daylight: 0.32, warm: 0.6,  haze: '#5A4E7A', mist: 0.2,  stars: 0.55, moon: 0.7, sunA: 0.4 },
    { at: 0.84, name: 'night',   top: '#0B1230', mid: '#1B2650', hz: '#3A3F6E', daylight: 0.12, warm: 0.0,  haze: '#2C3058', mist: 0.3,  stars: 1.0,  moon: 1.0, sunA: 0 },
    { at: 0.95, name: 'night',   top: '#0B1230', mid: '#1B2650', hz: '#3A3F6E', daylight: 0.12, warm: 0.0,  haze: '#2C3058', mist: 0.35, stars: 1.0,  moon: 1.0, sunA: 0 },
  ];
  const HOLD = 0.35;   // fraction of each gap held on the key before blending to the next
  function lookAt(tod){
    tod = ((tod % 1) + 1) % 1;
    let i = KEYS.length - 1;
    for (let k = 0; k < KEYS.length; k++) if (KEYS[k].at <= tod) i = k;
    const A = KEYS[i], B = KEYS[(i + 1) % KEYS.length];
    const span = ((B.at - A.at) + 1) % 1 || 1;
    const w = smooth(clamp01(((tod - A.at) / span - HOLD) / (1 - HOLD)));
    return blend(A, B, w);
  }
  function blend(A, B, w){
    const o = { name: w < 0.5 ? A.name : B.name };
    for (const k in A){
      if (k === 'at' || k === 'name') continue;
      const a = A[k], b = B[k];
      o[k] = typeof a === 'number' ? lerp(a, b, w) : mixc(hexc(a), hexc(b), w);
    }
    return o;
  }
  // the rain cools and dims the whole look at once (never per layer — it doubles up)
  function rainify(L0, k){
    if (k <= 0) return L0;
    const L = Object.assign({}, L0), grey = [150, 158, 172], dark = [60, 66, 84];
    L.top = mixc(L0.top, dark, 0.55 * k); L.mid = mixc(L0.mid, grey, 0.6 * k); L.hz = mixc(L0.hz, grey, 0.5 * k);
    L.haze = mixc(L0.haze, grey, 0.45 * k);
    L.daylight = L0.daylight * (1 - 0.45 * k); L.warm = L0.warm * (1 - 0.7 * k); L.sunA = L0.sunA * (1 - 0.9 * k);
    L.stars = L0.stars * (1 - k); L.moon = L0.moon * (1 - 0.8 * k); L.mist = L0.mist + 0.25 * k;
    return L;
  }

  window.BACKGROUNDS = window.BACKGROUNDS || {};
  window.BACKGROUNDS.autumn = {
    skin: 'autumn',
    aids: 'autumn',
    preload(){ needBunny(function(){}); },
    init({ stage }){
      let stopped = false, rafId = 0, t0 = null, lastT = 0;
      stage.innerHTML = ''; stage.style.overflow = 'hidden';
      const canvas = doc.createElement('canvas');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const UI_SEL = '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov,#settings-ov,#parent-ov';

      // ── the stage ──
      // RESPONSIVE: the design height is fixed at 900, the design WIDTH follows
      // the window's aspect so nothing is cropped (1600 on 16:9, ~1200 on a
      // landscape tablet, ~675 portrait, ~415 phone). Trees keep their 1600-space
      // x and go through AX(): left things hold to the left edge, right things to
      // the right, the middle compresses. Below DW 1000 the grove is re-planted by
      // layoutGrove(): one big tree each side, everything a fraction of the width.
      const DW0 = 1600, DH = 900, HZ = 560;
      let DW = DW0, AXK = 1, layoutDW = -1, narrow = false;
      const AX = x => x < 640 ? x * AXK : x >= 1000 ? DW - (DW0 - x) * AXK : DW / 2 + (x - 800) * AXK;
      const pickDPR = () => Math.max(0.75, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2.4e6 / Math.max(1, innerWidth * innerHeight))));
      let DPR = pickDPR(), W = 0, H = 0, S = 1, OX = 0, OY = 0;
      const perf = { gapEma: 16.7, costEma: 0, halfRate: IS_TOUCH, frames: 0, drawn: 0 };
      const PROF = { frames: 0, repaints: 0 }; let profT = 0; const PMAX = {};
      const mark = k => { const n = performance.now(); const d = n - profT; PROF[k] = (PROF[k] || 0) + d; if (d > (PMAX[k] || 0)) PMAX[k] = d; profT = n; };

      // ── the clock ──
      let tod = 0.52, todSpeed = 1, todTween = null;        // boot: the golden hour — the grove at its best
      let L = lookAt(tod), lookKey = -1;

      // ── sprites + layers ──
      const SPR = {};
      function sprite(name){
        if (SPR[name]) return SPR[name];
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
        const col = { white: '255,255,255', warm: '255,228,170', sun: '255,214,140', gold: '255,190,90', blue: '180,200,255', shade: '20,14,8', green: '190,255,120' }[name] || '255,255,255';
        g.fillStyle = rg(g, 64, 64, 0, 64, [[0, 'rgba(' + col + ',1)'], [0.3, 'rgba(' + col + ',0.4)'], [1, 'rgba(' + col + ',0)']]);
        g.fillRect(0, 0, 128, 128);
        return (SPR[name] = cv);
      }
      const glow = (g, name, x, y, r, a) => { if (a <= 0.003) return; g.globalAlpha = a; g.drawImage(sprite(name), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
      function makeLayer(w, h, dpr){
        const cv = doc.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
        const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { cv, cx, w, h, dpr };
      }
      let skyL = null, farL = null, groveL = null, groundL = null, frontL = null, vigL = null;

      // ── the wind: one slow gust value every element leans to, plus a live gust ──
      let gustAmp = 0, gustT0 = -99, gustX = 0;
      function wind(t){ return 0.25 + 0.55 * noise1(t * 0.13) + 0.2 * noise1(t * 0.61 + 7); }
      // a tap's puff: it only pushes the leaves already falling right next to it;
      // the shake itself belongs to the ONE tree / squill that was tapped (kickOf)
      function gustAt(x, t, amp){ gustAmp = amp; gustT0 = t; gustX = x; }
      // how hard a tapped thing is still shaking: 1 at the tap, dying out in ~3 s
      function kickOf(o, t, rate){ return o.kickT == null ? 0 : Math.exp(-(t - o.kickT) * rate); }

      // ══════════════════════════════════════════════════════════════════════
      // THE SKY — sun, moon, stars, clouds, the storks, the far hills
      // ══════════════════════════════════════════════════════════════════════
      // the sun rises on the left at dawn and sets on the right (an autumn sun:
      // low all day); the moon follows the same arc through the night
      function arcPos(k, top){ const a = Math.PI * (1 - clamp01(k)); const x = DW / 2 + Math.cos(a) * DW * 0.4; const y = HZ - 30 - Math.sin(a) * top; return { x, y }; }
      function sunPos(tod){ const k = tod / 0.72; const p = arcPos(k, 400); p.up = tod < 0.74; return p; }
      function moonPos(tod){ const k = (tod - 0.72) / 0.30; const p = arcPos(k, 330); p.up = tod > 0.70 || tod < 0.02; return p; }

      const STARS = []; { const r = makeRng(77); for (let i = 0; i < 150; i++) STARS.push({ x: r(), y: r() * 0.62, s: 0.6 + r() * 1.5, ph: r() * TAU, f: 0.5 + r() * 2 }); }
      function drawStars(g, t){
        const a = L.stars; if (a <= 0.01) return;
        g.fillStyle = '#FFFFFF';
        for (const s of STARS){
          const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph);
          g.globalAlpha = a * tw * 0.9; const x = s.x * DW, y = s.y * HZ;
          g.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
        }
        g.globalAlpha = 1;
      }
      function drawSunMoon(g, t){
        const sp = sunPos(tod);
        if (sp.up && L.sunA > 0.01){
          const low = clamp01((sp.y - 200) / 330);                 // 0 high … 1 at the horizon
          const col = mixc([255, 250, 225], [255, 150, 70], Math.max(low, L.warm));
          glow(g, 'warm', sp.x, sp.y, 260 + low * 120, L.sunA * (0.35 + 0.35 * L.warm));
          glow(g, 'sun', sp.x, sp.y, 120, L.sunA * 0.6);
          g.fillStyle = rgb(col); g.globalAlpha = L.sunA;
          g.beginPath(); g.arc(sp.x, sp.y, 34 + low * 10, 0, TAU); g.fill(); g.globalAlpha = 1;
        }
        const mp = moonPos(tod);
        if (mp.up && L.moon > 0.01){
          glow(g, 'blue', mp.x, mp.y, 150, L.moon * 0.35);
          g.globalAlpha = L.moon;
          g.fillStyle = '#F4F1E2'; g.beginPath(); g.arc(mp.x, mp.y, 26, 0, TAU); g.fill();
          g.fillStyle = 'rgba(190,190,180,.35)';
          g.beginPath(); g.arc(mp.x - 8, mp.y - 6, 6, 0, TAU); g.arc(mp.x + 9, mp.y + 4, 4, 0, TAU); g.arc(mp.x - 3, mp.y + 11, 3, 0, TAU); g.fill();
          g.globalAlpha = 1;
        }
      }

      // clouds — each a baked puff-cluster sprite, drifting on the wind
      const CLOUDS = [];
      function bakeCloud(seed, w, h){
        const r = makeRng(seed), cv = doc.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
        const n = 6 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++){
          const x = w * (0.18 + 0.64 * (i / (n - 1))) + (r() - 0.5) * w * 0.1, y = h * (0.62 - 0.22 * Math.sin(Math.PI * i / (n - 1))) + (r() - 0.5) * h * 0.1;
          const rad = h * (0.26 + r() * 0.16);
          g.fillStyle = rg(g, x, y - rad * 0.2, 0, rad, [[0, 'rgba(255,255,255,.95)'], [0.65, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]);
          g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
        }
        // a flat soft base
        g.fillStyle = lg(g, 0, h * 0.6, 0, h, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
        g.fillRect(w * 0.15, h * 0.6, w * 0.7, h * 0.4);
        return cv;
      }
      function buildClouds(){
        CLOUDS.length = 0; const r = makeRng(31);
        for (let i = 0; i < 6; i++){
          const w = 220 + r() * 260, h = w * (0.32 + r() * 0.12);
          CLOUDS.push({ x: r() * (DW + 400) - 200, y: 40 + r() * 190, w, h, v: 6 + r() * 8, a: 0.55 + r() * 0.35, cv: bakeCloud(100 + i, Math.round(w / 2), Math.round(h / 2)) });
        }
      }
      // the hour on the clouds: each sprite re-tinted per look (sunset pink-gold, night blue-grey)
      function tintClouds(){
        const c = mixc(mixc([255, 255, 255], [255, 190, 130], L.warm * 0.8), [70, 80, 130], 1 - L.daylight), a = 0.85 * Math.max(L.warm * 0.8, 1 - L.daylight, RAIN.k * 0.6);
        for (const C of CLOUDS){
          if (!C.cvT){ C.cvT = doc.createElement('canvas'); C.cvT.width = C.cv.width; C.cvT.height = C.cv.height; }
          const g = C.cvT.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, C.cvT.width, C.cvT.height); g.drawImage(C.cv, 0, 0);
          if (a > 0.01){ g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgb(mixc(c, [110, 112, 125], RAIN.k * 0.7), a); g.fillRect(0, 0, C.cvT.width, C.cvT.height); g.globalCompositeOperation = 'source-over'; }
        }
      }
      function drawClouds(g, t){
        const w = wind(t), day = L.daylight;
        for (const C of CLOUDS){
          C.x += (C.v + w * 10) * frameDt * (0.5 + 0.5 * day); if (C.x > DW + 220) C.x = -C.w - 100;
          g.globalAlpha = C.a * (0.35 + 0.65 * day) * (1 - RAIN.k * 0.3);
          g.drawImage(C.cvT || C.cv, C.x, C.y, C.w, C.h);
        }
        g.globalAlpha = 1;
      }

      // the storks — skeins crossing high up, each bird on its own flap phase
      const SKEINS = []; let nextSkeinAt = 14;
      function launchSkein(){
        const dir = Math.random() < 0.5 ? 1 : -1, n = 7 + Math.floor(Math.random() * 7), y = 70 + Math.random() * 150;
        const sp = 42 + Math.random() * 20, size = 0.8 + Math.random() * 0.5;
        const birds = [];
        for (let i = 0; i < n; i++){
          const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2);
          birds.push({ dx: -rank * 30 * dir, dy: side * rank * 13 * (i ? 1 : 0), ph: Math.random() * TAU, f: 2.2 + Math.random() * 0.8, wob: Math.random() * TAU });
        }
        SKEINS.push({ x: dir > 0 ? -220 : DW + 220, y, dir, sp, size, birds, t0: lastT });
      }
      function drawStork(g, x, y, s, flap, dir){
        g.save(); g.translate(x, y); g.scale(dir * s, s);
        const k = Math.cos(flap);                       // 1 wings flat … −1 folded under on the down-beat
        const L = 17 * (0.55 + 0.45 * Math.abs(k)), bend = 5 * (1 - k);
        for (const sg of [-1, 1]){
          // the wing: a tapered blade from the shoulder, drooping at the tip with the beat
          g.fillStyle = '#F4F1EA'; g.beginPath();
          g.moveTo(3, sg * 1.5); g.quadraticCurveTo(0, sg * L * 0.5, -5 + bend * 0.3, sg * L);
          g.lineTo(-9 + bend * 0.3, sg * L * 0.92); g.quadraticCurveTo(-6, sg * L * 0.45, -5, sg * 1.5); g.closePath(); g.fill();
          // black primaries on the outer third
          g.fillStyle = '#2A2A2E'; g.beginPath();
          g.moveTo(-1.5 + bend * 0.2, sg * L * 0.66); g.lineTo(-5 + bend * 0.3, sg * L); g.lineTo(-9 + bend * 0.3, sg * L * 0.92); g.lineTo(-6.5 + bend * 0.2, sg * L * 0.62); g.closePath(); g.fill();
        }
        g.fillStyle = '#F4F1EA'; g.beginPath(); g.ellipse(-1, 0, 8.5, 2.4, 0, 0, TAU); g.fill();     // the body
        g.beginPath(); g.ellipse(9, 0, 3.2, 1.8, 0, 0, TAU); g.fill();                                 // the head on its neck
        g.fillStyle = '#2A2A2E'; g.beginPath(); g.ellipse(-2, 0, 3, 1, 0, 0, TAU); g.fill();            // the dark back
        g.strokeStyle = '#D9402A'; g.lineWidth = 1.3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(12, 0); g.lineTo(18, 0.3); g.moveTo(-9, 0.4); g.lineTo(-17, 0.9); g.moveTo(-9, -0.4); g.lineTo(-17, 0.1); g.stroke();   // bill, legs
        g.restore();
      }
      function drawSkeins(g, t){
        for (let i = SKEINS.length - 1; i >= 0; i--){
          const K = SKEINS[i]; K.x += K.dir * K.sp * frameDt;
          if ((K.dir > 0 && K.x > DW + 260) || (K.dir < 0 && K.x < -260)){ SKEINS.splice(i, 1); continue; }
          const dim = 0.12 + 0.88 * L.daylight; g.globalAlpha = dim;
          for (const b of K.birds) drawStork(g, K.x + b.dx + Math.sin(t * 0.7 + b.wob) * 3, K.y + b.dy + Math.sin(t * 0.9 + b.wob) * 2.5, K.size, t * b.f * TAU / 2 + b.ph, K.dir);
          g.globalAlpha = 1;
        }
      }

      // ── the baked sky (gradient + the halo of the hour) ──
      function paintSkyL(){
        const g = skyL.cx; g.setTransform(skyL.dpr, 0, 0, skyL.dpr, 0, 0); g.clearRect(0, 0, W, H);
        g.fillStyle = lg(g, 0, 0, 0, OY + HZ * S, [[0, rgb(L.top)], [0.55, rgb(L.mid)], [1, rgb(L.hz)]]);
        g.fillRect(0, 0, W, H);
        // the warm pool of light around the sun's side of the sky at the golden hour
        if (L.warm > 0.05 && L.sunA > 0.05){
          const sp = sunPos(tod);
          g.save(); g.setTransform(skyL.dpr * S, 0, 0, skyL.dpr * S, skyL.dpr * OX, skyL.dpr * OY);
          g.fillStyle = rg(g, sp.x, sp.y, 0, 900, [[0, rgb([255, 200, 120], 0.45 * L.warm * L.sunA)], [0.4, rgb([255, 170, 90], 0.18 * L.warm * L.sunA)], [1, 'rgba(255,160,80,0)']]);
          g.fillRect(-100, -100, DW + 200, HZ + 200);
          g.restore();
        }
      }

      // ── the far hills — three ranges in haze, with the silhouettes of a far wood ──
      const HILLS = []; { const r = makeRng(5); for (let i = 0; i < 3; i++){ const pts = []; for (let k = 0; k <= 12; k++) pts.push(r()); HILLS.push({ pts, seed: r() }); } }
      function hillY(i, x){ const H0 = HILLS[i], f = (x + 300) / 190, j = Math.floor(f), u = f - j; const a = H0.pts[((j % 12) + 12) % 12], b = H0.pts[(((j + 1) % 12) + 12) % 12]; const s = u * u * (3 - 2 * u); const amp = [120, 80, 46][i]; return HZ - [110, 62, 24][i] - lerp(a, b, s) * amp - Math.sin(x / 400 + H0.seed * 9) * amp * 0.3; }
      function paintFarL(){
        const g = farL.cx; g.setTransform(farL.dpr * S, 0, 0, farL.dpr * S, farL.dpr * OX, farL.dpr * OY); g.clearRect(-OX / S, -OY / S, W / S, H / S);
        for (let i = 0; i < 3; i++){
          const k = i / 2;   // 0 far … 1 near
          const col = mixc(L.haze, mixc(L.haze, [96, 86, 64], 0.5 + 0.3 * L.daylight), k);
          const top = mixc(col, L.hz, 0.35 * (1 - k)), bot = mixc(col, [60, 54, 48], 0.25 * k);
          g.fillStyle = lg(g, 0, HZ - 260, 0, HZ, [[0, rgb(top)], [1, rgb(bot)]]);
          g.beginPath(); g.moveTo(-10, HZ + 10);
          for (let x = -10; x <= DW + 10; x += 12) g.lineTo(x, hillY(i, x));
          g.lineTo(DW + 10, HZ + 10); g.closePath(); g.fill();
          // the far wood on the nearest range: a fringe of small round crowns in autumn colour, hazed
          if (i === 2){
            const r = makeRng(99), leafC = mixc(mixc([214, 140, 60], L.haze, 0.45), [40, 36, 60], 1 - L.daylight);
            g.fillStyle = rgb(leafC);
            g.beginPath();
            for (let x = -10; x <= DW + 10; x += 9){ const y = hillY(2, x), rr = 6 + r() * 9; g.moveTo(x + rr, y + 2); g.arc(x, y + 2, rr, 0, TAU); }
            g.fill();
          }
        }
        // haze over everything far, heavier toward the horizon
        g.fillStyle = lg(g, 0, HZ - 240, 0, HZ, [[0, rgb(L.hz, 0)], [1, rgb(L.hz, 0.45 + 0.3 * L.mist)]]);
        g.fillRect(-10, HZ - 240, DW + 20, 250);
      }
      // the morning mist lying in the clearing — live, it breathes
      function drawMist(g, t){
        const a = L.mist * 0.55; if (a < 0.01) return;
        for (let i = 0; i < 3; i++){
          const y = HZ + 10 + i * 46 + Math.sin(t * 0.3 + i) * 6, h = 70 + i * 20;
          const off = noise1(t * 0.08 + i * 3) * 160 - 80;
          g.fillStyle = lg(g, 0, y - h / 2, 0, y + h / 2, [[0, 'rgba(240,236,228,0)'], [0.5, rgb([244, 240, 232], a * (0.9 - i * 0.2))], [1, 'rgba(240,236,228,0)']]);
          g.fillRect(-100 + off, y - h / 2, DW + 200, h);
        }
      }
      // the rainbow after the rain, opposite the sun
      function drawRainbow(g){
        const a = RAIN.rainbow * clamp01(L.daylight * 1.4); if (a < 0.01) return;
        const sp = sunPos(tod), cx = sp.x < DW / 2 ? DW * 0.78 : DW * 0.22, cy = HZ + 160, R = 520;
        const cols = ['rgba(255,60,60,', 'rgba(255,150,40,', 'rgba(255,230,60,', 'rgba(80,200,90,', 'rgba(60,140,255,', 'rgba(120,80,220,'];
        g.save(); g.beginPath(); g.rect(-10, -10, DW + 20, HZ + 12); g.clip();
        g.lineWidth = 9;
        for (let i = 0; i < 6; i++){ g.strokeStyle = cols[i] + (a * 0.22) + ')'; g.beginPath(); g.arc(cx, cy, R - i * 9, Math.PI, TAU); g.stroke(); }
        g.restore();
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE GROVE — trunks + boughs baked per look; crowns baked ONCE as leaf
      // sprites (one per lobe) and re-tinted per look; swayed by translation
      // ══════════════════════════════════════════════════════════════════════
      const LEAF_COLS = [
        '#FFE14F', '#FFD23F', '#F7BE33', '#EFAA2A',   // yellows
        '#F5922B', '#F07E22', '#E86C1C', '#DF5B18',   // oranges
        '#D6472A', '#C73B27', '#B33222', '#A8622C',   // reds + a brown
      ].map(hexc);
      const PALS = { gold: [0, 1, 2, 3, 4, 5], amber: [2, 3, 4, 5, 6, 7], flame: [4, 5, 6, 7, 8, 9], ruby: [6, 7, 8, 9, 10, 11], mixed: [0, 2, 4, 6, 8, 10] };
      const TREES_WIDE = [
        { x: 175,  base: 848, h: 560, spread: 235, pal: 'amber', seed: 11, lean: 0.03 },
        { x: 425,  base: 778, h: 400, spread: 170, pal: 'gold',  seed: 23, lean: -0.05 },
        { x: 585,  base: 712, h: 250, spread: 108, pal: 'ruby',  seed: 37, lean: 0.02 },
        { x: 1015, base: 708, h: 240, spread: 104, pal: 'gold',  seed: 41, lean: -0.03 },
        { x: 1185, base: 782, h: 420, spread: 180, pal: 'flame', seed: 53, lean: 0.04 },
        { x: 1430, base: 852, h: 580, spread: 245, pal: 'mixed', seed: 67, lean: -0.02 },
      ];
      const TREES = [];
      // BARE TREES: every time the scene starts, one tree on each side of the
      // clearing has already let go of its leaves (bare twigs, a few last leaves
      // clinging, a thick carpet beneath); the rest keep their full crowns
      // (picked where a bare tree READS: the big front one at the edge, or the
      // small one beside the clearing — the middle pair hides behind the front
      // crowns. The narrow grove's back pair, seeds 23/53, stands in for 37/41.)
      const BARE = new Set([pick([11, 37]), pick([41, 67])]);
      const BARE_NARROW = new Set([...BARE].map(sd => ({ 37: 23, 41: 53 })[sd] || sd));
      function layoutGrove(){
        TREES.length = 0; narrow = DW < 1000;
        if (!narrow){ for (const T of TREES_WIDE) TREES.push(Object.assign({}, T, { x: AX(T.x) })); }
        else {
          const s = clamp(DW / 1000, 0.55, 1);
          TREES.push({ x: DW * 0.30, base: 742, h: 300 * s, spread: 122 * s, pal: 'gold',  seed: 23, lean: -0.04 });
          TREES.push({ x: DW * 0.70, base: 746, h: 310 * s, spread: 126 * s, pal: 'ruby',  seed: 53, lean: 0.03 });
          TREES.push({ x: DW * 0.10, base: 852, h: 520 * s, spread: 205 * s, pal: 'amber', seed: 11, lean: 0.03 });
          TREES.push({ x: DW * 0.90, base: 856, h: 540 * s, spread: 215 * s, pal: 'flame', seed: 67, lean: -0.02 });
        }
        TREES.sort((a, b) => a.base - b.base);   // far → near
        for (const T of TREES){ T.bare = (narrow ? BARE_NARROW : BARE).has(T.seed); buildTree(T); }
      }
      // the skeleton: trunk, boughs, limbs; lobes (the leaf masses) at the limb ends
      function buildTree(T){
        const r = makeRng(T.seed), br = [], lobes = [];
        const w0 = T.h * 0.09, topY = T.base - T.h * 0.52, topX = T.x + T.lean * T.h;
        T.w0 = w0; T.topX = topX; T.topY = topY;
        const n = 3 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++){
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.1 + (r() - 0.5) * 0.3, len = T.h * (0.24 + r() * 0.1);
          const x1 = topX + Math.cos(a) * len, y1 = topY + Math.sin(a) * len;
          br.push({ x0: topX, y0: topY, x1, y1, w0: w0 * 0.5, w1: w0 * 0.22 });
          lobes.push({ x: x1, y: y1 + T.spread * 0.05, r: T.spread * (0.42 + r() * 0.1), ph: r() * TAU });
          const m = 2 + Math.floor(r() * 2);
          for (let j = 0; j < m; j++){
            const a2 = a + (j / (m - 1) - 0.5) * 1.3 + (r() - 0.5) * 0.3, l2 = len * (0.55 + r() * 0.25);
            const x2 = x1 + Math.cos(a2) * l2, y2 = y1 + Math.sin(a2) * l2;
            br.push({ x0: x1, y0: y1, x1: x2, y1: y2, w0: w0 * 0.22, w1: w0 * 0.08 });
            lobes.push({ x: x2, y: y2, r: T.spread * (0.3 + r() * 0.12), ph: r() * TAU });
          }
        }
        // the crown's heart over the trunk top, so no bough shows through the middle
        lobes.push({ x: topX, y: topY - T.spread * 0.35, r: T.spread * 0.55, ph: r() * TAU });
        T.branches = br; T.lobes = lobes;
        T.top = Math.min(...lobes.map(l => l.y - l.r)) - 20;
        T.twigs = []; T.cling = [];
        if (T.bare) buildTwigs(T, br);
        else for (const Lb of lobes) bakeLobe(T, Lb, r);
      }
      // a bare tree's fine wood: from every limb, twigs fan out (two levels),
      // reaching up and out; a few last leaves cling to the tips
      function buildTwigs(T, br){
        const r = makeRng(T.seed * 13 + 5), up = -Math.PI / 2, w0 = T.w0;
        const hfOf = y => clamp01((T.base - y) / Math.max(1, T.h));
        const add = (x0, y0, a, len, w, lv, parent) => {
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          const tw = { x0, y0, x1, y1, w, lv, parent, ph: r() * TAU, hf: hfOf(y1), dx: 0 };
          T.twigs.push(tw); return tw;
        };
        for (const B of br){
          const a = Math.atan2(B.y1 - B.y0, B.x1 - B.x0), l = Math.hypot(B.x1 - B.x0, B.y1 - B.y0), limb = B.w1 < w0 * 0.1;
          const n = limb ? 3 + Math.floor(r() * 2) : 2;
          for (let i = 0; i < n; i++){
            const f = limb ? (i === n - 1 ? 1 : 0.45 + r() * 0.5) : 0.6 + r() * 0.35;
            const x0 = lerp(B.x0, B.x1, f), y0 = lerp(B.y0, B.y1, f);
            let a1 = a + (r() - 0.5) * 1.5; a1 = lerp(a1, up, 0.25);                 // they reach for the light
            const len1 = (limb ? l * 0.42 : l * 0.3) * (0.7 + r() * 0.5);
            const t1 = add(x0, y0, a1, len1, Math.max(1.4, w0 * 0.06), 1, null);
            const m = 2 + Math.floor(r() * 2);
            for (let j = 0; j < m; j++){
              const a2 = lerp(a1 + (j / (m - 1) - 0.5) * 1.2 + (r() - 0.5) * 0.3, up, 0.15);
              const t2 = add(t1.x1, t1.y1, a2, len1 * (0.45 + r() * 0.3), Math.max(0.8, w0 * 0.028), 2, t1);
              if (r() < 0.16) T.cling.push({ tw: t2, ci: pick(PALS[T.pal]), a: (r() - 0.5) * 0.8, s: 5 + r() * 2.5 });
            }
          }
        }
        T.twigs.sort((p, q) => p.lv - q.lv);   // parents first, so a child reads its parent's sway
      }
      // a bare tree, live: twigs sway with the wind (and its own tap), clinging leaves dangle
      function drawBare(g, t, T){
        const w = wind(t), kick = kickOf(T, t, 0.9);
        const sw = (hf, ph) => w * (3 + 5 * hf) + Math.sin(t * 1.1 + ph) * (1 + 1.5 * w) + (kick ? kick * (7 + 15 * hf) * Math.sin((t - T.kickT) * 4.6 - hf * 1.1) : 0);
        const bark = barkCol();
        g.save(); g.translate(OX, OY); g.scale(S, S); g.lineCap = 'round';
        for (let lv = 1; lv <= 2; lv++){
          g.strokeStyle = rgb(mixc(bark, [10, 6, 4], lv === 1 ? 0.25 : 0.1), lv === 1 ? 1 : 0.9);
          let lw = -1;
          g.beginPath();
          for (const tw of T.twigs){
            if (tw.lv !== lv) continue;
            const d0 = tw.parent ? tw.parent.dx : 0;
            tw.dx = sw(tw.hf, tw.ph) * (lv === 1 ? 0.55 : 1);
            if (tw.w !== lw){ if (lw !== -1){ g.stroke(); g.beginPath(); } lw = tw.w; g.lineWidth = tw.w; }
            g.moveTo(tw.x0 + d0, tw.y0); g.quadraticCurveTo((tw.x0 + tw.x1) / 2 + (d0 + tw.dx) * 0.5, (tw.y0 + tw.y1) / 2 - 2, tw.x1 + tw.dx, tw.y1);
          }
          g.stroke();
        }
        for (const C of T.cling){
          const x = C.tw.x1 + C.tw.dx, y = C.tw.y1, a = Math.PI / 2 + C.a + Math.sin(t * 2.3 + C.tw.ph) * 0.35 * (0.5 + w);
          g.fillStyle = rgb(hourCol(LEAF_COLS[C.ci])); g.beginPath();
          leafPath(g, x + Math.cos(a) * C.s, y + Math.sin(a) * C.s, C.s, a); g.fill();
        }
        g.restore();
      }
      // LEAF-UP: a tap on a bare tree brings its crown back — the lobes are baked
      // now (once), and over ~1.8 s they swell in one after another while the
      // bare twigs fade; from then on it is a leafy tree like the others (and it
      // stays leafy through a re-layout)
      const GROW_SEC = 1.8;
      function leafUp(T, t){
        const r = makeRng(T.seed * 31 + 7);
        for (const Lb of T.lobes){ bakeLobe(T, Lb, r); Lb.cvT = doc.createElement('canvas'); Lb.cvT.width = Lb.cvT.height = Lb.d; tintSprite(Lb.cv, Lb.cvT); }
        T.bare = false; T.growT = t;
        const twin = { 37: 23, 23: 37, 41: 53, 53: 41 }[T.seed];
        BARE.delete(T.seed); BARE_NARROW.delete(T.seed); if (twin){ BARE.delete(twin); BARE_NARROW.delete(twin); }
        lookKey = -1;                                   // the ground repaints: a full crown's shadow
      }
      // one clinging leaf lets go (null when the tree has none left)
      function clingPoint(T){
        if (!T.cling.length) return null;
        const C = T.cling.splice(Math.floor(Math.random() * T.cling.length), 1)[0];
        return { x: C.tw.x1 + C.tw.dx, y: C.tw.y1 + 4 };
      }
      // one leaf: a pointed oval along its own axis (the crown's leaves are small; shape reads as mass, not outline)
      function leafPath(g, x, y, s, a){
        const c = Math.cos(a), sn = Math.sin(a);
        g.moveTo(x + c * s, y + sn * s);
        g.quadraticCurveTo(x - sn * s * 0.55, y + c * s * 0.55, x - c * s, y - sn * s);
        g.quadraticCurveTo(x + sn * s * 0.55, y - c * s * 0.55, x + c * s, y + sn * s);
      }
      function bakeLobe(T, Lb, r){
        const pad = 16, d = Math.ceil(Lb.r * 2 + pad * 2), cv = doc.createElement('canvas'); cv.width = cv.height = d;
        const g = cv.getContext('2d'), cx = d / 2, cy = d / 2, R = Lb.r, pal = PALS[T.pal];
        // the dark heart of the mass
        g.fillStyle = rg(g, cx, cy + R * 0.15, 0, R, [[0, 'rgba(70,30,10,.55)'], [0.7, 'rgba(70,30,10,.25)'], [1, 'rgba(70,30,10,0)']]);
        g.beginPath(); g.arc(cx, cy + R * 0.1, R, 0, TAU); g.fill();
        const n = Math.round(R * R * 0.075), sz = clamp(R * 0.075, 5, 9);
        // leaves, drawn in three passes by shade so the lit ones land on top
        const leaves = [];
        for (let i = 0; i < n; i++){
          const a = r() * TAU, rr = Math.sqrt(r()) * R * 0.98;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
          const lit = clamp01(0.5 - (y - cy) / R * 0.55 + (r() - 0.5) * 0.35);     // top lit, underside shaded
          const ci = pal[Math.min(pal.length - 1, Math.floor((1 - lit) * pal.length * 0.75 + r() * pal.length * 0.4))];
          leaves.push({ x, y, s: sz * (0.75 + r() * 0.5), a: r() * TAU, lit, ci });
        }
        leaves.sort((p, q) => p.lit - q.lit);
        let cur = -1;
        for (const lf of leaves){
          const base = LEAF_COLS[lf.ci], k = lf.lit;
          const col = mixc(mixc(base, [40, 18, 10], 0.45 * (1 - k)), [255, 245, 200], 0.28 * Math.max(0, k - 0.6) / 0.4);
          const key = (col[0] >> 3) * 1000 + (col[1] >> 3) * 32 + (col[2] >> 3);
          if (key !== cur){ if (cur !== -1) g.fill(); cur = key; g.fillStyle = rgb(col); g.beginPath(); }
          leafPath(g, lf.x, lf.y, lf.s, lf.a);
        }
        if (cur !== -1) g.fill();
        Lb.cv = cv; Lb.d = d; Lb.cvT = null;
      }
      // the hour on a baked sprite: warm wash at the golden hour, blue at night, grey in the rain
      function tintSprite(src, dst){
        const g = dst.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, dst.width, dst.height);
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        if (L.warm > 0.02){ g.fillStyle = rgb([255, 165, 60], 0.24 * L.warm); g.fillRect(0, 0, dst.width, dst.height); }
        if (RAIN.k > 0.02){ g.fillStyle = rgb([120, 128, 145], 0.32 * RAIN.k); g.fillRect(0, 0, dst.width, dst.height); }
        if (L.daylight < 0.98){ g.fillStyle = rgb([24, 34, 90], 0.72 * (1 - L.daylight)); g.fillRect(0, 0, dst.width, dst.height); }
        g.globalCompositeOperation = 'source-over';
        return dst;
      }
      function tintCrowns(){
        for (const T of TREES) if (!T.bare) for (const Lb of T.lobes){
          if (!Lb.cvT){ Lb.cvT = doc.createElement('canvas'); Lb.cvT.width = Lb.cvT.height = Lb.d; }
          tintSprite(Lb.cv, Lb.cvT);
        }
      }
      // the bark colour of the hour
      function barkCol(){ return mixc(mixc(mixc([92, 68, 48], [120, 86, 52], L.warm * 0.6), [26, 30, 62], 0.7 * (1 - L.daylight)), [70, 72, 82], 0.3 * RAIN.k); }
      function paintTrunk(g, T){
        const sp = sunPos(tod), lit = sp.up && L.sunA > 0.1 ? (sp.x < T.x ? -1 : 1) : 0;
        const bark = barkCol(), dark = mixc(bark, [10, 6, 4], 0.5), light = mixc(bark, [220, 190, 150], 0.3 * (0.4 + 0.6 * L.daylight));
        // the ground shadow of the whole tree
        g.fillStyle = rg(g, T.x, T.base + 4, 0, T.spread * 0.9, [[0, rgb([30, 20, 10], 0.28 * L.daylight)], [1, 'rgba(30,20,10,0)']]);
        g.save(); g.translate(T.x - lit * T.spread * 0.4 * L.warm, T.base + 6); g.scale(1, 0.22); g.beginPath(); g.arc(0, 0, T.spread * 0.95, 0, TAU); g.fill(); g.restore();
        // the trunk: a tapered column with a root flare, lit on the sun side
        const w0 = T.w0, gr = lg(g, T.x - w0, 0, T.x + w0, 0, lit >= 0 ? [[0, rgb(dark)], [0.45, rgb(bark)], [0.8, rgb(light)], [1, rgb(bark)]] : [[0, rgb(bark)], [0.2, rgb(light)], [0.55, rgb(bark)], [1, rgb(dark)]]);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(T.x - w0 * 1.5, T.base + 2);
        g.quadraticCurveTo(T.x - w0 * 0.95, T.base - w0 * 0.9, T.x - w0 * 0.78, T.base - T.h * 0.12);
        g.lineTo(T.topX - w0 * 0.48, T.topY);
        g.lineTo(T.topX + w0 * 0.48, T.topY);
        g.lineTo(T.x + w0 * 0.78, T.base - T.h * 0.12);
        g.quadraticCurveTo(T.x + w0 * 0.95, T.base - w0 * 0.9, T.x + w0 * 1.5, T.base + 2);
        g.closePath(); g.fill();
        // bark grooves
        const r = makeRng(T.seed * 7 + 3);
        g.strokeStyle = rgb(dark, 0.45); g.lineWidth = 1.5; g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i < 26; i++){
          const k = r(), y0 = T.base - 6 - k * T.h * 0.5, len = 14 + r() * 40;
          const xw = w0 * (0.75 - k * 0.3), x = T.x + (r() * 2 - 1) * xw * 0.85 + T.lean * (T.base - y0);
          g.moveTo(x, y0); g.quadraticCurveTo(x + (r() - 0.5) * 6, y0 - len / 2, x + (r() - 0.5) * 4, y0 - len);
        }
        g.stroke();
        // boughs and limbs, tapered
        g.fillStyle = rgb(mixc(bark, dark, 0.3));
        for (const B of T.branches){
          const dx = B.x1 - B.x0, dy = B.y1 - B.y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
          g.beginPath();
          g.moveTo(B.x0 + nx * B.w0, B.y0 + ny * B.w0); g.lineTo(B.x1 + nx * B.w1, B.y1 + ny * B.w1);
          g.arc(B.x1, B.y1, B.w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
          g.lineTo(B.x0 - nx * B.w0, B.y0 - ny * B.w0); g.closePath(); g.fill();
        }
        // moss at the foot, on the shaded side
        const moss = mixc([96, 120, 48], [20, 30, 50], 0.6 * (1 - L.daylight));
        g.fillStyle = rg(g, T.x - lit * w0 * 0.5, T.base - w0 * 0.25, 0, w0 * 0.8, [[0, rgb(moss, 0.5)], [1, rgb(moss, 0)]]);
        g.beginPath(); g.ellipse(T.x - lit * w0 * 0.5, T.base - w0 * 0.25, w0 * 0.8, w0 * 0.5, 0, 0, TAU); g.fill();
      }
      function paintGroveL(){
        const g = groveL.cx; g.setTransform(groveL.dpr * S, 0, 0, groveL.dpr * S, groveL.dpr * OX, groveL.dpr * OY); g.clearRect(-OX / S, -OY / S, W / S, H / S);
        for (const T of TREES) paintTrunk(g, T);
      }
      // the crowns, live: every lobe is its tinted sprite, translated by the wind (never sheared)
      let crownsDrawn = 0;
      function drawCrowns(g, t){
        const w = wind(t); crownsDrawn = 0;
        for (const T of TREES){
          if (T.bare){ drawBare(g, t, T); continue; }
          const grow = T.growT == null ? 1 : clamp01((t - T.growT) / GROW_SEC);
          if (grow < 1){ g.globalAlpha = 1 - smooth(grow); drawBare(g, t, T); g.globalAlpha = 1; }
          const hk = 1 / Math.max(1, T.h), kick = kickOf(T, t, 0.9), nL = T.lobes.length;
          let li = 0;
          for (const Lb of T.lobes){
            const hf = clamp01((T.base - Lb.y) * hk);                        // higher lobes swing more
            // (an untapped tree has no kickT — guard it, or 0 × NaN hides the crown)
            const ox = w * (4 + 6 * hf) + Math.sin(t * 1.1 + Lb.ph) * (1 + 1.5 * w) + (kick ? kick * (7 + 15 * hf) * Math.sin((t - T.kickT) * 4.6 - hf * 1.1) : 0),
                  oy = Math.sin(t * 0.8 + Lb.ph) * 1.2 * w + (kick ? kick * 2.5 * hf * Math.sin((t - T.kickT) * 6.1 + Lb.ph) : 0);
            if (grow < 1){
              // lobes swell in staggered, inner (lower in the list = boughs first) to the heart
              const k = smooth(clamp01(grow * 1.6 - (li++ / nL) * 0.6)); if (k <= 0.01) continue;
              const sc = 0.35 + 0.65 * k, sd = Lb.d * S * sc;
              g.globalAlpha = k;
              g.drawImage(Lb.cvT || Lb.cv, OX + (Lb.x + ox) * S - sd / 2, OY + (Lb.y + oy) * S - sd / 2, sd, sd);
              g.globalAlpha = 1; crownsDrawn++; continue;
            }
            const sx = OX + (Lb.x - Lb.d / 2 + ox) * S, sy = OY + (Lb.y - Lb.d / 2 + oy) * S, sd = Lb.d * S;
            if (sx === sx && sy === sy) crownsDrawn++;
            g.drawImage(Lb.cvT || Lb.cv, Math.round(sx * DPR) / DPR, Math.round(sy * DPR) / DPR, sd, sd);
          }
        }
      }
      // a random point inside one of a tree's lobes — where a leaf lets go
      function crownPoint(T, Lb){
        Lb = Lb || pick(T.lobes); const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * Lb.r * 0.95;
        return { x: Lb.x + Math.cos(a) * rr, y: Lb.y + Math.sin(a) * rr * 0.9 };
      }
      function treeAt(dx, dy){
        for (let i = TREES.length - 1; i >= 0; i--){
          const T = TREES[i];
          for (const Lb of T.lobes) if (Math.hypot(dx - Lb.x, (dy - Lb.y) / 0.92) < Lb.r + 10) return T;
          if (dy > T.topY - 10 && dy < T.base + 6 && Math.abs(dx - T.x - T.lean * (T.base - dy)) < T.w0 * 1.1) return T;
        }
        return null;
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE GROUND — meadow, path, fence, mushrooms, puddles; the leaf carpet
      // ══════════════════════════════════════════════════════════════════════
      // the ground colour of the hour, at depth k (0 horizon … 1 foreground)
      function groundCol(k){
        const far = [196, 172, 112], near = [150, 118, 62], green = [118, 128, 58];
        let c = mixc(mixc(far, near, k), green, 0.25 * k);
        c = mixc(c, L.hz, 0.35 * (1 - k) * (0.5 + 0.5 * L.mist));
        c = mixc(c, [255, 170, 70], 0.18 * L.warm);
        c = mixc(c, [22, 30, 64], 0.72 * (1 - L.daylight));
        c = mixc(c, [70, 74, 82], 0.3 * RAIN.k);
        return c;
      }
      // the hour on any fixed colour (warm wash, rain grey, night blue)
      function hourCol(c){ c = mixc(c, [255, 170, 70], 0.18 * L.warm); c = mixc(c, [70, 74, 82], 0.3 * RAIN.k); return mixc(c, [22, 30, 64], 0.72 * (1 - L.daylight)); }
      const PATH = { x0: 0.5, x1: 0.42 };       // bottom / horizon x as fractions of DW
      const pathX = y => DW * lerp(PATH.x1, PATH.x0, (y - HZ) / (DH - HZ));
      const pathW = y => 12 + 120 * Math.pow((y - HZ) / (DH - HZ), 1.6);
      let FENCE = null;                            // {x0, x1, y, posts:[x…]}
      const SHROOMS = [], PUDDLES = [], CARPET0 = [], ACORNS = [];
      function layoutGround(){
        SHROOMS.length = 0; PUDDLES.length = 0; CARPET0.length = 0; ACORNS.length = 0;
        const r = makeRng(DW | 0);
        // the fence runs in from the right edge along the back of the clearing
        const fx0 = narrow ? DW * 0.62 : AX(1105), fy = narrow ? 690 : 700;
        FENCE = { x0: fx0, x1: DW + 30, y: fy, posts: [] };
        for (let x = fx0; x < DW + 30; x += narrow ? 70 : 92) FENCE.posts.push(x);
        // mushrooms under the trees, in the shade on the far side of each trunk
        for (const T of TREES){
          const n = 1 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++){
            const side = r() < 0.5 ? -1 : 1;
            const kr = r(); SHROOMS.push({ x: T.x + side * (T.w0 * 1.4 + r() * T.spread * 0.45), y: T.base + 4 + r() * 22, s: 0.6 + r() * 0.45, kind: kr < 0.4 ? 'agaric' : kr < 0.7 ? 'bolete' : 'fairy', k: 1, born: -9 });
          }
          // the carpet already lying under each crown
          const n2 = Math.round((narrow ? 80 : 150) * (T.bare ? 1.8 : 1));
          for (let i = 0; i < n2; i++){
            const a = r() * TAU, rr = Math.sqrt(r()) * T.spread * 0.9;
            CARPET0.push({ x: T.x + Math.cos(a) * rr, y: T.base + 2 + Math.sin(a) * rr * 0.22 + r() * 14, s: 5 + r() * 4, a: r() * TAU, c: pick(PALS[T.pal]) });
          }
          // acorns and a pine cone or two at the foot
          const n3 = 2 + Math.floor(r() * 3);
          for (let i = 0; i < n3; i++) ACORNS.push({ x: T.x + (r() * 2 - 1) * T.spread * 0.5, y: T.base + 8 + r() * 18, kind: r() < 0.7 ? 'acorn' : 'cone', s: 0.7 + r() * 0.5, a: (r() - 0.5) * 1.2 });
        }
        // puddles on the path (they only show once it has rained)
        for (let i = 0; i < 3; i++){ const y = 760 + i * 44 + r() * 20; PUDDLES.push({ x: pathX(y) + (r() - 0.5) * pathW(y) * 0.6, y, rx: 24 + r() * 30, ry: 6 + r() * 4 }); }
        SHROOMS.sort((a, b) => a.y - b.y);
      }
      // a mushroom at its foot — fly agaric (red dome, soft white warts, a skirt),
      // a bolete (chestnut cap over ochre pores) or a 'fairy' cluster of three tiny
      // honey-coloured cones; unit space ≈ design px at s = 1 (a cap ~28 px wide,
      // about half a snail); k = growth 0..1 for the ones that pop on a tap
      function drawMushroom(g, m, k){
        const sc = m.s * (k < 1 ? (1.15 - 0.15 * k) * k : 1); if (sc <= 0.02) return;
        g.save(); g.translate(m.x, m.y); g.scale(sc, sc);
        g.fillStyle = rgb([20, 14, 8], 0.2 * L.daylight); g.beginPath(); g.ellipse(2, 1, 13, 3.2, 0, 0, TAU); g.fill();
        if (m.kind === 'fairy'){
          const stem = hourCol([236, 220, 188]), cap = hourCol([206, 150, 70]);
          for (const [ox, h, w, ph] of [[-7, 13, 5, 0.1], [2, 19, 6.5, -0.05], [8, 10, 4.2, 0.15]]){
            const tx = ox + ph * 10;
            g.strokeStyle = rgb(stem); g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(ox, 0); g.quadraticCurveTo(ox + ph * 20, -h * 0.5, tx, -h); g.stroke();
            g.fillStyle = lg(g, tx - w, -h - w, tx + w, -h, [[0, rgb(mixc(cap, [255, 230, 170], 0.35))], [1, rgb(mixc(cap, [80, 40, 10], 0.3))]]);
            g.beginPath(); g.moveTo(tx - w, -h + 1); g.quadraticCurveTo(tx, -h - w * 2.2, tx + w, -h + 1); g.quadraticCurveTo(tx, -h + 3, tx - w, -h + 1); g.fill();
          }
          g.restore(); return;
        }
        // the stem: a tapered column shaded on both sides
        const stem = hourCol([240, 228, 204]), stemD = mixc(stem, [120, 90, 60], 0.35);
        g.fillStyle = lg(g, -5, 0, 5, 0, [[0, rgb(stemD)], [0.45, rgb(stem)], [1, rgb(stemD)]]);
        g.beginPath(); g.moveTo(-4.5, 1); g.quadraticCurveTo(-5.5, -12, -3.5, -24); g.lineTo(3.5, -24); g.quadraticCurveTo(5.5, -12, 4.5, 1); g.closePath(); g.fill();
        if (m.kind === 'agaric'){
          g.fillStyle = rgb(stem); g.beginPath(); g.ellipse(0, -16.5, 5.5, 2, 0, 0, TAU); g.fill();                 // the skirt
          g.fillStyle = rgb(stemD, 0.5); g.beginPath(); g.ellipse(0, -16, 5.5, 1.4, 0, 0, Math.PI); g.fill();
          g.fillStyle = rgb(hourCol([240, 222, 196])); g.beginPath(); g.ellipse(0, -22, 13.5, 3.6, 0, 0, TAU); g.fill();   // the gills
          g.strokeStyle = rgb(stemD, 0.35); g.lineWidth = 0.6; g.beginPath(); for (let i = -4; i <= 4; i++){ g.moveTo(i * 2.8, -18.8); g.lineTo(i * 2.4, -23.5); } g.stroke();
          const red = hourCol(mixc([216, 48, 36], [255, 110, 60], 0.15 * L.warm));
          g.fillStyle = rg(g, -4, -34, 1, 16, [[0, rgb(mixc(red, [255, 210, 190], 0.4))], [0.5, rgb(red)], [1, rgb(mixc(red, [90, 10, 20], 0.4))]]);
          g.beginPath(); g.moveTo(-14, -23); g.quadraticCurveTo(-14, -40, 0, -41); g.quadraticCurveTo(14, -40, 14, -23); g.quadraticCurveTo(0, -19.5, -14, -23); g.fill();
          g.fillStyle = rgb(hourCol([255, 250, 240]), 0.92);
          g.beginPath(); for (const [x, y, rx, ry] of [[-7, -31, 2, 1.5], [-1, -36.5, 1.8, 1.3], [5, -32, 2.2, 1.6], [9, -26, 1.5, 1.1], [-10, -25, 1.4, 1], [2, -27, 1.2, 0.9], [-4, -27.5, 1, 0.8]]){ g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, TAU); } g.fill();
          g.fillStyle = rgb([255, 255, 255], 0.22 * L.daylight); g.beginPath(); g.ellipse(-5, -35, 5, 2.2, -0.5, 0, TAU); g.fill();   // the sheen
        } else {
          const tan = hourCol(mixc([150, 96, 48], [200, 130, 60], 0.2 * L.warm));
          g.fillStyle = rgb(hourCol([214, 180, 110])); g.beginPath(); g.ellipse(0, -22, 12.5, 3.4, 0, 0, TAU); g.fill();   // the ochre pores
          g.fillStyle = rg(g, -3, -33, 1, 15, [[0, rgb(mixc(tan, [255, 220, 170], 0.4))], [0.55, rgb(tan)], [1, rgb(mixc(tan, [40, 20, 10], 0.45))]]);
          g.beginPath(); g.moveTo(-13, -23); g.quadraticCurveTo(-13, -38, 0, -38); g.quadraticCurveTo(13, -38, 13, -23); g.quadraticCurveTo(0, -19.5, -13, -23); g.fill();
          g.fillStyle = rgb([255, 255, 255], 0.18 * L.daylight); g.beginPath(); g.ellipse(-4, -32, 4.5, 2, -0.5, 0, TAU); g.fill();
        }
        g.restore();
      }
      function drawAcorn(g, A){
        g.save(); g.translate(A.x, A.y); g.rotate(A.a); g.scale(A.s, A.s);
        const night = 1 - L.daylight;
        if (A.kind === 'acorn'){
          g.fillStyle = rgb(mixc([196, 150, 88], [50, 40, 80], 0.6 * night)); g.beginPath(); g.ellipse(0, 2, 6, 8, 0, 0, TAU); g.fill();
          g.fillStyle = rgb(mixc([120, 82, 44], [30, 26, 60], 0.6 * night)); g.beginPath(); g.ellipse(0, -5, 7, 4, 0, Math.PI, TAU); g.lineTo(7, -4); g.lineTo(-7, -4); g.fill();
          g.fillRect(-1, -11, 2, 4);
        } else {
          g.fillStyle = rgb(mixc([120, 84, 48], [30, 26, 60], 0.6 * night));
          g.beginPath(); for (let i = 0; i < 9; i++){ const y = -12 + i * 3, w = 5 + Math.sin(i / 8 * Math.PI) * 5; g.moveTo(-w, y); g.lineTo(w, y); g.lineTo(0, y + 4); } g.fill();
        }
        g.restore();
      }
      function paintGroundL(){
        const g = groundL.cx; g.setTransform(groundL.dpr * S, 0, 0, groundL.dpr * S, groundL.dpr * OX, groundL.dpr * OY); g.clearRect(-OX / S, -OY / S, W / S, H / S);
        // the meadow
        g.fillStyle = lg(g, 0, HZ, 0, DH, [[0, rgb(groundCol(0))], [0.35, rgb(groundCol(0.35))], [1, rgb(groundCol(1))]]);
        g.fillRect(-10, HZ - 2, DW + 20, DH - HZ + 12);
        // grass: short strokes, denser and longer toward the front
        const r = makeRng(DW * 3 + 1);
        for (let pass = 0; pass < 2; pass++){
          g.strokeStyle = rgb(mixc(groundCol(0.7), pass ? [255, 230, 160] : [60, 70, 30], 0.3), 0.55); g.lineWidth = pass ? 1 : 1.4; g.lineCap = 'round';
          g.beginPath();
          const n = narrow ? 320 : 620;
          for (let i = 0; i < n; i++){
            const k = Math.pow(r(), 0.6), y = HZ + 8 + k * (DH - HZ - 8), x = r() * DW, len = 4 + k * 16, lean = (r() - 0.5) * 8;
            g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.5, y - len * 0.6, x + lean, y - len);
          }
          g.stroke();
        }
        // the dirt path, feathered
        const dirt = hourCol(mixc([168, 140, 90], [196, 158, 106], 0.55));
        for (let pass = 0; pass < 2; pass++){
          g.fillStyle = rgb(dirt, pass ? 0.9 : 0.35);
          g.beginPath(); g.moveTo(pathX(HZ) - 6, HZ);
          for (let y = HZ; y <= DH + 10; y += 20){ const w = pathW(y) * (pass ? 1 : 1.35); g.lineTo(pathX(y) - w / 2 + Math.sin(y * 0.05) * 4, y); }
          for (let y = DH + 10; y >= HZ; y -= 20){ const w = pathW(y) * (pass ? 1 : 1.35); g.lineTo(pathX(y) + w / 2 + Math.cos(y * 0.045) * 4, y); }
          g.closePath(); g.fill();
        }
        g.fillStyle = rgb(mixc(dirt, [90, 80, 70], 0.4), 0.6);
        g.beginPath(); for (let i = 0; i < 14; i++){ const y = HZ + 60 + r() * (DH - HZ - 60), x = pathX(y) + (r() - 0.5) * pathW(y) * 0.8, s = 1.5 + r() * 3; g.moveTo(x + s, y); g.ellipse(x, y, s, s * 0.6, 0, 0, TAU); } g.fill();
        // the fence
        if (FENCE){
          const wood = mixc(mixc([128, 92, 56], [170, 120, 60], 0.3 * L.warm), [30, 30, 60], 0.65 * (1 - L.daylight)), dark = mixc(wood, [20, 12, 8], 0.4);
          g.fillStyle = rgb(wood); g.strokeStyle = rgb(dark); g.lineWidth = 1;
          for (const rail of [0, 1]){ const y = FENCE.y - 50 + rail * 24; g.beginPath(); g.rect(FENCE.x0 - 4, y, FENCE.x1 - FENCE.x0 + 8, 7); g.fill(); g.stroke(); }
          for (const x of FENCE.posts){ g.beginPath(); g.moveTo(x - 6, FENCE.y + 4); g.lineTo(x - 6, FENCE.y - 62); g.lineTo(x, FENCE.y - 70); g.lineTo(x + 6, FENCE.y - 62); g.lineTo(x + 6, FENCE.y + 4); g.closePath(); g.fill(); g.stroke(); }
          // a dew-strung spider web in the corner of the first post and the top rail
          const px = FENCE.posts[0], py = FENCE.y - 48, wr = 34, wa = 0.22 + 0.3 * clamp01(1 - Math.abs(tod - 0.1) * 6) * L.daylight;
          g.strokeStyle = rgb([255, 255, 255], wa); g.lineWidth = 0.8; g.beginPath();
          for (let i = 0; i < 7; i++){ const a = i / 6 * Math.PI / 2; g.moveTo(px + 6, py); g.lineTo(px + 6 + Math.cos(a) * wr, py + Math.sin(a) * wr); }
          for (let k = 0.2; k <= 1; k += 0.16){ for (let i = 0; i <= 6; i++){ const a = i / 6 * Math.PI / 2, x = px + 6 + Math.cos(a) * wr * k, y = py + Math.sin(a) * wr * k; if (i) g.lineTo(x, y); else g.moveTo(x, y); } }
          g.stroke();
          g.fillStyle = rgb([255, 255, 255], wa * 1.6); g.beginPath(); for (let i = 0; i < 9; i++){ const a = r() * Math.PI / 2, k = 0.3 + r() * 0.7, x = px + 6 + Math.cos(a) * wr * k, y = py + Math.sin(a) * wr * k; g.moveTo(x + 1, y); g.arc(x, y, 1, 0, TAU); } g.fill();
        }
        // the shadow of each crown on the ground, leaning away from the sun
        const sp = sunPos(tod);
        for (const T of TREES){
          const lit = sp.up && L.sunA > 0.1 ? (sp.x < T.x ? 1 : -1) : 0;
          g.fillStyle = rg(g, 0, 0, 0, 1, [[0, rgb([30, 20, 10], (T.bare ? 0.07 : 0.22) * L.daylight)], [1, 'rgba(30,20,10,0)']]);
          g.save(); g.translate(T.x + lit * T.spread * (0.3 + 0.5 * L.warm), T.base + 10); g.scale(T.spread * 1.1, T.spread * 0.2); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
        // the carpet that was already there
        drawCarpetLeaves(g, CARPET0);
        for (const A of ACORNS) drawAcorn(g, A);
        for (const m of SHROOMS) if (m.k >= 1) drawMushroom(g, m, 1);
      }
      function leafColOfHour(ci, dim){
        let c = LEAF_COLS[ci]; if (dim) c = mixc(c, [40, 18, 10], dim);
        c = mixc(c, [255, 165, 60], 0.2 * L.warm); c = mixc(c, [120, 128, 145], 0.3 * RAIN.k); c = mixc(c, [24, 34, 90], 0.7 * (1 - L.daylight));
        return c;
      }
      function drawCarpetLeaves(g, list){
        // grouped by colour into single paths
        const groups = new Map();
        for (const lf of list){ let a = groups.get(lf.c); if (!a){ a = []; groups.set(lf.c, a); } a.push(lf); }
        for (const [ci, arr] of groups){
          g.fillStyle = rgb(leafColOfHour(ci, 0.25)); g.beginPath();
          for (const lf of arr) leafPath(g, lf.x, lf.y, lf.s, lf.a);
          g.fill();
        }
      }
      // the puddles, live: a mirror of the sky that only shows once it has rained
      let wet = 0;
      function drawPuddles(g, t){
        if (wet < 0.02) return;
        const sky = mixc(L.mid, L.hz, 0.5);
        for (const P of PUDDLES){
          g.fillStyle = rgb(mixc(sky, [40, 40, 60], 0.2), 0.75 * wet);
          g.beginPath(); g.ellipse(P.x, P.y, P.rx * (0.6 + 0.4 * wet), P.ry * (0.6 + 0.4 * wet), 0, 0, TAU); g.fill();
          g.strokeStyle = rgb([255, 255, 255], 0.35 * wet * L.daylight); g.lineWidth = 1;
          g.beginPath(); g.ellipse(P.x, P.y - 1, P.rx * 0.6, P.ry * 0.5, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        }
      }
      // the live mushrooms (popped by a tap) and the sprouting ones
      function drawLiveShrooms(g, t){
        for (const m of SHROOMS){
          if (m.k >= 1 && m.born < 0) continue;              // baked into the ground layer
          m.k = clamp01((t - m.born) / 0.9);
          drawMushroom(g, m, smooth(m.k));
          if (m.k >= 1 && m.born >= 0){ m.born = -1; lookKey = -1; }   // settle into the baked layer on the next repaint
        }
      }
      function popMushroom(x, y, t){
        const kr = Math.random(); SHROOMS.push({ x, y, s: 0.6 + Math.random() * 0.4, kind: kr < 0.5 ? 'agaric' : kr < 0.8 ? 'bolete' : 'fairy', k: 0, born: t });
        SHROOMS.sort((a, b) => a.y - b.y);
      }

      // ══════════════════════════════════════════════════════════════════════
      // FALLING LEAVES — baked sprite sheet (4 shapes × 12 colours), tumbling
      // on the wind; they land on the carpet layer and stay
      // ══════════════════════════════════════════════════════════════════════
      const LEAF_PX = 36, LEAF_SHAPES = 4;
      let leafSheet = null, leafSheetT = null;
      function leafShape(g, k, s){
        // k: 0 maple · 1 oak · 2 ovate (poplar) · 3 round (aspen) — drawn with the stem down, centred
        g.beginPath();
        if (k === 0){
          const pts = [[0, -1], [0.22, -0.55], [0.75, -0.75], [0.55, -0.25], [1, 0.05], [0.5, 0.2], [0.42, 0.75], [0.12, 0.42], [0, 0.95], [-0.12, 0.42], [-0.42, 0.75], [-0.5, 0.2], [-1, 0.05], [-0.55, -0.25], [-0.75, -0.75], [-0.22, -0.55]];
          pts.forEach((p, i) => i ? g.lineTo(p[0] * s, p[1] * s) : g.moveTo(p[0] * s, p[1] * s)); g.closePath();
        } else if (k === 1){
          g.moveTo(0, -s);
          for (let i = 0; i < 5; i++){ const y = -s + (i + 0.5) * s * 0.4, w = s * (0.45 + 0.25 * Math.sin(i / 4 * Math.PI)); g.quadraticCurveTo(w * 1.3, y - s * 0.1, w * 0.5, y + s * 0.15); }
          g.lineTo(0, s);
          for (let i = 4; i >= 0; i--){ const y = -s + (i + 0.5) * s * 0.4, w = s * (0.45 + 0.25 * Math.sin(i / 4 * Math.PI)); g.quadraticCurveTo(-w * 1.3, y - s * 0.1, -w * 0.5, y - s * 0.25); }
          g.closePath();
        } else if (k === 2){
          g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, -s * 0.5, s * 0.5, s * 0.3); g.quadraticCurveTo(s * 0.2, s * 0.8, 0, s);
          g.quadraticCurveTo(-s * 0.2, s * 0.8, -s * 0.5, s * 0.3); g.quadraticCurveTo(-s * 0.8, -s * 0.5, 0, -s);
        } else {
          g.moveTo(0, -s * 0.95); g.quadraticCurveTo(s * 1.05, -s * 0.9, s * 0.95, s * 0.1); g.quadraticCurveTo(s * 0.8, s * 0.9, 0, s * 0.9);
          g.quadraticCurveTo(-s * 0.8, s * 0.9, -s * 0.95, s * 0.1); g.quadraticCurveTo(-s * 1.05, -s * 0.9, 0, -s * 0.95);
        }
      }
      function bakeLeafSheet(){
        const cv = doc.createElement('canvas'); cv.width = LEAF_PX * LEAF_COLS.length; cv.height = LEAF_PX * LEAF_SHAPES;
        const g = cv.getContext('2d'), s = LEAF_PX * 0.4;
        for (let k = 0; k < LEAF_SHAPES; k++) for (let c = 0; c < LEAF_COLS.length; c++){
          g.save(); g.translate(c * LEAF_PX + LEAF_PX / 2, k * LEAF_PX + LEAF_PX / 2);
          const col = LEAF_COLS[c];
          g.fillStyle = lg(g, -s, -s, s, s, [[0, rgb(mixc(col, [255, 240, 200], 0.25))], [1, rgb(mixc(col, [60, 20, 10], 0.3))]]);
          leafShape(g, k, s); g.fill();
          g.strokeStyle = rgb(mixc(col, [60, 20, 10], 0.45), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(0, s * 0.95); g.lineTo(0, -s * 0.75); // midrib
          for (let i = 1; i <= 3; i++){ const y = -s * 0.6 + i * s * 0.4; g.moveTo(0, y); g.lineTo(s * 0.4, y - s * 0.25); g.moveTo(0, y); g.lineTo(-s * 0.4, y - s * 0.25); }
          g.stroke();
          g.strokeStyle = rgb(mixc(col, [60, 20, 10], 0.5)); g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, s * 0.9); g.lineTo(s * 0.08, s * 1.2); g.stroke();   // stem
          g.restore();
        }
        leafSheet = cv; leafSheetT = doc.createElement('canvas'); leafSheetT.width = cv.width; leafSheetT.height = cv.height;
      }
      const LEAVES = [], MAX_LEAVES = IS_TOUCH ? 70 : 120;
      let leafAcc = 0, released = 0, landed = 0;
      function releaseLeaf(T, pt, burst){
        if (LEAVES.length >= MAX_LEAVES) return;
        pt = pt || crownPoint(T);
        LEAVES.push({ x: pt.x, y: pt.y, vx: (Math.random() - 0.5) * 20 + (burst ? (Math.random() - 0.5) * 120 : 0), vy: burst ? -20 - Math.random() * 60 : 0,
          rot: Math.random() * TAU, rv: (Math.random() - 0.5) * 6, ph: Math.random() * TAU, f: 2 + Math.random() * 3,
          sz: (0.55 + Math.random() * 0.5) * (T.h / 560 * 0.5 + 0.5), shape: Math.floor(Math.random() * LEAF_SHAPES), c: pick(PALS[T.pal]),
          landY: T.base + 2 + Math.random() * 26 + (Math.random() < 0.3 ? 40 : 0), drift: 0.6 + Math.random() * 0.8 });
        released++;
      }
      function updateLeaves(t, dt){
        const w = wind(t);
        // a steady trickle, more in the wind, from every crown by its size
        leafAcc += dt * (0.35 + 1.6 * w) * (narrow ? 0.6 : 1);
        while (leafAcc > 1){
          leafAcc -= 1; const T = pick(TREES); if (!T) continue;
          if (!T.bare) releaseLeaf(T);
          else if (Math.random() < 0.08){ const pt = clingPoint(T); if (pt) releaseLeaf(T, pt); }
        }
        for (let i = LEAVES.length - 1; i >= 0; i--){
          const lf = LEAVES[i];
          const flutter = Math.sin(t * lf.f + lf.ph);
          const gk = 1 + 3 * Math.exp(-Math.abs(lf.x - gustX) / 110) * clamp01(gustAmp) * Math.exp(-(t - gustT0) * 0.8);
          lf.vx += ((28 + 70 * w) * lf.drift * gk + flutter * 60 - lf.vx) * dt * 1.6;
          lf.vy += (34 + Math.abs(flutter) * 30 - lf.vy) * dt * 1.4;          // terminal fall, rocking slower on the up-flutter
          lf.x += lf.vx * dt; lf.y += lf.vy * dt; lf.rot += (lf.rv + flutter * 2.5) * dt;
          if (lf.y >= lf.landY || lf.x < -60 || lf.x > DW + 60){
            if (lf.y >= lf.landY) stampLeaf(lf);
            LEAVES.splice(i, 1);
          }
        }
      }
      function drawLeaves(g){
        const sh = leafSheetT || leafSheet; if (!sh) return;
        for (const lf of LEAVES){
          const d = LEAF_PX * lf.sz;
          g.save(); g.translate(lf.x, lf.y); g.rotate(lf.rot); g.scale(1, 0.7 + 0.3 * Math.cos(lf.rot * 1.3 + lf.ph));
          g.drawImage(sh, lf.c * LEAF_PX, lf.shape * LEAF_PX, LEAF_PX, LEAF_PX, -d / 2, -d / 2, d, d);
          g.restore();
        }
      }
      // ── the carpet: leaves that landed are stamped (neutral) and re-tinted per look ──
      let carpetL = null, carpetT = null;
      function stampLeaf(lf){
        if (!carpetL) return;
        const g = carpetL.cx, d = LEAF_PX * lf.sz;
        g.save(); g.translate(lf.x, lf.y); g.rotate(lf.rot); g.scale(1, 0.45);
        g.drawImage(leafSheet, lf.c * LEAF_PX, lf.shape * LEAF_PX, LEAF_PX, LEAF_PX, -d / 2, -d / 2, d, d);
        g.restore(); landed++; carpetDirty = true;
      }
      let carpetDirty = false;
      function tintCarpet(){ if (carpetL && carpetT) tintSprite(carpetL.cv, carpetT.cv); carpetDirty = false; }
      function drawCarpet(g){
        if (!carpetT) return;
        if (carpetDirty) tintCarpet();
        g.drawImage(carpetT.cv, 0, 0, W, H);
      }

      // ── golden dust in the low sun, seed fluff on the wind, fireflies after dark ──
      const MOTES = [], FLUFF = [], FLIES = [];
      function buildParticles(){
        MOTES.length = 0; FLUFF.length = 0; FLIES.length = 0;
        const n = narrow ? 24 : 48;
        for (let i = 0; i < n; i++) MOTES.push({ x: Math.random() * DW, y: 200 + Math.random() * 600, s: 1 + Math.random() * 2, ph: Math.random() * TAU, v: 4 + Math.random() * 8 });
        for (let i = 0; i < (narrow ? 4 : 7); i++) FLUFF.push({ x: Math.random() * DW, y: 300 + Math.random() * 450, ph: Math.random() * TAU, s: 5 + Math.random() * 5 });
        for (let i = 0; i < (narrow ? 10 : 18); i++) FLIES.push({ x: Math.random() * DW, y: 600 + Math.random() * 260, ph: Math.random() * TAU, f: 0.4 + Math.random() * 0.8, dx: Math.random() * TAU });
      }
      function drawMotes(g, t){
        const a = L.warm * L.sunA * L.daylight * 0.7; if (a < 0.02) return;
        const w = wind(t);
        g.fillStyle = rgb([255, 225, 150], a);
        g.beginPath();
        for (const m of MOTES){
          m.x += (m.v + w * 18) * frameDt; m.y += Math.sin(t * 0.7 + m.ph) * 6 * frameDt; if (m.x > DW + 10) m.x = -10;
          const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + m.ph * 3);
          g.moveTo(m.x + m.s * tw, m.y); g.arc(m.x, m.y, m.s * tw, 0, TAU);
        }
        g.fill();
      }
      function drawFluff(g, t){
        const w = wind(t), a = 0.3 + 0.6 * L.daylight;
        g.strokeStyle = rgb([255, 255, 255], 0.6 * a); g.lineWidth = 0.5; g.fillStyle = rgb([255, 250, 240], 0.9 * a);
        for (const F of FLUFF){
          F.x += (10 + w * 30) * frameDt; F.y += (Math.sin(t * 0.5 + F.ph) * 8 - 2) * frameDt; if (F.x > DW + 20){ F.x = -20; F.y = 300 + Math.random() * 450; } if (F.y < 150) F.y = 700;
          g.beginPath(); for (let i = 0; i < 14; i++){ const an = i / 14 * TAU + t * 0.4 + F.ph; g.moveTo(F.x, F.y); g.lineTo(F.x + Math.cos(an) * F.s, F.y + Math.sin(an) * F.s); } g.stroke();
          g.beginPath(); g.arc(F.x, F.y, 1.4, 0, TAU); g.fill();
        }
      }
      function drawFireflies(g, t){
        const a = clamp01((0.45 - L.daylight) * 3) * (1 - RAIN.k); if (a < 0.02) return;
        for (const F of FLIES){
          const x = F.x + Math.sin(t * 0.3 + F.dx) * 60 + Math.sin(t * 1.1 + F.ph) * 12, y = F.y + Math.cos(t * 0.25 + F.ph) * 30 + Math.sin(t * 1.7 + F.dx) * 6;
          const bl = Math.max(0, Math.sin(t * F.f * TAU + F.ph)); const k = bl * bl * a;
          if (k < 0.03) continue;
          glow(g, 'green', x, y, 14, k * 0.7);
          g.fillStyle = rgb([230, 255, 160], k); g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SEA SQUILLS (חצב) — tall bare stalks with a spike of white stars,
      // the spike a baked sprite rotated with the sway; bees by day
      // ══════════════════════════════════════════════════════════════════════
      const SQUILLS = [], BEES = [];
      function layoutSquills(){
        SQUILLS.length = 0; BEES.length = 0;
        const r = makeRng(DW * 5 + 9);
        const spots = narrow
          ? [[0.22, 820, 1.0], [0.80, 835, 0.9], [0.55, 745, 0.6]]
          : [[AX(330) / DW, 862, 1.05], [AX(300) / DW, 820, 0.8], [AX(690) / DW, 790, 0.72], [AX(1330) / DW, 866, 1.0], [AX(1270) / DW, 822, 0.78], [AX(1090) / DW, 775, 0.66], [AX(880) / DW, 735, 0.5]];
        for (const [fx, y, s] of spots){
          const Sq = { x: fx * DW + (r() - 0.5) * 20, y, s, h: (190 + r() * 60) * s, ph: r() * TAU, lean: (r() - 0.5) * 0.16, seed: Math.floor(r() * 1e6), spike: null, flowers: [] };
          bakeSpike(Sq); SQUILLS.push(Sq);
        }
        SQUILLS.sort((a, b) => a.y - b.y);
        for (let i = 0; i < (narrow ? 2 : 4); i++) BEES.push({ sq: i % SQUILLS.length, fi: 0, t0: -9, ph: r() * TAU, x: 0, y: 0, nx: 0, ny: 0, hold: 2 });
      }
      // one six-point star flower
      function starPath(g, x, y, r){
        for (let i = 0; i < 6; i++){
          const a = i / 6 * TAU - Math.PI / 2;
          g.moveTo(x, y); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.58, r * 0.26, a, 0, TAU);
        }
      }
      function bakeSpike(Sq){
        const r = makeRng(Sq.seed), sh = Sq.h * 0.48, w = 44 * Sq.s, pad = 10;
        const cv = doc.createElement('canvas'); cv.width = Math.ceil(w + pad * 2); cv.height = Math.ceil(sh + pad * 2);
        const g = cv.getContext('2d'), cx = cv.width / 2;
        g.translate(cx, cv.height - pad);                     // origin at the spike's foot, y up is negative
        // the stalk through the spike
        g.strokeStyle = '#8FA35A'; g.lineWidth = 2.6 * Sq.s; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -sh); g.stroke();
        // flowers: open at the foot, buds at the tip; every one on a short pedicel around the stalk
        const n = Math.round(sh / (5.2 * Sq.s)), fl = [];
        for (let i = 0; i < n; i++){
          const k = i / (n - 1), y = -k * sh, side = (i % 2 ? 1 : -1) * (0.5 + r() * 0.5), px = side * w * 0.42 * (1 - k * 0.55) * (0.7 + r() * 0.3);
          fl.push({ x: px, y: y + (r() - 0.5) * 3, open: k < 0.72 + r() * 0.1 ? 1 : 0, k });
        }
        g.strokeStyle = '#9DB06A'; g.lineWidth = 1.1 * Sq.s; g.beginPath(); for (const f of fl){ g.moveTo(0, f.y + 3); g.lineTo(f.x * 0.9, f.y); } g.stroke();
        g.fillStyle = '#F7F5EE'; g.beginPath(); for (const f of fl) if (f.open) starPath(g, f.x, f.y, 5.2 * Sq.s); g.fill();
        g.fillStyle = 'rgba(190,200,150,.55)'; g.beginPath(); for (const f of fl) if (f.open){ g.moveTo(f.x + 1.6 * Sq.s, f.y); g.arc(f.x, f.y, 1.6 * Sq.s, 0, TAU); } g.fill();
        g.fillStyle = '#E9ECD9'; g.beginPath(); for (const f of fl) if (!f.open){ g.moveTo(f.x + 1.5 * Sq.s, f.y); g.ellipse(f.x, f.y, 1.8 * Sq.s, 3.2 * Sq.s, 0, 0, TAU); } g.fill();
        g.fillStyle = '#F2CB4E'; g.beginPath(); for (const f of fl) if (f.open){ g.moveTo(f.x + 1 * Sq.s, f.y); g.arc(f.x, f.y, 1 * Sq.s, 0, TAU); } g.fill();
        Sq.spike = cv; Sq.spikeT = doc.createElement('canvas'); Sq.spikeT.width = cv.width; Sq.spikeT.height = cv.height; Sq.sh = sh; Sq.pad = pad; Sq.cx = cx;
        Sq.flowers = fl.filter(f => f.open);
      }
      function tintSquills(){ for (const Sq of SQUILLS) tintSprite(Sq.spike, Sq.spikeT); }
      // the pose of a squill at time t: the stalk bends with the wind, the tip lags
      function squillPose(Sq, t){
        const w = wind(t), kick = kickOf(Sq, t, 1.3);
        const bend = Sq.lean + w * 0.16 + Math.sin(t * 1.3 + Sq.ph) * 0.03 * (0.5 + w) + (kick ? kick * 0.22 * Math.sin((t - Sq.kickT) * 7) : 0);
        const h0 = Sq.h - Sq.sh, tipX = Sq.x + Math.sin(bend) * h0, tipY = Sq.y - Math.cos(bend) * h0;
        return { bend, tipX, tipY, cpx: Sq.x + Math.sin(bend) * h0 * 0.25, cpy: Sq.y - h0 * 0.55 };
      }
      function drawSquills(g, t){
        for (const Sq of SQUILLS){
          const P = squillPose(Sq, t), night = 1 - L.daylight;
          // the stalk, with a faint shadow on the ground
          g.fillStyle = rgb([30, 20, 10], 0.18 * L.daylight); g.beginPath(); g.ellipse(Sq.x + 6, Sq.y + 3, 14 * Sq.s, 3.5 * Sq.s, 0, 0, TAU); g.fill();
          g.strokeStyle = rgb(mixc(mixc([132, 150, 78], [170, 160, 70], 0.3 * L.warm), [30, 40, 80], 0.65 * night)); g.lineWidth = 3.2 * Sq.s; g.lineCap = 'round';
          g.beginPath(); g.moveTo(Sq.x, Sq.y); g.quadraticCurveTo(P.cpx, P.cpy, P.tipX, P.tipY); g.stroke();
          // a few dry leaves at the foot (the real plant's leaves come after the flowers — a couple of last year's)
          g.strokeStyle = rgb(mixc([150, 130, 70], [30, 30, 60], 0.6 * night), 0.8); g.lineWidth = 2 * Sq.s;
          g.beginPath(); g.moveTo(Sq.x, Sq.y); g.quadraticCurveTo(Sq.x - 14 * Sq.s, Sq.y - 10 * Sq.s, Sq.x - 22 * Sq.s, Sq.y + 2); g.moveTo(Sq.x, Sq.y); g.quadraticCurveTo(Sq.x + 12 * Sq.s, Sq.y - 12 * Sq.s, Sq.x + 20 * Sq.s, Sq.y + 1); g.stroke();
          // the spike sprite, rotated with the stalk's tip
          g.save(); g.translate(P.tipX, P.tipY); g.rotate(P.bend * 1.25);
          g.drawImage(Sq.spikeT, -Sq.cx, -(Sq.spike.height - Sq.pad));
          g.restore();
          Sq.pose = P;
        }
      }
      // the bees: one per squill, each hopping flower to flower by day; a tap sends them up in a puff
      function flowerXY(Sq, f){
        const P = Sq.pose || squillPose(Sq, lastT), c = Math.cos(P.bend * 1.25), s = Math.sin(P.bend * 1.25);
        return { x: P.tipX + f.x * c - f.y * s, y: P.tipY + f.x * s + f.y * c };
      }
      function updateBees(t, dt){
        const day = L.daylight > 0.5 && RAIN.k < 0.3;
        for (const B of BEES){
          const Sq = SQUILLS[B.sq]; if (!Sq) continue;
          if (!day){ B.away = clamp01((B.away || 0) + dt); continue; } else B.away = clamp01((B.away || 0) - dt * 0.5);
          if (t > B.t0 + B.hold){ B.fi = Math.floor(Math.random() * Sq.flowers.length); B.t0 = t; B.hold = 1.5 + Math.random() * 3; if (Math.random() < 0.15) B.sq = Math.floor(Math.random() * SQUILLS.length); }
          const f = Sq.flowers[B.fi] || Sq.flowers[0]; if (!f) continue;
          const tg = flowerXY(Sq, f);
          B.x += (tg.x + Math.sin(t * 7 + B.ph) * 2 - B.x) * Math.min(1, dt * 4); B.y += (tg.y - 3 + Math.cos(t * 9 + B.ph) * 1.5 - B.y) * Math.min(1, dt * 4);
        }
      }
      function drawBees(g, t){
        for (const B of BEES){
          const a = 1 - (B.away || 0); if (a < 0.05 || !B.x) continue;
          g.save(); g.translate(B.x, B.y); g.globalAlpha = a;
          g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-1, -3, 3.5, 1.6, -0.5 + Math.sin(t * 60) * 0.5, 0, TAU); g.ellipse(1.5, -3, 3.5, 1.6, 0.5 - Math.sin(t * 60) * 0.5, 0, TAU); g.fill();
          g.fillStyle = '#F2B01E'; g.beginPath(); g.ellipse(0, 0, 3.6, 2.4, 0, 0, TAU); g.fill();
          g.fillStyle = '#2A2016'; g.beginPath(); g.rect(-1.5, -2.2, 1.1, 4.4); g.rect(0.6, -2.2, 1.1, 4.4); g.fill();
          g.beginPath(); g.arc(3.4, -0.3, 1.3, 0, TAU); g.fill();
          g.restore();
        }
      }
      function squillAt(dx, dy){
        for (const Sq of SQUILLS){ const P = Sq.pose; if (!P) continue; if (Math.abs(dx - lerp(Sq.x, P.tipX, 0.7)) < 30 * Sq.s + 10 && dy < Sq.y + 10 && dy > P.tipY - Sq.sh - 10) return Sq; }
        return null;
      }
      const PETALS = [];
      function squillTap(Sq, t){
        for (const B of BEES) if (B.sq === SQUILLS.indexOf(Sq)){ B.t0 = t; B.hold = 0.01; }
        const P = Sq.pose || squillPose(Sq, t);
        for (let i = 0; i < 14; i++) PETALS.push({ x: lerp(Sq.x, P.tipX, 0.8) + (Math.random() - 0.5) * 30, y: P.tipY - Math.random() * Sq.sh, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 60, t0: t, life: 1.2 + Math.random() * 0.8, r: Math.random() * TAU });
        Sq.kickT = t;
      }
      function drawPetals(g, t){
        for (let i = PETALS.length - 1; i >= 0; i--){
          const p = PETALS[i], k = (t - p.t0) / p.life; if (k >= 1){ PETALS.splice(i, 1); continue; }
          p.vy += 60 * frameDt; p.x += p.vx * frameDt; p.y += p.vy * frameDt; p.r += frameDt * 3;
          g.fillStyle = rgb([250, 248, 240], 1 - k); g.beginPath(); g.ellipse(p.x, p.y, 3.2, 1.5, p.r, 0, TAU); g.fill();
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // THE SNAILS — on the ground and up the trunks; a tap tucks them in
      // ══════════════════════════════════════════════════════════════════════
      const SNAILS = [];
      const SHELLS = [[[196, 120, 60], [120, 66, 30]], [[214, 150, 74], [140, 80, 36]], [[160, 96, 48], [96, 52, 24]], [[222, 170, 90], [150, 94, 44]], [[180, 110, 70], [110, 60, 34]]];
      function layoutSnails(){
        SNAILS.length = 0;
        const r = makeRng(DW * 11 + 7);
        const n = narrow ? 2 : 4;
        for (let i = 0; i < n; i++){
          const y = 745 + r() * 140; let x = r() * DW;
          for (let tries = 0; tries < 20 && trunkBlock(x, y); tries++) x = r() * DW;
          SNAILS.push({ kind: 'ground', x, y, dir: r() < 0.5 ? 1 : -1, s: 0.8 + r() * 0.5, sp: 5 + r() * 5, ph: r() * TAU, shell: Math.floor(r() * SHELLS.length), hide: 0, hideT: -9, pause: 0, trail: [], lastTrail: 0, look: 0 });
        }
        const climbers = [...TREES].sort((a, b) => b.h - a.h).slice(0, narrow ? 1 : 2);   // the tallest trunks
        for (const T of climbers){
          SNAILS.push({ kind: 'tree', T, k: 0.1 + r() * 0.4, dir: 1, side: r() < 0.5 ? -1 : 1, s: 0.75 + r() * 0.3, sp: 0.012 + r() * 0.008, ph: r() * TAU, shell: Math.floor(r() * SHELLS.length), hide: 0, hideT: -9, pause: 0, trail: [], lastTrail: 0, look: 0 });
        }
      }
      // is (x, y) on a trunk? (the ground band in front of the root flares is free)
      function trunkBlock(x, y){
        for (const T of TREES) if (y < T.base + 6 && y > T.topY && Math.abs(x - T.x - T.lean * (T.base - y)) < T.w0 * 1.1 + 8) return true;
        return false;
      }
      // where a tree snail is: k = 0 at the foot … 1 at the trunk top, on one side of the bark
      function snailPos(Sn, t){
        if (Sn.kind === 'ground') return { x: Sn.x, y: Sn.y, ang: 0, flip: Sn.dir };
        const T = Sn.T, k = Sn.k, y = T.base - k * (T.base - T.topY), x = T.x + T.lean * (T.base - y) + Sn.side * T.w0 * (0.78 - k * 0.3);
        return { x, y, ang: Sn.side * -Math.PI / 2 + T.lean * 0.5, flip: Sn.dir * Sn.side };
      }
      function updateSnails(t, dt){
        for (const Sn of SNAILS){
          const hiding = t < Sn.hideT + 2.6;
          Sn.hide += ((hiding ? 1 : 0) - Sn.hide) * Math.min(1, dt * (hiding ? 10 : 2.5));
          if (Sn.pause > 0){ Sn.pause -= dt; Sn.look = Math.sin(t * 2) * 0.3; }
          else {
            Sn.look *= 0.9;
            if (Math.random() < dt * 0.06) Sn.pause = 1.5 + Math.random() * 3;
            const crawl = (1 - Sn.hide) * (0.6 + 0.4 * Math.sin(t * 2.2 + Sn.ph));   // the foot's ripple
            if (Sn.kind === 'ground'){
              Sn.x += Sn.dir * Sn.sp * crawl * dt;
              if (Sn.x < 30){ Sn.dir = 1; } else if (Sn.x > DW - 30){ Sn.dir = -1; }
              else if (trunkBlock(Sn.x + Sn.dir * 18 * Sn.s, Sn.y)){ Sn.dir = -Sn.dir; Sn.pause = 1 + Math.random(); }
              if (Math.random() < dt * 0.02) Sn.dir = -Sn.dir;
            } else {
              Sn.k += Sn.dir * Sn.sp * crawl * dt;
              if (Sn.k > 0.92){ Sn.dir = -1; Sn.pause = 2; } else if (Sn.k < 0.02){ Sn.dir = 1; Sn.pause = 2; }
            }
          }
          // the slime trail: a point every so often, fading out
          if (t - Sn.lastTrail > 0.5){ const p = snailPos(Sn, t); Sn.trail.push({ x: p.x, y: p.y, t0: t }); Sn.lastTrail = t; if (Sn.trail.length > 26) Sn.trail.shift(); }
        }
      }
      function drawSnail(g, Sn, t){
        const P = snailPos(Sn, t), s = Sn.s, pal = SHELLS[Sn.shell], night = 1 - L.daylight;
        const hide = Sn.hide, ripple = 0.5 + 0.5 * Math.sin(t * 2.2 + Sn.ph);
        // the trail
        if (Sn.trail.length > 1){
          g.strokeStyle = rgb([255, 255, 255], 0.28 * (0.4 + 0.6 * L.daylight)); g.lineWidth = 3 * s; g.lineCap = 'round'; g.beginPath();
          Sn.trail.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.lineTo(P.x, P.y); g.stroke();
          g.fillStyle = rgb([255, 255, 255], 0.5 * L.daylight); g.beginPath(); for (const p of Sn.trail) if (Math.sin(p.t0 * 13 + t * 3) > 0.8){ g.moveTo(p.x + 1, p.y); g.arc(p.x, p.y, 1, 0, TAU); } g.fill();
        }
        g.save(); g.translate(P.x, P.y); g.rotate(P.ang); g.scale(P.flip * s, s);
        // shadow
        g.fillStyle = rgb([20, 14, 8], 0.22 * L.daylight); g.beginPath(); g.ellipse(2, 1, 22, 4, 0, 0, TAU); g.fill();
        // the foot: a glossy slug of a body, stretched out when crawling, drawn back into the shell when hiding
        const bodyL = lerp(28, 6, hide) + ripple * 2 * (1 - hide), bodyH = 7 - hide * 2;
        const skin = mixc(mixc([222, 186, 140], [240, 190, 120], 0.3 * L.warm), [60, 60, 100], 0.55 * night), skinD = mixc(skin, [120, 80, 50], 0.4);
        g.fillStyle = lg(g, 0, -bodyH * 2, 0, 2, [[0, rgb(skin)], [1, rgb(skinD)]]);
        g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-14, -bodyH * 1.6, bodyL * 0.3, -bodyH * 1.9); g.quadraticCurveTo(bodyL * 0.95, -bodyH * 2.1, bodyL, -bodyH * 0.9); g.quadraticCurveTo(bodyL + 2, 0.5, bodyL - 4, 0.5); g.lineTo(-14, 0.5); g.closePath(); g.fill();
        // the head end, the eye stalks with the big round eyes, the little smile
        const stalkK = 1 - hide, hx = bodyL - 2, hy = -bodyH * 1.6;
        if (stalkK > 0.05){
          g.strokeStyle = rgb(skin); g.lineWidth = 2.2; g.lineCap = 'round';
          const lk = Sn.look;
          for (const [ox, len, ang] of [[-1, 12, -0.55 + lk], [3, 12, -0.25 + lk]]){
            const ex = hx + ox + Math.sin(ang) * len * stalkK, ey = hy - Math.cos(ang) * len * stalkK;
            g.beginPath(); g.moveTo(hx + ox, hy + 1); g.quadraticCurveTo(hx + ox + Math.sin(ang) * len * 0.4 * stalkK, hy - len * 0.55 * stalkK, ex, ey); g.stroke();
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex, ey, 3.3 * stalkK, 0, TAU); g.fill();
            g.fillStyle = '#2A2420'; g.beginPath(); g.arc(ex + 0.9 * stalkK, ey - 0.3, 1.9 * stalkK, 0, TAU); g.fill();
            g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(ex + 1.6 * stalkK, ey - 1.2 * stalkK, 0.8 * stalkK, 0, TAU); g.fill();
          }
          g.strokeStyle = rgb(skinD); g.lineWidth = 1; g.beginPath(); g.arc(hx + 1, hy + 4, 2.6, 0.2, Math.PI - 0.2); g.stroke();   // the smile
          g.fillStyle = rgb([240, 150, 150], 0.5 * stalkK); g.beginPath(); g.arc(hx + 4.5, hy + 3.5, 1.6, 0, TAU); g.fill();   // a blush
        }
        // the shell: a spiral, striped, with a glint — a little wobble while hiding
        g.save(); g.translate(-2, -7); g.rotate(Math.sin(t * 14) * 0.08 * hide);
        const R = 11.5;
        const sc = mixc(mixc(pal[0], [255, 190, 110], 0.25 * L.warm), [40, 36, 80], 0.6 * night), sd = mixc(mixc(pal[1], [255, 170, 90], 0.2 * L.warm), [30, 26, 60], 0.6 * night);
        g.fillStyle = rg(g, -3, -4, 1, R, [[0, rgb(mixc(sc, [255, 240, 210], 0.3))], [1, rgb(sc)]]);
        g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.strokeStyle = rgb(sd); g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); for (let a = 0; a < TAU * 2.4; a += 0.2){ const rr = R * 0.08 + a / (TAU * 2.4) * R * 0.92; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        g.strokeStyle = rgb(sd, 0.45); g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 5; i++){ const a = i * 1.25 + 0.4; g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); g.lineTo(Math.cos(a) * R * 0.97, Math.sin(a) * R * 0.97); } g.stroke();
        g.fillStyle = rgb([255, 255, 255], 0.55 * (0.4 + 0.6 * L.daylight)); g.beginPath(); g.ellipse(-4, -5.5, 3.2, 1.8, -0.7, 0, TAU); g.fill();
        g.restore();
        g.restore();
        // a heart when it peeks out again
        if (hide > 0.02 && hide < 0.6 && t > Sn.hideT + 2.6){ g.fillStyle = rgb([255, 110, 140], (0.6 - hide) * 1.6); g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('♥', P.x, P.y - 34 * s - (0.6 - hide) * 20); }
      }
      function snailAt(dx, dy){ for (const Sn of SNAILS){ const P = snailPos(Sn, lastT); if (Math.hypot(dx - P.x, dy - P.y + 8 * Sn.s) < 30 * Sn.s) return Sn; } return null; }

      // ══════════════════════════════════════════════════════════════════════
      // THE HEDGEHOG — trundles across the clearing with a leaf on its back
      // ══════════════════════════════════════════════════════════════════════
      const HOG = { on: false, x: 0, y: 830, dir: 1, sp: 38, curl: 0, curlT: -9, leaf: 0, t0: 0, roll: 0, phase: 0 };
      let nextHogAt = 50;
      function startHog(t){ HOG.on = true; HOG.dir = Math.random() < 0.5 ? 1 : -1; HOG.x = HOG.dir > 0 ? -60 : DW + 60; HOG.y = 866 + Math.random() * 22; HOG.t0 = t; HOG.leaf = Math.floor(Math.random() * LEAF_COLS.length); HOG.curl = 0; HOG.curlT = -9; HOG.roll = 0; }
      function updateHog(t, dt){
        if (!HOG.on){ if (t > nextHogAt) startHog(t); return; }
        const curling = t < HOG.curlT + 2.8;
        HOG.curl += ((curling ? 1 : 0) - HOG.curl) * Math.min(1, dt * (curling ? 9 : 3));
        if (HOG.curl > 0.8) HOG.roll += HOG.dir * dt * 3;                  // the ball rolls on a little
        const v = HOG.sp * (1 - HOG.curl) * (RAIN.k > 0.4 ? 1.8 : 1);
        HOG.x += HOG.dir * v * dt + HOG.dir * HOG.curl * 10 * dt; HOG.phase += v * dt * 0.25;
        if ((HOG.dir > 0 && HOG.x > DW + 80) || (HOG.dir < 0 && HOG.x < -80)){ HOG.on = false; nextHogAt = t + 60 + Math.random() * 70; }
      }
      function drawHog(g, t){
        if (!HOG.on) return;
        const c = HOG.curl, night = 1 - L.daylight, s = narrow ? 0.8 : 1;
        g.save(); g.translate(HOG.x, HOG.y); g.scale(HOG.dir * s, s);
        g.fillStyle = rgb([20, 14, 8], 0.25 * L.daylight); g.beginPath(); g.ellipse(0, 2, 30, 6, 0, 0, TAU); g.fill();
        const spine = mixc(mixc([92, 64, 38], [130, 86, 44], 0.25 * L.warm), [36, 30, 66], 0.6 * night), tip = mixc(mixc([226, 204, 170], [255, 220, 170], 0.3 * L.warm), [90, 90, 130], 0.55 * night);
        const face = mixc(mixc([232, 200, 160], [245, 205, 150], 0.3 * L.warm), [80, 70, 110], 0.55 * night), dark = mixc(face, [90, 60, 40], 0.5);
        const bob = Math.abs(Math.sin(HOG.phase * 2)) * 1.5 * (1 - c);
        g.translate(0, -bob);
        if (c > 0.5) g.rotate(HOG.roll * (c - 0.5) * 2);
        const bx = lerp(-4, 0, c), rx = lerp(25, 21, c), ry = lerp(16, 21, c), cy = -ry * 0.6;
        // legs, under the body (two pairs stepping)
        if (c < 0.95){
          g.fillStyle = rgb(dark);
          for (let i = 0; i < 4; i++){ const ph = HOG.phase * 2 + (i % 2) * Math.PI, lx = (i < 2 ? -13 : 9) + Math.sin(ph) * 3.5 * (1 - c), ly = Math.max(0, -Math.cos(ph) * 2.5) * (1 - c); g.beginPath(); g.ellipse(lx, -3 - ly, 3.2, 3.8, 0, 0, TAU); g.fill(); }
        }
        // the spiny back: a dome, a dark underlayer of spines and a light layer over it
        g.fillStyle = rgb(spine); g.beginPath(); g.ellipse(bx, cy, rx, ry, 0, 0, TAU); g.fill();
        const a0 = Math.PI * (1.0 - 0.5 * c), a1 = TAU * (1.0 + 0.25 * c);
        const rr = makeRng(17);
        for (const [col, lw, ring] of [[mixc(spine, [20, 10, 4], 0.45), 2.0, 0.55], [mixc(spine, tip, 0.5), 1.6, 0.8], [tip, 1.3, 1.0]]){
          g.strokeStyle = rgb(col); g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
          const n = 22;
          for (let i = 0; i < n; i++){
            const a = a0 + (a1 - a0) * ((i + 0.5 + rr() * 0.4) / n), len = 6 + rr() * 5, k = ring - 0.18 - rr() * 0.12;
            const x0 = bx + Math.cos(a) * rx * k, y0 = cy + Math.sin(a) * ry * k, tilt = a + 0.25 * (1 - c);
            g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(tilt) * len * (ring === 1 ? 1.35 : 1), y0 + Math.sin(tilt) * len * (ring === 1 ? 1.35 : 1));
          }
          g.stroke();
        }
        // the leaf riding on its back
        if (leafSheetT){ g.save(); g.translate(bx - 4, cy - ry - 4); g.rotate(-0.4 + Math.sin(t * 3) * 0.05); g.drawImage(leafSheetT, HOG.leaf * LEAF_PX, 2 * LEAF_PX, LEAF_PX, LEAF_PX, -12, -12, 24, 24); g.restore(); }
        if (c < 0.95){
          g.globalAlpha = 1 - c;
          // the face: a pale pointed snout out of the spines, a black nose, a big bright eye, a round ear
          g.fillStyle = rgb(face); g.beginPath(); g.moveTo(14, -24); g.quadraticCurveTo(32, -19, 40, -6); g.quadraticCurveTo(32, 1, 14, -1); g.closePath(); g.fill();
          g.fillStyle = rgb(dark); g.beginPath(); g.arc(16, -24, 4.2, 0, TAU); g.fill();
          g.fillStyle = rgb(face); g.beginPath(); g.arc(16, -24, 2.4, 0, TAU); g.fill();
          g.fillStyle = '#2A2020'; g.beginPath(); g.ellipse(39.5, -6.5, 3, 2.6, 0, 0, TAU); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(25, -14, 3.6, 0, TAU); g.fill();
          g.fillStyle = '#2A2420'; g.beginPath(); g.arc(25.9, -14, 2.3, 0, TAU); g.fill();
          g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(26.8, -15.2, 0.9, 0, TAU); g.fill();
          g.fillStyle = rgb([240, 150, 150], 0.45); g.beginPath(); g.arc(31, -9, 2.4, 0, TAU); g.fill();
          g.strokeStyle = rgb(dark); g.lineWidth = 1; g.beginPath(); g.arc(34, -6, 2.5, 0.3, Math.PI * 0.8); g.stroke();   // a little smile
          g.globalAlpha = 1;
        }
        g.restore();
      }
      function hogAt(dx, dy){ return HOG.on && Math.hypot(dx - HOG.x, dy - HOG.y + 14) < 40; }

      // ══════════════════════════════════════════════════════════════════════
      // THE RAIN (יורה) — a short shower every few minutes, then a rainbow
      // ══════════════════════════════════════════════════════════════════════
      const RAIN = { phase: 'clear', k: 0, target: 0, t0: 0, dur: 16, nextAt: 95 + Math.random() * 60, rainbow: 0, count: 0 };
      const DROPS = [], RINGS = [];
      function startRain(t, len){ if (RAIN.phase !== 'clear') return; RAIN.phase = 'coming'; RAIN.t0 = t; RAIN.dur = len || 14 + Math.random() * 8; RAIN.count++; }
      function updateRain(t, dt){
        if (RAIN.phase === 'clear'){ if (t > RAIN.nextAt && L.daylight > 0.3) startRain(t); RAIN.target = 0; }
        else if (RAIN.phase === 'coming'){ RAIN.target = 1; if (t > RAIN.t0 + 5) { RAIN.phase = 'raining'; RAIN.t0 = t; } }
        else if (RAIN.phase === 'raining'){ RAIN.target = 1; if (t > RAIN.t0 + RAIN.dur){ RAIN.phase = 'fade'; RAIN.t0 = t; } }
        else if (RAIN.phase === 'fade'){ RAIN.target = 0; if (RAIN.k < 0.03 && t > RAIN.t0 + 14){ RAIN.phase = 'clear'; RAIN.nextAt = t + 150 + Math.random() * 90; RAIN.rainbow = 0; } }
        RAIN.k += (RAIN.target - RAIN.k) * Math.min(1, dt * 0.35);
        if (RAIN.k < 0.005 && RAIN.target === 0) RAIN.k = 0;
        // the rainbow stands while the rain thins and the sun is back
        const rbT = RAIN.phase === 'fade' ? clamp01((t - RAIN.t0 - 2) / 4) * clamp01(1 - (t - RAIN.t0 - 9) / 5) : 0;
        RAIN.rainbow += (rbT - RAIN.rainbow) * Math.min(1, dt * 1.5);
        wet = clamp01(wet + (RAIN.k > 0.3 ? dt * 0.12 : -dt * 0.012));
        // drops: a streak field falling with the wind, each ringing a puddle or pocking the ground
        const want = Math.round(RAIN.k * (narrow ? 90 : 170));
        while (DROPS.length < want) DROPS.push({ x: Math.random() * (DW + 300) - 150, y: Math.random() * DH, v: 620 + Math.random() * 260, l: 14 + Math.random() * 12, gy: 580 + Math.random() * 320 });
        if (DROPS.length > want) DROPS.length = want;
        const wx = wind(t) * 120;
        for (const d of DROPS){
          d.y += d.v * dt; d.x += wx * dt;
          if (d.y > d.gy){ if (Math.random() < 0.3) RINGS.push({ x: d.x, y: d.gy, t0: t }); d.y = -20 - Math.random() * 100; d.x = Math.random() * (DW + 300) - 150; }
        }
        for (let i = RINGS.length - 1; i >= 0; i--) if (t - RINGS[i].t0 > 0.6) RINGS.splice(i, 1);
      }
      function drawRain(g, t){
        if (RAIN.k < 0.01) return;
        const wx = wind(t) * 120;
        g.strokeStyle = rgb([220, 230, 245], 0.35 * RAIN.k * (0.5 + 0.5 * L.daylight)); g.lineWidth = 1.2; g.lineCap = 'round';
        g.beginPath(); for (const d of DROPS){ const k = d.l / d.v; g.moveTo(d.x, d.y); g.lineTo(d.x - wx * k, d.y - d.v * k); } g.stroke();
        g.strokeStyle = rgb([255, 255, 255], 0.4 * RAIN.k); g.lineWidth = 1;
        g.beginPath(); for (const r of RINGS){ const k = (t - r.t0) / 0.6; g.moveTo(r.x + 6 * k, r.y); g.ellipse(r.x, r.y, 6 * k + 1, 2 * k + 0.4, 0, 0, TAU); } g.stroke();
      }
      // ── the front layer: the sun's shafts through the crowns + the vignette, baked per look ──
      function paintFrontL(){
        const g = frontL.cx; g.setTransform(frontL.dpr, 0, 0, frontL.dpr, 0, 0); g.clearRect(0, 0, W, H);
        const sp = sunPos(tod), ra = L.warm * L.sunA * L.daylight * (1 - RAIN.k);
        if (sp.up && ra > 0.05){
          g.save(); g.setTransform(frontL.dpr * S, 0, 0, frontL.dpr * S, frontL.dpr * OX, frontL.dpr * OY);
          g.globalCompositeOperation = 'lighter';
          const r = makeRng(5);
          for (let i = 0; i < 6; i++){
            const a0 = Math.atan2(DH - sp.y, (sp.x < DW / 2 ? DW * 0.7 : DW * 0.3) - sp.x) + (r() - 0.5) * 0.9, wdt = 0.05 + r() * 0.06, len = 1400;
            g.fillStyle = rg(g, sp.x, sp.y, 0, len, [[0, rgb([255, 220, 150], 0.14 * ra)], [0.5, rgb([255, 210, 140], 0.05 * ra)], [1, 'rgba(255,200,120,0)']]);
            g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(sp.x + Math.cos(a0 - wdt) * len, sp.y + Math.sin(a0 - wdt) * len); g.lineTo(sp.x + Math.cos(a0 + wdt) * len, sp.y + Math.sin(a0 + wdt) * len); g.closePath(); g.fill();
          }
          g.restore();
        }
        // the vignette, warm by day and blue at night
        const vc = mixc([60, 30, 10], [4, 6, 24], 1 - L.daylight);
        g.fillStyle = rg(g, W / 2, H * 0.45, Math.min(W, H) * 0.45, Math.hypot(W, H) * 0.62, [[0, rgb(vc, 0)], [1, rgb(vc, 0.3 + 0.2 * (1 - L.daylight))]]);
        g.fillRect(0, 0, W, H);
      }

      // ── repaint on a look step ──
      function repaintIfNeeded(){
        const key = Math.floor(tod * KEYS.length * 24) * 16 + Math.round(RAIN.k * 12);
        if (key === lookKey) return;
        lookKey = key; L = rainify(lookAt(tod), RAIN.k);
        paintSkyL(); paintFarL(); paintGroundL(); paintGroveL(); paintFrontL();
        tintCrowns(); tintSquills(); tintClouds(); if (leafSheet) tintSprite(leafSheet, leafSheetT); tintCarpet();
        PROF.repaints++;
      }
      function resize(){
        W = innerWidth; H = innerHeight; DPR = pickDPR();
        canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        DW = Math.max(400, Math.min(2400, Math.round(DH * W / Math.max(1, H))));
        AXK = Math.min(1, DW / DW0);
        S = H / DH; OX = (W - DW * S) / 2; OY = 0;
        if (DW !== layoutDW){
          const wasNarrow = narrow;
          layoutDW = DW; layoutGrove(); layoutGround(); layoutSquills(); layoutSnails(); buildParticles(); buildClouds();
          if (BUNNIES.length && wasNarrow !== narrow){ for (const b of BUNNIES) b.remove(); BUNNIES.length = 0; if (bunLayer) bunLayer.remove(); bunLayer = null; setupBunnies(); }
          LEAVES.length = 0; PETALS.length = 0;
        }
        skyL = makeLayer(W, H, DPR); farL = makeLayer(W, H, DPR); groundL = makeLayer(W, H, DPR); groveL = makeLayer(W, H, DPR); frontL = makeLayer(W, H, DPR);
        carpetL = makeLayer(W, H, DPR); carpetL.cx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        carpetT = makeLayer(W, H, DPR);
        if (!leafSheet) bakeLeafSheet();
        lookKey = -1; repaintIfNeeded();
        warmTs = 0;
      }

      // ── the frame ──
      let frameDt = 0.016;
      function renderFrame(t){
        const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t; frameDt = dt;
        profT = performance.now(); PROF.frames++;
        if (todTween){
          const k = clamp01((t - todTween.t0) / todTween.dur);
          tod = todTween.from + (todTween.to - todTween.from) * smooth(k);
          if (k >= 1){ tod = todTween.to % 1; todTween = null; }
        } else tod = (tod + dt / DAY_SEC * todSpeed) % 1;
        updateRain(t, dt);
        if (BUNNIES.length) tintBunnies();
        repaintIfNeeded();
        updateLeaves(t, dt); updateSnails(t, dt); updateHog(t, dt); updateBees(t, dt);
        if (t > nextSkeinAt && L.daylight > 0.5){ launchSkein(); nextSkeinAt = t + 55 + Math.random() * 50; }
        mark('think');
        ctx.drawImage(skyL.cv, 0, 0, W, H);
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawStars(ctx, t); drawSunMoon(ctx, t); drawClouds(ctx, t); drawSkeins(ctx, t);
        ctx.restore();
        mark('sky');
        const farTop = Math.max(0, Math.floor(OY + (HZ - 300) * S));
        { const sy = farTop * farL.dpr; ctx.drawImage(farL.cv, 0, sy, farL.cv.width, farL.cv.height - sy, 0, farTop, W, H - farTop); }
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY); drawRainbow(ctx); ctx.restore();
        const gTop = Math.max(0, Math.floor(OY + (HZ - 4) * S));
        { const sy = gTop * groundL.dpr; ctx.drawImage(groundL.cv, 0, sy, groundL.cv.width, groundL.cv.height - sy, 0, gTop, W, H - gTop); }
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY); drawMist(ctx, t); drawPuddles(ctx, t); ctx.restore();
        mark('ground');
        ctx.drawImage(groveL.cv, 0, 0, W, H);
        drawCrowns(ctx, t);
        drawCarpet(ctx);
        mark('grove');
        ctx.save(); ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
        drawMotes(ctx, t);
        // the actors on the ground, far → near by their feet
        drawLiveShrooms(ctx, t);
        drawSquills(ctx, t); drawBees(ctx, t); drawPetals(ctx, t);
        for (const Sn of SNAILS) drawSnail(ctx, Sn, t);
        drawHog(ctx, t);
        drawFluff(ctx, t); drawFireflies(ctx, t);
        drawLeaves(ctx);
        drawRain(ctx, t);
        ctx.restore();
        mark('life');
        ctx.drawImage(frontL.cv, 0, 0, W, H);
        mark('front');
      }
      let prevTs = null, lastDrawTs = 0, lastDecide = 0, calmSince = 0, frameErr = false, warmTs = 0;
      function frame(ts){
        if (stopped) return;
        if (t0 === null) t0 = ts;
        rafId = requestAnimationFrame(frame);
        if (!warmTs) warmTs = ts;
        const warming = ts - warmTs < 1200;
        if (warming){ perf.gapEma = 16.7; perf.costEma = 0; lastDecide = ts; calmSince = ts; }
        else if (prevTs !== null) perf.gapEma += ((ts - prevTs) - perf.gapEma) * 0.08;
        prevTs = ts; perf.frames++;
        if (perf.halfRate && ts - lastDrawTs < perf.gapEma * 1.5) return;
        lastDrawTs = ts; perf.drawn++;
        const c0 = performance.now();
        try { renderFrame((ts - t0) / 1000); }
        catch (e){ if (!frameErr){ frameErr = true; console.error('autumn frame error', e); } }
        perf.costEma += ((performance.now() - c0) - perf.costEma) * 0.08;
        if (ts - lastDecide > 1500){
          lastDecide = ts;
          const heavy = perf.costEma > 8 || perf.gapEma > 21;
          if (heavy){ perf.halfRate = true; calmSince = ts; }
          else if (perf.costEma > 4.5 || perf.gapEma > 19) calmSince = ts;
          else if (perf.halfRate && !IS_TOUCH && ts - calmSince > 6000) perf.halfRate = false;
        }
      }

      // ── the bunnies: guests from the unicorn valley — its CSS rabbits hop the
      //    foreground band (the hedgehog's, in front of every trunk), darkened
      //    with the hour per rabbit (never a full-layer filter); a tap startles
      //    one into a big sparkly spring and a new coat
      const BUNNIES = [];
      let bunLayer = null, bunTintKey = null;
      function setupBunnies(){
        if (stopped || !window.Bunny || BUNNIES.length) return;
        bunLayer = doc.createElement('div');
        bunLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
        stage.appendChild(bunLayer);
        const sz = f => Math.max(5, Math.round(f * Math.min(1.15, S)));
        const specs = [
          { size: 9, coat: 'honey', band: [1.6, 3.2], hop: 2.2 },
          { size: 7, coat: undefined, band: [2.4, 4.2], hop: 1.9 },
          { size: 8, coat: 'pink', band: [1.4, 3.6], hop: 2.0 },
        ].slice(0, narrow ? 2 : 3);
        for (const sp of specs){
          const b = window.Bunny.place(bunLayer, { size: sz(sp.size), z: 4 });
          if (sp.coat) b.setCoat(sp.coat);
          b.roam({ bandMinPct: sp.band[0], bandMaxPct: sp.band[1], hopPct: narrow ? sp.hop * 1.8 : sp.hop, hopSec: 0.5,
                   restMinSec: 0.2, restMaxSec: 1.4, waitMinSec: 2, waitMaxSec: 7, startOnScreen: true });
          BUNNIES.push(b);
        }
        bunTintKey = null;
      }
      function tintBunnies(){
        const key = Math.round(L.daylight * 40) * 100 + Math.round(L.warm * 20);
        if (key === bunTintKey) return;
        bunTintKey = key;
        const f = 'brightness(' + (0.5 + 0.5 * L.daylight).toFixed(3) + ') saturate(' + (0.75 + 0.25 * L.daylight).toFixed(3) + ')' +
                  (L.warm > 0.05 ? ' sepia(' + (0.22 * L.warm).toFixed(3) + ')' : '');
        for (const b of BUNNIES) b.el.style.filter = f;
      }
      function bunnyAt(x, y){
        for (const b of BUNNIES){
          const r = b.el.getBoundingClientRect();
          if (r.width > 0 && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return b;
        }
        return null;
      }

      // ── clicks ──
      function nextKeyFrom(v){ for (const K of KEYS) if (K.at > v + 0.01) return K.at; return KEYS[0].at + 1; }
      function tweenTo(to){ todTween = { from: tod, to, t0: lastT, dur: 2.2 }; }
      const taps = { tree: 0, snail: 0, hog: 0, bunny: 0, squill: 0, ground: 0, sky: 0, cloud: 0 };
      function gust(T, t){
        T.kickT = t; gustAt(T.x, t, 1);
        if (T.bare){ leafUp(T, t); taps.leafUp = (taps.leafUp || 0) + 1; }
        else { const n = narrow ? 14 : 22; for (let i = 0; i < n; i++) releaseLeaf(T, null, true); }
        taps.tree++;
      }
      function onClick(e){
        if (e.target.closest(UI_SEL)) return;
        const dx = (e.clientX - OX) / S, dy = (e.clientY - OY) / S, t = lastT;
        const sp = sunPos(tod), mp = moonPos(tod);
        if (sp.up && L.sunA > 0.18 && Math.hypot(dx - sp.x, dy - sp.y) < 90){ tweenTo(nextKeyFrom(tod)); return; }
        if (mp.up && L.moon > 0.1 && Math.hypot(dx - mp.x, dy - mp.y) < 70){ tweenTo(nextKeyFrom(tod)); return; }
        const bn = bunnyAt(e.clientX, e.clientY); if (bn){ bn.startle(); taps.bunny++; return; }
        const Sn = snailAt(dx, dy); if (Sn){ Sn.hideT = t; Sn.pause = 3; taps.snail++; return; }
        if (hogAt(dx, dy)){ HOG.curlT = t; taps.hog++; return; }
        const Sq = squillAt(dx, dy); if (Sq){ squillTap(Sq, t); taps.squill++; return; }
        const T = treeAt(dx, dy); if (T){ gust(T, t); return; }
        for (const C of CLOUDS) if (dx > C.x && dx < C.x + C.w && dy > C.y && dy < C.y + C.h){ startRain(t); taps.cloud++; return; }
        if (dy < HZ - 120){ launchSkein(); taps.sky++; return; }
        if (dy > HZ + 40){ popMushroom(dx, Math.max(dy, HZ + 60), t); taps.ground++; }
      }

      resize();
      addEventListener('resize', resize);
      doc.addEventListener('click', onClick);
      rafId = requestAnimationFrame(frame);
      needBunny(setupBunnies);

      window._aut = BACKGROUNDS.autumn._test = {
        tod: () => tod,
        setTod: v => { tod = ((v % 1) + 1) % 1; todTween = null; lookKey = -1; },
        setSpeed: v => { todSpeed = v; },
        phase: () => L.name, look: () => L,
        seek: s => { t0 = (t0 === null ? 0 : t0); t0 -= (s - lastT) * 1000; lastT = s; },
        rain: len => { RAIN.phase = 'clear'; startRain(lastT, len); },
        rainAt: (k, phase) => { RAIN.k = RAIN.target = k; RAIN.phase = phase || (k > 0 ? 'raining' : 'clear'); RAIN.t0 = lastT; RAIN.dur = 60; if (k === 0){ DROPS.length = 0; RINGS.length = 0; RAIN.rainbow = 0; } lookKey = -1; },
        rainbow: k => { RAIN.rainbow = k; },
        rainState: () => ({ phase: RAIN.phase, k: +RAIN.k.toFixed(2), rainbow: +RAIN.rainbow.toFixed(2), drops: DROPS.length, wet: +wet.toFixed(2), nextAt: +RAIN.nextAt.toFixed(1), count: RAIN.count }),
        wind: () => wind(lastT), gust: i => { const T = TREES[i == null ? Math.floor(Math.random() * TREES.length) : i]; if (T) gust(T, lastT); },
        sun: () => sunPos(tod), moon: () => moonPos(tod),
        trees: () => TREES.map(T => ({ x: Math.round(T.x), base: T.base, h: T.h, spread: T.spread, pal: T.pal, lobes: T.lobes.length, top: Math.round(T.top), bare: !!T.bare, twigs: T.twigs.length, cling: T.cling.length })),
        leaves: () => ({ falling: LEAVES.length, released, landed, max: MAX_LEAVES }),
        snails: () => SNAILS.map(Sn => { const P = snailPos(Sn, lastT); return { kind: Sn.kind, x: Math.round(P.x), y: Math.round(P.y), dir: Sn.dir, hide: +Sn.hide.toFixed(2), k: Sn.k == null ? null : +Sn.k.toFixed(3), trail: Sn.trail.length }; }),
        snailXY: i => { const Sn = SNAILS[i]; if (!Sn) return null; const P = snailPos(Sn, lastT); return { x: OX + P.x * S, y: OY + (P.y - 8 * Sn.s) * S }; },
        squills: () => SQUILLS.map(Sq => ({ x: Math.round(Sq.x), y: Sq.y, h: Math.round(Sq.h), flowers: Sq.flowers.length, bend: Sq.pose ? +Sq.pose.bend.toFixed(3) : 0 })),
        squillXY: i => { const Sq = SQUILLS[i]; if (!Sq) return null; const P = Sq.pose || squillPose(Sq, lastT); return { x: OX + lerp(Sq.x, P.tipX, 0.7) * S, y: OY + (P.tipY - Sq.sh * 0.5) * S }; },
        bees: () => BEES.map(B => ({ sq: B.sq, x: Math.round(B.x), y: Math.round(B.y), away: +(B.away || 0).toFixed(2) })),
        hog: () => ({ on: HOG.on, x: Math.round(HOG.x), y: HOG.y, dir: HOG.dir, curl: +HOG.curl.toFixed(2), nextAt: +nextHogAt.toFixed(1) }),
        hogStart: xFrac => { startHog(lastT); if (xFrac != null){ HOG.x = DW * xFrac; HOG.dir = 1; } }, hogXY: () => ({ x: OX + HOG.x * S, y: OY + (HOG.y - 14) * S }),
        storks: () => SKEINS.map(K => ({ x: Math.round(K.x), y: Math.round(K.y), dir: K.dir, birds: K.birds.length })),
        skein: xFrac => { launchSkein(); if (xFrac != null){ const K = SKEINS[SKEINS.length - 1]; K.x = DW * xFrac; } },
        shrooms: () => SHROOMS.length, pop: (x, y) => popMushroom(x, y, lastT),
        treeXY: i => { const T = TREES[i]; if (!T) return null; const Lb = T.lobes[T.lobes.length - 1]; return { x: OX + Lb.x * S, y: OY + Lb.y * S }; },
        groundXY: () => ({ x: OX + DW * 0.5 * S, y: OY + 780 * S }),
        skyXY: () => ({ x: OX + DW * 0.5 * S, y: OY + 120 * S }),
        taps: () => Object.assign({}, taps),
        crownsDrawn: () => ({ drawn: crownsDrawn, lobes: TREES.reduce((n, T) => n + (T.bare ? 0 : T.lobes.length), 0) }),
        kicks: () => ({ trees: TREES.map(T => +kickOf(T, lastT, 0.9).toFixed(3)), squills: SQUILLS.map(Sq => +kickOf(Sq, lastT, 1.3).toFixed(3)) }),
        bunnies: () => BUNNIES.map(b => { const r = b.el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom), w: Math.round(r.width), coat: b._coat || 'lavender', active: !!b.active, filter: b.el.style.filter }; }),
        bunnyXY: i => { const b = BUNNIES[i]; if (!b) return null; const r = b.el.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.6 }; },
        layout: () => ({ DW, k: +AXK.toFixed(3), narrow, trees: TREES.map(T => Math.round(T.x)), squills: SQUILLS.map(Sq => Math.round(Sq.x)), fence: FENCE ? Math.round(FENCE.x0) : null }),
        perf: () => ({ dpr: +DPR.toFixed(2), DW, halfRate: perf.halfRate, gapEma: +perf.gapEma.toFixed(1), costEma: +perf.costEma.toFixed(2), frames: perf.frames, drawn: perf.drawn, S: +S.toFixed(3) }),
        pmax: () => PMAX,
        prof: () => { const o = {}; for (const k in PROF) o[k] = (k === 'frames' || k === 'repaints') ? PROF[k] : PROF[k] / Math.max(1, PROF.frames); return o; },
        profReset: () => { for (const k in PROF) delete PROF[k]; PROF.frames = 0; PROF.repaints = 0; },
      };

      return function cleanup(){
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        removeEventListener('resize', resize);
        doc.removeEventListener('click', onClick);
        for (const b of BUNNIES) b.remove(); BUNNIES.length = 0;
        if (window._aut === BACKGROUNDS.autumn._test) delete window._aut;
        stage.innerHTML = '';
      };
    },
  };
})();
