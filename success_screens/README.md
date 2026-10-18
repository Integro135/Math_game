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
| `durationMs` | How long the host shows the screen before auto-advancing: `2700` normal, `4500` super (`showFw` in success.js). The animation should feel **complete** by then. |
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

There are **65** rotation screens in `SUCCESS_FILES`; all register
`supportsSuper: true`. The manifest is in order of addition (newest last). In
2026-10 the ten oldest (supernova, comet-shower, constellation-heart,
electric-orb, lightning-storm, blooming-garden, unicorn-rainbow,
black-hole-stars, star-race, aurora-glow) were retired and replaced by ten new ones (whale-spout … sticker-book, spread
across the sections below). The 2026-09 batches (sandcastle … rain-cloud) are
listed in `SUCCESS_FILES` and pinned by `tests/test_new_success_screens.py`.

### Cosmic / space
| File | Effect |
|---|---|
| `success-rocket-launch.js` | A rocket (🚀) lifts off with flickering flame, sparks and smoke, then bursts into a ring of stars. |

### Energy / weather
| File | Effect |
|---|---|
| `success-snow-sparkle.js` | Snowflakes (❄) drift and spin down with twinkling light points; praise glows in an icy halo. Super adds an opening swirl from center. |
| `success-prism-rainbow.js` | A glowing triangular prism splits a thin white beam into a fanning rainbow spectrum (7 beams, red→violet) that sweeps and shimmers toward the lower-right, with sparkles travelling along the beams and a glint along the prism edges. Super widens the fan, adds a second prism that re-splits a beam, and a bright central flash. |

### Nature / sea
| File | Effect |
|---|---|
| `success-butterfly-swarm.js` | Butterflies (🦋) flutter out from the center along curving paths with wing-flap and sparkle trails. Super adds floating hearts. |
| `success-dolphin-splash.js` | Dolphins (🐬) leap in arcs over an invisible waterline, rotating with their motion and splashing light droplets. Matches the reef skin. |
| `success-bubble-pop.js` | Translucent shimmering bubbles rise and pop into light droplets; a giant bubble rises to center, pops, and the praise springs out. |
| `success-enchanted-tree.js` | A magical tree grows from the ground — the trunk rises, branches sprout, then glowing blossoms pop in one by one along them; petals drift down and fireflies float around the canopy over a soft glow. Super grows a fuller tree with more blossoms, a firefly swarm, and a final sparkle ring. |
| `success-whale-spout.js` | A smiling side-view whale (one eye, open mouth, blush) surfaces through soft waves, waves its tail, and blows a tall spout whose top bursts into a fountain of palette hearts and stars that rain back down. Super: a baby whale surfaces alongside, two spout bursts. |
| `success-lighthouse-beam.js` | A smiling striped lighthouse on a rocky islet lights its lamp; a soft translucent beam sweeps the night sky and every star/heart it touches lights up with a flash ring and twinkles; it ends pointing up behind the praise. Super: two sweeps, a bobbing sailboat, a lamp sparkle burst. |
| `success-cherry-blossom.js` | A sakura branch grows in and notched 5-petal blossoms pop open along it; a breeze swirls ~70 petals in looping spirals that gather into a glowing heart, then scatters them. Super: a second branch, ~110 petals, a bigger pulsing heart. |

### Magic / royalty
| File | Effect |
|---|---|
| `success-magic-wand.js` | A wand (🪄) arcs across the screen scattering dense stardust; praise is "revealed" in the wand's wake. Super adds a return sweep and star rain. |
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
| `success-gingerbread-house.js` | A gingerbread house builds itself — walls pop up, roof drops, icing drips appear, gumdrops/peppermints/lollipops pop on, windows glow and the chimney puffs heart-shaped smoke — and a gingerbread girl steps out and waves. Super: more candy, sugar-snow sparkles, a lollipop/candy-cane burst. |
| `success-bubble-tea.js` | A kawaii bubble-tea cup pops in, fills with a sloshing palette-tinted wave, pearls drop and bounce, the dome lid snaps on and a striped straw plunges in — then pearls zoom up the straw and burst out as a fountain of pearls, hearts and stars. Super: a smaller matcha cup clinks with it, double fountain. |
| `success-sticker-book.js` | Die-cut stickers (star, heart, rainbow, sun, cat, flower, "100", crown) slap onto the screen around the centred praise with squash, slap lines and peeled corners; a big gold star sticker lands last with a shine sweep. Super: moon, cloud and a holographic heart sticker, second shine. |

### Cute animal friends
| File | Effect |
|---|---|
| `success-hedgehog-roll.js` | A side-view hedgehog curls into a spiny ball, rolls and bounces across a grassy strip leaving sparkles, then unrolls and hops up happy with a strawberry and flowers stuck on its spines as hearts float up. Super: a loop-de-loop and two baby hedgehogs rolling after it. |
| `success-fox-wish.js` | A front-view orange fox on a grassy hill follows shooting stars with her head, then a smiling golden star drifts into her paws; she hugs it and it bursts into a ring of little stars. Super: a meteor shower and a radial heart/star burst with falling glitter. |
| `success-snail-trail.js` | A cute snail glides along a big green leaf leaving a shimmering 6-band rainbow trail; it looks back proudly and flowers and stars pop up along the trail. Super: the trail lifts into a full rainbow arch, a sparkle shower, and a baby snail follows. |
| `success-koala-hug.js` | A eucalyptus branch swings in, a grey koala slides down a vine and hugs it with happy closed eyes while hearts pop out, then lets go with one paw to wave. Super: a baby koala peeks over her shoulder, a bigger heart burst, falling leaves. |

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
