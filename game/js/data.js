/* ── roundRect polyfill ── */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    this.beginPath();this.moveTo(x+r,y);this.lineTo(x+w-r,y);
    this.quadraticCurveTo(x+w,y,x+w,y+r);this.lineTo(x+w,y+h-r);
    this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);this.lineTo(x+r,y+h);
    this.quadraticCurveTo(x,y+h,x,y+r);this.lineTo(x,y+r);
    this.quadraticCurveTo(x,y,x+r,y);this.closePath();
  };
}

/* ── Data ── */
const TM='missing',TS='sub',TA='add',TX='mixed',TZ='triple',TW='twin_sub',TDA='dbl_add',TDS='dbl_sub',TC='coins',TT='tens',TCA='col_add',TCS='col_sub',TBG='big_step',TCM='coin_mul',TBC='bagel_cost',TVA='var_add',TVS='var_sub',TRA='tri_add',TH='hundreds',TPG='polygon',TMC='mult_chain',TMK='mult_champ',TPP='perimeter',TCP='compare',TWP='word_prob',TTS='triple_sum',THF='half',TPL='plates',TIC='ice_cream',TMU='mult_unknown',TWC='word_chain',TSQ='story_quiz',TCZ='cloze',TTF='true_false',TWM='word_match',TSO='sent_order',TRH='rhyme',TLG='logic',TBE='bal_eq',TSB='bal_scale',TDL='deal',TPK='pack',TFR='fair',TCN='can_share';
const gameLen=()=>problems.length;

/* ── Exercise-type modules — ONE FILE PER TYPE (exercises/<file>.ex.js) ─────
   Every exercise type lives in its own file and registers itself into
   window.EXERCISES.types. When a game mode starts, bg-loader.loadExercisesFor
   injects exactly the files whose `modes` list includes that mode, and the
   pool recipes (problems.js) build the session from the registered types.
   (architecture.md §3.6) */
const EXERCISE_INDEX=[
  {file:'add',       modes:[0,5,10,20,'br','b20','mx']},
  {file:'sub',       modes:[5,10,20,'br','b20','mx']},
  {file:'missing',   modes:[5,10,20,'mx']},
  {file:'double',    modes:[5,10,20,'mx']},
  {file:'coins',     modes:[5,10,20,'mx','sup','mulc']},   // mulc = אַלּוּפָה: loaded so tcCoinSVG (the real coin art) is available to coin_mul + bagel_cost
  {file:'chain',     modes:['mx']},
  {file:'tens',      modes:['mx']},
  {file:'column_add',modes:['sup','mulc']},   // mulc = אַלּוּפָה: horizontal-first GRADED flow (staged 25% penalties, number line on 2nd mistake) — mirrors column_sub
  {file:'column_sub',modes:['mx','sup','mulc']},   // mulc = אַלּוּפָה: horizontal-first GRADED flow (staged 25% penalties, number line on 2nd mistake)
  {file:'coin_mul',  modes:['sup','mulc']},   // mulc = אַלּוּפָה: first multiplication (how many ₪2/₪5/₪10 coins fit in X)
  {file:'bagel_cost',modes:['sup','mulc']},   // mulc = אַלּוּפָה: first multiplication in shekels (X bagels × ₪5)
  {file:'big_step',  modes:['big','mx','sup']},
  {file:'var_one',   modes:['br','b20','mx']},   // shape-variable add/sub with one unknown (⃝ = N, then a ± ⃝ = ?)
  {file:'tri_unknown',modes:['mx']},             // three unknowns adding to a target (__+__+__ = R, R ≤ 20)
  {file:'hundreds',  modes:['mx','sup']},        // whole-hundreds addition (200+60, 300+300 …), result ≤ 900
  {file:'polygon',   modes:['poly','mx','sup']}, // count polygon SIDES; woven into Queen (mx) + Superman (sup) ~1 per 9. 'poly' is an INTERNAL handle only (tester / direct setMode) — no picker tile.
  {file:'mult_chain',modes:['mul','mx','sup']},  // multiplication as repeated addition (2×3 → 2+2+2 chain, ≤20). 'mul' is an INTERNAL handle only (no picker tile); mixed into Queen (mx) + Superman (sup).
  {file:'mult_champ',modes:['mulc']},            // אַלּוּפָה game (the "קָשֶׁה" tier) — multiplication PRODUCT first (factors ≤ 4), repeated-addition chain (+ 🔁 switch) revealed only AFTER a mistake.
  {file:'perimeter', modes:['perim','mulc']},    // polygon PERIMETER (sum of side lengths <5) — mixed into אַלּוּפָה. 'perim' is an INTERNAL handle only (tester / direct setMode).
  {file:'compare',   modes:['cmp','mulc']},      // DRAG the ‹ › = sign between two numbers — mixed into אַלּוּפָה. 'cmp' is an INTERNAL handle only (tester / direct setMode).
  {file:'word_prob', modes:['wp','mulc']},       // בְּעָיוֹת מִלּוּלִיּוֹת עַד 10 (nikud short stories) — mixed into אַלּוּפָה. On a mistake: −25% + the derived equation (5−3) revealed + a retry. 'wp' is an INTERNAL handle only (tester / direct setMode).
  {file:'word_chain',modes:['wc','mulc']},       // בְּעָיוֹת שַׁרְשֶׁרֶת (nikud) — a CHAIN story (קיבל 2, קיבל עוד 2, נתן 4 → 2+2−4), results 0..12; on a mistake the derived DIGIT chain is revealed. Mixed into אַלּוּפָה. 'wc' is an INTERNAL handle only.
  {file:'story_quiz',modes:['story','lang','sup','mulc']},  // סִפּוּר וְשְׁאֵלָה — a short nikud READING story (חלל/חדי קרן/דינוזאורים/נסיכות, ≤4 lines) + a multiple-choice vowelled question; pick → ✓ submits. Woven ONE-PER-4 into Superman + אַלּוּפָה, and part of the "שפה" language game (mode 'lang'). 'story' is an INTERNAL handle only.
  {file:'cloze',     modes:['clz','lang','sup','mulc']},    // הַשְׁלֵם אֶת הַמִּלָּה — a vowelled sentence with a gap + 3 word options; pick → ✓ submits (the word drops into the gap). Reading slots + "שפה". 'clz' is an INTERNAL handle only.
  {file:'true_false',modes:['tf','lang','sup','mulc']},     // נָכוֹן אוֹ לֹא — a 2-line nikud story + a statement; pick נכון/לא נכון → ✓ submits. Reading slots + "שפה". 'tf' is an INTERNAL handle only.
  {file:'word_match',modes:['wm','lang','sup','mulc']},     // הַתְאֵם מִלָּה לִתְמוּנָה — DRAG (or tap-tap) 3 vowelled words onto 3 pictures. Reading slots + "שפה". 'wm' is an INTERNAL handle only.
  {file:'sent_order',modes:['so','lang','sup','mulc']},     // סַדֵּר אֶת הַמִּשְׁפָּט — scrambled word pills tapped into order, ✓ submits. Reading slots + "שפה". 'so' is an INTERNAL handle only.
  {file:'logic',     modes:['logic','sup','mulc']},     // הִגָּיוֹן 🧠 (also 2 cards per Superman / אַלּוּפָה game, 6th + 14th question) — logic questions (מִי אֲנִי / מִי לֹא שַׁיָּךְ / ordering / patterns / אִם-אָז / analogies / cause→effect), multiple choice + ✓; a wrong pick is CROSSED OUT and (who) its ruling-out clue lights up. Its own game ('logic', medium tier).
  {file:'rhyme',     modes:['rhy','lang','sup','mulc']},    // אֵיזוֹ מִלָּה מִתְחָרֶזֶת — a picture+word CUE and 3 picture+word options, exactly one rhymes; select → ✓ submits, a mistake reveals the rhyme ending. PHONOLOGICAL awareness (not reading-for-meaning). Reading slots + "שפה". 'rhy' is an INTERNAL handle only.
  {file:'triple_sum',modes:['trip','mx','sup','mulc']},  // __+__+__ = N (target VARIES 6..12) — three CHOSEN addends; 0 and 10 are disallowed (a 0/10 answer is praised with NO penalty but must be re-tried with other numbers). Woven into Queen/Superman/אַלּוּפָה. 'trip' is an INTERNAL handle only.
  {file:'half',      modes:['hlf','mx','mulc']},      // "כַּמָּה זֶה חֵצִי" — share 4/6/8/10 items EQUALLY between two friends; the split (golden lines) opens only after a MISTAKE — before that the picture is locked (try-first). First DIVISION intuition, mixed into אַלּוּפָה. 'hlf' is an INTERNAL handle only.
  {file:'plates',    modes:['plt','mulc']},      // "צַלָּחוֹת" — g plates × s items each (2..4×2..4), find the TOTAL; tap → the items POUR into one countable row. Multiplication-story inverse of half, mixed into אַלּוּפָה. 'plt' is an INTERNAL handle only.
  {file:'ice_cream', modes:['ice','mx','mulc']},      // "חֲנוּת הַגְּלִידָה" — she HAS ₪budget, each ice cream costs ₪2/₪5/₪10; BUY (＋) within the budget and type how many fit (budget÷price — division as "how many groups"). Mixed into אַלּוּפָה. 'ice' is an INTERNAL handle only.
  {file:'balance',   modes:['bal','mx','mulc']},  // מֹאזְנַיִם ⚖️ — equality as BALANCE: TBE __+15=12+__ (two rows, two DIFFERENT pairs) + TSB four numbers onto two pans (a+d=b+c). Queen: 1 card/game (kinds alternate), אַלּוּפָה: one of each. 'bal' = tester handle
  {file:'deal',      modes:['deal','mx','mulc']},   // חֲלֻקָּה בְּתוֹרוֹת — tap the pile, each item goes to the next friend in turn (2-4 friends, ≤16); then how many EACH got. Counts only after a mistake
  {file:'pack',      modes:['pack','mx','mulc']},   // אֲרִיזָה — n items, b per box: how many boxes? Loose items + one sample box; the packing (tap → a box fills) opens after a mistake
  {file:'fair',      modes:['fair','mx','mulc']},   // זֶה הוֹגֵן? — uneven plates; move items until all are equal, ✓, then how many each. Count badges after a mistake
  {file:'can_share', modes:['cansh','mx','mulc']},  // אֶפְשָׁר לְחַלֵּק? — yes/no: can k friends share n with nothing left? The verdict shows the groups + the leftover
  {file:'mult_unknown',modes:['mulu','mulc']},   // כֶּפֶל בְּנֶעְלָם — 3 × □ = 9, find the hidden factor; the SKIP-COUNTING number line (jumps of a) is shown from the START. Mixed into אַלּוּפָה. 'mulu' is an INTERNAL handle only.
];
/* exercise types that bring their own interactive UI (mount/cleanup) */
const EXERCISE_OF_TYPE={[TDL]:'deal',[TPK]:'pack',[TFR]:'fair',[TCN]:'can_share',[TBE]:'balance',[TSB]:'balance',[TCA]:'column_add',[TCS]:'column_sub',[TCM]:'coin_mul',[TBC]:'bagel_cost',[TPG]:'polygon',[TMC]:'mult_chain',[TMK]:'mult_champ',[TPP]:'perimeter',[TCP]:'compare',[TWP]:'word_prob',[TTS]:'triple_sum',[THF]:'half',[TPL]:'plates',[TIC]:'ice_cream',[TMU]:'mult_unknown',[TWC]:'word_chain',[TSQ]:'story_quiz',[TCZ]:'cloze',[TTF]:'true_false',[TWM]:'word_match',[TSO]:'sent_order',[TRH]:'rhyme',[TLG]:'logic'};

/* ── Difficulty configuration ───────────────────────────────────────────────
   The mode picker in the settings modal is RENDERED from this config
   (core.js → renderModePicker). Moving / adding / renaming games never
   touches logic. */
const DIFFICULTY_GROUPS=[
  {id:'easy',label:'קַל',modes:[
    {id:0,   label:'1+1 🌱'},
    {id:5,   label:'עַד 5'},
    {id:10,  label:'עַד 10'},
    {id:20,  label:'עַד 20'},
  ]},
  {id:'medium',label:'בֵּינוֹנִי',modes:[
    {id:'br',label:'גָּשֵׁר 10 🌈'},
    {id:'b20',label:'גָּשֵׁר 20 🌉'},
    {id:'mx',label:'מַלְכָּה 👸'},
    {id:'sup',label:'סוּפֶּרְמֶן 🦸'},
    {id:'lang',label:'שָׂפָה 📖'},
    {id:'logic',label:'הִגָּיוֹן 🧠'},
  ]},
  {id:'hard',label:'קָשֶׁה',modes:[
    {id:'mulc',label:'אַלּוּפָה 🏆'},
  ]},
];
/* NOTE: the 🎁 prize badge is NOT part of the label — it is appended at render
   time (renderModePicker) only for games that currently have a prize set, and
   the level is editable per game in settings (GIFT_GOALS / setGiftGoal). */
/* NOTE: the standalone "עַד 100 💯" game (mode 'big', TBG big-number ±1/2) was
   removed from the picker; those exercises now live INSIDE Queen (mx) and
   Superman (sup) — see big_step.ex.js make('mx'/'sup') and problems.js. The
   'big' mode logic is kept as an internal handle (tests + the shared TBG type). */

/* ── Success-screen files (success_screens/<name>.js) ───────────────────────
   Listed files are injected dynamically at boot by bg-loader.js and register
   themselves into window.SUCCESS.styles — the per-answer celebration ROTATION
   (see success_screens_spec.md). */
const SUCCESS_FILES=[
  'success-bubble-pop',
  'success-magic-wand',
  'success-rocket-launch',
  'success-princess-crown',
  'success-butterfly-swarm',
  'success-snow-sparkle',
  'success-dolphin-splash',
  'success-fireworks-show',
  'success-confetti-cannon',
  'success-shooting-stars',
  'success-balloon-float',
  'success-trophy-shine',
  'success-paint-splash',
  'success-music-notes',
  'success-pinwheel-spin',
  'success-firefly-dance',
  'success-ribbon-streamers',
  'success-phoenix-rising',
  'success-peacock-fan',
  'success-kaleidoscope-bloom',
  'success-birthday-cake',
  'success-carousel-spin',
  'success-sky-lanterns',
  'success-treasure-chest',
  'success-prism-rainbow',
  'success-enchanted-tree',
  'success-sandcastle',
  'success-ice-cream-tower',
  'success-jellyfish-glow',
  'success-hot-air-balloon',
  'success-kite-festival',
  'success-turtle-lagoon',
  'success-ferris-wheel',
  'success-moon-swing',
  'success-star-train',
  'success-paper-cranes',
  'success-snow-globe',
  'success-crystal-gem',
  'success-love-letter',
  'success-daisy-ring',
  'success-ringed-planet',
  'success-baby-dragon',
  'success-pearl-shell',
  'success-domino-cascade',
  'success-owl-wink',
  'success-magic-lamp',
  'success-ladybug-flight',
  'success-heart-lock',
  'success-sunflower-grow',
  'success-kitten-yarn',
  'success-star-jar',
  'success-honeycomb-bee',
  'success-ufo-beam',
  'success-penguin-slide',
  'success-rain-cloud',
  'success-whale-spout',
  'success-lighthouse-beam',
  'success-cherry-blossom',
  'success-hedgehog-roll',
  'success-fox-wish',
  'success-snail-trail',
  'success-gingerbread-house',
  'success-koala-hug',
  'success-bubble-tea',
  'success-sticker-book',
];

/* ── Special reward screens (success_screens/<sub>/<name>.js) ────────────────
   NOT part of the per-answer rotation. They register into window.SUCCESS.special
   and the host plays them on a specific milestone — e.g. the gift screen runs
   only at end-of-set when the grade clears the gift threshold (GIFT_GOALS,
   core.js → endGame → showGiftScreen). Each lives in its own subfolder. */
const SUCCESS_SPECIAL=[
  'gift/success-gift-surprise',
];
