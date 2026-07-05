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
- **Self-contained interactive types** — `column_add`, `column_sub`,
  `coin_mul`. Each ships its own mounted UI, CSS, DOM and self-checking via a
  `mount()` function; the host only owns scoring, the aids and problem
  advancement.

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
├─ big_step.ex.js     big ± small step   75−1, 85−4, 77+2 (no carry/borrow)
├─ column_add.ex.js   INTERACTIVE column addition (Superman)
├─ column_sub.ex.js   INTERACTIVE column subtraction, with BORROW (פְּרִיטָה)
├─ coin_mul.ex.js     INTERACTIVE "how many ₪2/₪5/₪10 coins fit in X" (first ×)
└─ mult_chain.ex.js   INTERACTIVE multiplication as repeated addition (2×3 → 2+2+2 chain, ≤20)
```

(A few later type files — `bagel_cost`, `polygon`, `mult_chain`, and the
`var_one`/`tri_unknown`/`hundreds` data types — are newer than some tables below;
`mult_chain` is documented in §4d.)

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
  `'always'` shows the aids from the first attempt. The three interactive types
  (`column_add`, `column_sub`, `coin_mul`) all use `'always'` (`coin_mul` has no
  number-line aid at all — its tray is the manipulative).
- **`mount({root,a,b,api})`** — interactive types only. Builds everything inside
  `root`, returns a `cleanup` function. See §4 / §4b / §4c.
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
| `big_step`  | `{t:TBG, a, b, op:'add'|'sub'}`                    | big number + 1–2 / − 1–4                  |
| `column_add`| `{t:TCA, a, b}`                                    | column-addition problem (interactive)    |
| `column_sub`| `{t:TCS, a, b}`  (always `a > b`)                 | column-subtraction problem (interactive) |
| `coin_mul`  | `{t:TCM, a, b}`  (`a` = target, `b` = coin value 2/5) | "how many `b`-coins fit in `a`" (answer `a/b`, interactive) |
| `mult_chain`| `{t:TMC, a, b}`  (`a` = base 2/3, `b` = count)     | `a × b` under a "זֶה כְּמוֹ" line as the chain `a+a+…+a =` with OPTIONAL running-sum helper boxes + a final answer box (answer `a·b` ≤ 20, interactive) |

ptype constants (`game/js/data.js`):
`TM='missing'`, `TS='sub'`, `TA='add'`, `TX='mixed'`, `TZ='triple'`,
`TW='twin_sub'`, `TDA='dbl_add'`, `TDS='dbl_sub'`, `TC='coins'`, `TT='tens'`,
`TCA='col_add'`, `TCS='col_sub'`, `TBG='big_step'`, `TCM='coin_mul'`,
`TMC='mult_chain'` (+ later: `TBC='bagel_cost'`, `TPG='polygon'`, `TVA`/`TVS`/`TRA`/`TH`).

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
| `big_step.ex.js`| `TBG`          | `'big','mx','sup'`      | **Add 1–2** to / **subtract 1–4** from a two-digit number (21–89). Generated **without carry/borrow** — only the ONES digit changes (`u<b` rejected for sub, `u+b>9` rejected for add), so a subtraction never crosses the ten below (85−4 ok, 82−3 never). `'big'`: `build(12)` balanced sub/add then shuffled. `'mx'`: `build(2)` (2 mixed problems). `'sup'`: `buildSubs(3)` — **3 big-number SUBTRACTIONS only**. |
| `column_add.ex.js`| `TCA`        | `'sup'`                 | The **Superman** interactive column-addition module. `make('sup')` → `makePool(2,1)` = **3 problems** (2 with a units carry + 1 without; `a=11..29`, `b=2..19`, largest result 29+19 = **48**), shuffled. Declares `aidsReveal:'always'` and provides `mount()`. See §4. |
| `column_sub.ex.js`| `TCS`        | `'mx','sup'`            | Interactive column **subtraction** with BORROW (פְּרִיטָה). `'mx'` (Queen) → `makeNoBorrow(2)` (NO-borrow only, teen minuends `a≤19`). `'sup'` (Superman) → `makeSup()` = **6** (3 no-borrow + 3 with-borrow), both kinds spanning the full `a=11..29` range. `aidsReveal:'always'`; provides `mount()`. See §4b. |
| `coin_mul.ex.js`| `TCM`          | `'sup'`                 | Interactive **first multiplication**: "how many `b`-coins fit in `a`". `make('sup')` → `makePool()` = **3** problems, ONE of EACH coin value — ₪2 (targets 4/6/8/10), ₪5 (10..35), ₪10 (20..90), so a/b ∈ 2..9 coins. The answer is `a/b` (the COUNT of coins). `aidsReveal:'always'` (no number line — the coin tray IS the manipulative); provides `mount()`. See §4c. |

Notes:
- `add`/`sub`/`missing`/`double` share the same `pick(arr,n)` Fisher–Yates
  helper and per-cap `TABLES` pattern.
- `big_step` is the data type with the **widest** reach — **three** modes
  (`'big','mx','sup'`). It defines the whole `'big'` pool but is only
  "mixed into" the other two (`'mx'`/`'sup'`).
- `column_sub` is the only interactive type served in **two** modes (Queen
  `'mx'` no-borrow + Superman `'sup'`); the other two interactive types
  (`column_add`, `coin_mul`) are Superman-only.

---

## 4. `column_add.ex.js` in depth

This is one of three **interactive** types (the others — `column_sub` and
`coin_mul` — are detailed in §4b and §4c). It has a dual nature in a single
registration:

```js
return { t:TCA, modes:['sup'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make('sup')`
`make('sup')` calls `makePool(2,1)` → 3 problems: 2 that produce a units carry
and 1 that doesn't (`hasCarry = (a%10)+(b%10) >= 10`), de-duplicated by `a_b`
key and shuffled. (`makePool(nCarry,nNoCarry)` defaults to `7`/`5` = 12, but
Superman weaves in an equal share of every type, so column addition contributes
just 3.) Operands are `a=11..29`, `b=2..19`, so the largest result reached is
29+19 = **48** (the result's tens stay a single digit). In Superman mode the
recipe combines this with `big_step`, `coin_mul` and `column_sub`
(`problems.js` → `makePool('sup')`; see §5).

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

## 4b. `column_sub.ex.js` in depth

The mirror of `column_add`: two-stage column **subtraction** (units → tens →
`'done'`). Same interactive contract, same `api` (`wrong`/`nl`/`solved`), same
`#colx-root` mount path. The star of the show is the **BORROW** (פְּרִיטָה) —
the exact reverse of the carry.

```js
return { t:TCS, modes:['mx','sup'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
Two generators, one per mode (both emit `{t:TCS,a,b}` with `a>b`, so the
standard algorithm never goes negative in any column). `makeNoBorrow(n,maxA,maxB)`
caps the operands: `maxA` defaults to 19, `maxB` to 18.

- `'mx'` (Queen) → `makeNoBorrow(2)` = **2 NO-borrow** subtractions only; teen
  minuends (`a=11..19`) so every operand stays ≤ 20 like the rest of Queen.
- `'sup'` (Superman) → `makeSup()` = **6** total: 3 no-borrow
  (`makeNoBorrow(3,29,19)`) + 3 with-borrow, both now spanning the **full
  `a=11..29` range** (e.g. 27−13 no-borrow, 25−17 with borrow), shuffled — an
  equal share of both kinds.

The NO-borrow column subtractions used to be capped at 20; they were **widened**
so Superman's no-borrow problems span the whole `a∈[11,29]` range. Superman is
therefore a strict **superset** of the old standalone column-subtraction game
(now removed) — nothing was lost when that game went away.

### Interactive side — `mount({root,a,b,api})`
`a` = minuend (top), `b` = subtrahend (bottom). On mount it injects its private
stylesheet (`#colxs-style`), computes place-value parts plus the borrow math
(`borrow = aU<bU ? 1 : 0`, `uDiff`, `aTeff = aT−borrow`, `tDiff`), and writes a
2-column grid mirroring `column_add`: a `−` sign, the two stacked numbers, a
divider, a borrow/`#colx-bnew` cell, an SVG connector layer, and two single-digit
answer inputs (units `#colx-iU`, tens `#colx-iT`, both `ans-inp`). The tens
result range is 0–2.

**Two borrow methods — a SETTINGS toggle.** Read once at mount from
`localStorage 'subBorrow'` (`index.html #borrow-toggle`; `core.js`
`subBorrowMode()`/`setSubBorrowMode()`):
- **`'hybrid'` (default).** The child performs the borrow by **TAPPING the top
  tens digit** ("send a ten down"). On the **first** borrow problem of the load
  a LOOPING cursor/finger guide (`teachTap`: pulsing ring + ripples + 👆 finger +
  a Hebrew label) shows on the tens until she taps; the borrow plays **only on
  the actual tap** (`doBorrow → flyBorrow`), never auto-fired. A module-level
  `_borrowDemoShown` flag gates the guide to that first problem.
- **`'auto'`.** The regroup demonstrates itself on **every** borrow:
  `playBorrowDemo` moves a hand cursor to tap the tens, then `flyBorrow` plays.

**The borrow animation (`flyBorrow`).** A `"−10"` pops beside the top tens
digit; that digit is **struck** and its DECREMENTED value is shown above it
(`#colx-bnew`, kept for the tens step); a `"1"` slides over and **shrinks** to
sit beside the top units (the borrowed mark `#colx-borrow`, reading the units as
+10). Typing the correct units **before** borrowing is also accepted — on a
correct units answer with a pending borrow the module plays `flyBorrow` first,
then unlocks the tens.

**Mistakes — MIRRORS `column_add`** (no elaborate teaching animation; the old
`teachRegroup` demo was removed):
- A **units** mistake rings the two units digits in red (`unitsHint`). After a
  borrow the TOP-units ring is enlarged and shifted up-left so it fully
  **encloses** the borrowed `1` mark. (Before the borrow, a units mistake only
  nudges "take a ten" rather than ringing the raw `5−7`.)
- A **tens** mistake rings the two tens digits; after a borrow it ALSO rings the
  decremented value above the struck tens (`#colx-bnew`), so she subtracts THAT
  number.

**Aid.** The game's own SKINNED number line, **COUNT-BACK**, `aidsReveal:'always'`,
anchored to the TOP number's current-column digit via `api.nl` — units phase on
`P.aU` (after a borrow the anchor is `min(20, aU+10)`), tens phase on `P.aTeff`.
(`main.js` steps the rider −1 for TCS.)

**Digit HOVER preview** (`bindHover`/`digitInfo` → `core.js`
`_nttRender(n,split,el,'right')`, scoped to the current phase). The BOTTOM
number's units digit shows the **SUBTRACT-THROUGH-TEN** split: `bU = aU` (brings
the borrowed teen down to 10) on the LEFT, `(bU−aU)` (the rest, from 10) on the
RIGHT — only when `borrow && aU>0`. e.g. 15−7 → the 7 shows **5 | 2**; 25−16 →
the 6 shows **5 | 1** (aU=0 → no split). The TOP units shows a plain count.

**Cleanup** mirrors `column_add`: removes the resize listener, cancels the mount
`requestAnimationFrame`, clears timers, empties `root`.

---

## 4c. `coin_mul.ex.js` in depth

First multiplication, framed as repeated equal groups: **"how many `b`-coins fit
in X?"** Each session shows ONE problem of each coin value (₪2, ₪5, ₪10). Interactive, but with
**no number-line aid** — the coin tray itself is the manipulative.

```js
return { t:TCM, modes:['sup'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make('sup')`
`makePool()` = **3** problems, ONE of EACH coin value: ₪2 (targets **4/6/8/10**),
₪5 (**10/15/20/25/30/35**) and ₪10 (**20/30/…/90**) — so a/b ∈ **2..9** coins.
Every problem carries its coin value in `b` (`{t:TCM,a,b}`). The answer is `a/b`,
the COUNT of coins (e.g. 6 ÷ ₪2 = 3, 90 ÷ ₪10 = 9).

### Interactive side — `mount({root,a,b,api})`
`a` = the target, `b` = the coin value (`COIN = b||5`). On mount it injects
`#colm-style`, computes `need = round(a/COIN)` and a cap `maxCoins = need+3`, and
writes its DOM: a title row "כַּמָּה [coin] נִכְנָסִים בְּ-X?" (the inline coin via
the shared global `tcCoinSVG(COIN)`, with a fallback), an empty coin tray, a big
round `＋` and `−`, then an answer row whose **check (✓) button sits to the LEFT**
of the input (`.colm-ans-row{direction:ltr}`).

- `＋` drops one real coin (`tcCoinSVG(COIN)` — silver ₪2/₪5 or gold ₪10) into the tray;
  `−` removes the last. The child counts the coins and types that COUNT.
- `＋` **caps at `need+3`** — OVERSHOOT IS ALLOWED so reaching the answer never
  reveals it; `＋` only disables at that generous bound, not at the answer.
- A wrong answer gives **DIRECTIONAL** feedback ("try a bigger / smaller
  number") based on the **TYPED value vs `need`**, never the coin count (she may
  have added more coins than fit). Then `api.wrong(v)`.
- The empty tray KEEPS its reserved space (`.colm-tray-blank` makes the box
  invisible) so adding the first coin does NOT shift the `＋` button down.
- There is NO running-total row and NO caption text. A correct answer calls
  `api.solved()`.

**Cleanup** clears timers and empties `root`.

---

## 4d. `mult_chain.ex.js` in depth

Multiplication taught as **repeated addition**. The card is laid out like the
chain exercise:

```
        base × count            ← title
        ───────────────         ← separator line (.mc-sep)
           זֶה כְּמוֹ            ← "this is like" (.mc-like)
        base +base +base … = □  ← the repeated-addition CHAIN
```

`'mul'` is an **INTERNAL mode handle only** — there is NO dedicated picker tile
(the standalone tab was removed; like `'big'`, the mode stays for tests / forced
load / the manual tester). The type is **mixed into Queen (`'mx'`) + Superman
(`'sup'`)** — `make('mul')` gives the full 12-problem session, `make('mx')` /
`make('sup')` each give a **2-problem** quota.

```js
return { t:TMC, modes:['mul','mx','sup'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makePool(n)` = `n` problems (default 12), a shuffled mix of `{t:TMC,a:base,b:count}`
where `base ∈ {2,3}` (the number copied) and `base×count ≤ 20`:
- `base 2` → `count 2..10` (products 4..20)
- `base 3` → `count 2..6`  (products 6..18)

`make('mul')` → `makePool(12)`; `make('mx')`/`make('sup')` → `makePool(2)`. In
Queen the shared slot-0 guard keeps a `TMC`/`TCS` self-mounting card off slot 0
(the first card must show a normal `#ans` input). In the manual tester the
`✖️ כֶּפֶל שַׁרְשֶׁרֶת` pill forces one via `EXERCISES.types.mult_chain.make('mul')[0]`.

The answer (`report.correct`) is `a·b`, computed by `core.js` (`_cor` includes
`ptype===TMC?num1*num2`).

### Interactive side — `mount({root,a,b,api})`
`a` = base, `b` = count. It injects `#mc-style`, then builds the title, a
separator line, the "זֶה כְּמוֹ" label, and one horizontal `.mc-row` (mirrors the
chain's `.tz-inline`, `align-items:flex-start`): the first `base`; then the MIDDLE
terms 2..count-1 as columns (`+base` over an OPTIONAL running-sum helper
`input.tx-sub-inp.mc-box` = `data-exp=i·base`); then the FINAL `+base = □`
(`input.ans-inp.mc-final` = `data-exp=product`) inline on the top line.
**One-line guarantee:** after mount (and on resize) `fit()` measures the row vs its
container and applies a `transform:scale()` down if it would overflow — so even the
widest case (2 ×10) stays on a single line.

**Diagonal guide.** Each helper's `.mc-sub-row::after` draws the same gold diagonal
the chain uses (`.tz-sub-row.tz-live::after` — `rotate(-32deg)` from the box's right
edge, pulsing) pointing UP-and-RIGHT toward the NEXT `+`, so the child sees which
number to add next.

**The final box is the answer; helpers are OPTIONAL.** Every box is enabled from
the start — a child who knows the product can type it straight into the final box
and skip the helpers. Helper boxes give gentle feedback only (green `.sub-ok` when
the running sum is right, a soft red `.sub-err` on blur when wrong) and **carry NO
penalty and are never required**. Only the FINAL box scores: a correct value is
accepted live on input; a wrong one is judged on **Enter** → `api.wrong(v)` (sad +
retry). Correct → `api.solved()`. No number-line/jar aid (`aidsReveal:'always'`);
the games-menu toggle and check button are hidden for TMC like the other
self-hosting types.

**Cleanup** removes the resize listener, clears timers, empties `root`.

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
    big-step 2, **no-borrow column-subtraction 2** = **19** problems), one
    shuffle, **then a guard** that moves any `TCS` problem off slot 0 (the
    column-subtraction module renders its own staged UI, not the `#ans` box, so
    the first card must show a normal input — boot needs `#ans`).
  - `'sup'` (Superman) is now **BALANCED — an equal 3-per-type share, 15 total**:
    `shuffle([...column_add.make('sup') /*3*/, ...big_step.make('sup') /*3 subs*/,
    ...coin_mul.make('sup') /*3*/, ...column_sub.make('sup') /*6 = 3 no-borrow + 3
    borrow*/])`. (Note: `column_sub` contributes 6, so the total is 15 cards but
    only 3 *no-borrow* + 3 *borrow* of those are subtraction.)
  - `'big'` → `EX('big_step').make('big')` (`build(12)`).
  - `'br'` → fixed bridge-10 curriculum baked into the recipe (the `add`/`sub`
    files return `[]` for `'br'`).
- **`core.js` rendering.** Single-input types are rendered and checked
  generically (`renderEq` / `checkAns`). The three interactive types are mounted
  instead: for `TCA`/`TCS`/`TCM`, `renderEq` emits `<div id="colx-root">` and
  calls `_colxMount()`, which looks up `EXERCISE_OF_TYPE[ptype]`, lazily loads
  the file via `loadExercise`, then calls `ex.mount({root,a,b,api})`. The host
  hides its own check button (each module checks itself). The async load callback
  **verifies `EXERCISE_OF_TYPE[ptype]===exName`** (and that `idx`/`ptype` haven't
  moved) so a stale module-load cannot mount the wrong exercise. (Each module's
  own `mount()` cleanup cancels its layout `requestAnimationFrame` + timers.)
- **`EXERCISE_OF_TYPE`** (`data.js`) maps a ptype → its interactive file:
  `{[TCA]:'column_add', [TCS]:'column_sub', [TCM]:'coin_mul'}`.
- **`aidsReveal`** is read generically by `core.js` `_lockAids` for whichever
  ptype is on screen, so one field in a type file changes when its aids appear.
- **Gift goals.** `DEFAULT_GIFT_GOALS` (`core.js`) = `{br:900, mx:900, sup:825}`
  — the three reward modes; the basic modes (`0/5/10/20/big`) have no prize
  threshold.

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
