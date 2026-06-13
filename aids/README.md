# `aids/` — Aid art variants + the jar-stage display engine

This folder holds everything *visual* about the game's two learning aids — the
**number-line rider** and the **counting jar** (with its chain-garden upgrade).
The game logic lives elsewhere (`game/js/aids.js`); the files here only supply
**art, FX palettes and Hebrew hint text**.

## 1. Overview

Two kinds of files live here:

- **`<name>.aids.js` — aid variants.** Each registers
  `window.AIDS.variants.<name>` = a plain data object describing the rider, the
  jar, the counted items, the chain-garden plant, menu icons and the hint
  sentences for one background's theme. `classic.aids.js` is the boot default
  and the per-field fallback for every other variant. The current variants are
  `classic`, `space`, `dubai`, `reef`, `unicorns`.
- **`jar_stage.js` — the display engine.** A single self-contained module
  (`window.JAR_STAGE`) that owns *all* the counting-jar visuals: layout,
  drop/burst/sparkle animations, depth grid, glass shine. It is theme-agnostic
  and is driven entirely by whatever variant art it is handed.

The variants are pure data + SVG-string builders; `jar_stage.js` is the
renderer. A new theme is one `.aids.js` file and **zero CSS** (see §6).

## 2. The AIDS variant contract

A variant is registered as:

```js
window.AIDS = window.AIDS || {};
window.AIDS.variants = window.AIDS.variants || {};
window.AIDS.variants.<name> = {
  numberLine: { icon, rider, hintAdd, hintSub, fx? },
  jar:        { icon, gardenIcon, itemName, hintAdd, hintSub,
                containerSVG, itemSVG(i), gardenSVG(ci), fx? },
};
```

### `numberLine`
| Field | Req? | Meaning |
|-------|------|---------|
| `rider` | required* | Emoji shown in `#nl-dot` that flies along the number line. `applyAidsVariant()` falls back to `🦘` if absent. |
| `icon` | optional | Logical menu icon for the NL toggle. (Note: the games-menu actually draws a fixed line-art SVG `AID_ICON_NL`, so this is descriptive only.) |
| `hintAdd` / `hintSub` | optional | Hebrew hint sentence for addition / subtraction problems. Falls back to the classic kangaroo strings in `aidHint()`. |
| `fx` | optional | Jump-FX config consumed by the `NL` module: `{ colors:[…], dust:[…], trail:'✨'\|'', fireworksEvery:N }`. Each sub-field has a classic default in `fxCfg()`; `trail:''` disables the flown trail. |

### `jar`
| Field | Req? | Meaning |
|-------|------|---------|
| `containerSVG` | required* | Full SVG string for the jar/chest/capsule body. Should carry `class="ck-jar-bg"` (sized to 180px wide). Empty string if omitted. |
| `itemSVG(i)` | required* | Returns the SVG for counted item *i* (the engine calls it with `i % 5`). **Must include `viewBox="0 0 W H"`** — `jar_stage.js` parses W/H from it to auto-size the item box (§3). |
| `gardenSVG(ci)` | required* | Returns the chain-garden plant SVG for color index *ci* (`ci % 5`). |
| `gardenIcon` | optional | Emoji menu icon for the chain-garden toggle (falls back to `🌻`). |
| `itemName` | optional | Hebrew plural noun for the items (cookies/asteroids/…); descriptive, used in hint phrasing. |
| `hintAdd` / `hintSub` | optional | Jar hint sentences; fall back to the classic cookie strings. |
| `fx.poof` | optional | Array of crumb colors for the remove-item burst; defaults to a warm cookie-crumb palette in `jar_stage` `burst()`. |

\* "required" = the engine will render something degraded (default emoji or
empty art) if missing, but a real variant is expected to supply it. The
**fallback chain** is per-field: `AIDS.current` → (missing field) → hard-coded
classic defaults in `aids.js`/`jar_stage.js`. If a whole variant fails to load,
`loadAids` falls back to `AIDS.variants.classic` wholesale.

## 3. `jar_stage.js` — structure & functionality

`window.JAR_STAGE.mount({root, variant})` injects the module's `<style>` once
(`#jst-style`), builds the jar shell into `root`, and returns a handle:

| Method | Effect |
|--------|--------|
| `set(n)` | Instant reconcile to exactly *n* items (bulk init / undo) — adds/removes with no drop animation. |
| `add()` | One item drops in (`jstDrop` squash-bounce), then fires a glow pulse + accent ring + sparkles. |
| `remove()` | Top item bursts away (`jstOut` + a `burst()` of poof-colored crumbs) and the stack relayouts. |
| `variant(nv)` | Swap the art live: recompute the item box, re-render the shell, restore the item count. |
| `cleanup()` | Clear timers, empty `root`, drop the `.jst-root` class. |

**Depth-grid layout (`slot(i)`).** Items are absolutely positioned in `.jst-items`
inside a 144px cavity (180 − 18px glass walls each side). `perRow` is computed
from the item box width; the front row sits at the bottom, full size and full
brightness, and each higher row is **raised** (`bottom = row·h·0.82`), **scaled
down** (`scale ≥ 0.78`), **dimmed** (`brightness ≥ 0.72`) and pushed back in
z-order (`z = 60 − row`). Odd rows nudge ±3px for a packed look. `place()` writes
left/bottom/width/height/zIndex/filter/transform per item.

**Auto-sized item box (`itemBox`).** The box is derived from the variant's
`itemSVG(0)` string by regex-matching `viewBox="0 0 W H"`. It targets ~44px wide,
clamps height to ≤30px (rescaling width to keep aspect) and width to ≥26px. This
is why a new variant needs no CSS — any SVG proportions just fit.

**FX.** `flash()` toggles the `.jst-glow.on` radial pulse; `sparkle(el)` adds a
`.jst-ring` and six `.jst-spark` dots in the **`--skin-accent`** color read from
`:root`; `burst(el)` scatters eight `.jst-crumb` rectangles using the variant's
`fx.poof` palette. Sparks/crumbs/rings are appended to `document.body`
(`position:fixed`) and self-remove via tracked timers. Idle items gently bob
(`jstBob`, randomized per item via `--jd`/`--ja`), and a `.jst-shine` highlight
sweeps the glass every ~7s (`jstSweep`).

**Palette & restyling.** Colors come from CSS vars `--skin-glow`,
`--skin-accent` (with literal fallbacks). Every element carries a stable class —
`.jst-root`, `.jst-glow`, `.jst-shine`, `.jst-items`, `.jst-item`, `.jst-bob`,
`.jst-spark`, `.jst-crumb`, `.jst-ring` — so any `game/skins/<name>.skin.css`
can restyle the jar without touching this module.

## 4. Per-variant inventory

| File | Rider | Jar item | Garden item | item `viewBox` |
|------|-------|----------|-------------|----------------|
| `classic.aids.js`  | 🦘 kangaroo   | 🍪 cookies (`עוּגִיּוֹת`)        | 🌻 flowers       | `0 0 52 20` |
| `space.aids.js`    | 🚀 rocket     | ☄️ asteroids (`אַסְטֶרוֹאִידִים`) | 🪐 ringed planets | `0 0 52 36` |
| `dubai.aids.js`    | 🚁 helicopter | 💎 crystals (`קְרִיסְטַלִּים`)    | 🌴 palm trees    | `0 0 52 36` |
| `reef.aids.js`     | 🐬 dolphin    | 🦪 pearls (`פְּנִינִים`)         | 🪸 coral sprigs  | `0 0 52 26` |
| `unicorns.aids.js` | 🦄 unicorn    | 🧁 cupcakes (`קַאפְּקֵייקְס`)    | 🌸 crystal flowers | `0 0 52 34` |

Each variant cycles a 5-entry color palette for its items and another for its
garden plants, and defines its own `numberLine.fx` (trail glyph, spark/dust
colors) and `jar.fx.poof` burst colors. `classic` is the only one without an
explicit `fx.poof` (it relies on the engine's default cookie-crumb palette).

## 5. Integration into the game

1. **Background load.** `bg-loader.loadBackground(name)` reads the background
   module's `aids:` field and calls `loadAids(mod.aids || 'classic')`.
2. **Variant injection.** `loadAids(name)` sets
   `window.AIDS.current = AIDS.variants[name] || AIDS.variants.classic`, lazily
   injecting `aids/<name>.aids.js` first if needed (script-tag injection, since
   `file://` blocks fetch/ES-modules), then calls `applyAidsVariant()`.
3. **Re-render in place.** `applyAidsVariant()` (in `game/js/aids.js`) rewrites
   `#nl-dot` with the variant's `rider`, re-mounts the jar via `_jarMount()`,
   and rebuilds the games menu.
4. **The engine reads `AIDS.current`.** `aidCfg()` returns
   `AIDS.current || AIDS.variants.classic`. The number-line `NL` module pulls
   its rider FX through `fxCfg()`; the jar engine pulls `itemSVG`/`gardenSVG`
   via `pgmCkSVG()`/`gnFlowerSVG()` and hint text via `aidHint()`.
5. **Jar display.** `_jarMount()` calls `loadJarStage()` (injects
   `aids/jar_stage.js` once) then `JAR_STAGE.mount({root:#pgm-ck-jar, variant})`.
   The logic engine (`pgmPlus`/`pgmMinus`/`pgmUndo`/`pgmRenderJar`) only drives
   the handle's `set`/`add`/`remove`.
6. **Number tooltip.** `core.js` `_nttItemHTML()` also borrows the active
   variant's `jar.itemSVG(i % 5)` so the hover-a-number-as-objects tooltip
   always matches the current theme (falls back to `⭐`).
7. **Revert.** `unloadBackground()` always calls `loadAids('classic')`, so the
   default kangaroo + cookie jar returns when no themed background is active.

## 6. Adding a new variant

1. Create `aids/<name>.aids.js` registering
   `window.AIDS.variants.<name> = { numberLine:{…}, jar:{…} }`. Supply at least
   `numberLine.rider`, `jar.containerSVG`, `jar.itemSVG(i)` (with a correct
   `viewBox="0 0 W H"`) and `jar.gardenSVG(ci)`; add `hintAdd`/`hintSub`,
   `itemName`, the `fx` palettes and `fx.poof` to fully theme it. Omitted fields
   fall back to `classic`.
2. Reference it from a background: set `aids: '<name>'` in that background's
   `window.BACKGROUNDS[…]` entry (see `backgrounds/`). When the background
   loads, `bg-loader` injects and applies the variant automatically.

No CSS or game-code changes are required: `jar_stage.js` auto-sizes from your
`itemSVG` viewBox, and all colors flow from the skin's `--skin-*` palette.
