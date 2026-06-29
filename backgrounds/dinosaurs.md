# Dinosaurs background — guide

The 🦕 **dinosaurs** theme: an erupting volcano valley at dusk where dinosaurs roam
in herds. It's a full, game-integrated background pack (`theme === 'dinosaurs'`),
composed at runtime from small reusable modules — no art is duplicated.

> Quick map: `dinosaurs.bg.js` is the orchestrator; everything it draws lives in
> `backgrounds/dinasours/*.js`. There are **no standalone preview HTMLs** anymore
> — to see/iterate the scene, load the game and pick the 🦕 theme (or point the
> `_verify.py` harness at the game with `THEME="dinosaurs"`).

---

## What's on screen

A single full-frame **volcano backdrop** (sunset radial sky, drifting clouds,
twinkling stars, three snow-capped mountain ranges, an erupting volcano sitting
*behind* the ranges so only its summit + lava plume show, and a foreground grass
band) with life on top:

- **Dinosaur herds** cross the grass in **packs of 2–4** — a grown leader plus
  smaller young (down to a baby), one species at a time, alternating direction,
  savanna-style (one pack, a gap, then a fresh pack). Every pack member gets a
  random **colour pack** so herds are mixed-colour.
- **Three species** rotate fairly (shuffled round-robin): 🦕 **triceratops**,
  **stegosaurus**, **T-Rex** (a running rig).
- **Two baby-T-Rex eggs** slowly **roll/tumble across** the grass (like the herds); tap one to stop it, hatch it, and recolour its shell — then it rolls on.
- **"Rumi"** the chibi strolls through on a long cadence (the same character the
  savanna uses).

---

## The pieces (all in `backgrounds/dinasours/`)

| File | Global | Role |
|---|---|---|
| `dinosaurs.bg.js` (in `backgrounds/`) | `BACKGROUNDS.dinosaurs` | the pack: registers `{skin,aids,init({stage})→cleanup}`, lazy-loads the modules below, composes the scene + herd scheduler |
| `volcano.js` | `Volcano` | the whole volcano scene (sky, clouds, stars, ranges, grass, erupting volcano) + lightning + the meteor-shower trigger |
| `tricera-walker.js` | `TriceraWalker` | a walking triceratops |
| `stego-walker.js` | `StegoWalker` | a walking stegosaurus |
| `trex-walker.js` | `TrexWalker` | a running T-Rex |
| `baby-trex-egg.js` | `BabyTrexEgg` | a stationary hatching egg |
| `meteor.js` | `MeteorShower` | a canvas meteor shower overlay (ported from `meteor.html`) |
| `../rumi/chibi-walker.js` | `ChibiWalker` | "rumi" the chibi (shared with savanna) |

Each walker/egg/volcano is self-contained (pure DOM/SVG/canvas + Web Animations,
no deps, file://-safe) and scopes all its CSS under its own root class so nothing
leaks onto the page. `dinosaurs.bg.js` resolves its own folder from
`document.currentScript`, so the same file works both in the game (page at root)
and from a harness.

---

## Interactions (click / tap)

| Click target | What happens |
|---|---|
| **The volcano** | a **BIG bubble eruption** (all lava bubbles burst out, wide + tall) + a lightning flash near the crater. A tiny **countdown on the cone** flashes for ~1 s on each press, counting **down 9 → 0** (0 = the click that fires the shower) so you can see it coming, then fades back out. |
| **The volcano — every 10th click** | a **meteor shower** (also fires on its own every **10 minutes**): all the dinosaurs first **run off the screen** (fast, ×15), then the sky fades to a dark "meteor night" and fiery meteors rain down + shatter on impact, then it fades back and the herds return. Runs behind the game UI. |
| **A triceratops / stegosaurus** | a random reaction (hop / stomp + dust / shake) + hearts |
| **A T-Rex** | a random reaction **and its colour changes** to the next pack (green → pink → green2 → …). Every 5th click it **ROARS** instead — head-back rattle + 3 lightning bolts + sky flash + shockwave rings (ported from the savanna lion). |
| **An egg** (rolling) | it **stops rolling, settles upright and plays its hatch**, **and its shell colour changes** (off-white → blue → pink → mint → yellow → …), then rolls on |

All click handlers first bail on the game UI (`.wrap,button,input,…`) so a tap on
the answer box/buttons is never swallowed by a creature behind it.

---

## Always-on behaviour

- **Volcano** erupts a calm lava plume forever; on its own it **flares + lightnings
  every ~16–30 s**. Bubbles + clouds animate via WAAPI (the original GSAP timeline,
  re-created — no GSAP dependency).
- **Twinkling stars** in the upper sky; **drifting clouds**; **snow-capped** ranges.
- **Blinking** — the triceratops, stegosaurus and T-Rex all blink (the T-Rex got a
  cute stego-style eye: big white eye, dark-green outline, big pupil, catchlight).
- **Herd scheduler** (in `dinosaurs.bg.js`): a shuffled round-robin picks the
  species (so the T-Rex shows up regularly), 2–4 members of decreasing size, a
  ~half-crossing gap so up to ~2 packs share the stage. A T-Rex pack also roars
  mid-crossing ~60% of the time.

---

## Colour packs

Every dinosaur supports three packs: **green** (default), **pink**, **green2**
(a teal/grass variant). Mechanism differs by rig but the option is uniform:

- **Triceratops / Stegosaurus** (SVG): `walk()/patrol({palette:'pink'|'green2'})`
  — a hex-swap on the SVG markup. (`TriceraWalker.svgMarkupFor('pink')` for raw.)
- **T-Rex** (CSS shapes): `walk()/patrol({palette:'pink'|'green2'})` — adds the
  `pal-pink` / `pal-green2` class to its `.dinosaur` element (CSS vars
  `--primary/-d10/-d20`).
- **Egg**: shell colour cycles on click via the `--bte-egg` / `--bte-egg-edge` vars.

The dinosaurs scene passes a random `palette` per pack member, so herds are mixed.

---

## Game integration & tunables

- **Theme wiring** (`game/js/themes.js`): `_BG_THEMES.dinosaurs='dinosaurs'`,
  a `THEMES.dinosaurs` entry, the `theme-dinosaurs` body class, the 🦕 menu icon,
  and a slot in the toggle cycle. The 🦕 button is in `index.html`; the
  `#stars-layer`/`#bg` fallback is in `game/css/themes.css`.
- **Skin** (`game/skins/dinosaurs.skin.css`): warm dusk glass, palette
  (sunset orange + leaf green), and the game card hugs the **left** so the
  volcano + plume on the right stay clear.
- **Aids** (`aids/dinosaurs.aids.js`): reuses the classic glass jar + flower
  garden + jump FX, but swaps the art to the dino theme:
  - the **number-line rider is a 🦖 T-Rex** (was the kangaroo). The engine assumes
    the rider rests facing **right** (forward) and flips it for backward hops, but
    the T-Rex emoji faces left by default — so the rider markup bakes in a
    `scaleX(-1)` to rest facing right (the engine's backward flip then composes
    back to left).
  - the **counted item is a bone 🦴** instead of a cookie — the tiny cookie SVGs
    washed out against the busy volcano backdrop. That single `jar.itemSVG` feeds
    both the bone **jar** aid and the **number-hover tooltip**, so both show bones.

  It derives from `classic` lazily (classic always boots first), so load order
  never matters.
- **Knobs**: volcano position/size + the meteor cadence live at the top of
  `volcano.js` (`VOL_TF`, `RAISE`, `METEOR_EVERY_CLICKS=5`, `METEOR_EVERY_MS`);
  the mountain ranges (`RANGES`), grass, stars (`STAR_N`) are there too. Pack
  size/frequency/colours and the egg/rumi placement live in `dinosaurs.bg.js`.

---

## Verifying

Use the shared harness (`backgrounds/_verify.py`, run with the identical
command — edit only its CONFIG block): set `THEME="dinosaurs"`, `STANDALONE=""`,
and dispatch clicks / `EVAL` snippets against the live scene in `#stars-layer`.
Clean teardown (theme-switch) removes every walker, the volcano, the meteor
overlay and all timers — verify nothing leaks.
