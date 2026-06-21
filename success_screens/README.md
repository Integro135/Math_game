# `success_screens/` — Celebration Screens

## 1. Overview

This folder holds the **celebration animations** that play after a correct
answer in the Hebrew math game. Each `success-<name>.js` file is a fully
**self-contained** screen: vanilla JS + DOM + Canvas, no libraries, no external
assets, runnable straight from `file://`. A file does only one thing on load —
it **registers itself** into the global registry:

```js
window.SUCCESS = window.SUCCESS || {};
window.SUCCESS.styles = window.SUCCESS.styles || [];
window.SUCCESS.styles.push({ name, supportsSuper, show });
```

The files are **not** referenced by `index.html`. Instead they are listed in the
`SUCCESS_FILES` manifest in `game/js/data.js`, and `game/js/bg-loader.js`
injects each one as a `<script>` tag at boot:

```js
// bg-loader.js
SUCCESS_FILES.forEach(f => _injectScript('success_screens/' + f + '.js'));
```

Once injected, every registered screen joins the host's random rotation
alongside the 5 built-in DOM/canvas styles in `success.js`. A second list,
`SUCCESS_SPECIAL`, injects **reward** screens (currently the gift) that register
into `window.SUCCESS.special` and are played only on a milestone — see §4.

The authoritative author brief is `../success_screens_spec.md`; the host
contract is summarized in §3.3 of `../architecture.md`.

## 2. The success-screen contract

A screen registers an object with exactly three fields:

```js
window.SUCCESS.styles.push({
  name: 'comet-shower',     // unique kebab-case id
  supportsSuper: true,      // may render the bigger every-5th-answer variant
  show(opts) {              // build + animate; returns a cleanup function
    // ...animate inside opts.root...
    return function cleanup() { /* cancel + remove EVERYTHING */ };
  },
});
```

`show(opts)` is called once per celebration and receives:

| Field | Meaning |
|---|---|
| `root` | An empty, **host-owned** overlay `<div>` (`position:fixed; inset:0; pointer-events:none`, high z-index). Build all canvas/DOM **inside** it. The host already placed a skin-tinted dark backdrop as `root`'s first child, so always animate **on top of near-black** — never paint your own opaque full-screen background. |
| `isSuper` | `true` on every 5th correct answer — render a bigger, longer variant. Only screens with `supportsSuper:true` are eligible for the super rotation. |
| `durationMs` | How long the host shows the screen before auto-advancing: `~1700` normal, `~3500` super. The animation should feel **complete** by then. |
| `points` | Stars just earned (number). Optional to display (most screens render `+N ⭐`). |
| `palette` | `{ primary, accent, glow, text }` hex strings, read from the active skin's `--skin-*` CSS vars via `_skinPalette()`. Use these so the screen matches the current background. |
| `praise` | A ready Hebrew praise string with niqqud (e.g. `כָּל הַכָּבוֹד!`), chosen by the host. Display it or substitute your own (feminine + niqqud). |

`show()` **must return a cleanup function**. The host may call cleanup at any
moment (the child can skip), so it must synchronously cancel every
`requestAnimationFrame`/timeout, remove every listener, and detach every DOM
node it created. Nothing may remain.

What the **host** owns (not the screen): creating/removing `root`, the
skin-matched dark backdrop and its fade in/out, the Enter / Space / click skip,
the advance timing, the z-index stacking, and calling `nextP()` afterward.

## 3. How the host drives them

The host lives in `game/js/success.js`.

- **Rotation.** `showFw()` increments a counter; every 5th call is a super.
  It builds the pick pool from the 5 built-in styles *plus* the registered
  externals (`window.SUCCESS.styles`). For a normal answer it picks uniformly
  across `5 + externals.length`; for a super it picks across the built-in super
  plus only the externals whose `supportsSuper` is true.
- **Mounting.** When an external screen is chosen, `_showExternal(styleDef,
  isSuper, DUR)` creates `root`, lays the `--skin-ov` dark backdrop as the first
  child (fades in on open, out ~300 ms before advancing), arms the advance timer
  **before** calling `show()`, and invokes `show()` inside a `try/catch`. A
  throwing screen is logged and ignored — it can never soft-lock the game (the
  advance timer still fires). `_skinPalette()` reads the live `--skin-*` vars to
  build `opts.palette`.
- **Intro splash.** The same registered screens power an optional intro splash
  (`showIntroSplash()` / `bootIntroSplash()`): on each refresh a random screen
  plays as a super-sized, pointer-transparent overlay with the game's name in the
  `praise` slot. It waits (polling) for the dynamically-injected screens to load.
- **Special / reward screens.** Screens registered under
  `window.SUCCESS.special.<key>` are **not** in the rotation. The gift reward
  (`showGiftScreen()`) is played by `core.js → endGame` only when the grade
  clears the mode's gift threshold; its backdrop captures clicks and it does
  **not** call `nextP()` (the set is already over).

## 4. Screen inventory

All rotation screens below register `supportsSuper: true`. Listed in
`SUCCESS_FILES` order (`data.js`).

### Cosmic / space
| File | Effect |
|---|---|
| `success-supernova.js` | A central star collapses (infalling particles), then explodes: flash, expanding shock waves, colorful nebula, ejecta, leaving a twinkling pulsar. |
| `success-comet-shower.js` | Glowing comets streak diagonally with spark trails; praise pops in the center with a halo. |
| `success-constellation-heart.js` | Stars light up one by one on a heart outline, constellation lines connect them, the heart pulses and glows. |
| `success-black-hole-stars.js` | A black hole with a glowing accretion disk spirals sparks inward, then flips and spits out a swarm of tumbling stars. |
| `success-rocket-launch.js` | A rocket (🚀) lifts off with flickering flame, sparks and smoke, then bursts into a ring of stars. |
| `success-star-race.js` | Colored shooting stars race across to a sparkling finish line; the winner bursts into a firework. |

### Energy / weather
| File | Effect |
|---|---|
| `success-lightning-storm.js` | Jagged lightning bolts (midpoint displacement) strike from the sky with soft flashes, branches and impact sparks; text pulses on each strike. |
| `success-electric-orb.js` | A central energy orb charges and crackles with arcs, then discharges an expanding electric ring and radial bolts. |
| `success-aurora-glow.js` | Soft green-pink-purple aurora ribbons undulate across the sky with twinkling stars — calm and dreamy, a counterweight to the energetic styles. |
| `success-snow-sparkle.js` | Snowflakes (❄) drift and spin down with twinkling light points; praise glows in an icy halo. Super adds an opening swirl from center. |
| `success-prism-rainbow.js` | A glowing triangular prism splits a thin white beam into a fanning rainbow spectrum (7 beams, red→violet) that sweeps and shimmers toward the lower-right, with sparkles travelling along the beams and a glint along the prism edges. Super widens the fan, adds a second prism that re-splits a beam, and a bright central flash. |

### Nature / sea
| File | Effect |
|---|---|
| `success-blooming-garden.js` | Stems grow up from the bottom and flowers open one by one, swaying in a light breeze with rising magic pollen. Super adds butterflies. |
| `success-butterfly-swarm.js` | Butterflies (🦋) flutter out from the center along curving paths with wing-flap and sparkle trails. Super adds floating hearts. |
| `success-dolphin-splash.js` | Dolphins (🐬) leap in arcs over an invisible waterline, rotating with their motion and splashing light droplets. Matches the reef skin. |
| `success-bubble-pop.js` | Translucent shimmering bubbles rise and pop into light droplets; a giant bubble rises to center, pops, and the praise springs out. |
| `success-enchanted-tree.js` | A magical tree grows from the ground — the trunk rises, branches sprout, then glowing blossoms pop in one by one along them; petals drift down and fireflies float around the canopy over a soft glow. Super grows a fuller tree with more blossoms, a firefly swarm, and a final sparkle ring. |

### Magic / royalty
| File | Effect |
|---|---|
| `success-magic-wand.js` | A wand (🪄) arcs across the screen scattering dense stardust; praise is "revealed" in the wand's wake. Super adds a return sweep and star rain. |
| `success-unicorn-rainbow.js` | A unicorn (🦄) gallops across trailing a soft rainbow and falling sparkles. Super does a double (there-and-back) pass with floating hearts. |
| `success-princess-crown.js` | A crown (👑) drops from above and lands above the praise; rotating gold rays behind it, sparkling diamonds orbit. Fits the "Queen" 👸 mode. |
| `success-phoenix-rising.js` | A phoenix made of glowing embers rises from the bottom to mid-screen, flapping its wide wings (2 flap cycles, 3 in super) and shedding floating embers (white→gold→orange). At ~65% it spreads its wings and bursts into a fountain of gold feathers and sparks that curve outward and fall under gravity, with a soft warm flash; super adds a wider radial feather ring. |
| `success-peacock-fan.js` | A peacock tail fans open from a low center point: long pointed feathers spread in an arc (~85°, ~99° in super) with an elastic ease, each a palette gradient tipped with a shimmering "eye" (gold/primary rings, glowing turquoise center). The fan then sways gently as the eyes twinkle and sparks drift off the tips; super widens the fan, runs a shimmer wave across the eyes, and adds a sparkle rain. Elegant — fits the "Queen" 👸 mode. |

### Celebration / fairground
| File | Effect |
|---|---|
| `success-kaleidoscope-bloom.js` | A symmetric kaleidoscope at screen center: N wedge segments (8 normal, 16 super) each draw the same set of colored shards/petals, mirrored and rotated into a mandala. The pattern blooms outward from the center (radius 0→max), rotates slowly, and the colors cycle through the palette; a gentle converging flash near the end (a brighter final pulse in super). |
| `success-birthday-cake.js` | A cute multi-tier cake pops into the center (easeOutBack), candles light one by one with flickering flames, then a fountain of gold/white sparks erupts from the top — flying up, arcing and falling under gravity with flickering tips — while colored confetti spins down from above. Super adds more candles, a higher fountain with a second burst, and denser confetti. |
| `success-carousel-spin.js` | A carousel of fairground horses (🦄/🐴) circles a glowing central pole on a perspective ellipse (front horses larger and drawn on top, rear ones smaller), each bobbing up and down on its pole; a scalloped roof above carries a ring of palette-colored bulbs chasing around. It accelerates up to speed, sheds sparks, and the praise appears above the roof. Super spins faster with 7 horses, brighter light chase, and a finishing sparkle ring. |
| `success-treasure-chest.js` | A wooden treasure chest swings its lid open as golden light rays beam out; a fountain of gold coins and faceted gems bursts up and rains back under gravity, with drifting sparkles and a warm glow. Super adds more coins/gems, a large jewelled crown rising out of the chest, and a final sparkle ring. |
| `success-sky-lanterns.js` | Warm glowing paper lanterns rise from below into a starry night, swaying gently — each with a soft halo, a flickering flame and a faint trail — while background stars twinkle and embers drift. Super adds more lanterns, a large lead lantern, and a shooting star streaking across. |

### Special / reward (not in the rotation)
| File | Effect |
|---|---|
| `gift/success-gift-surprise.js` | A gift box (🎁) drops, shakes with rising glow, then bursts open spraying toys, candy and stars in a fountain. Registers into `window.SUCCESS.special.gift` (listed in `SUCCESS_SPECIAL`); played only at end-of-set when the gift threshold is cleared. |

## 5. `success_dev.html`

A standalone dev harness for previewing and iterating on screens in **isolation**
(no game needed) — open it directly in a browser. It mirrors the real host:

- Builds a full-viewport `root`, lays the skin-matched `--skin-ov` dark backdrop
  behind the screen (a modal cover over a mock "live game" card), and fades it
  in/out exactly like `success.js`.
- A **skin switcher** (girls / galaxy / reef / dubai / savanna) repaints the mock
  scene and feeds the matching `palette` + `--skin-ov`, so you can verify the
  screen reads over both dark and bright scenery.
- Auto-builds a button pair (**רגיל** / **סופר**) for every registered style, plus
  a separate button for the special **gift** reward.
- Drives `show()` with the right `durationMs`/`palette`/`praise`, runs the
  cleanup, and supports the Enter/Space skip — so you can hammer the skip path
  mid-animation and confirm nothing is left behind.

The harness has its own `<script src>` list of all the screen files; new screens
must be added there to preview them.

## 6. Adding a new success screen

1. **Write `success-<name>.js`** that registers itself into
   `window.SUCCESS.styles` per the §2 contract — one `show(opts)` that animates
   inside `opts.root` and returns a thorough `cleanup`. Create nothing global
   except the registry push; use `opts.palette` for color; honor `durationMs`;
   make cleanup leave zero traces.
2. **Add the name to `SUCCESS_FILES`** in `game/js/data.js` (just the base name,
   no `.js`, no path). `bg-loader.js` injects it at boot — **no `index.html`
   edit needed**.
3. **Iterate with `success_dev.html`** — add a `<script src>` line for the new
   file, then test the normal and super variants across every skin and verify the
   Enter/Space skip leaves nothing behind.

For a **reward** screen instead, register into `window.SUCCESS.special.<key>`,
place the file in its own subfolder (e.g. `gift/`), and list it in
`SUCCESS_SPECIAL` rather than `SUCCESS_FILES`.
