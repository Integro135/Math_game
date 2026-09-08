/* =====================================================================
   chibi-walker.js  —  reusable walking character "rumi" (realistic 2026-09 redesign;
                       the file/global names keep the historical "chibi" for compatibility)
   ---------------------------------------------------------------------
   The character art (SVG) and ALL of her behaviour live ONCE, here.
   Backgrounds never copy the art; they just load this script and call the
   API, and rumi automatically brings every animation with her.

   Design twin / preview + FULL art documentation:  backgrounds/rumi/rumi.html
   is a live PREVIEW + design notes: it loads THIS module and shows the figure
   big, with buttons that freeze the walk at each phase. The art lives ONLY
   here (ChibiWalker.svgMarkup) — there is no second copy to keep in sync.
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
   • Walk     — a real gait (CSS): thighs swing ±24° with knees bending on the
                forward swing, arms counter-swing with elbows bending, the body
                rides an inverted-pendulum bob, the head nods, the ponytail
                swings; plus the wrapper's vertical bob + ground shadow.
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

  /* ---- the character art: ONE copy. 2026-09 REALISTIC redesign: a three-
         quarter view figure with real proportions (~6 heads tall) facing the
         walk direction, soft gradient shading, thin dark outlines. Kept from
         the earlier rumi: purple bubble-braid ponytail + swirled updo bun,
         purple eyes, silver hoop earring, yellow bomber jacket (name-tag chest
         patch, round sleeve patch, ribbed collar/cuffs/hem, zipper) over a
         white tee + round pendant, baggy lavender pants, white sneakers with
         pink soles. Limbs are TWO-segment chains (arm-l/arm-r → fore-l/fore-r,
         leg-l/leg-r → shin-l/shin-r) so knees and elbows bend in the walk;
         .head nods, .ptail swings, .rumi-body rides the stride. Class names
         the behaviours depend on (.arm-r raised for fly, .chibi-eyes blink,
         .chibi-water ripples) are unchanged. viewBox 110 60 380 1390: hearts
         spawn around (300,140) — just above the bun; the raised hand lands at
         (356,84) where the ripples sit. ---- */
  var SVG_MARKUP =
    '<svg class="chibi-svg" viewBox="110 60 380 1345" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<radialGradient id="rumiSkin" cx="42%" cy="30%" r="80%"><stop offset="0" stop-color="#fbe5d4"/><stop offset=".62" stop-color="#f4cdb5"/><stop offset="1" stop-color="#dfa78c"/></radialGradient>' +
    '<linearGradient id="rumiHair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c78ce8"/><stop offset=".5" stop-color="#a55cd2"/><stop offset="1" stop-color="#7a39a9"/></linearGradient>' +
    '<linearGradient id="rumiJkt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d59a24"/><stop offset=".45" stop-color="#f2c23c"/><stop offset="1" stop-color="#ffd970"/></linearGradient>' +
    '<linearGradient id="rumiJktL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c1871a"/><stop offset="1" stop-color="#e6b02e"/></linearGradient>' +
    '<linearGradient id="rumiPants" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d61bd"/><stop offset=".5" stop-color="#b18ad8"/><stop offset="1" stop-color="#cbb0ea"/></linearGradient>' +
    '<linearGradient id="rumiPantsD" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a50a8"/><stop offset="1" stop-color="#9d74c8"/></linearGradient>' +
    '<linearGradient id="rumiTee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcf7f9"/><stop offset="1" stop-color="#e8dde3"/></linearGradient>' +
    '<linearGradient id="rumiShoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dfe8"/></linearGradient>' +
    '<radialGradient id="rumiIris" cx="40%" cy="35%" r="65%"><stop offset="0" stop-color="#ffd98a"/><stop offset=".55" stop-color="#f09a2e"/><stop offset="1" stop-color="#8a4a12"/></radialGradient>' +
    '<clipPath id="rumiEyeR"><path d="M 314 294 C 318 276 334 266 346 272 C 354 276 358 282 356 286 C 354 298 344 310 334 310 C 324 310 314 304 314 294 Z"/></clipPath>' +
    '<clipPath id="rumiEyeL"><path d="M 286 294 C 282 276 268 266 258 272 C 252 276 248 282 250 286 C 252 298 260 310 270 310 C 280 310 286 304 286 294 Z"/></clipPath>' +
    '</defs>' +
    '<g class="rumi-body" stroke="#3a2740" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">' +
    '<!-- back of the hair (the far side of the head) -->' +
    '<ellipse cx="256" cy="252" rx="64" ry="94" fill="#7a39a9"/>' +
    '<!-- FAR ARM (behind the torso): upper sleeve → elbow group → forearm, cuff, hand -->' +
    '<g class="arm-l">' +
    '<g class="fore-l">' +
    '<path d="M 200 606 C 204 586 244 586 248 606 L 242 742 C 232 754 208 754 202 742 Z" fill="url(#rumiJktL)"/>' +
    '<rect x="200" y="736" width="44" height="24" rx="8" fill="#3d3541"/>' +
    '<path d="M 214 738 v 20 M 222 738 v 20 M 230 738 v 20" stroke="#5a5060" stroke-width="1.4"/>' +
    '<path d="M 206 758 C 200 790 206 814 220 820 C 236 824 246 812 244 794 C 244 778 240 764 238 758 Z" fill="url(#rumiSkin)"/>' +
    '<path d="M 222 786 L 224 812 M 232 786 L 234 810" stroke="#c98d78" stroke-width="1.4" fill="none"/>' +
    '</g>' +
    '<path d="M 200 426 C 214 412 246 414 252 442 L 248 600 C 236 612 210 612 198 600 L 194 448 Z" fill="url(#rumiJktL)"/>' +
    '<path d="M 206 470 C 204 520 204 560 206 596" stroke="#a8730f" stroke-width="1.6" fill="none" opacity=".6"/>' +
    '</g>' +
    '<!-- PONYTAIL: bubble braid hanging from the bun down behind the far shoulder -->' +
    '<g class="ptail">' +
    '<path d="M 214 196 C 186 210 176 250 190 276 C 200 292 226 292 236 276 C 248 252 240 214 214 196 Z" fill="url(#rumiHair)"/>' +
    '<ellipse cx="202" cy="284" rx="12" ry="6" fill="#4a2a5e" stroke="none"/>' +
    '<path d="M 202 288 C 174 300 168 340 182 366 C 192 382 216 380 224 364 C 236 338 228 300 202 288 Z" fill="url(#rumiHair)"/>' +
    '<ellipse cx="198" cy="372" rx="11" ry="5.5" fill="#4a2a5e" stroke="none"/>' +
    '<path d="M 198 376 C 172 388 168 426 180 450 C 190 464 212 462 220 448 C 230 424 222 390 198 376 Z" fill="url(#rumiHair)"/>' +
    '<ellipse cx="196" cy="456" rx="10" ry="5" fill="#4a2a5e" stroke="none"/>' +
    '<path d="M 196 460 C 172 472 170 506 180 528 C 190 540 210 538 216 526 C 226 504 218 474 196 460 Z" fill="url(#rumiHair)"/>' +
    '<ellipse cx="194" cy="534" rx="9" ry="4.5" fill="#4a2a5e" stroke="none"/>' +
    '<path d="M 194 538 C 174 548 172 576 180 594 C 188 604 204 602 210 592 C 218 574 212 548 194 538 Z" fill="url(#rumiHair)"/>' +
    '<path d="M 192 600 C 178 640 190 690 226 712 C 246 724 250 750 236 764" stroke="#8a45bd" stroke-width="12" fill="none"/>' +
    '<path d="M 194 604 C 184 640 196 684 228 706" stroke="#c78ce8" stroke-width="3" fill="none" opacity=".7"/>' +
    '<path d="M 204 214 C 194 236 194 258 202 276 M 196 302 C 186 326 186 348 194 364 M 194 392 C 184 414 184 434 190 448 M 192 474 C 184 494 184 512 190 526" stroke="#6f2f9c" stroke-width="1.5" fill="none" opacity=".75"/>' +
    '</g>' +
    '<!-- FAR LEG: baggy thigh → knee group → shin, gathered cuff, sneaker -->' +
    '<g class="leg-l">' +
    '<g class="shin-l">' +
    '<path d="M 240 1050 C 244 1028 316 1028 320 1050 L 316 1292 C 302 1308 256 1308 248 1292 Z" fill="url(#rumiPantsD)"/>' +
    '<rect x="248" y="1284" width="70" height="28" rx="10" fill="#8f6bbd"/>' +
    '<path d="M 238 1378 C 236 1370 242 1366 252 1366 L 362 1362 C 376 1362 384 1368 384 1376 C 384 1383 376 1389 362 1389 L 250 1390 C 240 1390 236 1385 238 1378 Z" fill="#f2a9c0"/>' +
    '<path d="M 260 1385 L 260 1389 M 278 1385 L 278 1389 M 296 1385 L 296 1389 M 314 1385 L 314 1389 M 332 1385 L 332 1389 M 350 1385 L 350 1389" stroke="#df8fae" stroke-width="1.6"/>' +
    '<path d="M 242 1370 L 366 1366 C 374 1366 378 1370 377 1374 L 242 1378 C 238 1377 238 1372 242 1370 Z" fill="#f7f7f9" stroke="none"/>' +
    '<path d="M 244 1304 C 238 1330 236 1352 242 1368 L 366 1364 C 372 1356 368 1346 354 1338 C 338 1326 322 1316 316 1304 C 306 1296 290 1292 278 1294 C 264 1296 250 1298 244 1304 Z" fill="#e9ecf1"/>' +
    '<path d="M 322 1318 C 338 1328 352 1340 362 1352 C 366 1358 366 1362 366 1364 L 342 1365 C 340 1350 332 1334 322 1318 Z" fill="#e2e6ec" stroke="none"/>' +
    '<path d="M 244 1304 C 238 1330 236 1352 242 1368 L 258 1367 C 254 1348 254 1326 260 1306 Z" fill="#e2e6ec" stroke="none"/>' +
    '<path d="M 248 1352 C 272 1346 302 1348 342 1358" stroke="#cfd5de" stroke-width="2" fill="none"/>' +
    '<path d="M 262 1302 L 316 1310 L 322 1322 L 272 1318 Z" fill="#eef0f4" stroke="none"/>' +
    '<path d="M 266 1304 L 282 1300 M 274 1310 L 290 1306 M 282 1316 L 298 1312 M 290 1322 L 306 1318" stroke="#b9c0cb" stroke-width="2.2"/>' +
    '<circle cx="266" cy="1304" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="282" cy="1300" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="274" cy="1310" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="290" cy="1306" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="282" cy="1316" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="298" cy="1312" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="290" cy="1322" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="306" cy="1318" r="1.3" fill="#8f96a3" stroke="none"/>' +
    '<path d="M 244 1304 C 262 1296 292 1292 316 1304" stroke="#d5dae2" stroke-width="3" fill="none"/>' +
    '<rect x="240" y="1298" width="8" height="10" rx="2" fill="#f2a9c0" stroke="none"/>' +
    '</g>' +
    '<path d="M 236 776 L 326 776 L 328 1046 C 302 1066 250 1066 240 1048 Z" fill="url(#rumiPantsD)"/>' +
    '<path d="M 262 800 C 258 890 260 980 266 1040" stroke="#66408f" stroke-width="1.6" fill="none" opacity=".6"/>' +
    '</g>' +
    '<!-- NEAR LEG -->' +
    '<g class="leg-r">' +
    '<g class="shin-r">' +
    '<path d="M 298 1050 C 302 1028 374 1028 378 1050 L 374 1292 C 360 1308 314 1308 306 1292 Z" fill="url(#rumiPants)"/>' +
    '<rect x="306" y="1284" width="70" height="28" rx="10" fill="#a37fd0"/>' +
    '<path d="M 296 1378 C 294 1370 300 1366 310 1366 L 420 1362 C 434 1362 442 1368 442 1376 C 442 1383 434 1389 420 1389 L 308 1390 C 298 1390 294 1385 296 1378 Z" fill="#f2a9c0"/>' +
    '<path d="M 318 1385 L 318 1389 M 336 1385 L 336 1389 M 354 1385 L 354 1389 M 372 1385 L 372 1389 M 390 1385 L 390 1389 M 408 1385 L 408 1389" stroke="#df8fae" stroke-width="1.6"/>' +
    '<path d="M 300 1370 L 424 1366 C 432 1366 436 1370 435 1374 L 300 1378 C 296 1377 296 1372 300 1370 Z" fill="#f7f7f9" stroke="none"/>' +
    '<path d="M 302 1304 C 296 1330 294 1352 300 1368 L 424 1364 C 430 1356 426 1346 412 1338 C 396 1326 380 1316 374 1304 C 364 1296 348 1292 336 1294 C 322 1296 308 1298 302 1304 Z" fill="url(#rumiShoe)"/>' +
    '<path d="M 380 1318 C 396 1328 410 1340 420 1352 C 424 1358 424 1362 424 1364 L 400 1365 C 398 1350 390 1334 380 1318 Z" fill="#e2e6ec" stroke="none"/>' +
    '<path d="M 302 1304 C 296 1330 294 1352 300 1368 L 316 1367 C 312 1348 312 1326 318 1306 Z" fill="#e2e6ec" stroke="none"/>' +
    '<path d="M 306 1352 C 330 1346 360 1348 400 1358" stroke="#cfd5de" stroke-width="2" fill="none"/>' +
    '<path d="M 320 1302 L 374 1310 L 380 1322 L 330 1318 Z" fill="#eef0f4" stroke="none"/>' +
    '<path d="M 324 1304 L 340 1300 M 332 1310 L 348 1306 M 340 1316 L 356 1312 M 348 1322 L 364 1318" stroke="#b9c0cb" stroke-width="2.2"/>' +
    '<circle cx="324" cy="1304" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="340" cy="1300" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="332" cy="1310" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="348" cy="1306" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="340" cy="1316" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="356" cy="1312" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="348" cy="1322" r="1.3" fill="#8f96a3" stroke="none"/><circle cx="364" cy="1318" r="1.3" fill="#8f96a3" stroke="none"/>' +
    '<path d="M 302 1304 C 320 1296 350 1292 374 1304" stroke="#d5dae2" stroke-width="3" fill="none"/>' +
    '<rect x="298" y="1298" width="8" height="10" rx="2" fill="#f2a9c0" stroke="none"/>' +
    '</g>' +
    '<path d="M 282 776 L 384 776 L 386 1046 C 360 1066 306 1066 292 1048 Z" fill="url(#rumiPants)"/>' +
    '<path d="M 322 800 C 318 890 320 980 326 1040" stroke="#7d54ad" stroke-width="1.6" fill="none" opacity=".6"/>' +
    '</g>' +
    '<!-- HIPS (pants top) over the thigh roots: filled without a bottom outline so the thighs merge into it -->' +
    '<path d="M 262 698 L 380 698 C 392 740 392 790 382 826 L 352 826 C 342 806 300 806 290 826 L 260 826 C 250 790 250 740 262 698 Z" fill="url(#rumiPants)" stroke="none"/>' +
    '<path d="M 260 826 C 250 790 250 740 262 698 L 380 698 C 392 740 392 790 382 826" fill="none"/>' +
    '<path d="M 262 698 L 380 698 L 382 722 L 260 722 Z" fill="#c7ade8"/>' +
    '<path d="M 270 736 C 286 760 292 790 290 820 M 372 736 C 356 760 350 790 352 820" stroke="#7d54ad" stroke-width="1.8" fill="none"/>' +
    '<path d="M 320 726 L 322 810" stroke="#7d54ad" stroke-width="1.6"/>' +
    '<!-- NECK -->' +
    '<path d="M 288 356 L 290 416 L 336 412 L 332 352 Z" fill="url(#rumiSkin)"/>' +
    '<path d="M 290 360 L 332 356 L 330 382 L 292 386 Z" fill="#d9a186" opacity=".55" stroke="none"/>' +
    '<!-- TORSO: crop top + bare midriff, open bomber jacket, hem, zipper, collar, folds, patch, pendant -->' +
    '<path d="M 280 612 L 350 608 L 354 702 L 278 702 Z" fill="url(#rumiSkin)"/>' +
    '<path d="M 280 612 L 293 612 L 293 702 L 278 702 Z" fill="#c9896b" opacity=".22" stroke="none"/>' +
    '<ellipse cx="320" cy="664" rx="2.4" ry="3.4" fill="#c98d78" stroke="none"/>' +
    '<path d="M 284 412 L 340 408 L 348 614 L 282 618 Z" fill="url(#rumiTee)"/>' +
    '<path d="M 284 604 L 346 600" stroke="#cfc3ca" stroke-width="1.4"/>' +
    '<path d="M 214 430 C 240 412 272 410 298 416 L 300 470 C 290 560 284 630 282 698 C 254 712 232 706 226 690 C 214 620 210 520 214 430 Z" fill="url(#rumiJktL)"/>' +
    '<path d="M 322 414 C 350 406 384 414 392 440 C 398 520 398 620 394 690 C 372 712 356 712 352 700 L 340 480 C 336 452 330 430 322 414 Z" fill="url(#rumiJkt)"/>' +
    '<path d="M 226 690 L 282 698 L 284 716 L 228 708 Z" fill="#3d3541"/>' +
    '<path d="M 352 700 L 394 690 L 392 708 L 354 718 Z" fill="#3d3541"/>' +
    '<path d="M 336 416 L 352 700" stroke="#c9cfd8" stroke-width="3"/>' +
    '<path d="M 336 416 L 352 700" stroke="#7f858f" stroke-width="1" stroke-dasharray="4 4"/>' +
    '<path d="M 278 402 C 300 388 340 386 356 398 C 360 408 358 418 352 424 C 330 430 296 432 280 420 C 274 414 274 408 278 402 Z" fill="#3d3541"/>' +
    '<path d="M 288 404 L 292 424 M 300 400 L 304 426 M 314 398 L 316 427 M 328 398 L 330 426 M 342 400 L 344 422" stroke="#5a5060" stroke-width="1.2"/>' +
    '<path d="M 250 520 C 258 560 256 600 252 640 M 366 500 C 372 560 372 620 368 670" stroke="#a8730f" stroke-width="1.6" fill="none" opacity=".55"/>' +
    '<rect x="352" y="516" width="34" height="20" rx="4" fill="#2e2a33"/>' +
    '<path d="M 358 523 h 22 M 358 530 h 16" stroke="#e34b4b" stroke-width="2.4"/>' +
    '<path d="M 300 424 C 306 448 312 462 318 472 M 336 420 C 330 444 324 460 318 472" stroke="#8e98a4" stroke-width="1.8" fill="none"/>' +
    '<circle cx="318" cy="480" r="9" fill="#eef2f6"/>' +
    '<circle cx="318" cy="480" r="4" fill="#b8c2cc" stroke="none"/>' +
    '<!-- HEAD (anime face, slight three-quarter turn toward the walk direction) -->' +
    '<g class="head">' +
    '<path d="M 298 168 C 344 168 374 200 376 250 C 378 296 362 336 336 356 C 322 368 304 370 294 362 C 262 344 230 312 232 266 C 234 216 254 168 298 168 Z" fill="url(#rumiSkin)"/>' +
    '<!-- crown of hair -->' +
    '<path d="M 228 262 C 216 196 250 148 300 146 C 354 144 388 186 380 250 C 372 226 358 212 340 208 C 322 204 300 208 286 214 C 270 220 250 234 240 250 C 234 256 230 260 228 262 Z" fill="url(#rumiHair)"/>' +
    '<!-- the high ponytail\'s gathered root + hair tie -->' +
    '<path d="M 236 178 C 248 158 276 156 288 172 C 276 170 258 174 244 186 Z" fill="url(#rumiHair)"/>' +
    '<ellipse cx="248" cy="182" rx="9" ry="5" fill="#4a2a5e" stroke="none"/>' +
    '<!-- bangs swept to the side, four soft points above the eyes -->' +
    '<path d="M 262 210 C 280 196 320 196 350 216 C 362 226 368 244 366 262 C 356 250 346 246 338 256 C 330 240 320 236 312 250 C 302 236 292 238 286 252 C 280 240 268 236 258 246 C 254 232 256 220 262 210 Z" fill="url(#rumiHair)"/>' +
    '<path d="M 292 214 C 304 210 318 212 330 220 M 272 222 C 280 214 288 212 296 212" stroke="#c78ce8" stroke-width="1.6" fill="none" opacity=".7"/>' +
    '<path d="M 300 212 C 308 222 314 230 318 238 M 336 220 C 344 230 350 238 354 246" stroke="#7a39a9" stroke-width="1.4" fill="none" opacity=".6"/>' +
    '<!-- side locks -->' +
    '<path d="M 366 236 C 380 256 380 290 368 314 C 372 290 370 262 360 244 Z" fill="url(#rumiHair)"/>' +
    '<path d="M 236 250 C 226 274 226 300 236 322 C 232 300 232 276 240 258 Z" fill="url(#rumiHair)"/>' +
    '<!-- ear + hoop earring -->' +
    '<ellipse cx="376" cy="296" rx="10" ry="15" fill="url(#rumiSkin)"/>' +
    '<circle cx="376" cy="320" r="9" fill="none" stroke="#9aa3b0" stroke-width="2.6"/>' +
    '<circle cx="376" cy="320" r="9" fill="none" stroke="#ffffff" stroke-width="1" opacity=".7"/>' +
    '<!-- thin arched brows -->' +
    '<path d="M 312 258 C 326 248 344 248 360 256" stroke="#4a2a5e" stroke-width="2.8" fill="none"/>' +
    '<path d="M 250 262 C 262 252 280 252 292 258" stroke="#4a2a5e" stroke-width="2.6" fill="none"/>' +
    '<!-- anime eyes: taller than wide, outer corners lifted, swept upper lash, amber iris -->' +
    '<g class="chibi-eyes">' +
    '<path d="M 314 294 C 318 276 334 266 346 272 C 354 276 358 282 356 286 C 354 298 344 310 334 310 C 324 310 314 304 314 294 Z" fill="#ffffff" stroke="none"/>' +
    '<g clip-path="url(#rumiEyeR)" stroke="none">' +
    '<ellipse cx="336" cy="292" rx="12" ry="14" fill="url(#rumiIris)"/>' +
    '<ellipse cx="337" cy="294" rx="5.5" ry="7" fill="#2b1a10"/>' +
    '<circle cx="330" cy="282" r="4" fill="#ffffff"/>' +
    '<circle cx="343" cy="300" r="2" fill="#ffffff"/>' +
    '<path d="M 312 294 C 318 274 336 264 350 272 C 356 276 360 282 360 286 C 350 278 332 276 312 294 Z" fill="#000000" opacity=".16"/>' +
    '</g>' +
    '<path d="M 312 296 C 316 276 334 266 346 272 C 354 276 358 282 358 284" stroke="#2b1a2e" stroke-width="4.4" fill="none"/>' +
    '<path d="M 356 284 C 362 280 366 274 367 270" stroke="#2b1a2e" stroke-width="3" fill="none"/>' +
    '<path d="M 324 308 C 334 312 346 306 354 294" stroke="#5a3a5e" stroke-width="1.2" fill="none" opacity=".35"/>' +
    '<path d="M 286 294 C 282 276 268 266 258 272 C 252 276 248 282 250 286 C 252 298 260 310 270 310 C 280 310 286 304 286 294 Z" fill="#ffffff" stroke="none"/>' +
    '<g clip-path="url(#rumiEyeL)" stroke="none">' +
    '<ellipse cx="268" cy="292" rx="11" ry="13" fill="url(#rumiIris)"/>' +
    '<ellipse cx="269" cy="294" rx="5" ry="6.5" fill="#2b1a10"/>' +
    '<circle cx="263" cy="282" r="3.6" fill="#ffffff"/>' +
    '<circle cx="274" cy="300" r="1.8" fill="#ffffff"/>' +
    '<path d="M 288 294 C 282 274 266 264 254 272 C 248 276 246 282 246 286 C 256 278 272 276 288 294 Z" fill="#000000" opacity=".16"/>' +
    '</g>' +
    '<path d="M 288 296 C 284 276 268 266 258 272 C 252 276 248 282 248 284" stroke="#2b1a2e" stroke-width="4.2" fill="none"/>' +
    '<path d="M 250 285 C 246 281 242 276 241 272" stroke="#2b1a2e" stroke-width="2.8" fill="none"/>' +
    '<path d="M 256 306 C 264 312 276 308 284 296" stroke="#5a3a5e" stroke-width="1.2" fill="none" opacity=".35"/>' +
    '</g>' +
    '<!-- tiny nose, small confident smile, blush -->' +
    '<path d="M 312 316 C 316 322 318 326 314 330" stroke="#c98d78" stroke-width="1.6" fill="none"/>' +
    '<path d="M 300 342 C 310 350 322 350 330 340" stroke="#a75d66" stroke-width="2.2" fill="none"/>' +
    '<path d="M 302 343 C 310 350 322 350 328 341 C 320 346 310 346 302 343 Z" fill="#e39aa2" stroke="none" opacity=".8"/>' +
    '<ellipse cx="352" cy="320" rx="12" ry="6" fill="#f2a0a8" opacity=".3" stroke="none"/>' +
    '<ellipse cx="254" cy="320" rx="10" ry="5" fill="#f2a0a8" opacity=".25" stroke="none"/>' +
    '</g>' +
    '<!-- the near arm\'s soft shadow on the jacket -->' +
    '<path d="M 350 432 L 368 430 L 372 690 L 356 698 Z" fill="#000000" opacity=".1" stroke="none"/>' +
    '<!-- NEAR ARM (in front of the torso) -->' +
    '<g class="arm-r">' +
    '<g class="fore-r">' +
    '<path d="M 368 606 C 372 586 414 586 418 606 L 412 742 C 400 754 376 754 368 742 Z" fill="url(#rumiJkt)"/>' +
    '<rect x="368" y="736" width="46" height="24" rx="8" fill="#3d3541"/>' +
    '<path d="M 382 738 v 20 M 390 738 v 20 M 398 738 v 20" stroke="#5a5060" stroke-width="1.4"/>' +
    '<path d="M 374 758 C 368 790 374 814 388 820 C 404 824 414 812 412 794 C 412 778 408 764 406 758 Z" fill="url(#rumiSkin)"/>' +
    '<path d="M 372 770 C 364 780 364 794 372 800" stroke="#c98d78" stroke-width="1.6" fill="none"/>' +
    '<path d="M 388 786 L 390 814 M 398 786 L 400 812" stroke="#c98d78" stroke-width="1.4" fill="none"/>' +
    '</g>' +
    '<path d="M 350 420 C 372 406 406 410 414 440 L 418 600 C 404 614 378 614 366 600 L 358 446 Z" fill="url(#rumiJkt)"/>' +
    '<path d="M 372 470 C 372 520 374 560 374 596" stroke="#a8730f" stroke-width="1.6" fill="none" opacity=".55"/>' +
    '<circle cx="392" cy="522" r="19" fill="#23262e"/>' +
    '<path d="M 384 522 A 8 8 0 1 1 400 522" stroke="#35b8c9" stroke-width="3" fill="none"/>' +
    '<circle cx="392" cy="522" r="3" fill="#3a6ff0" stroke="none"/>' +
    '</g>' +
    '<!-- water ripples at the raised hand (fly / swim mode only) -->' +
    '<g class="chibi-water" fill="none" stroke-width="3">' +
    '<circle cx="356" cy="84" r="20" stroke="#cdeefb"/>' +
    '<circle cx="356" cy="84" r="20" stroke="#ffffff"/>' +
    '<circle cx="356" cy="84" r="20" stroke="#cdeefb"/>' +
    '</g>' +
    '</g></svg>';

  /* ---- animation + base CSS, injected once (keyframes namespaced) ---- */
  var CSS =
    '.chibi-walker{position:absolute;left:0;bottom:0;pointer-events:none;will-change:transform;}' +
    '.chibi-walker .chibi-svg{height:100%;width:auto;display:block;overflow:visible;}' +
    '.chibi-walker.chibi-flip .chibi-svg{transform:scaleX(-1);}' +
    '/* every animated part pivots at a real joint, given in viewBox units */' +
    '.chibi-svg .rumi-body,.chibi-svg .leg-r,.chibi-svg .leg-l,.chibi-svg .shin-r,.chibi-svg .shin-l,.chibi-svg .arm-r,.chibi-svg .arm-l,.chibi-svg .fore-r,.chibi-svg .fore-l,.chibi-svg .head,.chibi-svg .ptail{transform-box:view-box;}' +
    '/* the body rides an inverted pendulum: lowest at each foot-strike (legs spread), highest mid-stance */' +
    '.chibi-svg .rumi-body{animation:rumiBob 1.24s ease-in-out infinite;}' +
    '.chibi-svg .leg-r{transform-origin:330px 790px;animation:rumiThighA 1.24s ease-in-out infinite;}' +
    '.chibi-svg .leg-l{transform-origin:272px 790px;animation:rumiThighB 1.24s ease-in-out infinite;}' +
    '.chibi-svg .shin-r{transform-origin:338px 1050px;animation:rumiShinA 1.24s ease-in-out infinite;}' +
    '.chibi-svg .shin-l{transform-origin:280px 1050px;animation:rumiShinB 1.24s ease-in-out infinite;}' +
    '.chibi-svg .arm-r{transform-origin:378px 436px;animation:rumiArmA 1.24s ease-in-out infinite;}' +
    '.chibi-svg .arm-l{transform-origin:222px 440px;animation:rumiArmB 1.24s ease-in-out infinite;}' +
    '.chibi-svg .fore-r{transform-origin:392px 604px;animation:rumiForeA 1.24s ease-in-out infinite;}' +
    '.chibi-svg .fore-l{transform-origin:222px 606px;animation:rumiForeB 1.24s ease-in-out infinite;}' +
    '.chibi-svg .head{transform-origin:312px 372px;animation:rumiHead 1.24s ease-in-out infinite;}' +
    '.chibi-svg .ptail{transform-origin:262px 160px;animation:rumiTail 1.24s ease-in-out infinite;}' +
    '@keyframes rumiBob{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-26px)}}' +
    '@keyframes rumiThighA{0%,100%{transform:rotate(-17deg)}50%{transform:rotate(17deg)}}' +
    '@keyframes rumiThighB{0%,100%{transform:rotate(17deg)}50%{transform:rotate(-17deg)}}' +
    '@keyframes rumiShinA{0%{transform:rotate(2deg)}25%{transform:rotate(10deg)}50%{transform:rotate(6deg)}75%{transform:rotate(40deg)}100%{transform:rotate(2deg)}}' +
    '@keyframes rumiShinB{0%{transform:rotate(6deg)}25%{transform:rotate(40deg)}50%{transform:rotate(2deg)}75%{transform:rotate(10deg)}100%{transform:rotate(6deg)}}' +
    '@keyframes rumiArmA{0%,100%{transform:rotate(20deg)}50%{transform:rotate(-20deg)}}' +
    '@keyframes rumiArmB{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(20deg)}}' +
    '@keyframes rumiForeA{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(-38deg)}}' +
    '@keyframes rumiForeB{0%,100%{transform:rotate(-38deg)}50%{transform:rotate(-8deg)}}' +
    '@keyframes rumiHead{0%,50%,100%{transform:rotate(1.5deg)}25%,75%{transform:rotate(-1deg)}}' +
    '@keyframes rumiTail{0%,100%{transform:rotate(5deg)}50%{transform:rotate(-6deg)}}' +
    '/* blink: the eyes group squashes shut briefly every few seconds */' +
    '.chibi-svg .chibi-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:chibiBlink 4.2s ease-in-out infinite;}' +
    '@keyframes chibiBlink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.08)}}' +
    '/* ground shadow under the feet — on the wrapper, so it stays grounded while the figure jumps / flies */' +
    '.chibi-shadow{position:absolute;left:50%;bottom:-2%;width:120%;height:7%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.30),rgba(0,0,0,0) 72%);pointer-events:none;}' +
    '/* action layer: wraps the figure; triggered jump/fly transforms live here */' +
    '.chibi-act{display:inline-block;height:100%;vertical-align:top;}' +
    '/* raised-arm pose (fly-out + fly-across): the near arm straight up from the shoulder, elbow straight */' +
    '.chibi-act.chibi-arm-up .chibi-svg .arm-r{animation:none;transform:rotate(-176deg);transition:transform .22s ease-out;}' +
    '.chibi-act.chibi-arm-up .chibi-svg .fore-r{animation:none;transform:rotate(0deg);transition:transform .22s ease-out;}' +
    '/* FLY-ACROSS mode: rotate the whole figure 90° so the head leads the travel direction, drop the shadow, still every limb for a smooth glide */' +
    '.chibi-walker.chibi-fly .chibi-act{transform:rotate(90deg);}' +
    '.chibi-walker.chibi-fly.chibi-fly-rtl .chibi-act{transform:rotate(-90deg);}' +
    '.chibi-walker.chibi-fly .chibi-shadow{display:none;}' +
    '.chibi-walker.chibi-fly .chibi-svg .arm-l,.chibi-walker.chibi-fly .chibi-svg .fore-l,.chibi-walker.chibi-fly .chibi-svg .leg-l,.chibi-walker.chibi-fly .chibi-svg .leg-r,.chibi-walker.chibi-fly .chibi-svg .shin-l,.chibi-walker.chibi-fly .chibi-svg .shin-r,.chibi-walker.chibi-fly .chibi-svg .rumi-body,.chibi-walker.chibi-fly .chibi-svg .head,.chibi-walker.chibi-fly .chibi-svg .ptail{animation:none;}' +
    '.chibi-walker.chibi-fly .chibi-svg .leg-l{transform:rotate(6deg);}' +
    '.chibi-walker.chibi-fly .chibi-svg .leg-r{transform:rotate(-4deg);}' +
    '/* water ripples at the leading hand — hidden normally, expanding loop while flying */' +
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
      var cy = 104 + (Math.random() - 0.5) * 38;          // just above the updo bun
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
