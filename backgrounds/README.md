# Backgrounds — structure & game-integration guide

This folder holds the game's swappable scene backdrops. Two kinds of files live here:

| Kind | Files | Status |
|---|---|---|
| **Game-ready module** (`<name>.bg.js`) | `space2.bg.js`, `unicorns.bg.js`, `dubai2.bg.js`, `reef.bg.js`, `savanna.bg.js`, `dinosaurs3.bg.js`, `frozen.bg.js`, `maldives.bg.js` | Loaded by the game at runtime (`dubai.bg.js` is the legacy Dubai scene — nothing loads it) |
| **Thin dev harness** (`<name>.html`) | `space2.html`, `unicorns.html`, `dubai2.html`, `dubai_skyline.html`, `underwater_happy_reef.html`, `dinosaurs3.html` | Dev-only; opens its `.bg.js` module directly in a browser (single source of truth) |
| **Reusable scene parts** (`dino_rigs/*.js`) | `rig-common.js` + `trex.js`, `bronto.js`, `stego.js`, `trike.js`, `ptero.js`, `baby.js` | The canvas dinosaur rigs, loaded on demand by `dinosaurs3.bg.js` (see the dino_rigs paragraph below). |
| **Built, NOT adopted** | `unicorns2.bg.js`, `unicorns2.html`, `_verify_unicorns2.py` | A 2026-09 from-scratch canvas rebuild of the unicorn valley (one module, full day cycle, canvas unicorn rig). Reviewed and **not** kept: the original `unicorns.bg.js` scene reads better, so `girls` still maps to `unicorns`. Nothing loads these; see its section below. |
| **Space v2** (`space2.bg.js` + `space2.html`) | `space2.bg.js`, `space2.html` | The space scene recreated around a general-relativistic, ray-traced black hole: a WebGL2 sky layer (adaptive quality, baked sky) under the 2-D world — Sun, a wandering Earth and Saturn, passing solar-system worlds, galaxies, comets, the supernova and every click reaction; still-painted sky without WebGL2. Theme `galaxy` → `space2`. **Full section below.** |
| **Dubai v2** (`dubai2.bg.js` + `dubai2.html`) | `dubai2.bg.js`, `dubai2.html` | The Dubai dusk scene recreated from scratch — same design space, constants and cadences as the legacy scene, city and hallmarks redrawn (Burj Khalifa, Burj Al Arab, Cayan, Emirates Towers, Museum of the Future, Dubai Frame, Ain Dubai), mirrored in rippled water. Theme `dubai` → `dubai2`. **Full section below.** |
| **Standalone study** (`blackhole.html`) | `blackhole.html` | The physics study the space hole came from: a GR ray-traced black hole in one WebGL2 file, not wired into the game — drag to spin the hole, wheel to zoom, quality/bloom/jets/dust toggles. **Full section below.** |

Theme → background mapping (`_BG_THEMES`, themes.js): `girls→unicorns`,
`galaxy→space2` (the GR-black-hole scene; the legacy 2-D `space.bg.js` was removed in 2026-09 and space2 now paints its own still sky without WebGL2), `reef→reef`, `dubai→dubai2` (the from-scratch redraw; `dubai` is the legacy scene), `savanna→savanna`, `dinosaurs→dinosaurs3`
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
sunset, swaying foreground grass. `window._sav2` exposes tod/setTod/setSpeed/
phase/pride/herd/spawn/act for the harness and tests. Skin:
`game/skins/savanna.skin.css`. Aids: `savanna` (cheetah number-line rider +
amber fruit jar).

**rumi/ — the roaming character "rumi" (2026-09 realistic redesign).** One
module, `rumi/chibi-walker.js` (file/global `ChibiWalker` keep the historical
"chibi" name for compatibility), holds the art AND the behaviour: a three-
quarter-view figure with real proportions (~6 heads), two-segment limbs whose
knees and elbows bend in a real walk cycle (thighs ±17°, arms counter-swing,
inverted-pendulum body bob, head nod, ponytail swing), soft gradient shading,
thin plum outlines; an anime face after the reference picture (big amber eyes,
thin arched brows, tiny nose, small confident smile, side-swept bangs), purple
bubble-braid high ponytail, hoop earring, yellow bomber jacket with patches open
over a white CROP TOP + pendant with a bare midriff, baggy lavender pants, white
sneakers with pink soles. Behaviours: blink, floating
hearts, click → zap / jump / fly-out, and the reef's FLY ("swim") mode (rotated
90°, near arm raised, ripples at the hand). API: `ChibiWalker.walk / patrol /
trigger`. Preview + design notes: `rumi/rumi.html`; sandboxes `rumi-test.html`,
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

## aurora.html — arctic night under the northern lights

Standalone playground (`aurora.bg.js` + thin `aurora.html` harness). **Not yet
game-integrated** — it already wears the module shape (`BACKGROUNDS.aurora`,
`skin:'aurora'`, `aids:'classic'`) and the document-click + UI-filter contract,
but no `skin`/theme/`themes.css` rule exists yet; wire those per the porting
checklist when promoting it.

Cheapest scene in the folder — **no articulated rigs**, just gradients +
particles + ribbon math. Static prerender (`paintScene`): deep-night sky
gradient, crescent moon + glow, ~280 dust stars, two snow-capped mountain
`RIDGES` (generated once in `buildScene`), a far-shore `PINES` treeline, and a
frozen lake. Dynamic layer: the aurora `RIBBONS`, twinkling `STARS`, drifting
`SNOW`, shooting-star `METEORS`, and a lake reflection.

**Aurora curtains** (`RIBBONS`/`drawAurora`): each ribbon's top edge is a sum of
sines (`ribTop`); the curtain is drawn as wavy vertical-gradient strips
(`step=9`) under `globalCompositeOperation='lighter'` so overlaps glow, with a
moving `sin(x·0.05 + t)` term making vertical rays shimmer across it. Three
ribbons (green, teal, violet) stacked at different `baseY`.

**Lake reflection** (`drawReflection`): no second render — it strip-blits the
already-drawn frame onto itself. Each thin destination strip (`S=4·DPR`) samples
a slightly *higher* source strip, so the copy reads as a vertical mirror; a
per-strip horizontal wobble = ripples, and alpha fades with depth. Runs under an
identity transform (device px), so it mirrors the mountains, moon, stars and
aurora together.

**Click + schedule** (one code path): a meteor crosses on its own every 6–14 s
and the aurora surges every ~18–34 s; clicking a glowing curtain triggers the
same 2.6 s brightness+amplitude **surge** (`AURORA_FX.t0` + `clickEnv`, eased
in/out), and clicking bare sky/lake flings a flurry of shooting stars from the
tap (`spawnMeteor`). `clickEnv(t0,t,dur)` is the fast-attack/slow-release
envelope borrowed from `space2.bg.js`.

**Game integration notes (when ported):** the lake bottom ~26% and the aurora
band (top ~20–60%) are the busy zones; the calm strip is the horizon line
(mountains/pines, ~mid-frame) — but the scene is symmetric, so the game column
fits **center** comfortably. Skin direction: deep-navy glass, teal/mint accents
(`#8ff0d0`-ish), cool white text.

---

## dubai2.bg.js — Dubai at dusk, redrawn (the 🏙️ theme, integrated)

Theme `dubai` → `dubai2` (`_BG_THEMES`). Harness `dubai2.html`; skin
`game/skins/dubai.skin.css`; aids `dubai`. The city was rebuilt from scratch in
2026-09; `dubai.bg.js` + `dubai_skyline.html` are the **legacy** scene and stay
in the folder unloaded. `_verify.js` now checks `dubai2.bg.js`.

**Same stage, same clock.** Identical fixed design space — 1600×900
(`DW×DH`), waterline `HZ = 780`, sunset glow at `SUNX/SUNY = 560/772`, Burj
Khalifa at `BX = 1330` scale `BS = 1.44`, moon at `300,140`, Ain Dubai at
`410,618` r 120 — cover-fitted and bottom-anchored, with hit-tests mapping
screen→design. Static scene (sky, far skyline, towers, water, vignette)
prerenders into `off` once per resize; the per-frame layer draws only lights,
effects and moving things. **Every element, constant and cadence of the legacy
scene is kept** — the Burj LED show (`SHOW_PERIOD 180`/`SHOW_LEN 22`),
fireworks (`120/5`), the five-movement fountain (`210/30`), the drone light show
(`150/14`) + crossing drones, the oil gusher (`150/8`), the dusk→night cycle
(`DAY_PERIOD 200`), the thunderstorm (`STORM_LEN 12`), the missile-defense show,
helicopters (including the Burj Al Arab helipad shuttle), aircraft, birds,
dolphins, the boat fleet, crane + gondola, and every click zone. **The
"Scheduled shows", "Click interactions" and "Game integration notes" tables in
the legacy section below still describe this scene** — only the drawing changed.

**What the redraw actually changed:**

- **The sky** (`drawSky`): banded dusk gradient, a low sun glow, 360 stars with
  84 twinkles, eleven cirrus streaks (the low six catch the sunset from below),
  and a crescent moon with earthshine.
- **Two hazy far layers** (`drawFar`, `FAR`/`FAR2`) behind the city for depth.
- **The generic tower** (`drawBuilding`/`drawBoxBody`/`drawCrown`): two-face 3-D
  massing (a lit face and a shaded return), glass sheen, floor banding,
  mullions, a podium with lit shopfronts, and a detailed crown per `crown` kind
  (`flat`, `spire`, `dome`, `emir1`, `emir2`, `slantL`). Glass palettes come from
  `STYLE` (`blue`, `navy`, `teal`, `bronze`, `silver`, `sand`, each `base`/`tint`/
  `warm`); the `BUILDINGS` array keeps the original composition left→right (later
  = in front), each entry carrying its own animated light scheme (`anim.type`:
  `crown`, `edges`, `scan`, `pulse`, `sail`, `twist`, `museum`, `frame`).
  Windows (`drawWindows`) are clipped to the body silhouette and start a clear
  gap below the roof, so lit windows never poke past the crown.
- **The hallmarks, each its own renderer**: `drawBurj` (rounded setback lobes
  climbing to the needle spire, banded glass, over the Dubai Mall lake),
  `drawBurjAlArab` (the white exoskeleton sail on its island, glowing atrium
  wall, helipad and Al Muntaha), `drawJBH` (the breaking-wave low-rise next
  door), `drawCayan` (the 90° twist read as helical facets, with its own window
  clip), `drawTwin` (the Emirates Towers), `drawMuseum` (the upright torus with
  calligraphy on a green mound), `drawFrame` (the golden Dubai Frame's two clad
  towers + glass sky bridge), `drawFerris` (Ain Dubai over the water).
- **The water** (`drawWater`): deep gradient plus a *sliced, rippled mirror* of
  the finished city — the reflection is drawn in horizontal slices with a
  per-slice horizontal offset, so it wobbles instead of being a flat flip —
  then the sun's path and glints.

---

## dubai_skyline.html / dubai.bg.js — Dubai at dusk (LEGACY — superseded by `dubai2`)

> Kept for reference and because the schedules, click zones and game-integration
> notes below are shared verbatim with `dubai2.bg.js` (the section above), which
> is what the `dubai` theme actually loads now.

Canvas painting in a fixed **1600×900 design space** (`DW×DH`, waterline
`HZ=780`), cover-fitted and bottom-anchored to the window (`scale/ox/oy`); all
hit-tests map screen→design through those. Static scene (sky, skyline, Burj,
water + flipped-image reflection, vignette) prerenders into `off` once per
resize; the per-frame layer draws only lights and effects. Per-building windows
(`genBoxWindows`) start a clear gap below the roof — `pad = CROWN_PAD[crown] +
max(18, h·0.09)` (the crown clearance plus a height-proportional gap) — and are
additionally **clipped to the body silhouette** in the prerender, so lit windows
sit well under the crown and never poke past the roofline.

**Scheduled shows** (constants at the top of the script):

| Show | Constants | Cadence |
|---|---|---|
| Burj LED facade show | `SHOW_PERIOD=180, SHOW_LEN=22` | 22 s every 3 min |
| Fireworks off the Burj's sides | `FW_PERIOD=120, FW_LEN=5` | 5 s every 2 min |
| Fountain choreography (5 movements) | `FN_PERIOD=210, FN_LEN=30` | 30 s every 3:30 |
| Black oil gusher at sea | `OIL_PERIOD=150, OIL_LEN=8` | 8 s every 2.5 min |
| Drone light show (squadron flies in → 2 shapes → out) | `DRONE_PERIOD=150, DRONE_LEN=14` | 14 s every 2.5 min |

`*_OFFSET` constants make every show's first run land seconds after load.

**Ambient drones** (`CROSS` + `drawCrossers`): a small pool (`CROSS_MAX = 5`) of
drones that simply fly across the sky and out, then respawn after a gap — at most
5 on screen at once. No drones loiter; new ones arrive only for the show.

**Drone light show** (`SHOW` squadron + `drawShowDrones`): 18 drones, parked
off-screen and undrawn, that fly IN from the top, form **two** different simple
shapes, then fly OUT. They are the same pretty drone instances (`drawDroneAt`)
and add a bright **additive** (`'lighter'`) shape-tracing glow — a halo
(`radius 19`) plus a hot bright core. The two shapes are a **random distinct
pair** drawn from a 6-shape set (`DSHAPES`: ring / heart / star / square /
Burj-like thin spire / diamond). A smoothstep `fp`
flies the squadron in (3 s) from its off-screen park points (`parkShow`) and back
out (3 s); between the two hold slots the shape morphs (eased by `mp`); targets
recompute only on a shape change. Scheduled every 2.5 min and launched by
**clicking open upper sky** (`mDroneStart/End`, merged via `Math.max`). Centered
at `DCX,DCY ≈ 295,350` — left side, just below the moon, so the centered
math-game card never covers it.

**Always-on systems:** per-building accent lighting — each tower has its own
`anim` scheme (`edges/crown/scan/pulse/sail/twist/museum/frame/bridge`) with its
own hue & speed; slowly switching windows (`b.dyn`); ~84 **twinkling stars**
(`TWK`, drawn space-style as a crisp core + tight halo + a 4-point sparkle on the
brightest — not the Burj's soft blink) over ~320 prerendered dust stars;
occasional **shooting stars** (`SHOOT`/`drawShooting`, a streak every 6–16 s);
aviation beacons (`BEACONS`); 3 helicopters (`HELIS`, one with a sweeping
searchlight); ≤5 drones crossing the sky (`CROSS`); **birds** gliding across with
flapping wings (`BIRDS`/`drawBirds`, drawn live — not baked into the prerender);
leaping dolphin pods (`DOLPHINS`); water glints
(`SPARKS`); a crossing aircraft; the **Ain Dubai observation wheel**
(`drawFerris`, center `AW_X,AW_Y ≈ 410,618`, left of the Burj over the water) — a
metallic build (dark body + light edge + highlight): splayed tubular legs with a
cross-brace, a thick double-rim truss (outer+inner rings + lattice ticks),
steel-cable spokes, a shaded hub and capsule gondolas, plus an LED rim that
twinkles warm (rainbow chase on a click) and a water-pool reflection; its angle
is integrated each frame (`awAngle`) so a click spin-up never jumps. A small
**fleet** (`BOATS`, ≤3 at once; `drawBoats`) sails the bay — each slot spawns a
random `type` (`dhow` with a breathing lateen sail + fluttering pennant /
modern **yacht** with lit windows + radar mast / **abra** water-taxi with canopy
& passengers / **speedboat** with a big spray wake). All **bob and rock** on the
swell, cast a **soft shadow on the water** (a dark gradient ellipse that stays at
the waterline as the hull bobs), trail a shared capped foam **wake** (`BOATW`,
≤160), carry green-bow / red-stern (and, where fitted, white-masthead) nav lights
of constant radius, then cross, wait offscreen, and a fresh random type
re-enters. "Dubai under construction":
a **tower crane** (`CRANE`/`drawCrane`) on a mid tower — lattice mast, a jib
whose apparent reach slowly slews via `sin` (side-on view), a running
trolley/hook, counterweight and blinking red apex/jib-tip warning lights; and a
**window-cleaning gondola** (`GOND`/`drawGondola`) riding the Address tower's
facade up and down on roof-davit cables.

**Dusk→night cycle** (`DAY_PERIOD=200`, `nightFactor`/`LIGHT_GAIN`): a slow
`(1-cos)/2` oscillation (0 = the prerendered dusk, 1 = deep night) — so it
**darkens and then brightens back**, full cycle ~3:20 (deepest night at the ~1:40
midpoint, back to dusk at 3:20, repeating). Each frame a single translucent navy
gradient is drawn *over* the prerendered scene but *under* the live lights (so no
re-prerender), and `LIGHT_GAIN = 1 + 1.3·nf` scales the live dynamic windows,
twinkles and Burj yellow lights — so as the sky darkens the city's lights
gradually "switch on" and fade back as it returns to dusk. Starts at dusk (no
overlay).

**Rare desert thunderstorm** (`STORM`, `STORM_LEN=12`): ~12 s once every **4–6
min** (randomised start-to-start via `STORM.nextAt = t + rnd(240,360)`; first
storm ~38 s after load). `drawStormClouds` rolls a dark cloud band across the top; while
active, `makeBolt` strikes every 1–3 s — a jagged main path + 1–2 branches drawn
as a blue glow + white core (`drawBoltPath`), with a `2·HZ−y` mirrored, rippled
copy on the water. Each strike triggers a fast full-frame `drawStormFlash`
(white-blue, ~0.5 s, with a waterline sheen). Bolts are short-lived so at most
~1–2 exist at once (no buildup).

**Click interactions** (`cv` click → design coords):
- **Burj Khalifa** (`BX±60`) → 50/50 random: manual LED show (12 s,
  `mShowStart/End`) or fireworks burst (5 s, `mFwStart/End`) — merged with the
  scheduled envelopes via `Math.max`, so overlaps stay smooth.
- **The fountain** → a manual 20 s show (`mFnStart/End`).
- **Burj Al Arab** → scrambles the missile-defense show (+6 s light-up).
- **Any other building** → `b.boostStart/boostUntil` (6 s `clickBoost`): all its
  windows switch on and its accent lighting flares ×2.4.
- **The crescent moon** (`MOON_X/Y/R` ≈ 300,140) → a simple ~2.6 s animation
  (`moonBoostT`/`drawMoonFx`): a soft glow pulse, a gentle crescent-phase wobble,
  and a ring of orbiting twinkles, then it eases back.
- **The round Museum of the Future** (oval at `MUSEUM` ≈ 600,732) → each tap emits
  an expanding light **ring in a fresh colour** (`MFX`/`drawMuseumFx`, hue advances
  +67° per click; rings expand ~1.5 s then fade, list capped at 8).
- **A drone** (crosser or show drone, hit-tested first via its tracked `_x,_y`)
  → it **explodes** (`popDrone`: a flash/shockwave ring `POPS` + a 22-spark `FW`
  burst); a crosser respawns in 3–6 s, a show drone returns after ~4 s.
- **A helicopter** (`HELIS`, tracked `_x,_y`) → same explosion; it stays down
  4–7 s (`deadUntil`), then its `off` is recomputed so it **re-enters from the
  edge** (prog≈0) instead of popping back mid-air.
- **The incoming missile** (`MIS.inc`, during the missile-defense show) → blows
  up early with the same `popDrone` burst and clears the show.
- **A boat** (`BOATS`, tracked `_x,_y,_half`) → its lights blink fast for ~2 s
  (`blinkUntil`).
- **Open upper sky** (no building/landmark/drone hit, `my < HZ-140`) → launches a
  drone light show (`mDroneStart/End`).
- **Ain Dubai wheel** (within `AW_R+16` of its center) → a ~4 s spin-up
  (`awBoostStart`) with the rim LEDs chasing rainbow colour, then it eases back.

**Missile-defense show** (`MIS`/`drawMissiles`, once every 6 min + on Burj Al
Arab click): an emoji 🚀 streaks in from the right with a gray smoke trail;
when it closes past x≈1050 the Burj Al Arab fires a smaller homing
interceptor (warm trail, 2.5× faster) from its mast; on contact — flash,
expanding shockwave ring, and a 60-spark firework burst (reuses `FW`).

**Game integration notes:** the scene now has hero objects on **both** sides —
the Burj + fountain/lake on the right (design x≈1280–1430) and the Ain Dubai
wheel + drone light show on the left (x≈290–530) — so the calm band is the
**center** (x≈620–1100 upper sky); put the game column there. The drone show is
deliberately parked left, just below the moon, to stay out from under a centered
card. The click handler already lives on `document` with the UI filter (so the
form above the stage doesn't swallow scene clicks). Skin direction: deep navy
glass, warm amber accents (`#FFB54D`-ish), white text. **Aids variant ready:**
`aids/dubai.aids.js` (helicopter number line + gold-coin vault + palm garden) —
set `aids:'dubai'` in the module.

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

## unicorns.html — unicorn valley (the 🦄 theme, integrated)

Static prerender (`skyLayer` via `paintScenery`: candy sky, sun halo, three
mountain ridges with snow caps, rainbow, princess castle on a broad earthen
**mound that connects down into the foreground hills** so it sits on the ground,
hills, 90 meadow flowers) + dynamic layer.

**Dynamic systems:** 6 drifting candy `CLOUDS` (white→pink `tint`), 42 twinkling
`SPARKLES`, 26 falling `PETALS`, 8 rising `HEARTS`, 3 `BUTTERFLIES` (hues
`#FF6FB5`/`#C77DFF`), **2 winged flyers** (`FLYER`, sparkle ribbon trails),
**roaming `UNICORNS`** (solo wanderers — `spawnUnicorn`), castle-burst
butterflies (`CASTLE_BFLY`), an ambient scenery scheduler, click `BURSTS`.
**Kept light: at most 5 unicorns on screen at once** — 2 sky flyers + 3 roaming
(`FLYER` length 2, `UNICORNS` length 3).

**Roaming unicorns** (like the savanna herds): each walks the meadow and slips
out an edge, then a fresh one re-enters from a side (`Object.assign(u,
spawnUnicorn(false))`), keeping ~5 solo on stage. Mixed colours via `u.pal` —
the classic white+rainbow (`null`), `CYAN_PAL`, `PINK_PAL` (`UNI_PALS`).

**The unicorn rig** — `drawUnicorn(x, y, sc, dir, t, ph, pose, opts)`: one
continuous silhouette + two-segment legs + feathered wings (`drawWing(spread)`);
poses `'stand'` (idle sway), `'walk'` (diagonal-gait leg swing from `opts.wt`)
and `'fly'` (gallop legs, full wingspread). `opts` carries the colour palette
(`body/out/bodyFar/outFar/mane`, defaulting to white+rainbow) and the walk
clock. Each unicorn wears a heart/star **cutie-mark** emoji on its haunch
(per-`ph`, counter-flipped so it stays upright facing left). The big sparkly eye
**blinks** on a per-unicorn cadence (~3.6 s, staggered by `ph`) — the eye squishes
shut and shows a soft content lid curve, then reopens. The belly/neck shading is
clipped to the body silhouette so it never spills past the outline.

**Actions** (click + per-unicorn random schedule, same code path):
- **jump** (0.9 s parabola), **rear up** (1.25 s, pivot on hind hooves),
  **spin** — an eased 360° somersault around the body centre (`'fly'` legs) — or
  a **toot** (`drawFarts`), coloured **green or pink at random** per toot
  (`act.pink`, tagged onto each puff); stored in `u.act {type, t0}`. While acting a unicorn stops
  walking; otherwise it uses the `'walk'` pose.
- Flyers: **somersault** — one eased 360° (`f.act`).
- Schedule: first act 4–16 s after load, then every 8–26 s via `nextActAt`.
  The random pick is **jump / rear / spin / fart / horn with equal odds**, so a
  unicorn often fires a bolt/nova from its horn on its own (not only on the 5th
  click or the 3-min timer). Clicks additionally pop a 14-particle sparkle+heart
  burst (`BURSTS`).
- **The castle** → click it for a **butterfly burst**: 16–23 butterflies fly
  out and flutter away (`spawnCastleButterflies`/`drawCastleButterflies`),
  alongside the golden window-flare halo (`CASTLEFX`).
- **The rainbow** → click its upper arch band to make it **shimmer** — a colour
  pulse sweeps along the arc (`RAINFX`/`drawRainbowFx`, ~3 s).
- **The sun** (`SUN`, ~0.76W, 0.20H) → clicking it just **spins the sun**
  (sunspots sweep the disc + corona rays rotate, `sunBoostT`/`drawSunSpin`/
  `clickEnv`) and pops a sparkle burst. (It no longer launches a sky unicorn.)
- **Ambient scenery** — independent of clicks, the scene celebrates on its own:
  every ~10–25 s (then ~15–40 s) a coin-flip fires either the rainbow shimmer
  (`RAINFX`) or the castle window-flare halo (`CASTLEFX`) — `nextSceneryAt`.

**The horn & its effects** — each unicorn carries a slim spiralled golden horn
(tapered body with a gold gradient, 7 ridge chevrons; the tip glow + sparkle
**twinkle only briefly once every ~26 s** on a per-unicorn cycle — `TWK_PERIOD`/
`twk`, staggered by `ph` — calm and dim in between, not a constant pulse).
Every **5th click** on a unicorn (`HORN_EVERY`, `hornClicks`) fires a horn
effect via `fireHornFx(u, t, force)` — randomly a **lightning bolt** (a jagged
forked spear up-and-forward from the tip, `drawHornBolt`) or a **supernova**
(ported from `success-supernova.js`, scaled to the horn tip: infall collapse,
brightening core, shock ring, ejecta, pulsar — `drawHornNova`). Effects live in
`HORNFX` and draw last (on top, `drawHornFxAll`). Firing sets `u.recoilT0`, so
the unicorn is **knocked backward** (a ~0.5 s impulse — `recX` shoves it
opposite its facing, with a small upward kick + backward tilt; applied to the
drawn body, the rotation pivot and the shadow) for a recoil/kickback look.
The same effect also fires **periodically — once every 3 minutes**
(`HORN_AUTO_EVERY_SEC`, `hornTimerStart`): on the tick a random on-stage idle
unicorn fires (mirrors the scheduled-toot cadence).

**Game integration:** **fully integrated** as the `girls` theme — `unicorns.bg.js`
registers `BACKGROUNDS.unicorns` with `skin:'unicorns'`, `aids:'unicorns'`, loaded
on demand by `bg-loader.js`; `unicorns.html` is its thin dev harness. Standing
unicorns occupy the bottom ~20%; flyers cross the top ~35% — the game column fits
**center**, between those bands. Skin: white-pink glass (`game/skins/unicorns.skin.css`),
`#FF6FB5`/`#C77DFF` accents. Aids variant: `aids/unicorns.aids.js` (unicorn number
line with a rainbow trail + crystal cupcake jar + crystal-flower garden).

---

## unicorns2.bg.js — Unicorn Valley v2 (BUILT, **NOT ADOPTED** — nothing loads it)

> **Status:** written 2026-09 as a from-scratch alternative to the unicorn
> valley, then **rejected on review** — the original `unicorns.bg.js` scene
> (section above) reads better, so `_BG_THEMES` keeps `girls→unicorns` and no
> theme points here. The files stay in the repo as a reference/starting point;
> delete them if the idea is dropped for good. Everything below describes what
> the module does when mounted (its harness still runs it standalone).

**`unicorns2.bg.js`** — the unicorn valley rebuilt from scratch as ONE
self-contained canvas module (no DOM actors, no sub-files), structured like
`savanna.bg.js`: prerendered sky + scenery layers repainted only while the
palette drifts, an actor layer tinted by the hour, per-frame ambient life on
top. Registers `BACKGROUNDS.unicorns2` with `skin:'unicorns'`,
`aids:'unicorns'` (it reuses the existing skin and aid art unchanged).
Harness: `unicorns2.html` (Dawn/Day/Sunset/Night jump the clock, Pause,
Fast ×20, Herd/Flyer spawn, Magic fires every effect, Restart); verify via
`python backgrounds/_verify_unicorns2.py` (in-game by default; set
`STANDALONE` to the harness path for the scene alone). Test hooks:
`window._uni2` — `tod/setTod/setSpeed/phase`, `herd/flyers/spawn/flyer/act`,
`fx.{rainbow,castle,fish,bloom,glitter}`, `castle/pond/fall` geometry,
`rumiLayer`.

**The day** — `DAY_SEC` = 240 s, four `LOOKS` keyframes interpolated across a
0.12-day window at each boundary (`phaseAt`/`lookAt`); the sky + scenery
layers are repainted only when the blend actually changes
(`repaintIfNeeded`). **DAWN** (peach-rose-lavender, a big soft sun low at the
LEFT), **DAY** (candy-blue, cotton clouds, a small bright sun), **SUNSET**
(pink-gold-violet blaze, the sun sinking at the RIGHT), **NIGHT** (indigo,
twinkling + shooting stars, a cratered moon in the top-right sky, AURORA
ribbons, fireflies, glowing mushrooms, lit castle windows; the actors are
tinted blue-violet via `source-atop`). The sun arc runs left→right (`sunP`);
the moon rides a lower arc that stays top-right (`moonP`) — both sit beside
the centred game card at their keyframes. Starts late in the dawn (`tod`
0.22).

**The valley** (fractions of W/H; the game card covers x 23–77 %, y 0–56 %
at 1280×800, so every hero sits outside it): two lilac `mountainRange`s with
snow caps at the horizon (0.63 H); the RAINBOW (`RB`: centre 0.5 W / 0.66 H,
r = min(0.36 W, 0.58 H), six pastel bands, alpha per look — a faint moonbow
at night) drawn behind the mountains; the CASTLE on a hill at the RIGHT
(`castleLayout`/`paintCastle`: keep wall with merlons, a golden gate + heart,
five towers with purple conical roofs and gold bands, arched windows whose
positions feed the live night glow, fluttering pennants); the CLIFF at the
LEFT (`cliffPath`/`paintCliff`: lilac rock with strata, a light→shade
gradient, bushes, a blossom tree) with the WATERFALL (`FALL`, 0.105–0.15 W ×
0.48–0.75 H: scrolling streaks, a white lip, pulsing mist, ripples clipped to
the pond) into the POND (`POND`, 0.13 W / 0.758 H, lily pads; catches the
sun/moon in `drawPondLight`); four `hillBand`s of meadow with 340 flower
dots; foreground grass tufts, 14 big swaying flowers, 4 mushrooms. Ambient:
7 drifting cotton-candy clouds (dimmed at night), 20 falling petals, 30
twinkling sparkle motes, 4 butterflies by day, 16 fireflies by night, a rose
vignette.

**The unicorn rig** (`drawUni(c, L, t)`, module scope, rig units × `L.s`;
`UNI.WIDTH/HEIGHT` for the hit boxes): three parts — `bodyPath`, `neckPath`,
`headPath` — each stroked with a fat outline first and filled after, so the
union has one clean outline; the head group is scaled about `HEAD_PIVOT`
(×1.12 adults, ×1.28 foals — big-headed foals). Two-segment legs
(`legAngles`/`drawLeg`, hips `LEG_HIND`/`LEG_FRONT`, 21+21 units) with golden
hooves and a diagonal-pair gait — knees bend on the forward swing, wider and
faster for `gallop`; in the air (`L.fly`, `L.leap` during a jump) the front
legs tuck and the hind legs stretch; `L.rear` lifts the front legs pawing
while the body rotates about the hind hooves; `L.bow` rotates neck + head
down to graze. A flowing tail (5 strands) and mane (6 strands off the crest
cubic via `crestPt`, plus a forelock) wave with `t` and stream back when
moving; the spiralled golden horn (`drawHorn`: gold gradient, 6 ridge
chevrons) twinkles briefly every ~26 s and glows during horn magic; a big
eye with lashes that blinks every ~3.6 s (staggered by `L.ph`), blush,
nostril, smile; a star or heart cutie-mark; feathered wings (`drawWing`, 5
feathers, flapping) on the flyers. `PALS`: classic white + rainbow mane,
pink/lilac, lilac/mint, mint/pink, sky/gold, and a rare (8 %) midnight one.

**Cast** — WALKERS (`HERD`, ≤4 incl. foals): groups spawn from an edge
(`spawnGroup`) in depth lanes (feet at 0.80–0.96 H, scale by lane), singles
or mother + foal (the foal trots behind its parent — `updateWalker` lerps to
a spot behind — and copies its jumps a beat later via `mimicAt`); ~30 %
gallop with rainbow stardust from the hooves; the valley opens with a pair
at the left and a single at the right and never empties (cadence
`nextGroupAt` while adults < 2). FLYERS (`FLYERS`, ≤2): winged unicorns
cross the sky at 0.10–0.33 H trailing a rainbow sparkle ribbon and
somersault (`flip`). Acts (`ACT_DUR`, `startAct`/`pickAct`/`actFx`, on a
schedule AND on click): **jump** (parabola, legs stretched, dust), **rear**,
**horn** (rainbow `RINGS` + 16 sparkles + 3 white stars from `hornTip`),
**toot** (rainbow `PUFFS` from the rear + an embarrassed shimmy), **graze**
(scheduled only). ❤ (`HEARTS`, drawn hearts) when two adults meet face to
face. Ground shadows lean away from the sun and fade at night.

**Clicks** (document listener + the game-UI filter, `onClick`): a unicorn →
act · the castle box → `fireworks` (3 staggered bursts + rings + a window
flare) · the pond → `fishLeap` (1–3 rainbow fish arcs with splashes) · the
SUN / MOON / WATERFALL → tween the clock to the next phase centre (2.6 s; the
falls are always visible beside the card) — the sun also spins its rays · a
cloud → `glitter` rain · the rainbow band → `rainFx` shimmer sweep · the
meadow (y > 0.66 H) → `bloom` (6–9 flowers grow where you click, fade after
~10 s) · the sky → `skyBurst`. Ambient on its own every 12–30 s: the rainbow
shimmers or the castle windows flare; fish leap every 25–50 s. "Rumi"
(`rumi/chibi-walker.js`, loaded relative to this file, warmed by
`preload()`) strolls the meadow every 2–4 min, first after 1–3 min.

The frame loop schedules the next rAF before rendering and logs a render
error once, so a bad frame can never freeze the valley. `cleanup()` stops the
loop, Rumi's patrol and both listeners and empties the stage.

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
| `low` (start) | 0.42× | 120 | on | 1.25 |
| `medium` | 0.62× | 200 | off | 1.5 |
| `high` | 0.82× | 280 | off | 2.0 |

`AUTO_QUALITY` (on) starts at `low` and adapts on an EMA of the frame time
(`emaMs`): above 27 ms → down a tier; below 11 ms → up, but only ≥30 s after the
last downshift and ≥6 s after any change. Every change rebuilds the targets,
re-caps the 2-D canvas (`apply2DScale`) and re-bakes the sky. Where the cost
went:

- **The sky is baked.** The procedural sky (~60 hashes + three black-body curves
  per pixel) was the single biggest cost, and neither the camera nor the sky
  ever moves — so `bakeSky`/`SKYBAKE_FS` render it **once per layout/tier** into
  `T.sky`, covering the frustum plus a margin (`M = 0.7` in tan-plane units) for
  rays bent in from outside the frame, and `skyLookup` just samples it. No bake
  yet → each lookup falls back to the procedural path, so a frame is never wrong,
  only slower.
- **`lite` tiers** cut `fbmDisk` to three octaves, halve the jet samples and skip
  the GL star layers entirely (upscaled from 0.3× they were soft blobs anyway —
  the 2-D layer's stars stay crisp).
- **The GL layer ignores `devicePixelRatio` on purpose**: a retina screen must
  not quadruple the ray-marching work. Only the 2-D layer scales with the DPR,
  and the tier caps that too.
- **The 2-D layer does no full-screen blits at all**: the vignette moved into the
  GL composite, the constellations are drawn straight onto the canvas, and the
  Sun's granulation tile is filled only inside the Sun's cap.

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
  **Default is `medium`** (`?q=` overrides). `?q=auto` adapts on the frame-time
  EMA the same way space2 does — down above 27 ms, up below 10.5 ms after a
  quiet 30 s — but it never climbs past `high`; `ultra` is a deliberate choice.
- **More dust.** `NP = 1000` grains (vs 260), and here they *are* drawn in GL:
  velocity-stretched instanced streaks through the point-mass lens, inside the
  same HDR target, so they bloom. The full-resolution pass makes that look
  right; the in-game low-res pass did not, which is why space2 draws its grains
  on the 2-D layer instead.
- **The same everything else**: Binet-form geodesics, the analytic weak-field
  bend for rays that miss the marching sphere, the Novikov–Thorne disk with
  Doppler beaming + gravitational redshift and two trailing spiral arms,
  volumetric jets, the plasma halo (`HALO_GAIN = 0.11`), the baked procedural
  sky (`bakeSky`, once per resolution change), HDR → 3-level bloom → ACES, and
  the 8-bit sqrt-encoded fallback.
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
plum **volcano on the RIGHT** trailing smoke, a rolling green valley floor with
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

**Game position — the card hugs the LEFT so the volcano stays clear** (crater
≈ x0.775·W, left flank from ≈ 0.56·W): `game/skins/dinosaurs.skin.css` pins
`.wrap` to the LEFT (`max-width:min(700px, 50vw − 0.5cm)`; re-centres on
≤840px screens). Skin: `dinosaurs.skin.css` (warm dusk glass, sunset-gold /
grass-green accents). Aids: `dinosaurs`. Theme wiring: `_BG_THEMES.dinosaurs →
dinosaurs3`, `THEMES.dinosaurs`, `body.theme-dinosaurs`, the 🦕 menu button +
toggle-cycle entry (themes.js, index.html), and `dinosaurs.skin.css`. Dev
harness: `dinosaurs3.html` (Restart / Erupt / Storm / Egg / Night); verify via
`_verify_dino3.py` (STANDALONE or in-game mode). Test hooks: `window._dino3`
= `{ seek, erupt, boom, storm, egg, spawn, ptero, act, walkers, look, tod }`.

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
