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
├─ mult_chain.ex.js   INTERACTIVE multiplication as repeated addition (2×3 → 2+2+2 chain, ≤20)
├─ mult_champ.ex.js   INTERACTIVE אַלּוּפָה 🏆 multiplication (קָשֶׁה tier, factors ≤4) — product FIRST, chain-on-mistake + 🔁 switch
├─ perimeter.ex.js    INTERACTIVE polygon PERIMETER (הֶקֵּף) — sum the 1..4 side labels of a to-scale square/rect/triangle
├─ compare.ex.js      INTERACTIVE DRAG the comparison sign (< / > / =) into the slot between two numbers
├─ word_prob.ex.js    INTERACTIVE בְּעָיוֹת מִלּוּלִיּוֹת — a short NIKUD word story with the numbers SPELLED OUT as gender-agreeing Hebrew words (חֲמִשָּׁה תַּפּוּחִים / שָׁלֹשׁ עֻגִיּוֹת); ADDITION reaches a sum of 12, subtraction stays ≤ 10 (operands ≤ 10). Each number word is UNDERLINED; hovering (desktop) / tapping (touch) it pops a tooltip of that many object emojis matched to the story's noun (🍎/🎈/🍬…). A wrong answer costs 25% AND reveals the derived DIGIT equation (5−3) to retry (graded 100/75/50/0). Mixed into אַלּוּפָה (mulc).
├─ word_chain.ex.js   INTERACTIVE בְּעָיוֹת שַׁרְשֶׁרֶת — a CHAIN nikud story that boils down to a THREE-term chain computed left-to-right (קיבל 2, קיבל עוד 2, נתן 4 → 2+2−4); every step + the final result stay in 0..12. Numbers SPELLED OUT (gender-agreeing, underlined, tap→emoji tooltip). A wrong answer costs 25% AND reveals the derived DIGIT chain (2+2−4=) to retry (graded 100/75/50/0). Mixed into אַלּוּפָה (mulc).
├─ story_quiz.ex.js   INTERACTIVE סִפּוּר וְשְׁאֵלָה — READING comprehension: a short vowelled story (≤4 lines, age-7; topics חלל 🚀 / חדי קרן 🦄 / דינוזאורים 🦖 / נסיכות 👑) + ONE multiple-choice question with vowelled answers; tap to SELECT, press the ✓ to SUBMIT (only then judged; wrong → penalty + re-pick). One of the SIX reading kinds sharing the ONE-PER-4 reading slots in Superman (sup) + אַלּוּפָה (mulc) — deck slots 4/8/12/16/20; there are only `READING_SLOTS`=5 slots per deck, so the six kinds ROTATE across games (see problems.js `_readingCards`).
├─ cloze.ex.js        INTERACTIVE הַשְׁלֵם אֶת הַמִּלָּה — a vowelled sentence with a dashed GAP + 3 vowelled word options; select → ✓ submits; the correct word DROPS into the gap. 12-sentence bank, no-repeat rotation. Shares the reading slots.
├─ true_false.ex.js   INTERACTIVE נָכוֹן אוֹ לֹא נָכוֹן — a 2-line vowelled mini-story + a STATEMENT that flips one detail (or not); select נכון/לא נכון → ✓ submits. 12-item bank, no-repeat rotation. Shares the reading slots.
├─ word_match.ex.js   INTERACTIVE הַתְאֵם מִלָּה לִתְמוּנָה — 3 emoji picture cards + 3 vowelled word pills; DRAG a word onto its picture (pointer-drag + ghost, like compare) or tap-word-then-tap-picture; correct locks green, wrong shakes + penalty; all 3 → solved. 18-pair bank, 3 popped per card. Shares the reading slots.
├─ sent_order.ex.js   INTERACTIVE סַדֵּר אֶת הַמִּשְׁפָּט — a 4-5 word vowelled sentence served SCRAMBLED as pills; tap words in order (Duolingo-style; tap a placed word to send it back), ✓ submits; wrong keeps the words for fixing. 12-sentence bank, no-repeat rotation. Shares the reading slots.
├─ rhyme.ex.js        INTERACTIVE חָרוּז — PHONOLOGICAL awareness (the one language kind that is NOT reading-for-meaning): a cue word + picture, and 3 picture+word options of which EXACTLY ONE rhymes; select → ✓ submits. A mistake reveals the SOUND AID naming the ending ("כַּד נִגְמֶרֶת בַּצְּלִיל אַד"). 12-pair bank (either member may be the cue) + a separate 14-word distractor pool filtered by normalized FINAL LETTER, so a distractor can never rhyme. Shares the reading slots.
├─ triple_sum.ex.js   INTERACTIVE __+__+__ = N — three CHOSEN addends; the target N VARIES 6..14; 0 and 10 are DISALLOWED (a 0/10 answer is praised, costs nothing, but must be re-tried with other numbers). Woven into Queen (mx) + Superman (sup) + אַלּוּפָה (mulc).
├─ half.ex.js         INTERACTIVE "חִלּוּק שָׁווֶה בְּשָׁווֶה" — 2 OR 3 friends share items EQUALLY (totals up to 16: ÷2 evens 8..16, ÷3 multiples of three 6..15); tap the items → golden lines split them into k equal groups. First DIVISION intuition. Mixed into אַלּוּפָה (mulc).
└─ plates.ex.js       INTERACTIVE "צַלָּחוֹת" — g plates × s items each (2..4 × 2..4, product ≤10), find the TOTAL from the WORDS; the picture is hidden until a mistake reveals it. The multiplication-story inverse of half. Mixed into אַלּוּפָה (mulc).
```

(A few later type files — `bagel_cost`, `polygon`, `mult_chain`, `mult_champ`,
`perimeter`, `compare`, `triple_sum`, `half`, `plates`, and the
`var_one`/`tri_unknown`/`hundreds` data types — are newer than some tables below;
`mult_chain` is documented in §4d, `mult_champ` in §4e, `perimeter` in §4f,
`compare` in §4g, `triple_sum` in §4h, `half` in §4i, `plates` in §4j. The
`column_sub` STAGED (horizontal-first) flow used by Superman + אַלּוּפָה is in §4b.)

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
| `mult_champ`| `{t:TMK, a, b}`  (`a` = multiplicand, `b` = count; any pair with `a·b` ≤ 16, both ≥ 2 — incl. 2×7, 2×8, 3×5) | `a × b = □` shown FIRST; a wrong answer reveals the `a+a+…+a = □` chain (the mult_chain scaffold) + a 🔁 SWITCH that flips the repeated number (3×4: `3+3+3+3` ↔ `4+4+4`). Answer `a·b` ≤ 16, interactive |
| `perimeter` | `{t:TPP, shape:'square'|'rect'|'tri', sides:[…], a}`  (rect also `w,h`; `a` = perimeter) | a to-scale shape with a length **1..4** by each side; type the SUM of the sides. Interactive |
| `compare`   | `{t:TCP, a, b}`  (sign derived: `a<b`→‹ , `a>b`→› , `a===b`→=) | DRAG the correct comparison sign (`<`/`>`/`=`) into the empty slot between the two numbers. Interactive |
| `triple_sum`| `{t:TTS, a}`  (`a` = the target sum, VARIES 6..14) | `__ + __ + __ = a` — pick THREE addends that sum to `a`; **0 and 10 are disallowed** (a 0/10 answer is praised, costs nothing, but must be re-tried). Interactive |
| `half`      | `{t:THF, n, k, a, item, itemName, names:[…k]}`  (`n` = total ≤16, `k` = 2 or 3, `a` = n÷k) | a word problem: `k` friends share `n` items EQUALLY; tap the items → golden lines split them into `k` equal groups; type how many EACH gets. Interactive |
| `plates`    | `{t:TPL, g, s, a, item, itemName, name}`  (`g` = plates, `s` = per plate, both 2..4, product ≤10; `a` = g·s) | a word problem: `g` plates each holding `s` items; type the TOTAL from the words. Picture hidden until a mistake reveals it (then tap toggles plates ↔ row). Interactive |
| `ice_cream` | `{t:TIC, a, b, name}`  (`a` = the budget ₪, `b` = price per ice cream 2/5/10, `name` = the shopper) | a shop story: she HAS `₪a` and every ice cream costs `₪b` — how many CAN she buy? ＋ buys one (lands in the tray WITH its price coin, so the spending is skip-countable); answer `a/b` (division as "how many groups fit"). Interactive |

ptype constants (`game/js/data.js`):
`TM='missing'`, `TS='sub'`, `TA='add'`, `TX='mixed'`, `TZ='triple'`,
`TW='twin_sub'`, `TDA='dbl_add'`, `TDS='dbl_sub'`, `TC='coins'`, `TT='tens'`,
`TCA='col_add'`, `TCS='col_sub'`, `TBG='big_step'`, `TCM='coin_mul'`,
`TMC='mult_chain'`, `TMK='mult_champ'`, `TPP='perimeter'`, `TCP='compare'`,
`TTS='triple_sum'`, `THF='half'`, `TPL='plates'`, `TIC='ice_cream'`
(+ later: `TBC='bagel_cost'`, `TPG='polygon'`, `TWP='word_prob'`, `TVA`/`TVS`/`TRA`/`TH`).

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
| `column_sub.ex.js`| `TCS`        | `'mx','sup','mulc'`     | Interactive column **subtraction** with BORROW (פְּרִיטָה). `'mx'` (Queen) → `makeNoBorrow(2)` (NO-borrow only, teen minuends `a≤19`, non-staged). `'sup'`/`'mulc'` → `makeStaged(makeSup())` = the two-digit set **TAGGED `staged`** → the horizontal-first GRADED flow (§4b). `aidsReveal:{mx:'always',sup:'always',mulc:'always'}`; provides `mount()`. See §4b. |
| `coin_mul.ex.js`| `TCM`          | `'sup','mulc'`          | Interactive **first multiplication**: "how many `b`-coins fit in `a`". `make('sup'/'mulc')` → `makePool()` = **3** problems, ONE of EACH coin value — ₪2 (targets 4/6/8/10), ₪5 (10..35), ₪10 (20..90), so a/b ∈ 2..9 coins. The answer is `a/b` (the COUNT of coins). `aidsReveal:'always'` (no number line — the coin tray IS the manipulative); provides `mount()`. See §4c. |
| `perimeter.ex.js`| `TPP`         | `'perim','mulc'`        | Interactive polygon **perimeter**. `make('mulc')` → **5** (cycles square/rect/triangle); `make('perim')` → 9 (tester handle). Each shape is drawn **to scale** (triangle via `triVerts`, law-of-cosines) with a length 1..4 by each side; answer = sum of sides. `aidsReveal:'always'`; the number line is hidden until a WRONG answer, then shown so she can hop the sides. See §4f. |
| `compare.ex.js`  | `TCP`         | `'cmp','mulc'`          | Interactive **drag-the-sign** comparison. `make('mulc')` → **5** (always ≥1 of each relation `<`/`>`/`=`; `make('cmp')` → 9). Numbers 1..99; the child DRAGS the correct sign into the slot between them. `aidsReveal:'always'` (no number line). See §4g. |
| `triple_sum.ex.js`| `TTS`        | `'trip','mx','sup','mulc'` | Interactive **three-addends-to-a-target** `__+__+__=N`. The target **VARIES 6..14** (distinct per pool). `make('mulc')` → **3**, `make('sup')` → 2, `make('mx')` → 1 (Queen is saturated — woven post-cap), `make('trip')` → 6. Any triple that sums to N is accepted **except that 0 and 10 are disallowed** — a sum-correct 0/10 answer is praised, costs NOTHING and does NOT complete (retry). `aidsReveal:'always'`. See §4h. |
| `word_chain.ex.js`| `TWC`        | `'wc','mulc'`           | Interactive **CHAIN word problem** — a nikud story → a op1 b op2 c computed left-to-right (קיבל 2, קיבל עוד 2, נתן 4 → 2+2−4); every step + final result stay **0..12**, operands ≥2. `make('mulc')` → **3** (rotates 6 templates, each with its own ops pattern + matching verbs); `make('wc')` → 8. Numbers spelled out (gender-agreeing, underlined, tap→emoji tooltip). A wrong answer costs 25% AND reveals the derived DIGIT chain (2+2−4=) to retry (graded 100/75/50/0 via `api.penalize`/`api.solvedFrac`). `aidsReveal:'always'`. See §4l. |
| `story_quiz.ex.js`| `TSQ`        | `'story','sup','mulc'`  | Interactive **READING comprehension** — a short vowelled story (≤4 lines, age-7) on חלל/חדי קרן/דינוזאורים/נסיכות + ONE multiple-choice question with vowelled answers (options shuffled per card; `{t:TSQ,topic,emoji,lines,q,opts,a}`, `a` = 1-based correct option → num1). TAP selects (highlight), the module's **✓ submits** — only then judged: correct → `api.solved()`, wrong → `api.wrong(pick)` + re-pick; an empty submit only nudges. `make('sup'/'mulc')` → **1** (the reading slots are shared between the six reading kinds; topics AND stories rotate via NO-REPEAT shuffled queues); `make('story')` → the whole **32-story** library (8 per topic). Woven at **ONE PER 4 EXERCISES** (deck slots 4/8/12/16/20 — `_readingCards()` in problems.js fills `READING_SLOTS`=5 slots with 5 DISTINCT kinds, ROTATING through the 6 via `_rkCursor` so every kind gets its turn across games; base capped to 15 by `_capPool`). `aidsReveal:'always'` (a reading card — no arithmetic aid). |
| `cloze.ex.js`    | `TCZ`         | `'clz','sup','mulc'`    | Interactive **cloze** (הַשְׁלֵם אֶת הַמִּלָּה): a vowelled sentence with a dashed gap + 3 vowelled options (`{t:TCZ,pre,post,opts,a}`); select → ✓ submits, the correct word DROPS into the gap. 12-sentence bank, NO-REPEAT rotation; `make('sup'/'mulc')` → 1, `make('clz')` → the bank. `aidsReveal:'always'`. |
| `true_false.ex.js`| `TTF`        | `'tf','sup','mulc'`     | Interactive **true/false** (נָכוֹן אוֹ לֹא): a 2-line vowelled mini-story + a statement (`{t:TTF,lines,stmt,a}` — a=1 נכון / a=2 לא נכון); select → ✓ submits. False statements flip exactly ONE story detail. 12-item bank, NO-REPEAT rotation; `make('sup'/'mulc')` → 1, `make('tf')` → the bank. `aidsReveal:'always'`. |
| `word_match.ex.js`| `TWM`        | `'wm','sup','mulc'`     | Interactive **word↔picture matching** (הַתְאֵם מִלָּה לִתְמוּנָה): 3 emoji cards + 3 vowelled word pills (`{t:TWM,pairs,a:3}`); DRAG a word onto a picture (compare-style pointer-drag + ghost) or tap-word-then-tap-picture; correct locks green, wrong shakes + `api.wrong`; all 3 → `api.solved()`. 18-pair bank, 3 popped per card (no-repeat until the bank cycles); `make('sup'/'mulc')` → 1, `make('wm')` → 4 cards. `aidsReveal:'always'`. |
| `sent_order.ex.js`| `TSO`        | `'so','sup','mulc'`     | Interactive **sentence ordering** (סַדֵּר אֶת הַמִּשְׁפָּט): a 4-5 word vowelled sentence served SCRAMBLED (`{t:TSO,words,scr,a}`; the scramble is guaranteed ≠ the answer); tap bank words in order into the strip (tap a placed word to send it back), ✓ submits (string-compare); wrong KEEPS the words for fixing, an incomplete submit only nudges. 12-sentence bank, NO-REPEAT rotation; `make('sup'/'mulc')` → 1, `make('so')` → the bank. `aidsReveal:'always'`. |
| `rhyme.ex.js`    | `TRH`         | `'rhy','lang','sup','mulc'` | Interactive **rhyme** (חָרוּז) — **phonological awareness**, the only language kind that is not reading-for-meaning: a cue word + picture (`{t:TRH,cue:{e,w},sound,opts:[{e,w}×3],a}`, `a` = 1-based correct option → num1) and 3 picture+word options of which **exactly one rhymes**; select → ✓ submits. The **12-pair bank** serves either member as the cue (50% flip) over a no-repeat shuffled PAIR queue. Unambiguity is **mechanical**: distractors come from a separate **14-word pool** filtered by *normalized final letter* (ן→נ, ף→פ, ם→מ…) so a distractor can never rhyme, and the two distractors differ from each other; pair-words/emoji are disjoint from the distractor pool. A wrong answer reveals the **SOUND AID** naming the ending ("🔊 הַמִּלָּה כַּד נִגְמֶרֶת בַּצְּלִיל **אַד**" — spelled as a syllable, not bare niqqud) then allows a re-pick. `make('sup'/'mulc'/'lang')` → 1, `make('rhy')` → all 12. `aidsReveal:'always'`. |
| `half.ex.js`     | `THF`         | `'hlf','mulc'`          | Interactive **share-equally among k friends** (first division), k = **2 or 3**, totals up to **16**. `make('mulc')` → **6** = a MIX of 3 ÷2 (evens 8..16) + 3 ÷3 (multiples of three 6..15); `make('hlf')` → 8. Rotating item emoji + girl names make each card a fresh mini word problem; a JS auto-fit shrinks the row to the card when many items. `aidsReveal:'always'` (the split-into-groups picture is the aid; a wrong answer auto-opens it). See §4i. |
| `plates.ex.js`   | `TPL`         | `'plt','mulc'`          | Interactive **equal-groups→total** (the multiplication story, inverse of half). `make('mulc')` → **3** (`make('plt')` → 6), plates `g` and per-plate `s` both 2..4, **product ≤10** (the first facts). The picture is **hidden** — the child solves from the WORDS; the 1st mistake reveals the plates, the 2nd pours them into ONE countable row (once shown, tap toggles). `aidsReveal:'always'` (module drives its own reveal). See §4j. |
| `ice_cream.ex.js`| `TIC`         | `'ice','mulc'`          | Interactive **shop / budget division** ("how many groups fit" — the quotative mirror of `half`'s sharing). `make('mulc')` → **3**, ONE of EACH price — ₪2 (budgets 4..20), ₪5 (10..35), ₪10 (20..90) — budget always divisible, 2..10 ice creams. ＋ BUYS an ice cream (it lands with its price COIN so the spending is skip-countable, 2-4-6…), − refunds; ＋ allows a +3 overshoot so it never reveals the answer; wrong-answer feedback is directional off the TYPED value ("not enough money" / "money left"). `aidsReveal:'always'` (the tray is the manipulative). See §4k. |

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
Covered by `tests/test_columns.py::TestSupermanDigitPreview`.

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
return { t:TCS, modes:['mx','sup','mulc'],
         aidsReveal:{mx:'always',sup:'always',mulc:'always'}, make(mode){…}, mount };
```

### Data side — `make(mode)`
All generators emit `{t:TCS,a,b}` with `a>b`, so the standard algorithm never goes
negative in any column. `makeNoBorrow(n,maxA,maxB)` caps the operands (`maxA`
defaults to 19, `maxB` to 18); `makeStaged(arr)` tags every problem `staged:true`.

- `'mx'` (Queen) → `makeNoBorrow(2)` = **2 NO-borrow** subtractions only; teen
  minuends (`a=11..19`) so every operand stays ≤ 20 like the rest of Queen.
  **Not staged** — the classic intro (a one-line equation + a "הַצֵּג בְּטוּר"
  button) then the column board.
- `'sup'` (Superman) → `makeStaged(makeSup())` = **6** total (3 no-borrow + 3
  with-borrow, two-digit, `a` up to 98), shuffled — all TAGGED `staged`.
- `'mulc'` (אַלּוּפָה) → `makeStaged(makeSup()).slice(0,5)` — the same staged set,
  **5** for the mixed hard-tier pool.

Superman is a strict **superset** of the old standalone column-subtraction game
(now removed) — nothing was lost when that game went away.

### The STAGED (horizontal-first, graded) flow — Superman + אַלּוּפָה
Any problem tagged **`staged:true`** is mounted by `mountStaged` instead of the
classic intro. It teaches the fact first, only falling back to the column on a
mistake, and grades the fall-back:

1. **Horizontal.** The equation is shown as `a − b =` with a solvable input
   (`#colxs-solveinp`) — solved in the head → **full marks**, the column is never
   shown.
2. **On a wrong answer** the column board is revealed (`revealColumn → build`) so
   she can work it out digit-by-digit.
3. **Graded penalty ladder** `FRAC=[1,0.75,0.5,0]` by mistake count, on the mode's
   own `modePts()` base: **0 → 100% · 1st (horizontal) → 75% · 2nd (column) → 50%
   AND the number line opens · 3rd → 0%** — so mulc(20) → 20/15/10/0, sup(15) →
   15/11/8/0.

`mountStaged`/`build` route `wrong`/`solved` through a `flow` object so the same
column code serves both the classic (`mx`) and staged (`sup`/`mulc`) paths. The
flow uses three host `api` hooks (see §5): **`penalize(v)`** (log a mistake + sad
modal, WITHOUT the try-first unlock/score), **`showNL()`** (reveal `#nl-panel` on
the 2nd mistake), and **`solvedFrac(frac)`** (`addScore(round(modePts()*frac))`).
Because a staged problem never calls `api.wrong`, the try-first machinery stays
out of the way — hence `aidsReveal:'always'` for `sup`/`mulc`, and `loadProblem`
starts the line HIDDEN for a `staged` TCS. (Test hook: `window.__colxAutoReveal`
skips straight to the column board — the `page` fixture sets it, so dedicated
horizontal-first tests clear it first.)

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

## 4e. `mult_champ.ex.js` in depth — the אַלּוּפָה 🏆 category

The `mult_chain` idea inverted for a higher tier. Where `mult_chain` shows the
repeated-addition scaffold immediately, `mult_champ` makes the child try the
**product first** and only *earns* the scaffold on a mistake.

```js
return { t:TMK, modes:['mulc'], aidsReveal:'always', make(mode){…}, mount };
```

It is the sole game in the **`hard` tier** (`DIFFICULTY_GROUPS`, tier label
`קָשֶׁה`, game tile `אַלּוּפָה 🏆`, `modePts('mulc')=20`, prize goal
`DEFAULT_GIFT_GOALS.mulc=700`, and it awards **×2 prizes** per win by default
via `DEFAULT_GIFT_COUNTS.mulc=2`).

### Data side — `make('mulc')`
`makePool()` → EVERY factor pair with **product ≤ 16** (both factors ≥ 2),
shuffled and sliced to 12 — so beyond the 2×/3×/4× facts it also covers 2×5, 2×6,
2×7, 2×8, 3×5, 5×3 … (user: "כפל עד תוצאה של 16", expand the factors). `a` (the
multiplicand) is repeated `b` times **by default**; the 🔁 switch flips the
orientation, and the skip-counting line ends exactly one jump past the product
(see below), so a long count like 2×8 still fits. The answer (`report.correct`) is
`a·b`, computed by `core.js` (`_cor` includes `ptype===TMK?num1*num2`).

### Interactive side — `mount({root,a,b,api})` — TWO PHASES
1. **Phase 1 — the bare product.** Renders `a × b = □` (`input.ans-inp.mk-ans`),
   blinking, auto-focused. The hint below the exercise spells the product out in
   Hebrew WORDS with niqqud — `spoken(a,b)` → e.g. 4×3 = "כַּמָּה זֶה אַרְבַּע
   פְּעָמִים שָׁלוֹשׁ?" (a factor of 2 reads "פַּעֲמַיִם", not "שְׁתֵּי פְּעָמִים";
   `NUM[]` holds the feminine number words). Submitted **only on Enter**. Correct →
   `solve()` → `api.solved()` (full points, `tryFirst=0`).
2. **On a WRONG product** → `api.wrong(v)` (the host's penalty + sad modal) **AND**
   `reveal()`: the product greys out (`.mk-answered`, its box disabled) and, in
   strict turns across mistake-cards (`window.__mkAidTurn`), ONE aid opens beneath a
   separator + a `.mk-like-row` (`direction:rtl` → the Hebrew "זֶה כְּמוֹ" label on
   the **RIGHT**, and a read-only `#mk-like-chain` — the CURRENT orientation — to its
   left). Either the **skip-counting number line** (jumps of the repeated number; the
   product box itself retries) **or** the interactive repeated-addition chain
   `a +a +… = □` in `.mk-scroll` (the **same** structure as `mult_chain`: optional
   running-sum helper boxes `input.tx-sub-inp.mk-box` with the pulsing diagonal guide
   `.mk-sub-row::after`, and the scoring `input.ans-inp.mk-final` = `data-exp=product`;
   `fit()` scales the row to one line). On a **line card** `#mk-like-chain` shows the
   current jumps as `rep + rep + …` so it MATCHES the line; on a **chain card** it is
   left empty (the interactive chain below IS the current display).
3. **The 🔁 SWITCH** (`#mk-switch`) flips which number repeats: not-flipped shows
   `a` repeated `b` times; flipped shows `b` repeated `a` times (3×4: `3+3+3+3`
   ↔ `4+4+4`). It is a **FLOATING, SEPARATE round pill** on its own line (NOT inside
   the "זֶה כְּמוֹ" text row) — its face is a plain 🔁; the OTHER orientation is
   previewed ONLY in its **hover tooltip** (`.mk-switch-tip`, dropping just below the
   button). This is a deliberate fix (v9.48, user request): the always-visible
   "זֶה כְּמוֹ" chain shows the CURRENT orientation and MOVES TOGETHER with the number
   line on every switch, so the two never contradict — while the swap *target* stays
   tucked in the tooltip. `updateSwitchTip()` refreshes the tooltip; `renderNlAid()`
   re-configures the line + `#mk-like-chain`, and `renderChain()` rebuilds + re-wires
   the interactive row, on every flip; the final answer box always expects the **same
   product**, so switching never changes the answer. (Omitted entirely for `a===b` —
   flipping `3+3+3` → `3+3+3` is pointless.)

Only the FINAL box scores (helpers give gentle green/red feedback, no penalty,
never required) — a correct final value on **Enter** → `api.solved()`, a wrong one
→ `api.wrong(v)` (penalty + clear + refocus), exactly like `mult_chain`. Because
`api.wrong` fires once for the bare product and again for any wrong final answer,
the standard `_tfPts` ladder applies (full → 67% → 0). No number-line/jar aid
(`aidsReveal:'always'`); the games-menu toggle and host check button are hidden
for `TMK` like the other self-hosting types. **Cleanup** removes the resize
listener, clears timers, empties `root`.

**No countable-objects picture.** The multiplication card deliberately shows only
the bare `a × b = □` (and, after a mistake, the repeated-addition chain — which
requires ADDING, not counting). An earlier tap-to-group emoji picture (v8.98) was
REMOVED (v9.00, user request): drawing a·b discrete objects let the child just
COUNT them and read off the product before recalling it, defeating the
"product-first" pedagogy. The "count the equal groups" idea lives in the separate
`plates` exercise — and there too the objects stay hidden until a mistake, so the
child first tries the product from the words alone.

---

## 4f. `perimeter.ex.js` in depth — polygon PERIMETER (הֶקֵּף 📐)

A self-mounting type (`t:TPP`, `modes:['perim','mulc']`) mixed into אַלּוּפָה. A
SIMPLE shape — square, rectangle or triangle — is drawn with an integer length
**1..4** printed beside each side; the child types the **sum of the sides** (the
perimeter). The labelled shape is the primary manipulative; the game's number
line is hidden at first and **appears on a WRONG answer** (see below) so she can
hop and add the sides (`aidsReveal:'always'`).

```js
return { t:TPP, modes:['perim','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makeOne(kind)` builds one `{t:TPP,shape,sides:[…],a:perimeter}` (rect also stores
`w,h`): square → one side `s∈1..4` ×4 (`a=4s`); rect → `w≠h∈1..4` (`a=2(w+h)`);
triangle → three sides `1..4` obeying the **triangle inequality** (`a=a+b+c`).
`make('mulc')` → **5** problems (cycles square→rect→tri, shuffled); `make('perim')`
→ 9 (internal tester handle). All side lengths are `<5` ("קטן מ5").

### Drawn TO SCALE — `geom(p)` / `triVerts(sides,C)`
The picture must never contradict the numbers. Square = equal sides; rect pixel
ratio = `w:h`; the **triangle's vertices are computed from its labels**
(`triVerts`, law-of-cosines apex placement, then fit + centre in the 320 viewBox),
so the drawn edge lengths are proportional to the side numbers — an equilateral
`(3,3,3)` draws equilateral, a scalene `(2,4,3)` draws scalene. Labels sit at each
edge midpoint pushed out along the normal from the true **centroid**.

### Interactive side — `mount({root,a,b,api})`
Reads the FULL problem via `ctx.p` (`a`/`b` alone can't carry the side list); the
perimeter is `ctx.a` (falls back to `p.a` / the side sum). Renders an SVG polygon
(`.pm-body`) + per-side edge/highlight/hit lines + `.pm-lbl` labels, a `.pm-inp`
answer box and a ✓ `.pm-btn`. Tapping a side lights it gold + a star-burst (pure
aid). A correct sum → green box + names the shape ("זֶה מְרֻבָּע — הֶקֵּף 12!") +
`api.solved()`; a wrong sum → red + a "bigger/smaller" nudge + `api.wrong(v)` +
**`revealNL()`** (the number line appears — see below), then clears for a retry.
**Cleanup** clears timers and empties `root`. CSS namespaced `pm-*` (`#pm-style`).

**Number line on a mistake.** The shape carries no aid at first, but the FIRST
wrong perimeter reveals the game's number line so she can HOP the length of each
side and add them: `revealNL()` calls `api.showNL()` (un-hides `#nl-panel`) and
configures a count-up line `NL.configure(20,1); NL.init(0)`. It is revealed once
and stays for the rest of that problem; `loadProblem` hides it again on the next
card. (`aidsReveal:'always'` here means "no try-first LOCK" — the module reveals
the line itself on demand, exactly like the staged column subtraction, rather than
via `_unlockAids`.)

---

## 4g. `compare.ex.js` in depth — DRAG the comparison sign (⚖️)

A self-mounting type (`t:TCP`, `modes:['cmp','mulc']`) mixed into אַלּוּפָה. Two
numbers are shown with an empty SLOT between them; the child **DRAGS** the correct
comparison sign — `<`, `>` or `=` — from a tray into the slot. No number line
(`aidsReveal:'always'`).

```js
return { t:TCP, modes:['cmp','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makeOne(force)` builds `{t:TCP,a,b}` with the relation derived from the numbers
(the sign is never stored). `make('mulc')` → **5** problems that ALWAYS include ≥1
of each relation (`<`, `>`, `=`); `make('cmp')` → 9 (internal tester handle).
Numbers are `1..99`.

### Interactive side — `mount({root,a,b,api})`
Renders two `.cp-num` numbers, a `.cp-slot` (starts with a `?`), and a `.cp-tray`
of three shuffled `.cp-tile` buttons (`data-op` ∈ `lt`/`gt`/`eq`). Op-tokens map to
a glyph via `G[]` (safe as `textContent`) and an HTML-escaped `ESC[]`
(`&lt;`/`&gt;` — a raw `<`/`>` in an HTML string would break parsing). The wanted
relation is `opOf(a,b)`.

**Genuine pointer-drag (mouse + touch).** `pointerdown` on a tile starts a drag
once the pointer moves past a 6px threshold: a floating `.cp-ghost`
(`position:fixed`, `pointer-events:none`) follows the pointer, and the slot lights
`.cp-hot` when the pointer is over it (a RECT hit-test, `overSlot`, ±16px).
Listeners live on `window` (not `setPointerCapture`) so a drag that leaves the tile
still tracks — and so automated `page.mouse` drags work. `pointerup` **on the slot**
places the sign and checks it; anywhere else cancels (a no-move tap shows a "drag
me" hint). A correct sign → green `.cp-ok` slot + `api.solved()`; a wrong sign →
red shake + `api.wrong()`, then the slot clears after ~1s for another try.
**Cleanup** clears timers, removes the window listeners and any stray ghost, and
empties `root`. CSS namespaced `cp-*` (`#cp-style`).

---

## 4h. `triple_sum.ex.js` in depth — three addends to a target (➕➕)

A self-mounting type (`t:TTS`, `modes:['trip','mx','sup','mulc']`) woven into
Queen, Superman AND אַלּוּפָה. `__ + __ + __ = N`: the child fills THREE addends of
her own choosing that sum to the target N. Any triple that reaches N is accepted —
**except that 0 and 10 may not be used** as an addend. No number line
(`aidsReveal:'always'`).

```js
return { t:TTS, modes:['trip','mx','sup','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
The TARGET **varies per card** — a number **6..14** (not always the same;
`TARGETS=[6..14]`, shuffled so a pool's targets are DISTINCT). Every target has a
no-0/no-10 triple; the "no 10" rule bites at 11..14 (e.g. 13 = 4+4+5, 14 = 4+5+5).
`make('mulc')` → **3**, `make('sup')` → 2, `make('mx')` → **1** (Queen
is a saturated pool — see below), `make('trip')` → 6 (tester handle). Each card
carries `{t:TTS, a:N}`; `a` is read as `num1` for the host report.

**Queen (mx) is saturated** (17 curated types already fill its coverage floor of
18, +2 woven extras = 20). So `makePool('mx')` caps the curated base to 18, then
weaves ONE polygon + ONE triple_sum POST-cap at mid-deck slots — so neither
crowds a core type out of the coverage cap, and slot 0 stays an `#ans` card.
Superman/אַלּוּפָה have room, so their TTS go straight into the shuffled+capped mix.

### Interactive side — `mount({root,a,b,api})`
Reads the target from `ctx.a` (falls back to `ctx.p.a` / 20). Renders three
`.tsm-inp` boxes joined by `+`, then `= <target>`, plus a ✓ `.tsm-btn`; Enter
walks box→box→check. `check()` has THREE outcomes:
1. **Wrong sum** → a real mistake: red boxes + directional hint + `api.wrong(sum)`,
   then clears for a retry.
2. **Correct sum but a 0 or 10 was used** → the special rule: the boxes with the
   0/10 pulse amber (`.tsm-nudge`), the prompt says "נָכוֹן! אֲבָל בְּלִי 0 וּבְלִי 10
   — נַסִּי מִסְפָּרִים אֲחֵרִים!", and the boxes clear for a retry — **no `api.wrong`
   (no penalty) and no `api.solved` (no advance)**. So it never costs points and the
   child must find other numbers.
3. **Correct sum, no 0/no 10** → green boxes + `api.solved()` (full try-first score).

**Cleanup** clears timers and empties `root`. CSS namespaced `tsm-*`
(`#tsm-style`).

---

## 4i. `half.ex.js` in depth — "חִלּוּק שָׁווֶה בְּשָׁווֶה" (share equally ✂️➗)

The gentlest first taste of DIVISION, framed as a mini word problem: `k` girls
(k = **2 OR 3**) have `n` items and must share them שָׁווֶה בְּשָׁווֶה; the child
types how many EACH gets (`n ÷ k`). Totals reach up to **16** (user request):
÷2 uses even totals 8..16, ÷3 uses the multiples of three 6..15 — every total
divides EXACTLY by its `k`. Self-mounting (`t:THF`, `modes:['hlf','mulc']`),
mixed into אַלּוּפָה.

```js
return { t:THF, modes:['hlf','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makePool(specs)` builds one problem per `{n,k}` spec: `{t:THF, n, k, a:n/k, item,
itemName, names:[…k names]}` — `a` carries the ANSWER so the host `_cor`/report
(which prints `n ÷ k = a`) stay correct. `make('mulc')` → a guaranteed **MIX** of
3 ÷2 + 3 ÷3; `make('hlf')` → 4 + 4 (tester handle). `ITEMS` rotates emoji + niqqud
plurals (🍎 תַּפּוּחִים …); `NAMES` supplies `k` distinct girl names + `KIDS` the
kid emojis, so every card reads like a fresh story.

### Interactive side — `mount({root,a,b,api})`
Reads the full problem via `ctx.p` (`n`, `k`, `per = n/k`). Renders the story line
("לְדָנָה, לְנֹעָה וּלְרוֹנִי יֵשׁ 9 תַּפּוּחִים 🍎 — אֵיךְ הֵן יִתְחַלְּקוּ שָׁווֶה
בְּשָׁווֶה?"), then the stage: a `.hf-kids` row of `k` girls ABOVE a `.hf-items`
row of `k` equal `.hf-grp` groups separated by `k-1` `.hf-line` dividers
(`scaleY(0)`, hidden). Pre-split the groups read as ONE continuous row (transparent
2px group borders + collapsed line margins add up to the regular in-row gap).

**The tap-to-split aid.** Clicking the stage toggles `hf-split` on the root: the
golden dividers drop (`scaleY(1)` + glow), the `k` groups highlight (dashed borders
+ soft background + padding) and the girls scale up — the child literally sees the
equal `k`-way share and can count one group. Pure aid, toggleable, no scoring
effect. A JS auto-fit (`fitRow`, reserving the split's extra width per `k`) shrinks
the emoji/kid/gap CSS vars so up to 16 items still fit the card on a phone.

**Answering** ("כַּמָּה תְּקַבֵּל כָּל אַחַת?" + `.hf-inp` + ✓): correct →
`forceSplit()` + the story line becomes the explanation ("כָּל אַחַת מְקַבֶּלֶת
3 — כִּי שְׁלִישׁ מִ־9 זֶה 3!"; the fraction word is חֵצִי for k=2, שְׁלִישׁ for
k=3) + `api.solved()`. Wrong → `api.wrong(v)` AND the split auto-opens (the "aid
appears on a mistake" convention) with a count-one-group hint, then clears for a
retry. Standard try-first scoring. No number line. **Cleanup** clears timers and
empties `root`. CSS namespaced `hf-*` (`#hf-style`).

---

## 4j. `plates.ex.js` in depth — "צַלָּחוֹת" (equal groups → total 🍽️✖️)

The multiplication story, and the deliberate INVERSE of `half` (§4i): instead of
splitting a total into equal groups, the child SEES the equal groups and finds the
TOTAL. Self-mounting (`t:TPL`, `modes:['plt','mulc']`), mixed into אַלּוּפָה.

```js
return { t:TPL, modes:['plt','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makePool(n)` deals distinct `(g,s)` pairs from the 2..4 × 2..4 grid but keeps
only **products ≤ 10** — the FIRST multiplication facts (6 pairs: 2×2, 2×3, 2×4,
3×2, 3×3, 4×2): `{t:TPL, g, s, a:g*s, item, itemName, name}` — `a` carries the
ANSWER so the host `_cor`/report stay correct. `make('mulc')` → **3**;
`make('plt')` → 6 (tester handle). `ITEMS` rotates plate-friendly emoji + niqqud
plurals (🍎 🍪 🍓 🍬 🥨); `NAMES` rotates a girl name, so every card reads like a
fresh little story.

### Interactive side — `mount({root,a,b,api})`
Reads the full problem via `ctx.p`. Renders the story ("לְדָנָה יֵשׁ 2 צַלָּחוֹת,
בְּכָל צַלַּחַת 3 תַּפּוּחִים 🍎 — כַּמָּה בְּסַךְ הַכֹּל?") and the answer row —
but the `#pl-stage` picture starts **HIDDEN** (`display:none`): the child solves
from the WORDS alone (try-first, the staged-column convention). Two views exist,
re-rendered on toggle (`plFade` pop-in):
- **plates view**: `g` CSS "dishes" (`.pl-plate`, soft ellipse with a radial
  sheen) each holding `s` `.pl-it` emoji — the equal groups.
- **poured view**: all `g·s` items in ONE straight countable row (`.pl-rowv`).

**Answering** ("כַּמָּה בְּסַךְ הַכֹּל?" + `.pl-inp` + ✓): correct → the story
becomes the explanation ("2 צַלָּחוֹת שֶׁל 3 — בְּסַךְ הַכֹּל 6!") + `api.solved()`.
Wrong → `api.wrong(v)` plus a staged reveal: the **1st mistake** reveals the
plates ("הִנֵּה הַצַּלָּחוֹת — סִפְרִי…"); the **2nd** pours them into the row
("סִפְרִי אֶת כֻּלָּם בַּשּׁוּרָה"). Once revealed, **tapping the stage** toggles
plates ↔ row (pure aid); `fitStage()` scales the picture down on overflow.
Standard try-first scoring (20 / 13 / 0). No number line. **Cleanup** removes the
resize listener, clears timers, empties `root`. CSS namespaced `pl-*`
(`#pl-style`).

---

## 4k. `ice_cream.ex.js` in depth — "חֲנוּת הַגְּלִידָה" (buy within a budget 🍦👛)

Division as **"how many groups fit"** (quotative) — the deliberate mirror of
`half`'s sharing (partitive): she HAS `₪a` and every ice cream costs the same
`₪b` (2/5/10, all real coins); how many CAN she buy? Story-wrapped `coin_mul`.
Self-mounting (`t:TIC`, `modes:['ice','mulc']`), mixed into אַלּוּפָה.

```js
return { t:TIC, modes:['ice','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`makePool()` → **3** problems, ONE of EACH price with a random budget from its
range — ₪2 (4..20), ₪5 (10..35), ₪10 (20..90) — every budget divisible by its
price, count `a/b` ∈ 2..10: `{t:TIC, a:budget, b:price, name}` (`name` rotates a
girl name; the scoop emoji 🍦/🍨 rotates per mount). Handles: `'mulc'` (game) and
`'ice'` (tester).

### Interactive side — `mount({root,a,b,p,api})`
Renders the story ("לְ­דָּנָה יֵשׁ **₪12** 👛 — כַּמָּה גְּלִידוֹת 🍦 הִיא תּוּכַל
לִקְנוֹת?"), a price line with the real inline coin (`tcCoinSVG(b)` from
`coins.ex.js`, loaded in `'mulc'`; silver fallback otherwise), a tray, − / ＋
buttons and the answer row (✓ + `.ic-inp`).

- **＋ buys** one ice cream — a `.ic-buy` stack (scoop over its price COIN)
  drops into the tray, so the spending is **skip-countable** (2, 4, 6…);
  **−** refunds. SPACE buys too (parity with `coin_mul`/`bagel_cost`).
- ＋ never disables AT the answer (that would reveal it) — the shop lets her
  order up to `need+3`; the tray starts invisible-but-reserved
  (`.ic-tray-blank`) so ＋ never shifts.
- **Answering**: the answer is the COUNT `a/b`. Wrong → `api.wrong(v)` +
  directional feedback off the TYPED value — too many: "אֵין לָהּ מַסְפִּיק
  כֶּסֶף", too few: "נִשְׁאַר לָהּ עוֹד כֶּסֶף". Correct → the hint becomes the
  explanation (`need × ₪b = ₪a`) + `api.solved()`.

Standard try-first scoring (20 / 13 / 0). No number line — the tray is the
manipulative. **Cleanup** removes the SPACE listener, clears timers, empties
`root`. CSS namespaced `ic-*` (`#ic-style`). Report row: `🍦 need × ₪b = ₪a`.

---

## 4l. `word_chain.ex.js` in depth — a CHAIN word problem (📖➕➖)

The `word_prob` idea extended to a THREE-term chain (user request). A nikud story
tells a start + two more steps, e.g. "לְיוֹסִי הָיוּ 2 תַּפּוּחִים, קִבֵּל עוֹד 2,
וְאָז נָתַן 4 לְחַיִּים" → `2 + 2 − 4`, computed LEFT-TO-RIGHT. Self-mounting
(`t:TWC`, `modes:['wc','mulc']`), mixed into אַלּוּפָה.

```js
return { t:TWC, modes:['wc','mulc'], aidsReveal:'always', make(mode){…}, mount };
```

### Data side — `make(mode)`
`TPL` is 6 story templates, each carrying its OWN `ops` pattern
(`['add'|'sub','add'|'sub']`) with verbs that MATCH the signs (+ = קִבֵּל/אָפְתָה,
− = נָתַן/אָכַל), the counted noun's gender `g`, and object emoji `e`. `makeOne(tpl)`
brute-forces `a∈2..10, b,c∈2..8` until `valid()` — **every step AND the final
result land in 0..12** (operands ≥ 2 so 0/1's agreement quirks never appear).
`makePool` rotates the templates (ops patterns vary) and de-dupes. `make('mulc')`
→ **3**, `make('wc')` → 8 (tester handle). The three numbers are spelled out via
`N(v,g,e)` (gender-agreeing, always before their noun → counting form; 2 → the
construct שְׁנֵי/שְׁתֵּי), each an underlined `.wc-num` with a tap/hover emoji
tooltip. Problem `{t:TWC,a,b,c,ops,story}`.

### Interactive side — `mount({root,a,b,p,api})`
Mirrors `word_prob`: **Phase 1** shows the story + a single answer box; the
`correct` is the `chain(a,b,c,ops)` result. A WRONG answer → `api.penalize(v)`
(−25%, host sad modal) AND `reveal()` drops the derived DIGIT chain
(`a op1 b op2 c =`) with a fresh answer box (**Phase 2**). Like the regular chain
exercises, the chain carries an INTERMEDIATE running-sum box after the first two
terms (`.wc-box`, `data-exp` = the running total `a op1 b`; green/red aid only,
never scored). Each further
mistake is another −25%; a correct value in either phase → `api.solvedFrac(FRAC[
mistakes])` (100 / 75 / 50 / 0). No number line. The host side: `core.js` stores
the ops in `wcOps` on load and computes `correct` via the `_wc(a,b,c,ops)` helper
(matches the module); report row `📖 a op1 b op2 c = correct`. Wired exactly where
`word_prob`/TWP is (the colx-guard lists, `_cor`, hint, report). CSS namespaced
`wc-*` (`#wc-style`). Tests: `TestWordChain` (6).

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
  `{[TCA]:'column_add', [TCS]:'column_sub', [TCM]:'coin_mul', [TBC]:'bagel_cost',
  [TPG]:'polygon', [TMC]:'mult_chain', [TMK]:'mult_champ', [TPP]:'perimeter',
  [TCP]:'compare', [TWP]:'word_prob', [TTS]:'triple_sum', [THF]:'half',
  [TPL]:'plates', [TWC]:'word_chain', [TSQ]:'story_quiz'}` (+ `[TIC]:'ice_cream'`,
  `[TMU]:'mult_unknown'`).
  - `'mulc'` (אַלּוּפָה, the `hard`/קָשֶׁה tier) is a **MIXED pool**, capped at 20:
    `mult_champ.make('mulc')` (multiplication ≤16, product first) +
    `perimeter.make('mulc')` (§4f) + `column_sub.make('mulc')` (the staged
    subtraction, §4b) + `compare.make('mulc')` (§4g) + `word_prob.make('mulc')` +
    `word_chain.make('mulc')` (§4l — the CHAIN story) + `triple_sum.make('mulc')`
    (§4h) + `half.make('mulc')` (§4i) + `plates.make('mulc')` (§4j) + …, shuffled
    then coverage-capped (`_capPool` keeps ≥1 of each of the 14 mulc types); a
    guard keeps a `mult_champ` (TMK) card at slot 0.
- **`api`** — the host object handed to `mount()`. Base: `wrong(v)` (log a mistake
  + sad modal + try-first unlock), `solved()` (award `_tfPts()` + celebrate),
  `nl(anchor)` (park the number-line rider). The **staged** column-subtraction adds
  three graded hooks: `penalize(v)` (log a mistake WITHOUT the try-first
  unlock/score), `showNL()` (reveal the number line on demand), and
  `solvedFrac(frac)` (award `round(modePts()*frac)` — the 100/75/50/0 ladder).
  `_colxMount` also passes the FULL problem as `p` so a module can read fields
  beyond `a`/`b` (perimeter's `sides`, the subtraction's `staged` flag).
- **`aidsReveal`** is read generically by `core.js` `_lockAids` for whichever
  ptype is on screen, so one field in a type file changes when its aids appear.
  It may be PER-MODE (an object keyed by mode) — e.g. `column_sub` is
  `{mx:'always',sup:'always',mulc:'always'}`.
- **Gift goals.** `DEFAULT_GIFT_GOALS` (`core.js`) = `{sup:800, mulc:600}`
  — only Superman + אַלּוּפָה carry a prize; every other game (incl. `b20`/`mx`/`br`
  and the basic `0/5/10/20/big`) has no prize threshold by default.

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
