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
  `TCA`(column add `'col_add'`), `TCS`(column sub `'col_sub'`),
  `TBG`(big ± small step), `TCM`(coin multiplication `'coin_mul'`).
- **`gameLen()`** — `() => problems.length`.
- **`EXERCISE_INDEX`** — array mapping each exercise *file* (`exercises/<file>.ex.js`)
  to the game modes that include it. `loadExercisesFor` reads this to know which
  files to inject for a mode.
- **`EXERCISE_OF_TYPE`** — maps a ptype that brings its own interactive UI to its
  file. Currently `{[TCA]:'column_add', [TCS]:'column_sub', [TCM]:'coin_mul'}` —
  the three self-hosting types mounted by `core.js → _colxMount` into `#colx-root`.
- **`DIFFICULTY_GROUPS`** — the difficulty picker config: two tiers (`easy`,
  `medium`) each holding mode descriptors `{id,label}`. Note ids mix **numbers**
  (`0,5,10,20`) and **strings** (`'big','br','mx','sup'`).
- **`SUCCESS_FILES`** — manifest of per-answer celebration screen files (36 of
  them) injected at boot. The newest four are `success-treasure-chest`,
  `success-sky-lanterns`, `success-prism-rainbow`, `success-enchanted-tree`
  (preceded by phoenix-rising / peacock-fan / kaleidoscope-bloom / birthday-cake
  / carousel-spin) — all join the random rotation.
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
- **`makeMxPool()`** — Queen (`'mx'`) mix builder (**19 problems**).
- **bridging-10 set machinery** — `_bridgeSet1()`, `_bridgeSet2()`,
  `_BRIDGE_SETS`, `makeBridgePool()`, plus the persisted turn `_brTurn`.
- **`modePts()`** — points-per-correct-answer for the current `mode`
  (mx→20, br→15, sup→15, big→10, otherwise the numeric mode or 5).

**Key functionality you must know**
- A recipe only runs **after** `bg-loader.loadExercisesFor` has injected the
  mode's type files — `EX('add')` etc. would be `undefined` otherwise.
- `makePool` dispatch: mode `0` → the full `add` 1+1 ladder; `'mx'` → curated mix
  (`makeMxPool`, 19 problems); `'br'` → bridging curriculum; `'sup'` → a
  **balanced** shuffle of `column_add.make('sup')` (3) + `big_step.make('sup')`
  (3 subtractions) + `coin_mul.make('sup')` (3) + `column_sub.make('sup')` (6 =
  3 no-borrow + 3 borrow, all over the **full 11–29 range**) → **15 problems, an
  equal share of each type**; `'big'` → `big_step`; the numeric `5/10/20` →
  union of `missing/sub/add/double`, run through `sampleWithTD(pool, GL)`, then
  the `coins` type's `.inject()` hook seeds 1–2 coin problems.
- **`makeMxPool` (Queen) now includes column subtraction.** Each loaded type
  contributes its `mx` quota (chains 6, add/sub/missing/two-unknowns, round-tens
  2, coins 2, big ±1/2 2, and `column_sub.make('mx')` = 2 NO-borrow column subs)
  → 19, then one shuffle. A guard keeps a `TCS` problem out of **slot 0** (the
  first card must show a normal `#ans` input for boot to find), swapping it with
  the first non-`TCS` problem.
- **Column subtraction lives ONLY inside Queen + Superman** (the standalone
  `'sub_col'` game was removed). `column_sub.ex.js` exposes `makeNoBorrow(n,
  maxA,maxB)` (defaults `maxA=19,maxB=18`): Queen (`'mx'`) calls `makeNoBorrow(2)`
  for teen minuends (a≤19, everything ≤20), while Superman (`'sup'`) calls
  `makeSup()` = 3 no-borrow + 3 with-borrow, **both spanning the full a∈[11,29]
  range** (e.g. 27−13, 25−17). Superman's column subtraction is thus a strict
  **superset** of the old standalone game — nothing was lost.
- **Bridging-10 is two fixed pedagogical sets served alternately.** The order
  *inside* each set is the curriculum and must never change. `makeBridgePool()`
  serves the set selected by `_brTurn`, then advances the turn (`_brTurn` is
  **persisted** in `localStorage.brTurn`) so every build — choosing the game,
  "play again", or a reload — flips set 1 → set 2 → set 1…; each builder returns
  fresh objects.
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
- **Per-game prize levels** (settings): `GIFT_GOALS` is a live object built by
  `_rebuildGiftGoals()` from `DEFAULT_GIFT_GOALS`
  (`{br:900, mx:900, sup:825}` — **only the reward games**; the
  basic modes `0/5/10/20/big` ship with no default prize) merged with per-game
  overrides persisted in `localStorage.giftGoals`. A game with **level 0 / empty
  has no prize** (absent from `GIFT_GOALS`, no 🎁 badge, no gift screen).
  `setGiftGoal(mode, val)` saves an override (0 clears it, capped at 1000) and
  refreshes the picker + indicator; `renderPrizeConfig()` renders one editable
  input per game in the settings modal (`#prize-row`). The 🎁 badge is appended
  to a picker button by `renderModePicker` only when `GIFT_GOALS[id] > 0` (the
  labels in `DIFFICULTY_GROUPS` no longer hard-code 🎁). `GIFT_MODE_LABELS`
  carries `{br, mx, sup}`.
- **Score history**: every completed set is logged by `recordHistory(grade)`
  (called from `endGame`) into `localStorage.scoreHistory` — `{name, mode, game,
  grade, ts}`, newest-first, capped 60. `renderHistory()` lists name + game +
  grade + date into `#history-body`; `clearHistory()` wipes it.
- **Settings sub-tabs**: the settings modal is split into three tabs —
  **general** (game picker + intro toggle + name), **prizes** (`renderPrizeConfig`)
  and **history** (`renderHistory`). `pickSetTab(tab)` toggles the active
  `.set-tab`/`.set-panel`; `openSettings()` resets to the general tab and renders
  all three panels (`_setTab`/`_applySetTab`). The prizes/history views live
  inside the modal — there is no separate history overlay. The general tab also
  carries an intro-splash toggle and a **borrow-method toggle** (see below).
- **Column-subtraction borrow method** (settings): `subBorrowMode()` reads
  `localStorage.subBorrow` and returns `'hybrid'` (the default) or `'auto'`;
  `setSubBorrowMode(v)` persists it and syncs the `#borrow-toggle` checkbox
  (checked = `'auto'`). `column_sub.ex.js` reads this at mount to choose between
  the child TAPPING the top tens digit to borrow (**hybrid**, with a one-time
  finger-guide on her first borrow) and the regrouping animating itself on every
  borrow (**auto**). `openSettings()` syncs the toggle to the saved value.
- **Persisted mode**: `_savedMode()` reads `localStorage.gameMode` and resolves
  the string back through `DIFFICULTY_GROUPS` to recover the original id *type*
  (number vs string), falling back to `'mx'`; `_persistMode()` writes it.
  `mode` is initialized from `_savedMode()`.
- **Mode switching**: `setMode(m)` (async via `loadExercisesFor`), `restart()`
  (async, replays current mode), `rebuildCard()` (re-renders the card HTML and
  re-attaches aid listeners + `applyAidsVariant`).
- **Picker/UI**: `renderModePicker()`, `pickTier()`, `openSettings()`,
  `closeSettings()`, `updateGiftIndicator()`.
- **Parent gate**: the ⚙️ button calls `openParentGate()` (not `openSettings`
  directly) — a "prove you're a parent" modal (`#parent-ov`) posing a random
  single-digit × single-digit product; `checkParentGate()` opens the settings
  only on a correct answer, `closeParentGate()` dismisses it.
- **Problem flow**: `loadProblem()`, `renderEq()`, `checkAns()`, `nextP()`,
  `resetCur()`, `endGame()`, `calcGrade()`, `gradeMsg()`.
- **Self-contained exercise host**: `_colxMount()` / `_colxCleanup` (hosts the
  three `#colx-root` types — TCA/TCS/TCM).
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
  report and persists the mode; re-selecting `'br'` is *not* a no-op (unlike
  every other already-active mode) so its pool rebuilds and `makeBridgePool`
  flips to the next bridging set.
- **`loadProblem()`** destructures the current problem, computes the correct
  answer for the ptype (for `TCM` that is `num1/(num2||5)` — the *count* of coins,
  where `num2` is the coin value 2 or 5, not the target), seeds `report[idx]`,
  writes the per-ptype Hebrew hint, then
  configures the right aid: the kangaroo number line is reconfigured per type —
  coins (0–20, or 0–50 step-10 in Queen), tens (0–100 step 10), column-add and
  column-sub both use the skinned **0–20** line (sub is COUNT-BACK — main.js
  steps −1), `TCM` gets **no number-line aid** (its coin tray is the
  manipulative), and **big-step uses a *windowed* line**
  (`NL.configure(base+20,1,base)` centered on `num1`, e.g. 75 → 65..85). It
  focuses the first input and finally calls `_lockAids()`.
- **`renderEq()`** builds the equation HTML for every ptype (single input,
  missing-operand, the multi-input chain layout for `TX/TZ/TW`, the two-box
  double-unknown layout, the coins stage). For the three self-hosting types it
  emits a single `<div id="colx-root">` placeholder and calls `_colxMount()`:
  this covers `TCA` (column add), `TCS` (column subtraction) and `TCM` (coin
  multiplication). On *entry* to `renderEq` it first releases a module-owned
  exercise's listeners/timers via `_colxCleanup` whenever the new ptype is
  **not** one of TCA/TCS/TCM.
- **`checkAns()`** validates input, calls `_markAns` for the green/red border,
  and on success adds `_tfPts()` points and triggers `showFw()` (or auto-advances
  in mode 0); on a wrong answer it pushes to `report[idx].wrongs`, unlocks aids
  on the *first* mistake (`if(tryFirst===0)_unlockAids(); tryFirst++`), shows the
  sad modal, and clears the input for a retry. `TCA`/`TCS`/`TCM` are skipped here
  — those modules check themselves.
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
  clean-first-try problem, floored at 101). `endGame()` renders the end screen,
  logs the set via `recordHistory()`, and if the grade clears the game's prize
  level (`GIFT_GOALS[mode] > 0`, parent-configurable — defaults `br:900, mx:900,
  sup:825`) shows the 🎁 badge + schedules `showGiftScreen()`.
- **number-hover tooltip** (`#num-tt`): hovering any `.eq-n`/`.eq-res` renders
  that number as **objects borrowed from the active aid variant's jar art**
  (`AIDS.current.jar.itemSVG`), grouped in fives, positioned below (flips above
  if off-screen). Falls back to `⭐`.
  - **Bridge-through-ten split:** a non-first operand whose step crosses a ten is
    tagged at render (`renderEq` → `nB(t,base,op)` → `_bridgeSplit`) with
    `data-split="left,right"`. The tooltip then shows the **complete-to-ten part
    flushed LEFT and the remainder flushed RIGHT**, divided by a dashed line
    (`.ntt-split`, forced `direction:ltr` so L/R hold under the page's RTL).
    `base` is the running result of everything left of the operand: for `a−b`/`a+b`
    it's `a`; in chains (`TZ/TX/TW`) the third term uses `a∘b`. Covers `TS`, basic
    `add`, `TBG`, and chain operands; column-add (`TCA`) is excluded. Examples:
    15−6 → 5 | 1, 14−7 → 4 | 3, 8+7 → 2 | 5. Non-crossing steps render normally.
  - **Number-bond layout:** in the split case the whole number sits in `.ntt-lbl`
    and the split grid is **two columns** (`.ntt-side`, flex-column) — each its
    **part number (`.ntt-part`) stacked directly ABOVE its own cluster** of objects
    (`.ntt-objs`), with the dashed `.ntt-div` between. Branch lines from the whole
    number down to each part are an absolutely-positioned SVG overlay
    (`.ntt-bond-ov`, drawn by `_nttBond`) whose endpoints are **measured at show
    time** (`getBoundingClientRect`) so they point exactly at each part regardless
    of cluster sizes. `.ntt-lbl-split` carries a generous bottom margin so the
    parts drop well below the whole number — that vertical gap is what gives the
    branches a sharp (non-flat) angle. Each line stops ~9px (`GAP` in `_nttBond`)
    above its part number so it never touches the digit. Whole/parts/branches/divider all take the skin's label colour
    via the `--ntt-accent` custom property (defaulted on `#num-tt` in base.css,
    overridden per skin) so it suits every theme and stays legible on light (girls)
    and dark tooltip backgrounds alike.
  - **Missing-subtrahend result (`TM`, a − ? = b):** the shown teen result `b` is
    rendered via `resB(t)` with a **ten + ones** split (`data-split="10,b−10"`,
    e.g. 13 → 10 | 3) — a different rule from the operand bridge above, but it
    reuses the exact same bond rendering.
  - **Two-addends preview (`TDA`/`TDS`, ? + ? = n):** the FIRST input previews its
    value as objects while typing (`oninput` → `_nttInput`, hidden `onblur`),
    using the **plain** (non-split) display. `_nttRender(num, split, anchorEl, side)`
    is the shared renderer behind hover (`_nttShow`), this input preview, and the
    column-add / column-sub digit previews; `side='right'` positions it beside the
    anchor (vertically centred, flips left on overflow).
  - **Closes on celebration/prize:** `showFw` and `showGiftScreen` (success.js)
    call `_nttHide()`, AND `_nttRender` bails via `_celebrationUp()` (true while a
    success / gift / intro screen is up) — so a tooltip never floats over the
    screen even if a hover is still active and re-fires `mouseover`.
  - **Column-add digit preview (`TCA`):** `column_add.ex.js` binds the column
    digits — hovering one previews its objects in `#num-tt` to the **RIGHT** of the
    digit (below would cover a row; `side='right'`, compacter via the `ntt-rt`
    class). It is **scoped to the current column**: only the UNITS digits respond
    while adding units, only the TENS digits (+ the carried 1) while adding tens.
    On a units **carry**, the SECOND number's units digit splits complete-to-ten |
    remainder via the same global `_bridgeSplit` — the **make-ten** bond (e.g.
    18+15 → the 5 shows 2 | 3).
  - **Column-sub digit preview (`TCS`):** `column_sub.ex.js` binds its column
    digits the same way (`_nttRender(n, split, el, 'right')`, scoped to the active
    column). On a **borrow** problem the BOTTOM-number units digit (`bU`) shows the
    **subtract-through-ten** split — `bU = aU` on the LEFT (brings the borrowed teen
    down to 10) and `(bU − aU)` on the RIGHT (the rest, taken from 10): e.g. 15−7 →
    the 7 shows 5 | 2, 25−16 → the 6 shows 5 | 1. When `aU = 0` there is no split.
    The TOP units shows a **plain** count (`aU + 10` after a borrow). It reuses the
    exact same number-bond rendering as the make-ten split — only the two parts
    differ.
  - **Tests:** `test_game.py::TestBridgeSplitTooltip` covers the subtraction/
    addition operand splits, the first-operand-never-splits and non-crossing
    cases, the chain third-term running-result split, the missing-type ten+ones
    result split, the bond (whole + 2 branch lines), and the two-addends input
    preview.
- **self-contained exercise host** (`_colxMount`): for the on-screen ptype it
  looks up `EXERCISE_OF_TYPE[ptype]` (TCA→`column_add`, TCS→`column_sub`,
  TCM→`coin_mul`), loads that `exercises/<name>.ex.js`, mounts it into
  `#colx-root` (passing `{root, a:num1, b:num2, api}`), and stores the module's
  returned cleanup in `_colxCleanup`. The `api` exposes `wrong(v)` (push to
  `report[idx].wrongs`, unlock aids on the first miss, sad modal), `nl(v)` (park
  the skinned number-line rider, clamped 0–20) and `solved()` (mark
  `gotCorrect`, add `_tfPts()`, success message + `showFw`). The host keeps
  scoring/report/sad/success; the module owns its visuals and checking. The async
  load callback is **guarded against a stale mount**: it captures `myIdx=idx`
  before loading and, when the module arrives, bails if the problem moved on
  (`idx!==myIdx`), the user left a colx type (`ptype` no longer TCA/TCS/TCM), or
  the resolved exercise no longer matches the current type
  (`EXERCISE_OF_TYPE[ptype]!==exName`) — so a slow module load can never mount the
  wrong exercise over a different problem. Re-entering `renderEq`/`_colxMount`
  also runs the previous `_colxCleanup` first.

**Integration**
- Calls `problems.js` (`makePool`, `makeBridgePool`, `modePts`), `success.js`
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
- **Skip: keyboard AND tap/click.** `showFw` registers two document listeners
  (removed by `_fwDone`): `_fwKey` (Enter/Space) and `_fwTap` (`pointerdown` →
  `fwClose`). `pointerdown` unifies mouse + touch + pen, so a TAP on mobile/tablet
  skips the celebration immediately, exactly like a desktop click/Enter. Both are
  registered only when the screen opens (which is ~400ms after the answer is
  judged), so the answer-submitting tap can't self-dismiss.
- **`_showExternal`** builds a `pointer-events:none` root with a backdrop whose
  hue is picked at RANDOM from the active skin's palette (`_skinBackdrop()` →
  `--skin-primary/glow/accent` sunk toward black) that fades in/out around the
  screen's own canvas, and passes `{root,isSuper,durationMs,points,palette,praise}`
  to `show()`. The backdrop itself is `pointer-events:auto;cursor:pointer` (over
  the `none` root) so a tap lands ON it (skips via `_fwTap`) instead of falling
  through to the card beneath.
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
  every "plain numbers" ptype (TZ/TX/TW/TDA/TDS/TA/TS/TM); TC/TT/TCA/TCS/TCM/TBG
  bring their own aid (or none) and are excluded. When the jar is active on a
  chain problem it also offers the chain-garden upgrade (costs 20 ⭐ via
  `openChainGarden`).
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
- **`preloadAll()`** — warms EVERY background (+ its aid art & skin) and EVERY
  exercise type up front so later theme/level switches are seamless (no
  first-visit load hitch). Called once from `main.js`, but **only when the intro
  splash is enabled** (`introEnabled()`): the splash hides the warm-up; with no
  splash each mode loads its own types lazily via `loadExercisesFor`. Idempotent
  (`_injectScript` de-dupes the active theme/mode already loading).
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
  `updateGiftIndicator()` → `bootIntroSplash()` → `preloadAll()` (deferred,
  warms every background/skin/aid/exercise during the splash), then load the
  persisted mode's exercise files and build the first pool.
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
