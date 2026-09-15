# Backgrounds — structure & game-integration guide

This folder holds the game's swappable scene backdrops. Two kinds of files live here:

| Kind | Files | Status |
|---|---|---|
| **Game-ready module** (`<name>.bg.js`) | `space2.bg.js`, `unicorns3.bg.js`, `dubai3.bg.js`, `reef.bg.js`, `savanna.bg.js`, `dinosaurs3.bg.js`, `aurora.bg.js`, `maldives.bg.js` | Loaded by the game at runtime (`dubai.bg.js` is the legacy Dubai scene — nothing loads it; `frozen.bg.js` was REMOVED — `aurora.bg.js` serves the ❄️ theme now) |
| **Thin dev harness** (`<name>.html`) | `space2.html`, `unicorns3.html`, `dubai3.html`, `dubai2.html`, `dubai_skyline.html`, `underwater_happy_reef.html`, `reef2.html`, `dinosaurs3.html` | Dev-only; opens its `.bg.js` module directly in a browser (single source of truth) |
| **Reusable scene parts** (`dino_rigs/*.js`) | `rig-common.js` + `trex.js`, `bronto.js`, `stego.js`, `trike.js`, `ptero.js`, `baby.js` | The canvas dinosaur rigs, loaded on demand by `dinosaurs3.bg.js` (see the dino_rigs paragraph below). |
| **Unicorn valley** | `unicorns3.bg.js` + `unicorns/*.item.js` | `girls` → **`unicorns3`**: v2's canvas world + day cycle carrying v1's CSS unicorns (`unicorns/unicorn.item.js`), castle (`unicorns/castle.item.js`), particle waterfall (`unicorns/waterfall.item.js`), bunnies (`unicorns/bunny.item.js`) and rainbow look. The v1 and v2 modules were **deleted 2026-09** — see the history section below. |
| **Space v2** (`space2.bg.js` + `space2.html`) | `space2.bg.js`, `space2.html` | The space scene recreated around a general-relativistic, ray-traced black hole: a WebGL2 sky layer (adaptive quality, baked sky) under the 2-D world — Sun, a wandering Earth and Saturn, passing solar-system worlds, galaxies, comets, the supernova and every click reaction; still-painted sky without WebGL2. Theme `galaxy` → `space2`. **Full section below.** |
| **Standalone study** (`blackhole.html`) | `blackhole.html` | The physics study the space hole came from: a GR ray-traced black hole in one WebGL2 file, not wired into the game — drag to spin the hole, wheel to zoom, quality/bloom/jets/dust toggles. **Full section below.** |

**Loading veil for slow scenes** (`game/js/bg-loader.js`): most backgrounds
appear instantly, but space2 compiles its WebGL2 ray-tracer and bakes the sky
before the first frame — up to ~20 s on a weak machine — which used to leave the
stage black with no sign of life. A scene marked `slowLoad: true` on its module
(and listed in `SLOW_BGS`, which also covers the very first load, before the
module object exists) gets a veil inside the stage: a dark space gradient, a
spinner, "טוֹעֲנִים אֶת הֶחָלָל…", and after 4 s a second line. The loader paints
it BEFORE calling `init()` (init is synchronous and would otherwise block the
paint), re-hangs it after the scene wipes the stage, and keeps it until the
scene calls `window.BG_LOADING.done()` from its first rendered frame — with a
45 s safety timeout, and a clear on theme-switch/unload. The veil is
`pointer-events:none` and lives in `#stars-layer`, so the game card stays
visible and playable while the backdrop loads. Scenes that don't opt in show no
veil at all.

Theme → background mapping (`_BG_THEMES`, themes.js): `girls→unicorns3`,
`dubai→dubai3` (golden hour, built from zero in 2026-09; the two legacy Dubai scenes and their `_verify.js` logic harness were deleted once it shipped), `galaxy→space2` (the GR-black-hole scene; the legacy 2-D `space.bg.js` was removed in 2026-09 and space2 now paints its own still sky without WebGL2), `reef→reef2` (the 2026-09 rebuild; `reef.bg.js` is the legacy scene, unloaded), `dubai→dubai2` (the from-scratch redraw; `dubai` is the legacy scene), `savanna→savanna`, `dinosaurs→dinosaurs3`
(🏙️, 🦁 and 🦕 are their own themes in the menu). Canvas-scene themes spawn no
floating emoji particles. Note: a new theme also needs a `body.theme-<name>
#stars-layer {display:block}` rule in themes.css, or the stage stays hidden.

**savanna.bg.js — Pride Rock through a full DAY CYCLE.** Harness:
`savanna.html` (Morning/Noon/Afternoon/Night jump the clock, Pause, Fast ×20).
A whole day takes `DAY_SEC` = 240 s: MORNING (pink-violet dawn, sun rising
right of Pride Rock), NOON (blue sky, small white sun high up), AFTERNOON (the
golden sunset, big orange sun sinking right, warm-tinted animals), NIGHT (deep
blue, moon with craters, twinkling + shooting stars, fireflies, blue-tinted
animals). Each look is a keyframe (`LOOKS`); every colour is interpolated
across a 0.12-day window around each phase boundary and the sky + scenery
layers are repainted as the palette drifts (`repaintIfNeeded`). Sun and moon
travel real arcs (`sunP`/`moonP`), ground shadows lean away from the sun and
fade at night; the waterhole catches whichever is up. Clicking the SUN, the
MOON or the WATERHOLE (always reachable under the game panel) tweens the clock
to the next phase centre.

Animals are the `savanna_animals/` rigs (below), loaded on demand relative to
the module file (`needScript`; `preload()` warms them during the intro): the
resident PRIDE on Pride Rock (flush to the left edge, drawn behind the plain so
herds pass in front) — lion, lioness, medium lioness + cub with ribbons —
paces the ridge in staggered patrol ranges via the shared `ridgeY`; HERDS
(`KINDS`: zebra, ostrich, elephant, cheetah, giraffe, lionesses) cross the plain
in depth lanes, 2–5 strong with young, per-individual tints, up to two at once.
Acts on a schedule and on click (document listener + game-UI filter): the rig's
signature `pose` (roar / yawn / crouch / bray / graze / trumpet / head-bury), a
jump, the cheetah's tail-chase spin, and (rarer, ~1/3 as often) the FART — an
embarrassed shimmy with soft green puffs drifting off the rear (`vent` per
kind); the lion's roar fires shockwave rings + a screen shake, the elephant's
trumpet sound rings; ❤️ when two pride members meet face to face. Animals are
drawn on their own layer and tinted with the hour (`source-atop`). Ambient:
drifting clouds (dimmed at night), bird flocks by day, golden dust motes at
sunset, swaying foreground grass, and "rumi" strolling the plain every 2–4 min
(first after 1–3 min; her own overlay layer, stopped by `cleanup()`). `window._sav2` exposes tod/setTod/setSpeed/
phase/pride/herd/spawn/act for the harness and tests. Skin:
`game/skins/savanna.skin.css`. Aids: `savanna` (cheetah number-line rider +
amber fruit jar).

**rumi/ — the roaming chibi character "rumi".** One module, `rumi/chibi-walker.js`
(global `ChibiWalker`), holds the SVG art AND the behaviour: the July-2026 chibi
design (purple bubble-ponytail + swirled updo, purple-iris eyes, yellow bomber
jacket with patches over a white tee + pendant, baggy purple pants, white
sneakers with pink soles), a CSS walk (arm swing + leg step, bob, ground
shadow), blink, floating hearts, click → zap / jump / fly-out, and the reef's FLY
("swim") mode (rotated 90°, arm raised, ripples). API: `ChibiWalker.walk /
patrol / trigger`. Design source + preview: `rumi/rumi.html` (the same figure,
documented; mirror art edits into the module); sandboxes `rumi-test.html`,
`reef-test.html`, `walker-demo.html`. Used by savanna.bg.js (strolls the plain
every 2–4 min, first after 1–3 min), dinosaurs3.bg.js (strolls the valley every
2–4 min, first after ~45 s–2¼ min; `_dino3.rumi()` forces one) and reef.bg.js
(fly mode).

**savanna_animals/ — the from-scratch animal rigs used by savanna.bg.js.**
A new soft cartoon take on every savanna animal, each drawn on canvas in its
own file on top of `rig-common.js` (`window.SavRig`: gradients, `fluff` lobe
rings, round-jointed `leg`, big `eye`, `blink`, `shade` tints): `lion.js`
(LionRig — halo mane, roar), `cats.js` (LionessRig with `ribbon` for the young
ones + yawn, CheetahRig — tear stripes, spots, ringed tail, crouch), `zebra.js`
(bray), `giraffe.js` (graze), `elephant.js` (trumpet), `ostrich.js` (head-bury).
Shared API: `Rig.draw(ctx, L, t)` with `L = {x, y, s, dir, ph, wt, moving, pose,
tint}` in one unit space (paws on y = 0, facing +x; `pose` 0..1 plays the
signature action), plus `HEIGHT`/`WIDTH` in units. House style: body in
profile, head turned three-quarters so both eyes show, heavy brows, no
outlines, no spikes, sunset palette. Workshops: `animals.html` (one animal at
a time; tabs, Walk/Act/Flip/BG/Size, `?animal=zebra`), `parade.html` (all of
them side by side at one scale), `lion.html` (the lion alone). The scene
picks up rig changes directly.

The game side of the contract is `game/js/bg-loader.js` and `architecture.md` §3.1:

```js
window.BACKGROUNDS = window.BACKGROUNDS || {};
window.BACKGROUNDS.<name> = {
  skin: '<name>',                 // → game/skins/<name>.skin.css (the game's look)
  aids: '<name>' | 'classic',     // → aids/<name>.aids.js (number-line/jar art)
  init({ stage }) {               // stage = the game's #stars-layer element
    /* mount everything inside stage */
    return function cleanup() { /* stop rAF, remove listeners & DOM */ };
  },
};
```

`loadBackground('<name>')` injects `backgrounds/<name>.bg.js`, swaps the skin
`<link>`, loads the aid variant, and runs the previous background's `cleanup()`.
Themes map to backgrounds in `applyTheme` (`game/js/themes.js`).

---

## Porting checklist: standalone HTML → `.bg.js`

`savanna.bg.js` is the reference port — diff it against `savanna.html`'s harness
to see the seam. For each playground:

1. **Wrap the whole `<script>` body** in the module shape above. Everything that
   is global in the playground (`let CLOUDS…`, helper functions) moves inside
   `init`'s scope — the game loads several modules into one page, so top-level
   globals will collide.
2. **Create the canvas inside `stage`**, not on `document.body`:
   `stage.innerHTML=''` then `stage.appendChild(cv)`; keep
   `position:fixed;inset:0;width:100%;height:100%`.
3. **Move the click listener from the canvas to `document`** and filter out the
   game UI first (the game's form sits *above* the stage, so canvas clicks never
   fire). Copy the filter from `savanna.bg.js`:
   ```js
   if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#sad-ov,#report-ov'))return;
   ```
4. **Keep references to every listener** (`resize`, `click`) and remove them in
   `cleanup()`; guard the rAF loop with a `stopped` flag and cancel the pending
   frame.
5. **Drop the harness chrome** — the Pause/Restart `#toggle` button belongs to
   the standalone page, not the scene.
6. **Add `game/skins/<name>.skin.css`** (palette / fonts / glass / `.wrap`
   position — see §3.2 of `architecture.md` and the per-background "game column"
   notes below) and map a theme to `loadBackground('<name>')`.
7. **Keep a thin dev harness** (`<name>.html`) that just loads the module, like
   `savanna.html` — single source of truth, no copy-porting.

All scenes share the same internals, so the port is mechanical:
**static prerender** (offscreen canvas painted once per resize) + **dynamic
layer** (cheap per-frame draws) + **data arrays generated in an `init`/
`buildScene` step** + **envelope-driven actions** (smooth attack/decay factors,
never position jumps).

---

## dubai3.bg.js — Dubai at golden hour, built from zero (the 🏙️ theme, integrated)

Theme `dubai` → `dubai3` (`_BG_THEMES`). Harness `dubai3.html` (Golden / Blue
hour / Night, LED show, Fountain, Fireworks, Spin wheel, Heli, Plane, Dolphin,
Sail wash, Museum, Horn, Shooting star, Restart); verify with
`_verify_dubai3.py` (eight stills + restart + perf); skin
`game/skins/dubai.skin.css`; aids `dubai`. Built in 2026-09 with nothing shared
with the two older Dubai scenes, which were deleted once this one shipped.

**Stage.** Design space 1600×900, waterline `HZ = 790`, cover-fitted and
bottom-anchored (`S`, `OX`, `OY`; `toDesign()` for hit-tests). The sun sets low
LEFT of centre (`SUNX/SUNY = 520/782`), so every west face is warm and every
east face is cool blue — the one rule that makes the glass read as glass. The
game card sits centre (skin `max-width:700`), so the heroes stand at the sides
and the middle skyline is kept low.

**The hour** (`look(t)`, `DAY_PERIOD 260`): three keys — golden hour, blue
hour, night — blended with holds (`KEYS`; sky bands, glow, haze, warm/cool
light, glass tint, `lights`, `stars`, `sun`, water, `sunPath`); `L.night` is
the 0..1 darkness. The still city repaints per look-key (24 per cycle, ~11 s).

**The city, left → right.** `paintAlArab` — the BURJ AL ARAB on its island,
seen from the beach with the sea on the LEFT: the tapering silver MAST up the
seaward edge and past the top (red beacon, and the radar rings of the
interception alert leave from here), the white fabric WINGS warm on the sun
side, the blue GLASS CURTAIN WALL down the middle mirroring the dusk with a
sky sheen, floor lines that strengthen toward the foot, the ATRIUM FABRIC WALL
glowing through it (`atriumPath`, drawn LIVE in `drawAlArabLive` so a click
recolours it and the whole sail flares — and it pulses RED while the alert is
up), the white X-BRACED exoskeleton along the billowing trailing edge with its
rim light and the leading-edge seam, the HELIPAD on its cantilevered arm to
the sea (green edge light, and the helicopter lands on it), AL MUNTAHA
cantilevered landward, the island with its lit sea wall and the causeway on
piers to the shore; `paintJBH` — the breaking-wave
Jumeirah Beach Hotel beside it; the Marina cluster (`tower()` entries) with
AIN DUBAI (`paintAinStatic` legs + podium + Bluewaters, the wheel itself is
live) in front on the water; downtown middle low: the Emirates Towers (`crown:
'twin'`), the MUSEUM OF THE FUTURE (`paintMuseum` — a real hole cut with an
even-odd fill, calligraphy ribbons clipped to the ring); the BURJ KHALIFA; at
its feet the Address towers, the Sky View pair + bridge, the Dubai Mall front,
the FOUNTAIN LAKE (`LAKE`, a dark mirror with rim lamps); the golden DUBAI
FRAME far right (`paintFrame`); the promenade, SZR road and palms
(`paintShore`, `paintPalm`, none on the sail's water or over the lake); two
hazy far layers (`paintFar`); horizon haze over everything far.

**The Burj Khalifa** (`BURJ`, `buildBurj`, `paintLobe`, `paintBurj`,
`burjBody`/`burjSpire`/`burjPath`). Drawn the way the real one is built: the
Y-plan's three wings end in ROUND noses, so from the lake the tower is a bundle
of slender cylinders stepping up toward the core in a spiral. `BURJ.lobes` —
nine west lobes and nine east lobes as `[left edge, width, height]` (the east
steps lower, so the setbacks spiral) plus the 14-px core to 545 — painted in
height order so each taller inner lobe stands in front of the one outside it.
`paintLobe` shades each as a cylinder lit from the west (highlight at 22%,
dark far edge, a sky-coloured rim) with a flat lit terrace cap, a warm line
under its lip and a shadow beneath. Clipped to the union: the glass MIRRORS THE
SKY (blue up high, the sunset glow toward the horizon), floor bands every
3.4 px with a heavier one each mechanical floor, a hair of light down each nose
(the vertical fins), haze at the foot, and lit windows (`BURJ.wins`, fixed to
lobes) as it darkens. The core steps into the mast: six cylinders `BURJ.spire`
of falling width with their own caps and bands, then the needle; three red
beacons. A lit podium (the mall/hotel base) sits at its feet. The first cut was
a single stepped silhouette with one gradient — it read as a flat pine tree;
the round-nosed bundle is what makes it the Burj.

**Generic towers** (`paintTower`): two faces (lit west, shaded east return),
glass sheen, floor spandrels (`floor` per tower), mullions, a window grid whose
density follows `L.lights` (`winCool` biases a tower blue), a podium with
shopfronts, crowns `flat | spire | crown | slant | twin`, eight glass palettes
(`pal`). Each records its roof beacon (`_beacon`).

**Water** (`paintWater` + `buildRefl`): the deep gradient in the city layer;
the mirror is a ½-res layer rebuilt with each repaint — the finished city
sliced 3 px at a time and re-drawn below the waterline with a per-slice
horizontal wobble and depth fade (`0.72·(1−k·0.75)`), then the sun's path,
clipped to a fan with soft sides and a depth fade.

**Living** (`drawLiving`, design coords): scheduled BURJ LED SHOW (`startShow`
— bands racing up the tower in the show's palette, shimmer cells, a white
finale pulse with rings leaving the spire, its light on the lake; every 150 s
for 16 s), the FOUNTAIN (`startFountain` — 17 lit jets in three choreographies:
a wave from the centre, a chase, a breathing crown; every 180 s for 24 s),
FIREWORKS (`fireworks()` — rocket rise, 64-spark bursts under gravity with
twinkle-out, their light on the water; five every 120 s), AIN DUBAI turning
with a colour-cycling rim and 48 lit capsules (`spinWheel` → 5-s spin-up with
a rainbow rim), the fleet (`BOATS` — dhow with a lateen sail, yacht, abra,
speedboat; wakes, nav lights, their smear on the water; `blinkUntil` horn),
the A380 (`PLANE`, contrail, port/starboard/strobe), the helicopter to the Al
Arab helipad (`HELI`: in, hover, land, wait, away), THE INTERCEPTION SHOW
(below), dusk birds (two flocks,
fade with night), night shooting stars, 44 SZR cars (white toward, red away),
sun glints on the water at golden hour, 40 twinkling stars, roof and spire
beacons, Burj windows switching, the sail's live wash, museum rings
(`museumRing`), dolphins (`dolphin(t, x)` — arc + splash), tower boosts.

**Clicks** (`onClick`, design coords, UI filter `UI_SEL`): the Burj → LED show
(70%) or fireworks; a boat → horn-blink; the wheel → spin-up; the left sky → the drone show;
the UFO → it drops its catch and bolts; an incoming rocket → it is destroyed early; the Burj Al Arab → a new sail colour AND it scrambles
the interception show; the Museum → a colour ring; the lake → the fountain;
any tower → its windows flare for 5 s; open water → a dolphin; the upper sky
→ a firework at the click.

**The UFO** (`UFO`, `startUfo`, `updateUfo`, `drawUfo`, `ufoRelease`). A
saucer — dark hull, lit rim, a glass dome, nine rim lights chasing round it,
a soft underglow and a slow wobble — slides in from one side, picks a BOAT in
the open middle water (deliberately clear of both heroes: the sail on the left
and the Burj Khalifa on the right) or the HELICOPTER if one is flying, hangs
above it, and opens a TRACTOR BEAM: a cone of coloured light with bands
travelling down it, dust motes drawn UP it, and a pool of light where it lands
on the water. Its catch rises spinning and tilting into the hull, there is a
white flash as it is swallowed, and the saucer shoots off; the boat sails back
in from the edge a while later, the helicopter returns on its next run. States
`arrive → open → lift → gulp → leave`, every ~2–2.5 min. CLICK IT and it drops
everything and bolts (`flee`). Test hook `ufo()`, or `ufo('heli')` / `ufo('boat')`
to force the target.

**Everything else moves too.** What is baked into the still city cannot move,
so each remaining element is animated as an overlay drawn over it: `drawPalms`
(the palms left the static layer — trunks bend to a shared `wind(t)` gust and
every frond trails on its own lag), `drawWinLife` (a cell per ~26 px of every
tower switching on and off on its own slow phase, warm or cool), `drawFarLife`
(16 red aircraft beacons blinking out of step on the far skyline), `drawDrift`
(four cirrus drifting on the high wind), `drawFrameLive` (a light running up
one leg of the Dubai Frame, across the bridge and down the other, the glass
bridge breathing), `drawMuseumLive` (light flowing along the Museum's
calligraphy ribbons, the void's rim breathing), `drawShoreLife` (rings
crossing the fountain lake, every promenade lamp flickering on its own),
`drawSailLife` (the Burj Al Arab's exoskeleton lighting up rung by rung after
dark, the JBH's windows twinkling). Together they cost about 0.5 ms a frame.

**The sun and the moon ride the hour** (`sunAt(ph)`, `moonAt(ph)`,
`drawSunMoon`). They are drawn LIVE, between the sky blit and the city blit —
not into the still layer. That layer is rebuilt only on a look-key change, 24
times a cycle, so painting them there made both TELEPORT every ~11 s; live they
glide a few pixels a frame and still pass behind the skyline. The still layer is
split in two for it (`skyL` the sky alone, `cityL` the city over a transparent
sky) and the water mirror is built from a scratch composite of the two
(`mirL`, once per repaint). The sun's broad glow travels with it; the crescent
is baked once (`moonSprite`) since it is now drawn every frame. Both are
placed on an arc from the day phase instead of being pinned: the sun starts
high right of centre (a ROUND disc — it only squashes by refraction in the
last 90 px above the waterline, and its halo shares that aspect), sinks left
through the golden hour, drops below the
waterline for the night and climbs back; the moon runs the opposite way, rising
as the sun sets. Everything keyed on the sun follows it — its glow, the disc
(which flattens and reddens as it meets the haze), the path on the water and
the glints.

**New-year fireworks on the Burj** (`NY`, `startNY`, `nyFire`, `drawNY`). The
real show does not launch from the ground: gold fires straight OUT OF THE
TOWER'S FLANKS at a dozen heights at once. Fifteen heights × both sides, each
emitter placed on the tower's own silhouette (`burjHalfWidthAt` walks
`BURJ.lobes` for the half-width at any height) and firing on its own ~1.2–2.3 s
beat for the whole 22 s, plus six shells over the spire. Each spark is drawn as
a STREAK along its own motion with a hot head — a field of dots reads as dust —
and every jet flashes at the mouth. A curtain pours down the facade. Watch the
range: an early cut threw sparks ~1000 design px sideways and they scattered
across the whole picture as a haze; they are short and fast-falling now.

**The drone show** (`DR`, `SHAPES`, `shapePoint`, `startDrones`, `drawDrones`).
44 drones climb out of the left horizon, form a STAR → HEART → PALM → RING and
morph between them, each easing to its own point with a drift so the figure
breathes, then fly away over the sea. Each is a REAL MACHINE, not a dot
(`drawDrone`): a body with skids, four arms in an X, four rotor discs blurred by
their own spin, a white strobe out of step with its neighbours, and the coloured
belly light that actually paints the figure — the swarm is 44 on a wider ring
rather than 64 on a tight one precisely so each one is big enough to read. Parked in the LEFT pocket of sky on
purpose: the game card sits in the middle, so a formation there would be hidden
behind it. Click that patch of sky to call it.

**The interception show** (`MIS`, `startMissiles`, `launchInterceptor`,
`popMissile`, `drawRocket`, `drawMissiles`, `shakeAmp`). A SALVO of one to
three rockets dives in from the right on grey smoke (drawn rockets — body,
nose cone, fins, a hot exhaust plume and a glowing nose — not emoji). As the
first crosses x≈1340 the Burj Al Arab's mast raises the ALERT: radar rings
expand from it for `ALERT_LEN` and the atrium wall pulses red. When a rocket
closes past x≈1020 an INTERCEPTOR leaves the mast in a white flash and a bloom
of smoke; it builds speed (90 → 460) and CURVES onto its target under a
turn-rate limit (3.4 rad/s), so it banks through a real pursuit curve instead
of tracking in a straight line — with a second rocket in the salvo the two
interceptors cross. Within 22 px it kills: a white flash over the whole
picture (0.22 s), a fireball, a DOUBLE shockwave (a fast warm ring and a
slower blue one), a 110-spark burst through `FW`, 14 pieces of burning debris
falling under gravity on their own smoke, ten smoke puffs that drift and thin
over 3.4 s, the burst's light on the water, and a SHAKE of the whole frame
(`shakeAmp`, a damped 0.6 s wobble applied to the city blit, the mirror blit
and the living transform together). A rocket that gets through and reaches the
waterline explodes there anyway. Runs every 3–4.5 min, on an Al Arab click,
and a click on a rocket destroys it early. The scene costs nothing while it is
idle (empty arrays).

**Performance** (house rules): backing store `pickDPR` (1.5× and ~2.4 MP);
the still city is ONE full-screen layer (`cityL`) repainted per look-key; the
mirror a ½-res layer (`reflL`); glows are sprites (`sprite()` / `glow()`);
per-frame gradients memoised (`lgc`/`rgc`, cleared on repaint); the rAF loop
paces itself (every 2nd display frame while frames run long, back after 6
quiet seconds; touch starts there). `_dubai3.perf()` → `{dpr, halfRate,
gapEma, costEma, frames, drawn, S}`; `prof()` → per-section ms (`city`,
`water`, `living`, `repaints`). Measured ~1.3 ms of script per frame with the
show, fountain and fireworks all running.

**Test hooks** `window._dubai3 = BACKGROUNDS.dubai3._test = { seek(ph),
look(), show(), fountain(), fireworks(), spin(), horn(), heli(), dolphin(),
wash(), missile(), ny(), drones(), ufo(kind?), museum(), plane(), shoot(), boats(), burj(),
lobes(), busy(), perf(),
prof(), profReset() }` — `seek` moves the clock AND pushes the schedules so a
seek doesn't fire every show at once.

---

## underwater_happy_reef.html — coral reef

Static prerender (`staticLayer`: water gradient, sun bloom, sand, coral garden
via the `paint*` family) + `vigLayer` vignette; everything alive is drawn per
frame between them. The coral garden is built from **rock bases** (`rockBase` —
lumpy boulders, varied colour/shape/height) topped with corals assembled from
**many polyps** (`polyp` corallites): `coralBoulder` (a dome packed with
hundreds of polyps), `coralFingers` (knobbly branching fingers, pale tips) and
`coralPolyPlate` (a disc of concentric polyp rings) — prototyped first in
`reef_coral_lab.html`. The good hand-drawn elements are kept: `paintStaghorn`
(white-tipped branches), `paintSeaFan`, `paintSponges`, kelp, sea stars and the
anemones. All garden corals are **clickable to release eggs** (their x's are in
`SPAWN.points`).

**Unified sea current** (`curX(t)`): one slowly-wandering horizontal value in
~[-1,1] (sign = direction, magnitude = strength, from three slow sines). Every
swaying thing — sediment `MOTES` (drift with it), `KELP`, `GRASS` and the
`ANEMONES` tentacle crowns — leans to this one current (current dominates, a
small per-element ripple on top), so the whole reef breathes with the same
water instead of jittering independently.

**Passing cloud shadow** (`CLOUDSHADE`, `updateCloudShade`/`drawCloudShade`):
every ~40–110 s a soft dark radial blob drifts across (entering off one side,
crossing in ~16–28 s), drawn just before the vignette so it dims **everything**
beneath the surface — the scene gently darkens and brightens as a cloud crosses
the sun overhead. Centred in the upper water column, fading outward and toward
the sand.

**On-screen fish are kept sparse** (~10 free-swimmers + jellies at a time): the
fusilier `SCHOOL` is a single tight shoal (leader + 8 followers), `SHOALS` spawns
2 small groups and `JELLIES` 2–3 bells.

**Fish cruise faster, at varied speeds:** each free-swimmer carries a random
**1.5×–3× speed multiplier** (`sp = 1.5 + Math.random()*1.5`) on its per-frame
travel — the shoals, fusilier school, puffer and butterflyfish pair. The `sp` is
**fixed for the whole pass across the screen** and only re-rolled when the fish
re-enters, so a fish keeps one steady speed entry-to-exit; the giant-flee burst
multiplies on top (the only time it speeds up mid-pass).

**Creatures & systems:** sun `RAYS`, sediment `MOTES`, seep `BUBBLES`, fusilier
`SCHOOL` (leader + 8 followers), `KELP`, `GRASS`, **two seahorses** (`SEAHORSE`
gold + `SEAHORSE2` pink) that **slowly roam the WHOLE screen, not just the
bottom** — each drifts horizontally and wanders up/down across the full height,
bouncing off the edges (`mkSeahorse` factory, `updateSeahorse`); horse-like head
with muzzle/brow/coronet, spiny back bumps, curled prehensile tail, body swaying
with `curX`; same rig drawn via `drawSeahorse(sh,t)`; **tap one for a startled
hop + turn** (`reactT0`),
two `ANEMONES` hosting six clownfish (`NEMOS`),
2 blacktip
`SHARKS`, fish **shoals** (`SHOALS`/`spawnShoal`: small same-species groups of
3–4 — clownfish OR tangs — plus the occasional mixed Nemo+Dory pair; tangs drawn
via the pure `drawTangBody`, clownfish via `drawClown`; Nemo and Dory no longer
travel paired), a bottlenose dolphin **pod** (`DOLPHS` + `POD`,
`spawnPod`/`updatePod`: 1–3 adults in an echelon plus a **baby dolphin** tucked
beside the lead, all travelling together and re-spawning when they cross off
screen), a drifting group of 2–3 pulsing `JELLIES` (translucent domed bells with
scalloped rims + trailing tentacles/oral arms, sharing one drift direction;
they **travel across and exit the screen, re-entering from the far side at a
fresh depth** like the other swimmers),
**5 `CRABS`** scuttling on the sand — **each a distinct species colour**
(red-brown, orange, purple, teal, sandy-yellow via per-crab `pal`; each on its
own patrol range, startle-scuttle on tap), a `PUFFER` that balloons every
~2 min, the butterflyfish couple `BUTTERS` (with heart), a treasure `CHEST`
that opens every ~2.5 min.

**Fish flee from passing giants** (`giantNear()` → `WHALE.active || ORCA.active`):
when a whale or killer whale crosses, the small swimmers (shoals, jellies,
fusilier school, puffer, butterflies) **dash for the edges and stay off-screen
until it leaves**, then return. The **bottom dwellers carry on as usual** (crabs,
sea stars, anemones, flatfish, seahorses).

**Coral spawning** (`SPAWN`, `updateCoralSpawn`/`drawCoralSpawn`): a rare
spectacle (every ~2.5–5 min) where the coral heads release clouds of tiny pale
egg bundles that drift up like reverse snow (wobbling with `curX`, fading as
they near the surface; particle count capped for performance). **Tapping a
coral head** releases a burst of that coral's eggs on demand (`spawnCoralBurst`).
`SPAWN.points` is now a list of `{x, y}` anchored to each coral's actual mount
point — including the **corals raised high on the bommies** (staghorn, sea fans,
tube sponges), so the click-band reaches up from the mount (`pt.y − H*0.16`) and
those raised corals are tappable too, not just the garden corals on the sand.

**Rain** (`RAIN`, `updateRain`/`drawRain`): an occasional shower (every
~1.5–3.5 min, lasting ~12–22 s) seen from below — expanding ring-ripple dimples
pock the surface line while a soft overcast tint dims the whole scene (intensity
ramps in/out).

**Cleaning station** (`CLEANSTATION`, `updateCleanStation`/`drawCleanStation`):
a tiny blue cleaner wrasse (`drawCleanerFish`, with a small eye) hovers over a coral head; **about once every 5 minutes**
(~285–315 s, both first and subsequent visits) a bigger "client" fish (`drawClient`, an **emperor angelfish** — קיסרון הדור —
a dirty fish) swims in and hovers while the cleaner fusses around its
head/flank; its **parasite spots are picked off one by one** (`cleanFrac`,
drawn in the fish's own body frame by `bodySpots`), and once spotless it gives
off a few **twinkle sparkles** (`FXSPARK`/`spawnSparkles`/`drawSparkleShape` —
a reusable 4-point glint), then it swims on. The client is randomly a **tang,
a dolphin, or a shark** (`cl.kind`) — each **reuses the real
`drawDory`/`drawDolphin`/`drawShark` art** (the same rigs as the free-swimming
reef creatures), drawn stationary at the station. The tang is built from the
Dory rig but **recoloured purple/orange** via `d.pal` (so it isn't mistaken for
a real blue Dory; `drawDory` defaults to the classic blue/yellow when no `pal`). A visit can also be **summoned by tapping the cleaner wrasse**
(`spawnCleanClient`). While a client is present a
little **signboard on a post reading "תַּחֲנַת נִיקּוּי"** (with nikud) fades in
beside the station (`cs.signF`, `drawCleanSign`), ringed with **chasing
carnival-marquee bulbs**.

**Poop system** (`updatePoop`): every fish goes once per ~3 min (staggered
starts); the strand trails from the vent, detaches, sinks and fades. State lives
on each fish object (`poopAt`, `poop`).

**Action system** (clicks + random schedule share one path):
- `fishTargets(t)` — every clickable fish with its *live* position and padded
  hit ellipse (`kind`: `shark/dory/buddy/dolphin/puffer/bfly/nemo/school`).
- `doFishAct(h,t)` — per-kind reaction, always with a bubble puff (`FXBUB`):
  sharks **dash** (`dashT`, ×4 speed envelope), tangs & dolphins **dash or
  barrel-roll** (`rollT`, one eased 360°) **or blow a bubble ring** (`FXRINGS`)
  that a curious little fish (`drawMiniFish`) swims right through, puffer
  **inflates on demand** (reuses `puffStart`), butterflies **emit hearts**
  (`FXHEARTS`), anemone clownfish **hide in the tentacles** (`hideT`), the
  school **scatters and regroups** (`scatterT` + per-member `kix/kiy`).
- **School boids parting** (`SCHOOL.avoid`): as the cursor passes near the
  school (`reefMove`, soft & brief) or it's tapped (`doFishAct` `'school'` case,
  firmer & longer), members near that point flow radially around it — the swarm
  opens a hole and **re-merges** as the push decays. (The shark-charge startle
  still uses the full `scatterSchool` burst.)
- **Bait ball** (`SCHOOL.ballF`): a *cruising* shark within ~0.55·min(W,H)
  makes the school tighten into a rotating defensive ball (each member orbits
  the centre, eased form/disperse); it loosens back into formation once the
  shark moves off. A *charging* shark instead trips the panic `scatterSchool`.
- Scheduler: every 4–12 s (`nextFishActAt`) a random fish acts on its own,
  and ~25% of the time it also poops.
- Click = nearest hit fish → its action only. **Pooping is never click-driven**
  — it happens only on the `updatePoop` timer and the random scheduler.
- **Click the crab** → a startled sideways scuttle (`CRAB.actT`): it hops, legs
  scrabble fast and claws raise, fleeing away from the tap.
- **Click a sea star** → an arm wiggle (`STARS`, `drawStars`, `st.actT`):
  travelling-wave arm flex + slight spin + scale pulse. (The two stars are now
  drawn dynamically instead of painted into the static layer.)
- **Click on the open sand** (no fish/chest/crab/star hit, below the sandline) →
  a camouflaged `FLATFISH` (sole) bolts out in a puff of disturbed sand (`FXSAND`,
  `spawnSandPuff`), hops a short distance and **re-buries somewhere else**
  (`startFlatfishDart`/`updateFlatfish`); it sits invisible-ish (alpha 0.5,
  sandy) at rest and turns brighter while darting so the motion reads. It also
  **relocates on its own every ~2–4 min** (`nextAuto`), not only on a click.
- **Tap a jellyfish** → it **flashes/blinks** white (`j.flashT`, a few quick
  blinks fading over ~0.8 s, brightening the bell + glow).
- Extra life: dolphins also **blow bubble rings** (`FXRINGS`) and **surface for
  a breath** every ~minute (arc to the top + white blow mist, `FXPUFF`); a
  *clicked* anemone clownfish **darts out of the anemone for a loop** (`outT`,
  the scheduler keeps the shy hide); a charging shark near the school
  **startles it into scattering**; the **treasure chest opens on click** too
  (`openChest`, shared with its schedule).
- Passing giants (`updateGiant` + `WHALE`/`ORCA`): a **blue whale ~20× the
  dolphin** glides past the surface **rarely, every ~3.7–5.7 min** — mottled back, a **soft
  gradient ventral belly** (feathered, no hard edge — no gray patch) with grooves
  clipped to the body (nothing pokes into the water), and a smooth **pointed
  tail-stock peduncle** + tucked dorsal-fin base so tail + fin read as connected. An **orca ~5×**
  cruises through every ~1.5–2.5 min — bright-white **wavy** belly, a lowered
  reverse-tilt **white eye patch** with a glossy detailed **real eye below it**
  (iris ring + catch-light), gray saddle, towering dorsal. Both drawn behind the
  reef life.
- Passing **boat** (`BOAT`, `updateBoat`/`drawBoat`): a brown **wooden hull**
  glides across the surface every ~70–160 s, seen from below — **solid
  alternating plank bands** (no see-through gaps), waterline glint, a soft shadow,
  a red-&-white **life ring** on the hull, an **anchor** dangling off the bow, and
  a **spinning propeller** at the stern (three blades rotating about a foreshortened
  axis + a blur disc, fed by a shaft, with bubbly prop-wash streaming aft); drawn
  behind the fish. The **whale and boat are mutually exclusive
  and on deliberately far-apart cadences** so they never share the surface: the
  boat won't start while the whale is up, and the whale's scheduler is gated on
  `BOAT.active` too (`updateGiant`'s `blockedBy`); whichever is blocked reschedules
  25–50 s out.

**Game integration notes:** fish cross the whole frame; the calmest region is
the open water **top-center** — good spot for the game column. Sand + corals
occupy the bottom ~15%. Skin direction: aqua glass, sandy-gold accents. The
`#toggle` pause button is harness-only (checklist §5). **Aids variant ready:**
`aids/reef.aids.js` (dolphin number line + pearl treasure chest + coral
garden) — set `aids:'reef'` in the module.

---

## unicorn valley v1 + v2 — REMOVED (everything worth keeping is in unicorns3)

The 🦄 theme went through three scenes; only the third is still in the repo.

- **v1** — a DOM/CSS valley (`unicorns.bg.js` + `unicorns/meadow.scene.js`,
  harness `unicorns.html`, workshop `unicorns/meadow.html`). Its FIGURES were
  the best part, and were lifted out into standalone items before it went.
- **v2** — a from-scratch canvas valley with the full day cycle
  (`unicorns2.bg.js`, harness `unicorns2.html`, `_verify_unicorns2.py`). Its
  WORLD was the best part; `unicorns3.bg.js` was derived from its code.
- **v3** — `unicorns3.bg.js`, the live scene: v2's world carrying v1's
  figures. Its own section is next.

Both older modules were **deleted in 2026-09**, once v3 replaced them in the
game and nothing loaded them any more. What outlived them, and where it is:

| what | where it lives now |
|---|---|
| the galloping CSS unicorns (five coats, roam/patrol/glide, click magic) | `unicorns/unicorn.item.js` — workshop `unicorn.html`, regenerated by `_build_unicorn_item.py` |
| the enchanted CSS castle | `unicorns/castle.item.js` — art workshop `castle.html` |
| the particle waterfall (`WaterfallFX`, aqua + rainbow water) | `unicorns/waterfall.item.js` — art workshop `waterfall.html` |
| the hopping bunnies | `unicorns/bunny.item.js` — workshop `bunny.html` |
| the day cycle, scenery, rainbow look and all the click magic | `unicorns3.bg.js` itself |
| the fairy | `unicorns/fairy.item.js` — workshop `fairy.item.html`; **not** mounted by v3 |

Both scenes' own code is in git history if any of it is ever wanted back.

---

## unicorns3.bg.js — Unicorn Valley v3 (the 🦄 theme, integrated)

Theme `girls` → `unicorns3` (`_BG_THEMES`). **The best of v1 and v2 in one
module:** the canvas WORLD of `unicorns2.bg.js` — the full DAY CYCLE (dawn /
day / sunset / night with stars, aurora, fireflies, the moon), lilac
snow-capped ranges, the rainbow, the cliff + waterfall + pond, rolling flower
meadows, clouds, petals, sparkles, butterflies, Rumi's stroll, and every click
effect (fireworks, fish, blooms, glitter, rainbow shimmer, sun / moon /
waterfall → next hour) — carrying the ORIGINAL scene's figures as DOM layers
above the canvas:

- **The unicorns** are v1's CSS galloping rainbow rig
  (`unicorns/unicorn.item.js`, `window.Unicorn.place`): four gallop runners
  (pink / sky / mint / night coats), one winged sky flyer and one calm pearl
  walker, roaming with the item's come-and-go `roam()` (runners 3–13 % up
  from the bottom, the walker 4–11 %, the flyer 8–28 % down from the top) under
  a shared on-stage gate (2 at once on desktop, 1 on touch). Clicking one runs
  the workshop's magic (lightning, coat change, hearts / rainbow / star shower,
  every few clicks a rainbow toot); the flyer also somersaults. The click-fx
  layer (`window.__ucFxRoot`) is the scene's actor layer, so it rides behind
  the game card.
- **The castle** is v1's enchanted CSS castle, extracted from
  the (now removed) `meadow.scene.js` into `unicorns/castle.item.js` (`window.Castle.place`;
  CSS re-namespaced `.uc-castle`, keyframes `uc-castle-*`, its windows keep
  their warm flicker and the flags their wave). Its ground line is pinned to
  the canvas castle hill (0.86 W / 0.63 H) and it scales with the window;
  clicking its box fires the canvas fireworks + flare.
- **The waterfall's water** is v1's particle falls (`WaterfallFX`, extracted
  verbatim into `unicorns/waterfall.item.js`): a DOM stage sized to the v2
  `FALL` rect sits under the unicorns in the actor layer (so it dims with the
  hour), aqua by default; clicking the falls runs RAINBOW water for 7 s
  (`rainbowFall`) *and* still fast-forwards the day. The canvas keeps only the
  lip, the mist and the pond ripples.
- **The bunnies** are v1's two hopping rabbits (`unicorns/bunny.item.js`,
  sizes 8 and 6, roaming the front meadow 3–8 % up in parabolic hops); a click
  startles them (`bunnyAt` → `startle()`).
- **The rainbow** wears v1's look again: six thin translucent bands with gaps
  (the meadow's exact colours/alphas at 57.5–87.5 % of `RB.r / 0.89`), blurred
  ≈ .45 vmin and breathing (.78 → 1 over 6 s), painted once per look into a
  half-res layer (`paintRainbow`) and drawn every frame — still behind the
  mountains, still a faint moonbow at night. The click shine flares the whole
  arc brighter while the white sweep and star pops run along it.
- **Small improvements to the unicorns without replacing them:** the canvas
  paints a soft **ground shadow** under each roaming unicorn from its position
  (leaning away from the sun, fading at night), and both actors and castle
  **dim with the hour** (`tintActors`: a brightness/saturation filter on each
  actor from the look's `daylight`, `Castle.setNight`). The rig itself (blink,
  mane wave, horn glow, stardust) is untouched. (The after-dark moonlit rim
  glow of the first cut was a `drop-shadow` on the whole actor layer and went
  in the performance pass below.)

**Performance pass (2026-09).** The scene ran with high latency next to the
game's blurred glass card, and headless frame gaps cannot show why (headless
Chrome is capped at ~32 fps for every theme), so the pass was measured with
Chrome's main-thread metrics (script / style / layout / task ms per second via
CDP `Performance.getMetrics`; the probe pattern is in `_verify_unicorns3.py`'s
sibling scripts of that session). Findings and fixes, biggest first:

- **DOM actors, not the canvas, carried ~80 % of the main-thread time.** Each
  unicorn rig is ~100 elements under ~80 CSS animations, and `roam()` moved
  it by writing `left` every frame — a layout + repaint of the whole rig per
  frame per unicorn. `unicorn.item.js` now positions with a compositor-only
  `transform: translate(vw, px)` (bob included), `.uc-uni` carries
  `will-change: transform`, and exposes `inst.x/y` + `setX(pct)`; the host's
  `drawActorShadows` reads `inst.x` instead of `getBoundingClientRect` (a
  forced layout per unicorn per frame). Main-thread task time fell ~25 %.
- **No CSS filter on the full-screen layer, no drop-shadow anywhere.** The
  night tint was `brightness() saturate() drop-shadow()` on the actor layer —
  a filter over the whole viewport re-run every frame a rig animated, with a
  blur pass. It is now a plain colour filter on each small actor (rigs,
  bunnies, the waterfall stage), nothing at all by day. The castle's root
  `drop-shadow` (re-blurring the castle every frame its flags waved) became a
  static ground shadow painted into the canvas scenery layer, and its window
  flicker animates `opacity` over a static glow instead of the `filter`.
- **The transition repaint storm.** `repaintIfNeeded` keyed the sky + scenery
  repaint on 400 colour steps per 29 s dawn/sunset window — a full repaint of
  both layers (and the blurred rainbow) ~14× a second for half a minute, four
  times a day, and the scene starts inside one (tod .22). It is 24 steps now
  (a repaint every ~1.2 s, invisible).
- **Canvas backing store** capped at 1.5× DPR and ~2.4 MP (`pickDPR`,
  recomputed on resize) — four full-screen layers are composited per frame.
- **Adaptive pacing.** The rAF loop tracks the frame gap and its own render
  cost (EMAs); when frames run long (gap > 21 ms or cost > 7 ms) the canvas
  renders every 2nd display frame and returns to full rate after 6 quiet
  seconds; touch devices start at half rate. The DOM actors animate at
  display rate regardless. `_uni3.perf()` → `{dpr, halfRate, gapEma,
  costEma, repaints, frames, drawn}`; the harness clock shows the rate.

Built from the (now deleted) unicorns2 by a generator (the canvas cast, `paintCastle` and the
castle's live windows/flags were removed; the DOM layers, `setupUnicorns`, `setupBunnies`, `mountWaterfall`/`rainbowFall`, `paintRainbow`,
`unicornAt`/`uniReact`, `placeCastle`, `drawActorShadows`, `tintActors` were
added). Registers `BACKGROUNDS.unicorns3` with `skin:'unicorns'`,
`aids:'unicorns'`; `preload()` warms Rumi and the four items (unicorn, castle, waterfall, bunny). Harness:
`unicorns3.html` (Dawn/Day/Sunset/Night, Pause, Fast, Magic = scenery fx +
every on-stage unicorn's magic, Restart); verify via `_verify_unicorns3.py`
(in-game by default; set `STANDALONE` to the harness path for the scene alone;
four looks to `c:/tmp/unicorns3`). Test hooks: `window._uni3` —
`tod/setTod/setSpeed/phase`, `unicorns/onStage/magic(i)`, `bunnies`, `wf`, `castleEl`,
`fx.{rainbow,rainbowFall,castle,fish,bloom,glitter}`, `castle/pond/fall`, `rumiLayer`, `perf`.

---

## space2.bg.js — deep space around a ray-traced black hole (the 🌌 galaxy theme, integrated)

Theme `galaxy` → `space2` (`_BG_THEMES`). Harness `space2.html`; skin
`game/skins/space.skin.css`; aids `space` (rocket + stars). The legacy 2-D
`space.bg.js`/`space.html` were **removed in 2026-09** — this module is
self-contained and paints its own sky when WebGL2 is missing. Its file header
is the short version of everything below; the click reactions have their own
section right after this one.

**Two stacked canvases inside the stage.** BOTTOM (`glcv`) = WebGL2, rendered
at a *fraction* of the CSS resolution and upscaled by the browser: the sky and
the black hole. TOP (`cv`) = a transparent 2-D canvas at up to `DPR2`: the Sun,
Earth, Saturn, the passing worlds, stars, galaxies, comets, the infalling dust,
the discovery bubble and every click effect. All gameplay geometry lives in the
2-D layer's pixels, and the GL hole is *placed to match the old 2-D one
exactly* — centre `x = 0.90 W, y = 0.36 H`, shadow radius `0.075·min(W,H)`
(`BH`) — so the click targets, `bhPull` and `lensImage` survived the rewrite
untouched.

**The GR sky pass (`SCENE_FS`).** Every pixel fires a ray *backwards* through
Schwarzschild spacetime, integrated in the Binet form of the null geodesic
(`d²x/dλ² = −1.5·h²·x/r⁵`, `r_s = 1`) with an adaptive step
(`clamp(r·0.07, 0.025, 0.4)/|v|`) inside a marching sphere `R_BOUND = 15`; rays
that miss it get the analytic weak-field deflection *plus* its second-order term
(`1/b + 15π/32b²` — the first-order-only version left a visible seam ring at the
boundary). The shadow (`b = 3√3/2 r_s`), the photon ring, the Einstein ring and
the disk's arch over and under the hole all fall out of that integration.
On top of it:

- **Thin accretion disk**, `DISK_IN = 3` (the ISCO) to `DISK_OUT = 12`:
  Novikov–Thorne temperature profile → black-body colour (`T_PEAK = 9800`),
  relativistic Doppler beaming `D = 1/(γ(1−β cosθ))` and gravitational redshift
  `√(1−1/r)`, two glowing trailing spiral arms riding Keplerian-sheared
  turbulent filaments (periodic value noise, period 16, two-phase bounded-shear
  advection so it never smears into moiré). Semi-transparent, so the far side's
  lensed image stacks through the near side.
- **Twin relativistic jets** along the spin axis (`JET_GAIN = 0.5`): a hot spine
  in a wider sheath with a helical twist and outward-streaming knots,
  bulk-Doppler boosted (`β_j = 0.62`) so the near jet outshines the counter-jet.
  Integrated volumetrically along the *same* geodesics inside the sphere and
  along the straight ray outside it (`jetStraight`).
- **The halo** (`haloEmission`, `HALO_GAIN = 0.11`): a hot plasma shell just
  outside the shadow (r ≈ 2.95, σ ≈ 0.55) whose light piles up along the
  geodesics into an uneven photon ring. This is what softens the shadow's
  boundary so the inner circle no longer reads as a hard-edged disc — the
  effect asked for in place of the old scene's flat glow ring.
- **A radial pre-filter at the critical curve** (`traceUV` + the `b > 2.42 && b < 3.5`
  branch in `main`). Near the critical curve `b = 3√3/2 r_s` the lensing
  magnification *diverges*: the photon ring is a band far narrower than a pixel
  carrying enormous brightness, so one sample per pixel renders it as a **dotted
  chain of beads** — only the pixels whose centre happens to land on the band
  light up. That is the "pixelated at some angles" artefact: which stretch of the
  ring is bright moves as the hole precesses, so the beading comes and goes with
  the orientation, and **no amount of resolution fixes it** (it is an infinitely
  thin feature). Pre-filtering does: pixels whose *own* impact parameter is near
  critical are box-filtered **radially** — the direction the ring's brightness
  varies fastest — with 3 marches (2 on `lite` tiers). The gate is computed from
  the pixel's ray, so it holds at any zoom, and the box filter preserves the
  ring's total energy (measured: beading down 45 %, ring peak brightness
  unchanged) for ~2 % of the frame's pixels — +14 % frame time measured on the
  software renderer at the lowest tier, less on a real GPU.
- **Off-axis camera**: `uv = (frag − uHolePx)/RH·2`,
  `camD = 2.598·H/(2·TAN_HALF·BH.r)` with `TAN_HALF = 0.25`, i.e. the camera
  distance is *solved* from where the 2-D scene wants the shadow.

**The hole precesses; the camera and the sky do not.** Orientation is a 3×3
column-major matrix (`M3.ident/mul/transpose/apply/axis`) built each frame as
`Rh2w = Ry(φ)·Ruser·Ry(−φ)` with `φ += SPIN_RATE·dt` (`SPIN_RATE = 0.16` rad/s)
and `HOLE_TILT = 0.25` — the axis leans toward the camera and walks round a
cone, like a spinning top. The shader gets both directions (`uHoleRot` =
world→hole, `uHoleRotT` = hole→world); the camera stays at a fixed elevation
`CAM_EL = 0.28`. Because *only* the matrix changes, the star field and the Milky
Way stay nailed in place while disk, jets and dust swing around.

**Cost control** — this scene used to be the heaviest thing in the folder, and
on slow devices it simply did not keep up. What it does now:

| tier | GL scale | steps | `lite` | 2-D DPR cap |
|---|---|---|---|---|
| `potato` | 0.28× | 90 | on | 1.0 |
| `low` | 0.48× | 130 | on | 1.25 |
| `medium` | 0.72× | 220 | off | 1.5 |
| `high` | 1.0× | 300 | off | 2.0 |

`scale` **is** how pixelated the hole looks — the GL canvas is CSS-upscaled — so
`potato` is the last-resort floor and everything above it sits a notch higher
than it first did (0.42× read as blocky). `AUTO_QUALITY` (on) starts at the
highest tier that fits the pixel budget (`startTier()`, `medium` at most — see
the bullets below) and adapts on an EMA of the frame time (`emaMs`): above 27 ms → down a
tier; below **19 ms** → up, but only ≥45 s after the last downshift and ≥6 s
after any change, and never back into a tier that has already stalled twice
(`qFails`/`qCeil`). Every change rebuilds the targets, re-caps the 2-D canvas
(`apply2DScale`) and re-bakes the sky.

> **Why 19 ms and not 11.** `requestAnimationFrame` is vsync-locked: a frame
> with plenty of GPU headroom still measures ~16.7 ms on a 60 Hz screen, so the
> original "climb below 11 ms" gate was **unreachable there** and the scene sat
> at its starting tier forever, however fast the GPU was — which is exactly what
> made the hole look permanently low-res. Holding the refresh interval is the
> climb signal; a GPU that *can't* hold 60 Hz quantises to ~33 ms, well past the
> 27 ms downshift, so the two rules don't overlap.

Where the cost went:

- **The sky is baked.** The procedural sky (~60 hashes + three black-body curves
  per pixel) was the single biggest cost, and neither the camera nor the sky
  ever moves — so `bakeSky`/`SKYBAKE_FS` render it **once per layout/tier** into
  `T.sky`, covering the frustum plus a margin (`M = 0.7` in tan-plane units) for
  rays bent in from outside the frame, and `skyLookup` just samples it. No bake
  yet → each lookup falls back to the procedural path, so a frame is never wrong,
  only slower. That margin makes the baked area ~2.4× the frame, which makes this
  one pass the heaviest thing at **load** (and on every tier change), so its
  density is `SKY_DENS = 0.85` texels per internal pixel — below 1:1 on purpose,
  since the result is upscaled anyway. `uPixAng` (the star-AA footprint) must
  track `SKY_DENS`.
- **`lite` tiers** cut `fbmDisk` to three octaves and halve the jet samples.
  They deliberately do **not** change *content* — see the star-field note below.
- **The GL layer ignores `devicePixelRatio` on purpose**: a retina screen must
  not quadruple the ray-marching work. Only the 2-D layer scales with the DPR,
  and the tier caps that too.
- **The 2-D layer does no full-screen blits at all**: the vignette moved into the
  GL composite, the constellations are drawn straight onto the canvas, and the
  Sun's granulation tile is filled only inside the Sun's cap.
- **The starting tier comes from a pixel budget, not from the tier list.** The
  work scales with the *window's* pixel count, so a fixed starting tier means a
  1080p or 4K window opens far heavier than a 720p one: `startTier()` walks down
  from `medium` until `W·H·scale² ≤ PX_START` (650 k marched pixels), and
  `buildTargets` additionally clamps any tier to `PX_MAX` (1.6 M) so even a
  climbed-to `high` on a huge window can't ask for absurd work. Opening at a tier
  the device can actually hold is what stops the first seconds being slow.
- **A quality change must never change *content*.** The GL sky's star layers used
  to be skipped on `lite` tiers. On load that read as a bug: the scene opened at
  a tier the device couldn't hold, showed a swarm of blurry upscaled star dots
  for several seconds, then **popped them all away** when it downshifted. The
  star field is now tier-independent and sparser (two layers instead of three —
  the dense `N = 190` speckle layer is gone; it was mush at any scale below 1×),
  so a tier change alters sharpness only. Measured across a medium → potato
  change with the 2-D layer hidden: GL-sky mean luminance 35.96 → 36.04 and
  stddev 20.36 → 20.40, i.e. the same sky, only softer. The bright stars were
  always the 2-D layer's job; these exist so the field streaks around the hole.

**HDR path.** RGBA16F targets when `EXT_color_buffer_float` allows, else 8-bit
with a sqrt encode/decode (`ENC = 0.125`) so the bloom doesn't band. Then a
three-level bloom, ACES tonemap (exposure 1.2, bloom 0.55) and the old scene's
dark gradient + four nebulae as a screen-space backdrop.

**The infalling dust — simulated in 3-D, drawn in 2-D.** `NP = 260` grains live
in the *hole's* frame under a Paczyński–Wiita pseudo-potential
(`a = −0.5/(r−1)²/r`, `TS = 5`, `DRAG = 0.028`), so anything wandering inside
~3 r_s plunges; they are spawned all over the frame (`spawnGrain`, re-spawned at
the edges when they cross the horizon or drift out) and sub-stepped 6×/3× when
close in. `lensProjectJS` — a JS port of the old vertex shader — maps a grain
through the point-mass lens: behind the hole its image is pushed out to the
Einstein radius and hidden inside the shadow, in front it is seen against it.
`drawDust2D` then paints them on the **full-resolution 2-D canvas**: a hard
pixel (a small disc when big), a short motion streak behind the head — long
enough on the far, slow grains to read as motion rather than a star — and a
tight glow on the hottest embers, coloured cool blue-white → ember → white-hot.
They used to be instanced GL quads in the low-res layer, where the upscale
turned every grain into an unfocused blob; there were 600 of them then.
Clicking the hole runs `dustSurge` (every grain yanked inward, drag ×10).

**The 2-D world.** Rebuilt bodies:

- **Earth** (`drawEarth`) — an orthographic globe: `globeProject`/`globePath`
  map the `CONTINENTS` lon/lat outlines onto the sphere (back-side vertices
  pinned to the limb), plus deserts and ice, streaky clouds, a Rayleigh rim, the
  terminator with city lights and an aurora. Orbiters: the Moon and two
  mini-satellites (`drawEarthOrbiters`, drawn behind and in front).
- **Saturn** (`drawPlanet`) — an oblate banded gas giant with a structured ring
  system (`ringProfile`: C · B · Cassini · A · F, `RING_IN = 1.24`,
  `RING_OUT = 2.32`), the planet's shadow on the rings and the rings' shadow on
  the planet (a clipped far half-annulus + a soft ellipse — the earlier
  `source-atop` version left a translucent black square travelling with the
  planet), orbiting gravel and two drifting storm ovals.
- **The Sun** (`drawSun`) — an enormous disc parked below the frame, only its
  limb showing: limb darkening, a boiling granulation tile (`makeGranulation`,
  multiplied inside the cap only), sunspots, a red chromosphere, spicules,
  prominence loops, corona streamers and scheduled limb flares.
- **Passing worlds** (`spawnPasser`/`updatePassers`/`drawPasser`) — Mercury,
  Venus, Mars, Jupiter + its four moons, Uranus with rings, Neptune, Pluto and
  an asteroid, drifting across in a shuffled cycle. Each is a procedurally
  painted 256×128 surface map (`makeWorldTexture`) wrapped onto an orthographic
  sphere by 36 longitude strips (`drawTexturedSphere`), rotating and Sun-lit with
  limb darkening. They **enter from the left** on lanes clear of the hole, whose
  gravity visibly bends their path (a visual bump, not a real kick) without ever
  capturing them, and they carry Hebrew facts.
- **Wanderers** (`planPath`/`updateMover`) — Saturn and Earth do not sit still:
  each drifts along a slow curved path, leaves by the left/top/bottom edge,
  waits, and comes back in from another edge, never near the hole. Only the Sun
  and the hole are fixed.
- Plus the sparse twinkling stars (pulled and lensed by `bhPull`/`lensImage`),
  spiral galaxies, comets, travellers, constellations, tidal streaks, the
  scheduled supernova (`buildNova`/`drawNova`) and the doomed astronaut.

**No WebGL2** → `paintStillSky()` paints one still sky per layout onto the same
bottom canvas (the composite shader's gradient and its four nebulae in 2-D, a
soft Milky Way band on the shader's −0.5 rad diagonal, and a plain hole: shadow,
photon ring, tilted disk glow) while the whole 2-D world above keeps running.
The theme never goes dark, and no second module is needed. Since the dust is
pure 2-D now, the fallback gets the swirling grains for free (the frame keeps
turning the hole's frame so they still precess). Watch the paint ORDER there:
a canvas radial gradient starting at `r0 = R` also fills its whole *interior*
with the inner stop, so the halo must be painted **before** the black shadow
disc — painted after, it washed the shadow khaki.

**Test hooks** — `window._space2`: `bh`, `gl` (`hdr`, `lost`, `nogl`, `rw/rh`,
`camD`, `quality`, `emaMs`, `phi`), `dust` (the raw `PS` array), `passers`,
`passStats`, `movers`, `simulateMovers(sec)` (fast-forwards the wanderers and
reports how close they came to the hole — it must stay 0 swallowed),
`spawnAll()`, `simulate(sec)`.

---

## The deep-space click reactions (now owned by `space2.bg.js`)

> The original 2-D `space.bg.js` + `space.html` were **removed in 2026-09** —
> `space2.bg.js` (the section above) is the only space module
> and it inherited the 2-D world, the discovery bubble and every click
> reaction below, so this section still applies to the live scene. Scene
> inventory and the bubble are documented in `space2.bg.js`'s file header.

**Click reactions** (added on top of the fact bubble — both happen together):
- **Black hole** → 3.5 s feeding frenzy (`bhFrenzyT`): disk ×3 spin, photon
  ring + glow flare, infall dives, jets thicken.
- **Galaxy** → 3 s spin-up + brighter core (`g.boostT`; extra angle accumulates
  in `g.x2`, so rotation never jumps).
- **Moon / satellite** → one quick extra orbit lap (`o.lapT0`, 2.2 s); the lap
  is exactly `TAU`, so the orbit schedule stays continuous.
- **Earth / aurora** → 3 s spin-up (extra longitude accumulates in `EARTH.x2`),
  aurora surge, city lights flare and grow, and **all three orbiters** do a lap.
- **Saturn** → ring-gravel rush + brighter rings, ring-tilt wobble, a golden
  excitement glow, and a visible spin-up: two storm ovals ride the cloud bands
  (slow drift always, racing during the boost via `PLANET.x2`).
- **A bright star** (no fact target hit) → a **full supernova**, ported from
  `success_screens/success-supernova.js`: collapse phase (infall streaks, the
  core charges and swells), then the blast — soft flash, two chasing
  shockwaves, expanding nebula blobs, ejecta dots + energy streaks, stardust
  igniting as the shock passes, and a twinkling pulsar remnant (5 s total,
  built per-event by `buildNova`; the scheduled nova uses the same effect).
- **Bare sky** → 6-meteor burst radiating from the click (repurposes
  `TRAVELERS`).

The fact bubble auto-places itself *outside* the clicked object's animation
radius (orbiters clear the whole orbit) so it never covers the show.

Envelope helpers shared by these: `clickEnv(t0,t,dur)` (fast attack, slow
release) and `lapExtra(o,t)`.

---

## blackhole.html — the GR black-hole study (standalone, not in the game)

One self-contained WebGL2 file: the physics the space scene's hole came from.
Nothing loads it — open it directly. `space2.bg.js` shares its shader library
(adapted for an off-axis camera, the hole's rotation, a placed Milky Way core
and the old scene's backdrop), so **fix the physics here and port it over**, or
change both.

What it adds over the in-game version:

- **A free camera.** DRAG spins the *hole* itself, trackball-style — disk, jets
  and dust tilt with it while the camera and the stars stay put (that was the
  point: the background must not move). Wheel/pinch zooms (`DEF.dist = 19` r_s,
  eased), SPACE toggles the auto-precession (`SPIN_RATE = 0.11` rad/s → one
  wobble in ~57 s), R resets. `DEF.tilt = 0.2` leans the axis toward the camera
  so the precession sweeps a cone; `CAM_EL = 0.28` is the camera's elevation
  above the hole's rest plane.
- **Higher quality tiers.** `QUALITY` = `low` (0.42×, 130 steps, lite) ·
  `medium` (0.62×, 200) · `high` (0.82×, 280) · `ultra` (1.0×, 400 steps).
  **Default is `high`** (`?q=` overrides). `?q=auto` adapts on the frame-time
  EMA the same way space2 does — down above 27 ms, up below 19 ms after a quiet
  45 s (see the vsync note in the space2 section) — but it never climbs past
  `high`; `ultra` is a deliberate choice.
- **More dust.** `NP = 1000` grains (vs 260), and here they *are* drawn in GL:
  velocity-stretched instanced streaks through the point-mass lens, inside the
  same HDR target, so they bloom. The full-resolution pass makes that look
  right; the in-game low-res pass did not, which is why space2 draws its grains
  on the 2-D layer instead.
- **The same everything else**: Binet-form geodesics, the analytic weak-field
  bend for rays that miss the marching sphere, the Novikov–Thorne disk with
  Doppler beaming + gravitational redshift and two trailing spiral arms,
  volumetric jets, the plasma halo (`HALO_GAIN = 0.11`), the baked procedural
  sky (`bakeSky`, once per resolution change), the radial pre-filter at the
  critical curve (same `traceUV`/`b`-gate code as space2 — keep the two in
  step), HDR → 3-level bloom → ACES, and the 8-bit sqrt-encoded fallback.
- **On-screen stats** (fps · internal resolution · steps · tier · HDR/8-bit) and
  toggles for quality, bloom, spin, dust and jets. The fps figure uses the
  *unclamped* delta, so it reports the truth on a slow machine.

URL params: `?q=auto|low|medium|high|ultra` · `?spin=0` · `?bloom=0` ·
`?dust=0` · `?jets=0` · `?dist=` (r_s) · `?tilt=` (rad) · `?ldr=1` (force the
8-bit path). Test hook: `window.BLACKHOLE` → `view` (`dist`, `phi`, `R`),
`quality`, `hdr`, `fps`, `dust`, `options`.

> Headless verification note: Playwright has no bundled browser on this machine
> — drive system Chrome with `--use-gl=angle --use-angle=swiftshader
> --enable-unsafe-swiftshader`. Software rendering runs at ~1 fps, so the frame
> times and the auto tier (it bottoms out at `potato`/`low`) mean nothing there;
> only the pixels do.

---

## dinosaurs3.bg.js — volcano valley at dusk (the 🦕 theme, integrated)

The 🦕 theme is served by **`dinosaurs3.bg.js`** — a canvas scene that draws
its own scenery and animates the from-scratch **`dino_rigs/`** (loaded on
demand by path-relative script injection, warmed during the intro splash via
`mod.preload()`). It replaced the old `dinosaurs2.bg.js` (SVG/WAAPI walkers),
which was deleted in 2026-09 (recoverable from git history).

**Scene:** a soft sunset sky on a slow DAY CYCLE (`DAY_SEC` 300 s: dusk → night
with twinkling stars, a crescent moon and Dubai-look shooting stars → dawn →
back to dusk; the looks are keyed along `tod` and interpolated), a low sun
setting behind two hazy snow-capped mountain ranges, drifting puffy clouds, a
**volcano on the RIGHT** trailing smoke, a rolling green valley floor with
ferns, round bushes, palms and rocks, a worn path, and swaying foreground grass.
Static layers (sky, scenery) are repainted only when the look changes; the
animals draw on their own layer sorted far → near; one gradient night veil
darkens the valley.

**Dinosaurs:** up to **2 ground dinosaurs** (trex, bronto, stego, trike — never
the same species twice in a row) roam across in two depths/sizes with random
coats (`L.pal` from each rig's `PALS`) and tints, pausing to play their
signature action (roar, graze, wag, charge) on a random schedule. **One
pterodactyl** flies past overhead, squawks, and may **LAY AN EGG** mid-flight:
it falls, bounces with a dust puff, rests, then HATCHES (BabyRig) and fades.
**Clicking a dinosaur plays its action AND recolours it**; clicking the egg
hatches it. The scene stays calm: 2 walkers + 1 flyer + ≤ 1 egg.

**The volcano's look — the ORIGINAL scene's cone, restored in 2026-09.** The
first canvas version was a pointed plum pyramid with long thin lava lines down
its flanks; it was replaced by a port of `dinosaurs2.bg.js`'s indigo volcano
(recovered from git history and redrawn on canvas in the same proportions):
a **truncated cone** with slightly concave flanks flaring to a broad base, a
**wide flat crater** (rim ≈ 0.34 of the base width) seen a little from above —
a dark rim ellipse with a lit far lip and a glowing **lava lake** inside that
breathes with the crater glow — and **short fat lava spills** over the near rim
that stop well above the ground (two left, one centre, two right; the thick
orange tongues carry a warm core, the thin ones are pale yellow). The right
flank is shaded and two soft gullies run down the face. Everything still takes
the hour's haze, except the rim, which stays dark so the crater reads at night.
Geometry lives in `VOL()` (base ≈ 0.615–0.935·W — narrowed in 2026-09 so the
cone stands as tall as it is wide, like the original, instead of sprawling
across the right half); the click hit-test follows the same cone.

**Volcano — two shows, clicks alternate:** odd clicks → an ERUPTION (a 3-2-1
countdown floats over the crater, then a lava fountain, crater glow, ash
cloud, screen shake); even clicks → a DESTRUCTIVE ASTEROID STORM: 16
fireballs with fire + smoke trails (the last one huge), each impact a
blinding flash + shockwave ring + embers and rock debris flung up + a burning
crater that flames, smokes and stays scorched for ~30 s, screen shake, a
white screen flash and ash haze over the sky; plants near an impact are
CHARRED (snapped palm, blackened bush, ash mound) and regrow after 30 s; a
resting egg nearby is startled into hatching. Every ground dinosaur BOLTS for
the nearest edge (a startled hop, legs pumping at ~3.6× speed, another hop
per nearby impact), the pterodactyl squawks and speeds off, and no newcomer
wanders in until the sky is quiet. Clicking the sun or the moon fast-forwards
the day to the next look.

**Ambient:** "rumi" (`rumi/chibi-walker.js`, see the rumi paragraph above)
strolls the valley every 2–4 minutes, first after ~45 s–2¼ min of play — the
same cadence the old dinosaurs scene used. She is loaded on demand next to the
rigs, warmed by `preload()`, lives on her own overlay layer above the canvas,
is not counted against the dinosaur cap, and is stopped by `cleanup()`.
`_dino3.rumi()` forces an immediate stroll.

**Game position — the card hugs the LEFT so the volcano stays clear** (crater
≈ x0.775·W, left flank from ≈ 0.56·W): `game/skins/dinosaurs.skin.css` pins
`.wrap` to the LEFT (`max-width:min(700px, 50vw − 0.5cm)`; re-centres on
≤840px screens). Skin: `dinosaurs.skin.css` (warm dusk glass, sunset-gold /
grass-green accents). Aids: `dinosaurs`. Theme wiring: `_BG_THEMES.dinosaurs →
dinosaurs3`, `THEMES.dinosaurs`, `body.theme-dinosaurs`, the 🦕 menu button +
toggle-cycle entry (themes.js, index.html), and `dinosaurs.skin.css`. Dev
harness: `dinosaurs3.html` (Restart / Erupt / Storm / Egg / Night); verify via
`_verify_dino3.py` (STANDALONE or in-game mode). Test hooks: `window._dino3`
= `{ seek, erupt, boom, storm, egg, spawn, ptero, act, walkers, look, tod,
rumi, rumiLayer }`.

**dino_rigs/ — the from-scratch dinosaur rigs (used by dinosaurs3.bg.js).**
A new soft cartoon take on every dinosaur of the 🦕 theme, each drawn on
canvas in its own file on top of `rig-common.js` (`window.DinoRig`: named
`PALETTES` + `palette()`, `blob` smooth silhouettes, `taper` tubes for
tails/necks/horns, round-jointed `leg` with a flat clawed `foot`, big glossy
`eye`, `blink`, `brow`, `spots`, `stripes`, `rim` light, `heart`, `rings`,
`dust`): `trex.js` (TrexRig — roar: squat, head back, jaw + fangs, brows
knit, arms up, sound rings), `bronto.js` (BrontoRig — graze: the neck arcs
down to a fern and munches), `stego.js` (StegoRig — two staggered rows of
accent-coloured plates + cream tail spikes; wag: tail whip, plates shimmy
and glow), `trike.js` (TrikeRig — knobbed frill, three horns, parrot beak;
charge stance: head down + shake, pawing foot, dust, snorts), `ptero.js`
(PteroRig — FLYER: hovers above the ground line, side-view wing beats,
crest, beak; squawk), `baby.js` (BabyRig — the hatchling egg: rests closed
and rattles; hatch: lid swings open, baby rises with huge eyes + shell hat,
hands grip the rim, a heart floats). Shared API: `Rig.draw(ctx, L, t)` with
`L = {x, y, s, dir, ph, wt, moving, pose, pal, tint}` in one unit space
(feet on y = 0, facing +x; `pose` 0..1 plays the signature action; `pal`
picks a coat from the rig's `PALS`, `DEFAULT` names its own), plus
`HEIGHT`/`WIDTH` in units, `ACT_SECONDS`, and `FLYER` on the pterodactyl.
House style: everything in TRUE PROFILE — one big glossy eye under a heavy
brow (only the baby in its egg faces the viewer) — blush, cream belly panel
with soft stripes, back spots, warm rim light, no outlines. Workshops: `dinos.html` (one dinosaur at a time
on a BLANK studio backdrop; tabs, Walk/Act/Flip/Coat/BG/Size,
`?animal=stego`), `parade.html` (all of them side by side at one scale).
Verify via `_verify_dinos.py` (idle + mid-action stills of each, plus the
parade, to `c:\tmp\dino_rigs`). These rigs ARE the game's dinosaurs now:
`dinosaurs3.bg.js` loads them on demand.

## aurora.bg.js — AURORA & ICE (the ❄️ theme, integrated)

A polar night over a frozen lake. **It replaced `frozen.bg.js`** as the ❄️
theme's scene and REUSES that theme's skin and aids, so the wiring was a
one-word change: `_BG_THEMES.frozen → 'aurora'` (themes.js). Registers
`window.BACKGROUNDS.aurora = { skin: 'frozen', aids: 'frozen', init({stage}) →
cleanup }`; `THEMES.frozen`, `body.theme-frozen`, the ❄️ menu button and the
toggle-cycle entry are unchanged, and `game/css/themes.css` carries the
`body.theme-frozen #bg` load-flash gradient (now the aurora night sky).
Mostly canvas, plus ONE DOM layer for Olaf (see below).

**The picture:** a deep indigo sky with a faint Milky Way and ~320 stars (the
bright ones twinkle, the brightest with a cross flare), a full moon with an
ICE HALO (22° ring, faintly rainbow-edged) top right. THE AURORA: three
curtains — a bright green main arc with a sharp lower edge fading to teal and
violet, a cooler cyan arc, a faint pink/violet veil above — drawn as ~450
vertical rays per frame whose brightness, height and position follow layered
value noise (`fbm`): folds, drifting rays of uneven width (domain-warped), a
slow pulse. Rays are drawn at half resolution with additive compositing; a
1/8-res copy upscaled on top is the bloom. Below: two snow-capped ranges
painted as shaded HEIGHTFIELDS (4-octave rocky skyline, lighting from the
2-octave massif shape so flanks shade in wide moonlit sweeps, a snow line
that whitens with altitude; every 1-px column an opaque pre-mixed gradient —
no seams), distance haze on the far range; a wide FROZEN LAKE (pale far shore
→ deep ice, sheen bands, frost speckle, long translucent cracks with shadow
twins, drifted snow patches) carrying a dim compressed mirror of the ranges
and a smeared additive mirror of the aurora; faceted ICEBERGS (two apexes of
facets, fracture lines, a cyan translucent core, aurora light through the
base, moonlit rims, a moon shadow on the ice, frost at the foot, a faint
mirror) plus shards along the far shore; wind-sculpted snow banks in the
foreground; low mist drifting over the far shore; gentle snowfall with a
gust; ice sparkles; the odd shooting star; a cold vignette.

**The figures:** an ICE CASTLE on the far shore (five crystal spires with
tiered collars, glowing windows, a shadowed left face and moonlit right edge,
walls with a crenellated crystal top, a grand stair and a glowing great door;
painted into the mountain layer so it MIRRORS in the ice). An OPEN CHANNEL of
dark water cut through the ice (jagged bright rims, a depth shadow under the
far edge, ripples, a brighter aurora mirror than the ice) where two ORCAS
cruise and porpoise: the dorsal fin cuts the surface, the back rolls up with
a spout, a faint body shows through the water below the surface line, and
every ~25 s one BREACHES with a splash and a ring (`breach()`); they turn at
the screen edges and pick a new lane. Three harbour SEALS lounge on flat
ledges of the icebergs (raised heads that look about, blink, bark, a flipper
flap, a slow breath, a shadow on the ice). THE PRINCESS is the low-poly
paper-art princess from `princess/princess.html` (Flat Kingdom style; pen by
acupajoe.io), packaged as **`princess/princess.js`** (`window.PrincessArt =
{ svg, viewBox, bbox, feetY, centerX }`) and injected on demand with a script
tag. Pose FRAMES are built by injecting `transform="rotate(…)"` into her
`Left_Arm` group — three arm swings for the walk, one raised arm for the cast —
and rasterized through `<img>` data URLs, then drawn on the canvas like
everything else: she walks the snow bank with a bob, a lean, an arm swing and
a breath, flips at the edges, and every 11–19 s stops, raises her arm (a cold
glow in the hand) and conjures a swirl of snowflakes (`cast()`). To restyle
her, edit the SVG in `princess/princess.html` and re-run the packaging step
(the svg string in princess.js is the html's `<svg>…</svg>`, minified) — the
packaging step is **`princess/_pack_princess.py`**, which also moves the left
hand's polygons into the `Left_Arm` group so the palm travels with the raised
arm. There are TWO SISTERS: the original brunette and a younger BLONDE sister,
the same SVG recoloured at frame-build time (hair, a rose gown with icy trims,
pink tiara gems, blue eyes); they turn at the edges and when they meet.

**OLAF** strolls the foreground snow bank — the pure-CSS rig from
**`olaf/olaf.js`**, lifted VERBATIM out of the old `frozen.bg.js` (its design
source is still `backgrounds/olaf.html`; the SCSS was hand-compiled and scoped
under `.fzo`/`.fz-olaf`). He is the one figure that is not canvas: he mounts as
a DOM layer over the scene canvas, so the stage holds three layers — **scene
canvas · Olaf (DOM) · fx canvas** — and the snowfall + conjured snowflakes draw
on that top canvas so snow falls in FRONT of him as it does the others. His
walk cycle (stepping feet, swinging twig arms, rocking head) is the rig's own
CSS, switched by the `fzo-walk` class; the crossing is a transform this scene
drives, and he pauses every 13–24 s. Click him → a happy HOP (animated on the
inner `.fzo-a`, so the walk keeps playing underneath) + a burst of snowflakes
(`hop()`). NOTE: the game page is RTL, where an absolutely positioned box with
auto offsets takes its static position at the RIGHT edge — the Olaf layer sets
`direction:ltr` and the wrapper an explicit `left:0;top:0`.

**More life:** a POLAR BEAR mother and her cub amble across the ice (heavy
four-legged gait, swaying head, a stop to sniff the ice; the cub trots to
keep up, `sniff()`); an IGLOO of snow blocks sits on the far ice with a warm
light in its tunnel (static, in the lake layer); the MOON is big and detailed
(maria, craters with lit rims, limb darkening, a soft glow — no halo ring;
painted once into a small canvas); the seals ROCK on the ice, wiggle their
tails and WAVE a flipper on a slow rhythm or when clicked (`wave()`). CLICKS
(document listener, UI filter): the AURORA BAND — the top ~36% of the sky —
→ a SURGE, brighter and faster curtains for ~5 s (`surge()`); the ICE CASTLE →
a **LIGHTNING STORM** (see below), which does NOT surge the aurora, the two
being deliberately separate; a princess → she casts; a seal → it waves (and may
start an act); a bear → the mother sits / the cub stands. Clicks are tested in
that order and each one returns, so a hit never falls through to the sky.

**Everything acts:** the SEALS run a little state machine (an act every 7–15 s,
also on click): a belly-up ROLL with wiggling flippers, a GALUMPH hop along the
ledge, a CLAP + bark, and a DIVE — a slide down the iceberg into the channel
with a splash, a swim out and back with the head bobbing above the water line
(clipped, with a wake; drawn behind the icebergs), and a hop back onto the
ledge with drips (`dive()`, `roll()`). The BEARS act too: the mother SITS up on
her haunches to watch the sky, SHAKES snow off (fur flecks fly) and SNIFFS the
ice; the cub belly-SLIDES across the ice with a spray, STANDS up on its hind
legs, shakes and sniffs (`sit()`, `slide()`, `sniff()`). The IGLOO's doorway
firelight flickers and spills on the snow, smoke curls from its chimney hole,
and an ARCTIC FOX trots out every ~20–35 s, sits to look about (head turning,
tail wagging), and trots back in (`fox()`). The CASTLE's windows flicker each on
their own rhythm with the odd blink, the great door breathes light, the spire
tips twinkle, a sheen of light sweeps across the crystal, and a pennant waves
from the tallest spire (its lights/tips/spires are recorded while painting).
**Click the castle → a LIGHTNING STORM**, ported from
`success_screens/success-lightning-storm.js`: five strikes over ~1.3 s, each
bolt built by MIDPOINT DISPLACEMENT (`genBolt`) and drawn as a wide soft halo
plus a bright core (`drawSegs`), with a secondary branch, a soft radial flash
at the impact point, a spray of sparks and a brief white screen flash. Here the
bolts are aimed at the castle's own SPIRE TIPS and its windows blaze with each
hit (`castleBlaze`). Drawn on the fx canvas, above everything (`lightning()`).

**Shooting stars** are frequent: one every 1.8–5 s, and about a third of the
time they arrive as a staggered burst of two or three.

Layers: skyL · auroraL (½-res, redrawn every OTHER frame) → auroraLo (⅛-res
bloom) → reflL (⅛-res, the lake's mirror of the aurora, rebuilt with it) ·
midL (static: ranges + castle + ice + channel + igloo + the ranges' dim mirror)
· foreL (static: icebergs, shore, drifts); per frame: orcas (clipped above /
faint below the water line), seals, bears, the princesses + Olaf, snow.

**Performance** (`_perf_aurora.py` — CDP main-thread metrics + the scene's own
`_aurora.prof()` per-section timers; headless frame gaps are meaningless here):
the first cut cost 16% main-thread busy / 4.1 ms of script per frame and
composited ~14 full-screen blits at DPR 2. Now: 9.4% / 1.8 ms and ~6 blits at
DPR 1.5. What changed — the aurora curtains re-render every other frame (120
columns, a 4096-entry hash table instead of `sin()` in the noise); the two
static mid layers and the ranges' flipped mirror became ONE prebaked layer;
the aurora's seven flipped full-screen mirror blits became one ⅛-res layer
rebuilt with the aurora and blitted once; the figures' gradients are memoised
(`lgc`/`rgc`, cleared on resize); castle window/tip glows and the mist are
sprites; the moon glow is baked; the igloo firelight flickers via
`globalAlpha` on cached gradients; the princess SVG frames are rasterised once
per size into bitmaps (drawing an SVG `<img>` to canvas re-rasterises every
frame); fewer stars twinkle. Gotcha from the DPR cap: the mountains' 1-px
columns must be ONE DEVICE PIXEL wide and snapped to the device grid — at a
fractional DPR a CSS-pixel column straddles device pixels and its
anti-aliased edges read as vertical hatching.

A second pass went after the GPU side, which those main-thread numbers do not
show at all (six full-screen blits at DPR 1.5 on a 1920×1200 window is ~31 MP
of fill per frame). (1) The backing store is now capped at ~2.4 MP as well as
1.5× (`pickDPR`, unicorns3's) — a 1920×1200 window lands on ~1.0×, which alone
cuts every fill by 2.2×. (2) `layerBounds` measures, once per resize from a
48×192 thumbnail of each static layer, the rows it actually paints AND the row
from which it is opaque to the bottom; `band()` then blits each layer over
just that stripe — the sky stops where the mountains become opaque (413 of 800
px), the mid layer starts at its highest ridge (200), the lake mirror is drawn
only in the lake. The foreground is the exception: its vignette covers the
whole screen, so it still costs one. (3) The curtains live in a layer only as
tall as they hang (0.46 H, a WINDOW on a full-height coordinate space via
`hDraw`), and the bloom is folded into that layer, so the sky takes ONE partial
additive blit where it took two full-screen ones. Total per-frame fill: ~6
screens → ~2.1. (4) The rAF loop paces itself like unicorns3 — while frames run
long (gap > 21 ms or cost > 7 ms) the canvas renders every 2nd display frame
and returns to full rate after 6 quiet seconds; touch devices start there.
`_aurora.perf()` → `{dpr, fdpr, halfRate, gapEma, costEma, frames, drawn,
bands}`; `_aurora.prof()` / `profReset()` remain for the next pass.

The other half of that pass was NOT in the canvas: `frozen.skin.css` still had
`backdrop-filter:blur(5px)` on `.glass` and `.card`. A backdrop blur over a
scene that repaints every frame makes the compositor re-blur the panel every
frame — it is the most expensive thing you can put over an animating canvas,
and the space / unicorns / reef / dubai / maldives skins had already all set
`backdrop-filter:none` for exactly this reason. Frozen now does too, with a
deeper fill (`.card` .72→.55) so the equation stays crisp. Headless Chrome
cannot measure this (its compositor is not the user's GPU); the trace shows
23% more `Commit` time with the blur on. Test hooks: `window._aurora =
BACKGROUNDS.aurora._test = { intensity(v), snow(on), wind(v), shoot(),
cast(), breach(), surge(), wave(), sniff(), dive(), roll(), sit(), slide(),
fox(), hop(), lightning(), busy(), princess(), orcas(), bears(), olaf() }`
(`busy()` reports `{strikes, surge, castleBox}` — handy for checking that a
click routed where it should). Dev harness: `aurora.html` (Aurora bright /
calm, Snow, Wind, Shooting star, Cast, Breach, Surge, Wave, Dive, Bears, Fox,
Lightning, Restart). Verify via
`_verify_aurora.py` (default / cast+breach / bright stills to
c:/tmp/dino_rigs + a double-restart leak check).

## reef2.bg.js — the coral reef, rebuilt from zero (2026-09)

`window.BACKGROUNDS.reef2 = { skin:'reef', aids:'reef', init({stage}) → cleanup }`.
**This is the 🐠 theme's scene** — `_BG_THEMES` maps `reef:'reef2'` (2026-09-14);
the old `reef.bg.js` is kept in the folder but nothing loads it, and nothing is
shared between them. The reef skin and aids carry over unchanged. Dev harness
`reef2.html`;
verify via `_verify_reef2.py` (stills + fish close-up crops to `c:/tmp/reef2`,
restart leak check, per-section ms via `_reef2.prof()`).

**Design space 1600×900, sand line ~790**, cover-fitted and bottom-anchored
like dubai3 (`S`, `OX`, `OY` map design → screen). The game card sits centre,
so both reef HEROES stand on the sides and the centre is a low sand channel.

**Layers.** `backL` (full-res, painted once per resize): the water gradient +
sun bloom + surface shimmer, the far reef (two hazy planes), the sand with
ripples, then every static element sorted by base-y — rocks, brain / boulder /
staghorn / table / lettuce / mushroom / finger corals, tube & barrel sponges,
giant clams, sea stars, urchins, shells. `foreL` (the bottom band only,
blitted from design y 560 down) holds the elements flagged `fore`. Live, per
frame between them: god-rays (6 soft nested wedges, additive), caustics (a
seamless baked tile scrolled as a pattern, clipped to the sand polygon plus a
faint band above it), the giants, the far fish, the swaying things (sea fans,
soft corals, sea whips, seagrass, the ANEMONES with their clownfish), the
near fish; then the fore band, fore swayers, motes, bubbles, hearts, a ¼-res
vignette. Everything sways to ONE current `cur(t)`.

**Rocks** (`paintRock`): a main blob + 2–4 lumps (`rockBlobs`, nonzero fill),
lit upper-left, grain, pits, turf-algae and coralline crusts, crevices, a dark
underside, and a rim light made per blob as the even-odd sliver between the
blob and a copy shifted down-right (a stroke of the compound path leaked loops
inside). `onRock(R,u)` gives a point on a rock's top for placing corals.

**Anemones** (`buildAnemone`/`drawAnemone`): 90–140 tentacles growing from
random spots on the oral disc, splaying outward, front ones draping over the
column; per-tentacle wobble + the current; colour strings pre-computed once
(`A.pre`). `A.midDraw` is called between the back and front halves so hiding
clownfish are drawn INSIDE the crown.

**Fish** — one renderer `drawFish`, species as data in `SPECIES` (body spline
anchors, tail kind, fin polygons, pectoral root, eye, palette, `pattern(g,P)`).
Local coords: length 1, nose +0.5; `mkWarp(bend)` flexes the rear of the body
with the tail beat; `face` runs −1..1 so turns thin the fish through zero;
pitch follows the heading; pectoral flap; an occasional gulp (`mouth`).
Cast: clownfish (2 per big anemone, 1 in the small: hover, hide in the
tentacles, dart out when the anemone is tapped), Dory (regal tang, palette
marking + yellow tail; tap → dash / barrel roll), the threadfin butterflyfish
pair (the second follows; tap → hearts), two yellow tangs (home boxes kept
ABOVE the anemone crowns), two royal grammas by the rocks, a school of 14
chromis (leader wanders, members hold slots; tap → scatter). Two bottlenose
DOLPHINS (`drawDolphin`) cruise the open water fast and rise to the surface
for a breath every 35–75 s (a burst of bubbles at the top edge; tap → dash /
roll). Two BLACKTIP REEF SHARKS (`drawShark`, home y 250–560) patrol slowly
with a sinuous beat; small fish flee within 150 px (260 while a shark
charges), the school scatters within 220; tap → a charge. A PUFFER
(`drawPuffer`, `F.puff` 0..1) potters by the rocks and balloons — spines out,
slower — every 1½–2½ min and on tap (`inflate`). Three CRABS (`CRABS`,
`drawCrab`/`updateCrab`) scuttle sideways along the centre sand with stepping
legs and raised claws; tap → a startled hop and a fast scuttle. Six SEA STARS
(`STARS`) sit on the sand; tapping one summons RUMI. Giants: the blue whale
(2050 long, riding just under the surface at y 232–262; first 60–110 s, then
every 220–340 s) and the orca (950 long; 18–45 s, then 90–160 s), never both,
drawn BEHIND the reef band; fish flee when one passes close. RUMI
(`rumi/chibi-walker.js`, loaded via `BASE` from the module's own directory so
it works from the game and the harness) glides across in FLY mode every 2–4
min, first after 1–3 min (`rumiLayer`, a DOM layer over the canvas;
`rumiPatrol.stop()` in cleanup). Scheduler: a random
fish acts every 4–12 s and ~25% of the time also poops. **Poop gag**: every
fish once per ~3 min (staggered), a short wavy strand trails from the vent,
lets go, sinks and fades — never click-driven. Every action blows a bubble
puff (`puff`).

**Coral life (2026-09-15).** The hard corals stay baked, but every painter
REGISTERS its living parts while it paints (`coralReg`, `polyp`, and the
`WORMS` / `VENTS` / `FRINGES` lists; the registry is cleared and rebuilt with
the still layers on every resize, `PAINT_FORE` tags what belongs to the fore
band). `drawCoralLife` then animates them per frame in a handful of batched
paths (~0.3 ms): **polyps** (brain grooves, boulder domes, table plates,
lettuce leaf-edges, finger caps, staghorn tips) pulse in a slow wave that
travels across the reef — a soft halo under a bright core, four colour
buckets × two passes — and PULL IN (`CORALS[].ret`) when a fish brushes past
(checked every 3rd frame against the fish list) or the coral is tapped, then
creep back out over a few seconds; **christmas-tree worms** are drawn live
(scaled in y by `ext`) and dart into their tubes when their coral is startled;
**sponge openings** breathe (a pulsing `glow` sprite) and let out specks
(`SPECKS`); **mushroom corals** wave a fringe of short tentacles round the
rim; the two **giant clams** are LIVE elements (`CLAMS`, `paintClam(g, K,
open, t)`) — they gape slowly, their mantle spots shimmer blue↔green, and they
SNAP SHUT (`snapClam`) when a fish comes close or on tap, reopening after
~3 s. **Tap any coral → coral spawning**: `spawnCoral` releases a cloud of 40
pink/orange eggs (`EGGS`) that drift up with the current for 7 s. Hooks:
`corals()` (counts), `startle()`, `spawn(i)`, `clam()`.

**Rendering cost.** Measured in the real game with `_perf_reef2.py` (main-thread
work via CDP `Performance.getMetrics`, since headless frame gaps here are
noise): ~8.5% main-thread busy and **~1.8 ms of draw per frame**, against
dubai3 at ~8.5% / 0.9 ms and aurora at ~14% / 1.6 ms (with the coral life of
2026-09-15 on and every hook firing: ~10% / 3.0 ms). Getting there took five
things, each of which matters if the scene is edited further:
1. **The crowns are baked.** Repainting 400+ anemone tentacles every frame was
   a third of the budget. Each crown is now painted ONCE into three layers
   (`col` = column + disc + shadow, `back`, `front`) and the sway is a
   horizontal TRANSLATION of the two tentacle layers while the column stays
   planted (`anemLean`). A *shear* was tried first and was much worse — a
   non-axis-aligned `drawImage` takes the slow rasteriser path.
2. **Blits are snapped to whole device pixels** (`anemLayers`' `snap`, and the
   sway offset). A destination rectangle that lands between pixels is resampled
   instead of copied; that alone was several ms a frame across 12 blits.
3. **No per-vertex garbage.** `smoothPath` used to `.map()` a fresh array of
   `[x,y]` pairs for every outline, twice per animal per frame; it now fills two
   reused number arrays, and `mkWarp` returns ONE reused pair (so a call site
   that needs two warped points at once must take them as scalars via `warpY` —
   see the shark's fin tips and the whale/orca/dolphin dorsals). Mote buckets
   and the live-bubble list are reused too. Heap growth over 18 s: 0 MB.
4. **Loops are batched into single paths**: the whale's 260 mottling ellipses,
   the bubbles (outline / fill / highlight), soft-coral polyps, puffer spots and
   spines, shark gills, seagrass blades.
5. **Tiny fish skip the fine detail** (`tiny` in `drawFish`: under ~26 screen px
   the fin rays, gill arc, pectoral and mouth are dropped) — that is the whole
   14-strong chromis school.

The loop paces itself like the other scenes (renders every 2nd display frame
while frames run long, back to full rate after 6 calm seconds), and the first
1.2 s after init or a resize is EXCLUDED from that decision (`warming`) — the
theme switch paints every still layer at once and that one-off spike used to
latch the scene at half rate for good.

Test hooks `window._reef2`: `seek(s)`, `current()`, `counts()`, `fish()`,
`whale(x)`, `orca(x)`, `act(kind)`, `dart()`, `hide()`, `poop()`, `perf()`,
`breath()`, `shark()`, `puffer()`, `crab()`, `crabs()`, `rumi()`, `prof()`,
`pmax()` (worst-case ms per section — what to watch when hunting a stutter),
`profReset()`.
