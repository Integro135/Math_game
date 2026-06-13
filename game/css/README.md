# `game/css/` — Base Stylesheets

This folder holds the five static stylesheets that define the **base look** of the
game. They are linked, in a fixed order, from `index.html`. At runtime the
background loader appends one more `<link>` — `game/skins/<name>.skin.css` — to the
end of `<head>`, so the active skin always wins the cascade and can repaint the base
look per background. Nothing in this folder should ever be theme/background-specific
beyond a load-flash fallback; the real per-scene look lives in `game/skins/`.

## 1. Overview

Load order (from `index.html`, lines 8–12):

1. `base.css` — layout, header, settings/difficulty modal, equation, answer input, buttons, end screen, the global answer-border contract, the number tooltip (`#num-tt`).
2. `aids.css` — number-line panel, counting-jar / chain-tools containers, digit-hint button, try-first lock visuals, chain-garden display.
3. `effects.css` — success overlays (`#fw-ov` + the `nfw-*` family), sad modal, report modal, theme & games menus, gift indicator, aid-toggle icons.
4. `themes.css` — per-theme `#bg` load-flash gradients + `#stars-layer` display rules.
5. `responsive.css` — the `@media` breakpoints (≤768 / ≤480 / ≤360) plus the girls-theme `#bg` gradient.

Then, at runtime: `applySkin()` in `game/js/bg-loader.js` creates/points a single
`<link>` at `game/skins/<skin>.skin.css` and appends it last. Because it loads after
all five files above, equal-specificity skin rules override the base.

## 2. Per-file reference

### `base.css`

**Structure.** Reset/box-sizing; `body` + animated
`#bg` gradient (`bgshift`) + floating `#particles`; `.wrap` layout; the **`.glass`**
mixin; header (`.header`, `.title`, `.hdr-stats`, `.prog-bar`, level pills,
`.hdr-corner` / `.mode-ind`); the **settings modal** (`#settings-ov`, `.settings-box`,
difficulty tier tabs/buttons `.tier-tab` / `.lvl-btn`, the intro-splash toggle);
`.card`; side buttons; the equation (`.equation`, `.eq-n/.eq-op/.eq-res`, `.ans-inp`,
`#num-tt` tooltip); TX/TZ inline sub-answer layout (`.tz-*`, `.tx-*`); pill buttons
(`.btn`, `.b-chk/.b-try/.b-nxt/.b-rpl`) and the round `.chk-btn`; end screen
(`.end-*`); celebration helpers (light burst, sparks); coin-counting stage (`.tc-*`,
`.coins-stage`).

**Key functionality.**
- **The global answer-border contract.** `.ans-inp.ans-ok` paints a green border + glow and `.ans-inp.ans-err` a red border + `errShake`, both with `!important` on `border-color`/`box-shadow`. This lives in `base.css` on purpose and **no skin may override it** — `!important` guarantees the green/red correctness signal survives any skin. The same contract is mirrored for sub-answers (`.tx-sub-inp.sub-ok/.sub-err`).
- **`.glass` mixin** — the shared frosted-panel look (translucent white, `backdrop-filter: blur`, hairline border, layered shadow) reused by header/card/etc.
- **Success-screen backdrop** — not a CSS var: `success.js` (`_skinBackdrop()`) builds a random dark cover at runtime from the skin palette (`--skin-primary/glow/accent`).
- `#num-tt` is the hover tooltip for equation numbers; its object art (`.ntt-group svg`) comes from the active aid variant, not from CSS.

**Integration.** Skins re-skin `.glass`, the card, buttons, equation colors and
`--skin-*` props; they must not touch `.ans-ok/.ans-err`. JS toggles `.ans-ok/.ans-err`
on the input after a check, `.btns-side` on `#btns`, `.active` on tier/level buttons,
and `.star-pulse` on `#score-star`.

### `aids.css`

**Structure.** TDA cookie-jar toggle (`.tda-jar-btn`) and free aid-mode toggle
(`.aid-toggle-btn`); chain tools (`#chain-tools`, `.pgm-*` number line / jar column /
value pill / reset); TT tens-hint icon (`.tt-hint-icon`) and `#digit-hint-btn`;
**try-first gate** visuals; the inline **number-line kangaroo panel** (`#nl-panel`
with `.nl-bar-track`, ticks, `.nl-num`, the `.nl-dot`/`.kang` rider, arcs, and the
fixed-position jump trail/dust/firework particles); chain-garden button and display
(`.pgm-gn-*`).

**Key functionality.**
- **Try-first lock.** `.tf-locked` greys out and disables an element. `body.tf-locked-nl` hides the number-line/garden number labels and ticks and desaturates the rider/dot, so kids must estimate before the scale is revealed. `#tf-msg` / `#tf-nl-note` are the prompt text (with per-theme color tweaks for `theme-girls` / `theme-galaxy`).
- The counting-**jar item visuals** are *not* here — the jar display lives in `aids/jar_stage.js` (stable `.jst-*` classes) and container/item art comes from the active aid variant in `aids/<name>.aids.js`. The old `.pgm-nl` number line above the jar is force-hidden (`display:none`).
- Cost hints are rendered with `::before` pseudo-content (e.g. `.tt-hint-icon::before` → `30⭐`, `.pgm-gn-eq-btn::before` → `20 ⭐`).

**Integration.** `game/js/aids.js` builds the panel DOM (ticks, nums, arcs, rider) and
drives the rider with rAF, toggling classes like `.flying`, `.face-left`, `.nl-land`,
`.nl-num-pop`. The engine stays generic and reads art/labels from the loaded aid
variant. Skins may restyle the jar/panel surfaces but inherit the structure here.

### `effects.css`

**Structure.** Legacy fireworks overlay (`#fw-ov` / `#fw-cv` / `.fw-*`); sad modal
(`#sad-ov`, `.sad-box`); report modal (`#report-ov`, `.report-box`, `.rep-*`, shared
`.ko-close`, `.b-rep`); theme toggle button + theme picker menu (`#theme-menu`,
`.tm-item`); games dropdown (`.games-drop-btn`, `#games-menu`, `.gm-item`,
`.aid-ico`); the **new success-overlay family** `nfw-*` (confetti `#nfw-cf`, burst
`#nfw-bu`, hero `#nfw-hr`, ripple `#nfw-rp`, each with its own keyframes);
gift indicator (`.gift-indicator`) and end-screen gift (`.end-gift`).

**Key functionality.**
- Overlays are `display:none` by default and z-indexed above the board; JS shows them and toggles `.open` (menus), `.gm-active` (games button), `.glow-click` (clickable hint glow).
- Success celebrations are external screens (`success_screens/*.js`); `success.js` builds their modal root + a random scene-tinted dark backdrop at runtime (no celebration markup lives in `effects.css`).

**Integration.** Skins recolor menus, overlay backdrops and the gift indicator. JS
(`themes.js`, `success.js`, report code) toggles visibility and the `.open` /
`.gm-active` / `.active` state classes.

### `themes.css`

**Structure.** `#stars-layer` (the fixed canvas stage every background module mounts
into) with per-theme `display:block` rules; per-theme `#bg` **load-flash fallback
gradients** for savanna, galaxy (plus a `::after` nebula tint), reef and dubai.

**Key functionality.** These gradients are only what shows behind the canvas while the
background module loads — the real per-theme look is the canvas module
(`backgrounds/<bg>.bg.js`) plus the skin. (The girls/unicorn `#bg` gradient lives in
`responsive.css`.)

**Integration.** `body.theme-<name>` classes (set by `themes.js`) switch which
fallback applies and whether `#stars-layer` is shown.

### `responsive.css`

**Structure.** Three `@media` breakpoints — tablet (≤768px), mobile (≤480px, the
largest set: reflows the equation onto its own row, splits the level buttons, shrinks
inputs, adjusts knockout/`ko-*` boxes), narrow mobile (≤360px) — plus the
girls/unicorn `body.theme-girls #bg` gradient.

**Key functionality.** Loaded last of the five so its breakpoints win over base sizing.
Purely layout/sizing; no behavior.

## 3. The skin-override model

`base.css` and the other four files define **structure + sensible defaults** (layout,
the `.glass` look, fonts, default colors, `--skin-*` fallbacks). At runtime
`bg-loader.js` → `applySkin(skin)` points a single `<link>` at
`game/skins/<skin>.skin.css` and appends it **last** in `<head>`. Because it loads
after every file here, its rules win ties in the cascade, letting each background fully
repaint palette, glass transparency, fonts and on-screen position.

The one deliberate exception is the **answer-border contract** (`.ans-ok` / `.ans-err`
and `.sub-ok` / `.sub-err`): these use `!important` precisely so that a later-loading
skin **cannot** break the green-when-correct / red-when-wrong signal. Skins should
treat that contract as off-limits.

## 4. Class / contract cheat-sheet

| Class / id | Toggled by | Meaning |
|---|---|---|
| `.ans-inp.ans-ok` / `.ans-err` | check logic in game JS | **Global, skin-proof** green/red answer border (`!important`); never overridden by a skin. Sub-answers use `.sub-ok` / `.sub-err`. |
| `body.tf-locked-nl` | try-first gate | Hides number-line/garden labels + ticks and desaturates the rider until the child has tried first. |
| `.tf-locked` | try-first gate | Greys out + disables a single element. |
| `.gm-active` | games-menu JS | Makes the games dropdown button visible/clickable. |
| `.open` | menu JS | Shows `#theme-menu` / `#games-menu`. |
| `#nl-panel` | aids JS | The inline number-line kangaroo aid panel (rider, arcs, ticks). |
| `.glass` | static | Shared frosted-panel mixin (header, card, …). |
| `.mode-ind` | header markup | Read-only current-game text in `.hdr-corner`. |
| `.glow-click` | hint JS | Gold glow marking a clickable hint target. |
| `--skin-primary/accent/glow/text` | skins set, `success.js` reads | Scene colors; also seed the random success-screen backdrop. |
| `body.theme-<name>` | `themes.js` | Selects `#bg` fallback + `#stars-layer` visibility; gates per-theme tweaks. |
