/* =====================================================================
   eevee.js — EEVEE (#133) as a drop-in BACKGROUND CHARACTER.
   ---------------------------------------------------------------------
   Extracted from backgrounds/pokemons/evee.html — the pure-CSS Eevee
   pen by David Khourshid (codepen.io/davidkpiano). The SCSS was hand
   compiled to plain CSS: variables + lighten()/darken() resolved
   (lighten(#C49152,15%)=#D7B58B, darken(#6a3c1c,4%)=#5A3318), and the
   beat-map `effect()` mixin expanded — every map key is a beat on a
   13-beat / 10s master timeline, so frame% = beat/13. The div rig is
   kept 1:1; ALL selectors are scoped under .pkev and every keyframe is
   prefixed pkev* so nothing collides with a host page. The pen's .dex
   panel/page chrome were dropped; its dead `a(legs)` animation (no such
   keyframes) was omitted.

   The whole performance is ONE looping 10s timeline shared by every
   part (with tiny stagger delays): idle breathing-bounce → a hop-shake
   with ear flicks (~beat 4.5) → blink → crouch + POUNCE attack (mouth
   opens via a step-end property morph, ears flap, tail-tip wags,
   beats 10-12) → loop.

   THE POKEMON-OBJECT PATTERN (one file per pokemon, shared registry):
       window.Pokemons.eevee = {
         name, dexId, nativeW: 410, nativeH: 325, footFrac,
         place({parent, height, left, right, bottom, z,
                flip, shadow, paused}) → instance
       }
       instance = { element,            // the positioning wrapper
                    refit(),            // re-scale after a resize
                    setFlip(bool),      // faces LEFT natively
                    setPaused(bool),    // freeze/resume the timeline
                    setWalking(bool),   // the stepping gait (manual)
                    stars(),            // golden Swift star burst (see below)
                    patrol(opts),       // WALK side to side of the parent
                    remove() }
   CLICK → SWIFT: clicking Eevee bursts golden stars out of it (its
   signature move) — spinning 5-point SVG stars flying outward + a soft
   golden flash, ~1s, auto-removed. Detected via a document capture-phase
   listener hit-testing the live bounding box (game-UI filtered).
   inst.stars() fires it on demand.
   patrol({speed:px/s, edgePad, pauseMs:[min,max]}) starts walking the
   parent's full width edge-to-edge forever: a linear WAAPI translateX
   on the wrapper carries the figure; at each edge it stops for a beat,
   turns (setFlip to face the travel direction) and heads back. Returns
   {stop, setPaused} — also wired into remove()/setPaused(). Only one
   patrol per instance (restarting replaces the previous one).

   WALK GAIT: while patrolling, the pk-walk wrapper class swaps the four
   legs from the slow master-timeline rock onto proper stepping
   keyframes — thighs swing about the hip in DIAGONAL pairs (legs 1+4 /
   2+3), shins counter-bend at the knee, cadence --pk-step ∝ speed
   (~one cycle per 60px). The rest of the rig (bounce, ears, tail,
   blinks, pounce) keeps running its own 10s show on top.
   place() injects the CSS once (style#pokemon-eevee-css), builds
   wrapper(.pkw-ev) > scale-layer(.pkev-sc) > figure(.pkev), scales the
   410×325 canvas to the wrapper height (like fitOlaf) and sets the
   wrapper width. The paw line sits ~8% above the canvas bottom
   (footFrac) — nudge `bottom` accordingly when grounding it.
   ES5, file:// safe, no dependencies.
   ===================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var NATIVE_W = 410, NATIVE_H = 325;
  var EASE = 'cubic-bezier(0.645,0.045,0.355,1)';

  /* animation shorthand — the pen's a($name,$delay): 10s master clock */
  function A(name, delay) {
    return 'pkev' + name + ' 10s ' + EASE + ' ' + (delay || '0s') + ' infinite both';
  }

  /* the two bounce beat-groups shared by most tracks (beat/13 → %) */
  var DOWN = '0%,7.6923%,15.3846%,23.0769%,30.7692%,46.1538%,53.8462%,61.5385%,69.2308%,100%';
  var UP = '3.8462%,11.5385%,19.2308%,26.9231%,50%,57.6923%,65.3846%,73.0769%';

  var CSS = [
    /* ── wrapper / scale plumbing (house sprite pattern) ── */
    '.pkw-ev{position:absolute;pointer-events:none;will-change:transform}',
    '.pkw-ev .pkev-sc{position:absolute;left:0;bottom:0;transform-origin:0 100%}',
    '.pkw-ev .pk-shadow{position:absolute;left:50%;bottom:0;width:76%;height:7%;transform:translateX(-50%);',
    '  border-radius:50%;background:radial-gradient(ellipse,rgba(15,25,20,.32),transparent 70%)}',
    /* flip carries the grounding translateY too (see .pkev below) */
    '.pkw-ev.pk-flip .pkev{transform:translateY(26px) scaleX(-1)}',
    '.pkw-ev.pk-paused .pkev,.pkw-ev.pk-paused .pkev *,',
    '.pkw-ev.pk-paused .pkev *::before,.pkw-ev.pk-paused .pkev *::after{animation-play-state:paused}',

    /* ── the figure canvas — pen globals reproduced LOCALLY: everything
          inside is absolute + border-box (pseudos set their own pos).
          translateY(26px) DROPS the whole rig ~26px within the canvas so the
          paws land ON the floor (footFrac≈1.0) — the pen left the feet ~26px
          above the canvas bottom, floating above the shadow. ── */
    '.pkev{position:relative;height:325px;width:410px;transform:translateY(26px)}',
    '.pkev *{position:absolute;box-sizing:border-box}',
    '.pkev *::before,.pkev *::after{box-sizing:border-box}',

    /* ── body ── */
    '.pkev .body{animation:' + A('Body') + ';height:100px;width:125px;top:164px;left:140px;',
    '  background:#C49152;border-top-right-radius:30%;border-bottom-right-radius:50%;',
    '  border-bottom-left-radius:70%;box-shadow:inset -15px 0 0 #9D7442}',

    /* ── chest + the three fur tufts ── */
    '.pkev .chest{animation:' + A('Chest', '0.05s') + ';height:110%;width:130px;left:-30px;z-index:1}',
    '.pkev .fur{height:80px;width:80px;top:0;border-radius:50%;',
    '  background:linear-gradient(to top,#EFE1AF,#fff 40%,#fff 50%,#EFE1AF 75%)}',
    '.pkev .fur>.patch::before,.pkev .fur>.patch::after{content:"";display:block;position:absolute;',
    '  width:100%;height:100%;border-bottom-left-radius:100%;',
    '  background:linear-gradient(-30deg,#BFB48C,#EFE1AF 6%,#fff 55%,transparent)}',
    '.pkev .fur:first-child{animation:' + A('FurCenter', '0.1s') + ';height:110px;width:110px;',
    '  left:calc(50% - 55px);z-index:1;',
    '  box-shadow:inset 0 0 0 2px rgba(0,0,0,.2),3px 0 15px rgba(0,0,0,.2)}',
    '.pkev .fur:first-child>.patch{height:50%;width:50%;left:25%;bottom:8%;transform-style:flat}',
    '.pkev .fur:first-child>.patch::before{animation:' + A('FurCenterPatchL') + ';left:25%;top:0;',
    '  transform:rotate(65deg) skewX(15deg);box-shadow:2px 0 #BFB48C;',
    '  background:linear-gradient(-45deg,#BFB48C,#EFE1AF 9%,transparent 20%);',
    '  border-top-right-radius:60%;border-bottom-right-radius:8%}',
    '.pkev .fur:first-child>.patch::after{animation:' + A('FurCenterPatchR', '0.07s') + ';left:auto;right:25%;top:0;',
    '  transform:rotate(35deg) skewX(15deg);box-shadow:0 3px #BFB48C;',
    '  background:linear-gradient(-37deg,#BFB48C,#EFE1AF 9%,transparent 20%);',
    '  border-top-right-radius:0;border-bottom-left-radius:60%;border-bottom-right-radius:8%}',
    '.pkev .fur:nth-child(2){left:-3px}',
    '.pkev .fur:nth-child(3){animation:' + A('FurRight', '0.15s') + ';right:-20px}',
    '.pkev .fur:not(:first-child)>.patch{height:35%;width:35%;bottom:10%;left:30%}',
    '.pkev .fur:not(:first-child)>.patch::before,.pkev .fur:not(:first-child)>.patch::after{',
    '  animation:' + A('FurRightPatch') + ';top:-15%;left:110%;transform-origin:top left;',
    '  box-shadow:2px 0 #BFB48C;border-top-right-radius:75%;border-bottom-right-radius:10%}',
    '.pkev .fur:not(:first-child)>.patch::before{left:150%;top:-25%}',
    '.pkev .fur:not(:first-child)>.patch::after{animation-delay:0.1s;left:100%;top:0}',

    /* ── head (3D stage for the eyes/ears) + crown fluff ── */
    '.pkev .head{animation:' + A('Head') + ';height:149px;width:144px;top:-110px;left:-35px;z-index:10;',
    '  transform-style:preserve-3d;perspective:1000px}',
    '.pkev .head::before{content:"";position:absolute;display:block;height:100%;width:100%;top:0;left:0}',
    '.pkev .head::after{content:"";position:absolute;display:block;height:20%;width:20%;',
    '  transform:skewX(30deg) rotate(40deg);left:50%;top:-2%;background:#C49152;',
    '  box-shadow:-15px 8px #ca9d65,-25px 22px #cca069,-35px 50px #cda36f;z-index:-1}',
    '.pkev .face{position:absolute;top:0;left:0;height:100%;width:100%;',
    '  background:linear-gradient(to top left,#9D7442,#C49152 60%,#C49152 70%,#D7B58B 100%)}',
    '.pkev .face,.pkev .face::before{border-top-left-radius:40% 50%;border-top-right-radius:40% 50%;',
    '  border-bottom-left-radius:50% 30%;border-bottom-right-radius:50% 30%}',
    '.pkev .face::before{animation:' + A('HeadShadow') + ';content:"";display:block;position:absolute;',
    '  height:100%;width:100%;background:radial-gradient(farthest-side,rgba(0,0,0,.6),transparent);',
    '  z-index:-1;top:20%;left:0}',

    /* ── ears ── */
    '.pkev .ears{width:100%;height:54px;z-index:-2}',
    '.pkev .ear{width:160px;height:70px;left:50%;bottom:10%;transform-origin:bottom left;transform:translateX(40px)}',
    '.pkev .ear::before,.pkev .ear::after{animation:' + A('Ear', '50ms') + ';content:"";position:absolute;',
    '  top:0;left:0;width:100%;height:100%;transform:skewX(-25deg) skewY(5deg);',
    '  background:radial-gradient(farthest-side,#6a3c1c,#5A3318);transform-origin:bottom left;',
    '  border:12px solid #260F02;border-top-left-radius:100%;border-bottom-right-radius:100%}',
    '.pkev .ear::after{border:8px solid #9D7442;background:transparent}',
    '.pkev .ear+.ear{transform:translateX(-40px) rotateY(180deg)}',
    '.pkev .ear>.lobe{height:20%;width:20%;background:#9D7442;bottom:25%;left:-5%;',
    '  transform:skewX(-50deg);border-top-right-radius:15%;box-shadow:9px 6px 0 #9D7442}',

    /* ── eyes (blink via the eyelid pseudo sliding down) ── */
    '.pkev .eyes{animation:' + A('Eyes') + ';width:77%;height:33%;left:5%;top:35%}',
    '.pkev .eye{height:100%;width:28%;background-color:#260F02;box-shadow:inset 0 0 0 3px #260F02;',
    '  border-top-left-radius:50% 65%;border-top-right-radius:50% 65%;',
    '  border-bottom-left-radius:50% 35%;border-bottom-right-radius:50% 35%;',
    '  background-image:radial-gradient(ellipse 5px 10px at 50% 65%,#260F02 0%,#260F02 99%,transparent 100%),',
    '   radial-gradient(ellipse 10px 20px at 50% 90%,#955D27 0%,#955D27 99%,transparent 100%),',
    '   radial-gradient(ellipse 4px 6px at 55% 20%,#fff 0%,#fff 99%,transparent 100%)}',
    '.pkev .eye:last-child{right:10%;transform:rotateY(180deg)}',
    '.pkev .eye::before{content:"";display:block;position:absolute;height:30%;width:30%;',
    '  background:transparent;border-radius:50%;border-right:3px solid #260F02;',
    '  border-left:1px solid transparent;border-top:1px solid transparent;border-bottom:1px solid transparent;',
    '  transform:rotate(-38deg);top:-4px;left:auto;right:2px;opacity:.6;z-index:1}',
    '.pkev .eye>.eyelid{height:102%;width:102%;left:-1%;top:-1%;overflow:hidden}',
    '.pkev .eye>.eyelid::before{animation:' + A('Eyelid') + ';content:"";position:absolute;display:block;',
    '  top:0;left:0;height:100%;width:100%;background:#C49152;border-bottom:3px solid #260F02;',
    '  transform-origin:center bottom;transform:translateY(-100%);border-radius:50% 50% 15% 15%}',

    /* ── nose + mouth (the mouth SHAPE morphs open with step-end during
          the pounce; the sides fade out while it is open) ── */
    '.pkev .nose{animation:' + A('Nose') + ';width:6%;height:4%;background:#260F02;',
    '  border-bottom-left-radius:50% 65%;border-bottom-right-radius:50% 65%;',
    '  border-top-left-radius:50% 35%;border-top-right-radius:50% 35%;bottom:26%;left:35%}',
    '.pkev .mouth{animation:pkevMouth 10s step-end 0s infinite none,pkevMouthMove 10s ' + EASE + ' 0s infinite none;',
    '  width:12%;height:6%;bottom:13%;left:33%;border-radius:50%;box-shadow:0 -2px #260F02}',
    '.pkev .mouth::before,.pkev .mouth::after{animation:pkevMouthSide 10s step-end 0s infinite both;',
    '  content:"";display:block;position:absolute;width:60%;height:100%;border-radius:50%;',
    '  bottom:53%;border-bottom:2px solid #260F02}',
    '.pkev .mouth::before{right:87%}',
    '.pkev .mouth::after{left:87%}',

    /* ── tail — 6 nested segments; the deepest ones ride TailEnd for the
          whip-lash wag; the cream tip is .-end ── */
    '.pkev .tail{animation:' + A('Tail') + ';height:120px;width:120px;z-index:-1}',
    '.pkev .tail::before,.pkev .tail::after{content:"";display:block;position:absolute;top:0;left:0;width:100%;height:100%}',
    '.pkev .tail::after{background:#C49152;border-radius:50%;transform:rotate(-135deg)}',
    '.pkev .body>.tail{z-index:-2;right:-40px;top:-70px}',
    '.pkev .body>.tail::after{background:linear-gradient(to bottom right,#9D7442,#9D7442 20%,#C49152,#C49152)}',
    '.pkev .tail .tail{top:-35px;transform-origin:center bottom;transform:scale(.85)}',
    '.pkev .tail>.tail .tail{z-index:1}',
    '.pkev .tail.-end{top:-60px}',
    '.pkev .tail.-end::after{background:linear-gradient(to bottom right,#EFE1AF,#fff);border-radius:0;',
    '  border-bottom-left-radius:100% 50%;border-top-right-radius:50% 100%;border-top-left-radius:50%}',
    '.pkev .tail.-end::before{content:"";display:block;position:absolute;background:#C49152;',
    '  height:40%;width:40%;z-index:1;border-radius:50% 50% 0 0;top:auto;bottom:-15%;left:30%;',
    '  box-shadow:-20px -5px #C49152,20px -5px #C49152}',
    '.pkev .tail>.tail>.tail *{animation:' + A('TailEnd') + '}',

    /* ── legs: thigh (.leg) → shin (.inner-leg) → paw (::before);
          the two far-side legs run 0.07s behind ── */
    '.pkev .legs{top:70%;width:100%;height:100%}',
    '.pkev .leg{animation:' + A('Leg') + ';top:0;transform-origin:center top;',
    '  background:linear-gradient(to left,#9D7442,#C49152,#cca069)}',
    '.pkev .leg,.pkev .leg>.inner-leg{height:40px;width:30px;border-radius:35%}',
    '.pkev .leg>.inner-leg{animation:' + A('LegInner') + ';top:50%;transform-origin:center 10%}',
    '.pkev .inner-leg{background:linear-gradient(to left,#9D7442,#C49152,#cca069)}',
    '.pkev .inner-leg::before{animation:' + A('PawInner') + ';content:"";display:block;position:absolute;',
    '  bottom:-10%;width:105%;height:50%;',
    '  border-top-left-radius:40% 40%;border-top-right-radius:40% 40%;',
    '  border-bottom-left-radius:20%;border-bottom-right-radius:20%;',
    '  background-image:linear-gradient(to bottom,#C49152 0%,#C49152 50%,transparent 100%),',
    '   linear-gradient(to right,transparent 0%,transparent 25%,rgba(0,0,0,.5) 26%,rgba(0,0,0,.5) 35%,',
    '    transparent 36%,transparent 65%,rgba(0,0,0,.5) 66%,rgba(0,0,0,.5) 75%,transparent 76%),',
    '   linear-gradient(to top,#9D7442,#C49152,#cca069)}',
    '.pkev .leg:nth-child(1){left:20px;top:-2px}',
    '.pkev .leg:nth-child(2){left:70px}',
    '.pkev .leg:nth-child(3){left:35px;top:-10px}',
    '.pkev .leg:nth-child(4){left:90px;top:-10px}',
    '.pkev .leg:nth-child(2)~.leg{z-index:-1}',
    '.pkev .leg:nth-child(2)~.leg,.pkev .leg:nth-child(2)~.leg>.inner-leg,',
    '.pkev .leg:nth-child(2)~.leg>.inner-leg::before{animation-delay:0.07s}',

    /* ══ the 13-beat / 10s master timeline (frame% = beat/13) ══ */
    '@keyframes pkevBody{' + DOWN + '{transform:translateY(1%)}' + UP + '{transform:translateY(0)}',
    ' 34.6154%{transform:translateY(4%)}38.4615%{transform:translateY(0)}',
    ' 76.9231%{transform:translateY(3%)}79.2308%,92.3077%{transform:translateY(-5%)}}',

    '@keyframes pkevHead{' + DOWN + '{transform:translateY(2%)}' + UP + '{transform:translateY(0)}',
    ' 34.6154%{transform:translateY(2%) rotate(-3deg)}38.4615%{transform:translateY(-5%) rotate(7deg)}',
    ' 76.9231%{transform:translateY(7%) rotate(-3deg)}84.6154%{transform:translateY(-7%) rotate(3deg)}}',

    '@keyframes pkevHeadShadow{' + DOWN + '{transform:translateY(-2%)}' + UP + '{transform:translateY(1%)}',
    ' 34.6154%{transform:translateY(-5%)}38.4615%{transform:translateY(5%)}',
    ' 76.9231%{transform:translateY(-4%)}84.6154%{transform:translateY(10%) scale(0.9)}}',

    '@keyframes pkevEyes{' + DOWN + '{transform:rotateX(-7deg) translateZ(10px)}',
    ' ' + UP + '{transform:rotateX(7deg) translateZ(10px)}',
    ' 76.9231%{transform:translateY(5%) rotateX(-20deg) translateZ(10px)}',
    ' 84.6154%{transform:rotateX(20deg) translateZ(10px)}}',

    '@keyframes pkevEyelid{0%,23.0769%,24.6154%,76.9231%,95.3846%{transform:translateY(-120%) rotate(-30deg)}',
    ' 23.4615%,24.4615%,77.3077%,93.8462%{transform:translateY(0) rotate(0)}',
    ' 79.2308%,92.3077%{transform:translateY(-85%) rotate(30deg)}}',

    '@keyframes pkevNose{' + DOWN + '{transform:translateY(30%)}' + UP + '{transform:translateY(-20%)}',
    ' 76.9231%{transform:translateY(70%)}84.6154%{transform:translateY(-60%)}}',

    '@keyframes pkevMouthMove{' + DOWN + '{transform:translateY(15%)}' + UP + '{transform:translateY(-5%)}',
    ' 76.9231%{transform:translateY(30%)}84.6154%{transform:translateY(-10%)}}',

    /* the mouth-open morph (step-end property swap, like the pen) */
    '@keyframes pkevMouth{0%,93.0769%{width:12%;height:6%;bottom:13%;left:33%;border-radius:50%;',
    '  box-shadow:0 -2px #260F02;border:none;background:transparent}',
    ' 79.2308%,92.3077%{width:12%;bottom:13%;left:33%;height:10%;background:#B37B7E;',
    '  border-top-left-radius:50% 60%;border-top-right-radius:50% 60%;',
    '  border-bottom-left-radius:50% 40%;border-bottom-right-radius:50% 40%;',
    '  box-shadow:inset 0 5px #260F02;border:2px solid #260F02}}',

    '@keyframes pkevMouthSide{0%,93.0769%{opacity:1}79.2308%{opacity:0}}',

    '@keyframes pkevEar{' + UP + '{transform:rotateX(-20deg) rotate(-15deg)}',
    ' ' + DOWN + '{transform:rotateX(20deg) rotate(-5deg)}',
    ' 36.1538%,37.6923%,39.2308%,40.7692%{transform:rotate(-20deg)}',
    ' 36.9231%,38.4615%,40%,43.0769%{transform:rotate(-10deg)}',
    ' 76.9231%{transform:rotateX(20deg) rotate(-5deg)}',
    ' 80%,83.0769%,86.1538%,89.2308%,92.3077%{transform:rotateX(-30deg) rotate(-30deg)}',
    ' 81.5385%,84.6154%,87.6923%,90.7692%,93.8462%{transform:rotateX(-20deg) rotate(-20deg)}}',

    '@keyframes pkevTail{' + DOWN + '{transform:scale(0.9) rotate(-5deg)}' + UP + '{transform:scale(0.9) rotate(5deg)}',
    ' 33.8462%{transform:scale(0.9) rotate(10deg)}',
    ' 35.3846%,38.4615%,41.5385%{transform:scale(0.9) rotate(-2deg)}',
    ' 36.9231%,40%,43.0769%{transform:scale(0.9) rotate(4deg)}',
    ' 76.9231%{transform:scale(0.9) rotate(-7deg)}84.6154%{transform:scale(0.9) rotate(15deg)}}',

    '@keyframes pkevTailEnd{' + DOWN + '{transform:scale(0.9) rotate(-12deg)}' + UP + '{transform:scale(0.9) rotate(9deg)}',
    ' 33.8462%{transform:scale(0.9) rotate(10deg)}',
    ' 35.3846%,38.4615%,41.5385%{transform:scale(0.9) rotate(-4deg)}',
    ' 36.9231%,40%,43.0769%{transform:scale(0.9) rotate(12deg)}',
    ' 76.9231%{transform:scale(0.9) rotate(7deg)}',
    ' 81.5385%,84.6154%,87.6923%,90.7692%{transform:scale(0.9) rotate(-10deg)}',
    ' 83.0769%,86.1538%,89.2308%,92.3077%{transform:scale(0.9) rotate(2deg)}}',

    '@keyframes pkevChest{0%,30.7692%,69.2308%,84.6154%,100%{transform:translateY(0)}',
    ' 34.6154%{transform:rotate(-2deg) translateY(2%)}38.4615%{transform:rotate(2deg) translateY(-2%)}',
    ' 76.9231%{transform:translateY(2%)}}',

    '@keyframes pkevFurCenter{' + DOWN + '{transform:translateY(0)}' + UP + '{transform:translateY(2%)}}',
    '@keyframes pkevFurCenterPatchL{' + DOWN + '{transform:rotate(65deg) skewX(15deg)}',
    ' ' + UP + '{transform:rotate(60deg) skewX(15deg)}}',
    '@keyframes pkevFurCenterPatchR{' + DOWN + '{transform:rotate(35deg) skewX(15deg)}',
    ' ' + UP + '{transform:rotate(30deg) skewX(15deg)}}',
    '@keyframes pkevFurRight{' + DOWN + '{transform:translateY(0)}' + UP + '{transform:translateY(2%)}}',
    '@keyframes pkevFurRightPatch{' + DOWN + '{transform:translateY(0) rotate(50deg)}',
    ' ' + UP + '{transform:translateY(2%) rotate(56deg)}}',

    '@keyframes pkevLeg{' + DOWN + '{transform:rotate(-12deg)}' + UP + '{transform:rotate(-6deg)}',
    ' 34.6154%{transform:rotate(-16deg)}38.4615%{transform:rotate(9deg)}',
    ' 76.9231%{transform:translateY(-10%) rotate(-18deg)}79.2308%,92.3077%{transform:translateY(5%) rotate(0)}}',

    '@keyframes pkevLegInner{' + DOWN + '{transform:rotate(28deg)}' + UP + '{transform:rotate(16deg)}',
    ' 34.6154%{transform:rotate(40deg)}38.4615%{transform:rotate(-10deg)}',
    ' 76.9231%{transform:rotate(32deg)}79.2308%,92.3077%{transform:rotate(0)}}',

    '@keyframes pkevPawInner{' + DOWN + '{transform:rotate(-16deg)}' + UP + '{transform:rotate(-10deg)}',
    ' 34.6154%{transform:rotate(-20deg)}38.4615%{transform:rotate(0deg)}',
    ' 76.9231%{transform:rotate(-14deg)}79.2308%,92.3077%{transform:rotate(0)}}',

    /* ══ WALK GAIT — ON only while the pk-walk class rides the wrapper
       (patrol adds it while moving, drops it at edge pauses/stops). These
       higher-specificity rules REPLACE the slow master-timeline leg tracks
       with a proper stepping trot: thighs (origin: hip) swing fore-aft in
       DIAGONAL pairs (legs 1+4 vs 2+3), shins counter-bend at the knee
       (bent while trailing, extended on the forward pass), lifted slightly
       mid-swing. Cadence --pk-step is set by patrol from the walk speed.
       The shorthand also zeroes the far-legs' .07s idle stagger, keeping
       each diagonal pair in lock-step. Legs 1/3 = front, 2/4 = rear;
       negative rotate = paw swings FORWARD on the left-facing figure. ══ */
    '.pkw-ev.pk-walk .pkev .leg:nth-child(1),.pkw-ev.pk-walk .pkev .leg:nth-child(4){',
    '  animation:pkevWalkLegA var(--pk-step,.45s) ease-in-out infinite}',
    '.pkw-ev.pk-walk .pkev .leg:nth-child(2),.pkw-ev.pk-walk .pkev .leg:nth-child(3){',
    '  animation:pkevWalkLegB var(--pk-step,.45s) ease-in-out infinite}',
    '.pkw-ev.pk-walk .pkev .leg:nth-child(1)>.inner-leg,.pkw-ev.pk-walk .pkev .leg:nth-child(4)>.inner-leg{',
    '  animation:pkevWalkShinA var(--pk-step,.45s) ease-in-out infinite}',
    '.pkw-ev.pk-walk .pkev .leg:nth-child(2)>.inner-leg,.pkw-ev.pk-walk .pkev .leg:nth-child(3)>.inner-leg{',
    '  animation:pkevWalkShinB var(--pk-step,.45s) ease-in-out infinite}',
    '@keyframes pkevWalkLegA{0%,100%{transform:rotate(16deg)}50%{transform:rotate(-16deg) translateY(-4px)}}',
    '@keyframes pkevWalkLegB{0%,100%{transform:rotate(-16deg) translateY(-4px)}50%{transform:rotate(16deg)}}',
    '@keyframes pkevWalkShinA{0%,100%{transform:rotate(34deg)}50%{transform:rotate(2deg)}}',
    '@keyframes pkevWalkShinB{0%,100%{transform:rotate(2deg)}50%{transform:rotate(34deg)}}'
  ].join('\n');

  /* ── the div rig — 1:1 with the pen (root renamed .eevee → .pkev) ── */
  var HTML =
    '<div class="body">' +
      '<div class="head">' +
        '<div class="ears">' +
          '<div class="ear"><div class="lobe"></div></div>' +
          '<div class="ear"><div class="lobe"></div></div>' +
        '</div>' +
        '<div class="face">' +
          '<div class="eyes">' +
            '<div class="eye"><div class="eyelid"></div></div>' +
            '<div class="eye"><div class="eyelid"></div></div>' +
          '</div>' +
          '<div class="nose"></div>' +
          '<div class="mouth"></div>' +
        '</div>' +
      '</div>' +
      '<div class="chest">' +
        '<div class="fur"><div class="patch"></div></div>' +
        '<div class="fur"><div class="patch"></div></div>' +
        '<div class="fur"><div class="patch"></div></div>' +
      '</div>' +
      '<div class="legs">' +
        '<div class="leg"><div class="inner-leg"></div></div>' +
        '<div class="leg"><div class="inner-leg"></div></div>' +
        '<div class="leg"><div class="inner-leg"></div></div>' +
        '<div class="leg"><div class="inner-leg"></div></div>' +
      '</div>' +
      '<div class="tail"><div class="tail"><div class="tail"><div class="tail">' +
        '<div class="tail"><div class="tail -end"></div></div>' +
      '</div></div></div></div>' +
    '</div>';

  function injectCSS() {
    if (doc.getElementById('pokemon-eevee-css')) return;
    var s = doc.createElement('style');
    s.id = 'pokemon-eevee-css';
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  /* ── swift: click Eevee → a burst of golden stars shoots out of it (its
     signature normal-type move). Pure SVG drawn in front of the figure on
     the wrapper's own px canvas, so it works in ANY host. Each star flies
     outward from the body, spinning as it goes, and fades; auto-removed. ── */
  var NSVG = 'http://www.w3.org/2000/svg';
  /* a 5-point star path centred on (cx,cy), outer radius R */
  function starD(cx, cy, R) {
    var r = R * 0.42, pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = (i % 2 === 0) ? R : r;
      pts.push((cx + Math.cos(a) * rad).toFixed(1) + ',' + (cy + Math.sin(a) * rad).toFixed(1));
    }
    return 'M' + pts.join(' L') + ' Z';
  }
  function fireStars(wrap) {
    if (typeof doc === 'undefined' || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var W = Math.round(r.width) || 250, Hh = Math.round(r.height) || 200;

    var host = doc.createElement('div');
    host.className = 'pk-stars';
    host.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;' +
      'overflow:visible;pointer-events:none;z-index:6;';
    var svg = doc.createElementNS(NSVG, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;';
    host.appendChild(svg);

    var ox = W * 0.5, oy = Hh * 0.52;                     // ≈ Eevee's body centre
    var reach = Math.max(W, Hh) * 0.55;
    var n = 11;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var dist = reach * (0.55 + Math.random() * 0.5);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.8 - reach * 0.08;
      var R = Math.max(4, reach * (0.07 + Math.random() * 0.07));
      var star = doc.createElementNS(NSVG, 'path');
      star.setAttribute('d', starD(ox, oy, R));
      star.setAttribute('fill', i % 3 === 0 ? '#fff3bf' : '#ffd43b');
      star.setAttribute('stroke', '#f59f00');
      star.setAttribute('stroke-width', Math.max(0.8, R * 0.12));
      star.setAttribute('stroke-linejoin', 'round');
      star.style.transformOrigin = ox + 'px ' + oy + 'px';
      svg.appendChild(star);
      if (star.animate) star.animate(
        [{ opacity: 0, transform: 'translate(0,0) rotate(0deg) scale(.25)' },
         { opacity: 1, offset: 0.18 },
         { opacity: 1, offset: 0.6 },
         { opacity: 0, transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) ' +
             'rotate(' + Math.round(180 + Math.random() * 360) + 'deg) scale(1)' }],
        { duration: 750, delay: i * 28, easing: 'cubic-bezier(.16,.7,.4,1)', fill: 'both' });
    }
    /* a soft golden flash at the origin */
    var fl = doc.createElement('div');
    var fs = reach * 0.5;
    fl.style.cssText = 'position:absolute;left:' + ox + 'px;top:' + oy + 'px;' +
      'width:' + fs.toFixed(1) + 'px;height:' + fs.toFixed(1) + 'px;' +
      'margin:' + (-fs / 2).toFixed(1) + 'px 0 0 ' + (-fs / 2).toFixed(1) + 'px;' +
      'border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(255,243,191,.9),rgba(255,212,59,.4) 45%,rgba(255,212,59,0) 70%);';
    host.appendChild(fl);
    if (fl.animate) fl.animate(
      [{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(1.4)', opacity: 0 }],
      { duration: 420, easing: 'ease-out', fill: 'forwards' });

    wrap.appendChild(host);
    var kill = function () { if (host.parentNode) host.parentNode.removeChild(host); };
    if (host.animate) {
      host.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1150 }).onfinish = kill;
    } else {
      setTimeout(kill, 1150);
    }
  }

  /* ── spin: a happy eased somersault (one full 360° + a little lift),
     fired on a random ambient timer AND via inst.spin(). WAAPI with
     composite:'add' rides ON TOP of the figure's static transform (the
     pk-flip scaleX(-1)) without clobbering it — the squirtle-flip lesson,
     solved additively this time. ── */
  function fireSpin(wrap) {
    if (!wrap || wrap._acting) return;
    var fig = wrap.querySelector ? wrap.querySelector('.pkev') : null;
    if (!fig || !fig.animate) return;
    wrap._acting = true;
    var anim;
    try {
      anim = fig.animate(
        [{ transform: 'rotate(0deg) translateY(0px)' },
         { transform: 'rotate(180deg) translateY(-26px)', offset: 0.5 },
         { transform: 'rotate(360deg) translateY(0px)' }],
        { duration: 850, easing: 'cubic-bezier(.45,.05,.55,.95)', composite: 'add' });
    } catch (e) {   // very old engines: no composite support — skip gracefully
      wrap._acting = false; return;
    }
    anim.onfinish = function () { wrap._acting = false; };
  }

  /* ── jump: a lively double-hop (composite:'add' so it rides on top of the
     pk-flip transform, like spin). ── */
  function fireJump(wrap) {
    if (!wrap || wrap._acting) return;
    var fig = wrap.querySelector ? wrap.querySelector('.pkev') : null;
    if (!fig || !fig.animate) return;
    wrap._acting = true;
    try {
      fig.animate(
        [{ transform: 'translateY(0px)', easing: 'ease-out' },
         { transform: 'translateY(-34px)', offset: 0.28, easing: 'ease-in' },
         { transform: 'translateY(0px)', offset: 0.52, easing: 'ease-out' },
         { transform: 'translateY(-15px)', offset: 0.74, easing: 'ease-in' },
         { transform: 'translateY(0px)' }],
        { duration: 780, composite: 'add' }).onfinish = function () { wrap._acting = false; };
    } catch (e) { wrap._acting = false; }
  }

  /* pick a random discrete body act — used by the timer AND on click */
  function fireAct(wrap) { (Math.random() < 0.5 ? fireSpin : fireJump)(wrap); }

  /* ambient act scheduler — a random 8-18s heartbeat per instance; skips
     beats while paused or once the instance leaves the DOM */
  function scheduleActs(wrap, fire) {
    (function tick() {
      wrap._actT = setTimeout(function () {
        if (!doc.body || !doc.body.contains(wrap)) return;   // removed — stop
        if (!wrap.classList.contains('pk-paused')) fire();
        tick();
      }, 8000 + Math.random() * 10000);
    })();
  }

  /* one document-level capture click handler hit-tests each Eevee's LIVE
     box (robust while it animates) and fires its star burst, stopping the
     click from reaching the scene behind it. Skips the game/host UI. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof doc === 'undefined') return;
    clickBound = true;
    doc.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest(
        '.wrap,button,input,select,textarea,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov')) return;
      var list = doc.querySelectorAll('.pkw-ev');
      for (var i = 0; i < list.length; i++) {
        var r = list[i].getBoundingClientRect();
        if (r.width && e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          fireStars(list[i]);           // signature Swift burst …
          fireAct(list[i]);             // … + a lively body act on the same click
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* place() — drop an Eevee into any positioned container */
  function place(opts) {
    opts = opts || {};
    var parent = opts.parent || doc.body;
    injectCSS();
    ensureClickHandler();

    var wrap = doc.createElement('div');
    wrap.className = 'pkw-ev' + (opts.flip ? ' pk-flip' : '') + (opts.paused ? ' pk-paused' : '');
    var css = 'height:' + (opts.height || '200px') + ';';
    if (opts.left != null) css += 'left:' + opts.left + ';';
    if (opts.right != null) css += 'right:' + opts.right + ';';
    if (opts.bottom != null) css += 'bottom:' + opts.bottom + ';';
    if (opts.top != null) css += 'top:' + opts.top + ';';
    if (opts.z != null) css += 'z-index:' + opts.z + ';';
    wrap.style.cssText = css;

    if (opts.shadow !== false) {
      var sh = doc.createElement('div');
      sh.className = 'pk-shadow';
      wrap.appendChild(sh);
    }
    var sc = doc.createElement('div');
    sc.className = 'pkev-sc';
    var fig = doc.createElement('div');
    fig.className = 'pkev';
    fig.innerHTML = HTML;
    sc.appendChild(fig);
    wrap.appendChild(sc);
    parent.appendChild(wrap);

    function refit() {
      var h = wrap.clientHeight || 200;
      var s = h / NATIVE_H;
      sc.style.transform = 'scale(' + s.toFixed(4) + ')';
      wrap.style.width = (NATIVE_W * s).toFixed(0) + 'px';
    }
    refit();

    /* ── patrol — walk the parent's width side to side forever ── */
    var patrolCtl = null;
    function patrol(popts) {
      popts = popts || {};
      if (patrolCtl) patrolCtl.stop();
      var stage = wrap.parentNode || doc.body;
      var speed = popts.speed || 130;                     // px/s
      var pad = popts.edgePad != null ? popts.edgePad : 12;
      var pMin = (popts.pauseMs && popts.pauseMs[0]) || 350;
      var pMax = (popts.pauseMs && popts.pauseMs[1]) || 900;
      /* hand the x-axis to the translate: freeze the current VISUAL spot as tx
         (rect-based, so restarting a patrol never teleports the figure) */
      var st = { tx: wrap.getBoundingClientRect().left - stage.getBoundingClientRect().left,
                 dir: 1, anim: null, timer: null, paused: false, stopped: false };
      wrap.style.left = '0px';
      wrap.style.right = 'auto';
      wrap.style.transform = 'translateX(' + st.tx + 'px)';
      /* step cadence follows the walking speed: one full step-cycle per
         ~60px of travel (clamped to stay readable) */
      wrap.style.setProperty('--pk-step',
        Math.min(0.9, Math.max(0.18, 60 / speed)).toFixed(2) + 's');

      function leg() {
        if (st.stopped) return;
        var cw = stage.clientWidth || 800, ew = wrap.offsetWidth || 100;
        var target = st.dir > 0 ? Math.max(pad, cw - ew - pad) : pad;
        /* face the ACTUAL travel direction (a figure placed beyond the edge
           target walks backwards to it on the first leg — dir alone lies) */
        api.setFlip(target > st.tx);                      // faces LEFT natively
        api.setWalking(true);                              // legs step while moving
        var dur = Math.max(600, Math.abs(target - st.tx) / speed * 1000);
        if (!wrap.animate) {                               // no-WAAPI fallback: just arrive
          wrap.style.transform = 'translateX(' + target + 'px)';
          st.timer = setTimeout(done, dur);
          return;
        }
        st.anim = wrap.animate(
          [{ transform: 'translateX(' + st.tx + 'px)' },
           { transform: 'translateX(' + target + 'px)' }],
          { duration: dur, easing: 'linear', fill: 'forwards' });
        st.anim.onfinish = done;
        function done() {
          if (st.stopped) return;
          st.tx = target; st.anim = null;
          st.dir = -st.dir;                                // turn at the edge
          api.setWalking(false);                           // rest the legs at the edge
          if (!st.paused) st.timer = setTimeout(leg, pMin + Math.random() * (pMax - pMin));
        }
      }
      leg();

      patrolCtl = {
        stop: function () {
          st.stopped = true;
          if (st.anim) {
            /* commit the current visual x BEFORE cancelling, so the figure
               stays where it is (a bare cancel falls back to the leg start) */
            var x = wrap.getBoundingClientRect().left - stage.getBoundingClientRect().left;
            wrap.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
            try { st.anim.cancel(); } catch (e) {}
          }
          if (st.timer) clearTimeout(st.timer);
          api.setWalking(false);
          patrolCtl = null;
        },
        setPaused: function (b) {
          st.paused = b !== false;
          if (st.anim) {
            if (st.paused) st.anim.pause(); else st.anim.play();
            api.setWalking(!st.paused);                    // frozen mid-stride ≠ stepping
          }
          else if (st.paused) { if (st.timer) { clearTimeout(st.timer); st.timer = null; } }
          else if (!st.stopped && !st.timer) leg();        // resume from a turn-pause
        }
      };
      return patrolCtl;
    }

    var api = {
      element: wrap,
      refit: refit,
      setFlip: function (b) { wrap.classList.toggle('pk-flip', b !== false); },
      setPaused: function (b) {
        wrap.classList.toggle('pk-paused', b !== false);
        if (patrolCtl) patrolCtl.setPaused(b);             // freeze the crossing too
      },
      /* the walk gait (legs stepping) — patrol drives this automatically */
      setWalking: function (b) { wrap.classList.toggle('pk-walk', b !== false); },
      /* burst of golden Swift stars (also fired by clicking Eevee) */
      stars: function () { fireStars(wrap); },
      /* body acts — also fire on click + on their own every ~8-18s */
      spin: function () { fireSpin(wrap); },
      jump: function () { fireJump(wrap); },
      act: function () { fireAct(wrap); },
      patrol: patrol,
      remove: function () {
        if (patrolCtl) patrolCtl.stop();
        clearTimeout(wrap._actT);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
    scheduleActs(wrap, function () { fireAct(wrap); });
    return api;
  }

  w.Pokemons = w.Pokemons || {};
  w.Pokemons.eevee = {
    name: 'eevee',
    dexId: 133,
    nativeW: NATIVE_W,
    nativeH: NATIVE_H,
    /* the paw line now sits at ≈100% of the canvas height — the rig was
       dropped ~26px via .pkev translateY(26px) so the paws land on the floor
       (was 0.92, which floated ~18px above the shadow) */
    footFrac: 1.0,
    place: place
  };
})(typeof window !== 'undefined' ? window : this);
