/* =====================================================================
   diamonds.bg.js — "LUMENFALL", the DIAMOND PLANET: the camera stands on
   the crown of a planet-sized round brilliant — THE HORIZON IS THE
   GIRDLE — under a sky that rains diamonds, through a 140s light cycle:
   Pearl Dawn → White Brilliance → THE FIRE CROSSING (the ground facets
   ignite in a left-to-right rainbow wave while every falling gem flashes
   its fire-pip) → Violet Dusk (the amethyst geode lantern ignites) →
   Diamond Night (indigo sky, galaxy band, the cyan HEARTLIGHT breathing
   under the table facet, rain turned to falling lanterns).
   ---------------------------------------------------------------------
   STANDALONE background module (same workflow as maldives/dinosaurs2:
   developed against backgrounds/diamonds.html, ported to the theme menu
   on request). One self-contained IIFE: pure DOM/SVG/WAAPI, ES5,
   file:// safe, every class / keyframe / id namespaced dm*. Registers
       window.BACKGROUNDS.diamonds = { init({stage}) → cleanup }
   PORTING CHECKLIST (when wiring as a game theme): ship
   game/skins/diamonds.skin.css + an explicit skin:/aids: key on the
   registration (bg-loader falls back to a phantom 'diamonds' skin path
   otherwise), and add `body.theme-diamonds #stars-layer{display:block}`
   to themes.css or the scene renders 0×0. Clicks already use the
   maldives document-level GEOMETRIC hit-test, so they survive the
   game's pointer-events:none stars-layer.

   THE LIGHT CYCLE — one shared 140s clock (DAY_MS): every phase-
   dependent layer runs a WAAPI animation of the SAME duration
   (st.cycleAnims), so _test.seek(0..1) jumps the whole world at once.
   Scene BOOTS at f=0.26 (White Brilliance) so it opens blazing.

   RAIN — 24 recycled drops, 3 parallax layers (10 BACK silhouettes that
   vanish at the far girdle, 8 MID profiles, 6 NEAR hero gems that LAND:
   each hero has a pre-synced impact "chime" ring running on the same
   duration/delay as its fall — zero per-frame JS). Fire-pips on all
   MID/NEAR gems flash rainbow during the Fire Hour on the clock.

   Ambient: carat comets (night), prism butterflies, crystal bunny
   "Berry", the Little Lapidary polishing the girdle, bubble prisms from
   the geode, and the rare ROSE DIAMOND drop. Clicks: pop a falling
   diamond (rainbow burst), or press the HEART FACET → Heartlight surge
   + a scintillation wave radiating through the sparkle pool.

   PERF: transform/opacity only, all gradients static, fixed pools —
   ~114 running animations steady (desktop), ~92 on touch (LITE).
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NS = 'http://www.w3.org/2000/svg';
  var SCENE_W = 1280, SCENE_H = 800;
  var DAY_MS = 140000;                 // one full light cycle
  var BOOT_F = 0.26;                   // open in White Brilliance
  var LITE = false;
  try { LITE = w.matchMedia && w.matchMedia('(pointer: coarse)').matches; } catch (e) {}

  var UIDN = 0;                        // per-instance defs-id suffix (load-bearing)

  /* ── tiny helpers ─────────────────────────────────────────────────── */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function svgEl(name, attrs) {
    var n = doc.createElementNS(NS, name), k;
    for (k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function P(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }

  /* ── planet geometry: girdle arc + facet spokes ───────────────────
     Horizon = arc of a huge circle (center 640,5675 r 5140) through
     (0,575)-(640,535)-(1280,575). Facet seams = spokes through the
     virtual crown center (640,1500) below the viewer, so seams converge
     toward your feet and fan out to the girdle. */
  function hy(x) { var dx = x - 640; return 5675 - Math.sqrt(5140 * 5140 - dx * dx); }
  var ST_N = 23, XH = [], HYV = [], i;
  for (i = 0; i < ST_N; i++) { XH.push(-240 + i * 80); HYV.push(hy(XH[i])); }
  function spokeAt(i2, y) { return 640 + (XH[i2] - 640) * (1500 - y) / (1500 - HYV[i2]); }
  var OFF = [0, 58, 120, 190];         // band depths below the girdle
  function lv(i2, k) { return HYV[i2] + OFF[k]; }
  function lvPt(i2, k) { return P(spokeAt(i2, lv(i2, k)), lv(i2, k)); }

  /* girdle polyline (visible span) */
  function girdlePts() {
    var s = '', x;
    for (x = -20; x <= 1300; x += 60) s += (s ? ' ' : '') + P(x, hy(x));
    return s;
  }

  /* four-point sparkle cross path (unit ~8px radius) */
  var CROSS = 'M0,-8 L1.8,-1.8 L8,0 L1.8,1.8 L0,8 L-1.8,1.8 L-8,0 L-1.8,-1.8 Z';

  /* ── CSS (injected once) ──────────────────────────────────────────── */
  function injectCSS() {
    if (doc.getElementById('dmbg-style')) return;
    var css =
      '.dmTB{transform-box:fill-box;transform-origin:center;}' +
      '.dmHit,.dmHeartHit{cursor:pointer;pointer-events:all;}' +
      '.dmSpark{animation:dmTwinkle 3s ease-in-out infinite;}' +
      '@keyframes dmTwinkle{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:.95;transform:scale(1.15)}}' +
      '@keyframes dmShimmer{0%{transform:translateY(-70px);opacity:0}15%{opacity:.7}85%{opacity:.55}100%{transform:translateY(240px);opacity:0}}' +
      '@keyframes dmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}' +
      '@keyframes dmHeartPulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.08);opacity:.9}}' +
      '@keyframes dmHop{0%,100%{transform:translateY(0)}30%{transform:translateY(-16px)}60%{transform:translateY(0)}}' +
      '@keyframes dmFlap{from{transform:scaleX(1)}to{transform:scaleX(.35)}}' +
      '.dmHopOn{animation:dmHop .55s ease-in-out infinite;}' +
      '.dmFlapOn{animation:dmFlap .34s ease-in-out infinite alternate;}';
    var st = doc.createElement('style');
    st.id = 'dmbg-style';
    st.textContent = css;
    doc.head.appendChild(st);
  }

  /* ── static defs (all ids suffixed per instance) ──────────────────── */
  function buildDefs(u) {
    function lin(id, x1, y1, x2, y2, stops) {
      var s = '<linearGradient id="' + id + u + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">';
      var j; for (j = 0; j < stops.length; j++)
        s += '<stop offset="' + stops[j][0] + '" stop-color="' + stops[j][1] + '"' +
             (stops[j].length > 2 ? ' stop-opacity="' + stops[j][2] + '"' : '') + '/>';
      return s + '</linearGradient>';
    }
    function rad(id, stops) {
      var s = '<radialGradient id="' + id + u + '">';
      var j; for (j = 0; j < stops.length; j++)
        s += '<stop offset="' + stops[j][0] + '" stop-color="' + stops[j][1] + '"' +
             (stops[j].length > 2 ? ' stop-opacity="' + stops[j][2] + '"' : '') + '/>';
      return s + '</radialGradient>';
    }
    var RAIN6 = ['#FF5E5B', '#FFB84D', '#FFE86B', '#7BE495', '#5BC8FF', '#9D7BFF'];
    var d = '<defs>';
    /* sky */
    d += lin('dmSkyNoon', 0, 0, 0, 1, [[0, '#7FD4FF'], [.55, '#BFE9FF'], [1, '#EAF9FF']]);
    d += lin('dmSkyDawn', 0, 0, 0, 1, [[0, '#C9E8FF'], [.5, '#FFD9E8'], [.85, '#FFE9F2'], [1, '#FFF7E8']]);
    d += lin('dmSkyFire', 0, 0, 0, 1, [[0, '#8E7CF0'], [.5, '#FF9AA2'], [.85, '#FFD166'], [1, '#FFE9B8']]);
    d += lin('dmSkyNight', 0, 0, 0, 1, [[0, '#1B2450'], [.55, '#2B2F6E'], [1, '#3A2B63']]);
    d += lin('dmGalaxy', 0, 0, 1, 0, [[0, '#6E5AA8', 0], [.5, '#6E5AA8', .55], [1, '#6E5AA8', 0]]);
    /* rainbow (girdle, ribbons, pips, burst rings) */
    var rb = [], j2; for (j2 = 0; j2 < 6; j2++) rb.push([j2 / 5, RAIN6[j2]]);
    d += lin('dmRainG', 0, 0, 1, 0, rb);
    /* halo wedges */
    for (j2 = 0; j2 < 6; j2++) d += rad('dmHalo' + j2, [[0, RAIN6[j2], .5], [1, RAIN6[j2], 0]]);
    d += rad('dmGlowWhite', [[0, '#FFFFFF', .85], [1, '#FFFFFF', 0]]);
    /* ground facets */
    d += lin('dmFTa', 0, 0, 0, 1, [[0, '#F4FBFF'], [1, '#E3F2FE']]);
    d += lin('dmFSa', 0, 0, 0, 1, [[0, '#E8F6FF'], [1, '#D6EDFB']]);
    d += lin('dmFSb', 0, 0, 0, 1, [[0, '#EFF8FF'], [1, '#DFF0FD']]);
    d += lin('dmFKa', 0, 0, 0, 1, [[0, '#DCF1FF'], [1, '#C6E5F9']]);
    d += lin('dmFKb', 0, 0, 0, 1, [[0, '#CBE6FA'], [1, '#B7DBF6']]);
    d += lin('dmFGa', 0, 0, 0, 1, [[0, '#D3ECFC'], [1, '#BFE0F6']]);
    d += lin('dmFGb', 0, 0, 0, 1, [[0, '#C2E2F8'], [1, '#AFD6F2']]);
    /* dispersion wedges */
    var WCOL = ['#FF6F91', '#FFC75F', '#F9F871', '#6EE7B7', '#60A5FA', '#C084FC'];
    for (j2 = 0; j2 < 6; j2++)
      d += lin('dmWed' + j2, 0, 0, 0, 1, [[0, WCOL[j2], .95], [1, WCOL[j2], .25]]);
    /* rain gems */
    d += lin('dmCrown', 0, 0, 0, 1, [[0, '#FFFFFF'], [1, '#DFF3FF']]);
    d += lin('dmPav', 0, 0, 0, 1, [[0, '#BFE4FB'], [1, '#8FCBF2']]);
    d += lin('dmCrownBlush', 0, 0, 0, 1, [[0, '#FFF3F8'], [1, '#FFD6E8']]);
    d += lin('dmCrownCham', 0, 0, 0, 1, [[0, '#FFF9EC'], [1, '#FFE9C7']]);
    d += rad('dmHaloGem', [[0, '#BFF4FF', .45], [1, '#BFF4FF', 0]]);
    /* heartlight + geode + lightfall + blades + spires */
    d += rad('dmHeartG', [[0, '#7FF0FF', .8], [.55, '#7FF0FF', .3], [1, '#7FF0FF', 0]]);
    d += rad('dmGeodeG', [[0, '#B388FF', .95], [.6, '#B388FF', .4], [1, '#B388FF', 0]]);
    d += lin('dmFallG', 0, 0, 0, 1, [[0, '#FFFFFF', .95], [1, '#CDEBFF', .15]]);
    d += lin('dmBlade', 0, 0, 1, 0, [[0, '#FFFFFF', 0], [.5, '#FFFFFF', 1], [1, '#FFFFFF', 0]]);
    d += lin('dmSpireA', 0, 0, 1, 0, [[0, '#B9D9F5'], [.5, '#DCEFFF'], [1, '#9CC4EE']]);
    d += lin('dmSpireB', 0, 0, 1, 0, [[0, '#9CC4EE'], [.5, '#CFE7FB'], [1, '#7FAEE6']]);
    d += lin('dmMist', 0, 0, 0, 1, [[0, '#FFFFFF', 0], [1, '#FFFFFF', .8]]);
    d += '</defs>';
    return d;
  }

  /* ── gem art (markup strings; all centered at 0,0) ────────────────── */
  function gemBack(s) {                       /* BACK: bare rhombus */
    return '<polygon points="0,' + (-s) + ' ' + s + ',0 0,' + s + ' ' + (-s) + ',0"' +
      ' fill="#FFFFFF" opacity=".45"/>' +
      '<polygon points="0,' + (-s * 1.7) + ' ' + s * 1.7 + ',0 0,' + s * 1.7 + ' ' + (-s * 1.7) + ',0"' +
      ' fill="#BFF4FF" opacity=".18"/>';
  }
  function gemProfile(s, u, crown) {          /* side view brilliant */
    var c = crown || 'dmCrown';
    return '<polygon points="' + P(-s, 0) + ' ' + P(-s * .55, -s * .5) + ' ' + P(s * .55, -s * .5) + ' ' + P(s, 0) +
      '" fill="url(#' + c + u + ')" stroke="rgba(255,255,255,.9)" stroke-width="1"/>' +
      '<polygon points="' + P(-s, 0) + ' ' + P(s, 0) + ' ' + P(0, s * 1.15) +
      '" fill="url(#dmPav' + u + ')" stroke="rgba(255,255,255,.75)" stroke-width="1"/>' +
      '<line x1="' + (-s * .55) + '" y1="' + (-s * .5) + '" x2="' + (-s * .2) + '" y2="0" stroke="rgba(255,255,255,.8)" stroke-width="1"/>' +
      '<line x1="' + (s * .55) + '" y1="' + (-s * .5) + '" x2="' + (s * .2) + '" y2="0" stroke="rgba(255,255,255,.8)" stroke-width="1"/>' +
      '<line x1="' + (-s * .45) + '" y1="' + (s * .5) + '" x2="0" y2="' + (s * 1.15) + '" stroke="rgba(255,255,255,.5)" stroke-width="1"/>' +
      '<line x1="' + (-s * .7) + '" y1="' + (-s * .28) + '" x2="' + (-s * .3) + '" y2="' + (-s * .44) + '" stroke="#FFFFFF" stroke-width="2" opacity=".9"/>';
  }
  function gemRB(s, u, crown) {               /* top view: table + 16-gon */
    var c = crown || 'dmCrown', out = '', tab = '', ln = '', k, a, x, y, x2, y2;
    for (k = 0; k < 16; k++) {
      a = k * Math.PI / 8;
      out += (k ? ' ' : '') + P(s * Math.cos(a), s * Math.sin(a));
    }
    for (k = 0; k < 8; k++) {
      a = (k + .5) * Math.PI / 4;
      tab += (k ? ' ' : '') + P(s * .55 * Math.cos(a), s * .55 * Math.sin(a));
      x = s * .55 * Math.cos(a); y = s * .55 * Math.sin(a);
      x2 = s * Math.cos(a); y2 = s * Math.sin(a);
      ln += '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x2.toFixed(1) +
        '" y2="' + y2.toFixed(1) + '" stroke="rgba(255,255,255,.85)" stroke-width="1"/>';
    }
    return '<polygon points="' + out + '" fill="url(#' + c + u + ')" stroke="rgba(255,255,255,.9)" stroke-width="1.2"/>' +
      '<polygon points="' + tab + '" fill="#FFFFFF" opacity=".92"/>' + ln;
  }
  function gemPear(s, u, crown) {             /* teardrop */
    var c = crown || 'dmCrown';
    return '<path d="M0 ' + (-s * 1.25) + ' C ' + s * .9 + ' ' + (-s * .3) + ' ' + s * .8 + ' ' + s * .5 +
      ' 0 ' + s * .9 + ' C ' + (-s * .8) + ' ' + s * .5 + ' ' + (-s * .9) + ' ' + (-s * .3) + ' 0 ' + (-s * 1.25) + ' Z"' +
      ' fill="url(#' + c + u + ')" stroke="rgba(255,255,255,.9)" stroke-width="1.2"/>' +
      '<line x1="0" y1="' + (-s * 1.25) + '" x2="0" y2="' + (s * .9) + '" stroke="rgba(255,255,255,.7)" stroke-width="1"/>' +
      '<line x1="' + (-s * .62) + '" y1="0" x2="' + (s * .62) + '" y2="0" stroke="rgba(255,255,255,.7)" stroke-width="1"/>' +
      '<line x1="' + (-s * .5) + '" y1="' + (-s * .62) + '" x2="' + (-s * .15) + '" y2="' + (-s * .9) + '" stroke="#FFFFFF" stroke-width="2" opacity=".9"/>';
  }

  /* ── clock helpers ────────────────────────────────────────────────── */
  function mkClock(st, node, keyframes) {
    var a = node.animate(keyframes, { duration: DAY_MS, iterations: Infinity, easing: 'linear' });
    a.currentTime = BOOT_F * DAY_MS;
    st.cycleAnims.push(a); st.anims.push(a);
    return a;
  }
  function opClock(st, node, pairs) {          /* pairs: [[f, opacity], …] */
    var kf = [], j;
    for (j = 0; j < pairs.length; j++) kf.push({ opacity: pairs[j][1], offset: pairs[j][0] });
    return mkClock(st, node, kf);
  }
  function oneShot(st, node, kf, opts) {       /* transient on a recycled node */
    if (node.__dmA) { try { node.__dmA.cancel(); } catch (e) {} }
    var a = node.animate(kf, opts);
    node.__dmA = a;
    if (st.fx.indexOf(node) < 0) st.fx.push(node);
    return a;
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init(ctx) {
    var stage = ctx && ctx.stage;
    if (!stage) return function () {};
    injectCSS();
    var u = '_' + (++UIDN);
    var prevOverflow = stage.style.overflow, prevDir = stage.style.direction;
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.style.overflow = 'hidden';
    stage.style.direction = 'ltr';
    stage.innerHTML = '';

    var st = {
      cancelled: false, timers: [], slots: {}, anims: [], cycleAnims: [], fx: [],
      drops: [], sparkNodes: [], ambient: 0, lastHeart: 0,
      bunBusy: false, lapBusy: false, bubBusy: false, u: u
    };

    /* xMidYMax: on stages wider than 1.6:1 (16:9 desktop) crop the SKY, never
       the girdle/heart/landing band at the bottom. pointer-events:none — the
       veil/night full-scene rects would otherwise swallow every click (opacity
       0 does NOT disable SVG hit-testing); clicks are resolved GEOMETRICALLY
       on document, the maldives cocoClick pattern. */
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H,
      preserveAspectRatio: 'xMidYMax slice',
      style: 'position:absolute;inset:0;width:100%;height:100%;display:block;background:#1B2450;pointer-events:none'
    });
    stage.appendChild(svg);
    svg.innerHTML = buildDefs(u);

    function layer() { var g = svgEl('g', {}); svg.appendChild(g); return g; }

    /* ── L1 SKY ──────────────────────────────────────────────────────── */
    var sky = layer();
    sky.innerHTML =
      '<rect width="1280" height="800" fill="url(#dmSkyNoon' + u + ')"/>' +
      '<rect class="dmDawn" width="1280" height="800" fill="url(#dmSkyDawn' + u + ')"/>' +
      '<rect class="dmFire" width="1280" height="800" fill="url(#dmSkyFire' + u + ')"/>';
    opClock(st, sky.querySelector('.dmDawn'),
      [[0, 1], [.12, 1], [.2, 0], [.9, 0], [.97, .55], [1, 1]]);
    opClock(st, sky.querySelector('.dmFire'),
      [[0, 0], [.40, 0], [.47, 1], [.57, 1], [.66, 0], [1, 0]]);

    /* ── L2 PRISM STAR (travels the full arc, sets behind the girdle) ── */
    var starG = svgEl('g', {});
    sky.appendChild(starG);
    var haloHTML = '', hj;
    for (hj = 0; hj < 6; hj++) {
      var ha = hj * Math.PI / 3;
      haloHTML += '<circle cx="' + (26 * Math.cos(ha)).toFixed(1) + '" cy="' + (26 * Math.sin(ha)).toFixed(1) +
        '" r="88" fill="url(#dmHalo' + hj + u + ')"/>';
    }
    var rays = '', rj;
    for (rj = 0; rj < 8; rj++) {
      var ra = rj * Math.PI / 4, rx = 34 * Math.cos(ra), ry = 34 * Math.sin(ra);
      var pxa = 10 * Math.cos(ra + Math.PI / 8), pya = 10 * Math.sin(ra + Math.PI / 8);
      var pxb = 10 * Math.cos(ra - Math.PI / 8), pyb = 10 * Math.sin(ra - Math.PI / 8);
      rays += '<polygon points="' + P(rx, ry) + ' ' + P(pxa, pya) + ' ' + P(pxb, pyb) + '" fill="#FFF6D8" opacity=".9"/>';
    }
    starG.innerHTML =
      '<g class="dmHaloW dmTB">' + haloHTML + '</g>' +
      '<circle r="52" fill="url(#dmGlowWhite' + u + ')"/>' + rays +
      '<circle r="16" fill="#FFFFFF"/>';
    mkClock(st, starG, [
      { transform: 'translate(80px,690px)', offset: 0 },
      { transform: 'translate(180px,620px)', offset: .02 },
      { transform: 'translate(300px,420px)', offset: .1 },
      { transform: 'translate(460px,230px)', offset: .2 },
      { transform: 'translate(640px,120px)', offset: .3 },
      { transform: 'translate(790px,230px)', offset: .4 },
      { transform: 'translate(880px,400px)', offset: .46 },
      { transform: 'translate(935px,520px)', offset: .5 },
      { transform: 'translate(955px,620px)', offset: .56 },
      { transform: 'translate(965px,730px)', offset: .62 },
      { transform: 'translate(640px,900px)', offset: .8 },
      { transform: 'translate(80px,690px)', offset: 1 }
    ]);
    mkClock(st, starG.querySelector('.dmHaloW'), [
      { transform: 'scale(.8)', opacity: .2, offset: 0 },
      { transform: 'scale(.55)', opacity: .5, offset: .3 },
      { transform: 'scale(1.1)', opacity: .6, offset: .42 },
      { transform: 'scale(1.8)', opacity: .95, offset: .5 },
      { transform: 'scale(1.3)', opacity: .3, offset: .6 },
      { transform: 'scale(1)', opacity: 0, offset: .64 },
      { transform: 'scale(1)', opacity: 0, offset: .97 },
      { transform: 'scale(.8)', opacity: .2, offset: 1 }
    ]);

    /* ── L3 SPECTRUM RIBBONS (breathe in during the Fire Hour) ───────── */
    var ribbons = layer();
    ribbons.innerHTML =
      '<g transform="skewX(-12)">' +
      '<rect x="-60" y="150" width="1480" height="26" fill="url(#dmRainG' + u + ')" opacity=".3"/>' +
      '<rect x="-120" y="205" width="1480" height="34" fill="url(#dmRainG' + u + ')" opacity=".34"/>' +
      '<rect x="-30" y="262" width="1480" height="22" fill="url(#dmRainG' + u + ')" opacity=".26"/></g>';
    opClock(st, ribbons, [[0, 0], [.43, 0], [.5, 1], [.58, .8], [.63, 0], [1, 0]]);

    /* ── NIGHT GROUP (sky + galaxy + twinkle stars, one crossfade) ───── */
    var night = layer();
    var starN = LITE ? 8 : 12, nhtml =
      '<rect width="1280" height="580" fill="url(#dmSkyNight' + u + ')"/>' +
      '<g transform="translate(640,240) rotate(-18)"><rect x="-820" y="-70" width="1640" height="140" fill="url(#dmGalaxy' + u + ')" opacity=".28"/></g>';
    var NSTARS = [[110, 80], [270, 180], [420, 60], [560, 260], [700, 120], [860, 210],
                  [1010, 70], [1150, 170], [180, 330], [940, 340], [1230, 300], [520, 400]];
    var sn;
    for (sn = 0; sn < starN; sn++) {
      var ss = rnd(.5, .9).toFixed(2);
      nhtml += '<g transform="translate(' + NSTARS[sn][0] + ',' + NSTARS[sn][1] + ') scale(' + ss + ')">' +
        '<path class="dmSpark dmTB" style="animation-duration:' + rnd(3, 5).toFixed(1) + 's;animation-delay:-' + rnd(0, 5).toFixed(1) + 's"' +
        ' d="' + CROSS + '" fill="' + (sn % 3 ? '#FFFFFF' : '#BFE1FF') + '"/></g>';
    }
    night.innerHTML = nhtml;
    opClock(st, night, [[0, 0], [.66, 0], [.75, 1], [.9, 1], [.99, 0], [1, 0]]);

    /* ── L4 BACK RAIN (vanishes at the far girdle) ───────────────────── */
    var backRain = layer();
    var BACKX = [60, 180, 300, 430, 560, 680, 800, 930, 1060, 1180];
    var backN = LITE ? 6 : 10, LITE_LANES = [0, 2, 4, 5, 7, 9], bi;
    for (bi = 0; bi < backN; bi++) {
      var bg = svgEl('g', { transform: 'translate(' + BACKX[LITE ? LITE_LANES[bi] : bi] + ',0)' });
      var bm = svgEl('g', { 'class': 'dmTB' });
      bm.innerHTML = gemBack(rnd(6, 9));
      bg.appendChild(bm); backRain.appendChild(bg);
      var bD = rnd(9000, 12000), bsw = rnd(-10, 10), bro = rnd(40, 90);
      var ba = bm.animate([
        { transform: 'translate(0px,-40px) rotate(0deg)', opacity: 0, offset: 0 },
        { transform: 'translate(' + bsw + 'px,150px) rotate(' + (bro * .35) + 'deg)', opacity: 1, offset: .3 },
        { transform: 'translate(' + (-bsw) + 'px,420px) rotate(' + (bro * .7) + 'deg)', opacity: 1, offset: .75 },
        { transform: 'translate(0px,560px) rotate(' + bro + 'deg)', opacity: 0, offset: 1 }
      ], { duration: bD, iterations: Infinity, delay: -rnd(0, bD), easing: 'linear', fill: 'backwards' });
      st.anims.push(ba);
    }

    /* ── L5 MIDGROUND ────────────────────────────────────────────────── */
    var midg = layer();
    /* Crown Spires (left) — 7 prisms + lightfall in the notch */
    var SPIRES = [[120, 330, 44, 630], [90, 270, 64, 640], [150, 210, 74, 660],
                  [205, 175, 80, 660], [262, 235, 70, 650], [315, 300, 60, 640], [360, 350, 52, 630]];
    var sphtml = '', clipPolys = '', sp;
    for (sp = 0; sp < SPIRES.length; sp++) {
      var sx = SPIRES[sp][0], stp = SPIRES[sp][1], sw2 = SPIRES[sp][2] / 2, sb = SPIRES[sp][3];
      var spts = P(sx, stp) + ' ' + P(sx + sw2, stp + (sb - stp) * .3) + ' ' + P(sx + sw2 * .8, sb) + ' ' +
                 P(sx - sw2 * .8, sb) + ' ' + P(sx - sw2, stp + (sb - stp) * .3);
      sphtml += '<polygon points="' + spts + '" fill="url(#' + (sp % 2 ? 'dmSpireA' : 'dmSpireB') + u + ')"' +
        ' stroke="rgba(255,255,255,.55)" stroke-width="1.2"/>' +
        '<line x1="' + sx + '" y1="' + stp + '" x2="' + sx + '" y2="' + sb + '" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>';
      clipPolys += '<polygon points="' + spts + '"/>';
    }
    /* lightfall */
    sphtml += '<rect x="188" y="330" width="46" height="235" fill="url(#dmFallG' + u + ')" opacity=".5"/>';
    midg.innerHTML =
      '<clipPath id="dmSpClip' + u + '">' + clipPolys + '</clipPath>' +
      '<clipPath id="dmLfClip' + u + '"><rect x="188" y="330" width="46" height="235"/></clipPath>' +
      sphtml +
      '<g clip-path="url(#dmLfClip' + u + ')">' +
      '<rect class="dmLfS" x="186" y="300" width="50" height="60" fill="#FFFFFF" opacity=".6" style="animation:dmShimmer 2.2s linear infinite"/>' +
      '<rect class="dmLfS" x="186" y="300" width="50" height="46" fill="#FFFFFF" opacity=".5" style="animation:dmShimmer 2.8s linear infinite;animation-delay:-1.2s"/>' +
      '<rect class="dmLfS" x="186" y="300" width="50" height="52" fill="#FFFFFF" opacity=".45" style="animation:dmShimmer 3.4s linear infinite;animation-delay:-2.1s"/></g>' +
      '<g clip-path="url(#dmSpClip' + u + ')"><g class="dmSpHl"><rect x="-80" y="140" width="26" height="540" transform="skewX(-14)" fill="url(#dmBlade' + u + ')" opacity=".5"/></g></g>';
    mkClock(st, midg.querySelector('.dmSpHl'), [
      { transform: 'translate(0px,0px)', opacity: 0, offset: 0 },
      { transform: 'translate(90px,0px)', opacity: .5, offset: .25 },
      { transform: 'translate(300px,0px)', opacity: .55, offset: .5 },
      { transform: 'translate(430px,0px)', opacity: 0, offset: .66 },
      { transform: 'translate(430px,0px)', opacity: 0, offset: .99 },
      { transform: 'translate(0px,0px)', opacity: 0, offset: 1 }
    ]);
    /* lightfall base sparkles */
    var lfsp = svgEl('g', {});
    midg.appendChild(lfsp);
    var lb;
    for (lb = 0; lb < 4; lb++) {
      var lg = svgEl('g', { transform: 'translate(' + (192 + lb * 13) + ',' + (556 + (lb % 2) * 8) + ') scale(.5)' });
      lg.innerHTML = '<path class="dmSpark dmTB" style="animation-duration:' + rnd(2.2, 3.6).toFixed(1) +
        's;animation-delay:-' + rnd(0, 3).toFixed(1) + 's" d="' + CROSS + '" fill="#FFFFFF"/>';
      lfsp.appendChild(lg);
    }
    /* Geode Vale (right) — glow ignites at dusk */
    var geode = svgEl('g', {});
    midg.appendChild(geode);
    var teeth = '', tt;
    for (tt = 0; tt < 10; tt++) {
      var ta = Math.PI + tt * Math.PI / 9, t1 = ta - .12, t2 = ta + .12;
      teeth += '<polygon points="' +
        P(1105 + 96 * Math.cos(t1), 565 + 80 * Math.sin(t1)) + ' ' +
        P(1105 + 96 * Math.cos(t2), 565 + 80 * Math.sin(t2)) + ' ' +
        P(1105 + 58 * Math.cos(ta), 565 + 48 * Math.sin(ta)) + '"' +
        ' fill="' + (tt % 2 ? '#C9A7FF' : '#E3D0FF') + '" stroke="rgba(255,255,255,.4)" stroke-width=".8"/>';
    }
    geode.innerHTML =
      '<ellipse cx="1105" cy="565" rx="130" ry="110" fill="#6E55B5"/>' +
      '<ellipse cx="1105" cy="565" rx="100" ry="84" fill="#3A2B63"/>' + teeth +
      '<circle class="dmGeoGlow" cx="1105" cy="545" r="72" fill="url(#dmGeodeG' + u + ')"/>';
    opClock(st, geode.querySelector('.dmGeoGlow'),
      [[0, .06], [.58, .06], [.66, 1], [.9, .85], [.98, .1], [1, .06]]);
    /* floating shards */
    var SHARDS = [[350, 420, 10, 5], [660, 380, 13, 6], [920, 450, 16, 7]];
    var sh;
    for (sh = 0; sh < 3; sh++) {
      var shg = svgEl('g', { transform: 'translate(' + SHARDS[sh][0] + ',' + SHARDS[sh][1] + ')' });
      var shs = SHARDS[sh][2];
      shg.innerHTML = '<g style="animation:dmBob ' + SHARDS[sh][3] + 's ease-in-out infinite;animation-delay:-' + sh * 1.7 + 's">' +
        '<polygon points="0,' + (-shs) + ' ' + shs * .7 + ',0 0,' + shs + ' ' + (-shs * .7) + ',0" fill="#E8F6FF" stroke="#FFFFFF" stroke-width="1"/>' +
        '<circle cx="' + shs + '" cy="' + (-shs * .5) + '" r="1.6" fill="#FFFFFF" opacity=".9"/>' +
        '<circle cx="' + (-shs * .8) + '" cy="' + shs * .4 + '" r="1.2" fill="#FFFFFF" opacity=".7"/></g>';
      midg.appendChild(shg);
    }

    /* ── L7 GROUND — the planet-sized brilliant ──────────────────────── */
    var ground = layer();
    var gp = girdlePts();
    var groundClipPath = 'M -20,' + hy(-20).toFixed(1);
    var gx;
    for (gx = 40; gx <= 1300; gx += 60) groundClipPath += ' L ' + P(gx, hy(gx));
    groundClipPath += ' L 1300,820 L -20,820 Z';
    var fhtml = '<clipPath id="dmGndClip' + u + '"><path d="' + groundClipPath + '"/></clipPath>';

    /* facet mosaic */
    var fi;
    for (fi = 0; fi < ST_N - 1; fi++)          /* girdle band */
      fhtml += '<polygon points="' + P(XH[fi], HYV[fi]) + ' ' + P(XH[fi + 1], HYV[fi + 1]) + ' ' +
        lvPt(fi + 1, 1) + ' ' + lvPt(fi, 1) + '" fill="url(#' + (fi % 2 ? 'dmFGa' : 'dmFGb') + u + ')"' +
        ' stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>';
    for (fi = 0; fi < ST_N - 2; fi += 2)       /* kites (peak pokes up) */
      fhtml += '<polygon points="' + lvPt(fi, 1) + ' ' +
        P(spokeAt(fi + 1, lv(fi + 1, 1) - 16), lv(fi + 1, 1) - 16) + ' ' + lvPt(fi + 2, 1) + ' ' +
        lvPt(fi + 2, 2) + ' ' + lvPt(fi, 2) + '" fill="url(#' + (fi % 4 ? 'dmFKa' : 'dmFKb') + u + ')"' +
        ' stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>';
    for (fi = 1; fi < ST_N - 2; fi += 2)       /* star facets, brick offset */
      fhtml += '<polygon points="' + lvPt(fi, 2) + ' ' +
        P(spokeAt(fi + 1, lv(fi + 1, 2) - 12), lv(fi + 1, 2) - 12) + ' ' + lvPt(fi + 2, 2) + ' ' +
        lvPt(fi + 2, 3) + ' ' + lvPt(fi, 3) + '" fill="url(#' + (fi % 4 === 1 ? 'dmFSa' : 'dmFSb') + u + ')"' +
        ' stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>';
    var tablePts = '';                          /* the table */
    for (fi = 0; fi < ST_N; fi++) tablePts += (fi ? ' ' : '') + lvPt(fi, 3);
    tablePts += ' ' + P(spokeAt(ST_N - 1, 820), 820) + ' ' + P(spokeAt(0, 820), 820);
    fhtml += '<polygon points="' + tablePts + '" fill="url(#dmFTa' + u + ')" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>';
    /* concentric table arcs */
    var arcOff = [210, 250, 295], ao;
    for (ao = 0; ao < 3; ao++) {
      var apts = '';
      for (fi = 0; fi < ST_N; fi++) {
        var ay = HYV[fi] + arcOff[ao];
        apts += (fi ? ' ' : '') + P(spokeAt(fi, ay), ay);
      }
      fhtml += '<polyline points="' + apts + '" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>';
    }
    ground.innerHTML = fhtml;

    /* dispersion FIRE wedges (staggered rainbow flash → Fire Crossing) */
    var wedges = svgEl('g', {});
    ground.appendChild(wedges);
    var wi;
    for (wi = 0; wi < 10; wi++) {
      var wa = 1 + wi * 2, wb = wa + 2;
      var wg = svgEl('polygon', {
        points: P(XH[wa], HYV[wa]) + ' ' + P(XH[wb], HYV[wb]) + ' ' +
          P(spokeAt(wb, 820), 820) + ' ' + P(spokeAt(wa, 820), 820),
        fill: 'url(#dmWed' + (wi % 6) + u + ')', opacity: 0
      });
      wedges.appendChild(wg);
      var ws = .44 + wi * .009;
      opClock(st, wg, [[0, 0], [ws, 0], [ws + .012, .85], [ws + .03, .34], [.58, .3], [.7, .16], [.78, 0], [1, 0]]);
    }

    /* light blades (brilliance sweep, clipped to the ground) */
    var bladeWrap = svgEl('g', { 'clip-path': 'url(#dmGndClip' + u + ')' });
    ground.appendChild(bladeWrap);
    var blades = svgEl('g', {});
    bladeWrap.appendChild(blades);
    var BL = [[0, 140, .3], [180, 60, .14], [300, 110, .24], [460, 70, .12], [580, 90, .2]], bl;
    var blHTML = '';
    for (bl = 0; bl < BL.length; bl++)
      blHTML += '<rect x="' + BL[bl][0] + '" y="500" width="' + BL[bl][1] + '" height="330" transform="skewX(-18)"' +
        ' fill="url(#dmBlade' + u + ')" opacity="' + BL[bl][2] + '"/>';
    blades.innerHTML = blHTML;
    mkClock(st, blades, [
      { transform: 'translate(-380px,0px)', opacity: 0, offset: 0 },
      { transform: 'translate(-200px,0px)', opacity: .8, offset: .06 },
      { transform: 'translate(520px,0px)', opacity: 1, offset: .3 },
      { transform: 'translate(1450px,0px)', opacity: .7, offset: .5 },
      { transform: 'translate(1600px,0px)', opacity: 0, offset: .62 },
      { transform: 'translate(-380px,0px)', opacity: 0, offset: 1 }
    ]);
    var flashW = svgEl('g', {});
    flashW.innerHTML = '<rect x="0" y="490" width="90" height="340" transform="skewX(-18)" fill="url(#dmBlade' + u + ')"/>';
    bladeWrap.appendChild(flashW);
    mkClock(st, flashW, [
      { transform: 'translate(-300px,0px)', opacity: 0, offset: 0 },
      { transform: 'translate(-300px,0px)', opacity: 0, offset: .27 },
      { transform: 'translate(-200px,0px)', opacity: .5, offset: .285 },
      { transform: 'translate(1300px,0px)', opacity: .5, offset: .335 },
      { transform: 'translate(1350px,0px)', opacity: 0, offset: .345 },
      { transform: 'translate(-300px,0px)', opacity: 0, offset: 1 }
    ]);

    /* edge glints (one node, one clock profile) */
    var glints = svgEl('g', {});
    ground.appendChild(glints);
    var glHTML = '', gl;
    for (gl = 0; gl < 10; gl++) {
      var gi = 2 + gl * 2;
      if (gi + 2 >= ST_N) break;
      glHTML += '<line x1="' + spokeAt(gi, lv(gi, 1)).toFixed(1) + '" y1="' + lv(gi, 1).toFixed(1) +
        '" x2="' + spokeAt(gi + 2, lv(gi + 2, 1)).toFixed(1) + '" y2="' + lv(gi + 2, 1).toFixed(1) +
        '" stroke="#FFFFFF" stroke-width="2.5" opacity="' + (gl % 2 ? .9 : .6) + '"/>';
    }
    glints.innerHTML = glHTML;
    opClock(st, glints, [[0, .05], [.16, .2], [.3, .5], [.34, .25], [.44, .4], [.58, .1], [.72, 0], [.95, 0], [1, .05]]);

    /* girdle glow: white (noon) / rainbow (fire) / cyan (night) + haze
       (own group — setting innerHTML on `ground` here would detach the
       already-animated wedge/blade/glint nodes) */
    var girdleG = svgEl('g', {});
    girdleG.innerHTML =
      '<polyline class="dmHaze" points="' + gp + '" fill="none" stroke="#FFFFFF" stroke-width="26" opacity=".1"/>' +
      '<polyline class="dmGw" points="' + gp + '" fill="none" stroke="#FFFFFF" stroke-width="6"/>' +
      '<polyline class="dmGr" points="' + gp + '" fill="none" stroke="url(#dmRainG' + u + ')" stroke-width="6"/>' +
      '<polyline class="dmGc" points="' + gp + '" fill="none" stroke="#7FF0FF" stroke-width="6"/>';
    ground.appendChild(girdleG);
    opClock(st, girdleG.querySelector('.dmGw'), [[0, .25], [.28, .75], [.44, .3], [.52, 0], [.94, 0], [1, .25]]);
    opClock(st, girdleG.querySelector('.dmGr'), [[0, 0], [.44, 0], [.48, .9], [.56, .9], [.66, 0], [1, 0]]);
    opClock(st, girdleG.querySelector('.dmGc'), [[0, 0], [.66, 0], [.75, .8], [.92, .8], [.99, 0], [1, 0]]);

    /* NEAR-rain landing map (needed for hoard + impacts) */
    var NEARX = [140, 390, 620, 850, 1060, 1200];
    var NEARY = [755, 730, 770, 745, 720, 760];

    /* diamond hoard — the planet slowly paved with fallen gems */
    var hoard = svgEl('g', {});
    ground.appendChild(hoard);
    var hoHTML = '', ho;
    for (ho = 0; ho < NEARX.length; ho++) {
      var hx1 = NEARX[ho] - 28, hy1 = NEARY[ho] + 8, hx2 = NEARX[ho] + 24, hy2 = NEARY[ho] + 14;
      hoHTML +=
        '<polygon points="' + P(hx1, hy1 - 5) + ' ' + P(hx1 + 5, hy1) + ' ' + P(hx1, hy1 + 5) + ' ' + P(hx1 - 5, hy1) + '" fill="#E9F3FF" stroke="#FFFFFF" stroke-width=".8"/>' +
        '<polygon points="' + P(hx2, hy2 - 4) + ' ' + P(hx2 + 4, hy2) + ' ' + P(hx2, hy2 + 4) + ' ' + P(hx2 - 4, hy2) + '" fill="#E9F3FF" stroke="#FFFFFF" stroke-width=".8"/>' +
        (ho % 2 ? '<polygon points="' + P(hx1 + 20, hy1 + 9) + ' ' + P(hx1 + 23, hy1 + 12) + ' ' + P(hx1 + 20, hy1 + 15) + ' ' + P(hx1 + 17, hy1 + 12) + '" fill="#E9F3FF" stroke="#FFFFFF" stroke-width=".6"/>' : '');
    }
    hoard.innerHTML = hoHTML;

    /* scintillation sparkle pool (restartable → heart wave) */
    var sparkG = svgEl('g', {});
    ground.appendChild(sparkG);
    var SPARK_AT = [], sk;
    for (sk = 2; sk <= 20; sk += 2)
      SPARK_AT.push([spokeAt(sk, lv(sk, (sk / 2) % 2 ? 1 : 2)), lv(sk, (sk / 2) % 2 ? 1 : 2)]);
    SPARK_AT.push([spokeAt(7, HYV[7] + 8), HYV[7] + 8]);
    SPARK_AT.push([spokeAt(15, HYV[15] + 8), HYV[15] + 8]);
    for (sk = 0; sk < NEARX.length; sk++) SPARK_AT.push([NEARX[sk] - 30, NEARY[sk] + 6]);
    var sparkN = LITE ? 12 : 18;
    for (sk = 0; sk < sparkN && sk < SPARK_AT.length; sk++) {
      var sg = svgEl('g', {
        transform: 'translate(' + SPARK_AT[sk][0].toFixed(1) + ',' + SPARK_AT[sk][1].toFixed(1) +
          ') scale(' + rnd(.6, 1.1).toFixed(2) + ')'
      });
      sg.innerHTML = '<path class="dmSpark dmTB" style="animation-duration:' + rnd(2.4, 4.2).toFixed(1) +
        's;animation-delay:-' + rnd(0, 4).toFixed(1) + 's" d="' + CROSS + '" fill="#FFFFFF"/>';
      sparkG.appendChild(sg);
      st.sparkNodes.push({ node: sg.firstChild, x: SPARK_AT[sk][0], y: SPARK_AT[sk][1] });
    }

    /* night shading over the ground (BELOW the heart — it is a light source) */
    var shade = svgEl('path', { d: groundClipPath, fill: '#23306B', opacity: 0 });
    ground.appendChild(shade);
    opClock(st, shade, [[0, 0], [.62, 0], [.74, .45], [.92, .45], [1, 0]]);

    /* HEART FACET + HEARTLIGHT */
    var heartG = svgEl('g', {});
    ground.appendChild(heartG);
    var octo = '', ok;
    for (ok = 0; ok < 8; ok++) {
      var oa = (ok + .5) * Math.PI / 4;
      octo += (ok ? ' ' : '') + P(640 + 46 * Math.cos(oa), 755 + 34 * Math.sin(oa));
    }
    heartG.innerHTML =
      '<g class="dmHeartWrap"><circle class="dmHeartGlow dmTB" cx="640" cy="757" r="160" fill="url(#dmHeartG' + u + ')" style="animation:dmHeartPulse 6s ease-in-out infinite"/></g>' +
      '<polygon points="' + octo + '" fill="rgba(255,255,255,.07)" stroke="#7FF0FF" stroke-width="6" opacity=".3"/>' +
      '<polygon class="dmHeartHit" points="' + octo + '" fill="rgba(190,240,255,.12)" stroke="rgba(255,255,255,.9)" stroke-width="2"/>';
    opClock(st, heartG.querySelector('.dmHeartWrap'),
      [[0, .25], [.3, .2], [.6, .35], [.74, 1], [.92, 1], [1, .25]]);

    /* ── L8/L9 MID + NEAR RAIN (heroes land with synced chimes) ─────── */
    var rain = layer();
    var MIDX = [80, 240, 410, 555, 700, 845, 990, 1150];
    var MIDY = [660, 630, 675, 645, 620, 668, 640, 655];
    function makeDrop(kind, laneX, landY, size, artHTML, D) {
      var outer = svgEl('g', { transform: 'translate(' + laneX + ',0)' });
      var mid = svgEl('g', { 'class': 'dmTB' });
      var art = svgEl('g', {});
      art.innerHTML = artHTML;
      mid.appendChild(art);
      /* rainbow fire-pip (clock-gated to the Fire Hour) */
      var pip = null;
      if (!(LITE && kind === 'mid')) {
        pip = svgEl('circle', { r: 3.2, cy: -size * .1, fill: 'url(#dmRainG' + u + ')', opacity: 0 });
        mid.appendChild(pip);
        opClock(st, pip, [[0, 0], [.44, 0], [.5, .9], [.58, 0], [1, 0]]);
      }
      var hit = svgEl('circle', { r: Math.max(26, size + 8), fill: 'rgba(0,0,0,0)', 'class': 'dmHit' });
      mid.appendChild(hit);
      rain.appendChild(outer); outer.appendChild(mid);
      var sw = rnd(-12, 12), ro = rnd(80, 180), dl = -rnd(0, D);
      var a = mid.animate([
        { transform: 'translate(0px,-60px) rotate(0deg)', offset: 0 },
        { transform: 'translate(' + sw + 'px,' + (landY * .35) + 'px) rotate(' + (ro * .35) + 'deg)', offset: .35 },
        { transform: 'translate(' + (-sw) + 'px,' + (landY * .7) + 'px) rotate(' + (ro * .7) + 'deg)', offset: .7 },
        { transform: 'translate(0px,' + landY + 'px) rotate(' + ro + 'deg)', offset: 1 }
      ], { duration: D, iterations: Infinity, delay: dl, easing: 'linear', fill: 'backwards' });
      st.anims.push(a);
      var rec = { kind: kind, node: mid, art: art, anim: a, D: D, dl: dl, laneX: laneX, landY: landY, impactAnim: null, rose: null, roseTimer: null };
      st.drops.push(rec);
      return rec;
    }
    var mi;
    for (mi = 0; mi < 8; mi++)
      makeDrop('mid', MIDX[mi], MIDY[mi], rnd(14, 20) / 2 + 8,
        gemProfile(rnd(8, 11), u), rnd(6000, 8000));
    /* NEAR heroes: 3 round-brilliants, 2 pears, 1 profile; blush + champagne */
    var NEARSPEC = [
      { mk: gemRB, s: 15, crown: 'dmCrown' },
      { mk: gemPear, s: 13, crown: 'dmCrown' },
      { mk: gemRB, s: 18, crown: 'dmCrownBlush' },
      { mk: gemProfile, s: 16, crown: 'dmCrown' },
      { mk: gemRB, s: 14, crown: 'dmCrownCham' },
      { mk: gemPear, s: 16, crown: 'dmCrown' }
    ];
    var ni;
    for (ni = 0; ni < 6; ni++) {
      var spec = NEARSPEC[ni];
      var halo = '<circle r="' + (spec.s + 8) + '" fill="url(#dmHaloGem' + u + ')"/>';
      var roseOv = '<g class="dmRoseOv" opacity="0"><circle r="' + (spec.s + 9) + '" fill="#FFD3E9" opacity=".35"/>' +
        '<circle r="' + (spec.s * .8) + '" fill="#FFF0F7" opacity=".55"/></g>';
      var rec2 = makeDrop('near', NEARX[ni], NEARY[ni], spec.s,
        halo + spec.mk(spec.s, u, spec.crown) + roseOv, rnd(4500, 6000));
      /* pre-synced impact chime at the landing point */
      var imp = svgEl('g', { transform: 'translate(' + NEARX[ni] + ',' + NEARY[ni] + ')' });
      var ig = svgEl('g', { 'class': 'dmTB', opacity: 0 });
      ig.innerHTML =
        '<circle r="20" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>' +
        '<circle r="12" fill="none" stroke="#7FF0FF" stroke-width="1.5"/>' +
        '<g transform="translate(-16,-6) scale(.4)"><path d="' + CROSS + '" fill="#FFFFFF"/></g>' +
        '<g transform="translate(15,-4) scale(.3)"><path d="' + CROSS + '" fill="#FFFFFF"/></g>' +
        '<g transform="translate(2,10) scale(.35)"><path d="' + CROSS + '" fill="#7FF0FF"/></g>';
      imp.appendChild(ig); rain.appendChild(imp);
      var ia = ig.animate([
        { opacity: 0, transform: 'scale(.2)', offset: 0 },
        { opacity: 0, transform: 'scale(.2)', offset: .88 },
        { opacity: .9, transform: 'scale(.55)', offset: .91 },
        { opacity: 0, transform: 'scale(1.5)', offset: 1 }
      ], { duration: rec2.D, iterations: Infinity, delay: Number(rec2.anim.effect.getTiming().delay), easing: 'linear', fill: 'backwards' });
      st.anims.push(ia);
      rec2.impactAnim = ia;
    }

    /* ── L10 VEILS + DAWN MIST ───────────────────────────────────────── */
    var veils = layer();
    veils.innerHTML =
      '<rect class="dmVw" width="1280" height="800" fill="#FFB36B" opacity="0"/>' +
      '<rect class="dmVc" width="1280" height="800" fill="#24306B" opacity="0"/>' +
      '<rect class="dmVm" x="0" y="430" width="1280" height="200" fill="url(#dmMist' + u + ')" opacity="0"/>';
    opClock(st, veils.querySelector('.dmVw'), [[0, 0], [.4, 0], [.48, .18], [.58, .14], [.68, 0], [1, 0]]);
    opClock(st, veils.querySelector('.dmVc'), [[0, .1], [.06, 0], [.62, 0], [.74, .28], [.92, .28], [1, .1]]);
    opClock(st, veils.querySelector('.dmVm'), [[0, .35], [.1, 0], [.94, 0], [1, .35]]);

    /* ── L11 TRANSIENTS (prebuilt, recycled) ─────────────────────────── */
    var fxL = layer();

    function clockF() {
      var t = Number(st.cycleAnims[0].currentTime) || 0;
      return (t % DAY_MS) / DAY_MS;
    }

    /* carat comet */
    var comet = svgEl('g', { opacity: 0 });
    comet.innerHTML =
      '<polygon points="0,-7 5,0 0,7 -5,0" fill="#FFFFFF"/>' +
      '<circle cx="-14" cy="-8" r="2.4" fill="#BFF4FF" opacity=".8"/>' +
      '<circle cx="-26" cy="-15" r="1.8" fill="#BFF4FF" opacity=".55"/>' +
      '<circle cx="-38" cy="-22" r="1.3" fill="#BFF4FF" opacity=".3"/>';
    fxL.appendChild(comet);
    function fireComet() {
      var cx = rnd(150, 850), cy = rnd(60, 260);
      comet.setAttribute('opacity', 1);
      oneShot(st, comet, [
        { transform: 'translate(' + cx + 'px,' + cy + 'px)', opacity: 0 },
        { transform: 'translate(' + (cx + 60) + 'px,' + (cy + 34) + 'px)', opacity: 1, offset: .15 },
        { transform: 'translate(' + (cx + 340) + 'px,' + (cy + 190) + 'px)', opacity: 0, offset: 1 }
      ], { duration: 1400, easing: 'linear', fill: 'forwards' });
    }

    /* prism butterflies */
    var flies = [], fb;
    for (fb = 0; fb < 2; fb++) {
      var fw = svgEl('g', {});
      var fmid = svgEl('g', { opacity: 0 });
      var fart = svgEl('g', {});
      fart.innerHTML =
        '<g class="dmWings dmTB">' +
        '<polygon points="-2,-2 -17,-11 -14,3 -2,3" fill="' + (fb ? '#FFD6E8' : '#CDEBFF') + '" stroke="#FFFFFF" stroke-width=".8" opacity=".9"/>' +
        '<polygon points="2,-2 17,-11 14,3 2,3" fill="' + (fb ? '#CDEBFF' : '#FFD6E8') + '" stroke="#FFFFFF" stroke-width=".8" opacity=".9"/></g>' +
        '<ellipse rx="2" ry="7" fill="#E8F6FF" stroke="#FFFFFF" stroke-width=".6"/>';
      fmid.appendChild(fart); fw.appendChild(fmid); fxL.appendChild(fw);
      flies.push({ wrap: fw, mid: fmid, art: fart, wings: fart.querySelector('.dmWings'), busy: false });
    }
    function fireButterfly() {
      var f = flies[0].busy ? (flies[1].busy ? null : flies[1]) : flies[0];
      if (!f) return false;
      f.busy = true;
      var baseY = rnd(300, 500), ltr = Math.random() < .5;
      var x0 = ltr ? -50 : 1330, x1 = ltr ? 1330 : -50;
      f.art.setAttribute('transform', ltr ? 'scale(1,1)' : 'scale(-1,1)');
      f.wings.classList.add('dmFlapOn');
      f.mid.setAttribute('opacity', 1);
      var kf = [], seg;
      for (seg = 0; seg <= 6; seg++)
        kf.push({
          transform: 'translate(' + (x0 + (x1 - x0) * seg / 6) + 'px,' +
            (baseY + Math.sin(seg * 1.6) * 42) + 'px)', offset: seg / 6
        });
      var fa = oneShot(st, f.mid, kf, { duration: rnd(10000, 14000), easing: 'ease-in-out', fill: 'forwards' });
      fa.onfinish = function () {
        f.wings.classList.remove('dmFlapOn');
        f.mid.setAttribute('opacity', 0);
        f.busy = false; st.ambient--;
      };
    }

    /* crystal bunny "Berry" — hops along the table front */
    var bunW = svgEl('g', { transform: 'translate(0,742)' });
    var bunM = svgEl('g', { opacity: 0 });
    var bunA = svgEl('g', {});
    bunA.innerHTML =
      '<g class="dmBun">' +
      '<ellipse cx="-14" cy="2" rx="4" ry="4" fill="#FFFFFF" stroke="#CFE4F5" stroke-width="1"/>' +
      '<ellipse rx="16" ry="11" fill="#F4FBFF" stroke="#CFE4F5" stroke-width="1.2"/>' +
      '<ellipse cx="-8" cy="9" rx="5" ry="3" fill="#EAF4FC"/>' +
      '<ellipse cx="8" cy="9" rx="5" ry="3" fill="#EAF4FC"/>' +
      '<circle cx="13" cy="-9" r="8" fill="#F4FBFF" stroke="#CFE4F5" stroke-width="1.2"/>' +
      '<g transform="rotate(-8 11 -20)"><ellipse cx="11" cy="-22" rx="2.8" ry="8" fill="#F4FBFF" stroke="#CFE4F5" stroke-width="1"/>' +
      '<ellipse cx="11" cy="-21" rx="1.3" ry="5.5" fill="#FFD3E8"/></g>' +
      '<g transform="rotate(10 17 -19)"><ellipse cx="17" cy="-21" rx="2.8" ry="8" fill="#F4FBFF" stroke="#CFE4F5" stroke-width="1"/>' +
      '<ellipse cx="17" cy="-20" rx="1.3" ry="5.5" fill="#FFD3E8"/></g>' +
      '<circle cx="16" cy="-10" r="1.4" fill="#3A4A66"/>' +
      '<path d="M19 -6 q2 1.5 4 .5" stroke="#3A4A66" stroke-width="1" fill="none"/>' +
      '<circle cx="18.5" cy="-5.5" r="1.6" fill="#FFC9CB" opacity=".7"/></g>';
    bunM.appendChild(bunA); bunW.appendChild(bunM); fxL.appendChild(bunW);
    function fireBunny() {
      if (st.bunBusy) return false;
      st.bunBusy = true;
      var ltr = Math.random() < .5;
      bunA.setAttribute('transform', ltr ? 'scale(1,1)' : 'scale(-1,1)');
      bunA.firstChild.classList.add('dmHopOn');
      bunM.setAttribute('opacity', 1);
      var ba2 = oneShot(st, bunM, [
        { transform: 'translate(' + (ltr ? -60 : 1340) + 'px,0px)' },
        { transform: 'translate(' + (ltr ? 1340 : -60) + 'px,0px)' }
      ], { duration: 8000, easing: 'linear', fill: 'forwards' });
      ba2.onfinish = function () {
        bunA.firstChild.classList.remove('dmHopOn');
        bunM.setAttribute('opacity', 0);
        st.bunBusy = false;
        st.ambient--;
      };
    }

    /* the Little Lapidary — polishes the girdle, leaves a sparkle wake */
    var lapW = svgEl('g', {});
    var lapM = svgEl('g', { opacity: 0 });
    lapM.innerHTML =
      '<path d="M0,-13 L3.8,-4 L13,-4 L5.8,2 L8.4,11 L0,5.6 L-8.4,11 L-5.8,2 L-13,-4 L-3.8,-4 Z"' +
      ' fill="#FFF6D8" stroke="#F0D890" stroke-width="1.2"/>' +
      '<circle cx="-3" cy="-1" r="1.2" fill="#6A5A3A"/><circle cx="3" cy="-1" r="1.2" fill="#6A5A3A"/>' +
      '<path d="M-3 3 q3 2.6 6 0" stroke="#6A5A3A" stroke-width="1" fill="none"/>' +
      '<circle cx="-5.5" cy="2" r="1.7" fill="#FFC9CB" opacity=".8"/><circle cx="5.5" cy="2" r="1.7" fill="#FFC9CB" opacity=".8"/>';
    lapW.appendChild(lapM); fxL.appendChild(lapW);
    var wake = [], wk;
    for (wk = 0; wk < 6; wk++) {
      var wg2 = svgEl('g', { opacity: 0 });
      wg2.innerHTML = '<g class="dmTB" transform="scale(.5)"><path d="' + CROSS + '" fill="#FFFFFF"/></g>';
      fxL.appendChild(wg2); wake.push(wg2);
    }
    function fireLapidary() {
      if (st.lapBusy) return false;
      st.lapBusy = true;
      var kf = [], seg;
      for (seg = 0; seg <= 6; seg++) {
        var lx = seg / 6 * 1280;
        kf.push({ transform: 'translate(' + lx + 'px,' + (hy(lx) - 12) + 'px)', offset: seg / 6 });
      }
      lapM.setAttribute('opacity', 1);
      var la = oneShot(st, lapM, kf, { duration: 9000, easing: 'linear', fill: 'forwards' });
      la.onfinish = function () { lapM.setAttribute('opacity', 0); st.lapBusy = false; st.ambient -= 2; };
      var wj;
      for (wj = 0; wj < 6; wj++) {
        var wx = (wj + 1) / 7 * 1280;
        wake[wj].setAttribute('transform', 'translate(' + wx.toFixed(1) + ',' + (hy(wx) - 10).toFixed(1) + ')');
        oneShot(st, wake[wj], [
          { opacity: 0 }, { opacity: .95, offset: .3 }, { opacity: 0 }
        ], { duration: 1600, delay: 900 + wj * 1300, easing: 'ease-in-out' });
      }
    }

    /* bubble prisms from the geode */
    var bubbles = [], bb;
    for (bb = 0; bb < 3; bb++) {
      var bub = svgEl('g', { transform: 'translate(' + (1085 + bb * 22) + ',548)' });
      var bmid = svgEl('circle', { r: 7 + bb * 2, fill: 'rgba(255,255,255,.08)', stroke: 'url(#dmRainG' + u + ')', 'stroke-width': 1.6, opacity: 0 });
      bub.appendChild(bmid); fxL.appendChild(bub);
      bubbles.push(bmid);
    }
    function fireBubbles() {
      if (st.bubBusy) return false;
      st.bubBusy = true;
      var bj;
      for (bj = 0; bj < 3; bj++) {
        (function (n, dly) {
          var a2 = oneShot(st, n, [
            { transform: 'translate(0px,0px)', opacity: 0 },
            { transform: 'translate(' + rnd(-14, 6) + 'px,-60px)', opacity: .9, offset: .25 },
            { transform: 'translate(' + rnd(-6, 16) + 'px,-130px)', opacity: .7, offset: .65 },
            { transform: 'translate(' + rnd(-12, 12) + 'px,-190px)', opacity: 0, offset: 1 }
          ], { duration: 6000, delay: dly, easing: 'ease-out' });
          if (dly === 1800) a2.onfinish = function () { st.bubBusy = false; st.ambient -= 3; };
        })(bubbles[bj], bj * 900);
      }
    }

    /* ROSE DIAMOND — a rare pink hero drop (pooled bloom rings, race-safe) */
    var roseRings = [], rr;
    for (rr = 0; rr < 3; rr++) {
      var rring = svgEl('circle', {
        r: 14 + rr * 8, fill: 'none', stroke: rr === 1 ? '#FFD3E9' : '#FFF0F7',
        'stroke-width': 2.4 - rr * .5, opacity: 0, 'class': 'dmTB'
      });
      fxL.appendChild(rring); roseRings.push(rring);
    }
    function restoreRose(d, bloom) {
      if (!d.rose) return;
      if (d.roseTimer) { clearTimeout(d.roseTimer); d.roseTimer = null; }
      if (bloom) {
        var rj2;
        for (rj2 = 0; rj2 < 3; rj2++) {
          roseRings[rj2].setAttribute('cx', d.laneX);
          roseRings[rj2].setAttribute('cy', d.landY);
          oneShot(st, roseRings[rj2], [
            { opacity: .95, transform: 'scale(.3)' },
            { opacity: 0, transform: 'scale(1.9)' }
          ], { duration: 900, delay: rj2 * 180, easing: 'ease-out' });
        }
      }
      var ov = d.art.querySelector('.dmRoseOv');
      if (ov) ov.setAttribute('opacity', 0);
      d.art.setAttribute('transform', '');
      d.anim.playbackRate = 1;
      if (d.impactAnim) d.impactAnim.playbackRate = 1;
      d.rose = false;
      st.ambient--;
    }
    function fireRose() {
      var cand = [], di;
      for (di = 0; di < st.drops.length; di++)
        if (st.drops[di].kind === 'near' && !st.drops[di].rose) cand.push(st.drops[di]);
      if (!cand.length) return false;
      var d = cand[Math.floor(rnd(0, cand.length))];
      d.rose = true;
      var ov = d.art.querySelector('.dmRoseOv');
      if (ov) ov.setAttribute('opacity', 1);
      d.art.setAttribute('transform', 'scale(1.45)');
      d.anim.playbackRate = .67;
      if (d.impactAnim) d.impactAnim.playbackRate = .67;
      /* time-to-landing in ACTIVE time: iteration progress is
         ((currentTime - delay) mod D), not (currentTime mod D) */
      var cur = Number(d.anim.currentTime) || 0;
      var remain = (d.D - ((cur - d.dl) % d.D)) / .67;
      d.roseTimer = setTimeout(function () {
        d.roseTimer = null;
        if (st.cancelled) return;
        restoreRose(d, true);
      }, remain + 200);
    }

    /* ── CLICKS: pop-a-diamond + the Heart Facet ─────────────────────── */
    /* burst pool (2) */
    var bursts = [], bp;
    for (bp = 0; bp < 2; bp++) {
      var bw = svgEl('g', {});
      var star8 = '', bs;
      for (bs = 0; bs < 8; bs++) {
        var ba3 = bs * Math.PI / 4;
        star8 += '<line x1="' + (10 * Math.cos(ba3)).toFixed(1) + '" y1="' + (10 * Math.sin(ba3)).toFixed(1) +
          '" x2="' + (30 * Math.cos(ba3)).toFixed(1) + '" y2="' + (30 * Math.sin(ba3)).toFixed(1) +
          '" stroke="#FFFFFF" stroke-width="2.2"/>';
      }
      bw.innerHTML =
        '<circle class="dmBring dmTB" r="24" fill="none" stroke="url(#dmRainG' + u + ')" stroke-width="3" opacity="0"/>' +
        '<g class="dmBstar dmTB" opacity="0">' + star8 + '</g>' +
        '<g class="dmBtw dmTB" opacity="0" transform="scale(.8)"><path d="' + CROSS + '" fill="#FFE86B"/></g>';
      fxL.appendChild(bw);
      bursts.push({ wrap: bw, ring: bw.querySelector('.dmBring'), star: bw.querySelector('.dmBstar'), tw: bw.querySelector('.dmBtw') });
    }
    var burstIdx = 0;
    function burstAt(x, y, pink) {
      var b = bursts[burstIdx++ % 2];
      b.wrap.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
      var strokes = b.star.querySelectorAll('line'), sl;
      for (sl = 0; sl < strokes.length; sl++)
        strokes[sl].setAttribute('stroke', pink ? '#FFD3E9' : '#FFFFFF');
      oneShot(st, b.ring, [
        { opacity: .95, transform: 'scale(.2)' },
        { opacity: 0, transform: 'scale(1.6)' }
      ], { duration: 650, easing: 'ease-out' });
      oneShot(st, b.star, [
        { opacity: 1, transform: 'scale(.3)' },
        { opacity: 0, transform: 'scale(1.3)' }
      ], { duration: 600, easing: 'ease-out' });
      oneShot(st, b.tw, [
        { opacity: 0, transform: 'scale(.4)' },
        { opacity: 1, transform: 'scale(1.4)', offset: .35 },
        { opacity: .4, transform: 'scale(.9)', offset: .6 },
        { opacity: .9, transform: 'scale(1.2)', offset: .8 },
        { opacity: 0, transform: 'scale(.5)' }
      ], { duration: 900, easing: 'ease-in-out' });
    }
    function clientToScene(cx, cy) {
      var r = svg.getBoundingClientRect();
      var sc = Math.max(r.width / SCENE_W, r.height / SCENE_H);
      return [(cx - r.left - (r.width - SCENE_W * sc) / 2) / sc,
              (cy - r.top - (r.height - SCENE_H * sc) / 2) / sc];
    }
    /* heart fan (5 mini gems) + chime ring */
    var fan = svgEl('g', { transform: 'translate(640,748)' });
    var fanIn = svgEl('g', { 'class': 'dmTB', opacity: 0 });
    var fanHTML = '', fj;
    for (fj = 0; fj < 5; fj++) {
      var fa2 = (fj - 2) * .55;
      fanHTML += '<polygon transform="translate(' + (Math.sin(fa2) * 44).toFixed(1) + ',' + (-24 - Math.cos(fa2) * 22).toFixed(1) +
        ')" points="0,-7 5.5,0 0,7 -5.5,0" fill="' + ['#BFF4FF', '#FFD6E8', '#FFFFFF', '#FFE9C7', '#CDEBFF'][fj] + '" stroke="#FFFFFF" stroke-width=".8"/>';
    }
    fanIn.innerHTML = fanHTML;
    fan.appendChild(fanIn);
    var chime = svgEl('circle', { cx: 640, cy: 755, r: 40, fill: 'none', stroke: '#7FF0FF', 'stroke-width': 3, opacity: 0, 'class': 'dmTB' });
    fxL.appendChild(fan); fxL.appendChild(chime);
    function heartSurge() {
      var now = Date.now();
      if (now - st.lastHeart < 3000) return;
      st.lastHeart = now;
      var glow = heartG.querySelector('.dmHeartGlow');
      oneShot(st, glow, [
        { transform: 'scale(1)', opacity: .6 },
        { transform: 'scale(1.18)', opacity: 1, offset: .4 },
        { transform: 'scale(1)', opacity: .6 }
      ], { duration: 900, easing: 'ease-in-out' });
      /* scintillation wave through the sparkle pool, delay ∝ distance */
      var sj;
      for (sj = 0; sj < st.sparkNodes.length; sj++) {
        var spn = st.sparkNodes[sj];
        var dist = Math.sqrt((spn.x - 640) * (spn.x - 640) + (spn.y - 755) * (spn.y - 755));
        oneShot(st, spn.node, [
          { opacity: .2, transform: 'scale(.7)' },
          { opacity: 1, transform: 'scale(1.9)', offset: .5 },
          { opacity: .2, transform: 'scale(.7)' }
        ], { duration: 480, delay: dist / 1.3, easing: 'ease-in-out' });
      }
      oneShot(st, fanIn, [
        { transform: 'translate(0px,0px) scale(.3)', opacity: 0 },
        { transform: 'translate(0px,-24px) scale(.9)', opacity: 1, offset: .3 },
        { transform: 'translate(0px,-72px) scale(1.05)', opacity: 0, offset: 1 }
      ], { duration: 1100, easing: 'ease-out' });
      oneShot(st, chime, [
        { opacity: .9, transform: 'scale(.3)' },
        { opacity: 0, transform: 'scale(2.2)' }
      ], { duration: 800, easing: 'ease-out' });
    }
    function popDrop(rec, sceneX, sceneY) {
      var pink = !!rec.rose;
      if (rec.rose) restoreRose(rec, false);   /* kill the stale landing timer */
      burstAt(sceneX, sceneY, pink);
      /* rebase to the top of the fall in ACTIVE time (delay-aware) */
      var cur = Number(rec.anim.currentTime) || 0;
      var top = cur - ((cur - rec.dl) % rec.D);
      rec.anim.currentTime = top;
      if (rec.impactAnim) rec.impactAnim.currentTime = top;
    }
    /* GEOMETRIC document-level hit-test (maldives cocoClick pattern): in the
       game the scene lives in a pointer-events:none z-index:-1 layer, so a
       click NEVER targets an svg node — test the pads' live boxes instead. */
    var heartHitNode = heartG.querySelector('.dmHeartHit');
    var UI_BAIL = '.wrap,button,input,select,textarea,a,#games-menu,#theme-menu,#numpad,#end-screen';
    st.clickFn = function (e) {
      var t = e.target;
      if (t && t.closest) { try { if (t.closest(UI_BAIL)) return; } catch (err) {} }
      var x = e.clientX, y = e.clientY;
      var hr = heartHitNode.getBoundingClientRect();
      if (x >= hr.left - 12 && x <= hr.right + 12 && y >= hr.top - 12 && y <= hr.bottom + 12) {
        heartSurge();
        return;
      }
      var dj, r2;
      for (dj = 0; dj < st.drops.length; dj++) {
        r2 = st.drops[dj].node.getBoundingClientRect();
        if (x >= r2.left - 6 && x <= r2.right + 6 && y >= r2.top - 6 && y <= r2.bottom + 6) {
          var pt = clientToScene(x, y);
          popDrop(st.drops[dj], pt[0], pt[1]);
          return;
        }
      }
    };
    doc.addEventListener('click', st.clickFn, true);

    /* ── SCHEDULERS (phase-gated, concurrency-capped) ────────────────── */
    function tryEvent(cost, fire) {
      if (st.ambient + cost > 10) return false;
      st.ambient += cost;
      if (fire() === false) { st.ambient -= cost; return false; }
      return true;
    }
    /* each scheduler owns ONE slot (st.slots) so bookkeeping stays bounded */
    function arm(name, fn, ms) { st.slots[name] = setTimeout(fn, ms); }
    function schedComet() {
      if (st.cancelled) return;
      var f = clockF(), night2 = f > .7 && f < .96;
      if (night2) { fireComet(); arm('comet', schedComet, rnd(12000, 24000)); }
      else if (f > .3 && f < .5 && Math.random() < .3) { fireComet(); arm('comet', schedComet, rnd(45000, 75000)); }
      else arm('comet', schedComet, rnd(4000, 8000));
    }
    arm('comet', schedComet, rnd(3000, 7000));
    function schedFly() {
      if (st.cancelled) return;
      var f = clockF();
      if (f > .05 && f < .58) tryEvent(1, fireButterfly);
      arm('fly', schedFly, rnd(25000, 50000));
    }
    arm('fly', schedFly, rnd(6000, 14000));
    function schedBunny() {
      if (st.cancelled) return;
      var f = clockF();
      if (f > .16 && f < .44 && !(flies[0].busy && flies[1].busy)) tryEvent(1, fireBunny);
      arm('bunny', schedBunny, rnd(45000, 90000));
    }
    arm('bunny', schedBunny, rnd(9000, 20000));
    function schedLap() {
      if (st.cancelled) return;
      tryEvent(2, fireLapidary);
      arm('lap', schedLap, rnd(70000, 110000));
    }
    arm('lap', schedLap, rnd(20000, 40000));
    function schedBub() {
      if (st.cancelled) return;
      tryEvent(3, fireBubbles);
      arm('bub', schedBub, rnd(30000, 55000));
    }
    arm('bub', schedBub, rnd(12000, 25000));
    function schedRose() {
      if (st.cancelled) return;
      tryEvent(1, fireRose);
      arm('rose', schedRose, rnd(45000, 70000));
    }
    arm('rose', schedRose, rnd(15000, 30000));

    /* ── verification hooks ──────────────────────────────────────────── */
    w.BACKGROUNDS.diamonds._test = {
      seek: function (f) {
        var j3;
        for (j3 = 0; j3 < st.cycleAnims.length; j3++) st.cycleAnims[j3].currentTime = f * DAY_MS;
      },
      dayMs: DAY_MS,
      comet: fireComet,
      butterfly: function () { return tryEvent(1, fireButterfly); },
      bunny: function () { return tryEvent(1, fireBunny); },
      lapidary: function () { return tryEvent(2, fireLapidary); },
      bubbles: function () { return tryEvent(3, fireBubbles); },
      rose: function () { return tryEvent(1, fireRose); },
      heart: heartSurge,
      pop: function () {
        var d2 = st.drops[st.drops.length - 1];
        popDrop(d2, d2.laneX, 400);
      },
      counts: function () {
        return { anims: doc.getAnimations ? doc.getAnimations().length : -1, drops: st.drops.length, lite: LITE };
      },
      state: st
    };

    return function cleanup() {
      st.cancelled = true;
      st.timers.forEach(clearTimeout);
      var sk2; for (sk2 in st.slots) if (st.slots.hasOwnProperty(sk2)) clearTimeout(st.slots[sk2]);
      st.drops.forEach(function (d) { if (d.roseTimer) clearTimeout(d.roseTimer); });
      st.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      st.fx.forEach(function (n) { if (n.__dmA) { try { n.__dmA.cancel(); } catch (e) {} n.__dmA = null; } });
      doc.removeEventListener('click', st.clickFn, true);
      delete w.BACKGROUNDS.diamonds._test;
      stage.style.overflow = prevOverflow;
      stage.style.direction = prevDir;
      stage.innerHTML = '';
    };
  }

  w.BACKGROUNDS = w.BACKGROUNDS || {};
  w.BACKGROUNDS.diamonds = { init: init };
})(typeof window !== 'undefined' ? window : this);
