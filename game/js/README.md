# `game/js/` — the JavaScript heart of the game

This folder holds the eight global-scope scripts that run *Math Games 2*
(`מִשְׂחֲקֵי חֶשְׁבּוֹן`), a Hebrew (RTL) subtraction/addition game for young
children. This document describes what each file actually does, the state it
owns, and how the files wire together with the dynamically-loaded folders
(`aids/`, `exercises/`, `backgrounds/`, `success_screens/`, `game/skins/`).

## 1. Overview

The whole game runs from `file://`. Because `fetch` and ES modules are
CORS-blocked there, **everything is plain global-scope `<script src>`** and the
only runtime extension mechanism is *tag injection* (appending `<script>` /
`<link>` to `<head>`). There are **no ES modules, no `import`, no `fetch`** —
every function, constant and `let` lives on the global scope so the inline
`onclick="..."` handlers throughout `index.html` resolve. This is a deliberate
constraint, not an accident; do not introduce module scope.

`index.html` loads the eight files **in this exact order** (load order matters —
later files call into earlier ones at parse time):

```
game/js/data.js       — constants, ptype codes, config tables, polyfill
game/js/problems.js   — per-mode pool RECIPES (consume registered exercise types)
game/js/core.js       — the game engine: state, modes, problems, checking, report
game/js/success.js    — celebration overlays + the SUCCESS registry
game/js/aids.js       — generic number-line + counting-jar ENGINE + aid toggle
game/js/bg-loader.js  — dynamic loaders for bg / skin / aids / exercises / success
game/js/themes.js     — THEMES data, applyTheme, theme→background mapping, click FX
game/js/main.js       — boot sequence + global keyboard handlers
```

Several scripts execute code at parse time (`bg-loader.js` kicks off the
classic-aid + success-screen injection; `main.js` is the boot script), so the
ordering above is load-bearing.

A handful of CSS files load before the scripts (`base`, `aids`, `effects`,
`themes`, `responsive`); the DOM skeleton in `index.html` provides empty mounts
(`#eq`, `#nl-panel`, `#pgm-ck-jar`, `#stars-layer`, the overlays) that the JS
fills at runtime.

---

## 2. Per-file reference

### 2.1 `data.js` — constants & config tables

**Structure**
- **`roundRect` polyfill** — adds `CanvasRenderingContext2D.prototype.roundRect`
  if missing (used by the canvas success/FX code).
- **ptype codes** — single-source string constants for every problem type:
  `TM`(missing), `TS`(sub), `TA`(add), `TX`(mixed −then+), `TZ`(triple add),
  `TW`(twin sub), `TDA`/`TDS`(double-unknown add/sub), `TC`(coins), `TT`(tens),
  `TCA`(column add), `TBG`(big ± small step).
- **`gameLen()`** — `() => problems.length`.
- **`EXERCISE_INDEX`** — array mapping each exercise *file* (`exercises/<file>.ex.js`)
  to the game modes that include it. `loadExercisesFor` reads this to know which
  files to inject for a mode.
- **`EXERCISE_OF_TYPE`** — maps a ptype that brings its own interactive UI to its
  file. Currently `{[TCA]:'column_add'}`.
- **`DIFFICULTY_GROUPS`** — the difficulty picker config: two tiers (`easy`,
  `medium`) each holding mode descriptors `{id,label}`. Note ids mix **numbers**
  (`0,5,10,20`) and **strings** (`'big','br','mx','sup'`).
- **`SUCCESS_FILES`** — manifest of per-answer celebration screen files (17 of
  them) injected at boot.
- **`SUCCESS_SPECIAL`** — manifest of *special* milestone screens
  (`gift/success-gift-surprise`), not part of the rotation.

**Key functionality you must know**
- This file is pure data + one polyfill; it defines no behavior. Adding/renaming/
  reordering a game is a `DIFFICULTY_GROUPS` edit only — `renderModePicker`
  (core.js) renders straight from it.
- The number-vs-string id types in `DIFFICULTY_GROUPS` are significant: equality
  checks and the persisted-mode resolver (`_savedMode`) rely on recovering the
  original type.

**Integration**
- `EXERCISE_INDEX` / `EXERCISE_OF_TYPE` drive `bg-loader.loadExercisesFor` /
  `loadExercise`; `problems.js` recipes then ask the registered types to build.
- `SUCCESS_FILES` / `SUCCESS_SPECIAL` are iterated by `bg-loader.js` at boot to
  inject `success_screens/...js`.
- `DIFFICULTY_GROUPS` is consumed by `core.js` (`renderModePicker`, `_savedMode`).

### 2.2 `problems.js` — per-mode pool recipes

**Structure**
- **`EX(n)`** — safe accessor for `window.EXERCISES.types[n]` (the dynamically
  registered exercise type).
- **`shuffle` / `sample`** — Fisher-Yates helpers.
- **`sampleWithTD(pool,k)`** — picks `k` problems but guarantees a double-unknown
  (`TDA`/`TDS`) lands in **every 4th slot** (positions 4, 8, 12…).
- **`makePool(m)`** — the master recipe dispatcher for mode `m`.
- **`makeMxPool()`** — Queen (`'mx'`) mix builder.
- **bridging-10 set machinery** — `_bridgeSet1()`, `_bridgeSet2()`,
  `_BRIDGE_SETS`, `makeBridgePool()`, `bridgeNextSet()`, plus `_brPlay`/`_brNext`.
- **`modePts()`** — points-per-correct-answer for the current `mode`
  (mx→20, br→15, sup→15, big→10, otherwise the numeric mode or 5).

**Key functionality you must know**
- A recipe only runs **after** `bg-loader.loadExercisesFor` has injected the
  mode's type files — `EX('add')` etc. would be `undefined` otherwise.
- `makePool` dispatch: mode `0` → the full `add` 1+1 ladder; `'mx'` → curated mix
  (`makeMxPool`); `'br'` → bridging curriculum; `'sup'` → `column_add` + a few
  `big_step` problems shuffled; `'big'` → `big_step`; the numeric `5/10/20` →
  union of `missing/sub/add/double`, run through `sampleWithTD(pool, GL)`, then
  the `coins` type's `.inject()` hook seeds 1–2 coin problems.
- **Bridging-10 is two fixed pedagogical sets served alternately.** The order
  *inside* each set is the curriculum and must never change. `_brPlay` = set
  currently in play; `bridgeNextSet()` (called by `setMode` only on a genuine
  switch into `'br'`) advances to the next set, so each fresh selection flips
  set 1 → set 2 → set 1…, while `restart()` and boot replay the set in play.
- `GL` (=12, defined in core.js) is the standard session length used here.

**Integration**
- Reads exercise types registered by `exercises/<file>.ex.js` via `EX`.
- Called by `core.js` (`setMode`, `restart`) and `main.js` (boot), always inside
  a `loadExercisesFor` callback.
- `modePts()` is read by `success.js` and `core.js` scoring.

### 2.3 `core.js` — the game engine

This is the largest file and owns nearly all gameplay state and logic.

**Structure (key globals & functions)**
- **State**: `mode`, `score`, `idx`, `problems`, `done`, `aidMode`
  (`'kang'`|`'nl'`), the current-problem fields `ptype,num1..num4`, `tcCoins`,
  `ttOp`, `bgOp`, `aidUsed`, `report[]`, `tryFirst`, plus gift config
  `GIFT_GOALS`/`GIFT_MODE_LABELS` and `GL` (=12).
- **Persisted mode**: `_savedMode()` reads `localStorage.gameMode` and resolves
  the string back through `DIFFICULTY_GROUPS` to recover the original id *type*
  (number vs string), falling back to `'mx'`; `_persistMode()` writes it.
  `mode` is initialized from `_savedMode()`.
- **Mode switching**: `setMode(m)` (async via `loadExercisesFor`), `restart()`
  (async, replays current mode), `rebuildCard()` (re-renders the card HTML and
  re-attaches aid listeners + `applyAidsVariant`).
- **Picker/UI**: `renderModePicker()`, `pickTier()`, `openSettings()`,
  `closeSettings()`, `updateGiftIndicator()`.
- **Problem flow**: `loadProblem()`, `renderEq()`, `checkAns()`, `nextP()`,
  `resetCur()`, `endGame()`, `calcGrade()`, `gradeMsg()`.
- **Self-contained exercise host**: `_colxMount()` / `_colxCleanup`.
- **Scoring & aids gating**: `addScore()`, `_tfPts()`, `_lockAids()`,
  `_unlockAids()`, `_aidRevealPolicy()`, `markAidUsed()`/`resetAidUsed()`,
  `showDigitHint()`.
- **Answer feedback**: `_markAns()`, `setFb()`, chain helpers `tzSubUpd`,
  `tzSubJarSync`, `tzAddMode`.
- **Report**: `reportOpen()`, `reportClose()`.
- **Number-hover tooltip**: `_nttItemHTML`, `_nttShow`, `_nttHide` + the
  document `mouseover`/`mouseout` listeners.

**Key functionality you must know**
- **`setMode` / `restart` are async** and guarded: they call
  `loadExercisesFor(m, cb)` and, *inside* the callback, re-check `mode===m`
  before building `problems = makePool(m)` — if the user switched again while a
  load was in flight, the stale callback bails. `setMode` also resets score/idx/
  report, persists the mode, and calls `bridgeNextSet()` for `'br'`.
- **`loadProblem()`** destructures the current problem, computes the correct
  answer for the ptype, seeds `report[idx]`, writes the per-ptype Hebrew hint,
  then configures the right aid: the kangaroo number line is reconfigured per
  type — coins (0–20, or 0–50 step-10 in Queen), tens (0–100 step 10), column-add
  (0–20), and **big-step uses a *windowed* line** (`NL.configure(base+20,1,base)`
  centered on `num1`, e.g. 75 → 65..85). It focuses the first input and finally
  calls `_lockAids()`.
- **`renderEq()`** builds the equation HTML for every ptype (single input,
  missing-operand, the multi-input chain layout for `TX/TZ/TW`, the two-box
  double-unknown layout, the coins stage, column-add root). It releases a
  module-owned exercise's listeners when leaving `TCA`, and mounts `_colxMount`
  when entering it.
- **`checkAns()`** validates input, calls `_markAns` for the green/red border,
  and on success adds `_tfPts()` points and triggers `showFw()` (or auto-advances
  in mode 0); on a wrong answer it pushes to `report[idx].wrongs`, unlocks aids
  on the *first* mistake (`if(tryFirst===0)_unlockAids(); tryFirst++`), shows the
  sad modal, and clears the input for a retry. `TCA` is skipped here — its module
  checks itself.
- **try-first scoring**: `_tfPts()` returns full `modePts()` on the first try,
  ~67% on the second, **0** afterward. `tryFirst` counts wrong attempts.
- **`_lockAids` / `_aidRevealPolicy`**: aids are normally **fully hidden** until
  the first mistake. `_lockAids` resets `tryFirst`, disables the aid controls,
  hides `#nl-panel`/`#chain-tools` (remembering their display in `_aidHidden` so
  `_unlockAids` restores exactly what `loadProblem` chose), and shows the "try it
  yourself" message. `_aidRevealPolicy()` reads the **on-screen exercise type's**
  optional `aidsReveal` field (`'always'` | `'afterMistake'`, default the latter);
  `'always'` (e.g. column-add) skips the lock entirely.
- **`_markAns(el,ok)`** toggles `ans-ok`/`ans-err` classes — the global green/red
  answer-border contract. A document-level `input` listener clears the red state
  as the child retypes.
- **digit hint** (`showDigitHint`) costs 30 points, shown only for TT/TBG and
  two-digit TS/TM, disabled until `score>=30`.
- **`report` & `endGame`**: `calcGrade()` scores out of 1000 (100 per
  clean-first-try problem, floored at 101). `endGame()` renders the end screen;
  if the grade clears `GIFT_GOALS[mode]` (`br:750`, `mx:950`) it schedules
  `showGiftScreen()`.
- **number-hover tooltip** (`#num-tt`): hovering any `.eq-n`/`.eq-res` renders
  that number as **objects borrowed from the active aid variant's jar art**
  (`AIDS.current.jar.itemSVG`), grouped in fives, positioned below (flips above
  if off-screen). Falls back to `⭐`.
- **column-add host** (`_colxMount`): loads `exercises/column_add.ex.js`, mounts
  it into `#colx-root`, and passes an `api` with `wrong(v)` (penalty + sad modal),
  `nl(v)` (park the skinned number-line rider) and `solved()` (score + success
  screen). The host keeps scoring/report/sad/success; the module owns its visuals
  and checking. A `myIdx` guard prevents a late mount after the problem changed.

**Integration**
- Calls `problems.js` (`makePool`, `modePts`, `bridgeNextSet`), `success.js`
  (`showFw`, `showSadModal`, `showGiftScreen`), `aids.js` (`NL`, `buildGamesMenu`,
  `applyAidsVariant`, the `pgm*` jar drivers, `aidHint`), `bg-loader.js`
  (`loadExercisesFor`, `loadExercise`), and `data.js` constants/config.
- Reads `EXERCISES.types[*].aidsReveal` (registered by `exercises/`).
- Renders the picker from `DIFFICULTY_GROUPS` into `#settings-ov`/`#level-row`.

### 2.4 `success.js` — celebrations & the SUCCESS registry

**Structure**
- **`window.SUCCESS` / `SUCCESS.styles`** — the registry external screens push
  into.
- **`showFw()`** — the master per-answer celebration entry (called after a
  correct answer); `_showNfw()` for the four built-in DOM overlays; the inline
  canvas fireworks for built-in style 0.
- **`_showExternal()`** — host for a registered screen, with a skin-matched
  backdrop and a guarded `show()` call.
- **`_skinPalette()`** — reads `--skin-*` CSS vars for the palette passed to
  screens.
- **Data**: `NFW_DATA` (per-theme praise text/icons), `NFW_CF_COLORS`,
  `SAD_EMOJIS`.
- **`showSadModal()`** — the wrong-answer sad face.
- **`_fwDone()` / `fwClose()`** — teardown + `nextP()`.
- **Gift screen**: `showGiftScreen()` / `_giftDone()`.
- **Intro splash**: `showIntroSplash()`, `bootIntroSplash()`, `introEnabled()`,
  `setIntroEnabled()`.

**Key functionality you must know**
- **Rotation**: every celebration is an EXTERNAL screen (`SUCCESS.styles`,
  injected from `SUCCESS_FILES`). There are NO built-in styles — the legacy
  single-file screens (canvas fireworks + the four `nfw` overlays) were removed.
  `showFw` picks a random registered screen; every 5th answer (`fwCount%5===0`)
  is a "super" celebration drawn only from styles flagged `supportsSuper`. With
  no screens loaded yet, `showFw` just advances (never soft-locks).
- **The host owns timing, skip and teardown.** The advance timer (`_fwTO`) is
  armed *before* the external `show()` runs, and the call is wrapped in
  `try/catch` — **a broken external screen must never soft-lock the game** (an
  exception would otherwise leave `_fwOn` stuck `true` forever). `_fwDone` clears
  timers/listeners, runs the screen's returned cleanup, and calls `nextP()`.
- **`_showExternal`** builds a `pointer-events:none` root with a backdrop whose
  hue is picked at RANDOM from the active skin's palette (`_skinBackdrop()` →
  `--skin-primary/glow/accent` sunk toward black) that fades in/out around the
  screen's own canvas, and passes `{root,isSuper,durationMs,points,palette,praise}`
  to `show()`.
- **Gift screen** (`showGiftScreen`) is a *special* celebration from
  `SUCCESS.special.gift`, **not** part of the rotation. Played by `endGame()`
  only when the grade clears the threshold; click/Enter/Space/Escape skips it;
  it does **not** call `nextP` (the set is over). Its backdrop captures clicks so
  a tap doesn't fall through to the replay/report buttons.
- **Intro splash** greets every refresh with a random screen, showing the game's
  name in the praise slot; `pointer-events:none` so the game stays usable.
  `bootIntroSplash` polls (up to ~4s) for screens to finish injecting before
  playing. Toggle persists in `localStorage.introSplash`.

**Integration**
- `showFw` reads `THEMES[theme]` (themes.js) for built-in fireworks variants and
  `modePts()` (problems.js) for the ripple score.
- Plays screens registered by `success_screens/*.js` (injected by bg-loader from
  `SUCCESS_FILES`/`SUCCESS_SPECIAL`).
- `_skinPalette` reads the active skin's CSS vars (`game/skins/*.skin.css`).
- Called by `core.js` (`showFw`, `showSadModal`, `showGiftScreen`) and `main.js`
  (`bootIntroSplash`).

### 2.5 `aids.js` — generic number-line + counting-jar engine

**Structure**
- **`NL`** — an IIFE returning `{configure,init,step,reset,undo,attachBarEvents,
  attachDocumentEvents}`. The kangaroo-style number line.
- **Aid-toggle icons**: fixed inline SVGs `AID_ICON_NL` / `AID_ICON_BOX` drawn in
  `currentColor`.
- **Games dropdown**: `buildGamesMenu()`, `openGamesMenu()`, plus document click
  handlers to close menus.
- **Jar/garden engine**: `aidCfg()`, `aidHint()`, `pgmCkSVG`, `gnFlowerSVG`,
  `_jarMount`, `applyAidsVariant()`, the `pgm*` family (`pgmInitChain`,
  `pgmRenderJar`, `pgmRenderGarden`, `openChainGarden`, `pgmBuildNL`,
  `pgmUpdateNL`, `pgmDrawArcs`, `pgmUpdateAll`, `pgmPlus`, `pgmMinus`, `pgmUndo`),
  and the engine state `pgmCV,pgmCk,pgmArcs,pgmTensMode,chainGnMode,tdaJarMode`.
- **`toggleAidMode(targetMode)`** — switches between kangaroo NL and cookie jar.

**Key functionality you must know**
- **The engine is generic; all art comes from the active AIDS variant.** `NL`'s
  rider, jump-trail, dust, sparks and firework cadence read from
  `aidCfg().numberLine.fx` (sensible classic defaults if absent). `aidCfg()`
  returns `AIDS.current` (or `AIDS.variants.classic`).
- **`NL.configure(max,step,base)`** supports a **`base` window** so the line can
  start somewhere other than 0 (e.g. a 65..85 window centered on 75 for big-step
  problems); `_pct` maps values across `MAX-BASE`. Jumps fly along a real rAF
  parabola (anticipation, mid-air stretch, tangent rotation, landing squash); the
  landed number pops, dust kicks up, and a firework bursts every `fireworksEvery`
  jumps. Supports keyboard arrows, mouse drag and touch.
- **The jar DISPLAY is a separate module** (`aids/jar_stage.js`). aids.js holds
  only the handle `_jarH` and the logic: `_jarMount()` lazily calls
  `loadJarStage` then `JAR_STAGE.mount({root,variant})`; `pgmPlus`/`pgmMinus`
  drive `_jarH.add()/.remove()/.set()`. The number-line/jar arc bookkeeping and
  undo live here; `pgmTensMode` reconfigures the bar for 0–100 step-10.
- **`applyAidsVariant()`** re-renders the rider into `#nl-dot` and re-mounts the
  jar with the current variant's art, then rebuilds the games menu — called by
  `bg-loader.loadAids` after a variant injects.
- **Fixed aid-toggle icons by design**: the NL/box toggle icons are *identical on
  every background* (small line-art SVGs), so the toggle reads the same
  everywhere even as the rider/jar art changes per scene.
- **`buildGamesMenu()`** builds the dropdown: the kangaroo↔jar toggle applies to
  every "plain numbers" ptype (TZ/TX/TW/TDA/TDS/TA/TS/TM); TC/TT/TCA/TBG bring
  their own aid and are excluded. When the jar is active on a chain problem it
  also offers the chain-garden upgrade (costs 20 ⭐ via `openChainGarden`).
- **`toggleAidMode`** flips `aidMode` (or jumps to a target), shows/hides the
  jar (`#chain-tools`) vs the kangaroo line (`#nl-panel`), seeds the jar count,
  rebuilds the menu, and rewrites the hint via `aidHint`. No-ops for TC/TT.

**Integration**
- Reads `window.AIDS.current` (variant injected by `bg-loader.loadAids` from
  `aids/<name>.aids.js`) for all art and hint overrides.
- Calls `bg-loader.loadJarStage` to pull in `aids/jar_stage.js`.
- Driven by `core.js` (`loadProblem`, `checkAns`, chain helpers) and `main.js`
  keyboard handlers; reads/writes the shared `ptype`, `score`, `done`, `tryFirst`
  globals from core.js.

### 2.6 `bg-loader.js` — the dynamic loaders

**Structure**
- Registry init: `window.BACKGROUNDS`, `window.AIDS(.variants/.current)`,
  `window.EXERCISES.types`.
- **`_injectScript(src,onload)`** — the queued tag-injection primitive.
- **`applySkin(skin)`** — swaps the skin `<link href>`.
- **`loadAids(name)`** — injects an aid variant, then `applyAidsVariant()`.
- **`loadJarStage(onReady)`** — injects `aids/jar_stage.js` once.
- **`loadExercise(name,onReady)` / `loadExercisesFor(mode,onReady)`** — inject
  one / all exercise type files for a mode.
- **`loadBackground(name)` / `unloadBackground()`** — scene module lifecycle.
- **Boot block**: `loadAids('classic')` + inject every `SUCCESS_FILES` /
  `SUCCESS_SPECIAL` screen.

**Key functionality you must know**
- **Tag injection is the only dynamic mechanism that works on `file://`.** Every
  swappable asset lives *outside* the game code and is injected at runtime:
  backgrounds (`backgrounds/<name>.bg.js`), skins (`game/skins/<skin>.skin.css`),
  aid variants (`aids/<name>.aids.js`), the jar-stage engine, exercise types
  (`exercises/<name>.ex.js`), and success screens.
- **`_injectScript` de-dupes and queues.** It tracks each `src` as
  `undefined`/`'loading'`/`true`. If a callback arrives while a script is still
  loading it is **queued** (`_injectQ`) and fired on load rather than too early;
  already-loaded scripts fire the callback synchronously. On error the tracking
  is cleared so a retry can re-inject.
- **`loadExercisesFor`** filters `EXERCISE_INDEX` by mode, injects exactly those
  files, and fires `onReady` only after all have loaded (synchronous when
  cached — repeat visits never flicker). This is why `setMode`/`restart`/boot
  build their pool inside the callback.
- **`loadBackground`** runs the previous scene's `cleanup()`, injects the module
  if needed, then `applySkin(mod.skin||name)`, `loadAids(mod.aids||'classic')`,
  and `mod.init({stage:#stars-layer})` (storing its returned cleanup).
  `unloadBackground` reverts skin → none and aids → `classic`.

**Integration**
- The single bridge between the engine and all four dynamic folders.
- Boot-time it loads the classic aids and all success screens listed in `data.js`.
- Called by `themes.js` (`loadBackground`/`unloadBackground`), `core.js`
  (`loadExercisesFor`/`loadExercise`), `aids.js` (`loadJarStage`).

### 2.7 `themes.js` — theme data, application & click FX

**Structure**
- **`theme`** — current theme (from `localStorage.gameTheme`, default `girls`).
- **`_BG_THEMES`** — maps a theme id to its background module name
  (`galaxy→space`, `girls→unicorns`, `reef→reef`, `dubai→dubai`,
  `savanna→savanna`).
- **`THEMES`** — per-theme data: particles, rainbow colors (`rbColors`), and the
  fireworks variants (`fw[]` + `fwSuper`) consumed by `success.js`.
- **`applyTheme(t)`**, **`openThemeMenu`/`pickTheme`/`toggleTheme`**.
- **Click/answer FX**: `_fly`, `fxLight/Electric/Hearts/Stars/Magic/Boom/
  Confetti/Rainbow`, the `FX[]` array, `runFx`, `spawnParticles`.

**Key functionality you must know**
- **`applyTheme`** sets `body.className` for the theme (preserving the
  `tf-locked-nl` aid-lock class across the wipe), then either
  `loadBackground(_BG_THEMES[theme])` for a canvas theme or `unloadBackground()`
  + clears `#stars-layer`. It updates the title, the toggle icon, and marks the
  active menu item. A stale `localStorage` theme (a removed one) falls back to
  `girls`.
- **`THEMES` is consumed by `success.js`**, which reads `THEMES[theme].fw` /
  `.fwSuper` / `.rbColors` to draw the built-in canvas fireworks.
- **`spawnParticles()` is now effectively a cleanup hook.** Every live theme is a
  canvas background module whose scene carries its own life, so no floating emoji
  particles are spawned — the function just clears `#particles` and any
  `_specialPtc`.
- The click FX (`fxLight` …) are self-contained DOM/canvas bursts that clean up
  on `animationend`.

**Integration**
- Drives `bg-loader.js` (`loadBackground`/`unloadBackground`) on every theme
  change.
- Supplies fireworks data to `success.js`.
- `applyTheme()` is called at boot by `main.js`.

### 2.8 `main.js` — boot & global keyboard handlers

**Structure**
- The boot sequence (top-level statements).
- Two document `keydown` handlers: one for `Delete`/`Escape`, one for the
  spacebar.

**Key functionality you must know**
- **Boot order**: `NL.attachDocumentEvents()` → `NL.attachBarEvents()` →
  `renderModePicker()` → `applyTheme()` → `spawnParticles()` →
  `updateGiftIndicator()` → `bootIntroSplash()`, then load the persisted mode's
  exercise files and build the first pool.
- **Boot-race guard**: the boot pool build captures `_bootMode=mode` and, inside
  the `loadExercisesFor` callback, bails if `mode!==_bootMode` — so if the user
  picks a game before the boot load finishes, `setMode`'s own callback owns the
  pool and this late one must not overwrite it. (`setMode`/`restart` use the same
  guard pattern.)
- **`Delete`/`Escape` handler**: Escape closes the settings modal first (and does
  nothing else); Delete clears a focused number input *and* undoes the last
  cookie-jar step (`pgmUndo`) when the jar is visible.
- **Spacebar handler**: a single dispatcher that steps the right aid in the right
  direction for the current ptype/aidMode — coins/tens/big-step step the kangaroo
  line, chain problems drive the jar add/remove, kangaroo mode steps forward/back
  per add/sub, jar mode adds/removes a cookie. It respects `tryFirst===0` (locked
  aids), skips when an overlay (fw/sad/report) is open, and ignores text inputs.

**Integration**
- The conductor: wires together `aids.js` (`NL`, `pgm*`), `core.js`
  (`renderModePicker`, `loadProblem`, `updateGiftIndicator`, the shared state),
  `themes.js` (`applyTheme`, `spawnParticles`), `success.js` (`bootIntroSplash`),
  `bg-loader.js` (`loadExercisesFor`) and `problems.js` (`makePool`).

---

## 3. The dynamic-loading model

The engine stays **generic and small**; everything that varies by scene or
curriculum is authored in its own folder and injected at runtime via
`_injectScript` (`bg-loader.js`) — the only mechanism that works on `file://`.

- **Backgrounds** (`backgrounds/<name>.bg.js`) register
  `window.BACKGROUNDS[name] = {skin, aids, init({stage})→cleanup}`. A theme maps
  to one via `_BG_THEMES` (themes.js); `loadBackground` injects it, swaps the
  skin, loads its aid variant, and runs it.
- **Skins** (`game/skins/<name>.skin.css`) restyle the game (and aids) over a
  backdrop via `--skin-*` palette vars; swapped as a `<link href>`. The palette
  is also surfaced to success screens and the hover tooltip.
- **Aid variants** (`aids/<name>.aids.js`) register
  `window.AIDS.variants[name]` with the number-line rider, jar container, counted
  items, icons and hint sentences. `aids.js` reads `AIDS.current` and re-renders
  via `applyAidsVariant`; `classic` is the boot default and per-field fallback.
  The jar's *display* is a further on-demand module, `aids/jar_stage.js`.
- **Exercise types** (`exercises/<name>.ex.js`) register
  `window.EXERCISES.types[name]` with `{t, modes, aidsReveal?, make(mode),
  mount?}`. `EXERCISE_INDEX` (data.js) maps file → modes; `loadExercisesFor`
  injects exactly the files a mode needs, then `problems.js` recipes ask each
  registered type for its contribution. Types needing their own UI add `mount`
  (mapped via `EXERCISE_OF_TYPE`, hosted by `_colxMount`).
- **Success screens** (`success_screens/*.js`, listed in `SUCCESS_FILES` /
  `SUCCESS_SPECIAL`) register into `window.SUCCESS.styles` / `.special`; injected
  at boot, they join the random celebration rotation. The host (`success.js`)
  owns timing, skip and cleanup, and guards each screen so a broken one can't
  soft-lock the game.

The net effect: adding a scene, skin, aid look, exercise type or celebration is a
*new file plus a one-line manifest/config entry* — the eight engine files in this
folder rarely change.
