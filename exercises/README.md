# `exercises/` — Exercise types

Deep reference for the exercise-type modules of the Hebrew kids' math game.
Each `<name>.ex.js` file defines **one exercise TYPE** and registers itself into
`window.EXERCISES.types`. Files are loaded **on demand per game mode** — when a
mode starts, `bg-loader.loadExercisesFor(mode)` reads `EXERCISE_INDEX`
(`game/js/data.js`) and injects exactly the type files whose `modes` list
includes that mode (synchronously when already cached). The per-mode RECIPES in
`game/js/problems.js` (`makePool`) then assemble the session from the registered
types.

There are two flavors of type:

- **Pure data-generator types** — `add`, `sub`, `missing`, `double`, `chain`,
  `coins`, `tens`, `big_step`. They only produce arrays of *problem objects*;
  the generic host (`core.js`) renders and checks them.
- **Self-contained interactive type** — `column_add`. It ships its own mounted
  UI, CSS, DOM and self-checking via a `mount()` function; the host only owns
  scoring, the aids and problem advancement.

See `architecture.md` §3.6 for the canonical contract narrative.

---

## 1. Overview

```
exercises/
├─ add.ex.js          addition           a + b = ?
├─ sub.ex.js          subtraction        a − b = ?
├─ missing.ex.js      missing subtrahend a − ? = b
├─ double.ex.js       two unknowns       __ + __ = r  /  __ − __ = r
├─ chain.ex.js        three-term chains  a+b+c / a−b+c / a−b−c
├─ coins.ex.js        coin counting      worth of a pile of ₪ coins
├─ tens.ex.js         round tens         30+40 / 70−20
├─ big_step.ex.js     big ± small step   75−1, 32−2, 77+2 (no carry/borrow)
└─ column_add.ex.js   INTERACTIVE column addition (Superman)
```

Every file opens with the same idempotent guard and self-registration:

```js
window.EXERCISES=window.EXERCISES||{};
window.EXERCISES.types=window.EXERCISES.types||{};
window.EXERCISES.types.<name>=(()=>{ /* … */ return {t,modes,make}; })();
```

The ptype string constants (`TA`, `TS`, …) are defined once in
`game/js/data.js` and are global, so each file can reference them directly.

---

## 2. The exercise-type contract

A registered type is an object of this exact shape:

```js
{
  t,                        // ptype constant, OR an array of ptype constants
  modes,                    // game modes that include this type
  make(mode) → [problem],   // build the problem objects for that mode
  aidsReveal?,              // 'always' | 'afterMistake'  (default 'afterMistake')
  mount?({root,a,b,api}),   // ONLY for interactive types → cleanup fn
  inject?(arr,mode),        // ONLY coins — seed problems into an existing pool
}
```

- **`t`** — the ptype(s) this file owns. A family file declares an array, e.g.
  `double` → `[TDA,TDS]`, `chain` → `[TZ,TX,TW]`. `core.js` matches a ptype to
  its type via `t===ptype || (Array.isArray(t)&&t.includes(ptype))` (used by the
  generic aid-reveal lookup `_lockAids`).
- **`modes`** — the game modes whose pools may include this type. Mirrors the
  per-file `modes` in `EXERCISE_INDEX`; the latter drives loading, the former is
  the type's own declaration. Modes are: `0` (1+1), `5`/`10`/`20` (עד N),
  `'big'` (עד 100), `'br'` (bridge-10), `'mx'` (Queen מַלְכָּה), `'sup'`
  (Superman).
- **`make(mode)`** — returns a (possibly empty) array of **problem objects** for
  that mode. Returning `[]` means "this type contributes nothing here"
  (e.g. `'br'` is driven by a fixed curriculum baked into the `problems.js`
  recipe, not by these `make` calls).
- **`aidsReveal`** — optional reveal policy read generically by `core.js`
  (`_lockAids`). `'afterMistake'` (default) keeps the try-first lock: aids
  (number line / counting jar) stay hidden until the first wrong answer.
  `'always'` shows the aids from the first attempt. Only `column_add` uses
  `'always'`.
- **`mount({root,a,b,api})`** — interactive types only. Builds everything inside
  `root`, returns a `cleanup` function. See §4.
- **`inject(arr,mode)`** — `coins` only. A pool-recipe hook that mutates an
  already-built pool to splice in 1–2 coin problems. See §3.

### Problem-object shapes (one per ptype)

| Type file   | Problem object(s)                                  | Meaning                                  |
|-------------|----------------------------------------------------|------------------------------------------|
| `add`       | `{t:TA, a, b}`                                     | a + b = ?                                |
| `sub`       | `{t:TS, a, b}`                                     | a − b = ?                                |
| `missing`   | `{t:TM, a, b}`                                     | a − ? = b                                |
| `double`    | `{t:TDA, r}` / `{t:TDS, r}`                        | __+__=r  /  __−__=r (result `r` shown)   |
| `chain`     | `{t:TZ, a,b,c}` / `{t:TX, a,b,c}` / `{t:TW, a,b,c}`| a+b+c / a−b+c / a−b−c                     |
| `coins`     | `{t:TC, coins:[…], correct}`                       | pile of coin values + their sum          |
| `tens`      | `{t:TT, op:'add'|'sub', a, b}`                     | round-tens add/subtract                  |
| `big_step`  | `{t:TBG, a, b, op:'add'|'sub'}`                    | big number ± 1 or 2                      |
| `column_add`| `{t:TCA, a, b}`                                    | column-addition problem (interactive)    |

ptype constants (`game/js/data.js`):
`TM='missing'`, `TS='sub'`, `TA='add'`, `TX='mixed'`, `TZ='triple'`,
`TW='twin_sub'`, `TDA='dbl_add'`, `TDS='dbl_sub'`, `TC='coins'`, `TT='tens'`,
`TCA='col_add'`, `TBG='big_step'`.

---

## 3. Per-type inventory

| File           | ptype(s)        | Modes served            | What `make`/`inject` generates |
|----------------|-----------------|-------------------------|--------------------------------|
| `add.ex.js`    | `TA`            | `0,5,10,20,'br','mx'`   | mode `0`: the full fixed `BASIC_SEQ` ladder of all single-digit sums ≤ 10. modes `5/10/20`: a curated 12-pair `TABLES` set for that cap. `'mx'`: 1 random pair from the `20` table. `'br'`: returns `[]` (bridge curriculum lives in the recipe). |
| `sub.ex.js`    | `TS`            | `5,10,20,'br','mx'`     | modes `5/10/20`: curated 12-pair `TABLES` set. `'mx'`: 1 random pair from the `20` table. `'br'`: `[]`. |
| `missing.ex.js`| `TM`            | `5,10,20,'mx'`          | modes `5/10/20`: curated 12-pair `TABLES` (`a−?=b`). `'mx'`: 1 random pair from `20` table. |
| `double.ex.js` | `[TDA,TDS]`     | `5,10,20,'mx'`          | per-cap `TABLES` of result values: emits one `{t:TDA,r}` per addition result and one `{t:TDS,r}` per subtraction result. `'mx'`: 1 of each, picked from the `20` table. |
| `chain.ex.js`  | `[TZ,TX,TW]`    | `'mx'`                  | `'mx'` only: 2 problems of each shape (TZ `a+b+c`, TX `a−b+c`, TW `a−b−c`), operands range-checked so totals stay sensible (≤ 20). Other modes → `[]`. |
| `coins.ex.js`  | `TC`            | `5,10,20,'mx'`          | `'mx'`: 2 coin problems (sums ≤ 50, 3–7 coins, weighted toward ₪10/₪5). `5/10/20`: `make` returns `[]` — these pools get coins via **`inject(arr,mode)`** instead (guarantees 1–2 coin problems, avoiding the first/last slot and the every-4th TD slots). Also exports the global `tcCoinSVG(v)` used by the equation renderer to draw coins. |
| `tens.ex.js`   | `TT`            | `'mx'`                  | `'mx'` only: 2 round-tens problems; ~50/50 add vs subtract, operands are multiples of 10 chosen so results stay in 0–90. Other modes → `[]`. |
| `big_step.ex.js`| `TBG`          | `'big','mx','sup'`      | add/subtract **1 or 2** from a two-digit number (21–98). Generated **without carry/borrow** — only the ONES digit changes (`u<b` rejected for sub, `u+b>9` rejected for add). `'big'`: 12 problems balanced across −1/−2/+1/+2 then shuffled. `'mx'` and `'sup'`: 2 problems each, **mixed into** Queen and Superman pools. |
| `column_add.ex.js`| `TCA`        | `'sup'`                 | The **Superman** interactive column-addition module. `make('sup')` returns a pool of 12 problems (`a=11..19`, `b=2..19`, ≥ 7 with a units carry, shuffled). Declares `aidsReveal:'always'` and provides `mount()`. See §4. |

Notes:
- `add`/`sub`/`missing`/`double` share the same `pick(arr,n)` Fisher–Yates
  helper and per-cap `TABLES` pattern.
- `big_step` is the only data type that appears in **three** modes and is the
  one type that is "mixed into" other modes' pools rather than defining its own.

---

## 4. `column_add.ex.js` in depth

This is the only **interactive** type. It has a dual nature in a single
registration:

```js
return { t:TCA, modes:['sup'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make('sup')`
`makePool()` builds 12 problems: 7 that produce a units carry and 5 that don't
(`hasCarry = (a%10)+(b%10) >= 10`), de-duplicated by `a_b` key and shuffled.
In Superman mode the recipe combines this with `big_step.make('sup')`
(`problems.js` → `makePool('sup')`).

### Interactive side — `mount({root,a,b,api})`
On mount it injects its private stylesheet once (`#colx-style`, the `CSS`
template literal), computes place-value parts of the problem
(`aT/aU/bT/bU/uSum/carry/tSum`), and writes its DOM into `root`: two stacked
numbers in a 2-column grid, a `+` sign, a divider line, a carry cell, an SVG
connector layer, and two single-digit answer inputs (units `#colx-iU`, tens
`#colx-iT`). Inputs carry the global `ans-inp` class so the green/red border
contract applies automatically.

**Staged units → carry → tens flow** (a `phase` variable: `'units'` → `'tens'`
→ `'done'`):

1. **Units phase.** Only the units input is enabled (blinking). Live typing
   accepts a *correct* answer immediately but never judges a wrong one;
   judging a wrong answer happens only on **Enter** (`commit=true`).
2. **Carry animation.** If the units sum ≥ 10, on a correct units answer the
   value collapses to its ones digit and a `1` element **flies** from the units
   box up to the tens carry cell (`flyCarry`), which then pops into view.
3. **Tens phase** (`unlockTens`). The tens input is enabled/blinking; the host
   hint line is updated. On a correct tens answer → `phase='done'` and
   `api.solved()`.

**Mistakes.** A committed wrong answer turns on the hint overlay (`unitsHint`
/ `tensHint`): the SVG draws pink **hint circles** around exactly the digits to
add (plus the carried `1` in the tens phase when present), updates the Hebrew
hint text, calls `api.nl(anchor)` to park the number-line rider, and calls
`api.wrong(val)`. After ~1s the input is cleared and re-armed for another try.

**Digit object-preview** (`bindHover`/`digitInfo`). Hovering a column digit
previews its objects in the shared `#num-tt` modal, positioned to the **RIGHT**
of the digit (`core.js` `_nttRender(..., 'right')`; below would cover a row).
It is **scoped to the current `phase`**: only the units digits (`colx-aU`/`bU`)
respond while adding units, only the tens digits (`colx-aT`/`bT`) + the carried
`1` (`colx-carry`) while adding tens. On a units **carry**, the SECOND number's
units digit (`bU`) splits into complete-to-ten | remainder via the global
`_bridgeSplit(P.aU,'add',P.bU)` — the same number-bond as the equation hover.
Covered by `test_game.py::TestSupermanDigitPreview`.

**The `api` callbacks** (provided by `core.js` `_colxMount`):
- `api.wrong(val)` — records the wrong value into the per-problem report,
  applies the try-first unlock (which **reveals the host's skinned number
  line** on the first mistake), and shows the sad modal/penalty.
- `api.solved()` — both columns correct: host adds score (`_tfPts()`), marks
  the report correct, shows the celebration/fireworks.
- `api.nl(anchor)` — parks the **host's SKINNED number-line rider** at a helpful
  anchor. The aid is **windowed/anchored to the TOP number's digit** of the
  current column: in the units phase it anchors on `P.aU` (the top number's
  units digit, so the child counts the bottom units up from there); in the tens
  phase on `P.aT`.

**Self-owned visuals.** The module also draws V-shaped connector lines under the
divider (pulsing on the active column), positions the `+` sign, redraws on
window resize, and reuses the game's `#hint` element for its Hebrew prompts.

**Cleanup.** `mount` returns a `cleanup()` that removes the resize listener,
clears all pending timers, and empties `root`. `core.js` calls the previous
cleanup before mounting the next problem.

Note: `aidsReveal:'always'` means Superman's skinned number line is visible from
the very first attempt (its *rider position* is still anchored via `api.nl`),
whereas every other type keeps the hidden-until-first-mistake default.

---

## 5. Integration into the game

```
boot / setMode(m) / restart()
        │
        ├─ loadExercisesFor(m, cb)         # bg-loader.js: inject the mode's
        │                                  #   type files (per EXERCISE_INDEX)
        └─ cb: problems = makePool(m)      # problems.js: assemble the session
                 → rebuildCard / loadProblem
```

- **`bg-loader.loadExercisesFor(mode, onReady)`** filters `EXERCISE_INDEX` to the
  files whose `modes` include `mode`, injects each via `loadExercise`
  (`exercises/<file>.ex.js`), and fires `onReady` once all are loaded
  (synchronous when cached). Both `setMode` and `restart` guard against the user
  switching modes mid-load (`if(mode!==m)return;`).
- **`problems.makePool(m)`** is the recipe layer. It calls `EX('<name>')` (=
  `window.EXERCISES.types[name]`) and invokes `.make(m)` on each registered
  type. Examples:
  - `m===0` → `EX('add').make(0)` (the full 1+1 ladder).
  - standard `5/10/20` → union of `missing/sub/add/double`, slotted with
    `sampleWithTD` (a two-unknown every 4th slot), then
    `EX('coins').inject(...)`.
  - `'mx'` (Queen) → `makeMxPool()`: each loaded type contributes its `mx`
    quota (chains 6, add/sub/missing 1 each, two-unknowns 1+1, tens 2, coins 2,
    big-step 2 ≈ 17 problems), one shuffle.
  - `'sup'` (Superman) → `shuffle([...column_add.make('sup'), ...big_step.make('sup')])`.
  - `'big'` → `EX('big_step').make('big')`.
  - `'br'` → fixed bridge-10 curriculum baked into the recipe (the `add`/`sub`
    files return `[]` for `'br'`).
- **`core.js` rendering.** Single-input types are rendered and checked
  generically (`renderEq` / `checkAns`). Interactive types are mounted instead:
  `_colxMount()` looks up `EXERCISE_OF_TYPE[TCA]` (= `'column_add'`), lazily
  loads the file via `loadExercise`, then calls `ex.mount({root,a,b,api})`. For
  `TCA` the host hides its own check button (the module checks itself).
- **`EXERCISE_OF_TYPE`** (`data.js`) maps a ptype → its interactive file. It
  currently contains only `{[TCA]:'column_add'}`.
- **`aidsReveal`** is read generically by `core.js` `_lockAids` for whichever
  ptype is on screen, so one field in a type file changes when its aids appear.

---

## 6. Adding a new exercise type

1. **Create the file** `exercises/<name>.ex.js`. Register into
   `window.EXERCISES.types.<name>` with `{ t, modes, make(mode) }` (plus
   `aidsReveal` and/or `mount`/`inject` if needed). Return problem objects
   tagged with the appropriate ptype(s). Add any new ptype constants to
   `game/js/data.js`.
2. **Index it** in `EXERCISE_INDEX` (`data.js`) with the modes it serves so
   `loadExercisesFor` injects it for those modes. If the type is interactive,
   also add a `EXERCISE_OF_TYPE[<PTYPE>]='<name>'` entry.
3. **Wire it into the recipe** in `game/js/problems.js` (`makePool` /
   `makeMxPool` / the relevant mode branch) so its `make(mode)` output actually
   contributes to a session. (If the type self-mounts, ensure its ptype is
   rendered via the interactive mount path, not the generic single-input path.)

That's the whole surface: a self-registering file, one `EXERCISE_INDEX` entry,
and one recipe wiring.
