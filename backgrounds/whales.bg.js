/* =====================================================================
   whales.bg.js — "SKY WHALES", the CLOUD OCEAN (לווייתני השמיים):
   the scene looks out over an ocean of clouds. A gentle giant mama
   whale and her baby swim THROUGH the cloud banks (the near band's
   crests sweep across and occlude them — they truly swim IN the sea),
   spouting STARDUST, while a slow 140s light cycle rolls: rose-quartz
   dawn → cobalt day → THE GOLDEN CROSSING (mama rim-lit across a huge
   low sun — the boot frame) → nightfall, where the whales' skin
   dissolves and they become CONSTELLATION WHALES — star-outlines still
   swimming among real stars under a galaxy band.
   ---------------------------------------------------------------------
   STANDALONE background module (same workflow as maldives/dinosaurs2:
   developed against backgrounds/whales.html, ported to the theme menu
   on request). One self-contained IIFE: pure DOM/SVG/WAAPI, ES5,
   file:// safe, every class / keyframe / id namespaced sw*. Registers
       window.BACKGROUNDS.whales = { init({stage}) → cleanup }

   THE LIGHT CYCLE — one shared 140s clock (CYCLE_MS): every phase-
   dependent layer runs a 140000ms WAAPI anim in st.cycleAnims, so
   _test.seek(0..1) jumps the whole world. BOOT_F=0.56 (golden hour).
   POSTERS: .07 Rose Quartz Sunrise · .32 Blue Noon · .56 The Golden
   Crossing · .685 Half-Star Whale · .83 The Constellation Pod.

   THE SIGNATURE — the CONSTELLATION TRANSITION (f .66–.723): the skin
   fades to a 6% ghost while 12 star-dots ignite nose→tail and the
   connecting lines self-draw; the star-tail keeps beating (tail dots
   live INSIDE the fluke hinge). Zero transient anims — all pre-staggered
   opacity inside always-running clock anims riding the swim wrappers.

   Ambient: stardust spouts (baby echoes), a far pod crossing, breaches
   (arc + cloud puffs; star-variant at night), bird flocks, shooting
   stars, the baby's barrel-roll, a rare SKY PEARL to catch at night,
   and a narwhal cameo. Clicks: WHALE SONG call-and-response (rings +
   note glyphs; click mama → baby answers, click baby → mama answers
   deep and slow), and a cloud-sea toy (puff burst + a playful fluke
   slap rising out of the clouds).

   PERF: transform/opacity only, zero blur, fixed pools; 60 RUNNING
   animations steady (LITE 54) + 7 parked/paused bird flaps → 67 total
   via getAnimations(); worst transient peaks ≤ ~110.
   Clicks: svg root pointer-events:none + document-level GEOMETRIC
   hit-test (maldives cocoClick pattern) — survives the game's
   pointer-events:none #stars-layer. PORTING: ship a skin css + explicit
   skin:/aids: keys + body.theme-whales #stars-layer{display:block}.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NS = 'http://www.w3.org/2000/svg';
  var SCENE_W = 1280, SCENE_H = 800;
  var CYCLE_MS = 140000;
  var BOOT_F = 0.56;
  var LITE = false;
  try { LITE = ('ontouchstart' in w) || (w.navigator && w.navigator.maxTouchPoints > 0); } catch (e) {}

  var UIDN = 0;

  /* ── helpers ──────────────────────────────────────────────────────── */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function svgEl(name, attrs) {
    var n = doc.createElementNS(NS, name), k;
    for (k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function P(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }
  var CROSS = 'M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4 Z';

  /* ── CSS (injected once) ──────────────────────────────────────────── */
  function injectCSS() {
    if (doc.getElementById('swbg-style')) return;
    var css =
      '.swTB{transform-box:fill-box;transform-origin:center;}' +
      '.swSway{transform-box:fill-box;transform-origin:55% 50%;}' +
      '.swFlukeH{transform-box:fill-box;transform-origin:82% 52%;}' +
      '.swFinG{transform-box:fill-box;transform-origin:94% 9%;}' +
      '@keyframes swTw{0%,100%{opacity:.25}50%{opacity:1}}' +
      '@keyframes swEye{0%,100%{opacity:.6}50%{opacity:1}}' +
      '.swTwk{animation:swTw 3s ease-in-out infinite;}' +
      '.swEyeStar{animation:swEye 2.6s ease-in-out infinite;}';
    var st = doc.createElement('style');
    st.id = 'swbg-style';
    st.textContent = css;
    doc.head.appendChild(st);
  }

  /* ── defs (ids suffixed per instance) ─────────────────────────────── */
  function buildDefs(u) {
    function lin(id, x1, y1, x2, y2, stops, units) {
      var s = '<linearGradient id="' + id + u + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
        (units ? ' gradientUnits="userSpaceOnUse"' : '') + '>';
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
    var d = '<defs>';
    /* sky plates */
    d += lin('swSkyDayG', 0, 0, 0, 1, [[0, '#4DA3E8'], [.4, '#7EC4F2'], [.75, '#B5E3FA'], [1, '#E8F8FF']]);
    d += lin('swSkySunG', 0, 0, 0, 1, [[0, '#4A3B7C'], [.3, '#8A4E96'], [.55, '#F2795C'], [.75, '#FFA94D'], [.9, '#FFD166'], [1, '#FFE9A8']]);
    d += lin('swSkyNightG', 0, 0, 0, 1, [[0, '#060A24'], [.45, '#101838'], [.8, '#1C2A55'], [1, '#2E3F6E']]);
    d += lin('swSkyDawnG', 0, 0, 0, 1, [[0, '#7B6FA8'], [.35, '#C9A7D8'], [.62, '#F5B8C4'], [.85, '#FFD9C0'], [1, '#FFEFD9']]);
    /* sun / moon */
    d += rad('swSunCoreG', [[0, '#FFFDF4'], [.52, '#FFFDF4'], [1, '#FFE9A8']]);
    d += rad('swSunHaloG', [[0, '#FFC46E', .55], [1, '#FFC46E', 0]]);
    d += rad('swSunWarmG', [[0, '#FFD166'], [.6, '#FF9E4F'], [1, '#FF7A3C', .85]]);
    d += rad('swSunWarmHaloG', [[0, '#FF8C40', .5], [1, '#FF8C40', 0]]);
    d += rad('swMoonG', [[0, '#FFF9E8'], [1, '#F2E7C8']]);
    d += rad('swMoonHaloG', [[0, '#FFF7DE', .18], [1, '#FFF7DE', 0]]);
    /* clouds: 3 bands x 4 tints (vertical) */
    d += lin('swCFd', 0, 0, 0, 1, [[0, '#F4F9FF'], [1, '#D6E4F5']]);
    d += lin('swCFg', 0, 0, 0, 1, [[0, '#FFD9A0'], [1, '#E8A26B']]);
    d += lin('swCFn', 0, 0, 0, 1, [[0, '#8FA6E0'], [.5, '#34406E'], [1, '#232C52']]);
    d += lin('swCFw', 0, 0, 0, 1, [[0, '#F7C9DC'], [1, '#D9A8C9']]);
    d += lin('swCMd', 0, 0, 0, 1, [[0, '#FFFFFF'], [1, '#DCE8F6']]);
    d += lin('swCMg', 0, 0, 0, 1, [[0, '#FFE7B0'], [.5, '#FFB871'], [1, '#D4795F']]);
    d += lin('swCMn', 0, 0, 0, 1, [[0, '#93A9E2'], [.35, '#3D4A7E'], [.7, '#2A3560'], [1, '#1C2445']]);
    d += lin('swCMw', 0, 0, 0, 1, [[0, '#FFD3E0'], [.5, '#F5AFC9'], [1, '#D398BE']]);
    d += lin('swCNd', 0, 0, 0, 1, [[0, '#FFFFFF'], [.5, '#E2EBF7'], [1, '#C7D5E8']]);
    d += lin('swCNg', 0, 0, 0, 1, [[0, '#FFEFBE'], [.5, '#FFAE5E'], [1, '#B96A63']]);
    d += lin('swCNn', 0, 0, 0, 1, [[0, '#A7BCEB'], [.35, '#46548C'], [.7, '#2E3966'], [1, '#20294E']]);
    d += lin('swCNw', 0, 0, 0, 1, [[0, '#FFDCE7'], [.5, '#EFA9C4'], [1, '#C58FB8']]);
    /* whales (userSpaceOnUse over local y -30..34) */
    d += lin('swWhaleG', 0, -30, 0, 34, [[0, '#6E86B8'], [.4, '#93A9D4'], [.75, '#C9D9EE'], [1, '#E6EFFA']], true);
    d += lin('swWhaleBabyG', 0, -30, 0, 34, [[0, '#8A9BD0'], [.55, '#B7C6EA'], [1, '#F2E8F6']], true);
    d += lin('swWarmG', 0, -30, 0, 34, [[0, '#FFD9A0'], [.25, '#E08A5F'], [.6, '#7A4E58'], [1, '#4A3550']], true);
    /* stars / galaxy / fx */
    d += rad('swStarHaloG', [[0, '#C8E1FF', .9], [1, '#C8E1FF', 0]]);
    d += lin('swGalaxyG', 0, 0, 0, 1, [[0, '#7A8CFF', 0], [.35, '#96A8FF', .14], [.6, '#D6E2FF', .22], [1, '#7A8CFF', 0]]);
    d += rad('swNebAG', [[0, '#C4A6FF', .22], [1, '#C4A6FF', 0]]);
    d += rad('swNebBG', [[0, '#8CBEFF', .2], [1, '#8CBEFF', 0]]);
    d += lin('swRayG', 0, 0, 1, 0, [[0, '#FFD68C', .35], [1, '#FFD68C', 0]]);
    d += rad('swBloomG', [[0, '#FFBED6', .55], [1, '#FFBED6', 0]]);
    d += rad('swPuffG', [[0, '#FFFFFF', .9], [1, '#FFFFFF', 0]]);
    d += rad('swPuffGoldG', [[0, '#FFF1D6', .9], [1, '#FFF1D6', 0]]);
    d += rad('swPuffNightG', [[0, '#DCE9FA', .8], [1, '#DCE9FA', 0]]);
    d += rad('swGlowG', [[0, '#BFE3FF', .6], [1, '#BFE3FF', 0]]);
    d += rad('swPearlG', [[0, '#FFFFFF'], [.55, '#FFE9B8'], [1, '#D9A94E']]);
    d += rad('swPearlHaloG', [[0, '#FFE9B8', .45], [1, '#FFE9B8', 0]]);
    d += lin('swShootG', 0, 0, 1, 0, [[0, '#FFFFFF', 0], [1, '#FFFFFF', .95]]);
    d += rad('swShootHeadG', [[0, '#FFFFFF', .95], [1, '#FFFFFF', 0]]);
    d += '</defs>';
    return d;
  }

  /* ── whale rig markup (local space: x -100..96, y -45..45, faces RIGHT).
     Skin group + constellation star/line groups + fluke hinge (tail stars
     live INSIDE the hinge so the star-tail keeps beating). ───────────── */
  /* blunt round humpback-ish head (high forehead), light belly patch —
     reads WHALE, not fish; extents match the constellation anatomy */
  var BODY_D = 'M90,-2 Q92,6 86,13 Q78,20 62,25 Q34,31 4,32 Q-24,30 -44,22 Q-56,16 -62,8 L-62,-6 Q-54,-12 -42,-18 Q-20,-27 8,-28 Q44,-29 70,-22 Q86,-16 90,-2 Z';
  var BELLY_D = 'M86,13 Q78,20 62,25 Q34,31 4,32 Q-24,30 -44,22 Q-30,14 -6,12 Q30,10 66,6 Q80,8 86,13 Z';
  var FIN_D = 'M34,10 Q28,8 20,12 Q2,20 -10,34 Q-14,39 -12,41 Q4,38 20,28 Q32,20 36,15 Q37,12 34,10 Z';
  /* whale fluke: two lobes swept BACKWARD with a central notch (not a fish's
     vertical caudal fin) — hinge stays at (-62,1) */
  var FLUKE_D = 'M-58,-3 Q-66,-6 -74,-14 Q-82,-20 -92,-26 Q-88,-14 -82,-4 Q-79,0 -76,0 Q-79,2 -82,6 Q-88,16 -90,30 Q-80,26 -72,17 Q-65,9 -58,5 Q-54,1 -58,-3 Z';
  function starDot(x, y, big, u) {
    var hr = big ? 5 : 3.2, cr = big ? 2.2 : 1.3;
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<circle r="' + hr + '" fill="url(#swStarHaloG' + u + ')" opacity=".8"/>' +
      '<circle r="' + cr + '" fill="#FFFFFF"' + (big ? ' class="swEyeStar"' : '') + '/></g>';
  }
  function segLines(dPath) {
    return '<path d="' + dPath + '" fill="none" stroke="#BFD8FF" stroke-width="2.6" opacity=".25" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + dPath + '" fill="none" stroke="#BFD8FF" stroke-width="1.1" opacity=".85" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function whaleHtml(baby, u) {
    var bodyFill = baby ? 'swWhaleBabyG' : 'swWhaleG';
    var eye = baby
      ? '<circle cx="56" cy="1" r="5.6" fill="#17223A"/><circle cx="58" cy="-1" r="2.1" fill="rgba(255,255,255,.9)"/>'
      : '<circle cx="58" cy="2" r="4.4" fill="#17223A"/><circle cx="59.6" cy="0.4" r="1.6" fill="rgba(255,255,255,.9)"/>' +
        '<path d="M52.5,-3 Q58,-7 63.5,-3" fill="none" stroke="#2B3C60" stroke-width="1.4"/>';
    var blow = baby ? 'cx="30" cy="-26"' : 'cx="34" cy="-25"';
    var grooves =
      '<path d="M76,14 Q42,25 8,28" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M72,18 Q40,29 12,31" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="1.4" stroke-linecap="round"/>' +
      (baby ? '' : '<path d="M66,21 Q38,31 18,32" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="1.4" stroke-linecap="round"/>');
    return '' +
      '<g class="wh-skin">' +
        '<path d="' + BODY_D + '" fill="url(#' + bodyFill + u + ')"/>' +
        '<path d="' + BELLY_D + '" fill="' + (baby ? '#EDE4F8' : '#D8E6F7') + '" opacity=".85"/>' +
        (baby ? '' : '<path d="M-24,-26 Q-18,-34 -12,-33 Q-14,-28 -17,-24 Z" fill="#5F76A8"/>') +
        grooves +
        '<ellipse ' + blow + ' rx="2.6" ry="1.2" transform="rotate(-8 ' + (baby ? '30 -26' : '34 -25') + ')" fill="#3E547E"/>' +
        eye +
        '<path d="M84,8 Q66,17 46,15" fill="none" stroke="rgba(23,34,58,.55)" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="70" cy="10" r="5" fill="rgba(255,' + (baby ? '150,165,.35' : '160,170,.25') + ')"/>' +
        '<g class="wh-fin swFinG"><path d="' + FIN_D + '" fill="#8AA2CC"/>' +
          '<path d="M34,10 Q28,8 20,12" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/></g>' +
        '<path class="wh-tint" d="' + BODY_D + '" fill="url(#swWarmG' + u + ')" opacity="0" pointer-events="none"/>' +
      '</g>' +
      /* constellation anatomy: head / body / (tail inside the hinge) */
      '<g class="wh-stars-head" opacity="0">' +
        starDot(90, 2, false, u) + starDot(34, -25, false, u) + starDot(72, 20, false, u) + starDot(58, 2, true, u) +
      '</g>' +
      '<g class="wh-stars-body" opacity="0">' +
        starDot(-6, -26, false, u) + starDot(-58, -5, false, u) + starDot(2, 32, false, u) +
        starDot(-11, 39, false, u) + starDot(33, 12, false, u) +
      '</g>' +
      '<g class="wh-lines-a" opacity="0">' + segLines('M90,2 L34,-25 L-6,-26 L-58,-5') + '</g>' +
      '<g class="wh-lines-b" opacity="0">' + segLines('M-58,-5 L2,32 L72,20 L90,2 M33,12 L-11,39 M58,2 L72,20') + '</g>' +
      '<g class="wh-fluke-hinge swFlukeH">' +
        '<path class="wh-fluke" d="' + FLUKE_D + '" fill="#5F76A8"/>' +
        '<g class="wh-stars-tail" opacity="0">' +
          starDot(-90, -25, false, u) + starDot(-88, 28, false, u) + starDot(-62, 1, false, u) +
          segLines('M-62,1 L-90,-25 M-62,1 L-88,28') +
        '</g>' +
      '</g>' +
      '<rect class="sw-hit" x="-104" y="-49" width="206" height="98" fill="none"/>';
  }

  /* mini whale silhouette (far pod / breacher / narwhal base) */
  function miniWhale(fill) {
    return '<path d="M48,3 Q43,-7 30,-11 Q15,-15 0,-13 Q-17,-11 -25,-7 L-25,4 Q-17,10 0,13 Q20,16 36,10 Q45,7 48,3 Z ' +
      'M-24,-2 Q-33,-9 -37,-16 Q-38,-4 -39,4 Q-38,11 -35,15 Q-30,9 -24,4 Z" fill="' + fill + '"/>';
  }

  /* ── clock helpers ────────────────────────────────────────────────── */
  function mkClock(st, node, keyframes) {
    var a = node.animate(keyframes, { duration: CYCLE_MS, iterations: Infinity, easing: 'linear' });
    a.currentTime = BOOT_F * CYCLE_MS;
    st.cycleAnims.push(a); st.anims.push(a);
    return a;
  }
  function opClock(st, node, pairs) {
    var kf = [], j;
    for (j = 0; j < pairs.length; j++) kf.push({ opacity: pairs[j][1], offset: pairs[j][0], easing: 'ease-in-out' });
    kf[kf.length - 1].easing = undefined;
    return mkClock(st, node, kf);
  }
  function freeAnim(st, node, kf, opts) {
    var a = node.animate(kf, opts);
    st.anims.push(a);
    return a;
  }
  function oneShot(st, node, kf, opts) {
    if (node.__swA) { try { node.__swA.cancel(); } catch (e) {} }
    var a = node.animate(kf, opts);
    node.__swA = a;
    if (st.fx.indexOf(node) < 0) st.fx.push(node);
    return a;
  }

  /* seamless band silhouette: wavy crests + (near only) tall occluder
     mounds; identical halves ⇒ the -1280px drift loop wraps invisibly */
  function bandPath(crestLo, crestHi, mounds) {
    var pts = [], n = 9, i, y0 = (crestLo + crestHi) / 2;
    for (i = 0; i <= n; i++) {
      var x = i * (1280 / n);
      var y = (i === 0 || i === n) ? y0 : rnd(crestLo, crestHi);
      pts.push([x, y]);
    }
    if (mounds) { pts[2][1] = rnd(595, 605); pts[5][1] = rnd(595, 605); pts[7][1] = rnd(595, 605); }
    var d = 'M0,' + y0.toFixed(1);
    for (i = 1; i <= n; i++) {
      var px = (pts[i - 1][0] + pts[i][0]) / 2;
      d += ' Q' + P(px, pts[i - 1][1]) + ' ' + P(pts[i][0], pts[i][1]);
    }
    d += ' L1280,800 L0,800 Z';
    return d;
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
      songBusy: false, breachBusy: false, podBusy: false, flukeBusy: false,
      narwhalBusy: false, rollBusy: false, flockBusy: false,
      pearlActive: false, pearlLive: false, pearlMiss: 0, pearlRolled: false, pearlCaught: 0,
      songStamp: { mama: 0, baby: 0 }, toyLast: 0, toyPt: null, u: u
    };
    function arm(name, fn, ms) { st.slots[name] = setTimeout(fn, ms); }

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + SCENE_W + ' ' + SCENE_H,
      preserveAspectRatio: 'xMidYMax slice',
      style: 'position:absolute;inset:0;width:100%;height:100%;display:block;background:#101838;pointer-events:none'
    });
    stage.appendChild(svg);
    svg.innerHTML = buildDefs(u);
    function layer() { var g = svgEl('g', {}); svg.appendChild(g); return g; }

    /* ── z1-4 SKY PLATES ─────────────────────────────────────────────── */
    var sky = layer();
    sky.innerHTML =
      '<rect width="1280" height="800" fill="url(#swSkyDayG' + u + ')"/>' +
      '<rect class="swPSun" width="1280" height="800" fill="url(#swSkySunG' + u + ')"/>' +
      '<rect class="swPNight" width="1280" height="800" fill="url(#swSkyNightG' + u + ')"/>' +
      '<rect class="swPDawn" width="1280" height="800" fill="url(#swSkyDawnG' + u + ')"/>';
    opClock(st, sky.querySelector('.swPSun'), [[0, 0], [.42, 0], [.5, 1], [.76, 1], [.8, 0], [1, 0]]);
    opClock(st, sky.querySelector('.swPNight'), [[0, 1], [.05, 0], [.66, 0], [.74, 1], [1, 1]]);
    opClock(st, sky.querySelector('.swPDawn'), [[0, 1], [.13, 1], [.2, 0], [.95, 0], [1, 1]]);

    /* ── z5 STARS (90 dots + twinkle heroes, one group fade) ─────────── */
    var starsG = layer();
    var starHtml = '', si, starN = LITE ? 60 : 90, heroN = LITE ? 6 : 12;
    for (si = 0; si < starN; si++) {
      var scol = si % 9 === 0 ? '#FFE7C4' : si % 3 === 0 ? '#CDE0FF' : '#FFFFFF';
      var sr = si % 9 === 0 ? 2.2 : si % 3 === 0 ? 1.7 : 1.1;
      starHtml += '<circle cx="' + rnd(10, 1270).toFixed(0) + '" cy="' + rnd(15, 490).toFixed(0) + '" r="' + sr + '" fill="' + scol + '"/>';
    }
    for (si = 0; si < heroN; si++) {
      starHtml += '<g transform="translate(' + rnd(40, 1240).toFixed(0) + ',' + rnd(30, 420).toFixed(0) + ')">' +
        '<circle r="6" fill="rgba(205,224,255,.35)"/>' +
        '<circle class="swTwk" r="2.6" fill="#FFFFFF" style="animation-duration:' + rnd(2.6, 4.1).toFixed(1) + 's;animation-delay:-' + rnd(0, 4).toFixed(1) + 's"/></g>';
    }
    starsG.innerHTML = starHtml;
    opClock(st, starsG, [[0, .3], [.08, 0], [.44, 0], [.56, .12], [.66, .55], [.74, 1], [.92, 1], [1, .3]]);

    /* ── z6 GALAXY band ──────────────────────────────────────────────── */
    var gal = layer();
    var micro = '', mi2, microN = LITE ? 24 : 40;
    for (mi2 = 0; mi2 < microN; mi2++)
      micro += '<circle cx="' + rnd(-700, 700).toFixed(0) + '" cy="' + rnd(-160, 160).toFixed(0) + '" r=".7" fill="#FFFFFF" opacity=".6"/>';
    gal.innerHTML =
      '<g transform="translate(820,300) rotate(-18)">' +
      '<rect x="-800" y="-210" width="1600" height="420" fill="url(#swGalaxyG' + u + ')"/>' +
      '<ellipse cx="-180" cy="-40" rx="260" ry="120" fill="url(#swNebAG' + u + ')"/>' +
      '<ellipse cx="240" cy="60" rx="300" ry="140" fill="url(#swNebBG' + u + ')"/>' + micro + '</g>';
    mkClock(st, gal, [
      { opacity: 0, transform: 'translateX(0px)', offset: 0 },
      { opacity: 0, transform: 'translateX(0px)', offset: .72 },
      { opacity: .85, transform: 'translateX(12px)', offset: .8 },
      { opacity: .85, transform: 'translateX(30px)', offset: .9 },
      { opacity: 0, transform: 'translateX(36px)', offset: .96 },
      { opacity: 0, transform: 'translateX(0px)', offset: 1 }
    ]);

    /* ── z7 SHOOTING STAR pool (3) ───────────────────────────────────── */
    var shootL = layer();
    var shoots = [], sh2;
    for (sh2 = 0; sh2 < 3; sh2++) {
      var sw2 = svgEl('g', {});
      var sIn = svgEl('g', { opacity: 0 });
      sIn.innerHTML = '<rect x="-46" y="-1" width="46" height="2" fill="url(#swShootG' + u + ')"/>' +
        '<circle r="3" fill="url(#swShootHeadG' + u + ')"/>';
      sw2.appendChild(sIn); shootL.appendChild(sw2);
      shoots.push({ wrap: sw2, inner: sIn });
    }
    var shootIdx = 0;
    function fireShoot() {
      var s = shoots[shootIdx++ % 3];
      s.wrap.style.transform = 'translate(' + rnd(150, 1000).toFixed(0) + 'px,' + rnd(50, 300).toFixed(0) + 'px) rotate(-28deg)';
      oneShot(st, s.inner, [
        { transform: 'translateX(0px)', opacity: 0 },
        { transform: 'translateX(40px)', opacity: 1, offset: .15 },
        { transform: 'translateX(145px)', opacity: 1, offset: .55 },
        { transform: 'translateX(260px)', opacity: 0, offset: 1 }
      ], { duration: 900, easing: 'cubic-bezier(.2,.6,.4,1)' });
    }

    /* ── z8-11 SUN / MOON / RAYS / BLOOM ─────────────────────────────── */
    var sunG = layer();
    sunG.innerHTML =
      '<g class="swSunW"><circle r="170" fill="url(#swSunHaloG' + u + ')"/>' +
      '<circle r="55" fill="url(#swSunCoreG' + u + ')"/>' +
      '<g class="swSunWarm" opacity="0"><circle r="170" fill="url(#swSunWarmHaloG' + u + ')"/>' +
      '<circle r="55" fill="url(#swSunWarmG' + u + ')"/></g></g>';
    var sunW = sunG.querySelector('.swSunW');
    mkClock(st, sunW, [
      { transform: 'translate(185px,615px) scale(.95)', opacity: 0, offset: 0 },
      { transform: 'translate(200px,560px) scale(.97)', opacity: 1, offset: .02 },
      { transform: 'translate(250px,495px) scale(1)', opacity: 1, offset: .07 },
      { transform: 'translate(430px,265px) scale(.8)', opacity: 1, offset: .2 },
      { transform: 'translate(645px,155px) scale(.72)', opacity: 1, offset: .32 },
      { transform: 'translate(855px,275px) scale(.85)', opacity: 1, offset: .44 },
      { transform: 'translate(925px,405px) scale(1.35)', opacity: 1, offset: .5 },
      { transform: 'translate(950px,470px) scale(1.8)', opacity: 1, offset: .56 },
      { transform: 'translate(965px,540px) scale(1.95)', opacity: 1, offset: .64 },
      { transform: 'translate(970px,575px) scale(1.95)', opacity: 1, offset: .66 },
      { transform: 'translate(975px,610px) scale(1.95)', opacity: 0, offset: .7 },
      { transform: 'translate(975px,610px) scale(1.95)', opacity: 0, offset: .98 },
      { transform: 'translate(185px,615px) scale(.95)', opacity: 0, offset: 1 }
    ]);
    opClock(st, sunG.querySelector('.swSunWarm'), [[0, .9], [.1, .9], [.22, 0], [.42, 0], [.5, .95], [.7, .95], [.72, 0], [1, .9]]);
    /* crescent = bright disc + a "bite" disc in the night-sky tone (the moon
       only shows at night, so the fixed bite colour blends invisibly) */
    var moonG = layer();
    moonG.innerHTML = '<g class="swMoonW"><circle r="84" fill="url(#swMoonHaloG' + u + ')"/>' +
      '<g transform="rotate(-14)"><circle r="24" fill="url(#swMoonG' + u + ')"/>' +
      '<circle cx="10" cy="-5" r="20" fill="#141E44"/></g></g>';
    /* the fixed-colour crescent "bite" only blends once the night plate is
       OPAQUE (f .74) — so the moon stays invisible through twilight */
    mkClock(st, moonG.querySelector('.swMoonW'), [
      { transform: 'translate(1085px,640px)', opacity: 0, offset: 0 },
      { transform: 'translate(1085px,640px)', opacity: 0, offset: .66 },
      { transform: 'translate(1020px,470px)', opacity: 0, offset: .7 },
      { opacity: 0, offset: .74 },
      { opacity: 1, offset: .77 },
      { transform: 'translate(760px,165px)', opacity: 1, offset: .83 },
      { transform: 'translate(500px,250px)', opacity: 1, offset: .93 },
      { transform: 'translate(400px,355px)', opacity: 1, offset: .985 },
      { transform: 'translate(395px,365px)', opacity: 0, offset: .995 },
      { transform: 'translate(1085px,640px)', opacity: 0, offset: 1 }
    ]);
    var rays = layer();
    var rayHtml = '', rj, rayN = LITE ? 2 : 3;
    for (rj = 0; rj < rayN; rj++) {
      var ra = -32 - rj * 24;
      rayHtml += '<polygon points="950,470 ' + P(950 + 900 * Math.cos(ra * Math.PI / 180), 470 + 900 * Math.sin(ra * Math.PI / 180)) +
        ' ' + P(950 + 900 * Math.cos((ra - 9) * Math.PI / 180), 470 + 900 * Math.sin((ra - 9) * Math.PI / 180)) +
        '" fill="url(#swRayG' + u + ')"/>';
    }
    rays.innerHTML = rayHtml;
    opClock(st, rays, [[0, 0], [.44, 0], [.52, .7], [.63, .7], [.7, 0], [1, 0]]);
    var bloom = layer();
    bloom.innerHTML = '<ellipse cx="300" cy="520" rx="350" ry="130" fill="url(#swBloomG' + u + ')"/>';
    opClock(st, bloom, [[0, 1], [.13, 1], [.2, 0], [.95, 0], [1, 1]]);

    /* ── CLOUD BAND factory: drift group (2 identical halves), each half =
       base path + gold/night/dawn tint copies grouped ACROSS halves so one
       clock anim fades each tint ───────────────────────────────────────── */
    function buildBand(parent, crestLo, crestHi, mounds, prefix, driftMs) {
      var d = bandPath(crestLo, crestHi, mounds);
      var band = svgEl('g', {});
      var drift = svgEl('g', {});
      band.appendChild(drift); parent.appendChild(band);
      function pair(fillId) {
        return '<path d="' + d + '" fill="url(#' + fillId + u + ')"/>' +
          '<g transform="translate(1280,0)"><path d="' + d + '" fill="url(#' + fillId + u + ')"/></g>';
      }
      drift.innerHTML =
        '<g>' + pair(prefix + 'd') + '</g>' +
        '<g class="swTG">' + pair(prefix + 'g') + '</g>' +
        '<g class="swTN">' + pair(prefix + 'n') + '</g>' +
        '<g class="swTW">' + pair(prefix + 'w') + '</g>';
      freeAnim(st, drift, [
        { transform: 'translateX(0px)' }, { transform: 'translateX(-1280px)' }
      ], { duration: driftMs, iterations: Infinity, easing: 'linear' });
      opClock(st, drift.querySelector('.swTG'), [[0, 0], [.42, 0], [.5, 1], [.78, 1], [.82, 0], [1, 0]]);
      opClock(st, drift.querySelector('.swTN'), [[0, 1], [.05, 0], [.66, 0], [.76, 1], [1, 1]]);
      opClock(st, drift.querySelector('.swTW'), [[0, 1], [.13, 1], [.2, 0], [.95, 0], [1, 1]]);
      return band;
    }

    /* ── z12 FAR CLOUDS · z13 FAR ACTORS · z14 MID CLOUDS ────────────── */
    buildBand(layer(), 505, 545, false, 'swCF', 300000);
    var farActors = layer();
    buildBand(layer(), 575, 625, false, 'swCM', 190000);

    /* far pod (one pre-built trio) */
    var farPod = svgEl('g', { opacity: 0 });
    farPod.innerHTML =
      '<g class="fp-skin">' +
      '<g transform="translate(0,0)">' + miniWhale('#9FB8D6') + '</g>' +
      '<g transform="translate(-90,14) scale(.72)">' + miniWhale('#9FB8D6') + '</g>' +
      '<g transform="translate(-170,-10) scale(.55)">' + miniWhale('#9FB8D6') + '</g></g>' +
      '<g class="fp-stars" opacity="0"><g>' +
      '<path d="M48,3 L0,-13 L-25,-7 L-37,-16 M-25,4 L0,13 L36,10 L48,3" fill="none" stroke="#BFE3FF" stroke-width="1.5" stroke-dasharray="1 7"/>' +
      [[48, 3], [0, -13], [-25, -7], [0, 13], [-37, -16]].map(function (p2) {
        return '<circle cx="' + p2[0] + '" cy="' + p2[1] + '" r="2" fill="#BFE3FF"/>';
      }).join('') + '</g></g>';
    farActors.appendChild(farPod);
    st.podDir = 1;
    function firePod() {
      if (st.podBusy) return false;
      st.podBusy = true;
      var f = frac(), night2 = f > .72 && f < .985;
      farPod.querySelector('.fp-skin').setAttribute('opacity', night2 ? .25 : 1);
      farPod.querySelector('.fp-stars').setAttribute('opacity', night2 ? 1 : 0);
      farPod.querySelector('.fp-skin').querySelectorAll('path').forEach(function (p3) {
        if (!p3.getAttribute('stroke')) p3.setAttribute('fill', f > .42 && f < .72 ? '#7A5C8F' : '#9FB8D6');
      });
      var dir = st.podDir; st.podDir = -st.podDir;
      farPod.setAttribute('opacity', 1);
      var kf = [], steps = 40, k2;
      var yB = rnd(540, 565);
      for (k2 = 0; k2 <= steps; k2++) {
        var pc = k2 / steps;
        var xx = dir > 0 ? -280 + pc * 1840 : 1560 - pc * 1840;
        var yy = yB + Math.sin(pc * Math.PI * 3) * 8;
        var op = pc < .08 ? pc / .08 : pc > .92 ? (1 - pc) / .08 : 1;
        kf.push({ transform: 'translate(' + xx.toFixed(0) + 'px,' + yy.toFixed(1) + 'px)' + (dir < 0 ? ' scale(-1,1)' : ''), opacity: op * .9, offset: pc });
      }
      var a = oneShot(st, farPod, kf, { duration: rnd(26000, 34000), easing: 'linear' });
      a.onfinish = function () { farPod.setAttribute('opacity', 0); st.podBusy = false; };
    }

    /* breacher (pooled) */
    var breacher = svgEl('g', { opacity: 0 });
    breacher.innerHTML =
      '<g class="br-in"><g class="br-skin">' + miniWhale('#7E94C2') +
      '<g class="br-hinge swFlukeH" transform="translate(0,0)"></g></g>' +
      '<g class="br-stars" opacity="0">' +
      '<path d="M48,3 L0,-13 L-25,-7 M-25,4 L0,13 L48,3" fill="none" stroke="#BFE3FF" stroke-width="1.4" stroke-dasharray="1 6"/>' +
      '<circle cx="48" cy="3" r="2" fill="#fff"/><circle cx="0" cy="-13" r="2" fill="#fff"/>' +
      '<circle cx="-25" cy="-7" r="2" fill="#fff"/><circle cx="0" cy="13" r="2" fill="#fff"/></g></g>';
    farActors.appendChild(breacher);
    var brIn = breacher.querySelector('.br-in');
    function fireBreach() {
      if (st.breachBusy) return false;
      st.breachBusy = true;
      var f = frac(), star = f > .74 && f < .94;
      breacher.querySelector('.br-skin').setAttribute('opacity', star ? .2 : 1);
      breacher.querySelector('.br-stars').setAttribute('opacity', star ? 1 : 0);
      breacher.setAttribute('opacity', 1);
      var yW = rnd(580, 625), dir = Math.random() < .5 ? 1 : -1, x0 = rnd(240, 1000),
        s = rnd(.55, .8), trav = rnd(220, 320), hgt = rnd(120, 170), dur = rnd(3600, 4400);
      var kf = [], k3;
      for (k3 = 0; k3 <= 30; k3++) {
        var pc2 = k3 / 30;
        var xx2 = x0 + dir * pc2 * trav;
        var yy2 = yW - Math.sin(pc2 * Math.PI) * hgt;
        var ang = Math.atan2(-Math.cos(pc2 * Math.PI) * Math.PI * hgt, dir * trav) * 180 / Math.PI;
        kf.push({
          transform: 'translate(' + xx2.toFixed(1) + 'px,' + yy2.toFixed(1) + 'px) scale(' + s.toFixed(2) + ') rotate(' + ang.toFixed(1) + 'deg)' + (dir < 0 ? ' scale(1,-1)' : ''),
          opacity: (pc2 > .06 && pc2 < .94) ? 1 : 0, offset: pc2
        });
      }
      var a = oneShot(st, brIn, kf, { duration: dur, easing: 'linear' });
      firePuffs(x0, yW, 3, 40);
      firePuffs(x0 + dir * trav * .86, yW, 5, dur * .86);
      a.onfinish = function () { breacher.setAttribute('opacity', 0); st.breachBusy = false; };
    }

    /* narwhal cameo */
    var narwhal = svgEl('g', { opacity: 0 });
    narwhal.innerHTML =
      '<g class="nw-in">' + miniWhale('#C9BEE8') +
      '<polygon points="48,1 86,-9 50,6" fill="#E8B84B"/>' +
      '<line x1="52" y1="1.5" x2="80" y2="-6" stroke="#F6DFA0" stroke-width="1.2"/>' +
      '<circle cx="30" cy="-2" r="2.4" fill="#17223A"/></g>';
    farActors.appendChild(narwhal);
    var nwIn = narwhal.querySelector('.nw-in');
    function fireNarwhal() {
      if (st.narwhalBusy) return false;
      st.narwhalBusy = true;
      narwhal.setAttribute('opacity', 1);
      var dir = Math.random() < .5 ? 1 : -1, dur = rnd(11000, 14000), yB = 560;
      var kf = [], k4;
      for (k4 = 0; k4 <= 36; k4++) {
        var pc3 = k4 / 36;
        var xx3 = dir > 0 ? -160 + pc3 * 1600 : 1440 - pc3 * 1600;
        var hop = Math.sin(pc3 * Math.PI * 3);
        var yy3 = yB - (hop > 0 ? hop * 55 : hop * -24);
        var ang2 = -Math.cos(pc3 * Math.PI * 3) * 16 * dir;
        kf.push({
          transform: 'translate(' + xx3.toFixed(0) + 'px,' + yy3.toFixed(1) + 'px) scale(' + (dir < 0 ? '-1,1' : '1,1') + ') rotate(' + ang2.toFixed(1) + 'deg)',
          opacity: (pc3 > .06 && pc3 < .94) ? 1 : 0, offset: pc3
        });
      }
      var a = oneShot(st, nwIn, kf, { duration: dur, easing: 'linear' });
      var hj;
      for (hj = 0; hj < 3; hj++) {
        var hpc = (hj + .58) / 3;
        firePuffs(dir > 0 ? -160 + hpc * 1600 : 1440 - hpc * 1600, yB - 4, 2, dur * hpc);
      }
      a.onfinish = function () { narwhal.setAttribute('opacity', 0); st.narwhalBusy = false; };
    }

    /* bird flock */
    var flock = svgEl('g', { opacity: 0 });
    var FOFF = [[0, 0], [-26, -14], [-26, 14], [-52, -26], [-52, 26], [-78, -38], [-78, 38]];
    var fbh = '', fk;
    for (fk = 0; fk < (LITE ? 5 : 7); fk++)
      fbh += '<g transform="translate(' + FOFF[fk][0] + ',' + FOFF[fk][1] + ')">' +
        '<path class="sw-bird swTB" d="m0 0 q7 -6 14 0 q7 -6 14 0" fill="none" stroke="#5C7A99" stroke-width="2.5" stroke-linecap="round"/></g>';
    flock.innerHTML = fbh;
    farActors.appendChild(flock);
    /* persistent PAUSED flap anims (created once — creating them per crossing
       would grow st.anims unboundedly over a long session) */
    var flapAnims = [];
    flock.querySelectorAll('.sw-bird').forEach(function (b2, i2) {
      var fa = b2.animate([
        { transform: 'scaleY(1)' }, { transform: 'scaleY(.55)' }
      ], { duration: 480, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: i2 * 70 });
      fa.pause();
      st.anims.push(fa); flapAnims.push(fa);
    });
    function fireBirds() {
      if (st.flockBusy) return false;
      st.flockBusy = true;
      var f = frac(), col = (f > .42) ? '#66424E' : '#5C7A99';
      flock.querySelectorAll('.sw-bird').forEach(function (b3) { b3.setAttribute('stroke', col); });
      flapAnims.forEach(function (a2) { a2.play(); });
      flock.setAttribute('opacity', 1);
      var dir = Math.random() < .5 ? 1 : -1, baseY = rnd(120, 300);
      var kf = [], k5;
      for (k5 = 0; k5 <= 30; k5++) {
        var pc4 = k5 / 30;
        var xx4 = dir > 0 ? -180 + pc4 * 1640 : 1460 - pc4 * 1640;
        kf.push({
          transform: 'translate(' + xx4.toFixed(0) + 'px,' + (baseY + Math.sin(pc4 * Math.PI * 2.2) * 22).toFixed(1) + 'px)' + (dir < 0 ? ' scale(-1,1)' : ''),
          opacity: pc4 < .06 ? pc4 / .06 : pc4 > .94 ? (1 - pc4) / .06 : 1, offset: pc4
        });
      }
      var a = oneShot(st, flock, kf, { duration: rnd(16000, 20000), easing: 'linear' });
      a.onfinish = function () {
        flock.setAttribute('opacity', 0);
        flapAnims.forEach(function (a3) { try { a3.pause(); } catch (e) {} });
        st.flockBusy = false;
      };
    }

    /* ── z15 HERO POD (mama + baby) ──────────────────────────────────── */
    var heroPod = layer();
    /* mama */
    var mamaRoot = svgEl('g', { 'class': 'whale', transform: 'translate(640,618) scale(1.45)' });
    var mBob = svgEl('g', {}), mPulse = svgEl('g', { 'class': 'swTB' }), mSway = svgEl('g', { 'class': 'swSway' });
    mamaRoot.appendChild(mBob); mBob.appendChild(mPulse); mPulse.appendChild(mSway);
    var mGlow = svgEl('ellipse', { cx: 10, cy: 0, rx: 130, ry: 60, fill: 'url(#swGlowG' + u + ')', opacity: 0 });
    mSway.appendChild(mGlow);
    var mArt = svgEl('g', {});
    mArt.innerHTML = whaleHtml(false, u);
    mSway.appendChild(mArt);
    var mSpout = svgEl('g', { transform: 'translate(34,-25)' });
    mSway.appendChild(mSpout);
    heroPod.appendChild(mamaRoot);
    /* baby */
    var babyRoot = svgEl('g', { 'class': 'whale', transform: 'translate(435,592) scale(0.62)' });
    var bChase = svgEl('g', {}), bRoll = svgEl('g', { 'class': 'swTB' }), bBob = svgEl('g', {}), bPulse = svgEl('g', { 'class': 'swTB' }), bSway = svgEl('g', { 'class': 'swSway' });
    babyRoot.appendChild(bChase); bChase.appendChild(bRoll); bRoll.appendChild(bBob); bBob.appendChild(bPulse); bPulse.appendChild(bSway);
    var bGlow = svgEl('ellipse', { cx: 10, cy: 0, rx: 130, ry: 60, fill: 'url(#swGlowG' + u + ')', opacity: 0 });
    bSway.appendChild(bGlow);
    var bArt = svgEl('g', {});
    bArt.innerHTML = whaleHtml(true, u);
    bSway.appendChild(bArt);
    var bSpout = svgEl('g', { transform: 'translate(30,-26)' });
    bSway.appendChild(bSpout);
    heroPod.appendChild(babyRoot);

    /* patrol + gait (free-running; fluke at HALF the sway period) */
    freeAnim(st, heroPod, [
      { transform: 'translateX(-70px)' }, { transform: 'translateX(70px)' }, { transform: 'translateX(-70px)' }
    ], { duration: 47000, iterations: Infinity, easing: 'ease-in-out' });
    freeAnim(st, mBob, [
      { transform: 'translateY(0px)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0px)' }
    ], { duration: 9200, iterations: Infinity, easing: 'ease-in-out' });
    freeAnim(st, mSway, [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(2.6deg)', offset: .28 },
      { transform: 'rotate(0deg)', offset: .52 }, { transform: 'rotate(-2.2deg)', offset: .78 },
      { transform: 'rotate(0deg)', offset: 1 }
    ], { duration: 13000, iterations: Infinity, easing: 'ease-in-out' });
    var mFluke = mArt.querySelector('.wh-fluke-hinge');
    freeAnim(st, mFluke, [
      { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }
    ], { duration: 6500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', iterationStart: .25 });
    freeAnim(st, mArt.querySelector('.wh-fin'), [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(-6deg)', offset: .3 },
      { transform: 'rotate(0deg)', offset: .55 }, { transform: 'rotate(3deg)', offset: .8 },
      { transform: 'rotate(0deg)', offset: 1 }
    ], { duration: 8200, iterations: Infinity, easing: 'ease-in-out', iterationStart: .1 });
    freeAnim(st, bChase, [
      { transform: 'translateX(0px)' }, { transform: 'translateX(58px)' }, { transform: 'translateX(0px)' }
    ], { duration: 17000, iterations: Infinity, easing: 'ease-in-out', iterationStart: .3 });
    freeAnim(st, bBob, [
      { transform: 'translateY(0px)' }, { transform: 'translateY(-11px)' }, { transform: 'translateY(0px)' }
    ], { duration: 6600, iterations: Infinity, easing: 'ease-in-out', iterationStart: .37 });
    freeAnim(st, bSway, [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(3.4deg)', offset: .28 },
      { transform: 'rotate(0deg)', offset: .52 }, { transform: 'rotate(-3.4deg)', offset: .78 },
      { transform: 'rotate(0deg)', offset: 1 }
    ], { duration: 9400, iterations: Infinity, easing: 'ease-in-out', iterationStart: .61 });
    var bFluke = bArt.querySelector('.wh-fluke-hinge');
    freeAnim(st, bFluke, [
      { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }
    ], { duration: 4700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', iterationStart: .12 });
    freeAnim(st, bArt.querySelector('.wh-fin'), [
      { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(-8deg)', offset: .3 },
      { transform: 'rotate(0deg)', offset: .55 }, { transform: 'rotate(4deg)', offset: .8 },
      { transform: 'rotate(0deg)', offset: 1 }
    ], { duration: 5900, iterations: Infinity, easing: 'ease-in-out', iterationStart: .48 });

    /* whale LIGHT — skin/warm/dots/lines clock anims (the signature) */
    opClock(st, mArt.querySelector('.wh-skin'), [[0, 1], [.665, 1], [.695, .06], [.955, .06], [.985, 1], [1, 1]]);
    opClock(st, bArt.querySelector('.wh-skin'), [[0, 1], [.68, 1], [.71, .06], [.965, .06], [.995, 1], [1, 1]]);
    opClock(st, mArt.querySelector('.wh-tint'), [[0, .5], [.13, .5], [.2, 0], [.44, 0], [.52, .85], [.665, .85], [.695, 0], [.985, 0], [1, .5]]);
    opClock(st, bArt.querySelector('.wh-tint'), [[0, .5], [.13, .5], [.2, 0], [.44, 0], [.52, .85], [.68, .85], [.71, 0], [.995, 0], [1, .5]]);
    opClock(st, mArt.querySelector('.wh-stars-head'), [[0, 0], [.66, 0], [.674, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, mArt.querySelector('.wh-stars-body'), [[0, 0], [.668, 0], [.682, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, mArt.querySelector('.wh-stars-tail'), [[0, 0], [.676, 0], [.69, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, bArt.querySelector('.wh-stars-head'), [[0, 0], [.675, 0], [.689, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, bArt.querySelector('.wh-stars-body'), [[0, 0], [.683, 0], [.697, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, bArt.querySelector('.wh-stars-tail'), [[0, 0], [.691, 0], [.705, 1], [.94, 1], [.96, 0], [1, 0]]);
    opClock(st, mArt.querySelector('.wh-lines-a'), [[0, 0], [.688, 0], [.7, 1], [.93, 1], [.95, 0], [1, 0]]);
    opClock(st, mArt.querySelector('.wh-lines-b'), [[0, 0], [.696, 0], [.708, 1], [.93, 1], [.95, 0], [1, 0]]);
    opClock(st, bArt.querySelector('.wh-lines-a'), [[0, 0], [.703, 0], [.715, 1], [.93, 1], [.95, 0], [1, 0]]);
    opClock(st, bArt.querySelector('.wh-lines-b'), [[0, 0], [.711, 0], [.723, 1], [.93, 1], [.95, 0], [1, 0]]);

    /* ── z16 NEAR CLOUDS (occluder mounds sweep across the whales) ───── */
    buildBand(layer(), 655, 720, true, 'swCN', 120000);

    /* ── z17 FX (pools) ──────────────────────────────────────────────── */
    var fxL = layer();

    /* cloud puffs (shared pool) */
    var puffs = [], pj, puffN = 10;
    for (pj = 0; pj < puffN; pj++) {
      var pw = svgEl('g', {});
      var pIn = svgEl('ellipse', { rx: 14, ry: 10, fill: 'url(#swPuffG' + u + ')', opacity: 0, 'class': 'swTB' });
      pw.appendChild(pIn); fxL.appendChild(pw);
      puffs.push({ wrap: pw, inner: pIn });
    }
    var puffIdx = 0;
    function firePuffs(x, y, n, delay) {
      var f = frac();
      var grad = f > .72 ? 'swPuffNightG' : (f > .42 && f < .72) ? 'swPuffGoldG' : 'swPuffG';
      var j;
      for (j = 0; j < n; j++) {
        var p4 = puffs[puffIdx++ % puffN];
        p4.wrap.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        p4.inner.setAttribute('fill', 'url(#' + grad + u + ')');
        var ang3 = (-90 + (j - (n - 1) / 2) * 28 + rnd(-8, 8)) * Math.PI / 180;
        var d2 = rnd(40, 70);
        oneShot(st, p4.inner, [
          { transform: 'translate(0px,0px) scale(.4)', opacity: .9 },
          { transform: 'translate(' + (Math.cos(ang3) * d2 * .6).toFixed(1) + 'px,' + (Math.sin(ang3) * d2 * .6).toFixed(1) + 'px) scale(.85)', opacity: .9, offset: .3 },
          { transform: 'translate(' + (Math.cos(ang3) * d2).toFixed(1) + 'px,' + (Math.sin(ang3) * d2).toFixed(1) + 'px) scale(1.1)', opacity: 0, offset: 1 }
        ], { duration: 700, delay: (delay || 0) + j * 25, easing: 'cubic-bezier(.2,.7,.4,1)' });
      }
    }

    /* song rings + notes */
    var rings = [], notes = [], rk;
    for (rk = 0; rk < 8; rk++) {
      var rw = svgEl('g', {});
      var rIn = svgEl('circle', { r: 100, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.5, opacity: 0, 'class': 'swTB' });
      rw.appendChild(rIn); fxL.appendChild(rw);
      rings.push({ wrap: rw, inner: rIn });
    }
    var NOTE_GLYPHS = ['♪', '♫', '♩'];
    for (rk = 0; rk < 6; rk++) {
      var nw2 = svgEl('g', {});
      var nIn = svgEl('g', { opacity: 0 });
      var gph = NOTE_GLYPHS[rk % 3];
      nIn.innerHTML =
        '<text x="0" y="0" text-anchor="middle" font-size="30" fill="none" stroke="#BFE3FF" stroke-width="4" opacity=".35" style="font-family:Georgia,serif">' + gph + '</text>' +
        '<text x="0" y="0" text-anchor="middle" font-size="30" fill="#FFFFFF" style="font-family:Georgia,serif">' + gph + '</text>';
      nw2.appendChild(nIn); fxL.appendChild(nw2);
      notes.push({ wrap: nw2, inner: nIn });
    }
    var ringIdx = 0, noteIdx = 0;
    function ringColor() {
      var f = frac();
      return f < .13 ? '#FFE4F1' : f < .42 ? '#FFFFFF' : f < .72 ? '#FFE8B0' : '#BFE3FF';
    }
    function fireRings(x, y, n, endScale, dur, stagger, wide) {
      var col = ringColor(), night2 = frac() > .72, j;
      for (j = 0; j < n; j++) {
        var r5 = rings[ringIdx++ % 8];
        r5.wrap.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        r5.inner.setAttribute('stroke', col);
        r5.inner.setAttribute('stroke-width', wide ? 3 : 2.5);
        if (night2) r5.inner.setAttribute('stroke-dasharray', '3 6');
        else r5.inner.removeAttribute('stroke-dasharray');
        oneShot(st, r5.inner, [
          { transform: 'scale(.12)', opacity: 0 },
          { transform: 'scale(' + (endScale * .3).toFixed(2) + ')', opacity: .9, offset: .12 },
          { transform: 'scale(' + endScale.toFixed(2) + ')', opacity: 0, offset: 1 }
        ], { duration: dur, delay: j * stagger, easing: 'cubic-bezier(.16,.66,.35,1)' });
      }
    }
    function fireNotes(x, y, n, rise, dur, stagger, size) {
      var j;
      for (j = 0; j < n; j++) {
        var n5 = notes[noteIdx++ % 6];
        n5.wrap.style.transform = 'translate(' + (x + rnd(-14, 14)).toFixed(1) + 'px,' + (y - 8).toFixed(1) + 'px)';
        n5.inner.querySelectorAll('text').forEach(function (t2) { t2.setAttribute('font-size', size || 30); });
        var kf = [], seg;
        for (seg = 0; seg <= 8; seg++) {
          var pc5 = seg / 8;
          kf.push({
            transform: 'translate(' + (Math.sin(pc5 * Math.PI * 2.2) * 14).toFixed(1) + 'px,' + (-rise * pc5).toFixed(1) + 'px) rotate(' + (Math.sin(pc5 * Math.PI * 2) * 12).toFixed(1) + 'deg)',
            opacity: pc5 < .12 ? pc5 / .12 : pc5 > .7 ? (1 - pc5) / .3 : 1, offset: pc5
          });
        }
        oneShot(st, n5.inner, kf, { duration: dur, delay: j * stagger, easing: 'ease-out' });
      }
    }

    /* fluke slap (pooled, clipped so it rises OUT of the cloud line) */
    var flukeW = svgEl('g', {});
    flukeW.innerHTML =
      '<clipPath id="swFlkClip' + u + '"><rect x="-70" y="-130" width="140" height="130"/></clipPath>' +
      '<g clip-path="url(#swFlkClip' + u + ')"><g class="flk-in swTB" opacity="0">' +
      '<path d="M0,66 Q-6,26 -8,4 Q-24,-8 -34,-30 Q-36,-38 -33,-42 Q-20,-30 -8,-24 Q-2,-22 4,-24 Q18,-32 30,-44 Q34,-40 32,-32 Q24,-10 8,4 Q6,28 6,66 Z" fill="#6E86B8"/>' +
      '<path d="M-8,4 Q-2,0 4,-24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/></g></g>';
    fxL.appendChild(flukeW);
    var flukeIn = flukeW.querySelector('.flk-in');
    function fireFluke(x, y) {
      if (st.flukeBusy) return;
      st.flukeBusy = true;
      var by = Math.max(y, 665);
      flukeW.style.transform = 'translate(' + x.toFixed(1) + 'px,' + by.toFixed(1) + 'px)';
      var a = oneShot(st, flukeIn, [
        { transform: 'translateY(70px) rotate(0deg)', opacity: 1, offset: 0 },
        { transform: 'translateY(-14px) rotate(-8deg)', opacity: 1, offset: .28 },
        { transform: 'translateY(-6px) rotate(6deg)', opacity: 1, offset: .4 },
        { transform: 'translateY(-10px) rotate(-4deg)', opacity: 1, offset: .5 },
        { transform: 'translateY(2px) rotate(3deg)', opacity: 1, offset: .62 },
        { transform: 'translateY(74px) rotate(0deg)', opacity: 1, offset: 1 }
      ], { duration: 1300, easing: 'linear' });
      arm('flukeFx', function () {
        if (st.cancelled) return;
        firePuffs(x, by - 46, 3, 0);
        fireRings(x, by - 46, 1, .6, 900, 0, false);
      }, 650);
      a.onfinish = function () { st.flukeBusy = false; };
    }

    /* stardust motes (parked inside the whales' sway groups) */
    function buildMotes(parent, n, big) {
      var arr = [], j;
      for (j = 0; j < n; j++) {
        var mg = svgEl('g', { opacity: 0, 'class': 'swTB' });
        mg.innerHTML = '<path d="' + CROSS + '" transform="scale(' + (big && j % 4 === 0 ? 1.5 : 1) + ')" fill="#FFF6C9"/>';
        parent.appendChild(mg); arr.push(mg);
      }
      return arr;
    }
    var mMotes = buildMotes(mSpout, LITE ? 10 : 14, true);
    var bMotes = buildMotes(bSpout, 5, false);
    function moteColor(gold) {
      if (gold) return '#FFD98A';
      var f = frac();
      return f < .13 ? '#FFD9EA' : f < .42 ? '#FFF6C9' : f < .72 ? '#FFD98A' : '#BFE9FF';
    }
    function fireSpout(motes, count, scaleH, gold) {
      var col = moteColor(gold), j;
      for (j = 0; j < count; j++) {
        var m6 = motes[j % motes.length];
        m6.firstChild.setAttribute('fill', col);
        var H = rnd(90, 130) * scaleH;
        var fan = ((j / (count - 1)) - .5) * 52 + rnd(-4, 4);
        var dx = Math.sin(fan * Math.PI / 180) * H;
        var rot = rnd(-120, 120);
        oneShot(st, m6, [
          { transform: 'translate(0px,0px) scale(1) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + (dx * .45).toFixed(1) + 'px,' + (-H * .6).toFixed(1) + 'px) scale(.9) rotate(' + (rot * .45).toFixed(0) + 'deg)', opacity: 1, offset: .45 },
          { transform: 'translate(' + (dx + Math.sin(j) * 5).toFixed(1) + 'px,' + (-H).toFixed(1) + 'px) scale(.55) rotate(' + rot.toFixed(0) + 'deg)', opacity: 0, offset: 1 }
        ], { duration: rnd(1700, 2300) * (scaleH < 1 ? .85 : 1), delay: j * 50, easing: 'cubic-bezier(.2,.7,.4,1)' });
      }
    }
    function fireMamaSpout(gold) {
      fireSpout(mMotes, LITE ? 6 : 10, 1, gold);
      if (!LITE && !gold && Math.random() < .3)
        arm('spoutEcho', function () { if (!st.cancelled) fireSpout(bMotes, 5, .6, false); }, 1200);
    }

    /* twinkle pool (night garnish) */
    var twk = [], tk;
    for (tk = 0; tk < 6; tk++) {
      var tg = svgEl('g', { opacity: 0, 'class': 'swTB' });
      tg.innerHTML = '<path d="' + CROSS + '" fill="#CFE6FF"/>';
      fxL.appendChild(tg); twk.push(tg);
    }
    function fireTwinkles(x, y, n, delay) {
      /* placement is baked into the keyframes — a transform ATTRIBUTE would be
         wiped by the WAAPI transform animation (the house gotcha) */
      var j;
      for (j = 0; j < n; j++) {
        var t3 = twk[j % 6];
        var pos = 'translate(' + (x + rnd(-30, 30)).toFixed(1) + 'px,' + (y + rnd(-20, 20)).toFixed(1) + 'px) ';
        oneShot(st, t3, [
          { opacity: 0, transform: pos + 'scale(.6)' },
          { opacity: 1, transform: pos + 'scale(1)', offset: .5 },
          { opacity: 0, transform: pos + 'scale(.7)' }
        ], { duration: 700, delay: (delay || 0) + j * 120, easing: 'ease-in-out' });
      }
    }

    /* SKY PEARL (the rare night catchable) */
    var pearlW = svgEl('g', {});
    var pearlIn = svgEl('g', { opacity: 0 });
    pearlIn.innerHTML =
      '<circle class="pr-halo" r="22" fill="url(#swPearlHaloG' + u + ')"/>' +
      '<rect x="-1" y="-13" width="2" height="26" fill="#FFFFFF" opacity=".8"/>' +
      '<rect x="-13" y="-1" width="26" height="2" fill="#FFFFFF" opacity=".8"/>' +
      '<circle r="6" fill="url(#swPearlG' + u + ')"/>' +
      '<rect class="sw-hit sw-pearl-hit" x="-28" y="-28" width="56" height="56" fill="none"/>';
    pearlW.appendChild(pearlIn); fxL.appendChild(pearlW);
    var sparks = [], sk2;
    for (sk2 = 0; sk2 < 12; sk2++) {
      var sg2 = svgEl('g', { opacity: 0, 'class': 'swTB' });
      sg2.innerHTML = '<path d="' + CROSS + '" fill="#FFE28A"/>';
      fxL.appendChild(sg2); sparks.push(sg2);
    }
    function whaleAnchor(which, lx, ly) {
      var el = which === 'baby' ? bSway : mSway;
      var m = el.getCTM();
      if (!m) return [640, 620];
      return [m.a * lx + m.c * ly + m.e, m.b * lx + m.d * ly + m.f];
    }
    function firePearl() {
      if (st.pearlActive) return false;
      st.pearlActive = true;
      st.pearlLive = false;      // clickable only once it has actually risen
      st.pearlMiss = 0;
      fireMamaSpout(true);   // the golden tell
      arm('pearlRise', function () {
        if (st.cancelled || !st.pearlActive) { st.pearlActive = false; return; }
        var an = whaleAnchor('mama', 34, -25);
        pearlW.style.transform = 'translate(' + an[0].toFixed(1) + 'px,' + an[1].toFixed(1) + 'px)';
        st.pearlPos = [an[0], an[1] - 232];
        st.pearlLive = true;
        var kf = [], seg;
        for (seg = 0; seg <= 24; seg++) {
          var pc6 = seg / 24;
          kf.push({
            transform: 'translate(' + (Math.sin(pc6 * Math.PI * 3) * 26 * pc6).toFixed(1) + 'px,' + (-230 * pc6).toFixed(1) + 'px) scale(' + (.7 + .3 * pc6).toFixed(2) + ')',
            opacity: pc6 < .1 ? pc6 / .1 : 1, offset: pc6
          });
        }
        var a = oneShot(st, pearlIn, kf, { duration: 4200, easing: 'ease-out', fill: 'forwards' });
        a.onfinish = function () {
          if (st.cancelled || !st.pearlActive) return;
          var hov = oneShot(st, pearlIn, [
            { transform: 'translate(0px,-230px) scale(1)', opacity: 1 },
            { transform: 'translate(0px,-236px) scale(1)', opacity: 1 }
          ], { duration: 1000, iterations: 6, direction: 'alternate', easing: 'ease-in-out', fill: 'forwards' });
          hov.onfinish = function () {
            if (st.cancelled || !st.pearlActive) return;
            var down = oneShot(st, pearlIn, [
              { transform: 'translate(0px,-232px) scale(1)', opacity: 1 },
              { transform: 'translate(6px,-140px) scale(.8)', opacity: 0 }
            ], { duration: 2600, easing: 'ease-in' });
            down.onfinish = function () { st.pearlActive = false; st.pearlLive = false; };
          };
        };
      }, 600);
    }
    function catchPearl() {
      if (!st.pearlActive || !st.pearlLive) return;
      st.pearlActive = false;
      st.pearlLive = false;
      clearTimeout(st.slots.pearlRise);
      st.pearlCaught++;
      var pos = st.pearlPos || [640, 400];
      oneShot(st, pearlIn, [
        { transform: 'translate(0px,-232px) scale(1)', opacity: 1 },
        { transform: 'translate(0px,-240px) scale(1.5)', opacity: 0 }
      ], { duration: 450, easing: 'ease-out' });
      var j;
      for (j = 0; j < 12; j++) {
        var sp = sparks[j];
        /* placement baked into the keyframes (transform attr would be wiped) */
        var ang4 = j * 30 * Math.PI / 180, d3 = rnd(55, 85);
        oneShot(st, sp, [
          { transform: 'translate(' + pos[0].toFixed(1) + 'px,' + pos[1].toFixed(1) + 'px) scale(1)', opacity: 1 },
          { transform: 'translate(' + (pos[0] + Math.cos(ang4) * d3).toFixed(1) + 'px,' + (pos[1] + Math.sin(ang4) * d3).toFixed(1) + 'px) scale(.3)', opacity: 0 }
        ], { duration: 900, delay: j * 30, easing: 'ease-out' });
      }
      fireRings(pos[0], pos[1], 1, 1.7, 1600, 0, true);
      /* constellation flourish — both whales' stars breathe */
      [mArt, bArt].forEach(function (art) {
        ['.wh-stars-head', '.wh-stars-body'].forEach(function (sel) {
          oneShot(st, art.querySelector(sel), [
            { opacity: .8 }, { opacity: 1, offset: .5 }, { opacity: .8 }
          ], { duration: 2000, easing: 'ease-in-out' });
        });
      });
    }

    /* ── WHALE SONG (call-and-response) ──────────────────────────────── */
    function songVoice(which, big) {
      var an = whaleAnchor(which, which === 'baby' ? 30 : 34, which === 'baby' ? -26 : -25);
      if (which === 'mama') {
        if (big) { fireRings(an[0], an[1], 3, 2.0, 2600, 400, true); fireNotes(an[0], an[1], 2, 100, 2800, 350, 36); }
        else { fireRings(an[0], an[1], 3, 1.7, 1800, 260, false); fireNotes(an[0], an[1], 3, 120, 2200, 300, 30); }
        oneShot(st, mGlow, [{ opacity: 0 }, { opacity: .5, offset: .4 }, { opacity: 0 }], { duration: 1200, easing: 'ease-in-out' });
        oneShot(st, mPulse, [
          { transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: .5 }, { transform: 'scale(1)' }
        ], { duration: big ? 1200 : 900, easing: 'ease-in-out' });
        if (frac() > .72) oneShot(st, mArt.querySelector('.wh-stars-body'), [
          { opacity: .75 }, { opacity: 1, offset: .5 }, { opacity: .75 }
        ], { duration: 1000, iterations: 2, easing: 'ease-in-out' });
      } else {
        fireRings(an[0], an[1], 2, .95, big ? 1400 : 1200, big ? 220 : 200, false);
        fireNotes(an[0], an[1], 2, big ? 80 : 90, big ? 1800 : 1400, 250, 20);
        oneShot(st, bGlow, [{ opacity: 0 }, { opacity: .5, offset: .4 }, { opacity: 0 }], { duration: 1000, easing: 'ease-in-out' });
        if (!st.rollBusy) oneShot(st, bRoll, [
          { transform: 'rotate(0deg)', offset: 0 }, { transform: 'rotate(-4deg)', offset: .3 },
          { transform: 'rotate(3deg)', offset: .65 }, { transform: 'rotate(0deg)', offset: 1 }
        ], { duration: 800, easing: 'ease-in-out' });
      }
    }
    function fireSong(which) {
      var now = Date.now();
      if (st.songBusy || now - st.songStamp[which] < 4000) return;
      st.songStamp[which] = now;
      st.songBusy = true;
      if (which === 'mama') {
        songVoice('mama', false);
        arm('answer', function () { if (!st.cancelled) songVoice('baby', true); }, 900);
        arm('songEnd', function () { st.songBusy = false; }, 3400);
      } else {
        songVoice('baby', false);
        arm('answer', function () { if (!st.cancelled) songVoice('mama', true); }, 900);
        arm('songEnd', function () { st.songBusy = false; }, 3800);
      }
    }

    /* baby barrel roll */
    function fireRoll() {
      if (st.rollBusy || st.songBusy) return false;
      st.rollBusy = true;
      var a = oneShot(st, bRoll, [
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: 'rotate(-8deg)', offset: .12 },
        { transform: 'rotate(352deg)', offset: .88 },
        { transform: 'rotate(360deg)', offset: 1 }
      ], { duration: 1600, easing: 'cubic-bezier(.45,.05,.35,1)' });
      arm('rollFx', function () {
        if (st.cancelled) return;
        fireSpout(bMotes, 4, .6, false);
        if (frac() > .72) {
          var an = whaleAnchor('baby', 0, 0);
          fireTwinkles(an[0], an[1], 3, 0);
        }
      }, 700);
      a.onfinish = function () { st.rollBusy = false; };
    }

    /* ── clicks: pearl → mama → baby → cloud-sea toy ─────────────────── */
    function toScene(cx, cy) {
      var r = svg.getBoundingClientRect();
      var s = Math.max(r.width / SCENE_W, r.height / SCENE_H);
      return [(cx - r.left - (r.width - SCENE_W * s) / 2) / s,
              (cy - r.top - (r.height - SCENE_H * s)) / s];
    }
    function padHit(node, cx, cy, pad) {
      var r = node.getBoundingClientRect();
      return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
    }
    var mHit = mArt.querySelector('.sw-hit'), bHit = bArt.querySelector('.sw-hit');
    var pearlHit = pearlIn.querySelector('.sw-pearl-hit');
    /* bail on real game UI (maldives-aligned list), and additionally ALLOWLIST
       the click target: only html/body/#bg or our own stage — this also blocks
       the game's id-less celebration overlays (their backdrop div is the
       target, not body) and the clickable #particles, without naming them. */
    var UI_BAIL = '.wrap,button,input,select,textarea,a,#particles,.special-uni,#games-menu,#theme-menu,#game-numpad,#sad-ov,#report-ov,#settings-ov,#parent-ov';
    st.clickFn = function (e) {
      var t = e.target;
      if (t && t.closest) { try { if (t.closest(UI_BAIL)) return; } catch (err) {} }
      if (!(t === doc.body || t === doc.documentElement || stage.contains(t) ||
            (t && t.id === 'bg') || (t && t.id === 'stars-layer'))) return;
      var cx = e.clientX, cy = e.clientY;
      if (st.pearlActive && st.pearlLive && padHit(pearlHit, cx, cy, 10)) { catchPearl(); return; }
      if (padHit(mHit, cx, cy, 20)) { fireSong('mama'); return; }
      if (padHit(bHit, cx, cy, 24)) { fireSong('baby'); return; }
      var pt = toScene(cx, cy);
      if (pt[1] > 600 && pt[0] >= 0 && pt[0] <= 1280) {
        var now = Date.now();
        if (now - st.toyLast < 1200) return;
        st.toyLast = now;
        firePuffs(pt[0], pt[1], LITE ? 3 : 5, 0);
        var near = st.toyPt && Math.abs(st.toyPt[0] - pt[0]) < 140 && (now - st.toyPt[2]) < 5000;
        if (!near && Math.random() < (LITE ? .5 : .7)) fireFluke(pt[0], pt[1]);
        st.toyPt = [pt[0], pt[1], now];
      }
    };
    doc.addEventListener('click', st.clickFn, true);

    /* ── schedulers (single-slot, phase-gated) ───────────────────────── */
    function frac() {
      var t = Number(st.cycleAnims[0].currentTime) || 0;
      return (t % CYCLE_MS) / CYCLE_MS;
    }
    function inWin(f, a, b) { return f >= a && f <= b; }
    function schedSpout() {
      if (st.cancelled) return;
      fireMamaSpout(false);
      arm('spout', schedSpout, LITE ? rnd(14000, 22000) : rnd(9000, 15000));
    }
    arm('spout', schedSpout, rnd(4000, 8000));
    function schedPod() {
      if (st.cancelled) return;
      firePod();
      arm('pod', schedPod, rnd(45000, 80000));
    }
    arm('pod', schedPod, rnd(15000, 30000));
    function schedBreach() {
      if (st.cancelled) return;
      var f = frac();
      if (inWin(f, .08, .66)) { fireBreach(); arm('breach', schedBreach, LITE ? rnd(50000, 80000) : rnd(33000, 55000)); }
      else if (inWin(f, .75, .93)) { fireBreach(); arm('breach', schedBreach, rnd(60000, 90000)); }
      else arm('breach', schedBreach, rnd(3000, 6000));
    }
    arm('breach', schedBreach, rnd(12000, 22000));
    function schedBirds() {
      if (st.cancelled) return;
      var f = frac();
      if (inWin(f, .06, .55)) fireBirds();
      arm('birds', schedBirds, rnd(24000, 44000));
    }
    arm('birds', schedBirds, rnd(8000, 16000));
    function schedShoot() {
      if (st.cancelled) return;
      var f = frac();
      if (inWin(f, .74, .945)) {
        fireShoot();
        if (!LITE && Math.random() < .3) arm('shoot2', fireShoot, 350);
        arm('shoot', schedShoot, rnd(6000, 14000));
      } else arm('shoot', schedShoot, rnd(3000, 7000));
    }
    arm('shoot', schedShoot, rnd(3000, 7000));
    function schedRoll() {
      if (st.cancelled) return;
      fireRoll();
      arm('roll', schedRoll, rnd(20000, 36000));
    }
    arm('roll', schedRoll, rnd(9000, 15000));
    function schedNarwhal() {
      if (st.cancelled) return;
      var f = frac();
      if (!inWin(f, .66, .74)) fireNarwhal();
      arm('narwhal', schedNarwhal, rnd(180000, 300000));
    }
    arm('narwhal', schedNarwhal, rnd(90000, 150000));
    function schedPearl() {
      if (st.cancelled) return;
      var f = frac(), night2 = inWin(f, .74, .93);
      if (night2 && !st.pearlRolled) {
        st.pearlRolled = true;
        if (Math.random() < .22 || st.pearlMiss >= 3) firePearl();
        else st.pearlMiss++;
      } else if (!night2 && st.pearlRolled && !inWin(f, .72, .985)) st.pearlRolled = false;
      arm('pearl', schedPearl, 3000);
    }
    arm('pearl', schedPearl, 3000);

    /* ── verification hooks ──────────────────────────────────────────── */
    w.BACKGROUNDS.whales._test = {
      seek: function (f) {
        var j3;
        for (j3 = 0; j3 < st.cycleAnims.length; j3++) st.cycleAnims[j3].currentTime = f * CYCLE_MS;
      },
      cycleMs: CYCLE_MS,
      song: fireSong,
      spout: function () { fireMamaSpout(false); },
      breach: fireBreach,
      pod: firePod,
      birds: fireBirds,
      star: fireShoot,
      roll: fireRoll,
      narwhal: fireNarwhal,
      pearl: firePearl,
      toy: function (x, y) { st.toyLast = 0; firePuffs(x, y, 5, 0); fireFluke(x, y); },
      frac: frac,
      busy: function () {
        return { song: st.songBusy, breach: st.breachBusy, pod: st.podBusy, fluke: st.flukeBusy, narwhal: st.narwhalBusy, roll: st.rollBusy, pearl: st.pearlActive, caught: st.pearlCaught };
      },
      counts: function () {
        return { anims: doc.getAnimations ? doc.getAnimations().length : -1, lite: LITE, cycleAnims: st.cycleAnims.length };
      },
      state: st
    };

    return function cleanup() {
      st.cancelled = true;
      st.timers.forEach(clearTimeout);
      var sk3; for (sk3 in st.slots) if (st.slots.hasOwnProperty(sk3)) clearTimeout(st.slots[sk3]);
      st.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      st.fx.forEach(function (n) { if (n.__swA) { try { n.__swA.cancel(); } catch (e) {} n.__swA = null; } });
      doc.removeEventListener('click', st.clickFn, true);
      delete w.BACKGROUNDS.whales._test;
      stage.style.overflow = prevOverflow;
      stage.style.direction = prevDir;
      stage.innerHTML = '';
    };
  }

  w.BACKGROUNDS = w.BACKGROUNDS || {};
  w.BACKGROUNDS.whales = { init: init };
})(typeof window !== 'undefined' ? window : this);
