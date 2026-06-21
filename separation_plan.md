# Game File Separation Plan — v2

> **⚠️ HISTORICAL RECORD — this plan is COMPLETED.** All phases (0–5) were
> executed: the legacy monolith was split into `index.html` + `game/css/*` +
> `game/js/*`, the mini-games / hearts / abacus were removed, success screens,
> backgrounds, skins and the difficulty config were componentized, and the
> project has since grown well beyond this v1 scope (a per-type
> `exercises/*.ex.js` plug-in architecture; multiple backgrounds — space,
> unicorns, reef, savanna, dubai; a 30+ screen success rotation). It is kept
> only to document the original migration intent and decisions.
>
> **For the CURRENT architecture, read the living docs instead:**
> `architecture.md`, `subtraction_game_docs.md`, the per-folder `README.md`s
> (`game/js/`, `exercises/`, `backgrounds/`, `game/skins/`), and
> `success_screens_spec.md`. Where this plan and those docs disagree, the docs
> (and the code) win. A few sections below have been trimmed to remove claims
> the shipped code now contradicts.

**Goals (updated):**
1. Drop all 12 mini-games — no longer in use. Of the auxiliary features, only
   **ישר המספרים (kangaroo number line)** and the **cookie jar** stay.
2. **Success screens** (celebrations after a correct answer) — separate component.
3. **Main game logic** — separate component.
4. **Backgrounds** — separate, dynamically-loaded files.
5. Everything runs via a single entry point: **`index.html`**.
6. The game's **UI look must be easily replaceable** so it can be restyled to fit
   each background as beautifully as possible — without touching the logic.

---

## 1. Hard technical constraint: `file://`

The game runs from `file://` (double-click + the pytest suite). Chrome blocks
`fetch()` and ES modules there, so the architecture uses only what works on `file://`:
classic `<link>` / `<script src>` tags, and **dynamic loading = injecting a
`<script>`/`<link>` element at runtime**. All JS stays global-scope, so the inline
`onclick="..."` handlers in the HTML keep working with zero logic changes.

---

## 2. Target structure

```
subtraction_game/
├─ index.html                   # ★ THE entry point — thin shell:
│                               #   HTML skeleton + ordered includes + version tag
├─ subtraction_game.html        # legacy monolith — FROZEN reference until cutover
├─ test_game.py                 # GAME_URL → index.html at cutover
│
├─ game/
│  ├─ css/
│  │  ├─ base.css               # structural layout ONLY: grid, sizes, spacing,
│  │  │                         #   responsive breakpoints (skin-independent)
│  │  └─ aids.css               # number-line panel + cookie-jar structure
│  ├─ skins/                    # ★ the replaceable "look" of the game UI
│  │  └─ space.skin.css         # colors, glass, borders, fonts, glows — defined
│  │                            #   with CSS custom properties; one file per
│  │                            #   background, loaded by the bg-loader
│  └─ js/
│     ├─ data.js                # constants the LOGIC needs (THEMES text/emojis,
│     │                         #   TC_MAP coin art, gift goals)
│     ├─ problems.js            # all problem generators (mx/br/coins/tens/TD)
│     ├─ core.js                # ★ main game logic: state, setMode, loadProblem,
│     │                         #   renderEq, checkAns, chain sub-answers, tryFirst,
│     │                         #   scoring, report, endGame, restart
│     ├─ aids.js                # number line (NL) + cookie jar (pgm) + aid toggle
│     ├─ success.js             # ★ success screens (see §4)
│     ├─ bg-loader.js           # background + skin registry, dynamic injection
│     └─ main.js                # boot: global key handlers, init, wiring
│
└─ backgrounds/
   ├─ space.bg.js               # ★ space background module (BACKGROUNDS.space)
   ├─ space.html                # standalone playground → thin harness that loads
   │                            #   space.bg.js (single source of truth)
   ├─ unicorns.html             # playground (ported later, same pattern)
   └─ (later) unicorns.bg.js + unicorns.skin.css, ...
```

---

## 3. What gets DROPPED (and the strings attached)

**Removed entirely:** the 12 mini-games (knockout, party, lego, balloons, garden,
invaders, bubbles, train, frogs, stars, cans, cookies-game) — ≈1,500 JS lines,
≈680 CSS lines, 12 HTML panels, the star-cost menu items.

**Severed integration points in core** (each is a 1-line removal, listed so nothing
is missed): `addScore → updateAllMiniGameBtns`, `checkAns → koUpdateBtn`,
`loadProblem → buildGamesMenu(_picks)` game picks (the dropdown keeps ONLY the
NL/cookie-jar aid toggles), spacebar handlers for game panels, `GAME_COSTS` gating.

**Also removed (per decision): hearts & abacus — entirely.** This covers the
hearts/abacus aid mode, the bead abacus canvas, the in-exercise hearts display for
X+X / X-X exercises (`initHearts`/`renderHearts`/`clickHeart`/`tdUpdateHearts`), and
mode 0's "force hearts" rule — mode 0 simply uses the default number-line aid like
every other mode. `aidMode` cycles only `kang ↔ nl`.

**Kept:** number line (kangaroo), cookie jar / chain garden, tryFirst lock, digit
hint, report, gift goals.

**Tests:** ≈50 obsolete tests (TestMiniGames, TestMiniGameFunctionality, spacebar
mini-game tests, TestDoubleUnknownHearts, hearts/abacus assertions inside other
tests) are deleted in the same phase that removes the feature, so the suite stays
green and meaningful.

---

## 4. Success screens — separate component with a contract

Everything shown after a correct answer moves to `game/js/success.js`
(+ its CSS inside `effects` section of the skin):

- the 5 current celebration styles (canvas fireworks, confetti, burst, hero, ripple)
  + the every-5th "super" celebration
- Enter/Space/click to skip, auto-advance after ~1.7s, `_fwOn` lifecycle

Contract (registry, same pattern as backgrounds):

```js
window.SUCCESS = window.SUCCESS || {};
SUCCESS.styles = [ {name, show(opts) → cleanup}, ... ];   // pick random / themed
core.js calls SUCCESS.celebrate({super: isSuper, onDone: nextP});
```

This makes it trivial to later add a per-background celebration (e.g., a space-themed
firework) without touching core — a background/skin can register extra styles.

---

## 5. Replaceable game-UI skin (goal #6)

Two layers, so swapping the look never touches logic:

1. **`base.css`** — structure only (what goes where, sizes, responsiveness).
2. **`skins/<name>.skin.css`** — the entire visual identity via CSS custom
   properties + component overrides: card glass color, borders, button gradients,
   fonts, glow colors, feedback colors, number-line colors.

The background module declares its skin (`BACKGROUNDS.space.skin = 'space'`), and
`bg-loader.js` swaps the `<link>` when the background changes. Creating a new look
for a new background = writing one CSS file, no JS.

*(A deeper swap — different DOM per skin — would require a renderer abstraction in
core; out of scope for v1, documented as a possible later phase.)*

---

## 6. Difficulty-level configuration

Game modes are grouped by difficulty in a single declarative config in
`game/js/data.js` — the mode-selection UI is **rendered from this config**, so
moving/adding/renaming games never touches logic:

```js
const DIFFICULTY_GROUPS = [
  { id: 'easy',   label: 'קַל', modes: [
      { id: 0,    label: '1+1'    },
      { id: 5,    label: 'עַד 5'  },
      { id: 10,   label: 'עַד 10' },
  ]},
  { id: 'medium', label: 'בֵּינוֹנִי', modes: [
      { id: 20,   label: 'עַד 20'      },
      { id: 'br', label: 'גָּשֵׁר 10 🌈' },
      { id: 'mx', label: 'מַלְכָּה 👑'  },
  ]},
];
```

UI in the header: a two-tier selector — difficulty tabs (קל / בינוני) on top, and
the games of the selected tier below it. Switching a game = one click; switching
tier = one click + one click. `setMode(id)` and all per-mode logic (points, gift
goals, problem pools) stay exactly as they are — the config only drives rendering
and grouping of the buttons.

> **As shipped (differs from the sketch above):** `DIFFICULTY_GROUPS` lives in
> `game/js/data.js` and the two-tier picker (`renderModePicker`) was placed
> INSIDE the **settings modal**, reached via a ⚙️ gear guarded by a parent gate
> (a × challenge); the header only shows a read-only `#mode-ind` of the current
> game. The shipped groups also grew: **easy = `0 / 5 / 10 / 20`**; **medium =
> `br` (גָּשֵׁר 10) / `mx` (מַלְכָּה) / `sup` (סוּפֶּרְמֶן 🦸)** — `20` moved up to
> easy, and Superman was added later. The 🎁 prize badge is appended at render
> time (only for games with a prize set), not stored in the label.
>
> Column subtraction (`column_sub.ex.js`, "חִסּוּר בְּטוּר ➖") is NOT a
> standalone game in the picker — it lives only INSIDE Superman (`sup`, both
> no-borrow and with-borrow, full 11–29 range) and the Queen's no-borrow weave
> (`mx`, teen minuends ≤20). A short-lived standalone `sub_col` game was added
> and then removed; a stale saved `gameMode='sub_col'` now falls back to `mx`
> (core.js `_savedMode`). Superman's column subtractions widened to the full
> a∈[11,29] range (e.g. 27−13), so its no-borrow set is a strict superset of the
> removed game — nothing was lost.

---

## 7. Background module contract

```js
window.BACKGROUNDS = window.BACKGROUNDS || {};
BACKGROUNDS.space = {
  skin: 'space',                          // which game skin fits this backdrop
  init({ stage }) { ...; return cleanup; } // owns everything inside #stars-layer
};
```

- `bg-loader.js`: `loadBackground(name)` — cleanup previous → inject
  `backgrounds/<name>.bg.js` + `game/skins/<skin>.skin.css` → `init`.
- Discovery bubble (click-for-facts) lives inside `space.bg.js`.
- The old in-loop `theme !== 'galaxy'` lifecycle hack is replaced by `cleanup()`.
- v1 ships **space only**; the theme picker is reduced accordingly.

> **As shipped:** Phase 5 was carried out — `backgrounds/` now holds `space`,
> `unicorns`, `reef`, `savanna` and `dubai` as `.bg.js` + `.skin.css` pairs (not
> "space only"). The registry contract above is otherwise accurate; see
> `backgrounds/README.md` and `NEW_BACKGROUND_GUIDE.md` for the current pattern.

---

## 8. Execution phases (each gated by the test suite)

**Phase 0 — baseline:** full suite on the legacy file + reference screenshots.

**Phase 1 — prune in place:** remove mini-games + hearts + abacus from the legacy
file, sever the integration points, delete their tests.
*Gate:* remaining suite green on the legacy file. This isolates "feature removal"
from "file split" so failures are attributable.

**Phase 2 — mechanical split:** slice the pruned monolith into `index.html` +
`game/css/*` + `game/js/*` at top-level boundaries, preserving exact include order
(identical global-scope semantics). *Gate:* suite green against `index.html`;
screenshot parity.

**Phase 3 — componentize:**
- extract `success.js` behind the SUCCESS contract;
- extract `space.bg.js` + `bg-loader.js` + `space.skin.css`;
- replace the hardcoded level-button row with the two-tier picker rendered from
  `DIFFICULTY_GROUPS`;
- convert `backgrounds/space.html` into the harness.
*Gate:* suite green; manual checks (theme in/out, discovery, celebrations, fps).

**Phase 4 — cutover:** `test_game.py` → `index.html` permanently; legacy file
frozen with a "superseded" header comment; version numbering continues on the shell.

**Phase 5 (later):** port unicorns/dino/reef/... one at a time as `.bg.js` +
`.skin.css` pairs.

---

## 9. Decisions

1. ~~Hearts & abacus~~ — **RESOLVED: drop entirely** (aid mode, abacus, in-exercise
   hearts display, mode-0 force-hearts rule).
2. ~~Difficulty grouping~~ — **RESOLVED: declarative DIFFICULTY_GROUPS config**
   (easy: 1+1 / עד 5 / עד 10; medium: גשר 10 / מלכה) driving a two-tier picker.
3. ~~Mode 20~~ — **RESOLVED: included in the medium tier** (עַד 20, גָּשֵׁר 10, מַלְכָּה).
4. **`index.html` location:** repo root (`subtraction_game/index.html`) — recommended.
5. **Skin approach:** CSS-variables skin per background (no DOM changes in v1) — recommended.
6. **Obsolete tests:** delete ≈50 tests in Phase 1 — recommended.
7. **Legacy file:** frozen in place untouched — recommended.

~~Awaiting one final "approved" to start executing Phase 0/1.~~ **DONE** — all
phases were executed and the project has since evolved past this v1 scope (see
the historical-record banner at the top of this file).
