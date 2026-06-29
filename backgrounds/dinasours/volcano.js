/* =====================================================================
   volcano.js  —  reusable erupting "volcano" backdrop
   ---------------------------------------------------------------------
   A self-contained scene BACKDROP, built in the same spirit as
   tricera-walker.js / baby-trex-egg.js: the art (SVG) and ALL of its
   behaviour live ONCE, here. Backgrounds never copy the art; they just
   load this script and call the API, and the volcano brings its whole
   eruption with it.

   It is the original CodePen volcano illustration (volcano.html — an
   Adobe Illustrator export with a GSAP timeline), faithfully repackaged:
   the SVG art (orange sky + radial glow, puffy clouds, the layered
   volcano body and one lava bubble) is copied byte-for-byte; the only
   changes are packaging and behaviour.
     • The hard GSAP dependency is GONE — the rising lava bubbles and the
       drifting clouds are re-created with the Web Animations API, matching
       the original motion (random scatter / scale / stagger, looping).
     • Every selector is SCOPED under the instance root `.volcano` (incl.
       the SVG's global `.st0..16` fill classes), so dropping it into a
       live page can't leak styles onto the host.

   Design twin / preview + art reference:  volcano.html (same figure).
   Minimal integration demo:               volcano-demo.html

       <script src="path/to/volcano.js"></script>

   ---- API -------------------------------------------------------------
   Place the backdrop into a container (it fills the container and erupts
   on a loop, forever):
       const v = Volcano.place(containerEl, {
         zIndex : 0,        // backdrop -> sits low by default
         fit    : 'cover',  // 'cover' (fill, may crop) | 'contain' (letterbox)
       });
       // -> returns { element, remove() }

   Fire a big eruption burst on the live instance(s) — also fires on click:
       Volcano.trigger('erupt')   // -> count fired

   ---- BEHAVIOUR (all automatic) ---------------------------------------
   • Eruption — lava bubbles rise out of the crater with random horizontal
     scatter, random size and staggered timing, looping forever (the GSAP
     timeline, re-created in vanilla JS). Seeded mid-flight on load so the
     plume is already full.
   • Clouds   — drift left/right on their own (yoyo), each at its own speed.
   • Click    — clicking the volcano sets off a fast burst of extra lava.
     Detected via a document capture-phase listener that hit-tests the live
     bounding box and stops the click from reaching the scene behind it.

   ---- structure / notes -----------------------------------------------
   DOM per instance:  .volcano (wrapper, fills container)
                        └ svg.volcano-svg  └ #clouds, #volcano (#bubbleGroup,#body)
   - All CSS is injected once into <head>, every rule scoped under `.volcano`.
   - Pure DOM/SVG + Web Animations API. No dependencies. Works on file://.
   - The container is made position:relative automatically if it is static.
   - Backdrop is meant to be SINGULAR (it owns the gradient ids #bg_1_ /
     #SVGID_1_); place one per scene.
   ===================================================================== */
(function (global) {
  'use strict';

  var DESIGN_W = 1280, DESIGN_H = 1024;   // the original illustration's viewBox
  var N_BUBBLES = 64;                     // lava bubbles in the plume (as authored)
  var CRATER_RISE = 1200;                 // px (user units) a bubble climbs per cycle
  var SVGNS = 'http://www.w3.org/2000/svg';
  /* meteor shower cadence: every 5th volcano CLICK or once every 10 minutes
     (mirrors the savanna lion's roar cadence). Needs window.MeteorShower
     (backgrounds/dinasours/meteor.js) — loaded by the dinosaurs background; if
     absent (e.g. the bare volcano demo) the shower simply doesn't fire. */
  var METEOR_EVERY_CLICKS = 10, METEOR_EVERY_MS = 600000;

  /* one knob (~2cm in viewBox units): the grass band, the mountain ranges AND the
     volcano are all lifted up by this much, together, so the world stays consistent. */
  var RAISE = 78;

  /* scene layout: scale the volcano (UNIFORM, so the lava stays round) and lift
     it UP + RIGHT so the summit sits HIGH on screen. Override opts.volcanoTransform. */
  var VOL_TF = 'translate(417,' + (-305 - RAISE) + ') scale(0.78)';

  /* The original only paints a SHORT cone sitting on a wide foreground/ground —
     lifted up it can't read as a tall peak, and a thin add-on looks like a stem.
     So we CONTINUE the drawing properly:
       • VOL_CLIP — a tall mountain SILHOUETTE (apex at the crater rim, flaring to
         a wide base below the frame). Clipping the painted body + skirt to it
         removes the original's wide ground/foreground and shapes a real peak.
       • VOL_SKIRT — two flanks in the cone's own tones (left = lighter st8,
         right = darker st9, + an st10 ridge highlight) that fill the new lower
         body. The clip cuts their outer edges, so they read as proper slopes.
     The painted crater + streaks stay on top; the lava plume stays round. */
  /* Full mountain SILHOUETTE: hug the painted cone (530..770) down to a clean cut
     line (490..810 @ y1010 — above the original's light foreground band), then
     FLARE to a wide base below. Used for the skirt + the glow. */
  var VOL_CLIP = '530,800 770,800 810,1010 1180,1800 140,1800 490,1010';
  /* the painted body is clipped to ONLY the upper cone (cut at the same line), so
     its messy foreground/ground never shows — the skirt continues below in the
     SAME st8/st9 tones, seamless. */
  var VOL_CLIP_BODY = '530,800 770,800 810,1010 490,1010';
  var VOL_SKIRT =
    '<path class="st8" d="M120,945 H650 V1820 H120 Z"/>' +
    '<path class="st9" d="M650,945 H1200 V1820 H650 Z"/>';

  /* extra mountain ranges BEHIND the volcano, as DATA (st4 = lightest/farthest …
     st10 = nearest). buildMountains() lifts each ridge by RAISE, fills it to the
     bottom of the viewBox (drawn far→near for depth), and crowns every PEAK with a
     white SNOW CAP. */
  var RANGES = [
    { fill: 'st4',  pts: [[-20,706],[150,604],[300,694],[470,560],[650,690],[840,588],[1040,694],[1220,600],[1300,672]] },
    { fill: 'st13', pts: [[-20,792],[170,708],[360,806],[540,694],[740,808],[940,712],[1140,806],[1300,726]] },
    { fill: 'st10', pts: [[-20,874],[210,800],[430,888],[660,808],[880,896],[1100,814],[1300,884]] }
  ];

  /* foreground GRASS so dinosaurs can roam (tricera-walker / stego-walker /
     baby-trex-egg drop onto it). Two bands (back darker, front lighter) in the
     dino greens, drawn IN FRONT of everything; a swayed blade fringe on top.
     GRASS_BACK/FRONT are the band tops BEFORE the RAISE lift. */
  var GRASS_BACK = 880, GRASS_FRONT = 912;
  var STAR_N = 50;          // twinkling stars in the sky

  /* ---- the art: ONE copy each. Sliced byte-for-byte from volcano.html. ---- */
  var BUBBLE = `<g class="vbubble"> <circle class="st5" cx="646.9" cy="915.1" r="40.6"/> <path class="st6" d="M611.1,933.7c-1.3-2.2-2.3-4.6-3.1-7c-0.4-1.2-0.7-2.5-1-3.8c-0.3-1.3-0.5-2.6-0.6-3.9c0-0.3-0.1-0.7-0.1-1 l0-0.5c0-0.2,0-0.3,0-0.5l-0.1-2c0-0.7,0-1.3,0-2c0-0.7,0.1-1.3,0.1-2c0.3-2.6,0.8-5.3,1.6-7.8c0.8-2.6,1.8-5,3.1-7.4 c1.3-2.4,2.8-4.6,4.5-6.7c3.4-4.2,7.7-7.6,12.5-10.2l0.9-0.5c0.3-0.2,0.6-0.3,0.9-0.4l0.9-0.4l0.5-0.2l0.2-0.1l0.2-0.1l0.9-0.4 l0.5-0.2c0.2-0.1,0.3-0.1,0.5-0.2c0.6-0.2,1.3-0.4,1.9-0.6c2.6-0.8,5.3-1.3,7.9-1.5c0.2,0,0.3,0,0.5-0.1l0.5,0l1-0.1l0.5,0 c0.2,0,0.3,0,0.5,0l1,0c1.3,0,2.7,0.1,4,0.2l1,0.1l1,0.1c0.2,0,0.3,0,0.5,0.1l0.5,0.1c0.3,0.1,0.7,0.1,1,0.2 c1.3,0.3,2.6,0.6,3.9,1c5.1,1.6,9.8,4.2,13.9,7.6c1,0.9,2,1.7,2.9,2.7c0.9,0.9,1.8,1.9,2.6,2.9c0.8,1,1.5,2.1,2.2,3.2 c0.7,1.1,1.3,2.2,1.8,3.4c-0.8-1-1.6-2-2.5-2.9c-0.9-0.9-1.8-1.8-2.7-2.7c-0.9-0.8-1.9-1.6-2.9-2.4c-1-0.8-2-1.5-3-2.1 c-4.1-2.7-8.7-4.6-13.4-5.6c-1.2-0.3-2.4-0.5-3.5-0.6c-0.3,0-0.6-0.1-0.9-0.1l-0.4-0.1c-0.1,0-0.3,0-0.4,0l-0.9-0.1l-0.9,0 c-1.2,0-2.4-0.1-3.6,0l-0.9,0c-0.1,0-0.3,0-0.4,0l-0.4,0l-0.9,0.1l-0.4,0c-0.1,0-0.3,0-0.4,0.1l-0.9,0.1l-0.4,0.1 c-0.1,0-0.1,0-0.2,0l-0.2,0l-0.9,0.2l-0.4,0.1c-0.1,0-0.3,0.1-0.4,0.1l-1.7,0.4L637,881l-1.7,0.6c-0.1,0-0.3,0.1-0.4,0.2 l-0.4,0.2l-0.8,0.3l-0.2,0.1l-0.2,0.1l-0.4,0.2l-0.8,0.4c-0.3,0.1-0.5,0.3-0.8,0.4l-0.8,0.4c-4.2,2.2-8,5.2-11.1,8.8 c-3.2,3.6-5.7,7.7-7.5,12.2c-0.9,2.2-1.6,4.6-2,7l-0.2,0.9l-0.1,0.4c0,0.1-0.1,0.3-0.1,0.5c-0.1,0.6-0.2,1.2-0.2,1.8l-0.2,1.8 c0,0.6-0.1,1.2-0.1,1.8c-0.1,2.5,0.1,4.9,0.4,7.4C609.8,928.8,610.3,931.3,611.1,933.7z"/> </g>`;

  var SVG_INNER = `<radialGradient id="bg_1_" cx="646.8936" cy="690.0859" r="580.0529" gradientUnits="userSpaceOnUse">
	<stop  offset="0" style="stop-color:#F2B65F"/>
	<stop  offset="0.4135" style="stop-color:#F2B561"/>
	<stop  offset="0.6472" style="stop-color:#F1B16A"/>
	<stop  offset="0.8354" style="stop-color:#F0AA77"/>
	<stop  offset="0.9995" style="stop-color:#EFA18B"/>
	<stop  offset="1" style="stop-color:#EFA18B"/>
</radialGradient>
<rect id="bg" class="st0" width="1280" height="1026.3"/>
<g id="clouds">
	<g>
		<path class="st1" d="M824.8,479.6h-10.6c7.1-7.6,11.4-17.8,11.4-29c0-23.6-19.1-42.7-42.7-42.7c-12.9,0-24.4,5.7-32.3,14.7
			c-1.6-22.2-20-39.7-42.6-39.7c-23.6,0-42.7,19.1-42.7,42.7c0,1.4,0.1,2.8,0.2,4.2c-14.3,6.9-24.2,21.6-24.2,38.5
			c0,4,0.6,7.9,1.6,11.6c-10.2,1.9-17.9,10.8-17.9,21.5v0c0,12,9.8,21.8,21.8,21.8h178.1c12,0,21.8-9.8,21.8-21.8v0
			C846.6,489.5,836.8,479.6,824.8,479.6z"/>
		<path class="st2" d="M837.3,507.2h-10.6c7.1-7.6,11.4-17.8,11.4-29c0-23.6-19.1-42.7-42.7-42.7c-12.9,0-24.4,5.7-32.3,14.7
			c-1.6-22.2-20-39.7-42.6-39.7c-23.6,0-42.7,19.1-42.7,42.7c0,1.4,0.1,2.8,0.2,4.2c-14.3,6.9-24.2,21.6-24.2,38.5
			c0,4,0.6,7.9,1.6,11.6c-10.2,1.9-17.9,10.8-17.9,21.5l0,0c0,12,9.8,21.8,21.8,21.8h178.1c12,0,21.8-9.8,21.8-21.8l0,0
			C859.1,517.1,849.3,507.2,837.3,507.2z"/>
	</g>
	<path class="st2" d="M362,480.5h-92.8c7.1-6.8,11.6-16.4,11.6-27v0c0-20.6-16.9-37.5-37.5-37.5h-18.2
		c12.1-13.1,19.5-30.6,19.5-49.8c0-27.5-15.1-51.4-37.5-64c-8.4-17.9-23.7-31.8-42.5-38.3c26.3-11.1,44.7-37.2,44.7-67.5
		c0-40.5-32.8-73.3-73.3-73.3c-38.2,0-69.6,29.3-73,66.7c-11.8-8.2-26.2-13-41.7-13c-29.8,0-55.4,17.8-66.9,43.3
		c-33.9,3.9-60.8,30.9-64.4,64.9c-9.1-2.3-18.7-3.6-28.5-3.6c-63.6,0-115.2,51.6-115.2,115.2s51.6,115.2,115.2,115.2
		c9.8,0,19.3-1.2,28.4-3.5c-0.2,2.4-0.4,4.8-0.4,7.2c0,40.5,32.8,73.3,73.3,73.3c30.2,0,56.2-18.3,67.4-44.4
		c6.8,6.8,16.1,10.9,26.4,10.9H362c20.6,0,37.5-16.9,37.5-37.5v0C399.5,497.3,382.6,480.5,362,480.5z"/>
	<g>
		<path class="st1" d="M1263.3,291.8c2.6-5.5,4-11.6,4-18c0-23.2-18.8-42-42-42c-12.7,0-24,5.6-31.7,14.5c-1.5-21.8-19.7-39-41.9-39
			c-22.7,0-41.3,18.1-42,40.7h-49.3c-11.8,0-21.5,9.7-21.5,21.5v0c0,11.8,9.7,21.5,21.5,21.5h25.7c0,0.1,0,0.2,0,0.4
			c0,11.1,4.3,21.1,11.3,28.6h-49.2c-11.8,0-21.5,9.7-21.5,21.5v0c0,11.8,9.7,21.5,21.5,21.5h113.5c7.7,9.1,19.2,14.9,32,14.9
			c12.9,0,24.5-5.8,32.2-15c0.2,0,0.3,0,0.5-0.1c7.6,7.8,18.3,12.6,30,12.6c23.2,0,42-18.8,42-42
			C1298.5,312.4,1283.3,295.1,1263.3,291.8z"/>
		<path class="st2" d="M1272.5,297c2.6-5.5,4-11.6,4-18c0-23.2-18.8-42-42-42c-12.7,0-24,5.6-31.7,14.5c-1.5-21.8-19.7-39-41.9-39
			c-22.7,0-41.3,18.1-42,40.7h-49.3c-11.8,0-21.5,9.7-21.5,21.5v0c0,11.8,9.7,21.5,21.5,21.5h25.7c0,0.1,0,0.2,0,0.4
			c0,11.1,4.3,21.1,11.3,28.6h-49.2c-11.8,0-21.5,9.7-21.5,21.5v0c0,11.8,9.7,21.5,21.5,21.5h113.5c7.7,9.1,19.2,14.9,32,14.9
			c12.9,0,24.5-5.8,32.2-15c0.2,0,0.3,0,0.5-0.1c7.6,7.8,18.3,12.6,30,12.6c23.2,0,42-18.8,42-42
			C1307.7,317.6,1292.5,300.3,1272.5,297z"/>
	</g>
	<g>
		<circle class="st1" cx="536.4" cy="93.2" r="47.7"/>
		<circle class="st1" cx="485.5" cy="112.5" r="32.3"/>
		<circle class="st1" cx="584.1" cy="147.3" r="47.7"/>
		<path class="st2" d="M693.3,181.2h-10.5c0-15.3-10.7-28-25.1-31.1c6.2-8.1,9.9-18.1,9.9-29.1c0-26.3-21.3-47.7-47.7-47.7
			s-47.7,21.3-47.7,47.7c0,2,0.1,3.9,0.4,5.9c-5.8,0.9-11.2,2.9-16.1,5.7c-3.9-22.4-23.5-39.4-47-39.4c-18.1,0-33.8,10.1-41.9,24.9
			c-4.7-10.9-15.5-18.5-28.2-18.5c-16.9,0-30.7,13.7-30.7,30.7c0,14.3,9.8,26.3,23,29.7c-6,8-9.5,17.8-9.5,28.6
			c0,26.3,21.3,47.7,47.7,47.7c8.6,0,16.7-2.3,23.7-6.3c0.3,0,0.6,0,0.9,0h198.7c13.4,0,24.4-11,24.4-24.4v0
			C717.7,192.2,706.7,181.2,693.3,181.2z"/>
	</g>
</g>
<g id="volcano">
	<g id="backdrop">
		<linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="659.9272" y1="916.6985" x2="659.9272" y2="691.0219">
			<stop  offset="0" style="stop-color:#F15A24"/>
			<stop  offset="0.1177" style="stop-color:#E1664E"/>
			<stop  offset="0.2851" style="stop-color:#CD7583"/>
			<stop  offset="0.4491" style="stop-color:#BD82B0"/>
			<stop  offset="0.606" style="stop-color:#B08CD2"/>
			<stop  offset="0.7538" style="stop-color:#A793EB"/>
			<stop  offset="0.889" style="stop-color:#A198FA"/>
			<stop  offset="1" style="stop-color:#9F99FF"/>
		</linearGradient>
		<path class="st3" d="M464.1,916.7c0,0-136.8-146.8-108.5-172.5c30.6-27.8,30.6-38.9,200.3-41.7s283.7-41.7,381.1,41.7
			c94.4,80.9-55.6,172.5-55.6,172.5H464.1z"/>
		<path class="st4" d="M884.1,926.4H459.8l-2.9-3.1C445,910.5,340.2,796.7,342,753.1c0.3-8.3,4-13.3,7-16.1c2-1.8,3.9-3.6,5.7-5.2
			c27.5-25.7,38.9-36.3,201-39c42.1-0.7,80.1-3.6,116.9-6.4c108.8-8.3,194.6-14.8,270.7,50.4c24.9,21.4,36.5,45.6,34.3,72
			c-5.1,62.9-87.7,114.1-91.2,116.2L884.1,926.4z M468.3,907h410.2c12.8-8.3,75.9-51.8,79.7-99.8c1.6-20.1-7.4-38.3-27.6-55.6
			c-70-60-148.2-54-256.6-45.8c-35.3,2.7-75.3,5.7-118,6.4c-154.6,2.5-164.4,11.7-188,33.8c-1.9,1.7-3.8,3.5-5.9,5.4
			c-0.5,0.5-0.6,1.9-0.7,2.5C360.4,780.1,425.2,860.3,468.3,907z"/>
	</g>
	<g id="bubbleGroup"></g>
	<g id="body">
		<path class="st7" d="M937,744.2c-5.8-5-11.7-9.5-17.6-13.6c-15.1,0-29.1,2.1-38.1,8.1c-25,16.7-41.7,27.8-72.3,27.8
			S697.7,939,681,866.6c-16.7-72.3-33.4-77.9-55.6-77.9c-22.3,0-27.8,30.6-30.6,19.5c-2.8-11.1-19.5-22.3-38.9-13.9
			c-19.5,8.3-22.3,13.9-58.4-8.3s-83.5-11.1-94.6-33.4c-5.7-11.3-24.3-14-41.3-13.9c-1.9,1.8-3.9,3.6-6,5.6
			C325,772-31.1,986.2-36.7,986.2v55.6h1443.7v-25C1293,1000.2,1034.3,827.7,937,744.2z"/>
		<g>
			<path class="st8" d="M578,1041.9c21-44.9,51.7-127.1,68.3-248.9c-6.5-3.6-13.4-4.3-20.9-4.3c-22.3,0-27.8,30.6-30.6,19.5
				c-2.8-11.1-19.5-22.3-38.9-13.9c-19.5,8.3-22.3,13.9-58.4-8.3c-35.9-22.1-82.7-11.3-94.3-32.9L96.8,1041.9H578z"/>
			<path class="st9" d="M690.8,1041.9h612.7c-65-28.5-137.7-67.3-184.7-113.6c-102.3-100.9-149.1-61.1-170.5-42.5
				c-21.3,18.6,17,100.7-59.7,105.5C812,996,827.6,885.6,777,887.6c-50.5,2-70.1,90.3-70.1,90.3L690.8,1041.9z"/>
			<path class="st10" d="M446.9,776c-20.5-3.2-37.9-5.3-44.1-17.7c-5.7-11.3-24.3-14-41.3-13.9c-1.9,1.8-3.9,3.6-6,5.6
				c-30.6,27.8-386.7,242-392.2,242v55.6h170.5C269.7,970.3,378.8,857.7,446.9,776z"/>
			<path class="st11" d="M229.2,1041.9h285.1c7-5.9,12.3-10.6,15.3-13.3c0.8-0.7,1.6-1.4,2.4-2.1c0.4-0.4,0.6-0.6,0.6-0.6l0,0
				c5.1-5.1,8.9-11.6,10.8-19.1c5.6-22.2-7.9-44.6-30-50.2c-5.1-1.3-10.2-1.5-15.2-0.9c1.6-1.6,3.1-3.3,4.5-5.1l0.4-0.3l-0.1-0.1
				c5.1-6.5,9-14.1,11.1-22.6c8.1-32.2-11.5-64.8-43.7-72.9c-23.8-6-47.9,3.2-62.1,21.4l0,0c0,0,0,0,0,0.1c-1,1.3-1.9,2.6-2.8,4
				C363.8,937.9,283.1,1002.2,229.2,1041.9z"/>
		</g>
		<path class="st12" d="M174.9,899.3c-5.9-10.6-14.7-18.6-24.9-23.7c-93.5,57-183.9,110.6-186.7,110.6v55.6h77l112.2-63.3
			C180.6,962.9,190.6,927.4,174.9,899.3z"/>
		<g>
			<path class="st4" d="M900.4,1053H112c-5.4,0-9.7-4.4-9.7-9.7c0-5.4,4.4-9.7,9.7-9.7h788.4c5.4,0,9.7,4.4,9.7,9.7
				C910.1,1048.6,905.7,1053,900.4,1053z"/>
			<path class="st4" d="M45.7,949c-3.3,0-6.5-1.7-8.4-4.7c-2.8-4.6-1.2-10.6,3.4-13.4c44.6-26.6,96.4-58,142.3-86.2
				c4.6-2.8,10.6-1.4,13.4,3.2c2.8,4.6,1.4,10.6-3.2,13.4c-45.9,28.2-97.8,59.7-142.5,86.3C49.1,948.5,47.4,949,45.7,949z"/>
			<path class="st13" d="M112,1053H-47.8v-75.1h7.8c6.5-3.3,33-18.5,80.7-47c4.6-2.8,10.6-1.2,13.3,3.4c2.8,4.6,1.2,10.6-3.4,13.4
				c-48.2,28.8-69.2,40.9-79,46.1v39.9H112c5.4,0,9.7,4.4,9.7,9.7C121.8,1048.6,117.4,1053,112,1053z"/>
			<path class="st4" d="M320.3,779.4c-3.2,0-6.3-1.5-8.1-4.4c-3-4.5-1.7-10.5,2.8-13.5c22-14.5,29.9-20.6,32.7-23.1
				c2-1.8,3.8-3.5,5.6-5.2l3.1-2.9l3.8,0c26.7-0.1,43.6,6.3,50.1,19.3c2.3,4.7,8.9,7.6,22.7,10.1c5.3,1,8.8,6,7.9,11.3
				c-1,5.3-6,8.8-11.3,7.9c-15.1-2.7-29.9-7.1-36.7-20.6c-2-3.9-10.6-8.1-28.8-8.5c-1.1,1-2.1,2-3.3,3c-4.8,4.4-16.3,12.5-35,24.9
				C324,778.8,322.2,779.4,320.3,779.4z"/>
			<path class="st13" d="M188.1,862.7c-3.3,0-6.5-1.6-8.3-4.6c-2.8-4.6-1.4-10.6,3.2-13.4c57.7-35.5,103.4-64.2,132-83.2
				c4.5-3,10.5-1.7,13.5,2.8c3,4.5,1.7,10.5-2.8,13.5c-36.4,24-92.2,58.7-132.5,83.5C191.6,862.2,189.8,862.7,188.1,862.7z"/>
			<path class="st14" d="M595,821.8c-0.8,0-1.6-0.1-2.3-0.2c-3.1-0.7-7.1-2.9-8.8-9.6c-0.6-2.2-3-5.4-7.1-7.4
				c-3.2-1.6-9.8-3.6-18.5,0.1c-1.9,0.8-3.6,1.6-5.2,2.3c-15.4,7-24.7,10-51-4.8c-4.7-2.6-6.4-8.6-3.7-13.3
				c2.6-4.7,8.5-6.4,13.2-3.7c19,10.6,21.8,9.3,33.5,4c1.7-0.8,3.6-1.6,5.6-2.5c11.8-5.1,24.2-4.9,34.9,0.3
				c6.7,3.3,12.1,8.5,15.2,14.5c0.8,0.3,1.5,0.8,2.2,1.3c4.2,3.3,5,9.4,1.7,13.6C601.3,820.6,597.8,821.8,595,821.8z"/>
			<path class="st15" d="M506.8,803.4c-1.6,0-3.2-0.4-4.7-1.2c-3.3-1.9-7-4-11.1-6.6c-15.5-9.5-33.9-12.4-50.3-14.9
				c-3.9-0.6-7.7-1.2-11.3-1.8c-5.3-1-8.8-6-7.9-11.3s6-8.8,11.3-7.9c3.4,0.6,7.1,1.2,10.8,1.8c17.2,2.7,38.7,6,57.5,17.6
				c3.9,2.4,7.3,4.4,10.4,6.1c4.7,2.6,6.4,8.6,3.8,13.2C513.5,801.6,510.2,803.4,506.8,803.4z"/>
			<path class="st14" d="M656.3,814.7c-3,0-5.9-1.4-7.9-4c-6.9-9.3-13.1-10.9-24.5-10.9c-5.4,0-9.7-4.4-9.7-9.7s4.4-9.7,9.7-9.7
				c12.7,0,27.4,1.5,40.2,18.8c3.2,4.3,2.3,10.4-2.1,13.6C660.4,814.1,658.4,814.7,656.3,814.7z"/>
			<path class="st16" d="M596.9,820.2c-2.1,0-4.2-0.7-6-2.1c-4.2-3.3-5-9.4-1.6-13.7c0.5-0.6,1.1-1.5,1.7-2.5
				c4.7-7,14.6-21.5,33-21.5c5.4,0,9.7,4.4,9.7,9.7s-4.4,9.7-9.7,9.7c-7.5,0-12.2,6.1-16.9,13c-1,1.4-1.8,2.7-2.5,3.6
				C602.7,818.9,599.8,820.2,596.9,820.2z"/>
			<path class="st14" d="M706.9,889.6c-2.9,0-5.8-1.3-7.8-3.8c-3.3-4.3-2.4-10.4,1.9-13.6c12.8-9.7,29.5-32.4,45.6-54.3
				c7.6-10.4,15.5-21.1,22.9-30.2c3.4-4.2,9.5-4.8,13.7-1.5c4.2,3.4,4.8,9.5,1.5,13.7c-7,8.7-14.5,18.8-22.3,29.5
				c-16.9,23-34.5,46.8-49.5,58.3C711,888.9,709,889.6,706.9,889.6z"/>
			<path class="st15" d="M693.4,895.5c-2.3,0-4.5-0.4-6.6-1.1c-8.2-3-13.6-10.8-16.7-24.1c-6.8-29.4-13.9-48.9-21.7-59.4
				c-3.2-4.3-2.3-10.4,2.1-13.6c4.3-3.2,10.4-2.3,13.6,2.1c9.5,12.9,17.4,34.1,24.9,66.6c2,8.6,4.3,10.2,4.4,10.2
				c0,0,2.2,0.1,7.5-3.9c4.3-3.3,10.4-2.4,13.6,1.9c3.3,4.3,2.4,10.4-1.9,13.6C705.9,892.8,699.4,895.5,693.4,895.5z"/>
			<path class="st14" d="M824.2,776.4c-4.7,0-8.8-3.4-9.6-8.2c-0.9-5.3,2.8-10.3,8.1-11.2c15.2-2.4,27-8.7,43.4-19.5
				c4.5-2.9,10.5-1.7,13.5,2.8c2.9,4.5,1.7,10.5-2.8,13.5c-15.2,9.9-30.5,19.1-51,22.4C825.3,776.3,824.8,776.4,824.2,776.4z"/>
			<path class="st16" d="M777,803.4c-2.1,0-4.3-0.7-6.1-2.2c-4.2-3.4-4.8-9.5-1.5-13.7c17.1-21.2,27.8-29.4,38.1-29.4
				c5.4,0,10.4-0.4,15.1-1.1c5.3-0.9,10.3,2.8,11.2,8.1c0.9,5.3-2.8,10.3-8.1,11.2c-5.8,0.9-11.7,1.4-18.2,1.4
				c-0.9,0.1-6.5,1.8-23,22.2C782.7,802.2,779.9,803.4,777,803.4z"/>
			<path class="st15" d="M1415.4,1053h-515c-5.4,0-9.7-4.4-9.7-9.7c0-5.4,4.4-9.7,9.7-9.7h495.6v-7.1
				C1276.8,1003,1028.7,838.3,929.2,753c-4.6-4-9.4-7.7-14.3-11.2c-17.1,0.4-25.5,3.6-29.6,6.4c-2.9,2-5.8,3.8-8.5,5.6
				c-4.5,3-10.5,1.7-13.5-2.8c-2.9-4.5-1.7-10.5,2.8-13.5c2.7-1.8,5.5-3.6,8.4-5.6c9.7-6.5,23.9-9.6,43.4-9.7l3.1,0l2.5,1.8
				c6.3,4.4,12.4,9.2,18.3,14.2c97.7,83.8,354.9,254.2,465.2,270.4l8.3,1.2V1053z"/>
		</g>
		<g>
			<path class="st13" d="M143.9,1051.6c-5.4,0-9.7-4.4-9.7-9.7c0-4.6,3.3-8.5,7.6-9.5c6.8-3.1,42.3-27.1,73.4-49.1
				c4.4-3.1,10.5-2.1,13.6,2.3c3.1,4.4,2.1,10.5-2.3,13.6C152.2,1051.6,147.4,1051.6,143.9,1051.6z M143.9,1032.1
				C143.9,1032.1,143.9,1032.1,143.9,1032.1C143.9,1032.1,143.9,1032.1,143.9,1032.1z"/>
			<path class="st16" d="M342.5,1046.3c-2.5,0-5-0.9-6.9-2.8c-3.8-3.8-3.8-10-0.1-13.8c11.4-11.5,61.7-71,62.2-71.6
				c3.5-4.1,9.6-4.6,13.7-1.2c4.1,3.5,4.6,9.6,1.2,13.7c-2.1,2.5-51.3,60.7-63.3,72.8C347.5,1045.3,345,1046.3,342.5,1046.3z"/>
			<path class="st13" d="M295.9,940.9c-2.8,0-5.5-1.2-7.4-3.5c-3.5-4.1-2.9-10.3,1.2-13.7c28-23.7,80.9-77.1,81.4-77.6
				c3.8-3.8,9.9-3.9,13.8-0.1c3.8,3.8,3.9,9.9,0.1,13.8c-2.2,2.2-54,54.6-82.7,78.8C300.4,940.1,298.1,940.9,295.9,940.9z"/>
			<path class="st7" d="M469,889.6c-2.1,0-4.2-0.7-5.9-2c-4.3-3.3-5-9.4-1.8-13.7l37.2-48.2c3.3-4.3,9.4-5,13.7-1.8
				c4.3,3.3,5,9.4,1.8,13.7l-37.2,48.2C474.8,888.3,471.9,889.6,469,889.6z"/>
			<path class="st7" d="M520,1001c-1.8,0-3.6-0.5-5.2-1.5c-4.6-2.9-5.9-8.9-3.1-13.4c0.4-0.6,36.9-59.2,54.5-109.5
				c1.8-5.1,7.3-7.8,12.4-6c5.1,1.8,7.8,7.3,6,12.4c-18.3,52.4-54.8,110.9-56.3,113.4C526.4,999.4,523.3,1001,520,1001z"/>
			<path class="st16" d="M794.9,957.1c-3.3,0-6.4-1.6-8.3-4.6c-13.4-21.6-25.5-87.6-26.9-95.1c-1-5.3,2.6-10.4,7.9-11.3
				c5.3-1,10.4,2.6,11.3,7.9c3.5,19.3,14.6,72.7,24.3,88.3c2.8,4.6,1.4,10.6-3.1,13.4C798.4,956.7,796.7,957.1,794.9,957.1z"/>
			<path class="st7" d="M858.8,862.7c-2.6,0-5.3-1.1-7.2-3.2c-11.6-12.8-22.1-41.7-23.3-44.9c-1.8-5.1,0.8-10.6,5.9-12.4
				c5.1-1.8,10.6,0.8,12.4,5.9c2.8,7.8,11.7,30,19.3,38.4c3.6,4,3.3,10.1-0.7,13.8C863.5,861.8,861.2,862.7,858.8,862.7z"/>
			<path class="st14" d="M997.1,1026.3c-0.8,0-1.7-0.1-2.5-0.3c-39.7-10.6-99.7-94.2-106.5-103.6c-3.1-4.4-2.1-10.5,2.3-13.6
				c4.4-3.1,10.5-2.1,13.6,2.3c17.1,24.2,67.7,88.6,95.6,96.1c5.2,1.4,8.3,6.7,6.9,11.9C1005.4,1023.4,1001.4,1026.3,997.1,1026.3z"
				/>
			<path class="st16" d="M1096.4,985.2c-1.9,0-3.7-0.5-5.4-1.6l-88.4-58.8c-4.5-3-5.7-9-2.7-13.5c3-4.5,9-5.7,13.5-2.7l88.4,58.8
				c4.5,3,5.7,9,2.7,13.5C1102.6,983.7,1099.5,985.2,1096.4,985.2z"/>
			<path class="st14" d="M1138.6,949c-1.8,0-3.6-0.5-5.3-1.6c-169.8-109.9-172-113.6-173.5-116.1c-2.8-4.6-1.3-10.6,3.3-13.4
				c4-2.4,9.1-1.6,12.2,1.8c8.8,7.3,107.6,71.9,168.6,111.3c4.5,2.9,5.8,8.9,2.9,13.5C1144.9,947.4,1141.8,949,1138.6,949z
				 M976.5,821.3C976.5,821.3,976.5,821.3,976.5,821.3C976.5,821.3,976.5,821.3,976.5,821.3z M976.5,821.3
				C976.5,821.3,976.5,821.3,976.5,821.3C976.5,821.3,976.5,821.3,976.5,821.3z"/>
		</g>
	</g>
</g>`;

  var SVG_MARKUP =
    '<svg class="volcano-svg" xmlns="http://www.w3.org/2000/svg" ' +
    'viewBox="0 0 ' + DESIGN_W + ' ' + DESIGN_H + '" preserveAspectRatio="xMidYMid slice">' +
    SVG_INNER + '</svg>';

  /* ---- CSS, injected once, every selector scoped under `.volcano`. The
         `.stN` fill classes are the SVG's own (it had a global <style>); the
         two gradient fills (st0 sky, st3 backdrop) point at ids in the SVG. */
  var CSS = [
    '.volcano{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:auto;}',
    '.volcano>.volcano-svg{display:block;width:100%;height:100%;}',
    '.volcano .vbubble{transform-box:fill-box;transform-origin:50% 50%;will-change:transform;}',
    '.volcano #clouds>*{transform-box:fill-box;transform-origin:50% 50%;will-change:transform;}',
    '.volcano .vstar{transform-box:fill-box;transform-origin:50% 50%;will-change:opacity,transform;}',
    '.volcano .gblade{transform-box:fill-box;transform-origin:50% 100%;will-change:transform;}',
    /* the illustration's fill palette (scoped) */
    '.volcano .st0{fill:url(#bg_1_);}',
    '.volcano .st1{fill:#FFFFFF;}',
    '.volcano .st2{fill:#FFE09D;}',
    '.volcano .st3{fill:url(#SVGID_1_);}',
    '.volcano .st4{fill:#B3AEF5;}',
    '.volcano .st5{fill:#946EB5;}',
    '.volcano .st6{fill:#BF7AB3;}',
    '.volcano .st7{fill:#353273;}',
    '.volcano .st8{fill:#4F4791;}',
    '.volcano .st9{fill:#313580;}',
    '.volcano .st10{fill:#7063CA;}',
    '.volcano .st11{fill:#3C3A79;}',
    '.volcano .st12{fill:#6C5DA0;}',
    '.volcano .st13{fill:#9F99FF;}',
    '.volcano .st14{fill:#4A4DB5;}',
    '.volcano .st15{fill:#2E347F;}',
    '.volcano .st16{fill:#7164BE;}'
  ].join('');

  var cssInjected = false;
  function ensureCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    var s = document.createElement('style');
    s.id = 'volcano-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* GSAP power1.out (decelerate) feel for the rising lava */
  var RISE_EASE = 'cubic-bezier(0.25,0.46,0.45,0.94)';

  /* one lava bubble's life: rise from the crater with random scatter/size,
     then loop with fresh randoms (the GSAP stagger+repeatRefresh, in WAAPI). */
  function runBubble(st, g, i, seed) {
    if (st.stopped || !g.animate) return;
    var fromX = rnd(-100, 100), sc = rnd(0.1, 2), toX = rnd(-250, 200);
    var dur = rnd(8, 20) * 1000;
    var a = g.animate(
      [{ transform: 'translate(' + fromX + 'px,0px) scale(' + sc + ')' },
       { transform: 'translate(' + toX + 'px,' + (-CRATER_RISE) + 'px) scale(' + sc + ')' }],
      { duration: dur, easing: RISE_EASE });
    a.onfinish = function () { runBubble(st, g, i); };
    st.bubbleAnims[i] = a;
    // on first start, drop the bubble in at a random point of its climb so the
    // plume is already full on load (the original timeline's .seek(1000)).
    if (seed) { try { a.currentTime = Math.random() * dur; } catch (e) {} }
  }

  /* clouds drift left/right on their own, each at its own pace (GSAP yoyo) */
  function startClouds(st, svg) {
    var clouds = svg.querySelectorAll('#clouds > *');
    for (var i = 0; i < clouds.length; i++) {
      if (!clouds[i].animate) break;
      var amp = rnd(-200, 200), dur = rnd(10, 20) * 1000;
      var a = clouds[i].animate(
        [{ transform: 'translateX(0px)' }, { transform: 'translateX(' + amp + 'px)' }],
        { duration: dur, direction: 'alternate', iterations: Infinity, easing: 'linear' });
      try { a.currentTime = Math.random() * dur; } catch (e) {}   // .seek(500)
      st.cloudAnims.push(a);
    }
  }

  /* a twinkling star field in the upper sky (space-style: crisp core, a few with
     a 4-point sparkle), each pulsing opacity/size on its own timer. */
  function buildStars(st, svg) {
    var layer = document.createElementNS(SVGNS, 'g');
    layer.setAttribute('id', 'stars');
    for (var i = 0; i < STAR_N; i++) {
      var x = rnd(20, 1260), y = rnd(12, 560), r = rnd(1.7, 3.8);
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'vstar');
      var halo = document.createElementNS(SVGNS, 'circle');     // soft glow so it reads on the bright sky
      halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', r * 2.3);
      halo.setAttribute('fill', '#fff'); halo.setAttribute('opacity', '0.3');
      g.appendChild(halo);
      var core = document.createElementNS(SVGNS, 'circle');
      core.setAttribute('cx', x); core.setAttribute('cy', y); core.setAttribute('r', r);
      core.setAttribute('fill', '#fff');
      g.appendChild(core);
      if (Math.random() < 0.5) {                       // many get a 4-point sparkle
        var R = r * 3, ri = R * 0.16, sp = document.createElementNS(SVGNS, 'polygon');
        sp.setAttribute('points', [
          x, y - R, x + ri, y - ri, x + R, y, x + ri, y + ri,
          x, y + R, x - ri, y + ri, x - R, y, x - ri, y - ri].join(' '));
        sp.setAttribute('fill', '#fff'); sp.setAttribute('opacity', '0.85');
        g.appendChild(sp);
      }
      layer.appendChild(g);
      if (g.animate) {
        var lo = rnd(0.4, 0.6), hi = rnd(0.95, 1), dur = rnd(1200, 3600);
        var a = g.animate(
          [{ opacity: lo, transform: 'scale(0.7)' }, { opacity: hi, transform: 'scale(1.15)' }],
          { duration: dur, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        try { a.currentTime = Math.random() * dur; } catch (e) {}
        st.cloudAnims.push(a);
      }
    }
    var bg = svg.querySelector('#bg');
    svg.insertBefore(layer, bg ? bg.nextSibling : svg.firstChild);   // behind clouds/peaks
  }

  function band(fill, top) {       // a grass band: wavy top edge filled to the bottom
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('fill', fill);
    p.setAttribute('d', 'M-20,1024 V' + top + ' Q320,' + (top - 16) + ' 660,' + (top - 6) +
      ' T1320,' + (top - 8) + ' V1024 Z');
    return p;
  }

  /* foreground grass band + a swaying blade fringe, drawn in front of everything.
     Lifted by RAISE so the band sits higher (taller). */
  function buildGrass(st, svg) {
    var layer = document.createElementNS(SVGNS, 'g');
    layer.setAttribute('id', 'grass');
    layer.appendChild(band('#3f6e2c', GRASS_BACK - RAISE));     // back (darker)
    layer.appendChild(band('#6ea653', GRASS_FRONT - RAISE));    // front (lighter)
    var bladeBase = GRASS_FRONT - RAISE - 6;
    // blade tufts along the front edge
    for (var x = 20; x < 1280; x += rnd(36, 64)) {
      var base = bladeBase + rnd(-4, 6), h = rnd(20, 46), w = rnd(7, 12);
      var blade = document.createElementNS(SVGNS, 'path');
      blade.setAttribute('class', 'gblade');
      blade.setAttribute('fill', Math.random() < 0.5 ? '#6ea653' : '#8cc777');
      blade.setAttribute('d',
        'M' + (x - w) + ',' + base + ' Q' + (x - 1) + ',' + (base - h) + ' ' + (x + 2) + ',' + base +
        ' Q' + (x + 3) + ',' + (base - h * 0.7) + ' ' + (x + w) + ',' + base + ' Z');
      layer.appendChild(blade);
      if (blade.animate) {
        var a = blade.animate(
          [{ transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }],
          { duration: rnd(2200, 4200), direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
        try { a.currentTime = Math.random() * 3000; } catch (e) {}
        st.cloudAnims.push(a);
      }
    }
    svg.appendChild(layer);   // frontmost — dinosaurs walk on this
  }

  /* a white snow cap on one peak: apex at the peak, dripping a little way down
     each slope to a softly-scalloped snow line. */
  function snowCap(L, P, R) {
    var px = P[0], py = P[1], capH = 54;
    var lf = Math.min(0.85, capH / Math.max(30, L[1] - py));
    var rf = Math.min(0.85, capH / Math.max(30, R[1] - py));
    var lxp = px + (L[0] - px) * lf, lyp = py + (L[1] - py) * lf;
    var rxp = px + (R[0] - px) * rf, ryp = py + (R[1] - py) * rf;
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('fill', '#fff');
    p.setAttribute('d',
      'M' + px + ',' + (py - 1) +
      ' L' + rxp + ',' + ryp +
      ' L' + (px + (rxp - px) * 0.5) + ',' + (ryp + 9) +
      ' L' + px + ',' + ((lyp + ryp) / 2) +
      ' L' + (px + (lxp - px) * 0.5) + ',' + (lyp + 11) +
      ' L' + lxp + ',' + lyp + ' Z');
    return p;
  }

  /* build the mountain ranges from RANGES data: lift each ridge by RAISE, fill it
     to the bottom, and crown every peak with a snow cap. Returns the #bgMountains group. */
  function buildMountains() {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('id', 'bgMountains');
    for (var r = 0; r < RANGES.length; r++) {
      var raw = RANGES[r].pts, pts = [];
      for (var i = 0; i < raw.length; i++) pts.push([raw[i][0], raw[i][1] - RAISE]);  // lifted
      var d = 'M-20,1024';
      for (i = 0; i < pts.length; i++) d += ' L' + pts[i][0] + ',' + pts[i][1];
      d += ' L1300,1024 Z';
      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('class', RANGES[r].fill);
      path.setAttribute('d', d);
      g.appendChild(path);
      // snow caps on the peaks (a vertex higher than both neighbours)
      for (i = 1; i < pts.length - 1; i++) {
        if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1]) {
          g.appendChild(snowCap(pts[i - 1], pts[i], pts[i + 1]));
        }
      }
    }
    return g;
  }

  /* one jagged lightning stroke (caller stacks a glow + a bright core) */
  function bolt(d, color, w) {
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color); p.setAttribute('stroke-width', w);
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    return p;
  }

  /* lightning near the volcano when it erupts — a DOM/SVG port of the savanna
     lion's roar bolts: a pale sky flash + 3 jagged forks crashing down toward
     the crater, flickering then fading over ~0.5s. */
  function flashLightning(st) {
    if (st.stopped || !st.svg) return;
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('pointer-events', 'none');
    var fl = document.createElementNS(SVGNS, 'rect');
    fl.setAttribute('x', 0); fl.setAttribute('y', 0);
    fl.setAttribute('width', DESIGN_W); fl.setAttribute('height', 560);
    fl.setAttribute('fill', 'rgba(212,228,255,0.18)');
    g.appendChild(fl);
    var xs = [822, 922, 1012];                 // around the crater (~x922)
    for (var b = 0; b < xs.length; b++) {
      var bx = xs[b] + rnd(-30, 30), botY = rnd(280, 380), segs = 6, pts = [[bx, 0]];
      for (var s = 1; s <= segs; s++) pts.push([bx + rnd(-26, 26), botY * (s / segs)]);
      var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (var k = 1; k < pts.length; k++) d += ' L' + pts[k][0].toFixed(1) + ',' + pts[k][1].toFixed(1);
      var f = pts[3];                          // a short fork off the middle
      d += ' M' + f[0].toFixed(1) + ',' + f[1].toFixed(1) +
           ' L' + (f[0] + rnd(-30, 30)).toFixed(1) + ',' + (f[1] + botY * 0.2).toFixed(1);
      g.appendChild(bolt(d, 'rgba(150,190,255,.85)', 7));   // soft blue glow
      g.appendChild(bolt(d, 'rgba(245,250,255,1)', 2.4));   // bright white core
    }
    st.svg.appendChild(g);                     // frontmost — over the ranges
    var done = function () { if (g.parentNode) g.remove(); };
    if (g.animate) {
      var a = g.animate(
        [{ opacity: 0.2 }, { opacity: 1, offset: 0.08 }, { opacity: 0.4, offset: 0.24 },
         { opacity: 1, offset: 0.42 }, { opacity: 0.5, offset: 0.6 }, { opacity: 0, offset: 1 }],
        { duration: 520, easing: 'ease-out' });
      a.onfinish = done; st.cloudAnims.push(a);
    } else { setTimeout(done, 540); }
  }

  /* a fast burst of extra lava out of the crater (click / trigger) */
  function erupt(st, n) {
    if (st.stopped) return;
    flashLightning(st);                        // lightning crashes down with the eruption
    n = Math.min(N_BUBBLES, n || 18);
    var big = n >= N_BUBBLES;                  // a CLICK erupts ALL bubbles (distinct)
    var spread = big ? 260 : 160, scHi = big ? 2.2 : 1.7;   // wider + bigger when big
    for (var k = 0; k < n; k++) {
      var i = big ? k : ((Math.random() * N_BUBBLES) | 0);
      var g = st.bubbles[i];
      if (!g || !g.animate) continue;
      if (st.bubbleAnims[i]) { try { st.bubbleAnims[i].cancel(); } catch (e) {} }
      (function (g, i) {
        var fromX = rnd(-50, 50), sc = rnd(0.5, scHi), toX = rnd(-spread, spread);
        var dur = rnd(1800, 3800);
        var a = g.animate(
          [{ transform: 'translate(' + fromX + 'px,0px) scale(' + (sc * 0.6) + ')' },
           { transform: 'translate(' + toX + 'px,' + (-CRATER_RISE) + 'px) scale(' + sc + ')' }],
          { duration: dur, easing: RISE_EASE });
        a.onfinish = function () { runBubble(st, g, i); };   // back to the calm loop
        st.bubbleAnims[i] = a;
      })(g, i);
    }
  }

  /* a fresh meteor shower over the scene (if the module is loaded). Stops any
     prior one first so showers never stack. */
  function meteorShower(st) {
    if (st.stopped) return;
    // if the host wired an onMeteor hook, let IT orchestrate (e.g. the dinosaurs
    // scene runs the dinos off first, then starts the shower). Otherwise fire it
    // directly over our own container (the bare volcano demo).
    if (st.onMeteor) { st.onMeteor(); return; }
    if (!global.MeteorShower) return;
    var host = (st.wrap && st.wrap.parentNode) || st.wrap;
    if (!host) return;
    if (st._meteor && st._meteor.stop) { try { st._meteor.stop(); } catch (e) {} }
    st._meteor = global.MeteorShower.start(host, { duration: 14000 });
  }

  /* a CLICK on the volcano: a BIG bubble eruption + bump the on-cone counter; on
     every 10th click a meteor shower (the 10-min timer fires it too — see place()). */
  function volcanoClick(st) {
    st.clicks = (st.clicks || 0) + 1;
    // counter counts DOWN to the meteor shower: 9,8,…,1,0 (0 = this click fired it).
    if (st.counter) {
      var r = st.clicks % METEOR_EVERY_CLICKS;          // 1..9, then 0 on the 10th
      st.counter.textContent = String((r === 0) ? 0 : (METEOR_EVERY_CLICKS - r));
      st.counter.style.opacity = '0.9';                 // flash it on…
      clearTimeout(st._counterT);
      st._counterT = setTimeout(function () {           // …then hide after ~0.5s
        if (st.counter) st.counter.style.opacity = '0';
      }, 350);
    }
    erupt(st, N_BUBBLES);
    if (st.clicks % METEOR_EVERY_CLICKS === 0) meteorShower(st);
  }

  /* one document capture-phase click handler: erupt ONLY when the click actually
     lands on the volcano itself (its visible summit, the skirt, or the lava) —
     not on the mountains, grass, sky or a dino. Uses the real top-most element at
     the point, so a click on a mountain that hides the volcano body does nothing. */
  var clickBound = false, INSTANCES = [];
  function ensureClickHandler() {
    if (clickBound || typeof document === 'undefined') return;
    clickBound = true;
    document.addEventListener('click', function (e) {
      // elementsFromPoint (not elementFromPoint): the scene stage can sit at
      // z-index:-1 behind the page (the math game), so the TOP element is the
      // body — but the volcano's own painted SVG shapes (pointer-events:auto)
      // still appear deeper in the stack. We take the FIRST element belonging
      // to this volcano's SVG (= the topmost painted shape at that point) and
      // erupt only if it is inside the #volcano group — so a click on the
      // mountains / sky / grass still does nothing.
      var stack = document.elementsFromPoint
        ? document.elementsFromPoint(e.clientX, e.clientY)
        : [document.elementFromPoint(e.clientX, e.clientY)];
      for (var i = 0; i < INSTANCES.length; i++) {
        var st = INSTANCES[i];
        if (st.stopped || !st.wrap.isConnected || !st.volc || !st.svg) continue;
        var topInSvg = null;
        for (var k = 0; k < stack.length; k++) {
          if (stack[k] && st.svg.contains(stack[k])) { topInSvg = stack[k]; break; }
        }
        if (topInSvg && (st.volc === topInSvg || st.volc.contains(topInSvg))) {
          volcanoClick(st);
          e.stopPropagation();
          return;
        }
      }
    }, true);
  }

  /* a userSpaceOnUse polygon clipPath, returned ready to drop into <defs> */
  function mkClip(id, points) {
    var clip = document.createElementNS(SVGNS, 'clipPath');
    clip.setAttribute('id', id);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    var poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', points);
    clip.appendChild(poly);
    return clip;
  }

  /* place the backdrop into a container (fills it, erupts on a loop) */
  function place(container, options) {
    ensureCSS();
    ensureClickHandler();
    var o = options || {};
    if (!container) return null;
    var cs = global.getComputedStyle ? getComputedStyle(container) : null;
    if (cs && cs.position === 'static') container.style.position = 'relative';

    var wrap = document.createElement('div');
    wrap.className = 'volcano';
    if (o.zIndex != null) wrap.style.zIndex = o.zIndex;
    wrap.innerHTML = SVG_MARKUP;
    container.appendChild(wrap);

    var svg = wrap.querySelector('.volcano-svg');
    if (o.fit === 'contain') svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // ---- scene composition: extra mountain ranges behind a smaller, taller,
    //      right-side volcano (same palette / clouds / sky).
    var volc = wrap.querySelector('#volcano');
    if (volc && o.scene !== false) {
      volc.setAttribute('transform', o.volcanoTransform || VOL_TF);

      // tall-mountain silhouette: clip the skirt + glow to the full peak shape,
      // and the painted body to ONLY its upper cone (so its ground never shows).
      var defs = document.createElementNS(SVGNS, 'defs');
      defs.appendChild(mkClip('volClip', o.volcanoClip || VOL_CLIP));
      defs.appendChild(mkClip('volClipBody', VOL_CLIP_BODY));
      svg.insertBefore(defs, svg.firstChild);

      // the new lower flanks — drawn behind the lava (after #backdrop), clipped
      // to the silhouette, with the painted #body on top.
      var skirt = document.createElementNS(SVGNS, 'g');
      skirt.setAttribute('id', 'volSkirt');
      skirt.setAttribute('clip-path', 'url(#volClip)');
      var sp = new DOMParser().parseFromString(
        '<svg xmlns="' + SVGNS + '">' + VOL_SKIRT + '</svg>', 'image/svg+xml').querySelectorAll('path');
      for (var s = 0; s < sp.length; s++) skirt.appendChild(document.importNode(sp[s], true));
      var bd = wrap.querySelector('#backdrop'), bdy = wrap.querySelector('#body');
      if (bd && bd.parentNode) {
        bd.parentNode.insertBefore(skirt, bd.nextSibling);  // behind the bubbles
        bd.setAttribute('clip-path', 'url(#volClip)');       // keep the glow inside the peak
      }
      if (bdy) bdy.setAttribute('clip-path', 'url(#volClipBody)');

      // snow-capped ranges, drawn IN FRONT of the volcano so it sits BEHIND them —
      // only its taller summit (and the plume) shows above the ridgeline.
      volc.parentNode.insertBefore(buildMountains(), volc.nextSibling);
    }

    var st = {
      wrap: wrap, svg: svg, stopped: false, volc: volc, onMeteor: o.onMeteor || null,
      bubbles: [], bubbleAnims: [], cloudAnims: []
    };

    // a SMALL countdown on the cone: hidden by default, it flashes for ~1s on
    // each volcano press showing how many clicks REMAIN (9 → 0) before the meteor
    // shower. Sits on the visible upper cone, scaled + moved with the volcano.
    if (volc) {
      var counter = document.createElementNS(SVGNS, 'text');
      counter.setAttribute('x', '625'); counter.setAttribute('y', '958');
      counter.setAttribute('text-anchor', 'middle');
      counter.setAttribute('font-family', 'system-ui,Arial,sans-serif');
      counter.setAttribute('font-size', '22'); counter.setAttribute('font-weight', '700');
      counter.setAttribute('fill', '#dfe6ff');
      counter.setAttribute('pointer-events', 'none');
      counter.style.opacity = '0';                       // hidden until a click
      counter.style.transition = 'opacity .3s ease';
      counter.textContent = String(METEOR_EVERY_CLICKS);
      volc.appendChild(counter);
      st.counter = counter;
    }

    // grow the plume: clone the single bubble N times into #bubbleGroup.
    // Parse as real SVG (image/svg+xml) so the nodes get the SVG namespace.
    var group = wrap.querySelector('#bubbleGroup');
    if (group) {
      var doc = new DOMParser().parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        new Array(N_BUBBLES + 1).join(BUBBLE) + '</svg>', 'image/svg+xml');
      var nodes = doc.querySelectorAll('.vbubble');
      for (var i = 0; i < nodes.length; i++) {
        var g = document.importNode(nodes[i], true);
        group.appendChild(g);
        st.bubbles.push(g);
      }
    }
    for (var j = 0; j < st.bubbles.length; j++) runBubble(st, st.bubbles[j], j, true);
    startClouds(st, svg);
    if (o.scene !== false) { buildStars(st, svg); buildGrass(st, svg); }

    // the volcano flares on its own every ~16-30s — a bigger lava burst + lightning
    (function scheduleErupt() {
      st.eruptTimer = setTimeout(function () {
        if (st.stopped) return;
        erupt(st);
        scheduleErupt();
      }, rnd(16000, 30000));
    })();
    // a meteor shower every 10 minutes on its own (also fires on every 5th click)
    st.meteorTimer = setInterval(function () { meteorShower(st); }, METEOR_EVERY_MS);

    INSTANCES.push(st);
    return {
      element: wrap,
      state: st,
      remove: function () {
        st.stopped = true;
        if (st.eruptTimer) clearTimeout(st.eruptTimer);
        if (st.meteorTimer) clearInterval(st.meteorTimer);
        if (st._counterT) clearTimeout(st._counterT);
        if (st._meteor && st._meteor.stop) { try { st._meteor.stop(); } catch (e) {} }
        var all = st.bubbleAnims.concat(st.cloudAnims);
        for (var k = 0; k < all.length; k++) { try { all[k].cancel(); } catch (e) {} }
        var ix = INSTANCES.indexOf(st); if (ix >= 0) INSTANCES.splice(ix, 1);
        if (wrap.parentNode) wrap.remove();
      }
    };
  }

  /* fire an eruption burst on the live instance(s) — handy for testing. */
  function trigger(name) {
    var n = 0;
    for (var i = 0; i < INSTANCES.length; i++) {
      if (!INSTANCES[i].stopped) { erupt(INSTANCES[i]); n++; }
    }
    return n;
  }

  global.Volcano = { place: place, trigger: trigger, markup: SVG_MARKUP, css: CSS };
})(typeof window !== 'undefined' ? window : this);
