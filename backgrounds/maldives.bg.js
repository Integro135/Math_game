/* =====================================================================
   maldives.bg.js — "MALDIVES" beach: a white-sand tropical shore over a
   turquoise lagoon, islands on the horizon, swaying palms — and a SKY
   THAT LIVES THROUGH THE DAY: high sun → golden hour → a flaming sunset
   with a gold glitter path on the water, looping forever.
   ---------------------------------------------------------------------
   STANDALONE background module (not wired into the game yet — same
   workflow as dinosaurs2/frozen: developed against
   backgrounds/maldives.html, ported into the theme menu on request).

   One self-contained IIFE: pure DOM/SVG/WAAPI, ES5, file:// safe, every
   class / keyframe / id namespaced mv*. Registers
       window.BACKGROUNDS.maldives = { skin, aids, preload,
                                       init({stage}) → cleanup,
                                       gallery({stage}) → cleanup }
   per the bg-loader contract (game/js/bg-loader.js).

   THE DAY CYCLE — one shared 140s clock (DAY_MS): every phase-dependent
   layer runs a WAAPI animation of the SAME duration on the same offsets
   (st.cycleAnims), so seeking one time seeks the whole world:
     · the sun travels a full arc (rises left, noon high, sets right —
       it dips BELOW the horizon behind the sea layer, where it also
       loops back, invisibly, to the east);
     · a sunset-sky gradient crossfades over the day sky;
     · the sun crossfades from noon white-gold to a big warm orange;
     · a warm veil tints the whole scene at dawn/golden hour/sunset;
     · a gold GLITTER PATH ignites on the water under the setting sun.
   The scene BOOTS at mid-morning (25% of the cycle) so it opens sunny.
   _test.seek(0..1) jumps the entire cycle for tests/screenshots.

   Ambient: palm fronds + trunks sway (CSS, staggered), clouds drift
   across (loop restarts off-screen), water sparkles glint, distant gulls
   cross the sky now and then, and a little dhoni sailboat slides along
   the horizon every few minutes.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NS = 'http://www.w3.org/2000/svg';
  var SCENE_W = 1280, SCENE_H = 800;
  var HORIZON = 440;                    // sea meets sky
  var DAY_MS = 140000;                  // one full sun cycle
  var BOOT_F = 0.25;                    // open at mid-morning

  /* where this file lives → resolve the sibling pokemons/ modules. In the GAME
     the beach walkers only appear if window.Pokemons is loaded, and the game's
     index.html does NOT ship those scripts — so (like dinosaurs2 loads its
     rumi/ deps) we inject them ourselves from backgrounds/pokemons/. The
     standalone harness already <script>s them, so needPokemon() no-ops there. */
  var BASE = (function () {
    var s = doc.currentScript;
    return s && s.src ? s.src.replace(/[^/]*$/, '') : 'backgrounds/';
  })();
  var PKMN = BASE + 'pokemons/';
  function needPokemon(name, cb) {
    if (w.Pokemons && w.Pokemons[name] && w.Pokemons[name].place) { cb(); return; }
    var sel = 'script[data-mvpk="' + name + '"]', ex = doc.querySelector(sel);
    if (ex) { ex.addEventListener('load', cb); ex.addEventListener('error', cb); return; }
    var s = doc.createElement('script');
    s.src = PKMN + name + '.js'; s.setAttribute('data-mvpk', name);
    s.onload = cb; s.onerror = cb;                 // cb still runs on error — never block the scene
    doc.head.appendChild(s);
  }
  // load every walker + the flyer (best-effort); cb fires once all are attempted
  function loadPokemons(cb) {
    var names = GROUND.concat([FLYER]), left = names.length;
    if (!left) { cb(); return; }
    names.forEach(function (n) { needPokemon(n, function () { if (--left === 0) cb(); }); });
  }

  /* ── helpers (house pattern) ─────────────────────────────────────── */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function el(tag, cls, css) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = doc.createElementNS(NS, tag), k;
    for (k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function animate(node, frames, opts) {
    if (node.animate) return node.animate(frames, opts);
    return null;
  }
  function gone(node, ms) {
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, ms);
  }
  /* a day-cycle animation: same clock as every other cycle layer */
  function cyc(st, node, frames) {
    var a = animate(node, frames, { duration: DAY_MS, iterations: Infinity, easing: 'linear' });
    if (a) { a.currentTime = BOOT_F * DAY_MS; st.cycleAnims.push(a); st.anims.push(a); }
    return a;
  }

  /* ── CSS — injected once, everything namespaced mv ───────────────── */
  var CSS = [
    /* absolute-fill the host stage (the game's #stars-layer is fixed inset:0
       z-index:-1; the standalone #stage is fixed inset:0) — layers stack by DOM
       order (back scene → actors → front palms) within that stage. */
    '.mvscene{position:absolute;inset:0;overflow:hidden;pointer-events:none;user-select:none;-webkit-user-select:none}',
    '.mvscene svg{display:block;width:100%;height:100%}',
    /* palm sway — whole tree breathes, each frond has its own ripple */
    '.mv-palm{transform-box:fill-box;transform-origin:50% 100%;animation:mvPalmSway 7.5s ease-in-out infinite alternate}',
    '@keyframes mvPalmSway{0%{transform:rotate(-1.1deg)}100%{transform:rotate(1.1deg)}}',
    '.mv-frond{transform-box:fill-box;transform-origin:8% 50%;animation:mvFrondSway 4.6s ease-in-out infinite alternate}',
    '@keyframes mvFrondSway{0%{transform:rotate(-2.4deg)}100%{transform:rotate(2.6deg)}}',
    /* coconut TAP target — the scene is pointer-events:none, so the transparent
       hit-pad must opt back IN with pointer-events:all (a transparent SVG fill
       is NOT hit under the default visiblePainted) */
    '.mv-coco-hit{pointer-events:all;cursor:pointer}',
    /* foam lines breathe up the sand and fade back */
    '.mv-foam1{animation:mvFoam 7.2s ease-in-out infinite}',
    '.mv-foam2{animation:mvFoam 9.4s ease-in-out infinite;animation-delay:-3.4s}',
    '@keyframes mvFoam{0%,100%{transform:translateY(0);opacity:.85}55%{transform:translateY(-13px);opacity:.35}}',
    /* gull wing-flap */
    '.mv-wing{transform-box:fill-box;transform-origin:50% 100%;animation:mvFlap .5s ease-in-out infinite alternate}',
    '@keyframes mvFlap{0%{transform:scaleY(.35)}100%{transform:scaleY(1.15)}}',
    /* the glitter path shimmers */
    '.mv-glit{animation:mvGlit 2.6s ease-in-out infinite alternate}',
    '@keyframes mvGlit{0%{opacity:.55}100%{opacity:1}}',
    /* stars twinkle (the group-level day fade multiplies over this) */
    '.mv-star{animation:mvTwinkle 3.4s ease-in-out infinite}',
    '@keyframes mvTwinkle{0%,100%{opacity:.3}50%{opacity:1}}'
  ].join('\n');

  function injectCSS() {
    if (doc.getElementById('maldives-css')) return;
    var s = el('style');
    s.id = 'maldives-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── a PALM TREE (markup string) — used full-size on the beach and
        miniature on the horizon islands. Local origin = trunk base;
        crown fronds droop and sway (mv-frond). lean mirrors via sx. ── */
  function palm(x, y, h, sx, sway, trunkFill) {
    var cx = h * 0.34, cy = -h * 0.92;             // crown vs trunk base
    trunkFill = trunkFill || 'url(#mvTrunkG)';     // front-layer palms pass their own id
    /* positioning lives on the OUTER group; the sway class rides an INNER
       one — a CSS transform animation REPLACES an svg transform attribute,
       so they must never share an element */
    var m = ['<g transform="translate(' + x + ',' + y + ') scale(' + sx + ',1)">',
             '<g class="' + (sway ? 'mv-palm' : '') + '">'];
    /* tapered curved trunk + rings */
    m.push('<path d="M-9,2 C-2,' + (-h * 0.38) + ' ' + (h * 0.16) + ',' + (-h * 0.66) + ' ' + (cx - 4) + ',' + (cy + 6) +
      ' L' + (cx + 8) + ',' + (cy + 12) + ' C' + (h * 0.22) + ',' + (-h * 0.58) + ' ' + (h * 0.05) + ',' + (-h * 0.32) + ' 11,3 Z" ' +
      'fill="' + trunkFill + '"/>');
    var i, t;
    for (i = 1; i <= 6; i++) {
      t = i / 7;
      m.push('<path d="M' + (-9 + (cx + 3) * t + 2 * t * t) + ',' + (2 + (cy + 3) * t) +
        ' q 9,3 19,-1" fill="none" stroke="#7A5A38" stroke-width="1.6" opacity=".5"/>');
    }
    /* coconuts — on the SWAYING (foreground) palms they are CLICKABLE: a tap
       drops the lowest one, which falls and fades away (see the frontSvg click
       handler in buildScene). A transparent hit-pad over the small cluster
       makes them easy to tap; island (non-sway) palms keep plain coconuts. */
    var coco =
      '<circle class="mv-coco" cx="' + (cx - 8) + '" cy="' + (cy + 10) + '" r="7"/>' +
      '<circle class="mv-coco" cx="' + (cx + 5) + '" cy="' + (cy + 14) + '" r="6.4"/>' +
      '<circle class="mv-coco" cx="' + (cx - 1) + '" cy="' + (cy + 18) + '" r="5.6"/>';
    if (sway) {
      m.push('<g class="mv-cocos">' +
        '<circle class="mv-coco-hit" cx="' + (cx - 1) + '" cy="' + (cy + 14) + '" r="20" fill="transparent"/>' +
        '<g fill="#6B4A2B" stroke="#4E3319" stroke-width="1.5">' + coco + '</g></g>');
    } else {
      m.push('<g fill="#6B4A2B" stroke="#4E3319" stroke-width="1.5">' + coco + '</g>');
    }
    /* fronds — long tapered droopy leaves, two greens for depth */
    var L = h * 0.62;
    var defs = [
      [-168, 0.92, '#2E8B57'], [-138, 1.00, '#39A968'], [-104, 1.04, '#2E8B57'],
      [-72, 1.02, '#43B873'], [-38, 1.00, '#2E8B57'], [-8, 0.94, '#39A968'],
      [18, 0.86, '#2F9159']
    ];
    for (i = 0; i < defs.length; i++) {
      var a = defs[i][0], s = defs[i][1] * L, c = defs[i][2];
      m.push('<g transform="translate(' + cx + ',' + cy + ') rotate(' + a + ')">' +
        '<g class="' + (sway ? 'mv-frond' : '') + '" style="animation-delay:' + (-i * 0.7) + 's">' +
        '<path d="M0,0 C' + (s * 0.34) + ',' + (-s * 0.15) + ' ' + (s * 0.72) + ',' + (-s * 0.13) + ' ' + s + ',' + (s * 0.03) +
        ' C' + (s * 0.66) + ',' + (s * 0.12) + ' ' + (s * 0.28) + ',' + (s * 0.08) + ' 0,0 Z" fill="' + c + '"/>' +
        '<path d="M0,0 C' + (s * 0.36) + ',' + (-s * 0.09) + ' ' + (s * 0.7) + ',' + (-s * 0.06) + ' ' + s + ',' + (s * 0.03) +
        '" fill="none" stroke="#1F6B41" stroke-width="' + Math.max(1, s * 0.014) + '" opacity=".55"/>' +
        '</g></g>');
    }
    m.push('</g></g>');
    return m.join('');
  }

  /* ── a horizon ISLAND — hazy green islet + sand sliver + mini palms ── */
  function island(x, y, wd, haze, palms) {
    var m = ['<g opacity="' + haze + '" transform="translate(' + x + ',' + y + ')">'];
    m.push('<path d="M' + (-wd / 2) + ',0 Q' + (-wd * 0.24) + ',' + (-wd * 0.10) + ' 0,' + (-wd * 0.115) +
      ' Q' + (wd * 0.26) + ',' + (-wd * 0.095) + ' ' + (wd / 2) + ',0 Z" fill="#2E7D5B"/>');
    m.push('<path d="M' + (-wd / 2) + ',0 Q0,' + (wd * 0.035) + ' ' + (wd / 2) + ',0 L' + (wd * 0.42) + ',2.5 Q0,' + (wd * 0.055) + ' ' + (-wd * 0.42) + ',2.5 Z" fill="#F2E3BC"/>');
    var i;
    for (i = 0; i < palms.length; i++) {
      m.push(palm(palms[i][0] * wd, -wd * 0.05, wd * palms[i][1], palms[i][2], false));
    }
    m.push('</g>');
    return m.join('');
  }

  /* ── the full scene ─────────────────────────────────────────────── */
  function buildScene(stage, st) {
    var scene = el('div', 'mvscene');
    var svg = svgEl('svg', { viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H, preserveAspectRatio: 'xMidYMid slice' });

    /* ── night STARS: scattered across the upper sky (denser + brighter up
          high where the sunset sky is darkest, sparse toward the horizon);
          ~half twinkle. The whole group fades in only at dusk (cycle). ── */
    var stars = '', i, sy, sr, tw;
    for (i = 0; i < 66; i++) {
      sy = Math.pow(Math.random(), 1.7) * 330 + 6;    // biased toward the top
      sr = rnd(0.7, 2.3);
      tw = Math.random() < 0.5;
      stars += '<circle cx="' + rnd(12, 1268).toFixed(0) + '" cy="' + sy.toFixed(0) +
        '" r="' + sr.toFixed(1) + '" fill="#FFFDF2"' +
        (tw ? ' class="mv-star" style="animation-delay:' + (-rnd(0, 3.4)).toFixed(2) + 's"' : '') + '/>';
    }
    /* a handful of bigger 4-point sparkle stars up high */
    for (i = 0; i < 7; i++) {
      var bx = rnd(60, 1220), by = rnd(20, 190), s = rnd(3, 5);
      stars += '<path transform="translate(' + bx.toFixed(0) + ',' + by.toFixed(0) + ')" fill="#FFFEF6"' +
        ' class="mv-star" style="animation-delay:' + (-rnd(0, 3.4)).toFixed(2) + 's"' +
        ' d="M0,' + (-s * 2) + ' L' + (s * 0.5) + ',' + (-s * 0.5) + ' L' + (s * 2) + ',0 L' + (s * 0.5) + ',' + (s * 0.5) +
        ' L0,' + (s * 2) + ' L' + (-s * 0.5) + ',' + (s * 0.5) + ' L' + (-s * 2) + ',0 L' + (-s * 0.5) + ',' + (-s * 0.5) + ' Z"/>';
    }

    svg.innerHTML = [
      '<defs>',
      /* day sky: rich azure → pale aqua at the horizon */
      '<linearGradient id="mvSkyDay" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#2E86D4"/><stop offset=".55" stop-color="#6FBCE8"/>',
      '<stop offset=".85" stop-color="#BDE7F4"/><stop offset="1" stop-color="#E9F9FB"/>',
      '</linearGradient>',
      /* sunset sky: violet → magenta → flame → gold at the horizon */
      '<linearGradient id="mvSkySet" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#4A2E86"/><stop offset=".38" stop-color="#A6427C"/>',
      '<stop offset=".68" stop-color="#E8643C"/><stop offset=".88" stop-color="#FF9C4A"/>',
      '<stop offset="1" stop-color="#FFD98A"/>',
      '</linearGradient>',
      /* lagoon: deep blue at the horizon → maldivian turquoise inshore */
      '<linearGradient id="mvSeaG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#1D6FA8"/><stop offset=".3" stop-color="#1F9BBE"/>',
      '<stop offset=".62" stop-color="#2FC4C9"/><stop offset="1" stop-color="#6FE6D8"/>',
      '</linearGradient>',
      /* bottlenose dolphin countershading (ported from the Dubai background):
         slate back → white belly, top-to-bottom */
      '<linearGradient id="mvDolphinG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#56697a"/><stop offset=".45" stop-color="#6b8092"/>',
      '<stop offset=".7" stop-color="#9fb2c0"/><stop offset=".85" stop-color="#e6eef4"/>',
      '<stop offset="1" stop-color="#f2f7fa"/>',
      '</linearGradient>',
      /* the warm veil that washes the world at golden hour */
      '<linearGradient id="mvWarmG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#FF8A3C" stop-opacity=".14"/>',
      '<stop offset=".52" stop-color="#FF7E3C" stop-opacity=".5"/>',
      '<stop offset=".7" stop-color="#FF9C55" stop-opacity=".34"/>',
      '<stop offset="1" stop-color="#FF7E3C" stop-opacity=".22"/>',
      '</linearGradient>',
      '<radialGradient id="mvSunHalo" cx=".5" cy=".5" r=".5">',
      '<stop offset=".22" stop-color="#FFF6D8" stop-opacity=".85"/>',
      '<stop offset=".55" stop-color="#FFEFB0" stop-opacity=".3"/>',
      '<stop offset="1" stop-color="#FFEFB0" stop-opacity="0"/>',
      '</radialGradient>',
      '<radialGradient id="mvSunHaloWarm" cx=".5" cy=".5" r=".5">',
      '<stop offset=".18" stop-color="#FFA04E" stop-opacity="1"/>',
      '<stop offset=".5" stop-color="#FF7E3C" stop-opacity=".5"/>',
      '<stop offset="1" stop-color="#FF7E3C" stop-opacity="0"/>',
      '</radialGradient>',
      /* the horizon bloom where the sun melts into the sea */
      '<radialGradient id="mvSetGlowG" cx=".5" cy=".5" r=".5">',
      '<stop offset="0" stop-color="#FFC66E" stop-opacity=".9"/>',
      '<stop offset=".55" stop-color="#FF9448" stop-opacity=".45"/>',
      '<stop offset="1" stop-color="#FF9448" stop-opacity="0"/>',
      '</radialGradient>',
      /* the gold path the setting sun lays on the water */
      '<linearGradient id="mvGlitG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#FFD98A" stop-opacity=".95"/>',
      '<stop offset=".5" stop-color="#FFB460" stop-opacity=".55"/>',
      '<stop offset="1" stop-color="#FF9C4A" stop-opacity="0"/>',
      '</linearGradient>',
      '<linearGradient id="mvSandG" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#FFF6DE"/><stop offset=".4" stop-color="#FBEBC4"/>',
      '<stop offset="1" stop-color="#EFD9A8"/>',
      '</linearGradient>',
      '<linearGradient id="mvTrunkG" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0" stop-color="#9A7248"/><stop offset=".5" stop-color="#B98F5E"/>',
      '<stop offset="1" stop-color="#7C5A36"/>',
      '</linearGradient>',
      '</defs>',

      /* ── SKY: day base + sunset crossfade layer (id → cycle anim) ── */
      '<rect width="1280" height="800" fill="url(#mvSkyDay)"/>',
      '<rect id="mvSkySetR" width="1280" height="800" fill="url(#mvSkySet)"/>',
      /* stars sit IN FRONT of the sunset sky (which is opaque at dusk) but
         behind the sun/clouds; the group opacity is driven by the cycle */
      '<g id="mvStars" opacity="0">' + stars + '</g>',

      /* ── THE SUN (painted BEFORE the sea, so it truly sinks behind
            the water; the group is driven along the day arc) ── */
      '<g id="mvSun">',
      '<circle r="120" fill="url(#mvSunHalo)"/>',
      '<circle id="mvSunHaloW" r="150" fill="url(#mvSunHaloWarm)"/>',
      '<circle r="42" fill="#FFF9E0"/>',
      '<circle id="mvSunWarm" r="46" fill="#FF8438"/>',
      '</g>',

      /* clouds (drift anims added at runtime) */
      '<g id="mvClouds"></g>',

      /* gulls live here (spawned on a timer) */
      '<g id="mvBirds"></g>',

      /* ── horizon islands ── */
      island(300, HORIZON - 1, 150, 0.55, [[-0.14, 0.34, 1]]),
      island(1060, HORIZON - 1, 230, 0.8, [[-0.2, 0.42, 1], [0.16, 0.34, -1]]),
      island(700, HORIZON - 2, 90, 0.4, []),

      /* ── the sea ── */
      '<rect x="0" y="' + HORIZON + '" width="1280" height="' + (SCENE_H - HORIZON) + '" fill="url(#mvSeaG)"/>',
      /* soft sheen bands */
      '<ellipse cx="420" cy="500" rx="300" ry="10" fill="#CFF6F2" opacity=".22"/>',
      '<ellipse cx="900" cy="545" rx="340" ry="12" fill="#CFF6F2" opacity=".18"/>',
      '<ellipse cx="560" cy="600" rx="380" ry="13" fill="#E8FFFB" opacity=".2"/>',
      /* the sunset bloom on the horizon (cycle-driven opacity) */
      '<ellipse id="mvSetGlow" cx="900" cy="446" rx="200" ry="62" fill="url(#mvSetGlowG)"/>',
      /* sparkles get planted here */
      '<g id="mvSpark"></g>',
      /* the boat crosses on this line */
      '<g id="mvBoat"></g>',
      /* leaping dolphins surface here (ported from Dubai) */
      '<g id="mvDolphins"></g>',

      /* ── the GLITTER PATH under the setting sun (x≈900) ── */
      '<g id="mvGlitter">',
      '<polygon points="878,442 922,442 958,660 842,660" fill="url(#mvGlitG)"/>',
      '<g class="mv-glit" fill="#FFE9B0">',
      '<ellipse cx="899" cy="472" rx="26" ry="3"/><ellipse cx="902" cy="506" rx="34" ry="3.4" opacity=".85"/>',
      '<ellipse cx="896" cy="546" rx="42" ry="3.8" opacity=".7"/><ellipse cx="903" cy="592" rx="50" ry="4.2" opacity=".55"/>',
      '<ellipse cx="898" cy="634" rx="56" ry="4.6" opacity=".4"/>',
      '</g></g>',

      /* ── the beach — white sand sweeping the foreground; the top edge was
            raised ~110u (≈3cm) UP into the lagoon for a bigger beach ── */
      '<path d="M0,602 Q300,550 640,566 Q980,582 1280,538 L1280,800 L0,800 Z" fill="url(#mvSandG)"/>',
      /* wet sand line */
      '<path d="M0,604 Q300,552 640,568 Q980,584 1280,540 L1280,554 Q980,598 640,582 Q300,566 0,618 Z" fill="#D8BE8E" opacity=".45"/>',
      /* lapping foam lines */
      '<path class="mv-foam1" d="M0,600 Q300,548 640,564 Q980,580 1280,536" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".8"/>',
      '<path class="mv-foam2" d="M0,590 Q300,540 640,556 Q980,572 1280,528" fill="none" stroke="#EFFffA" stroke-width="3" stroke-linecap="round" opacity=".5"/>',

      /* beach details — starfish + shells */
      '<g transform="translate(920,742) rotate(18) scale(1.15)">',
      '<path d="M0,-13 L3.6,-4.2 L13,-3.4 L6,2.8 L8.2,12 L0,7 L-8.2,12 L-6,2.8 L-13,-3.4 L-3.6,-4.2 Z" fill="#FF8A65" stroke="#E06B48" stroke-width="1.6" stroke-linejoin="round"/>',
      '<circle cx="0" cy="0" r="1.6" fill="#FFD1B8"/><circle cx="0" cy="-6.4" r="1.1" fill="#FFD1B8"/><circle cx="5.6" cy="-1.8" r="1.1" fill="#FFD1B8"/>',
      '</g>',
      '<g transform="translate(360,758)"><path d="M0,0 A9,9 0 0 1 18,0 L9,2.5 Z" fill="#F6E8F1" stroke="#D9BFD2" stroke-width="1.4"/>',
      '<path d="M4,-6.5 L9,2 M14,-6.5 L9,2" stroke="#D9BFD2" stroke-width="1.1" fill="none"/></g>',
      '<g transform="translate(210,776) rotate(-14)"><path d="M0,0 A7,7 0 0 1 14,0 L7,2 Z" fill="#FBE3D0" stroke="#DFB999" stroke-width="1.3"/></g>',

      /* the WALKERS layer (pokemons) is a DOM div slotted BETWEEN this back
         scene and the front-palm SVG — see below; the foreground palms + the
         golden-hour veil now live on that TOP layer so a) the palms occlude
         the pokemons and b) the veil tints the whole composite. */
      '<g id="mvFx"></g>'
    ].join('');

    scene.appendChild(svg);
    stage.appendChild(scene);
    st.svg = svg;

    /* ── ACTORS layer — pokemons walk here, above the sand, below the palms ── */
    var actors = el('div', 'mv-actors', 'position:absolute;inset:0;pointer-events:none');
    stage.appendChild(actors);
    st.actors = actors;

    /* ── FRONT layer — the two foreground palms (so they stand IN FRONT of the
          walkers) + the golden-hour veil tinting everything below it ── */
    var front = el('div', 'mvscene');
    var fsvg = svgEl('svg', { viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H, preserveAspectRatio: 'xMidYMid slice' });
    fsvg.innerHTML = [
      '<defs>',
      '<linearGradient id="mvTrunkG2" x1="0" y1="0" x2="1" y2="0">',
      '<stop offset="0" stop-color="#9A7248"/><stop offset=".5" stop-color="#B98F5E"/>',
      '<stop offset="1" stop-color="#7C5A36"/>',
      '</linearGradient>',
      '<linearGradient id="mvWarmG2" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0" stop-color="#FF8A3C" stop-opacity=".14"/>',
      '<stop offset=".52" stop-color="#FF7E3C" stop-opacity=".5"/>',
      '<stop offset=".7" stop-color="#FF9C55" stop-opacity=".34"/>',
      '<stop offset="1" stop-color="#FF7E3C" stop-opacity=".22"/>',
      '</linearGradient>',
      '</defs>',
      palm(120, 796, 330, 1, true, 'url(#mvTrunkG2)'),
      palm(1178, 788, 235, -1, true, 'url(#mvTrunkG2)'),
      '<rect id="mvWarm" width="1280" height="800" fill="url(#mvWarmG2)"/>'
    ].join('');
    front.appendChild(fsvg);
    stage.appendChild(front);
    st.frontSvg = fsvg;

    /* ── tap a foreground palm's coconuts → the lowest one falls and vanishes.
          Delegated on the front SVG; the transparent .mv-coco-hit pad is the
          only pointer-events target, so a tap anywhere on the cluster drops the
          next remaining nut. Each drop is a short gravity fall + fade, then the
          circle is removed; when the last is gone the pad is removed too. ── */
    fsvg.addEventListener('click', function (e) {
      var group = e.target && e.target.closest && e.target.closest('.mv-cocos');
      if (!group || st.cancelled) return;
      var live = group.querySelectorAll('.mv-coco:not(.mv-gone)');
      if (!live.length) return;
      var coco = live[live.length - 1];            // the lowest / front-most nut
      coco.classList.add('mv-gone');               // guard against a re-tap mid-fall
      var done = function () {
        if (coco.parentNode) coco.parentNode.removeChild(coco);
        if (!group.querySelectorAll('.mv-coco:not(.mv-gone)').length) {
          var pad = group.querySelector('.mv-coco-hit');   // nothing left to drop
          if (pad && pad.parentNode) pad.parentNode.removeChild(pad);
        }
      };
      var a = animate(coco, [
        { transform: 'translateY(0px)',   opacity: 1, offset: 0 },
        { transform: 'translateY(150px)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(320px)', opacity: 0, offset: 1 }
      ], { duration: 900, easing: 'cubic-bezier(.45,0,.9,.5)', fill: 'forwards' });
      if (a) { st.anims.push(a); a.onfinish = done; } else done();
    });

    /* ══ THE DAY CYCLE — everything on one 140s clock ══ */
    var sun = svg.querySelector('#mvSun');
    cyc(st, sun, [
      { transform: 'translate(250px,560px)', offset: 0 },     // pre-dawn, behind the sea
      { transform: 'translate(310px,462px)', offset: 0.045 }, // sunrise over the east lagoon
      { transform: 'translate(400px,290px)', offset: 0.1 },
      { transform: 'translate(560px,150px)', offset: 0.25 },  // BOOT: bright morning
      { transform: 'translate(680px,112px)', offset: 0.4 },   // noon
      { transform: 'translate(780px,175px)', offset: 0.55 },
      { transform: 'translate(842px,268px)', offset: 0.68 },
      { transform: 'translate(878px,348px)', offset: 0.78 },  // golden hour
      { transform: 'translate(897px,410px)', offset: 0.86 },
      { transform: 'translate(900px,448px)', offset: 0.905 }, // kissing the horizon
      { transform: 'translate(901px,548px)', offset: 0.95 },  // gone behind the sea
      { transform: 'translate(250px,560px)', offset: 1 }      // slides back east, hidden
    ]);
    /* sunset sky crossfade (also lends the dawn its blush) */
    cyc(st, svg.querySelector('#mvSkySetR'), [
      { opacity: 0.5, offset: 0 }, { opacity: 0, offset: 0.15 },
      { opacity: 0, offset: 0.6 }, { opacity: 0.4, offset: 0.78 },
      { opacity: 0.85, offset: 0.88 }, { opacity: 1, offset: 0.93 },
      { opacity: 0.5, offset: 1 }
    ]);
    /* the sun warms as it drops */
    var warmFrames = [
      { opacity: 0.9, offset: 0 }, { opacity: 0.4, offset: 0.08 },
      { opacity: 0, offset: 0.2 }, { opacity: 0, offset: 0.6 },
      { opacity: 0.55, offset: 0.78 }, { opacity: 0.95, offset: 0.9 },
      { opacity: 0.9, offset: 1 }
    ];
    cyc(st, svg.querySelector('#mvSunWarm'), warmFrames);
    cyc(st, svg.querySelector('#mvSunHaloW'), warmFrames);
    /* the whole scene blushes at dawn + golden hour (kept gentle so the
       sun and glitter stay vivid through it) — lives on the FRONT layer now */
    cyc(st, st.frontSvg.querySelector('#mvWarm'), [
      { opacity: 0.28, offset: 0 }, { opacity: 0, offset: 0.16 },
      { opacity: 0, offset: 0.62 }, { opacity: 0.36, offset: 0.8 },
      { opacity: 0.5, offset: 0.91 }, { opacity: 0.28, offset: 1 }
    ]);
    /* the horizon bloom ignites as the sun touches the water */
    cyc(st, svg.querySelector('#mvSetGlow'), [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.7 },
      { opacity: 0.35, offset: 0.8 }, { opacity: 1, offset: 0.9 },
      { opacity: 0.55, offset: 0.945 }, { opacity: 0, offset: 0.98 },
      { opacity: 0, offset: 1 }
    ]);
    /* STARS come out as the sky darkens at dusk, glow through the night
       (the wrap point 0≡1 sits in deep twilight), and fade with the dawn */
    cyc(st, svg.querySelector('#mvStars'), [
      { opacity: 0.6, offset: 0 }, { opacity: 0.2, offset: 0.05 },
      { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.82 },
      { opacity: 0.55, offset: 0.9 }, { opacity: 1, offset: 0.95 },
      { opacity: 0.6, offset: 1 }
    ]);
    /* the gold path on the water exists only while the sun is low-right */
    cyc(st, svg.querySelector('#mvGlitter'), [
      { opacity: 0, offset: 0 }, { opacity: 0, offset: 0.7 },
      { opacity: 0.5, offset: 0.8 }, { opacity: 0.95, offset: 0.9 },
      { opacity: 0.35, offset: 0.945 }, { opacity: 0, offset: 0.97 },
      { opacity: 0, offset: 1 }
    ]);

    /* ── clouds — three soft drifters, loop restart happens off-screen ── */
    var clouds = svg.querySelector('#mvClouds');
    var cdefs = [
      { y: 120, s: 1.15, dur: 150000, o: 0.9 },
      { y: 200, s: 0.8, dur: 190000, o: 0.75 },
      { y: 78, s: 0.62, dur: 230000, o: 0.6 }
    ];
    for (var ci = 0; ci < cdefs.length; ci++) {
      var cd = cdefs[ci];
      var cg = svgEl('g', { opacity: cd.o });
      cg.innerHTML = '<g transform="scale(' + cd.s + ')">' +
        '<ellipse cx="0" cy="0" rx="58" ry="20" fill="#FFFFFF"/>' +
        '<ellipse cx="42" cy="-10" rx="40" ry="16" fill="#FFFFFF"/>' +
        '<ellipse cx="-46" cy="-6" rx="34" ry="14" fill="#FFFFFF"/>' +
        '<ellipse cx="10" cy="-18" rx="30" ry="13" fill="#FFFFFF"/></g>';
      clouds.appendChild(cg);
      var ca = animate(cg, [
        { transform: 'translate(-180px,' + cd.y + 'px)' },
        { transform: 'translate(1460px,' + cd.y + 'px)' }
      ], { duration: cd.dur, iterations: Infinity, easing: 'linear' });
      if (ca) { ca.currentTime = rnd(0, cd.dur); st.anims.push(ca); }
    }
  }

  /* ── water sparkles — small glints living on the lagoon ── */
  function sparkleOnce(st) {
    if (st.cancelled || !st.svg) return;
    var g = st.svg.querySelector('#mvSpark');
    if (!g) return;
    var x = rnd(60, 1220), y = rnd(HORIZON + 14, 640), s = rnd(2.4, 5);
    var p = svgEl('path', {
      d: 'M0,' + (-s * 2) + ' L' + (s * 0.5) + ',' + (-s * 0.5) + ' L' + (s * 2) + ',0 L' + (s * 0.5) + ',' + (s * 0.5) +
        ' L0,' + (s * 2) + ' L' + (-s * 0.5) + ',' + (s * 0.5) + ' L' + (-s * 2) + ',0 L' + (-s * 0.5) + ',' + (-s * 0.5) + ' Z',
      fill: '#FFFFFF', opacity: '0', transform: 'translate(' + x + ',' + y + ')'
    });
    g.appendChild(p);
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = '50% 50%';
    var a = animate(p, [
      { opacity: 0, transform: 'translate(' + x + 'px,' + y + 'px) scale(.3) rotate(0deg)' },
      { opacity: 0.9, transform: 'translate(' + x + 'px,' + y + 'px) scale(1) rotate(24deg)', offset: 0.45 },
      { opacity: 0, transform: 'translate(' + x + 'px,' + y + 'px) scale(.35) rotate(48deg)' }
    ], { duration: rnd(1100, 1800), easing: 'ease-in-out' });
    if (a) a.onfinish = function () { if (p.parentNode) p.remove(); };
    gone(p, 2200);
  }

  /* ── distant gulls — a small flock crosses the sky ── */
  function birds(st) {
    if (st.cancelled || !st.svg) return;
    var g = st.svg.querySelector('#mvBirds');
    var ltr = Math.random() < 0.5;
    var y = rnd(90, 260), n = irnd(2, 3), k;
    for (k = 0; k < n; k++) {
      (function (idx) {
        var b = svgEl('g', { opacity: '.8' });
        b.innerHTML =
          '<path class="mv-wing" d="M0,0 Q6,-7 12,-1" fill="none" stroke="#3A4A55" stroke-width="2.6" stroke-linecap="round"/>' +
          '<path class="mv-wing" style="animation-delay:-.25s" d="M12,-1 Q18,-7 24,0" fill="none" stroke="#3A4A55" stroke-width="2.6" stroke-linecap="round"/>';
        g.appendChild(b);
        var x0 = ltr ? -60 : SCENE_W + 60, x1 = ltr ? SCENE_W + 60 : -60;
        var yy = y + idx * rnd(14, 26), dur = rnd(17000, 24000);
        var a = animate(b, [
          { transform: 'translate(' + x0 + 'px,' + yy + 'px) scale(' + (ltr ? 1 : -1) + ',1)' },
          { transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (yy - rnd(12, 30)) + 'px) scale(' + (ltr ? 1 : -1) + ',1)' },
          { transform: 'translate(' + x1 + 'px,' + yy + 'px) scale(' + (ltr ? 1 : -1) + ',1)' }
        ], { duration: dur, delay: idx * rnd(700, 1300), easing: 'linear', fill: 'backwards' });
        if (a) a.onfinish = function () { if (b.parentNode) b.remove(); };
        gone(b, dur + 2500 + idx * 1300);
      })(k);
    }
  }

  /* ── a dhoni sailboat slides along the horizon ── */
  function boat(st) {
    if (st.cancelled || !st.svg) return;
    var g = st.svg.querySelector('#mvBoat');
    if (g.childNodes.length) return;                 // one at a time
    var ltr = Math.random() < 0.5;
    var b = svgEl('g', {});
    b.innerHTML = '<g transform="scale(' + (ltr ? 1 : -1) + ',1)">' +
      '<path d="M-30,0 Q0,10 30,0 L22,-7 L-24,-7 Z" fill="#2C3E4C"/>' +
      '<path d="M-2,-8 L-2,-40 Q16,-30 24,-9 Z" fill="#3A5468"/>' +
      '<path d="M-4,-8 L-4,-36 Q-15,-24 -18,-9 Z" fill="#2C3E4C"/></g>';
    g.appendChild(b);
    var x0 = ltr ? -80 : SCENE_W + 80, x1 = ltr ? SCENE_W + 80 : -80;
    var dur = rnd(70000, 95000), steps = 60, frames = [], i, f;
    for (i = 0; i <= steps; i++) {
      f = i / steps;
      frames.push({ transform: 'translate(' + (x0 + (x1 - x0) * f).toFixed(0) + 'px,' +
        (HORIZON + 4 + Math.sin(f * Math.PI * 14) * 1.8).toFixed(1) + 'px)' });
    }
    var a = animate(b, frames, { duration: dur, easing: 'linear' });
    function end() { if (b.parentNode) b.remove(); }
    if (a) { a.onfinish = end; st.anims.push(a); }
    gone(b, dur + 1500);
  }

  /* ── leaping dolphins (PORTED from the Dubai background) ───────────────
        A pod of 1-3 breaches the lagoon now and then: each rides a parabolic
        arc (up then back down to the same waterline), nosing along the tangent,
        with a splash on exit + re-entry. Dubai draws this on a canvas; here the
        bottlenose body is the same shape as an SVG group and the arc is sampled
        into WAAPI keyframes (the house idiom used by the boat/flyer). ── */

  /* the bottlenose body in ~±10 LOCAL units, facing RIGHT (rostrum at +x) —
     the SAME countershaded shape Dubai draws (drawDolphinBody): flukes, sleek
     body, falcate dorsal, pectoral flipper, smile, eye + sparkle + blowhole */
  function dolphinBody() {
    return (
      '<path d="M-7.4,0 Q-8.9,-1.8 -10.2,-2.3 Q-8.8,-.3 -8.7,0 Q-8.8,.3 -10.2,2.3 Q-8.9,1.8 -7.4,0 Z" fill="#4e6172"/>' +
      '<path d="M8.6,.1 Q7,-1 5,-1.7 Q1,-2.6 -3.3,-1.6 Q-6.5,-.7 -7.9,-.2 Q-6.9,.4 -3.3,1.5 Q1.7,2.5 6.1,.9 Q7.8,.5 8.6,.1 Z" fill="url(#mvDolphinG)"/>' +
      '<path d="M1.7,-2.1 Q.6,-4.4 -1,-4.1 Q-.9,-2.9 -1.9,-1.9 Z" fill="#56697a"/>' +
      '<ellipse cx="1.9" cy="1.2" rx=".5" ry="1.4" transform="rotate(34.4 1.9 1.2)" fill="#5c7186"/>' +
      '<path d="M8.4,.35 Q6.6,.95 5.4,.75" fill="none" stroke="rgba(35,48,60,.6)" stroke-width=".22" stroke-linecap="round"/>' +
      '<circle cx="5.1" cy="-.6" r=".3" fill="#101820"/>' +
      '<circle cx="5.2" cy="-.7" r=".11" fill="rgba(255,255,255,.85)"/>' +
      '<ellipse cx="3.4" cy="-2.05" rx=".3" ry=".15" transform="rotate(-11.5 3.4 -2.05)" fill="rgba(30,42,52,.7)"/>'
    );
  }

  /* a quick surface splash at (x,y): an expanding ripple ring + a few droplets.
     Outer group carries the static position; the INNER group takes the WAAPI
     scale/fade (never animate a transform ATTRIBUTE — the palm-sway lesson). */
  function dolphinSplash(st, g, x, y, s) {
    var outer = svgEl('g', { transform: 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')' });
    var inner = svgEl('g', {});
    inner.innerHTML =
      '<ellipse cx="0" cy="0" rx="' + (5 * s).toFixed(1) + '" ry="' + (1.6 * s).toFixed(1) +
        '" fill="none" stroke="#E4F4FF" stroke-width="' + (1.1 * s).toFixed(2) + '"/>' +
      '<g fill="#EAF7FF">' +
      '<rect x="' + (-0.5 * s).toFixed(1) + '" y="' + (-6 * s).toFixed(1) + '" width="' + (1 * s).toFixed(1) + '" height="' + (2.4 * s).toFixed(1) + '"/>' +
      '<rect x="' + (-5 * s).toFixed(1) + '" y="' + (-3.5 * s).toFixed(1) + '" width="' + (0.9 * s).toFixed(1) + '" height="' + (2.2 * s).toFixed(1) + '"/>' +
      '<rect x="' + (4 * s).toFixed(1) + '" y="' + (-3.5 * s).toFixed(1) + '" width="' + (0.9 * s).toFixed(1) + '" height="' + (2.2 * s).toFixed(1) + '"/>' +
      '</g>';
    outer.appendChild(inner);
    g.appendChild(outer);
    inner.style.transformBox = 'fill-box';
    inner.style.transformOrigin = '50% 100%';
    var a = animate(inner, [
      { transform: 'scale(.4)', opacity: 0.9 },
      { transform: 'scale(1.7)', opacity: 0 }
    ], { duration: 540, easing: 'ease-out' });
    if (a) { a.onfinish = function () { if (outer.parentNode) outer.remove(); }; st.anims.push(a); }
    gone(outer, 760);
  }

  function dolphins(st) {
    if (st.cancelled || !st.svg) return;
    var g = st.svg.querySelector('#mvDolphins');
    if (!g) return;
    var pod = irnd(1, 3);
    var yW = rnd(512, 556);                          // waterline in the open lagoon
    var dir = Math.random() < 0.5 ? -1 : 1;
    var x0 = rnd(250, 1030);
    var baseS = 1.9 + (yW - 512) / 44 * 0.8;          // nearer (lower on screen) = bigger
    for (var k = 0; k < pod; k++) {
      (function (idx) {
        var sx0 = x0 - dir * idx * rnd(48, 66) + rnd(-6, 6);
        var swY = yW + rnd(-4, 4);
        var s = Math.max(1.5, baseS + rnd(-0.12, 0.12));
        var trav = rnd(70, 110), hgt = rnd(34, 56);
        var delay = idx * rnd(280, 420), dur = rnd(1500, 1850);
        var flip = dir < 0 ? ' scale(1,-1)' : '';
        var wrap = svgEl('g', {});                     // WAAPI transform target (NO transform attr)
        wrap.innerHTML = dolphinBody();
        wrap.setAttribute('opacity', '0');
        g.appendChild(wrap);
        /* sample the parabola into keyframes, nosing along the tangent */
        var steps = 26, frames = [], i, pc, xx, yy, vx, vy, ang;
        for (i = 0; i <= steps; i++) {
          pc = i / steps;
          xx = sx0 + dir * pc * trav;
          yy = swY - Math.sin(pc * Math.PI) * hgt;
          vx = dir * trav;
          vy = -Math.cos(pc * Math.PI) * Math.PI * hgt;
          ang = Math.atan2(vy, vx) * 180 / Math.PI;
          frames.push({
            transform: 'translate(' + xx.toFixed(1) + 'px,' + yy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ') rotate(' + ang.toFixed(1) + 'deg)' + flip,
            opacity: (pc < 0.05 || pc > 0.95) ? 0 : 1,
            offset: pc
          });
        }
        var a = animate(wrap, frames, { duration: dur, delay: delay, easing: 'linear', fill: 'backwards' });
        if (a) { a.onfinish = function () { if (wrap.parentNode) wrap.remove(); }; st.anims.push(a); }
        gone(wrap, delay + dur + 400);
        /* splashes: breaking the surface, then the re-entry */
        st.timers.push(setTimeout(function () { if (!st.cancelled) dolphinSplash(st, g, sx0, swY, s); }, delay + 40));
        st.timers.push(setTimeout(function () { if (!st.cancelled) dolphinSplash(st, g, sx0 + dir * trav, swY, s * 1.15); }, delay + dur * 0.88));
      })(k);
    }
  }

  /* ══ POKEMON WALKERS ══════════════════════════════════════════════
        Pokemons (from backgrounds/pokemons/*.js, registered on
        window.Pokemons) stroll the beach, entering from a side and
        walking off the far side — in the ACTORS layer, so the front
        palms occlude them. One ground pokemon crosses at a time (always
        a different one than the last); the flyer drifts across the sky
        on its own, rarer schedule. ── */
  var GROUND = ['eevee', 'pikachu', 'bulbasaur', 'squirtle', 'jigglypuff'];
  var FLYER = 'gooey';
  /* wrapper height % per pokemon so each reads ~the same on-screen size
     (jigglypuff kept 35% SMALLER than that norm, per user request: 20→13) */
  var POKE_H = { eevee: 19, pikachu: 20.5, bulbasaur: 22, squirtle: 23, jigglypuff: 13 };
  var GROUND_PCT = 12;                    // foot line, % up from the stage bottom (on the sand)

  function haveP(name) { return w.Pokemons && w.Pokemons[name] && w.Pokemons[name].place; }

  /* one crossing: place a pokemon off one edge, walk it across + off the far
     edge, then remove it. Returns the crossing duration (ms) so the scheduler
     can time the next one. */
  function crossPokemon(stage, st, name, flying) {
    if (st.cancelled || !haveP(name)) return 0;
    var def = w.Pokemons[name];
    var ltr = Math.random() < 0.5;
    var heightPct = flying ? rnd(22, 27) : (POKE_H[name] || 20);
    var ff = def.footFrac || 0.92;
    var bottomPct = flying ? rnd(48, 63)
      : Math.max(2, GROUND_PCT - (1 - ff) * heightPct + rnd(-1, 1));
    var inst = def.place({ parent: st.actors, height: heightPct.toFixed(2) + '%',
      left: '0px', bottom: bottomPct.toFixed(2) + '%' });
    if (!inst) return 0;
    inst.setFlip(ltr);                                   // modules face LEFT natively
    if (inst.setWalking) inst.setWalking(true);          // eevee/pikachu manual gait
    var speed = flying ? rnd(55, 80) : rnd(72, 118);     // px/s
    /* eevee/pikachu read --pk-step for cadence; match it to the speed */
    try { inst.element.style.setProperty('--pk-step', Math.min(0.9, Math.max(0.18, 60 / speed)).toFixed(2) + 's'); } catch (e) {}

    var ew = inst.element.offsetWidth || 200, cw = stage.clientWidth || SCENE_W;
    var pad = ew + 50;
    var x0 = ltr ? -pad : cw + pad, x1 = ltr ? cw + pad : -pad;
    var dur = Math.abs(x1 - x0) / speed * 1000;

    var frames, i, f;
    if (flying) {
      var steps = 60; frames = [];
      for (i = 0; i <= steps; i++) {
        f = i / steps;
        frames.push({ transform: 'translateX(' + (x0 + (x1 - x0) * f).toFixed(0) + 'px) translateY(' +
          (Math.sin(f * Math.PI * 5) * 16).toFixed(1) + 'px)' });
      }
    } else {
      frames = [{ transform: 'translateX(' + x0 + 'px)' }, { transform: 'translateX(' + x1 + 'px)' }];
    }
    var a = animate(inst.element, frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    st.walkerInsts.push(inst);
    function done() {
      var ix = st.walkerInsts.indexOf(inst);
      if (ix >= 0) st.walkerInsts.splice(ix, 1);
      try { inst.remove(); } catch (e) {}
    }
    if (a) { a.onfinish = done; st.anims.push(a); }
    else { inst.element.style.transform = 'translateX(' + x1 + 'px)'; st.timers.push(setTimeout(done, dur)); }
    return dur;
  }

  /* next ground pokemon — a shuffled ROUND-ROBIN queue so EVERY available
     pokemon appears once per cycle (pure random left pikachu/bulbasaur
     unseen for long stretches). Refills + reshuffles when drained, avoiding
     an immediate repeat across the cycle boundary. */
  function nextGround(st) {
    var avail = GROUND.filter(haveP);
    if (!avail.length) return null;
    if (!st.queue || !st.queue.length) {
      st.queue = avail.slice();
      for (var i = st.queue.length - 1; i > 0; i--) {      // Fisher–Yates
        var j = irnd(0, i), t = st.queue[i]; st.queue[i] = st.queue[j]; st.queue[j] = t;
      }
      if (st.queue.length > 1 && st.queue[0] === st.lastWalker) st.queue.push(st.queue.shift());
    }
    var n = st.queue.shift();
    st.lastWalker = n;
    return n;
  }

  /* ══ MODULE REGISTRY ═══════════════════════════════════════════════ */
  w.BACKGROUNDS = w.BACKGROUNDS || {};
  w.BACKGROUNDS.maldives = {
    skin: 'maldives',           // game/skins/maldives.skin.css
    aids: 'maldives',           // aids/maldives.aids.js (dolphin line + seashell pail)
    preload: function () { loadPokemons(function () {}); },   // warm the walkers during the splash

    init: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      injectCSS();
      if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
      /* pin an LTR origin + clip (the RTL crossing-origin lesson) */
      var prevOverflow = stage.style.overflow, prevDir = stage.style.direction;
      stage.style.overflow = 'hidden';
      stage.style.direction = 'ltr';
      stage.innerHTML = '';

      var st = { cancelled: false, timers: [], anims: [], cycleAnims: [], svg: null,
                 actors: null, frontSvg: null, walkerInsts: [], lastWalker: null, queue: null };
      buildScene(stage, st);

      /* ambient schedulers */
      function schedSparkle() {
        if (st.cancelled) return;
        sparkleOnce(st);
        st.timers.push(setTimeout(schedSparkle, rnd(420, 1100)));
      }
      st.timers.push(setTimeout(schedSparkle, 800));

      /* ── POKEMON: one ground walker at a time (each a different one),
            entering at staggered times; the flyer drifts by on its own ── */
      function schedWalker() {
        if (st.cancelled) return;
        var name = nextGround(st);
        var dur = name ? crossPokemon(stage, st, name, false) : 0;
        st.timers.push(setTimeout(schedWalker, (dur || 6000) + rnd(2200, 6000)));
      }
      function schedFlyer() {
        if (st.cancelled) return;
        if (haveP(FLYER)) crossPokemon(stage, st, FLYER, true);
        st.timers.push(setTimeout(schedFlyer, rnd(38000, 72000)));
      }
      /* start the beach strollers ONCE the pokemon modules are ready — in the
         game they're injected on demand; in the standalone they're already
         present so this fires immediately. Gated inside the callback so the
         first schedule doesn't no-op before window.Pokemons exists. */
      loadPokemons(function () {
        if (st.cancelled) return;
        if (GROUND.filter(haveP).length) st.timers.push(setTimeout(schedWalker, rnd(2500, 5000)));
        if (haveP(FLYER)) st.timers.push(setTimeout(schedFlyer, rnd(12000, 26000)));
      });

      function schedBirds() {
        if (st.cancelled) return;
        birds(st);
        st.timers.push(setTimeout(schedBirds, rnd(22000, 42000)));
      }
      st.timers.push(setTimeout(schedBirds, rnd(4000, 9000)));

      function schedBoat() {
        if (st.cancelled) return;
        boat(st);
        st.timers.push(setTimeout(schedBoat, rnd(120000, 200000)));
      }
      st.timers.push(setTimeout(schedBoat, rnd(9000, 20000)));

      function schedDolphins() {
        if (st.cancelled) return;
        dolphins(st);
        st.timers.push(setTimeout(schedDolphins, rnd(12000, 26000)));
      }
      st.timers.push(setTimeout(schedDolphins, rnd(3500, 8000)));

      /* verification hooks */
      w.BACKGROUNDS.maldives._test = {
        seek: function (f) {
          for (var i = 0; i < st.cycleAnims.length; i++) st.cycleAnims[i].currentTime = f * DAY_MS;
        },
        dayMs: DAY_MS,
        birds: function () { birds(st); },
        boat: function () { boat(st); },
        dolphins: function () { dolphins(st); },
        sparkle: function () { sparkleOnce(st); },
        walk: function (name) { return crossPokemon(stage, st, name || nextGround(st), false); },
        nextName: function () { return nextGround(st); },
        fly: function () { return crossPokemon(stage, st, FLYER, true); },
        state: st
      };

      return function cleanup() {
        st.cancelled = true;
        st.timers.forEach(clearTimeout);
        st.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        st.walkerInsts.slice().forEach(function (i) { try { i.remove(); } catch (e) {} });
        delete w.BACKGROUNDS.maldives._test;
        stage.style.overflow = prevOverflow;
        stage.style.direction = prevDir;
        stage.innerHTML = '';
      };
    },

    /* static art line-up for development screenshots */
    gallery: function (ctx) {
      var stage = ctx && ctx.stage;
      if (!stage) return function () {};
      injectCSS();
      if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
      stage.innerHTML = '';
      stage.style.background = 'linear-gradient(#6FBCE8,#E9F9FB 55%,#6FE6D8 56%,#FBEBC4 78%)';
      var scene = el('div', 'mvscene');
      var svg = svgEl('svg', { viewBox: '0 0 900 620', preserveAspectRatio: 'xMidYMid meet' });
      svg.innerHTML = '<defs><linearGradient id="mvTrunkG" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#9A7248"/><stop offset=".5" stop-color="#B98F5E"/>' +
        '<stop offset="1" stop-color="#7C5A36"/></linearGradient></defs>' +
        palm(230, 600, 420, 1, true) +
        island(650, 320, 260, 1, [[-0.2, 0.42, 1], [0.16, 0.34, -1]]);
      scene.appendChild(svg);
      stage.appendChild(scene);
      return function cleanup() {
        stage.style.background = '';
        stage.innerHTML = '';
      };
    }
  };
})(typeof window !== 'undefined' ? window : this);
