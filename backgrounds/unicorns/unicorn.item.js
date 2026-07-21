/* ─────────────────────────────────────────────────────────────────────────
   UNICORN — the pure-CSS galloping rainbow unicorn, extracted DYNAMICALLY
   from backgrounds/unicorns/unicorn.html (CodePen "Galloping horse" rebuilt
   into a unicorn there: rainbow mane/tail, golden hooves, glowing horn,
   pegasus wings, walk gait). This file packages the rig for any host scene:

   API — window.Unicorn.place(parent, opts) -> inst
     opts : { left, top, bottom          — CSS lengths or % strings
              size   = 40                — px per em (horse is 3.8em wide)
              gait   = 'run' | 'walk' | 'fly'   — fly = the workshop's soaring pose
              color  = 'pearl'|'pink'|'sky'|'mint'|'night' — coat + cutie mark
              wings  = false             — pegasus wings (flyers)
              flip   = false             — mirror horizontally
              z }                        — z-index
     inst : { el, remove(), setGait(g), setColor(c), setWings(on), setFlip(f),
              setPaused(p), setPos(left, top),
              magic(), lightning(), toot(), hop(), shake()   — the unicorn.html
              click-magic + idle FX (the ONLY animation sources are that file),
              roam({fly,bandMinPct,bandMaxPct,speedPctPerSec,
                    waitMinSec,waitMaxSec,bobAmpPx,startOnScreen,
                    gate})                                          — come & go
                    gate: fn → the host may refuse an entry (population cap);
                    inst.active is true while the unicorn is on a trip
              patrol({minPct,maxPct,startPct,speedPctPerSec,dir})   — ground walker
              glide({topPct,speedPctPerSec,dir,bobAmpPx}) }         — sky flyer
   roam() is the come-and-go used by the other backgrounds: the unicorn enters
   from an off-screen edge, crosses, exits fully, waits off-stage, then re-enters
   from a (random) edge at a fresh height/speed. fly:true adds a gentle bob.
   patrol() bounces edge-to-edge on-screen; glide() wraps around — both facing
   their travel direction.

   The rig is rem→em converted (one font-size scales the whole horse), every
   selector is scoped under .uc-uni and every keyframe prefixed uc-*, so it
   cannot collide with a host. The workshop's page chrome and click-FX are
   stripped; the galloping STARDUST TRAIL is kept (its motion/colors ride in
   from the workshop, EXTRA_CSS re-anchors it from viewport-fixed coords to
   the instance box). Zero dependencies; injects its <style> once.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var STYLE_ID = 'unicorn-item-style';
  var FACES_LEFT = true;   /* the rig gallops facing LEFT (flip for rightward travel) */

  /* ┌───────────────────────────────────────────────────────────────────────┐
     │ BASE_CSS is GENERATED from unicorn.html by _build_unicorn_item.py —     │
     │ do NOT hand-edit it. Change the workshop (unicorn.html), then run:      │
     │   python backgrounds/unicorns/_build_unicorn_item.py                    │
     │ MARKUP, EXTRA_CSS and the JS API below are hand-written; keep them.     │
     └───────────────────────────────────────────────────────────────────────┘ */
  var BASE_CSS = `
.uc-uni {font-size: 22vmin;
  --outlines: transparent;
  --speed: 0.8s;
  --delay-gap: 8;
  --horse-width: 3.8em;
  --horse-height: 2.5em;
  --color-horse: rgba(50, 50, 50, 1);
  --color-horse-back: rgba(30, 30, 30, 1);
  --color-hair: rgba(70, 70, 70, 1);
  --color-hoof: rgba(0, 0, 0, 1);
  --color-dust: #AF540B;
  --color-floor: #F1D1AF;
  --color-sky: #C4C4FF;}
.uc-uni * {position: relative;}
.uc-uni label {cursor: pointer;}
.uc-uni .dust {position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(((100vh - var(--horse-height)) / 2) + 0.02em);
  overflow: hidden;}
.uc-uni .dust .particle {background-color: var(--color-dust);
  width: 0.05em;
  height: 0.05em;
  border-radius: 50%;
  position: absolute;
  border: 1px dashed var(--outlines);
  top: calc(50vh + (var(--horse-height) / 2) - 0.05em);
  left: calc(50vw - (var(--horse-width) / 2) + (var(--horse-width) * 0.15));}
.uc-uni .dust.back .particle {left: calc(50vw - (var(--horse-width) / 2) + (var(--horse-width) * 0.5));}
@-webkit-keyframes uc-particle-animation-1 {100% {
    -webkit-transform: translateX(calc(0.1865302066 * var(--horse-width) )) translateY(calc(-0.0019510211 * (var(--horse-height) / 5))) scale(3) rotate(-126.5deg);
            transform: translateX(calc(0.1865302066 * var(--horse-width) )) translateY(calc(-0.0019510211 * (var(--horse-height) / 5))) scale(3) rotate(-126.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-1 {100% {
    -webkit-transform: translateX(calc(0.1865302066 * var(--horse-width) )) translateY(calc(-0.0019510211 * (var(--horse-height) / 5))) scale(3) rotate(-126.5deg);
            transform: translateX(calc(0.1865302066 * var(--horse-width) )) translateY(calc(-0.0019510211 * (var(--horse-height) / 5))) scale(3) rotate(-126.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(1) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-1 var(--speed) ease-out infinite;
          animation: uc-particle-animation-1 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.01s);
          animation-delay: calc((var(--speed) * 0.1) + 0.01s);}
.uc-uni .dust.back .particle:nth-child(1) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.01s);
          animation-delay: calc((var(--speed) * 0.68) + 0.01s);}
@-webkit-keyframes uc-particle-animation-2 {100% {
    -webkit-transform: translateX(calc(0.0269289474 * var(--horse-width) )) translateY(calc(-0.0005832403 * (var(--horse-height) / 5))) scale(4) rotate(-57.5deg);
            transform: translateX(calc(0.0269289474 * var(--horse-width) )) translateY(calc(-0.0005832403 * (var(--horse-height) / 5))) scale(4) rotate(-57.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-2 {100% {
    -webkit-transform: translateX(calc(0.0269289474 * var(--horse-width) )) translateY(calc(-0.0005832403 * (var(--horse-height) / 5))) scale(4) rotate(-57.5deg);
            transform: translateX(calc(0.0269289474 * var(--horse-width) )) translateY(calc(-0.0005832403 * (var(--horse-height) / 5))) scale(4) rotate(-57.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(2) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-2 var(--speed) ease-out infinite;
          animation: uc-particle-animation-2 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.02s);
          animation-delay: calc((var(--speed) * 0.1) + 0.02s);}
.uc-uni .dust.back .particle:nth-child(2) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.02s);
          animation-delay: calc((var(--speed) * 0.68) + 0.02s);}
@-webkit-keyframes uc-particle-animation-3 {100% {
    -webkit-transform: translateX(calc(0.2183341644 * var(--horse-width) )) translateY(calc(-0.0011654604 * (var(--horse-height) / 5))) scale(6) rotate(-141deg);
            transform: translateX(calc(0.2183341644 * var(--horse-width) )) translateY(calc(-0.0011654604 * (var(--horse-height) / 5))) scale(6) rotate(-141deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-3 {100% {
    -webkit-transform: translateX(calc(0.2183341644 * var(--horse-width) )) translateY(calc(-0.0011654604 * (var(--horse-height) / 5))) scale(6) rotate(-141deg);
            transform: translateX(calc(0.2183341644 * var(--horse-width) )) translateY(calc(-0.0011654604 * (var(--horse-height) / 5))) scale(6) rotate(-141deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(3) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-3 var(--speed) ease-out infinite;
          animation: uc-particle-animation-3 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.03s);
          animation-delay: calc((var(--speed) * 0.1) + 0.03s);}
.uc-uni .dust.back .particle:nth-child(3) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.03s);
          animation-delay: calc((var(--speed) * 0.68) + 0.03s);}
@-webkit-keyframes uc-particle-animation-4 {100% {
    -webkit-transform: translateX(calc(0.516067634 * var(--horse-width) )) translateY(calc(-0.0008606763 * (var(--horse-height) / 5))) scale(4) rotate(-108deg);
            transform: translateX(calc(0.516067634 * var(--horse-width) )) translateY(calc(-0.0008606763 * (var(--horse-height) / 5))) scale(4) rotate(-108deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-4 {100% {
    -webkit-transform: translateX(calc(0.516067634 * var(--horse-width) )) translateY(calc(-0.0008606763 * (var(--horse-height) / 5))) scale(4) rotate(-108deg);
            transform: translateX(calc(0.516067634 * var(--horse-width) )) translateY(calc(-0.0008606763 * (var(--horse-height) / 5))) scale(4) rotate(-108deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(4) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-4 var(--speed) ease-out infinite;
          animation: uc-particle-animation-4 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.04s);
          animation-delay: calc((var(--speed) * 0.1) + 0.04s);}
.uc-uni .dust.back .particle:nth-child(4) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.04s);
          animation-delay: calc((var(--speed) * 0.68) + 0.04s);}
@-webkit-keyframes uc-particle-animation-5 {100% {
    -webkit-transform: translateX(calc(0.6010072872 * var(--horse-width) )) translateY(calc(-0.0060810274 * (var(--horse-height) / 5))) scale(4) rotate(-76deg);
            transform: translateX(calc(0.6010072872 * var(--horse-width) )) translateY(calc(-0.0060810274 * (var(--horse-height) / 5))) scale(4) rotate(-76deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-5 {100% {
    -webkit-transform: translateX(calc(0.6010072872 * var(--horse-width) )) translateY(calc(-0.0060810274 * (var(--horse-height) / 5))) scale(4) rotate(-76deg);
            transform: translateX(calc(0.6010072872 * var(--horse-width) )) translateY(calc(-0.0060810274 * (var(--horse-height) / 5))) scale(4) rotate(-76deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(5) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-5 var(--speed) ease-out infinite;
          animation: uc-particle-animation-5 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.05s);
          animation-delay: calc((var(--speed) * 0.1) + 0.05s);}
.uc-uni .dust.back .particle:nth-child(5) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.05s);
          animation-delay: calc((var(--speed) * 0.68) + 0.05s);}
@-webkit-keyframes uc-particle-animation-6 {100% {
    -webkit-transform: translateX(calc(0.4536142004 * var(--horse-width) )) translateY(calc(-0.0087663683 * (var(--horse-height) / 5))) scale(4) rotate(-75.5deg);
            transform: translateX(calc(0.4536142004 * var(--horse-width) )) translateY(calc(-0.0087663683 * (var(--horse-height) / 5))) scale(4) rotate(-75.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-6 {100% {
    -webkit-transform: translateX(calc(0.4536142004 * var(--horse-width) )) translateY(calc(-0.0087663683 * (var(--horse-height) / 5))) scale(4) rotate(-75.5deg);
            transform: translateX(calc(0.4536142004 * var(--horse-width) )) translateY(calc(-0.0087663683 * (var(--horse-height) / 5))) scale(4) rotate(-75.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(6) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-6 var(--speed) ease-out infinite;
          animation: uc-particle-animation-6 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.06s);
          animation-delay: calc((var(--speed) * 0.1) + 0.06s);}
.uc-uni .dust.back .particle:nth-child(6) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.06s);
          animation-delay: calc((var(--speed) * 0.68) + 0.06s);}
@-webkit-keyframes uc-particle-animation-7 {100% {
    -webkit-transform: translateX(calc(0.3354709263 * var(--horse-width) )) translateY(calc(-0.0063274995 * (var(--horse-height) / 5))) scale(4) rotate(-14deg);
            transform: translateX(calc(0.3354709263 * var(--horse-width) )) translateY(calc(-0.0063274995 * (var(--horse-height) / 5))) scale(4) rotate(-14deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-7 {100% {
    -webkit-transform: translateX(calc(0.3354709263 * var(--horse-width) )) translateY(calc(-0.0063274995 * (var(--horse-height) / 5))) scale(4) rotate(-14deg);
            transform: translateX(calc(0.3354709263 * var(--horse-width) )) translateY(calc(-0.0063274995 * (var(--horse-height) / 5))) scale(4) rotate(-14deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(7) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-7 var(--speed) ease-out infinite;
          animation: uc-particle-animation-7 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.07s);
          animation-delay: calc((var(--speed) * 0.1) + 0.07s);}
.uc-uni .dust.back .particle:nth-child(7) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.07s);
          animation-delay: calc((var(--speed) * 0.68) + 0.07s);}
@-webkit-keyframes uc-particle-animation-8 {100% {
    -webkit-transform: translateX(calc(0.7113461256 * var(--horse-width) )) translateY(calc(-0.0099493652 * (var(--horse-height) / 5))) scale(6) rotate(-67.5deg);
            transform: translateX(calc(0.7113461256 * var(--horse-width) )) translateY(calc(-0.0099493652 * (var(--horse-height) / 5))) scale(6) rotate(-67.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-8 {100% {
    -webkit-transform: translateX(calc(0.7113461256 * var(--horse-width) )) translateY(calc(-0.0099493652 * (var(--horse-height) / 5))) scale(6) rotate(-67.5deg);
            transform: translateX(calc(0.7113461256 * var(--horse-width) )) translateY(calc(-0.0099493652 * (var(--horse-height) / 5))) scale(6) rotate(-67.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(8) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-8 var(--speed) ease-out infinite;
          animation: uc-particle-animation-8 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.08s);
          animation-delay: calc((var(--speed) * 0.1) + 0.08s);}
.uc-uni .dust.back .particle:nth-child(8) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.08s);
          animation-delay: calc((var(--speed) * 0.68) + 0.08s);}
@-webkit-keyframes uc-particle-animation-9 {100% {
    -webkit-transform: translateX(calc(0.080946473 * var(--horse-width) )) translateY(calc(-0.0065291825 * (var(--horse-height) / 5))) scale(4) rotate(-38deg);
            transform: translateX(calc(0.080946473 * var(--horse-width) )) translateY(calc(-0.0065291825 * (var(--horse-height) / 5))) scale(4) rotate(-38deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-9 {100% {
    -webkit-transform: translateX(calc(0.080946473 * var(--horse-width) )) translateY(calc(-0.0065291825 * (var(--horse-height) / 5))) scale(4) rotate(-38deg);
            transform: translateX(calc(0.080946473 * var(--horse-width) )) translateY(calc(-0.0065291825 * (var(--horse-height) / 5))) scale(4) rotate(-38deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(9) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-9 var(--speed) ease-out infinite;
          animation: uc-particle-animation-9 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.09s);
          animation-delay: calc((var(--speed) * 0.1) + 0.09s);}
.uc-uni .dust.back .particle:nth-child(9) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.09s);
          animation-delay: calc((var(--speed) * 0.68) + 0.09s);}
@-webkit-keyframes uc-particle-animation-10 {100% {
    -webkit-transform: translateX(calc(0.1470335732 * var(--horse-width) )) translateY(calc(-0.0020159981 * (var(--horse-height) / 5))) scale(4) rotate(-152.5deg);
            transform: translateX(calc(0.1470335732 * var(--horse-width) )) translateY(calc(-0.0020159981 * (var(--horse-height) / 5))) scale(4) rotate(-152.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-10 {100% {
    -webkit-transform: translateX(calc(0.1470335732 * var(--horse-width) )) translateY(calc(-0.0020159981 * (var(--horse-height) / 5))) scale(4) rotate(-152.5deg);
            transform: translateX(calc(0.1470335732 * var(--horse-width) )) translateY(calc(-0.0020159981 * (var(--horse-height) / 5))) scale(4) rotate(-152.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(10) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-10 var(--speed) ease-out infinite;
          animation: uc-particle-animation-10 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.1s);
          animation-delay: calc((var(--speed) * 0.1) + 0.1s);}
.uc-uni .dust.back .particle:nth-child(10) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.1s);
          animation-delay: calc((var(--speed) * 0.68) + 0.1s);}
@-webkit-keyframes uc-particle-animation-11 {100% {
    -webkit-transform: translateX(calc(0.3975218731 * var(--horse-width) )) translateY(calc(-0.0075265158 * (var(--horse-height) / 5))) scale(4) rotate(-40.5deg);
            transform: translateX(calc(0.3975218731 * var(--horse-width) )) translateY(calc(-0.0075265158 * (var(--horse-height) / 5))) scale(4) rotate(-40.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-11 {100% {
    -webkit-transform: translateX(calc(0.3975218731 * var(--horse-width) )) translateY(calc(-0.0075265158 * (var(--horse-height) / 5))) scale(4) rotate(-40.5deg);
            transform: translateX(calc(0.3975218731 * var(--horse-width) )) translateY(calc(-0.0075265158 * (var(--horse-height) / 5))) scale(4) rotate(-40.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(11) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-11 var(--speed) ease-out infinite;
          animation: uc-particle-animation-11 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.11s);
          animation-delay: calc((var(--speed) * 0.1) + 0.11s);}
.uc-uni .dust.back .particle:nth-child(11) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.11s);
          animation-delay: calc((var(--speed) * 0.68) + 0.11s);}
@-webkit-keyframes uc-particle-animation-12 {100% {
    -webkit-transform: translateX(calc(0.6381622519 * var(--horse-width) )) translateY(calc(-0.0067366122 * (var(--horse-height) / 5))) scale(5) rotate(-10deg);
            transform: translateX(calc(0.6381622519 * var(--horse-width) )) translateY(calc(-0.0067366122 * (var(--horse-height) / 5))) scale(5) rotate(-10deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-12 {100% {
    -webkit-transform: translateX(calc(0.6381622519 * var(--horse-width) )) translateY(calc(-0.0067366122 * (var(--horse-height) / 5))) scale(5) rotate(-10deg);
            transform: translateX(calc(0.6381622519 * var(--horse-width) )) translateY(calc(-0.0067366122 * (var(--horse-height) / 5))) scale(5) rotate(-10deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(12) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-12 var(--speed) ease-out infinite;
          animation: uc-particle-animation-12 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.12s);
          animation-delay: calc((var(--speed) * 0.1) + 0.12s);}
.uc-uni .dust.back .particle:nth-child(12) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.12s);
          animation-delay: calc((var(--speed) * 0.68) + 0.12s);}
@-webkit-keyframes uc-particle-animation-13 {100% {
    -webkit-transform: translateX(calc(0.3130797386 * var(--horse-width) )) translateY(calc(-0.0077930678 * (var(--horse-height) / 5))) scale(3) rotate(-122deg);
            transform: translateX(calc(0.3130797386 * var(--horse-width) )) translateY(calc(-0.0077930678 * (var(--horse-height) / 5))) scale(3) rotate(-122deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-13 {100% {
    -webkit-transform: translateX(calc(0.3130797386 * var(--horse-width) )) translateY(calc(-0.0077930678 * (var(--horse-height) / 5))) scale(3) rotate(-122deg);
            transform: translateX(calc(0.3130797386 * var(--horse-width) )) translateY(calc(-0.0077930678 * (var(--horse-height) / 5))) scale(3) rotate(-122deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(13) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-13 var(--speed) ease-out infinite;
          animation: uc-particle-animation-13 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.13s);
          animation-delay: calc((var(--speed) * 0.1) + 0.13s);}
.uc-uni .dust.back .particle:nth-child(13) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.13s);
          animation-delay: calc((var(--speed) * 0.68) + 0.13s);}
@-webkit-keyframes uc-particle-animation-14 {100% {
    -webkit-transform: translateX(calc(0.1034230215 * var(--horse-width) )) translateY(calc(-0.0038184827 * (var(--horse-height) / 5))) scale(5) rotate(-150deg);
            transform: translateX(calc(0.1034230215 * var(--horse-width) )) translateY(calc(-0.0038184827 * (var(--horse-height) / 5))) scale(5) rotate(-150deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-14 {100% {
    -webkit-transform: translateX(calc(0.1034230215 * var(--horse-width) )) translateY(calc(-0.0038184827 * (var(--horse-height) / 5))) scale(5) rotate(-150deg);
            transform: translateX(calc(0.1034230215 * var(--horse-width) )) translateY(calc(-0.0038184827 * (var(--horse-height) / 5))) scale(5) rotate(-150deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(14) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-14 var(--speed) ease-out infinite;
          animation: uc-particle-animation-14 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.14s);
          animation-delay: calc((var(--speed) * 0.1) + 0.14s);}
.uc-uni .dust.back .particle:nth-child(14) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.14s);
          animation-delay: calc((var(--speed) * 0.68) + 0.14s);}
@-webkit-keyframes uc-particle-animation-15 {100% {
    -webkit-transform: translateX(calc(0.6811699412 * var(--horse-width) )) translateY(calc(-0.0004574408 * (var(--horse-height) / 5))) scale(6) rotate(-105.5deg);
            transform: translateX(calc(0.6811699412 * var(--horse-width) )) translateY(calc(-0.0004574408 * (var(--horse-height) / 5))) scale(6) rotate(-105.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-15 {100% {
    -webkit-transform: translateX(calc(0.6811699412 * var(--horse-width) )) translateY(calc(-0.0004574408 * (var(--horse-height) / 5))) scale(6) rotate(-105.5deg);
            transform: translateX(calc(0.6811699412 * var(--horse-width) )) translateY(calc(-0.0004574408 * (var(--horse-height) / 5))) scale(6) rotate(-105.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(15) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-15 var(--speed) ease-out infinite;
          animation: uc-particle-animation-15 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.15s);
          animation-delay: calc((var(--speed) * 0.1) + 0.15s);}
.uc-uni .dust.back .particle:nth-child(15) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.15s);
          animation-delay: calc((var(--speed) * 0.68) + 0.15s);}
@-webkit-keyframes uc-particle-animation-16 {100% {
    -webkit-transform: translateX(calc(0.3868914844 * var(--horse-width) )) translateY(calc(-0.0059887576 * (var(--horse-height) / 5))) scale(6) rotate(-139.5deg);
            transform: translateX(calc(0.3868914844 * var(--horse-width) )) translateY(calc(-0.0059887576 * (var(--horse-height) / 5))) scale(6) rotate(-139.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-16 {100% {
    -webkit-transform: translateX(calc(0.3868914844 * var(--horse-width) )) translateY(calc(-0.0059887576 * (var(--horse-height) / 5))) scale(6) rotate(-139.5deg);
            transform: translateX(calc(0.3868914844 * var(--horse-width) )) translateY(calc(-0.0059887576 * (var(--horse-height) / 5))) scale(6) rotate(-139.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(16) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-16 var(--speed) ease-out infinite;
          animation: uc-particle-animation-16 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.16s);
          animation-delay: calc((var(--speed) * 0.1) + 0.16s);}
.uc-uni .dust.back .particle:nth-child(16) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.16s);
          animation-delay: calc((var(--speed) * 0.68) + 0.16s);}
@-webkit-keyframes uc-particle-animation-17 {100% {
    -webkit-transform: translateX(calc(0.1950402245 * var(--horse-width) )) translateY(calc(-0.0056747992 * (var(--horse-height) / 5))) scale(5) rotate(-123.5deg);
            transform: translateX(calc(0.1950402245 * var(--horse-width) )) translateY(calc(-0.0056747992 * (var(--horse-height) / 5))) scale(5) rotate(-123.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-17 {100% {
    -webkit-transform: translateX(calc(0.1950402245 * var(--horse-width) )) translateY(calc(-0.0056747992 * (var(--horse-height) / 5))) scale(5) rotate(-123.5deg);
            transform: translateX(calc(0.1950402245 * var(--horse-width) )) translateY(calc(-0.0056747992 * (var(--horse-height) / 5))) scale(5) rotate(-123.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(17) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-17 var(--speed) ease-out infinite;
          animation: uc-particle-animation-17 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.17s);
          animation-delay: calc((var(--speed) * 0.1) + 0.17s);}
.uc-uni .dust.back .particle:nth-child(17) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.17s);
          animation-delay: calc((var(--speed) * 0.68) + 0.17s);}
@-webkit-keyframes uc-particle-animation-18 {100% {
    -webkit-transform: translateX(calc(0.108179063 * var(--horse-width) )) translateY(calc(-0.0047562251 * (var(--horse-height) / 5))) scale(3) rotate(-81deg);
            transform: translateX(calc(0.108179063 * var(--horse-width) )) translateY(calc(-0.0047562251 * (var(--horse-height) / 5))) scale(3) rotate(-81deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-18 {100% {
    -webkit-transform: translateX(calc(0.108179063 * var(--horse-width) )) translateY(calc(-0.0047562251 * (var(--horse-height) / 5))) scale(3) rotate(-81deg);
            transform: translateX(calc(0.108179063 * var(--horse-width) )) translateY(calc(-0.0047562251 * (var(--horse-height) / 5))) scale(3) rotate(-81deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(18) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-18 var(--speed) ease-out infinite;
          animation: uc-particle-animation-18 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.18s);
          animation-delay: calc((var(--speed) * 0.1) + 0.18s);}
.uc-uni .dust.back .particle:nth-child(18) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.18s);
          animation-delay: calc((var(--speed) * 0.68) + 0.18s);}
@-webkit-keyframes uc-particle-animation-19 {100% {
    -webkit-transform: translateX(calc(0.665064983 * var(--horse-width) )) translateY(calc(-0.0047968338 * (var(--horse-height) / 5))) scale(5) rotate(-164deg);
            transform: translateX(calc(0.665064983 * var(--horse-width) )) translateY(calc(-0.0047968338 * (var(--horse-height) / 5))) scale(5) rotate(-164deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-19 {100% {
    -webkit-transform: translateX(calc(0.665064983 * var(--horse-width) )) translateY(calc(-0.0047968338 * (var(--horse-height) / 5))) scale(5) rotate(-164deg);
            transform: translateX(calc(0.665064983 * var(--horse-width) )) translateY(calc(-0.0047968338 * (var(--horse-height) / 5))) scale(5) rotate(-164deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(19) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-19 var(--speed) ease-out infinite;
          animation: uc-particle-animation-19 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.19s);
          animation-delay: calc((var(--speed) * 0.1) + 0.19s);}
.uc-uni .dust.back .particle:nth-child(19) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.19s);
          animation-delay: calc((var(--speed) * 0.68) + 0.19s);}
@-webkit-keyframes uc-particle-animation-20 {100% {
    -webkit-transform: translateX(calc(0.3799311838 * var(--horse-width) )) translateY(calc(-0.0012141532 * (var(--horse-height) / 5))) scale(3) rotate(-22.5deg);
            transform: translateX(calc(0.3799311838 * var(--horse-width) )) translateY(calc(-0.0012141532 * (var(--horse-height) / 5))) scale(3) rotate(-22.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-20 {100% {
    -webkit-transform: translateX(calc(0.3799311838 * var(--horse-width) )) translateY(calc(-0.0012141532 * (var(--horse-height) / 5))) scale(3) rotate(-22.5deg);
            transform: translateX(calc(0.3799311838 * var(--horse-width) )) translateY(calc(-0.0012141532 * (var(--horse-height) / 5))) scale(3) rotate(-22.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(20) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-20 var(--speed) ease-out infinite;
          animation: uc-particle-animation-20 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.2s);
          animation-delay: calc((var(--speed) * 0.1) + 0.2s);}
.uc-uni .dust.back .particle:nth-child(20) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.2s);
          animation-delay: calc((var(--speed) * 0.68) + 0.2s);}
@-webkit-keyframes uc-particle-animation-21 {100% {
    -webkit-transform: translateX(calc(0.6391360309 * var(--horse-width) )) translateY(calc(-0.009106735 * (var(--horse-height) / 5))) scale(3) rotate(-48.5deg);
            transform: translateX(calc(0.6391360309 * var(--horse-width) )) translateY(calc(-0.009106735 * (var(--horse-height) / 5))) scale(3) rotate(-48.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-21 {100% {
    -webkit-transform: translateX(calc(0.6391360309 * var(--horse-width) )) translateY(calc(-0.009106735 * (var(--horse-height) / 5))) scale(3) rotate(-48.5deg);
            transform: translateX(calc(0.6391360309 * var(--horse-width) )) translateY(calc(-0.009106735 * (var(--horse-height) / 5))) scale(3) rotate(-48.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(21) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-21 var(--speed) ease-out infinite;
          animation: uc-particle-animation-21 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.21s);
          animation-delay: calc((var(--speed) * 0.1) + 0.21s);}
.uc-uni .dust.back .particle:nth-child(21) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.21s);
          animation-delay: calc((var(--speed) * 0.68) + 0.21s);}
@-webkit-keyframes uc-particle-animation-22 {100% {
    -webkit-transform: translateX(calc(0.5704055607 * var(--horse-width) )) translateY(calc(-0.0003910802 * (var(--horse-height) / 5))) scale(6) rotate(-69.5deg);
            transform: translateX(calc(0.5704055607 * var(--horse-width) )) translateY(calc(-0.0003910802 * (var(--horse-height) / 5))) scale(6) rotate(-69.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-22 {100% {
    -webkit-transform: translateX(calc(0.5704055607 * var(--horse-width) )) translateY(calc(-0.0003910802 * (var(--horse-height) / 5))) scale(6) rotate(-69.5deg);
            transform: translateX(calc(0.5704055607 * var(--horse-width) )) translateY(calc(-0.0003910802 * (var(--horse-height) / 5))) scale(6) rotate(-69.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(22) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-22 var(--speed) ease-out infinite;
          animation: uc-particle-animation-22 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.22s);
          animation-delay: calc((var(--speed) * 0.1) + 0.22s);}
.uc-uni .dust.back .particle:nth-child(22) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.22s);
          animation-delay: calc((var(--speed) * 0.68) + 0.22s);}
@-webkit-keyframes uc-particle-animation-23 {100% {
    -webkit-transform: translateX(calc(0.5243436617 * var(--horse-width) )) translateY(calc(-0.0087148752 * (var(--horse-height) / 5))) scale(4) rotate(-103deg);
            transform: translateX(calc(0.5243436617 * var(--horse-width) )) translateY(calc(-0.0087148752 * (var(--horse-height) / 5))) scale(4) rotate(-103deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-23 {100% {
    -webkit-transform: translateX(calc(0.5243436617 * var(--horse-width) )) translateY(calc(-0.0087148752 * (var(--horse-height) / 5))) scale(4) rotate(-103deg);
            transform: translateX(calc(0.5243436617 * var(--horse-width) )) translateY(calc(-0.0087148752 * (var(--horse-height) / 5))) scale(4) rotate(-103deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(23) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-23 var(--speed) ease-out infinite;
          animation: uc-particle-animation-23 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.23s);
          animation-delay: calc((var(--speed) * 0.1) + 0.23s);}
.uc-uni .dust.back .particle:nth-child(23) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.23s);
          animation-delay: calc((var(--speed) * 0.68) + 0.23s);}
@-webkit-keyframes uc-particle-animation-24 {100% {
    -webkit-transform: translateX(calc(0.1731283628 * var(--horse-width) )) translateY(calc(-0.0092726604 * (var(--horse-height) / 5))) scale(6) rotate(-73deg);
            transform: translateX(calc(0.1731283628 * var(--horse-width) )) translateY(calc(-0.0092726604 * (var(--horse-height) / 5))) scale(6) rotate(-73deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-24 {100% {
    -webkit-transform: translateX(calc(0.1731283628 * var(--horse-width) )) translateY(calc(-0.0092726604 * (var(--horse-height) / 5))) scale(6) rotate(-73deg);
            transform: translateX(calc(0.1731283628 * var(--horse-width) )) translateY(calc(-0.0092726604 * (var(--horse-height) / 5))) scale(6) rotate(-73deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(24) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-24 var(--speed) ease-out infinite;
          animation: uc-particle-animation-24 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.24s);
          animation-delay: calc((var(--speed) * 0.1) + 0.24s);}
.uc-uni .dust.back .particle:nth-child(24) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.24s);
          animation-delay: calc((var(--speed) * 0.68) + 0.24s);}
@-webkit-keyframes uc-particle-animation-25 {100% {
    -webkit-transform: translateX(calc(0.0794815925 * var(--horse-width) )) translateY(calc(-0.0068352112 * (var(--horse-height) / 5))) scale(6) rotate(-93.5deg);
            transform: translateX(calc(0.0794815925 * var(--horse-width) )) translateY(calc(-0.0068352112 * (var(--horse-height) / 5))) scale(6) rotate(-93.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-25 {100% {
    -webkit-transform: translateX(calc(0.0794815925 * var(--horse-width) )) translateY(calc(-0.0068352112 * (var(--horse-height) / 5))) scale(6) rotate(-93.5deg);
            transform: translateX(calc(0.0794815925 * var(--horse-width) )) translateY(calc(-0.0068352112 * (var(--horse-height) / 5))) scale(6) rotate(-93.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(25) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-25 var(--speed) ease-out infinite;
          animation: uc-particle-animation-25 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.25s);
          animation-delay: calc((var(--speed) * 0.1) + 0.25s);}
.uc-uni .dust.back .particle:nth-child(25) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.25s);
          animation-delay: calc((var(--speed) * 0.68) + 0.25s);}
@-webkit-keyframes uc-particle-animation-26 {100% {
    -webkit-transform: translateX(calc(0.3962348094 * var(--horse-width) )) translateY(calc(-0.0079345421 * (var(--horse-height) / 5))) scale(3) rotate(-56deg);
            transform: translateX(calc(0.3962348094 * var(--horse-width) )) translateY(calc(-0.0079345421 * (var(--horse-height) / 5))) scale(3) rotate(-56deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-26 {100% {
    -webkit-transform: translateX(calc(0.3962348094 * var(--horse-width) )) translateY(calc(-0.0079345421 * (var(--horse-height) / 5))) scale(3) rotate(-56deg);
            transform: translateX(calc(0.3962348094 * var(--horse-width) )) translateY(calc(-0.0079345421 * (var(--horse-height) / 5))) scale(3) rotate(-56deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(26) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-26 var(--speed) ease-out infinite;
          animation: uc-particle-animation-26 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.26s);
          animation-delay: calc((var(--speed) * 0.1) + 0.26s);}
.uc-uni .dust.back .particle:nth-child(26) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.26s);
          animation-delay: calc((var(--speed) * 0.68) + 0.26s);}
@-webkit-keyframes uc-particle-animation-27 {100% {
    -webkit-transform: translateX(calc(0.3415531831 * var(--horse-width) )) translateY(calc(-0.0022188424 * (var(--horse-height) / 5))) scale(5) rotate(-153.5deg);
            transform: translateX(calc(0.3415531831 * var(--horse-width) )) translateY(calc(-0.0022188424 * (var(--horse-height) / 5))) scale(5) rotate(-153.5deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-27 {100% {
    -webkit-transform: translateX(calc(0.3415531831 * var(--horse-width) )) translateY(calc(-0.0022188424 * (var(--horse-height) / 5))) scale(5) rotate(-153.5deg);
            transform: translateX(calc(0.3415531831 * var(--horse-width) )) translateY(calc(-0.0022188424 * (var(--horse-height) / 5))) scale(5) rotate(-153.5deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(27) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-27 var(--speed) ease-out infinite;
          animation: uc-particle-animation-27 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.27s);
          animation-delay: calc((var(--speed) * 0.1) + 0.27s);}
.uc-uni .dust.back .particle:nth-child(27) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.27s);
          animation-delay: calc((var(--speed) * 0.68) + 0.27s);}
@-webkit-keyframes uc-particle-animation-28 {100% {
    -webkit-transform: translateX(calc(0.393523244 * var(--horse-width) )) translateY(calc(-0.0088784406 * (var(--horse-height) / 5))) scale(6) rotate(-14deg);
            transform: translateX(calc(0.393523244 * var(--horse-width) )) translateY(calc(-0.0088784406 * (var(--horse-height) / 5))) scale(6) rotate(-14deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-28 {100% {
    -webkit-transform: translateX(calc(0.393523244 * var(--horse-width) )) translateY(calc(-0.0088784406 * (var(--horse-height) / 5))) scale(6) rotate(-14deg);
            transform: translateX(calc(0.393523244 * var(--horse-width) )) translateY(calc(-0.0088784406 * (var(--horse-height) / 5))) scale(6) rotate(-14deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(28) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-28 var(--speed) ease-out infinite;
          animation: uc-particle-animation-28 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.28s);
          animation-delay: calc((var(--speed) * 0.1) + 0.28s);}
.uc-uni .dust.back .particle:nth-child(28) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.28s);
          animation-delay: calc((var(--speed) * 0.68) + 0.28s);}
@-webkit-keyframes uc-particle-animation-29 {100% {
    -webkit-transform: translateX(calc(0.5950931187 * var(--horse-width) )) translateY(calc(-0.0052506571 * (var(--horse-height) / 5))) scale(5) rotate(-40deg);
            transform: translateX(calc(0.5950931187 * var(--horse-width) )) translateY(calc(-0.0052506571 * (var(--horse-height) / 5))) scale(5) rotate(-40deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-29 {100% {
    -webkit-transform: translateX(calc(0.5950931187 * var(--horse-width) )) translateY(calc(-0.0052506571 * (var(--horse-height) / 5))) scale(5) rotate(-40deg);
            transform: translateX(calc(0.5950931187 * var(--horse-width) )) translateY(calc(-0.0052506571 * (var(--horse-height) / 5))) scale(5) rotate(-40deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(29) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-29 var(--speed) ease-out infinite;
          animation: uc-particle-animation-29 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.29s);
          animation-delay: calc((var(--speed) * 0.1) + 0.29s);}
.uc-uni .dust.back .particle:nth-child(29) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.29s);
          animation-delay: calc((var(--speed) * 0.68) + 0.29s);}
@-webkit-keyframes uc-particle-animation-30 {100% {
    -webkit-transform: translateX(calc(0.1338113957 * var(--horse-width) )) translateY(calc(-0.0052104567 * (var(--horse-height) / 5))) scale(5) rotate(-170deg);
            transform: translateX(calc(0.1338113957 * var(--horse-width) )) translateY(calc(-0.0052104567 * (var(--horse-height) / 5))) scale(5) rotate(-170deg);
    opacity: 0;
  }}
@keyframes uc-particle-animation-30 {100% {
    -webkit-transform: translateX(calc(0.1338113957 * var(--horse-width) )) translateY(calc(-0.0052104567 * (var(--horse-height) / 5))) scale(5) rotate(-170deg);
            transform: translateX(calc(0.1338113957 * var(--horse-width) )) translateY(calc(-0.0052104567 * (var(--horse-height) / 5))) scale(5) rotate(-170deg);
    opacity: 0;
  }}
.uc-uni .particle:nth-child(30) {-webkit-transform-origin: -20% -20%;
          transform-origin: -20% -20%;
  -webkit-animation: uc-particle-animation-30 var(--speed) ease-out infinite;
          animation: uc-particle-animation-30 var(--speed) ease-out infinite;
  -webkit-animation-delay: calc((var(--speed) * 0.1) + 0.3s);
          animation-delay: calc((var(--speed) * 0.1) + 0.3s);}
.uc-uni .dust.back .particle:nth-child(30) {-webkit-animation-delay: calc((var(--speed) * 0.68) + 0.3s);
          animation-delay: calc((var(--speed) * 0.68) + 0.3s);}
.uc-uni .🐴 {width: var(--horse-width);
  height: var(--horse-height);
  border: 0px solid var(--outlines);}
.uc-uni .🐴 *, .uc-uni .🐴 *:after, .uc-uni .🐴 *:before {border: 1px dashed var(--outlines);}
.uc-uni .🐴 > * {position: absolute;
  top: var(--part-y, 0);
  left: var(--part-x, 0);
  width: var(--part-width, 10px);
  height: var(--part-height, 10px);
  border-radius: var(--part-radius, 0);
  -webkit-transform: rotate(var(--part-rotate, 0deg));
          transform: rotate(var(--part-rotate, 0deg));
  -webkit-transform-origin: var(--part-origin, 50% 50%);
          transform-origin: var(--part-origin, 50% 50%);
  -webkit-animation-delay: var(--delay, 0s) !important;
          animation-delay: var(--delay, 0s) !important;}
.uc-uni .🐴 > * *, .uc-uni .🐴 > * *:after, .uc-uni .🐴 > * *:before {position: absolute;
  background-color: var(--color-horse);
  top: var(--shape-y, 0);
  left: var(--shape-x, 0);
  width: var(--shape-width, 10px);
  height: var(--shape-height, 10px);
  border-radius: var(--shape-radius, 0);
  -webkit-transform: rotate(var(--shape-rotate, 0deg));
          transform: rotate(var(--shape-rotate, 0deg));
  -webkit-transform-origin: var(--shape-origin, 50% 50%);
          transform-origin: var(--shape-origin, 50% 50%);
  -webkit-animation-delay: var(--delay, 0s) !important;
          animation-delay: var(--delay, 0s) !important;}
.uc-uni .head {--part-width: 20%;
  --part-height: 15%;
  --part-x: -1%;
  --part-y: 3%;
  --part-origin: 100% 50%;
  --part-rotate: -40deg;
  border: none;}
.uc-uni .head .skull {--shape-width: 55%;
  --shape-height: 80%;
  --shape-radius: 50%;
  --shape-x: 43%;
  --shape-y: 10%;
  --shape-rotate: 40deg;}
.uc-uni .head .eye {background-color: var(--color-horse-back);
  --shape-width: 6%;
  --shape-height: 10%;
  --shape-radius: 30% 100%;
  --shape-x: 45%;
  --shape-y: 20%;
  --shape-rotate: 0deg;}
.uc-uni .head .face {--shape-width: 47%;
  --shape-height: 50%;
  --shape-y: 8%;
  --shape-x: 14%;
  --shape-rotate: -5deg;}
.uc-uni .head .nose {--shape-x: 0%;
  --shape-y: 11.7%;
  --shape-width: 24%;
  --shape-height: 35%;
  --shape-radius: 50%;
  --shape-rotate: -12deg;}
.uc-uni .head .jaw {--shape-width: 25%;
  --shape-height: 60%;
  --shape-x: 40%;
  --shape-y: 37%;
  --shape-radius: 45%;
  -webkit-transform: skew(0deg) rotate(40deg);
          transform: skew(0deg) rotate(40deg);}
.uc-uni .head .lip {--shape-rotate: 40deg;
  --shape-x: -3%;
  --shape-y: 28%;
  --shape-radius: 30%;
  --shape-width: 12%;
  --shape-height: 25%;}
.uc-uni .head .chin {--shape-width: 15%;
  --shape-height: 40%;
  --shape-y: 31%;
  --shape-x: 2%;
  --shape-radius: 30%;
  --shape-rotate: 40deg;}
.uc-uni .head .chin:after {content: '';
  --shape-width: 130%;
  --shape-height: 180%;
  --shape-radius: 0;
  --shape-x: 123%;
  --shape-y: -95%;
  --shape-rotate: 70deg;}
.uc-uni .head .ear {--shape-width: 20%;
  --shape-height: 15%;
  --shape-y: 17%;
  --shape-x: 78%;
  --shape-radius: 50%;
  --shape-rotate: 10deg;
  --shape-origin: 0% 50%;}
.uc-uni .head .ear:after {content: '';
  --shape-width: 70%;
  --shape-height: 40%;
  --shape-y: 10%;
  --shape-x: 65%;
  --shape-radius: 40%;
  --shape-rotate: -30deg;}
.uc-uni .head .ear:before {content: '';
  --shape-width: 70%;
  --shape-height: 30%;
  --shape-y: -20%;
  --shape-x: 50%;
  --shape-radius: 0%;
  --shape-rotate: -5deg;}
.uc-uni .neck {--part-width: 30%;
  --part-height: 25%;
  --part-x: 5%;
  --part-y: 35%;
  --part-origin: 90% 50%;
  --part-rotate: 45deg;
  border: none;}
.uc-uni .neck .under {--shape-height: 40%;
  --shape-width: 16%;
  --shape-radius: 50%;
  --shape-x: 11%;
  --shape-y: 55%;
  --shape-rotate: -19deg;
  background-color: transparent;
  border-top: 0.07em outset var(--color-horse);}
.uc-uni .neck .front {--shape-width: 75%;
  --shape-height: 55%;
  --shape-radius: 50%;
  --shape-y: 28%;
  --shape-x: 7%;
  --shape-rotate: 20deg;}
.uc-uni .neck .top {--shape-x: 10%;
  --shape-y: 5%;
  --shape-width: 50%;
  --shape-height: 25%;
  --shape-radius: 50% / 20%;
  --shape-rotate: 0deg;}
.uc-uni .neck .top:after {content: '';
  --shape-x: 50%;
  --shape-y: -10%;
  --shape-width: 70%;
  --shape-height: 50%;
  --shape-radius: 0%;
  --shape-rotate: -5deg;}
.uc-uni .neck .base {--shape-width:50%;
  --shape-height:30%;
  --shape-x: 20%;
  --shape-y: 10%;
  --shape-radius: 30%;
  --shape-rotate: -10deg;}
.uc-uni .neck .shoulder {--shape-width:50%;
  --shape-height:30%;
  --shape-x: 48%;
  --shape-y: -2%;
  --shape-rotate: -20deg;
  --shape-radius: 50%;}
.uc-uni .body {--part-width: 55%;
  --part-height: 33%;
  --part-x: 20%;
  --part-y: 30%;
  --part-origin: 10% 50%;
  border: none;}
.uc-uni .body .section {--shape-width: 94%;
  --shape-height: 90%;
  --shape-x: 40%;
  --shape-y: 5%;
  --shape-origin: 10% 30%;
  --shape-radius: 50% 0 20% 20%;
  --shape-rotate: -9deg;}
.uc-uni .body .section.last {--shape-radius: 45%;}
.uc-uni .body .section.last:after {content: none;}
.uc-uni .body > .section {--shape-x: 4%;
  --shape-y: 4%;
  --shape-width: 32%;
  --shape-height: 92%;
  --shape-rotate: 10deg;
  --shape-origin: 50% 50%;
  --shape-radius: 45%;}
.uc-uni .body > .section:after {content: '';
  --shape-height: 70%;
  --shape-width: 202%;
  --shape-x: 40%;
  --shape-y: 48%;
  --shape-rotate: -23deg;
  --shape-origin: 0% 100%;
  --shape-radius: 50%;}
.uc-uni .body .back-side {--shape-x: 60%;
  --shape-y: -10%;
  --shape-width: 38%;
  --shape-height: 70%;
  --shape-origin: 0 0;
  --shape-rotate: 8deg;
  --shape-radius: 40% 50% 50%;}
.uc-uni .tail {--part-width: 35%;
  --part-height: 18%;
  --part-x: 63%;
  --part-y: 29%;
  --part-rotate: 10deg;
  --part-origin: 0% 50%;
  border: none;}
.uc-uni .tail .nub {--shape-width: 35%;
  --shape-height: 30%;
  --shape-rotate: 4deg;
  --shape-origin: 10% 50%;
  --shape-radius: 20% / 50%;
  background-color: var(--color-hair);}
.uc-uni .tail .section {--shape-width: 100%;
  --shape-height: 90%;
  --shape-rotate: 15deg;
  --shape-origin: 0% 50%;
  --shape-radius: 30% / 50%;
  --shape-y: -25%;
  --shape-x: 60%;
  background-color: var(--color-hair);}
.uc-uni .tail .section:after {content: '';
  --shape-width: 170%;
  --shape-height: 120%;
  --shape-rotate: 6deg;
  --shape-origin: 0% 50%;
  --shape-radius: 50%;
  --shape-y: -10%;
  --shape-x: 0%;
  background-color: transparent;
  box-shadow: -1.5vmin 0.5vmin 0 0 var(--color-hair);}
.uc-uni .tail .section:before {content: '';
  --shape-width: 130%;
  --shape-height: 100%;
  --shape-rotate: -20deg;
  --shape-origin: 0% 50%;
  --shape-radius: 50%;
  --shape-y: 0%;
  --shape-x: 50%;
  background-color: transparent;
  box-shadow: -1.5vmin 1vmin 0 0 var(--color-hair);}
.uc-uni .tail .nub > .section {--shape-width: 50%;
  --shape-height: 170%;}
.uc-uni .tail .section > * > * {--shape-rotate: 0deg;
  --shape-height: 80%;}
.uc-uni .tail .section > * > * > * > * {--shape-rotate: -25deg;
  --shape-height: 40%;}
.uc-uni .front-leg {--part-width: 15%;
  --part-height: 60%;
  --part-x: 20%;
  --part-y: 40%;
  --part-origin: 100% 50%;
  border: none;}
.uc-uni .front-leg.right {--color-horse: var(--color-horse-back);
  --delay: calc( 0s - var(--speed) / var(--delay-gap));}
.uc-uni .front-leg .shoulder {--shape-x: 20%;
  --shape-width: 80%;
  --shape-height: 35%;
  --shape-origin: 100% 50%;
  --shape-radius: 30% 30% 30% 50%;
  --shape-rotate: -0deg;}
.uc-uni .front-leg .upper {--shape-x: 40%;
  --shape-y: 60%;
  --shape-width: 40%;
  --shape-height: 80%;
  --shape-origin: 40% 10%;
  --shape-radius: 30% 30% 50% 50%;
  --shape-rotate: 0deg;}
.uc-uni .front-leg .upper:before {content: '';
  --shape-x: 5%;
  --shape-radius: 20%;
  --shape-rotate: 0deg;}
.uc-uni .front-leg .upper:after {content: '';
  --shape-x: 40%;
  --shape-y: 60%;
  --shape-height: 78%;
  --shape-radius: 40%;
  --shape-rotate: 5deg;}
.uc-uni .front-leg .knee {--shape-x: 0%;
  --shape-y: 120%;
  --shape-width: 57%;
  --shape-height: 55%;
  --shape-radius: 45%;
  --shape-origin: 40% 20%;
  --shape-rotate: -0deg;}
.uc-uni .front-leg .knee:before {content: '';
  --shape-x: 0%;
  --shape-y: 60%;
  --shape-width: 30%;
  --shape-height: 40%;
  --shape-radius: 30%;
  --shape-rotate: 0deg;}
.uc-uni .front-leg .lower {--shape-x: 0%;
  --shape-y: 80%;
  --shape-width: 54%;
  --shape-height: 120%;
  --shape-radius: 5%;
  --shape-rotate: 12deg;}
.uc-uni .front-leg .ankle {--shape-x: -20%;
  --shape-y: 80%;
  --shape-width: 170%;
  --shape-height: 45%;
  --shape-radius: 50%;
  --shape-rotate: 20deg;}
.uc-uni .front-leg .foot {--shape-x: -35%;
  --shape-y: 65%;
  --shape-width: 120%;
  --shape-height: 200%;
  --shape-radius: 0%;
  --shape-rotate: 30deg;
  -webkit-clip-path: polygon(0% 0%, 80% 0%, 65% 20%, 63% 30%, 70% 45%, 75% 55%, 46% 90%, 35% 95%, 10% 70%, 5% 50%, 10% 25%);
          clip-path: polygon(0% 0%, 80% 0%, 65% 20%, 63% 30%, 70% 45%, 75% 55%, 46% 90%, 35% 95%, 10% 70%, 5% 50%, 10% 25%);}
.uc-uni .front-leg .hoof {--shape-x: 40%;
  --shape-y: 52%;
  --shape-width: 100%;
  --shape-height: 50%;
  --shape-radius: 0%;
  --shape-rotate: 55deg;
  background-color: var(--color-hoof);}
.uc-uni .back-leg {--part-width: 20%;
  --part-height: 70%;
  --part-x: 60%;
  --part-y: 30%;
  --part-origin: 100% 50%;
  border: none;}
.uc-uni .back-leg.right {--color-horse: var(--color-horse-back);
  --delay: calc( 0s - var(--speed) / var(--delay-gap));}
.uc-uni .back-leg .top {--shape-height: 20%;
  --shape-width: 75%;
  --shape-radius: 45%;
  --shape-rotate: 25deg;
  --shape-x: -8%;
  background-color: transparent;}
.uc-uni .back-leg .top:after {content: '';
  --shape-height: 140%;
  --shape-width: 40%;
  --shape-radius: 50% / 30%;
  --shape-rotate: -19deg;
  --shape-x: 55%;
  --shape-y: 20%;
  --shape-origin: 50% 10%;}
.uc-uni .back-leg .top:before {content: '';
  --shape-height: 150%;
  --shape-width: 80%;
  --shape-radius: 50% / 60%;
  --shape-rotate: -60deg;
  --shape-x: 24%;
  --shape-y: 58%;}
.uc-uni .back-leg .thigh {--shape-height: 140%;
  --shape-width: 22%;
  --shape-radius: 45% / 20%;
  --shape-rotate: -95deg;
  --shape-x: 75%;
  --shape-y: 172%;
  --shape-origin: 50% 0%;}
.uc-uni .back-leg .thigh:before {content: '';
  --shape-height: 80%;
  --shape-width: 50%;
  --shape-radius: 50%;
  --shape-rotate: -15deg;
  --shape-x: -66%;
  --shape-y: -10%;
  --shape-origin: 50% 0%;}
.uc-uni .back-leg .thigh:after {content: '';
  --shape-height: 40%;
  --shape-width: 50%;
  --shape-radius: 50%;
  --shape-rotate: 20deg;
  --shape-x: 110%;
  --shape-y: 23%;
  --shape-origin: 50% 50%;
  background-color: transparent;
  box-shadow: -1.2% 0.5% 0 0 var(--color-horse);}
.uc-uni .back-leg .lower-leg {--shape-height: 100%;
  --shape-width: 60%;
  --shape-radius: 50% / 10%;
  --shape-rotate: 47deg;
  --shape-x: 80%;
  --shape-y: 88%;
  --shape-origin: 50% 0%;}
.uc-uni .back-leg .lower-leg:after {content: '';
  --shape-height: 60%;
  --shape-width: 100%;
  --shape-radius: 50%;
  --shape-rotate: -25deg;
  --shape-x: -155%;
  --shape-y: 8%;
  --shape-origin: 50% 50%;
  background-color: transparent;
  box-shadow: 8px 1px 0 0 var(--color-horse);}
.uc-uni .back-leg .foot {--shape-x: -120%;
  --shape-y: 100%;
  --shape-width: 180%;
  --shape-height: 60%;
  --shape-radius: 0%;
  --shape-rotate: -70deg;
  -webkit-clip-path: polygon(90% 0%, 95% 10%, 100% 20%, 100% 30%, 60% 45%, 60% 55%, 70% 62%, 80% 65%, 80% 70%, 15% 95%, 10% 50%, 15% 25%, 30% 10%, 70% 0%);
          clip-path: polygon(90% 0%, 95% 10%, 100% 20%, 100% 30%, 60% 45%, 60% 55%, 70% 62%, 80% 65%, 80% 70%, 15% 95%, 10% 50%, 15% 25%, 30% 10%, 70% 0%);}
.uc-uni .back-leg .hoof {--shape-x: -10%;
  --shape-y: 65%;
  --shape-width: 100%;
  --shape-height: 100%;
  --shape-radius: 0%;
  --shape-rotate: -5deg;
  background-color: var(--color-hoof);}
@-webkit-keyframes uc-body {0%, 100% {
    -webkit-transform: rotate(8deg) translatex(2%) translatey(-5%);
            transform: rotate(8deg) translatex(2%) translatey(-5%);
  }
  9% {
    -webkit-transform: rotate(4deg) translatex(2%) translatey(0%);
            transform: rotate(4deg) translatex(2%) translatey(0%);
  }
  18.1% {
    -webkit-transform: rotate(1deg) translatex(0%) translatey(5%);
            transform: rotate(1deg) translatex(0%) translatey(5%);
  }
  27.2% {
    -webkit-transform: rotate(1deg) translatex(2%) translatey(0%) scaleX(0.92);
            transform: rotate(1deg) translatex(2%) translatey(0%) scaleX(0.92);
  }
  36.3% {
    -webkit-transform: rotate(0deg) translatex(2%) translatey(-2%) scaleX(0.9);
            transform: rotate(0deg) translatex(2%) translatey(-2%) scaleX(0.9);
  }
  45.4% {
    -webkit-transform: rotate(2deg) translatex(2%) translatey(-3%) scaleX(0.9);
            transform: rotate(2deg) translatex(2%) translatey(-3%) scaleX(0.9);
  }
  54.5% {
    -webkit-transform: rotate(3deg) translatex(2%) translatey(-5%) scaleX(0.9);
            transform: rotate(3deg) translatex(2%) translatey(-5%) scaleX(0.9);
  }
  63.6% {
    -webkit-transform: rotate(4deg) translatex(0%) translatey(-4%) scaleX(0.9);
            transform: rotate(4deg) translatex(0%) translatey(-4%) scaleX(0.9);
  }
  72.7% {
    -webkit-transform: rotate(4.5deg) translatex(0%) translatey(-3%) scaleX(0.95);
            transform: rotate(4.5deg) translatex(0%) translatey(-3%) scaleX(0.95);
  }
  81.8% {
    -webkit-transform: rotate(6.5deg) translatex(0%) translatey(-5%) scaleX(0.95);
            transform: rotate(6.5deg) translatex(0%) translatey(-5%) scaleX(0.95);
  }
  90.9% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(-14%) scaleX(1);
            transform: rotate(10deg) translatex(0%) translatey(-14%) scaleX(1);
  }}
@keyframes uc-body {0%, 100% {
    -webkit-transform: rotate(8deg) translatex(2%) translatey(-5%);
            transform: rotate(8deg) translatex(2%) translatey(-5%);
  }
  9% {
    -webkit-transform: rotate(4deg) translatex(2%) translatey(0%);
            transform: rotate(4deg) translatex(2%) translatey(0%);
  }
  18.1% {
    -webkit-transform: rotate(1deg) translatex(0%) translatey(5%);
            transform: rotate(1deg) translatex(0%) translatey(5%);
  }
  27.2% {
    -webkit-transform: rotate(1deg) translatex(2%) translatey(0%) scaleX(0.92);
            transform: rotate(1deg) translatex(2%) translatey(0%) scaleX(0.92);
  }
  36.3% {
    -webkit-transform: rotate(0deg) translatex(2%) translatey(-2%) scaleX(0.9);
            transform: rotate(0deg) translatex(2%) translatey(-2%) scaleX(0.9);
  }
  45.4% {
    -webkit-transform: rotate(2deg) translatex(2%) translatey(-3%) scaleX(0.9);
            transform: rotate(2deg) translatex(2%) translatey(-3%) scaleX(0.9);
  }
  54.5% {
    -webkit-transform: rotate(3deg) translatex(2%) translatey(-5%) scaleX(0.9);
            transform: rotate(3deg) translatex(2%) translatey(-5%) scaleX(0.9);
  }
  63.6% {
    -webkit-transform: rotate(4deg) translatex(0%) translatey(-4%) scaleX(0.9);
            transform: rotate(4deg) translatex(0%) translatey(-4%) scaleX(0.9);
  }
  72.7% {
    -webkit-transform: rotate(4.5deg) translatex(0%) translatey(-3%) scaleX(0.95);
            transform: rotate(4.5deg) translatex(0%) translatey(-3%) scaleX(0.95);
  }
  81.8% {
    -webkit-transform: rotate(6.5deg) translatex(0%) translatey(-5%) scaleX(0.95);
            transform: rotate(6.5deg) translatex(0%) translatey(-5%) scaleX(0.95);
  }
  90.9% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(-14%) scaleX(1);
            transform: rotate(10deg) translatex(0%) translatey(-14%) scaleX(1);
  }}
.uc-uni .animate .body {-webkit-animation: uc-body var(--speed) linear infinite;
          animation: uc-body var(--speed) linear infinite;}
@-webkit-keyframes uc-front-shoulder {0%, 100% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(6%);
            transform: rotate(20deg) translatex(0%) translatey(6%);
  }
  8.3% {
    -webkit-transform: rotate(8deg) translatex(-10%) translatey(0%);
            transform: rotate(8deg) translatex(-10%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(0deg) translatex(-12%) translatey(-3%);
            transform: rotate(0deg) translatex(-12%) translatey(-3%);
  }
  24.9% {
    -webkit-transform: rotate(0deg) translatex(10%) translatey(0%);
            transform: rotate(0deg) translatex(10%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-30deg) translatex(7%) translatey(-12%);
            transform: rotate(-30deg) translatex(7%) translatey(-12%);
  }
  41.6% {
    -webkit-transform: rotate(-30deg) translatex(11%) translatey(-10%);
            transform: rotate(-30deg) translatex(11%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-20deg) translatex(10%) translatey(0%);
            transform: rotate(-20deg) translatex(10%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-10deg) translatex(30%) translatey(-5%);
            transform: rotate(-10deg) translatex(30%) translatey(-5%);
  }
  66.6% {
    -webkit-transform: rotate(15deg) translatex(25%) translatey(5%);
            transform: rotate(15deg) translatex(25%) translatey(5%);
  }
  74.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }}
@keyframes uc-front-shoulder {0%, 100% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(6%);
            transform: rotate(20deg) translatex(0%) translatey(6%);
  }
  8.3% {
    -webkit-transform: rotate(8deg) translatex(-10%) translatey(0%);
            transform: rotate(8deg) translatex(-10%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(0deg) translatex(-12%) translatey(-3%);
            transform: rotate(0deg) translatex(-12%) translatey(-3%);
  }
  24.9% {
    -webkit-transform: rotate(0deg) translatex(10%) translatey(0%);
            transform: rotate(0deg) translatex(10%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-30deg) translatex(7%) translatey(-12%);
            transform: rotate(-30deg) translatex(7%) translatey(-12%);
  }
  41.6% {
    -webkit-transform: rotate(-30deg) translatex(11%) translatey(-10%);
            transform: rotate(-30deg) translatex(11%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-20deg) translatex(10%) translatey(0%);
            transform: rotate(-20deg) translatex(10%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-10deg) translatex(30%) translatey(-5%);
            transform: rotate(-10deg) translatex(30%) translatey(-5%);
  }
  66.6% {
    -webkit-transform: rotate(15deg) translatex(25%) translatey(5%);
            transform: rotate(15deg) translatex(25%) translatey(5%);
  }
  74.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }}
.uc-uni .animate .front-leg .shoulder {-webkit-animation: uc-front-shoulder var(--speed) linear infinite;
          animation: uc-front-shoulder var(--speed) linear infinite;}
@-webkit-keyframes uc-front-upper {0%, 100% {
    -webkit-transform: rotate(50deg) translatex(30%) translatey(8%);
            transform: rotate(50deg) translatex(30%) translatey(8%);
  }
  8.3% {
    -webkit-transform: rotate(45deg) translatex(40%) translatey(10%);
            transform: rotate(45deg) translatex(40%) translatey(10%);
  }
  16.6% {
    -webkit-transform: rotate(33deg) translatex(25%) translatey(10%);
            transform: rotate(33deg) translatex(25%) translatey(10%);
  }
  24.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(18deg) translatex(7%) translatey(10%);
            transform: rotate(18deg) translatex(7%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-8deg) translatex(-30%) translatey(15%);
            transform: rotate(-8deg) translatex(-30%) translatey(15%);
  }
  49.9% {
    -webkit-transform: rotate(-4deg) translatex(-20%) translatey(10%);
            transform: rotate(-4deg) translatex(-20%) translatey(10%);
  }
  58.3% {
    -webkit-transform: rotate(20deg) translatex(17%) translatey(10%);
            transform: rotate(20deg) translatex(17%) translatey(10%);
  }
  66.6% {
    -webkit-transform: rotate(30deg) translatex(20%) translatey(-10%);
            transform: rotate(30deg) translatex(20%) translatey(-10%);
  }
  74.9% {
    -webkit-transform: rotate(75deg) translatex(40%) translatey(-15%);
            transform: rotate(75deg) translatex(40%) translatey(-15%);
  }
  83.3% {
    -webkit-transform: rotate(85deg) translatex(15%) translatey(-10%);
            transform: rotate(85deg) translatex(15%) translatey(-10%);
  }
  91.6% {
    -webkit-transform: rotate(55deg) translatex(25%) translatey(-5%);
            transform: rotate(55deg) translatex(25%) translatey(-5%);
  }}
@keyframes uc-front-upper {0%, 100% {
    -webkit-transform: rotate(50deg) translatex(30%) translatey(8%);
            transform: rotate(50deg) translatex(30%) translatey(8%);
  }
  8.3% {
    -webkit-transform: rotate(45deg) translatex(40%) translatey(10%);
            transform: rotate(45deg) translatex(40%) translatey(10%);
  }
  16.6% {
    -webkit-transform: rotate(33deg) translatex(25%) translatey(10%);
            transform: rotate(33deg) translatex(25%) translatey(10%);
  }
  24.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(18deg) translatex(7%) translatey(10%);
            transform: rotate(18deg) translatex(7%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-8deg) translatex(-30%) translatey(15%);
            transform: rotate(-8deg) translatex(-30%) translatey(15%);
  }
  49.9% {
    -webkit-transform: rotate(-4deg) translatex(-20%) translatey(10%);
            transform: rotate(-4deg) translatex(-20%) translatey(10%);
  }
  58.3% {
    -webkit-transform: rotate(20deg) translatex(17%) translatey(10%);
            transform: rotate(20deg) translatex(17%) translatey(10%);
  }
  66.6% {
    -webkit-transform: rotate(30deg) translatex(20%) translatey(-10%);
            transform: rotate(30deg) translatex(20%) translatey(-10%);
  }
  74.9% {
    -webkit-transform: rotate(75deg) translatex(40%) translatey(-15%);
            transform: rotate(75deg) translatex(40%) translatey(-15%);
  }
  83.3% {
    -webkit-transform: rotate(85deg) translatex(15%) translatey(-10%);
            transform: rotate(85deg) translatex(15%) translatey(-10%);
  }
  91.6% {
    -webkit-transform: rotate(55deg) translatex(25%) translatey(-5%);
            transform: rotate(55deg) translatex(25%) translatey(-5%);
  }}
.uc-uni .animate .front-leg .upper {-webkit-animation: uc-front-upper var(--speed) linear infinite;
          animation: uc-front-upper var(--speed) linear infinite;}
@-webkit-keyframes uc-front-knee {0%, 100% {
    -webkit-transform: rotate(-15deg) translatex(0%) translatey(0%);
            transform: rotate(-15deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(-10deg) translatex(0%) translatey(0%);
            transform: rotate(-10deg) translatex(0%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(-12deg) translatex(0%) translatey(0%);
            transform: rotate(-12deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(-20deg) translatex(0%) translatey(0%);
            transform: rotate(-20deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-55deg) translatex(-25%) translatey(10%);
            transform: rotate(-55deg) translatex(-25%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-35deg) translatex(0%) translatey(-10%);
            transform: rotate(-35deg) translatex(0%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-28deg) translatex(0%) translatey(0%);
            transform: rotate(-28deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-90deg) translatex(-22%) translatey(0%);
            transform: rotate(-90deg) translatex(-22%) translatey(0%);
  }
  66.6% {
    -webkit-transform: rotate(-95deg) translatex(-30%) translatey(0%);
            transform: rotate(-95deg) translatex(-30%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-98deg) translatex(-10%) translatey(0%);
            transform: rotate(-98deg) translatex(-10%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-80deg) translatex(-20%) translatey(8%);
            transform: rotate(-80deg) translatex(-20%) translatey(8%);
  }
  91.6% {
    -webkit-transform: rotate(-50deg) translatex(-30%) translatey(10%);
            transform: rotate(-50deg) translatex(-30%) translatey(10%);
  }}
@keyframes uc-front-knee {0%, 100% {
    -webkit-transform: rotate(-15deg) translatex(0%) translatey(0%);
            transform: rotate(-15deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(-10deg) translatex(0%) translatey(0%);
            transform: rotate(-10deg) translatex(0%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(-12deg) translatex(0%) translatey(0%);
            transform: rotate(-12deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(-20deg) translatex(0%) translatey(0%);
            transform: rotate(-20deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-55deg) translatex(-25%) translatey(10%);
            transform: rotate(-55deg) translatex(-25%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-35deg) translatex(0%) translatey(-10%);
            transform: rotate(-35deg) translatex(0%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-28deg) translatex(0%) translatey(0%);
            transform: rotate(-28deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-90deg) translatex(-22%) translatey(0%);
            transform: rotate(-90deg) translatex(-22%) translatey(0%);
  }
  66.6% {
    -webkit-transform: rotate(-95deg) translatex(-30%) translatey(0%);
            transform: rotate(-95deg) translatex(-30%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-98deg) translatex(-10%) translatey(0%);
            transform: rotate(-98deg) translatex(-10%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-80deg) translatex(-20%) translatey(8%);
            transform: rotate(-80deg) translatex(-20%) translatey(8%);
  }
  91.6% {
    -webkit-transform: rotate(-50deg) translatex(-30%) translatey(10%);
            transform: rotate(-50deg) translatex(-30%) translatey(10%);
  }}
.uc-uni .animate .front-leg .knee {-webkit-animation: uc-front-knee var(--speed) linear infinite;
          animation: uc-front-knee var(--speed) linear infinite;}
@-webkit-keyframes uc-front-lower {0%, 100% {
    -webkit-transform: rotate(-25deg) translatex(20%) translatey(0%);
            transform: rotate(-25deg) translatex(20%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(-10%);
            transform: rotate(10deg) translatex(0%) translatey(-10%);
  }
  16.6% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(0%);
            transform: rotate(10deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(12deg) translatex(0%) translatey(0%);
            transform: rotate(12deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-12deg) translatex(7%) translatey(-12%);
            transform: rotate(-12deg) translatex(7%) translatey(-12%);
  }
  41.6% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-10%);
            transform: rotate(0deg) translatex(0%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-23deg) translatex(20%) translatey(-20%);
            transform: rotate(-23deg) translatex(20%) translatey(-20%);
  }
  58.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-30%);
            transform: rotate(0deg) translatex(0%) translatey(-30%);
  }
  66.6% {
    -webkit-transform: rotate(-15deg) translatex(30%) translatey(-20%);
            transform: rotate(-15deg) translatex(30%) translatey(-20%);
  }
  74.9% {
    -webkit-transform: rotate(-15deg) translatex(0%) translatey(0%);
            transform: rotate(-15deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-15deg) translatex(15%) translatey(0%);
            transform: rotate(-15deg) translatex(15%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(-10deg) translatex(20%) translatey(-30%);
            transform: rotate(-10deg) translatex(20%) translatey(-30%);
  }}
@keyframes uc-front-lower {0%, 100% {
    -webkit-transform: rotate(-25deg) translatex(20%) translatey(0%);
            transform: rotate(-25deg) translatex(20%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(-10%);
            transform: rotate(10deg) translatex(0%) translatey(-10%);
  }
  16.6% {
    -webkit-transform: rotate(10deg) translatex(0%) translatey(0%);
            transform: rotate(10deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(12deg) translatex(0%) translatey(0%);
            transform: rotate(12deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-12deg) translatex(7%) translatey(-12%);
            transform: rotate(-12deg) translatex(7%) translatey(-12%);
  }
  41.6% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-10%);
            transform: rotate(0deg) translatex(0%) translatey(-10%);
  }
  49.9% {
    -webkit-transform: rotate(-23deg) translatex(20%) translatey(-20%);
            transform: rotate(-23deg) translatex(20%) translatey(-20%);
  }
  58.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-30%);
            transform: rotate(0deg) translatex(0%) translatey(-30%);
  }
  66.6% {
    -webkit-transform: rotate(-15deg) translatex(30%) translatey(-20%);
            transform: rotate(-15deg) translatex(30%) translatey(-20%);
  }
  74.9% {
    -webkit-transform: rotate(-15deg) translatex(0%) translatey(0%);
            transform: rotate(-15deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-15deg) translatex(15%) translatey(0%);
            transform: rotate(-15deg) translatex(15%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(-10deg) translatex(20%) translatey(-30%);
            transform: rotate(-10deg) translatex(20%) translatey(-30%);
  }}
.uc-uni .animate .front-leg .lower {-webkit-animation: uc-front-lower var(--speed) linear infinite;
          animation: uc-front-lower var(--speed) linear infinite;}
@-webkit-keyframes uc-front-ankle {0%, 100% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(15deg) translatex(10%) translatey(0%);
            transform: rotate(15deg) translatex(10%) translatey(0%);
  }
  41.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-20%);
            transform: rotate(0deg) translatex(0%) translatey(-20%);
  }
  66.6% {
    -webkit-transform: rotate(-30deg) translatex(0%) translatey(0%);
            transform: rotate(-30deg) translatex(0%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-30deg) translatex(0%) translatey(0%);
            transform: rotate(-30deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-10deg) translatex(0%) translatey(-20%);
            transform: rotate(-10deg) translatex(0%) translatey(-20%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }}
@keyframes uc-front-ankle {0%, 100% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(15deg) translatex(10%) translatey(0%);
            transform: rotate(15deg) translatex(10%) translatey(0%);
  }
  41.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(0%);
            transform: rotate(0deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(0deg) translatex(0%) translatey(-20%);
            transform: rotate(0deg) translatex(0%) translatey(-20%);
  }
  66.6% {
    -webkit-transform: rotate(-30deg) translatex(0%) translatey(0%);
            transform: rotate(-30deg) translatex(0%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-30deg) translatex(0%) translatey(0%);
            transform: rotate(-30deg) translatex(0%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-10deg) translatex(0%) translatey(-20%);
            transform: rotate(-10deg) translatex(0%) translatey(-20%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(0%) translatey(0%);
            transform: rotate(20deg) translatex(0%) translatey(0%);
  }}
.uc-uni .animate .front-leg .ankle {-webkit-animation: uc-front-ankle var(--speed) linear infinite;
          animation: uc-front-ankle var(--speed) linear infinite;}
@-webkit-keyframes uc-front-foot {0%, 100% {
    -webkit-transform: rotate(-28deg) translatex(40%) translatey(0%);
            transform: rotate(-28deg) translatex(40%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(-15deg) translatex(50%) translatey(0%);
            transform: rotate(-15deg) translatex(50%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(-11deg) translatex(35%) translatey(0%);
            transform: rotate(-11deg) translatex(35%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(50deg) translatex(0%) translatey(0%);
            transform: rotate(50deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-10deg) translatex(50%) translatey(0%);
            transform: rotate(-10deg) translatex(50%) translatey(0%);
  }
  41.6% {
    -webkit-transform: rotate(-36deg) translatex(50%) translatey(0%);
            transform: rotate(-36deg) translatex(50%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(-30deg) translatex(32%) translatey(0%);
            transform: rotate(-30deg) translatex(32%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-30deg) translatex(45%) translatey(0%);
            transform: rotate(-30deg) translatex(45%) translatey(0%);
  }
  66.6% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(-50deg) translatex(50%) translatey(10%);
            transform: rotate(-50deg) translatex(50%) translatey(10%);
  }}
@keyframes uc-front-foot {0%, 100% {
    -webkit-transform: rotate(-28deg) translatex(40%) translatey(0%);
            transform: rotate(-28deg) translatex(40%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(-15deg) translatex(50%) translatey(0%);
            transform: rotate(-15deg) translatex(50%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(-11deg) translatex(35%) translatey(0%);
            transform: rotate(-11deg) translatex(35%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(50deg) translatex(0%) translatey(0%);
            transform: rotate(50deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-10deg) translatex(50%) translatey(0%);
            transform: rotate(-10deg) translatex(50%) translatey(0%);
  }
  41.6% {
    -webkit-transform: rotate(-36deg) translatex(50%) translatey(0%);
            transform: rotate(-36deg) translatex(50%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(-30deg) translatex(32%) translatey(0%);
            transform: rotate(-30deg) translatex(32%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-30deg) translatex(45%) translatey(0%);
            transform: rotate(-30deg) translatex(45%) translatey(0%);
  }
  66.6% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  83.3% {
    -webkit-transform: rotate(-30deg) translatex(50%) translatey(0%);
            transform: rotate(-30deg) translatex(50%) translatey(0%);
  }
  91.6% {
    -webkit-transform: rotate(-50deg) translatex(50%) translatey(10%);
            transform: rotate(-50deg) translatex(50%) translatey(10%);
  }}
.uc-uni .animate .front-leg .foot {-webkit-animation: uc-front-foot var(--speed) linear infinite;
          animation: uc-front-foot var(--speed) linear infinite;}
@-webkit-keyframes uc-back-top {0%, 100% {
    -webkit-transform: rotate(0deg) translatex(-5%) translatey(50%);
            transform: rotate(0deg) translatex(-5%) translatey(50%);
  }
  8.3% {
    -webkit-transform: rotate(-5deg) translatex(-7%) translatey(38%);
            transform: rotate(-5deg) translatex(-7%) translatey(38%);
  }
  16.6% {
    -webkit-transform: rotate(-10deg) translatex(-14%) translatey(30%);
            transform: rotate(-10deg) translatex(-14%) translatey(30%);
  }
  24.9% {
    -webkit-transform: rotate(25deg) translatex(0%) translatey(10%);
            transform: rotate(25deg) translatex(0%) translatey(10%);
  }
  33.3% {
    -webkit-transform: rotate(32deg) translatex(-18%) translatey(25%);
            transform: rotate(32deg) translatex(-18%) translatey(25%);
  }
  41.6% {
    -webkit-transform: rotate(45deg) translatex(-5%) translatey(20%);
            transform: rotate(45deg) translatex(-5%) translatey(20%);
  }
  49.9% {
    -webkit-transform: rotate(65deg) translatex(10%) translatey(35%);
            transform: rotate(65deg) translatex(10%) translatey(35%);
  }
  58.3% {
    -webkit-transform: rotate(65deg) translatex(10%) translatey(40%);
            transform: rotate(65deg) translatex(10%) translatey(40%);
  }
  66.6% {
    -webkit-transform: rotate(75deg) translatex(20%) translatey(40%);
            transform: rotate(75deg) translatex(20%) translatey(40%);
  }
  74.9% {
    -webkit-transform: rotate(70deg) translatex(20%) translatey(45%);
            transform: rotate(70deg) translatex(20%) translatey(45%);
  }
  83.3% {
    -webkit-transform: rotate(60deg) translatex(25%) translatey(40%);
            transform: rotate(60deg) translatex(25%) translatey(40%);
  }
  91.6% {
    -webkit-transform: rotate(30deg) translatex(10%) translatey(40%);
            transform: rotate(30deg) translatex(10%) translatey(40%);
  }}
@keyframes uc-back-top {0%, 100% {
    -webkit-transform: rotate(0deg) translatex(-5%) translatey(50%);
            transform: rotate(0deg) translatex(-5%) translatey(50%);
  }
  8.3% {
    -webkit-transform: rotate(-5deg) translatex(-7%) translatey(38%);
            transform: rotate(-5deg) translatex(-7%) translatey(38%);
  }
  16.6% {
    -webkit-transform: rotate(-10deg) translatex(-14%) translatey(30%);
            transform: rotate(-10deg) translatex(-14%) translatey(30%);
  }
  24.9% {
    -webkit-transform: rotate(25deg) translatex(0%) translatey(10%);
            transform: rotate(25deg) translatex(0%) translatey(10%);
  }
  33.3% {
    -webkit-transform: rotate(32deg) translatex(-18%) translatey(25%);
            transform: rotate(32deg) translatex(-18%) translatey(25%);
  }
  41.6% {
    -webkit-transform: rotate(45deg) translatex(-5%) translatey(20%);
            transform: rotate(45deg) translatex(-5%) translatey(20%);
  }
  49.9% {
    -webkit-transform: rotate(65deg) translatex(10%) translatey(35%);
            transform: rotate(65deg) translatex(10%) translatey(35%);
  }
  58.3% {
    -webkit-transform: rotate(65deg) translatex(10%) translatey(40%);
            transform: rotate(65deg) translatex(10%) translatey(40%);
  }
  66.6% {
    -webkit-transform: rotate(75deg) translatex(20%) translatey(40%);
            transform: rotate(75deg) translatex(20%) translatey(40%);
  }
  74.9% {
    -webkit-transform: rotate(70deg) translatex(20%) translatey(45%);
            transform: rotate(70deg) translatex(20%) translatey(45%);
  }
  83.3% {
    -webkit-transform: rotate(60deg) translatex(25%) translatey(40%);
            transform: rotate(60deg) translatex(25%) translatey(40%);
  }
  91.6% {
    -webkit-transform: rotate(30deg) translatex(10%) translatey(40%);
            transform: rotate(30deg) translatex(10%) translatey(40%);
  }}
.uc-uni .animate .back-leg .top {-webkit-animation: uc-back-top var(--speed) linear infinite;
          animation: uc-back-top var(--speed) linear infinite;}
@-webkit-keyframes uc-back-thigh {0%, 100% {
    -webkit-transform: rotate(-45deg) translatex(-30%) translatey(-10%);
            transform: rotate(-45deg) translatex(-30%) translatey(-10%);
  }
  8.3% {
    -webkit-transform: rotate(-45deg) translatex(-30%) translatey(-8%);
            transform: rotate(-45deg) translatex(-30%) translatey(-8%);
  }
  16.6% {
    -webkit-transform: rotate(-43deg) translatex(-35%) translatey(-10%);
            transform: rotate(-43deg) translatex(-35%) translatey(-10%);
  }
  24.9% {
    -webkit-transform: rotate(-95deg) translatex(0%) translatey(0%);
            transform: rotate(-95deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-115deg) translatex(0%) translatey(10%);
            transform: rotate(-115deg) translatex(0%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-130deg) translatex(20%) translatey(-5%);
            transform: rotate(-130deg) translatex(20%) translatey(-5%);
  }
  49.9% {
    -webkit-transform: rotate(-130deg) translatex(10%) translatey(0%);
            transform: rotate(-130deg) translatex(10%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-90deg) translatex(80%) translatey(-20%);
            transform: rotate(-90deg) translatex(80%) translatey(-20%);
  }
  66.6% {
    -webkit-transform: rotate(-85deg) translatex(0%) translatey(-20%);
            transform: rotate(-85deg) translatex(0%) translatey(-20%);
  }
  74.9% {
    -webkit-transform: rotate(-65deg) translatex(5%) translatey(-10%);
            transform: rotate(-65deg) translatex(5%) translatey(-10%);
  }
  83.3% {
    -webkit-transform: rotate(-65deg) translatex(10%) translatey(-10%);
            transform: rotate(-65deg) translatex(10%) translatey(-10%);
  }
  91.6% {
    -webkit-transform: rotate(-75deg) translatex(-20%) translatey(-15%);
            transform: rotate(-75deg) translatex(-20%) translatey(-15%);
  }}
@keyframes uc-back-thigh {0%, 100% {
    -webkit-transform: rotate(-45deg) translatex(-30%) translatey(-10%);
            transform: rotate(-45deg) translatex(-30%) translatey(-10%);
  }
  8.3% {
    -webkit-transform: rotate(-45deg) translatex(-30%) translatey(-8%);
            transform: rotate(-45deg) translatex(-30%) translatey(-8%);
  }
  16.6% {
    -webkit-transform: rotate(-43deg) translatex(-35%) translatey(-10%);
            transform: rotate(-43deg) translatex(-35%) translatey(-10%);
  }
  24.9% {
    -webkit-transform: rotate(-95deg) translatex(0%) translatey(0%);
            transform: rotate(-95deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-115deg) translatex(0%) translatey(10%);
            transform: rotate(-115deg) translatex(0%) translatey(10%);
  }
  41.6% {
    -webkit-transform: rotate(-130deg) translatex(20%) translatey(-5%);
            transform: rotate(-130deg) translatex(20%) translatey(-5%);
  }
  49.9% {
    -webkit-transform: rotate(-130deg) translatex(10%) translatey(0%);
            transform: rotate(-130deg) translatex(10%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-90deg) translatex(80%) translatey(-20%);
            transform: rotate(-90deg) translatex(80%) translatey(-20%);
  }
  66.6% {
    -webkit-transform: rotate(-85deg) translatex(0%) translatey(-20%);
            transform: rotate(-85deg) translatex(0%) translatey(-20%);
  }
  74.9% {
    -webkit-transform: rotate(-65deg) translatex(5%) translatey(-10%);
            transform: rotate(-65deg) translatex(5%) translatey(-10%);
  }
  83.3% {
    -webkit-transform: rotate(-65deg) translatex(10%) translatey(-10%);
            transform: rotate(-65deg) translatex(10%) translatey(-10%);
  }
  91.6% {
    -webkit-transform: rotate(-75deg) translatex(-20%) translatey(-15%);
            transform: rotate(-75deg) translatex(-20%) translatey(-15%);
  }}
.uc-uni .animate .back-leg .thigh {-webkit-animation: uc-back-thigh var(--speed) linear infinite;
          animation: uc-back-thigh var(--speed) linear infinite;}
@-webkit-keyframes uc-back-lower-leg {0%, 100% {
    -webkit-transform: rotate(40deg) translatex(0%) translatey(0%);
            transform: rotate(40deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(30deg) translatex(-30%) translatey(0%);
            transform: rotate(30deg) translatex(-30%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(28deg) translatex(-40%) translatey(0%);
            transform: rotate(28deg) translatex(-40%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(47deg) translatex(0%) translatey(0%);
            transform: rotate(47deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(78deg) translatex(0%) translatey(5%);
            transform: rotate(78deg) translatex(0%) translatey(5%);
  }
  41.6% {
    -webkit-transform: rotate(110deg) translatex(40%) translatey(10%);
            transform: rotate(110deg) translatex(40%) translatey(10%);
  }
  49.9% {
    -webkit-transform: rotate(115deg) translatex(50%) translatey(5%);
            transform: rotate(115deg) translatex(50%) translatey(5%);
  }
  58.3% {
    -webkit-transform: rotate(90deg) translatex(30%) translatey(5%);
            transform: rotate(90deg) translatex(30%) translatey(5%);
  }
  66.6% {
    -webkit-transform: rotate(76deg) translatex(0%) translatey(0%);
            transform: rotate(76deg) translatex(0%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(50deg) translatex(-40%) translatey(-4%);
            transform: rotate(50deg) translatex(-40%) translatey(-4%);
  }
  83.3% {
    -webkit-transform: rotate(40deg) translatex(-20%) translatey(-5%);
            transform: rotate(40deg) translatex(-20%) translatey(-5%);
  }
  91.6% {
    -webkit-transform: rotate(70deg) translatex(0%) translatey(0%);
            transform: rotate(70deg) translatex(0%) translatey(0%);
  }}
@keyframes uc-back-lower-leg {0%, 100% {
    -webkit-transform: rotate(40deg) translatex(0%) translatey(0%);
            transform: rotate(40deg) translatex(0%) translatey(0%);
  }
  8.3% {
    -webkit-transform: rotate(30deg) translatex(-30%) translatey(0%);
            transform: rotate(30deg) translatex(-30%) translatey(0%);
  }
  16.6% {
    -webkit-transform: rotate(28deg) translatex(-40%) translatey(0%);
            transform: rotate(28deg) translatex(-40%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(47deg) translatex(0%) translatey(0%);
            transform: rotate(47deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(78deg) translatex(0%) translatey(5%);
            transform: rotate(78deg) translatex(0%) translatey(5%);
  }
  41.6% {
    -webkit-transform: rotate(110deg) translatex(40%) translatey(10%);
            transform: rotate(110deg) translatex(40%) translatey(10%);
  }
  49.9% {
    -webkit-transform: rotate(115deg) translatex(50%) translatey(5%);
            transform: rotate(115deg) translatex(50%) translatey(5%);
  }
  58.3% {
    -webkit-transform: rotate(90deg) translatex(30%) translatey(5%);
            transform: rotate(90deg) translatex(30%) translatey(5%);
  }
  66.6% {
    -webkit-transform: rotate(76deg) translatex(0%) translatey(0%);
            transform: rotate(76deg) translatex(0%) translatey(0%);
  }
  74.9% {
    -webkit-transform: rotate(50deg) translatex(-40%) translatey(-4%);
            transform: rotate(50deg) translatex(-40%) translatey(-4%);
  }
  83.3% {
    -webkit-transform: rotate(40deg) translatex(-20%) translatey(-5%);
            transform: rotate(40deg) translatex(-20%) translatey(-5%);
  }
  91.6% {
    -webkit-transform: rotate(70deg) translatex(0%) translatey(0%);
            transform: rotate(70deg) translatex(0%) translatey(0%);
  }}
.uc-uni .animate .back-leg .lower-leg {-webkit-animation: uc-back-lower-leg var(--speed) linear infinite;
          animation: uc-back-lower-leg var(--speed) linear infinite;}
@-webkit-keyframes uc-back-foot {0%, 100% {
    -webkit-transform: rotate(40deg) translatex(0%) translatey(-20%);
            transform: rotate(40deg) translatex(0%) translatey(-20%);
  }
  8.3% {
    -webkit-transform: rotate(20deg) translatex(10%) translatey(-20%);
            transform: rotate(20deg) translatex(10%) translatey(-20%);
  }
  16.6% {
    -webkit-transform: rotate(-65deg) translatex(0%) translatey(0%);
            transform: rotate(-65deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(-70deg) translatex(0%) translatey(0%);
            transform: rotate(-70deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-60deg) translatex(20%) translatey(-10%);
            transform: rotate(-60deg) translatex(20%) translatey(-10%);
  }
  41.6% {
    -webkit-transform: rotate(-80deg) translatex(0%) translatey(0%);
            transform: rotate(-80deg) translatex(0%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(-70deg) translatex(0%) translatey(0%);
            transform: rotate(-70deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-60deg) translatex(10%) translatey(-10%);
            transform: rotate(-60deg) translatex(10%) translatey(-10%);
  }
  66.6% {
    -webkit-transform: rotate(-43deg) translatex(20%) translatey(-10%);
            transform: rotate(-43deg) translatex(20%) translatey(-10%);
  }
  74.9% {
    -webkit-transform: rotate(-13deg) translatex(5%) translatey(-10%);
            transform: rotate(-13deg) translatex(5%) translatey(-10%);
  }
  83.3% {
    -webkit-transform: rotate(8deg) translatex(5%) translatey(-15%);
            transform: rotate(8deg) translatex(5%) translatey(-15%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(15%) translatey(-20%);
            transform: rotate(20deg) translatex(15%) translatey(-20%);
  }}
@keyframes uc-back-foot {0%, 100% {
    -webkit-transform: rotate(40deg) translatex(0%) translatey(-20%);
            transform: rotate(40deg) translatex(0%) translatey(-20%);
  }
  8.3% {
    -webkit-transform: rotate(20deg) translatex(10%) translatey(-20%);
            transform: rotate(20deg) translatex(10%) translatey(-20%);
  }
  16.6% {
    -webkit-transform: rotate(-65deg) translatex(0%) translatey(0%);
            transform: rotate(-65deg) translatex(0%) translatey(0%);
  }
  24.9% {
    -webkit-transform: rotate(-70deg) translatex(0%) translatey(0%);
            transform: rotate(-70deg) translatex(0%) translatey(0%);
  }
  33.3% {
    -webkit-transform: rotate(-60deg) translatex(20%) translatey(-10%);
            transform: rotate(-60deg) translatex(20%) translatey(-10%);
  }
  41.6% {
    -webkit-transform: rotate(-80deg) translatex(0%) translatey(0%);
            transform: rotate(-80deg) translatex(0%) translatey(0%);
  }
  49.9% {
    -webkit-transform: rotate(-70deg) translatex(0%) translatey(0%);
            transform: rotate(-70deg) translatex(0%) translatey(0%);
  }
  58.3% {
    -webkit-transform: rotate(-60deg) translatex(10%) translatey(-10%);
            transform: rotate(-60deg) translatex(10%) translatey(-10%);
  }
  66.6% {
    -webkit-transform: rotate(-43deg) translatex(20%) translatey(-10%);
            transform: rotate(-43deg) translatex(20%) translatey(-10%);
  }
  74.9% {
    -webkit-transform: rotate(-13deg) translatex(5%) translatey(-10%);
            transform: rotate(-13deg) translatex(5%) translatey(-10%);
  }
  83.3% {
    -webkit-transform: rotate(8deg) translatex(5%) translatey(-15%);
            transform: rotate(8deg) translatex(5%) translatey(-15%);
  }
  91.6% {
    -webkit-transform: rotate(20deg) translatex(15%) translatey(-20%);
            transform: rotate(20deg) translatex(15%) translatey(-20%);
  }}
.uc-uni .animate .back-leg .foot {-webkit-animation: uc-back-foot var(--speed) linear infinite;
          animation: uc-back-foot var(--speed) linear infinite;}
@-webkit-keyframes uc-neck {0%, 100% {
    -webkit-transform: scaleX(1) rotate(40deg) translatex(0%) translatey(-10%);
            transform: scaleX(1) rotate(40deg) translatex(0%) translatey(-10%);
  }
  
  16.6% {
    -webkit-transform: scaleX(1) rotate(40deg) translatex(6%) translatey(-10%);
            transform: scaleX(1) rotate(40deg) translatex(6%) translatey(-10%);
  }
  
  33.3% {
    -webkit-transform: scaleX(0.9) rotate(45deg) translatex(3%) translatey(5%);
            transform: scaleX(0.9) rotate(45deg) translatex(3%) translatey(5%);
  }
  
  49.9% {
    -webkit-transform: scaleX(0.85) rotate(45deg) translatex(3%) translatey(-5%);
            transform: scaleX(0.85) rotate(45deg) translatex(3%) translatey(-5%);
  }
  
  66.6% {
    -webkit-transform: scaleX(0.85) rotate(40deg) translatex(0%) translatey(-15%);
            transform: scaleX(0.85) rotate(40deg) translatex(0%) translatey(-15%);
  }
  
  83.3% {
    -webkit-transform: scaleX(1) rotate(35deg) translatex(0%) translatey(-15%);
            transform: scaleX(1) rotate(35deg) translatex(0%) translatey(-15%);
  }}
@keyframes uc-neck {0%, 100% {
    -webkit-transform: scaleX(1) rotate(40deg) translatex(0%) translatey(-10%);
            transform: scaleX(1) rotate(40deg) translatex(0%) translatey(-10%);
  }
  
  16.6% {
    -webkit-transform: scaleX(1) rotate(40deg) translatex(6%) translatey(-10%);
            transform: scaleX(1) rotate(40deg) translatex(6%) translatey(-10%);
  }
  
  33.3% {
    -webkit-transform: scaleX(0.9) rotate(45deg) translatex(3%) translatey(5%);
            transform: scaleX(0.9) rotate(45deg) translatex(3%) translatey(5%);
  }
  
  49.9% {
    -webkit-transform: scaleX(0.85) rotate(45deg) translatex(3%) translatey(-5%);
            transform: scaleX(0.85) rotate(45deg) translatex(3%) translatey(-5%);
  }
  
  66.6% {
    -webkit-transform: scaleX(0.85) rotate(40deg) translatex(0%) translatey(-15%);
            transform: scaleX(0.85) rotate(40deg) translatex(0%) translatey(-15%);
  }
  
  83.3% {
    -webkit-transform: scaleX(1) rotate(35deg) translatex(0%) translatey(-15%);
            transform: scaleX(1) rotate(35deg) translatex(0%) translatey(-15%);
  }}
.uc-uni .animate .neck {-webkit-animation: uc-neck var(--speed) linear infinite;
          animation: uc-neck var(--speed) linear infinite;}
@-webkit-keyframes uc-head {0%, 100% {
    -webkit-transform: rotate(-45deg) translatex(-5%) translatey(10%);
            transform: rotate(-45deg) translatex(-5%) translatey(10%);
  }
  
  16.6% {
    -webkit-transform: rotate(-45deg) translatex(0%) translatey(15%);
            transform: rotate(-45deg) translatex(0%) translatey(15%);
  }
  
  33.3% {
    -webkit-transform: rotate(-40deg) translatex(5%) translatey(23%);
            transform: rotate(-40deg) translatex(5%) translatey(23%);
  }
  
  49.9% {
    -webkit-transform: rotate(-36deg) translatex(15%) translatey(35%);
            transform: rotate(-36deg) translatex(15%) translatey(35%);
  }
  
  66.6% {
    -webkit-transform: rotate(-42deg) translatex(5%) translatey(35%);
            transform: rotate(-42deg) translatex(5%) translatey(35%);
  }
  
  83.3% {
    -webkit-transform: rotate(-45deg) translatex(-15%) translatey(10%);
            transform: rotate(-45deg) translatex(-15%) translatey(10%);
  }}
@keyframes uc-head {0%, 100% {
    -webkit-transform: rotate(-45deg) translatex(-5%) translatey(10%);
            transform: rotate(-45deg) translatex(-5%) translatey(10%);
  }
  
  16.6% {
    -webkit-transform: rotate(-45deg) translatex(0%) translatey(15%);
            transform: rotate(-45deg) translatex(0%) translatey(15%);
  }
  
  33.3% {
    -webkit-transform: rotate(-40deg) translatex(5%) translatey(23%);
            transform: rotate(-40deg) translatex(5%) translatey(23%);
  }
  
  49.9% {
    -webkit-transform: rotate(-36deg) translatex(15%) translatey(35%);
            transform: rotate(-36deg) translatex(15%) translatey(35%);
  }
  
  66.6% {
    -webkit-transform: rotate(-42deg) translatex(5%) translatey(35%);
            transform: rotate(-42deg) translatex(5%) translatey(35%);
  }
  
  83.3% {
    -webkit-transform: rotate(-45deg) translatex(-15%) translatey(10%);
            transform: rotate(-45deg) translatex(-15%) translatey(10%);
  }}
.uc-uni .animate .head {-webkit-animation: uc-head var(--speed) linear infinite;
          animation: uc-head var(--speed) linear infinite;}
@-webkit-keyframes uc-ear {0%, 100% {
    -webkit-transform: rotate(25deg);
            transform: rotate(25deg);
  }
  
  16.6% {
    -webkit-transform: rotate(28deg);
            transform: rotate(28deg);
  }
  
  33.3% {
    -webkit-transform: rotate(24deg);
            transform: rotate(24deg);
  }
  
  49.9% {
    -webkit-transform: rotate(30deg);
            transform: rotate(30deg);
  }
  
  66.6% {
    -webkit-transform: rotate(35deg);
            transform: rotate(35deg);
  }
  
  83.3% {
    -webkit-transform: rotate(35deg);
            transform: rotate(35deg);
  }}
@keyframes uc-ear {0%, 100% {
    -webkit-transform: rotate(25deg);
            transform: rotate(25deg);
  }
  
  16.6% {
    -webkit-transform: rotate(28deg);
            transform: rotate(28deg);
  }
  
  33.3% {
    -webkit-transform: rotate(24deg);
            transform: rotate(24deg);
  }
  
  49.9% {
    -webkit-transform: rotate(30deg);
            transform: rotate(30deg);
  }
  
  66.6% {
    -webkit-transform: rotate(35deg);
            transform: rotate(35deg);
  }
  
  83.3% {
    -webkit-transform: rotate(35deg);
            transform: rotate(35deg);
  }}
.uc-uni .animate .ear {-webkit-animation: uc-ear var(--speed) linear infinite;
          animation: uc-ear var(--speed) linear infinite;}
@-webkit-keyframes uc-tail {0%, 100% {
    -webkit-transform: rotate(-10deg) translatex(-5%) translatey(38%);
            transform: rotate(-10deg) translatex(-5%) translatey(38%);
  }
  
  16.6% {
    -webkit-transform: rotate(-10deg) translatex(-5%) translatey(28%);
            transform: rotate(-10deg) translatex(-5%) translatey(28%);
  }
  
  33.3% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(10%);
            transform: rotate(-10deg) translatex(-10%) translatey(10%);
  }
  
  49.9% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(10%);
            transform: rotate(-10deg) translatex(-10%) translatey(10%);
  }
  
  66.6% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(18%);
            transform: rotate(-10deg) translatex(-10%) translatey(18%);
  }
  
  83.3% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(25%);
            transform: rotate(-10deg) translatex(-10%) translatey(25%);
  }}
@keyframes uc-tail {0%, 100% {
    -webkit-transform: rotate(-10deg) translatex(-5%) translatey(38%);
            transform: rotate(-10deg) translatex(-5%) translatey(38%);
  }
  
  16.6% {
    -webkit-transform: rotate(-10deg) translatex(-5%) translatey(28%);
            transform: rotate(-10deg) translatex(-5%) translatey(28%);
  }
  
  33.3% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(10%);
            transform: rotate(-10deg) translatex(-10%) translatey(10%);
  }
  
  49.9% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(10%);
            transform: rotate(-10deg) translatex(-10%) translatey(10%);
  }
  
  66.6% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(18%);
            transform: rotate(-10deg) translatex(-10%) translatey(18%);
  }
  
  83.3% {
    -webkit-transform: rotate(-10deg) translatex(-10%) translatey(25%);
            transform: rotate(-10deg) translatex(-10%) translatey(25%);
  }}
.uc-uni .animate .tail {-webkit-animation: uc-tail var(--speed) linear infinite;
          animation: uc-tail var(--speed) linear infinite;}
@-webkit-keyframes uc-tail-section-1 {0%, 100% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  16.6% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  33.3% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  
  49.9% {
    -webkit-transform: rotate(5deg);
            transform: rotate(5deg);
  }
  
  66.6% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  83.3% {
    -webkit-transform: rotate(5deg);
            transform: rotate(5deg);
  }}
@keyframes uc-tail-section-1 {0%, 100% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  16.6% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  33.3% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  
  49.9% {
    -webkit-transform: rotate(5deg);
            transform: rotate(5deg);
  }
  
  66.6% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  83.3% {
    -webkit-transform: rotate(5deg);
            transform: rotate(5deg);
  }}
.uc-uni .animate .tail .section {-webkit-animation: uc-tail-section-1 var(--speed) linear infinite;
          animation: uc-tail-section-1 var(--speed) linear infinite;}
@-webkit-keyframes uc-tail-section-2 {0%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  16.6% {
    -webkit-transform: rotate(4deg);
            transform: rotate(4deg);
  }
  
  33.3% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  49.9% {
    -webkit-transform: rotate(30deg);
            transform: rotate(30deg);
  }
  
  66.6% {
    -webkit-transform: rotate(10deg);
            transform: rotate(10deg);
  }
  
  83.3% {
    -webkit-transform: rotate(-5deg);
            transform: rotate(-5deg);
  }}
@keyframes uc-tail-section-2 {0%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  16.6% {
    -webkit-transform: rotate(4deg);
            transform: rotate(4deg);
  }
  
  33.3% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  
  49.9% {
    -webkit-transform: rotate(30deg);
            transform: rotate(30deg);
  }
  
  66.6% {
    -webkit-transform: rotate(10deg);
            transform: rotate(10deg);
  }
  
  83.3% {
    -webkit-transform: rotate(-5deg);
            transform: rotate(-5deg);
  }}
.uc-uni .animate .tail .section > * > * {-webkit-animation: uc-tail-section-2 var(--speed) linear infinite;
          animation: uc-tail-section-2 var(--speed) linear infinite;}
@-webkit-keyframes uc-tail-section-3 {0%, 100% {
    -webkit-transform: rotate(-25deg);
            transform: rotate(-25deg);
  }
  
  16.6% {
    -webkit-transform: rotate(-20deg);
            transform: rotate(-20deg);
  }
  
  33.3% {
    -webkit-transform: rotate(-20deg);
            transform: rotate(-20deg);
  }
  
  49.9% {
    -webkit-transform: rotate(-40deg);
            transform: rotate(-40deg);
  }
  
  66.6% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  83.3% {
    -webkit-transform: rotate(10deg);
            transform: rotate(10deg);
  }}
@keyframes uc-tail-section-3 {0%, 100% {
    -webkit-transform: rotate(-25deg);
            transform: rotate(-25deg);
  }
  
  16.6% {
    -webkit-transform: rotate(-20deg);
            transform: rotate(-20deg);
  }
  
  33.3% {
    -webkit-transform: rotate(-20deg);
            transform: rotate(-20deg);
  }
  
  49.9% {
    -webkit-transform: rotate(-40deg);
            transform: rotate(-40deg);
  }
  
  66.6% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  
  83.3% {
    -webkit-transform: rotate(10deg);
            transform: rotate(10deg);
  }}
.uc-uni .animate .tail .section > * > * > * > * {-webkit-animation: uc-tail-section-3 var(--speed) linear infinite;
          animation: uc-tail-section-3 var(--speed) linear infinite;}
.uc-uni {--color-horse:#fff6fb;            
  --color-horse-back:#e2d0f0;       
  --color-hair:#ff8fc8;             
  --color-hoof:#e9b64f;             
  --color-dust:#ffd27d;             
  --color-floor:#efe0ff;
  --color-sky:#d9c6ff;}
.uc-uni .🐴 {filter:drop-shadow(0 0.03em 0.05em rgba(110,70,160,.35))}
.uc-uni .head .eye {background-color:#fff;                        
  --shape-width:14.5%; --shape-height:26%; --shape-radius:50%;
  --shape-x:40.5%; --shape-y:12%; --shape-origin:50% 60%;
  border:none;
  box-shadow:0 0 0 0.011em rgba(61,39,82,.45);}
.uc-uni .head .eye:before {content:'';
  --shape-width:68%; --shape-height:68%; --shape-radius:50%;
  --shape-x:18%; --shape-y:22%;
  background-color:#3d2752;
  background-image:radial-gradient(circle at 50% 78%, #8a67b5 0%, #5c3f80 40%, #3d2752 75%);
  border:none;}
.uc-uni .head .eye:after {content:'';
  --shape-width:24%; --shape-height:22%; --shape-radius:50%;
  --shape-x:28%; --shape-y:30%;
  background-color:#fff; border:none;
  box-shadow:0.05em 0.055em 0 -0.01em rgba(255,255,255,.85);}
.uc-uni .head .lash {--shape-width:8%; --shape-height:3.2%;
  --shape-x:54.5%; --shape-y:12%;
  --shape-radius:40% / 50%;
  --shape-rotate:-34deg; --shape-origin:0% 50%;
  background-color:#3d2752; border:none;}
.uc-uni .head .lash:before {content:'';
  --shape-width:92%; --shape-height:100%;
  --shape-x:12%; --shape-y:-190%;
  --shape-rotate:24deg; --shape-origin:0% 50%;
  background-color:#3d2752; border:none;}
.uc-uni .head .lash:after {content:'';
  --shape-width:80%; --shape-height:100%;
  --shape-x:24%; --shape-y:180%;
  --shape-rotate:-14deg; --shape-origin:0% 50%;
  background-color:#3d2752; border:none;}
.uc-uni .head .blush {--shape-width:17%; --shape-height:28%; --shape-x:23%; --shape-y:36%;
  --shape-radius:50%; border:none;
  background:radial-gradient(circle, rgba(255,120,175,.55), rgba(255,120,175,0) 72%);}
@keyframes uc-uni-blink {0%,41%,45%,74%,78%,82%,100%{transform:scaleY(1)}
  43%{transform:scaleY(.06)}
  76%,80%{transform:scaleY(.06)}}
.uc-uni .animate .head .eye {animation:uc-uni-blink 6.4s linear infinite}
.uc-uni .head .eye:after {content:'';
  --shape-width:34%; --shape-height:30%;
  --shape-x:18%; --shape-y:16%;
  --shape-radius:50%;
  background-color:#fff; border:none;}
.uc-uni .head .horn {--shape-width:12%; --shape-height:130%;
  --shape-x:57%; --shape-y:-112%;
  --shape-rotate:16deg; --shape-origin:50% 100%;
  background-color:#f2a814;
  background-image:
    repeating-linear-gradient(-56deg,
      rgba(255,240,175,.95) 0 10%, rgba(178,108,6,.85) 10% 23%, rgba(255,200,70,.25) 23% 38%),
    linear-gradient(90deg, #a86e06, #ffd23e 38%, #ffedaa 52%, #e8a916 78%, #96600a);
  clip-path:polygon(50% 0%, 88% 100%, 12% 100%);
  border:none;
  filter:drop-shadow(0 0 0.05em rgba(255,196,64,.95));}
@keyframes uc-horn-glow {0%,100%{filter:drop-shadow(0 0 0.035em rgba(255,196,64,.8)) saturate(1.05)}
  50%    {filter:drop-shadow(0 0 0.1em rgba(255,214,90,1)) saturate(1.25)}}
.uc-uni .animate .horn {animation:uc-horn-glow calc(var(--speed)*2) ease-in-out infinite}
.uc-uni .head .forelock {--shape-width:22%; --shape-height:36%;
  --shape-x:56%; --shape-y:-8%;
  --shape-rotate:38deg;
  --shape-radius:65% 35% 70% 30% / 55% 45% 55% 45%;
  background-color:#ff8fc8; border:none;}
.uc-uni .neck .mane {--shape-x:0%; --shape-y:0%; --shape-width:100%; --shape-height:100%;
  background-color:transparent; border:none;}
.uc-uni .neck .mane b {border:none;
  --shape-origin:50% 12%;
  --shape-radius:52% 48% 58% 42% / 30% 30% 70% 70%;}
.uc-uni .neck .mane b:nth-child(1) {--shape-x:-2%;  --shape-y:-26%; --shape-width:15%; --shape-height:58%; --shape-rotate:24deg;  --delay:0s;    background-color:#ff77b8}
.uc-uni .neck .mane b:nth-child(2) {--shape-x:11%;  --shape-y:-30%; --shape-width:16%; --shape-height:64%; --shape-rotate:26deg;  --delay:-.09s; background-color:#ffa564}
.uc-uni .neck .mane b:nth-child(3) {--shape-x:24%;  --shape-y:-32%; --shape-width:16%; --shape-height:66%; --shape-rotate:28deg;  --delay:-.18s; background-color:#ffe066}
.uc-uni .neck .mane b:nth-child(4) {--shape-x:37%;  --shape-y:-30%; --shape-width:16%; --shape-height:64%; --shape-rotate:31deg;  --delay:-.27s; background-color:#7ee6a0}
.uc-uni .neck .mane b:nth-child(5) {--shape-x:50%;  --shape-y:-26%; --shape-width:15%; --shape-height:58%; --shape-rotate:34deg;  --delay:-.36s; background-color:#6fc9ff}
.uc-uni .neck .mane b:nth-child(6) {--shape-x:62%;  --shape-y:-20%; --shape-width:14%; --shape-height:48%; --shape-rotate:38deg;  --delay:-.45s; background-color:#b78cff}
.uc-uni .neck .mane b:nth-child(7) {--shape-x:73%;  --shape-y:-13%; --shape-width:13%; --shape-height:38%; --shape-rotate:43deg;  --delay:-.54s; background-color:#e08cf0}
@keyframes uc-mane-wave {0%,100%{transform:rotate(calc(var(--shape-rotate) - 5deg))}
  50%    {transform:rotate(calc(var(--shape-rotate) + 8deg))}}
.uc-uni .animate .mane b {animation:uc-mane-wave var(--speed) ease-in-out infinite}
.uc-uni .tail .nub {--color-hair:#ff77b8}
.uc-uni .tail .nub > .section {--color-hair:#ff8f5e}
.uc-uni .tail .nub > .section > .section {--color-hair:#ffd75e}
.uc-uni .tail .nub > .section > .section > .section {--color-hair:#7ee6a0}
.uc-uni .tail .nub > .section > .section > .section > .section {--color-hair:#6fc9ff}
.uc-uni .tail .nub > .section > .section > .section > .section > .section {--color-hair:#9b8cff}
.uc-uni .tail .nub > .section > .section > .section > .section > .section > .section {--color-hair:#c98cff}
.uc-uni .dust .particle {border:none;
  width:0.026em; height:0.026em;
  background-color:#ffca5f;
  box-shadow:0 0 0.014em 0.004em rgba(255,214,120,.85);}
.uc-uni .dust .particle:nth-child(3n) {background-color:#ff85bd; box-shadow:0 0 0.014em 0.004em rgba(255,133,189,.85)}
.uc-uni .dust .particle:nth-child(3n+1) {background-color:#7fc4ff; box-shadow:0 0 0.014em 0.004em rgba(127,196,255,.85)}
.uc-uni .dust .particle:nth-child(4n) {border-radius:0;
  -webkit-clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);
          clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);
  box-shadow:none;}
.uc-uni .wing {display:none; border:none; pointer-events:none;
  --part-width:36%; --part-height:46%;
  --part-x:42%; --part-y:3%;
  --part-origin:12% 88%;
  --part-rotate:-6deg;}
.uc-uni.uc-wings .wing {display:block}
.uc-uni .wing i {border:none; --shape-x:0%; --shape-y:46%; --shape-origin:6% 78%;}
.uc-uni .wing i:nth-child(1) {--shape-width:96%; --shape-height:30%; --shape-rotate:-12deg;
  --shape-radius:20% 100% 65% 35% / 60% 90% 30% 40%;
  background-image:linear-gradient(100deg,#fffdff 45%,#f3ddff 80%,#ffd2ea)}
.uc-uni .wing i:nth-child(2) {--shape-width:86%; --shape-height:28%; --shape-rotate:-34deg;
  --shape-radius:20% 100% 65% 35% / 60% 90% 30% 40%;
  background-image:linear-gradient(100deg,#fffaff 45%,#eed6fd 80%,#ffc9e6)}
.uc-uni .wing i:nth-child(3) {--shape-width:72%; --shape-height:26%; --shape-rotate:-56deg;
  --shape-radius:20% 100% 65% 35% / 60% 90% 30% 40%;
  background-image:linear-gradient(100deg,#fdf6ff 45%,#e7cdfb 80%,#ffc0e2)}
.uc-uni .wing i:nth-child(4) {--shape-width:56%; --shape-height:24%; --shape-rotate:-78deg;
  --shape-radius:20% 100% 65% 35% / 60% 90% 30% 40%;
  background-image:linear-gradient(100deg,#faf0ff 45%,#dfc4f8 80%,#ffb8de)}
.uc-uni .wing.far {--part-x:47%; --part-y:6%; --part-rotate:4deg; --delay:calc(var(--speed) * -0.08);}
.uc-uni .wing.far i:nth-child(1) {background-image:linear-gradient(100deg,#e9d8f6 45%,#d7bef0 80%,#efb6da)}
.uc-uni .wing.far i:nth-child(2) {background-image:linear-gradient(100deg,#e4d1f4 45%,#d0b5ee 80%,#eaaad3)}
.uc-uni .wing.far i:nth-child(3) {background-image:linear-gradient(100deg,#dfc9f2 45%,#c9abeb 80%,#e5a0cd)}
.uc-uni .wing.far i:nth-child(4) {background-image:linear-gradient(100deg,#d9c0ef 45%,#c2a1e8 80%,#df96c7)}
@keyframes uc-wing-flap {0%,100%{transform:rotate(calc(var(--part-rotate) + 14deg))}
  50%    {transform:rotate(calc(var(--part-rotate) - 30deg))}}
.uc-uni .animate .wing {animation:uc-wing-flap var(--speed) ease-in-out infinite}
@keyframes uc-feather-trail {0%,100%{transform:rotate(calc(var(--shape-rotate) + 4deg))}
  50%    {transform:rotate(calc(var(--shape-rotate) - 6deg))}}
.uc-uni .animate .wing i {animation:uc-feather-trail var(--speed) ease-in-out infinite}
.uc-uni .wing i:nth-child(2) {--delay:calc(var(--speed) * -0.04)}
.uc-uni .wing i:nth-child(3) {--delay:calc(var(--speed) * -0.08)}
.uc-uni .wing i:nth-child(4) {--delay:calc(var(--speed) * -0.12)}
.uc-uni.uc-walk {--speed:2.1s}
.uc-uni.uc-walk .dust {display:none}
.uc-uni.uc-walk .back-leg.left {--delay:0s}
.uc-uni.uc-walk .front-leg.left {--delay:calc(var(--speed) * -0.75)}
.uc-uni.uc-walk .back-leg.right {--delay:calc(var(--speed) * -0.5)}
.uc-uni.uc-walk .front-leg.right {--delay:calc(var(--speed) * -0.25)}
@keyframes uc-walk-body {0%,50%,100%{transform:rotate(1.5deg) translatex(1%) translatey(0%)}
  25%,75%    {transform:rotate(2.5deg) translatex(1%) translatey(-2.5%)}}
@keyframes uc-walk-neck {0%,50%,100%{transform:scaleX(.95) rotate(42deg) translatex(3%) translatey(-8%)}
  25%,75%    {transform:scaleX(.95) rotate(39deg) translatex(4%) translatey(-4%)}}
@keyframes uc-walk-head {0%,50%,100%{transform:rotate(-42deg) translatex(0%) translatey(15%)}
  25%,75%    {transform:rotate(-46deg) translatex(3%) translatey(20%)}}
@keyframes uc-walk-front-shoulder {0%{transform:rotate(7deg)} 55%{transform:rotate(-8deg)}
  80%{transform:rotate(0deg)} 100%{transform:rotate(7deg)}}
@keyframes uc-walk-front-upper {0%{transform:rotate(14deg)} 55%{transform:rotate(-15deg)}
  78%{transform:rotate(-2deg)} 90%{transform:rotate(17deg)}
  100%{transform:rotate(14deg)}}
@keyframes uc-walk-front-knee {0%,48%{transform:rotate(-3deg)} 66%{transform:rotate(-58deg)}
  88%{transform:rotate(-8deg)} 100%{transform:rotate(-3deg)}}
@keyframes uc-walk-front-lower {0%,52%{transform:rotate(10deg)} 70%{transform:rotate(-16deg)}
  100%{transform:rotate(10deg)}}
@keyframes uc-walk-front-ankle {0%,50%{transform:rotate(18deg)} 62%{transform:rotate(-8deg)}
  86%{transform:rotate(6deg)} 100%{transform:rotate(18deg)}}
@keyframes uc-walk-front-foot {0%{transform:rotate(10deg)} 30%{transform:rotate(34deg)}
  55%{transform:rotate(54deg)} 70%{transform:rotate(12deg)}
  100%{transform:rotate(10deg)}}
@keyframes uc-walk-back-top {0%{transform:rotate(52deg) translatex(4%) translatey(28%)}
  58%{transform:rotate(8deg) translatex(-8%) translatey(40%)}
  80%{transform:rotate(38deg) translatex(0%) translatey(20%)}
  100%{transform:rotate(52deg) translatex(4%) translatey(28%)}}
@keyframes uc-walk-back-thigh {0%{transform:rotate(-102deg)}
  58%{transform:rotate(-66deg) translatex(-12%)}
  80%{transform:rotate(-118deg) translatex(16%) translatey(-4%)}
  100%{transform:rotate(-102deg)}}
@keyframes uc-walk-back-lower {0%,58%{transform:rotate(45deg)}
  74%{transform:rotate(108deg) translatex(40%) translatey(10%)}
  90%{transform:rotate(58deg) translatex(6%)}
  100%{transform:rotate(45deg)}}
@keyframes uc-walk-back-foot {0%{transform:rotate(35deg) translatey(-20%)}
  30%{transform:rotate(39deg) translatey(-20%)}
  58%{transform:rotate(43deg) translatey(-20%)}
  74%{transform:rotate(40deg) translatex(58%) translatey(-26%)}
  92%{transform:rotate(45deg) translatex(10%) translatey(-20%)}
  100%{transform:rotate(35deg) translatey(-20%)}}
.uc-uni.uc-walk .animate .body {animation-name:uc-walk-body}
.uc-uni.uc-walk .animate .neck {animation-name:uc-walk-neck}
.uc-uni.uc-walk .animate .head {animation-name:uc-walk-head}
.uc-uni.uc-walk .animate .front-leg .shoulder {animation-name:uc-walk-front-shoulder}
.uc-uni.uc-walk .animate .front-leg .upper {animation-name:uc-walk-front-upper}
.uc-uni.uc-walk .animate .front-leg .knee {animation-name:uc-walk-front-knee}
.uc-uni.uc-walk .animate .front-leg .lower {animation-name:uc-walk-front-lower}
.uc-uni.uc-walk .animate .front-leg .ankle {animation-name:uc-walk-front-ankle}
.uc-uni.uc-walk .animate .front-leg .foot {animation-name:uc-walk-front-foot}
.uc-uni.uc-walk .animate .back-leg .top {animation-name:uc-walk-back-top}
.uc-uni.uc-walk .animate .back-leg .thigh {animation-name:uc-walk-back-thigh}
.uc-uni.uc-walk .animate .back-leg .lower-leg {animation-name:uc-walk-back-lower}
.uc-uni.uc-walk .animate .back-leg .foot {animation-name:uc-walk-back-foot}
.uc-uni .fx-layer {position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden}
.uc-uni .fx-bolt {position:absolute;width:22px;height:64px;transform-origin:50% 100%;
  background:linear-gradient(180deg,#fff6c8,#ffd23e 45%,#f0a512);
  -webkit-clip-path:polygon(52% 0,68% 0,44% 38%,60% 38%,28% 100%,40% 55%,24% 55%);
          clip-path:polygon(52% 0,68% 0,44% 38%,60% 38%,28% 100%,40% 55%,24% 55%);
  filter:drop-shadow(0 0 6px rgba(255,214,90,.95));
  animation:uc-fx-bolt .38s ease-out forwards;}
@keyframes uc-fx-bolt {0%  {opacity:0;transform:rotate(var(--a,0deg)) scaleY(.25)}
  18% {opacity:1}
  100%{opacity:0;transform:rotate(var(--a,0deg)) translateY(-30px) scaleY(1.08)}}
.uc-uni .fx-flash {position:absolute;width:92px;height:92px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,214,90,.55) 40%,transparent 70%);
  animation:uc-fx-flash .45s ease-out forwards;}
@keyframes uc-fx-flash {0%  {opacity:0;transform:translate(-50%,-50%) scale(.3)}
  20% {opacity:1}
  100%{opacity:0;transform:translate(-50%,-50%) scale(1.7)}}
.uc-uni .fx-star {position:absolute;width:14px;height:14px;background:#ffd76e;
  -webkit-clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);
          clip-path:polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%);
  animation:uc-fx-spark .8s ease-out forwards;}
@keyframes uc-fx-spark {0%  {opacity:1;transform:translate(0,0) scale(.5) rotate(0deg)}
  100%{opacity:0;transform:translate(var(--dx,0px),var(--dy,0px)) scale(1.2) rotate(160deg)}}
.uc-uni .fx-puff {position:absolute;border-radius:50%;filter:blur(1.5px);animation:uc-fx-puff 1.15s ease-out forwards}
@keyframes uc-fx-puff {0%  {opacity:0;transform:translate(0,0) scale(.3)}
  12% {opacity:1}
  70% {opacity:.8}
  100%{opacity:0;transform:translate(var(--dx,40px),var(--dy,0px)) scale(1.8)}}
.uc-uni .fx-wee {position:absolute;font-size:34px;animation:uc-fx-wee 1s ease-out forwards}
@keyframes uc-fx-wee {0%  {opacity:0;transform:translate(-30%,-50%) scale(.4)}
  20% {opacity:1}
  100%{opacity:0;transform:translate(10px,-14px) scale(1.15)}}
.uc-uni .fx-heart {position:absolute;font-size:22px;animation:uc-fx-heart 1.2s ease-out forwards}
@keyframes uc-fx-heart {0%  {opacity:0;transform:translate(0,0) scale(.4)}
  15% {opacity:1}
  100%{opacity:0;transform:translate(var(--dx,0px),-95px) scale(1.25)}}
.uc-uni .fx-rainbow {position:absolute;width:190px;height:96px;transform-origin:50% 100%;
  background:radial-gradient(circle at 50% 100%,
    transparent 52px, #ff5f8f 53px 60px, #ffa564 61px 68px, #ffe066 69px 76px,
    #7ee6a0 77px 84px, #6fc9ff 85px 92px, transparent 93px);
  animation:uc-fx-rainbow 1.3s ease-out forwards;}
@keyframes uc-fx-rainbow {0%  {opacity:0;transform:scale(.45)}
  25% {opacity:.95}
  70% {opacity:.85}
  100%{opacity:0;transform:scale(1.12)}}
@keyframes uc-uni-hop {0%,100%{transform:translateY(0)}35%{transform:translateY(-6%)}65%{transform:translateY(1.5%)}}
.uc-uni .🐴.hop {animation:uc-uni-hop .5s ease-out}
@keyframes uc-run-body {0%,100%{transform:rotate(4deg) translatex(1%) translatey(-4%)}
  20%    {transform:rotate(2deg) translatex(1%) translatey(0%)}
  45%    {transform:rotate(2.5deg) translatex(2%) translatey(-3%)}
  70%    {transform:rotate(3deg) translatex(1%) translatey(-2%)}
  90%    {transform:rotate(5.5deg) translatex(0%) translatey(-8%)}}
@keyframes uc-run-neck {0%,100%{transform:scaleX(.97) rotate(41deg) translatex(2%) translatey(-10%)}
  50%    {transform:scaleX(.97) rotate(43.5deg) translatex(4%) translatey(-6%)}}
@keyframes uc-run-head {0%,100%{transform:rotate(-43deg) translatex(-2%) translatey(12%)}
  50%    {transform:rotate(-40deg) translatex(4%) translatey(17%)}}
.uc-uni .animate .body {animation-name:uc-run-body}
.uc-uni .animate .neck {animation-name:uc-run-neck}
.uc-uni .animate .head {animation-name:uc-run-head}
@keyframes uc-mane-whip {from{transform:rotate(calc(var(--shape-rotate) - 10deg))}
  to  {transform:rotate(calc(var(--shape-rotate) + 16deg))}}
.uc-uni .🐴.shake .mane b, .uc-uni .🐴.shake .forelock {animation:uc-mane-whip .16s ease-in-out 5 alternate}
@keyframes uc-ear-flick {from{transform:rotate(-6deg)}
  to  {transform:rotate(28deg)}}
.uc-uni .🐴.shake .head .ear {animation:uc-ear-flick .15s ease-in-out 5 alternate}
.uc-uni.uc-fly {--speed:3s}
.uc-uni.uc-fly .dust {display:none}
.uc-uni.uc-fly .wing {display:block}
@keyframes uc-uni-float {0%,100%{transform:translateY(-14%)}50%{transform:translateY(-23%)}}
.uc-uni.uc-fly .🐴 {animation:uc-uni-float 3s ease-in-out infinite}
@keyframes uc-fly-body {0%,100%{transform:rotate(-2deg) translatey(0%)}
  50%    {transform:rotate(-4deg) translatey(-2%)}}
.uc-uni.uc-fly .animate .body {animation-name:uc-fly-body}
.uc-uni.uc-fly .animate .neck {animation-name:uc-walk-neck}
.uc-uni.uc-fly .animate .head {animation-name:uc-walk-head}
.uc-uni.uc-fly .animate .front-leg .shoulder {animation:none;--shape-rotate:-16deg}
@keyframes uc-fly-front-upper {0%,100%{transform:rotate(-38deg)}50%{transform:rotate(-47deg)}}
.uc-uni.uc-fly .animate .front-leg .upper {animation:uc-fly-front-upper 3s ease-in-out infinite}
.uc-uni.uc-fly .animate .front-leg .knee {animation:none;--shape-rotate:-30deg}
.uc-uni.uc-fly .animate .front-leg .lower {animation:none;--shape-rotate:18deg}
.uc-uni.uc-fly .animate .front-leg .ankle {animation:none;--shape-rotate:26deg}
.uc-uni.uc-fly .animate .front-leg .foot {animation:none}
.uc-uni.uc-fly .animate .back-leg .top {animation:none;--shape-rotate:22deg}
@keyframes uc-fly-back-thigh {0%,100%{transform:rotate(-90deg)}50%{transform:rotate(-97deg)}}
.uc-uni.uc-fly .animate .back-leg .thigh {animation:uc-fly-back-thigh 3s ease-in-out infinite}
.uc-uni.uc-fly .animate .back-leg .lower-leg {animation:none;--shape-rotate:42deg}
.uc-uni.uc-fly .animate .back-leg .foot {animation:none}
@keyframes uc-wing-fly {0%,100%{transform:rotate(calc(var(--part-rotate) + 22deg))}
  50%    {transform:rotate(calc(var(--part-rotate) - 55deg))}}
.uc-uni.uc-fly .animate .wing {animation:uc-wing-fly 1.05s ease-in-out infinite}
.uc-uni.uc-fly .animate .wing i {animation-duration:1.05s}
.uc-uni.uc-fly .cutie{display:none}
.uc-uni.uc-fly .animate .mane b {animation-duration:1.15s}
.uc-uni.uc-fly .animate .tail, .uc-uni.uc-fly .animate .tail .section, .uc-uni.uc-fly .animate .tail .section > * > *, .uc-uni.uc-fly .animate .tail .section > * > * > * > * {animation-duration:1.3s}
.uc-uni.uc-fly .animate .horn {animation-duration:1.6s}
@keyframes uc-fly-cloud {from{transform:translateX(-20vw)}to{transform:translateX(115vw)}}
@keyframes uc-fly-trail {0%  {opacity:0;transform:translate(0,0) scale(.5) rotate(0deg)}
  12% {opacity:1}
  100%{opacity:0;transform:translate(36vw,var(--dy,0px)) scale(1.05) rotate(150deg)}}
.uc-uni .cutie {--part-x:53%; --part-y:36.6%; --part-width:12.1%; --part-height:15.84%;
  background-color:transparent; border:none;
  display:flex; align-items:center; justify-content:center;}
.uc-uni .cutie::before {content:'⭐';
  position:static; width:auto; height:auto; background:transparent; border:none;
  font-size:.2em; line-height:1;
  filter:drop-shadow(0 0 .018em rgba(255,255,255,.85));
  animation:uc-cutie-glow 2.6s ease-in-out infinite;}
@keyframes uc-cutie-glow {0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
.uc-uni.uc-c-pink {--color-horse:#ffdff0;--color-horse-back:#efb0d6}
.uc-uni.uc-c-pink .head .forelock {background-color:#ff6db4}
.uc-uni.uc-c-pink .cutie::before {content:'💗'}
.uc-uni.uc-c-sky {--color-horse:#dcedff;--color-horse-back:#aecdf2}
.uc-uni.uc-c-sky .head .forelock {background-color:#6fb6ff}
.uc-uni.uc-c-sky .cutie::before {content:'🦋'}
.uc-uni.uc-c-mint {--color-horse:#dff8ea;--color-horse-back:#b0e3ca}
.uc-uni.uc-c-mint .head .forelock {background-color:#4fd096}
.uc-uni.uc-c-mint .cutie::before {content:'🍀'}
.uc-uni.uc-c-night {--color-horse:#5a4a88;--color-horse-back:#42356a}
.uc-uni.uc-c-night .head .forelock {background-color:#ff8fc8}
.uc-uni.uc-c-night .head .lash, .uc-uni.uc-c-night .head .lash::before, .uc-uni.uc-c-night .head .lash::after {background-color:#eee3ff}
.uc-uni.uc-c-night .head .blush {background:radial-gradient(circle, rgba(255,150,200,.6), rgba(255,150,200,0) 72%);}
.uc-uni.uc-c-night .cutie::before {content:'🌙'}
`;

  var MARKUP = `
<div class="🐴 animate">
		<div class="front-leg right">
			<div class="shoulder">
				<div class="upper">
					<div class="knee">
						<div class="lower">
							<div class="ankle">
								<div class="foot">
									<div class="hoof"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="back-leg right">
			<div class="top">
				<div class="thigh">
					<div class="lower-leg">
						<div class="foot">
							<div class="hoof"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="tail">
			<div class="nub">
				<div class="section">
				<div class="section">
				<div class="section">
				<div class="section">
				<div class="section">
				<div class="section last">
				</div>
				</div>
				</div>
				</div>
				</div>
				</div>
			</div>
		</div>
		<div class="wing far"><i></i><i></i><i></i><i></i></div>
		<div class="body">
			<div class="section">
			<div class="section">
			<div class="section">
			<div class="section">
			<div class="section last">
			</div>
			</div>
			</div>
			</div>
			</div>
			<div class="back-side"></div>
			
		</div>

		<div class="neck">
			<div class="under"></div>
			<div class="front"></div>
			<div class="base"></div>
			<div class="top"></div>
			<div class="shoulder"></div>
			<div class="mane"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div>
		</div>
		<div class="wing near"><i></i><i></i><i></i><i></i></div>
		<div class="front-leg left">
			<div class="shoulder">
				<div class="upper">
					<div class="knee">
						<div class="lower">
							<div class="ankle">
								<div class="foot">
									<div class="hoof"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<div class="back-leg left">
			<div class="top">
				<div class="thigh">
					<div class="lower-leg">
						<div class="foot">
							<div class="hoof"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<div class="head">
			<div class="skull"></div>
			<div class="nose"></div>
			<div class="face"></div>
			<div class="lip"></div>
			<div class="jaw"></div>
			<div class="chin"></div>
			<div class="horn"></div>
			<div class="forelock"></div>
			<div class="blush"></div>
			<div class="ear"></div>
			<div class="eye"></div>
			<div class="lash"></div>
		</div>
		<div class="cutie"></div>
	</div>
`;

  /* the workshop's two stardust emitters — 30 particles each, siblings of the
     horse (exactly its DOM: front = at the front hooves, back = under the
     belly); hidden by the walk/fly gaits, streams only while galloping */
  var DUST_HTML = (function () {
    var p = new Array(31).join('<div class="particle"></div>');
    return '<div class="dust front">' + p + '</div><div class="dust back">' + p + '</div>';
  })();

  var EXTRA_CSS = '.uc-uni{position:absolute;width:3.8em;height:2.5em;pointer-events:none}'
    + '.uc-uni.uc-paused *{animation-play-state:paused!important}'
    /* the rig was authored under the DEFAULT content-box: every part carries a
       transparent 1px border and sizes its children in %, so a host page's
       global `*{box-sizing:border-box}` reset (the game's base.css) eats the
       borders out of each nested box and the shrinkage COMPOUNDS down the
       7-deep leg chains — the hooves collapse to slivers. Pin the whole rig
       (and its fx layer) back to the box model it was built for. */
    + '.uc-uni,.uc-uni *,.uc-uni *::before,.uc-uni *::after{box-sizing:content-box}'
    /* stardust trail re-anchor: the workshop paints .dust in viewport-fixed
       coords (the unicorn stands at the screen center there). The instance box
       IS the horse box (3.8em × 2.5em), so: container = one horse-width of
       slack on each side, one horse-height of headroom above, bottom edge just
       over the foot line (same 0.02em spawn clip as the workshop); spawn
       points sit 0.03em above that edge — front at the front hooves (15% into
       the horse from the left), back under the belly (50%). The particles'
       sizes, colors, delays and drift all come from the generated rules. */
    + '.uc-uni .dust{position:absolute;top:calc(-1 * var(--horse-height));left:-100%;right:-100%;bottom:0.02em;overflow:hidden}'
    /* width/height: the faithful 0.026em twinkles vanish at instance sizes
       (60-110px font vs the workshop's ~176px) — plump them so the trail
       reads from a distance; the keyframes' scale(3) grows them further. */
    + '.uc-uni .dust .particle{top:calc(2 * var(--horse-height) - 0.05em);left:calc(1.15 * var(--horse-width));width:.05em;height:.05em}'
    + '.uc-uni .dust.back .particle{left:calc(1.5 * var(--horse-width))}';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = BASE_CSS + '\n' + EXTRA_CSS;
    document.head.appendChild(st);
  }


  /* ── the workshop's fx layer + helpers (unicorn.html, adapted only for
     per-instance coordinates). The layer is a zero-size .uc-uni wrapper so
     the extracted `.uc-uni .fx-*` rules match its children. ── */
  var R = function (a, b) { return a + Math.random() * (b - a); };
  var _fxLayer = null;
  function fxLayer() {
    if (_fxLayer && _fxLayer.isConnected) return _fxLayer;
    var host = document.createElement('div');
    host.className = 'uc-uni uc-fx-host';
    host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none';
    var layer = document.createElement('div');
    layer.className = 'fx-layer';
    host.appendChild(layer);
    (window.__ucFxRoot || document.body).appendChild(host);   // rides with the scene (behind the card in-game)
    _fxLayer = layer;
    return layer;
  }
  function fxSpawn(cls, x, y) {
    var d = document.createElement('div');
    d.className = cls;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    fxLayer().appendChild(d);
    setTimeout(function () { d.remove(); }, 1300);
    return d;
  }
  function hornTip(el) {          /* the horn rides the head animation — sample live */
    var h = el.querySelector('.horn').getBoundingClientRect();
    return { x: h.left + h.width / 2, y: h.top + 3 };
  }
  var COATS = ['pearl', 'pink', 'sky', 'mint', 'night'];
  function nextCoat(el) {
    for (var i = 0; i < COATS.length; i++)
      if (el.classList.contains('uc-c-' + COATS[i])) return COATS[(i + 1) % COATS.length];
    return 'pearl';
  }
  /* rotating click extras — hearts, an arc rainbow, a star shower */
  var EXTRAS = [
    function hearts(inst) {
      var r = inst.el.getBoundingClientRect();
      for (var i = 0; i < 5; i++) (function (i) {
        setTimeout(function () {
          var h = fxSpawn('fx-heart',
            r.left + r.width * (0.2 + Math.random() * 0.55), r.top + r.height * 0.3);
          h.textContent = ['\uD83D\uDC97', '\uD83D\uDC96', '\uD83D\uDC95'][i % 3];
          h.style.setProperty('--dx', R(-32, 32) + 'px');
        }, i * 90);
      })(i);
    },
    function rainbow(inst) {
      var r = inst.el.getBoundingClientRect();
      fxSpawn('fx-rainbow', r.left + r.width / 2 - 95, r.top - 55);
    },
    function shower(inst) {
      var r = inst.el.getBoundingClientRect();
      for (var i = 0; i < 10; i++) (function (i) {
        setTimeout(function () {
          var st = fxSpawn('fx-star',
            r.left + r.width * (0.08 + Math.random() * 0.85), r.top - R(10, 40));
          st.style.setProperty('--dx', R(-14, 14) + 'px');
          st.style.setProperty('--dy', R(55, 115) + 'px');
          st.style.background = ['#ffd76e', '#ff9ecb', '#9ad4ff', '#a4f0b7'][i % 4];
        }, i * 55);
      })(i);
    },
  ];

  function place(parent, opts) {
    opts = opts || {};
    injectStyle();
    var el = document.createElement('div');
    el.className = 'uc-uni'
      + (opts.gait === 'walk' ? ' uc-walk' : '')
      + (opts.gait === 'fly' || opts.pose === 'fly' ? ' uc-fly' : '')
      + (opts.wings ? ' uc-wings' : '')
      + ' uc-c-' + (opts.color || 'pearl');
    el.innerHTML = MARKUP + DUST_HTML;
    el.style.fontSize = (opts.size || 40) + 'px';
    if (opts.left   != null) el.style.left   = opts.left;
    if (opts.top    != null) el.style.top    = opts.top;
    if (opts.bottom != null) el.style.bottom = opts.bottom;
    if (opts.z      != null) el.style.zIndex = opts.z;
    (parent || document.body).appendChild(el);

    var inst = {
      el: el,
      _dead: false, _raf: 0, _flip: false,
      remove: function () {
        inst._dead = true;
        if (inst._raf) cancelAnimationFrame(inst._raf);
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      setGait: function (g) {
        el.classList.toggle('uc-walk', g === 'walk');
        el.classList.toggle('uc-fly', g === 'fly');
      },
      setColor: function (c) {
        ['pearl', 'pink', 'sky', 'mint', 'night'].forEach(function (k) {
          el.classList.toggle('uc-c-' + k, k === c);
        });
      },
      setFly: function (on) { el.classList.toggle('uc-fly', !!on); },
      setWings: function (on) { el.classList.toggle('uc-wings', !!on); },
      setFlip: function (f) {
        inst._flip = !!f;
        el.style.transform = f ? 'scaleX(-1)' : '';
      },
      setPaused: function (p) { el.classList.toggle('uc-paused', !!p); },
      /* ── CLICK MAGIC + idle life — the unicorn.html behaviours, verbatim ── */
      hop: function () {
        var h = inst._horse;
        h.classList.remove('hop'); void h.offsetWidth; h.classList.add('hop');
      },
      shake: function () {
        inst._horse.classList.add('shake');
        setTimeout(function () { inst._horse.classList.remove('shake'); }, 900);
      },
      /* an eased 360° somersault of the whole rig — for a FLYING unicorn on
         click (as the old background did). Spins the rig root only, so the
         roam positioning (left/marginTop on the outer el) is untouched. */
      somersault: function () {
        if (inst._busy || !inst._horse.animate) return; inst._busy = true;
        var h = inst._horse, prev = h.style.transformOrigin;
        h.style.transformOrigin = '50% 50%';
        /* composite:'add' rides ON TOP of the CSS gait transform (the fly
           gait's uni-float holds a translateY hover) — a default 'replace'
           animation zeroes that hover for its duration, so the flyer DROPS
           the moment the spin starts and POPS back up when it ends. */
        var a = h.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }],
          { duration: 1100, easing: 'cubic-bezier(.5,0,.5,1)', composite: 'add' }
        );
        a.onfinish = a.oncancel = function () { h.style.transformOrigin = prev; inst._busy = false; };
      },
      lightning: function () {
        var p = hornTip(el);
        fxSpawn('fx-flash', p.x, p.y);
        var n = 4 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) (function (i) {
          setTimeout(function () {
            var b = fxSpawn('fx-bolt', p.x - 11, p.y - 64);
            b.style.setProperty('--a', R(-75, 75) + 'deg');
          }, i * 45);
        })(i);
        for (var st = 0; st < 6; st++) {                 /* upward star spray */
          var ang = R(-Math.PI, 0), d = R(28, 70);
          var sp = fxSpawn('fx-star', p.x - 7, p.y - 7);
          sp.style.setProperty('--dx', Math.cos(ang) * d + 'px');
          sp.style.setProperty('--dy', Math.sin(ang) * d + 'px');
          sp.style.background = ['#ffd76e', '#ff9ecb', '#9ad4ff'][st % 3];
        }
      },
      toot: function () {
        var back = inst._flip ? -1 : 1;                  /* puffs drift BEHIND her */
        var b = el.querySelector('.body').getBoundingClientRect();
        var p = { x: (inst._flip ? b.left - 4 : b.right + 4), y: b.top + b.height * 0.62 };
        inst.hop();
        fxSpawn('fx-wee', p.x, p.y).textContent = '\uD83D\uDCA8';
        var PUFFS = ['#c9f7d4', '#ffd9ec', '#e6d6ff', '#fff3c4', '#cfe8ff'];
        for (var i = 0; i < 6; i++) (function (i) {
          setTimeout(function () {
            var pf = fxSpawn('fx-puff', p.x - 10, p.y - 10);
            var sz = R(22, 44);
            pf.style.width = sz + 'px'; pf.style.height = sz + 'px';
            pf.style.background = 'radial-gradient(circle at 35% 35%, #fff, ' + PUFFS[i % PUFFS.length] + ')';
            pf.style.setProperty('--dx', back * R(34, 115) + 'px');
            pf.style.setProperty('--dy', R(-6, 30) + 'px');
          }, i * 60);
        })(i);
        for (var s2 = 0; s2 < 7; s2++) {                 /* glitter with it */
          var ang = R(-0.9, 0.9), d = R(30, 85);
          var sp = fxSpawn('fx-star', p.x - 7, p.y - 7);
          sp.style.setProperty('--dx', back * Math.cos(ang) * d + 'px');
          sp.style.setProperty('--dy', Math.sin(ang) * d * 0.5 + 'px');
          sp.style.background = ['#ffd76e', '#ff9ecb', '#9ad4ff', '#a4f0b7'][s2 % 4];
        }
      },
      /* one click = lightning + coat transform under the flash + a rotating
         bonus (hearts / arc rainbow / star shower); every 3-5 clicks (first
         on the 4th) she also lets out the rainbow toot */
      magic: function () {
        inst._clicks++;
        inst.lightning();
        setTimeout(function () { inst.setColor(nextCoat(el)); }, 130);
        EXTRAS[inst._extraIdx++ % EXTRAS.length](inst);
        if (inst._clicks >= inst._nextToot) {
          inst._clicks = 0;
          inst._nextToot = 3 + Math.floor(Math.random() * 3);
          setTimeout(function () { inst.toot(); }, 180);
        }
      },
      setPos: function (left, top) {
        if (left != null) el.style.left = left;
        if (top  != null) el.style.top  = top;
      },
      /* come-and-go (the shared pattern of the other backgrounds): enter from an
         off-screen edge, cross, exit fully, wait off-stage, re-enter from a
         random edge at a fresh height + speed. fly:true adds a gentle bob. */
      roam: function (o) {
        o = o || {};
        var fly = !!o.fly;
        var bandMin = o.bandMinPct != null ? o.bandMinPct : (fly ? 8  : 3);
        var bandMax = o.bandMaxPct != null ? o.bandMaxPct : (fly ? 30 : 14);
        var spd     = o.speedPctPerSec != null ? o.speedPctPerSec : (fly ? 7 : 6);
        var waitMin = o.waitMinSec != null ? o.waitMinSec : 2;
        var waitMax = o.waitMaxSec != null ? o.waitMaxSec : 8;
        var amp     = o.bobAmpPx  != null ? o.bobAmpPx  : 12;
        var rnd = function (a, b) { return a + Math.random() * (b - a); };
        var dir, pct, exitPad, waiting = false, waitUntil = 0;
        var bobPhase = Math.random() * 6.28;
        var last = performance.now();

        function elemWidthPct() {          // element width as % of viewport + slack
          return (el.getBoundingClientRect().width / window.innerWidth) * 100 + 2;
        }
        function newTrip(seedVisible) {
          dir = Math.random() < 0.5 ? 1 : -1;
          exitPad = elemWidthPct();
          var band = rnd(bandMin, bandMax);                 // fresh height each trip
          if (fly) { el.style.top = band + '%'; el.style.bottom = ''; }
          else     { el.style.bottom = band + '%'; el.style.top = ''; }
          inst._spd = spd * rnd(0.82, 1.18);                // slight speed variety
          pct = seedVisible ? rnd(12, 88)                   // first run: already on-screen
                            : (dir > 0 ? -exitPad : 100 + exitPad);
          inst.setFlip(FACES_LEFT ? dir > 0 : dir < 0);
          el.style.left = pct + '%';
          waiting = false;
          el.classList.remove('uc-paused');                 // resume the leg cycle for the trip
          inst.active = true;                               // on a trip (the host can count these)
        }
        if (o.startOnScreen !== false && (!o.gate || o.gate())) newTrip(true);
        else { waiting = true; waitUntil = last + rnd(waitMin, waitMax) * 1000; inst.active = false; el.style.left = '-200%'; el.classList.add('uc-paused'); }

        function step(now) {
          if (inst._dead) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (waiting) {
            if (now >= waitUntil) {
              if (!o.gate || o.gate()) newTrip(false);      // re-enter after the pause…
              else waitUntil = now + 800;                   // …unless the host gate is closed
            }
            inst._raf = requestAnimationFrame(step);
            return;
          }
          pct += dir * inst._spd * dt;
          el.style.left = pct + '%';
          if (fly) el.style.marginTop = (Math.sin(now / 900 + bobPhase) * amp) + 'px';
          if ((dir > 0 && pct > 100 + exitPad) || (dir < 0 && pct < -exitPad)) {
            waiting = true;                                  // fully off-stage → wait
            inst.active = false;
            el.classList.add('uc-paused');                   // freeze the ~80 leg animations while parked off-screen (perf)
            waitUntil = now + rnd(waitMin, waitMax) * 1000;
          }
          inst._raf = requestAnimationFrame(step);
        }
        inst._raf = requestAnimationFrame(step);
        return inst;
      },
      /* walker: amble between minPct..maxPct of the viewport width, flipping
         at the edges so the unicorn always faces where it is going */
      patrol: function (o) {
        o = o || {};
        var min = o.minPct != null ? o.minPct : 5;
        var max = o.maxPct != null ? o.maxPct : 90;
        var pct = o.startPct != null ? o.startPct : (min + max) / 2;
        var dir = o.dir || 1;
        var spd = o.speedPctPerSec != null ? o.speedPctPerSec : 1.1;
        var last = performance.now();
        var face = function () { inst.setFlip(FACES_LEFT ? dir > 0 : dir < 0); };
        face();
        el.style.left = pct + '%';
        function step(now) {
          if (inst._dead) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          pct += dir * spd * dt;
          if (pct >= max) { pct = max; dir = -1; face(); }
          if (pct <= min) { pct = min; dir = 1; face(); }
          el.style.left = pct + '%';
          inst._raf = requestAnimationFrame(step);
        }
        inst._raf = requestAnimationFrame(step);
        return inst;
      },
      /* flyer: cross the sky, wrap around the edges, bob gently */
      glide: function (o) {
        o = o || {};
        var pct = o.startPct != null ? o.startPct : 50;
        var dir = o.dir || 1;
        var spd = o.speedPctPerSec != null ? o.speedPctPerSec : 3;
        var amp = o.bobAmpPx != null ? o.bobAmpPx : 12;
        var last = performance.now();
        inst.setFlip(FACES_LEFT ? dir > 0 : dir < 0);
        function step(now) {
          if (inst._dead) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          pct += dir * spd * dt;
          if (pct > 112) pct = -12;
          if (pct < -12) pct = 112;
          el.style.left = pct + '%';
          el.style.marginTop = (Math.sin(now / 900) * amp) + 'px';
          inst._raf = requestAnimationFrame(step);
        }
        inst._raf = requestAnimationFrame(step);
        return inst;
      },
    };
    inst._horse = el.firstElementChild;   // the rig root (actions animate it)
    inst._clicks = 0; inst._nextToot = 4; inst._extraIdx = 0;
    el._inst = inst;                      // backref for host click routing
    /* idle life (unicorn.html): every 6-13s she shakes her mane */
    (function schedShake() {
      inst._shakeT = setTimeout(function () {
        if (inst._dead) return;
        inst.shake();
        schedShake();
      }, 6000 + Math.random() * 7000);
    })();
    var _origRemove = inst.remove;
    inst.remove = function () { clearTimeout(inst._shakeT); _origRemove(); };
    return inst;
  }

  window.Unicorn = { place: place };
})();
