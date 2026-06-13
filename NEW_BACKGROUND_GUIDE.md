# Building a New Background Pack — full guide

This is the step-by-step for adding a brand-new world to the math game (space,
unicorn valley, Dubai, reef, savanna … and your new one). A "background" is
never just a pretty scene — it is a **pack of coordinated pieces** so the whole
game (numbers, buttons, the number line, the counting box, the success screens)
re-dresses itself to match the world. This guide explains every piece, the
exact files, and the wiring.

> Everything runs from `file://` — only classic `<script src>` / `<link>` tags
> and runtime tag-injection are used (no `fetch`, no ES modules). All JS is
> global-scope. Keep that in mind for every file below.

See also the per-folder READMEs: `backgrounds/README.md` (scene porting),
`game/skins/README.md` (the look), `aids/README.md` (the aid art),
`success_screens/README.md`, and `architecture.md` (the contracts §3.1–§3.6).

---

## What a background pack is made of

A complete pack named `<name>` (e.g. `space`) is **up to 5 files + ~4 small
wiring edits**. Only the first two are strictly required; the rest make the
world feel custom and polished.

| # | Piece | File | Required? | What it does |
|---|---|---|---|---|
| 1 | **Scene module** | `backgrounds/<name>.bg.js` | ✅ yes | the animated canvas world |
| 2 | **Game skin** | `game/skins/<name>.skin.css` | ✅ yes | recolors/repositions the game UI to match |
| 3 | **Aid art variant** | `aids/<name>.aids.js` | ⬜ optional | the number-line rider + the counting-box items ("cookie jar") + chain-garden art |
| 4 | **Dev harness** | `backgrounds/<name>.html` | ⬜ optional | open the scene alone in a browser to iterate |
| 5 | **Success screen(s)** | `success_screens/success-<x>.js` | ⬜ optional | extra celebrations themed to the world |

Plus the **wiring** (small edits, §6): a theme entry, the theme→background map,
a theme-menu button, and the `#bg`/`#stars-layer` fallback CSS.

> "Cookie jar" is the historical name for the **counting box** — the box that
> fills with objects you add/remove. Its objects come from your aid variant
> (piece 3). The shared rendering engine is `aids/jar_stage.js` (you don't
> rewrite it — you just supply the art).

---

## Piece 1 — the scene module `backgrounds/<name>.bg.js`

The animated world. It registers itself and exposes `init`/`cleanup`:

```js
window.BACKGROUNDS = window.BACKGROUNDS || {};
window.BACKGROUNDS.<name> = {
  skin: '<name>',            // → game/skins/<name>.skin.css   (piece 2)
  aids: '<name>',            // → aids/<name>.aids.js  (piece 3; omit/'classic' to reuse the default)
  init({ stage }) {          // stage = the #stars-layer element
    // build a <canvas> INSIDE stage (stage.innerHTML=''; then append),
    // position:fixed; inset:0; width:100%; height:100%
    // run your rAF loop, listeners, etc.
    return function cleanup() {
      // stop the rAF loop (guard with a `stopped` flag + cancelAnimationFrame),
      // remove every listener you added, empty the stage
    };
  },
};
```

**Rules that matter** (full checklist in `backgrounds/README.md`):
- Mount the canvas inside `stage`, never on `document.body`.
- Put click listeners on `document` and bail on game UI first:
  `if(e.target.closest('.wrap,button,input,#particles,.special-uni,#games-menu,#theme-menu,#fw-ov,#sad-ov,#report-ov'))return;`
- Keep references to every listener and remove them in `cleanup()`; guard the
  loop with a `stopped` flag. A clean teardown is essential — backgrounds are
  swapped at runtime and a leaked loop will pile up.
- Know your scene's **hero objects** and which screen region they occupy — the
  skin (piece 2) positions the game column to avoid covering them.

Standalone-HTML → module porting is mechanical; `space.bg.js` is the reference.

---

## Piece 2 — the game skin `game/skins/<name>.skin.css`

The game's LOOK over your scene. **Every rule scoped to `body.theme-<theme>`**
(see §6 for the theme name). bg-loader appends this as a `<link>` at runtime
and it layers on top of `game/css/*`. A skin owns four families:

1. **Palette** — `:root{--skin-primary; --skin-accent; --skin-glow; --skin-text;}`
   (also fed to success screens and to `jar_stage.js`; add `--skin-ov` for the
   success-overlay backdrop tint).
2. **Fonts / type** — title gradient, `.hdr-stats`, etc.
3. **Glass transparency** — `.glass{...}`. Most skins set `backdrop-filter:none`
   and a near-transparent fill so the scene shows THROUGH the panels.
4. **Position** — `.wrap{max-width/margins}` to place the game column so the
   scene's heroes stay visible.

A good skin also restyles, all still scoped to `body.theme-<theme>`:
- the **number line** `#nl-panel` (track, ticks, `.nl-num`, the rider `.kang`,
  the `+`/`−` `.side-btn`, jump arcs `.arc-add/.arc-sub`),
- the **chain mini-line** `.pgm-*`,
- the **settings modal** (`.settings-box`, `.tier-tab`, `.lvl-btn`),
- the **number-hover tooltip** `#num-tt`,
- the **counting box bottom chip** `.pgm-jar-btm`, the **end screen**, etc.

**Two hard rules a skin must NOT break:**
- The **green/red answer-border** state (`.ans-inp.ans-ok` / `.ans-err`) is
  `!important` in `base.css` — never override it. Correct = green, wrong = red,
  on every background.
- The **aid-toggle icons** (number-line / box) are fixed SVGs, identical on
  every background — don't replace them.

`game/skins/README.md` has the per-family detail and the per-skin table.

---

## Piece 3 — the aid art variant `aids/<name>.aids.js`

Optional but it's what makes the helpers feel native to the world. It supplies
the **number-line rider** and the **counting-box objects** (and the chain
garden). Without it the world falls back to `classic` (kangaroo + cookies).

```js
window.AIDS = window.AIDS || {}; window.AIDS.variants = window.AIDS.variants || {};
window.AIDS.variants.<name> = {
  numberLine: {
    icon:'🚀',                       // menu icon for the NL toggle
    rider:'🚀',                      // what hops along the line
    hintAdd:'…', hintSub:'…',        // the hint sentence (add / subtract)
    fx:{ colors:[…], dust:[…], trail:'✨', fireworksEvery:3 },  // optional jump FX
  },
  jar: {
    icon:'⭐', gardenIcon:'🪐', itemName:'כּוֹכָבִים',
    hintAdd:'…', hintSub:'…',
    containerSVG:'<svg …>',          // the box/jar art
    itemSVG(i){ return '<svg viewBox="0 0 52 36">…</svg>'; }, // ONE counted object
    gardenSVG(ci){ return '<svg …>'; },                       // chain-garden plant
    fx:{ poof:[…] },                 // optional burst colors when an item is removed
  },
};
```

**Critical:** `itemSVG(i)` MUST include a `viewBox="0 0 W H"` — `jar_stage.js`
auto-sizes the box cells from it (no CSS needed for new art). Vary by `i%5` for
visual variety. The number-hover tooltip also borrows `itemSVG`, so the same
objects appear when a child hovers a number.

`aids/README.md` documents every field, what's required, and the fallback chain.

> The number line itself (range, the `base`/window offset, stepping, the arcs)
> is the shared engine in `game/js/aids.js` — your variant only supplies the
> rider emoji + hint text + FX colors. The track/ticks LOOK comes from the skin.

---

## Piece 4 — the dev harness `backgrounds/<name>.html`

A thin page that loads only your `.bg.js` so you can iterate on the scene in
isolation (single source of truth — no copy-porting). Mirror `space.html`:
a `#stage` div + a Restart button, load `<name>.bg.js`, call
`window.BACKGROUNDS.<name>.init({stage})`.

---

## Piece 5 — themed success screens (optional)

If you want world-specific celebrations, write `success_screens/success-<x>.js`
that registers into `window.SUCCESS.styles` and add its name to `SUCCESS_FILES`
in `game/js/data.js`. They read the active skin's `--skin-*` palette, so even
the generic screens already match your colors. See `success_screens/README.md`.

---

## 6 — Wiring it in (the small edits)

A background pack is reached through a **theme**. Pick a theme key (the existing
ones: `girls`, `galaxy`, `reef`, `dubai`, `savanna`). To add a world you either
reuse a theme key or add a new one. Edits:

1. **`game/js/themes.js` — `THEMES`**: add/point a theme entry (title emoji,
   particles, success `fw`/`fwSuper` data). Canvas-scene themes use empty
   `titleEmoji`/`uni` and spawn no floating particles (the scene carries the life).

2. **`game/js/themes.js` — `_BG_THEMES`**: map the theme key → your background
   module name, e.g. `dubai:'dubai'`. This is what makes `applyTheme` call
   `loadBackground('<name>')` (which injects piece 1, swaps piece 2's skin, and
   loads piece 3's aids).

3. **`game/js/themes.js` — body class + `_themeIcons` + `toggleTheme` cycle**:
   add `theme==='<key>'?'theme-<key>'` to the `document.body.className` line
   (this is the `body.theme-<key>` your skin is scoped to), give it a menu icon
   in `_themeIcons`, and (optionally) add it to the `toggleTheme` cycle.

4. **`index.html` — theme menu**: add a `<button class="tm-item"
   onclick="pickTheme('<key>')">` with the world's emoji.

5. **`game/css/themes.css`**: add `body.theme-<key> #stars-layer{display:block}`
   and a `body.theme-<key> #bg{...}` gradient — the load-flash fallback shown
   for a split second before the canvas paints.

That's it. Selecting the theme from the 🎨 menu now loads the whole pack; the
choice persists across refresh (localStorage `gameTheme`), and the chosen
**game/level** persists too (localStorage `gameMode`).

---

## Build checklist

- [ ] `backgrounds/<name>.bg.js` — registers `BACKGROUNDS.<name>` with
      `skin`/`aids`; canvas mounted in `stage`; document-level click filter;
      `cleanup()` stops the loop + removes every listener.
- [ ] `game/skins/<name>.skin.css` — all rules scoped to `body.theme-<key>`;
      `:root` palette vars; glass / fonts / `.wrap` position; restyled
      `#nl-panel`, `.pgm-*`, settings modal, `#num-tt`; did NOT touch
      `.ans-ok/.ans-err` or the aid-toggle icons.
- [ ] `aids/<name>.aids.js` (optional) — `numberLine` + `jar`; every `itemSVG`
      has a `viewBox`.
- [ ] `backgrounds/<name>.html` (optional) — thin harness like `space.html`.
- [ ] Wiring: `THEMES` entry, `_BG_THEMES` map, body-class + `_themeIcons`,
      theme-menu button, `themes.css` `#stars-layer`/`#bg` rules.
- [ ] Verify: pick the theme → scene paints, UI recolors, number line + box use
      the new art, correct=green / wrong=red still holds, switching away runs
      `cleanup()` (no leaked rAF), refresh keeps the theme.
- [ ] Add Playwright coverage mirroring the existing background tests.
