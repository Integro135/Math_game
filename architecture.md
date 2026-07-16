# Math Game — Architecture (post-restructure)

*Restructured 2026-06-12. Entry point: **`index.html`**. Full test suite
green against this structure.*

> **Documentation map.** This file is the top-level architecture + the
> extension contracts (§3). Each subfolder also has its own deep `README.md`,
> and there is a full build guide for new worlds:
>
> | Doc | Covers |
> |---|---|
> | `game/js/README.md` | the 8 global-scope engine scripts (structure / key functionality / integration, per file) |
> | `game/css/README.md` | the 5 base stylesheets + the runtime skin-override model |
> | `game/skins/README.md` | per-background skins — the four families a skin owns + the rules it must respect |
> | `aids/README.md` | the aid-art variants + the shared `jar_stage.js` counting-box engine |
> | `exercises/README.md` | one-file-per-exercise-type system + the type contract |
> | `success_screens/README.md` | the celebration screens + the SUCCESS registry contract |
> | `backgrounds/README.md` | scene modules + the standalone-HTML → `.bg.js` porting checklist |
> | **`NEW_BACKGROUND_GUIDE.md`** | **step-by-step: how to build a whole new background PACK** (scene + skin + aid art + wiring) |

---

## 1. File map

```
subtraction_game/
├─ index.html                      ★ THE entry point — HTML skeleton + ordered
│                                    <link>/<script> includes + version tag
├─ tests/                          pytest+Playwright suite (runs on index.html),
│                                    split by category — see tests/README.md
│
├─ game/
│  ├─ css/                         loaded in this order:
│  │  ├─ base.css                  layout, header, card, equation, buttons,
│  │  │                            difficulty picker, end screen
│  │  ├─ aids.css                  number-line panel, cookie jar / chain garden,
│  │  │                            TDA toggle, TT hint, try-first lock
│  │  ├─ effects.css               fireworks/nfw overlays, sad modal, report,
│  │  │                            theme & games menus, gift indicator
│  │  ├─ themes.css                per-theme body styling (boys, galaxy objects)
│  │  └─ responsive.css            all @media breakpoints (≤768/480/360)
│  ├─ skins/                       ★ the game's LOOK over each background:
│  │  ├─ space.skin.css              mission HUD (no blur, ghost outlines)
│  │  ├─ unicorns.skin.css           candy valley (rose frosted glass)
│  │  ├─ dubai.skin.css              golden hour (navy glass, gold hairlines)
│  │  └─ reef.skin.css               sunlit lagoon (aqua glass, bubble buttons)
│  └─ js/                          loaded in this order:
│     ├─ data.js                   constants: TC_MAP coin art, pools config,
│     │                            DIFFICULTY_GROUPS
│     ├─ problems.js               all problem generators (mx/br/coins/tens/TD)
│     ├─ core.js                   ★ game logic: state, setMode, renderModePicker,
│     │                            loadProblem, renderEq, checkAns, tryFirst,
│     │                            scoring, report, endGame, creature, tooltip
│     ├─ success.js                ★ success screens + SUCCESS registry contract
│     ├─ aids.js                   generic NL + counting-jar ENGINE — all art
│     │                            (rider, jar, items, icons, hints) comes from
│     │                            the active AIDS variant; aid toggle, games
│     │                            dropdown (aid toggles only)
│     ├─ bg-loader.js              ★ background + skin + AIDS-variant dynamic loader
│     ├─ themes.js                 THEMES data (girls/galaxy/reef/dubai),
│     │                            applyTheme + _BG_THEMES mapping, click FX
│     │                            (all scene rendering lives in backgrounds/)
│     └─ main.js                   boot + global keyboard handlers
│
├─ aids/                           per-background NUMBER-LINE + JAR variants,
│  │                                 loaded dynamically by bg-loader (see §3.5)
│  ├─ jar_stage.js                 ★ the counting-jar DISPLAY engine (depth
│  │                                 grid, drop/burst FX) — loaded on demand;
│  │                                 consumes any variant's art, auto-sizes
│  │                                 items from the itemSVG viewBox
│  ├─ classic.aids.js              kangaroo rider + cookie jar (boot default)
│  ├─ space.aids.js                rocket rider + asteroid capsule + planets
│  ├─ reef.aids.js                 dolphin rider + pearl chest + coral garden
│  ├─ dubai.aids.js                helicopter rider + gold-coin vault + palms
│  └─ unicorns.aids.js             unicorn rider + crystal cupcake jar + flowers
│
├─ exercises/                      ★ ONE FILE PER EXERCISE TYPE (see §3.6);
│  │                                 loadExercisesFor injects per game mode
│  ├─ add.ex.js                    TA  a+b (1+1 ladder, עד5/10/20, br, mx)
│  ├─ sub.ex.js                    TS  a−b
│  ├─ missing.ex.js                TM  a−?=b
│  ├─ double.ex.js                 TDA/TDS  __±__=r
│  ├─ chain.ex.js                  TZ/TX/TW  three-term chains (mx)
│  ├─ coins.ex.js                  TC  coin counting + pool inject hook
│  ├─ tens.ex.js                   TT  round tens (mx)
│  ├─ big_step.ex.js               TBG big number ± 1-4 — the internal עַד 100 💯
│  │                                 handle AND mixed into Queen + Superman;
│  │                                 no carry/borrow, never crosses the ten
│  │                                 below; only the ones move
│  ├─ column_add.ex.js             TCA column addition — Superman 🦸
│  │                                 (interactive mount module, #colx-root)
│  ├─ column_sub.ex.js             TCS column SUBTRACTION (borrow/פריטה) — Queen
│  │                                 (no-borrow), and a STAGED horizontal-first
│  │                                 GRADED flow in Superman + אַלּוּפָה (§3.6)
│  │                                 (interactive mount module, #colx-root)
│  ├─ coin_mul.ex.js               TCM "how many ₪2/₪5/₪10 coins fit in X" — first
│  │                                 multiplication, Superman 🦸 + אַלּוּפָה 🏆
│  │                                 (interactive mount module, #colx-root)
│  ├─ mult_champ.ex.js             TMK אַלּוּפָה 🏆 multiplication (the קָשֶׁה tier,
│  │                                 factors ≤4) — the bare product a×b shown
│  │                                 FIRST; a wrong answer reveals the repeated-
│  │                                 addition chain (a+a+…) + a 🔁 SWITCH that
│  │                                 flips the repeated number (3×4: 3+3+3+3 ↔ 4+4+4)
│  │                                 (interactive mount module, #colx-root)
│  ├─ perimeter.ex.js              TPP polygon PERIMETER (הֶקֵּף) — a to-scale
│  │                                 square/rect/triangle with a 1..4 length by
│  │                                 each side; sum the sides. אַלּוּפָה
│  │                                 (interactive mount module, #colx-root)
│  ├─ compare.ex.js                TCP DRAG a < / > / = sign into the slot between
│  │                                 two numbers (pointer-drag). אַלּוּפָה
│  │                                 (interactive mount module, #colx-root)
│  ├─ triple_sum.ex.js             TTS __+__+__ = N (target VARIES 6..12) — three
│  │                                 CHOSEN addends; 0 and 10 disallowed (a 0/10
│  │                                 answer is praised, no penalty, must retry).
│  │                                 Queen + Superman + אַלּוּפָה
│  │                                 (interactive mount module, #colx-root)
│  ├─ half.ex.js                   THF "כַּמָּה זֶה חֵצִי" — two friends share
│  │                                 4/6/8/10/12/14 items EQUALLY; tap → a golden
│  │                                 middle line splits them in two (first division;
│  │                                 a JS auto-fit shrinks the row to the card when
│  │                                 many items). אַלּוּפָה (mount module, #colx-root)
│  └─ plates.ex.js                 TPL "צַלָּחוֹת" — g plates × s items each
│                                    (2..4×2..4), find the TOTAL; tap → the items
│                                    pour into one countable row (multiplication
│                                    story, inverse of half).
│                                    אַלּוּפָה (interactive mount module, #colx-root)
│
├─ backgrounds/
│  ├─ README.md                    ★ per-background docs (scene inventory, timers,
│  │                               click interactions) + the HTML→.bg.js porting
│  │                               checklist for game integration
│  ├─ space.bg.js                  ★ background MODULES — single source of
│  ├─ unicorns.bg.js                 truth, used by BOTH the game and the
│  ├─ dubai.bg.js                    harness; themes map to them via
│  ├─ reef.bg.js                     _BG_THEMES (themes.js)
│  ├─ space.html                   thin dev harnesses (one per module):
│  ├─ unicorns.html                  open directly in a browser to iterate
│  ├─ dubai_skyline.html             on a scene in isolation
│  └─ underwater_happy_reef.html
│
├─ subtraction_game.html           frozen pruned monolith (superseded, reference)
├─ legacy_subtraction_game_v6.52.html   pristine pre-restructure original
├─ separation_plan.md              the approved plan this executed
└─ success_screens_spec.md         brief for building new success screens
```

Everything runs from `file://` — therefore only classic `<script src>`/`<link>`
tags and runtime *tag injection* are used (fetch/ES-modules are CORS-blocked
on `file://`). All JS is global-scope; inline `onclick` handlers keep working.

## 2. What was removed in the restructure

- **All 12 mini-games** (knockout, party, lego, balloons, garden, invaders,
  bubbles, train, frogs, stars, cans, cookies): ≈1,500 JS lines, ≈680 CSS lines,
  12 HTML panels, star-cost menu, spacebar/ESC panel dispatchers.
- **Hearts & abacus** — the aid mode, the bead abacus, the in-exercise hearts
  display, and mode-0's force-hearts rule. `aidMode` now cycles `kang ↔ nl` only.
- ≈50 obsolete tests. Suite went 123 → 81 collected tests.
- **The four legacy DOM themes** (boys/dino/castle/savanna) + their embedded
  scene renderers (≈1,450 lines in themes.js: initFutureCityScene,
  initDinoScene, initFairyPrincessScene, initSavannaScene, plus the by-then
  dead initUnicornScene/initUnderwaterScene), their THEMES data, menu buttons,
  theme CSS blocks, the GIRL/BOY anime-char particles and the floating emoji
  particle spawner. Every remaining theme is a dynamically-loaded canvas
  background module; a stale localStorage theme falls back to girls.

Kept intact: every game mode (1+1/5/10/20/גשר 10/מלכה), all problem generators,
the number line, the cookie jar + chain garden, tryFirst lock & penalties,
digit hint, report, gift goals, themes, discovery bubble.

## 3. The contracts (how to extend)

### 3.1 Backgrounds — `backgrounds/<name>.bg.js`

```js
window.BACKGROUNDS = window.BACKGROUNDS || {};
window.BACKGROUNDS.space = {
  skin: 'space',                       // → game/skins/space.skin.css
  aids: 'space',                       // → aids/space.aids.js   (optional,
                                       //   defaults to 'classic' — see §3.5)
  init({ stage }) {                    // stage = the #stars-layer element
    /* mount everything inside stage */
    return function cleanup() { /* stop rAF, remove listeners & DOM */ };
  },
};
```

`game/js/bg-loader.js` exposes `loadBackground(name)` / `unloadBackground()`:
it injects the module script on demand, swaps the skin `<link>`, loads the
background's AIDS variant (§3.5), and runs the previous background's
`cleanup()`. `applyTheme('galaxy')` → `loadBackground('space')`;
`unloadBackground()` reverts skin → none and aids → `classic`.

**Adding a background:** write `backgrounds/foo.bg.js` (same shape) +
`game/skins/foo.skin.css`, then map a theme to `loadBackground('foo')` in
`applyTheme` (themes.js). Iterate standalone with a copy of the
`backgrounds/space.html` harness.

### 3.2 Skins — `game/skins/<name>.skin.css`

Each background ships a skin that restyles **the game itself** to match it.
A skin may override four families (see comments inside `space.skin.css`):

1. **Palette** — `--skin-primary/--skin-accent/--skin-glow/--skin-text`
   (also passed to success screens as `opts.palette`)
2. **Fonts** — `body{font-family:...}` etc.
3. **Glass transparency** — `.glass{background/backdrop-filter}`
4. **Position on screen** — `.wrap{max-width/margins/padding}` to place the
   game column so the scene's hero objects stay visible.

A skin may also restyle the aids: the space skin turns `#nl-panel` into a
comet-trail trajectory (waypoint-star ticks, golden 5-beacons, round thruster
± buttons) — so each skin can ship a different-looking number line while the
engine markup (aids.js) and the rider art (`aids/<name>.aids.js`) stay shared.

### 3.3 Success screens — the SUCCESS registry (success.js)

```js
window.SUCCESS.styles.push({
  name: 'comet-shower',
  supportsSuper: true,
  show({root, isSuper, durationMs, points, palette, praise}) {
    /* animate inside root */
    return cleanup;
  },
});
```

Registered screens join the random rotation alongside the 5 built-ins
(canvas fireworks / confetti / burst / hero / ripple); styles with
`supportsSuper` also join the every-5th-answer super rotation. The host owns
the root element, the Enter/Space/click skip, timing (1700 ms / 3500 ms super)
and cleanup. Full brief for authors: `success_screens_spec.md` (includes a
standalone dev harness). Integration = add the file name to the
`SUCCESS_FILES` manifest (data.js); bg-loader injects
`success_screens/<name>.js` dynamically at boot — no index.html edit needed.

### 3.4 Difficulty picker — `DIFFICULTY_GROUPS` (data.js)

```js
const DIFFICULTY_GROUPS=[
  {id:'easy',  label:'קַל',      modes:[{id:0,label:'1+1 🌱'},{id:5,label:'עַד 5'},{id:10,label:'עַד 10'},{id:20,label:'עַד 20'}]},
  {id:'medium',label:'בֵּינוֹנִי', modes:[{id:'br',label:'גָּשֵׁר 10 🌈'},{id:'mx',label:'מַלְכָּה 👸'},{id:'sup',label:'סוּפֶּרְמֶן 🦸'}]},
  {id:'hard',  label:'קָשֶׁה',     modes:[{id:'mulc',label:'אַלּוּפָה 🏆'}]},   // multiplication (factors ≤4): product first, chain-on-mistake + 🔁 switch
];
```

The 🎁 prize badge is **not** part of any label — `renderModePicker` appends
it at render time only for games that currently carry a gift goal
(`GIFT_GOALS[id] > 0`; defaults from `DEFAULT_GIFT_GOALS`, editable per game in
settings via `setGiftGoal`). The standalone "עַד 100 💯" big-number game (`big`,
TBG) is **not** in the picker — those exercises now live inside Queen and
Superman; `big` survives only as an internal handle. A stale saved
`gameMode='sub_col'` (the removed standalone column-subtraction game) no longer
resolves in `DIFFICULTY_GROUPS`, so `_savedMode()` (core.js) falls back to `mx`.

The picker (tier tabs + game pills) is rendered from this config by
`renderModePicker()` (core.js) into the **settings modal** (`#settings-ov`),
opened via the ⚙️ gear button next to the theme button (or by clicking the
header's read-only current-game indicator `#mode-ind`, also rendered by
`renderModePicker`). Picking a game switches the mode and closes the modal;
ESC / backdrop / ✕ close it without changing anything. Browsing a tier does
**not** switch the mode — only clicking a game does. Buttons keep their
`lb<id>` ids (`lb0`, `lb5`, `lb10`, `lb20`, `lbbr`, `lbmx`, `lbsup`)
and stay in the DOM while the modal is hidden, so automation keeps
working. Moving/adding/renaming a game = editing this config only.

### 3.5 Aids (number line + counting jar) — `aids/<name>.aids.js`

`game/js/aids.js` is a **generic engine**: stepping, counting, eating/adding
items, the chain garden, the aid toggle. *All the art* — the number-line rider,
the jar container, the counted items, the menu icons, the hint sentences —
comes from the active **AIDS variant**, loaded dynamically by bg-loader
(`loadAids(name)` injects `aids/<name>.aids.js` on demand, then calls
`applyAidsVariant()` to re-render the rider + jar in place):

```js
window.AIDS = window.AIDS || { variants: {}, current: null };
window.AIDS.variants.space = {
  numberLine: {
    icon: '🚀',                        // games-menu icon for the NL toggle
    rider: '🚀',                       // what hops along the line (was 🦘)
    hintAdd: 'טוּס קָדִימָה עַל הַיְּשַׁר 🚀',  // loadProblem hint, addition
    hintSub: 'טוּס אָחוֹרָה עַל הַיְּשַׁר 🚀',  // loadProblem hint, subtraction
  },
  jar: {
    icon: '⭐',                        // games-menu icon for the jar toggle
    gardenIcon: '🪐',                  // games-menu icon for the chain garden
    itemName: 'כּוֹכָבִים',              // plugged into the jar hint sentences
    hintAdd: '...', hintSub: '...',    // optional full hint overrides
    containerSVG: '<svg ...>',         // the jar art (glass capsule in space)
    itemSVG(i)   { return '<svg ...>'; },  // counted item #i (glowing stars)
    gardenSVG(ci){ return '<svg ...>'; },  // chain-garden plant, color ci
  },
};
```

- **`aids/classic.aids.js`** (kangaroo + cookie jar + flowers) is loaded at
  boot and is the fallback for every field — a variant may override only
  what it wants.
- **The jar DISPLAY is its own module** — `aids/jar_stage.js`
  (`window.JAR_STAGE.mount({root,variant}) → {set,add,remove,variant,cleanup}`),
  injected on demand by `bg-loader.loadJarStage`. It renders any variant's
  art on a pseudo-3D depth grid (front row bright, back rows raised/dimmed),
  with squash-bounce drops, accent-colored sparkles, poof bursts and a glass
  shine sweep. Item boxes are AUTO-SIZED from the variant's `itemSVG` viewBox
  — a new variant needs zero CSS. Colors pull from `--skin-*`; every element
  carries a stable `.jst-*` class that skins may restyle. The logic engine
  (aids.js pgm*) only drives the handle.
- A background opts in via `aids: 'space'` in its BACKGROUNDS entry;
  `unloadBackground()` always reverts to `classic`.
- index.html ships only empty mounts (`#nl-dot`, `#pgm-ck-jar`); nothing
  variant-specific is copied into the game files.

### 3.6 Exercise types — `exercises/<name>.ex.js` (one file per type)

EVERY exercise type lives in its own file and registers itself into
`window.EXERCISES.types` with its mode support and generator:

```js
window.EXERCISES.types.big_step = {
  t: TBG,                      // the ptype constant(s) it serves
  modes: ['big'],              // which game modes include this type
  aidsReveal: 'afterMistake',  // optional: 'always' shows the aids (number
                               // line / jar) from the first attempt;
                               // default keeps the try-first lock
  make(mode) { return [...problem objects...]; },
};
```

The reveal policy is read generically by `_lockAids` (core.js) for whatever
type is on screen — flipping one field in the type's file changes when its
aids appear. The three column/coin interactive types (`column_add`,
`column_sub`, `coin_mul`) all declare `aidsReveal:'always'`, so their aid
(a skinned number line for the columns, the coin tray itself for `coin_mul`)
is available from the start; every other type keeps the hidden-until-first-
mistake behavior.

`EXERCISE_INDEX` (data.js) maps file → supported modes. When a game mode
starts, `bg-loader.loadExercisesFor(mode)` injects exactly the type files
that mode lists (synchronously when cached), then the mode RECIPE in
problems.js (`makePool`) asks each registered type for its contribution.
Current recipes:

- **עד5/10/20** — the basic four types (`missing`/`sub`/`add`/`double`) with
  TD slotting, then the coins type's `inject()` hook (1-2 coin problems).
- **Queen (`mx`)** — `makeMxPool()` = each loaded type's `make('mx')` quota
  shuffled into 19 problems: chains 6, add/sub/missing 1 each, double 2 (a
  TDA + a TDS), round-tens 2, coins 2, big-step 2, and
  `column_sub.make('mx') = makeNoBorrow(2)` = 2 NO-borrow column subtractions
  (Queen keeps teen minuends, a≤19/b≤18 — narrower than Superman's 11–29). A
  guard re-seats slot 0 if it landed on a TCS column problem (the first card
  must show a normal `#ans` input, since the column module renders its own
  staged UI).
- **Superman (`sup`)** — a BALANCED equal share of every interactive type,
  shuffled: `column_add.make('sup')` (3 = 2-carry + 1 no-carry),
  `big_step.make('sup')` (3 big-number SUBTRACTIONS),
  `coin_mul.make('sup')` (3 = one each ₪2/₪5/₪10), and
  `column_sub.make('sup') = makeStaged(makeSup())` (6 two-digit subtractions, 3
  no-borrow + 3 with-borrow, TAGGED `staged` → the horizontal-first GRADED flow
  below) + `hundreds`/`mult_chain` shares. Superman is a strict superset of the
  removed standalone column-subtraction game — nothing was lost.
- **אַלּוּפָה (`mulc`, the קָשֶׁה/hard tier)** — a MIXED pool (`_capPool` to 20) of
  the self-mounting hard types, shuffled: `mult_champ.make('mulc')`
  (multiplication up to 4, product first), `perimeter.make('mulc')` (polygon
  perimeter, §3.6 list), `column_sub.make('mulc')` (the STAGED subtraction),
  `compare.make('mulc')` (drag-the-sign), `word_prob.make('mulc')` (short nikud
  word problems), `triple_sum.make('mulc')` (`__+__+__=20`, no 0/10) and
  `half.make('mulc')` (share 4/6/8/10/12/14 items equally between two — first division)
  and `plates.make('mulc')` (g plates × s items → total, the multiplication story),
  plus the two basic-multiplication exercises borrowed from Superman —
  `coin_mul.make('mulc')` (how many ₪2/₪5/₪10 coins fit in X) and
  `bagel_cost.make('mulc')` (X bagels × ₪5). `coins.ex.js` is loaded in `mulc`
  too so those two get the real coin art (`tcCoinSVG`). `modePts('mulc')=20`.

**Staged (horizontal-first, graded) column subtraction.** In Superman and
אַלּוּפָה any TCS problem tagged `staged` is mounted by `mountStaged`: the fact is
shown HORIZONTALLY first (`a − b =`) with a solvable input; a wrong answer drops
to the vertical column. Points are graded by mistake count on the mode's
`modePts()` base — `FRAC=[1,0.75,0.5,0]` → 100% · 75% · 50% (+ the number line
opens) · 0%. It uses three extra `api` hooks (`penalize`, `showNL`, `solvedFrac`,
see below) and never calls `api.wrong`, so the try-first machinery stays out of
its way (`aidsReveal:'always'` for `sup`/`mulc`; `loadProblem` starts the line
hidden for a `staged` TCS).

setMode / restart / boot all run their pool build inside the loader callback.

Shared single-input rendering (`renderEq`) and checking (`checkAns`) stay in
core.js as generic infrastructure. A type that needs its OWN interaction
adds a `mount` to the same registration:

```js
window.EXERCISES.types.column_add = {
  mount({root, a, b, p, api}) {  // build everything inside root
    /* api.wrong(val) — committed wrong answer (host: penalty + sad modal)
       api.solved()   — exercise complete    (host: score + success screen)
       api.nl(anchor) — park the number-line rider
       // graded (staged) extras, used by the staged column subtraction:
       api.penalize(v)     — log a mistake WITHOUT the try-first unlock/score
       api.showNL()        — reveal the number line on demand
       api.solvedFrac(f)   — award round(modePts()*f)  (the 100/75/50/0 ladder)
       p = the FULL problem object (fields beyond a/b: perimeter's sides, staged) */
    return cleanup;              // remove listeners/timers
  },
};
```

`EXERCISE_OF_TYPE` (data.js) maps a ptype to its file —
`{ [TCA]:'column_add', [TCS]:'column_sub', [TCM]:'coin_mul', [TBC]:'bagel_cost',
[TPG]:'polygon', [TMC]:'mult_chain', [TMK]:'mult_champ', [TPP]:'perimeter',
[TCP]:'compare', [TWP]:'word_prob', [TTS]:'triple_sum', [THF]:'half', [TPL]:'plates' }`. `renderEq` emits a
single `<div id="colx-root">` for any of them and calls `_colxMount` (core.js).
`_colxMount` injects `exercises/<name>.ex.js` on demand (bg-loader
.loadExercise) and mounts it into that root. Its async load callback re-checks
that the live `idx`/`ptype` is still the same and that
`EXERCISE_OF_TYPE[ptype] === exName`, so a stale module-load can never mount the
wrong exercise (and each interactive module's own `mount()` cleanup cancels its
layout rAF and timers). The host keeps scoring
(`_tfPts`), tryFirst, the report, the sad modal and the success flow; the
module owns everything visual + its own checking. Module inputs carry the
global `ans-inp` class so the green/red answer-border contract applies
automatically.

The interactive types served by this `#colx-root` host (the newer ones —
`mult_chain`, `mult_champ`, `perimeter`, `compare`, `word_prob`, `triple_sum`, `half`, `plates` — share the same
mount contract; a few are detailed in `exercises/README.md`):

- **column addition** (`column_add.ex.js`, TCA) — units first, a carried 1
  flies up to the tens column; the skinned 0-20 number line is on from the
  start, with hint circles after a mistake. Reaches up to 48 (top addend
  11-29, bottom 2-19). The bottom-units hover splits into complete-to-ten +
  remainder (`_bridgeSplit`).
- **column subtraction** (`column_sub.ex.js`, TCS) — the subtraction mirror,
  staged units→tens, problem `{t:TCS,a,b}` with `a>b`. Handles the borrow
  (פריטה) via a settings toggle (`#borrow-toggle` → localStorage `subBorrow` =
  `hybrid` (default, the child taps the top tens digit) | `auto` (it regroups
  itself)); read by `subBorrowMode()`/`setSubBorrowMode()` in core.js. Its aid
  is the skinned number line in COUNT-BACK mode. A units mistake rings the two
  units digits, a tens mistake rings the two tens; mistakes are NOT taught with
  an animation (it mirrors `column_add`). The bottom-units hover shows a
  subtract-through-ten split.
- **coin multiplication** (`coin_mul.ex.js`, TCM) — "how many ₪2/₪5/₪10 coins
  fit in X" (first multiplication), problem `{t:TCM,a,b}` where `a` is the target
  and `b` the coin value; each session shows one of EACH — ₪2 (4–10), ₪5 (10–35),
  ₪10 (20–90) — so the
  typed answer is the COUNT `a/b`. The child taps + / − to add/remove the coins
  in a tray (the manipulative; no number-line aid),
  capped at `need+3` so reaching the answer never reveals it; a wrong answer
  gives directional (bigger/smaller) feedback off the TYPED value.
- **polygon perimeter** (`perimeter.ex.js`, TPP) — a square/rect/triangle drawn
  TO SCALE (`triVerts`, law-of-cosines) with a length 1..4 by each side; the child
  types the SUM of the sides. Self-checks; no number line (the labelled shape is
  the manipulative). Mixed into אַלּוּפָה.
- **compare** (`compare.ex.js`, TCP) — two numbers with an empty slot between
  them; the child DRAGS the correct `<`/`>`/`=` sign into the slot (genuine
  pointer-drag, mouse + touch; a floating ghost + a rect hit-test on the slot).
  Self-checks; no number line. Mixed into אַלּוּפָה.

Each ships a thin dev harness (single source of truth) — e.g.
`column_addition.html` for `column_add`.

## 4. Verification trail

| Gate | Result |
|---|---|
| Baseline (pre-restructure monolith) | 114 passed, 2 rotating timing flakes, 7 skips |
| Phase 1 — after pruning mini-games/hearts/abacus | **73 passed / 0 failed** / 8 skips |
| Phase 2 — suite pointed at split `index.html` | 70 passed + 2 flakes (both pass isolated) |
| Phase 3 — smoke (picker, SUCCESS contract, bg loader, harness) | all pass, no JS errors |
| **Final full run on the new structure** | **74 passed / 0 failed / 7 skips** |
| Suite refreshed for the dynamic-exercise era — 22 new tests (dynamic loading, big/sup modes, jar stage, border contract, settings modal, fixed icons) + a real boot-race fix (stale boot callback could overwrite a freshly picked mode's pool) | **95 passed / 0 failed / 8 skips** (103 collected) |
| TBG (big ±1/2) woven into Queen + Superman; number line now supports a `base` offset so TBG shows a window centered on the big number (e.g. 75 → 65..85); helpers hardened (`reveal_aids` re-submits via `checkAns()`, `wait_fw_and_advance` closes via `fwClose()`) — the long-standing TC load-flake is gone | **98 passed / 0 failed / 7 skips** (104 collected) |
| Superman number line oriented to the TOP number's units digit (e.g. 13+18 → rider on 3 from the start, not 8) and shown from the first attempt; `solve_one` now waits for a ready board before reading state (kills the last boot-race flake) | **101 passed / 0 failed / 7 skips** (108 collected) |
| Chosen game persists across refresh (localStorage `gameMode`, resolved back through DIFFICULTY_GROUPS to recover the id's original number/string type; falls back to mx on a missing/garbage value) | **109 passed / 0 failed / 8 skips** (117 collected) |
| Per-answer success screens linger +1s (1700→2700 normal, 3500→4500 super); gift-reward coverage added (eligibility threshold-gated by GIFT_GOALS, end-of-set 🎁 + the special `SUCCESS.special.gift` screen that lives in its own `success_screens/gift/` subfolder, shown ONLY when the grade clears the mode threshold) | **115 passed / 0 failed / 7 skips** (122 collected) |
| Success-screen praise headlines now varied (random pool, no longer always "כל הכבוד") + optional player name (settings → localStorage `playerName`) woven in on a 2–3 screen cadence ("כָּל הַכָּבוֹד נֹעָה!" / "הִצְלַחְתְּ נֹעָה!"); the gift screen greets by name too | **121 passed / 0 failed / 9 skips** (130 collected) |
| Added permanent coverage for the success-screen display duration (the +1s linger): a no-op probe screen + `_fwOn` lifetime measurement assert ~2700ms normal / ~4500ms super and that the game advances after each | **124 passed / 0 failed / 8 skips** (132 collected) |
| Fixed a sticky try-first lock: entering Superman (an `aidsReveal:'always'` type) from a normal mode left `tf-locked-nl` on `<body>`, CSS-hiding the number-line numbers until a refresh. The always-on branch of `_lockAids` now actively clears the lock (body class + `tf-locked` buttons). Added a regression test | **126 passed / 0 failed / 7 skips** (134 collected) |
| Fixed the number-line ←/→ arrow keys in the column exercise: the handler was gated on `tryFirst>0` (dead on an always-on line) and ignored non-`type=number` inputs (the column boxes are `type=text`). Arrows now drive the rider whenever the line is visible and pass through from any `.ans-inp` answer box; drag gated on visibility too. Added a regression test | **127 passed / 0 failed / 7 skips** (135 collected) |
| Three אַלּוּפָה additions covered: **`perimeter`/TPP** (sum a to-scale polygon's 1–4 side labels; drawn-to-scale triangle via `triVerts`), **`compare`/TCP** (DRAG a `<`/`>`/`=` sign into the slot; real `page.mouse` pointer-drag), and the **STAGED horizontal-first column subtraction** now in **Superman + אַלּוּפָה** (graded ladder 100/75/50/0 on the mode base — mulc 20/15/10/0, sup 15/11/8/0 — number line opens on the 2nd mistake). 17 new tests (`TestPerimeter`, `TestCompare`, `TestStagedColumnSub`) | **+17 new (perimeter/compare/staged-sub), all pass** |
| New אַלּוּפָה type **`triple_sum`/TTS** — `__+__+__ = 20`, the child picks three addends; **0 and 10 are disallowed** — a sum-correct 0/10 answer is PRAISED, costs NO points and does NOT complete (retry with other numbers), a wrong sum is a normal mistake. Self-mounting, wired like the other mulc types. 5 new tests (`TestTripleSum`: mount, valid→full 20, wrong-sum→penalty, 0→no-penalty-must-retry, 10→no-penalty-must-retry) | **+5 new (triple_sum), all pass** |
| New אַלּוּפָה type **`half`/THF — "כַּמָּה זֶה חֵצִי"** (first DIVISION): a word problem — two girls share 4/6/8/10 items EQUALLY; TAPPING the items toggles a golden MIDDLE line that splits them into 2 equal halves sliding toward each girl; the child types how many EACH gets (n÷2). A wrong answer auto-opens the split ("count one side"). Rotating item emoji + girl-name pairs. 5 new tests (`TestHalfSplit` in tests/test_champion.py: mount/halves, tap-toggles-split, correct→full 20, wrong→auto-split→13, pool = even totals only) | **+5 new (half), all pass** |
| **Success screen now skips on TAP/CLICK (mobile/tablet parity).** The per-answer celebration only dismissed on Enter/Space; `showFw` now also registers a document `pointerdown` listener (`_fwTap` → `fwClose`, removed in `_fwDone`) and its backdrop is `pointer-events:auto`, so a tap on phone/tablet skips it immediately and advances — like the desktop click. 1 new test (`TestSuccessDuration::test_tap_or_click_dismisses_immediately`); verified under real touch emulation (`has_touch` context, `touchscreen.tap` → `_fwOn` false + `idx`+1) | **+1 new, all pass** |
| **Two multiplication VISUALS** (the "half" tap-mechanic applied to ×): (1) **`mult_champ` tap-to-group picture** — the product drawn as a·b real objects under `a × b = □`; a TAP drops golden divider lines grouping them (3×4 → 4 groups of 3, one per chain term); follows the chain's `flip`, so 🔁 regroups it (commutativity made visible); a wrong product auto-groups. (2) New אַלּוּפָה type **`plates`/TPL — "צַלָּחוֹת"** (equal groups → TOTAL, the inverse of `half`): g CSS plates × s items (2..4×2..4); a TAP POURS the items into one countable row and back; a wrong answer auto-pours. 7 new tests (2 in `TestChampMultiplication` + `TestPlates` 5) | **+7 new (mult visuals), all pass** |
| **`triple_sum` (TTS) — target now VARIES 6..12 (was always 20), woven into Queen + Superman too** (was mulc-only). `TARGETS=[6..12]` shuffled (distinct per pool). Queen was a saturated 20-card pool, so `makePool('mx')` caps the curated base to 18 then weaves 1 polygon + 1 TTS post-cap (no core type dropped, slot 0 stays `#ans`); `tri_unknown`/TRA stays in Queen (its test still passes). 2 new TripleSum tests (varied-target range, in-mx/sup pools) + the existing 5 retargeted to N=12 | **all pass (mx/sup/game_flow regressions fixed)** |
| **Removed the `mult_champ` tap-to-group items picture** (added v8.98). Drawing a·b discrete emoji let the child COUNT them and read off the product before recalling it — it gave away the answer, defeating the product-first design (user: "אל תציג את הקבוצות כי זה מגלה את התשובה"). The card is back to the bare `a × b = □` + words hint + (on a mistake) the repeated-addition chain (which requires ADDING). The 2 items tests replaced by `test_no_countable_objects_shown`. ("count the groups" now lives only in `plates`.) | **all pass** |
| **Mobile numpad now STAYS OPEN when tapping outside it** (user: "המקלדת הייעודית שתישאר תמיד פתוחה ולא תיסגר כשלוחצים מחוץ למקלדת"). On touch, tapping an exercise manipulative (shape/tile/item) or the card background no longer closes the pad — the problem still needs its answer. Removed the pointerdown-outside `hide()`; `focusout` (fired by the blur a manipulative tap causes) now closes ONLY when there's nothing to type into: `done`, the active box is gone/disabled, or `blockingScreenUp()` (settings/report/parent-gate visible, or `_fwOn`/`_giftOn`/`_introOn`). A modal that opens while the box is already blurred (no fresh focusout) is caught by a pointerdown re-check. ✔-solve still closes via `done`, so the z-1200 pad never covers the z-996 celebration. Verified under touch emulation via `_verify_numpad_persist.py` (stays open on shape/bg tap, closes on solve) + `_verify_numpad_modal.py` (modal-after-tap hides, plain outside tap keeps open) | **verified (touch emulation), no console errors** |

## 5. Next steps (not yet done)

- ~~Port the unicorn valley~~ — DONE: unicorns/dubai/reef are all `.bg.js`
  modules with skins; girls→unicorns, reef→reef, dubai→dubai (new 🏙️ theme),
  each with its own AIDS variant and skin.
- ~~Design real per-background skins (space first)~~ — DONE: the space skin is
  a full "mission HUD" redesign (no blur, near-transparent veils, ghost-outline
  buttons, glow-based contrast, a comet-trail number line) built to occlude as
  little of the scene as possible. The galaxy theme drops the title emojis
  (THEMES data); everything else is pure `space.skin.css`.
- Plug in externally-authored success screens as they arrive
  (`success_screens_spec.md` is the brief).
- Optionally port the remaining legacy themes (dino/castle/reef/savanna/boys/
  girls) to background modules and slim themes.js down to data + applyTheme.
