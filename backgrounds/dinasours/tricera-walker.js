/* =====================================================================
   tricera-walker.js  —  reusable walking cute triceratops "trixie"
   ---------------------------------------------------------------------
   A self-contained MOVING dinosaur, built in the same spirit as the
   chibi character (backgrounds/rumi/chibi-walker.js): the art (SVG) and
   ALL of its behaviour live ONCE, here. Backgrounds never copy the art;
   they just load this script and call the API, and the dino brings every
   animation with it.

   The figure is a "cute-ified" version of the original triceratops
   silhouette (backgrounds/dinasours/tritsratop.html): the SAME body
   outline, recoloured friendly-green with a soft outline, a big blinking
   eye + blush + smile, frill spots, and the 4 legs split out as their own
   shapes so they STEP in a diagonal walk cycle.

   Design twin / preview + art documentation:  tritsratop.html holds the
   SAME figure (on a plain page) with a doc comment explaining its
   anatomy, coordinates and animation. Minimal "walk across" demo:
   tricera-demo.html . If you edit the art in one file, mirror it here.

       <script src="path/to/tricera-walker.js"></script>

   ---- API -------------------------------------------------------------
   One crossing (enters off one edge, walks across, exits the other edge):
       TriceraWalker.walk(containerEl, {
         direction: 'ltr',     // 'ltr' (enter left -> exit right) or 'rtl'
         duration : 13000,     // ms to cross the whole screen
         height   : '30%',     // dino height (any CSS length, vs container)
         bottom   : '6%',      // vertical position of the feet (CSS length)
         bob      : 6,         // px of vertical bounce while walking
         zIndex   : 6,
         faceWalkDir: true,    // mirror so the dino faces the way it walks
         onDone   : fn         // called after it exits (element auto-removed)
       });
       // -> returns { element, animation, stop() }

   Continuous patrol (keeps crossing back and forth with random gaps):
       const p = TriceraWalker.patrol(containerEl, {
         height:'30%', bottom:'6%', duration:13000,
         gapMin: 120000, gapMax: 240000,   // gap between crossings (ms)
         alternate: true,                  // flip direction each crossing
         startDelay: 0                     // ms before the FIRST appearance
       });                                 // (game bgs use 60000-180000 = 1-3 min)
       // -> returns { stop() }   // call p.stop() to remove & cancel

   Fire a specific action on the live instance(s) — mainly for testing:
       TriceraWalker.trigger('hop' | 'stomp' | 'shake' | 'hearts' | 'random')

   ---- BEHAVIOUR (all automatic, all at this module level) --------------
   • Walk    — 4 legs step in a diagonal gait (CSS), with a vertical bob +
               ground shadow. The dino faces the way it travels.
   • Shadow  — a soft ground ellipse under the feet; sits on the wrapper so
               it stays grounded while the dino hops.
   • Blink   — the big eye squashes shut briefly every few seconds (CSS).
   • Hearts  — little hearts rise above its back + fade; fired on a random
               per-instance timer (~6-15s) AND on every click.
   • Click   — clicking the dino pops hearts + ONE random action:
                  45% happy HOP       (hops; shadow stays grounded)
                  35% STOMP           (a quick squash + a dust puff at the feet)
                  20% head SHAKE      (a quick excited wiggle)
               Detected via a document capture-phase listener that hit-tests
               its live bounding box (robust even while it animates) and stops
               the click from reaching the scene behind it.

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .trike-walker (wrapper, WAAPI translateX walk)
                        └ .trike-shadow (grounded)
                        └ .trike-act    (hop/shake transforms)  └ svg.trike-svg (flip)
   - All CSS (leg/blink keyframes, shadow, layers) is injected once into <head>.
   - Pure DOM/SVG + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---- the dino art: ONE copy. viewBox is tightened around the figure so
         the feet sit near the bottom (shadow grounds correctly) and the
         tail/frill reach the side edges. Raw path coords live in 0..800 /
         0..376 space (the original silhouette's space). ---- */
  var SVG_MARKUP =
'<svg class="trike-svg" viewBox="20 20 770 345" xmlns="http://www.w3.org/2000/svg">' +

  /* scaly-skin pattern + a clip of the body so the scales stay on the body */
  '<defs>' +
    '<pattern id="trikeScales" patternUnits="userSpaceOnUse" width="22" height="11">' +
      '<path d="M0 11 A11 8 0 0 1 22 11" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path>' +
      '<path d="M-11 5.5 A11 8 0 0 1 11 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path>' +
      '<path d="M11 5.5 A11 8 0 0 1 33 5.5" fill="none" stroke="#5f9447" stroke-width="1.4" opacity="0.45"></path>' +
    '</pattern>' +
    '<clipPath id="trikeBodyClip"><path d="M41 160 C41 160,70 172,100 169 C100 169,150 158,200 127 L290 71 L295 71 C295 71,345 35,420 55 C420 55,460 30,565 95 L576 95 L573 81 L583 78 L579 66 L594 67 L594 54 L607 54 L611 48 C611 48,613 40,620 50 L625 42 L630 46 L638 39 L645 45 L655 45 L658 55 L666 60 L663 70 L668 73 L666 75 L674 84 L670 89 L671 115 C671 115,675 130,686 132 L751 125 L784 118 C784 118,750 140,705 150 C705 150,703 155,708 160 C708 160,700 180,723 188 C723 188,733 193,768 183 C768 183,755 199,745 212 C745 212,753 214,751 230 C751 230,745 257,735 262 L728 253 C728 253,723 255,718 254 C718 254,698 250,685 239 C685 239,669 240,653 227 C653 227,620 215,575 233 C562 244,534 250,506 252 C480 250,360 256,309 250 C309 250,310 235,325 215 C325 215,315 211,300 195 C300 195,260 190,240 185 L160 199 C160 199,100 210,65 180 Z"></path></clipPath>' +
  '</defs>' +

  /* FAR legs (offside pair) — drawn FIRST so they sit behind the body, a
     touch darker. gaitA = far-back, gaitB = far-front. */
  '<g class="leg gaitA"><path d="M333 250 C331 288,332 322,334 335 C334 343,341.5 346,350 346 C358.5 346,366 343,366 335 C368 322,369 288,367 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M344 338 L344 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M356 338 L356 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +
  '<g class="leg gaitB"><path d="M451 250 C449 288,450 322,452 335 C452 343,459.5 346,468 346 C476.5 346,484 343,484 335 C486 322,487 288,485 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M462 338 L462 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M474 338 L474 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +

  /* BODY — the original silhouette outline (leg dips replaced by a smooth
     belly), recoloured friendly green with a soft round outline. */
  '<path d="M41 160 C41 160,70 172,100 169 C100 169,150 158,200 127 L290 71 L295 71 C295 71,345 35,420 55 C420 55,460 30,565 95 L576 95 L573 81 L583 78 L579 66 L594 67 L594 54 L607 54 L611 48 C611 48,613 40,620 50 L625 42 L630 46 L638 39 L645 45 L655 45 L658 55 L666 60 L663 70 L668 73 L666 75 L674 84 L670 89 L671 115 C671 115,675 130,686 132 L751 125 L784 118 C784 118,750 140,705 150 C705 150,703 155,708 160 C708 160,700 180,723 188 C723 188,733 193,768 183 C768 183,755 199,745 212 C745 212,753 214,751 230 C751 230,745 257,735 262 L728 253 C728 253,723 255,718 254 C718 254,698 250,685 239 C685 239,669 240,653 227 C653 227,620 215,575 233 C562 244,534 250,506 252 C480 250,360 256,309 250 C309 250,310 235,325 215 C325 215,315 211,300 195 C300 195,260 190,240 185 L160 199 C160 199,100 210,65 180 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path>' +
  /* soft belly shading */
  '<path d="M318 252 C390 256,470 252,536 256 C528 286,440 290,360 290 C332 290,322 272,318 252 Z" fill="#c4e6a3" stroke="none" opacity="0.4"></path>' +
  /* scaly skin (clipped to the body) */
  '<rect x="20" y="20" width="770" height="345" fill="url(#trikeScales)" clip-path="url(#trikeBodyClip)"></rect>' +
  /* frill fan accent + warm spots */
  '<path d="M676 116 C712 100,752 104,780 112 C752 126,712 130,686 126 C681 122,678 119,676 116 Z" fill="#76b65d" stroke="none" opacity="0.5"></path>' +
  '<circle cx="702" cy="110" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="728" cy="107" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="752" cy="109" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="715" cy="120" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle><circle cx="740" cy="118" r="4.6" fill="#eab94d" stroke="none" opacity="0.9"></circle>' +
  /* brow-horn highlight */
  '<path d="M735 196 C752 196,766 188,778 184 C770 198,756 206,742 210 C739 205,737 200,735 196 Z" fill="#eef4e0" stroke="none" opacity="0.7"></path>' +

  /* NEAR legs (this-side pair) — drawn over the body in body colour.
     gaitB = near-back, gaitA = near-front (diagonal with the far legs). */
  '<g class="leg gaitB"><path d="M391 250 C389 288,390 324,392 337 C392 345,400.5 348,410 348 C419.5 348,428 345,428 337 C430 324,431 288,429 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M403 340 L403 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M417 340 L417 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +
  '<g class="leg gaitA"><path d="M509 250 C507 288,508 324,510 337 C510 345,518.5 348,528 348 C537.5 348,546 345,546 337 C548 324,549 288,547 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M521 340 L521 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M535 340 L535 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +

  /* FACE — just the eye (mouth/nostril/blush/brow removed per request), raised up & forward */
  '<g>' +
    '<g class="trike-eyes">' +
      '<ellipse cx="662" cy="174" rx="21" ry="24" fill="#ffffff" stroke="#3f6e2c" stroke-width="3.5"></ellipse>' +
      '<circle cx="668" cy="178" r="11.5" fill="#22331a" stroke="none"></circle>' +
      '<circle cx="663" cy="166" r="4.8" fill="#ffffff" stroke="none"></circle>' +
      '<circle cx="673" cy="183" r="2.1" fill="#ffffff" stroke="none" opacity="0.85"></circle>' +
    '</g>' +
  '</g>' +

'</svg>';

  /* ---- COLOUR PACKS -------------------------------------------------------
     Three selectable palettes. 'green' is the original. Each map recolours the
     figure by swapping the base hex values (greens + scales + frill + warm
     spots) for the pack's hues; the eye white/pupil and the runtime hearts keep
     their own colours. Pass {palette:'pink'} to walk()/patrol(), or use
     TriceraWalker.svgMarkupFor('pink'). Kept identical to stego-walker.js so the
     siblings recolour to matching packs. ---- */
  var PALETTES = {
    green: null,                              // original — no substitution
    pink: {
      '#8cc777': '#f2a3c6', '#6ea653': '#e07ba8', '#c4e6a3': '#fcd9ea',
      '#3f6e2c': '#b14a7c', '#5f9447': '#d678a6', '#76b65d': '#ee9dc1',
      '#ecb24f': '#f2b34a', '#eab94d': '#f2b34a', '#f6d28a': '#f9d68f',
      '#eef4e0': '#fde4ef', '#f1a0ab': '#d96f97'
    },
    green2: {                                 // a cooler teal/emerald green
      '#8cc777': '#5bc4a3', '#6ea653': '#3aa888', '#c4e6a3': '#bff0e0',
      '#3f6e2c': '#2b6e58', '#5f9447': '#429d80', '#76b65d': '#4ebd9b',
      '#ecb24f': '#f0a85f', '#eab94d': '#f0a85f', '#f6d28a': '#f8cda6',
      '#eef4e0': '#eef7f0', '#f1a0ab': '#f1a0ab'
    }
  };
  function applyPalette(markup, pal) {
    var map = PALETTES[pal];
    if (!map) return markup;
    var s = markup;
    for (var k in map) { if (map.hasOwnProperty(k)) s = s.split(k).join(map[k]); }
    return s;
  }
  function svgMarkupFor(pal) { return applyPalette(SVG_MARKUP, pal); }

  /* ---- animation + base CSS, injected once (keyframes namespaced) ---- */
  var CSS =
    '.trike-walker{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform;}' +
    '.trike-walker .trike-svg{height:100%;width:auto;display:block;overflow:visible;}' +
    '.trike-walker.trike-flip .trike-svg{transform:scaleX(-1);}' +
    /* the 4 legs swing about their hip (top-centre of each leg) */
    '.trike-svg .leg{transform-box:fill-box;transform-origin:50% 5%;}' +
    '.trike-svg .leg.gaitA{animation:trikeGaitA 1s ease-in-out infinite;}' +
    '.trike-svg .leg.gaitB{animation:trikeGaitB 1s ease-in-out infinite;}' +
    '@keyframes trikeGaitA{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}' +
    '@keyframes trikeGaitB{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}' +
    /* blink: the eye group squashes fully shut on a clear cadence (a quick
       double-blink every ~3.2s so it reads even on a small, fast-walking dino) */
    '.trike-svg .trike-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:trikeBlink 3.2s ease-in-out infinite;}' +
    '@keyframes trikeBlink{0%,84%,100%{transform:scaleY(1)}88%{transform:scaleY(.05)}91.5%{transform:scaleY(1)}95%{transform:scaleY(.05)}}' +
    /* ground shadow under the feet — sits on the wrapper, so it stays
       grounded while the dino (action layer) hops */
    '.trike-shadow{position:absolute;left:50%;bottom:-1%;width:78%;height:9%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.28),rgba(0,0,0,0) 72%);pointer-events:none;}' +
    /* action layer: wraps the figure; triggered hop/shake transforms live here */
    '.trike-act{display:inline-block;height:100%;vertical-align:top;}';

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'tricera-walker-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* one document-level click handler (capture phase) detects a click anywhere
     on a dino instance via its LIVE bounding box — robust even while it
     animates (composited transforms break element hit-testing) — fires its
     action and keeps the click from reaching the scene behind it. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof document === 'undefined') return;
    clickBound = true;
    document.addEventListener('click', function (e) {
      // never swallow a click meant for the game UI (the form sits above the scene)
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = document.querySelectorAll('.trike-walker');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          triggerAction(list[i]);
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* a heart shape (centred, size s) in the figure's viewBox coordinate space */
  function heartD(cx, cy, s) {
    return 'M' + cx + ',' + (cy + 0.85 * s) +
      ' C' + (cx - 1.25 * s) + ',' + (cy - 0.1 * s) + ' ' + (cx - 0.55 * s) + ',' + (cy - s) + ' ' + cx + ',' + (cy - 0.35 * s) +
      ' C' + (cx + 0.55 * s) + ',' + (cy - s) + ' ' + (cx + 1.25 * s) + ',' + (cy - 0.1 * s) + ' ' + cx + ',' + (cy + 0.85 * s) + ' Z';
  }
  /* little hearts that rise above its back and fade — fired on a random timer
     AND on click. Drawn in the figure's SVG so they scale with the dino. */
  function fireHearts(host) {
    if (typeof document === 'undefined') return;
    var svg = host.querySelector ? host.querySelector('.trike-svg') : null;
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var n = 3 + (Math.random() * 2 | 0);                  // 3-4 hearts
    for (var i = 0; i < n; i++) {
      var cx = 540 + (Math.random() - 0.5) * 230;         // above the back/head
      var cy = 60 + (Math.random() - 0.5) * 40;
      var s = 17 + Math.random() * 8;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', heartD(cx, cy, s));
      p.setAttribute('fill', '#e6647a');
      p.setAttribute('stroke', 'none');
      svg.appendChild(p);
      (function (path, idx) {
        if (path.animate) {
          var rise = 90 + Math.random() * 60;
          path.animate(
            [{ opacity: 0, transform: 'translateY(14px)' },
             { opacity: 1, transform: 'translateY(0)', offset: 0.2 },
             { opacity: 0.92, offset: 0.62 },
             { opacity: 0, transform: 'translateY(-' + rise + 'px)' }],
            { duration: 1450, delay: idx * 130, easing: 'ease-out', fill: 'forwards' })
            .onfinish = function () { if (path.parentNode) path.remove(); };
        } else {
          setTimeout(function () { if (path.parentNode) path.remove(); }, 1700);
        }
      })(p, i);
    }
  }

  /* a puff of dust kicked up at the feet — used by the STOMP action. Drawn in
     front of the dino as a small absolutely-positioned SVG at the wrapper base. */
  function fireDust(host) {
    if (typeof document === 'undefined') return;
    var NS = 'http://www.w3.org/2000/svg';
    var SZ = 150;
    var dust = document.createElementNS(NS, 'svg');
    dust.setAttribute('width', SZ); dust.setAttribute('height', SZ * 0.5);
    dust.style.cssText = 'position:absolute;left:50%;bottom:0;width:' + SZ + 'px;height:' +
      (SZ * 0.5) + 'px;transform:translateX(-50%);overflow:visible;pointer-events:none;';
    for (var k = 0; k < 7; k++) {
      var c = document.createElementNS(NS, 'circle');
      var dir = (k % 2 ? 1 : -1);
      var x0 = SZ / 2 + (Math.random() - 0.5) * 34;
      c.setAttribute('cx', x0); c.setAttribute('cy', SZ * 0.42);
      c.setAttribute('r', 5 + Math.random() * 6);
      c.setAttribute('fill', 'rgba(176,148,104,' + (0.45 + Math.random() * 0.3).toFixed(2) + ')');
      dust.appendChild(c);
      if (c.animate) {
        var dx = dir * (24 + Math.random() * 34), dy = -(10 + Math.random() * 22);
        c.animate(
          [{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 },
           { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.6)', opacity: 0 }],
          { duration: 640 + Math.random() * 220, easing: 'ease-out', fill: 'forwards' });
      }
    }
    host.appendChild(dust);
    setTimeout(function () { if (dust.parentNode) dust.remove(); }, 950);
  }

  /* on click: a heart pop + a RANDOM action (hop / stomp / shake) */
  function triggerAction(wrap) {
    if (wrap._busy) return;                 // mid-action — ignore
    fireHearts(wrap);                       // hearts on every click
    var r = Math.random();
    if (r < 0.45) doHop(wrap);              // 45% happy hop
    else if (r < 0.80) doStomp(wrap);       // 35% stomp + dust
    else doShake(wrap);                     // 20% excited head shake
  }
  /* a happy hop (figure rises and lands; the shadow stays grounded) */
  function doHop(wrap) {
    var act = wrap._act;
    if (!act || !act.animate) return;
    wrap._busy = true;
    act.animate(
      [{ transform: 'translateY(0)', easing: 'ease-out' },
       { transform: 'translateY(-26px)', offset: 0.45, easing: 'ease-in' },
       { transform: 'translateY(0)' }],
      { duration: 560 }).onfinish = function () { wrap._busy = false; };
  }
  /* a quick squash-down + a dust puff at the feet */
  function doStomp(wrap) {
    var act = wrap._act;
    if (!act || !act.animate) { fireDust(wrap); return; }
    wrap._busy = true;
    fireDust(wrap);
    act.animate(
      [{ transform: 'scaleY(1) translateY(0)', easing: 'ease-out' },
       { transform: 'scaleY(.9) translateY(8px)', offset: 0.35, easing: 'ease-in-out' },
       { transform: 'scaleY(1) translateY(0)' }],
      { duration: 480 }).onfinish = function () { wrap._busy = false; };
  }
  /* a quick excited wiggle */
  function doShake(wrap) {
    var act = wrap._act;
    if (!act || !act.animate) return;
    wrap._busy = true;
    act.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)', offset: 0.25 },
       { transform: 'rotate(4deg)', offset: 0.5 }, { transform: 'rotate(-3deg)', offset: 0.75 },
       { transform: 'rotate(0deg)' }],
      { duration: 560, easing: 'ease-in-out' }).onfinish = function () { wrap._busy = false; };
  }

  function buildElement(opts) {
    ensureCSS();
    ensureClickHandler();
    var wrap = document.createElement('div');
    wrap.className = 'trike-walker' + (opts.flip ? ' trike-flip' : '');
    wrap.style.height = opts.height;
    wrap.style.bottom = opts.bottom;
    if (opts.zIndex != null) wrap.style.zIndex = opts.zIndex;
    wrap.style.transform = 'translateX(-99999px)';   // hidden off-screen until measured
    var shadow = document.createElement('div');       // grounded shadow (stays put on hop)
    shadow.className = 'trike-shadow';
    var act = document.createElement('div');          // action layer (hop/shake transforms here)
    act.className = 'trike-act';
    act.innerHTML = applyPalette(SVG_MARKUP, opts.palette);
    wrap.appendChild(shadow);
    wrap.appendChild(act);
    wrap._act = act;
    return wrap;
  }

  /* one crossing */
  function walk(container, options) {
    var o = options || {};
    var opts = {
      direction: o.direction || 'ltr',
      duration: o.duration != null ? o.duration : 13000,
      height: o.height || '30%',
      bottom: o.bottom != null ? o.bottom : '6%',
      bob: o.bob != null ? o.bob : 6,
      zIndex: o.zIndex != null ? o.zIndex : 6,
      faceWalkDir: o.faceWalkDir !== false,
      flip: o.flip,
      loop: !!o.loop,
      palette: o.palette || 'green',
      onDone: o.onDone || null
    };
    if (!container) return null;
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    // the art faces RIGHT; flip it when travelling left (rtl) so it faces the way it walks
    var faceLeft = opts.direction === 'rtl';
    var flip = opts.faceWalkDir ? faceLeft : !!opts.flip;

    var wrap = buildElement({ height: opts.height, bottom: opts.bottom, zIndex: opts.zIndex, flip: flip, palette: opts.palette });
    container.appendChild(wrap);

    var cw = container.clientWidth || (global.innerWidth || 800);
    var ew = wrap.offsetWidth || (container.clientHeight * 0.6) || 300;
    var margin = Math.max(40, ew * 0.3);
    var startX = -ew - margin, endX = cw + margin;
    if (opts.direction === 'rtl') { var tmp = startX; startX = endX; endX = tmp; }

    // linear horizontal travel + gentle vertical bounce
    var steps = 48, frames = [];
    var cycles = Math.max(4, Math.round(opts.duration / 760));
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var x = startX + (endX - startX) * f;
      var y = -Math.abs(Math.sin(f * Math.PI * cycles)) * opts.bob;
      frames.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)', offset: f });
    }

    var handle = { element: wrap, animation: null, stop: function () {} };

    if (wrap.animate) {
      var anim = wrap.animate(frames, { duration: opts.duration, easing: 'linear', iterations: opts.loop ? Infinity : 1 });
      var ended = false;
      var endCrossing = function () {
        if (ended) return; ended = true;
        if (wrap._stopHearts) wrap._stopHearts();
        try { anim.cancel(); } catch (e) {}
        if (wrap.parentNode) wrap.remove();
        if (opts.onDone) opts.onDone();
      };
      anim.onfinish = function () { if (!opts.loop) endCrossing(); };
      handle.animation = anim;
      handle.stop = function () { ended = true; if (wrap._stopHearts) wrap._stopHearts(); try { anim.cancel(); } catch (e) {} if (wrap.parentNode) wrap.remove(); };
      wrap._walk = anim;
      wrap._end = endCrossing;
    } else {
      // very old fallback: CSS transition
      wrap.style.transform = 'translate(' + startX + 'px,0)';
      wrap.style.transition = 'transform ' + opts.duration + 'ms linear';
      requestAnimationFrame(function () { wrap.style.transform = 'translate(' + endX + 'px,0)'; });
      var done = function () { wrap.removeEventListener('transitionend', done); if (!opts.loop) { wrap.remove(); if (opts.onDone) opts.onDone(); } };
      wrap.addEventListener('transitionend', done);
      handle.stop = function () { if (wrap._stopHearts) wrap._stopHearts(); if (wrap.parentNode) wrap.remove(); };
    }
    // ambient hearts on a random timer (6–15s); also fired on click
    var heartTO = setTimeout(function tick() {
      if (!wrap.parentNode) return;
      fireHearts(wrap);
      heartTO = setTimeout(tick, 6000 + Math.random() * 9000);
    }, 2500 + Math.random() * 4000);
    wrap._stopHearts = function () { clearTimeout(heartTO); };
    return handle;
  }

  /* keeps crossing back and forth, with random gaps between crossings */
  function patrol(container, options) {
    var o = options || {};
    var dir = o.direction || 'ltr';
    var alternate = o.alternate !== false;
    var gapMin = o.gapMin != null ? o.gapMin : 3000;
    var gapMax = o.gapMax != null ? o.gapMax : 8000;
    var stopped = false, timer = null, current = null;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function next() {
      if (stopped) return;
      current = walk(container, Object.assign({}, o, {
        direction: dir, loop: false,
        onDone: function () {
          if (typeof o.onDone === 'function') o.onDone();
          if (alternate) dir = (dir === 'ltr' ? 'rtl' : 'ltr');
          timer = setTimeout(next, rand(gapMin, gapMax));
        }
      }));
    }
    timer = setTimeout(next, o.startDelay != null ? o.startDelay : 0);
    return { stop: function () { stopped = true; clearTimeout(timer); if (current) current.stop(); } };
  }

  /* fire a specific action on the live instance(s) — handy for testing.
     name: 'hop' | 'stomp' | 'shake' | 'hearts' | 'random' (default). */
  function trigger(name) {
    if (typeof document === 'undefined') return 0;
    var list = document.querySelectorAll('.trike-walker'), n = 0;
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (name === 'hop') doHop(w);
      else if (name === 'stomp') doStomp(w);
      else if (name === 'shake') doShake(w);
      else if (name === 'hearts') fireHearts(w);
      else triggerAction(w);
      n++;
    }
    return n;
  }

  global.TriceraWalker = { walk: walk, patrol: patrol, trigger: trigger, svgMarkup: SVG_MARKUP, svgMarkupFor: svgMarkupFor, palettes: PALETTES };
})(typeof window !== 'undefined' ? window : this);
