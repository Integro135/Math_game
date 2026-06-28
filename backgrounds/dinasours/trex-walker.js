/* =====================================================================
   trex-walker.js  —  reusable walking cute RUNNING T-Rex "rexy"
   ---------------------------------------------------------------------
   A self-contained MOVING dinosaur, the sibling of stego-walker.js /
   tricera-walker.js / rumi's chibi-walker.js: the art (pure CSS shapes)
   and ALL of its behaviour live ONCE, here. Backgrounds never copy the
   art; they just load this script and call the API, and the dino brings
   its whole running animation with it.

   The figure is the CodePen "running T-Rex" built entirely from CSS
   shapes (no canvas, no images) — ported from backgrounds/dinasours/
   trex.html, which itself was compiled from the original Pug + Less.
   The internal RUNNING animation is kept verbatim (legs/knees/forelegs
   pumping, arms swinging, tail + head bobbing, the eye blinking). Three
   things from trex.html are REMOVED because the MODULE owns them instead:
     • the `position_wrapper` cross-screen keyframe — crossing is driven
       by a WAAPI translateX on the wrapper (exactly like stego-walker),
     • the `.freeze:hover` pause, and
     • the standalone `.cry` "RoOar!" text (the module pops its own on click).

   SCOPING: like baby-trex-egg.js, EVERY selector (and the small global
   reset the art relies on) is scoped under the instance root `.trex-walker`,
   so dropping it into a live page can't leak styles onto the host. The CSS
   is injected once into <head> (ensureCSS pattern).

   Design twin / art source:  trex.html (same figure on a plain page).
   Minimal "walk across" demo:  trex-demo.html
   If you edit the art in one file, mirror it into the other.

       <script src="path/to/trex-walker.js"></script>

   ---- API -------------------------------------------------------------
   One crossing (enters off one edge, walks across, exits the other edge):
       TrexWalker.walk(containerEl, {
         direction: 'ltr',     // 'ltr' (enter left -> exit right) or 'rtl'
         duration : 13000,     // ms to cross the whole screen
         height   : '36%',     // dino height (any CSS length, vs container)
         bottom   : '6%',      // vertical position of the feet (CSS length)
         bob      : 6,         // px of vertical bounce while walking
         zIndex   : 6,
         faceWalkDir: true,    // mirror so the dino faces the way it walks
         onDone   : fn         // called after it exits (element auto-removed)
       });
       // -> returns { element, animation, stop() }

   Continuous patrol (keeps crossing back and forth with random gaps):
       const p = TrexWalker.patrol(containerEl, {
         height:'36%', bottom:'6%', duration:13000,
         gapMin: 120000, gapMax: 240000,   // gap between crossings (ms)
         alternate: true,                  // flip direction each crossing
         startDelay: 0                     // ms before the FIRST appearance
       });                                 // (game bgs use 60000-180000 = 1-3 min)
       // -> returns { stop() }   // call p.stop() to remove & cancel

   Fire a specific action on the live instance(s) — mainly for testing:
       TrexWalker.trigger('hop' | 'stomp' | 'shake' | 'hearts' | 'roar' | 'random')

   ---- BEHAVIOUR (all automatic, all at this module level) --------------
   • Walk    — the whole running rig pumps (CSS keyframes), with a vertical
               bob + ground shadow. The dino faces the way it travels.
   • Shadow  — a soft ground ellipse under the feet; sits on the wrapper so
               it stays grounded while the dino hops.
   • Blink   — the big eye squashes shut briefly every few seconds (CSS).
   • Hearts  — little hearts rise above its head + fade; fired on a random
               per-instance timer (~6-15s) AND on every click.
   • Click   — clicking the dino fires ONE random action + a heart/"RoOar!"
               pop:
                  ~45% happy HOP      (hops; shadow stays grounded)
                  ~35% STOMP          (a quick squash + a dust puff at the feet)
                  ~20% body SHAKE     (a quick excited wiggle)
               …EXCEPT every 5th click on the same dino fires a ROAR instead
               (clicks 1-4 do the normal random action), mirroring the savanna
               lion that roars every 5th click.
               Detected via a document capture-phase listener that hit-tests
               its live bounding box (robust even while it animates) and stops
               the click from reaching the scene behind it.
   • Roar    — ported from the savanna LION roar (canvas there, DOM/SVG here):
               the dino throws its head/body back and does a strong, brief body
               RATTLE (its own shake), THREE jagged LIGHTNING bolts + a pale sky
               FLASH crash down across the sky above it (a fixed, viewport-wide
               SVG overlay: blue-glow + white-core jagged paths, flickering then
               fading ~0.5s), and a couple of expanding SHOCKWAVE rings ripple
               out from its head. Self-contained: every overlay is removed after
               its own animation, and stop() tears down any live overlay.

   ---- FACING ----------------------------------------------------------
   In trex.html the art is UNFLIPPED while position_wrapper carries it
   left->right (0..50%), i.e. its head/snout leads RIGHTWARD travel, then it
   gets scaleX(-1) for the return trip. So default (no flip) = facing RIGHT.
   With faceWalkDir: 'ltr' = unflipped (faces right), 'rtl' = scaleX(-1).

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .trex-walker (wrapper, position:absolute, WAAPI walk)
                        └ .trex-shadow (grounded)
                        └ .trex-act    (hop/stomp/shake transforms)
                            └ .trex-flip   (scaleX(-1) when facing left)
                                └ .trex-scale (scales the 320x440 design box)
                                    └ .dinosaur.run … (the ported art)
   - The 320x440 design box is scaled to the requested `height` via a
     transform so height:'36%' of the container works like the other walkers.
   - All CSS is injected once into <head>, every rule scoped under .trex-walker.
   - Pure DOM/CSS + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  var DESIGN_W = 320, DESIGN_H = 440;   // the original .dinosaur block's box

  /* ---- the dino art: ONE copy. The exact trex.html tree, minus the
         standalone .cry / .freeze / .wrapper chrome (the module owns
         crossing + click pops). Keep the ORDER + NESTING — it is the paint
         order the look relies on. ---- */
  var MARKUP =
    '<div class="dinosaur run">' +
      '<div class="body">' +
        '<div class="head">' +
          '<div class="head-fill"></div>' +
          '<ul class="teeth upper"><li></li><li></li><li></li><li></li></ul>' +
          '<ul class="teeth lower"><li></li><li></li><li></li></ul>' +
          '<div class="eye"></div>' +
        '</div>' +
        '<div class="hand"><div class="elbow"><div class="forearm"></div></div></div>' +
        '<div id="second-hand" class="hand"><div class="elbow"><div class="forearm"></div></div></div>' +
        '<div class="leg"><div class="knee"><div class="foreleg"></div></div></div>' +
        '<div id="second-leg" class="leg"><div class="knee"><div class="foreleg"></div></div></div>' +
        '<div class="body-mask"><ul><li></li><li></li><li></li><li></li><li></li></ul></div>' +
        '<div class="mark"></div>' +
        '<ul class="tail"><li></li><li></li><li></li><li></li><li></li><li></li></ul>' +
      '</div>' +
    '</div>';

  /* the page-background colour the art's "mask" shapes used to blend the
     mouth / forearm / shin cut-outs into. trex.html used the body's bg
     (#dbe2ef); here the masks are TRANSPARENT so the dino reads on any
     scene (they were only there to subtract a sliver against a known bg). */
  var BG = 'transparent';

  /* ---- CSS, injected once. This is trex.html's compiled CSS, with EVERY
         selector scoped under `.trex-walker`, the cross-screen
         position_wrapper / freeze / cry rules dropped, and the run keyframes
         (and blink) kept verbatim. The module wrapper/shadow/flip/scale
         layers are added on top. ---- */
  var CSS = [
    /* ── module chrome: wrapper / shadow / action / flip / scale layers ── */
    /* the wrapper is sized by `height` (vs the container); aspect-ratio gives
       it a real WIDTH from that height (the design box is 320x440) so its
       offsetWidth, the 60%-wide shadow, and the width:100% inner layers all
       resolve even though every child is absolutely positioned. */
    '.trex-walker{position:absolute;left:0;bottom:0;aspect-ratio:' + DESIGN_W + ' / ' + DESIGN_H + ';',
      'pointer-events:none;will-change:transform;}',
    /* grounded shadow under the feet — sits on the wrapper, so it stays put
       while the dino (action layer) hops. 2-class selector so the scoped
       reset can't flip it back to static. */
    '.trex-walker>.trex-shadow{position:absolute;left:50%;bottom:-1%;width:60%;height:8%;',
      'transform:translateX(-50%);border-radius:50%;',
      'background:radial-gradient(ellipse at center,rgba(0,0,0,.28),rgba(0,0,0,0) 72%);',
      'pointer-events:none;}',
    /* action layer: triggered hop/stomp/shake transforms live here */
    '.trex-walker>.trex-act{position:absolute;left:0;bottom:0;width:100%;height:100%;}',
    /* flip layer: faces the way it travels */
    '.trex-walker .trex-flip{position:absolute;left:0;bottom:0;width:100%;height:100%;}',
    '.trex-walker.trex-flip-on .trex-flip{transform:scaleX(-1);transform-origin:center bottom;}',
    /* scale layer: the fixed 320x440 design box, scaled to the wrapper height
       and anchored so the feet sit on the wrapper's bottom (shadow grounds). */
    '.trex-walker .trex-scale{position:absolute;left:50%;bottom:0;width:' + DESIGN_W + 'px;height:' + DESIGN_H + 'px;',
      'transform-origin:center bottom;transform:translateX(-50%) scale(var(--trex-s,1));}',

    /* the small GLOBAL reset the art relies on, scoped to descendants only
       (NOT .trex-walker itself, or it would override the wrapper's own
       position). The original art assumed default static/relative flow plus
       box-sizing; keep it tame and contained. */
    '.trex-walker *{box-sizing:content-box;}',

    /* ── the dino (trex.html, scoped) ── */
    '.trex-walker .dinosaur{position:absolute;left:0;bottom:0;width:' + DESIGN_W + 'px;height:' + DESIGN_H + 'px;' +
      '--primary:#68c3a4;--primary-d10:#46b18d;--primary-d20:#388d70;}',
    /* colour packs — same values as trex.html; add the class to .dinosaur */
    '.trex-walker .dinosaur.pal-pink{--primary:#f0a4c4;--primary-d10:#df7ba8;--primary-d20:#c25c8a;}',
    '.trex-walker .dinosaur.pal-green2{--primary:#8cc777;--primary-d10:#6ea653;--primary-d20:#4f7d3a;}',

    '.trex-walker .dinosaur .body{position:absolute;top:200px;left:120px;width:85px;height:180px;',
      'background-color:var(--primary);transform:rotate(5deg);border-radius:30px;}',

    '.trex-walker .dinosaur .body .body-mask{z-index:4;position:absolute;top:0px;left:0px;width:85px;height:180px;',
      'background-color:var(--primary);transform:rotate(5deg);border-radius:30px;}',
    '.trex-walker .dinosaur .body .body-mask::after{content:"";position:absolute;top:45px;right:-30px;',
      'width:80px;height:100px;background-color:var(--primary);border-radius:50%;}',
    '.trex-walker .dinosaur .body .body-mask ul{list-style:none;position:absolute;top:2px;left:-14px;',
      'width:0px;height:0px;transform:rotate(-5deg);margin:0;padding:0;}',
    '.trex-walker .dinosaur .body .body-mask ul li{display:inline-block;width:15px;height:15px;',
      'margin:5px 0px 0px 0px;border-radius:2px;background-color:var(--primary-d10);transform:rotate(45deg);}',

    '.trex-walker .dinosaur .body .mark{z-index:4;position:absolute;top:30px;left:10px;width:30px;height:40px;',
      'border-bottom-left-radius:10px;border-bottom-right-radius:25px;border-top-left-radius:60%;',
      'border-top-right-radius:60%;background-color:var(--primary-d10);}',
    '.trex-walker .dinosaur .body .mark::after{content:"";position:absolute;bottom:-50px;left:0px;width:30px;height:40px;',
      'border-bottom-left-radius:60%;border-bottom-right-radius:60%;border-top-left-radius:25px;',
      'border-top-right-radius:10px;background-color:var(--primary-d10);}',

    /* head is a transparent CONTAINER; the green snout lives in .head-fill,
       which is MASKED (#trexMouthMask) so the open mouth is a true transparent
       hole — it shows the scene behind on ANY background. Teeth + eye are
       siblings painted ABOVE the mask, so they are never cut. */
    '.trex-walker .dinosaur .body .head{z-index:4;position:absolute;top:50px;left:22px;',
      'transform-origin:top left;transform:rotate(-120deg);width:160px;height:220px;}',
    '.trex-walker .dinosaur .body .head .head-fill{position:absolute;left:0;top:0;width:160px;height:220px;',
      'background-color:var(--primary);border-bottom-left-radius:20%;border-bottom-right-radius:30%;',
      'border-top-left-radius:0%;border-top-right-radius:30px;',
      '-webkit-mask:url(#trexMouthMask);mask:url(#trexMouthMask);}',
    '.trex-walker .dinosaur .body .head .head-fill::before{content:"";position:absolute;bottom:0px;left:18px;width:70px;height:120px;',
      'transform:rotate(-10deg);background-color:var(--primary-d20);border-bottom-left-radius:40px;border-bottom-right-radius:0;',
      'border-top-left-radius:200%;border-top-right-radius:15px;}',
    '.trex-walker .dinosaur .body .head ul.teeth{list-style:none;position:absolute;margin:0;padding:0;',
      'display:flex;gap:5px;transform-origin:left center;}',
    '.trex-walker .dinosaur .body .head ul.teeth li{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;}',
    '.trex-walker .dinosaur .body .head ul.teeth.upper{bottom:64px;left:84px;transform:rotate(85deg);}',
    '.trex-walker .dinosaur .body .head ul.teeth.upper li{border-top:15px solid #fbf5e6;}',
    '.trex-walker .dinosaur .body .head ul.teeth.lower{bottom:70px;left:35px;transform:rotate(108deg);}',
    '.trex-walker .dinosaur .body .head ul.teeth.lower li{border-bottom:15px solid #fbf5e6;}',
    /* (the old .head-mask paint-over shapes are now the #trexMouthMask cut-out) */
    '.trex-walker .dinosaur .body .head .eye{position:absolute;top:65px;right:15px;width:45px;height:55px;',
      'background-color:#f5f5f5;border-radius:50%;transform:rotate(-30deg);animation:trexBlinkEye 6s infinite;overflow:hidden;}',
    '.trex-walker .dinosaur .body .head .eye::after{content:"";position:absolute;bottom:15px;left:10px;width:10px;height:10px;',
      'border-radius:50%;background-color:#333333;}',

    '.trex-walker .dinosaur .body .hand{z-index:5;position:absolute;top:0;right:5px;width:40px;height:60px;',
      'background-color:var(--primary);transform-origin:top right;transform:rotate(-30deg);border-radius:30px;}',
    '.trex-walker .dinosaur .body .hand .elbow{position:absolute;top:60px;right:-5px;width:30px;height:50px;',
      'background-color:var(--primary);transform-origin:top left;transform:rotate(-90deg);border-bottom-right-radius:10px;',
      'border-bottom-left-radius:10px;border-top-left-radius:10px;}',
    '.trex-walker .dinosaur .body .hand .elbow .forearm{position:absolute;bottom:0;right:-20px;width:20px;height:45px;',
      'background-color:var(--primary);transform-origin:bottom left;transform:rotate(-100deg);border-bottom-right-radius:10px;',
      'border-bottom-left-radius:10px;border-top-left-radius:10px;}',
    '.trex-walker .dinosaur .body .hand .elbow .forearm::after{content:"";position:absolute;top:3px;right:-8px;',
      'width:15px;height:15px;border-radius:50%;background-color:' + BG + ';}',
    '.trex-walker .dinosaur .body .hand#second-hand{z-index:2;top:5px;right:15px;width:20px;height:50px;',
      'transform:rotate(-50deg);background-color:var(--primary-d20);}',
    '.trex-walker .dinosaur .body .hand#second-hand .elbow{width:30px;height:50px;background-color:var(--primary-d20);}',
    '.trex-walker .dinosaur .body .hand#second-hand .elbow .forearm{width:20px;height:45px;background-color:var(--primary-d20);}',

    '.trex-walker .dinosaur .body .leg{z-index:5;position:absolute;bottom:5px;right:50px;width:80px;height:40px;',
      'background-color:var(--primary);transform-origin:center right;transform:rotate(200deg);border-radius:15px;}',
    '.trex-walker .dinosaur .body .leg .knee{position:absolute;top:10px;left:15px;width:60px;height:30px;',
      'background-color:var(--primary);transform-origin:center left;transform:rotate(-90deg);border-bottom-right-radius:10px;',
      'border-bottom-left-radius:10px;border-top-left-radius:10px;}',
    '.trex-walker .dinosaur .body .leg .knee .foreleg{position:absolute;bottom:0;right:0px;width:20px;height:40px;',
      'background-color:var(--primary);border-top-left-radius:60%;transform-origin:center left;transform:rotate(-50deg);}',
    '.trex-walker .dinosaur .body .leg .knee .foreleg::after{content:"";position:absolute;bottom:-2px;right:-8px;',
      'width:20px;height:40px;border-top-left-radius:60%;background-color:' + BG + ';}',
    '.trex-walker .dinosaur .body .leg#second-leg{z-index:2;bottom:0px;right:60px;width:60px;height:40px;',
      'transform:rotate(200deg);background-color:var(--primary-d20);}',
    '.trex-walker .dinosaur .body .leg#second-leg .knee{background-color:var(--primary-d20);}',
    '.trex-walker .dinosaur .body .leg#second-leg .knee .foreleg{background-color:var(--primary-d20);}',

    '.trex-walker .dinosaur .body ul.tail{list-style:none;position:absolute;bottom:-10px;left:20px;width:100px;height:60px;',
      'transform-origin:center left;transform:rotate(-200deg);margin:0;padding:0;}',
    '.trex-walker .dinosaur .body ul.tail li{position:absolute;background-color:var(--primary);}',
    '.trex-walker .dinosaur .body ul.tail li::after{content:"";position:absolute;top:-10px;left:0;width:25px;height:20px;',
      'background-color:var(--primary);transform:skew(12deg) rotate(12deg);}',
    '.trex-walker .dinosaur .body ul.tail li::before{content:"";position:absolute;bottom:-10px;left:0;width:25px;height:20px;',
      'background-color:var(--primary);transform:skew(-12deg) rotate(-12deg);}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(1){left:0;bottom:0px;width:25px;height:50px;}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(2){left:25px;bottom:5px;width:25px;height:40px;}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(3){left:50px;bottom:10px;width:25px;height:30px;}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(4){left:75px;bottom:15px;width:25px;height:20px;}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(5){left:100px;bottom:20px;width:25px;height:10px;}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(6){left:125px;bottom:13px;width:0;height:0;',
      'background-color:transparent;border-style:solid;border-width:12px 0 12px 45px;',
      'border-color:transparent transparent transparent var(--primary);}',
    '.trex-walker .dinosaur .body ul.tail li:nth-child(6)::after,.trex-walker .dinosaur .body ul.tail li:nth-child(6)::before{content:none;}',

    /* ── running state ── */
    '.trex-walker .dinosaur.run .body{transform:rotate(25deg);}',
    '.trex-walker .dinosaur.run .head{animation:trexMoveHead 4s infinite;}',
    '.trex-walker .dinosaur.run .hand{animation:trexRunHand 2s infinite;}',
    '.trex-walker .dinosaur.run .hand#second-hand{animation:trexRunHandSecond 2s 0.5s infinite;}',
    '.trex-walker .dinosaur.run .hand .elbow{animation:trexRunElbow 2s infinite;}',
    '.trex-walker .dinosaur.run .leg{animation:trexRunLeg 0.6s infinite;}',
    '.trex-walker .dinosaur.run .leg .knee{animation:trexRunKnee 0.6s infinite;}',
    '.trex-walker .dinosaur.run .leg .knee .foreleg{animation:trexRunForeleg 0.6s infinite;}',
    '.trex-walker .dinosaur.run .leg#second-leg{bottom:0px;animation:trexRunLegSecond 0.6s 0.3s infinite;}',
    '.trex-walker .dinosaur.run .leg#second-leg .knee{animation:trexRunKneeSecond 0.6s 0.3s infinite;}',
    '.trex-walker .dinosaur.run .leg#second-leg .knee .foreleg{animation:trexRunForelegSecond 0.6s 0.3s infinite;}',
    '.trex-walker .dinosaur.run ul.tail{animation:trexMoveTail 0.6s infinite;}',

    /* ── keyframes (namespaced) ── */
    '@keyframes trexRunHand{0%{transform:rotate(-30deg);}50%{transform:rotate(-25deg);}100%{transform:rotate(-30deg);}}',
    '@keyframes trexRunElbow{0%{transform:rotate(-90deg);}50%{transform:rotate(-75deg);}100%{transform:rotate(-90deg);}}',
    '@keyframes trexRunHandSecond{0%{transform:rotate(-50deg);}50%{transform:rotate(-45deg);}100%{transform:rotate(-50deg);}}',
    '@keyframes trexRunLeg{0%{transform:rotate(200deg);}50%{transform:rotate(170deg);}100%{transform:rotate(200deg);}}',
    '@keyframes trexRunKnee{0%{transform:rotate(-90deg);}50%{transform:rotate(-110deg);}100%{transform:rotate(-90deg);}}',
    '@keyframes trexRunForeleg{0%{transform:rotate(-50deg);}50%{transform:rotate(-10deg);}100%{transform:rotate(-50deg);}}',
    '@keyframes trexRunLegSecond{0%{transform:rotate(200deg);}50%{transform:rotate(170deg);}100%{transform:rotate(200deg);}}',
    '@keyframes trexRunKneeSecond{0%{transform:rotate(-90deg);}50%{transform:rotate(-110deg);}100%{transform:rotate(-90deg);}}',
    '@keyframes trexRunForelegSecond{0%{transform:rotate(-50deg);}50%{transform:rotate(-10deg);}100%{transform:rotate(-50deg);}}',
    '@keyframes trexMoveTail{0%{transform:rotate(-200deg);}50%{transform:rotate(-210deg);}100%{transform:rotate(-200deg);}}',
    '@keyframes trexMoveHead{0%{transform:rotate(-125deg);}50%{transform:rotate(-110deg);}100%{transform:rotate(-125deg);}}',
    '@keyframes trexBlinkEye{0%{transform:rotate(-30deg) scaleX(1);}1%{transform:rotate(-30deg) scaleX(0);}3%{transform:rotate(-30deg) scaleX(1);}}',

    /* a click-pop "RoOar!" (module nicety, above the head) */
    '.trex-walker .trex-roar{position:absolute;left:50%;top:4%;transform:translateX(-50%);',
      'font:700 16px "Gloria Hallelujah","Comic Sans MS",system-ui,sans-serif;color:#ef6f5e;',
      'white-space:nowrap;pointer-events:none;opacity:0;}',

    /* ── ROAR FX (ported from the savanna lion roar) ──
       a viewport-wide LIGHTNING + sky-FLASH overlay shown above the dino while
       it roars. Fixed so it spans the whole "sky" regardless of where the dino
       is on screen / which way it faces; it carries its own paint and is
       removed after the flash. */
    /* roar sky overlay — lives on the CONTAINER (the scene layer), NOT scoped
       under .trex-walker, so it must NOT carry the .trex-walker prefix. Absolute
       fill of the container = viewport-wide sky, and it stays behind the game UI. */
    '.trex-skyfx{position:absolute;left:0;top:0;width:100%;height:100%;',
      'pointer-events:none;overflow:hidden;z-index:50;opacity:0;}',
    '.trex-skyfx .trex-flash{position:absolute;left:0;top:0;width:100%;height:72%;',
      'background:rgba(212,228,255,.12);}',
    '.trex-skyfx svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;}',
    /* shockwave rings rippling out from the head — ride on the wrapper (head is
       near the top-left of the design box, so 32%/22% sits over the snout). */
    '.trex-walker>.trex-shock{position:absolute;left:32%;top:22%;width:1px;height:1px;',
      'pointer-events:none;}',
    '.trex-walker>.trex-shock i{position:absolute;left:0;top:0;width:24px;height:24px;margin:-12px;',
      'border-radius:50%;border:3px solid rgba(255,220,160,.6);opacity:0;}'
  ].join('');

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'trex-walker-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);

    /* the open-mouth cut-out: an SVG <mask> in the head's 160x220 space that
       reproduces the old head-mask carve (a rounded wedge + its rotated
       extension). White = keep, black = hole. .head-fill references it, so the
       mouth becomes a true transparent hole on any scene. Injected once. */
    if (!document.getElementById('trex-mouth-mask-defs')) {
      var holder = document.createElement('div');
      holder.id = 'trex-mouth-mask-defs';
      holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      holder.innerHTML =
        '<svg width="0" height="0" aria-hidden="true">' +
          '<mask id="trexMouthMask" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="220">' +
            '<rect width="160" height="220" fill="#fff"></rect>' +
            '<g transform="translate(20 110) rotate(-10 35 60)" fill="#000">' +
              '<rect width="70" height="120" rx="16" ry="16"></rect>' +
              '<rect x="-45" y="60" width="60" height="40" transform="rotate(45 -15 80)"></rect>' +
            '</g>' +
          '</mask>' +
        '</svg>';
      (document.body || document.documentElement).appendChild(holder);
    }
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
      var list = document.querySelectorAll('.trex-walker');
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

  /* little hearts that rise above its head and fade — fired on a random timer
     AND on click. Plain DOM divs positioned in % of the wrapper, so they ride
     along (and the figure's flip never mirrors the heart shape). */
  function fireHearts(host) {
    if (typeof document === 'undefined') return;
    var n = 3 + (Math.random() * 2 | 0);                  // 3-4 hearts
    for (var i = 0; i < n; i++) {
      var h = document.createElement('div');
      h.style.cssText = 'position:absolute;width:16px;height:14px;pointer-events:none;' +
        'left:' + (50 + (Math.random() - 0.5) * 46) + '%;' +
        'top:' + (8 + (Math.random() - 0.5) * 10) + '%;';
      h.innerHTML =
        '<span style="position:absolute;top:0;left:8px;width:8px;height:12px;background:#e6647a;' +
          'border-radius:8px 8px 0 0;transform-origin:0 100%;transform:rotate(-45deg);display:block;"></span>' +
        '<span style="position:absolute;top:0;left:0;width:8px;height:12px;background:#e6647a;' +
          'border-radius:8px 8px 0 0;transform-origin:100% 100%;transform:rotate(45deg);display:block;"></span>';
      host.appendChild(h);
      (function (el, idx) {
        if (el.animate) {
          var rise = 90 + Math.random() * 60;
          el.animate(
            [{ opacity: 0, transform: 'translateY(14px) scale(.5)' },
             { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.2 },
             { opacity: 0.92, offset: 0.62 },
             { opacity: 0, transform: 'translateY(-' + rise + 'px) scale(1.05)' }],
            { duration: 1450, delay: idx * 130, easing: 'ease-out', fill: 'forwards' })
            .onfinish = function () { if (el.parentNode) el.remove(); };
        } else {
          setTimeout(function () { if (el.parentNode) el.remove(); }, 1700);
        }
      })(h, i);
    }
  }

  /* a quick "RoOar!" word that pops above the head and fades (replaces the
     standalone .cry text from trex.html — fired on click). */
  function fireRoar(host) {
    if (typeof document === 'undefined') return;
    var r = document.createElement('div');
    r.className = 'trex-roar';
    r.textContent = 'RoOar!';
    host.appendChild(r);
    if (r.animate) {
      r.animate(
        [{ opacity: 0, transform: 'translateX(-50%) translateY(8px) rotate(-4deg) scale(.7)' },
         { opacity: 1, transform: 'translateX(-50%) translateY(-14px) rotate(3deg) scale(1.15)', offset: 0.3 },
         { opacity: 0.95, transform: 'translateX(-50%) translateY(-22px) rotate(0) scale(1)', offset: 0.6 },
         { opacity: 0, transform: 'translateX(-50%) translateY(-46px) rotate(-3deg) scale(1)' }],
        { duration: 1300, easing: 'ease-out', fill: 'forwards' })
        .onfinish = function () { if (r.parentNode) r.remove(); };
    } else {
      setTimeout(function () { if (r.parentNode) r.remove(); }, 1500);
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

  /* a jagged SVG bolt <path> (a soft glow stroke + a bright core stroke are
     stacked by the caller). Mirrors chibi-walker's boltPath helper. */
  function boltPath(NS, d, color, w, op) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('opacity', op);
    return p;
  }

  /* the LIGHTNING + sky-FLASH that crashes down when the dino ROARS — a DOM/SVG
     re-creation of the savanna lion's drawRoarBolts (which is canvas). THREE
     jagged bolts fall from the top of the sky to ~0.30–0.42 of viewport height,
     each a blue glow path + a white core path, plus a short fork; a faint pale
     full-width sky flash washes behind them. The whole overlay flickers then
     fades out over ~0.5s (matching the lion's first ~0.55 of the roar). It's a
     fixed, viewport-wide overlay so it works wherever the dino stands / faces. */
  function fireRoarBolts(host) {
    if (typeof document === 'undefined') return;
    var NS = 'http://www.w3.org/2000/svg';
    var W = global.innerWidth || (host.ownerDocument && host.ownerDocument.documentElement.clientWidth) || 1000;
    var H = global.innerHeight || (host.ownerDocument && host.ownerDocument.documentElement.clientHeight) || 700;

    var sky = document.createElement('div');
    sky.className = 'trex-skyfx';
    var flash = document.createElement('div');
    flash.className = 'trex-flash';
    sky.appendChild(flash);

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (var b = 0; b < 3; b++) {
      var bx = W * (0.2 + b * 0.3) + (Math.random() - 0.5) * W * 0.06;
      var botY = H * (0.30 + Math.random() * 0.12), segs = 6, pts = [[bx, 0]];
      for (var s2 = 1; s2 <= segs; s2++)
        pts.push([bx + (Math.random() - 0.5) * W * 0.045, botY * (s2 / segs)]);
      var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (var k = 1; k < pts.length; k++) d += ' L' + pts[k][0].toFixed(1) + ',' + pts[k][1].toFixed(1);
      // a short fork off the middle joint
      var f = pts[3];
      d += ' M' + f[0].toFixed(1) + ',' + f[1].toFixed(1) +
           ' L' + (f[0] + (Math.random() - 0.5) * W * 0.05).toFixed(1) + ',' + (f[1] + botY * 0.2).toFixed(1);
      svg.appendChild(boltPath(NS, d, 'rgba(150,190,255,.85)', 7, 0.55));   // soft blue glow
      svg.appendChild(boltPath(NS, d, 'rgba(245,250,255,1)', 2.4, 1));      // bright white core
    }
    sky.appendChild(svg);
    // Append to the walker's CONTAINER (the scene/stage), NOT the wrapper — the
    // wrapper carries a walk `transform` that would offset an absolute child. The
    // container fills the viewport, so the absolute overlay spans the whole sky and
    // stays behind the game UI. Track it on the wrapper so stop() can tear it down.
    var root = host.parentNode || (host.ownerDocument || document).body || host;
    root.appendChild(sky);
    if (!wrapFxList(host)) host._fx = [];
    host._fx.push(sky);
    var cleanup = function () {
      var i = host._fx ? host._fx.indexOf(sky) : -1;
      if (i >= 0) host._fx.splice(i, 1);
      if (sky.parentNode) sky.remove();
    };

    if (sky.animate) {
      // flicker (the lion's sin(t*55) gate) then fade out, ~0.5s
      sky.animate(
        [{ opacity: 0.2, offset: 0 }, { opacity: 1, offset: 0.08 },
         { opacity: 0.45, offset: 0.22 }, { opacity: 1, offset: 0.38 },
         { opacity: 0.55, offset: 0.5 }, { opacity: 0.85, offset: 0.66 },
         { opacity: 0, offset: 1 }],
        { duration: 520, easing: 'ease-out' }).onfinish = cleanup;
    } else {
      sky.style.opacity = '1';
      setTimeout(cleanup, 540);
    }
  }
  function wrapFxList(host) { return host._fx; }
  /* remove any live body-level roar overlays for this instance (called on
     stop()/end so a roar caught mid-flash can't leak a fixed sky overlay). */
  function clearFx(host) {
    if (!host._fx) return;
    for (var i = host._fx.length - 1; i >= 0; i--) {
      var el = host._fx[i];
      if (el && el.parentNode) el.remove();
    }
    host._fx.length = 0;
  }

  /* expanding SHOCKWAVE rings rippling out from the dino's head — the DOM twin
     of the lion's roar shockwave arcs. A couple of bordered circles scale up +
     fade. Sits on the wrapper (not the flip layer) so it stays put and reads in
     both facing directions. */
  function fireShock(host) {
    if (typeof document === 'undefined') return;
    var box = document.createElement('div');
    box.className = 'trex-shock';
    for (var k = 0; k < 3; k++) {
      var ring = document.createElement('i');
      box.appendChild(ring);
      if (ring.animate) {
        (function (el, idx) {
          el.animate(
            [{ transform: 'scale(.2)', opacity: 0.6, offset: 0 },
             { transform: 'scale(1)', opacity: 0.5, offset: 0.15 },
             { transform: 'scale(6.5)', opacity: 0, offset: 1 }],
            { duration: 760, delay: idx * 150, easing: 'ease-out', fill: 'forwards' });
        })(ring, k);
      }
    }
    host.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.remove(); }, 1150);
  }

  /* the ROAR action — ported from the savanna LION roar (which is canvas; here
     it's DOM/CSS/SVG). It runs three things together: the dino throws its
     head/body back a touch and does a strong, brief BODY rattle (WAAPI on the
     act layer — its own shake); THREE jagged lightning bolts + a pale sky flash
     crash down across the sky above it; and a couple of shockwave rings ripple
     out from its head. Plus the "RoOar!" word. Self-contained: every overlay is
     appended to the wrapper and removed after its own animation. */
  function doRoar(wrap) {
    var act = wrap._act;
    fireRoar(wrap);                          // the "RoOar!" word above the head
    fireRoarBolts(wrap);                     // lightning + sky flash (viewport-wide)
    fireShock(wrap);                         // shockwave rings from the head
    if (!act || !act.animate) return;
    wrap._busy = true;
    // head/body thrown back + a hard rattle, settling back to rest
    act.animate(
      [{ transform: 'translateX(0) rotate(0deg)' },
       { transform: 'translateX(5px) rotate(5deg)', offset: 0.1 },
       { transform: 'translateX(-4px) rotate(-4deg)', offset: 0.22 },
       { transform: 'translateX(4px) rotate(4deg)', offset: 0.34 },
       { transform: 'translateX(-3px) rotate(-3deg)', offset: 0.46 },
       { transform: 'translateX(3px) rotate(2deg)', offset: 0.6 },
       { transform: 'translateX(-2px) rotate(-1deg)', offset: 0.76 },
       { transform: 'translateX(0) rotate(0deg)' }],
      { duration: 720, easing: 'ease-out' }).onfinish = function () { wrap._busy = false; };
  }

  /* on click: count clicks per instance — every 5th click ROARS (like the lion
     firing every 5th click); clicks 1–4 fire ONE random action + a heart/roar
     pop, exactly as before. */
  function triggerAction(wrap) {
    if (wrap._busy) return;                 // mid-action — ignore
    wrap._clicks = (wrap._clicks || 0) + 1;
    if (wrap._clicks % 5 === 0) { doRoar(wrap); return; }
    var r = Math.random();
    if (r < 0.5) fireHearts(wrap); else fireRoar(wrap);
    if (r < 0.45) doHop(wrap);              // ~45% happy hop
    else if (r < 0.80) doStomp(wrap);       // ~35% stomp + dust
    else doShake(wrap);                     // ~20% excited body shake
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
    // the wrapper is sized by `height` (CSS length vs container); the inner
    // 320x440 design box is scaled to match it. The wrapper's pixel height is
    // resolved after insertion (fitScale, via offsetHeight) for %/vh values.
    var wrap = document.createElement('div');
    wrap.className = 'trex-walker' + (opts.flip ? ' trex-flip-on' : '');
    wrap.style.height = opts.height;
    wrap.style.bottom = opts.bottom;
    if (opts.zIndex != null) wrap.style.zIndex = opts.zIndex;
    wrap.style.transform = 'translateX(-99999px)';   // hidden off-screen until measured

    var shadow = document.createElement('div');       // grounded shadow (stays put on hop)
    shadow.className = 'trex-shadow';
    var act = document.createElement('div');          // action layer (hop/stomp/shake here)
    act.className = 'trex-act';
    var flip = document.createElement('div');         // flip layer (faces travel direction)
    flip.className = 'trex-flip';
    var scale = document.createElement('div');        // scales the 320x440 design box
    scale.className = 'trex-scale';
    scale.innerHTML = MARKUP;
    // colour pack: 'green' (default) = no class; 'pink'/'green2' add pal-<name>
    if (opts.palette && opts.palette !== 'green') {
      var dino = scale.querySelector('.dinosaur');
      if (dino) dino.classList.add('pal-' + opts.palette);
    }
    flip.appendChild(scale);
    act.appendChild(flip);
    wrap.appendChild(shadow);
    wrap.appendChild(act);
    wrap._act = act;
    wrap._scaleEl = scale;
    return wrap;
  }

  /* fit the inner design box to the wrapper's measured pixel height so the
     dino is exactly `height` tall and its feet rest on the wrapper bottom. */
  function fitScale(wrap) {
    var h = wrap.offsetHeight || (DESIGN_H);
    var s = h / DESIGN_H;
    if (wrap._scaleEl) wrap._scaleEl.style.setProperty('--trex-s', s);
    return s;
  }

  /* one crossing */
  function walk(container, options) {
    var o = options || {};
    var opts = {
      direction: o.direction || 'ltr',
      duration: o.duration != null ? o.duration : 13000,
      height: o.height || '36%',
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
    fitScale(wrap);   // now that it's in the DOM we can measure its pixel height

    var cw = container.clientWidth || (global.innerWidth || 800);
    var ew = wrap.offsetWidth || (wrap.offsetHeight * (DESIGN_W / DESIGN_H)) || 240;
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
        clearFx(wrap);
        try { anim.cancel(); } catch (e) {}
        if (wrap.parentNode) wrap.remove();
        if (opts.onDone) opts.onDone();
      };
      anim.onfinish = function () { if (!opts.loop) endCrossing(); };
      handle.animation = anim;
      handle.stop = function () { ended = true; if (wrap._stopHearts) wrap._stopHearts(); clearFx(wrap); try { anim.cancel(); } catch (e) {} if (wrap.parentNode) wrap.remove(); };
      wrap._walk = anim;
      wrap._end = endCrossing;
    } else {
      // very old fallback: CSS transition
      wrap.style.transform = 'translate(' + startX + 'px,0)';
      wrap.style.transition = 'transform ' + opts.duration + 'ms linear';
      requestAnimationFrame(function () { wrap.style.transform = 'translate(' + endX + 'px,0)'; });
      var done = function () { wrap.removeEventListener('transitionend', done); if (!opts.loop) { wrap.remove(); if (opts.onDone) opts.onDone(); } };
      wrap.addEventListener('transitionend', done);
      handle.stop = function () { if (wrap._stopHearts) wrap._stopHearts(); clearFx(wrap); if (wrap.parentNode) wrap.remove(); };
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
     name: 'hop' | 'stomp' | 'shake' | 'hearts' | 'roar' | 'random' (default). */
  function trigger(name) {
    if (typeof document === 'undefined') return 0;
    var list = document.querySelectorAll('.trex-walker'), n = 0;
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (name === 'hop') doHop(w);
      else if (name === 'stomp') doStomp(w);
      else if (name === 'shake') doShake(w);
      else if (name === 'hearts') fireHearts(w);
      else if (name === 'roar') doRoar(w);
      else triggerAction(w);
      n++;
    }
    return n;
  }

  global.TrexWalker = { walk: walk, patrol: patrol, trigger: trigger, markup: MARKUP };
})(typeof window !== 'undefined' ? window : this);
