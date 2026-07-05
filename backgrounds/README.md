# Backgrounds — structure & game-integration guide

This folder holds the game's swappable scene backdrops. Two kinds of files live here:

| Kind | Files | Status |
|---|---|---|
| **Game-ready module** (`<name>.bg.js`) | `space.bg.js`, `unicorns.bg.js`, `dubai.bg.js`, `reef.bg.js`, `savanna.bg.js`, `dinosaurs2.bg.js` | Loaded by the game at runtime |
| **Thin dev harness** (`<name>.html`) | `space.html`, `unicorns.html`, `dubai_skyline.html`, `underwater_happy_reef.html`, `dinosaurs2.html` | Dev-only; opens its `.bg.js` module directly in a browser (single source of truth) |
| **Reusable scene parts** (`dinasours/*.js`) | `baby-trex-egg.js` | The rolling/hatching egg, loaded on demand by `dinosaurs2.bg.js`. (The old `volcano.js`/`meteor.js`/`*-walker.js` modules were removed when the self-contained `dinosaurs2.bg.js` replaced the composed `dinosaurs.bg.js`.) |

Theme → background mapping (`_BG_THEMES`, themes.js): `girls→unicorns`,
`galaxy→space`, `reef→reef`, `dubai→dubai`, `savanna→savanna`, `dinosaurs→dinosaurs2`
(🏙️, 🦁 and 🦕 are their own themes in the menu). Canvas-scene themes spawn no
floating emoji particles. Note: a new theme also needs a `body.theme-<name>
#stars-layer {display:block}` rule in themes.css, or the stage stays hidden.

**savanna.bg.js — Pride Rock at sunset.** Two animal systems:

*The resident pride* lives on Pride Rock (flush to the left screen edge so its
base/“start” is hidden, drawn BEHIND the foreground plain so animals walk in
front of it). It never leaves: a male LION (layered blob mane with depth/shade
layers, breathing torso, blinking amber eye, swishing tufted tail), a LIONESS,
a medium-sized lioness and a CUB. All pace the full ridge from the left edge to
the overhanging tip via `updateWalker` + the shared `ridgeY` (paws ride the
sloping ridge; `hi` keeps the lion’s front legs from walking off the tip). The
two young lionesses wear a pink hair-ribbon bow. A floating ❤️ appears only
while two pride members meet FACE-TO-FACE (from ~½cm before contact through
~1cm of overlap). The lion’s ROAR is on a slow cadence — once every 5 minutes
OR every 5th click on the lion — and fires 3 sky lightning bolts + expanding
shockwave rings + a whole-frame screen shake.

*Roaming herds* cross the plain, one species at a time (up to 2 concurrent):
ZEBRA, OSTRICH, ELEPHANT, GIRAFFE, LION (lionesses) and CHEETAH (built on the
lioness rig — slimmer tucked belly, black coat spots, tear-stripes, a thin
black-tipped tail). A herd is 1–4 grown members plus a few medium/small
(cub-sized) ones; it enters from a side, ambles across and exits, then a
different herd arrives. Per-individual colour variety via a cheap `shade()`
(lighter/darker lionesses & elephant greys) plus browner giraffe-spot variants.
Speeds: cheetah ≈10×, ostrich ≈5×, ground-lionesses ≈2× the other animals.
Acts on a random schedule AND on click (`animalAct`/`drawWithAct`, document
listener + UI filter): jumps, rear-ups, dust ROLLS (zebra/lioness), the
cheetah’s tail-chasing SPIN, the elephant’s TRUMPET (sound rings) and dust
SHOWER, the ostrich’s head-BURY, and rarer green toots (~⅓ as frequent). The
grounding shadow is drawn in world space so it stays flat during jumps/rears.
**Every animal blinks** — the eye scales shut briefly on its own `pow(sin(t·k +
ph), 240)` spike (lion, lioness/cub, cheetah, ostrich, zebra, giraffe, elephant).
The sine frequency `k` sets the *interval* between blinks; the high exponent
keeps each individual blink fast/snappy (~0.36 s closed) without changing that
interval.

Sky & scenery: layered snow-capped mountains, a low SUN that — when clicked —
spins (sunspots + corona rays) AND sends a flying unicorn across the sky;
drifting puffy clouds (ported from the unicorns scene), bird flocks, golden
dust motes, twinkling stars + occasional shooting stars, hazy far plains,
acacias and extra flora (baobab, round trees, doum palm, aloes, tall grass),
swaying foreground grass. `window._savAnimals` exposes the pride + `herd()` for
harness/tests. Skin: `game/skins/savanna.skin.css` (game column lower-right so
Pride Rock and the lions stay visible). Aids: `savanna` (cheetah number-line
rider + amber fruit jar).

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

`space.bg.js` is the reference port — diff it against `space.html`'s harness to
see the seam. For each playground:

1. **Wrap the whole `<script>` body** in the module shape above. Everything that
   is global in the playground (`let CLOUDS…`, helper functions) moves inside
   `init`'s scope — the game loads several modules into one page, so top-level
   globals will collide.
2. **Create the canvas inside `stage`**, not on `document.body`:
   `stage.innerHTML=''` then `stage.appendChild(cv)`; keep
   `position:fixed;inset:0;width:100%;height:100%`.
3. **Move the click listener from the canvas to `document`** and filter out the
   game UI first (the game's form sits *above* the stage, so canvas clicks never
   fire). Copy the filter from `space.bg.js`:
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
   `space.html` — single source of truth, no copy-porting.

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
envelope borrowed from `space.bg.js`.

**Game integration notes (when ported):** the lake bottom ~26% and the aurora
band (top ~20–60%) are the busy zones; the calm strip is the horizon line
(mountains/pines, ~mid-frame) — but the scene is symmetric, so the game column
fits **center** comfortably. Skin direction: deep-navy glass, teal/mint accents
(`#8ff0d0`-ish), cool white text.

---

## dubai_skyline.html — Dubai at dusk

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

## unicorns.html — unicorn valley

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

## space.bg.js — deep space (already integrated)

The reference module: registered as `BACKGROUNDS.space` with `skin:'space'`,
`aids:'space'`; `space.html` is its thin dev harness. Scene inventory and the
discovery-bubble (click-to-learn facts) are documented in the file header.

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

## dinosaurs2.bg.js — volcano valley at dusk (the 🦕 theme, integrated)

The 🦕 theme is served by **`dinosaurs2.bg.js`** — a single self-contained module
that draws its OWN art (SVG/WAAPI, ES5, file://-safe, all classes/keyframes
`d2`-namespaced). It replaced the older `dinosaurs.bg.js` (which composed separate
`dinasours/volcano.js` + `*-walker.js` modules); those building-block modules were
removed. The one external dependency it still loads on demand is
`dinasours/baby-trex-egg.js` (the rolling egg), warmed during the intro splash via
`mod.preload()`.

**Scene:** sunset sky with a slow day-cycle + twinkling stars, drifting clouds,
snow-capped mountain ranges, and a plum **volcano on the RIGHT** (click → erupt +
countdown; every 10th click → a meteor storm). Foreground grass with lush plants.

**Dinosaurs:** from-scratch SVG walkers (bronto, stego, trex, + the two original
quadrupeds trikec/stegoc) plus a flying **pterodactyl**. Every species appears in
several palettes (green/pink/teal; the ptero in coral/violet/sky/sun) and 2 sizes.
**Clicking a dino recolours it** (and plays its reaction). The scene is kept calm:
**max 2 ground dinos + 1 pterodactyl + ~1 egg** at a time.

**Eggs arrive, never fixed:** the pterodactyl LAYS an egg mid-flight — usually a
**hatching** egg (falls, cracks open, a baby peeks out, then fades) or a rolling
egg; one legacy `BabyTrexEgg` also rolls across occasionally. Shooting stars use
the Dubai look (white head + icy-blue gradient tail).

**Game position — the card hugs the LEFT so the volcano stays clear.** The volcano
sits on the RIGHT, so `game/skins/dinosaurs.skin.css` pins `.wrap` to the LEFT
(`max-width:700px`, nudged right of the left edge; narrowed to 600px on ≤1120px
windows; re-centres on ≤840px screens).
Skin: `dinosaurs.skin.css` (warm dusk glass, sunset-gold / grass-green accents).
Aids: `dinosaurs`. Theme wiring: `_BG_THEMES.dinosaurs → dinosaurs2`,
`THEMES.dinosaurs`, `body.theme-dinosaurs`, the 🦕 menu button + toggle-cycle
entry (themes.js, index.html), and `dinosaurs.skin.css`. Dev harness:
`dinosaurs2.html` (Restart / Gallery); verify via `_verify_dino2.py`.
