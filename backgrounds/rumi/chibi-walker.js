/* =====================================================================
   chibi-walker.js  —  reusable walking chibi character "rumi"
   ---------------------------------------------------------------------
   The character art (SVG) and ALL of her behaviour live ONCE, here.
   Backgrounds never copy the art; they just load this script and call the
   API, and rumi automatically brings every animation with her.

   Design twin / preview + FULL art documentation:  backgrounds/rumi/rumi.html
   holds the SAME figure (on a white page background) with a deep doc comment
   explaining its anatomy, coordinate system, palette and animation. If you
   edit the art in one file, mirror it into the other.
   Capability sandbox (buttons for everything below): backgrounds/rumi/rumi-test.html

       <script src="path/to/chibi-walker.js"></script>

   ---- API -------------------------------------------------------------
   One crossing (enters off one edge, walks across, exits the other edge):
       ChibiWalker.walk(containerEl, {
         direction: 'ltr',     // 'ltr' (enter left -> exit right) or 'rtl'
         duration : 11000,     // ms to cross the whole screen
         mode     : 'walk',    // 'walk' (upright) or 'fly' (rotated 90°, fast glide)
         height   : '40%',     // character height (any CSS length, vs container)
         bottom   : '6%',      // vertical position of the feet (CSS length)
         bob      : 8,         // px of vertical bounce while walking
         zIndex   : 6,
         faceWalkDir: true,    // mirror so the character faces the way it walks
         onDone   : fn         // called after she exits (element auto-removed)
       });
       // -> returns { element, animation, stop() }

   Continuous patrol (keeps crossing back and forth with random gaps):
       const p = ChibiWalker.patrol(containerEl, {
         height:'40%', bottom:'6%', duration:10000,
         gapMin: 120000, gapMax: 240000,   // gap between crossings (ms)
         alternate: true,                  // flip direction each crossing
         startDelay: 0                     // ms before the FIRST appearance
       });                                 // (game bgs use 60000-180000 = 1-3 min)
       // -> returns { stop() }   // call p.stop() to remove & cancel

   Fire a specific action on the live instance(s) — mainly for testing:
       ChibiWalker.trigger('zap' | 'jump' | 'flyout' | 'hearts' | 'random')

   ---- BEHAVIOUR (all automatic, all at this module level) --------------
   • Walk     — arms swing + legs step (CSS), with a vertical bob + ground shadow.
   • Fly mode — walk({mode:'fly'}): rotated 90° (head leads the travel direction),
                arm raised, no shadow, gliding fast edge-to-edge. Used by the reef
                background, where rumi "swims" past (rightward). Sandbox: reef-test.html.
   • Shadow   — a soft ground ellipse under the feet; sits on the wrapper so it
                stays grounded while the figure jumps / flies.
   • Blink    — the eyes squash shut briefly every few seconds (CSS).
   • Hearts   — big hearts rise above her head + fade; fired on a random per-
                instance timer (~5-14s) AND on every click.
   • Click    — clicking rumi pops hearts + ONE random action:
                  35% lightning zap   (SVG bolts in front of her)
                  35% light jump      (hops; shadow stays grounded)
                  30% raise a hand and fly up out of the screen (then the
                      patrol brings her back after the normal gap)
                Detected via a document capture-phase listener that hit-tests
                her live bounding box (robust even while she animates) and stops
                the click from reaching the scene behind her.

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .chibi-walker (wrapper, WAAPI translateX walk)
                        └ .chibi-shadow (grounded)
                        └ .chibi-act    (jump/fly transforms)  └ svg.chibi-svg (flip)
   - All CSS (limb/blink keyframes, shadow, layers) is injected once into <head>.
   - Pure DOM/SVG + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---- the character art: ONE copy (hearts & opaque background removed,
         viewBox tightened around the figure so positioning is exact).
         2026-07 redesign (see rumi.html): purple bubble ponytail + swirled updo,
         purple-iris eyes, yellow bomber jacket with patches over a white tee +
         pendant, baggy purple pants, white sneakers with pink soles. ---- */
  var SVG_MARKUP =
'<svg class="chibi-svg" viewBox="150 140 300 930" xmlns="http://www.w3.org/2000/svg">' +
'<g transform="translate(300,540) scale(1.10) translate(-300,-540) translate(0,18)" stroke="#000000" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" fill="none">' +

  /* PONYTAIL TOP (behind the head): hair-tie WRAP (cinched gather, mostly occluded)
     + biggest braid bubble (pinched-waist blob); the chain gathers from the updo */
  '<path fill="#ad5fd6" d="M196 244 C184,248 175,258 173,271 C172,281 177,289 186,291 C196,293 206,288 210,278 C213,269 212,256 207,248 C204,244 200,242 196,244 Z"/>' +
  '<path d="M181 252 C176,260 174,270 177,280" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
  '<path d="M190 248 C184,258 182,269 185,282" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
  '<path fill="#ad5fd6" d="M196 278 C178,282 168,300 167,322 C166,342 174,358 190,366 C196,369 208,369 214,365 C230,356 242,342 245,322 C247,300 236,283 218,278 C211,275 202,275 196,278 Z"/>' +
  '<path d="M186 292 C177,304 173,322 175,342" stroke="#8138ad" stroke-width="2.4" fill="none"/>' +
  '<path d="M198 300 C190,312 186,330 189,350" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +

  /* HAIR behind face — side frame locks */
  '<path fill="#ad5fd6" d="M222 300 C198,316 186,352 192,398 C195,424 206,446 222,456 C216,422 212,366 230,322 Z"/>' +
  '<path fill="#ad5fd6" d="M378 300 C402,316 414,352 408,398 C405,424 394,446 378,456 C384,422 388,366 370,322 Z"/>' +

  /* FACE */
  '<path fill="#f8d5c2" stroke-width="3.6" d="M300 250 C246,250 214,286 214,346 C214,402 234,444 268,460 C282,467 318,467 332,460 C366,444 386,402 386,346 C386,286 354,250 300,250 Z"/>' +

  /* HAIRLINE — pointed sideburn locks in front of the ears */
  '<path fill="#ad5fd6" d="M224 316 C210,322 202,360 208,402 C212,430 220,452 232,462 C226,428 222,372 234,332 C230,326 226,322 224,316 Z"/>' +
  '<path fill="#ad5fd6" d="M376 316 C390,322 398,360 392,400 C388,426 380,446 370,454 C376,422 380,372 368,332 C370,326 374,322 376,316 Z"/>' +

  /* UPDO — twisted quiff dome with soft lobe bumps (bottom edge dips to a widow\'s peak
     at 300,312) + two-prong ahoge sprig + bold #8138ad twist seams rising to the apex */
  '<path fill="#ad5fd6" d="M236 311 C204,298 190,268 198,238 C203,210 220,195 244,190 C252,189 260,192 266,196 C274,183 283,173 294,171 C305,172 314,178 320,186 C328,190 340,191 350,197 C368,206 386,220 394,240 C403,268 394,298 366,313 C342,302 318,300 300,312 C282,300 258,302 236,311 Z"/>' +
  '<path fill="#ad5fd6" d="M302 174 C292,167 278,163 264,166 C252,169 244,176 242,184 C253,180 262,179 270,182 C268,175 269,169 273,164 C277,170 281,174 287,177 C292,179 297,178 302,174 Z"/>' +
  '<path d="M242 303 C230,268 240,228 264,203" stroke="#8138ad" stroke-width="3.2" fill="none"/>' +
  '<path d="M306 297 C304,258 310,222 318,192" stroke="#8138ad" stroke-width="3" fill="none"/>' +
  '<path d="M366 305 C378,272 372,240 346,212" stroke="#8138ad" stroke-width="2.8" fill="none"/>' +
  '<path d="M258 224 C266,206 280,196 294,192" stroke="#8138ad" stroke-width="2.6" fill="none"/>' +

  /* EYEBROWS — dark purple, filled + tapered, confident arch */
  '<path fill="#5a2382" stroke="none" d="M227 343 C235,331 252,326 274,332 C275,335 274,338 272,337 C253,332 240,336 231,345 C229,346 227,345 227,343 Z"/>' +
  '<path fill="#5a2382" stroke="none" d="M373 343 C365,331 348,326 326,332 C325,335 326,338 328,337 C347,332 360,336 369,345 C371,346 373,345 373,343 Z"/>' +

  /* EYES (animated: blink) — anime style: big two-tone purple iris nearly filling the
     eye, inner glow, deep pupil, big highlight + sparkle, HEAVY top lid clipping the
     iris top (the confident look) + outer lash flicks */
  '<g class="chibi-eyes">' +
    '<ellipse cx="252" cy="383" rx="30" ry="28" fill="#ffffff" stroke-width="2.2"/>' +
    '<ellipse cx="348" cy="383" rx="30" ry="28" fill="#ffffff" stroke-width="2.2"/>' +
    '<circle cx="253" cy="385" r="23" fill="#7a44b4" stroke="#46216e" stroke-width="2.2"/>' +
    '<circle cx="347" cy="385" r="23" fill="#7a44b4" stroke="#46216e" stroke-width="2.2"/>' +
    '<circle cx="253" cy="392" r="15" fill="#b183e6" stroke="none"/>' +
    '<circle cx="347" cy="392" r="15" fill="#b183e6" stroke="none"/>' +
    '<circle cx="253" cy="385" r="9.5" fill="#2b1246" stroke="none"/>' +
    '<circle cx="347" cy="385" r="9.5" fill="#2b1246" stroke="none"/>' +
    '<circle cx="245" cy="374" r="7" fill="#ffffff" stroke="none"/>' +
    '<circle cx="263" cy="397" r="3.4" fill="#ffffff" stroke="none"/>' +
    '<circle cx="339" cy="374" r="7" fill="#ffffff" stroke="none"/>' +
    '<circle cx="357" cy="397" r="3.4" fill="#ffffff" stroke="none"/>' +
    '<path d="M222 372 C232,359 272,358 282,369" stroke-width="7" fill="none"/>' +
    '<path d="M318 369 C328,358 368,359 378,372" stroke-width="7" fill="none"/>' +
    '<path d="M223 370 C217,365 213,359 211,352" stroke-width="2.8" fill="none"/>' +
    '<path d="M229 363 C225,358 223,353 222,348" stroke-width="2.4" fill="none"/>' +
    '<path d="M377 370 C383,365 387,359 389,352" stroke-width="2.8" fill="none"/>' +
    '<path d="M371 363 C375,358 377,353 378,348" stroke-width="2.4" fill="none"/>' +
  '</g>' +

  /* MOUTH — small smirk */
  '<path d="M287 422 C296,431 309,430 315,419" stroke-width="3" fill="none"/>' +

  /* NECK */
  '<path fill="#f8d5c2" d="M280 458 C280,474 279,486 276,496 L324,496 C321,486 320,474 320,458 Z"/>' +

  /* ARMS (animated at the shoulder): yellow bomber sleeve + dark cuff + skin mitten hand */
  '<g class="arm-l">' +
    '<path fill="#f4c142" d="M262 500 C236,500 216,516 211,542 C206,566 204,595 205,620 C205,632 206,641 208,648 L246,650 C246,626 248,560 252,512 C254,504 264,498 262,500 Z"/>' +
    '<path d="M224 560 C221,580 220,600 221,618" stroke="#d99e2b" stroke-width="2.2" fill="none"/>' +
    '<path fill="#423a45" d="M207 646 L247 648 L245 668 L210 666 Z"/>' +
    '<path fill="#f8d5c2" d="M213 666 C206,671 202,680 203,690 C204,701 213,707 223,705 C232,703 238,697 238,688 C241,692 246,690 247,683 C248,675 244,668 239,667 Z"/>' +
  '</g>' +
  '<g class="arm-r">' +
    '<path fill="#f4c142" d="M338 500 C364,500 384,516 389,542 C394,566 396,595 395,620 C395,632 394,641 392,648 L354,650 C354,626 352,560 348,512 C346,504 336,498 338,500 Z"/>' +
    '<path d="M376 560 C379,580 380,600 379,618" stroke="#d99e2b" stroke-width="2.2" fill="none"/>' +
    '<path fill="#423a45" d="M393 646 L353 648 L355 668 L390 666 Z"/>' +
    '<path fill="#f8d5c2" d="M387 666 C394,671 398,680 397,690 C396,701 387,707 377,705 C368,703 362,697 362,688 C359,692 354,690 353,683 C352,675 356,668 361,667 Z"/>' +
  '</g>' +

  /* TEE (white-pink strip in the jacket opening) + NECKLACE + pendant */
  '<path fill="#f7edf0" d="M300 494 C288,494 279,498 273,505 L272,676 L328,676 L327,505 C321,498 312,494 300,494 Z"/>' +
  '<path d="M285 502 C292,509 308,509 315,502" stroke-width="2.6" fill="none"/>' +
  '<path d="M286 504 C292,522 296,534 300,540" stroke-width="2" fill="none"/>' +
  '<path d="M314 504 C308,522 304,534 300,540" stroke-width="2" fill="none"/>' +
  '<circle cx="300" cy="548" r="9.5" fill="#eef2f6" stroke-width="2.5"/>' +
  '<circle cx="300" cy="548" r="5" fill="none" stroke="#8e98a4" stroke-width="2"/>' +

  /* JACKET — yellow bomber panels (open front) + dark collar + chest patches */
  '<path fill="#f4c142" d="M291 496 C268,495 250,501 243,512 C237,521 234,538 233,558 C232,588 236,624 242,652 C244,663 249,669 257,670 L283,670 C280,644 278,598 279,556 C280,528 283,508 291,496 Z"/>' +
  '<path fill="#f4c142" d="M309 496 C332,495 350,501 357,512 C363,521 366,538 367,558 C368,588 364,624 358,652 C356,663 351,669 343,670 L317,670 C320,644 322,598 321,556 C320,528 317,508 309,496 Z"/>' +
  '<path fill="#423a45" d="M279 500 C288,483 312,483 321,500 L313,509 C306,498 294,498 287,509 Z"/>' +
  '<path fill="#2e2a33" stroke-width="2.5" d="M250 546 L279 542 L281 562 L252 566 Z"/>' +
  '<path d="M256 552 L274 549" stroke="#e34b4b" stroke-width="2.6" fill="none"/>' +
  '<path d="M257 559 L272 556" stroke="#e34b4b" stroke-width="2.6" fill="none"/>' +
  '<path fill="#23262e" stroke-width="2.5" d="M328 538 C341,531 354,538 357,551 C360,565 352,578 339,579 C328,580 321,570 322,557 C323,547 324,542 328,538 Z"/>' +
  '<path d="M330 552 C335,545 342,545 346,551" stroke="#e34b4b" stroke-width="3" fill="none"/>' +
  '<path d="M332 563 C338,569 346,568 350,561" stroke="#35b8c9" stroke-width="3" fill="none"/>' +
  '<path d="M340 546 C344,552 344,560 340,566" stroke="#3a6ff0" stroke-width="2.6" fill="none"/>' +

  /* PONYTAIL FRONT — braid segments 2-5 (pinched-waist blobs whose tops tuck into the
     segment above so outlines cross = the cinch) + a two-strand curled tail, IN FRONT
     of the sleeve; two #8138ad strand seams per segment */
  '<g>' +
    '<path fill="#ad5fd6" d="M192 360 C178,369 172,388 172,406 C172,423 178,437 190,444 C195,447 206,447 211,443 C222,436 228,422 228,405 C228,388 221,370 208,361 C203,357 196,357 192,360 Z"/>' +
    '<path fill="#ad5fd6" d="M197 438 C187,446 181,463 181,482 C181,499 187,512 197,518 C202,521 212,521 217,517 C226,510 231,498 231,481 C231,464 225,448 214,440 C209,436 202,435 197,438 Z"/>' +
    '<path fill="#ad5fd6" d="M190 512 C182,519 176,534 176,551 C176,567 181,578 190,584 C195,587 203,587 208,583 C216,577 220,565 220,550 C220,535 214,521 206,514 C201,510 194,509 190,512 Z"/>' +
    '<path fill="#ad5fd6" d="M200 578 C192,584 187,597 187,612 C187,626 192,637 200,642 C204,645 211,645 215,641 C223,635 227,625 227,613 C227,600 222,587 214,580 C210,576 204,575 200,578 Z"/>' +
    '<path fill="#ad5fd6" d="M206 638 C212,656 219,674 224,690 C228,700 235,702 235,694 C235,686 230,672 224,658 C220,649 215,642 211,638 C208,634 205,635 206,638 Z"/>' +
    '<path fill="#ad5fd6" d="M198 636 C190,666 187,700 196,728 C200,741 209,750 221,752 C230,753 234,746 229,739 C223,735 218,728 215,718 C209,694 207,668 210,646 C210,641 205,638 198,636 Z"/>' +
    '<path d="M184 380 C178,392 177,408 182,424" stroke="#8138ad" stroke-width="2.4" fill="none"/>' +
    '<path d="M199 372 C194,388 193,406 197,424" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M191 456 C185,468 184,484 188,500" stroke="#8138ad" stroke-width="2.4" fill="none"/>' +
    '<path d="M209 452 C216,464 218,484 212,504" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M184 528 C180,540 179,554 183,568" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M203 522 C208,534 209,550 204,566" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M196 592 C191,602 190,616 194,628" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M212 592 C217,602 218,616 213,628" stroke="#8138ad" stroke-width="2" fill="none"/>' +
    '<path d="M202 660 C196,690 197,716 205,736" stroke="#8138ad" stroke-width="2.2" fill="none"/>' +
    '<path d="M213 648 C218,660 222,672 225,682" stroke="#8138ad" stroke-width="2" fill="none"/>' +
  '</g>' +

  /* EARS (after the ponytail: viewer-left ear + silver hoop sit in front of the braid) */
  '<ellipse cx="215" cy="402" rx="9" ry="13" fill="#f8d5c2"/>' +
  '<path d="M212 396 C208,400 208,408 211,412" stroke-width="2" fill="none"/>' +
  '<ellipse cx="385" cy="402" rx="9" ry="13" fill="#f8d5c2"/>' +
  '<path d="M388 396 C392,400 392,408 389,412" stroke-width="2" fill="none"/>' +
  '<ellipse cx="214" cy="421" rx="6.5" ry="9.5" fill="none" stroke="#9aa3b0" stroke-width="4.5"/>' +

  /* PANTS — baggy light-purple hip block + waistband + pocket seams */
  '<path fill="#b18ad8" d="M246 670 C242,698 242,722 247,746 L353,746 C358,722 358,698 354,670 Z"/>' +
  '<path fill="#bfa0e4" stroke-width="3" d="M246 668 L354 668 L353 681 L247 681 Z"/>' +
  '<path d="M258 692 C266,708 275,718 286,724" stroke="#8659b8" stroke-width="2.6" fill="none"/>' +
  '<path d="M342 692 C334,708 325,718 314,724" stroke="#8659b8" stroke-width="2.6" fill="none"/>' +

  /* LEGS (animated at the hip): baggy pant leg + ankle cuff + white sneaker + pink sole */
  '<g class="leg-l">' +
    '<path fill="#b18ad8" d="M248 740 C241,780 239,828 244,878 C246,902 250,916 254,926 L306,926 C307,906 308,868 307,824 C306,790 306,762 305,740 Z"/>' +
    '<path d="M266 782 C263,822 263,864 265,906" stroke="#8659b8" stroke-width="2.2" fill="none"/>' +
    '<path fill="#a37fd0" stroke-width="3" d="M258 924 L304 924 L301 944 L262 944 Z"/>' +
    '<path fill="#ffffff" d="M261 940 C254,951 253,963 257,971 L307,971 C311,963 310,951 305,941 C291,934 273,934 261,940 Z"/>' +
    '<path d="M294 946 C302,950 307,957 308,964" stroke-width="2.2" fill="none"/>' +
    '<path d="M269 948 L297 948" stroke="#d7dce2" stroke-width="3" fill="none"/>' +
    '<path d="M268 958 L298 958" stroke="#d7dce2" stroke-width="3" fill="none"/>' +
    '<path fill="#f2a9c0" d="M253 966 C253,980 261,989 282,989 C302,989 312,980 312,966 C300,976 264,976 253,966 Z"/>' +
  '</g>' +
  '<g class="leg-r">' +
    '<path fill="#b18ad8" d="M352 740 C359,780 361,828 356,878 C354,902 350,916 346,926 L294,926 C293,906 292,868 293,824 C294,790 294,762 295,740 Z"/>' +
    '<path d="M334 782 C337,822 337,864 335,906" stroke="#8659b8" stroke-width="2.2" fill="none"/>' +
    '<path fill="#a37fd0" stroke-width="3" d="M342 924 L296 924 L299 944 L338 944 Z"/>' +
    '<path fill="#ffffff" d="M339 940 C346,951 347,963 343,971 L293,971 C289,963 290,951 295,941 C309,934 327,934 339,940 Z"/>' +
    '<path d="M306 946 C298,950 293,957 292,964" stroke-width="2.2" fill="none"/>' +
    '<path d="M303 948 L331 948" stroke="#d7dce2" stroke-width="3" fill="none"/>' +
    '<path d="M302 958 L332 958" stroke="#d7dce2" stroke-width="3" fill="none"/>' +
    '<path fill="#f2a9c0" d="M347 966 C347,980 339,989 318,989 C298,989 288,980 288,966 C300,976 336,976 347,966 Z"/>' +
  '</g>' +

  /* water ripples at the LEADING edge — drawn on top, shown only in FLY mode
     (after the 90° rotation this sits ahead of her, so she parts the water) */
  '<g class="chibi-water">' +
    '<circle cx="306" cy="166" r="13" fill="none" stroke="#ffffff" stroke-width="3.6"/>' +
    '<circle cx="306" cy="166" r="13" fill="none" stroke="#cdeefb" stroke-width="3.2"/>' +
    '<circle cx="306" cy="166" r="13" fill="none" stroke="#ffffff" stroke-width="3.4"/>' +
  '</g>' +

'</g></svg>';

  /* ---- animation + base CSS, injected once (keyframes namespaced) ---- */
  var CSS =
    '.chibi-walker{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform;}' +
    '.chibi-walker .chibi-svg{height:100%;width:auto;display:block;overflow:visible;}' +
    '.chibi-walker.chibi-flip .chibi-svg{transform:scaleX(-1);}' +
    '.chibi-svg .arm-l,.chibi-svg .arm-r,.chibi-svg .leg-l,.chibi-svg .leg-r{transform-box:fill-box;}' +
    '.chibi-svg .arm-l{transform-origin:50% 6%;animation:chibiArmA 1.5s ease-in-out infinite;}' +
    '.chibi-svg .arm-r{transform-origin:50% 6%;animation:chibiArmB 1.5s ease-in-out infinite;}' +
    '.chibi-svg .leg-l{transform-origin:50% 2%;animation:chibiLegA 1.5s ease-in-out infinite;}' +
    '.chibi-svg .leg-r{transform-origin:50% 2%;animation:chibiLegB 1.5s ease-in-out infinite;}' +
    /* bomber sleeves swing a touch less than the old bare arms did (9deg) */
    '@keyframes chibiArmA{0%,100%{transform:rotate(9deg)}50%{transform:rotate(-9deg)}}' +
    '@keyframes chibiArmB{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}' +
    '@keyframes chibiLegA{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}' +
    '@keyframes chibiLegB{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}' +
    /* blink: the whole eyes group squashes shut briefly every few seconds */
    '.chibi-svg .chibi-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:chibiBlink 4.2s ease-in-out infinite;}' +
    '@keyframes chibiBlink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.08)}}' +
    /* ground shadow under the feet — sits on the wrapper, so it stays grounded
       while the figure (action layer) jumps / flies */
    '.chibi-shadow{position:absolute;left:50%;bottom:-2%;width:108%;height:11%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.30),rgba(0,0,0,0) 72%);pointer-events:none;}' +
    /* action layer: wraps the figure; triggered jump/fly transforms live here */
    '.chibi-act{display:inline-block;height:100%;vertical-align:top;}' +
    /* raised-arm pose (fly-out + fly-across) — pivots at the shoulder, raised almost straight up (~180°) */
    '.chibi-act.chibi-arm-up .chibi-svg .arm-r{animation:none;transform-origin:12% 4%;transform:rotate(-176deg);transition:transform .22s ease-out;}' +
    /* FLY-ACROSS mode: rotate the whole figure 90° so the head leads the travel
       direction (rightward by default), drop the shadow, and still the legs +
       trailing arm for a smooth swim/fly glide */
    '.chibi-walker.chibi-fly .chibi-act{transform:rotate(90deg);}' +
    '.chibi-walker.chibi-fly.chibi-fly-rtl .chibi-act{transform:rotate(-90deg);}' +
    '.chibi-walker.chibi-fly .chibi-shadow{display:none;}' +
    '.chibi-walker.chibi-fly .chibi-svg .arm-l,.chibi-walker.chibi-fly .chibi-svg .leg-l,.chibi-walker.chibi-fly .chibi-svg .leg-r{animation:none;}' +
    /* water ripples at the leading hand — hidden normally, expanding loop while flying */
    '.chibi-svg .chibi-water{display:none;}' +
    '.chibi-walker.chibi-fly .chibi-svg .chibi-water{display:block;}' +
    '.chibi-walker.chibi-fly .chibi-svg .chibi-water circle{transform-box:fill-box;transform-origin:center;animation:chibiWater 1.05s ease-out infinite;}' +
    '.chibi-walker.chibi-fly .chibi-svg .chibi-water circle:nth-child(2){animation-delay:.35s}' +
    '.chibi-walker.chibi-fly .chibi-svg .chibi-water circle:nth-child(3){animation-delay:.7s}' +
    '@keyframes chibiWater{0%{transform:scale(.15);opacity:0}22%{opacity:.95}100%{transform:scale(2);opacity:0}}';

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'chibi-walker-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* one document-level click handler (capture phase) detects a click anywhere on
     a rumi instance via its LIVE bounding box — robust even while she animates
     (composited transforms break element hit-testing) — fires her zap and keeps
     the click from reaching the scene behind her. Works in any background. */
  var clickBound = false;
  function ensureClickHandler() {
    if (clickBound || typeof document === 'undefined') return;
    clickBound = true;
    document.addEventListener('click', function (e) {
      var list = document.querySelectorAll('.chibi-walker');
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

  /* one bolt stroke (blue glow + white core share the same jagged path) */
  function boltPath(NS, d, color, w, op) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('opacity', op);
    return p;
  }

  /* lightning zap — fired when rumi is clicked. Pure SVG drawn IN FRONT of her,
     so it works in ANY background that uses the character (no per-scene code). */
  function fireZap(host) {
    if (typeof document === 'undefined') return;
    var NS = 'http://www.w3.org/2000/svg';
    var SZ = 240, cx = SZ / 2, cy = SZ * 0.6;             // origin ~ her upper body
    var zap = document.createElementNS(NS, 'svg');
    zap.setAttribute('class', 'chibi-zap');
    zap.setAttribute('width', SZ); zap.setAttribute('height', SZ);
    zap.style.cssText = 'position:absolute;left:50%;top:34%;width:' + SZ + 'px;height:' + SZ +
      'px;transform:translate(-50%,-50%);overflow:visible;pointer-events:none;';
    var dirs = [[-0.5,-0.87],[0,-1],[0.5,-0.87],[-0.9,-0.34],[0.9,-0.34]];   // up + diagonal + sides
    for (var k = 0; k < dirs.length; k++) {
      var ax = dirs[k][0], ay = dirs[k][1], px = -ay, py = ax, segs = 6, len = 72 + Math.random() * 52, pts = [];
      for (var i = 0; i <= segs; i++) {
        var f = i / segs, jit = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 22;
        pts.push((cx + ax * len * f + px * jit).toFixed(1) + ',' + (cy + ay * len * f + py * jit).toFixed(1));
      }
      var dStr = 'M' + pts.join(' L');
      zap.appendChild(boltPath(NS, dStr, '#96c8ff', 6, 0.5));   // soft blue glow
      zap.appendChild(boltPath(NS, dStr, '#f7fbff', 2.3, 1));   // bright white core
    }
    var flash = document.createElementNS(NS, 'circle');
    flash.setAttribute('cx', cx); flash.setAttribute('cy', cy); flash.setAttribute('r', 11);
    flash.setAttribute('fill', '#dcefff');
    zap.appendChild(flash);
    host.appendChild(zap);
    if (zap.animate) {
      zap.animate(
        [{ opacity:0.3, offset:0 }, { opacity:1, offset:0.08 }, { opacity:0.5, offset:0.2 },
         { opacity:1, offset:0.34 }, { opacity:0.85, offset:0.55 }, { opacity:0, offset:1 }],
        { duration: 520, easing: 'ease-out' }).onfinish = function () { if (zap.parentNode) zap.remove(); };
    } else {
      setTimeout(function () { if (zap.parentNode) zap.remove(); }, 540);
    }
  }

  /* a heart shape (centered, size s) in the figure's viewBox coordinate space */
  function heartD(cx, cy, s) {
    return 'M' + cx + ',' + (cy + 0.85 * s) +
      ' C' + (cx - 1.25 * s) + ',' + (cy - 0.1 * s) + ' ' + (cx - 0.55 * s) + ',' + (cy - s) + ' ' + cx + ',' + (cy - 0.35 * s) +
      ' C' + (cx + 0.55 * s) + ',' + (cy - s) + ' ' + (cx + 1.25 * s) + ',' + (cy - 0.1 * s) + ' ' + cx + ',' + (cy + 0.85 * s) + ' Z';
  }
  /* big floating hearts that rise above the head and fade — fired on a random
     timer AND on click. Drawn in the figure's SVG so they scale with rumi. */
  function fireHearts(host) {
    if (typeof document === 'undefined') return;
    var svg = host.querySelector ? host.querySelector('.chibi-svg') : null;
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var n = 3 + (Math.random() * 2 | 0);                  // 3-4 hearts
    for (var i = 0; i < n; i++) {
      var cx = 300 + (Math.random() - 0.5) * 120;
      var cy = 140 + (Math.random() - 0.5) * 38;          // above the (taller) updo
      var s = 22 + Math.random() * 9;                     // BIG hearts
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', heartD(cx, cy, s));
      p.setAttribute('fill', '#e6394e');
      p.setAttribute('stroke', 'none');
      svg.appendChild(p);
      (function (path, idx) {
        if (path.animate) {
          var rise = 95 + Math.random() * 60;
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

  /* on click: a heart pop + a RANDOM action (zap / light jump / fly out) */
  function triggerAction(wrap) {
    if (wrap._busy || wrap.classList.contains('chibi-fly')) return;   // mid-action or flying by — ignore
    fireHearts(wrap);                       // hearts on every click
    var r = Math.random();
    if (r < 0.35) fireZap(wrap);            // 35% lightning
    else if (r < 0.70) doJump(wrap);        // 35% light jump
    else doFlyOut(wrap);                    // 30% raise a hand + fly off-screen
  }
  /* a light hop (figure rises and lands; the shadow stays grounded) */
  function doJump(wrap) {
    var act = wrap._act;
    if (!act || !act.animate) { fireZap(wrap); return; }
    wrap._busy = true;
    act.animate(
      [{ transform: 'translateY(0)', easing: 'ease-out' },
       { transform: 'translateY(-30px)', offset: 0.45, easing: 'ease-in' },
       { transform: 'translateY(0)' }],
      { duration: 560 }).onfinish = function () { wrap._busy = false; };
  }
  /* raise one hand, then fly up and out of the top of the screen; ends the crossing */
  function doFlyOut(wrap) {
    var act = wrap._act;
    if (!act || !act.animate) { fireZap(wrap); return; }
    wrap._busy = true;
    if (wrap._walk && wrap._walk.pause) { try { wrap._walk.pause(); } catch (e) {} }  // rise straight up
    act.classList.add('chibi-arm-up');                          // raise one hand
    var dist = (typeof window !== 'undefined' ? window.innerHeight : 800) + 280;
    act.animate(
      [{ transform: 'translateY(0) rotate(0deg)', easing: 'cubic-bezier(.45,0,.85,.35)' },
       { transform: 'translateY(-' + dist + 'px) rotate(10deg)' }],
      { duration: 1100, fill: 'forwards' }).onfinish = function () { if (wrap._end) wrap._end(); };
  }

  function buildElement(opts) {
    ensureCSS();
    ensureClickHandler();
    var wrap = document.createElement('div');
    wrap.className = 'chibi-walker' + (opts.flip ? ' chibi-flip' : '');
    wrap.style.height = opts.height;
    wrap.style.bottom = opts.bottom;
    if (opts.zIndex != null) wrap.style.zIndex = opts.zIndex;
    wrap.style.transform = 'translateX(-99999px)';   // hidden off-screen until measured
    var shadow = document.createElement('div');       // grounded shadow (stays put on jump/fly)
    shadow.className = 'chibi-shadow';
    var act = document.createElement('div');          // action layer (jump/fly transforms here)
    act.className = 'chibi-act';
    act.innerHTML = SVG_MARKUP;
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
      duration: o.duration != null ? o.duration : 11000,
      height: o.height || '40%',
      bottom: o.bottom != null ? o.bottom : '6%',
      bob: o.bob != null ? o.bob : 8,
      zIndex: o.zIndex != null ? o.zIndex : 6,
      faceWalkDir: o.faceWalkDir !== false,
      flip: o.flip,
      mode: o.mode || 'walk',          // 'walk' (upright) or 'fly' (rotated 90°, fast glide)
      loop: !!o.loop,
      onDone: o.onDone || null
    };
    if (!container) return null;
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var fly = opts.mode === 'fly';
    var faceLeft = opts.direction === 'rtl';
    var flip = fly ? false : (opts.faceWalkDir ? faceLeft : !!opts.flip);
    var bob = fly ? 0 : opts.bob;       // smooth glide when flying (no walking bounce)

    var wrap = buildElement({ height: opts.height, bottom: opts.bottom, zIndex: opts.zIndex, flip: flip });
    if (fly) {
      wrap.classList.add('chibi-fly');
      if (faceLeft) wrap.classList.add('chibi-fly-rtl');
      wrap._act.classList.add('chibi-arm-up');     // raise the leading arm
    }
    container.appendChild(wrap);

    var cw = container.clientWidth || (global.innerWidth || 800);
    // when flying she is rotated 90°, so her horizontal extent ≈ her upright height
    var ew = (fly ? wrap.offsetHeight : wrap.offsetWidth) || (container.clientHeight * 0.33) || 200;
    var margin = Math.max(40, ew * 0.3);
    var startX = -ew - margin, endX = cw + margin;
    if (opts.direction === 'rtl') { var tmp = startX; startX = endX; endX = tmp; }

    // linear horizontal travel + gentle vertical bounce
    var steps = 48, frames = [];
    var cycles = Math.max(4, Math.round(opts.duration / 620));
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var x = startX + (endX - startX) * f;
      var y = -Math.abs(Math.sin(f * Math.PI * cycles)) * bob;
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
      wrap._walk = anim;             // the fly-out action pauses this…
      wrap._end = endCrossing;       // …then calls this to end the crossing (patrol continues)
    } else {
      // very old fallback: CSS transition
      wrap.style.transform = 'translate(' + startX + 'px,0)';
      wrap.style.transition = 'transform ' + opts.duration + 'ms linear';
      requestAnimationFrame(function () { wrap.style.transform = 'translate(' + endX + 'px,0)'; });
      var done = function () { wrap.removeEventListener('transitionend', done); if (!opts.loop) { wrap.remove(); if (opts.onDone) opts.onDone(); } };
      wrap.addEventListener('transitionend', done);
      handle.stop = function () { if (wrap._stopHearts) wrap._stopHearts(); if (wrap.parentNode) wrap.remove(); };
    }
    // ambient hearts on a random timer (5–14s); also fired on click
    var heartTO = setTimeout(function tick() {
      if (!wrap.parentNode) return;
      fireHearts(wrap);
      heartTO = setTimeout(tick, 5000 + Math.random() * 9000);
    }, 2000 + Math.random() * 3500);
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

  /* fire a specific action on the live rumi instance(s) — handy for testing.
     name: 'zap' | 'jump' | 'flyout' | 'random' (default). Returns how many fired. */
  function trigger(name) {
    if (typeof document === 'undefined') return 0;
    var list = document.querySelectorAll('.chibi-walker'), n = 0;
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (name === 'zap') fireZap(w);
      else if (name === 'jump') doJump(w);
      else if (name === 'flyout') doFlyOut(w);
      else if (name === 'hearts') fireHearts(w);
      else triggerAction(w);
      n++;
    }
    return n;
  }

  global.ChibiWalker = { walk: walk, patrol: patrol, trigger: trigger, svgMarkup: SVG_MARKUP };
})(typeof window !== 'undefined' ? window : this);
