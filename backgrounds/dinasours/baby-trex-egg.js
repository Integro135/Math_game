/* =====================================================================
   baby-trex-egg.js  —  reusable hatching "baby T-Rex in an egg"
   ---------------------------------------------------------------------
   A self-contained, STATIONARY scene prop, built in the same spirit as
   tricera-walker.js / rumi's chibi-walker.js: the art (pure CSS shapes)
   and ALL of its behaviour live ONCE, here. Backgrounds never copy the
   art; they just load this script and call the API, and the egg brings
   its whole hatch animation with it.

   It is the ORIGINAL CSS playground "baby T-Rex hatching out of an egg"
   (study_dedede, see baby_trex.html) — faithfully compiled from its Pug +
   SCSS to plain HTML + CSS, unchanged in look or motion. The only change
   is packaging: every selector (and the playground's global
   `*{position:relative}` + `::before/::after` reset it depends on) is
   SCOPED under the instance root `.bte`, so dropping it into a live page
   can't leak styles onto the host.

   The dino does NOT climb out. The egg RESTS CLOSED (a whole speckled, cracked
   egg) and plays its hatch ONCE WHEN CLICKED (egg cracks open, the face rises
   with blinking eyes + teeth, the little clawed hands grip the rim, a balloon-
   heart floats up), then closes back and waits for the next click.

   Design twin / preview + art docs:  baby_trex.html (same figure on a plain
   page, with the original Pug/SCSS kept as a historical reference).
   Minimal integration demo:          baby-trex-egg-demo.html

       <script src="path/to/baby-trex-egg.js"></script>

   ---- API -------------------------------------------------------------
   Place one egg into a container (it rests CLOSED; click it to hatch):
       const egg = BabyTrexEgg.place(containerEl, {
         left   : '50%',     // horizontal position (any CSS length/%), centered on it
         bottom : '6%',      // vertical position of the egg's base (any CSS length/%)
         height : 220,       // egg height in px, OR a string '40%' (of container height)
         zIndex : 5,
       });
       // -> returns { element, remove() }

   Play the hatch (or just pop hearts) on the live instance(s) — for testing:
       BabyTrexEgg.trigger('hatch')    // play the hatch on every egg
       BabyTrexEgg.trigger('hearts')   // just pop hearts

   ---- BEHAVIOUR -------------------------------------------------------
   • Rests closed — every keyframe (egg-top / face / tail / hand / balloon …)
     is gated behind --bte-play (default `paused`), so the egg sits frozen on
     its closed 0% frame until clicked.
   • Click       — plays the hatch ONCE (egg opens → dino peeks → closes back),
     plus a few rising hearts. Detected via a document capture-phase listener
     that hit-tests the live bounding box and stops the click reaching the
     scene behind it.
   • Shadow      — a soft ground ellipse under the egg, scaling with it.

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .bte (wrapper, position + scale)
                        └ .bte-shadow (grounded)
                        └ .dinosaurs (the original 200×210 design box) └ …art…
   - All CSS is injected once into <head>, every rule scoped under `.bte`.
   - Pure DOM/CSS. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  var DESIGN_W = 200, DESIGN_H = 210;   // the original .dinosaurs block's box

  /* ---- the art: ONE copy. The exact Pug tree, as nested divs. Keep the
         ORDER + NESTING — it is the paint order the look relies on (the egg
         halves sit over the dino body; hands grip over the egg rim). ---- */
  var MARKUP =
    '<div class="dinosaurs">' +
      '<div class="dinosaurs__face">' +
        '<div class="dinosaurs__face-inner">' +
          '<div class="dinosaurs__eye dinosaurs__eye--right"></div>' +
          '<div class="dinosaurs__eye dinosaurs__eye--left"></div>' +
          '<div class="dinosaurs__face-jagged"><div class="dinosaurs__face-jagged-part"></div></div>' +
          '<div class="dinosaurs__mouth-top"><div class="dinosaurs__mouth-top-inner"></div></div>' +
          '<div class="dinosaurs__mouth-bottom"><div class="dinosaurs__mouth-bottom-inner"></div></div>' +
        '</div>' +
        '<div class="dinosaurs__tails"><div class="dinosaurs__tails-jagged"></div></div>' +
      '</div>' +
      '<div class="egg">' +
        '<div class="egg__top"><div class="egg__top-body"></div></div>' +
        '<div class="egg__top-jagged">' +
          '<div class="egg__top-jagged-part"></div><div class="egg__top-jagged-part"></div>' +
          '<div class="egg__top-jagged-part"></div><div class="egg__top-jagged-part"></div>' +
        '</div>' +
        '<div class="egg__bottom"><div class="egg__bottom-body"></div></div>' +
        '<div class="egg__bottom-jagged">' +
          '<div class="egg__bottom-jagged-part"></div><div class="egg__bottom-jagged-part"></div>' +
          '<div class="egg__bottom-jagged-part"></div><div class="egg__bottom-jagged-part"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dinosaurs__hand dinosaurs__hand--right"><div class="dinosaurs__claw"></div></div>' +
      '<div class="dinosaurs__hand dinosaurs__hand--left"><div class="dinosaurs__claw"></div></div>' +
      '<div class="balloon"><div class="heart"></div></div>' +
    '</div>';

  /* ---- the egg SHELL look. The original was a flat bluish-grey (#98adbb);
         this makes it a real-looking egg before it hatches: an off-white shell
         with a soft highlight, fine black/grey SPECKLES (so the surface reads
         as textured, not flat) and a few hairline CRACKS. The green dino is
         untouched. ---- */
  // shell base colour as a CSS var so a CLICK can recolour the whole shell
  // (speckles + cracks stay); cycled through EGG_PACKS by cycleEggColor().
  var EGG = 'var(--bte-egg,#efe8d6)';            // off-white shell
  var EGG_EDGE = 'var(--bte-egg-edge,#e6ddc9)';  // slightly shaded cracked-rim edges
  var EGG_PACKS = [
    ['#efe8d6', '#e6ddc9'],   // off-white (default)
    ['#cfe3f0', '#b9d4e6'],   // pale blue
    ['#f5d5e0', '#ecc1d2'],   // pale pink
    ['#d6ecc6', '#c2e0ad'],   // mint green
    ['#f6ecb8', '#efe19f'],   // pale yellow
  ];
  // speckles: an 84px SVG tile of IRREGULARLY scattered tiny dots (grey + a few
  // darker) — organic, not the grid a tiled radial-gradient would give.
  var SPECKLE = "background-image:url(\"data:image/svg+xml," +
    "%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84'%3E" +
    "%3Cg fill='%234a4136'%3E" +
    "%3Ccircle cx='6' cy='9' r='1.3'/%3E%3Ccircle cx='23' cy='4' r='.9'/%3E%3Ccircle cx='39' cy='13' r='1.5'/%3E" +
    "%3Ccircle cx='55' cy='6' r='1'/%3E%3Ccircle cx='71' cy='15' r='1.2'/%3E%3Ccircle cx='13' cy='25' r='1.1'/%3E" +
    "%3Ccircle cx='31' cy='31' r='.8'/%3E%3Ccircle cx='48' cy='26' r='1.4'/%3E%3Ccircle cx='65' cy='33' r='.9'/%3E" +
    "%3Ccircle cx='79' cy='39' r='1.2'/%3E%3Ccircle cx='8' cy='43' r='1.3'/%3E%3Ccircle cx='26' cy='49' r='1'/%3E" +
    "%3Ccircle cx='43' cy='45' r='.9'/%3E%3Ccircle cx='59' cy='53' r='1.5'/%3E%3Ccircle cx='75' cy='59' r='1'/%3E" +
    "%3Ccircle cx='16' cy='63' r='1.2'/%3E%3Ccircle cx='35' cy='69' r='1.3'/%3E%3Ccircle cx='51' cy='73' r='.9'/%3E" +
    "%3Ccircle cx='69' cy='77' r='1.4'/%3E%3Ccircle cx='4' cy='75' r='1'/%3E" +
    "%3C/g%3E%3Cg fill='%231f1c17' opacity='.65'%3E" +
    "%3Ccircle cx='18' cy='15' r='.7'/%3E%3Ccircle cx='47' cy='9' r='.6'/%3E%3Ccircle cx='63' cy='22' r='.8'/%3E" +
    "%3Ccircle cx='10' cy='55' r='.7'/%3E%3Ccircle cx='41' cy='59' r='.6'/%3E%3Ccircle cx='73' cy='49' r='.7'/%3E" +
    "%3Ccircle cx='29' cy='41' r='.6'/%3E%3Ccircle cx='57' cy='67' r='.7'/%3E" +
    "%3C/g%3E%3C/svg%3E\");background-size:84px 84px;";
  var SHELL = 'background-color:' + EGG + ';' + SPECKLE;
  var CRACK =                 // a thin jagged hairline crack (clip-path zig-zag)
    'background:rgba(70,60,48,.5);' +
    'clip-path:polygon(50% 0,38% 16%,57% 28%,40% 46%,58% 62%,42% 82%,52% 100%,46% 100%,40% 82%,55% 62%,36% 46%,52% 28%,34% 16%,46% 0);';

  /* ---- CSS, injected once. This is the playground's compiled CSS (SCSS vars
         resolved, prefixes dropped), with EVERY selector scoped under `.bte`
         — including the global `*{position:relative}` / pseudo reset it needs. */
  var CSS = [
    /* the placed wrapper + grounded shadow (module chrome, not in the original) */
    '.bte{position:absolute;width:' + DESIGN_W + 'px;height:' + DESIGN_H + 'px;box-sizing:content-box;',
      'transform-origin:bottom center;transform:translateX(-50%) scale(var(--bte-s,1));',
      'pointer-events:auto;}',
    /* rolling layer (only present on a roll()-ed egg): tumbles about its centre
       while the wrapper translates across; 2-class selector beats the * reset */
    '.bte .bte-roll{position:absolute;top:0;left:0;width:' + DESIGN_W + 'px;height:' + DESIGN_H + 'px;',
      'transform-box:content-box;transform-origin:50% 50%;}',
    /* >.bte-shadow / .bte .bte-pop use a 2-class selector so the scoped
       `.bte *{position:relative}` reset (equal specificity, declared later)
       can't flip these module helpers back to relative. */
    '.bte>.bte-shadow{position:absolute;left:50%;bottom:-8px;width:150px;height:26px;',
      'transform:translateX(-50%);border-radius:50%;',
      'background:radial-gradient(ellipse at center,rgba(40,40,30,.30),rgba(0,0,0,0) 72%);',
      'pointer-events:none;}',

    /* the playground's GLOBAL rules, scoped so they can't leak to the host.
       NOTE: descendants only (`.bte *`) — NOT `.bte` itself, or it would
       override the wrapper's own position:absolute at equal specificity. */
    /* every animation is gated behind the inherited --bte-play custom property:
       default `paused` freezes the egg on its closed 0% frame (fill-mode:both),
       and clicking flips it to `running` for one loop (see hatch()/place()).
       !important is required: each element's `animation:` SHORTHAND otherwise
       resets animation-play-state back to running and outranks this rule. */
    '.bte *{position:relative;box-sizing:content-box;animation-play-state:var(--bte-play,paused)!important;}',
    '.bte *::before,.bte *::after{position:absolute;content:"";animation-play-state:var(--bte-play,paused)!important;}',

    /* root design box (was position:absolute; centred via calc — here it fills .bte) */
    '.bte .dinosaurs{position:absolute;top:0;left:0;width:' + DESIGN_W + 'px;height:' + DESIGN_H + 'px;}',

    /* ── the dino ── */
    '.bte .dinosaurs__face{position:absolute;top:34px;left:0;width:155px;height:105px;}',
    '.bte .dinosaurs__face-inner{position:absolute;top:42px;left:39px;width:114px;height:103px;',
      'border-radius:18px;background-color:#aadca9;',
      'animation:bteFace 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .dinosaurs__face-inner::before{top:76px;left:-13px;width:50px;height:42px;',
      'border-radius:50%;background-color:#aadca9;}',

    '.bte .dinosaurs__eye{position:absolute;width:15px;height:15px;border-radius:50%;',
      'background-color:#fff;top:26px;z-index:5;}',
    '.bte .dinosaurs__eye::before{top:2px;left:2px;width:5px;height:5px;border-radius:50%;background-color:#000;}',
    '.bte .dinosaurs__eye--right{left:42px;}',
    '.bte .dinosaurs__eye--left{top:20px;left:0px;}',

    '.bte .dinosaurs__face-jagged{position:absolute;top:31px;right:-23px;width:23px;height:59px;overflow:hidden;}',
    '.bte .dinosaurs__face-jagged-part{position:absolute;width:0;height:0;',
      'border-left:18px solid #7abd9a;border-top:9px solid transparent;border-bottom:16px solid transparent;',
      'top:3px;left:0;transform:rotate(0);',
      'animation:bteBeforenone 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .dinosaurs__face-jagged-part::before,.bte .dinosaurs__face-jagged-part::after{width:0;height:0;transform:rotate(0);}',
    '.bte .dinosaurs__face-jagged-part::before{border-left:14px solid #7abd9a;border-top:12px solid transparent;border-bottom:12px solid transparent;top:8px;left:-19px;}',
    '.bte .dinosaurs__face-jagged-part::after{border-left:11px solid #7abd9a;border-top:9px solid transparent;border-bottom:8px solid transparent;top:26px;left:-19px;}',

    '.bte .dinosaurs__mouth-top{position:absolute;top:27px;left:-39px;width:114px;height:35px;overflow:hidden;',
      'transform:rotate(6deg);animation:bteBeforenone 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .dinosaurs__mouth-top-inner{position:absolute;top:0;left:0;width:122px;height:103px;border-radius:27px;background-color:#aadca9;}',
    '.bte .dinosaurs__mouth-bottom{position:absolute;top:46px;left:-40px;width:114px;height:35px;overflow:hidden;transform:rotate(6deg);}',
    '.bte .dinosaurs__mouth-bottom-inner{position:absolute;bottom:0;left:0;width:122px;height:103px;border-radius:27px;background-color:#aadca9;}',

    '.bte .dinosaurs__tails{position:absolute;width:0;height:0;',
      'border-top:66px solid #aadca9;border-left:14px solid transparent;border-right:14px solid transparent;',
      'top:105px;right:-31px;transform:rotate(-34deg);animation:bteTail 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .dinosaurs__tails-jagged{position:absolute;width:0;height:0;',
      'border-left:11px solid #7abd9a;border-top:9px solid transparent;border-bottom:8px solid transparent;',
      'top:-62px;left:11px;transform:rotate(12deg);}',
    '.bte .dinosaurs__tails-jagged::before,.bte .dinosaurs__tails-jagged::after{width:0;height:0;left:-11px;',
      'border-left:7px solid #7abd9a;border-top:6px solid transparent;border-bottom:6px solid transparent;transform:rotate(0);}',
    '.bte .dinosaurs__tails-jagged::before{top:8px;}',
    '.bte .dinosaurs__tails-jagged::after{top:21px;}',

    '.bte .dinosaurs__hand{position:absolute;top:0;left:0;width:36px;height:25px;border-radius:50%;',
      'border-bottom-left-radius:5px;border-bottom-right-radius:5px;background-color:#7abd9a;',
      'animation:bteHand 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .dinosaurs__hand--left{top:111px;left:14px;transform:rotate(-18deg);}',
    '.bte .dinosaurs__hand--left .dinosaurs__claw{border-top:5px solid #fff;border-left:7px solid transparent;border-right:1px solid transparent;bottom:-5px;left:25px;}',
    '.bte .dinosaurs__hand--left .dinosaurs__claw::before{border-top:5px solid #fff;border-left:7px solid transparent;border-right:3px solid transparent;bottom:0px;left:-17px;}',
    '.bte .dinosaurs__hand--left .dinosaurs__claw::after{border-top:5px solid #fff;border-left:8px solid transparent;border-right:3px solid transparent;bottom:0;left:-26px;}',
    '.bte .dinosaurs__hand--right{top:110px;left:82px;transform:rotate(18deg);}',
    '.bte .dinosaurs__hand--right .dinosaurs__claw{border-top:5px solid #fff;border-left:1px solid transparent;border-right:7px solid transparent;bottom:-5px;left:3px;}',
    '.bte .dinosaurs__hand--right .dinosaurs__claw::before{border-top:5px solid #fff;border-left:3px solid transparent;border-right:7px solid transparent;bottom:0;left:7px;}',
    '.bte .dinosaurs__hand--right .dinosaurs__claw::after{border-top:5px solid #fff;border-left:3px solid transparent;border-right:8px solid transparent;bottom:0;left:17px;}',
    '.bte .dinosaurs__claw{position:absolute;border-top:6px solid #fff;border-left:3px solid transparent;border-right:7px solid transparent;bottom:-6px;left:3px;}',
    '.bte .dinosaurs__claw::before,.bte .dinosaurs__claw::after{bottom:0;border-top:6px solid #fff;border-left:3px solid transparent;}',
    '.bte .dinosaurs__claw::before{border-right:7px solid transparent;left:7px;}',
    '.bte .dinosaurs__claw::after{border-right:6px solid transparent;left:17px;}',

    /* ── the egg ── */
    '.bte .egg__top{position:absolute;top:34px;left:21px;width:135px;height:50px;overflow:hidden;',
      'transform:rotate(0);animation:bteEggTop 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .egg__top-body{position:absolute;top:0;left:0;width:100%;height:115px;' + SHELL +
      'border-radius:50%;border-bottom-left-radius:0;border-bottom-right-radius:0;}',
    '.bte .egg__top-body::before{left:72px;top:7px;width:10px;height:28px;transform:rotate(11deg);' + CRACK + '}',
    '.bte .egg__top-jagged{position:absolute;width:145px;height:40px;top:70px;left:18px;',
      'transform:rotate(0);animation:bteEggTopJagged 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .egg__top-jagged::after{top:-2px;left:14px;width:112px;height:84px;' + SHELL +
      'border-radius:62%;border-bottom-left-radius:0;border-bottom-right-radius:0;',
      'animation:bteAfternone 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .egg__top-jagged-part{position:absolute;width:0;height:0;',
      'border-top-color:' + EGG_EDGE + ';border-top-style:solid;border-left-color:transparent;border-left-style:solid;',
      'border-right-color:transparent;border-right-style:solid;}',
    '.bte .egg__top-jagged-part:nth-of-type(1){top:9px;left:2px;border-top-width:28px;border-left-width:0;border-right-width:42px;transform:rotate(14deg);}',
    '.bte .egg__top-jagged-part:nth-of-type(2){top:4px;left:20px;border-top-width:28px;border-left-width:39px;border-right-width:31px;transform:rotate(13deg);}',
    '.bte .egg__top-jagged-part:nth-of-type(3){top:2px;left:59px;border-top-width:28px;border-left-width:38px;border-right-width:28px;transform:rotate(13deg);}',
    '.bte .egg__top-jagged-part:nth-of-type(4){top:12px;left:110px;border-top-width:20px;border-left-width:29px;border-right-width:0;transform:rotate(-15deg);}',
    '.bte .egg__bottom{position:absolute;top:134px;left:11px;width:155px;height:67px;overflow:hidden;transform:rotate(0);}',
    '.bte .egg__bottom-body{position:absolute;bottom:0;left:0;width:100%;height:84px;' + SHELL +
      'border-radius:50%;border-top-left-radius:0;border-top-right-radius:0;}',
    '.bte .egg__bottom-body::before{left:40px;top:30px;width:13px;height:42px;transform:rotate(-7deg);' + CRACK + '}',
    '.bte .egg__bottom-body::after{left:104px;top:36px;width:10px;height:30px;transform:rotate(9deg);' + CRACK + '}',
    '.bte .egg__bottom-jagged{position:absolute;width:155px;height:40px;top:110px;left:13px;}',
    '.bte .egg__bottom-jagged::before,.bte .egg__bottom-jagged::after{width:20px;background-color:' + EGG + ';',
      'animation:bteAfternone 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .egg__bottom-jagged::before{top:-24px;left:3px;height:50px;transform:rotate(12deg);}',
    '.bte .egg__bottom-jagged::after{top:-22px;right:7px;height:49px;transform:rotate(-11deg);}',
    '.bte .egg__bottom-jagged-part{position:absolute;width:0;height:0;',
      'border-bottom-color:' + EGG_EDGE + ';border-bottom-style:solid;border-left-color:transparent;border-left-style:solid;',
      'border-right-color:transparent;border-right-style:solid;}',
    '.bte .egg__bottom-jagged-part:nth-of-type(1){top:13px;left:-1px;border-bottom-width:16px;border-left-width:8px;border-right-width:27px;transform:rotate(17deg);}',
    '.bte .egg__bottom-jagged-part:nth-of-type(2){top:10px;left:10px;border-bottom-width:18px;border-left-width:30px;border-right-width:30px;transform:rotate(-12deg);}',
    '.bte .egg__bottom-jagged-part:nth-of-type(3){top:9px;left:61px;border-bottom-width:20px;border-left-width:34px;border-right-width:32px;transform:rotate(8deg);}',
    '.bte .egg__bottom-jagged-part:nth-of-type(4){top:7px;left:104px;border-bottom-width:20px;border-left-width:34px;border-right-width:13px;transform:rotate(-8deg);}',

    /* ── balloon + heart ── */
    '.bte .balloon{position:absolute;top:-4px;left:-95px;width:80px;height:80px;background-color:#fff;',
      'border-radius:50%;opacity:0;transform:rotate(-10deg);animation:bteBalloon 4s linear normal infinite;animation-fill-mode:both;}',
    '.bte .balloon::before{right:0;bottom:1px;width:0;height:0;',
      'border-top:20px solid #fff;border-left:8px solid transparent;border-right:8px solid transparent;transform:rotate(-42deg);}',
    '.bte .heart{position:absolute;width:40px;height:40px;top:25px;left:20px;}',
    '.bte .heart::before,.bte .heart::after{top:0;width:20px;height:30px;background-color:#f99b9a;border-radius:50px 50px 0 0;}',
    '.bte .heart::before{left:20px;transform-origin:0 100%;transform:rotate(-45deg);}',
    '.bte .heart::after{left:0;transform-origin:100% 100%;transform:rotate(45deg);}',

    /* click-pop hearts (module nicety, drawn above the egg) */
    '.bte .bte-pop{position:absolute;left:50%;top:18%;width:18px;height:16px;pointer-events:none;}',
    '.bte .bte-pop::before,.bte .bte-pop::after{content:"";position:absolute;top:0;width:9px;height:14px;background:#f76f9e;border-radius:9px 9px 0 0;}',
    '.bte .bte-pop::before{left:9px;transform-origin:0 100%;transform:rotate(-45deg);}',
    '.bte .bte-pop::after{left:0;transform-origin:100% 100%;transform:rotate(45deg);}',

    /* ── keyframes (resolved from the SCSS mixin) ── */
    '@keyframes bteEggTop{0%{top:34px;left:21px;width:135px;transform:rotate(0)}25%{top:34px;left:21px;width:135px;transform:rotate(0)}35%{top:-2px;left:35px;width:138px;transform:rotate(12deg)}100%{top:-2px;left:35px;width:138px;transform:rotate(12deg)}}',
    '@keyframes bteEggTopJagged{0%{top:70px;left:18px;transform:rotate(0)}25%{top:70px;left:18px;transform:rotate(0)}35%{top:29px;left:28px;transform:rotate(12deg)}100%{top:29px;left:28px;transform:rotate(12deg)}}',
    '@keyframes bteFace{0%{top:42px;opacity:0}25%{top:42px;opacity:0}35%{top:0;opacity:1}100%{top:0;opacity:1}}',
    /* opacity added to bteTail/bteHand so the dino is fully hidden on the closed
       0% frame (the egg rests closed now) — they fade in only as it opens. */
    '@keyframes bteTail{0%{opacity:0;top:80px;right:10px;transform:rotate(-118deg)}30%{opacity:0;top:80px;right:10px;transform:rotate(-118deg)}40%{opacity:1;top:105px;right:-31px;transform:rotate(-34deg)}100%{opacity:1;top:105px;right:-31px;transform:rotate(-34deg)}}',
    '@keyframes bteHand{0%{opacity:0;transform:rotateX(-90deg)}25%{opacity:0;transform:rotateX(-90deg)}35%{opacity:1;transform:rotateX(0)}100%{opacity:1;transform:rotateX(0)}}',
    '@keyframes bteAfternone{0%{opacity:1}25%{opacity:1}26%{opacity:0}100%{opacity:0}}',
    '@keyframes bteBeforenone{0%{opacity:0}5%{opacity:0}15%{opacity:1}100%{opacity:1}}',
    '@keyframes bteBalloon{0%{opacity:0}35%{opacity:0}40%{opacity:1}100%{opacity:1}}',
    '@keyframes btePopRise{0%{opacity:0;transform:translate(-50%,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-90px) scale(1)}}',
  ].join('');

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'baby-trex-egg-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* one document-level capture click handler hit-tests each egg's LIVE box and
     plays its hatch (and stops the click reaching the scene behind it). */
  /* recolour the shell on click (off-white → blue → pink → mint → yellow → …) */
  function cycleEggColor(wrap) {
    wrap._egg = ((wrap._egg == null ? 0 : wrap._egg) + 1) % EGG_PACKS.length;
    var p = EGG_PACKS[wrap._egg];
    wrap.style.setProperty('--bte-egg', p[0]);
    wrap.style.setProperty('--bte-egg-edge', p[1]);
  }

  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof document === 'undefined') return;
    clickBound = true;
    document.addEventListener('click', function (e) {
      // never swallow a click meant for the game UI (the form sits above the scene)
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = document.querySelectorAll('.bte');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          var w = list[i];
          if (w._roll) rollClick(w);            // stop rolling + settle + hatch
          else { cycleEggColor(w); hatch(w); }
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* play the hatch ONCE on click: flip the gate to `running`. The egg's 4s loop
     goes closed → open → hold → (snaps back to closed at the loop boundary);
     the animationiteration listener wired in place() pauses it exactly there, so
     one click = one hatch-and-close, and it's ready to be clicked again. */
  function hatch(wrap) {
    if (!wrap || wrap._hatching) return;
    wrap._hatching = true;
    wrap.style.setProperty('--bte-play', 'running');
    fireHearts(wrap);
  }

  /* a few hearts that rise above the egg and fade */
  function fireHearts(wrap) {
    if (typeof document === 'undefined') return;
    var n = 3 + (Math.random() * 2 | 0);
    for (var i = 0; i < n; i++) {
      var h = document.createElement('div');
      h.className = 'bte-pop';
      h.style.left = (50 + (Math.random() - 0.5) * 46) + '%';
      h.style.top = (16 + (Math.random() - 0.5) * 12) + '%';
      wrap.appendChild(h);
      (function (el, idx) {
        if (el.animate) {
          el.animate(
            [{ opacity: 0, transform: 'translate(-50%,0) scale(.4)' },
             { opacity: 1, transform: 'translate(-50%,-22px) scale(1)', offset: 0.25 },
             { opacity: 0.9, offset: 0.6 },
             { opacity: 0, transform: 'translate(-50%,-96px) scale(1.05)' }],
            { duration: 1500, delay: idx * 120, easing: 'ease-out', fill: 'forwards' })
            .onfinish = function () { if (el.parentNode) el.remove(); };
        } else {
          setTimeout(function () { if (el.parentNode) el.remove(); }, 1700);
        }
      })(h, i);
    }
  }

  /* place one hatching egg into a container */
  function place(container, options) {
    ensureCSS();
    ensureClickHandler();
    var o = options || {};
    if (!container) return null;
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var ch = container.clientHeight || (global.innerHeight || 600);
    var h = o.height == null ? 220 : o.height;
    var px = typeof h === 'number' ? h
           : (/%\s*$/.test(h) ? ch * parseFloat(h) / 100 : parseFloat(h));
    var scale = px / DESIGN_H;

    var wrap = document.createElement('div');
    wrap.className = 'bte';
    wrap.style.left = o.left != null ? o.left : '50%';
    wrap.style.bottom = o.bottom != null ? o.bottom : '6%';
    if (o.zIndex != null) wrap.style.zIndex = o.zIndex;
    wrap.style.setProperty('--bte-s', scale);
    wrap.innerHTML = '<div class="bte-shadow"></div>' + MARKUP;
    container.appendChild(wrap);
    // when the (one) running loop hits its boundary it is back at the closed 0%
    // frame — pause it there so the egg rests closed until the next click.
    var topEl = wrap.querySelector('.egg__top');
    if (topEl) topEl.addEventListener('animationiteration', function () {
      wrap.style.setProperty('--bte-play', 'paused');
      wrap._hatching = false;
    });
    return { element: wrap, remove: function () { if (wrap.parentNode) wrap.remove(); } };
  }

  /* read an element's current rotation (deg) from its computed matrix */
  function currentRot(el) {
    if (typeof getComputedStyle === 'undefined') return 0;
    var m = getComputedStyle(el).transform;
    if (!m || m === 'none') return 0;
    var v = m.match(/matrix\(([^)]+)\)/);
    if (!v) return 0;
    var p = v[1].split(',');
    return Math.atan2(parseFloat(p[1]), parseFloat(p[0])) * 180 / Math.PI;
  }

  /* a click on a ROLLING egg: stop the crossing, settle it upright, hatch. The
     hatch's loop-boundary listener then resumes the roll. */
  function rollClick(wrap) {
    if (wrap._hatching) return;
    var rollLayer = wrap.querySelector('.bte-roll');
    if (wrap._moveAnim) { try { wrap._moveAnim.pause(); } catch (e) {} }
    if (rollLayer) {
      var ang = currentRot(rollLayer);
      if (wrap._spinAnim) { try { wrap._spinAnim.cancel(); } catch (e) {} wrap._spinAnim = null; }
      if (rollLayer.animate)
        wrap._settleAnim = rollLayer.animate(
          [{ transform: 'rotate(' + ang + 'deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 280, easing: 'ease-out', fill: 'forwards' });
    }
    cycleEggColor(wrap);
    hatch(wrap);
  }

  /* after a hatch cycle, the rolling egg trundles on again */
  function resumeRoll(wrap) {
    if (!wrap._roll || wrap._stopped) return;
    if (wrap._settleAnim) { try { wrap._settleAnim.cancel(); } catch (e) {} wrap._settleAnim = null; }
    if (wrap._moveAnim) { try { wrap._moveAnim.play(); } catch (e) {} }
    if (wrap._spin) wrap._spin();
  }

  /* place an egg that slowly ROLLS across the container (like the dinosaurs
     cross); clicking it stops it + plays the hatch, then it rolls on.
       BabyTrexEgg.roll(container, { direction, duration, height, bottom, zIndex,
                                     gapMin, gapMax })  -> { element, stop(), remove() } */
  function roll(container, options) {
    ensureCSS();
    ensureClickHandler();
    var o = options || {};
    if (!container) return { stop: function () {}, remove: function () {} };
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var ch = container.clientHeight || (global.innerHeight || 600);
    var h = o.height == null ? 150 : o.height;
    var px = typeof h === 'number' ? h : (/%\s*$/.test(h) ? ch * parseFloat(h) / 100 : parseFloat(h));

    var wrap = document.createElement('div');
    wrap.className = 'bte';
    wrap.style.bottom = o.bottom != null ? o.bottom : '5%';
    if (o.zIndex != null) wrap.style.zIndex = o.zIndex;
    wrap.style.setProperty('--bte-s', px / DESIGN_H);
    wrap.style.setProperty('--bte-play', 'paused');     // stays closed while rolling
    wrap.innerHTML = '<div class="bte-shadow"></div><div class="bte-roll">' + MARKUP + '</div>';
    container.appendChild(wrap);
    wrap._roll = true;
    var rollLayer = wrap.querySelector('.bte-roll');

    var topEl = wrap.querySelector('.egg__top');
    if (topEl) topEl.addEventListener('animationiteration', function () {
      wrap.style.setProperty('--bte-play', 'paused');   // back to closed at the loop boundary
      wrap._hatching = false;
      resumeRoll(wrap);                                  // …and roll on
    });

    var dir = o.direction || (Math.random() < 0.5 ? 'ltr' : 'rtl');
    var dur = o.duration != null ? o.duration : 24000;
    var gapMin = o.gapMin != null ? o.gapMin : 4000, gapMax = o.gapMax != null ? o.gapMax : 12000;

    wrap._spin = function () {
      if (!rollLayer || !rollLayer.animate || wrap._stopped || wrap._hatching) return;
      wrap._spinAnim = rollLayer.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (dir === 'ltr' ? 360 : -360) + 'deg)' }],
        { duration: 5200, iterations: Infinity, easing: 'linear' });
    };
    function cross() {
      if (wrap._stopped) return;
      if (wrap._moveAnim) { try { wrap._moveAnim.cancel(); } catch (e) {} }
      if (wrap._spinAnim) { try { wrap._spinAnim.cancel(); } catch (e) {} wrap._spinAnim = null; }
      var s = dir === 'ltr' ? -12 : 112, en = dir === 'ltr' ? 112 : -12;
      wrap.style.left = s + '%';
      if (wrap.animate) {
        wrap._moveAnim = wrap.animate([{ left: s + '%' }, { left: en + '%' }],
          { duration: dur, easing: 'linear', fill: 'forwards' });
        wrap._moveAnim.onfinish = function () {
          if (wrap._stopped) return;
          dir = dir === 'ltr' ? 'rtl' : 'ltr';
          wrap._gapT = setTimeout(cross, gapMin + Math.random() * (gapMax - gapMin));
        };
      }
      wrap._spin();
    }
    cross();

    var doStop = function () {
      wrap._stopped = true;
      if (wrap._moveAnim) { try { wrap._moveAnim.cancel(); } catch (e) {} }
      if (wrap._spinAnim) { try { wrap._spinAnim.cancel(); } catch (e) {} }
      if (wrap._settleAnim) { try { wrap._settleAnim.cancel(); } catch (e) {} }
      clearTimeout(wrap._gapT);
      if (wrap.parentNode) wrap.remove();
    };
    return { element: wrap, stop: doStop, remove: doStop };
  }

  /* fire an action on the live instance(s) — handy for testing.
     name: 'hearts' = just hearts; anything else ('hatch'/default) = play the
     hatch. -> count of instances acted on. */
  function trigger(name) {
    if (typeof document === 'undefined') return 0;
    var list = document.querySelectorAll('.bte'), n = 0;
    for (var i = 0; i < list.length; i++) {
      if (name === 'hearts') fireHearts(list[i]);
      else hatch(list[i]);
      n++;
    }
    return n;
  }

  global.BabyTrexEgg = { place: place, roll: roll, trigger: trigger, markup: MARKUP, css: CSS };
})(typeof window !== 'undefined' ? window : this);
