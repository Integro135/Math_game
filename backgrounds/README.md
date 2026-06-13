# Backgrounds — structure & game-integration guide

This folder holds the game's swappable scene backdrops. Two kinds of files live here:

| Kind | Files | Status |
|---|---|---|
| **Game-ready module** (`<name>.bg.js`) | `space.bg.js`, `unicorns.bg.js`, `dubai.bg.js`, `reef.bg.js` | Loaded by the game at runtime |
| **Thin dev harness** (`<name>.html`) | `space.html`, `unicorns.html`, `dubai_skyline.html`, `underwater_happy_reef.html` | Dev-only; opens its `.bg.js` module directly in a browser (single source of truth) |

Theme → background mapping (`_BG_THEMES`, themes.js): `girls→unicorns`,
`galaxy→space`, `reef→reef`, `dubai→dubai`, `savanna→savanna` (🏙️ and 🦁 are
their own themes in the menu). Canvas-scene themes spawn no floating emoji
particles. Note: a new theme also needs a `body.theme-<name> #stars-layer
{display:block}` rule in themes.css, or the stage stays hidden.

**savanna.bg.js — Pride Rock at sunset.** The showpieces are the animals:
a male LION on the rock tip (layered wind-rippled mane, breathing torso,
blinking amber eye, swishing tufted tail, sunset rim light) with a LIONESS
on the slope; CHEETAHS (tear marks, ringed white-tipped flicking tail,
clipped spot coats, ear twitches, scanning gaze) — one seated on the lower
ledge, one standing watch on the plain; a ZEBRA built on the unicorn rig
(same silhouette + two-segment legs, walk cycle, clipped stripes, brush
mane) and a GIRAFFE, both patrolling the plain with grazing pauses and
turn-arounds. EVERY animal moves: the standing cheetah patrols the plain
with jointed walking legs, and the lion & lioness pace the rock itself
(jointed legs + `yFn` keeps their paws on the sloping ridge; the sitting
cheetah stays seated). Acts on a random schedule AND on click
(`animalAct`/`drawWithAct`, document listener + UI filter): jumps (everyone),
rear-ups (lion, zebra), green toots (everyone, per-animal vents), the lion's
ROAR (head back, jaw drops open with fangs, expanding shockwave rings,
whole-frame screen shake), the plain cheetah CHASING ITS TAIL (rapid
about-faces + kicked dust) and DUST ROLLS for the zebra & lioness (billowing
brown cloud — the `FARTS` system with a `col:'dust'` palette).
Two more patrollers: an ELEPHANT (flapping ear, tusks, columnar legs with
toenails, posable trunk — acts: TRUMPET with sound rings, and a dust SHOWER
where the trunk curls over the back and rains dust on it) and an OSTRICH
(fluffy plume, white wing patch, strut head-bob, blinking eye — signature
act: BURIES ITS HEAD IN THE SAND, body tipping tail-up with a sand mound
and kicked dust). Acts choreographed inside their draw fns via `actP`;
`window._savAnimals` exposes the cast for harness/test automation. Scene: blazing sunset, hazy plains, acacias, the Pride Rock
promontory with its support column and lower ledge, bird flocks, golden
dust motes, swaying foreground grass. Skin: `game/skins/savanna.skin.css`
(game column center-right; the rock stays visible). Aids: classic.

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

## dubai_skyline.html — Dubai at dusk

Canvas painting in a fixed **1600×900 design space** (`DW×DH`, waterline
`HZ=780`), cover-fitted and bottom-anchored to the window (`scale/ox/oy`); all
hit-tests map screen→design through those. Static scene (sky, skyline, Burj,
water + flipped-image reflection, vignette) prerenders into `off` once per
resize; the per-frame layer draws only lights and effects.

**Scheduled shows** (constants at the top of the script):

| Show | Constants | Cadence |
|---|---|---|
| Burj LED facade show | `SHOW_PERIOD=180, SHOW_LEN=22` | 22 s every 3 min |
| Fireworks off the Burj's sides | `FW_PERIOD=120, FW_LEN=5` | 5 s every 2 min |
| Fountain choreography (5 movements) | `FN_PERIOD=210, FN_LEN=30` | 30 s every 3:30 |
| Black oil gusher at sea | `OIL_PERIOD=150, OIL_LEN=8` | 8 s every 2.5 min |

`*_OFFSET` constants make every show's first run land seconds after load.

**Always-on systems:** per-building accent lighting — each tower has its own
`anim` scheme (`edges/crown/scan/pulse/sail/twist/museum/frame/bridge`) with its
own hue & speed; slowly switching windows (`b.dyn`); twinkles (`TWK`); aviation
beacons (`BEACONS`); 3 helicopters (`HELIS`, one with a sweeping searchlight);
6 patrol drones (`DRONES`); leaping dolphin pods (`DOLPHINS`); water glints
(`SPARKS`); a crossing aircraft.

**Click interactions** (`cv` click → design coords):
- **Burj Khalifa** (`BX±60`) → 50/50 random: manual LED show (12 s,
  `mShowStart/End`) or fireworks burst (5 s, `mFwStart/End`) — merged with the
  scheduled envelopes via `Math.max`, so overlaps stay smooth.
- **The fountain** → a manual 20 s show (`mFnStart/End`).
- **Burj Al Arab** → scrambles the missile-defense show (+6 s light-up).
- **Any other building** → `b.boostStart/boostUntil` (6 s `clickBoost`): all its
  windows switch on and its accent lighting flares ×2.4.

**Missile-defense show** (`MIS`/`drawMissiles`, once every 6 min + on Burj Al
Arab click): an emoji 🚀 streaks in from the right with a gray smoke trail;
when it closes past x≈1050 the Burj Al Arab fires a smaller homing
interceptor (warm trail, 2.5× faster) from its mast; on contact — flash,
expanding shockwave ring, and a 60-spark firework burst (reuses `FW`).

**Game integration notes:** the hero objects are the Burj (design x≈1280–1430,
right side) and the fountain/lake below it — put the game column **center-left**
and keep the right third clear. Skin direction: deep navy glass, warm amber
accents (`#FFB54D`-ish), white text. Click handler must move to `document` +
UI filter when ported (checklist §3). **Aids variant ready:** `aids/dubai.aids.js`
(helicopter number line + gold-coin vault + palm garden) — set `aids:'dubai'`
in the module.

---

## underwater_happy_reef.html — coral reef

Static prerender (`staticLayer`: water gradient, sun bloom, sand, coral garden
via the `paint*` family) + `vigLayer` vignette; everything alive is drawn per
frame between them.

**Creatures & systems:** sun `RAYS`, sediment `MOTES`, seep `BUBBLES`, fusilier
`SCHOOL` (leader + 18 followers), `KELP`, `GRASS`, two `ANEMONES` hosting six
clownfish (`NEMOS`), 2 blacktip `SHARKS`, 3 blue tangs (`DORIES`) each with a
clownfish `buddy`, 2 bottlenose `DOLPHS`, a `CRAB`, a `PUFFER` that balloons
every ~2 min, the butterflyfish couple `BUTTERS` (with heart), a treasure
`CHEST` that opens every ~2.5 min.

**Poop system** (`updatePoop`): every fish goes once per ~3 min (staggered
starts); the strand trails from the vent, detaches, sinks and fades. State lives
on each fish object (`poopAt`, `poop`).

**Action system** (clicks + random schedule share one path):
- `fishTargets(t)` — every clickable fish with its *live* position and padded
  hit ellipse (`kind`: `shark/dory/buddy/dolphin/puffer/bfly/nemo/school`).
- `doFishAct(h,t)` — per-kind reaction, always with a bubble puff (`FXBUB`):
  sharks **dash** (`dashT`, ×4 speed envelope), tangs & dolphins **dash or
  barrel-roll** (`rollT`, one eased 360°), puffer **inflates on demand**
  (reuses `puffStart`), butterflies **emit hearts** (`FXHEARTS`), anemone
  clownfish **hide in the tentacles** (`hideT`), the school **scatters and
  regroups** (`scatterT` + per-member `kix/kiy`).
- Scheduler: every 4–12 s (`nextFishActAt`) a random fish acts on its own,
  and ~25% of the time it also poops.
- Click = nearest hit fish → its action only. **Pooping is never click-driven**
  — it happens only on the `updatePoop` timer and the random scheduler.
- Extra life: dolphins also **blow bubble rings** (`FXRINGS`) and **surface for
  a breath** every ~minute (arc to the top + white blow mist, `FXPUFF`); a
  *clicked* anemone clownfish **darts out of the anemone for a loop** (`outT`,
  the scheduler keeps the shy hide); a charging shark near the school
  **startles it into scattering**; the **treasure chest opens on click** too
  (`openChest`, shared with its schedule).
- Passing giants (`updateGiant` + `WHALE`/`ORCA`): a **blue whale ~20× the
  dolphin** glides past the surface every 2.5–4 min (mottled back, throat
  grooves, slow flukes), and an **orca ~5×** (eye patch, saddle, towering
  dorsal) cruises through every ~1.5–2.5 min. Both drawn behind the reef life.

**Game integration notes:** fish cross the whole frame; the calmest region is
the open water **top-center** — good spot for the game column. Sand + corals
occupy the bottom ~15%. Skin direction: aqua glass, sandy-gold accents. The
`#toggle` pause button is harness-only (checklist §5). **Aids variant ready:**
`aids/reef.aids.js` (dolphin number line + pearl treasure chest + coral
garden) — set `aids:'reef'` in the module.

---

## unicorns.html — unicorn valley

Static prerender (`skyLayer` via `paintScenery`: candy sky, sun halo, three
mountain ridges with snow caps, rainbow, princess castle, hills, 90 meadow
flowers) + dynamic layer.

**Dynamic systems:** drifting candy `CLOUDS`, twinkling `SPARKLES`, falling
`PETALS`, rising `HEARTS`, 3 `BUTTERFLIES`, 3 winged flyers (`FLYER`, sparkle
ribbon trails), 3 standing `UNICORNS` (two adults + a foal), click `BURSTS`.

**The unicorn rig** — `drawUnicorn(x, y, sc, dir, t, ph, pose)`: one continuous
silhouette + two-segment legs + feathered wings (`drawWing(spread)`); poses:
`'stand'` (idle sway, folded wings) and `'fly'` (gallop legs, full wingspread).
Actions reuse the `'fly'` pose mid-move instead of new rigs.

**Actions** (click + per-unicorn random schedule, same code path):
- Standing: **jump** (0.9 s parabola, nose follows the arc, airborne shadow
  shrinks) or **rear up** (1.25 s rotation pivoted on the hind hooves) —
  random pick; stored in `u.act {type, t0}`.
- Flyers: **somersault** — one eased 360° (`f.act`).
- Schedule: first act 4–16 s after load, then every 8–26 s (flyers 3–13 s /
  6–20 s) via `nextActAt`; clicks additionally pop a 14-particle sparkle+heart
  burst (`BURSTS`) at the click point.

**Game integration notes:** this is the next planned port (architecture.md §5).
Standing unicorns occupy the bottom ~20%; flyers cross the top ~35% — the game
column fits **center**, between those bands. Skin direction: white-pink glass,
rounded corners, `#FF6FB5`/`#C77DFF` accents. The `#toggle` button is
harness-only. **Aids variant ready:** `aids/unicorns.aids.js` (unicorn number
line with a rainbow trail + crystal cupcake jar + crystal-flower garden) —
set `aids:'unicorns'` in the module.

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
