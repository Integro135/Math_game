/* =====================================================================
   stego-walker.js  —  reusable walking cute stegosaurus "spike"
   ---------------------------------------------------------------------
   A self-contained MOVING dinosaur, the sibling of tricera-walker.js /
   rumi's chibi-walker.js: the art (SVG) and ALL of its behaviour live
   ONCE, here. Backgrounds never copy the art; they just load this script
   and call the API, and the dino brings every animation with it.

   The figure is a "cute-ified" stegosaurus, drawn in the SAME house style
   as the triceratops (so they read as siblings in a scene): a bold
   dark-green outline around flat friendly-green fills, a big blinking eye +
   blush + smile, the signature row of warm BACK PLATES + a 4-spike tail
   (thagomizer), and the 4 legs split into their own shapes so they STEP in
   a diagonal walk cycle. Re-imagined from the rough CSS sketch that used to
   live in stegozarus.html (small head, arched back, spiky tail).

   Design twin / preview + art docs:  stegozarus.html (same figure on a
   plain page, with the original sketch kept as a historical reference).
   Minimal "walk across" demo:        stego-demo.html
   If you edit the art in one file, mirror it into the other.

       <script src="path/to/stego-walker.js"></script>

   ---- API -------------------------------------------------------------
   One crossing (enters off one edge, walks across, exits the other edge):
       StegoWalker.walk(containerEl, {
         direction: 'ltr',     // 'ltr' (enter left -> exit right) or 'rtl'
         duration : 14000,     // ms to cross the whole screen
         height   : '32%',     // dino height (any CSS length, vs container)
         bottom   : '6%',      // vertical position of the feet (CSS length)
         bob      : 6,         // px of vertical bounce while walking
         zIndex   : 6,
         faceWalkDir: true,    // mirror so the dino faces the way it walks
         palette  : 'green',   // 'green' (default, original) | 'green2' (a warmer
                               // olive/lime green for variety) | 'pink'
         onDone   : fn         // called after it exits (element auto-removed)
       });
       // -> returns { element, animation, stop() }

   Continuous patrol (keeps crossing back and forth with random gaps):
       const p = StegoWalker.patrol(containerEl, {
         height:'32%', bottom:'6%', duration:14000,
         gapMin: 120000, gapMax: 240000,   // gap between crossings (ms)
         alternate: true,                  // flip direction each crossing
         startDelay: 0                     // ms before the FIRST appearance
       });                                 // (game bgs use 60000-180000 = 1-3 min)
       // -> returns { stop() }   // call p.stop() to remove & cancel

   Fire a specific action on the live instance(s) — mainly for testing:
       StegoWalker.trigger('hop' | 'stomp' | 'shake' | 'fart' | 'hearts' | 'random')

   ---- BEHAVIOUR (all automatic, all at this module level) --------------
   • Walk    — 4 legs step in a diagonal gait (CSS), with a vertical bob +
               ground shadow. The dino faces the way it travels.
   • Shadow  — a soft ground ellipse under the feet; sits on the wrapper so
               it stays grounded while the dino hops.
   • Blink   — the big eye squashes shut briefly every few seconds (CSS).
   • Hearts  — little hearts rise above its back + fade; fired on a random
               per-instance timer (~6-15s) AND on every click.
   • Fart    — soft green gas puffs drift from the rear, rise, expand + fade
               (like the savanna animals' toot), with a sheepish little shimmy.
   • Click   — clicking the dino fires ONE random action:
                  ~38% happy HOP      (hops; shadow stays grounded) + hearts
                  ~25% STOMP          (a quick squash + a dust puff) + hearts
                  ~15% body SHAKE     (a quick excited wiggle) + hearts
                  ~22% FART           (green gas puffs from the rear + shimmy)
               Detected via a document capture-phase listener that hit-tests
               its live bounding box (robust even while it animates) and stops
               the click from reaching the scene behind it.

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .stego-walker (wrapper, WAAPI translateX walk)
                        └ .stego-shadow (grounded)
                        └ .stego-act    (hop/shake transforms)  └ svg.stego-svg (flip)
   - All CSS (leg/blink keyframes, shadow, layers) is injected once into <head>.
   - Pure DOM/SVG + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---- the dino art: ONE copy. Raw coords in a ~0..800 / 0..370 space, the
         figure FACING RIGHT (small head + snout on the right, spiky tail on the
         left, back plates along the arch). viewBox is tight so the feet sit near
         the bottom (shadow grounds correctly). ---- */
  var SVG_MARKUP =
'<svg class="stego-svg" viewBox="20 20 780 350" xmlns="http://www.w3.org/2000/svg">' +

  /* FAR legs (offside pair) — behind the body, a touch darker.
     gaitA = far-back, gaitB = far-front. */
  '<g class="leg gaitA"><path d="M255 250 C253 288,254 322,256 335 C256 343,263.5 346,272 346 C280.5 346,289 343,289 335 C291 322,292 288,290 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M266 338 L266 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M278 338 L278 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +
  '<g class="leg gaitB"><path d="M430 250 C428 288,429 322,431 335 C431 343,438.5 346,447 346 C455.5 346,464 343,464 335 C466 322,467 288,465 250 Z" fill="#6ea653" stroke="#3f6e2c" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M441 338 L441 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M453 338 L453 345" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +

  /* BODY — arched-back silhouette with a CHUNKY, rounded, lifted tail (left)
     in the style of the triceratops's tail; leg dips replaced by a smooth
     belly, green. */
  '<path d="M70 200 C120 192,185 175,250 150 C300 122,345 100,400 95 C465 89,520 100,560 120 C598 138,612 150,640 152 C652 132,664 112,690 106 C720 102,746 112,763 132 C773 144,773 160,762 170 C747 181,728 183,713 180 C700 194,684 202,660 207 C620 214,590 236,560 246 C460 263,360 266,265 258 C205 252,150 250,110 244 C86 240,66 232,60 216 C57 208,64 202,70 200 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path>' +
  /* soft belly shading */
  '<path d="M120 234 C300 262,470 262,575 246 C560 270,420 276,300 274 C210 272,150 252,120 234 Z" fill="#c4e6a3" stroke="none" opacity="0.4"></path>' +

  /* BACK PLATES — the signature row. Each plate base sits EXACTLY on the back
     contour (its two base corners are placed on the silhouette curve and dipped
     ~5px into the body) so the plates hug the back with no gaps. */
  '<g fill="#ecb24f" stroke="#3f6e2c" stroke-width="3" stroke-linejoin="round">' +
    '<path d="M129 193 C138.5 161.2,143 140,150 140 C157 140,161.6 156.6,171 181.5 Z"></path>' +
    '<path d="M204 171 C213.5 135,218 111,225 111 C232 111,236.6 129.2,246 156.5 Z"></path>' +
    '<path d="M278 140 C287.9 99.2,293 72,300 72 C307 72,312.1 91,322 119.6 Z"></path>' +
    '<path d="M348 110.3 C357.9 72.3,363 47,370 47 C377 47,382.1 68.7,392 101.25 Z"></path>' +
    '<path d="M416 99.2 C425.5 65.5,430 43,437 43 C444 43,448.6 65.4,458 99.1 Z"></path>' +
    '<path d="M480 101.3 C489 74.1,493 56,500 56 C507 56,511 77.6,520 110.1 Z"></path>' +
  '</g>' +
  /* warm tip highlights on the three tall middle plates */
  '<g fill="#f6d28a" stroke="none">' +
    '<ellipse cx="300" cy="80" rx="5" ry="8"></ellipse>' +
    '<ellipse cx="370" cy="55" rx="5" ry="8"></ellipse>' +
    '<ellipse cx="437" cy="51" rx="5" ry="8"></ellipse>' +
  '</g>' +

  /* NEAR legs (this-side pair) — over the body, body colour.
     gaitB = near-back, gaitA = near-front (diagonal with the far legs). */
  '<g class="leg gaitB"><path d="M320 250 C318 288,319 324,321 337 C321 345,328.5 348,337 348 C345.5 348,353 345,353 337 C355 324,356 288,354 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M331 340 L331 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M343 340 L343 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +
  '<g class="leg gaitA"><path d="M500 250 C498 288,499 324,501 337 C501 345,508.5 348,517 348 C525.5 348,533 345,533 337 C535 324,536 288,534 250 Z" fill="#8cc777" stroke="#3f6e2c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"></path><path d="M511 340 L511 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path><path d="M523 340 L523 347" stroke="#3f6e2c" stroke-width="2.4" stroke-linecap="round" fill="none"></path></g>' +

  /* FACE — blush, big blinking eye, brow, nostril, smile (clustered on the head) */
  '<g>' +
    '<ellipse cx="702" cy="172" rx="13" ry="8" fill="#f1a0ab" opacity="0.8" stroke="none"></ellipse>' +
    '<g class="stego-eyes">' +
      '<ellipse cx="716" cy="150" rx="21" ry="23" fill="#ffffff" stroke="#3f6e2c" stroke-width="3.5"></ellipse>' +
      '<circle cx="722" cy="155" r="11" fill="#22331a" stroke="none"></circle>' +
      '<circle cx="711" cy="145" r="4.5" fill="#ffffff" stroke="none"></circle>' +
    '</g>' +
    '<path d="M698 126 C710 119,728 119,740 127" fill="none" stroke="#3f6e2c" stroke-width="4" stroke-linecap="round"></path>' +
    '<circle cx="757" cy="158" r="3.2" fill="#3f6e2c" stroke="none"></circle>' +
    '<path d="M736 168 C744 176,758 175,765 165" fill="none" stroke="#3f6e2c" stroke-width="3.5" stroke-linecap="round"></path>' +
  '</g>' +

'</svg>';

  /* ---- COLOUR PACKS -------------------------------------------------------
     Selectable palettes. 'green' is the original. 'green2' is an alternate
     GREEN (a warmer olive / lime-green) so a scene can show stegos in slightly
     different greens for more colour variety while staying the same creature.
     'pink' is a full recolour. Each map recolours the figure by swapping the
     base hex values for the pack's hues; the eye white/pupil and the runtime
     hearts/dust/fart keep their own colours. Backwards compatible: no palette
     (or 'green') = the original colours, unchanged.
       Pass {palette:'green2'} to StegoWalker.walk()/patrol(), or use
       StegoWalker.svgMarkupFor('green2'). ---- */
  var PALETTES = {
    green: null,                              // original — no substitution
    pink: {
      '#8cc777': '#f2a3c6', '#6ea653': '#e07ba8', '#c4e6a3': '#fcd9ea',
      '#3f6e2c': '#b14a7c', '#5f9447': '#d678a6', '#76b65d': '#ee9dc1',
      '#ecb24f': '#f2b34a', '#eab94d': '#f2b34a', '#f6d28a': '#f9d68f',
      '#eef4e0': '#fde4ef', '#f1a0ab': '#d96f97'
    },
    green2: {                                 // a warmer olive / lime-green —
      // same creature, just a different (warmer, limier) green. ONLY the green
      // hues shift; the warm amber back-plates + tip highlights + pink blush are
      // kept identical to the original so the figure reads as the same stego.
      '#8cc777': '#a6cf5f',   // body main  (mid lime-olive)
      '#6ea653': '#86ad44',   // far legs   (darker olive, derived from body)
      '#c4e6a3': '#dcecaa',   // belly shade(lighter warm lime)
      '#3f6e2c': '#4f6a1f',   // outline    (warm dark olive — same house style)
      '#5f9447': '#7aa237',   // (legacy)   mid-dark green
      '#76b65d': '#93bf4d',   // (legacy)   mid green
      '#ecb24f': '#ecb24f',   // back plates — unchanged (warm amber, not green)
      '#eab94d': '#eab94d',   // (legacy plate) unchanged
      '#f6d28a': '#f6d28a',   // plate tip highlight — unchanged
      '#eef4e0': '#f3f6e2',   // (legacy light) unchanged-ish warm off-white
      '#f1a0ab': '#f1a0ab'    // blush — unchanged (pink)
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
    '.stego-walker{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform;}' +
    '.stego-walker .stego-svg{height:100%;width:auto;display:block;overflow:visible;}' +
    '.stego-walker.stego-flip .stego-svg{transform:scaleX(-1);}' +
    /* the 4 legs swing about their hip (top-centre of each leg) */
    '.stego-svg .leg{transform-box:fill-box;transform-origin:50% 5%;}' +
    '.stego-svg .leg.gaitA{animation:stegoGaitA 1s ease-in-out infinite;}' +
    '.stego-svg .leg.gaitB{animation:stegoGaitB 1s ease-in-out infinite;}' +
    '@keyframes stegoGaitA{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}' +
    '@keyframes stegoGaitB{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}' +
    /* blink: the eye group squashes shut briefly every few seconds */
    '.stego-svg .stego-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:stegoBlink 4.2s ease-in-out infinite;}' +
    '@keyframes stegoBlink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.08)}}' +
    /* ground shadow under the feet — sits on the wrapper, so it stays
       grounded while the dino (action layer) hops */
    '.stego-shadow{position:absolute;left:50%;bottom:-1%;width:80%;height:9%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.28),rgba(0,0,0,0) 72%);pointer-events:none;}' +
    /* action layer: wraps the figure; triggered hop/shake transforms live here */
    '.stego-act{display:inline-block;height:100%;vertical-align:top;}';

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'stego-walker-css';
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
      var list = document.querySelectorAll('.stego-walker');
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
    var svg = host.querySelector ? host.querySelector('.stego-svg') : null;
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var n = 3 + (Math.random() * 2 | 0);                  // 3-4 hearts
    for (var i = 0; i < n; i++) {
      var cx = 380 + (Math.random() - 0.5) * 240;         // above the back/plates
      var cy = 50 + (Math.random() - 0.5) * 36;
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

  /* a puff of dust kicked up at the feet — used by the STOMP action. */
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

  /* a FART — soft green gas puffs drifting from the rear, rising + expanding +
     fading, like the savanna animals' toot. Drawn INSIDE the figure's SVG at
     the rear/vent (tail side, low) so the puffs flip with the dino's facing and
     always trail behind it. */
  function fireFart(host) {
    if (typeof document === 'undefined') return;
    var svg = host.querySelector ? host.querySelector('.stego-svg') : null;
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var ox = 122, oy = 222;                 // vent in viewBox coords (rear/tail base)
    var n = 6 + (Math.random() * 3 | 0);    // 6-8 puffs
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (ox + (Math.random() - 0.5) * 16).toFixed(1));
      c.setAttribute('cy', (oy + (Math.random() - 0.5) * 12).toFixed(1));
      c.setAttribute('r', (8 + Math.random() * 8).toFixed(1));
      c.setAttribute('fill', '#aee85f');    // saturated yellow-green so it reads on a green dino
      c.setAttribute('stroke', 'rgba(90,140,40,.35)');
      c.setAttribute('stroke-width', '1.5');
      c.setAttribute('opacity', '0');
      c.style.transformBox = 'fill-box';    // scale about each puff's own centre
      c.style.transformOrigin = 'center';
      svg.appendChild(c);
      (function (el, idx) {
        if (el.animate) {
          var dx = -(44 + Math.random() * 56);   // drift back past the tail…
          var dy = -(26 + Math.random() * 46);   // …and up
          el.animate(
            [{ transform: 'translate(0,0) scale(.4)', opacity: 0 },
             { transform: 'translate(' + (dx * 0.35).toFixed(1) + 'px,' + (dy * 0.35).toFixed(1) + 'px) scale(1)', opacity: 0.72, offset: 0.28 },
             { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(2)', opacity: 0 }],
            { duration: 1300 + Math.random() * 500, delay: idx * 75, easing: 'ease-out', fill: 'forwards' })
            .onfinish = function () { if (el.parentNode) el.remove(); };
        } else {
          setTimeout(function () { if (el.parentNode) el.remove(); }, 1900);
        }
      })(c, i);
    }
  }

  /* on click: ONE random action (hearts on the cute ones; the fart is sheepish) */
  function triggerAction(wrap) {
    if (wrap._busy) return;                 // mid-action — ignore
    var r = Math.random();
    if (r >= 0.78) { doFart(wrap); return; } // ~22% green toot (no hearts)
    fireHearts(wrap);                        // hearts on the cute actions
    if (r < 0.38) doHop(wrap);               // ~38% happy hop
    else if (r < 0.63) doStomp(wrap);        // ~25% stomp + dust
    else doShake(wrap);                      // ~15% excited body shake
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
  /* a fart: green gas puffs from the rear + a sheepish little shimmy */
  function doFart(wrap) {
    var act = wrap._act;
    fireFart(wrap);
    if (!act || !act.animate) return;
    wrap._busy = true;
    act.animate(
      [{ transform: 'rotate(0deg) translateY(0)' },
       { transform: 'rotate(-2deg) translateY(-2px)', offset: 0.18 },
       { transform: 'rotate(2deg) translateY(0)', offset: 0.45 },
       { transform: 'rotate(-1.5deg) translateY(-1px)', offset: 0.72 },
       { transform: 'rotate(0deg) translateY(0)' }],
      { duration: 1000, easing: 'ease-in-out' }).onfinish = function () { wrap._busy = false; };
  }

  function buildElement(opts) {
    ensureCSS();
    ensureClickHandler();
    var wrap = document.createElement('div');
    wrap.className = 'stego-walker' + (opts.flip ? ' stego-flip' : '');
    wrap.style.height = opts.height;
    wrap.style.bottom = opts.bottom;
    if (opts.zIndex != null) wrap.style.zIndex = opts.zIndex;
    wrap.style.transform = 'translateX(-99999px)';   // hidden off-screen until measured
    var shadow = document.createElement('div');       // grounded shadow (stays put on hop)
    shadow.className = 'stego-shadow';
    var act = document.createElement('div');          // action layer (hop/shake transforms here)
    act.className = 'stego-act';
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
      duration: o.duration != null ? o.duration : 14000,
      height: o.height || '32%',
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
    var ew = wrap.offsetWidth || (container.clientHeight * 0.6) || 320;
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
     name: 'hop' | 'stomp' | 'shake' | 'fart' | 'hearts' | 'random' (default). */
  function trigger(name) {
    if (typeof document === 'undefined') return 0;
    var list = document.querySelectorAll('.stego-walker'), n = 0;
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (name === 'hop') doHop(w);
      else if (name === 'stomp') doStomp(w);
      else if (name === 'shake') doShake(w);
      else if (name === 'fart') doFart(w);
      else if (name === 'hearts') fireHearts(w);
      else triggerAction(w);
      n++;
    }
    return n;
  }

  global.StegoWalker = { walk: walk, patrol: patrol, trigger: trigger, svgMarkup: SVG_MARKUP, svgMarkupFor: svgMarkupFor, palettes: PALETTES };
})(typeof window !== 'undefined' ? window : this);
