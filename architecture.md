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
│  ├─ plates.ex.js                 TPL "צַלָּחוֹת" — g plates × s items each
│  │                                 (2..4×2..4), find the TOTAL; tap → the items
│  │                                 pour into one countable row (multiplication
│  │                                 story, inverse of half).
│  │                                 אַלּוּפָה (interactive mount module, #colx-root)
│  └─ ice_cream.ex.js              TIC "חֲנוּת הַגְּלִידָה" — she HAS ₪budget, every
│                                    ice cream costs ₪2/₪5/₪10; ＋ buys one (with
│                                    its price coin — skip-countable spending);
│                                    answer = budget÷price (division as "how many
│                                    groups"). אַלּוּפָה (mount module, #colx-root)
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
  word problems), `word_chain.make('mulc')` (CHAIN nikud story → a op b op c, result
  0..12), `triple_sum.make('mulc')` (`__+__+__`, no 0/10) and
  `half.make('mulc')` (share items equally among 2 or 3 — first division)
  and `plates.make('mulc')` (g plates × s items → total, the multiplication story),
  plus the two basic-multiplication exercises borrowed from Superman —
  `coin_mul.make('mulc')` (how many ₪2/₪5/₪10 coins fit in X) and
  `bagel_cost.make('mulc')` (X bagels × ₪5), and `ice_cream.make('mulc')` (the
  shop: she HAS ₪budget, each ice cream costs ₪2/₪5/₪10 — how many can she buy;
  division as "how many groups fit"). `coins.ex.js` is loaded in `mulc`
  too so the coin family gets the real coin art (`tcCoinSVG`). `modePts('mulc')=20`.

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
[TCP]:'compare', [TWP]:'word_prob', [TTS]:'triple_sum', [THF]:'half', [TPL]:'plates', [TIC]:'ice_cream' }`. `renderEq` emits a
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
| **אַלּוּפָה `mult_champ` (TMK): the "זֶה כְּמוֹ" chain now MATCHES the number line, and the 🔁 switch became a floating/separate button** (v9.48, user: the "זה כמו" area was showing the SWAP TARGET while the line jumped by the current number — confusing). On a line card `#mk-like-chain` shows the CURRENT orientation (`rep + rep + …`) beside "זֶה כְּמוֹ" so it agrees with the line's jumps; a 🔁 switch re-configures the line AND the chain together. The switch is no longer inline in the "זֶה כְּמוֹ" row — it's a FLOATING, SEPARATE round pill on its own line whose HOVER tooltip (`.mk-switch-tip`) previews the other orientation (the swap target). 2 new tests (`TestChampMultiplication::test_like_chain_matches_number_line_jumps`, `test_floating_switch_is_separate_and_tooltip_previews_target`); full `test_champion.py` green + verified via `backgrounds/_verify.py` | **79→81 champion tests pass; verified visually** |
| **Fixed near-invisible placeholder in `sent_order` (v9.74, user: "בקושי רואים את הטקסט").** The empty answer strip's prompt "לַחֲצִי עַל הַמִּלִּים לְפִי הַסֵּדֶר…" (`.so-hintword`) was hardcoded `rgba(255,255,255,.45)` — white, which vanished on light themes (girls' pale-pink valley). Switched to the theme INK `var(--skin-text,#fff)` at opacity .7 (+ slightly larger 1.1rem, bolder 700), so it tracks each theme's readable text colour: girls → deep plum `rgb(90,42,82)` on pink, dark themes → frost-white on dark. Same class of bug as the dinosaurs green-on-green — hardcoded colours don't survive re-skinning; use the skin vars. Verified via screenshots (girls/frozen/maldives) + computed-colour check; `TestSentOrder` (5) green | **5 sent_order tests pass; verified visually** |
| **Skip button REDESIGNED (v9.73, user: "שיהיה יותר יפה").** Two layers, because a base.css-only restyle was invisible: every theme skin flattens `.btn` to a ghost style (`body.theme-X .btn` outspecifies `.b-skip`), which is why the first screenshot showed a flat white pill. (1) base.css `.b-skip`: slate → PERIWINKLE glass pill (gradient, translucent white border), with a bouncy `skipPopIn` entrance — it re-runs each time the button is revealed, i.e. exactly at the 2nd mistake, since toggling from `display:none` restarts CSS animations — and a slow `skipShine` sweep (::before, transform-only; costs nothing while hidden). (2) all 8 skins: appended a per-theme `.b-skip` rule after the `.btn` block (same specificity, later cascade → wins): a COOL periwinkle tint distinct from the warm try/next accents, faint at-rest background + soft glow, stronger glow on hover. Verified by screenshots on girls (light), dinosaurs + frozen (dark) — readable and consistent on all; `TestLanguageSkip` (5) green | **5 skip tests pass; verified visually (3 themes)** |
| **Skip button now gated behind TWO mistakes (v9.72, user: "וודא שהכפתור של דלג מופיע רק אחרי 2 טעויות… אפשר להציג אותו בכל תרגילי השפה גם תחת אלופה").** The v9.71 skip button showed immediately; now it stays HIDDEN until the child has missed twice, so it's a genuine escape hatch, not a lazy shortcut. Implementation (core.js): the button is always injected for language types with `id="skip-btn"` + `display:none`; `_maybeShowSkip()` reveals it when `_isLangType(ptype) && !done && tryFirst>=2`, called from `api.wrong` (after `tryFirst++`) and from `showBtns`. `tryFirst` resets per problem (`_lockAids` via `renderEq`), so the gate resets each question; `skipLangQuestion()` also re-checks `tryFirst>=2` (defence in depth). It already worked in every mode (sup/mulc/lang) since the gate keys on ptype, not mode — now explicitly tested under אַלּוּפָה. `TestLanguageSkip` grown to 5: wired-but-hidden in all 6 kinds, absent for arithmetic, appears only after the 2nd mistake (hidden → 1 miss hidden → 2 misses visible → skip works: 0 pts + advance + report-skipped), the handler is a no-op before 2 misses, and a skipped row stays `ok:false` | **131 champion tests pass** |
| **"דַּלְּגִי עַל הַשְּׁאֵלָה" skip button on language cards (v9.71, user: "אם מדלגים מקבלים על השאלה 0 נקודות").** A reading card the child can't decode used to stall the whole set; now she can skip. Host-level (one place, not 6 modules): `_isLangType(pt)` = {TSQ,TCZ,TTF,TWM,TSO,TRH}; `showBtns('check')` injects the button into the `#btns` row for those types only (so the drag kinds word_match/sent_order, which have no ✓, get it too), NEVER for arithmetic. `skipLangQuestion()` sets `report[idx].skipped=true` (0 points — NOT gotCorrect), shows a neutral "⏭️ דִּלַּגְנוּ… 0 נְקֻדּוֹת", and advances after 700ms with NO celebration. Also fixed a report bug the skip exposed: the row `ok` flag was `wrongs.length===0`, so a skip with no wrong attempt rendered as a ✓ — now `wrongs.length===0 && !skipped`, and a skip shows as "דולג" (grade already excludes it via `!gotCorrect`). `.b-skip` (base.css) is a MUTED slate, smaller than the pink action buttons — a last resort, not a tempting shortcut. 4 tests (`TestLanguageSkip`): present in all 6 reading kinds, absent for column_sub, skip → 0 points + advance + report-skipped, and a skipped row is `ok:false` | **130 champion + 31 superman/flow pass** |
| **Answer-order shuffle VERIFIED + new questions audited for unambiguity (v9.70, user: "תערבב גם את סדר התשובות. ותוודא שכל השאלות החדשות הן חד משמעיות").** All three multiple-choice reading kinds already shuffle options at render (`story_quiz`/`cloze`/`rhyme` call `sh()` in `makeOne` and recompute `a`; `word_match` shuffles the word pills), so a source-fixed correct slot (c:0 / opts[0]) still displays in a random position. Locked in with 3 regression tests (`test_*_answer_position_is_shuffled`): over 240 built cards the correct index hits ALL THREE slots with none dominant (≥30 each) — the child can never learn "the answer is number 3" again. Unambiguity: hand-audited all 40 new questions (16 stories, 12 cloze, 12 true/false); tightened ONE tempting distractor — in the unicorn **רַעַם** ("thunder") story the distractor "רַעַשׁ שֶׁל רַעַם" could be rationalised from the name, replaced with the unrelated "נְבִיחוֹת שֶׁל כֶּלֶב". rhyme is already mechanically proven unambiguous (400-card sweep + final-letter filter); cloze is authored so exactly one option fits in context (incl. verb-noun collocation — "נָעַלְנוּ נַעֲלַיִם", not a hat); each false true/false statement flips exactly one detail | **126 champion tests pass** |
| **ALL six language-exercise banks DOUBLED (v9.69, user: "המשתמש כבר זוכר בעל פה את התשובות").** The child memorised the banks, so every reading kind grew: **story_quiz** 32→**48** stories (12/topic — 4 new each for space/unicorns/dinos/princess), **cloze** 12→**24** sentences, **true_false** 12→**24** items (6 new true + 6 new false, each false flips exactly ONE detail), **word_match** 18→**30** pairs, **sent_order** 12→**24** sentences (all single-natural-order: adjective locked after its noun, no duplicate words), **rhyme** 12→**24** pairs (לב/זאב, דגל/רגל, טלפון/מלפפון, גמל/סל, דבורה/מנורה, אף/כף, תנין/סכין, מטוס/כוס, כובע/צבע, מתנה/תמונה, גבינה/ספינה, מלך/דרך) + distractor pool 14→**20**. Every discipline held: full niqqud, unambiguity (cloze — no second logically-valid option; rhyme — normalized-final-letter filter, pair/distractor sets stay disjoint in words AND emoji; sent_order — one natural order), emoji ≤5.0 for Windows 10, zero emoji inside story text (the v9.67 leak guard sweeps the new stories too). The no-repeat shuffled-queue rotations are all generic over bank length, so they absorbed the growth untouched. Tests: size floors LOCKED (≥48/≥24/≥24/≥30/≥24/≥24 — a concurrent session can't silently shrink a bank); the story rotation test rewritten to DERIVE per-topic counts from the library (was hardcoded 32/8); new `test_word_match_bank_is_big_and_valid` over a new `_bank` hook (vowelled, no dup words/emoji); the 400-card rhyme unambiguity sweep passes over the doubled bank | **123 champion tests pass** |
| **Fixed a LEAKED drag ghost in `word_match`/TWM (v9.68, user: "the word icon sometimes sticks half-way after a correct answer, and it shows during the success screen — maybe there's a point you drag to that triggers it").** The floating `.wm-ghost` is `position:fixed; z-index:9999`, so one that outlives its drag freezes mid-flight above EVERYTHING (the success screen is z-996) until the next problem mounts and `_colxCleanup` sweeps it — exactly the reported symptom. Two paths ended a drag without a `pointerup`: (1) **`pointercancel`** — the browser/OS steals the gesture (a screen-edge or system swipe, palm rejection). `compare.ex.js` already handled this; `word_match` was written from that pattern but **dropped the handler**, so `pointerup` never came. That's the "certain point you drag to" (the screen edge). (2) **A second finger** — another `pointerdown` overwrote `drag`, orphaning ghost #1 with no live reference to remove it by (and the real `pointerup` then removed `null`). Fix: ONE module-owned ghost, every exit funnels through `endDrag()`, the drag is pinned to its `pointerId` (foreign pointers ignored), a 2nd pointerdown is rejected while a drag is live, `killGhost()` sweeps by CLASS so an orphan still dies, `blur` aborts (mouse released outside the window), and `tryMatch` clears before scoring so nothing can float over the success screen or sad modal on any path. The real drag path had **no test coverage at all** (existing tests used only the tap-tap shortcut) — 3 added: a real drag that solves + asserts **0 ghosts while `_fwOn`**, `pointercancel` (ghost gone, and a cancelled gesture is neither a match nor a mistake), and the 2nd-finger orphan. The latter two were confirmed to **FAIL against the pre-fix module** (git-stash check) | **122 champion tests pass** |
| **`story_quiz` card is now TEXT ONLY — the topic emoji was an answer LEAK (v9.67, user: "האימוג'י עוזר למשתמש לענות מבלי לקרוא… הוא זוכר שחללית זאת תשובה 3").** The story block rendered the topic emoji above the text (🚀 חלל · 🦄 חדי קרן · 🦖 דינוזאורים · 👑 נסיכות). Since a question's correct answer is usually the topic-flavoured noun, the picture told her which option to tap — she matched 🚀 to "חֲלָלִית" and never read the story, defeating the entire exercise (the same class of self-defeating visual as the removed `mult_champ` items picture). Removed the `.sq-emoji` span, its CSS rule and the `emoji` local from `mount`. The `emoji` FIELD stays on the problem object because it is used only by the end-of-set **report row** (core.js:1096), which she sees after the answer is already locked — not a clue. Checked the sibling story kind (`true_false`) — it never rendered one. New test `test_story_quiz_card_shows_no_emoji_picture_clue` sweeps all **32** library stories for any pictographic character in story/question/options and asserts the story block holds only text + `<br>` (no icon span). Also refreshed the file header, which still described the old 1-per-5 cadence at slots 5/10/15/20 | **119 champion tests pass** |
| **A SIXTH reading kind — `rhyme`/TRH (v9.66, user: "בוא נממש את חרוז") — and the reading slots become a ROTATING program.** The first **phonological-awareness** exercise (the only language kind that is NOT reading-for-meaning — it trains hearing the END of a word): a cue word + picture and **3** picture+word options, exactly one of which rhymes; select → the module's ✓ submits. `exercises/rhyme.ex.js` — a **12-pair bank** (כד/יד, דג/חג, כוכב/חלב, סוס/אוטובוס, פיל/טיל, בלון/שעון, שיר/עיר, ציפור/אור, קוף/חוף, הר/עכבר, ענן/גן, פרה/גיטרה) with either member usable as the cue (50% flip) over a no-repeat shuffled pair queue. **Unambiguity is enforced MECHANICALLY, not hand-authored** (the recurring bug class from cloze/sent_order): the distractors live in a **separate 14-word pool** filtered by *normalized final Hebrew letter* (ן→נ, ף→פ, ם→מ…), so a distractor can never rhyme with the pair and the two distractors differ from each other too; the pair and distractor sets are disjoint in both words and emoji. A wrong answer reveals the **SOUND AID** naming the ending — "🔊 הַמִּלָּה כַּד נִגְמֶרֶת בַּצְּלִיל **אַד**" (the ending is spelled as a SYLLABLE, not bare combining niqqud) — and returns to a re-pick. **Reading-slot rotation:** there are now **6** kinds but only `READING_SLOTS`=**5** slots per 20-card deck, so `_readingCards()` (problems.js) keeps a module-level **`_rkCursor`** that advances by 5 per build — each game shows 5 DISTINCT kinds at the 4/8/12/16/20 cadence and all six get their turn across consecutive games (a naive 6th card would have landed at index 20 and broken the cadence). The `lang` game grows to 3×6 = **18** cards. Wired like TSO (10 colx-guard lists, `_cor` num1-group, hint, report row `🎵 cue — answer`); `dinosaurs.skin.css` repaints `.rh-cue-w`/`.rh-sound` gold `#FFD27D` (the theme's leaf-green accent vanishes on the valley). 5 new tests (`TestRhyme` — mount, full points, wrong→sound-aid→partial, a **400-card** unambiguity sweep + declared-`end` self-check, rotation over 200 cards) + the cadence/`lang` tests retargeted to six kinds | **118 champion + 31 superman/flow pass** |
| **FOUR more READING kinds (v9.62, user request) — the reading slots become a rotating program.** New self-mounting types, all sharing story_quiz's select→✓-submit flow + NO-REPEAT bank rotation (each with a `_resetRotation()` test hook): **`cloze`/TCZ** (הַשְׁלֵם אֶת הַמִּלָּה — a vowelled sentence with a dashed gap + 3 word options; the correct word DROPS into the gap; 12-sentence bank), **`true_false`/TTF** (נָכוֹן אוֹ לֹא — a 2-line nikud story + a statement flipping one detail; 12-item bank), **`word_match`/TWM** (הַתְאֵם מִלָּה לִתְמוּנָה — DRAG 3 vowelled words onto 3 emoji cards, compare.ex.js-style pointer-drag + tap-tap fallback; wrong drop = penalty, all 3 locked = solved; 18-pair bank, 3 popped per card), **`sent_order`/TSO** (סַדֵּר אֶת הַמִּשְׁפָּט — Duolingo-style tap-to-build from scrambled pills, guaranteed not pre-solved, wrong keeps the words for fixing; 12-sentence bank). The ONE-PER-5 reading slots (5/10/15/20) are now filled by `_readingCards()` (problems.js): each game picks **4 DISTINCT kinds of the 5** (one sits out), one card each; `story_quiz.make` accordingly serves ONE card via a topic+story rotation. Wired like TSQ (guard chains via 2 replace-alls, `_cor` num1-group, hints, report rows); internal handles `clz/tf/wm/so` (`modePts` 15). Tests: 12 new (3×4 kinds) + reading-slot test updated to kinds-distinct + story rotation test over 32 cards | **18 reading tests pass; verified visually (4 screenshots)** |
| **NEW READING type `story_quiz`/TSQ (v9.61, user request) — a nikud story + a multiple-choice question.** The child reads a SHORT vowelled story (≤4 lines, age-7 level) on one of four topics — חָלָל 🚀 / חַדֵּי קֶרֶן 🦄 / דִּינוֹזָאוּרִים 🦖 / נְסִיכוֹת 👑 (a **32-story library, 8 per topic** — big so answers can't be memorised — with a NO-REPEAT shuffled-queue rotation per topic: a story can't reappear until all 8 of its topic were served; options shuffled per card) — then answers ONE multiple-choice question whose answers are also fully vowelled: TAP to select (highlight), press the module's ✓ to SUBMIT, only then judged (correct → `api.solved()`, wrong → `api.wrong(pick)` + re-pick; empty submit only nudges). Woven into **Superman + אַלּוּפָה at ONE PER 5 EXERCISES**: `makePool('sup'/'mulc')` caps the arithmetic base to 16 and splices the 4 stories (one per topic) at slots 5/10/15/20 (sup's polygon cadence drops 2→1; mulc's TMK slot-0 guard runs before the weave). Wired like TWP/TWC (9 colx-guard sites via 2 replace-alls, `_cor`→num1 = the 1-based correct option, hint, report row `📖 סִפּוּר — תְּשׁוּבָה N`); data.js `TSQ` + index + type-map; problems.js `'story'` handle + `modePts('story')=15`. 6 new tests (`TestStoryQuiz`: nikud mount, one-per-5 in both decks + 4 topics + slot-0 TMK, no-selection nudge + full points, wrong→re-pick→67%, library validity ≥32, rotation-no-repeat-within-a-cycle) | **154 (sup+columns+champion) pass; full suite 361 green; verified visually** |
| **`mult_champ` gains ×1 and ×0 facts (v9.60, user).** The multiplication exercise now also serves the **identity (×1)** and **zero (×0)** facts (both orders), woven into the pool as a couple of each. Mechanics: the mount no longer clamps factors to ≥2 (`A=typeof a==='number'?a:2`), so 0/1 survive; `chainHtml` handles count 0 (single `0 =` term) and 1 (single `rep =` term) — the ≥2 "+"-chain loop is skipped; `reveal()` FORCES the count-chain aid (not the skip-counting line, which is degenerate for 0/1 copies — jumps of 0 / 0 jumps); `renderChain` shows a clear RULE hint ("×0 = אפס פעמים = 0", "×1 = המספר עצמו"); `NUM[0]='אֶפֶס'` + switch-tip handle count 0/1. Updated `test_products_never_exceed_sixteen` (factors ≥0, includes ×1+×0) + new `test_times_zero_and_one_solve_via_count_chain`. | **TestChampMultiplication 17 pass** |
| **Bulbasaur's red eye was invisible on TABLET only (v9.57, user).** The 🏝️ Maldives beach hosts the Bulbasaur pokemon walker; its pupil red came from `radial-gradient(#df005d 100%, transparent)` (an edge-case stop, no explicit size → `farthest-corner`). That rasterises solid on desktop Chrome but as (near-)transparent on some tablet/mobile GPUs → the eye lost its red there. Fixed in `backgrounds/pokemons/bulbasaur.js`: the pupil is now a **solid `background-color:#df005d`** (device-robust) with the white glint kept as an explicit-sized gradient overlay. Verified: computed `backgroundColor = rgb(223,0,93)` + the red eye renders. (Lesson: never rely on fragile gradient-stop layouts for a fill that must show on mobile — use a solid color.) | **verified on desktop; solid-colour fix is device-agnostic** |
| **Unicorn-scene PERFORMANCE pass 2 (v9.56, user: still laggy on the TABLET specifically).** Measured the remaining per-rig cost: the galloping **STARDUST TRAIL was ~60 of a rig's ~101 running animations** (30 particles × 2 emitters) — more than the whole horse; and the **FAIRY ran 20 spark particles**. Cuts: (1) `unicorn.item.js` dust **30→8** particles/emitter (`DUST_N`); (2) `fairy.item.js` sparks **20→8** (`SPARKS`); (3) `meadow.scene.js` canvas **DPR 2→1.5** (4 full-screen canvases redraw per frame — retina tablets filled 4×); (4) a **touch-device LITE mode** (`matchMedia('(pointer:coarse)')`) → `MAX_ON_STAGE` **1** on tablet/phone (2 on desktop). Verified under touch emulation: coarse-pointer → **1 on-stage rig**, running animations **~110** (vs 544 originally = **−80% on the tablet path**); desktop ~170. | **verified via `backgrounds/_verify.py` (touch-emulated)** |
| **Unicorn-scene PERFORMANCE pass (v9.55, user: lag + stutter on tablet/mobile, worst during the ÷ split).** Root cause found by measuring `document.getAnimations()`: **544 running CSS animations**, **480 of them (88%) in the 6 unicorn rigs** (~80 keyframed sub-parts each). Fixes: (A) `unicorn.item.js` `roam()` now adds `.uc-paused` (→ `animation-play-state:paused`) whenever a rig parks OFF-SCREEN and removes it on trip-start — off-stage rigs stop animating (invisible). (B) `meadow.scene.js` `MAX_ON_STAGE` 3→2. → **running animations 544 → 206 (−62%)**, no visible change (verified: no on-screen rig paused). (C) The `half`/THF split is now **transform-only** — the divider keeps a width-0 layout box with an absolutely-positioned `::before` bar that only `scaleY`s in, and groups spread via `translateX(var(--gtx))` (offsets set per-element at mount); border/background are the only paint transitions. Zero layout properties animated → no per-frame reflow. New test `test_half_split_animates_no_layout_properties`; `TestHalfSplit` (10) green. | **running −62%; split composited; TestHalfSplit 10 pass** |
| **`word_chain` gains an intermediate running-sum box + report row de-messed (v9.54, user requests).** (1) The revealed DIGIT chain in `word_chain` now shows an INTERMEDIATE running-sum helper box after the first two terms (`a op1 b [=box] op2 c = [answer]`) — same green/red-not-scored aid the regular chain/`mult_chain` exercises use (`.wc-box` data-exp = the running total, diagonal guide). (2) The end-of-set summary row was rebuilt: the old `grid 28px 1fr auto` squeezed a wrong MULTIPLICATION row's equation column so "🏆 4 × 4 = 16" broke apart token-by-token over ~5 lines on a phone; now `.rep-row` is a flex `[badge][rep-body]`, `.rep-eq-txt` is `white-space:nowrap`, and the `.rep-right` attempts wrap to a tidy second line only when they don't fit (desktop stays one line). Updated `test_word_chain_wrong_reveals_digit_chain_then_partial`. | **47 (word_chain+report+gifts+settings) pass; verified at phone + desktop widths** |
| **אַלּוּפָה prize tuned (v9.53, user request): goal 700 + ×2 by default.** `DEFAULT_GIFT_GOALS.mulc` 600→**700**, and a NEW `DEFAULT_GIFT_COUNTS={mulc:2}` seeds `GIFT_COUNTS` so אַלּוּפָה awards **×2 prizes** per win out of the box (`_rebuildGiftCounts` seeds the defaults, then a localStorage override wins — a saved 1 removes the multiplier even where a default ×N exists). Picker badge shows 🎁×2. Updated `test_gifts.py` (mulc goal 700; `test_default_counts_sup_plain_mulc_x2`; `test_mulc_count_can_be_overridden_back_to_one`; prizes-tab input). | **19 gift tests pass** |
| **NEW אַלּוּפָה type `word_chain`/TWC (v9.52, user request) — a CHAIN word problem.** A nikud story that boils down to a 3-term chain computed left-to-right (e.g. "יוסי קיבל 2 תפוחים, קיבל עוד 2, נתן 4 לחיים" → 2+2−4); every step + the final result stay in 0..12, operands ≥2. Each `{t:TWC,a,b,c,ops:[op1,op2],story}` template carries its own ops pattern (verbs match the signs) + gender; numbers are spelled out (gender-agreeing, underlined, tap→emoji tooltip). On a mistake the bare DIGIT chain (a op1 b op2 c =) is revealed to retry; graded 100/75/50/0 via `api.penalize`/`api.solvedFrac` (like `word_prob`). Wired exactly where TWP is: 2 `replace_all`s over the colx-guard lists + `_cor` (new `_wc(a,b,c,ops)` helper + `wcOps` state) + loadProblem hint + report row; data.js consts/`EXERCISE_INDEX`/`EXERCISE_OF_TYPE`; problems.js mulc pool + `modePts('wc')=20` + `'wc'` handle. 6 new tests (`TestWordChain`); verified via `backgrounds/_verify.py` (story renders, pool results all 0..12, host `_wc` matches). The full-suite run also surfaced a PRE-EXISTING ~20% flake (unrelated to TWC) in the mx scoring tests — the `solve_one` test helper never covered every type the shuffled mx **slot 0** can hold (`TH` whole-hundreds addition, `TVA`/`TVS` single-unknown, `TRA` three-box), so it mis-answered them (long misread as a "boot race"). Fixed at the root in `tests/helpers.py` (`get_state`/`correct_answer`/`submit_answer` now handle TH/TVA/TVS/TRA) + a locking regression test `test_solve_one_handles_every_mx_slot0_type`. | **353 passed / 0 failed; ex-flaky mx pair now 3/3** |
| **Four אַלּוּפָה exercise-range changes (v9.50, user spec).** (1) **`half`/THF** — the division story generalized from "share between 2" to a MIX of ÷2 (even totals 8..16) and ÷3 (multiples of three 6..15), totals up to **16**; the layout is now a KIDS row of `k` girls above the items, which split into `k` equal groups by `k-1` golden dividers (problem gains `k`; `.hf-grp` replaces `.hf-half`; `core.js` report eq + loadProblem hint made k-agnostic). (2) **`mult_champ`/TMK** — factors EXPANDED beyond the ≤4 grid to any pair with **product ≤16** (2×7, 2×8, 3×5 …); the skip-counting line now ends exactly `(times+1)·rep` (one jump past the product) so it works for any count without spelling the answer. (3) **`triple_sum`/TTS** — target range extended 6..12 → **6..14**. (4) **`word_prob`/TWP** — ADDITION sum extended to **12** (subtraction stays ≤10; operands ≤10 so a spelled word exists). Tests updated/added (`test_half_pool_mixes_div2_and_div3_up_to_16`, `test_half_div3_splits_into_three_groups_and_solves`, `test_products_never_exceed_sixteen`, `test_triple_sum_target_varies_and_is_6_to_14`); ÷3 + 2×8 verified visually via `backgrounds/_verify.py` | **full suite 346 passed / 0 failed** |

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
